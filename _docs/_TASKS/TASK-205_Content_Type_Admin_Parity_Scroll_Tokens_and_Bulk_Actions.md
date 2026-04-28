# TASK-205: Admin List Pagination, Popup Tokens, and Content Type Parity
# FileName: TASK-205_Content_Type_Admin_Parity_Scroll_Tokens_and_Bulk_Actions.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI + UX
**Estimated Effort:** Very Large
**Dependencies:** TASK-202, TASK-198, TASK-199, TASK-200
**Status:** Done (2026-04-24)

---

## Overview

Follow-up fixes for the Content Types admin surface after the Engine QA recovery
and for the shared first-screen list contract used by Content Types, Pages,
Posts, and Menus. The content type editor and list are functionally stronger
after `TASK-202`, but the surface still misses list parity and has one layout
defect:

- the JSON schema preview in the right editor panel cannot be scrolled
  comfortably when a content type has many fields,
- content type confirmation dialogs and action popups need an explicit token
  compliance audit so Admin UI Theme template changes affect their appearance,
- the Content Types list has no footer with filtered count and `Previous` /
  `Next` controls like Pages, Posts, and Menus,
- the Content Types list has no controlled multi-select state or bulk actions.

The existing Pages, Posts, and Menus list footers also need to be completed:
`Previous` / `Next` controls must become real client-side pagination controls
with a default page size of 10 and an explicit page-size selector. Their row and
bulk delete confirmations, plus adjacent create/history popups in those list
families, must be token-backed so Admin UI Theme templates affect their visual
treatment.

The pagination/page-size work should be implemented through one shared admin
list pagination contract, not four local copies of the same state math. Resource
screens may keep their own filtering, sorting, selection, and resource copy, but
page-size options, page clamping, visible-row slicing, footer controls, and
`Previous` / `Next` behavior should come from shared code unless a concrete
resource-specific blocker is documented before implementation.

This task keeps the existing API and admin route models. It should extend the
current `ContentTypeList`, `ContentTypeTable`, `ContentTypeEditor`,
`PageListPage`, `PostsListPage`, and `MenuListPage` seams instead of introducing
parallel managers or second editor flows.

## Contract Repair Rules

- Repair existing contracts in place. Do not introduce a second list manager,
  duplicate pagination implementation, resource-specific table fork, or new bulk
  endpoint when the current list/client/service contract can be extended.
- `core/admin/ui/shared/useListPagination.ts` owns pagination state, page-size
  normalization, clamping, range metadata, and visible-row slicing for all
  targeted admin lists.
- `core/admin/ui/shared/ListPaginationFooter.tsx` owns the shared footer UI and
  token-backed `Previous` / `Next` controls. Resource screens pass labels and
  loading/empty context only.
- `ContentTypeList`, `PageListPage`, `PostsListPage`, and `MenuListPage` own
  resource filtering, sorting, selection copy, and action orchestration. They
  must pass filtered/sorted rows into the shared pagination contract instead of
  owning duplicate page math.
- `ContentTypeTable`, `PageTable`, `PostsTable`, and the Menus internal table
  stay presentation adapters. They receive visible rows and controlled selection
  props; they do not fetch, paginate, or mutate data.
- `contentTypesClient`, existing Pages/Posts/Menus clients, and existing route
  guards remain the write/cache/security owners. Add tiny semantic wrappers only
  when they improve readability without changing route semantics.
- If ownership is unclear during implementation, update this task family first
  with the real owner and dependency rather than inventing a parallel code path.

## Sub-Tasks

- [x] TASK-205-01: Content Type JSON Preview Scroll Containment
- [x] TASK-205-02: Admin Popup Token Compliance for Content Types, Pages, Posts, and Menus
- [x] TASK-205-03: Shared Admin List Pagination Contract
  - [x] TASK-205-03-01: Shared Pagination Hook and Footer
  - [x] TASK-205-03-02: Admin List Resource Adapters
  - [x] TASK-205-03-03: Pagination Regression Matrix and Docs
- [x] TASK-205-04: Content Type List Selection and Bulk Actions
- [x] TASK-205-05: QA, Docs, and Closure

## Scope

1. Fix editor-side scroll containment:
   - right preview panel remains visible on desktop,
   - JSON schema area scrolls vertically when the schema is long,
   - long JSON lines do not break the page or hide the footer metadata,
   - mobile sheet preview keeps the same behavior.
