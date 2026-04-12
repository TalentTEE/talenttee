import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
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

  @Post('negotiation/sessions/:id/confirm-tx')
  async confirmTx(@Param('id') id: string, @Body() body: { txHash: string }) {
    await this.agreementService.confirmTx(id, body.txHash);
    return { message: 'Transaction hash recorded', sessionId: id };
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
