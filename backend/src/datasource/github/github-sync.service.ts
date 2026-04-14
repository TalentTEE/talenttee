import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { GithubRepository } from '../entities/github-repository.entity.js';
import { GithubCommit } from '../entities/github-commit.entity.js';
import { GithubPullRequest } from '../entities/github-pull-request.entity.js';
import { GithubIssue } from '../entities/github-issue.entity.js';
import { GithubSyncCursor } from '../entities/github-sync-cursor.entity.js';
import { ResumeSyncCheckpoint } from '../entities/resume-sync-checkpoint.entity.js';
import { DataSourceConnection } from '../../entities/data-source-connection.entity.js';
import { DataSourceProvider, DataSourceStatus, GithubSyncResourceType, GithubSyncStatus } from '../../common/enums/index.js';
import type { GitHubActivityForAI, SyncStatusResponse } from './github-sync.types.js';
import { GitHubApiClient } from './github-api.client.js';
import { ResumeService } from '../../resume/resume.service.js';

@Injectable()
export class GithubSyncService {
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

    private readonly configService: ConfigService,
    private readonly githubApi: GitHubApiClient,

    @Inject(forwardRef(() => ResumeService))
    private readonly resumeService: ResumeService,
  ) {}

  async startSync(userId: string, forceResume = false): Promise<{ message: string }> {
    const conn = await this.dataSourceConnectionRepo.findOne({
      where: {
        userId,
        provider: DataSourceProvider.GITHUB,
        status: DataSourceStatus.CONNECTED,
      },
    });

    if (!conn?.accessToken) {
      throw new NotFoundException('GitHub not connected');
    }

    // Fire-and-forget
    this.runSync(userId, forceResume).catch((err) => {
      this.logger.error(`Sync failed for user ${userId}: ${err}`);
    });

    return { message: 'Sync started' };
  }

  async getSyncStatus(userId: string): Promise<SyncStatusResponse> {
    const repos = await this.githubRepositoryRepo.find({ where: { userId, isActive: true } });
    const syncedRepos = repos.filter((r) => r.syncedAt !== null);

    return {
      status: GithubSyncStatus.COMPLETED,
      totalRepos: repos.length,
      completedRepos: syncedRepos.length,
      failedRepos: 0,
      startedAt: null,
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Sync orchestration (fire-and-forget)
  // ─────────────────────────────────────────────────────────────────────────────

  async runSync(userId: string, forceResume = false): Promise<void> {
    const conn = await this.dataSourceConnectionRepo.findOne({
      where: { userId, provider: DataSourceProvider.GITHUB, status: DataSourceStatus.CONNECTED },
    });
    if (!conn?.accessToken) throw new NotFoundException('GitHub not connected');

    const token = conn.accessToken;

    // 1. Get GitHub user + repos
    const [ghUser, ghRepos] = await Promise.all([
      this.githubApi.getUser(token),
      this.githubApi.getRepos(token),
    ]);

    this.logger.log(`Sync orchestration: user=${ghUser.login}, repos=${ghRepos.length}`);

    // 2. Upsert repos
    for (const ghRepo of ghRepos) {
      const existing = await this.githubRepositoryRepo.findOne({
        where: { userId, githubRepoId: String(ghRepo.id) },
      });
      if (existing) {
        existing.fullName = ghRepo.full_name;
        existing.name = ghRepo.name;
        existing.description = ghRepo.description ?? existing.description;
        existing.language = ghRepo.language ?? existing.language;
        existing.isPrivate = ghRepo.private;
        existing.starsCount = ghRepo.stargazers_count;
        existing.forksCount = ghRepo.forks_count;
        existing.topics = ghRepo.topics ?? existing.topics;
        await this.githubRepositoryRepo.save(existing);
      } else {
        await this.githubRepositoryRepo.save(this.githubRepositoryRepo.create({
          userId,
          githubRepoId: String(ghRepo.id),
          fullName: ghRepo.full_name,
          name: ghRepo.name,
          description: ghRepo.description ?? undefined,
          language: ghRepo.language ?? undefined,
          isPrivate: ghRepo.private,
          starsCount: ghRepo.stargazers_count,
          forksCount: ghRepo.forks_count,
          topics: ghRepo.topics ?? [],
          isActive: true,
        }));
      }
    }

    // 3. Sync active repos sequentially
    const activeRepos = await this.githubRepositoryRepo.find({ where: { userId, isActive: true } });
    const syncDaysLimit = parseInt(
      this.configService.get<string>('GITHUB_SYNC_DAYS_LIMIT', '10'),
      10,
    );
    let globalSince: string | null = null;
    if (syncDaysLimit > 0) {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - syncDaysLimit);
      globalSince = sinceDate.toISOString();
    }

    for (const repo of activeRepos) {
      try {
        await this.syncRepo(repo, token, globalSince);
      } catch (err) {
        this.logger.error(`Failed to sync repo ${repo.fullName}: ${err}`);
      }
    }

    // 4. Check thresholds
    await this.checkThresholdsAndUpdate(userId, forceResume);
  }

  private async syncRepo(repo: GithubRepository, token: string, globalSince: string | null): Promise<void> {
    const effectiveSince = await this.getEffectiveSince(repo.id, globalSince);

    await this.syncCommits(repo.id, repo.fullName, token, effectiveSince);
    await this.syncPullRequests(repo.id, repo.fullName, token, effectiveSince);
    await this.syncIssues(repo.id, repo.fullName, token, effectiveSince);

    await this.githubRepositoryRepo.update(repo.id, { syncedAt: new Date() });
    this.logger.log(`Synced repo: ${repo.fullName}`);
  }

  private async getEffectiveSince(
    repositoryId: string,
    globalSince: string | null,
  ): Promise<string | null> {
    const cursors = await this.githubSyncCursorRepo.find({ where: { repositoryId } });

    if (cursors.length === 0) return globalSince;

    const latestCursorDate = cursors
      .filter((c) => c.lastSyncedAt != null)
      .reduce<Date | null>((latest, c) => {
        if (!latest) return c.lastSyncedAt;
        return c.lastSyncedAt > latest ? c.lastSyncedAt : latest;
      }, null);

    if (!latestCursorDate) return globalSince;
    if (!globalSince) return latestCursorDate.toISOString();

    const globalDate = new Date(globalSince);
    return latestCursorDate > globalDate
      ? latestCursorDate.toISOString()
      : globalSince;
  }

  private async syncCommits(
    repositoryId: string,
    fullName: string,
    token: string,
    since: string | null,
  ): Promise<void> {
    const commits = await this.githubApi.getCommits(token, fullName, since ?? undefined);
    this.logger.log(`${fullName}: fetched ${commits.length} commits`);

    for (const c of commits) {
      const exists = await this.githubCommitRepo.findOne({ where: { sha: c.sha } });
      if (exists) continue;

      const commit = this.githubCommitRepo.create({
        repositoryId,
        sha: c.sha,
        message: c.commit.message,
        authorName: c.commit.author?.name ?? undefined,
        authorEmail: c.commit.author?.email ?? undefined,
        authoredAt: c.commit.author?.date ? new Date(c.commit.author.date) : undefined,
        additions: c.stats?.additions ?? undefined,
        deletions: c.stats?.deletions ?? undefined,
        filesChanged: c.stats?.total ?? undefined,
        rawData: c as unknown as Record<string, unknown>,
      });

      await this.githubCommitRepo.save(commit);
    }

    await this.updateCursor(repositoryId, GithubSyncResourceType.COMMIT);
  }

  private async syncPullRequests(
    repositoryId: string,
    fullName: string,
    token: string,
    since: string | null,
  ): Promise<void> {
    const allPrs = await this.githubApi.getPullRequests(token, fullName, since ?? undefined);

    const prs = since
      ? allPrs.filter((pr) => new Date(pr.updated_at) >= new Date(since))
      : allPrs;

    this.logger.log(`${fullName}: processing ${prs.length} pull requests`);

    for (const pr of prs) {
      const existing = await this.githubPullRequestRepo.findOne({
        where: { repositoryId, githubPrNumber: pr.number },
      });

      if (existing) {
        existing.state = pr.merged_at ? 'merged' : pr.state;
        existing.isMerged = pr.merged_at != null;
        existing.mergedAt = pr.merged_at ? new Date(pr.merged_at) : existing.mergedAt;
        existing.closedAt = pr.closed_at ? new Date(pr.closed_at) : existing.closedAt;
        await this.githubPullRequestRepo.save(existing);
      } else {
        const newPr = this.githubPullRequestRepo.create({
          repositoryId,
          githubPrNumber: pr.number,
          title: pr.title,
          body: pr.body ?? undefined,
          state: pr.merged_at ? 'merged' : pr.state,
          isMerged: pr.merged_at != null,
          createdAt: new Date(pr.created_at),
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : undefined,
          closedAt: pr.closed_at ? new Date(pr.closed_at) : undefined,
          rawData: pr as unknown as Record<string, unknown>,
        });
        await this.githubPullRequestRepo.save(newPr);
      }
    }

    await this.updateCursor(repositoryId, GithubSyncResourceType.PULL_REQUEST);
  }

  private async syncIssues(
    repositoryId: string,
    fullName: string,
    token: string,
    since: string | null,
  ): Promise<void> {
    const allIssues = await this.githubApi.getIssues(token, fullName, since ?? undefined);

    const issues = allIssues.filter((i) => !i.pull_request);

    this.logger.log(`${fullName}: processing ${issues.length} issues`);

    for (const issue of issues) {
      const labels = (issue.labels ?? []).map((l) =>
        typeof l === 'string' ? l : (l as { name: string }).name,
      );

      const existing = await this.githubIssueRepo.findOne({
        where: { repositoryId, githubIssueNumber: issue.number },
      });

      if (existing) {
        existing.state = issue.state;
        existing.closedAt = issue.closed_at ? new Date(issue.closed_at) : existing.closedAt;
        existing.labels = labels;
        await this.githubIssueRepo.save(existing);
      } else {
        const newIssue = this.githubIssueRepo.create({
          repositoryId,
          githubIssueNumber: issue.number,
          title: issue.title,
          body: issue.body ?? undefined,
          state: issue.state,
          labels,
          createdAt: new Date(issue.created_at),
          closedAt: issue.closed_at ? new Date(issue.closed_at) : undefined,
          rawData: issue as unknown as Record<string, unknown>,
        });
        await this.githubIssueRepo.save(newIssue);
      }
    }

    await this.updateCursor(repositoryId, GithubSyncResourceType.ISSUE);
  }

  private async updateCursor(
    repositoryId: string,
    resourceType: GithubSyncResourceType,
  ): Promise<void> {
    let cursor = await this.githubSyncCursorRepo.findOne({
      where: { repositoryId, resourceType },
    });

    if (!cursor) {
      cursor = this.githubSyncCursorRepo.create({ repositoryId, resourceType });
    }

    cursor.lastSyncedAt = new Date();
    await this.githubSyncCursorRepo.save(cursor);
  }

  private async checkThresholdsAndUpdate(userId: string, forceResume: boolean): Promise<void> {
    const { pendingCommits, pendingPrs, pendingIssues } = await this.countPendingData(userId);

    const thresholdCommits = parseInt(
      this.configService.get<string>('RESUME_THRESHOLD_COMMITS', '20'),
      10,
    );
    const thresholdPrs = parseInt(
      this.configService.get<string>('RESUME_THRESHOLD_PRS', '3'),
      10,
    );
    const thresholdIssues = parseInt(
      this.configService.get<string>('RESUME_THRESHOLD_ISSUES', '5'),
      10,
    );

    const shouldUpdate = forceResume
      || pendingCommits >= thresholdCommits
      || pendingPrs >= thresholdPrs
      || pendingIssues >= thresholdIssues;

    if (shouldUpdate) {
      this.logger.log(`Threshold exceeded for user ${userId}. Triggering incremental resume update.`);
      await this.resumeService.generateIncremental(userId);
    } else {
      this.logger.log(
        `Below threshold for user ${userId}: ` +
          `commits=${pendingCommits}/${thresholdCommits}, prs=${pendingPrs}/${thresholdPrs}, ` +
          `issues=${pendingIssues}/${thresholdIssues}`,
      );
    }
  }
}
