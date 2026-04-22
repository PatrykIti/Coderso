# TASK-190-06-03-03: Collection Workspace Assistant Context and Follow-Up Integration
# FileName: TASK-190-06-03-03_Collection_Workspace_Assistant_Context_and_Follow_Up_Integration.md

**Priority:** High
**Category:** Assistant/Core + Admin Context
**Estimated Effort:** Medium
**Dependencies:** TASK-190-05-03-07, TASK-190-06-03-01, TASK-190-06-03-02
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
- Update `tests/vitest/assistant/active-surface-hydration.test.ts`
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
  collectionWorkspace?: {
    contentTypeId: string;
    activeDetailPageId?: string | null;
  } | null;
};
```

Rules:

- workspace route parsing must continue to resolve to
  `area: "coderso"` + `codersoModule: "engine"`,
- `AssistantCollectionWorkspaceSummary` remains owned by the server read model
  from `TASK-190-06-03-01`; the browser sends only the bounded identity hint
  above, and this leaf rehydrates the bounded summary server-side for assistant
  context instead of redefining it in the browser,
- `assistantRoutes.ts` plus the server-side workspace loader own permission
  parity for that rehydration. They must reuse the same underlying read guard
  contract as the collection-workspace endpoint/read model from
  `TASK-190-06-03-01` instead of treating generic assistant `content:read` as
  sufficient for every linked resource the workspace summary may expose,
- if the actor cannot satisfy that workspace read contract, the route drops the
  workspace package from assistant context instead of trusting browser-supplied
  summary payloads, broadening generic assistant permissions, or creating a
  second browser-local transport,
- selected resource stays the collection/content-type shell resource for the
  workspace root; do not repurpose `/admin/coderso/engine/:contentTypeId/collection`
  to `selectedResource.kind = "detail-page"`,
- the active detail-template editor publishes `activeSurface.kind = "detail-page"`,
- this leaf consumes the detail-page read/admin seam introduced by
  `TASK-190-05-03-07`; it must not add a second ad-hoc detail-page lookup or
  hydration path inside assistant context just to make follow-up planning work,
- `useAssistantAdminContext.ts` must extend the existing
  `activeSurfaceMatchesRoute(...)` contract with an explicit workspace-aware
  branch instead of globally relaxing the match rule:
  - preserve `activeSurface.kind = "detail-page"` only when the current route is
    inside the collection workspace,
  - `runtimeSnapshot.selectedResource.kind === "content-type"` for that route,
  - and the server-hydrated `collectionWorkspace` summary proves that the active
    detail-page id belongs to that collection content type,
- the bounded workspace summary therefore needs identity fields required for
  reconciliation, at minimum:
  - `contentType.id`,
  - canonical/current `detailPage.id | null`,
  - optional `activeDetailPageId | null` when the editor can switch between
    multiple bounded detail-page candidates within the workspace flow,
- server hydration for `detail-page` reuses content-domain services,
- if the workspace route lands before the detail-page read seam from
  `TASK-190-05-03-07`, the workspace package may still hydrate, but
  `activeSurface.kind = "detail-page"` must stay gated/null instead of
  re-implementing detail-page reads in the assistant layer,
- workspace-root follow-up uses the same server-owned collection workspace read
  model from `TASK-190-06-03-01`; the browser must not become the source of
  truth for canonical linked resources,
- `adminContextService.ts` and `providerPlanningContext.ts` consume only the
  server-hydrated bounded workspace summary; raw browser
  `collectionWorkspace` payloads must not cross the provider boundary,
- assistant route/provider packaging extends the current bounded context package
  with `collectionWorkspace` only after server-side rehydration/validation,
- `assistantRoutes.ts` keeps explicit surface permission branches. Read planning
  for `activeSurface.kind = "detail-page"` follows page parity:
  - require `content:read` because the surface is content-owned,
  - require `widgets:read` because the surface exposes widget/template block
    structure and template references,
  - implement this as an explicit `detail-page` branch rather than loosening the
    global page/widget-template/custom-screen checks,
- if a later dedicated detail-template child route is added under the same
  workspace family, it may additionally resolve `selectedResource.kind =
  "detail-page"` through the current route helpers, but this leaf must work
  before such a route exists,
- no second route-to-surface transport is introduced.

## Security Contract

- Visibility: internal assistant planning context only.
- Auth model: existing assistant admin session flow.
- RBAC:
  - runtime snapshot remains advisory; server-side hydration and action
    execution remain authoritative,
  - `detail-page` active-surface read context uses explicit page-parity gating
    (`content:read`) plus `widgets:read`,
  - write/publish authority remains owned by the eventual action family or
    internal detail-page routes, not by client-side active-surface state.
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
- `/assistant/actions/plan` keeps explicit permission parity for
  `activeSurface.kind = "detail-page"`: `content:read` plus `widgets:read`,
  without broadening unrelated surface checks.
- `active-surface-hydration.test.ts` covers the new `detail-page` rehydration
  branch directly, including the drop-to-null behavior for stale or missing
  server resources.
- active surface can publish and rehydrate `detail-page`.
- workspace-root route with `selectedResource.kind = "content-type"` still keeps
  `activeSurface.kind = "detail-page"` only through the explicit
  workspace-aware reconciliation rule; matching must not be loosened globally
  for unrelated routes/surfaces.
- missing detail page resource clears the active surface instead of trusting
  stale browser state.
- workspace-root follow-up context is rehydrated server-side from the bounded
  collection workspace endpoint/package, not from browser-only state.
- browser-supplied `collectionWorkspace` summary payloads are ignored/replaced
  by the server-owned bounded workspace summary derived from
  `TASK-190-06-03-01`.
- if the detail-page read/admin seam from `TASK-190-05-03-07` is unavailable,
  assistant context drops/gates the detail-page active surface instead of
  creating a parallel fetch/hydration path.
- missing workspace-read permission parity clears/drops the workspace follow-up
  package instead of broadening generic assistant-route access or trusting
  browser-owned context.
- existing page/widget-template/custom-screen assistant context remains green.
- no parallel browser-local transport is added for collection workspace
  follow-up.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
