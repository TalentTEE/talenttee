import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSourceConnection } from '../entities/data-source-connection.entity.js';
import { DataSourceProvider, DataSourceStatus } from '../common/enums/index.js';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

@Injectable()
export class DatasourceService {
  constructor(
    @InjectRepository(DataSourceConnection)
    private readonly dsRepo: Repository<DataSourceConnection>,
  ) {}

  async exchangeGithubCode(code: string): Promise<string> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
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
