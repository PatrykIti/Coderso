# 626. TASK-174-02-03 active custom screen context

**Date:** 2026-04-13
**Version:** 0.1.0
**Tasks:** TASK-174, TASK-174-02, TASK-174-02-03

## Key Changes

### Assistant Context
- Added active custom screen surface context.
- Custom screen builder, records list, and record editor now publish bounded context:
  - screen id/name/status/content type/sidebar metadata,
  - screen capabilities mode,
  - selected entry id,
  - selected block id,
  - bounded block summaries,
  - bindings and writable field names,
  - unsaved/remote-update warning metadata.
- Active surface context is included only when it matches the current route selected resource.
- Server-side assistant context normalization redacts and clamps active custom screen surface data.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/assistant/admin-context-service.test.ts`
  - `bun test tests/integration/routes/assistant.test.ts`
