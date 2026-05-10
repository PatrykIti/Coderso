# 816 - TASK-190 detail-page admin client cache parity

**Date:** 2026-05-10
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-05, TASK-190-05-03, TASK-190-05-03-07, TASK-190-05-03-07-03

## Key Changes

### Detail-page admin cache

- Added the admin `detailPagesClient` family for internal detail-page list,
  detail, create/update/delete, preview, publish/unpublish, autosave, revision
  list, restore, and discard flows.
- Added `detailPages:list`, `detailPages:list:contentType:<contentTypeId>`,
  and `detailPages:detail:<id>` cache keys so filtered collection workspaces do
  not collide across content types.
- Mapped assistant `detail-page.upsert` execution results onto the same
  detail-page cache events as manual admin mutations.

### Docs and board

- Marked `TASK-190-05-03-07` and `TASK-190-05-03-07-03` done.
- Updated admin cache docs, API notes, task board totals, and the changelog
  index for the completed slice.

## Validation

- `./node_modules/.bin/prettier --write core/admin/services/cachePolicy.ts core/admin/services/detailPagesClient.ts core/admin/services/assistantClient.ts tests/vitest/admin/detailPagesClient.test.ts tests/vitest/admin/assistantClient.test.ts`
- `bun run vitest run --config vitest.config.ts tests/vitest/admin/detailPagesClient.test.ts tests/vitest/admin/assistantClient.test.ts`
- `set -a && source .env && set +a && bun test --parallel=1 tests/integration/routes/contentTypes.test.ts tests/integration/routes/detailPages.test.ts`
