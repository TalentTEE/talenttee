import type { GithubSyncStatus } from '../../common/enums/index.js';

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

export interface SyncStatusResponse {
  status: GithubSyncStatus;
  totalRepos: number;
  completedRepos: number;
  failedRepos: number;
  startedAt: string | null;
}
