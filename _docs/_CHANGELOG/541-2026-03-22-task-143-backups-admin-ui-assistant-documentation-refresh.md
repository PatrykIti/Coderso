# 541. TASK-143 backups admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-143

## Key Changes

### Assistant Docs
- Split Backups out of the old combined operations assistant article by adding
  `docs/screens/backups.md`.
- Rewrote the Backups guidance against the shipped UI instead of the old generic
  operations summary.
- Documented the real route workflow: backup schedule card, frequency and
  storage target controls, recent backups table, retention note, and on-demand
  backup dialog.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/backups` now maps to
  `docs/screens/backups.md`.
- Left `/access-logs` and `/tools/import-export` on the old combined operations
  doc until those routes receive their own assistant refreshes.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/backups`
  - backups page shell and create-backup dialog
  - source verification against local Backups UI modules
- No automated lint or test commands were run because this was a docs-only
  change.
