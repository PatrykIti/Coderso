# 632. TASK-174-03-06 form delete archive actions

**Date:** 2026-04-14
**Version:** 0.1.0
**Tasks:** TASK-174, TASK-174-03, TASK-174-03-06

## Key Changes

### Assistant Actions
- Added executable `form.delete`.
- Added executable `form.archive`.
- Planner resolves form operations from active form context or exact catalog name/slug.
- Dry-run blocks hard delete when persisted submissions exist.
- Archive updates form status to `archived` while preserving submission history.
- Preview and execution payloads expose submission counts only, not raw submission data.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
  - `set -a && source .env && set +a && bun test tests/unit/forms/formsService.test.ts`
