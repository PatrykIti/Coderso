# TASK-210-03-01: Forms Row Lifecycle Menu Contract
# FileName: TASK-210-03-01_Forms_Row_Lifecycle_Menu_Contract.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-02-02
**Status:** Done (2026-04-26)

---

## Overview

Add Forms row lifecycle actions that use the existing Forms status contract
instead of copying Pages preview/duplicate behavior. Keep the existing Forms
Action logs diagnostic route reachable from the row menu.

## Sub-Tasks

- [x] Extract `FormRowActions` if it keeps `FormTable` readable.
- [x] Show Edit for every row.
- [x] Show Action logs for every row and link to
  `/coderso/forms/:id/action-runs`.
- [x] Show Publish when `status !== "published"`.
- [x] Show Move to draft when `status !== "draft"`.
- [x] Show Archive when `status !== "archived"`.
- [x] Route lifecycle writes through `updateForm(id, { status })`.
- [x] Keep error copy inline here; shared toast timing is owned by
  TASK-210-06-01.

## Files to Change

- `core/admin/ui/forms/FormTable.tsx`
- `core/admin/ui/forms/FormRowActions.tsx` if extracted.
- `core/admin/ui/forms/FormListPage.tsx`
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/forms-component-wave.test.tsx` for the real row-action menu
  rendering contract.
- `tests/vitest/admin/formsClient.test.ts` only if cache patch behavior changes.

## Security Contract

- Visibility: internal admin UI row actions.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: status writes require `forms:write`.
- CSRF: lifecycle writes continue through `updateForm` with `withCsrf: true`.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: route schemas validate status; strict enum work is
  finalized in TASK-210-06-02.
- Anti-abuse: no public write path is added.

## Testing Requirements

- Draft rows expose Publish, Archive, Delete, and Edit.
- Published rows expose Move to draft, Archive, Delete, and Edit.
- Archived rows expose Publish, Move to draft, Delete, and Edit.
- Every row exposes Action logs and navigates to the canonical Forms action-log
  route.
- Lifecycle actions call `updateForm` with `published`, `draft`, or `archived`.
- Page-only Preview/Duplicate/Embed Code actions are absent.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Forms row menu reflects only Forms lifecycle and diagnostic actions.
2. Lifecycle writes use the existing `updateForm` API.
3. Action logs navigates to the existing canonical route.
4. Builder and action-log route behavior is untouched.

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
