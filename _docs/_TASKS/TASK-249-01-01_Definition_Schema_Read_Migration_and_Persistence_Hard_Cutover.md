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

## Sub-Tasks

No child task files.

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
  - preserve or migrate only the editor contract already expressed by the
    screen's current blocks/bindings,
  - do not auto-generate a writable `Editor View` for every legacy row,
  - no mode-based fallback states in the active V3 flow.
- `schemaVersion: 2` reads must strip removed legacy keys and normalize into V3.
- V3 writes reject:
  - `rowClick`,
  - `createMode`,
  - capability-mode persistence,
  - definition-owned `contentTypeId`.
- Replace capability-mode branching with definition readiness guaranteed by the
  read normalizer plus an explicit upgrade or rollout gate for legacy rows that
  are not yet editor-ready.

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
  const migratedEditorView = migrateExistingEditorView({
    blocks: input.editorView?.blocks ?? input.blocks,
    bindings: input.editorView?.bindings ?? input.bindings,
    context,
  });

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
    editorView: migratedEditorView,
  };
}
```

```ts
function validateWorkspaceCutoverEligibility(definition: CustomScreenDefinitionV3) {
  const hasInteractiveEditor =
    definition.editorView.blocks.length > 0 &&
    definition.editorView.bindings.some(
      (binding) => binding.mode === "write" || binding.mode === "readwrite"
    );

  return {
    definition,
    workspaceReady: hasInteractiveEditor,
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
  - V1/V2 rows without an existing dedicated editor contract do not silently
    become writable editor screens,
  - V2 rows with `rowClick` / `createMode` normalize to V3 without those keys,
  - V3 writes reject removed keys,
  - readiness or upgrade gating remains deterministic and explicit,
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
