# 175-2026-02-08 - Pricing plans widget

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-12-03, TASK-050-12, TASK-050

## Summary
- Added new `pricing-plans` core widget with deterministic rendering and full Wizard/Visual/Advanced editor support.

## Key Changes
- CMS/Widgets: Implemented `pricing-plans` schema, defaults, normalization, and renderer variants (`three-plans`, `four-plans`, `comparison-rows`).
- CMS/Widgets: Added runtime markers (`data-pricing-*`, `data-pricing-highlighted`) for stable preview/runtime assertions.
- Admin/UI: Added `PricingPlansEditors` with section-based Visual mode, including plan/feature management, highlight selection, and color token controls.
- Admin/UI: Registered Pricing Plans in core/admin/runtime widget pipelines to expose it in template editor and runtime preview.
- Tests: Added dedicated unit tests for pricing plans and extended renderer + widget-template editor integration coverage.
- Docs/Tasks: Marked `TASK-050-12-03` as done and updated task board counters and in-progress pack note.
