# TASK-174-02: Active Admin Surface Context and Inspection
# FileName: TASK-174-02_Active_Admin_Surface_Context_and_Inspection.md

**Priority:** High
**Category:** Assistant/Core + Admin UI Context
**Estimated Effort:** Large
**Dependencies:** TASK-174-01
**Status:** To Do

---

## Overview

Let `LLM Guide` understand the active admin screen the user is currently viewing, including page canvas/widget structure and widget-template references.

This is the foundation for prompts like "I have Contact open; change this widget" or "this page uses a template section; inspect the template and update the widget there."

## Sub-Tasks

- `TASK-174-02-01_Active_Page_Canvas_Context.md`
- `TASK-174-02-02_Active_Widget_Template_Context.md`
- `TASK-174-02-03_Active_Custom_Screen_Context.md`
- `TASK-174-02-04_Server_Side_Context_Hydration_and_Redaction.md`

## Architecture

Active surface context must be split into two layers:
- browser advisory snapshot: route, selected resource, selected block id, visible actions, lightweight canvas hints,
- server-hydrated operation context: page/template/screen records loaded by id, normalized blocks, bindings, template references, and redacted summaries.

Required surfaces:
- Pages editor:
  - page id, slug, title, status,
  - currentData blocks summary,
  - selected block id/type/path where available,
  - template key from page settings,
  - template-section block references.
- Widget template editor:
  - template id/name/category/status,
  - blocks summary,
  - template settings summary,
  - selected block id/type/path where available.
- Custom screen builder/records:
  - screen id/name/status/content type,
  - blocks/bindings/capabilities summary,
  - selected entry id when on record editor.
- Resource catalog:
  - keep existing content types/custom screens/listings/forms/widgets summaries,
  - add enough page and widget-template catalog/detail context for operation planning.

## Pseudocode

```ts
const runtimeSnapshot = buildAssistantAdminRuntimeSnapshot({
  route,
  activeHref,
  selectedBlock,
  visibleActions,
});

const operationContext = await hydrateAssistantOperationContext({
  runtimeSnapshot,
  includeResourceCatalog: true,
  includeActiveSurface: true,
});
```

## Files to Change

- `core/admin/ui/assistant/useAssistantAdminContext.ts`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `core/admin/ui/custom-screens/*`
- `core/services/assistant/adminContextTypes.ts`
- `core/services/assistant/adminContextService.ts`
- `core/services/assistant/adminContextCatalogs.ts`
- `core/services/assistant/adminContextCatalogNormalizer.ts`
- `core/services/assistant/providerPlanningContext.ts`
- `tests/vitest/ui/use-assistant-admin-context.test.tsx`
- `tests/vitest/assistant/admin-context-*.test.ts`

## Security Contract

- Visibility: internal admin planning context only.
- Auth model: existing admin session.
- RBAC: server-hydrated details require the same read permissions as the underlying resource.
- CSRF: plan route remains POST + CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: runtime snapshot and active surface payloads reject unknown fields.
- Anti-abuse:
  - no public write path,
  - active UI context is advisory and cannot grant permissions,
  - server rehydrates target ids before planning mutations.
- Idempotency: not applicable for read-only context collection.
- Secret handling:
  - no raw form submissions, cookies, CSRF tokens, access logs, user PII, provider keys, API keys, or secret-like settings,
  - block/widget data is summarized and redacted before provider packaging.

## Testing Requirements

- Vitest:
  - active page context captures page id and selected block summary,
  - widget template context captures template id and selected block summary,
  - custom screen context captures screen id/bindings/capabilities,
  - redaction drops secret-like values,
  - unknown runtime context fields are rejected.
- Bun:
  - route permission smoke if new server hydration path is added.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. Assistant can see which admin resource/page/screen/template is active.
2. Assistant can reason about current page canvas blocks and widget template references from bounded context.
3. Server-side hydration validates target resources before operation planning.
4. Context remains redacted and permission-safe.