2. Make Content Types, Pages, Posts, and Menus popups token-compliant:
   - treat popup token compliance as a visual Admin UI Theme contract, not as an
     API/security change,
   - use shared `Dialog`, `Sheet`, `Alert`, `Button`, and `toast` surfaces,
   - ensure popup backgrounds, foreground text, borders, overlays, focus rings,
     destructive/warning states, and validation/error copy are driven by the
     active Admin UI Theme tokens,
   - remove hard-coded rose/amber background and border classes from content
     type and menu-item confirmation callouts,
   - replace native `window.confirm()` row/bulk/revision confirmations in
     Pages, Posts, and Menus with shared Admin UI dialog patterns,
   - audit create drawers/dialogs, delete dialogs, menu-item delete dialogs,
     revision restore/discard confirmations, and destructive dropdown affordances
     for token-backed classes,
   - use Admin UI token-backed classes or shared component variants mapped in
     `core/admin/styles/globals.css`,
   - preserve accessible titles, descriptions, focus handling, and destructive
     affordances.
3. Complete list footer, page-size, and pagination behavior:
   - apply to Content Types, Pages, Posts, and Menus list screens,
   - create the shared admin list pagination helper/component pair in
     `TASK-205-03-01`,
   - consume it from all four list screens through resource adapters in
     `TASK-205-03-02`,
   - prove pagination regression behavior and docs in `TASK-205-03-03`,
   - default to 10 rows per page,
   - let users choose `10`, `20`, `30`, `50`, `100`, `150`, `200`, or `500`
     rows per page,
   - show `Showing X-Y of Z <resource>` or equivalent truthful filtered count,
   - keep search, status filter, resource-specific filters, and sort applied
     before pagination,
   - reset or clamp the page index when filters, sort, or page size change,
   - disable `Previous` on the first page and `Next` on the last page.
4. Add controlled multi-select and bulk actions:
   - implement after `TASK-205-02`, `TASK-205-03-01`, and `TASK-205-03-02` so
     bulk delete uses the shared token-backed dialog contract and the shared
     pagination visible-row contract,
   - header checkbox selects only the currently visible paginated rows,
   - row checkboxes reflect controlled `selectedIds`,
   - selected-row controls render inline in `PageHeader.actions` to the left of
     `New`,
   - bulk actions support `Publish`, `Move to Draft`, and `Delete`,
   - delete requires the shared app dialog/confirmation pattern,
   - partial failures are surfaced without clearing truthful error state,
   - cache refresh and `cacheBus` behavior stay aligned with the current
     `contentTypesClient` contract.

## Non-Goals

- No new public endpoints.
- No new public content type runtime behavior.
- No new content type states beyond `draft` and `published`.
- No table-specific design system fork for Content Types.
- Do not replace the current canonical `/admin/coderso/engine` route model or
  the existing `/admin/content-types` alias handled by shared admin path
  helpers.
- No server-side pagination API in this task; lists keep the current full-list
  read contract and paginate client-side after filtering/sorting.

## Completion Notes

- Completed shared client-side pagination through
  `core/admin/ui/shared/useListPagination.ts` and
  `core/admin/ui/shared/ListPaginationFooter.tsx`.
- Content Types, Pages, Posts, and Menus now pass filtered/sorted rows into the
  shared pagination contract and tables receive only visible rows.
- Popup compliance was repaired through shared Admin UI primitives, including
  `ConfirmActionDialog` and token-backed `Alert` variants, without adding
  resource-specific popup style systems.
- Content Types bulk actions reuse existing `updateContentType` and
  `deleteContentType` client/write contracts; no new bulk endpoint or route
  behavior was introduced.

## Files to Change

- `core/admin/ui/content-types/ContentTypeEditor.tsx`
  - fix right-panel/mobile-preview scroll ownership,
  - keep action dialogs token-compliant.
- `core/admin/ui/content-types/ContentTypePreviewPanel.tsx`
  - ensure JSON preview is a bounded scroll region with stable dimensions.
- `core/admin/ui/layouts/EditorShell.tsx`
  - adjust only if the shared shell is the true scroll owner; avoid regressions
    in Pages/Posts/Custom Screens editor shells.
- `core/admin/ui/content-types/ContentTypeList.tsx`
  - own selected IDs, visible IDs derived from pagination, bulk action state, and
    shared footer wiring,
  - keep search/status/sort as the source of filtered truth.
- `core/admin/ui/content-types/ContentTypeTable.tsx`
  - accept controlled selection props,
  - render header and row checkboxes,
  - preserve sort and row action behavior.
- `core/admin/ui/content-types/ContentTypeCreateDrawer.tsx`
  - audit sheet token usage and keep duplicate validation feedback tokenized.
- `core/admin/services/contentTypesClient.ts`
  - reuse `updateContentType(id, { status })` and `deleteContentType(id)` for
    bulk actions unless a concrete limitation requires a small wrapper.
- `core/admin/ui/shared/useListPagination.ts`
  - create the shared page-size, clamp/reset, visible-row slicing, and range
    metadata contract for client-side admin lists.
