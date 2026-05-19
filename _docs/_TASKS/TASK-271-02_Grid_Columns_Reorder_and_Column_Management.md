# TASK-271-02: Grid Columns Reorder and Column Management

# FileName: TASK-271-02_Grid_Columns_Reorder_and_Column_Management.md

**Priority:** High
**Category:** Widgets + Grid Columns + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-05-01, TASK-271-01
**Status:** Done (2026-05-19)

---

## Overview

Add Grid Columns-local reorder behavior that keeps column metadata and repeated
column slot content in the same order when users rearrange columns.

This leaf owns report finding W7 on top of the shared Structure move controls
already landed in TASK-293. It must use the existing widget-local block patch
seam so config rows and repeatable slots stay synchronized.

## Scope

- Reuse the existing shared Structure move controls or a widget-local
  presentation affordance, but route the mutation through `onBlockPatch` so the
  widget can reorder `columns[]` and matching `slots["column:<id>"]`
  atomically.
- Add drag-and-drop reorder only if it follows existing admin UI patterns and
  does not introduce a new DnD dependency without approval.
- Rebuild the `slots` object in the intended visual column order, because the
  current renderer derives repeatable slot order from `Object.keys(slotMap)` via
  `resolveWidgetSlotTargets`.
- Preserve column ids where possible so existing nested blocks remain attached
  to the intended visual column.
- Reuse the existing TASK-256 mismatch warning contract; do not invent a second
  unmatched-slot warning surface in this leaf.

Out of scope:

- TASK-256 slot/config synchronization itself.
- Destructive remove/undo semantics beyond existing add/remove last config
  behavior unless TASK-256 introduces a shared slot removal confirmation path.

## Sub-Tasks

- [x] Reuse the shared Structure move controls or add a widget-local reorder affordance that still flows through `onBlockPatch`.
- [x] Preserve nested slot content while reordering column data.
- [x] Add drag-and-drop only if it fits existing admin UI patterns.
- [x] Add focused editor/data tests for reorder and boundary disabled states.
- [x] Update Grid Columns docs/report evidence.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Primary widget-local owner: reuse `onBlockPatch` plus `context.slotTargets` so reorder changes column metadata and slot order atomically. |
| `core/widgets/core/gridColumns.tsx` | Add schema-owned reorder/remap helpers and any repeatable-slot sync adapter metadata needed by the widget-local patch path. |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | No new owner logic expected. Consume the existing shared `onBlockPatch` seam only if wiring changes are truly required. |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | No new shared move controls expected. Update only if the existing slot-control presentation API needs a narrow extension. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | Cover move up/down controls, disabled states, and data preservation. |
| `tests/vitest/widgets/gridColumns.test.tsx` | Cover runtime visual order if renderer behavior changes or a pure data helper is added. |
| `tests/vitest/pageBuilder/blockSettings-wave.test.tsx` | Update only if Grid Columns consumes the shared block-patch seam in a way that changes builder wiring expectations. |
| `tests/vitest/pageBuilder/blockList.test.tsx` | Existing shared reorder preservation coverage stays authoritative unless the widget adds a new pure helper. |
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

Widget-local atomic patch:

```ts
function applyGridColumnsReorderPatch(
  block: WidgetBlock,
  fromIndex: number,
  toIndex: number
): WidgetBlock {
  const nextColumnIds = resolveOrderedGridColumnIds(block);
  const movedIds = reorderBlocks(nextColumnIds, fromIndex, toIndex);
  return reorderGridColumnsBlock(block, movedIds);
}
```

Error handling:

- Do not drop slot children when a column id is missing; preserve unmatched slots
  and reuse the existing shared TASK-256 mismatch warning contract instead of
  adding a second warning surface here.
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
- `bun run gates:coderso`
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
- Legacy or unmatched `column:*` slots survive reorder without being silently
  deleted, and the existing shared mismatch warning remains the user-facing
  explanation when structure still drifts.

## Completion Notes

- 2026-05-19: Grid Columns now reorders column metadata and repeatable slot
  payloads atomically through the live block patch seam, with exact slot-order
  proof in the page-builder test lane.
- 2026-05-19: the adapter append path now reconciles drifted configs instead of
  duplicating phantom rows when Structure adds a repeatable column slot.
