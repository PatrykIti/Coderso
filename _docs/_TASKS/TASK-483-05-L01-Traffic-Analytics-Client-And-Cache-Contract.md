# TASK-483-05-L01: Traffic Analytics Client And Cache Contract
# FileName: TASK-483-05-L01-Traffic-Analytics-Client-And-Cache-Contract.md

**Parent Subtask:** TASK-483-05
**Priority:** High
**Category:** Tools / Analytics / Admin Client / Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-483-04-L03
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

---

## Overview

- **Goal:** Add cached admin client methods for the traffic endpoints, following
  the shared cache contract end-to-end (keys, TTLs, cached wrappers, route
  prefetch warmup).
- **`cacheBus`: N/A by design.** Per `_docs/ADMIN_CACHE.md` "Cross-tab Sync",
  `cacheBus` events are broadcast by *mutating* clients; traffic data has no
  admin-side mutation (no admin write ever changes it), so there is no
  broadcaster and no topic to define. This matches the pattern being mirrored:
  `core/admin/services/analyticsClient.ts` (`getOverviewCached` /
  `getTopContentCached`) contains zero `cacheBus` imports or broadcasts. Do NOT
  invent a broadcast topic to satisfy the phrase "shared cache contract" —
  freshness comes from TTL + force-revalidate only.
- **Owning module(s) to extend:**
  - `core/admin/services/analyticsClient.ts` — `getTrafficOverview(Cached)`,
    `getTopPages(Cached)`, `exportTopPages`, plus `getCached*` readers mirroring
    the existing overview/top-content cache wrappers. The `TrafficOverview` type
    is **imported** from the service-owned `trafficAggregationTypes.ts`
    (TASK-483-04-L01), not redeclared locally — single source of truth, no drift
    (see pseudocode). The runtime `isTrafficOverview` cache validator stays local
    and defensive.
  - `core/admin/services/cachePolicy.ts` — add `cacheKeys.analyticsTrafficOverview`
    and `cacheKeys.analyticsTopPages` next to the existing `analyticsOverview` /
    `analyticsTopContent` keys.
  - `core/admin/utils/adminPrefetch.ts` — **single writer: this leaf** (L02 must
    not touch it). Extend the existing `"/analytics"` warm entry (today it runs
    `getOverviewCached(30, prefetchWarmupOptions)` +
    `getTopContentCached({ limit: 50, rangeDays: 30, ...prefetchWarmupOptions })`)
    to ALSO warm `getTrafficOverviewCached` / `getTopPagesCached`, so the page's
    new PRIMARY traffic data is prefetched, not only the demoted
    content-inventory caches. The matching `_docs/ADMIN_CACHE_MAP.md`
    `/analytics` row update is a doc edit owned by TASK-483-06-L02.
- **Source-of-truth docs:** `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`.
- **Out-of-scope:** the page/charts rewire (L02); server routes (TASK-483-04).

## Security Contract

- **Endpoint visibility:** internal admin client calling `/admin/api/analytics/traffic/*`.
- **Auth model:** admin session via the existing `apiRequest` wrapper.
- **RBAC:** server-enforced `content:read`; the client adds no privilege.
- **CSRF expectations:** N/A (GET reads).
- **Rate-limit bucket:** N/A (client side).
- **Validation schema-owner module:** client DTO validators (`isTrafficOverview`)
  are defensive only; the server owns the schema.
- **Anti-abuse controls:** N/A.
- **Secret/PII handling:** cached values contain only aggregate counts + path/host
  strings — safe for `localStorage` per `_docs/ADMIN_CACHE.md`. Never cache any
  secret, `visitor_hash`, or auth-only data.

## Implementation Pseudocode

