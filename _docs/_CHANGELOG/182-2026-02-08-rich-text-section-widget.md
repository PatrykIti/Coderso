# 182-2026-02-08 - Rich text section widget

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-13-05, TASK-050-13, TASK-050

## Summary
- Added new `rich-text-section` core widget with secure HTML rendering and full Wizard/Visual/Advanced editor support.

## Key Changes
- CMS/Widgets: Implemented `rich-text-section` schema, defaults, normalization, and renderer variants (`single-column`, `two-column`, `article`).
- CMS/Widgets: Added sanitization strategy for HTML payloads (unsafe tags removed, unsafe link protocols neutralized).
- CMS/Widgets: Added deterministic runtime markers (`data-rich-text-*`) including output mode and TOC diagnostics.
- Admin/UI: Added `RichTextSectionEditors` with Visual-first IA for title/body editing, fallback blocks, reader options, and typography controls.
- Admin/UI: Registered Rich Text Section in core/admin/runtime widget pipelines for template editor and runtime preview.
- Tests: Added dedicated Rich Text Section unit tests and extended renderer + widget-template editor integration coverage.
- Docs/Tasks: Marked `TASK-050-13-05` as done and closed pack `TASK-050-13`.
