'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAgreement, getNegotiationSession, getNegotiationRounds, approveAgreement, rejectAgreement, USE_DUMMY } from '@/lib/api';
import { AgreementRecord, NegotiationRound, isStructuredReasoning } from '@/lib/types';
import { formatSalary } from '@/lib/format';

type FlowState = 'idle' | 'approving' | 'waiting' | 'completed' | 'rejected';

function ReasoningBubble({ reasoning, isSeeker }: { reasoning: string | import('@/lib/types').NegotiationReasoning; isSeeker: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const structured = isStructuredReasoning(reasoning);

  return (
    <div className={`rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
      isSeeker
        ? 'bg-primary/10 border border-primary/10 rounded-br-md'
        : 'bg-accent/50 border border-border/10 rounded-bl-md'
    }`}>
      <p className="text-foreground/90">
        &ldquo;{structured ? reasoning.summary : reasoning}&rdquo;
      </p>
      {structured && reasoning.factors.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className={`material-symbols-outlined text-xs transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
              expand_more
            </span>
            {expanded ? 'Hide' : 'View'} factors
          </button>
          {expanded && (
            <ul className="mt-1.5 space-y-1 animate-[fadeSlideUp_200ms_ease-out]">
              {reasoning.factors.map((factor, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground/80 leading-relaxed">
                  <span className="material-symbols-outlined text-[10px] text-primary/50 mt-0.5 shrink-0">arrow_right</span>
                  {factor}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default function AgreementPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [agreement, setAgreement] = useState<AgreementRecord | null>(null);
  const [rounds, setRounds] = useState<NegotiationRound[]>([]);
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    getNegotiationRounds(sessionId).then(setRounds).catch(() => {});

    getAgreement(sessionId)
      .then((data) => {
        setAgreement(data);
        // Restore state from existing agreement
        if (data.rejected) {
          setFlowState('rejected');
        } else if (data.seekerApproved && data.employerApproved) {
          setFlowState('completed');
          if (data.onChainTxHash) setTxHash(data.onChainTxHash);
        } else if (data.seekerApproved || data.employerApproved) {
          setFlowState('waiting');
        }
      })
      .catch(async () => {
        // No agreement record yet — build from negotiation rounds
        try {
          const [session, roundData] = await Promise.all([
            getNegotiationSession(sessionId),
            getNegotiationRounds(sessionId),
          ]);
          const lastRound = roundData[roundData.length - 1];
          if (lastRound?.proposal) {
            setAgreement({
              sessionId,
              agreementHash: `pending-${sessionId.slice(0, 8)}`,
              summary: {
                positionTitle: lastRound.proposal.title || 'N/A',
                agreedSalary: lastRound.proposal.salary || 0,
                startDate: lastRound.proposal.startDate || 'TBD',
                negotiationRounds: session.currentRound || roundData.length,
                remotePolicy: lastRound.proposal.remotePolicy || 'N/A',
                probationMonths: lastRound.proposal.probationMonths || 0,
              },
              seekerApproved: false,
              employerApproved: false,
              onChainTxHash: null,
            });
          }
        } catch {
          // Both paths failed
        }
      });
  }, [sessionId]);

  // Poll for other party's approval (real mode)
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const updated = await getAgreement(sessionId);
        if (updated.seekerApproved && updated.employerApproved) {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setAgreement(updated);
          setTxHash(updated.onChainTxHash ?? null);
          setFlowState('completed');
        }
      } catch {
        // Keep polling
      }
    }, 3000);
  }, [sessionId]);

  const handleApprove = async () => {
    if (flowState === 'approving') return;
    setFlowState('approving');
    try {
      await approveAgreement(sessionId);

      // Move to waiting state
      setFlowState('waiting');

      if (USE_DUMMY) {
        // Simulate other party approving after 3 seconds
        setTimeout(() => {
          setTxHash('0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''));
          if (agreement) {
            setAgreement({ ...agreement, seekerApproved: true, employerApproved: true });
          }
          setFlowState('completed');
        }, 3000);
      } else {
        // Try to fetch updated agreement — might already be completed
        try {
          const updated = await getAgreement(sessionId);
          if (updated.seekerApproved && updated.employerApproved) {
            setAgreement(updated);
            setTxHash(updated.onChainTxHash ?? null);
            setFlowState('completed');
            return;
          }
        } catch {
          // Not yet — start polling
        }
        startPolling();
      }
    } catch (err) {
      setFlowState('idle');
      alert(err instanceof Error ? err.message : 'Failed to approve agreement');
    }
  };

  const handleReject = async () => {
    try {
      await rejectAgreement(sessionId);
      setFlowState('rejected');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject agreement');
    }
  };

  if (!agreement) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-symbols-outlined text-3xl text-muted-foreground animate-spin">progress_activity</span>
          <p className="text-base text-muted-foreground mt-2">Loading agreement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="mb-6 shrink-0">
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          Agreement Review
        </h1>
        <p className="text-base text-muted-foreground mt-1">
          Session #{sessionId}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left Column: Agreement Details ── */}
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="bg-primary/5 rounded-2xl border border-primary/20 p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto mb-3 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-3xl text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                celebration
              </span>
            </div>
            <h2 className="font-[var(--font-manrope)] text-xl font-extrabold text-primary">
              Agreement Reached
            </h2>
            <p className="text-base text-muted-foreground mt-1">
              Both AI agents have reached a consensus on the terms below.
            </p>
          </div>

          {/* Agreement Details Card */}
          <div className="bg-card rounded-2xl border border-border/10 p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-base text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                description
              </span>
              <h3 className="text-base font-bold text-foreground">Agreement Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-accent/50 border border-border/5 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-base text-muted-foreground">badge</span>
                  <p className="text-sm uppercase tracking-wider text-muted-foreground">Position</p>
                </div>
                <p className="text-base font-bold text-foreground">{agreement.summary.positionTitle}</p>
              </div>

              <div className="rounded-xl bg-accent/50 border border-border/5 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-base text-muted-foreground">payments</span>
                  <p className="text-sm uppercase tracking-wider text-muted-foreground">Annual Salary</p>
                </div>
                <p className="text-base font-bold text-primary">{formatSalary(agreement.summary.agreedSalary)}</p>
              </div>

              <div className="rounded-xl bg-accent/50 border border-border/5 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-base text-muted-foreground">home_work</span>
                  <p className="text-sm uppercase tracking-wider text-muted-foreground">Work Type</p>
                </div>
                <p className="text-base font-bold text-foreground">{agreement.summary.remotePolicy}</p>
              </div>

              <div className="rounded-xl bg-accent/50 border border-border/5 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-base text-muted-foreground">calendar_month</span>
                  <p className="text-sm uppercase tracking-wider text-muted-foreground">Start Date</p>
                </div>
                <p className="text-base font-bold text-foreground">{agreement.summary.startDate}</p>
              </div>

              <div className="rounded-xl bg-accent/50 border border-border/5 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-base text-muted-foreground">schedule</span>
                  <p className="text-sm uppercase tracking-wider text-muted-foreground">Probation Period</p>
                </div>
                <p className="text-base font-bold text-foreground">{agreement.summary.probationMonths} months</p>
              </div>

              <div className="rounded-xl bg-accent/50 border border-border/5 p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-base text-muted-foreground">repeat</span>
                  <p className="text-sm uppercase tracking-wider text-muted-foreground">Total Rounds</p>
                </div>
                <p className="text-base font-bold text-foreground">{agreement.summary.negotiationRounds} rounds</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-muted/50 border border-border/5 p-3">
              <p className="text-sm uppercase tracking-wider text-muted-foreground mb-1">Agreement Hash</p>
              <p className="text-sm font-mono text-foreground/70 break-all">{agreement.agreementHash}</p>
            </div>
          </div>

          {/* On-Chain Warning — only when still deciding */}
          {flowState === 'idle' && (
            <div className="bg-card rounded-2xl border border-amber-500/10 p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-base text-amber-400">warning</span>
                </div>
                <div>
                  <p className="text-base font-bold text-foreground mb-1">On-Chain Recording</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    By approving this agreement, the final terms will be permanently recorded on the NEAR blockchain.
                    This action is irreversible. Both parties must approve for the transaction to be finalized.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Action Buttons (idle) ── */}
          {flowState === 'idle' && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleApprove}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-base font-bold hover:bg-primary/90 transition-all duration-300 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                Approve & Record On-Chain
              </button>
              <button
                onClick={handleReject}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-muted text-foreground text-base font-bold hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">cancel</span>
                Reject
              </button>
            </div>
          )}

          {/* ── Approving spinner ── */}
          {flowState === 'approving' && (
            <div className="bg-primary/5 rounded-2xl border border-primary/20 p-6 text-center">
              <span className="material-symbols-outlined text-3xl text-primary animate-spin">progress_activity</span>
              <p className="text-base font-semibold text-foreground mt-3">Recording on-chain...</p>
              <p className="text-sm text-muted-foreground mt-1">Please wait while your approval is being processed.</p>
            </div>
          )}

          {/* ── Waiting for other party ── */}
          {flowState === 'waiting' && (
            <div className="bg-amber-500/5 rounded-2xl border border-amber-500/15 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 mx-auto mb-3 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-amber-400 animate-pulse">hourglass_top</span>
              </div>
              <p className="text-base font-bold text-foreground">Your Approval Recorded</p>
              <p className="text-sm text-muted-foreground mt-1">
                Waiting for the other party to review and approve the agreement.
                The transaction will be finalized once both parties have approved.
              </p>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="text-center">
                  <span className="material-symbols-outlined text-xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <p className="text-xs text-muted-foreground mt-1">Your approval</p>
                </div>
                <div className="w-12 h-px bg-border/20" />
                <div className="text-center">
                  <span className="material-symbols-outlined text-xl text-muted-foreground/30 animate-pulse">pending</span>
                  <p className="text-xs text-muted-foreground mt-1">Other party</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Completed — both approved ── */}
          {flowState === 'completed' && (
            <>
              <div className="bg-emerald-500/5 rounded-2xl border border-emerald-500/15 p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 mx-auto mb-3 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                </div>
                <p className="text-lg font-extrabold text-emerald-400">Agreement Finalized</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Both parties have approved. The agreement has been recorded on-chain.
                </p>
                {/* Approval status */}
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <p className="text-xs text-emerald-400/80 mt-1">Seeker</p>
                  </div>
                  <span className="material-symbols-outlined text-2xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>handshake</span>
                  <div className="text-center">
                    <span className="material-symbols-outlined text-xl text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <p className="text-xs text-emerald-400/80 mt-1">Employer</p>
                  </div>
                </div>
              </div>

              {/* TX Hash */}
              {txHash && (
                <div className="bg-card rounded-2xl border border-border/10 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-base text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      verified
                    </span>
                    <p className="text-base font-bold text-primary">On-Chain Transaction</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 border border-border/5 p-3">
                    <p className="text-sm uppercase tracking-wider text-muted-foreground mb-1">Transaction Hash</p>
                    <p className="text-sm font-mono text-foreground break-all">{txHash}</p>
                  </div>
                </div>
              )}

              {/* Next Steps */}
              <div className="bg-card rounded-2xl border border-border/10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-base text-[#00F0FF]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    rocket_launch
                  </span>
                  <h3 className="text-base font-bold text-foreground">Next Steps</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/50">
                    <span className="material-symbols-outlined text-base text-emerald-400 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Agreement finalized</p>
                      <p className="text-xs text-muted-foreground">Terms recorded on NEAR blockchain</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/50">
                    <span className="material-symbols-outlined text-base text-[#00F0FF] mt-0.5">calendar_month</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Schedule interview</p>
                      <p className="text-xs text-muted-foreground">Both parties can now coordinate an interview time</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/50">
                    <span className="material-symbols-outlined text-base text-muted-foreground/40 mt-0.5">description</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground/60">Onboarding</p>
                      <p className="text-xs text-muted-foreground">Complete documentation and start onboarding process</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/negotiations')}
                  className="w-full flex items-center justify-center gap-2 mt-4 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-base font-bold hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  Back to Negotiations
                </button>
              </div>
            </>
          )}

          {/* ── Rejected ── */}
          {flowState === 'rejected' && (
            <div className="space-y-4">
              <div className="bg-red-500/5 rounded-2xl border border-red-500/10 p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-red-500/10 mx-auto mb-3 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-red-400" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                </div>
                <p className="text-lg font-bold text-red-400">Agreement Rejected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You have rejected the proposed terms. The negotiation has been terminated.
                </p>
              </div>
              <button
                onClick={() => router.push('/negotiations')}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-muted text-foreground text-base font-bold hover:bg-muted/80 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back to Negotiations
              </button>
            </div>
          )}
        </div>

        {/* ── Right Column: Negotiation Conversation ── */}
        <div className="bg-card rounded-2xl border border-border/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-base text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              forum
            </span>
            <h3 className="text-base font-bold text-foreground">Negotiation History</h3>
            {rounds.length > 0 && (
              <span className="ml-auto text-sm text-muted-foreground">{rounds.length} rounds</span>
            )}
          </div>

          {/* Agent Labels */}
          {rounds.length > 0 && (
            <div className="flex items-center justify-between px-1 mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm text-primary">corporate_fare</span>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">Employer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Seeker</span>
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm text-primary">person</span>
                </div>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="space-y-3">
            {rounds.length === 0 && (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                No negotiation rounds available.
              </div>
            )}
            {rounds.map((round, idx) => {
              const isSeeker = round.actor === 'SEEKER_AGENT';
              const prevSalary = idx > 0 ? rounds[idx - 1].proposal.salary : null;
              const salaryDelta = prevSalary !== null ? round.proposal.salary - prevSalary : null;

              return (
                <div key={round.id} className="space-y-1.5">
                  {/* Round Divider */}
                  <div className="flex items-center gap-2 py-0.5">
                    <div className="flex-1 h-px bg-border/10" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      Round {round.round}
                    </span>
                    <div className="flex-1 h-px bg-border/10" />
                  </div>

                  {/* Chat Bubble */}
                  <div className={`flex ${isSeeker ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] space-y-1.5 flex flex-col ${isSeeker ? 'items-end' : 'items-start'}`}>
                      <ReasoningBubble reasoning={round.reasoning} isSeeker={isSeeker} />

                      {/* Compact Proposal */}
                      <div className="flex flex-wrap gap-1.5 px-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background/50 border border-border/5 text-xs font-bold text-foreground">
                          {formatSalary(round.proposal.salary)}
                          {salaryDelta !== null && salaryDelta !== 0 && (
                            <span className={`font-semibold ${salaryDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {salaryDelta > 0 ? '+' : ''}{formatSalary(salaryDelta)}
                            </span>
                          )}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-background/50 border border-border/5 text-xs text-foreground/70">
                          {round.proposal.remotePolicy}
                        </span>
                        {round.proposal.signingBonus && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-background/50 border border-border/5 text-xs text-foreground/70">
                            Bonus {formatSalary(round.proposal.signingBonus)}
                          </span>
                        )}
                      </div>

                      {/* Decision Badge */}
                      <div className={`flex ${isSeeker ? 'justify-end' : 'justify-start'} px-1`}>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                          round.decision === 'ACCEPT'
                            ? 'bg-primary/10 text-primary'
                            : round.decision === 'REJECT'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          <span
                            className="material-symbols-outlined text-xs"
                            style={round.decision === 'ACCEPT' ? { fontVariationSettings: "'FILL' 1" } : undefined}
                          >
                            {round.decision === 'ACCEPT' ? 'task_alt' : round.decision === 'REJECT' ? 'cancel' : 'swap_horiz'}
                          </span>
                          {round.decision === 'ACCEPT' ? 'Accepted' : round.decision === 'REJECT' ? 'Rejected' : 'Counter'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Final handshake */}
            {rounds.length > 0 && (
              <div className="flex items-center justify-center gap-2 py-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm text-primary">corporate_fare</span>
                </div>
                <span className="material-symbols-outlined text-xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>handshake</span>
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm text-primary">person</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
