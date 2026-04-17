'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getJobs, closeJob } from '@/lib/api';
import { JobPosting } from '@/lib/types';
import { formatSalary } from '@/lib/format';
import { SkeletonGrid } from '@/components/ui/skeleton-card';

export default function JobPostingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'EMPLOYER') router.replace('/dashboard/seeker');
  }, [user, router]);

  useEffect(() => {
    getJobs()
      .then(setJobs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
            Job Postings
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            Manage your job postings and create new ones
          </p>
        </div>
        <Link
          href="/jobs/create"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFE600] text-[#0a0a0a] text-base font-semibold hover:bg-[#FFE600]/90 transition-all"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Create Job
        </Link>
      </div>

      {loading ? (
        <SkeletonGrid count={3} lines={2} />
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-border/10 bg-card p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFE600]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#FFE600] text-3xl">work</span>
          </div>
          <h2 className="font-[var(--font-manrope)] text-xl font-bold text-foreground">
            No job postings yet
          </h2>
          <p className="text-base text-muted-foreground">
            Create your first posting to start matching with candidates.
          </p>
          <Link
            href="/jobs/create"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FFE600] text-[#0a0a0a] text-base font-semibold hover:bg-[#FFE600]/90 transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Create First Posting
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <div
              key={j.id}
              className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/10 hover:border-[#FFE600]/20 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#FFE600]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#FFE600] text-xl">work</span>
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">{j.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1 text-sm font-medium ${
                        j.status === 'ACTIVE'
                          ? 'text-[#FFE600]'
                          : j.status === 'DRAFT'
                            ? 'text-muted-foreground'
                            : 'text-red-400'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {j.status}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatSalary(j.salaryMin)} ~ {formatSalary(j.salaryMax)}
                    </span>
                  </div>
                </div>
              </div>
              {j.status === 'CLOSED' ? (
                <span className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground">
                  Closed
                </span>
              ) : (
                <button
                  onClick={async () => {
                    if (!confirm(`Close "${j.title}"? New matches will stop, but ongoing negotiations continue.`)) return;
                    try {
                      const updated = await closeJob(j.id);
                      setJobs((prev) => prev.map((p) => (p.id === j.id ? updated : p)));
                    } catch { /* ignore */ }
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
                >
                  Close
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
