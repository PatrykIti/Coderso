# TASK-483-05-L01: Traffic Analytics Client And Cache Contract
# FileName: TASK-483-05-L01-Traffic-Analytics-Client-And-Cache-Contract.md

**Parent Subtask:** TASK-483-05
**Priority:** High
**Category:** Tools / Analytics / Admin Client / Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-483-04-L03
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

- **Goal:** Add cached admin client methods for the traffic endpoints, following
  the shared cache contract end-to-end (keys, TTLs, cached wrappers, `cacheBus`).
- **Owning module(s) to extend:**
  - `core/admin/services/analyticsClient.ts` — `getTrafficOverview(Cached)`,
    `getTopPages(Cached)`, `exportTopPages`, plus `getCached*` readers mirroring
    the existing overview/top-content cache wrappers.
  - `core/admin/services/cachePolicy.ts` — add `cacheKeys.analyticsTrafficOverview`
    and `cacheKeys.analyticsTopPages` next to the existing `analyticsOverview` /
    `analyticsTopContent` keys.
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
export type TrafficOverview = { /* import-compatible with service TrafficOverview */ };

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

## Testing Requirements

- **Vitest** (`tests/vitest/admin/*`): cache read/write/hydrate, force-revalidate,
  in-flight dedupe, key shape, DTO validation.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
