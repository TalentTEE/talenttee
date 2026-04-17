# Employer Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the employer dashboard to feature parity with the seeker dashboard — onboarding/active mode split, NegotiationOverview, job-grouped NegotiationList, employer PipelineProgress.

**Architecture:** Modify 5 existing files. PipelineProgress and NegotiationList gain role-awareness via props. employer/page.tsx gets a full rewrite mirroring seeker/page.tsx structure.

**Tech Stack:** React 19, Next.js, Tailwind v4, Material Symbols icons

---

### Task 1: Add employer stages to PipelineProgress

**Files:**
- Modify: `frontend/src/components/dashboard/PipelineProgress.tsx`

- [ ] **Step 1: Update PipelineStage type and add employer stages**

Replace the entire file content with:

```tsx
'use client';

import { cn } from '@/lib/utils';

export type SeekerStage = 'connect' | 'analyze' | 'match' | 'negotiate' | 'agree';
export type EmployerStage = 'post' | 'fund' | 'match' | 'negotiate' | 'hire';
export type PipelineStage = SeekerStage | EmployerStage;

interface StageConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
}

const seekerStages: StageConfig[] = [
  { key: 'connect', label: 'Connect', icon: 'link', color: '#00F0FF' },
  { key: 'analyze', label: 'Analyze', icon: 'analytics', color: '#BF5AF2' },
  { key: 'match', label: 'Match', icon: 'groups', color: '#39FF14' },
  { key: 'negotiate', label: 'Negotiate', icon: 'handshake', color: '#FF2DF1' },
  { key: 'agree', label: 'Agree', icon: 'task_alt', color: '#FFE600' },
];

const employerStages: StageConfig[] = [
  { key: 'post', label: 'Post', icon: 'edit_note', color: '#FFE600' },
  { key: 'fund', label: 'Fund', icon: 'account_balance', color: '#39FF14' },
  { key: 'match', label: 'Match', icon: 'groups', color: '#FF2DF1' },
  { key: 'negotiate', label: 'Negotiate', icon: 'handshake', color: '#BF5AF2' },
  { key: 'hire', label: 'Hire', icon: 'celebration', color: '#00F0FF' },
];

interface PipelineProgressProps {
  currentStage: PipelineStage;
  role?: 'SEEKER' | 'EMPLOYER';
}

export function PipelineProgress({ currentStage, role = 'SEEKER' }: PipelineProgressProps) {
  const stages = role === 'EMPLOYER' ? employerStages : seekerStages;
  const currentIndex = stages.findIndex((s) => s.key === currentStage);

  return (
    <div className="flex items-center gap-1 w-full">
      {stages.map((stage, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isFuture = i > currentIndex;

        return (
          <div key={stage.key} className="flex items-center flex-1 min-w-0">
            {/* Stage node */}
            <div className="flex flex-col items-center gap-1 min-w-[48px]">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500',
                  isFuture && 'bg-muted border border-border/20',
                )}
                style={
                  isComplete
                    ? { backgroundColor: stage.color, color: '#0a0a0a' }
                    : isCurrent
                    ? { backgroundColor: `color-mix(in srgb, ${stage.color} 20%, transparent)`, borderWidth: 2, borderColor: stage.color, borderStyle: 'solid' }
                    : undefined
                }
              >
                {isComplete ? (
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                ) : (
                  <span
                    className={cn(
                      'material-symbols-outlined text-base',
                      isCurrent && 'animate-pulse',
                      isFuture && 'text-muted-foreground/40',
                    )}
                    style={isCurrent ? { color: stage.color } : undefined}
                  >
                    {stage.icon}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-sm font-medium transition-colors',
                  isCurrent && 'font-semibold',
                  isFuture && 'text-muted-foreground/40',
                )}
                style={isComplete || isCurrent ? { color: stage.color } : undefined}
              >
                {stage.label}
              </span>
            </div>
            {/* Connector line */}
            {i < stages.length - 1 && (
              <div className="flex-1 h-px mx-1">
                <div
                  className={cn(
                    'h-full transition-all duration-500',
                    i >= currentIndex && 'bg-border/20',
                  )}
                  style={i < currentIndex ? { backgroundColor: stages[i + 1].color } : undefined}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds (PipelineStage type is a superset, existing SEEKER usage unchanged)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard/PipelineProgress.tsx
git commit -m "feat: add employer pipeline stages to PipelineProgress"
```

---

### Task 2: Enable PipelineProgress for employer in AIActionCard

