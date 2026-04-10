# 576. TASK-101-09-07-04 inquiry form refinement slice

**Date:** 2026-04-10  
**Version:** 0.1.0  
**Tasks:** TASK-101-09-07-04

## Key Changes

### Assistant Planner
- Added the next state-aware follow-up refinement slice for `LLM Guide`.
- Follow-up prompt:
  - "dodaj formularz zapytania do strony szczegolowej"
  now creates a refinement plan instead of returning `needs_input`.

### Typed Actions
- Added `form.upsert` to the assistant typed action contract.
- Extended `page.upsert` so catalog pages can receive a `form-embed` block.

### Domain Reuse
- Reused current forms service methods:
  - `listForms`
  - `createForm`
  - `updateForm`
  - `setFormFields`

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/catalogBlueprintEngine.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.db.test.ts tests/integration/server/assistantHouseProjectsCatalogPublicSite.test.ts`