- `core/admin/ui/shared/ListPaginationFooter.tsx`
  - create the shared token-backed footer with count copy, page-size selector,
    and `Previous` / `Next` controls.
- `core/admin/ui/pages/PageListPage.tsx`
  - replace native row/bulk delete confirms with token-backed dialog state,
  - consume the shared list pagination hook/footer instead of owning duplicate
    pagination math.
- `core/admin/ui/pages/PageTable.tsx`
  - receive only paginated rows and keep controlled selection scoped to the
    visible page.
- `core/admin/ui/pages/PageCreateDrawer.tsx`
  - audit token-backed sheet and error surfaces.
- `core/admin/ui/pages/PageRevisionDrawer.tsx`
  - replace restore/discard native confirmations with token-backed dialog
    surfaces.
- `core/admin/ui/posts/PostsListPage.tsx`
  - replace native row/bulk delete confirms with token-backed dialog state,
  - consume the shared list pagination hook/footer instead of owning duplicate
    pagination math.
- `core/admin/ui/posts/PostsTable.tsx`
  - receive only paginated rows and keep controlled selection scoped to the
    visible page.
- `core/admin/ui/posts/PostsCreateDrawer.tsx`
  - audit token-backed sheet and error surfaces.
- `core/admin/ui/posts/editor/PostRevisionDrawer.tsx`
  - replace restore native confirmation with a token-backed dialog surface.
- `core/admin/ui/menus/MenuListPage.tsx`
  - replace native row/bulk delete confirms with token-backed dialog state,
  - consume the shared list pagination hook/footer instead of owning duplicate
    pagination math.
- `core/admin/ui/menus/MenuCreateDialog.tsx`
  - audit token-backed dialog and error surfaces.
- `core/admin/ui/menus/MenuItemDrawer.tsx`
  - audit delete affordance and drawer styling for Admin UI Theme token
    dependency.
- `core/admin/ui/menus/MenuItemForm.tsx`
  - audit validation feedback inside the drawer for token-backed destructive
    styling.
- `core/admin/ui/menus/MenuItemDeleteDialog.tsx`
  - replace the current hard-coded destructive callout palette with a
    token-backed shared surface while preserving descendant-impact copy.
- `core/admin/ui/shared/*`
  - add confirmation helper(s) only if they remove real popup duplication
    without hiding resource-specific copy.
- `core/admin/components/ui/alert.tsx`
  - add a token-backed warning/destructive callout variant only if current
    shared variants are not enough.
- `core/admin/styles/globals.css`
  - update token mapping only if shared component variants require a missing
    Admin UI state variable.
- `tests/vitest/ui/content-type-editor.test.tsx`
  - cover preview scroll class/structure and token-compliant dialog callouts.
- `tests/vitest/ui/content-type-table.test.tsx`
  - cover controlled checkbox rendering, selected row state, and row actions.
- `tests/vitest/ui/content-type-list-parity.test.tsx`
  - create a focused Content Types list parity suite for footer, pagination,
    visible-scope selection, and bulk action coverage.
- `tests/vitest/ui/list-pagination.test.tsx`
  - create focused coverage for the shared admin pagination contract, including
    default page size, options, range metadata, clamping, and empty state.
- `tests/vitest/ui-integration/contentTypes.test.tsx`
  - keep the existing Content Types smoke assertions aligned if the list shell
    markup changes.
- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - update Pages/Posts pagination, page-size, and token-backed confirmation
    coverage.
- `tests/vitest/ui/page-list.test.tsx`, `tests/vitest/ui/posts-list.test.tsx`,
  and `tests/vitest/ui/menu-list-page.test.tsx`
  - update SSR/list shell assertions for page-size and truthful footer copy.
- `tests/vitest/ui/menu-list-page-actions.test.tsx`
  - update Menus pagination, page-size, and token-backed confirmation coverage.
- `tests/vitest/admin/contentTypesClient.test.ts`
  - cover any new client wrappers or cache/invalidation paths.
- `tests/integration/routes/contentTypes.test.ts`
  - update only if route behavior changes; existing PATCH/DELETE route coverage
    should remain sufficient if bulk uses existing per-item routes.
- `_docs/CONTENT_LIST_UX.md`
  - document shared list pagination/page-size behavior for Content Types,
    Pages, Posts, and Menus,
  - document Content Types visible-scope selection and bulk action behavior.
