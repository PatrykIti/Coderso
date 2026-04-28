# 530. TASK-130 filters and search admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-130

## Key Changes

### Assistant Docs
- Replaced the old combined discovery assistant article with a split docs set:
  - `docs/coderso/listing-filters.md`
  - `docs/coderso/public-search-preview.md`
- Expanded both docs with guided `Instruction`, `Decision Guide`,
  `Troubleshooting`, `Checklist`, and `Security` sections based on the shipped
  local preview flows.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/coderso/filters` points to the
  runtime filters preview doc.
- Updated `docs/_COVERAGE_MATRIX.md` so `/coderso/search` points to the public
  search preview doc.

### Validation
- Completed:
  - authenticated manual walkthrough of local Filters UI
  - authenticated manual walkthrough of local Search preview UI
- No automated lint or test commands were run because this was a docs-only
  change.
