# 574. TASK-101-09-07-03 multi-family llm-guide presets

**Date:** 2026-04-10  
**Version:** 0.1.0  
**Tasks:** TASK-101-09-07-03

## Key Changes

### Assistant Planner
- Extended `LLM Guide` planning so multiple business prompt families now route to ready plans:
  - product catalog
  - portfolio/projects
  - services directory

### Blueprint Reuse
- Reused the shared catalog family blueprint engine instead of adding separate one-off planner branches.
- Kept the existing typed action families and executor surface unchanged.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/catalogBlueprintEngine.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