**Files:**
- Modify: `frontend/src/components/dashboard/AIActionCard.tsx`

- [ ] **Step 1: Update imports and add jobs prop**

In `AIActionCard.tsx`, update the imports and interface:

Change the `AIActionCardProps` interface to add `jobs`:
```tsx
interface AIActionCardProps {
  datasources: DataSourceConnection[];
  resume: ResumeProfile | null;
  matches: MatchResultDisplay[];
  sessions: NegotiationSession[];
  role: 'SEEKER' | 'EMPLOYER';
  jobs?: JobPosting[];
}
```

Add `JobPosting` to the types import:
```tsx
import { DataSourceConnection, ResumeProfile, MatchResultDisplay, NegotiationSession, JobPosting } from '@/lib/types';
```

- [ ] **Step 2: Update getEmployerAction to accept jobs and use employer stages**

Replace the `getEmployerAction` function (lines 145-211):

```tsx
function getEmployerAction(
  jobs: JobPosting[],
  sessions: NegotiationSession[],
  matches: MatchResultDisplay[],
): ActionState {
  const activeSessions = sessions.filter(
    (s) => s.state !== 'AGREED' && s.state !== 'FAILED' && s.state !== 'MAX_ROUNDS',
  );
  const agreedSessions = sessions.filter((s) => s.state === 'AGREED');

  if (jobs.length === 0) {
    return {
      icon: 'edit_note',
      message: 'Post your first job',
      detail: 'Create a job posting to start matching with candidates.',
      ctaLabel: 'Create Job',
      ctaHref: '/jobs/create',
      stage: 'post',
      animating: false,
    };
  }

  if (matches.length === 0 && sessions.length === 0) {
    return {
      icon: 'account_balance',
      message: 'Fund your escrow',
      detail: 'Deposit NEAR to begin matching with candidates.',
      ctaLabel: 'Go to Escrow',
      ctaHref: '/escrow',
      stage: 'fund',
      animating: false,
    };
  }

  if (matches.length > 0 && sessions.length === 0) {
    const negotiatingMatch = matches.find((m) => m.negotiationSessionId);
    if (negotiatingMatch) {
      return {
        icon: 'handshake',
        message: 'AI is negotiating with candidate',
        detail: 'Your agent is working on the best terms.',
        ctaLabel: 'Monitor',
        ctaHref: `/negotiation/${negotiatingMatch.negotiationSessionId}`,
        stage: 'negotiate',
        animating: true,
      };
    }
    return {
      icon: 'groups',
      message: `Found ${matches.length} matching seeker${matches.length > 1 ? 's' : ''}`,
      detail: 'Review candidates and start negotiation.',
      ctaLabel: 'View Matches',
      ctaHref: '/negotiations',
      stage: 'match',
      animating: false,
    };
  }

  if (activeSessions.length > 0) {
    return {
      icon: 'handshake',
      message: `${activeSessions.length} negotiation${activeSessions.length > 1 ? 's' : ''} in progress`,
      detail: `Round ${activeSessions[0].currentRound} of ${activeSessions[0].maxRounds}.`,
      ctaLabel: 'Monitor',
      ctaHref: `/negotiation/${activeSessions[0].id}`,
      stage: 'negotiate',
      animating: true,
    };
  }

  if (agreedSessions.length > 0) {
    return {
      icon: 'celebration',
      message: 'Agreement reached!',
      detail: 'Review the negotiation outcome.',
      ctaLabel: 'View Agreement',
      ctaHref: `/negotiation/${agreedSessions[0].id}/agree`,
      stage: 'hire',
      animating: false,
    };
  }

  return {
    icon: 'smart_toy',
    message: 'AI is ready',
    detail: 'Your agent is standing by to find candidates.',
    ctaLabel: 'View Dashboard',
    ctaHref: '/dashboard/employer',
    stage: 'hire',
    animating: false,
  };
}
```

- [ ] **Step 3: Update stageColors to include employer stages**

Replace the `stageColors` record:

```tsx
const stageColors: Record<PipelineStage, string> = {
  connect: '#00F0FF',
  analyze: '#BF5AF2',
  match: '#39FF14',
  negotiate: '#FF2DF1',
  agree: '#FFE600',
  post: '#FFE600',
  fund: '#39FF14',
  hire: '#00F0FF',
};
```

- [ ] **Step 4: Update the AIActionCard component to pass role and jobs**

Replace the component function (lines 221-270):

