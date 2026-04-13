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

const mockGetNegotiationSessions = vi.fn();
const mockGetSeekerMatches = vi.fn();

vi.mock('@/lib/api', () => ({
  getNegotiationSessions: (...args: unknown[]) => mockGetNegotiationSessions(...args),
  getSeekerMatches: (...args: unknown[]) => mockGetSeekerMatches(...args),
  getEmployerMatches: vi.fn().mockResolvedValue([]),
}));

import NegotiationsPage from './page';

const MOCK_SESSIONS = [
  { id: 'session-1', seekerId: 'user-1', employerId: 'user-2', jobId: 'job-1', state: 'EMPLOYER_COUNTER', currentRound: 3, maxRounds: 7, onChainTxHash: null },
  { id: 'session-2', seekerId: 'user-1', employerId: 'user-2', jobId: 'job-2', state: 'AGREED', currentRound: 5, maxRounds: 7, onChainTxHash: '0xabc123' },
];

const MOCK_MATCHES = [
  { id: 'match-1', seekerId: 'user-1', jobId: 'job-1', annScore: 0.92, rerankScore: 0.87, finalRank: 1, seekerAgreed: false, employerAgreed: false, seekerSkills: ['TypeScript'], seekerExperienceYears: '3-5y', jobTitle: 'Senior Backend Developer', companyName: 'Company A' },
  { id: 'match-2', seekerId: 'user-1', jobId: 'job-2', annScore: 0.88, rerankScore: 0.85, finalRank: 2, seekerAgreed: false, employerAgreed: false, seekerSkills: ['React'], seekerExperienceYears: '3-5y', jobTitle: 'Full-stack Developer', companyName: 'Company B' },
];

describe('NegotiationsPage', () => {
  beforeEach(() => {
    mockGetNegotiationSessions.mockResolvedValue(MOCK_SESSIONS);
    mockGetSeekerMatches.mockResolvedValue(MOCK_MATCHES);
  });

  it('renders In Progress and Completed sections', async () => {
    render(<NegotiationsPage />);

    await waitFor(() => {
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  it('shows session rows with job titles', async () => {
    render(<NegotiationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Senior Backend Developer - Company A')).toBeInTheDocument();
      expect(screen.getByText('Full-stack Developer - Company B')).toBeInTheDocument();
    });
  });

  it('shows Negotiating status for in-progress sessions', async () => {
    render(<NegotiationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Negotiating')).toBeInTheDocument();
    });
  });

  it('shows Agreed status for completed sessions', async () => {
    render(<NegotiationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Agreed')).toBeInTheDocument();
    });
  });

  it('shows round progress for in-progress session', async () => {
    render(<NegotiationsPage />);

    await waitFor(() => {
      expect(screen.getByText('R3/7')).toBeInTheDocument();
    });
  });

  it('generates correct links for sessions', async () => {
    render(<NegotiationsPage />);

    await waitFor(() => {
      const links = screen.getAllByRole('link');
      const hrefs = links.map((l) => l.getAttribute('href'));
      expect(hrefs).toContain('/negotiation/session-1');
      expect(hrefs).toContain('/negotiation/session-2/agree');
    });
  });

  it('shows empty state when no sessions', async () => {
    mockGetNegotiationSessions.mockResolvedValue([]);
    render(<NegotiationsPage />);

    await waitFor(() => {
      expect(screen.getByText('No negotiations yet')).toBeInTheDocument();
    });
  });
});
