# TASK-480-03-L04: Cached Client & CacheBus
# FileName: TASK-480-03-L04-Cached-Client-And-CacheBus.md

**Parent Subtask:** TASK-480-03
**Priority:** High
**Category:** `dashboard` / `admin-cache`
**Estimated Effort:** Medium
**Dependencies:** TASK-480-03-L02 (layout routes), TASK-480-03-L03 (widget-data
route).
**Status:** ⏳ To Do
**Started:**
**Completed:**

---

## Overview

- **Goal:** Give the dashboard builder a cached, cross-tab-consistent client for
  the layout and resolved widget data so the surface hydrates instantly from cache,
  revalidates in the background, and never force-refetches on mount or overwrites
  unsaved edit-mode changes — following the established admin cache contract
  (`_docs/ADMIN_CACHE.md`).
- **Owning module/service:** `core/admin/services/dashboardClient.ts` (extend the
  current thin client), `core/admin/services/cachePolicy.ts` (keys/TTL),
  `core/admin/utils/cacheBus.ts` + `core/admin/utils/storageCache.ts` (existing
  primitives).
- **Source-of-truth docs:** `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`.
- **Out of scope:** the builder UI/floating panel (480-04/05); routes (L02/L03);
  persistence (L01).

---

## Security Contract

- **Endpoint visibility:** n/a (browser client over the L02/L03 internal routes).
- **Auth model / RBAC / CSRF / Rate-limit:** enforced server-side; the client
  sends the admin session + CSRF token through the shared `apiRequest`
  (`core/admin/services/apiClient.ts`) exactly like other admin clients.
- **Validation:** client trusts server-normalized payloads but **type-guards**
  cached values on read (`isDashboardLayout`, `isWidgetDataResponse`) so a poisoned
  `localStorage` entry can never feed malformed data into the builder.
- **Secret handling:** only the layout (presentation/config) and the non-secret
  resolved widget data are cached in `localStorage`. The security-summary widget
  caches status/issues/checks only — never raw settings. No tokens/credentials
  enter cache, per the existing settings-redacted precedent in `ADMIN_CACHE.md`.

---

## Implementation Pseudocode

### Cache keys + TTL (`core/admin/services/cachePolicy.ts`)

```ts
export const cacheKeys = {
  // ...existing...
  dashboardLayout: "dashboard:layout",                 // per-user (browser session is the user scope)
  dashboardWidgetData: "dashboard:widgetData",         // resolved data for the saved layout
};
// reuse cacheTtlMs.detail (5 min) for the layout; widget data is more volatile:
export const dashboardWidgetDataTtlMs = 60 * 1000;     // 1 min background-revalidate window
```

> The layout cache is per-browser/per-session (same scope as every other admin
> `localStorage` cache — it is already user-scoped because the session is). No user
> id is embedded in the key; on logout the admin cache is cleared by the existing
> shell teardown.

### Cached wrappers (`core/admin/services/dashboardClient.ts`)

