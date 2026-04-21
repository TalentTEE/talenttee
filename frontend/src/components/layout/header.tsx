'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useUnifiedWallet } from '@/lib/wallet-adapter';
import { useRouter } from 'next/navigation';
import { useAgentStatusContext } from '@/hooks/AgentStatusProvider';
import { AgentStatusIndicator } from './AgentStatusIndicator';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const { signOut } = useUnifiedWallet();
  const router = useRouter();
  const agentStatus = useAgentStatusContext();

  const handleLogout = async () => {
    await signOut();
    logout();
    router.push('/');
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border/10">
      <div className="flex items-center justify-between px-6 py-4 min-h-[57px]">
        <div className="flex items-center gap-3 min-w-0">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden flex items-center justify-center w-9 h-9 shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
          )}
          <span className="lg:hidden text-xl font-black tracking-tight text-primary font-[var(--font-playfair)]">
            TalentTee<span className="text-[#FF2DF1]">.</span>
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <AgentStatusIndicator
            state={agentStatus.state}
            message={agentStatus.message}
          />
          <div className="hidden sm:flex items-center gap-2 text-muted-foreground text-base min-w-0">
            <span className="material-symbols-outlined text-base shrink-0">account_balance_wallet</span>
            <span className="truncate max-w-[160px]">{user.nearAccountId}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              {user.role === 'SEEKER' ? 'person' : 'corporate_fare'}
            </span>
            <span className="text-primary text-sm font-semibold">
              {user.role === 'SEEKER' ? 'Seeker' : 'Employer'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-base text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
