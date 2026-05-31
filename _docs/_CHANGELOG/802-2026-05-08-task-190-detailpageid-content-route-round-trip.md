# 802 - TASK-190 detailPageId content-route round-trip

**Date:** 2026-05-08
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-05, TASK-190-05-03, TASK-190-05-03-07, TASK-190-05-03-07-02

## Key Changes

### Content-route link metadata

- Extended `ContentRouteSetting` and `setting.content-route.upsert` so content
  routes can round-trip optional `detailPageId` metadata through the existing
  settings owner seam.
- Added preserve/null/string semantics for linked detail-page ids, keeping
  omitted updates non-destructive while allowing explicit clear and replace
  operations.

### Site Settings and matcher round-trip

- Site Settings client and form types now preserve route-level `detailPageId`
  metadata instead of dropping it during save/merge flows.
- `contentRouteMatcher.ts` now surfaces stored `detailPageId` metadata for
  runtime consumers without adding DB lookups or a second route registry.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/admin/siteSettingsClient.test.ts tests/vitest/ui/site-settings-validation.test.ts` - passed.
- `bun test tests/unit/site/contentRouteMatcher.test.ts tests/unit/settings/contentRoutesValidation.test.ts tests/unit/assistant/actionExecutorService.test.ts` - passed.
- `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.db.test.ts` - skipped locally because `DATABASE_URL` was not available.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