```ts
import { apiRequest } from "./apiClient";
import { cacheKeys, cacheTtlMs, dashboardWidgetDataTtlMs } from "@/services/cachePolicy";
import { readLocalCache, writeLocalCache, clearLocalCache } from "@/utils/storageCache";
import { broadcastCacheEvent, subscribeCacheEvents } from "@/utils/cacheBus";

type LoadOptions = { force?: boolean; background?: boolean };

const isDashboardLayout = (v: unknown): v is DashboardLayout =>
  Boolean(v) && typeof v === "object" && Array.isArray((v as any).widgets);

// Existing fixed payload reader stays unchanged.
export async function getDashboardData() {
  return apiRequest<DashboardPayload>("/dashboard", { method: "GET" });
}

export function getCachedDashboardLayout(): DashboardLayout | null {
  const v = readLocalCache<DashboardLayout>(cacheKeys.dashboardLayout, cacheTtlMs.detail);
  return v && isDashboardLayout(v) ? v : null;
}

export async function getDashboardLayoutCached(opts: LoadOptions = {}) {
  const cached = getCachedDashboardLayout();
  if (cached && !opts.force) {
    if (opts.background) void revalidateLayout();        // fire-and-forget, no await on mount
    return cached;
  }
  return revalidateLayout();
}

async function revalidateLayout(): Promise<DashboardLayout> {
  const { layout } = await apiRequest<{ layout: DashboardLayout }>("/dashboard/layout",
    { method: "GET" });
  writeLocalCache(cacheKeys.dashboardLayout, layout);
  broadcastCacheEvent({ key: cacheKeys.dashboardLayout, action: "update" });
  return layout;
}

export async function saveDashboardLayout(layout: DashboardLayout) {
  const res = await apiRequest<{ layout: DashboardLayout; updatedAt: string }>(
    "/dashboard/layout", { method: "PUT", body: layout, withCsrf: true });
  writeLocalCache(cacheKeys.dashboardLayout, res.layout);
  broadcastCacheEvent({ key: cacheKeys.dashboardLayout, action: "update" });
  // a saved layout can change which data is needed -> invalidate widget data
  clearLocalCache(cacheKeys.dashboardWidgetData);
  broadcastCacheEvent({ key: cacheKeys.dashboardWidgetData, action: "invalidate" });
  return res.layout;
}

export async function resetDashboardLayout() {
  const { layout } = await apiRequest<{ layout: DashboardLayout }>(
    "/dashboard/layout/reset", { method: "POST", withCsrf: true });
  writeLocalCache(cacheKeys.dashboardLayout, layout);
  broadcastCacheEvent({ key: cacheKeys.dashboardLayout, action: "update" });
  clearLocalCache(cacheKeys.dashboardWidgetData);
  broadcastCacheEvent({ key: cacheKeys.dashboardWidgetData, action: "invalidate" });
  return layout;
}

export async function getWidgetDataCached(opts: LoadOptions = {}) {
  const cached = readLocalCache<DashboardWidgetDataResponse>(
    cacheKeys.dashboardWidgetData, dashboardWidgetDataTtlMs);
  if (cached && !opts.force) {
    if (opts.background) void revalidateWidgetData();
    return cached;
  }
  return revalidateWidgetData();
}

async function revalidateWidgetData(): Promise<DashboardWidgetDataResponse> {
  const res = await apiRequest<DashboardWidgetDataResponse>("/dashboard/widget-data",
    { method: "GET" });
  writeLocalCache(cacheKeys.dashboardWidgetData, res);
  broadcastCacheEvent({ key: cacheKeys.dashboardWidgetData, action: "update" });
  return res;
}

export function subscribeDashboardCache(handler: (key: string) => void) {
  return subscribeCacheEvents((evt) => {
    if (evt.key === cacheKeys.dashboardLayout || evt.key === cacheKeys.dashboardWidgetData) {
      handler(evt.key);
    }
  });
}
```

### UI hydration policy (consumed by 480-04/05; stated here as the contract)

- **Mount:** if layout cache present → `getDashboardLayoutCached({ force:false,
  background:true })` (hydrate immediately, revalidate in background); if absent →
  `{ force:true, background:false }` (single foreground load). **No** unconditional
  mount refetch.
- **Edit mode (dirty):** background `dashboard:layout` cache-bus updates are
  **ignored** while the builder has unsaved changes — show a "remote update" hint,
  never overwrite the working draft (mirrors the editor rule in `ADMIN_CACHE.md`).
- **Save:** `saveDashboardLayout` is the only writer; it patches layout cache and
  invalidates widget-data cache so the next read re-resolves.
- **Cross-tab:** `subscribeDashboardCache` revalidates from the patched cache when
  clean; dirty drafts defer.

**Data flow:** UI → cached wrapper (hydrate from `localStorage`) → background
`apiRequest` → `writeLocalCache` + `broadcastCacheEvent` → other tabs/components
revalidate. Saves invalidate dependent widget-data cache.

**Error handling:** network failures keep the last good cache and surface bounded
inline copy (no blanking); poisoned cache values fail the type-guard and fall
through to a network read.

**Regression-test shape (Vitest):**

- `getDashboardLayoutCached` hydrates from cache without a network call when cache
  is fresh; performs exactly one foreground read when cache is missing.
- `saveDashboardLayout` PUTs, patches layout cache, broadcasts `dashboard:layout`
  `update`, and invalidates+broadcasts `dashboard:widgetData`.
- `getWidgetDataCached` respects the 1-min TTL and the `force` flag.
- Type-guard rejects a malformed cached layout and re-fetches.
- No mount-force refetch: with fresh cache, `{ background:true }` does not block
  and a forced refetch is not issued.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core test:vitest -- dashboardClient` (cache keys/TTL, hydrate vs
  revalidate, cacheBus invalidation on save, type-guard, no mount-force refetch).

---

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` — new "Dashboard layout & widget-data cache note":
  keys `dashboard:layout` (TTL `cacheTtlMs.detail`) and `dashboard:widgetData`
  (1-min TTL); save invalidates widget data; dirty edit-mode defers background
  updates; only presentation/non-secret data cached.
- `_docs/ADMIN_CACHE_MAP.md` — add a "Dashboard" entry: UI
  `core/admin/ui/dashboard/DashboardPage.tsx`; cached APIs
  `getDashboardLayoutCached`, `getWidgetDataCached`, `saveDashboardLayout`;
  cache bus `dashboard:layout`, `dashboard:widgetData`.
- Board status; changelog entry.
