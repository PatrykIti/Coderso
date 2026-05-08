# 804 - TASK-190 detail-page preview and cache invalidation

**Date:** 2026-05-08
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-05, TASK-190-05-03, TASK-190-05-03-04

## Key Changes

### Preview token contract

- Extended `preview_tokens` with nullable `context` JSON owned by
  `core/services/pages/previewService.ts`, including the strict
  `detail-page` sample-entry payload used by dedicated detail-template preview.
- Widened shared preview-token validation so runtime owners now distinguish
  `expired` from `missing`, keeping `410 Preview expired` specific to expired
  tokens while disabled preview, missing targets, and invalid detail-page
  overrides stay on `404`.
- Extended the shared preview URL helper so `type=content` can carry an
  optional `detailPageId` and `type=detail-page` gets a dedicated runtime
  preview path without route-local builders.

### Runtime preview behavior

- Wired `core/server/publicSite.tsx` so dedicated
  `GET /preview?type=detail-page&token=...` renders `current_document` through
  the existing page runtime shell and resolves its sample entry only from
  server-side preview-token context.
- Extended `type=content` preview to reuse the canonical route-linked published
  detail page, or an explicit published `detailPageId` override, without ever
  exposing draft detail-page documents through the content preview path.
- Added runtime coverage for the new preview/cache seam in
  `tests/integration/runtime/detail-page-preview-cache.test.ts`.

### Cache invalidation

- Added shared content-route cache invalidation helpers in
  `core/site/cache/siteCache.ts` and reused them from
  `core/services/settings/settingsService.ts` so Site Settings writes invalidate
  cached list/detail HTML whenever canonical `site.contentRoutes` change.

## Validation

- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/server/previewUrls.test.ts` - passed.
- `set -a && source .env && set +a && ./node_modules/.bin/drizzle-kit generate --config core/db/drizzle.config.ts` - passed.
- `set -a && source .env && set +a && bun run db:migrate` - passed.
- `set -a && source .env && set +a && bun test tests/unit/pages/previewService.test.ts tests/unit/content/detailPageRuntimeResolver.test.ts tests/integration/runtime/detail-page-runtime.test.ts tests/integration/runtime/detail-page-preview-cache.test.ts tests/integration/runtime/pages-runtime.test.ts` - unit preview/runtime seams passed, but the DB-backed suites in those files still reported `skip` locally through the existing `testIfDb` gate even after migration and an out-of-band Bun DB connectivity probe succeeded.
