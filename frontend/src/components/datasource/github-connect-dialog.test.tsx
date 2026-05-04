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
    mockGetGithubOAuthUrl.mockImplementation((options?: { manageAccess?: boolean }) => (
      options?.manageAccess
        ? 'https://api.example.com/datasource/connect/github?token=jwt&manage_access=1'
        : 'https://api.example.com/datasource/connect/github?token=jwt'
    ));
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

  it('shows repository selection after GitHub authorization callback and saves selected repos', async () => {
    const user = userEvent.setup();
    const onConnected = vi.fn();
    const onOpenChange = vi.fn();
    mockGetGithubRepos.mockRejectedValueOnce(new Error('GitHub is not connected'));

    render(
      <GitHubConnectDialog
        open
        onOpenChange={onOpenChange}
        onConnected={onConnected}
        useDummy={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /connect github/i }));
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

  it('reuses an existing GitHub App installation before opening the install popup', async () => {
    const user = userEvent.setup();

    render(
      <GitHubConnectDialog
        open
        onOpenChange={vi.fn()}
        onConnected={vi.fn()}
        useDummy={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /connect github/i }));

    expect(await screen.findByText(/select repositories/i)).toBeInTheDocument();
    expect(window.open).not.toHaveBeenCalled();
  });

  it('opens directly to repository selection in manage mode and saves removals', async () => {
    const user = userEvent.setup();
    const onConnected = vi.fn();
    const onOpenChange = vi.fn();
    mockGetGithubRepos.mockResolvedValueOnce({
      selectedRepos: ['talent-dev/core', 'talent-dev/api'],
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

    render(
      <GitHubConnectDialog
        open
        mode="manage"
        onOpenChange={onOpenChange}
        onConnected={onConnected}
        useDummy={false}
      />,
    );

    expect(await screen.findByText(/select repositories/i)).toBeInTheDocument();
    expect(window.open).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText(/api/i));
    await user.click(screen.getByRole('button', { name: /continue with 1 repo/i }));

    await waitFor(() => {
      expect(mockSaveSelectedRepos).toHaveBeenCalledWith(['talent-dev/core']);
      expect(onConnected).toHaveBeenCalledTimes(1);
    });
  });

  it('lets users reopen GitHub App access settings from repository selection', async () => {
    const user = userEvent.setup();

    render(
      <GitHubConnectDialog
        open
        mode="manage"
        onOpenChange={vi.fn()}
        onConnected={vi.fn()}
        useDummy={false}
      />,
    );

    expect(await screen.findByText(/select repositories/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /manage github app access/i }));

    expect(window.open).toHaveBeenCalledWith(
      'https://api.example.com/datasource/connect/github?token=jwt&manage_access=1',
      'github-app-install',
      expect.stringContaining('popup=yes'),
    );
    expect(mockGetGithubOAuthUrl).toHaveBeenCalledWith({ manageAccess: true });
    expect(screen.getByText(/complete github authorization/i)).toBeInTheDocument();

    window.dispatchEvent(new MessageEvent('message', {
      origin: window.location.origin,
      data: { type: 'github-oauth-connected' },
    }));

    await waitFor(() => {
      expect(mockGetGithubRepos).toHaveBeenCalledTimes(2);
    });
  });

  it('renders all repositories inside a scrollable modal list', async () => {
    mockGetGithubRepos.mockResolvedValueOnce({
      selectedRepos: [],
      repos: Array.from({ length: 10 }, (_, index) => ({
        name: `repo-${index + 1}`,
        fullName: `talent-dev/repo-${index + 1}`,
        description: null,
        language: null,
        stars: 0,
        isPrivate: false,
        topics: [],
      })),
    });

    render(
      <GitHubConnectDialog
        open
        mode="manage"
        onOpenChange={vi.fn()}
        onConnected={vi.fn()}
        useDummy={false}
      />,
    );

    expect(await screen.findByText('repo-8')).toBeInTheDocument();
    expect(screen.getByText('repo-9')).toBeInTheDocument();
    expect(screen.getByText('repo-10')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveClass('overflow-hidden');
    expect(screen.getByRole('dialog')).toHaveStyle({
      height: 'calc(100vh - 2rem)',
      maxHeight: '720px',
    });
    expect(screen.getByTestId('github-repo-list')).toHaveClass('overflow-y-auto', 'overscroll-contain');
    expect(screen.queryByRole('button', { name: /show .* more repositories/i })).not.toBeInTheDocument();

  });
});
