# 520. TASK-120 pages admin UI assistant documentation refresh

**Date:** 2026-03-21  
**Version:** 0.1.0  
**Tasks:** TASK-120

## Key Changes

### Assistant Docs
- Replaced the old combined Pages assistant article with a split docs set:
  - `docs/screens/pages-list-and-creation.md`
  - `docs/screens/page-editor-preview-settings-and-history.md`
- Expanded both docs with guided `Instruction`, `Decision Guide`,
  `Troubleshooting`, `Checklist`, and `Security` sections based on the shipped
  local admin UI.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/pages` points to the list/create doc.
- Updated `docs/_COVERAGE_MATRIX.md` so `/pages/:id` and `/preview` point to
  the editor/settings/history doc.

### Validation
- Completed:
  - authenticated manual walkthrough of local Pages UI
  - login screen
  - Pages list
  - create drawer
  - Page Editor
  - runtime preview
  - page settings
  - history
- No automated lint or test commands were run because this was a docs-only
  change.
