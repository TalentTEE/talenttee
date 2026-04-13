import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchResult } from '../entities/match-result.entity.js';
import { JobPosting } from '../entities/job-posting.entity.js';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { ResumeModule } from '../resume/resume.module.js';
import { MatchController } from './match.controller.js';
import { MatchService } from './match.service.js';
import { NEGOTIATION_HANDOFF } from '../common/interfaces/negotiation-handoff.interface.js';
import { MockNegotiationHandoff } from '../common/mocks/mock-negotiation-handoff.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([MatchResult, JobPosting, ResumeProfile]),
    ResumeModule,
  ],
  controllers: [MatchController],
  providers: [
    MatchService,
    { provide: NEGOTIATION_HANDOFF, useClass: MockNegotiationHandoff },
  ],
  exports: [MatchService],
})
export class MatchModule {}
