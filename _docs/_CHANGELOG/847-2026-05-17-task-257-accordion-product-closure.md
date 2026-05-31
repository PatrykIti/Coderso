# 847 - TASK-257 accordion product closure

Date: 2026-05-17
Version: Unreleased
Tasks: TASK-257, TASK-257-01, TASK-257-02, TASK-257-03, TASK-257-04, TASK-257-05

## Key Changes

### CMS Widgets

- Added an explicit all-collapsed initial state for Accordion when all-closed
  behavior is allowed, while preserving legacy default-open compatibility and
  shared non-collapsible enforcement.
- Expanded Accordion with widget-owned product controls for body text color,
  max width, summary/content padding, corner radius, title typography, and
  bounded motion presets.
- Upgraded the Accordion editor with visual variant preview cards, color-picker
  parity for all current color fields, plain-text item icons, and clearer
  all-closed copy.
- Kept shared repeatable-slot add/reorder out of Accordion-local code by
  deferring U5/U6 to the new shared TASK-293 builder follow-up.

### Documentation and QA

- Rebased the Accordion Playwright report onto a final fixed/deferred owner
  matrix so TASK-256 shared scope, FAQ scope, and TASK-293 blockers are clearly
  separated from the TASK-257 closure.
- Updated `_docs/_WIDGETS/ACCORDION.md`, `_docs/_TASKS/TASK-257*.md`, and the
  task board to match the final shipped Accordion contract and closure state.
- Added focused Vitest coverage for all-collapsed open-state handling, icon
  rendering, style/layout/motion token output, and the expanded editor controls.
