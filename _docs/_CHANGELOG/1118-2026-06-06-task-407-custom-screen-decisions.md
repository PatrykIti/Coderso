# 1118 - TASK-407 custom-screen decision rules

Date: 2026-06-06
Version: unreleased
Tasks: TASK-407-05-L04

## Key Changes

### Assistant Site Builder
- Added a pure custom-screen decision resolver for reviewed intake facts.
- Derived beginner editing surface candidates only from supported content-engine
  decisions.
- Exposed `reviewFacts.customScreenDecisions` while keeping custom-screen
  decisions out of strict `context.siteKit`.

### Safety
- Custom-screen candidates use backend-owned internal admin paths and the
  existing `custom-screen.upsert` family.
- Candidates require the exact existing `content:read` plus `content:write`
  permission pair and never introduce public write endpoints.
- Unsupported screen adapters, unsafe route drift, plugin/runtime write-method
  drift, and permission drift become gates before action-plan handoff.

### QA
- Added Vitest coverage for supported custom-screen candidates, static-only
  sites, unsupported adapter gates, unsafe route rejection, permission drift
  rejection, and compile metadata isolation from `context.siteKit`.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeCustomScreens.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeContentEngines.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
