# 807 - TASK-190 detail-page lifecycle routes

**Date:** 2026-05-08
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-05-03-07, TASK-190-05-03-07-01, TASK-190-05-03-07-01-02

## Key Changes

### Preview and lifecycle routes

- Extended `core/server/routes/detailPageRoutes.ts` with
  `POST /detail-pages/:id/preview`,
  `POST /detail-pages/:id/publish`,
  `POST /detail-pages/:id/unpublish`, and
  `POST /detail-pages/:id/autosave`.
- Added strict lifecycle request schemas in
  `core/server/validation/detailPageSchemas.ts` for preview payloads,
  autosave envelopes, and empty publish/unpublish bodies.

### Preview-token and revision ownership

- Added `createDetailPagePreviewToken(...)` in
  `core/services/pages/previewService.ts` so internal admin preview reuses the
  shared preview-token storage contract and persists `sampleEntryId` in
  `preview_tokens.context`.
- Extended `core/services/content/detailPageDocumentService.ts` with
  publish/unpublish/autosave lifecycle helpers.
- Publish now promotes `current_document` into `published_document` and records
  a `publish` revision; autosave writes or reuses a single latest `autosave`
  revision snapshot without taking over canonical route ownership.

### Validation

- `bun --cwd core lint:types` - passed.
- `set -a && source .env && set +a && bun test tests/unit/content/detailPageDocumentService.test.ts` - passed.
- `set -a && source .env && set +a && bun test tests/integration/routes/detailPages.test.ts` - passed.
