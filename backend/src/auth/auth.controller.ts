import {
  Controller, Post, Body, UnauthorizedException, BadRequestException, NotFoundException, Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UserRole } from '../common/enums/index.js';

@Controller('auth/near')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) { }

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
      throw new UnauthorizedException('Invalid or expired challenge nonce');
    }

    const isValidSig = this.authService.verifyNearSignature(body.nonce, body.signature, body.publicKey);
    if (!isValidSig) {
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

      // Idempotent signup: if user already exists, return existing without overwriting role.
      const existing = await this.authService.findUser(body.nearAccountId);
      if (existing) {
        this.logger.warn(
          `signup attempt for already-registered account: ${body.nearAccountId} — returning existing user without role change`,
        );
        const jwt = this.authService.generateJwt(existing);
        return { jwt, user: existing };
      }

      const user = await this.authService.createUser(body.nearAccountId, roleValue, body.publicKey);
      const jwt = this.authService.generateJwt(user);
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
