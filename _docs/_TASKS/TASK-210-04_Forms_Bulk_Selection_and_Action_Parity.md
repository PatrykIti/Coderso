# TASK-210-04: Forms Bulk Selection and Action Parity
# FileName: TASK-210-04_Forms_Bulk_Selection_and_Action_Parity.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-02, TASK-210-03, TASK-210-06-02
**Status:** To Do

---

## Overview

Add Pages-style visible-scope bulk actions to the Forms list while keeping the
Forms lifecycle contract.

Bulk actions must operate only on selected rows visible after current filters
and pagination. Destructive bulk delete must be confirmed through
`ConfirmActionDialog`. Partial failures must stay truthful and leave enough
state for the user to understand what happened.

Retained-history delete conflict handling depends on TASK-210-06-02. Bulk
delete cannot be considered complete while blocked deletes still surface as raw
database errors or false successes.

## Sub-Tasks

- [ ] TASK-210-04-01: Forms Bulk Action Bar and Visible Selection
- [ ] TASK-210-04-02: Forms Bulk Mutation Execution and Partial Failures
- [ ] Add a Forms bulk action bar rendered inline in `PageHeader.actions`, to
  the left of `New`.
- [ ] Support Forms lifecycle actions:
  - Publish;
  - Move to draft;
  - Archive;
  - Delete.
- [ ] Execute bulk actions through `Promise.allSettled`.
- [ ] Confirm bulk delete before calling `deleteForm`.
- [ ] Bulk delete confirmation copy must state the selected count and the
  irreversible impact for deletion-safe forms, plus that retained
  submissions/action diagnostics may block hard delete and should be preserved
  through Archive.
- [ ] Keep selected ids scoped to current visible rows after filters and
  pagination changes.
- [ ] Keep failed ids selected when that helps recovery; otherwise document the
  selection cleanup behavior in the task completion notes.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormBulkActionsBar.tsx` if extracted.
- `core/admin/ui/forms/FormTable.tsx`
- `tests/vitest/ui/forms-pages-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI bulk actions.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: lifecycle and delete require `forms:write`.
- CSRF: each write continues through `formsClient` with `withCsrf: true`.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: existing route schemas; enum hardening is owned by
  TASK-210-06 if needed.
- Anti-abuse:
  - no public write path;
  - bulk delete requires `ConfirmActionDialog`;
  - bulk execution uses visible selected ids only;
  - retained submission/action-run payloads are neither exposed nor destroyed by
    list UI.

## Pseudocode

```ts
const runBulkAction = async (action: FormBulkActionValue, ids: string[]) => {
  const results = await Promise.allSettled(
    ids.map((id) => {
      if (action === "publish") return updateForm(id, { status: "published" });
      if (action === "draft") return updateForm(id, { status: "draft" });
      if (action === "archive") return updateForm(id, { status: "archived" });
      return deleteForm(id);
    })
  );

  await refresh({ force: true, background: true });
  const summary = formListToasts.summarizeBulkAction(action, ids, results);
  formListToasts.emitBulk(summary);
};
```

Toast adapter wiring is finalized in TASK-210-06; this task may return the
summary shape without emitting until that dependency lands.

## Testing Requirements

- Add or update Vitest coverage proving:
  - bulk action bar appears only when rows are selected;
  - selected count is visible;
  - publish/draft/archive call `updateForm` with expected status for visible ids;
  - bulk delete opens a confirmation dialog and waits for confirm;
  - bulk delete confirmation includes count, irreversible-impact copy, and
    retained-history conflict expectations;
  - partial failures surface inline failure copy;
  - retained-history delete conflicts are counted as failures and keep affected
    rows recoverable;
  - selection is scoped to visible rows after pagination/filter changes.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Forms bulk controls render inline beside `New`.
2. Bulk actions are Forms-specific and status-safe.
3. Bulk delete is confirmed before mutation.
4. Bulk execution never mutates hidden filtered-out rows.
5. Partial failures, including retained-history delete conflicts, are visible
   and truthful.
