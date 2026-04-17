'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useWallet } from '@/lib/wallet-selector';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/types';
import Link from 'next/link';

const IS_DEV = process.env.NODE_ENV === 'development';

export default function SignupPage() {
  const { signup, devLogin, logout } = useAuth();
  const { modal, signedAccountId } = useWallet();
  const router = useRouter();

  const [step, setStep] = useState<'role' | 'account'>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // When wallet connects after modal, mark ready so user can click to proceed.
  // Don't auto-signup from useEffect — wallet.signMessage() needs a direct user
  // gesture or the browser blocks the popup.
  useEffect(() => {
    if (signedAccountId) {
      setWalletReady(true);
    }
  }, [signedAccountId]);

  const handleConnectWallet = async () => {
    if (!modal) return;
    // Wallet already connected — signup directly from click handler
    if (signedAccountId) {
      doSignup(signedAccountId);
      return;
    }
    modal.show();
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
            : 'Connect your wallet to get started.'}
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

      {/* Step 2: Connect Wallet */}
      {step === 'account' && selectedRole && (
        <div className="w-full max-w-xl">
          <div className="rounded-2xl border border-border/10 bg-card p-8">
            {/* Selected role badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <span className="material-symbols-outlined text-primary text-base">
                {selectedRole === 'SEEKER' ? 'person_search' : 'corporate_fare'}
              </span>
              <span className="text-primary text-base font-semibold">
                {selectedRole === 'SEEKER' ? 'Job Seeker' : 'Employer'}
              </span>
            </div>

            <button
              onClick={handleConnectWallet}
              disabled={isSubmitting || !modal}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground text-base font-bold tracking-wide hover:bg-primary/90 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  Creating account...
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
