# TASK-271-02: Grid Columns Reorder and Column Management

# FileName: TASK-271-02_Grid_Columns_Reorder_and_Column_Management.md

**Priority:** High
**Category:** Widgets + Grid Columns + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-05-01, TASK-271-01
**Status:** To Do

---

## Overview

Add Grid Columns-local column reorder controls so users can rearrange repeated
columns without editing JSON or deleting/recreating column configs.

This leaf owns report finding W7. It must build on TASK-256-05-01 so config
rows and repeatable slots remain synchronized.

## Scope

- Add move up/down controls for keyboard-accessible reorder.
- Add drag-and-drop reorder only if it follows existing admin UI patterns and
  does not introduce a new DnD dependency without approval.
- Reorder `columns[]` and matching `slots["column:<id>"]` data together through
  the page-builder owner seam.
- Preserve column ids where possible so existing nested blocks remain attached
  to the intended visual column.
- Add clear disabled states at first/last columns.

Out of scope:

- TASK-256 slot/config synchronization itself.
- Destructive remove/undo semantics beyond existing add/remove last config
  behavior unless TASK-256 introduces a shared slot removal confirmation path.

## Sub-Tasks

- [ ] Add keyboard-accessible move up/down controls for configured columns.
- [ ] Preserve nested slot content while reordering column data.
- [ ] Add drag-and-drop only if it fits existing admin UI patterns.
- [ ] Surface non-destructive warnings for unmatched legacy slots/configs.
- [ ] Add focused editor/data tests for reorder and boundary disabled states.
- [ ] Update Grid Columns docs/report evidence.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Add reorder controls in `ColumnSizingGrid` and wire them through a column reorder helper. |
| `core/widgets/types.ts` | Extend `WidgetEditorContext` with a narrow Grid Columns reorder/slot-sync callback if the editor cannot update slots through existing props. |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | Pass the page-builder-owned reorder callback through editor context; do not keep this as a data-only `onChange` update. |
| `core/admin/ui/pages/builder/BlockSettings.tsx` or page-builder block update owner | Own the atomic block update that changes Grid Columns data and slots together. |
| `core/admin/ui/pages/builder/blockUtils.ts` | Add or extend a pure builder helper that remaps only explicit slot id changes and preserves unmatched slots. |
| `core/widgets/core/gridColumns.tsx` | Add pure `reorderGridColumnsData` helper only if it can stay Bun-free and schema-owned. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | Cover move up/down controls, disabled states, and data preservation. |
| `tests/vitest/widgets/gridColumns.test.tsx` | Cover pure reorder helper if added. |
| `tests/vitest/pageBuilder/blockSettings-wave.test.tsx` | Cover atomic reorder from the builder seam and preservation of nested slot content. |
| `tests/vitest/pageBuilder/blockList.test.tsx` | Cover no accidental child deletion when block slots contain legacy or unmatched entries. |
| `_docs/_WIDGETS/GRID_COLUMNS.md` | Document column reorder behavior after implementation. |
| `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` | Mark W7 fixed/deferred with textual evidence. |

## Implementation Pseudocode

Pure data reorder:

```ts
function reorderGridColumnsData(
  data: GridColumnsData,
  fromIndex: number,
  toIndex: number
): GridColumnsData {
  const current = normalizeGridColumnsData(data);
  const columns = [...(current.columns ?? [])];
  if (!columns[fromIndex] || toIndex < 0 || toIndex >= columns.length) return current;
  const [moved] = columns.splice(fromIndex, 1);
  columns.splice(toIndex, 0, moved);
  return normalizeGridColumnsData({ ...current, columns });
}
```

Builder-owned atomic update:

```ts
type GridColumnReorderPlan = {
  fromIndex: number;
  toIndex: number;
  nextColumnIds: string[];
  idMap?: Record<string, string>;
};

function remapGridColumnSlots(
  slots: WidgetBlock["slots"],
  plan: GridColumnReorderPlan
): { slots: WidgetBlock["slots"]; warnings: Array<"unmatched_grid_column_slot"> } {
  const currentSlots = slots ?? {};
  const nextSlots = { ...currentSlots };
  const expectedSlotIds = new Set(plan.nextColumnIds.map((columnId) => `column:${columnId}`));
  const consumedSlotIds = new Set<string>();

  Object.entries(plan.idMap ?? {}).forEach(([fromColumnId, toColumnId]) => {
    const sourceSlotId = `column:${fromColumnId}`;
    const targetSlotId = `column:${toColumnId}`;
    if (!currentSlots[sourceSlotId] || sourceSlotId === targetSlotId) return;
    nextSlots[targetSlotId] = currentSlots[sourceSlotId];
    delete nextSlots[sourceSlotId];
    consumedSlotIds.add(sourceSlotId);
    consumedSlotIds.add(targetSlotId);
  });

  const hasUnmatchedGridSlot = Object.keys(currentSlots).some(
    (slotId) =>
      slotId.startsWith("column:") &&
      !expectedSlotIds.has(slotId) &&
      !consumedSlotIds.has(slotId)
  );
  return {
    slots: nextSlots,
    warnings: hasUnmatchedGridSlot ? ["unmatched_grid_column_slot"] : [],
  };
}

function reorderGridColumnsBlock(block: WidgetBlock, plan: GridColumnReorderPlan) {
  const data = reorderGridColumnsData(block.data as GridColumnsData, plan.fromIndex, plan.toIndex);
  const slotResult = remapGridColumnSlots(block.slots, plan);
  return {
    block: { ...block, data, slots: slotResult.slots },
    warnings: slotResult.warnings,
  };
}
```

Error handling:

- Do not drop slot children when a column id is missing; preserve unmatched slots
  and surface a non-destructive editor warning.
- Do not mutate column ids unless the builder slot owner explicitly rewrites the
  matching slots in the same update.
- Prefer stable column ids; when only `columns[]` order changes, preserve slot
  keys and nested children exactly as they are.
- Never rebuild `slots` from `orderedColumnIds` or ordinal keys; carry all
  unmatched legacy slots forward and remap only through an explicit `idMap`.
- If drag-and-drop is added, retain move buttons as the deterministic fallback
  and the primary test target.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged page-builder editing.
- Reject-unknown validation: unchanged unless reorder introduces persisted order
  metadata, which must be schema-validated.
- Anti-abuse: reorder must not expose raw slot ids in public output beyond
  existing deterministic `data-grid-column` markers.
- Secret handling: no secrets in diagnostics or reorder payloads.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx` if a pure
  helper is added.
- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx` if
  page-builder slot update behavior changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/GRID_COLUMNS.md` with reorder behavior and keyboard
  fallback.
- Update `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md` with W7 evidence.
- Update TASK-271-07 closure matrix.

## Acceptance Criteria

- Users can reorder columns without JSON editing.
- Reorder keeps nested column content attached to the intended column.
- Move controls are keyboard-accessible and disabled at valid boundaries.
- Tests cover data preservation and no accidental slot-child deletion.
- Legacy or unmatched `column:*` slots survive reorder and produce a visible
  non-destructive warning instead of being silently deleted.
