import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock auth
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-2', nearAccountId: 'bob.testnet', role: 'EMPLOYER', publicKey: 'ed25519:key', createdAt: '2026-01-01' },
    login: vi.fn(),
    loginWithNear: vi.fn(),
    logout: vi.fn(),
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock API
const mockGetEscrowBalance = vi.fn();
const mockGetJobs = vi.fn();
const mockGetEmployerMatches = vi.fn();
const mockGetNegotiationSessions = vi.fn();

vi.mock('@/lib/api', () => ({
  getEscrowBalance: (...args: unknown[]) => mockGetEscrowBalance(...args),
  getJobs: (...args: unknown[]) => mockGetJobs(...args),
  getEmployerMatches: (...args: unknown[]) => mockGetEmployerMatches(...args),
  getNegotiationSessions: (...args: unknown[]) => mockGetNegotiationSessions(...args),
  USE_DUMMY: true,
}));

// Mock child components
vi.mock('@/components/dashboard/escrow-balance', () => ({
  EscrowBalance: () => <div data-testid="escrow-balance">EscrowBalance</div>,
}));
vi.mock('@/components/dashboard/job-list', () => ({
  JobList: () => <div data-testid="job-list">JobList</div>,
}));
vi.mock('@/components/dashboard/negotiation-list', () => ({
  NegotiationList: () => <div data-testid="negotiation-list">NegotiationList</div>,
}));
vi.mock('@/components/dashboard/negotiation-overview', () => ({
  NegotiationOverview: () => <div data-testid="negotiation-overview">NegotiationOverview</div>,
}));
vi.mock('@/components/dashboard/AIActionCard', () => ({
  AIActionCard: () => <div data-testid="ai-action-card">AIActionCard</div>,
}));
vi.mock('@/components/ui/skeleton-card', () => ({
  SkeletonGrid: () => <div data-testid="skeleton-grid">Loading...</div>,
}));

import EmployerDashboard from './page';

describe('EmployerDashboard', () => {
  beforeEach(() => {
    mockGetEscrowBalance.mockResolvedValue({ employerId: 'user-2', balance: 5.0, agentKeySet: true });
    mockGetJobs.mockResolvedValue([{ id: 'job-1', title: 'Frontend Engineer', status: 'ACTIVE' }]);
    mockGetEmployerMatches.mockResolvedValue([]);
    mockGetNegotiationSessions.mockResolvedValue([]);
  });

  it('calls API functions on mount and fetches matches for all jobs', async () => {
    render(<EmployerDashboard />);

    await waitFor(() => {
      expect(mockGetEscrowBalance).toHaveBeenCalledWith('bob.testnet');
      expect(mockGetJobs).toHaveBeenCalled();
      expect(mockGetEmployerMatches).toHaveBeenCalledWith('job-1');
      expect(mockGetNegotiationSessions).toHaveBeenCalled();
    });
  });

  it('renders welcome message with account name', async () => {
    render(<EmployerDashboard />);
    await waitFor(() => {
      expect(screen.getByText(/welcome back, bob/i)).toBeInTheDocument();
    });
  });

  it('renders onboarding layout when no sessions', async () => {
    mockGetNegotiationSessions.mockResolvedValue([]);
    render(<EmployerDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('ai-action-card')).toBeInTheDocument();
      expect(screen.getByTestId('escrow-balance')).toBeInTheDocument();
      expect(screen.getByTestId('job-list')).toBeInTheDocument();
      expect(screen.queryByTestId('negotiation-overview')).not.toBeInTheDocument();
    });
  });

  it('renders active layout when sessions exist', async () => {
    mockGetNegotiationSessions.mockResolvedValue([
      { id: 's1', jobId: 'job-1', state: 'EMPLOYER_OFFER', currentRound: 1, maxRounds: 5 },
    ]);
    render(<EmployerDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('negotiation-overview')).toBeInTheDocument();
      expect(screen.getByTestId('negotiation-list')).toBeInTheDocument();
      expect(screen.getByTestId('escrow-balance')).toBeInTheDocument();
      expect(screen.getByTestId('job-list')).toBeInTheDocument();
      expect(screen.queryByTestId('ai-action-card')).not.toBeInTheDocument();
    });
  });
});
