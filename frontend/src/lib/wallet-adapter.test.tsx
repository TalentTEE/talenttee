import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnifiedWalletProvider, useUnifiedWallet } from './wallet-adapter';

const secretKey = new Uint8Array(64).map((_, index) => index + 1);
const mockConnect = vi.fn();
const mockSelectorWallet = vi.fn();

vi.mock('./web3auth', () => ({
  useWeb3Auth: () => ({
    isConnected: false,
    accountId: null,
    publicKey: null,
    ed25519SecretKey: null,
    userInfo: null,
    connect: mockConnect,
    disconnect: vi.fn(),
  }),
}));

vi.mock('./wallet-selector', () => ({
  useWallet: () => ({
    selector: { wallet: mockSelectorWallet },
    modal: null,
    signedAccountId: null,
    signOut: vi.fn(),
  }),
}));

function ConnectAndSignProbe() {
  const { connectWeb3Auth, signMessage } = useUnifiedWallet();

  return (
    <button
      type="button"
      onClick={async () => {
        await connectWeb3Auth('google');
        await signMessage({
          message: 'a'.repeat(64),
          recipient: 'talent-tee',
          nonce: Buffer.alloc(32, 1),
        });
      }}
    >
      Connect and sign
    </button>
  );
}

describe('UnifiedWalletProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue({
      accountId: 'implicit-account',
      publicKey: 'ed25519:test',
      secretKey,
    });
    mockSelectorWallet.mockRejectedValue(new Error('No wallet selected'));
  });

  it('uses the freshly connected Web3Auth key before React state catches up', async () => {
    const user = userEvent.setup();
    render(
      <UnifiedWalletProvider>
        <ConnectAndSignProbe />
      </UnifiedWalletProvider>,
    );

    await user.click(screen.getByRole('button', { name: /connect and sign/i }));

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledWith('google');
      expect(mockSelectorWallet).not.toHaveBeenCalled();
    });
  });
});
