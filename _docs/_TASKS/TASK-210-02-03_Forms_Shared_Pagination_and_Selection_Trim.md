# TASK-210-02-03: Forms Shared Pagination and Selection Trim
# FileName: TASK-210-02-03_Forms_Shared_Pagination_and_Selection_Trim.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-02-01, TASK-210-02-02
**Status:** Done (2026-04-26)

---

## Overview

Wire the Forms filtered list through the shared admin pagination footer and
keep selection scoped to the currently visible paginated rows.

## Sub-Tasks

- [x] Feed filtered Forms rows into `useListPagination`.
- [x] Render `ListPaginationFooter` with `resourceLabel="forms"`.
- [x] Derive `visibleIds` from `pagination.visibleRows`.
- [x] Make header select-all affect only `visibleIds`.
- [x] Trim hidden selected ids after filter, page, or page-size changes.
- [x] Keep empty-state copy based on original rows vs filtered rows.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormTable.tsx`
- `core/admin/ui/shared/useListPagination.ts` only if a generic bug is found.
- `core/admin/ui/shared/ListPaginationFooter.tsx` only if a generic bug is found.
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/forms-component-wave.test.tsx` if table props or checkbox
  behavior changes.
- `tests/vitest/ui/list-pagination.test.tsx` only if the shared helper changes.

## Security Contract

- Visibility: internal admin UI read/list behavior.
- Auth model: unchanged authenticated admin read path.
- RBAC: existing `forms:read`.
- CSRF: no writes in this leaf.
- Rate-limit bucket: existing admin read bucket.
- Reject-unknown validation: unchanged.
- Anti-abuse: hidden rows must not remain selected for later writes.

## Testing Requirements

- Footer shows shared page-size options.
- Table receives only current paginated rows.
- Select-all selects only the current visible page.
- Hidden selections are trimmed after filtering and page changes.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui/list-pagination.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Forms uses the shared pagination hook/footer after filtering.
2. Selection never includes hidden filtered-out or off-page rows.
3. Pagination and empty-state copy stay truthful for filtered results.

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