- `_docs/DESIGN_TOKENS.md`
  - update only if a new shared token/variant contract is added.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md`
  - update only if cache keys, TTLs, or invalidation semantics change.
- `_docs/_TASKS/README.md`
  - keep board status and statistics synchronized.
- `_docs/_CHANGELOG/*`
  - add on completion.

## Implementation Direction

Implement shared pagination as one generic contract, then adapt each list into
it. Derive resource-specific list state first, then pass the filtered/sorted
rows into the shared pagination contract:

```ts
const filteredRows = filterContentTypes(types, query, statusFilter);
const sortedRows = sortContentTypes(filteredRows, sortKey, sortDirection);
const pagination = useListPagination(sortedRows, {
  resetKey: JSON.stringify({ query, statusFilter, sortKey, sortDirection }),
});
const paginatedRows = pagination.visibleRows;
const visibleIds = paginatedRows.map((row) => row.id);
```

The shared contract should own the repeated math once:

```ts
const pageSizeOptions = [10, 20, 30, 50, 100, 150, 200, 500] as const;
const pageSize = selectedPageSize ?? 10;
const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
const clampedPage = Math.min(pageIndex, totalPages - 1);
const pageStart = clampedPage * pageSize;
const pageEnd = pageStart + pageSize;
const paginatedRows = sortedRows.slice(pageStart, pageEnd);
```

`ContentTypeList`, `PageListPage`, `PostsListPage`, and `MenuListPage` should
all render the same shared footer component, passing only resource-specific
labels and disabled/loading context:

```tsx
<ListPaginationFooter
  resourceLabel="pages"
  pagination={pagination}
/>
```

Selection must follow the visible row set exposed by the shared pagination
contract:

```ts
const isAllSelected =
  visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
const isIndeterminate = selectedIds.length > 0 && !isAllSelected;
```

Bulk lifecycle should reuse existing content type mutations:

```ts
const results = await Promise.allSettled(
  selectedIds.map((id) => {
    if (bulkAction === "publish") return updateContentType(id, { status: "published" });
    if (bulkAction === "unpublish") return updateContentType(id, { status: "draft" });
    return deleteContentType(id);
  })
);
```

Token compliance means no hard-coded destructive/warning palette like
`bg-rose-50`, `border-rose-200`, `text-rose-900`, `bg-amber-50`, or
`border-amber-200` inside the targeted popups. Popup appearance should come from
shared component variants or semantic classes mapped to Admin UI Theme tokens so
changes in the `Admin UI Theme` CMS section affect the popup surfaces together
with the rest of the admin panel.

## Security Contract

- Visibility: internal admin UI only.
- Auth model: unchanged; all writes use existing authenticated admin API routes.
- RBAC: unchanged; per-item `PATCH /content-types/:id`, `DELETE
  /content-types/:id`, and duplicate routes keep existing permission checks.
- CSRF: unchanged; `contentTypesClient` write calls must keep `withCsrf: true`.
- Rate-limit bucket: unchanged from the existing internal admin write bucket.
- Reject-unknown validation: unchanged; route schemas continue to reject
  unsupported status and payload fields.
- Anti-abuse: destructive bulk delete requires explicit confirmation and applies
  only to the controlled selected IDs; no public nonce/HMAC/captcha is needed.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-pagination.test.tsx tests/vitest/ui/content-type-editor.test.tsx tests/vitest/ui/content-type-table.test.tsx tests/vitest/ui/content-type-list-parity.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/page-list.test.tsx tests/vitest/ui/posts-list.test.tsx tests/vitest/ui/menu-list-page.test.tsx tests/vitest/ui/menu-list-page-actions.test.tsx tests/vitest/admin/contentTypesClient.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/page-revision-drawer.test.tsx tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx tests/vitest/ui/menu-item-delete-dialog.test.tsx` when popup/revision/menu-item confirmation behavior changes.
- `bun test tests/integration/routes/contentTypes.test.ts` only if API route
  behavior or validation changes.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/DESIGN_TOKENS.md` only if new shared token/variant semantics are added.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` only if cache semantics
  change.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-205-admin-list-popup-parity.md`

## Acceptance Criteria

1. A content type with many fields keeps the editor usable and the right JSON
   preview scrolls without trapping or hiding content.
2. Content type dialogs, sheets, dropdowns, toasts, and warning/destructive
   callouts use shared Admin UI token-backed surfaces.
3. Pages, Posts, Menus, and Content Types list popups and destructive
   confirmations use shared Admin UI token-backed surfaces.
4. Changing an Admin UI Theme template can visibly affect targeted popup
   backgrounds, foreground text, borders, overlays, focus, validation/error,
   warning, and destructive treatments.
5. Content Types, Pages, Posts, and Menus paginate list rows client-side after
   filtering/sorting, default to 10 rows, expose the required page-size options,
   and wire functional `Previous` / `Next` controls through one shared
   pagination contract.
6. Content Types support visible-scope row selection and inline header bulk
   actions.
7. Bulk publish, move-to-draft, and delete preserve cache consistency,
   confirmation, and partial-failure feedback.
