# TASK-483-04-L03: Traffic Analytics Admin API And CSV Export
# FileName: TASK-483-04-L03-Traffic-Analytics-Admin-API-And-CSV-Export.md

**Parent Subtask:** TASK-483-04
**Priority:** High
**Category:** Tools / Analytics / Admin API / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-483-04-L02, TASK-483-02-L02 (lands `mapAnalyticsError` in `analyticsRoutes.ts` first; already satisfied by the pinned 01→02→03→04 land order)
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

---

## Overview

- **Goal:** Expose the aggregation through internal admin endpoints and provide a
  CSV export for top-pages-by-views, consistent with the existing
  `/analytics/top-content/export` pattern.
- **Owning module(s) to extend:**
  - `core/server/routes/analyticsRoutes.ts` — add `GET /analytics/traffic/overview`,
    `GET /analytics/traffic/top-pages`, `GET /analytics/traffic/top-pages/export`;
    reuse the shared `mapAnalyticsError` that TASK-483-02-L02 lands first in
    this module. TASK-483-02-L02's pseudocode already includes the read-side
    `analytics_query_failed` case (→ 500) in its enumerated full switch, so this
    leaf **verifies** that case exists and adds it **only if** 02-L02 landed
    without it; either way this leaf imports/reuses the function and never
    redeclares it. 02-L02 owns the switch; this leaf owns only the
    read-side-case guarantee.
  - `core/server/validation/analyticsSchemas.ts` — **declare** (inline, per the
    existing convention of `overviewQuerySchema`/`topContentQuerySchema`/
    `topContentExportQuerySchema` in that module) `trafficOverviewQuerySchema`,
    `topPagesQuerySchema`, `topPagesExportQuerySchema`. Domain clamps/normalizers
    stay in `trafficAggregationService.ts` (L01) and are never duplicated here.
  - `core/services/analytics/trafficAggregationService.ts` — add
    `serializeTopPagesCsv` + `exportTopPagesCsv` mirroring `serializeTopContentCsv`
    (reuse the same CSV-injection-guard helpers).
  - `core/services/analytics/analyticsService.ts` — **export**
    `escapeCsvCell` + `serializeCsvRow` (currently non-exported private consts at
    `analyticsService.ts:211` and `:219`) so `trafficAggregationService.ts` can
    DRY-import them for the formula-injection guard. Single-writer within 483 (no
    sibling stream touches `analyticsService.ts`); this is an additive export edit
    only — no behavior change. Alternatively, if a cross-file export is undesirable,
    define the two guard helpers directly in `trafficAggregationService.ts`.
- **Source-of-truth docs:** `_docs/CMS_API.md`, `_docs/ADMIN_CACHE.md`.
- **Out-of-scope:** the public collector (TASK-483-02), admin client/UI (TASK-483-05).

## Security Contract

- **Endpoint visibility:** **internal** `/admin/api/analytics/traffic/*` — read
  endpoints, registered through `registerAnalyticsRoutes` exactly like the
  existing overview/top-content routes.
- **Auth model:** authenticated admin session (same as existing analytics routes).
- **RBAC:** `requirePermission("content:read")` per op — matches the existing
  analytics read permission; do not invent a new permission unless product asks.
- **CSRF expectations:** N/A (GET reads); no mutations added.
- **Rate-limit bucket:** existing `admin_read`; authenticated requests bypass per
  current policy.
- **Validation schema-owner module:** the JSON schemas live in
  `analyticsSchemas.ts` with `additionalProperties: false`; the route reuses the
  existing `assertKnownQuery` + `parseNumber` helpers and the domain clamps from
  TASK-483-04-L01. Unknown query keys → `additionalProperties` validation error.
- **Anti-abuse controls:** none required (internal authenticated read).
- **Secret/PII handling:** responses and CSV expose only aggregate counts +
  path/host strings; never `visitor_hash`. CSV cells pass through the existing
  `escapeCsvCell` formula-injection guard.

## Implementation Pseudocode

