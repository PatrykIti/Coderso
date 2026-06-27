# TASK-479-26-L03: Analytics Restyle
# FileName: TASK-479-26-L03-Analytics-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Tools
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-26
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the real Analytics screen to the prototype: a `PageHeader` with a range
`Select` + Export action, a 4-up **KPI stat-card row** (Visitors / Pageviews / Avg.
time / Bounce rate, each with a sparkline), a charts grid (**area** traffic chart +
**donut** sources + **bar** top pages + device **progress** bars), and a **top-pages**
DataTable. All analytics data loading, the range switching, the top-content drawer, and
the cache contract stay byte-for-byte the same.

- **Goal:** `core/admin/ui/analytics/AnalyticsPage.tsx` (+ `KpiCards.tsx`,
  `AnalyticsCharts.tsx`, `TopContentTable.tsx`, `TopContentDrawer.tsx`) looks like
  `_docs/_PROTOTYPE/src/pages/tools/AnalyticsPage.tsx` while preserving the existing
  overview/top-content data flow and cache.
- **Owning module/service:** `core/admin/ui/analytics/AnalyticsPage.tsx`,
  `core/admin/ui/analytics/KpiCards.tsx`, `core/admin/ui/analytics/AnalyticsCharts.tsx`,
  `core/admin/ui/analytics/TopContentTable.tsx`. Shared `PageHeader`/`StatCard`/
  `SectionCard`/`Charts`(Area/Bar/Donut/Sparkline)/`DataTable`/`Progress` primitives
  from TASK-479-06.
- **Source-of-truth docs:** prototype screen
  `_docs/_PROTOTYPE/src/pages/tools/AnalyticsPage.tsx`; prototype patterns
  `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,StatCard,SectionCard,charts,DataTable}.tsx`
  and prototype UI `_docs/_PROTOTYPE/src/components/ui/{progress,select,button}.tsx`;
  tokens `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`.
- **Out of scope:** No changes to `analyticsClient` (`getCachedOverview`,
  `getCachedTopContent`, `getOverviewCached`, `getTopContentCached`,
  `AnalyticsOverview`), to the overview/top-content cache, to `buildAnalyticsKpiCards`'
  KPI selection logic (only its presentational mapping may change), to the range-switch
  flow, to the `TopContentDrawer`, or to RBAC. Chart series + KPI values must come from
  the **real analytics data**, never the prototype's hard-coded arrays.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

Restyle only. Do NOT touch the state machine in `AnalyticsPage.tsx` (the lazy-init
`useState(() => ({getCachedOverview(30), getCachedTopContent(...)}))`, the
`getOverviewCached`/`getTopContentCached` hydrate effect, the range-change handler that
re-reads `getCachedOverview(nextRangeDays)` + `getCachedTopContent(...)`, and the
drawer open state). `buildAnalyticsKpiCards(overview)` stays the data source for the KPI
row.

```tsx
// AnalyticsPage.tsx — RENDER ONLY changes inside the existing return().

// 1) PageHeader: keep title/description + the range Select (value=range,
//    onValueChange=existing range handler) + Export Button (existing onClick).
<PageHeader
  title="Analytics"
  description="Understand how visitors move through your site."
  actions={<><Select …existing range control… /><Button variant="outline" className="gap-1.5"><Download className="size-4" /> Export</Button></>}
/>

// 2) KPI row — KpiCards.tsx renders shared <StatCard> from buildAnalyticsKpiCards(overview).
//    Restyle StatCard to the prototype (label/value/delta/trend/icon/spark) but bind
//    delta/trend/spark to the REAL KpiCard fields; if the overview lacks a trend/spark,
//    omit it (no fabricated "+12.4%" mock). 4-up responsive grid
//    (grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4).

// 3) Charts grid — AnalyticsCharts.tsx: restyle to the prototype layout using the shared
//    Charts primitives, binding to the REAL overview series:
//      - SectionCard "Traffic" (lg:col-span-2): <AreaChart data={overview.trafficSeries} />
//        + the sessions/new-visitors/pages-per-session summary row from real fields.
//      - SectionCard "Sources": <Donut segments={overview.sources.map(...)} /> with the
//        center total + legend from real source data.
//      - SectionCard "Top pages": <BarChart data={...} labels={...} > from real top pages.
//      - SectionCard "Devices": shared <Progress value tone> bars from real device split.
//    The pure-SVG chart primitives come from TASK-479-06-L02 Charts.tsx — do NOT inline
//    new SVG here. Map info→primary tone where the prototype does.

// 4) Top pages — TopContentTable.tsx: restyle wrapper to the prototype DataTable
//    ("overflow-hidden rounded-2xl border bg-card shadow-card") with columns
//    page/views/unique/bounce/avg-time over the EXISTING TopContentRow data. Row click
//    keeps opening the existing TopContentDrawer (onRowClick unchanged).
```

**Data flow:** `getCachedOverview(rangeDays)` / `getCachedTopContent(...)` lazy init →
`getOverviewCached`/`getTopContentCached` hydrate (+ range-change re-read) →
`buildAnalyticsKpiCards(overview)` → `KpiCards` StatCards; `overview` series →
`AnalyticsCharts`; `topContent` → `TopContentTable` → `TopContentDrawer` on row click.
The restyle changes none of these edges.

**Navigation/href constraint (preserve):** Top-content rows open the in-page
`TopContentDrawer` (not a route). If a cell links to a page editor or live URL, keep it
routed via the existing `AdminLink`/`adminPaths` wiring — do NOT string-concat URLs.
The prototype's mock slugs are display-only.

**Error handling:** Keep the destructive `Alert` (analytics API error) with its existing
condition; restyle the card only. Keep the loading + empty states (restyle to the soft
dashed `EmptyState`/skeleton card). Charts must tolerate empty/short real series (render
an empty-state inside the SectionCard, not a crash). No new error surfaces.

**React-hooks/cache rules:** KPI cards and chart series derive from the loaded
`overview`/`topContent` at render — no effect, no synchronous `setState` in an effect,
no fabricated values. The range-change handler keeps re-reading the cache the existing
way (no extra force-refetch loop). Do not add a mount effect that overwrites dirty
state.

**Regression-test shape:** see L07 — render `AnalyticsPage` with a seeded
`getCachedOverview` + `getCachedTopContent`; assert: header + range Select + Export
present, 4 KPI StatCards render values from `buildAnalyticsKpiCards`, the four chart
SectionCards render (area/donut/bar/devices) bound to the seeded series, changing the
range Select re-reads the cache for the new range, and the top-pages table renders rows
with a row-click opening the `TopContentDrawer`.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/tools-analytics-restyle.test.tsx`
  (new suite in L07)
- Re-run the existing analytics suites to confirm no behavioral regression:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/analytics.test.tsx tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx tests/vitest/admin/analyticsClient.test.ts`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-26-L03`.
- If the shared `Charts` (Area/Bar/Donut/Sparkline) or `StatCard` primitive is
  introduced/changed for Analytics, note it alongside the TASK-479-06 shell notes so the
  Dashboard and other screens reuse the same charts.
