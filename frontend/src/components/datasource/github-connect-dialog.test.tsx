import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GitHubConnectDialog } from './github-connect-dialog';

const { mockGetGithubOAuthUrl, mockGetGithubRepos, mockSaveSelectedRepos } = vi.hoisted(() => ({
  mockGetGithubOAuthUrl: vi.fn(),
  mockGetGithubRepos: vi.fn(),
  mockSaveSelectedRepos: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getGithubOAuthUrl: mockGetGithubOAuthUrl,
  getGithubRepos: mockGetGithubRepos,
  saveSelectedRepos: mockSaveSelectedRepos,
}));

describe('GitHubConnectDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGithubOAuthUrl.mockReturnValue('https://api.example.com/datasource/connect/github?token=jwt');
    mockGetGithubRepos.mockResolvedValue({
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
        {
          name: 'api',
          fullName: 'talent-dev/api',
          description: 'Backend API',
          language: 'TypeScript',
          stars: 3,
          isPrivate: true,
          topics: [],
        },
      ],
    });
    mockSaveSelectedRepos.mockResolvedValue(undefined);
    vi.spyOn(window, 'open').mockReturnValue({ closed: false } as Window);
  });

  it('shows repository selection after GitHub App installation callback and saves selected repos', async () => {
    const user = userEvent.setup();
    const onConnected = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <GitHubConnectDialog
        open
        onOpenChange={onOpenChange}
        onConnected={onConnected}
        useDummy={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /install github app/i }));
    window.dispatchEvent(new MessageEvent('message', {
      origin: window.location.origin,
      data: { type: 'github-oauth-connected' },
    }));

    expect(await screen.findByText(/select repositories/i)).toBeInTheDocument();
    expect(screen.getByText('core')).toBeInTheDocument();
    expect(screen.getByText('api')).toBeInTheDocument();

    await user.click(screen.getByLabelText(/api/i));
    await user.click(screen.getByRole('button', { name: /continue with 2 repos/i }));

    await waitFor(() => {
      expect(mockSaveSelectedRepos).toHaveBeenCalledWith(['talent-dev/core', 'talent-dev/api']);
      expect(onConnected).toHaveBeenCalledTimes(1);
    });
  });
});
