# TASK-050-15-01: Repeatable Slots Core for Layout Widgets
# FileName: TASK-050-15-01_Repeatable_Slots_Core_for_Layout_Widgets.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-15, TASK-050-04  
**Status:** To Do

---

## Overview

Extend the slot model to support repeatable slot groups used by layout widgets
(Section and Grid/Columns), while keeping fixed-slot widgets unchanged.

Goal: editors can add/remove/reorder slot instances in Visual mode with stable,
persisted slot IDs.

---

## Scope

- Add slot kind metadata (`fixed` / `repeatable`) to widget slot definitions.
- Add constraints for repeatable slots (`minItems`, `maxItems`).
- Add deterministic slot-instance IDs in widget data.
- Update insert dialog and canvas insertion flow to handle repeatable slot instances.
- Add normalization and validation guards for slot-instance drift.

---

## Pseudo-Implementation

```ts
// core/widgets/types.ts
export type WidgetSlotDefinition = {
  id: string;
  label: string;
  kind?: "fixed" | "repeatable";
  minItems?: number;
  maxItems?: number;
  allowedTypes?: string[];
};

// Widget data for repeatable slots stores slot instances deterministically
export type RepeatableSlotItem = { id: string; label: string };
```

```ts
// core/widgets/validator.ts
function normalizeRepeatableSlots(def, block) {
  // 1) read configured slot instances from block.data
  // 2) enforce min/max
  // 3) ensure every instance has stable string id
  // 4) ensure block.slots has matching keys
  // 5) prune orphaned keys only when instance removed intentionally
}
```

```ts
// core/admin/ui/widgets/widgetInsertUtils.ts
function buildSlotOptions(slotDefs, block, widgetType) {
  // fixed: existing behavior
  // repeatable: map each runtime slot instance into a selectable option
  // label example: "Column 1", "Column 2"
}
```

```tsx
// core/admin/ui/widgets/WidgetLibraryPage.tsx
function addRepeatableSlotInstance(blockId, slotDefId) {
  // append deterministic id in widget data, e.g. col_<nanoid>
  // create empty block.slots[instanceId] = []
  // mark editor state dirty
}
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/types.ts` | extend `WidgetSlotDefinition` | add repeatable metadata |
| `core/widgets/registry.ts` | validate repeatable slot contract | reject invalid min/max combos |
| `core/widgets/validator.ts` | normalize repeatable instances + slot map parity | deterministic and safe |
| `core/admin/ui/widgets/widgetInsertUtils.ts` | support runtime slot-instance options | used by insert dialog |
| `core/admin/ui/widgets/WidgetInsertDialog.tsx` | render repeatable instance labels | clear UX for target slot |
| `core/admin/ui/widgets/WidgetLibraryPage.tsx` | add handlers for add/remove/reorder slot instance | editor actions |
| `tests/unit/widgets/validator.test.ts` | add repeatable slot normalization cases | includes drift and min/max |
| `tests/unit/ui/widgetInsertUtils.test.ts` | add repeatable slot options tests | allowed types + limits |
| `tests/unit/pageBuilder/blockList.test.tsx` | add repeatable slot insertion/reorder tests | end-to-end editor behavior |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun test tests/unit/ui/widgetInsertUtils.test.ts`
- `bun test tests/unit/pageBuilder/blockList.test.tsx`

---

## Documentation Updates Required

- `_docs/WIDGETS.md` (slot contract: fixed vs repeatable)
- `_docs/PAGE_MODEL.md` (persisted `slots` + repeatable instance IDs)
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-repeatable-slots-core.md`
