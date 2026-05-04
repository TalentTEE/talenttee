'use client';

import Link from 'next/link';
import type { Activity } from '@/hooks/useAgentStatus';

interface AgentActivityStreamProps {
  activities: Activity[];
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function AgentActivityStream({ activities }: AgentActivityStreamProps) {
  if (activities.length === 0) return null;

  return (
    <div className="mt-auto pt-4 border-t border-border space-y-1">
      <p className="px-3 text-sm font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
        AI Activity
      </p>
      {activities.map((activity, i) => (
        <Link
          key={activity.id}
          href={activity.href}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/60 transition-colors group animate-[slideIn_300ms_ease-out_both]"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <span className="material-symbols-outlined text-base text-muted-foreground group-hover:text-primary transition-colors">
            {activity.icon}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors truncate">
              {activity.text}
            </p>
            <p className="text-sm text-muted-foreground/50">
              {timeAgo(activity.timestamp)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
