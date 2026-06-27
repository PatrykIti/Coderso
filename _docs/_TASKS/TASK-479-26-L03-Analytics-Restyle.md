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
`Select` + Export action, a **KPI stat-card row** (Published Pages / Content Entries /
Media Items — the three real `buildAnalyticsKpiCards` metrics, each with its
period-over-period delta), an **area** traffic chart (real `overview.trend`) beside a
**bar** top-pages chart (real `topPages`), and a **top-content** DataTable. All analytics
data loading, the range switching, the top-content drawer, and the cache contract stay
byte-for-byte the same. The prototype's Visitors / Pageviews / Avg-time / Bounce KPIs and
per-KPI sparklines, the **Sources donut**, and the **Devices** progress bars have NO
backing in `analyticsClient` and are dropped/flagged feature-incomplete (see below).

- **Goal:** `core/admin/ui/analytics/AnalyticsPage.tsx` (+ `KpiCards.tsx`,
  `AnalyticsCharts.tsx`, `TopContentTable.tsx`, `TopContentDrawer.tsx`) looks like
  `_docs/_PROTOTYPE/src/pages/tools/AnalyticsPage.tsx` while preserving the existing
  overview/top-content data flow and cache.
- **Owning module/service:** `core/admin/ui/analytics/AnalyticsPage.tsx`,
  `core/admin/ui/analytics/KpiCards.tsx`, `core/admin/ui/analytics/AnalyticsCharts.tsx`,
  `core/admin/ui/analytics/TopContentTable.tsx`. `PageHeader`, `StatCard`
  (`core/admin/ui/shared/StatCard.tsx`), `SectionCard`, `Charts` (`Charts.tsx`,
  PascalCase — this screen uses only its **Area** + **Bar** charts; the Donut/Sparkline
  it ships go unused here for lack of source/spark data), and `DataTable` are
  **created/ported by TASK-479-06-L02**; `Progress` is the 06-L01 restyle.
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

// 1) PageHeader: keep title/description. NOTE the real range Select lives in the
//    AdminShell `topbarActions` (not inside PageHeader) and re-reads the cache on change;
//    keep it there OR move it into PageHeader actions — either way preserve its existing
//    onValueChange. The Export action calls the existing `exportTopContent(...)` (CSV).
<PageHeader
  title="Analytics"
  description="Understand how visitors move through your site."
  actions={<><Select …existing range control… /><Button variant="outline" className="gap-1.5"><Download className="size-4" /> Export</Button></>}
/>

// 2) KPI row — KpiCards.tsx renders shared <StatCard> from buildAnalyticsKpiCards(overview).
//    The real `KpiCard` is { id, label, value:string, change:string, trend } for exactly
//    THREE metrics — Published Pages / Content Entries / Media Items (keys
//    publishedPages/entries/media). Restyle StatCard binding label/value/change(delta)/
//    trend to those REAL fields; the icon is derived from `card.id` inside KpiCards (no
//    icon data field) and there is NO sparkline data — DROP the prototype's per-KPI spark
//    and its Visitors/Pageviews/Avg-time/Bounce labels (no fabricated "+12.4%" mock).
//    3-up responsive grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4).

// 3) Charts grid — AnalyticsCharts.tsx: restyle to the prototype look using the shared
//    Charts primitives, binding ONLY to the two REAL series the page already passes
//    (`<AnalyticsCharts trend={overview?.trend ?? []} topPages={topPages} />`):
//      - SectionCard "Traffic" (lg:col-span-2): <AreaChart data={overview.trend} /> where
//        `trend` is `TrendPoint[] = { date, value }`. The prototype's sessions/new-
//        visitors/pages-per-session summary row is DROPPED (no such fields exist).
//      - SectionCard "Top pages": <BarChart> over `topPages` (`{ id, path, score }[]`,
//        derived from the existing topContent) — bar value = score, label = path.
//    DROP the "Sources" donut and the "Devices" progress bars: `AnalyticsOverview` has no
//    `sources` and no device split — flag both feature-incomplete (need new overview
//    fields) rather than binding to non-existent data. The pure-SVG chart primitives come
//    from TASK-479-06-L02 `Charts.tsx` (PascalCase) — do NOT inline new SVG here.

// 4) Top content — TopContentTable.tsx: restyle wrapper to the prototype DataTable
//    ("overflow-hidden rounded-2xl border bg-card shadow-card") with columns over the
//    EXISTING `TopContentRow` ({ id, title, path, score, updatedAt, type }): page
//    (title + mono path) / activity score / updated date / type (page|entry). DROP the
//    prototype's views/unique/bounce/avg-time columns — none exist on the row. The
//    TopContentDrawer opens via the EXISTING `onViewAll` action (there is no per-row
//    drawer); keep `onViewAll` wired to `setTopContentOpen(true)`.
```

**Data flow:** `getCachedOverview(rangeDays)` / `getCachedTopContent(...)` lazy init →
`getOverviewCached`/`getTopContentCached` hydrate (+ range-change re-read) →
`buildAnalyticsKpiCards(overview)` → `KpiCards` StatCards; `overview.trend` + derived
`topPages` → `AnalyticsCharts`; `topContent` → `TopContentTable` → `TopContentDrawer` via
the `onViewAll` action. The restyle changes none of these edges.

**Navigation/href constraint (preserve):** The `TopContentDrawer` opens in-page via the
existing `onViewAll` action (not a route, and not a per-row click). If a cell links to a
page editor or live URL, keep it routed via the existing `AdminLink`/`adminPaths`
wiring — do NOT string-concat URLs. The prototype's mock slugs are display-only.

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
present, 3 KPI StatCards (Published Pages / Content Entries / Media Items) render values
from `buildAnalyticsKpiCards`, the two chart SectionCards render (area traffic + bar
top-pages) bound to the seeded `trend`/`topPages` series (no Sources/Devices cards),
changing the range Select re-reads the cache for the new range, and the top-content table
renders rows with the `onViewAll` action opening the `TopContentDrawer`.

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
