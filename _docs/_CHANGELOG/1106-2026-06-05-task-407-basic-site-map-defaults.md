# 1106 - TASK-407 Basic site-map defaults

Date: 2026-06-05
Version: Unreleased
Tasks: TASK-407, TASK-407-03, TASK-407-03-L02

## Key Changes

### Assistant Intake Defaults

- Added generic Basic advisory defaults for page roles, role-derived routes,
  simple/grouped menu items, and homepage section roles.
- Kept defaults broad-goal based instead of industry based. Signals cover
  booking, sales, portfolio/work, content, and trust.
- Kept required Basic progression intact: defaults are exposed as advisory
  `facts.basicDefaults` and do not satisfy missing required answers or bypass
  review.

### Safety

- Added bounded `customLabels` for `site-map` and `subpages` answers. Labels
  can affect display/menu copy only; route paths and item keys remain derived
  from backend page-role ids.
- Rejected unknown page/menu/section ids and unsafe custom labels containing
  URLs, scripts, admin/action-looking strings, or secret-like values.

### QA

- Added Vitest coverage for default page roles/routes/menu shape, grouped menu
  structure, goal-based section defaults across multiple broad goals, safe
  custom labels, unknown-id rejection, unsafe-label rejection, and advisory
  facts derivation.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicFlow.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicDefaults.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/actionPlannerService.test.ts` (207 tests)
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
  - `bun run precommit`
