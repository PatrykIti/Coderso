# 1103 - TASK-407 site-builder intake siteKit handoff

Date: 2026-06-05
Version: Unreleased
Tasks: TASK-407, TASK-407-02, TASK-407-02-L03

## Key Changes

### Assistant intake handoff

- Added a service-owned compiler that converts reviewed site-builder intake
  sessions into the existing `AssistantSiteKitPlanInput` shape.
- Built the assistant action-plan request with `context.siteKit` only; no
  `context.siteBuilderIntake` route payload or route-owned duplicate intake
  schema was introduced.
- Kept richer intake facts such as page roles, sections, media policy, and
  content-engine candidates outside the `context.siteKit` payload.

### Safety and planning

- Fail closed before planner handoff when the intake review is not explicitly
  confirmed.
- Reuse the existing strict assistant route schema for `context.siteKit`,
  including rejection of unknown nested site-kit fields.
- Preserve generic site mapping by preferring broad existing site-kit families
  such as services directory or small ecommerce from structured roles rather
  than one hardcoded industry.
- Hardened automotive matching so generic Polish workshop prompts such as
  ceramic workshops or home automation workshops are not classified as
  automotive without vehicle/mechanic context.

### QA

- Added Vitest coverage for Basic and Advanced intake-to-siteKit compilation,
  strict route-schema validation, unknown-field rejection, planner handoff, and
  unconfirmed review rejection, plus generic-vs-automotive workshop regression.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts` (19 tests)
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
  - `bun run precommit`
