# 875. TASK-274-04 Logo Cloud layouts and marquee

Date: 2026-05-19
Version: Unreleased
Tasks: TASK-274, TASK-274-04

## Key Changes

### CMS Widgets

- Expanded Logo Cloud layout ownership with schema-owned `rowMode` and
  `motionMode` fields for Strip overflow and marquee behavior.
- Eased Dense layout breakpoints so six columns return only at `xl`, reducing
  horizontal pressure for max-count logo sets on smaller desktop widths.
- Added single-row scroll and marquee runtime behavior for Strip, with reduced
  motion fallback plus pause-on-hover/focus behavior through shared public/admin
  style owners.

### QA and Documentation

- Added focused widget, renderer, editor-wave, and CSS parity proof for the new
  layout markers and shared marquee style contract.
- Refreshed the Logo Cloud report note, widget docs, task statuses, board
  counts, and changelog index so `BF-03`, `BF-04`, and `BF-05` now point at the
  landed `TASK-274-04` implementation.
