'use client';

import { ResumeProfile } from '@/lib/types';
import { CountUp } from '@/components/ui/CountUp';

export function MarketValueCard({ resume }: { resume: ResumeProfile | null }) {
  if (!resume || !resume.marketValueMin) return null;

  return (
    <div className="rounded-[1.75rem] border border-border bg-white/75 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
      <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground mb-4">Market Value</h3>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-extrabold text-[#3f6212] font-[var(--font-manrope)] tabular-nums">
          <CountUp end={resume.marketValueMin} prefix="$" duration={800} /> ~ <CountUp end={resume.marketValueMax!} prefix="$" duration={1000} />
        </span>
        <span className="text-base text-muted-foreground">/ year</span>
      </div>
      <p className="text-base text-muted-foreground mb-4">Fair Salary Range</p>
      {resume.negotiationPoints && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Strengths</p>
          <div className="flex gap-2 flex-wrap">
            {resume.negotiationPoints.strengths.map((s, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#65a30d]/10 border border-[#65a30d]/15 text-sm text-muted-foreground">
                <span className="material-symbols-outlined text-sm text-[#65a30d]" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
