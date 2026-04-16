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
    ctaColor = '#FFE600';
  } else if (active.length > 0) {
    ctaLabel = 'Watch Live';
    ctaHref = `/negotiation/${active[0].id}`;
    ctaColor = '#FF2DF1';
  } else {
    ctaLabel = 'View History';
    ctaHref = `/negotiation/${ended[0]?.id ?? sessions[0]?.id}`;
    ctaColor = '#6b7280';
  }

  const pills: { label: string; count: number; color: string }[] = [
    { label: 'Active', count: active.length, color: '#FF2DF1' },
    { label: 'Agreed', count: agreed.length, color: '#39FF14' },
    { label: 'Ended', count: ended.length, color: '#ef4444' },
  ];

  return (
    <div className="bg-card rounded-2xl border border-[#BF5AF2]/30 p-5" data-testid="negotiation-overview">
      <div className="flex items-start gap-4">
        {/* AI Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'color-mix(in srgb, #FF2DF1 10%, transparent)' }}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={{ fontVariationSettings: "'FILL' 1", color: '#FF2DF1' }}
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
          className="shrink-0 px-4 py-2 rounded-xl text-base font-semibold transition-all hover:brightness-90"
          style={{ backgroundColor: ctaColor, color: '#0a0a0a' }}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
