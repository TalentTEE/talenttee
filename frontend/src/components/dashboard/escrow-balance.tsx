'use client';

import { EscrowAccount } from '@/lib/types';
import Link from 'next/link';

export function EscrowBalance({ escrow }: { escrow: EscrowAccount | null }) {
  return (
    <div className="bg-card rounded-2xl border border-border/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground">Escrow Balance</h3>
        <Link
          href="/escrow"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Deposit More
        </Link>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>
        <span className="text-3xl font-extrabold text-foreground font-[var(--font-manrope)]">{escrow?.balance ?? 0}</span>
        <span className="text-sm text-muted-foreground font-medium">NEAR</span>
      </div>
    </div>
  );
}
