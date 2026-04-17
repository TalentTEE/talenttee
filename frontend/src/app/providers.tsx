'use client';

import type { ReactNode } from 'react';
import { WalletSelectorProvider } from '@/lib/wallet-selector';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/toast-provider';
import { SseProvider } from '@/lib/sse';
import { SmoothScroll } from '@/components/SmoothScroll';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletSelectorProvider>
      <AuthProvider>
        <SmoothScroll />
        <ToastProvider>
          <SseProvider>{children}</SseProvider>
        </ToastProvider>
      </AuthProvider>
    </WalletSelectorProvider>
  );
}
