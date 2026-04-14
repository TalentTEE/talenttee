'use client';

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

export function NegotiationList({
  sessions,
  matches = [],
}: {
  sessions: NegotiationSession[];
  matches?: MatchResultDisplay[];
}) {
  const matchByJobId = new Map(matches.map((m) => [m.jobId, m]));

  return (
    <div className="bg-card rounded-2xl border border-border/10 p-6">
      <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground mb-4">Active Negotiations</h3>
      <div className="space-y-3">
        {sessions.map((s) => {
          const isAgreed = s.state === 'AGREED';
          const match = matchByJobId.get(s.jobId);
          const score = match ? Math.round(match.rerankScore * 100) : null;
          const info = stateInfo[s.state] || stateInfo.INITIATED;

          return (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-border/5 hover:bg-accent transition-all">
              <div className="flex items-center gap-3">
                {/* Match Score Ring */}
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
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#FF2DF1]">{score}%</span>
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
                  <p className="text-sm font-semibold text-foreground">
                    {match ? `${match.jobTitle} - ${match.companyName}` : `Session ${s.id}`}
                  </p>
                  <div className={`flex items-center gap-1 text-xs font-medium ${info.className}`}>
                    <span className="material-symbols-outlined text-xs" style={isAgreed ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                      {info.icon}
                    </span>
                    {info.label}
                    {!isAgreed && s.state !== 'FAILED' && s.state !== 'MAX_ROUNDS' && (
                      <span className="text-muted-foreground ml-1">R{s.currentRound}/{s.maxRounds}</span>
                    )}
                  </div>
                </div>
              </div>
              <Link
                href={isAgreed ? `/negotiation/${s.id}/agree` : `/negotiation/${s.id}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                {isAgreed ? 'View Result' : 'Monitor'}
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </Link>
            </div>
          );
        })}
        {sessions.length === 0 && <p className="text-sm text-muted-foreground">No active negotiations.</p>}
      </div>
    </div>
  );
}
