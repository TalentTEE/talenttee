import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NegotiationSession } from '../entities/negotiation-session.entity.js';
import { NegotiationRound } from '../entities/negotiation-round.entity.js';
import { AgreementController } from './agreement.controller.js';
import { AgreementService } from './agreement.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([NegotiationSession, NegotiationRound])],
  controllers: [AgreementController],
  providers: [AgreementService],
  exports: [AgreementService],
})
export class AgreementModule {}
