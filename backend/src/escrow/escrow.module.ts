import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscrowController } from './escrow.controller.js';
import { EscrowService } from './escrow.service.js';
import { PaymentRecord } from '../entities/payment-record.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentRecord])],
  controllers: [EscrowController],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class EscrowModule {}