```ts
// cachePolicy.ts
analyticsTrafficOverview: (rangeDays: number | string) => `analytics:traffic:overview:${rangeDays}`,
analyticsTopPages: (rangeDays: number | string, limit: number | string) =>
  `analytics:traffic:topPages:${rangeDays}:${limit}`,

// analyticsClient.ts (mirror getOverviewCached / getTopContentCached exactly)
// Import the shared read-side type (owned by TASK-483-04-L01) — do NOT redeclare
// a local mirror, to avoid silent shape drift between service and client.
// Precedent: dashboardClient.ts imports DashboardPayload from
// ../../services/dashboard/dashboardTypes (a pure-types module with no db/client
// import), and trafficAggregationTypes.ts is exactly such a module (04-L01
// out-of-scope forbids db/client there, so it is browser-bundle safe).
import type { TrafficOverview } from "../../services/analytics/trafficAggregationTypes";

export async function getTrafficOverview(rangeDays: number) {
  const params = new URLSearchParams({ rangeDays: String(rangeDays) });
  return apiRequest<TrafficOverview>(`/analytics/traffic/overview?${params}`, { method: "GET" });
}
export async function getTrafficOverviewCached(rangeDays: number, options?: { force?: boolean }) {
  const cache = getTrafficOverviewCache(rangeDays);             // createMemoryBackedLocalCache, ttl=detail
  if (!options?.force) { const c = cache.read(); if (c) return c;
    const p = pending.get(key); if (p) return p; }
  const req = getTrafficOverview(rangeDays);
  pending.set(key, req);
  try { const v = await req; cache.write(v); return v; }
  finally { if (pending.get(key) === req) pending.delete(key); }
}
export async function getTopPages(opts: { rangeDays: number; limit: number }) { /* ... */ }
export async function getTopPagesCached(opts) { /* ttl=list, same shape */ }
export async function exportTopPages(opts: { rangeDays: number; limit: number }) {
  const params = new URLSearchParams({ limit: String(opts.limit), rangeDays: String(opts.rangeDays), format: "csv" });
  return apiRequest<TopContentExport>(`/analytics/traffic/top-pages/export?${params}`, { method: "GET" });
}
export const getCachedTrafficOverview = (rangeDays: number) => getTrafficOverviewCache(rangeDays).read();
// Sync reader consumed by AnalyticsPage (L02) hydration — mirror getCachedTopContent exactly.
export const getCachedTopPages = (opts: { rangeDays: number; limit: number }) => getTopPagesCache(opts).read();

// adminPrefetch.ts — extend the EXISTING "/analytics" warm entry in place
// (do not add a second entry; keep the current warmers and append the new ones):
{
  match: "/analytics",
  run: () =>
    Promise.all([
      getOverviewCached(30, prefetchWarmupOptions),
      getTopContentCached({ limit: 50, rangeDays: 30, ...prefetchWarmupOptions }),
      getTrafficOverviewCached(30, prefetchWarmupOptions),
      getTopPagesCached({ rangeDays: 30, limit: 50, ...prefetchWarmupOptions }),
    ]),
},
```

Data flow: `AnalyticsPage` (L02) hydrates from `getCached*` synchronously, then
revalidates via `get*Cached({ force })` exactly like the current overview/
top-content flow — no mount-force refetch loops, no dirty-state overwrites.

Error handling: surfaced via the existing `isApiClientError` path the page
already uses; cache validators reject malformed payloads.

Regression-test shape (Vitest, `tests/vitest/admin/analyticsTrafficClient.test.ts`):

```ts
test("caches overview and serves it on second call without refetch", async () => {});
test("force bypasses cache and rewrites it", async () => {});
test("cache key encodes rangeDays and limit", () => {
  expect(cacheKeys.analyticsTopPages(30, 10)).toBe("analytics:traffic:topPages:30:10");
});
```

Plus: update the EXISTING `tests/vitest/admin/adminPrefetch.test.ts` — its
`vi.doMock("@/services/analyticsClient", ...)` factory currently exports only
`getOverviewCached` / `getTopContentCached` and the `/admin/analytics` warm
assertions check exactly those two calls; extend the factory with
`getTrafficOverviewCached` / `getTopPagesCached` and assert both are warmed
with the `rangeDays: 30` / `limit: 50` arguments above.

## Testing Requirements

- **Vitest** (`tests/vitest/admin/*`): cache read/write/hydrate, force-revalidate,
  in-flight dedupe, key shape, DTO validation; update the existing
  `tests/vitest/admin/adminPrefetch.test.ts` `/analytics` warm expectations as
  described above.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
