# TASK-246: Menus Drop Intent and Indicator Stability
# FileName: TASK-246_Menus_Drop_Intent_and_Indicator_Stability.md

**Priority:** High
**Category:** CMS/Menus + Admin UI + UX + Accessibility
**Estimated Effort:** Small
**Dependencies:** TASK-243, TASK-245
**Status:** Done (2026-04-30)

---

## Overview

Fix Menus editor drag-and-drop feedback so drop intent matches what users see
while dragging from the grip handle.

Live browser analysis showed that the handle hit target is valid, but the
previous drop-intent contract still made the interaction feel broken:

- `resolveMenuDropIntent` required `x > 96px` before the center of a row became
  a `child` drop;
- dragging straight down from the left handle therefore mapped the middle band
  to `before` / `after` instead of sub-menu placement;
- `before` / `after` indicators were inserted into normal document flow, so
  hovering the top of a row shifted the row down and made the target feel like
  it escaped;
- the active drop line was too subtle to read quickly.

This task keeps the handle-only drag model from TASK-243/TASK-245 while making
drop feedback deterministic and visually stable.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/admin/ui/menus/menuDnD.ts`
  - simplify drop intent:
    - top 25% of row -> `before`;
    - bottom 25% of row -> `after`;
    - middle 50% of row -> `child`;
  - remove the hard-coded 96px horizontal child threshold.
- `core/admin/ui/menus/MenuTree.tsx`
  - stop inserting `DropLine` as a normal-flow sibling above/below the row;
  - pass all active drop intents directly into `MenuItemRow`;
  - remove the separate root-level drag banners so row-level `before` / `after`
    / `child` feedback is the only drag guidance shown while moving items.
- `core/admin/ui/menus/MenuItemRow.tsx`
  - render before/after indicators as absolute, pointer-events-none overlays
    inside the row so they cannot move layout or swallow drops;
  - keep the existing child drop hint inside the row;
  - make the grip visually centered with fixed `h-12` instead of occupying the
    full row height.
- `tests/vitest/ui/menu-editor-validation.test.ts`
  - update pure intent coverage for middle-row `child` behavior.
- `tests/vitest/ui/menu-tree.test.tsx`
  - prove before/after row drops happen directly on the row target and do not
    depend on inserted marker drop targets.
- `tests/vitest/ui/menu-item-row.test.tsx`
  - assert the centered grip class and absolute overlay contract.
- `docs/screens/menus.md`
  - align user guidance with the final top/middle/bottom drop zones.
- `_docs/_TASKS/README.md`
  - add TASK-246 to Done and update statistics.
- `_docs/_CHANGELOG/779-2026-04-30-menus-drop-intent-and-indicator-stability.md`
  - document the fix and validation.
- `_docs/_CHANGELOG/README.md`
  - add changelog entry 779.

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
  - client-side cycle prevention and server-side item validation remain
    authoritative.
- Nonce, signature/HMAC, and reCAPTCHA are not applicable because this task does
  not add a public write endpoint.

## Implementation Pseudocode

Simplify intent resolution:

```ts
export function resolveMenuDropIntent(input: {
  clientY: number;
  rect: Pick<DOMRect, "top" | "height">;
}): MenuDropIntent {
  const offsetY = input.clientY - input.rect.top;
  if (offsetY < input.rect.height * 0.25) return "before";
  if (offsetY > input.rect.height * 0.75) return "after";
  return "child";
}
```

Pass active row intent into `MenuItemRow` without inserting normal-flow
siblings:

```tsx
<MenuItemRow
  item={item}
  isDragTarget={hoverId === item.id && dragId !== null}
  dropIntent={hoverId === item.id ? hoverIntent : null}
  onDragOver={(target, event) => {
    const intent = resolveMenuDropIntent({
      clientY: event.clientY,
      rect: event.currentTarget.getBoundingClientRect(),
    });
    setHoverId(target.id);
    setHoverIntent(intent);
  }}
/>
```

Render before/after indicators as overlays:

```tsx
{isDragTarget && (dropIntent === "before" || dropIntent === "after") ? (
  <div
    className={cn(
      "pointer-events-none absolute left-2 right-2 z-10 flex h-7 items-center gap-2",
      dropIntent === "before" ? "-top-3" : "-bottom-3"
    )}
    data-menu-drop-line={`${item.id}:${dropIntent}`}
  >
    <span className="h-0.5 flex-1 rounded-full bg-primary" />
    <span className="rounded-full border border-primary/60 bg-background px-2 py-0.5 text-[11px] font-semibold text-primary shadow-sm">
      {dropIntent === "before" ? "Drop before" : "Drop after"}
    </span>
    <span className="h-0.5 flex-1 rounded-full bg-primary" />
  </div>
) : null}
```

Keep the handle visually centered:

```tsx
<button
  className="flex h-12 w-12 self-center ..."
  draggable
>
  <GripVertical className="pointer-events-none h-4 w-4" />
</button>
```

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/menu-editor-validation.test.ts tests/vitest/ui/menu-tree.test.tsx tests/vitest/ui/menu-item-row.test.tsx tests/vitest/ui/menu-leaf-components.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `docs/screens/menus.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/779-2026-04-30-menus-drop-intent-and-indicator-stability.md`

## Acceptance Criteria

1. Top row band maps to `before`.
2. Middle row band maps to `child` without requiring a rightward horizontal
   threshold.
3. Bottom row band maps to `after`.
4. Before/after indicators do not shift row layout.
5. Active before/after indicators are visually prominent.
6. Grip cursor area is centered and not the full row height.
7. The editor does not render separate `Drop here to move to top level` banners
   during drag because row-level indicators own the movement UX.
8. Existing row content/edit/delete controls remain non-drag interactions.
9. Targeted Vitest, lint, typecheck, and diff hygiene pass.
