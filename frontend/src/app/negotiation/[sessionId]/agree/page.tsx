'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAgreement, getNegotiationSession, getNegotiationRounds, approveAgreement, USE_DUMMY } from '@/lib/api';
import { AgreementRecord } from '@/lib/types';

function formatSalary(value: number): string {
  if (value >= 10000000) return `${(value / 10000000).toFixed(0)}M KRW`;
  if (value >= 10000) return `${(value / 10000).toFixed(0)}K KRW`;
  return `${value.toLocaleString()} KRW`;
}

export default function AgreementPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [agreement, setAgreement] = useState<AgreementRecord | null>(null);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    getAgreement(sessionId)
      .then((data) => {
        setAgreement(data);
        if (data.onChainTxHash) {
          setTxHash(data.onChainTxHash);
          setApproved(true);
        }
      })
      .catch(async () => {
        // No agreement record yet — build from negotiation rounds
        try {
          const [session, rounds] = await Promise.all([
            getNegotiationSession(sessionId),
            getNegotiationRounds(sessionId),
          ]);
          const lastRound = rounds[rounds.length - 1];
          if (lastRound?.proposal) {
            setAgreement({
              sessionId,
              agreementHash: `pending-${sessionId.slice(0, 8)}`,
              summary: {
                positionTitle: lastRound.proposal.title || 'N/A',
                agreedSalary: lastRound.proposal.salary || 0,
                startDate: lastRound.proposal.startDate || 'TBD',
                negotiationRounds: session.currentRound || rounds.length,
                remotePolicy: lastRound.proposal.remotePolicy || 'N/A',
                probationMonths: lastRound.proposal.probationMonths || 0,
              },
              seekerApproved: false,
              employerApproved: false,
              onChainTxHash: null,
            });
          }
        } catch {
          // Both paths failed — stay in loading (shouldn't normally happen)
        }
      });
  }, [sessionId]);

  const handleApprove = async () => {
    if (approving) return;
    setApproving(true);
    try {
      await approveAgreement(sessionId);
      if (USE_DUMMY) {
        const mockTx = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        setTxHash(mockTx);
      } else {
        const updatedAgreement = await getAgreement(sessionId);
        setTxHash(updatedAgreement.onChainTxHash);
        setAgreement(updatedAgreement);
      }
      setApproved(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve agreement');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = () => {
    setRejected(true);
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
    <div className="space-y-6 max-w-3xl">
      {/* Page Title */}
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          Agreement Review
        </h1>
        <p className="text-base text-muted-foreground mt-1">
          Session #{sessionId}
        </p>
      </div>

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
          {/* Position */}
          <div className="rounded-xl bg-accent/50 border border-border/5 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="material-symbols-outlined text-base text-muted-foreground">badge</span>
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Position</p>
            </div>
            <p className="text-base font-bold text-foreground">{agreement.summary.positionTitle}</p>
          </div>

          {/* Salary */}
          <div className="rounded-xl bg-accent/50 border border-border/5 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="material-symbols-outlined text-base text-muted-foreground">payments</span>
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Annual Salary</p>
            </div>
            <p className="text-base font-bold text-primary">{formatSalary(agreement.summary.agreedSalary)}</p>
          </div>

          {/* Work Type */}
          <div className="rounded-xl bg-accent/50 border border-border/5 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="material-symbols-outlined text-base text-muted-foreground">home_work</span>
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Work Type</p>
            </div>
            <p className="text-base font-bold text-foreground">{agreement.summary.remotePolicy}</p>
          </div>

          {/* Start Date */}
          <div className="rounded-xl bg-accent/50 border border-border/5 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="material-symbols-outlined text-base text-muted-foreground">calendar_month</span>
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Start Date</p>
            </div>
            <p className="text-base font-bold text-foreground">{agreement.summary.startDate}</p>
          </div>

          {/* Probation */}
          <div className="rounded-xl bg-accent/50 border border-border/5 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="material-symbols-outlined text-base text-muted-foreground">schedule</span>
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Probation Period</p>
            </div>
            <p className="text-base font-bold text-foreground">{agreement.summary.probationMonths} months</p>
          </div>

          {/* Total Rounds */}
          <div className="rounded-xl bg-accent/50 border border-border/5 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="material-symbols-outlined text-base text-muted-foreground">repeat</span>
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Total Rounds</p>
            </div>
            <p className="text-base font-bold text-foreground">{agreement.summary.negotiationRounds} rounds</p>
          </div>
        </div>

        {/* Agreement Hash */}
        <div className="mt-4 rounded-xl bg-muted/50 border border-border/5 p-3">
          <p className="text-sm uppercase tracking-wider text-muted-foreground mb-1">Agreement Hash</p>
          <p className="text-sm font-mono text-foreground/70 break-all">{agreement.agreementHash}</p>
        </div>
      </div>

      {/* On-Chain Warning */}
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

      {/* Action Buttons / TX Result */}
      {!approved && !rejected && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleApprove}
            disabled={approving}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-base font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
          >
            <span className="material-symbols-outlined text-base">check_circle</span>
            {approving ? 'Approving...' : 'Approve & Record On-Chain'}
          </button>
          <button
            onClick={handleReject}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-muted text-foreground text-base font-bold hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
          >
            <span className="material-symbols-outlined text-base">cancel</span>
            Reject
          </button>
        </div>
      )}

      {/* TX Hash Display */}
      {approved && txHash && (
        <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-base text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified
            </span>
            <p className="text-base font-bold text-primary">On-Chain Transaction Confirmed</p>
          </div>
          <div className="rounded-xl bg-muted/50 border border-border/5 p-3">
            <p className="text-sm uppercase tracking-wider text-muted-foreground mb-1">Transaction Hash</p>
            <p className="text-sm font-mono text-foreground break-all">{txHash}</p>
          </div>
        </div>
      )}

      {/* Rejected State */}
      {rejected && (
        <div className="bg-red-500/5 rounded-2xl border border-red-500/10 p-5 text-center">
          <span className="material-symbols-outlined text-3xl text-red-400 mb-2">cancel</span>
          <p className="text-base font-semibold text-red-400">Agreement Rejected</p>
          <p className="text-sm text-muted-foreground mt-1">
            The negotiation will continue or be terminated based on remaining rounds.
          </p>
        </div>
      )}
    </div>
  );
}
