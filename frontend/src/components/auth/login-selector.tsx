'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/lib/types';

const USE_DUMMY = process.env.NEXT_PUBLIC_USE_DUMMY === 'true';

export function LoginSelector() {
  const { login, loginWithNear } = useAuth();
  const router = useRouter();
  const [customAccount, setCustomAccount] = useState('');
  const [customRole, setCustomRole] = useState<UserRole>('SEEKER');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (role: 'SEEKER' | 'EMPLOYER') => {
    setIsLoggingIn(true);
    setError(null);
    try {
      if (USE_DUMMY) {
        await login(role);
      } else {
        const nearAccountId = role === 'SEEKER' ? 'alice.testnet' : 'bob.testnet';
        await loginWithNear(nearAccountId, role);
      }
      router.push(role === 'SEEKER' ? '/dashboard/seeker' : '/dashboard/employer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCustomLogin = async () => {
    if (!customAccount.trim()) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      await loginWithNear(customAccount.trim(), customRole);
      router.push(customRole === 'SEEKER' ? '/dashboard/seeker' : '/dashboard/employer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0e0e0e] selection:bg-primary selection:text-primary-foreground">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#0e0e0e]">
        <nav className="flex justify-between items-center px-8 py-6 max-w-[1440px] mx-auto">
          <div className="text-2xl font-extrabold tracking-tighter text-primary uppercase font-[var(--font-manrope)]">
            Talent-Tee
          </div>
          <div className="hidden md:flex items-center space-x-10">
            <span className="text-muted-foreground hover:text-secondary-foreground transition-colors text-sm uppercase tracking-widest cursor-pointer">Talent</span>
            <span className="text-muted-foreground hover:text-secondary-foreground transition-colors text-sm uppercase tracking-widest cursor-pointer">Companies</span>
            <span className="text-muted-foreground hover:text-secondary-foreground transition-colors text-sm uppercase tracking-widest cursor-pointer">Verify</span>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center pt-32 pb-20 px-6">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-accent mb-6 ring-1 ring-border/20 shadow-[0_0_30px_rgba(255,168,79,0.1)]">
            <span className="material-symbols-outlined text-primary text-5xl">coffee</span>
          </div>
          <h1 className="font-[var(--font-manrope)] text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-4">
            Talent-<span className="text-primary">Tee</span>
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto text-lg leading-relaxed">
            Where talent discovery meets the precision of Blockchain.
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
          {/* Seeker Card */}
          <div
            className="group relative bg-card rounded-2xl overflow-hidden hover:bg-accent transition-all duration-500 ease-out-expo border border-border/10 cursor-pointer"
            onClick={() => handleLogin('SEEKER')}
          >
            <div className="p-10 flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all duration-500 bg-muted flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-4xl">person</span>
                </div>
                <div className="absolute bottom-0 right-0 bg-primary w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-card">
                  <span className="material-symbols-outlined text-[12px] text-primary-foreground font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                </div>
              </div>
              <h2 className="font-[var(--font-manrope)] text-2xl font-bold text-foreground mb-2">Alice Kim</h2>
              <p className="text-muted-foreground mb-1">Frontend Developer, 3-5y experience</p>
              <p className="text-muted-foreground/60 text-sm mb-8">alice.testnet</p>
              <button className="w-full py-4 px-8 rounded-lg bg-muted text-foreground font-bold text-sm tracking-wide group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 ease-out-expo flex items-center justify-center gap-2">
                Login as Seeker
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Employer Card */}
          <div
            className="group relative bg-card rounded-2xl overflow-hidden hover:bg-accent transition-all duration-500 ease-out-expo border border-border/10 cursor-pointer"
            onClick={() => handleLogin('EMPLOYER')}
          >
            <div className="p-10 flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all duration-500 bg-muted flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-4xl">corporate_fare</span>
                </div>
                <div className="absolute bottom-0 right-0 bg-primary w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-card">
                  <span className="material-symbols-outlined text-[12px] text-primary-foreground font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>corporate_fare</span>
                </div>
              </div>
              <h2 className="font-[var(--font-manrope)] text-2xl font-bold text-foreground mb-2">Bob Park</h2>
              <p className="text-muted-foreground mb-1">HR Manager, TechCorp</p>
              <p className="text-muted-foreground/60 text-sm mb-8">bob.testnet</p>
              <button className="w-full py-4 px-8 rounded-lg bg-muted text-foreground font-bold text-sm tracking-wide group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 ease-out-expo flex items-center justify-center gap-2">
                Login as Employer
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 w-full max-w-5xl px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Loading Overlay */}
        {isLoggingIn && (
          <div className="mt-6 flex items-center gap-2 text-muted-foreground">
            <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
            <span className="text-sm">Authenticating...</span>
          </div>
        )}

        {/* Custom NEAR Account (only in real API mode) */}
        {!USE_DUMMY && (
          <div className="mt-10 w-full max-w-5xl">
            <div className="rounded-2xl border border-border/10 bg-card p-8">
              <h3 className="font-[var(--font-manrope)] text-lg font-bold text-foreground mb-4">
                Custom NEAR Account
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={customAccount}
                  onChange={(e) => setCustomAccount(e.target.value)}
                  placeholder="your-account.testnet"
                  className="flex-1 bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
                <select
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value as UserRole)}
                  className="bg-muted rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                >
                  <option value="SEEKER">Seeker</option>
                  <option value="EMPLOYER">Employer</option>
                </select>
                <button
                  onClick={handleCustomLogin}
                  disabled={!customAccount.trim() || isLoggingIn}
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Meta */}
        <div className="mt-16 flex flex-col items-center gap-4">
          <div className="flex items-center gap-4 text-muted-foreground/40 text-xs tracking-widest uppercase">
            <span>Powered by NEAR Protocol</span>
            <span className="w-1 h-1 rounded-full bg-primary/40"></span>
            <span>AI-Driven Matching</span>
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-1 rounded-full bg-[#131313] border border-border/10 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] text-muted-foreground font-medium">Blockchain Network Active</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 mt-auto bg-[#131313]">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 border-t border-border/10 pt-12 max-w-[1440px] mx-auto gap-8">
          <div className="text-lg font-bold text-secondary-foreground">Talent-Tee</div>
          <div className="flex flex-wrap justify-center gap-8">
            <span className="text-muted-foreground hover:text-secondary-foreground transition-colors text-sm font-medium tracking-wide cursor-pointer">Privacy Policy</span>
            <span className="text-muted-foreground hover:text-secondary-foreground transition-colors text-sm font-medium tracking-wide cursor-pointer">Terms of Service</span>
            <span className="text-muted-foreground hover:text-secondary-foreground transition-colors text-sm font-medium tracking-wide cursor-pointer">Security Architecture</span>
          </div>
          <div className="text-muted-foreground text-xs font-medium tracking-wide opacity-60">
            &copy; 2024 Talent-Tee. Securely anchored on the Blockchain.
          </div>
        </div>
      </footer>
    </div>
  );
}
