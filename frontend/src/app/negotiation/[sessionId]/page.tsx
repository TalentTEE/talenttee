'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getNegotiationSession, getNegotiationRounds, getMatchContext } from '@/lib/api';
import { NegotiationSession, NegotiationRound, MatchContext, isStructuredReasoning } from '@/lib/types';
import { ThinkingAnimation } from '@/components/negotiation/ThinkingAnimation';
import { StrategyInsight } from '@/components/negotiation/StrategyInsight';
import { MatchContextCard } from '@/components/negotiation/MatchContextCard';
import { formatSalary } from '@/lib/format';

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
  if (state === 'AGREED') return 'bg-[#FF2DF1]/10 text-[#FF2DF1] border-[#FF2DF1]/20';
  if (state === 'FAILED' || state === 'MAX_ROUNDS') return 'bg-red-500/10 text-red-400 border-red-500/20';
  return 'bg-muted text-muted-foreground border-border/10';
}

function decisionStyle(decision: string) {
  if (decision === 'ACCEPT') return 'bg-[#FF2DF1]/10 text-[#FF2DF1]';
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
  const [matchContext, setMatchContext] = useState<MatchContext | null>(null);

  const isTerminal = session?.state === 'AGREED' || session?.state === 'FAILED' || session?.state === 'MAX_ROUNDS';

  useEffect(() => {
    if (!sessionId) return;
    getMatchContext(sessionId).then(setMatchContext);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const loadData = () => {
      getNegotiationSession(sessionId).then(setSession);
      getNegotiationRounds(sessionId).then(setRounds);
    };

    loadData();

    const interval = setInterval(() => {
      if (!isTerminal) loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionId, isTerminal]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          Negotiation Monitor
        </h1>
        <p className="text-base text-muted-foreground mt-1">
          Session #{sessionId}
        </p>
      </div>

      {/* Status Bar */}
      {session && (
        <div className="bg-card rounded-2xl border border-border/10 p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FF2DF1]/10 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-lg text-[#FF2DF1]"
                  style={session.state === 'AGREED' ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {session.state === 'AGREED' ? 'task_alt' : session.state === 'FAILED' || session.state === 'MAX_ROUNDS' ? 'cancel' : 'sync'}
                </span>
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Status</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium border ${stateColor(session.state)}`}>
                  {stateLabel(session.state)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-base font-semibold text-foreground text-right">Round Progress</p>
                <p className="text-sm text-muted-foreground text-right">
                  {session.currentRound} / {session.maxRounds}
                </p>
              </div>
              <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#FF2DF1] transition-all duration-500"
                  style={{ width: `${(session.currentRound / session.maxRounds) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match Context */}
      {matchContext && <MatchContextCard context={matchContext} />}

      {/* Final Terms Summary */}
      {isTerminal && rounds.length > 0 && (() => {
        const lastProposal = rounds[rounds.length - 1].proposal;
        if (!lastProposal) return null;
        return (
          <div className="bg-card rounded-2xl border border-border/10 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-base text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                summarize
              </span>
              <h2 className="text-base font-bold text-foreground">Final Terms</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-accent/50 border border-border/5 p-3 text-center">
                <p className="text-sm text-muted-foreground mb-1">Salary</p>
                <p className="text-base font-bold text-foreground">{formatSalary(lastProposal.salary)}</p>
              </div>
              <div className="rounded-xl bg-accent/50 border border-border/5 p-3 text-center">
                <p className="text-sm text-muted-foreground mb-1">Remote Policy</p>
                <p className="text-base font-bold text-foreground">{lastProposal.remotePolicy ?? 'N/A'}</p>
              </div>
              <div className="rounded-xl bg-accent/50 border border-border/5 p-3 text-center">
                <p className="text-sm text-muted-foreground mb-1">Working Hours</p>
                <p className="text-base font-bold text-foreground">{lastProposal.workingHours ?? 'N/A'}</p>
              </div>
              <div className="rounded-xl bg-accent/50 border border-border/5 p-3 text-center">
                <p className="text-sm text-muted-foreground mb-1">Signing Bonus</p>
                <p className="text-base font-bold text-foreground">
                  {lastProposal.signingBonus ? formatSalary(lastProposal.signingBonus) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Agent Participants */}
      {rounds.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FF2DF1]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-base text-[#FF2DF1]">corporate_fare</span>
            </div>
            <span className="text-sm font-semibold text-muted-foreground">Employer Agent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Seeker Agent</span>
            <div className="w-8 h-8 rounded-full bg-[#FF2DF1]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-base text-[#FF2DF1]">person</span>
            </div>
          </div>
        </div>
      )}

      {/* Chat Conversation */}
      <div className="space-y-4">
        {rounds.map((round, idx) => {
          const prevSalary = idx > 0 ? rounds[idx - 1].proposal?.salary ?? null : null;
          const salaryDelta = prevSalary !== null && round.proposal?.salary != null ? round.proposal.salary - prevSalary : null;
          const isSeeker = round.actor === 'SEEKER_AGENT';

          return (
            <div key={round.id} className="space-y-2">
              {/* Round Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-border/10" />
                <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
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
                      ? 'bg-[#FF2DF1]/10 border border-[#FF2DF1]/10 rounded-br-md'
                      : 'bg-card border border-border/10 rounded-bl-md'
                  }`}>
                    {isStructuredReasoning(round.reasoning) ? (
                      <>
                        <p className="text-base text-foreground/90 leading-relaxed mb-2">
                          &ldquo;{round.reasoning.summary}&rdquo;
                        </p>
                        <ul className="space-y-1">
                          {round.reasoning.factors.map((factor, fi) => (
                            <li key={fi} className="flex items-start gap-1.5 text-sm text-muted-foreground leading-relaxed">
                              <span className="material-symbols-outlined text-xs text-primary/50 mt-1 shrink-0">arrow_right</span>
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="text-base text-foreground/90 leading-relaxed">
                        &ldquo;{round.reasoning}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Proposal Card */}
                  {round.proposal ? (
                  <div className={`rounded-xl border border-border/10 p-3 w-full ${
                    isSeeker ? 'bg-[#FF2DF1]/5' : 'bg-accent/30'
                  }`}>
                    {/* Key Terms Row */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background/50 text-sm font-bold text-foreground">
                        {formatSalary(round.proposal.salary)}
                        {salaryDelta !== null && salaryDelta !== 0 && (
                          <span className={`text-sm font-semibold ${salaryDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {salaryDelta > 0 ? '+' : ''}{formatSalary(salaryDelta)}
                          </span>
                        )}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-background/50 text-sm text-foreground/80">
                        {round.proposal.remotePolicy ?? 'N/A'}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-lg bg-background/50 text-sm text-foreground/80">
                        {round.proposal.workingHours ?? 'N/A'}
                      </span>
                      {round.proposal.signingBonus && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background/50 text-sm text-foreground/80">
                          Bonus {formatSalary(round.proposal.signingBonus)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{round.proposal.title ?? 'N/A'}</span>
                      <span>·</span>
                      <span>Start {round.proposal.startDate ?? 'TBD'}</span>
                    </div>
                  </div>
                  ) : null}

                  {/* Decision Badge */}
                  <div className={`flex ${isSeeker ? 'justify-end' : 'justify-start'}`}>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold ${decisionStyle(round.decision)}`}>
                      <span className="material-symbols-outlined text-sm" style={round.decision === 'ACCEPT' ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                        {round.decision === 'ACCEPT' ? 'task_alt' : round.decision === 'REJECT' ? 'cancel' : 'swap_horiz'}
                      </span>
                      {decisionLabel(round.decision)}
                    </span>
                  </div>

                  {/* Strategy Insight */}
                  <StrategyInsight reasoning={round.reasoning} />
                </div>
              </div>
            </div>
          );
        })}

        {/* Thinking Animation */}
        {!isTerminal && rounds.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border/10" />
              <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
                Round {(rounds[rounds.length - 1]?.round ?? 0) + 1}
              </span>
              <div className="flex-1 h-px bg-border/10" />
            </div>
            <div className={`flex ${rounds[rounds.length - 1]?.actor === 'SEEKER_AGENT' ? 'justify-start' : 'justify-end'}`}>
              <div className="max-w-[85%]">
                <ThinkingAnimation
                  agentLabel={rounds[rounds.length - 1]?.actor === 'SEEKER_AGENT' ? 'Employer Agent' : 'Seeker Agent'}
                />
              </div>
            </div>
          </div>
        )}

        {rounds.length === 0 && (
          <div className="bg-card rounded-2xl border border-border/10 p-8 text-center">
            <span className="material-symbols-outlined text-3xl text-muted-foreground mb-2">hourglass_empty</span>
            <p className="text-base text-muted-foreground">Waiting for agents to begin negotiation...</p>
          </div>
        )}
      </div>

      {/* Terminal State Banner — Agreement */}
      {isTerminal && session?.state === 'AGREED' && (
        <div className="relative bg-card rounded-2xl border border-[#FF2DF1]/20 p-6 text-center overflow-hidden animate-[fadeSlideUp_500ms_ease-out]">
          {/* Confetti particles (CSS only) */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <span
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  left: `${12 + i * 11}%`,
                  top: '60%',
                  backgroundColor: ['#00E5FF', '#FF2DF1', '#39FF14', '#FFE600', '#BF5AF2', '#FF3B5C', '#00E5FF', '#39FF14'][i],
                  animation: `confetti ${0.8 + i * 0.1}s ease-out ${i * 0.08}s both`,
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#FF2DF1]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg text-[#FF2DF1]">corporate_fare</span>
            </div>
            <span className="material-symbols-outlined text-3xl text-[#FF2DF1] animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>handshake</span>
            <div className="w-10 h-10 rounded-full bg-[#FF2DF1]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg text-[#FF2DF1]">person</span>
            </div>
          </div>
          <p className="text-base font-bold text-[#39FF14]">
            Agreement Reached!
          </p>
          <p className="text-sm text-muted-foreground mt-1">Both agents have agreed on the terms.</p>
        </div>
      )}

      {/* Terminal State Banner — Failure */}
      {isTerminal && session?.state !== 'AGREED' && (
        <div className="bg-card rounded-2xl border border-red-500/10 p-6 text-center animate-[fadeSlideUp_500ms_ease-out]" style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.3)' }}>
          <div className="flex items-center justify-center gap-6 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#FF2DF1]/10 flex items-center justify-center -translate-x-2 transition-transform">
              <span className="material-symbols-outlined text-lg text-[#FF2DF1]">corporate_fare</span>
            </div>
            <span className="material-symbols-outlined text-3xl text-red-400">warning</span>
            <div className="w-10 h-10 rounded-full bg-[#FF2DF1]/10 flex items-center justify-center translate-x-2 transition-transform">
              <span className="material-symbols-outlined text-lg text-[#FF2DF1]">person</span>
            </div>
          </div>
          <p className="text-base font-bold text-red-400">
            Negotiation {session?.state === 'FAILED' ? 'Failed' : 'Reached Maximum Rounds'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">This negotiation session has ended without agreement.</p>
        </div>
      )}

      {/* Encrypted History Link */}
      {isTerminal && (
        <div className="text-center">
          <Link
            href={`/negotiation/${sessionId}/history`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/10 bg-card text-base font-medium text-foreground hover:bg-accent/50 transition-all"
          >
            <span className="material-symbols-outlined text-lg">encrypted</span>
            View Encrypted History
          </Link>
        </div>
      )}
    </div>
  );
}
