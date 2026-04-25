# TASK-209-03-03: Custom Screen Bulk Actions and Delete Confirmations
# FileName: TASK-209-03-03_Custom_Screen_Bulk_Actions_and_Delete_Confirmations.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-209-03-02
**Status:** To Do

---

## Overview

Add Pages-style inline bulk actions and shared confirmations for Custom Screens.

Bulk actions must operate only on visible selected rows, use existing client
helpers, and preserve partial-failure feedback through the shared toast adapter.

## Sub-Tasks

No child task files.

## Files to Change

- new `core/admin/ui/custom-screens/CustomScreenBulkActionsBar.tsx`
- `core/admin/ui/custom-screens/CustomScreenListPage.tsx`
- `core/admin/ui/custom-screens/CustomScreenTable.tsx`
- `core/admin/ui/shared/ConfirmActionDialog.tsx` only if a shared dialog bug is
  found; otherwise consume the existing dialog.
- `tests/vitest/ui/custom-screens-list-wave.test.tsx`

## Implementation Checklist

- Bulk actions:
  - Activate selected -> `updateCustomScreen(id, { status: "active" })`
  - Move selected to draft -> `updateCustomScreen(id, { status: "draft" })`
  - Delete selected -> opens `ConfirmActionDialog`
- Render the bulk action bar inline in `PageHeader.actions`, to the left of
  `New`, matching Pages.
- Bulk delete:
  - clicking Apply with delete stores `pendingBulkDeleteIds`;
  - no delete mutation runs before confirmation;
  - confirm runs `deleteCustomScreen` for each pending visible id.
- Bulk status:
  - use `Promise.allSettled`;
  - refresh after mutations settle;
  - emit the adapter bulk summary;
  - set inline alert to the summary when any selected action fails.
- Clear selection after bulk action completion using the same behavior chosen for
  Pages unless a Custom Screens-specific reason is documented in this task.
- Trim selection when filters/pagination hide rows.

## Security Contract

- Visibility: internal admin UI and existing internal admin API.
- Auth model: existing authenticated admin session/admin API key model.
- RBAC: `content:write` for bulk status/delete mutations.
- CSRF: `updateCustomScreen` and `deleteCustomScreen` use existing CSRF-backed
  client helpers.
- Rate-limit bucket: existing `admin_write`; bulk actions call existing
  per-screen endpoints and should not introduce a new route.
- Reject-unknown validation: status bulk submits only schema-valid status
  patches; delete submits only ids through the path parameter.
- Anti-abuse: bulk operations are limited to visible selected ids and destructive
  delete requires the shared confirmation dialog.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Mounted tests for:
  - selecting rows shows inline bulk bar,
  - visible select-all/indeterminate state,
  - bulk activate success toast,
  - bulk draft partial failure toast plus inline message,
  - delete selection opens confirm dialog,
  - delete toast does not fire before confirmation,
  - bulk delete full success clears selection and emits success toast.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Bulk controls match the Pages inline header pattern.
2. Bulk delete cannot execute before confirmation.
3. Bulk summaries use the shared helper for counts, plural labels, and the
   Custom Screens `moveToDraft` action key.
4. Hidden selections are not executed.
