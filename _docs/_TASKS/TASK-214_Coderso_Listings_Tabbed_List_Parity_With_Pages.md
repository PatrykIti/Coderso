# TASK-214: Coderso Listings Tabbed List Parity With Pages
# FileName: TASK-214_Coderso_Listings_Tabbed_List_Parity_With_Pages.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI + UX + Admin Cache
**Estimated Effort:** Very Large
**Dependencies:** TASK-054-07, TASK-205, TASK-206, TASK-208
**Status:** Done (2026-04-26)

---

## Overview

Bring `/admin/coderso/listings` to the same first-screen admin list contract as
the current `/admin/pages` implementation while preserving the Listings
two-resource contract: saved listing queries and listing templates.

This is a parity task, not a Listings redesign. The existing `Queries` and
`Templates` tabs stay as the primary IA. The active tab owns the header `New`
action, selected rows, bulk action bar, confirmations, empty states, and toast
feedback:

- on `Queries`, `New` opens the existing listing query create flow;
- on `Templates`, `New` opens the listing template create flow;
- selected rows and bulk actions never cross tab boundaries;
- toasts and inline errors use resource-specific copy for listing queries or
  listing templates.

The implementation should reuse the shared list primitives already used by
Pages and the parity waves for Entries, Custom Screens, and Forms:
`PageHeader`, active-tab header actions, checkbox tables, `useListPagination`,
`ListPaginationFooter`, `ConfirmActionDialog`, and
`createListActionToastAdapter`.

## Current Repo Findings

### Pages Reference Implementation

- `core/admin/ui/pages/PageListPage.tsx` owns the reference list orchestration:
  cache hydration, background refresh, filters, visible-row selection, inline
  bulk action bar, create drawer, shared pagination, confirmed deletes, and
  `createListActionToastAdapter` feedback.
- `core/admin/ui/pages/PageTable.tsx`, `PageFilters.tsx`,
  `PageBulkActionsBar.tsx`, `PageRowActions.tsx`,
  `core/admin/ui/shared/ListPaginationFooter.tsx`,
  `core/admin/ui/shared/ConfirmActionDialog.tsx`, and
  `core/admin/ui/shared/listActionToasts.ts` are the concrete primitives that
  Listings should reuse or mirror with Listings-specific labels.

### Current Listings Gaps

- `core/admin/ui/listings/ListingListPage.tsx` is a simple tab shell. It only
  renders `New query` at the page header, so the header action does not follow
  active tab context.
- `ListingListPage` deletes listing queries directly from the row dropdown via
  `deleteListingQuery`; it does not use `ConfirmActionDialog`, bulk actions, or
  shared toasts.
- `ListingQueryTable.tsx` has no checkbox column, filter strip, pagination
  footer, selected-row styling, or inline bulk action integration.
- `ListingTemplateManager.tsx` owns a nested `New template` button and local
  create/edit dialog. That conflicts with the desired Pages-style header `New`
  ownership for the active `Templates` tab.
- `ListingTemplateManager` deletes templates directly from row actions and does
  not emit shared list toasts or confirmed delete feedback.
- `useListingQueries` and `useListingTemplates` hydrate from cache but still
  force refresh on mount. They need the same cache-present/background and
  cache-missing/foreground behavior used by Pages and the recent list parity
  waves.
- `core/admin/services/listingsClient.ts` already owns cached wrappers for
  queries and templates:
  `listListingQueriesCached`, `getCachedListingQueries`,
  `listListingTemplatesCached`, `getCachedListingTemplates`, plus mutation
  cache-bus broadcasts.
- `core/admin/utils/adminPrefetch.ts` already prefetches both queries and
  templates for `/coderso/listings`, so this task should preserve that shared
  warmup rather than invent a Listings-only prefetch path.
- `core/server/routes/listingsRoutes.ts` already centralizes
  `mapListingError`, but the route tests mostly prove registration. Any
  UI-visible error copy added for list actions should be backed by stable route
  mapping coverage for known query/template domain errors.

### Listings Contract Constraints

- Current admin API:
  - `GET /listings/queries`
  - `GET /listings/queries/:id`
  - `POST /listings/queries`
  - `PATCH /listings/queries/:id`
  - `DELETE /listings/queries/:id`
  - `POST /listings/queries/preview`
  - `GET /listings/templates`
  - `GET /listings/templates/:id`
  - `POST /listings/templates`
  - `PATCH /listings/templates/:id`
  - `DELETE /listings/templates/:id`
