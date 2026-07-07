# TASK-480-02-L02: Data-Source Registry & Service
# FileName: TASK-480-02-L02-Data-Source-Registry-And-Service.md

**Parent Subtask:** TASK-480-02
**Priority:** High
**Category:** Admin / Dashboard / Domain Service
**Estimated Effort:** Medium
**Dependencies:** TASK-480-02-L01 (widget/layout types + schema)
**Status:** ✅ Done
**Started:** 2026-07-05
**Completed:** 2026-07-05

---

## Overview

Build the **data-source registry**: a mapping from each `DashboardWidgetType` to
a resolver that reads real CMS data and returns a typed `DashboardWidgetData`
payload. Reuse the existing `dashboardService.ts` readers (totals, recentEdits,
storage, security) and add two new bounded readers (per-content-type counts,
content-over-time) plus a **safe, clamped content-query** resolver. Expose
`resolveWidgetData(widget)` for a single widget and
`resolveDashboardWidgets(layout)` for a whole layout (deduping shared sources).

- **Goal:** Each widget pulls from a CMS data source through one registry, so the
  data API (`TASK-480-03`) is pure orchestration: validate layout → resolve →
  return. Resolvers are pure/lazy and DB-injectable so the shaping logic is
  Vitest-testable without Bun/Postgres.
- **Owning module/service:**
  - Registry + `resolveWidgetData` + `resolveDashboardWidgets` + new readers →
    new `core/services/dashboard/dashboardDataSources.ts`.
  - Existing readers reused/exported from
    `core/services/dashboard/dashboardService.ts`
    (`getDashboardTotals`, `getRecentEdits`, `getStorageSummary`,
    `buildSecuritySummary`).
  - Widget-data result types → extend
    `core/services/dashboard/dashboardTypes.ts`.
- **Source-of-truth docs:** `_docs/DASHBOARD_WIDGETS_SPEC.md`,
  `_docs/DATA_MODEL.md`, `_docs/CMS_API.md` (response shapes consumed by the
  later route).
- **Out of scope:** HTTP routes, cached client, cacheBus, persistence
  (`TASK-480-03`); UI (`TASK-480-04` renderers / `TASK-480-05` builder).

> Admin Dashboard widgets — NOT `core/widgets`. Resolvers read CMS aggregates,
> they do not render or resolve page/content widgets.

---

## Security Contract

- **Endpoint visibility:** n/a here (resolvers are called by the `internal`
  `/admin/api/dashboard/widget-data` route in `TASK-480-03`).
- **Auth model / RBAC:** n/a in this leaf; document for the route: data resolve
  requires `content:read` (same gate as today's `GET /dashboard`,
  `core/server/routes/dashboardRoutes.ts:23`).
- **CSRF / Rate-limit:** n/a (read-only resolvers; the route applies
  `admin_read` for the saved-layout GET and `admin_write` for the body-carrying
  POST widget-data query).
- **Validation:** resolvers receive an **already-normalized** `DashboardWidget`
  from L01's `normalizeDashboardLayout()`. They additionally **re-clamp** any
  query bound at the data boundary (defense-in-depth) and **reject unknown
  content sources/content-type ids** — an unknown `contentTypeId` resolves to an
  empty/`null`-typed result, never an unbounded scan.
- **Anti-abuse:** the `content-query` resolver hard-caps `limit`
  (`DASHBOARD_CONTENT_QUERY_MAX_LIMIT`), forces a deterministic `ORDER BY`, never
  interpolates raw config into SQL (parameterized drizzle only), and only allows
  the closed status enum. No free-text / arbitrary-column filters in this phase.
- **Secret handling:** resolvers project only safe dashboard data. Author email
  goes through the existing `resolveEmailValue` PII seam (already used by
  `dashboardService.ts`). The `security-summary` / `site-health` resolvers return
  the **summary** (`buildSecuritySummary`) only — never raw `SecuritySettings`,
  bucket secrets, or credentials.

---

## Sub-Tasks (leaf checklist)

- [ ] Export the existing readers from `dashboardService.ts` for reuse.
- [ ] Add `getContentTypeCounts()` and `getContentOverTime(rangeDays, bucket)`
      readers (bounded, parameterized).
- [ ] Add `resolveContentQueryWidget(config)` — safe, clamped entries query.
- [ ] Create `dashboardDataSources.ts`: `DashboardWidgetData` union, the
      `dashboardWidgetResolvers` registry, `resolveWidgetData()`,
      `resolveDashboardWidgets()`.
