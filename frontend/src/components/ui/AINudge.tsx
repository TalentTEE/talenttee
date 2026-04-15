'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AINudgeProps {
  id: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function AINudge({ id, message, ctaLabel, ctaHref }: AINudgeProps) {
  const storageKey = `nudge-dismissed-${id}`;
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === '1');
  }, [storageKey]);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  return (
    <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 flex items-start gap-3 animate-[fadeSlideUp_300ms_ease-out]">
      <span className="material-symbols-outlined text-primary text-lg shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
        smart_toy
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-base text-foreground/90 leading-relaxed">{message}</p>
        {ctaLabel && ctaHref && (
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-lg bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-all"
          >
            {ctaLabel}
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
}
