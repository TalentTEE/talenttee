'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getNegotiationSessions, getSeekerMatches, getEmployerMatches, getJobs } from '@/lib/api';
import { NegotiationSession, MatchResultDisplay } from '@/lib/types';

const AGENT_PINK = '#be185d';

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

  const inProgress = sessions.filter((s) => !['AGREED', 'FAILED', 'MAX_ROUNDS'].includes(s.state));
  const agreed = sessions.filter((s) => s.state === 'AGREED');
  const failed = sessions.filter((s) => s.state === 'FAILED' || s.state === 'MAX_ROUNDS');

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#be185d]">Agent workspace</p>
        <h1 className="font-[var(--font-manrope)] text-3xl font-black text-foreground tracking-[-0.055em] mt-1">
          Negotiations
        </h1>
        <p className="text-base text-muted-foreground mt-1">
          AI negotiation results — review and decide.
        </p>
      </div>

      {/* In Progress */}
      {inProgress.length > 0 && (
        <div className="rounded-[1.75rem] border border-border bg-white/75 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-lg text-primary animate-pulse">autorenew</span>
            <h2 className="font-[var(--font-manrope)] text-base font-bold text-foreground">In Progress</h2>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-bold">{inProgress.length}</span>
          </div>
          <div className="space-y-3">
            {inProgress.map((s) => (
              <InProgressRow key={s.id} session={s} match={matchByJobId.get(s.jobId)} />
            ))}
          </div>
        </div>
      )}

      {/* Agreed — needs your decision */}
      {agreed.length > 0 && (
        <div className="rounded-[1.75rem] border border-border bg-white/75 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-lg" style={{ color: AGENT_PINK, fontVariationSettings: "'FILL' 1" }}>task_alt</span>
            <h2 className="font-[var(--font-manrope)] text-base font-bold text-foreground">Agreement Reached</h2>
            <span className="px-2 py-0.5 rounded-full text-sm font-bold" style={{ backgroundColor: `color-mix(in srgb, ${AGENT_PINK} 15%, transparent)`, color: AGENT_PINK }}>{agreed.length}</span>
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
        <div className="rounded-[1.75rem] border border-border bg-white/75 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-lg text-red-600">cancel</span>
            <h2 className="font-[var(--font-manrope)] text-base font-bold text-foreground">Failed</h2>
            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-sm font-bold">{failed.length}</span>
          </div>
          <div className="space-y-3">
            {failed.map((s) => (
              <FailedRow key={s.id} session={s} match={matchByJobId.get(s.jobId)} />
            ))}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="rounded-[1.75rem] border border-border bg-white/75 p-12 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
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
  const iconColor = bothApproved ? 'text-[#3f6212]' : otherApproved ? 'text-amber-700' : '';
  const iconBg = bothApproved ? 'bg-[#65a30d]/10' : otherApproved ? 'bg-amber-100' : '';

  // Label
  const label = bothApproved
    ? 'Finalized — both parties approved'
    : otherApproved
      ? 'Other party approved — your decision needed'
      : 'Agreement reached — review the terms';
  const labelColor = bothApproved ? 'text-[#3f6212]' : otherApproved ? 'text-amber-700' : '';

  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/65 border border-border shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${iconBg}`} style={noneApproved ? { backgroundColor: `color-mix(in srgb, ${AGENT_PINK} 10%, transparent)` } : undefined}>
          <span className={`material-symbols-outlined text-lg ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1", ...(noneApproved ? { color: AGENT_PINK } : {}) }}>{icon}</span>
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            {match ? `${match.jobTitle} - ${match.companyName}` : `Session ${s.id}`}
          </p>
          <p className={`text-sm ${labelColor}`} style={noneApproved ? { color: AGENT_PINK } : undefined}>
            {label}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {bothApproved ? (
          <Link
            href={`/negotiation/${s.id}/agree`}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold bg-[#65a30d]/10 text-[#3f6212] hover:bg-[#65a30d]/15 transition-colors"
          >
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            View Agreement
          </Link>
        ) : (
          <Link
            href={`/negotiation/${s.id}/agree`}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-colors hover:brightness-95"
            style={{ backgroundColor: AGENT_PINK }}
          >
            <span className="material-symbols-outlined text-base">visibility</span>
            {otherApproved ? 'Review & Decide' : 'Review & Decide'}
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── In Progress Row ── */

function InProgressRow({ session: s, match }: { session: NegotiationSession; match?: MatchResultDisplay }) {
  const stateLabel: Record<string, string> = {
    INITIATED: 'Starting negotiation...',
    EMPLOYER_OFFER: 'Employer agent making offer...',
    SEEKER_COUNTER: 'Seeker agent countering...',
    EMPLOYER_COUNTER: 'Employer agent countering...',
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/65 border border-border shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-lg text-primary animate-spin">progress_activity</span>
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            {match ? `${match.jobTitle} - ${match.companyName}` : `Session ${s.id.slice(0, 8)}...`}
          </p>
          <p className="text-sm text-primary">
            {stateLabel[s.state] || `Round ${s.currentRound}/${s.maxRounds}`}
          </p>
        </div>
      </div>
      <Link
        href={`/negotiation/${s.id}`}
        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold bg-white/70 border border-border text-foreground hover:bg-white transition-colors"
      >
        <span className="material-symbols-outlined text-base">visibility</span>
        Monitor
      </Link>
    </div>
  );
}

/* ── Failed Row ── */

function FailedRow({ session: s, match }: { session: NegotiationSession; match?: MatchResultDisplay }) {
  const isMaxRounds = s.state === 'MAX_ROUNDS';
  // If state is FAILED and at least one party had approved, it was rejected by the other
  const wasRejected = s.state === 'FAILED' && !isMaxRounds;

  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/65 border border-border shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-lg text-red-700">{isMaxRounds ? 'timer_off' : 'block'}</span>
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            {match ? `${match.jobTitle} - ${match.companyName}` : `Session ${s.id}`}
          </p>
          <p className="text-sm text-red-700">
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
        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold bg-white/70 border border-border text-foreground hover:bg-white transition-colors"
      >
        <span className="material-symbols-outlined text-base">history</span>
        View History
      </Link>
    </div>
  );
}