- Listing queries are declarative query presets with source
  `entries | posts | users | taxonomies`, strict filter/sort/pagination caps,
  and a separate editor route at `/admin/coderso/listings/:id`.
- Listing templates are reusable output contracts with `layout`, field
  bindings, item actions, empty-state config, and style config. They are edited
  in the current list tab flow, not through a dedicated route today.
- There are no Listing lifecycle statuses. Do not add publish/archive actions
  only for Pages parity. The only shared bulk action currently justified for
  both tabs is confirmed delete unless another task adds a domain operation.
- Runtime widgets and public listing rendering are consumers of the query and
  template contracts. This task must not add a public write endpoint or weaken
  `includeDrafts=false` runtime behavior outside preview.

### Review Notes (2026-04-26)

- The family is intentionally scoped as a reuse-first list parity wave:
  `PageListPage`, `PageTable`, `PageFilters`, `PageBulkActionsBar`,
  `useListPagination`, `ListPaginationFooter`, `ConfirmActionDialog`, and
  `createListActionToastAdapter` remain the reference seams.
- Listings-specific code should extend the existing contracts in
  `ListingListPage`, `ListingQueryTable`, `ListingTemplateManager`,
  `useListingQueries`, `useListingTemplates`, `listingsClient`,
  `listingsRoutes`, and `listingSchemas`; do not introduce a new admin route
  family, a new template editor route, or a Listings-only list framework.
- Hook/API changes must account for all current consumers. In particular,
  `useListingTemplates` is used by both `ListingTemplateManager` and
  `ListingEditorPage`; any refresh signature change must be compatible with
  those callers or update and test them in the same leaf.
- The final tabbed list shell should own query and template list data. During
  the refactor `ListingTemplateManager` can remain a migration consumer of
  `useListingTemplates`, but the target state is that `ListingListPage` or a
  shell-called hook passes template rows, loading/error state, selection, and
  row-action callbacks into the template tab. `ListingEditorPage` remains the
  separate editor consumer of `useListingTemplates`.
- Existing `listingsClient` helpers already own CSRF, cached wrappers, local
  cache priming, and cache-bus broadcasts for query/template mutations. Bulk
  delete should compose those helpers with `Promise.allSettled`; do not add a
  batch endpoint only for UI parity.
- Admin navigation must keep using the shared SPA/canonical helpers:
  `useAdminRouter().navigate` for imperative flows, `AdminLink` with `prefetch`
  for row links, and the existing `prefetchAdminRoute` entry for
  `/coderso/listings`. Do not add raw anchors, `window.location` redirects, or
  route-matching aliases outside `adminPaths`.
- Cache hook changes should follow the current shared list pattern exactly:
  `resolveListMountRefreshOptions(hasInitialCache)` for mount and
  `resolveCacheRefreshBackground(...)` for later refresh calls. If the hooks
  accept the newer options object, keep the current boolean force call style
  compatible until all callers are migrated and tested.
- Route error work must distinguish query builder `ApiError` validation
  failures, which pass through unchanged, from raw non-`ApiError` sentinels.
  The raw `listing_query_invalid` insertion failure from
  `listingQueriesService.createListingQuery` should be mapped explicitly if it
  becomes UI-visible through list/editor save feedback.
- Empty query update payloads are currently rejected by the route/schema
  boundary before the query normalizer can emit its internal
  `listing_query_update_empty` sentinel. TASK-214 should preserve that current
  public behavior (`validation_error` or the existing wrapped query invalid
  code, depending on the exercised layer) unless the implementer deliberately
  changes the API contract and updates `_docs/CMS_API.md` plus route tests in
  the same leaf.

### Source Report Coverage

- `_docs/PLAYWRIGHT/SUMMARY-LISTINGS.md` is the source QA report for this
  family. TASK-214 covers the list-first findings only: query delete
  confirmation/toast from BUG-2, query/template save toasts from BUG-4, and
  list search/filter/pagination/selection gaps from UX-1.
- Findings that require editor redesign, query-builder field pickers, rendered
  preview, duplicate/copy/view-usages actions, data cleanup, beta messaging, or
  template-binding education remain explicit follow-up work unless a separate
  task adds those contracts. Do not silently close BUG-1, BUG-3, BUG-5, BUG-6,
  UX-2, UX-3, UX-4, UX-5, UX-6, UX-7, or UX-8 as part of TASK-214.
