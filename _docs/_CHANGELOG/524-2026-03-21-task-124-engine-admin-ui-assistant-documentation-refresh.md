# 524. TASK-124 engine admin UI assistant documentation refresh

**Date:** 2026-03-21  
**Version:** 0.1.0  
**Tasks:** TASK-124

## Key Changes

### Assistant Docs
- Replaced the old combined Engine assistant article with a split docs set:
  - `docs/coderso/engine-list-and-content-type-creation.md`
  - `docs/coderso/content-type-editor-and-schema-builder.md`
- Expanded both docs with guided `Instruction`, `Decision Guide`,
  `Troubleshooting`, `Checklist`, and `Security` sections based on the shipped
  local admin UI.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/coderso/engine` points to the
  list/create doc.
- Updated `docs/_COVERAGE_MATRIX.md` so `/coderso/engine/:id` and
  `/coderso/engine/:id/schema` point to the editor/schema doc.

### Validation
- Completed:
  - authenticated manual walkthrough of local Engine UI
  - content types list
  - `New type` drawer
  - content type editor
  - schema builder route
- No automated lint or test commands were run because this was a docs-only
  change.
