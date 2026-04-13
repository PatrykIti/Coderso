# 627. TASK-174-02-04 active surface hydration and redaction

**Date:** 2026-04-13
**Version:** 0.1.0
**Tasks:** TASK-174, TASK-174-02, TASK-174-02-04

## Key Changes

### Assistant Context
- Added server-side active surface hydration before action planning.
- Plan route now validates active surface identity through domain services:
  - pages via `pageService.getPage`,
  - widget templates via `widgetTemplateService.getWidgetTemplate`,
  - custom screens via `customScreenService.getCustomScreen`.
- Provider planning prompt packages include bounded/redacted active surface summaries.

### Security
- Active page and custom screen hydration requires `content:read`.
- Active widget template hydration requires `widgets:read`.
- Missing active resources clear active surface context instead of trusting stale browser payloads.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/active-surface-hydration.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/assistant/admin-context-service.test.ts`
  - `bun test tests/integration/routes/assistant.test.ts`
