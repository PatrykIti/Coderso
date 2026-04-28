# 603. TASK-171-02 provider draft execution helper

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-171, TASK-171-02

## Key Changes

### Provider Planning
- Added `planAssistantActionsWithProviderDraft` for controlled provider draft planning.
- The helper:
  - requires `llmAvailable=true` plus an injected provider,
  - builds the redacted provider planning prompt package,
  - parses provider JSON,
  - maps provider output through `adaptProviderDraftPlan`,
  - falls back to the deterministic local planner on provider unavailability or errors.

### Safety
- No live provider/network call was introduced in tests.
- Unsupported or unsafe provider draft actions still recover through the strict provider draft adapter.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts`
