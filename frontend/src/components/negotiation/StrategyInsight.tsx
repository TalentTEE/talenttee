'use client';

import { useState } from 'react';

interface StrategyInsightProps {
  reasoning: string;
}

export function StrategyInsight({ reasoning }: StrategyInsightProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border/10 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent/30 transition-all"
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
          <p className="text-sm text-muted-foreground/80 leading-relaxed italic">
            &ldquo;{reasoning}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