- [ ] Make readers DB-injectable (a `DashboardDataReaders` dependency object) so
      shaping is Vitest-testable without a live DB.
- [ ] Unit coverage handed to L03.

---

## Implementation Pseudocode

### 1. Result types — extend `dashboardTypes.ts`

```ts
export type DashboardContentTypeCount = { id: string; slug: string; label: string; count: number };
export type DashboardTimeBucket = { bucket: string; created: number; updated: number };

// Discriminated by widget type; **display-ready** — the resolver does the formatting,
// matching the 480-04 renderer contract (renderers just display). The widget `id` lives
// on DashboardWidget, NOT on the data payload. These variants MUST match the data shapes
// consumed in TASK-480-04-L02 and the fixtures in TASK-480-04-L03.
export type DashboardWidgetData =
  | { type: "totals-counters";     counters: { key: "pages" | "entries" | "media" | "users"; label: string; formatted: string; value: number; delta?: { value: number; trend: "up" | "down" | "flat"; label?: string }; spark?: number[] }[] }
  | { type: "content-type-counts"; counts: { slug: string; label: string; count: number; href?: string }[]; segments?: { label: string; value: number; color: string }[] }
  | { type: "content-over-time";   variant: "area" | "bar"; series: { id: string; label: string; color?: string; points: number[] }[]; categories?: string[] }
  | { type: "recent-activity";     items: DashboardRecentEdit[] }
  | { type: "storage-usage";       usedBytes: number; limitBytes: number | null; usedPercent: number | null; breakdown?: { label: string; bytes: number }[] }
  | { type: "site-health";         security: DashboardSecuritySummary; storage?: { usedPercent: number | null } }
  | { type: "security-summary";    security: DashboardSecuritySummary }
  | { type: "quick-actions";       actions: { id: string; label: string; target: string; icon?: string }[] }
  | { type: "content-query";       columns: { key: string; label: string }[]; rows: Record<string, string | number>[] };

// Route/client wrappers own widget instance ids and status. The data-source
// service returns display-ready data or this bounded failure variant; it never
// returns `{ id, data }`.
export type DashboardWidgetResolution =
  | DashboardWidgetData
  | { type: DashboardWidgetType; error: "widget_data_unavailable" };
```

### 2. New bounded readers — `dashboardService.ts`

```ts
// Export existing readers for reuse (currently module-private):
export { getDashboardTotals, getRecentEdits, getStorageSummary };
export { buildSecuritySummary }; // already exported

// Per-content-type entry counts (bounded, grouped).
export async function getContentTypeCounts(limit = 20): Promise<DashboardContentTypeCount[]> {
  const rows = await db
    .select({
      id: contentTypes.id,
      slug: contentTypes.slug,
      label: contentTypes.name,
      count: sql<number>`count(${contentEntries.id})`,
    })
    .from(contentTypes)
    .leftJoin(contentEntries, eq(contentEntries.typeId, contentTypes.id))
    .groupBy(contentTypes.id, contentTypes.slug, contentTypes.name)
    .orderBy(desc(sql`count(${contentEntries.id})`))
    .limit(clamp(limit, 1, 50));
  return rows.map((r) => ({ id: r.id, slug: r.slug, label: r.label, count: Number(r.count ?? 0) }));
}

// Content created/updated over a clamped range, bucketed by day/week.
export async function getContentOverTime(
  rangeDays = 30,
  bucket: "day" | "week" = "day",
): Promise<DashboardTimeBucket[]> {
  const days = clamp(rangeDays, 1, 365);
  const trunc = bucket === "week" ? "week" : "day";
  const rows = await db
    .select({
      bucket: sql<string>`date_trunc(${trunc}, ${contentEntries.createdAt})`,
      created: sql<number>`count(*)`,
      updated: sql<number>`count(*) filter (where ${contentEntries.updatedAt} > ${contentEntries.createdAt})`,
    })
    .from(contentEntries)
    .where(sql`${contentEntries.createdAt} >= now() - (${days} || ' days')::interval`)
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  return rows.map((r) => ({ bucket: toIsoString(r.bucket), created: Number(r.created ?? 0), updated: Number(r.updated ?? 0) }));
}

// Safe, clamped content query for the content-query widget.
export async function resolveContentQueryWidget(
  config: Extract<DashboardWidgetConfig, { kind: "content-query" }>,
): Promise<DashboardRecentEdit[]> {
  const limit = clamp(config.limit ?? 10, 1, DASHBOARD_CONTENT_QUERY_MAX_LIMIT);
  const sortCol = { updatedAt: contentEntries.updatedAt, createdAt: contentEntries.createdAt, title: contentEntries.title }[
    config.sort ?? "updatedAt"
  ];
  const direction = config.order === "asc" ? asc : desc;

  const where: SQL[] = [];
  if (config.contentTypeId) where.push(eq(contentEntries.typeId, config.contentTypeId)); // unknown id => 0 rows, never unbounded
  if (config.status)        where.push(eq(contentEntries.status, config.status));

  const rows = await db
    .select({ /* same projected columns as getRecentEntries, incl. PII-safe author seam */ })
    .from(contentEntries)
    .leftJoin(contentTypes, eq(contentEntries.typeId, contentTypes.id))
    .leftJoin(users, eq(contentEntries.authorId, users.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(direction(sortCol))
    .limit(limit);

  return rows.map(mapEntryRowToRecentEdit); // reuse the existing entry-row mapper (toStatus/toAuthor/resolveAuthorEmail)
}
```

