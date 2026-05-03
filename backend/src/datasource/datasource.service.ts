import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSourceConnection } from '../entities/data-source-connection.entity.js';
import { DataSourceProvider, DataSourceStatus } from '../common/enums/index.js';
import { NEAR_AI_CLIENT } from '../common/interfaces/near-ai-client.interface.js';
import type { NearAiClient } from '../common/interfaces/near-ai-client.interface.js';
import {
  GITHUB_ANALYSIS_PROMPT,
  SLACK_ANALYSIS_PROMPT,
  DISCORD_ANALYSIS_PROMPT,
  GOV24_ANALYSIS_PROMPT,
} from './prompts/datasource-analysis.prompt.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class DatasourceService {
  constructor(
    @InjectRepository(DataSourceConnection)
    private readonly dsRepo: Repository<DataSourceConnection>,
    private readonly config: ConfigService,
    @Inject(NEAR_AI_CLIENT)
    private readonly aiClient: NearAiClient,
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

  async connectPdf(
    userId: string,
    parseResult: { rawText: string; structured: Record<string, any> | null },
  ): Promise<DataSourceConnection> {
    const existing = await this.dsRepo.findOne({
      where: { userId, provider: DataSourceProvider.PDF },
    });
    if (existing) {
      existing.status = DataSourceStatus.CONNECTED;
      existing.lastSyncedAt = new Date();
      existing.analysisCache = { rawText: parseResult.rawText, ...parseResult.structured };
      existing.analysisCachedAt = new Date();
      return this.dsRepo.save(existing);
    }

    const conn = this.dsRepo.create({
      userId,
      provider: DataSourceProvider.PDF,
      status: DataSourceStatus.CONNECTED,
      lastSyncedAt: new Date(),
      analysisCache: { rawText: parseResult.rawText, ...parseResult.structured },
      analysisCachedAt: new Date(),
    });
    return this.dsRepo.save(conn);
  }

  async updatePdfData(userId: string, data: Record<string, any>): Promise<void> {
    const conn = await this.dsRepo.findOne({
      where: { userId, provider: DataSourceProvider.PDF },
    });
    if (!conn) throw new NotFoundException('PDF datasource not connected');
    const { rawText, ...rest } = conn.analysisCache ?? {};
    conn.analysisCache = { rawText, ...rest, ...data };
    conn.analysisCachedAt = new Date();
    await this.dsRepo.save(conn);
  }

  async getStatus(userId: string): Promise<DataSourceConnection[]> {
    return this.dsRepo.find({ where: { userId } });
  }

  async disconnect(userId: string, provider: DataSourceProvider): Promise<void> {
    const conn = await this.dsRepo.findOne({ where: { userId, provider } });
    if (!conn) throw new NotFoundException(`${provider} is not connected`);
    await this.dsRepo.remove(conn);
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

    // 1. Get raw data (live GitHub, PDF cache, or fixture)
    let rawData: Record<string, any>;
    if (provider === DataSourceProvider.PDF) {
      // PDF data is stored in analysisCache at upload time
      return conn.analysisCache ?? {};
    } else if (provider === DataSourceProvider.GITHUB && conn.status === DataSourceStatus.CONNECTED && conn.accessToken) {
      rawData = await this.fetchGithubData(conn.accessToken);
    } else if (conn.status === DataSourceStatus.MOCK) {
      rawData = this.loadFixture(provider);
    } else {
      rawData = this.loadFixture(provider);
    }

    // 2. Check analysis cache
    const { analysis: _fixtureAnalysis, ...rawWithoutAnalysis } = rawData;
    const isCacheFresh =
      conn.analysisCache &&
      conn.analysisCachedAt &&
      Date.now() - new Date(conn.analysisCachedAt).getTime() < CACHE_TTL_MS;

    if (isCacheFresh) {
      return { ...rawWithoutAnalysis, analysis: conn.analysisCache };
    }

    // 3. Run AI analysis
    try {
      const analysis = await this.analyzeProviderData(provider, rawWithoutAnalysis);
      conn.analysisCache = analysis;
      conn.analysisCachedAt = new Date();
      await this.dsRepo.save(conn);
      return { ...rawWithoutAnalysis, analysis };
    } catch (err) {
      console.error(`AI analysis failed for ${provider}:`, err);
      // Fall back to fixture analysis or cached (even if stale)
      const fallback = conn.analysisCache ?? this.loadFixture(provider).analysis;
      return { ...rawWithoutAnalysis, analysis: fallback };
    }
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

  async analyzeProviderData(provider: DataSourceProvider, rawData: Record<string, any>): Promise<Record<string, any>> {
    const promptMap: Record<string, string> = {
      [DataSourceProvider.GITHUB]: GITHUB_ANALYSIS_PROMPT,
      [DataSourceProvider.SLACK]: SLACK_ANALYSIS_PROMPT,
      [DataSourceProvider.DISCORD]: DISCORD_ANALYSIS_PROMPT,
      [DataSourceProvider.GOV24]: GOV24_ANALYSIS_PROMPT,
    };

    const systemPrompt = promptMap[provider];
    if (!systemPrompt) throw new Error(`No analysis prompt for provider: ${provider}`);

    const result = await this.aiClient.chat({
      agentId: `datasource-${provider.toLowerCase()}-analyst`,
      systemPrompt,
      userMessage: JSON.stringify(rawData),
    });

    const parsed = this.safeJsonParse(result.content);
    if (!parsed) throw new Error(`Failed to parse AI analysis for ${provider}`);
    return parsed;
  }

  private safeJsonParse(content: string): any | null {
    try {
      const stripped = content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      return JSON.parse(stripped);
    } catch {
      return null;
    }
  }

  async collectAllData(userId: string): Promise<{
    github: Record<string, any> | null;
    slack: Record<string, any> | null;
    discord: Record<string, any> | null;
    gov24: Record<string, any> | null;
    pdf: Record<string, any> | null;
  }> {
    const connections = await this.getStatus(userId);
    const result: Record<string, any> = { github: null, slack: null, discord: null, gov24: null, pdf: null };

    for (const conn of connections) {
      const key = conn.provider.toLowerCase();
      try {
        result[key] = await this.getProviderData(userId, conn.provider);
      } catch (err) {
        // Only fall back to fixture for MOCK connections; CONNECTED failures propagate as null
        if (conn.status === DataSourceStatus.MOCK && conn.provider !== DataSourceProvider.PDF) {
          result[key] = this.loadFixture(conn.provider);
        } else {
          console.error(`Failed to fetch ${conn.provider} data for user ${userId}:`, err);
          result[key] = null;
        }
      }
    }

    return result as any;
  }
}
