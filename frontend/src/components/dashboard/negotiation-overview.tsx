'use client';

import Link from 'next/link';
import { NegotiationSession } from '@/lib/types';

interface NegotiationOverviewProps {
  sessions: NegotiationSession[];
}

const ACTIVE_STATES = new Set(['INITIATED', 'EMPLOYER_OFFER', 'SEEKER_COUNTER', 'EMPLOYER_COUNTER']);

export function NegotiationOverview({ sessions }: NegotiationOverviewProps) {
  const active = sessions.filter((s) => ACTIVE_STATES.has(s.state));
  const agreed = sessions.filter((s) => s.state === 'AGREED');
  const ended = sessions.filter((s) => s.state === 'FAILED' || s.state === 'MAX_ROUNDS');

  // Primary CTA priority: agreed > active > ended
  let ctaLabel: string;
  let ctaHref: string;
  let ctaColor: string;

  if (agreed.length > 0) {
    ctaLabel = 'Review Agreement';
    ctaHref = `/negotiation/${agreed[0].id}/agree`;
      ctaColor = '#d97706';
  } else if (active.length > 0) {
    ctaLabel = 'Watch Live';
    ctaHref = `/negotiation/${active[0].id}`;
      ctaColor = '#be185d';
  } else {
    ctaLabel = 'View History';
    ctaHref = `/negotiation/${ended[0]?.id ?? sessions[0]?.id}`;
    ctaColor = '#6b7280';
  }

  const pills: { label: string; count: number; color: string }[] = [
    { label: 'Active', count: active.length, color: '#be185d' },
    { label: 'Agreed', count: agreed.length, color: '#65a30d' },
    { label: 'Ended', count: ended.length, color: '#ef4444' },
  ];

  return (
    <div className="rounded-[1.75rem] border border-border bg-white/75 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl" data-testid="negotiation-overview">
      <div className="flex items-start gap-4">
        {/* AI Icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white/70 shadow-sm ring-1 ring-border"
          style={{ color: '#be185d' }}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            smart_toy
          </span>
        </div>

        {/* Stats Pills */}
        <div className="flex-1 min-w-0">
          <h3 className="font-[var(--font-manrope)] font-bold text-foreground text-base mb-2">
            Negotiation Overview
          </h3>
          <div className="flex flex-wrap gap-2">
            {pills.map((pill) => (
              <span
                key={pill.label}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                  pill.count === 0 ? 'opacity-40' : ''
                }`}
                style={{
                  backgroundColor: `color-mix(in srgb, ${pill.color} 15%, transparent)`,
                  color: pill.color,
                }}
              >
                {pill.count} {pill.label}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link
          href={ctaHref}
          className="shrink-0 px-4 py-2 rounded-2xl text-base font-black text-white shadow-sm transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: ctaColor }}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
