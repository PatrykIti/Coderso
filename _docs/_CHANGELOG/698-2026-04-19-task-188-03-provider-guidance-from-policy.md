# 698. TASK-188-03 provider guidance from policy

Date: 2026-04-19
Version: unreleased
Tasks: TASK-188-03

## Key Changes

### Assistant/Provider

- Added provider guidance generation from `assistantOperationPolicy`.
- Switched provider planning prompt packages to policy-derived registry and operation draft guidance.
- Switched the provider planner system prompt to embed policy guidance JSON instead of hard-coded resource/filter/create guidance.
- Allowed the CMS operation draft JSON schema builder to narrow provider-facing enums from policy.

### Docs

- Documented that provider prompt/schema metadata is now generated from operation policy.
- Updated LLM Guide acceptance lane ownership for policy-derived provider guidance.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/operation-policy-provider-guidance.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/openAiProvider.test.ts tests/vitest/assistant/openRouterProvider.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