```tsx
export function AIActionCard({ datasources, resume, matches, sessions, role, jobs = [] }: AIActionCardProps) {
  const action =
    role === 'SEEKER'
      ? getSeekerAction(datasources, resume, matches, sessions)
      : getEmployerAction(jobs, sessions, matches);

  const neon = stageColors[action.stage];

  return (
    <div
      className="rounded-2xl border p-5 space-y-4"
      style={{
        borderColor: `color-mix(in srgb, ${neon} 20%, transparent)`,
        background: `linear-gradient(to right, color-mix(in srgb, ${neon} 5%, transparent), color-mix(in srgb, ${neon} 10%, transparent))`,
      }}
    >
      <div className="flex items-start gap-4">
        {/* AI Icon */}
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${neon} 10%, transparent)` }}>
          <span
            className={`material-symbols-outlined text-xl ${action.animating ? 'animate-pulse' : ''}`}
            style={{ fontVariationSettings: "'FILL' 1", color: neon }}
          >
            {action.icon}
          </span>
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <h3 className="font-[var(--font-manrope)] font-bold text-foreground text-base">
            {action.message}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">{action.detail}</p>
        </div>

        {/* CTA */}
        <Link
          href={action.ctaHref}
          className="shrink-0 px-4 py-2 rounded-xl text-base font-semibold transition-all hover:brightness-90"
          style={{ backgroundColor: neon, color: '#0a0a0a' }}
        >
          {action.ctaLabel}
        </Link>
      </div>

      {/* Pipeline Progress */}
      <PipelineProgress currentStage={action.stage} role={role} />
    </div>
  );
}
```

- [ ] **Step 5: Verify build compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/dashboard/AIActionCard.tsx
git commit -m "feat: enable PipelineProgress for employer with job-aware action states"
```

---

### Task 3: Add job-grouped mode to NegotiationList

**Files:**
- Modify: `frontend/src/components/dashboard/negotiation-list.tsx`

- [ ] **Step 1: Add jobs prop to NegotiationList**

Update the props type and component signature. Add `JobPosting` import:

At the top, change the types import:
```tsx
import { NegotiationSession, MatchResultDisplay, JobPosting } from '@/lib/types';
```

Update the component signature (line 208-214):
```tsx
export function NegotiationList({
  sessions,
  matches = [],
  jobs,
}: {
  sessions: NegotiationSession[];
  matches?: MatchResultDisplay[];
  jobs?: JobPosting[];
}) {
```

- [ ] **Step 2: Add JobGroupedList sub-component**

Add this component above the `NegotiationList` export (before line 208). It reuses the existing `SessionRow` and `SECTIONS` config:

```tsx
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

  // Group sessions by jobId
  const sessionsByJob = new Map<string, NegotiationSession[]>();
  for (const s of sessions) {
    const arr = sessionsByJob.get(s.jobId) || [];
    arr.push(s);
    sessionsByJob.set(s.jobId, arr);
  }

  // Sort jobs: those with sessions first, then by title
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
            {/* Job Header */}
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

            {/* Session Rows grouped by status */}
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
                      <div className="space-y-2">
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
```

- [ ] **Step 3: Update NegotiationList render to branch on jobs prop**

In the `NegotiationList` component body, after the SSE `useEffect` and `grouped` logic, replace the return JSX (lines 283-350) with:

```tsx
  const hasAnySessions = sessions.length > 0;
  const totalActivities = activities.size;

  // Employer mode: group by job
  if (jobs && jobs.length > 0) {
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
        {!hasAnySessions ? (
          <p className="text-base text-muted-foreground">No active negotiations.</p>
        ) : (
          <JobGroupedList
            sessions={sessions}
            matchByJobId={matchByJobId}
            jobs={jobs}
            activities={activities}
            currentUserRole={user?.role}
          />
        )}
      </div>
    );
  }

  // Seeker mode: group by status (existing behavior)
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
                <div className="space-y-3">
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
```

