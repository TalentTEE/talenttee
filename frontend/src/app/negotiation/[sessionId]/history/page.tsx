'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getEncryptedHistory, getServerPublicKey } from '@/lib/api';
import { decryptNegotiationRound } from '@/lib/crypto';
import { EncryptedNegotiationRound, NegotiationProposal } from '@/lib/types';
import { formatSalary } from '@/lib/format';

interface DecryptedRound {
  id: string;
  round: number;
  actor: 'SEEKER_AGENT' | 'EMPLOYER_AGENT';
  decision: 'COUNTER' | 'ACCEPT' | 'REJECT';
  timestamp: string;
  proposal: NegotiationProposal;
  reasoning: string;
}

function decisionStyle(decision: string) {
  if (decision === 'ACCEPT') return 'bg-primary/10 text-primary';
  if (decision === 'REJECT') return 'bg-red-50 text-red-700';
  return 'bg-amber-50 text-amber-700';
}

function decisionLabel(decision: string) {
  if (decision === 'ACCEPT') return 'Accepted the terms';
  if (decision === 'REJECT') return 'Rejected the proposal';
  return 'Proposed a counter-offer';
}

export default function EncryptedHistoryPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [secretKey, setSecretKey] = useState('');
  const [encryptedRounds, setEncryptedRounds] = useState<EncryptedNegotiationRound[]>([]);
  const [decryptedRounds, setDecryptedRounds] = useState<DecryptedRound[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const handleFetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rounds = await getEncryptedHistory(sessionId);
      setEncryptedRounds(rounds);
      setFetched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch encrypted history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecrypt = () => {
    setIsDecrypting(true);
    setError(null);
    try {
      const serverPubKeyB64 = getServerPublicKey();
      if (!serverPubKeyB64) {
        throw new Error('Server public key not configured (NEXT_PUBLIC_SERVER_PUBLIC_KEY)');
      }
      if (!secretKey.trim()) {
        throw new Error('Please enter your Ed25519 secret key (base64)');
      }

      // Decode base64 keys
      const mySecretBytes = Uint8Array.from(atob(secretKey.trim()), c => c.charCodeAt(0));
      const serverPubBytes = Uint8Array.from(atob(serverPubKeyB64), c => c.charCodeAt(0));

      const decrypted: DecryptedRound[] = encryptedRounds.map((round) => {
        const data = decryptNegotiationRound<{ proposal: NegotiationProposal; reasoning: string }>(
          mySecretBytes,
          serverPubBytes,
          sessionId,
          round.encryptedData,
        );
        return {
          id: round.id,
          round: round.round,
          actor: round.actor,
          decision: round.decision,
          timestamp: round.timestamp,
          proposal: data.proposal,
          reasoning: data.reasoning,
        };
      });

      setDecryptedRounds(decrypted);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Decryption failed: ${e.message}`
          : 'Decryption failed: invalid key or corrupted data',
      );
      setDecryptedRounds([]);
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link
            href={`/negotiation/${sessionId}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </Link>
          <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
            Encrypted History
          </h1>
        </div>
        <p className="text-base text-muted-foreground">
          Session #{sessionId} — Decrypt negotiation rounds with your private key
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-card rounded-2xl border border-border/10 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-lg text-amber-700">encrypted</span>
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">End-to-End Encrypted</p>
            <p className="text-sm text-muted-foreground mt-1">
              Negotiation data is encrypted with ECDH (X25519) + XChaCha20-Poly1305.
              Only participants with the correct private key can decrypt the history.
              Decryption happens entirely in your browser.
            </p>
          </div>
        </div>
      </div>

      {/* Fetch Step */}
      {!fetched && (
        <div className="bg-card rounded-2xl border border-border/10 p-6 text-center space-y-4">
          <span className="material-symbols-outlined text-4xl text-muted-foreground">history</span>
          <p className="text-base text-muted-foreground">
            Fetch the encrypted negotiation rounds from the server.
          </p>
          <button
            onClick={handleFetchHistory}
            disabled={isLoading}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-all disabled:opacity-40 flex items-center gap-2 mx-auto"
          >
            {isLoading ? (
              <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-lg">download</span>
            )}
            {isLoading ? 'Fetching...' : 'Fetch Encrypted History'}
          </button>
        </div>
      )}

      {/* Decrypt Step */}
      {fetched && decryptedRounds.length === 0 && (
        <div className="bg-card rounded-2xl border border-border/10 p-6 space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="material-symbols-outlined text-lg">key</span>
            <span className="text-base font-medium">
              {encryptedRounds.length} encrypted round{encryptedRounds.length !== 1 ? 's' : ''} loaded
            </span>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Your Ed25519 Secret Key (base64)
            </label>
            <input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Enter your base64-encoded secret key..."
              className="w-full bg-muted rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono"
            />
          </div>
          <button
            onClick={handleDecrypt}
            disabled={isDecrypting || !secretKey.trim()}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDecrypting ? (
              <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-lg">lock_open</span>
            )}
            {isDecrypting ? 'Decrypting...' : 'Decrypt History'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-lg text-red-700 shrink-0">error</span>
          <p className="text-base text-red-700">{error}</p>
        </div>
      )}

      {/* Decrypted Rounds */}
      {decryptedRounds.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <span className="material-symbols-outlined text-lg text-primary">lock_open</span>
            <span className="text-base font-semibold text-foreground">
              {decryptedRounds.length} round{decryptedRounds.length !== 1 ? 's' : ''} decrypted
            </span>
          </div>

          {/* Agent Labels */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-base text-primary">corporate_fare</span>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">Employer Agent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">Seeker Agent</span>
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-base text-primary">person</span>
              </div>
            </div>
          </div>

          {decryptedRounds.map((round, idx) => {
            const prevSalary = idx > 0 ? decryptedRounds[idx - 1].proposal.salary : null;
            const salaryDelta = prevSalary !== null ? round.proposal.salary - prevSalary : null;
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
                    {/* Reasoning */}
                    <div className={`rounded-2xl p-4 ${
                      isSeeker
                        ? 'bg-blue-500/10 border border-blue-500/10 rounded-br-md'
                        : 'bg-card border border-border/10 rounded-bl-md'
                    }`}>
                      <p className="text-base text-foreground/90 leading-relaxed">
                        &ldquo;{round.reasoning}&rdquo;
                      </p>
                    </div>

                    {/* Proposal Card */}
                    <div className={`rounded-xl border border-border/10 p-3 w-full ${
                      isSeeker ? 'bg-blue-500/5' : 'bg-accent/30'
                    }`}>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background/50 text-sm font-bold text-foreground">
                          {formatSalary(round.proposal.salary)}
                          {salaryDelta !== null && salaryDelta !== 0 && (
                            <span className={`text-sm font-semibold ${salaryDelta > 0 ? 'text-[#3f6212]' : 'text-red-700'}`}>
                              {salaryDelta > 0 ? '+' : ''}{formatSalary(salaryDelta)}
                            </span>
                          )}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-background/50 text-sm text-foreground/80">
                          {round.proposal.remotePolicy}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-background/50 text-sm text-foreground/80">
                          {round.proposal.workingHours}
                        </span>
                        {round.proposal.signingBonus && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background/50 text-sm text-foreground/80">
                            Bonus {formatSalary(round.proposal.signingBonus)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{round.proposal.title}</span>
                        <span>·</span>
                        <span>Start {round.proposal.startDate}</span>
                      </div>
                    </div>

                    {/* Decision Badge */}
                    <div className={`flex ${isSeeker ? 'justify-end' : 'justify-start'}`}>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold ${decisionStyle(round.decision)}`}>
                        <span
                          className="material-symbols-outlined text-sm"
                          style={round.decision === 'ACCEPT' ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        >
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
        </div>
      )}
    </div>
  );
}
