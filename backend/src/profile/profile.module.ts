import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileAccessGrant } from '../entities/profile-access-grant.entity.js';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { User } from '../entities/user.entity.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';
import { EscrowModule } from '../escrow/escrow.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileAccessGrant, ResumeProfile, User]),
    EscrowModule,
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
