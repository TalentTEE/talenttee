# Light Cyberglass Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert TalentTee's frontend from a dark neon interface to the approved Light Cyberglass product-wide redesign while preserving all existing flows.

**Architecture:** Update design tokens and shared UI primitives first, then apply the new visual language through the app shell and core product pages. Keep data fetching, auth, wallet, datasource, and negotiation behavior intact; change presentation only.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, Base UI, Vitest, Testing Library.

---

## File Structure

- `frontend/src/app/globals.css`: owns Tailwind v4 theme tokens, global light background, reusable glass/neon utility classes.
- `frontend/src/app/layout.tsx`: removes forced `dark` root class.
- `frontend/src/components/ui/*.tsx`: shared primitives for buttons, cards, dialogs, inputs, badges, tabs, skeletons, toast surfaces.
- `frontend/src/components/layout/*.tsx`: authenticated app shell, topbar, sidebar, role/account chips.
- `frontend/src/app/page.tsx`: public landing page redesign.
- `frontend/src/app/login/page.tsx` and `frontend/src/app/signup/page.tsx`: light auth card redesign with unchanged login logic.
- `frontend/src/app/dashboard/**/*.tsx` and `frontend/src/components/dashboard/**/*.tsx`: dashboard cards, AI action banner, datasource status, job/negotiation/resume/market components.
- `frontend/src/app/datasource/page.tsx` and `frontend/src/components/datasource/**/*.tsx`: evidence pipeline UI, source cards, dialogs, detail editor.
- `frontend/src/app/negotiations/**/*.tsx` and `frontend/src/app/negotiation/**/*.tsx`: negotiation list/detail/agreement light workspace.
- `frontend/src/app/jobs/**/*.tsx` and `frontend/src/app/escrow/**/*.tsx`: supporting product pages aligned with the new primitives.

## Task 1: Global Tokens And Root Theme

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Read Next local guidance before code edits**

Run the local docs lookup for App Router/layout behavior before touching `layout.tsx`.

Expected result: confirm that removing a static class from `<html>` is safe and does not alter route conventions.

- [ ] **Step 2: Convert `:root` tokens to light-first values**

Target token block:

```css
:root {
  --background: #f6faff;
  --foreground: #0f172a;
  --card: rgba(255, 255, 255, 0.82);
  --card-foreground: #0f172a;
  --popover: rgba(255, 255, 255, 0.94);
  --popover-foreground: #0f172a;
  --primary: #0891b2;
  --primary-foreground: #ffffff;
  --secondary: #e8f1fb;
  --secondary-foreground: #164e63;
  --muted: #eef4fb;
  --muted-foreground: #64748b;
  --accent: #f4e9f5;
  --accent-foreground: #831843;
  --destructive: #dc2626;
  --border: rgba(15, 23, 42, 0.10);
  --input: rgba(15, 23, 42, 0.12);
  --ring: #0891b2;
  --chart-1: #0891b2;
  --chart-2: #be185d;
  --chart-3: #65a30d;
  --chart-4: #d97706;
  --chart-5: #7c3aed;
  --sidebar: rgba(255, 255, 255, 0.78);
  --sidebar-foreground: #475569;
  --sidebar-primary: #0891b2;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: rgba(8, 145, 178, 0.10);
  --sidebar-accent-foreground: #075985;
  --sidebar-border: rgba(15, 23, 42, 0.08);
  --sidebar-ring: #0891b2;
}
```

- [ ] **Step 3: Preserve `.dark` block only as non-default fallback**

Keep `.dark` available but do not rely on it. Do not remove `@custom-variant dark`; imported components may still contain `dark:` variants.

- [ ] **Step 4: Add light cyberglass helpers**

Add small reusable helpers used by page-level code:

```css
.app-ambient {
  background:
    radial-gradient(circle at 12% 0%, rgba(8, 145, 178, 0.12), transparent 32%),
    radial-gradient(circle at 88% 12%, rgba(190, 24, 93, 0.10), transparent 30%),
    radial-gradient(circle at 50% 100%, rgba(101, 163, 13, 0.08), transparent 34%),
    linear-gradient(135deg, #f6faff 0%, #fff8fd 58%, #fbfff7 100%);
}

.glass-card {
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(18px);
}
```

- [ ] **Step 5: Remove default `dark` root class**

Change `frontend/src/app/layout.tsx` from:

```tsx
className={`${inter.variable} ${manrope.variable} ${playfair.variable} dark antialiased`}
```

to:

```tsx
className={`${inter.variable} ${manrope.variable} ${playfair.variable} antialiased`}
```

## Task 2: Shared UI Primitives

