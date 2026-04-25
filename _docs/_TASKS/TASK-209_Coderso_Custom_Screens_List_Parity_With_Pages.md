# TASK-209: Coderso Custom Screens List Parity With Pages
# FileName: TASK-209_Coderso_Custom_Screens_List_Parity_With_Pages.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin/UI + UX + Admin Cache
**Estimated Effort:** Very Large
**Dependencies:** TASK-054-22, TASK-054-23, TASK-205, TASK-208
**Status:** To Do

---

## Overview

Bring `/admin/coderso/custom-screens` to the same first-screen list contract as
the current `/admin/pages` implementation while preserving the Custom Screens
domain contract.

This is a parity task, not a redesign of Custom Screens. The list should use the
same admin list primitives, feedback timing, table treatment, pagination,
selection model, token-backed confirmations, and shared list-action toasts that
Pages already uses. The resource behavior must stay Custom Screens-specific:
screens have `draft | active` status, `contentTypeId`, sidebar shortcut fields,
derived capabilities, builder and records routes, and the existing
`GET/POST/PATCH/DELETE /custom-screens` admin API contract. Do not add Page-only
actions such as preview or duplicate unless a separate service/API contract is
created first.

## Current Repo Findings

### Pages Reference Implementation

- `core/admin/ui/pages/PageListPage.tsx` owns the Pages list orchestration:
  cached hydration plus background refresh, filters, visible-row selection,
  inline bulk actions, create drawer, shared pagination, confirmed deletes, and
  shared `createListActionToastAdapter` feedback.
- `core/admin/ui/pages/PageTable.tsx` owns the Pages table presentation with
  checkbox selection, responsive row metadata, shared dropdown row actions, and
  `AdminLink` editor navigation.
- `core/admin/ui/pages/PageFilters.tsx`,
  `core/admin/ui/pages/PageBulkActionsBar.tsx`,
  `core/admin/ui/pages/PageRowActions.tsx`,
  `core/admin/ui/shared/ListPaginationFooter.tsx`,
  `core/admin/ui/shared/ConfirmActionDialog.tsx`, and
  `core/admin/ui/shared/listActionToasts.ts` are the list primitives Custom
  Screens should reuse or mirror with resource-specific labels.
- Pages emits floating top-right success/error toasts after real mutations
  complete and only emits delete feedback after `ConfirmActionDialog` confirms
  the destructive action.

### Current Custom Screens Gaps

- `core/admin/ui/custom-screens/CustomScreenListPage.tsx` keeps the table inside
  the page component and does not have separate filter, table, row-action, bulk,
  or create-drawer owners.
- The list has no search/status/content-type filters, no shared
  `useListPagination`, no visible-row selection, and no inline bulk action bar.
- Row delete runs immediately from the dropdown. It does not use
  `ConfirmActionDialog`, so it does not match the Pages destructive-action
  contract.
- Delete errors only set an inline alert through `actionError`; there is no
  shared top-right toast for create/status/delete success or failure.
- `useCustomScreens` always calls `refresh(true)` on mount, even when cache is
  present, while Pages uses cache-present/background and cache-missing/foreground
  refresh semantics.
- The list fetches content types with `listContentTypesCached({ force: true })`
  only from the page component. The Custom Screens list needs the content-type
  labels for filtering/table/create, but this should be cached-first and
  background-refreshed like other admin lists.
- `core/admin/utils/adminPrefetch.ts` warms only `listCustomScreensCached` for
  `/coderso/custom-screens`; the list also needs content types to avoid a
  second foreground label load.

### Custom Screens Contract Constraints

- Current admin API:
  - `GET /custom-screens`
  - `GET /custom-screens/:id`
  - `POST /custom-screens`
  - `PATCH /custom-screens/:id`
  - `DELETE /custom-screens/:id`
- Current client owners:
  - `core/admin/services/customScreensClient.ts`
  - `core/admin/ui/custom-screens/hooks/useCustomScreens.ts`
- Status transitions are `draft <-> active` through
  `updateCustomScreen(id, { status })`; there are no publish/unpublish routes.
- Row routes remain:
  - builder: `/admin/coderso/custom-screens/:id`
  - records: `/admin/coderso/custom-screens/:id/entries`
- Content-type labels come from `contentTypesClient`, but screen persistence
  keeps the existing `contentTypeId` value. The list must not rewrite screen
  records into a new denormalized API shape unless a later backend task
  explicitly changes the contract.

## Required Product Behavior

1. `/admin/coderso/custom-screens` visually matches the Pages list pattern:
   `AdminShell`, `PageHeader`, centered `max-w-6xl`, compact `New` action,
   table card treatment, shared pagination footer, inline bulk action controls,
   and token-backed confirmations.
2. The list has Custom Screens-specific filters:
   - search by screen name, sidebar label, and content-type label/id;
   - status filter: all, active, draft;
   - content-type filter when content types are available.
3. The table uses the Pages table behavior but Custom Screens columns:
   checkbox, screen, status, content type, mode/capabilities, sidebar shortcut,
   updated, actions.
