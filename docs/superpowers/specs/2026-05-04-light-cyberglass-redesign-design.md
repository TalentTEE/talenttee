# TalentTee Light Cyberglass Redesign Design

## Goal

Redesign the TalentTee frontend from a dark neon interface into a bright, polished Light Cyberglass product experience. The redesign should make the app feel like an AI career command center while preserving existing product flows, APIs, authentication, wallet behavior, and datasource logic.

## Approved Direction

The selected direction is **Light Cyberglass**.

- Use a white-first interface with pale blue, pale pink, and soft green ambient backgrounds.
- Keep TalentTee's cyber/AI identity through restrained cyan, pink, and green accents.
- Replace heavy black panels and high-intensity neon glow with glassy white surfaces, subtle shadows, soft borders, and clearer hierarchy.
- Make the product feel trustworthy, modern, and readable rather than dark, demo-like, or visually heavy.

## Core Design Principles

- **Bright by default:** `:root` and the app shell should be light-first. Remove the default `<html>` `dark` class and do not add a theme toggle in this phase.
- **Proof over decoration:** Accent colors should communicate status, evidence, AI confidence, source health, and action priority.
- **Reusable primitives first:** Update shared `Button`, `Card`, `Dialog`, `Input`, `Badge`, `Tabs`, and shell styles before page-level overrides.
- **Preserve behavior:** UI redesign must not change backend contracts, OAuth flows, wallet flows, role routing, or datasource persistence.
- **Mobile parity:** Every redesigned page must remain usable on mobile, especially dashboard, datasource dialogs, negotiation views, and auth screens.

## Palette

Use these approximate tokens as the implementation target. Exact values can be tuned during implementation for contrast.

- Background: soft off-white / pale blue gradient base, e.g. `#F6FAFF`, `#FFF8FD`, `#FBFFF7`.
- Foreground: near-slate text, e.g. `#0F172A`.
- Muted text: readable slate gray, e.g. `#64748B`.
- Card/popover: white or translucent white, e.g. `rgba(255,255,255,0.78)`.
- Border: subtle slate border, e.g. `rgba(15,23,42,0.08)`.
- Primary: restrained cyan/teal, e.g. `#0891B2` or `#0F766E`.
- Secondary accent: magenta/rose, e.g. `#BE185D`.
- Positive accent: green, e.g. `#65A30D`.
- Warning accent: amber, e.g. `#D97706`.
- Destructive: accessible red, e.g. `#DC2626`.

## Page Designs

### Landing

Reframe the landing page as a bright product story around verified career evidence and AI negotiation.

- Replace dark neon hero with an editorial light hero.
- Use an abstract agent/proof visual rather than generic dark feature cards.
- Keep primary CTAs clear: sign up / dashboard, secondary demo or explanation CTA.
- Keep features, process, and CTA sections but restyle them as proof/agent capability cards.

### App Shell

The authenticated shell should become a glassy command center.

- Sidebar: translucent white surface, subtle border, active nav with low-opacity cyan/pink/green treatment.
- Header: light sticky topbar with readable wallet/account chips.
- Main: ambient light gradient background with content cards floating on it.
- Mobile sidebar overlay should remain functional and readable.

### Dashboard

Dashboard screens should prioritize the user's current AI state and next action.

- Keep seeker/employer data flow and conditional logic.
- Restyle `AIActionCard` as a prominent agent banner.
- Restyle metrics and summaries as bright cards with accents for source health, evidence strength, market value, matches, and negotiation progress.
- Employer dashboard should use the same visual language for job postings, escrow, and negotiations.

### Datasource

Datasource should read as an evidence pipeline, not just connection settings.

- Provider cards should show connection state, what evidence they contribute, and the primary action.
- Connected sources should use subtle cyan/green evidence styling, not dark neon boxes.
- GitHub repo dialog should use light surfaces, readable repo rows, and preserve scroll containment.
- PDF, Slack, Discord, and Gov24 dialogs should follow the same light dialog style.
- Datasource detail view should use proof sections and editable fields on light cards.

### Negotiation

Negotiation screens should feel like a readable agent workspace.

- Use offer/timeline cards instead of dark chat/log surfaces.
- Preserve all negotiation behavior and agreement flow.
- Present reasoning, offer terms, proof chips, agreement hash, transaction hash, and participant state on light cards.
- Use accent colors sparingly for state: active negotiation, warning, agreement reached, on-chain verification.

### Jobs And Escrow

Jobs and escrow should be visually aligned with the redesign.

