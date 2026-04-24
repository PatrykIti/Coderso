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

- Add `import { toast } from "sonner";` to
  `core/admin/ui/menus/MenuListPage.tsx`.
- Handle create success in `handleCreate` after `createMenu` succeeds and the
  list is updated.
- For create failure, either:
  - catch in `handleCreate`, call `toast.error(message)`, then rethrow
    `new Error(message)` so `MenuCreateDialog` keeps local error copy; or
  - emit the toast from `MenuCreateDialog` catch if the dialog remains the owner
    of normalized failure copy.
- Add success/error toasts in `handlePublish`, `handleUnpublish`, and confirmed
  `runDelete`.
- Do not change `/admin/menus` list-first routing.

## Pseudocode

```tsx
const handleCreate = async (payload) => {
  try {
    const created = await createMenu(payload);
    setItems((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
    toast.success(`Menu "${created.name}" created.`);
    return created;
  } catch (error) {
    const message = error instanceof Error && error.message
      ? error.message
      : "Failed to create menu.";
    setError(message);
    toast.error(message);
    throw new Error(message);
  }
};

const handlePublish = async (id: string) => {
  try {
    await publishMenu(id);
    markMenuPublished(id);
    toast.success("Menu published.");
  } catch (error) {
    const message = toMenuError(error, "Failed to publish menu.");
    setError(message);
    toast.error(message);
  }
};
```

Confirmed delete:

```tsx
const runDelete = async (id: string) => {
  try {
    await deleteMenu(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast.success("Menu deleted.");
  } catch (error) {
    const message = toMenuError(error, "Failed to delete menu.");
    setError(message);
    toast.error(message);
  }
};
```

## Testing Requirements

- `tests/vitest/ui/menu-list-page-actions.test.tsx`
  - add a `sonner` mock,
  - assert create success and failure toasts,
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