```ts
// core/server/validation/analyticsSchemas.ts
export const trafficOverviewQuerySchema = {
  type: "object", additionalProperties: false, required: ["rangeDays"],
  properties: { rangeDays: { type: "number", minimum: 1, maximum: 365 } },
};
export const topPagesQuerySchema = {
  type: "object", additionalProperties: false, required: ["limit", "rangeDays"],
  properties: { limit: { type: "number", minimum: 1, maximum: 100 },
                rangeDays: { type: "number", minimum: 1, maximum: 365 } },
};
export const topPagesExportQuerySchema = {
  type: "object", additionalProperties: false, required: ["limit", "rangeDays", "format"],
  properties: { limit: { type: "number", minimum: 1, maximum: 100 },
                rangeDays: { type: "number", minimum: 1, maximum: 365 },
                format: { type: "string", enum: ["csv"] } },
};

// core/server/routes/analyticsRoutes.ts (inside registerAnalyticsRoutes)
//
// IMPORTANT — analyticsRoutes.ts today has NO ambient error boundary: the
// existing overview/top-content handlers just `return getAnalyticsOverview(...)`
// (verified: core/server/routes/analyticsRoutes.ts:62-103, no try/catch, no
// map*Error). So the mapAnalyticsError wiring must be ADDED by this leaf, not
// merely "reused" — an unwrapped handler would let a DB failure bubble as a
// generic 500 with the machine-readable code lost. Mirror the repo-wide
// convention `withContentEntryErrors` (contentEntryRoutes.ts:160-169, also used
// by postsRoutes/menuRoutes/pageRoutes/settingsRoutes/…): a module-local
// `withAnalyticsErrors` wrapper that RE-THROWS ApiError unchanged (so
// assertKnownQuery/validate's 400s pass through) and maps plain Errors via
// mapAnalyticsError. Keeps handlers orchestration-only with map*Error at the
// boundary (AGENTS.md mandatory rule).
const withAnalyticsErrors = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) throw error;   // validation 400s pass through
    throw mapAnalyticsError(error);               // plain Error -> mapped ApiError
  }
};

router.get("/analytics/traffic/overview", requirePermission("content:read"), async (ctx) =>
  withAnalyticsErrors(async () => {
    assertKnownQuery(ctx.query, new Set(["rangeDays"]));
    const rangeDays = parseNumber(ctx.query, "rangeDays", 30);
    validate(trafficOverviewQuerySchema, { rangeDays });
    return getTrafficOverview({ rangeDays });
  }));
router.get("/analytics/traffic/top-pages", requirePermission("content:read"), async (ctx) =>
  withAnalyticsErrors(async () => {
    assertKnownQuery(ctx.query, new Set(["limit", "rangeDays"]));
    const limit = parseNumber(ctx.query, "limit", 10);
    const rangeDays = parseNumber(ctx.query, "rangeDays", 30);
    validate(topPagesQuerySchema, { limit, rangeDays });
    return getTopPages({ limit, rangeDays });
  }));
router.get("/analytics/traffic/top-pages/export", requirePermission("content:read"), async (ctx) =>
  withAnalyticsErrors(async () => {
    assertKnownQuery(ctx.query, new Set(["limit", "rangeDays", "format"]));
    const limit = parseNumber(ctx.query, "limit", 50);
    const rangeDays = parseNumber(ctx.query, "rangeDays", 30);
    validate(topPagesExportQuerySchema, { limit, rangeDays, format: ctx.query.format ?? "csv" });
    return exportTopPagesCsv({ limit, rangeDays });
  }));

// mapAnalyticsError: landed by TASK-483-02-L02 with the FULL enumerated switch,
// including `case "analytics_query_failed": return new ApiError(code, "Analytics query failed", 500);`.
// This leaf imports/reuses the function (never redeclares it) and only VERIFIES
// the read-side case is present — adding it is a fallback if 02-L02 landed
// without it, not the expected diff. The `withAnalyticsErrors` wrapper above is
// this leaf's net-new boundary that actually invokes mapAnalyticsError on the
// admin read surface (the ingestion route in 02-L02 has its own try/catch in
// publicAnalyticsApi.ts; the admin router had none until this leaf).

// service: reuse escapeCsvCell/serializeCsvRow from analyticsService.ts (export+import) — DRY
export function serializeTopPagesCsv(rows: TopPageRow[]) {
  const headers = ["path", "views", "visitors"] as const;
  return [serializeCsvRow(headers),
    ...rows.map((r) => serializeCsvRow([r.path, String(r.views), String(r.visitors)]))].join("\n");
}
export async function exportTopPagesCsv(input: TopPagesQuery): Promise<TopContentExport> {
  const opts = normalizeTopPagesQuery(input);
  const rows = await getTopPages(opts);
  return { fileName: `coderso-traffic-top-pages-${opts.rangeDays}d-${formatDay(opts.now)}.csv`,
           contentType: "text/csv", content: serializeTopPagesCsv(rows),
           rangeDays: opts.rangeDays, totalRows: rows.length };
}
```

Data flow: admin client (TASK-483-05) calls these GETs; the export returns the
same `TopContentExport` shape the existing UI download path already consumes.
Errors map through the shared `mapAnalyticsError` — **the switch is landed first
by TASK-483-02-L02 and already includes the read-side `analytics_query_failed`
case (→ 500)** — but note `analyticsRoutes.ts` currently has **no ambient error
boundary** on its handlers (verified: analyticsRoutes.ts:62-103 return the
service call directly). So this leaf **adds** a module-local `withAnalyticsErrors`
wrapper (mirroring `withContentEntryErrors`, contentEntryRoutes.ts:160-169) that
actually invokes `mapAnalyticsError` on the admin read surface; it imports/reuses
the switch function (never redeclares it) and only adds the read-side case as a
fallback if 02-L02 somehow landed without it.

Error handling: invalid query → validation `ApiError` (thrown by
`assertKnownQuery`/`validate`) is re-thrown unchanged by `withAnalyticsErrors`
→ 400; service failure → `runQueries` (L02:48-55) throws plain
`Error("analytics_query_failed")` → caught by `withAnalyticsErrors` →
`mapAnalyticsError` → `ApiError` (→ 500). Add route registration + the
`withAnalyticsErrors` boundary + `map*Error` coverage per the repo testing rules.

Regression-test shape (Bun route integration,
`tests/integration/routes/analyticsTraffic.test.ts`):

```ts
test("GET /analytics/traffic/overview requires content:read", async () => {});
test("unknown query key -> 400 additionalProperties", async () => {});
test("export returns text/csv with path,views,visitors header", async () => {});
test("service failure maps to analytics_query_failed", async () => {});
```

## Testing Requirements

- **Bun** (`tests/integration/routes/*`): route registration, RBAC,
  reject-unknown, export content-type/header, and `mapAnalyticsError` coverage.
- **Bun** lane (`tests/unit/analytics/`) for `serializeTopPagesCsv`
  (formula-injection guard reuse). Although the serializer is pure, it lives in
  `trafficAggregationService.ts`, which imports `db/client` (`core/db/client.ts`
  throws without `DATABASE_URL` and opens a `postgres()` pool at import), so a
  Vitest import would pull in the DB kernel — mirroring the existing
  `serializeTopContentCsv` precedent (`core/services/analytics/analyticsService.ts`,
  also db/client-coupled) tested in the Bun lane at
  `tests/unit/analytics/analyticsService.test.ts`, NOT Vitest.
- `set -a && source .env && set +a` for DB-backed route assertions.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
