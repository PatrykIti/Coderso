# TASK-205-04: Content Type List Selection and Bulk Actions
# FileName: TASK-205-04_Content_Type_List_Selection_and_Bulk_Actions.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI + Admin API
**Estimated Effort:** Large
**Dependencies:** TASK-205, TASK-205-02, TASK-205-03-01, TASK-205-03-02, TASK-198, TASK-199, TASK-200
**Status:** Done (2026-04-24)

---

## Overview

Add visible-scope selection and inline bulk actions to the Content Types list so
it matches the corrected Pages/Posts/Menus list contract.

The current table has row actions for edit, duplicate, and delete, but there is
no way to select multiple content types or run bulk publish/draft/delete actions.
The implementation should follow the shared admin list pattern from Pages,
Posts, and Menus after `TASK-205-03-01` creates the shared pagination contract
and `TASK-205-03-02` adapts Content Types to visible paginated rows. It also
depends on `TASK-205-02` so Content Types bulk delete uses the shared
token-backed confirmation dialog pattern instead of copying the current native
`window.confirm()` behavior from other lists. Preserve the stricter content type
delete guard from `typeService`.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/ContentTypeList.tsx`
  - own `selectedIds`, `bulkAction`, and `isBulkWorking`,
  - derive `visibleIds` from the paginated row set,
  - trim selection when filters, sort, page-size, or pagination remove rows from
    view,
  - render inline bulk controls in `PageHeader.actions` to the left of `New`,
  - run per-item bulk publish/draft/delete and refresh cache afterward,
  - surface partial failures,
  - use token-backed dialog state for bulk delete confirmation.
- `core/admin/ui/content-types/ContentTypeTable.tsx`
  - add controlled header checkbox,
  - add row checkboxes,
  - apply selected row styling,
  - preserve sortable headers and row action dropdown.
- `core/admin/services/contentTypesClient.ts`
  - reuse `updateContentType(id, { status })` and `deleteContentType(id)`,
  - add tiny semantic wrappers like `publishContentType` and
    `moveContentTypeToDraft` only if they improve readability without changing
    the route contract.
- `core/services/content/typeService.ts`
  - no change expected unless bulk reveals a missing status transition
    invariant.
- `core/server/routes/contentTypeRoutes.ts`
  - no new route expected; use existing strict `PATCH /content-types/:id` and
    `DELETE /content-types/:id`.
- `tests/vitest/ui/content-type-list-parity.test.tsx`
  - create this focused suite if it does not exist yet, and cover visible-scope
    selection, header checkbox, inline bulk controls, clear selection, and
    partial-failure feedback.
- `tests/vitest/ui/content-type-table.test.tsx`
  - cover controlled selected row rendering and row checkbox labels.
- `tests/vitest/admin/contentTypesClient.test.ts`
  - cover wrappers if added.
- `tests/unit/content/typeService.test.ts`
  - update only if service invariants change.
- `tests/integration/routes/contentTypes.test.ts`
  - update only if route behavior changes.

## Implementation Direction

Owner responsibilities for this leaf:

- `ContentTypeList` owns selection state, selected-count header actions, bulk
  orchestration, partial-failure feedback, and the refresh-after-write flow.
- `ContentTypeTable` owns only controlled checkbox rendering, selected-row
  styling, and row action presentation.
- `useListPagination` / `ListPaginationFooter` from `TASK-205-03-01` own page
  state, page-size controls, visible rows, and footer controls. Do not duplicate
  that math in Content Types.
- `contentTypesClient` owns the existing write/cache helpers. Reuse
  `updateContentType(id, { status })` and `deleteContentType(id)`; add wrappers
  only if they stay semantic aliases over those same route calls.
- `typeService` and `contentTypeRoutes` remain the invariant and route-boundary
  owners. Do not add a bulk endpoint unless a separately documented contract
  change proves the existing per-item routes cannot satisfy the behavior.

Follow the corrected Pages/Posts/Menus inline header-action pattern:

```tsx
<PageHeader
  title="Content Types"
  actions={
    <>
      {selectedCount > 0 ? (
        <ContentTypeBulkActionsBar
          selectedCount={selectedCount}
          action={bulkAction}
          onActionChange={setBulkAction}
          onApply={handleBulkApply}
          onClear={handleClearSelection}
          isApplying={isBulkWorking}
        />
      ) : null}
      <Button onClick={() => setCreateOpen(true)}>New</Button>
    </>
  }
/>
```

Bulk action behavior:

- `Publish` maps to `updateContentType(id, { status: "published" })`.
- `Move to Draft` maps to `updateContentType(id, { status: "draft" })`.
- `Delete` maps to `deleteContentType(id)` and must confirm through a shared
  Admin UI dialog before executing.
- All actions operate on controlled selected IDs from the visible/paginated row
  set.
- Bulk delete uses explicit React dialog state from `TASK-205-02`; it must not
  call `window.confirm()`.
- After action completion, refresh the list from cache with `force: true`,
  clear selection on full success, and preserve actionable partial failure copy
  if some rows failed.

Delete failures are expected for content types with entries, custom screens,
taxonomies, content routes, or listings. The UI must report those failures
truthfully instead of treating the whole bulk operation as successful.

## Security Contract

- Visibility: internal admin list only.
- Auth model: existing authenticated admin API routes.
- RBAC: unchanged; per-item content type update/delete permissions remain the
  source of truth.
- CSRF: all write calls must use existing `contentTypesClient` helpers with
  `withCsrf: true`.
- Rate-limit bucket: unchanged internal admin write bucket.
- Reject-unknown validation: existing `contentSchemas` strict payload validation
  remains the route boundary.
- Anti-abuse: no public write path; destructive bulk delete requires explicit
  token-backed confirmation and runs only against selected visible IDs.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/content-type-list-parity.test.tsx tests/vitest/ui/content-type-table.test.tsx tests/vitest/admin/contentTypesClient.test.ts`
- `tests/vitest/ui/content-type-list-parity.test.tsx` must prove selection is
  page-visible scoped after page-size and `Previous` / `Next` changes and that
  bulk delete does not call `window.confirm()`.
- `bun test tests/integration/routes/contentTypes.test.ts` only if routes change.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` only if cache behavior
  changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Header checkbox selects only visible/paginated content types.
2. Row selection is controlled by `ContentTypeList` and reflected by
   `ContentTypeTable`.
3. Bulk controls render inline in the header actions area to the left of `New`.
4. Bulk publish and move-to-draft update status and refresh cache.
5. Page, filter, sort, and page-size changes trim or clear selection so hidden
   rows are not mutated accidentally.
6. Bulk delete requires a token-backed shared confirmation, respects server
   delete guards, and reports partial failures.
7. No duplicate pagination state, new bulk endpoint, or resource-specific dialog
   system is introduced for Content Types.

## Completion Notes

- `ContentTypeList` owns controlled selected IDs, bulk action state, visible-ID
  selection trimming, partial-failure feedback, and refresh-after-write.
- `ContentTypeTable` stays a presentation adapter with controlled header and row
  checkboxes plus selected-row styling.
- Bulk publish/draft/delete reuse existing per-item content type client helpers;
  route and service contracts remain unchanged.
- Bulk delete uses the shared token-backed confirmation dialog and preserves
  guarded delete failures as actionable partial-failure copy.
