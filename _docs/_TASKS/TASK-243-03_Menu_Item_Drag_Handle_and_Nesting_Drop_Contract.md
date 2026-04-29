# TASK-243-03: Menu Item Drag Handle and Nesting Drop Contract
# FileName: TASK-243-03_Menu_Item_Drag_Handle_and_Nesting_Drop_Contract.md

**Priority:** High
**Category:** CMS/Menus + Admin UI + UX + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-243
**Status:** To Do

---

## Overview

Rework Menus item drag-and-drop so the visible handle is the actual drag
affordance and drop intent is deterministic.

Current problems:

- drag starts from the whole item content button, not the visible grip handle;
- the grip is rendered with `pointer-events-none`, so it looks like a handle but
  does not own the drag interaction;
- drop intent only has `sibling` and `child`, and child intent is inferred from
  horizontal row offset;
- users cannot reliably drag right to make an item a sub-item of the item above;
- the apparent draggable/drop area feels much smaller than the visual row.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/admin/ui/menus/MenuItemRow.tsx`
  - make the grip a real draggable button/handle;
  - remove `draggable` from the whole select/open-details button;
  - keep row selection and edit/delete actions clickable.
- `core/admin/ui/menus/MenuTree.tsx`
  - make the full row a drop target;
  - resolve explicit `before`, `after`, and `child` intents;
  - render visible drop previews for each intent;
  - preserve top/bottom root drop zones.
- `core/admin/ui/menus/MenuEditorPage.tsx`
  - update move helpers and dirty-state behavior for the expanded drop intent;
  - preserve cycle prevention.
- `tests/vitest/ui/menu-tree.test.tsx`
  - add DOM/render coverage for drop previews and full-row target affordance.
- `tests/vitest/ui/menu-item-row.test.tsx`
  - prove only the grip is draggable.
- `tests/vitest/ui/menu-editor-validation.test.ts`
  - cover pure move helper behavior for before/after/child/root/cycle cases.
- `tests/vitest/ui/menu-leaf-components.test.tsx`
  - update mocks/expectations if props change.

## Security Contract

- Visibility: internal admin Menus editor only.
- Auth model: unchanged authenticated admin session.
- RBAC: unchanged `menus:write` on eventual save.
- CSRF: unchanged; drag-and-drop only mutates local draft state until
  `Save changes` / `Publish`.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: final `PUT /menus/:id/items` payload remains the
  existing strict item payload.
- Anti-abuse:
  - prevent parent/child cycles client-side before save;
  - server-side menu item validation remains authoritative;
  - drag events must not serialize sensitive data beyond the dragged item id.

## Drop Contract

Use a three-intent drop model:

```ts
export type MenuDropIntent = "before" | "after" | "child";
```

Expected behavior:

- Drag starts only from the grip handle.
- Dropping on the top part of a row moves the dragged item before the target at
  the target's current parent level.
- Dropping on the bottom part of a row moves the dragged item after the target
  at the target's current parent level.
- Dropping on the row center, or on the explicit nested preview, makes the
  dragged item the last child of the target.
- Dragging horizontally right while hovering a row should bias the preview to
  `child`.
- Dragging onto root top/bottom zones moves the item to root start/end.
- Dragging a parent into its own descendant remains blocked.

## Implementation Pseudocode

Extract pure intent resolution so it is easy to test:

```ts
export function resolveMenuDropIntent(input: {
  clientX: number;
  clientY: number;
  rect: Pick<DOMRect, "left" | "top" | "height">;
  indentThresholdPx?: number;
}): MenuDropIntent {
  const threshold = input.indentThresholdPx ?? 36;
  const offsetX = input.clientX - input.rect.left;
  const offsetY = input.clientY - input.rect.top;
  const topZone = input.rect.height * 0.25;
  const bottomZone = input.rect.height * 0.75;

  if (offsetX > threshold) return "child";
  if (offsetY < topZone) return "before";
  if (offsetY > bottomZone) return "after";
  return "child";
}
```

Make the grip the drag source:

```tsx
<button
  type="button"
  className="cursor-grab"
  draggable
  aria-label={`Drag ${label}`}
  onDragStart={(event) => {
    event.dataTransfer.setData("text/plain", item.id);
    event.dataTransfer.effectAllowed = "move";
    onDragStart?.(item, event);
  }}
  onDragEnd={(event) => onDragEnd?.(event)}
>
  <GripVertical className="h-4 w-4" />
</button>
```

Keep selection separate:

```tsx
<button
  type="button"
  draggable={false}
  aria-label={`Open menu item details for ${label}`}
  onClick={(event) => onSelect?.(item, event.timeStamp)}
>
  ...
</button>
```

Update move helper to support before/after/child:

```ts
export function moveMenuItems(
  items: MenuItemRecord[],
  dragId: string,
  targetId: string,
  intent: MenuDropIntent
) {
  if (dragId === targetId) return items;

  const dragItem = findItem(items, dragId);
  const targetItem = findItem(items, targetId);
  if (!dragItem || !targetItem) return items;

  const nextParentId = intent === "child" ? targetItem.id : targetItem.parentId ?? null;
  if (nextParentId === dragId || collectRecordDescendants(items, dragId).has(nextParentId)) {
    return items;
  }

  const nextSiblings = items
    .filter((item) => (item.parentId ?? null) === nextParentId && item.id !== dragId)
    .sort(byOrderIndex);

  const targetIndex = nextSiblings.findIndex((item) => item.id === targetId);
  const insertIndex =
    intent === "child"
      ? nextSiblings.length
      : intent === "before"
        ? Math.max(0, targetIndex)
        : Math.max(0, targetIndex + 1);

  return reparentAndReindex({
    items,
    dragItem,
    nextParentId,
    nextSiblings,
    insertIndex,
  });
}
```

Render intent feedback:

```tsx
{isDragTarget && dropIntent === "before" ? <DropLine label="Drop before" /> : null}
{isDragTarget && dropIntent === "child" ? <ChildDropPreview label={`Drop inside ${label}`} /> : null}
{isDragTarget && dropIntent === "after" ? <DropLine label="Drop after" /> : null}
```

## Error Handling

- If the drag id or target id cannot be resolved, no-op.
- If the move would create a cycle, no-op and keep the current tree.
- If a drop occurs outside a known target, clear hover state without changing
  items.
- If DataTransfer is unavailable in tests/happy-dom, keep the move helpers pure
  and assert via handler calls.

## Testing Requirements

- `tests/vitest/ui/menu-item-row.test.tsx`
  - grip has `draggable="true"` and `aria-label="Drag <label>"`;
  - open-details button is not draggable;
  - edit/delete buttons still exist.
- `tests/vitest/ui/menu-tree.test.tsx`
  - row renders before/after/child drop feedback;
  - root drop zones remain available while dragging.
- `tests/vitest/ui/menu-editor-validation.test.ts`
  - `resolveMenuDropIntent` maps top/bottom/center/right offsets correctly;
  - `moveMenuItems(..., "before")` inserts before target;
  - `moveMenuItems(..., "after")` inserts after target;
  - `moveMenuItems(..., "child")` appends as child;
  - cycle prevention still returns the original items.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/screens/menus.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

1. Users drag only from the visible grip handle.
2. Clicking the row still opens item details.
3. Full item rows accept drops reliably, not only a small lower strip.
4. Before/after/child previews are visible and match the final move.
5. Dragging right over a row offers a predictable child/nesting intent.
6. Cycle prevention and root moves still work.
