# TASK-174-02-01: Active Page Canvas Context
# FileName: TASK-174-02-01_Active_Page_Canvas_Context.md

**Priority:** High
**Category:** Assistant/Context + Pages
**Estimated Effort:** Medium
**Dependencies:** TASK-174-02
**Status:** Done (2026-04-13)

---

## Overview

Expose bounded active page editor context to `LLM Guide` when the user is on `Pages > :id`.

The assistant must know which page is open and what canvas blocks are currently present, so prompts like "on Contact, change the CTA label" can target the right page/block through the normal plan/dry-run/review/execute flow.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/assistant/useAssistantAdminContext.ts`
- `core/services/assistant/adminContextTypes.ts`
- `core/services/assistant/adminContextService.ts`
- `core/services/assistant/adminContextCatalogNormalizer.ts`
- `tests/vitest/ui/use-assistant-admin-context.test.tsx`
- `tests/vitest/assistant/admin-context-service.test.ts`

## Security Contract

- Visibility: internal admin planning context only.
- Auth model: existing admin session.
- RBAC: page context is advisory; server-side hydration must require `content:read`.
- CSRF: plan route remains POST + CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: active page context schema must reject unknown fields.
- Anti-abuse: no mutation in this leaf; active context cannot grant permissions.
- Idempotency: not applicable.
- Secret handling: include page/block summaries only; no raw user PII, cookies, CSRF, access logs, or secret-like widget settings.

## Testing Requirements

- Vitest:
  - captures page id/title/slug/status from `PageEditor`,
  - captures selected block id/type/path where available,
  - summarizes block tree without leaking full raw config,
  - rejects unknown context fields.
- Bun:
  - route smoke only if server hydration is added in this leaf.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Assistant context includes active page identity and bounded canvas block summary.
2. Selected block identity is available when the UI has one.
3. Context remains advisory, redacted, and permission-safe.

## Completion Notes (2026-04-13)

- Added a small assistant active-surface context store for the admin UI.
- `PageEditor` now publishes bounded active page context:
  - page id/title/slug/status/template,
  - selected block id,
  - block id/type/path summaries,
  - slot keys and template-section references,
  - unsaved-change warning metadata.
- `useAssistantAdminContext` includes active page surface only when it matches the current route selected resource.
- Assistant plan route schema accepts the bounded `activeSurface` payload.
- Server-side `buildAssistantAdminContext` normalizes and redacts active page surface context.
- Validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/assistant/admin-context-service.test.ts`
  - `bun test tests/integration/routes/assistant.test.ts`
