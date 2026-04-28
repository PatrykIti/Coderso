# 189-2026-02-09 - Split layout widget

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-050-15-05, TASK-050-15, TASK-050

## Summary
- Added `split-layout` widget as a reusable two-pane layout primitive with responsive collapse behavior and ratio controls.

## Key Changes
- CMS/Widgets: Added `split-layout` core widget with fixed `left`/`right` slots and variants (`50-50`, `40-60`, `60-40`).
- CMS/Widgets: Added split model tokens for desktop/tablet ratio, mobile collapse mode, mobile reverse order, gap and vertical alignment.
- CMS/Widgets: Added deterministic runtime markers for split ratios, mobile behavior, pane sides, and pane item counts.
- Admin/UI: Added Split Layout Wizard/Visual/Advanced editors with Visual-first section structure.
- Platform: Wired Split Layout into core widget registration for admin and runtime preview parity.
- Tests: Added `splitLayout.test.tsx` and expanded renderer/template editor assertions for Split Layout behavior.
- Docs/Tasks: Marked `TASK-050-15-05` done and updated widget/task/changelog docs.
