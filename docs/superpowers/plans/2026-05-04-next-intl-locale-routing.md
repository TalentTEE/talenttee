# Next-Intl Locale Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add global-ready English/Korean route-localized UI with `next-intl`, `/en` and `/ko` routes, and a language toggle that preserves the current page.

**Architecture:** Use `next-intl` locale-based routing with a top-level `[locale]` App Router segment. Move current routes under `src/app/[locale]`, keep shared providers/global CSS outside the route tree, and replace static user-facing UI strings with namespaced `messages/en.json` and `messages/ko.json` entries.

**Tech Stack:** Next.js 16.2.3 App Router, React 19, TypeScript, `next-intl`, Vitest, Testing Library.

---

## Source References

- Spec: `docs/superpowers/specs/2026-05-04-next-intl-locale-routing-design.md`
- Official next-intl App Router setup: `https://next-intl.dev/docs/getting-started/app-router`
- Official next-intl locale routing setup: `https://next-intl.dev/docs/routing/setup`
- Official next-intl navigation APIs: `https://next-intl.dev/docs/routing/navigation`
- Project Next.js rule: before editing Next.js code, check relevant docs in `frontend/node_modules/next/dist/docs/`.

## File Structure

Create:

- `frontend/messages/en.json`: English UI messages.
- `frontend/messages/ko.json`: Korean UI messages.
- `frontend/src/i18n/routing.ts`: Supported locales and default locale.
- `frontend/src/i18n/navigation.ts`: Locale-aware wrappers for `Link`, `useRouter`, `usePathname`, `redirect`, and `getPathname`.
- `frontend/src/i18n/request.ts`: Request-scoped locale/message loader.
- `frontend/src/i18n/routing.test.ts`: Lightweight routing config regression test.
- `frontend/src/proxy.ts`: Next 16 proxy for next-intl routing.
- `frontend/src/components/i18n/language-toggle.tsx`: Shared language toggle.
- `frontend/src/components/i18n/language-toggle.test.tsx`: Toggle route-preservation test.
- `frontend/src/test/render-with-intl.tsx`: Test render helper that wraps components in `NextIntlClientProvider`.
- `frontend/src/app/[locale]/layout.tsx`: Locale-aware root layout with `<html lang={locale}>`.

Move:

- `frontend/src/app/page.tsx` -> `frontend/src/app/[locale]/page.tsx`
- `frontend/src/app/analysis/` -> `frontend/src/app/[locale]/analysis/`
- `frontend/src/app/dashboard/` -> `frontend/src/app/[locale]/dashboard/`
- `frontend/src/app/datasource/` -> `frontend/src/app/[locale]/datasource/`
- `frontend/src/app/escrow/` -> `frontend/src/app/[locale]/escrow/`
- `frontend/src/app/jobs/` -> `frontend/src/app/[locale]/jobs/`
- `frontend/src/app/login/` -> `frontend/src/app/[locale]/login/`
- `frontend/src/app/negotiation/` -> `frontend/src/app/[locale]/negotiation/`
- `frontend/src/app/negotiations/` -> `frontend/src/app/[locale]/negotiations/`
- `frontend/src/app/signup/` -> `frontend/src/app/[locale]/signup/`

Modify:

- `frontend/package.json` and `frontend/package-lock.json`: Add `next-intl`.
- `frontend/next.config.ts`: Wrap existing config with `next-intl/plugin` while preserving env loading and `allowedDevOrigins`.
- `frontend/src/app/providers.tsx`: Keep existing providers; do not make this locale-aware unless required by tests.
- `frontend/src/components/layout/header.tsx`: Add `LanguageToggle`, translate labels, use locale-aware router/navigation.
- `frontend/src/components/layout/sidebar.tsx`: Translate nav labels and use locale-aware `Link`.
- `frontend/src/components/layout/*.tsx`: Translate static UI labels.
- `frontend/src/components/dashboard/*.tsx`: Translate static dashboard UI labels.
- `frontend/src/components/datasource/*.tsx`: Translate static datasource UI labels and modal copy.
- `frontend/src/components/negotiation/*.tsx`: Translate static negotiation helper UI labels.
- `frontend/src/components/ui/toast-provider.tsx`: Keep toast shell; translate only frontend-owned toast messages at call sites.
- All moved page tests under `frontend/src/app/[locale]/...`: Use `renderWithIntl` when components call `useTranslations`.

Do not modify:

- `.planning/STATE.md`
- `backend/node_modules/.package-lock.json`
- Backend APIs

## Task 1: Add next-intl Dependency And Core Config

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/next.config.ts`
- Create: `frontend/messages/en.json`
- Create: `frontend/messages/ko.json`
- Create: `frontend/src/i18n/routing.ts`
- Create: `frontend/src/i18n/navigation.ts`
- Create: `frontend/src/i18n/request.ts`
- Create: `frontend/src/i18n/routing.test.ts`
- Create: `frontend/src/proxy.ts`

- [ ] **Step 1: Install dependency**

Run:

```bash
npm install next-intl
```

Expected: `package.json` and `package-lock.json` include `next-intl`.

- [ ] **Step 2: Write the routing config test**

Create `frontend/src/i18n/routing.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { routing } from './routing';

