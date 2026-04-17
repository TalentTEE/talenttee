'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getSeekerEarningsOnChain } from '@/lib/near';

export function SidebarSeekerEarnings() {
  const { user } = useAuth();
  const [viewCount, setViewCount] = useState(0);
  const [totalNear, setTotalNear] = useState('0.00');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.nearAccountId) return;
    getSeekerEarningsOnChain(user.nearAccountId)
      .then((data) => {
        setViewCount(data.view_count);
        const near = Number(BigInt(data.total_earned)) / 1e24;
        setTotalNear(near.toFixed(2));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.nearAccountId]);

  if (loading) return null;

  return (
    <div className="mx-1 mb-3 rounded-xl bg-accent/50 border border-border/10 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
          visibility
        </span>
        <span className="text-xs font-medium uppercase tracking-wider">Resume Views</span>
      </div>
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-extrabold text-foreground">{viewCount}</span>
          <span className="text-xs text-muted-foreground">views</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-[#39FF14]">{totalNear}</span>
          <span className="text-xs text-muted-foreground">NEAR</span>
        </div>
      </div>
    </div>
  );
}
