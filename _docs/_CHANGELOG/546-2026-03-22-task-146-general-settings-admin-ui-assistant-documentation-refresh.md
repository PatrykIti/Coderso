# 546. TASK-146 general settings admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-146

## Key Changes

### Assistant Docs
- Split General Settings out of the old combined General/Site/Assistant
  settings assistant article by adding `docs/screens/general-settings.md`.
- Rewrote the General Settings guidance against the shipped UI instead of the
  old generic settings summary.
- Documented the real route workflow: settings sidebar, site identity fields,
  branding controls, auto-save toggle, and explicit save action.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/settings` and `/settings/general` now
  map to `docs/screens/general-settings.md`.
- Left `/settings/site` and `/settings/assistant` on the old combined settings
  doc until those routes receive their own assistant refreshes.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/settings`
  - route parity verification for `/settings` and `/settings/general`
  - source verification against local General Settings UI modules
- No automated lint or test commands were run because this was a docs-only
  change.
