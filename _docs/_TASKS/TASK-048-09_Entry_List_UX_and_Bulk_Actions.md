# TASK-048-09: Entry List UX & Bulk Actions
# FileName: TASK-048-09_Entry_List_UX_and_Bulk_Actions.md

**Priority:** 🟡 Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-048-01, TASK-048-04  
**Status:** ✅ **Done** (2026-02-04)

---

## Overview

Make the entries list WordPress‑like with clear filters and bulk actions.
Users should be able to select multiple entries and change status or delete in one step.

---

## Sub-Tasks

1. **Selection + bulk actions**
   - Add row selection in list view
   - Show bulk actions bar when entries are selected
   - Support Publish, Draft, Archive, Delete

2. **State + refresh**
   - Keep selection in sync with filters
   - Refresh list after bulk actions

3. **Tests**
   - Add a unit test for bulk actions bar rendering

---

## Implementation Checklist

| File | Change |
|------|--------|
| `core/admin/ui/entries/EntryBulkActionsBar.tsx` | bulk actions UI |
| `core/admin/ui/entries/EntryList.tsx` | selection + bulk apply |
| `core/admin/ui/entries/EntryTable.tsx` | controlled checkboxes |
| `tests/unit/ui/entry-bulk-actions.test.tsx` | bulk actions UI test |
| `_docs/CONTENT_LIST_UX.md` | list UX doc |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test`

---

## Documentation Updates Required

Update:
- `_docs/CONTENT_LIST_UX.md`
- `_docs/README.md`

---

## Changelog

Add `_docs/_CHANGELOG/150-2026-02-04-entry-list-bulk-actions.md` and link TASK-048-09.
