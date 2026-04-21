import {
  Controller, Post, Body, UnauthorizedException, BadRequestException, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UserRole } from '../common/enums/index.js';
import { RelayService } from '../relay/relay.service.js';

@Controller('auth/near')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly relayService: RelayService,
  ) { }

  /** Dev-only login bypass — no wallet signature required. Disabled in production. */
  @Post('dev-login')
  async devLogin(
    @Body() body: { nearAccountId: string; role: string },
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Dev login is not available in production');
    }

    const { nearAccountId, role } = body;
    if (!nearAccountId || !role) {
      throw new BadRequestException('nearAccountId and role are required');
    }

    const roleValue = role === 'EMPLOYER' ? UserRole.EMPLOYER
      : role === 'SEEKER' ? UserRole.SEEKER
        : null;
    if (!roleValue) {
      throw new BadRequestException('role must be SEEKER or EMPLOYER');
    }

    const user = await this.authService.findOrCreateUser(nearAccountId, roleValue, 'ed25519:dev-key');
    const jwt = this.authService.generateJwt(user);
    this.logger.warn(`DEV LOGIN: ${nearAccountId} as ${roleValue}`);
    return { jwt, user };
  }

  @Post('challenge')
  async challenge() {
    return this.authService.generateChallenge();
  }

  @Post('verify')
  async verify(
    @Body() body: {
      nearAccountId: string;
      publicKey: string;
      signature: string;
      nonce: string;
      role?: string;
      intent?: 'login' | 'signup';
    },
  ) {
    const isValidChallenge = this.authService.validateChallenge(body.nonce);
    if (!isValidChallenge) {
      this.logger.warn(`Challenge validation failed for ${body.nearAccountId} — nonce may be expired or already used`);
      throw new UnauthorizedException('Invalid or expired challenge nonce');
    }

    const isValidSig = this.authService.verifyNearSignature(body.nonce, body.signature, body.publicKey);
    if (!isValidSig) {
      this.logger.warn(`Signature verification failed for ${body.nearAccountId} — publicKey: ${body.publicKey?.slice(0, 20)}...`);
      throw new UnauthorizedException('Ed25519 signature verification failed');
    }

    // Default to 'login' when intent is omitted — conservative: never silently creates.
    const intent = body.intent ?? 'login';

    if (intent === 'signup') {
      const roleValue = body.role === 'EMPLOYER' ? UserRole.EMPLOYER
        : body.role === 'SEEKER' ? UserRole.SEEKER
          : null;

      if (!roleValue) {
        throw new BadRequestException('role is required for signup and must be SEEKER or EMPLOYER');
      }

      // Idempotent signup: if user already exists, return existing.
      // If the requested role differs, reject — role change requires a separate flow.
      const existing = await this.authService.findUser(body.nearAccountId);
      if (existing) {
        if (existing.role !== roleValue) {
          throw new BadRequestException(
            `This account is already registered as ${existing.role}. Please log in instead.`,
          );
        }
        const jwt = this.authService.generateJwt(existing);
        return { jwt, user: existing };
      }

      const user = await this.authService.createUser(body.nearAccountId, roleValue, body.publicKey);
      const jwt = this.authService.generateJwt(user);

      // Fund implicit accounts (Web3Auth) so they can pay gas via meta-tx relay.
      if (/^[0-9a-f]{64}$/.test(body.nearAccountId)) {
        this.relayService.fundImplicitAccount(body.nearAccountId)
          .then(() => this.logger.log(`Funded implicit account: ${body.nearAccountId}`))
          .catch(err => this.logger.warn(`Fund failed for ${body.nearAccountId}: ${err.message}`));
      }

      return { jwt, user };
    }

    // intent === 'login' (or default)
    const user = await this.authService.findUser(body.nearAccountId);
    if (!user) {
      throw new NotFoundException('Account not registered. Please sign up first.');
    }

    const jwt = this.authService.generateJwt(user);
    return { jwt, user };
  }
}
