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
  - update local item statuses/removals as today,
  - clear selection as today,
  - call `toast.success(...)`.
- On partial/full failure:
  - preserve existing inline error state,
  - call `toast.error(...)`.
- Keep bulk delete confirmation dialog; do not toast until the confirm button
  triggers `runBulkAction("delete", pendingBulkDeleteIds)`.

## Pseudocode

```tsx
const bulkSuccessMessage = (action: MenuBulkActionValue, count: number) => {
  if (action === "publish") return count === 1 ? "Menu published." : "Menus published.";
  if (action === "unpublish") return count === 1 ? "Menu moved to draft." : "Menus moved to draft.";
  return count === 1 ? "Menu deleted." : "Menus deleted.";
};

const runBulkAction = async (action, ids) => {
  const results = await Promise.allSettled(ids.map((id) => mutateMenu(action, id)));
  const failed = results.filter((result) => result.status === "rejected").length;

  if (failed > 0) {
    const message = `${failed} menu action${failed === 1 ? "" : "s"} failed.`;
    setError(message);
    toast.error(message);
    return;
  }

  applyBulkState(action, ids);
  handleClearSelection();
  toast.success(bulkSuccessMessage(action, ids.length));
};
```

## Testing Requirements

- `tests/vitest/ui/menu-list-page-actions.test.tsx`
  - existing bulk publish test: assert `toast.success("Menus published.")` or
    equivalent message,
  - existing bulk delete confirmation test: assert no delete toast before
    confirm and success toast after confirm,
  - add partial failure setup for one selected menu and assert `toast.error`,
  - keep selection scope assertions intact.

## Documentation Updates Required in This Round

- `_docs/CONTENT_LIST_UX.md`
  - Menus bulk action feedback contract.
- `_docs/_TASKS/TASK-208-03*.md`
  - status and validation notes.

## Acceptance Criteria

1. Menus bulk publish/unpublish/delete emit success toasts after full success.
2. Menus bulk failures emit error toasts and keep inline error feedback.
3. Bulk delete toast appears only after the confirmation dialog mutation.
