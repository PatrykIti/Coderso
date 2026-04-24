# TASK-207: Coderso Entries List Parity and Cross-Type Filtering
# FileName: TASK-207_Coderso_Entries_List_Parity_and_Cross_Type_Filtering.md

**Priority:** High
**Category:** CMS/Entries + Admin/UI + UX + Admin API
**Estimated Effort:** Very Large
**Dependencies:** TASK-202, TASK-203, TASK-205
**Status:** To Do

---

## Overview

Bring `/admin/coderso/entries` in line with the current Pages, Posts, Menus, and
Engine/Content Types first-screen list contract.

The current Entries screen is still organized around a left content-type sidebar
and only fetches the active content type through `listEntriesCached(typeSlug)`.
That makes the first screen visually different from the other admin lists and
prevents users from scanning all entries in one table. The table also has a
static footer, does not show which Engine/content type owns each entry, and uses
filters as always-visible local controls instead of the shared basic plus
advanced filter pattern requested for this surface.

This task repairs the existing Entries list contract in place. It must not add a
second Entries flow, duplicate editor route, parallel content-type selector, or
resource-specific list system. The canonical route remains
`/admin/coderso/entries`; the editor route remains
`/admin/coderso/entries/:type/:id`.

## Required Product Behavior

1. The Entries list first screen must visually match the current Pages, Posts,
   Menus, and Content Types list pattern:
   - `AdminShell` + `PageHeader`,
   - centered max-width list surface,
   - inline header actions with selected-row bulk controls to the left of `New`,
   - same table/card treatment,
   - shared `ListPaginationFooter`,
   - token-backed popups and destructive confirmations.
2. The table must list entries across content types and include a `Content Type`
   column.
3. The content-type value in each row must be an `AdminLink` to the owning Engine
   editor for that content type.
4. Basic filters should stay small and useful by default: search plus status.
5. Advanced filters must be collapsible and include content type selection at
   minimum. Author and updated-date filters should live there if implemented.
6. Bulk actions, row actions, create drawer, delete dialogs, feedback alerts, and
   dropdowns must use existing Admin UI theme tokens/shared primitives.
7. Cross-type row selection must keep enough execution context for mutations.
   The selected execution model cannot be only `selectedIds` plus one
   `activeSlug`; it must resolve each visible selected row to its entry id and
   owning `contentType.slug` before calling existing per-entry client helpers.

## Repair Rules

- Extend current Entries owners. Do not create a second entries manager,
  entries route family, editor flow, table framework, or local pagination copy.
- Do not keep a stale secondary list/card mode that still depends on one
  `activeSlug`. The current grid/card surface must either be removed from the
  first-screen list parity work or upgraded to consume the same all-entries row
  contract as the table.
- Own schemas, normalization, and cache keys in the existing service/client
  layers. Routes should stay orchestration-only.
- Use the shared canonical admin navigation helpers: `AdminLink`,
  `adminPaths`, and `prefetchAdminRoute`.
- Preserve existing per-type routes and caches used by editors, widgets,
  relation fields, and assistant action invalidation.
- Add the cross-type list read model additively; do not break
  `listEntriesCached(typeSlug)`.
- Use client-side filtering/pagination like the current Pages/Posts/Menus/Engine
  lists unless a later task explicitly introduces server-side pagination.
- Reuse the existing shared admin cache pattern: cache keys in
  `cachePolicy.ts`, localStorage envelope helpers from `storageCache`,
  same-tab/cross-tab synchronization through `cacheBus`, cached wrappers in the
  resource client, and background revalidation in the UI. Do not add a second
  Entries cache abstraction or a resource-specific cache framework.
- If a current owner cannot keep the contract readable, update the task leaf
  with the real owner decision before adding a helper.

## Current Owner Findings

- `core/admin/ui/entries/EntryList.tsx` owns the current screen, active content
  type state, filters, selection, delete/duplicate/bulk orchestration, and
  type-sidebar layout.
- `core/admin/ui/entries/EntryTable.tsx` owns table row rendering but currently
  lacks content-type metadata, Engine links, and shared pagination.
- `core/admin/ui/entries/EntryGrid.tsx` is still wired through one
  `entryTypeSlug`; it cannot remain as a cross-type card/list alternative unless
  it is upgraded to route each card through the row's owning `contentType.slug`.
- `core/admin/ui/entries/EntryFilters.tsx` owns always-visible search/type/status
  /author controls; it needs a basic/advanced split instead of a second filter
  flow.
- `core/admin/ui/entries/EntryBulkActionsBar.tsx` currently renders as a full
  card below filters; it needs the inline header-action shape used by the other
  lists.
- `core/admin/services/entriesClient.ts` owns type-scoped list/detail caches and
  write invalidation. It has no all-entries list cache.
- `core/server/routes/contentEntryRoutes.ts` exposes only type-scoped entry list
  reads. A cross-type internal read route is needed for a true all-entries list.
- `core/server/validation/contentSchemas.ts` owns content-entry request/query
  validation. The all-entries route strictness must be expressed there with an
  empty query schema, then consumed by the route via `validate(...)`; do not add
  ad hoc `Object.keys(ctx.query)` checks in `contentEntryRoutes.ts`.
