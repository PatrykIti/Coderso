# 640. TASK-174-05-02 page template target resolution

**Date:** 2026-04-14
**Version:** 0.1.0
**Tasks:** TASK-174, TASK-174-05, TASK-174-05-02

## Key Changes

### Assistant Planning
- Added conservative page-instance vs reusable-template target resolution for template-backed page edits.
- Ambiguous selected `template-section` prompts now return a `needs_input` target question before any mutation is planned.
- Explicit page-instance prompts route to `page.widget.patch`.
- Explicit reusable-template prompts route to `widget-template.block.patch` only when the server-hydrated referenced template summary resolves one supported nested block field.
- Planner prompt classification now treats `where/how/gdzie/jak` as standalone question words, so phrases like `template everywhere` stay eligible for action planning.
- Provider planning packages preserve the referenced template target context while redacting secret-like labels and config keys.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/template-section-references.test.ts tests/vitest/assistant/admin-context-service.test.ts tests/vitest/assistant/active-surface-hydration.test.ts`
