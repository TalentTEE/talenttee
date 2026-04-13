import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { NegotiationSession } from '../entities/negotiation-session.entity.js';
import { NegotiationRound } from '../entities/negotiation-round.entity.js';
import { NegotiationState, NegotiationDecision } from '../common/enums/index.js';
import { CryptoService } from '../crypto/crypto.service.js';

@Injectable()
export class AgreementService {
  private readonly logger = new Logger(AgreementService.name);
  private readonly agreementContractId = process.env.AGREEMENT_CONTRACT_ID || 'agreement.testnet';
  private readonly nearNodeUrl = process.env.NEAR_NODE_URL || 'https://rpc.testnet.near.org';

  constructor(
    @InjectRepository(NegotiationSession)
    private readonly sessionRepo: Repository<NegotiationSession>,
    @InjectRepository(NegotiationRound)
    private readonly roundRepo: Repository<NegotiationRound>,
    private readonly cryptoService: CryptoService,
  ) {}

  private parsePublicKey(key: string): Uint8Array {
    if (key.startsWith('ed25519:')) {
      return Buffer.from(key.slice(8), 'base64');
    }
    return Buffer.from(key, 'base64');
  }

  async approve(sessionId: string, nearAccountId: string): Promise<{ status: string; txParams?: any }> {
    return this.sessionRepo.manager.transaction(async (manager) => {
      const session = await manager.findOne(NegotiationSession, {
        where: { id: sessionId },
        relations: ['seeker', 'employer', 'job'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!session) throw new NotFoundException('Session not found');
      if (session.state !== NegotiationState.AGREED) {
        throw new ConflictException('Session is not in AGREED state');
      }

      const isSeeker = session.seeker?.nearAccountId === nearAccountId;
      const isEmployer = session.employer?.nearAccountId === nearAccountId;
      if (!isSeeker && !isEmployer) throw new ForbiddenException('Not a participant');

      if (isSeeker) session.seekerApproved = true;
      if (isEmployer) session.employerApproved = true;
      await manager.save(session);

      if (!session.seekerApproved || !session.employerApproved) {
        return { status: 'waiting_for_other_party' };
      }

      // Both approved — generate agreement hash and tx params
      const lastRound = await manager.findOne(NegotiationRound, {
        where: { sessionId, decision: NegotiationDecision.ACCEPT },
        order: { round: 'DESC' },
      });

      // Decrypt salary from the last negotiation round
      let agreedSalary = 0;
      try {
        if (lastRound?.encryptedData && session.seeker?.publicKey && session.sessionKeyNonce) {
          const seekerPubKey = this.parsePublicKey(session.seeker.publicKey);
          const sessionKey = this.cryptoService.deriveServerSessionKey(seekerPubKey, session.sessionKeyNonce);
          const decrypted = this.cryptoService.decrypt(sessionKey, lastRound.encryptedData);
          const parsed = JSON.parse(decrypted);
          agreedSalary = parsed?.proposal?.salary ?? parsed?.proposal?.baseSalary ?? 0;
        }
      } catch (err) {
        this.logger.warn(`Failed to decrypt salary for session ${sessionId}: ${err.message}`);
        agreedSalary = 0;
      }

      const agreementHash = this.computeAgreementHash(session, lastRound);
      session.agreementHash = agreementHash;
      await manager.save(session);

      const txParams = this.getRecordAgreementTxParams(session, agreementHash, agreedSalary);
      return { status: 'both_approved', txParams };
    });
  }

  private computeAgreementHash(session: NegotiationSession, lastRound: NegotiationRound | null): string {
    const data = {
      employerId: session.employerId,
      finalRound: lastRound?.round || 0,
      jobId: session.jobId,
      seekerId: session.seekerId,
      sessionId: session.id,
    };
    // Keys sorted alphabetically for deterministic canonical JSON
    const canonical = JSON.stringify(data);
    return createHash('sha256').update(canonical).digest('hex');
  }

  private getRecordAgreementTxParams(session: NegotiationSession, agreementHash: string, agreedSalary: number) {
    return {
      contractId: this.agreementContractId,
      methodName: 'record_agreement',
      args: {
        session_id: session.id,
        agreement_hash: agreementHash,
        summary: {
          position_title: session.job?.title || 'Unknown',
          agreed_salary: agreedSalary,
          start_date: new Date().toISOString().split('T')[0],
          negotiation_rounds: session.currentRound,
        },
        seeker_account: session.seeker?.nearAccountId || '',
        employer_account: session.employer?.nearAccountId || '',
        seeker_signature: [],  // 해커톤: cosmetic
        employer_signature: [], // 해커톤: cosmetic
      },
      deposit: '0',
      gas: '30000000000000',
    };
  }

  async confirmTx(sessionId: string, txHash: string): Promise<void> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (!session.agreementHash) throw new ConflictException('Agreement not yet approved');
    session.onChainTxHash = txHash;
    await this.sessionRepo.save(session);
  }

  async getAgreement(sessionId: string): Promise<any> {
    const response = await fetch(this.nearNodeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'dontcare',
        method: 'query',
        params: {
          request_type: 'call_function',
          finality: 'final',
          account_id: this.agreementContractId,
          method_name: 'get_agreement',
          args_base64: Buffer.from(JSON.stringify({ session_id: sessionId })).toString('base64'),
        },
      }),
    });
    const data = await response.json();
    if (data.error || !data.result?.result) return null;
    try {
      return JSON.parse(Buffer.from(data.result.result).toString('utf-8'));
    } catch {
      return null;
    }
  }

  async verifyAgreement(sessionId: string): Promise<boolean> {
    const response = await fetch(this.nearNodeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'dontcare',
        method: 'query',
        params: {
          request_type: 'call_function',
          finality: 'final',
          account_id: this.agreementContractId,
          method_name: 'verify_agreement',
          args_base64: Buffer.from(JSON.stringify({ session_id: sessionId })).toString('base64'),
        },
      }),
    });
    const data = await response.json();
    if (data.error || !data.result?.result) return false;
    try {
      return JSON.parse(Buffer.from(data.result.result).toString('utf-8'));
    } catch {
      return false;
    }
  }
}