describe('i18n routing', () => {
  it('supports English and Korean with English as default', () => {
    expect(routing.locales).toEqual(['en', 'ko']);
    expect(routing.defaultLocale).toBe('en');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:

```bash
npm test -- src/i18n/routing.test.ts
```

Expected: FAIL because `src/i18n/routing.ts` does not exist.

- [ ] **Step 4: Add routing config**

Create `frontend/src/i18n/routing.ts`:

```ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ko'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
```

- [ ] **Step 5: Add locale-aware navigation helpers**

Create `frontend/src/i18n/navigation.ts`:

```ts
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

- [ ] **Step 6: Add request config**

Create `frontend/src/i18n/request.ts`:

```ts
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 7: Add Next 16 proxy**

Create `frontend/src/proxy.ts`:

```ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
```

- [ ] **Step 8: Seed message files**

Create `frontend/messages/en.json`:

```json
{
  "metadata": {
    "title": "TalentTee | Blockchain AI Recruitment",
    "description": "AI agents negotiate job offers on your behalf, powered by NEAR Protocol"
  },
  "common": {
    "loading": "Loading...",
    "cancel": "Cancel",
    "close": "Close",
    "save": "Save",
    "connect": "Connect",
    "disconnect": "Disconnect",
    "retry": "Retry",
    "languageToggleLabel": "Switch language",
    "english": "English",
    "korean": "Korean"
  },
  "nav": {
    "dashboard": "Dashboard",
    "datasource": "My Value",
    "negotiations": "Negotiations",
    "jobPostings": "Job Postings",
    "escrow": "Escrow",
    "logout": "Logout",
    "login": "Log In",
    "signup": "Sign Up"
  }
}
```

Create `frontend/messages/ko.json`:

```json
{
  "metadata": {
    "title": "TalentTee | 블록체인 AI 채용",
    "description": "NEAR Protocol 기반 AI 에이전트가 당신을 대신해 채용 제안을 협상합니다"
  },
  "common": {
    "loading": "불러오는 중...",
    "cancel": "취소",
    "close": "닫기",
    "save": "저장",
    "connect": "연결",
    "disconnect": "연결 해제",
    "retry": "다시 시도",
    "languageToggleLabel": "언어 전환",
    "english": "영어",
    "korean": "한국어"
  },
  "nav": {
    "dashboard": "대시보드",
    "datasource": "나의 가치",
    "negotiations": "협상",
    "jobPostings": "채용 공고",
    "escrow": "에스크로",
    "logout": "로그아웃",
    "login": "로그인",
    "signup": "회원가입"
  }
}
```

- [ ] **Step 9: Wrap Next config with next-intl plugin**

Modify `frontend/next.config.ts` so the final export is wrapped without removing existing env behavior:

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { readFileSync } from "fs";
import { resolve } from "path";
import { networkInterfaces } from "os";

// Load env from project root (one level up) so backend/frontend share a single .env
function parseRootEnv(): Record<string, string> {
  const envPath = resolve(__dirname, "..", ".env");
  const parsed: Record<string, string> = {};
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      parsed[key] = value;
    }
    console.log(`[next.config] Loaded ${Object.keys(parsed).length} vars from ${envPath}`);
    console.log(`[next.config] NEXT_PUBLIC_API_URL = ${parsed.NEXT_PUBLIC_API_URL ?? "(not set)"}`);
  } catch (err) {
    console.warn(`[next.config] Failed to read root .env: ${err}`);
  }
  return parsed;
}

const rootEnv = parseRootEnv();

const publicEnv: Record<string, string> = {};
for (const [k, v] of Object.entries(rootEnv)) {
  if (k.startsWith("NEXT_PUBLIC_")) publicEnv[k] = v;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    ...Object.values(networkInterfaces())
      .flat()
      .filter((i) => i && !i.internal && i.family === "IPv4")
      .map((i) => i!.address),
    '172.30.72.55',
    '172.30.*.*',
  ],
  env: publicEnv,
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
```

- [ ] **Step 10: Run config test**

Run:

```bash
npm test -- src/i18n/routing.test.ts
```

Expected: PASS.

- [ ] **Step 11: Commit if commits are approved for this execution**

Run only after explicit commit approval:

```bash
git add frontend/package.json frontend/package-lock.json frontend/next.config.ts frontend/messages/en.json frontend/messages/ko.json frontend/src/i18n frontend/src/proxy.ts
git commit -m "feat(i18n): add next-intl routing config"
```

## Task 2: Move Routes Under `[locale]` And Add Locale Root Layout

**Files:**
- Move: all route pages/directories listed in File Structure
- Create/Modify: `frontend/src/app/[locale]/layout.tsx`
- Keep: `frontend/src/app/providers.tsx`
- Keep: `frontend/src/app/globals.css`

- [ ] **Step 1: Read Next route docs before editing**

Read the relevant local Next.js docs from `frontend/node_modules/next/dist/docs/` for App Router layouts, pages, and dynamic segments.

- [ ] **Step 2: Move route files**

Run from `frontend`:

```bash
mkdir -p src/app/[locale]
git mv src/app/layout.tsx src/app/[locale]/layout.tsx
git mv src/app/page.tsx src/app/[locale]/page.tsx
git mv src/app/analysis src/app/[locale]/analysis
git mv src/app/dashboard src/app/[locale]/dashboard
git mv src/app/datasource src/app/[locale]/datasource
git mv src/app/escrow src/app/[locale]/escrow
git mv src/app/jobs src/app/[locale]/jobs
git mv src/app/login src/app/[locale]/login
git mv src/app/negotiation src/app/[locale]/negotiation
git mv src/app/negotiations src/app/[locale]/negotiations
git mv src/app/signup src/app/[locale]/signup
```

Expected: route files and colocated tests now live under `src/app/[locale]/...`.

- [ ] **Step 3: Replace moved layout with locale-aware root layout**

Modify `frontend/src/app/[locale]/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter, Manrope, Playfair_Display } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "../globals.css";
import { Providers } from "../providers";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { routing } from "@/i18n/routing";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "900"],
});

