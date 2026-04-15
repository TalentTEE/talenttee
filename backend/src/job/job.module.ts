import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPosting } from '../entities/job-posting.entity.js';
import { JobController } from './job.controller.js';
import { JobService } from './job.service.js';

// NEAR_AI_CLIENT is provided globally by AgentModule (NearAiCloudClient).
// Local MockNearAiClient was removed so job creation chat uses the real AI.
@Module({
  imports: [TypeOrmModule.forFeature([JobPosting])],
  controllers: [JobController],
  providers: [JobService],
  exports: [JobService],
})
export class JobModule {}
