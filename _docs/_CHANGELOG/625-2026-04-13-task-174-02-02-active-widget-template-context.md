# 625. TASK-174-02-02 active widget template context

**Date:** 2026-04-13
**Version:** 0.1.0
**Tasks:** TASK-174, TASK-174-02, TASK-174-02-02

## Key Changes

### Assistant Context
- Added active widget template surface context for `WidgetTemplateEditorPage`.
- The assistant now receives bounded template context:
  - template id/name/status/category,
  - selected block id,
  - block id/type/path summaries,
  - slot keys and template-section references,
  - wrapper container and section gap summary,
  - background-media presence,
  - remote-update warning metadata.
- Active surface context is included only when it matches the current route selected resource.
- Server-side assistant context normalization redacts and clamps active widget template surface data.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/assistant/admin-context-service.test.ts`
  - `bun test tests/integration/routes/assistant.test.ts`
