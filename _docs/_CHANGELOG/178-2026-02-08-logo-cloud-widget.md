# 178-2026-02-08 - Logo cloud widget

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-13-01, TASK-050-13, TASK-050

## Summary
- Added new `logo-cloud` core widget with deterministic rendering and full Wizard/Visual/Advanced editor support.

## Key Changes
- CMS/Widgets: Implemented `logo-cloud` schema, defaults, normalization, and renderer variants (`grid`, `strip`, `dense`).
- CMS/Widgets: Added deterministic runtime markers (`data-logo-cloud-*`) for preview/runtime assertions.
- Admin/UI: Added `LogoCloudEditors` with Visual-first IA for logo list management, variant selection, and display behavior controls.
- Admin/UI: Registered Logo Cloud in core/admin/runtime widget pipelines for template editor and runtime preview.
- Tests: Added dedicated Logo Cloud unit tests and extended renderer + widget-template editor integration coverage.
- Docs/Tasks: Marked `TASK-050-13-01` as done and moved `TASK-050-13` pack to in-progress with next step `TASK-050-13-02`.
