# TASK-220-04-01: Create Drawers Auto Slug and Reset State
# FileName: TASK-220-04-01_Create_Drawers_Auto_Slug_and_Reset_State.md

**Priority:** High
**Category:** Admin Drawers + Derived State
**Estimated Effort:** Medium
**Dependencies:** TASK-220-04
**Status:** In Progress (2026-04-27)

---

## Overview

Refactor create drawer state that currently derives slug/default fields in
effects. Auto-generated values should be derived while the field is untouched or
owned by reducer transitions that handle title/name/type changes.

## Finding Inventory

Primary findings owned by this leaf from the 2026-04-27 ESLint 9 / React Hooks Compiler baseline. Re-run TASK-220-01-01 before implementation if line numbers drift.

| File | Line | Rule | Current trigger | Fix direction |
|------|------|------|-----------------|---------------|
| core/admin/ui/content-types/ContentTypeCreateDrawer.tsx | 53 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSlug(name ? slugify(name) : "");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/content-types/ContentTypeCreateDrawer.tsx | 59 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setName("");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/entries/EntryCreateDrawer.tsx | 63 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setSlug(title ? slugify(title) : "");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/entries/EntryCreateDrawer.tsx | 69 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setTitle("");` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/entries/EntryCreateDrawer.tsx | 79 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setTypeSlug(defaultTypeSlug);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |
| core/admin/ui/widgets/WidgetCreateDialog.tsx | 62 | react-hooks/set-state-in-effect (synchronous state update from effect path) | `setCategory(categories[0].name);` | Move state transition to initializer/reducer/event/subscription callback or async result boundary. |

## Sub-Tasks

- [ ] Move auto-slug behavior into field-change handlers or reducer transitions.
- [ ] Reset drawer state on explicit open/close transitions rather than an
  effect that repairs state after render.
- [ ] Preserve "touched" semantics so manual slugs are never overwritten.

## Files to Change

- `core/admin/ui/content-types/ContentTypeCreateDrawer.tsx`
- `core/admin/ui/entries/EntryCreateDrawer.tsx`
- `core/admin/ui/widgets/WidgetCreateDialog.tsx`
- Existing drawer/dialog Vitest suites under `tests/vitest/ui/**`.

## Security Contract

- Visibility: internal admin create drawers/dialogs.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: existing create permissions per resource.
- CSRF: existing create writes unchanged.
- Rate-limit bucket: existing admin write buckets.
- Reject-unknown validation: backend route schemas remain source of truth.
- Anti-abuse: client-side slug generation is convenience only; do not remove
  backend slug validation/conflict handling.
- Secret handling: not applicable.

## Pseudocode

```ts
function drawerReducer(state: DraftState, action: Action): DraftState {
  if (action.type === "title_changed") {
    return {
      ...state,
      title: action.title,
      slug: state.slugTouched ? state.slug : slugify(action.title),
    };
  }
  if (action.type === "closed") return initialDraftState(action.defaults);
  return state;
}
```

## Testing Requirements

- Auto-slug updates while untouched.
- Manual slug edits are preserved.
- Closing/reopening resets fields exactly once.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Listed drawer/dialog files no longer use effects for auto-slug/default repair.
2. Existing create payloads and validation errors are unchanged.
3. Tests cover touched-slug behavior where changed.
