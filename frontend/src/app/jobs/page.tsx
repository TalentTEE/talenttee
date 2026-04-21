'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getJobs, closeJob, getPreferences, updatePreferences } from '@/lib/api';
import { JobPosting } from '@/lib/types';
import { formatSalary } from '@/lib/format';
import { SkeletonGrid } from '@/components/ui/skeleton-card';

export default function JobPostingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [salaryCeiling, setSalaryCeiling] = useState<number>(100000);
  const [editingCeiling, setEditingCeiling] = useState(false);
  const [ceilingLoaded, setCeilingLoaded] = useState(false);

  const ceilingSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncCeiling = useCallback((value: number) => {
    if (ceilingSaveTimer.current) clearTimeout(ceilingSaveTimer.current);
    ceilingSaveTimer.current = setTimeout(() => {
      updatePreferences({ salaryCeiling: value }).catch(() => {});
    }, 500);
  }, []);

  useEffect(() => {
    if (user && user.role !== 'EMPLOYER') router.replace('/dashboard/seeker');
  }, [user, router]);

  useEffect(() => {
    getJobs()
      .then(setJobs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    getPreferences()
      .then((prefs) => setSalaryCeiling(prefs.salaryCeiling ?? 100000))
      .catch(() => {
        const saved = localStorage.getItem('tt_salary_ceiling');
        setSalaryCeiling(saved ? Number(saved) : 100000);
      })
      .finally(() => setCeilingLoaded(true));
  }, [user]);

  const handleCeilingChange = (value: number) => {
    setSalaryCeiling(value);
    localStorage.setItem('tt_salary_ceiling', String(value));
    syncCeiling(value);
  };

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

      {/* Salary Ceiling Panel */}
      {ceilingLoaded && (
        <div className="rounded-2xl border border-[#FFE600]/10 bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#FFE600]" style={{ fontVariationSettings: "'FILL' 1" }}>tune</span>
              <span className="text-sm font-bold text-foreground">Salary Ceiling</span>
              <span className="text-lg font-bold text-[#FFE600]">{formatSalary(salaryCeiling)}</span>
            </div>
            <button
              onClick={() => setEditingCeiling(!editingCeiling)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">{editingCeiling ? 'check' : 'edit'}</span>
              {editingCeiling ? 'Done' : 'Edit'}
            </button>
          </div>
          {editingCeiling && (
            <div className="mt-3">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={30000}
                  max={300000}
                  step={5000}
                  value={salaryCeiling}
                  onChange={(e) => handleCeilingChange(Number(e.target.value))}
                  className="flex-1 accent-[#FFE600] h-2 rounded-full cursor-pointer"
                />
                <div className="flex items-center bg-muted rounded-lg px-2 py-1.5 focus-within:ring-1 focus-within:ring-[#FFE600]/50">
                  <span className="text-sm text-muted-foreground mr-1">$</span>
                  <input
                    type="number"
                    min={30000}
                    max={300000}
                    step={5000}
                    value={salaryCeiling}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (!isNaN(v)) handleCeilingChange(Math.max(30000, Math.min(300000, v)));
                    }}
                    className="w-20 bg-transparent text-sm font-bold text-foreground border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
              <div className="mt-2 flex items-start gap-2 rounded-xl bg-[#FFE600]/5 border border-[#FFE600]/10 px-3 py-2">
                <span className="material-symbols-outlined text-sm text-[#FFE600] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                <p className="text-xs text-muted-foreground">
                  AI will never propose above this amount during negotiation.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

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
          {[...jobs].sort((a, b) => (a.status === 'CLOSED' ? 1 : 0) - (b.status === 'CLOSED' ? 1 : 0)).map((j) => (
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
