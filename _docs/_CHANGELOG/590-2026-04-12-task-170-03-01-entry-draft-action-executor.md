# 590. TASK-170-03-01 entry draft action executor

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-170, TASK-170-03, TASK-170-03-01

## Key Changes

### Assistant Actions
- Promoted `entry.upsert-draft` from contract-only to executable `LLM Guide` action.
- Added strict input normalization for draft entry actions:
  - `contentTypeSlug`
  - `title`
  - `slug`
  - `values`
- Added dry-run and execute adapter logic through existing content entry services:
  - `getEntryBySlug`
  - `createEntry`
  - `updateEntry`

### Safety
- Kept the action draft-only; no publish behavior was added.
- Preserved strict rejection for remaining contract-only entry actions such as `entry.sample.create`.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts tests/vitest/assistant/action-diff-service.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
