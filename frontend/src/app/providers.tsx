'use client';

import type { ReactNode } from 'react';
import { Web3AuthProvider } from '@/lib/web3auth';
import { WalletSelectorProvider } from '@/lib/wallet-selector';
import { UnifiedWalletProvider } from '@/lib/wallet-adapter';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/toast-provider';
import { SseProvider } from '@/lib/sse';
import { SmoothScroll } from '@/components/SmoothScroll';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Web3AuthProvider>
      <WalletSelectorProvider>
        <UnifiedWalletProvider>
          <AuthProvider>
            <SmoothScroll />
            <ToastProvider>
              <SseProvider>{children}</SseProvider>
            </ToastProvider>
          </AuthProvider>
        </UnifiedWalletProvider>
      </WalletSelectorProvider>
    </Web3AuthProvider>
  );
}
