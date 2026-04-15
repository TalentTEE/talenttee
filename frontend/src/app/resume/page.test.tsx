import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
const mockGetResume = vi.fn();
const mockGenerateResume = vi.fn();
const mockGetResumeStatus = vi.fn();

vi.mock('@/lib/api', () => ({
  getResume: (...args: unknown[]) => mockGetResume(...args),
  generateResume: (...args: unknown[]) => mockGenerateResume(...args),
  getResumeStatus: (...args: unknown[]) => mockGetResumeStatus(...args),
  USE_DUMMY: false,
}));

import ResumePage from './page';

const MOCK_RESUME = {
  id: 'resume-1',
  userId: 'user-1',
  status: 'COMPLETE' as const,
  skills: ['TypeScript', 'React', 'Next.js'],
  experience: [
    { role: 'Full-stack Developer', company: 'Tech Corp', period: '2023.03 - present', highlights: ['Built SaaS platform'] },
  ],
  education: [{ degree: 'B.S. Computer Science', institution: 'Seoul National University', year: '2021' }],
  summary: 'TypeScript full-stack developer with 3 years experience.',
  strengths: ['TypeScript full-stack capability'],
  improvementAreas: ['Limited large-scale traffic experience'],
  marketValueMin: 90000,
  marketValueMax: 120000,
  marketValueReasoning: 'Based on 3 years of TypeScript experience.',
  negotiationPoints: {
    strengths: ['High demand for TypeScript full-stack'],
    weaknesses: ['Limited high-traffic operations experience'],
  },
};

describe('ResumePage', () => {
  beforeEach(() => {
    mockGetResume.mockReset();
    mockGenerateResume.mockReset();
    mockGetResumeStatus.mockReset();
  });

  it('shows Generate Resume button when no resume exists', async () => {
    mockGetResume.mockRejectedValue(new Error('Not found'));

    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByText('Generate Resume')).toBeInTheDocument();
    });
  });

  it('displays resume content when resume is COMPLETED', async () => {
    mockGetResume.mockResolvedValue(MOCK_RESUME);

    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByText('AI Summary')).toBeInTheDocument();
      expect(screen.getByText(/TypeScript full-stack developer/)).toBeInTheDocument();
    });
  });

  it('shows skills tags for completed resume', async () => {
    mockGetResume.mockResolvedValue(MOCK_RESUME);

    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('Next.js')).toBeInTheDocument();
    });
  });

  it('shows market value in formatted currency', async () => {
    mockGetResume.mockResolvedValue(MOCK_RESUME);

    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByText('Estimated Market Value')).toBeInTheDocument();
      // 90000 → $90,000, 120000 → $120,000
      expect(screen.getByText(/\$90,000/)).toBeInTheDocument();
    });
  });

  it('shows experience section', async () => {
    mockGetResume.mockResolvedValue(MOCK_RESUME);

    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByText('Full-stack Developer')).toBeInTheDocument();
      expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    });
  });

  it('shows education section', async () => {
    mockGetResume.mockResolvedValue(MOCK_RESUME);

    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByText('B.S. Computer Science')).toBeInTheDocument();
      expect(screen.getByText('Seoul National University')).toBeInTheDocument();
    });
  });

  it('shows strengths and improvement areas', async () => {
    mockGetResume.mockResolvedValue(MOCK_RESUME);

    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByText('Strengths')).toBeInTheDocument();
      expect(screen.getByText('TypeScript full-stack capability')).toBeInTheDocument();
      expect(screen.getByText('Areas to Improve')).toBeInTheDocument();
      expect(screen.getByText('Limited large-scale traffic experience')).toBeInTheDocument();
    });
  });

  it('shows negotiation points', async () => {
    mockGetResume.mockResolvedValue(MOCK_RESUME);

    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByText('Negotiation Points')).toBeInTheDocument();
      expect(screen.getByText('Leverage Points')).toBeInTheDocument();
      expect(screen.getByText('Watch Out For')).toBeInTheDocument();
    });
  });

  it('hides Generate button when resume is already completed', async () => {
    mockGetResume.mockResolvedValue(MOCK_RESUME);

    render(<ResumePage />);

    await waitFor(() => {
      expect(screen.getByText('AI Summary')).toBeInTheDocument();
    });

    expect(screen.queryByText('Generate Resume')).not.toBeInTheDocument();
  });
});
