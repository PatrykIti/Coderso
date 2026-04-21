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

- Update `core/services/assistant/actionPlanTypes.ts`
- Update `core/admin/ui/assistant/activeSurfaceContext.ts`
- Update `core/admin/ui/assistant/useAssistantAdminContext.ts`
- Update `core/services/assistant/activeSurfaceHydration.ts`
- Update `core/services/assistant/adminContextService.ts`
- Update `core/services/assistant/providerPlanningContext.ts`
- Update `core/server/routes/assistantRoutes.ts`
- Update `core/server/validation/assistantActionSchemas.ts`
- Update `tests/vitest/ui/use-assistant-admin-context.test.tsx`
- Update `tests/vitest/assistant/admin-context-service.test.ts`
- Update `tests/vitest/assistant/provider-planning-context.test.ts`
- Update `tests/integration/routes/assistant.test.ts`

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

type AssistantActionContext = {
  ...
  collectionWorkspace?: AssistantCollectionWorkspaceSummary | null;
};
```

Rules:

- workspace route parsing must continue to resolve to
  `area: "coderso"` + `codersoModule: "engine"`,
- selected resource may remain the collection/content-type shell resource,
- the active detail-template editor publishes `activeSurface.kind = "detail-page"`,
- server hydration for `detail-page` reuses content-domain services,
- workspace-root follow-up uses the same server-owned collection workspace read
  model from `TASK-190-06-03-01`; the browser must not become the source of
  truth for canonical linked resources,
- assistant route/provider packaging extends the current bounded context package
  with `collectionWorkspace` only after server-side rehydration/validation,
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
- `assistantActionSchemas.ts` accepts the new `detail-page` active-surface shape
  and bounded `collectionWorkspace` context shape.
- active surface can publish and rehydrate `detail-page`.
- missing detail page resource clears the active surface instead of trusting
  stale browser state.
- workspace-root follow-up context is rehydrated server-side from the bounded
  collection workspace endpoint/package, not from browser-only state.
- existing page/widget-template/custom-screen assistant context remains green.
- no parallel browser-local transport is added for collection workspace
  follow-up.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
