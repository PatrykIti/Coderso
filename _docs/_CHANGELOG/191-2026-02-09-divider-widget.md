# 191-2026-02-09 - Divider widget

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-050-15-07, TASK-050-15, TASK-050

## Summary
- Added `divider` widget as a reusable layout separator with optional centered label.

## Key Changes
- CMS/Widgets: Added `divider` core widget with variants `line`, `dashed`, and `label-center`.
- CMS/Widgets: Added divider style model for label, thickness, color, width mode/custom width, and vertical spacing.
- CMS/Widgets: Added deterministic runtime markers for divider variant, dimensions, and label state.
- Admin/UI: Added Divider Wizard/Visual/Advanced editors with Visual-first section structure.
- Platform: Wired Divider into core widget registration for admin and runtime preview parity.
- Tests: Added `divider.test.tsx` and expanded renderer/template editor assertions for Divider behavior.
- Docs/Tasks: Marked `TASK-050-15-07` done and completed layout primitives pack `TASK-050-15`.
