# TASK-220-04-02: Dialog Preview Picker and Slot Derived State
# FileName: TASK-220-04-02_Dialog_Preview_Picker_and_Slot_Derived_State.md

**Priority:** High
**Category:** Admin Dialogs + Derived State
**Estimated Effort:** Large
**Dependencies:** TASK-220-04
**Status:** In Progress (2026-04-27)

---

## Overview

Refactor dialogs and pickers that repair values, selected steps, target ids,
blocks, slots, media rows, or title drafts in effects. Defaults should be
computed from props/options at initialization or reducer transitions.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|------|------|------|-----------------|---------------|
| core/admin/ui/forms/FormRuntimePreviewDialog.tsx | 111 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setValues(buildInitialValues(fields));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/forms/FormRuntimePreviewDialog.tsx | 137 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setCurrentStep(maxStep);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/listings/ListingFiltersPage.tsx | 63 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSelectedListingQueryId(items[0]!.id);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/listings/ListingTemplateManager.tsx | 110 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSaveError(null);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/media/MediaDetailsDrawer.tsx | 94 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setTitle(item?.title ?? (item ? resolveMediaDisplayName(item) : ""));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/media/MediaPicker.tsx | 111 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setItems(cached.map(toMediaItem));` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/widgets/WidgetInsertDialog.tsx | 134 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setTargetId(options[0]?.id ?? "");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/widgets/WidgetInsertDialog.tsx | 139 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setBlocks([]);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/widgets/WidgetInsertDialog.tsx | 192 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSlotId("");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/widgets/WidgetTemplateCategoryDrawer.tsx | 41 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setNewName("");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] Move form runtime preview initial values and max-step clamping into a
  reducer or render-derived selection.
- [ ] Move widget insert target/block/slot defaults into option-change
  transitions without post-render repair.
- [ ] Move media drawer/picker default values into initial state or explicit item
  change handlers.
- [ ] Preserve widget template category drawer reset semantics.

## Files to Change

- `core/admin/ui/forms/FormRuntimePreviewDialog.tsx`
- `core/admin/ui/widgets/WidgetInsertDialog.tsx`
- `core/admin/ui/widgets/WidgetTemplateCategoryDrawer.tsx`
- `core/admin/ui/media/MediaDetailsDrawer.tsx`
- `core/admin/ui/media/MediaPicker.tsx`
- `core/admin/ui/listings/ListingFiltersPage.tsx`
- `core/admin/ui/listings/ListingTemplateManager.tsx`
- Existing dialog/picker/listings Vitest suites under `tests/vitest/ui/**`.

## Security Contract

- Visibility: internal admin dialogs and pickers.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: unchanged.
- CSRF: existing writes unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: backend route schemas remain source of truth.
- Anti-abuse: preview/dialog state must not bypass server-side validation or
  destructive confirmation flows.
- Secret handling: no media/widget/listing picker state may include secrets.

## Pseudocode

```ts
const selectedSlot = resolveSelectableSlot(slotOptions, requestedSlotId);
const slotId = selectedSlot?.id ?? "";

// Persist only user intent in state; derive valid selected option from current
// options during render.
```

## Testing Requirements

- Preview values reset/clamp when fields/steps change.
- Widget insert defaults remain stable across page/template target changes.
- Media drawer title defaults update when item changes without overwriting user
  edits in the same open session.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Listed dialog/picker files have no `set-state-in-effect` findings.
2. Defaults and resets are deterministic.
3. Existing mutation and preview contracts are unchanged.
