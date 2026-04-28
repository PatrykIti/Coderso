# 174-2026-02-08 - Testimonials widget

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-12-02, TASK-050-12, TASK-050

## Summary
- Added new `testimonials` core widget with deterministic runtime output and full editor coverage across Wizard, Visual, and Advanced modes.

## Key Changes
- CMS/Widgets: Implemented `testimonials` model, schema, defaults, normalization helpers, and renderer variants (`grid`, `spotlight`, `slider-static`).
- CMS/Widgets: Added runtime output markers (`data-testimonials-*`, `data-testimonial-rating`) to keep preview/runtime assertions stable.
- Admin/UI: Added `TestimonialsEditors` with clear mode boundaries: Wizard onboarding, Visual section-based daily editing, Advanced technical normalization scope.
- Admin/UI: Registered Testimonials in core/admin/runtime widget registration so it is available in template editor and runtime preview.
- Tests: Added dedicated unit tests for testimonials and expanded renderer + widget-template editor integration coverage.
- Docs/Tasks: Marked `TASK-050-12-02` as done and updated task board counters.
