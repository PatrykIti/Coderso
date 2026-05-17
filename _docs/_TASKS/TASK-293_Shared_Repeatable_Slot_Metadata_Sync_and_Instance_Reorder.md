# TASK-293: Shared Repeatable Slot Metadata Sync and Instance Reorder

# FileName: TASK-293_Shared_Repeatable_Slot_Metadata_Sync_and_Instance_Reorder.md

**Priority:** High
**Category:** Widgets + Page Builder + Admin UI + Shared Contract
**Estimated Effort:** Large
**Dependencies:** TASK-050-15-01, TASK-256-01, TASK-256-03
**Status:** To Do

---

## Overview

Add the shared page-builder contract for repeatable-slot widgets whose public
runtime and editor metadata both depend on repeatable slot instance IDs.

The current builder already exposes shared add/remove actions for repeatable
slots, but those actions only mutate `block.slots`. Slot-backed widgets such as
Accordion still need a shared owner that can:

- create matching metadata rows when a repeatable slot instance is added;
- remove or preserve metadata deterministically when a slot instance is removed;
- reorder repeatable slot instances without detaching nested slot content from
  the intended metadata row;
- expose generic move up/down controls from the shared builder seam instead of
  each widget inventing its own slot-instance mutation path.

This task unblocks deferred repeatable-slot findings such as Accordion U5/U6 in
TASK-257-03 and provides the shared contract later widget families can reuse.

## Scope Boundary

This task owns shared builder mechanics only. It does not implement widget-local
copy, icon, typography, or motion fields.

The shared contract must:

- stay builder-owned through `BlockSettings`, `VisualPanel`, and pure builder
  helpers;
- preserve nested child blocks for every repeatable slot instance;
- preserve unmatched legacy repeatable slots instead of deleting them silently;
- let widgets provide data-sync mapping (`instanceId -> item metadata`) without
  reimplementing slot mutation rules locally.

Out of scope:

- widget-specific copy/editor UX that does not mutate slot instances;
- public runtime behavior unrelated to repeatable-slot identity/order;
- route/API changes.

## Sub-Tasks

- [ ] Add a pure shared helper that can create a repeatable slot instance and
  matching widget metadata in one atomic patch.
- [ ] Add a pure shared helper that can reorder repeatable slot instances and
  rebuild the `slots` object in the intended visual order while preserving child
  arrays and unmatched legacy slots.
- [ ] Extend shared VisualPanel slot controls with generic move up/down actions
  for repeatable slot items.
- [ ] Let widgets opt into shared metadata sync with explicit callbacks or plan
  objects instead of inline widget-local slot mutations.
- [ ] Add shared tests for add/remove/reorder behavior and legacy-slot
  preservation.
- [ ] Document the shared contract and link the widgets/tasks that depend on it.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/builder/BlockSettings.tsx` | Own the atomic shared slot-control actions that add/remove/reorder repeatable slot instances with widget metadata sync. |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | Render generic move up/down controls for repeatable slot items when provided by the shared owner. |
| `core/admin/ui/pages/builder/blockUtils.ts` | Add pure helpers for repeatable-slot add/data sync and slot-map reorder. |
| `core/widgets/slots.ts` | Add pure utilities for rebuilding ordered repeatable slot maps if shared parsing/building helpers are needed. |
| `core/widgets/types.ts` | Extend shared editor context/callback types only if the current `onBlockPatch` seam cannot express the shared metadata-sync plan cleanly. |
| `tests/vitest/pageBuilder/blockSettings-wave.test.tsx` | Cover shared add/remove/reorder operations plus metadata sync. |
| `tests/vitest/pageBuilder/visualPanel.test.tsx` | Cover move-button presentation only if shared slot-control UI changes. |
| `tests/vitest/pageBuilder/blockList.test.tsx` | Cover unmatched-slot preservation and no child-array loss during reorder. |
| `_docs/PAGE_MODEL.md` | Document the shared repeatable-slot instance/order contract if persistence semantics change. |
| `_docs/_TASKS/README.md` | Keep the board synchronized when this task state changes. |

## Implementation Pseudocode

Shared add with metadata sync:

```ts
type RepeatableSlotAddPlan<TItem> = {
  definitionId: string;
  buildDefaultItem: (instanceId: string, nextIndex: number) => TItem;
  appendItem: (currentData: unknown, nextItem: TItem) => unknown;
};

