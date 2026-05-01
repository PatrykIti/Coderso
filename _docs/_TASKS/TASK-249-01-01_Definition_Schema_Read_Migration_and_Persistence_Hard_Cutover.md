# TASK-249-01-01: Definition Schema, Read Migration, and Persistence Hard Cutover
# FileName: TASK-249-01-01_Definition_Schema_Read_Migration_and_Persistence_Hard_Cutover.md

**Priority:** High
**Category:** Coderso Custom Screens + Schema + Service Contract
**Estimated Effort:** Large
**Dependencies:** TASK-249-01
**Status:** To Do

---

## Overview

Promote Custom Screens to a strict `schemaVersion: 3` workspace contract and
ensure that every readable active screen lands in a complete workspace state
without `collection-only`, `dashboard`, `classic-editor`, or `drawer` residue.

## Files to Change

- `core/services/customScreens/customScreenSchemas.ts`
- `core/services/customScreens/capabilities.ts`
- `core/services/customScreens/customScreenService.ts`
- `core/server/validation/customScreenSchemas.ts`
- `tests/vitest/admin/custom-screen-schemas.test.ts`
- `tests/vitest/customScreens/capabilities.test.ts`
- `tests/vitest/customScreens/customScreenService.test.ts`

## Contract Requirements

- Add `schemaVersion: 3` as the active workspace contract.
- `schemaVersion: 1` reads must migrate to a complete V3 definition:
  - default `List View` from the selected content type,
  - default `Editor View` from the selected content type plus supported system
    fields,
  - no mode-based fallback states.
- `schemaVersion: 2` reads must strip removed legacy keys and normalize into V3.
- V3 writes reject:
  - `rowClick`,
  - `createMode`,
  - capability-mode persistence,
  - definition-owned `contentTypeId`.
- Replace capability-mode branching with definition readiness guaranteed by the
  read normalizer.

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
function buildDefaultEditorViewDefinition(contentType: ContentTypeSummary) {
  const orderedFields = listInlineEditableScreenFields(contentType.schema);
  return {
    blocks: orderedFields.map((field) => createDefaultAdminEntryBlock(field)),
    bindings: orderedFields.map((field) => createDefaultAdminEntryBinding(field)),
    saveMode: "entry",
    interactionMode: "inline",
  };
}
```

```ts
function normalizeCustomScreenDefinitionForRead(input, context) {
  switch (resolveInputVersion(input)) {
    case 1:
      return migrateV1ToWorkspaceV3(input, context);
    case 2:
      return migrateV2ToWorkspaceV3(input, context);
    case 3:
      return normalizeWorkspaceV3(input, context);
    default:
      throw new Error("custom_screen_definition_invalid");
  }
}
```

```ts
function migrateV2ToWorkspaceV3(input, context) {
  return {
    schemaVersion: 3,
    listView: normalizeListViewV3(
      {
        columns: input.listView?.columns,
        filters: input.listView?.filters,
        defaultSort: input.listView?.defaultSort,
        bulkActions: input.listView?.bulkActions,
      },
      context
    ),
    editorView: normalizeEditorViewV3(
      {
        blocks: input.editorView?.blocks,
        bindings: input.editorView?.bindings,
        saveMode: "entry",
        interactionMode: "inline",
      },
      context
    ),
  };
}
```

## Security Contract

- Visibility: internal admin API contract only.
- Auth model: authenticated admin session through existing Custom Screen routes.
- RBAC: screen reads require `content:read`; writes require `content:write`.
- CSRF: unchanged current CSRF-backed screen mutations.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation:
  - V3 rejects removed legacy mode keys,
  - V3 rejects definition-level `contentTypeId`,
  - binding paths stay strict and safe.
- Anti-abuse: no public endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - V1 rows normalize to full V3 list/editor views,
  - V2 rows with `rowClick` / `createMode` normalize to V3 without those keys,
  - V3 writes reject removed keys,
  - default editor view generation is deterministic by content type,
  - capability-mode tests are replaced with readiness-focused tests.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. Reads always produce a full V3 workspace definition for active screens.
2. Writes no longer accept legacy mode branches.
3. Capability-mode branching is removed from the active workspace contract.
