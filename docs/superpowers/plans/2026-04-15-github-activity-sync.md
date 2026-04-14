# GitHub Activity Sync & Resume Auto-Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch GitHub activity (commits, PRs, issues) via the GitHub API after OAuth, store raw data in DB, and auto-update resumes incrementally via AI agent when thresholds are met.

**Architecture:** BullMQ job queue orchestrates GitHub API data collection per-repo with rate limiting. Six new DB tables track raw GitHub data, sync cursors, and resume sync checkpoints. An incremental AI prompt updates existing resumes with only new activity data.

**Tech Stack:** NestJS 11, TypeORM 0.3, BullMQ + ioredis, GitHub REST API v2022-11-28, NEAR AI (Qwen3)

---

### Task 1: Install BullMQ Dependencies

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install bullmq and ioredis**

```bash
cd /Users/kyle/workspace/Personal/talenttee/backend && npm install bullmq ioredis @nestjs/bullmq
```

- [ ] **Step 2: Verify installation**

```bash
cd /Users/kyle/workspace/Personal/talenttee/backend && node -e "require('bullmq'); require('ioredis'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/kyle/workspace/Personal/talenttee && git add backend/package.json backend/package-lock.json && git commit -m "chore: add bullmq, ioredis, @nestjs/bullmq dependencies"
```

---

### Task 2: Add Enums & Types

**Files:**
- Modify: `backend/src/common/enums/index.ts`
- Create: `backend/src/datasource/github/github-sync.types.ts`

- [ ] **Step 1: Add new enums to `backend/src/common/enums/index.ts`**

Add after the existing `ResumeStatus` enum:

```typescript
export enum GithubSyncResourceType {
  COMMIT = 'COMMIT',
  PULL_REQUEST = 'PULL_REQUEST',
  ISSUE = 'ISSUE',
}

export enum GithubSyncStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
```

- [ ] **Step 2: Create `backend/src/datasource/github/github-sync.types.ts`**

```typescript
export interface GitHubActivityForAI {
  profile: {
    username: string;
    totalRepos: number;
    activeRepos: string[];
  };
  languageStats: Record<string, {
    repoCount: number;
    commitCount: number;
  }>;
  commits: {
    total: number;
    recentMessages: string[];
    statsByRepo: Record<string, {
      count: number;
      additions: number;
      deletions: number;
    }>;
  };
  pullRequests: {
    total: number;
    merged: number;
    items: Array<{
      repo: string;
      title: string;
      state: string;
      createdAt: string;
      mergedAt: string | null;
    }>;
  };
  issues: {
    total: number;
    closed: number;
    items: Array<{
      repo: string;
      title: string;
      state: string;
      labels: string[];
    }>;
  };
}

export interface OrchestratorJobData {
  userId: string;
  forceResume: boolean;
}

export interface RepoSyncJobData {
  userId: string;
  repositoryId: string;
  fullName: string;
  accessToken: string;
  since: string | null;
  forceResume: boolean;
}

export interface ThresholdCheckJobData {
  userId: string;
  forceResume: boolean;
}

export interface ResumeIncrementalJobData {
  userId: string;
}

import type { GithubSyncStatus } from '../../common/enums/index.js';

export interface SyncStatusResponse {
  status: GithubSyncStatus;
  totalRepos: number;
  completedRepos: number;
  failedRepos: number;
  startedAt: string | null;
}
```

Note: Move the `GithubSyncStatus` import to the top of the file when creating it. The type references the enum from `enums/index.ts`.

- [ ] **Step 3: Commit**

```bash
cd /Users/kyle/workspace/Personal/talenttee && git add backend/src/common/enums/index.ts backend/src/datasource/github/github-sync.types.ts && git commit -m "feat: add GitHub sync enums and type definitions"
```

---

### Task 3: Create Entity Files (6 tables)

**Files:**
- Create: `backend/src/datasource/entities/github-repository.entity.ts`
- Create: `backend/src/datasource/entities/github-commit.entity.ts`
- Create: `backend/src/datasource/entities/github-pull-request.entity.ts`
- Create: `backend/src/datasource/entities/github-issue.entity.ts`
- Create: `backend/src/datasource/entities/github-sync-cursor.entity.ts`
- Create: `backend/src/datasource/entities/resume-sync-checkpoint.entity.ts`

- [ ] **Step 1: Create `github-repository.entity.ts`**

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { User } from '../../entities/user.entity.js';

@Entity('github_repository')
export class GithubRepository {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'github_repo_id', type: 'bigint' })
  githubRepoId: string;

  @Column({ name: 'full_name', type: 'varchar', length: 256 })
  fullName: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  language: string;

  @Column({ name: 'is_private', type: 'boolean', default: false })
  isPrivate: boolean;

  @Column({ name: 'stars_count', type: 'int', default: 0 })
  starsCount: number;

  @Column({ name: 'forks_count', type: 'int', default: 0 })
  forksCount: number;

  @Column({ type: 'text', array: true, nullable: true })
  topics: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'synced_at', type: 'timestamptz', nullable: true })
  syncedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
```

- [ ] **Step 2: Create `github-commit.entity.ts`**

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { GithubRepository } from './github-repository.entity.js';

@Entity('github_commit')
export class GithubCommit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'repository_id', type: 'uuid' })
  repositoryId: string;

  @ManyToOne(() => GithubRepository)
  @JoinColumn({ name: 'repository_id' })
  repository: GithubRepository;

  @Column({ type: 'varchar', length: 40, unique: true })
  sha: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ name: 'author_name', type: 'varchar', length: 128, nullable: true })
  authorName: string;

  @Column({ name: 'author_email', type: 'varchar', length: 256, nullable: true })
  authorEmail: string;

  @Column({ name: 'authored_at', type: 'timestamptz', nullable: true })
  authoredAt: Date;

  @Column({ type: 'int', nullable: true })
  additions: number;

  @Column({ type: 'int', nullable: true })
  deletions: number;

  @Column({ name: 'files_changed', type: 'int', nullable: true })
  filesChanged: number;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData: Record<string, any>;
}
```

- [ ] **Step 3: Create `github-pull-request.entity.ts`**

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { GithubRepository } from './github-repository.entity.js';

@Entity('github_pull_request')
@Unique(['repositoryId', 'githubPrNumber'])
export class GithubPullRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'repository_id', type: 'uuid' })
  repositoryId: string;

  @ManyToOne(() => GithubRepository)
  @JoinColumn({ name: 'repository_id' })
  repository: GithubRepository;

  @Column({ name: 'github_pr_number', type: 'int' })
  githubPrNumber: number;

  @Column({ type: 'varchar', length: 512, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ type: 'varchar', length: 16 })
  state: string;

  @Column({ name: 'is_merged', type: 'boolean', default: false })
  isMerged: boolean;

  @Column({ type: 'int', nullable: true })
  additions: number;

  @Column({ type: 'int', nullable: true })
  deletions: number;

  @Column({ name: 'changed_files', type: 'int', nullable: true })
  changedFiles: number;

  @Column({ name: 'created_at', type: 'timestamptz', nullable: true })
  createdAt: Date;

  @Column({ name: 'merged_at', type: 'timestamptz', nullable: true })
  mergedAt: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData: Record<string, any>;
}
```

- [ ] **Step 4: Create `github-issue.entity.ts`**

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { GithubRepository } from './github-repository.entity.js';

@Entity('github_issue')
@Unique(['repositoryId', 'githubIssueNumber'])
export class GithubIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'repository_id', type: 'uuid' })
  repositoryId: string;

  @ManyToOne(() => GithubRepository)
  @JoinColumn({ name: 'repository_id' })
  repository: GithubRepository;

  @Column({ name: 'github_issue_number', type: 'int' })
  githubIssueNumber: number;

  @Column({ type: 'varchar', length: 512, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ type: 'varchar', length: 16 })
  state: string;

  @Column({ type: 'text', array: true, nullable: true })
  labels: string[];

  @Column({ name: 'created_at', type: 'timestamptz', nullable: true })
  createdAt: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date;

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData: Record<string, any>;
}
```

