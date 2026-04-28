# 548. TASK-148 assistant settings admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-148

## Key Changes

### Assistant Docs
- Split Assistant Settings out of the old combined General/Site/Assistant
  settings assistant article by adding `docs/screens/assistant-settings.md`.
- Rewrote the Assistant Settings guidance against the shipped UI instead of the
  old generic settings summary.
- Documented the real route workflow: global enablement, launcher avatar,
  default mode, corpus note, reindex controls, LLM settings, quotas, and
  auto-save/save actions.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/settings/assistant` now maps to
  `docs/screens/assistant-settings.md`.

### Validation
- Completed:
  - authenticated CDP walkthrough of local `/admin/settings/assistant`
  - source verification against local Assistant Settings UI modules
- No automated lint or test commands were run because this was a docs-only
  change.
