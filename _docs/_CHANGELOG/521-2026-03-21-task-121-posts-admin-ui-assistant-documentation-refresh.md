# 521. TASK-121 posts admin UI assistant documentation refresh

**Date:** 2026-03-21  
**Version:** 0.1.0  
**Tasks:** TASK-121

## Key Changes

### Assistant Docs
- Replaced the old combined Posts assistant article with a split docs set:
  - `docs/coderso/posts-list-and-creation.md`
  - `docs/coderso/post-editor-preview-revisions-and-settings.md`
- Expanded both docs with guided `Instruction`, `Decision Guide`,
  `Troubleshooting`, `Checklist`, and `Security` sections based on the shipped
  local admin UI.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/coderso/posts` points to the
  list/create doc.
- Updated `docs/_COVERAGE_MATRIX.md` so `/coderso/posts/:id` points to the
  editor/preview/revisions/settings doc.

### Validation
- Completed:
  - authenticated manual walkthrough of local Posts UI
  - Posts list
  - create drawer
  - block editor shell
  - runtime preview
  - revisions
  - editor settings
- No automated lint or test commands were run because this was a docs-only
  change.
