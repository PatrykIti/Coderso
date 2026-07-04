# TASK-478-03: Dockable Inline Mark Toolbar (Top/Left/Right)
# FileName: TASK-478-03-Dockable-Inline-Mark-Toolbar.md

**Parent Task:** TASK-478
**Priority:** Low
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-475 (mark toolbar)
**Status:** ⏳ To Do

---

## Overview

Add a control to move the inline mark toolbar off the top of the block to its
**left or right side**, so that neither the toolbar nor the native color picker it
spawns covers the text being edited. The owner wants to color/format a fragment
while still seeing the text (the picker currently opens over the text because the
toolbar is pinned just above it).

## Current State (verified)

- `core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` `markToolbar` is
  `className="absolute -top-9 left-0 ..."` — always pinned above the text. The
  native color picker opens at the picker input's position, i.e. over the text.

## Implementation sketch

- Add a small dock toggle (e.g. a button cycling Top → Right → Left, or a drag
  affordance) that switches the toolbar's absolute placement:
  - top: `-top-9 left-0` (current),
  - right: vertical stack at `left-full top-0 ml-2`,
  - left: vertical stack at `right-full top-0 mr-2`.
- Persist the chosen side in local editor UI state (not the page document) so it
  applies to subsequent edits in the session. Reuse the existing toolbar-drag
  affordance if present, or a simple control.
- When docked left/right, lay the controls out vertically (or wrap) so the bar
  fits beside the block; ensure it stays on-screen near narrow columns (clamp).
- Keep the selection-snapshot / blur-guard / picker-activation behavior unchanged
  (TASK-475/477); only the position changes.

## Regression-test shape

- Vitest (`page-authoring-canvas`): toggling the dock changes the toolbar's
  placement classes/`data-*` attribute; the swatch/picker/link handlers still fire
  regardless of side.

## Validation

- `bun --cwd core lint`, `bun --cwd core lint:types`, canvas Vitest; live smoke:
  dock the toolbar right/left and confirm the color picker no longer covers the
  edited text.
