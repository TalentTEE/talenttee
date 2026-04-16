'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getNegotiationSessions, getSeekerMatches, getEmployerMatches, getJobs } from '@/lib/api';
import { NegotiationSession, MatchResultDisplay } from '@/lib/types';

const NEON_PINK = '#FF2DF1';

export default function NegotiationsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<NegotiationSession[]>([]);
  const [matches, setMatches] = useState<MatchResultDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const matchPromise = user.role === 'SEEKER'
      ? getSeekerMatches().catch(() => [])
      : getJobs().then(jobs => jobs.length > 0 ? getEmployerMatches(jobs[0].id) : []).catch(() => []);

    Promise.all([
      getNegotiationSessions(),
      matchPromise,
    ]).then(([s, m]) => {
      setSessions(s);
      setMatches(m);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const matchByJobId = new Map(matches.map((m) => [m.jobId, m]));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-3xl text-muted-foreground animate-spin">progress_activity</span>
      </div>
    );
  }

  const agreed = sessions.filter((s) => s.state === 'AGREED');
  const failed = sessions.filter((s) => s.state === 'FAILED' || s.state === 'MAX_ROUNDS');

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          Negotiations
        </h1>
        <p className="text-base text-muted-foreground mt-1">
          AI negotiation results — review and decide.
        </p>
      </div>

      {/* Agreed — needs your decision */}
      {agreed.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-lg" style={{ color: NEON_PINK, fontVariationSettings: "'FILL' 1" }}>task_alt</span>
            <h2 className="font-[var(--font-manrope)] text-base font-bold text-foreground">Agreement Reached</h2>
            <span className="px-2 py-0.5 rounded-full text-sm font-bold" style={{ backgroundColor: `color-mix(in srgb, ${NEON_PINK} 15%, transparent)`, color: NEON_PINK }}>{agreed.length}</span>
          </div>
          <div className="space-y-3">
            {agreed.map((s) => (
              <AgreedRow key={s.id} session={s} match={matchByJobId.get(s.jobId)} userRole={user?.role} />
            ))}
          </div>
        </div>
      )}

      {/* Failed */}
      {failed.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-lg text-red-400">cancel</span>
            <h2 className="font-[var(--font-manrope)] text-base font-bold text-foreground">Failed</h2>
            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-sm font-bold">{failed.length}</span>
          </div>
          <div className="space-y-3">
            {failed.map((s) => (
              <FailedRow key={s.id} session={s} match={matchByJobId.get(s.jobId)} />
            ))}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="bg-card rounded-2xl border border-border/10 p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-muted-foreground mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>handshake</span>
          <p className="text-base font-semibold text-foreground mb-1">No negotiations yet</p>
          <p className="text-base text-muted-foreground">
            AI negotiations happen automatically and complete in seconds. Results will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Agreed Row: accept or reject ── */

function AgreedRow({ session: s, match, userRole }: { session: NegotiationSession; match?: MatchResultDisplay; userRole?: string }) {
  const bothApproved = s.seekerApproved && s.employerApproved;
  // Did the OTHER party approve (but not me yet)?
  const otherApproved = userRole === 'SEEKER'
    ? (s.employerApproved && !s.seekerApproved)
    : (s.seekerApproved && !s.employerApproved);
  // Neither side has approved yet
  const noneApproved = !s.seekerApproved && !s.employerApproved;

  // Icon
  const icon = bothApproved ? 'verified' : otherApproved ? 'notifications_active' : 'task_alt';
  const iconColor = bothApproved ? 'text-emerald-400' : otherApproved ? 'text-amber-400' : '';
  const iconBg = bothApproved ? 'bg-emerald-500/10' : otherApproved ? 'bg-amber-500/10' : '';

  // Label
  const label = bothApproved
    ? 'Finalized — both parties approved'
    : otherApproved
      ? 'Other party approved — your decision needed'
      : 'Agreement reached — review the terms';
  const labelColor = bothApproved ? 'text-emerald-400' : otherApproved ? 'text-amber-400' : '';

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-accent/50 border border-border/5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`} style={noneApproved ? { backgroundColor: `color-mix(in srgb, ${NEON_PINK} 10%, transparent)` } : undefined}>
          <span className={`material-symbols-outlined text-lg ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1", ...(noneApproved ? { color: NEON_PINK } : {}) }}>{icon}</span>
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            {match ? `${match.jobTitle} - ${match.companyName}` : `Session ${s.id}`}
          </p>
          <p className={`text-sm ${labelColor}`} style={noneApproved ? { color: NEON_PINK } : undefined}>
            {label}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {bothApproved ? (
          <Link
            href={`/negotiation/${s.id}/agree`}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            View Agreement
          </Link>
        ) : (
          <Link
            href={`/negotiation/${s.id}/agree`}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-90"
            style={{ backgroundColor: NEON_PINK, color: '#0a0a0a' }}
          >
            <span className="material-symbols-outlined text-base">visibility</span>
            {otherApproved ? 'Review & Decide' : 'Review & Decide'}
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── Failed Row ── */

function FailedRow({ session: s, match }: { session: NegotiationSession; match?: MatchResultDisplay }) {
  const isMaxRounds = s.state === 'MAX_ROUNDS';
  // If state is FAILED and at least one party had approved, it was rejected by the other
  const wasRejected = s.state === 'FAILED' && !isMaxRounds;

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-accent/50 border border-border/5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-lg text-red-400">{isMaxRounds ? 'timer_off' : 'block'}</span>
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            {match ? `${match.jobTitle} - ${match.companyName}` : `Session ${s.id}`}
          </p>
          <p className="text-sm text-red-400">
            {isMaxRounds
              ? `No agreement after ${s.maxRounds} rounds`
              : wasRejected
                ? 'Agreement rejected by the other party'
                : 'Negotiation failed — parties could not agree'}
          </p>
        </div>
      </div>
      <Link
        href={`/negotiation/${s.id}`}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-accent transition-all"
      >
        <span className="material-symbols-outlined text-base">history</span>
        View History
      </Link>
    </div>
  );
}
