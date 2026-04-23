# TASK-200: Menus List Parity With Pages and Posts
# FileName: TASK-200_Menus_List_Parity_With_Pages_and_Posts.md

**Priority:** High
**Category:** CMS/Menus + Admin/UI + UX
**Estimated Effort:** Large
**Dependencies:** TASK-196, TASK-198, TASK-199
**Status:** Done (2026-04-23)

---

## Overview

Bring `/admin/menus` in line with the current `Pages` and `Posts` list UI and
make whole-menu lifecycle actions explicit.

`TASK-196` correctly split Menus into a list-first screen and a single-menu
editor route. The current list, however, still visually differs from Pages and
Posts:

- the header actions use `Refresh` + `New Menu` instead of the compact list
  pattern,
- there is no filter/search strip,
- there is no selected-row state,
- there are no bulk actions,
- there is no visible whole-menu lifecycle (`draft` / `published`) even though
  users need publish, move-to-draft, and delete actions from the list,
- the UI currently does not expose whole-menu delete in a practical way,
- the table is embedded as a local implementation rather than following the
  Pages/Posts controlled-table contract.

This task is a Menus list parity pass. It must keep the existing `/menus` ->
`/menus/:id` IA, but make the list behave and feel like Pages/Posts.

## Sub-Tasks

- [x] Add and validate the whole-menu lifecycle contract.
- [x] Align the Menus list header, filters, controlled selection, and table
  behavior with Pages/Posts.
- [x] Add row and bulk publish/draft/delete actions with confirmation,
  refresh, and partial-failure feedback.
- [x] Preserve editor routing, create flow, and admin cache behavior.
- [x] Validate public runtime navigation only resolves published menus.
- [x] Update tests, UX/API docs, changelog, and task board on closure.

## Scope

1. Add a whole-menu lifecycle contract:
   - supported statuses: `draft`, `published`,
   - existing menus migrate as `published` to preserve current runtime
     behavior,
   - new menus may be created as `draft` from the admin create flow unless the
     implementation intentionally keeps the current publish-by-default behavior
     and documents that choice,
   - menu summaries expose `status` and `publishedAt`.
2. Update Menus list header to match the current Pages/Posts pattern:
   - title: `Menus`,
   - description stays user-facing,
   - primary create button label becomes `New`,
   - selected-row bulk controls render inline in `PageHeader.actions`, to the
     left of `New`.
3. Add filter/search controls for the Menus list:
   - search by menu name and location,
   - status filter: `All`, `Published`, `Draft`,
   - location filter with `All locations`, concrete existing locations, and
     `Not assigned`,
   - filtering applies to the visible row set and selection is trimmed when rows
     disappear.
4. Add controlled table selection:
   - header checkbox selects only currently visible menus,
   - row checkboxes reflect `selectedIds`,
   - selected row styling matches Pages/Posts table behavior.
5. Add per-row whole-menu actions:
   - `Publish` for draft menus,
   - `Move to Draft` for published menus,
   - `Delete`,
   - delete requires confirmation,
   - publish/draft/delete refresh list cache and preserve editor route behavior.
6. Add Menus bulk actions:
   - `Publish`,
   - `Move to Draft`,
   - `Delete`,
   - delete requires confirmation,
   - apply only selected visible IDs,
   - refresh list and clear selection after apply,
   - surface partial failures if multiple actions are attempted.
7. Preserve existing single-row behavior:
   - menu name and `Open editor` still route to `/admin/menus/:id`,
   - `AdminLink` / route helpers remain the navigation path,
   - create dialog still creates a menu and updates cache/list state.

## Non-Goals

- No new public menu endpoints.
- Do not change menu item editor behavior, tree editing, item delete dialog, or
  runtime navigation rendering.
- Do not add archive/scheduled states for Menus in this task.
- Do not add author filters unless Menus gains author ownership in a separate
  task.

## Files to Change

- `core/admin/ui/menus/MenuListPage.tsx`
  - own search/status/location filter state,
  - own selected IDs and bulk action state,
  - render `PageHeader.actions` with inline bulk controls + `New`,
  - remove `Refresh` from the primary header actions or move refresh into a
    secondary/non-layout-shifting affordance if still needed.
