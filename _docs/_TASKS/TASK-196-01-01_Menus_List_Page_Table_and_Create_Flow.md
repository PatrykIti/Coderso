# TASK-196-01-01: Menus List Page, Table, and Create Flow
# FileName: TASK-196-01-01_Menus_List_Page_Table_and_Create_Flow.md

**Priority:** High
**Category:** CMS/Menus + Admin/UI + List Surface
**Estimated Effort:** Medium
**Dependencies:** TASK-196-01
**Status:** Done (2026-04-22)

---

## Overview

Add the new `/admin/menus` list surface that shows existing menus before
opening any editor.

This leaf is the concrete owner for the user request:

- show a list of menus first, like `Pages`,
- enter the editor only after clicking a chosen row,
- keep menu creation on the list surface instead of inside the editor.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/menus/MenuCreateDialog.tsx`
- `core/admin/services/menusClient.ts`
- new `core/admin/ui/menus/MenuListPage.tsx`
- optional new `core/admin/ui/menus/MenuListTable.tsx`
- `tests/vitest/ui/menu-list-page.test.tsx`
- `tests/vitest/admin/menusClient.test.ts`
- `tests/vitest/admin/adminApp.test.tsx`

## New Files to Create

- `core/admin/ui/menus/MenuListPage.tsx`
- `tests/vitest/ui/menu-list-page.test.tsx`

## Implementation Direction

- Follow the current `Pages` list mental model, but keep the Menus list narrow
  and summary-driven.
- Use current `MenuSummary` fields only:
  - `name`,
  - `location`,
  - `createdAt`.
- If row extraction helps readability, create `MenuListTable.tsx`; otherwise
  keep the list page simple.
- Route entrypoints:
  - header CTA -> open existing `MenuCreateDialog`,
  - row click / primary action -> navigate to `/admin/menus/:id`.
- Create flow:
  - create the menu,
  - refresh or patch `menus:list`,
  - keep the user on the list,
  - make the new menu visible and actionable there.
- Do not add list-only whole-menu delete/archive actions in this leaf.

## Security Contract

- Visibility: internal admin list UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - create continues to use the existing CSRF-protected admin mutation,
  - the list must not expose extra metadata that the current summary contract
    does not already return.

## Testing Requirements

- `tests/vitest/ui/menu-list-page.test.tsx`
  - renders header, create CTA, loading state, empty state, and cached list
  - uses current summary fields without depending on detail payload shape
  - clicking a row or primary action navigates to the editor route
  - create success keeps the user on the list and reveals the new row
- `tests/vitest/admin/menusClient.test.ts`
  - `createMenu()` keeps `menus:list` coherent for immediate list rendering
- `tests/vitest/admin/adminApp.test.tsx`
  - `/admin/menus` renders the new list page

## Documentation Updates Required

- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/ADMIN_CACHE.md`
- `docs/screens/menus.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `/admin/menus` behaves as a standalone list surface.
2. Creating a menu no longer relies on already being inside the editor.
3. Opening the editor always starts from an explicit menu choice on the list.
