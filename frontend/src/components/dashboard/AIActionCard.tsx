'use client';

import Link from 'next/link';
import { DataSourceConnection, ResumeProfile, MatchResultDisplay, NegotiationSession, JobPosting } from '@/lib/types';
import { PipelineProgress, PipelineStage } from './PipelineProgress';

interface AIActionCardProps {
  datasources: DataSourceConnection[];
  resume: ResumeProfile | null;
  matches: MatchResultDisplay[];
  sessions: NegotiationSession[];
  role: 'SEEKER' | 'EMPLOYER';
  jobs?: JobPosting[];
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
        detail: 'Let AI generate your professional analysis.',
        ctaLabel: 'Generate Analysis',
        ctaHref: '/datasource',
        stage: 'analyze',
        animating: false,
      };
    }
    return {
      icon: 'hourglass_top',
      message: 'AI is analyzing your profile',
      detail: `Processing data from ${connected.length} source${connected.length > 1 ? 's' : ''}...`,
      ctaLabel: 'View Progress',
      ctaHref: '/datasource',
      stage: 'analyze',
      animating: true,
    };
  }

  if (resume.status === 'COMPLETE' && matches.length === 0 && activeSessions.length === 0) {
    return {
      icon: 'travel_explore',
      message: 'Your AI analysis is live',
      detail: 'Waiting for employer matches...',
      ctaLabel: 'View Analysis',
      ctaHref: '/datasource',
      stage: 'match',
      animating: true,
    };
  }

  if (matches.length > 0 && sessions.length === 0) {
    // If any match already has a negotiation session, show negotiating state
    const negotiatingMatch = matches.find((m) => m.negotiationSessionId);
    if (negotiatingMatch) {
      return {
        icon: 'handshake',
        message: 'AI is negotiating on your behalf',
        detail: 'Your agent is working on the best offer.',
        ctaLabel: 'Watch Live',
        ctaHref: `/negotiation/${negotiatingMatch.negotiationSessionId}`,
        stage: 'negotiate',
        animating: true,
      };
    }
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
  jobs: JobPosting[],
  sessions: NegotiationSession[],
  matches: MatchResultDisplay[],
): ActionState {
  const activeSessions = sessions.filter(
    (s) => s.state !== 'AGREED' && s.state !== 'FAILED' && s.state !== 'MAX_ROUNDS',
  );
  const agreedSessions = sessions.filter((s) => s.state === 'AGREED');

  if (jobs.length === 0) {
    return {
      icon: 'edit_note',
      message: 'Post your first job',
      detail: 'Create a job posting to start matching with candidates.',
      ctaLabel: 'Create Job',
      ctaHref: '/jobs/create',
      stage: 'post',
      animating: false,
    };
  }

  if (matches.length === 0 && sessions.length === 0) {
    return {
      icon: 'account_balance',
      message: 'Fund your escrow',
      detail: 'Deposit NEAR to begin matching with candidates.',
      ctaLabel: 'Go to Escrow',
      ctaHref: '/escrow',
      stage: 'fund',
      animating: false,
    };
  }

  if (matches.length > 0 && sessions.length === 0) {
    const negotiatingMatch = matches.find((m) => m.negotiationSessionId);
    if (negotiatingMatch) {
      return {
        icon: 'handshake',
        message: 'AI is negotiating with candidate',
        detail: 'Your agent is working on the best terms.',
        ctaLabel: 'Monitor',
        ctaHref: `/negotiation/${negotiatingMatch.negotiationSessionId}`,
        stage: 'negotiate',
        animating: true,
      };
    }
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
      ctaHref: `/negotiation/${agreedSessions[0].id}/agree`,
      stage: 'hire',
      animating: false,
    };
  }

  return {
    icon: 'smart_toy',
    message: 'AI is ready',
    detail: 'Your agent is standing by to find candidates.',
    ctaLabel: 'View Dashboard',
    ctaHref: '/dashboard/employer',
    stage: 'hire',
    animating: false,
  };
}

const stageColors: Record<PipelineStage, string> = {
  connect: '#0891b2',
  analyze: '#7c3aed',
  match: '#65a30d',
  negotiate: '#be185d',
  agree: '#d97706',
  post: '#d97706',
  fund: '#65a30d',
  hire: '#0891b2',
};

export function AIActionCard({ datasources, resume, matches, sessions, role, jobs = [] }: AIActionCardProps) {
  const action =
    role === 'SEEKER'
      ? getSeekerAction(datasources, resume, matches, sessions)
      : getEmployerAction(jobs, sessions, matches);

  const neon = stageColors[action.stage];

  return (
    <div
      className="relative overflow-hidden rounded-[1.75rem] border p-5 space-y-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-2xl"
      style={{
        borderColor: `color-mix(in srgb, ${neon} 18%, white 70%)`,
        background: `linear-gradient(135deg, color-mix(in srgb, ${neon} 10%, white 82%), rgba(255, 255, 255, 0.78))`,
      }}
    >
      <div className="flex items-start gap-4">
        {/* AI Icon */}
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white/70 shadow-sm ring-1 ring-border" style={{ color: neon }}>
          <span
            className={`material-symbols-outlined text-xl ${action.animating ? 'animate-pulse' : ''}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {action.icon}
          </span>
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <h3 className="font-[var(--font-manrope)] font-black text-foreground text-lg tracking-tight">
            {action.message}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{action.detail}</p>
        </div>

        {/* CTA */}
        <Link
          href={action.ctaHref}
          className="shrink-0 px-4 py-2.5 rounded-2xl text-base font-black text-white shadow-sm transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: neon }}
        >
          {action.ctaLabel}
        </Link>
      </div>

      {/* Pipeline Progress */}
      <PipelineProgress currentStage={action.stage} role={role} />
    </div>
  );
}
