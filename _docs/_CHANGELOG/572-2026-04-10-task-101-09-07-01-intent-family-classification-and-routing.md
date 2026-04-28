# 572. TASK-101-09-07-01 intent family classification and routing

**Date:** 2026-04-10  
**Version:** 0.1.0  
**Tasks:** TASK-101-09-07-01

## Key Changes

### Assistant Planner
- Replaced the single hardcoded planning detector with explicit prompt classification:
  - `docs_question`
  - `setup_request`
  - `refinement_request`
- Added intent-family routing for:
  - `catalog_showcase`
  - `product_catalog`
  - `portfolio_projects`
  - `services_directory`
  - `lead_capture_site`

### Backward Compatibility
- Kept the current `house-projects-catalog` flow as the routed ready-plan case.
- Preserved `needs_input` fallback for prompts that are broader than the currently shipped blueprint set.

### Assistant UI
- Widened the floating assistant planning heuristic so more setup/refinement prompts route into the planner path instead of being treated as docs-only chat.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/ui/assistant-panel-interaction.test.tsx`
