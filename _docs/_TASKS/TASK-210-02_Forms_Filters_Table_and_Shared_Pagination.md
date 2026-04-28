# TASK-210-02: Forms Filters, Table, and Shared Pagination
# FileName: TASK-210-02_Forms_Filters_Table_and_Shared_Pagination.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Large
**Dependencies:** TASK-210-01
**Status:** Done (2026-04-26)

---

## Overview

Rebuild the Forms first-screen table so it matches the Pages list table and
footer behavior while keeping Forms-specific columns and filters.

This task owns search, filters, table presentation, visible-row selection state,
and shared pagination. It does not execute lifecycle or bulk mutations; those
are owned by TASK-210-03 and TASK-210-04.

## Sub-Tasks

- [x] TASK-210-02-01: Forms Filter Model and View Component
- [x] TASK-210-02-02: Forms Table Selection and Access Column
- [x] TASK-210-02-03: Forms Shared Pagination and Selection Trim
- [x] Add a Forms-specific filter strip:
  - search by `name`, `slug`, and `description`;
  - status: all, published, draft, archived;
  - access: all, public, internal.
- [x] Update or extract `FormTable` to follow the Pages table behavior:
  checkbox column, row selection styling, responsive metadata, right-aligned
  three-dot actions, and table card treatment.
- [x] Add `useListPagination` after filtering and before table rendering.
- [x] Add `ListPaginationFooter` with `resourceLabel="forms"`.
- [x] Trim hidden selected ids when filters, page, or page size changes.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormTable.tsx`
- `core/admin/ui/forms/FormFilters.tsx` if extracted; keep it Forms-specific
  and close to the existing list files.
- `core/admin/ui/shared/useListPagination.ts` only if a generic capability is
  missing.
- `core/admin/ui/shared/ListPaginationFooter.tsx` only if a generic capability
  is missing.
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/forms-component-wave.test.tsx` for the non-mocked
  `FormTable` selection/access-column contract.
- `tests/vitest/ui/list-pagination.test.tsx` only if the generic pagination
  contract changes.

## Security Contract

- Visibility: internal admin UI read/list surface.
- Auth/RBAC/CSRF/rate-limit: unchanged; this task does not add endpoints or
  writes.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged; selection is client-side visible-row state only.

## Pseudocode

```ts
function filterForms(
  forms: FormRecord[],
  query: string,
  status: FormStatus | "all",
  access: "all" | "public" | "internal"
) {
  const normalized = query.trim().toLowerCase();
  return forms.filter((form) => {
    const matchesQuery =
      !normalized ||
      form.name.toLowerCase().includes(normalized) ||
      form.slug.toLowerCase().includes(normalized) ||
      (form.description ?? "").toLowerCase().includes(normalized);
    const matchesStatus = status === "all" || form.status === status;
    const matchesAccess = access === "all" || form.submissionAccess === access;
    return matchesQuery && matchesStatus && matchesAccess;
  });
}

const pagination = useListPagination(filteredForms, {
  resetKey: JSON.stringify({ searchQuery, statusFilter, accessFilter }),
});
```

Table columns should remain Forms-specific:

- checkbox;
- form name/description/slug;
- status badge;
- submission access badge or text;
- last updated;
- actions.

## Testing Requirements

- Add or update Vitest coverage proving:
  - filter search matches name, slug, and description;
  - status and access filters combine correctly;
  - pagination renders the same page-size options as other lists;
  - table receives only paginated visible rows;
  - select-all affects only current visible rows;
  - hidden selected ids are trimmed after filter/page changes.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui/list-pagination.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Forms list has search, status, and submission-access filters.
2. Filters run before pagination.
3. Forms table has Pages-style checkbox selection and responsive row metadata.
4. Shared pagination footer controls the actual visible row set.
5. Selection never includes hidden rows after filter/page changes.

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
