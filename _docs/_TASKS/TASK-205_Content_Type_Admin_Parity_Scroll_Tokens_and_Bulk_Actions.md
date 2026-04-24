# TASK-205: Content Type Admin Parity, Scroll, Tokens, and Bulk Actions
# FileName: TASK-205_Content_Type_Admin_Parity_Scroll_Tokens_and_Bulk_Actions.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI + UX
**Estimated Effort:** Large
**Dependencies:** TASK-202, TASK-198, TASK-199, TASK-200
**Status:** To Do

---

## Overview

Follow-up fixes for the Content Types admin surface after the Engine QA recovery.
The content type editor and list are functionally stronger after `TASK-202`, but
the surface still misses list parity and has one layout defect:

- the JSON schema preview in the right editor panel cannot be scrolled
  comfortably when a content type has many fields,
- content type confirmation dialogs and action popups need an explicit token
  compliance audit so Admin UI Theme template changes affect their appearance,
- the Content Types list has no footer with filtered count and `Previous` /
  `Next` controls like Pages, Posts, and Menus,
- the Content Types list has no controlled multi-select state or bulk actions.

This task keeps the existing content type API and admin route model. It should
extend the current `ContentTypeList`, `ContentTypeTable`, and
`ContentTypeEditor` seams instead of introducing a parallel list manager or a
second editor flow.

## Sub-Tasks

- [ ] TASK-205-01: Content Type JSON Preview Scroll Containment
- [ ] TASK-205-02: Content Type Admin Popup Token Compliance
- [ ] TASK-205-03: Content Type List Footer and Pagination Parity
- [ ] TASK-205-04: Content Type List Selection and Bulk Actions
- [ ] TASK-205-05: QA, Docs, and Closure

## Scope

1. Fix editor-side scroll containment:
   - right preview panel remains visible on desktop,
   - JSON schema area scrolls vertically when the schema is long,
   - long JSON lines do not break the page or hide the footer metadata,
   - mobile sheet preview keeps the same behavior.
2. Make Content Types popups token-compliant:
   - use shared `Dialog`, `Sheet`, `Alert`, `Button`, and `toast` surfaces,
   - remove hard-coded rose/amber background and border classes from content
     type confirmation callouts,
   - use Admin UI token-backed classes or shared component variants mapped in
     `core/admin/styles/globals.css`,
   - preserve accessible titles, descriptions, focus handling, and destructive
     affordances.
3. Add the list footer and pagination/count affordance:
   - show `Showing X of Y content types`,
   - render `Previous` and `Next` controls in the same footer layout as
     Pages/Posts/Menus,
   - keep search, status filter, and sort applied before pagination,
   - reset or clamp the page index when filters change.
4. Add controlled multi-select and bulk actions:
   - header checkbox selects only currently visible/paginated rows,
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
- Do not replace the existing `/admin/content-types` and
  `/admin/content-types/:id` route model.

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
  - own selected IDs, visible IDs, pagination state, bulk action state, and
    footer behavior,
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
  - add or update list footer, pagination, visible-scope selection, and bulk
    action coverage.
- `tests/vitest/admin/contentTypesClient.test.ts`
  - cover any new client wrappers or cache/invalidation paths.
- `tests/integration/routes/contentTypes.test.ts`
  - update only if route behavior changes; existing PATCH/DELETE route coverage
    should remain sufficient if bulk uses existing per-item routes.
- `_docs/CONTENT_LIST_UX.md`
  - document Content Types list parity once implemented.
- `_docs/DESIGN_TOKENS.md`
  - update only if a new shared token/variant contract is added.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md`
  - update only if cache keys, TTLs, or invalidation semantics change.
- `_docs/_TASKS/README.md`
  - keep board status and statistics synchronized.
- `_docs/_CHANGELOG/*`
  - add on completion.

## Implementation Direction

Derive list state in this order:

```ts
const filteredRows = filterContentTypes(types, query, statusFilter);
const sortedRows = sortContentTypes(filteredRows, sortKey, sortDirection);
const paginatedRows = sortedRows.slice(pageStart, pageEnd);
const visibleIds = paginatedRows.map((row) => row.id);
```

Selection must follow the visible row set:

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

Token compliance means no content-type-specific hard-coded destructive/warning
palette like `bg-rose-50`, `border-rose-200`, `text-rose-900`,
`bg-amber-50`, or `border-amber-200` inside the content type popups. Prefer
shared component variants mapped to Admin UI Theme tokens.

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
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/content-type-editor.test.tsx tests/vitest/ui/content-type-table.test.tsx tests/vitest/ui/content-type-list-parity.test.tsx tests/vitest/admin/contentTypesClient.test.ts`
- `bun test tests/integration/routes/contentTypes.test.ts` only if API route
  behavior or validation changes.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/DESIGN_TOKENS.md` only if new shared token/variant semantics are added.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` only if cache semantics
  change.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-205-content-type-admin-parity.md`

## Acceptance Criteria

1. A content type with many fields keeps the editor usable and the right JSON
   preview scrolls without trapping or hiding content.
2. Content type dialogs, sheets, dropdowns, toasts, and warning/destructive
   callouts use shared Admin UI token-backed surfaces.
3. The Content Types list footer matches Pages/Posts/Menus with filtered count
   and `Previous` / `Next` controls.
4. Content Types support visible-scope row selection and inline header bulk
   actions.
5. Bulk publish, move-to-draft, and delete preserve cache consistency,
   confirmation, and partial-failure feedback.
