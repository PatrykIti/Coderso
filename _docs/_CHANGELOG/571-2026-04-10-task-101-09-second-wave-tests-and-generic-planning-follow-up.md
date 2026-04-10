# 571. TASK-101-09 second-wave tests and generic planning follow-up

**Date:** 2026-04-10  
**Version:** 0.1.0  
**Tasks:** TASK-101-09-06-04

## Key Changes

### Validation
- Added second-wave coverage for the shipped `house-projects-catalog` slice:
  - interactive assistant panel flow in `Vitest`,
  - DB-backed mutation parity in `Bun`,
  - public runtime acceptance in `Bun`.
- Confirmed the current shipped slice now works end-to-end for:
  - plan,
  - dry-run,
  - execute,
  - public catalog landing page,
  - public entry detail route.

### Runtime Fixes
- Fixed a real runtime regression uncovered by the new tests:
  - `contentListResolver` no longer emits invalid `resolved.runtime` shape with undefined keys.
- Adjusted the hidden system list path in the house-projects blueprint to avoid route-shape conflicts with the public detail route.

### Planning Follow-Up
- Added the next task wave for making `LLM Guide` generic beyond the single house-projects blueprint:
  - intent-family routing,
  - generic catalog blueprint engine,
  - additional business presets,
  - state-aware follow-up refinement without duplicate setups.

### Validation Commands
- Ran:
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel-interaction.test.tsx`
  - `bun test tests/unit/assistant/actionExecutorService.db.test.ts`
  - `bun test tests/integration/server/assistantHouseProjectsCatalogPublicSite.test.ts`
  - `bun test tests/unit/content/contentListResolver.test.ts`
