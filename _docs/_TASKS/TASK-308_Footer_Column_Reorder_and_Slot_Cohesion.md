# TASK-308: Footer Column Reorder and Slot Cohesion

# FileName: TASK-308_Footer_Column_Reorder_and_Slot_Cohesion.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Slot Contract
**Estimated Effort:** Large
**Dependencies:** TASK-268
**Status:** To Do

---

## Overview

Add truthful Footer column reordering without detaching nested slot content from
the visible column the user thinks they are moving.

TASK-268 implements deterministic link reordering but intentionally leaves
column reordering deferred because the current Footer slot contract is
positional: `column-1`, `column-2`, and `column-3` are not just visual columns,
they are builder slot owners. Reordering only the column data would make links
move while nested slot widgets stayed behind, which is misleading. This task is
the future owner for deciding and implementing a coherent column + slot move
policy.

## Scope Boundary

This task owns:

- A product decision for whether Footer columns can be reordered at all while
  slot content exists.
- The runtime/editor contract for moving visible column data together with the
  matching slot content, or an explicit alternative that stays truthful.
- Builder/editor tests that prove slot content and column data stay aligned
  after reorder.
- Footer docs/report updates once the contract is implemented.

This task does not own generic page-builder drag-and-drop infrastructure,
generic repeatable-slot remapping outside Footer, or any new public route.

## Sub-Tasks

- [ ] Decide whether column reorder moves slot content, rebinds slot ids, or is
  intentionally unsupported when slot content exists.
- [ ] If reorder is supported, define the exact slot/data remap policy for
  `column-1`, `column-2`, and `column-3`.
- [ ] Add accessible move controls or another truthful UI path in
  `FooterEditors.tsx`.
- [ ] Add runtime/editor tests proving column order and slot content remain
  aligned.
- [ ] Update `_docs/_WIDGETS/FOOTER.md`, `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md`,
  and the task board when this contract lands.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | Add column reorder UI only after the slot/data policy is explicit. |
| `core/widgets/core/footer.tsx` | Update any runtime assumptions if visible column order becomes data-driven. |
| `tests/vitest/ui/footer-editor-wave.test.tsx` | Cover Footer column move controls and the chosen slot-safe behavior. |
| `tests/vitest/widgets/footer.test.tsx` | Cover runtime column order if it becomes user-configurable. |
| `tests/vitest/widgets/renderer.test.tsx` | Add integration proof if slot remapping changes `WidgetRenderer` behavior. |
| `_docs/_WIDGETS/FOOTER.md` | Document the final column reorder policy and slot implications. |

## Implementation Pseudocode

```ts
type FooterColumnMovePlan =
  | { mode: "blocked"; reason: "slot-content-present" | "unsupported-policy" }
  | {
      mode: "remap";
      fromIndex: number;
      toIndex: number;
      dataOrder: FooterColumn[];
      slotOrder: FooterColumnSlotId[];
    };

function resolveFooterColumnMovePlan(input: {
  columns: FooterColumn[];
  slots: Record<string, WidgetBlock[]>;
  fromIndex: number;
  toIndex: number;
}): FooterColumnMovePlan {
  const slotIds = ["column-1", "column-2", "column-3"] as const;
  const sourceSlot = slotIds[input.fromIndex];
  const targetSlot = slotIds[input.toIndex];
  const sourceHasSlotContent = (input.slots[sourceSlot] ?? []).length > 0;
  const targetHasSlotContent = (input.slots[targetSlot] ?? []).length > 0;

  if (sourceHasSlotContent || targetHasSlotContent) {
    return { mode: "blocked", reason: "slot-content-present" };
  }

  return {
    mode: "remap",
    fromIndex: input.fromIndex,
    toIndex: input.toIndex,
    dataOrder: moveItem(input.columns, input.fromIndex, input.toIndex),
    slotOrder: moveItem([...slotIds], input.fromIndex, input.toIndex),
  };
}
```

Error handling:

- If the chosen product policy blocks reorder while slot content exists, the UI
  must explain that reason explicitly instead of silently disabling move
  buttons.
- If the chosen product policy allows reorder, column data and slot content
  must move as one atomic contract.
- Do not introduce hidden runtime fallback that re-sorts columns independently
  from the editor-visible order.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: any new reorder metadata must be explicit and
  schema-owned.
- Anti-abuse: no hidden slot detachment or silent slot/data divergence.
- Secret handling: no secrets in editor state, tests, docs, or report notes.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if slot
  wiring or runtime output changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/FOOTER.md`
- `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when completed

## Acceptance Criteria

- Footer column reorder is either supported truthfully end-to-end or rejected
  explicitly with a documented slot-based reason.
- No user-facing reorder control leaves links and nested slot widgets out of
  sync.
- Runtime/editor/docs/tests agree on the final slot + column contract.
