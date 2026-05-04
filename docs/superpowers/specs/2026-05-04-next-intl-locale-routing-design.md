# Next-Intl Locale Routing Design

## Context

TalentTee currently has English UI copy embedded directly in React components. The root layout already sets `lang="ko"`, but there is no real i18n system, locale-aware routing, translation dictionary, or language switcher.

The product direction is global-first, so the app should start with a scalable internationalization structure instead of a short-lived custom dictionary.

## Goal

Add full UI language support for English and Korean using `next-intl`, with route-level locales and an in-app language toggle.

Users should be able to use the same product flow in either English or Korean:

- `/en/...` for English.
- `/ko/...` for Korean.
- A visible toggle switches the current page between English and Korean.
- Static UI text across the frontend is translated.

## Non-Goals

- Do not translate user-generated data, GitHub repository names, programming language names, blockchain addresses, transaction hashes, or externally sourced API content.
- Do not change backend APIs for this phase.
- Do not introduce AI-generated translation at runtime.
- Do not redesign the Light Cyberglass visual system.
- Do not add more languages beyond English and Korean in this phase.

## Recommended Approach

Use `next-intl` from the start with locale segments in the App Router.

The app will use:

- `src/i18n/routing.ts` for supported locales and navigation helpers.
- `src/i18n/request.ts` for request-time message loading.
- `src/proxy.ts` for locale detection and route matching on Next.js 16.
- `messages/en.json` and `messages/ko.json` for translation strings.
- `app/[locale]/layout.tsx` as the locale-aware root layout and provider boundary.
- `app/[locale]/...` routes for localized pages.

English should be the default locale for a global product. Korean should be available as an equal first-class locale.

## Route Behavior

Supported locales:

- `en`
- `ko`

Default locale:

- `en`

Expected behavior:

- `/en` renders the English landing page.
- `/ko` renders the Korean landing page.
- `/en/datasource` and `/ko/datasource` render the same feature in different UI languages.
- Bare paths such as `/datasource` redirect to a locale-prefixed path using `NEXT_LOCALE` cookie when available, otherwise `en`.
- Unknown locale segments should route to Next.js not-found handling.

## Language Switcher

Add a compact `LanguageToggle` component in the authenticated app header and on public auth/landing pages.

Behavior:

- Show the current locale and target locale clearly, such as `EN` / `KO`.
- Preserve the current path when switching languages.
- Preserve query string parameters.
- Update the locale cookie through normal `next-intl` navigation behavior.
- Keep the Light Cyberglass styling: rounded pill, white/glass surface, subtle cyan active state.

Example:

- Current URL: `/en/negotiation/session-2/agree?tab=terms`
- Toggle to Korean: `/ko/negotiation/session-2/agree?tab=terms`

## Translation Scope

Translate all static user-facing UI copy in `frontend/src`.

Included:

- Navigation labels.
- Page titles and subtitles.
- Buttons and links.
- Empty states.
- Loading states.
- Form labels and placeholders.
- Validation and error copy rendered in the frontend.
- Toast messages owned by frontend code.
- Modal titles, descriptions, and action labels.
- Dashboard cards and status labels.
- Negotiation, escrow, jobs, datasource, login, signup, landing, and analysis screens.

Excluded:

- Data returned from backend APIs.
- Dummy profile/resume content unless it is used as static UI shell copy.
- GitHub repo names, repo descriptions, programming language labels, topics, and usernames.
- NEAR account IDs, contract IDs, transaction hashes, and addresses.
- Material Symbol icon names.

## Message Structure

Use nested JSON namespaces that map to product areas:

- `common`
- `nav`
- `auth`
- `landing`
- `dashboard`
- `datasource`
- `jobs`
- `negotiations`
- `agreement`
- `escrow`
- `analysis`
- `errors`

Keep keys semantic, not copy-derived.

Example:

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "datasource": "My Value"
  },
  "common": {
    "loading": "Loading...",
    "cancel": "Cancel"
  }
}
```

## Component Pattern

Server components should use `getTranslations` when applicable.

Client components should use `useTranslations`.

Existing client-heavy pages can stay client components. Their hardcoded strings should be replaced with translation lookups without changing business logic.

Dynamic values should use interpolation:

```tsx
t('salaryRange', { min, max })
```

Avoid constructing translated sentences by concatenating fragments.

## Locale-Aware Links

Internal links should use `next-intl` navigation helpers instead of raw `next/link` when locale preservation matters.

Expected helpers:

- `Link`
- `useRouter`
- `usePathname`
- `redirect`

These helpers should come from the project i18n navigation module so links keep the active locale by default.

## Layout, Metadata, And HTML Lang

Move the current root layout responsibilities into `app/[locale]/layout.tsx` so the locale segment owns the `<html lang={locale}>` boundary. Do not nest a second `<html>` or `<body>` inside a child layout.

The locale-aware root layout should keep the existing fonts, global CSS import, providers, and offline banner behavior while setting the correct language attribute for each route.

Metadata should be localized for:

- App title.
- App description.

Initial metadata can use English and Korean equivalents from message files. More granular per-page SEO metadata can be added later.

## Formatting

Use `next-intl` formatting for values that are presented as product UI:

- Dates.
- Times.
- Numbers.
- Currency-like UI labels where appropriate.

Existing domain-specific formatting helpers such as `formatSalary` can remain if they are product-specific and already tested. They should not block the initial i18n rollout.

## Error Handling

If a translation key is missing during development, the failure should be visible rather than silently falling back to incorrect UI.

In production, `next-intl` default behavior is acceptable for this phase. Missing translations should be caught by tests and review before release.

## Testing Plan

Add or update tests to verify:

- Middleware redirects bare routes to a locale route.
- English and Korean routes render without crashing.
- Language toggle preserves the current route when switching locale.
- Core UI labels render in Korean on `/ko` routes.
- Existing feature tests still pass after providers and routing move under `[locale]`.

Targeted regression areas:

- Landing page.
- Login and signup.
- Dashboard seeker and employer pages.
- Datasource page and GitHub dialog.
- Jobs and job creation.
- Negotiations and agreement flow.
- Escrow page.

## Migration Strategy

1. Add `next-intl` dependency and project i18n configuration.
2. Introduce `[locale]` route structure and provider layout.
3. Add locale-aware navigation helpers and language toggle.
4. Move current pages under localized routing without changing product logic.
5. Replace static UI strings with translation keys, starting with shared layout and high-traffic pages.
6. Complete remaining frontend UI copy.
7. Run targeted tests and production build.

## Acceptance Criteria

- `/en` and `/ko` both render the app.
- Public and authenticated pages have a language toggle.
- Toggling languages preserves equivalent route and query parameters.
- Static UI copy across the frontend is available in English and Korean.
- Existing user flows continue to work.
- `npm test` targeted regressions pass for changed areas.
- `npm run build` passes.
- No backend API changes are required.
