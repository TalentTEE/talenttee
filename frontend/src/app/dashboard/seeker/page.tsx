'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getDatasourceStatus, getResume, getSeekerMatches, getNegotiationSessions } from '@/lib/api';
import { DataSourceConnection, ResumeProfile, MatchResult, NegotiationSession } from '@/lib/types';
import { DatasourceStatus } from '@/components/dashboard/datasource-status';
import { ResumeSummary } from '@/components/dashboard/resume-summary';
import { MarketValueCard } from '@/components/dashboard/market-value-card';
import { MatchList } from '@/components/dashboard/match-list';
import { NegotiationList } from '@/components/dashboard/negotiation-list';

export default function SeekerDashboard() {
  const { user } = useAuth();
  const [datasources, setDatasources] = useState<DataSourceConnection[]>([]);
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [sessions, setSessions] = useState<NegotiationSession[]>([]);

  useEffect(() => {
    if (!user) return;
    getDatasourceStatus().then(setDatasources);
    getResume(user.id).then(setResume).catch(() => setResume(null));
    getSeekerMatches(user.id).then(setMatches);
    getNegotiationSessions().then(setSessions);
  }, [user]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Seeker Dashboard</h1>
      <DatasourceStatus connections={datasources} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResumeSummary resume={resume} />
        <MarketValueCard resume={resume} />
      </div>
      <MatchList matches={matches} role="SEEKER" />
      <NegotiationList sessions={sessions} />
    </div>
  );
}
