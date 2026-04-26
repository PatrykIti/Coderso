# TASK-216: Coderso Commerce Catalog List Parity With Pages
# FileName: TASK-216_Coderso_Commerce_Catalog_List_Parity_With_Pages.md

**Priority:** High
**Category:** Coderso Commerce + Admin/UI + UX + Admin Cache
**Estimated Effort:** Very Large
**Dependencies:** TASK-054-11, TASK-205, TASK-206, TASK-208
**Reference Tasks:** TASK-210 and TASK-214 are implementation references for
Pages-style list parity with target-resource contracts.
**Status:** To Do

---

## Overview

Normalize `/admin/coderso/commerce` to the same first-screen admin list
contract as the current `/admin/pages` implementation while preserving the
Commerce v1 product-catalog contract.

This is a Commerce catalog parity task, not a Commerce editor redesign. The
screen remains product-first: `New` opens the existing product editor route,
row links open the product editor, product lifecycle changes use the existing
product update API, and collections are reused as list filter/enrichment data.
Do not create a second list framework, a public Commerce write endpoint, or a
new collection-management IA in this task.

The implementation should reuse the shared list primitives already used by
Pages and recent parity waves: `PageHeader`, checkbox table patterns,
`useListPagination`, `ListPaginationFooter`, `ConfirmActionDialog`,
`createListActionToastAdapter`, `resolveListMountRefreshOptions`,
`resolveCacheRefreshBackground`, `AdminLink`, `useAdminRouter().navigate`, and
the existing `/coderso/commerce` prefetch entry.

## Current Repo Findings

### Pages Reference Implementation

- `core/admin/ui/pages/PageListPage.tsx` owns the reference behavior: cache
  hydration, background refresh, filters, visible-row selection, inline bulk
  action bar, shared pagination, confirmed deletes, and shared list action
  toasts.
- `core/admin/ui/pages/PageTable.tsx`, `PageFilters.tsx`,
  `PageBulkActionsBar.tsx`, `PageRowActions.tsx`,
  `core/admin/ui/shared/ListPaginationFooter.tsx`,
  `core/admin/ui/shared/ConfirmActionDialog.tsx`, and
  `core/admin/ui/shared/listActionToasts.ts` are the concrete seams Commerce
  should reuse or mirror with Commerce-specific labels.

### Current Commerce Gaps

- `core/admin/ui/commerce/CommerceListPage.tsx` renders product search and
  status tabs, but it has no checkbox selection, shared pagination, inline bulk
  action controls, confirmed row delete, or shared toast adapter.
- `CommerceTable.tsx` has no select-all column, selected-row styling,
  collection enrichment, or lifecycle row actions beyond Edit/Delete.
- Row delete calls `deleteCommerceProduct` immediately from the dropdown. It
  bypasses `ConfirmActionDialog`, has no success toast, and only writes an
  inline error on failure.
- `useCommerceCatalog.ts` hydrates from local cache, but mount and cache-bus
  effects always call `refreshProducts(true)` / `refreshCollections(true)`.
  That creates a foreground forced refresh path instead of the shared
  cache-present/background and cache-missing/foreground policy.
- `commerceClient.ts` already owns cached product and collection wrappers,
  CSRF writes, local cache priming, detail cache updates, and cache-bus
  broadcasts for product/collection mutations.
- `adminPrefetch.ts` already warms `/coderso/commerce` with
  `listCommerceProductsCached({ force: false })` and
  `listCommerceCollectionsCached({ force: false })`. Preserve that shared
  warmup path.
- `commerceRoutes.ts` already exports `mapCommerceError`, but route tests only
  prove registration and a small mapper subset. List-visible lifecycle/delete
  errors need stable mapping coverage if UI copy depends on them.
- `commerceSchemas.ts` already rejects unknown product, collection, query,
  money, stock, and variant payload fields. List work must keep those schemas
  as the route-boundary owner and must not duplicate schema logic in UI.

### Commerce Contract Constraints

- Current admin API:
  - `GET /commerce/products`
  - `GET /commerce/products/:id`
  - `POST /commerce/products`
  - `PATCH /commerce/products/:id`
  - `DELETE /commerce/products/:id`
  - `PUT /commerce/products/:id/collections`
  - `POST /commerce/products/query`
  - `GET /commerce/collections`
  - `GET /commerce/collections/:id`
  - `POST /commerce/collections`
  - `PATCH /commerce/collections/:id`
  - `DELETE /commerce/collections/:id`
- Products have lifecycle status `draft | published | archived`. Commerce list
  actions may update status through `updateCommerceProduct(id, { status })`.
  Do not add a new status endpoint only for UI parity.
- Products carry pricing, stock, collection ids, media ids, variants,
  metadata, and data. The list should surface product-safe summary fields only:
  title, slug, status, price, stock, collections, updated date, and row actions.
- Collections are available through the existing cached client and are suitable
  for list filter/enrichment. This task does not add a dedicated collection
  manager route or nested collections tab.
