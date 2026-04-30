# 779. TASK-246 menus drop intent and indicator stability

Date: 2026-04-30
Version: 1.0.0
Tasks: TASK-246

## Key Changes

### CMS Menus/Admin UI
- Changed Menus editor row drop intent to use stable top/middle/bottom zones:
  top is `before`, middle is `child`, and bottom is `after`.
- Removed the hard-coded horizontal child threshold so sub-menu placement no
  longer requires moving the cursor right while dragging from the handle lane.
- Replaced normal-flow before/after drop lines with absolute row overlays so
  hover feedback no longer shifts the target row.
- Strengthened before/after indicators with primary color lines and labels.
- Centered the drag handle with fixed `h-12` so the grab cursor does not cover
  the full row height.

### Documentation
- Added TASK-246 with implementation pseudocode, security contract, acceptance
  criteria, and validation plan.
- Updated Menus screen guidance, task board, and changelog index.

## Validation

- PASS `bun run test:vitest -- tests/vitest/ui/menu-editor-validation.test.ts tests/vitest/ui/menu-tree.test.tsx tests/vitest/ui/menu-item-row.test.tsx tests/vitest/ui/menu-leaf-components.test.tsx`
- PASS `bun --cwd core lint`
- PASS `bun --cwd core lint:types`
- PASS `git diff --check`
