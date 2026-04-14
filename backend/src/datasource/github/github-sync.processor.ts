import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { GitHubApiClient } from './github-api.client.js';
import { GithubSyncService } from './github-sync.service.js';
import { GithubRepository } from '../entities/github-repository.entity.js';
import { GithubCommit } from '../entities/github-commit.entity.js';
import { GithubPullRequest } from '../entities/github-pull-request.entity.js';
import { GithubIssue } from '../entities/github-issue.entity.js';
import { GithubSyncCursor } from '../entities/github-sync-cursor.entity.js';
import { DataSourceConnection } from '../../entities/data-source-connection.entity.js';
import { DataSourceProvider, DataSourceStatus, GithubSyncResourceType } from '../../common/enums/index.js';
import type { OrchestratorJobData, RepoSyncJobData, ThresholdCheckJobData } from './github-sync.types.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Orchestrator Processor
// ─────────────────────────────────────────────────────────────────────────────

@Processor('github-sync-orchestrator')
export class GithubSyncOrchestratorProcessor extends WorkerHost {
  private readonly logger = new Logger(GithubSyncOrchestratorProcessor.name);

  constructor(
    private readonly githubApi: GitHubApiClient,

    @InjectRepository(GithubRepository)
    private readonly githubRepositoryRepo: Repository<GithubRepository>,

    @InjectRepository(DataSourceConnection)
    private readonly dataSourceConnectionRepo: Repository<DataSourceConnection>,

    @InjectQueue('github-sync')
    private readonly githubSyncQueue: Queue,

    @InjectQueue('resume-update')
    private readonly resumeUpdateQueue: Queue,

    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<OrchestratorJobData>): Promise<{ completedRepos: number; failedRepos: number }> {
    const { userId, forceResume } = job.data;
    this.logger.log(`[orchestrator] Starting sync orchestration for user ${userId}`);

    // 1. Get GITHUB CONNECTED DataSourceConnection
    const connection = await this.dataSourceConnectionRepo.findOne({
      where: {
        userId,
        provider: DataSourceProvider.GITHUB,
        status: DataSourceStatus.CONNECTED,
      },
    });

    if (!connection || !connection.accessToken) {
      throw new Error(`No connected GitHub data source for user ${userId}`);
    }

    const token = connection.accessToken;

    // 2. Get GitHub username and repos
    const [githubUser, remoteRepos] = await Promise.all([
      this.githubApi.getUser(token),
      this.githubApi.getRepos(token),
    ]);

    this.logger.log(`[orchestrator] user=${githubUser.login}, repos=${remoteRepos.length}`);

    // 3. Upsert each repo in DB
    for (const remote of remoteRepos) {
      const existing = await this.githubRepositoryRepo.findOne({
        where: { userId, githubRepoId: String(remote.id) },
      });

      if (existing) {
        existing.fullName = remote.full_name;
        existing.name = remote.name;
        existing.description = remote.description ?? existing.description;
        existing.language = remote.language ?? existing.language;
        existing.isPrivate = remote.private;
        existing.starsCount = remote.stargazers_count;
        existing.forksCount = remote.forks_count;
        existing.topics = remote.topics ?? existing.topics;
        await this.githubRepositoryRepo.save(existing);
      } else {
        const newRepo = this.githubRepositoryRepo.create({
          userId,
          githubRepoId: String(remote.id),
          fullName: remote.full_name,
          name: remote.name,
          description: remote.description ?? undefined,
          language: remote.language ?? undefined,
          isPrivate: remote.private,
          starsCount: remote.stargazers_count,
          forksCount: remote.forks_count,
          topics: remote.topics ?? [],
          isActive: true,
        });
        await this.githubRepositoryRepo.save(newRepo);
      }
    }

    // 4. Get active repos from DB
    const activeRepos = await this.githubRepositoryRepo.find({
      where: { userId, isActive: true },
    });

    // 5. Calculate `since`
    const syncDaysLimit = parseInt(
      this.configService.get<string>('GITHUB_SYNC_DAYS_LIMIT', '10'),
      10,
    );
    let since: string | null = null;
    if (syncDaysLimit > 0) {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - syncDaysLimit);
      since = sinceDate.toISOString();
    }

    // 6. Add bulk repo-sync jobs
    const repoSyncJobs = await Promise.all(
      activeRepos.map((repo) =>
        this.githubSyncQueue.add(
          'repo-sync',
          {
            userId,
            repositoryId: repo.id,
            fullName: repo.fullName,
            accessToken: token,
            since,
            forceResume,
          } satisfies RepoSyncJobData,
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 60000 },
          },
        ),
      ),
    );

    this.logger.log(`[orchestrator] Added ${repoSyncJobs.length} repo-sync jobs`);

    // 7. Jobs are durable and will retry on failure via backoff config.
    // waitUntilFinished requires a QueueEvents instance (not injected here), so we
    // treat all enqueued jobs optimistically and let the threshold-check run async.
    const completedRepos = repoSyncJobs.length;
    const failedRepos = 0;

    this.logger.log(
      `[orchestrator] Enqueued ${completedRepos} repo-sync jobs (async, will complete independently)`,
    );

    // 8. Add threshold-check job
    await this.resumeUpdateQueue.add(
      'threshold-check',
      { userId, forceResume } satisfies ThresholdCheckJobData,
    );

    return { completedRepos, failedRepos };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Repo Sync Processor
