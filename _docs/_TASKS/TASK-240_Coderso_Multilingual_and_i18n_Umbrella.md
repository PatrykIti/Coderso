# TASK-240: Coderso Multilingual and i18n Umbrella
# FileName: TASK-240_Coderso_Multilingual_and_i18n_Umbrella.md

**Priority:** High
**Category:** i18n + Runtime + CMS + Admin/UI
**Estimated Effort:** Very Large
**Dependencies:** TASK-046, TASK-054, TASK-054-06, TASK-054-07, TASK-054-17, TASK-055
**Status:** To Do

---

## Overview

Build first-class multilingual and i18n support for Coderso content, pages,
posts, widgets, listings, SEO metadata, navigation, and runtime routes. This
replaces the old planning stub `TASK-054-21`, which is now closed as superseded
by this umbrella.

The implementation must be schema-first and backward compatible. Existing
single-locale sites should continue rendering without migration surprises, while
new locale-aware content gains deterministic fallback, unique route handling,
translation linkage, cache invalidation, and editor workflows.

## Goals

- Let site owners configure default, enabled, and fallback locales.
- Support localized pages, posts, content entries, listing routes, slugs, SEO
  fields, and navigation labels.
- Preserve existing non-localized content and URLs unless a site explicitly
  enables localized routing.
- Add a language switcher widget and locale-aware navigation behavior.
- Keep admin i18n screens inside Advanced navigation with shared route,
  prefetch, cache, and theme-token contracts.

## Non-Goals

- Do not add automated machine translation in this umbrella.
- Do not change public routes for existing single-locale sites by default.
- Do not duplicate content type schemas per locale. Translation linkage should
  be data-level and schema-compatible.

## Sub-Tasks

- [ ] TASK-240-01: Locale Settings, DB Migrations, and Translation Link Model
- [ ] TASK-240-02: Locale Resolver, Runtime Routing, and Fallback Policy
- [ ] TASK-240-03: Localized Pages, Posts, Entries, Listings, and SEO Contracts
- [ ] TASK-240-04: Admin Translation UI, Cache, and Prefetch
- [ ] TASK-240-05: Language Switcher and Localized Navigation Widgets
- [ ] TASK-240-06: QA, Docs, Changelog, and Board Closure

## Files to Change

- `core/db/schema.ts`
- `core/db/migrations/*`
- `core/db/meta/*_snapshot.json`
- `core/db/meta/_journal.json`
- `core/services/i18n/*` (new owner for locale schemas, normalizers, resolver,
  fallback policy, translation links, and domain errors)
- `core/services/pages/*`
- `core/services/posts/*`
- `core/services/content/*`
- `core/services/listings/*`
- `core/server/publicSite.tsx`
- `core/server/routes/i18nRoutes.ts` (new internal admin routes)
- `core/server/routes/pagesRoutes.ts`
- `core/server/routes/postsRoutes.ts`
- `core/server/routes/contentRoutes.ts`
- `core/admin/ui/navigation/advancedModules.ts`
- `core/admin/utils/adminPaths.ts`
- `core/admin/utils/adminPrefetch.ts`
- `core/admin/ui/i18n/*` (new admin translation screens)
- `core/admin/services/i18nClient.ts` (new cached client wrapper)
- `core/admin/services/cacheKeys.ts`
- `core/admin/services/cacheBus.ts`
- `core/widgets/core/languageSwitcher.tsx`
- `core/widgets/core/navigation.tsx`
- `tests/unit/i18n/*`
- `tests/integration/routes/i18n*.test.ts`
- `tests/integration/runtime/i18n*.test.ts`
- `tests/vitest/ui/i18n*.test.tsx`
- `tests/vitest/widgets/languageSwitcher.test.tsx`

## Architecture

- `core/services/i18n/*` owns:
  - `localeSettingsSchema`,
  - `normalizeLocaleSettings`,
  - `normalizeLocaleCode`,
  - `resolveLocaleFromRequest`,
  - `resolveLocalizedSlug`,
  - `resolveFallbackChain`,
  - `linkTranslationGroup`,
  - machine-readable errors such as `i18n_locale_invalid`,
    `i18n_translation_not_found`, `i18n_slug_conflict`, and
    `i18n_fallback_loop`.
- Existing resource services must expose locale-aware methods without breaking
  current single-locale callers. Prefer additive overloads/options such as
  `{ locale, fallbackLocale, includeDrafts }` over destructive rewrites.
- Public route matching must be deterministic:
  - locale prefix mode is configured by settings,
  - default locale may be prefixless only when settings allow it,
  - slug uniqueness is scoped by resource kind and locale,
  - fallback rendering must never mask a published localized route conflict.
- Cache invalidation must be locale-aware. Mutating a localized page/post/entry
  should invalidate both the exact locale cache key and any fallback-dependent
  cache entries.

## Security Contract

- Visibility:
  - Internal/admin: `/admin/api/i18n/*` plus locale-aware extensions to
    existing admin resource routes.
  - Public: locale-aware runtime reads and language switcher links.
