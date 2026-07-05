# TASK-483-05: Admin Client And Analytics Page Rewire
# FileName: TASK-483-05-Admin-Client-And-Analytics-Page-Rewire.md

**Parent Task:** TASK-483
**Priority:** High
**Category:** Tools / Analytics / Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-483-04
**Status:** ✅ Done
**Started:** ``
**Completed:** `2026-07-05`

---

## Overview

Wire the admin Analytics surface to real traffic data. Extend
`core/admin/services/analyticsClient.ts` with cached traffic-overview /
top-pages-by-views clients (cache keys, TTLs, cached wrappers + route prefetch
warmup) following the shared cache contract. `cacheBus` is **N/A by design**
for these read-only traffic caches: no admin write mutates traffic data, so
there is no mutating broadcaster — exactly like the existing
`getOverviewCached` / `getTopContentCached` pattern (details in L01; do not
invent a broadcast topic). L01 also owns extending the `/analytics` warm entry
in `core/admin/utils/adminPrefetch.ts` so the page's new primary traffic caches
are prefetched, not only the demoted content-inventory caches. Then rewire
`AnalyticsPage.tsx` + `AnalyticsCharts.tsx` so KPIs (visitors / pageviews /
sessions / bounce), the trend series, sources / devices / referrers, and the
top-pages table reflect real numbers — L02 must update the two EXISTING Vitest
suites that mock the analytics client with closed module factories
(`tests/vitest/ui/analytics.test.tsx`,
`tests/vitest/ui-integration/tools-analytics-restyle.test.tsx`, incl. its
"no Sources donut" assertion) in the same change so gates stay green. Preserve
the existing CSV export affordance.

## Sub-Tasks

| ID | Title | Effort | Status |
|---|---|---|---|
| TASK-483-05-L01 | Traffic Analytics Client And Cache Contract | Medium | ✅ Done |
| TASK-483-05-L02 | Analytics Page And Charts Real Series Rewire | Medium | ✅ Done |

## Dependencies

- TASK-483-04 (traffic endpoints + response contract). L02 depends on L01.

## Testing Requirements

- **Vitest** for L01 (cache read/write/hydrate, key shape, plus updated
  `/analytics` warm expectations in `tests/vitest/admin/adminPrefetch.test.ts`)
  and L02 (`tests/vitest/ui-integration/*` render flow of `AnalyticsPage` with
  mocked traffic client, including KPI/series/export behavior, plus the
  existing-suite factory-mock updates listed in L02).
- `bun --cwd core lint`, `bun --cwd core lint:types` (treat `react-hooks/*` as
  contract issues — no synchronous `setState` in effects).
