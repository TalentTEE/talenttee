'use client';

import { ResumeProfile } from '@/lib/types';
import Link from 'next/link';

export function ResumeSummary({ resume }: { resume: ResumeProfile | null }) {
  if (!resume) {
    return (
      <div className="bg-card rounded-2xl border border-border/10 p-6">
        <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground mb-3">Analysis</h3>
        <p className="text-base text-muted-foreground mb-4">No analysis generated yet.</p>
        <Link
          href="/analysis"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#BF5AF2] text-white text-base font-bold hover:bg-[#BF5AF2]/90 transition-all"
        >
          <span className="material-symbols-outlined text-base">auto_awesome</span>
          Generate Analysis
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground">Analysis</h3>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium ${
          resume.status === 'COMPLETE'
            ? 'bg-[#BF5AF2]/10 text-[#BF5AF2]'
            : 'bg-muted text-muted-foreground'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          {resume.status === 'COMPLETE' ? 'Complete' : resume.status === 'ANALYZING' ? 'Analyzing...' : 'Collecting...'}
        </div>
      </div>
      {resume.skills?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          {resume.skills.slice(0, 6).map((s) => (
            <span key={s} className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-sm font-medium border border-border/10">
              {s}
            </span>
          ))}
          {resume.skills.length > 6 && (
            <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-sm">+{resume.skills.length - 6}</span>
          )}
        </div>
      )}
      <p className="text-base text-muted-foreground mb-4">
        Experience: {resume.experience?.length > 0 ? resume.experience[0].period : '-'}
      </p>
      <div className="flex gap-2">
        <Link
          href="/analysis"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-foreground text-base font-medium hover:bg-accent transition-all border border-border/10"
        >
          <span className="material-symbols-outlined text-base">visibility</span>
          View Details
        </Link>
        <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-base text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
          <span className="material-symbols-outlined text-base">refresh</span>
          Regenerate
        </button>
      </div>
    </div>
  );
}
