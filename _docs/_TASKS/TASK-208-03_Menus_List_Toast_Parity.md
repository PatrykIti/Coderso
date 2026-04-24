# TASK-208-03: Menus List Toast Parity
# FileName: TASK-208-03_Menus_List_Toast_Parity.md

**Priority:** High
**Category:** CMS Menus + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-208-01, TASK-208-02
**Status:** To Do

---

## Overview

Add consistent top-right toast feedback for Menus list-screen create, publish,
unpublish, delete, and bulk lifecycle actions.

Menus already follow the list-first routing contract from TASK-196/TASK-200.
This round must preserve `/admin/menus` as the list surface,
`/admin/menus/:id` as the editor surface, the existing create dialog validation,
and current menu cache/client contracts.

Menus must use the same shared list-action toast helper as Pages/Posts with a
Menus adapter/config for labels, action copy, and fallback errors.

## Sub-Tasks

- [ ] `TASK-208-03-01_Menus_Create_Row_Lifecycle_Toasts.md`
- [ ] `TASK-208-03-02_Menus_Bulk_Toasts_and_Regression_Tests.md`

## Security Contract

- Visibility: internal admin Menus list.
- Auth model: existing admin session/API key.
- RBAC: existing menu write and publish permissions.
- CSRF: existing menus client helpers.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: unchanged.
- Anti-abuse: delete remains gated by shared confirmation dialogs.

## Files to Change

- `core/admin/ui/menus/MenuListPage.tsx`
- `core/admin/ui/menus/MenuCreateDialog.tsx`
- `core/admin/ui/shared/listActionToasts.ts`
- `tests/vitest/ui/menu-list-page-actions.test.tsx`
- `tests/vitest/ui/menu-leaf-components.test.tsx`
- `tests/vitest/ui/list-action-toasts.test.ts`

## Testing Requirements

- Update `tests/vitest/ui/menu-list-page-actions.test.tsx`:
  - add a `sonner` mock,
  - assert menu create success and failure toast behavior,
  - assert row publish/unpublish/delete success and failure toast behavior,
  - assert bulk publish/unpublish/delete success and partial failure toast
    behavior,
  - assert delete toasts appear after confirm, not on initial delete click.
- Update `tests/vitest/ui/menu-leaf-components.test.tsx` when
  `MenuCreateDialog` remains the owner of local validation/API error rendering:
  - render the real dialog,
  - assert rejected `onCreate` keeps local dialog error feedback,
  - assert the adapter-backed top-right error toast is emitted for rejected
    create mutations/API failures,
  - assert local empty-name validation remains inline-only and emits no
    top-right toast.
- Update `tests/vitest/ui/list-action-toasts.test.ts` if the Menus adapter adds
  helper branches not already covered by Pages/Posts.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - update Menus list feedback contract.
- `_docs/_TASKS/TASK-208*.md`
  - update status and validation notes when complete.

## Acceptance Criteria

1. Menus list create, publish, unpublish, and delete actions emit shared
   top-right toasts.
2. Bulk Menus actions emit success or failure toasts after mutation completion.
3. Create dialog local validation/error copy remains intact.
4. List-first routing and existing menu contracts are unchanged.
5. Menus reuse the generic list-action toast helper; bulk count/error math is
   not duplicated in `MenuListPage`.
