# 1105 - TASK-407 Basic intake progression

Date: 2026-06-05
Version: Unreleased
Tasks: TASK-407, TASK-407-03, TASK-407-03-L01

## Key Changes

### Assistant Intake

- Added Basic site-builder step progression with registry-derived ordering,
  required-answer checks, and deterministic `needs_input` responses.
- Routed broad full-site setup prompts into Basic intake before provider
  drafting or executable action assembly.
- Kept explicit reviewed `context.siteKit` requests on the existing site-kit
  planner path.

### Planning Metadata

- Added strict `metadata.siteBuilderIntake` normalization for action plans so
  the admin UI can render the current step, visible steps, missing required
  steps, answered steps, readiness flags, accepted answer fields, control
  kinds, option registry ids, and concrete option values without parsing
  free-form assistant text.
- Required locale in Basic business-profile readiness to avoid a later
  compiler rejection after the user reaches review.
- Added backend-only planner intake state so explicit Advanced mode bypasses
  the initial Basic broad-prompt gate and active Basic sessions continue from
  their current step.

### QA

- Added Vitest coverage for Basic empty/partial/complete progression, broad
  nontechnical prompt routing, explicit page-create prompt preservation,
  render-complete action-plan metadata, strict registry validation, and
  planner-provider bypass/continuation behavior.
- Curie audit drift risks were fixed for competing step order, too-broad prompt
  routing, missing typed render metadata, locale readiness, incomplete-session
  execution, secret echo, registry validation, and planner-level Advanced/resume
  handling.
- Curie final re-audit reported no blocking findings after those fixes.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicFlow.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/actionPlannerService.test.ts` (201 tests)
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
  - `bun run precommit`
