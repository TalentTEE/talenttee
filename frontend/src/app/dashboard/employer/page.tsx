'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getEscrowBalance, getJobs, getEmployerMatches, getNegotiationSessions } from '@/lib/api';
import { EscrowAccount, JobPosting, MatchResultDisplay, NegotiationSession } from '@/lib/types';
import { EscrowBalance } from '@/components/dashboard/escrow-balance';
import { JobList } from '@/components/dashboard/job-list';
import { NegotiationList } from '@/components/dashboard/negotiation-list';
import { AIActionCard } from '@/components/dashboard/AIActionCard';
import { SkeletonGrid } from '@/components/ui/skeleton-card';

export default function EmployerDashboard() {
  const { user } = useAuth();
  const [escrow, setEscrow] = useState<EscrowAccount | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [matches, setMatches] = useState<MatchResultDisplay[]>([]);
  const [sessions, setSessions] = useState<NegotiationSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getEscrowBalance(user.nearAccountId).then(setEscrow).catch(() => {}),
      getJobs().then(j => {
        setJobs(j);
        if (j.length > 0) return getEmployerMatches(j[0].id).then(setMatches);
      }).catch(() => {}),
      getNegotiationSessions().then(setSessions).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
            Welcome back
          </h1>
          <p className="text-base text-muted-foreground mt-1">Manage your talent pipeline</p>
        </div>
        <SkeletonGrid count={3} lines={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          Welcome back, {user?.nearAccountId?.split('.')[0] || 'Employer'}
        </h1>
        <p className="text-base text-muted-foreground mt-1">Manage your talent pipeline</p>
      </div>
      <div className="animate-[fadeSlideUp_300ms_ease-out_both]">
        <AIActionCard datasources={[]} resume={null} matches={matches} sessions={sessions} role="EMPLOYER" />
      </div>
      <div className="animate-[fadeSlideUp_300ms_ease-out_both]" style={{ animationDelay: '80ms' }}>
        <EscrowBalance escrow={escrow} />
      </div>
      <div className="animate-[fadeSlideUp_300ms_ease-out_both]" style={{ animationDelay: '160ms' }}>
        <JobList jobs={jobs} />
      </div>
      <div className="animate-[fadeSlideUp_300ms_ease-out_both]" style={{ animationDelay: '240ms' }}>
        <NegotiationList sessions={sessions} matches={matches} />
      </div>
    </div>
  );
}
