# TASK-207-02: Entries List Shell Parity With Admin Lists
# FileName: TASK-207-02_Entries_List_Shell_Parity_With_Admin_Lists.md

**Priority:** High
**Category:** CMS/Entries + Admin/UI + UX
**Estimated Effort:** Large
**Dependencies:** TASK-207-01
**Status:** Done (2026-04-24)

---

## Overview

Rebuild the Entries first-screen list shell so it matches the Pages, Posts,
Menus, and Content Types list pattern while keeping the existing editor route.

This is not a new flow. The current `EntryList` remains the route owner for
`/admin/coderso/entries`; it should consume the all-entries read model, render
the shared list shell, and navigate to the existing entry editor route.

The existing list/grid toggle is part of the old active-content-type screen
shape. The parity implementation should remove that toggle unless the same task
also upgrades the grid/card renderer to the all-entries item contract. A card
view must not survive as a second Entries flow that routes through one stale
`activeSlug`.

## Sub-Tasks

- [x] TASK-207-02-01: Entry List AdminShell, PageHeader, and Action Layout
- [x] TASK-207-02-02: Entry Table Content Type Column and Engine Links
- [x] TASK-207-02-03: Shared Pagination and Visible-Scope Selection

## Files to Change

- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/entries/EntryTable.tsx`
- `core/admin/ui/entries/EntryGrid.tsx` only if the card view is intentionally
  kept and upgraded to the cross-type row contract.
- `core/admin/ui/entries/EntryCreateDrawer.tsx` only if default content-type
  selection needs to work without a sidebar active slug.
- `tests/vitest/ui/content-entries.test.tsx`
- `tests/vitest/ui/entry-list-wave.test.tsx`
- `tests/vitest/ui/entry-table-wave.test.tsx`
- `tests/vitest/ui/entry-table-title.test.tsx`

## Security Contract

- Visibility: internal admin UI.
- Auth/RBAC/CSRF/rate-limit: unchanged; this task consumes existing client
  helpers and does not add routes.
- Reject-unknown validation: unchanged.
- Anti-abuse: no public write path; row navigation uses canonical admin links.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/content-entries.test.tsx tests/vitest/ui/entry-list-wave.test.tsx tests/vitest/ui/entry-table-wave.test.tsx tests/vitest/ui/entry-table-title.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Entries list uses the same first-screen structure as Pages/Posts/Menus/Engine.
2. The old left content-type sidebar is no longer the primary list navigation.
3. `New` remains available and opens the existing create drawer.
4. Entry title links still route to `/coderso/entries/:type/:id`.
5. No editor route or storage contract is duplicated.
6. No stale grid/card view remains wired to a single `activeSlug`.
