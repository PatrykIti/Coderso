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
- Rebuild the `slots` object in the intended visual column order, because the
  current renderer derives repeatable slot order from `Object.keys(slotMap)` via
  `resolveWidgetSlotTargets`.
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
| `core/admin/ui/pages/builder/BlockSettings.tsx` | Own the atomic block update that changes Grid Columns data and the ordered `slots` object together; keep mutation ownership here. |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | Presentation-only if needed: extend existing `VisualPanelSlotControls` items with generic move handlers rendered from `BlockSettings`; do not add a Grid Columns-specific `WidgetEditorContext` callback. |
| `core/admin/ui/pages/builder/blockUtils.ts` | Add or extend a pure builder helper that rebuilds ordered slot maps collision-safely and preserves unmatched slots. |
| `core/widgets/slots.ts` | Add a pure repeatable-slot ordering helper only if `blockUtils.ts` needs shared parsing/building behavior. |
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Optional only for copy/desync warnings; do not place slot-mutating reorder controls here unless a generalized slot-operation context exists. |
| `core/widgets/core/gridColumns.tsx` | Add pure `reorderGridColumnsData` helper only if it can stay Bun-free and schema-owned. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | Cover move up/down controls, disabled states, and data preservation. |
| `tests/vitest/widgets/gridColumns.test.tsx` | Cover runtime visual order if renderer behavior changes or a pure data helper is added. |
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
};

function isSlotIdForDefinition(definitionId: string, slotId: string): boolean {
  return parseRepeatableSlotId(slotId)?.definitionId === definitionId;
}

function reorderRepeatableSlotMap(
  slots: WidgetBlock["slots"],
  definitionId: string,
  orderedInstanceIds: string[]
): { slots: WidgetBlock["slots"]; warnings: Array<"unmatched_grid_column_slot"> } {
  const currentSlots = slots ?? {};
  const orderedSlotIds = orderedInstanceIds.map((instanceId) =>
    buildRepeatableSlotId(definitionId, instanceId)
  );
  const orderedSet = new Set(orderedSlotIds);
  const currentKeys = Object.keys(currentSlots);
  const nextSlots: NonNullable<WidgetBlock["slots"]> = {};

  for (const slotId of orderedSlotIds) {
    if (slotId in currentSlots) nextSlots[slotId] = currentSlots[slotId] ?? [];
  }
  for (const slotId of currentKeys) {
    if (isSlotIdForDefinition(definitionId, slotId) && !orderedSet.has(slotId)) {
      nextSlots[slotId] = currentSlots[slotId] ?? [];
    }
  }
  for (const slotId of currentKeys) {
    if (!isSlotIdForDefinition(definitionId, slotId)) {
      nextSlots[slotId] = currentSlots[slotId] ?? [];
    }
  }

  const expectedSlotIds = new Set(orderedSlotIds);
  const hasUnmatchedGridSlot = currentKeys.some(
    (slotId) => isSlotIdForDefinition(definitionId, slotId) && !expectedSlotIds.has(slotId)
  );
  return {
    slots: nextSlots,
    warnings: hasUnmatchedGridSlot ? ["unmatched_grid_column_slot"] : [],
  };
}

function reorderGridColumnsBlock(block: WidgetBlock, plan: GridColumnReorderPlan) {
  const data = reorderGridColumnsData(block.data as GridColumnsData, plan.fromIndex, plan.toIndex);
  const slotResult = reorderRepeatableSlotMap(block.slots, "column", plan.nextColumnIds);
  return {
    block: { ...block, data, slots: slotResult.slots },
    warnings: slotResult.warnings,
  };
}
```

Error handling:

- Do not drop slot children when a column id is missing; preserve unmatched slots
  and surface a non-destructive editor warning.
- Do not mutate column ids for reorder. Reorder by moving `columns[]` entries and
  reconstructing `slots` insertion order with the same `column:<id>` keys and
  the same nested block arrays.
- Never perform a source-to-target slot id swap in-place. If a future TASK-256
  sync path must rename instance ids, it needs a separate two-phase remap helper
  with collision tests before TASK-271 can use it.
- Carry all unmatched legacy `column:*` slots forward after the ordered slots so
  old content remains reachable and a warning can explain the mismatch.
- Non-Grid-Columns slots must keep their existing entries and should be appended
  after repeatable column slots without deletion.
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
  helper is added or renderer order changes.
- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/blockList.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx` only if
  the existing slot-control presentation API changes.
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
- Runtime/order tests prove the visual column order changes in the same order as
  the ordered repeatable slot keys consumed by `resolveWidgetSlotTargets`.
- Legacy or unmatched `column:*` slots survive reorder and produce a visible
  non-destructive warning instead of being silently deleted.
