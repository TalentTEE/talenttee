'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getEscrowBalance, getJobs, getEmployerMatches, getNegotiationSessions } from '@/lib/api';
import { EscrowAccount, JobPosting, MatchResult, NegotiationSession } from '@/lib/types';
import { EscrowBalance } from '@/components/dashboard/escrow-balance';
import { JobList } from '@/components/dashboard/job-list';
import { MatchList } from '@/components/dashboard/match-list';
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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Employer Dashboard</h1>
      <EscrowBalance escrow={escrow} />
      <JobList jobs={jobs} />
      <MatchList matches={matches} role="EMPLOYER" />
      <NegotiationList sessions={sessions} />
    </div>
  );
}
