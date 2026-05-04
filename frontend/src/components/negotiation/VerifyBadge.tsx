'use client';

import { useState, useRef, useEffect } from 'react';

const NEAR_EXPLORER_BASE = 'https://testnet.nearblocks.io';

interface VerifyBadgeProps {
  roundNumber: number;
  actor: 'SEEKER_AGENT' | 'EMPLOYER_AGENT';
  timestamp?: string;
  sessionId: string;
  /** On-chain tx hash (only available for agreement, not per-round) */
  onChainTxHash?: string | null;
}

export function VerifyBadge({ roundNumber, actor, timestamp, sessionId, onChainTxHash }: VerifyBadgeProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative inline-flex" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium text-[#3f6212]/80 hover:text-[#3f6212] hover:bg-[#65a30d]/10 transition-colors cursor-pointer"
        title="Verified — click for details"
      >
        <span
          className="material-symbols-outlined text-xs"
          style={{ fontVariationSettings: "'FILL' 1", fontSize: '14px' }}
        >
          verified_user
        </span>
      </button>

      {open && (
        <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-72 bg-white/95 border border-border rounded-2xl shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl p-4 space-y-3 animate-[fadeSlideUp_150ms_ease-out]">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-base text-[#65a30d]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
            <span className="text-sm font-bold text-foreground">Integrity Verified</span>
          </div>

          {/* Details */}
          <div className="space-y-2">
            <DetailRow label="Round" value={`#${roundNumber}`} />
            <DetailRow
              label="Agent"
              value={actor === 'EMPLOYER_AGENT' ? 'Employer Agent' : 'Seeker Agent'}
            />
            <DetailRow label="Encryption" value="ECDH + XChaCha20-Poly1305" />
            <DetailRow label="Session ID" value={sessionId.slice(0, 8) + '...'} mono />
            {timestamp && (
              <DetailRow
                label="Timestamp"
                value={new Date(timestamp).toLocaleString()}
              />
            )}
          </div>

          {/* On-chain link */}
          {onChainTxHash && (
            <a
              href={`${NEAR_EXPLORER_BASE}/txns/${onChainTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-[#65a30d]/10 border border-[#65a30d]/20 text-sm font-medium text-[#3f6212] hover:bg-[#65a30d]/15 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              View on NEAR Explorer
            </a>
          )}

          {!onChainTxHash && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 border border-border text-xs text-muted-foreground">
              <span className="material-symbols-outlined text-xs">lock</span>
              Data encrypted & stored off-chain. Agreement recorded on-chain upon approval.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-foreground/80 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
