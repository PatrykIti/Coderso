# 289 - TASK-058-03 Pages and Menus Hydration Refresh Policy

- **Date:** 2026-02-21
- **Version:** 0.1.289
- **Tasks:** TASK-058, TASK-058-03

## Key Changes

### Pages Refresh Policy
- Updated `PageListPage` mount behavior to avoid forced network refresh when list cache exists.
- Added explicit mount policy helper:
  - `core/admin/ui/pages/PageListPage.tsx` (`resolvePageListMountRefreshOptions`)
- Switched page refresh background logic to shared helper:
  - `core/admin/utils/cacheRefresh.ts`

### Menus Hydration and Detail Reload Policy
- Updated `MenuEditorPage` to stop forcing menu detail fetches on every route entry.
- Added explicit policy helpers:
  - `core/admin/ui/menus/MenuEditorPage.tsx`
    - `resolveMenuMountRefreshOptions`
    - `shouldLoadActiveMenuAfterRefresh`
- `loadMenu` now respects a `force` option and defaults to cached reads.
- Explicit actions and invalidation paths now force refresh:
  - header `Refresh`,
  - post-save reload,
  - remote-update refresh CTA,
  - menu-detail cacheBus event handling.

### Regression Tests
- Added policy regression tests:
  - `tests/unit/ui/page-list-cache-behavior.test.tsx`
  - `tests/unit/ui/menu-editor-refresh-policy.test.tsx`

### Documentation Sync
- Updated `_docs/ADMIN_CACHE.md` with pages/menus lifecycle policy and explicit-force rules.

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/ui/page-list-cache-behavior.test.tsx tests/unit/ui/menu-editor-refresh-policy.test.tsx tests/unit/ui/page-list.test.tsx tests/unit/ui/menu-editor.test.tsx`

## Result
- TASK-058-03 is closed with deterministic pages/menus hydration behavior and reduced redundant refreshes.
