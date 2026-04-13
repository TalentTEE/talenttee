'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getNegotiationSessions, getSeekerMatches, getEmployerMatches } from '@/lib/api';
import { NegotiationSession, MatchResultDisplay } from '@/lib/types';

const stateInfo: Record<string, { label: string; icon: string; className: string }> = {
  INITIATED: { label: 'Starting', icon: 'hourglass_top', className: 'text-yellow-400' },
  EMPLOYER_OFFER: { label: 'Negotiating', icon: 'sync', className: 'text-blue-400' },
  SEEKER_COUNTER: { label: 'Negotiating', icon: 'sync', className: 'text-blue-400' },
  EMPLOYER_COUNTER: { label: 'Negotiating', icon: 'sync', className: 'text-blue-400' },
  AGREED: { label: 'Agreed', icon: 'task_alt', className: 'text-primary' },
  FAILED: { label: 'Failed', icon: 'cancel', className: 'text-red-400' },
  MAX_ROUNDS: { label: 'Max Rounds', icon: 'warning', className: 'text-orange-400' },
};

export default function NegotiationsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<NegotiationSession[]>([]);
  const [matches, setMatches] = useState<MatchResultDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getNegotiationSessions(),
      user.role === 'SEEKER'
        ? getSeekerMatches(user.id)
        : getEmployerMatches('job-1'),
    ]).then(([s, m]) => {
      setSessions(s);
      setMatches(m);
      setLoading(false);
    });
  }, [user]);

  const matchByJobId = new Map(matches.map((m) => [m.jobId, m]));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-3xl text-muted-foreground animate-spin">progress_activity</span>
      </div>
    );
  }

  const inProgress = sessions.filter(
    (s) => s.state !== 'AGREED' && s.state !== 'FAILED' && s.state !== 'MAX_ROUNDS'
  );
  const completed = sessions.filter(
    (s) => s.state === 'AGREED' || s.state === 'FAILED' || s.state === 'MAX_ROUNDS'
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          Negotiations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track and monitor all your negotiation sessions.
        </p>
      </div>

      {/* In Progress */}
      {inProgress.length > 0 && (
        <Section title="In Progress" count={inProgress.length}>
          {inProgress.map((s) => (
            <SessionRow key={s.id} session={s} match={matchByJobId.get(s.jobId)} />
          ))}
        </Section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <Section title="Completed" count={completed.length}>
          {completed.map((s) => (
            <SessionRow key={s.id} session={s} match={matchByJobId.get(s.jobId)} />
          ))}
        </Section>
      )}

      {sessions.length === 0 && (
        <div className="bg-card rounded-2xl border border-border/10 p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-muted-foreground mb-3">handshake</span>
          <p className="text-sm font-semibold text-foreground mb-1">No negotiations yet</p>
          <p className="text-xs text-muted-foreground">
            Negotiations will appear here once you and an employer both agree on a match.
          </p>
        </div>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border/10 p-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-[var(--font-manrope)] text-base font-bold text-foreground">{title}</h2>
        <span className="px-2 py-0.5 rounded-full bg-muted text-[11px] font-bold text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SessionRow({ session: s, match }: { session: NegotiationSession; match?: MatchResultDisplay }) {
  const isAgreed = s.state === 'AGREED';
  const isTerminal = isAgreed || s.state === 'FAILED' || s.state === 'MAX_ROUNDS';
  const score = match ? Math.round(match.rerankScore * 100) : null;
  const info = stateInfo[s.state] || stateInfo.INITIATED;

  return (
    <Link
      href={isAgreed ? `/negotiation/${s.id}/agree` : `/negotiation/${s.id}`}
      className="flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-border/5 hover:bg-accent transition-all group"
    >
      <div className="flex items-center gap-3">
        {/* Score Ring */}
        {score !== null ? (
          <div className="relative w-10 h-10 shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted" />
              <circle
                cx="20" cy="20" r="16" fill="none" strokeWidth="2.5"
                className="text-primary"
                strokeDasharray={`${score * 1.005} 999`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-primary">{score}%</span>
          </div>
        ) : (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isAgreed ? 'bg-primary/10' : 'bg-muted'
          }`}>
            <span
              className={`material-symbols-outlined text-lg ${info.className}`}
              style={isAgreed ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {info.icon}
            </span>
          </div>
        )}

        <div>
          <p className="text-sm font-semibold text-foreground">
            {match ? `${match.jobTitle} - ${match.companyName}` : `Session ${s.id}`}
          </p>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${info.className}`}>
              <span
                className="material-symbols-outlined text-xs"
                style={isAgreed ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {info.icon}
              </span>
              {info.label}
            </span>
            {!isTerminal && (
              <span className="text-xs text-muted-foreground">
                R{s.currentRound}/{s.maxRounds}
              </span>
            )}
          </div>
        </div>
      </div>

      <span className="material-symbols-outlined text-base text-muted-foreground group-hover:text-foreground transition-colors">
        arrow_forward
      </span>
    </Link>
  );
}
