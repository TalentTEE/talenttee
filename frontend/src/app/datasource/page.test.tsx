import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockGetDatasourceStatus = vi.fn();
const mockConnectDatasourceMock = vi.fn();
const mockConnectGithubOAuth = vi.fn();

vi.mock('@/lib/api', () => ({
  getDatasourceStatus: (...args: unknown[]) => mockGetDatasourceStatus(...args),
  connectDatasourceMock: (...args: unknown[]) => mockConnectDatasourceMock(...args),
  connectGithubOAuth: (...args: unknown[]) => mockConnectGithubOAuth(...args),
  USE_DUMMY: true,
}));

import DatasourcePage from './page';

const MOCK_CONNECTIONS = [
  { id: 'ds-1', userId: 'user-1', provider: 'github', status: 'CONNECTED', lastSyncAt: '2026-04-11T08:00:00Z' },
  { id: 'ds-2', userId: 'user-1', provider: 'slack', status: 'MOCK', lastSyncAt: '2026-04-11T08:00:00Z' },
  { id: 'ds-3', userId: 'user-1', provider: 'discord', status: 'DISCONNECTED', lastSyncAt: null },
  { id: 'ds-4', userId: 'user-1', provider: 'gov24', status: 'DISCONNECTED', lastSyncAt: null },
];

describe('DatasourcePage', () => {
  beforeEach(() => {
    mockGetDatasourceStatus.mockResolvedValue(MOCK_CONNECTIONS);
    mockConnectDatasourceMock.mockResolvedValue({
      id: 'ds-new', userId: 'user-1', provider: 'discord', status: 'MOCK', lastSyncAt: new Date().toISOString(),
    });
  });

  it('renders all 4 provider cards', async () => {
    render(<DatasourcePage />);

    await waitFor(() => {
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Slack')).toBeInTheDocument();
      expect(screen.getByText('Discord')).toBeInTheDocument();
      expect(screen.getByText('Gov24')).toBeInTheDocument();
    });
  });

  it('shows connected/disconnected status', async () => {
    render(<DatasourcePage />);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('Mock Connected')).toBeInTheDocument();
      expect(screen.getAllByText('Disconnected')).toHaveLength(2);
    });
  });

  it('displays connection progress', async () => {
    render(<DatasourcePage />);

    await waitFor(() => {
      expect(screen.getByText('2/4')).toBeInTheDocument();
    });
  });

  it('shows Re-sync button for connected providers', async () => {
    render(<DatasourcePage />);

    await waitFor(() => {
      expect(screen.getAllByText('Re-sync Data').length).toBeGreaterThan(0);
    });
  });

  it('shows Connect button for disconnected providers', async () => {
    render(<DatasourcePage />);

    await waitFor(() => {
      expect(screen.getAllByText('Connect').length).toBeGreaterThan(0);
    });
  });

  it('calls connectDatasourceMock when clicking Connect on a disconnected provider', async () => {
    const user = userEvent.setup();
    render(<DatasourcePage />);

    await waitFor(() => {
      expect(screen.getAllByText('Connect').length).toBeGreaterThan(0);
    });

    const connectButtons = screen.getAllByText('Connect');
    await user.click(connectButtons[0]);

    await waitFor(() => {
      expect(mockConnectDatasourceMock).toHaveBeenCalled();
    });
  });
});
