'use client';

import { JobPosting } from '@/lib/types';
import { formatSalary } from '@/lib/format';
import Link from 'next/link';

export function JobList({ jobs }: { jobs: JobPosting[] }) {
  return (
    <div className="rounded-[1.75rem] border border-border bg-white/75 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground">My Job Postings</h3>
        <Link
          href="/jobs"
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#d97706] text-white text-sm font-bold hover:bg-[#d97706]/90 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-base">settings</span>
          Manage
        </Link>
      </div>
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#d97706]/10 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[#d97706] text-2xl">work</span>
          </div>
          <p className="text-base font-semibold text-foreground mb-1">No job postings yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create your first posting to start matching with candidates.</p>
          <Link
            href="/jobs"
            className="px-4 py-2 rounded-2xl bg-[#d97706] text-white text-base font-semibold hover:bg-[#d97706]/90 transition-colors shadow-sm"
          >
            Create First Posting
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {[...jobs].sort((a, b) => (a.status === 'CLOSED' ? 1 : 0) - (b.status === 'CLOSED' ? 1 : 0)).map((j) => (
            <div key={j.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/65 border border-border hover:bg-white transition-colors shadow-sm">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-[#d97706]/10 flex items-center justify-center">
                   <span className="material-symbols-outlined text-[#d97706] text-lg">work</span>
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">{j.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                      j.status === 'ACTIVE' ? 'text-[#d97706]' : 'text-muted-foreground'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {j.status}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatSalary(j.salaryMin)} ~ {formatSalary(j.salaryMax)}
                    </span>
                  </div>
                </div>
              </div>
              {j.status === 'CLOSED' && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-muted text-muted-foreground">
                  Closed
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
