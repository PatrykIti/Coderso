# TASK-359-03: Redacted Settings Cache Contract
# FileName: TASK-359-03_Redacted_Settings_Cache_Contract.md

**Priority:** High
**Category:** Admin Cache + Settings + Security
**Estimated Effort:** Large
**Dependencies:** TASK-359-01, TASK-359-02
**Status:** Done (2026-06-02)

---

## Overview

Add a redacted Settings cache contract for non-secret UX values so Settings
behaves like other admin resources without putting secrets into browser cache,
localStorage, debug payloads, or cross-tab events.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `core/admin/services/settingsClient.ts`
- `core/admin/services/siteSettingsClient.ts`
- `core/admin/ui/site/SiteSettingsPage.tsx`
- `core/admin/ui/settings/**`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| Settings cache/service module | Define cache keys, TTLs, redacted payload shape, cached wrappers, invalidation, and `cacheBus` broadcasts. |
| `core/admin/services/settingsClient.ts` | Add `getSettingsCached` or equivalent safe wrapper. |
| `core/admin/services/siteSettingsClient.ts` | Add `getSiteSettingsCached` and mutation invalidation. |
| `core/admin/ui/site/SiteSettingsPage.tsx` | Stop force-refetching pages/content types every mount when fresh cache exists. |
| Cache docs/tests | Add denylist scans and hydration/background revalidation coverage. |

## Implementation Pseudocode

```ts
type RedactedSettingsCache = {
  siteName: string;
  siteLocale: string;
  siteCacheTtlSeconds: number;
  assistantEnabled: boolean;
  securityConfigured: {
    botProtectionHasSiteKey: boolean;
    botProtectionConfigured: boolean;
  };
};

function toRedactedSettingsCache(payload: SettingsResponse): RedactedSettingsCache {
  return {
    siteName: String(payload["site.name"] ?? "Coderso"),
    siteLocale: String(payload["site.locale"] ?? "en"),
    siteCacheTtlSeconds: Number(payload["site.cacheTtlSeconds"] ?? 30),
    assistantEnabled: Boolean(payload["assistant.enabled"]),
    securityConfigured: {
      botProtectionHasSiteKey: Boolean(payload["security.botProtection.siteKey"]),
      botProtectionConfigured: Boolean(payload["security.botProtection.secretKey.configured"]),
    },
  };
}
```

Data flow:

- Settings reads normalize backend responses into redacted cache payloads.
- Safe settings hydrate immediately from cache and revalidate in background.
- Mutations update or invalidate the relevant cache keys and broadcast via
  `cacheBus`.
- Cross-tab events refresh non-dirty pages without overwriting dirty drafts.
- Sensitive sections can explicitly document no-cache where redaction is not
  safe.

Error handling:

- Cache parse failures discard only the invalid cache entry and fetch fresh.
- 403 refreshes permission snapshot and avoids writing forbidden payloads.
- Dirty forms ignore background revalidation until user saves/discards.
- Cache denylist scans fail tests on nested keys containing `password`,
  `secret`, `token`, `accessKey`, `connectionString`, `apiKey`, or provider
  credential names.

## Security Contract

- Endpoint visibility: unchanged internal settings endpoints.
- Auth model: authenticated admin session.
- RBAC: `settings:read` for cached reads; matching write permissions for
  invalidating mutations.
- CSRF: unchanged; writes require CSRF.
- Rate-limit bucket: `admin_read`/`admin_write` as source endpoints define.
- Reject unknown validation: unchanged endpoint schemas; cache normalizer
  rejects unknown unsafe fields by omission.
- Anti-abuse: internal session routes; no nonce, HMAC, or captcha.
- Secret handling: no SMTP password, S3/Azure keys, bot-protection secret,
  integration secrets, webhook secrets, API key secrets, tokens, or connection
  strings in cache/localStorage/debug payloads.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Cache unit tests for redacted payload normalization and nested secret
  denylist scanning.
- Vitest UI/client tests for cache hydration, background revalidation,
  mutation invalidation, `cacheBus` cross-tab refresh, and dirty-form
  non-overwrite.
- Request-budget regression for Settings transitions.
- Documentation check/update for `_docs/ADMIN_CACHE.md` and
  `_docs/ADMIN_CACHE_MAP.md`.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`
- `_docs/SECURITY_SPEC.md` if cache secret policy is clarified
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Safe Settings values hydrate from redacted cache and revalidate in background.
- Secrets never enter browser cache/localStorage/debug payloads.
- Mutations invalidate/update cache consistently.

## Completion Notes

- Added `core/admin/services/settingsCache.ts` as the redacted Settings cache
  owner with schema versioning, strict allowlist validation, TTL-backed
  memory/localStorage cache, and nested unsafe-key scanning.
- Added `settings:redacted` to the cache policy and wired
  `getSettingsCached()`, `getCachedSettings()`, `getSiteSettingsCached()`, and
  `getCachedSiteSettings()`.
- `updateSettings()` and `updateSiteSettings()` now prime `settings:redacted`
  from server responses and broadcast `update`; `updateSecuritySettings()`
  patches only boolean configured flags or invalidates when no safe cache
  exists.
- `AdminApp` hydrates global Settings from redacted cache when the current
  permission snapshot has `settings:read`, then revalidates through `/settings`.
- `SiteSettingsPage` hydrates Settings, pages, and content types from cache,
  stops force-refetching fresh selector caches on mount, responds to
  `settings:redacted` cacheBus events, and preserves dirty drafts on background
  refresh.
- `prefetchSettingsRoute()` warms `/settings` and `/settings/site` caches with
  `{ force: false }`; Site prefetch warms Settings plus pages/content types.
- Updated `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`,
  `_docs/SECURITY_SPEC.md`, the Settings report, the aggregate Admin UI report,
  and changelog 1049.

Validation:

- `bun run test:vitest -- tests/vitest/admin/settingsClient.test.ts tests/vitest/admin/siteSettingsClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/ui/site-settings.test.tsx tests/vitest/admin/adminApp.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/perf/admin-prefetch-budget.test.ts`
- `git diff --check`
- `bun run gates:coderso`
- Playwright UI pass `task-359-03-settings-cache`: first Site load
  `settings: 1`, `pages: 1`, `contentTypes: 1`, `authMe: 0`; cached
  General -> Site navigation `settings: 1`, `pages: 0`, `contentTypes: 0`,
  `authMe: 0`; `markerPreserved: true`, `unsafeSettingsCachePaths: []`, and
  dirty TTL draft preserved. Screenshot:
  `.tmp/task-359-03-settings-cache.png`.
