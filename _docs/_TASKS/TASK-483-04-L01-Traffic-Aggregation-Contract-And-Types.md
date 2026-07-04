# TASK-483-04-L01: Traffic Aggregation Contract And Types
# FileName: TASK-483-04-L01-Traffic-Aggregation-Contract-And-Types.md

**Parent Subtask:** TASK-483-04
**Priority:** High
**Category:** Tools / Analytics / Domain Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-483-01-L01
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

- **Goal:** Define the read-side contract for traffic metrics — the response
  shapes the aggregation queries (L02), the API (L03), and the admin client
  (TASK-483-05) all share.
- **Owning module(s) to create:**
  `core/services/analytics/trafficAggregationTypes.ts` (types) and the query
  normalizers (`normalizeTrafficOverviewQuery`, `normalizeTopPagesQuery`,
  `clampRangeDays`) in `core/services/analytics/trafficAggregationService.ts`
  (the service owns its query normalizers; L02 fills in the SQL).
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`.
- **Out-of-scope:** SQL/DB queries (L02), routes (L03), `db/client` import here.

## Implementation Pseudocode

```ts
// trafficAggregationTypes.ts
export type TrafficTotals = {
  pageviews: number;
  visitors: number;       // distinct visitor_hash
  sessions: number;
  bounceRate: number;     // 0..1, sessions with pageviewCount === 1
  avgPagesPerSession: number;
};

export type TrafficBreakdownRow = { key: string; label: string; value: number };
export type TopPageRow = { path: string; views: number; visitors: number };

export type TrafficOverview = {
  rangeDays: number;
  generatedAt: string;
  totals: TrafficTotals;
  previous: TrafficTotals;          // prior equal-length window for deltas
  trend: { date: string; value: number }[];   // daily pageviews
  sources: TrafficBreakdownRow[];   // by TrafficSourceKind
  devices: TrafficBreakdownRow[];   // by TrafficDeviceClass
  referrers: TrafficBreakdownRow[]; // top referrer hosts
  topPages: TopPageRow[];           // real views ranking (replaces computeScore)
};

export type TrafficOverviewQuery = { rangeDays: number; now?: Date };
export type TopPagesQuery = { rangeDays: number; limit: number; now?: Date };
```

```ts
// trafficAggregationService.ts (normalizers owned here; SQL added in L02)
export const clampRangeDays = (v: number) => Math.min(Math.max(Math.floor(v), 1), 365);
export const clampLimit = (v: number) => Math.min(Math.max(Math.floor(v), 1), 100);

export function normalizeTrafficOverviewQuery(q: TrafficOverviewQuery) {
  return { rangeDays: clampRangeDays(q.rangeDays), now: q.now ?? new Date() };
}
export function normalizeTopPagesQuery(q: TopPagesQuery) {
  return { rangeDays: clampRangeDays(q.rangeDays), limit: clampLimit(q.limit), now: q.now ?? new Date() };
}
```

Data flow: routes parse query strings, validate against the re-exported schema
(L03), then call these normalizers; the service (L02) runs the SQL and returns a
`TrafficOverview`. The admin client (TASK-483-05) imports `TrafficOverview` for
typed cache values.

Error handling: invalid range/limit are clamped (not errored) to match the
existing content-inventory behavior (`clampRangeDays` in `analyticsService.ts`);
truly malformed query types still throw `analytics_query_invalid` at the route.

Regression-test shape (Vitest,
`tests/vitest/analytics/trafficAggregationQuery.test.ts`):

```ts
test("range clamps to [1,365]", () => {
  expect(normalizeTrafficOverviewQuery({ rangeDays: 9999 }).rangeDays).toBe(365);
  expect(normalizeTrafficOverviewQuery({ rangeDays: 0 }).rangeDays).toBe(1);
});
test("top-pages limit clamps to [1,100]", () => {
  expect(normalizeTopPagesQuery({ rangeDays: 30, limit: 500 }).limit).toBe(100);
});
```

## Security Contract

- **Endpoint visibility:** none (domain types/normalizers).
- **Auth model / RBAC / CSRF / Rate-limit:** N/A here; enforced at the API (L03).
- **Validation schema-owner module:** this module owns the query normalizers and
  clamps; `core/server/validation/analyticsSchemas.ts` re-exports the JSON
  schema, never re-declares the clamps.
- **Anti-abuse controls:** N/A (read side).
- **Secret/PII handling:** types expose only aggregate counts and host/path
  strings — no `visitor_hash`, no raw IP/UA, ever surfaced to the client.

## Testing Requirements

- **Vitest** only (Bun-free): query normalization/clamps and type-shape compile
  checks.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
