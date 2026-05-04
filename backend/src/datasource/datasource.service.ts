import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createSign } from 'crypto';
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

interface RepoContributionStats {
  userCommits: number;
  totalCommits: number;
  additions: number;
  deletions: number;
  contributionRatio: number;
}

export interface GithubRepoSummary {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  isPrivate: boolean;
  topics: string[];
}

@Injectable()
export class DatasourceService {
  constructor(
    @InjectRepository(DataSourceConnection)
    private readonly dsRepo: Repository<DataSourceConnection>,
    private readonly config: ConfigService,
    @Inject(NEAR_AI_CLIENT)
    private readonly aiClient: NearAiClient,
  ) {}

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

  async getGithubInstallationToken(installationId: number): Promise<string> {
    const jwt = this.createGithubAppJwt();
    const response = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'TalentTEE',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to create GitHub installation token: ${response.status} ${body}`);
    }

    const data = await response.json() as { token?: string };
    if (!data.token) throw new Error('GitHub installation token missing in response');
    return data.token;
  }

  async getGithubInstallationIdFromOAuth(code: string, redirectUri: string): Promise<number | null> {
    const clientId = this.config.get<string>('GITHUB_CLIENT_ID')
      || this.config.get<string>('GITHUB_APP_CLIENT_ID');
    const clientSecret = this.config.get<string>('GITHUB_CLIENT_SECRET')
      || this.config.get<string>('GITHUB_APP_CLIENT_SECRET');
    const appId = Number(this.config.get<string>('GITHUB_APP_ID'));

    if (!clientId || !clientSecret || !appId || Number.isNaN(appId)) {
      throw new Error('Missing GitHub OAuth config: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_APP_ID are required');
    }

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'TalentTEE',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      throw new Error(`Failed to exchange GitHub OAuth code: ${tokenRes.status} ${body}`);
    }

    const tokenData = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string };
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'GitHub OAuth access token missing in response');
    }

    const installationsRes = await fetch('https://api.github.com/user/installations', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'TalentTEE',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (installationsRes.ok) {
      const payload = await installationsRes.json() as { installations?: Array<{ id?: number; app_id?: number }> };
      const installation = (payload.installations || [])
        .find((item) => Number(item.app_id) === appId && item.id);

      if (installation?.id) return Number(installation.id);
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'TalentTEE',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!userRes.ok) {
      const body = await userRes.text();
      throw new Error(`Failed to read GitHub OAuth user: ${userRes.status} ${body}`);
    }

    const user = await userRes.json() as { id?: number };
    if (!user.id) return null;

    const appInstallationsRes = await fetch('https://api.github.com/app/installations?per_page=100', {
      headers: {
        Authorization: `Bearer ${this.createGithubAppJwt()}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'TalentTEE',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!appInstallationsRes.ok) {
      const body = await appInstallationsRes.text();
      throw new Error(`Failed to list GitHub App installations: ${appInstallationsRes.status} ${body}`);
    }

    const appInstallations = await appInstallationsRes.json() as Array<{
      id?: number;
      app_id?: number;
      account?: { id?: number };
    }>;
    const accountInstallation = appInstallations.find((item) => (
      Number(item.app_id) === appId
      && Number(item.account?.id) === Number(user.id)
      && item.id
    ));

