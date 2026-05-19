# 871. TASK-274-03 Logo Cloud item management and reorder

Date: 2026-05-19
Version: Unreleased
Tasks: TASK-274, TASK-274-03

## Key Changes

### CMS Widgets

- Reworked Logo Cloud repeated-item editing so repeated-logo changes go through
  the shared edit coordinator, keeping media-request invalidation and later
  item-management changes on one mutation path.
- Added drag-handle reorder and per-card drop targets in Visual mode so longer
  logo lists can be reordered without excessive Move button clicks.
- Replaced irreversible remove-only behavior with inline Undo that restores the
  exact removed logo at its previous index while still retaining Move up / Move
  down as deterministic fallback controls.

### QA and Documentation

- Extended the Logo Cloud editor wave tests with drag/drop, stale-drag, inline
  Undo, and pending-removal invalidation proof.
- Refreshed the Logo Cloud report note, widget docs, task statuses, board
  counts, and changelog index so `UX-02` and `UX-08` now point at the landed
  `TASK-274-03` implementation.
