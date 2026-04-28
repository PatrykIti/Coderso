# 557. TASK-157 integrations admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-157

## Key Changes

### Assistant Docs
- Split Integrations out of the old combined integrations assistant article by
  adding `docs/screens/integrations.md`.
- Rewrote the route guidance against the shipped UI instead of leaving it inside
  the broader integrations/settings summary.
- Documented the real route workflow: category chips, integration cards,
  configuration drawer, security scopes, and request-new dialog.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/settings/integrations` now maps to
  `docs/screens/integrations.md`.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/settings/integrations`
  - source verification against local Integrations modules
- No automated lint or test commands were run because this was a docs-only
  change.
