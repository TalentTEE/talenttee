'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getNegotiationSession, getNegotiationRounds } from '@/lib/api';
import { NegotiationSession, NegotiationRound } from '@/lib/types';

function formatSalary(value: number): string {
  if (value >= 10000000) return `${(value / 10000000).toFixed(0)}M`;
  if (value >= 10000) return `${(value / 10000).toFixed(0)}K`;
  return value.toLocaleString();
}

function stateLabel(state: string): string {
  const map: Record<string, string> = {
    INITIATED: 'Initiated',
    EMPLOYER_OFFER: 'Employer Offer',
    SEEKER_COUNTER: 'Seeker Counter',
    EMPLOYER_COUNTER: 'Employer Counter',
    AGREED: 'Agreed',
    FAILED: 'Failed',
    MAX_ROUNDS: 'Max Rounds Reached',
  };
  return map[state] || state;
}

function stateColor(state: string): string {
  if (state === 'AGREED') return 'bg-primary/10 text-primary border-primary/20';
  if (state === 'FAILED' || state === 'MAX_ROUNDS') return 'bg-red-500/10 text-red-400 border-red-500/20';
  return 'bg-muted text-muted-foreground border-border/10';
}

function decisionStyle(decision: string) {
  if (decision === 'ACCEPT') return 'bg-primary/10 text-primary';
  if (decision === 'REJECT') return 'bg-red-500/10 text-red-400';
  return 'bg-yellow-500/10 text-yellow-400';
}

function decisionLabel(decision: string) {
  if (decision === 'ACCEPT') return 'Accepted the terms';
  if (decision === 'REJECT') return 'Rejected the proposal';
  return 'Proposed a counter-offer';
}

