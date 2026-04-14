import { Injectable, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { GithubRepository } from '../entities/github-repository.entity.js';
import { GithubCommit } from '../entities/github-commit.entity.js';
import { GithubPullRequest } from '../entities/github-pull-request.entity.js';
import { GithubIssue } from '../entities/github-issue.entity.js';
import { GithubSyncCursor } from '../entities/github-sync-cursor.entity.js';
import { ResumeSyncCheckpoint } from '../entities/resume-sync-checkpoint.entity.js';
import { DataSourceConnection } from '../../entities/data-source-connection.entity.js';
import { DataSourceProvider, DataSourceStatus } from '../../common/enums/index.js';
import type { GitHubActivityForAI, OrchestratorJobData, SyncStatusResponse } from './github-sync.types.js';
import { GithubSyncStatus } from '../../common/enums/index.js';

@Injectable()
export class GithubSyncService implements OnModuleInit {
  private readonly logger = new Logger(GithubSyncService.name);

  constructor(
    @InjectRepository(GithubRepository)
    private readonly githubRepositoryRepo: Repository<GithubRepository>,

    @InjectRepository(GithubCommit)
    private readonly githubCommitRepo: Repository<GithubCommit>,

    @InjectRepository(GithubPullRequest)
    private readonly githubPullRequestRepo: Repository<GithubPullRequest>,

    @InjectRepository(GithubIssue)
    private readonly githubIssueRepo: Repository<GithubIssue>,

    @InjectRepository(GithubSyncCursor)
    private readonly githubSyncCursorRepo: Repository<GithubSyncCursor>,

    @InjectRepository(ResumeSyncCheckpoint)
    private readonly resumeSyncCheckpointRepo: Repository<ResumeSyncCheckpoint>,

    @InjectRepository(DataSourceConnection)
    private readonly dataSourceConnectionRepo: Repository<DataSourceConnection>,

    @InjectQueue('github-sync-orchestrator')
    private readonly orchestratorQueue: Queue,

    private readonly configService: ConfigService,
  ) {}

  async startSync(userId: string, forceResume = false): Promise<{ jobId: string }> {
    const connection = await this.dataSourceConnectionRepo.findOne({
      where: {
        userId,
        provider: DataSourceProvider.GITHUB,
        status: DataSourceStatus.CONNECTED,
      },
    });

    if (!connection || !connection.accessToken) {
      throw new NotFoundException('GitHub not connected');
    }

    const jobData: OrchestratorJobData = { userId, forceResume };

    const job = await this.orchestratorQueue.add('orchestrate', jobData);

    await this.orchestratorQueue.add('orchestrate', jobData, {
      repeat: { pattern: '0 3 * * *' },
      jobId: `daily-sync-${userId}`,
    });

    return { jobId: job.id! };
  }

  async getSyncStatus(userId: string): Promise<SyncStatusResponse> {
    const repos = await this.getRepos(userId);
    const totalRepos = repos.length;

    const [activeJobs, waitingJobs, completedJobs, failedJobs] = await Promise.all([
      this.orchestratorQueue.getActive(),
      this.orchestratorQueue.getWaiting(),
      this.orchestratorQueue.getCompleted(),
      this.orchestratorQueue.getFailed(),
    ]);

    const allJobs = [...activeJobs, ...waitingJobs, ...completedJobs, ...failedJobs];
    const userJob = allJobs.find((j) => (j.data as OrchestratorJobData).userId === userId);

    let status: GithubSyncStatus = GithubSyncStatus.PENDING;
    let startedAt: string | null = null;

    if (userJob) {
      const state = await userJob.getState();
      if (state === 'active') {
        status = GithubSyncStatus.IN_PROGRESS;
      } else if (state === 'completed') {
        status = GithubSyncStatus.COMPLETED;
      } else if (state === 'failed') {
        status = GithubSyncStatus.FAILED;
      } else {
        status = GithubSyncStatus.PENDING;
      }

      if (userJob.processedOn) {
        startedAt = new Date(userJob.processedOn).toISOString();
      }
    }

    const completedRepos = repos.filter((r) => r.syncedAt != null).length;
    const failedReposCount = 0;

    return {
      status,
      totalRepos,
      completedRepos,
      failedRepos: failedReposCount,
      startedAt,
    };
  }

  async getRepos(userId: string): Promise<GithubRepository[]> {
    return this.githubRepositoryRepo.find({
      where: { userId },
      order: { fullName: 'ASC' },
    });
  }

  async toggleRepo(userId: string, repoId: string, isActive: boolean): Promise<GithubRepository> {
    const repo = await this.githubRepositoryRepo.findOne({
      where: { id: repoId, userId },
    });

    if (!repo) {
      throw new NotFoundException('Repository not found');
    }

    repo.isActive = isActive;
    return this.githubRepositoryRepo.save(repo);
  }

  async buildActivityForAI(userId: string): Promise<GitHubActivityForAI> {
    const activeRepos = await this.githubRepositoryRepo.find({
      where: { userId, isActive: true },
    });

    const repoIds = activeRepos.map((r) => r.id);

    let commits: GithubCommit[] = [];
    let pullRequests: GithubPullRequest[] = [];
    let issues: GithubIssue[] = [];

    if (repoIds.length > 0) {
      [commits, pullRequests, issues] = await Promise.all([
        this.githubCommitRepo.find({ where: { repositoryId: In(repoIds) } }),
        this.githubPullRequestRepo.find({ where: { repositoryId: In(repoIds) } }),
        this.githubIssueRepo.find({ where: { repositoryId: In(repoIds) } }),
      ]);
    }

    // Build language stats from repos + commits
    const languageStats: Record<string, { repoCount: number; commitCount: number }> = {};

    for (const repo of activeRepos) {
      if (repo.language) {
        if (!languageStats[repo.language]) {
          languageStats[repo.language] = { repoCount: 0, commitCount: 0 };
        }
        languageStats[repo.language].repoCount += 1;
      }
    }

    const repoIdToLanguage = new Map(activeRepos.map((r) => [r.id, r.language]));
    for (const commit of commits) {
      const lang = repoIdToLanguage.get(commit.repositoryId);
      if (lang) {
        if (!languageStats[lang]) {
          languageStats[lang] = { repoCount: 0, commitCount: 0 };
        }
        languageStats[lang].commitCount += 1;
      }
    }

    // Build commit stats by repo
    const repoIdToName = new Map(activeRepos.map((r) => [r.id, r.fullName]));
    const statsByRepo: Record<string, { count: number; additions: number; deletions: number }> = {};

    for (const commit of commits) {
      const repoName = repoIdToName.get(commit.repositoryId) ?? commit.repositoryId;
      if (!statsByRepo[repoName]) {
        statsByRepo[repoName] = { count: 0, additions: 0, deletions: 0 };
      }
      statsByRepo[repoName].count += 1;
      statsByRepo[repoName].additions += commit.additions ?? 0;
      statsByRepo[repoName].deletions += commit.deletions ?? 0;
    }

    const recentMessages = commits
      .filter((c) => c.message)
      .map((c) => c.message)
      .slice(0, 50);

    const prItems = pullRequests.slice(0, 100).map((pr) => {
      const repoName = repoIdToName.get(pr.repositoryId) ?? pr.repositoryId;
      return {
        repo: repoName,
        title: pr.title ?? '',
        state: pr.state,
        createdAt: pr.createdAt ? pr.createdAt.toISOString() : '',
        mergedAt: pr.mergedAt ? pr.mergedAt.toISOString() : null,
      };
    });

    const issueItems = issues.slice(0, 100).map((issue) => {
      const repoName = repoIdToName.get(issue.repositoryId) ?? issue.repositoryId;
      return {
        repo: repoName,
        title: issue.title ?? '',
        state: issue.state,
        labels: issue.labels ?? [],
      };
    });

    const mergedPrCount = pullRequests.filter((pr) => pr.isMerged).length;
    const closedIssueCount = issues.filter((issue) => issue.state === 'closed').length;

    // Determine a single username by stripping the repo part from fullName
    const username = activeRepos.length > 0
      ? (activeRepos[0].fullName.split('/')[0] ?? '')
      : '';

    return {
      profile: {
        username,
        totalRepos: activeRepos.length,
        activeRepos: activeRepos.map((r) => r.fullName),
      },
      languageStats,
      commits: {
        total: commits.length,
        recentMessages,
        statsByRepo,
      },
      pullRequests: {
        total: pullRequests.length,
        merged: mergedPrCount,
        items: prItems,
      },
      issues: {
        total: issues.length,
        closed: closedIssueCount,
        items: issueItems,
      },
    };
  }

  async getOrCreateCheckpoint(userId: string): Promise<ResumeSyncCheckpoint> {
    let checkpoint = await this.resumeSyncCheckpointRepo.findOne({ where: { userId } });

    if (!checkpoint) {
      checkpoint = this.resumeSyncCheckpointRepo.create({ userId });
      checkpoint = await this.resumeSyncCheckpointRepo.save(checkpoint);
    }

    return checkpoint;
  }

  async countPendingData(userId: string): Promise<{
    pendingCommits: number;
    pendingPrs: number;
    pendingIssues: number;
  }> {
    const checkpoint = await this.getOrCreateCheckpoint(userId);

    const repos = await this.githubRepositoryRepo.find({ where: { userId } });
    const repoIds = repos.map((r) => r.id);

    let pendingCommits = 0;
    let pendingPrs = 0;
    let pendingIssues = 0;

    if (repoIds.length > 0) {
      if (checkpoint.lastCommitSyncedAt) {
        pendingCommits = await this.githubCommitRepo.count({
          where: {
            repositoryId: In(repoIds),
            authoredAt: MoreThan(checkpoint.lastCommitSyncedAt),
          },
        });
      } else {
        pendingCommits = await this.githubCommitRepo.count({
          where: { repositoryId: In(repoIds) },
        });
      }

      if (checkpoint.lastPrSyncedAt) {
        pendingPrs = await this.githubPullRequestRepo.count({
          where: {
            repositoryId: In(repoIds),
            createdAt: MoreThan(checkpoint.lastPrSyncedAt),
          },
        });
      } else {
        pendingPrs = await this.githubPullRequestRepo.count({
          where: { repositoryId: In(repoIds) },
        });
      }

      if (checkpoint.lastIssueSyncedAt) {
        pendingIssues = await this.githubIssueRepo.count({
          where: {
            repositoryId: In(repoIds),
            createdAt: MoreThan(checkpoint.lastIssueSyncedAt),
          },
        });
      } else {
        pendingIssues = await this.githubIssueRepo.count({
          where: { repositoryId: In(repoIds) },
        });
      }
    }

    checkpoint.pendingCommits = pendingCommits;
    checkpoint.pendingPrs = pendingPrs;
    checkpoint.pendingIssues = pendingIssues;
    await this.resumeSyncCheckpointRepo.save(checkpoint);

    return { pendingCommits, pendingPrs, pendingIssues };
  }

  async updateCheckpointAfterResume(userId: string): Promise<void> {
    const checkpoint = await this.getOrCreateCheckpoint(userId);
    const now = new Date();

    checkpoint.lastCommitSyncedAt = now;
    checkpoint.lastPrSyncedAt = now;
    checkpoint.lastIssueSyncedAt = now;
    checkpoint.pendingCommits = 0;
    checkpoint.pendingPrs = 0;
    checkpoint.pendingIssues = 0;
    checkpoint.resumeUpdatedAt = now;

    await this.resumeSyncCheckpointRepo.save(checkpoint);
  }

  async onModuleInit(): Promise<void> {
    const connections = await this.dataSourceConnectionRepo.find({
      where: {
        provider: DataSourceProvider.GITHUB,
        status: DataSourceStatus.CONNECTED,
      },
    });

    for (const connection of connections) {
      try {
        await this.orchestratorQueue.add(
          'orchestrate',
          { userId: connection.userId, forceResume: false } satisfies OrchestratorJobData,
          {
            repeat: { pattern: '0 3 * * *' },
            jobId: `daily-sync-${connection.userId}`,
          },
        );
        this.logger.log(`Registered daily sync for user ${connection.userId}`);
      } catch (err) {
        this.logger.error(`Failed to register daily sync for user ${connection.userId}`, err);
      }
    }
  }
}
