# TASK-483-04-L03: Traffic Analytics Admin API And CSV Export
# FileName: TASK-483-04-L03-Traffic-Analytics-Admin-API-And-CSV-Export.md

**Parent Subtask:** TASK-483-04
**Priority:** High
**Category:** Tools / Analytics / Admin API / Security
**Estimated Effort:** Medium
**Dependencies:** TASK-483-04-L02
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

- **Goal:** Expose the aggregation through internal admin endpoints and provide a
  CSV export for top-pages-by-views, consistent with the existing
  `/analytics/top-content/export` pattern.
- **Owning module(s) to extend:**
  - `core/server/routes/analyticsRoutes.ts` — add `GET /analytics/traffic/overview`,
    `GET /analytics/traffic/top-pages`, `GET /analytics/traffic/top-pages/export`;
    **EXTEND** the shared `mapAnalyticsError` that TASK-483-02-L02 lands first in
    this module — add the read-side `analytics_query_failed` case (→ 500); import
    and reuse the existing function, do **not** redeclare it.
  - `core/server/validation/analyticsSchemas.ts` — add and re-export
    `trafficOverviewQuerySchema`, `topPagesQuerySchema`, `topPagesExportQuerySchema`.
  - `core/services/analytics/trafficAggregationService.ts` — add
    `serializeTopPagesCsv` + `exportTopPagesCsv` mirroring `serializeTopContentCsv`
    (reuse the same CSV-injection-guard helpers).
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
router.get("/analytics/traffic/overview", requirePermission("content:read"), async (ctx) => {
  assertKnownQuery(ctx.query, new Set(["rangeDays"]));
  const rangeDays = parseNumber(ctx.query, "rangeDays", 30);
  validate(trafficOverviewQuerySchema, { rangeDays });
  return getTrafficOverview({ rangeDays });
});
router.get("/analytics/traffic/top-pages", requirePermission("content:read"), async (ctx) => {
  assertKnownQuery(ctx.query, new Set(["limit", "rangeDays"]));
  const limit = parseNumber(ctx.query, "limit", 10);
  const rangeDays = parseNumber(ctx.query, "rangeDays", 30);
  validate(topPagesQuerySchema, { limit, rangeDays });
  return getTopPages({ limit, rangeDays });
});
router.get("/analytics/traffic/top-pages/export", requirePermission("content:read"), async (ctx) => {
  assertKnownQuery(ctx.query, new Set(["limit", "rangeDays", "format"]));
  const limit = parseNumber(ctx.query, "limit", 50);
  const rangeDays = parseNumber(ctx.query, "rangeDays", 30);
  validate(topPagesExportQuerySchema, { limit, rangeDays, format: ctx.query.format ?? "csv" });
  return exportTopPagesCsv({ limit, rangeDays });
});

// Extend (do NOT redeclare) the mapAnalyticsError landed by TASK-483-02-L02:
// add `case "analytics_query_failed": return new ApiError(code, "Analytics query failed", 500);`
// to that same switch; this leaf imports/reuses the function.

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
Errors map through the shared `mapAnalyticsError` — **landed first by
TASK-483-02-L02**; this leaf **EXTENDS** it with the read-side
`analytics_query_failed` case (→ 500) and imports/reuses it (never redeclares the
function).

Error handling: invalid query → existing validation error; service failure →
`analytics_query_failed` → `mapAnalyticsError` → `ApiError`. Add route
registration + `map*Error` coverage per the repo testing rules.

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
- **Vitest** for `serializeTopPagesCsv` (pure, formula-injection guard reuse).
- `set -a && source .env && set +a` for DB-backed route assertions.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
