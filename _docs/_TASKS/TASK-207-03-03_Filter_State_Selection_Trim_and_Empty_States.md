# TASK-207-03-03: Filter State, Selection Trim, and Empty States
# FileName: TASK-207-03-03_Filter_State_Selection_Trim_and_Empty_States.md

**Priority:** Medium
**Category:** Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-207-03-01, TASK-207-03-02, TASK-207-02-03
**Status:** To Do

---

## Overview

Make filter state safe with pagination, selection, and empty/loading copy.

Entries should not keep hidden IDs selected after a filter changes. Empty states
must distinguish between no entries at all, no entries for the selected content
type, and no entries matching current filters.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/entries/EntryTable.tsx`
- `tests/vitest/ui/entry-list-wave.test.tsx`
- `tests/vitest/ui/entry-table-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: bulk actions must never mutate IDs hidden by filters or
  pagination.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/entry-list-wave.test.tsx tests/vitest/ui/entry-table-wave.test.tsx`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Filter changes reset/clamp pagination.
2. Filter changes trim hidden selected IDs.
3. Empty state copy is truthful for all-entries empty, type-filter empty, and
   search/status empty cases.
4. Loading state does not show misleading count or selection controls.
