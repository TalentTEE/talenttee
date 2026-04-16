'use client';

import { ResumeProfile } from '@/lib/types';
import { CountUp } from '@/components/ui/CountUp';

export function MarketValueCard({ resume }: { resume: ResumeProfile | null }) {
  if (!resume || !resume.marketValueMin) return null;

  return (
    <div className="bg-card rounded-2xl border border-border/20 p-6">
      <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground mb-4">Market Value</h3>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-extrabold text-[#39FF14] font-[var(--font-manrope)]">
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
              <span key={i} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#39FF14]/5 border border-[#39FF14]/10 text-sm text-[#39FF14] font-medium">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
