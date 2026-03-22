# 526. TASK-126 custom screens admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-126

## Key Changes

### Assistant Docs
- Replaced the old combined Custom Screens assistant article with a split docs
  set:
  - `docs/coderso/custom-screens-list-and-builder.md`
  - `docs/coderso/custom-screen-records-and-entry-workflow.md`
- Expanded both docs with guided `Instruction`, `Decision Guide`,
  `Troubleshooting`, `Checklist`, and `Security` sections based on the shipped
  local admin UI and route contract.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/coderso/custom-screens` and
  `/coderso/custom-screens/:id` point to the builder doc.
- Updated `docs/_COVERAGE_MATRIX.md` so
  `/coderso/custom-screens/:id/entries*` points to the records workflow doc.

### Validation
- Completed:
  - authenticated manual walkthrough of local Custom Screens UI
  - empty-state list
  - `new` screen builder route
  - collection-only records route
  - deeper record workflow verified against custom screen route code paths
- No automated lint or test commands were run because this was a docs-only
  change.
