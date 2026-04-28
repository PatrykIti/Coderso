# 608. TASK-172-02 lead capture site pack

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-172, TASK-172-02

## Key Changes

### Assistant Blueprints
- Added `Lead Capture Site` blueprint pack.
- Lead capture prompts now route to a ready plan with:
  - `form.upsert` for a public inquiry form,
  - simple block-backed `page.upsert` for a landing page with form embed.

### Execution
- Extended `page.upsert` to support simple page blocks without requiring listing query/template resources.
- Reused existing form/page services and existing form runtime hardening.
- Did not add webhook automation in this pack.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/catalogBlueprintEngine.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
