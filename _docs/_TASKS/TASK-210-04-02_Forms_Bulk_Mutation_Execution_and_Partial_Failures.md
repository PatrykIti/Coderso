# TASK-210-04-02: Forms Bulk Mutation Execution and Partial Failures
# FileName: TASK-210-04-02_Forms_Bulk_Mutation_Execution_and_Partial_Failures.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-04-01, TASK-210-03-02, TASK-210-06-02
**Status:** Done (2026-04-26)

---

## Overview

Execute Forms bulk lifecycle/delete actions with truthful full-success and
partial-failure handling.

This leaf consumes the stable retained-history conflict from TASK-210-06-02.
Treat `form_delete_restricted` 409 responses as per-row failures and do not
base acceptance on raw constraint strings.

## Sub-Tasks

- [x] Run bulk lifecycle actions through `Promise.allSettled`.
- [x] Map publish/draft/archive to `updateForm(id, { status })`.
- [x] Confirm bulk delete before calling `deleteForm`.
- [x] Bulk delete confirmation copy includes selected count and explains that
  hard delete is irreversible for deletion-safe forms, while retained
  submissions/action diagnostics may block delete and should be preserved by
  archiving.
- [x] Refresh the list after bulk execution settles.
- [x] Keep inline partial-failure copy visible.
- [x] Count retained-history delete conflicts as per-row failures, keep affected
  rows recoverable, and do not emit an all-success delete toast when any row is
  blocked.
- [x] Either keep failed ids selected for recovery or document why selection is
  cleared in the completion notes.
- [x] Leave final toast adapter wiring to TASK-210-06-01.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormBulkActionsBar.tsx` if extracted.
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/forms-component-wave.test.tsx` or a focused new component
  suite if bulk controls are extracted.

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
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx`
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

## Completion Notes (2026-04-26)

- Implemented in branch `task/TASK-210-forms-list-parity` with Forms list parity scoped to the refined TASK-210 contract.
- Validation:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui-integration/forms.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/list-pagination.test.tsx tests/vitest/admin/formsClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/userSettingsClient.test.ts` - PASS (9 files, 48 tests).
  - `bun --cwd core lint` - PASS.
  - `bun --cwd core lint:types` - PASS.
  - `set -a && source ../Nextless/.env && set +a && bun test tests/integration/routes/forms.test.ts tests/unit/forms/formsService.test.ts tests/unit/forms/submissionService.test.ts tests/unit/settings/userSettingsService.test.ts tests/integration/routes/userSettings.test.ts` - PASS (20 tests; run outside sandbox for DB/env access).
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/forms/submissionAccess.test.ts tests/vitest/forms/submissionNonce.test.ts` - PASS (2 files, 14 tests).
  - `set -a && source ../Nextless/.env && set +a && bun run gates:coderso` - BLOCKED after Core lint and Core typecheck passed; the gate script still points Functional UI smoke at absent `tests/unit/ui/*` files while current UI suites live under `tests/vitest/ui/*`.
- Scope notes: TASK-210 closes the Forms list/create-drawer/cache/toast/error-mapping/docs contract. Runtime preview, editor, duplicate, embed-code, and global dialog-wrapper follow-ups remain outside TASK-210 unless covered by a separate task.
