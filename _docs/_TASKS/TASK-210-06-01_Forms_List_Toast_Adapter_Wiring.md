# TASK-210-06-01: Forms List Toast Adapter Wiring
# FileName: TASK-210-06-01_Forms_List_Toast_Adapter_Wiring.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + Toasts
**Estimated Effort:** Medium
**Dependencies:** TASK-210-03-02, TASK-210-04-02, TASK-210-05-01, TASK-210-06-02, TASK-208
**Status:** Done (2026-04-26)

---

## Overview

Wire Forms list mutations through `createListActionToastAdapter` with
Forms-specific action copy and Pages-matching timing.

## Sub-Tasks

- [x] Configure a Forms list toast adapter for create, publish, draft, archive,
  and delete.
- [x] Emit create success/error toasts from the list owner.
- [x] Emit row lifecycle success/error toasts after `updateForm` settles.
- [x] Emit row delete success/error toasts only after confirmation and
  `deleteForm` settles.
- [x] Emit bulk full-success and partial-failure toasts from the settled result.
- [x] Preserve inline load and partial-failure alerts.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/shared/listActionToasts.ts` only if a generic capability is
  missing.
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/list-action-toasts.test.ts`

## Security Contract

- Visibility: internal admin UI feedback for existing writes.
- Auth model: unchanged.
- RBAC: unchanged; writes still require `forms:write`.
- CSRF: unchanged; writes still use `formsClient` helpers.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: no public write path; delete toasts must not fire before
  confirmation.

## Pseudocode

```ts
const formListToasts = createListActionToastAdapter({
  labels: { singular: "form", plural: "forms" },
  actions: {
    create: { pastTense: "created", failureVerb: "create" },
    publish: { pastTense: "published", failureVerb: "publish" },
    draft: { pastTense: "moved to draft", failureVerb: "move to draft" },
    archive: { pastTense: "archived", failureVerb: "archive" },
    delete: { pastTense: "deleted", failureVerb: "delete" },
  },
});
```

## Testing Requirements

- Create success/failure toasts.
- Publish/draft/archive success/failure toasts.
- Row delete toast emits only after confirm and resolved mutation.
- Bulk full-success and partial-failure toasts.
- Inline partial-failure alert remains visible.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/list-action-toasts.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Forms uses the shared toast helper, not duplicated toast copy logic.
2. Toast timing matches Pages for create, lifecycle, delete, and bulk actions.
3. Partial failures remain truthful inline and in floating feedback.

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
