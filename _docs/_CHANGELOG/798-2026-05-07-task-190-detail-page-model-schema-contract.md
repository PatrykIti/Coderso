# 798 - TASK-190 detail page model and schema contract

**Date:** 2026-05-07
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-05, TASK-190-05-03, TASK-190-05-03-01

## Key Changes

### Detail-page storage contract

- Added `detailPageTypes.ts` and `detailPageSchema.ts` as the strict
  source-of-truth contract for persisted detail-page documents, binding sources,
  related-source limits, and UUID-compatible ids.
- Added `detail_page_documents` and `detail_page_revisions` to the DB schema,
  plus generated migration/meta artifacts for the new persisted resource family.

### Content-type dependency guard

- Content-type deletion now treats `detail_page_documents.content_type_id` as a
  blocking dependency instead of relying only on `site.contentRoutes` cleanup.
- The service and route boundary now return machine-readable
  `content_type_has_detail_pages` conflicts when detail-page documents still
  reference the content type.

## Validation

- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `bun run test:vitest -- tests/vitest/content/detailPageSchema.test.ts` - passed.
- `set -a && source .env && set +a && bun run db:migrate` - passed outside the sandbox.
- `set -a && source .env && set +a && bun test tests/unit/content/typeService.test.ts tests/integration/routes/contentTypes.test.ts` - passed outside the sandbox.
