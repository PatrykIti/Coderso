# 558. TASK-158 users admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-158

## Key Changes

### Assistant Docs
- Split Users out of the old combined Users/Roles assistant article by adding
  `docs/screens/users.md`.
- Rewrote the route guidance against the shipped UI instead of leaving it inside
  the broader access-control summary.
- Documented the real route workflow: filters, user table, right details panel,
  invite dialog, user lifecycle actions, and the embedded role summary section.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/users` now maps to
  `docs/screens/users.md`.
- Left `/roles` on the old combined users/roles doc for now.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/users`
  - source verification against local Users modules
- No automated lint or test commands were run because this was a docs-only
  change.
