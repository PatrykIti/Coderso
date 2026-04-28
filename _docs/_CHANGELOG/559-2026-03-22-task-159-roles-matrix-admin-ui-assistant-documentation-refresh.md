# 559. TASK-159 roles matrix admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-159

## Key Changes

### Assistant Docs
- Split Roles Matrix out of the old combined Users/Roles assistant article by
  adding `docs/screens/roles-matrix.md`.
- Rewrote the route guidance against the shipped UI instead of leaving it inside
  the broader access-control summary.
- Documented the real route workflow: search, bulk role toggles, grouped
  permissions matrix, unsaved-changes footer, and add-role dialog.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/roles` now maps to
  `docs/screens/roles-matrix.md`.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/roles`
  - source verification against local Roles Matrix modules
- No automated lint or test commands were run because this was a docs-only
  change.
