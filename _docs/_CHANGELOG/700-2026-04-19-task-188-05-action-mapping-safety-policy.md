# 700. TASK-188-05 action mapping safety policy

Date: 2026-04-19
Version: unreleased
Tasks: TASK-188-05

## Key Changes

### Assistant/Core

- Added policy helpers for executable action lookup and policy field intent mapping.
- Added policy safety helpers for broad destructive prompts, explicit counts, destructive count mismatch, provider field mismatch, counted multi-target allowance, and filtered-all allowance.
- Updated generic CMS action mapping to require policy executable action metadata before returning typed actions.
- Updated provider post-validation guards to use policy safety helpers.
- Added policy safety and policy field mapping coverage.

### Docs

- Documented policy-backed action mapping and safety checks in CMS API and Security Spec.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/operation-policy-safety.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
