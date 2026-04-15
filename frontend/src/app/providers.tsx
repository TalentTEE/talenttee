'use client';

import type { ReactNode } from 'react';
import { WalletSelectorProvider } from '@/lib/wallet-selector';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/toast-provider';
import { SmoothScroll } from '@/components/SmoothScroll';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletSelectorProvider>
      <AuthProvider>
        <SmoothScroll />
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </WalletSelectorProvider>
  );
}
