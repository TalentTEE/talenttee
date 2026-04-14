'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useWallet } from '@/lib/wallet-selector';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { loginByAccount, login } = useAuth();
  const { modal, signedAccountId } = useWallet();
  const useDummy = process.env.NEXT_PUBLIC_USE_DUMMY === 'true';
  const router = useRouter();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletReady, setWalletReady] = useState(false);

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

  // When wallet connects after modal, mark ready so user can click to proceed.
  // Don't auto-login from useEffect — wallet.signMessage() needs a direct user
  // gesture or the browser blocks the popup.
  useEffect(() => {
    if (signedAccountId) {
      setWalletReady(true);
    }
  }, [signedAccountId]);

  const handleConnectWallet = async () => {
    if (!modal) return;
    // Wallet already connected — login directly from click handler
    if (signedAccountId) {
      doLogin(signedAccountId);
      return;
    }
    modal.show();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-12 selection:bg-primary selection:text-primary-foreground">
      {/* Back link */}
      <div className="w-full max-w-md mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-base text-muted-foreground hover:text-foreground transition-colors"
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
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-base font-bold tracking-wide hover:bg-primary/90 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoggingIn ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                Logging in...
              </>
            ) : walletReady && signedAccountId ? (
              <>
                <span className="material-symbols-outlined text-base">login</span>
                Continue as {signedAccountId.split('.')[0]}
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
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-base text-center">
            {error}
          </div>
        )}

        {/* Demo Quick Login (dummy mode only) */}
        {useDummy && (
          <div className="mt-6 rounded-2xl border border-border/10 bg-card p-6">
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold mb-4 text-center">Demo Login</p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setIsLoggingIn(true);
                  try {
                    await login('SEEKER');
                    router.push('/dashboard/seeker');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Login failed');
                  } finally {
                    setIsLoggingIn(false);
                  }
                }}
                disabled={isLoggingIn}
                className="flex-1 py-3 rounded-xl border border-border/10 bg-accent/50 text-base font-semibold text-foreground hover:bg-accent transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base text-blue-400">person</span>
                Seeker (Alice)
              </button>
              <button
                onClick={async () => {
                  setIsLoggingIn(true);
                  try {
                    await login('EMPLOYER');
                    router.push('/dashboard/employer');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Login failed');
                  } finally {
                    setIsLoggingIn(false);
                  }
                }}
                disabled={isLoggingIn}
                className="flex-1 py-3 rounded-xl border border-border/10 bg-accent/50 text-base font-semibold text-foreground hover:bg-accent transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base text-primary">corporate_fare</span>
                Employer (Bob)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer link */}
      <p className="mt-8 text-base text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-primary hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
