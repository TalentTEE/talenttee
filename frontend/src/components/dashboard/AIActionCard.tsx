'use client';

import Link from 'next/link';
import { DataSourceConnection, ResumeProfile, MatchResultDisplay, NegotiationSession } from '@/lib/types';
import { PipelineProgress, PipelineStage } from './PipelineProgress';

interface AIActionCardProps {
  datasources: DataSourceConnection[];
  resume: ResumeProfile | null;
  matches: MatchResultDisplay[];
  sessions: NegotiationSession[];
  role: 'SEEKER' | 'EMPLOYER';
}

interface ActionState {
  icon: string;
  message: string;
  detail: string;
  ctaLabel: string;
  ctaHref: string;
  stage: PipelineStage;
  animating: boolean;
}

function getSeekerAction(
  datasources: DataSourceConnection[],
  resume: ResumeProfile | null,
  matches: MatchResultDisplay[],
  sessions: NegotiationSession[],
): ActionState {
  const connected = datasources.filter((d) => d.status === 'CONNECTED' || d.status === 'MOCK');
  const agreedSessions = sessions.filter((s) => s.state === 'AGREED');
  const activeSessions = sessions.filter(
    (s) => s.state !== 'AGREED' && s.state !== 'FAILED' && s.state !== 'MAX_ROUNDS',
  );

  if (connected.length === 0) {
    return {
      icon: 'rocket_launch',
      message: "Let's get started",
      detail: 'Connect your data sources to let AI analyze your skills.',
      ctaLabel: 'Connect Data Source',
      ctaHref: '/datasource',
      stage: 'connect',
      animating: false,
    };
  }

  if (!resume || resume.status === 'COLLECTING' || resume.status === 'ANALYZING') {
    if (!resume || resume.status === 'ERROR') {
      return {
        icon: 'description',
        message: 'Your data is ready',
        detail: 'Let AI generate your professional resume.',
        ctaLabel: 'Generate Resume',
        ctaHref: '/resume',
        stage: 'analyze',
        animating: false,
      };
    }
    return {
      icon: 'hourglass_top',
      message: 'AI is analyzing your profile',
      detail: `Processing data from ${connected.length} source${connected.length > 1 ? 's' : ''}...`,
      ctaLabel: 'View Progress',
      ctaHref: '/resume',
      stage: 'analyze',
      animating: true,
    };
  }

  if (resume.status === 'COMPLETE' && matches.length === 0 && activeSessions.length === 0) {
    return {
      icon: 'travel_explore',
      message: 'Your AI resume is live',
      detail: 'Waiting for employer matches...',
      ctaLabel: 'View Resume',
      ctaHref: '/resume',
      stage: 'match',
      animating: true,
    };
  }

  if (matches.length > 0 && sessions.length === 0) {
    return {
      icon: 'groups',
      message: `${matches.length} new match${matches.length > 1 ? 'es' : ''} found!`,
      detail: 'Review and start negotiation.',
      ctaLabel: 'View Matches',
      ctaHref: '/negotiations',
      stage: 'match',
      animating: false,
    };
  }

  if (activeSessions.length > 0) {
    const s = activeSessions[0];
    return {
      icon: 'handshake',
      message: `Negotiating Round ${s.currentRound} of ${s.maxRounds}`,
      detail: `${activeSessions.length} active session${activeSessions.length > 1 ? 's' : ''}.`,
      ctaLabel: 'Watch Live',
      ctaHref: `/negotiation/${s.id}`,
      stage: 'negotiate',
      animating: true,
    };
  }

  if (agreedSessions.length > 0) {
    return {
      icon: 'celebration',
      message: 'Agreement reached!',
      detail: 'Review and approve the terms.',
      ctaLabel: 'Review Agreement',
      ctaHref: `/negotiation/${agreedSessions[0].id}`,
      stage: 'agree',
      animating: false,
    };
  }

  return {
    icon: 'smart_toy',
    message: 'AI is ready',
    detail: 'Your agent is standing by for new opportunities.',
    ctaLabel: 'View Dashboard',
    ctaHref: '/dashboard/seeker',
    stage: 'agree',
    animating: false,
  };
}

function getEmployerAction(
  sessions: NegotiationSession[],
  matches: MatchResultDisplay[],
): ActionState {
  const activeSessions = sessions.filter(
    (s) => s.state !== 'AGREED' && s.state !== 'FAILED' && s.state !== 'MAX_ROUNDS',
  );
  const agreedSessions = sessions.filter((s) => s.state === 'AGREED');

  if (matches.length > 0 && sessions.length === 0) {
    return {
      icon: 'groups',
      message: `Found ${matches.length} matching seeker${matches.length > 1 ? 's' : ''}`,
      detail: 'Review candidates and start negotiation.',
      ctaLabel: 'View Matches',
      ctaHref: '/negotiations',
      stage: 'match',
      animating: false,
    };
  }

  if (activeSessions.length > 0) {
    return {
      icon: 'handshake',
      message: `${activeSessions.length} negotiation${activeSessions.length > 1 ? 's' : ''} in progress`,
      detail: `Round ${activeSessions[0].currentRound} of ${activeSessions[0].maxRounds}.`,
      ctaLabel: 'Monitor',
      ctaHref: `/negotiation/${activeSessions[0].id}`,
      stage: 'negotiate',
      animating: true,
    };
  }

  if (agreedSessions.length > 0) {
    return {
      icon: 'celebration',
      message: 'Agreement reached!',
      detail: 'Review the negotiation outcome.',
      ctaLabel: 'View Agreement',
      ctaHref: `/negotiation/${agreedSessions[0].id}`,
      stage: 'agree',
      animating: false,
    };
  }

  return {
    icon: 'account_balance',
    message: 'Deposit NEAR to start',
    detail: 'Fund your escrow to begin matching with candidates.',
    ctaLabel: 'Go to Escrow',
    ctaHref: '/escrow',
    stage: 'connect',
    animating: false,
  };
}

const stageColors: Record<PipelineStage, string> = {
  connect: '#00F0FF',
  analyze: '#BF5AF2',
  match: '#39FF14',
  negotiate: '#FF2DF1',
  agree: '#FFE600',
};

export function AIActionCard({ datasources, resume, matches, sessions, role }: AIActionCardProps) {
  const action =
    role === 'SEEKER'
      ? getSeekerAction(datasources, resume, matches, sessions)
      : getEmployerAction(sessions, matches);

  const neon = stageColors[action.stage];

  return (
    <div
      className="rounded-2xl border p-5 space-y-4"
      style={{
        borderColor: `color-mix(in srgb, ${neon} 20%, transparent)`,
        background: `linear-gradient(to right, color-mix(in srgb, ${neon} 5%, transparent), color-mix(in srgb, ${neon} 10%, transparent))`,
      }}
    >
      <div className="flex items-start gap-4">
        {/* AI Icon */}
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${neon} 10%, transparent)` }}>
          <span
            className={`material-symbols-outlined text-xl ${action.animating ? 'animate-pulse' : ''}`}
            style={{ fontVariationSettings: "'FILL' 1", color: neon }}
          >
            {action.icon}
          </span>
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <h3 className="font-[var(--font-manrope)] font-bold text-foreground text-sm">
            {action.message}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{action.detail}</p>
        </div>

        {/* CTA */}
        <Link
          href={action.ctaHref}
          className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:brightness-90"
          style={{ backgroundColor: neon, color: '#0a0a0a' }}
        >
          {action.ctaLabel}
        </Link>
      </div>

      {/* Pipeline Progress */}
      {role === 'SEEKER' && <PipelineProgress currentStage={action.stage} />}
    </div>
  );
}
