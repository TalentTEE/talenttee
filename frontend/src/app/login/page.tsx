'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useWallet } from '@/lib/wallet-selector';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { loginByAccount } = useAuth();
  const { modal, signedAccountId } = useWallet();
  const router = useRouter();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const waitingForWallet = useRef(false);

  const doLogin = useCallback(async (accountId: string) => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await loginByAccount(accountId);
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        router.push(user.role === 'SEEKER' ? '/dashboard/seeker' : '/dashboard/employer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  }, [loginByAccount, router]);

  // When wallet connects and we're waiting, auto-login
  useEffect(() => {
    if (!waitingForWallet.current || !signedAccountId) return;
    waitingForWallet.current = false;
    doLogin(signedAccountId);
  }, [signedAccountId, doLogin]);

  const handleConnectWallet = async () => {
    if (!modal) return;
    // If already signed in, login directly without disconnecting
    if (signedAccountId) {
      doLogin(signedAccountId);
      return;
    }
    waitingForWallet.current = true;
    modal.show();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0e0e0e] px-6 py-12 selection:bg-primary selection:text-primary-foreground">
      {/* Back link */}
      <div className="w-full max-w-md mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Home
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-accent mb-5 ring-1 ring-border/20">
          <span className="material-symbols-outlined text-primary text-4xl">account_balance_wallet</span>
        </div>
        <h1 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3">
          Welcome back
        </h1>
        <p className="text-muted-foreground text-lg">
          Connect your wallet to continue.
        </p>
      </div>

      {/* Login - Connect Wallet */}
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border/10 bg-card p-8">
          <button
            onClick={handleConnectWallet}
            disabled={isLoggingIn || !modal}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold tracking-wide hover:bg-primary/90 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoggingIn ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                Logging in...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                Connect Wallet
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}
      </div>

      {/* Footer link */}
      <p className="mt-8 text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-primary hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
