# TASK-210-03-01: Forms Row Lifecycle Menu Contract
# FileName: TASK-210-03-01_Forms_Row_Lifecycle_Menu_Contract.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-02-02
**Status:** To Do

---

## Overview

Add Forms row lifecycle actions that use the existing Forms status contract
instead of copying Pages preview/duplicate behavior. Keep the existing Forms
Action logs diagnostic route reachable from the row menu.

## Sub-Tasks

- [ ] Extract `FormRowActions` if it keeps `FormTable` readable.
- [ ] Show Edit for every row.
- [ ] Show Action logs for every row and link to
  `/coderso/forms/:id/action-runs`.
- [ ] Show Publish when `status !== "published"`.
- [ ] Show Move to draft when `status !== "draft"`.
- [ ] Show Archive when `status !== "archived"`.
- [ ] Route lifecycle writes through `updateForm(id, { status })`.
- [ ] Keep error copy inline here; shared toast timing is owned by
  TASK-210-06-01.

## Files to Change

- `core/admin/ui/forms/FormTable.tsx`
- `core/admin/ui/forms/FormRowActions.tsx` if extracted.
- `core/admin/ui/forms/FormListPage.tsx`
- `tests/vitest/ui/forms-pages-wave.test.tsx`
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
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx`
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
