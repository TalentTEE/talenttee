'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { getDatasourceStatus, getResume, getSeekerMatches, getNegotiationSessions } from '@/lib/api';
import { DataSourceConnection, ResumeProfile, MatchResultDisplay, NegotiationSession } from '@/lib/types';
import { DatasourceStatus } from '@/components/dashboard/datasource-status';
import { AIActionCard } from '@/components/dashboard/AIActionCard';
import { ResumeSummary } from '@/components/dashboard/resume-summary';
import { MarketValueCard } from '@/components/dashboard/market-value-card';
import { NegotiationList } from '@/components/dashboard/negotiation-list';
import { NegotiationOverview } from '@/components/dashboard/negotiation-overview';
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
      getSeekerMatches().then(setMatches).catch(() => setMatches([])),
      getNegotiationSessions().then(setSessions).catch(() => setSessions([])),
    ]).finally(() => setLoading(false));
  }, [user]);

  const refreshDatasources = useCallback(() => {
    getDatasourceStatus().then(setDatasources);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
            Welcome back
          </h1>
          <p className="text-base text-muted-foreground mt-1">Your career overview at a glance</p>
        </div>
        <SkeletonGrid count={4} lines={3} />
      </div>
    );
  }

  const isOnboarding = sessions.length === 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          Welcome back, {user?.nearAccountId?.split('.')[0] || 'Seeker'}
        </h1>
        <p className="text-base text-muted-foreground mt-1">Your career overview at a glance</p>
      </div>

      {isOnboarding ? (
        <>
          {/* Phase A: Onboarding — AIActionCard guides the user */}
          <div className="animate-[fadeSlideUp_300ms_ease-out_both]">
            <AIActionCard datasources={datasources} resume={resume} matches={matches} sessions={sessions} role="SEEKER" />
          </div>
          <div className="animate-[fadeSlideUp_300ms_ease-out_both]" style={{ animationDelay: '80ms' }}>
            <DatasourceStatus connections={datasources} onConnect={refreshDatasources} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeSlideUp_300ms_ease-out_both]" style={{ animationDelay: '160ms' }}>
            <ResumeSummary resume={resume} />
            <MarketValueCard resume={resume} />
          </div>
        </>
      ) : (
        <>
          {/* Phase B: Active — NegotiationOverview + grouped list */}
          <div className="animate-[fadeSlideUp_300ms_ease-out_both]">
            <NegotiationOverview sessions={sessions} />
          </div>
          <div className="animate-[fadeSlideUp_300ms_ease-out_both]" style={{ animationDelay: '80ms' }}>
            <NegotiationList sessions={sessions} matches={matches} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeSlideUp_300ms_ease-out_both]" style={{ animationDelay: '160ms' }}>
            <ResumeSummary resume={resume} />
            <MarketValueCard resume={resume} />
          </div>
          <div className="animate-[fadeSlideUp_300ms_ease-out_both]" style={{ animationDelay: '240ms' }}>
            <DatasourceStatus connections={datasources} onConnect={refreshDatasources} />
          </div>
        </>
      )}
    </div>
  );
}
