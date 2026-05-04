import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DatasourcePage from './page';

const mockGetDatasourceStatus = vi.fn();
const mockGetResume = vi.fn();
const mockGetPreferences = vi.fn();
const mockGenerateResume = vi.fn();
const mockGetResumeStatus = vi.fn();
const mockGetDatasourceData = vi.fn();
const mockDisconnectDatasource = vi.fn();
const mockConnectDatasourceMock = vi.fn();
const mockUpdatePreferences = vi.fn();
const mockUpdatePdfData = vi.fn();
const mockReplace = vi.fn();
const mockAddToast = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      nearAccountId: 'alice.testnet',
      role: 'SEEKER',
      publicKey: 'ed25519:key',
      createdAt: '2026-01-01',
    },
  }),
}));

vi.mock('@/lib/api', () => ({
  getDatasourceStatus: (...args: unknown[]) => mockGetDatasourceStatus(...args),
  getDatasourceData: (...args: unknown[]) => mockGetDatasourceData(...args),
  connectDatasourceMock: (...args: unknown[]) => mockConnectDatasourceMock(...args),
  disconnectDatasource: (...args: unknown[]) => mockDisconnectDatasource(...args),
  getResume: (...args: unknown[]) => mockGetResume(...args),
  generateResume: (...args: unknown[]) => mockGenerateResume(...args),
  getResumeStatus: (...args: unknown[]) => mockGetResumeStatus(...args),
  getPreferences: (...args: unknown[]) => mockGetPreferences(...args),
  updatePreferences: (...args: unknown[]) => mockUpdatePreferences(...args),
  updatePdfData: (...args: unknown[]) => mockUpdatePdfData(...args),
  USE_DUMMY: false,
}));

vi.mock('@/components/ui/toast-provider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/components/datasource/github-connect-dialog', () => ({
  GitHubConnectDialog: ({ open, mode }: { open: boolean; mode?: string }) => (
    open ? <div data-testid="github-dialog">GitHub dialog mode: {mode}</div> : null
  ),
}));

vi.mock('@/components/datasource/slack-connect-dialog', () => ({
  SlackConnectDialog: () => null,
}));

vi.mock('@/components/datasource/discord-connect-dialog', () => ({
  DiscordConnectDialog: () => null,
}));

vi.mock('@/components/datasource/gov24-connect-dialog', () => ({
  Gov24ConnectDialog: () => null,
}));

vi.mock('@/components/datasource/pdf-upload-dialog', () => ({
  PdfUploadDialog: () => null,
}));

vi.mock('@/components/datasource/datasource-detail-view', () => ({
  DatasourceDetailView: () => <div>Datasource detail</div>,
}));

vi.mock('@/components/ui/AINudge', () => ({
  AINudge: () => null,
}));

describe('DatasourcePage GitHub repository management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPreferences.mockResolvedValue({ salaryFloor: 60000, salaryCeiling: null, autoNegLimit: 5 });
    mockGetResume.mockResolvedValue({
      id: 'resume-1',
      userId: 'user-1',
      status: 'COMPLETE',
      skills: [],
      experience: [],
      education: [],
      summary: 'Ready',
      strengths: [],
      improvementAreas: [],
      marketValueMin: null,
      marketValueMax: null,
      marketValueReasoning: null,
      negotiationPoints: null,
    });
    mockGetDatasourceStatus.mockResolvedValue([
      {
        id: 'conn-1',
        userId: 'user-1',
        provider: 'GITHUB',
        status: 'CONNECTED',
        lastSyncedAt: '2026-05-04T08:00:00.000Z',
      },
    ]);
  });

  it('opens GitHub repository management for an already connected source', async () => {
    const user = userEvent.setup();
    render(<DatasourcePage />);

    const manageButton = await screen.findByRole('button', { name: /manage repositories/i });
    await user.click(manageButton);

    await waitFor(() => {
      expect(screen.getByTestId('github-dialog')).toHaveTextContent('mode: manage');
    });
  });

  it('keeps GitHub disconnect aligned to the card action edge when sync time is missing', async () => {
    mockGetDatasourceStatus.mockResolvedValueOnce([
      {
        id: 'conn-1',
        userId: 'user-1',
        provider: 'GITHUB',
        status: 'CONNECTED',
      },
    ]);

    render(<DatasourcePage />);

    const disconnectButton = await screen.findByRole('button', { name: /disconnect/i });
    expect(disconnectButton).toHaveClass('ml-auto');
  });

  it('uses upload copy for the PDF resume source action', async () => {
    mockGetDatasourceStatus.mockResolvedValueOnce([]);

    render(<DatasourcePage />);

    expect(await screen.findByText('PDF Resume')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload pdf/i })).toBeInTheDocument();
  });
});
