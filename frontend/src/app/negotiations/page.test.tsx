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
  getJobs: vi.fn().mockResolvedValue([]),
}));

import NegotiationsPage from './page';

const MOCK_SESSIONS = [
  { id: 'session-1', seekerId: 'user-1', employerId: 'user-2', jobId: 'job-1', state: 'AGREED', currentRound: 5, maxRounds: 7, seekerApproved: false, employerApproved: false, onChainTxHash: null },
  { id: 'session-2', seekerId: 'user-1', employerId: 'user-2', jobId: 'job-2', state: 'FAILED', currentRound: 7, maxRounds: 7, seekerApproved: false, employerApproved: false, onChainTxHash: null },
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

  it('renders Agreement Reached and Failed sections', async () => {
    render(<NegotiationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Agreement Reached')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  it('shows session rows with job titles from matches', async () => {
    render(<NegotiationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Senior Backend Developer - Company A')).toBeInTheDocument();
      expect(screen.getByText('Full-stack Developer - Company B')).toBeInTheDocument();
    });
  });

  it('generates correct links for agreed sessions', async () => {
    render(<NegotiationsPage />);

    await waitFor(() => {
      const links = screen.getAllByRole('link');
      const hrefs = links.map((l) => l.getAttribute('href'));
      expect(hrefs).toContain('/negotiation/session-1/agree');
    });
  });

  it('generates correct links for failed sessions', async () => {
    render(<NegotiationsPage />);

    await waitFor(() => {
      const links = screen.getAllByRole('link');
      const hrefs = links.map((l) => l.getAttribute('href'));
      expect(hrefs).toContain('/negotiation/session-2');
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
