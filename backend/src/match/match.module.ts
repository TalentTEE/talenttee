import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchResult } from '../entities/match-result.entity.js';
import { JobPosting } from '../entities/job-posting.entity.js';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { ResumeModule } from '../resume/resume.module.js';
import { NegotiationModule } from '../negotiation/negotiation.module.js';
import { MatchController } from './match.controller.js';
import { MatchService } from './match.service.js';
import { NEGOTIATION_HANDOFF } from '../common/interfaces/negotiation-handoff.interface.js';
import { RealNegotiationHandoff } from '../negotiation/real-negotiation-handoff.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchResult, JobPosting, ResumeProfile]),
    ResumeModule,
    NegotiationModule,
  ],
  controllers: [MatchController],
  providers: [
    MatchService,
    { provide: NEGOTIATION_HANDOFF, useExisting: RealNegotiationHandoff },
  ],
  exports: [MatchService],
})
export class MatchModule {}