- `core/admin/ui/menus/MenuListPage.tsx`
  - either keep `MenuListTable` local but make it controlled, or extract it if
    the component becomes too large.
- `core/admin/ui/menus/MenuFilters.tsx` if a small Menus-specific filter strip
  is clearer than overloading `PageFilters` with fake status/author fields.
- `core/admin/ui/menus/MenuBulkActionsBar.tsx` if extracting the inline bulk
  controls improves readability; otherwise keep the small inline surface local
  to `MenuListPage`.
- `core/admin/ui/menus/MenuRowActions.tsx` or current row-actions surface
  - expose row-level `Publish`, `Move to Draft`, and `Delete`,
  - keep `Open editor` available and visually secondary to lifecycle actions.
- `core/admin/services/menusClient.ts`
  - extend `MenuSummary` with `status` and `publishedAt`,
  - add or reuse wrappers for `publishMenu`, `unpublishMenu` / `moveMenuToDraft`,
  - reuse existing `deleteMenu(menuId)` for row/bulk delete,
  - do not add a bulk API client unless current per-item actions prove
    insufficient.
- `core/services/menus/menuService.ts`
  - normalize menu status,
  - create/update/publish/unpublish/delete whole-menu lifecycle operations,
  - map `publishedAt` consistently.
- `core/server/routes/menuRoutes.ts`
  - accept status updates or add explicit publish/unpublish admin routes,
  - preserve centralized `mapMenuError` behavior.
- `core/server/validation/menuSchemas.ts`
  - extend strict menu schemas for allowed lifecycle status updates.
- `core/services/navigation/navigationRuntimeResolver.ts`
  - ensure public/runtime menu resolution does not render draft menus unless an
    explicit preview/admin path already exists.
- `core/db/schema.ts`
  - add `menus.status` and `menus.published_at`.
- `core/db/migrations/*`
  - add SQL migration,
  - add `meta/*_snapshot.json`,
  - update `meta/_journal.json`.
- `tests/vitest/ui/menu-list-page.test.tsx`
  - update shell/list/filter/bulk coverage.
- `tests/vitest/admin/menusClient.test.ts`
  - cover publish/draft/delete wrappers, cache updates, and invalidation.
- `tests/unit/menus/menuService.test.ts`
  - cover status normalization, publish/draft transitions, and delete.
- `tests/integration/routes/menus.test.ts`
  - cover route registration for any added publish/unpublish route, or update
    PATCH route validation tests if status stays on `PATCH /menus/:id`.
- `tests/vitest/admin/adminApp.test.tsx`
  - only update if route ownership or `/admin/menus` resolution changes.
- `_docs/CONTENT_LIST_UX.md`
  - document Menus list parity and visible-scope bulk delete behavior.
- `_docs/_TASKS/README.md`
  - keep the task row/status and statistics synchronized.
- `_docs/_CHANGELOG/*`
  - add only when this implementation task is completed.

## Implementation Direction

Reuse the current list contracts from Pages and Posts, but keep Menus domain
truthful:

```tsx
const filteredItems = filterMenus(items, searchQuery, statusFilter, locationFilter);
const visibleIds = filteredItems.map((menu) => menu.id);
const selectedCount = selectedIds.length;
const isAllSelected =
  visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
const isIndeterminate = selectedCount > 0 && !isAllSelected;
```

```tsx
<PageHeader
  title="Menus"
  actions={
    <>
      {selectedCount > 0 ? (
        <MenuBulkActionsBar
          selectedCount={selectedCount}
          action={bulkAction}
          onActionChange={setBulkAction}
          onApply={handleBulkApply}
          onClear={handleClearSelection}
          variant="inline"
        />
      ) : null}
      <Button onClick={() => setCreateOpen(true)}>New</Button>
    </>
  }
/>
```

Recommended filter contract:

```ts
type MenuStatusFilter = "all" | "published" | "draft";
type MenuLocationFilter = "all" | "unassigned" | `location:${string}`;
```

Menu lifecycle contract:

```ts
type MenuStatus = "draft" | "published";

function normalizeMenuStatus(value: unknown, fallback: MenuStatus): MenuStatus {
  return value === "published" || value === "draft" ? value : fallback;
}
```