- When TASK-214 closes, update the source report or manual QA notes with the
  exact covered/deferred split so the Listings report does not imply that all
  2026-04-22 findings were fixed by the list parity wave.

## Required Product Behavior

1. `/admin/coderso/listings` visually matches Pages list density and behavior:
   `AdminShell`, `PageHeader`, centered `max-w-6xl`, compact `New`, filters,
   table card treatment, shared pagination, inline bulk controls, token-backed
   confirmations, and shared action toasts.
2. Tabs remain first-class:
   - `Queries` renders query filters, query table, query pagination, query
     selection, and query bulk actions.
   - `Templates` renders template filters, template table, template pagination,
     template selection, and template bulk actions.
3. The header `New` button is active-tab scoped:
   - `Queries`: navigate to `/coderso/listings/new`;
   - `Templates`: open the template create dialog/drawer in the templates tab.
4. Selection is tab-local. Switching tabs clears or preserves only that tab's
   own selection; hidden rows from the inactive tab must never be submitted to
   bulk execution.
5. Bulk actions are tab-local and resource-specific. For this task, both tabs
   support confirmed bulk delete only unless a later domain task adds more
   Listing operations.
6. Row actions stay resource-specific:
   - Queries: Edit and Delete.
   - Templates: Edit and Delete.
   Do not add Preview, Duplicate, Publish, Archive, or runtime widget actions in
   this parity task.
7. All destructive row and bulk deletes use `ConfirmActionDialog` and emit
   success/error feedback only after confirmed mutations settle.
8. Create, save/update, row delete, and bulk delete feedback uses shared action
   toast helpers with `listing query` / `listing queries` and
   `listing template` / `listing templates` labels.
   The query/template toast adapters have one owner module,
   `core/admin/ui/listings/listingActionToasts.ts`, so the list shell, template
   manager, and query editor do not duplicate resource copy.
9. Cache behavior follows the shared admin cache contract:
   cache hydrate first, background revalidate when cache exists, foreground load
   when cache is absent, cache-bus refresh after mutations, and prefetch warmup
   remains cached-list-only.
10. Existing editor, query preview, template binding editor, runtime widgets,
    assistant action mappings, and public runtime contracts remain backward
    compatible.

## State Ownership Contract

- `ListingListPage` is the tab-level orchestration owner. It owns `activeTab`,
  active resource metadata for `PageHeader.actions`, selected query ids,
  selected template ids, active bulk action values, pending row delete ids,
  pending bulk delete id lists, inline action feedback, and the active-tab
  `New` handler.
- Query and template table/filter components are controlled/presentational
  boundaries. They receive visible rows, selected ids, checkbox state, and row
  action callbacks from the list shell or from a shell-owned hook.
- `ListingTemplateManager` must not remain an independent card-level list owner.
  It may keep template form draft state, `BindingEditor` cloned config, save
  progress, and field-level dialog errors while the template dialog is open, but
  create/edit open state and row/bulk delete requests must be controlled by
  `ListingListPage`.
- The template create/edit dialog can stay in `ListingTemplateManager` only as a
  controlled child API, for example `createOpen`, `editingTemplateId`,
  `onCreateOpenChange`, `onEditingTemplateIdChange`, `onRequestDelete`, and
  `onSaved`.
- Do not use imperative refs or duplicated local `New template` state to bridge
  the header into the templates tab. Header `New`, row Edit, row Delete, and
  bulk Delete must all pass through the same active-tab resource state.

## Sub-Tasks

- [x] TASK-214-01: Listings Route, Tab Shell, and Cache Hydration
- [x] TASK-214-02: Listings Queries Tab Table, Filters, and Pagination
- [x] TASK-214-03: Listings Templates Tab Table, Filters, and Pagination
- [x] TASK-214-04: Tab-Scoped Actions, Confirmations, and Toasts
- [x] TASK-214-05: QA, Docs, Changelog, and Closure

## Leaf Breakdown

