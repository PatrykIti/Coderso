# 707. TASK-189-01 provider action array removal

Date: 2026-04-19
Version: unreleased
Tasks: TASK-189-01

## Key Changes

### Assistant/Core

- Removed the provider `actions[]` adapter path from assistant planning.
- Deleted `actionPlanProviderAdapter.ts` and its direct adapter test suite.
- Provider output is now operation-draft-only; arbitrary provider action arrays fall back to local policy planning and never become executor payloads.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts tests/vitest/assistant/operation-policy-safety.test.ts tests/vitest/assistant/cms-operation-fixtures.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
