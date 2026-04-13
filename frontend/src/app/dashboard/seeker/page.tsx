'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getDatasourceStatus, getResume, getSeekerMatches, getNegotiationSessions, updateJobSeekingStatus } from '@/lib/api';
import { DataSourceConnection, ResumeProfile, MatchResultDisplay, NegotiationSession } from '@/lib/types';
import { JobSeekingToggle } from '@/components/dashboard/job-seeking-toggle';
import { DatasourceStatus } from '@/components/dashboard/datasource-status';
import { ResumeSummary } from '@/components/dashboard/resume-summary';
import { MarketValueCard } from '@/components/dashboard/market-value-card';
import { NegotiationList } from '@/components/dashboard/negotiation-list';
import { SkeletonGrid } from '@/components/ui/skeleton-card';

export default function SeekerDashboard() {
  const { user } = useAuth();
  const [datasources, setDatasources] = useState<DataSourceConnection[]>([]);
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [matches, setMatches] = useState<MatchResultDisplay[]>([]);
  const [sessions, setSessions] = useState<NegotiationSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDatasourceStatus().then(setDatasources),
      getResume().then(setResume).catch(() => setResume(null)),
      getSeekerMatches().then(setMatches),
      getNegotiationSessions().then(setSessions),
    ]).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your career overview at a glance</p>
        </div>
        <SkeletonGrid count={4} lines={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          Welcome back, {user?.nearAccountId?.split('.')[0] || 'Seeker'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Your career overview at a glance</p>
      </div>
      <JobSeekingToggle onToggle={(active) => updateJobSeekingStatus(active)} />
      <DatasourceStatus connections={datasources} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ResumeSummary resume={resume} />
        <MarketValueCard resume={resume} />
      </div>
      <NegotiationList sessions={sessions} matches={matches} />
    </div>
  );
}
