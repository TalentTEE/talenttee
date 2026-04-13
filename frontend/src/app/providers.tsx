'use client';

import type { ReactNode } from 'react';
import { WalletSelectorProvider } from '@/lib/wallet-selector';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/toast-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletSelectorProvider>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </WalletSelectorProvider>
  );
}
