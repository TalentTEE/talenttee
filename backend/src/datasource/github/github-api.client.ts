import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: { login: string };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string;
  created_at: string;
  updated_at: string;
  topics: string[];
}

interface GitHubCommit {
  sha: string;
  commit: {
    author: { name: string; email: string; date: string } | null;
    committer: { name: string; email: string; date: string } | null;
    message: string;
  };
  author: { login: string } | null;
  stats?: { additions: number; deletions: number; total: number };
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user: { login: string } | null;
  body: string | null;
  labels: Array<{ name: string }>;
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: { login: string } | null;
  body: string | null;
  labels: Array<{ name: string }>;
  pull_request?: unknown;
}

export class RateLimitedError extends Error {
  constructor(public readonly resetAt: number) {
    super('RATE_LIMITED');
    this.name = 'RateLimitedError';
  }
}

@Injectable()
export class GitHubApiClient {
  private readonly logger = new Logger(GitHubApiClient.name);

  constructor(private readonly configService: ConfigService) {}

  private buildHeaders(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  private parseNextLink(linkHeader: string | null): string | null {
    if (!linkHeader) return null;
    const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    return match ? match[1] : null;
  }

  private async checkRateLimit(headers: Headers): Promise<void> {
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');

    if (remaining === null || reset === null) return;

    const remainingCount = parseInt(remaining, 10);
    const resetTimestamp = parseInt(reset, 10);

    if (remainingCount < 100) {
      const waitMs = (resetTimestamp - Math.floor(Date.now() / 1000) + 1) * 1000;
      if (waitMs > 0) {
        this.logger.warn(
          `GitHub rate limit low (remaining=${remainingCount}). Waiting ${waitMs}ms until reset.`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }

  private async fetchGitHub<T>(
    url: string,
    token: string,
  ): Promise<{ data: T; headers: Headers }> {
    const response = await fetch(url, { headers: this.buildHeaders(token) });

    if (response.status === 403) {
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const reset = response.headers.get('X-RateLimit-Reset');

      if (remaining === '0' && reset !== null) {
        const resetTimestamp = parseInt(reset, 10);
        const waitMs = (resetTimestamp - Math.floor(Date.now() / 1000) + 1) * 1000;
        if (waitMs > 0) {
          this.logger.warn(
            `GitHub rate limit exhausted. Waiting ${waitMs}ms then throwing RATE_LIMITED.`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
        throw new RateLimitedError(resetTimestamp);
      }
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} for ${url}`);
    }

    const data = (await response.json()) as T;
    await this.checkRateLimit(response.headers);

    return { data, headers: response.headers };
  }

  private async fetchAllPages<T>(
    initialUrl: string,
    token: string,
  ): Promise<T[]> {
    const results: T[] = [];
    let url: string | null = initialUrl;

    while (url) {
      const { data, headers } = await this.fetchGitHub<T[]>(url, token);
      results.push(...data);
      url = this.parseNextLink(headers.get('Link'));
    }

    return results;
  }

  async getUser(token: string): Promise<GitHubUser> {
    const { data } = await this.fetchGitHub<GitHubUser>(
      'https://api.github.com/user',
      token,
    );
    return {
      login: data.login,
      id: data.id,
      name: data.name,
      bio: data.bio,
      public_repos: data.public_repos,
      followers: data.followers,
    };
  }

  async getRepos(token: string): Promise<GitHubRepo[]> {
    const url =
      'https://api.github.com/user/repos?type=owner&sort=pushed&per_page=100';
    return this.fetchAllPages<GitHubRepo>(url, token);
  }

  async getCommits(
    token: string,
    fullName: string,
    since?: string,
  ): Promise<GitHubCommit[]> {
    const params = new URLSearchParams({ per_page: '100' });
    if (since) params.set('since', since);
    const url = `https://api.github.com/repos/${fullName}/commits?${params.toString()}`;
    return this.fetchAllPages<GitHubCommit>(url, token);
  }

  async getPullRequests(
    token: string,
    fullName: string,
    since?: string,
  ): Promise<GitHubPullRequest[]> {
    const params = new URLSearchParams({ state: 'all', per_page: '100' });
    if (since) params.set('since', since);
    const url = `https://api.github.com/repos/${fullName}/pulls?${params.toString()}`;
    return this.fetchAllPages<GitHubPullRequest>(url, token);
  }

  async getIssues(
    token: string,
    fullName: string,
    since?: string,
  ): Promise<GitHubIssue[]> {
    const params = new URLSearchParams({ state: 'all', per_page: '100' });
    if (since) params.set('since', since);
    const url = `https://api.github.com/repos/${fullName}/issues?${params.toString()}`;
    return this.fetchAllPages<GitHubIssue>(url, token);
  }
}
