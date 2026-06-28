# TASK-483-05-L02: Analytics Page And Charts Real Series Rewire
# FileName: TASK-483-05-L02-Analytics-Page-And-Charts-Real-Series-Rewire.md

**Parent Subtask:** TASK-483-05
**Priority:** High
**Category:** Tools / Analytics / Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-483-05-L01
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

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
  client — KPIs, trend, breakdowns, top-pages, export, error, empty state.
- `bun --cwd core lint`, `bun --cwd core lint:types` — keep
  `eslint-plugin-react-hooks` recommended preset; no synchronous `setState` in
  effects; preserve cache hydration + background revalidation semantics.
- `git diff --check`.
