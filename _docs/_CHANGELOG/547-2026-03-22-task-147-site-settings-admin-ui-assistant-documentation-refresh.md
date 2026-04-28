# 547. TASK-147 site settings admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-147

## Key Changes

### Assistant Docs
- Split Site Settings out of the old combined General/Site/Assistant settings
  assistant article by adding `docs/screens/site-settings.md`.
- Rewrote the Site Settings guidance against the shipped UI instead of the old
  generic settings summary.
- Documented the real route workflow: base URLs, admin path, homepage and 404
  selection, preview access, content routes, cache TTL, and the performance
  placeholder section.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/settings/site` now maps to
  `docs/screens/site-settings.md`.
- Left `/settings/assistant` on the old combined settings doc until that route
  receives its own assistant refresh.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/settings/site`
  - section-by-section site settings capture
  - source verification against local Site Settings UI modules
- No automated lint or test commands were run because this was a docs-only
  change.
