import { Module } from '@nestjs/common';
import { EscrowController } from './escrow.controller.js';
import { EscrowService } from './escrow.service.js';

@Module({
  controllers: [EscrowController],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class EscrowModule {}
