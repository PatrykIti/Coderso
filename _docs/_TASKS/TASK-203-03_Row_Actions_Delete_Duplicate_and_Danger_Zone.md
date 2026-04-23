# TASK-203-03: Row Actions, Delete, Duplicate, and Danger Zone
# FileName: TASK-203-03_Row_Actions_Delete_Duplicate_and_Danger_Zone.md

**Priority:** High
**Category:** CMS/Entries + Admin/UI + Admin/API
**Estimated Effort:** Large
**Dependencies:** TASK-203, TASK-203-01
**Status:** To Do

---

## Overview

Repair row and destructive actions from `BUG-3`, `BUG-4`, and `BUG-6`.

Current evidence:

- `EntryList.tsx:231-248` uses `window.confirm()` for row delete.
- `EntryList.tsx:311-353` uses `window.confirm()` for bulk delete.
- `EntryTable.tsx:71-103` renders `Duplicate` without a handler prop.
- `entriesClient.ts` has `deleteEntry()` but no duplicate wrapper.
- `contentEntryRoutes.ts` has no duplicate route for entries.
- `EntryEditor.tsx:843-917` has no danger-zone delete path.

## Sub-Tasks

- `TASK-203-03-01_Delete_Confirmation_List_Bulk_and_Editor_Danger_Zone.md`
- `TASK-203-03-02_Duplicate_Entry_Route_Client_and_List_Feedback.md`

## Scope

- Replace native row/bulk delete confirms with app dialogs.
- Add an editor danger zone for exact-entry delete.
- Implement the visible duplicate action end to end, or remove it with product
  sign-off captured during closure.
- Keep selection visible-scope based and cache-safe.

Out of scope:

- recycle bin/restore,
- cross-type duplicate,
- content type deletion,
- soft delete storage changes.

## Files to Change

- `core/admin/ui/entries/EntryList.tsx:231-353`
- `core/admin/ui/entries/EntryTable.tsx:47-103`
- `core/admin/ui/entries/EntryEditor.tsx:843-917`
- `core/admin/services/entriesClient.ts:245-380`
- `core/server/routes/contentEntryRoutes.ts:87-271`
- `core/services/content/entryService.ts:517-608`
- `core/server/validation/contentSchemas.ts`
- `tests/vitest/ui/entry-list-wave.test.tsx`
- `tests/vitest/ui/entry-table-wave.test.tsx`
- `tests/vitest/ui/entry-editor-shell-wave.test.tsx`
- `tests/vitest/admin/entriesClient.test.ts`
- `tests/integration/routes/contentTypes.test.ts`
- `tests/unit/content/entryService.test.ts`

## Security Contract

- Visibility: internal admin Entries UI/routes only.
- Auth model: authenticated admin session/API-key path.
- RBAC: `content:write` for delete and duplicate.
- CSRF: delete and duplicate use shared CSRF client behavior.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: duplicate route rejects unknown fields if it has a
  payload; delete remains path-param only.
- Anti-abuse: destructive delete requires confirmation; duplicate creates a
  draft and preserves slug uniqueness.

## Testing Requirements

- Vitest:
  - row/bulk/editor delete dialog cancel/confirm paths,
  - duplicate row action, success/error feedback, cache refresh,
  - `entriesClient` delete/duplicate cache behavior.
- Bun:
  - route registration,
  - duplicate service creates draft clone,
  - delete remains permission-gated.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_API.md` if duplicate route is added
- `_docs/CMS_SPEC.md`
- `docs/coderso/entry-editor-and-metadata.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache semantics change
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Entries no longer use native `window.confirm()` for delete.
2. Editor exposes confirmed danger-zone delete.
3. `Duplicate` works end to end or is explicitly removed with closure evidence.
