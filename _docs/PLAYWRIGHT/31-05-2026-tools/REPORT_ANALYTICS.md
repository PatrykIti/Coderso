# Analytics - Playwright Audit

Date: 31-05-2026  
Route: `/admin/analytics`

## What Was Clicked

- Sidebar Tools -> Analytics.
- Range select: Last 7 days, Last 30 days, Last 90 days, Year to date.
- Top Performing Content -> View all.
- Drawer Export button.

## What Worked

- The route loaded successfully.
- Every range option could be selected.
- KPI cards rendered consistently after each range change.
- The empty Top Performing Content table rendered without crashing.
- View all opened the top-content drawer.
- The drawer could be closed.
- Deep pass: after creating and publishing a real page fixture, the Analytics
  API reported published pages and `top-content` included the fixture.
- Deep pass: the Analytics UI showed the fixture in Top Performing Content and
  the drawer opened from View all.
- TASK-350 closure pass on 2026-06-01 verified that empty Analytics renders
  `No data yet` and next-action empty guidance instead of fake `0%` trend
  badges.
- TASK-350 closure pass verified a published page fixture in Top Content across
  Last 7 days, Last 30 days, Last 90 days, and Year to date.
- TASK-350 closure pass verified drawer Export creates a CSV file payload named
  `coderso-analytics-top-content-7d-2026-06-01.csv` containing the fixture row,
  with no browser console errors or page errors.

## What Did Not Work

Resolved by TASK-350 on 2026-06-01. No unresolved Analytics findings remain in
this report.

### [RESOLVED] Drawer Export button does not export

Original evidence:

- Playwright opened the Top Content drawer and clicked Export.
- The drawer closed, but no download or export request occurred.
- In the deep pass with real top-content data, clicking Export still only left
  the drawer state/UI changed; no export endpoint or file download was observed.

Resolution:

- Added range-scoped `GET /analytics/top-content/export` with strict query
  validation and CSV-only format support.
- Added `exportTopContent` admin client behavior and wired `TopContentDrawer`
  Export to a real CSV Blob download with loading/error/empty-row states.
- Added CSV escaping and formula-guarding in the Analytics service.
- Export no longer closes the drawer as its only action.

### [RESOLVED] Empty KPI semantics were ambiguous

Original evidence:

- Empty Analytics rendered `0` totals and `0%`/down trend badges, which made
  "no data yet" look like measured negative activity.

Resolution:

- KPI derivation now distinguishes `No data yet`, `No activity in range`, and
  `New`.
- Empty workspace values render as `-` with neutral badges; existing workspaces
  with quiet selected ranges keep their real totals and show `No activity in
  range`.

### [RESOLVED] Top Content empty states lacked next action

Original evidence:

- Top Content table/drawer/panel only said "No content activity yet" or
  "No activity for this period."

Resolution:

- Empty Top Content states now say: "No content activity yet. Publish content or
  widen the date range."

## Data Notes

- The initial pass only proved empty-state behavior.
- The deep pass created a published page fixture. API evidence:
  `publishedPages` was non-zero and `top-content` included the fixture.
- The fixture was deleted after the pass.
- TASK-350 closure proof created a temporary admin user/session and page fixture,
  then deleted the fixture, session, user, and role after the pass.
- The focused browser proof used Chrome DevTools Protocol against local
  Chromium. The first run exposed a stale Vite optimized dependency cache
  (`504 Outdated Optimize Dep`); the cache was regenerated before the passing
  proof.

## Source References

- `core/admin/ui/analytics/AnalyticsPage.tsx`
- `core/admin/ui/analytics/KpiCards.tsx`
- `core/admin/ui/analytics/AnalyticsCharts.tsx`
- `core/admin/ui/analytics/TopContentTable.tsx`
- `core/admin/ui/analytics/TopContentDrawer.tsx`
- `core/admin/services/analyticsClient.ts`
- `core/server/routes/analyticsRoutes.ts`
