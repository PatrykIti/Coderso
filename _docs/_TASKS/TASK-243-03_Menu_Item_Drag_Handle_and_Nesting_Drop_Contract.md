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
  - make the grip a real draggable button/handle, as a sibling of the
    open-details button instead of a nested button;
  - remove `draggable` from the whole select/open-details button;
  - keep row selection and edit/delete actions clickable;
  - add keyboard-accessible reorder controls or grip keyboard handling.
- `core/admin/ui/menus/MenuTree.tsx`
  - make the full row a drop target;
  - resolve explicit `before`, `after`, and `child` intents;
  - render `before` and `after` drop previews at the tree level so parent rows
    with children show the marker in the final visual position;
  - make tree-level drop markers first-class drop targets with explicit
    `{ targetId, intent }` callbacks, not passive markup that can swallow drop
    events;
  - render child/nesting preview on the target row;
  - resolve drop intent again on `drop` or read it from a ref so React state
    flush timing cannot apply a stale hover intent;
  - preserve top/bottom root drop zones.
- `core/admin/ui/menus/menuDnD.ts`
  - own the pure `MenuDropIntent` type and `resolveMenuDropIntent` helper so
    UI components and tests do not depend on private component functions.
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
- Auth model: unchanged authenticated admin session / admin API key where
  supported by the shared admin stack.
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
- Nonce, signature/HMAC, and reCAPTCHA are not applicable because this leaf
  introduces no public write endpoint.

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
- Dragging horizontally right while hovering the center band should bias the
  preview to `child`. Top and bottom before/after zones win over horizontal
  movement so the contract stays deterministic.
- Dragging onto root top/bottom zones moves the item to root start/end.
- Dragging a parent into its own descendant remains blocked.
- Keyboard users reorder through explicit row actions computed in `MenuTree`:
  move up, move down, indent, and outdent. Actions must expose disabled states
  when a move is impossible and must be passed to `MenuItemRow` as typed props
  instead of making the row rediscover sibling/index context.

## Implementation Pseudocode

