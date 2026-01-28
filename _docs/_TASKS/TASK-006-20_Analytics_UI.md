# TASK-006-20: Analytics UI (Visual)
# FileName: TASK-006-20_Analytics_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-024  
**Status:** To Do

---

## Overview

Create the analytics overview screen (KPIs, charts, date range). Visual-only
until analytics endpoints exist.

## Reference UI

- `_docs/UI/admin_panel/20-analytics/code.html`
- `_docs/UI/admin_panel/20-analytics/screen.png`

## UI Composition

**Wrapper:** `AdminShell`

**Sections:**
- KPI cards (visits, conversions, top pages).
- Date range picker.
- Chart panels (line + bar).
- Top content table.

## Shadcn Components

- `Card`, `Button`, `Select`, `Table`, `Badge`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/analytics/AnalyticsPage.tsx` | create | main layout |
| `core/admin/ui/analytics/KpiCards.tsx` | create | KPI row |
| `core/admin/ui/analytics/AnalyticsCharts.tsx` | create | chart panels |
| `core/admin/ui/analytics/TopContentTable.tsx` | create | table |

## Data + State

- `GET /analytics/overview` (future).
- `GET /analytics/top-content` (future).

## Unit Tests

- `tests/unit/ui/analytics.test.tsx` renders KPIs + charts.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-analytics-ui.md`
