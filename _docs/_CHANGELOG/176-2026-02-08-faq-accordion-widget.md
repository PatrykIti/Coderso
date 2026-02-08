# 176-2026-02-08 - FAQ accordion widget

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-12-04, TASK-050-12, TASK-050

## Summary
- Added new `faq-accordion` core widget with deterministic rendering and full Wizard/Visual/Advanced editor support.

## Key Changes
- CMS/Widgets: Implemented `faq-accordion` schema, defaults, normalization, and renderer variants (`single-column`, `two-column`, `compact`).
- CMS/Widgets: Added stable runtime markers (`data-faq-*`) for preview/runtime assertions, including open-state metadata.
- Admin/UI: Added `FaqAccordionEditors` with section-based Visual mode for variant selection, Q/A management, open-state controls, and color/spacing pickers.
- Admin/UI: Registered FAQ Accordion in core/admin/runtime widget pipelines to expose it in template editor and runtime preview.
- Tests: Added dedicated FAQ unit tests and extended renderer + widget-template editor integration coverage.
- Docs/Tasks: Marked `TASK-050-12-04` as done, updated task board counters, and moved conversion-pack next step to `TASK-050-12-05`.
