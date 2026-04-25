# TASK-209-01: Custom Screens List Data, Cache, and Enrichment
# FileName: TASK-209-01_Custom_Screens_List_Data_Cache_and_Enrichment.md

**Priority:** High
**Category:** Admin Cache + Coderso Custom Screens
**Estimated Effort:** Large
**Dependencies:** TASK-209, TASK-206, TASK-208
**Status:** To Do

---

## Overview

Prepare the Custom Screens list data layer for Pages-style list parity.

The current list can render cached screens, but the hook forces a full refresh on
ordinary mount and the list fetches content types separately with `force: true`.
That is not the shared admin cache behavior used by Pages. This round aligns
Custom Screens cache hydration, cache-bus refreshes, prefetch warmup, and
content-type label enrichment before the table/actions work lands.

The client cache also needs to match the current cache contract: because
`customScreensClient` keeps module-level list memory, it must use the shared
`createMemoryBackedLocalCache` envelope so the list TTL applies to both memory
and localStorage.

Because the list view model displays content-type names, this round also owns
the `contentTypes:list` refresh hook for the label projection. Content type
records stay owned by `contentTypesClient`; Custom Screens should not duplicate
or persist the labels.

## Sub-Tasks

- [ ] TASK-209-01-01: Custom Screens Mount Refresh and Prefetch Parity
- [ ] TASK-209-01-02: Content Type Label Enrichment and List View Model

## Files to Change

- `core/admin/ui/custom-screens/hooks/useCustomScreens.ts`
- `core/admin/services/customScreensClient.ts`
- `core/admin/services/contentTypesClient.ts` only if the label projection
  cannot otherwise prove TTL-respected content-type reads from existing cached
  helpers.
- `core/admin/utils/adminPrefetch.ts`
- new `tests/vitest/admin/customScreensClient.test.ts` or equivalent focused
  cache-client suite.
- `tests/vitest/admin/adminPrefetch.test.ts`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- new mounted Custom Screens list suite if hook behavior cannot be proven by
  static render tests.
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`

## Security Contract

- Visibility: internal admin UI/client cache only.
- Auth model: unchanged admin session/admin API key model.
- RBAC: `content:read` for `GET /custom-screens` and content type labels.
- CSRF: no writes in this round.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: no new payloads or route query parameters.
- Anti-abuse: no public endpoint, no nonce/HMAC/reCAPTCHA changes.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPrefetch.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/customScreensClient.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx`
- New focused hook/list test if mount refresh options or content-type
  enrichment cannot be asserted in the existing suite.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Custom Screens cache hydrate/background-refresh behavior matches the Pages
   list contract.
2. Custom Screens list memory cannot outlive `cacheTtlMs.list`; expired memory
   is cleared before storage/network fallback.
3. Prefetch for `/admin/coderso/custom-screens` warms the data needed by the
   first screen without a second foreground content-type label load.
4. Cache bus events still refresh sidebar shortcuts, list rows, and
   content-type label projections.
5. Content-type labels used by the list do not come from stale module memory
   that outlives `cacheTtlMs.list`.
6. No API route or schema changes are introduced by this data preparation round.
