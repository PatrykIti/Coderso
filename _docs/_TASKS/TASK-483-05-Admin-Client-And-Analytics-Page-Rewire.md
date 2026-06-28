# TASK-483-05: Admin Client And Analytics Page Rewire
# FileName: TASK-483-05-Admin-Client-And-Analytics-Page-Rewire.md

**Parent Task:** TASK-483
**Priority:** High
**Category:** Tools / Analytics / Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-483-04
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

Wire the admin Analytics surface to real traffic data. Extend
`core/admin/services/analyticsClient.ts` with cached traffic-overview /
top-pages-by-views clients (cache keys, TTLs, `cacheBus` topics) following the
shared cache contract, then rewire `AnalyticsPage.tsx` + `AnalyticsCharts.tsx`
so KPIs (visitors / pageviews / sessions / bounce), the trend series, sources /
devices / referrers, and the top-pages table reflect real numbers. Preserve the
existing CSV export affordance.

## Sub-Tasks

| ID | Title | Effort | Status |
|---|---|---|---|
| TASK-483-05-L01 | Traffic Analytics Client And Cache Contract | Medium | ⏳ To Do |
| TASK-483-05-L02 | Analytics Page And Charts Real Series Rewire | Medium | ⏳ To Do |

## Dependencies

- TASK-483-04 (traffic endpoints + response contract). L02 depends on L01.

## Testing Requirements

- **Vitest** for L01 (cache read/write/hydrate, key shape) and L02
  (`tests/vitest/ui-integration/*` render flow of `AnalyticsPage` with mocked
  traffic client, including KPI/series/export behavior).
- `bun --cwd core lint`, `bun --cwd core lint:types` (treat `react-hooks/*` as
  contract issues — no synchronous `setState` in effects).