- Forms should use light inputs, clear focus states, and white cards.
- Escrow balances, deposits, and funding states should use green/cyan proof-card styling.
- Job lists and create-job screens should avoid dark panels and use the shared card/input/button primitives.

### Auth

Login and signup should become light, centered authentication surfaces.

- Keep social login and wallet logic unchanged.
- Use bright card surfaces, softer background gradients, and clear error states.
- Preserve provider brand button colors where appropriate, such as Google and Kakao.

## Components And Boundaries

Update shared primitives first:

- `frontend/src/app/globals.css`
- `frontend/src/components/ui/button.tsx`
- `frontend/src/components/ui/card.tsx`
- `frontend/src/components/ui/dialog.tsx`
- `frontend/src/components/ui/input.tsx`
- `frontend/src/components/ui/textarea.tsx`
- `frontend/src/components/ui/badge.tsx`
- `frontend/src/components/ui/tabs.tsx`
- `frontend/src/components/ui/toast-provider.tsx`
- `frontend/src/components/ui/skeleton-card.tsx`

Then update shell and product screens:

- `frontend/src/app/layout.tsx`
- `frontend/src/components/layout/app-shell.tsx`
- `frontend/src/components/layout/header.tsx`
- `frontend/src/components/layout/sidebar.tsx`
- `frontend/src/components/layout/sidebar-*.tsx`
- `frontend/src/app/page.tsx`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/signup/page.tsx`
- `frontend/src/app/dashboard/**/*.tsx`
- `frontend/src/components/dashboard/**/*.tsx`
- `frontend/src/app/datasource/page.tsx`
- `frontend/src/components/datasource/**/*.tsx`
- `frontend/src/app/negotiations/**/*.tsx`
- `frontend/src/app/negotiation/**/*.tsx`
- `frontend/src/app/jobs/**/*.tsx`
- `frontend/src/app/escrow/**/*.tsx`

## Explicit Non-Goals

- Do not change backend APIs.
- Do not change GitHub OAuth/App behavior.
- Do not change wallet adapter behavior or Web3Auth network.
- Do not add datasource evidence provenance features in this phase.
- Do not add a dark/light theme toggle.
- Do not add new UI libraries or design-system packages.
- Do not rewrite tests unless existing snapshots/assertions depend on changed class names or accessible text.

## Implementation Strategy

1. Convert global tokens to light-first values and remove the forced root `dark` class from `frontend/src/app/layout.tsx`.
2. Update shared primitives so default cards, dialogs, inputs, buttons, badges, and tabs look correct on light surfaces.
3. Update shell components to establish the new app frame.
4. Redesign landing/auth screens.
5. Redesign dashboards and dashboard components.
6. Redesign datasource page and dialogs, preserving GitHub repo selection behavior and scroll containment.
7. Redesign negotiation, jobs, and escrow pages for visual consistency.
8. Run targeted frontend tests and build, then fix any regressions caused by UI/class/test changes.

## Verification Plan

Run frontend checks after implementation:

- `npm test -- src/app/datasource/page.test.tsx src/components/datasource/github-connect-dialog.test.tsx src/lib/api.real.test.ts`
- `npm test -- src/app/dashboard/seeker/page.test.tsx src/app/dashboard/employer/page.test.tsx src/app/login/page.test.tsx src/app/signup/page.test.tsx`
- `npm test -- src/app/negotiations/page.test.tsx src/app/negotiation/[sessionId]/page.test.tsx src/app/negotiation/[sessionId]/agree/page.test.tsx src/app/jobs/create/page.test.tsx src/app/escrow/page.test.tsx`
- `npm run build`

Manual smoke checks should cover desktop and mobile for:

- Landing
- Login/signup
- Seeker dashboard
- Employer dashboard
- Datasource and GitHub repo modal
- Negotiations list
- Negotiation detail and agreement
- Jobs list/create
- Escrow

## Risks

- Many files contain hardcoded dark colors such as `#060610` and high-intensity neon accent classes.
- Removing the root `dark` class may affect imported shadcn/base UI dark variants.
- A full redesign touches many screens and may require test updates where tests assert class-driven behavior.
- Visual regressions are possible without browser-based manual review, especially on mobile.

## Acceptance Criteria

- The default app loads as a bright Light Cyberglass interface.
- No core page retains large black/dark panels except intentional overlays/backdrops.
- Primary flows remain functional: auth, dashboard routing, datasource connect/manage, GitHub repo selection, PDF upload, jobs, escrow, negotiation, agreement.
- Shared primitives render correctly on light surfaces.
- Frontend targeted tests and build pass, or any remaining failures are documented with root cause.
