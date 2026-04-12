'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getEscrowBalance, getJobs, getEmployerMatches, getNegotiationSessions } from '@/lib/api';
import { EscrowAccount, JobPosting, MatchResult, NegotiationSession } from '@/lib/types';
import { EscrowBalance } from '@/components/dashboard/escrow-balance';
import { JobList } from '@/components/dashboard/job-list';
import { NegotiationList } from '@/components/dashboard/negotiation-list';

export default function EmployerDashboard() {
  const { user } = useAuth();
  const [escrow, setEscrow] = useState<EscrowAccount | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [sessions, setSessions] = useState<NegotiationSession[]>([]);

  useEffect(() => {
    if (!user) return;
    getEscrowBalance().then(setEscrow);
    getJobs().then(setJobs);
    getEmployerMatches('job-1').then(setMatches);
    getNegotiationSessions().then(setSessions);
  }, [user]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          Welcome back, {user?.nearAccountId?.split('.')[0] || 'Employer'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your talent pipeline</p>
      </div>
      <EscrowBalance escrow={escrow} />
      <JobList jobs={jobs} />
      <NegotiationList sessions={sessions} matches={matches} />
    </div>
  );
}
