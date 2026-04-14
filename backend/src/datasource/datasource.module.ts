import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { ResumeModule } from '../resume/resume.module.js';

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
    forwardRef(() => ResumeModule),
  ],
  controllers: [DatasourceController],
  providers: [
    DatasourceService,
    GitHubApiClient,
    GithubSyncService,
  ],
  exports: [DatasourceService, GithubSyncService],
})
export class DatasourceModule {}
