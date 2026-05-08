# 810 - TASK-190 detail-page revision routes

**Date:** 2026-05-08
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-05-03-07, TASK-190-05-03-07-01, TASK-190-05-03-07-01-03

## Key Changes

### Revision route family

- Added `GET /detail-pages/:id/revisions`,
  `POST /detail-pages/:id/revisions/:revisionId/restore`, and
  `DELETE /detail-pages/:id/revisions/:revisionId` to the internal detail-page
  route family.
- Extended `mapDetailPageError` to return stable API errors for
  `detail_page_revision_not_found` and
  `detail_page_revision_delete_forbidden`.

### Revision owner seam

- Added `core/services/content/detailPageRevisionService.ts` as the dedicated
  owner for detail-page revision list/restore/discard behavior.
- Restore now rewrites `current_document` only and keeps publish state on the
  dedicated lifecycle routes instead of turning revision restore into a second
  publish path.
- Revision delete is limited to autosave snapshots; publish revisions fail
  closed through `detail_page_revision_delete_forbidden`.

## Validation

- `bun --cwd core lint:types` - passed.
- `set -a && source .env && set +a && bun test tests/integration/routes/detailPages.test.ts` - passed.