- Auth model:
  - Admin i18n settings and translation writes require existing admin session
    auth.
  - Public runtime locale reads remain anonymous reads unless the underlying
    resource is protected by another module.
- RBAC:
  - Locale settings require `settings:write`.
  - Translation writes use the existing resource permissions
    (`pages:write`, `content:write`, `posts:write`, etc.) plus any i18n-specific
    `i18n:manage` permission added by the implementation.
- CSRF:
  - All admin/internal writes require existing admin CSRF protection.
  - Public reads do not require CSRF.
- Rate-limit bucket:
  - Admin writes use existing admin buckets.
  - Public locale resolution uses normal public read behavior unless a new
    public write route is introduced, which must define its own bucket.
- Reject-unknown validation:
  - Locale settings, localized slug payloads, translation links, and resource
    locale updates must reject unknown fields through strict schemas.
- Anti-abuse:
  - Prevent locale fallback loops and unbounded fallback recursion.
  - Clamp locale list size and validate BCP-47-like locale codes through a
    deterministic allowlist/normalizer.
  - Do not let arbitrary locale prefixes bypass protected route, preview token,
    or content status checks.
- Secret handling:
  - No provider keys or privileged settings may be exposed in locale debug
    payloads, caches, or browser storage.

## Implementation Order

1. Add locale settings and translation-link DB migration artifacts first.
2. Implement pure i18n resolver/normalizer/fallback helpers without Bun or DB
   import-time coupling.
3. Extend page/post/content/listing services with locale-aware options and
   strict slug conflict checks.
4. Update public runtime route resolution and cache invalidation.
5. Add internal admin i18n routes, cached clients, Advanced nav, and prefetch.
6. Add admin translation UI and language switcher/localized navigation widgets.
7. Finish with docs, changelog, board closure, and full targeted validation.

## Implementation Pseudocode

```ts
export function resolveLocaleFromRequest(
  request: Request,
  settings: LocaleSettings
): LocaleResolution {
  const url = new URL(request.url);
  const firstSegment = getFirstPathSegment(url.pathname);
  const normalized = normalizeLocaleCode(firstSegment);

  if (normalized && settings.enabledLocales.includes(normalized)) {
    return {
      locale: normalized,
      pathWithoutLocale: stripFirstPathSegment(url.pathname),
      source: "path",
    };
  }

  return {
    locale: settings.defaultLocale,
    pathWithoutLocale: url.pathname,
    source: "default",
  };
}
```

```ts
export async function getLocalizedEntryBySlug(input: {
  typeSlug: string;
  slug: string;
  locale: string;
  fallbackLocale?: string;
}) {
  const exact = await getEntryBySlug({
    typeSlug: input.typeSlug,
    slug: input.slug,
    locale: input.locale,
  });
  if (exact) return { entry: exact, locale: input.locale, fallback: false };

  const fallbackChain = resolveFallbackChain(input.locale, input.fallbackLocale);
  for (const fallbackLocale of fallbackChain) {
    const fallback = await getEntryBySlug({
      typeSlug: input.typeSlug,
      slug: input.slug,
      locale: fallbackLocale,
    });
    if (fallback) return { entry: fallback, locale: fallbackLocale, fallback: true };
  }

  return null;
}
```

## Testing Requirements

- Unit:
  - locale code normalization and invalid-code rejection,
  - fallback chain determinism and loop prevention,
  - localized slug uniqueness,
  - translation-link grouping,
  - locale-aware cache-key helpers,
  - `mapI18nError` coverage.
- Bun route/runtime:
  - localized page/post/entry/listing route resolution,
  - default locale prefixless behavior,
  - fallback rendering and no-fallback 404,
  - preview token behavior under locale prefixes,
  - status/protected content checks are not bypassed by locale prefixes.
- Vitest admin/UI:
  - locale settings UI,
  - translation editor state,
  - localized slug/SEO controls,
  - cache hydration and dirty-state preservation,
  - language switcher widget editor states.
- Required commands:

```bash
bun --cwd core lint
bun --cwd core lint:types
bun run lint:repo:types
set -a && source .env && set +a && bun test tests/unit/i18n tests/integration/routes/i18n*.test.ts tests/integration/runtime/i18n*.test.ts
bun run test:vitest -- tests/vitest/ui/i18n*.test.tsx tests/vitest/widgets/languageSwitcher.test.tsx
git diff --check
```

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/PAGE_MODEL.md`
- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/SEARCH_SPEC.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Site owners can configure enabled/default/fallback locales.
2. Pages, posts, entries, listings, slugs, SEO fields, and navigation can be
   localized without breaking existing single-locale sites.
3. Runtime route resolution and fallback behavior are deterministic and covered
   by Bun tests.
4. Admin translation UI follows Advanced navigation, shared cache, route helper,
   theme-token, and dirty-state contracts.
5. Language switcher and localized navigation widgets work across pages, posts,
   and listing/detail routes.
6. DB migrations include SQL, snapshot, and journal artifacts.
7. Docs, changelog, and kanban board are synchronized at closure.
