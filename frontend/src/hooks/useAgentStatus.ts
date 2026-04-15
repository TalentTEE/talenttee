'use client';

import { useMemo } from 'react';
import type { DataSourceConnection, ResumeProfile, MatchResultDisplay, NegotiationSession } from '@/lib/types';

export type AgentState = 'idle' | 'analyzing' | 'negotiating' | 'waiting';

export interface Activity {
  id: string;
  icon: string;
  text: string;
  href: string;
  timestamp: Date;
}

export interface AgentStatus {
  state: AgentState;
  message: string;
  detail?: string;
  activities: Activity[];
}

interface AgentStatusInput {
  datasources: DataSourceConnection[];
  resume: ResumeProfile | null;
  matches: MatchResultDisplay[];
  sessions: NegotiationSession[];
}

export function useAgentStatus(input: AgentStatusInput): AgentStatus {
  const { datasources, resume, matches, sessions } = input;

  return useMemo(() => {
    const activities: Activity[] = [];
    let state: AgentState = 'idle';
    let message = 'AI is on standby';
    let detail: string | undefined;

    const connected = datasources.filter(
      (d) => d.status === 'CONNECTED' || d.status === 'MOCK',
    );

    // Check negotiation state (highest priority)
    const activeSessions = sessions.filter(
      (s) => s.state !== 'AGREED' && s.state !== 'FAILED' && s.state !== 'MAX_ROUNDS',
    );
    const agreedSessions = sessions.filter((s) => s.state === 'AGREED');

    if (activeSessions.length > 0) {
      const s = activeSessions[0];
      state = 'negotiating';
      message = `Negotiating Round ${s.currentRound} of ${s.maxRounds}`;
      detail = `${activeSessions.length} active session${activeSessions.length > 1 ? 's' : ''}`;
    }

    // Check resume state
    if (resume?.status === 'COLLECTING' || resume?.status === 'ANALYZING') {
      state = 'analyzing';
      message =
        resume.status === 'COLLECTING'
          ? 'Collecting your professional data...'
          : 'Analyzing your professional profile...';
      detail = connected.length > 0 ? `${connected.length} sources connected` : undefined;
    }

    // Check match waiting
    if (
      resume?.status === 'COMPLETE' &&
      matches.length === 0 &&
      activeSessions.length === 0
    ) {
      state = 'analyzing';
      message = 'Finding best job matches...';
    }

    // Check if waiting for user approval (matches found but no negotiation started)
    if (matches.length > 0 && sessions.length === 0) {
      state = 'waiting';
      message = `${matches.length} match${matches.length > 1 ? 'es' : ''} found! Awaiting your review`;
    }

    // Idle override
    if (
      state === 'idle' &&
      connected.length === 0 &&
      !resume
    ) {
      message = 'AI is on standby';
      detail = 'Connect data sources to get started';
    }

    // Build activity log
    if (agreedSessions.length > 0) {
      activities.push({
        id: 'agreed',
        icon: 'handshake',
        text: `${agreedSessions.length} negotiation${agreedSessions.length > 1 ? 's' : ''} completed`,
        href: '/negotiations',
        timestamp: new Date(),
      });
    }

    if (resume?.status === 'COMPLETE') {
      activities.push({
        id: 'resume-done',
        icon: 'description',
        text: 'Profile analysis completed',
        href: '/analysis',
        timestamp: new Date(Date.now() - 120000),
      });
    }

    if (connected.length > 0) {
      activities.push({
        id: 'datasource',
        icon: 'database',
        text: `${connected.length} data source${connected.length > 1 ? 's' : ''} connected`,
        href: '/datasource',
        timestamp: new Date(Date.now() - 300000),
      });
    }

    if (matches.length > 0) {
      activities.push({
        id: 'matches',
        icon: 'groups',
        text: `${matches.length} job match${matches.length > 1 ? 'es' : ''} found`,
        href: '/negotiations',
        timestamp: new Date(Date.now() - 60000),
      });
    }

    return {
      state,
      message,
      detail,
      activities: activities.slice(0, 3),
    };
  }, [datasources, resume, matches, sessions]);
}
