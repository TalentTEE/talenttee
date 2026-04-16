import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock auth
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', nearAccountId: 'alice.testnet', role: 'SEEKER', publicKey: 'ed25519:key', createdAt: '2026-01-01' },
    login: vi.fn(),
    loginWithNear: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock API
const mockGetDatasourceStatus = vi.fn();
const mockGetResume = vi.fn();
const mockGetSeekerMatches = vi.fn();
const mockGetNegotiationSessions = vi.fn();

vi.mock('@/lib/api', () => ({
  getDatasourceStatus: (...args: unknown[]) => mockGetDatasourceStatus(...args),
  getResume: (...args: unknown[]) => mockGetResume(...args),
  getSeekerMatches: (...args: unknown[]) => mockGetSeekerMatches(...args),
  getNegotiationSessions: (...args: unknown[]) => mockGetNegotiationSessions(...args),
  updateJobSeekingStatus: vi.fn(),
  getJobSeekingStatus: vi.fn().mockResolvedValue({ jobSeeking: false }),
  USE_DUMMY: true,
}));

// Mock child components to isolate the page
vi.mock('@/components/dashboard/datasource-status', () => ({
  DatasourceStatus: () => <div data-testid="datasource-status">DatasourceStatus</div>,
}));
vi.mock('@/components/dashboard/resume-summary', () => ({
  ResumeSummary: () => <div data-testid="resume-summary">ResumeSummary</div>,
}));
vi.mock('@/components/dashboard/market-value-card', () => ({
  MarketValueCard: () => <div data-testid="market-value-card">MarketValueCard</div>,
}));
vi.mock('@/components/dashboard/negotiation-list', () => ({
  NegotiationList: () => <div data-testid="negotiation-list">NegotiationList</div>,
}));
vi.mock('@/components/dashboard/negotiation-overview', () => ({
  NegotiationOverview: () => <div data-testid="negotiation-overview">NegotiationOverview</div>,
}));

import SeekerDashboard from './page';

describe('SeekerDashboard', () => {
  beforeEach(() => {
    mockGetDatasourceStatus.mockResolvedValue([]);
    mockGetResume.mockResolvedValue(null);
    mockGetSeekerMatches.mockResolvedValue([]);
    mockGetNegotiationSessions.mockResolvedValue([]);
  });

  it('calls 4 API functions on mount', async () => {
    mockGetResume.mockResolvedValue({ status: 'COMPLETE' });
    render(<SeekerDashboard />);

    await waitFor(() => {
      expect(mockGetDatasourceStatus).toHaveBeenCalled();
      expect(mockGetResume).toHaveBeenCalled();
      expect(mockGetSeekerMatches).toHaveBeenCalled();
      expect(mockGetNegotiationSessions).toHaveBeenCalled();
    });
  });

  it('renders welcome message with account name', async () => {
    render(<SeekerDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/welcome back, alice/i)).toBeInTheDocument();
    });
  });

  describe('Phase A: Onboarding (no sessions)', () => {
    it('renders AIActionCard and common sections, not NegotiationOverview', async () => {
      mockGetNegotiationSessions.mockResolvedValue([]);
      render(<SeekerDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('datasource-status')).toBeInTheDocument();
        expect(screen.getByTestId('resume-summary')).toBeInTheDocument();
        expect(screen.getByTestId('market-value-card')).toBeInTheDocument();
      });

      // Phase A: no NegotiationOverview or NegotiationList
      expect(screen.queryByTestId('negotiation-overview')).not.toBeInTheDocument();
      expect(screen.queryByTestId('negotiation-list')).not.toBeInTheDocument();
    });
  });

  describe('Phase B: Active (sessions exist)', () => {
    const mockSessions = [
      { id: 'session-1', seekerId: 'user-1', employerId: 'user-2', jobId: 'job-1', state: 'EMPLOYER_COUNTER', currentRound: 3, maxRounds: 7, onChainTxHash: null },
    ];

    it('renders NegotiationOverview and NegotiationList, not AIActionCard', async () => {
      mockGetNegotiationSessions.mockResolvedValue(mockSessions);
      render(<SeekerDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('negotiation-overview')).toBeInTheDocument();
        expect(screen.getByTestId('negotiation-list')).toBeInTheDocument();
      });

      // Common sections still present
      expect(screen.getByTestId('resume-summary')).toBeInTheDocument();
      expect(screen.getByTestId('market-value-card')).toBeInTheDocument();
      expect(screen.getByTestId('datasource-status')).toBeInTheDocument();
    });
  });
});