### 3. Registry + resolve — new `dashboardDataSources.ts`

```ts
import {
  getDashboardTotals, getRecentEdits, getStorageSummary, buildSecuritySummary,
  getContentTypeCounts, getContentOverTime, resolveContentQueryWidget,
} from "./dashboardService";
import { getSecuritySettings } from "../settings/securitySettings";
import type { DashboardLayout, DashboardWidget, DashboardWidgetData, DashboardWidgetType } from "./dashboardTypes";

// Injectable readers so shaping is testable without a live DB.
export type DashboardDataReaders = {
  totals: typeof getDashboardTotals;
  recentEdits: typeof getRecentEdits;
  storage: typeof getStorageSummary;
  securitySummary: () => Promise<DashboardSecuritySummary>; // getSecuritySettings -> buildSecuritySummary
  contentTypeCounts: typeof getContentTypeCounts;
  contentOverTime: typeof getContentOverTime;
  contentQuery: typeof resolveContentQueryWidget;
};

type Resolver = (
  widget: DashboardWidget,
  readers: DashboardDataReaders,
) => Promise<DashboardWidgetData>;

// Display mappers — the "formatting in 480-02" the 480-04 renderers rely on. Each maps the
// raw reader output to the display-ready DashboardWidgetData variant (see the union above):
//   toTotalsCounters(totals)     -> { type:"totals-counters", counters:[{key,label,formatted,value,delta?,spark?}] } (one per metric; formatted via formatBytes/number)
//   toContentTypeCounts(rows,w)  -> { type:"content-type-counts", counts: rows.map(...), segments?: built when w.config.display === "donut" }
//   toContentOverTime(buckets,w) -> { type:"content-over-time", variant: w.config.variant ?? "area",
//                                      series:[{id:"created",label:"Created",points:buckets.map(b=>b.created)},{id:"updated",label:"Updated",points:buckets.map(b=>b.updated)}], categories: buckets.map(b=>b.bucket) }
//   toStorageUsage(s)            -> { type:"storage-usage", usedBytes:s.usedBytes, limitBytes:s.limitBytes, usedPercent:s.usedPercent, breakdown:s.breakdown }
//   toContentQuery(rows,w)       -> { type:"content-query", columns:[{key,label}], rows: rows.map(toDisplayRow) }
// DEFAULT_QUICK_ACTIONS — static {id,label,target,icon?} list (no DB), used when config.actions is unset.
export const DEFAULT_QUICK_ACTIONS = [
  { id: "new-page",  label: "New page",  target: "pages" },
  { id: "new-entry", label: "New entry", target: "entries" },
  { id: "media",     label: "Media",     target: "media" },
] as const;

export const dashboardWidgetResolvers: Record<DashboardWidgetType, Resolver> = {
  "totals-counters":     async (_w, r) => toTotalsCounters(await r.totals()),
  "content-type-counts": async (w,  r) => toContentTypeCounts(await r.contentTypeCounts(w.config.kind === "content-type-counts" ? w.config.limit : undefined), w),
  "content-over-time":   async (w,  r) => toContentOverTime(await r.contentOverTime(/* rangeDays, bucket from w.config */), w),
  "recent-activity":     async (w,  r) => ({ type: "recent-activity", items: await r.recentEdits(/* clamped limit */) }),
  "storage-usage":       async (_w, r) => toStorageUsage(await r.storage()),
  "site-health":         async (_w, r) => ({ type: "site-health", security: await r.securitySummary(), storage: { usedPercent: (await r.storage()).usedPercent } }),
  "security-summary":    async (_w, r) => ({ type: "security-summary", security: await r.securitySummary() }),
  "quick-actions":       async (w,  _r) => ({ type: "quick-actions", actions: w.config.kind === "quick-actions" ? (w.config.actions ?? DEFAULT_QUICK_ACTIONS) : DEFAULT_QUICK_ACTIONS }),
  "content-query":       async (w,  r) => toContentQuery(w.config.kind === "content-query" ? await r.contentQuery(w.config) : [], w),
};

const defaultReaders: DashboardDataReaders = {
  totals: getDashboardTotals,
  recentEdits: getRecentEdits,
  storage: getStorageSummary,
  securitySummary: async () => buildSecuritySummary(await getSecuritySettings()),
  contentTypeCounts: getContentTypeCounts,
  contentOverTime: getContentOverTime,
  contentQuery: resolveContentQueryWidget,
};

export async function resolveWidgetData(
  widget: DashboardWidget,
  readers: DashboardDataReaders = defaultReaders,
): Promise<DashboardWidgetResolution> {
  try {
    return await dashboardWidgetResolvers[widget.type](widget, readers);
  } catch {
    return { type: widget.type, error: "widget_data_unavailable" }; // one widget failing never blanks the board
  }
}

export async function resolveDashboardWidgets(
  layout: DashboardLayout,
  readers: DashboardDataReaders = defaultReaders,
): Promise<DashboardWidgetResolution[]> {
  // Resolve concurrently; per-widget try/catch isolates failures.
  return Promise.all(layout.widgets.map((w) => resolveWidgetData(w, readers)));
  // (Optional optimization: memoize shared source reads — e.g. one totals()/
  //  storage() call reused by site-health — without changing output shape.)
}
```