**Files:**
- Modify: `frontend/src/components/ui/button.tsx`
- Modify: `frontend/src/components/ui/card.tsx`
- Modify: `frontend/src/components/ui/dialog.tsx`
- Modify: `frontend/src/components/ui/input.tsx`
- Modify: `frontend/src/components/ui/textarea.tsx`
- Modify: `frontend/src/components/ui/badge.tsx`
- Modify: `frontend/src/components/ui/tabs.tsx`
- Modify: `frontend/src/components/ui/skeleton-card.tsx`
- Modify: `frontend/src/components/ui/toast-provider.tsx`

- [ ] **Step 1: Make primitives light-surface native**

Use `bg-card`, `bg-white/70`, `border-border`, `shadow-[0_16px_45px_rgba(15,23,42,0.08)]`, `text-foreground`, and `text-muted-foreground` as the default visual language.

- [ ] **Step 2: Remove dark-only default treatments**

Remove primitive defaults that only look correct when the root has `.dark`, such as `dark:bg-input/30` from core input surfaces when the normal class already provides the light surface.

- [ ] **Step 3: Keep accessible focus states**

Inputs and interactive primitives must keep visible focus:

```tsx
"focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
```

- [ ] **Step 4: Preserve public API**

Do not rename exported components, variants, or props. Existing page code should continue importing the same primitives.

## Task 3: Authenticated App Shell

**Files:**
- Modify: `frontend/src/components/layout/app-shell.tsx`
- Modify: `frontend/src/components/layout/header.tsx`
- Modify: `frontend/src/components/layout/sidebar.tsx`
- Modify: `frontend/src/components/layout/sidebar-escrow-balance.tsx`
- Modify: `frontend/src/components/layout/sidebar-seeker-earnings.tsx`
- Modify: `frontend/src/components/layout/sidebar-job-seek-toggle.tsx`
- Modify: `frontend/src/components/layout/AgentStatusIndicator.tsx`
- Modify: `frontend/src/components/layout/AgentActivityStream.tsx`

- [ ] **Step 1: Apply ambient app background**

Use `app-ambient` at the shell root:

```tsx
<div className="min-h-screen flex app-ambient">
```

- [ ] **Step 2: Restyle sidebar as glass navigation**

Use a translucent white sidebar with subtle border. Keep current routing, active link detection, and mobile open/close behavior.

- [ ] **Step 3: Restyle header chips**

Use bright wallet/account chips and keep logout behavior unchanged.

- [ ] **Step 4: Verify mobile shell behavior manually**

Open a narrow viewport and confirm the menu overlay, close behavior, and content scroll still work.

