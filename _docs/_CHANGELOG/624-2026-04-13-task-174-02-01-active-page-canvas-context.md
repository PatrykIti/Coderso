# 624. TASK-174-02-01 active page canvas context

**Date:** 2026-04-13
**Version:** 0.1.0
**Tasks:** TASK-174, TASK-174-02, TASK-174-02-01

## Key Changes

### Assistant Context
- Added active page surface context for `PageEditor`.
- The assistant now receives bounded page context:
  - page id/title/slug/status/template,
  - selected block id,
  - block id/type/path summaries,
  - slot keys and template-section references,
  - unsaved-change warning metadata.
- Active surface context is included only when it matches the current route selected resource.
- Server-side assistant context normalization redacts and clamps active page surface data.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/assistant/admin-context-service.test.ts`
  - `bun test tests/integration/routes/assistant.test.ts`
