# TASK-551-03-L02: Bounded Admin Lists and Oversized Service Splits
# FileName: TASK-551-03-L02-Bounded-Admin-Lists-And-Oversized-Service-Splits.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-03
**Priority:** Critical
**Category:** Database / API / Admin / Performance
**Estimated Effort:** Extra Large
**Dependencies:** TASK-554, TASK-551-03-L01, TASK-551-05-L02, TASK-551-06-L03;
TASK-551-09-L04 INITIAL Admin-authority receipt; TASK-551-08-L03 INITIAL
route-response-header receipt
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Move admin collections to projection-specific read services and keyset
pagination. Split the oversized booking service by cohesive responsibility
before altering it, preserve SPA/cache behavior, and make booking/user/session
write races explicit rather than relying on read-then-write checks.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Read services:** `core/services/pages/pageReadService.ts`,
`core/services/content/entryReadService.ts`,
`core/services/content/postReadService.ts`,
`core/services/admin/userReadService.ts`,
`core/services/forms/formReadService.ts`,
`core/services/forms/submissionReadService.ts`,
`core/services/media/mediaReadService.ts`,
`core/services/booking/bookingReadService.ts`,
`core/services/booking/bookingMutationService.ts`,
`core/services/booking/bookingScheduleService.ts`,
`core/services/booking/bookingService.ts`,
`core/services/admin/usersService.ts`, and
`core/services/auth/sessionService.ts`.

**Route/schema adapters:** `core/server/routes/index.ts`,
`core/server/routes/pageRoutes.ts`,
`core/server/routes/detailPageRoutes.ts`,
`core/server/routes/contentEntryRoutes.ts`, `core/server/routes/postsRoutes.ts`,
`core/server/routes/adminUsersRoutes.ts`, `core/server/routes/formsRoutes.ts`,
`core/server/routes/mediaRoutes.ts`, `core/server/routes/bookingRoutes.ts`,
`core/server/validation/pageSchemas.ts`,
`core/server/validation/detailPageSchemas.ts`,
`core/server/validation/contentSchemas.ts`,
`core/server/validation/postSchemas.ts`,
`core/server/validation/adminUserSchemas.ts`,
`core/server/validation/formSchemas.ts`,
`core/server/validation/mediaSchemas.ts`, and
`core/server/validation/bookingSchemas.ts`.

**Admin consumers:** `core/admin/services/pagesClient.ts`,
`core/admin/services/detailPagesClient.ts`,
`core/admin/services/entriesClient.ts`, `core/admin/services/postsClient.ts`,
`core/admin/services/adminUsersClient.ts`, `core/admin/services/formsClient.ts`,
`core/admin/services/mediaClient.ts`, `core/admin/services/bookingClient.ts`,
`core/admin/ui/pages/PageListPage.tsx`,
`core/admin/ui/pages/PageRevisionDrawer.tsx`,
`core/admin/ui/content-types/DetailTemplateEditorPage.tsx`,
`core/admin/ui/entries/EntryList.tsx`,
`core/admin/ui/posts/PostsListPage.tsx`,
`core/admin/ui/users/UsersRolesPage.tsx`,
`core/admin/ui/forms/FormListPage.tsx`,
`core/admin/ui/forms/FormTable.tsx`,
`core/admin/ui/forms/FormSubmissionsPage.tsx`,
`core/admin/ui/media/MediaLibraryPage.tsx`,
`core/admin/ui/media/MediaPicker.tsx`, and
`core/admin/ui/media/utils.ts`,
`core/admin/ui/booking/BookingPage.tsx`,
`core/admin/ui/booking/BookingOverviewPanel.tsx`,
`core/admin/ui/booking/bookingHelpers.ts`,
`core/admin/ui/booking/bookingTypes.ts`,
`core/admin/ui/booking/components/AvailabilityTab.tsx`,
`core/admin/ui/booking/components/ReservationsTab.tsx`,
`core/admin/ui/booking/components/ResourcesTab.tsx`,
`core/admin/ui/booking/components/ServicesTab.tsx`, and
`core/admin/ui/booking/components/SlotPreviewTab.tsx`.

**FAZA-0 ownership additions (2026-09-24; C9-C12 and C15 below):**
`core/admin/services/adminListEnvelope.ts`,
`core/admin/services/entriesClientPagination.ts`,
`core/admin/ui/shared/useBoundedAdminList.ts`,
`core/admin/ui/shared/BoundedListFooter.tsx`,
`core/admin/ui/pages/editor/pageEditorHostContract.ts`,
`core/admin/ui/pages/editor/usePageEditorController.ts`,
`core/admin/ui/pages/editor/usePageEditorRevisions.ts`,
`core/admin/ui/pages/editor/PageEditorToolbar.tsx`,
`core/admin/ui/pages/editor/PageEditorToolbarRevisions.tsx`,
`core/admin/ui/pages/editor/PageEditorSettingsPanel.tsx`,
`core/admin/ui/pages/editor/PageEditorHistorySheet.tsx`,
`core/admin/ui/pages/editor/PageEditorRegistryPickers.tsx`,
`core/admin/ui/media/useMediaFolderOperations.ts`,
`core/admin/ui/booking/useBookingCollections.ts`,
`core/admin/ui/posts/editor/PostCanvasBlockItem.tsx`,
`core/admin/ui/users/useUsersRolesCollections.ts`,
`core/admin/ui/site/SiteSettingsPagePickers.tsx`,
`core/admin/ui/custom-screens/useCustomScreenEntryList.ts`,
`core/server/routes/boundedReadErrors.ts`,
`core/services/customScreens/relatedEntryResolver.ts`,
`scripts/runtime-smoke/contracts.ts`,
`scripts/runtime-smoke/registry.ts`,
`scripts/runtime-smoke/cli.ts`,
`scripts/runtime-smoke/adapters/task-551-admin-lists.ts`,
`scripts/runtime-smoke/adapters/task-551-admin-lists/contracts.ts`,
`scripts/runtime-smoke/adapters/task-551-admin-lists/fixtures.ts`,
`scripts/runtime-smoke/adapters/task-551-admin-lists/browser-plan.ts`,
`scripts/runtime-smoke/adapters/task-551-admin-lists/suite.ts`.
The five `core/admin/ui/menus/MenuDesignEditor{Canvas,Controls,BarPanel,BlockPanel,BlockFields}.tsx`
modules left the allowlist (no owned-client import; C11). Test-side additions
are the C12 discovery hits, the C12 named additions and new suites, and the C11
split siblings; the envelope `allowlist` enumerates every path.

`core/admin/services/cachePolicy.ts` is a read-only dependency owned solely by
TASK-551-09-L04. This leaf may compose its existing bounded-key helper with
client-local typed page/summary/facet discriminators, but it neither edits nor
duplicates cache-policy TTLs. Every one of the eight owned clients registers
all module maps/promises with L04 INITIAL's `adminCacheAuthority`, captures an
installation token before async work, and verifies that token plus its own
resource generation immediately before any cache install. Its reset callback
clears every legacy and newly added page/summary/facet/detail promise or value.

**List-shape consumer subset this leaf may edit:** the eight owned clients
(`pagesClient`, `detailPagesClient`, `entriesClient`, `postsClient`,
`adminUsersClient`, `formsClient`, `mediaClient`, `bookingClient`) are imported
by 78 `core/admin` files today, per the exact grounded command
`rg -l "from ['\"].*(pagesClient|entriesClient|postsClient|adminUsersClient|formsClient|mediaClient|bookingClient|detailPagesClient)" core/admin`.
The following 26 files are the SUB-SET of those 78 importers that this leaf may
edit — the list-shape surface (tables, grids, pickers, and lists that render
paginated lists and therefore receive a list-call-site change):
`core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx`,
`core/admin/ui/custom-screens/CustomScreenEntriesTable.tsx`,
`core/admin/ui/custom-screens/customScreenListModel.ts`,
`core/admin/ui/custom-screens/customScreenPreviewData.ts`,
`core/admin/ui/custom-screens/hooks/useScreenEntryPresentationMedia.ts`,
`core/admin/ui/custom-screens/hooks/useScreenRelatedEntries.ts`,
`core/admin/ui/custom-screens/ListViewCanvas.tsx`,
`core/admin/ui/content-types/DetailTemplateInspector.tsx`,
`core/admin/ui/entries/EntryGrid.tsx`,
`core/admin/ui/entries/EntryTable.tsx`,
`core/admin/ui/entries/FieldRenderer.tsx`,
`core/admin/ui/forms/hooks/useForms.ts`,
`core/admin/ui/menus/MenuDesignEditor.tsx`,
`core/admin/ui/menus/MenuDesignEditorBrandNavControls.tsx`,
`core/admin/ui/menus/MenuEditorPage.tsx`,
`core/admin/ui/menus/MenuItemDrawer.tsx`,
`core/admin/ui/menus/MenuItemForm.tsx`,
`core/admin/ui/pages/editor/PageEditorRegistryFields.tsx`,
`core/admin/ui/pages/editorControls/MediaUrlControl.tsx`,
`core/admin/ui/pages/PageTable.tsx`,
`core/admin/ui/posts/editor/PostEditorCanvas.tsx`,
`core/admin/ui/posts/PostsTable.tsx`,
`core/admin/ui/site/SiteSettingsPage.tsx`,
`core/admin/ui/themes/ThemeEditorPage.tsx`,
`core/admin/utils/adminPrefetch.ts`, and
`core/admin/utils/adminPrefetchCustomScreens.ts`. `core/admin/utils/adminPrefetch.ts`
is sole-owned by this leaf for TASK-551 (it consumes six of the eight owned
clients); TASK-551-09-L04 is read-only on this file and composes its
cache-identity hardening through `adminCacheAuthority.ts`. Likewise
`tests/vitest/admin/adminPrefetch.test.ts` (Tests list below) is sole-owned by
this leaf for TASK-551 to carry the default-prefetcher reset-adoption
assertions. Every one of the 78 importers
not listed here is either a non-list-shape consumer (a read-only import whose
list call site does not change) or outside this leaf's ownership. The
implementer reruns the pinned C12 discovery (all three legs, R2-19) before W0
and before closure; a new hit blocks until the orchestrator amends the
envelope, and the implementer never widens the allowlist itself (amended in
place 2026-09-25, R2-25). This set is
rebaselined after TASK-580 deleted `core/admin/ui/widgets/**`; the surviving
Dashboard widget surface (including
`core/admin/ui/dashboard/widgetRenderers.tsx`) imports none of the eight owned
clients and is not in this graph.

**Cohesive UI extractions required before behavior changes:** the existing
`components/ReservationsTab.tsx` already owns the reservation table and row
actions; it receives the new pagination controls and is not duplicated or
renamed. `components/ResourcesTab.tsx` and `components/ServicesTab.tsx` receive
their own list controls, while `AvailabilityTab.tsx` and `SlotPreviewTab.tsx`
consume bounded resource/service picker summaries. To bring the 1,000-line page
under the gate, new `core/admin/ui/booking/BookingOverviewPanel.tsx` owns only
the stat cards, resource list and weekly-calendar presentation (no quick
actions; "New booking" stays in `PageHeader`), `useBookingCollections.ts` owns
the four list fetch/cursor/summary states, and `BookingPage.tsx` retains
cache/mutation/dialog orchestration. `core/admin/ui/media/MediaLibraryFolderState.ts` owns folder-operation types and
pure state helpers, `useMediaFolderOperations.ts` owns folder loading and
operations, while `core/admin/ui/media/MediaLibraryResults.tsx` owns the
grid/list result renderer and page controls formerly embedded in
`MediaLibraryPage.tsx`; `core/admin/ui/users/useUsersRolesCollections.ts` owns
user/role loading and the filter/count derivations (`UsersRolesPage.tsx:165-348`),
and `core/admin/ui/users/UsersRolesContent.tsx` owns the
member/invitation list, role cards, filters, and page controls formerly embedded
in `UsersRolesPage.tsx` (C11 and R2-25; amended in place 2026-09-25). The page modules retain orchestration, cache hydration,
dirty-state guards, dialogs, and selection state. These names are part of the
single-writer allowlist; do not invent generic helper dumping grounds.

Every other touched legacy module above 1,000 lines — or, like
`DetailTemplateEditorPage.tsx` at 952 lines, one the leaf chooses to split for
cohesive growth — is split by these exact cohesive paths before pagination;
originals and extractions must each end at or below 1,000 lines:

| Existing module | Required extraction paths |
|---|---|
| `DetailTemplateEditorPage.tsx` | `DetailTemplateRevisionPanel.tsx` |
| `MenuEditorPage.tsx` | `MenuEditorWorkspace.tsx` (editor frame, add-items rail, canvas, and inspector composition; page retains loading, mutation, dialog, and cache orchestration) |
| `PostEditorCanvas.tsx` | `PostCanvasBlockItem.tsx`; `PostEditorMediaControls.tsx` |

`MenuDesignEditor.tsx` (517 lines) needs no split: TASK-542 already split it
into `MenuDesignEditorCanvas/Controls/BarPanel/BrandNavControls/BlockPanel`
(plus `MenuDesignEditorBlockFields`), so the former
`MenuDesignCanvas`/`MenuDesignInspector`/`MenuDesignDataSources` row is
deleted. C11 below is the complete split table with line budgets.

Each extraction lives beside its named existing module; these resolved exact
paths are also in the single-writer allowlist. The former `core/admin/ui/widgets/**`
editor modules were deleted by TASK-580 (v1 widget system removal), so no
widget-editor extraction paths remain in this leaf's scope.

**Tests:** `tests/integration/routes/task551BoundedAdminLists.test.ts`,
`tests/integration/server/task551AdminWriteConcurrency.test.ts`,
`tests/vitest/admin/task551PaginatedClients.test.ts`,
`tests/vitest/admin/task551PaginatedListViews.test.tsx`,
`tests/vitest/admin/task551PaginatedConsumerGraphScreens.test.tsx`,
`tests/vitest/admin/task551PaginatedConsumerGraphEditors.test.tsx`,
`tests/vitest/admin/formsClient.test.ts`,
`tests/vitest/admin/bookingClient.test.ts`,
`tests/vitest/admin/mediaClient.test.ts`,
`tests/vitest/admin/mediaUtils.test.ts`,
`tests/vitest/admin/pagesClient.test.ts`,
`tests/vitest/admin/pagesClientPagination.test.ts`,
`tests/vitest/admin/detailPagesClient.test.ts`,
`tests/vitest/admin/adminPrefetch.test.ts`,
`tests/vitest/ui/page-revision-drawer.test.tsx`,
`tests/vitest/ui/pageEditorV2Fixtures.tsx`,
`tests/vitest/ui/pageEditorV2FlowHarness.tsx`,
`tests/vitest/ui/pageEditorV2Helpers.tsx`,
`tests/vitest/ui/pageEditorV2Interactions.tsx`,
`tests/vitest/ui/page-editor-v2-flow-autosave.test.tsx`,
`tests/vitest/ui/page-editor-v2-flow-columns.test.tsx`,
`tests/vitest/ui/page-editor-v2-flow-controls.test.tsx`,
`tests/vitest/ui/page-editor-v2-flow-inline-edit.test.tsx`,
`tests/vitest/ui/page-editor-v2-flow-inserters.test.tsx`,
`tests/vitest/ui/page-editor-v2-flow-loading.test.tsx`,
`tests/vitest/ui/page-editor-v2-flow-panels.test.tsx`,
`tests/vitest/ui/page-editor-v2-flow-responsive.test.tsx`,
`tests/vitest/ui/page-editor-v2-flow-sections.test.tsx`,
`tests/vitest/ui/page-editor-v2-flow-settings.test.tsx`,
`tests/vitest/ui/page-editor-v2-flow-toolbar.test.tsx`,
`tests/vitest/ui/detail-template-editor.test.tsx`,
`tests/vitest/ui/bookingPageFixtureState.tsx`,
`tests/vitest/ui/bookingPageFixtureMocks.tsx`,
`tests/vitest/ui/bookingPageFixtureHarness.tsx`,
`tests/vitest/ui/booking-page-wave.test.tsx`,
`tests/vitest/ui/booking-page-errors.test.tsx`,
`tests/vitest/ui/booking-page-schedule-crud.test.tsx`,
`tests/vitest/ui/booking-page-tabs.test.tsx`,
`tests/vitest/ui/booking-tabs-interactions-wave.test.tsx`,
`tests/vitest/ui/booking-tabs-leaf.test.tsx`,
`tests/vitest/ui/booking-helpers.test.ts`,
`tests/vitest/ui/booking-helpers-wave.test.ts`,
`tests/vitest/ui/form-submissions-page.test.tsx`,
`tests/vitest/ui/media-library.test.tsx`,
`tests/vitest/ui/mediaLibraryTestUtils.tsx`,
`tests/vitest/ui/media-library-load-retry-wave.test.tsx`,
`tests/vitest/ui/media-library-mutation-retry-wave.test.tsx`,
`tests/vitest/ui/media-library-page-wave.test.tsx`,
`tests/vitest/ui/media-card.test.tsx`,
`tests/vitest/ui/media-components.test.tsx`,
`tests/vitest/ui/media-details.test.tsx`,
`tests/vitest/ui/media-details-panel.test.tsx`,
`tests/vitest/ui/media-filter-panel.test.tsx`,
`tests/vitest/ui/media-folder-rail.test.tsx`,
`tests/vitest/ui/media-picker.test.tsx`,
`tests/vitest/ui/media-toolbar.test.tsx`,
`tests/vitest/ui/forms-pages-wave.test.tsx`,
`tests/vitest/ui/formsPagesWaveFixtures.tsx`,
`tests/vitest/ui/form-builder-page-wave.test.tsx`,
`tests/vitest/ui/forms-component-wave.test.tsx`,
`tests/vitest/ui/use-forms-wave.test.tsx`,
`tests/vitest/ui-integration/forms-list-restyle.test.tsx`,
`tests/vitest/ui-integration/forms.test.tsx`,
`tests/vitest/ui-integration/forms-submissions-restyle.test.tsx`,
`tests/vitest/validation/task551ListSchemas.test.ts`,
`tests/perf/database-admin-list-budgets.test.ts`, and
`tests/unit/pages/pageRevisionAutosave.test.ts`, plus the C11/C12 test paths.

**Execution-only foreign route suites (TASK-551-09-L01; D1/F-11):**
`tests/integration/routes/bookingRoutes.test.ts` and
`tests/integration/routes/forms.test.ts` are sole-owned by TASK-551-09-L01 for
its existing-dispatcher invalidation regressions. They are execution-only for
this leaf: it reruns them unchanged and never edits them. New booking/forms
list, submission-detail, `ids[]` and export-job route assertions live in
`tests/integration/routes/task551BoundedAdminLists.test.ts`.

No other files may be edited. In particular, TASK-517 owns
`core/services/content/entryService.ts` and `core/server/publicSite.tsx`;
TASK-493 owns GSC/Search Console code; TASK-511 owns backup services; TASK-518
owns its migration files. Schema, migration, search, cache, board, changelog,
and workflow paths are forbidden.

### Terminal TASK-554 Post metadata handoff

TASK-554 terminal is a hard prerequisite. TASK-554 lands first and remains the
sole owner of `core/services/posts/postMetadataContract.ts`, the Post metadata
mutation semantics, and the metadata updater injection in `routes/index.ts`.
This leaf rereads its terminal receipt before touching `routes/index.ts`,
`postsRoutes.ts`, `postSchemas.ts`, or `postsClient.ts`; changes in those files
are restricted to bounded Post list query/schema/envelope/client regions and
must preserve the existing metadata factory injection.
It must preserve TASK-554's exact compatibility re-export of
`postMetadataSchema`, shared `PostMetadataMutationV1` import/re-export,
own-property/present-only projection, root non-empty validation, conditional
`content:publish` middleware, and omission of publication fields from unrelated
metadata saves. Pagination must not add a second metadata DTO/schema or weaken
the writer-versus-publisher boundary.

The bounded list migration must also preserve or adapt TASK-554's narrow local
Post-cache authority contract for its new list key/envelope: `clearPostsCache`
resets detail generations, delete tombstones, row-publication/list epochs, and
in-flight list bookkeeping; a stale list GET merges the current newer detail or
tombstone before it writes and returns; and each accepted current non-delete
detail emits exactly one list `update` followed by one detail `update`, while a
delete emits only the existing ordered invalidates. It must retain the named
TASK-554 deferred list/detail, status-only schedule, tombstone, reset, and
cache-bus race assertions unchanged or update them only through a fresh
TASK-554 contract handoff.

After its list changes, this leaf reruns TASK-554's terminal focused
route/schema/client/RBAC, present-only, and local cache-race tests unchanged.
Any required edit to the metadata contract, conditional middleware, or metadata
client race behavior returns to TASK-554 ownership and blocks this leaf; it is
never folded into a pagination fix.

The only cache/transport handoff exceptions are read-only imports of
`core/admin/utils/adminCacheAuthority.ts`,
`core/admin/services/cachePolicy.ts`, `core/server/router.ts`, and execution of
TASK-551-08-L03's `tests/integration/server/route-response-headers.test.ts`. This leaf edits
none of them; absence or drift of either INITIAL receipt blocks implementation.

The 6,813-line `page-editor-v2-flow.test.tsx` monolith is already absent from
the current tree; its split landed as the independently runnable
`page-editor-v2-flow-*` suites (autosave, columns, controls, inline-edit,
inserters, loading, panels, responsive, sections, settings, toolbar) with
shared builders/fixtures in `pageEditorV2Fixtures.tsx`,
`pageEditorV2FlowHarness.tsx`, `pageEditorV2Helpers.tsx`, and
`pageEditorV2Interactions.tsx`. This leaf rebaselines its ownership to that
actual set and keeps every one of those suites independently runnable and at
most 1,000 physical lines while bounded list/pagination adoption lands.
`pagesClient.test.ts` retains non-pagination CRUD/cache behavior and the new
`pagesClientPagination.test.ts` owns every envelope/cursor/filter test, so the
current 943-line file cannot cross the gate. These are mandatory splits, not
conditional follow-up work.

The current 180-line `forms-pages-wave.test.tsx` and its landed siblings form
the existing split: shared mocks/builders live in `formsPagesWaveFixtures.tsx`,
list/hook behavior is covered by `forms-pages-wave.test.tsx` and
`use-forms-wave.test.tsx`, and builder/detail/component behavior is owned by
`form-builder-page-wave.test.tsx` and `forms-component-wave.test.tsx`. This
leaf adopts that existing split, deletes no legacy monolith, and keeps each
suite independently runnable and at most 1,000 physical lines.

The legacy `booking-page.test.tsx` monolith is already absent; its assertion
groups live in the existing `booking-page-wave.test.tsx` (overview/filters/
pagination), `booking-page-errors.test.tsx`, `booking-page-schedule-crud.test.tsx`,
`booking-page-tabs.test.tsx`, `booking-tabs-interactions-wave.test.tsx`,
`booking-tabs-leaf.test.tsx`, `booking-helpers.test.ts`, and
`booking-helpers-wave.test.ts`. The current 1,123-line `bookingPageFixtures.tsx`
must still cross the 1,000-line gate and is split by exact responsibility:
`bookingPageFixtureState.tsx` owns the hoisted data/cache state factory plus
`getBookingPageState`; `bookingPageFixtureMocks.tsx` owns every `vi.mock`
factory (shared UI, cachePolicy, bookingClient, AdminShell/PageHeader,
cacheBus, and the five booking tab modules); and
`bookingPageFixtureHarness.tsx` owns `mount`/`flush`/`clickByText`. Each new
fixture module is independently importable, has no tests, and stays at most
1,000 physical lines; suites import only the fixture modules they need, and
the 1,123-line file is deleted after the move.

The current 360-line `media-library.test.tsx` is not deleted; it remains the
owned media-library suite alongside its already-landed siblings
`media-library-load-retry-wave.test.tsx` (loading/cache/revalidation),
`media-library-mutation-retry-wave.test.tsx` (upload, edit, delete, progress,
error and dirty-dialog behavior), `media-library-page-wave.test.tsx` (filters,
result modes and first/next/reset/end behavior), `media-card.test.tsx`,
`media-components.test.tsx`, `media-details.test.tsx`,
`media-details-panel.test.tsx`, `media-filter-panel.test.tsx`,
`media-folder-rail.test.tsx` (grid/list selection, folder tree/descendants,
folder mutations and selected-detail boundaries), `media-picker.test.tsx`,
`media-toolbar.test.tsx`, and shared helpers in `mediaLibraryTestUtils.tsx`.
Every one of those suites remains independently runnable and at most 1,000
physical lines. Shared runner manifest reconciliation is deferred only to the
family reconciliation owner; this leaf's explicit commands below already
invoke every owned suite directly.

Every data-sized list uses `{ items, nextCursor, hasMore }`, default 50/max 100.
The only full-array exceptions are service-resource assignments and per-resource
schedules: their writes enforce an exact maximum of 100 rows per parent and
their reads issue `LIMIT 101`, returning at most 100 or failing
`booking_collection_limit_exceeded` on legacy corruption. No UI auto-fetches
pages to reconstruct an array. Timestamp lists use
`ORDER BY <timestamp> DESC, id DESC`. These timestamp columns are currently
`NOT NULL`, so cursors contain no nullable sort slot and a decoded null fails
`cursor_invalid`; optional filters use explicit `IS NULL`/equality but never
change null ordering. Scope is exactly
`admin:<family>:v1:<sha256(canonicalJson(normalized filters))>` and is computed
only after authorization and parent scoping succeed; cursor/filter reuse across scopes fails
`cursor_scope_mismatch` before SQL.
Every paginated family builds one code-owned L01 `KeysetSpec` directly from the
two fields named in its matrix order (`<business field>,id`); `id` is the final
non-null UUID tie-breaker and no request/cursor text selects a column, direction
or null policy. The wire is opaque exact `<payloadB64>.<macB64>`; routes/clients
never decode or reconstruct its strict v1 fields. L01's schema/value/spec/
version/signature/age failures map to generic `cursor_invalid`, while scope
mismatch retains its declared public code. Admin Previous uses a local stack of
previously received forward cursors; it never invents payload fields or offset.

| Family/current route | Narrow list DTO/projection | Auth and normalized DB filters | Order and family scope | Compatibility, errors, owned proof |
|---|---|---|---|---|
| pages `/pages` | `id,title,slug,status,updatedAt,author{id,name,email}`; select encrypted/plain email only to resolve authorized output; omit current/published documents | `content:read`; `q,status,authorId`; an author filter is exactly `author_id=:authorId` before the keyset predicate and consumes `pages_author_list_updated_id_idx` | `updated_at DESC,id DESC`; `pages` | client/page switch atomically from array to envelope; detail/mutations unchanged; route/perf/client/view/schema tests |
| entries `/content-entries` and `/content/:type/entries` | `id,typeId,title,slug,status,visibility,hasPassword,tags,scheduledAt,createdAt,updatedAt,publishedAt,author`; global route also has `contentType{id,slug,name,status}`; omit `data`, `access_password`, SEO/document JSON | `content:read`; global `q,status,typeSlug,authorId,updatedFrom,updatedTo`; resolve `typeSlug` once to `type_id`; typed route first resolves its slug then requires that `type_id`; date bounds retain the current inclusive local-date start/end semantics after strict ISO-date normalization; never select password hash | `updated_at DESC,id DESC`; `entries-all` or `entries-type:<typeId>` | owned clients stop treating list rows as details and fetch detail before edit; missing type keeps `content_type_not_found`; all named tests cover both routes |
| posts `/posts` | `id,typeId:"post",title,slug,status,tags,scheduledAt,createdAt,updatedAt,publishedAt,author`; omit `data,metadata,seo` and revision bodies | `content:read`; `q,status,authorId,tag`; normalize one tag then bind exactly `tags @> :normalizedOneTagArray::jsonb`, consuming `posts_tags_gin_idx` | `updated_at DESC,id DESC`; `posts` | client/view envelope migration in this leaf; detail/mutation responses unchanged; route/perf/client/view/schema tests |
| users `/admin-users` | `id,name,email,status,roleIds,createdAt,updatedAt,lastLoginAt`; omit `password_hash,email_hash,email_encrypted` from returned DTO; roles use aggregate or one bounded batch, never N+1 | `users:read`; `q,status,roleId`; role filtering starts from `user_roles.role_id=:roleId`, joins by `user_id`, and consumes role-leading `user_roles_role_user_idx` | `created_at DESC,id DESC`; `users` | authorized email remains for current UI; raw secret columns never transfer; client/view/schema/route tests pin role and search behavior |
| forms `/forms` and submissions `/forms/:id/submissions` | form list exactly `id,name,slug,status,description,submissionAccess,updatedAt`, omitting settings/schema/actions/success behavior; submission list `id,formId,status,createdAt`, omitting `payload,ip,userAgent` | `forms:read`; form `q,status,submissionAccess`; submission parent `form_id=:id` plus `status,from,to` | forms `updated_at DESC,id DESC`, family `forms`; submissions `created_at DESC,id DESC`, family `form-submissions:<formId>` | `useForms`, `FormListPage`, `FormTable`, and prefetch consume the form envelope; `q` searches name/slug/description and access filtering executes in SQL, never in-memory/N+1; the explicit row-detail contract below is the only submission payload read; direct tests cover both envelopes and lazy detail |
| media `/media` | `id,name,url,originalName,type,mimeType,size,width,height,alt,title,folderId,tags,createdAt`; `name` is a safe server-derived display fallback; omit raw `key,caption,focalX,focalY,description,credit,createdBy` | `media:read`; exact current UX filters are `q,types[],folderId(null|uuid),tags[],alt(any|missing|present),from,to`; `types` is unique/max 2, `tags` is normalized unique/sorted/max 20 and bound once as `tags @> :normalizedUniqueSortedTags::jsonb` for AND semantics, consuming `media_tags_gin_idx`; folder filtering includes descendants from the authorized folder tree, dates are inclusive, and `q` matches display-name sources (`key,originalName,title`) without returning `key` | `created_at DESC,id DESC`; `media` | existing `/media/:id` supplies full edit detail on selection; client/picker/library and `utils.ts` consume the safe summary name and lazy detail without fabricating a key; route/perf/client/view/schema tests |
| bookings `/booking/reservations` | `id,serviceId,resourceId,formSubmissionId,status,customerName,startsAt,endsAt,timezone,createdAt,updatedAt`; omit email, phone, notes, metadata | `booking:read`; existing `resourceId,serviceId,status,from,to` | `starts_at DESC,id DESC`; `booking-reservations` | retain existing `{items}` member and add cursor fields; mutation responses may remain detail but cache stores summary; current status enum only; booking route/perf/client/view/schema tests |
| booking resources `/booking/resources` | `id,name,slug,type,status,timezone,capacity,createdAt,updatedAt`; omit `settings` | `booking:read`; `q,type,status` | `name ASC,id ASC`; `booking-resources` | envelope + visible picker/page load-more; `/booking/resources/:id` and a new matching client point read fetch settings before edit |
| booking services `/booking/services` | `id,name,slug,status,durationMinutes,bufferBeforeMinutes,bufferAfterMinutes,priceCents,currency,submissionAccess,createdAt,updatedAt`; `submissionAccess` is a normalized derived `public|internal` scalar, while `description,settings` remain omitted | `booking:read`; `q,status` | `name ASC,id ASC`; `booking-services` | `ServicesTab` renders its existing Access badge from `submissionAccess`; `/booking/services/:id` point read supplies description/full settings only after Edit |
| service resources `/booking/services/:id/resources` | exact `serviceId,resourceId,isRequired,createdAt`; no joined resource body | `booking:read`; authorized/resolved service parent only | `resource_id ASC`; fixed family `booking-service-resources:<serviceId>` | full array is allowed only under the enforced 100-row parent cap; write rejects 101 before its transaction and legacy read 101 fails closed |
| schedules `/booking/resources/:id/schedules` | exact `id,resourceId,dayOfWeek,startMinute,endMinute,timezone,isAvailable,createdAt,updatedAt` | `booking:read`; authorized/resolved resource parent only | `day_of_week ASC,start_minute ASC,id ASC`; fixed family `booking-schedules:<resourceId>` | full array is allowed only under the enforced 100-row parent cap; replacement write and legacy read use the same ceiling |
| blackouts `/booking/blackouts` | exact `id,resourceId,startsAt,endsAt,reason,createdAt` | `booking:read`; `resourceId(null|uuid),from,to` | `starts_at DESC,id DESC`; `booking-blackouts` | envelope migration in booking client/page; create/delete reset the exact filtered family, never synthesize a full list |

### Lazy submission detail and safe media-name contracts

The submission collection never transfers `payload`, `ip`, or `userAgent`.
`GET /forms/:formId/submissions/:submissionId` is an internal `forms:read`
point read with strict UUID path parameters and exact response
`{id,formId,payload,status,createdAt}`; it applies both `id` and authorized
`form_id`, projects no IP/user-agent field, uses the submission primary key,
and executes exactly one `LIMIT 1` query only after the user expands a row.
Every success and mapped error response from this detail endpoint sets exactly
`Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`, and
`Expires: 0`. The route registers a no-store header handler first—before
permission, strict path validation and detail loading—and that handler calls
only TASK-551-08-L03 INITIAL's closed `ctx.setResponseHeader(...)` seam for the
three exact pairs. This leaf does not edit `core/server/router.ts` or
`core/server/httpServer.ts`; L03 owns the request-local bag and propagation on
JSON success and caught/mapped route errors. Alternate headers/values are not a
fallback. The dedicated `formsClient` point method calls `apiRequest` with
`cache: "no-store"` in its `RequestInit` as well as the caller's abort signal;
neither the generic list client nor prefetch path may call this method.
`FormSubmissionsPage` renders an explicit accessible `View submission` button
with `aria-expanded`/`aria-controls`. One expansion has one single-flight
request and then shows the existing field-label/value presentation. Closing the
row, opening another row, component unmount, logout, or an auth/permission cache
event aborts any request and clears the payload immediately. Detail payloads
exist only in component memory: `formsClient` exposes an uncached point method
and must not write them to memory-global caches, browser cache, local/session
storage, cacheBus payloads, telemetry, or logs. Reopening a closed row performs
one new point query. Initial list render executes zero payload/detail queries,
and bulk/background page refresh never expands rows or prefetches payloads.

`mediaReadService.ts` derives list `name` server-side without returning the raw
storage key. The exact precedence is normalized non-empty `originalName`, then
normalized non-empty `title`, then a sanitized basename of `key`, then
`"asset"`. Basename sanitization strips path segments, control/bidi characters,
slashes/backslashes and dot-segment-only values, normalizes whitespace, and
caps the UTF-8 result at 255 bytes. `mediaClient.ts` owns a distinct
`MediaListItem`; `toMediaItem` in `core/admin/ui/media/utils.ts` consumes its
required `name` directly and never expects or reconstructs `key`. Full media
detail keeps its existing mapper and is fetched only for the selected asset.

The grounded booking component contract uses the files that already exist.
`ReservationsTab` consumes `BookingReservationListItem[]`; `ResourcesTab`
consumes `BookingResourceListItem[]`; and `ServicesTab` consumes
`BookingServiceListItem[]`, including derived `submissionAccess`. Edit handlers
receive an ID, await the matching resource/service point read, and open the form
only with the full detail—no synthetic empty `settings` object. `AvailabilityTab`
and `SlotPreviewTab` consume the bounded resource/service picker summaries;
`bookingHelpers.ts` accepts only the reservation/resource fields it renders.
Every tab has explicit load-more/end/reset state, and none widens a summary type
back to the legacy full record or reconstructs all pages.

### TASK-571 forms export-job route adoption

TASK-571 already landed `core/services/forms/submissionExportJob.ts`
(`createSubmissionExportJob`, `getSubmissionExportJob`,
`getSubmissionExportJobRecord`, `verifySubmissionExportToken`,
`readSubmissionExportArtifact`), `core/server/jobs/submissionExportScheduler.ts`,
the export-job table/migration, and their tests; this leaf imports those
modules read-only and edits neither. Its changelog land-order note defers the
`formsRoutes.ts` rewiring to this single-writer leaf, which decides explicitly
to REPLACE the legacy synchronous `GET /forms/:id/submissions/export` path with
job orchestration: the leaf deletes that route and its
`buildFormSubmissionsExport` import/call, leaving zero production callers of
the legacy synchronous export.

The replacement routes are exactly:
- `POST /forms/:id/submissions/export-job`: internal `forms:read`, shared CSRF,
  `admin_write` rate-limit bucket, strict UUID form path parameter, strict
  reject-unknown body `{format?: "csv"|"json"}` (default `csv`), calls
  `createSubmissionExportJob`, and returns exactly
  `{jobId,status:"queued",token,tokenExpiresAt}`. The raw token is never
  persisted in the response twice, logged, or stored client-side beyond the
  download handoff.
- `GET /forms/:id/submissions/export-job/:jobId`: internal `forms:read`,
  `admin_read` rate-limit bucket, strict UUID path parameters, calls
  `getSubmissionExportJob` after enforcing parent form scoping
  (`job.formId === :id`), and returns only the public status shape
  `{id,formId,format,status,rowCount,bytes,errorCode,tokenExpiresAt,createdBy,createdAt,updatedAt}`;
  it never returns `tokenHash` or `artifactKey`.
- `GET /forms/:id/submissions/export-job/:jobId/download`: internal
  `forms:read`, `admin_read` rate-limit bucket, strict reject-unknown query
  `{token}`, parent form scoping, `status === "done"` required, then
  `getSubmissionExportJobRecord` + `verifySubmissionExportToken` (constant-time,
  TTL-checked) + `readSubmissionExportArtifact` before streaming the artifact.
  Token/artifact failures map to the existing export-job errors without leaking
  the token, artifact path, or SQL in errors/logs.

`formSchemas.ts` gains the three strict reject-unknown schemas; `formsClient.ts`
replaces `exportFormSubmissions` with `createFormSubmissionsExportJob`,
`getFormSubmissionsExportJob`, and `downloadFormSubmissionsExport`;
`FormSubmissionsPage.tsx` migrates atomically from the synchronous export to
create, bounded-backoff status poll, then token-guarded download, with visible
progress/error/retry state and zero polling after unmount. The TASK-571
scheduler keeps dispatching queued jobs; this leaf adds no timer, worker, or
prune call.

## Global Summary and Relation-Facet Contract

Pagination must not turn whole-authorized-collection indicators into page-local
values, but bounded page work must not be mislabeled as an exact arbitrary-filter
count. Every metric-bearing response is
`{items,nextCursor,hasMore,summary,facets}` and every summary/facet carries an
explicit `exactness`, `freshness`, and `scope` contract. In v1 arbitrary
`q`/status/type/author/date/folder/tag/access combinations return
`matchingTotal:null`, `exactness:"not_computed"`; the UI uses page length plus
`hasMore` (for example “50 shown, more available”), never a guessed total.
No filtered `COUNT(*)` is issued. An exact matching total may be added only for a
separately enumerated predicate/cardinality with its own L05 rows/buffers/p95
receipt; v1 enumerates none.

The fixed collection-global fields below ignore current row filters while
retaining tenant, authorization and resolved-parent scope. They are exact at one
read-only repeatable-read transaction snapshot, not “constant work”: one explicit
aggregate may read proportionally to authorized collection cardinality. This
no-migration leaf introduces no counter table. If later scale needs maintained
counters, schema plus every mutation must land atomically in a dedicated task.
Typed entry/form-submission summaries remain authorized-parent-global.

The fixed summary shapes are:

```ts
type AdminListEnvelope<Item, Summary, Facets> = Readonly<{
  items: readonly Item[];
  nextCursor: string | null;
  hasMore: boolean;
  summary: Summary;
  facets: Facets;
}>;
type SummaryContract = Readonly<{
  matching: Readonly<{
    exactness: "not_computed"; freshness: "request_page";
    scope: "normalized_filter";
  }>;
  fixed: Readonly<{
    exactness: "exact"; freshness: "transaction_snapshot";
    scope: "authorized_collection_global" | "authorized_parent_global";
    asOf: string;
  }>;
}>;
type PageListSummary = Readonly<{
  matchingTotal: null; total: number; contract: SummaryContract;
  status: { published: number; draft: number; scheduled: number; archived: number };
}>;
type PostListSummary = Readonly<{
  matchingTotal: null; total: number; contract: SummaryContract;
  status: { published: number; draft: number; scheduled: number };
}>;
type EntryListSummary = Readonly<{
  matchingTotal: null; total: number; contract: SummaryContract;
  status: { published: number; draft: number; scheduled: number; archived: number };
}>;
type FormListSummary = Readonly<{
  matchingTotal: null; total: number; active: number; drafts: number;
  contract: SummaryContract;
}>; // active means status=published, matching the existing cards
type FormSubmissionListSummary = Readonly<{
  matchingTotal: null; total: number; rollingSevenDays: number; spam: number;
  asOf: string; contract: SummaryContract;
}>; // the existing "This week" card is a rolling seven-day window
type UserListSummary = Readonly<{
  matchingTotal: null; total: number; active: number; inactive: number;
  pending: number; members: number; invitations: number;
  administratorCount: number; soleAdministratorId: string | null;
  contract: SummaryContract;
}>;
type MediaListSummary = Readonly<{
  matchingTotal: null; totalAssets: number; totalBytes: number;
  type: { image: number; file: number };
  contract: SummaryContract;
}>;
type BookingReservationListSummary = Readonly<{
  matchingTotal: null; total: number; today: number; upcoming: number;
  resourceCount: number; asOf: string; contract: SummaryContract;
}>;
type BookingResourceListSummary = Readonly<{ matchingTotal: null; total: number; contract: SummaryContract }>;
type BookingServiceListSummary = Readonly<{ matchingTotal: null; total: number; contract: SummaryContract }>;
type BookingBlackoutListSummary = Readonly<{ matchingTotal: null; total: number; contract: SummaryContract }>;
```

`rollingSevenDays` uses one operation clock and `created_at >= asOf - 7 days`.
Booking `today` compares each reservation's calendar date in its own stored IANA
timezone with `asOf` in that same timezone, preserving `isReservationToday`;
`upcoming` is `starts_at > asOf`. The operation clock is injected/frozen in
tests. Media bytes are `coalesce(sum(size),0)` over every authorized asset.
User `members` is every non-pending user, `invitations` equals pending, and
`soleAdministratorId` is non-null only when exactly one user has an assigned
role whose permissions contain `*` or whose normalized name is `admin`. This is
UI defense-in-depth; mutation services still enforce the invariant in the DB.

Existing variable facets are global, not derived from `items`. They use one
optional third, set-based relation query and these exact bounded pages:

```ts
type FacetContract = Readonly<{
  exactness: "exact";
  freshness: "transaction_snapshot";
  scope: "authorized_collection_global" | "authorized_parent_global";
  asOf: string;
}>;
type FacetPage<T> = Readonly<{
  items: readonly T[];
  nextCursor: string | null;
  hasMore: boolean;
  contract: FacetContract;
}>; // default 50, max 100, query uses LIMIT + 1
type AuthorFacet = Readonly<{ id: string; label: string }>;
type ContentTypeFacet = Readonly<{
  id: string; slug: string; name: string; entryCount: number;
}>;
type RoleFacet = Readonly<{ id: string; name: string; usageCount: number }>;
type MediaFolderFacet = Readonly<{
  id: string; name: string; recursiveItemCount: number;
}>;
type MediaTagFacet = Readonly<{ value: string; usageCount: number }>;

type PageListFacets = Readonly<{ authors: FacetPage<AuthorFacet> }>;
type PostListFacets = Readonly<{ authors: FacetPage<AuthorFacet> }>;
type EntryListFacets = Readonly<{
  authors: FacetPage<AuthorFacet>;
  contentTypes: FacetPage<ContentTypeFacet>;
}>;
type UserListFacets = Readonly<{ roles: FacetPage<RoleFacet> }>;
type MediaListFacets = Readonly<{
  folders: FacetPage<MediaFolderFacet>;
  tags: FacetPage<MediaTagFacet>;
}>;
type NoListFacets = Readonly<Record<never, never>>;
```

Initial entry/media facet pages are produced by one `UNION ALL` relation query
with an independent `LIMIT 51` per fixed discriminator, so at most 102 relation
rows transfer. Other families transfer at most 51. A strict follow-up accepts
only the family's declared `facetKind,facetQ,facetCursor,facetLimit`; it returns
one requested facet page and never causes the UI to auto-fetch the rest.
Authors are the globally authorized authors that own at least one scoped row and
sort by label/id. Content types include authorized zero-entry types and their
global scoped counts. Role facets/usage require both `users:read` and
`roles:read`; without `roles:read`, the exact `roles` page is empty and the
existing role filter/editor remains unavailable. Media tags are distinct and
folders include descendant counts from the authorized tree. Variable values are
keyset-paged and searchable; no JSON aggregate or map may grow with table size.
Forms, form submissions and booking collections use `NoListFacets`; booking
resource/service selectors are their own bounded endpoints.

The page, fixed summary and optional facet statements run through one explicit
read-only `REPEATABLE READ` transaction handle so `summary.contract.fixed.asOf`
and every `FacetContract.asOf` identify the same snapshot. One statement returns
`limit + 1` page rows, one returns the single fixed aggregate row using
`COUNT(*) FILTER (...)`/`SUM`, and at most one returns the bounded relation-facet
batch. The query-count ceiling is therefore 3 including role/author/content-
type/folder/tag resolution; no hidden per-row query or filtered-count statement
is allowed. These are exactly the 32 planned Admin statement IDs/symbols in
TASK-551-01 and the 32 Admin members of TASK-551-05-L02's closed 37-ID registry.

After those 32 production builders land, but before this leaf accepts any
production/static behavior result, it consumes the L02 fixture artifact
read-only and enforces this handoff gate:

- Render every landed Admin SQL string with the fixed placeholder mapping of
  its matching `task551-admin-read-v1` L02 shape, then compare its UTF-8 bytes
  and lowercase SHA-256 digest exactly to that shape's canonical template and
  published digest. Normalized, parsed, whitespace-insensitive, partial, or
  anonymous-string comparisons do not satisfy this gate.
- Read the two `TASK551_DATABASE_FREEZE_RECEIPT` records, one for each profile.
  Each must be `reviewed`; its canonical contract, fixture, schema, runner, and
  reviewable-receipt digests must be current; and its sanitized context and
  calibration must validate. This leaf neither writes, re-reviews, nor repairs
  that artifact.
- Independently enforce all eight L02 numeric ceilings for every exact
  shape/profile pair: query count, rows read, rows returned, transferred bytes,
  shared buffers, and normalized p50, p95, and p99. A subset such as only
  rows/buffers/p95 is invalid.

The 32-member Admin equality contract remains distinct from TASK-551-05-L02's
37-member plan registry; this handoff neither adds an Admin variant nor consumes
one of its five preserved non-Admin members. The aggregate receipt may honestly
budget a scan proportional to the 100,000-row authorized fixture, but it cannot
use “one result row” as a bounded-work claim. Any missing receipt, stale handoff,
unexpected growing-table scan, or failed numeric ceiling blocks L02 and returns
to the evidence owner for a contract amendment; this leaf neither adds a
speculative index nor silently removes a metric/facet.

Clients cache the row page, fixed global summary and each facet page under
separate canonical filter/authorization/parent identities, then compose the
response envelope. `matchingTotal:null` has no cache family. Mutations invalidate
and broadcast all three related families atomically. Pages/posts/entries status
tabs, form/submission/user stat
cards, member/invitation badges, role usage, media type/folder/tag counts,
storage bytes/assets and booking cards consume only `summary`/`facets`, never
`items.length` as a global count or a concatenated hidden page set. Media renders
“X shown, more available” from page length plus `hasMore` and may separately
label `totalAssets` as the exact authorized collection total; it never presents
that value as a filtered match count. Submission pagination follows the same
shown/more contract and labels `summary.total` only as the exact parent-global
total.

All strict paginated query schemas accept only their matrix filters plus
`cursor,limit` and the declared strict facet-navigation fields above; unknowns
return existing `validation_error` 400. The centralized
bounded-read mapper maps `page_limit_invalid`, `cursor_invalid`, and
`cursor_scope_mismatch` to same-code 400 `ApiError` without echoing the cursor.
There is no raw-array or heavy-field production fallback; owned clients and UI
are changed in the same leaf. No client may auto-fetch all pages, truncate to a
first page, or re-wrap an envelope as an array. Screens, pickers, editor
selectors, preview hooks, and prefetch carry explicit envelope state,
server-side filters/search, and visible next/load-more/reset behavior.
`formReadService.ts` is the sole bounded form-list query owner. The old
`formsService.listForms()` is not called by any route/client after this leaf and
is recorded by final TASK-551-01 inventory as terminally deprecated/unused; this
leaf does not edit TASK-551-external legacy behavior or paginate in memory.
`FormListItem` is distinct from the full `FormRecord`; list cache entries,
`useForms`, `FormListPage`, and `FormTable` use only its seven exact fields.
Create/update/detail responses may keep the full form record, but list refreshes
always enter `formReadService` with normalized `q,status,submissionAccess`
filters. No caller fetches one detail per row to recover an omitted list field.
`bookingReadService.ts` owns every booking collection query above. Slot preview
is not a pagination escape hatch: input range is at most 31 days and output is
hard capped at 500 ordered slots, with `booking_slot_limit_exceeded` on a larger
computed set rather than truncation.

## Implementation Pseudocode

```ts
// core/server/routes/index.ts module body. Importing httpServer.ts evaluates
// this before prod reaches startRuntimeLifecycle(); registration reads no env.
registerPaginationCursorLifecycleParticipant();

async function listPages(
  input: StrictPageQuery,
  deps: ReadDeps,
): Promise<AdminListEnvelope<PageListItem, PageListSummary, PageListFacets>> {
  await requirePermission(deps.actor, "content:read");
  const normalizedFilters = normalizePageListFilters(input); // excludes cursor/limit/facet nav
  const scope = `admin:pages:v1:${sha256(canonicalJson(normalizedFilters))}`;
  const limit = parsePageLimit(input.limit);
  const paginationCursorKeys = requirePaginationCursorKeyring();
  const cursor = input.cursor
    ? decodeKeysetCursor(input.cursor, scope, paginationCursorKeys)
    : null;
  return deps.db.transaction(
    { isolationLevel: "repeatable read", readOnly: true },
    async (tx) => {
      const asOf = deps.clock.now().toISOString();
      const [rows, fixedSummary, authors] = await Promise.all([
        selectPageListRows(tx, {
          filters: normalizedFilters, cursor, limitPlusOne: limit + 1,
        }),
        selectPageListFixedSummary(tx, {
          authorization: authorizedPageScope(deps.actor),
          // Exactly total plus four status counts; no filter COUNT.
        }),
        selectPageAuthorFacetPage(tx, {
          authorization: authorizedPageScope(deps.actor),
          facet: normalizePageAuthorFacetNavigation(input),
          limitPlusOne: resolveFacetLimit(input.facetLimit) + 1,
        }),
      ]); // exactly 3 tx statements; no filtered COUNT or relation N+1
      return {
        ...toBoundedPage(rows, limit, (payload) =>
          encodeKeysetCursor(payload, paginationCursorKeys)),
        summary: toPageSummary(fixedSummary, { matchingTotal: null, asOf }),
        facets: { authors: toFacetPage(authors, { asOf }) },
      };
    },
  );
}

async function createBooking(command: BookingCommand, tx: Tx): Promise<Booking> {
  // Validate first, acquire a stable resource/day advisory lock, write once.
  // Map the named exclusion/unique conflict already landed by 551-05-L01 to
  // booking_conflict; do not recreate its constraint or migration here.
}

async function listForms(
  input: StrictFormQuery,
  deps: ReadDeps,
): Promise<AdminListEnvelope<FormListItem, FormListSummary, NoListFacets>> {
  const filters = normalizeFormListFilters(input); // q/status/submissionAccess
  const limit = parsePageLimit(input.limit);
  return deps.db.transaction(
    { isolationLevel: "repeatable read", readOnly: true },
    async (tx) => {
      const [rows, fixedSummary] = await Promise.all([
        selectFormListRows(tx, {
          filters, cursor: input.cursor, limitPlusOne: limit + 1,
        }),
        selectFormListFixedSummary(tx, {
          scope: authorizedFormScope(deps.actor),
        }),
      ]);
      // formsService.listForms is never imported/materialized; callers never
      // issue per-row detail reads to restore omitted list fields.
      return {
        ...toBoundedPage(rows, limit, encodeFormCursor),
        summary: toFormSummary(fixedSummary, { matchingTotal: null }),
        facets: {},
      };
    },
  );
}

async function getFormSubmissionDetail(
  formId: string,
  submissionId: string,
  deps: ReadDeps,
): Promise<FormSubmissionDetail> {
  await requirePermission(deps.actor, "forms:read");
  const row = await deps.db.select(FORM_SUBMISSION_DETAIL_COLUMNS)
    .from(formSubmissions)
    .where(and(eq(formSubmissions.id, submissionId), eq(formSubmissions.formId, formId)))
    .limit(1);
  if (!row[0]) throw new Error("form_submission_not_found");
  return row[0]; // exact id,formId,payload,status,createdAt; never IP/userAgent
}

const installSubmissionDetailNoStoreHeaders: RouteHandler = (ctx) => {
  ctx.setResponseHeader("Cache-Control", "private, no-store, max-age=0");
  ctx.setResponseHeader("Pragma", "no-cache");
  ctx.setResponseHeader("Expires", "0");
};
router.get(
  "/forms/:formId/submissions/:submissionId",
  installSubmissionDetailNoStoreHeaders, // deliberately first
  requirePermission("forms:read"),
  validateSubmissionDetailPath,
  loadSubmissionDetail,
);

function deriveMediaListName(row: Pick<MediaRow, "originalName" | "title" | "key">): string {
  return normalizeDisplayName(row.originalName)
    ?? normalizeDisplayName(row.title)
    ?? sanitizeStorageKeyBasename(row.key)
    ?? "asset";
}

async function listParentCappedBookingRows<T>(input: {
  parentId: string;
  maxRows: 100;
  select: (limit: 101) => Promise<readonly T[]>;
}): Promise<readonly T[]> {
  const rows = await input.select(101);
  if (rows.length > input.maxRows) throw new Error("booking_collection_limit_exceeded");
  return rows;
}

async function rotateSession(command: RotateSession, tx: Tx): Promise<Session> {
  // Conditional UPDATE/DELETE or row lock; never accept stale/revoked state.
}

async function updateUserRoles(command: UserRoleCommand, tx: Tx): Promise<UserRoleResult> {
  // Lock the target user/role assignment set in stable ID order, re-check the
  // expected state, apply set-based inserts/deletes in this transaction, and
  // throw role_assignment_conflict when a concurrent state no longer matches.
}
```

Implement the same projection/keyset shape for entries, posts, users, forms,
form submissions, media, reservations, booking resources/services/blackouts,
and the two exact parent-capped booking collections above. Every SQL helper
name, projection, predicate/order, output bound and rendered byte string equals
its L01 planned-shape row. Once the 32 builders exist, their rendered SQL must
also pass the L02 fixed-placeholder, canonical-template, and digest comparison
defined above before production/static behavior tests run; the 32-member set is
exact, so inline or merged anonymous statements fail. Keep
`bookingService.ts` as a compatibility
facade after extracting read/mutation/schedule modules; all four files must be
under 1,000 physical lines. Route code validates and maps known domain errors;
admin clients concatenate/invalidate pages without overwriting dirty state.
This leaf also adopts TASK-551-06-L02's family-specific page/detail revision
service envelopes. `PageRevisionSummary` is exactly
`{id,pageId,version,kind,title,slug,createdAt,createdBy:{id,name,email}|null}`;
`DetailPageRevisionSummary` is exactly
`{id,detailPageId,version,kind,createdAt,createdBy:string|null}`. Their envelopes
are respectively `{items:PageRevisionSummary[],nextCursor,hasMore}` and
`{items:DetailPageRevisionSummary[],nextCursor,hasMore}`; no union erases the
parent/author difference and neither summary contains `data` or `document`.
Both list routes validate only `cursor,limit`, authorize the parent first,
derive exact scope
`revision:<family>:v1:<sha256(canonicalJson({parentId}))>`, and return
`{items,nextCursor,hasMore}`. `pagesClient.ts`, `detailPagesClient.ts`,
`PageRevisionDrawer.tsx`, and `DetailTemplateEditorPage.tsx` migrate atomically;
there is no raw-array revision response and summaries never contain snapshot
bytes. Full revision bodies remain point reads. These route/schema/client/UI
files have no other TASK-551 writer.
This leaf is the sole TASK-551 writer of the complete
`core/server/routes/index.ts`. Its module body calls only L01's idempotent
`registerPaginationCursorLifecycleParticipant()` before either TASK-551-02
prod/dev adapter reaches the generic lifecycle start. Do not add a required
cursor field to central `RouteDeps`: that would make the existing
`httpServer.ts` caller fail before this leaf and would recreate a later
composition dependency. Individual
route handlers call `requirePaginationCursorKeyring()` only when serving a
bounded cursor operation, then pass that immutable typed value into their read
service operation. This leaf never calls `loadPaginationCursorKeyring`, never
reads `process.env`, and never creates a fallback key. Missing state fails closed
rather than constructing a route with weak/default secret material. Later
TASK-551-08-L03 must preserve the `routes/index.ts` import and already-registered
participant; it neither reloads nor reinjects the keyring.

Before adding pagination behavior, perform the named Booking, Media Library,
and Users/Roles UI extractions above and prove their existing render/action
contracts unchanged. Pagination state then belongs in the extracted result
components, while cache identity and mutation state remain in their page owner.

## Testing Requirements

- Seed small and large fixtures with equal sort timestamps; traverse every page
  and prove exact set equality, stable order, no offset SQL, and no duplicates.
- A table-driven seven-family contract suite pins every projection key, omitted
  heavy/secret column, permission and parent predicate, accepted filter, exact
  scope string, non-null timestamp/id ordering, 50/100 limits, response envelope,
  compatibility handoff, and error mapping from the matrix above.
- Extend that table to every booking row above and the form-list owner. Prove
  resources/services/blackouts traverse all pages without gaps; association and
  schedule writes accept 0/100 and reject 101 before SQL, reads issue `LIMIT 101`
  and fail on 101 legacy rows, and slot preview accepts 500/rejects 501 without
  returning a truncated array.
- Assert list projections omit document blobs, password/session hashes, secret
  settings, and unrelated columns.
- Count SQL per endpoint (`<= 3`) and assert `LIMIT <= 101`; invalid cursor,
  unknown filters, and limit 0/101 fail before DB execution.
- Source/plan guards pin `author_id=:authorId`, role-leading
  `user_roles.role_id=:roleId`, one-element post `tags @> ...::jsonb`, and
  sorted/unique media AND `tags @> ...::jsonb` byte shapes. On L01 large
  fixtures, sanitized plans use respectively
  `pages_author_list_updated_id_idx`, `user_roles_role_user_idx`,
  `posts_tags_gin_idx`, and `media_tags_gin_idx`; alternate JSON/text predicates
  or reversed role traversal fail before latency evidence is accepted.
- For every exact summary/facet shape, seed at least 137 scoped rows so the
  result spans three default pages. First, middle, last and filtered requests
  must return identical fixed global counts/facets and
  `matchingTotal:null`; normalized filters affect rows/`hasMore` but issue no
  filtered-count SQL. Assert the summary `fixed` and every facet report exact /
  transaction-snapshot / authorized-global scope with the same `asOf`, one
  fixed aggregate row, each facet page at most 100 plus lookahead, total SQL
  `<= 3`, and zero page concatenation or per-row relation lookup. Mutate each
  status/type/access/date/timezone/role/folder/tag case in the global scope and
  prove the corresponding fixed field changes by exactly one.
- The performance suite enumerates exactly the 32 planned page/list/fixed-
  summary/facet fingerprints. Before execution, each must resolve to its
  reviewed, canonical-digest-current and context/calibration-valid L02
  small/large `TASK551_DATABASE_FREEZE_RECEIPT` handoff, while each landed SQL
  string must exactly match its L02 canonical template/digest through the fixed
  placeholder mapping. A missing/placeholder receipt or any byte mismatch fails
  before execution. Assertions independently enforce query count, rows read,
  rows returned, transferred bytes, shared buffers, and normalized p50/p95/p99
  for every statement and profile; they do not collapse the aggregate's one
  returned row into a rows-read assertion.
- Pin page/post/entry global author facets, entry zero-count content types, user
  global role usage and sole-administrator identity, media global bytes/kinds/
  recursive-folder/tag facets, form and rolling-seven-day submission cards, and
  booking today/upcoming/resource counts. Use multiple reservation timezones and
  a frozen boundary clock. Missing `roles:read` returns an empty role facet with
  no role name/usage leakage, while service-side sole-admin protection remains.
- Route-registration integration proves importing the HTTP route index calls the
  idempotent registration seam before either prod/dev lifecycle start/listen
  without reading env; missing/weak config rejects start, and a cursor operation
  before start/after close fails `pagination_cursor_keyring_unavailable` with
  zero DB queries. Repeated route imports/registration create one participant.
- Race concurrent booking creation, session rotation/revocation, and role
  updates; exactly one incompatible mutation wins and losers get stable
  `booking_conflict`, session-conflict, or `role_assignment_conflict` responses
  through centralized route mapping without partial writes.
- UI/client tests cover first/next/reset, filter invalidation, empty/end pages,
  cache hydration, background refresh, and dirty-state protection. With more
  than one page, changing pages must leave every global tab/card/facet/storage/
  booking value unchanged; changing a row filter changes rows/`hasMore`, keeps
  `matchingTotal:null`, and preserves fixed totals. Mutation tests invalidate
  row-page, fixed-summary and facet cache families and reject any global metric
  derived from `items.length`.
- Each of the eight owned clients registers a reset with the L04 INITIAL
  authority (`registerAdminModuleCacheReset`) and guards every promise
  completion/cache install with a token captured before the await
  (`captureAdminCacheInstallationToken` /
  `isCurrentAdminCacheInstallationToken`); this leaf's suites prove it by
  calling `advanceAdminCacheInstallationAuthority()` and asserting all module
  maps/promises are cleared and a delayed pre-transition completion cannot
  install; L04 FINAL's matrix enrols these receipts later.
- The two consumer-graph suites directly import and exercise every production
  path in the complete graph above. For every changed call they prove envelope
  consumption, filter forwarding, incremental merge/reset, visible end/loading
  state, and zero auto-fetch-all/raw-array/truncation. The five existing
  page/detail revision suites directly pin both revision envelopes, summary/body
  separation, cursor forwarding/reset, and lazy point detail. Split any test
  suite before 1,000 lines without dropping a mapped consumer.
- Assert no production import/call of `formsService.listForms` remains and the
  final inventory disposition is `deprecated-unused`; `formReadService` performs
  the only form collection SQL and never receives a preloaded array. Direct
  route/service/client/list-page/table tests pin the exact seven-key
  `FormListItem`, server-side `q,status,submissionAccess` forwarding, visible
  slug/description/access rendering, and zero per-row detail queries.
- Form-submission route/client/UI tests pin the strict parent+submission point
  schema, exact five-field detail response, one indexed SQL statement, stable
  404, omission of IP/user-agent, and the exact private/no-store, pragma, and
  expires headers on success plus every route-mapped 4xx through the real HTTP
  server. They prove the L03-owned request-local transport does not leak headers
  to an unrelated request and the detail route calls only the exact closed
  setter pairs. A client fetch spy asserts
  `RequestInit.cache === "no-store"`; omitting it fails even when server headers
  remain correct. With at least three list pages, initial
  load/filter/page/background refresh executes zero payload reads. Clicking
  `View submission` executes exactly one request/query for that expanded row;
  duplicate clicks single-flight, and close/other-row/unmount/logout/permission
  transition aborts and erases payload memory. Reopen issues one new query.
  Browser/local/session/cacheBus/telemetry spies observe zero payload bytes.
- Form export-job route/schema/client/UI tests pin the strict create/status/
  download schemas, parent form scoping, `forms:read` plus CSRF and
  admin-write/admin-read buckets, the exact create response
  `{jobId,status:"queued",token,tokenExpiresAt}`, status polling that never
  returns `tokenHash`/`artifactKey`, done-only constant-time token-guarded
  download with TTL expiry, and zero remaining production callers of the
  legacy synchronous export path. TASK-571's
  `tests/unit/forms/submissionExportJob.test.ts` reruns unchanged.
- Media route/client/utils tests pin `originalName -> title -> sanitized key
  basename -> asset` for empty, Unicode, 255-byte, nested path, traversal,
  control and bidi fixtures. List JSON and client/cache values contain the
  derived `name` and no raw `key`; `toMediaItem` accepts `MediaListItem` without
  a cast/fabricated key, while selected detail still maps through its full type.
- Booking client/page/tab/helper suites compile against the three list-item
  types and exercise all five existing tab modules. Access badges read only
  derived `submissionAccess`; resource/service Edit performs one point read
  before opening; pagination controls visibly load/reset/end without synthetic
  settings, array widening, auto-fetch-all, or first-page truncation.
- Extraction tests pin the existing booking reservation actions, media
  grid/list selection, and member/role actions before and after pagination;
  each extracted file remains independently importable and focused.
- With `playwright-cli -s=wf55103l02`, run at least five distinct visible-effect
  scenarios: (1) next/previous changes the rendered page rows and disabled/ARIA
  pagination state while global tabs/cards/facets remain byte-identical; (2)
  filter change resets to the first rendered page, changes the shown/more state,
  keeps `matchingTotal` explicitly unavailable, and preserves global totals; (3)
  equal-sort boundary traversal shows no duplicate or missing visible row; (4)
  booking mutation refreshes the affected rendered page without overwriting
  dirty UI state; and (5) Booking, Media, and Users/Roles extracted views retain
  their visible actions and geometry in both light and dark themes. Assert DOM/
  geometry/ARIA effects, zero console errors, and save human-review screenshots
  below `_docs/_workflows/_smoke/task-551/03-l02/`. Smoke evidence is written by
  the task workflow, not by the implementation leaf's source allowlist.

## Security Contract

- Existing `/admin/api/*` routes remain internal: session auth, current RBAC,
  CSRF on writes, existing admin read/write rate-limit buckets, and strict
  reject-unknown request schemas.
- This leaf adds no public writes. Existing public booking nonce/signature or
  CAPTCHA/access-evaluator policy is preserved exactly; do not weaken it.
- Submission payload detail remains internal `forms:read`, parent-scoped and
  user-triggered. It is never prefetched, persisted, broadcast, logged, or
  placed in a server/browser cache; server responses are `private, no-store`
  and the client request uses `cache:"no-store"`. Abort/close/auth transition
  clears it. The route's first handler uses only L03's closed response-header
  setter; no arbitrary header or transport ownership moves into this leaf.
- Authorization filters are applied inside each query before limit/cursor;
  cursors are scope-bound, signed by the L01 keyring, age-limited, and never
  grant access or expose hidden columns. Missing/weak key configuration prevents
  the paginated server from accepting traffic. Route/read code obtains the
  installed immutable value only through `requirePaginationCursorKeyring()` and
  never reads env or invents a fallback.
- Summary aggregates and facet queries apply the identical tenant, parent, and
  row-authorization predicate before counting or grouping. They may neither
  reveal counts for unauthorized rows nor expose role labels/usage without
  `roles:read`; an unauthorized relation facet is the declared empty page.
- Known conflicts map through centralized route error helpers; SQL/details,
  binds, cursor payloads, session material, and PII are not logged.
- Form export jobs remain internal `forms:read`: shared CSRF on create,
  `admin_write` bucket on create, `admin_read` on status/download, strict
  reject-unknown schemas, and the download token is server-verified
  (constant-time hash, TTL) and never logged, cached, or re-issued. The
  TASK-571 scheduler remains the sole job dispatcher; this leaf edits no
  export-job service, scheduler, table, or migration file.
- Admin client module caches are availability optimizations only. L04's opaque
  installation token/reset seam prevents pre-transition promises from writing
  into a later deployment/auth audience; these clients do not infer RBAC from a
  cache hit.

## Validation Commands

**The fence is authoritative.** The JSON envelope fence under "Workflow
Dispatch Envelope" is the only machine authority for command ids, argv,
profiles, paths and `minimum`s. This section was REGENERATED in place from
that fence on 2026-09-25 (Round 4, R4-11); where it and the fence ever
differ, the fence wins and this section is regenerated, never hand-patched.
The wave column follows C14 v4 (Round 4). The superseded prose is quoted in
the Round-4 section ("R4-11").

Envelope counts: allowlist 321, forbiddenPaths 52, commands 34; INITIAL 30 ids,
FINAL 11 ids.

**Closed environment maps** (the orchestrator builds them; agents never
source `.env` for a gated command):

- `<none-env>` (every `bun-test`/`vitest` command with profile `none`, R3-29):
  `env -i PATH=<PATH> HOME=<HOME> DATABASE_URL=postgresql://127.0.0.1:1/none`.
  No other key is set.
- `<db-env>` (profile `task551-db-test`, R2-08, R3-35, R4-14): `env -i
  PATH=<PATH> HOME=<HOME> DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_URL=<URL3>
  TASK551_FIXTURE_DATABASE_NAME=coderso02
  TASK551_FIXTURE_DATABASE_SENTINEL=task551-fixture-sentinel-2026-09-25-coderso02-orchestrator
  PAGINATION_CURSOR_SECRET=<from .env>`. `DB_MAINTENANCE_URL`,
  `DB_MAINTENANCE_MODE`, `DATABASE_DIRECT_URL`, `PII_HASH_KEY` and
  `PII_ENC_KEY` are never set (owned suites seed test-only PII keys with `||=`).
- `tooling` and `runtime-smoke` commands run their literal argv with cwd =
  this worktree. The two smokes are the only users of the shared
  `DATABASE_URL`.

**Commands** (envelope order: the INITIAL ids, then the FINAL-only ids).
Each `argv` line is the exact JSON array from the fence.

- `bounded-admin-list-bun-tests` — lane `bun-test`, profile `task551-db-test`, environment `<db-env>`, discovery test-paths, `minimum` 4, argv 7 tokens; waves: W1, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "test", "tests/integration/routes/task551BoundedAdminLists.test.ts", "tests/integration/routes/bookingRoutes.test.ts", "tests/integration/routes/forms.test.ts", "tests/integration/server/task551AdminWriteConcurrency.test.ts"]
  ```

- `route-response-header-receipt` — lane `bun-test`, profile `none`, environment `<none-env>`, discovery test-paths, `minimum` 1, argv 4 tokens; waves: W1, INITIAL closure, FINAL.

  ```text
  ["bun", "--env-file=/dev/null", "test", "tests/integration/server/route-response-headers.test.ts"]
  ```

- `pagination-cursor-lifecycle-receipt` — lane `bun-test`, profile `none`, environment `<none-env>`, discovery test-paths, `minimum` 1, argv 4 tokens; waves: W1, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "test", "tests/integration/runtime/paginationCursorLifecycle.test.ts"]
  ```

- `submission-export-job-receipt` — lane `bun-test`, profile `task551-db-test`, environment `<db-env>`, discovery test-paths, `minimum` 1, argv 4 tokens; waves: W1, INITIAL closure, FINAL.

  ```text
  ["bun", "--env-file=/dev/null", "test", "tests/unit/forms/submissionExportJob.test.ts"]
  ```

- `test551-db-unit` — lane `bun-test`, profile `task551-db-test`, environment `<db-env>`, discovery test-paths, `minimum` 3, argv 6 tokens; waves: W0, W1, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "test", "tests/unit/pages/pageRevisionAutosave.test.ts", "tests/unit/pages/pageService.test.ts", "tests/unit/admin/rolesService.test.ts"]
  ```

- `admin-write-regression-receipt` — lane `bun-test`, profile `task551-db-test`, environment `<db-env>`, discovery test-paths, `minimum` 6, argv 9 tokens; waves: W1, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "test", "tests/unit/booking/bookingService.test.ts", "tests/unit/server/publicBookingApi.test.ts", "tests/unit/auth/sessionService.test.ts", "tests/unit/admin/usersService.test.ts", "tests/integration/routes/adminUsers.test.ts", "tests/integration/routes/adminRoles.test.ts"]
  ```

- `w0-revision-vitest` — lane `vitest`, profile `none`, environment `<none-env>`, discovery test-paths, `minimum` 46, argv 50 tokens; waves: W0, W3, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/pagesClientPagination.test.ts", "tests/vitest/admin/detailPagesClient.test.ts", "tests/vitest/ui/page-revision-drawer.test.tsx", "tests/vitest/ui/page-editor-revision-history.test.tsx", "tests/vitest/ui/detail-template-editor-revisions.test.tsx", "tests/vitest/pages/page-editor-host-contract.test.ts", "tests/vitest/admin/pagesClient.test.ts", "tests/vitest/ui/detail-template-editor.test.tsx", "tests/vitest/ui/page-editor-shell-revisions-wave.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-revisions-flow.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-revisions-flow.test.tsx", "tests/vitest/ui/page-authoring-canvas-branches-wave.test.tsx", "tests/vitest/ui/page-editor-builder-chrome-flow.test.tsx", "tests/vitest/ui/page-editor-columns-beside-flow.test.tsx", "tests/vitest/ui/page-editor-controls-flow.test.tsx", "tests/vitest/ui/page-editor-failures-flow.test.tsx", "tests/vitest/ui/page-editor-inline-edit-flow.test.tsx", "tests/vitest/ui/page-editor-insertion-flow.test.tsx", "tests/vitest/ui/page-editor-panels-flow.test.tsx", "tests/vitest/ui/page-editor-responsive-panel-flow.test.tsx", "tests/vitest/ui/page-editor-settings-flow.test.tsx", "tests/vitest/ui/page-editor-shell-branches-wave.test.tsx", "tests/vitest/ui/page-editor-shell-flow.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-flow.test.tsx", "tests/vitest/ui/page-editor-v2-controls-flow.test.tsx", "tests/vitest/ui/page-editor-v2-flow-autosave.test.tsx", "tests/vitest/ui/page-editor-v2-flow-columns.test.tsx", "tests/vitest/ui/page-editor-v2-flow-controls.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inline-edit.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inserters.test.tsx", "tests/vitest/ui/page-editor-v2-flow-loading.test.tsx", "tests/vitest/ui/page-editor-v2-flow-panels.test.tsx", "tests/vitest/ui/page-editor-v2-flow-responsive.test.tsx", "tests/vitest/ui/page-editor-v2-flow-sections.test.tsx", "tests/vitest/ui/page-editor-v2-flow-settings.test.tsx", "tests/vitest/ui/page-editor-v2-flow-toolbar.test.tsx", "tests/vitest/ui/page-editor-v2-inline-edit-flow.test.tsx", "tests/vitest/ui/page-editor-v2-layout-flow.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-flow.test.tsx", "tests/vitest/ui/page-editor-v2-responsive-flow.test.tsx", "tests/vitest/ui/page-editor-v2-settings-flow.test.tsx", "tests/vitest/ui/task-539-page-editor-flow.test.tsx", "tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx", "tests/vitest/ui/menu-design-editor.test.tsx", "tests/vitest/ui/page-editor-facade.test.ts", "tests/vitest/ui-integration/engine-detail-template-restyle.test.tsx"]
  ```

- `w0-smoke-inventory` — lane `bun-test`, profile `none`, environment `<none-env>`, discovery test-paths, `minimum` 1, argv 4 tokens; waves: W0, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "test", "tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts"]
  ```

- `admin-pagination-vitest-1` — lane `vitest`, profile `none`, environment `<none-env>`, discovery test-paths, `minimum` 124, argv 128 tokens; waves: W3, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/task551PaginatedClients.test.ts", "tests/vitest/admin/task551PaginatedListViews.test.tsx", "tests/vitest/admin/task551PaginatedConsumerGraphScreens.test.tsx", "tests/vitest/admin/task551PaginatedConsumerGraphEditors.test.tsx", "tests/vitest/admin/formsClient.test.ts", "tests/vitest/admin/bookingClient.test.ts", "tests/vitest/admin/mediaClient.test.ts", "tests/vitest/admin/mediaUtils.test.ts", "tests/vitest/admin/pagesClient.test.ts", "tests/vitest/admin/pagesClientPagination.test.ts", "tests/vitest/admin/detailPagesClient.test.ts", "tests/vitest/admin/adminPrefetch.test.ts", "tests/vitest/ui/page-revision-drawer.test.tsx", "tests/vitest/ui/page-editor-v2-flow-autosave.test.tsx", "tests/vitest/ui/page-editor-v2-flow-columns.test.tsx", "tests/vitest/ui/page-editor-v2-flow-controls.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inline-edit.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inserters.test.tsx", "tests/vitest/ui/page-editor-v2-flow-loading.test.tsx", "tests/vitest/ui/page-editor-v2-flow-panels.test.tsx", "tests/vitest/ui/page-editor-v2-flow-responsive.test.tsx", "tests/vitest/ui/page-editor-v2-flow-sections.test.tsx", "tests/vitest/ui/page-editor-v2-flow-settings.test.tsx", "tests/vitest/ui/page-editor-v2-flow-toolbar.test.tsx", "tests/vitest/ui/detail-template-editor.test.tsx", "tests/vitest/ui/booking-page-wave.test.tsx", "tests/vitest/ui/booking-page-errors.test.tsx", "tests/vitest/ui/booking-page-schedule-crud.test.tsx", "tests/vitest/ui/booking-page-tabs.test.tsx", "tests/vitest/ui/booking-tabs-interactions-wave.test.tsx", "tests/vitest/ui/booking-tabs-leaf.test.tsx", "tests/vitest/ui/booking-helpers.test.ts", "tests/vitest/ui/booking-helpers-wave.test.ts", "tests/vitest/ui/form-submissions-page.test.tsx", "tests/vitest/ui/media-library.test.tsx", "tests/vitest/ui/media-library-load-retry-wave.test.tsx", "tests/vitest/ui/media-library-mutation-retry-wave.test.tsx", "tests/vitest/ui/media-library-page-wave.test.tsx", "tests/vitest/ui/media-card.test.tsx", "tests/vitest/ui/media-components.test.tsx", "tests/vitest/ui/media-details.test.tsx", "tests/vitest/ui/media-details-panel.test.tsx", "tests/vitest/ui/media-filter-panel.test.tsx", "tests/vitest/ui/media-folder-rail.test.tsx", "tests/vitest/ui/media-picker.test.tsx", "tests/vitest/ui/media-toolbar.test.tsx", "tests/vitest/ui/forms-pages-wave.test.tsx", "tests/vitest/ui/form-builder-page-wave.test.tsx", "tests/vitest/ui/forms-component-wave.test.tsx", "tests/vitest/ui/use-forms-wave.test.tsx", "tests/vitest/ui-integration/forms-list-restyle.test.tsx", "tests/vitest/ui-integration/forms.test.tsx", "tests/vitest/ui-integration/forms-submissions-restyle.test.tsx", "tests/vitest/validation/task551ListSchemas.test.ts", "tests/vitest/admin/adminUsersClient.test.ts", "tests/vitest/admin/entriesClientMutationReconciliation.test.ts", "tests/vitest/admin/entriesClientReadAuthority.test.ts", "tests/vitest/admin/entriesClient.test.ts", "tests/vitest/admin/postsClientCacheAuthority.test.ts", "tests/vitest/admin/postsClient.test.ts", "tests/vitest/mediaUi/mediaLibrary.test.tsx", "tests/vitest/pages/task-539-page-editor-controls.test.ts", "tests/vitest/ui/content-entries.test.tsx", "tests/vitest/ui/custom-screen-entry-navigation-authority.test.tsx", "tests/vitest/ui/custom-screen-records.test.tsx", "tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx", "tests/vitest/ui/drawer-sheet-a11y-gate.test.tsx", "tests/vitest/ui/entry-create-drawer-required-fields.test.tsx", "tests/vitest/ui/entry-field-relation-interaction.test.tsx", "tests/vitest/ui/entry-field-relation-option-identity.test.tsx", "tests/vitest/ui/entry-field-renderer-wave.test.tsx", "tests/vitest/ui/entry-list-filters.test.ts", "tests/vitest/ui/entry-list-wave.test.tsx", "tests/vitest/ui/entry-page-support-wave.test.tsx", "tests/vitest/ui/form-list-page-wave.test.tsx", "tests/vitest/ui-integration/admin-screens-restyle.test.tsx", "tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx", "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx", "tests/vitest/ui-integration/custom-screen-entries-restyle.test.tsx", "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx", "tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx", "tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx", "tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx", "tests/vitest/ui-integration/engine-detail-template-restyle.test.tsx", "tests/vitest/ui-integration/entry-list-restyle.test.tsx", "tests/vitest/ui-integration/media-restyle.test.tsx", "tests/vitest/ui-integration/media.test.tsx", "tests/vitest/ui-integration/post-editor-canvas-shared.test.tsx", "tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx", "tests/vitest/ui-integration/post-editor-toolbar-inspector-dedup.test.tsx", "tests/vitest/ui-integration/post-list-restyle.test.tsx", "tests/vitest/ui-integration/roles.test.tsx", "tests/vitest/ui-integration/users.test.tsx", "tests/vitest/ui/menu-design-editor-revalidation.test.tsx", "tests/vitest/ui/menu-design-editor.test.tsx", "tests/vitest/ui/menu-editor-refresh-policy.test.tsx", "tests/vitest/ui/menu-editor-shell-wave.test.tsx", "tests/vitest/ui/menu-editor.test.tsx", "tests/vitest/ui/menu-editor-validation.test.ts", "tests/vitest/ui/page-editor-facade.test.ts", "tests/vitest/ui/page-editor-failures-flow.test.tsx", "tests/vitest/ui/page-editor-gallery-items-control.test.tsx", "tests/vitest/ui/page-editor-insertion-flow.test.tsx", "tests/vitest/ui/page-editor-media-url-control.test.tsx", "tests/vitest/ui/page-editor-shell-branches-wave.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-flow.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-flow.test.tsx", "tests/vitest/ui/page-leaf-components.test.tsx", "tests/vitest/ui/page-list-cache-behavior.test.tsx", "tests/vitest/ui/page-list-filters.test.ts", "tests/vitest/ui/page-list-residual-wave.test.tsx", "tests/vitest/ui/page-list.test.tsx", "tests/vitest/ui/page-list-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-blocks-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-embeds-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-media-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-panels-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-toolbar-profile-routing.test.tsx", "tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx", "tests/vitest/ui/post-list-wave.test.tsx", "tests/vitest/ui/posts-list.test.tsx", "tests/vitest/ui/theme-editor-page-leaf.test.tsx", "tests/vitest/ui/theme-editor-page-wave.test.tsx", "tests/vitest/ui/users-roles-page-wave.test.tsx"]
  ```

- `admin-pagination-vitest-2` — lane `vitest`, profile `none`, environment `<none-env>`, discovery test-paths, `minimum` 30, argv 34 tokens; waves: W3, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/ui/users-roles.test.tsx", "tests/vitest/ui/use-screen-related-entries.test.tsx", "tests/vitest/admin/entriesClientRevisions.test.ts", "tests/vitest/customScreens/relatedEntryResolver.test.ts", "tests/vitest/ui/page-editor-revision-history.test.tsx", "tests/vitest/ui/post-editor-media-controls.test.tsx", "tests/vitest/ui/users-roles-extraction.test.tsx", "tests/vitest/ui/menu-design-editor-responsive.test.tsx", "tests/vitest/ui/menu-design-editor-nav-levels.test.tsx", "tests/vitest/ui/menu-design-editor-dropdown-bar.test.tsx", "tests/vitest/ui/users-roles-page-pagination-wave.test.tsx", "tests/vitest/ui/use-screen-related-entries-ids.test.tsx", "tests/vitest/ui/entry-field-renderer-relation-ids-wave.test.tsx", "tests/vitest/ui/page-editor-shell-revisions-wave.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-revisions-flow.test.tsx", "tests/vitest/ui/entry-list-pagination-wave.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-revisions-flow.test.tsx", "tests/vitest/ui/detail-template-editor-revisions.test.tsx", "tests/vitest/ui/media-library-mutation-pagination-wave.test.tsx", "tests/vitest/pages/task-539-page-editor-media-controls.test.ts", "tests/vitest/admin/mediaClientListEnvelope.test.ts", "tests/vitest/ui/forms-component-list-wave.test.tsx", "tests/vitest/admin/entriesClientPagination.test.ts", "tests/vitest/ui/page-editor-insertion-media-flow.test.tsx", "tests/vitest/ui-integration/custom-screen-task-540-list-flow.test.tsx", "tests/vitest/ui/site-settings.test.tsx", "tests/vitest/ui-integration/settings-general-site-restyle.test.tsx", "tests/vitest/ui/custom-screen-list-view.test.ts", "tests/vitest/ui/page-editor-settings-flow.test.tsx", "tests/vitest/ui/menu-item-form.test.tsx"]
  ```

- `owned-module-consumers-vitest-1` — lane `vitest`, profile `none`, environment `<none-env>`, discovery test-paths, `minimum` 30, argv 34 tokens; waves: W3, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/adminApp.test.tsx", "tests/vitest/admin/formRuntimePreviewDialog.test.tsx", "tests/vitest/admin/legacy-widget-surface-retired.test.ts", "tests/vitest/content/entryReadServiceVisibilityProbe.test.ts", "tests/vitest/customScreens/customScreenSummaryContract.test.ts", "tests/vitest/forms/formSettings.test.ts", "tests/vitest/forms/formSupportingText.test.ts", "tests/vitest/pages/page-template-editor-wave.test.tsx", "tests/vitest/services/mediaSchemas.test.ts", "tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx", "tests/vitest/ui-integration/custom-screen-runtime-interactions.test.tsx", "tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx", "tests/vitest/ui-integration/engine-collection-workspace-restyle.test.tsx", "tests/vitest/ui-integration/entry-editor-hydration-race.test.tsx", "tests/vitest/ui-integration/entry-editor-navigation-guard.test.tsx", "tests/vitest/ui-integration/entry-editor-restyle.test.tsx", "tests/vitest/ui-integration/entry-editor-submit-authority.test.tsx", "tests/vitest/ui-integration/form-supporting-text.test.tsx", "tests/vitest/ui-integration/forms-action-logs-restyle.test.tsx", "tests/vitest/ui-integration/forms-builder-restyle.test.tsx", "tests/vitest/ui/access-logs-table.test.tsx", "tests/vitest/ui/access-logs.test.tsx", "tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx", "tests/vitest/ui/collection-workspace.test.tsx", "tests/vitest/ui/custom-screen-entry-draft.test.ts", "tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx", "tests/vitest/ui/custom-screen-list-view-canvas.test.tsx", "tests/vitest/ui/custom-screen-preview-data.test.ts", "tests/vitest/ui/custom-screen-sidebar-shortcut-state.test.ts", "tests/vitest/ui/custom-screens-list-wave.test.tsx"]
  ```

- `owned-module-consumers-vitest-2` — lane `vitest`, profile `none`, environment `<none-env>`, discovery test-paths, `minimum` 29, argv 33 tokens; waves: W3, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/ui/entry-editor-shell-wave.test.tsx", "tests/vitest/ui/entry-editor-visibility-groups.test.tsx", "tests/vitest/ui/entry-field-relation.test.tsx", "tests/vitest/ui/entry-list-visibility-view.test.tsx", "tests/vitest/ui/entry-revision-drawer.test.tsx", "tests/vitest/ui/entry-table-title.test.tsx", "tests/vitest/ui/entry-table-wave.test.tsx", "tests/vitest/ui/form-action-logs-page.test.tsx", "tests/vitest/ui/form-actions-panel.test.tsx", "tests/vitest/ui/menu-leaf-components.test.tsx", "tests/vitest/ui/page-authoring-canvas.test.tsx", "tests/vitest/ui/page-editor-control-primitives.test.tsx", "tests/vitest/ui/page-editor-layout-shell.test.tsx", "tests/vitest/ui/page-table-wave.test.tsx", "tests/vitest/ui/page-table.test.tsx", "tests/vitest/ui/panel-leaf-wave-2.test.tsx", "tests/vitest/ui/post-document-inspector-wave.test.tsx", "tests/vitest/ui/post-editor-save-sync.test.ts", "tests/vitest/ui/posts-editor-chrome-wave.test.tsx", "tests/vitest/ui/posts-table-wave.test.tsx", "tests/vitest/ui/use-entry-hooks-wave.test.tsx", "tests/vitest/ui/usePostEditorState-barriers.test.tsx", "tests/vitest/ui/usePostEditorState-cross-epoch.test.tsx", "tests/vitest/ui/usePostEditorState-crud.test.tsx", "tests/vitest/ui/usePostEditorState-debt.test.tsx", "tests/vitest/ui/usePostEditorState-identity.test.tsx", "tests/vitest/ui/usePostEditorState-revisions.test.tsx", "tests/vitest/ui/usePostEditorState-save-ordering.test.tsx", "tests/vitest/validation/bookingSchemas.test.ts"]
  ```

- `owned-module-consumers-bun` — lane `bun-test`, profile `task551-db-test`, environment `<db-env>`, discovery test-paths, `minimum` 41, argv 44 tokens; waves: W1, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "test", "tests/integration/routes/contentEntriesRoutes.test.ts", "tests/integration/routes/contentTypeConfigRoundTrip.test.ts", "tests/integration/routes/contentTypes.test.ts", "tests/integration/routes/detailPages.test.ts", "tests/integration/routes/formSupportingTextRoutes.test.ts", "tests/integration/routes/media-folders.test.ts", "tests/integration/routes/media.test.ts", "tests/integration/routes/pages.test.ts", "tests/integration/routes/popups-public.test.ts", "tests/integration/routes/seo-pipeline.test.ts", "tests/integration/routes/userSettings.test.ts", "tests/integration/runtime/detail-page-runtime-lite.test.ts", "tests/integration/runtime/entry-visibility-gate.test.ts", "tests/integration/runtime/task-539-page-parity-runtime.test.ts", "tests/integration/server/entry-access-password-hash.test.ts", "tests/integration/server/formsWriteMounts.test.ts", "tests/security/installAdmin.test.ts", "tests/security/seo-pipeline.test.ts", "tests/unit/access/accessLogExport.test.ts", "tests/unit/access/accessLogService.test.ts", "tests/unit/auth/loginAlert.test.ts", "tests/unit/auth/sessionCookieOptions.test.ts", "tests/unit/backups/backupUsersSection.test.ts", "tests/unit/content/entryServiceFacadeFence.test.ts", "tests/unit/kits/nativeCmsWriterFenceInventory.test.ts", "tests/unit/pages/validation.test.ts", "tests/unit/runtime-smoke/detail-page-v2-adapter.test.ts", "tests/unit/runtime-smoke/repository-report.test.ts", "tests/unit/runtime-smoke/routing-settings-lease.test.ts", "tests/unit/runtime-smoke/task-493-adapter.test.ts", "tests/unit/runtime-smoke/task-554-adapter.test.ts", "tests/unit/runtime-smoke/task517-browser-actions.test.ts", "tests/unit/runtime-smoke/task547-cleanup-batch.test.ts", "tests/unit/runtime-smoke/widget-contract-admin-probe.test.ts", "tests/unit/runtime-smoke/widget-contract-fixtures.test.ts", "tests/unit/runtime-smoke/widget-contract-inventory.test.ts", "tests/unit/security/csrf.test.ts", "tests/unit/server/publicFormsApi.test.ts", "tests/unit/server/schemaValidator.test.ts", "tests/unit/workflows/task554WorkflowContracts.test.ts", "tests/integration/routes/pageTemplates.test.ts"]
  ```

- `admin-prefetch-budget-receipt` — lane `bun-test`, profile `none`, environment `<none-env>`, discovery test-paths, `minimum` 1, argv 4 tokens; waves: W2, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "test", "tests/perf/admin-prefetch-budget.test.ts"]
  ```

- `admin-prefetch-policy-receipt` — lane `vitest`, profile `none`, environment `<none-env>`, discovery test-paths, `minimum` 1, argv 5 tokens; waves: W2, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/admin-prefetch-policy.test.ts"]
  ```

- `w2-client-vitest` — lane `vitest`, profile `none`, environment `<none-env>`, discovery test-paths, `minimum` 17, argv 21 tokens; waves: W2, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/task551PaginatedClients.test.ts", "tests/vitest/admin/pagesClient.test.ts", "tests/vitest/admin/pagesClientPagination.test.ts", "tests/vitest/admin/detailPagesClient.test.ts", "tests/vitest/admin/entriesClient.test.ts", "tests/vitest/admin/entriesClientPagination.test.ts", "tests/vitest/admin/entriesClientRevisions.test.ts", "tests/vitest/admin/entriesClientMutationReconciliation.test.ts", "tests/vitest/admin/entriesClientReadAuthority.test.ts", "tests/vitest/admin/postsClient.test.ts", "tests/vitest/admin/postsClientCacheAuthority.test.ts", "tests/vitest/admin/adminUsersClient.test.ts", "tests/vitest/admin/formsClient.test.ts", "tests/vitest/admin/mediaClient.test.ts", "tests/vitest/admin/mediaClientListEnvelope.test.ts", "tests/vitest/admin/bookingClient.test.ts", "tests/vitest/admin/adminPrefetch.test.ts"]
  ```

- `task554-regression-vitest` — lane `vitest`, profile `none`, environment `<none-env>`, discovery test-paths, `minimum` 8, argv 12 tokens; waves: W2, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/validation/postSchemas.test.ts", "tests/vitest/server/postMetadataContract.test.ts", "tests/vitest/server/requestBody.test.ts", "tests/vitest/ui/post-metadata-mutation-payload.test.ts", "tests/vitest/ui/post-external-update-authority.test.ts", "tests/vitest/ui/post-classic-editor-shell-wave.test.tsx", "tests/vitest/ui/post-classic-metadata-hydration.test.tsx", "tests/vitest/ui/post-editor-state-metadata-boundary.test.ts"]
  ```

- `task554-regression-bun` — lane `bun-test`, profile `task551-db-test`, environment `<db-env>`, discovery test-paths, `minimum` 3, argv 6 tokens; waves: W1, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "test", "tests/integration/routes/postsRoutes.test.ts", "tests/integration/routes/postMetadataRbac.test.ts", "tests/unit/auth/rbac.test.ts"]
  ```

- `runtime-smoke-registry-tests` — lane `bun-test`, profile `none`, environment `<none-env>`, discovery test-paths, `minimum` 4, argv 7 tokens; waves: W4, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "test", "tests/unit/runtime-smoke/task-551-admin-lists-adapter.test.ts", "tests/unit/runtime-smoke/cli-registry.test.ts", "tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts", "tests/unit/runtime-smoke/task-551-admin-lists-worker.test.ts"]
  ```

- `admin-list-performance-test` — lane `bun-test`, profile `task551-db-test`, environment `<db-env>`, discovery test-paths, `minimum` 1, argv 4 tokens; waves: W1, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "test", "tests/perf/database-admin-list-budgets.test.ts"]
  ```

- `database-explain-plans-receipt` — lane `bun-test`, profile `none`, environment `<none-env>`, discovery test-paths, `minimum` 1, argv 4 tokens; waves: W1, INITIAL closure.

  ```text
  ["bun", "--env-file=/dev/null", "test", "tests/perf/database-explain-plans.test.ts"]
  ```

- `core-lint-types` — lane `tooling`, profile `none`, environment literal argv (no env wrapper), discovery not-applicable, argv 4 tokens; waves: W0, W1, W3, INITIAL closure, FINAL.

  ```text
  ["bun", "--cwd", "core", "lint:types"]
  ```

- `core-lint` — lane `tooling`, profile `none`, environment literal argv (no env wrapper), discovery not-applicable, argv 4 tokens; waves: W0, W1, W3, INITIAL closure, FINAL.

  ```text
  ["bun", "--cwd", "core", "lint"]
  ```

- `repo-lint-types` — lane `tooling`, profile `none`, environment literal argv (no env wrapper), discovery not-applicable, argv 4 tokens; waves: W0, W1, W3, INITIAL closure, FINAL.

  ```text
  ["./node_modules/.bin/tsc", "-p", "tsconfig.json", "--noEmit"]
  ```

- `diff-check` — lane `tooling`, profile `none`, environment literal argv (no env wrapper), discovery not-applicable, argv 3 tokens; waves: W4, INITIAL closure, FINAL.

  ```text
  ["git", "diff", "--check"]
  ```

- `diff-check-untracked` — lane `tooling`, profile `none`, environment literal argv (no env wrapper), discovery not-applicable, argv 4 tokens; waves: W4, INITIAL closure, FINAL.

  ```text
  ["bun", "--env-file=/dev/null", "-e", "const listed = Bun.spawnSync([\"git\", \"ls-files\", \"-z\", \"--others\", \"--exclude-standard\", \"--\", \"core\", \"scripts\", \"tests\"]); if (listed.exitCode !== 0) throw new Error(\"git ls-files failed\"); const bad = []; for (const path of listed.stdout.toString().split(\"\\0\").filter(Boolean)) { const text = await Bun.file(path).text(); const lines = text.split(\"\\n\"); lines.forEach((line, index) => { if (/[ \\t\\r]+$/.test(line)) bad.push(`${path}:${index + 1}: trailing whitespace`); if (/^ +\\t/.test(line)) bad.push(`${path}:${index + 1}: space before tab`); if (/^(<{7}|={7}|>{7})( |$)/.test(line)) bad.push(`${path}:${index + 1}: conflict marker`); }); if (/\\n\\n$/.test(text)) bad.push(`${path}: blank line at EOF`); } if (bad.length > 0) { console.error(bad.join(\"\\n\")); process.exit(1); }"]
  ```

- `line-count-1` — lane `tooling`, profile `none`, environment literal argv (no env wrapper), discovery not-applicable, argv 128 tokens; waves: W4, INITIAL closure.

  ```text
  ["wc", "-l", "core/services/pages/pageReadService.ts", "core/services/content/entryReadService.ts", "core/services/content/postReadService.ts", "core/services/admin/userReadService.ts", "core/services/forms/formReadService.ts", "core/services/forms/submissionReadService.ts", "core/services/media/mediaReadService.ts", "core/services/booking/bookingReadService.ts", "core/services/booking/bookingMutationService.ts", "core/services/booking/bookingScheduleService.ts", "core/services/booking/bookingService.ts", "core/services/admin/usersService.ts", "core/services/auth/sessionService.ts", "core/server/routes/index.ts", "core/server/routes/pageRoutes.ts", "core/server/routes/detailPageRoutes.ts", "core/server/routes/contentEntryRoutes.ts", "core/server/routes/postsRoutes.ts", "core/server/routes/adminUsersRoutes.ts", "core/server/routes/formsRoutes.ts", "core/server/routes/mediaRoutes.ts", "core/server/routes/bookingRoutes.ts", "core/server/validation/pageSchemas.ts", "core/server/validation/detailPageSchemas.ts", "core/server/validation/contentSchemas.ts", "core/server/validation/postSchemas.ts", "core/server/validation/adminUserSchemas.ts", "core/server/validation/formSchemas.ts", "core/server/validation/mediaSchemas.ts", "core/server/validation/bookingSchemas.ts", "core/admin/services/pagesClient.ts", "core/admin/services/detailPagesClient.ts", "core/admin/services/entriesClient.ts", "core/admin/services/postsClient.ts", "core/admin/services/adminUsersClient.ts", "core/admin/services/formsClient.ts", "core/admin/services/mediaClient.ts", "core/admin/services/bookingClient.ts", "core/admin/ui/pages/PageListPage.tsx", "core/admin/ui/pages/PageRevisionDrawer.tsx", "core/admin/ui/pages/PageTable.tsx", "core/admin/ui/pages/editor/PageEditorRegistryFields.tsx", "core/admin/ui/pages/editorControls/MediaUrlControl.tsx", "core/admin/ui/content-types/DetailTemplateEditorPage.tsx", "core/admin/ui/content-types/DetailTemplateInspector.tsx", "core/admin/ui/content-types/DetailTemplateRevisionPanel.tsx", "core/admin/ui/entries/EntryList.tsx", "core/admin/ui/entries/EntryGrid.tsx", "core/admin/ui/entries/EntryTable.tsx", "core/admin/ui/entries/FieldRenderer.tsx", "core/admin/ui/posts/PostsListPage.tsx", "core/admin/ui/posts/PostsTable.tsx", "core/admin/ui/posts/editor/PostEditorCanvas.tsx", "core/admin/ui/posts/editor/PostEditorMediaControls.tsx", "core/admin/ui/users/UsersRolesPage.tsx", "core/admin/ui/users/UsersRolesContent.tsx", "core/admin/ui/forms/FormListPage.tsx", "core/admin/ui/forms/FormTable.tsx", "core/admin/ui/forms/FormSubmissionsPage.tsx", "core/admin/ui/forms/hooks/useForms.ts", "core/admin/ui/media/MediaLibraryPage.tsx", "core/admin/ui/media/MediaLibraryFolderState.ts", "core/admin/ui/media/MediaLibraryResults.tsx", "core/admin/ui/media/MediaPicker.tsx", "core/admin/ui/media/utils.ts", "core/admin/ui/booking/BookingPage.tsx", "core/admin/ui/booking/BookingOverviewPanel.tsx", "core/admin/ui/booking/bookingHelpers.ts", "core/admin/ui/booking/bookingTypes.ts", "core/admin/ui/booking/components/AvailabilityTab.tsx", "core/admin/ui/booking/components/ReservationsTab.tsx", "core/admin/ui/booking/components/ResourcesTab.tsx", "core/admin/ui/booking/components/ServicesTab.tsx", "core/admin/ui/booking/components/SlotPreviewTab.tsx", "core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx", "core/admin/ui/custom-screens/CustomScreenEntriesTable.tsx", "core/admin/ui/custom-screens/customScreenListModel.ts", "core/admin/ui/custom-screens/customScreenPreviewData.ts", "core/admin/ui/custom-screens/hooks/useScreenEntryPresentationMedia.ts", "core/admin/ui/custom-screens/hooks/useScreenRelatedEntries.ts", "core/admin/ui/custom-screens/ListViewCanvas.tsx", "core/admin/ui/menus/MenuDesignEditor.tsx", "core/admin/ui/menus/MenuDesignEditorBrandNavControls.tsx", "core/admin/ui/menus/MenuEditorPage.tsx", "core/admin/ui/menus/MenuEditorWorkspace.tsx", "core/admin/ui/menus/MenuItemDrawer.tsx", "core/admin/ui/menus/MenuItemForm.tsx", "core/admin/ui/site/SiteSettingsPage.tsx", "core/admin/ui/themes/ThemeEditorPage.tsx", "core/admin/utils/adminPrefetch.ts", "core/admin/utils/adminPrefetchCustomScreens.ts", "core/admin/services/adminListEnvelope.ts", "core/admin/services/entriesClientPagination.ts", "core/admin/ui/shared/useBoundedAdminList.ts", "core/admin/ui/shared/BoundedListFooter.tsx", "core/admin/ui/pages/editor/pageEditorHostContract.ts", "core/admin/ui/pages/editor/usePageEditorController.ts", "core/admin/ui/pages/editor/usePageEditorRevisions.ts", "core/admin/ui/pages/editor/PageEditorToolbar.tsx", "core/admin/ui/pages/editor/PageEditorToolbarRevisions.tsx", "core/admin/ui/pages/editor/PageEditorSettingsPanel.tsx", "core/admin/ui/pages/editor/PageEditorHistorySheet.tsx", "core/admin/ui/pages/editor/PageEditorRegistryPickers.tsx", "core/admin/ui/media/useMediaFolderOperations.ts", "core/admin/ui/booking/useBookingCollections.ts", "core/admin/ui/posts/editor/PostCanvasBlockItem.tsx", "core/admin/ui/users/useUsersRolesCollections.ts", "core/admin/ui/site/SiteSettingsPagePickers.tsx", "core/admin/ui/custom-screens/useCustomScreenEntryList.ts", "core/server/routes/boundedReadErrors.ts", "core/services/customScreens/relatedEntryResolver.ts", "scripts/runtime-smoke/contracts.ts", "scripts/runtime-smoke/registry.ts", "scripts/runtime-smoke/cli.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/contracts.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/fixtures.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/browser-plan.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/suite.ts", "tests/integration/routes/task551BoundedAdminLists.test.ts", "tests/integration/server/task551AdminWriteConcurrency.test.ts", "tests/vitest/admin/task551PaginatedClients.test.ts", "tests/vitest/admin/task551PaginatedListViews.test.tsx", "tests/vitest/admin/task551PaginatedConsumerGraphScreens.test.tsx", "tests/vitest/admin/task551PaginatedConsumerGraphEditors.test.tsx", "tests/vitest/admin/formsClient.test.ts"]
  ```

- `line-count-2` — lane `tooling`, profile `none`, environment literal argv (no env wrapper), discovery not-applicable, argv 128 tokens; waves: W4, INITIAL closure.

  ```text
  ["wc", "-l", "tests/vitest/admin/bookingClient.test.ts", "tests/vitest/admin/mediaClient.test.ts", "tests/vitest/admin/mediaUtils.test.ts", "tests/vitest/admin/pagesClient.test.ts", "tests/vitest/admin/pagesClientPagination.test.ts", "tests/vitest/admin/detailPagesClient.test.ts", "tests/vitest/admin/adminPrefetch.test.ts", "tests/vitest/ui/page-revision-drawer.test.tsx", "tests/vitest/ui/pageEditorV2Fixtures.tsx", "tests/vitest/ui/pageEditorV2FlowHarness.tsx", "tests/vitest/ui/pageEditorV2Helpers.tsx", "tests/vitest/ui/pageEditorV2Interactions.tsx", "tests/vitest/ui/page-editor-v2-flow-autosave.test.tsx", "tests/vitest/ui/page-editor-v2-flow-columns.test.tsx", "tests/vitest/ui/page-editor-v2-flow-controls.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inline-edit.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inserters.test.tsx", "tests/vitest/ui/page-editor-v2-flow-loading.test.tsx", "tests/vitest/ui/page-editor-v2-flow-panels.test.tsx", "tests/vitest/ui/page-editor-v2-flow-responsive.test.tsx", "tests/vitest/ui/page-editor-v2-flow-sections.test.tsx", "tests/vitest/ui/page-editor-v2-flow-settings.test.tsx", "tests/vitest/ui/page-editor-v2-flow-toolbar.test.tsx", "tests/vitest/ui/detail-template-editor.test.tsx", "tests/vitest/ui/bookingPageFixtureState.tsx", "tests/vitest/ui/bookingPageFixtureMocks.tsx", "tests/vitest/ui/bookingPageFixtureHarness.tsx", "tests/vitest/ui/booking-page-wave.test.tsx", "tests/vitest/ui/booking-page-errors.test.tsx", "tests/vitest/ui/booking-page-schedule-crud.test.tsx", "tests/vitest/ui/booking-page-tabs.test.tsx", "tests/vitest/ui/booking-tabs-interactions-wave.test.tsx", "tests/vitest/ui/booking-tabs-leaf.test.tsx", "tests/vitest/ui/booking-helpers.test.ts", "tests/vitest/ui/booking-helpers-wave.test.ts", "tests/vitest/ui/form-submissions-page.test.tsx", "tests/vitest/ui/media-library.test.tsx", "tests/vitest/ui/mediaLibraryTestUtils.tsx", "tests/vitest/ui/media-library-load-retry-wave.test.tsx", "tests/vitest/ui/media-library-mutation-retry-wave.test.tsx", "tests/vitest/ui/media-library-page-wave.test.tsx", "tests/vitest/ui/media-card.test.tsx", "tests/vitest/ui/media-components.test.tsx", "tests/vitest/ui/media-details.test.tsx", "tests/vitest/ui/media-details-panel.test.tsx", "tests/vitest/ui/media-filter-panel.test.tsx", "tests/vitest/ui/media-folder-rail.test.tsx", "tests/vitest/ui/media-picker.test.tsx", "tests/vitest/ui/media-toolbar.test.tsx", "tests/vitest/ui/forms-pages-wave.test.tsx", "tests/vitest/ui/formsPagesWaveFixtures.tsx", "tests/vitest/ui/form-builder-page-wave.test.tsx", "tests/vitest/ui/forms-component-wave.test.tsx", "tests/vitest/ui/use-forms-wave.test.tsx", "tests/vitest/ui-integration/forms-list-restyle.test.tsx", "tests/vitest/ui-integration/forms.test.tsx", "tests/vitest/ui-integration/forms-submissions-restyle.test.tsx", "tests/vitest/validation/task551ListSchemas.test.ts", "tests/perf/database-admin-list-budgets.test.ts", "tests/vitest/admin/adminUsersClient.test.ts", "tests/vitest/admin/entriesClientMutationReconciliation.test.ts", "tests/vitest/admin/entriesClientReadAuthority.test.ts", "tests/vitest/admin/entriesClient.test.ts", "tests/vitest/admin/postsClientCacheAuthority.test.ts", "tests/vitest/admin/postsClient.test.ts", "tests/vitest/mediaUi/mediaLibrary.test.tsx", "tests/vitest/pages/task-539-page-editor-controls.test.ts", "tests/vitest/ui/content-entries.test.tsx", "tests/vitest/ui/custom-screen-entry-navigation-authority.test.tsx", "tests/vitest/ui/custom-screen-records.test.tsx", "tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx", "tests/vitest/ui/drawer-sheet-a11y-gate.test.tsx", "tests/vitest/ui/entry-create-drawer-required-fields.test.tsx", "tests/vitest/ui/entry-field-relation-interaction.test.tsx", "tests/vitest/ui/entry-field-relation-option-identity.test.tsx", "tests/vitest/ui/entry-field-renderer-wave.test.tsx", "tests/vitest/ui/entry-list-filters.test.ts", "tests/vitest/ui/entry-list-wave.test.tsx", "tests/vitest/ui/entry-page-support-wave.test.tsx", "tests/vitest/ui/form-list-page-wave.test.tsx", "tests/vitest/ui-integration/admin-screens-restyle.test.tsx", "tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx", "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx", "tests/vitest/ui-integration/custom-screen-entries-restyle.test.tsx", "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx", "tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx", "tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx", "tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx", "tests/vitest/ui-integration/engine-detail-template-restyle.test.tsx", "tests/vitest/ui-integration/entry-list-restyle.test.tsx", "tests/vitest/ui-integration/media-restyle.test.tsx", "tests/vitest/ui-integration/media.test.tsx", "tests/vitest/ui-integration/post-editor-canvas-shared.test.tsx", "tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx", "tests/vitest/ui-integration/post-editor-toolbar-inspector-dedup.test.tsx", "tests/vitest/ui-integration/post-list-restyle.test.tsx", "tests/vitest/ui-integration/roles.test.tsx", "tests/vitest/ui-integration/users.test.tsx", "tests/vitest/ui/menu-design-editor-revalidation.test.tsx", "tests/vitest/ui/menu-design-editor.test.tsx", "tests/vitest/ui/menu-editor-refresh-policy.test.tsx", "tests/vitest/ui/menu-editor-shell-wave.test.tsx", "tests/vitest/ui/menu-editor.test.tsx", "tests/vitest/ui/menu-editor-validation.test.ts", "tests/vitest/ui/page-editor-facade.test.ts", "tests/vitest/ui/page-editor-failures-flow.test.tsx", "tests/vitest/ui/pageEditorFlowTestUtils.tsx", "tests/vitest/ui/page-editor-gallery-items-control.test.tsx", "tests/vitest/ui/page-editor-insertion-flow.test.tsx", "tests/vitest/ui/page-editor-media-url-control.test.tsx", "tests/vitest/ui/page-editor-shell-branches-wave.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-flow.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-flow.test.tsx", "tests/vitest/ui/page-leaf-components.test.tsx", "tests/vitest/ui/page-list-cache-behavior.test.tsx", "tests/vitest/ui/page-list-filters.test.ts", "tests/vitest/ui/pageListPageWaveFixtures.tsx", "tests/vitest/ui/page-list-residual-wave.test.tsx", "tests/vitest/ui/page-list.test.tsx", "tests/vitest/ui/page-list-wave.test.tsx", "tests/vitest/ui/pagePostListFixtures.tsx", "tests/vitest/ui/postBlockEditorShellFixtures.tsx", "tests/vitest/ui/post-editor-canvas-blocks-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-embeds-wave.test.tsx", "tests/vitest/ui/postEditorCanvasFixtures.tsx", "tests/vitest/ui/post-editor-canvas-media-wave.test.tsx"]
  ```

- `line-count-3` — lane `tooling`, profile `none`, environment literal argv (no env wrapper), discovery not-applicable, argv 69 tokens; waves: W4, INITIAL closure.

  ```text
  ["wc", "-l", "tests/vitest/ui/post-editor-canvas-panels-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-toolbar-profile-routing.test.tsx", "tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx", "tests/vitest/ui/post-list-wave.test.tsx", "tests/vitest/ui/posts-list.test.tsx", "tests/vitest/ui/support/customScreenEditorPageHarness.tsx", "tests/vitest/ui/support/customScreenEntryNavigationHarness.tsx", "tests/vitest/ui/theme-editor-page-leaf.test.tsx", "tests/vitest/ui/theme-editor-page-wave.test.tsx", "tests/vitest/ui/users-roles-page-wave.test.tsx", "tests/vitest/ui/users-roles.test.tsx", "tests/vitest/ui/use-screen-related-entries.test.tsx", "tests/vitest/admin/entriesClientRevisions.test.ts", "tests/vitest/admin/support/entriesClientTestHarness.ts", "tests/vitest/customScreens/relatedEntryResolver.test.ts", "tests/unit/pages/pageRevisionAutosave.test.ts", "tests/unit/runtime-smoke/task-551-admin-lists-adapter.test.ts", "tests/unit/runtime-smoke/cli-registry.test.ts", "tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts", "tests/perf/fixtures/task551AdminListDescriptors.ts", "tests/vitest/ui/page-editor-revision-history.test.tsx", "tests/vitest/ui/post-editor-media-controls.test.tsx", "tests/vitest/ui/users-roles-extraction.test.tsx", "tests/vitest/ui/menuDesignEditorTestHarness.tsx", "tests/vitest/ui/menu-design-editor-responsive.test.tsx", "tests/vitest/ui/menu-design-editor-nav-levels.test.tsx", "tests/vitest/ui/menu-design-editor-dropdown-bar.test.tsx", "tests/vitest/ui/usersRolesPageWaveFixtures.tsx", "tests/vitest/ui/users-roles-page-pagination-wave.test.tsx", "tests/vitest/ui/pageEditorV2RevisionHarness.tsx", "tests/vitest/ui/use-screen-related-entries-ids.test.tsx", "tests/vitest/ui/entry-field-renderer-relation-ids-wave.test.tsx", "tests/vitest/ui/page-editor-shell-revisions-wave.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-revisions-flow.test.tsx", "tests/vitest/ui/entry-list-pagination-wave.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-revisions-flow.test.tsx", "tests/vitest/ui/detail-template-editor-revisions.test.tsx", "tests/vitest/ui/media-library-mutation-pagination-wave.test.tsx", "tests/vitest/pages/task-539-page-editor-media-controls.test.ts", "tests/vitest/ui/formsPagesWaveListFixtures.tsx", "tests/vitest/admin/mediaClientListEnvelope.test.ts", "tests/vitest/admin/postsClientEnvelopeFixtures.ts", "tests/vitest/ui/forms-component-list-wave.test.tsx", "tests/vitest/ui/pageEditorFlowRevisionMocks.tsx", "tests/vitest/admin/entriesClientPagination.test.ts", "tests/vitest/ui/page-editor-insertion-media-flow.test.tsx", "tests/vitest/ui-integration/custom-screen-task-540-list-flow.test.tsx", "core/services/database/adminListScope.ts", "core/services/customScreens/customScreenEntryReadService.ts", "core/services/admin/rolesService.ts", "core/server/routes/adminRolesRoutes.ts", "tests/unit/admin/rolesService.test.ts", "tests/unit/pages/pageService.test.ts", "tests/integration/routes/forms.test.ts", "core/admin/ui/posts/editor/postEditorCanvasHelpers.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/worker-entry.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/worker-operations.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/production-handlers.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/cleanup.ts", "tests/unit/runtime-smoke/task-551-admin-lists-worker.test.ts", "tests/vitest/ui/site-settings.test.tsx", "tests/vitest/ui-integration/settings-general-site-restyle.test.tsx", "tests/vitest/ui/custom-screen-list-view.test.ts", "tests/vitest/ui/page-editor-settings-flow.test.tsx", "tests/vitest/ui/menu-item-form.test.tsx", "scripts/runtime-smoke/adapters/task-490/browser-actions.ts", "tests/vitest/pages/page-editor-host-contract.test.ts"]
  ```

- `admin-list-playwright-smoke` — lane `runtime-smoke`, profile `none`, environment literal argv (no env wrapper), discovery not-applicable, argv 9 tokens; waves: W4, INITIAL closure.

  ```text
  ["bun", "scripts/runtime-smoke.ts", "run", "--suite", "task-551-admin-lists", "--profile", "fast", "--session", "wf55103l02"]
  ```

- `final-forms-export-bun-tests` — lane `bun-test`, profile `task551-db-test`, environment `<db-env>`, discovery test-paths, `minimum` 3, argv 6 tokens; waves: FINAL.

  ```text
  ["bun", "--env-file=/dev/null", "test", "tests/integration/routes/forms.test.ts", "tests/integration/routes/task551BoundedAdminLists.test.ts", "tests/unit/runtime-smoke/task490-browser-actions.test.ts"]
  ```

- `final-forms-export-vitest` — lane `vitest`, profile `none`, environment `<none-env>`, discovery test-paths, `minimum` 3, argv 7 tokens; waves: FINAL.

  ```text
  ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/formsClient.test.ts", "tests/vitest/ui/form-submissions-page.test.tsx", "tests/vitest/ui-integration/forms-submissions-restyle.test.tsx"]
  ```

- `final-line-count` — lane `tooling`, profile `none`, environment literal argv (no env wrapper), discovery not-applicable, argv 13 tokens; waves: FINAL.

  ```text
  ["wc", "-l", "core/server/routes/formsRoutes.ts", "core/server/validation/formSchemas.ts", "core/admin/services/formsClient.ts", "core/admin/ui/forms/FormSubmissionsPage.tsx", "scripts/runtime-smoke/adapters/task-490/browser-actions.ts", "tests/integration/routes/forms.test.ts", "tests/integration/routes/task551BoundedAdminLists.test.ts", "tests/vitest/admin/formsClient.test.ts", "tests/vitest/ui/form-submissions-page.test.tsx", "tests/vitest/ui-integration/forms-submissions-restyle.test.tsx", "tests/unit/runtime-smoke/task490-browser-actions.test.ts"]
  ```

- `final-forms-export-smoke` — lane `runtime-smoke`, profile `none`, environment literal argv (no env wrapper), discovery not-applicable, argv 9 tokens; waves: FINAL.

  ```text
  ["bun", "scripts/runtime-smoke.ts", "run", "--suite", "task-490", "--profile", "fast", "--session", "wf55103l02final"]
  ```

**Wave schedule** (C14 v4): W0 `w0-revision-vitest`, `w0-smoke-inventory`,
`test551-db-unit`, then the type/lint gates; W1 the ten W1 ids above, then
the type/lint gates; W2 `w2-client-vitest`, `admin-prefetch-budget-receipt`,
`admin-prefetch-policy-receipt`, `task554-regression-vitest` plus the prose
W2 fixture-split proof, no type/lint gate; W3 the four UI/consumer Vitest
commands and `w0-revision-vitest`, then the type/lint gates (covering W2
and W3); W4 `runtime-smoke-registry-tests`, `admin-list-playwright-smoke`,
`diff-check`, `diff-check-untracked`, `line-count-1..3`; INITIAL closure all
30 INITIAL ids once in envelope order; FINAL the 11 FINAL ids in
envelope order. `core-lint-types`, `core-lint` and `repo-lint-types` are
judged at W0, W1, after W3 and at closure; `repo-lint-types` uses the R4-13
error-set diff against the pre-W0 baseline.

**Prose-only orchestrator gates** (never envelope commands):

- after W4 and before closure: `git diff --check <pre-family baseline>` and
  `bash /home/coder/project/Coderso/.claude/scripts/line-gate.sh <pre-family baseline>`,
  cwd = this worktree (R3-31), judged under the R4-12 triage;
- at W2, before and after the `bookingPageFixtures.tsx` split (R4-09):
  `<none-env> bun --env-file=/dev/null node_modules/vitest/vitest.mjs run tests/vitest/ui/booking-page-wave.test.tsx tests/vitest/ui/booking-page-errors.test.tsx tests/vitest/ui/booking-page-schedule-crud.test.tsx tests/vitest/ui/booking-page-tabs.test.tsx`
  plus `wc -l` over the three new fixture files;
- the C13 v3 pre-dispatch preconditions, extended by R4-12 (TASK-551-11
  split before W0).

`bun run gates:coderso`, `bun run gates:coderso:perf` and `bun run
scan:security` are owner-routed to TASK-551-10-L01, not run here.

## Documentation Updates Required

No shared docs. Supply endpoint cursor/limit/error deltas, the form
export-job route replacement delta, and the service split map to
TASK-551-10-L02; that closure leaf owns `_docs/CMS_API.md`, ORM docs, and
changelog 1310.

## Quantified Acceptance

- All seven collection families default to at most 50 and reject limits above
  100; no endpoint issues an unbounded select or uses offset pagination.
- All five additional booking collection contracts are bounded exactly as
  specified; form list SQL is owned by `formReadService`, and legacy
  `formsService.listForms` has zero production callers. Every form-list row has
  exactly `id,name,slug,status,description,submissionAccess,updatedAt`; current
  list filters/table work without N+1 or hidden detail fallback.
- Every representative 100k-row list request is at most 3 SQL statements and
  every page/fixed-summary/facet statement has its own checked-in reviewed L02
  budget/receipt for all eight fields (query count, rows read, rows returned,
  transferred bytes, shared buffers, normalized p50/p95/p99), plus the L05
  sanitized-plan receipt; response size stays within its fixture budget. Fixed
  summaries return exactly one row without claiming one-row work, relation
  facets are bounded as declared, arbitrary filters use `matchingTotal:null`
  plus `hasMore`, and no displayed global metric changes while traversing pages.
- Production/static identity is 32/32 after land; L05 remains exactly 37 plan
  IDs/38 cases/76 numeric scale receipts, with no prior Admin variant counted
  twice.
- All current page/post/entry status counts and author/type facets, form and
  submission cards, user/member/invitation/role/admin safeguards, media asset/
  byte/type/folder/tag totals, and booking today/upcoming/resource counts come
  from their exact summary/facet contract—not a current page or hidden full list.
- Fifty concurrent conflicting booking/session/role attempts yield one valid
  state, no duplicate invariant, and zero partial commits.
- The booking write path consumes the named constraint catalog from 551-05;
  this leaf emits no schema or migration artifact.
- `routes/index.ts` has one TASK-551 writer, preserves the existing central
  `RouteDeps` call shape, registers one cursor participant before both prod/dev
  lifecycle starts, and contains zero environment/key-loading logic.
- Every touched/split production and test file is at most 1,000 physical lines.
- The complete eight-client graph has no remaining array assumption,
  auto-fetch-all path, or first-page truncation, and its direct tests map
  one-for-one to production consumers. Revision route/schema/client/UI ownership
  begins only after TASK-551-06-L02's bounded services are complete.
- Existing booking tab modules are the only tab implementations, all consume
  narrow list-item types, and the Services access badge remains exact through
  derived `submissionAccess`. Submission payloads appear only after explicit
  expansion over a private/no-store response and no-store fetch, and are erased
  on close/auth lifecycle; media summaries always
  carry safe `name` without exposing storage keys.
- All eight owned Admin clients consume the already-landed L04 INITIAL token/
  reset seam and return a complete adoption receipt; delayed pre-transition
  completions install nothing. The submission-detail route consumes the already-
  landed L03 INITIAL header seam and emits its exact private/no-store headers on
  success and mapped 4xx without editing shared HTTP transport.
- The legacy synchronous form-submissions export route and its client method
  have zero production callers; create/status/download job orchestration is the
  only export path, TASK-571's export-job tests rerun unchanged, and no
  export-job service/scheduler file is edited by this leaf.

## Workflow Dispatch Envelope

The canonical graph records the Task-551 edge only; header-named external
receipts remain mandatory contract preconditions. The two 09-L01 dispatcher
tests and the L08/TASK-571 receipt suites below are execution-only: they remain
foreign write targets even when a literal validation command reruns them.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-03-L02",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-03"
  },
  "allowlist": [
    "core/services/pages/pageReadService.ts",
    "core/services/content/entryReadService.ts",
    "core/services/content/postReadService.ts",
    "core/services/admin/userReadService.ts",
    "core/services/forms/formReadService.ts",
    "core/services/forms/submissionReadService.ts",
    "core/services/media/mediaReadService.ts",
    "core/services/booking/bookingReadService.ts",
    "core/services/booking/bookingMutationService.ts",
    "core/services/booking/bookingScheduleService.ts",
    "core/services/booking/bookingService.ts",
    "core/services/admin/usersService.ts",
    "core/services/auth/sessionService.ts",
    "core/server/routes/index.ts",
    "core/server/routes/pageRoutes.ts",
    "core/server/routes/detailPageRoutes.ts",
    "core/server/routes/contentEntryRoutes.ts",
    "core/server/routes/postsRoutes.ts",
    "core/server/routes/adminUsersRoutes.ts",
    "core/server/routes/formsRoutes.ts",
    "core/server/routes/mediaRoutes.ts",
    "core/server/routes/bookingRoutes.ts",
    "core/server/validation/pageSchemas.ts",
    "core/server/validation/detailPageSchemas.ts",
    "core/server/validation/contentSchemas.ts",
    "core/server/validation/postSchemas.ts",
    "core/server/validation/adminUserSchemas.ts",
    "core/server/validation/formSchemas.ts",
    "core/server/validation/mediaSchemas.ts",
    "core/server/validation/bookingSchemas.ts",
    "core/admin/services/pagesClient.ts",
    "core/admin/services/detailPagesClient.ts",
    "core/admin/services/entriesClient.ts",
    "core/admin/services/postsClient.ts",
    "core/admin/services/adminUsersClient.ts",
    "core/admin/services/formsClient.ts",
    "core/admin/services/mediaClient.ts",
    "core/admin/services/bookingClient.ts",
    "core/admin/ui/pages/PageListPage.tsx",
    "core/admin/ui/pages/PageRevisionDrawer.tsx",
    "core/admin/ui/pages/PageTable.tsx",
    "core/admin/ui/pages/editor/PageEditorRegistryFields.tsx",
    "core/admin/ui/pages/editorControls/MediaUrlControl.tsx",
    "core/admin/ui/content-types/DetailTemplateEditorPage.tsx",
    "core/admin/ui/content-types/DetailTemplateInspector.tsx",
    "core/admin/ui/content-types/DetailTemplateRevisionPanel.tsx",
    "core/admin/ui/entries/EntryList.tsx",
    "core/admin/ui/entries/EntryGrid.tsx",
    "core/admin/ui/entries/EntryTable.tsx",
    "core/admin/ui/entries/FieldRenderer.tsx",
    "core/admin/ui/posts/PostsListPage.tsx",
    "core/admin/ui/posts/PostsTable.tsx",
    "core/admin/ui/posts/editor/PostEditorCanvas.tsx",
    "core/admin/ui/posts/editor/PostEditorMediaControls.tsx",
    "core/admin/ui/users/UsersRolesPage.tsx",
    "core/admin/ui/users/UsersRolesContent.tsx",
    "core/admin/ui/forms/FormListPage.tsx",
    "core/admin/ui/forms/FormTable.tsx",
    "core/admin/ui/forms/FormSubmissionsPage.tsx",
    "core/admin/ui/forms/hooks/useForms.ts",
    "core/admin/ui/media/MediaLibraryPage.tsx",
    "core/admin/ui/media/MediaLibraryFolderState.ts",
    "core/admin/ui/media/MediaLibraryResults.tsx",
    "core/admin/ui/media/MediaPicker.tsx",
    "core/admin/ui/media/utils.ts",
    "core/admin/ui/booking/BookingPage.tsx",
    "core/admin/ui/booking/BookingOverviewPanel.tsx",
    "core/admin/ui/booking/bookingHelpers.ts",
    "core/admin/ui/booking/bookingTypes.ts",
    "core/admin/ui/booking/components/AvailabilityTab.tsx",
    "core/admin/ui/booking/components/ReservationsTab.tsx",
    "core/admin/ui/booking/components/ResourcesTab.tsx",
    "core/admin/ui/booking/components/ServicesTab.tsx",
    "core/admin/ui/booking/components/SlotPreviewTab.tsx",
    "core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx",
    "core/admin/ui/custom-screens/CustomScreenEntriesTable.tsx",
    "core/admin/ui/custom-screens/customScreenListModel.ts",
    "core/admin/ui/custom-screens/customScreenPreviewData.ts",
    "core/admin/ui/custom-screens/hooks/useScreenEntryPresentationMedia.ts",
    "core/admin/ui/custom-screens/hooks/useScreenRelatedEntries.ts",
    "core/admin/ui/custom-screens/ListViewCanvas.tsx",
    "core/admin/ui/menus/MenuDesignEditor.tsx",
    "core/admin/ui/menus/MenuDesignEditorBrandNavControls.tsx",
    "core/admin/ui/menus/MenuEditorPage.tsx",
    "core/admin/ui/menus/MenuEditorWorkspace.tsx",
    "core/admin/ui/menus/MenuItemDrawer.tsx",
    "core/admin/ui/menus/MenuItemForm.tsx",
    "core/admin/ui/site/SiteSettingsPage.tsx",
    "core/admin/ui/themes/ThemeEditorPage.tsx",
    "core/admin/utils/adminPrefetch.ts",
    "core/admin/utils/adminPrefetchCustomScreens.ts",
    "core/admin/services/adminListEnvelope.ts",
    "core/admin/services/entriesClientPagination.ts",
    "core/admin/ui/shared/useBoundedAdminList.ts",
    "core/admin/ui/shared/BoundedListFooter.tsx",
    "core/admin/ui/pages/editor/pageEditorHostContract.ts",
    "core/admin/ui/pages/editor/usePageEditorController.ts",
    "core/admin/ui/pages/editor/usePageEditorRevisions.ts",
    "core/admin/ui/pages/editor/PageEditorToolbar.tsx",
    "core/admin/ui/pages/editor/PageEditorToolbarRevisions.tsx",
    "core/admin/ui/pages/editor/PageEditorSettingsPanel.tsx",
    "core/admin/ui/pages/editor/PageEditorHistorySheet.tsx",
    "core/admin/ui/pages/editor/PageEditorRegistryPickers.tsx",
    "core/admin/ui/media/useMediaFolderOperations.ts",
    "core/admin/ui/booking/useBookingCollections.ts",
    "core/admin/ui/posts/editor/PostCanvasBlockItem.tsx",
    "core/admin/ui/users/useUsersRolesCollections.ts",
    "core/admin/ui/site/SiteSettingsPagePickers.tsx",
    "core/admin/ui/custom-screens/useCustomScreenEntryList.ts",
    "core/server/routes/boundedReadErrors.ts",
    "core/services/customScreens/relatedEntryResolver.ts",
    "scripts/runtime-smoke/contracts.ts",
    "scripts/runtime-smoke/registry.ts",
    "scripts/runtime-smoke/cli.ts",
    "scripts/runtime-smoke/adapters/task-551-admin-lists.ts",
    "scripts/runtime-smoke/adapters/task-551-admin-lists/contracts.ts",
    "scripts/runtime-smoke/adapters/task-551-admin-lists/fixtures.ts",
    "scripts/runtime-smoke/adapters/task-551-admin-lists/browser-plan.ts",
    "scripts/runtime-smoke/adapters/task-551-admin-lists/suite.ts",
    "tests/integration/routes/task551BoundedAdminLists.test.ts",
    "tests/integration/server/task551AdminWriteConcurrency.test.ts",
    "tests/vitest/admin/task551PaginatedClients.test.ts",
    "tests/vitest/admin/task551PaginatedListViews.test.tsx",
    "tests/vitest/admin/task551PaginatedConsumerGraphScreens.test.tsx",
    "tests/vitest/admin/task551PaginatedConsumerGraphEditors.test.tsx",
    "tests/vitest/admin/formsClient.test.ts",
    "tests/vitest/admin/bookingClient.test.ts",
    "tests/vitest/admin/mediaClient.test.ts",
    "tests/vitest/admin/mediaUtils.test.ts",
    "tests/vitest/admin/pagesClient.test.ts",
    "tests/vitest/admin/pagesClientPagination.test.ts",
    "tests/vitest/admin/detailPagesClient.test.ts",
    "tests/vitest/admin/adminPrefetch.test.ts",
    "tests/vitest/ui/page-revision-drawer.test.tsx",
    "tests/vitest/ui/pageEditorV2Fixtures.tsx",
    "tests/vitest/ui/pageEditorV2FlowHarness.tsx",
    "tests/vitest/ui/pageEditorV2Helpers.tsx",
    "tests/vitest/ui/pageEditorV2Interactions.tsx",
    "tests/vitest/ui/page-editor-v2-flow-autosave.test.tsx",
    "tests/vitest/ui/page-editor-v2-flow-columns.test.tsx",
    "tests/vitest/ui/page-editor-v2-flow-controls.test.tsx",
    "tests/vitest/ui/page-editor-v2-flow-inline-edit.test.tsx",
    "tests/vitest/ui/page-editor-v2-flow-inserters.test.tsx",
    "tests/vitest/ui/page-editor-v2-flow-loading.test.tsx",
    "tests/vitest/ui/page-editor-v2-flow-panels.test.tsx",
    "tests/vitest/ui/page-editor-v2-flow-responsive.test.tsx",
    "tests/vitest/ui/page-editor-v2-flow-sections.test.tsx",
    "tests/vitest/ui/page-editor-v2-flow-settings.test.tsx",
    "tests/vitest/ui/page-editor-v2-flow-toolbar.test.tsx",
    "tests/vitest/ui/detail-template-editor.test.tsx",
    "tests/vitest/ui/bookingPageFixtures.tsx",
    "tests/vitest/ui/bookingPageFixtureState.tsx",
    "tests/vitest/ui/bookingPageFixtureMocks.tsx",
    "tests/vitest/ui/bookingPageFixtureHarness.tsx",
    "tests/vitest/ui/booking-page-wave.test.tsx",
    "tests/vitest/ui/booking-page-errors.test.tsx",
    "tests/vitest/ui/booking-page-schedule-crud.test.tsx",
    "tests/vitest/ui/booking-page-tabs.test.tsx",
    "tests/vitest/ui/booking-tabs-interactions-wave.test.tsx",
    "tests/vitest/ui/booking-tabs-leaf.test.tsx",
    "tests/vitest/ui/booking-helpers.test.ts",
    "tests/vitest/ui/booking-helpers-wave.test.ts",
    "tests/vitest/ui/form-submissions-page.test.tsx",
    "tests/vitest/ui/media-library.test.tsx",
    "tests/vitest/ui/mediaLibraryTestUtils.tsx",
    "tests/vitest/ui/media-library-load-retry-wave.test.tsx",
    "tests/vitest/ui/media-library-mutation-retry-wave.test.tsx",
    "tests/vitest/ui/media-library-page-wave.test.tsx",
    "tests/vitest/ui/media-card.test.tsx",
    "tests/vitest/ui/media-components.test.tsx",
    "tests/vitest/ui/media-details.test.tsx",
    "tests/vitest/ui/media-details-panel.test.tsx",
    "tests/vitest/ui/media-filter-panel.test.tsx",
    "tests/vitest/ui/media-folder-rail.test.tsx",
    "tests/vitest/ui/media-picker.test.tsx",
    "tests/vitest/ui/media-toolbar.test.tsx",
    "tests/vitest/ui/forms-pages-wave.test.tsx",
    "tests/vitest/ui/formsPagesWaveFixtures.tsx",
    "tests/vitest/ui/form-builder-page-wave.test.tsx",
    "tests/vitest/ui/forms-component-wave.test.tsx",
    "tests/vitest/ui/use-forms-wave.test.tsx",
    "tests/vitest/ui-integration/forms-list-restyle.test.tsx",
    "tests/vitest/ui-integration/forms.test.tsx",
    "tests/vitest/ui-integration/forms-submissions-restyle.test.tsx",
    "tests/vitest/validation/task551ListSchemas.test.ts",
    "tests/perf/database-admin-list-budgets.test.ts",
    "tests/vitest/admin/adminUsersClient.test.ts",
    "tests/vitest/admin/entriesClientMutationReconciliation.test.ts",
    "tests/vitest/admin/entriesClientReadAuthority.test.ts",
    "tests/vitest/admin/entriesClient.test.ts",
    "tests/vitest/admin/postsClientCacheAuthority.test.ts",
    "tests/vitest/admin/postsClient.test.ts",
    "tests/vitest/mediaUi/mediaLibrary.test.tsx",
    "tests/vitest/pages/task-539-page-editor-controls.test.ts",
    "tests/vitest/ui/content-entries.test.tsx",
    "tests/vitest/ui/custom-screen-entry-navigation-authority.test.tsx",
    "tests/vitest/ui/custom-screen-records.test.tsx",
    "tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx",
    "tests/vitest/ui/drawer-sheet-a11y-gate.test.tsx",
    "tests/vitest/ui/entry-create-drawer-required-fields.test.tsx",
    "tests/vitest/ui/entry-field-relation-interaction.test.tsx",
    "tests/vitest/ui/entry-field-relation-option-identity.test.tsx",
    "tests/vitest/ui/entry-field-renderer-wave.test.tsx",
    "tests/vitest/ui/entry-list-filters.test.ts",
    "tests/vitest/ui/entry-list-wave.test.tsx",
    "tests/vitest/ui/entry-page-support-wave.test.tsx",
    "tests/vitest/ui/form-list-page-wave.test.tsx",
    "tests/vitest/ui-integration/admin-screens-restyle.test.tsx",
    "tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx",
    "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx",
    "tests/vitest/ui-integration/custom-screen-entries-restyle.test.tsx",
    "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx",
    "tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx",
    "tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx",
    "tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx",
    "tests/vitest/ui-integration/engine-detail-template-restyle.test.tsx",
    "tests/vitest/ui-integration/entry-list-restyle.test.tsx",
    "tests/vitest/ui-integration/media-restyle.test.tsx",
    "tests/vitest/ui-integration/media.test.tsx",
    "tests/vitest/ui-integration/post-editor-canvas-shared.test.tsx",
    "tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx",
    "tests/vitest/ui-integration/post-editor-toolbar-inspector-dedup.test.tsx",
    "tests/vitest/ui-integration/post-list-restyle.test.tsx",
    "tests/vitest/ui-integration/roles.test.tsx",
    "tests/vitest/ui-integration/users.test.tsx",
    "tests/vitest/ui/menu-design-editor-revalidation.test.tsx",
    "tests/vitest/ui/menu-design-editor.test.tsx",
    "tests/vitest/ui/menu-editor-refresh-policy.test.tsx",
    "tests/vitest/ui/menu-editor-shell-wave.test.tsx",
    "tests/vitest/ui/menu-editor.test.tsx",
    "tests/vitest/ui/menu-editor-validation.test.ts",
    "tests/vitest/ui/page-editor-facade.test.ts",
    "tests/vitest/ui/page-editor-failures-flow.test.tsx",
    "tests/vitest/ui/pageEditorFlowTestUtils.tsx",
    "tests/vitest/ui/page-editor-gallery-items-control.test.tsx",
    "tests/vitest/ui/page-editor-insertion-flow.test.tsx",
    "tests/vitest/ui/page-editor-media-url-control.test.tsx",
    "tests/vitest/ui/page-editor-shell-branches-wave.test.tsx",
    "tests/vitest/ui/page-editor-v2-authoring-flow.test.tsx",
    "tests/vitest/ui/page-editor-v2-persistence-flow.test.tsx",
    "tests/vitest/ui/page-leaf-components.test.tsx",
    "tests/vitest/ui/page-list-cache-behavior.test.tsx",
    "tests/vitest/ui/page-list-filters.test.ts",
    "tests/vitest/ui/pageListPageWaveFixtures.tsx",
    "tests/vitest/ui/page-list-residual-wave.test.tsx",
    "tests/vitest/ui/page-list.test.tsx",
    "tests/vitest/ui/page-list-wave.test.tsx",
    "tests/vitest/ui/pagePostListFixtures.tsx",
    "tests/vitest/ui/postBlockEditorShellFixtures.tsx",
    "tests/vitest/ui/post-editor-canvas-blocks-wave.test.tsx",
    "tests/vitest/ui/post-editor-canvas-embeds-wave.test.tsx",
    "tests/vitest/ui/postEditorCanvasFixtures.tsx",
    "tests/vitest/ui/post-editor-canvas-media-wave.test.tsx",
    "tests/vitest/ui/post-editor-canvas-panels-wave.test.tsx",
    "tests/vitest/ui/post-editor-canvas-toolbar-profile-routing.test.tsx",
    "tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx",
    "tests/vitest/ui/post-list-wave.test.tsx",
    "tests/vitest/ui/posts-list.test.tsx",
    "tests/vitest/ui/support/customScreenEditorPageHarness.tsx",
    "tests/vitest/ui/support/customScreenEntryNavigationHarness.tsx",
    "tests/vitest/ui/theme-editor-page-leaf.test.tsx",
    "tests/vitest/ui/theme-editor-page-wave.test.tsx",
    "tests/vitest/ui/users-roles-page-wave.test.tsx",
    "tests/vitest/ui/users-roles.test.tsx",
    "tests/vitest/ui/use-screen-related-entries.test.tsx",
    "tests/vitest/admin/entriesClientRevisions.test.ts",
    "tests/vitest/admin/support/entriesClientTestHarness.ts",
    "tests/vitest/customScreens/relatedEntryResolver.test.ts",
    "tests/unit/pages/pageRevisionAutosave.test.ts",
    "tests/unit/runtime-smoke/task-551-admin-lists-adapter.test.ts",
    "tests/unit/runtime-smoke/cli-registry.test.ts",
    "tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts",
    "tests/perf/fixtures/task551AdminListDescriptors.ts",
    "tests/vitest/ui/page-editor-revision-history.test.tsx",
    "tests/vitest/ui/post-editor-media-controls.test.tsx",
    "tests/vitest/ui/users-roles-extraction.test.tsx",
    "tests/vitest/ui/menuDesignEditorTestHarness.tsx",
    "tests/vitest/ui/menu-design-editor-responsive.test.tsx",
    "tests/vitest/ui/menu-design-editor-nav-levels.test.tsx",
    "tests/vitest/ui/menu-design-editor-dropdown-bar.test.tsx",
    "tests/vitest/ui/usersRolesPageWaveFixtures.tsx",
    "tests/vitest/ui/users-roles-page-pagination-wave.test.tsx",
    "tests/vitest/ui/pageEditorV2RevisionHarness.tsx",
    "tests/vitest/ui/use-screen-related-entries-ids.test.tsx",
    "tests/vitest/ui/entry-field-renderer-relation-ids-wave.test.tsx",
    "tests/vitest/ui/page-editor-shell-revisions-wave.test.tsx",
    "tests/vitest/ui/page-editor-v2-authoring-revisions-flow.test.tsx",
    "tests/vitest/ui/entry-list-pagination-wave.test.tsx",
    "tests/vitest/ui/page-editor-v2-persistence-revisions-flow.test.tsx",
    "tests/vitest/ui/detail-template-editor-revisions.test.tsx",
    "tests/vitest/ui/media-library-mutation-pagination-wave.test.tsx",
    "tests/vitest/pages/task-539-page-editor-media-controls.test.ts",
    "tests/vitest/ui/formsPagesWaveListFixtures.tsx",
    "tests/vitest/admin/mediaClientListEnvelope.test.ts",
    "tests/vitest/admin/postsClientEnvelopeFixtures.ts",
    "tests/vitest/ui/forms-component-list-wave.test.tsx",
    "tests/vitest/ui/pageEditorFlowRevisionMocks.tsx",
    "tests/vitest/admin/entriesClientPagination.test.ts",
    "tests/vitest/ui/page-editor-insertion-media-flow.test.tsx",
    "tests/vitest/ui-integration/custom-screen-task-540-list-flow.test.tsx",
    "core/services/database/adminListScope.ts",
    "core/services/customScreens/customScreenEntryReadService.ts",
    "core/services/admin/rolesService.ts",
    "core/server/routes/adminRolesRoutes.ts",
    "tests/unit/admin/rolesService.test.ts",
    "tests/unit/pages/pageService.test.ts",
    "tests/integration/routes/forms.test.ts",
    "core/admin/ui/posts/editor/postEditorCanvasHelpers.ts",
    "scripts/runtime-smoke/adapters/task-551-admin-lists/worker-entry.ts",
    "scripts/runtime-smoke/adapters/task-551-admin-lists/worker-operations.ts",
    "scripts/runtime-smoke/adapters/task-551-admin-lists/production-handlers.ts",
    "scripts/runtime-smoke/adapters/task-551-admin-lists/cleanup.ts",
    "tests/unit/runtime-smoke/task-551-admin-lists-worker.test.ts",
    "tests/vitest/ui/site-settings.test.tsx",
    "tests/vitest/ui-integration/settings-general-site-restyle.test.tsx",
    "tests/vitest/ui/custom-screen-list-view.test.ts",
    "tests/vitest/ui/page-editor-settings-flow.test.tsx",
    "tests/vitest/ui/menu-item-form.test.tsx",
    "scripts/runtime-smoke/adapters/task-490/browser-actions.ts",
    "tests/vitest/pages/page-editor-host-contract.test.ts",
    "tests/unit/runtime-smoke/task490-browser-actions.test.ts"
  ],
  "forbiddenPaths": [
    "core/admin/services/cachePolicy.ts",
    "core/admin/utils/adminCacheAuthority.ts",
    "core/server/router.ts",
    "core/server/httpServer.ts",
    "core/services/forms/submissionExportJob.ts",
    "core/server/jobs/submissionExportScheduler.ts",
    "core/services/posts/postMetadataContract.ts",
    "core/services/content/entryService.ts",
    "core/server/publicSite.tsx",
    "core/db/schema.ts",
    "core/db/migrations/meta/_journal.json",
    "tests/integration/routes/bookingRoutes.test.ts",
    "tests/integration/server/route-response-headers.test.ts",
    "tests/integration/runtime/paginationCursorLifecycle.test.ts",
    "tests/unit/forms/submissionExportJob.test.ts",
    "_docs/_TASKS/README.md",
    "_docs/_CHANGELOG/README.md",
    "_docs/_workflows/task-551-implement.mjs",
    "core/services/pages/revisionService.ts",
    "tests/perf/fixtures/task551AdminReadStatementShapes.ts",
    "tests/perf/fixtures/task551QueryPlanContracts.ts",
    "tests/perf/task551DatabaseBaseline/freezeReceipts.ts",
    "tests/perf/database-explain-plans.test.ts",
    "tests/unit/booking/bookingService.test.ts",
    "tests/unit/server/publicBookingApi.test.ts",
    "tests/unit/auth/sessionService.test.ts",
    "tests/unit/admin/usersService.test.ts",
    "tests/integration/routes/postsRoutes.test.ts",
    "tests/integration/routes/postMetadataRbac.test.ts",
    "tests/unit/auth/rbac.test.ts",
    "tests/vitest/ui/editor-surface-dead-code.test.ts",
    "core/db/bookingReservationExclusion.ts",
    "core/server/paginationCursorLifecycle.ts",
    "core/services/database/keysetCursor.ts",
    "core/services/database/boundedReadContract.ts",
    "core/admin/services/mediaFoldersClient.ts",
    "core/admin/ui/shared/ListPaginationFooter.tsx",
    "core/admin/ui/shared/useListPagination.ts",
    "tests/integration/routes/adminUsers.test.ts",
    "tests/integration/routes/adminRoles.test.ts",
    "core/services/content/contentTypeSchemaFields.ts",
    "core/db/searchVectorDefinitions.ts",
    "core/db/nativeCmsWriterFence.ts",
    "core/services/database/revisionAllocation.ts",
    "tests/integration/runtime/retentionScheduler.test.ts",
    "tests/perf/database-retention-jobs.test.ts",
    "tests/vitest/database/revisionAllocation.test.ts",
    "core/services/backups/backupUsersSection.ts",
    "core/services/backups/backupImport.ts",
    "scripts/task-551-online-indexes.ts",
    "core/admin/utils/cacheBus.ts",
    "tests/unit/kits/nativeCmsWriterFenceInventory.test.ts"
  ],
  "dependencies": ["TASK-551-09-L04:initial", "TASK-551-08-L03:final"],
  "commands": [
    {
      "id": "bounded-admin-list-bun-tests",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/routes/task551BoundedAdminLists.test.ts", "tests/integration/routes/bookingRoutes.test.ts", "tests/integration/routes/forms.test.ts", "tests/integration/server/task551AdminWriteConcurrency.test.ts"],
      "environmentProfile": "task551-db-test",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/routes/task551BoundedAdminLists.test.ts", "tests/integration/routes/bookingRoutes.test.ts", "tests/integration/routes/forms.test.ts", "tests/integration/server/task551AdminWriteConcurrency.test.ts"],
        "minimum": 4
      }
    },
    {
      "id": "route-response-header-receipt",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/server/route-response-headers.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/server/route-response-headers.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "pagination-cursor-lifecycle-receipt",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/runtime/paginationCursorLifecycle.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/runtime/paginationCursorLifecycle.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "submission-export-job-receipt",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/unit/forms/submissionExportJob.test.ts"],
      "environmentProfile": "task551-db-test",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/unit/forms/submissionExportJob.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "test551-db-unit",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/unit/pages/pageRevisionAutosave.test.ts", "tests/unit/pages/pageService.test.ts", "tests/unit/admin/rolesService.test.ts"],
      "environmentProfile": "task551-db-test",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/unit/pages/pageRevisionAutosave.test.ts", "tests/unit/pages/pageService.test.ts", "tests/unit/admin/rolesService.test.ts"],
        "minimum": 3
      }
    },
    {
      "id": "admin-write-regression-receipt",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/unit/booking/bookingService.test.ts", "tests/unit/server/publicBookingApi.test.ts", "tests/unit/auth/sessionService.test.ts", "tests/unit/admin/usersService.test.ts", "tests/integration/routes/adminUsers.test.ts", "tests/integration/routes/adminRoles.test.ts"],
      "environmentProfile": "task551-db-test",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/unit/booking/bookingService.test.ts", "tests/unit/server/publicBookingApi.test.ts", "tests/unit/auth/sessionService.test.ts", "tests/unit/admin/usersService.test.ts", "tests/integration/routes/adminUsers.test.ts", "tests/integration/routes/adminRoles.test.ts"],
        "minimum": 6
      }
    },
    {
      "id": "w0-revision-vitest",
      "lane": "vitest",
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/pagesClientPagination.test.ts", "tests/vitest/admin/detailPagesClient.test.ts", "tests/vitest/ui/page-revision-drawer.test.tsx", "tests/vitest/ui/page-editor-revision-history.test.tsx", "tests/vitest/ui/detail-template-editor-revisions.test.tsx", "tests/vitest/pages/page-editor-host-contract.test.ts", "tests/vitest/admin/pagesClient.test.ts", "tests/vitest/ui/detail-template-editor.test.tsx", "tests/vitest/ui/page-editor-shell-revisions-wave.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-revisions-flow.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-revisions-flow.test.tsx", "tests/vitest/ui/page-authoring-canvas-branches-wave.test.tsx", "tests/vitest/ui/page-editor-builder-chrome-flow.test.tsx", "tests/vitest/ui/page-editor-columns-beside-flow.test.tsx", "tests/vitest/ui/page-editor-controls-flow.test.tsx", "tests/vitest/ui/page-editor-failures-flow.test.tsx", "tests/vitest/ui/page-editor-inline-edit-flow.test.tsx", "tests/vitest/ui/page-editor-insertion-flow.test.tsx", "tests/vitest/ui/page-editor-panels-flow.test.tsx", "tests/vitest/ui/page-editor-responsive-panel-flow.test.tsx", "tests/vitest/ui/page-editor-settings-flow.test.tsx", "tests/vitest/ui/page-editor-shell-branches-wave.test.tsx", "tests/vitest/ui/page-editor-shell-flow.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-flow.test.tsx", "tests/vitest/ui/page-editor-v2-controls-flow.test.tsx", "tests/vitest/ui/page-editor-v2-flow-autosave.test.tsx", "tests/vitest/ui/page-editor-v2-flow-columns.test.tsx", "tests/vitest/ui/page-editor-v2-flow-controls.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inline-edit.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inserters.test.tsx", "tests/vitest/ui/page-editor-v2-flow-loading.test.tsx", "tests/vitest/ui/page-editor-v2-flow-panels.test.tsx", "tests/vitest/ui/page-editor-v2-flow-responsive.test.tsx", "tests/vitest/ui/page-editor-v2-flow-sections.test.tsx", "tests/vitest/ui/page-editor-v2-flow-settings.test.tsx", "tests/vitest/ui/page-editor-v2-flow-toolbar.test.tsx", "tests/vitest/ui/page-editor-v2-inline-edit-flow.test.tsx", "tests/vitest/ui/page-editor-v2-layout-flow.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-flow.test.tsx", "tests/vitest/ui/page-editor-v2-responsive-flow.test.tsx", "tests/vitest/ui/page-editor-v2-settings-flow.test.tsx", "tests/vitest/ui/task-539-page-editor-flow.test.tsx", "tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx", "tests/vitest/ui/menu-design-editor.test.tsx", "tests/vitest/ui/page-editor-facade.test.ts", "tests/vitest/ui-integration/engine-detail-template-restyle.test.tsx"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/admin/pagesClientPagination.test.ts", "tests/vitest/admin/detailPagesClient.test.ts", "tests/vitest/ui/page-revision-drawer.test.tsx", "tests/vitest/ui/page-editor-revision-history.test.tsx", "tests/vitest/ui/detail-template-editor-revisions.test.tsx", "tests/vitest/pages/page-editor-host-contract.test.ts", "tests/vitest/admin/pagesClient.test.ts", "tests/vitest/ui/detail-template-editor.test.tsx", "tests/vitest/ui/page-editor-shell-revisions-wave.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-revisions-flow.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-revisions-flow.test.tsx", "tests/vitest/ui/page-authoring-canvas-branches-wave.test.tsx", "tests/vitest/ui/page-editor-builder-chrome-flow.test.tsx", "tests/vitest/ui/page-editor-columns-beside-flow.test.tsx", "tests/vitest/ui/page-editor-controls-flow.test.tsx", "tests/vitest/ui/page-editor-failures-flow.test.tsx", "tests/vitest/ui/page-editor-inline-edit-flow.test.tsx", "tests/vitest/ui/page-editor-insertion-flow.test.tsx", "tests/vitest/ui/page-editor-panels-flow.test.tsx", "tests/vitest/ui/page-editor-responsive-panel-flow.test.tsx", "tests/vitest/ui/page-editor-settings-flow.test.tsx", "tests/vitest/ui/page-editor-shell-branches-wave.test.tsx", "tests/vitest/ui/page-editor-shell-flow.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-flow.test.tsx", "tests/vitest/ui/page-editor-v2-controls-flow.test.tsx", "tests/vitest/ui/page-editor-v2-flow-autosave.test.tsx", "tests/vitest/ui/page-editor-v2-flow-columns.test.tsx", "tests/vitest/ui/page-editor-v2-flow-controls.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inline-edit.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inserters.test.tsx", "tests/vitest/ui/page-editor-v2-flow-loading.test.tsx", "tests/vitest/ui/page-editor-v2-flow-panels.test.tsx", "tests/vitest/ui/page-editor-v2-flow-responsive.test.tsx", "tests/vitest/ui/page-editor-v2-flow-sections.test.tsx", "tests/vitest/ui/page-editor-v2-flow-settings.test.tsx", "tests/vitest/ui/page-editor-v2-flow-toolbar.test.tsx", "tests/vitest/ui/page-editor-v2-inline-edit-flow.test.tsx", "tests/vitest/ui/page-editor-v2-layout-flow.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-flow.test.tsx", "tests/vitest/ui/page-editor-v2-responsive-flow.test.tsx", "tests/vitest/ui/page-editor-v2-settings-flow.test.tsx", "tests/vitest/ui/task-539-page-editor-flow.test.tsx", "tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx", "tests/vitest/ui/menu-design-editor.test.tsx", "tests/vitest/ui/page-editor-facade.test.ts", "tests/vitest/ui-integration/engine-detail-template-restyle.test.tsx"],
        "minimum": 46
      }
    },
    {
      "id": "w0-smoke-inventory",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "admin-pagination-vitest-1",
      "lane": "vitest",
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/task551PaginatedClients.test.ts", "tests/vitest/admin/task551PaginatedListViews.test.tsx", "tests/vitest/admin/task551PaginatedConsumerGraphScreens.test.tsx", "tests/vitest/admin/task551PaginatedConsumerGraphEditors.test.tsx", "tests/vitest/admin/formsClient.test.ts", "tests/vitest/admin/bookingClient.test.ts", "tests/vitest/admin/mediaClient.test.ts", "tests/vitest/admin/mediaUtils.test.ts", "tests/vitest/admin/pagesClient.test.ts", "tests/vitest/admin/pagesClientPagination.test.ts", "tests/vitest/admin/detailPagesClient.test.ts", "tests/vitest/admin/adminPrefetch.test.ts", "tests/vitest/ui/page-revision-drawer.test.tsx", "tests/vitest/ui/page-editor-v2-flow-autosave.test.tsx", "tests/vitest/ui/page-editor-v2-flow-columns.test.tsx", "tests/vitest/ui/page-editor-v2-flow-controls.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inline-edit.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inserters.test.tsx", "tests/vitest/ui/page-editor-v2-flow-loading.test.tsx", "tests/vitest/ui/page-editor-v2-flow-panels.test.tsx", "tests/vitest/ui/page-editor-v2-flow-responsive.test.tsx", "tests/vitest/ui/page-editor-v2-flow-sections.test.tsx", "tests/vitest/ui/page-editor-v2-flow-settings.test.tsx", "tests/vitest/ui/page-editor-v2-flow-toolbar.test.tsx", "tests/vitest/ui/detail-template-editor.test.tsx", "tests/vitest/ui/booking-page-wave.test.tsx", "tests/vitest/ui/booking-page-errors.test.tsx", "tests/vitest/ui/booking-page-schedule-crud.test.tsx", "tests/vitest/ui/booking-page-tabs.test.tsx", "tests/vitest/ui/booking-tabs-interactions-wave.test.tsx", "tests/vitest/ui/booking-tabs-leaf.test.tsx", "tests/vitest/ui/booking-helpers.test.ts", "tests/vitest/ui/booking-helpers-wave.test.ts", "tests/vitest/ui/form-submissions-page.test.tsx", "tests/vitest/ui/media-library.test.tsx", "tests/vitest/ui/media-library-load-retry-wave.test.tsx", "tests/vitest/ui/media-library-mutation-retry-wave.test.tsx", "tests/vitest/ui/media-library-page-wave.test.tsx", "tests/vitest/ui/media-card.test.tsx", "tests/vitest/ui/media-components.test.tsx", "tests/vitest/ui/media-details.test.tsx", "tests/vitest/ui/media-details-panel.test.tsx", "tests/vitest/ui/media-filter-panel.test.tsx", "tests/vitest/ui/media-folder-rail.test.tsx", "tests/vitest/ui/media-picker.test.tsx", "tests/vitest/ui/media-toolbar.test.tsx", "tests/vitest/ui/forms-pages-wave.test.tsx", "tests/vitest/ui/form-builder-page-wave.test.tsx", "tests/vitest/ui/forms-component-wave.test.tsx", "tests/vitest/ui/use-forms-wave.test.tsx", "tests/vitest/ui-integration/forms-list-restyle.test.tsx", "tests/vitest/ui-integration/forms.test.tsx", "tests/vitest/ui-integration/forms-submissions-restyle.test.tsx", "tests/vitest/validation/task551ListSchemas.test.ts", "tests/vitest/admin/adminUsersClient.test.ts", "tests/vitest/admin/entriesClientMutationReconciliation.test.ts", "tests/vitest/admin/entriesClientReadAuthority.test.ts", "tests/vitest/admin/entriesClient.test.ts", "tests/vitest/admin/postsClientCacheAuthority.test.ts", "tests/vitest/admin/postsClient.test.ts", "tests/vitest/mediaUi/mediaLibrary.test.tsx", "tests/vitest/pages/task-539-page-editor-controls.test.ts", "tests/vitest/ui/content-entries.test.tsx", "tests/vitest/ui/custom-screen-entry-navigation-authority.test.tsx", "tests/vitest/ui/custom-screen-records.test.tsx", "tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx", "tests/vitest/ui/drawer-sheet-a11y-gate.test.tsx", "tests/vitest/ui/entry-create-drawer-required-fields.test.tsx", "tests/vitest/ui/entry-field-relation-interaction.test.tsx", "tests/vitest/ui/entry-field-relation-option-identity.test.tsx", "tests/vitest/ui/entry-field-renderer-wave.test.tsx", "tests/vitest/ui/entry-list-filters.test.ts", "tests/vitest/ui/entry-list-wave.test.tsx", "tests/vitest/ui/entry-page-support-wave.test.tsx", "tests/vitest/ui/form-list-page-wave.test.tsx", "tests/vitest/ui-integration/admin-screens-restyle.test.tsx", "tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx", "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx", "tests/vitest/ui-integration/custom-screen-entries-restyle.test.tsx", "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx", "tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx", "tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx", "tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx", "tests/vitest/ui-integration/engine-detail-template-restyle.test.tsx", "tests/vitest/ui-integration/entry-list-restyle.test.tsx", "tests/vitest/ui-integration/media-restyle.test.tsx", "tests/vitest/ui-integration/media.test.tsx", "tests/vitest/ui-integration/post-editor-canvas-shared.test.tsx", "tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx", "tests/vitest/ui-integration/post-editor-toolbar-inspector-dedup.test.tsx", "tests/vitest/ui-integration/post-list-restyle.test.tsx", "tests/vitest/ui-integration/roles.test.tsx", "tests/vitest/ui-integration/users.test.tsx", "tests/vitest/ui/menu-design-editor-revalidation.test.tsx", "tests/vitest/ui/menu-design-editor.test.tsx", "tests/vitest/ui/menu-editor-refresh-policy.test.tsx", "tests/vitest/ui/menu-editor-shell-wave.test.tsx", "tests/vitest/ui/menu-editor.test.tsx", "tests/vitest/ui/menu-editor-validation.test.ts", "tests/vitest/ui/page-editor-facade.test.ts", "tests/vitest/ui/page-editor-failures-flow.test.tsx", "tests/vitest/ui/page-editor-gallery-items-control.test.tsx", "tests/vitest/ui/page-editor-insertion-flow.test.tsx", "tests/vitest/ui/page-editor-media-url-control.test.tsx", "tests/vitest/ui/page-editor-shell-branches-wave.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-flow.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-flow.test.tsx", "tests/vitest/ui/page-leaf-components.test.tsx", "tests/vitest/ui/page-list-cache-behavior.test.tsx", "tests/vitest/ui/page-list-filters.test.ts", "tests/vitest/ui/page-list-residual-wave.test.tsx", "tests/vitest/ui/page-list.test.tsx", "tests/vitest/ui/page-list-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-blocks-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-embeds-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-media-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-panels-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-toolbar-profile-routing.test.tsx", "tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx", "tests/vitest/ui/post-list-wave.test.tsx", "tests/vitest/ui/posts-list.test.tsx", "tests/vitest/ui/theme-editor-page-leaf.test.tsx", "tests/vitest/ui/theme-editor-page-wave.test.tsx", "tests/vitest/ui/users-roles-page-wave.test.tsx"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/admin/task551PaginatedClients.test.ts", "tests/vitest/admin/task551PaginatedListViews.test.tsx", "tests/vitest/admin/task551PaginatedConsumerGraphScreens.test.tsx", "tests/vitest/admin/task551PaginatedConsumerGraphEditors.test.tsx", "tests/vitest/admin/formsClient.test.ts", "tests/vitest/admin/bookingClient.test.ts", "tests/vitest/admin/mediaClient.test.ts", "tests/vitest/admin/mediaUtils.test.ts", "tests/vitest/admin/pagesClient.test.ts", "tests/vitest/admin/pagesClientPagination.test.ts", "tests/vitest/admin/detailPagesClient.test.ts", "tests/vitest/admin/adminPrefetch.test.ts", "tests/vitest/ui/page-revision-drawer.test.tsx", "tests/vitest/ui/page-editor-v2-flow-autosave.test.tsx", "tests/vitest/ui/page-editor-v2-flow-columns.test.tsx", "tests/vitest/ui/page-editor-v2-flow-controls.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inline-edit.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inserters.test.tsx", "tests/vitest/ui/page-editor-v2-flow-loading.test.tsx", "tests/vitest/ui/page-editor-v2-flow-panels.test.tsx", "tests/vitest/ui/page-editor-v2-flow-responsive.test.tsx", "tests/vitest/ui/page-editor-v2-flow-sections.test.tsx", "tests/vitest/ui/page-editor-v2-flow-settings.test.tsx", "tests/vitest/ui/page-editor-v2-flow-toolbar.test.tsx", "tests/vitest/ui/detail-template-editor.test.tsx", "tests/vitest/ui/booking-page-wave.test.tsx", "tests/vitest/ui/booking-page-errors.test.tsx", "tests/vitest/ui/booking-page-schedule-crud.test.tsx", "tests/vitest/ui/booking-page-tabs.test.tsx", "tests/vitest/ui/booking-tabs-interactions-wave.test.tsx", "tests/vitest/ui/booking-tabs-leaf.test.tsx", "tests/vitest/ui/booking-helpers.test.ts", "tests/vitest/ui/booking-helpers-wave.test.ts", "tests/vitest/ui/form-submissions-page.test.tsx", "tests/vitest/ui/media-library.test.tsx", "tests/vitest/ui/media-library-load-retry-wave.test.tsx", "tests/vitest/ui/media-library-mutation-retry-wave.test.tsx", "tests/vitest/ui/media-library-page-wave.test.tsx", "tests/vitest/ui/media-card.test.tsx", "tests/vitest/ui/media-components.test.tsx", "tests/vitest/ui/media-details.test.tsx", "tests/vitest/ui/media-details-panel.test.tsx", "tests/vitest/ui/media-filter-panel.test.tsx", "tests/vitest/ui/media-folder-rail.test.tsx", "tests/vitest/ui/media-picker.test.tsx", "tests/vitest/ui/media-toolbar.test.tsx", "tests/vitest/ui/forms-pages-wave.test.tsx", "tests/vitest/ui/form-builder-page-wave.test.tsx", "tests/vitest/ui/forms-component-wave.test.tsx", "tests/vitest/ui/use-forms-wave.test.tsx", "tests/vitest/ui-integration/forms-list-restyle.test.tsx", "tests/vitest/ui-integration/forms.test.tsx", "tests/vitest/ui-integration/forms-submissions-restyle.test.tsx", "tests/vitest/validation/task551ListSchemas.test.ts", "tests/vitest/admin/adminUsersClient.test.ts", "tests/vitest/admin/entriesClientMutationReconciliation.test.ts", "tests/vitest/admin/entriesClientReadAuthority.test.ts", "tests/vitest/admin/entriesClient.test.ts", "tests/vitest/admin/postsClientCacheAuthority.test.ts", "tests/vitest/admin/postsClient.test.ts", "tests/vitest/mediaUi/mediaLibrary.test.tsx", "tests/vitest/pages/task-539-page-editor-controls.test.ts", "tests/vitest/ui/content-entries.test.tsx", "tests/vitest/ui/custom-screen-entry-navigation-authority.test.tsx", "tests/vitest/ui/custom-screen-records.test.tsx", "tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx", "tests/vitest/ui/drawer-sheet-a11y-gate.test.tsx", "tests/vitest/ui/entry-create-drawer-required-fields.test.tsx", "tests/vitest/ui/entry-field-relation-interaction.test.tsx", "tests/vitest/ui/entry-field-relation-option-identity.test.tsx", "tests/vitest/ui/entry-field-renderer-wave.test.tsx", "tests/vitest/ui/entry-list-filters.test.ts", "tests/vitest/ui/entry-list-wave.test.tsx", "tests/vitest/ui/entry-page-support-wave.test.tsx", "tests/vitest/ui/form-list-page-wave.test.tsx", "tests/vitest/ui-integration/admin-screens-restyle.test.tsx", "tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx", "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx", "tests/vitest/ui-integration/custom-screen-entries-restyle.test.tsx", "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx", "tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx", "tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx", "tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx", "tests/vitest/ui-integration/engine-detail-template-restyle.test.tsx", "tests/vitest/ui-integration/entry-list-restyle.test.tsx", "tests/vitest/ui-integration/media-restyle.test.tsx", "tests/vitest/ui-integration/media.test.tsx", "tests/vitest/ui-integration/post-editor-canvas-shared.test.tsx", "tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx", "tests/vitest/ui-integration/post-editor-toolbar-inspector-dedup.test.tsx", "tests/vitest/ui-integration/post-list-restyle.test.tsx", "tests/vitest/ui-integration/roles.test.tsx", "tests/vitest/ui-integration/users.test.tsx", "tests/vitest/ui/menu-design-editor-revalidation.test.tsx", "tests/vitest/ui/menu-design-editor.test.tsx", "tests/vitest/ui/menu-editor-refresh-policy.test.tsx", "tests/vitest/ui/menu-editor-shell-wave.test.tsx", "tests/vitest/ui/menu-editor.test.tsx", "tests/vitest/ui/menu-editor-validation.test.ts", "tests/vitest/ui/page-editor-facade.test.ts", "tests/vitest/ui/page-editor-failures-flow.test.tsx", "tests/vitest/ui/page-editor-gallery-items-control.test.tsx", "tests/vitest/ui/page-editor-insertion-flow.test.tsx", "tests/vitest/ui/page-editor-media-url-control.test.tsx", "tests/vitest/ui/page-editor-shell-branches-wave.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-flow.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-flow.test.tsx", "tests/vitest/ui/page-leaf-components.test.tsx", "tests/vitest/ui/page-list-cache-behavior.test.tsx", "tests/vitest/ui/page-list-filters.test.ts", "tests/vitest/ui/page-list-residual-wave.test.tsx", "tests/vitest/ui/page-list.test.tsx", "tests/vitest/ui/page-list-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-blocks-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-embeds-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-media-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-panels-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-toolbar-profile-routing.test.tsx", "tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx", "tests/vitest/ui/post-list-wave.test.tsx", "tests/vitest/ui/posts-list.test.tsx", "tests/vitest/ui/theme-editor-page-leaf.test.tsx", "tests/vitest/ui/theme-editor-page-wave.test.tsx", "tests/vitest/ui/users-roles-page-wave.test.tsx"],
        "minimum": 124
      }
    },
    {
      "id": "admin-pagination-vitest-2",
      "lane": "vitest",
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/ui/users-roles.test.tsx", "tests/vitest/ui/use-screen-related-entries.test.tsx", "tests/vitest/admin/entriesClientRevisions.test.ts", "tests/vitest/customScreens/relatedEntryResolver.test.ts", "tests/vitest/ui/page-editor-revision-history.test.tsx", "tests/vitest/ui/post-editor-media-controls.test.tsx", "tests/vitest/ui/users-roles-extraction.test.tsx", "tests/vitest/ui/menu-design-editor-responsive.test.tsx", "tests/vitest/ui/menu-design-editor-nav-levels.test.tsx", "tests/vitest/ui/menu-design-editor-dropdown-bar.test.tsx", "tests/vitest/ui/users-roles-page-pagination-wave.test.tsx", "tests/vitest/ui/use-screen-related-entries-ids.test.tsx", "tests/vitest/ui/entry-field-renderer-relation-ids-wave.test.tsx", "tests/vitest/ui/page-editor-shell-revisions-wave.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-revisions-flow.test.tsx", "tests/vitest/ui/entry-list-pagination-wave.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-revisions-flow.test.tsx", "tests/vitest/ui/detail-template-editor-revisions.test.tsx", "tests/vitest/ui/media-library-mutation-pagination-wave.test.tsx", "tests/vitest/pages/task-539-page-editor-media-controls.test.ts", "tests/vitest/admin/mediaClientListEnvelope.test.ts", "tests/vitest/ui/forms-component-list-wave.test.tsx", "tests/vitest/admin/entriesClientPagination.test.ts", "tests/vitest/ui/page-editor-insertion-media-flow.test.tsx", "tests/vitest/ui-integration/custom-screen-task-540-list-flow.test.tsx", "tests/vitest/ui/site-settings.test.tsx", "tests/vitest/ui-integration/settings-general-site-restyle.test.tsx", "tests/vitest/ui/custom-screen-list-view.test.ts", "tests/vitest/ui/page-editor-settings-flow.test.tsx", "tests/vitest/ui/menu-item-form.test.tsx"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/ui/users-roles.test.tsx", "tests/vitest/ui/use-screen-related-entries.test.tsx", "tests/vitest/admin/entriesClientRevisions.test.ts", "tests/vitest/customScreens/relatedEntryResolver.test.ts", "tests/vitest/ui/page-editor-revision-history.test.tsx", "tests/vitest/ui/post-editor-media-controls.test.tsx", "tests/vitest/ui/users-roles-extraction.test.tsx", "tests/vitest/ui/menu-design-editor-responsive.test.tsx", "tests/vitest/ui/menu-design-editor-nav-levels.test.tsx", "tests/vitest/ui/menu-design-editor-dropdown-bar.test.tsx", "tests/vitest/ui/users-roles-page-pagination-wave.test.tsx", "tests/vitest/ui/use-screen-related-entries-ids.test.tsx", "tests/vitest/ui/entry-field-renderer-relation-ids-wave.test.tsx", "tests/vitest/ui/page-editor-shell-revisions-wave.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-revisions-flow.test.tsx", "tests/vitest/ui/entry-list-pagination-wave.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-revisions-flow.test.tsx", "tests/vitest/ui/detail-template-editor-revisions.test.tsx", "tests/vitest/ui/media-library-mutation-pagination-wave.test.tsx", "tests/vitest/pages/task-539-page-editor-media-controls.test.ts", "tests/vitest/admin/mediaClientListEnvelope.test.ts", "tests/vitest/ui/forms-component-list-wave.test.tsx", "tests/vitest/admin/entriesClientPagination.test.ts", "tests/vitest/ui/page-editor-insertion-media-flow.test.tsx", "tests/vitest/ui-integration/custom-screen-task-540-list-flow.test.tsx", "tests/vitest/ui/site-settings.test.tsx", "tests/vitest/ui-integration/settings-general-site-restyle.test.tsx", "tests/vitest/ui/custom-screen-list-view.test.ts", "tests/vitest/ui/page-editor-settings-flow.test.tsx", "tests/vitest/ui/menu-item-form.test.tsx"],
        "minimum": 30
      }
    },
    {
      "id": "owned-module-consumers-vitest-1",
      "lane": "vitest",
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/adminApp.test.tsx", "tests/vitest/admin/formRuntimePreviewDialog.test.tsx", "tests/vitest/admin/legacy-widget-surface-retired.test.ts", "tests/vitest/content/entryReadServiceVisibilityProbe.test.ts", "tests/vitest/customScreens/customScreenSummaryContract.test.ts", "tests/vitest/forms/formSettings.test.ts", "tests/vitest/forms/formSupportingText.test.ts", "tests/vitest/pages/page-template-editor-wave.test.tsx", "tests/vitest/services/mediaSchemas.test.ts", "tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx", "tests/vitest/ui-integration/custom-screen-runtime-interactions.test.tsx", "tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx", "tests/vitest/ui-integration/engine-collection-workspace-restyle.test.tsx", "tests/vitest/ui-integration/entry-editor-hydration-race.test.tsx", "tests/vitest/ui-integration/entry-editor-navigation-guard.test.tsx", "tests/vitest/ui-integration/entry-editor-restyle.test.tsx", "tests/vitest/ui-integration/entry-editor-submit-authority.test.tsx", "tests/vitest/ui-integration/form-supporting-text.test.tsx", "tests/vitest/ui-integration/forms-action-logs-restyle.test.tsx", "tests/vitest/ui-integration/forms-builder-restyle.test.tsx", "tests/vitest/ui/access-logs-table.test.tsx", "tests/vitest/ui/access-logs.test.tsx", "tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx", "tests/vitest/ui/collection-workspace.test.tsx", "tests/vitest/ui/custom-screen-entry-draft.test.ts", "tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx", "tests/vitest/ui/custom-screen-list-view-canvas.test.tsx", "tests/vitest/ui/custom-screen-preview-data.test.ts", "tests/vitest/ui/custom-screen-sidebar-shortcut-state.test.ts", "tests/vitest/ui/custom-screens-list-wave.test.tsx"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/admin/adminApp.test.tsx", "tests/vitest/admin/formRuntimePreviewDialog.test.tsx", "tests/vitest/admin/legacy-widget-surface-retired.test.ts", "tests/vitest/content/entryReadServiceVisibilityProbe.test.ts", "tests/vitest/customScreens/customScreenSummaryContract.test.ts", "tests/vitest/forms/formSettings.test.ts", "tests/vitest/forms/formSupportingText.test.ts", "tests/vitest/pages/page-template-editor-wave.test.tsx", "tests/vitest/services/mediaSchemas.test.ts", "tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx", "tests/vitest/ui-integration/custom-screen-runtime-interactions.test.tsx", "tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx", "tests/vitest/ui-integration/engine-collection-workspace-restyle.test.tsx", "tests/vitest/ui-integration/entry-editor-hydration-race.test.tsx", "tests/vitest/ui-integration/entry-editor-navigation-guard.test.tsx", "tests/vitest/ui-integration/entry-editor-restyle.test.tsx", "tests/vitest/ui-integration/entry-editor-submit-authority.test.tsx", "tests/vitest/ui-integration/form-supporting-text.test.tsx", "tests/vitest/ui-integration/forms-action-logs-restyle.test.tsx", "tests/vitest/ui-integration/forms-builder-restyle.test.tsx", "tests/vitest/ui/access-logs-table.test.tsx", "tests/vitest/ui/access-logs.test.tsx", "tests/vitest/ui/analytics-settings-entries-seo-leafs.test.tsx", "tests/vitest/ui/collection-workspace.test.tsx", "tests/vitest/ui/custom-screen-entry-draft.test.ts", "tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx", "tests/vitest/ui/custom-screen-list-view-canvas.test.tsx", "tests/vitest/ui/custom-screen-preview-data.test.ts", "tests/vitest/ui/custom-screen-sidebar-shortcut-state.test.ts", "tests/vitest/ui/custom-screens-list-wave.test.tsx"],
        "minimum": 30
      }
    },
    {
      "id": "owned-module-consumers-vitest-2",
      "lane": "vitest",
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/ui/entry-editor-shell-wave.test.tsx", "tests/vitest/ui/entry-editor-visibility-groups.test.tsx", "tests/vitest/ui/entry-field-relation.test.tsx", "tests/vitest/ui/entry-list-visibility-view.test.tsx", "tests/vitest/ui/entry-revision-drawer.test.tsx", "tests/vitest/ui/entry-table-title.test.tsx", "tests/vitest/ui/entry-table-wave.test.tsx", "tests/vitest/ui/form-action-logs-page.test.tsx", "tests/vitest/ui/form-actions-panel.test.tsx", "tests/vitest/ui/menu-leaf-components.test.tsx", "tests/vitest/ui/page-authoring-canvas.test.tsx", "tests/vitest/ui/page-editor-control-primitives.test.tsx", "tests/vitest/ui/page-editor-layout-shell.test.tsx", "tests/vitest/ui/page-table-wave.test.tsx", "tests/vitest/ui/page-table.test.tsx", "tests/vitest/ui/panel-leaf-wave-2.test.tsx", "tests/vitest/ui/post-document-inspector-wave.test.tsx", "tests/vitest/ui/post-editor-save-sync.test.ts", "tests/vitest/ui/posts-editor-chrome-wave.test.tsx", "tests/vitest/ui/posts-table-wave.test.tsx", "tests/vitest/ui/use-entry-hooks-wave.test.tsx", "tests/vitest/ui/usePostEditorState-barriers.test.tsx", "tests/vitest/ui/usePostEditorState-cross-epoch.test.tsx", "tests/vitest/ui/usePostEditorState-crud.test.tsx", "tests/vitest/ui/usePostEditorState-debt.test.tsx", "tests/vitest/ui/usePostEditorState-identity.test.tsx", "tests/vitest/ui/usePostEditorState-revisions.test.tsx", "tests/vitest/ui/usePostEditorState-save-ordering.test.tsx", "tests/vitest/validation/bookingSchemas.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/ui/entry-editor-shell-wave.test.tsx", "tests/vitest/ui/entry-editor-visibility-groups.test.tsx", "tests/vitest/ui/entry-field-relation.test.tsx", "tests/vitest/ui/entry-list-visibility-view.test.tsx", "tests/vitest/ui/entry-revision-drawer.test.tsx", "tests/vitest/ui/entry-table-title.test.tsx", "tests/vitest/ui/entry-table-wave.test.tsx", "tests/vitest/ui/form-action-logs-page.test.tsx", "tests/vitest/ui/form-actions-panel.test.tsx", "tests/vitest/ui/menu-leaf-components.test.tsx", "tests/vitest/ui/page-authoring-canvas.test.tsx", "tests/vitest/ui/page-editor-control-primitives.test.tsx", "tests/vitest/ui/page-editor-layout-shell.test.tsx", "tests/vitest/ui/page-table-wave.test.tsx", "tests/vitest/ui/page-table.test.tsx", "tests/vitest/ui/panel-leaf-wave-2.test.tsx", "tests/vitest/ui/post-document-inspector-wave.test.tsx", "tests/vitest/ui/post-editor-save-sync.test.ts", "tests/vitest/ui/posts-editor-chrome-wave.test.tsx", "tests/vitest/ui/posts-table-wave.test.tsx", "tests/vitest/ui/use-entry-hooks-wave.test.tsx", "tests/vitest/ui/usePostEditorState-barriers.test.tsx", "tests/vitest/ui/usePostEditorState-cross-epoch.test.tsx", "tests/vitest/ui/usePostEditorState-crud.test.tsx", "tests/vitest/ui/usePostEditorState-debt.test.tsx", "tests/vitest/ui/usePostEditorState-identity.test.tsx", "tests/vitest/ui/usePostEditorState-revisions.test.tsx", "tests/vitest/ui/usePostEditorState-save-ordering.test.tsx", "tests/vitest/validation/bookingSchemas.test.ts"],
        "minimum": 29
      }
    },
    {
      "id": "owned-module-consumers-bun",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/routes/contentEntriesRoutes.test.ts", "tests/integration/routes/contentTypeConfigRoundTrip.test.ts", "tests/integration/routes/contentTypes.test.ts", "tests/integration/routes/detailPages.test.ts", "tests/integration/routes/formSupportingTextRoutes.test.ts", "tests/integration/routes/media-folders.test.ts", "tests/integration/routes/media.test.ts", "tests/integration/routes/pages.test.ts", "tests/integration/routes/popups-public.test.ts", "tests/integration/routes/seo-pipeline.test.ts", "tests/integration/routes/userSettings.test.ts", "tests/integration/runtime/detail-page-runtime-lite.test.ts", "tests/integration/runtime/entry-visibility-gate.test.ts", "tests/integration/runtime/task-539-page-parity-runtime.test.ts", "tests/integration/server/entry-access-password-hash.test.ts", "tests/integration/server/formsWriteMounts.test.ts", "tests/security/installAdmin.test.ts", "tests/security/seo-pipeline.test.ts", "tests/unit/access/accessLogExport.test.ts", "tests/unit/access/accessLogService.test.ts", "tests/unit/auth/loginAlert.test.ts", "tests/unit/auth/sessionCookieOptions.test.ts", "tests/unit/backups/backupUsersSection.test.ts", "tests/unit/content/entryServiceFacadeFence.test.ts", "tests/unit/kits/nativeCmsWriterFenceInventory.test.ts", "tests/unit/pages/validation.test.ts", "tests/unit/runtime-smoke/detail-page-v2-adapter.test.ts", "tests/unit/runtime-smoke/repository-report.test.ts", "tests/unit/runtime-smoke/routing-settings-lease.test.ts", "tests/unit/runtime-smoke/task-493-adapter.test.ts", "tests/unit/runtime-smoke/task-554-adapter.test.ts", "tests/unit/runtime-smoke/task517-browser-actions.test.ts", "tests/unit/runtime-smoke/task547-cleanup-batch.test.ts", "tests/unit/runtime-smoke/widget-contract-admin-probe.test.ts", "tests/unit/runtime-smoke/widget-contract-fixtures.test.ts", "tests/unit/runtime-smoke/widget-contract-inventory.test.ts", "tests/unit/security/csrf.test.ts", "tests/unit/server/publicFormsApi.test.ts", "tests/unit/server/schemaValidator.test.ts", "tests/unit/workflows/task554WorkflowContracts.test.ts", "tests/integration/routes/pageTemplates.test.ts"],
      "environmentProfile": "task551-db-test",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/routes/contentEntriesRoutes.test.ts", "tests/integration/routes/contentTypeConfigRoundTrip.test.ts", "tests/integration/routes/contentTypes.test.ts", "tests/integration/routes/detailPages.test.ts", "tests/integration/routes/formSupportingTextRoutes.test.ts", "tests/integration/routes/media-folders.test.ts", "tests/integration/routes/media.test.ts", "tests/integration/routes/pages.test.ts", "tests/integration/routes/popups-public.test.ts", "tests/integration/routes/seo-pipeline.test.ts", "tests/integration/routes/userSettings.test.ts", "tests/integration/runtime/detail-page-runtime-lite.test.ts", "tests/integration/runtime/entry-visibility-gate.test.ts", "tests/integration/runtime/task-539-page-parity-runtime.test.ts", "tests/integration/server/entry-access-password-hash.test.ts", "tests/integration/server/formsWriteMounts.test.ts", "tests/security/installAdmin.test.ts", "tests/security/seo-pipeline.test.ts", "tests/unit/access/accessLogExport.test.ts", "tests/unit/access/accessLogService.test.ts", "tests/unit/auth/loginAlert.test.ts", "tests/unit/auth/sessionCookieOptions.test.ts", "tests/unit/backups/backupUsersSection.test.ts", "tests/unit/content/entryServiceFacadeFence.test.ts", "tests/unit/kits/nativeCmsWriterFenceInventory.test.ts", "tests/unit/pages/validation.test.ts", "tests/unit/runtime-smoke/detail-page-v2-adapter.test.ts", "tests/unit/runtime-smoke/repository-report.test.ts", "tests/unit/runtime-smoke/routing-settings-lease.test.ts", "tests/unit/runtime-smoke/task-493-adapter.test.ts", "tests/unit/runtime-smoke/task-554-adapter.test.ts", "tests/unit/runtime-smoke/task517-browser-actions.test.ts", "tests/unit/runtime-smoke/task547-cleanup-batch.test.ts", "tests/unit/runtime-smoke/widget-contract-admin-probe.test.ts", "tests/unit/runtime-smoke/widget-contract-fixtures.test.ts", "tests/unit/runtime-smoke/widget-contract-inventory.test.ts", "tests/unit/security/csrf.test.ts", "tests/unit/server/publicFormsApi.test.ts", "tests/unit/server/schemaValidator.test.ts", "tests/unit/workflows/task554WorkflowContracts.test.ts", "tests/integration/routes/pageTemplates.test.ts"],
        "minimum": 41
      }
    },
    {
      "id": "admin-prefetch-budget-receipt",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/perf/admin-prefetch-budget.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/admin-prefetch-budget.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "admin-prefetch-policy-receipt",
      "lane": "vitest",
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/admin-prefetch-policy.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/admin/admin-prefetch-policy.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "w2-client-vitest",
      "lane": "vitest",
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/task551PaginatedClients.test.ts", "tests/vitest/admin/pagesClient.test.ts", "tests/vitest/admin/pagesClientPagination.test.ts", "tests/vitest/admin/detailPagesClient.test.ts", "tests/vitest/admin/entriesClient.test.ts", "tests/vitest/admin/entriesClientPagination.test.ts", "tests/vitest/admin/entriesClientRevisions.test.ts", "tests/vitest/admin/entriesClientMutationReconciliation.test.ts", "tests/vitest/admin/entriesClientReadAuthority.test.ts", "tests/vitest/admin/postsClient.test.ts", "tests/vitest/admin/postsClientCacheAuthority.test.ts", "tests/vitest/admin/adminUsersClient.test.ts", "tests/vitest/admin/formsClient.test.ts", "tests/vitest/admin/mediaClient.test.ts", "tests/vitest/admin/mediaClientListEnvelope.test.ts", "tests/vitest/admin/bookingClient.test.ts", "tests/vitest/admin/adminPrefetch.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/admin/task551PaginatedClients.test.ts", "tests/vitest/admin/pagesClient.test.ts", "tests/vitest/admin/pagesClientPagination.test.ts", "tests/vitest/admin/detailPagesClient.test.ts", "tests/vitest/admin/entriesClient.test.ts", "tests/vitest/admin/entriesClientPagination.test.ts", "tests/vitest/admin/entriesClientRevisions.test.ts", "tests/vitest/admin/entriesClientMutationReconciliation.test.ts", "tests/vitest/admin/entriesClientReadAuthority.test.ts", "tests/vitest/admin/postsClient.test.ts", "tests/vitest/admin/postsClientCacheAuthority.test.ts", "tests/vitest/admin/adminUsersClient.test.ts", "tests/vitest/admin/formsClient.test.ts", "tests/vitest/admin/mediaClient.test.ts", "tests/vitest/admin/mediaClientListEnvelope.test.ts", "tests/vitest/admin/bookingClient.test.ts", "tests/vitest/admin/adminPrefetch.test.ts"],
        "minimum": 17
      }
    },
    {
      "id": "task554-regression-vitest",
      "lane": "vitest",
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/validation/postSchemas.test.ts", "tests/vitest/server/postMetadataContract.test.ts", "tests/vitest/server/requestBody.test.ts", "tests/vitest/ui/post-metadata-mutation-payload.test.ts", "tests/vitest/ui/post-external-update-authority.test.ts", "tests/vitest/ui/post-classic-editor-shell-wave.test.tsx", "tests/vitest/ui/post-classic-metadata-hydration.test.tsx", "tests/vitest/ui/post-editor-state-metadata-boundary.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/validation/postSchemas.test.ts", "tests/vitest/server/postMetadataContract.test.ts", "tests/vitest/server/requestBody.test.ts", "tests/vitest/ui/post-metadata-mutation-payload.test.ts", "tests/vitest/ui/post-external-update-authority.test.ts", "tests/vitest/ui/post-classic-editor-shell-wave.test.tsx", "tests/vitest/ui/post-classic-metadata-hydration.test.tsx", "tests/vitest/ui/post-editor-state-metadata-boundary.test.ts"],
        "minimum": 8
      }
    },
    {
      "id": "task554-regression-bun",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/routes/postsRoutes.test.ts", "tests/integration/routes/postMetadataRbac.test.ts", "tests/unit/auth/rbac.test.ts"],
      "environmentProfile": "task551-db-test",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/routes/postsRoutes.test.ts", "tests/integration/routes/postMetadataRbac.test.ts", "tests/unit/auth/rbac.test.ts"],
        "minimum": 3
      }
    },
    {
      "id": "runtime-smoke-registry-tests",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/unit/runtime-smoke/task-551-admin-lists-adapter.test.ts", "tests/unit/runtime-smoke/cli-registry.test.ts", "tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts", "tests/unit/runtime-smoke/task-551-admin-lists-worker.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/unit/runtime-smoke/task-551-admin-lists-adapter.test.ts", "tests/unit/runtime-smoke/cli-registry.test.ts", "tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts", "tests/unit/runtime-smoke/task-551-admin-lists-worker.test.ts"],
        "minimum": 4
      }
    },
    {
      "id": "admin-list-performance-test",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/perf/database-admin-list-budgets.test.ts"],
      "environmentProfile": "task551-db-test",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/database-admin-list-budgets.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "database-explain-plans-receipt",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/perf/database-explain-plans.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/database-explain-plans.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "core-lint-types",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "repo-lint-types",
      "lane": "tooling",
      "argv": ["./node_modules/.bin/tsc", "-p", "tsconfig.json", "--noEmit"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "diff-check",
      "lane": "tooling",
      "argv": ["git", "diff", "--check"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "diff-check-untracked",
      "lane": "tooling",
      "argv": ["bun", "--env-file=/dev/null", "-e", "const listed = Bun.spawnSync([\"git\", \"ls-files\", \"-z\", \"--others\", \"--exclude-standard\", \"--\", \"core\", \"scripts\", \"tests\"]); if (listed.exitCode !== 0) throw new Error(\"git ls-files failed\"); const bad = []; for (const path of listed.stdout.toString().split(\"\\0\").filter(Boolean)) { const text = await Bun.file(path).text(); const lines = text.split(\"\\n\"); lines.forEach((line, index) => { if (/[ \\t\\r]+$/.test(line)) bad.push(`${path}:${index + 1}: trailing whitespace`); if (/^ +\\t/.test(line)) bad.push(`${path}:${index + 1}: space before tab`); if (/^(<{7}|={7}|>{7})( |$)/.test(line)) bad.push(`${path}:${index + 1}: conflict marker`); }); if (/\\n\\n$/.test(text)) bad.push(`${path}: blank line at EOF`); } if (bad.length > 0) { console.error(bad.join(\"\\n\")); process.exit(1); }"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "line-count-1",
      "lane": "tooling",
      "argv": ["wc", "-l", "core/services/pages/pageReadService.ts", "core/services/content/entryReadService.ts", "core/services/content/postReadService.ts", "core/services/admin/userReadService.ts", "core/services/forms/formReadService.ts", "core/services/forms/submissionReadService.ts", "core/services/media/mediaReadService.ts", "core/services/booking/bookingReadService.ts", "core/services/booking/bookingMutationService.ts", "core/services/booking/bookingScheduleService.ts", "core/services/booking/bookingService.ts", "core/services/admin/usersService.ts", "core/services/auth/sessionService.ts", "core/server/routes/index.ts", "core/server/routes/pageRoutes.ts", "core/server/routes/detailPageRoutes.ts", "core/server/routes/contentEntryRoutes.ts", "core/server/routes/postsRoutes.ts", "core/server/routes/adminUsersRoutes.ts", "core/server/routes/formsRoutes.ts", "core/server/routes/mediaRoutes.ts", "core/server/routes/bookingRoutes.ts", "core/server/validation/pageSchemas.ts", "core/server/validation/detailPageSchemas.ts", "core/server/validation/contentSchemas.ts", "core/server/validation/postSchemas.ts", "core/server/validation/adminUserSchemas.ts", "core/server/validation/formSchemas.ts", "core/server/validation/mediaSchemas.ts", "core/server/validation/bookingSchemas.ts", "core/admin/services/pagesClient.ts", "core/admin/services/detailPagesClient.ts", "core/admin/services/entriesClient.ts", "core/admin/services/postsClient.ts", "core/admin/services/adminUsersClient.ts", "core/admin/services/formsClient.ts", "core/admin/services/mediaClient.ts", "core/admin/services/bookingClient.ts", "core/admin/ui/pages/PageListPage.tsx", "core/admin/ui/pages/PageRevisionDrawer.tsx", "core/admin/ui/pages/PageTable.tsx", "core/admin/ui/pages/editor/PageEditorRegistryFields.tsx", "core/admin/ui/pages/editorControls/MediaUrlControl.tsx", "core/admin/ui/content-types/DetailTemplateEditorPage.tsx", "core/admin/ui/content-types/DetailTemplateInspector.tsx", "core/admin/ui/content-types/DetailTemplateRevisionPanel.tsx", "core/admin/ui/entries/EntryList.tsx", "core/admin/ui/entries/EntryGrid.tsx", "core/admin/ui/entries/EntryTable.tsx", "core/admin/ui/entries/FieldRenderer.tsx", "core/admin/ui/posts/PostsListPage.tsx", "core/admin/ui/posts/PostsTable.tsx", "core/admin/ui/posts/editor/PostEditorCanvas.tsx", "core/admin/ui/posts/editor/PostEditorMediaControls.tsx", "core/admin/ui/users/UsersRolesPage.tsx", "core/admin/ui/users/UsersRolesContent.tsx", "core/admin/ui/forms/FormListPage.tsx", "core/admin/ui/forms/FormTable.tsx", "core/admin/ui/forms/FormSubmissionsPage.tsx", "core/admin/ui/forms/hooks/useForms.ts", "core/admin/ui/media/MediaLibraryPage.tsx", "core/admin/ui/media/MediaLibraryFolderState.ts", "core/admin/ui/media/MediaLibraryResults.tsx", "core/admin/ui/media/MediaPicker.tsx", "core/admin/ui/media/utils.ts", "core/admin/ui/booking/BookingPage.tsx", "core/admin/ui/booking/BookingOverviewPanel.tsx", "core/admin/ui/booking/bookingHelpers.ts", "core/admin/ui/booking/bookingTypes.ts", "core/admin/ui/booking/components/AvailabilityTab.tsx", "core/admin/ui/booking/components/ReservationsTab.tsx", "core/admin/ui/booking/components/ResourcesTab.tsx", "core/admin/ui/booking/components/ServicesTab.tsx", "core/admin/ui/booking/components/SlotPreviewTab.tsx", "core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx", "core/admin/ui/custom-screens/CustomScreenEntriesTable.tsx", "core/admin/ui/custom-screens/customScreenListModel.ts", "core/admin/ui/custom-screens/customScreenPreviewData.ts", "core/admin/ui/custom-screens/hooks/useScreenEntryPresentationMedia.ts", "core/admin/ui/custom-screens/hooks/useScreenRelatedEntries.ts", "core/admin/ui/custom-screens/ListViewCanvas.tsx", "core/admin/ui/menus/MenuDesignEditor.tsx", "core/admin/ui/menus/MenuDesignEditorBrandNavControls.tsx", "core/admin/ui/menus/MenuEditorPage.tsx", "core/admin/ui/menus/MenuEditorWorkspace.tsx", "core/admin/ui/menus/MenuItemDrawer.tsx", "core/admin/ui/menus/MenuItemForm.tsx", "core/admin/ui/site/SiteSettingsPage.tsx", "core/admin/ui/themes/ThemeEditorPage.tsx", "core/admin/utils/adminPrefetch.ts", "core/admin/utils/adminPrefetchCustomScreens.ts", "core/admin/services/adminListEnvelope.ts", "core/admin/services/entriesClientPagination.ts", "core/admin/ui/shared/useBoundedAdminList.ts", "core/admin/ui/shared/BoundedListFooter.tsx", "core/admin/ui/pages/editor/pageEditorHostContract.ts", "core/admin/ui/pages/editor/usePageEditorController.ts", "core/admin/ui/pages/editor/usePageEditorRevisions.ts", "core/admin/ui/pages/editor/PageEditorToolbar.tsx", "core/admin/ui/pages/editor/PageEditorToolbarRevisions.tsx", "core/admin/ui/pages/editor/PageEditorSettingsPanel.tsx", "core/admin/ui/pages/editor/PageEditorHistorySheet.tsx", "core/admin/ui/pages/editor/PageEditorRegistryPickers.tsx", "core/admin/ui/media/useMediaFolderOperations.ts", "core/admin/ui/booking/useBookingCollections.ts", "core/admin/ui/posts/editor/PostCanvasBlockItem.tsx", "core/admin/ui/users/useUsersRolesCollections.ts", "core/admin/ui/site/SiteSettingsPagePickers.tsx", "core/admin/ui/custom-screens/useCustomScreenEntryList.ts", "core/server/routes/boundedReadErrors.ts", "core/services/customScreens/relatedEntryResolver.ts", "scripts/runtime-smoke/contracts.ts", "scripts/runtime-smoke/registry.ts", "scripts/runtime-smoke/cli.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/contracts.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/fixtures.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/browser-plan.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/suite.ts", "tests/integration/routes/task551BoundedAdminLists.test.ts", "tests/integration/server/task551AdminWriteConcurrency.test.ts", "tests/vitest/admin/task551PaginatedClients.test.ts", "tests/vitest/admin/task551PaginatedListViews.test.tsx", "tests/vitest/admin/task551PaginatedConsumerGraphScreens.test.tsx", "tests/vitest/admin/task551PaginatedConsumerGraphEditors.test.tsx", "tests/vitest/admin/formsClient.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "line-count-2",
      "lane": "tooling",
      "argv": ["wc", "-l", "tests/vitest/admin/bookingClient.test.ts", "tests/vitest/admin/mediaClient.test.ts", "tests/vitest/admin/mediaUtils.test.ts", "tests/vitest/admin/pagesClient.test.ts", "tests/vitest/admin/pagesClientPagination.test.ts", "tests/vitest/admin/detailPagesClient.test.ts", "tests/vitest/admin/adminPrefetch.test.ts", "tests/vitest/ui/page-revision-drawer.test.tsx", "tests/vitest/ui/pageEditorV2Fixtures.tsx", "tests/vitest/ui/pageEditorV2FlowHarness.tsx", "tests/vitest/ui/pageEditorV2Helpers.tsx", "tests/vitest/ui/pageEditorV2Interactions.tsx", "tests/vitest/ui/page-editor-v2-flow-autosave.test.tsx", "tests/vitest/ui/page-editor-v2-flow-columns.test.tsx", "tests/vitest/ui/page-editor-v2-flow-controls.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inline-edit.test.tsx", "tests/vitest/ui/page-editor-v2-flow-inserters.test.tsx", "tests/vitest/ui/page-editor-v2-flow-loading.test.tsx", "tests/vitest/ui/page-editor-v2-flow-panels.test.tsx", "tests/vitest/ui/page-editor-v2-flow-responsive.test.tsx", "tests/vitest/ui/page-editor-v2-flow-sections.test.tsx", "tests/vitest/ui/page-editor-v2-flow-settings.test.tsx", "tests/vitest/ui/page-editor-v2-flow-toolbar.test.tsx", "tests/vitest/ui/detail-template-editor.test.tsx", "tests/vitest/ui/bookingPageFixtureState.tsx", "tests/vitest/ui/bookingPageFixtureMocks.tsx", "tests/vitest/ui/bookingPageFixtureHarness.tsx", "tests/vitest/ui/booking-page-wave.test.tsx", "tests/vitest/ui/booking-page-errors.test.tsx", "tests/vitest/ui/booking-page-schedule-crud.test.tsx", "tests/vitest/ui/booking-page-tabs.test.tsx", "tests/vitest/ui/booking-tabs-interactions-wave.test.tsx", "tests/vitest/ui/booking-tabs-leaf.test.tsx", "tests/vitest/ui/booking-helpers.test.ts", "tests/vitest/ui/booking-helpers-wave.test.ts", "tests/vitest/ui/form-submissions-page.test.tsx", "tests/vitest/ui/media-library.test.tsx", "tests/vitest/ui/mediaLibraryTestUtils.tsx", "tests/vitest/ui/media-library-load-retry-wave.test.tsx", "tests/vitest/ui/media-library-mutation-retry-wave.test.tsx", "tests/vitest/ui/media-library-page-wave.test.tsx", "tests/vitest/ui/media-card.test.tsx", "tests/vitest/ui/media-components.test.tsx", "tests/vitest/ui/media-details.test.tsx", "tests/vitest/ui/media-details-panel.test.tsx", "tests/vitest/ui/media-filter-panel.test.tsx", "tests/vitest/ui/media-folder-rail.test.tsx", "tests/vitest/ui/media-picker.test.tsx", "tests/vitest/ui/media-toolbar.test.tsx", "tests/vitest/ui/forms-pages-wave.test.tsx", "tests/vitest/ui/formsPagesWaveFixtures.tsx", "tests/vitest/ui/form-builder-page-wave.test.tsx", "tests/vitest/ui/forms-component-wave.test.tsx", "tests/vitest/ui/use-forms-wave.test.tsx", "tests/vitest/ui-integration/forms-list-restyle.test.tsx", "tests/vitest/ui-integration/forms.test.tsx", "tests/vitest/ui-integration/forms-submissions-restyle.test.tsx", "tests/vitest/validation/task551ListSchemas.test.ts", "tests/perf/database-admin-list-budgets.test.ts", "tests/vitest/admin/adminUsersClient.test.ts", "tests/vitest/admin/entriesClientMutationReconciliation.test.ts", "tests/vitest/admin/entriesClientReadAuthority.test.ts", "tests/vitest/admin/entriesClient.test.ts", "tests/vitest/admin/postsClientCacheAuthority.test.ts", "tests/vitest/admin/postsClient.test.ts", "tests/vitest/mediaUi/mediaLibrary.test.tsx", "tests/vitest/pages/task-539-page-editor-controls.test.ts", "tests/vitest/ui/content-entries.test.tsx", "tests/vitest/ui/custom-screen-entry-navigation-authority.test.tsx", "tests/vitest/ui/custom-screen-records.test.tsx", "tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx", "tests/vitest/ui/drawer-sheet-a11y-gate.test.tsx", "tests/vitest/ui/entry-create-drawer-required-fields.test.tsx", "tests/vitest/ui/entry-field-relation-interaction.test.tsx", "tests/vitest/ui/entry-field-relation-option-identity.test.tsx", "tests/vitest/ui/entry-field-renderer-wave.test.tsx", "tests/vitest/ui/entry-list-filters.test.ts", "tests/vitest/ui/entry-list-wave.test.tsx", "tests/vitest/ui/entry-page-support-wave.test.tsx", "tests/vitest/ui/form-list-page-wave.test.tsx", "tests/vitest/ui-integration/admin-screens-restyle.test.tsx", "tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx", "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx", "tests/vitest/ui-integration/custom-screen-entries-restyle.test.tsx", "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx", "tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx", "tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx", "tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx", "tests/vitest/ui-integration/engine-detail-template-restyle.test.tsx", "tests/vitest/ui-integration/entry-list-restyle.test.tsx", "tests/vitest/ui-integration/media-restyle.test.tsx", "tests/vitest/ui-integration/media.test.tsx", "tests/vitest/ui-integration/post-editor-canvas-shared.test.tsx", "tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx", "tests/vitest/ui-integration/post-editor-toolbar-inspector-dedup.test.tsx", "tests/vitest/ui-integration/post-list-restyle.test.tsx", "tests/vitest/ui-integration/roles.test.tsx", "tests/vitest/ui-integration/users.test.tsx", "tests/vitest/ui/menu-design-editor-revalidation.test.tsx", "tests/vitest/ui/menu-design-editor.test.tsx", "tests/vitest/ui/menu-editor-refresh-policy.test.tsx", "tests/vitest/ui/menu-editor-shell-wave.test.tsx", "tests/vitest/ui/menu-editor.test.tsx", "tests/vitest/ui/menu-editor-validation.test.ts", "tests/vitest/ui/page-editor-facade.test.ts", "tests/vitest/ui/page-editor-failures-flow.test.tsx", "tests/vitest/ui/pageEditorFlowTestUtils.tsx", "tests/vitest/ui/page-editor-gallery-items-control.test.tsx", "tests/vitest/ui/page-editor-insertion-flow.test.tsx", "tests/vitest/ui/page-editor-media-url-control.test.tsx", "tests/vitest/ui/page-editor-shell-branches-wave.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-flow.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-flow.test.tsx", "tests/vitest/ui/page-leaf-components.test.tsx", "tests/vitest/ui/page-list-cache-behavior.test.tsx", "tests/vitest/ui/page-list-filters.test.ts", "tests/vitest/ui/pageListPageWaveFixtures.tsx", "tests/vitest/ui/page-list-residual-wave.test.tsx", "tests/vitest/ui/page-list.test.tsx", "tests/vitest/ui/page-list-wave.test.tsx", "tests/vitest/ui/pagePostListFixtures.tsx", "tests/vitest/ui/postBlockEditorShellFixtures.tsx", "tests/vitest/ui/post-editor-canvas-blocks-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-embeds-wave.test.tsx", "tests/vitest/ui/postEditorCanvasFixtures.tsx", "tests/vitest/ui/post-editor-canvas-media-wave.test.tsx"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "line-count-3",
      "lane": "tooling",
      "argv": ["wc", "-l", "tests/vitest/ui/post-editor-canvas-panels-wave.test.tsx", "tests/vitest/ui/post-editor-canvas-toolbar-profile-routing.test.tsx", "tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx", "tests/vitest/ui/post-list-wave.test.tsx", "tests/vitest/ui/posts-list.test.tsx", "tests/vitest/ui/support/customScreenEditorPageHarness.tsx", "tests/vitest/ui/support/customScreenEntryNavigationHarness.tsx", "tests/vitest/ui/theme-editor-page-leaf.test.tsx", "tests/vitest/ui/theme-editor-page-wave.test.tsx", "tests/vitest/ui/users-roles-page-wave.test.tsx", "tests/vitest/ui/users-roles.test.tsx", "tests/vitest/ui/use-screen-related-entries.test.tsx", "tests/vitest/admin/entriesClientRevisions.test.ts", "tests/vitest/admin/support/entriesClientTestHarness.ts", "tests/vitest/customScreens/relatedEntryResolver.test.ts", "tests/unit/pages/pageRevisionAutosave.test.ts", "tests/unit/runtime-smoke/task-551-admin-lists-adapter.test.ts", "tests/unit/runtime-smoke/cli-registry.test.ts", "tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts", "tests/perf/fixtures/task551AdminListDescriptors.ts", "tests/vitest/ui/page-editor-revision-history.test.tsx", "tests/vitest/ui/post-editor-media-controls.test.tsx", "tests/vitest/ui/users-roles-extraction.test.tsx", "tests/vitest/ui/menuDesignEditorTestHarness.tsx", "tests/vitest/ui/menu-design-editor-responsive.test.tsx", "tests/vitest/ui/menu-design-editor-nav-levels.test.tsx", "tests/vitest/ui/menu-design-editor-dropdown-bar.test.tsx", "tests/vitest/ui/usersRolesPageWaveFixtures.tsx", "tests/vitest/ui/users-roles-page-pagination-wave.test.tsx", "tests/vitest/ui/pageEditorV2RevisionHarness.tsx", "tests/vitest/ui/use-screen-related-entries-ids.test.tsx", "tests/vitest/ui/entry-field-renderer-relation-ids-wave.test.tsx", "tests/vitest/ui/page-editor-shell-revisions-wave.test.tsx", "tests/vitest/ui/page-editor-v2-authoring-revisions-flow.test.tsx", "tests/vitest/ui/entry-list-pagination-wave.test.tsx", "tests/vitest/ui/page-editor-v2-persistence-revisions-flow.test.tsx", "tests/vitest/ui/detail-template-editor-revisions.test.tsx", "tests/vitest/ui/media-library-mutation-pagination-wave.test.tsx", "tests/vitest/pages/task-539-page-editor-media-controls.test.ts", "tests/vitest/ui/formsPagesWaveListFixtures.tsx", "tests/vitest/admin/mediaClientListEnvelope.test.ts", "tests/vitest/admin/postsClientEnvelopeFixtures.ts", "tests/vitest/ui/forms-component-list-wave.test.tsx", "tests/vitest/ui/pageEditorFlowRevisionMocks.tsx", "tests/vitest/admin/entriesClientPagination.test.ts", "tests/vitest/ui/page-editor-insertion-media-flow.test.tsx", "tests/vitest/ui-integration/custom-screen-task-540-list-flow.test.tsx", "core/services/database/adminListScope.ts", "core/services/customScreens/customScreenEntryReadService.ts", "core/services/admin/rolesService.ts", "core/server/routes/adminRolesRoutes.ts", "tests/unit/admin/rolesService.test.ts", "tests/unit/pages/pageService.test.ts", "tests/integration/routes/forms.test.ts", "core/admin/ui/posts/editor/postEditorCanvasHelpers.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/worker-entry.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/worker-operations.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/production-handlers.ts", "scripts/runtime-smoke/adapters/task-551-admin-lists/cleanup.ts", "tests/unit/runtime-smoke/task-551-admin-lists-worker.test.ts", "tests/vitest/ui/site-settings.test.tsx", "tests/vitest/ui-integration/settings-general-site-restyle.test.tsx", "tests/vitest/ui/custom-screen-list-view.test.ts", "tests/vitest/ui/page-editor-settings-flow.test.tsx", "tests/vitest/ui/menu-item-form.test.tsx", "scripts/runtime-smoke/adapters/task-490/browser-actions.ts", "tests/vitest/pages/page-editor-host-contract.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "admin-list-playwright-smoke",
      "lane": "runtime-smoke",
      "argv": ["bun", "scripts/runtime-smoke.ts", "run", "--suite", "task-551-admin-lists", "--profile", "fast", "--session", "wf55103l02"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "final-forms-export-bun-tests",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/routes/forms.test.ts", "tests/integration/routes/task551BoundedAdminLists.test.ts", "tests/unit/runtime-smoke/task490-browser-actions.test.ts"],
      "environmentProfile": "task551-db-test",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/routes/forms.test.ts", "tests/integration/routes/task551BoundedAdminLists.test.ts", "tests/unit/runtime-smoke/task490-browser-actions.test.ts"],
        "minimum": 3
      }
    },
    {
      "id": "final-forms-export-vitest",
      "lane": "vitest",
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/formsClient.test.ts", "tests/vitest/ui/form-submissions-page.test.tsx", "tests/vitest/ui-integration/forms-submissions-restyle.test.tsx"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/admin/formsClient.test.ts", "tests/vitest/ui/form-submissions-page.test.tsx", "tests/vitest/ui-integration/forms-submissions-restyle.test.tsx"],
        "minimum": 3
      }
    },
    {
      "id": "final-line-count",
      "lane": "tooling",
      "argv": ["wc", "-l", "core/server/routes/formsRoutes.ts", "core/server/validation/formSchemas.ts", "core/admin/services/formsClient.ts", "core/admin/ui/forms/FormSubmissionsPage.tsx", "scripts/runtime-smoke/adapters/task-490/browser-actions.ts", "tests/integration/routes/forms.test.ts", "tests/integration/routes/task551BoundedAdminLists.test.ts", "tests/vitest/admin/formsClient.test.ts", "tests/vitest/ui/form-submissions-page.test.tsx", "tests/vitest/ui-integration/forms-submissions-restyle.test.tsx", "tests/unit/runtime-smoke/task490-browser-actions.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "final-forms-export-smoke",
      "lane": "runtime-smoke",
      "argv": ["bun", "scripts/runtime-smoke.ts", "run", "--suite", "task-490", "--profile", "fast", "--session", "wf55103l02final"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "initial",
      "dependsOn": ["TASK-551-09-L04:initial"],
      "commandIds": ["bounded-admin-list-bun-tests", "route-response-header-receipt", "pagination-cursor-lifecycle-receipt", "submission-export-job-receipt", "test551-db-unit", "admin-write-regression-receipt", "w0-revision-vitest", "w0-smoke-inventory", "admin-pagination-vitest-1", "admin-pagination-vitest-2", "owned-module-consumers-vitest-1", "owned-module-consumers-vitest-2", "owned-module-consumers-bun", "admin-prefetch-budget-receipt", "admin-prefetch-policy-receipt", "w2-client-vitest", "task554-regression-vitest", "task554-regression-bun", "runtime-smoke-registry-tests", "admin-list-performance-test", "database-explain-plans-receipt", "core-lint-types", "core-lint", "repo-lint-types", "diff-check", "diff-check-untracked", "line-count-1", "line-count-2", "line-count-3", "admin-list-playwright-smoke"]
    },
    {
      "id": "final",
      "dependsOn": ["TASK-551-08-L03:final"],
      "commandIds": ["final-forms-export-bun-tests", "final-forms-export-vitest", "route-response-header-receipt", "submission-export-job-receipt", "core-lint-types", "core-lint", "repo-lint-types", "diff-check", "diff-check-untracked", "final-line-count", "final-forms-export-smoke"]
    }
  ]
}
```

## Dated Contract Corrections — 2026-09-24 (mirror of TASK-551-09-L04 INITIAL FAZA-0; append-only)

These corrections mirror the TASK-551-09-L04 INITIAL FAZA-0 contract. Committed
bytes above are unchanged except for the in-place Testing Requirements edit
recorded under M1 and the in-place `tests/vitest/admin/adminPrefetch.test.ts`
additions recorded under M2 (Exact File Ownership prose and Tests list,
Validation Commands vitest line, envelope `allowlist`, and the
`admin-pagination-vitest` `argv` plus `positiveDiscovery.paths`). The envelope
`dependencies`, `occurrences` and `dependsOn` are unchanged.

**M1 — INITIAL-authority receipt is executable at land time (in-place edit,
Testing Requirements).** The previous wording required each owned client to be
"present in the L04 INITIAL authority manifest", but that manifest is L04
FINAL's `admin-cache-client-authority-matrix.test.ts`, which does not exist when
this leaf lands after `TASK-551-09-L04:initial`. The bullet was reworded in
place.

Before:

```text
- Each of the eight owned clients is present in the L04 INITIAL authority
  manifest. Delay a request across an installation transition and prove its
  completion may return only to the initiating caller but cannot install; the
  registered reset clears all old/new maps and promises. L04's exhaustive FINAL
  matrix must accept this leaf's receipt without reopening these clients.
```

After:

```text
- Each of the eight owned clients registers a reset with the L04 INITIAL
  authority (`registerAdminModuleCacheReset`) and guards every promise
  completion/cache install with a token captured before the await
  (`captureAdminCacheInstallationToken` /
  `isCurrentAdminCacheInstallationToken`); this leaf's suites prove it by
  calling `advanceAdminCacheInstallationAuthority()` and asserting all module
  maps/promises are cleared and a delayed pre-transition completion cannot
  install; L04 FINAL's matrix enrols these receipts later.
```

The delayed completion may still resolve to its initiating caller; it only must
not install into any module map. The Exact File Ownership paragraph on
INITIAL consumption obligations is consistent with this wording and is not
edited for M1 (its only edit is the M2 prefetch-test ownership addition).

**M2 — `core/admin/utils/adminPrefetch.ts` reset obligation.** This leaf is the
sole TASK-551 writer of `core/admin/utils/adminPrefetch.ts` (already present in
Exact File Ownership and in the envelope `allowlist` before this correction).
`createAdminPrefetcher` keeps per-instance closure state (`inFlight`, `queued`,
`queue`, `lastAttempt`, `lastSuccess`, plus the `activeCount`/`drainScheduled`
counters — verified at `adminPrefetch.ts:102-114` on HEAD `c9d1e808`); its
`drainQueue` completion chain records `lastSuccess.set(next.key, startedAt)` and
then runs `.finally(() => { inFlight.delete(next.key); ... })` (`:134-141`), and
the module-level default instance is
`prefetchAdminRoute = createAdminPrefetcher(defaultEntries)` (`:466`). The
implementer therefore also:

- adds an internal reset to `createAdminPrefetcher` (a module-private builder
  returns `{ prefetch, reset }`; the exported
  `createAdminPrefetcher(entries, options)` keeps returning the unchanged
  callable `(href, basePath?, request?) => void` — verify the signature at
  `core/admin/utils/adminPrefetch.ts` ~`:102`/`:156` — and only the default
  instance at `:466` registers `reset`) that clears `inFlight`,
  `queued`, `queue`, `lastAttempt` and `lastSuccess`. `activeCount` and
  `drainScheduled` keep tracking genuinely running work: a stale completion
  still decrements `activeCount` and re-drains, but installs nothing;
- registers that reset with `registerAdminModuleCacheReset` ONLY for the
  module-level default instance at `:466`; non-default prefetchers created
  through `createAdminPrefetcher` (tests) keep their current contract and do not
  register;
- guards every completion side effect with a token captured before the await
  (`captureAdminCacheInstallationToken` at dispatch; install only while
  `isCurrentAdminCacheInstallationToken(token)`), or an equivalent identity
  check against the stored promise: a pre-transition completion must not record
  `lastSuccess`, and its `.finally` must not `inFlight.delete(next.key)` unless
  the entry still belongs to that token/promise, so a stale completion cannot
  delete a new-epoch `inFlight` entry for the same key;
- proves in `tests/vitest/admin/adminPrefetch.test.ts` that
  `advanceAdminCacheInstallationAuthority()` clears that state, so a route
  prefetched before the transition is fetched again immediately afterwards (no
  stale cooldown/freshness suppression), and that a delayed pre-transition
  completion neither records `lastSuccess` nor removes the new-epoch in-flight
  entry. After `vi.resetModules()` in `tests/vitest/admin/adminPrefetch.test.ts`
  (~`:328-342`), obtain `advanceAdminCacheInstallationAuthority` by dynamic
  import in the same module graph as the re-imported `adminPrefetch` (a static
  top-level import would advance a different default instance).

Ownership split (read as in 09-L04 I6, `adminPrefetch.ts:129-131`): L04 supplies
the seam, this leaf registers the default-prefetcher reset, and L04 FINAL only
verifies the receipt read-only.

Correction (round-1 audit): the earlier wording said the reset was proved "in
its prefetch tests" and that no allowlist or ownership edit was needed, but no
prefetch test was in this leaf's scope. Before: `tests/vitest/admin/adminPrefetch.test.ts`
was absent from Exact File Ownership, the envelope `allowlist`, the Validation
Commands vitest line, and the `admin-pagination-vitest` `argv` and
`positiveDiscovery.paths`. After: it is added in place to all of them,
immediately after `tests/vitest/admin/detailPagesClient.test.ts`, and this leaf
becomes its sole TASK-551 writer for the reset-adoption assertions.

Regression inputs run but not edited by this leaf:
`tests/vitest/admin/admin-prefetch-policy.test.ts` (Vitest lane) and
`tests/perf/admin-prefetch-budget.test.ts` (Bun lane). They are not in this
leaf's `allowlist` or command envelope; the orchestrator runs them as group
gates after this leaf lands.

**M3 — INITIAL API surface.** L04 INITIAL `core/admin/utils/adminCacheAuthority.ts`
now has six exports (one type plus five runtime functions), including the test-seam factory
`createAdminCacheInstallationAuthority`. This leaf's production consumers use
only the four named functions — `registerAdminModuleCacheReset`,
`captureAdminCacheInstallationToken`, `isCurrentAdminCacheInstallationToken`
and `advanceAdminCacheInstallationAuthority` (the last one only from tests).
They must not construct their own authority through the factory. The file
remains read-only/forbidden for this leaf.

## Dated Contract Corrections — 2026-09-24 (FAZA-0 dispositions; append-only)

Six fresh-context read-only auditors (S1-A/S1-B services, routes, races and
splits; S2-A/S2-B Admin clients and UI; S3-A/S3-B tests, envelope and
cross-leaf reconcile) audited this contract at HEAD `ae6bea8a` and raised 60
deduplicated findings (16 HIGH, 26 MEDIUM, 12 LOW, 6 INFO), recorded with their
owner and orchestrator dispositions in
`_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-faza0-dispositions.md`.
This section applies every disposition assigned to this file (work unit WU-C).
Where it differs from the body above, **this section wins**. Body line numbers
cited as `contract :NNN` are the pre-correction numbers at HEAD `ae6bea8a`;
source anchors were re-read at that HEAD before citation. The in-place edits
are the envelope, Exact File Ownership, the split table, forbidden-path prose
and Validation Commands; each is recorded before/after in "Round-1 record".

Owner decisions (binding, quoted):

- **D1 — Export.** "Keep the legacy synchronous export route `GET
  /forms/:id/submissions/export` and its tests untouched. 03-L02 adds only the
  export-job create/status routes and the matching client methods. The binary
  download lane and the legacy-route removal move to TASK-551-08-L03 FINAL (the
  httpServer owner). This also removes the forms.test.ts dual-writer conflict."
- **D2 — TASK-554 handoff.** "Record a dated correction in TASK-554 and in
  03-L02 that allows mechanical wire-shape (array→envelope) adaptation of the
  mocks in `tests/vitest/admin/postsClient.test.ts` and
  `tests/vitest/admin/postsClientCacheAuthority.test.ts`. Every ordering, race
  and cache assertion is preserved 1:1. Both files join the 03-L02 allowlist
  and the vitest argv."
- **D3 — Custom screens.** "Add a bounded server-side projection of the list
  view's configured columns plus a field filter/sort allowlist, with its own
  L01/L02 statement IDs and matrix row. No UX regression."
- **D4 — Environment and receipts.** "`PAGINATION_CURSOR_SECRET` is now present
  in `.env` (done). Before 03-L02 implementation, the orchestrator runs the L02
  freeze on the dedicated `DATABASE_URL3` and promotes the small profile to
  `reviewed` (WU-B). DB lanes, perf and smoke run on
  `DATABASE_URL3`/`DATABASE_URL`; the owner confirms both are free and unused.
  DB legs are therefore EXECUTED, not owner-deferred, but still gated by the
  owner-map idiom and unique-scoped fixtures with own-row cleanup." (The
  small-profile promotion is superseded by the O2-revised addendum; see C2.)

### C1 — Provenance and orchestrator decisions

Closes: none directly (index for F-01..F-54, I-01..I-06).

- Audit: FAZA-0 pre-implementation, 2026-09-24, HEAD `ae6bea8a`, six auditors
  (raw 31 H / 46 M / 29 L / 6 INFO; deduplicated 60). The round was not clean;
  implementation may start only after WU-A..WU-D land and a fresh WU-E
  re-audit returns 0 HIGH/MEDIUM from every auditor.
- Orchestrator decisions applied here (from the dispositions file §2 and its
  addendum; short form, the file is authoritative):
  - **O1/O1-refined (KeysetSpec, 03-L01 K1).** The final `id` may be DESC with
    `NULLS FIRST` or ASC with `NULLS LAST`; 03-L02 builds timestamp lists as
    `(<ts> DESC NULLS FIRST nullable:false, id DESC NULLS FIRST)`.
  - **O2-revised (evidence).** The L02 handoff gate uses the large `reviewed`
    profile only; `small` stays `candidate`; SQL-bytes identity becomes
    descriptor equality owned by this leaf's tests; L05 plan receipts are
    regenerated on `DATABASE_URL3` under the fixture runner.
  - **O3/O4/O5 (races)** session transaction plus per-user advisory lock; role
    last-admin check under the writer fence plus row lock; booking 23P01 on the
    imported constraint name mapped to `booking_slot_unavailable`.
  - **O6** bounded `ids[]` resolution; **O7** allowlisted splits with line
    budgets; **O8** test graph plus revision adoption as wave W0; **O9**
    validation law; **O10** registered smoke adapter; **O11** fail-closed
    header seam; **O12** `mapBoundedReadError`; **O13** preservation clauses;
    **O14** facets are bounded non-cursor reads with `truncated`.
  - **F-24 (email).** `PageRevisionSummary.createdBy.email` uses
    `resolveEmailValue` (`core/services/security/piiEmail.ts:118`), never raw
    `users.email` (`core/services/pages/revisionService.ts:368`); see C10 for the
    ownership constraint.
  - **F-31.** The `deprecated-unused` inventory assertion leaves this leaf and
    is handed to TASK-551-01-L01 final (C16).
  - **I-05.** Adopted: every cached page value stores the canonical filter JSON
    and the client verifies it on read (C9).

### C2 — Upstream dependencies and dispatch preconditions

Closes: F-01 (03-L02 side), F-04, F-28 (03-L02 side).

- **WU-A first (F-01).** Dispatch requires the landed TASK-551-03-L01 K1-K8
  correction (dirty amendment in `TASK-551-03-L01-...md` §K1-K8): K1 flexible
  tie-breaker, K2 option (i) for facets, K6 index-seekable predicate, K7
  previous-direction boundary, K8 microsecond boundaries. K1 has landed at
  HEAD `9c5b6666`: `normalizeKeysetSpec` accepts a final `id` that is DESC
  `NULLS FIRST` or ASC `NULLS LAST`
  (`core/services/database/keysetCursor.ts:193-199`), and K8's six-digit
  timestamp wire is accepted (`keysetCursor.ts:105`) (re-anchored 2026-09-25).
- **WU-B evidence (F-04, O2-revised).** The small freeze receipt is
  `reviewState:"candidate"` (`tests/perf/task551DatabaseBaseline/freezeReceipts.ts:10`)
  and stays so; the large receipt is `reviewed` (`:464`) and its pin in
  `tests/perf/database-explain-plans.test.ts:1936-1943` stays green unchanged.
  Durable small promotion is impossible without an evidence-system amendment
  (`scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts`, git-ignored
  active state). Pre-dispatch check: the large profile reads `reviewed` and
  the small reads `candidate` with the recorded reason; any other state blocks
  dispatch. The body's "each must be `reviewed`" (contract :663-667) and the
  small-profile clauses of contract :939-944 are superseded.
- **Descriptor gate.** The rendered-SQL byte/digest comparison (contract
  :658-662, :859-863, :938-947) is replaced by descriptor equality: for every
  Admin statement, `{futureFile, futureSymbol, projectionKeys,
  predicateSlots, order, limit, transactionMode}` produced by the builder equals
  the row in this leaf's new descriptor module
  `tests/perf/fixtures/task551AdminListDescriptors.ts`, which is derived from
  matrix v2 (C3). The landed `tests/perf/fixtures/task551AdminReadStatementShapes.ts`
  is TASK-551-01-L02-owned (cross-owner check,
  `_docs/_workflows/lib/task-551-dispatch-contract.mjs:956-959`) and read-only
  here; its seven contradictions (F-03: pages author join, filter slots,
  booking `name ASC,id ASC`, facet order, per-family summaries, repeatable
  read, media `futureFile`) and its facet keyset predicates (`:208`, `:305`,
  `:556`) are superseded by the descriptor module, not edited.
- **Secret precondition (F-28).** Smoke and DB lanes require
  `PAGINATION_CURSOR_SECRET` present with at least 32 decoded bytes
  (`MIN_SECRET_BYTES`, `keysetCursor.ts:24`; read at `:317`) in the runner
  environment; `.env.example` has no entry (grep count 0), handed to 10-L02
  (C17).

### C3 — Family matrix v2

Closes: F-03 (03-L02 side), F-14, F-15 (matrix side), F-38 (query), F-44,
F-46, F-48; applies O6, O14, D3.

Every paginated family uses one code-owned `KeysetSpec` whose `scope` is the
C4 scope string; timestamp families order `(<ts> DESC NULLS FIRST
nullable:false, id DESC NULLS FIRST)`; every keyset timestamp is also selected
as `to_char(<col>, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` and only that text is
encoded (03-L01 K8). All reads run in one `repeatable read`, read-only
transaction. Rows not listed keep the body matrix (contract :387-398).

| Family | `q` columns (case-insensitive contains, escaped, max 200 chars) | Order / KeysetSpec | Fixed summary (collection- or parent-global) | Facets (O14) | `ids[]` statement |
|---|---|---|---|---|---|
| pages | `title`, `slug` | `updated_at DESC, id DESC` | `total`, `published`, `draft`, `scheduled`, `archived` | `authors` | `admin-pages-by-ids` |
| entries global | `title`, `slug` | `updated_at DESC, id DESC` | `total` + four statuses | `authors`, `contentTypes` | `admin-entries-by-ids` |
| entries typed | `title`, `slug`; parent `type_id = :typeId` | `updated_at DESC, id DESC` | same, parent-global | `authors` | `admin-entries-by-ids` |
| custom-screen list (D3) | as entries typed | configured sort (below) | typed-entry summary | `filterOptions` | `admin-entries-by-ids` with `fields[]` |
| posts | `title`, `slug` (tag substring no longer matches; exact `tag` filter replaces it) | `updated_at DESC, id DESC` | `total`, `published`, `draft`, `scheduled` | `authors` | none |
| users | `name`; exact email via `email_hash` when `q` is an email | `created_at DESC, id DESC` | body `UserListSummary` | `roles` | none |
| forms | `name`, `slug`, `description` | `updated_at DESC, id DESC` | `total`, `active`, `drafts` | none | `admin-forms-by-ids` |
| form submissions | none; parent `form_id = :id` | `created_at DESC, id DESC` | `total`, `rollingSevenDays`, `spam`, parent-global | none | none |
| media | `key`, `original_name`, `title` (display sources; `key` never returned) | `created_at DESC, id DESC` | `totalAssets`, `totalBytes`, `type.image`, `type.file` | `folders`, `tags` | `admin-media-by-ids` |
| booking reservations | none | `starts_at DESC, id DESC` | `total`, `today`, `upcoming`, `resourceCount` | none | none |
| booking resources | `name`, `slug` | `name_key ASC, id ASC NULLS LAST` | `total` | none | `admin-booking-resources-by-ids` |
| booking services | `name`, `slug` | `name_key ASC, id ASC NULLS LAST` | `total` | none | `admin-booking-services-by-ids` |

- **Filter slots** are exactly the body matrix filters; media `types[]` binds
  `type = ANY(...)` and no `mime_type` slot exists (the landed shape's
  `mime_type` slot is superseded).
- **Facets (O14, supersedes body :589-642 and 03-L01 K2).** Facets are bounded
  non-cursor reads: `FacetList<T> = { items, truncated: boolean, contract }`
  with cap 50 per facet (`LIMIT 51`, `truncated = rows > 50`), no
  `facetCursor`, `nextCursor` or `hasMore`, no `KeysetSpec`. Order is
  `label ASC, id ASC` for authors, `name ASC, id ASC` for content types, roles
  and folders, and `value ASC` for media tags. The strict follow-up accepts only
  `facetKind` and `facetQ` (max 100 chars) and returns one `FacetList`. The UI
  renders "showing 50; refine to find more" when `truncated`; it never
  auto-fetches.
- **Name keys (F-46).** Booking resource/service order uses
  `name_key = left(normalize(name, NFC), 128)` (at most 512 UTF-8 bytes, NFC),
  projected and ordered by the same expression, so every row encodes; ties
  beyond 128 characters are broken by `id`. Test: a 640-byte non-NFC legacy
  name pages without error.
- **Parent-capped collections (F-44).** The 101-row `LIMIT` and
  `booking_collection_limit_exceeded` apply only to the new admin builders in
  `bookingReadService.ts`; the facade `listBookingServiceResources` consumed by
  `core/server/publicBookingApi.ts:16` keeps its current public behavior.
- **`ids[]` resolution (O6).** Query `ids` (repeatable, 1..100 unique UUIDs);
  mutually exclusive with `cursor`, `q`, filters and facet fields
  (`validation_error` otherwise); one statement `WHERE id = ANY($1::uuid[])
  AND <authorization and parent predicate> LIMIT 100`; response
  `{items}` in request order, unknown or unauthorized ids silently omitted (no
  existence signal), no cursor, summary or facets; query count 1; budgets in
  `tests/perf/database-admin-list-budgets.test.ts`. Consumers that MUST use it
  (each with an off-page-selection test, C12): `MenuItemForm.tsx:97-99` and
  `MenuEditorPage.tsx:419` (page label/path), `PageEditorRegistryFields.tsx:334-336`
  (selected form label, moved to `PageEditorRegistryPickers.tsx`),
  `DetailTemplateInspector.tsx:90` (forms option label),
  `useScreenRelatedEntries.ts:280-292` plus `relatedEntryResolver.ts:69-114`
  (related entries), `useScreenEntryPresentationMedia.ts:151-166` and
  `PostEditorCanvas.tsx:1308-1357` (selected media), and
  `BookingPage.tsx:175-184` (reservation resource/service labels).
- **Custom-screen projection (D3).** The typed route accepts `fields[]` (at
  most 12 configured column/filter/sort field keys, each a scalar-kind schema
  field of the resolved type; others `validation_error`), `fieldFilter.<key>`
  equality (at most 5, value max 200 chars, key in the view's enabled filters),
  `sortField` in `{configured sortable fields} ∪ {updatedAt, createdAt, title}`
  and `sortDir` `asc|desc`. Rows return `data` restricted to exactly the
  requested keys (each value a JSON scalar or at most 20 scalars, max 2 KiB), so
  `customScreenListModel.ts:249` keeps reading `entry.data?.[field]`. A field
  sort uses a derived-table alias `sort_value = left(normalize(data->>key,
  NFC), 256)` with KeysetSpec `(sort_value <dir> nulls asc→last/desc→first
  nullable:true, id <dir>)`; it is a declared, budgeted scan of the typed
  parent (no expression index). Statement IDs
  `admin-custom-screen-entries-page` and
  `admin-custom-screen-entries-filter-options` (one `UNION ALL` of distinct
  values per enabled filter, cap 50 each, `truncated`). Filter options come
  only from that statement; stat cards read `summary.total/published/draft`
  (replacing `CustomScreenEntriesPage.tsx:217-226`). Search stays title/slug,
  exactly as `customScreenListModel.ts:368-398` today.
- **Booking week (O13, F-38).** Statement `admin-booking-reservations-week`:
  `from/to` of the displayed week (max 7 days), optional `resourceId`, order
  `starts_at ASC, id ASC`, cap 500 rows plus `truncated` shown as visible
  overflow. The weekly calendar and resource legend read only this query, never
  the paged reservation table (`BookingPage.tsx:201-206`).
- **New statement IDs** (additive, owned by this leaf's descriptor module and
  budgets; they are not members of TASK-551-05-L02's closed 37-ID registry,
  which stays 37 plan IDs / 38 cases / 76 receipts): the six `*-by-ids`, the
  two custom-screen statements and the booking week statement, 41 Admin
  descriptors in total.

### C4 — Server pseudocode against the landed signatures

Closes: F-20, F-21, F-22, F-23 (code side), F-32; applies O11, O12.

Supersedes the body pseudocode (contract :722-854) where they differ. Real
signatures: `encodeKeysetCursor(input, spec, keys)` (`keysetCursor.ts:427`),
`decodeKeysetCursor(input, spec, keys, options)` (`:683`),
`toBoundedPage({rows, limit, direction, encodeBoundary})`
(`boundedReadContract.ts:257-306`; input type `:257-262`, function `:276`)
(re-anchored 2026-09-25), `requirePaginationCursorKeyring()`
(`core/server/paginationCursorLifecycle.ts:44-47`), drizzle
`db.transaction(cb, config)`.

```ts
// core/server/routes/pageRoutes.ts — the keyring is read ONLY in routes.
router.get("/pages", requirePermission("content:read"), async (ctx) => {
  validate(pageListQuerySchema, ctx.query); // strict, reject-unknown
  try {
    return await listAdminPages(ctx.query, { actor: ctx.user,
      keys: requirePaginationCursorKeyring() });
  } catch (error) { throw mapBoundedReadError(error) ?? error; }
});

// core/services/pages/pageReadService.ts
const pageListSpec = (scope: string): KeysetSpec => ({ scope, fields: [
  { name: "updatedAt", type: "timestamp", column: "updated_at",
    order: "desc", nulls: "first", nullable: false },
  { name: "id", type: "uuid", column: "id", order: "desc", nulls: "first",
    nullable: false } ] });
export async function listAdminPages(input: PageListQuery, deps: { actor: Actor;
  keys: PaginationCursorKeyring; db?: Db; clock?: Clock }) {
  const filters = normalizePageListFilters(input); // authz already enforced by route
  const scope = `admin:pages:v1:${sha256(canonicalJson(filters))}`;
  const spec = pageListSpec(scope);
  const limit = parsePageLimit(input.limit);
  const cursor = input.cursor ? decodeKeysetCursor(input.cursor, spec, deps.keys) : null;
  return (deps.db ?? db).transaction(async (tx) => {
    const rows = await selectPageListRows(tx, { filters, spec, cursor, limit }); // LIMIT limit+1
    const fixed = await selectPageListFixedSummary(tx);   // COUNT(*) FILTER; 1 row
    const authors = await selectPageAuthorFacet(tx, { facetQ: input.facetQ }); // LIMIT 51
    return { ...toBoundedPage({ rows, limit, direction: "next",
        encodeBoundary: (row) => encodeKeysetCursor(
          { scope, direction: "next", values: [row.updatedAtWire, row.id] },
          spec, deps.keys) }),
      summary: toPageSummary(fixed, deps.clock), facets: { authors: toFacetList(authors) } };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
```

- Statements inside one transaction run sequentially on `tx` (no
  `Promise.all` on one connection); the ceiling stays 3 statements.
- `listAdminForms` has the identical shape: route `requirePermission("forms:read")`
  plus strict schema, service normalizes `q,status,submissionAccess`, derives
  `admin:forms:v1:<digest>`, decodes with its own spec, and encodes through
  `toBoundedPage`; the undefined `encodeFormCursor` (contract :793) is removed.
- Services never call `requirePermission(actor)`; permission is route
  middleware, and row-level authorization predicates stay inside SQL.
- **Bounded-read mapper (O12).** New `core/server/routes/boundedReadErrors.ts`
  exports `mapBoundedReadError(error): ApiError | null`: every
  `PaginationCursorError` code starting `cursor_` (`keysetCursor.ts:29-40`) →
  same-code 400; `page_limit_invalid` → 400; plain `Error`
  `pagination_cursor_keyring_unavailable` (`paginationCursorLifecycle.ts:45`) →
  503; `pagination_cursor_config_invalid` and `bounded_read_window_overflow`
  are not mapped (500). The cursor is never echoed. Every bounded route
  composes it before its family `map*Error`. Tests in
  `tests/integration/routes/task551BoundedAdminLists.test.ts` pin each row.
- **Header seam (O11).** `installSubmissionDetailNoStoreHeaders` fails closed:
  `if (typeof ctx.setResponseHeader !== "function") throw new Error("route_response_header_unavailable")`
  (mapped to a generic 500), never `ctx.setResponseHeader?.(...)`; the setter
  is optional in `core/server/router.ts:17-20`. The header guarantee covers only
  outcomes that reach the route handler chain; the transport rate-limit 429 and
  CSRF rejection (`core/server/httpServer.ts:518-541`) are excluded. Tests
  enumerate 200 plus mapped 400/401/403/404 and an absent-setter unit case.
- **Route order.** `GET /forms/:formId/submissions/:submissionId` is registered
  after `GET /forms/:id/submissions/export` (first-match dispatch,
  `httpServer.ts:460-463`), so the kept legacy export path is never captured by
  the detail route; a registration-order test pins it.
- **Revision routes (F-32).** Page/detail revision list routes pass `cursor` and
  `limit` straight to the landed 06-L02 services; those cursors are 06-L02's own
  opaque tokens (`core/services/pages/revisionService.ts:280-285`,
  `core/services/content/detailPageRevisionService.ts:112-146`), not L01 HMAC
  cursors. `page_revision_cursor_invalid` and every
  `detail_page_revision_cursor_*` code map explicitly to 400 in
  `pageRoutes.ts`/`detailPageRoutes.ts`.

### C5 — Write races

Closes: F-13, F-18, F-19; applies O3, O4, O5. Supersedes contract :767-771,
:845-853, :959-962 and the race clause of :1122-1123.

- **Session (O3).** `createSession` (`core/services/auth/sessionService.ts:144-169`)
  runs `enforceSessionLimits` (`:112-142`) and the insert in one
  `db.transaction` that first takes
  `pg_advisory_xact_lock(hashtext('coderso:session-user:v1'), hashtext(:userId))`;
  the active-session read, the revoke (including the `singleSession`
  `revokeAllSessions` path) and the insert use `tx`. No `rotateSession`, no
  new error code, no route change (`authRoutes.ts`, `sessionAdminRoutes.ts`,
  middleware stay untouched). Proof: 50 concurrent logins with
  `maxPerUser = 2` leave exactly 2 active sessions, and with `singleSession`
  exactly 1, in `tests/integration/server/task551AdminWriteConcurrency.test.ts`.
- **Roles (O4).** `setUserRoles` (`core/services/admin/usersService.ts:242-279`)
  and `disableUser` (`:281-291`) move the last-admin check inside their
  transaction after `acquireNativeCmsWriterFence(tx)`
  (`core/db/nativeCmsWriterFence.ts:232`) and a `FOR UPDATE` lock on the target
  user row, mirroring `deleteUser` (`:302-332`). Loser code stays `last_admin`
  (existing route mapping, `adminUsersRoutes.ts`); `role_assignment_conflict` is
  dropped. Proof: two admins demoting each other concurrently leave at least
  one admin; 50-way disable race leaves one admin.
- **Booking (O5).** `createBookingReservation` (`bookingService.ts:971`),
  `createBookingBlackout` (`:841`) and a status change that reactivates a
  reservation to `pending|confirmed` (`updateBookingReservationStatus`,
  `:1027`) take `pg_advisory_xact_lock(hashtext('coderso:booking-resource-window:v1'), hashtext(:resourceId))`
  before their conflict read and write in one transaction. SQLSTATE `23P01`
  whose constraint equals `BOOKING_RESERVATION_EXCLUSION_SQL.name`
  (`core/db/bookingReservationExclusion.ts:27-30`, imported read-only) maps to
  the existing `booking_slot_unavailable` (409 in `bookingRoutes.ts:85-86`,
  and the public API path at `publicBookingApi.ts:236` keeps it). No
  `booking_conflict`. Proof: 50 overlapping creates yield one row and 49
  `booking_slot_unavailable`; blackout-vs-reservation and reactivation races
  yield no overlapping active window.

### C6 — Export jobs (D1)

Closes: F-11 (export side), F-12. Supersedes contract :459-463, :479-493 (the
download route and "deletes that route"), :1005-1012 and :1145-1148.

- The legacy `GET /forms/:id/submissions/export` route
  (`core/server/routes/formsRoutes.ts:708-717`), `buildFormSubmissionsExport`
  and `formsClient.exportFormSubmissions` stay unchanged; `forms.test.ts` stays
  execution-only.
- This leaf adds only `POST /forms/:id/submissions/export-job` and
  `GET /forms/:id/submissions/export-job/:jobId` (contract :466-478 stand), with
  strict schemas in `formSchemas.ts` and client methods
  `createFormSubmissionsExportJob` and `getFormSubmissionsExportJob`.
  `getSubmissionExportJob` returns `null` for a missing job
  (`submissionExportJob.ts:442-452`); null or `job.formId !== :id` throws
  `submission_export_job_not_found`.
- `mapFormError` (`formsRoutes.ts:335`) gains: `submission_export_job_not_found`
  → 404; `submission_export_create_failed` → 500 (stable code, no detail).
  `form_not_found` keeps its row. `tests/integration/routes/task551BoundedAdminLists.test.ts`
  covers both routes and both rows.
- `FormSubmissionsPage.tsx` may show job creation and status; the download
  step and token handling stay on the legacy export until 08-L03 FINAL (C17).

### C7 — Booking split map

Closes: F-17; applies O13 (facade). Supersedes contract :864-866.

| Module (budget) | Owns (current `bookingService.ts` anchors) |
|---|---|
| `bookingReadService.ts` (≤ 950) | exported types `:19-104`; status sets `:105-115`; normalizers and zoned-time helpers `:117-314`; `ensureResourceExists`/`ensureServiceExists` `:316-330`; legacy reads `listBookingResources`, `getBookingResource`, `listBookingServices`, `getBookingService`, `listBookingServiceResources`, `listBookingSchedules`, `listBookingBlackouts`, `listBookings`; every new bounded admin builder (C3) |
| `bookingScheduleService.ts` (≤ 600) | `validateScheduleTimezone` `:734`, `setBookingSchedules` `:747`, `previewBookingSlots` `:1043` and its private helpers |
| `bookingMutationService.ts` (≤ 800) | resource/service create/update/delete `:341-667`, `setBookingServiceResources` `:676`, blackout create/delete `:841-874`, `ensureBookingWindowAvailable` `:913`, `ensureServiceResourceBinding` `:959`, `createBookingReservation` `:971`, `updateBookingReservationStatus` `:1027`, the C5 lock helper |
| `bookingService.ts` (≤ 150) | facade only: explicit named re-exports of every current export (all types and the 21 functions above), no logic |

Imports flow one way: mutation → schedule → read, and mutation → read; read
imports neither. Callers outside the allowlist keep importing the facade
(`core/server/publicBookingApi.ts:12-20`, `core/services/booking/bookingRuntimeResolver.ts`).
`tests/unit/booking/bookingService.test.ts` and
`tests/unit/server/publicBookingApi.test.ts` rerun unchanged
(`admin-write-regression-receipt`).

### C8 — Preservation clauses (O13)

Closes: F-16 (inventory), F-25, F-27, F-44 (see C3), F-49 (semantics).

- `core/services/content/entryReadService.ts` already exists (TASK-517 exports
  `listEntries` `:90`, `listEntriesForListing` `:104`,
  `listEntriesWithContentTypes` `:130`, `getEntry` `:155`, `getEntryBySlug`
  `:179`, exported types `:202-265` (`EntryVisibilityProbe` `:202`, revision
  types `:239-264`, `entryRevisionUuidPattern` `:265`), visibility probes
  `getEntryVisibilityById` `:212` and `getEntryVisibilityBySlug` `:227`,
  revision reads `listEntryRevisions` `:315` and `getEntryRevisionData` `:350`,
  `getEntryAccessPasswordHash` `:373`) (re-anchored 2026-09-25);
  every export stays byte-compatible and the bounded builders are additive
  (`listAdminEntriesPage`, `listAdminTypedEntriesPage`, `listAdminEntriesByIds`).
- `usersService.listUsers` (`usersService.ts:92`) keeps its signature; the
  booking facade keeps `listBookingServices`, `listBookingResources`,
  `createBookingReservation` and `previewBookingSlots` signatures.
- `formsService.listForms` keeps its assistant callers
  (`core/services/assistant/actionExecutorService.ts:66,151` DI wiring,
  `core/services/assistant/actionExecutorTypes.ts:66,153` dependency type, the
  DI uses `actionExecutorForms.ts:27,67,460,498` and
  `actionExecutorPages.ts:91,412`, and
  `core/services/assistant/adminContextCatalogs.ts:240`) (re-anchored
  2026-09-25); only Admin route/client callers reach zero.
- Slot preview takes one `date` (`core/server/validation/bookingSchemas.ts:120-126`);
  with non-overlapping windows and a 5-minute minimum one day yields at most 288
  slots. The "31 days / 500 slots / accepts 500, rejects 501" text (contract
  :715-718, :915-916) is replaced by: the admin preview accepts one date and
  the test pins a maximal one-day schedule returning ≤ 288 ordered slots.
- `clear*` exports keep names and signatures and also invoke the client's L04
  reset; reset clears maps and promises and advances (never zeroes) monotonic
  generation/epoch counters.

### C9 — Admin client pseudocode template

Closes: F-33, F-34, F-36, F-39, F-40, F-49, F-54, I-02 (wording), I-03, I-04,
I-05.

`core/admin/services/adminListEnvelope.ts` (new, shared) owns
`AdminListEnvelope<I,S,F>`, `buildAdminListCacheKey`, and
`readVerifiedAdminListPage`. Key template (families from
`core/admin/services/cachePolicy.ts`, read-only):
`${cacheKeys.<family>List}:page:${createBoundedCacheKeySegment(canonicalJson(filters))}:${cursor ?? "first"}`,
siblings `:summary:<segment>` and `:facet:<kind>:<segment>`. Because
`createBoundedCacheKeySegment` is a 32-bit FNV-1a over a 96-character prefix
(`cachePolicy.ts:2-21`), every cached value stores `canonicalFilters` and a
read whose stored JSON differs is a miss (I-05).

```ts
// core/admin/services/pagesClient.ts (representative; cites 09-L04 :396-415)
let pagesGeneration = 1; // monotonic; reset advances, never zeroes
const pageCache = new Map<string, CachedAdminListPage<PageListItem>>();
const pagePromises = new Map<string, Promise<PageListEnvelope>>();
registerAdminModuleCacheReset(() => { pageCache.clear(); pagePromises.clear(); pagesGeneration += 1; });
export function listPagesPageCached(filters: PageListFilters, cursor: string | null,
  options: { force?: boolean } = {}): Promise<PageListEnvelope> {
  const key = buildAdminListCacheKey(cacheKeys.pagesList, "page", filters, cursor);
  const hit = readVerifiedAdminListPage(pageCache, key, filters);
  if (hit && !options.force) return Promise.resolve(hit);
  const token = captureAdminCacheInstallationToken(); // before any await
  const generation = pagesGeneration;
  const request = listPagesPage(filters, cursor).then((envelope) => {
    if (isCurrentAdminCacheInstallationToken(token) && generation === pagesGeneration)
      pageCache.set(key, { canonicalFilters: canonicalJson(filters), envelope });
    return envelope; // may still resolve to the initiating caller
  }).finally(() => { if (pagePromises.get(key) === request) pagePromises.delete(key); });
  pagePromises.set(key, request);
  return request;
}
export const clearPagesCache = () => { /* unchanged name */ pageCache.clear();
  pagePromises.clear(); pagesGeneration += 1; };
```

- `core/admin/ui/shared/useBoundedAdminList.ts` (new): `useReducer` state
  `{items, cursorStack, nextCursor, hasMore, status, summary, facets}`;
  actions `loaded`, `loadMore`, `previous`, `reset`. Filter changes dispatch
  `reset` in the change handler; no synchronous `setState` in effect bodies;
  cache hydration is a lazy initializer; background revalidation dispatches
  from the promise callback only while the filter identity is current;
  dirty-state rows are never overwritten (F-54).
  `core/admin/ui/shared/BoundedListFooter.tsx` renders "N shown, more
  available", Previous/Load more with `aria-disabled` and `aria-live`.
  `ListPaginationFooter.tsx`/`useListPagination.ts` stay read-only.
- Reset checklist (I-03; each registered with L04): pagesClient `:112`,
  `:116-120`, `:148-153`; detailPagesClient `:95-96`, `:131-136`; entriesClient
  `:147-158` plus a new all-slugs clear; postsClient `:100-114`, `:135-139`,
  `:292-306`; adminUsersClient (none today; `UsersRolesPage.tsx:174` fetches
  directly); formsClient `:182-184`; mediaClient `:98`, `:102-106`;
  bookingClient `:186-193`. Browser storage envelopes are not cleared here;
  they stay with L04 FINAL.
- **List is never detail (F-33).** Remove the posts fallback
  (`postsClient.ts:439-443`, `toPostDetail(match)`) and the entries fallback
  (`entriesClient.ts:639-643`); `PostListItem` has exactly the C3 projected
  keys and `toPostSummary` (`:146-160`) becomes a narrowing detail→list mapper
  without `data`/`seo`. Test: a list-only cache plus `getPostCached(id)`
  issues `GET /posts/:id`.
- **Invalidation (F-34).** Mutations broadcast the existing family key once
  (one list event covers rows, summary and facets); posts keep TASK-554's
  one list `update` then one detail `update`, delete keeps its ordered
  invalidates. Subscriber tests prove `PageListPage` (`PageListPage.tsx:142-145`)
  and every list view revalidate in the background without overwriting
  dirty state.
- **Folders (F-40).** `mediaClient` subscribes to `cacheKeys.mediaList` (sent by
  `mediaFoldersClient.ts:281`, read-only) and clears its summary/facet
  families on any event. Test: folder rename then facet refresh.
- **Caption (F-39).** Post-editor media selection fetches the selected asset's
  detail before copying `caption` (`PostEditorCanvas.tsx:1270`); list items
  carry no caption. Test in `post-editor-media-controls.test.tsx`.
- **Prefetch (I-04).** `prefetchWarmupOptions` stays exactly `{ force: false }`
  (`core/admin/utils/adminPrefetch.ts:82`); first-page params travel as a
  separate argument.
- **Signatures (F-10).** `getCachedPosts(filters?)` returns
  `PostListEnvelope | null` for the first page of those filters and
  `listPostsCached(filters?, options?)` resolves `PostListEnvelope`; the
  TASK-554 suites adapt only mechanically (D2).

### C10 — Revision adoption as wave W0

Closes: F-08, F-24, F-35; applies O8.

- **Live regression at HEAD (F-35).** `pageRoutes.ts:276-278` and
  `detailPageRoutes.ts:222` already return `{items,nextCursor,hasMore}`
  (06-L02), while `pagesClient.ts:438-440` types `PageRevision[]`,
  `detailPagesClient.ts:400-405` an array, and
  `DetailTemplateEditorPage.tsx:477-478`, `:884-890` read `.length`/`.map`.
  Page history, draft recovery and detail-template history are broken now.
  W0 lands first and is gated separately (C14).
- **Host contract.** `pageEditorHostContract.ts:85-99` changes to
  `PageEditorRevision = PageRevisionSummary` (no `data`) and
  `PageEditorHostRevisions.list(id, cursor?: string | null): Promise<{items:
  readonly PageEditorRevision[]; nextCursor: string | null; hasMore: boolean}>`.
  `usePageEditorController.ts:122-126`, `:257-261` delegate revision state to
  `usePageEditorRevisions.ts`; `PageEditorToolbar.tsx:617-724` (recovery,
  `setRevisions` at `:656`, `:672`, `:685`) moves to
  `PageEditorToolbarRevisions.tsx`; the HistorySheet
  (`PageEditorSettingsPanel.tsx:591-663`) moves to `PageEditorHistorySheet.tsx`
  with an explicit Load more that appends pages.
- **Recovery.** `findRecoverableAutosaveRevision` (`PageEditorToolbar.tsx:99-108`,
  re-exported by `PageEditor.tsx:7`) reads the FIRST page only (DESC
  `createdAt`); restore stays a route call by id. A test pins that an autosave
  on page 2 is not offered.
- **PageRevisionDrawer.** Not retired (its KEEP entry in the non-owned
  `tests/vitest/ui/editor-surface-dead-code.test.ts:121` stays valid); it
  becomes a presentational component over `readonly PageRevisionSummary[]`
  with no fetch. Contract :879-880 is superseded: the live chain is
  pagesClient → controller → toolbar → HistorySheet.
- **06-L02 suites (F-24).** `tests/unit/pages/pageRevisionAutosave.test.ts:136`,
  `:149` replace `toHaveLength(n)` with `.items` length plus `hasMore` and
  `nextCursor` pins. `tests/unit/pages/pageService.test.ts:197-200`, `:272-275`
  need the same edit, but that file is in TASK-551-09-L02's allowlist
  (`TASK-551-09-L02-...md:352`) and the dispatch rejects a second owner; it is
  execution-only here and **blocked on a WU-D ownership decision** (09-L02
  releases the file to 03-L02, or 09-L02 performs the `.items` edit before
  03-L02's W0 gate). Its DB legs are red at HEAD once executed on
  `DATABASE_URL3`.
- **Email (F-24).** `resolveEmailValue` for `createdBy.email` needs
  `revisionService.ts:356-397` (TASK-551-06-L02 allowlist). This leaf cannot
  edit it; the change is handed to a 06-L02 dated correction (C17), and
  `createdBy` stays non-null only when the id and a resolved email exist, so
  `PageEditorResourceAuthor.email: string` is unchanged.

### C11 — Split table v2 and line budgets

Closes: F-05, F-06, F-07, F-26, F-43, F-45; applies O7. Supersedes the split
table (contract :167-181) and the overview-panel wording (contract :150-153).

Every original and extraction ends at or below its budget (all ≤ 1,000); the
extraction exists before pagination behavior lands and each extraction test
proves the pre-split render/action contract unchanged.

| Existing module (HEAD lines) | Extractions (budget) | Content moved |
|---|---|---|
| `media/MediaLibraryPage.tsx` (1,421; ≤ 700) | `MediaLibraryFolderState.ts` (≤ 250), `MediaLibraryResults.tsx` (≤ 400), `useMediaFolderOperations.ts` (≤ 450) | pure helpers `:72-259`; results `:1283-1365`; `guardedLoadFolders` `:413` with `:368-510` and `runFolderOperation` `:748` with `:748-950` (hook props: folder state, cache refresh callback, toast sink; returns handlers plus busy/error state) |
| `booking/BookingPage.tsx` (1,138; ≤ 800) | `BookingOverviewPanel.tsx` (≤ 250), `useBookingCollections.ts` (≤ 450) | panel: stat cards, resource list, weekly calendar only (no quick actions; "New booking" stays in `PageHeader`, `:920-931`); hook: the four list fetch/cursor/summary states, refresh callbacks, cache hydration |
| `posts/editor/PostEditorCanvas.tsx` (1,526; ≤ 500) | `PostCanvasBlockItem.tsx` (≤ 650), `PostEditorMediaControls.tsx` (≤ 850) | block item `:300-1185`; media controls: helpers `:201-291`, toolbars `:383-440` and `:526-620`, renderers `:840-1089`, picker state `:1205-1378`, dialog `:1465-1525` |
| `users/UsersRolesPage.tsx` (1,026; ≤ 750) | `UsersRolesContent.tsx` (≤ 450), `useUsersRolesCollections.ts` (≤ 350) | content `:844-940` region; hook: user/role envelopes and summary |
| `menus/MenuEditorPage.tsx` (1,081; ≤ 800) | `MenuEditorWorkspace.tsx` (≤ 450) | body contract unchanged |
| `content-types/DetailTemplateEditorPage.tsx` (952; ≤ 880) | `DetailTemplateRevisionPanel.tsx` (≤ 300) | revision list/load-more |
| `pages/editor/usePageEditorController.ts` (996; ≤ 900) | `usePageEditorRevisions.ts` (≤ 300) | C10 |
| `pages/editor/PageEditorToolbar.tsx` (988; ≤ 880) | `PageEditorToolbarRevisions.tsx` (≤ 300) | C10 |
| `pages/editor/PageEditorSettingsPanel.tsx` (951; ≤ 880) | `PageEditorHistorySheet.tsx` (≤ 250) | C10 |
| `pages/editor/PageEditorRegistryFields.tsx` (916; ≤ 850) | `PageEditorRegistryPickers.tsx` (≤ 300) | entry/form picker loaders `:287-345` |
| `site/SiteSettingsPage.tsx` (929; ≤ 880) | `SiteSettingsPagePickers.tsx` (≤ 250) | page picker loading `:258`, `:325` |
| `custom-screens/CustomScreenEntriesPage.tsx` (845; ≤ 800) | `useCustomScreenEntryList.ts` (≤ 350) | envelope/cursor state `:313-366`, stat cards |
| `services/entriesClient.ts` (886; ≤ 850) | `entriesClientPagination.ts` (≤ 400) | page/summary/facet/by-ids methods |
| `booking/bookingService.ts` (1,163; ≤ 150) | C7 | C7 |

`MenuDesignEditor.tsx` (517) needs no split; the superseded
`MenuDesignCanvas/Inspector/DataSources` row is deleted and the five
`MenuDesignEditor{Canvas,Controls,BarPanel,BlockPanel,BlockFields}.tsx`
files leave the allowlist (no owned-client import at HEAD).

Test-side splits (mandatory; each sibling suite hosts its parent's new
envelope-adoption assertions and the parent receives only mechanical mock
adaptation, so no parent grows):

| Parent (HEAD lines) | Named sibling(s) |
|---|---|
| `ui/menu-design-editor.test.tsx` (2,711, over the gate) | `menuDesignEditorTestHarness.tsx` (mocks/state `:1-426`), parent keeps `:427-759`, `menu-design-editor-responsive.test.tsx` (`:760-1479`), `menu-design-editor-nav-levels.test.tsx` (`:1480-2128`), `menu-design-editor-dropdown-bar.test.tsx` (`:2129-2711`) |
| `ui/users-roles-page-wave.test.tsx` (1,132, over the gate) | `usersRolesPageWaveFixtures.tsx`, `users-roles-page-pagination-wave.test.tsx` |
| `ui/bookingPageFixtures.tsx` (1,123) | body split (State/Mocks/Harness); the file is deleted |
| `ui/pageEditorV2FlowHarness.tsx` (1,000) | `pageEditorV2RevisionHarness.tsx` |
| `ui/use-screen-related-entries.test.tsx` (999) | `use-screen-related-entries-ids.test.tsx` |
| `ui/entry-field-renderer-wave.test.tsx` (999) | `entry-field-renderer-relation-ids-wave.test.tsx` |
| `ui/page-editor-shell-branches-wave.test.tsx` (976) | `page-editor-shell-revisions-wave.test.tsx` |
| `ui/page-editor-v2-authoring-flow.test.tsx` (959) | `page-editor-v2-authoring-revisions-flow.test.tsx` |
| `ui/entry-list-wave.test.tsx` (959) | `entry-list-pagination-wave.test.tsx` |
| `ui/page-editor-v2-persistence-flow.test.tsx` (957) | `page-editor-v2-persistence-revisions-flow.test.tsx` |
| `ui/detail-template-editor.test.tsx` (954) | `detail-template-editor-revisions.test.tsx` |
| `ui/media-library-mutation-retry-wave.test.tsx` (948) | `media-library-mutation-pagination-wave.test.tsx` |
| `pages/task-539-page-editor-controls.test.ts` (946) | `task-539-page-editor-media-controls.test.ts` |
| `admin/pagesClient.test.ts` (943) | `pagesClientPagination.test.ts` (body) |
| `ui/formsPagesWaveFixtures.tsx` (936) | `formsPagesWaveListFixtures.tsx` |
| `admin/mediaClient.test.ts` (935) | `mediaClientListEnvelope.test.ts` |
| `admin/postsClientCacheAuthority.test.ts` (934) | `postsClientEnvelopeFixtures.ts` (shared envelope builder for the D2 mechanical edit; no assertion moves) |
| `ui/forms-component-wave.test.tsx` (927) | `forms-component-list-wave.test.tsx` |
| `ui/pageEditorFlowTestUtils.tsx` (901) | `pageEditorFlowRevisionMocks.tsx` |
| `admin/entriesClient.test.ts` (860) | `entriesClientPagination.test.ts` |
| `ui/page-editor-insertion-flow.test.tsx` (807) | `page-editor-insertion-media-flow.test.tsx` |
| `ui-integration/custom-screen-task-540-flow.test.tsx` (806) | `custom-screen-task-540-list-flow.test.tsx` |

(Paths are relative to `core/admin/ui/`, `core/admin/` or `tests/vitest/` as
their directory prefix shows.)

### C12 — Test-side graph

Closes: F-09, F-10 (allowlist side), F-24 (allowlist side), F-50; applies O8,
D2.

Pinned discovery command (run from the repo root; at HEAD `ae6bea8a` it
prints 110 files, 31 already allowlisted and 79 new):

```bash
LIST_RE='\b(listPages|listPagesCached|listPageRevisions|listDetailPages|listDetailPagesCached|listDetailPageRevisions|listEntries|listAllEntries|listEntriesCached|listAllEntriesCached|listPosts|listPostsCached|getCachedPosts|listAdminUsers|listForms|listFormsCached|listFormSubmissions|listMedia|listMediaCached|listBooking[A-Za-z]+)\b'
VIEW_RE="core/admin/ui/(pages/PageListPage|pages/PageRevisionDrawer|posts/PostsListPage|entries/EntryList|users/UsersRolesPage|forms/FormListPage|forms/FormSubmissionsPage|media/MediaLibraryPage|media/MediaPicker|booking/BookingPage|content-types/DetailTemplateEditorPage|custom-screens/CustomScreenEntriesPage|posts/editor/PostEditorCanvas|pages/editor/usePageEditorController|pages/editor/PageEditorToolbar|pages/editor/PageEditorSettingsPanel|menus/MenuEditorPage)['\"]"
{ grep -rlE "$LIST_RE" tests/vitest/admin tests/vitest/ui tests/vitest/ui-integration tests/vitest/pages tests/vitest/mediaUi
  grep -rlE "$VIEW_RE" tests/vitest/admin tests/vitest/ui tests/vitest/ui-integration tests/vitest/pages tests/vitest/mediaUi; } | sort -u
```

- Every hit is in the envelope `allowlist` (the 79 new hits are listed there
  verbatim, sorted, after the pre-existing test entries) and, when it is a
  `*.test.ts(x)`, in `admin-pagination-vitest-1/-2`. The implementer reruns the
  command before W0 and again before closure; a new hit blocks until the
  envelope is amended. Hits include `postsClient.test.ts` and
  `postsClientCacheAuthority.test.ts` (D2), the 11 `page-editor-v2-flow-*`
  suites' shared `pageEditorFlowTestUtils.tsx`, and the view importers
  (`page-list*`, `posts-list`, `users.test.tsx`, `roles.test.tsx`,
  `mediaUi/mediaLibrary.test.tsx`, custom-screen suites).
- Named additions outside the command: `tests/vitest/admin/entriesClientRevisions.test.ts`,
  `tests/vitest/admin/support/entriesClientTestHarness.ts` (entriesClient
  reset registration), `tests/vitest/customScreens/relatedEntryResolver.test.ts`
  (resolver signature), `tests/unit/pages/pageRevisionAutosave.test.ts`
  (06-L02 handoff; `pageService.test.ts` see C10).
- New suites: `tests/vitest/ui/page-editor-revision-history.test.tsx` (W0:
  host envelope, HistorySheet load-more, first-page recovery),
  `tests/vitest/ui/post-editor-media-controls.test.tsx` (extraction proof,
  caption detail read, off-page media label),
  `tests/vitest/ui/users-roles-extraction.test.tsx` (Users/Roles extraction
  proof), `tests/unit/runtime-smoke/task-551-admin-lists-adapter.test.ts` (C15),
  and the fixture module `tests/perf/fixtures/task551AdminListDescriptors.ts`
  (C2).
- Owning file per Testing Requirements bullet (F-50): route registration and
  keyring lifecycle, submission-detail headers through the real dispatcher
  (`dispatchApiRequest`, as `tests/integration/server/route-response-headers.test.ts`
  does), export-job routes, `mapBoundedReadError` and `ids[]` routes →
  `tests/integration/routes/task551BoundedAdminLists.test.ts`; races →
  `tests/integration/server/task551AdminWriteConcurrency.test.ts`; budgets and
  plans → `tests/perf/database-admin-list-budgets.test.ts`. The five revision
  suites are `tests/vitest/admin/pagesClientPagination.test.ts`,
  `tests/vitest/admin/detailPagesClient.test.ts`,
  `tests/vitest/ui/page-revision-drawer.test.tsx`,
  `tests/vitest/ui/page-editor-revision-history.test.tsx` (the HistorySheet
  owner) and `tests/vitest/ui/detail-template-editor-revisions.test.tsx`.
- Off-page selection tests (O6): one per C3 `ids[]` consumer, each seeding a
  selected id absent from the first page and asserting the visible label.

### C13 — DB-lane test law

Closes: F-41, F-30 (DB-free and foreign-suite parts); applies D4, O9.

- New DB suites (`task551BoundedAdminLists`, `task551AdminWriteConcurrency`,
  `database-admin-list-budgets`) copy the owner-map idiom of
  `tests/integration/server/task551RevisionConcurrency.test.ts:56-65`
  (`TASK551_FIXTURE_DATABASE_URL/_NAME/_SENTINEL` all present), the runtime
  override plus module-load sentinel (`:84-97`), the
  `test.skipIf(!OWNER_DB_TEST_MAP_PRESENT)` gate (`:113`) and a
  `randomUUID()` RUN marker (`:118`); every fixture slug/email carries the
  marker and `afterAll` deletes only marker rows (`:739-741`). No truncate, no
  global sweep.
- Collection-global counts are asserted as deltas inside one serialized section
  (a suite-level advisory lock or one snapshot read before and after), never as
  absolute "+1" values against a shared database.
- 100k-row profiles are seeded only by the L02 fixture runner on
  `DATABASE_URL3` (fixture-target bootstrap
  `scripts/task-551-fixture-target-bootstrap.ts` with the
  `TASK551_FIXTURE_BOOTSTRAP_*` keys) and are read-only for this leaf.
- **Execution rule.** Every `task551-db-test` command runs with `DATABASE_URL`
  and the owner map resolved to `DATABASE_URL3`; the shared `DATABASE_URL`
  serves only the smoke (C15). Legacy foreign suites that statically import
  `core/db/client` (`forms.test.ts:5`, `submissionExportJob.test.ts:22`) run
  under the same explicit form.
- `route-response-headers.test.ts` (placeholder URL, stubs; `:12-38`) and
  `paginationCursorLifecycle.test.ts` import no database and run with profile
  `none`.
- 50-way races inherit the 06-L02 disclosure
  (`_docs/_workflows/_smoke/task-551/impl-06-l02.json:223`): a 55P03
  `lock_timeout` is a failing leg to investigate, never a counted loser, a skip
  or a partial write.

### C14 — Validation law

Closes: F-29, F-30 (profiles), F-31, F-42, F-53; applies O9.

| Command id | Lane / profile | Scope |
|---|---|---|
| `bounded-admin-list-bun-tests` | bun-test / `task551-db-test` | new route suite, race suite, execution-only `bookingRoutes.test.ts` and `forms.test.ts` |
| `route-response-header-receipt`, `pagination-cursor-lifecycle-receipt` | bun-test / `none` (relabelled; DB-free) | execution-only L03/L01 receipts |
| `submission-export-job-receipt` | bun-test / `task551-db-test` | TASK-571 suite, execution-only |
| `test551-db-unit` | bun-test / `task551-db-test` | `pageRevisionAutosave.test.ts` (owned), `pageService.test.ts` (execution-only, C10 blocker) |
| `admin-write-regression-receipt` | bun-test / `task551-db-test` | booking unit, public booking, session and users suites, unchanged |
| `admin-pagination-vitest-1`, `-2` | vitest / `none` | every allowlisted Vitest suite (124 + 25 paths) |
| `task554-regression-vitest`, `task554-regression-bun` | vitest / `none`; bun-test / `task551-db-test` | TASK-554 terminal suites except the two D2 files, execution-only |
| `runtime-smoke-registry-tests` | bun-test / `none` | adapter, registry and evidence-inventory suites |
| `admin-list-performance-test` | bun-test / `task551-db-test` | budgets, descriptor equality, plans |
| `database-explain-plans-receipt` | bun-test / `task551-phase-05-l02` | L05 37/38/76 registry, execution-only (as 05-L02's own command) |
| `core-lint-types`, `core-lint` | tooling / `none` | slow gates, run by the orchestrator between waves |
| `diff-check`, `diff-check-untracked` | tooling / `none` | tracked diff plus a literal `bun -e` scan of untracked `core/`, `scripts/`, `tests/` files (trailing whitespace, space-before-tab indent, conflict markers, blank line at EOF); no index write |
| `line-count-1..3` | tooling / `none` | `wc -l` over the 299 surviving allowlist paths (the deleted `bookingPageFixtures.tsx` excluded); any file above 1,000 fails the gate |
| `admin-list-playwright-smoke` | runtime-smoke / `none` | C15 |

- Vitest uses only the env-free direct form
  `bun --env-file=/dev/null node_modules/vitest/vitest.mjs run …`; `bunx` is
  gone (contract :1081, :1400).
- DB commands keep literal argv `bun --env-file=/dev/null test …`; the runner's
  `task551-db-test` injection resolves to `DATABASE_URL3` (C13).
- `gates:coderso`, `gates:coderso:perf` and `scan:security` are removed from
  this occurrence and owner-routed to TASK-551-10-L01 (they auto-load `.env`,
  `package.json:49,77-78`).
- `positiveDiscovery.minimum` equals the path count of every `test-paths`
  command. Prose Validation Commands mirror the envelope.
- Wave gates (WU-F): after W0 (revision chain), W1 (services/routes/races),
  W2 (clients/prefetch), W3 (UI/splits) and W4 (tests/smoke) run the fast gates
  on touched files plus the wave's commands; the orchestrator runs
  `core-lint-types`/`core-lint` between waves and
  `bash .claude/scripts/line-gate.sh <pre-family baseline>` after W3.

### C15 — Runtime smoke

Closes: F-37, F-52; applies O10. Supersedes contract :1026-1037 and
:1088-1089.

- Owned adapter `scripts/runtime-smoke/adapters/task-551-admin-lists.ts` plus
  `scripts/runtime-smoke/adapters/task-551-admin-lists/{contracts,fixtures,browser-plan,suite}.ts`,
  registered as suite `task-551-admin-lists` (profile `fast`) in
  `scripts/runtime-smoke/contracts.ts` (`SUITE_IDS`, `:3-18`),
  `scripts/runtime-smoke/registry.ts` (`ADAPTER_PATHS`, `:11-26`) and
  `scripts/runtime-smoke/cli.ts` (`SUPPORTED_PROFILES`, `:13-28`), with
  `tests/unit/runtime-smoke/cli-registry.test.ts` and an evidence gloss in
  `tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts` for
  `_docs/_workflows/_smoke/task-551/03-l02/wf55103l02/*.png`. TASK-551-10-L01
  reuses the suite; it does not re-own it.
- Command: `bun scripts/runtime-smoke.ts run --suite task-551-admin-lists
  --profile fast --session wf55103l02`, after a dev-server restart and admin
  plus front health checks, on the shared `DATABASE_URL` with a
  `task551-03l02-<run>` seed prefix and set-based cleanup of only prefixed rows.
- Scenarios, each in light and dark with DOM/geometry/ARIA assertions and zero
  console errors, ids pinned for 10-L01 (`TASK-551-10-L01-...md:595-597`):
  `pagination-next-previous`, `filter-reset`, `equal-sort-boundary`,
  `booking-dirty-refresh`, `extracted-views`, plus
  `page-history-load-more` (page HistorySheet and detail-template history),
  `offpage-selected-label` (media and page labels resolved through `ids[]`)
  and `custom-screen-list-view` (configured columns, field filter and sort,
  summary cards).
- Evidence: screenshots under
  `_docs/_workflows/_smoke/task-551/03-l02/wf55103l02/`; the shared runner
  report under the canonical `_docs/_workflows/_smoke/evidence/task-551/wf55103l02/`.
  10-L01's final files at the `03-l02/` root do not collide.

### C16 — Acceptance and security rewording

Closes: F-16 (wording), F-23 (wording), F-31, F-32 (wording), F-47, I-02.

- Contract :985-986 and :1103-1104 read: "`formsService.listForms` has zero
  Admin route/client callers; its assistant callers are preserved (C8)". The
  `deprecated-unused` inventory assertion is removed from this leaf's tests and
  handed to TASK-551-01-L01 final.
- Contract :993-995 read: "every outcome that reaches the route handler chain";
  the transport 429 and CSRF rejections are excluded (C4).
- Security Contract :1052-1054 read: "cursors of the matrix families are
  scope-bound, L01-HMAC-signed and age-limited; revision cursors are 06-L02's
  own opaque tokens, validated and mapped by the revision routes (C4)".
- Contract :264-265 read: "`core/services/content/entryService.ts` and
  `core/server/publicSite.tsx` are forbidden (terminal TASK-517 surface)".
- Contract :98 reads "78 matches (77 real importers; `formsClient.ts:15`
  matches through a comment)".
- Quantified acceptance :1115-1117 reads: "Admin descriptor identity is 41/41
  (32 re-derived plus 9 new, C3); L05 remains exactly 37 plan IDs / 38 cases /
  76 numeric scale receipts".

### C17 — Handoffs

Closes: F-11 (mirror), F-12 (download), F-28, F-51; records D1, D2 and the
F-24 routing.

- **TASK-551-08-L03 FINAL** (dated handoff present in its working-tree file):
  the token-guarded binary download route, a named
  `verifySubmissionExportToken` failure code, the removal of the legacy
  `GET /forms/:id/submissions/export` with its `forms.test.ts` assertions, and
  the client/UI switch from the legacy export to the job download (D1).
- **TASK-554:** the D2 dated handoff (landed in the TASK-554 file) allows only
  mechanical array→envelope adaptation of the two posts suites.
- **TASK-551-09-L01:** its `:70-74` text already states the two route suites
  are execution-only for 03-L02 (WU-D mirror in the working tree).
- **TASK-551-09-L02:** the `pageService.test.ts` ownership decision (C10).
- **TASK-551-06-L02:** a dated correction applying `resolveEmailValue` to
  `PageRevisionSummary.createdBy.email` (`revisionService.ts:356-397`).
- **TASK-551-10-L01:** reuse of the C15 suite and scenario ids; ownership of
  `gates:coderso`, `gates:coderso:perf` and `scan:security` for this
  occurrence.
- **TASK-551-10-L02 documentation:** endpoint cursor/limit/error deltas, the
  `ids[]` and custom-screen projection parameters, export-job create/status
  routes, the booking split map, the Admin cache delta for
  `_docs/ADMIN_CACHE.md`/`_docs/ADMIN_CACHE_MAP.md` (families, C9 key template,
  TTL reuse, invalidation keys, L04 reset registration, prefetch first-page
  arguments), and a `PAGINATION_CURSOR_SECRET` entry for `.env.example`.

### Round-1 record (in-place edits, 2026-09-24)

Envelope `dependencies`, occurrence id `single` and its `dependsOn` are
unchanged. All other in-place edits:

1. **Exact File Ownership.** Before: no page-editor revision chain, hook
   extractions, shared list helpers, bounded-read mapper, resolver or smoke
   paths. After: the "FAZA-0 ownership additions" paragraph lists 28
   production/tooling paths and records the removal of the five
   `MenuDesignEditor{Canvas,Controls,BarPanel,BlockPanel,BlockFields}.tsx`
   modules.
2. **Tests list.** Before: it named `tests/integration/routes/bookingRoutes.test.ts`
   and `tests/integration/routes/forms.test.ts` as owned tests. After: both are
   removed; `tests/unit/pages/pageRevisionAutosave.test.ts` and "plus the
   C11/C12 test paths" are appended.
3. **Forbidden-path prose.** Before: "**Dual-writer handoff (TASK-551-09-L01):**
   … This leaf may extend those two files only for bounded list/pagination
   behavior and must preserve every 09-owned assertion; any wider change
   coordinates through the TASK-551-09 contract and never silently re-owns the
   dispatcher sections." After: "**Execution-only foreign route suites
   (TASK-551-09-L01; D1/F-11):** … They are execution-only for this leaf: it
   reruns them unchanged and never edits them. New booking/forms list,
   submission-detail, `ids[]` and export-job route assertions live in
   `tests/integration/routes/task551BoundedAdminLists.test.ts`." Both files stay
   in `forbiddenPaths`.
4. **Split table.** Before: the `MenuDesignEditor.tsx` →
   `MenuDesignCanvas.tsx; MenuDesignInspector.tsx; MenuDesignDataSources.tsx`
   row, followed by a "Rebaseline note (TASK-542-03-L03)" blockquote inside the
   table, then the `MenuEditorPage.tsx` and `PostEditorCanvas.tsx` →
   `PostEditorMediaControls.tsx` rows. After: an unbroken three-row table
   (`PostEditorCanvas.tsx` → `PostCanvasBlockItem.tsx; PostEditorMediaControls.tsx`)
   followed by a plain note that `MenuDesignEditor.tsx` needs no split and that
   C11 is the complete table.
5. **Validation Commands.** Before (verbatim, HEAD `ae6bea8a`):

```text
- `set -a && source .env && set +a && bun test tests/integration/routes/task551BoundedAdminLists.test.ts tests/integration/routes/bookingRoutes.test.ts tests/integration/routes/forms.test.ts tests/integration/server/task551AdminWriteConcurrency.test.ts` (the two route files are 09-L01-owned dispatcher files; this leaf extends them only per the dual-writer handoff above)
- `set -a && source .env && set +a && bun test tests/integration/server/route-response-headers.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/paginationCursorLifecycle.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/forms/submissionExportJob.test.ts` (TASK-571 landed suite; rerun unchanged as the read-only receipt for the export-job adoption above)
- `bunx vitest run tests/vitest/admin/task551PaginatedClients.test.ts tests/vitest/admin/task551PaginatedListViews.test.tsx tests/vitest/admin/task551PaginatedConsumerGraphScreens.test.tsx tests/vitest/admin/task551PaginatedConsumerGraphEditors.test.tsx tests/vitest/admin/formsClient.test.ts tests/vitest/admin/bookingClient.test.ts tests/vitest/admin/mediaClient.test.ts tests/vitest/admin/mediaUtils.test.ts tests/vitest/admin/pagesClient.test.ts tests/vitest/admin/pagesClientPagination.test.ts tests/vitest/admin/detailPagesClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/ui/booking-page-wave.test.tsx tests/vitest/ui/booking-page-errors.test.tsx tests/vitest/ui/booking-page-schedule-crud.test.tsx tests/vitest/ui/booking-page-tabs.test.tsx tests/vitest/ui/booking-tabs-interactions-wave.test.tsx tests/vitest/ui/booking-tabs-leaf.test.tsx tests/vitest/ui/booking-helpers.test.ts tests/vitest/ui/booking-helpers-wave.test.ts tests/vitest/ui/form-submissions-page.test.tsx tests/vitest/ui/media-library.test.tsx tests/vitest/ui/media-library-load-retry-wave.test.tsx tests/vitest/ui/media-library-mutation-retry-wave.test.tsx tests/vitest/ui/media-library-page-wave.test.tsx tests/vitest/ui/media-card.test.tsx tests/vitest/ui/media-components.test.tsx tests/vitest/ui/media-details.test.tsx tests/vitest/ui/media-details-panel.test.tsx tests/vitest/ui/media-filter-panel.test.tsx tests/vitest/ui/media-folder-rail.test.tsx tests/vitest/ui/media-picker.test.tsx tests/vitest/ui/media-toolbar.test.tsx tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/form-builder-page-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui/use-forms-wave.test.tsx tests/vitest/ui-integration/forms-list-restyle.test.tsx tests/vitest/ui-integration/forms.test.tsx tests/vitest/ui-integration/forms-submissions-restyle.test.tsx tests/vitest/ui/page-revision-drawer.test.tsx tests/vitest/ui/page-editor-v2-flow-loading.test.tsx tests/vitest/ui/page-editor-v2-flow-autosave.test.tsx tests/vitest/ui/page-editor-v2-flow-columns.test.tsx tests/vitest/ui/page-editor-v2-flow-controls.test.tsx tests/vitest/ui/page-editor-v2-flow-inline-edit.test.tsx tests/vitest/ui/page-editor-v2-flow-inserters.test.tsx tests/vitest/ui/page-editor-v2-flow-panels.test.tsx tests/vitest/ui/page-editor-v2-flow-responsive.test.tsx tests/vitest/ui/page-editor-v2-flow-sections.test.tsx tests/vitest/ui/page-editor-v2-flow-settings.test.tsx tests/vitest/ui/page-editor-v2-flow-toolbar.test.tsx tests/vitest/ui/detail-template-editor.test.tsx tests/vitest/validation/task551ListSchemas.test.ts`
- `set -a && source .env && set +a && bun test tests/perf/database-admin-list-budgets.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso`
- `bun run gates:coderso:perf`
- `bun run scan:security`
- `playwright-cli -s=wf55103l02` for the five visible-effect scenarios in light
  and dark mode, with zero console errors and the required screenshots
```

   After: the env-free vitest form, `<db-env>` DB forms on `DATABASE_URL3`,
   profile-`none` receipts, the new execution-only and smoke/line-count
   commands, and the owner-routed release gates, mirroring the envelope.
6. **Envelope** (`task-551-dispatch-contract.mjs` rules: literal argv ≤ 128
   tokens, `minimum ≥ 1`, test paths inside argv, no allowlist/forbidden
   collision, no unreferenced command, no cross-owner allowlist path):
   - `allowlist` 163 → 300: +28 production/tooling (Exact File Ownership),
     +79 C12 discovery hits, +11 named additions and new suites, +24 C11
     split siblings, −5 `MenuDesignEditor*` modules.
     `tests/vitest/ui/bookingPageFixtures.tsx` stays allowlisted so the leaf can
     delete it, and is excluded from `line-count-*`.
   - `forbiddenPaths` 19 → 40: kept `bookingRoutes.test.ts` and
     `forms.test.ts`; added the execution-only suites (`pageService.test.ts`,
     booking/session/users/TASK-554 suites, `database-explain-plans.test.ts`),
     the foreign L01/L02/L05/06-L02 sources and fixtures, and read-only helpers
     (`mediaFoldersClient.ts`, `ListPaginationFooter.tsx`, `useListPagination.ts`,
     `editor-surface-dead-code.test.ts`, `bookingReservationExclusion.ts`).
   - `commands` 12 → 21. Removed: `coderso-gate`, `performance-gate`,
     `security-scan`, `admin-pagination-vitest`. Relabelled to `none`:
     `route-response-header-receipt`, `pagination-cursor-lifecycle-receipt`.
     Added: `test551-db-unit`, `admin-write-regression-receipt`,
     `admin-pagination-vitest-1`, `admin-pagination-vitest-2`,
     `task554-regression-vitest`, `task554-regression-bun`,
     `runtime-smoke-registry-tests`, `database-explain-plans-receipt`,
     `diff-check`, `diff-check-untracked`, `line-count-1`, `line-count-2`,
     `line-count-3`. `admin-list-playwright-smoke` argv is now the C15 command.
     `bounded-admin-list-bun-tests` `minimum` 1 → 4.
   - `occurrences.single.commandIds` 12 → 21, exactly the command ids in
     envelope order.
7. **Body text superseded without in-place edits** (this section wins):
   contract :363-383 (KeysetSpec wording → C3/C4), :459-463 and :479-493 (C6),
   :589-642 facet paging (C3), :654-680 and :938-947 SQL-bytes gate (C2),
   :715-718 and :915-916 slot preview (C8), :722-854 pseudocode (C4/C5),
   :868-883 revision adoption (C10), :959-962 race codes (C5), :985-986,
   :993-995, :1052-1054, :1103-1104, :1115-1117 (C16), :1026-1037 smoke (C15),
   :1093-1096 documentation (C17).

## Dated Contract Corrections — 2026-09-25 (Round 2, part 1: C3–C8)

Source: `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round2-dispositions.md`
(six Round-1 auditors, HEAD `9c5b6666`, dirty mirrors). Applies R2-01..R2-06,
R2-12, R2-14..R2-18, R2-29..R2-33 and R2-36; the rest belong to part 2 (C9–C17,
envelope, Validation Commands). **This section wins** over the body and
Round-1 C3–C8. Anchors were re-read on 2026-09-25; `contract :NNN` cites
current lines. In-place edits: only the R2-29 re-anchors in C2, C4, C8.

### R2-01 — Admin-set serialization (HIGH)

Supersedes C5 "**Roles (O4).**" in full ("… move the last-admin check inside
their transaction after `acquireNativeCmsWriterFence(tx)` … and a `FOR UPDATE`
lock on the target user row, mirroring `deleteUser` … Proof: two admins
demoting each other concurrently leave at least one admin; 50-way disable race
leaves one admin.") and the C1 short form "O4 role last-admin check under the
writer fence plus row lock". Reason: the fence is SHARED
(`pg_try_advisory_xact_lock_shared`, `core/db/nativeCmsWriterFence.ts:103`)
and row locks on two different targets never conflict, so two demotions of
different admins write-skew past the check.

- **Admin-set changes**, all under one lock: `usersService.ts` `setUserRoles`
  (`:242`), `disableUser` (`:281`), `deleteUser` (`:302`) and — writer-verified,
  since the semantics below count only active users — `updateUser` (`:186`)
  when `input.status` leaves `active` (PATCH `/admin-users/:id`,
  `adminUserSchemas.ts:28`); `rolesService.ts`
  `updateRoleWithTransitionInClient` (`:137`, branch `wasAdmin && !nextAdmin`
  `:172`) and `deleteRole` (`:202`). `createUser`/`enableUser` only add admins
  and take no lock.
- **Lock.** Exclusive `pg_advisory_xact_lock(551_031, 1)` from code-owned int4
  constants `ADMIN_SET_LOCK_NAMESPACE`/`ADMIN_SET_LOCK_KEY` (never renumbered;
  `revisionAllocation.ts:122-142` convention), taken inside the transaction
  BEFORE any admin count. Order everywhere: writer fence (shared, kept as an
  extra guard) → admin-set lock → target row `FOR UPDATE` → count → write.
  Isolation `read committed`: under `repeatable read` the fence statement
  would fix the snapshot before the lock wait and the count could miss a
  committed demotion.
- **Semantics (intentional fix).** An active admin is a user with `status =
  'active'` holding a role whose `permissions` jsonb array contains `"*"`
  (`hasFullAccess`, `rolesService.ts:52`); a disabled or pending admin no
  longer counts. The helpers `getAdminUserIdsExcluding`, `ensureNotLastAdmin`,
  `userHasAdminRole` (`usersService.ts:55,67,74`), `countUsersWithRoles` and
  `ensureAdminRoleRemains` (`rolesService.ts:80,89`) are replaced by the ones
  below; `getAdminRoleIds` (`:72`) stays.
- **Codes.** Loser stays `last_admin` 409 (`adminUsersRoutes.ts:69-70`,
  `adminRolesRoutes.ts:52-53`). `mapAdminUserError` (`adminUsersRoutes.ts:57`)
  and `mapAdminRoleError` (`adminRolesRoutes.ts:40`) add
  `native_cms_writer_fence_busy` and `native_cms_writer_recovery_required` →
  503 same code with fixed messages (backup's 409 busy row,
  `backupRoutes.ts:108-113`, is unchanged).

```ts
// core/services/admin/rolesService.ts — owner of the admin-set contract
export const ADMIN_SET_LOCK_NAMESPACE = 551_031; // int4; never renumber
export const ADMIN_SET_LOCK_KEY = 1;
export async function withAdminSetLock<T>(run: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    await tx.execute(sql`select pg_advisory_xact_lock(${ADMIN_SET_LOCK_NAMESPACE}, ${ADMIN_SET_LOCK_KEY})`);
    return run(tx);
  }, { isolationLevel: "read committed" });
}
export async function countActiveAdminUsers(tx: Tx, exclude: { userId?: string; roleId?: string } = {}) {
  // select count(distinct u.id)::int from users u join user_roles ur on ur.user_id = u.id
  //   join roles r on r.id = ur.role_id where u.status = 'active'
  //   and jsonb_typeof(r.permissions) = 'array' and r.permissions @> '["*"]'::jsonb
  //   [and u.id <> $userId] [and r.id <> $roleId]   -- bound parameters only
}
export async function isActiveAdmin(tx: Tx, userId: string): Promise<boolean>; // same join, limit 1
// updateRoleWithTransition = withAdminSetLock((tx) => updateRoleWithTransitionInClient(tx, id, input)):
//   role FOR UPDATE; if (wasAdmin && !nextAdmin && (await countActiveAdminUsers(tx, { roleId: id })) === 0)
//   throw new Error("last_admin"). deleteRole: same guard for a full-access role, delete on tx.

// core/services/admin/usersService.ts
export async function setUserRoles(userId: string, roleIds: string[]) {
  await assertRoleIdsExist(roleIds); // UX preflight only
  return withAdminSetLock(async (tx) => {
    const [target] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    if (!target) return null;
    const adminRoleIds = await getAdminRoleIds(undefined, tx);
    const keepsAdmin = roleIds.some((roleId) => adminRoleIds.includes(roleId));
    if (!keepsAdmin && (await isActiveAdmin(tx, userId))
      && (await countActiveAdminUsers(tx, { userId })) === 0) throw new Error("last_admin");
    /* existing user_roles delete + insert on tx; return the summary */
  });
}
// disableUser, deleteUser and updateUser (status leaves 'active') use the same guard, then write on tx.
```

Writer verification (collision test): the existing ones are foreign-owned and
iterate no shared registry —
`tests/integration/runtime/retentionScheduler.test.ts:448` and
`tests/perf/database-retention-jobs.test.ts:251` pin only the retention pair
against session locks; `tests/vitest/database/revisionAllocation.test.ts:238`
pins only the five revision family keys — so the constants cannot join them
without a cross-owner edit. The pin lands in owned
`tests/unit/admin/rolesService.test.ts` as a DB-free test "the admin-set lock
pair avoids every landed advisory-lock namespace" over the two-int4
(`objsubid 2`) inventory: fence 548 + test offsets 1..1000, key 0
(`nativeCmsWriterFence.ts:5,8`); full-site package 547 × any key
(`legacyInstallRunLocks.ts:25,400`); revision families 551_001..551_005 × any
key (`revisionAllocation.ts:136`); retention (551_063, 3)
(`retentionJobService.ts:182-183`); (20260604, 482) first admin, (20260604,
400) migrations, (20260604, 403) assistant docs, (20260628, 484) backup,
(20260818, 571) submission export. One-argument bigint locks (`hashtext(...)`,
`legacyInstallRunPersistence.ts:540`; the 551551551 probe) use `objsubid 1`
and cannot collide with a two-key lock; the test says so.

Tests: `rolesService.test.ts` (the pin; inactive or non-`"*"` marker users
are not counted). `task551AdminWriteConcurrency.test.ts` reads the NON-marker
active-admin baseline `b` in a short transaction holding the same lock, then,
on marker rows only, runs mutual `setUserRoles` demotion, a 50-way
`disableUser` race, `updateRole` stripping `"*"` vs `disableUser`, `updateUser`
status → `inactive`, and "a disabled admin no longer counts" (A active, B
inactive, demote A): `b = 0` → exactly N−1 of N succeed, the rest `last_admin`;
`b ≥ 1` → all succeed. A DB-free block pins the four 503 mapper rows.
`usersService.test.ts` stays execution-only (`contract :1537`).

### R2-02 — Booking reservation correctness = exclusion constraint (HIGH)

Supersedes C5 "**Booking (O5).**" in full (the
`pg_advisory_xact_lock(hashtext('coderso:booking-resource-window:v1'), …)` on
create/blackout/reactivation and the "blackout-vs-reservation … yield no
overlapping active window" proof), the C1 short form "O5 booking 23P01 …" and
C7's "the C5 lock helper". Product rule: a blackout MAY overlap active
reservations; `createBookingBlackout` (`bookingService.ts:841`) keeps no lock
and no conflict read; no `hashtext(...)` advisory lock exists in booking.
Correctness is migration 0081's `bookings_active_resource_window_excl`
(applied on `DATABASE_URL3` 2026-09-25 per the dispositions record); the
preflight `ensureBookingWindowAvailable` (`:913`, blackout rejection `:956`)
stays as the fast path only.

Writer verification: `core/db/bookingReservationExclusion.ts` exports only the
descriptor `BOOKING_RESERVATION_EXCLUSION_SQL` (`:27-37`) and its type
(`:39-41`), no violation predicate, and is forbidden here (`contract :1542`).
`bookingMutationService.ts` therefore owns the predicate, matching
`constraint_name` against the imported descriptor name with the bounded
own-data-property cause walk of `core/services/media/mediaFoldersService.ts:23-64`.

```ts
// core/services/booking/bookingMutationService.ts
export function isBookingReservationExclusionViolation(error: unknown): boolean {
  // walk error -> cause at most 8 levels; own data properties `code`/`constraint_name` only;
  // true iff code === "23P01" && constraint_name === BOOKING_RESERVATION_EXCLUSION_SQL.name
}
async function withReservationExclusion<T>(write: () => Promise<T>): Promise<T> {
  try { return await write(); } catch (error) {
    if (isBookingReservationExclusionViolation(error)) throw new Error("booking_slot_unavailable");
    throw error;
  }
}
// createBookingReservation (:971): unchanged normalization + preflight; the INSERT runs in
//   withReservationExclusion. updateBookingReservationStatus (:1027): the UPDATE runs in it, so a
//   reactivation to pending|confirmed overlapping an active window fails booking_slot_unavailable
//   (409, bookingRoutes.ts:85-86; the public path keeps publicBookingApi.ts:236).
```

Tests (`task551AdminWriteConcurrency.test.ts`, marker resource/service): 50
concurrent overlapping creates → exactly one active row and 49
`booking_slot_unavailable`, no other code; reactivating a cancelled
reservation over an active one → `booking_slot_unavailable`, 409 via
`mapBookingError`; two overlapping cancelled reservations reactivated
concurrently → exactly one succeeds; a global blackout over an active
reservation succeeds with exactly one INSERT, no lock, no conflict SELECT
(R2-30 counter). DB-free: the predicate is true at cause depth 0 and 3, false
for another constraint, for `23505`, and at depth 9.

### R2-03 — Bounded-read mapper table (HIGH)

Supersedes C4 "every `PaginationCursorError` code starting `cursor_`
(`keysetCursor.ts:29-40`) → same-code 400; … plain `Error`
`pagination_cursor_keyring_unavailable` … → 503" (`contract :2143-2146`) and
restores the body rule (`contract :405-409`).

| Thrown | `mapBoundedReadError` |
|---|---|
| `PaginationCursorError` `cursor_invalid`, `cursor_schema_invalid`, `cursor_value_invalid`, `cursor_spec_mismatch`, `cursor_version_unsupported`, `cursor_expired`, `cursor_key_retired` (`keysetCursor.ts:30-37`) | 400 `cursor_invalid` |
| `cursor_scope_mismatch` (`:34`) | 400 `cursor_scope_mismatch` |
| `page_limit_invalid` (`boundedReadContract.ts:19`) | 400 `page_limit_invalid` |
| `Error("pagination_cursor_keyring_unavailable")` (`paginationCursorLifecycle.ts:45`) or that `PaginationCursorError` code (`keysetCursor.ts:39`) | 503 `pagination_unavailable` |
| `Error("admin_list_cursor_encode_failed")` (R2-15) | 500 same code |
| `pagination_cursor_config_invalid`, `bounded_read_window_overflow`, other | `null` → generic 500 |

Fixed messages; cursor, scope and payload never echoed. Owning test:
`tests/integration/routes/task551BoundedAdminLists.test.ts`, one assertion
per code (each of the seven generic codes individually) plus a tampered-cursor
no-echo check.

### R2-04 — Multi-value query params are single-key comma lists (HIGH)

Supersedes C3 "Query `ids` (repeatable, 1..100 unique UUIDs)", the C3 D3
`fields[]` wording and the body media "`types[]` … `tags[]`" (`contract
:419`) where they imply repeated keys. Transport fact: `RouteContext.query` is
`Object.fromEntries(url.searchParams.entries())` (`httpServer.ts:495`), so a
repeated key collapses to its LAST value — documented, not detectable at the
route; `httpServer.ts` is forbidden (`contract :1512`).

| Param | Used by | Token | Count | Raw max | Order |
|---|---|---|---|---|---|
| `ids` | the six `*-by-ids` statements | UUID (`bookingSchemas.ts:6-7`) | 1..100 unique | 3,700 | request |
| `fields` | custom-screen list (R2-05) | `^[A-Za-z][A-Za-z0-9_-]{0,79}$` | 1..12 unique | 971 | sorted |
| `types` | media | `image`\|`file` | 1..2 unique | 10 | sorted |
| `tags` | media | `encodeURIComponent` token; decoded, trimmed, 1..40 chars (`mediaService.ts:34`), no C0/C1 | 1..20 unique case-insensitively | 8,192 | sorted |
| `options` | custom-screen list | `field:<key>` \| `system:<title\|slug\|status\|createdAt\|updatedAt\|publishedAt>` | 1..8 unique | 1,000 | sorted |

Field-key rule (writer-verified deviation from the shorthand
`^[A-Za-z0-9_]{1,64}$`): the code-owned field-name rule is
`/^[A-Za-z][A-Za-z0-9_-]{0,79}$/` (`contentTypeSchemaFields.ts:29`, private);
the shorthand would reject valid hyphenated or 65..80-character names.
`adminListScope.ts` re-declares it as `ADMIN_LIST_FIELD_KEY_PATTERN` with a
parity test; a configured legacy key outside it is dropped by the client and
its column renders empty.

```ts
// core/services/database/adminListScope.ts — route-side normalizer (pure)
export type AdminListParamRule = Readonly<{ max: number; token: RegExp; encoded?: boolean;
  order: "request" | "sorted"; foldCase?: boolean }>;
/** Split on ",", decode when `encoded`, validate each token, reject duplicates and over-count;
 *  null => the route throws ApiError("validation_error", "Invalid payload", 400, [{ path, keyword: "list" }]). */
export function splitAdminListParam(raw: string, rule: AdminListParamRule): readonly string[] | null;

// core/admin/services/adminListEnvelope.ts — client serializer
export function serializeAdminListQuery(
  params: Readonly<Record<string, string | number | boolean | null | undefined | readonly string[]>>,
  listModes: Readonly<Record<string, "request" | "sorted" | "encoded-sorted">>
): string; // keys sorted; empty values skipped; arrays deduped (sorted unless "request"),
           // tokens percent-encoded only in "encoded-sorted", a "," inside any other token throws
           // admin_list_param_invalid before the request; URLSearchParams.set only (never append);
           // returns "" for default first-page filters
```

Each family schema module declares the param as `{ type: "string", minLength:
1, maxLength: <raw max>, pattern: <list pattern> }` inside its reject-unknown
query object (Ajv, `schemaValidator.ts:5-10`); the route then runs
`splitAdminListParam`. `ids` stays exclusive with `cursor`, `q`, filters and
facet fields (C3). Tests: `task551BoundedAdminLists.test.ts` — happy paths;
duplicate, 101st id, 13th field, 21st tag, `a,,b`, bad UUID, bad
percent-encoding, `ids`+`cursor` → `validation_error`; `?ids=A&ids=B`
resolves only `B`; a tag containing a comma round-trips; the field-key corpus
accepts/rejects exactly as `normalizeContentTypeFieldName` (`:50`) except
secret-like names. `tests/vitest/admin/task551PaginatedClients.test.ts` —
`getAll(k).length <= 1` for every key over a randomized corpus, ordering
modes, tag encoding, the comma throw, default filters → `""`.

### R2-05 — Custom-screen list owner and statement shapes (HIGH)

Supersedes the C3 bullet "**Custom-screen projection (D3).**" (view-bound
`fields[]`, "`fieldFilter.<key>` equality (at most 5, value max 200 chars, key
in the view's enabled filters)", "`sort_value = left(normalize(data->>key,
NFC), 256)`", "Search stays title/slug") and the C3 matrix row where they
differ.

- **Owner.** NEW `core/services/customScreens/customScreenEntryReadService.ts`
  (≤ 600) owns both D3 statements, not `entryReadService.ts`. The typed route
  (`contentEntryRoutes.ts`, `/content/:type/entries`) delegates to it when
  `fields`, `options`, `sortField`, `fieldFilter.*` or `systemFilter.*` is
  present, else to `listAdminTypedEntriesPage`.
- **Structural validation, no view-config lookup** (RBAC `content:read` gates
  the collection; the typed parent resolves first, `content_type_not_found`
  unchanged): `fields` ≤ 12, `options` ≤ 8 (R2-04); `fieldFilter.<fieldKey>`
  and `systemFilter.<title|slug|status|createdAt|updatedAt|publishedAt>` ≤ 8
  in total, values 1..256 chars; `sortField` a `field:`/`system:` token,
  `sortDir` `asc|desc`. Keys reach SQL only as bound parameters (`data ->>
  $k`, `$keys::text[]`); system names go through a closed `CASE` map.
- **Projection.** `data` = `jsonb_object_agg(k.key, e.data -> k.key)` over
  `unnest($fields::text[])`, filtered to present keys whose
  `octet_length(value::text) <= 2048`, default `'{}'`; the DTO mapper nulls a
  value that is not a JSON scalar or an array of ≤ 20 scalars, so
  `customScreenListModel.ts:249` keeps reading `entry.data?.[field]`.
- **Sort (accepted UX delta).** Text sorts use the derived-table alias
  `sort_value` = the R2-15 expression over `e.data ->> $sortKey` (field) or the
  `title`/`slug`/`status` column (system); `system:publishedAt` uses
  `to_char(e.published_at, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
  `system:createdAt|updatedAt` use the C3 timestamp spec. Server text
  collation replaces the client's numeric/date-aware `localeCompare`
  (`compareEntryValues`, `customScreenListModel.ts:278-297`): JSON numbers
  order as text, ISO dates still order correctly. KeysetSpec `(sortValue text
  "sort_value" nullable:true, id)`; null placement is the PostgreSQL default
  per direction (`asc` → `NULLS LAST`, `desc` → `NULLS FIRST`; final `id` per
  K1), preserving C3's and the client's empty-value placement (`:280-281`) —
  the dispositions' "nulls last" is read as the ascending case.
- **Filters.** Scalar: `e.data ->> $k = $v`. Array (chosen by
  `jsonb_typeof(e.data -> $k) = 'array'`): `exists (select 1 from
  jsonb_array_elements_text(e.data -> $k) x(v) where x.v = $v)` — a writer
  refinement of the shorthand `data->key @> to_jsonb($v)`, which matches only
  string elements and would drop the number/boolean tokens produced by
  `normalizeFilterToken` (`:261-267`) and by the option statement. System
  filters compare the mapped column; dates use `to_char(<col>,
  'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`, byte-equal to the client token.
- **Search** is the entries-typed trigram predicate (R2-14), a superset of
  today's title/slug match (`:378-381`). **Scope:**
  `deriveAdminListScope("custom-screen-entries", { q, status, filters,
  fields, options, sortField, sortDir }, typeId)` with sorted lists.
  **Ceiling stays 3** (R2-30): page, typed-entry summary (entryReadService),
  options; the `ids` path is 1.

```sql
-- admin-custom-screen-entries-page
select d.* from (
  select e.id, e.type_id, e.title, e.slug, e.status, e.visibility, e.tags, e.scheduled_at,
         e.created_at, e.updated_at, e.published_at, e.author_id,
         <projection> as data, <sort expression> as sort_value
    from content_entries e
   where e.type_id = $typeId and <q trigram> and <status/system/field filters>
) d where <buildKeysetPredicate over d.sort_value, d.id>
 order by <buildKeysetOrderBy(spec, "next")> limit $limitPlusOne;
-- admin-custom-screen-entries-filter-options: one statement for all requested tokens
with req(token, source, key) as (select * from unnest($tokens::text[], $sources::text[], $keys::text[])),
vals as (
  select r.token, v.value from req r
    join content_entries e on e.type_id = $typeId
    cross join lateral (
      select jsonb_array_elements_text(e.data -> r.key)
       where r.source = 'field' and jsonb_typeof(e.data -> r.key) = 'array'
      union all select e.data ->> r.key
       where r.source = 'field' and jsonb_typeof(e.data -> r.key) in ('string','number','boolean')
      union all select <closed CASE over title|slug|status|to_char(...MS"Z") dates>
       where r.source = 'system') v(value)
   where v.value <> '' and char_length(v.value) <= 256)
select token, value from (
  select token, value, row_number() over (partition by token order by value) as rn
    from (select distinct token, value from vals) d) ranked
 where rn <= 51 order by token, value;
```

The mapper returns `{ items: ≤ 50, truncated }` per token; options span the
whole typed parent, independent of selected filters (as
`buildCustomScreenEntriesFilterOptions`, `:326-366`, does over the loaded
set). Tests: `task551BoundedAdminLists.test.ts` (requested keys only, 2 KiB →
`null`, 13 fields / 9 filters / 257-char value → `validation_error`, scalar and
array filters with string/number/boolean tokens, date token equality, options
cap + `truncated`, equal-`sort_value` walk with nulls both directions, `ids` +
`fields`); `database-admin-list-budgets.test.ts` (ceiling 3, declared
typed-parent scan budget); `task551PaginatedConsumerGraphScreens.test.tsx` and
`custom-screen-task-540-list-flow.test.tsx` (columns, server filter/sort,
summary cards).

### R2-06 — Export jobs: INITIAL create/status, FINAL download (HIGH)

03-L02 gains a FINAL occurrence; spelling is unified to `/forms/:id/export-jobs`.
Supersedes C6 bullets 2 and 5 ("This leaf adds only `POST
/forms/:id/submissions/export-job` and `GET …/export-job/:jobId` …"; "the
download step and token handling stay on the legacy export until 08-L03
FINAL"); the body routes and client sentence `contract :496-521`; `contract
:500-502` ("The raw token is never persisted in the response twice, logged, or
stored client-side beyond the download handoff."); and Security Contract
`contract :1094-1099` ("Form export jobs remain internal `forms:read` … never
logged, cached, or re-issued."), replaced by the rows below. C6's `mapFormError`
rows (`submission_export_job_not_found` 404, `submission_export_create_failed`
500) stand.

- **INITIAL.** `POST /forms/:id/export-jobs` (strict body `{format?:
  "csv"|"json"}`) → `createSubmissionExportJob` (`submissionExportJob.ts:399`),
  returning exactly `{jobId,status:"queued",token,tokenExpiresAt}`; `GET
  /forms/:id/export-jobs/:jobId` → public status (`getSubmissionExportJob`
  `:442`; `null` or foreign `formId` → `submission_export_job_not_found`). Both
  install the no-store triple through the submission-detail fail-closed seam
  (C4 O11) first. `formsClient.createFormSubmissionsExportJob` strips `token`
  inside the method (returns `{jobId,status,tokenExpiresAt}`; the token never
  reaches callers, state, caches, storage, `cacheBus`, telemetry or logs);
  `getFormSubmissionsExportJob` polls with bounded backoff and stops on
  unmount; `FormSubmissionsPage` shows creation/status and keeps the legacy
  download (`formsRoutes.ts:708-717`, untouched). `forms.test.ts` stays
  execution-only.
- **FINAL** (after `TASK-551-08-L03:final`'s binary lane): `GET
  /forms/:id/export-jobs/:jobId/download?token=` (strict `{token}`,
  `^[A-Za-z0-9_-]{43}$`, 32 random bytes base64url, `:405`); parent scoping;
  not `done` → 409 `submission_export_job_not_ready`;
  `getSubmissionExportJobRecord` (`:454`) + `verifySubmissionExportToken`
  (`:166`, boolean, constant-time, TTL) false → 403
  `submission_export_token_invalid` (one code for mismatch and expiry);
  `readSubmissionExportArtifact` (`:191`) `submission_export_artifact_missing`
  → 404 same code; streamed by 08-L03's lane. FINAL also deletes the legacy
  route and its `buildFormSubmissionsExport` import (`formsRoutes.ts:19`,
  `:708-717`), edits `forms.test.ts` (`:136`, `:196-219`, `:221-331`, per the
  08-L03 C3 mirror), adds `formsClient.downloadFormSubmissionsExport`, removes
  `exportFormSubmissions`, and switches `FormSubmissionsPage` to create → poll
  → download with the token only in the component-local handoff. Ownership of
  `tests/integration/routes/forms.test.ts` moves 09-L01 → 03-L02 (09-L01 keeps
  executing it read-only).
- **Tests.** INITIAL: `task551BoundedAdminLists.test.ts` (token plus the three
  headers via `dispatchApiRequest`, CSRF, unknown key → `validation_error`, no
  `tokenHash`/`artifactKey`, foreign job → 404); `formsClient.test.ts` (no
  `token` key, cache/storage/cacheBus untouched); `form-submissions-page.test.tsx`
  (status UI, poll stops on unmount, legacy download). FINAL: `forms.test.ts`,
  `task551BoundedAdminLists.test.ts` (stream, 403/404/409, no echo), same Vitest.

### R2-12 — 03-L01 K5/K8 obligations (MEDIUM)

Owed per `TASK-551-03-L01-...md:769-801` (K5) and `:1137-1154` (K8 item 2):

- (a) Every `nullable:false` KeysetSpec field maps to a `.notNull()` Drizzle
  column and every derived alias (`sort_value`, `name_key`) is
  `nullable:true` — `task551BoundedAdminLists.test.ts` over the builders'
  exported spec factories.
- (b) Microsecond tie-group walk (5 marker rows in one millisecond plus
  neighbours, `limit 2`, forward via the service, backward via
  `buildKeysetPredicate(…, "before")`/`buildKeysetOrderBy(spec, "previous")`)
  after `set local time zone 'Europe/Warsaw'`; no gaps or duplicates — same file.
- (c) Keyset reads use only the Drizzle client of `core/db/client.ts`:
  `deps: { keys; db?: typeof db; tx?: Tx }` with `Tx` a transaction of that
  client; given `tx` the builder runs on it (caller owns isolation), else it
  opens the C4 `repeatable read, read only` transaction on `db`. Never a raw
  `postgres()` client or `core/db/sessionClient.ts`; a static import check
  sits in the same file.
- (d) Sanitized `EXPLAIN (ANALYZE, BUFFERS)` per family shows the K6 bound as
  an `Index Cond` for first-field-not-null specs; `sort_value`/`name_key`
  specs are exempt with a declared scan budget —
  `database-admin-list-budgets.test.ts`.
- (e) `ADMIN_LIST_SCOPE_VERSIONS` (R2-17) is bumped whenever a family's field
  order, type, direction or null policy changes; a pinned
  `sha256(canonicalJson(spec.fields))` per family fails otherwise —
  `task551BoundedAdminLists.test.ts`.
- (f) Supersedes C4's `pageListSpec` literal and `row.updatedAtWire` sketch:

```ts
const PAGE_LIST_FIELDS = [ // wrapped with normalizeKeysetSpec; DTO mapper after toBoundedPage
  { name: "updatedAt", type: "timestamp", column: "updated_at", order: "desc", nulls: "first", nullable: false },
  { name: "id", type: "uuid", column: "id", order: "desc", nulls: "first", nullable: false },
] as const satisfies readonly KeysetFieldSpec[];
export const pageListSpec = (scope: string) => normalizeKeysetSpec({ scope, fields: PAGE_LIST_FIELDS });
// select …, to_char(p.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as updated_at_wire …
const page = toBoundedPage({ rows, limit, direction: "next",
  encodeBoundary: (row) => encodeAdminBoundary(spec, deps.keys, [row.updatedAtWire, row.id]) });
return { ...page, items: page.items.map(toPageListItemDto) }; // the DTO drops updatedAtWire
```

The `to_char` bytes keep K8's trailing `"Z"` (`03-L01 :788`,
`keysetCursor.ts:105`); the dispositions' shorthand without it is not binding.

### R2-14 — `q` search binding (MEDIUM)

Supersedes the C3 matrix `q` column for the trigram families.

- pages, entries (global, typed, custom-screen), posts, media and users bind
  `<table>.search_trigram_text LIKE '%' || normalizeTask551TrigramSql(<qEsc>)
  || '%' ESCAPE '\'`: `<qEsc>` is the bound `q` (≤ 200 chars) with `\`, `%`,
  `_` backslash-escaped in TypeScript (normalization only changes case and
  whitespace, so escapes survive); the helper is imported from
  `core/db/searchVectorDefinitions.ts:100`, byte-identical to the stored
  expression and compatible with `<table>_search_trigram_idx` (`:108-140`).
  Users add `OR u.email_hash = $hash` when `q` is an email (C3).
- Sources = `TRIGRAM_SOURCE_SQL` (`:205-211`): pages `title, slug`; entries
  `title, data->>'title', slug, tags::text`; posts `title, slug, excerpt,
  data->>'title'`; media `title, alt, caption, key` (C3's `key, original_name,
  title` is superseded: `original_name` no longer matches, accepted delta;
  `key` is still never returned); users `name`.
- forms (`name, slug, description`) and booking resources/services (`name,
  slug`) keep a bounded `ILIKE '%' || $qEsc || '%' ESCAPE '\'` over those
  columns with a declared scan budget; submissions and reservations have no `q`.
- Tests: route suite (`%`, `_`, `\` literal; collapsed whitespace; predicate
  slot `search_trigram_text`); budgets suite (`q` ≥ 3 chars uses the index).

### R2-15 — Text keyset caps (MEDIUM)

Supersedes C3 "**Name keys (F-46).**" (`left(normalize(name, NFC), 128)`, "a
640-byte non-NFC legacy name") and the superseded D3 256-cap.

- Every text sort key is `NULLIF(left(normalize(regexp_replace(<src>,
  '[\x01-\x1F\x7F-\x9F]', '', 'g'), NFC), 120), '')`: controls are stripped
  BEFORE NFC so stripping cannot break composition; `\x7F-\x9F` joins the
  class because `isValidTextField` rejects DEL and C1 controls
  (`keysetCursor.ts:222`); `NULLIF` avoids its empty-string rejection
  (`:211`); 120 code points ≤ 480 bytes < `MAX_TEXT_FIELD_BYTES` 512 (`:26`).
  The field is `nullable:true`.
- Booking resources/services: `name_key` is that expression over `name`
  (`maxLength 160`, `bookingSchemas.ts:15,30,45,63`) as a derived-table alias
  with a declared scan budget; KeysetSpec `(nameKey text "name_key" asc last
  nullable:true, id asc last)`: `select r.* from (select <list columns>,
  <expr> as name_key from booking_resources where <q/type/status>) r where
  <keyset predicate on r.name_key, r.id> order by r.name_key asc nulls last,
  r.id asc nulls last limit $limitPlusOne` (services identical).
- `encodeAdminBoundary(spec, keys, values)` wraps `encodeKeysetCursor` and
  rethrows any failure as `Error("admin_list_cursor_encode_failed")` → 500
  (R2-03), never a client 400.
- Every family `cursor` param accepts up to `MAX_ENCODED_CURSOR_BYTES` 2,048
  chars (`keysetCursor.ts:20`); `adminCursorQueryParamSchema` (`maxLength:
  500`, `adminQuerySchemas.ts:6-10`) is not reused — a 120-code-point text
  boundary exceeds 500 encoded chars.
- Tests (`task551BoundedAdminLists.test.ts`): empty and control-only names
  (`NULL` key, last), embedded controls, escape-heavy (`"`/`\` ×120), 120 CJK
  and 120 emoji, a 160-char non-NFC legacy name — each pages cleanly in both
  booking families and as a custom-screen field sort; an injected encode
  failure → 500.

### R2-16 — Booking write limits stay 300/200 (MEDIUM)

Reverts `contract :394-398` ("their writes enforce an exact maximum of 100 rows
per parent and their reads issue `LIMIT 101` …") and the compatibility cells of
`contract :426-427` ("enforced 100-row parent cap; write rejects 101 …";
"replacement write and legacy read use the same ceiling"). Writes keep
`maxItems` 300 and 200 (`bookingSchemas.ts:79`, `:93`, unchanged); the new
admin parent reads use cap + 1 (`LIMIT 301` service resources, `LIMIT 201`
schedules) and fail `booking_collection_limit_exceeded` only above it. F-44
exempts only the facade read `listBookingServiceResources`
(`publicBookingApi.ts:16`). Tests: `task551BoundedAdminLists.test.ts` (300 and
200 round-trip; 301/201 writes → `validation_error`).

### R2-17 — Read-service budgets and scope owner (MEDIUM)

Budgets (supersede C7/C11 where they differ): `bookingReadService.ts` ≤ 950,
`customScreenEntryReadService.ts` ≤ 600, `entryReadService.ts` ≤ 800 (381 at
HEAD), new `core/services/database/adminListScope.ts` ≤ 200, which owns the
server `canonicalJson` and scope derivation (replacing C4's inline
`sha256(canonicalJson(filters))`):

```ts
// core/services/database/adminListScope.ts (pure; node:crypto only; no db import)
export const ADMIN_LIST_SCOPE_VERSIONS = Object.freeze({ pages: 1, "entries-all": 1, "entries-type": 1,
  "custom-screen-entries": 1, posts: 1, users: 1, forms: 1, "form-submissions": 1, media: 1,
  "booking-reservations": 1, "booking-resources": 1, "booking-services": 1, "booking-blackouts": 1 } as const);
export function canonicalJson(value: unknown): string; // sorted keys, arrays in order, undefined dropped;
// throws admin_list_scope_invalid on non-finite numbers, bigint, functions, cycles or depth > 8
export function deriveAdminListScope(family: keyof typeof ADMIN_LIST_SCOPE_VERSIONS,
  filters: Readonly<Record<string, unknown>>, parentId?: string): string {
  const digest = createHash("sha256").update(canonicalJson(filters), "utf8").digest("hex");
  const head = parentId ? `admin:${family}:${parentId}` : `admin:${family}`;
  return `${head}:v${ADMIN_LIST_SCOPE_VERSIONS[family]}:${digest}`; // ≤ 140 bytes < MAX_SCOPE_BYTES 512
}
```

Scopes are derived only after authorization and parent resolution (`contract
:402-404`). The client `canonicalJson` (C9) lives in
`core/admin/services/adminListEnvelope.ts`; nothing is imported across the
admin/server boundary and byte parity is not required. Tests:
`task551BoundedAdminLists.test.ts` (key-order independence, parent
partitioning, invalid inputs, the R2-12 (e) pin).

### R2-18 — Booking week endpoint (MEDIUM)

Supersedes C3 "**Booking week (O13, F-38).**" where it differs.

- `GET /booking/reservations/week` in `bookingRoutes.ts` (`booking:read`,
  `admin_read`), registered with the reservation routes (`:287-308`); a
  registration test pins that the literal `week` path hits this handler.
- Strict `bookingReservationsWeekQuerySchema` (`bookingSchemas.ts`): `{ from:
  date-time, to: date-time, resourceId?: uuid }`, `from`/`to` required,
  `additionalProperties: false`. The service rejects `to <= from` or a span over
  `BOOKING_WEEK_MAX_SPAN_HOURS = 196` with `booking_week_range_invalid` (400,
  new `mapBookingError` row). Writer refinement of "≤ 7 days": the calendar
  groups by each reservation's local date in its own timezone
  (`bookingHelpers.ts:231-245`), so the client requests `[weekStart − 14 h,
  weekStart + 7 d + 14 h)` (7 × 24 + 28 = 196 h).
- `listAdminBookingReservationsWeek` (`bookingReadService.ts`, statement
  `admin-booking-reservations-week`): the reservation list projection
  (`contract :423`), `starts_at >= $from and starts_at < $to [and resource_id =
  $resourceId] order by starts_at asc, id asc limit 501` → `{ items ≤ 500,
  truncated }`; one statement, no cursor or summary.
- `bookingClient.listReservationsWeek({ from, to, resourceId? })` caches family
  `bookingReservationsWeek` as `buildAdminListCacheKey(cacheKeys.bookingReservationsList,
  "week", filters, null)` — a sibling of `cachePolicy.ts:79`, because
  `cachePolicy.ts` is forbidden (`contract :1509`) and gains no key; the
  reservation mutations' existing list broadcast invalidates it and
  `clearBookingCache` (`bookingClient.ts:195`) clears it.
- The weekly calendar and resource legend read only this query; the paged
  table never feeds `groupReservationsByWeek` (supersedes the `reservations`
  input at `BookingPage.tsx:203-206`); `truncated` renders a visible overflow
  note.
- Tests: route suite (unknown key, missing `to`, 197 h → 400; 501 rows → 500 +
  `truncated`; order; `resourceId`); `bookingClient.test.ts` (key,
  invalidation); `booking-page-wave.test.tsx` (paging leaves the calendar DOM).

### R2-29 — Anchor refresh (LOW; in-place record)

Edited in place, marked "(re-anchored 2026-09-25)": C2 (K1 landed,
`keysetCursor.ts:193-199`, was "Until K1 lands … `:189-198`"); C4 (`:427`,
`:683`, `boundedReadContract.ts:257-306`, was `:419-423`, `:675-680`,
`:224-236`); C8 (`getEntryBySlug` `:179`, types `:202-265`, probes `:212`/`:227`,
revisions `:315`/`:350`, assistant callers `actionExecutorTypes.ts:66,153` and
DI uses).

### R2-30 — Query-count ceilings (LOW)

Every ceiling (C3 `ids` = 1, C4 ≤ 3, R2-05 ≤ 3, R2-18 = 1) counts only
statements starting `SELECT`/`WITH`/`INSERT`/`UPDATE`/`DELETE`; `BEGIN`, `SET
TRANSACTION`, `SET LOCAL`, `COMMIT`, `ROLLBACK`, `SAVEPOINT`, `RELEASE` are
excluded; advisory-lock and fence probes form a separate `lock` bucket asserted
by write-path tests. Counters live in the three owning suites.

### R2-31 — Session race settings row (LOW)

Refines C5 "**Session (O3).**": policy comes from `getSecuritySettings()`
(`securitySettings.ts:803`, key `security.settings` `:131`), no seam added.
Under the suite advisory lock the suite snapshots the exact row (or absence),
sets the race policy (`setSecuritySettings`, `:822`), runs both legs, restores
the snapshot byte-for-byte (deleting only a row it created) and calls
`resetSecuritySettingsCache()` (`:798`) in `afterAll`.

### R2-32 — Booking split map symbols (LOW)

Supersedes the C7 rows where they differ. `bookingReadService.ts` exports
every module-private helper of `bookingService.ts:105-330` (status sets,
`normalize*`, `slugify`, `assertTimezone`, date/zoned-time helpers,
`ensureResourceExists`/`ensureServiceExists`) for the schedule and mutation
modules only; the facade does not re-export them. Mutation symbols: `createBookingResource`, `updateBookingResource`,
`deleteBookingResource`, `createBookingService`, `updateBookingService`,
`deleteBookingService`, `setBookingServiceResources`, `createBookingBlackout`,
`deleteBookingBlackout`, `createBookingReservation`,
`updateBookingReservationStatus`; private `ensureBookingWindowAvailable`,
`ensureServiceResourceBinding`, `withReservationExclusion`; exported for tests
only `isBookingReservationExclusionViolation` (R2-02). The facade re-exports
every current type and exactly the 21 current functions (8 read, 11 mutation,
`setBookingSchedules`, `previewBookingSlots`).

### R2-33 — Author facet ordering (LOW)

Supersedes C3 "`label ASC, id ASC` for authors": order by
`coalesce(nullif(u.name, ''), u.email_hash) ASC, u.id ASC`, `LIMIT 51`; no
plaintext or decrypted email enters SQL ordering. The label is `name`, else the
email resolved after the query with `resolveEmailValue`
(`core/services/security/piiEmail.ts:118`) for the ≤ 50 returned rows. Test:
`task551BoundedAdminLists.test.ts` (nameless authors order by hash and show
their resolved email).

### R2-36 — C6 wording (LOW)

C6 "… the download step and token handling stay on the legacy export until
08-L03 FINAL (C17)" reads: "the client discards the create token and uses the
legacy export for download until 03-L02 FINAL (R2-06)".

### Security Contract rows (Round 2)

- `GET /booking/reservations/week`: internal, session, `booking:read`, no CSRF
  (read), `admin_read`, strict reject-unknown query, span ≤ 196 h, cap 500 +
  `truncated`, list projection only (no email, phone, notes, metadata).
- `POST /forms/:id/export-jobs` (INITIAL): internal, session, `forms:read`,
  shared CSRF, `admin_write`, strict UUID path and reject-unknown body; the
  token appears once in a no-store response, is discarded by the client and is
  never logged, cached, broadcast or re-issued.
- `GET /forms/:id/export-jobs/:jobId` (INITIAL): `forms:read`, `admin_read`,
  strict UUID params, parent-scoped (foreign id → 404, no existence signal),
  no-store, never returns `tokenHash`/`artifactKey`.
- `GET /forms/:id/export-jobs/:jobId/download` (FINAL): `forms:read`,
  `admin_read`, strict `{token}` (43 base64url), parent-scoped, `done`
  required, constant-time TTL-checked verification, one 403 code for mismatch
  and expiry, streamed through 08-L03's lane. Access logs store
  `url.pathname` only (`httpServer.ts:399`, `:428`), so the query token is not
  persisted there; routes and clients never log it.
- Admin-set writes: auth, RBAC, CSRF, buckets unchanged; R2-01 lock; fence
  failures 503. Comma lists: bounded, strict tokens, duplicates rejected, keys
  bound as SQL parameters (R2-04). Cursor errors: R2-03, nothing echoed.

### Envelope deltas owed to part 2

Part 1 edits no fence, ownership list or Validation Commands text. The part-2
writer applies exactly these deltas (reconciling counts, `minimum`s and the
≤ 128-token argv limit):

1. `allowlist` add: `core/services/database/adminListScope.ts` (R2-17);
   `core/services/customScreens/customScreenEntryReadService.ts` (R2-05);
   `core/services/admin/rolesService.ts`, `tests/unit/admin/rolesService.test.ts`
   and `core/server/routes/adminRolesRoutes.ts` (R2-01; `mapAdminRoleError`
   lives there, `:40`; no other TASK-551 leaf names these files).
2. Move `forbiddenPaths` → `allowlist`: `tests/unit/pages/pageService.test.ts`
   (R2-09; stays execution-only in `test551-db-unit`, no edit expected) and
   `tests/integration/routes/forms.test.ts` (R2-06; edited only by FINAL;
   execution-only in INITIAL's `bounded-admin-list-bun-tests`).
3. `forbiddenPaths` add (execution-only or read-only here; part 2 first checks
   that none is in another leaf's allowlist):
   `tests/integration/routes/adminUsers.test.ts`,
   `tests/integration/routes/adminRoles.test.ts`,
   `core/services/content/contentTypeSchemaFields.ts`,
   `core/db/searchVectorDefinitions.ts`, `core/db/nativeCmsWriterFence.ts`,
   `core/services/database/revisionAllocation.ts`,
   `tests/integration/runtime/retentionScheduler.test.ts`,
   `tests/perf/database-retention-jobs.test.ts`,
   `tests/vitest/database/revisionAllocation.test.ts`.
4. Commands: `test551-db-unit` += `tests/unit/admin/rolesService.test.ts`
   (argv, paths, `minimum` 2 → 3); `admin-write-regression-receipt` +=
   `tests/integration/routes/adminUsers.test.ts` and
   `tests/integration/routes/adminRoles.test.ts` (mapper rows changed;
   `minimum` 4 → 6); `database-explain-plans-receipt` `environmentProfile`
   `task551-phase-05-l02` → `none` (R2-07); `line-count-*` gain
   `adminListScope.ts`, `customScreenEntryReadService.ts`, `rolesService.ts`,
   `rolesService.test.ts`, `adminRolesRoutes.ts`, `pageService.test.ts` and
   `forms.test.ts` (full paths as above).
5. Occurrences (a lone `single` or an `initial`+`final` pair,
   `_docs/_workflows/lib/task-551-dispatch-contract.mjs:873-875`): rename
   `single` → `initial` (same `dependsOn`, command ids after item 4); add
   `final` with `dependsOn: ["TASK-551-08-L03:final"]`, plus
   `"TASK-551-09-L01:single"` only if the mirror writer confirms 09-L01 edits
   `forms.test.ts`, and `final-`-prefixed commands (08-L03 convention):
   `final-forms-export-bun-tests` (`forms.test.ts` +
   `task551BoundedAdminLists.test.ts`, `task551-db-test`, `minimum` 2),
   `final-forms-export-vitest` (`tests/vitest/admin/formsClient.test.ts`,
   `tests/vitest/ui/form-submissions-page.test.tsx`, `none`),
   `final-core-lint-types`, `final-core-lint`, `final-diff-check`,
   `final-line-count` (`formsRoutes.ts`, `formSchemas.ts`, `formsClient.ts`,
   `FormSubmissionsPage.tsx` and those four suites); part 2 checks whether one
   command id may serve both occurrences.
6. Outside this file (mirror and part-2 owners): the TASK-551 parent graph
   renames `TASK-551-03-L02:single` → `:initial`, adds `:final`, points 07-L02
   `dependsOn` at `TASK-551-03-L02:initial` and adds "03-L02 FINAL" to the land
   order; 08-L03 (already, Round-2 amendment) and 09-L01 cite 03-L02 FINAL as
   the single owner; C17 drops 08-L03 FINAL and 09-L01 as owners of the
   download and legacy removal and adds R2-01's `last_admin` semantics change
   to the 10-L02 documentation handoff.

## Dated Contract Corrections — 2026-09-25 (Round 2, part 2: C9–C17, envelope)

Source: `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round2-dispositions.md`
(HEAD `9c5b6666`, dirty mirrors). Applies R2-07..R2-11, R2-13, R2-19..R2-28,
R2-34 and R2-35, the six "Envelope deltas owed to part 2" of part 1, and the
orchestrator's part-2 prose items. **This section wins** over the body, the
Round-1 C9–C17, the Round-1 record and part 1 where they differ. `contract
:NNN` cites current line numbers of this file (anchors re-read 2026-09-25).

**Resume record.** An interrupted part-2 writer rewrote the envelope fence
before stopping. Its pre-edit snapshot differs from the edited file only
inside the fence, so every other byte was Round-1 plus part 1. This writer
re-verified each envelope delta against the live tree and the dispatch parser
and changed no fence byte. The fence differences are enumerated in "Envelope
change record" below.

**In-place edits by this part** (all others are supersessions quoted below):

1. Exact File Ownership (R2-25 "body :185-193 and :171-173 edited to match").
   `contract :170-175` before: "The implementer MUST rerun the exact pinned
   `rg -l` command above immediately before implementation and add every newly
   affected list-call-site file to this allowlist before changing the
   corresponding client contract." After: the implementer reruns the pinned
   C12 discovery (three legs) before W0 and before closure. A new hit blocks
   until the orchestrator amends the envelope. `contract :186-199` before: "new
   `core/admin/ui/booking/BookingOverviewPanel.tsx` owns only the current
   stat/quick-action/weekly-calendar presentation; `BookingPage.tsx` retains
   fetch/cache/mutation/dialog orchestration." After: the C11 panel scope (no
   quick actions), with `useBookingCollections.ts`,
   `useMediaFolderOperations.ts` and `useUsersRolesCollections.ts` named as
   owners.
2. Validation Commands (`contract :1111-1160`), rewritten to mirror the
   envelope. The superseded Round-1 lines are quoted under R2-07, R2-08 and
   R2-09 below.

### R2-23 / R2-22 / R2-24 — C9 Admin client template v2 (MEDIUM)

Supersedes these parts of C9 (`contract :2448-2529`):

- the template code block, including its comment "may still resolve to the
  initiating caller";
- "**Caption (F-39).** Post-editor media selection fetches the selected
  asset's detail before copying `caption` … list items carry no caption";
- "**Signatures (F-10).** `getCachedPosts(filters?)` returns
  `PostListEnvelope | null` for the first page of those filters and
  `listPostsCached(filters?, options?)` resolves `PostListEnvelope`".

The part-1 R2-17 note stands: the client `canonicalJson` lives in
`adminListEnvelope.ts`.

**Template.** The template adds three things. Before creating a request it
dedupes against the in-flight promise for the same key. It keeps a per-key
generation `Map` next to the family generation. The default-filter first page
persists in the existing `createMemoryBackedLocalCache` slot as a versioned
envelope.

```ts
// core/admin/services/adminListEnvelope.ts (additions)
export type PersistedFirstPage<I, F> = Readonly<{ v: 1; filters: F; items: readonly I[];
  nextCursor: string | null; hasMore: boolean }>;
export function isPersistedFirstPage(value: unknown): value is PersistedFirstPage<unknown, unknown>;
//   strict own-key check {v,filters,items,nextCursor,hasMore}, v === 1, items an array;
//   a legacy raw array or any other shape => false => cache miss (never coerced)
export function readPersistedFirstPage<I, F>(store: { read(): PersistedFirstPage<I, F> | null },
  filters: F): AdminListEnvelope<I> | null; // canonicalJson(stored.filters) === canonicalJson(filters)
export const emptyAdminListEnvelope = <I>(): AdminListEnvelope<I> =>
  ({ items: [], nextCursor: null, hasMore: false });

// core/admin/services/pagesClient.ts (representative for all eight clients)
export const DEFAULT_PAGE_LIST_FILTERS: PageListFilters = Object.freeze({});
let pagesGeneration = 1;                          // family generation, advanced by reset
const pageGenerations = new Map<string, number>(); // per-key generation
const pageCache = new Map<string, CachedAdminListPage<PageListItem>>();
const pagePromises = new Map<string, Promise<PageListEnvelope>>();
const pagesFirstPage = createMemoryBackedLocalCache({ key: cacheKeys.pagesList,
  ttlMs: cacheTtlMs.list, validate: isPersistedFirstPage }); // existing key, versioned value
registerAdminModuleCacheReset(() => { pageCache.clear(); pagePromises.clear();
  pageGenerations.clear(); pagesFirstPage.clear(); pagesGeneration += 1; });

export function listPagesPageCached(filters: PageListFilters = DEFAULT_PAGE_LIST_FILTERS,
  cursor: string | null = null, options: { force?: boolean } = {}): Promise<PageListEnvelope> {
  const key = buildAdminListCacheKey(cacheKeys.pagesList, "page", filters, cursor);
  const isDefaultFirst = cursor === null && canonicalJson(filters) === canonicalJson(DEFAULT_PAGE_LIST_FILTERS);
  if (!options.force) {
    const hit = readVerifiedAdminListPage(pageCache, key, filters)
      ?? (isDefaultFirst ? readPersistedFirstPage(pagesFirstPage, filters) : null);
    if (hit) return Promise.resolve(hit);
    const inFlight = pagePromises.get(key);        // in-flight dedupe
    if (inFlight) return inFlight;
  }
  const token = captureAdminCacheInstallationToken(); // before any await
  const generation = pagesGeneration;
  const keyGeneration = (pageGenerations.get(key) ?? 0) + 1;
  pageGenerations.set(key, keyGeneration);
  const request = listPagesPage(filters, cursor).then((envelope) => {
    const current = isCurrentAdminCacheInstallationToken(token) && generation === pagesGeneration
      && pageGenerations.get(key) === keyGeneration;
    if (!current) // stale: never the discarded rows
      return readVerifiedAdminListPage(pageCache, key, filters) ?? emptyAdminListEnvelope<PageListItem>();
    pageCache.set(key, { canonicalFilters: canonicalJson(filters), envelope });
    if (isDefaultFirst) pagesFirstPage.write({ v: 1, filters, items: envelope.items,
      nextCursor: envelope.nextCursor, hasMore: envelope.hasMore });
    return envelope;
  }).finally(() => { if (pagePromises.get(key) === request) pagePromises.delete(key); });
  pagePromises.set(key, request);
  return request;
}
```

Binding rules:

- **Stale discard.** A completion whose installation token, family generation
  or key generation is no longer current installs nothing. It resolves the
  verified cached envelope for the same key when one exists, otherwise the
  empty envelope. This is the TASK-554 D2-extension reading of R2-23.
- **Persistence.** Only the default-filter first page persists, under the
  existing family list key, as `{ v: 1, filters, items, nextCursor, hasMore }`
  with `filters` equal to the client's exported default constant. Other
  filters and cursors stay in memory only. This is a writer refinement: one
  slot per family key can hold one filter set, and pinning it to the default
  makes hydration deterministic and matches the TASK-554 fixtures. `v` and
  `filters` never reach the returned envelope.
- **Default filters.** Each client exports exactly one frozen default constant
  per list family: `DEFAULT_PAGE_LIST_FILTERS`,
  `DEFAULT_DETAIL_PAGE_LIST_FILTERS`, `DEFAULT_ENTRY_LIST_FILTERS`,
  `DEFAULT_POST_LIST_FILTERS`, `DEFAULT_ADMIN_USER_LIST_FILTERS`,
  `DEFAULT_FORM_LIST_FILTERS`, `DEFAULT_MEDIA_LIST_FILTERS`, and in
  `bookingClient` `DEFAULT_BOOKING_{RESERVATION,RESOURCE,SERVICE,BLACKOUT}_LIST_FILTERS`.
  The view's initial state and `adminPrefetch.ts` both import the constant
  (S2-B L2). `serializeAdminListQuery` returns `""` for it, so the first-page
  request is the bare list URL.
- **Posts** (`postsClient.ts:133-139`, `:247-275`, `:308`, `:363-389`
  today):

```ts
const postsListCache = createMemoryBackedLocalCache({ key: cacheKeys.postsList,
  ttlMs: cacheTtlMs.list, validate: isPersistedFirstPage }); // legacy PostSummary[] => miss
export const getCachedPosts = (filters: PostListFilters = DEFAULT_POST_LIST_FILTERS):
  PostListEnvelope | null => isDefaultPostFilters(filters)
    ? readPersistedFirstPage(postsListCache, filters)
    : readVerifiedAdminListPage(postPageCache, postFirstPageKey(filters), filters);
const upsertCachedPost = (post: PostListItem | PostDetail) => {
  if (postDetailTombstones.has(post.id)) return false;
  invalidatedPostListRows.delete(post.id);
  const stored = postsListCache.read();                    // default-filter slot only
  const base = stored ?? { v: 1, filters: DEFAULT_POST_LIST_FILTERS, items: [],
    nextCursor: null, hasMore: false };                    // synthesized on detail upsert
  const row = toPostListItem(post);                        // narrowing, no data/seo (F-33)
  const index = base.items.findIndex((item) => item.id === row.id);
  const items = index === -1 ? [row, ...base.items]
    : base.items.map((item, i) => (i === index ? { ...item, ...row } : item));
  postsListCache.write({ ...base, items });
  patchMemoryPages(row);                                   // replace only; never inserts into filtered pages
  /* detail cache, tombstones and recordPostListRowPublication unchanged */
  return true;
};
// removeCachedPost: filters `items` of the stored slot and of every memory page; detail path unchanged.
export async function listPostsCached(filters: PostListFilters = DEFAULT_POST_LIST_FILTERS,
  options?: { force?: boolean }): Promise<PostListEnvelope> {
  const listKey = canonicalJson(filters);
  if (!options?.force) {
    const cached = getCachedPosts(filters); if (cached) return cached;
    const pending = cachedPostsPromises.get(listKey); if (pending) return pending; // was cachedPostsPromise
  }
  const ticket = { cacheAuthorityEpoch: postsCacheAuthorityEpoch, listPublicationEpoch: postListPublicationEpoch };
  inFlightPostListReads.add(ticket);
  const request = (async () => {
    try {
      const envelope = await listPostsPage(filters, null);
      if (ticket.cacheAuthorityEpoch !== postsCacheAuthorityEpoch)
        return getCachedPosts(filters) ?? emptyAdminListEnvelope<PostListItem>();
      const items = reconcilePostListRead(envelope.items, ticket.listPublicationEpoch);
      primePostsFirstPage(filters, { ...envelope, items }); // slot if default, memory otherwise
      return { ...envelope, items };
    } finally { /* ticket/prune/promise cleanup as today, keyed by listKey */ }
  })();
  if (!options?.force) cachedPostsPromises.set(listKey, request);
  return request;
}
```

  `clearPostsCache` also clears `cachedPostsPromises` and the memory pages.
  TASK-554 ordering, race and cache-event assertions stay 1:1 under the D2
  extension (`TASK-554_...md:1562-1640`), including its precondition that
  detail upsert creates or patches the default-filter envelope.
- **Caption (R2-22).** `caption` joins the `admin-media-by-ids` projection;
  it stays out of the media page projection. Picker selection resolves the
  chosen id through `mediaClient` by-ids (one statement) before copying
  `caption` (`PostEditorCanvas.tsx:1270`). The renderer fallbacks read
  `selectedMedia?.caption` from by-ids rows: image `:904-907`,
  video/audio `:1010-1013`, gallery `:993`. Tests in
  `tests/vitest/ui/post-editor-media-controls.test.tsx`: video, audio and
  gallery fallbacks render the by-ids caption, an authored caption wins, and a
  list item without caption never leaks `undefined`.
- **`ids` consumers (R2-24).** Three more consumers join C3's list:
  `MenuDesignEditor.tsx:167`, `:185`, `SiteSettingsPage.tsx:258` and
  `ThemeEditorPage.tsx:98`, `:127`. Each today calls
  `listPagesCached({ force: true })` for labels. Each now resolves referenced
  page ids through `pagesClient` by-ids, chunked by 100 with bounded
  parallelism 2 (at most two requests in flight, chunks in request order,
  results merged by id). Pickers use the bounded list plus `q`. Owning tests:
  `menu-design-editor.test.tsx` siblings, `site-settings.test.tsx`,
  `settings-general-site-restyle.test.tsx` and
  `task551PaginatedConsumerGraphEditors.test.tsx`, which tests 250 ids as 3
  chunks with no more than 2 in flight. `relatedEntryResolver.ts:75`,
  `:96-108`: `displayField` is projected through `fields` only when it is a
  top-level key matching `ADMIN_LIST_FIELD_KEY_PATTERN` (R2-04). A nested
  path falls back to the entry `title`. Test:
  `tests/vitest/customScreens/relatedEntryResolver.test.ts`.
- **Reset checklist addendum (R2-34).** `entriesClientPagination.ts` registers
  its own reset for its page, summary, facet and by-ids maps, promises and
  generations. `entriesClient.ts` `:147-158` still owns the detail and
  all-slugs maps. `tests/vitest/admin/entriesClientPagination.test.ts` proves
  both resets.
- **Owning tests.** `task551PaginatedClients.test.ts` covers dedupe,
  per-key-generation discard, legacy-array miss, the default-filter bare URL
  and the persisted-slot shape. `postsClient.test.ts` and
  `postsClientCacheAuthority.test.ts` carry the mechanical D2 edits only.

### R2-09 / R2-21 — C10 revision adoption v2 (MEDIUM)

Supersedes the C10 bullet "**06-L02 suites (F-24).**" from "`tests/unit/pages/pageService.test.ts:197-200`, `:272-275` need the same
edit, but that file is in TASK-551-09-L02's allowlist … **blocked on a WU-D
ownership decision** … Its DB legs are red at HEAD once executed on
`DATABASE_URL3`" (`contract :2561-2569`) to the end of that bullet. Also
supersedes the C10 "**Host contract.**" words "`PageEditorRevision =
PageRevisionSummary` (no `data`)" (`contract :2542-2543`).

- **Ownership.** `tests/unit/pages/pageService.test.ts` belongs to this leaf
  (09-L02's transfer stands; the envelope moved it from `forbiddenPaths` to
  `allowlist`). It already asserts the envelope (`revisions.items.length` at
  `:197` and `:273`), so no edit is expected. It runs execution-only in
  `test551-db-unit` and is counted by `line-count-3`. It is not blocked, and
  no "red at HEAD" claim stands.
- **W0 edit.** W0 owns `tests/unit/pages/pageRevisionAutosave.test.ts:136`
  (`expect(revisions).toHaveLength(1)`) and `:149`
  (`expect(afterDiscard).toHaveLength(0)`). Each becomes `.items` length plus
  `hasMore: false` and `nextCursor: null` pins.
- **Structural host type (R2-21).** `PageEditorRevision` stays a structural
  type in `core/admin/ui/pages/editor/pageEditorHostContract.ts` (`:86-96`
  today), with no import from any client:

```ts
export type PageEditorRevision = { id: string; pageId: string; version: number;
  kind: PageEditorRevisionKind; title?: string | null; slug?: string | null;
  createdAt: string; createdBy: PageEditorResourceAuthor | null }; // `data` removed
export type PageEditorRevisionPage = Readonly<{ items: readonly PageEditorRevision[];
  nextCursor: string | null; hasMore: boolean }>;
export type PageEditorHostRevisions = { list: (id: string, cursor?: string | null) =>
  Promise<PageEditorRevisionPage>; /* restore/discard unchanged */ };
// core/admin/services/pagesClient.ts: `import type { PageEditorRevision } from
// "../ui/pages/editor/pageEditorHostContract"`; `PageRevision` (:84) becomes an alias of it,
// and listPageRevisions(id, cursor?) resolves PageEditorRevisionPage.
```

  Owning test: `tests/vitest/pages/page-editor-host-contract.test.ts`. It
  pins a type-level `data`-free shape and asserts that the contract module
  imports no `services/*` module. It runs in `w0-revision-vitest`.
- **Handoff.** The `createdBy.email` handoff landed as 06-L02 R6
  (`TASK-551-06-L02-...md:438-760`). Its code sits in the working tree and
  belongs to 06-L02; this leaf consumes it read-only.

### R2-25 — C11 split budgets and ranges v2 (MEDIUM)

Supersedes these C11 rows (`contract :2587-2613`) where they differ:

| Module | Budget and ranges (supersede) |
|---|---|
| `media/MediaLibraryPage.tsx` (1,421) | ≤ 900 (was ≤ 700); ranges unchanged |
| `booking/BookingPage.tsx` (1,138) | ≤ 950 (was ≤ 800); panel as amended in place (no quick actions) |
| `pages/editor/usePageEditorController.ts` (996) | ≤ 990 (was ≤ 900) under the no-growth rule: every W0–W3 edit keeps it at or below its HEAD 996, and it closes at ≤ 990 after `:122-126`, `:257-261` move to `usePageEditorRevisions.ts` |
| `posts/editor/PostEditorCanvas.tsx` (1,526; ≤ 500) | new `posts/editor/postEditorCanvasHelpers.ts` (≤ 200) owns `:77-199` (block-type sets, string/attr coercers, typography and placeholder helpers). Import direction is `PostEditorCanvas.tsx`, `PostCanvasBlockItem.tsx` and `PostEditorMediaControls.tsx` → helpers, never the reverse. Media-controls picker state narrows from `:1205-1378` to `:1204-1209`, `:1212-1277`, `:1308-1378`; `:1210-1211` (typography memo) and `:1278-1307` (focus effects) stay in the canvas |
| `menus/MenuEditorPage.tsx` (1,081; ≤ 800) | `MenuEditorWorkspace.tsx` (≤ 450) receives `:57-222` (add-items rail and menu-tree helpers) and `:853-1081` (the `AdminShell` workspace render) |
| `users/UsersRolesPage.tsx` (1,026; ≤ 750) | `useUsersRolesCollections.ts` (≤ 350) receives `:165-261` (resource loading/apply) and `:262-348` (filter and count derivations over the envelopes); `UsersRolesContent.tsx` keeps the `:844-940` region |
| `ui/menu-design-editor.test.tsx` (2,711) | the shared helpers `:694-758`, `:1195-1200`, `:1528-1561`, `:1882-1895`, `:2231-2237`, `:2458-2466` move into `menuDesignEditorTestHarness.tsx` (they are used across siblings), and the sibling ranges shrink by exactly those lines |

Every extraction test still proves the pre-split render/action contract.
Arithmetic check (HEAD counts, before glue imports): media 1,421 − 617 moved
lines leaves ≈ 804; menu editor 1,081 − 395 ≈ 686; users 1,026 − 184 − 97 ≈
745. The budgets hold with a margin for imports. `postEditorCanvasHelpers.ts`
joins the allowlist and `line-count-3`.

### R2-19 — C12 third discovery leg (MEDIUM)

Supersedes C12 "Every hit is in the envelope `allowlist` … a new hit blocks
until the envelope is amended" (`contract :2654-2658`) where it concerns
coverage. It also supersedes C12 "(06-L02 handoff; `pageService.test.ts` see
C10)" (`contract :2667`). That now reads "(owned; W0 edit at `:136`, `:149`);
`pageService.test.ts` owned, execution-only (R2-09)".

- **Leg 3** runs over `tests/**/*.{ts,tsx}`. A file is a hit when it imports
  any allowlisted `core/**`/`scripts/**` `.ts(x)` module (relative stem, or
  the `@/` alias for `core/admin/**`), or when it contains a literal
  list-endpoint URL. The URL pattern is `/admin/api/(pages|detail-pages|content-entries|posts|admin-users|forms|media|booking/(blackouts|reservations|resources|services))`
  followed by a quote or `?`, a `/<id>/(revisions|submissions)` suffix, or
  `/admin/api/content/<type>/entries`. The script:

```ts
// run from the repo root: bun --env-file=/dev/null leg3.ts <envelope.json>
const envelope = JSON.parse(readFileSync(process.argv[2], "utf8"));
const stems = envelope.allowlist.filter((p: string) => /^(core|scripts)\/.*\.tsx?$/.test(p))
  .flatMap((p: string) => { const s = p.replace(/\.tsx?$/, "");
    return s.startsWith("core/admin/") ? [s, "@/" + s.slice(11)] : [s]; });
const importRe = new RegExp(`(${stems.map(escapeRegExp).join("|")})(\\.tsx?)?["'\`]`);
const hits = [...new Bun.Glob("tests/**/*.{ts,tsx}").scanSync(".")]
  .filter((f) => { const t = readFileSync(f, "utf8"); return importRe.test(t) || LIST_URL_RE.test(t); })
  .sort();
```

- **Pinned result** (live tree, 2026-09-25, current envelope): 265 hits.
  These are 246 test files and 19 support modules. Of the tests, 123 are
  allowlisted. The other 123 are execution-only: `owned-module-consumers-vitest-1`
  (30), `-vitest-2` (29), `-bun` (40), `w0-revision-vitest` (8),
  `admin-write-regression-receipt` (6), `task554-regression-*` (6),
  `bounded-admin-list-bun-tests` (`bookingRoutes.test.ts`), the two prefetch
  receipts, and the excluded `tests/unit/toolchain/bunLaneManifest.test.ts`. Of the 19 support modules,
  13 are allowlisted. The other six are read-only foreign or neighbour
  fixtures: `tests/perf/fixtures/task551AdminReadStatementShapes.ts` (01-L02),
  `tests/perf/fixtures/task551QueryInventory.ts` (01-L01),
  `tests/vitest/ui-integration/custom-screen-entry-editor-restyle.fixtures.ts`,
  `tests/vitest/ui-integration/support/entryEditorHarness.tsx`,
  `tests/vitest/ui-integration/support/entryEditorLaneFixture.tsx` and
  `tests/vitest/ui/postEditorStateFixtures.tsx`. Legs 1–2 (C12's command)
  still give 110 hits, all allowlisted. A count change blocks until the
  orchestrator re-pins it.
- **Exclusion.** `tests/unit/toolchain/bunLaneManifest.test.ts` is excluded
  from execution. It is red at HEAD (DB-free run: golden 475 vs manifest 454
  rows), and its manifest `tests/bun-lane-manifest.json` belongs to 01-L01
  (C17). It imports no owned module; it matched only through a
  `scripts/runtime-smoke/registry.ts` string literal.
- **Suites whose assertions change** join the allowlist and
  `admin-pagination-vitest-2`:
  - `tests/vitest/ui/site-settings.test.tsx` (SiteSettingsPage page labels
    via `ids`);
  - `tests/vitest/ui-integration/settings-general-site-restyle.test.tsx`
    (same view);
  - `tests/vitest/ui/custom-screen-list-view.test.ts` (server sort/filter
    replaces `compareEntryValues`, R2-05);
  - `tests/vitest/ui/page-editor-settings-flow.test.tsx` (HistorySheet
    envelope);
  - `tests/vitest/ui/menu-item-form.test.tsx`. Verified: `MenuItemForm.tsx:97-99`
    is a C3 `ids` consumer, so its off-page-label test lives here.
- **Consumer commands.** `owned-module-consumers-vitest-1`/`-2` (none) and
  `owned-module-consumers-bun` (`task551-db-test`) run the non-allowlisted,
  non-otherwise-executed test hits unchanged. The Bun command is a writer
  addition beyond R2-19's two Vitest ids. Leg 3 also hits Bun route, runtime
  and security suites (for example `pages.test.ts`, `detailPages.test.ts`,
  `media.test.ts`, `contentEntriesRoutes.test.ts`). They import owned route
  modules. Spot checks found only registration strings or `.items` list
  assertions, so they run unchanged. Some are foreign-owned (09-L01:
  `entry-visibility-gate`, `entry-access-password-hash`, `formsWriteMounts`,
  `publicFormsApi`; 09-L02: both `seo-pipeline` suites and
  `entryServiceFacadeFence`; 06-L01: `accessLogService`). Running them adds
  no write authority. If one breaks, the implementer stops and reports; they
  never edit it.
- **W0 harness consumers.** Importers of `pageEditorFlowTestUtils`,
  `pageEditorV2FlowHarness` and `pageEditorV2Fixtures` (transitively through
  `pageEditorFlowHarness.tsx` and `pageEditorV2Helpers.tsx`) number 31 test
  files by grep, not the dispositions' "16". All 31 are in
  `w0-revision-vitest`; 15 of them are not otherwise allowlisted and stay
  execution-only.

### R2-08 / R2-13 — C13 DB-lane law v2 (MEDIUM)

Supersedes:

- C13 "**Execution rule.** Every `task551-db-test` command runs with
  `DATABASE_URL` and the owner map resolved to `DATABASE_URL3` …"
  (`contract :2711-2715`);
- the Round-1 Validation Commands definition "`<db-env>` is the
  `task551-db-test` injection: `DATABASE_URL="$DATABASE_URL3"` plus the owner
  map … from the fixture-target bootstrap (C13)" (replaced in place);
- C13's option "or one snapshot read before and after" (`contract :2705`);
- C13 "100k-row profiles are seeded only by the L02 fixture runner … and are
  read-only for this leaf" (`contract :2707-2710`).

- **Closed child environment (R2-08).** Every `task551-db-test` command in
  either occurrence runs in exactly `env -i PATH=<PATH> HOME=<HOME>
  DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_URL=<URL3>
  TASK551_FIXTURE_DATABASE_NAME=coderso02
  TASK551_FIXTURE_DATABASE_SENTINEL=<bootstrap sentinel>
  PAGINATION_CURSOR_SECRET=<from .env>`, with `DB_MAINTENANCE_URL`,
  `DB_MAINTENANCE_MODE` and `DATABASE_DIRECT_URL` unset. The orchestrator
  runs it as an execution of the parent's `task551-db-test` profile, not as a
  redefinition. The envelope argv stays literal `bun --env-file=/dev/null test …`.
  Scope: `bounded-admin-list-bun-tests`, `submission-export-job-receipt`,
  `test551-db-unit`, `admin-write-regression-receipt`,
  `owned-module-consumers-bun`, `task554-regression-bun`,
  `admin-list-performance-test` and `final-forms-export-bun-tests`.
  Pre-dispatch check: the URL3 migration ledger equals the HEAD journal
  (80 entries, 0081 applied, `bookings_active_resource_window_excl` present).
  This was satisfied on 2026-09-25 per the dispositions record.
- **Global counts.** A collection-global count is asserted only as a delta
  inside a section that holds the suite advisory lock, or inside one
  transaction. The bare before/after read is gone. The R2-01 admin baseline
  follows the same rule.
- **Perf data source (R2-13).** `tests/perf/database-admin-list-budgets.test.ts`
  seeds and cleans its own marker-scoped closure on URL3:
  - at most 20,000 rows per family, bulk-inserted in bounded batches;
  - children deleted before parents, by marker only;
  - a zero-residue proof (one bounded `SELECT` per family returns 0 marker
    rows) in `afterAll`.
  It covers every page, summary and facet statement, the nine new statements
  (six `*-by-ids`, two custom-screen, booking week), and one `q` plan per
  trigram family. No read-only 100k profile is used. The L02 fixture runner's
  profiles stay untouched by this leaf.

```ts
// tests/perf/database-admin-list-budgets.test.ts (shape)
const RUN = randomUUID(); const MARKER = `t551-03l02-perf-${RUN.slice(0, 8)}`;
beforeAll(async () => { await withSuiteLock(async () => {
  for (const family of ADMIN_LIST_FAMILIES) await seedFamily(family, MARKER, { rows: family.perfRows }); // ≤ 20_000
}); });
test.each(ADMIN_LIST_DESCRIPTORS)("%s stays within its declared budget", async (descriptor) => {
  const { statements, plan } = await measure(descriptor, MARKER); // R2-30 counting, sanitized EXPLAIN (ANALYZE, BUFFERS)
  expect(statements).toBeLessThanOrEqual(descriptor.statementCeiling);
  expect(plan.rowsRead).toBeLessThanOrEqual(descriptor.budget.rowsRead);
  if (descriptor.indexBound) expect(plan.indexCond).toContain(descriptor.indexBound); // R2-12 (d)
});
afterAll(async () => { await withSuiteLock(() => deleteMarkerClosureChildFirst(MARKER));
  expect(await countMarkerResidue(MARKER)).toBe(0); });
```

### R2-07 / R2-20 / R2-26 / R2-28 / R2-35 — C14 validation law v2 (MEDIUM)

Supersedes these C14 table rows (`contract :2733-2742`):

- "`test551-db-unit` | … `pageService.test.ts` (execution-only, C10 blocker)";
- "`admin-pagination-vitest-1`, `-2` | … (124 + 25 paths)";
- "`database-explain-plans-receipt` | bun-test / `task551-phase-05-l02` | …";
- "`core-lint-types`, `core-lint` | …";
- "`line-count-1..3` | … the 299 surviving allowlist paths".

It also supersedes the C14 bullet "Wave gates (WU-F) …" (`contract :2755-2759`)
and C1 O2-revised "L05 plan receipts are regenerated on `DATABASE_URL3` under
the fixture runner" (`contract :2101-2102`). That now reads: "this leaf
regenerates no L05 plan; `database-explain-plans.test.ts` runs as a DB-free
registry receipt".

| Command id | Lane / profile | Scope (Round 2) |
|---|---|---|
| `test551-db-unit` | bun-test / `task551-db-test` | `pageRevisionAutosave.test.ts` (W0 edit), `pageService.test.ts` (owned, no edit), `rolesService.test.ts` (R2-01), `minimum` 3 |
| `admin-write-regression-receipt` | bun-test / `task551-db-test` | the four Round-1 suites plus `adminUsers.test.ts` and `adminRoles.test.ts` (mapper rows changed by R2-01; execution-only), `minimum` 6 |
| `w0-revision-vitest` | vitest / `none` | the 5 C12 revision suites, `page-editor-host-contract.test.ts`, `pagesClient.test.ts`, `detail-template-editor.test.tsx`, the three revision split siblings (`page-editor-shell-revisions-wave`, `page-editor-v2-authoring-revisions-flow`, `page-editor-v2-persistence-revisions-flow`) and the 31 harness consumers (incl. `page-editor-settings-flow.test.tsx`); 42 paths |
| `admin-pagination-vitest-1`, `-2` | vitest / `none` | every allowlisted Vitest suite (124 + 30 paths) |
| `owned-module-consumers-vitest-1`, `-2`, `-bun` | vitest / `none`; bun-test / `task551-db-test` | leg-3 execution-only hits (30 + 29 + 40) |
| `admin-prefetch-budget-receipt`, `admin-prefetch-policy-receipt` | bun-test / `none`; vitest / `none` | R2-28 W2 receipts, execution-only |
| `database-explain-plans-receipt` | bun-test / `none` | DB-free L05 37/38/76 registry receipt (R2-07) |
| `core-lint-types`, `core-lint`, `repo-lint-types` | tooling / `none` | slow gates, orchestrator-run between waves; `repo-lint-types` = `./node_modules/.bin/tsc -p tsconfig.json --noEmit` (root `tsconfig.json` covers `scripts/**`, which core lint misses; R2-26) |
| `diff-check-untracked` | tooling / `none` | `git ls-files -z --others …`, split on `\0`, trailing-whitespace class `[ \t\r]` (R2-35) |
| `line-count-1..3` | tooling / `none` | the 318 surviving allowlist paths (319 minus the deleted `bookingPageFixtures.tsx`) |
| `final-*` (FINAL) | see R2-06 and the change record | forms export download |

Wave → command table (R2-20). The fast gates on touched files always run as
well. The orchestrator runs `core-lint-types`, `core-lint` and
`repo-lint-types` after every wave. Line counts run only at W3, W4 and
closure.

| Wave | Command ids |
|---|---|
| W0 revision chain | `w0-revision-vitest`, `test551-db-unit` |
| W1 services/routes/races | `bounded-admin-list-bun-tests`, `route-response-header-receipt`, `pagination-cursor-lifecycle-receipt`, `submission-export-job-receipt`, `test551-db-unit`, `admin-write-regression-receipt`, `owned-module-consumers-bun`, `task554-regression-bun`, `admin-list-performance-test`, `database-explain-plans-receipt` |
| W2 clients/prefetch | `admin-prefetch-budget-receipt`, `admin-prefetch-policy-receipt`, `task554-regression-vitest`, plus the `tests/vitest/admin/*` members of `admin-pagination-vitest-1/-2` by path; the full UI commands wait for W3 |
| W3 UI/splits | `admin-pagination-vitest-1`, `admin-pagination-vitest-2`, `owned-module-consumers-vitest-1`, `owned-module-consumers-vitest-2`, `w0-revision-vitest`, `line-count-1..3`; orchestrator `line-gate.sh <pre-family baseline>` |
| W4 tests/smoke | `runtime-smoke-registry-tests`, `admin-list-playwright-smoke`, `diff-check`, `diff-check-untracked`, `line-count-1..3` |
| INITIAL closure | all 28 INITIAL ids in envelope order, once |
| FINAL | the 11 FINAL ids in envelope order |

Prose-only orchestrator gates (R2-35): `git diff --check <pre-family
baseline>` and `bash .claude/scripts/line-gate.sh <pre-family baseline>`
after W3 and before closure. `<pre-family baseline>` is the verified TASK-551
pre-family commit that the orchestrator records. The root `_TMP-S1-spina.md`
(and every `_TMP-*`) is never staged or committed.

### R2-27 — C15 runtime smoke v2 (MEDIUM)

Supersedes C15 "registered as suite `task-551-admin-lists` (profile `fast`)"
(`contract :2768`) and the C15 seeding clause "with a
`task551-03l02-<run>` seed prefix and set-based cleanup of only prefixed
rows".

- **Profiles.** `SUPPORTED_PROFILES["task-551-admin-lists"] = ["fast",
  "certification"]` (`scripts/runtime-smoke/cli.ts:13-28`). Both run the same
  eight scenarios and assertions; `fast` may only shorten controlled waits
  (cookbook §1). 03-L02 runs `fast` (`wf55103l02`). 10-L01 runs
  `certification` (`wf551l01admin`) and never edits the registry.
- **Worker layout** (cookbook §2, §7-§8), all allowlisted under
  `scripts/runtime-smoke/adapters/task-551-admin-lists/`:
  - `worker-entry.ts`: `runWorkerEntry` over the typed registry;
  - `worker-operations.ts`: descriptors plus strict input/output validators
    (a writer addition to R2-27's three names; the cookbook layout requires
    it);
  - `production-handlers.ts`: the bounded seed/read handlers;
  - `cleanup.ts`: ledger-driven cleanup batches.
  Test: `tests/unit/runtime-smoke/task-551-admin-lists-worker.test.ts`
  (allowlisted; in `runtime-smoke-registry-tests`).
- **DB-free import.** The adapter, `contracts.ts`, `fixtures.ts`,
  `browser-plan.ts`, `suite.ts`, `worker-operations.ts` and `cleanup.ts`
  (plan building only) import no `core/db/**` at module load.
  `production-handlers.ts` is loaded only by dynamic `import()` inside the
  worker handlers. The adapter test asserts the static import closure.
- **Seed and cleanup.** One database-bearing profile (`DB_POOL_MAX: "1"`) on
  the shared `DATABASE_URL`.
  - Every created row is appended to a `RunFixtureLedger` with
    `digestExactOwnedRowIdentity(runId, id)`, and parent/child waves keep
    `child.wave < parent.wave`.
  - Cleanup is `buildCleanupBatchPlan` → one set-based transactional
    `DELETE … RETURNING` per profile/wave batch (≤ 128 resources) → one
    bounded post-commit absence proof.
  - Rows are identified by exact ledger ownership, never by prefix sweep.
    The `task551-03l02-<run>` prefix stays a human marker only.
  - `equal-sort-boundary` timestamps are written at DB level in the seed
    handler (one `UPDATE … SET updated_at = $ts` per marker set), never
    through the UI or the clock.
- **Registry land order.** `contracts.ts`, `registry.ts` and `cli.ts` are
  also touched by TASK-555-07-L02, TASK-556-04-L02 and TASK-548 smoke work.
  Each lands additively. Whoever lands later rebases onto the landed entries
  and never reorders or drops them. `cli-registry.test.ts` pins the union.

### R2-13 / R2-06 — C16 acceptance rewording v2 (MEDIUM)

- `contract :1177-1184` reads: "Every Admin list request is at most 3
  counted statements (R2-30) and each of the 41 Admin descriptors equals its
  row in `tests/perf/fixtures/task551AdminListDescriptors.ts`, with this leaf's
  own budget measured on its marker-scoped seeded closure in
  `database-admin-list-budgets.test.ts` (C13 v2); L05 stays an execution-only
  37/38/76 registry receipt. Response size stays within its fixture budget;
  fixed summaries …". The rest of the bullet is unchanged. This supersedes
  "Every representative 100k-row list request … checked-in reviewed L02
  budget/receipt … plus the L05 sanitized-plan receipt".
- `contract :1192-1193` reads: "Fifty-way booking creates yield exactly one
  active row (exclusion constraint, R2-02); concurrent admin-set changes never
  leave zero active full-access admins relative to the non-marker baseline
  (R2-01); session races per C5/R2-31; zero partial commits."
- `contract :1215-1218` reads: "After 03-L02 FINAL the legacy synchronous
  export route and `exportFormSubmissions` have zero callers and the
  create/status/download job flow is the only export path. In INITIAL the
  legacy download remains and the create token is discarded (R2-06, R2-36).
  TASK-571's export-job tests rerun unchanged, and no export-job
  service/scheduler file is edited."
- Envelope preamble (`contract :1222-1225`) reads: "`bookingRoutes.test.ts`
  (09-L01) and the TASK-571 receipt suite are execution-only; `forms.test.ts`
  is owned here and edited only by FINAL." This supersedes "The two 09-L01
  dispatcher tests and the L08/TASK-571 receipt suites below are
  execution-only: they remain foreign write targets …".

### R2-10 / R2-11 / R2-34 — C17 handoffs v2 (MEDIUM)

Supersedes C17 in full (`contract :2814-2839`). Statuses were verified in
the working tree on 2026-09-25.

- **TASK-551-08-L03 (landed).** Its Round-2 amendment (`TASK-551-08-L03-...md:662-700`)
  names 03-L02 FINAL as the single owner of the token download, the legacy
  route and client removal, the `forms.test.ts` edits and the UI switch.
  08-L03 FINAL supplies only the binary response lane. Round-1 C17's
  "TASK-551-08-L03 FINAL … the removal of the legacy …" is void.
- **TASK-551-09-L01 (landed).** 09-L01 released
  `tests/integration/routes/forms.test.ts` and does not edit it
  (`TASK-551-09-L01-...md:940-985`); it cites 03-L02 FINAL. No
  `TASK-551-09-L01:single` edge is needed, so FINAL depends only on
  `TASK-551-08-L03:final`. `bookingRoutes.test.ts` stays 09-L01-owned and
  execution-only here.
- **TASK-551 parent graph (landed).** Nodes `TASK-551-03-L02:initial` and
  `:final` exist, with `07-L02` depending on `:initial` and the land-order
  entry "03-L02 FINAL". The family preflight passes.
- **TASK-551-09-L02 (landed).** The `pageService.test.ts` transfer stands.
- **TASK-551-06-L02 (landed as R6).** The `createdBy.email` handoff.
- **TASK-554 (landed).** The D2 handoff and its 2026-09-25 D2 extension:
  mechanical array→envelope adaptation, plus the upsert precondition that C9
  v2 satisfies.
- **TASK-551-01-L01 FINAL (landed).** It owns the `formsService.listForms`
  inventory disposition in a closed enum with no `deprecated-unused` value
  (`TASK-551-01-L01-...md:1780-1860`). This leaf asserts only "zero Admin
  route/client callers; assistant callers preserved" (C16). 01-L01 also owns
  `tests/bun-lane-manifest.json`. That manifest is stale at HEAD (475 vs
  454), and this leaf's new Bun suites widen the gap, so the rebaseline is
  01-L01's, not ours.
- **TASK-551-10-L01, TASK-551-10 and TASK-551-10-L02 (landed).** The
  mirrors carry eight scenarios, session `wf551l01admin` and `--profile
  certification`. 10-L01 owns `gates:coderso`, the security scan
  (`strict-security-scan`, `bun run scan:security:strict`) and the
  performance gate (`coderso-performance-gate`: `bun --env-file=/dev/null
  scripts/coderso-release-gates.ts --gate performance`, profile
  `task551-db-redis-test`).
- **TASK-551-10-L02 documentation (owed, not landed).** The Round-1 list
  stands and gains the following:
  - R2-01's `last_admin` semantics change: only `status = 'active'` users
    holding a full-access role count, and a disabled admin no longer
    prevents demoting the last active one;
  - the fence 503 rows;
  - the comma-list query parameters (R2-04);
  - the export-job INITIAL/FINAL routes;
  - `GET /booking/reservations/week`.
  The `PAGINATION_CURSOR_SECRET` `.env.example` entry remains owed.
- **TASK-551-09-L04 FINAL (owed, not landed).** Its authority-matrix
  manifest must list `core/admin/services/entriesClientPagination.ts` as a
  reset-registering module beside `entriesClient.ts` (C9 v2 reset addendum).
  Until 09-L04 records it, this leaf's receipt names the module explicitly.
- **Query inventory (01-L01).** The call-site delta for rebaselining is:
  - admin list builders move to the `*ReadService` modules;
  - `customScreenEntryReadService.ts` gains two statements;
  - `bookingReadService.ts` gains the week statement;
  - the six `*-by-ids` statements are added;
  - `listForms` has zero Admin callers;
  - `bookingService.ts` becomes a facade.

### Exact File Ownership additions (Round 2)

These paths join the single-writer set; the envelope `allowlist` is
authoritative. None is allowlisted by another TASK-551 leaf; the family
preflight's `allowlist_cross_owner` check passes.

- Production and tooling (R2-01, R2-05, R2-17, R2-25, R2-27, R2-06):
  `core/services/database/adminListScope.ts`,
  `core/services/customScreens/customScreenEntryReadService.ts`,
  `core/services/admin/rolesService.ts`, `core/server/routes/adminRolesRoutes.ts`,
  `core/admin/ui/posts/editor/postEditorCanvasHelpers.ts`, the four
  `scripts/runtime-smoke/adapters/task-551-admin-lists/{worker-entry,worker-operations,production-handlers,cleanup}.ts`,
  and `scripts/runtime-smoke/adapters/task-490/browser-actions.ts`. FINAL
  only: its export check waits on the legacy `…/submissions/export` response
  (`:306`), and FINAL switches it to create → poll → download.
- Tests: `tests/unit/admin/rolesService.test.ts`,
  `tests/unit/pages/pageService.test.ts` (owned, no edit expected),
  `tests/integration/routes/forms.test.ts` (edited only by FINAL),
  `tests/unit/runtime-smoke/task-551-admin-lists-worker.test.ts` and the five
  R2-19 suites.
- New `forbiddenPaths` (read-only or execution-only here; the parser rejects
  only a self-collision, `task-551-dispatch-contract.mjs:750-751`, so
  foreign-owned paths may be forbidden): `adminUsers.test.ts` and
  `adminRoles.test.ts` (execution-only), `contentTypeSchemaFields.ts`
  (R2-04 parity source), `searchVectorDefinitions.ts` (R2-14 helper),
  `nativeCmsWriterFence.ts`, `revisionAllocation.ts` and the three
  lock-inventory suites (R2-01 collision pin sources).

### Envelope change record (Round-1 envelope → current fence)

Source of "Round-1": the fence as it stood after the Round-1 record and
part 1, which the interrupted writer snapshotted before editing and this
writer diffed. Every item below was already on disk when this writer
resumed, and this writer verified each one. Unchanged byte-for-byte:
`schema`, `taskId`, `parent`, the order of the 300 Round-1 allowlist
entries, and the 14 commands `bounded-admin-list-bun-tests`,
`route-response-header-receipt`, `pagination-cursor-lifecycle-receipt`,
`submission-export-job-receipt`, `admin-pagination-vitest-1`,
`task554-regression-vitest`, `task554-regression-bun`,
`admin-list-performance-test`, `core-lint-types`, `core-lint`, `diff-check`,
`line-count-1`, `line-count-2` and `admin-list-playwright-smoke`.

1. `allowlist` 300 → 319. Appended in this order:
   `core/services/database/adminListScope.ts`,
   `core/services/customScreens/customScreenEntryReadService.ts`,
   `core/services/admin/rolesService.ts`,
   `core/server/routes/adminRolesRoutes.ts`,
   `tests/unit/admin/rolesService.test.ts`,
   `tests/unit/pages/pageService.test.ts`,
   `tests/integration/routes/forms.test.ts`,
   `core/admin/ui/posts/editor/postEditorCanvasHelpers.ts`,
   `scripts/runtime-smoke/adapters/task-551-admin-lists/worker-entry.ts`,
   `scripts/runtime-smoke/adapters/task-551-admin-lists/worker-operations.ts`,
   `scripts/runtime-smoke/adapters/task-551-admin-lists/production-handlers.ts`,
   `scripts/runtime-smoke/adapters/task-551-admin-lists/cleanup.ts`,
   `tests/unit/runtime-smoke/task-551-admin-lists-worker.test.ts`,
   `tests/vitest/ui/site-settings.test.tsx`,
   `tests/vitest/ui-integration/settings-general-site-restyle.test.tsx`,
   `tests/vitest/ui/custom-screen-list-view.test.ts`,
   `tests/vitest/ui/page-editor-settings-flow.test.tsx`,
   `tests/vitest/ui/menu-item-form.test.tsx`,
   `scripts/runtime-smoke/adapters/task-490/browser-actions.ts`. Nothing was
   removed.
2. `forbiddenPaths` 40 → 47. Removed (moved to the allowlist):
   `tests/unit/pages/pageService.test.ts`,
   `tests/integration/routes/forms.test.ts`. Appended:
   `tests/integration/routes/adminUsers.test.ts`,
   `tests/integration/routes/adminRoles.test.ts`,
   `core/services/content/contentTypeSchemaFields.ts`,
   `core/db/searchVectorDefinitions.ts`, `core/db/nativeCmsWriterFence.ts`,
   `core/services/database/revisionAllocation.ts`,
   `tests/integration/runtime/retentionScheduler.test.ts`,
   `tests/perf/database-retention-jobs.test.ts`,
   `tests/vitest/database/revisionAllocation.test.ts`. The remaining 38 keep
   their order.
3. `dependencies` `["TASK-551-09-L04:initial"]` →
   `["TASK-551-09-L04:initial", "TASK-551-08-L03:final"]`. This is exactly
   the union of the graph nodes' `dependsOn`, as
   `task-551-dispatch-contract.mjs:977-987` requires.
4. `commands` 21 → 32. Modified (argv appended at the end, prefix
   unchanged):
   - `test551-db-unit` += `tests/unit/admin/rolesService.test.ts`, `minimum`
     2 → 3;
   - `admin-write-regression-receipt` += `tests/integration/routes/adminUsers.test.ts`,
     `tests/integration/routes/adminRoles.test.ts`, `minimum` 4 → 6;
   - `admin-pagination-vitest-2` += the five R2-19 suites, `minimum` 25 → 30;
   - `runtime-smoke-registry-tests` += `tests/unit/runtime-smoke/task-551-admin-lists-worker.test.ts`,
     `minimum` 3 → 4;
   - `line-count-3` += the 19 new allowlist paths (argv 49 → 68);
   - `database-explain-plans-receipt` `environmentProfile`
     `task551-phase-05-l02` → `none`;
   - `diff-check-untracked` program: `"ls-files", "--others"` →
     `"ls-files", "-z", "--others"`, `split("\n")` → `split("\0")` on the
     listing, and `/[ \t]+$/` → `/[ \t\r]+$/`.

   Added (INITIAL):
   - `w0-revision-vitest` (vitest/none, 42 paths);
   - `owned-module-consumers-vitest-1` (vitest/none, 30);
   - `owned-module-consumers-vitest-2` (vitest/none, 29);
   - `owned-module-consumers-bun` (bun-test/`task551-db-test`, 40);
   - `admin-prefetch-budget-receipt` (bun-test/none, 1);
   - `admin-prefetch-policy-receipt` (vitest/none, 1);
   - `repo-lint-types` (tooling/none, `./node_modules/.bin/tsc -p tsconfig.json --noEmit`).

   Added (FINAL):
   - `final-forms-export-bun-tests` (bun-test/`task551-db-test`:
     `forms.test.ts`, `task551BoundedAdminLists.test.ts`, `minimum` 2);
   - `final-forms-export-vitest` (vitest/none: `formsClient.test.ts`,
     `form-submissions-page.test.tsx`,
     `forms-submissions-restyle.test.tsx`, `minimum` 3);
   - `final-line-count` (tooling/none, the nine FINAL paths);
   - `final-forms-export-smoke` (runtime-smoke/none,
     `bun scripts/runtime-smoke.ts run --suite task-490 --profile fast --session wf55103l02final`).

   Nothing was removed. The order is the INITIAL command ids, then the four
   FINAL-only ids.
5. `occurrences`: `[{ id: "single", dependsOn: ["TASK-551-09-L04:initial"],
   commandIds: <21> }]` → `initial` (same `dependsOn`, 28 ids: the 21 plus
   the seven added INITIAL ids) and `final` (`dependsOn:
   ["TASK-551-08-L03:final"]`, 11 ids: the four `final-*` ids plus
   `route-response-header-receipt`, `submission-export-job-receipt`,
   `core-lint-types`, `core-lint`, `repo-lint-types`, `diff-check`,
   `diff-check-untracked`). Part 1 item 5 proposed
   `final-core-lint-types`/`final-core-lint`/`final-diff-check`. They are
   replaced by shared ids, because the parser allows one command id in both
   occurrences (`task-551-dispatch-contract.mjs:776-785` checks only that each
   referenced id exists and each command is referenced).

Parser receipts: every argv has at most 128 tokens (largest are
`admin-pagination-vitest-1`, `line-count-1` and `line-count-2` at 128).
There are no shell metacharacters outside the `-e` program. Every non-`none`
command starts `bun --env-file=/dev/null`. Every `positiveDiscovery.minimum`
equals its path count. The `line-count-*` union equals the allowlist minus
`tests/vitest/ui/bookingPageFixtures.tsx`, and every allowlisted test is in
some command. `grep -c` of JSON fences is 1, and the family preflight at
`9c5b6666` passes.

## Dated Contract Corrections — 2026-09-25 (Round 3, part A: services)

Source: `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round3-dispositions.md`
(orchestrator decisions over the Round-2 auditors, HEAD `9c5b6666`, dirty
mirrors). This part applies R3-28 and R3-01..R3-03 (HIGH), then R3-04..R3-14.
Part B (a later writer) applies R3-15..R3-27, R3-29..R3-37 and the envelope.
**This section wins** over the body, FAZA-0 C1–C17, the Round-1 record and both
Round-2 parts where they differ. `contract :NNN` cites current lines of this
file; source anchors were re-read on 2026-09-25. There are no in-place edits:
every change is a quoted supersession. The JSON envelope fence is untouched,
and its owed deltas close this section.

**Anchor rule (R3-14).** Where an earlier line number has drifted, the quoted
text and named symbol are authoritative; each item lists the anchors it re-read.

### R3-28 — Admin-set lock shape: `acquireAdminSetLock(tx)` (HIGH)

Supersedes R2-01's helper in full (`contract :2984-2990`: "export async
function withAdminSetLock<T>(run: (tx: Tx) => Promise<T>): Promise<T> { return
db.transaction(async (tx) => { await acquireNativeCmsWriterFence(tx); await
tx.execute(sql…pg_advisory_xact_lock…); return run(tx); }, { isolationLevel:
"read committed" }); }"). It also supersedes the `// updateRoleWithTransition =
withAdminSetLock(…)` comment (`contract :2998-3000`), `setUserRoles`'s
"`return withAdminSetLock(async (tx) => {`" (`contract :3005`) and
`contract :3015` ("// disableUser, deleteUser and updateUser (status leaves
'active') use the same guard, then write on tx."). Reason: a transaction-owning
wrapper breaks landed pins in the execution-only
`tests/unit/kits/nativeCmsWriterFenceInventory.test.ts`:

- `:347` lists `deleteUser` as a fence owner; the loop at `:405-425` requires
  exactly one lexical `transaction(` in it, whose callback starts `=> { await
  acquireNativeCmsWriterFence(tx);` (`:416-418`) with one fence call;
  `:797-801` pins `.for("update")` and exactly one `db.` in `deleteUser`.
- The DML inventory `:188-189` pins one `update|users` site each for
  `disableUser` and `updateUser` plus `deleteUser|delete|users`
  (`managed-shared`); `:228-251` compares the multiset exactly.

Binding shape:

- `rolesService.ts` exports `ADMIN_SET_LOCK_NAMESPACE = 551_031`,
  `ADMIN_SET_LOCK_KEY = 1` and the tx-scoped `acquireAdminSetLock(tx)`, which
  opens no transaction. `withAdminSetLock` is withdrawn.
- Every locked writer owns its OWN `db.transaction(async (tx) => { await
  acquireNativeCmsWriterFence(tx); await acquireAdminSetLock(tx); … }, {
  isolationLevel: "read committed" })`. The locked writers are `setUserRoles`,
  `disableUser`, `updateUser` and `deleteUser` (`usersService.ts:242`, `:281`,
  `:186`, `:302`), plus `updateRoleWithTransition` and `deleteRole`
  (`rolesService.ts:193-195`, `:202-213`).
- `deleteUser` keeps its single `db.transaction(` (`:303`) and its fence-first
  callback. Apart from that call, the body uses only `tx.`.
- Each `usersService` function keeps exactly one `update(users)` site.
  `updateUser` writes once, inside its locked transaction, with no separate
  unlocked branch; it takes the lock unconditionally (one site, one shape) and
  runs the `last_admin` check only when `status` leaves `active`. `disableUser`
  turns `db.update(users)` (`:285-290`) into one `tx.update(users)`.
  `createUser`/`enableUser` are unchanged.
- `updateRoleWithTransitionInClient` (`rolesService.ts:137`, role `FOR UPDATE`
  `:142`) stays a private tx-helper. The route injection at
  `adminRolesRoutes.ts:35,72` is unchanged.

```ts
// core/services/admin/rolesService.ts
export const ADMIN_SET_LOCK_NAMESPACE = 551_031; // int4; never renumber
export const ADMIN_SET_LOCK_KEY = 1;
type AdminSetTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
/** Exclusive admin-set lock; the caller owns the transaction and took the fence first. */
export async function acquireAdminSetLock(tx: AdminSetTx): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(${ADMIN_SET_LOCK_NAMESPACE}::int4, ${ADMIN_SET_LOCK_KEY}::int4)`);
}
export async function updateRoleWithTransition(id: string, input: RoleUpdateInput) {
  return db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    await acquireAdminSetLock(tx);
    return updateRoleWithTransitionInClient(tx, id, input);
    // inside: wasAdmin && !nextAdmin && countActiveAdminUsers(tx, { roleId: id }) === 0 -> "last_admin"
  }, { isolationLevel: "read committed" });
}
// deleteRole: same prologue; role FOR UPDATE on tx; full-access guard via countActiveAdminUsers; tx.delete.

// core/services/admin/usersService.ts
export async function updateUser(id: string, input: UserUpdateInput) {
  const update = normalizeUserUpdate(input); // name/email validation unchanged; no I/O
  return db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    await acquireAdminSetLock(tx);
    const [existing] = await tx.select().from(users).where(eq(users.id, id)).for("update");
    if (!existing) return null;
    if (update.email) await assertEmailFree(tx, update.emailHash, update.email, id); // user_exists
    const leavesActive = existing.status === "active" && input.status !== undefined && input.status !== "active";
    if (leavesActive && (await isActiveAdmin(tx, id))
      && (await countActiveAdminUsers(tx, { userId: id })) === 0) throw new Error("last_admin");
    const [row] = await tx.update(users).set(update.values).where(eq(users.id, id)).returning(); // the ONE site
    return row ? toUserSummary(row, await listRoleIdsForUsers([row.id], tx)) : null;
  }, { isolationLevel: "read committed" });
}
// deleteUser: fence stays statement 1 (:416-418 pin), acquireAdminSetLock(tx) statement 2, then target
//   FOR UPDATE, isActiveAdmin && countActiveAdminUsers(tx, { userId }) === 0 -> "last_admin", tx.delete.
// setUserRoles / disableUser: same prologue; target FOR UPDATE; guard; writes on tx only.
```

Test: `rolesService.test.ts` adds a static check. `acquireAdminSetLock`
contains no `transaction(` call. Each of the six writers holds exactly one
`transaction(` whose callback starts with the fence call followed by
`acquireAdminSetLock(tx)`. `nativeCmsWriterFenceInventory.test.ts` reruns
unchanged and green in `owned-module-consumers-bun`, and its `:188-189`
inventory stays byte-identical.

### R3-01 — KeysetSpec field names are lower snake_case (HIGH)

`normalizeKeysetSpec` rejects names outside `FIELD_NAME_PATTERN =
/^[a-z][a-z0-9_]{0,63}$/` (`keysetCursor.ts:101`, checked `:165`) with
`pagination_cursor_config_invalid`. Superseded camelCase literals:

- C4 `contract :2278`: `{ name: "updatedAt", type: "timestamp", column: "updated_at",`;
- R2-12(f) `contract :3346`: `{ name: "updatedAt", type: "timestamp", column: "updated_at", order: "desc", nulls: "first", nullable: false },`;
- R2-05 `contract :3205-3206`: "KeysetSpec `(sortValue text "sort_value" nullable:true, id)`";
- R2-15 `contract :3396-3397`: "KeysetSpec `(nameKey text "name_key" asc last nullable:true, id asc last)`".

Binding names: `updated_at`, `created_at`, `starts_at`, `published_at`,
`sort_value`, `name_key`, `id`; they travel on the wire (`keysetCursor.ts:441-452`);
row properties such as `updatedAtWire` are not spec names. `asc` pairs with
`nulls: "last"` and `desc` with `"first"`, satisfying K1 (`:193-199`).

| Exported factory (owner) | Variant ids | First field (name type nullable); then `id uuid` same dir |
|---|---|---|
| `pageListSpec` (`pageReadService.ts`) | `pages` | `updated_at timestamp false`, desc |
| `entryListSpec` (`entryReadService.ts`) | `entries` (global, typed) | as pages |
| `postListSpec` (`postReadService.ts`) | `posts` | as pages |
| `formListSpec` (`formReadService.ts`) | `forms` | as pages |
| `userListSpec` (`userReadService.ts`) | `users` | `created_at timestamp false`, desc |
| `submissionListSpec` (`submissionReadService.ts`) | `form-submissions` | as users |
| `mediaListSpec` (`mediaReadService.ts`) | `media` | as users |
| `bookingReservationListSpec` (`bookingReadService.ts`) | `booking-reservations` | `starts_at timestamp false`, desc |
| `bookingNameKeySpec` (`bookingReadService.ts`) | `booking-name-key` | `name_key text true`, asc |
| `customScreenListSpec(scope, sort)` (`customScreenEntryReadService.ts`) | `cs-text-asc`, `cs-text-desc` | `sort_value text true` (field and system `title`/`slug`/`status` sorts) |
| same | `cs-created_at-{asc,desc}`, `cs-updated_at-{asc,desc}` | `<column> timestamp false` |
| same | `cs-published_at-{asc,desc}` | `published_at timestamp true` (R2-05 `to_char … US"Z"` wire) |

```ts
// core/services/pages/pageReadService.ts (template for every fixed family)
const PAGE_LIST_FIELDS = [
  { name: "updated_at", type: "timestamp", column: "updated_at", order: "desc", nulls: "first", nullable: false },
  { name: "id", type: "uuid", column: "id", order: "desc", nulls: "first", nullable: false },
] as const satisfies readonly KeysetFieldSpec[];
export const pageListSpec = (scope: string): KeysetSpec => normalizeKeysetSpec({ scope, fields: PAGE_LIST_FIELDS });

// core/services/customScreens/customScreenEntryReadService.ts
export type CustomScreenSort = Readonly<{ kind: "text" | "created_at" | "updated_at" | "published_at"; dir: "asc" | "desc" }>;
export function customScreenListSpec(scope: string, sort: CustomScreenSort): KeysetSpec {
  const nulls = sort.dir === "asc" ? "last" : "first";
  const first = sort.kind === "text"
    ? { name: "sort_value", type: "text", column: "d.sort_value", nullable: true }
    : { name: sort.kind, type: "timestamp", column: `d.${sort.kind}`, nullable: sort.kind === "published_at" };
  return normalizeKeysetSpec({ scope, fields: [{ ...first, order: sort.dir, nulls },
    { name: "id", type: "uuid", column: "d.id", order: sort.dir, nulls, nullable: false }] });
}
```

The conformance test is DB-free and lives in
`tests/integration/routes/task551BoundedAdminLists.test.ts`: "every exported
admin-list spec factory passes `normalizeKeysetSpec`".

A closed `ADMIN_LIST_SPEC_VARIANTS` table holds 17 rows (9 fixed + 8
custom-screen variants). Each factory, called with scope `admin:test:v1:0`,
must not throw, must use names matching `/^[a-z][a-z0-9_]{0,63}$/` and a final
`id` per K1, and must match the row's pinned `sha256(canonicalJson(spec.fields))`.

R2-12(e) ("a pinned `sha256(canonicalJson(spec.fields))` per family",
`contract :3338-3341`) now reads "per spec variant of this table". The pins
are computed once at implementation over the corrected literals and then
committed. Any pin computed over camelCase names is void. A changed pin
requires an `ADMIN_LIST_SCOPE_VERSIONS` bump, and the test asserts the pairing.
R2-12(a) (`.notNull()` parity) iterates the same table.

### R3-02 — Text sort keys cap at 85 code points (HIGH)

Supersedes R2-15 `contract :3387-3392` ("Every text sort key is
`NULLIF(left(normalize(regexp_replace(<src>, '[\x01-\x1F\x7F-\x9F]', '',
'g'), NFC), 120), '')` … 120 code points ≤ 480 bytes < `MAX_TEXT_FIELD_BYTES`
512 (`:26`)"), its tests `contract :3408-3410` ("escape-heavy (`"`/`\` ×120),
120 CJK and 120 emoji") and `contract :3405-3407` ("a 120-code-point text
boundary exceeds 500 encoded chars").

Binding expression for `sort_value` (field sorts and the system
`title`/`slug`/`status` sorts) and `name_key` (booking resources/services):

```sql
NULLIF(left(normalize(regexp_replace(<src>, '[\x01-\x1F\x7F-\x9F]', '', 'g'), NFC), 85), '')
```

Byte proof against the landed `isValidTextField` (`keysetCursor.ts:210-235`).
`keysetCursor.ts` stays forbidden, with no 03-L01 re-open:

```text
:211      value.length (UTF-16 units) must be 1..512
:222      rejects U+0000..U+001F and U+007F..U+009F           -> stripped by regexp_replace
:224-233  per UTF-16 unit: <0x80 -> 1; <0x800 -> 2 (its surrogate sub-branch is dead:
          surrogates are >= 0xD800); <0x10000 -> 3, so each surrogate unit counts 3
astral code point = 2 units x 3 = 6 counted bytes (worst); BMP >= U+0800 = 3; ASCII = 1
85 code points   <= 85 x 6 = 510 <= 512 (:234), and <= 170 units <= 512 (:211)
86 astral points =  516 > 512 -> rejected, so 85 is the largest safe cap
empty after strip -> NULL via NULLIF (the :211 empty rejection never fires)
```

`left(…, 85)` counts code points, and `normalize()` works, only under a UTF8
`server_encoding` (R3-14 precondition). The worst cursor payload (85 astral
points at 4 real UTF-8 bytes, 140-byte scope, uuid, 10-digit key/time fields)
is ≤ 724 bytes < `MAX_CURSOR_PAYLOAD_BYTES` 1,024 (`keysetCursor.ts:21`); the
token stays < 1,020 chars ≤ 2,048 (`:20`), so R3-06's cursor schema stands.

Tests (`task551BoundedAdminLists.test.ts`, both booking families and a
custom-screen field sort): 85 emoji page cleanly; a 120-emoji source truncates
to 85 and still pages; 85 CJK; escape-heavy `"`/`\` ×85; empty and
control-only names (`NULL`, last); embedded controls; a 160-char non-NFC legacy
name; an injected encode failure → 500 `admin_list_cursor_encode_failed`.

### R3-03 — Booking exclusion races: bounded 40P01 retry (HIGH)

Supersedes the R2-02 sketch `contract :3074-3079` ("try { return await
write(); } catch (error) { if (isBookingReservationExclusionViolation(error))
throw new Error("booking_slot_unavailable"); throw error; }"), the comment
"walk error -> cause at most 8 levels" (`:3071`), and in `:3091-3094` "a
global blackout over an active reservation succeeds …" plus "the predicate is
true at cause depth 0 and 3, false for another constraint, for `23505`, and at
depth 9". R2-18's "501 rows → 500 + `truncated`" (`:3487-3488`) is re-scoped.

Concurrent exclusion checks can deadlock (`40P01`). Both guarded writes are
single autocommit statements: the INSERT at `bookingService.ts:1005-1022` and
the UPDATE at `:1034-1038`. A retry therefore replays no partial transaction.

```ts
// core/services/booking/bookingMutationService.ts
const MAX_BOOKING_ERROR_CANDIDATES = 9;   // depth 0..8 inclusive; own-data `cause` only, `seen` guard
const RESERVATION_WRITE_MAX_ATTEMPTS = 2; // one retry, 40P01 only
// bookingErrorCandidates(error): the mediaFoldersService.ts:38-56 walk with the cap above
export const isBookingReservationExclusionViolation = (error: unknown): boolean =>
  bookingErrorCandidates(error).some((c) => readOwnDataValue(c, "code")?.value === "23P01"
    && readOwnDataValue(c, "constraint_name")?.value === BOOKING_RESERVATION_EXCLUSION_SQL.name);
export const isBookingReservationDeadlock = (error: unknown): boolean => // tests only
  bookingErrorCandidates(error).some((c) => readOwnDataValue(c, "code")?.value === "40P01");
export async function withReservationExclusion<T>(write: () => Promise<T>): Promise<T> { // tests only
  for (let attempt = 1; ; attempt += 1) {
    try { return await write(); } catch (error) {
      if (isBookingReservationExclusionViolation(error)) throw new Error("booking_slot_unavailable");
      if (attempt < RESERVATION_WRITE_MAX_ATTEMPTS && isBookingReservationDeadlock(error)) continue;
      throw error; // exhausted 40P01 or any other error: unmapped -> generic 500
    }
  }
}
```

On retry, the write sees the committed winner, and the resulting `23P01`
maps to `booking_slot_unavailable`: 409 via `bookingRoutes.ts:85-86`, and the
public path keeps `publicBookingApi.ts:236`. R2-32's "exported for tests only"
list gains `isBookingReservationDeadlock` and `withReservationExclusion`; the
facade re-exports neither.

Tests (`task551AdminWriteConcurrency.test.ts`). DB-free: the exclusion
predicate is true at depth 0, 3 and 8, false at depth 9, for another
constraint, `23505`, `40P01`, an accessor `code` and a cyclic `cause`; the
deadlock predicate is true at depth 0 and 8, false at 9; an injected write
gives `40P01`+success → 2 calls, `40P01`+`23P01` → `booking_slot_unavailable`,
`40P01` twice → the second error after 2 calls, `23P01` → no retry. DB legs
(marker resource/service):

- The 50-way race keeps "exactly one active row, 49 `booking_slot_unavailable`,
  no other code". An exhausted `40P01` is a failing leg to investigate (the C13
  55P03 rule), never a counted loser.
- The R2-02 reactivation legs stand.
- The global blackout leg uses a marker-unique far-future window: year 2300
  plus an offset derived from RUN. It asserts exactly one INSERT, no lock and
  no conflict SELECT, and deletes that blackout id in `finally`.
- The R2-18 week-cap route leg seeds 501 non-overlapping marker reservations
  (20-minute slots, 167 h) on the marker resource only. It queries with that
  `resourceId` and expects 500 items plus `truncated`.

### R3-04 — Admin-set lock proof independent of the ambient baseline (MEDIUM)

Supersedes R2-01 `contract :3043-3044`: "`b = 0` → exactly N−1 of N succeed,
the rest `last_admin`; `b ≥ 1` → all succeed."

- **Lock-wait proof** (`task551AdminWriteConcurrency.test.ts`, DB leg). A
  second dedicated session (a max-1 `postgres()` client on the same URL, closed
  in `finally`) holds `begin; select pg_advisory_xact_lock(551031, 1)`. One at
  a time, `setUserRoles`, `disableUser`, `deleteUser`, `updateUser` (status →
  `inactive`), `updateRoleWithTransition` (strip `"*"`) and `deleteRole` start
  on marker rows. Bounded condition polling (≤ 5 s, no fixed sleep) waits for
  the `pg_locks` row `locktype = 'advisory' and classid = 551031 and objid = 1
  and objsubid = 2 and granted = false`. At that moment the writer's R2-30
  counter holds only `lock`-bucket statements (fence probe, lock) and zero
  counted statements, and the marker row is unchanged. The holder commits; the
  writer then completes with its asserted outcome.
- **Baseline race** (extra coverage). The R2-01 legs stay, and `b` is read
  under the same lock. The test asserts the precondition `b ≥ 1` with an
  explicit message, then expects every marker leg to succeed. The `b = 0`
  branch is not asserted on the shared database. The lock-wait proof carries
  the serialization evidence.

### R3-05 — Backup users-section restore stays out of scope (MEDIUM)

Two lockout definitions coexist: admin writes (R2-01) count only `status =
'active'` full-access users, while backup restore counts admins of ANY status
(`core/services/backups/backupUsersSection.ts:538-551`, inside `:456-551`,
under the restore transaction's fence at `backupImport.ts:858-865`).

This leaf edits neither file (both join `forbiddenPaths`). The divergence has
security impact, so it is NOT `TASK-9999`-eligible: C17 records an explicit
follow-on for the owner to allocate to the backup owner (align
`backup_users_restore_no_admin` with the active-admin rule, or document why
restore keeps any-status semantics).

### R3-06 — `adminListScope.ts` owns the boundary encoder and cursor schema (MEDIUM)

Supersedes the R2-17 budget "new `core/services/database/adminListScope.ts` ≤
200" (`contract :3431`), now ≤ 260 because of the R3-12 rule table. It also
fixes the missing owner of R2-15's `encodeAdminBoundary`. The module stays
pure: it imports `node:crypto` and `keysetCursor.ts`, which itself imports
only `node:crypto` (`keysetCursor.ts:13`).

```ts
// core/services/database/adminListScope.ts — complete export list
export const ADMIN_LIST_SCOPE_VERSIONS; export function canonicalJson(value: unknown): string;   // R2-17
export function deriveAdminListScope(family, filters, parentId?): string;                        // R2-17
export const ADMIN_LIST_FIELD_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,79}$/;                     // R2-04
export type AdminListParamName = "ids" | "fields" | "types" | "tags" | "options";
export type AdminListParamRule; // R2-04 fields + `schema` (R3-12)
export const ADMIN_LIST_PARAM_RULES: Readonly<Record<AdminListParamName, AdminListParamRule>>;  // R3-12
export function splitAdminListParam(raw: string, rule: AdminListParamRule): readonly string[] | null;
export const ADMIN_LIST_CURSOR_PARAM_SCHEMA = Object.freeze({
  type: "string", minLength: 1, maxLength: MAX_ENCODED_CURSOR_BYTES }); // 2,048 (keysetCursor.ts:20)
export function encodeAdminBoundary(spec: KeysetSpec, keys: PaginationCursorKeyring,
  values: readonly (string | boolean | null)[], direction: "next" | "previous" = "next"): string {
  try { return encodeKeysetCursor({ scope: spec.scope, direction, values }, spec, keys); }
  catch { throw new Error("admin_list_cursor_encode_failed"); } // R2-03: 500, never 400
}
```

Every family query schema uses `cursor: ADMIN_LIST_CURSOR_PARAM_SCHEMA`. Tests
(DB-free, `task551BoundedAdminLists.test.ts`): 2,048 chars pass and 2,049 →
`validation_error`; an injected `PaginationCursorError` →
`admin_list_cursor_encode_failed`; the import closure holds no `core/db/**`.

### R3-07 — Week cache invalidation (MEDIUM)

Supersedes R2-18 `contract :3480-3482`: "the reservation mutations' existing
list broadcast invalidates it and `clearBookingCache` (`bookingClient.ts:195`)
clears it". `bookingClient.ts` has no cacheBus subscription today; its
mutations only broadcast (`:659`, `:676`). `subscribeCacheEvents` delivers both
same-tab and cross-tab events (`core/admin/utils/cacheBus.ts:131-156`).

```ts
// core/admin/services/bookingClient.ts
const weekCache = new Map<string, BookingWeekCacheEntry>(); // key: buildAdminListCacheKey(…, "week", …)
const weekInFlight = new Map<string, Promise<BookingWeekPage>>();
let weekGeneration = 0; // monotonic, never reset
let weekSubscription: (() => void) | null = null;
function invalidateBookingWeekCache(): void { weekCache.clear(); weekInFlight.clear(); weekGeneration += 1; }
function ensureWeekSubscription(): void { // lazy on first week read; idempotent
  weekSubscription ??= subscribeCacheEvents((event) => {
    if (event.key === cacheKeys.bookingReservationsList) invalidateBookingWeekCache();
  });
}
// listReservationsWeek: ensureWeekSubscription(); capture weekGeneration; single-flight fetch;
//   fill the Map only if the generation is unchanged (a stale completion is returned, never cached).
// createBookingReservation / updateBookingReservationStatus: invalidateBookingWeekCache() before the
//   existing broadcast (:659, :676); clearBookingCache (:195) also calls it.
```

`BookingPage.tsx`'s `bookingReservationsList` subscriber branch (`:444-446`)
also force-revalidates the active week in the background (the rendered week
stays until the new page arrives).

Tests: `bookingClient.test.ts` (same-tab mutation → the next week read
refetches; a remote `bookingReservationsList` event clears the cache; a
completion after an invalidation is not cached; `clearBookingCache` clears
it); `booking-page-wave.test.tsx` (the subscriber issues one forced week read).

C17 gains a 10-L02 `ADMIN_CACHE_MAP` row for the week key and these sources.

### R3-08 — FINAL download installs the no-store triple (MEDIUM)

Supersedes R2-06 "→ 404 same code; streamed by 08-L03's lane" (`contract
:3301`) and the Security row "streamed through 08-L03's lane" (`contract
:3561-3564`), which are silent on cache headers. FINAL registers the C4 O11
fail-closed seam first:

```ts
router.get("/forms/:id/export-jobs/:jobId/download",
  installSubmissionDetailNoStoreHeaders, // Cache-Control: private, no-store, max-age=0; Pragma: no-cache; Expires: 0
  requirePermission("forms:read"), validateExportDownloadRequest, streamSubmissionExport);
```

The triple is exact on the 200 binary result and on every mapped 403
(`submission_export_token_invalid`), 404 (`submission_export_job_not_found`,
`submission_export_artifact_missing`) and 409
(`submission_export_job_not_ready`).
Cross-leaf requirement on 08-L03 C1 (`TASK-551-08-L03-...md:632-648`, which
pins the v1 triple only "for JSON responses"): the binary lane carries the
route-installed triple unchanged beside its three binary headers (mirror owed
in 08-L03). The FINAL test (`task551BoundedAdminLists.test.ts`) asserts all
three exact values on the 200, 403, both 404 codes and the 409.

### R3-09 — Export token secret and shared artifacts (MEDIUM)

Current behavior (`core/services/forms/submissionExportJob.ts`, forbidden
here): `hashSubmissionExportToken` keys on
`FORM_SUBMISSIONS_EXPORT_TOKEN_SECRET`, else on a per-process random secret
(`:139-149`). Artifacts are files under `FORM_SUBMISSIONS_EXPORT_DIR`
(`:134-135`). `.env.example` has no entry for either (grep count 0,
2026-09-25).

- **Security Contract (FINAL).** A multi-replica deployment MUST configure
  `FORM_SUBMISSIONS_EXPORT_TOKEN_SECRET` (operators generate 32 random bytes)
  and a `FORM_SUBMISSIONS_EXPORT_DIR` shared by every replica. Without both, a
  token minted on one replica returns 403 on another, or its artifact returns
  404. On a single replica without the secret, a restart invalidates every
  outstanding token (403 `submission_export_token_invalid`). This behavior is
  documented, not a defect.
- **Test** (FINAL, `task551BoundedAdminLists.test.ts`, no DB): with the env
  secret set to a test-only value, a hash from the statically imported module
  verifies in a second instance from `` import(`${path}?instance=${randomUUID()}`) ``
  (a different process-local secret); with the secret unset the same check
  fails (control); the env value is restored in `finally`.
- C17/10-L02 gain `.env.example` entries for both keys (multi-replica rule).

### R3-10 — Advisory-lock collision inventory additions (MEDIUM)

Extends the R2-01 inventory (`contract :3025-3035`). It missed two two-key
locks whose `classid` is computed at runtime:

`(hashtext('coderso:session-user:v1'), hashtext(:userId))`, the C5 O3
session lock (`contract :2346`, transaction-scoped), and
`(hashtext('coderso.task551_rollout_advisory_lock'), hashtext(:operationId))`,
the 05-L01 rollout lease (`scripts/task-551-online-indexes.ts:99`, `:2051`,
session-scoped `pg_try_advisory_lock`); both use `objsubid 2`.

The suite advisory lock (R2-31, C13 v2) gets code-owned constants
`TASK551_03L02_SUITE_LOCK = { namespace: 551_032, key: 1 }`. The owned
`tests/perf/fixtures/task551AdminListDescriptors.ts` exports them. They are
imported by `task551AdminWriteConcurrency.test.ts`,
`task551BoundedAdminLists.test.ts` and `database-admin-list-budgets.test.ts`,
and by no production code. A search on 2026-09-25 found no `551_032`/`551032`
in `core/`, `scripts/` or `tests/`.

`rolesService.test.ts`: the DB-free pin adds `(551_032, 1)`, distinct from
`(551_031, 1)` and outside every landed namespace; a DB leg (in
`test551-db-unit`) runs `select hashtext('coderso:session-user:v1') as s,
hashtext('coderso.task551_rollout_advisory_lock') as r` and asserts each
differs from `551031` and `551032`.

### R3-11 — Fence failure codes map to 503 (LOW)

Supersedes R2-01 `contract :2975-2977` ("add `native_cms_writer_fence_busy`
and `native_cms_writer_recovery_required` → 503 same code with fixed
messages").

`mapAdminUserError` (`adminUsersRoutes.ts:57`) and `mapAdminRoleError`
(`adminRolesRoutes.ts:40`) map `native_cms_writer_fence_busy`,
`native_cms_writer_recovery_required`, `native_cms_writer_fence_failed` and
`native_cms_writer_fence_lost` (thrown at `core/db/nativeCmsWriterFence.ts:31-44`,
`:73`, `:106-117`, `:139`) to 503 with the same code and a fixed message.
Backup's 409 busy row (`backupRoutes.ts:108-113`) is unchanged. A DB-free
block pins the 8 rows (4 codes × 2 mappers) with no driver text echoed.

### R3-12 — Ajv list patterns pinned per parameter (MEDIUM)

Supersedes the R2-04 `ids` token cell "UUID (`bookingSchemas.ts:6-7`)"
(`contract :3128`) and the unpinned "`pattern: <list pattern>`" (`contract
:3160-3161`).

Every pattern is anchored and linear (a token, then `,`-prefixed repeats; `,`
is outside every token class, so each input has one parse). Ajv compiles with
the `u` flag, so there are no redundant escapes; `\|` below is table escaping.

| Param | Ajv `pattern` | `maxLength` | After Ajv (`splitAdminListParam`) |
|---|---|---|---|
| `ids` | `^U(,U){0,99}$`, `U` = `[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}` (fixed-width lowercase, as `keysetCursor.ts:103` and Postgres `uuid` output) | 3,699 | `toLowerCase()` before the duplicate check (idempotent under the pattern, kept in the rule); request order |
| `fields` | `^F(,F){0,11}$`, `F` = `[A-Za-z][A-Za-z0-9_-]{0,79}` | 971 | case-sensitive duplicates; sorted |
| `types` | `^(image\|file)(,(image\|file))?$` | 10 | duplicates rejected; sorted |
| `tags` | `^E(,E){0,19}$`, `E` = `[A-Za-z0-9%_.!~*'()-]{1,480}` (the `encodeURIComponent` alphabet; 40 chars × ≤ 12) | 8,192 | decode (malformed → `null`), trim, 1..40 chars, no C0/C1, case-insensitive duplicates; sorted |
| `options` | `^O(,O){0,7}$`, `O` = `(field:[A-Za-z][A-Za-z0-9_-]{0,79}\|system:(title\|slug\|status\|createdAt\|updatedAt\|publishedAt))` | 1,000 | duplicates rejected; sorted |

Each `ADMIN_LIST_PARAM_RULES` row holds the Ajv `schema` `{ type: "string",
minLength: 1, maxLength, pattern }` plus the token RegExp, `max`, `order`,
`encoded` and `foldCase`; family schema modules import the `schema`, never
re-declare it. The client serializer lowercases `ids` before its dedupe.
Tests: `task551BoundedAdminLists.test.ts` (`ids=<U>,<u>`, upper and lower case
of one UUID, → `validation_error`; `ids=<u>,<u>` → `validation_error`; 100/101
ids, 12/13 fields, 20/21 tags; `tags=a%2Cb` round-trips as one tag;
`tags=%E0%A4` and `types=image,image` → `validation_error`);
`task551PaginatedClients.test.ts` (mixed-case duplicate ids collapse to one
lowercase token).

### R3-13 — Strict custom-screen filter schema (MEDIUM)

Supersedes R2-05 `contract :3188-3190` where it leaves the shape open
("`fieldFilter.<fieldKey>` and
`systemFilter.<title|slug|status|createdAt|updatedAt|publishedAt>` ≤ 8 in
total, values 1..256 chars").

```ts
// core/server/validation/contentSchemas.ts — typed-route list query (excerpt)
export const contentTypedEntriesListQuerySchema = {
  type: "object", additionalProperties: false,
  properties: { /* q, status, limit as today */ cursor: ADMIN_LIST_CURSOR_PARAM_SCHEMA,
    ids: ADMIN_LIST_PARAM_RULES.ids.schema, fields: ADMIN_LIST_PARAM_RULES.fields.schema,
    options: ADMIN_LIST_PARAM_RULES.options.schema, sortDir: { enum: ["asc", "desc"] },
    sortField: { type: "string",
      pattern: "^(field:[A-Za-z][A-Za-z0-9_-]{0,79}|system:(title|slug|status|createdAt|updatedAt|publishedAt))$" } },
  patternProperties: {
    "^fieldFilter\\.[A-Za-z][A-Za-z0-9_-]{0,79}$": { type: "string", minLength: 1, maxLength: 256 },
    "^systemFilter\\.(title|slug|status|createdAt|updatedAt|publishedAt)$": { type: "string", minLength: 1, maxLength: 256 },
  },
} as const;
// route, after validate(): count keys starting "fieldFilter." or "systemFilter."; > 8 ->
//   ApiError("validation_error", "Invalid payload", 400, [{ path: "filters", keyword: "maxFilters" }])
```

- **Projection owner.** `ids`+`fields` → `customScreenEntryReadService.ts`
  (R2-05 projection, one statement); `ids` alone stays `listAdminEntriesByIds`
  (`entryReadService.ts`).
- **Declared route statement.** The typed-parent slug lookup
  (`content_type_not_found` first) runs in `contentEntryRoutes.ts` before the
  service. It is outside the 3-statement service ceiling (R2-30), and the
  budgets suite counts it in a separate `route` bucket.
- Tests (`task551BoundedAdminLists.test.ts`): an unknown key,
  `fieldFilter.1bad` or `systemFilter.email` → `validation_error`; 8/9
  filters; a 257-char value fails; `ids`+`fields` returns only the requested
  keys; `ids` alone keeps the `entryReadService` shape.

### R3-14 — Supersessions and preconditions (MEDIUM)

- **C6 bullet 1** (`contract :2378-2382`, "The legacy `GET
  /forms/:id/submissions/export` route … stay unchanged; `forms.test.ts` stays
  execution-only.") binds INITIAL only. FINAL deletes the route, its import and
  `exportFormSubmissions`, and edits `forms.test.ts` (R2-06).
- **C3 parent caps** (`contract :2205-2208`, "The 101-row `LIMIT` and
  `booking_collection_limit_exceeded` apply only to the new admin builders in
  `bookingReadService.ts`") now reads: "The cap+1 reads, `LIMIT 301` for
  service resources and `LIMIT 201` for schedules, with
  `booking_collection_limit_exceeded` above the cap (R2-16), apply only to the
  new admin builders in `bookingReadService.ts`". The facade clause stands.
- **C4 route order** (`contract :2326-2329`, "… so the kept legacy export path
  is never captured by the detail route; a registration-order test pins it")
  binds INITIAL only. FINAL rewrites the test: after the deletion, `GET
  /forms/:id/submissions/export` reaches the detail route and gets the mapped
  non-UUID `submissionId` response INITIAL pins (no-store triple, never a
  CSV/JSON body); `/forms/:id/export-jobs/:jobId` and `…/download` each reach
  their own handler.
- **UTF8 precondition (C13 pre-dispatch).** `select
  current_setting('server_encoding')` returns `UTF8` on the `DATABASE_URL3`
  lane database and the smoke `DATABASE_URL`; otherwise every command running
  the R3-02 sort-key SQL is blocked.

### Security Contract rows (Round 3, part A)

- Admin-set writers: fence (shared) → `acquireAdminSetLock` (exclusive
  `(551031, 1)`) → target `FOR UPDATE` → count → write, each in its own `read
  committed` transaction (R3-28); four fence codes → 503, no detail (R3-11).
- Comma lists: anchored linear patterns, bounded lengths, case-folded
  duplicates, bound SQL parameters (R3-12, R3-13).
- FINAL download: no-store triple on every handler-chain outcome (R3-08);
  multi-replica needs `FORM_SUBMISSIONS_EXPORT_TOKEN_SECRET` and a shared
  export dir; the secret is never logged, returned or cached (R3-09).
- Booking writes: `23P01` → `booking_slot_unavailable`, at most one `40P01`
  retry, no advisory lock (R3-03).

### Envelope deltas owed to part B

Part A edits no fence, ownership or Validation Commands byte; part B
reconciles counts, `minimum`s and the ≤ 128-token argv rule.

1. **Allowlist.** Part A adds no path; every file it names is already
   allowlisted (`rolesService.ts`, `usersService.ts`, `adminUsersRoutes.ts`,
   `adminRolesRoutes.ts`, `adminListScope.ts`, the read services,
   `contentSchemas.ts`, `contentEntryRoutes.ts`, `bookingClient.ts`,
   `BookingPage.tsx`, `formsRoutes.ts`, the descriptors fixture and the five
   named suites). The task-490 browser-action test and
   `page-editor-host-contract.test.ts` belong to part B (R3-20, R3-26).
2. **`forbiddenPaths` add** (read-only here; self-collision check only):
   `core/services/backups/backupUsersSection.ts`,
   `core/services/backups/backupImport.ts` (R3-05),
   `scripts/task-551-online-indexes.ts` (R3-10), `core/admin/utils/cacheBus.ts`
   (R3-07) and `tests/unit/kits/nativeCmsWriterFenceInventory.test.ts` (R3-28;
   it stays execution-only in `owned-module-consumers-bun`).
3. **Budget.** `adminListScope.ts` ≤ 260 wherever part B restates the R2-17
   and C11 budgets (R3-06).
4. **Commands.** No new id: `test551-db-unit` already runs
   `rolesService.test.ts` (R3-10 DB leg), `owned-module-consumers-bun` the fence
   inventory, and `final-forms-export-bun-tests` covers R3-08/R3-09. Part B adds
   the R3-14 UTF8 check to the C13 v3 pre-dispatch list beside R3-35.
5. **C17 v3** (part B) records the R3-05 backup follow-on, the 10-L02
   `.env.example` entries (R3-09), the week key (R3-07), the four-code fence
   503 rows (R3-11), and, with R3-32, the `acquireAdminSetLock` and
   booking-predicate query-inventory rows.
6. **Mirrors outside this file:** `TASK-551-08-L03` (binary lane carries the
   route-installed v1 triple, R3-08); `TASK-551-10-L02` (R3-07, R3-09
   documentation); the backup owner (R3-05).

## Dated Contract Corrections — 2026-09-25 (Round 3, part B: clients/UI/tests/envelope)

Source: `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round3-dispositions.md`
(HEAD `9c5b6666`, dirty mirrors). This part applies R3-15..R3-27,
R3-29..R3-32, the 03-L02 side of R3-34 and R3-37, R3-35, R3-36 and part A's
"Envelope deltas owed to part B". R3-33 belongs to TASK-551-11 and is not
applied here. **This section wins** over the body, FAZA-0 C1–C17, the Round-1
record, both Round-2 parts and part A where they differ. The JSON envelope
fence is the only in-place edit; the "Envelope change record (Round 3)" closes
this section. Source anchors were re-read on 2026-09-25.

**Line shift.** The fence edit added 18 lines inside the fence, which now ends
at `contract :1947`. Every `contract :NNN` ≥ 1930 cited by earlier parts,
including part A, now reads NNN + 18. The quoted text stays authoritative
(part A anchor rule). This part cites current line numbers.

**Seed corrections (verified).** The dispatch seed named
`tests/vitest/ui/forms-submissions-restyle.test.tsx`; no such file exists.
The real suite is `tests/vitest/ui-integration/forms-submissions-restyle.test.tsx`,
and that path joins `final-line-count`. R3-30's "the eight `*Client*.test.ts`"
undercounts the allowlisted pure client suites; R3-30 below enumerates them.

### R3-15 — `AdminListPage` / `AdminListEnvelope` types (MEDIUM)

Supersedes, in C9 v2, `readPersistedFirstPage<I, F>(…, filters: F):
AdminListEnvelope<I> | null;` (`contract :3708-3709`), `export const
emptyAdminListEnvelope = <I>(): AdminListEnvelope<I> =>` (`:3710`), and both
stale returns `?? emptyAdminListEnvelope<PageListItem>()` (`:3743`) and
`?? emptyAdminListEnvelope<PostListItem>()` (`:3815`). A one-argument
`AdminListEnvelope<I>` does not exist: the body type (`contract :557-563`)
takes `<Item, Summary, Facets>` and always carries `summary` and `facets`. A
persisted, stale or empty page has neither.

```ts
// core/admin/services/adminListEnvelope.ts
export type AdminListPage<I> = Readonly<{ items: readonly I[]; nextCursor: string | null; hasMore: boolean }>;
export type AdminListEnvelope<I, S, F> = AdminListPage<I> & Readonly<{ summary: S; facets: F }>; // network shape
export type AdminListRead<I, S, F> = AdminListEnvelope<I, S, F> | AdminListPage<I>;     // any cached-client result
export const hasAdminListSummary = <I, S, F>(read: AdminListRead<I, S, F>):
  read is AdminListEnvelope<I, S, F> => Object.hasOwn(read, "summary") && Object.hasOwn(read, "facets");
export type PersistedFirstPage<I, F> = Readonly<{ v: 1; filters: F }> & AdminListPage<I>; // five own keys, unchanged
export function readPersistedFirstPage<I, F>(store: { read(): PersistedFirstPage<I, F> | null },
  filters: F): AdminListPage<I> | null;                 // returns exactly {items,nextCursor,hasMore}
export const emptyAdminListPage = <I>(): AdminListPage<I> => ({ items: [], nextCursor: null, hasMore: false });
export type CachedAdminListPage<I, S, F> = Readonly<{ canonicalFilters: string; envelope: AdminListEnvelope<I, S, F> }>;

// core/admin/services/pagesClient.ts (each client defines its pair explicitly)
export type PageListEnvelope = AdminListEnvelope<PageListItem, PageListSummary, PageListFacets>;
export type PageListRead = AdminListRead<PageListItem, PageListSummary, PageListFacets>;
// listPagesPage(filters, cursor): Promise<PageListEnvelope>          network read, always full
// listPagesPageCached(filters?, cursor?, options?): Promise<PageListRead>
// core/admin/services/postsClient.ts
export type PostListEnvelope = AdminListEnvelope<PostListItem, PostListSummary, PostListFacets>;
export type PostListRead = AdminListRead<PostListItem, PostListSummary, PostListFacets>;
// getCachedPosts(filters?): PostListRead | null;  listPostsCached(filters?, options?): Promise<PostListRead>
```

- The `*Summary`/`*Facets` client types mirror the body shapes (`contract
  :565-660`) in the owning client; every family defines its pair the same way.
- The memory cache stores only full network envelopes, so a memory hit
  resolves `AdminListEnvelope`. The persisted slot, the stale path (R3-16) and
  the empty fallback resolve `AdminListPage`.
- **Posts slot.** The default-slot read resolves exactly the D2 three-key
  shape `{ items, nextCursor, hasMore }`. `v` and `filters` never leak. This
  keeps the TASK-554 D2-extension pins (`TASK-554_...md:1618-1636`, for
  example `getCachedPosts()).toEqual({ items: [], nextCursor: null, hasMore:
  false })`) mechanical.
- **Hook.** `useBoundedAdminList` (R3-17) treats a read without `summary` as
  not loaded: skeleton, never a `summary.*` dereference.
- Tests (`task551PaginatedClients.test.ts`): a persisted hit and the empty
  fallback have exactly three own keys; a memory hit has `summary` and
  `facets`; `hasAdminListSummary` is false for both page forms and true for a
  network envelope.

### R3-16 — Stale completion resolution order (MEDIUM)

Supersedes the C9 v2 "**Stale discard.**" bullet (`contract :3756-3759`: "A
completion whose installation token, family generation or key generation is
no longer current installs nothing. It resolves the verified cached envelope
for the same key when one exists, otherwise the empty envelope.") and the
template's stale branch (`:3742-3743`). The "installs nothing" rule stands, and
so does the template comment "never the discarded rows".

```ts
// core/admin/services/pagesClient.ts (the eight generic page methods share this shape)
let request: Promise<PageListRead>;
request = listPagesPage(filters, cursor).then(async (envelope): Promise<PageListRead> => {
  if (!isCurrentAdminCacheInstallationToken(token) || generation !== pagesGeneration)
    return emptyAdminListPage<PageListItem>();          // (R) family/installation reset: plain empty
  if (pageGenerations.get(key) !== keyGeneration)
    return resolveOvertakenPageRead(key, filters, request); // (O) overtaken by a newer request for this key
  pageCache.set(key, { canonicalFilters: canonicalJson(filters), envelope });
  if (isDefaultFirst) pagesFirstPage.write({ v: 1, filters, items: envelope.items,
    nextCursor: envelope.nextCursor, hasMore: envelope.hasMore });
  return envelope;
}).finally(() => { if (pagePromises.get(key) === request) pagePromises.delete(key); });

async function resolveOvertakenPageRead(key: string, filters: PageListFilters,
  self: Promise<PageListRead>): Promise<PageListRead> {
  const newer = pagePromises.get(key);                   // 1. the NEWER in-flight request for the key
  if (newer !== undefined && newer !== self) {
    try { return await newer; } catch { /* the newer caller sees its own error; fall through */ }
  }
  return readVerifiedAdminListPage(pageCache, key, filters)           // 2. verified memory
    ?? (isDefaultFirstKey(key) ? readPersistedFirstPage(pagesFirstPage, filters) : null) // 3. default slot
    ?? emptyAdminListPage<PageListItem>();                              // 4. empty
}
```

- **Order.** A completion overtaken by key generation resolves (1) the newer
  in-flight promise for the same key, then (2) the verified memory page, then
  (3) the persisted default slot (default first page only), then (4) the empty
  page. It never resolves the discarded rows.
- **Plain empty.** Only a family-generation or installation-token change
  (reset or identity transition) resolves the plain empty page directly. It
  never awaits another request, so a pre-reset caller cannot receive
  post-reset or other-identity rows.
- **Termination.** Every newer request was created after `self`, and step 1
  awaits only a different promise, so the chain is finite.
- **Posts.** `listPostsCached` has no per-key generation. Its only stale
  branch is the authority-epoch advance, and only `clearPostsCache` advances
  that epoch (`postsClient.ts:292-293`). That branch keeps the pinned TASK-554
  D2-extension reading `getCachedPosts(filters) ?? emptyAdminListPage()`
  (`TASK-554_...md:1574-1582`, the `:931` fresh case). It is the one named
  exception to "plain empty on reset". Only values written after the reset can
  hit there.
- Tests (`task551PaginatedClients.test.ts`): (a) a forced overtake, where B
  resolves `E2` before A's `E1` arrives, resolves A to `E2`, never to the empty
  page or `E1`; (b) the same with A completing first, so A awaits B; (c) B
  rejects, and A falls to memory, then the slot, then empty; (d) a reset and
  (e) an installation-token change each resolve the plain empty page.

### R3-17 — `useBoundedAdminList` pseudocode (MEDIUM)

Supersedes the Round-1 C9 hook bullet's state/action list (`contract
:2506-2508`: "`useReducer` state `{items, cursorStack, nextCursor, hasMore,
status, summary, facets}`; actions `loaded`, `loadMore`, `previous`,
`reset`."). Its rules stand: no synchronous `setState` in effect bodies, a
lazy-initializer hydration, and dispatch from async callbacks only.

```ts
// core/admin/ui/shared/useBoundedAdminList.ts
type Mode = "replace" | "append";
type Pending<Fl> = Readonly<{ token: number; filters: Fl; cursor: string | null; mode: Mode; force: boolean }>;
export type BoundedListStatus = "loading" | "ready" | "loadingMore" | "error";
type State<I, S, F, Fl> = Readonly<{
  filters: Fl; filterKey: string; items: readonly I[]; cursorStack: readonly (string | null)[];
  nextCursor: string | null; hasMore: boolean; status: BoundedListStatus;
  summary: S | null; facets: F | null; error: string | null; seq: number; pending: Pending<Fl> | null;
  lastRequest: Omit<Pending<Fl>, "token" | "filters"> | null }>;
type Action<I, S, F, Fl> =
  | { type: "reset"; filters: Fl; hydrated: AdminListRead<I, S, F> | null }
  | { type: "loadMore" } | { type: "previous" } | { type: "revalidate" } | { type: "retry" }
  | { type: "loaded"; token: number; read: AdminListRead<I, S, F> }
  | { type: "failed"; token: number; message: string };

function reducer<I extends { id: string }, S, F, Fl>(state: State<I, S, F, Fl>, action: Action<I, S, F, Fl>): State<I, S, F, Fl> {
  switch (action.type) {
    case "reset": return initState(action.filters, action.hydrated, state.seq); // new filterKey, stack [null]
    case "loadMore": return !state.hasMore || state.pending ? state
      : issue(state, { cursor: state.nextCursor, mode: "append", force: false }, "loadingMore");
    case "previous": return state.cursorStack.length < 2 || state.pending ? state
      : issue({ ...state, cursorStack: state.cursorStack.slice(0, -1) },
          { cursor: state.cursorStack.at(-2) ?? null, mode: "replace", force: false }, "loading");
    case "revalidate": return issue(state, { cursor: state.cursorStack.at(-1) ?? null, mode: "replace", force: true }, state.status);
    case "retry": return state.status !== "error" || !state.lastRequest ? state : issue(state, state.lastRequest, "loading");
    case "loaded": {
      if (state.pending?.token !== action.token) return state;           // ignore non-latest
      const { read } = action; const mode = state.pending.mode;
      const seen = new Set(state.items.map((item) => item.id));
      const items = mode === "append"
        ? [...state.items, ...read.items.filter((item) => !seen.has(item.id))] // dedupe by id
        : read.items;
      const summary = hasAdminListSummary(read) ? read.summary : mode === "append" ? state.summary : null;
      const facets = hasAdminListSummary(read) ? read.facets : mode === "append" ? state.facets : null;
      const cursorStack = mode === "append" ? [...state.cursorStack, state.pending.cursor] // one entry per appended page
        : state.cursorStack;                                            // previous already popped; revalidate keeps it
      return { ...state, items, summary, facets, cursorStack, nextCursor: read.nextCursor,
        hasMore: read.hasMore, status: "ready", error: null, pending: null };
    }
    case "failed": return state.pending?.token !== action.token ? state
      : { ...state, status: "error", error: action.message, pending: null }; // rows kept
  }
}
// issue(state, req, status) => ({ ...state, seq: state.seq + 1, status, lastRequest: req,
//   pending: { token: state.seq + 1, filters: state.filters, ...req } }); tokens are monotonic per hook instance

export function useBoundedAdminList<I extends { id: string }, S, F, Fl>(
  fetchPage: (filters: Fl, cursor: string | null, options?: { force?: boolean }) => Promise<AdminListRead<I, S, F>>,
  filters: Fl, { hydrate }: { hydrate: (filters: Fl) => AdminListRead<I, S, F> | null }) {
  const [state, dispatch] = useReducer(reducer<I, S, F, Fl>, filters,
    (initial) => initState(initial, hydrate(initial), 0)); // lazy hydration; pending = revalidate (force) when hydrated
  const pending = state.pending;
  useEffect(() => {
    if (!pending) return;
    fetchPage(pending.filters, pending.cursor, { force: pending.force })
      .then((read) => dispatch({ type: "loaded", token: pending.token, read }),
            (error) => dispatch({ type: "failed", token: pending.token, message: toAdminErrorMessage(error) }));
  }, [fetchPage, pending]);                                // async callbacks only; no cleanup needed (tokens)
  return { ...state, summaryLoaded: state.summary !== null,
    reset: (next: Fl) => dispatch({ type: "reset", filters: next, hydrated: hydrate(next) }), // from change handlers
    loadMore: () => dispatch({ type: "loadMore" }), previous: () => dispatch({ type: "previous" }),
    revalidate: () => dispatch({ type: "revalidate" }), retry: () => dispatch({ type: "retry" }) };
}
```

- The `filters` argument seeds only the lazy initializer. Filter changes go
  through `reset(next)`, called from the view's change handler, and
  `state.filters` is the hook's source of truth. The hook never derives a
  reset in render or in an effect.
- Cache-bus subscribers call `revalidate()` from the subscription callback,
  and the current page is replaced in the background. Author drafts live in
  view state, not in list rows, so a background replacement never overwrites
  dirty state (F-54).
- A missing `summary` renders the skeleton (R3-15). `summary` is `S | null`.
- The owning test is `tests/vitest/admin/task551PaginatedListViews.test.tsx`
  (hook harness): hydration then one forced revalidation; a stale token
  ignored after `reset` and after `loadMore` then `reset`; a duplicate-id
  append renders the id once; `error` keeps the rows and `retry` reissues;
  `previous` restores the prior cursor; a persisted page renders the skeleton.
- **Posts prepend.** `upsertCachedPost` prepends a row into the default slot
  (C9 v2, `contract :3786-3799`). When that row reappears on a later page,
  the append dedupe drops it. `task551PaginatedListViews.test.tsx` pins
  "upsert-prepended row, then Load more returning the same id, renders once".

### R3-18 — `adminUsersClient` is memory-only (MEDIUM)

Supersedes, for users only, the C9 v2 "**Persistence.**" bullet (`contract
:3760-3765`, "Only the default-filter first page persists, under the
existing family list key …") and the template comment "(representative for
all eight clients)" (`:3713`) as it applies to the `createMemoryBackedLocalCache`
slot. User rows carry PII (name, email, status), and
`core/admin/services/cachePolicy.ts` (forbidden) has no users list key today.

```ts
// core/admin/services/adminUsersClient.ts
export const DEFAULT_ADMIN_USER_LIST_FILTERS: AdminUserListFilters = Object.freeze({});
const ADMIN_USERS_LIST_MEMORY_FAMILY = "admin-users:list"; // memory key prefix only; never a storage key
let usersGeneration = 1;
const userPageCache = new Map<string, CachedAdminListPage<AdminUserListItem, UserListSummary, UserListFacets>>();
const userPagePromises = new Map<string, Promise<AdminUserListRead>>();
const userPageGenerations = new Map<string, number>();
registerAdminModuleCacheReset(() => { userPageCache.clear(); userPagePromises.clear();
  userPageGenerations.clear(); usersGeneration += 1; });
// listAdminUsersPageCached follows R3-16 with steps 1, 2 and 4 only (no step 3: there is no slot).
// Mutations (create/invite/update/enable/disable/roles/delete) clear userPageCache and advance
// usersGeneration after success; no createMemoryBackedLocalCache, no localStorage/sessionStorage.
```

Tests (`task551PaginatedClients.test.ts`, `adminUsersClient.test.ts`):
`Storage.prototype` spies record zero calls across list, forced list,
mutation and reset, so no users list value reaches storage; the reset
registration clears the map and the next read refetches; the default
constant is exported and frozen.

### R3-19 — C11 v3 budgets and ranges (MEDIUM)

Supersedes these cells where they differ: the C11 v1 rows (`contract
:2605-2613`) and the R2-25 rows (`contract :3913-3919`). The R2-25 media
(≤ 900), booking (≤ 950) and controller (≤ 990, no-growth) budgets stand
unchanged.

| Module | Budget and ranges (Round 3) |
|---|---|
| `users/UsersRolesPage.tsx` (1,026) | ≤ 820 (was ≤ 750). `useUsersRolesCollections.ts` (≤ 350) receives `:165-261` minus the matchMedia effect `:200-207`, and `:262-348` minus the selection derivations `:303-312` (`selectedUser`, `activeSelectedRoleId`). Both excluded blocks stay in the page. `UsersRolesContent.tsx` keeps `:844-940` |
| `menus/MenuEditorWorkspace.tsx` (new) | ≤ 550 (was ≤ 450); it still receives `:57-222` and `:853-1081` (395 lines plus props and imports) |
| `pages/editor/PageEditorToolbar.tsx` (988) | ≤ 910 (was ≤ 880); the recovery range moving to `PageEditorToolbarRevisions.tsx` is `:614-730`, from `const revisionsHost = editorHost.revisions;` through `dismissRecoverableAutosave` (was `:617-724`, `contract :2565`) |
| `posts/editor/PostEditorCanvas.tsx` (1,526; ≤ 500) | the media-picker `<Dialog>` range moving to `PostEditorMediaControls.tsx` is `:1464-1523` (was `:1465-1525`, `contract :2607`) |
| `pages/editor/usePageEditorController.ts` (996; ≤ 990) | the ranges moving to `usePageEditorRevisions.ts` are `:123-127` (the `revisions` host block) and `:258-263` (revision state), no longer `:122-126` and `:257-261` (`contract :2564`, `:3915`) |
| `ui/menu-design-editor.test.tsx` (2,711) | the first harness range is `:666-758` (the TASK-501-03 banner, the `SavedMenuBlock`/`SavedMenuSectionOverride`/`SavedMenuDocument` types from `:668`, and the helpers through `seedDocument`), replacing `:694-758`; the other five ranges stand |

Arithmetic, HEAD counts and glue included: users 1,026 − 89 − 77 − 97 = 763,
plus about 45 lines of imports and hook destructuring, is ≤ 820. Toolbar 988 −
117 + about 30 is ≤ 910. The workspace is 395 plus about 100 is ≤ 550. Every
extraction test still proves the pre-split render and action contract.

### R3-20 — `page-editor-host-contract.test.ts` joins the allowlist (MEDIUM)

Supersedes R2-21 "asserts that the contract module imports no `services/*`
module" (`contract :3901-3902`). That assertion fails at HEAD:
`pageEditorHostContract.ts:3-9` imports the domain module
`../../../../services/pages/pageDocumentV2` (`core/services/pages/`), which is
legitimate.

- The suite is allowlisted and in `line-count-3` (94 lines today). It stays in
  `w0-revision-vitest`.
- The new assertion extends the landed test "reusable editor contract modules
  do not import admin API clients" (`:81-94`, which matches only `*Client`
  specifiers). No import specifier in `pageEditorHostContract.ts` may resolve
  under `core/admin/services/`, whether through a relative path or the `@/services/` alias.
- The type-level pin is
  `expectTypeOf<PageEditorRevision>().not.toHaveProperty("data")`, and
  `PageEditorRevisionPage` has exactly `items`, `nextCursor` and `hasMore`.

### R3-21 — `w0-revision-vitest` grows to 46 (MEDIUM)

Four allowlisted suites consume the W0 revision contract and join the gate
(46 paths; `minimum` 46):

- `canvas-editor-panel-toggle-dedupe.test.tsx:49` and
  `menu-design-editor.test.tsx:207` mock `listPageRevisions: vi.fn(async () =>
  [])` (W0 turns these into envelope mocks; the edit at `:207` is mechanical
  and does not grow the file before its W3 split);
- `page-editor-facade.test.ts:23`, `:36`, `:49-50` and `:68` pin
  `findRecoverableAutosaveRevision` and the `PageEditorHostRevisions` type
  identity;
- `engine-detail-template-restyle.test.tsx:5` renders
  `DetailTemplateEditorPage`.

C10 v2 gains: W0 creates the six gate-named suites absent at HEAD
(`pagesClientPagination`, `page-editor-revision-history`,
`detail-template-editor-revisions`, `page-editor-shell-revisions-wave`,
`page-editor-v2-{authoring,persistence}-revisions-flow`) and the harness
siblings they import (`pageEditorV2RevisionHarness.tsx`,
`pageEditorFlowRevisionMocks.tsx`); a missing path fails W0, never skips.

### R3-22 — Leg-3 directory-index stem; `pageTemplates.test.ts` (MEDIUM)

Supersedes the R2-19 leg-3 stem builder (`contract :3945-3947`) and the
"**Pinned result**" bullet (`contract :3954`, "265 hits … 246 test files and
19 support modules. Of the tests, 123 are allowlisted.").

```ts
const stems = envelope.allowlist.filter((p: string) => /^(core|scripts)\/.*\.tsx?$/.test(p))
  .flatMap((p: string) => {
    const s = p.replace(/\.tsx?$/, "");
    const dir = s.endsWith("/index") ? s.slice(0, -"/index".length) : null; // directory-index stem
    return [s, dir].filter((x): x is string => x !== null)
      .flatMap((x) => (x.startsWith("core/admin/") ? [x, "@/" + x.slice(11)] : [x]));
  });
```

- The only `*/index.ts` allowlist entry is `core/server/routes/index.ts`. Its
  stem `core/server/routes` adds exactly one hit: `tests/integration/routes/pageTemplates.test.ts`
  (it imports the directory). That suite joins `owned-module-consumers-bun`
  execution-only (41 paths, `minimum` 41).
- **Pinned result** (live tree, Round-3 envelope, 2026-09-25): 266 hits = 247
  tests + 19 support modules (13 allowlisted + the six R2-19 fixtures). 124
  tests are allowlisted; 123 are execution-only: `-vitest-1` 30, `-vitest-2`
  29, `-bun` 41, `w0-revision-vitest` 7, admin-write 6, task554 6,
  `bookingRoutes.test.ts`, two prefetch receipts, excluded `bunLaneManifest`.
- Files this leaf creates add hits as they land, for example the R3-26
  task-490 test. The closure re-run pins the final count; any other change
  blocks until the orchestrator re-pins it.

### R3-23 — Smoke evidence paths and inventory glosses (MEDIUM)

Supersedes C15 "an evidence gloss in `tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts`
for `_docs/_workflows/_smoke/task-551/03-l02/wf55103l02/*.png`" (`contract
:2790-2792`), C15 "Evidence: screenshots under
`_docs/_workflows/_smoke/task-551/03-l02/wf55103l02/`" (`:2806-2808`) and "10-L01's
final files at the `03-l02/` root do not collide" (`:2809`).

- **Session-derived directory.** The adapter derives its screenshot directory
  as `_docs/_workflows/_smoke/task-551/03-l02/${input.session}/`. The CLI
  already validates the session against `SESSION_PATTERN =
  /^[a-z][a-z0-9-]{2,63}$/u` with no `.`, `/` or `\` (`scripts/runtime-smoke/cli.ts:10`,
  `:61`). The directory is never hard-coded to `wf55103l02`, so 10-L01's
  `wf551l01admin` run writes its own directory.
- **Glosses** that this leaf appends to `ADAPTER_DECLARED_SCREENSHOT_GLOSS`
  (`smoke-evidence-inventory.test.ts:27-48`), each with `adapter` and `reason`:
  1. `task-551-admin-lists` session screenshots:
     `^_docs/_workflows/_smoke/task-551/03-l02/[a-z][a-z0-9-]{2,63}/[a-z0-9-]+\.png$`.
  2. 10-L01 root artifacts:
     `^_docs/_workflows/_smoke/task-551/03-l02/(ui-smoke-v1\.json|[a-z0-9-]+-(light|dark)\.png)$`,
     matching the 17 paths in 10-L01's envelope (`TASK-551-10-L01-...md:1180-1196`).
  3. Task-551 family receipts:
     `^_docs/_workflows/_smoke/task-551/(impl-[a-z0-9-]+\.json|audit-evidence/.*|inventory-rebase-kit/.*)$`.
- **HEAD-red fact (W0 precondition).** The suite is RED at HEAD: `git
  ls-files _docs/_workflows/_smoke/task-551/` lists 27 tracked files (19
  `impl-*.json`, 8 `inventory-rebase-kit/*`), all "un-reconciled". Gloss 3,
  landed in W0, turns it green. Tests pin each gloss with a matching path and
  a rejected one (`../`, an uppercase session, `03-l02/<session>/x.json`).

### R3-24 — C9 reset clears the persisted slot (MEDIUM)

Supersedes the Round-1 C9 reset bullet's last sentence (`contract
:2521-2522`: "Browser storage envelopes are not cleared here; they stay with
L04 FINAL."). Every client's registered reset clears its
`createMemoryBackedLocalCache` first-page slot, as the C9 v2 template already
does (`pagesFirstPage.clear()`, `contract :3721-3722`). `adminUsersClient`
has no slot (R3-18). Test (`task551PaginatedClients.test.ts`, per slot-owning
client): write a default first page, run the L04 reset, and expect the
storage key to be absent and the next read to hit the network.

### R3-25 — Posts page read keeps the name `listPosts` (LOW)

Supersedes `const envelope = await listPostsPage(filters, null);` (`contract
:3813`). The network read is the existing export, widened:
`listPosts(filters: PostListFilters = DEFAULT_POST_LIST_FILTERS, cursor:
string | null = null): Promise<PostListEnvelope>` (`postsClient.ts:359`
today). No `listPostsPage` is added. `postsClient.test.ts:13` (import) and
`:59` (`await listPosts()`) stay 1:1; only the D2 fixture edits apply.

### R3-26 — LOW bundle

- **Caption anchors.** These supersede R2-22 "image `:904-907`,
  video/audio `:1010-1013`, gallery `:993`" (`contract :3833-3835`) and the
  C12 new-suite note "caption detail read" (`contract :2689`).
  Video `:904-907` and audio `:1010-1013` fall back to
  `selectedMedia?.caption`; the image (`:889-890`) reads only `attrs.caption`
  (no fallback); the gallery (`:949-954`, `:993`) reads `item.caption` from
  `mediaById` rows. Tests cover the three fallbacks and pin "image: none".
- **`digestExactOwnedRowIdentity`** exists nowhere in `scripts/`, `core/` or
  `tests/`. The cookbook only shows it (`docs/develop/runtime-smoke-cookbook.md:438`).
  The adapter defines it suite-locally in
  `scripts/runtime-smoke/adapters/task-551-admin-lists/worker-operations.ts`
  (precedent: `task-540/worker-operations.ts:65`, `:313`) and exports it to
  `production-handlers.ts` and `cleanup.ts` only.
- **Registry land order** (`contract :4159-4160`). TASK-414-11-L01 joins
  TASK-555-07-L02, TASK-556-04-L02 and TASK-548 as a concurrent additive
  writer of `scripts/runtime-smoke/registry.ts`.
- **Task-490 materialization test.** New
  `tests/unit/runtime-smoke/task490-browser-actions.test.ts` (allowlisted,
  FINAL only). It calls `materializeTask490BrowserAction`
  (`scripts/runtime-smoke/adapters/task-490/browser-actions.ts:185`) for
  `export-csv` and `export-json`. It asserts that the program waits on
  `POST …/export-jobs`, then polls `GET …/export-jobs/:jobId`, then calls
  `GET …/download`, and that it no longer references `/submissions/export`
  (`:306` today). Precedent: `task488-browser-actions.test.ts:10`. It runs in
  `final-forms-export-bun-tests` and `final-line-count` only, because it does
  not exist during INITIAL.
- **`final-line-count`** gains `tests/vitest/ui-integration/forms-submissions-restyle.test.tsx`.
- **`editor-surface-dead-code.test.ts`** (forbidden) is an execution-only
  orchestrator receipt. It runs after W4's new files are staged, because it
  indexes `git ls-files --cached` plus untracked files (`:19-29`).
- **`displayField` nested-path drop** (R2-24, `contract :3850-3852`). A nested
  `displayField` now falls back to the entry `title`. That is a visible
  behavior change, handed to 10-L02 documentation (C17 v3).
- **Anchors.** Controller `:123-127` and `:258-263` (R3-19); the harness-consumer
  count is 14 (R3-37); `SiteSettingsPage.tsx:258` is
  `listPagesCached({ force: pagesMountOptions.force })` (mount path, the
  option resolved at `:247`), and `:325` is the `cacheKeys.pagesList`
  subscriber's `listPagesCached({ force: true })`. Both move to
  `SiteSettingsPagePickers.tsx` and become `ids` label resolution plus the
  bounded picker list (R2-24).

### R3-27 — 10-L01 mirror (LOW)

Recorded here, applied in 10-L01 (C17 v3): TASK-551-10-L01 owes a dated
correction citing C15 v2. Cleanup is exact `RunFixtureLedger` ownership (the
`task551-03l02-<run>` prefix is a human marker only); the profiles are `fast`
and `certification` (10-L01 runs `certification`); its root artifacts pass
through R3-23 gloss 2, which this leaf adds.

### R3-34 — C10 v3: hash-only page-list author rule (MEDIUM)

Supplements the pages matrix row (`contract :423`,
"`author{id,name,email}`; select encrypted/plain email only to resolve
authorized output"). `pageReadService` builds the page-list DTO `author`
field as follows:

```ts
const email = row.authorId ? resolveEmailValue({ emailEncrypted: row.authorEmailEncrypted, email: row.authorEmail }) : null;
const author = row.authorId && email ? { id: row.authorId, name: row.authorName ?? null, email } : null;
```

This is the 06-L02 R6 rule (`TASK-551-06-L02-...md:444-500`): a hash-only
author row with no decryptable payload yields `author: null`, never `email:
""` and never the hash. `core/services/pages/pageService.ts` belongs to
TASK-551-09-L02, not to this leaf (its allowlist `:328`; mirror
`TASK-551-06-L02-...md:1461-1473`). Its legacy `listPages` rule moves to
09-L02 M1, and this leaf does not edit it.

Route-suite assertion (`task551BoundedAdminLists.test.ts`, DB leg): marker
pages whose authors are an encrypted-email user, a hash-only user (hash in
`users.email`, null `email_encrypted`) and no user return
`author.email` = the plain address, `author: null` and `author: null`. No
response byte contains the hash. The suite seeds `PII_HASH_KEY`/`PII_ENC_KEY`
per R3-35.

### C13 v3 — DB-lane and `none` environments (R3-29, R3-32, R3-35, R3-14)

Supersedes the Validation Commands sentence "The shared `DATABASE_URL` is used
only by the two smokes." (`contract :1121-1122`) where it leaves `none`
commands undefined, and the Validation Commands entries marked "(profile
`none`)" (`contract :1125-1145`) as to their environment.

- **Closed `none` map (R3-29).** Every `bun-test` and `vitest` command with
  profile `none` runs under exactly `env -i PATH=<PATH> HOME=<HOME>
  DATABASE_URL=postgresql://127.0.0.1:1/none`. No other key is set, and no
  DB, maintenance, PII, cursor or cache key is passed. The orchestrator never
  sources `.env` for a `none` command. `tooling` and `runtime-smoke` commands
  keep their literal argv.
- **Sentinel (R3-32).** `TASK551_FIXTURE_DATABASE_SENTINEL` is the value that
  `scripts/task-551-fixture-target-bootstrap.ts` printed for the current
  target. It is 32–512 UTF-8 bytes with no NUL, never hand-authored, and never
  logged in receipts (only its SHA-256 appears).
- **PII keys (R3-35).** Owned DB suites that read or write user emails
  (`task551BoundedAdminLists`, `task551AdminWriteConcurrency`,
  `database-admin-list-budgets`, `rolesService.test.ts`) set test-only
  `PII_HASH_KEY`/`PII_ENC_KEY` with `||=` at module top, as
  `tests/unit/admin/usersService.test.ts:16-17` does. The closed maps never
  carry them. When a foreign or execution-only suite fails only because the
  closed environment lacks a key, the orchestrator reports it and does not
  fix it.
- **Pre-dispatch preconditions** (blocking; the orchestrator runs them once
  per occurrence, read-only):
  1. **Migration ledger.** The migration ledger equals the HEAD journal (C13 v2).
  2. **UTF8 (R3-14).** `select current_setting('server_encoding')` returns
     `UTF8` on the URL3 lane database and on the smoke `DATABASE_URL`.
  3. **Online indexes (R3-35).** All 89 indexes created by
     `core/db/migrations/0081_task551_online_indexes.sql` (sha256
     `35399069330baa449d559c6ea50eb695642ac43e590f6c9e845e14304ea5b092`, 89
     `CREATE [UNIQUE] INDEX` statements, 2026-09-25) exist on `coderso02`
     with `pg_index.indisvalid AND indisready`. The check is one bounded
     catalog query over the 89 names parsed from that file. A shortfall
     blocks `admin-list-performance-test` and `bounded-admin-list-bun-tests`.
  4. **Binary lane (FINAL only, R3-32).** The exported binary-lane result
     type or helper that the TASK-551-08-L03 FINAL FAZA-0 amendment pins
     (`TASK-551-08-L03-...md:760-762`) is present as an `export` in
     `core/server/httpServer.ts` or `core/server/router.ts`. A missing
     amendment or a missing export fails FINAL dispatch.

### C14 v3 — Validation law (R3-30, R3-31, R3-32, R3-36, R3-23, R3-37)

Supersedes the C14 v2 sentence "The orchestrator runs `core-lint-types`,
`core-lint` and `repo-lint-types` after every wave. Line counts run only at
W3, W4 and closure." (`contract :4099-4101`). It also supersedes the W2, W3,
W4 and INITIAL closure rows of the wave table (`:4107-4110`), the
`line-count-1..3` row "the 318 surviving allowlist paths" (`:4095`) and the
original C14 "Wave gates (WU-F)" bullet (`:2773-2777`).

| Wave | Command ids (Round 3) |
|---|---|
| W0 revision chain | `w0-revision-vitest` (46), `test551-db-unit`; then type/lint gates |
| W1 services/routes/races | unchanged from C14 v2; then type/lint gates |
| W2 clients/prefetch | `w2-client-vitest`, `admin-prefetch-budget-receipt`, `admin-prefetch-policy-receipt`, `task554-regression-vitest`; no type/lint gate (W2 changes client signatures that the views adapt only in W3) |
| W3 UI/splits | `admin-pagination-vitest-1`, `admin-pagination-vitest-2`, `owned-module-consumers-vitest-1`, `owned-module-consumers-vitest-2`, `w0-revision-vitest`; then type/lint gates covering W2 and W3 together |
| W4 tests/smoke | `runtime-smoke-registry-tests`, `admin-list-playwright-smoke`, `diff-check`, `diff-check-untracked`, `line-count-1`, `line-count-2`, `line-count-3`; prose `line-gate.sh` |
| INITIAL closure | all 29 INITIAL ids in envelope order, once |
| FINAL | the 11 FINAL ids in envelope order |

- **Type/lint gates (R3-30).** `core-lint-types`, `core-lint` and
  `repo-lint-types` are judged at W0, W1, after W3 and at closure. The R2-20
  "by path" W2 subset is replaced by `w2-client-vitest`, which lists only pure
  client suites (17 paths, profile `none`):
  - `task551PaginatedClients`;
  - the 15 allowlisted `tests/vitest/admin/*Client*.test.ts` suites: pages,
    pagesClientPagination, detailPages, entries, entriesClientPagination,
    entriesClientRevisions, entriesClientMutationReconciliation,
    entriesClientReadAuthority, posts, postsClientCacheAuthority, adminUsers,
    forms, media, mediaClientListEnvelope and booking;
  - `adminPrefetch.test.ts`, the pure suite of the W2-owned `adminPrefetch.ts`.

  W2 creates `task551PaginatedClients.test.ts`,
  `mediaClientListEnvelope.test.ts` and `entriesClientPagination.test.ts`
  before the gate; W0 already created `pagesClientPagination.test.ts`.
- **`repo-lint-types` baseline (R3-36).** Before W0, the orchestrator
  captures a root `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
  baseline on the unmodified tree. Each judgement fails only on NEW errors
  located in this leaf's allowlisted files. A baseline error elsewhere
  neither fails nor passes the gate. This is the 07-L01 C1(e) form
  (`TASK-551-07-L01-...md:1615-1621`) and the 09-L04 orchestrator-gate form
  (`TASK-551-09-L04-...md:1184-1185`).
- **Line counts (R3-31).** `line-count-1..3` run only at W4 and at INITIAL
  closure; `final-line-count` runs at FINAL. The orchestrator parses the `wc
  -l` output. Any per-file count above 1,000, or any missing path (`wc`
  reports it on stderr with a non-zero exit), fails the gate. The prose gate
  is `bash /home/coder/project/Coderso/.claude/scripts/line-gate.sh <pre-family
  baseline>`, run with cwd = this worktree. The script resolves `git rev-parse
  --show-toplevel` from the cwd, and `.claude/` is absent in the worktree. It
  runs after W4 and before closure.
- **W4 file assignments** (from FAZA-0, `03-l02-faza0-dispositions.md:284-288`,
  now binding here): the adapter `task-551-admin-lists.ts` and its
  `contracts`, `fixtures`, `browser-plan`, `suite`, `worker-entry`,
  `worker-operations`, `production-handlers` and `cleanup` modules; the
  `contracts.ts`/`registry.ts`/`cli.ts` entries; their three
  `tests/unit/runtime-smoke/*` suites plus the inventory glosses (whose
  gloss 3 already landed in W0, R3-23); and the `bookingPageFixtures.tsx` →
  `bookingPageFixtureState.tsx`/`bookingPageFixtureMocks.tsx`/`bookingPageFixtureHarness.tsx`
  split with the deletion of `bookingPageFixtures.tsx`.
- **Cross-stream triage (R3-32).** A `diff-check` or `diff-check-untracked`
  failure in a path outside this envelope's allowlist is recorded as
  cross-stream and reported, not fixed. The orchestrator re-runs `git diff
  --check -- <allowlist paths>` to judge this leaf.
- **HEAD-red fact (R3-23)** and **`none` children (R3-37).** The inventory
  suite's red HEAD state (27 files) is fixed in W0 and is not a regression;
  every `none` bun-test/vitest command runs under the C13 v3 closed map.

### C15 v3 — Runtime smoke evidence (R3-23)

C15 v2 stands except for the paths. The screenshots go to
`_docs/_workflows/_smoke/task-551/03-l02/<session>/`, with `<session>` taken
from `input.session`. The runner report stays under the canonical
`_docs/_workflows/_smoke/evidence/task-551/<session>/`. The three R3-23
glosses are the inventory contract. 03-L02 runs `wf55103l02` (`fast`). 10-L01
runs `wf551l01admin` (`certification`) and writes only its session directory
plus the gloss-2 root artifacts.

### C17 v3 — Handoffs (R3-05, R3-07, R3-09, R3-11, R3-26, R3-27, R3-32, R3-34, R3-37)

Supersedes these C17 v2 parts: the "TASK-551-10-L01, TASK-551-10 and
TASK-551-10-L02 (landed). The mirrors carry eight scenarios, session
`wf551l01admin` and `--profile certification`." sentence (`contract
:4222-4224`), the "01-L01 also owns `tests/bun-lane-manifest.json` … the
rebaseline is 01-L01's, not ours." text (`:4218-4221`) and the
"**Query inventory (01-L01).**" list (`:4243-4249`). The other C17 v2
bullets stand.

- **10-L01 / TASK-551-10 (landed wording, R3-37).** They carry
  `wf551l01admin` / `certification`. 10-L02 documents 03-L02's `wf55103l02`
  (`fast`) run and carries no session of its own. 10-L01 owes the R3-27
  dated mirror.
- **10-L02 documentation (owed).** The C17 v2 list gains:
  - the `.env.example` entries `FORM_SUBMISSIONS_EXPORT_TOKEN_SECRET` and
    `FORM_SUBMISSIONS_EXPORT_DIR` with the multi-replica rule (R3-09);
  - the `ADMIN_CACHE_MAP` week key and its sources (R3-07);
  - the four fence codes → 503 rows (R3-11);
  - users list memory-only, never persisted (R3-18);
  - the nested-`displayField` fallback to `title` (R3-26).
- **Backup owner follow-on (R3-05; security impact, not TASK-9999).**
  `backupUsersSection.ts:538-551` counts admins of ANY status, while admin
  writes count only active full-access admins. The owner allocates a leaf to
  the backup owner that aligns `backup_users_restore_no_admin` with the
  active-admin rule or documents why restore keeps any-status semantics. This
  leaf edits neither backup file (both are forbidden).
- **01-L01 bun-lane manifest (R3-37).** 01-L01 FINAL regenerates
  `tests/bun-lane-manifest.json` through its classifier. The regeneration
  includes this leaf's new Bun suites: `task551BoundedAdminLists`,
  `task551AdminWriteConcurrency`, `database-admin-list-budgets`,
  `task-551-admin-lists-{adapter,worker}` and `task490-browser-actions`. The
  item is recorded as open in the TASK-551 parent until 01-L01 mirrors it.
- **Query inventory delta (01-L01, R3-32).** The C17 v2 list stands, and the
  following rows join it:
  - `usersService.ts`: `getAdminUserIdsExcluding` and `userHasAdminRole` are
    removed;
  - `rolesService.ts`: `countUsersWithRoles` is removed;
  - `countActiveAdminUsers` and `isActiveAdmin` are added (tx-bound);
  - the lock statements `acquireNativeCmsWriterFence` and
    `acquireAdminSetLock` (`pg_advisory_xact_lock(551031, 1)`) are added to
    the six locked writers (R3-28);
  - `bookingMutationService.ts`: the create INSERT and the reactivation
    UPDATE carry the exclusion-predicate mapping and at most one `40P01`
    retry, with no conflict SELECT and no advisory lock (R2-02, R3-03).
- **TASK-551-08-L03 (owed mirror, R3-08/R3-32).** The binary lane carries the
  route-installed v1 triple (its C5 is landed at `:710-762`). Its FINAL
  FAZA-0 amendment pins the exported binary-lane name that the C13 v3
  precondition 4 checks.
- **TASK-551-09-L02 (R3-34).** Mirror M1 takes the legacy `listPages`
  hash-only rule; `pageService.ts` stays 09-L02's.
- **Dependencies (R3-37).** The header (`contract :9-11`) is superseded to
  read: INITIAL depends on TASK-554, TASK-551-03-L01, TASK-551-05-L02,
  TASK-551-06-L03, the TASK-551-09-L04 INITIAL Admin-authority receipt and
  the TASK-551-08-L03 INITIAL route-response-header receipt. FINAL depends on
  the TASK-551-08-L03 FINAL binary response lane (graph edge
  `TASK-551-08-L03:final`).
- **Owed sibling mirrors (other files, R3-37).**
  - TASK-551-03: eight scenarios, land order "… 08-L03 FINAL → 03-L02 FINAL
    → 03-L03 …".
  - TASK-551-03-L03 header: "03-L02 INITIAL transitively; no FINAL edge".
  - The TASK-551 parent records the 01-L01 manifest item as open.
- **Anchors (R3-37).** The harness-consumer count is 14, which supersedes "15
  of them are not otherwise allowlisted" (`contract :4004`). The
  `pageService.test.ts` envelope assertion sits at `:198` (and `:273`), which
  supersedes "`:197` and `:273`" (`:3876`).

### Envelope change record (Round 3)

Edited in place on 2026-09-25 by this part. Unchanged: `schema`, `taskId`,
`parent`, `dependencies`, the two occurrence ids and their `dependsOn`, and
every command not named below. Existing entries keep their order; every
addition is appended.

1. **`allowlist` 319 → 321.** Appended `tests/vitest/pages/page-editor-host-contract.test.ts`
   (R3-20) and `tests/unit/runtime-smoke/task490-browser-actions.test.ts`
   (R3-26, FINAL). Part A added no path.
2. **`forbiddenPaths` 47 → 52**, part A delta 2 (R3-05, R3-10, R3-07,
   R3-28). Appended `core/services/backups/backupUsersSection.ts`,
   `core/services/backups/backupImport.ts`, `scripts/task-551-online-indexes.ts`,
   `core/admin/utils/cacheBus.ts` and
   `tests/unit/kits/nativeCmsWriterFenceInventory.test.ts`, which stays
   execution-only in `owned-module-consumers-bun`. There is no
   self-collision.
3. **`commands` 32 → 33.** The following commands changed:
   - `w0-revision-vitest` gains 4 paths (R3-21); argv 46 → 50 tokens;
     `minimum` 42 → 46.
   - `owned-module-consumers-bun` gains `tests/integration/routes/pageTemplates.test.ts`
     (R3-22); `minimum` 40 → 41.
   - `line-count-3` gains the host-contract suite; argv 68 → 69.
   - `final-forms-export-bun-tests` gains the task-490 test; `minimum` 2 → 3.
   - `final-line-count` gains `tests/vitest/ui-integration/forms-submissions-restyle.test.tsx`
     and the task-490 test; argv 11 → 13.
   - Added: `w2-client-vitest` (vitest/`none`, 17 paths, `minimum` 17,
     R3-30), placed after `admin-prefetch-policy-receipt`.
4. **`occurrences.initial.commandIds` 28 → 29.** `w2-client-vitest` is
   inserted after `admin-prefetch-policy-receipt`, because the parser rejects
   an unreferenced command (`task-551-dispatch-contract.mjs:784-785`).
   `final` is unchanged (11 ids).

Parser receipts at `9c5b6666`: the fence parses; every argv has ≤ 128
tokens (128: `admin-pagination-vitest-1`, `line-count-1`, `line-count-2`);
every non-`none` command starts `bun --env-file=/dev/null`; every `minimum`
equals its path count; `line-count-1..3` ∪ `final-line-count` covers the
allowlist except the deleted `bookingPageFixtures.tsx` (the FINAL-created
task-490 test is only in `final-line-count`); every allowlisted test is in a
command; one JSON fence; the family preflight passes.

## Dated Contract Corrections — 2026-09-25 (Round 4: audit closure; append-only)

Source: `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round4-dispositions.md`
(orchestrator decisions R4-01..R4-16 over the Round-3 auditors, HEAD
`9c5b6666`, dirty mirrors). This section applies R4-01..R4-14. R4-15
(TASK-551-10-L02) and R4-16 (TASK-551-11) belong to other files and are
recorded under C17 v4 as owed mirrors. **This section wins** over the body,
FAZA-0 C1–C17, the Round-1 record, both Round-2 parts and both Round-3 parts
where they differ. Source anchors were re-read on 2026-09-25.
**In-place edits (only two).** (1) The JSON envelope fence gains
`w0-smoke-inventory` (R4-10; "Envelope change record (Round 4)"). (2) The
"Validation Commands" section is regenerated from the fence (R4-11). Every
other change below is a quoted supersession.
**Line shift.** The regenerated "Validation Commands" section grew from 50 to
264 lines (+214). The fence gained 11 lines and now spans `contract
:1441-2172`. A `contract :NNN` cited by an earlier part in Round-3 part B
numbering reads unchanged below 1111, as regenerated text for 1111–1160 (old
text quoted under R4-11), NNN + 214 for 1161–1691 and NNN + 225 from 1692.
**Part-A note (R4-05).** Round-3 part A cites pre-part-B lines, and part B
recorded +18 for NNN ≥ 1930. A part-A citation ≥ 1930 therefore reads NNN +
243: part A's `:2984-2990` is `:3227-3233` today. This section cites current
lines. Where a number drifts, the quoted text and named symbol stay
authoritative (part-A anchor rule).

### R4-01 — Per-resource reservation lock replaces the 40P01 retry (HIGH)

Supersedes **R2-02** (`contract :3297-3298`, "`createBookingBlackout` …
keeps no lock and no conflict read; no `hashtext(...)` advisory lock exists
in booking."), which now reads: "`createBookingBlackout` keeps no lock and no conflict read;
the only booking advisory lock is the R4-01 per-resource reservation lock."
Also superseded: **R3-03 in full** (`contract :4829-4888`), namely the
heading "bounded 40P01 retry"; "Concurrent exclusion checks can deadlock
(`40P01`). Both guarded writes are single autocommit statements: … A retry
therefore replays no partial transaction." (`:4839-4841`); `const
RESERVATION_WRITE_MAX_ATTEMPTS = 2; // one retry, 40P01 only` (`:4846`);
`export const isBookingReservationDeadlock` (`:4851-4852`); the
`withReservationExclusion` retry loop (`:4853-4862`); "On retry, the write
sees the committed winner" (`:4864`); "R2-32's "exported for tests only"
list gains `isBookingReservationDeadlock` and `withReservationExclusion`"
(`:4866-4867`); "the deadlock predicate is true at depth 0 and 8, false at 9;
an injected write gives `40P01`+success → 2 calls, … `23P01` → no retry"
(`:4872-4875`); and "An exhausted `40P01` is a failing leg to investigate
(the C13 55P03 rule), never a counted loser." (`:4879-4880`). Also the
Round-3 Security row "Booking writes: `23P01` → `booking_slot_unavailable`,
at most one `40P01` retry, no advisory lock (R3-03)." (`:5177-5178`) and the
C17 v3 row "`bookingMutationService.ts`: the create INSERT and the
reactivation UPDATE carry the exclusion-predicate mapping and at most one
`40P01` retry, with no conflict SELECT and no advisory lock (R2-02, R3-03)."
(`:5844-5846`).
What stands: the exclusion predicate (`23P01` plus the descriptor's
constraint name; own-data walk at depth 0..8), the R2-02 reactivation legs,
the global-blackout leg (exactly one INSERT, no lock, no conflict SELECT) and
the R2-18 501-row week-cap leg.
Writer verification (2026-09-25): `bookings.resource_id` is `.notNull()`
(`core/db/tables/bookings.ts:165-167`). The only `update(bookings)` in
`core/` is the status UPDATE (`bookingService.ts:1034-1038`), so
`resource_id` never changes after insert. Blocking statuses are `["pending",
"confirmed"]` (`:115`). `ensureBookingWindowAvailable` (`:913-957`) reads
through `db`. The public path calls the same service
(`publicBookingApi.ts:391`). No `551_033`/`551033` exists in `core/`,
`scripts/`, `tests/` or `_docs/_TASKS/`.

```ts
// core/services/booking/bookingMutationService.ts
export const BOOKING_RESOURCE_LOCK_NAMESPACE = 551_033; // int4; never renumber (R3-10 inventory)
type BookingTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function acquireBookingResourceLock(tx: BookingTx, resourceId: string): Promise<void> {
  // two-int4 form (551033, hashtext(resource_id)); hashtext returns int4; pg_locks objsubid = 2; opens no transaction
  await tx.execute(sql`select pg_advisory_xact_lock(${BOOKING_RESOURCE_LOCK_NAMESPACE}::int4, hashtext(${resourceId}::text))`);
}
const mapReservationWriteError = (error: unknown): never => { // no deadlock branch, no retry
  if (isBookingReservationExclusionViolation(error)) throw new Error("booking_slot_unavailable");
  throw error;                                                  // anything else stays unmapped (500)
};
// ensureBookingWindowAvailable(executor: typeof db | BookingTx, resourceId, startsAt, endsAt, ignoreBookingId?): body/codes unchanged
export async function createBookingReservation(input: BookingReservationInput) {
  // unchanged and outside the transaction: normalization, service/resource point reads, status checks, binding check
  return db.transaction(async (tx) => {
    await acquireBookingResourceLock(tx, resource.id);                     // statement 1
    await ensureBookingWindowAvailable(tx, resource.id, startsAt, endsAt); // after the grant: sees committed contenders
    try { return (await tx.insert(bookings).values({ /* unchanged */ }).returning())[0] ?? null; }
    catch (error) { return mapReservationWriteError(error); }
  }, { isolationLevel: "read committed" });
}
export async function updateBookingReservationStatus(id: string, status: BookingReservationStatus) {
  const normalized = normalizeStatus(status, reservationStatuses, "pending", "booking_reservation_status_invalid");
  if (!blockingReservationStatuses.includes(normalized))                  // cancel/complete frees time: no lock
    return (await db.update(bookings).set({ status: normalized, updatedAt: new Date() }).where(eq(bookings.id, id)).returning())[0] ?? null;
  return db.transaction(async (tx) => {                                    // reactivation to pending|confirmed
    const [target] = await tx.select({ resourceId: bookings.resourceId }).from(bookings).where(eq(bookings.id, id));
    if (!target) return null;                                              // key read; resource_id is immutable
    await acquireBookingResourceLock(tx, target.resourceId);
    try { return (await tx.update(bookings).set({ status: normalized, updatedAt: new Date() }).where(eq(bookings.id, id)).returning())[0] ?? null; }
    catch (error) { return mapReservationWriteError(error); }
  }, { isolationLevel: "read committed" });
}
// removed: RESERVATION_WRITE_MAX_ATTEMPTS, isBookingReservationDeadlock, withReservationExclusion
```

**Semantics.** Each transaction takes one lock, first. So a resource's
reservation writers run one at a time and cannot deadlock each other. Under
`read committed`, the preflight runs after the grant and sees every
committed contender. A loser therefore fails with the preflight's
`booking_slot_unavailable`, or with the backstop `23P01`, which maps to the
same code (409, `bookingRoutes.ts:85-86`; the public path keeps
`publicBookingApi.ts:236`). Reactivation keeps R2-02's no-preflight behavior, so it gains no
`booking_blackout_conflict`. Different resources never wait on each other,
except on a `hashtext` collision, which only over-serializes. Blackouts take
no lock.
**Tests** (`task551AdminWriteConcurrency.test.ts`). DB-free: the exclusion
predicate is true at depth 0, 3 and 8, and false at depth 9, for another
constraint, `23505`, `40P01`, an accessor `code` and a cyclic `cause`.
Static: no `RESERVATION_WRITE_MAX_ATTEMPTS` and no `"40P01"` remain; each
locked writer holds exactly one `transaction(`; the create callback starts
with `acquireBookingResourceLock`, the reactivation callback with the key
read and then the lock. DB race: 50-way → exactly one active row, 49
`booking_slot_unavailable`, no other code; a `40P01`, `57014` or `55P03`
fails the leg and is never a counted loser. DB lock-wait proof: a second
max-1 session holds `begin; select pg_advisory_xact_lock(551033,
hashtext('<marker resource id>'))`; bounded polling (≤ 5 s, no fixed sleep)
waits for `pg_locks` `locktype = 'advisory' and classid = 551033 and
objid::bigint = (hashtext('<id>')::bigint & 4294967295) and objsubid = 2 and
granted = false`; the waiting create has issued zero counted statements
(R4-04); a create on a second marker resource completes meanwhile (the lock
is per resource); the holder commits, the create completes, and the holder
closes in `finally`.
**Collision inventory (R3-10 extension).** The DB-free pin in
`rolesService.test.ts` adds `(551_033, any key)`, distinct from `(551_031,
1)`, `(551_032, 1)` and every landed namespace. Its DB leg asserts that both
`hashtext` class ids differ from `551031`, `551032` and `551033`
(supersedes "asserts each differs from `551031` and `551032`", `:5061`).

### R4-02 — 18 spec variants and the variant→family pairing (MEDIUM)

Supersedes these R3-01 sentences: "A closed `ADMIN_LIST_SPEC_VARIANTS` table
holds 17 rows (9 fixed + 8 custom-screen variants)." (`contract :4775-4776`);
"A changed pin requires an `ADMIN_LIST_SCOPE_VERSIONS` bump, and the test
asserts the pairing." (`:4783-4784`). Verified: `booking_blackouts.starts_at` is `.notNull()`
(`core/db/tables/bookings.ts:133`). The body matrix orders blackouts
`starts_at DESC,id DESC` in family `booking-blackouts` (`contract :434`).
Each variant ends with `id uuid` in the same direction.

| # | Variant id | Factory (owner) | First field (name type nullable, dir) | Paired scope families |
|---|---|---|---|---|
| 1 | `pages` | `pageListSpec` (`pageReadService.ts`) | `updated_at timestamp false`, desc | `pages` |
| 2 | `entries` | `entryListSpec` (`entryReadService.ts`) | `updated_at timestamp false`, desc | `entries-all`, `entries-type` |
| 3 | `posts` | `postListSpec` (`postReadService.ts`) | `updated_at timestamp false`, desc | `posts` |
| 4 | `forms` | `formListSpec` (`formReadService.ts`) | `updated_at timestamp false`, desc | `forms` |
| 5 | `users` | `userListSpec` (`userReadService.ts`) | `created_at timestamp false`, desc | `users` |
| 6 | `form-submissions` | `submissionListSpec` (`submissionReadService.ts`) | `created_at timestamp false`, desc | `form-submissions` |
| 7 | `media` | `mediaListSpec` (`mediaReadService.ts`) | `created_at timestamp false`, desc | `media` |
| 8 | `booking-reservations` | `bookingReservationListSpec` (`bookingReadService.ts`) | `starts_at timestamp false`, desc | `booking-reservations` |
| 9 | `booking-name-key` | `bookingNameKeySpec` (`bookingReadService.ts`) | `name_key text true`, asc | `booking-resources`, `booking-services` |
| 10 | `booking-blackouts` | `bookingBlackoutListSpec` (`bookingReadService.ts`) | `starts_at timestamp false`, desc | `booking-blackouts` |
| 11 | `cs-text-asc` | `customScreenListSpec(scope, { kind: "text", dir: "asc" })` | `sort_value text true`, asc | `custom-screen-entries` |
| 12 | `cs-text-desc` | same, `{ kind: "text", dir: "desc" }` | `sort_value text true`, desc | `custom-screen-entries` |
| 13 | `cs-created_at-asc` | same, `{ kind: "created_at", dir: "asc" }` | `created_at timestamp false`, asc | `custom-screen-entries` |
| 14 | `cs-created_at-desc` | same, `{ kind: "created_at", dir: "desc" }` | `created_at timestamp false`, desc | `custom-screen-entries` |
| 15 | `cs-updated_at-asc` | same, `{ kind: "updated_at", dir: "asc" }` | `updated_at timestamp false`, asc | `custom-screen-entries` |
| 16 | `cs-updated_at-desc` | same, `{ kind: "updated_at", dir: "desc" }` | `updated_at timestamp false`, desc | `custom-screen-entries` |
| 17 | `cs-published_at-asc` | same, `{ kind: "published_at", dir: "asc" }` | `published_at timestamp true`, asc | `custom-screen-entries` |
| 18 | `cs-published_at-desc` | same, `{ kind: "published_at", dir: "desc" }` | `published_at timestamp true`, desc | `custom-screen-entries` |

The pairing is total in both directions. Each of the 13
`ADMIN_LIST_SCOPE_VERSIONS` families (`contract :3680-3682`) has at least one
variant, and each variant has at least one family.

```ts
// tests/integration/routes/task551BoundedAdminLists.test.ts (DB-free block)
type SpecPin = Readonly<{ version: number; fieldsSha256: string }>;
const ADMIN_LIST_SPEC_PIN_HISTORY: Readonly<Record<AdminListSpecVariantId, readonly SpecPin[]>>;           // append-only
const ADMIN_LIST_VARIANT_FAMILIES: Readonly<Record<AdminListSpecVariantId, readonly AdminListScopeFamily[]>>; // table above
// per variant V: latest(V).fieldsSha256 === sha256(canonicalJson(factoryOf(V)("admin:test:v1:0").fields)); versions
//   strictly increase from 1 with differing consecutive hashes; latest(V).version <= ADMIN_LIST_SCOPE_VERSIONS[F] per paired F.
// per family F: ADMIN_LIST_SCOPE_VERSIONS[F] === max(latest(V).version) over the variants paired with F.
```

**Bump rule (per family).** A changed pin appends `{ version: n + 1,
fieldsSha256 }` to the variant's history. Every family paired with that
variant bumps to the same version in the same change. So `booking-name-key`
bumps `booking-resources` and `booking-services` together, `entries` bumps
both entry families, and any `cs-*` variant bumps `custom-screen-entries`.
The R3-01 conformance checks and R2-12(a) `.notNull()` parity iterate all 18
rows.

### R4-03 — Wire vs decoded test literals (MEDIUM)

Supersedes the R3-12 test literals "`ids=<U>,<u>`, upper and lower case of one
UUID, → `validation_error`; `ids=<u>,<u>` → `validation_error`; … `tags=a%2Cb`
round-trips as one tag; `tags=%E0%A4` … → `validation_error`" (`contract
:5099-5102`). Verified: `ctx.query` is `Object.fromEntries(url.searchParams.entries())`
(`core/server/httpServer.ts:495`), so a route sees each value decoded once.

| Route-suite wire literal | Route receives | Expected |
|---|---|---|
| `tags=a%252Cb` | `a%2Cb` | one tag `a,b` (the rule decodes after the split) |
| `tags=%25E0%25A4` | `%E0%A4` | malformed decode → `validation_error` |
| `tags=a%2Cb` (negative control) | `a,b` | two tags `a` and `b` |
| `ids=<U>,<u>` | unchanged | pattern rejection (lowercase-only `U` class) → `validation_error` |
| `ids=<u>,<u>` | unchanged | duplicate rejection → `validation_error` (the duplicate proof) |

Lowercase-only `ids` acceptance joins the Security Contract rows below and
the 10-L02 `CMS_API` handoff (C17 v4).

### R4-04 — Statement classifier; `assertRoleIdsExist` inside the lock (MEDIUM)

Supersedes: the membership of R2-30's "advisory-lock and fence probes form a
separate `lock` bucket asserted by write-path tests" (`contract :3748-3749`);
R2-01 `await assertRoleIdsExist(roleIds); // UX preflight only` (`:3247`);
R3-04 "the writer's R2-30 counter holds only `lock`-bucket statements (fence
probe, lock) and zero counted statements" (`:4901-4903`). Verified: the ordinary fence issues two SELECTs:
`pg_try_advisory_xact_lock_shared(…)` and the marker read `from
solution_kit_install_runs` (`core/db/nativeCmsWriterFence.ts:100-118`).
`assertRoleIdsExist` reads `roles` through `db` (`usersService.ts:84-90`).
`setUserRoles` calls it before any lock (`:243`).

```ts
// tests/perf/fixtures/task551AdminListDescriptors.ts (owned; imported by the three owning suites only)
export type Task551StatementBucket = "excluded" | "lock" | "counted" | "other";
const TX_CONTROL = /^\s*(begin|start\s+transaction|set\s+transaction|set\s+local|commit|rollback|savepoint|release)\b/iu;
export const TASK551_LOCK_CALL = /pg_(try_)?advisory_xact_lock(_shared)?\(/u;
const FENCE_MARKER_SELECT = /^\s*select\b[\s\S]*\bfrom\s+solution_kit_install_runs\b/iu;
const COUNTED = /^\s*(select|with|insert|update|delete)\b/iu;
export function classifyTask551Statement(text: string): Task551StatementBucket {
  if (TX_CONTROL.test(text)) return "excluded";
  if (TASK551_LOCK_CALL.test(text) || FENCE_MARKER_SELECT.test(text)) return "lock"; // checked before COUNTED
  return COUNTED.test(text) ? "counted" : "other";
}

// core/services/admin/usersService.ts
async function assertRoleIdsExist(roleIds: string[], executor: typeof db | AdminSetTx = db): Promise<void>; // body unchanged
export async function setUserRoles(userId: string, roleIds: string[]) {
  return db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    await acquireAdminSetLock(tx);
    await assertRoleIdsExist(roleIds, tx); // moved: first counted statement, after the lock; role_invalid unchanged
    const [target] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
    // … R3-28 body unchanged (guard, user_roles delete + insert on tx)
  }, { isolationLevel: "read committed" });
} // createUser (:136) keeps the default-executor call (it only adds admins; no lock)
```

**Tests** (`task551AdminWriteConcurrency.test.ts`). **DB-free.** The classifier maps both advisory-lock calls and the fence marker
SELECT to `lock`, `BEGIN`/`SET LOCAL`/`COMMIT` to `excluded`, and `select id
from roles …` to `counted`. **Lock-wait proof.** Each of the six writers
issues no statement before `BEGIN`. While it waits, it has issued zero
`counted` statements after `BEGIN`. `setUserRoles` issues its `roles` SELECT
only after the grant. An unknown role id still yields `role_invalid` and
writes nothing.

### R4-05 — LOW bundle

**Fence-code pin owner.** One DB-free block in
`tests/integration/server/task551AdminWriteConcurrency.test.ts` owns two pins:
R3-11's "A DB-free block pins the 8 rows (4 codes × 2 mappers)" (`contract
:5074-5075`) and R2-01's "A DB-free block pins the four 503 mapper rows."
(`:3287`). **Private walk.** Supersedes R3-03's "//
bookingErrorCandidates(error): the mediaFoldersService.ts:38-56 walk with the
cap above" (`:4847`). `bookingMutationService.ts` declares its own private
`readOwnDataValue` and `bookingErrorCandidates` (9 candidates, `seen` guard).
It imports nothing from `core/services/media/mediaFoldersService.ts`, and a
static test pins that. **R3-13 base properties.** Supersedes `/* q, status,
limit as today */` (`:5117`). Beside the R3-13 keys, the typed-route query
declares exactly these:

| Key | Schema | Source |
|---|---|---|
| `q` | `{ type: "string", maxLength: 200 }` | C3 |
| `status` | `{ enum: ["draft", "published", "scheduled", "archived"] }` | `contentSchemas.ts:104-107` |
| `limit` | `{ type: "integer", minimum: 1, maximum: 100 }`, default 50 | `contract :1384-1385` |
| `authorId` | the lowercase `U` pattern | |
| `updatedFrom`, `updatedTo` | strict ISO dates | body `contract :424` |
| `facetKind` | `{ enum: ["authors"] }` | C3 facets `:2434-2442` |
| `facetQ` | `{ type: "string", maxLength: 100 }` | C3 facets `:2434-2442` |

`typeSlug` stays global-route only. The part-A shift is under "Line shift";
the 10-L02 items are under C17 v4.

### R4-06 — `useBoundedAdminList` has two declared modes (MEDIUM)

Supersedes these R3-17 parts: `type Mode = "replace" | "append";` (`contract
:5354`); `BoundedListStatus` (`:5356`); the `loadMore`/`previous`/`revalidate`
reducer cases (`:5371-5376`); the owning-test sentence starting "The owning
test is `tests/vitest/admin/task551PaginatedListViews.test.tsx`"
(`:5427-5431`). These R3-17 rules stand: no synchronous `setState` in effect bodies; lazy
hydration followed by one forced read; dispatch from async callbacks only;
`reset(next)` called from change handlers; drafts kept outside list rows; the
append dedupe by `id`.
**View → mode table.** `mode` is a required hook option with no default. A
mode change needs an orchestrator decision.

| View (owner after the C11 splits) | Mode |
|---|---|
| `PageListPage`, `PostsListPage`, `EntryList` (global and typed), `CustomScreenEntriesPage`, `FormListPage`, `FormSubmissionsPage`, the `UsersRolesPage` users list, and the `BookingPage` reservations and blackouts | `paged` |
| `BookingPage` resources and services tabs and their pickers (body `contract :430-431`, "visible picker/page load-more"), `MediaLibraryPage` results and the media picker, revision histories on the hook (`PageEditorHistorySheet`, `DetailTemplateRevisionPanel`), and bounded pickers (`PageEditorRegistryPickers`, `SiteSettingsPagePickers`, relation pickers) | `append` |

```ts
// core/admin/ui/shared/useBoundedAdminList.ts
export type BoundedListMode = "paged" | "append"; export const MAX_APPEND_DEPTH = 20; // append depth; bounds revalidate
export type BoundedListStatus = "loading" | "ready" | "loadingMore" | "error" | "reset"; // "reset": R4-07
type Stack = readonly (string | null)[];               // cursor of each shown page; [null] = first page
type Request = Readonly<{ kind: "page"; cursor: string | null; stack: Stack; merge: boolean; force: boolean }>
  | Readonly<{ kind: "chain"; depth: number }>;        // append revalidate, always forced
type LoadResult<I, S, F> = Readonly<{ kind: "page"; read: AdminListRead<I, S, F> }>
  | Readonly<{ kind: "chain"; reads: readonly AdminListRead<I, S, F>[]; stack: Stack }> | Readonly<{ kind: "reset" }>;
// State = R3-17 State + `mode`, pending { token, filters, request }, lastRequest: Request; Action += "next"; loaded carries `result`
function reducer<I extends { id: string }, S, F, Fl>(state: State<I, S, F, Fl>, action: Action<I, S, F, Fl>): State<I, S, F, Fl> {
  const page = (cursor: string | null, stack: Stack, merge: boolean, force: boolean): Request => ({ kind: "page", cursor, stack, merge, force });
  switch (action.type) {
    case "reset": return initState(state.mode, action.filters, action.hydrated, state.seq);
    case "next": return state.mode !== "paged" || !state.hasMore || state.pending ? state          // paged: REPLACE
      : issue(state, page(state.nextCursor, [...state.cursorStack, state.nextCursor], false, false), "loading");
    case "previous": return state.mode !== "paged" || state.cursorStack.length < 2 || state.pending ? state
      : issue(state, page(state.cursorStack.at(-2) ?? null, state.cursorStack.slice(0, -1), false, false), "loading");
    case "loadMore": return state.mode !== "append" || !state.hasMore || state.pending
        || state.cursorStack.length >= MAX_APPEND_DEPTH ? state                                     // append: ACCUMULATE
      : issue(state, page(state.nextCursor, [...state.cursorStack, state.nextCursor], true, false), "loadingMore");
    case "revalidate": return state.mode === "paged"
      ? issue(state, page(state.cursorStack.at(-1) ?? null, state.cursorStack, false, true), state.status)
      : issue(state, { kind: "chain", depth: Math.min(state.cursorStack.length, MAX_APPEND_DEPTH) }, state.status);
    case "retry": return state.status !== "error" || !state.lastRequest ? state : issue(state, state.lastRequest, "loading");
    case "loaded": {
      if (state.pending?.token !== action.token) return state;                                   // non-latest ignored
      const { result } = action; const request = state.pending.request;
      if (result.kind === "reset") return { ...state, items: [], summary: null, facets: null, cursorStack: [null],
        nextCursor: null, hasMore: false, status: "reset", error: null, pending: null };
      const reads = result.kind === "chain" ? result.reads : [result.read];
      const merge = request.kind === "page" && request.merge;
      const items = dedupeById([...(merge ? state.items : []), ...reads.flatMap((read) => read.items)]); // chain: atomic
      const head = merge ? null : reads[0] ?? null;
      const summary = head && hasAdminListSummary(head) ? head.summary : merge ? state.summary : null;
      const facets = head && hasAdminListSummary(head) ? head.facets : merge ? state.facets : null;
      const last = reads.at(-1) ?? { nextCursor: null, hasMore: false };
      const cursorStack = result.kind === "chain" ? result.stack : request.kind === "page" ? request.stack : state.cursorStack;
      return { ...state, items, summary, facets, cursorStack, nextCursor: last.nextCursor, hasMore: last.hasMore,
        status: "ready", error: null, pending: null };
    }
    case "failed": return state.pending?.token !== action.token ? state
      : { ...state, status: "error", error: action.message, pending: null };                     // old list kept
  }
}
async function runRequest<I, S, F, Fl>(fetchPage: FetchPage<I, S, F, Fl>, filters: Fl, request: Request): Promise<LoadResult<I, S, F>> {
  if (request.kind === "page") {
    const read = await fetchPage(filters, request.cursor, { force: request.force });
    return isAdminListResetPage(read) ? { kind: "reset" } : { kind: "page", read };
  }
  const reads: AdminListRead<I, S, F>[] = []; const stack: (string | null)[] = []; let cursor: string | null = null;
  for (let index = 0; index < request.depth; index += 1) {            // sequential from null, fresh cursors; depth >= 1
    const read = await fetchPage(filters, cursor, { force: true });   // any rejection rejects the whole chain
    if (isAdminListResetPage(read)) return { kind: "reset" };
    reads.push(read); stack.push(cursor);
    if (!read.hasMore || read.nextCursor === null) break;             // the list got shorter
    cursor = read.nextCursor;
  }
  return { kind: "chain", reads, stack };
}
// effect: runRequest(...).then(loaded | failed, keyed by pending.token); initState: stack [null], first page forced when hydrated
```

**Footer.** `BoundedListFooter` renders Previous and Next in `paged` mode.
In `append` mode it renders Load more, which is `aria-disabled` at
`MAX_APPEND_DEPTH` with a "refine the filters to see more" hint.
**Tests** (`tests/vitest/admin/task551PaginatedListViews.test.tsx`: the R3-17
list plus the following): paged: `next` replaces the rows and `previous`
restores the prior cursor; mode guards: `loadMore` is ignored in `paged`, and
`next`/`previous` are ignored in `append`; append revalidate keeps the depth:
three loaded pages lead to three sequential forced calls from `null`, then one
atomic replace; a rejected second chained page keeps the old list with status
`error`, and `retry` reissues the chain; depth 20 ignores `loadMore`; an early
`hasMore: false` shortens the stack; a reset page gives status `reset` and no
rows.
**Smoke.** C15 scenario (1) `pagination-next-previous` covers the `paged`
views. Scenario (4) `booking-dirty-refresh` covers both modes (reservations
`paged`, resources and services `append`) and asserts that a background
refresh keeps the append depth.

### R4-07 — Overtaken-read re-check order (MEDIUM)

Supersedes these parts of R3-16: `try { return await newer; } catch { /* the
newer caller sees its own error; fall through */ }` (`contract :5313`); the
return value of the **Plain empty.** bullet (`:5325-5328`); test (c) "B
rejects, and A falls to memory, then the slot, then empty" (`:5340-5341`).
It also supersedes R3-18's "listAdminUsersPageCached follows R3-16 with steps
1, 2 and 4 only" (`:5456`). These stand: the R3-16 "installs nothing" rule; the order newer → memory →
slot → empty; the posts epoch-advance exception (`:5331-5337`). It is not a
per-key overtake, and TASK-554 pins it (`TASK-554_...md:1574-1582`).

```ts
// core/admin/services/adminListEnvelope.ts
const RESET_PAGE = Object.freeze({ items: Object.freeze([]), nextCursor: null, hasMore: false });
export const adminListResetPage = <I>(): AdminListPage<I> => RESET_PAGE as unknown as AdminListPage<I>; // 3 own keys (R3-15)
export const isAdminListResetPage = (read: unknown): boolean => read === RESET_PAGE;        // identity, not shape

// core/admin/services/pagesClient.ts (shared by the eight generic page methods; adminUsersClient minus step 3)
const pageLatest = new Map<string, Promise<PageListRead>>(); // set beside pagePromises on creation; the L04 reset clears it
request = listPagesPage(filters, cursor).then(async (envelope): Promise<PageListRead> => {
  if (!isCurrentAdminCacheInstallationToken(token) || generation !== pagesGeneration)
    return adminListResetPage<PageListItem>();                                   // (R) reset / identity transition
  if (pageGenerations.get(key) !== keyGeneration)
    return resolveOvertakenPageRead(key, filters, request, token, generation);   // (O)
  /* install exactly as R3-16 */ return envelope;
});
async function resolveOvertakenPageRead(key: string, filters: PageListFilters, self: Promise<PageListRead>,
  token: AdminCacheInstallationToken, generation: number): Promise<PageListRead> {
  const current = () => isCurrentAdminCacheInstallationToken(token) && generation === pagesGeneration;
  const latest = pageLatest.get(key);                                            // self or a strictly newer request
  if (latest !== undefined && latest !== self) {
    const read = await latest;                                                   // a rejection PROPAGATES (status `error`)
    return current() ? read : adminListResetPage<PageListItem>();                // re-check after EVERY await
  }
  if (!current()) return adminListResetPage<PageListItem>();
  return readVerifiedAdminListPage(pageCache, key, filters)                      // key advanced without a newer request
    ?? (isDefaultFirstKey(key) ? readPersistedFirstPage(pagesFirstPage, filters) : null)
    ?? emptyAdminListPage<PageListItem>();
}
```

**Reset.** A family reset, an installation reset or an identity transition
resolves the reset page, before or after any await. It never resolves rows
installed after the reset. The hook maps the reset page to status `reset`
(R4-06). A family invalidation is always followed by the cacheBus
`revalidate()`, whose newer hook token makes the hook ignore that reset
result. **Newer rejects.** If the newer request rejects, the overtaken caller
rejects with the same error. The hook shows `error` and keeps its old rows.
The caller never falls back to memory or slot rows. **Termination.** `latest`
is `self` or newer, so the chain is finite. **Users.** `adminUsersClient`
keeps a `userPageLatest` map with the same rule, minus the slot step. It stays
memory-only (R3-18).
**Tests** (`task551PaginatedClients.test.ts`): (a) and (b) stand; (d) and (e) now assert `isAdminListResetPage`; new (c): B
rejects, A rejects with B's error, and no cache or slot read happens; (f): the
L04 reset fires while A awaits B; B completes; both resolve the reset page and
nothing is installed; (g): (c) and (f) repeated for `adminUsersClient`.

### R4-08 — Week cache: request token and reset registration (MEDIUM)

Extends R3-07 (`contract :4955-4991`). It supersedes the R3-07 comment
"fill the Map only if the generation is unchanged (a stale completion is
returned, never cached)." (`:4976`) where that comment leaves the L04 reset
out of the week state. The L04 seam is consumed only. It exports
`captureAdminCacheInstallationToken`, `isCurrentAdminCacheInstallationToken`
and `registerAdminModuleCacheReset`
(`core/admin/utils/adminCacheAuthority.ts:93-100`, a forbidden path).

```ts
// core/admin/services/bookingClient.ts (additions to R3-07)
registerAdminModuleCacheReset(() => { // invalidate = clear both maps + weekGeneration += 1; unsubscribe (lazy re-subscribe)
  invalidateBookingWeekCache(); weekSubscription?.(); weekSubscription = null; });
export async function listReservationsWeek(query: BookingWeekQuery, options?: { force?: boolean }) {
  ensureWeekSubscription(); const token = captureAdminCacheInstallationToken(); const generation = weekGeneration;
  const page = await singleFlightWeekFetch(key, query, options);                    // R3-07
  if (!isCurrentAdminCacheInstallationToken(token)) return EMPTY_BOOKING_WEEK_PAGE;  // never another audience's rows
  if (generation === weekGeneration) weekCache.set(key, { page });                  // stale completion: not cached
  return page;
}
```

`BookingPage.tsx` keeps a `weekRequestRef` (touched in callbacks only, never
read in render); each week load increments it, and a completion or error
applies only when its token is still the latest. So a stale week completion
is never rendered (request token) and never cached (generation and
installation checks). **Tests.** `bookingClient.test.ts`: the L04 reset clears the week map, the in-flight map and the subscription. A
`bookingReservationsList` event before the next read triggers nothing, and the
next read subscribes once. A completion after an installation-token advance
returns the empty week and caches nothing. `booking-page-wave.test.tsx`: of two overlapping week reads, where the first
resolves last, only the second renders.

### R4-09 — `UsersRolesPage` ≤ 850; fixture split moves to W2 (MEDIUM)

**Budget.** Supersedes R3-19 `users/UsersRolesPage.tsx` "≤ 820 (was ≤ 750)"
(`contract :5476`). The new budget is ≤ 850, counting call-site and hook glue.
The moved ranges stand. **Split timing.** Supersedes the C14 v3 W4 text "and
the `bookingPageFixtures.tsx` →
`bookingPageFixtureState.tsx`/`bookingPageFixtureMocks.tsx`/`bookingPageFixtureHarness.tsx`
split with the deletion of `bookingPageFixtures.tsx`" (`:5781-5783`). **W2
split.** W2 performs the split as a pure move by cohesive responsibility, with
zero behavior change: `State`: data builders and fixture state; `Mocks`:
`vi.mock` factories and client wiring; `Harness`: render helpers. **Deletion
and consumers.** W2 deletes `bookingPageFixtures.tsx` (1,123 lines). Its four
consumers change imports only: `booking-page-wave`, `booking-page-errors`,
`booking-page-schedule-crud` and `booking-page-tabs`
(`tests/vitest/ui/*.test.tsx`; found with `grep -rln bookingPageFixtures
tests` on 2026-09-25). **W3.** W3 then adapts the mocks. No behavior is ever
added to the over-limit file (AGENTS: split before adding behaviour). All
three new paths are already allowlisted and in `line-count-2`. **W2 proof**
(prose orchestrator gate in "Validation Commands"): the four suites are green
before and after the split, with identical test names and counts. `wc -l`
shows each new file ≤ 1,000 and the old file gone.

### R4-10 — `FAMILY_RECEIPT_GLOSS` and `w0-smoke-inventory` (MEDIUM)

Supersedes: R3-23 "**Glosses** that this leaf appends to
`ADAPTER_DECLARED_SCREENSHOT_GLOSS`" (`contract :5571`); gloss 3
`^_docs/_workflows/_smoke/task-551/(impl-[a-z0-9-]+\.json|audit-evidence/.*|inventory-rebase-kit/.*)$`
(`:5578-5579`); "Gloss 3, landed in W0, turns it green. Tests pin each gloss
with a matching path and a rejected one (`../`, an uppercase session,
`03-l02/<session>/x.json`)." (`:5582-5584`); the C14 v3 W4 text "plus the
inventory glosses (whose gloss 3 already landed in W0, R3-23)" (`:5780-5781`).
Verified 2026-09-25: `ADAPTER_DECLARED_SCREENSHOT_GLOSS` is at
`tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts:27-48`, and
`Disposition` at `:50`. The file has 174 lines. Git tracks 19 `impl-*.json`
and 8 kit files under the family directory. The kit files are `README.md`,
`discovered.json`, `new-rows.scanned.json`, `old-inventory.json`,
`stale-rows.json`, `emit-rows.ts`, `regen-inventory.ts` and
`write-artifacts.ts`. `audit-evidence/` holds 5 untracked
`[a-z0-9-]+\.(md|json)` files. 10-L01 declares `runtime/redis-smoke-v1.json`
(`TASK-551-10-L01-...md:59`, `:1182`). **Writer correction.** `new-rows.scanned.json` has an inner `.`, so the kit
regex does not match it. It is pinned by exact path.

```ts
// tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts (W0)
type Disposition = "canonical" | "adapter-declared" | "family-receipt" | "archive" | "unreconciled";
const FAMILY_RECEIPT_GLOSS = Object.freeze([ // no "." or ".." segment can match
  { owner: "TASK-551 implement receipts", regex: /^_docs\/_workflows\/_smoke\/task-551\/impl-[a-z0-9-]+\.json$/u },
  { owner: "TASK-551 audit evidence", regex: /^_docs\/_workflows\/_smoke\/task-551\/audit-evidence\/[a-z0-9-]+\.(md|json)$/u },
  { owner: "TASK-551-01-L01 rebase kit", regex: /^_docs\/_workflows\/_smoke\/task-551\/inventory-rebase-kit\/(README\.md|[a-z0-9-]+\.(json|md))$/u },
  { owner: "TASK-551-10-L01", regex: /^_docs\/_workflows\/_smoke\/task-551\/runtime\/redis-smoke-v1\.json$/u },
  { owner: "task-551-admin-lists sessions", regex: /^_docs\/_workflows\/_smoke\/task-551\/03-l02\/[a-z][a-z0-9-]{2,63}\/[a-z0-9-]+\.png$/u },
]);
const FAMILY_RECEIPT_EXACT_PATHS = Object.freeze([ // listed from disk; never a wildcard
  "_docs/_workflows/_smoke/task-551/inventory-rebase-kit/emit-rows.ts",          // owner: TASK-551-01-L01
  "_docs/_workflows/_smoke/task-551/inventory-rebase-kit/regen-inventory.ts",    // owner: TASK-551-01-L01
  "_docs/_workflows/_smoke/task-551/inventory-rebase-kit/write-artifacts.ts",    // owner: TASK-551-01-L01
  "_docs/_workflows/_smoke/task-551/inventory-rebase-kit/new-rows.scanned.json", // owner: TASK-551-01-L01
]);
// order: canonical -> adapter-declared -> family-receipt (exact path or gloss) -> archive -> unreconciled
```

**Gloss placement.** R3-23 gloss 1 (session screenshots) moves into entry 5
and is not duplicated. Gloss 2 (10-L01 root artifacts) stays in
`ADAPTER_DECLARED_SCREENSHOT_GLOSS`. A test asserts that no tracked path
matches two gloss entries. **Rejection tests.** Each of these resolves to
`unreconciled`: `../` segments: `…/impl-../x.json` and
`…/audit-evidence/../x.md`; an unpinned `.ts`:
`…/inventory-rebase-kit/evil.ts`; uppercase: `…/impl-03-L02.json` and
`…/03-l02/Wf55103l02/a.png`; a second-level directory:
`…/audit-evidence/sub/x.md`. **Positive tests.** Every exact path matches,
plus one sample per regex. **Command.** `w0-smoke-inventory` = `bun
--env-file=/dev/null test
tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts` (bun-test, profile
`none`, `minimum` 1) runs at W0. `runtime-smoke-registry-tests` stays at W4.
The R3-23 HEAD-red fact stands, and W0 turns the suite green.

### R4-11 — Validation Commands regenerated from the fence (MEDIUM)

The old prose (former `contract :1111-1160`, Round-3 part B numbering) is
superseded in full and removed. Its superseded sentences include: "The
envelope below is the machine authority; these lines mirror it (C14, as
amended by R2-07, R2-08, R2-20 and R2-26; rewritten in place 2026-09-25, Round
2 part 2)." (former `:1113-1115`);
`TASK551_FIXTURE_DATABASE_SENTINEL=<bootstrap sentinel>` (former `:1119`);
"(42 paths, W0 gate)" (former `:1130`); the fence has 46; "(40 paths,
execution-only)" (former `:1133`); the fence has 41; an INITIAL list without
`w2-client-vitest`; FINAL lines without
`tests/unit/runtime-smoke/task490-browser-actions.test.ts`, and a FINAL `wc
-l` without `tests/vitest/ui-integration/forms-submissions-restyle.test.tsx`
(former `:1148`, `:1152`); "`bash .claude/scripts/line-gate.sh <pre-family
baseline>` after W3 and before closure (R2-35)" (former `:1155-1158`). The regenerated section (`contract :1111-1374`) holds: all 34 commands in
envelope order, each with its exact argv (checked by script on 2026-09-25 to
be byte-identical to the fence `"argv"` arrays), lane, profile, environment
map, `minimum` and waves; the closed `<none-env>` and `<db-env>` maps; the
absolute line-gate path; the type-gate schedule; the rule "the fence is
authoritative".

### R4-12 — Line-gate triage and the TASK-551-11 precondition (MEDIUM)

Extends the C14 v3 **Line counts (R3-31)** bullet (`contract :5767-5774`,
ending "It runs after W4 and before closure."). **Triage.** The family-wide `bash
/home/coder/project/Coderso/.claude/scripts/line-gate.sh <pre-family
baseline>` run is judged on two sets: files in the 03-L02 allowlist and files
touched by 03-L02 (its wave diffs). An over-limit file in either set fails the
gate. **Foreign files.** Any other over-limit file is a cross-stream finding.
The receipt records its path, line count and owning task, and 03-L02 does not
fix it. **Strict commands.** `line-count-1..3` and `final-line-count` stay
strict over their paths. **Precondition 5 (C13 v4).** The TASK-551-11 split of
`tests/unit/workflows/task551AuthorAudit.test.ts` (1,241 lines on 2026-09-25)
into three files of ≤ 700 lines each lands before W0.

### R4-13 — `repo-lint-types` is an error-set diff (MEDIUM)

Supersedes R3-36 "Each judgement fails only on NEW errors located in this
leaf's allowlisted files. A baseline error elsewhere neither fails nor passes
the gate." (`contract :5762-5764`). Reason: Vitest does not type-check
consumers.

```ts
// orchestrator rule (pseudocode; no repository file); parse `path(line,col): error TSnnnn: message` from root tsc
const key = (e: { path: string; code: string; message: string }) => // line/column dropped: moved lines are not new
  `${e.path}\u0000${e.code}\u0000${e.message.replace(/\s+/gu, " ").trim()}`;
// baseline = multiset of keys, captured ONCE before W0 on the unmodified tree (receipt stores digests)
// after W0, W1, W3 and at closure: any key in multisetDifference(current, baseline) -- in tests/, scripts/,
//   packages/ or any other root-tsc path -- is a BLOCKING 03-L02 finding; vanished errors are reported only
```

The baseline is never re-captured mid-family. A new error is fixed in the
owning wave or escalated to the orchestrator as a blocker. It is never filed
as cross-stream.

### R4-14 — Sentinel wording (MEDIUM)

Supersedes: the C13 v3 **Sentinel (R3-32)** bullet
"`TASK551_FIXTURE_DATABASE_SENTINEL` is the value that
`scripts/task-551-fixture-target-bootstrap.ts` printed for the current target.
It is 32–512 UTF-8 bytes with no NUL, never hand-authored, and never logged in
receipts (only its SHA-256 appears)." (`contract :5696-5699`); the C13 v2 map
entry `TASK551_FIXTURE_DATABASE_SENTINEL=<bootstrap sentinel>` (`:4250`).
**New wording.** The sentinel is an operator-supplied input. The bootstrap
reads it as `TASK551_FIXTURE_BOOTSTRAP_SENTINEL`
(`scripts/task-551-fixture-target-bootstrap.ts:407`). It validates 32–512
UTF-8 bytes (`:9-10`, `:413-414`), with no NUL, and stores the value in
`public.task551_fixture_sentinel`. It reports only
`boundSentinelByteMatched` (`:510`) and never prints the value. The value pinned for this leaf's gates is the orchestrator constant
`task551-fixture-sentinel-2026-09-25-coderso02-orchestrator` (58 bytes). It
is not a credential. Receipts still record only its SHA-256.

### C14 v4 — Validation law rows (R4-09, R4-10, R4-12, R4-13, R4-14)

Supersedes these C14 v3 wave-table rows: W0 "`w0-revision-vitest` (46),
`test551-db-unit`; then type/lint gates" (`contract :5737`); W2 (`:5739`);
"INITIAL closure | all 29 INITIAL ids in envelope order, once" (`:5742`).
The W1, W3, W4 and FINAL rows stand.

| Wave | Command ids (Round 4) |
|---|---|
| W0 revision chain | `w0-revision-vitest` (46), `w0-smoke-inventory` (R4-10), `test551-db-unit`; then type/lint gates |
| W2 clients/prefetch | `w2-client-vitest`, `admin-prefetch-budget-receipt`, `admin-prefetch-policy-receipt`, `task554-regression-vitest`, and the prose fixture-split proof (R4-09); no type/lint gate |
| INITIAL closure | all 30 INITIAL ids in envelope order, once |

Gate rules: The line gate is judged under R4-12. `repo-lint-types` is judged
by the R4-13 diff at W0, W1, after W3 and at closure. `<db-env>` carries the
R4-14 constant. "Validation Commands" mirrors these rows, and the fence stays
authoritative (R4-11).

### C13 v4 — Pre-dispatch preconditions

The C13 v3 list (`contract :5708-5724`) stands and gains item 5,
**TASK-551-11 split (R4-12, R4-16).** `task551AuthorAudit.test.ts` and its split siblings are each
≤ 700 lines, and the TASK-551-11 receipt records the split. Otherwise INITIAL
W0 is blocked.

### Security Contract rows (Round 4)

**Booking writes.** A per-resource exclusive lock `(551033,
hashtext(resource_id))` is taken first in the create and reactivation
transactions. The preflight (create only) and the write follow. `23P01` →
`booking_slot_unavailable` (409), with no retry. Blackouts take no lock
(R4-01). **`ids` lists.** Only lowercase UUIDs are accepted; uppercase is a
pattern `validation_error` (R4-03). **Role ids.** `setUserRoles` validates
role ids under the admin-set lock (R4-04). **Reset isolation.** A client read
overtaken by a reset or an identity transition never resolves another
audience's rows, or rows installed after the reset (R4-07, R4-08).

### C17 v4 — Handoffs and owed mirrors

**10-L02 (owed; R4-15).** The Round-3 mirror records: four fence codes → 503,
superseding the two-code sentence; `.env.example` keys
`FORM_SUBMISSIONS_EXPORT_TOKEN_SECRET` and `FORM_SUBMISSIONS_EXPORT_DIR`, with
the multi-replica rule; the week-cache key in `ADMIN_CACHE_MAP`; the
memory-only users list; the nested-`displayField` drop; copy authority = C17
v3. Round 4 adds the lowercase-only `ids` rule to the `CMS_API` delta (R4-03)
and the per-resource reservation lock to the booking notes (R4-01).
**TASK-551-11 (owed; R4-16).** The self-cap (sh fence at about `:971`, `awk
'NR > 999'`) applies only to the CONTRACT file. Its limit rises to ≤ 1,300,
with the reason that task docs are exempt from the AGENTS 1,000-line gate.
Sidecar code and test paths keep ≤ 999. The three extra split edits are
binding: `task-551-worktree-compatibility.mjs:111-115` `ownedTests`,
`task551WorkflowContracts.test.ts:121-125` `expectedL11SidecarTests`, and
`task551EvidenceContract.test.ts:901` (reads all split files plus the helper).
The split lands before 03-L02 W0. **Query inventory (01-L01; R4-01, R4-04).**
This supersedes the C17 v3 `bookingMutationService.ts` row quoted under R4-01:
create transaction: `acquireBookingResourceLock` (lock), the preflight
reservation and blackout SELECTs on `tx`, the INSERT; reactivation
transaction: the `resource_id` point read, the lock, the UPDATE; the
cancel/complete UPDATE is unchanged; `setUserRoles` adds the `roles` SELECT on
`tx`.

### Envelope change record (Round 4)

Edited in place on 2026-09-25. Unchanged: `schema`, `taskId`, `parent`,
`allowlist` (321), `forbiddenPaths` (52), `dependencies`, both occurrence ids
and their `dependsOn`, `final` (11 ids), and every existing command, byte for
byte. **`commands` 33 → 34.** Added `w0-smoke-inventory`: lane `bun-test`, profile
`none`, argv `["bun", "--env-file=/dev/null", "test",
"tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts"]` (4 tokens),
test-paths with that one path, `minimum` 1. It sits directly after
`w0-revision-vitest` (`contract :1905-1915`).
**`occurrences.initial.commandIds` 29 → 30.** `w0-smoke-inventory` is inserted
after `w0-revision-vitest`. **No allowlist delta.** Every path R4 names is
already allowlisted: the booking, users, hook, envelope, client and page
modules, the five named suites, `smoke-evidence-inventory.test.ts`, the
descriptors fixture and
`tests/vitest/ui/bookingPageFixture{State,Mocks,Harness}.tsx`.
`adminCacheAuthority.ts` and `mediaFoldersService.ts` are consumed only.
**Parser receipts at `9c5b6666` (2026-09-25).** The fence parses. Every argv has ≤ 128 tokens; `admin-pagination-vitest-1`,
`line-count-1` and `line-count-2` are at 128. No new argv token carries a
shell metacharacter. Every non-`none` command starts `bun
--env-file=/dev/null`. Every `minimum` equals its path count. The file has one
JSON fence. The family preflight (`preflightTask551DispatchSnapshot`,
repo-relative task paths, source head `9c5b6666`) passes: 41 task files, 33
occurrences.

## Dated Contract Corrections — 2026-09-25 (Round 5: state machine v3 and closure; append-only)

Source: `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round5-dispositions.md`
(R5-01..R5-13; HEAD `9c5b6666`, dirty mirrors). Applies R5-01..R5-13
(03-L02 side of R5-03/R5-10). **This section wins** over every earlier part
where they differ. No in-place edit: the fence, "Validation Commands" and
all earlier text are byte-identical; no envelope delta. Appended after
`contract :6608`, so no citation shifts. Anchors re-read 2026-09-25.
**Size note.** This file is now within ~1.5 KB of the 512 KiB
`TASK551_MAX_TASK_FILE_BYTES` cap (`task-551-dispatch-contract.mjs:96`,
checked `:168-170`); a further round needs a split first.

### R5-01 — Scope-version bump: paired-family maximum (MEDIUM)

Supersedes R4-02 (`:6087-6089`): "A changed pin appends `{ version: n + 1,
fieldsSha256 }` to the variant's history. Every family paired with that
variant bumps to the same version in the same change." Examples
(`:6089-6091`) stand. **Reason:** cursor decode checks count (`keysetCursor.ts:779`),
name (`:783`), null vs `nullable` (`:784-786`) and type (`:788`), never
`order`/`nulls`; only the scope (`:774-775`, carrying `v${ADMIN_LIST_SCOPE_VERSIONS[family]}`,
`contract :3689`) rejects an old cursor. **Rule:** when variant `V` changes,
`m = max(ADMIN_LIST_SCOPE_VERSIONS[F])` over every `F` paired with `V`; `V`
appends `{ version: m + 1, … }` and every paired family becomes `m + 1`.
Histories stay strictly increasing and may skip. **DB-free check added:**
within one family, no version > 1 appears in the histories of two
different variants.

### R5-02 — Booking DB-leg fixtures under R4-01 (MEDIUM)

R4-01 superseded R3-03 in full (`:5940`), dropping its fixture details. Its
"What stands" (`:5959-5962`) now carries: **global blackout** in a
marker-unique year-2300 window (offset from `RUN`), exactly one INSERT, no
lock, no conflict SELECT, deleted in `finally`; **week cap** = 501
non-overlapping 20-minute reservations over 167 h on the marker resource
only, queried by that `resourceId`, expecting 500 items + `truncated`;
**race isolation**: the 50-way race window is marker-unique and disjoint
from the 2300 window, and a bounded precondition read asserts no global or
marker-resource blackout overlaps it, so a loser can never see
`booking_blackout_conflict` (any code but `booking_slot_unavailable` fails
the leg).

### R5-03 — LOW bundle (03-L02 side)

- **Lock-wait wording.** R4-01 "the waiting create has issued zero counted
  statements (R4-04)" (`:6032-6033`) now reads "zero counted statements
  after its `BEGIN`; pre-transaction point reads are not asserted".
  "bounded polling (≤ 5 s, no fixed sleep)" (`:6029`) now reads "≤ 2 s;
  the holder commits within 2 s of the observed wait" (booking leg only).
- **Pool.** The race relies on default `DB_POOL_MAX` 10
  (`core/db/databaseConfig.ts:274`); `<db-env>` never sets it (`:1130-1136`).
- **R2-32 list.** "private `ensureBookingWindowAvailable`,
  `ensureServiceResourceBinding`, `withReservationExclusion`; exported for
  tests only `isBookingReservationExclusionViolation` (R2-02)." (`:3770-3772`)
  now reads: private `ensureBookingWindowAvailable`,
  `ensureServiceResourceBinding`, `acquireBookingResourceLock`,
  `mapReservationWriteError`, `readOwnDataValue`, `bookingErrorCandidates`;
  exported `BOOKING_RESOURCE_LOCK_NAMESPACE` (not re-exported by the
  facade); tests-only `isBookingReservationExclusionViolation`.
- **Static pin owner.** R4-05 "a static test pins that" (`:6170-6171`) is
  owned by the DB-free block of `task551AdminWriteConcurrency.test.ts`: no
  import specifier of `bookingMutationService.ts` ends in `mediaFoldersService`.
- **Error precedence.** R4-01 "// unchanged and outside the transaction:
  normalization, service/resource point reads, status checks, binding
  check" (`:5986`) no longer covers the timezone and customer-name checks.
  Today they follow the preflight (`bookingService.ts:990`, `:992`,
  `:993-994`); they stay INSIDE the callback right after
  `ensureBookingWindowAvailable(tx, …)` and before the INSERT (pure checks,
  no statement), so error precedence is byte-identical.
- **Test-local types.** `AdminListSpecVariantId` (the 18 R4-02 ids),
  `AdminListScopeFamily = keyof typeof ADMIN_LIST_SCOPE_VERSIONS` and
  `factoryOf(variant) => (scope) => KeysetSpec` (R4-02 column 3; `cs-<kind>-<dir>`
  → `customScreenListSpec(scope, { kind, dir })`), used undeclared at
  `:6077-6085`, are declared test-locally in `task551BoundedAdminLists.test.ts`.
- **`AdminSetTx`.** R3-28 `type AdminSetTx = Parameters<Parameters<typeof
  db.transaction>[0]>[0];` (`:4677`) now reads `export type AdminSetTx = …`
  in `rolesService.ts`; `usersService.ts` imports it type-only (`:6140`).
- **10-L02 mirror:** see "Handoffs (Round 5)".

### R5-04..R5-11 — `useBoundedAdminList` state machine v3 (MEDIUM)

**Supersedes in full:** R3-17 (`### R3-17 — \`useBoundedAdminList\`
pseudocode (MEDIUM)`, `:5344`) — its `ts` block `:5352-5416`, from `type
Mode = "replace" | "append";` through `}, [fetchPage, pending]);` (`:5410`);
R4-06 (`### R4-06 — \`useBoundedAdminList\` has two declared modes
(MEDIUM)`, `:6188`) — its `ts` block `:6206-6267`, incl. `case "revalidate":
return state.mode === "paged"` (`:6227`), `async function runRequest`
(`:6251`), `// effect: runRequest(...).then(loaded | failed, keyed by
pending.token); …` (`:6266`), and the test clause "a reset page gives status
`reset` and no rows." (`:6279-6280`); R4-07's "A family invalidation is
always followed by the cacheBus `revalidate()`, whose newer hook token makes
the hook ignore that reset result." (`:6330-6332`). R3-17's "The hook never
derives a reset in render or in an effect." (`:5420-5421`) gains "… except
the `rekey` below, dispatched from a microtask the effect schedules".
**Stands:** R3-17 bullets `:5418-5426` otherwise, Posts prepend
(`:5432-5435`); R4-06 view → mode table (`:6198-6204`), Footer, Tests
(`:6272-6279`) and Smoke; no synchronous dispatch in effect bodies; refs
touched only in effects/callbacks.

```ts
// core/admin/ui/shared/useBoundedAdminList.ts (v3; BoundedListMode, MAX_APPEND_DEPTH = 20 and the status union as R4-06)
export const boundedListFetchKey = (family: string, scope: Readonly<Record<string, string | null>> = {}) =>
  `${family}|${canonicalJson(scope)}`; // R5-11: family + canonical non-filter closure inputs
type Stack = readonly (string | null)[];
type FetchPage<I, S, F, Fl> = (filters: Fl, cursor: string | null, o: { force: boolean }) => Promise<AdminListRead<I, S, F>>;
type Request = Readonly<{ kind: "page"; cursor: string | null; stack: Stack; merge: boolean; force: boolean; recovery: boolean }>
  | Readonly<{ kind: "chain"; depth: number }>; // append revalidate, every fetch forced
type Pending<Fl> = Readonly<{ token: number; fetchKey: string; filters: Fl; epoch: number; request: Request }>;
type State<I, S, F, Fl> = Readonly<{ mode: BoundedListMode; fetchKey: string; filters: Fl;
  items: readonly I[]; summary: S | null; facets: F | null; cursorStack: Stack; nextCursor: string | null;
  hasMore: boolean; status: BoundedListStatus; error: string | null; seq: number;
  pending: Pending<Fl> | null;      // the ONE in-flight request (R5-04)
  lastRequest: Request | null;      // what retry re-runs (R5-06)
  revalidateQueued: boolean;        // coalesced events while pending (R5-04/05)
  familyEpoch: number;              // +1 per family event (R5-07)
  fetchedAtEpoch: ReadonlyMap<string, number> }>; // slot(cursor) -> epoch captured at issue
// LoadResult = R4-06 page | chain | reset. Actions: reset(filters, hydrated) | rekey(fetchKey) | next | previous
//   | loadMore | revalidate | retry | loaded(token, result) | failed(token, message)
const slot = (c: string | null) => (c === null ? "\u0000first" : c);
const stale = <I, S, F, Fl>(s: State<I, S, F, Fl>, c: string | null) => (s.fetchedAtEpoch.get(slot(c)) ?? 0) < s.familyEpoch;
const page = (cursor: string | null, stack: Stack, merge: boolean, force: boolean, recovery = false): Request =>
  ({ kind: "page", cursor, stack, merge, force, recovery });
const revalidateRequest = <I, S, F, Fl>(s: State<I, S, F, Fl>): Request => s.mode === "paged"
  ? page(s.cursorStack.at(-1) ?? null, s.cursorStack, false, true)
  : { kind: "chain", depth: Math.min(s.cursorStack.length, MAX_APPEND_DEPTH) };
const issue = <I, S, F, Fl>(s: State<I, S, F, Fl>, request: Request, status: BoundedListStatus): State<I, S, F, Fl> =>
  ({ ...s, seq: s.seq + 1, status, lastRequest: request, revalidateQueued: false,
     pending: { token: s.seq + 1, fetchKey: s.fetchKey, filters: s.filters, epoch: s.familyEpoch, request } });
const drain = <I, S, F, Fl>(s: State<I, S, F, Fl>) => (s.revalidateQueued ? issue(s, revalidateRequest(s), s.status) : s);
// initState(mode, fetchKey, filters, hydrated, seq, familyEpoch, force): R3-17 hydration fields, stack [null], empty epoch
//   map, status hydrated ? "ready" : "loading"; then issue(page(null, [null], false, force || !!hydrated || familyEpoch > 0))
```

**Reducer.** A failed guard returns `state` unchanged. idle = `pending === null`.

| Action | Guard | Next state |
|---|---|---|
| `reset(f, h)` | none (supersedes pending) | `initState(mode, fetchKey, f, h, seq, familyEpoch, false)` |
| `rekey(k)` | `k !== fetchKey` | `initState(mode, k, filters, null, seq, 0, true)` |
| `next` | `paged`, idle, not `error`, `hasMore` | `issue(page(nextCursor, [...stack, nextCursor], false, stale(nextCursor)), "loading")` |
| `previous` | `paged`, idle, not `error`, stack ≥ 2 | `issue(page(stack[-2], stack[:-1], false, stale(stack[-2])), "loading")` |
| `loadMore` | `append`, idle, not `error`, `hasMore`, stack < 20 | `issue(page(nextCursor, [...stack, nextCursor], true, stale(nextCursor)), "loadingMore")` |
| `revalidate`, pending | none | `familyEpoch + 1`, `revalidateQueued = true`; `pending`/`lastRequest` untouched |
| `revalidate`, idle | none | `familyEpoch + 1`, `issue(revalidateRequest, status)` (rows stay; `error`/`reset` keep status until the result) |
| `retry` | idle, `error`, `lastRequest` | `issue(lastRequest, merge ? "loadingMore" : "loading")`, verbatim |
| `loaded` page/chain | token = pending | R4-06 merge/dedupe/summary/stack, `ready`, `pending null`; page: `slot(cursor) → pending.epoch`; chain: map rebuilt from `result.stack`; then `drain` |
| `loaded` reset | token = pending, not recovery | rows/summary/facets/epochs cleared, stack `[null]`, `hasMore false`; `issue(page(null, [null], false, true, true), "reset")` — one recovery read, subsumes a queued revalidate |
| `loaded` reset | token = pending, recovery | as above with `pending null`; no further read |
| `failed` | token = pending | `error`, message, `pending null`, rows kept; then `drain` |

```ts
const SUPERSEDED = Symbol("superseded");
async function runRequest<I, S, F, Fl>(fetchPage: FetchPage<I, S, F, Fl>, p: Pending<Fl>, isLatest: () => boolean) {
  if (p.request.kind === "page") {
    const read = await fetchPage(p.filters, p.request.cursor, { force: p.request.force });
    return isAdminListResetPage(read) ? { kind: "reset" } : { kind: "page", read };
  }
  const reads: AdminListRead<I, S, F>[] = []; const stack: (string | null)[] = []; let cursor: string | null = null;
  for (let i = 0; i < p.request.depth; i += 1) {
    if (!isLatest()) return SUPERSEDED;                   // R5-05: before EVERY chained fetch
    const read = await fetchPage(p.filters, cursor, { force: true }); // a rejection rejects the chain
    if (isAdminListResetPage(read)) return { kind: "reset" };
    reads.push(read); stack.push(cursor);
    if (!read.hasMore || read.nextCursor === null) break;
    cursor = read.nextCursor;
  }
  return isLatest() ? { kind: "chain", reads, stack } : SUPERSEDED;
}
export function useBoundedAdminList<I extends { id: string }, S, F, Fl>(o: Readonly<{ mode: BoundedListMode;
  fetchKey: string; filters: Fl; fetchPage: FetchPage<I, S, F, Fl>; hydrate: (f: Fl) => AdminListRead<I, S, F> | null }>) {
  const [state, dispatch] = useReducer(reducer<I, S, F, Fl>, null,
    () => initState(o.mode, o.fetchKey, o.filters, o.hydrate(o.filters), 0, 0, false));
  const io = useRef(o.fetchPage);
  useLayoutEffect(() => { io.current = o.fetchPage; }, [o.fetchPage]); // R5-11: new closure, no refetch
  const keyRef = useRef(o.fetchKey); const latestTokenRef = useRef(0);   // effects/callbacks only
  const { fetchKey } = o; const pending = state.pending;
  useEffect(() => {
    if (keyRef.current !== fetchKey) {                    // key changed: stop chains, rekey after a microtask
      latestTokenRef.current = 0; let live = true;
      void Promise.resolve().then(() => { if (live) { keyRef.current = fetchKey; dispatch({ type: "rekey", fetchKey }); } });
      return () => { live = false; };
    }
    if (pending === null || pending.fetchKey !== fetchKey) return undefined;
    latestTokenRef.current = pending.token;
    const isLatest = () => latestTokenRef.current === pending.token;
    runRequest(io.current, pending, isLatest).then(
      (result) => { if (result !== SUPERSEDED) dispatch({ type: "loaded", token: pending.token, result }); },
      (error: unknown) => { if (isLatest()) dispatch({ type: "failed", token: pending.token, message: toAdminErrorMessage(error) }); });
    return undefined;                                     // no abort: tokens drop late results
  }, [fetchKey, pending]);                                // R5-11: the only deps
  useEffect(() => () => { latestTokenRef.current = 0; }, []); // unmount stops chains
  const view = state.fetchKey === fetchKey ? state        // OUTPUT derivation only; never a state write
    : { ...state, items: [], summary: null, facets: null, cursorStack: [null], nextCursor: null, hasMore: false, status: "loading" as const, error: null };
  // returns view + summaryLoaded + canNext/canPrevious/canLoadMore (false unless view === state, idle and the
  // table guard holds) + reset(next) (hydrate(next) in the change handler), next, previous, loadMore, retry, revalidate
}
```

**Rules.** **R5-04** One `pending` per hook; `next`/`previous`/`loadMore`/`retry`
are ignored while it is set; events coalesce into `revalidateQueued`,
drained once after `loaded`/`failed`; only `reset(next)` and a key change
replace a pending request. **R5-05** A superseded chain stops before its
next fetch and dispatches nothing; at most one chain fetches per hook.
**R5-06** `error` blocks navigation; exits: `retry`, queued or incoming
`revalidate`, `reset`, `rekey`; rows kept. **R5-07** Each `revalidate` is
one family event; navigation to a slot read before the current epoch (or
never read, after any event) is forced, so a pre-event client page is never
served; with no event it stays cache-first. The epoch record lives in hook
state per cursor slot because `familyEpoch` is per hook and client maps
cannot compare it. **R5-08** `reset` renders an empty list and a
`role="status"` hint "The list was reset." in `BoundedListFooter`, and
issues exactly one forced first-page recovery read (non-subscribing pickers
recover); a second reset page stops at `reset`. **R5-11** Views pass
`boundedListFetchKey(family, scope)` (`{ typeSlug }`, `{ screenId }`,
`{ resourceId }` or `{}`). A key change clears the view through the derived
`loading` output until `rekey` lands; old-key rows never render; a pending
issued under an old key is never started. **StrictMode:** the re-run effect
restores `latestTokenRef` before any chain step; a doubled dev request's
second `loaded` fails the token check; a discarded run's microtask is dead.

**Tests** (`tests/vitest/admin/task551PaginatedListViews.test.tsx`, `fetchPage` spy):

| # | Transition | Assertion |
|---|---|---|
| H1 | init | hydrated: rows at once, then one `force: true` first-page call; not hydrated: `loading`, one `force: false` call |
| H2 | `reset` while pending | the late old result is ignored; a running chain makes no further call |
| H3 | `rekey` | same key, new closure: zero calls; new key: one `force: true` call through the new closure, no old-key row rendered |
| H4 | `next`/`previous` | replace / restore in `paged`; ignored in `append` |
| H5 | `loadMore` | appends with id dedupe; ignored in `paged` and at depth 20 |
| H6 | pending guard | `next`/`previous`/`loadMore`/`retry` while pending: zero calls |
| H7 | `revalidate` idle | `paged`: one forced call for the current cursor; `append`: 3 pages → 3 sequential forced calls from `null`, one atomic replace |
| H8 | `revalidate` pending | `pending`/`lastRequest` unchanged; 5 events → exactly one revalidate after the settle |
| H9 | chain burst | depth 3, one event starts the chain, N more during it: 3 + 3 forced calls for N = 1 and N = 10 (≤ 2 × depth, independent of N) |
| H10 | chain rejection | second page rejects: old list + `error`; `retry` re-runs the chain |
| H11 | `error` | navigation ignored; `retry` repeats cursor and `force`; queued and incoming `revalidate` each reach `ready` |
| H12 | epoch | page 1 → `next` → event → `previous` is `force: true` with fresh rows; unseen `next` after an event forced; no event: `force: false` |
| H13 | reset result | reset page during `loadMore` in a non-subscribing picker: empty list + hint, one forced `null` call, fresh first page only; a second reset page: no third call |
| H14 | standing | duplicate id once; upsert-prepended row once; persisted page → skeleton; early `hasMore: false` shortens the stack |

### R5-09 — Overtaken read v3 (MEDIUM)

Supersedes the R4-07 client block (`:6297-6325`): `const latest =
pageLatest.get(key); // self or a strictly newer request` (`:6315`), `if
(latest !== undefined && latest !== self) {` (`:6316`), `const read = await
latest; // a rejection PROPAGATES (status \`error\`)` (`:6317`), and the tail
`if (!current()) return adminListResetPage<PageListItem>();` (`:6320`) →
`return readVerifiedAdminListPage(pageCache, key, filters) // key advanced
without a newer request` (`:6321`) → `?? (isDefaultFirstKey(key) ?
readPersistedFirstPage(pagesFirstPage, filters) : null)` (`:6322`) → empty;
and R4-07's standing "the order newer → memory → slot → empty"
(`:6293-6294`). The tail is unreachable and REMOVED: (O) runs only after a
strictly newer request advanced the key generation and entered
`pageLatest`; only the reset clears `pageLatest`, and it also advances
`pagesGeneration`, which (R) catches first. "Installs nothing", (R) before
(O) and the posts epoch exception (with R5-10) stand.

```ts
// core/admin/services/pagesClient.ts (eight generic page methods; adminUsersClient via userPageLatest, same rule)
const pageLatest = new Map<string, Promise<PageListRead>>(); // set with pagePromises at creation; never deleted in
                                                             // .finally; cleared only by the registered reset
request = listPagesPage(filters, cursor).then(async (envelope): Promise<PageListRead> => {
  if (!isCurrentAdminCacheInstallationToken(token) || generation !== pagesGeneration) return adminListResetPage<PageListItem>(); // (R)
  if (pageGenerations.get(key) !== keyGeneration) {          // (O)
    const latest = pageLatest.get(key);
    if (latest === undefined || latest === request) throw new Error("admin_list_overtake_invariant"); // fail closed, never rows
    return resolveOvertakenPageRead(latest, token, generation);
  }
  /* install exactly as R3-16 */ return envelope;
});
async function resolveOvertakenPageRead(latest: Promise<PageListRead>, token: AdminCacheInstallationToken,
  generation: number): Promise<PageListRead> {
  const current = () => isCurrentAdminCacheInstallationToken(token) && generation === pagesGeneration;
  let read: PageListRead;
  try { read = await latest; } catch (error) {
    if (!current()) return adminListResetPage<PageListItem>(); // re-check after the await: reset wins over error
    throw error;
  }
  return current() ? read : adminListResetPage<PageListItem>(); // re-check after the await
}
```

**Four pinned outcomes** (`task551PaginatedClients.test.ts`; A overtaken by
B; "reset" = L04 reset or installation advance during A's await): B resolves
`E2`, no reset → `E2` (tests a, b); B resolves, reset → reset page, nothing
installed (f); B rejects `err`, no reset → rejects `err`, no memory/slot read
(c); B rejects, reset → reset page, not `err` (new h). A reset before A's
completion → reset page via (R) (d, e). The invariant throw is not an
outcome. A static check asserts `resolveOvertakenPageRead` in `pagesClient.ts`
and `adminUsersClient.ts` names no `readVerifiedAdminListPage`,
`readPersistedFirstPage` or `emptyAdminListPage`. (g) repeats a–c, f, h for
`adminUsersClient`.

### R5-10 — Posts installation-token check (MEDIUM; 03-L02 side)

Supersedes R3-16 **Posts.** "Its only stale branch is the authority-epoch
advance, and only `clearPostsCache` advances that epoch
(`postsClient.ts:292-293`)." (`:5331-5333`). `listPostsCached` (C9 v2 block
`:4027-4048`) captures `token = captureAdminCacheInstallationToken()` beside
the ticket, before the await. After it: `if
(!isCurrentAdminCacheInstallationToken(token)) return
adminListResetPage<PostListItem>();` FIRST, then the unchanged TASK-554
epoch branch `getCachedPosts(filters) ?? emptyAdminListPage()`; a rejection
with a non-current token also resolves the reset page (reset wins over
error). The registered reset (body `:123` rule) calls `clearPostsCache`, so
an identity transition moves token and epoch and the token branch wins; a
bare `clearPostsCache()` moves only the epoch and keeps the TASK-554 reading
(`TASK-554_...md:1574-1582`) byte-for-byte. TASK-554 files are unchanged.
**Tests** (`task551PaginatedClients.test.ts`, not `postsClient.test.ts`):
(p1) `advanceAdminCacheInstallationAuthority()` during the await →
`isAdminListResetPage`, slot and memory empty; (p2) bare `clearPostsCache()`
→ not the reset page, equals `getCachedPosts() ?? emptyAdminListPage()`;
(p3) rejection after an advance → the reset page.

### R5-12 — Root-tsc baseline (MEDIUM)

Supersedes R4-13 "// baseline = multiset of keys, captured ONCE before W0 on
the unmodified tree (receipt stores digests)" (`:6498`) and "The baseline is
never re-captured mid-family." (`:6503`), and R3-36 "Before W0, the
orchestrator captures a root `./node_modules/.bin/tsc -p tsconfig.json
--noEmit` baseline on the unmodified tree." (`:5760-5762`). The R4-13 key,
BLOCKING rule and "never filed as cross-stream" stand for INITIAL.
**Capture:** by the orchestrator, after the TASK-551-11 split lands and
before W0, argv `./node_modules/.bin/tsc -p tsconfig.json --noEmit --pretty
false` (cwd = worktree; pinned because tsc is pretty when `FORCE_COLOR` is
set or stdout is a TTY, `node_modules/typescript/lib/_tsc.js:132193-132201`);
every judgement parses output of the same argv; the fence `repo-lint-types`
argv is unchanged and its exit code is not the judgement. **File:** the
sorted error lines (`file(line,col): error TSxxxx: message`, continuation
lines joined) go to
`_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-root-tsc-baseline.txt`
(tracked; sha256 in the W0 receipt; orchestrator-written only). **Diff:** a
multiset diff of those lines compared by their R4-13 key (line/column
dropped). **Lost baseline:** re-captured only with an explicit receipt note
(reason, new sha256, tree state), never silently. **Inventory:** the R4-10
audit-evidence regex ends `\.(md|json)$` (`:6423`), so the tracked `.txt`
would be `unreconciled` (`smoke-evidence-inventory.test.ts:78`, `git
ls-files`). W0 appends both baseline paths
(`…/audit-evidence/03-l02-root-tsc-baseline.txt` and
`…-baseline-final.txt`, owner TASK-551-03-L02) to `FAMILY_RECEIPT_EXACT_PATHS`
(`:6428-6433`); the final path is declared ahead of capture; the R4-10
"Every exact path matches" test covers both.

### R5-13 — FINAL baseline (MEDIUM)

The FINAL occurrence (`dependsOn` `TASK-551-08-L03:final`, includes
`repo-lint-types`) captures its OWN baseline immediately before its first
edit, same argv/cwd, to `…/audit-evidence/03-l02-root-tsc-baseline-final.txt`
(sha256 in the FINAL receipt). FINAL judgements diff against it only: a key
present at that baseline is cross-stream (recorded, not fixed); a new key
blocks FINAL. R4-13's "after W0, W1, W3 and at closure" stays INITIAL-only.

### Security Contract rows (Round 5)

**Reset isolation.** An overtaken read resolves the reset page when a reset
or identity transition lands during its await, even if the newer request
rejected; never memory/slot rows; posts check the installation token before
the TASK-554 epoch branch (R5-09, R5-10). **List hook.** One in-flight
request, at most one fetching chain, no pre-event client page after an
event, one recovery read after a reset (R5-04..R5-08). **Booking.**
`createBookingReservation` error precedence byte-identical (R5-03).

### Handoffs (Round 5)

C17 v4 (`:6561-6583`) stands; Round 5 adds no C17 version. The R5-03 10-L02
mirror is already recorded in 10-L02's own "Amendment (2026-09-25):
Round-4/5 items" (`TASK-551-10-L02-...md:1603`), another writer's file.
01-L01 inventory and TASK-554 are unchanged.

### Envelope record (Round 5)

No edit: fence `:1441-2172` byte-identical; allowlist 321, forbidden 52,
commands 34, `initial` 30, `final` 11. Every path named here is already
allowlisted (the hook, footer, envelope, pages/users/posts clients,
`bookingMutationService.ts`, `rolesService.ts`, `usersService.ts`, and
the five suites incl. `smoke-evidence-inventory.test.ts`). The baseline
`.txt` files are orchestrator evidence; the R5-12 argv is a prose
orchestrator procedure. One JSON fence.
