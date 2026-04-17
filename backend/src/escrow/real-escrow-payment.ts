import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHash } from 'crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import type { EscrowPayment } from '../common/interfaces/escrow-payment.interface.js';

// near-api-js v7 is ESM-only; we dynamic-import it at init time.
let Account: any;
let JsonRpcProvider: any;
let KeyPairSigner: any;

@Injectable()
export class RealEscrowPayment implements EscrowPayment, OnModuleInit {
  private readonly logger = new Logger(RealEscrowPayment.name);
  private agentSigner: any;
  private agentPublicKey: string;
  private provider: any;
  private readonly escrowContractId =
    process.env.ESCROW_CONTRACT_ID || 'escrow.testnet';
  private readonly nearNodeUrl =
    process.env.NEAR_NODE_URL || 'https://rpc.testnet.near.org';

  async onModuleInit() {
    // Dynamic import for ESM-only near-api-js
    const nearApi = await import('near-api-js');
    Account = nearApi.Account;
    JsonRpcProvider = nearApi.JsonRpcProvider;
    KeyPairSigner = nearApi.KeyPairSigner;

    this.provider = new JsonRpcProvider({ url: this.nearNodeUrl });

    const seedHex = process.env.SERVER_KEYPAIR_SEED;
    if (!seedHex) {
      this.logger.warn(
        'No SERVER_KEYPAIR_SEED — agent keypair is ephemeral. ' +
          'Employers will need to re-register the agent key after restart.',
      );
    }

    const raw = seedHex
      ? createHash('sha256').update(seedHex).digest().subarray(0, 32)
      : nacl.randomBytes(32);
    const kp = nacl.sign.keyPair.fromSeed(raw);

    const secretB58 = bs58.encode(kp.secretKey);
    this.agentSigner = KeyPairSigner.fromSecretKey(`ed25519:${secretB58}`);
    this.agentPublicKey = `ed25519:${bs58.encode(kp.publicKey)}`;

    this.logger.log(`Agent public key: ${this.agentPublicKey}`);
  }

  getAgentPublicKey(): string {
    return this.agentPublicKey;
  }

  async checkBalance(employerAccountId: string): Promise<string> {
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
          account_id: this.escrowContractId,
          method_name: 'get_balance',
          args_base64: Buffer.from(
            JSON.stringify({ employer_id: employerAccountId }),
          ).toString('base64'),
        },
      }),
    });

    const data = (await response.json()) as any;
    if (data.error || !data.result?.result) return '0';

    try {
      return Buffer.from(data.result.result)
        .toString('utf-8')
        .trim()
        .replace(/^"|"$/g, '');
    } catch {
      return '0';
    }
  }

  async payForProfile(
    employerAccountId: string,
    seekerAccountId: string,
  ): Promise<{ txHash: string }> {
    // The agent signs a tx as the employer (via FunctionCall access key).
    // The contract determines the cost internally (profile_view_cost).
    const account = new Account(
      employerAccountId,
      this.provider,
      this.agentSigner,
    );

    await account.callFunction({
      contractId: this.escrowContractId,
      methodName: 'pay_for_profile',
      args: {
        employer_id: employerAccountId,
        seeker_id: seekerAccountId,
      },
      gas: BigInt('30000000000000'),
      deposit: BigInt(0),
    });

    const txHash = `pay-${employerAccountId}-${seekerAccountId}-${Date.now()}`;
    this.logger.log(
      `Profile payment: ${employerAccountId} → ${seekerAccountId} (${txHash})`,
    );
    return { txHash };
  }
}
