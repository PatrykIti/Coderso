# TASK-215: Coderso Widgets Pages-Style Library Parity
# FileName: TASK-215_Coderso_Widgets_Pages_Style_Library_Parity.md

**Priority:** High
**Category:** Coderso Widgets + Admin/UI + UX + Admin Cache
**Estimated Effort:** Very Large
**Dependencies:** TASK-205, TASK-208, TASK-213
**Reference Tasks:** TASK-214 is a non-blocking Pages-style list parity
reference for tab/resource-scoped action wording. Do not wait for TASK-214
completion unless implementation chooses to reuse a helper introduced there.
**Status:** To Do

---

## Overview

Refactor `/admin/coderso/widgets` from the current left-rail discovery layout
into a Pages-style library surface with one filter/action bar and a right-side
result area. The current rail choices move into a section dropdown in the
filter bar, and the result area can switch between a default table view and a
card/grid view.

This is an admin library parity task, not a widget runtime redesign. The
existing widget catalog, template editor routes, favorites user setting,
details drawer, insert dialog, template category drawer, cached clients, and
route contracts remain the owners. The implementation should reuse the Pages
list primitives and the recent list parity work where it fits:
`PageHeader`, checkbox table patterns, `useListPagination`,
`ListPaginationFooter`, `ConfirmActionDialog`, shared action toast adapters,
`resolveListMountRefreshOptions`, and `prefetchAdminRoute`.

The section dropdown replaces the current left panel choices:

- `All Items`
- `Favorites`
- `Templates`
- `All Widgets`
- `Layout`
- `Content`
- `Forms`
- `Navigation`
- `Media`

`All Items` is the default section and uses the default table view. Switching
to grid keeps the same filter/action bar visible and changes only the result
presentation. Grid cards still expose row-equivalent selection checkboxes for
bulk actions, and clicking a core widget card opens the same right-side details
drawer that exists today.

## Current Repo Findings

- `core/admin/ui/widgets/WidgetLibraryPage.tsx` owns the current rail,
  `activeScope`, widget category selection, view toggle, favorites state,
  catalog/category/page refresh, details drawer, insert dialog, template row
  actions, selected template ids, and template delete confirmations.
- The current `LibraryScope` is `all-items | favorites | templates | widgets`.
  Widget categories are handled separately through `WidgetCategoryFilter`.
  TASK-215 should consolidate those rail choices into one section model without
  duplicating filter logic.
- `WidgetCatalogFilters.tsx` owns the existing `Recommended/All widgets`,
  advanced mode, module, and complexity controls. These controls should become
  section-aware filter bar controls, not a second navigation layer.
- `widgetLibraryUtils.ts` already owns filtering/count helpers. Extend that
  owner for the new section-aware view model instead of duplicating filter
  logic inside the page component.
- `WidgetCard.tsx` is the current grid/card owner. Grid mode should extend it
  with selection/action-menu capability or wrap it with a controlled library
  tile component; do not fork the card behavior into an unrelated component.
- `WidgetDetailsDrawer.tsx` shows the core widget configuration preview and is
  the current right-side drawer for core widgets. Preserve that behavior for
  table Edit/Configure and grid card click.
- `WidgetInsertDialog.tsx` already supports inserting core widgets into pages
  or widget templates. TASK-215 should route Insert actions through that dialog
  rather than introducing a second placement popup.
- `widgetsClient.ts` owns cached catalog reads and `widgetCatalog:list` storage,
  but it does not currently emit cache-bus events itself. `widgetTemplatesClient.ts`
  and `widgetTemplateCategoriesClient.ts` own template/category cache updates and
  invalidate/broadcast `widgetCatalog:list` after template/category mutations.
  TASK-215 should subscribe to the existing cache keys and extend existing
  clients only if a concrete mutation/cache gap is proven.
- Display rows should continue to come from the widget catalog contract unless
  a leaf explicitly proves a direct template-list read is needed. Do not add a
  parallel template list state only because `listWidgetTemplatesCached()` is
  prefetched for editor/insert compatibility.
- `adminPrefetch.ts` already warms `/coderso/widgets` with widget catalog,
  template categories, and widget templates. Keep this warmup path and add
  proof if the data requirements change.
- `widgetTemplateRoutes.ts` already exposes strict internal admin template
  routes and `mapWidgetTemplateError`. Use those mappings if action error
  behavior becomes UI-visible through the table/grid flows.
- Canonical admin routing maps `/widgets` to `/coderso/widgets`. New links and
  active state must go through `resolveAdminHref`, `AdminLink`,
  `useAdminRouter().navigate`, and the existing route helpers.

