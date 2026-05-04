import { BadRequestException } from '@nestjs/common';
import { DatasourceController } from '../datasource.controller.js';

describe('DatasourceController GitHub OAuth-first connection', () => {
  const datasourceService = {
    getGithubInstallationIdFromOAuth: jest.fn(),
    connectGithubApp: jest.fn(),
  };
  const pdfParser = {};
  const res = { redirect: jest.fn() };

  const buildController = (values: Record<string, string | undefined>) => new DatasourceController(
    datasourceService as any,
    pdfParser as any,
    {
      get: jest.fn((key: string, defaultValue?: string) => values[key] ?? defaultValue),
    } as any,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('starts GitHub OAuth before sending users to GitHub App installation', async () => {
    const controller = buildController({
      GITHUB_CLIENT_ID: 'client-id',
      GITHUB_CALLBACK_URL: 'https://api.example.com/datasource/callback/github',
    });

    await controller.connectGithub({ user: { id: 'user-1' } }, res as any);

    const redirectUrl = new URL(res.redirect.mock.calls[0][0]);
    expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe('https://github.com/login/oauth/authorize');
    expect(redirectUrl.searchParams.get('client_id')).toBe('client-id');
    expect(redirectUrl.searchParams.get('redirect_uri')).toBe('https://api.example.com/datasource/callback/github');
    expect(redirectUrl.searchParams.get('state')).toBe('user-1');
  });

  it('falls back to GitHub App installation when OAuth client config is missing', async () => {
    const controller = buildController({ GITHUB_APP_SLUG: 'talenttee' });

    await controller.connectGithub({ user: { id: 'user-1' } }, res as any);

    expect(res.redirect).toHaveBeenCalledWith(
      'https://github.com/apps/talenttee/installations/new?state=user-1',
    );
  });

  it('opens GitHub App access management directly when requested', async () => {
    const controller = buildController({
      GITHUB_CLIENT_ID: 'client-id',
      GITHUB_APP_SLUG: 'talenttee',
    });

    await (controller.connectGithub as any)({ user: { id: 'user-1' } }, res, '1');

    expect(res.redirect).toHaveBeenCalledWith(
      'https://github.com/apps/talenttee/installations/new?state=user-1',
    );
  });

  it('reuses an existing TalentTEE GitHub App installation from OAuth callback', async () => {
    datasourceService.getGithubInstallationIdFromOAuth.mockResolvedValue(12345);
    const controller = buildController({
      GITHUB_CALLBACK_URL: 'https://api.example.com/datasource/callback/github',
      FRONTEND_URL: 'https://talenttee.example.com',
    });

    await controller.callbackGithub(undefined as any, 'oauth-code', 'user-1', res as any);

    expect(datasourceService.getGithubInstallationIdFromOAuth).toHaveBeenCalledWith(
      'oauth-code',
      'https://api.example.com/datasource/callback/github',
    );
    expect(datasourceService.connectGithubApp).toHaveBeenCalledWith('user-1', 12345);
    expect(res.redirect).toHaveBeenCalledWith('https://talenttee.example.com/datasource?github=connected');
  });

  it('sends users to GitHub App installation when OAuth finds no existing installation', async () => {
    datasourceService.getGithubInstallationIdFromOAuth.mockResolvedValue(null);
    const controller = buildController({
      GITHUB_APP_SLUG: 'talenttee',
      GITHUB_CALLBACK_URL: 'https://api.example.com/datasource/callback/github',
    });

    await controller.callbackGithub(undefined as any, 'oauth-code', 'user-1', res as any);

    expect(res.redirect).toHaveBeenCalledWith(
      'https://github.com/apps/talenttee/installations/new?state=user-1',
    );
  });

  it('falls back to GitHub App installation when OAuth lookup fails', async () => {
    datasourceService.getGithubInstallationIdFromOAuth.mockRejectedValue(new Error('bad oauth code'));
    const controller = buildController({
      GITHUB_APP_SLUG: 'talenttee',
      GITHUB_CALLBACK_URL: 'http://localhost:4000/datasource/callback/github',
    });

    await controller.callbackGithub(undefined as any, 'oauth-code', 'user-1', res as any);

    expect(res.redirect).toHaveBeenCalledWith(
      'https://github.com/apps/talenttee/installations/new?state=user-1',
    );
  });

  it('keeps supporting GitHub App installation callbacks', async () => {
    const controller = buildController({ FRONTEND_URL: 'https://talenttee.example.com' });

    await controller.callbackGithub('12345', undefined as any, 'user-1', res as any);

    expect(datasourceService.connectGithubApp).toHaveBeenCalledWith('user-1', 12345);
    expect(res.redirect).toHaveBeenCalledWith('https://talenttee.example.com/datasource?github=connected');
  });

  it('rejects callbacks without state', async () => {
    const controller = buildController({});

    await expect(controller.callbackGithub('12345', undefined as any, '', res as any))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
