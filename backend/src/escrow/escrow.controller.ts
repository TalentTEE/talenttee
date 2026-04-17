import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { EscrowService } from './escrow.service.js';
import { RealEscrowPayment } from './real-escrow-payment.js';
import { JwtGuard } from '../auth/jwt.guard.js';

@Controller('escrow')
export class EscrowController {
  constructor(
    private readonly escrowService: EscrowService,
    private readonly realEscrow: RealEscrowPayment,
  ) {}

  @UseGuards(JwtGuard)
  @Get('balance')
  async getBalance(@Query('accountId') accountId: string) {
    const balance = await this.escrowService.getBalance(accountId);
    return { balance };
  }

  @UseGuards(JwtGuard)
  @Post('deposit')
  getDepositParams(@Body() body: { amount: string }) {
    return this.escrowService.getDepositTxParams(body.amount);
  }

  @UseGuards(JwtGuard)
  @Get('payments')
  async getPaymentHistory(@Req() req) {
    const userId = req.user.id;
    return this.escrowService.getPaymentHistory(userId);
  }

  @UseGuards(JwtGuard)
  @Get('agent-key')
  getAgentKey() {
    return { publicKey: this.realEscrow.getAgentPublicKey() };
  }
}