## Required Product Behavior

1. `/admin/coderso/widgets` opens to a Pages-like list surface:
   `AdminShell`, `PageHeader`, compact action/filter bar, default table view,
   shared pagination, visible-row selection, and inline bulk action controls.
2. The old left rail disappears as primary IA. Its choices move into one
   section dropdown in the filter bar.
3. The filter/action bar remains visible in both table and grid modes.
4. Table mode is the default view for `All Items`.
5. Grid mode shows cards for the same filtered rows, with selection checkboxes
   for bulk actions and row-equivalent action menus.
6. Core widget card click and row Edit/Configure open `WidgetDetailsDrawer`.
7. Insert actions for core widgets open `WidgetInsertDialog` and preserve the
   current placement flow for page/template targets.
8. Preview is a non-mutating placeholder action in this task. It may open a
   small disabled/coming-soon state or emit bounded copy, but it must not add a
   new preview endpoint.
9. Actions are section/resource specific:
   - `All Items`: Preview placeholder, Edit/Configure, Insert for core
     widgets; template rows get template-safe actions only.
   - `Favorites`: source-specific Preview/Edit/Insert plus Remove from
     favorites and bulk remove from favorites.
   - `Templates`: Preview placeholder, Edit, Duplicate, Delete, category
     management, and confirmed bulk delete.
   - widget category sections: same core-widget actions as `All Widgets`,
     scoped to the selected category.
10. Bulk actions operate only on visible selected rows in the active section and
    active view. Hidden rows from another section or page must never be mutated.
11. Favorites stay per-user under `widgets.favorites` with the existing max-50
    behavior and bounded feedback.
12. Template destructive actions keep `ConfirmActionDialog`,
    `Promise.allSettled`-style partial failure handling, shared toasts, and
    cache-bus refresh behavior.
13. Cache behavior follows the shared admin list policy: hydrate from cache,
    background revalidate when cache exists, foreground load when cache is
    absent, and refresh on relevant cache-bus events.
14. Existing widget runtime contracts, widget templates, page builder insert
    contracts, assistant context, and public rendering stay backward
    compatible.

## State Ownership Contract

- `WidgetLibraryPage` remains the orchestration owner unless a shell hook is
  extracted in the same task. It owns `section`, `viewMode`, query/filter
  values, visible rows, selected row ids by section, active bulk action,
  pending preview placeholder target, pending insert target, pending template
  delete ids, and inline action feedback.
- Table, grid, filter, and action-menu components are controlled/presentational
  boundaries. They receive rows, selected ids, view state, and callbacks from
  the shell or shell-owned hook.
- `WidgetDetailsDrawer`, `WidgetInsertDialog`, `WidgetTemplateCategoryDrawer`,
  and `ConfirmActionDialog` remain the action surfaces. Do not introduce
  imperative refs to bridge row/card actions into these surfaces.
- The new section dropdown is the single owner of the old rail choice. Do not
  keep the rail and dropdown as duplicate navigation signals.
- View mode does not affect filtering or selection ownership. Switching table
  to grid preserves the current section/filter state and trims selection to the
  same visible rows.
- If the existing internal `view` value keeps a `"list"` branch during the
  migration, map user-facing copy/tests to `table` so the final contract is not
  split between "list" and "table" terminology.

## Sub-Tasks

- [ ] TASK-215-01: Widget Library Shell, Section Selector, and Cache Hydration
- [ ] TASK-215-02: Widget Library Filter Bar, Table, and Grid Model
- [ ] TASK-215-03: All Items and Core Widget Actions
- [ ] TASK-215-04: Favorites and Template Resource Actions
- [ ] TASK-215-05: QA, Docs, Changelog, and Closure

## Leaf Breakdown

- [ ] TASK-215-01-01: Pages-Style Shell and Section Dropdown
- [ ] TASK-215-01-02: Widget Library Cache Hydration and State Ownership
- [ ] TASK-215-02-01: Section-Aware Filter Model and Counts
- [ ] TASK-215-02-02: Table View Selection and Pagination
- [ ] TASK-215-02-03: Grid View Selection and Drawer Parity
- [ ] TASK-215-03-01: All Items Row Actions and Preview Placeholder
- [ ] TASK-215-03-02: Core Widget Drawer and Insert Dialog Flow
- [ ] TASK-215-03-03: Core Widget Bulk Actions and Favorites
- [ ] TASK-215-04-01: Favorites Section Actions and User Settings
- [ ] TASK-215-04-02: Template Table/Grid Actions and Category Management
- [ ] TASK-215-04-03: Template Bulk Actions, Confirmations, and Toasts
- [ ] TASK-215-04-04: Widget Action Error Mapping and Toast Adapter
- [ ] TASK-215-05-01: Widgets Pages-Parity Test Matrix
- [ ] TASK-215-05-02: Widgets Docs, Changelog, and Board Closure

