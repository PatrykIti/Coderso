# 573. TASK-101-09-07-02 generic catalog blueprint engine

**Date:** 2026-04-10  
**Version:** 0.1.0  
**Tasks:** TASK-101-09-07-02

## Key Changes

### Assistant Planner
- Extracted a shared catalog family blueprint builder for `LLM Guide`.
- Reworked the existing house-projects blueprint into a preset wrapper over the generic builder.

### Catalog Presets
- Added reusable catalog-family presets for:
  - house projects
  - product catalog
  - portfolio projects

### Backward Compatibility
- Kept the current `house-projects-catalog` plan output stable for the shipped execution flow.
- Preserved the current typed action families and did not widen the executor contract.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/catalogBlueprintEngine.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
