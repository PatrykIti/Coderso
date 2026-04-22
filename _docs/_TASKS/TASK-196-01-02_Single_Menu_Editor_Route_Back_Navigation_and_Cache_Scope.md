# TASK-196-01-02: Single-Menu Editor Route, Back Navigation, and Cache Scope
# FileName: TASK-196-01-02_Single_Menu_Editor_Route_Back_Navigation_and_Cache_Scope.md

**Priority:** High
**Category:** CMS/Menus + Admin/UI + Route Detail
**Estimated Effort:** Medium
**Dependencies:** TASK-196-01
**Status:** To Do

---

## Overview

Refactor `MenuEditorPage` so it edits the menu selected by the route and only
that menu.

This leaf removes the editor-local menu switcher and makes the route parameter
the single source of truth for the active menu.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/menus/MenuEditorPage.tsx`
- `core/admin/ui/contexts/AdminRouterContext.tsx` only if a small helper
  extraction is warranted
- optional new `core/admin/ui/menus/routeParams.ts`
- `tests/vitest/ui/menu-editor.test.tsx`
- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
- `tests/vitest/ui/menu-editor-refresh-policy.test.tsx`
- `tests/vitest/admin/adminApp.test.tsx`

## Implementation Direction

- Resolve the menu ID from `/admin/menus/:id` the same way other editor routes
  derive their selected resource.
- Remove these editor responsibilities:
  - `Active menu` dropdown,
  - `New Menu` button,
  - editor-local switching between unrelated menus.
- Add clear back-navigation to the Menus list.
- Keep editor-specific actions in place:
  - refresh current menu,
  - save/discard,
  - add/edit/delete item.
- Editor hydration model:
  - load `getMenuWithItemsCached(menuId)` for the route-selected menu,
  - keep `listPagesCached()` for page-link pickers,
  - do not let `menus:list` refresh replace the current route-selected detail.
- If route parsing becomes noisy inside `MenuEditorPage`, extract a tiny
  helper; do not introduce a Menus-only router abstraction.

## Security Contract

- Visibility: internal admin Menus editor only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - route state must never grant access beyond existing `menus:read/write`
    enforcement,
  - editor refresh may reload the chosen menu but must not jump to another menu
    because of external list updates.

## Testing Requirements

- `tests/vitest/ui/menu-editor.test.tsx`
  - no `Active menu` dropdown in the editor render
  - editor still exposes save/discard/item-edit shells
- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
  - route-selected menu detail loads correctly
  - back navigation to the Menus list is visible
  - external summary refresh does not switch the editor to another menu
- `tests/vitest/ui/menu-editor-refresh-policy.test.tsx`
  - route-based refresh rules replace `activeMenuId` ownership
- `tests/vitest/admin/adminApp.test.tsx`
  - `/admin/menus/:id` resolves to the editor route

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `docs/screens/menus.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. `MenuEditorPage` edits only the route-selected menu.
2. The editor no longer acts as a cross-menu switchboard.
3. Refresh/caching behavior is scoped to the current menu detail.
