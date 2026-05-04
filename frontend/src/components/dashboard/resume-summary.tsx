'use client';

import { ResumeProfile } from '@/lib/types';
import Link from 'next/link';

export function ResumeSummary({ resume }: { resume: ResumeProfile | null }) {
  if (!resume) {
    return (
      <div className="rounded-[1.75rem] border border-border bg-white/75 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
        <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground mb-3">My Skills</h3>
        <p className="text-base text-muted-foreground mb-4">No analysis generated yet.</p>
        <Link
          href="/datasource"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#7c3aed] text-white text-base font-bold hover:bg-[#7c3aed]/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-base">auto_awesome</span>
          Generate My Skills
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-border bg-white/75 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground">My Skills</h3>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium ${
          resume.status === 'COMPLETE'
            ? 'bg-[#65a30d]/10 text-[#3f6212]'
            : 'bg-muted text-muted-foreground'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          {resume.status === 'COMPLETE' ? 'Complete' : resume.status === 'ANALYZING' ? 'Analyzing...' : 'Collecting...'}
        </div>
      </div>
      {resume.skills?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          {resume.skills.slice(0, 6).map((s) => (
            <span key={s} className="px-2 py-1 rounded-lg bg-[#7c3aed]/10 text-[#5b21b6] text-sm font-semibold border border-[#7c3aed]/20">
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
          href="/datasource"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/70 text-foreground text-base font-semibold hover:bg-white transition-colors border border-border shadow-sm"
        >
          <span className="material-symbols-outlined text-base">visibility</span>
          View Details
        </Link>
      </div>
    </div>
  );
}
