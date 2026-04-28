# 553. TASK-153 api keys admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-153

## Key Changes

### Assistant Docs
- Split API Keys out of the old combined integrations assistant article by
  adding `docs/screens/api-keys.md`.
- Rewrote the route guidance against the shipped UI instead of leaving it inside
  the broader integrations/settings summary.
- Documented the real route workflow: empty state, create dialog, scope
  selection, one-time secret visibility, and rotate/revoke lifecycle.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/settings/api-keys` now maps to
  `docs/screens/api-keys.md`.
- Left `/settings/webhooks`, `/settings/email`, `/settings/storage`, and
  `/settings/integrations` on the broader combined integrations doc for now.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/settings/api-keys`
  - source verification for secret and lifecycle dialogs/actions
- No automated lint or test commands were run because this was a docs-only
  change.
