# 704. TASK-188-09 policy cutover

Date: 2026-04-19
Version: unreleased
Tasks: TASK-188-09

## Key Changes

### Assistant/Core

- Removed the legacy CMS resource registry and its tests.
- Switched remaining CMS prompt resource detection to policy-backed lookup.
- Removed the last local planner count-word path and reused policy safety count extraction.
- Confirmed provider prompt, resolver, mapper, follow-up, safety, and coverage paths use `assistantOperationPolicy` helpers.

### Docs

- Updated architecture, CMS API, Security Spec, acceptance matrix, and task notes to reflect the policy cutover.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts tests/vitest/assistant/operation-policy-safety.test.ts tests/vitest/assistant/operation-policy-follow-up.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `set -a && source .env && set +a && bun run test:assistant:live`
