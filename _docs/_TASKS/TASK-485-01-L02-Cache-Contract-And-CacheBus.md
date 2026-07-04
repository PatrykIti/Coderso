# TASK-485-01-L02: CacheBus invalidation + mount hydrate/revalidate wiring
# FileName: TASK-485-01-L02-Cache-Contract-And-CacheBus.md

**Parent Subtask:** TASK-485-01
**Priority:** High
**Category:** Store / Plugins / Admin Client
**Estimated Effort:** Small
**Dependencies:** TASK-485-01-L01 (`pluginsClient` + `installedPluginsList` key).
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Make the installed-plugins cache cross-tab/cross-write consistent:
  emit a cacheBus event whenever the installed list changes, expose an
  `invalidateInstalledPlugins()` helper that lifecycle writes (subtask 03) and the
  UI (subtask 04) call, and provide the mount hydrate-then-revalidate options so
  the list paints instantly from cache and refreshes in the background without a
  mount-force loop.
- **Owning module(s) to create-or-extend:**
  - **Extend** `core/admin/services/pluginsClient.ts` (add
    `invalidateInstalledPlugins()`, `subscribeInstalledPlugins()`, and a
    `getMountRefreshOptions()` wrapper over `resolveListMountRefreshOptions`).
  - **Reuse** `core/admin/utils/cacheBus.ts` (`broadcastCacheEvent`,
    `subscribeCacheEvents`), `core/admin/utils/cacheRefresh.ts`
    (`resolveListMountRefreshOptions`).
- **Source-of-truth docs:** `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`.
- **Out of scope:** the actual write ops (subtask 03), UI consumption (subtask 04),
  tests (L03).

---

## Security Contract

Read-side cache plumbing only — no new endpoint, auth, RBAC, CSRF, or data
surface. The cache stores the same non-secret installed-plugins VM from L01;
cacheBus carries only the cache **key** + action (`invalidate`/`update`), never
payloads or secrets (`core/admin/utils/cacheBus.ts` `CacheEvent = { key, action,
sourceId, ts }`).

---

## Implementation Pseudocode

```ts
// core/admin/services/pluginsClient.ts  (additions)
import { broadcastCacheEvent, subscribeCacheEvents } from "@/utils/cacheBus";
import { resolveListMountRefreshOptions } from "@/utils/cacheRefresh";
import { cacheKeys } from "@/services/cachePolicy";

export function invalidateInstalledPlugins() {
  cache.clear();                                  // drop memory + localStorage envelope
  broadcastCacheEvent({                           // notify other tabs/components
    key: cacheKeys.installedPluginsList,
    action: "invalidate",
  });
}

export function subscribeInstalledPlugins(onInvalidate: () => void) {
  return subscribeCacheEvents((event) => {
    if (event.key === cacheKeys.installedPluginsList) onInvalidate();
  });
}

// Mount policy: hydrate from cache if present, then background-revalidate exactly
// once; never force-refetch on every mount.
export function getInstalledMountRefreshOptions() {
  return resolveListMountRefreshOptions(Boolean(peekInstalledPlugins()));
}
```

**Data flow:** a lifecycle write (subtask 03) finishes → caller invokes
`invalidateInstalledPlugins()` → memory/local cache cleared + cacheBus
`invalidate` broadcast → every mounted list subscribed via
`subscribeInstalledPlugins` re-runs `fetchInstalledPlugins({ force:true })`.
On mount, `getInstalledMountRefreshOptions()` returns `{ background }` so a cached
list hydrates immediately and revalidates once.

**Error handling:** cacheBus is best-effort (BroadcastChannel may be absent — the
util already falls back to a `localStorage` event; no throw). A failed background
revalidate leaves the hydrated cache in place and surfaces via the caller's error
state (subtask 04).

**Regression-test shape (Vitest):** `invalidateInstalledPlugins` clears the cache
(next `fetch` calls the network) and broadcasts one event with the right key;
`subscribeInstalledPlugins` fires only for the matching key and ignores others;
`getInstalledMountRefreshOptions()` returns background-only when cache is warm.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Vitest** (in `tests/vitest/admin/pluginsClient.test.ts`, L03): invalidate
  clears + broadcasts; subscribe filters by key; mount-refresh option shape. No
  Bun lane.
- **Docs:** add the `plugins:installed:list` key + cacheBus topic to
  `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` (the route→files→cached-API
  row for the Plugin Store).