export default function NegotiationMonitorPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<NegotiationSession | null>(null);
  const [rounds, setRounds] = useState<NegotiationRound[]>([]);
  useEffect(() => {
    if (!sessionId) return;
    getNegotiationSession(sessionId).then(setSession);
    getNegotiationRounds(sessionId).then(setRounds);
  }, [sessionId]);

  const isTerminal = session?.state === 'AGREED' || session?.state === 'FAILED' || session?.state === 'MAX_ROUNDS';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          Negotiation Monitor
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Session #{sessionId}
        </p>
      </div>

      {/* Status Bar */}
      {session && (
        <div className="bg-card rounded-2xl border border-border/10 p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-lg text-primary"
                  style={session.state === 'AGREED' ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {session.state === 'AGREED' ? 'task_alt' : session.state === 'FAILED' || session.state === 'MAX_ROUNDS' ? 'cancel' : 'sync'}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Status</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${stateColor(session.state)}`}>
                  {stateLabel(session.state)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground text-right">Round Progress</p>
                <p className="text-xs text-muted-foreground text-right">
                  {session.currentRound} / {session.maxRounds}
                </p>
              </div>
              <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${(session.currentRound / session.maxRounds) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Participants */}
      {rounds.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-sm text-primary">corporate_fare</span>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Employer Agent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Seeker Agent</span>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-sm text-blue-400">person</span>
            </div>
          </div>
        </div>
      )}

      {/* Chat Conversation */}
      <div className="space-y-4">
        {rounds.map((round, idx) => {
          const prevSalary = idx > 0 ? rounds[idx - 1].proposal.salary : null;
          const salaryDelta = prevSalary !== null ? round.proposal.salary - prevSalary : null;
          const isSeeker = round.actor === 'SEEKER_AGENT';

          return (
            <div key={round.id} className="space-y-2">
              {/* Round Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-border/10" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Round {round.round}
                </span>
                <div className="flex-1 h-px bg-border/10" />
              </div>

              {/* Chat Bubble */}
              <div className={`flex ${isSeeker ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] space-y-2 ${isSeeker ? 'items-end' : 'items-start'} flex flex-col`}>
                  {/* Reasoning Message */}
                  <div className={`rounded-2xl p-4 ${
                    isSeeker
                      ? 'bg-blue-500/10 border border-blue-500/10 rounded-br-md'
                      : 'bg-card border border-border/10 rounded-bl-md'
                  }`}>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      &ldquo;{round.reasoning}&rdquo;
                    </p>
                  </div>

                  {/* Proposal Card */}
                  <div className={`rounded-xl border border-border/10 p-3 w-full ${
                    isSeeker ? 'bg-blue-500/5' : 'bg-accent/30'
                  }`}>
                    {/* Key Terms Row */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background/50 text-xs font-bold text-foreground">
                        {formatSalary(round.proposal.salary)}
                        {salaryDelta !== null && salaryDelta !== 0 && (
                          <span className={`text-[10px] font-semibold ${salaryDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {salaryDelta > 0 ? '+' : ''}{formatSalary(salaryDelta)}
                          </span>
                        )}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-background/50 text-xs text-foreground/80">
                        {round.proposal.remotePolicy}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-background/50 text-xs text-foreground/80">
                        {round.proposal.workingHours}
                      </span>
                      {round.proposal.signingBonus && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background/50 text-xs text-foreground/80">
                          Bonus {formatSalary(round.proposal.signingBonus)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{round.proposal.title}</span>
                      <span>·</span>
                      <span>Start {round.proposal.startDate}</span>
                    </div>
                  </div>

                  {/* Decision Badge */}
                  <div className={`flex ${isSeeker ? 'justify-end' : 'justify-start'}`}>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${decisionStyle(round.decision)}`}>
                      <span className="material-symbols-outlined text-[10px]" style={round.decision === 'ACCEPT' ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                        {round.decision === 'ACCEPT' ? 'task_alt' : round.decision === 'REJECT' ? 'cancel' : 'swap_horiz'}
                      </span>
                      {decisionLabel(round.decision)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {!isTerminal && rounds.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border/10" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Round {(rounds[rounds.length - 1]?.round ?? 0) + 1}
              </span>
              <div className="flex-1 h-px bg-border/10" />
            </div>
            <div className={`flex ${rounds[rounds.length - 1]?.actor === 'SEEKER_AGENT' ? 'justify-start' : 'justify-end'}`}>
              <div className={`rounded-2xl px-4 py-3 ${
                rounds[rounds.length - 1]?.actor === 'SEEKER_AGENT'
                  ? 'bg-card border border-border/10 rounded-bl-md'
                  : 'bg-blue-500/10 border border-blue-500/10 rounded-br-md'
              }`}>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-muted-foreground ml-1">
                    {rounds[rounds.length - 1]?.actor === 'SEEKER_AGENT' ? 'Employer Agent' : 'Seeker Agent'} is thinking...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {rounds.length === 0 && (
          <div className="bg-card rounded-2xl border border-border/10 p-8 text-center">
            <span className="material-symbols-outlined text-3xl text-muted-foreground mb-2">hourglass_empty</span>
            <p className="text-sm text-muted-foreground">Waiting for agents to begin negotiation...</p>
          </div>
        )}
      </div>

      {/* Terminal State Banner */}
      {isTerminal && session?.state === 'AGREED' && (
        <div className="bg-card rounded-2xl border border-primary/20 p-5 text-center">
          <span className="material-symbols-outlined text-3xl text-primary mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>handshake</span>
          <p className="text-sm font-semibold text-primary">
            Agreement Reached!
          </p>
          <p className="text-xs text-muted-foreground mt-1">Both agents have agreed on the terms.</p>
        </div>
      )}

      {isTerminal && session?.state !== 'AGREED' && (
        <div className="bg-card rounded-2xl border border-red-500/10 p-5 text-center">
          <span className="material-symbols-outlined text-3xl text-red-400 mb-2">warning</span>
          <p className="text-sm font-semibold text-red-400">
            Negotiation {session?.state === 'FAILED' ? 'Failed' : 'Reached Maximum Rounds'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">This negotiation session has ended without agreement.</p>
        </div>
      )}
    </div>
  );
}
