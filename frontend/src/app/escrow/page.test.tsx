import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

const mockGetEscrowBalance = vi.fn();
const mockGetEscrowPayments = vi.fn();
const mockDepositToEscrow = vi.fn();
const mockGetAgentPublicKey = vi.fn().mockResolvedValue('ed25519:agentkey');

vi.mock('@/lib/api', () => ({
  getEscrowBalance: (...args: unknown[]) => mockGetEscrowBalance(...args),
  getEscrowPayments: (...args: unknown[]) => mockGetEscrowPayments(...args),
  depositToEscrow: (...args: unknown[]) => mockDepositToEscrow(...args),
  getAgentPublicKey: (...args: unknown[]) => mockGetAgentPublicKey(...args),
}));

vi.mock('@/lib/wallet-selector', () => ({
  useWallet: () => ({
    selector: null,
    modal: null,
    signedAccountId: null,
    signOut: vi.fn(),
  }),
}));

vi.mock('@/lib/near', () => ({
  getEscrowBalanceOnChain: vi.fn().mockResolvedValue('5000000000000000000000000'),
  hasAgentKeyOnChain: vi.fn().mockResolvedValue(false),
}));

vi.mock('@near-js/transactions', () => ({
  actionCreators: { functionCall: vi.fn() },
}));

import EscrowPage from './page';

const MOCK_ESCROW = { employerId: 'user-2', balance: 5.0, agentKeySet: true };
const MOCK_PAYMENTS = [
  { id: 'pay-1', seekerId: 'user-1', amount: 0.5, timestamp: '2026-04-11T14:30:00Z', txHash: '0x111...' },
  { id: 'pay-2', seekerId: 'user-3', amount: 0.5, timestamp: '2026-04-11T15:00:00Z', txHash: '0x222...' },
];

describe('EscrowPage', () => {
  beforeEach(() => {
    mockGetEscrowBalance.mockResolvedValue(MOCK_ESCROW);
    mockGetEscrowPayments.mockResolvedValue(MOCK_PAYMENTS);
    mockDepositToEscrow.mockResolvedValue({ contractId: 'escrow.near', methodName: 'deposit', args: {}, deposit: '1000000' });
  });

  it('displays escrow balance', async () => {
    render(<EscrowPage />);

    await waitFor(() => {
      expect(screen.getByText('5.00')).toBeInTheDocument();
      expect(screen.getByText('Available Balance')).toBeInTheDocument();
    });
  });

  it('shows agent key status as Configured', async () => {
    render(<EscrowPage />);

    await waitFor(() => {
      expect(screen.getByText('Agent Key: Configured')).toBeInTheDocument();
    });
  });

  it('shows agent key status as Not Set when agentKeySet is false', async () => {
    mockGetEscrowBalance.mockResolvedValue({ ...MOCK_ESCROW, agentKeySet: false });
    render(<EscrowPage />);

    await waitFor(() => {
      expect(screen.getByText('Agent Key: Not Set')).toBeInTheDocument();
    });
  });

  it('renders payment history table', async () => {
    render(<EscrowPage />);

    await waitFor(() => {
      expect(screen.getByText('Payment History')).toBeInTheDocument();
      expect(screen.getByText('2 transactions')).toBeInTheDocument();
    });
  });

  it('renders payment rows with amounts', async () => {
    render(<EscrowPage />);

    await waitFor(() => {
      const amounts = screen.getAllByText('0.50 NEAR');
      expect(amounts).toHaveLength(2);
    });
  });

  it('renders payment rows with tx hashes', async () => {
    render(<EscrowPage />);

    await waitFor(() => {
      expect(screen.getByText('0x111...')).toBeInTheDocument();
      expect(screen.getByText('0x222...')).toBeInTheDocument();
    });
  });

  it('shows empty state when no payments', async () => {
    mockGetEscrowPayments.mockResolvedValue([]);
    render(<EscrowPage />);

    await waitFor(() => {
      expect(screen.getByText('No payment history yet')).toBeInTheDocument();
    });
  });

  it('has deposit input and button', async () => {
    render(<EscrowPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      expect(screen.getByText('Deposit')).toBeInTheDocument();
    });
  });
});
