# TASK-196-01: Menus List Screen and Single-Editor Routing
# FileName: TASK-196-01_Menus_List_Screen_and_Single_Editor_Routing.md

**Priority:** High
**Category:** CMS/Menus + Admin/UI + Routing + Cache
**Estimated Effort:** Large
**Dependencies:** TASK-196
**Status:** To Do

---

## Overview

Restructure Menus so admins land on a list of menus first and open the editor
only for the menu they explicitly choose.

This task intentionally resolves the report's `Active menu` ambiguity by
removing that selector from the editor instead of trying to relabel or patch
the current single-screen workflow.

## Sub-Tasks

- `TASK-196-01-01_Menus_List_Page_Table_and_Create_Flow.md`
- `TASK-196-01-02_Single_Menu_Editor_Route_Back_Navigation_and_Cache_Scope.md`

## Files to Change

- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/menus/MenuEditorPage.tsx`
- `core/admin/ui/contexts/AdminRouterContext.tsx` only if the current route
  helpers prove insufficient
- `core/admin/services/menusClient.ts`
- `core/admin/utils/adminPrefetch.ts` only if route warmup changes materially
- `core/admin/ui/assistant/useAssistantAdminContext.ts` only if selected-menu
  context needs route alignment work beyond the already-supported `/menus/:id`
  shape
- new `core/admin/ui/menus/MenuListPage.tsx`
- optional new `core/admin/ui/menus/MenuListTable.tsx` if row extraction
  improves reuse and testing clarity
- `tests/vitest/ui/menu-list-page.test.tsx`
- `tests/vitest/ui/menu-editor.test.tsx`
- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
- `tests/vitest/ui/menu-editor-refresh-policy.test.tsx`
- `tests/vitest/admin/menusClient.test.ts`
- `tests/vitest/admin/adminApp.test.tsx`

## Architecture

Current behavior:

- `/admin/menus` renders `MenuEditorPage`,
- the page stores a menu list locally and treats one `activeMenuId` as editor
  state,
- the editor header still allows creating a new menu and switching to another
  one in-place.

Target behavior:

- `/admin/menus` renders a list-first `MenuListPage`,
- `/admin/menus/:id` renders the editor for one menu only,
- `MenuEditorPage` owns one route-selected menu detail and never acts as a
  cross-menu switchboard,
- list and editor keep separate cache responsibilities:
  - list -> `menus:list`,
  - editor -> `menus:detail:<id>`.

## Implementation Direction

- Reuse the `Pages` mental model:
  - list page owns browsing and create entrypoint,
  - editor route owns one menu's details and items,
  - editor provides an explicit path back to the list.
- Keep `/admin/menus` as the sidebar destination.
- Use the current `MenuSummary` contract for the list page before widening any
  API surface; do not add server work just to show optional metrics.
- Do not auto-open the editor immediately after create by default; the agreed UX
  is list first, then explicit click into the chosen menu.
- Remove the `Active menu` dropdown from the editor entirely once the route
  split lands.
- Ensure background refreshes never switch the editor to a different menu
  because the list changed elsewhere.

## Security Contract

- Visibility: internal admin Menus UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - route split must stay on the authenticated admin router only,
  - cache refreshes must not load unrelated menu detail into the current editor
    route,
  - no new public linkable data surface is introduced.

## Testing Requirements

- `tests/vitest/ui/menu-list-page.test.tsx`
  - list route renders loading, cached, and empty states correctly
  - create CTA stays on the list surface
  - row click or primary action resolves to the chosen editor route
- `tests/vitest/ui/menu-editor.test.tsx`
  - editor shell no longer renders the cross-menu dropdown
  - editor shows the currently loaded menu metadata only
- `tests/vitest/ui/menu-editor-shell-wave.test.tsx`
  - route-selected editor loads the requested menu and keeps back-navigation
    discoverable
  - editor does not silently switch when list summaries refresh
- `tests/vitest/ui/menu-editor-refresh-policy.test.tsx`
  - mount refresh policy reflects list-page vs detail-page ownership instead of
    `activeMenuId` state
- `tests/vitest/admin/menusClient.test.ts`
  - create/update/delete cache behavior remains coherent for split list/detail
    ownership
- `tests/vitest/admin/adminApp.test.tsx`
  - `/admin/menus` resolves to list
  - `/admin/menus/:id` resolves to editor

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Menus now has a clear list-first route and a clear single-menu editor route.
2. The editor no longer contains cross-menu switching UI.
3. The list and editor have explicit cache and routing ownership.
