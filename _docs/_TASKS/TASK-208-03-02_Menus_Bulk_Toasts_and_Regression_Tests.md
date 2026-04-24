# TASK-208-03-02: Menus Bulk Toasts and Regression Tests
# FileName: TASK-208-03-02_Menus_Bulk_Toasts_and_Regression_Tests.md

**Priority:** High
**Category:** CMS Menus + QA/Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-208-03-01
**Status:** To Do

---

## Overview

Add shared top-right toast feedback and regression coverage for Menus bulk
publish, unpublish, and delete actions.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Update `runBulkAction` in `core/admin/ui/menus/MenuListPage.tsx`.
- On full success:
  - keep the existing refresh-based list update,
  - clear selection as today,
  - call the shared list-action toast success helper.
- On partial/full failure:
  - preserve existing inline error state,
  - call the shared list-action toast error helper with the same helper-returned
    message.
- Keep bulk delete confirmation dialog; do not toast until the confirm button
  triggers `runBulkAction("delete", pendingBulkDeleteIds)`.

## Pseudocode

```tsx
const runBulkAction = async (action, ids) => {
  const results = await Promise.allSettled(ids.map((id) => mutateMenu(action, id)));
  const feedback = menusToast.bulkResult({ action, targets: ids, results });
  await refresh({ force: true, background: true });

  if (!feedback.ok) {
    setError(feedback.message);
    menusToast.emitBulkResult(feedback);
    return;
  }

  handleClearSelection();
  menusToast.emitBulkResult(feedback);
};
```

## Testing Requirements

- `tests/vitest/ui/menu-list-page-actions.test.tsx`
  - existing bulk publish test: assert the final `"Menus published."` or
    equivalent success toast message,
  - existing bulk delete confirmation test: assert no delete toast before
    confirm and success toast after confirm,
  - add partial failure setup for one selected menu and assert the final error
    toast,
  - keep selection scope assertions intact.
- `tests/vitest/ui/list-action-toasts.test.ts`
  - cover shared bulk success/error count behavior used by Menus.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - Menus bulk action feedback contract.
- `_docs/_TASKS/TASK-208-03*.md`
  - status and validation notes.

## Acceptance Criteria

1. Menus bulk publish/unpublish/delete emit success toasts after full success.
2. Menus bulk failures emit error toasts and keep inline error feedback.
3. Bulk delete toast appears only after the confirmation dialog mutation.
4. Menus bulk success/error messages come from the shared helper/adapter instead
   of Menus-only message functions or local count/pluralization branches.
