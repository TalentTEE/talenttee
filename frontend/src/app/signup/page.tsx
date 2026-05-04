'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useUnifiedWallet } from '@/lib/wallet-adapter';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/types';
import Link from 'next/link';

const IS_DEV = process.env.NODE_ENV === 'development';

export default function SignupPage() {
  const { signup, devLogin, logout } = useAuth();
  const {
    accountId: walletAccountId,
    connectWeb3Auth,
    showWalletSelector,
    loginMethod,
    signOut,
  } = useUnifiedWallet();
  const router = useRouter();

  const [step, setStep] = useState<'role' | 'account'>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [walletReady, setWalletReady] = useState(false);

  // Dev login state
  const [devAccountId, setDevAccountId] = useState('alice.testnet');
  const [devRole, setDevRole] = useState<UserRole>('SEEKER');
  const [devSubmitting, setDevSubmitting] = useState(false);

  const handleDevLogin = async () => {
    setDevSubmitting(true);
    setError(null);
    try {
      await devLogin(devAccountId, devRole);
      router.push(devRole === 'SEEKER' ? '/dashboard/seeker' : '/dashboard/employer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dev login failed');
    } finally {
      setDevSubmitting(false);
    }
  };

  // Clear any stale session so the new signup starts fresh
  useEffect(() => {
    logout();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep('account');
  };

  const doSignup = useCallback(async (accountId: string) => {
    if (!selectedRole) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await signup(accountId, selectedRole);
      router.push(selectedRole === 'SEEKER' ? '/dashboard/seeker' : '/dashboard/employer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedRole, signup, router]);

  // When wallet-selector connects, mark ready so user can click to proceed.
  useEffect(() => {
    if (walletAccountId && loginMethod === 'wallet-selector') {
      setWalletReady(true);
    }
  }, [walletAccountId, loginMethod]);

  /** Social signup: Web3Auth → derive NEAR key → sign nonce → register → redirect */
  const handleSocialSignup = async (provider: 'google' | 'kakao' | 'email_passwordless') => {
    if (!selectedRole) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // Prevent provider stickiness between social logins
      await signOut().catch(() => {});

      const result = await connectWeb3Auth(provider);
      if (!result) {
        setIsSubmitting(false);
        return;
      }
      await signup(result.accountId, selectedRole);
      router.push(selectedRole === 'SEEKER' ? '/dashboard/seeker' : '/dashboard/employer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectWallet = async () => {
    // Wallet already connected — signup directly from click handler
    if (walletAccountId && loginMethod === 'wallet-selector') {
      doSignup(walletAccountId);
      return;
    }
    showWalletSelector();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-12 selection:bg-primary selection:text-primary-foreground">
      {/* Back link */}
      <div className="w-full max-w-xl mb-8">
        {step === 'role' ? (
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-base text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Home
          </Link>
        ) : (
          <button
            onClick={() => {
              setStep('role');
              setError(null);
            }}
            className="inline-flex items-center gap-1 text-base text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Choose a different role
          </button>
        )}
      </div>

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-[var(--font-manrope)] text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3">
          Create your account
        </h1>
        <p className="text-muted-foreground text-lg">
          {step === 'role'
            ? 'How will you use TalentTee?'
            : 'Choose how to sign up.'}
        </p>
      </div>

      {/* Step 1: Role Selection */}
      {step === 'role' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl">
          <button
            onClick={() => handleRoleSelect('SEEKER')}
            className="group bg-card rounded-2xl p-8 border border-border/10 hover:border-primary/30 transition-all duration-500 ease-out-expo text-left cursor-pointer"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors duration-500">
              <span className="material-symbols-outlined text-primary text-2xl">person_search</span>
            </div>
            <h2 className="font-[var(--font-manrope)] text-xl font-bold text-foreground mb-2">
              Job Seeker
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              Find opportunities and let AI negotiate the best terms for you.
            </p>
          </button>

          <button
            onClick={() => handleRoleSelect('EMPLOYER')}
            className="group bg-card rounded-2xl p-8 border border-border/10 hover:border-primary/30 transition-all duration-500 ease-out-expo text-left cursor-pointer"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors duration-500">
              <span className="material-symbols-outlined text-primary text-2xl">corporate_fare</span>
            </div>
            <h2 className="font-[var(--font-manrope)] text-xl font-bold text-foreground mb-2">
              Employer
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              Discover verified talent and streamline your hiring process.
            </p>
          </button>
        </div>
      )}

      {/* Step 2: Connect Account */}
      {step === 'account' && selectedRole && (
        <div className="w-full max-w-xl">
          {/* Selected role badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="material-symbols-outlined text-primary text-base">
                {selectedRole === 'SEEKER' ? 'person_search' : 'corporate_fare'}
              </span>
              <span className="text-primary text-base font-semibold">
                {selectedRole === 'SEEKER' ? 'Job Seeker' : 'Employer'}
              </span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="rounded-2xl border border-border/10 bg-card p-8 space-y-3">
            {/* Google */}
            <button
              onClick={() => handleSocialSignup('google')}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-white text-[#1f1f1f] text-base font-bold tracking-wide hover:bg-gray-50 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-gray-200"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {isSubmitting ? 'Creating account...' : 'Continue with Google'}
            </button>

            {/* Kakao */}
            <button
              onClick={() => handleSocialSignup('kakao')}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-[#FEE500] text-[#191919] text-base font-bold tracking-wide hover:bg-[#FDD800] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 0C4.029 0 0 3.13 0 6.99c0 2.485 1.644 4.671 4.121 5.912l-1.05 3.852c-.093.34.295.613.588.414L7.77 14.35c.4.055.81.084 1.23.084 4.971 0 9-3.13 9-6.99S13.971 0 9 0" fill="#191919"/>
              </svg>
              {isSubmitting ? 'Creating account...' : 'Continue with Kakao'}
            </button>

            {/* Email */}
            <button
              onClick={() => handleSocialSignup('email_passwordless')}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-accent text-foreground text-base font-bold tracking-wide hover:bg-accent/80 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-border/10"
            >
              <span className="material-symbols-outlined text-lg">mail</span>
              {isSubmitting ? 'Creating account...' : 'Continue with Email'}
            </button>
          </div>

          {/* Advanced: NEAR Wallet */}
          <div className="mt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="material-symbols-outlined text-sm">
                {showAdvanced ? 'expand_less' : 'expand_more'}
              </span>
              Advanced: Connect NEAR Wallet
            </button>

            {showAdvanced && (
              <div className="mt-2 rounded-2xl border border-border/10 bg-card p-6">
                <button
                  onClick={handleConnectWallet}
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-base font-bold tracking-wide hover:bg-primary/90 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                      Creating account...
                    </>
                  ) : walletReady && walletAccountId ? (
                    <>
                      <span className="material-symbols-outlined text-base">login</span>
                      Continue as {walletAccountId.split('.')[0]}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                      Connect Wallet
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-base text-center">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Dev Login Panel */}
      {IS_DEV && (
        <div className="w-full max-w-xl mt-10 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-yellow-500 text-xl">science</span>
            <h3 className="font-[var(--font-manrope)] text-lg font-bold text-yellow-500">Dev Login</h3>
            <span className="text-xs text-yellow-500/60 ml-auto">No wallet required</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={devAccountId}
              onChange={(e) => setDevAccountId(e.target.value)}
              placeholder="account.testnet"
              className="flex-1 px-3 py-2 rounded-lg bg-background border border-border/20 text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:border-yellow-500/50"
            />
            <select
              value={devRole}
              onChange={(e) => setDevRole(e.target.value as UserRole)}
              className="px-3 py-2 rounded-lg bg-background border border-border/20 text-foreground text-base focus:outline-none focus:border-yellow-500/50"
            >
              <option value="SEEKER">Seeker</option>
              <option value="EMPLOYER">Employer</option>
            </select>
            <button
              onClick={handleDevLogin}
              disabled={devSubmitting || !devAccountId.trim()}
              className="px-5 py-2 rounded-lg bg-yellow-500 text-black text-base font-bold hover:bg-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {devSubmitting ? 'Logging in...' : 'Dev Login'}
            </button>
          </div>
        </div>
      )}

      {/* Footer link */}
      <p className="mt-8 text-base text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}
