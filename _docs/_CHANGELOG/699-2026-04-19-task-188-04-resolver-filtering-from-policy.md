# 699. TASK-188-04 resolver filtering from policy

Date: 2026-04-19
Version: unreleased
Tasks: TASK-188-04

## Key Changes

### Assistant/Core

- Added a policy-backed resolver adapter for operation/resource aliases, filters, counts, candidate matching, and surface-only fallback.
- Updated CMS target resolution to use `assistantOperationPolicy` instead of `cmsResourceRegistry` for resolver behavior.
- Changed unknown or unsupported filters to fail closed rather than widening matches.
- Added policy resolver tests for aliases, filter canonicalization, OR matching, surface-only fallback, and unknown-filter denial.

### Docs

- Documented policy-driven resolver/filter behavior in CMS API and LLM Guide acceptance docs.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