**Data flow:** route validates body via L01 `normalizeDashboardLayout()` →
`resolveDashboardWidgets(layout)` → array of typed `DashboardWidgetResolution`
in layout order. The route layer owns the per-instance wrapper
`{ id, type, status, data | code }`, so widget ids do not leak into the raw
display-data union. A single resolver failure is contained as a per-widget
`{ error: "widget_data_unavailable" }` resolution rather than failing the whole
call.

**Error handling:** unknown `contentTypeId` → empty result (not error); resolver
exceptions → per-widget `error` fallback; the registry is exhaustive over
`DashboardWidgetType` (a `satisfies Record<DashboardWidgetType, Resolver>` keeps
it total at compile time, so a new type can't ship without a resolver).

**Lazy/Bun-free note:** the pure shaping (mapping rows → result shapes, clamps,
registry dispatch, fallback) is exercised in Vitest with **injected fake
readers**; only the actual drizzle reads run under Bun in the route subtask.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest (handed to L03,
  `tests/vitest/services/dashboardDataSourceRegistry.test.ts`):
  - registry has exactly one resolver per `DashboardWidgetType` (exhaustive),
  - each resolver returns the documented display-ready `DashboardWidgetData`
    variant using **injected fake readers** (no DB),
  - `resolveWidgetData` wraps a throwing reader as
    `{ type, error: "widget_data_unavailable" }` (the route later adds the
    widget `id` wrapper),
  - `resolveDashboardWidgets` preserves widget order and isolates one failure,
  - content-query clamp: `limit` over cap is clamped; unknown `contentTypeId`
    yields empty data; deterministic sort/order applied.
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/services/dashboardDataSourceRegistry.test.ts`
- DB-backed reader behavior (`getContentTypeCounts`, `getContentOverTime`,
  `resolveContentQueryWidget`) is integration-tested later under `TASK-480-03`'s
  Bun lane; load env with `set -a && source .env && set +a` for those.

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — registry contract, per-type resolver +
  data shape table, content-query clamps/limits, failure fallback.
- `_docs/DATA_MODEL.md` — new bounded read models (per-content-type counts,
  content-over-time) and the content-query safety bounds.
- Board index + changelog on closure.

---

## Closure Checklist

- [ ] `dashboardDataSources.ts` registry exhaustive over `DashboardWidgetType`.
- [ ] Existing readers reused; new bounded readers + safe content-query added.
- [ ] Resolvers DB-injectable; shaping covered by L03 Vitest specs.
- [ ] Per-widget failure fallback verified (no board-wide blanking).
- [ ] `DASHBOARD_WIDGETS_SPEC.md` + `DATA_MODEL.md` updated.
- [ ] lint/types/vitest evidence recorded.
