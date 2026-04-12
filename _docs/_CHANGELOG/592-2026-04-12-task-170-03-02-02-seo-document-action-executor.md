# 592. TASK-170-03-02-02 SEO document action executor

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-170, TASK-170-03, TASK-170-03-02, TASK-170-03-02-02

## Key Changes

### Assistant Actions
- Promoted `seo.document.upsert` from contract-only to executable `LLM Guide` action.
- Added strict input normalization for:
  - `targetType` (`page` or `entry`)
  - `targetId`
  - nested SEO fields (`slug`, `title`, `description`, `canonicalUrl`, `robots`)
- Added dry-run and execute adapter logic through existing SEO/page/entry services:
  - `getSeoDocumentByTarget`
  - `upsertSeoDocument`
  - `getPage`
  - `getEntry`

### Safety
- Validates explicit page/entry targets before execution.
- Re-execution updates/noops the same SEO document instead of duplicating metadata.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
