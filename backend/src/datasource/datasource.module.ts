import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DataSourceConnection } from '../entities/data-source-connection.entity.js';
import { GithubRepository } from './entities/github-repository.entity.js';
import { GithubCommit } from './entities/github-commit.entity.js';
import { GithubPullRequest } from './entities/github-pull-request.entity.js';
import { GithubIssue } from './entities/github-issue.entity.js';
import { GithubSyncCursor } from './entities/github-sync-cursor.entity.js';
import { ResumeSyncCheckpoint } from './entities/resume-sync-checkpoint.entity.js';
import { DatasourceController } from './datasource.controller.js';
import { DatasourceService } from './datasource.service.js';
import { GitHubApiClient } from './github/github-api.client.js';
import { GithubSyncService } from './github/github-sync.service.js';
import {
  GithubSyncOrchestratorProcessor,
  GithubRepoSyncProcessor,
  ResumeUpdateProcessor,
} from './github/github-sync.processor.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DataSourceConnection,
      GithubRepository,
      GithubCommit,
      GithubPullRequest,
      GithubIssue,
      GithubSyncCursor,
      ResumeSyncCheckpoint,
    ]),
    BullModule.registerQueue(
      { name: 'github-sync-orchestrator' },
      { name: 'github-sync' },
      { name: 'resume-update' },
    ),
  ],
  controllers: [DatasourceController],
  providers: [
    DatasourceService,
    GitHubApiClient,
    GithubSyncService,
    GithubSyncOrchestratorProcessor,
    GithubRepoSyncProcessor,
    ResumeUpdateProcessor,
  ],
  exports: [DatasourceService, GithubSyncService],
})
export class DatasourceModule {}
