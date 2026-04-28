# TASK-028-03: Analytics UI Wiring
# FileName: TASK-028-03_Analytics_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-028-02, TASK-006-20  
**Status:** Done (2026-01-30)

---

## Overview

Wire Analytics UI components to real analytics API.

## UI Scope

Use:
- `core/admin/ui/analytics/AnalyticsPage.tsx`
- `core/admin/ui/analytics/KpiCards.tsx`
- `core/admin/ui/analytics/AnalyticsCharts.tsx`
- `core/admin/ui/analytics/TopContentTable.tsx`
- `core/admin/ui/analytics/TopContentDrawer.tsx`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/analyticsClient.ts` | `getOverview`, `getTopContent` |
| `core/admin/ui/analytics/AnalyticsPage.tsx` | load + refresh |
| `core/admin/ui/analytics/TopContentTable.tsx` | bind list to API |
| `core/admin/ui/analytics/TopContentDrawer.tsx` | use API data |

### UX notes

- Keep loading skeletons and empty states.
- Use `rangeDays` (from UI filter) when calling API.

## Testing Requirements

- `tests/unit/admin/analyticsClient.test.ts` (new).
- Update `tests/unit/ui/analytics.test.tsx` (live data render).

## Documentation Updates Required

- `_docs/CMS_API.md` note analytics data is used in UI.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-analytics-ui-wiring.md`
