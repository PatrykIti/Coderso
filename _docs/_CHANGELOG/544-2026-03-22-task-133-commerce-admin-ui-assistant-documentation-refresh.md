# 544. TASK-133 commerce admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-133

## Key Changes

### Assistant Docs
- Split Commerce into:
  - `docs/coderso/commerce-catalog.md`
  - `docs/coderso/commerce-product-editor.md`
- Rewrote both docs against the shipped catalog and product-editor workflows
  instead of the old generic commerce summary.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/coderso/commerce` points to
  `docs/coderso/commerce-catalog.md`.
- Updated `docs/_COVERAGE_MATRIX.md` so `/coderso/commerce/:id` points to
  `docs/coderso/commerce-product-editor.md`.

### Validation
- Completed:
  - authenticated walkthrough of local Commerce UI
  - commerce list shell
  - commerce product editor in `new` mode
  - source verification against local commerce list/table modules
- No automated lint or test commands were run because this was a docs-only
  change.