4. Row actions are contract-specific:
   - Records,
   - Edit,
   - Activate or Move to draft depending on current status,
   - Delete.
   Do not add Preview or Duplicate in this task.
5. `New` opens a list-owned Custom Screen create drawer for the minimum
   resource contract: name, content type, status default, optional sidebar
   shortcut, and open-after-create preference. On success it creates through
   `createCustomScreen`, emits the shared toast, and navigates to the builder
   when the preference says to open the screen.
6. Single and bulk lifecycle feedback goes through
   `createListActionToastAdapter` with Custom Screens labels and actions:
   create, activate, deactivate, delete.
7. Delete and bulk delete use `ConfirmActionDialog`. No destructive Custom
   Screen delete should run directly from a dropdown click.
8. Cache behavior follows the shared admin cache contract:
   cache hydrate first, background revalidate when cache exists, foreground load
   when cache is absent, cache bus updates after mutations, and prefetch warmup
   for custom screens plus content types.
9. The implementation must preserve builder, records workflow, sidebar shortcut
   nav, assistant active-surface context, and existing custom-screen API schemas.

## Sub-Tasks

- [ ] TASK-209-01: Custom Screens List Data, Cache, and Enrichment
  - [ ] TASK-209-01-01: Custom Screens Mount Refresh and Prefetch Parity
  - [ ] TASK-209-01-02: Content Type Label Enrichment and List View Model
- [ ] TASK-209-02: Custom Screens Table, Filters, and Pagination
  - [ ] TASK-209-02-01: Custom Screen List Shell and Create Entry Point
  - [ ] TASK-209-02-02: Custom Screen Filters for Search, Status, and Content Type
  - [ ] TASK-209-02-03: Custom Screen Table, Pagination, and Visible Selection
- [ ] TASK-209-03: Custom Screens Actions, Toasts, and Confirmations
  - [ ] TASK-209-03-01: Custom Screen List Action Toast Adapter
  - [ ] TASK-209-03-02: Custom Screen Row Lifecycle and Status Actions
  - [ ] TASK-209-03-03: Custom Screen Bulk Actions and Delete Confirmations
- [ ] TASK-209-04: QA, Docs, and Closure

## Non-Goals

- No new public Custom Screens endpoints.
- No new duplicate or preview action until the domain/service contract exists.
- No replacement of the Custom Screen builder, records workflow, binding panel,
  assistant active-surface context, or sidebar shortcut model.
- No new table framework or Custom Screens-only pagination system.
- No server-side pagination for `GET /custom-screens`.
- No migration of `custom_screens` storage or status values.

## Security Contract

- Visibility: internal admin UI and existing internal admin API only.
- Auth model: existing authenticated admin session/admin API key where
  supported by the admin API layer.
- RBAC:
  - `content:read` for list/detail reads and content-type labels;
  - `content:write` for create, status update, and delete mutations.
- CSRF: all writes continue through existing admin client helpers with
  `withCsrf: true`.
- Rate-limit bucket: existing `admin_read` for reads and `admin_write` for
  mutations.
- Reject-unknown validation: keep `customScreenCreateSchema` and
  `customScreenUpdateSchema` as the route validation source of truth; UI code
  must submit only the existing schema fields.
- Anti-abuse: no public write path; destructive row and bulk delete require
  `ConfirmActionDialog`; bulk actions operate only on visible selected screen
  ids after filter/pagination trimming.

## Implementation Order

1. Align data/cache/prefetch behavior so the list has stable screen rows and
   content-type labels without foreground cache churn.
2. Extract list shell pieces and create the list-owned create drawer.
3. Add filters, table columns, pagination, and visible-row selection.
4. Add Custom Screens toast adapter, row status actions, and confirmed delete.
5. Add bulk activate, draft, and delete with partial-failure feedback.
6. Update tests, docs, task board, changelog, and validation evidence on
   closure.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx`
  - new or expanded mounted list suite, for example
    `tests/vitest/ui/custom-screens-list-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-action-toasts.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPrefetch.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPaths.test.ts` if any links or aliases change.
- Bun route tests only if the route family changes:
  - `bun test tests/integration/routes/customScreensRoutes.test.ts`
- Existing records/editor smoke coverage should remain green:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-records.test.tsx`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CMS_API.md` only if the API contract changes; otherwise note that the
  UI parity work preserves the existing `custom-screens` endpoints.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` and `_docs/_CHANGELOG/README.md` on completion.

## Acceptance Criteria

1. `/admin/coderso/custom-screens` matches the Pages list interaction model
   while using Custom Screens-specific labels, fields, routes, and lifecycle
   actions.
2. Cache-present navigation renders cached screens immediately and refreshes in
   the background; cache-missing navigation shows a bounded foreground loading
   state.
3. Search/status/content-type filters reset pagination and trim hidden
   selections.
4. Row delete and bulk delete cannot run without the shared confirmation dialog.
5. Create, activate, draft, delete, and bulk outcomes emit shared list-action
   toasts after the real mutation path completes.
6. Existing builder, records, sidebar shortcut, assistant context, and API tests
   are not regressed.
