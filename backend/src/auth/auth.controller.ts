import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UserRole } from '../common/enums/index.js';

@Controller('auth/near')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('challenge')
  async challenge() {
    return this.authService.generateChallenge();
  }

  @Post('verify')
  async verify(
    @Body() body: {
      nearAccountId: string; publicKey: string;
      signature: string; nonce: string; role: string;
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

    const role = body.role === 'EMPLOYER' ? UserRole.EMPLOYER : UserRole.SEEKER;
    const user = await this.authService.findOrCreateUser(body.nearAccountId, role, body.publicKey);
    const jwt = this.authService.generateJwt(user);
    return { jwt, user };
  }
}
