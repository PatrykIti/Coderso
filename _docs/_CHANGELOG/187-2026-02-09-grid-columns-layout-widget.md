# 187-2026-02-09 - Grid columns layout widget

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-050-15-03, TASK-050-15, TASK-050

## Summary
- Added the `grid-columns` layout widget with repeatable column slots, responsive span tokens, and full Wizard/Visual/Advanced editor support.

## Key Changes
- CMS/Widgets: Introduced `grid-columns` core widget with variants (`equal`, `asymmetric`, `masonry-lite`).
- CMS/Widgets: Added repeatable `column` slot support (`minItems: 2`, `maxItems: 6`) and deterministic slot markers in runtime output.
- CMS/Widgets: Added responsive per-column span model (`desktop/tablet/mobile`) with variant-aware fallback spans.
- Admin/UI: Added Grid Columns editors with Visual-first IA for variant, sizing, and surface controls.
- Admin/UI: Wired Grid Columns into core widget registration and runtime no-op editor map.
- Tests: Added dedicated unit coverage (`gridColumns.test.tsx`) and expanded renderer/template-editor/block-list tests for nested column slot flow.
- Docs/Tasks: Marked `TASK-050-15-03` done, updated board progress, and added Grid Columns widget documentation.
