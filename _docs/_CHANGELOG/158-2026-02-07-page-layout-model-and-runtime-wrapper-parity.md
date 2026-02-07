# 158-2026-02-07 - Page layout model and runtime wrapper parity

Date: 2026-02-07
Version: Unreleased
Tasks: TASK-051-01, TASK-051-02

## Summary
- Added a normalized page layout model and aligned runtime rendering/preview so wrapper/layout behavior is consistent between preview and published output.

## Key Changes
- CMS/Pages: introduced shared page layout normalization (`settings.layout`) with deterministic defaults.
- CMS/Pages: extended strict page validation for layout tokens and inheritable block layout values.
- CMS/Pages: normalized page layout data on create/update/publish flows to avoid renderer drift.
- CMS/Site: runtime page renderer now applies wrapper container, max width, background, wrapper padding, and section gap from page settings.
- CMS/Widgets: `WidgetRenderer` now resolves `inherit` layout tokens from page section defaults.
- CMS/Preview: unified preview target support and contract for `page`, `content`, and `widget-template` runtime previews.
- CMS/Site: runtime preview path uses the same rendering pipeline as published output and supports dev module fallback loading.
- Tests/Docs: added coverage for layout normalization + runtime rendering parity and updated preview/runtime documentation.
