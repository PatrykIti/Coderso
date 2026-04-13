# TASK-174-02-02: Active Widget Template Context
# FileName: TASK-174-02-02_Active_Widget_Template_Context.md

**Priority:** High
**Category:** Assistant/Context + Widget Templates
**Estimated Effort:** Medium
**Dependencies:** TASK-174-02
**Status:** Done (2026-04-13)

---

## Overview

Expose bounded active widget template editor context to `LLM Guide` when the user is on `Coderso > Widgets > Templates > :id`.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `core/admin/ui/assistant/useAssistantAdminContext.ts`
- `core/services/assistant/adminContextTypes.ts`
- `core/services/assistant/adminContextService.ts`
- `core/services/assistant/adminContextCatalogNormalizer.ts`
- `tests/vitest/ui/use-assistant-admin-context.test.tsx`
- `tests/vitest/assistant/admin-context-service.test.ts`

## Security Contract

- Visibility: internal admin planning context only.
- Auth model: existing admin session.
- RBAC: widget template context is advisory; server hydration must require `widgets:read`.
- CSRF: plan route remains POST + CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: widget template context schema must reject unknown fields.
- Anti-abuse: no mutation in this leaf.
- Idempotency: not applicable.
- Secret handling: summarize template metadata/settings/blocks; no raw secret-like settings or provider data.

## Testing Requirements

- Vitest:
  - captures template id/name/status/category,
  - captures template settings summary,
  - captures selected block id/type/path,
  - redacts secret-like block/config values.
- Bun:
  - route smoke only if server hydration is added in this leaf.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Assistant context includes active widget template identity and block summary.
2. Assistant can distinguish a reusable template target from a page-instance target.
3. Context is bounded and redacted.

## Completion Notes (2026-04-13)

- Added `widget-template` active surface context support.
- `WidgetTemplateEditorPage` now publishes bounded template context:
  - template id/name/status/category,
  - selected block id,
  - block id/type/path summaries,
  - slot keys and template-section refs,
  - wrapper container, section gap, and background-media presence,
  - remote-update warning metadata.
- `useAssistantAdminContext` includes widget template active surface only when it matches the current route selected resource.
- Assistant plan route schema accepts the bounded widget template `activeSurface` payload.
- Server-side `buildAssistantAdminContext` normalizes and redacts active widget template context.
- Validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/assistant/admin-context-service.test.ts`
  - `bun test tests/integration/routes/assistant.test.ts`
