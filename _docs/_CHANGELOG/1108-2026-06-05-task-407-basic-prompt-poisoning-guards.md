# 1108 - TASK-407 Basic prompt-poisoning guards

Date: 2026-06-05
Version: Unreleased
Tasks: TASK-407, TASK-407-03, TASK-407-03-L04

## Key Changes

### Assistant Basic Security

- Added Basic prompt-poisoning regression coverage for hostile profile, goal,
  label, section, media-policy, and review-shortcut inputs.
- Verified Basic free text remains bounded content/review/provider-context data
  and cannot enable execution, create actions, bypass review, override media
  gates, or alter role-derived routes.
- Verified broad confused-user prompts still enter the Basic guided `needs_input`
  flow and bypass provider drafting even when a provider is available.

### Hardening

- Extended provider-context instruction filtering to cover Polish Basic prompts
  that try to ignore previous instructions, disable RBAC/CSRF/schema validation,
  or execute/publish without review or permissions.
- Kept hostile unknown fields, unsupported ids, unsafe label route overrides,
  external media policy attempts, and Basic/Advanced step-boundary violations
  fail-closed through existing intake-domain errors.

### QA

- Added Vitest coverage in
  `tests/vitest/assistant/assistantSiteBuilderIntakeBasicSecurity.test.ts`.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicFlow.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicDefaults.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicReview.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicSecurity.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/actionPlannerService.test.ts` (217 tests)
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
  - `bun run precommit`
