'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSse } from '@/lib/sse';

interface Notification {
  id: string;
  type: 'message' | 'negotiation_complete' | 'agreement_update' | 'resume_complete';
  title: string;
  description: string;
  href?: string;
  icon: string;
  color: string;
  time: Date;
  read: boolean;
}

const ICON_MAP: Record<Notification['type'], { icon: string; color: string }> = {
  message: { icon: 'chat', color: '#00F0FF' },
  negotiation_complete: { icon: 'handshake', color: '#39FF14' },
  agreement_update: { icon: 'gavel', color: '#FFE600' },
  resume_complete: { icon: 'description', color: '#FF2DF1' },
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationFeed() {
  const { on } = useSse();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [, setTick] = useState(0);

  // Update relative times every 30s
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  function makeNotif(
    type: Notification['type'],
    fields: { title: string; description: string; href?: string },
  ): Notification {
    const { icon, color } = ICON_MAP[type];
    return { id: `${type}-${Date.now()}`, type, icon, color, time: new Date(), read: false, ...fields };
  }

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(on('message', (data) => {
      setNotifications((prev) => [makeNotif('message', {
        title: 'New Interview Message',
        description: data.preview?.slice(0, 80) || 'You received a new message',
        href: `/negotiation/${data.sessionId}/agree`,
      }), ...prev].slice(0, 20));
    }));

    unsubs.push(on('negotiation_complete', (data) => {
      setNotifications((prev) => [makeNotif('negotiation_complete', {
        title: 'Negotiation Completed',
        description: 'AI agents have reached a conclusion',
        href: `/negotiation/${data.sessionId}/agree`,
      }), ...prev].slice(0, 20));
    }));

    unsubs.push(on('agreement_update', (data) => {
      const action = data.action === 'approved' ? 'approved' : 'rejected';
      setNotifications((prev) => [makeNotif('agreement_update', {
        title: `Agreement ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        description: `The ${data.byRole} has ${action} the agreement`,
        href: `/negotiation/${data.sessionId}/agree`,
      }), ...prev].slice(0, 20));
    }));

    unsubs.push(on('resume_complete', () => {
      setNotifications((prev) => [makeNotif('resume_complete', {
        title: 'Resume Generated',
        description: 'Your AI resume is ready to view',
        href: '/dashboard/seeker',
      }), ...prev].slice(0, 20));
    }));

    return () => unsubs.forEach((fn) => fn());
  }, [on]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="bg-card rounded-2xl border border-border/10 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'color-mix(in srgb, #00F0FF 10%, transparent)' }}
        >
          <span
            className="material-symbols-outlined text-lg"
            style={{ fontVariationSettings: "'FILL' 1", color: '#00F0FF' }}
          >
            notifications
          </span>
        </div>
        <h3 className="font-[var(--font-manrope)] font-bold text-foreground text-base flex-1">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="material-symbols-outlined text-2xl text-muted-foreground/30 mb-1">
              notifications_none
            </span>
            <p className="text-sm text-muted-foreground/60">No notifications yet</p>
            <p className="text-xs text-muted-foreground/40 mt-0.5">
              Real-time updates will appear here
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const inner = (
              <div
                className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  n.href ? 'hover:bg-accent/50 cursor-pointer' : ''
                } ${!n.read ? 'bg-accent/30' : ''}`}
              >
                <span
                  className="material-symbols-outlined text-base mt-0.5 shrink-0"
                  style={{ fontVariationSettings: "'FILL' 1", color: n.color }}
                >
                  {n.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold truncate ${!n.read ? 'text-foreground' : 'text-foreground/70'}`}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{n.description}</p>
                </div>
                <span className="text-[10px] text-muted-foreground/50 shrink-0 mt-0.5">
                  {timeAgo(n.time)}
                </span>
              </div>
            );

            return n.href ? (
              <Link key={n.id} href={n.href}>{inner}</Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })
        )}
      </div>
    </div>
  );
}
