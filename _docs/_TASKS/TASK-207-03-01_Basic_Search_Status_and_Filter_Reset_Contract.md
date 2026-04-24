# TASK-207-03-01: Basic Search, Status, and Filter Reset Contract
# FileName: TASK-207-03-01_Basic_Search_Status_and_Filter_Reset_Contract.md

**Priority:** High
**Category:** Admin/UI + UX
**Estimated Effort:** Small
**Dependencies:** TASK-207-03
**Status:** To Do

---

## Overview

Keep the always-visible Entries filters small: search plus status.

Search should match title, slug, and content type name/slug. Status should keep
the existing entry statuses: `all`, `published`, `draft`, `scheduled`,
`archived`.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryFilters.tsx`
- `core/admin/ui/entries/EntryList.tsx`
- `tests/vitest/ui/entry-list-filters.test.ts`

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: filter changes must trim hidden selected IDs before bulk actions.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/entry-list-filters.test.ts`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Basic filter row shows search and status without always-visible content-type
   and author controls.
2. Search matches title, slug, content type name, and content type slug.
3. Clear/reset returns basic filters to `""` and `all`.
4. Existing status options remain supported.