- [ ] **Step 4: Verify build compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/negotiation-list.tsx
git commit -m "feat: add job-grouped mode to NegotiationList for employer dashboard"
```

---

### Task 4: Add empty state to JobList

**Files:**
- Modify: `frontend/src/components/dashboard/job-list.tsx`

- [ ] **Step 1: Add empty state when jobs array is empty**

Replace lines 20-52 (the `<div className="space-y-3">` block) with:

```tsx
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#FFE600]/10 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[#FFE600] text-2xl">work</span>
          </div>
          <p className="text-base font-semibold text-foreground mb-1">No job postings yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create your first posting to start matching with candidates.</p>
          <Link
            href="/jobs/create"
            className="px-4 py-2 rounded-xl bg-[#FFE600] text-[#0a0a0a] text-base font-semibold hover:bg-[#FFE600]/90 transition-all"
          >
            Create First Posting
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <div key={j.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/50 border border-border/5 hover:bg-accent transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#FFE600]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#FFE600] text-lg">work</span>
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">{j.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                      j.status === 'ACTIVE' ? 'text-[#FFE600]' : 'text-muted-foreground'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {j.status}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatSalary(j.salaryMin)} ~ {formatSalary(j.salaryMax)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-accent transition-all border border-border/10">
                  Edit
                </button>
                <button className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                  Close
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard/job-list.tsx
git commit -m "feat: add empty state guidance to JobList component"
```

---

### Task 5: Rewrite employer dashboard page with onboarding/active mode

**Files:**
- Modify: `frontend/src/app/dashboard/employer/page.tsx`

- [ ] **Step 1: Rewrite the entire employer page**

Replace the entire file content with:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getEscrowBalance, getJobs, getEmployerMatches, getNegotiationSessions } from '@/lib/api';
import { EscrowAccount, JobPosting, MatchResultDisplay, NegotiationSession } from '@/lib/types';
import { EscrowBalance } from '@/components/dashboard/escrow-balance';
import { JobList } from '@/components/dashboard/job-list';
import { NegotiationList } from '@/components/dashboard/negotiation-list';
import { NegotiationOverview } from '@/components/dashboard/negotiation-overview';
import { AIActionCard } from '@/components/dashboard/AIActionCard';
import { SkeletonGrid } from '@/components/ui/skeleton-card';

export default function EmployerDashboard() {
  const { user } = useAuth();
  const [escrow, setEscrow] = useState<EscrowAccount | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [matches, setMatches] = useState<MatchResultDisplay[]>([]);
  const [sessions, setSessions] = useState<NegotiationSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getEscrowBalance(user.nearAccountId).then(setEscrow).catch(() => {}),
      getJobs().then(async (j) => {
        setJobs(j);
        if (j.length > 0) {
          const allMatches = (await Promise.all(
            j.map((job) => getEmployerMatches(job.id).catch(() => []))
          )).flat();
          setMatches(allMatches);
        }
      }).catch(() => {}),
      getNegotiationSessions().then(setSessions).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
            Welcome back
          </h1>
          <p className="text-base text-muted-foreground mt-1">Manage your talent pipeline</p>
        </div>
        <SkeletonGrid count={4} lines={3} />
      </div>
    );
  }

  const isOnboarding = sessions.length === 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-[var(--font-manrope)] text-2xl font-extrabold text-foreground tracking-tight">
          Welcome back, {user?.nearAccountId?.split('.')[0] || 'Employer'}
        </h1>
        <p className="text-base text-muted-foreground mt-1">Manage your talent pipeline</p>
      </div>

      {isOnboarding ? (
        <>
          {/* Onboarding — AIActionCard guides the employer */}
          <div className="animate-[fadeSlideUp_300ms_ease-out_both]">
            <AIActionCard datasources={[]} resume={null} matches={matches} sessions={sessions} role="EMPLOYER" jobs={jobs} />
          </div>
          <div className="animate-[fadeSlideUp_300ms_ease-out_both]" style={{ animationDelay: '80ms' }}>
            <EscrowBalance escrow={escrow} />
          </div>
          <div className="animate-[fadeSlideUp_300ms_ease-out_both]" style={{ animationDelay: '160ms' }}>
            <JobList jobs={jobs} />
          </div>
        </>
      ) : (
        <>
          {/* Active — NegotiationOverview + job-grouped list */}
          <div className="animate-[fadeSlideUp_300ms_ease-out_both]">
            <NegotiationOverview sessions={sessions} />
          </div>
          <div className="animate-[fadeSlideUp_300ms_ease-out_both]" style={{ animationDelay: '80ms' }}>
            <NegotiationList sessions={sessions} matches={matches} jobs={jobs} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeSlideUp_300ms_ease-out_both]" style={{ animationDelay: '160ms' }}>
            <EscrowBalance escrow={escrow} />
            <JobList jobs={jobs} />
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`

- [ ] **Step 3: Run existing tests**

Run: `cd frontend && npx vitest run --reporter=verbose 2>&1 | tail -20`
Expected: All existing tests pass

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/employer/page.tsx
git commit -m "feat: rewrite employer dashboard with onboarding/active mode split"
```
