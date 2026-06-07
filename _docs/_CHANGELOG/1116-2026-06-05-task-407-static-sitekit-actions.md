# 1116 - TASK-407 static siteKit action coverage gates

Date: 2026-06-05
Version: unreleased
Tasks: TASK-407-05-L02

## Key Changes

### Assistant Site Builder
- Added a reviewed static shell coverage helper for schema-exact siteKit input.
- Wired the helper into the production `buildSiteKitActionPlan` path used by
  `planAssistantActions({ context: { siteKit } })`.
- Kept static page, navigation/footer, lead-capture, and SEO mutations on the
  existing `site-kit.recommend` / `site-kit.install` path.
- Validated install previews for page resources, primary/footer menus,
  lead-capture forms, SEO defaults, action ids, and same-plan
  `target:resourceKey` locators.

### Safety
- Missing static shell coverage now becomes a blocking gate before execute.
- Unknown fields still fail through the existing strict assistant action-plan
  schema.
- Raw intake prompt/facts stay out of executable action payloads.

### QA
- Added Vitest coverage for static shell resources, strict schema validation,
  reject-unknown behavior, idempotent locators, production planner wiring,
  partial resource drift, and lead-capture drift gates.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeStaticActions.test.ts`
- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeStaticActions.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
