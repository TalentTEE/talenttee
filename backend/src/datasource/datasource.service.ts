import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSourceConnection } from '../entities/data-source-connection.entity.js';
import { DataSourceProvider, DataSourceStatus } from '../common/enums/index.js';

@Injectable()
export class DatasourceService {
  constructor(
    @InjectRepository(DataSourceConnection)
    private readonly dsRepo: Repository<DataSourceConnection>,
    private readonly config: ConfigService,
  ) {}

  async exchangeGithubCode(code: string): Promise<string> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.get('GITHUB_CLIENT_ID'),
        client_secret: this.config.get('GITHUB_CLIENT_SECRET'),
        code,
      }),
    });
    const data = await response.json();
    return data.access_token;
  }

  async connectMock(userId: string, provider: DataSourceProvider): Promise<DataSourceConnection> {
    const existing = await this.dsRepo.findOne({ where: { userId, provider } });
    if (existing) return existing;

    const conn = this.dsRepo.create({
      userId,
      provider,
      status: DataSourceStatus.MOCK,
      lastSyncedAt: new Date(),
    });
    return this.dsRepo.save(conn);
  }

  async connectGithub(userId: string, accessToken: string): Promise<DataSourceConnection> {
    const existing = await this.dsRepo.findOne({
      where: { userId, provider: DataSourceProvider.GITHUB },
    });
    if (existing) {
      existing.accessToken = accessToken;
      existing.status = DataSourceStatus.CONNECTED;
      existing.lastSyncedAt = new Date();
      return this.dsRepo.save(existing);
    }

    const conn = this.dsRepo.create({
      userId,
      provider: DataSourceProvider.GITHUB,
      status: DataSourceStatus.CONNECTED,
      accessToken,
      lastSyncedAt: new Date(),
    });
    return this.dsRepo.save(conn);
  }

  async getStatus(userId: string): Promise<DataSourceConnection[]> {
    return this.dsRepo.find({ where: { userId } });
  }

  async getConnectionByProvider(userId: string, provider: DataSourceProvider): Promise<DataSourceConnection | null> {
    return this.dsRepo.findOne({ where: { userId, provider } });
  }

  loadFixture(provider: DataSourceProvider): Record<string, any> {
    const fixtureMap: Record<string, string> = {
      [DataSourceProvider.GITHUB]: 'github.json',
      [DataSourceProvider.SLACK]: 'slack.json',
      [DataSourceProvider.DISCORD]: 'discord.json',
      [DataSourceProvider.GOV24]: 'gov24.json',
    };

    const filename = fixtureMap[provider];
    if (!filename) throw new NotFoundException(`No fixture for ${provider}`);

    const filePath = join(process.cwd(), 'src', 'datasource', 'fixtures', filename);
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }

  async getProviderData(userId: string, provider: DataSourceProvider): Promise<Record<string, any>> {
    const conn = await this.getConnectionByProvider(userId, provider);
    if (!conn) throw new NotFoundException(`${provider} is not connected`);

    const fixture = this.loadFixture(provider);

    // For real GitHub connection, fetch from GitHub API and merge fixture analysis
    if (provider === DataSourceProvider.GITHUB && conn.status === DataSourceStatus.CONNECTED && conn.accessToken) {
      try {
        const liveData = await this.fetchGithubData(conn.accessToken);
        return { ...liveData, analysis: fixture.analysis };
      } catch {
        // Token expired or GitHub API error — fall back to fixture
        return fixture;
      }
    }

    // For MOCK or other providers, return fixture data
    return fixture;
  }

  private async fetchGithubData(accessToken: string): Promise<Record<string, any>> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'TalentTEE',
    };

    const [profileRes, reposRes] = await Promise.all([
      fetch('https://api.github.com/user', { headers }),
      fetch('https://api.github.com/user/repos?per_page=100&sort=updated', { headers }),
    ]);

    const profile = await profileRes.json();
    const repos = await reposRes.json();

    // Aggregate language bytes from repos
    const languages: Record<string, number> = {};
    for (const repo of repos) {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + (repo.size || 0);
      }
    }

    // Get contribution events (last 90 days)
    const eventsRes = await fetch(`https://api.github.com/users/${profile.login}/events?per_page=100`, { headers });
    const events = await eventsRes.json();
    const pushEvents = Array.isArray(events) ? events.filter((e: any) => e.type === 'PushEvent') : [];
    const prEvents = Array.isArray(events) ? events.filter((e: any) => e.type === 'PullRequestEvent') : [];

    // Top repos by stars
    const topRepos = (Array.isArray(repos) ? repos : [])
      .sort((a: any, b: any) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
      .slice(0, 6)
      .map((r: any) => ({
        name: r.name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        topics: r.topics || [],
      }));

    return {
      profile: {
        login: profile.login,
        name: profile.name,
        bio: profile.bio,
        public_repos: profile.public_repos,
        followers: profile.followers,
      },
      languages,
      repositories: topRepos,
      contributions: {
        total_commits_last_year: pushEvents.reduce((sum: number, e: any) => sum + (e.payload?.commits?.length || 0), 0),
        prs_merged: prEvents.length,
        issues_closed: 0,
        code_reviews: 0,
      },
    };
  }

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
      result[key] = this.loadFixture(conn.provider);
    }

    return result as any;
  }
}
