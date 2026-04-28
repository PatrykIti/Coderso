# 542. TASK-144 import export admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-144

## Key Changes

### Assistant Docs
- Split Import / Export out of the old combined operations assistant article by
  adding `docs/screens/import-export.md`.
- Rewrote the Import / Export guidance against the shipped UI instead of the old
  generic operations summary.
- Documented the real route workflow: export cards, supported file types, import
  preview/apply flow, recent imports monitoring, and the topbar activity-log
  action.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/tools/import-export` now maps to
  `docs/screens/import-export.md`.
- Left `/access-logs` on the old combined operations doc until that route
  receives its own assistant refresh.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/tools/import-export`
  - export/import page shell and recent imports table
  - source verification against local Import / Export UI modules
- No automated lint or test commands were run because this was a docs-only
  change.
