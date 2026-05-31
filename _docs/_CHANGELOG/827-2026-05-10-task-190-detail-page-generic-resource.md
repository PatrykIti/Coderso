# 827 - TASK-190 detail-page generic resource integration

Date: 2026-05-10
Version: Unreleased
Tasks: TASK-190-05-03-08, TASK-190-05-03, TASK-190-05

## Key Changes

### Assistant/Core
- Promoted `detail-page` into the strict generic CMS operation draft vocabulary
  and assistant operation policy.
- Added bounded `detailPages` provider planning context packaging without
  narrowing existing pages, posts, entries, media, commerce, solution kits, or
  widget groups.
- Added trusted detail-page target resolution from catalog ids, stable
  `contentTypeId`, exact route/content-type linkage, or active detail-template
  surface context only.
- Kept generic detail-page mutations policy-gated so execution remains owned by
  the existing local `detail-page.upsert` action path.

### Security/Validation
- Kept client-supplied `context.resourceCatalog` rejected at the action planning
  request schema boundary; `includeResourceCatalog=true` remains server-owned.

### Documentation
- Synchronized the TASK-190 board, assistant architecture/API docs, and LLM Guide
  acceptance matrix for the completed detail-page generic resource slice.
