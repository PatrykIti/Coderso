# TASK-210-04-02: Forms Bulk Mutation Execution and Partial Failures
# FileName: TASK-210-04-02_Forms_Bulk_Mutation_Execution_and_Partial_Failures.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-04-01, TASK-210-03-02
**Status:** To Do

---

## Overview

Execute Forms bulk lifecycle/delete actions with truthful full-success and
partial-failure handling.

## Sub-Tasks

- [ ] Run bulk lifecycle actions through `Promise.allSettled`.
- [ ] Map publish/draft/archive to `updateForm(id, { status })`.
- [ ] Confirm bulk delete before calling `deleteForm`.
- [ ] Bulk delete confirmation copy includes selected count and explains that
  hard delete is irreversible for deletion-safe forms, while retained
  submissions/action diagnostics may block delete and should be preserved by
  archiving.
- [ ] Refresh the list after bulk execution settles.
- [ ] Keep inline partial-failure copy visible.
- [ ] Count retained-history delete conflicts as per-row failures, keep affected
  rows recoverable, and do not emit an all-success delete toast when any row is
  blocked.
- [ ] Either keep failed ids selected for recovery or document why selection is
  cleared in the completion notes.
- [ ] Leave final toast adapter wiring to TASK-210-06-01.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormBulkActionsBar.tsx` if extracted.
- `tests/vitest/ui/forms-pages-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI bulk actions.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: lifecycle and delete require `forms:write`.
- CSRF: each write uses `formsClient` with `withCsrf: true`.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: route schemas remain the source of truth.
- Anti-abuse:
  - no public write path is added;
  - bulk delete requires `ConfirmActionDialog`;
  - execution ids must be the visible selected ids captured at apply time;
  - retained submission/action-run payloads are not exposed by partial-failure
    feedback.

## Pseudocode

```ts
const results = await Promise.allSettled(
  ids.map((id) =>
    action === "delete"
      ? deleteForm(id)
      : updateForm(id, { status: resolveBulkStatus(action) })
  )
);
```

## Testing Requirements

- Bulk publish/draft/archive call `updateForm` for visible selected ids.
- Bulk delete opens confirmation and waits for confirm.
- Bulk delete confirmation copy includes selected count and irreversible-impact
  wording.
- Partial failures surface inline copy.
- Retained-history delete conflicts are reported as partial failures and keep the
  affected forms visible.
- Success and partial-failure paths refresh the Forms list.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Bulk mutations run against visible selected ids only.
2. Bulk delete is confirmed before mutation.
3. Partial failures, including retained-history conflicts, are visible and not
   collapsed into a false success.