type LocaleParams = {
  params: Promise<{ locale: string }>;
};

type LayoutProps = LocaleParams & {
  children: React.ReactNode;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${manrope.variable} ${playfair.variable} antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans">
        <NextIntlClientProvider>
          <OfflineBanner />
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Fix relative imports caused by layout move**

Check `src/app/[locale]/layout.tsx` imports carefully:

- `../globals.css` should resolve to `src/app/globals.css`.
- `../providers` should resolve to `src/app/providers.tsx`.

- [ ] **Step 5: Run a route compile check**

Run:

```bash
npm run build
```

Expected at this point: build may fail because pages still use raw `next/link` and tests are not updated, but it should not fail because of missing root layout or missing CSS imports. Fix any root-layout-only errors before continuing.

- [ ] **Step 6: Commit if commits are approved for this execution**

Run only after explicit commit approval:

```bash
git add frontend/src/app
git commit -m "feat(i18n): move routes under locale segment"
```

## Task 3: Add Intl Test Helper

**Files:**
- Create: `frontend/src/test/render-with-intl.tsx`
- Modify: moved page tests under `frontend/src/app/[locale]/...`

- [ ] **Step 1: Create test helper**

Create `frontend/src/test/render-with-intl.tsx`:

```tsx
import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import enMessages from '../../messages/en.json';
import koMessages from '../../messages/ko.json';

const messages = {
  en: enMessages,
  ko: koMessages,
};

type Locale = keyof typeof messages;

export function renderWithIntl(
  ui: ReactElement,
  options: RenderOptions & { locale?: Locale } = {},
) {
  const { locale = 'en', ...renderOptions } = options;

  return render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {ui}
    </NextIntlClientProvider>,
    renderOptions,
  );
}
```

- [ ] **Step 2: Add a helper smoke test by updating one existing test**

In `frontend/src/app/[locale]/login/page.test.tsx`, replace direct `render(<LoginPage />)` calls with:

```tsx
import { renderWithIntl } from '@/test/render-with-intl';

renderWithIntl(<LoginPage />);
```

If the page does not yet call `useTranslations`, this still proves the wrapper works.

- [ ] **Step 3: Run the updated test**

Run:

```bash
npm test -- 'src/app/[locale]/login/page.test.tsx'
```

Expected: PASS or the same assertion failures that existed before the move. Fix import path and provider errors now.

- [ ] **Step 4: Commit if commits are approved for this execution**

Run only after explicit commit approval:

```bash
git add frontend/src/test/render-with-intl.tsx 'frontend/src/app/[locale]/login/page.test.tsx'
git commit -m "test(i18n): add intl render helper"
```

## Task 4: Add Language Toggle

**Files:**
- Create: `frontend/src/components/i18n/language-toggle.tsx`
- Create: `frontend/src/components/i18n/language-toggle.test.tsx`

- [ ] **Step 1: Write the failing toggle test**

Create `frontend/src/components/i18n/language-toggle.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithIntl } from '@/test/render-with-intl';
import { LanguageToggle } from './language-toggle';

const replace = vi.fn();

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/negotiation/session-2/agree',
  useRouter: () => ({ replace }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('tab=terms'),
}));

vi.mock('next-intl', async () => {
  const actual = await vi.importActual<typeof import('next-intl')>('next-intl');
  return {
    ...actual,
    useLocale: () => 'en',
  };
});

describe('LanguageToggle', () => {
  it('switches to the other locale while preserving path and query', async () => {
    const user = userEvent.setup();
    renderWithIntl(<LanguageToggle />);

    await user.click(screen.getByRole('button', { name: /switch language/i }));

    expect(replace).toHaveBeenCalledWith('/negotiation/session-2/agree?tab=terms', {
      locale: 'ko',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- src/components/i18n/language-toggle.test.tsx
```

Expected: FAIL because `language-toggle.tsx` does not exist.

- [ ] **Step 3: Implement LanguageToggle**

Create `frontend/src/components/i18n/language-toggle.tsx`:

```tsx
'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type LanguageToggleProps = {
  className?: string;
};

export function LanguageToggle({ className }: LanguageToggleProps) {
  const locale = useLocale();
  const t = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const nextLocale = locale === 'ko' ? 'en' : 'ko';
  const query = searchParams.toString();
  const href = query ? `${pathname}?${query}` : pathname;

  return (
    <button
      type="button"
      aria-label={t('languageToggleLabel')}
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          router.replace(href, { locale: nextLocale });
        });
      }}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-border bg-white/65 p-1 text-xs font-black text-muted-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-white disabled:opacity-60',
        className,
      )}
    >
      <span
        className={cn(
          'rounded-full px-2 py-1 transition-colors',
          locale === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
        )}
      >
        EN
      </span>
      <span
        className={cn(
          'rounded-full px-2 py-1 transition-colors',
          locale === 'ko' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
        )}
      >
        KO
      </span>
    </button>
  );
}
```

- [ ] **Step 4: Run the toggle test**

Run:

```bash
npm test -- src/components/i18n/language-toggle.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit if commits are approved for this execution**

Run only after explicit commit approval:

```bash
git add frontend/src/components/i18n frontend/src/test/render-with-intl.tsx
git commit -m "feat(i18n): add language toggle"
```

## Task 5: Localize Shared Navigation And Shell

**Files:**
- Modify: `frontend/src/components/layout/header.tsx`
- Modify: `frontend/src/components/layout/sidebar.tsx`
- Modify: `frontend/src/components/layout/sidebar-escrow-balance.tsx`
- Modify: `frontend/src/components/layout/sidebar-job-seek-toggle.tsx`
- Modify: `frontend/src/components/layout/sidebar-seeker-earnings.tsx`
- Modify: `frontend/src/components/layout/AgentActivityStream.tsx`
- Modify: `frontend/src/components/layout/AgentStatusIndicator.tsx`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ko.json`

- [ ] **Step 1: Expand shared messages**

Add these namespaces to both message files.

English:

```json
{
  "shell": {
    "roleSeeker": "Seeker",
    "roleEmployer": "Employer",
    "jobSeekMode": "Job Seek Mode",
    "jobSeekConfirm": "AI will match you with jobs and negotiate on your behalf.",
    "activate": "Activate",
    "escrow": "Escrow",
    "views": "views",
    "aiActivity": "AI Activity",
    "agentIdle": "Agent ready",
    "agentAnalyzing": "Analyzing profile",
    "agentNegotiating": "Negotiating",
    "agentWaiting": "Waiting for updates"
  }
}
```

Korean:

```json
{
  "shell": {
    "roleSeeker": "구직자",
    "roleEmployer": "채용 담당자",
    "jobSeekMode": "구직 모드",
    "jobSeekConfirm": "AI가 일자리를 매칭하고 당신을 대신해 협상합니다.",
    "activate": "활성화",
    "escrow": "에스크로",
    "views": "조회",
    "aiActivity": "AI 활동",
    "agentIdle": "에이전트 준비됨",
    "agentAnalyzing": "프로필 분석 중",
    "agentNegotiating": "협상 중",
    "agentWaiting": "업데이트 대기 중"
  }
}
```

When editing JSON, merge these keys into the existing root object instead of creating a second root object.

- [ ] **Step 2: Update sidebar links**

In `frontend/src/components/layout/sidebar.tsx`:

- Replace `next/link` import with `Link` from `@/i18n/navigation`.
- Replace static link labels with translation keys.
- Keep `href` values as internal paths without locale prefix, e.g. `/dashboard/seeker`.

Use this shape:

```tsx
const seekerLinks = [
  { href: '/dashboard/seeker', labelKey: 'dashboard', icon: 'dashboard', neonColor: '' },
  { href: '/datasource', labelKey: 'datasource', icon: 'diamond', neonColor: '#0891b2' },
  { href: '/negotiations', labelKey: 'negotiations', icon: 'handshake', neonColor: '#be185d' },
];
```

Inside the component:

```tsx
const tNav = useTranslations('nav');
```

Render:

```tsx
{tNav(link.labelKey)}
```

- [ ] **Step 3: Update header**

In `frontend/src/components/layout/header.tsx`:

- Import `useTranslations` from `next-intl`.
- Import `useRouter` from `@/i18n/navigation`.
- Import `LanguageToggle` from `@/components/i18n/language-toggle`.
- Translate role labels and logout.
- Render `LanguageToggle` near the agent status/account controls.

The translated role block should use:

```tsx
const tShell = useTranslations('shell');
const tNav = useTranslations('nav');
```

```tsx
{user.role === 'SEEKER' ? tShell('roleSeeker') : tShell('roleEmployer')}
```

Logout label:

```tsx
<span className="hidden sm:inline">{tNav('logout')}</span>
```

- [ ] **Step 4: Update shell helper components**

Translate static copy in sidebar cards and agent widgets using `useTranslations('shell')`.

- [ ] **Step 5: Run shared shell tests/build check**

Run:

```bash
npm test -- src/components/dashboard/job-seeking-toggle.test.tsx
npm run build
```

Expected: tests pass; build may still reveal untranslated pages but should not fail due to navigation imports.

- [ ] **Step 6: Commit if commits are approved for this execution**

Run only after explicit commit approval:

```bash
git add frontend/messages frontend/src/components/layout frontend/src/components/i18n
git commit -m "feat(i18n): localize shared app shell"
```

## Task 6: Localize Public Landing And Auth Pages

**Files:**
- Modify: `frontend/src/app/[locale]/page.tsx`
- Modify: `frontend/src/app/[locale]/login/page.tsx`
- Modify: `frontend/src/app/[locale]/signup/page.tsx`
- Modify: `frontend/src/app/[locale]/login/page.test.tsx`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ko.json`

- [ ] **Step 1: Add public/auth message namespaces**

Add semantic keys under `landing` and `auth` for every static string in the landing, login, and signup pages. Use this minimum base and add every other static string encountered in those three files.

English base:

```json
{
  "landing": {
    "dashboard": "Dashboard",
    "heroEyebrow": "Proof-backed AI career agents",
    "heroTitle": "Let AI negotiate your next opportunity with verified career evidence.",
    "heroDescription": "TalentTee connects career proof, market intelligence, autonomous negotiation, and on-chain agreements in one global hiring workspace.",
    "startAsSeeker": "Start as Seeker",
    "startAsEmployer": "Hire with TalentTee"
  },
  "auth": {
    "loginTitle": "Welcome back",
    "loginDescription": "Connect your wallet and continue to your TalentTee workspace.",
    "signupTitle": "Create your TalentTee account",
    "signupDescription": "Choose how you want to use TalentTee.",
    "continueAsSeeker": "Continue as Seeker",
    "continueAsEmployer": "Continue as Employer"
  }
}
```

Korean base:

```json
{
  "landing": {
    "dashboard": "대시보드",
    "heroEyebrow": "증거 기반 AI 커리어 에이전트",
    "heroTitle": "검증된 커리어 증거로 다음 기회를 AI가 협상하게 하세요.",
    "heroDescription": "TalentTee는 커리어 증거, 시장 인텔리전스, 자율 협상, 온체인 계약을 하나의 글로벌 채용 워크스페이스로 연결합니다.",
    "startAsSeeker": "구직자로 시작",
    "startAsEmployer": "TalentTee로 채용"
  },
  "auth": {
    "loginTitle": "다시 오신 것을 환영합니다",
    "loginDescription": "지갑을 연결하고 TalentTee 워크스페이스로 이동하세요.",
    "signupTitle": "TalentTee 계정 만들기",
    "signupDescription": "TalentTee를 어떻게 사용할지 선택하세요.",
    "continueAsSeeker": "구직자로 계속",
    "continueAsEmployer": "채용 담당자로 계속"
  }
}
```

- [ ] **Step 2: Update landing page navigation imports**

In `frontend/src/app/[locale]/page.tsx`:

- Replace `next/link` with `Link` from `@/i18n/navigation`.
- Replace `useRouter` from `next/navigation` with `useRouter` from `@/i18n/navigation`.
- Add `useTranslations` from `next-intl`.
- Add `LanguageToggle` in the public header.

- [ ] **Step 3: Replace landing static arrays**

Move `proofCards` and `steps` inside `LandingPage` so labels can call `t(...)`:

```tsx
const t = useTranslations('landing');

const proofCards = [
  {
    icon: 'verified_user',
    title: t('proofCards.verified.title'),
    description: t('proofCards.verified.description'),
    accent: '#0891b2',
  },
];
```

Add corresponding complete keys to both message files for each card/step in the current file.

- [ ] **Step 4: Update login/signup pages**

Replace static UI strings in login/signup with `useTranslations('auth')` and `useTranslations('nav')`.

Programmatic navigation should use locale-aware router paths:

```tsx
router.push('/dashboard/seeker');
```

Do not include `/en` or `/ko` manually; the i18n router handles locale prefixes.

- [ ] **Step 5: Update login test for localized rendering**

In `frontend/src/app/[locale]/login/page.test.tsx`, assert at least one Korean label:

```tsx
renderWithIntl(<LoginPage />, { locale: 'ko' });
expect(screen.getByText('다시 오신 것을 환영합니다')).toBeInTheDocument();
```

- [ ] **Step 6: Run public/auth tests**

Run:

```bash
npm test -- 'src/app/[locale]/login/page.test.tsx'
npm run build
```

Expected: login test and build pass.

- [ ] **Step 7: Commit if commits are approved for this execution**

Run only after explicit commit approval:

```bash
git add frontend/messages 'frontend/src/app/[locale]/page.tsx' 'frontend/src/app/[locale]/login' 'frontend/src/app/[locale]/signup'
git commit -m "feat(i18n): localize public auth pages"
```

## Task 7: Localize Datasource And Dashboard UI

**Files:**
- Modify: `frontend/src/app/[locale]/datasource/page.tsx`
- Modify: `frontend/src/app/[locale]/dashboard/seeker/page.tsx`
- Modify: `frontend/src/app/[locale]/dashboard/employer/page.tsx`
- Modify: `frontend/src/components/dashboard/*.tsx`
- Modify: `frontend/src/components/datasource/*.tsx`
- Modify: datasource/dashboard tests under `frontend/src/app/[locale]/...`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ko.json`

- [ ] **Step 1: Add message namespaces**

Add `dashboard` and `datasource` namespaces. Include every static UI string from the listed files.

Required base keys:

English:

```json
{
  "dashboard": {
    "seekerTitle": "Seeker Dashboard",
    "employerTitle": "Employer Dashboard",
    "marketValue": "Market Value",
    "resumeSummary": "Resume Summary",
    "matches": "Matches",
    "negotiations": "Negotiations",
    "availableBalance": "Available Balance"
  },
  "datasource": {
    "eyebrow": "Evidence pipeline",
    "title": "My Value",
    "description": "Connect verified data sources and turn them into negotiation leverage.",
    "generateAnalysis": "Generate Analysis",
    "generationProgress": "Generation Progress",
    "connected": "Connected",
    "notConnected": "Not connected",
    "manageRepositories": "Manage repositories",
    "resyncAll": "Resync All",
    "aiSummary": "AI Summary",
    "estimatedMarketValue": "Estimated Market Value"
  }
}
```

Korean:

```json
{
  "dashboard": {
    "seekerTitle": "구직자 대시보드",
    "employerTitle": "채용 담당자 대시보드",
    "marketValue": "시장 가치",
    "resumeSummary": "이력 요약",
    "matches": "매칭",
    "negotiations": "협상",
    "availableBalance": "사용 가능 잔액"
  },
  "datasource": {
    "eyebrow": "증거 파이프라인",
    "title": "나의 가치",
    "description": "검증된 데이터 소스를 연결하고 협상에 활용할 근거로 전환하세요.",
    "generateAnalysis": "분석 생성",
    "generationProgress": "생성 진행 상황",
    "connected": "연결됨",
    "notConnected": "연결되지 않음",
    "manageRepositories": "저장소 관리",
    "resyncAll": "전체 동기화",
    "aiSummary": "AI 요약",
    "estimatedMarketValue": "예상 시장 가치"
  }
}
```

- [ ] **Step 2: Convert datasource page and dialogs**

Replace static UI copy with `useTranslations('datasource')`.

Keep these values untranslated:

- Provider IDs: `GITHUB`, `SLACK`, `DISCORD`, `GOV24`, `PDF`.
- Repo names, repo descriptions, languages, topics, stars.
- API-provided resume content.

- [ ] **Step 3: Convert dashboard pages/components**

Replace static UI copy with `useTranslations('dashboard')`, `useTranslations('nav')`, or `useTranslations('common')`.

Keep dynamic user, job, match, balance, and API values untranslated.

- [ ] **Step 4: Update datasource/dashboard tests**

Use `renderWithIntl` in tests for components/pages that now call `useTranslations`.

Example replacement:

```tsx
renderWithIntl(<DatasourcePage />);
```

Add one Korean assertion in datasource test:

```tsx
renderWithIntl(<DatasourcePage />, { locale: 'ko' });
expect(await screen.findByText('나의 가치')).toBeInTheDocument();
```

- [ ] **Step 5: Run regression tests**

Run:

```bash
npm test -- 'src/app/[locale]/datasource/page.test.tsx' src/components/datasource/github-connect-dialog.test.tsx 'src/app/[locale]/dashboard/seeker/page.test.tsx' 'src/app/[locale]/dashboard/employer/page.test.tsx'
```

Expected: PASS.

- [ ] **Step 6: Commit if commits are approved for this execution**

Run only after explicit commit approval:

```bash
git add frontend/messages 'frontend/src/app/[locale]/datasource' 'frontend/src/app/[locale]/dashboard' frontend/src/components/dashboard frontend/src/components/datasource
git commit -m "feat(i18n): localize datasource and dashboards"
```

## Task 8: Localize Jobs, Escrow, And Negotiation UI

**Files:**
- Modify: `frontend/src/app/[locale]/jobs/page.tsx`
- Modify: `frontend/src/app/[locale]/jobs/create/page.tsx`
- Modify: `frontend/src/app/[locale]/escrow/page.tsx`
- Modify: `frontend/src/app/[locale]/negotiations/page.tsx`
- Modify: `frontend/src/app/[locale]/negotiation/[sessionId]/page.tsx`
- Modify: `frontend/src/app/[locale]/negotiation/[sessionId]/agree/page.tsx`
- Modify: `frontend/src/app/[locale]/negotiation/[sessionId]/history/page.tsx`
- Modify: `frontend/src/components/negotiation/*.tsx`
- Modify: associated tests under `frontend/src/app/[locale]/...`
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ko.json`

- [ ] **Step 1: Add message namespaces**

Add `jobs`, `escrow`, `negotiations`, and `agreement` namespaces. Include every static UI string from the listed files.

Required base keys:

English:

```json
{
  "jobs": {
    "title": "Job Postings",
    "createTitle": "Create Job",
    "newChat": "New Chat",
    "send": "Send",
    "publish": "Publish",
    "aiRecommend": "AI Recommend"
  },
  "escrow": {
    "title": "Escrow",
    "availableBalance": "Available Balance",
    "deposit": "Deposit",
    "paymentHistory": "Payment History",
    "agentKeyConfigured": "Agent Key: Configured",
    "agentKeyNotSet": "Agent Key: Not Set"
  },
  "negotiations": {
    "title": "Negotiations",
    "inProgress": "In Progress",
    "agreed": "Agreed",
    "failed": "Failed",
    "monitor": "Monitor",
    "reviewAndApprove": "Review & Approve"
  },
  "agreement": {
    "loading": "Loading agreement...",
    "title": "Agreement Reached",
    "accept": "Accept Proposal & Record On-Chain",
    "reject": "Reject",
    "agreementRejected": "Agreement Rejected",
    "agreementFinalized": "Agreement Finalized",
    "onChainVerification": "On-Chain Verification"
  }
}
```

Korean:

```json
{
  "jobs": {
    "title": "채용 공고",
    "createTitle": "채용 공고 만들기",
    "newChat": "새 채팅",
    "send": "전송",
    "publish": "게시",
    "aiRecommend": "AI 추천"
  },
  "escrow": {
    "title": "에스크로",
    "availableBalance": "사용 가능 잔액",
    "deposit": "예치",
    "paymentHistory": "결제 내역",
    "agentKeyConfigured": "에이전트 키: 설정됨",
    "agentKeyNotSet": "에이전트 키: 미설정"
  },
  "negotiations": {
    "title": "협상",
    "inProgress": "진행 중",
    "agreed": "합의됨",
    "failed": "실패",
    "monitor": "모니터링",
    "reviewAndApprove": "검토 및 승인"
  },
  "agreement": {
    "loading": "합의서를 불러오는 중...",
    "title": "합의 도달",
    "accept": "제안 수락 및 온체인 기록",
    "reject": "거절",
    "agreementRejected": "합의 거절됨",
    "agreementFinalized": "합의 완료",
    "onChainVerification": "온체인 검증"
  }
}
```

- [ ] **Step 2: Convert job pages**

Use `useTranslations('jobs')` for static labels. Keep AI/backend-generated job descriptions and chat content unchanged.

- [ ] **Step 3: Convert escrow page**

Use `useTranslations('escrow')` for headings, buttons, and labels. Keep NEAR amounts, account IDs, and transaction hashes unchanged.

- [ ] **Step 4: Convert negotiation list/detail pages**

Use `useTranslations('negotiations')` and `useTranslations('agreement')`. Keep proposal values, names, salary numbers, dates from backend, and reasoning text unchanged unless it is static UI shell copy.

- [ ] **Step 5: Update tests**

Use `renderWithIntl` in each moved test that renders a translated component.

Add Korean assertions:

```tsx
renderWithIntl(<AgreementPage />, { locale: 'ko' });
expect(await screen.findByText('합의 도달')).toBeInTheDocument();
```

```tsx
renderWithIntl(<EscrowPage />, { locale: 'ko' });
expect(await screen.findByText('사용 가능 잔액')).toBeInTheDocument();
```

- [ ] **Step 6: Run product-flow tests**

Run:

```bash
npm test -- 'src/app/[locale]/negotiations/page.test.tsx' 'src/app/[locale]/negotiation/[sessionId]/page.test.tsx' 'src/app/[locale]/negotiation/[sessionId]/agree/page.test.tsx' 'src/app/[locale]/jobs/create/page.test.tsx' 'src/app/[locale]/escrow/page.test.tsx'
```

Expected: PASS.

- [ ] **Step 7: Commit if commits are approved for this execution**

Run only after explicit commit approval:

```bash
git add frontend/messages 'frontend/src/app/[locale]/jobs' 'frontend/src/app/[locale]/escrow' 'frontend/src/app/[locale]/negotiation' 'frontend/src/app/[locale]/negotiations' frontend/src/components/negotiation
git commit -m "feat(i18n): localize hiring and negotiation flows"
```

## Task 9: Final Locale Coverage Sweep

**Files:**
- Modify: any remaining `frontend/src/**/*.tsx` files with static user-facing English copy.
- Modify: `frontend/messages/en.json`
- Modify: `frontend/messages/ko.json`

- [ ] **Step 1: Search for remaining hardcoded UI copy**

Use Grep for common remaining English UI words in TSX files:

```text
Dashboard|Loading|Connect|Disconnect|Cancel|Save|Create|Negotiation|Agreement|Escrow|Salary|Market|Profile|Upload|Generate|Reject|Accept|Publish|Retry|Error|Success
```

Expected: matches should either be translated or be excluded dynamic/API/test data.

- [ ] **Step 2: Classify each match**

For every match, choose one:

- Translate through `useTranslations`.
- Leave unchanged because it is an icon name, provider ID, route segment, test fixture, code identifier, API value, or programming language name.

- [ ] **Step 3: Add missing translation keys**

Add any missing keys to both `messages/en.json` and `messages/ko.json` under the existing namespace structure.

- [ ] **Step 4: Run JSON validity check**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); JSON.parse(require('fs').readFileSync('messages/ko.json','utf8')); console.log('messages ok')"
```

Expected: prints `messages ok`.

- [ ] **Step 5: Run all targeted regression tests**

Run:

```bash
npm test -- 'src/app/[locale]/datasource/page.test.tsx' src/components/datasource/github-connect-dialog.test.tsx src/lib/api.real.test.ts
npm test -- 'src/app/[locale]/dashboard/seeker/page.test.tsx' 'src/app/[locale]/dashboard/employer/page.test.tsx' 'src/app/[locale]/login/page.test.tsx'
npm test -- 'src/app/[locale]/negotiations/page.test.tsx' 'src/app/[locale]/negotiation/[sessionId]/page.test.tsx' 'src/app/[locale]/negotiation/[sessionId]/agree/page.test.tsx' 'src/app/[locale]/jobs/create/page.test.tsx' 'src/app/[locale]/escrow/page.test.tsx'
```

Expected: PASS.

- [ ] **Step 6: Run build**

Run:

```bash
npm run build
```

Expected: PASS. The existing root `.env` warning may still appear and is not part of this feature.

- [ ] **Step 7: Run route smoke checks against local server**

With the frontend dev server running, check:

```bash
curl -I http://localhost:3000/en
curl -I http://localhost:3000/ko
curl -I http://localhost:3000/en/datasource
curl -I http://localhost:3000/ko/datasource
curl -I http://localhost:3000/en/dashboard/seeker
curl -I http://localhost:3000/ko/dashboard/seeker
curl -I http://localhost:3000/en/negotiation/session-2/agree
curl -I http://localhost:3000/ko/negotiation/session-2/agree
```

Expected: localized routes return `200` or expected auth/client-rendered shell responses.

- [ ] **Step 8: Check worktree and whitespace**

Run:

```bash
git diff --check
git status --short
```

Expected: `git diff --check` has no output. `git status --short` should not include `.planning/STATE.md` or `backend/node_modules/.package-lock.json` in staged changes.

- [ ] **Step 9: Commit if commits are approved for this execution**

Run only after explicit commit approval:

```bash
git add frontend/package.json frontend/package-lock.json frontend/next.config.ts frontend/messages frontend/src
git commit -m "feat(i18n): complete English Korean UI localization"
```

## Task 10: Completion Notes

**Files:**
- Modify: `docs/superpowers/specs/2026-05-04-next-intl-locale-routing-design.md` only if implementation reveals a necessary design correction.
- Modify: `docs/superpowers/plans/2026-05-04-next-intl-locale-routing.md` only to check off completed tasks during execution.

- [ ] **Step 1: Record deviations**

If implementation required a material deviation from the spec, add a short `Implementation Notes` section to the spec:

```md
## Implementation Notes

- Next.js 16 required `src/proxy.ts` rather than `src/middleware.ts`; the implementation follows official next-intl routing docs for Next 16.
```

- [ ] **Step 2: Final verification summary**

Before claiming completion, include fresh evidence from:

```bash
npm run build
git diff --check
```

Also include the exact targeted test commands that passed.

- [ ] **Step 3: Commit docs if commits are approved for this execution**

Run only after explicit commit approval:

```bash
git add docs/superpowers/specs/2026-05-04-next-intl-locale-routing-design.md docs/superpowers/plans/2026-05-04-next-intl-locale-routing.md
git commit -m "docs(i18n): document locale routing rollout"
```

## Self-Review Checklist

- Spec coverage: route locales, default locale, language toggle, UI translation scope, metadata, formatting, tests, and non-goals are each represented in tasks.
- Dependency path: `next-intl` setup follows official App Router and routing docs.
- Next 16 compatibility: plan uses `src/proxy.ts`, not `middleware.ts`.
- Route movement: all current app page directories are accounted for.
- Tests: plan updates colocated tests after moving under `[locale]` and adds `renderWithIntl`.
- Risk control: backend APIs and external data are explicitly excluded.
- Git safety: commit steps are gated on explicit commit approval.
