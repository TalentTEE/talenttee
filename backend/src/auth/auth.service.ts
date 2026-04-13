import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import nacl from 'tweetnacl';
import { User } from '../entities/user.entity.js';
import { UserRole } from '../common/enums/index.js';

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
      const keyStr = publicKey.startsWith('ed25519:')
        ? publicKey.slice('ed25519:'.length)
        : publicKey;
      const keyBytes = Buffer.from(keyStr, 'base64');
      const msgBytes = Buffer.from(message, 'utf-8');
      return nacl.sign.detached.verify(msgBytes, sigBytes, keyBytes);
    } catch {
      return false;
    }
  }

  async findOrCreateUser(nearAccountId: string, role: UserRole, publicKey: string): Promise<User> {
    let user = await this.userRepo.findOne({ where: { nearAccountId } });
    if (!user) {
      user = this.userRepo.create({ nearAccountId, role, publicKey });
      user = await this.userRepo.save(user);
    }
    return user;
  }

  generateJwt(user: User): string {
    return this.jwtService.sign({
      sub: user.nearAccountId,
      role: user.role,
      publicKey: user.publicKey,
    });
  }
}
