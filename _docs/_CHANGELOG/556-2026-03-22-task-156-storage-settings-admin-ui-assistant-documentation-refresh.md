# 556. TASK-156 storage settings admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-156

## Key Changes

### Assistant Docs
- Split Storage Settings out of the old combined integrations assistant article
  by adding `docs/screens/storage-settings.md`.
- Rewrote the route guidance against the shipped UI instead of leaving it inside
  the broader integrations/settings summary.
- Documented the real route workflow: provider cards, provider-specific
  configuration panels, upload policies, test connection, migration caveat, and
  security summary.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/settings/storage` now maps to
  `docs/screens/storage-settings.md`.
- Left `/settings/integrations` on the broader combined integrations doc for
  now.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/settings/storage`
  - local, S3, and Azure provider captures
  - source verification against local Storage Settings modules
- No automated lint or test commands were run because this was a docs-only
  change.
