# 554. TASK-154 webhooks admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-154

## Key Changes

### Assistant Docs
- Split Webhooks out of the old combined integrations assistant article by
  adding `docs/screens/webhooks.md`.
- Rewrote the route guidance against the shipped UI instead of leaving it inside
  the broader integrations/settings summary.
- Documented the real route workflow: empty state, create drawer, event
  triggers, signing secret generation, and the edit/test/delete lifecycle.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/settings/webhooks` now maps to
  `docs/screens/webhooks.md`.
- Left `/settings/email`, `/settings/storage`, and `/settings/integrations` on
  the broader combined integrations doc for now.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/settings/webhooks`
  - source verification for edit/test/delete lifecycle behavior
- No automated lint or test commands were run because this was a docs-only
  change.
