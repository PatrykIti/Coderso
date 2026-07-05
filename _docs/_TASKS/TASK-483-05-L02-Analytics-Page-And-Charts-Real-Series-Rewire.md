# TASK-483-05-L02: Analytics Page And Charts Real Series Rewire
# FileName: TASK-483-05-L02-Analytics-Page-And-Charts-Real-Series-Rewire.md

**Parent Subtask:** TASK-483-05
**Priority:** High
**Category:** Tools / Analytics / Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-483-05-L01
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

---

## Overview

- **Goal:** Rewire the live admin Analytics screen to render real traffic data:
  KPIs (visitors / pageviews / sessions / bounce), the daily pageview trend,
  sources / devices / referrers breakdowns, and a real top-pages-by-views table,
  while keeping the CSV export.
- **Owning module(s) to extend:**
  - `core/admin/ui/analytics/AnalyticsPage.tsx` — fetch traffic overview + top
    pages via the cached client (TASK-483-05-L01), build KPI cards from
    `TrafficTotals`, keep the range picker and export button.
  - `core/admin/ui/analytics/AnalyticsCharts.tsx` — render the real trend series
    and `topPages` (by views, not `computeScore`); add source/device/referrer
    breakdown visuals.
  - `KpiCards.tsx` / `TopContentTable.tsx` / `TopContentDrawer.tsx` — adapt to the
    traffic row shape (`path` + `views` + `visitors`) or add a sibling
    `TopPagesTable` if the content shape must remain for the demoted inventory view.
  - `tests/vitest/ui/analytics.test.tsx` — EXISTING suite; its closed
    module-factory mock `vi.mock("@/services/analyticsClient", () => ({...}))`
    (line 113) exports only `getOverview(Cached)` / `getCachedOverview` /
    `getTopContent(Cached)` / `getCachedTopContent` / `exportTopContent`. Once
    `AnalyticsPage` imports the new traffic functions the factory lacks the
    exports and the suite crashes. Extend the factory with
    `getCachedTrafficOverview` / `getTrafficOverviewCached` /
    `getCachedTopPages` / `getTopPagesCached` / `exportTopPages` and adjust the
    `AnalyticsPage` + `buildAnalyticsKpiCards` assertions to the traffic-first
    page (or its `buildTrafficKpiCards` successor).
  - `tests/vitest/ui-integration/tools-analytics-restyle.test.tsx` — EXISTING
    suite with the same closed factory mock (line 47): extend it identically.
    Its test `"renders KPI cards + area/bar cards from seeded analytics (no
    Sources donut)"` (line 146) hard-codes the OLD content-inventory KPI row and
    asserts three traffic-page surfaces ABSENT — the traffic rewire reverses ALL
    of them, so every one of these must be updated (fixing only the sources donut
    leaves the suite red at lines 155/163):
    - line 155 `expect(...).not.toContain("Visitors")` — REMOVE / reverse:
      `buildTrafficKpiCards` now renders the "Unique Visitors" KPI, so assert it
      is PRESENT.
    - line 163 `expect(...).not.toMatch(/bounce/i)` — REMOVE / reverse:
      `buildTrafficKpiCards` now renders the "Bounce Rate" KPI, so assert it is
      PRESENT.
    - line 162 `expect(...).not.toMatch(/\bsources\b/i)` — REMOVE / replace with
      an assertion that the new sources / devices / referrers breakdown visuals
      render from the traffic overview.
    - line 154 `expect(...).toContain("Published Pages")` plus its comment at
      lines 153-154 ("KPI labels come from buildAnalyticsKpiCards ... NOT
      'Visitors'") — RECONCILE with the demoted-inventory decision: since traffic
      KPIs are now primary, drop the "Published Pages" KPI-row assertion (or move
      it to assert the secondary content-inventory section, matching the
      Out-of-scope note below).
    - Update the seeded `overview` fixture (lines 12-22) so it carries the
      traffic shape the rewired page reads (`totals`/`previous` with
      visitors/pageviews/sessions/bounceRate, `trend`, `sources`, `devices`,
      `referrers`, `topPages`) instead of the content-inventory
      pages/publishedPages/entries totals, and add the new traffic client exports
      to the factory mock.
- **Source-of-truth docs:** `_docs/ADMIN_CACHE.md`, `_docs/CMS_API.md`.
- **Out-of-scope:** server routes (TASK-483-04), client cache (L01). The content
  inventory cards may remain as a secondary section but must no longer be the
  primary "traffic" numbers.

## Security Contract

- **Endpoint visibility:** internal admin page; no new endpoints.
- **Auth model:** existing admin session / `AdminShell` guard.
- **RBAC:** unchanged; the page already lives behind admin auth.
- **CSRF expectations:** N/A (reads/exports only).
- **Rate-limit bucket:** N/A.
- **Validation schema-owner module:** consumes typed `TrafficOverview` from L01.
- **Anti-abuse controls:** N/A.
- **Secret/PII handling:** renders only aggregate counts + path/host strings;
  nothing sensitive enters component state or cache.

## Implementation Pseudocode

```tsx
// AnalyticsPage.tsx — replace content-inventory source with traffic source
const createInitialState = () => {
  const overview = getCachedTrafficOverview(30);
  const topPages = getCachedTopPages({ rangeDays: 30, limit: 50 });
  return { overview, topPages: topPages ?? [], isLoading: !(overview && topPages) };
};

useEffect(() => {
  let active = true;
  Promise.all([
    getTrafficOverviewCached(rangeDays, { force: !getCachedTrafficOverview(rangeDays) }),
    getTopPagesCached({ rangeDays, limit: 50, force: !getCachedTopPages({ rangeDays, limit: 50 }) }),
  ]).then(([o, tp]) => { if (!active) return; setError(null); setOverview(o); setTopPages(tp); })
    .catch((e) => { if (!active) return; setOverview(null); setTopPages([]);
      setError(isApiClientError(e) ? e.message : "Failed to load analytics data."); })
    .finally(() => { if (active) setIsLoading(false); });
  return () => { active = false; };
}, [rangeDays]);

export function buildTrafficKpiCards(o: TrafficOverview | null): KpiCard[] {
  if (!o) return [];
  return [
    kpi("visitors", "Unique Visitors", o.totals.visitors, o.previous.visitors),
    kpi("pageviews", "Pageviews", o.totals.pageviews, o.previous.pageviews),
    kpi("sessions", "Sessions", o.totals.sessions, o.previous.sessions),
    kpiPct("bounce", "Bounce Rate", o.totals.bounceRate, o.previous.bounceRate),
  ];
}

const handleExport = useCallback(() => exportTopPages({ rangeDays, limit: 50 }), [rangeDays]);

// AnalyticsCharts.tsx
<AnalyticsCharts trend={overview?.trend ?? []}
  topPages={overview?.topPages ?? []}
  sources={overview?.sources ?? []} devices={overview?.devices ?? []}
  referrers={overview?.referrers ?? []} />
```

Data flow: hydrate-from-cache → background revalidate (no mount-force loop),
exactly like the current page. The range picker reuses the existing `Select`
(7/30/90/ytd). Export downloads the traffic CSV from TASK-483-04-L03.

Error handling: reuse the existing `Alert` + `isApiClientError` pattern. Empty
data renders zeroed KPIs and an empty-state table, not crashes.

Regression-test shape (Vitest ui-integration,
`tests/vitest/ui-integration/analyticsTrafficPage.test.tsx`):

```ts
test("renders visitor/pageview/session/bounce KPIs from traffic overview", async () => {});
test("top-pages table shows real view counts (not computeScore)", async () => {});
test("export button calls exportTopPages", async () => {});
test("api error shows Alert", async () => {});
```

## Testing Requirements

- **Vitest** (`tests/vitest/ui-integration/*`): render flow with a mocked traffic
  client — KPIs, trend, breakdowns, top-pages, export, error, empty state
  (new suite `tests/vitest/ui-integration/analyticsTrafficPage.test.tsx`).
- Update the two EXISTING suites in the same change so gates stay green:
  `tests/vitest/ui/analytics.test.tsx` and
  `tests/vitest/ui-integration/tools-analytics-restyle.test.tsx`. For the
  restyle suite this means: extend the closed factory mock with the new traffic
  client exports, retype the seeded `overview` fixture to the traffic shape, and
  reverse/reconcile ALL of the now-stale KPI-row assertions — not just the
  sources donut: remove `not.toContain("Visitors")` (line 155) and
  `not.toMatch(/bounce/i)` (line 163) — assert those KPIs PRESENT — replace the
  `not.toMatch(/\bsources\b/i)` sources-absent assertion (line 162) with a
  breakdown-present assertion, and reconcile the `toContain("Published Pages")`
  KPI assertion (line 154, plus its "NOT 'Visitors'" comment) with the demoted
  inventory (see Owning modules above). Do NOT touch
  `tests/vitest/admin/adminPrefetch.test.ts` (owned by L01).
- `bun --cwd core lint`, `bun --cwd core lint:types` — keep
  `eslint-plugin-react-hooks` recommended preset; no synchronous `setState` in
  effects; preserve cache hydration + background revalidation semantics.
- `git diff --check`.
