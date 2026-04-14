'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { getDatasourceStatus, getResume, getSeekerMatches, getNegotiationSessions, getEmployerMatches } from '@/lib/api';
import { DataSourceConnection, ResumeProfile, MatchResultDisplay, NegotiationSession } from '@/lib/types';
import { useAgentStatus, AgentStatus } from './useAgentStatus';

interface AgentData {
  datasources: DataSourceConnection[];
  resume: ResumeProfile | null;
  matches: MatchResultDisplay[];
  sessions: NegotiationSession[];
  loading: boolean;
}

const AgentDataContext = createContext<AgentData>({
  datasources: [],
  resume: null,
  matches: [],
  sessions: [],
  loading: true,
});

const AgentStatusContext = createContext<AgentStatus>({
  state: 'idle',
  message: 'AI is on standby',
  activities: [],
});

export function AgentStatusProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [datasources, setDatasources] = useState<DataSourceConnection[]>([]);
  const [resume, setResume] = useState<ResumeProfile | null>(null);
  const [matches, setMatches] = useState<MatchResultDisplay[]>([]);
  const [sessions, setSessions] = useState<NegotiationSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = () => {
      const promises: Promise<void>[] = [];

      if (user.role === 'SEEKER') {
        promises.push(
          getDatasourceStatus().then(setDatasources).catch(() => {}),
          getResume().then(setResume).catch(() => setResume(null)),
          getSeekerMatches().then(setMatches).catch(() => setMatches([])),
        );
      } else {
        promises.push(
          getEmployerMatches('job-1').then(setMatches).catch(() => setMatches([])),
        );
      }

      promises.push(
        getNegotiationSessions().then(setSessions).catch(() => setSessions([])),
      );

      Promise.all(promises).finally(() => setLoading(false));
    };

    fetchData();
    // Refresh every 15 seconds
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const agentStatus = useAgentStatus({ datasources, resume, matches, sessions });

  return (
    <AgentDataContext.Provider value={{ datasources, resume, matches, sessions, loading }}>
      <AgentStatusContext.Provider value={agentStatus}>
        {children}
      </AgentStatusContext.Provider>
    </AgentDataContext.Provider>
  );
}

export function useAgentData() {
  return useContext(AgentDataContext);
}

export function useAgentStatusContext() {
  return useContext(AgentStatusContext);
}
