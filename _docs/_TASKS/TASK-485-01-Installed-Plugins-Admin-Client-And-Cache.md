# TASK-485-01: Installed-Plugins Admin Client & Cache Contract
# FileName: TASK-485-01-Installed-Plugins-Admin-Client-And-Cache.md

**Parent Task:** TASK-485
**Priority:** High
**Category:** Store / Plugins / Admin Client
**Estimated Effort:** Medium
**Dependencies:** None (consumes the existing `GET /plugins` route).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

`PluginStorePage` currently seeds its "Installed" tab from a hardcoded
`installedSeed: InstalledPlugin[]` array — there is **no client** that calls the
real `GET /plugins` route (`core/server/routes/pluginsRoutes.ts`, returns
`{ items: [...] }` with `name/version/apiVersion/coreVersion/enabled/status/
permissions/installedAt/updatedAt/lastError/errorCount/contributions`).

This subtask delivers a real `pluginsClient` admin service that fetches installed
plugins, maps the server payload to the existing `InstalledPlugin` view-model
(`core/admin/ui/plugins/types.ts`), and participates in the shared admin cache
layer (`_docs/ADMIN_CACHE.md`): a `plugins:installed:list` cache key with TTL,
hydrate-then-revalidate, and cacheBus invalidation so lifecycle writes (subtask
03) and other tabs refresh consistently.

This is **pure TS / admin-service** work (no runtime kernel, no DB) →
**Vitest lane**.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-485-01-L01 | `pluginsClient` + server→view-model mapping + cache key/TTL | ⏳ To Do |
| TASK-485-01-L02 | CacheBus invalidation + mount hydrate/revalidate wiring | ⏳ To Do |
| TASK-485-01-L03 | Client & cache tests (Vitest) | ⏳ To Do |

---

## Dependencies

- Existing `GET /plugins` route (`plugins:read`) — already shipped.
- Admin cache infra: `core/admin/services/apiClient.ts` (`apiRequest`),
  `core/admin/services/cachePolicy.ts` (`cacheKeys`, `cacheTtlMs`),
  `core/admin/utils/cacheBus.ts` (`broadcastCacheEvent`),
  `core/admin/utils/storageCache.ts` (`createMemoryBackedLocalCache`),
  `core/admin/utils/cacheRefresh.ts` (`resolveListMountRefreshOptions`).

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- Vitest: `tests/vitest/admin/pluginsClient.test.ts` (mapping, cache hydrate,
  TTL/force, cacheBus invalidate). No Bun lane (no runtime/DB dependency).
