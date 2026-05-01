# TASK-249-01: Workspace V3 Contract, Routes, and Legacy Path Removal
# FileName: TASK-249-01_Workspace_V3_Contract_Routes_and_Legacy_Path_Removal.md

**Priority:** High
**Category:** Coderso Custom Screens + Contracts + Routing
**Estimated Effort:** Large
**Dependencies:** TASK-249
**Status:** To Do

---

## Overview

Cut the Custom Screens workspace over to one V3 contract and remove the legacy
runtime branches that still let active screens behave as partial V2 workspaces.

This task owns the service/schema/client/route/navigation hard cutover. It does
not own the visual redesign of the builder or the interactive record canvas;
those are split into TASK-249-02 and TASK-249-03.

## Sub-Tasks

- [ ] TASK-249-01-01: Definition Schema, Read Migration, and Persistence Hard Cutover
- [ ] TASK-249-01-02: Routes, Clients, Cache, Nav, and Assistant Canonicalization

## Files to Change

- `core/services/customScreens/customScreenSchemas.ts`
- `core/services/customScreens/capabilities.ts`
- `core/services/customScreens/customScreenService.ts`
- `core/server/validation/customScreenSchemas.ts`
- `core/server/routes/customScreenRoutes.ts`
- `core/server/routes/contentEntryRoutes.ts`
- `core/admin/services/customScreensClient.ts`
- `core/admin/services/entriesClient.ts`
- `core/admin/ui/custom-screens/routeParams.ts`
- `core/admin/app/AdminApp.tsx`
- `core/admin/utils/adminPaths.ts`
- `core/admin/utils/adminPrefetch.ts`
- `core/admin/ui/navigation/sidebarConfig.ts`
- `core/admin/ui/assistant/useAssistantAdminContext.ts`
- `tests/vitest/admin/custom-screen-schemas.test.ts`
- `tests/vitest/customScreens/capabilities.test.ts`
- `tests/vitest/customScreens/customScreenService.test.ts`
- `tests/vitest/admin/customScreensClient.test.ts`
- `tests/vitest/ui/custom-screen-route-params.test.ts`
- `tests/integration/routes/customScreensRoutes.test.ts`
- `tests/integration/routes/contentEntryRoutes.test.ts`

## Contract Requirements

- The persisted workspace contract is promoted to `schemaVersion: 3`.
- `schemaVersion: 1` and legacy `schemaVersion: 2` rows are normalized on read
  into a complete V3 definition.
- V3 writes reject legacy `rowClick: "classic-editor"` and
  `createMode: "drawer"` branches instead of silently keeping them around.
- The admin client record shape no longer depends on `collection-only`,
  `dashboard`, or `editor` capability branches for active workspace screens.
- Sidebar shortcuts, prefetch, router helpers, and assistant active-surface
  context always treat Custom Screens as a records-workspace product, not as a
  builder-only detail route with optional old editor fallbacks.

## Implementation Pseudocode

```ts
type CustomScreenDefinitionV3 = {
  schemaVersion: 3;
  listView: {
    columns: CustomScreenListColumn[];
    filters: CustomScreenListFilter[];
    defaultSort: {
      field: string;
      direction: "asc" | "desc";
    };
    bulkActions: {
      delete: boolean;
      publish: boolean;
      unpublish: boolean;
    };
  };
  editorView: {
    blocks: WidgetBlock[];
    bindings: CustomScreenBinding[];
    saveMode: "entry";
    interactionMode: "inline";
  };
};
```

```ts
function normalizeCustomScreenDefinitionForRead(input, context) {
  if (input.schemaVersion === 1) {
    return migrateV1ToWorkspaceV3(input, context);
  }
  if (input.definition?.schemaVersion === 2) {
    return migrateV2ToWorkspaceV3(input.definition, context);
  }
  return normalizeWorkspaceV3(input.definition, context);
}
```

```ts
function migrateV2ToWorkspaceV3(definition, context) {
  return {
    schemaVersion: 3,
    listView: normalizeListViewV3({
      columns: definition.listView?.columns,
      filters: definition.listView?.filters,
      defaultSort: definition.listView?.defaultSort,
      bulkActions: definition.listView?.bulkActions,
    }, context),
    editorView: normalizeEditorViewV3({
      blocks: definition.editorView?.blocks,
      bindings: definition.editorView?.bindings,
      interactionMode: "inline",
      saveMode: "entry",
    }, context),
  };
}
```

## Security Contract

- Visibility: internal admin UI and internal admin API only.
- Auth model: authenticated admin session.
- RBAC:
  - screen read: `content:read`,
  - screen write: `content:write`,
  - record write: `content:write`,
  - record publish/unpublish: `content:publish`.
- CSRF:
  - screen and entry mutations continue through existing CSRF-backed clients.
- Rate-limit bucket:
  - existing `admin_write`.
- Reject-unknown validation:
  - V3 definition rejects unknown keys and removed legacy mode keys,
  - record-level `contentTypeId` is not duplicated into definition JSON,
  - entry routes keep centralized machine-readable error mapping.
- Anti-abuse:
  - no public endpoint or public-write anti-abuse contract is introduced.

## Testing Requirements

- Run the focused suites required by TASK-249-01-01 and TASK-249-01-02.
- Verify:
  - V1 and V2 reads normalize to V3,
  - V3 writes reject legacy mode keys,
  - admin client no longer parses or exposes legacy capability modes,
  - sidebar shortcuts and canonical route helpers resolve only the workspace
    list and record editor routes,
  - entry route errors still surface `entry_validation_failed`,
    `entry_slug_conflict`, `media_*`, and `relation_*` details for the new UI.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. The persisted and read-time Custom Screens contract is V3 and workspace-only.
2. Legacy route/config branches are rejected or stripped during normalization.
3. Navigation, prefetch, router helpers, and assistant context all target the
   canonical records workspace flow.
