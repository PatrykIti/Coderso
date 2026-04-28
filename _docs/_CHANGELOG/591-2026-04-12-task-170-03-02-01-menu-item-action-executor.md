# 591. TASK-170-03-02-01 menu item action executor

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-170, TASK-170-03, TASK-170-03-02, TASK-170-03-02-01

## Key Changes

### Assistant Actions
- Promoted `menu.item.upsert` from contract-only to executable `LLM Guide` action.
- Added strict input normalization for menu item actions:
  - `menuId`
  - `label`
  - safe relative `href`
  - optional `parentId`
  - optional `orderIndex`
  - optional `settings`
- Added dry-run and execute adapter logic through existing menu services:
  - `listMenuItems`
  - `replaceMenuItems`

### Safety
- Rejects unsafe/external hrefs before plans can execute.
- Re-execution updates/noops by href instead of duplicating menu items.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
