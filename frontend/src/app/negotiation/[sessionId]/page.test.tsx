import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const mockGetNegotiationSession = vi.fn();
const mockGetNegotiationRounds = vi.fn();

vi.mock('@/lib/api', () => ({
  getNegotiationSession: (...args: unknown[]) => mockGetNegotiationSession(...args),
  getNegotiationRounds: (...args: unknown[]) => mockGetNegotiationRounds(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useParams: () => ({ sessionId: 'session-1' }),
  usePathname: () => '/negotiation/session-1',
  useSearchParams: () => new URLSearchParams(),
}));

import NegotiationMonitorPage from './page';

const MOCK_SESSION_ACTIVE = {
  id: 'session-1', seekerId: 'user-1', employerId: 'user-2', jobId: 'job-1',
  state: 'EMPLOYER_COUNTER', currentRound: 3, maxRounds: 7, onChainTxHash: null,
};

const MOCK_SESSION_AGREED = {
  ...MOCK_SESSION_ACTIVE, state: 'AGREED', currentRound: 5,
};

const MOCK_ROUNDS = [
  {
    id: 'round-1', sessionId: 'session-1', round: 1, actor: 'EMPLOYER_AGENT' as const,
    proposal: { salary: 65000000, remotePolicy: '4 days office', workingHours: '09:00-18:00', title: 'Senior Backend Engineer', startDate: '2026-07-01', probationMonths: 3 },
    reasoning: 'Initial offer based on job posting.', decision: 'COUNTER' as const,
  },
  {
    id: 'round-2', sessionId: 'session-1', round: 2, actor: 'SEEKER_AGENT' as const,
    proposal: { salary: 70000000, remotePolicy: '3 days office', workingHours: '09:00-18:00 flexible', title: 'Senior Backend Engineer', startDate: '2026-07-01', probationMonths: 3, signingBonus: 3000000 },
    reasoning: 'Counter based on market value analysis.', decision: 'COUNTER' as const,
  },
  {
    id: 'round-3', sessionId: 'session-1', round: 3, actor: 'EMPLOYER_AGENT' as const,
    proposal: { salary: 68000000, remotePolicy: '3 days office', workingHours: '09:00-18:00 flexible', title: 'Senior Backend Engineer', startDate: '2026-07-15', probationMonths: 3, signingBonus: 2000000 },
    reasoning: 'Salary raised to 68M. Accepted 3-day office.', decision: 'COUNTER' as const,
  },
];

describe('NegotiationMonitorPage', () => {
  beforeEach(() => {
    mockGetNegotiationSession.mockReset();
    mockGetNegotiationRounds.mockReset();
  });

  it('reads sessionId from useParams and displays it', async () => {
    mockGetNegotiationSession.mockResolvedValue(MOCK_SESSION_ACTIVE);
    mockGetNegotiationRounds.mockResolvedValue(MOCK_ROUNDS);
    render(<NegotiationMonitorPage />);
    await waitFor(() => {
      expect(screen.getByText('Session #session-1')).toBeInTheDocument();
    });
  });

  it('renders round dividers', async () => {
    mockGetNegotiationSession.mockResolvedValue(MOCK_SESSION_ACTIVE);
    mockGetNegotiationRounds.mockResolvedValue(MOCK_ROUNDS);
    render(<NegotiationMonitorPage />);
    await waitFor(() => {
      expect(screen.getByText('Round 1')).toBeInTheDocument();
      expect(screen.getByText('Round 2')).toBeInTheDocument();
      expect(screen.getByText('Round 3')).toBeInTheDocument();
    });
  });

  it('shows round progress', async () => {
    mockGetNegotiationSession.mockResolvedValue(MOCK_SESSION_ACTIVE);
    mockGetNegotiationRounds.mockResolvedValue(MOCK_ROUNDS);
    render(<NegotiationMonitorPage />);
    await waitFor(() => {
      expect(screen.getByText('3 / 7')).toBeInTheDocument();
    });
  });

  it('shows status badge', async () => {
    mockGetNegotiationSession.mockResolvedValue(MOCK_SESSION_ACTIVE);
    mockGetNegotiationRounds.mockResolvedValue(MOCK_ROUNDS);
    render(<NegotiationMonitorPage />);
    await waitFor(() => {
      expect(screen.getByText('Employer Counter')).toBeInTheDocument();
    });
  });

  it('shows agent participant badges', async () => {
    mockGetNegotiationSession.mockResolvedValue(MOCK_SESSION_ACTIVE);
    mockGetNegotiationRounds.mockResolvedValue(MOCK_ROUNDS);
    render(<NegotiationMonitorPage />);
    await waitFor(() => {
      expect(screen.getByText('Employer Agent')).toBeInTheDocument();
      expect(screen.getByText('Seeker Agent')).toBeInTheDocument();
    });
  });

  it('shows decision labels for rounds', async () => {
    mockGetNegotiationSession.mockResolvedValue(MOCK_SESSION_ACTIVE);
    mockGetNegotiationRounds.mockResolvedValue(MOCK_ROUNDS);
    render(<NegotiationMonitorPage />);
    await waitFor(() => {
      const counterOffers = screen.getAllByText('Proposed a counter-offer');
      expect(counterOffers).toHaveLength(3);
    });
  });

  it('shows Agreement Reached banner for AGREED state', async () => {
    mockGetNegotiationSession.mockResolvedValue(MOCK_SESSION_AGREED);
    mockGetNegotiationRounds.mockResolvedValue(MOCK_ROUNDS);
    render(<NegotiationMonitorPage />);
    await waitFor(() => {
      expect(screen.getByText('Agreement Reached!')).toBeInTheDocument();
    });
  });

  it('shows failed banner for FAILED state', async () => {
    mockGetNegotiationSession.mockResolvedValue({ ...MOCK_SESSION_ACTIVE, state: 'FAILED' });
    mockGetNegotiationRounds.mockResolvedValue(MOCK_ROUNDS);
    render(<NegotiationMonitorPage />);
    await waitFor(() => {
      expect(screen.getByText(/Negotiation Failed/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no rounds', async () => {
    mockGetNegotiationSession.mockResolvedValue(MOCK_SESSION_ACTIVE);
    mockGetNegotiationRounds.mockResolvedValue([]);
    render(<NegotiationMonitorPage />);
    await waitFor(() => {
      expect(screen.getByText('Waiting for agents to begin negotiation...')).toBeInTheDocument();
    });
  });

  it('polls every 5s when not in terminal state', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockGetNegotiationSession.mockResolvedValue(MOCK_SESSION_ACTIVE);
    mockGetNegotiationRounds.mockResolvedValue(MOCK_ROUNDS);

    render(<NegotiationMonitorPage />);

    // Initial call
    await waitFor(() => {
      expect(mockGetNegotiationSession).toHaveBeenCalledTimes(1);
    });

    // Advance 5s — should poll again
    await vi.advanceTimersByTimeAsync(5000);
    await waitFor(() => {
      expect(mockGetNegotiationSession).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });
});
