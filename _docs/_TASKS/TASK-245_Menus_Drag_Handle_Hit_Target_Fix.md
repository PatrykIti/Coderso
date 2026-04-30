# TASK-245: Menus Drag Handle Hit Target Fix
# FileName: TASK-245_Menus_Drag_Handle_Hit_Target_Fix.md

**Priority:** High
**Category:** CMS/Menus + Admin UI + UX + Accessibility
**Estimated Effort:** Small
**Dependencies:** TASK-243
**Status:** Done (2026-04-30)

---

## Overview

Fix the Menus editor drag handle so the full visible handle lane starts a drag.

After TASK-243, Menus item drag-and-drop uses a dedicated grip handle, but live
browser feedback shows that only the lower part of the visible handle reliably
starts dragging. The cursor can show `grab` across more of the handle while
`dragstart` only fires from part of the actual browser hit target.

The root cause is a DOM hit-target contract gap:

- the drag source is the raw handle `<button draggable>`;
- the visible `GripVertical` SVG is a child of that button;
- unlike shared `Button`, this custom handle does not block SVG pointer events;
- happy-dom tests dispatch `dragstart` directly on the handle element, so they
  cannot catch real browser element-under-cursor behavior.

This task keeps the existing product contract:

- drag starts only from the grip handle, not the entire row;
- row body, edit, delete, and keyboard reorder actions stay clickable;
- local draft order changes still persist only through `Save changes` or
  `Publish`;
- before/after/child drop intent from TASK-243 remains unchanged.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/admin/ui/menus/MenuItemRow.tsx`
  - make the full painted handle lane the actual draggable hit target;
  - widen the handle lane to a clear 44-48px area;
  - prevent nested SVG/path nodes from becoming pointer targets;
  - keep the row content button `draggable={false}`.
- `tests/vitest/ui/menu-item-row.test.tsx`
  - assert the handle preserves `draggable="true"`;
  - assert row content remains non-draggable;
  - assert the handle blocks SVG pointer events.
- `_docs/_TASKS/README.md`
  - add TASK-245 to Done and update statistics.
- `_docs/_CHANGELOG/778-2026-04-30-menus-drag-handle-hit-target.md`
  - document the Menus drag handle hit-target fix and validation.
- `_docs/_CHANGELOG/README.md`
  - add changelog entry 778.

## Security Contract

- Visibility: internal admin Menus editor only.
- Auth model: unchanged authenticated admin session / admin API key where
  supported by the shared admin stack.
- RBAC: unchanged `menus:write` on eventual save.
- CSRF: unchanged; drag-and-drop only mutates local draft state until
  `Save changes` / `Publish`.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged strict menu item payload validation at
  the save route.
- Anti-abuse:
  - no public write endpoint is introduced;
  - drag events serialize only the dragged item id into `dataTransfer`;
  - server-side validation remains authoritative on save.
- Nonce, signature/HMAC, and reCAPTCHA are not applicable because this task does
  not add a public write endpoint.

## Implementation Pseudocode

Keep the handle-only drag contract, but make the full visible handle lane the
only pointer target:

```tsx
<button
  type="button"
  className={cn(
    "flex w-12 shrink-0 cursor-grab items-center justify-center self-stretch",
    "rounded-md border bg-muted/40 text-muted-foreground",
    "active:cursor-grabbing",
    "[&_svg]:pointer-events-none"
  )}
  draggable
  aria-label={`Drag ${label}`}
  title={`Drag ${label}`}
  data-menu-drag-handle={item.id}
  onDragStart={(event) => {
    event.dataTransfer.setData("text/plain", item.id);
    event.dataTransfer.effectAllowed = "move";
    onDragStart?.(item, event);
  }}
  onDragEnd={(event) => onDragEnd?.(event)}
>
  <GripVertical aria-hidden="true" focusable="false" className="h-4 w-4 pointer-events-none" />
</button>
```

Do not move `draggable` to the row body:

```tsx
<button
  type="button"
  draggable={false}
  aria-label={`Open menu item details for ${label}`}
>
  ...
</button>
```

Regression test shape:

```ts
const html = renderAdminUi(<MenuItemRow item={item} />);

expect(html).toContain('data-menu-drag-handle="item-1"');
expect(html).toContain('draggable="true"');
expect(html).toContain('draggable="false"');
expect(html).toContain("w-12");
expect(html).toContain("[&amp;_svg]:pointer-events-none");
expect(html).toContain('aria-hidden="true"');
expect(html).toContain('focusable="false"');
```

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/menu-item-row.test.tsx tests/vitest/ui/menu-tree.test.tsx tests/vitest/ui/menu-editor-validation.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

`bun run gates:coderso` is not required for this narrow DOM contract fix unless
other Menus editor behavior changes during implementation.

## Documentation Updates Required

- No product documentation update is required. The user-facing behavior remains
  “drag from the grip handle.”
- Update task board and changelog only.

## Acceptance Criteria

1. The visible grip lane is at least 44px wide.
2. The nested grip SVG cannot intercept pointer targeting from the handle.
3. The row content button remains non-draggable and clickable.
4. Existing before/after/child drop behavior and keyboard reorder actions keep
   working.
5. Targeted Vitest, lint, typecheck, and diff hygiene pass.
