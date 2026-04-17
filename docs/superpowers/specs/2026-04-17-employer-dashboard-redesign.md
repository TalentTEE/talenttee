# Employer Dashboard Redesign

## Goal

Bring the employer dashboard to feature parity with the seeker dashboard by adding:
- Onboarding / Active mode split
- NegotiationOverview summary card
- Job-grouped NegotiationList (Job → Status 2-level grouping)
- Employer-specific PipelineProgress (4 stages: Post → Fund → Match → Hire)
- Bug fixes (multi-job match fetching, empty states)

## Mode Switching

```
isOnboarding = sessions.length === 0
```

Same logic as seeker dashboard (`seeker/page.tsx:51`).

### Onboarding Mode (no negotiation sessions)

1. **AIActionCard** — contextual next-action with PipelineProgress (employer 4-stage)
2. **EscrowBalance** — balance display + deposit CTA
3. **JobList** — job postings with empty-state guidance when 0 jobs

### Active Mode (1+ negotiation sessions)

1. **NegotiationOverview** — reuse existing component (Active/Agreed/Ended pills)
2. **NegotiationList** — job-grouped, then status-grouped within each job
3. **EscrowBalance + JobList** — side-by-side in 2-column grid (secondary info)

## Component Changes

### 1. `employer/page.tsx` — REWRITE

- Add `isOnboarding` check (same as seeker)
- Fetch matches for ALL jobs, not just `j[0]`:
  ```ts
  const allMatches = (await Promise.all(
    jobs.map(j => getEmployerMatches(j.id).catch(() => []))
  )).flat();
  ```
- Onboarding layout: AIActionCard → EscrowBalance → JobList
- Active layout: NegotiationOverview → NegotiationList → (EscrowBalance + JobList grid)
- Same fadeSlideUp animations and delay pattern as seeker

### 2. `PipelineProgress.tsx` — MODIFY

- Add `role` prop: `'SEEKER' | 'EMPLOYER'`
- Define employer stages: `post`, `fund`, `match`, `hire` (4 stages)
- Select stage config based on role
- Update `PipelineStage` type to union of both sets

### 3. `AIActionCard.tsx` — MODIFY

- Remove the `role === 'SEEKER'` guard on PipelineProgress render (line 267)
- Pass `role` prop to PipelineProgress
- Map employer action stages to employer PipelineStage values
- Update `getEmployerAction()` default state: check if jobs exist before suggesting "Deposit NEAR"

### 4. `NegotiationList.tsx` — MODIFY

- Accept optional `jobs` prop: `JobPosting[]`
- When `jobs` is provided (employer mode), render 2-level grouping:
  - Level 1: Job card header (job title, session count, status summary pills)
  - Level 2: Within each job, same status sections (In Progress / Agreed / Ended)
- When `jobs` is not provided (seeker mode), keep current behavior unchanged
- Collapsible job sections (first job expanded by default)

### 5. `JobList.tsx` — FIX

- Add empty state when `jobs.length === 0`:
  - Icon + "No job postings yet" message
  - "Create your first posting" CTA linking to `/jobs/create`

## Data Flow

```
employer/page.tsx
  ├── getEscrowBalance(user.nearAccountId)
  ├── getJobs()
  ├── Promise.all(jobs.map(j => getEmployerMatches(j.id)))  ← FIX: all jobs
  └── getNegotiationSessions()
       ↓
  isOnboarding = sessions.length === 0
       ↓
  Onboarding: AIActionCard → EscrowBalance → JobList
  Active:     NegotiationOverview → NegotiationList(jobs, sessions, matches)
              → [EscrowBalance | JobList] (2-col grid)
```

## Files Modified

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/app/dashboard/employer/page.tsx` | Rewrite | Mode split, multi-job match fetch |
| `frontend/src/components/dashboard/PipelineProgress.tsx` | Modify | Add role prop, employer 4-stage |
| `frontend/src/components/dashboard/AIActionCard.tsx` | Modify | Enable PipelineProgress for employer |
| `frontend/src/components/dashboard/negotiation-list.tsx` | Modify | Job-grouped mode for employer |
| `frontend/src/components/dashboard/job-list.tsx` | Fix | Empty state guidance |

## Out of Scope

- JobList Edit/Close button handlers (placeholder, separate task)
- Real-time SSE for employer-specific events (already works via NegotiationList)
- New API endpoints (all existing endpoints sufficient)
