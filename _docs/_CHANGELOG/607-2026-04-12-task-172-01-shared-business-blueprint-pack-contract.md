# 607. TASK-172-01 shared business blueprint pack contract

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-172, TASK-172-01

## Key Changes

### Assistant Blueprints
- Added shared `AssistantBusinessBlueprintPack` contract in `businessBlueprintTypes.ts`.
- Wrapped existing catalog-family presets as ready business blueprint packs:
  - house projects
  - product catalog
  - portfolio projects
  - services directory
- Kept generated catalog action plans backward-compatible with direct `buildCatalogFamilyPlan` output.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/catalogBlueprintEngine.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
