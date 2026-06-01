# TASK-353-03: Redirect Delete UI, Confirmation, and Cache State Contract
# FileName: TASK-353-03_Redirect_Delete_UI_Confirmation_and_Cache_State_Contract.md

**Priority:** Medium
**Category:** Redirects + Admin UI + API + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-353-01, TASK-353-02
**Status:** To Do

---

## Overview

Expose redirect deletion in the UI if deletion is a supported product action.
The report had to clean up the test redirect through the API because the table
only exposed edit and enable/disable.

## Sub-Tasks

- Confirm delete is intended for normal admin users; otherwise document the
  product decision and remove hidden expectations from the UI.
- Add a delete action with confirmation dialog/popover.
- Call `redirectsClient.deleteRedirect` and refresh local list state.
- Preserve focus and optimistic/error state after delete.
- Add tests for confirm/cancel/error and page-empty after deletion.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/redirects/RedirectsTable.tsx` | Add delete action, confirmation UI hook/props, and accessible labels. |
| `core/admin/ui/redirects/RedirectsPage.tsx` | Wire delete client call, loading/error state, refresh, and page adjustment. |
| `core/admin/services/redirectsClient.ts` | Already has `deleteRedirect`; update only if response typing/cache events change. |
| `tests/vitest/ui/redirects.test.tsx` | Cover delete action UI and confirmation states. |
| `tests/vitest/ui/redirects-page-leaf.test.tsx` | Cover client call, refresh, error state, and empty page fallback. |
| `tests/integration/routes/redirects.test.ts` | Already covers route registration; extend with delete lifecycle if needed. |

## Implementation Pseudocode

```tsx
function handleDeleteRequest(row: RedirectRow) {
  setPendingDelete(row);
}

async function confirmDelete() {
  if (!pendingDelete) return;
  setIsSaving(true);
  try {
    await deleteRedirect(pendingDelete.id);
    await refresh();
    setPendingDelete(null);
  } catch (error) {
    setError(toUserMessage(error));
  } finally {
    setIsSaving(false);
  }
}
```

Data flow:

- Table action -> page pending-delete state -> client DELETE -> route/service ->
  refresh list -> close confirmation.

Error handling:

- Cancel leaves row unchanged.
- `redirect_not_found` refreshes the list and shows a bounded message.
- Delete must not run without explicit confirmation.
- If the deleted row was the last row on a later page, move to the previous
  valid page.

Regression-test shape:

- Click delete, cancel, assert client not called.
- Click delete, confirm, assert client called with row ID.
- Simulate error and assert row remains visible plus message.
- Delete last row and assert empty state/create CTA appears.

## Security Contract

- Endpoint visibility: internal admin `DELETE /admin/api/redirects/:id`.
- Auth model: session cookie.
- RBAC: `settings:write`.
- CSRF: required.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: path param only; no request body unless a
  confirmation schema is added.
- Anti-abuse: no public write.
- Audit: if redirect delete audit logging is added, log row ID/path/status only
  and avoid sensitive headers/cookies.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/redirects.test.tsx tests/vitest/ui/redirects-page-leaf.test.tsx`
- `bun test tests/integration/routes/redirects.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update Redirects report with delete UI decision.
- Update user docs if delete becomes visible in the screen guide.

## Acceptance Criteria

- Redirect deletion is either visible, confirmed, and tested, or explicitly
  documented as API-only with UI rationale.
- Test cleanup no longer requires hidden API calls when UI delete is supported.
