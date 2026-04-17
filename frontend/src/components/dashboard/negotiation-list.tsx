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
  candidateLabel,
}: {
  session: NegotiationSession;
  match?: MatchResultDisplay;
  ctaHref: string;
  activity?: Activity;
  currentUserRole?: 'SEEKER' | 'EMPLOYER';
  candidateLabel?: string;
}) {
  const isAgreed = session.state === 'AGREED';
  const score = match ? Math.round(match.rerankScore * 100) : null;
  const info = stateInfo[session.state] || stateInfo.INITIATED;

  // When inside a job group, show candidate name; otherwise show job title
  const title = candidateLabel
    ?? session.job?.title
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

const PAGE_SIZE = 3;

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
  const sessionsByJob = new Map<string, NegotiationSession[]>();
  for (const s of sessions) {
    const arr = sessionsByJob.get(s.jobId) || [];
    arr.push(s);
    sessionsByJob.set(s.jobId, arr);
  }

  // Only show jobs that have sessions
  const jobsWithSessions = [...jobs]
    .filter((j) => sessionsByJob.has(j.id))
    .sort((a, b) => a.title.localeCompare(b.title));

  const [activeJobId, setActiveJobId] = useState<string>(jobsWithSessions[0]?.id ?? '');
  const [page, setPage] = useState(0);

  const selectedJob = jobsWithSessions.find((j) => j.id === activeJobId);
  const jobSessions = selectedJob ? (sessionsByJob.get(selectedJob.id) || []) : [];

  // Flatten sessions in section order: active → agreed → ended
  const allSorted = [
    ...jobSessions.filter((s) => ACTIVE_STATES.has(s.state)),
    ...jobSessions.filter((s) => s.state === 'AGREED'),
    ...jobSessions.filter((s) => s.state === 'FAILED' || s.state === 'MAX_ROUNDS'),
  ];
  const totalPages = Math.max(1, Math.ceil(allSorted.length / PAGE_SIZE));
  const paged = allSorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleJobChange = (id: string) => {
    setActiveJobId(id);
    setPage(0);
  };

  // Find the section config for a session
  const sectionFor = (s: NegotiationSession) =>
    ACTIVE_STATES.has(s.state) ? SECTIONS[0]
      : s.state === 'AGREED' ? SECTIONS[1]
      : SECTIONS[2];

  return (
    <div>
      {/* Job tabs */}
      <div className="flex gap-1 mb-4 h-[38px] overflow-x-auto scrollbar-none">
        {jobsWithSessions.map((job) => {
          const count = sessionsByJob.get(job.id)?.length ?? 0;
          const isActive = job.id === activeJobId;
          return (
            <button
              key={job.id}
              type="button"
              className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[#FFE600]/15 text-[#FFE600] border border-[#FFE600]/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/30 border border-transparent'
              }`}
              onClick={() => handleJobChange(job.id)}
            >
              <span className="material-symbols-outlined text-base">work</span>
              <span className="truncate max-w-[180px]">{job.title}</span>
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-xs font-bold ${
                isActive ? 'bg-[#FFE600]/20 text-[#FFE600]' : 'bg-muted text-muted-foreground'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected job's sessions — paginated */}
      {selectedJob && allSorted.length > 0 && (
        <div>
          <div className="h-[216px] space-y-2">
            {paged.map((s) => {
              const section = sectionFor(s);
              const candidate = currentUserRole === 'EMPLOYER'
                ? s.seeker?.nearAccountId?.split('.')[0]
                : s.employer?.nearAccountId?.split('.')[0];
              return (
                <SessionRow
                  key={s.id}
                  session={s}
                  match={matchByJobId.get(s.jobId)}
                  ctaHref={section.ctaHref(s)}
                  activity={activities.get(s.id)}
                  currentUserRole={currentUserRole}
                  candidateLabel={candidate}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-3 mt-3">
            <button
              type="button"
              disabled={page === 0}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              onClick={() => setPage((p) => p - 1)}
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              onClick={() => setPage((p) => p + 1)}
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusTabList({
  grouped,
  matchByJobId,
  activities,
  currentUserRole,
}: {
  grouped: Record<string, NegotiationSession[]>;
  matchByJobId: Map<string, MatchResultDisplay>;
  activities: Map<string, Activity>;
  currentUserRole?: 'SEEKER' | 'EMPLOYER';
}) {
  // Find first non-empty section as default
  const firstNonEmpty = SECTIONS.find((s) => (grouped[s.key]?.length ?? 0) > 0);
  const [activeTab, setActiveTab] = useState<string>(firstNonEmpty?.key ?? 'active');
  const [page, setPage] = useState(0);

  const activeSection = SECTIONS.find((s) => s.key === activeTab);
  const items = activeSection ? (grouped[activeSection.key] || []) : [];
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paged = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when tab changes
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(0);
  };

  return (
    <div>
      {/* Status tabs */}
      <div className="flex gap-1 mb-4">
        {SECTIONS.map((section) => {
          const count = grouped[section.key]?.length ?? 0;
          if (count === 0) return null;
          const isActive = section.key === activeTab;
          return (
            <button
              key={section.key}
              type="button"
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive
                  ? 'border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/30 border border-transparent'
              }`}
              style={isActive ? {
                backgroundColor: `color-mix(in srgb, ${section.badgeColor} 15%, transparent)`,
                color: section.badgeColor,
                borderColor: `color-mix(in srgb, ${section.badgeColor} 30%, transparent)`,
              } : undefined}
              onClick={() => handleTabChange(section.key)}
            >
              {section.title}
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-xs font-bold ${
                  !isActive ? 'bg-muted text-muted-foreground' : ''
                }`}
                style={isActive ? {
                  backgroundColor: `color-mix(in srgb, ${section.badgeColor} 20%, transparent)`,
                  color: section.badgeColor,
                } : undefined}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected status sessions — fixed height for 3 rows */}
      {activeSection && items.length > 0 && (
        <div>
          <div className="h-[216px] space-y-2">
            {paged.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                match={matchByJobId.get(s.jobId)}
                ctaHref={activeSection.ctaHref(s)}
                activity={activities.get(s.id)}
                currentUserRole={currentUserRole}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-3 mt-3">
            <button
              type="button"
              disabled={page === 0}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              onClick={() => setPage((p) => p - 1)}
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              onClick={() => setPage((p) => p + 1)}
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>
      )}
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
  if (sessions.length === 0) return null;

  const { user } = useAuth();
  const { on } = useSse();
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

  const totalActivities = activities.size;

  // Employer mode: toggle between job-grouped and status-grouped
  if (jobs && jobs.length > 0) {
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
        {viewMode === 'job' ? (
          <JobGroupedList
            sessions={sessions}
            matchByJobId={matchByJobId}
            jobs={jobs}
            activities={activities}
            currentUserRole={user?.role}
          />
        ) : (
          <StatusTabList
            grouped={grouped}
            matchByJobId={matchByJobId}
            activities={activities}
            currentUserRole={user?.role}
          />
        )}
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
      <StatusTabList
        grouped={grouped}
        matchByJobId={matchByJobId}
        activities={activities}
        currentUserRole={user?.role}
      />
    </div>
  );
}
