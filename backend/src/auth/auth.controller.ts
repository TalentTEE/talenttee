import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UserRole } from '../common/enums/index.js';

@Controller('auth/near')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('challenge')
  challenge() {
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

    // TODO: near-sign-verify로 실제 Ed25519 서명 검증
    // PoC에서는 challenge 유효성만 확인

    const role = body.role === 'EMPLOYER' ? UserRole.EMPLOYER : UserRole.SEEKER;
    const user = await this.authService.findOrCreateUser(body.nearAccountId, role, body.publicKey);
    const jwt = this.authService.generateJwt(user);
    return { jwt, user };
  }
}
