# TASK-215-01: Widget Library Shell, Section Selector, and Cache Hydration
# FileName: TASK-215-01_Widget_Library_Shell_Section_Selector_and_Cache_Hydration.md

**Priority:** High
**Category:** Coderso Widgets + Admin/UI + Admin Cache
**Estimated Effort:** Large
**Dependencies:** TASK-215, TASK-205, TASK-206
**Status:** Done (2026-04-26)

---

## Overview

Create the Pages-style shell for `/admin/coderso/widgets`: remove the left rail
as primary navigation, move its choices into a section dropdown in the filter
bar, and align widget library cache hydration with the shared admin list
contract.

This subtask owns the page-level structure and state ownership. It should not
yet decide every row action; later subtasks wire the table/grid actions.

## Sub-Tasks

- [x] TASK-215-01-01: Pages-Style Shell and Section Dropdown
- [x] TASK-215-01-02: Widget Library Cache Hydration and State Ownership
- [ ] Keep `/admin/coderso/widgets` as the canonical route through shared
  admin path helpers.
- [ ] Preserve `WidgetTemplateCategoryDrawer`, `WidgetDetailsDrawer`,
  `WidgetInsertDialog`, and `ConfirmActionDialog` as shell-owned surfaces.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetLibrarySectionSelect.tsx` if extracted.
- `core/admin/ui/widgets/widgetLibraryUtils.ts`
- `core/admin/utils/cacheRefresh.ts` only if the shared mount-refresh helper
  needs a compatible extension.
- `core/admin/utils/adminPrefetch.ts` only if the cache warmup matrix changes.
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/widgetLibraryUtils.test.ts`
- `tests/vitest/admin/cacheRefresh.test.ts` if the shared helper changes.
- `tests/vitest/admin/adminPrefetch.test.ts`

## Security Contract

- Visibility: internal admin Widgets UI.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: `widgets:read` for catalog/template/category reads; write actions stay
  owned by later action subtasks.
- CSRF: no new writes in the shell work.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: no route schema changes in this subtask.
- Anti-abuse: section ids are a closed UI enum; unsupported section values must
  normalize to `all-items` rather than generating route/API calls.

## Testing Requirements

- Section dropdown renders every old rail choice and opens on `All Items`.
- The left rail is not rendered as a duplicate primary navigation surface.
- Canonical active route and prefetch behavior still match `/coderso/widgets`.
- Cache-present mount renders hydrated rows without a foreground loading loop.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/ui/widgetLibraryUtils.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPrefetch.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/cacheRefresh.test.ts` if the shared helper changes.
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. The Widget Library has a Pages-style shell with a single section selector.
2. The shell owns section/view/action state without imperative child refs.
3. Existing cache/prefetch behavior is preserved or improved with tests.
