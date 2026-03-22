# TASK-141: Analytics Admin UI Assistant Documentation Refresh
# FileName: TASK-141_Analytics_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/analytics/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Analytics surface based on a
real authenticated walkthrough of the local admin UI. The goal is to split
Analytics out of the old combined operations article and replace it with a
guided document that matches the shipped KPI cards, range selector, charts, top
content table, and ranking drawer workflow on `/admin/analytics`.

## Scope

1. Review the current combined operations assistant doc and the required
   `docs/` authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/analytics` with an
   authenticated session and record actual behavior.
3. Create a dedicated Analytics doc using the `Basic / Medium / Instruction /
   Advanced` structure with more guided user instructions.
4. Update the coverage matrix so `/analytics` points to the new canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the Analytics page shell:
   - date-range selector,
   - KPI cards,
   - loading/error state,
   - page header copy.
2. Capture the charts/content flow:
   - content activity chart,
   - top performing content summary,
   - top content table,
   - `View all` action.
3. Capture the `Top Content` drawer flow:
   - full ranking list,
   - empty-state behavior if applicable,
   - `Close` and `Export` actions.
4. Rewrite the doc without keeping Analytics mixed into the same assistant page
   as Audit, Access Logs, Backups, and Import/Export.

## Acceptance Criteria

1. Analytics has its own assistant doc that describes the current shipped UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about range selection, KPI review, chart reading, top
   content analysis, and the ranking drawer.
4. The coverage matrix points `/analytics` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Analytics UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/analytics/*`

## Documentation Updates Required

- `docs/screens/analytics.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-141_Analytics_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Analytics UI:
  - page shell,
  - date-range selector,
  - KPI cards,
  - content activity chart,
  - top content table,
  - `Top Content` drawer.
- The rewritten doc was verified against:
  - `core/admin/ui/analytics/AnalyticsPage.tsx`
  - `core/admin/ui/analytics/KpiCards.tsx`
  - `core/admin/ui/analytics/AnalyticsCharts.tsx`
  - `core/admin/ui/analytics/TopContentTable.tsx`
  - `core/admin/ui/analytics/TopContentDrawer.tsx`
- No automated lint or test commands were run because this was a docs-only
  change.
