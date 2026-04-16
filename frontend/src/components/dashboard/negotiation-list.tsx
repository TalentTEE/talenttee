'use client';

import { useState } from 'react';
import { NegotiationSession, MatchResultDisplay } from '@/lib/types';
import Link from 'next/link';

const stateInfo: Record<string, { label: string; icon: string; className: string }> = {
  INITIATED: { label: 'Starting', icon: 'hourglass_top', className: 'text-yellow-400' },
  EMPLOYER_OFFER: { label: 'Negotiating', icon: 'sync', className: 'text-blue-400' },
  SEEKER_COUNTER: { label: 'Negotiating', icon: 'sync', className: 'text-blue-400' },
  EMPLOYER_COUNTER: { label: 'Negotiating', icon: 'sync', className: 'text-blue-400' },
  AGREED: { label: 'Agreed', icon: 'task_alt', className: 'text-[#FF2DF1]' },
  FAILED: { label: 'Failed', icon: 'cancel', className: 'text-red-400' },
  MAX_ROUNDS: { label: 'Max Rounds', icon: 'warning', className: 'text-orange-400' },
};

const ACTIVE_STATES = new Set(['INITIATED', 'EMPLOYER_OFFER', 'SEEKER_COUNTER', 'EMPLOYER_COUNTER']);

interface SectionConfig {
  key: string;
  title: string;
  badgeColor: string;
  defaultOpen: boolean;
  ctaLabel: (s: NegotiationSession) => string;
  ctaHref: (s: NegotiationSession) => string;
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'active',
    title: 'In Progress',
    badgeColor: '#FF2DF1',
    defaultOpen: true,
    ctaLabel: () => 'Monitor',
    ctaHref: (s) => `/negotiation/${s.id}`,
  },
  {
    key: 'agreed',
    title: 'Agreed — Review Required',
    badgeColor: '#39FF14',
    defaultOpen: true,
    ctaLabel: () => 'Review & Approve',
    ctaHref: (s) => `/negotiation/${s.id}/agree`,
  },
  {
    key: 'ended',
    title: 'Ended',
    badgeColor: '#f87171',
    defaultOpen: false,
    ctaLabel: () => 'View Details',
    ctaHref: (s) => `/negotiation/${s.id}`,
  },
];

function SessionRow({
  session,
  match,
  ctaLabel,
  ctaHref,
}: {
  session: NegotiationSession;
  match?: MatchResultDisplay;
  ctaLabel: string;
  ctaHref: string;
}) {
  const isAgreed = session.state === 'AGREED';
  const score = match ? Math.round(match.rerankScore * 100) : null;
  const info = stateInfo[session.state] || stateInfo.INITIATED;

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-border/5 hover:bg-accent transition-all">
      <div className="flex items-center gap-3">
        {score !== null ? (
          <div className="relative w-10 h-10 shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted" />
              <circle
                cx="20" cy="20" r="16" fill="none" strokeWidth="2.5"
                className="text-[#FF2DF1]"
                strokeDasharray={`${score * 1.005} 999`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#FF2DF1]">{score}%</span>
          </div>
        ) : (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isAgreed ? 'bg-[#FF2DF1]/10' : 'bg-muted'
          }`}>
            <span className={`material-symbols-outlined text-lg ${info.className}`} style={isAgreed ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              {info.icon}
            </span>
          </div>
        )}
        <div>
          <p className="text-base font-semibold text-foreground">
            {match ? `${match.jobTitle} - ${match.companyName}` : `Session ${session.id}`}
          </p>
          <div className={`flex items-center gap-1 text-sm font-medium ${info.className}`}>
            <span className="material-symbols-outlined text-sm" style={isAgreed ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              {info.icon}
            </span>
            {info.label}
            {ACTIVE_STATES.has(session.state) && (
              <span className="text-muted-foreground ml-1">R{session.currentRound}/{session.maxRounds}</span>
            )}
          </div>
        </div>
      </div>
      <Link
        href={ctaHref}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300"
      >
        {ctaLabel}
        <span className="material-symbols-outlined text-sm">arrow_forward</span>
      </Link>
    </div>
  );
}

export function NegotiationList({
  sessions,
  matches = [],
}: {
  sessions: NegotiationSession[];
  matches?: MatchResultDisplay[];
}) {
  const [endedOpen, setEndedOpen] = useState(false);
  const matchByJobId = new Map(matches.map((m) => [m.jobId, m]));

  const grouped: Record<string, NegotiationSession[]> = {
    active: sessions.filter((s) => ACTIVE_STATES.has(s.state)),
    agreed: sessions.filter((s) => s.state === 'AGREED'),
    ended: sessions.filter((s) => s.state === 'FAILED' || s.state === 'MAX_ROUNDS'),
  };

  const hasAnySessions = sessions.length > 0;

  return (
    <div className="bg-card rounded-2xl border border-[#BF5AF2]/30 p-6">
      <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground mb-4">Negotiations</h3>
      {!hasAnySessions && (
        <p className="text-base text-muted-foreground">No active negotiations.</p>
      )}
      <div className="space-y-5">
        {SECTIONS.map((section) => {
          const items = grouped[section.key];
          if (!items || items.length === 0) return null;

          const isCollapsible = section.key === 'ended';
          const isOpen = isCollapsible ? endedOpen : section.defaultOpen;

          return (
            <div key={section.key}>
              {/* Section Header */}
              <button
                type="button"
                className={`flex items-center gap-2 mb-2 ${isCollapsible ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={() => isCollapsible && setEndedOpen((o) => !o)}
                disabled={!isCollapsible}
              >
                <span className="text-sm font-semibold text-muted-foreground">{section.title}</span>
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${section.badgeColor} 20%, transparent)`,
                    color: section.badgeColor,
                  }}
                >
                  {items.length}
                </span>
                {isCollapsible && (
                  <span className={`material-symbols-outlined text-sm text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                )}
              </button>

              {/* Section Content */}
              {isOpen && (
                <div className="space-y-3">
                  {items.map((s) => (
                    <SessionRow
                      key={s.id}
                      session={s}
                      match={matchByJobId.get(s.jobId)}
                      ctaLabel={section.ctaLabel(s)}
                      ctaHref={section.ctaHref(s)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
