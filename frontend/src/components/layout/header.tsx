'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useWallet } from '@/lib/wallet-selector';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const { signOut } = useWallet();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    logout();
    router.push('/');
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 bg-[#0e0e0e] border-b border-border/10">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
          )}
          <Link href="/" className="text-xl font-extrabold tracking-tighter text-primary uppercase font-[var(--font-manrope)] hover:opacity-80 transition-opacity">
            Talent-Tee
          </Link>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              {user.role === 'SEEKER' ? 'person' : 'corporate_fare'}
            </span>
            <span className="text-primary text-sm font-semibold">
              {user.role === 'SEEKER' ? 'Seeker' : 'Employer'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-muted-foreground text-sm">
            <span className="material-symbols-outlined text-base">account_balance_wallet</span>
            <span>{user.nearAccountId}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
