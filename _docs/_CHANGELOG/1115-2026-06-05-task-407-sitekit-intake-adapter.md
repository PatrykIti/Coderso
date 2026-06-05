# 1115 - TASK-407 siteKit intake adapter

Date: 2026-06-05
Version: unreleased
Tasks: TASK-407-05-L01

## Key Changes

### Assistant Site Builder
- Completed the intake facts compiler handoff to the existing
  `AssistantSiteKitPlanInput` contract.
- Added deterministic `selectedKitId` alongside `preferredKitId` and
  `enabledStepIds` for reviewed Basic and Advanced intake sessions.
- Kept page roles, sections, menu/hero/media choices, content engines,
  advanced layout, and reference design facts outside `context.siteKit` as
  review metadata.

### Safety
- Preserved the strict `/assistant/actions/plan` `context.siteKit` route shape.
- Kept fail-closed behavior before explicit review confirmation.
- Avoided one-industry defaults: generic workshop prompts do not select the
  automotive kit unless automotive context is explicit.

### QA
- Updated compiler tests for schema-exact `context.siteKit`, `selectedKitId`,
  review metadata separation, planner handoff, and strict route validation.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