Bulk action sketch:

```ts
if (bulkAction === "delete") {
  confirm(`Delete ${selectedIds.length} menu(s)? This cannot be undone.`);
}

const results = await Promise.allSettled(
  selectedIds.map((id) => {
    if (bulkAction === "publish") return publishMenu(id);
    if (bulkAction === "unpublish") return moveMenuToDraft(id);
    return deleteMenu(id);
  })
);
const failed = results.filter((result) => result.status === "rejected");
await refresh({ force: true, background: true });
clearSelection();
```

Runtime compatibility:

- Existing rows should be migrated to `published` so current public navigation
  does not disappear after deploy.
- Draft menus should not resolve for normal public runtime navigation by
  `menuId` or `location`.
- If preview/editor flows need draft visibility, keep that behind the existing
  authenticated admin route rather than loosening public runtime resolution.

## Security Contract

- Visibility: internal admin Menus list only.
- Endpoints:
  - reuse existing `/admin/api/menus` and `/admin/api/menus/:id` where possible,
  - any explicit publish/unpublish routes must remain under `/admin/api/menus*`.
- Auth model: authenticated admin session / admin API key where supported by
  the shared admin stack.
- RBAC:
  - `menus:read` for list/read,
  - `menus:write` for create/update/publish/draft/delete.
- CSRF: inherited from existing mutating menu client wrappers; any new
  publish/unpublish wrapper must use CSRF.
- Rate-limit bucket: unchanged (`admin_read`, `admin_write`).
- Reject-unknown validation:
  - strict `draft` / `published` allowlist for status,
  - no unknown menu update payload fields.
- Anti-abuse:
  - destructive bulk delete requires confirmation,
  - bulk publish/draft/delete must only run against currently selected IDs after
    visible-row trimming,
  - partial failures must stay visible,
  - no raw server stack traces or internal tokens in UI feedback.

## Testing Requirements

- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Vitest:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/menu-list-page.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx`
  - include coverage for:
    - shell renders `New` instead of `New Menu`,
    - search filters by menu name/location,
    - status filter handles `Published` and `Draft`,
    - location filter handles existing locations and unassigned menus,
    - header checkbox selects visible menus only,
    - selected rows render inline bulk controls before `New`,
    - hidden filtered-out rows are trimmed from selection,
    - row-level `Publish`, `Move to Draft`, and `Delete` actions call the
      correct client wrappers,
    - delete confirmation blocks when cancelled,
    - successful bulk publish/draft/delete calls the correct wrappers for
      selected IDs, refreshes, and clears selection,
    - partial bulk failures surface an error while still refreshing.
- If route ownership changes, also run:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminApp.test.tsx`
- Required admin client tests:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/menusClient.test.ts`
- Required Bun route/service tests because this task changes menu status/service
  behavior:
  - `set -a && source .env && set +a && bun test tests/integration/routes/menus.test.ts tests/unit/menus/menuService.test.ts`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry when TASK-200 is completed

## Acceptance Criteria

1. `/admin/menus` visually follows Pages/Posts list layout: header, filters,
   table, footer/empty/loading behavior.
2. The create action is labeled `New`.
3. Menus can be searched and filtered by status/location without inventing fake
   author fields.
4. Each row exposes `Publish`, `Move to Draft`, and `Delete` where applicable.
5. Visible-row selection and inline bulk publish/draft/delete work consistently with
   Pages/Posts.
6. Selecting rows does not insert a standalone toolbar row or push the table
   down.
7. Public runtime navigation only resolves published menus, while existing menus
   remain published after migration for backward compatibility.
8. Existing menu editor links, create dialog, cache refresh, and `/menus/:id`
   route behavior remain intact.

## Validation Evidence

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/menu-list-page.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx tests/vitest/admin/menusClient.test.ts tests/vitest/validation/menuSchemas.test.ts tests/vitest/ui/menu-editor.test.tsx tests/vitest/ui/menu-editor-shell-wave.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/menus.test.ts tests/unit/menus/menuService.test.ts tests/unit/navigation/navigationRuntimeResolver.test.ts`
