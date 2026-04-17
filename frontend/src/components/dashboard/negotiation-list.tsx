'use client';

import { useState, useEffect } from 'react';
import { NegotiationSession, MatchResultDisplay, JobPosting } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useSse } from '@/lib/sse';
import Link from 'next/link';

const stateInfo: Record<string, { label: string; icon: string; className: string }> = {
  INITIATED: { label: 'Starting', icon: 'hourglass_top', className: 'text-yellow-400' },
  EMPLOYER_OFFER: { label: 'Negotiating', icon: 'sync', className: 'text-blue-400' },
  SEEKER_COUNTER: { label: 'Negotiating', icon: 'sync', className: 'text-blue-400' },
  EMPLOYER_COUNTER: { label: 'Negotiating', icon: 'sync', className: 'text-blue-400' },
  AGREED: { label: 'Agreed', icon: 'task_alt', className: 'text-[#FF2DF1]' },
  FAILED: { label: 'Failed', icon: 'cancel', className: 'text-red-400' },
  MAX_ROUNDS: { label: 'Max Rounds', icon: 'warning', className: 'text-orange-400' },
};

const ACTIVE_STATES = new Set(['INITIATED', 'EMPLOYER_OFFER', 'SEEKER_COUNTER', 'EMPLOYER_COUNTER']);

interface SectionConfig {
  key: string;
  title: string;
  badgeColor: string;
  defaultOpen: boolean;
  ctaLabel: (s: NegotiationSession) => string;
  ctaHref: (s: NegotiationSession) => string;
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'active',
    title: 'In Progress',
    badgeColor: '#FF2DF1',
    defaultOpen: true,
    ctaLabel: () => 'Monitor',
    ctaHref: (s) => `/negotiation/${s.id}`,
  },
  {
    key: 'agreed',
    title: 'Agreed',
    badgeColor: '#39FF14',
    defaultOpen: true,
    ctaLabel: (s) => (s.seekerApproved && s.employerApproved) ? 'Open Chat' : 'Review & Approve',
    ctaHref: (s) => `/negotiation/${s.id}/agree`,
  },
  {
    key: 'ended',
    title: 'Ended',
    badgeColor: '#f87171',
    defaultOpen: false,
    ctaLabel: () => 'View Details',
    ctaHref: (s) => `/negotiation/${s.id}`,
  },
];

/** Real-time activity badge for a session */
interface Activity {
  label: string;
  count?: number;
  icon: string;
  color: string;
}

