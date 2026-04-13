'use client';

import Link from 'next/link';

const TOTAL_SOURCES = 4;

export function OnboardingCard({ connectedCount }: { connectedCount: number }) {
  if (connectedCount >= TOTAL_SOURCES) return null;

  const isZero = connectedCount === 0;

  return (
    <Link
      href="/datasource"
      className="block rounded-2xl border border-primary/20 bg-primary/5 p-5 transition-all duration-200 hover:border-primary/40 hover:bg-primary/10"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <span
            className="material-symbols-outlined text-primary text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {isZero ? 'rocket_launch' : 'trending_up'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-[var(--font-manrope)] font-bold text-foreground text-sm">
            {isZero
              ? 'Get started: Connect your data sources'
              : 'Almost there: Connect more sources for better AI analysis'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {isZero
              ? 'Link your GitHub, Slack, and more to build your AI-powered profile.'
              : `${connectedCount} of ${TOTAL_SOURCES} connected. More sources = more accurate profile.`}
          </p>
        </div>
        <span className="material-symbols-outlined text-primary text-xl shrink-0 mt-0.5">
          arrow_forward
        </span>
      </div>
    </Link>
  );
}
