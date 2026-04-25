# TASK-209-01-01: Custom Screens Mount Refresh and Prefetch Parity
# FileName: TASK-209-01-01_Custom_Screens_Mount_Refresh_and_Prefetch_Parity.md

**Priority:** High
**Category:** Admin Cache + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-209-01
**Status:** To Do

---

## Overview

Make `useCustomScreens` follow the same cache-present/background and
cache-missing/foreground mount policy as `PageListPage`.

The current hook calls `refresh(true)` on mount even when
`getCachedCustomScreens()` returns rows. That creates unnecessary foreground
network churn and diverges from `_docs/ADMIN_CACHE.md`. The list parity work
needs a deterministic hook contract before filters, pagination, and selection
are added.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Use the shared cache refresh helpers instead of adding another resource-only
  copy. `core/admin/utils/cacheRefresh.ts` already exposes the mount policy:

```ts
resolveListMountRefreshOptions(hasInitialCache)
```

- A resource-local wrapper is acceptable only if the UI tests need a named
  Custom Screens export; it should delegate to `resolveListMountRefreshOptions`.
- Change `useCustomScreens.refresh` from `(force?: boolean)` to an options
  object compatible with the current admin cache pattern:

```ts
refresh({ force?: boolean; background?: boolean })
```

- Use `resolveCacheRefreshBackground` so a background refresh does not flip the
  list back into the foreground loading placeholder after cached rows are shown.
- Keep `cacheKeys.customScreensList` subscription, but refresh with
  `{ force: true, background: true }` on cache-bus events.
- Migrate `customScreensClient` list caching to `createMemoryBackedLocalCache`
  like Pages/Posts/Menus. The current module-level `cachedScreens` value can
  outlive the shared TTL and hide expired or externally patched localStorage
  data, so this is part of the fix rather than an optional audit.
- Add cache tests proving:
  - fresh module memory still hydrates the list immediately;
  - expired module memory is cleared before storage/network fallback;
  - storage changes from another cache owner are visible after the in-memory
    envelope expires or after the cache-bus path forces a refresh.
- Update `core/admin/utils/adminPrefetch.ts` so the Custom Screens route warms
  the first-screen data:

```ts
{
  match: "/coderso/custom-screens",
  run: () =>
    Promise.all([
      listCustomScreensCached(prefetchWarmupOptions),
      listContentTypesCached(prefetchWarmupOptions),
    ]),
}
```

- Add or update `adminPrefetch` tests proving both warmups run for
  `/admin/coderso/custom-screens`. Mirror the current entries prefetch test by
  mocking `listCustomScreensCached` and `listContentTypesCached`, then assert
  both receive `prefetchWarmupOptions`.
- If the content-type cached client migration lands in this data round, keep the
  Custom Screens prefetch test paired with `contentTypesClient` TTL coverage so
  the warmed label data cannot come from stale module memory.

## Security Contract

- Visibility: internal admin list read path only.
- Auth model: existing authenticated admin session/admin API key model.
- RBAC: unchanged `content:read`.
- CSRF: no write path.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: no route query or body changes.
- Anti-abuse: no public path or destructive action changes.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/customScreensClient.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/contentTypesClient.test.ts`
  if the shared content-type list cache is migrated in this round.
- If the content-type client migration lands here, run shared consumer smoke
  tests that hydrate from `contentTypesClient`:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/content-type-list-parity.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/entry-list-wave.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPrefetch.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/cacheRefresh.test.ts` if the shared helper or a delegating wrapper changes.
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx`
- Focused test for the mount refresh policy through the shared helper or a
  delegating Custom Screens wrapper.

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md` only if cached APIs or owner notes change.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Cached Custom Screens render without a foreground loading placeholder.
2. Mount without cache still performs a foreground list load.
3. Cache-bus invalidation refreshes in the background after hydration.
4. Custom Screens prefetch warms both screens and content types.
5. Expired module-level Custom Screens list memory cannot bypass
   `cacheTtlMs.list`.
