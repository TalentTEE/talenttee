'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { loginByAccount } = useAuth();
  const router = useRouter();

  const [accountId, setAccountId] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!accountId.trim()) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      await loginByAccount(accountId.trim());
      // Role is stored from signup — redirect based on it
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
          Log in with your NEAR account.
        </p>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border/10 bg-card p-8">
          <label className="block text-sm font-medium text-foreground mb-2">
            NEAR Account ID
          </label>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="your-account.testnet"
            className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all mb-6"
            autoFocus
          />

          <button
            onClick={handleLogin}
            disabled={!accountId.trim() || isLoggingIn}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold tracking-wide hover:bg-primary/90 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoggingIn ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                Logging in...
              </>
            ) : (
              'Log In'
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
