'use client';

import { useState } from 'react';
import { MatchContext } from '@/lib/types';

interface MatchContextCardProps {
  context: MatchContext;
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF2DF1]/10 border border-[#FF2DF1]/20 text-sm font-bold text-[#FF2DF1]">
      {pct}% {label}
    </span>
  );
}

function SkillTag({ skill, variant }: { skill: string; variant: 'matched' | 'missing' | 'muted' }) {
  const styles = {
    matched: 'bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/20',
    missing: 'bg-red-500/10 text-red-400 border-red-500/20',
    muted: 'bg-muted text-muted-foreground border-border/10',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-sm border ${styles[variant]}`}>
      {skill}
    </span>
  );
}

export function MatchContextCard({ context }: MatchContextCardProps) {
  const [open, setOpen] = useState(true);

  const unmatchedPreferred = context.jobPreferredSkills.filter(
    s => !context.matchedPreferred.map(m => m.toLowerCase()).includes(s.toLowerCase()),
  );

  return (
    <div className="bg-card rounded-2xl border border-border/10 overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-base text-[#FF2DF1]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            mystery
          </span>
          <h2 className="text-base font-bold text-foreground">Why You Matched</h2>
        </div>
        <span
          className={`material-symbols-outlined text-lg text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* Score Pills */}
          <div className="flex flex-wrap gap-2">
            <ScorePill label="Similarity" value={context.annScore} />
            <ScorePill label="Fit" value={context.rerankScore} />
          </div>

          {/* Seeker Summary */}
          {context.seekerSummary && (
            <p className="text-sm text-muted-foreground italic leading-relaxed border-l-2 border-[#FF2DF1]/30 pl-3">
              {context.seekerSummary}
            </p>
          )}

          {/* Required Skills */}
          {context.jobRequiredSkills.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-1.5">Required Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {context.matchedRequired.map(s => (
                  <SkillTag key={`req-match-${s}`} skill={s} variant="matched" />
                ))}
                {context.missingRequired.map(s => (
                  <SkillTag key={`req-miss-${s}`} skill={s} variant="missing" />
                ))}
              </div>
            </div>
          )}

          {/* Preferred Skills */}
          {context.jobPreferredSkills.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-1.5">Preferred Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {context.matchedPreferred.map(s => (
                  <SkillTag key={`pref-match-${s}`} skill={s} variant="matched" />
                ))}
                {unmatchedPreferred.map(s => (
                  <SkillTag key={`pref-muted-${s}`} skill={s} variant="muted" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
