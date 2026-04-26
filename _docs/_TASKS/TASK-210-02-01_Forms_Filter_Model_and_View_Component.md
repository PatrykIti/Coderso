# TASK-210-02-01: Forms Filter Model and View Component
# FileName: TASK-210-02-01_Forms_Filter_Model_and_View_Component.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-02
**Status:** Done (2026-04-26)

---

## Overview

Add a Forms-specific filter model that mirrors the Pages filter strip while
using Forms fields and status/access vocabulary.

## Sub-Tasks

- [x] Add `filterForms()` near the Forms list owner or in a close Forms-only
  helper file.
- [x] Filter by search across `name`, `slug`, and `description`.
- [x] Filter by status: `all`, `published`, `draft`, `archived`.
- [x] Filter by submission access: `all`, `public`, `internal`.
- [x] Add `FormFilters` if extracting keeps `FormListPage` readable.
- [x] Reset pagination when any filter value changes.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormFilters.tsx` if extracted.
- `tests/vitest/ui/forms-pages-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI read/list behavior.
- Auth model: unchanged authenticated admin read path.
- RBAC: existing `forms:read`.
- CSRF: no writes in this leaf.
- Rate-limit bucket: existing admin read bucket.
- Reject-unknown validation: unchanged; filters are client-side only.
- Anti-abuse: no public route or write path is added.

## Pseudocode

```ts
export function filterForms(forms, query, status, access) {
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
```

## Testing Requirements

- Search matches name, slug, and description.
- Status and access filters combine instead of overriding one another.
- Empty-filter state renders truthful no-results copy.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Forms filters are resource-specific and not copied from Pages authors.
2. Filtering runs before pagination and selection.
3. Filter copy uses Forms terms: status and submission access.

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
