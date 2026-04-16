import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NegotiationSession } from '../entities/negotiation-session.entity.js';
import { NegotiationRound } from '../entities/negotiation-round.entity.js';
import { JobPosting } from '../entities/job-posting.entity.js';
import { User } from '../entities/user.entity.js';
import { MatchResult } from '../entities/match-result.entity.js';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { CryptoModule } from '../crypto/crypto.module.js';
import { NegotiationController } from './negotiation.controller.js';
import { NegotiationService } from './negotiation.service.js';
import { RealNegotiationHandoff } from './real-negotiation-handoff.js';
import { MATCH_RESULT_QUERY } from '../common/interfaces/match-result-query.interface.js';
import { MockMatchResultQuery } from '../common/mocks/mock-match-result-query.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([NegotiationSession, NegotiationRound, JobPosting, User, MatchResult, ResumeProfile]),
    CryptoModule,
  ],
  controllers: [NegotiationController],
  providers: [
    NegotiationService,
    RealNegotiationHandoff,
    { provide: MATCH_RESULT_QUERY, useClass: MockMatchResultQuery },
  ],
  exports: [NegotiationService, RealNegotiationHandoff],
})
export class NegotiationModule {}
