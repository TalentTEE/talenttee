'use client';

import Link from 'next/link';
import { MatchResultDisplay, NegotiationSession } from '@/lib/types';

const stateLabels: Record<string, { label: string; icon: string; className: string }> = {
  INITIATED: { label: 'Starting', icon: 'hourglass_top', className: 'text-amber-700 bg-amber-50' },
  EMPLOYER_OFFER: { label: 'Negotiating', icon: 'sync', className: 'text-primary bg-primary/10' },
  SEEKER_COUNTER: { label: 'Negotiating', icon: 'sync', className: 'text-primary bg-primary/10' },
  EMPLOYER_COUNTER: { label: 'Negotiating', icon: 'sync', className: 'text-primary bg-primary/10' },
  AGREED: { label: 'Agreed', icon: 'check_circle', className: 'text-primary bg-primary/10' },
  FAILED: { label: 'Failed', icon: 'cancel', className: 'text-red-700 bg-red-50' },
  MAX_ROUNDS: { label: 'Max Rounds', icon: 'warning', className: 'text-orange-400 bg-orange-400/10' },
};

export function MatchList({
  matches,
  role,
  sessions = [],
}: {
  matches: MatchResultDisplay[];
  role: 'SEEKER' | 'EMPLOYER';
  sessions?: NegotiationSession[];
}) {
  const sessionByJobId = new Map(sessions.map((s) => [s.jobId, s]));

  return (
    <div className="rounded-[1.75rem] border border-border bg-white/75 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground">
          Top {role === 'SEEKER' ? 'Job' : 'Candidate'} Matches
        </h3>
        <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{matches.length} results</span>
      </div>
      <div className="space-y-3">
        {matches.map((m) => {
          const score = Math.round(m.rerankScore * 100);
          const session = sessionByJobId.get(m.jobId);
          const state = session ? stateLabels[session.state] : null;

          return (
            <div key={m.id} className="flex items-center gap-4 p-3 rounded-2xl bg-white/65 border border-border hover:bg-white transition-colors shadow-sm">
              {/* Score Ring */}
              <div className="relative w-12 h-12 shrink-0">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                  <circle
                    cx="24" cy="24" r="20" fill="none" strokeWidth="3"
                    className="text-primary"
                    strokeDasharray={`${score * 1.256} 999`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary">{score}%</span>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-foreground truncate">{m.jobTitle} - {m.companyName}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {m.seekerSkills.slice(0, 3).map((s) => (
                    <span key={s} className="px-1.5 py-0.5 rounded text-sm bg-muted text-muted-foreground font-medium">{s}</span>
                  ))}
                </div>
              </div>
              {/* Negotiation Status */}
              <div className="flex items-center gap-2 shrink-0">
                {session && state ? (
                  <Link
                    href={`/negotiation/${session.id}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all hover:opacity-80 ${state.className}`}
                  >
                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>{state.icon}</span>
                    {state.label}
                    {session.state !== 'AGREED' && session.state !== 'FAILED' && session.state !== 'MAX_ROUNDS' && (
                      <span className="text-sm font-medium opacity-70">R{session.currentRound}/{session.maxRounds}</span>
                    )}
                  </Link>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground bg-muted">
                    <span className="material-symbols-outlined text-base">schedule</span>
                    Waiting
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {matches.length === 0 && <p className="text-base text-muted-foreground">No matching results.</p>}
      </div>
    </div>
  );
}
