# TASK-210-02-01: Forms Filter Model and View Component
# FileName: TASK-210-02-01_Forms_Filter_Model_and_View_Component.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-210-02
**Status:** To Do

---

## Overview

Add a Forms-specific filter model that mirrors the Pages filter strip while
using Forms fields and status/access vocabulary.

## Sub-Tasks

- [ ] Add `filterForms()` near the Forms list owner or in a close Forms-only
  helper file.
- [ ] Filter by search across `name`, `slug`, and `description`.
- [ ] Filter by status: `all`, `published`, `draft`, `archived`.
- [ ] Filter by submission access: `all`, `public`, `internal`.
- [ ] Add `FormFilters` if extracting keeps `FormListPage` readable.
- [ ] Reset pagination when any filter value changes.

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
