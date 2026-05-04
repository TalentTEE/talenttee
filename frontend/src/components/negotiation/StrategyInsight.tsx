'use client';

import { useState } from 'react';
import { type NegotiationReasoning, isStructuredReasoning } from '@/lib/types';

interface StrategyInsightProps {
  reasoning: string | NegotiationReasoning;
}

export function StrategyInsight({ reasoning }: StrategyInsightProps) {
  const [open, setOpen] = useState(false);

  const structured = isStructuredReasoning(reasoning);

  return (
    <div className="rounded-2xl border border-border bg-white/55 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-white/70 transition-colors"
      >
        <span className="material-symbols-outlined text-base text-primary/70">
          lightbulb
        </span>
        <span className="font-semibold">Strategy Insight</span>
        <span
          className={`material-symbols-outlined text-base ml-auto transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 animate-[fadeSlideUp_200ms_ease-out]">
          {structured ? (
            <ul className="space-y-1.5">
              {reasoning.factors.map((factor, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground/80 leading-relaxed">
                  <span className="material-symbols-outlined text-xs text-primary/50 mt-1 shrink-0">arrow_right</span>
                  {factor}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground/80 leading-relaxed italic">
              &ldquo;{reasoning}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}
