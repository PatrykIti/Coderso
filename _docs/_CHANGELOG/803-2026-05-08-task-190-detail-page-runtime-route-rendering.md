# 803 - TASK-190 detail-page runtime route rendering

**Date:** 2026-05-08
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-05, TASK-190-05-03, TASK-190-05-03-03

## Key Changes

### Published detail-page runtime

- Added `core/services/content/detailPageRuntimeResolver.ts` to load published
  detail-page documents, validate the content-type link, and resolve bound
  runtime blocks through the content-owned binding resolver.
- Wired `core/server/publicSite.tsx` so published content routes with linked
  `detailPageId` hydrate composed detail-page blocks through the existing page
  runtime shell instead of inventing a second widget-runtime path.

### Legacy fallback

- Public content routes without linked `detailPageId` continue to render
  through the existing legacy `renderPublicEntry.tsx` detail renderer.
- Draft entries remain hidden on public content routes even when a published
  detail-page document exists.

## Validation

- `set -a && source .env && set +a && bun test tests/integration/runtime/detail-page-runtime.test.ts` - skipped locally because `DATABASE_URL` was not available.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
