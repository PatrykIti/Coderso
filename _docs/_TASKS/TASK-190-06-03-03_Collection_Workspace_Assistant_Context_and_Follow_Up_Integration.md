# TASK-190-06-03-03: Collection Workspace Assistant Context and Follow-Up Integration
# FileName: TASK-190-06-03-03_Collection_Workspace_Assistant_Context_and_Follow_Up_Integration.md

**Priority:** High
**Category:** Assistant/Core + Admin Context
**Estimated Effort:** Medium
**Dependencies:** TASK-190-06-03-01, TASK-190-06-03-02
**Status:** To Do

---

## Overview

Extend the existing assistant admin-context and active-surface seams so the
collection workspace and detail-template editor can participate in follow-up
planning without inventing a second browser-local transport.

This slice is about route/surface context only. It does not by itself promote
`detail-page` into the generic CMS resource family; that later promotion stays
separate.

## Sub-Tasks

No child task files.

## Files to Change

- Update `core/admin/ui/assistant/activeSurfaceContext.ts`
- Update `core/admin/ui/assistant/useAssistantAdminContext.ts`
- Update `core/services/assistant/activeSurfaceHydration.ts`
- Update `core/services/assistant/adminContextService.ts`
- Update `core/server/validation/assistantActionSchemas.ts` only if route
  payload shape changes
- Update `tests/vitest/ui/use-assistant-admin-context.test.tsx`
- Update `tests/vitest/assistant/admin-context-service.test.ts`
- Update `tests/integration/routes/assistant.test.ts` if schema changes

## Context Contract

The collection workspace stays inside the existing Engine module:

```text
/admin/coderso/engine/:contentTypeId/collection
```

Expected context additions:

```ts
type AssistantActiveSurfaceContext =
  | { kind: "page"; ... }
  | { kind: "widget-template"; ... }
  | { kind: "custom-screen"; ... }
  | { kind: "detail-page"; ... };
```

Rules:

- workspace route parsing must continue to resolve to
  `area: "coderso"` + `codersoModule: "engine"`,
- selected resource may remain the collection/content-type shell resource,
- the active detail-template editor publishes `activeSurface.kind = "detail-page"`,
- server hydration for `detail-page` reuses content-domain services,
- no second route-to-surface transport is introduced.

## Security Contract

- Visibility: internal assistant planning context only.
- Auth model: existing assistant admin session flow.
- RBAC: runtime snapshot remains advisory; server-side hydration and action
  execution remain authoritative.
- CSRF: unchanged.
- Rate-limit bucket: assistant.
- Reject-unknown validation: route context payload is strict.
- Anti-abuse: stale or mismatched workspace/detail-page ids are dropped on
  server rehydration.
- Secret handling: no preview tokens, raw bindings payloads, or secret settings
  leak into frontend runtime snapshot fields.

## Testing Requirements

- workspace route is recognized as `codersoModule: "engine"`.
- active surface can publish and rehydrate `detail-page`.
- missing detail page resource clears the active surface instead of trusting
  stale browser state.
- existing page/widget-template/custom-screen assistant context remains green.
- no parallel browser-local transport is added for collection workspace
  follow-up.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
