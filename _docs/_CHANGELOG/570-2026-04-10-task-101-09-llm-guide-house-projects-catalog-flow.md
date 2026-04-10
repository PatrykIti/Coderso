# 570. TASK-101-09 llm-guide house projects catalog flow

**Date:** 2026-04-10  
**Version:** 0.1.0  
**Tasks:** TASK-101-09

## Key Changes

### Assistant Runtime
- Added a new typed planning/execution slice for `LLM Guide` under:
  - `POST /assistant/actions/plan`
  - `POST /assistant/actions/dry-run`
  - `POST /assistant/actions/execute`
- Implemented the first business-complete guide flow for the prompt about a
  house-projects catalog.

### Domain Reuse
- The guide executor now reuses existing domain services instead of adding a
  parallel assistant-only write path:
  - content types
  - custom screens
  - listing queries
  - listing templates
  - pages
  - settings/content routes

### Admin UI
- Extended the floating assistant panel with:
  - `LLM Guide` mode label,
  - action planning branch for setup-style prompts,
  - dry-run review card,
  - execute result card with admin/public links.

### Catalog Blueprint
- Added a typed `house-projects-catalog` blueprint that provisions:
  - a structured content model,
  - a dedicated custom screen in the admin sidebar,
  - a listing query and grid template,
  - a published public catalog page,
  - public detail routes for project entries.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/admin/assistantClient.test.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/widgets/screenWidgets.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel-lazy-load.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/assistant-settings.test.tsx`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
