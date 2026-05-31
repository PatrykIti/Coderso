# 808 - TASK-190 detail-page drift hardening

**Date:** 2026-05-08
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-05-02, TASK-190-05-03-04, TASK-190-05-03-07, TASK-190-05-03-07-01, TASK-190-05-03-07-01-02

## Key Changes

### Detail-page admin boundary hardening

- Moved detail-page preview sample-entry validation out of
  `core/server/routes/detailPageRoutes.ts` into the content-domain
  `detailPageDocumentService.ts` seam so the route stays orchestration-only.
- Hardened detail-page CRUD saves so the internal create/update routes persist
  draft `currentDocument` data only and no longer bypass the dedicated
  publish/unpublish lifecycle boundary.
- Kept published detail templates stable when a later draft edit is saved
  through CRUD, so public runtime still serves the published document until the
  explicit publish route is called.
- Added a shared linked-detail-route cache invalidation helper and wired the
  current form, listing-query, and listing-template update/delete owners into it
  so rendered detail routes do not wait for TTL expiry after related resource
  changes.

### Regression coverage

- Extended `tests/integration/routes/detailPages.test.ts` with fail-closed
  preview guards for missing, mismatched, and draft sample entries plus draft
  edit behavior for already-published templates.
- Added detail-page autosave dedupe/prune coverage in
  `tests/unit/content/detailPageDocumentService.test.ts`.
- Added page `collectionLink` regression coverage in
  `tests/unit/pages/pageService.test.ts`,
  `tests/integration/routes/pages.test.ts`, and
  `tests/vitest/admin/pagesClient.test.ts`.
- Added assistant executor conflict coverage for detail-page id/content-type
  mismatch handling in `tests/unit/assistant/actionExecutorService.test.ts`.
- Added runtime fail-closed coverage for preview-disabled, expired-token, and
  draft-sample-entry detail-page preview responses plus page-upsert media asset
  preservation coverage.

### Documentation

- Updated `_docs/CMS_API.md`, `_docs/ARCHITECTURE.md`, and the relevant
  `TASK-190` lifecycle leaf so the documented permission/lifecycle split matches
  the live code.

### Validation

- `set -a && source .env && set +a && bun run test:bun` - passed with DB-backed suites skipped because the current environment did not expose a reachable `DATABASE_URL`.
- `set -a && source .env && set +a && bun run test:vitest` - passed.