    return accountInstallation?.id ? Number(accountInstallation.id) : null;
  }

  async connectGithubApp(userId: string, installationId: number): Promise<DataSourceConnection> {
    const jwt = this.createGithubAppJwt();
    const installationRes = await fetch(`https://api.github.com/app/installations/${installationId}`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'TalentTEE',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!installationRes.ok) {
      const body = await installationRes.text();
      throw new Error(`Failed to read GitHub installation: ${installationRes.status} ${body}`);
    }

    const installation = await installationRes.json() as { account?: { login?: string } };
    const githubLogin = installation.account?.login ?? null;

    const existing = await this.dsRepo.findOne({
      where: { userId, provider: DataSourceProvider.GITHUB },
    });

    if (existing) {
      existing.installationId = installationId;
      existing.githubLogin = githubLogin;
      existing.status = DataSourceStatus.CONNECTED;
      existing.lastSyncedAt = new Date();
      existing.accessToken = null;
      existing.analysisCache = null as any;
      existing.analysisCachedAt = null as any;
      return this.dsRepo.save(existing);
    }

    const conn = this.dsRepo.create({
      userId,
      provider: DataSourceProvider.GITHUB,
      status: DataSourceStatus.CONNECTED,
      installationId,
      githubLogin,
      accessToken: null,
      selectedRepos: null,
      lastSyncedAt: new Date(),
    });
    return this.dsRepo.save(conn);
  }

  async getGithubRepos(userId: string): Promise<{
    repos: GithubRepoSummary[];
    selectedRepos: string[] | null;
  }> {
    const conn = await this.dsRepo.findOne({
      where: { userId, provider: DataSourceProvider.GITHUB },
    });
    if (!conn || !conn.installationId) {
      throw new NotFoundException('GitHub is not connected');
    }

    const installationToken = await this.getGithubInstallationToken(Number(conn.installationId));
    const repos = await this.fetchGithubInstallationRepos(installationToken);

    return {
      repos: repos.map((repo) => this.toGithubRepoSummary(repo)),
      selectedRepos: conn.selectedRepos,
    };
  }

  async updateSelectedRepos(userId: string, repos: string[]): Promise<void> {
    const conn = await this.dsRepo.findOne({
      where: { userId, provider: DataSourceProvider.GITHUB },
    });
    if (!conn || !conn.installationId) {
      throw new NotFoundException('GitHub is not connected');
    }

    conn.selectedRepos = repos;
    conn.status = DataSourceStatus.CONNECTED;
    conn.analysisCache = null as any;
    conn.analysisCachedAt = null as any;
    await this.dsRepo.save(conn);
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

    if (provider === DataSourceProvider.GITHUB && conn.installationId) {
      conn.status = DataSourceStatus.DISCONNECTED;
      conn.accessToken = null;
      conn.analysisCache = null as any;
      conn.analysisCachedAt = null as any;
      conn.lastSyncedAt = null as any;
      await this.dsRepo.save(conn);
      return;
    }

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
    if (conn.status === DataSourceStatus.DISCONNECTED) {
      throw new NotFoundException(`${provider} is not connected`);
    }

    // 1. Get raw data (live GitHub, PDF cache, or fixture)
    let rawData: Record<string, any>;
    if (provider === DataSourceProvider.PDF) {
      // PDF data is stored in analysisCache at upload time
      return conn.analysisCache ?? {};
    } else if (
      provider === DataSourceProvider.GITHUB
      && conn.status === DataSourceStatus.CONNECTED
      && conn.installationId
    ) {
      const installationToken = await this.getGithubInstallationToken(Number(conn.installationId));
      rawData = await this.fetchGithubData(installationToken, conn.githubLogin, conn.selectedRepos);
      conn.lastSyncedAt = new Date();
      await this.dsRepo.save(conn);
    } else if (conn.status === DataSourceStatus.MOCK) {
      rawData = this.loadFixture(provider);
    } else {
      rawData = this.loadFixture(provider);
    }

    // 2. Check analysis cache
    const { analysis: _fixtureAnalysis, ...rawWithoutAnalysis } = rawData;
    const isCacheFresh =
      conn.analysisCache
      && conn.analysisCachedAt
      && Date.now() - new Date(conn.analysisCachedAt).getTime() < CACHE_TTL_MS;

    if (isCacheFresh) {
      return { ...rawWithoutAnalysis, analysis: conn.analysisCache };
    }

    // 3. Stale cache exists → return immediately, re-analyze in background
    if (conn.analysisCache) {
      this.analyzeProviderData(provider, rawWithoutAnalysis)
        .then(async (analysis) => {
          conn.analysisCache = analysis;
          conn.analysisCachedAt = new Date();
          await this.dsRepo.save(conn);
        })
        .catch((err) => console.error(`Background AI analysis failed for ${provider}:`, err));
      return { ...rawWithoutAnalysis, analysis: conn.analysisCache };
    }

    // 4. No cache at all → must wait for first analysis
    try {
      const analysis = await this.analyzeProviderData(provider, rawWithoutAnalysis);
      conn.analysisCache = analysis;
      conn.analysisCachedAt = new Date();
      await this.dsRepo.save(conn);
      return { ...rawWithoutAnalysis, analysis };
    } catch (err) {
      console.error(`AI analysis failed for ${provider}:`, err);
      const fallback = this.loadFixture(provider).analysis;
      return { ...rawWithoutAnalysis, analysis: fallback };
    }
  }

  private async fetchGithubInstallationRepos(installationToken: string): Promise<any[]> {
    const headers = {
      Authorization: `Bearer ${installationToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'TalentTEE',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    const allRepos: any[] = [];
    let page = 1;
    while (true) {
      const reposRes = await fetch(
        `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
        { headers },
      );

      if (!reposRes.ok) {
        const body = await reposRes.text();
        throw new Error(`Failed to fetch installation repositories: ${reposRes.status} ${body}`);
      }

      const payload = await reposRes.json() as { repositories?: any[] };
      const pageRepos = Array.isArray(payload.repositories) ? payload.repositories : [];
      if (pageRepos.length === 0) break;

      allRepos.push(...pageRepos);
      if (pageRepos.length < 100) break;
      page += 1;
    }

    return allRepos;
  }

  private toGithubRepoSummary(repo: any): GithubRepoSummary {
    return {
      name: repo.name as string,
      fullName: repo.full_name as string,
      description: (repo.description as string) || null,
      language: (repo.language as string) || null,
      stars: (repo.stargazers_count as number) || 0,
      isPrivate: !!repo.private,
      topics: (repo.topics as string[]) || [],
    };
  }

  private async fetchGithubData(
    installationToken: string,
    githubLogin?: string | null,
    selectedRepos?: string[] | null,
  ): Promise<Record<string, any>> {
    let allRepos = await this.fetchGithubInstallationRepos(installationToken);
    if (selectedRepos && selectedRepos.length > 0) {
      const selected = new Set(selectedRepos);
      allRepos = allRepos.filter((repo) => selected.has(repo.full_name));
    }

    const headers = {
      Authorization: `Bearer ${installationToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'TalentTEE',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    const languages: Record<string, number> = {};
    for (const repo of allRepos) {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + (repo.size || 0);
      }
    }

    const reposForDetail = [...allRepos]
      .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
      .slice(0, 6);

    const detailedRepos = await Promise.all(
      reposForDetail.map(async (repo) => {
        const ownerLogin = repo.owner?.login as string;
        const repoName = repo.name as string;

        const stats = githubLogin
          ? await this.fetchRepoContributionStats(ownerLogin, repoName, githubLogin, headers)
          : {
            userCommits: 0,
            totalCommits: 0,
            additions: 0,
            deletions: 0,
            contributionRatio: 0,
          };

        return {
          name: repoName,
          description: repo.description,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          topics: repo.topics || [],
          userCommits: stats.userCommits,
          totalCommits: stats.totalCommits,
          additions: stats.additions,
          deletions: stats.deletions,
          contributionRatio: stats.contributionRatio,
        };
      }),
    );

    const aggregatedUserCommits = detailedRepos.reduce((sum, repo) => sum + (repo.userCommits || 0), 0);
    const aggregatedTotalCommits = detailedRepos.reduce((sum, repo) => sum + (repo.totalCommits || 0), 0);

    const profile = await this.fetchGithubProfile(githubLogin, headers, allRepos.length);

    return {
      profile,
      languages,
      repositories: detailedRepos,
      contributions: {
        total_commits_last_year: aggregatedUserCommits,
        prs_merged: 0,
        issues_closed: 0,
        code_reviews: 0,
        contribution_ratio: aggregatedTotalCommits > 0
          ? aggregatedUserCommits / aggregatedTotalCommits
          : 0,
      },
    };
  }

  private async fetchGithubProfile(
    githubLogin: string | null | undefined,
    headers: Record<string, string>,
    repoCount: number,
  ) {
    if (!githubLogin) {
      return {
        login: 'unknown',
        name: null,
        bio: null,
        public_repos: repoCount,
        followers: 0,
      };
    }

    const profileRes = await fetch(`https://api.github.com/users/${githubLogin}`, { headers });
    if (!profileRes.ok) {
      return {
        login: githubLogin,
        name: githubLogin,
        bio: null,
        public_repos: repoCount,
        followers: 0,
      };
    }

    const profile = await profileRes.json() as {
      login?: string;
      name?: string | null;
      bio?: string | null;
      public_repos?: number;
      followers?: number;
    };

    return {
      login: profile.login || githubLogin,
      name: profile.name || githubLogin,
      bio: profile.bio || null,
      public_repos: profile.public_repos ?? repoCount,
      followers: profile.followers ?? 0,
    };
  }

  private async fetchRepoContributionStats(
    owner: string,
    repo: string,
    githubLogin: string,
    headers: Record<string, string>,
  ): Promise<RepoContributionStats> {
    const url = `https://api.github.com/repos/${owner}/${repo}/stats/contributors`;
    let contributors: any[] = [];

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await fetch(url, { headers });

      if (res.status === 202) {
        await this.sleep(300 * (attempt + 1));
        continue;
      }

      if (!res.ok) {
        return {
          userCommits: 0,
          totalCommits: 0,
          additions: 0,
          deletions: 0,
          contributionRatio: 0,
        };
      }

      const payload = await res.json();
      contributors = Array.isArray(payload) ? payload : [];
      break;
    }

    if (contributors.length === 0) {
      return {
        userCommits: 0,
        totalCommits: 0,
        additions: 0,
        deletions: 0,
        contributionRatio: 0,
      };
    }

    const totalCommits = contributors.reduce((sum, c) => sum + (c.total || 0), 0);
    const user = contributors.find((c) => c.author?.login === githubLogin);

    const userCommits = user?.total || 0;
    const weeks = Array.isArray(user?.weeks) ? user.weeks : [];
    const additions = weeks.reduce((sum: number, w: any) => sum + (w.a || 0), 0);
    const deletions = weeks.reduce((sum: number, w: any) => sum + (w.d || 0), 0);

    return {
      userCommits,
      totalCommits,
      additions,
      deletions,
      contributionRatio: totalCommits > 0 ? userCommits / totalCommits : 0,
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

  private createGithubAppJwt(): string {
    const appId = this.config.get<string>('GITHUB_APP_ID');
    const privateKeyBase64 = this.config.get<string>('GITHUB_APP_PRIVATE_KEY');

    if (!appId || !privateKeyBase64) {
      throw new Error('Missing GitHub App config: GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY are required');
    }

    const privateKeyPem = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');
    const now = Math.floor(Date.now() / 1000);

    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iat: now - 60,
      exp: now + 9 * 60,
      iss: appId,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    signer.end();

    const signature = signer.sign(privateKeyPem, 'base64');
    const encodedSignature = this.base64UrlEncode(Buffer.from(signature, 'base64'));

    return `${signingInput}.${encodedSignature}`;
  }

  private base64UrlEncode(input: string | Buffer): string {
    const raw = Buffer.isBuffer(input) ? input : Buffer.from(input);
    return raw
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
      if (conn.status === DataSourceStatus.DISCONNECTED) continue;
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
