# 527. TASK-127 widgets admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-127

## Key Changes

### Assistant Docs
- Replaced the old combined Widgets assistant article with a split docs set:
  - `docs/coderso/widget-library.md`
  - `docs/coderso/widget-template-editor.md`
- Expanded both docs with guided `Instruction`, `Decision Guide`,
  `Troubleshooting`, `Checklist`, and `Security` sections based on the shipped
  local UI and route contract.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/coderso/widgets` points to the widget
  library doc.
- Updated `docs/_COVERAGE_MATRIX.md` so `/coderso/widgets/templates/:id` points
  to the widget template editor doc.

### Validation
- Completed:
  - authenticated manual walkthrough of local Widgets UI
  - widget library shell
  - template editor route in `new` mode
  - widget details/insert/category flows verified against widget library code
- No automated lint or test commands were run because this was a docs-only
  change.
