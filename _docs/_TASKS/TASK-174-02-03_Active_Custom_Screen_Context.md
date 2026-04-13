# TASK-174-02-03: Active Custom Screen Context
# FileName: TASK-174-02-03_Active_Custom_Screen_Context.md

**Priority:** High
**Category:** Assistant/Context + Custom Screens
**Estimated Effort:** Medium
**Dependencies:** TASK-174-02
**Status:** To Do

---

## Overview

Expose bounded active custom screen context to `LLM Guide` for screen builder, screen records list, and screen record editor routes.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`
- `core/admin/ui/assistant/useAssistantAdminContext.ts`
- `core/services/assistant/adminContextTypes.ts`
- `core/services/assistant/adminContextService.ts`
- `tests/vitest/ui/use-assistant-admin-context.test.tsx`
- `tests/vitest/assistant/admin-context-service.test.ts`

## Security Contract

- Visibility: internal admin planning context only.
- Auth model: existing admin session.
- RBAC: context is advisory; server hydration must require `content:read`.
- CSRF: plan route remains POST + CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: reject unknown custom screen context fields.
- Anti-abuse: no mutation in this leaf.
- Idempotency: not applicable.
- Secret handling: no raw entry values or form submissions; bindings/blocks are summarized and redacted.

## Testing Requirements

- Vitest:
  - captures screen id/name/contentTypeId/status,
  - captures bindings/capabilities summary,
  - captures selected entry id on record editor routes,
  - redacts secret-like bindings/config.
- Bun:
  - route smoke only if server hydration is added.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Assistant context identifies the active custom screen and selected entry.
2. Bindings/capabilities are available for planning safe screen edits.
3. No raw entry values leak into provider/browser context.
