# 1180 - TASK-336 Widget Contract Historical Closure

**Date:** 2026-06-18
**Version:** Unreleased
**Tasks:** TASK-336, TASK-336-17

## Key Changes

### Task Board
- Closed the stale TASK-336 parent and TASK-336-17 closure leaf as `Done`.
- Recorded that `Deprecated` is not a canonical task status for this repo.
- Kept the widget editor contract program as completed historical
  infrastructure rather than marking it superseded.

### Widget Boundary
- Documented the current boundary: Pages v2 use section/block documents, while
  retained non-Page widget surfaces still depend on widget registry/editor
  contracts.
- Linked future active legacy widget surface removal to `TASK-468-07-L02`
  instead of hiding that work inside TASK-336 closure.

### Closure Evidence
- Preserved `TASK-336-19` as the final implementation evidence for the widget
  contract wave, including the strict smoke result with `adminFailures=0`,
  `publicFailures=0`, `fixtureGaps=0`, and `metadataGaps=0`.
- Recorded the 2026-06-18 read-only closure audit finding that TASK-336 should
  close as `Done`, not `Deprecated`, because widget contracts remain active
  outside Pages.

## Validation

- `git diff --check`
