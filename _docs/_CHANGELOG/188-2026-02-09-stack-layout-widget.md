# 188-2026-02-09 - Stack layout widget

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-050-15-04, TASK-050-15, TASK-050

## Summary
- Added `stack` layout widget for responsive flow composition with deterministic runtime markers and full editor coverage.

## Key Changes
- CMS/Widgets: Added `stack` core widget with variants (`vertical`, `horizontal`, `responsive`).
- CMS/Widgets: Added responsive flow model (`direction.desktop/tablet/mobile`, `gap.desktop/tablet/mobile`) plus `align`, `justify`, and `wrap`.
- CMS/Widgets: Added fixed `content` slot rendering for nested widget composition.
- Admin/UI: Added Stack Wizard/Visual/Advanced editors with Visual-first IA sections.
- Platform: Wired Stack widget into core widget registration for admin and runtime preview parity.
- Tests: Added `stack.test.tsx` and extended renderer/template-editor assertions for stack markers and visual sections.
- Docs/Tasks: Marked `TASK-050-15-04` done and updated widget/task/changelog docs.