Extract pure intent resolution to `core/admin/ui/menus/menuDnD.ts` so it is
easy to test and reuse:

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

  if (offsetY < topZone) return "before";
  if (offsetY > bottomZone) return "after";
  if (offsetX > threshold) return "child";
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
  if (
    nextParentId === dragId ||
    (nextParentId && collectRecordDescendants(items, dragId).has(nextParentId))
  ) {
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

Pass concrete keyboard actions from `MenuTree` into each row:

```ts
type MenuKeyboardAction = {
  id: "move-up" | "move-down" | "indent" | "outdent";
  label: string;
  disabled: boolean;
  onSelect: () => void;
};

function buildKeyboardActions(input: {
  item: MenuItemDisplay;
  siblings: MenuItemDisplay[];
  previousSibling?: MenuItemDisplay;
  nextSibling?: MenuItemDisplay;
  parent?: MenuItemDisplay;
  onMove: (dragId: string, targetId: string, intent: MenuDropIntent) => void;
}): MenuKeyboardAction[] {
  return [
    {
      id: "move-up",
      label: "Move up",
      disabled: !input.previousSibling,
      onSelect: () => {
        if (input.previousSibling) {
          input.onMove(input.item.id, input.previousSibling.id, "before");
        }
      },
    },
    {
      id: "move-down",
      label: "Move down",
      disabled: !input.nextSibling,
      onSelect: () => {
        if (input.nextSibling) {
          input.onMove(input.item.id, input.nextSibling.id, "after");
        }
      },
    },
    {
      id: "indent",
      label: "Indent",
      disabled: !input.previousSibling,
      onSelect: () => {
        if (input.previousSibling) {
          input.onMove(input.item.id, input.previousSibling.id, "child");
        }
      },
    },
    {
      id: "outdent",
      label: "Outdent",
      disabled: !input.parent,
      onSelect: () => {
        if (input.parent) {
          input.onMove(input.item.id, input.parent.id, "after");
        }
      },
    },
  ];
}
```

Render intent feedback from `MenuTree`, not only inside `MenuItemRow`, and make
drop markers first-class drop targets:

```tsx
const renderTree = (items: MenuItemDisplay[], depth: number): ReactElement[] =>
  items.flatMap((item) => {
    const isTarget = hoverId === item.id && dragId !== null;
    const children = item.children?.length
      ? renderTree(item.children, depth + 1)
      : [];

    return [
      isTarget && hoverIntent === "before" ? (
        <DropLine
          key={`${item.id}:before`}
          label="Drop before"
          targetId={item.id}
          intent="before"
          onDragOverIntent={handleMarkerDragOver}
          onDropIntent={handleMarkerDrop}
        />
      ) : null,
      <MenuItemRow
        key={item.id}
        item={item}
        depth={depth}
        isDragTarget={isTarget}
        dropIntent={isTarget && hoverIntent === "child" ? "child" : null}
      />,
      ...children,
      isTarget && hoverIntent === "after" ? (
        <DropLine
          key={`${item.id}:after`}
          label="Drop after"
          targetId={item.id}
          intent="after"
          onDragOverIntent={handleMarkerDragOver}
          onDropIntent={handleMarkerDrop}
        />
      ) : null,
    ].filter(Boolean);
  });
```

Resolve drop intent at drop time as well as hover time:

```ts
const latestHoverIntentRef = useRef<MenuDropIntent>("child");

onDragOver={(hovered, event) => {
  if (!dragId) return;
  const intent = resolveMenuDropIntent({
    clientX: event.clientX,
    clientY: event.clientY,
    rect: event.currentTarget.getBoundingClientRect(),
  });
  latestHoverIntentRef.current = intent;
  setHoverId(hovered.id);
  setHoverIntent(intent);
}}

onDrop={(target, event) => {
  if (!dragId || dragId === target.id) return;
  const intent = resolveMenuDropIntent({
    clientX: event.clientX,
    clientY: event.clientY,
    rect: event.currentTarget.getBoundingClientRect(),
  }) ?? latestHoverIntentRef.current;
  onMove(dragId, target.id, intent);
}}
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
  - explicit move up, move down, indent, and outdent actions are reachable by
    keyboard and expose disabled states;
  - edit/delete buttons still exist.
- `tests/vitest/ui/menu-tree.test.tsx`
  - use `// @vitest-environment happy-dom` and mount the real tree for DnD
    behavior;
  - use happy-dom/event-driven coverage, not only static SSR snapshots;
  - fire `dragstart` from the handle;
  - fire `dragover` and `drop` with explicit `left`, `top`, and `height` rects
    for top, center, bottom, and right-offset cases;
  - drop onto before/after marker elements for an item with children and prove
    the marker itself invokes the expected `{ targetId, intent }` move;
  - row renders before/after/child drop feedback in the final visual position;
  - `onDrop` uses the resolved drop event intent, not a stale render-state
    intent;
  - root drop zones remain available while dragging.
- `tests/vitest/ui/menu-editor-validation.test.ts`
  - `resolveMenuDropIntent` maps top/bottom/center/right offsets correctly;
  - `moveMenuItems(..., "before")` inserts before target;
  - `moveMenuItems(..., "after")` inserts after target;
  - `moveMenuItems(..., "child")` appends as child;
  - cycle prevention still returns the original items.
  - before/after moves against a descendant target are also no-ops.
- Existing `tests/vitest/ui/menu-leaf-components.test.tsx` drag mocks must be
  updated to provide `left`, `top`, and `height` in `getBoundingClientRect()` if
  they keep exercising DnD behavior.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/screens/menus.md`
- `_docs/_TASKS/README.md` on status changes
- Changelog coverage is completed by the TASK-243-04 family entry and must
  list `TASK-243-03`.

## Acceptance Criteria

1. Users drag only from the visible grip handle.
2. Clicking the row still opens item details.
3. Full item rows accept drops reliably, not only a small lower strip.
4. Before/after/child previews are visible and match the final move.
5. Dragging right over a row offers a predictable child/nesting intent.
6. Keyboard users can reorder via the chosen keyboard contract.
7. Cycle prevention and root moves still work.
