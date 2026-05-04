'use client';

import { EscrowAccount } from '@/lib/types';
import Link from 'next/link';
import { CountUp } from '@/components/ui/CountUp';

export function EscrowBalance({ escrow }: { escrow: EscrowAccount | null }) {
  return (
    <div className="rounded-[1.75rem] border border-border bg-white/75 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground">Escrow Balance</h3>
        <Link
          href="/escrow"
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#65a30d] text-white text-sm font-bold hover:bg-[#65a30d]/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Deposit More
        </Link>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="material-symbols-outlined text-[#65a30d] text-2xl">account_balance_wallet</span>
        <CountUp end={escrow?.balance ?? 0} decimals={2} duration={500} className="text-3xl font-extrabold text-foreground font-[var(--font-manrope)]" />
        <span className="text-base text-muted-foreground font-medium">NEAR</span>
      </div>
    </div>
  );
}
