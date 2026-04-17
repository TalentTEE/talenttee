import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = vi.fn();

const mockGetAgreement = vi.fn();
const mockApproveAgreement = vi.fn();
const mockGetNegotiationRounds = vi.fn().mockResolvedValue([]);
const mockRejectAgreement = vi.fn();
const mockGetInterviewMessages = vi.fn().mockResolvedValue([]);
const mockSendInterviewMessage = vi.fn();

vi.mock('@/lib/api', () => ({
  getAgreement: (...args: unknown[]) => mockGetAgreement(...args),
  approveAgreement: (...args: unknown[]) => mockApproveAgreement(...args),
  getNegotiationRounds: (...args: unknown[]) => mockGetNegotiationRounds(...args),
  getNegotiationSession: vi.fn().mockResolvedValue({}),
  rejectAgreement: (...args: unknown[]) => mockRejectAgreement(...args),
  getInterviewMessages: (...args: unknown[]) => mockGetInterviewMessages(...args),
  sendInterviewMessage: (...args: unknown[]) => mockSendInterviewMessage(...args),
  USE_DUMMY: false,
}));

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', nearAccountId: 'alice.testnet', role: 'SEEKER', publicKey: 'ed25519:key', createdAt: '2026-01-01' },
    login: vi.fn(), loginWithNear: vi.fn(), logout: vi.fn(), isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/sse', () => ({
  useSse: () => ({ on: vi.fn(() => vi.fn()) }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  useParams: () => ({ sessionId: 'session-2' }),
  usePathname: () => '/negotiation/session-2/agree',
  useSearchParams: () => new URLSearchParams(),
}));

import AgreementPage from './page';

const MOCK_AGREEMENT = {
  sessionId: 'session-2',
  agreementHash: 'sha256:a1b2c3d4e5f6...',
  summary: {
    positionTitle: 'Full-stack Developer',
    agreedSalary: 65000000,
    startDate: '2026-08-01',
    negotiationRounds: 5,
    remotePolicy: 'Full remote',
    probationMonths: 3,
  },
  seekerApproved: false,
  employerApproved: false,
  onChainTxHash: null,
};

const MOCK_AGREEMENT_APPROVED = {
  ...MOCK_AGREEMENT,
  seekerApproved: true,
  employerApproved: true,
  onChainTxHash: '0xabc123def456',
};

describe('AgreementPage', () => {
  beforeEach(() => {
    mockGetAgreement.mockReset();
    mockApproveAgreement.mockReset();
  });

  it('shows loading state initially', () => {
    mockGetAgreement.mockImplementation(() => new Promise(() => {}));
    render(<AgreementPage />);
    expect(screen.getByText('Loading agreement...')).toBeInTheDocument();
  });

  it('displays agreement details', async () => {
    mockGetAgreement.mockResolvedValue(MOCK_AGREEMENT);
    render(<AgreementPage />);

    await waitFor(() => {
      expect(screen.getByText('Agreement Reached')).toBeInTheDocument();
      expect(screen.getByText('Full-stack Developer')).toBeInTheDocument();
      expect(screen.getByText('$65M')).toBeInTheDocument();
      expect(screen.getByText('Full remote')).toBeInTheDocument();
      expect(screen.getByText('2026-08-01')).toBeInTheDocument();
      expect(screen.getByText('3 months')).toBeInTheDocument();
      expect(screen.getByText('5 rounds')).toBeInTheDocument();
    });
  });

  it('displays agreement hash', async () => {
    mockGetAgreement.mockResolvedValue(MOCK_AGREEMENT);
    render(<AgreementPage />);

    await waitFor(() => {
      expect(screen.getByText('sha256:a1b2c3d4e5f6...')).toBeInTheDocument();
    });
  });

  it('shows Approve and Reject buttons', async () => {
    mockGetAgreement.mockResolvedValue(MOCK_AGREEMENT);
    render(<AgreementPage />);

    await waitFor(() => {
      expect(screen.getByText('Approve & Record On-Chain')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });
  });

  it('calls approveAgreement on approve click', async () => {
    mockGetAgreement.mockResolvedValue(MOCK_AGREEMENT);
    mockApproveAgreement.mockResolvedValue(undefined);
    // After approval, getAgreement returns updated data
    mockGetAgreement.mockResolvedValueOnce(MOCK_AGREEMENT).mockResolvedValueOnce(MOCK_AGREEMENT_APPROVED);

    const user = userEvent.setup();
    render(<AgreementPage />);

    await waitFor(() => {
      expect(screen.getByText('Approve & Record On-Chain')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Approve & Record On-Chain'));

    await waitFor(() => {
      expect(mockApproveAgreement).toHaveBeenCalledWith('session-2');
    });
  });

  it('shows rejected state on reject click', async () => {
    mockGetAgreement.mockResolvedValue(MOCK_AGREEMENT);

    const user = userEvent.setup();
    render(<AgreementPage />);

    await waitFor(() => {
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Reject'));

    expect(screen.getByText('Agreement Rejected')).toBeInTheDocument();
  });

  it('auto-displays TX hash for already approved agreement', async () => {
    mockGetAgreement.mockResolvedValue(MOCK_AGREEMENT_APPROVED);

    render(<AgreementPage />);

    await waitFor(() => {
      expect(screen.getByText('On-Chain Transaction')).toBeInTheDocument();
      expect(screen.getByText('0xabc123def456')).toBeInTheDocument();
    });
  });
});
