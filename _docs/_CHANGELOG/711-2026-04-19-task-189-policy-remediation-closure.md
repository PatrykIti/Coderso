# 711. TASK-189 policy remediation closure

Date: 2026-04-19
Version: unreleased
Tasks: TASK-189

## Key Changes

### Assistant/Core

- Closed the TASK-188 audit remediation program.
- Provider output is now operation-draft-only and cannot supply executable action arrays.
- Shared-kind settings/admin resources keep exact policy identity through guidance, draft validation, resolver lookup, and planning.
- Provider-side parallel heuristics were collapsed into a single policy-backed operation path plus explicit active-surface adapter exceptions.

### QA

- Targeted Vitest assistant suites, lint/typecheck, and full OpenAI/OpenRouter live assistant matrix passed after remediation.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts tests/vitest/assistant/operation-policy-safety.test.ts tests/vitest/assistant/operation-policy-follow-up.test.ts tests/vitest/assistant/operation-policy-provider-guidance.test.ts tests/vitest/assistant/operation-policy-admin-surfaces.test.ts tests/vitest/assistant/operation-policy-coverage.test.ts tests/vitest/assistant/live-coverage-matrix.test.ts tests/vitest/assistant/cms-operation-fixtures.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `set -a && source .env && set +a && bun run test:assistant:live`
