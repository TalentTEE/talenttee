import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { EscrowService } from './escrow.service.js';
import { JwtGuard } from '../auth/jwt.guard.js';

@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

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
}
