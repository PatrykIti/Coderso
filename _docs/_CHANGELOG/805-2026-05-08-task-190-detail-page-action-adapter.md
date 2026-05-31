# 805 - TASK-190 detail-page action adapter

**Date:** 2026-05-08
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-05, TASK-190-05-03, TASK-190-05-03-05

## Key Changes

### Typed action contract

- Added the first executable `detail-page.upsert` assistant action to the
  strict action registry, family contract map, plan schema, and admin review /
  execution labels.
- Kept publish state owned exclusively by `DetailPageDocument.status`; the
  action input does not introduce a second top-level publish field.

### Content-domain persistence

- Added `core/services/content/detailPageDocumentService.ts` as the content
  owner seam for assistant-side detail-page persistence.
- `actionExecutorService.ts` now dry-runs and executes detail-page upserts
  through that service instead of writing DB rows directly from the assistant
  layer.
- Execute refreshes advisory `contentTypeSlug` from the canonical linked
  content type, preserves one canonical detail-page document per id, and keeps
  route-link ownership deferred to `setting.content-route.upsert`.

### Validation

- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/action-plan-schema.test.ts` - passed.
- `bun test tests/unit/assistant/actionExecutorService.test.ts` - passed.
- `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.db.test.ts` - passed.
