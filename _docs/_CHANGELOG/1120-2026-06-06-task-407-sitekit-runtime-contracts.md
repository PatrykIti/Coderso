# 1120 - TASK-407 siteKit runtime contracts

Date: 2026-06-06
Version: unreleased
Tasks: TASK-407-05, TASK-407-05-L06

## Key Changes

### Assistant Site Builder
- Added strict/idempotent planner coverage for reviewed guided intake sessions
  that hand off to the existing `site-kit.recommend` and `site-kit.install`
  actions.
- Added a backend-only reviewed content-engine plan adapter that maps supported
  intake decisions to existing catalog-family action plans.
- Verified reviewed content-engine and custom-screen decisions stay outside
  `context.siteKit` while same-plan resource locators remain stable.
- Rejected unknown generated install payload fields before dry-run/execute.

### Public Runtime
- Extended the Bun public catalog proof so a reviewed-intake content-engine
  scenario dry-runs and executes a tokenized catalog plan, renders the public
  listing page, and renders a route-linked entry detail page through the real
  HTTP server.
- Tokenized content routes, listing resources, content type, detail-page
  template, and cleanup fixtures to keep DB-backed tests isolated.

### QA
- Closed TASK-407-05 by covering the remaining L06 dry-run/idempotency and
  runtime contract requirements.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakePlanner.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeStaticActions.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
  (180 tests)
- `bun test tests/unit/assistant/assistantSiteBuilderIntakeDryRun.test.ts`
  (1 Bun dry-run test)
- `set -a && source .env && set +a && bun test tests/integration/server/assistantHouseProjectsCatalogPublicSite.test.ts`
  (1 Bun runtime test)
