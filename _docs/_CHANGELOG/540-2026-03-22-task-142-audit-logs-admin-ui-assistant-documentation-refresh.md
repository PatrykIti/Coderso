# 540. TASK-142 audit logs admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-142

## Key Changes

### Assistant Docs
- Split Audit Logs out of the old combined operations assistant article by
  adding `docs/screens/audit-logs.md`.
- Rewrote the Audit Logs guidance against the shipped UI instead of the old
  generic operations summary.
- Documented the real route workflow: search and selectors, audit table, event
  details drawer, JSON payload review, and export dialog.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/audit` now maps to
  `docs/screens/audit-logs.md`.
- Left `/access-logs`, `/backups`, and `/tools/import-export` on the old
  combined operations doc until those routes receive their own assistant
  refreshes.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/audit`
  - audit table and details drawer
  - export dialog
  - source verification against local Audit Logs UI modules
- No automated lint or test commands were run because this was a docs-only
  change.