## Non-Goals

- No second widget registry, renderer, page-builder block model, or template
  editor route.
- No public widget write endpoint.
- No server-side pagination for this library pass.
- No bulk insert action. Insert remains one selected widget plus one explicit
  target/placement confirmation.
- No real preview endpoint in this task. Preview is a placeholder action unless
  a later task expands the preview contract.
- No raw `window.location` navigation, raw anchors, or new admin route aliases.
- No localStorage/browser cache for secrets or raw template block config beyond
  existing cached clients.
- No changes to public runtime widget rendering except regression proof that it
  remains compatible.

## Security Contract

- Visibility: internal admin UI and existing internal Widgets admin API only.
- Auth model: authenticated admin session / admin API key where supported by
  existing admin transport.
- RBAC: catalog/template/category reads require `widgets:read`; template
  create/update/duplicate/delete and template-target insert writes require
  `widgets:write`; page-target insert writes keep the existing page/content
  write path.
- CSRF: all writes continue through existing admin clients with `withCsrf:
  true` where they do today (`updatePage`, `updateWidgetTemplate`,
  `duplicateWidgetTemplate`, `deleteWidgetTemplate`, category mutations).
- Rate-limit buckets: existing `admin_read` for reads and `admin_write` for
  mutations.
- Reject-unknown validation: widget template payloads remain owned by
  `widgetSchemas.ts` with `additionalProperties: false`; UI code must not send
  fields outside existing page/template contracts.
- Anti-abuse: no public write path; selected ids are derived from visible rows
  in the active section; destructive template actions require explicit
  confirmation; preview placeholder performs no mutation and exposes no tokens.

## Implementation Order

1. Extract or normalize the section/view/list state model.
2. Replace the left rail with a Pages-style shell and section dropdown.
3. Repair cache mount behavior and prefetch/state ownership.
4. Build the shared table view with checkbox selection and pagination.
5. Upgrade grid view to keep the filter bar, selection, and drawer parity.
6. Wire section-specific row/card actions.
7. Wire favorites and template bulk actions with shared feedback.
8. Add route/client/error coverage only where action behavior depends on stable
   API codes.
9. Update docs, changelog, task statuses, and the task board on closure.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/pageBuilder/widgetLibrary.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-card.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widgetLibraryUtils.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widgetInsertUtils.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-pagination.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-action-toasts.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/action-toasts.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/widgetsClient.test.ts tests/vitest/admin/widgetTemplatesClient.test.ts tests/vitest/admin/widgetTemplateCategoriesClient.test.ts tests/vitest/admin/adminPrefetch.test.ts`
- Bun route coverage if route mapping/schema behavior changes:
  - `set -a && source .env && set +a`
  - `bun test tests/integration/routes/widgets.test.ts tests/integration/routes/widgetTemplates.test.ts tests/integration/routes/widgetTemplateCategories.test.ts`
- Widget runtime compatibility smoke if insert/template block handling changes:
  - `bun test tests/unit/widgets/widgetCatalogService.test.ts tests/unit/widgets/widgetTemplateService.test.ts`
  - focused Vitest widget suites for any touched widget renderer/editor.
- Manual or Playwright smoke before closure:
  - select each section from the dropdown;
  - switch table/grid and verify the filter bar remains stable;
  - select rows/cards and run visible-scope bulk actions;
  - open drawer from a core widget table row and grid card;
  - insert a core widget into a page and template;
  - run template duplicate/delete with confirmation and partial-failure proof.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CMS_API.md` if route errors, schemas, or endpoint examples change.
- `_docs/ARCHITECTURE.md` if admin IA/route behavior changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Widgets opens to a Pages-style table-first `All Items` surface.
2. The left rail choices are represented by one section dropdown in the filter
   bar.
3. Table and grid modes share filters, visible rows, selection, bulk state, and
   action semantics.
4. Core widget Edit/Configure opens the existing drawer; Insert opens the
   existing dialog.
5. Favorites and Templates expose resource-specific actions and bulk behavior
   without cross-section mutation.
6. Existing widget catalog, template, insert, cache, route, and runtime
   contracts remain backward compatible.
