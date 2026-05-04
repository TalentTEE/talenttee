'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useUnifiedWallet } from '@/lib/wallet-adapter';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { loginByAccount, login } = useAuth();
  const {
    accountId: walletAccountId,
    connectWeb3Auth,
    showWalletSelector,
    loginMethod,
    signOut,
  } = useUnifiedWallet();
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

  // When wallet-selector connects, mark ready for the "Continue as" button
  useEffect(() => {
    if (walletAccountId && loginMethod === 'wallet-selector') {
      setWalletReady(true);
    }
  }, [walletAccountId, loginMethod]);

  /** Social login: connect Web3Auth → derive NEAR key → sign nonce → get JWT → redirect */
  const handleSocialLogin = async (provider: 'google' | 'kakao' | 'email_passwordless') => {
    setIsLoggingIn(true);
    setError(null);
    try {
      // Prevent provider stickiness (e.g. Kakao click opening Google session)
      // by clearing any existing wallet session before social connect.
      await signOut().catch(() => {});

      const result = await connectWeb3Auth(provider);
      if (!result) {
        setIsLoggingIn(false);
        return;
      }
      // Web3Auth connected — now sign the nonce and get JWT
      await loginByAccount(result.accountId);
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

  const handleConnectWallet = async () => {
    // Wallet already connected — login directly from click handler
    if (walletAccountId && loginMethod === 'wallet-selector') {
      doLogin(walletAccountId);
      return;
    }
    showWalletSelector();
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
          <span className="material-symbols-outlined text-primary text-4xl">lock_open</span>
        </div>
        <h1 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3">
          Welcome back
        </h1>
        <p className="text-muted-foreground text-lg">
          Sign in to continue.
        </p>
      </div>

      {/* Social Login Buttons */}
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border/10 bg-card p-8 space-y-3">
          {/* Google */}
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={isLoggingIn}
            className="w-full py-3.5 rounded-xl bg-white text-[#1f1f1f] text-base font-bold tracking-wide hover:bg-gray-50 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-gray-200"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {isLoggingIn ? 'Signing in...' : 'Continue with Google'}
          </button>

          {/* Kakao */}
          <button
            onClick={() => handleSocialLogin('kakao')}
            disabled={isLoggingIn}
            className="w-full py-3.5 rounded-xl bg-[#FEE500] text-[#191919] text-base font-bold tracking-wide hover:bg-[#FDD800] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 0C4.029 0 0 3.13 0 6.99c0 2.485 1.644 4.671 4.121 5.912l-1.05 3.852c-.093.34.295.613.588.414L7.77 14.35c.4.055.81.084 1.23.084 4.971 0 9-3.13 9-6.99S13.971 0 9 0" fill="#191919"/>
            </svg>
            {isLoggingIn ? 'Signing in...' : 'Continue with Kakao'}
          </button>

          {/* Email */}
          <button
            onClick={() => handleSocialLogin('email_passwordless')}
            disabled={isLoggingIn}
            className="w-full py-3.5 rounded-xl bg-accent text-foreground text-base font-bold tracking-wide hover:bg-accent/80 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-border/10"
          >
            <span className="material-symbols-outlined text-lg">mail</span>
            {isLoggingIn ? 'Signing in...' : 'Continue with Email'}
          </button>
        </div>

        {/* Wallet Connect Hub */}
        <div className="mt-4 rounded-2xl border border-border/10 bg-card p-6">
          <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold mb-3">Wallets</p>
          <button
            onClick={handleConnectWallet}
            disabled={isLoggingIn}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-base font-bold tracking-wide hover:bg-primary/90 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoggingIn ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                Logging in...
              </>
            ) : walletReady && walletAccountId ? (
              <>
                <span className="material-symbols-outlined text-base">login</span>
                Continue as {walletAccountId.split('.')[0]}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                Connect NEAR or WalletConnect
              </>
            )}
          </button>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Choose MetaMask, HERE, MyNearWallet, Meteor and more from the wallet modal.
          </p>
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-base text-center">
            <p>{error}</p>
            {error.toLowerCase().includes('not registered') && (
              <p className="mt-2">
                <Link href="/signup" className="underline font-semibold text-red-300 hover:text-red-200">
                  Sign up
                </Link>
              </p>
            )}
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
