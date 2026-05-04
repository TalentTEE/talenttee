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
import { setupWalletConnect } from '@near-wallet-selector/wallet-connect';
import { createConfig, http } from '@wagmi/core';
import { type Chain } from 'viem';

import '@near-wallet-selector/modal-ui/styles.css';

const NEAR_NETWORK =
  (process.env.NEXT_PUBLIC_NEAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';

const ESCROW_CONTRACT_ID =
  process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID || 'escrow.testnet';

const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

/* ── NEAR Protocol chain definitions for wagmi/viem ── */
const nearTestnet = {
  id: 398,
  name: 'NEAR Protocol Testnet',
  nativeCurrency: { name: 'NEAR', symbol: 'NEAR', decimals: 24 },
  rpcUrls: {
    default: { http: ['https://eth-rpc.testnet.near.org'] },
  },
  blockExplorers: {
    default: { name: 'NEAR Explorer', url: 'https://testnet.nearblocks.io' },
  },
  testnet: true,
} as const satisfies Chain;

const nearMainnet = {
  id: 397,
  name: 'NEAR Protocol',
  nativeCurrency: { name: 'NEAR', symbol: 'NEAR', decimals: 24 },
  rpcUrls: {
    default: { http: ['https://eth-rpc.mainnet.near.org'] },
  },
  blockExplorers: {
    default: { name: 'NEAR Explorer', url: 'https://nearblocks.io' },
  },
} as const satisfies Chain;

/* ── Wagmi config for EVM wallet detection (MetaMask, etc.) ── */
const wagmiConfig = createConfig({
  chains: [nearMainnet, nearTestnet],
  transports: { [nearMainnet.id]: http(), [nearTestnet.id]: http() },
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
    let observer: MutationObserver | null = null;

    async function init() {
      const modules = [
        setupMyNearWallet(),
        setupMeteorWallet(),
        setupHereWallet(),
        setupEthereumWallets({
          wagmiConfig,
          chainId: NEAR_NETWORK === 'mainnet' ? 397 : 398,
        }),
      ] as Parameters<typeof setupWalletSelector>[0]['modules'];

      if (WALLETCONNECT_PROJECT_ID) {
        const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://talenttee.app';
        modules.push(
          setupWalletConnect({
            projectId: WALLETCONNECT_PROJECT_ID,
            chainId: `near:${NEAR_NETWORK}`,
            metadata: {
              name: 'TalentTee',
              description: 'AI negotiation and hiring platform',
              url: appUrl,
              icons: [`${appUrl}/favicon.ico`],
            },
          }),
        );
      } else {
        console.warn('[WalletSelector] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set — WalletConnect module disabled');
      }

      const sel = await setupWalletSelector({
        network: NEAR_NETWORK,
        modules,
      });

      if (cancelled) return;

      const m = setupModal(sel, {
        contractId: ESCROW_CONTRACT_ID,
        theme: 'light',
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

      // Auto-reset modal on wallet connection error:
      // When a user cancels or fails, the modal shows an error view.
      // We detect it and reset back to the wallet list.
      observer = new MutationObserver(() => {
        const errorEl = document.querySelector(
          '.nws-modal-wrapper .error-wrapper'
        );
        if (errorEl) {
          m.hide();
          setTimeout(() => m.show(), 100);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      setSelector(sel);
      setModal(m);
    }

    init();
    return () => {
      cancelled = true;
      observer?.disconnect();
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
