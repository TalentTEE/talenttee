import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NegotiationSession } from '../entities/negotiation-session.entity.js';
import { NegotiationRound } from '../entities/negotiation-round.entity.js';
import { JobPosting } from '../entities/job-posting.entity.js';
import { User } from '../entities/user.entity.js';
import { CryptoModule } from '../crypto/crypto.module.js';
import { NegotiationController } from './negotiation.controller.js';
import { NegotiationService } from './negotiation.service.js';
import { NEAR_AI_CLIENT } from '../common/interfaces/near-ai-client.interface.js';
import { MockNearAiClient } from '../common/mocks/mock-near-ai-client.js';
import { MATCH_RESULT_QUERY } from '../common/interfaces/match-result-query.interface.js';
import { MockMatchResultQuery } from '../common/mocks/mock-match-result-query.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([NegotiationSession, NegotiationRound, JobPosting, User]),
    CryptoModule,
  ],
  controllers: [NegotiationController],
  providers: [
    NegotiationService,
    { provide: NEAR_AI_CLIENT, useClass: MockNearAiClient },
    { provide: MATCH_RESULT_QUERY, useClass: MockMatchResultQuery },
  ],
  exports: [NegotiationService],
})
export class NegotiationModule {}
