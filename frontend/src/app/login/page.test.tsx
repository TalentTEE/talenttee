import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

const mockLoginByAccount = vi.fn();
const mockLogin = vi.fn();
const mockConnectWeb3Auth = vi.fn();
const mockShowWalletSelector = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    loginByAccount: mockLoginByAccount,
    login: mockLogin,
  }),
}));

vi.mock('@/lib/wallet-adapter', () => ({
  useUnifiedWallet: () => ({
    accountId: null,
    connectWeb3Auth: mockConnectWeb3Auth,
    showWalletSelector: mockShowWalletSelector,
    loginMethod: null,
    signOut: mockSignOut,
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
  });

  it('shows a direct wallet connect button for NEAR/MetaMask users', () => {
    render(<LoginPage />);

    expect(screen.getByRole('button', { name: /connect near or walletconnect/i })).toBeInTheDocument();
  });

  it('opens wallet selector when wallet button is clicked', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /connect near or walletconnect/i }));

    expect(mockShowWalletSelector).toHaveBeenCalledTimes(1);
  });

  it('clears previous wallet session before starting kakao social login', async () => {
    const user = userEvent.setup();
    mockConnectWeb3Auth.mockResolvedValue(null);

    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /continue with kakao/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockConnectWeb3Auth).toHaveBeenCalledWith('kakao');
    });
  });
});