- `core/services/content/entryService.ts` owns the DB read model; the cross-type
  list should be a join/read model here rather than client-side N+1 fetches.
- `core/admin/services/cachePolicy.ts`, `core/admin/utils/adminPrefetch.ts`,
  `_docs/ADMIN_CACHE.md`, and `_docs/ADMIN_CACHE_MAP.md` must stay aligned if a
  new all-entries list cache is added.

## Sub-Tasks

- [ ] TASK-207-01: Entries Cross-Type Read Model and Cache Contract
  - [ ] TASK-207-01-01: Entry List Read Model Service and Route Contract
  - [ ] TASK-207-01-02: Entries Client Cache, Prefetch, and Cache Map
- [ ] TASK-207-02: Entries List Shell Parity With Admin Lists
  - [ ] TASK-207-02-01: Entry List AdminShell, PageHeader, and Action Layout
  - [ ] TASK-207-02-02: Entry Table Content Type Column and Engine Links
  - [ ] TASK-207-02-03: Shared Pagination and Visible-Scope Selection
- [ ] TASK-207-03: Entries Filter Model - Basic and Advanced
  - [ ] TASK-207-03-01: Basic Search, Status, and Filter Reset Contract
  - [ ] TASK-207-03-02: Advanced Content Type, Author, and Date Filters
  - [ ] TASK-207-03-03: Filter State, Selection Trim, and Empty States
- [ ] TASK-207-04: Entries Bulk Actions, Popups, and Token Compliance
  - [ ] TASK-207-04-01: Entries Inline Bulk Actions and Partial-Failure Feedback
  - [ ] TASK-207-04-02: Entry Row/Bulk Delete Dialog Token Compliance
  - [ ] TASK-207-04-03: Entries Create/Action Popup Theme Token Audit
- [ ] TASK-207-05: QA, Docs, and Closure

## Non-Goals

- No new public entry write endpoints.
- No new editor route or collection workspace route.
- No migration away from `content_entries`.
- No server-side pagination unless separately documented.
- No replacement of the Entries editor, `FieldRenderer`, preview contract, or
  metadata panel from TASK-203.
- No new content-type lifecycle states.

## Security Contract

- Visibility: internal admin Entries list and existing entry editor routes only.
- Auth model: authenticated admin session / admin API key where supported.
- RBAC: `content:read` for list/detail/read models, `content:write` for
  create/update/delete/duplicate/draft/archive mutations, `content:publish` for
  publish transitions.
- CSRF: all mutations continue through existing `entriesClient` helpers with
  `withCsrf: true`.
- Rate-limit buckets: existing `admin_read` for list reads and `admin_write` for
  mutations.
- Reject-unknown validation: new route/query payloads must be schema-first and
  reject unsupported fields; if the all-entries list remains queryless, add an
  empty query schema in `core/server/validation/contentSchemas.ts`, validate
  `ctx.query`, and do not read or manually inspect ad hoc query params.
- Anti-abuse: no public write path; destructive row/bulk delete requires an
  explicit token-backed confirmation and operates only on controlled visible
  selected entry refs (`id` plus owning `contentType.slug`), not on hidden rows
  or a stale single active content-type slug.

## Implementation Order

1. Add the cross-type read model and cache contract.
2. Rebuild the Entries first screen around the existing shared list shell.
3. Add the content-type table column and Engine links.
4. Split filters into basic and advanced controls.
5. Move selection/bulk actions to the inline header pattern.
6. Audit popups/actions for Admin UI Theme token compliance.
7. Update tests, docs, task board, and changelog on closure.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest:
  - `tests/vitest/admin/entriesClient.test.ts`
  - `tests/vitest/admin/adminPrefetch.test.ts`
  - `tests/vitest/ui/content-entries.test.tsx`
  - `tests/vitest/ui/entry-list-wave.test.tsx`
  - `tests/vitest/ui/entry-list-filters.test.ts`
  - `tests/vitest/ui/entry-bulk-actions.test.tsx`
  - `tests/vitest/ui/entry-table-wave.test.tsx`
  - `tests/vitest/ui/entry-table-title.test.tsx`
  - new focused list parity/filter/dialog suites if the existing suites become
    too broad.
- Bun route/service tests when the read route/service changes:
  - `bun test tests/unit/content/entryService.test.ts`
  - `bun test tests/integration/routes/contentTypes.test.ts`
  - route coverage must include the all-entries route registration,
    `content:read` permission, unsupported-query rejection for the queryless
    contract through the `contentSchemas.ts` schema owner, and regression
    coverage that `/content/:type/entries` remains available for existing
    type-scoped consumers.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CMS_API.md` if the all-entries route becomes a documented admin API
  contract.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. `/admin/coderso/entries` visually matches the current list pattern used by
   Pages, Posts, Menus, and Content Types.
2. The list can show entries from multiple content types at once.
3. Every row shows its owning content type and links to the Engine editor.
4. Basic and advanced filters are separated without introducing a second flow.
5. Shared pagination and visible-scope selection are used; no static footer or
   duplicated page math remains.
6. Bulk actions and destructive confirmations use token-backed shared Admin UI
   primitives.
7. Existing type-scoped editor/widget/relation/assistant contracts remain
   backward compatible.
