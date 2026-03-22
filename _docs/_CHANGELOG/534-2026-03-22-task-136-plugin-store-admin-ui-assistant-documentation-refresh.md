# 534. TASK-136 plugin store admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-136

## Key Changes

### Assistant Docs
- Split the old combined store article into:
  - `docs/screens/plugin-store.md`
  - `docs/screens/plugin-details.md`
- Rewrote both docs to match the shipped catalog, installed/manage flow, and
  dedicated plugin details route.
- Updated the docs with guided `Instruction`, `Decision Guide`,
  `Troubleshooting`, `Checklist`, and `Security` sections.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/store` maps to
  `docs/screens/plugin-store.md`.
- Updated `docs/_COVERAGE_MATRIX.md` so `/store/plugins/:id` maps to
  `docs/screens/plugin-details.md`.

### Validation
- Completed:
  - authenticated CDP walkthrough of local Plugin Store UI
  - store tab shell, plugin cards, and selected-plugin summary panel
  - installed/manage route behavior verified against local store UI source
  - direct plugin details route capture at `/admin/store/plugins/:id`
- No automated lint or test commands were run because this was a docs-only
  change.
