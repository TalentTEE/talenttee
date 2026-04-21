import {
  Injectable, Logger, OnModuleInit, BadRequestException, HttpException, HttpStatus,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// near-api-js v7 is ESM-only; dynamic-import in onModuleInit().
let Account: any;
let JsonRpcProvider: any;
let KeyPairSigner: any;
let PublicKey: any;
let KeyType: any;
let Signature: any;
let encodeDelegateAction: any;
let actionCreators: any;

/** JSON-serialisable action descriptors sent from the frontend. */
export type ActionDescriptor =
  | {
      type: 'FunctionCall';
      methodName: string;
      args: Record<string, unknown>;
      gas: string;
      deposit: string;
    }
  | {
      type: 'Transfer';
      amount: string;
    }
  | {
      type: 'AddKey';
      publicKey: string;
      permission:
        | 'FullAccess'
        | { receiverId: string; methodNames: string[]; allowance: string };
    };

interface CachedDelegate {
  delegateAction: any;
  userAccountId: string;
  createdAt: number;
}

// Security: only these contracts may be called via relay.
const ALLOWED_CONTRACTS = new Set([
  process.env.ESCROW_CONTRACT_ID || 'escrow.testnet',
]);

@Injectable()
export class RelayService implements OnModuleInit {
  private readonly logger = new Logger(RelayService.name);
  private relayerAccount: any;
  private relayerAccountId: string;
  private provider: any;

  /** requestId → CachedDelegate. Entries expire after 5 min. */
  private readonly cache = new Map<string, CachedDelegate>();

  /** Rate-limit: accountId → list of timestamps (ms). */
  private readonly rateLimits = new Map<string, number[]>();
  private static readonly RATE_WINDOW_MS = 5 * 60 * 1000;
  private static readonly RATE_MAX = 10;

  private readonly nearNodeUrl =
    process.env.NEAR_NODE_URL || 'https://rpc.testnet.near.org';
  private readonly escrowContractId =
    process.env.ESCROW_CONTRACT_ID || 'escrow.testnet';

  async onModuleInit() {
    const nearApi = await import('near-api-js');
    Account = nearApi.Account;
    JsonRpcProvider = nearApi.JsonRpcProvider;
    KeyPairSigner = nearApi.KeyPairSigner;
    PublicKey = nearApi.PublicKey;
    KeyType = nearApi.KeyType;
    Signature = nearApi.Signature;
    encodeDelegateAction = nearApi.encodeDelegateAction;
    actionCreators = nearApi.actions;

    // SignedDelegate class is type-only export — not directly importable.
    // We don't need the constructor; see buildSignedDelegate() helper below.

    this.provider = new JsonRpcProvider({ url: this.nearNodeUrl });

    // Derive relayer keypair from the same seed as agent key.
    const seedHex = process.env.SERVER_KEYPAIR_SEED;
    if (!seedHex) {
      this.logger.warn('No SERVER_KEYPAIR_SEED — relay keypair is ephemeral');
    }

    const raw = seedHex
      ? createHash('sha256').update(seedHex).digest().subarray(0, 32)
      : nacl.randomBytes(32);
    const kp = nacl.sign.keyPair.fromSeed(raw);

    const secretB58 = bs58.encode(kp.secretKey);
    const signer = KeyPairSigner.fromSecretKey(`ed25519:${secretB58}`);

    // Implicit account ID = hex-encoded public key (32 bytes → 64 hex chars).
    this.relayerAccountId = Buffer.from(kp.publicKey).toString('hex');
    this.relayerAccount = new Account(this.relayerAccountId, this.provider, signer);

    // Log balance for operator visibility.
    try {
      const state = await this.relayerAccount.getState();
      const availNear =
        Number(state.balance.available) / 1e24;
      this.logger.log(
        `Relayer account: ${this.relayerAccountId} — balance: ${availNear.toFixed(4)} NEAR`,
      );
    } catch (e: any) {
      this.logger.warn(
        `Relayer account ${this.relayerAccountId} not found on-chain. ` +
          `Fund it with: near send <from> ${this.relayerAccountId} 5 --networkId testnet`,
      );
    }

    // Periodically purge expired cache entries.
    setInterval(() => this.purgeExpired(), 60_000);
  }

  /** Fund an implicit account so it exists on-chain (needed before meta-tx). */
  async fundImplicitAccount(accountId: string): Promise<void> {
    // 0.01 NEAR covers storage + several meta-tx gas fees.
    const amount = BigInt('10000000000000000000000'); // 0.01 NEAR in yoctoNEAR
    await this.relayerAccount.transfer({
      receiverId: accountId,
      amount,
    });
    this.logger.log(`Funded implicit account ${accountId} with 0.01 NEAR`);
  }

  /**
   * Build a DelegateAction for the user to sign. Returns the requestId and
   * base64-encoded bytes the frontend must SHA-256 + ed25519-sign.
   */
  async prepareDelegate(
    userAccountId: string,
    userPublicKey: string,
    receiverId: string,
    descriptors: ActionDescriptor[],
  ): Promise<{ requestId: string; encodedDelegateAction: string }> {
    this.enforceRateLimit(userAccountId);
    this.validateActions(receiverId, descriptors, userAccountId);

    const nearActions = this.descriptorsToActions(descriptors);
    const pubKey = PublicKey.fromString(userPublicKey);

    // Account without signer — only used to query nonce + block height.
    const userAccount = new Account(userAccountId, this.provider);

    const delegateAction = await userAccount.createMetaTransaction({
      receiverId,
      actions: nearActions,
      blockHeightTtl: 200,
      publicKey: pubKey,
    });

    const encoded: Uint8Array = encodeDelegateAction(delegateAction);
    const requestId = randomUUID();

    this.cache.set(requestId, {
      delegateAction,
      userAccountId,
      createdAt: Date.now(),
    });

    return {
      requestId,
      encodedDelegateAction: Buffer.from(encoded).toString('base64'),
    };
  }

  /**
   * Accept the user's signature, reconstruct SignedDelegate, and relay.
   */
  async submitDelegate(
    requestId: string,
    signatureBase64: string,
    callerAccountId: string,
  ): Promise<{ txHash: string }> {
    const cached = this.cache.get(requestId);
    if (!cached) {
      throw new BadRequestException('Unknown or expired requestId');
    }

    // Ensure the JWT owner matches the cached delegateAction sender.
    if (cached.userAccountId !== callerAccountId) {
      throw new BadRequestException('Account mismatch');
    }

    this.cache.delete(requestId);

    const sigBytes = Buffer.from(signatureBase64, 'base64');
    const signature = new Signature({
      keyType: KeyType.ED25519,
      data: new Uint8Array(sigBytes),
    });

    // Use the action creator to build SignedDelegate (class is type-only export).
    // actionCreators.signedDelegate() returns Action({ signedDelegate: SignedDelegate }),
    // so we extract the inner .signedDelegate field.
    const wrappedAction = actionCreators.signedDelegate({
      delegateAction: cached.delegateAction,
      signature,
    });
    const signedDelegate = wrappedAction.signedDelegate;

    const result = await this.relayerAccount.relayMetaTransaction(signedDelegate);

    const txHash =
      result?.transaction_outcome?.id ??
      result?.transaction?.hash ??
      `relay-${requestId}`;

    this.logger.log(`Relayed meta-tx for ${callerAccountId}: ${txHash}`);
    return { txHash };
  }

  // ── Helpers ──

  private descriptorsToActions(descriptors: ActionDescriptor[]): any[] {
    return descriptors.map((d) => {
      switch (d.type) {
        case 'FunctionCall':
          return actionCreators.functionCall(
            d.methodName,
            d.args,
            BigInt(d.gas),
            BigInt(d.deposit),
          );

        case 'Transfer':
          return actionCreators.transfer(BigInt(d.amount));

        case 'AddKey': {
          const pk = PublicKey.fromString(d.publicKey);
          if (d.permission === 'FullAccess') {
            return actionCreators.addFullAccessKey(pk);
          }
          return actionCreators.addFunctionCallAccessKey(
            pk,
            d.permission.receiverId,
            d.permission.methodNames,
            d.permission.allowance ? BigInt(d.permission.allowance) : undefined,
          );
        }

        default:
          throw new BadRequestException(`Unsupported action type: ${(d as any).type}`);
      }
    });
  }

  private validateActions(
    receiverId: string,
    descriptors: ActionDescriptor[],
    userAccountId: string,
  ): void {
    for (const d of descriptors) {
      switch (d.type) {
        case 'FunctionCall':
          if (!ALLOWED_CONTRACTS.has(receiverId)) {
            throw new BadRequestException(
              `FunctionCall to ${receiverId} is not allowed`,
            );
          }
          break;

        case 'AddKey':
          // Users may only add keys to their own account.
          if (receiverId !== userAccountId) {
            throw new BadRequestException(
              'AddKey is only allowed on your own account',
            );
          }
          break;

        case 'Transfer':
          // Transfer via relay is allowed (e.g. deposit to escrow).
          if (!ALLOWED_CONTRACTS.has(receiverId)) {
            throw new BadRequestException(
              `Transfer to ${receiverId} is not allowed`,
            );
          }
          break;

        default:
          throw new BadRequestException(`Unsupported action type: ${(d as any).type}`);
      }
    }
  }

  private enforceRateLimit(accountId: string): void {
    const now = Date.now();
    const cutoff = now - RelayService.RATE_WINDOW_MS;
    let timestamps = this.rateLimits.get(accountId) ?? [];
    timestamps = timestamps.filter((t) => t > cutoff);

    if (timestamps.length >= RelayService.RATE_MAX) {
      throw new HttpException(
        'Rate limit exceeded. Try again in a few minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    timestamps.push(now);
    this.rateLimits.set(accountId, timestamps);
  }

  private purgeExpired(): void {
    const cutoff = Date.now() - 5 * 60 * 1000;
    for (const [id, entry] of this.cache) {
      if (entry.createdAt < cutoff) this.cache.delete(id);
    }
  }
}
