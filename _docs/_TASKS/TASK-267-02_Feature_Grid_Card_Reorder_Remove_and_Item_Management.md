# TASK-267-02: Feature Grid Card Reorder, Remove, and Item Management

# FileName: TASK-267-02_Feature_Grid_Card_Reorder_Remove_and_Item_Management.md

**Priority:** High
**Category:** Widgets + Feature Grid + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-267-01
**Status:** Done (2026-05-17)

---

## Overview

Improve Feature Grid repeated-card management with drag-and-drop reorder and a
recoverable remove flow, while preserving keyboard-accessible move controls.

This leaf is editor-only. It must not change the Feature Grid schema unless the
implementation discovers that stable item ids need a backward-compatible
normalizer fix.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:218-220` - UX-03 move
  up/down is tedious for up to eight cards.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:230-232` - UX-06 remove is
  immediate without confirm/undo.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:384-385` - priority summary.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | Add native drag handle/drop behavior for card rows, keep move up/down fallback, and add either local undo state or a `ConfirmActionDialog` remove flow. |
| `core/admin/ui/shared/ConfirmActionDialog.tsx` | Reuse as-is if the implementation chooses confirmation. Do not fork a widget-local dialog. |
| `tests/vitest/ui/feature-grid-editor-wave.test.tsx` | Add DnD event assertions, keyboard/button fallback assertions, and remove recovery/confirm assertions. |
| `_docs/_WIDGETS/FEATURE_GRID.md` | Document the editor item-management behavior. |
| `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md` | Mark UX-03/UX-06 fixed or record deferral evidence. |

## Implementation Pseudocode

```tsx
type FeatureGridDragState = {
  fromIndex: number;
  itemId: string;
};

function handleCardDragStart(event: React.DragEvent, index: number, item: FeatureGridItem) {
  event.dataTransfer.setData("text/plain", `feature-grid:${index}`);
  event.dataTransfer.effectAllowed = "move";
  setDragState({ fromIndex: index, itemId: item.id ?? `item-${index + 1}` });
}

function handleCardDrop(event: React.DragEvent, toIndex: number) {
  const [, rawIndex] = event.dataTransfer.getData("text/plain").split(":");
  const fromIndex = Number(rawIndex);
  if (!Number.isFinite(fromIndex) || fromIndex === toIndex) return;
  moveItem(value, onChange, fromIndex, toIndex);
}

function confirmRemoveItem(index: number) {
  setPendingRemoveIndex(index);
}

function handleConfirmedRemove() {
  if (pendingRemoveIndex === null) return;
  removeItem(value, onChange, pendingRemoveIndex);
  setPendingRemoveIndex(null);
}
```

Error handling:

- Ignore malformed drag payloads and reset hover/drag state.
- Keep remove disabled at the one-card minimum.
- If choosing undo instead of confirmation, implement it with local component
  state such as `lastRemovedItem`, `lastRemovedIndex`, and an inline Undo action;
  do not call an undeclared `toast` helper from pseudocode.
- If choosing confirmation, render the existing shared `ConfirmActionDialog`
  with the card title/index and call `removeItem` only from `onConfirm`.
- Keep keyboard move buttons visible or available to assistive tech; drag is an
  additional affordance, not the only reorder path.
- Do not introduce a new DnD dependency unless a repo-approved shared DnD helper
  already exists and is compatible with the editor tests.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing.
- Reject-unknown validation: unchanged.
- Anti-abuse: drag/drop payloads are local editor events and must not be
  persisted except through normalized `items` order.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/featureGrid.test.tsx` if item id
  normalization changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run precommit`

## Documentation Updates Required

- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md`
- `_docs/_TASKS/TASK-267-02_Feature_Grid_Card_Reorder_Remove_and_Item_Management.md`
- `_docs/_TASKS/README.md` on status changes

## Completion Notes

- Done (2026-05-17). Card rows now support drag-handle reorder, keep the move
  button fallback, and use the shared confirm dialog for destructive removal.
- Final family validation is recorded in `TASK-267-08`.

## Acceptance Criteria

- Users can reorder Feature Grid cards through drag-and-drop and still have a
  keyboard/button fallback.
- Removing a card is recoverable through undo or requires explicit confirmation.
- The editor never drops below one card or exceeds `featureGridItemMax`.
- Vitest editor coverage proves reorder/remove behavior without relying on a real
  browser server.