- Runtime widgets and public rendering consume published Commerce data. TASK-216
  must not weaken runtime filtering, add public Commerce write endpoints, or
  expose checkout/cart adapter details in browser cache.

### Source Report Coverage

- `_docs/PLAYWRIGHT/SUMMARY-COMMERCE.md` is the source QA report for this
  family.
- TASK-216 covers list-screen findings only:
  - BUG-2: product delete needs confirmation and success/error feedback.
  - The list-owned subset of BUG-6: richer row lifecycle actions, checkbox
    selection, bulk actions, and confirmed bulk delete.
  - List parity gaps not explicitly named in the report: shared pagination,
    visible-row selection trimming, cache-present background refresh, shared
    toasts, and route-error mapping proof for list actions.
- TASK-216 does not close editor-only findings:
  BUG-1, BUG-3, BUG-4, BUG-5, BUG-7, UX-1, UX-2, UX-3, UX-4, UX-5, UX-6,
  UX-7, UX-8. Those remain separate editor/product-model follow-ups unless a
  later task adds them.

## Required Product Behavior

1. `/admin/coderso/commerce` visually follows the Pages list density and
   behavior: `AdminShell`, `PageHeader`, centered `max-w-6xl`, compact `New`,
   filter strip, table card treatment, shared pagination, inline bulk controls,
   token-backed confirmations, and shared action toasts.
2. Header `New` remains Commerce-specific and opens the existing product editor
   route: `/coderso/commerce/new`. Do not replace the product editor with a
   list drawer in this task.
3. Filters are Commerce-specific:
   - search by title, slug, and excerpt;
   - status `all | published | draft | archived`;
   - collection, using cached `commerce:collections:list`;
   - stock state `all | in_stock | out_of_stock | backorder`.
4. Filter changes reset pagination and trim selection to visible rows.
5. Product table includes checkbox selection, selected-row styling, product
   title/slug, status, price, stock, collections, updated date, and row actions.
6. Row actions are resource-specific:
   - Edit;
   - Publish when status is not `published`;
   - Move to draft when status is `published` or `archived`;
   - Archive when status is not `archived`;
   - Delete.
7. Destructive row and bulk delete require `ConfirmActionDialog` and run only
   after explicit confirmation.
8. Bulk actions operate only on visible selected product ids:
   publish, move to draft, archive, and confirmed delete.
9. Bulk mutations use existing product client helpers with `Promise.allSettled`
   style summaries. Failed rows remain recoverable and failures are surfaced in
   both inline state and shared toasts.
10. All create/list-lifecycle/delete feedback uses one Commerce list toast
    adapter owner, for example `core/admin/ui/commerce/commerceActionToasts.ts`,
    built on `createListActionToastAdapter`.
11. Cache behavior follows the shared admin list policy: hydrate cache
    immediately, background revalidate when cache exists, foreground load when
    cache is absent, refresh on product/collection cache-bus events, and keep
    the prefetch route cached-list-only.
12. Existing product editor, collection assignment panel, commerce widgets,
    commerce query endpoint, checkout adapter contract, assistant catalog
    entries, and public runtime behavior remain backward compatible.

## State Ownership Contract

- `CommerceListPage` is the list orchestration owner. It owns search, status,
  collection and stock filters, selected product ids, active bulk action,
  pending row delete id, pending bulk delete ids, inline feedback, and header
  `New` navigation.
- `useCommerceCatalog` owns product and collection cache hydration/refresh
  semantics. It should expose compatible refresh APIs for current editor/list
  consumers.
- `CommerceTable`, filter components, bulk action components, and row-action
  components are controlled/presentational boundaries. They receive visible
  rows, selected ids, checkbox state, and callbacks from the shell or a
  shell-owned hook.
- Product lifecycle actions use `updateCommerceProduct`; delete uses
  `deleteCommerceProduct`. Do not add batch endpoints or duplicate cache
  mutation code inside the table.
- Collection names are view-model enrichment derived from cached collections.
  Missing collection ids should render a bounded fallback such as
  `Missing collection` without mutating product records.

## Sub-Tasks

- [ ] TASK-216-01: Commerce Catalog Route Shell and Cache Hydration
- [ ] TASK-216-02: Commerce Filters, Table, Selection, and Pagination
- [ ] TASK-216-03: Commerce Row Lifecycle Actions and Confirmations
- [ ] TASK-216-04: Commerce Bulk Actions, Toasts, and Error Mapping
- [ ] TASK-216-05: QA, Docs, Changelog, and Closure

## Leaf Breakdown