- [x] TASK-214-01-01: Query and Template Cache Hydration
- [x] TASK-214-01-02: Tab State, Header New Action, and Prefetch
- [x] TASK-214-02-01: Query Filter Model and View Component
- [x] TASK-214-02-02: Query Table Selection, Source, and Updated Columns
- [x] TASK-214-02-03: Query Pagination and Visible Selection
- [x] TASK-214-03-01: Template Filter Model and View Component
- [x] TASK-214-03-02: Template Table Selection, Layout, and Binding Summary
- [x] TASK-214-03-03: Template Pagination and Visible Selection
- [x] TASK-214-04-01: Active Tab New Flow and Query Save Toasts
- [x] TASK-214-04-02: Query Row and Bulk Delete Confirmations
- [x] TASK-214-04-03: Template Create, Edit, and Delete Confirmations
- [x] TASK-214-04-04: Listings Error Mapping and Toast Adapter
- [x] TASK-214-05-01: Listings Parity Test Matrix
- [x] TASK-214-05-02: Docs, Changelog, and Board Closure

## Non-Goals

- No replacement of the Listings query builder/editor.
- No dedicated template editor route unless a later task adds that product
  contract.
- No public Listings write endpoints.
- No publish/archive/lifecycle status for listing queries or templates.
- No duplicate action until the domain/service/API contract exists.
- No server-side pagination for the list tabs.
- No new table framework or Listings-only pagination system.
- No changes to runtime widget rendering except regression tests proving it
  stays compatible.
- No assistant action redesign.

## Security Contract

- Visibility: internal admin UI and existing internal Listings admin API only.
- Auth model: authenticated admin session / admin API key where supported.
- RBAC: `content:read` for list/detail/preview reads, `content:write` for
  create/update/delete mutations.
- CSRF: all create/update/delete/preview writes continue through
  `listingsClient` helpers with `withCsrf: true` where they do today.
- Rate-limit buckets: existing `admin_read` for list/detail reads and
  `admin_write` for create/update/delete/preview writes.
- Reject-unknown validation: query/template payloads must keep
  `listingSchemas.ts` as the route schema owner with `additionalProperties:
  false`; UI code must not submit fields outside the documented query/template
  contracts.
- Anti-abuse: no public write path; destructive row/bulk delete requires
  explicit token-backed confirmation and operates only on visible selected rows
  from the active tab.

## Implementation Order

1. Repair cache hydration and tab shell ownership first.
2. Build query tab filters/table/pagination/selection.
3. Build template tab filters/table/pagination/selection.
4. Create the shared Listings toast adapters and export the route error mapper
   needed for direct mapping coverage.
5. Wire tab-scoped new/create/edit/delete/bulk flows with confirmations and
   toasts.
6. Tighten route error mapping and test coverage where UI-visible errors depend
   on stable API codes.
7. Update docs, changelog, source reports if any, and task board on closure.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listing-list-page-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listings-page.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-action-toasts.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-pagination.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/cacheRefresh.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/listingsClient.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPrefetch.test.ts`
- Add focused component suites if the current mocked list tests cannot prove
  the real query table, template table, active-tab header `New`, or dialog
  behavior.
- Extend `tests/vitest/admin/listingsClient.test.ts` when mutation/client
  wrappers change so it proves `withCsrf: true`, cache priming, and cache-bus
  invalidation for query and template mutations instead of relying on the
  current public-search smoke coverage.
- Bun route coverage when route/error mapping changes:
  - `set -a && source .env && set +a`
  - `bun test tests/integration/routes/listings.test.ts`
- If `listingSchemas.ts` changes, keep strict schema coverage in the Bun lane:
  - `bun test tests/unit/content/listingSchemas.test.ts`
- If runtime widget compatibility is touched or suspected, run the relevant
  listing widget/runtime suites:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/listingFilters.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/search/listingRuntimeService.test.ts`
  - `bun test tests/unit/content/listingRuntimeResolver.test.ts`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/PLAYWRIGHT/SUMMARY-LISTINGS.md` or linked manual QA notes when source
  report status is updated.
- `_docs/CMS_API.md` if route errors or request/response examples change.
- `_docs/ARCHITECTURE.md` if the Listings admin contract changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. `/admin/coderso/listings` visually follows the Pages list pattern without
   removing the `Queries` and `Templates` tabs.
2. `New`, selection, bulk actions, confirmations, errors, and toasts are
   active-tab scoped.
3. Both tabs use shared pagination and visible-scope selection.
4. Query and template actions use resource-specific copy and shared action
   toast helpers.
5. No inactive-tab row can be mutated through bulk actions.
6. Existing Listings editor, template binding, cache, prefetch, API, runtime
   widget, and assistant contracts remain backward compatible.
