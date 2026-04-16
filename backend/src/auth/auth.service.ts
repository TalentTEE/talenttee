import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
import nacl from 'tweetnacl';
import { serialize } from 'borsh';
import bs58 from 'bs58';
import { User } from '../entities/user.entity.js';
import { UserRole } from '../common/enums/index.js';

/** NEP-413 payload schema for Borsh serialization (matches wallet-selector exactly) */
const NEP413_TAG = 2147484061;

const nep413Schema = {
  struct: {
    tag: 'u32',
    message: 'string',
    nonce: { array: { type: 'u8', len: 32 } },
    recipient: 'string',
    callbackUrl: { option: 'string' },
  },
} as const;

function buildNep413Payload(message: string, nonce: Uint8Array, recipient: string) {
  // Match wallet-selector's Payload class: only set callbackUrl if present
  return { tag: NEP413_TAG, message, nonce, recipient };
}

@Injectable()
export class AuthService {
  private challenges = new Map<string, { nonce: string; expiresAt: Date }>();

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  generateChallenge(): { nonce: string; expiresAt: string } {
    const nonce = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    this.challenges.set(nonce, { nonce, expiresAt });
    return { nonce, expiresAt: expiresAt.toISOString() };
  }

  validateChallenge(nonce: string): boolean {
    const challenge = this.challenges.get(nonce);
    if (!challenge) return false;
    if (new Date() > challenge.expiresAt) {
      this.challenges.delete(nonce);
      return false;
    }
    this.challenges.delete(nonce);
    return true;
  }

  verifyNearSignature(message: string, signature: string, publicKey: string): boolean {
    try {
      const sigBytes = Buffer.from(signature, 'base64');

      // NEAR public keys are "ed25519:<base58>" format
      const keyStr = publicKey.startsWith('ed25519:')
        ? publicKey.slice('ed25519:'.length)
        : publicKey;
      const keyBytes = bs58.decode(keyStr);

      // Reconstruct NEP-413 Borsh-serialized payload (matches wallet-selector)
      const nonceBytes = Buffer.from(message, 'hex');
      const payload = buildNep413Payload(message, nonceBytes, 'talent-tee');
      const borshPayload = serialize(nep413Schema, payload);

      // NEP-413: signature is over SHA-256 hash of the serialized payload
      const hashedPayload = createHash('sha256').update(Buffer.from(borshPayload)).digest();

      return nacl.sign.detached.verify(hashedPayload, sigBytes, keyBytes);
    } catch {
      return false;
    }
  }

  /** Read-only lookup — never creates a user. */
  async findUser(nearAccountId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { nearAccountId } });
  }

  /** Write-only creation — caller must ensure user does not already exist. */
  async createUser(nearAccountId: string, role: UserRole, publicKey: string): Promise<User> {
    const user = this.userRepo.create({ nearAccountId, role, publicKey });
    return this.userRepo.save(user);
  }

  /** Back-compat wrapper: find existing or create new user. */
  async findOrCreateUser(nearAccountId: string, role: UserRole, publicKey: string): Promise<User> {
    const existing = await this.findUser(nearAccountId);
    if (existing) return existing;
    return this.createUser(nearAccountId, role, publicKey);
  }

  generateJwt(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      nearAccountId: user.nearAccountId,
      role: user.role,
      publicKey: user.publicKey,
    });
  }
}