- [ ] **Step 5: Create `github-sync-cursor.entity.ts`**

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn, Unique,
} from 'typeorm';
import { GithubRepository } from './github-repository.entity.js';
import { GithubSyncResourceType } from '../../common/enums/index.js';

@Entity('github_sync_cursor')
@Unique(['repositoryId', 'resourceType'])
export class GithubSyncCursor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'repository_id', type: 'uuid' })
  repositoryId: string;

  @ManyToOne(() => GithubRepository)
  @JoinColumn({ name: 'repository_id' })
  repository: GithubRepository;

  @Column({ name: 'resource_type', type: 'varchar', length: 16 })
  resourceType: GithubSyncResourceType;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date;

  @Column({ name: 'last_page', type: 'int', nullable: true })
  lastPage: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  etag: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

- [ ] **Step 6: Create `resume-sync-checkpoint.entity.ts`**

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../entities/user.entity.js';

@Entity('resume_sync_checkpoint')
export class ResumeSyncCheckpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'last_commit_synced_at', type: 'timestamptz', nullable: true })
  lastCommitSyncedAt: Date;

  @Column({ name: 'last_pr_synced_at', type: 'timestamptz', nullable: true })
  lastPrSyncedAt: Date;

  @Column({ name: 'last_issue_synced_at', type: 'timestamptz', nullable: true })
  lastIssueSyncedAt: Date;

  @Column({ name: 'pending_commits', type: 'int', default: 0 })
  pendingCommits: number;

  @Column({ name: 'pending_prs', type: 'int', default: 0 })
  pendingPrs: number;

  @Column({ name: 'pending_issues', type: 'int', default: 0 })
  pendingIssues: number;

  @Column({ name: 'resume_updated_at', type: 'timestamptz', nullable: true })
  resumeUpdatedAt: Date;
}
```

- [ ] **Step 7: Commit**

```bash
cd /Users/kyle/workspace/Personal/talenttee && git add backend/src/datasource/entities/ && git commit -m "feat: add 6 GitHub sync entity files (repository, commit, PR, issue, cursor, checkpoint)"
```

---

### Task 4: GitHub API Client

**Files:**
- Create: `backend/src/datasource/github/github-api.client.ts`

- [ ] **Step 1: Create `github-api.client.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GitHubApiOptions {
  token: string;
  path: string;
  params?: Record<string, string>;
}

@Injectable()
export class GitHubApiClient {
  private readonly logger = new Logger(GitHubApiClient.name);
  private readonly baseUrl = 'https://api.github.com';
  private readonly apiVersion = '2022-11-28';

  constructor(private readonly config: ConfigService) {}

