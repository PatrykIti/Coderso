# 537. TASK-139 seo manager admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-139

## Key Changes

### Assistant Docs
- Split SEO Manager out of the old combined SEO/Redirects assistant article by
  adding `docs/screens/seo-manager.md`.
- Rewrote the SEO Manager guidance against the shipped UI instead of the old
  generic summary.
- Documented the real route workflow: global scan score, page search, health
  filters, SEO table, full-audit dialog, and quick-edit drawer.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/seo` now maps to
  `docs/screens/seo-manager.md`.
- Left `/redirects` on the legacy combined doc until the Redirects route gets
  its own assistant refresh.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/seo`
  - SEO Manager shell and table state
  - `Run Full Audit` dialog
  - `Quick SEO Edit` drawer
  - source verification against local SEO Manager UI modules
- No automated lint or test commands were run because this was a docs-only
  change.