## Task 4: Landing And Auth Screens

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/login/page.tsx`
- Modify: `frontend/src/app/signup/page.tsx`
- Test: `frontend/src/app/login/page.test.tsx`

- [ ] **Step 1: Redesign landing hero and sections**

Preserve user routing logic and CTA destinations. Replace dark/neon feature cards with bright proof/agent capability cards.

- [ ] **Step 2: Redesign login and signup surfaces**

Keep all login handlers unchanged. Preserve Google/Kakao brand buttons and wallet flow.

- [ ] **Step 3: Run auth tests**

Run: `npm test -- src/app/login/page.test.tsx`

Expected: tests pass, or only class-related assertions require updates.

## Task 5: Dashboard Components

**Files:**
- Modify: `frontend/src/app/dashboard/seeker/page.tsx`
- Modify: `frontend/src/app/dashboard/employer/page.tsx`
- Modify: `frontend/src/components/dashboard/AIActionCard.tsx`
- Modify: `frontend/src/components/dashboard/PipelineProgress.tsx`
- Modify: `frontend/src/components/dashboard/datasource-status.tsx`
- Modify: `frontend/src/components/dashboard/resume-summary.tsx`
- Modify: `frontend/src/components/dashboard/market-value-card.tsx`
- Modify: `frontend/src/components/dashboard/negotiation-list.tsx`
- Modify: `frontend/src/components/dashboard/negotiation-overview.tsx`
- Modify: `frontend/src/components/dashboard/job-list.tsx`
- Modify: `frontend/src/components/dashboard/match-list.tsx`
- Modify: `frontend/src/components/dashboard/escrow-balance.tsx`
- Test: `frontend/src/app/dashboard/seeker/page.test.tsx`
- Test: `frontend/src/app/dashboard/employer/page.test.tsx`

- [ ] **Step 1: Turn `AIActionCard` into the primary agent banner**

Keep `getSeekerAction` and `getEmployerAction` logic unchanged. Change only the returned markup/styles.

- [ ] **Step 2: Restyle dashboard cards**

Use `glass-card`, light metric cards, restrained accent colors, and readable muted text.

- [ ] **Step 3: Run dashboard tests**

Run: `npm test -- src/app/dashboard/seeker/page.test.tsx src/app/dashboard/employer/page.test.tsx`

Expected: tests pass after class-only updates if needed.

## Task 6: Datasource Evidence Pipeline

**Files:**
- Modify: `frontend/src/app/datasource/page.tsx`
- Modify: `frontend/src/components/datasource/github-connect-dialog.tsx`
- Modify: `frontend/src/components/datasource/pdf-upload-dialog.tsx`
- Modify: `frontend/src/components/datasource/slack-connect-dialog.tsx`
- Modify: `frontend/src/components/datasource/discord-connect-dialog.tsx`
- Modify: `frontend/src/components/datasource/gov24-connect-dialog.tsx`
- Modify: `frontend/src/components/datasource/datasource-detail-view.tsx`
- Test: `frontend/src/app/datasource/page.test.tsx`
- Test: `frontend/src/components/datasource/github-connect-dialog.test.tsx`
- Test: `frontend/src/lib/api.real.test.ts`

- [ ] **Step 1: Redesign provider cards**

Keep all datasource handlers, OAuth popup behavior, repo management, and PDF upload behavior unchanged. Change provider card layout and visual hierarchy only.

- [ ] **Step 2: Restyle datasource dialogs**

Replace hardcoded `bg-[#060610]` surfaces with `bg-white/70`, `bg-muted/60`, or `glass-card`. Preserve GitHub repo list `overflow-y-auto overscroll-contain`.

- [ ] **Step 3: Restyle datasource detail editor**

Use light proof sections and preserve save/edit handlers.

- [ ] **Step 4: Run datasource tests**

Run: `npm test -- src/app/datasource/page.test.tsx src/components/datasource/github-connect-dialog.test.tsx src/lib/api.real.test.ts`

Expected: all pass.

## Task 7: Negotiations, Jobs, And Escrow

**Files:**
- Modify: `frontend/src/app/negotiations/page.tsx`
- Modify: `frontend/src/app/negotiation/[sessionId]/page.tsx`
- Modify: `frontend/src/app/negotiation/[sessionId]/agree/page.tsx`
- Modify: `frontend/src/app/negotiation/[sessionId]/history/page.tsx`
- Modify: `frontend/src/components/negotiation/MatchContextCard.tsx`
- Modify: `frontend/src/components/negotiation/StrategyInsight.tsx`
- Modify: `frontend/src/components/negotiation/ThinkingAnimation.tsx`
- Modify: `frontend/src/components/negotiation/VerifyBadge.tsx`
- Modify: `frontend/src/app/jobs/page.tsx`
- Modify: `frontend/src/app/jobs/create/page.tsx`
- Modify: `frontend/src/app/escrow/page.tsx`
- Test: `frontend/src/app/negotiations/page.test.tsx`
- Test: `frontend/src/app/negotiation/[sessionId]/page.test.tsx`
- Test: `frontend/src/app/negotiation/[sessionId]/agree/page.test.tsx`
- Test: `frontend/src/app/jobs/create/page.test.tsx`
- Test: `frontend/src/app/escrow/page.test.tsx`

- [ ] **Step 1: Restyle negotiations list and detail workspace**

Use light timeline/offer cards. Keep negotiation session loading, actions, and navigation unchanged.

- [ ] **Step 2: Restyle agreement page**

Use light verification cards for agreement hash, transaction hash, participants, and transcript.

- [ ] **Step 3: Restyle jobs and escrow pages**

Use light cards/forms and preserve existing form submission, escrow balance, and wallet behavior.

- [ ] **Step 4: Run product flow tests**

Run: `npm test -- src/app/negotiations/page.test.tsx src/app/negotiation/[sessionId]/page.test.tsx src/app/negotiation/[sessionId]/agree/page.test.tsx src/app/jobs/create/page.test.tsx src/app/escrow/page.test.tsx`

Expected: all pass.

## Task 8: Hardcoded Dark Cleanup And Build Verification

**Files:**
- Inspect/modify: `frontend/src/**/*.{tsx,ts,css}`

- [ ] **Step 1: Search for remaining dark hardcoding**

Search terms:

```text
#060610
#030305
#0A0A10
#020204
#12121C
bg-black
dark
```

Intentional exceptions: overlays such as `bg-black/10` or `bg-black/50` are allowed if they are modal/mobile backdrops.

- [ ] **Step 2: Run full frontend build**

Run: `npm run build`

Expected: build succeeds. Existing environment warnings are acceptable only if unrelated.

- [ ] **Step 3: Run focused visual smoke in browser**

Check desktop and mobile for landing, auth, seeker dashboard, employer dashboard, datasource modal, negotiation detail, jobs, and escrow.

- [ ] **Step 4: Review git diff**

Run: `git diff --stat` and `git diff --check`.

Expected: no whitespace errors and only frontend/docs files changed, plus ignored `.superpowers/` brainstorm artifacts not staged.

## Self-Review

- Spec coverage: global tokens, root `dark` removal, shared primitives, shell, landing/auth, dashboard, datasource, negotiation, jobs, escrow, testing, and non-goals are covered.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation sections remain.
- Type consistency: no new public props or renamed exports are required; all tasks preserve existing component APIs.
