# TASK-483-04-L01: Traffic Aggregation Contract And Types
# FileName: TASK-483-04-L01-Traffic-Aggregation-Contract-And-Types.md

**Parent Subtask:** TASK-483-04
**Priority:** High
**Category:** Tools / Analytics / Domain Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-483-01-L01
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

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

Data flow: routes parse query strings, validate against the JSON schemas
declared in `core/server/validation/analyticsSchemas.ts` (L03), then call these
normalizers; the service (L02) runs the SQL and returns a
`TrafficOverview`. The admin client (TASK-483-05-L01) **imports**
`TrafficOverview` from this module (`trafficAggregationTypes.ts`) for typed cache
values and does NOT keep a local redeclared mirror — this module is the single
source of truth for the shape. It stays a pure-types module (no `db/client`
import) so the browser bundle can import it, matching the existing
`dashboardClient.ts` → `dashboardTypes.ts` precedent.

Error handling: invalid range/limit are clamped (not errored) to match the
existing content-inventory behavior (`clampRangeDays` in `analyticsService.ts`);
truly malformed query types are rejected at the route via the existing
`validationError` helper / `assertKnownQuery` + `validate` path in
`analyticsRoutes.ts`, which throws `ApiError("validation_error", ..., 400)` —
no new error code is introduced for query validation (matches L03).

Regression-test shape (Bun lane,
`tests/unit/analytics/trafficAggregationQuery.test.ts`): the normalizers live in
`trafficAggregationService.ts`, which L02 makes import `db/client`
(`core/db/client.ts` throws without `DATABASE_URL` and opens a `postgres()` pool
at module load), so importing the module for these unit checks requires the Bun
lane — mirroring the existing precedent where the equally-pure
`serializeTopContentCsv` in the db/client-coupled `analyticsService.ts` is tested
in the Bun lane at `tests/unit/analytics/analyticsService.test.ts:142` even
though it is a pure function, because importing that module pulls in `db/client`
(`core/db/client.ts:5-9` throws without `DATABASE_URL`), NOT Vitest:

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
- **Validation schema-owner module:** the JSON query schemas are **declared** in
  `core/server/validation/analyticsSchemas.ts` (L03), per existing convention —
  `overviewQuerySchema`/`topContentQuerySchema`/`topContentExportQuerySchema`
  are already declared inline there. The domain clamps/normalizers
  (`clampRangeDays`, `clampLimit`, `normalize*Query`) are owned HERE in
  `trafficAggregationService.ts` and are never duplicated in the schema module.
- **Anti-abuse controls:** N/A (read side).
- **Secret/PII handling:** types expose only aggregate counts and host/path
  strings — no `visitor_hash`, no raw IP/UA, ever surfaced to the client.

## Testing Requirements

- **Bun** lane (`tests/unit/analytics/trafficAggregationQuery.test.ts`): query
  normalization/clamps. Although the normalizers are pure, they live in
  `trafficAggregationService.ts`, which imports `db/client` (`core/db/client.ts`
  throws without `DATABASE_URL` and constructs a `postgres()` pool at import), so
  a Vitest import would pull in the DB kernel and be flaky — the established
  precedent is the equally-pure `serializeTopContentCsv`, tested in the Bun lane
  at `tests/unit/analytics/analyticsService.test.ts:142` even though it is a pure
  function, because importing `analyticsService.ts` pulls in `db/client` and gates
  on `DATABASE_URL`. Type-shape correctness is enforced by `lint:types`.
- `set -a && source .env && set +a` for the module import (needs `DATABASE_URL`).
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
