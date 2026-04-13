import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileAccessGrant } from '../entities/profile-access-grant.entity.js';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';
import { ESCROW_PAYMENT } from '../common/interfaces/escrow-payment.interface.js';
import { MockEscrowPayment } from '../common/mocks/mock-escrow-payment.js';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileAccessGrant, ResumeProfile])],
  controllers: [ProfileController],
  providers: [
    ProfileService,
    { provide: ESCROW_PAYMENT, useClass: MockEscrowPayment },
  ],
  exports: [ProfileService],
})
export class ProfileModule {}
