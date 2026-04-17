import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscrowController } from './escrow.controller.js';
import { EscrowService } from './escrow.service.js';
import { RealEscrowPayment } from './real-escrow-payment.js';
import { PaymentRecord } from '../entities/payment-record.entity.js';
import { ESCROW_PAYMENT } from '../common/interfaces/escrow-payment.interface.js';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentRecord])],
  controllers: [EscrowController],
  providers: [
    EscrowService,
    RealEscrowPayment,
    { provide: ESCROW_PAYMENT, useExisting: RealEscrowPayment },
  ],
  exports: [EscrowService, ESCROW_PAYMENT, RealEscrowPayment],
})
export class EscrowModule {}
