# 177-2026-02-08 - CTA banner widget

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-12-05, TASK-050-12, TASK-050

## Summary
- Added new `cta-banner` core widget with deterministic rendering and full Wizard/Visual/Advanced editor support.

## Key Changes
- CMS/Widgets: Implemented `cta-banner` schema, defaults, normalization, and renderer variants (`centered`, `split`, `with-badge`).
- CMS/Widgets: Added stable runtime markers (`data-cta-banner-*`) for runtime preview and renderer assertions.
- Admin/UI: Added `CtaBannerEditors` with section-based Visual mode for content copy, action controls, color pickers, and spacing/border tuning.
- Admin/UI: Registered CTA Banner in core/admin/runtime widget pipelines to expose it in template editor and runtime preview.
- Tests: Added dedicated CTA Banner unit tests and extended renderer + widget-template editor integration coverage.
- Docs/Tasks: Marked `TASK-050-12-05` as done and closed `TASK-050-12` conversion widgets pack.
