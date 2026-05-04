import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DatasourceService } from '../datasource.service.js';
import { DataSourceConnection } from '../../entities/data-source-connection.entity.js';
import { DataSourceProvider, DataSourceStatus } from '../../common/enums/index.js';
import { NEAR_AI_CLIENT } from '../../common/interfaces/near-ai-client.interface.js';

describe('DatasourceService GitHub App repository selection', () => {
  let service: DatasourceService;
  const configGet = jest.fn();
  const connection = {
    id: 'conn-1',
    userId: 'user-1',
    provider: DataSourceProvider.GITHUB,
    status: DataSourceStatus.CONNECTED,
    installationId: 12345,
    githubLogin: 'talent-dev',
    selectedRepos: ['talent-dev/core'],
  } as DataSourceConnection;

  const repo = {
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.restoreAllMocks();
    repo.findOne.mockReset();
    repo.save.mockReset();
    repo.remove.mockReset();
    repo.find.mockReset();
    repo.findOne.mockResolvedValue({ ...connection });
    repo.save.mockImplementation(async (value) => value);
    repo.find.mockResolvedValue([{ ...connection, status: DataSourceStatus.DISCONNECTED }]);
    configGet.mockReset();
    configGet.mockImplementation((key: string) => ({
      GITHUB_APP_ID: '3593557',
      GITHUB_CLIENT_ID: 'client-id',
      GITHUB_CLIENT_SECRET: 'client-secret',
    }[key]));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatasourceService,
        { provide: getRepositoryToken(DataSourceConnection), useValue: repo },
        { provide: ConfigService, useValue: { get: configGet } },
        { provide: NEAR_AI_CLIENT, useValue: { chat: jest.fn() } },
      ],
    }).compile();

    service = module.get(DatasourceService);
    jest.spyOn(service, 'getGithubInstallationToken').mockResolvedValue('installation-token');
  });

  it('lists repositories available to the GitHub App installation with saved selection', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        repositories: [
          {
            name: 'core',
            full_name: 'talent-dev/core',
            description: 'Core app',
            language: 'TypeScript',
            stargazers_count: 7,
            private: false,
            topics: ['nextjs'],
          },
        ],
      }),
    } as Response);

    const result = await service.getGithubRepos('user-1');

    expect(result).toEqual({
      selectedRepos: ['talent-dev/core'],
      repos: [
        {
          name: 'core',
          fullName: 'talent-dev/core',
          description: 'Core app',
          language: 'TypeScript',
          stars: 7,
          isPrivate: false,
          topics: ['nextjs'],
        },
      ],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.github.com/installation/repositories?per_page=100&page=1',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer installation-token' }),
      }),
    );
  });

  it('persists selected repository full names', async () => {
    await service.updateSelectedRepos('user-1', ['talent-dev/core', 'talent-dev/api']);

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: DataSourceStatus.CONNECTED,
        selectedRepos: ['talent-dev/core', 'talent-dev/api'],
      }),
    );
  });

  it('keeps GitHub installation details when disconnecting so reconnect can skip reinstall', async () => {
    await service.disconnect('user-1', DataSourceProvider.GITHUB);

    expect(repo.remove).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        installationId: 12345,
        githubLogin: 'talent-dev',
        selectedRepos: ['talent-dev/core'],
        status: DataSourceStatus.DISCONNECTED,
      }),
    );
  });

  it('skips disconnected GitHub connections during collection', async () => {
    jest.spyOn(global, 'fetch');

    const result = await service.collectAllData('user-1');

    expect(result.github).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('finds an existing TalentTEE GitHub App installation from GitHub OAuth', async () => {
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'github-user-token' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          installations: [
            { id: 111, app_id: 999 },
            { id: 12345, app_id: 3593557 },
          ],
        }),
      } as Response);

    const installationId = await service.getGithubInstallationIdFromOAuth(
      'oauth-code',
      'https://api.example.com/datasource/callback/github',
    );

    expect(installationId).toBe(12345);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://github.com/login/oauth/access_token',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.github.com/user/installations',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer github-user-token' }),
      }),
    );
  });

  it('matches an existing GitHub App installation by OAuth user when user installations are unavailable', async () => {
    jest.spyOn(service as any, 'createGithubAppJwt').mockReturnValue('app-jwt');
    jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'github-user-token' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Resource not accessible by integration',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 139729358, login: 'Hyeonjeong-JANG' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            id: 129369558,
            app_id: 3593557,
            account: { id: 139729358, login: 'Hyeonjeong-JANG' },
          },
        ]),
      } as Response);

    const installationId = await service.getGithubInstallationIdFromOAuth(
      'oauth-code',
      'http://localhost:4000/datasource/callback/github',
    );

    expect(installationId).toBe(129369558);
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      'https://api.github.com/user',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer github-user-token' }),
      }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      4,
      'https://api.github.com/app/installations?per_page=100',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer app-jwt' }),
      }),
    );
  });
});