function SessionRow({
  session,
  match,
  ctaHref,
  activity,
  currentUserRole,
}: {
  session: NegotiationSession;
  match?: MatchResultDisplay;
  ctaHref: string;
  activity?: Activity;
  currentUserRole?: 'SEEKER' | 'EMPLOYER';
}) {
  const isAgreed = session.state === 'AGREED';
  const score = match ? Math.round(match.rerankScore * 100) : null;
  const info = stateInfo[session.state] || stateInfo.INITIATED;

  // Title: session.job?.title > match fallback > UUID fallback
  const title = session.job?.title
    ?? (match ? `${match.jobTitle} - ${match.companyName}` : null)
    ?? `Session ${session.id.slice(0, 8)}…`;

  // Did the current user approve?
  const myApproved = currentUserRole === 'EMPLOYER'
    ? session.employerApproved
    : session.seekerApproved;
  const bothApproved = session.seekerApproved && session.employerApproved;

  const messageCount = session.messageCount ?? 0;
  // Backend unreadCount + SSE real-time additions
  const sseUnread = (activity?.icon === 'chat' && activity.count) ? activity.count : 0;
  const unreadCount = (session.unreadCount ?? 0) + sseUnread;

  return (
    <Link
      href={ctaHref}
      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
        activity
          ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10'
          : 'bg-accent/50 border-border/5 hover:bg-accent'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {score !== null ? (
          <div className="relative w-10 h-10 shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted" />
              <circle
                cx="20" cy="20" r="16" fill="none" strokeWidth="2.5"
                className="text-[#FF2DF1]"
                strokeDasharray={`${score * 1.005} 999`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#FF2DF1]">{score}%</span>
          </div>
        ) : (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isAgreed ? 'bg-[#FF2DF1]/10' : 'bg-muted'
          }`}>
            <span className={`material-symbols-outlined text-lg ${info.className}`} style={isAgreed ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              {info.icon}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground truncate">
            {title}
          </p>
          {/* Agreed section: show phase status instead of state badge */}
          {isAgreed ? (
            <div className="flex items-center gap-2 mt-0.5">
              {bothApproved ? (
                <span className="inline-flex items-center gap-1 text-xs text-[#39FF14]">
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                  {messageCount > 0 ? 'Interview scheduling' : 'Ready to chat'}
                  {unreadCount > 0 && (
                    <span
                      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: '#00F0FF', color: '#0a0a0a' }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </span>
              ) : !myApproved ? (
                <span className="inline-flex items-center gap-0.5 text-xs text-[#FFE600]">
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>rate_review</span>
                  Needs your approval
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                  <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_top</span>
                  Waiting for other party
                </span>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`flex items-center gap-1 text-sm font-medium ${info.className}`}>
                  <span className="material-symbols-outlined text-sm">
                    {info.icon}
                  </span>
                  {info.label}
                  {ACTIVE_STATES.has(session.state) && (
                    <span className="text-muted-foreground ml-1">R{session.currentRound}/{session.maxRounds}</span>
                  )}
                </div>
                {activity && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold animate-[fadeSlideUp_300ms_ease-out_both]"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${activity.color} 15%, transparent)`,
                      color: activity.color,
                    }}
                  >
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {activity.icon}
                    </span>
                    {activity.label}
                    {activity.count && activity.count > 1 && (
                      <span
                        className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md text-[10px] font-bold"
                        style={{ backgroundColor: activity.color, color: '#0a0a0a' }}
                      >
                        {activity.count}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <span className="material-symbols-outlined text-lg text-muted-foreground shrink-0">
        chevron_right
      </span>
    </Link>
  );
}

function JobGroupedList({
  sessions,
  matchByJobId,
  jobs,
  activities,
  currentUserRole,
}: {
  sessions: NegotiationSession[];
  matchByJobId: Map<string, MatchResultDisplay>;
  jobs: JobPosting[];
  activities: Map<string, Activity>;
  currentUserRole?: 'SEEKER' | 'EMPLOYER';
}) {
  const [collapsedJobs, setCollapsedJobs] = useState<Set<string>>(new Set());

  const sessionsByJob = new Map<string, NegotiationSession[]>();
  for (const s of sessions) {
    const arr = sessionsByJob.get(s.jobId) || [];
    arr.push(s);
    sessionsByJob.set(s.jobId, arr);
  }

  const sortedJobs = [...jobs].sort((a, b) => {
    const aHas = sessionsByJob.has(a.id) ? 0 : 1;
    const bHas = sessionsByJob.has(b.id) ? 0 : 1;
    return aHas - bHas || a.title.localeCompare(b.title);
  });

  return (
    <div className="space-y-4">
      {sortedJobs.map((job) => {
        const jobSessions = sessionsByJob.get(job.id) || [];
        if (jobSessions.length === 0) return null;

        const isCollapsed = collapsedJobs.has(job.id);
        const active = jobSessions.filter((s) => ACTIVE_STATES.has(s.state));
        const agreed = jobSessions.filter((s) => s.state === 'AGREED');
        const ended = jobSessions.filter((s) => s.state === 'FAILED' || s.state === 'MAX_ROUNDS');

        return (
          <div key={job.id} className="rounded-xl border border-border/10 overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-all"
              onClick={() => setCollapsedJobs((prev) => {
                const next = new Set(prev);
                next.has(job.id) ? next.delete(job.id) : next.add(job.id);
                return next;
              })}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#FFE600]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#FFE600] text-lg">work</span>
                </div>
                <div className="text-left">
                  <p className="text-base font-semibold text-foreground">{job.title}</p>
                  <span className="text-sm text-muted-foreground">{jobSessions.length} candidate{jobSessions.length > 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {active.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'color-mix(in srgb, #FF2DF1 15%, transparent)', color: '#FF2DF1' }}>
                    {active.length} Active
                  </span>
                )}
                {agreed.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'color-mix(in srgb, #39FF14 15%, transparent)', color: '#39FF14' }}>
                    {agreed.length} Agreed
                  </span>
                )}
                {ended.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: 'color-mix(in srgb, #f87171 15%, transparent)', color: '#f87171' }}>
                    {ended.length} Ended
                  </span>
                )}
                <span className={`material-symbols-outlined text-sm text-muted-foreground transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
                  expand_more
                </span>
              </div>
            </button>

            {!isCollapsed && (
              <div className="px-4 pb-4 space-y-3">
                {SECTIONS.map((section) => {
                  const items = section.key === 'active' ? active
                    : section.key === 'agreed' ? agreed
                    : ended;
                  if (items.length === 0) return null;

                  return (
                    <div key={section.key}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-muted-foreground">{section.title}</span>
                        <span
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${section.badgeColor} 20%, transparent)`,
                            color: section.badgeColor,
                          }}
                        >
                          {items.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {items.map((s) => (
                          <SessionRow
                            key={s.id}
                            session={s}
                            match={matchByJobId.get(s.jobId)}
                            ctaHref={section.ctaHref(s)}
                            activity={activities.get(s.id)}
                            currentUserRole={currentUserRole}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function NegotiationList({
  sessions,
  matches = [],
  jobs,
}: {
  sessions: NegotiationSession[];
  matches?: MatchResultDisplay[];
  jobs?: JobPosting[];
}) {
  const { user } = useAuth();
  const { on } = useSse();
  const [endedOpen, setEndedOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'job' | 'status'>('job');
  // sessionId → latest activity badge
  const [activities, setActivities] = useState<Map<string, Activity>>(new Map());
  const matchByJobId = new Map(matches.map((m) => [m.jobId, m]));

  // Listen for SSE events and show badges on affected sessions
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(on('message', (data) => {
      if (data.sessionId) {
        setActivities((prev) => {
          const next = new Map(prev);
          const existing = prev.get(data.sessionId);
          const count = (existing?.count ?? 0) + 1;
          next.set(data.sessionId, {
            label: 'New message',
            count,
            icon: 'chat',
            color: '#00F0FF',
          });
          return next;
        });
      }
    }));

    unsubs.push(on('negotiation_complete', (data) => {
      if (data.sessionId) {
        setActivities((prev) => {
          const next = new Map(prev);
          next.set(data.sessionId, {
            label: 'Completed',
            icon: 'check_circle',
            color: '#39FF14',
          });
          return next;
        });
      }
    }));

    unsubs.push(on('agreement_update', (data) => {
      if (data.sessionId) {
        setActivities((prev) => {
          const next = new Map(prev);
          next.set(data.sessionId, {
            label: data.action === 'approved' ? `${data.byRole} approved` : `${data.byRole} rejected`,
            icon: data.action === 'approved' ? 'thumb_up' : 'thumb_down',
            color: data.action === 'approved' ? '#FFE600' : '#f87171',
          });
          return next;
        });
      }
    }));

    return () => unsubs.forEach((fn) => fn());
  }, [on]);

  const grouped: Record<string, NegotiationSession[]> = {
    active: sessions.filter((s) => ACTIVE_STATES.has(s.state)),
    agreed: sessions.filter((s) => s.state === 'AGREED'),
    ended: sessions.filter((s) => s.state === 'FAILED' || s.state === 'MAX_ROUNDS'),
  };

  const hasAnySessions = sessions.length > 0;
  const totalActivities = activities.size;

  // Employer mode: toggle between job-grouped and status-grouped
  if (jobs && jobs.length > 0) {
    const statusContent = (
      <div className="space-y-5">
        {SECTIONS.map((section) => {
          const items = grouped[section.key];
          if (!items || items.length === 0) return null;
          const isCollapsible = section.key === 'ended';
          const isOpen = isCollapsible ? endedOpen : section.defaultOpen;
          return (
            <div key={section.key}>
              <button
                type="button"
                className={`flex items-center gap-2 mb-2 ${isCollapsible ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={() => isCollapsible && setEndedOpen((o) => !o)}
                disabled={!isCollapsible}
              >
                <span className="text-sm font-semibold text-muted-foreground">{section.title}</span>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold" style={{ backgroundColor: `color-mix(in srgb, ${section.badgeColor} 20%, transparent)`, color: section.badgeColor }}>{items.length}</span>
                {isCollapsible && <span className={`material-symbols-outlined text-sm text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>}
              </button>
              {isOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((s) => (
                    <SessionRow key={s.id} session={s} match={matchByJobId.get(s.jobId)} ctaHref={section.ctaHref(s)} activity={activities.get(s.id)} currentUserRole={user?.role} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );

    return (
      <div className="bg-card rounded-2xl border border-[#BF5AF2]/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground">Negotiations</h3>
            {totalActivities > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {totalActivities}
              </span>
            )}
          </div>
          <div className="flex rounded-lg border border-border/20 overflow-hidden">
            <button
              type="button"
              className={`px-3 py-1 text-xs font-semibold transition-all ${viewMode === 'job' ? 'bg-[#BF5AF2]/20 text-[#BF5AF2]' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setViewMode('job')}
            >
              By Job
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-xs font-semibold transition-all ${viewMode === 'status' ? 'bg-[#BF5AF2]/20 text-[#BF5AF2]' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setViewMode('status')}
            >
              By Status
            </button>
          </div>
        </div>
        {!hasAnySessions ? (
          <p className="text-base text-muted-foreground">No active negotiations.</p>
        ) : viewMode === 'job' ? (
          <JobGroupedList
            sessions={sessions}
            matchByJobId={matchByJobId}
            jobs={jobs}
            activities={activities}
            currentUserRole={user?.role}
          />
        ) : statusContent}
      </div>
    );
  }

  // Seeker mode: group by status
  return (
    <div className="bg-card rounded-2xl border border-[#BF5AF2]/30 p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-[var(--font-manrope)] text-base font-bold text-foreground">Negotiations</h3>
        {totalActivities > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {totalActivities}
          </span>
        )}
      </div>
      {!hasAnySessions && (
        <p className="text-base text-muted-foreground">No active negotiations.</p>
      )}
      <div className="space-y-5">
        {SECTIONS.map((section) => {
          const items = grouped[section.key];
          if (!items || items.length === 0) return null;

          const isCollapsible = section.key === 'ended';
          const isOpen = isCollapsible ? endedOpen : section.defaultOpen;

          return (
            <div key={section.key}>
              <button
                type="button"
                className={`flex items-center gap-2 mb-2 ${isCollapsible ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={() => isCollapsible && setEndedOpen((o) => !o)}
                disabled={!isCollapsible}
              >
                <span className="text-sm font-semibold text-muted-foreground">{section.title}</span>
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${section.badgeColor} 20%, transparent)`,
                    color: section.badgeColor,
                  }}
                >
                  {items.length}
                </span>
                {isCollapsible && (
                  <span className={`material-symbols-outlined text-sm text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                )}
              </button>
              {isOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((s) => (
                    <SessionRow
                      key={s.id}
                      session={s}
                      match={matchByJobId.get(s.jobId)}
                      ctaHref={section.ctaHref(s)}
                      activity={activities.get(s.id)}
                      currentUserRole={user?.role}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