- [ ] TASK-216-01-01: Product and Collection Cache Hydration
- [ ] TASK-216-01-02: Commerce Shell, Header New, and Prefetch Contract
- [ ] TASK-216-02-01: Commerce Filter Model and Collection Enrichment
- [ ] TASK-216-02-02: Product Table Selection and Commerce Columns
- [ ] TASK-216-02-03: Shared Pagination and Visible Selection
- [ ] TASK-216-03-01: Product Row Lifecycle Menu Contract
- [ ] TASK-216-03-02: Product Delete Confirmation Contract
- [ ] TASK-216-04-01: Product Bulk Action Bar and Visible Selection
- [ ] TASK-216-04-02: Bulk Mutation Execution and Partial Failures
- [ ] TASK-216-04-03: Commerce List Toast Adapter and Route Error Mapping
- [ ] TASK-216-05-01: Commerce Parity Test Matrix
- [ ] TASK-216-05-02: Commerce Docs, Changelog, and Board Closure

## Non-Goals

- No Commerce editor create/update mode repair. BUG-1 remains a separate
  editor task unless explicitly pulled in later.
- No pricing input redesign, currency dropdown, SKU/tax/variants expansion,
  media picker integration, or collection-management route.
- No product duplicate, storefront preview, copy ID, or checkout/cart action.
- No public Commerce write endpoint.
- No server-side pagination for the admin list pass.
- No new batch mutation endpoint only for UI parity.
- No changes to public Commerce widget runtime behavior except regression proof
  that existing behavior remains compatible.
- No new admin route aliases or raw `window.location` navigation.

## Security Contract

- Visibility: internal admin UI and existing internal Commerce admin API only.
- Auth model: authenticated admin session / admin API key where supported by
  existing admin transport.
- RBAC: `commerce:read` for products/collections reads and
  `commerce:write` for product create/update/delete and collection writes.
- CSRF: all product lifecycle and delete writes continue through
  `commerceClient` helpers with `withCsrf: true`.
- Rate-limit buckets: existing `admin_read` for product/collection reads and
  query preview, existing `admin_write` for product/collection mutations.
- Reject-unknown validation: route schemas in `commerceSchemas.ts` remain the
  owner. UI code must not send fields outside the documented Commerce product,
  collection, and query contracts.
- Anti-abuse: no public write path; destructive row/bulk delete requires
  explicit token-backed confirmation; bulk operations operate only on visible
  selected product ids; error/toast copy must not expose stack traces, raw
  payloads, secrets, preview tokens, or privileged adapter data.

## Implementation Order

1. Repair `useCommerceCatalog` cache hydration/background refresh semantics.
2. Normalize shell/header `New`, max width, cache/preload ownership, and
   product/collection prefetch compatibility.
3. Build the Commerce filter model and collection-enriched product view model.
4. Upgrade `CommerceTable` to controlled checkbox selection and Commerce
   summary columns.
5. Add shared pagination and visible-row selection trimming.
6. Introduce the base Commerce list toast adapter, then wire row lifecycle
   actions and confirmed row delete through shell-owned handlers.
7. Wire bulk actions with confirmed bulk delete, partial-failure summaries,
   shared toast extensions, and cache refresh.
8. Tighten route mapper/test coverage only where UI-visible errors depend on
   stable API codes.
9. Update product docs, admin cache docs, source report, changelog, task files,
   and board on closure.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx`
  - Add or extend `tests/vitest/ui/commerce-list-page-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-action-toasts.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-pagination.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/cacheRefresh.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/commerceClient.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/adminPaths.test.ts`
- Bun route/contract coverage when route mapping or schemas change:
  - `set -a && source .env && set +a`
  - `bun test tests/integration/routes/commerceRoutes.test.ts`
  - `bun test tests/unit/commerce/commerceService.test.ts tests/unit/commerce/commerceQueryService.test.ts` if service/query behavior changes.
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/validation/commerceSchemas.test.ts` if validation schemas change.
- Runtime compatibility smoke if product status/query behavior changes:
  - `bun test tests/unit/commerce/commerceRuntimeResolver.test.ts tests/unit/commerce/commerceWidgetRuntime.test.ts`
  - focused Commerce widget Vitest suites for any touched widget editor/renderer.
- Manual or Playwright smoke before closure:
  - cache-present list mount keeps rows visible during background refresh;
  - filters reset pagination and trim selection;
  - row publish/draft/archive/delete works with toasts;
  - row delete and bulk delete require confirmation;
  - partial bulk failures keep failed products recoverable.

## Documentation Updates Required

- `docs/coderso/commerce-catalog.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CMS_API.md` if route errors, schemas, or endpoint examples change.
- `_docs/ARCHITECTURE.md` if the Commerce admin contract changes.
- `_docs/PLAYWRIGHT/SUMMARY-COMMERCE.md` or linked manual QA notes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Commerce catalog follows the Pages list pattern without replacing the
   product editor or widening Commerce IA.
2. Header `New`, filters, table, selection, pagination, row actions, bulk
   actions, confirmations, toasts, and inline errors are product-catalog scoped.
3. Collections enrich/filter products through the existing cached collection
   client.
4. All destructive actions require confirmation and operate only on visible
   selected rows.
5. Shared cache hydrate/background refresh and prefetch semantics are proven.
6. Existing Commerce editor, collections panel, API, schemas, widgets, assistant
   catalog, and public runtime contracts remain backward compatible.
