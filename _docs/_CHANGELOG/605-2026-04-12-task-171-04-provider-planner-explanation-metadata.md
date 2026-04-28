# 605. TASK-171-04 provider planner explanation metadata

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-171, TASK-171-04

## Key Changes

### Assistant Plans
- Added optional strict planner metadata to assistant action plans.
- Provider draft plans now mark `providerDraftUsed=true`.
- Provider assumptions are redacted before reaching plan review.

### Admin UI
- `ActionPlanReview` now shows whether the plan came from a provider draft, local planner, or fallback.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/ui/assistant-panel.test.tsx`
