# TASK-207-02-02: Entry Table Content Type Column and Engine Links
# FileName: TASK-207-02-02_Entry_Table_Content_Type_Column_and_Engine_Links.md

**Priority:** High
**Category:** CMS/Entries + Admin/UI + Navigation
**Estimated Effort:** Medium
**Dependencies:** TASK-207-02-01, TASK-207-01-01
**Status:** Done (2026-04-24)

---

## Overview

Add the requested `Content Type` column to the Entries table and make each value
link to the owning Engine/content type editor.

The link must use `AdminLink` and the existing canonical admin path owner in
`core/admin/utils/adminPaths.ts`. Do not hand build a raw browser path, create
an Entries-only route helper, or introduce a new `adminPaths` abstraction.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryTable.tsx`
  - accept all-entries list items or an explicit content-type lookup map,
  - render `Content Type` column,
  - link the content-type name through `AdminLink` with either the legacy
    `/content-types/:id` href that `resolveAdminHref` canonicalizes or the
    canonical `/coderso/engine/:id` href; do not add a bespoke Entries route
    helper,
  - keep title links pointing to `/entries/:type/:id` so existing editor routing
    is preserved.
- `core/admin/ui/entries/EntryGrid.tsx` only if the card renderer remains:
  - accept the same all-entries list item shape,
  - build each card title link from that row's `contentType.slug`,
  - do not accept one global `entryTypeSlug` for a cross-type result set.
- `tests/vitest/ui/entry-table-wave.test.tsx`
- `tests/vitest/ui/entry-table-title.test.tsx`

## Security Contract

- Visibility: internal admin navigation only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: no public links; links stay inside admin router/prefetch helpers.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/entry-table-wave.test.tsx tests/vitest/ui/entry-table-title.test.tsx tests/vitest/admin/adminPaths.test.ts`
  - keep `adminPaths.test.ts` focused on the existing central helper; add cases
    only if the implementation extends aliases or canonicalization.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Every row displays the owning content type.
2. The content-type column value is a link to the Engine editor for that type
   through `AdminLink` and the existing `adminPaths.ts` canonicalization path.
3. Duplicate content-type names remain understandable by including slug/context
   in secondary copy when needed.
4. Entry title links continue to open the existing entry editor.
5. If the grid/card renderer remains, it uses the same row-owned content-type
   context as the table.