function addRepeatableSlotWithDataSync<TItem>(
  block: WidgetBlock,
  plan: RepeatableSlotAddPlan<TItem>
) {
  const slots = getSlotMap(block);
  const nextInstanceId = getNextRepeatableSlotInstanceId(plan.definitionId, slots);
  const nextSlotId = buildRepeatableSlotId(plan.definitionId, nextInstanceId);
  if (nextSlotId in slots) return block;

  const nextItem = plan.buildDefaultItem(
    nextInstanceId,
    getRepeatableSlotIds({ id: plan.definitionId, label: "" } as WidgetSlotDefinition, slots).length
  );

  return {
    ...block,
    slots: {
      ...slots,
      [nextSlotId]: [],
    },
    data: plan.appendItem(block.data, nextItem),
    children: undefined,
  };
}
```

Shared reorder:

```ts
type RepeatableSlotReorderPlan = {
  definitionId: string;
  orderedInstanceIds: string[];
};

function reorderRepeatableSlotMap(
  slots: WidgetBlock["slots"],
  plan: RepeatableSlotReorderPlan
) {
  const currentSlots = slots ?? {};
  const orderedSlotIds = plan.orderedInstanceIds.map((instanceId) =>
    buildRepeatableSlotId(plan.definitionId, instanceId)
  );
  const orderedSet = new Set(orderedSlotIds);
  const nextSlots: NonNullable<WidgetBlock["slots"]> = {};

  for (const slotId of orderedSlotIds) {
    if (slotId in currentSlots) nextSlots[slotId] = currentSlots[slotId] ?? [];
  }
  for (const slotId of Object.keys(currentSlots)) {
    const parsed = parseRepeatableSlotId(slotId);
    if (parsed?.definitionId === plan.definitionId && !orderedSet.has(slotId)) {
      nextSlots[slotId] = currentSlots[slotId] ?? [];
      continue;
    }
    if (!parsed || parsed.definitionId !== plan.definitionId) {
      nextSlots[slotId] = currentSlots[slotId] ?? [];
    }
  }

  return nextSlots;
}
```

Widget-owned mapping on the shared seam:

```ts
type RepeatableSlotDataSyncAdapter<TItem> = {
  definitionId: string;
  selectItems: (data: unknown) => TItem[];
  reorderItemsByInstanceIds: (data: unknown, orderedInstanceIds: string[]) => unknown;
  removeItemByInstanceId: (data: unknown, instanceId: string) => unknown;
};
```

Error handling:

- Never mutate only `items[]` or only `slots` for slot-backed widgets.
- Preserve unmatched legacy repeatable slots after the ordered shared slots so no
  nested child content disappears during reorder.
- Keep move controls disabled at valid first/last boundaries.
- Do not expose raw slot IDs in user-facing UI beyond existing deterministic
  repeatable-slot labels.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged page-builder editing.
- Reject-unknown validation: unchanged unless widgets persist new shared order
  metadata, which must stay schema-owned.
- Anti-abuse: shared builder diagnostics must not expose secrets or unsafe HTML.
- Secret handling: no secrets in slot controls, diagnostics, or docs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx` if the
  slot-control presentation API changes
- `bun run test:vitest -- tests/vitest/pageBuilder/blockList.test.tsx`
- widget-specific focused suites for the first consumer that adopts the shared
  owner (for example Accordion or Grid Columns)
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`

## Documentation Updates Required

- Update `_docs/PAGE_MODEL.md` if slot persistence or order semantics change.
- Update each dependent widget task/report when it adopts the shared owner.
- Add a changelog entry and `_docs/_CHANGELOG/README.md` update when the task is
  completed.

## Acceptance Criteria

- Shared builder controls can add/remove/reorder repeatable slot instances
  without desynchronizing widget metadata from slot instance IDs.
- Reorder preserves nested child block arrays and unmatched legacy repeatable
  slots.
- Shared move controls are keyboard-accessible and disabled at valid
  boundaries.
- The first consumer widget can adopt the shared owner without widget-local slot
  mutation logic.
