import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPosting } from '../entities/job-posting.entity.js';
import { JobController } from './job.controller.js';
import { JobService } from './job.service.js';
import { NEAR_AI_CLIENT } from '../common/interfaces/index.js';
import { MockNearAiClient } from '../common/mocks/mock-near-ai-client.js';

@Module({
  imports: [TypeOrmModule.forFeature([JobPosting])],
  controllers: [JobController],
  providers: [
    JobService,
    { provide: NEAR_AI_CLIENT, useClass: MockNearAiClient },
  ],
  exports: [JobService],
})
export class JobModule {}
