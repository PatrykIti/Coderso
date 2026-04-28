# 190-2026-02-09 - Spacer widget

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-050-15-06, TASK-050-15, TASK-050

## Summary
- Added `spacer` widget as a reusable layout primitive for responsive vertical spacing.

## Key Changes
- CMS/Widgets: Added `spacer` core widget with variants `responsive` and `fixed`.
- CMS/Widgets: Added spacer height model (`desktop/tablet/mobile`) with token-or-pixel normalization.
- CMS/Widgets: Added deterministic runtime markers for spacer variant, breakpoint heights, and preview guide state.
- Admin/UI: Added Spacer Wizard/Visual/Advanced editors with Visual-first section grouping.
- Platform: Wired Spacer into core widget registration for admin editor and runtime preview parity.
- Tests: Added `spacer.test.tsx` and expanded renderer/template editor assertions for Spacer behavior.
- Docs/Tasks: Marked `TASK-050-15-06` done and updated widget/task/changelog docs.
