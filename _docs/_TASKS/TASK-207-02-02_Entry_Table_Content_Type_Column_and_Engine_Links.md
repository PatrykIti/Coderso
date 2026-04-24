# TASK-207-02-02: Entry Table Content Type Column and Engine Links
# FileName: TASK-207-02-02_Entry_Table_Content_Type_Column_and_Engine_Links.md

**Priority:** High
**Category:** CMS/Entries + Admin/UI + Navigation
**Estimated Effort:** Medium
**Dependencies:** TASK-207-02-01, TASK-207-01-01
**Status:** To Do

---

## Overview

Add the requested `Content Type` column to the Entries table and make each value
link to the owning Engine/content type editor.

The link must use `AdminLink` and canonical admin route helpers. Do not hand
build a raw browser path or create an Entries-only route helper.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryTable.tsx`
  - accept all-entries list items or an explicit content-type lookup map,
  - render `Content Type` column,
  - link the content-type name to `/content-types/:id` or the canonical
    `/coderso/engine/:id` route through `AdminLink`,
  - keep title links pointing to `/entries/:type/:id` so existing editor routing
    is preserved.
- `tests/vitest/ui/entry-table-wave.test.tsx`
- `tests/vitest/ui/entry-table-title.test.tsx`

## Security Contract

- Visibility: internal admin navigation only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: no public links; links stay inside admin router/prefetch helpers.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/entry-table-wave.test.tsx tests/vitest/ui/entry-table-title.test.tsx tests/vitest/admin/adminPaths.test.ts`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Every row displays the owning content type.
2. The content-type column value is a link to the Engine editor for that type.
3. Duplicate content-type names remain understandable by including slug/context
   in secondary copy when needed.
4. Entry title links continue to open the existing entry editor.
