# 538. TASK-140 redirects admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-140

## Key Changes

### Assistant Docs
- Split Redirects out of the old combined SEO/Redirects assistant article by
  adding `docs/screens/redirects.md`.
- Rewrote the Redirects guidance against the shipped UI instead of the old
  generic combined summary.
- Documented the real route workflow: active-routes summary, search field, empty
  state, create drawer, redirect type selector, active toggle, and row-level
  maintenance model.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/redirects` now maps to
  `docs/screens/redirects.md`.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/redirects`
  - empty state and create drawer
  - source verification for edit/toggle table actions because the local dataset
    had no existing redirect rows
- No automated lint or test commands were run because this was a docs-only
  change.
