# TASK-207-03: Entries Filter Model - Basic and Advanced
# FileName: TASK-207-03_Entries_Filter_Model_Basic_and_Advanced.md

**Priority:** High
**Category:** CMS/Entries + Admin/UI + UX
**Estimated Effort:** Large
**Dependencies:** TASK-207-02
**Status:** Done (2026-04-24)

---

## Overview

Split Entries filtering into a small default filter row and a collapsible
advanced filter area.

The basic row should expose one or two high-value filters, while advanced
filters must include content type selection so users can narrow the cross-type
list back to a specific Engine type.

## Sub-Tasks

- [x] TASK-207-03-01: Basic Search, Status, and Filter Reset Contract
- [x] TASK-207-03-02: Advanced Content Type, Author, and Date Filters
- [x] TASK-207-03-03: Filter State, Selection Trim, and Empty States

## Files to Change

- `core/admin/ui/entries/EntryFilters.tsx`
- `core/admin/ui/entries/EntryList.tsx`
- `tests/vitest/ui/entry-list-filters.test.ts`
- `tests/vitest/ui/entry-list-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI filtering only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged unless filters move server-side in a
  later task.
- Anti-abuse: filters must not expose hidden secrets or mutate hidden selected
  rows.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/entry-list-filters.test.ts tests/vitest/ui/entry-list-wave.test.tsx`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Basic filters stay compact and match the other list screens.
2. Advanced filters are collapsible and include content type.
3. Clear/reset behavior is deterministic for both basic and advanced filters.
4. Filtering works across all entries from the cross-type read model.

