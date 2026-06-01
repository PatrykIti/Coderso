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

## What Did Not Work

### [ISSUE] Drawer Export button does not export

Evidence:

- Playwright opened the Top Content drawer and clicked Export.
- The drawer closed, but no download or export request occurred.

Why:

- `TopContentDrawer` wires the Export button to `onOpenChange(false)`.
- There is no client call, generated file, or route handoff for analytics export.

How to fix:

- Add an analytics export endpoint or reuse an existing export service if one is
  intended.
- Make the button initiate a real download and show error/loading states.
- If export is out of scope, disable the button or remove it.
- Add a Playwright/component test that expects a download or disabled state.

## Data Notes

- The local dataset had no published pages, content entries, media items, or top
  content rows. The dashboard correctly rendered zero/empty states.
- Initial automation sampled one loading state too early during rapid range
  changes. A follow-up focused pass waited for loading to settle and confirmed
  stable KPI/empty-table rendering for all ranges.

## Source References

- `core/admin/ui/analytics/AnalyticsPage.tsx`
- `core/admin/ui/analytics/KpiCards.tsx`
- `core/admin/ui/analytics/AnalyticsCharts.tsx`
- `core/admin/ui/analytics/TopContentTable.tsx`
- `core/admin/ui/analytics/TopContentDrawer.tsx`
- `core/admin/api/analyticsClient.ts`
- `core/server/routes/admin/analyticsRoutes.ts`

