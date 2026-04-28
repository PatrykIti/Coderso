# 575. TASK-101-09-07-04 house-projects filter refinement slice

**Date:** 2026-04-10  
**Version:** 0.1.0  
**Tasks:** TASK-101-09-07-04

## Key Changes

### Assistant Planner
- Added the first state-aware follow-up refinement slice for `LLM Guide`.
- Follow-up prompt:
  - "dodaj filtr po metrazu i liczbie pokoi"
  now creates a refinement plan for the existing house-projects catalog instead of a second setup plan.

### Catalog Page Refinement
- Extended `page.upsert` action input so a catalog page can receive:
  - `listing-filters` widget configuration,
  - optional content-list style overrides.
- The refinement path reuses current resource keys and updates the existing catalog page.

### Runtime Validation
- Added coverage proving the refinement:
  - updates persisted page data,
  - does not create duplicate catalog pages,
  - renders `listing-filters` in public runtime after refinement.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/catalogBlueprintEngine.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts tests/unit/assistant/actionExecutorService.db.test.ts tests/integration/server/assistantHouseProjectsCatalogPublicSite.test.ts`
