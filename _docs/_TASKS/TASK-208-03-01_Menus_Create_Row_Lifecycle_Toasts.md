# TASK-208-03-01: Menus Create Row Lifecycle Toasts
# FileName: TASK-208-03-01_Menus_Create_Row_Lifecycle_Toasts.md

**Priority:** High
**Category:** CMS Menus + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-208-03, TASK-208-01
**Status:** To Do

---

## Overview

Add shared top-right toast feedback for Menus list create, row publish, row
unpublish, and confirmed row delete.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Import the shared list-action toast helper from
  `core/admin/ui/shared/listActionToasts.ts`.
- Define a Menus adapter/config for menu singular/plural labels, action copy,
  and fallback errors.
- Handle create success in `handleCreate` after `createMenu` succeeds and the
  list is updated.
- For create failure, either:
  - catch in `handleCreate`, call the shared error-toast helper, then rethrow
    `new Error(message)` so `MenuCreateDialog` keeps local error copy; or
  - emit through the same shared helper from `MenuCreateDialog` catch if the
    dialog remains the owner of normalized failure copy.
- Add success/error toasts in `handlePublish`, `handleUnpublish`, and confirmed
  `runDelete`.
- Do not change `/admin/menus` list-first routing.
- Keep the current list ownership: `handleCreate` updates local `items`,
  lifecycle/delete paths call the existing client and refresh the list, and
  `MenuCreateDialog` keeps the local dialog error. The shared toast helper
  supplies normalized messages only.

## Pseudocode

```tsx
const menusToast = createListActionToastAdapter({
  resourceSingular: "menu",
  resourcePlural: "menus",
  actions: {
    create: { success: ({ label }) => `Menu "${label}" created.`, fallbackError: "Failed to create menu." },
    publish: { success: "Menu published.", fallbackError: "Failed to publish menu." },
    unpublish: { success: "Menu moved to draft.", fallbackError: "Failed to move menu to draft." },
    delete: { success: "Menu deleted.", fallbackError: "Failed to delete menu." },
  },
});

const handleCreate = async (payload) => {
  try {
    const created = await createMenu(payload);
    setItems((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
    menusToast.success("create", { label: created.name });
    return created;
  } catch (error) {
    const message = menusToast.errorMessage(error, "create");
    setError(message);
    menusToast.error(message);
    throw new Error(message);
  }
};

const handlePublish = async (id: string) => {
  try {
    await publishMenu(id);
    await refresh({ force: true, background: true });
    menusToast.success("publish");
  } catch (error) {
    const message = menusToast.errorMessage(error, "publish");
    setError(message);
    menusToast.error(message);
  }
};
```

Confirmed delete:

```tsx
const runDelete = async (id: string) => {
  try {
    await deleteMenu(id);
    await refresh({ force: true, background: true });
    setPendingDeleteId(null);
    menusToast.success("delete");
  } catch (error) {
    const message = menusToast.errorMessage(error, "delete");
    setError(message);
    menusToast.error(message);
  }
};
```

## Testing Requirements

- `tests/vitest/ui/menu-list-page-actions.test.tsx`
  - add a `sonner` mock,
  - assert create success and failure toasts,
  - current coverage stubs `MenuCreateDialog`; extend that mock to exercise the
    `onCreate` success and rejected paths, or add a focused `MenuCreateDialog`
    test that uses the real dialog and proves the local dialog error plus the
    top-right error toast,
  - assert row publish/unpublish success and failure toasts,
  - assert row delete toast only appears after confirmation.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - Menus list section: create/publish/unpublish/delete top-right toasts.
- `_docs/_TASKS/TASK-208-03*.md`
  - status and validation notes.

## Acceptance Criteria

1. Menus list create and row lifecycle actions toast on success/error.
2. `MenuCreateDialog` still renders local validation/API error feedback.
3. Row delete toast fires only after confirmed mutation completion.
4. Generic error normalization and action copy live in the shared helper/adapter,
   not as duplicated Menus-only helpers.
