# 180-2026-02-08 - Stats KPI widget

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-13-03, TASK-050-13, TASK-050

## Summary
- Added new `stats-kpi` core widget with deterministic metric rendering and full Wizard/Visual/Advanced editor support.

## Key Changes
- CMS/Widgets: Implemented `stats-kpi` schema, defaults, normalization, and renderer variants (`cards`, `inline`, `split-highlight`).
- CMS/Widgets: Added deterministic runtime markers (`data-stats-kpi-*`) for preview/runtime assertions and QA stability.
- Admin/UI: Added `StatsKpiEditors` with Visual-first IA for variant selection, metric structure, copy management, ordering, and color controls.
- Admin/UI: Registered Stats KPI in core/admin/runtime widget pipelines for template editor and runtime preview.
- Tests: Added dedicated Stats KPI unit tests and extended renderer + widget-template editor integration coverage.
- Docs/Tasks: Marked `TASK-050-13-03` as done and moved pack progress to next step `TASK-050-13-04`.
