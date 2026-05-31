# 806 - TASK-190 detail-page CRUD and read routes

**Date:** 2026-05-08
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-05-03-07, TASK-190-05-03-07-01, TASK-190-05-03-07-01-01

## Key Changes

### Internal admin route family

- Added `core/server/routes/detailPageRoutes.ts` with the first internal
  detail-page route family: `GET /detail-pages`, `GET /detail-pages/:id`,
  `POST /detail-pages`, `PATCH /detail-pages/:id`, and
  `DELETE /detail-pages/:id`.
- Added `core/server/validation/detailPageSchemas.ts` so the route boundary
  validates the stable `contentTypeId` list filter and strict top-level
  create/update envelopes before the service seam runs.
- Registered the new route family in `core/server/routes/index.ts`.

### Content-domain CRUD boundary

- Extended `core/services/content/detailPageDocumentService.ts` with list/read/
  create/update/delete operations for manual admin flows in addition to the
  earlier assistant upsert helper.
- Manual create now generates a UUID-compatible id when the payload omits one,
  and write flows refresh advisory `contentTypeSlug` from the canonical linked
  content type instead of trusting stale transport data.
- Delete now fails closed with `detail_page_route_conflict` while
  `site.contentRoutes.detailPageId` still references the document.

### Validation

- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `bun test tests/integration/routes/detailPages.test.ts` - passed with DB-backed route coverage.
- `set -a && source .env && set +a && bun test tests/unit/content/detailPageDocumentService.test.ts` - passed.
