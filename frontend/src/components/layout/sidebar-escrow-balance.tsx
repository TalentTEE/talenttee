'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getEscrowBalanceOnChain } from '@/lib/near';

export function SidebarEscrowBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState('0.00');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.nearAccountId) return;
    getEscrowBalanceOnChain(user.nearAccountId)
      .then((raw) => {
        const near = Number(BigInt(raw)) / 1e24;
        setBalance(near.toFixed(2));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.nearAccountId]);

  if (loading) return null;

  return (
    <Link href="/escrow" className="block mx-1 mb-3 rounded-2xl border border-border bg-white/65 p-3 space-y-2 shadow-sm hover:border-[#65a30d]/30 transition-colors">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
        <span className="text-xs font-medium uppercase tracking-wider">Escrow</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-extrabold text-foreground tabular-nums">{balance}</span>
        <span className="text-xs text-muted-foreground">NEAR</span>
      </div>
    </Link>
  );
}
