# 614. TASK-172 business blueprint packs closure

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-172, TASK-172-08

## Key Changes

### Closure
- Closed the `LLM Guide` business blueprint pack wave.
- Executable packs now include:
  - lead capture site,
  - product inquiry catalog,
  - portfolio case-study catalog fields,
  - editorial content hub.
- Gated packs/paths remain for:
  - booking service setup until booking adapters land,
  - checkout/payment until commerce/payment adapters land,
  - solution-kit refinements until server-derived installed-kit context exists.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/catalogBlueprintEngine.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
  - `set -a && source .env && set +a && bun test tests/integration/server/assistantHouseProjectsCatalogPublicSite.test.ts`

### Notes
- No widget pack matrix changes were required; new packs reuse existing widgets already represented in the matrix.
