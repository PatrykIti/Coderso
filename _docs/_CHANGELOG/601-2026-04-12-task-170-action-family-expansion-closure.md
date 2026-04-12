# 601. TASK-170 action family expansion closure

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-170, TASK-170-05

## Key Changes

### Closure
- Closed the `LLM Guide` action family expansion wave.
- The expanded typed action engine now includes executable actions for:
  - draft entries
  - menu items
  - SEO documents
  - entry media references
  - listing query filters
  - listing template card config
  - top-level page widget block upserts
  - safe non-webhook form automation

### Safety
- Added contract-only tracking for future action families that still need dedicated adapters.
- Added route-level per-action permission enforcement for dry-run and execute.
- Kept webhook form automation, nested page widget patching, menu structure patching, and remaining entry helper actions out of scope until their security semantics are explicit.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts tests/vitest/assistant/action-diff-service.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx tests/vitest/admin/assistantClient.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
  - `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.db.test.ts`
