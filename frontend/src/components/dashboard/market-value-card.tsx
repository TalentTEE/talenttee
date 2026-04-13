'use client';

import { ResumeProfile } from '@/lib/types';

function formatSalary(val: number): string {
  return `$${val.toLocaleString()}`;
}

export function MarketValueCard({ resume }: { resume: ResumeProfile | null }) {
  if (!resume || !resume.marketValueMin) return null;

  return (
    <div className="bg-card rounded-2xl border border-border/10 p-6">
      <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground mb-4">Market Value</h3>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-extrabold text-primary font-[var(--font-manrope)]">
          {formatSalary(resume.marketValueMin)} ~ {formatSalary(resume.marketValueMax!)}
        </span>
        <span className="text-sm text-muted-foreground">/ year</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Fair Salary Range</p>
      {resume.negotiationPoints && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Strengths</p>
          <div className="flex gap-2 flex-wrap">
            {resume.negotiationPoints.strengths.map((s, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/5 border border-primary/10 text-xs text-primary font-medium">
                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