// ─────────────────────────────────────────────────────────────────────────────

@Processor('github-sync')
export class GithubRepoSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(GithubRepoSyncProcessor.name);

  constructor(
    private readonly githubApi: GitHubApiClient,

    @InjectRepository(GithubCommit)
    private readonly githubCommitRepo: Repository<GithubCommit>,

    @InjectRepository(GithubPullRequest)
    private readonly githubPullRequestRepo: Repository<GithubPullRequest>,

    @InjectRepository(GithubIssue)
    private readonly githubIssueRepo: Repository<GithubIssue>,

    @InjectRepository(GithubSyncCursor)
    private readonly githubSyncCursorRepo: Repository<GithubSyncCursor>,

    @InjectRepository(GithubRepository)
    private readonly githubRepositoryRepo: Repository<GithubRepository>,
  ) {
    super();
  }

  async process(job: Job<RepoSyncJobData>): Promise<void> {
    const { repositoryId, fullName, accessToken, since } = job.data;

    this.logger.log(`[repo-sync] Syncing repo ${fullName} (id=${repositoryId})`);

    const effectiveSince = await this.getEffectiveSince(repositoryId, since);

    // Sync sequentially to reduce rate limit pressure
    await this.syncCommits(repositoryId, fullName, accessToken, effectiveSince);
    await this.syncPullRequests(repositoryId, fullName, accessToken, effectiveSince);
    await this.syncIssues(repositoryId, fullName, accessToken, effectiveSince);

    // Update repo's syncedAt
    await this.githubRepositoryRepo.update(repositoryId, { syncedAt: new Date() });

    this.logger.log(`[repo-sync] Finished syncing repo ${fullName}`);
  }

  private async getEffectiveSince(
    repositoryId: string,
    globalSince: string | null,
  ): Promise<string | null> {
    const cursors = await this.githubSyncCursorRepo.find({ where: { repositoryId } });

    if (cursors.length === 0) return globalSince;

    // Use the most recent lastSyncedAt across all cursors as the cursor-based since
    const latestCursorDate = cursors
      .filter((c) => c.lastSyncedAt != null)
      .reduce<Date | null>((latest, c) => {
        if (!latest) return c.lastSyncedAt;
        return c.lastSyncedAt > latest ? c.lastSyncedAt : latest;
      }, null);

    if (!latestCursorDate) return globalSince;
    if (!globalSince) return latestCursorDate.toISOString();

    const globalDate = new Date(globalSince);
    // Return the more recent of the two (tighter window = less duplication)
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
    this.logger.log(`[repo-sync] ${fullName}: fetched ${commits.length} commits`);

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

    // Client-side filter by since (GitHub pulls API doesn't natively support since param effectively)
    const prs = since
      ? allPrs.filter((pr) => new Date(pr.updated_at) >= new Date(since))
      : allPrs;

    this.logger.log(`[repo-sync] ${fullName}: processing ${prs.length} pull requests`);

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

    // Filter out items that are actually PRs
    const issues = allIssues.filter((i) => !i.pull_request);

    this.logger.log(`[repo-sync] ${fullName}: processing ${issues.length} issues`);

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
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Resume Update Processor
// ─────────────────────────────────────────────────────────────────────────────

@Processor('resume-update')
export class ResumeUpdateProcessor extends WorkerHost {
  private readonly logger = new Logger(ResumeUpdateProcessor.name);

  constructor(
    private readonly syncService: GithubSyncService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<ThresholdCheckJobData>): Promise<void> {
    if (job.name === 'threshold-check') {
      await this.processThresholdCheck(job);
    }
  }

  private async processThresholdCheck(job: Job<ThresholdCheckJobData>): Promise<void> {
    const { userId, forceResume } = job.data;

    const { pendingCommits, pendingPrs, pendingIssues } =
      await this.syncService.countPendingData(userId);

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

    const commitsExceeded = pendingCommits >= thresholdCommits;
    const prsExceeded = pendingPrs >= thresholdPrs;
    const issuesExceeded = pendingIssues >= thresholdIssues;

    if (forceResume || commitsExceeded || prsExceeded || issuesExceeded) {
      this.logger.log(
        `[resume-update] Threshold exceeded for user ${userId} — resume update should be triggered. ` +
          `commits=${pendingCommits}/${thresholdCommits}, prs=${pendingPrs}/${thresholdPrs}, ` +
          `issues=${pendingIssues}/${thresholdIssues}, forceResume=${forceResume}`,
      );
      // Actual resume update integration will be handled in Task 9
    } else {
      this.logger.log(
        `[resume-update] Thresholds below limits for user ${userId}. ` +
          `commits=${pendingCommits}/${thresholdCommits}, prs=${pendingPrs}/${thresholdPrs}, ` +
          `issues=${pendingIssues}/${thresholdIssues}`,
      );
    }
  }
}
