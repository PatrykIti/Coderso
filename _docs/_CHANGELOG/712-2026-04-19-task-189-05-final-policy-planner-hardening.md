# 712. TASK-189-05 final policy planner hardening

Date: 2026-04-19
Version: unreleased
Tasks: TASK-189-05

## Key Changes

### Assistant/Core

- Removed remaining planner-owned CMS/admin resource branches from `actionPlannerService.ts`.
- Enforced strict provider `CmsOperationDraft` validation with non-null exact `resourceKey`; provider draft repair is no longer active.
- Routed post/media gated prompts, explicit media reference attach, selected-block patches, active targets, numeric fields, and boolean fields through operation policy, resolver, mapper, and safety helpers.
- Expanded policy draft kind coverage so gated admin/Coderso surfaces can be represented without local one-off guards.

### QA

- Updated assistant fixtures to assert policy-owned gated/needs-input behavior and strict provider rejection.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts tests/vitest/assistant/operation-policy-safety.test.ts tests/vitest/assistant/operation-policy-follow-up.test.ts tests/vitest/assistant/operation-policy-provider-guidance.test.ts tests/vitest/assistant/operation-policy-admin-surfaces.test.ts tests/vitest/assistant/operation-policy-coverage.test.ts tests/vitest/assistant/live-coverage-matrix.test.ts tests/vitest/assistant/cms-operation-fixtures.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
