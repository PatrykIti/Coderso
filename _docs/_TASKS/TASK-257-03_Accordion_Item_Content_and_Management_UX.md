# TASK-257-03: Accordion Item Content and Management UX

# FileName: TASK-257-03_Accordion_Item_Content_and_Management_UX.md

**Priority:** High
**Category:** Widgets + Admin UI + Page Builder
**Estimated Effort:** Large
**Dependencies:** TASK-256-03, TASK-257-01, TASK-257
**Status:** To Do

---

## Overview

Improve Accordion item authoring without violating the page-builder repeatable
slot contract.

This leaf covers Accordion-specific product/editor findings from
`REPORT_ACCORDION_WIDGET.md`:

- W2: optional icon or emoji per item;
- U3: clearer "Allow all closed" copy;
- U5: item reorder affordance, but only if it keeps nested slot content aligned;
- U6: explicit add-item affordance in the Accordion editing flow.

## Scope Boundary

Accordion item order is not just an `items[]` array concern. Each item owns a
repeatable slot (`item:<id>`) that can contain nested widgets. A data-only
reorder would desynchronize titles from slot contents and is not acceptable.

This leaf may only implement item add/reorder when the code path moves the
Accordion item metadata and matching repeatable slot content together. If that
requires a shared repeatable-slot ordering helper in `BlockSettings`,
`VisualPanel`, or `blockUtils`, split that shared helper into TASK-256 or a new
shared slot task before continuing this leaf.

## Sub-Tasks

- [ ] Add optional `icon` or `leadingIcon` to Accordion item schema/defaults and
  normalizer.
- [ ] Render item icons in `<summary>` as decorative by default, with no
  user-authored HTML.
- [ ] Add Wizard/Visual controls for per-item icon text that accept short emoji
  or icon labels and normalize overlong values.
- [ ] Replace the current technical collapsible helper copy with editor-facing
  language after TASK-256 fixes behavior truthfulness.
- [ ] Verify current page-builder slot controls already expose a discoverable
  "Add item" action for Accordion; if not, add a widget-scoped affordance that
  delegates to the repeatable-slot owner instead of duplicating slot mutation.
- [ ] Design reorder only with slot/content synchronization. Do not ship
  metadata-only reorder.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/accordion.tsx` | Add item icon schema/defaults/normalizer/rendering. |
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | Add item icon controls and clearer behavior copy. |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | Touch only if an Accordion-scoped add/reorder affordance can reuse existing slot ownership safely. |
| `core/admin/ui/pages/builder/blockUtils.ts` | Touch only if a shared slot move helper is split and approved before this leaf proceeds. |
| `tests/vitest/widgets/accordionWidget.test.tsx` | Add item icon render/normalizer coverage. |
| `tests/vitest/ui/accordion-editor-wave.test.tsx` | Add item icon and copy regression coverage. |
| `tests/vitest/pageBuilder/blockSettings-wave.test.tsx` | Add only if page-builder slot controls change. |

## Implementation Pseudocode

```ts
type AccordionItem = {
  id?: string;
  title?: string;
  description?: string;
  icon?: string;
};

function normalizeAccordionItem(raw: AccordionItem, index: number) {
  return {
    id: normalizeItemId(raw.id, index, used),
    title: toTrimmedString(raw.title) ?? `Section ${index + 1}`,
    description: toTrimmedString(raw.description) ?? undefined,
    icon: normalizeShortPlainText(raw.icon, { maxLength: 24 }),
  };
}
```

Slot-safe reorder shape:

```ts
function reorderAccordionItem(block: Block, fromSlotId: string, toIndex: number) {
  const slots = getSlotMap(block);
  const orderedSlotIds = getRepeatableSlotIds(accordionItemSlot, slots);
  const nextSlotOrder = moveArrayItem(orderedSlotIds, fromIndex, toIndex);
  return {
    ...block,
    slots: rebuildObjectInOrder(slots, nextSlotOrder),
    data: reorderAccordionItemMetadata(block.data, fromInstanceId, toIndex),
  };
}
```

Error handling:

- Icons are plain text only; trim empty values to `undefined`.
- Reorder controls are hidden or disabled until the slot/content move is safe.
- Add-item controls must respect `accordionItemMax` and preserve existing nested
  slot contents.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: schema must reject unknown item keys.
- Anti-abuse: item icons are plain text and must not be rendered as HTML.
- Secret handling: no secrets in item labels, icons, slot IDs, or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
  if page-builder slot controls change
- `bun run test:vitest -- tests/vitest/pageBuilder/blockList.test.tsx` if slot
  movement helpers change
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/ACCORDION.md` with item icon and item-management
  behavior.
- Update `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md` rows W2, U3, U5, and U6
  with fixed/deferred evidence.
- If reorder is deferred because it needs a shared slot-contract task, document
  the exact blocker and follow-up task ID in the report.

## Changelog Policy

- Covered by the TASK-257 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Accordion supports safe plain-text item icons when configured.
- Editor copy for all-closed behavior is understandable to content editors.
- Add/reorder affordances either work with nested slot content preserved or are
  explicitly deferred with a shared slot-contract blocker.
