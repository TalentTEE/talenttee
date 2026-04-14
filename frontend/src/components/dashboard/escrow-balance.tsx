'use client';

import { EscrowAccount } from '@/lib/types';
import Link from 'next/link';
import { CountUp } from '@/components/ui/CountUp';

export function EscrowBalance({ escrow }: { escrow: EscrowAccount | null }) {
  return (
    <div className="bg-card rounded-2xl border border-border/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground">Escrow Balance</h3>
        <Link
          href="/escrow"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#39FF14] text-[#0a0a0a] text-sm font-bold hover:bg-[#39FF14]/90 transition-all"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Deposit More
        </Link>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="material-symbols-outlined text-[#39FF14] text-2xl">account_balance_wallet</span>
        <CountUp end={escrow?.balance ?? 0} decimals={2} duration={500} className="text-3xl font-extrabold text-foreground font-[var(--font-manrope)]" />
        <span className="text-base text-muted-foreground font-medium">NEAR</span>
      </div>
    </div>
  );
}
