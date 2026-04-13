'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  setupWalletSelector,
  type WalletSelector,
} from '@near-wallet-selector/core';
import {
  setupModal,
  type WalletSelectorModal,
} from '@near-wallet-selector/modal-ui';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { setupHereWallet } from '@near-wallet-selector/here-wallet';
import { setupEthereumWallets } from '@near-wallet-selector/ethereum-wallets';
import { createConfig, http } from '@wagmi/core';
import { mainnet } from 'viem/chains';

import '@near-wallet-selector/modal-ui/styles.css';

const NEAR_NETWORK =
  (process.env.NEXT_PUBLIC_NEAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';

const ESCROW_CONTRACT_ID =
  process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID || 'escrow.testnet';

/* ── Wagmi config for EVM wallet detection (MetaMask, etc.) ── */
const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: { [mainnet.id]: http() },
});

/* ── Context ── */
interface WalletContextType {
  selector: WalletSelector | null;
  modal: WalletSelectorModal | null;
  signedAccountId: string | null;
  signOut: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  selector: null,
  modal: null,
  signedAccountId: null,
  signOut: async () => {},
});

export function WalletSelectorProvider({ children }: { children: ReactNode }) {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [signedAccountId, setSignedAccountId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const sel = await setupWalletSelector({
        network: NEAR_NETWORK,
        modules: [
          setupMyNearWallet(),
          setupMeteorWallet(),
          setupHereWallet(),
          setupEthereumWallets({
            wagmiConfig,
            chainId: NEAR_NETWORK === 'mainnet' ? 397 : 398,
          }),
        ],
      });

      if (cancelled) return;

      const m = setupModal(sel, {
        contractId: ESCROW_CONTRACT_ID,
        theme: 'dark',
      });

      // Read initial state
      const state = sel.store.getState();
      const activeAccount = state.accounts.find((a) => a.active);
      if (activeAccount) {
        setSignedAccountId(activeAccount.accountId);
      }

      // Listen for account changes
      sel.subscribeOnAccountChange((accountId) => {
        setSignedAccountId(accountId || null);
      });

      setSelector(sel);
      setModal(m);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!selector) return;
    try {
      const wallet = await selector.wallet();
      await wallet.signOut();
    } catch {
      // wallet not signed in
    }
    setSignedAccountId(null);
  }, [selector]);

  return (
    <WalletContext.Provider
      value={{ selector, modal, signedAccountId, signOut }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
