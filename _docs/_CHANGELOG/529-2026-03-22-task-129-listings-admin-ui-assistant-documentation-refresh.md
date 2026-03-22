# 529. TASK-129 listings admin UI assistant documentation refresh

**Date:** 2026-03-22  
**Version:** 0.1.0  
**Tasks:** TASK-129

## Key Changes

### Assistant Docs
- Added a dedicated Listings assistant document:
  - `docs/coderso/listings-list-and-editor.md`
- Expanded the new doc with guided `Instruction`, `Decision Guide`,
  `Troubleshooting`, `Checklist`, and `Security` sections based on the shipped
  local Listings UI.

### Coverage Matrix
- Updated `docs/_COVERAGE_MATRIX.md` so `/coderso/listings` and
  `/coderso/listings/:id` now point to the dedicated Listings doc.
- Kept `/coderso/filters` and `/coderso/search` on the older shared doc until
  those routes are reviewed independently.

### Validation
- Completed:
  - authenticated manual walkthrough of local Listings UI
  - listings list shell
  - `Queries` / `Templates` tabs
  - listing query editor in `new` mode
- No automated lint or test commands were run because this was a docs-only
  change.