  async get<T>(options: GitHubApiOptions): Promise<T> {
    const url = new URL(`${this.baseUrl}${options.path}`);
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url.searchParams.set(key, value);
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${options.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': this.apiVersion,
      },
    });

    await this.handleRateLimit(res);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub API ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  async getAllPages<T>(options: GitHubApiOptions & { maxPages?: number }): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    const maxPages = options.maxPages ?? 100;

    while (page <= maxPages) {
      const url = new URL(`${this.baseUrl}${options.path}`);
      url.searchParams.set('per_page', '100');
      url.searchParams.set('page', String(page));
      if (options.params) {
        for (const [key, value] of Object.entries(options.params)) {
          url.searchParams.set(key, value);
        }
      }

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${options.token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': this.apiVersion,
        },
      });

      await this.handleRateLimit(res);

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`GitHub API ${res.status}: ${body}`);
      }

      const items = (await res.json()) as T[];
      if (items.length === 0) break;

      allItems.push(...items);

      const linkHeader = res.headers.get('link');
      if (!linkHeader || !linkHeader.includes('rel="next"')) break;

      page++;
    }

    return allItems;
  }

  async getUser(token: string): Promise<{ login: string; id: number; name: string; bio: string; public_repos: number; followers: number }> {
    return this.get({ token, path: '/user' });
  }

  async getRepos(token: string): Promise<any[]> {
    return this.getAllPages({
      token,
      path: '/user/repos',
      params: { type: 'owner', sort: 'pushed' },
    });
  }

  async getCommits(token: string, fullName: string, since?: string): Promise<any[]> {
    const params: Record<string, string> = {};
    if (since) params.since = since;
    return this.getAllPages({ token, path: `/repos/${fullName}/commits`, params });
  }

  async getPullRequests(token: string, fullName: string, since?: string): Promise<any[]> {
    const params: Record<string, string> = { state: 'all', sort: 'created', direction: 'desc' };
    if (since) params.since = since;
    return this.getAllPages({ token, path: `/repos/${fullName}/pulls`, params });
  }

  async getIssues(token: string, fullName: string, since?: string): Promise<any[]> {
    const params: Record<string, string> = { state: 'all', sort: 'created', direction: 'desc' };
    if (since) params.since = since;
    return this.getAllPages({ token, path: `/repos/${fullName}/issues`, params });
  }

  private async handleRateLimit(res: Response): Promise<void> {
    const remaining = parseInt(res.headers.get('x-ratelimit-remaining') ?? '999', 10);
    const resetAt = parseInt(res.headers.get('x-ratelimit-reset') ?? '0', 10);

    if (remaining < 100 && resetAt > 0) {
      const waitMs = Math.max(0, resetAt * 1000 - Date.now()) + 1000;
      this.logger.warn(`Rate limit low (${remaining} remaining), waiting ${Math.round(waitMs / 1000)}s`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    if (res.status === 403 && remaining === 0) {
      const waitMs = Math.max(0, resetAt * 1000 - Date.now()) + 1000;
      this.logger.warn(`Rate limited, waiting ${Math.round(waitMs / 1000)}s until reset`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      throw new Error('RATE_LIMITED');
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kyle/workspace/Personal/talenttee && git add backend/src/datasource/github/github-api.client.ts && git commit -m "feat: add GitHubApiClient with pagination and rate limit handling"
```

---

### Task 5: GitHub Sync Service

**Files:**
- Create: `backend/src/datasource/github/github-sync.service.ts`

- [ ] **Step 1: Create `github-sync.service.ts`**

```typescript
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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
import { DataSourceProvider, DataSourceStatus, GithubSyncResourceType } from '../../common/enums/index.js';
import type { GitHubActivityForAI, OrchestratorJobData, SyncStatusResponse } from './github-sync.types.js';
import { GithubSyncStatus } from '../../common/enums/index.js';

@Injectable()
export class GitHubSyncService {
  private readonly logger = new Logger(GitHubSyncService.name);

  constructor(
    @InjectRepository(GithubRepository)
    private readonly repoRepo: Repository<GithubRepository>,
    @InjectRepository(GithubCommit)
    private readonly commitRepo: Repository<GithubCommit>,
    @InjectRepository(GithubPullRequest)
    private readonly prRepo: Repository<GithubPullRequest>,
    @InjectRepository(GithubIssue)
    private readonly issueRepo: Repository<GithubIssue>,
    @InjectRepository(GithubSyncCursor)
    private readonly cursorRepo: Repository<GithubSyncCursor>,
    @InjectRepository(ResumeSyncCheckpoint)
    private readonly checkpointRepo: Repository<ResumeSyncCheckpoint>,
    @InjectRepository(DataSourceConnection)
    private readonly dsConnRepo: Repository<DataSourceConnection>,
    @InjectQueue('github-sync-orchestrator')
    private readonly orchestratorQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async startSync(userId: string, forceResume = false): Promise<{ jobId: string }> {
    const conn = await this.dsConnRepo.findOne({
      where: { userId, provider: DataSourceProvider.GITHUB, status: DataSourceStatus.CONNECTED },
    });
    if (!conn?.accessToken) {
      throw new NotFoundException('GitHub not connected');
    }

    const job = await this.orchestratorQueue.add('orchestrate', {
      userId,
      forceResume,
    } satisfies OrchestratorJobData);

    return { jobId: job.id! };
  }

  async getSyncStatus(userId: string): Promise<SyncStatusResponse> {
    const repos = await this.repoRepo.find({ where: { userId } });
    const jobs = await this.orchestratorQueue.getJobs(['active', 'waiting', 'completed', 'failed']);
    const userJob = jobs.find((j) => j.data?.userId === userId);

    if (!userJob) {
      return {
        status: GithubSyncStatus.COMPLETED,
        totalRepos: repos.length,
        completedRepos: repos.length,
        failedRepos: 0,
        startedAt: null,
      };
    }

    const state = await userJob.getState();
    let status: GithubSyncStatus;
    if (state === 'active') status = GithubSyncStatus.IN_PROGRESS;
    else if (state === 'completed') status = GithubSyncStatus.COMPLETED;
    else if (state === 'failed') status = GithubSyncStatus.FAILED;
    else status = GithubSyncStatus.PENDING;

    return {
      status,
      totalRepos: repos.filter((r) => r.isActive).length,
      completedRepos: userJob.returnvalue?.completedRepos ?? 0,
      failedRepos: userJob.returnvalue?.failedRepos ?? 0,
      startedAt: userJob.timestamp ? new Date(userJob.timestamp).toISOString() : null,
    };
  }

  async getRepos(userId: string): Promise<GithubRepository[]> {
    return this.repoRepo.find({ where: { userId }, order: { fullName: 'ASC' } });
  }

  async toggleRepo(userId: string, repoId: string, isActive: boolean): Promise<GithubRepository> {
    const repo = await this.repoRepo.findOne({ where: { id: repoId, userId } });
    if (!repo) throw new NotFoundException('Repository not found');
    repo.isActive = isActive;
    return this.repoRepo.save(repo);
  }

  async buildActivityForAI(userId: string): Promise<GitHubActivityForAI> {
    const repos = await this.repoRepo.find({ where: { userId, isActive: true } });
    if (repos.length === 0) {
      return {
        profile: { username: '', totalRepos: 0, activeRepos: [] },
        languageStats: {},
        commits: { total: 0, recentMessages: [], statsByRepo: {} },
        pullRequests: { total: 0, merged: 0, items: [] },
        issues: { total: 0, closed: 0, items: [] },
      };
    }

    const repoIds = repos.map((r) => r.id);
    const repoMap = new Map(repos.map((r) => [r.id, r]));

    const [commits, prs, issues] = await Promise.all([
      this.commitRepo.find({ where: { repositoryId: In(repoIds) }, order: { authoredAt: 'DESC' } }),
      this.prRepo.find({ where: { repositoryId: In(repoIds) }, order: { createdAt: 'DESC' } }),
      this.issueRepo.find({ where: { repositoryId: In(repoIds) }, order: { createdAt: 'DESC' } }),
    ]);

    // Language stats
    const languageStats: Record<string, { repoCount: number; commitCount: number }> = {};
    for (const repo of repos) {
      if (!repo.language) continue;
      if (!languageStats[repo.language]) {
        languageStats[repo.language] = { repoCount: 0, commitCount: 0 };
      }
      languageStats[repo.language].repoCount++;
      languageStats[repo.language].commitCount += commits.filter(
        (c) => c.repositoryId === repo.id,
      ).length;
    }

    // Commit stats by repo
    const statsByRepo: Record<string, { count: number; additions: number; deletions: number }> = {};
    for (const c of commits) {
      const repoName = repoMap.get(c.repositoryId)?.fullName ?? 'unknown';
      if (!statsByRepo[repoName]) {
        statsByRepo[repoName] = { count: 0, additions: 0, deletions: 0 };
      }
      statsByRepo[repoName].count++;
      statsByRepo[repoName].additions += c.additions ?? 0;
      statsByRepo[repoName].deletions += c.deletions ?? 0;
    }

    // Get username from DataSourceConnection or first commit
    const conn = await this.dsConnRepo.findOne({
      where: { userId, provider: DataSourceProvider.GITHUB },
    });

    return {
      profile: {
        username: commits[0]?.authorName ?? '',
        totalRepos: repos.length,
        activeRepos: repos.map((r) => r.fullName),
      },
      languageStats,
      commits: {
        total: commits.length,
        recentMessages: commits.slice(0, 50).map((c) => c.message).filter(Boolean) as string[],
        statsByRepo,
      },
      pullRequests: {
        total: prs.length,
        merged: prs.filter((p) => p.isMerged).length,
        items: prs.slice(0, 100).map((p) => ({
          repo: repoMap.get(p.repositoryId)?.fullName ?? 'unknown',
          title: p.title ?? '',
          state: p.state,
          createdAt: p.createdAt?.toISOString() ?? '',
          mergedAt: p.mergedAt?.toISOString() ?? null,
        })),
      },
      issues: {
        total: issues.length,
        closed: issues.filter((i) => i.state === 'closed').length,
        items: issues.slice(0, 100).map((i) => ({
          repo: repoMap.get(i.repositoryId)?.fullName ?? 'unknown',
          title: i.title ?? '',
          state: i.state,
          labels: i.labels ?? [],
        })),
      },
    };
  }

  async getOrCreateCheckpoint(userId: string): Promise<ResumeSyncCheckpoint> {
    let checkpoint = await this.checkpointRepo.findOne({ where: { userId } });
    if (!checkpoint) {
      checkpoint = this.checkpointRepo.create({ userId });
      checkpoint = await this.checkpointRepo.save(checkpoint);
    }
    return checkpoint;
  }

  async countPendingData(userId: string): Promise<{ pendingCommits: number; pendingPrs: number; pendingIssues: number }> {
    const checkpoint = await this.getOrCreateCheckpoint(userId);
    const repos = await this.repoRepo.find({ where: { userId, isActive: true } });
    const repoIds = repos.map((r) => r.id);
    if (repoIds.length === 0) return { pendingCommits: 0, pendingPrs: 0, pendingIssues: 0 };

    const [pendingCommits, pendingPrs, pendingIssues] = await Promise.all([
      checkpoint.lastCommitSyncedAt
        ? this.commitRepo.count({ where: { repositoryId: In(repoIds), authoredAt: MoreThan(checkpoint.lastCommitSyncedAt) } })
        : this.commitRepo.count({ where: { repositoryId: In(repoIds) } }),
      checkpoint.lastPrSyncedAt
        ? this.prRepo.count({ where: { repositoryId: In(repoIds), createdAt: MoreThan(checkpoint.lastPrSyncedAt) } })
        : this.prRepo.count({ where: { repositoryId: In(repoIds) } }),
      checkpoint.lastIssueSyncedAt
        ? this.issueRepo.count({ where: { repositoryId: In(repoIds), createdAt: MoreThan(checkpoint.lastIssueSyncedAt) } })
        : this.issueRepo.count({ where: { repositoryId: In(repoIds) } }),
    ]);

    // Update checkpoint pending counts
    await this.checkpointRepo.update(checkpoint.id, { pendingCommits, pendingPrs, pendingIssues });

    return { pendingCommits, pendingPrs, pendingIssues };
  }

  async updateCheckpointAfterResume(userId: string): Promise<void> {
    const checkpoint = await this.getOrCreateCheckpoint(userId);
    const now = new Date();
    await this.checkpointRepo.update(checkpoint.id, {
      lastCommitSyncedAt: now,
      lastPrSyncedAt: now,
      lastIssueSyncedAt: now,
      pendingCommits: 0,
      pendingPrs: 0,
      pendingIssues: 0,
      resumeUpdatedAt: now,
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kyle/workspace/Personal/talenttee && git add backend/src/datasource/github/github-sync.service.ts && git commit -m "feat: add GitHubSyncService with sync orchestration and buildActivityForAI"
```

---

### Task 6: BullMQ Processor (Workers)

**Files:**
- Create: `backend/src/datasource/github/github-sync.processor.ts`

- [ ] **Step 1: Create `github-sync.processor.ts`**

```typescript
import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { GitHubApiClient } from './github-api.client.js';
import { GitHubSyncService } from './github-sync.service.js';
import { GithubRepository } from '../entities/github-repository.entity.js';
import { GithubCommit } from '../entities/github-commit.entity.js';
import { GithubPullRequest } from '../entities/github-pull-request.entity.js';
import { GithubIssue } from '../entities/github-issue.entity.js';
import { GithubSyncCursor } from '../entities/github-sync-cursor.entity.js';
import { DataSourceConnection } from '../../entities/data-source-connection.entity.js';
import { DataSourceProvider, DataSourceStatus, GithubSyncResourceType } from '../../common/enums/index.js';
import type {
  OrchestratorJobData, RepoSyncJobData, ThresholdCheckJobData, ResumeIncrementalJobData,
} from './github-sync.types.js';

@Processor('github-sync-orchestrator')
export class GithubSyncOrchestratorProcessor extends WorkerHost {
  private readonly logger = new Logger(GithubSyncOrchestratorProcessor.name);

  constructor(
    private readonly githubApi: GitHubApiClient,
    @InjectRepository(GithubRepository)
    private readonly repoRepo: Repository<GithubRepository>,
    @InjectRepository(DataSourceConnection)
    private readonly dsConnRepo: Repository<DataSourceConnection>,
    @InjectQueue('github-sync')
    private readonly syncQueue: Queue,
    @InjectQueue('resume-update')
    private readonly resumeQueue: Queue,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<OrchestratorJobData>): Promise<{ completedRepos: number; failedRepos: number }> {
    const { userId, forceResume } = job.data;
    this.logger.log(`Starting sync orchestration for user ${userId}`);

    const conn = await this.dsConnRepo.findOne({
      where: { userId, provider: DataSourceProvider.GITHUB, status: DataSourceStatus.CONNECTED },
    });
    if (!conn?.accessToken) throw new Error('GitHub not connected');

    // 1. Get user info
    const ghUser = await this.githubApi.getUser(conn.accessToken);
    this.logger.log(`GitHub user: ${ghUser.login}`);

    // 2. Get repos
    const ghRepos = await this.githubApi.getRepos(conn.accessToken);
    this.logger.log(`Found ${ghRepos.length} repos`);

    // 3. Upsert repos in DB
    for (const ghRepo of ghRepos) {
      const existing = await this.repoRepo.findOne({
        where: { userId, githubRepoId: String(ghRepo.id) },
      });
      if (existing) {
        existing.fullName = ghRepo.full_name;
        existing.name = ghRepo.name;
        existing.description = ghRepo.description;
        existing.language = ghRepo.language;
        existing.isPrivate = ghRepo.private;
        existing.starsCount = ghRepo.stargazers_count ?? 0;
        existing.forksCount = ghRepo.forks_count ?? 0;
        existing.topics = ghRepo.topics ?? [];
        await this.repoRepo.save(existing);
      } else {
        const newRepo = this.repoRepo.create({
          userId,
          githubRepoId: String(ghRepo.id),
          fullName: ghRepo.full_name,
          name: ghRepo.name,
          description: ghRepo.description,
          language: ghRepo.language,
          isPrivate: ghRepo.private,
          starsCount: ghRepo.stargazers_count ?? 0,
          forksCount: ghRepo.forks_count ?? 0,
          topics: ghRepo.topics ?? [],
          isActive: true,
        });
        await this.repoRepo.save(newRepo);
      }
    }

    // 4. Queue RepoSyncJobs for active repos
    const activeRepos = await this.repoRepo.find({ where: { userId, isActive: true } });
    const daysLimit = this.config.get<number>('GITHUB_SYNC_DAYS_LIMIT', 10);
    const globalSince = daysLimit > 0
      ? new Date(Date.now() - daysLimit * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const repoJobs = activeRepos.map((repo) => ({
      name: 'repo-sync',
      data: {
        userId,
        repositoryId: repo.id,
        fullName: repo.fullName,
        accessToken: conn.accessToken,
        since: globalSince,
        forceResume,
      } satisfies RepoSyncJobData,
      opts: {
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 60_000 },
      },
    }));

    if (repoJobs.length > 0) {
      const addedJobs = await this.syncQueue.addBulk(repoJobs);

      // Wait for all repo sync jobs to complete
      await Promise.allSettled(
        addedJobs.map((j) => j.waitUntilFinished(
          await this.syncQueue.events,
          5 * 60 * 1000, // 5 min timeout per repo
        )),
      );
    }

    // 5. Queue threshold check
    await this.resumeQueue.add('threshold-check', {
      userId,
      forceResume,
    } satisfies ThresholdCheckJobData);

    const completedRepos = activeRepos.length;
    this.logger.log(`Sync orchestration complete for user ${userId}: ${completedRepos} repos`);
    return { completedRepos, failedRepos: 0 };
  }
}

@Processor('github-sync')
export class GithubRepoSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(GithubRepoSyncProcessor.name);

  constructor(
    private readonly githubApi: GitHubApiClient,
    @InjectRepository(GithubCommit)
    private readonly commitRepo: Repository<GithubCommit>,
    @InjectRepository(GithubPullRequest)
    private readonly prRepo: Repository<GithubPullRequest>,
    @InjectRepository(GithubIssue)
    private readonly issueRepo: Repository<GithubIssue>,
    @InjectRepository(GithubSyncCursor)
    private readonly cursorRepo: Repository<GithubSyncCursor>,
    @InjectRepository(GithubRepository)
    private readonly repoRepo: Repository<GithubRepository>,
  ) {
    super();
  }

  async process(job: Job<RepoSyncJobData>): Promise<void> {
    const { repositoryId, fullName, accessToken, since } = job.data;
    this.logger.log(`Syncing repo: ${fullName}`);

    // Get or use since from cursor
    const effectiveSince = await this.getEffectiveSince(repositoryId, since);

    // Sync commits → PRs → issues sequentially
    await this.syncCommits(repositoryId, fullName, accessToken, effectiveSince);
    await this.syncPullRequests(repositoryId, fullName, accessToken, effectiveSince);
    await this.syncIssues(repositoryId, fullName, accessToken, effectiveSince);

    // Update repo synced_at
    await this.repoRepo.update(repositoryId, { syncedAt: new Date() });

    this.logger.log(`Sync complete for repo: ${fullName}`);
  }

  private async getEffectiveSince(repositoryId: string, globalSince: string | null): Promise<string | null> {
    const cursors = await this.cursorRepo.find({ where: { repositoryId } });
    if (cursors.length === 0) return globalSince;

    // Use the oldest cursor as since (to not miss anything)
    const oldestCursorDate = cursors
      .map((c) => c.lastSyncedAt)
      .filter(Boolean)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    if (!oldestCursorDate) return globalSince;
    if (!globalSince) return oldestCursorDate.toISOString();

    // Use whichever is more recent (cursor or global since)
    return new Date(Math.max(oldestCursorDate.getTime(), new Date(globalSince).getTime())).toISOString();
  }

  private async syncCommits(repositoryId: string, fullName: string, token: string, since: string | null): Promise<void> {
    const commits = await this.githubApi.getCommits(token, fullName, since ?? undefined);
    this.logger.log(`Fetched ${commits.length} commits from ${fullName}`);

    for (const c of commits) {
      const existing = await this.commitRepo.findOne({ where: { sha: c.sha } });
      if (existing) continue;

      const commit = this.commitRepo.create({
        repositoryId,
        sha: c.sha,
        message: c.commit?.message,
        authorName: c.commit?.author?.name,
        authorEmail: c.commit?.author?.email,
        authoredAt: c.commit?.author?.date ? new Date(c.commit.author.date) : null,
        additions: c.stats?.additions,
        deletions: c.stats?.deletions,
        filesChanged: c.stats?.total,
        rawData: c,
      });
      await this.commitRepo.save(commit);
    }

    await this.updateCursor(repositoryId, GithubSyncResourceType.COMMIT);
  }

  private async syncPullRequests(repositoryId: string, fullName: string, token: string, since: string | null): Promise<void> {
    let prs = await this.githubApi.getPullRequests(token, fullName, since ?? undefined);

    // Filter PRs by since date if provided (GitHub pulls API doesn't support since param natively)
    if (since) {
      const sinceDate = new Date(since);
      prs = prs.filter((p: any) => new Date(p.created_at) >= sinceDate);
    }

    this.logger.log(`Fetched ${prs.length} PRs from ${fullName}`);

    for (const p of prs) {
      const existing = await this.prRepo.findOne({
        where: { repositoryId, githubPrNumber: p.number },
      });
      if (existing) {
        // Update state in case it changed
        existing.state = p.merged_at ? 'merged' : p.state;
        existing.isMerged = !!p.merged_at;
        existing.mergedAt = p.merged_at ? new Date(p.merged_at) : null;
        existing.closedAt = p.closed_at ? new Date(p.closed_at) : null;
        existing.rawData = p;
        await this.prRepo.save(existing);
        continue;
      }

      const pr = this.prRepo.create({
        repositoryId,
        githubPrNumber: p.number,
        title: p.title,
        body: p.body,
        state: p.merged_at ? 'merged' : p.state,
        isMerged: !!p.merged_at,
        additions: p.additions,
        deletions: p.deletions,
        changedFiles: p.changed_files,
        createdAt: p.created_at ? new Date(p.created_at) : null,
        mergedAt: p.merged_at ? new Date(p.merged_at) : null,
        closedAt: p.closed_at ? new Date(p.closed_at) : null,
        rawData: p,
      });
      await this.prRepo.save(pr);
    }

    await this.updateCursor(repositoryId, GithubSyncResourceType.PULL_REQUEST);
  }

  private async syncIssues(repositoryId: string, fullName: string, token: string, since: string | null): Promise<void> {
    const allIssues = await this.githubApi.getIssues(token, fullName, since ?? undefined);

    // Filter out pull requests (GitHub API returns PRs in issues endpoint)
    const issues = allIssues.filter((i: any) => !i.pull_request);

    this.logger.log(`Fetched ${issues.length} issues from ${fullName}`);

    for (const i of issues) {
      const existing = await this.issueRepo.findOne({
        where: { repositoryId, githubIssueNumber: i.number },
      });
      if (existing) {
        existing.state = i.state;
        existing.closedAt = i.closed_at ? new Date(i.closed_at) : null;
        existing.rawData = i;
        await this.issueRepo.save(existing);
        continue;
      }

      const issue = this.issueRepo.create({
        repositoryId,
        githubIssueNumber: i.number,
        title: i.title,
        body: i.body,
        state: i.state,
        labels: (i.labels ?? []).map((l: any) => (typeof l === 'string' ? l : l.name)),
        createdAt: i.created_at ? new Date(i.created_at) : null,
        closedAt: i.closed_at ? new Date(i.closed_at) : null,
        rawData: i,
      });
      await this.issueRepo.save(issue);
    }

    await this.updateCursor(repositoryId, GithubSyncResourceType.ISSUE);
  }

  private async updateCursor(repositoryId: string, resourceType: GithubSyncResourceType): Promise<void> {
    let cursor = await this.cursorRepo.findOne({ where: { repositoryId, resourceType } });
    if (!cursor) {
      cursor = this.cursorRepo.create({ repositoryId, resourceType });
    }
    cursor.lastSyncedAt = new Date();
    cursor.lastPage = null as any;
    await this.cursorRepo.save(cursor);
  }
}

@Processor('resume-update')
export class ResumeUpdateProcessor extends WorkerHost {
  private readonly logger = new Logger(ResumeUpdateProcessor.name);

  constructor(
    private readonly syncService: GitHubSyncService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<ThresholdCheckJobData | ResumeIncrementalJobData>): Promise<void> {
    if (job.name === 'threshold-check') {
      await this.processThresholdCheck(job as Job<ThresholdCheckJobData>);
    }
    // ResumeIncrementalUpdateJob is handled by resume.service.ts directly
    // via the existing pipeline, triggered from threshold check
  }

  private async processThresholdCheck(job: Job<ThresholdCheckJobData>): Promise<void> {
    const { userId, forceResume } = job.data;
    this.logger.log(`Checking thresholds for user ${userId}`);

    const { pendingCommits, pendingPrs, pendingIssues } = await this.syncService.countPendingData(userId);

    const thresholdCommits = this.config.get<number>('RESUME_THRESHOLD_COMMITS', 20);
    const thresholdPrs = this.config.get<number>('RESUME_THRESHOLD_PRS', 3);
    const thresholdIssues = this.config.get<number>('RESUME_THRESHOLD_ISSUES', 5);

    const shouldUpdate = forceResume
      || pendingCommits >= thresholdCommits
      || pendingPrs >= thresholdPrs
      || pendingIssues >= thresholdIssues;

    if (shouldUpdate) {
      this.logger.log(
        `Threshold exceeded for user ${userId}: commits=${pendingCommits}, prs=${pendingPrs}, issues=${pendingIssues}. Triggering resume update.`,
      );
      // Emit event or directly call resume service
      // For now, we log — integration with resume service in Task 9
    } else {
      this.logger.log(
        `Below threshold for user ${userId}: commits=${pendingCommits}/${thresholdCommits}, prs=${pendingPrs}/${thresholdPrs}, issues=${pendingIssues}/${thresholdIssues}`,
      );
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kyle/workspace/Personal/talenttee && git add backend/src/datasource/github/github-sync.processor.ts && git commit -m "feat: add BullMQ processors for orchestrator, repo sync, and resume update"
```

---

### Task 7: Update DatasourceModule & Controller

**Files:**
- Modify: `backend/src/datasource/datasource.module.ts`
- Modify: `backend/src/datasource/datasource.controller.ts`
- Modify: `backend/src/datasource/datasource.service.ts`

- [ ] **Step 1: Update `datasource.module.ts`**

Replace the entire file:

```typescript
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
import { GitHubSyncService } from './github/github-sync.service.js';
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
    GitHubSyncService,
    GithubSyncOrchestratorProcessor,
    GithubRepoSyncProcessor,
    ResumeUpdateProcessor,
  ],
  exports: [DatasourceService, GitHubSyncService],
})
export class DatasourceModule {}
```

- [ ] **Step 2: Add BullMQ global registration to `backend/src/app.module.ts`**

Add import for `BullModule` from `@nestjs/bullmq` and register it in the imports array, before `DatasourceModule`:

```typescript
import { BullModule } from '@nestjs/bullmq';
```

Add to the `imports` array after `TypeOrmModule.forRoot(...)`:

```typescript
BullModule.forRoot({
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
}),
```

- [ ] **Step 3: Add cron registration to `GitHubSyncService`**

In `github-sync.service.ts`, add an `onModuleInit` lifecycle hook to register daily cron sync for all connected users. Add `implements OnModuleInit` to the class and import `OnModuleInit` from `@nestjs/common`:

```typescript
async onModuleInit(): Promise<void> {
  // Register daily sync cron for all users with connected GitHub
  const connections = await this.dsConnRepo.find({
    where: { provider: DataSourceProvider.GITHUB, status: DataSourceStatus.CONNECTED },
  });
  for (const conn of connections) {
    await this.orchestratorQueue.add(
      'daily-sync',
      { userId: conn.userId, forceResume: false } satisfies OrchestratorJobData,
      {
        repeat: { pattern: '0 3 * * *' },
        jobId: `daily-sync-${conn.userId}`,
      },
    );
  }
  if (connections.length > 0) {
    this.logger.log(`Registered daily sync cron for ${connections.length} users`);
  }
}
```

Also register cron when a new sync is started for the first time (inside `startSync`, after successfully queuing):

```typescript
// Register cron if not already registered
await this.orchestratorQueue.add(
  'daily-sync',
  { userId, forceResume: false } satisfies OrchestratorJobData,
  {
    repeat: { pattern: '0 3 * * *' },
    jobId: `daily-sync-${userId}`,
  },
);
```

- [ ] **Step 4: Add GitHub sync endpoints to `datasource.controller.ts`**

Add these imports to the top of the file:

```typescript
import { GitHubSyncService } from './github/github-sync.service.js';
```

Add `private readonly githubSyncService: GitHubSyncService` to the constructor.

Add these methods to the controller class:

```typescript
@Post('github/sync')
@UseGuards(JwtGuard)
async startGithubSync(@Req() req, @Body() body: { forceResume?: boolean }) {
  const userId = req.user.id;
  return this.githubSyncService.startSync(userId, body.forceResume ?? false);
}

@Get('github/sync/status')
@UseGuards(JwtGuard)
async getGithubSyncStatus(@Req() req) {
  const userId = req.user.id;
  return this.githubSyncService.getSyncStatus(userId);
}

@Get('github/repos')
@UseGuards(JwtGuard)
async getGithubRepos(@Req() req) {
  const userId = req.user.id;
  return this.githubSyncService.getRepos(userId);
}

@Patch('github/repos/:repoId')
@UseGuards(JwtGuard)
async toggleGithubRepo(
  @Req() req,
  @Param('repoId') repoId: string,
  @Body() body: { isActive: boolean },
) {
  const userId = req.user.id;
  return this.githubSyncService.toggleRepo(userId, repoId, body.isActive);
}
```

Add `Patch` and `Param` to the `@nestjs/common` import.

- [ ] **Step 5: Update `datasource.service.ts` — collectAllData branch for CONNECTED GitHub**

Add import at top:

```typescript
import { GitHubSyncService } from './github/github-sync.service.js';
```

Add `private readonly githubSyncService: GitHubSyncService` to the constructor (inject via constructor parameter).

Replace the `collectAllData` method:

```typescript
async collectAllData(userId: string): Promise<{
  github: Record<string, any> | null;
  slack: Record<string, any> | null;
  discord: Record<string, any> | null;
  gov24: Record<string, any> | null;
}> {
  const connections = await this.getStatus(userId);
  const result: Record<string, any> = { github: null, slack: null, discord: null, gov24: null };

  for (const conn of connections) {
    const key = conn.provider.toLowerCase();
    if (conn.provider === DataSourceProvider.GITHUB && conn.status === DataSourceStatus.CONNECTED) {
      result[key] = await this.githubSyncService.buildActivityForAI(userId);
    } else {
      result[key] = this.loadFixture(conn.provider);
    }
  }

  return result as any;
}
```

- [ ] **Step 6: Commit**

```bash
cd /Users/kyle/workspace/Personal/talenttee && git add backend/src/datasource/datasource.module.ts backend/src/datasource/datasource.controller.ts backend/src/datasource/datasource.service.ts backend/src/app.module.ts backend/src/datasource/github/github-sync.service.ts && git commit -m "feat: wire up BullMQ, GitHub sync endpoints, cron, and collectAllData CONNECTED branch"
```

---

### Task 8: Add Incremental Resume Prompt

**Files:**
- Create: `backend/src/resume/prompts/resume-incremental.prompt.ts`
- Modify: `backend/src/resume/prompts/resume-generate.prompt.ts`

- [ ] **Step 1: Create `resume-incremental.prompt.ts`**

```typescript
export const RESUME_INCREMENTAL_PROMPT = `당신은 이력서 업데이트 전문가입니다.

기존 이력서와 새로운 GitHub 활동 데이터가 주어집니다.
새로운 활동을 분석하여 기존 이력서를 업데이트하세요.

## 규칙
1. 기존 이력서의 구조와 톤을 유지하세요.
2. 새 활동에서 드러나는 기술, 경험, 역할 변화를 반영하세요.
3. 기존 내용을 삭제하지 말고, 보완/확장하세요.
4. 새 기술 스택이 발견되면 skills에 추가하세요.
5. 의미 있는 PR/이슈는 experience의 highlights에 추가하세요.
6. 변경 없는 섹션은 그대로 유지하세요.

## 입력 형식
{
  "existingResume": { skills, experience, education, summary, strengths, improvement_areas },
  "newActivity": { commits, pullRequests, issues }
}

## 출력 형식 (JSON만, 다른 텍스트 없이)
{
  "skills": ["TypeScript", "React", ...],
  "experience": [
    { "role": "...", "company": "...", "period": "...", "highlights": ["..."] }
  ],
  "education": [
    { "degree": "...", "institution": "...", "year": "..." }
  ],
  "summary": "3줄 이내 요약",
  "strengths": ["...", "..."],
  "improvement_areas": ["...", "..."],
  "changelog": "이번 업데이트에서 변경된 내용 요약 (1-2문장)"
}`;
```

- [ ] **Step 2: Update `resume-generate.prompt.ts`**

Replace the entire file:

```typescript
export const RESUME_GENERATE_PROMPT = `당신은 커리어 분석 전문가입니다.
다음 데이터를 분석하여 구조화된 이력서를 생성하세요.

## 입력 데이터 설명
- github: GitHub 활동 (프로필, 언어 통계, 커밋, PR, 이슈)
- slack: Slack 메시지 및 분류 결과 (있는 경우)
- discord: Discord 커뮤니티 활동 (있는 경우)
- gov24: 자격증, 학력 (있는 경우)

## 분석 기준
1. GitHub 커밋 메시지와 PR 제목에서 기술 역량과 프로젝트 경험을 추출
2. 언어별 통계에서 주요 기술 스택 도출
3. PR 머지율, 이슈 해결율에서 협업 능력 평가
4. 레포 단위로 프로젝트 경험 구성

출력 형식 (JSON만, 다른 텍스트 없이):
{
  "skills": ["TypeScript", "React", ...],
  "experience": [
    { "role": "...", "company": "...", "period": "...", "highlights": ["..."] }
  ],
  "education": [
    { "degree": "...", "institution": "...", "year": "..." }
  ],
  "summary": "3줄 이내 요약",
  "strengths": ["...", "..."],
  "improvement_areas": ["...", "..."]
}`;
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kyle/workspace/Personal/talenttee && git add backend/src/resume/prompts/ && git commit -m "feat: add incremental resume prompt and update generate prompt for GitHubActivityForAI"
```

---

### Task 9: Integrate Resume Service with Incremental Updates

**Files:**
- Modify: `backend/src/resume/resume.service.ts`
- Modify: `backend/src/resume/resume.module.ts`

- [ ] **Step 1: Update `resume.module.ts` to import DatasourceModule entities**

Read the current file first, then add `GitHubSyncService` dependency. The `DatasourceModule` already exports `GitHubSyncService`, so `ResumeModule` which imports `DatasourceModule` (via the existing constructor injection of `DatasourceService`) should have access.

- [ ] **Step 2: Add incremental update method to `resume.service.ts`**

Add these imports at the top:

```typescript
import { RESUME_INCREMENTAL_PROMPT } from './prompts/resume-incremental.prompt.js';
import { GitHubSyncService } from '../datasource/github/github-sync.service.js';
```

Add `private readonly githubSyncService: GitHubSyncService` to the constructor.

Add the `generateIncremental` method:

```typescript
async generateIncremental(userId: string): Promise<ResumeProfile> {
  let resume = await this.resumeRepo.findOne({ where: { userId } });
  if (!resume || !resume.parsedData) {
    // No existing resume — fall back to full generation
    return this.generate(userId);
  }

  resume.status = ResumeStatus.ANALYZING;
  resume = await this.resumeRepo.save(resume);

  this.runIncrementalPipeline(resume.id, userId).catch((err) => {
    console.error(`Incremental resume pipeline failed for ${userId}:`, err);
  });

  return resume;
}

private async runIncrementalPipeline(resumeId: string, userId: string): Promise<void> {
  try {
    // 1. Get existing resume
    const resume = await this.resumeRepo.findOne({ where: { id: resumeId } });
    if (!resume) throw new Error('Resume not found');

    // 2. Build new activity data from DB
    const newActivity = await this.githubSyncService.buildActivityForAI(userId);

    // 3. Call AI with existing resume + new activity
    const incrementalResult = await this.aiClient.chat({
      agentId: 'resume-updater',
      systemPrompt: RESUME_INCREMENTAL_PROMPT,
      userMessage: JSON.stringify({
        existingResume: resume.parsedData,
        newActivity,
      }),
    });

    const parsed = this.safeJsonParse(incrementalResult.content);

    // 4. Update resume
    if (parsed) {
      await this.resumeRepo.update(resumeId, {
        parsedData: parsed,
        skills: parsed.skills ?? resume.skills,
        experience: parsed.experience ?? resume.experience,
        education: parsed.education ?? resume.education,
        summary: parsed.summary ?? resume.summary,
        negotiationPoints: {
          strengths: parsed.strengths ?? [],
          improvement_areas: parsed.improvement_areas ?? [],
        },
      });
    }

    // 5. Regenerate embedding
    const updatedResume = await this.resumeRepo.findOne({ where: { id: resumeId } });
    if (updatedResume) {
      const textForEmbed = this.buildResumeText(updatedResume);
      const embeddings = await this.aiClient.embed(textForEmbed);
      if (embeddings.length > 0) {
        await this.resumeRepo.update(resumeId, {
          embedding: JSON.stringify(embeddings[0]),
        });
      }

      // 6. Recalculate market value
      const marketResult = await this.aiClient.chat({
        agentId: 'market-value-analyst',
        systemPrompt: MARKET_VALUE_PROMPT,
        userMessage: textForEmbed,
      });
      const marketParsed = this.safeJsonParse(marketResult.content);
      if (marketParsed) {
        await this.resumeRepo.update(resumeId, {
          marketValueMin: marketParsed.marketValueMin,
          marketValueMax: marketParsed.marketValueMax,
          marketValueReasoning: marketParsed.reasoning,
          negotiationPoints: marketParsed.negotiationPoints,
        });
      }
    }

    // 7. Update checkpoint
    await this.githubSyncService.updateCheckpointAfterResume(userId);

    // 8. Mark complete
    await this.resumeRepo.update(resumeId, { status: ResumeStatus.COMPLETE });
  } catch (err) {
    await this.resumeRepo.update(resumeId, { status: ResumeStatus.ERROR });
    throw err;
  }
}
```

- [ ] **Step 3: Update the `generate` method to accept mode parameter**

Modify the `generate` method signature and add routing:

```typescript
async generate(userId: string, mode: 'full' | 'incremental' = 'full'): Promise<ResumeProfile> {
  if (mode === 'incremental') {
    return this.generateIncremental(userId);
  }
  // ... existing full generation logic unchanged
```

- [ ] **Step 4: Update resume controller to pass mode**

In `backend/src/resume/resume.controller.ts`, update the `generate` endpoint to accept a body parameter:

```typescript
@Post('generate')
@HttpCode(HttpStatus.ACCEPTED)
async generate(@Req() req, @Body() body: { mode?: 'incremental' | 'full' }) {
  const userId = req.user.id;
  const resume = await this.resumeService.generate(userId, body?.mode ?? 'full');
  return { resumeId: resume.id, status: resume.status };
}
```

- [ ] **Step 5: Wire threshold check to trigger incremental resume**

In `backend/src/datasource/github/github-sync.processor.ts`, update the `ResumeUpdateProcessor` to import and use `ResumeService`:

Add to imports:

```typescript
import { ResumeService } from '../../resume/resume.service.js';
```

Add `private readonly resumeService: ResumeService` to the `ResumeUpdateProcessor` constructor.

Update the `processThresholdCheck` method's `shouldUpdate` block:

```typescript
if (shouldUpdate) {
  this.logger.log(
    `Threshold exceeded for user ${userId}: commits=${pendingCommits}, prs=${pendingPrs}, issues=${pendingIssues}. Triggering resume update.`,
  );
  await this.resumeService.generateIncremental(userId);
}
```

Note: This creates a circular dependency (DatasourceModule ↔ ResumeModule). Resolve by using `forwardRef`:

In `datasource.module.ts`, add:
```typescript
import { forwardRef } from '@nestjs/common';
import { ResumeModule } from '../resume/resume.module.js';
```
Add `forwardRef(() => ResumeModule)` to the `imports` array.

In `resume.module.ts`, add:
```typescript
import { forwardRef } from '@nestjs/common';
import { DatasourceModule } from '../datasource/datasource.module.js';
```
Change `DatasourceModule` import to `forwardRef(() => DatasourceModule)`.

- [ ] **Step 6: Commit**

```bash
cd /Users/kyle/workspace/Personal/talenttee && git add backend/src/resume/ backend/src/datasource/ && git commit -m "feat: integrate incremental resume updates with threshold-based triggering"
```

---

### Task 10: Frontend — API Functions & Types

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add types to `frontend/src/lib/types.ts`**

Add at the end of the file:

```typescript
export interface GithubRepository {
  id: string;
  userId: string;
  fullName: string;
  name: string;
  description: string | null;
  language: string | null;
  isPrivate: boolean;
  starsCount: number;
  forksCount: number;
  topics: string[];
  isActive: boolean;
  syncedAt: string | null;
  createdAt: string;
}

export interface GithubSyncStatus {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  totalRepos: number;
  completedRepos: number;
  failedRepos: number;
  startedAt: string | null;
}
```

- [ ] **Step 2: Add API functions to `frontend/src/lib/api.ts`**

Add imports for the new types at the top (to the existing import line from `./types`):

```typescript
import { ..., GithubRepository, GithubSyncStatus } from './types';
```

Add these functions after the existing datasource functions:

```typescript
// === GitHub Sync ===
export async function getGithubRepos(): Promise<GithubRepository[]> {
  if (USE_DUMMY) return [];
  return apiFetch('/datasource/github/repos');
}

export async function toggleGithubRepo(repoId: string, isActive: boolean): Promise<GithubRepository> {
  return apiFetch(`/datasource/github/repos/${repoId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export async function startGithubSync(forceResume = false): Promise<{ jobId: string }> {
  return apiFetch('/datasource/github/sync', {
    method: 'POST',
    body: JSON.stringify({ forceResume }),
  });
}

export async function getGithubSyncStatus(): Promise<GithubSyncStatus> {
  return apiFetch('/datasource/github/sync/status');
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kyle/workspace/Personal/talenttee && git add frontend/src/lib/types.ts frontend/src/lib/api.ts && git commit -m "feat: add GitHub sync API functions and types to frontend"
```

---

### Task 11: Frontend — Repo Management UI

**Files:**
- Modify: `frontend/src/app/datasource/page.tsx`

- [ ] **Step 1: Update datasource page with GitHub repo management**

Read the current `frontend/src/app/datasource/page.tsx` first (already read above). After the GitHub card's connect/re-sync button, add a repo list section that appears when GitHub is connected.

Add these imports at the top:

```typescript
import { getGithubRepos, toggleGithubRepo, startGithubSync, getGithubSyncStatus } from '@/lib/api';
import type { GithubRepository, GithubSyncStatus } from '@/lib/types';
```

Add state variables inside the component:

```typescript
const [githubRepos, setGithubRepos] = useState<GithubRepository[]>([]);
const [syncStatus, setSyncStatus] = useState<GithubSyncStatus | null>(null);
const [syncing, setSyncing] = useState(false);
```

Add a useEffect to load repos when GitHub is connected:

```typescript
useEffect(() => {
  const githubConn = connections.find((c) => c.provider === 'GITHUB');
  if (githubConn && (githubConn.status === 'CONNECTED' || githubConn.status === 'MOCK')) {
    getGithubRepos().then(setGithubRepos).catch(console.error);
  }
}, [connections]);
```

Add sync handler:

```typescript
async function handleGithubSync(forceResume = false) {
  setSyncing(true);
  try {
    await startGithubSync(forceResume);
    // Poll sync status every 3 seconds
    const interval = setInterval(async () => {
      const status = await getGithubSyncStatus();
      setSyncStatus(status);
      if (status.status === 'COMPLETED' || status.status === 'FAILED') {
        clearInterval(interval);
        setSyncing(false);
        // Refresh repos after sync
        const repos = await getGithubRepos();
        setGithubRepos(repos);
      }
    }, 3000);
  } catch (err) {
    console.error('Sync failed:', err);
    setSyncing(false);
  }
}

async function handleToggleRepo(repoId: string, isActive: boolean) {
  try {
    const updated = await toggleGithubRepo(repoId, isActive);
    setGithubRepos((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  } catch (err) {
    console.error('Toggle failed:', err);
  }
}
```

Add the repo list UI after the provider grid (after the closing `</div>` of the grid). This renders below the cards when GitHub is connected:

```tsx
{/* GitHub Repo Management */}
{connections.some(
  (c) => c.provider === 'GITHUB' && (c.status === 'CONNECTED' || c.status === 'MOCK'),
) &&
  githubRepos.length > 0 && (
    <div className="rounded-2xl border border-border/10 bg-[#1a1919] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-[var(--font-manrope)] text-lg font-bold text-foreground">
            GitHub Repositories
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Select which repositories to include in your resume analysis.
          </p>
        </div>
        <button
          onClick={() => handleGithubSync(false)}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? (
            <>
              <span className="material-symbols-outlined text-base animate-spin">
                progress_activity
              </span>
              Syncing...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">sync</span>
              Sync Activity
            </>
          )}
        </button>
      </div>

      {/* Sync Progress */}
      {syncing && syncStatus && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Syncing repositories...</span>
            <span>
              {syncStatus.completedRepos}/{syncStatus.totalRepos}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#262626]">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${syncStatus.totalRepos > 0 ? (syncStatus.completedRepos / syncStatus.totalRepos) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Repo List */}
      <div className="space-y-2">
        {githubRepos.map((repo) => (
          <div
            key={repo.id}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#201f1f] hover:bg-[#262626] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => handleToggleRepo(repo.id, !repo.isActive)}
                className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                  repo.isActive
                    ? 'bg-primary border-primary'
                    : 'border-border/30 hover:border-border/60'
                }`}
              >
                {repo.isActive && (
                  <span className="material-symbols-outlined text-sm text-primary-foreground">
                    check
                  </span>
                )}
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {repo.fullName}
                </p>
                {repo.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {repo.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              {repo.language && (
                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-[#1a1919]">
                  {repo.language}
                </span>
              )}
              {repo.isPrivate && (
                <span className="material-symbols-outlined text-sm text-muted-foreground/60">
                  lock
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kyle/workspace/Personal/talenttee && git add frontend/src/app/datasource/page.tsx && git commit -m "feat: add GitHub repo management UI with sync progress and toggle"
```

---

### Task 12: Verify Build & Entity Registration

**Files:**
- Modify: `backend/src/config/database.config.ts` (if entities are not auto-loaded)

- [ ] **Step 1: Check entity registration**

Verify how entities are registered in `database.config.ts`. If using `entities: [...]` array, add the new entities. If using `autoLoadEntities: true` (NestJS + TypeORM pattern), no change needed.

```bash
cd /Users/kyle/workspace/Personal/talenttee/backend && grep -n "entities\|autoLoad" src/config/database.config.ts
```

If entities are listed manually, add all 6 new entities to the array.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/kyle/workspace/Personal/talenttee/backend && npx tsc --noEmit
```

Expected: No errors. Fix any type issues found.

- [ ] **Step 3: Verify frontend compiles**

```bash
cd /Users/kyle/workspace/Personal/talenttee/frontend && npx next build 2>&1 | head -30
```

Expected: Build succeeds.

- [ ] **Step 4: Start backend and verify tables are created**

Since the project uses `synchronize: true` (PoC mode), starting the backend should auto-create the new tables.

```bash
cd /Users/kyle/workspace/Personal/talenttee/backend && npm run start:dev &
```

Check logs for table creation. Then stop the server.

- [ ] **Step 5: Commit any fixes**

```bash
cd /Users/kyle/workspace/Personal/talenttee && git add -A && git commit -m "fix: resolve build issues and verify entity registration"
```

---

### Task 13: Redis Setup Verification

**Files:** None (infrastructure)

- [ ] **Step 1: Verify Redis is available**

```bash
redis-cli ping
```

Expected: `PONG`

If Redis is not installed:
```bash
brew install redis && brew services start redis
```

- [ ] **Step 2: Test BullMQ connection**

Start the backend and verify no Redis connection errors in the logs.

```bash
cd /Users/kyle/workspace/Personal/talenttee/backend && npm run start:dev 2>&1 | head -20
```

Expected: No `ECONNREFUSED` errors. BullMQ should connect silently.

---

### Task 14: End-to-End Manual Test

- [ ] **Step 1: Start backend and frontend**

```bash
cd /Users/kyle/workspace/Personal/talenttee/backend && npm run start:dev &
cd /Users/kyle/workspace/Personal/talenttee/frontend && npm run dev &
```

- [ ] **Step 2: Connect GitHub via OAuth**

1. Navigate to `http://localhost:3000/datasource`
2. Click "Connect" on the GitHub card
3. Authorize the OAuth app
4. Verify redirect back with `?github=connected`

- [ ] **Step 3: Test sync trigger**

1. After connecting, verify repo list appears
2. Click "Sync Activity"
3. Verify progress bar updates
4. Check backend logs for sync job execution

- [ ] **Step 4: Test repo toggle**

1. Uncheck a repo
2. Verify the checkbox updates
3. Re-check it

- [ ] **Step 5: Verify data in DB**

```bash
cd /Users/kyle/workspace/Personal/talenttee && psql -p 5434 -U near_agent -d near_agent -c "SELECT COUNT(*) FROM github_repository;"
psql -p 5434 -U near_agent -d near_agent -c "SELECT COUNT(*) FROM github_commit;"
psql -p 5434 -U near_agent -d near_agent -c "SELECT COUNT(*) FROM github_pull_request;"
psql -p 5434 -U near_agent -d near_agent -c "SELECT COUNT(*) FROM github_issue;"
```

- [ ] **Step 6: Test resume generation with real data**

Call the resume generate endpoint with the synced data:

```bash
curl -X POST http://localhost:3001/resume/generate \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"mode": "full"}'
```

Verify the resume is generated using real GitHub data instead of fixtures.

- [ ] **Step 7: Commit final state**

```bash
cd /Users/kyle/workspace/Personal/talenttee && git add -A && git commit -m "feat: GitHub activity sync & resume auto-update pipeline complete"
```
