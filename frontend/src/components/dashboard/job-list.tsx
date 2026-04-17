'use client';

import { JobPosting } from '@/lib/types';
import { formatSalary } from '@/lib/format';
import Link from 'next/link';

export function JobList({ jobs }: { jobs: JobPosting[] }) {
  return (
    <div className="bg-card rounded-2xl border border-border/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground">My Job Postings</h3>
        <Link
          href="/jobs"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FFE600] text-[#0a0a0a] text-sm font-bold hover:bg-[#FFE600]/90 transition-all"
        >
          <span className="material-symbols-outlined text-base">settings</span>
          Manage
        </Link>
      </div>
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#FFE600]/10 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[#FFE600] text-2xl">work</span>
          </div>
          <p className="text-base font-semibold text-foreground mb-1">No job postings yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create your first posting to start matching with candidates.</p>
          <Link
            href="/jobs"
            className="px-4 py-2 rounded-xl bg-[#FFE600] text-[#0a0a0a] text-base font-semibold hover:bg-[#FFE600]/90 transition-all"
          >
            Create First Posting
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <div key={j.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-border/5 hover:bg-accent transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FFE600]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#FFE600] text-lg">work</span>
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">{j.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                      j.status === 'ACTIVE' ? 'text-[#FFE600]' : 'text-muted-foreground'
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
              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-accent transition-all border border-border/10">
                  Edit
                </button>
                <button className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                  Close
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
