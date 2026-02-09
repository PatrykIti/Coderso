# 183-2026-02-08 - Content list widget

Date: 2026-02-08
Version: Unreleased
Tasks: TASK-050-14-01, TASK-050-14, TASK-050

## Summary
- Added new `content-list` dynamic widget with server-side runtime data resolution and full Wizard/Visual/Advanced editor support.

## Key Changes
- CMS/Widgets: Implemented `content-list` schema, defaults, normalization, and renderer variants (`cards`, `list`, `compact`).
- CMS/Widgets: Added runtime resolver for content-source filtering/sorting (status scope, taxonomy tag, featured, author, search).
- CMS/Site: Hydrated `content-list` blocks in public page rendering and template runtime preview before SSR output.
- CMS/Site: Added deterministic runtime markers (`data-content-list-*`) for testing and diagnostics.
- Admin/UI: Added `ContentListEditors` with Visual-first IA and content type source selection.
- Admin/UI: Registered Content List in core/admin/runtime widget pipelines for template editor and runtime preview.
- Tests: Added dedicated Content List unit tests and extended public renderer coverage for resolved runtime payload rendering.
- Docs/Tasks: Marked `TASK-050-14-01` as done and set `TASK-050-14` to in-progress.
