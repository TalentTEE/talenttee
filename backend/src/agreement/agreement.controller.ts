import { Controller, Post, Get, Param, UseGuards, Req } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard.js';
import { AgreementService } from './agreement.service.js';

@Controller()
@UseGuards(JwtGuard)
export class AgreementController {
  constructor(private readonly agreementService: AgreementService) {}

  @Post('negotiation/sessions/:id/approve')
  async approve(@Param('id') id: string, @Req() req) {
    return this.agreementService.approve(id, req.user.nearAccountId);
  }

  @Get('agreement/:sessionId')
  async getAgreement(@Param('sessionId') sessionId: string) {
    return this.agreementService.getAgreement(sessionId);
  }

  @Get('agreement/:sessionId/verify')
  async verifyAgreement(@Param('sessionId') sessionId: string) {
    const verified = await this.agreementService.verifyAgreement(sessionId);
    return { sessionId, verified };
  }
}
