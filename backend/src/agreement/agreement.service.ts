import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { NegotiationSession } from '../entities/negotiation-session.entity.js';
import { NegotiationRound } from '../entities/negotiation-round.entity.js';
import { NegotiationState, NegotiationDecision } from '../common/enums/index.js';

interface ApprovalState {
  seekerApproved: boolean;
  employerApproved: boolean;
}

@Injectable()
export class AgreementService {
  private readonly agreementContractId = process.env.AGREEMENT_CONTRACT_ID || 'agreement.testnet';
  private readonly nearNodeUrl = process.env.NEAR_NODE_URL || 'https://rpc.testnet.near.org';
  // NOTE: In-memory — 서버 재시작 시 소실
  private approvals = new Map<string, ApprovalState>();

  constructor(
    @InjectRepository(NegotiationSession)
    private readonly sessionRepo: Repository<NegotiationSession>,
    @InjectRepository(NegotiationRound)
    private readonly roundRepo: Repository<NegotiationRound>,
  ) {}

  async approve(sessionId: string, nearAccountId: string): Promise<{ status: string; txParams?: any }> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['seeker', 'employer', 'job'],
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.state !== NegotiationState.AGREED) {
      throw new ConflictException('Session is not in AGREED state');
    }

    // Determine role by comparing nearAccountId against loaded relations
    const isSeeker = session.seeker?.nearAccountId === nearAccountId;
    const isEmployer = session.employer?.nearAccountId === nearAccountId;
    if (!isSeeker && !isEmployer) throw new ForbiddenException('Not a participant');

    // Track approval
    let state = this.approvals.get(sessionId);
    if (!state) {
      state = { seekerApproved: false, employerApproved: false };
      this.approvals.set(sessionId, state);
    }
    if (isSeeker) state.seekerApproved = true;
    if (isEmployer) state.employerApproved = true;

    if (!state.seekerApproved || !state.employerApproved) {
      return { status: 'waiting_for_other_party' };
    }

    // Both approved — generate agreement hash and tx params
    const lastRound = await this.roundRepo.findOne({
      where: { sessionId, decision: NegotiationDecision.ACCEPT },
      order: { round: 'DESC' },
    });

    const agreementHash = this.computeAgreementHash(session, lastRound);
    session.agreementHash = agreementHash;
    await this.sessionRepo.save(session);

    this.approvals.delete(sessionId);

    const txParams = this.getRecordAgreementTxParams(session, agreementHash);
    return { status: 'both_approved', txParams };
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

  private getRecordAgreementTxParams(session: NegotiationSession, agreementHash: string) {
    return {
      contractId: this.agreementContractId,
      methodName: 'record_agreement',
      args: {
        session_id: session.id,
        agreement_hash: agreementHash,
        summary: {
          position_title: session.job?.title || 'Unknown',
          agreed_salary: 0, // Will be filled from decrypted final offer
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
