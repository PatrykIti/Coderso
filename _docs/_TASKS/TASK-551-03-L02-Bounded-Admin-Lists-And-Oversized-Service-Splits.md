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
    "tests/vitest/admin/task551PaginatedClientsSlots.test.ts",
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
      "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/admin/task551PaginatedClients.test.ts", "tests/vitest/admin/task551PaginatedClientsSlots.test.ts", "tests/vitest/admin/pagesClient.test.ts", "tests/vitest/admin/pagesClientPagination.test.ts", "tests/vitest/admin/detailPagesClient.test.ts", "tests/vitest/admin/entriesClient.test.ts", "tests/vitest/admin/entriesClientPagination.test.ts", "tests/vitest/admin/entriesClientRevisions.test.ts", "tests/vitest/admin/entriesClientMutationReconciliation.test.ts", "tests/vitest/admin/entriesClientReadAuthority.test.ts", "tests/vitest/admin/postsClient.test.ts", "tests/vitest/admin/postsClientCacheAuthority.test.ts", "tests/vitest/admin/adminUsersClient.test.ts", "tests/vitest/admin/formsClient.test.ts", "tests/vitest/admin/mediaClient.test.ts", "tests/vitest/admin/mediaClientListEnvelope.test.ts", "tests/vitest/admin/bookingClient.test.ts", "tests/vitest/admin/adminPrefetch.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/admin/task551PaginatedClients.test.ts", "tests/vitest/admin/task551PaginatedClientsSlots.test.ts", "tests/vitest/admin/pagesClient.test.ts", "tests/vitest/admin/pagesClientPagination.test.ts", "tests/vitest/admin/detailPagesClient.test.ts", "tests/vitest/admin/entriesClient.test.ts", "tests/vitest/admin/entriesClientPagination.test.ts", "tests/vitest/admin/entriesClientRevisions.test.ts", "tests/vitest/admin/entriesClientMutationReconciliation.test.ts", "tests/vitest/admin/entriesClientReadAuthority.test.ts", "tests/vitest/admin/postsClient.test.ts", "tests/vitest/admin/postsClientCacheAuthority.test.ts", "tests/vitest/admin/adminUsersClient.test.ts", "tests/vitest/admin/formsClient.test.ts", "tests/vitest/admin/mediaClient.test.ts", "tests/vitest/admin/mediaClientListEnvelope.test.ts", "tests/vitest/admin/bookingClient.test.ts", "tests/vitest/admin/adminPrefetch.test.ts"],
        "minimum": 18
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

## Dated Contract Corrections — 2026-09-26 (Round 6: two-generation clients, rekey v2 and closure; append-only)

Source: `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round6-dispositions.md`
(R6-01..R6-07 over the Round-5 auditors S1-A, S1-B, S2-A, S2-B, S3-A and
S3-B; HEAD `66203e22a33ba4d783823d2fd5aa4b26c617a0ca`, with other leaves'
files dirty). This section applies R6-01..R6-07. It also applies the
TASK-551-11 ripple corrections that 03-L02 owes: 11 contract **V3-5**
(`:1103-1110`), as amended by **V4-6** (`:1228-1229`), **V4-7** (`:1236`) and
**V6-5** (`:1473-1477`). **This section wins** over every earlier part where
they differ. No in-place edit: the fence, "Validation Commands" and all
earlier text stay byte-identical, and there is no envelope delta. The section
is appended after `contract :6985`, so no citation shifts. Anchors were
re-read on 2026-09-26 at `66203e22`. Every sentence this round supersedes is
quoted verbatim under "Superseded sentences (Round 6)" (text authoritative).
Everything not quoted there stays binding.

### R6-00 — The Round-6 freeze existed and is lifted

**Freeze (history).** On 2026-09-25, after the TASK-551-11 v5 audit, the
orchestrator froze every append to this file. The freeze is recorded in the
Round-6 dispositions record ("Orchestrator freeze") and in the 11 contract
(**V6-5** `:1476`; the **V7-5** stop rule at `:1567-1569`). At that point the
file was 522,753 bytes, against the 524,288-byte
`TASK551_MAX_TASK_FILE_BYTES` dispatch cap. Round 6 and the L11 ripple
mirrors were therefore held until TASK-551-11 re-open step 2 was green.
**Lifted.** Re-open step 2 is green and committed at
`66203e22a33ba4d783823d2fd5aa4b26c617a0ca` ("test(task551-11): re-open step
2 — task-file byte cap 1 MiB + dispatchContractCaps suite"). The cap is now
`export const TASK551_MAX_TASK_FILE_BYTES = 1024 * 1024;` (1,048,576 bytes),
at `_docs/_workflows/lib/task-551-dispatch-primitives.mjs:6`. `requireText`
enforces it (`:76-78`). The boundary suite is
`tests/unit/workflows/dispatchContractCaps.test.ts`: it accepts exactly
1,048,576 bytes, rejects 1,048,577 and accepts the live 03-L02 file. This
section is the first 03-L02 append after step 2, as **V6-5** requires.
**Still in force.** The record's second freeze bullet stays in force: no
01-L01 classifier precondition or regeneration run may start between an L11
step's snapshot and that step's green receipt. That is an 11/01-L01
collision guard, and 03-L02 starts no such run.

### R6-01 — Two kinds of invalidation, two generations (MEDIUM; S2-B, S3-B)

**Model.** Every paged Admin client keeps exactly two monotonic counters per
client. They are never zeroed and never shared across clients.

- `invalidationEpoch` is advanced ONLY by `invalidate`. `invalidate` runs from
  the client's public `clear<Family>Cache` (mutation callers) and from the
  client's lazy cacheBus subscription to its family keys (any origin, `local`
  or `remote`; `core/admin/utils/cacheBus.ts:18-22`, consumed only).
  `invalidate` does three things: it marks the page memory stale (entries
  stay, each keeping the `fetchedAtEpoch` it was installed at), it clears the
  in-flight dedupe map, and it clears the persisted first-page slot. It never
  touches the per-key generation map, the latest-request map,
  `resetGeneration` or the subscription. An in-flight read that an
  invalidation overtakes installs nothing and resolves
  `{ kind: "superseded" }` (R6-04). The hook then re-runs that request
  silently in the background: there is no reset UI, and the current rows stay
  rendered until the fresh page lands. This is the "background revalidation"
  rule.
- `resetGeneration` is advanced ONLY by the client's registered L04 reset
  (`registerAdminModuleCacheReset`). `advanceAdminCacheInstallationAuthority`
  runs that reset synchronously, right after it mints a new installation token
  (`core/admin/utils/adminCacheAuthority.ts:72-79`, consumed only). This is
  the only "family reset": an installation reset or an identity transition.
  It clears everything: memory, dedupe, per-key generations, latest requests,
  the slot, and the subscription (unsubscribed; lazily re-subscribed by the
  next read, as in R4-08). An overtaken read resolves `{ kind: "reset" }`.
  The hook shows the empty list, the R5-08 hint and exactly one recovery
  read.

**Check order.** Each completion checks after its own await, and again after
every later await: (R) installation token not current, or `resetGeneration`
moved → `{ kind: "reset" }`. (I) `invalidationEpoch` moved →
`{ kind: "superseded" }`. (O) key generation moved → resolve through the
latest request (R5-09, extended below). Otherwise the read installs with
`fetchedAtEpoch = epoch` and resolves `{ kind: "page", page }`. Reset wins over
superseded, and both win over an error (R6-02).

```ts
// core/admin/services/pagesClient.ts (the generic template; every client below instantiates it)
let pagesGeneration = 1;        // resetGeneration: advanced ONLY by the registered reset
let pagesInvalidationEpoch = 1; // invalidationEpoch: advanced ONLY by invalidatePagesList
const pageCache = new Map<string, CachedAdminListPage<PageListItem, PageListSummary, PageListFacets>>(); // entries carry fetchedAtEpoch
const pagePromises = new Map<string, Promise<PageListRead>>();    // in-flight dedupe (non-forced joins)
const pageGenerations = new Map<string, number>();                // per-key request generation, +1 per network request
const pageLatest = new Map<string, Promise<PageListRead>>();      // latest request per key, set with the +1
let pagesSubscription: (() => void) | null = null;
function invalidatePagesList(): void {                            // THE invalidate body
  pagesInvalidationEpoch += 1; pagePromises.clear(); pagesFirstPage.clear(); // memory stays, now stale
}
function ensurePagesListSubscription(): void {                    // lazy on the first page read; idempotent
  pagesSubscription ??= subscribeCacheEvents((event) => { if (event.key === cacheKeys.pagesList) invalidatePagesList(); });
}
registerAdminModuleCacheReset(() => {                             // THE reset body
  pageCache.clear(); pagePromises.clear(); pageGenerations.clear(); pageLatest.clear(); pagesFirstPage.clear();
  pagesSubscription?.(); pagesSubscription = null; pagesGeneration += 1;
});
export const clearPagesCache = (): void => {                      // name and signature unchanged
  /* plus the non-list state it clears at HEAD (pagesClient.ts:274-277) while that state exists */
  invalidatePagesList();
};
export function listPagesPageCached(filters: PageListFilters = DEFAULT_PAGE_LIST_FILTERS, cursor: string | null = null,
  options: { force?: boolean } = {}): Promise<PageListRead> {
  ensurePagesListSubscription();
  const key = buildAdminListCacheKey(cacheKeys.pagesList, "page", filters, cursor);
  const isDefaultFirst = cursor === null && canonicalJson(filters) === canonicalJson(DEFAULT_PAGE_LIST_FILTERS);
  if (!options.force) {
    const hit = readVerifiedAdminListPage(pageCache, key, filters, pagesInvalidationEpoch) // stale entry = miss
      ?? (isDefaultFirst ? readPersistedFirstPage(pagesFirstPage, filters) : null);
    if (hit) return Promise.resolve({ kind: "page", page: hit });
    const inFlight = pagePromises.get(key); if (inFlight) return inFlight;
  }
  const token = captureAdminCacheInstallationToken();               // before any await
  const generation = pagesGeneration; const epoch = pagesInvalidationEpoch;
  const keyGeneration = (pageGenerations.get(key) ?? 0) + 1; pageGenerations.set(key, keyGeneration);
  const isReset = () => !isCurrentAdminCacheInstallationToken(token) || generation !== pagesGeneration;
  const isSuperseded = () => epoch !== pagesInvalidationEpoch;
  let request: Promise<PageListRead>;
  request = (async (): Promise<PageListRead> => {
    let envelope: PageListEnvelope;
    try { envelope = await listPagesPage(filters, cursor); } catch (error) {
      if (isReset()) return ADMIN_LIST_RESET;                         // R6-02: reset wins over error
      if (isSuperseded()) return ADMIN_LIST_SUPERSEDED;               // superseded wins over error
      throw error;
    }
    if (isReset()) return ADMIN_LIST_RESET;                           // (R)
    if (isSuperseded()) return ADMIN_LIST_SUPERSEDED;                 // (I) installs nothing
    if (pageGenerations.get(key) !== keyGeneration) {                 // (O)
      const latest = pageLatest.get(key);
      if (latest === undefined || latest === request) throw new Error("admin_list_overtake_invariant");
      return resolveOvertakenPageRead(latest, isReset, isSuperseded);
    }
    pageCache.set(key, { canonicalFilters: canonicalJson(filters), envelope, fetchedAtEpoch: epoch });
    if (isDefaultFirst) pagesFirstPage.write({ v: 1, filters, items: envelope.items,
      nextCursor: envelope.nextCursor, hasMore: envelope.hasMore });
    return { kind: "page", page: envelope };
  })();
  const settle = () => { if (pagePromises.get(key) === request) pagePromises.delete(key); };
  void request.then(settle, settle);                                  // no derived rejection escapes
  pagePromises.set(key, request); pageLatest.set(key, request);
  return request;
}
async function resolveOvertakenPageRead(latest: Promise<PageListRead>, isReset: () => boolean,
  isSuperseded: () => boolean): Promise<PageListRead> {
  let read: PageListRead;
  try { read = await latest; } catch (error) {
    if (isReset()) return ADMIN_LIST_RESET;
    if (isSuperseded()) return ADMIN_LIST_SUPERSEDED;
    throw error;                                                      // the newer caller's error (R5-09 (c))
  }
  if (isReset()) return ADMIN_LIST_RESET;                             // re-check after the await
  if (isSuperseded()) return ADMIN_LIST_SUPERSEDED;
  return read;                                                        // may itself be reset or superseded
}
```

**`pageGenerations` / `pageLatest` / `pagesGeneration`.** `pagesGeneration`
is the pages `resetGeneration`. `pageGenerations` is a per-key REQUEST
generation: each new network request for a key increments it, and
`pageLatest` is set to that request at the same point. Only the reset clears
either map, and the reset always advances `pagesGeneration` in the same
callback. So (R) catches every read that started before a reset, and
`admin_list_overtake_invariant` stays unreachable (R5-09). An invalidation
touches neither map. Key generations therefore stay monotonic across
invalidations, and (I) runs before (O). Both reads involved in an overtake
started under the same epoch, because `invalidationEpoch` only grows. If (I)
passes for the older read, it passes for the newer one when that read starts.
`pagePromises` is cleared by both `invalidate` and the reset. So a
non-forced read after an invalidation never joins a request that will resolve
`superseded`. **Hydration** (R3-17 lazy initializer) may read a stale memory
entry. Every hydrated start is followed by one forced read (R5 H1).

```ts
// core/admin/services/adminListEnvelope.ts (R6-01 changes; R3-15 page types stand)
export type CachedAdminListPage<I, S, F> = Readonly<{ canonicalFilters: string; envelope: AdminListEnvelope<I, S, F>;
  fetchedAtEpoch: number }>;
export function readVerifiedAdminListPage<I, S, F>(cache: ReadonlyMap<string, CachedAdminListPage<I, S, F>>,
  key: string, filters: unknown, epoch: number | "hydrate"): AdminListEnvelope<I, S, F> | null;
// canonicalFilters must match (I-05); a number returns a hit only when fetchedAtEpoch === epoch; "hydrate" ignores epochs
```

**Every public `clear<Family>Cache`** (and the client that owns it). Each
paged client has ONE `resetGeneration` and ONE `invalidationEpoch`, which cover
all of its paged families, so over-invalidating a sibling family costs one
forced read at most. Each body is "what it clears at HEAD" + "the client's
`invalidate`". Each reset body clears all of that client's paged state,
unsubscribes, and then advances the generation.

| Client (file) | Public clear (HEAD anchor) | Families invalidated | `resetGeneration` | `invalidationEpoch` | Subscription predicate on `event.key` |
|---|---|---|---|---|---|
| `pagesClient.ts` | `clearPagesCache()` (`:274`) | pages | `pagesGeneration` | `pagesInvalidationEpoch` | `=== cacheKeys.pagesList` |
| `postsClient.ts` | `clearPostsCache()` (`:292`) | posts | installation token (R5-10) | `postsCacheAuthorityEpoch` (TASK-554) | `=== cacheKeys.postsList` |
| `entriesClient.ts` (paged maps in `entriesClientPagination.ts` where C11 puts them) | `clearEntriesCache(typeSlug)` (`:528`), `clearAllEntriesCache()` (`:553`) | entries-type, custom-screen-entries, entries-all (all three for either call) | `entriesGeneration` | `entriesInvalidationEpoch` | `.startsWith(cacheKeys.entriesList(""))` (also matches `entriesAllList`) |
| `formsClient.ts` | `clearFormsCache()` (`:269`) | forms, form-submissions | `formsGeneration` | `formsInvalidationEpoch` | `=== cacheKeys.formsList` |
| `mediaClient.ts` | `clearMediaCache()` (`:144`) | media | `mediaGeneration` | `mediaInvalidationEpoch` | `=== cacheKeys.mediaList` |
| `bookingClient.ts` | `clearBookingCache()` (`:195`) | booking-reservations, -resources, -services, -blackouts, plus the week cache (R3-07 `invalidateBookingWeekCache`, unchanged) | `bookingListsGeneration` | `bookingListsInvalidationEpoch` | one of the four `cacheKeys.booking*List` keys; the R3-07/R4-08 week subscription stays separate |
| `adminUsersClient.ts` | `clearAdminUsersCache()` (NEW export) | users | `usersGeneration` (R3-18) | `usersInvalidationEpoch` | none: `cachePolicy.ts` has no users key and stays forbidden (R3-18) |

- **Posts** stays the named TASK-554 exception. `clearPostsCache` keeps its
  HEAD body (`postsClient.ts:292-306`) and the C9 v2 addition (`contract
  :4051`, it clears `cachedPostsPromises` and the memory pages rather than
  marking them stale). The hook's posts `fetchPage` is the new
  `readPostsListPage(filters, cursor, options): Promise<PostListRead>`. Its
  first-page path is the R5-10 path with discriminated outcomes: a non-current
  token gives `{ kind: "reset" }`, and an authority-epoch advance gives
  `{ kind: "superseded" }`. Cursor pages follow the generic template with
  `postsCacheAuthorityEpoch` as the epoch. `listPostsCached(filters?,
  options?)` stays the TASK-554-facing legacy projection of
  `readPostsListPage(filters, null, options)`: `page` → the page;
  `superseded` → `getCachedPosts(filters) ?? emptyAdminListPage()`
  byte-for-byte (TASK-554 `:1574-1582`); `reset` → `emptyAdminListPage()`.
  TASK-554 files are unchanged.
- **Form submissions** have no separate public clear. They are
  form-parented and `formsClient`-owned, so `clearFormsCache` is their public
  `clear<Family>Cache`. No caller-less export is added.
- **Users.** `clearAdminUsersCache = (): void => invalidateAdminUsersList();`
  touches no storage (R3-18 stands). The in-client mutations
  (create/invite/update/enable/disable/roles/delete) call it after success.
  `UsersRolesPage`/`useUsersRolesCollections` call it after role mutations
  that change user rows.
- **Detail pages.** If `detailPagesClient.ts` holds paged maps (C9 v2
  `DEFAULT_DETAIL_PAGE_LIST_FILTERS`), then `clearDetailPagesCache` and
  `clearDetailPageListCache` follow the pages body with their own
  `detailPagesGeneration`/`detailPagesInvalidationEpoch`.
- **Week cache.** `listReservationsWeek` is not a hook read and not an
  `AdminListRead`. R3-07 and R4-08 stand unchanged.
- **Event order.** A family event can reach the client subscription and a
  view's `revalidate()` in either registration order. Client first: the
  forced revalidate starts under the new epoch, so there is ONE forced read.
  View first: the forced read started under the old epoch resolves
  `superseded` and is re-run, so there are TWO reads, and the rows are never
  reset. The bound is ≤ 2 forced reads per event.

**Hook rules (R6-01 side; the table rows are under R6-03/R6-04).** A
`superseded` result re-runs `pending.request` (which equals `lastRequest`)
with `force: true`, keeping `merge`, `recovery` and the chain depth. It also
advances `familyEpoch` by 1: the outcome proves a family invalidation that a
non-subscribing hook may not have been told about (R5-07). Rows, summary,
facets and `status` stay unchanged, so no reset UI appears. A queued
revalidate is subsumed, except when the re-run is an append `merge` page.
There the queue survives, and `drain` then refreshes the whole chain. Every
re-run needs a fresh invalidation during its await, so re-runs are bounded by
invalidations and there is no retry counter.
**Tests.** `tests/vitest/admin/task551PaginatedClients.test.ts`
(`test.each` over the seven client rows above, plus detail pages when
present):

- "invalidate: an overtaken in-flight read resolves superseded and installs
  nothing" (memory, slot and `pageLatest` are unchanged by that completion).
- "reset: an overtaken in-flight read resolves reset".
- "reset wins over superseded when both land during one await".
- "invalidate keeps memory entries stale: a non-forced read of a stale entry
  hits the network; hydrate still reads it".
- "invalidate clears in-flight dedupe and the persisted slot".
- "pageGenerations and pageLatest survive clear<Family>Cache; only the
  registered reset clears them and advances the generation".
- "a family event invalidates through the lazy subscription; client-first
  gives one forced read, view-first gives two, the first superseded".
- "the reset unsubscribes; the next read re-subscribes once".
- "posts: listPostsCached keeps the TASK-554 reading after a bare
  clearPostsCache while readPostsListPage resolves superseded".
- "users: clearAdminUsersCache and every mutation touch no Storage".

`tests/vitest/admin/task551PaginatedListViews.test.tsx` adds these rows:

| # | Transition | Assertion |
|---|---|---|
| H15 | `superseded` result while a paged `next` is pending | old rows stay rendered, `status` never `reset`, no hint; exactly one `force: true` re-run of the same cursor; the fresh page replaces the rows |
| H16 | `superseded` during an append `loadMore` with a queued event | the page re-runs forced, then one chain revalidate; otherwise a queued revalidate is subsumed (paged: exactly one call after the settle) |
| H17 | `reset` result (discriminant) | empty list, `role="status"` hint "The list was reset.", one forced `null` recovery call (R5-08 stands) |

### R6-02 — Pages/users rejection parity with posts p3 (MEDIUM; S2-B)

The pages and users templates wrap their OWN network await in `try`/`catch`
(the R6-01 block). After a rejection they re-check `isReset()` and then
`isSuperseded()`. Reset wins over the error, exactly as posts p3 (R5-10).
Superseded also wins over the error. With neither, the error propagates
unchanged, and the hook shows `error` with its rows kept. The overtaken path
(`resolveOvertakenPageRead`) applies the same order after awaiting the latest
request. `adminUsersClient.listAdminUsersPageCached` instantiates the same
template: `usersGeneration`, `usersInvalidationEpoch`, `userPageGenerations`,
`userPageLatest`, `userPagePromises`, and no slot. The R5-09 static check
stands.
**Tests** (`task551PaginatedClients.test.ts`): "pages p3: a network
rejection after an installation advance resolves reset"; "users p3: a network
rejection after an installation advance resolves reset"; "pages p4 / users
p4: a network rejection after clear<Family>Cache resolves superseded"; "pages
p5 / users p5: a rejection with no reset and no invalidation rejects with the
same error and installs nothing". R5-09 (a)-(c), (f), (h) and their users
repeat (g) keep their meaning. "reset page" reads as `kind: "reset"`
(R6-04).

### R6-03 — `rekey`: epochs persist, new-scope initial filters (MEDIUM; S2-A, S2-B, S3-B)

**Per hook instance.** `familyEpoch` (the hook's count of family events,
R5-07) and the `fetchedAtEpoch` map belong to the hook instance. They PERSIST
across `rekey`, `reset(next)` and a `reset` result. `familyEpoch` never goes
back to 0. The map is keyed by
`slotKey(fetchKey, filters, cursor) = canonicalJson([fetchKey, filters, cursor])`,
so the slots of every key and filter set coexist. It keeps at most 256
entries, in insertion order: a re-set moves an entry to the end, and the
oldest entry is evicted. An evicted or never-read slot counts as epoch 0, so
after any event it is forced (fail-safe).
**Key plus initial filters.** Views pass
`listKey: BoundedListKey<Fl> = { fetchKey, initialFilters }`, built by
`boundedListKey(family, scope, initialFilters)` =
`{ fetchKey: boundedListFetchKey(family, scope), initialFilters }`.
`initialFilters` are the NEW scope's defaults, from a scope-owned builder
(for example the screen's configured defaults). They never contain a filter
of another scope. A `fieldFilter.*`/`systemFilter.*` key is bound to its
screen/type scope (D3, `contract :2467-2470`). `rekey` clears items, summary,
facets and the cursor stack, and takes `initialFilters` wholesale. It never
merges `state.filters`, so filters of the old scope are dropped.

```ts
// core/admin/ui/shared/useBoundedAdminList.ts (v4 deltas over R5-04..R5-11)
export type BoundedListKey<Fl> = Readonly<{ fetchKey: string; initialFilters: Fl }>;
export const boundedListKey = <Fl>(family: string, scope: Readonly<Record<string, string | null>>, initialFilters: Fl):
  BoundedListKey<Fl> => ({ fetchKey: boundedListFetchKey(family, scope), initialFilters });
const MAX_EPOCH_SLOTS = 256;
const slotKey = (fetchKey: string, filters: unknown, cursor: string | null) => canonicalJson([fetchKey, filters, cursor]);
const stale = <I, S, F, Fl>(s: State<I, S, F, Fl>, c: string | null) =>
  (s.fetchedAtEpoch.get(slotKey(s.fetchKey, s.filters, c)) ?? 0) < s.familyEpoch;
// initState(mode, fetchKey, filters, hydrated, seq, familyEpoch, fetchedAtEpoch, force): R3-17 hydration fields,
//   stack [null], the GIVEN epoch map and familyEpoch (never reset), status hydrated ? "ready" : "loading";
//   then issue(page(null, [null], false, force || !!hydrated || familyEpoch > 0))
// Actions: reset(filters, hydrated) | rekey(fetchKey, initialFilters) | next | previous | loadMore | revalidate
//   | retry | loaded(token, result) | failed(token, message)
// effect, key-change branch (deps stay [fetchKey, pending], R5-11; listKeyRef is written in the same
//   useLayoutEffect as `io`, so it always holds the latest render's pair):
void Promise.resolve().then(() => { if (live) { keyRef.current = fetchKey;
  dispatch({ type: "rekey", fetchKey, initialFilters: listKeyRef.current.initialFilters }); } });
```

| Action | Guard | Next state (supersedes the R5 rows quoted below) |
|---|---|---|
| `reset(f, h)` | none (supersedes pending) | `initState(mode, fetchKey, f, h, seq, familyEpoch, fetchedAtEpoch, false)` |
| `rekey(k, f0)` | `k !== fetchKey` | `initState(mode, k, f0, null, seq, familyEpoch, fetchedAtEpoch, true)` |
| `loaded` page/chain | token = pending | R5 row, except the epoch map: page sets `slotKey(pending.fetchKey, pending.filters, cursor) → pending.epoch`; chain sets that for every `result.stack` cursor; other entries are kept |
| `loaded` reset, not recovery | token = pending | rows/summary/facets cleared, stack `[null]`, `hasMore false`; `familyEpoch + 1` with the map KEPT (every earlier slot is now stale); `issue(page(null, [null], false, true, true), "reset")` |
| `loaded` reset, recovery | token = pending | as above with `pending null`; no further read |
| `loaded` superseded | token = pending | R6-01 hook rules |

**Tests** (`task551PaginatedListViews.test.tsx`):

| # | Transition | Assertion |
|---|---|---|
| H18 | A → B → A with an event in between | key A: page 1, `next` (page 2, `force: false`); rekey to B; one event; rekey back to A: the first page is `force: true`, and `next` to A's page 2 is `force: true`. The same walk without the event: that `next` is `force: false` |
| H19 | screen switch | on screen S1 set `fieldFilter.color = "red"` through `reset(next)`; switch to S2: every `fetchPage` call after the rekey receives exactly S2's `initialFilters`, with no `fieldFilter.*` of S1 |
| H20 | epochs persist | `familyEpoch` after an event, `reset(next)`, `rekey` and a `reset` result is ≥ its value before (never 0 again); `reset(f2)` then `reset(f1)`: navigation to an f1 slot read after the last event is `force: false` |
| H21 | slot bound | 257 recorded slots: the oldest is evicted and, after an event, forced |

H3 stands with the `listKey` object: a new object with the same `fetchKey` and
a new closure makes zero calls.

### R6-04 — Reset detection by discriminant (MEDIUM; S2-A)

The identity sentinel (R4-07 `RESET_PAGE`, `adminListResetPage`,
`isAdminListResetPage`) is removed. A view that maps a client page (for
example to view rows) creates a new object, and identity detection then
missed the reset. Every cached-client page method returns the discriminated
read. `fetchPage` returns the client result UNCHANGED: a view passes the
client method itself, or a closure that only binds scope arguments and
returns the client promise as is. It never `.then`-maps it. View mapping
happens after the hook has classified the result, through the `mapItems`
option. `mapItems` is applied only to `kind: "page"` reads and to hydrated
pages.

```ts
// core/admin/services/adminListEnvelope.ts (R6-04; AdminListPage/AdminListEnvelope/emptyAdminListPage stand)
export type AdminListPageRead<I, S = never, F = never> = AdminListEnvelope<I, S, F> | AdminListPage<I>; // R3-15 union, renamed
export type AdminListRead<I, S = never, F = never> =
  | Readonly<{ kind: "page"; page: AdminListPageRead<I, S, F> }>
  | Readonly<{ kind: "reset" }>
  | Readonly<{ kind: "superseded" }>;           // AdminListRead<I> = a summary-less read (pickers)
export const ADMIN_LIST_RESET: Readonly<{ kind: "reset" }> = Object.freeze({ kind: "reset" });
export const ADMIN_LIST_SUPERSEDED: Readonly<{ kind: "superseded" }> = Object.freeze({ kind: "superseded" });
export const hasAdminListSummary = <I, S, F>(page: AdminListPageRead<I, S, F>): page is AdminListEnvelope<I, S, F> =>
  Object.hasOwn(page, "summary") && Object.hasOwn(page, "facets");
// detection is ALWAYS `read.kind`; never `===` against a constant
// per client: PageListRead = AdminListRead<PageListItem, PageListSummary, PageListFacets> (text unchanged, new meaning);
//   PageListPageRead = AdminListPageRead<…> for getCached*/hydrate; likewise Post*, User*, Form*, Media*, Entry*, Booking*
// getCachedPosts(filters?): PostListPageRead | null; listPostsCached(filters?, options?): Promise<PostListPageRead> (legacy)

// core/admin/ui/shared/useBoundedAdminList.ts (R6-04)
type FetchPage<R, S, F, Fl> = (filters: Fl, cursor: string | null, o: { force: boolean }) => Promise<AdminListRead<R, S, F>>;
type LoadResult<I, S, F> = Readonly<{ kind: "page"; read: AdminListPageRead<I, S, F> }>
  | Readonly<{ kind: "chain"; reads: readonly AdminListPageRead<I, S, F>[]; stack: Stack }>
  | Readonly<{ kind: "reset" }> | Readonly<{ kind: "superseded" }>;
const DROPPED = Symbol("dropped");               // R5 token-superseded chain: dispatches nothing (was SUPERSEDED)
const mapPage = <R, I, S, F>(page: AdminListPageRead<R, S, F>, mapItems: (items: readonly R[]) => readonly I[]) =>
  ({ ...page, items: mapItems(page.items) }) as AdminListPageRead<I, S, F>; // summary/facets untouched, own keys kept
async function runRequest<R, I, S, F, Fl>(fetchPage: FetchPage<R, S, F, Fl>, mapItems: (items: readonly R[]) => readonly I[],
  p: Pending<Fl>, isLatest: () => boolean): Promise<LoadResult<I, S, F> | typeof DROPPED> {
  if (p.request.kind === "page") {
    const read = await fetchPage(p.filters, p.request.cursor, { force: p.request.force });
    return read.kind === "page" ? { kind: "page", read: mapPage(read.page, mapItems) } : read; // reset | superseded as is
  }
  const reads: AdminListPageRead<I, S, F>[] = []; const stack: (string | null)[] = []; let cursor: string | null = null;
  for (let i = 0; i < p.request.depth; i += 1) {
    if (!isLatest()) return DROPPED;
    const read = await fetchPage(p.filters, cursor, { force: true });
    if (read.kind !== "page") return read;       // one reset/superseded page ends the chain with that outcome
    reads.push(mapPage(read.page, mapItems)); stack.push(cursor);
    if (!read.page.hasMore || read.page.nextCursor === null) break;
    cursor = read.page.nextCursor;
  }
  return isLatest() ? { kind: "chain", reads, stack } : DROPPED;
}
export function useBoundedAdminList<R extends { id: string }, S, F, Fl, I extends { id: string } = R>(o: Readonly<{
  mode: BoundedListMode; listKey: BoundedListKey<Fl>; fetchPage: FetchPage<R, S, F, Fl>;
  hydrate: (f: Fl) => AdminListPageRead<R, S, F> | null;
  mapItems?: (items: readonly R[]) => readonly I[] }>) { // identity when omitted; required by an overload when I ≠ R
  // mapItems is read through the same ref as fetchPage (new closure, no refetch); initState maps the hydrated page;
  // the append dedupe runs on MAPPED ids; the effect dispatches `loaded` unless the result is DROPPED
}
```

**Tests.** `task551PaginatedListViews.test.tsx` row H22 "mapping adapter".
A client stub returns `{ kind: "reset" }` during a `loadMore`. The hook uses
`mapItems: (rows) => rows.map(toViewRow)`. The result: status `reset`, the
hint, exactly one forced `null` recovery call, `mapItems` never called with
anything but a page's items, and the recovered rows rendered mapped. The
same adapter with `{ kind: "superseded" }` gives H15's outcome.
`task551PaginatedClients.test.ts`: "no identity sentinel remains". A static
read of `core/admin/services/*.ts` and `core/admin/ui/shared/*.ts(x)` finds
no `isAdminListResetPage`, `adminListResetPage` or `RESET_PAGE`, and no
`=== ADMIN_LIST_RESET`/`=== ADMIN_LIST_SUPERSEDED`. In R3-16, R4-07 and R5-09
(d), (e), (f), (h) and R5 H13, every assertion of `isAdminListResetPage(x)`
reads as `x.kind === "reset"`, and every "resolves the reset page" reads as
"resolves `{ kind: "reset" }`".

### R6-05 — Baseline re-capture needs a clean wave state (MEDIUM; S3-A)

This supersedes the R5-12 **Lost baseline** sentence (quoted below). A root-tsc
baseline (INITIAL `…/audit-evidence/03-l02-root-tsc-baseline.txt`, FINAL
`…-baseline-final.txt`) may be RE-captured only when the working tree has no
03-L02 wave edits. That means every one of the 321 fence `allowlist` paths is
byte-identical to that occurrence's pre-wave commit. For INITIAL, this is the
commit the orchestrator records immediately before W0's first edit. For
FINAL, it is the commit recorded immediately before FINAL's first edit
(R5-13). Otherwise re-capture is BLOCKED. A tracked copy is then restored
with `git show <commit>:<path>` only if its SHA-256 equals the receipt's.
Without such a copy, the orchestrator STOPS and reports to the owner. It
never captures over wave edits. The first capture (R5-12, R5-13) meets the
same rule by construction.
**Git-state receipt** (in the W0 receipt for INITIAL and the FINAL receipt
for FINAL; one object per capture or re-capture):
`{ occurrence: "initial" | "final", kind: "capture" | "re-capture",
preWaveCommit, head, allowlistSha256, committedDiff: [], worktreeDiff: [],
baselinePath, baselineSha256, previousBaselineSha256?, reason? }`.
`head` = `git rev-parse HEAD`. `allowlistSha256` is the SHA-256 of the fence
allowlist joined by `\n`. `committedDiff` = `git diff --name-only
<preWaveCommit> HEAD -- <allowlist>` and `worktreeDiff` = `git status
--porcelain=v1 --untracked-files=all -- <allowlist>`, with every path passed
as a `:(literal)` pathspec. Both must be empty. `reason` and
`previousBaselineSha256` are required for `re-capture`. The receipt holds
commit ids, repository paths and digests only: no environment values and no
compiler output.

### R6-06 — File size after the cap raise (MEDIUM; S3-A, S3-B)

The TASK-551-11 cap raise (R6-00) supersedes the R5 **Size note** "a further
round needs a split first" (quoted below). No new task file is created and
this file is not split. After Round 6, the file is
573,282 bytes, so about 464 KiB of the 1,048,576-byte cap
remains. Closure edits (`**Status:**`, `**Started:**`, `**Completed:**`, ≤
200 bytes in total) and post-audit amendments fit. **Stop rule.** Before
any later append, the writer measures `wc -c` on this file. If the append
would end above 1,048,576 bytes, the writer stops and reports to the
orchestrator: no split, no trim, and no cap change outside TASK-551-11.

### R6-07 — Four pairwise-disjoint booking windows (LOW; S1-A)

This refines R5-02 and R3-03's "What stands" legs. The owning suite is
`tests/integration/server/task551AdminWriteConcurrency.test.ts`. The week-cap
seed, the 50-way race window, the reactivation-leg windows and the year-2300
blackout window are four pairwise-disjoint windows derived from the suite's
`RUN` (`randomUUID()`). The R4-01 lock-wait proof also needs its own window.
As a writer refinement it gets a fifth window, disjoint from the other four.

```ts
// tests/integration/server/task551AdminWriteConcurrency.test.ts (test-local helper; not exported)
const HOUR_MS = 3_600_000;
function bookingLegWindows(run: string) {
  const k = Number.parseInt(run.slice(0, 8), 16) % 4096;       // RUN-derived slot 0..4095
  const block = Date.UTC(2400, 0, 1) + k * 14 * 24 * HOUR_MS;   // 14-day marker block, years 2400..2557
  const blackout = Date.UTC(2300, 0, 1) + k * HOUR_MS;          // year 2300 (R3-03, R5-02)
  return Object.freeze({
    weekCap: { from: block, to: block + 167 * HOUR_MS },                      // 501 × 20 min, status "pending"
    race: { from: block + 168 * HOUR_MS, to: block + 169 * HOUR_MS },         // 50-way create race
    reactivation: { from: block + 170 * HOUR_MS, to: block + 174 * HOUR_MS }, // both R2-02 reactivation legs
    lockWait: { from: block + 175 * HOUR_MS, to: block + 176 * HOUR_MS },     // R4-01 proof (writer refinement)
    blackout: { from: blackout, to: blackout + HOUR_MS / 2 },                 // global blackout leg
  });
}
```

- **Week cap.** The suite inserts 501 rows DIRECTLY (one multi-row INSERT on
  the owner DB, not through `createBookingReservation`). They have status
  `pending`, are on the marker resource/service only, and slot i =
  `[weekCap.from + 20 min × i, +20 min)` for i = 0..500. The last slot ends at
  `weekCap.to` (167 h). The route leg queries `{ from: weekCap.from, to:
  weekCap.to, resourceId }` (167 h ≤ 196 h) and expects 500 items +
  `truncated`. The R2-30 counters never count the seed.
- **Race.** All 50 creates use `[race.from, race.from + 30 min)` on the
  marker resource. The R5-02 precondition read (no global or marker blackout
  overlaps `race`) stands.
- **Reactivation.** Leg (a), cancelled over active, uses `[reactivation.from,
  +1 h)`. Leg (b), two overlapping cancelled rows reactivated concurrently,
  uses `[reactivation.from + 2 h, +3 h)`.
- **Blackout.** The global blackout covers `blackout`, and the leg's own
  active marker reservation lies inside it. The leg asserts exactly one
  INSERT, no lock and no conflict SELECT, and deletes that blackout id in
  `finally` (R3-03 stands).
- **Lock wait.** Both marker resources use `lockWait`.

**Test** (DB-free block): "booking leg windows are pairwise disjoint and
RUN-derived". It uses RUN `00000000-0000-4000-8000-000000000000` (k = 0),
`00000fff-0000-4000-8000-000000000000` (k = 4095) and 256 `randomUUID()`
values. For each, the five windows are pairwise disjoint (`a.to <= b.from ||
b.to <= a.from`), `blackout` lies in UTC year 2300 and every other window
lies in year ≥ 2400, `weekCap` spans exactly 167 h, and equal RUN values give
equal windows. The DB legs build every timestamp from `bookingLegWindows(RUN)`
only.

### R6-08 — TASK-551-11 ripple corrections (03-L02 side)

**(1) Ripple anchors** (C17 v4 `:6574-6576`, verified 2026-09-26 at
`66203e22`). The symbol stays authoritative wherever a line drifts.

| C17 v4 anchor (quoted) | Today (step 2 green) | Final home |
|---|---|---|
| `task551WorkflowContracts.test.ts:121-125` `expectedL11SidecarTests` | `tests/unit/workflows/task551WorkflowContracts.test.ts:123-128` (4 entries since step 2) | `tests/unit/workflows/task551WorkflowContractsFixtures.ts` (`expectedL11SidecarTests`), landing at 11 re-open step 5 |
| `task551EvidenceContract.test.ts:901` (reads all split files plus the helper) | the matrix test "keeps test-only declaration imports and the owner bridge closed", `tests/unit/workflows/task551EvidenceContract.test.ts:883` (reads at `:885-908`) | `tests/unit/workflows/evidenceContractMatrix.test.ts` (the matrix test), landing at 11 re-open step 6 |
| `task-551-worktree-compatibility.mjs:111-115` `ownedTests` | `_docs/_workflows/lib/task-551-worktree-compatibility.mjs:113-118` (sidecar `ownedTests`) | `_docs/_workflows/lib/task-551-phase-provenance.mjs` (sidecar `ownedTests`) after step 3 (11 **V4-6**) |

These edits belong to TASK-551-11. They are not binding on 03-L02, and 03-L02
edits none of these files.
**(1b) V4-6 stale-anchor notice.** The pre-split `task-551-dispatch-contract.mjs`
anchors cited by this file now resolve as follows (verified at `66203e22`;
the quoted text stays authoritative):

| Cited at | Old anchor | Current anchor |
|---|---|---|
| `:6619` | `task-551-dispatch-contract.mjs:96`, "checked `:168-170`" | `task-551-dispatch-primitives.mjs:6`; `requireText` `:76-78` |
| `:4497` | `:750-751` (self-collision) | `task-551-dispatch-envelope.mjs:376-377` (`normalizeEnvelope`, `:346`) |
| `:4601` | `:776-785` (command references) | `task-551-dispatch-envelope.mjs:402-411` |
| `:5899` | `:784-785` (unreferenced command) | `task-551-dispatch-envelope.mjs:410-411` |
| `:3849` | `:873-875` (occurrence groups) | `task-551-dispatch-contract.mjs:186-188` (facade, `normalizeGraph` `:140`) |
| `:2393` | `:956-959` (cross-owner allowlist) | `task-551-dispatch-contract.mjs:269-272` (facade, `reconcileTask551Dispatch` `:216`) |
| `:4554` | `:977-987` (dependency union) | `task-551-dispatch-contract.mjs:290-300` (facade) |

The `:3138` "`task-551-dispatch-contract.mjs` rules" now read as the rules
of the facade, `task-551-dispatch-envelope.mjs` and
`task-551-dispatch-primitives.mjs` together.
**(2) "The split landed".** In R4-12 **Precondition 5 (C13 v4)**
(`:6483-6485`) and in C13 v4 item 5 (`:6544-6547`), "the split landed" now
means that TASK-551-11 re-open steps 1-7 are ALL green AND the receipt
`_docs/_workflows/_smoke/task-551/impl-11-reopen-20260925.json` exists. This
is 11 **V4-7** (`:1236`), which supersedes **V3-5**'s "v3 steps 1-5". State
on 2026-09-26: steps 1 (`03d42b90`) and 2 (`66203e22`) are green; steps 3-7
are pending, and the receipt does not exist yet. INITIAL W0 stays blocked
until both conditions hold. The per-file line caps are the 11 contract's own
(text authoritative there). The receipt is inventoried by R4-10
`FAMILY_RECEIPT_GLOSS` entry 1 (`impl-[a-z0-9-]+\.json`), so there is no
inventory delta. Anchor note: the 11 contract calls `:6545-6547` "the C14 v4
row". The text is C13 v4 item 5 under "### C13 v4 — Pre-dispatch
preconditions" (`:6542`). The C14 v4 table (`:6531-6535`) has no such row.
**Self-cap figure.** The C17 v4 "≤ 1,300" for the 11 contract file is
11-owned and superseded there (the 11 fence now reads `awk 'NR > 1900'`,
`TASK-551-11…md:987`). It is informational here.

### Superseded sentences (Round 6)

Each quote is verbatim (text authoritative). The replacement is the named
Round-6 item.

1. C9 (`:2687-2689`): "`clear*` exports keep names and signatures and also
   invoke the client's L04 reset; reset clears maps and promises and advances
   (never zeroes) monotonic generation/epoch counters." → R6-01: a `clear*`
   export runs the client's `invalidate` and never the L04 reset. The
   registered reset alone advances `resetGeneration`.
2. C9 (`:2727-2728`): "export const clearPagesCache = () => { /* unchanged
   name */ pageCache.clear();
     pagePromises.clear(); pagesGeneration += 1; };" → R6-01 `clearPagesCache`.
3. R3-15 (`:5249`): "export type AdminListRead<I, S, F> = AdminListEnvelope<I,
   S, F> | AdminListPage<I>;     // any cached-client result" → R6-04 (the
   union is renamed `AdminListPageRead`; `AdminListRead` is the discriminated
   read).
4. R3-15 (`:5250-5251`): "export const hasAdminListSummary = <I, S, F>(read:
   AdminListRead<I, S, F>):
     read is AdminListEnvelope<I, S, F> => Object.hasOwn(read, "summary") &&
   Object.hasOwn(read, "facets");" → R6-04 (it takes an `AdminListPageRead`).
5. R3-15 (`:5266`): "// getCachedPosts(filters?): PostListRead | null;
   listPostsCached(filters?, options?): Promise<PostListRead>" → R6-04
   (`PostListPageRead`).
6. R3-18 (`:5457-5458`): "// Mutations (create/invite/update/enable/disable/roles/delete)
   clear userPageCache and advance
   // usersGeneration after success; no createMemoryBackedLocalCache, no
   localStorage/sessionStorage." → R6-01 (mutations call
   `clearAdminUsersCache`; no storage, as before).
7. R4-07 (`:6299-6301`): "const RESET_PAGE = Object.freeze({ items:
   Object.freeze([]), nextCursor: null, hasMore: false });" / "export const
   adminListResetPage = <I>(): AdminListPage<I> => RESET_PAGE as unknown as
   AdminListPage<I>; // 3 own keys (R3-15)" / "export const
   isAdminListResetPage = (read: unknown): boolean => read === RESET_PAGE;
          // identity, not shape" → R6-04.
8. R5 hook (`:6725`): "// LoadResult = R4-06 page | chain | reset. Actions:
   reset(filters, hydrated) | rekey(fetchKey) | next | previous" → R6-04
   `LoadResult`, R6-03 actions.
9. R5 hook (`:6727`): "const slot = (c: string | null) => (c === null ?
   "\u0000first" : c);" → R6-03 `slotKey`.
10. R5 hook (`:6738-6739`): "// initState(mode, fetchKey, filters, hydrated,
    seq, familyEpoch, force): R3-17 hydration fields, stack [null], empty
    epoch
    //   map, status hydrated ? "ready" : "loading"; then issue(page(null,
    [null], false, force || !!hydrated || familyEpoch > 0))" → R6-03
    `initState`.
11. R5 table (`:6746`): "| `reset(f, h)` | none (supersedes pending) |
    `initState(mode, fetchKey, f, h, seq, familyEpoch, false)` |" and
    (`:6747`) "| `rekey(k)` | `k !== fetchKey` | `initState(mode, k, filters,
    null, seq, 0, true)` |" → R6-03 table.
12. R5 table (`:6755`): "| `loaded` reset | token = pending, not recovery |
    rows/summary/facets/epochs cleared, stack `[null]`, `hasMore false`;
    `issue(page(null, [null], false, true, true), "reset")` — one recovery
    read, subsumes a queued revalidate |" → R6-03 table (epochs kept,
    `familyEpoch + 1`; the recovery still subsumes a queued revalidate).
13. R5 hook (`:6760`): "const SUPERSEDED = Symbol("superseded");", (`:6775`)
    "return isLatest() ? { kind: "chain", reads, stack } : SUPERSEDED;" and
    (`:6795`) "(result) => { if (result !== SUPERSEDED) dispatch({ type:
    "loaded", token: pending.token, result }); }," → R6-04 `DROPPED` (same
    semantics, renamed so that it cannot be confused with the client outcome
    `superseded`).
14. R5 hook (`:6764`): "return isAdminListResetPage(read) ? { kind: "reset" }
    : { kind: "page", read };" and (`:6770`) "if (isAdminListResetPage(read))
    return { kind: "reset" };" → R6-04 `runRequest`.
15. R5 hook (`:6777-6780`): "export function useBoundedAdminList<I extends {
    id: string }, S, F, Fl>(o: Readonly<{ mode: BoundedListMode;
      fetchKey: string; filters: Fl; fetchPage: FetchPage<I, S, F, Fl>;
    hydrate: (f: Fl) => AdminListRead<I, S, F> | null }>) {
      const [state, dispatch] = useReducer(reducer<I, S, F, Fl>, null,
        () => initState(o.mode, o.fetchKey, o.filters, o.hydrate(o.filters),
    0, 0, false));" → R6-03/R6-04 options (`listKey`, `mapItems`); the lazy
    initializer uses `o.listKey.fetchKey` and `o.listKey.initialFilters`.
16. R5 hook (`:6788`): "void Promise.resolve().then(() => { if (live) {
    keyRef.current = fetchKey; dispatch({ type: "rekey", fetchKey }); } });"
    → R6-03 key-change branch.
17. R5-11 (`:6821-6823`): "Views pass
    `boundedListFetchKey(family, scope)` (`{ typeSlug }`, `{ screenId }`,
    `{ resourceId }` or `{}`)." → R6-03: views pass `boundedListKey(family,
    scope, initialFilters)` with the same scopes.
18. R5-09 (`:6870`): "if (!isCurrentAdminCacheInstallationToken(token) ||
    generation !== pagesGeneration) return adminListResetPage<PageListItem>();
    // (R)", and the R5-09 `request = listPagesPage(filters,
    cursor).then(async (envelope): Promise<PageListRead> => {` form (`:6869`)
    together with its `resolveOvertakenPageRead(latest, token, generation)`
    (`:6874`, `:6878-6887`) → R6-01/R6-02 template.
19. R5-10 (`:6907-6909`): "`if
    (!isCurrentAdminCacheInstallationToken(token)) return
    adminListResetPage<PostListItem>();` FIRST" → R6-01 posts bullet
    (`readPostsListPage` resolves `{ kind: "reset" }`; `listPostsCached`
    resolves `emptyAdminListPage()`); and (`:6917-6918`) "(p1)
    `advanceAdminCacheInstallationAuthority()` during the await →
    `isAdminListResetPage`, slot and memory empty" → the same with
    `readPostsListPage(...).kind === "reset"`. (p2) and (p3) stand for
    `listPostsCached` and `readPostsListPage` respectively, the latter
    asserting `kind: "reset"`.
20. R5-12 (`:6941-6942`): "**Lost baseline:** re-captured only with an
    explicit receipt note (reason, new sha256, tree state), never silently."
    → R6-05.
21. R5 preamble (`:6618-6620`): "**Size note.** This file is now within ~1.5
    KB of the 512 KiB `TASK551_MAX_TASK_FILE_BYTES` cap
    (`task-551-dispatch-contract.mjs:96`, checked `:168-170`); a further
    round needs a split first." → R6-06.
22. C17 v4 (`:6573-6577`): "The three extra split edits are binding:
    `task-551-worktree-compatibility.mjs:111-115` `ownedTests`,
    `task551WorkflowContracts.test.ts:121-125` `expectedL11SidecarTests`, and
    `task551EvidenceContract.test.ts:901` (reads all split files plus the
    helper). The split lands before 03-L02 W0." → R6-08 (1) and (2): the
    anchors are re-homed; "lands before 03-L02 W0" means steps 1-7 green plus
    the receipt.
23. R4-12 (`:6483-6485`): "**Precondition 5 (C13 v4).** The TASK-551-11
    split of `tests/unit/workflows/task551AuthorAudit.test.ts` (1,241 lines on
    2026-09-25) into three files of ≤ 700 lines each lands before W0." and C13
    v4 (`:6545-6547`): "**TASK-551-11 split (R4-12, R4-16).**
    `task551AuthorAudit.test.ts` and its split siblings are each ≤ 700 lines,
    and the TASK-551-11 receipt records the split. Otherwise INITIAL W0 is
    blocked." → R6-08 (2) (the receipt is `impl-11-reopen-20260925.json`; the
    caps are the 11 contract's).

**Stands** (non-exhaustive reminders): R3-16's "installs nothing"; R4-07's
**Newer rejects** (when there is no reset and no invalidation); R4-08 (week);
R5-04..R5-08 and R5-11 except the quotes above; R5-09's static check and
(R)-before-(O); R5-12's argv, file, diff and inventory rules; R5-13.

### Security Contract rows (Round 6)

No route, schema, auth, RBAC, CSRF or rate-limit change: endpoint visibility,
auth model and buckets stay as in Rounds 2-5. **Reset isolation.** A read
overtaken by a reset or identity transition resolves `{ kind: "reset" }`,
before or after any await and even after a rejection. It never resolves
memory, slot or other-audience rows (R6-01, R6-02). Detection is by
discriminant, so view mapping cannot hide a reset (R6-04). **Invalidation.**
A superseded completion installs nothing, and a pre-invalidation in-flight
request is never joined (R6-01). **Scope-bound filters.** A rekey never
sends another scope's `fieldFilter.*`/`systemFilter.*` (R6-03), so a screen's
filter values never reach another screen's request. **Users.** The list
stays memory-only, and `clearAdminUsersCache` touches no Storage (R3-18,
R6-01). **Evidence.** The R6-05 git-state receipts hold commit ids, paths and
digests only.

### Handoffs (Round 6)

- **TASK-551-10-L02 (owed mirror).** The `ADMIN_CACHE`/`ADMIN_CACHE_MAP`
  delta: the two-counter model per paged client (`invalidationEpoch` vs
  `resetGeneration`), the lazy family subscriptions (R6-01 table), the new
  export `clearAdminUsersCache` (memory-only), `clearFormsCache` covering form
  submissions, and the `readPostsListPage`/`listPostsCached` split. 10-L02
  records these in its next append-only section (another writer's file).
- **TASK-554.** Unchanged. `listPostsCached` keeps every TASK-554 pin
  byte-for-byte (R6-01 posts bullet).
- **TASK-551-11.** Nothing owed. R6-08 is the 03-L02 side of **V3-5**,
  **V4-6**, **V4-7** and **V6-5**.
- **TASK-551-01-L01.** Unchanged. Round 6 adds no server statement (the
  clients and hook are browser-side; R6-07 is test-only).
- **Orchestrator.** R6-05 receipts. The R6-06 stop rule. INITIAL W0 waits for
  R6-08 (2).

### Envelope record (Round 6)

No edit: the fence (`:1441-2172`) stays byte-identical, with allowlist 321,
forbidden 52, commands 34, `initial` 30 and `final` 11. Every path this round
names was checked against the fence on 2026-09-26. These are allowlisted:
`core/admin/services/{pagesClient,postsClient,entriesClient,entriesClientPagination,formsClient,mediaClient,bookingClient,adminUsersClient,detailPagesClient,adminListEnvelope}.ts`,
`core/admin/ui/shared/useBoundedAdminList.ts`,
`core/admin/ui/shared/BoundedListFooter.tsx`, the views
(`PageListPage.tsx`, `PostsListPage.tsx`, `EntryList.tsx`,
`CustomScreenEntriesPage.tsx`, `useCustomScreenEntryList.ts`,
`FormListPage.tsx`, `FormSubmissionsPage.tsx`, `MediaLibraryPage.tsx`,
`MediaPicker.tsx`, `BookingPage.tsx`, `UsersRolesPage.tsx`,
`useUsersRolesCollections.ts`),
`tests/vitest/admin/task551PaginatedClients.test.ts`,
`tests/vitest/admin/task551PaginatedListViews.test.tsx` (the mandate's
`.test.ts` spelling is corrected; the file is `.tsx`),
`tests/vitest/admin/{bookingClient,adminUsersClient,postsClient}.test.ts` and
`tests/integration/server/task551AdminWriteConcurrency.test.ts`. These are
forbidden and consumed only: `core/admin/services/cachePolicy.ts`,
`core/admin/utils/cacheBus.ts` and `core/admin/utils/adminCacheAuthority.ts`.
No new key or edit is needed there. The R6-05 receipts are orchestrator
evidence under the existing family gloss. One JSON fence.

## Dated Contract Corrections — 2026-09-26 (Round 7: posts epoch isolation, self-emitted events, layout effect, bounds per mode, baselines; append-only)

Source: `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round7-dispositions.md`
(R7-01..R7-13 over the Round-6 auditors S1-A, S1-B, S2-A, S2-B and S3-A;
HEAD `420bb24ad9973ded1a5cdc93561c8bf502a09238`, TASK-551-11 re-open step 4
in flight, other leaves' files dirty). This section applies R7-01..R7-13.
**This section wins** over every earlier part where they differ. No in-place
edit: the fence (`:1441-2172`), "Validation Commands" and all earlier text
stay byte-identical, and there is no envelope delta. The section is appended
after `contract :7736`, so no citation shifts. Anchors were re-read on
2026-09-26 at `420bb24a`. Every sentence this round supersedes is quoted
verbatim under "Superseded sentences (Round 7)" (text authoritative; a hard
line wrap inside a quote is rendered as one space). Everything not quoted
there stays binding.

### R7-01 — Posts: a list-only invalidation epoch; TASK-554 state isolated (HIGH; S2-A, S2-B)

**Finding (verified).** `postsClient.ts:293` is the only advancer of
`postsCacheAuthorityEpoch`, and every post mutation broadcasts
`cacheKeys.postsList` to local handlers inside its settle
(`publishPostMutationCacheEvents`, `:333-336`; also `:494`, `:712`).
`cacheBus.ts:151-153` delivers local handlers synchronously. Under the R6-01
posts row, a posts subscription that ran the posts `invalidate` through the
authority epoch or `clearPostsCache` would wipe the slot that
`upsertCachedPost` had just patched and would turn an in-flight
`listPostsCached` into `getCachedPosts() ?? empty`, breaking
`tests/vitest/admin/postsClientCacheAuthority.test.ts:725-750` and
`:769-781`.

**Rule.** The posts lazy subscription NEVER calls `clearPostsCache` and NEVER
advances `postsCacheAuthorityEpoch`. Posts hook pages (every
`readPostsListPage` read, first page and cursor pages) get their own
list-only `postsInvalidationEpoch`. Two things advance it: the
subscription's `invalidatePostsList` and `clearPostsCache`. It is never read
by a TASK-554 path. The TASK-554 ticket/epoch paths, `cachedPostsPromises`,
the default slot `postsListCache`, the detail/tombstone/publication maps and
the body of `listPostsCached` (C9 v2 `:4027-4048` with the R5-10 token
check) are unchanged. `listPostsCached` is no longer a projection of
`readPostsListPage`. The direction is inverted: `readPostsListPage` calls
`listPostsCached(filters, { force: true })` for its first-page network read
and classifies the result.

```ts
// core/admin/services/postsClient.ts (R7-01; supersedes the R6-01 posts row and posts bullet quoted below)
let postsInvalidationEpoch = 1;                                   // list-only; advanced ONLY by invalidatePostsList
const postPageCache = new Map<string, CachedAdminListPage<PostListItem, PostListSummary, PostListFacets>>(); // C9 v2 map
const postPagePromises = new Map<string, Promise<PostListRead>>(); // readPostsListPage dedupe; never cachedPostsPromises
const postPageGenerations = new Map<string, number>();             // per-key request generation (+1 per network request)
const postPageLatest = new Map<string, Promise<PostListRead>>();   // latest request per key, set with the +1
const postFirstPageEpochs = new Map<string, number>();             // first-page key -> postsInvalidationEpoch of its last `page`
let postsSubscription: (() => void) | null = null;
const postsSelfEmit = createAdminListSelfEmitGuard(() => { postPagePromises.clear(); }); // R7-02
function invalidatePostsList(): void {                             // THE posts invalidate body
  postsInvalidationEpoch += 1; postPagePromises.clear();           // memory stays (stale); slot, authority epoch, TASK-554 maps untouched
}
function ensurePostsListSubscription(): void {                     // lazy on the first readPostsListPage; idempotent
  postsSubscription ??= subscribeCacheEvents((event, origin) => {
    if (origin === "local" && postsSelfEmit.isEmitting()) return;  // R7-02: the client's own emission
    if (event.key === cacheKeys.postsList) invalidatePostsList();  // never clearPostsCache, never postsCacheAuthorityEpoch
  });
}
export const clearPostsCache = () => {                             // name and signature unchanged
  /* HEAD body postsClient.ts:292-306, unchanged and first (advances postsCacheAuthorityEpoch) */
  /* C9 v2 addition (contract :4051): cachedPostsPromises.clear(); postPageCache.clear(); — CLEARED, not stale */
  invalidatePostsList();                                           // every authority advance also advances the list epoch
};
registerAdminModuleCacheReset(() => {                              // THE posts reset body (R5-10 `:123` rule, extended)
  clearPostsCache();
  postPageGenerations.clear(); postPageLatest.clear(); postFirstPageEpochs.clear(); // postPagePromises: cleared above
  postsSubscription?.(); postsSubscription = null;                 // lazily re-subscribed by the next readPostsListPage
});
export function readPostsListPage(filters: PostListFilters = DEFAULT_POST_LIST_FILTERS, cursor: string | null = null,
  options: { force?: boolean } = {}): Promise<PostListRead> {
  ensurePostsListSubscription();
  const key = buildAdminListCacheKey(cacheKeys.postsList, "page", filters, cursor);
  if (!options.force) {
    const hit = cursor === null
      ? (postFirstPageEpochs.get(key) === postsInvalidationEpoch ? getCachedPosts(filters) : null) // TASK-554 read
      : readVerifiedAdminListPage(postPageCache, key, filters, postsInvalidationEpoch);           // stale entry = miss
    if (hit) return Promise.resolve({ kind: "page", page: hit });
    const inFlight = postPagePromises.get(key); if (inFlight) return inFlight;
  }
  const token = captureAdminCacheInstallationToken();              // before any await
  const epoch = postsInvalidationEpoch; const mutation = postsSelfEmit.ownMutationEpoch();
  const keyGeneration = (postPageGenerations.get(key) ?? 0) + 1; postPageGenerations.set(key, keyGeneration);
  const isReset = () => !isCurrentAdminCacheInstallationToken(token);           // posts (R): the token only (R5-10)
  const isSuperseded = () => epoch !== postsInvalidationEpoch || mutation !== postsSelfEmit.ownMutationEpoch(); // (I)
  let request: Promise<PostListRead>;
  request = (async (): Promise<PostListRead> => {
    let firstPage: PostListPageRead | null = null; let envelope: PostListEnvelope | null = null;
    try {
      if (cursor === null) firstPage = await listPostsCached(filters, { force: true }); // TASK-554 ticket, reconcile, install
      else envelope = await listPostsPage(filters, cursor);                           // network envelope
    } catch (error) {
      if (isReset()) return ADMIN_LIST_RESET;                       // reset wins over error
      if (isSuperseded()) return ADMIN_LIST_SUPERSEDED;             // superseded wins over error
      throw error;
    }
    if (isReset()) return ADMIN_LIST_RESET;                         // (R)
    if (isSuperseded()) return ADMIN_LIST_SUPERSEDED;               // (I): also every authority-epoch advance
    if (postPageGenerations.get(key) !== keyGeneration) {           // (O)
      const latest = postPageLatest.get(key);
      if (latest === undefined || latest === request) throw new Error("admin_list_overtake_invariant");
      return resolveOvertakenPostRead(latest, isReset, isSuperseded); // the R6-01 resolveOvertakenPageRead body
    }
    if (firstPage !== null) { postFirstPageEpochs.set(key, epoch); return { kind: "page", page: firstPage }; }
    if (envelope === null) throw new Error("admin_list_overtake_invariant"); // unreachable: exactly one branch assigned
    postPageCache.set(key, { canonicalFilters: canonicalJson(filters), envelope, fetchedAtEpoch: epoch });
    return { kind: "page", page: envelope };
  })();
  const settle = () => { if (postPagePromises.get(key) === request) postPagePromises.delete(key); };
  void request.then(settle, settle);
  postPagePromises.set(key, request); postPageLatest.set(key, request);
  return request;
}
// getCachedPosts(filters) (C9 v2 :4007-4010) passes "hydrate": slot for the default filters, memory otherwise.
// Memory entries that the TASK-554 path installs (primePostsFirstPage, non-default filters) carry fetchedAtEpoch: 0.
// readPostsListPage never reads them through an epoch compare; its first-page freshness is postFirstPageEpochs.
```

**Why the TASK-554 reading holds.**

- `clearPostsCache` is the only advancer of `postsCacheAuthorityEpoch` (HEAD
  `:293`), and it always ends in `invalidatePostsList`. So an authority-stale
  first page always resolves `superseded` in `readPostsListPage`, and `reset`
  wins before it.
- `listPostsCached` never reads `postsInvalidationEpoch`,
  `postFirstPageEpochs` or any `postPage*` map. Its outcomes stay those of
  R5-10: a non-current token gives `emptyAdminListPage()`; an authority
  advance gives `getCachedPosts(filters) ?? emptyAdminListPage()`
  byte-for-byte (`TASK-554_Post_Metadata_Publish_RBAC_Hardening.md:1574-1582`);
  otherwise the reconciled envelope.
- A local `postsList` event from the client's own mutation is ignored (R7-02).
  A foreign or remote event runs `invalidatePostsList` only. Neither path
  touches the slot, the tickets, `inFlightPostListReads` or the authority
  epoch. So an in-flight `listPostsCached` resolves exactly as at HEAD.

**State per operation (posts).**

| Operation | `postsCacheAuthorityEpoch` | `postsInvalidationEpoch` | slot `postsListCache` | `postPageCache` | `postPageGenerations` / `postPageLatest` / `postFirstPageEpochs` | subscription |
|---|---|---|---|---|---|---|
| foreign/remote `postsList` event | unchanged | +1 | unchanged | kept, stale | kept | kept |
| own mutation (`postsSelfEmit.emit`) | unchanged | unchanged | TASK-554 patch stays | TASK-554 patch stays | kept; `ownMutationEpoch` +1, `postPagePromises` cleared | kept |
| `clearPostsCache()` | +1 (first) | +1 | cleared (HEAD body) | CLEARED (not stale) | kept | kept |
| registered reset | +1 (via `clearPostsCache`) | +1 | cleared | cleared | cleared | unsubscribed |

**Pinned test** (`tests/vitest/admin/task551PaginatedClients.test.ts`,
posts block): "posts: TASK-554 pins hold with the list subscription
installed". It first resolves one `readPostsListPage()` with a stubbed
`fetch`, which installs the subscription. It then replays the scenarios of
`postsClientCacheAuthority.test.ts:725-750` ("a stale list read initiated by
a cache event merges a later metadata mutation before cache and return") and
`:769-781` ("a stale list read merges the forced publish detail instead of
its older scheduled row") with the same fetch stubs and byte-identical
assertions. It also asserts that `postsCacheAuthorityEpoch` is unchanged,
observed through a `listPostsCached` read that is not authority-stale. The
TASK-554 file `postsClientCacheAuthority.test.ts` is NOT edited. It keeps
running unmodified in fence commands `w2-client-vitest` and
`admin-pagination-vitest-1` (it is not changed by this contract; its
`afterEach` `clearPostsCache()` advances both epochs and does not
unsubscribe, which is harmless because `invalidatePostsList` touches no
TASK-554 state). A second row: "posts: clearPostsCache alone keeps the page
maps and the subscription; the registered reset clears them and
unsubscribes". Observable: after `clearPostsCache()`, a later overtaking pair
of cursor reads resolves the older one through the newer result (never
`admin_list_overtake_invariant`), and a foreign `postsList` event still
supersedes an in-flight cursor read (the subscription survived). After
`advanceAdminCacheInstallationAuthority()`, a foreign event before the next
read supersedes nothing (unsubscribed), and the next `readPostsListPage`
re-subscribes once.

### R7-02 — A client ignores the list events it emits itself (MEDIUM; S2-A; LOW S2-B)

**Finding (verified).** Mutations patch first and then broadcast their own
family key (`pagesClient.ts:340-341`, `mergeCachedPageIntoList` then
`pagesList` update; `mediaClient.ts:194`, `:216`, `:242`, `:260`, `:275`).
Local delivery is synchronous (`cacheBus.ts:151-153`). Under R6-01 the
client's own subscription would then clear the slot it had just patched and
mark the patched memory stale. **Choice (pinned).** The writer uses a
module-local emitting flag, not the cacheBus operation token. The operation
token is caller-owned: editor leases pass it through
(`PostClassicEditorShell.tsx:568`, `useCustomScreenEditorPersistence.ts:481`,
`customScreensClient.ts:516`). A client cannot substitute its own token
without breaking those filters, so it passes `options` through unchanged.

```ts
// core/admin/services/adminListEnvelope.ts (R7-02; consumes core/admin/utils/cacheBus.ts, forbidden, unchanged)
import { broadcastCacheEvent, type CacheEvent, type CacheEventBroadcastOptions } from "@/utils/cacheBus";
export type AdminListSelfEmitGuard = Readonly<{
  emit: (input: Readonly<Pick<CacheEvent, "key" | "action">>, options?: CacheEventBroadcastOptions) => void;
  isEmitting: () => boolean;         // true only inside the synchronous local delivery of an own emission
  ownMutationEpoch: () => number;    // +1 per own emission, BEFORE broadcasting; never reset, never zeroed
}>;
export function createAdminListSelfEmitGuard(onOwnEmit: () => void): AdminListSelfEmitGuard {
  let depth = 0; let mutations = 0;
  return Object.freeze({
    emit: (input, options = {}) => {
      mutations += 1; onOwnEmit();                     // fence: in-flight reads resolve superseded; dedupe cleared
      depth += 1;
      try { broadcastCacheEvent({ key: input.key, action: input.action }, options); } finally { depth -= 1; }
    },
    isEmitting: () => depth > 0,
    ownMutationEpoch: () => mutations,
  });
}

// every paged client (pages shown; the R6-01 template otherwise stands)
const pagesSelfEmit = createAdminListSelfEmitGuard(() => { pagePromises.clear(); });
function ensurePagesListSubscription(): void {
  pagesSubscription ??= subscribeCacheEvents((event, origin) => {
    if (origin === "local" && pagesSelfEmit.isEmitting()) return; // own emission: patched slot and memory stay
    if (event.key === cacheKeys.pagesList) invalidatePagesList(); // foreign local or remote: THE invalidate
  });
}
// listPagesPageCached: capture `const mutation = pagesSelfEmit.ownMutationEpoch();` beside `epoch`, and
//   const isSuperseded = () => epoch !== pagesInvalidationEpoch || mutation !== pagesSelfEmit.ownMutationEpoch();
// resolveOvertakenPageRead receives that isSuperseded unchanged (R6-01 signature).
```

**Rules.**

- Every broadcast of a client's OWN family list key (the R6-01/R7-12
  predicate keys) goes through `<client>SelfEmit.emit(input, options)`, with
  the caller's `options` passed through unchanged. Detail-key broadcasts
  (`pageDetail`, `postDetail`, `detailPageDetail`, …) may stay bare
  `broadcastCacheEvent` calls, because no list predicate matches them.
  Anchors at HEAD: pages `:323`, `:341`, `:383`, `:397`, `:432`, `:451`,
  `:473`; posts `:334` (inside `publishPostMutationCacheEvents`), `:494`,
  `:712`; media `:194`, `:216`, `:242`, `:260`, `:275`; detail pages `:206`,
  `:283`, `:308`, `:335` and their per-content-type list keys (`:210-213`,
  `:284-287`, `:309-312`, `:339-342`). For entries, forms and booking it is
  every `broadcastCacheEvent` whose `key` is one of that client's predicate
  keys. The symbol is authoritative where a line drifts.
- **Precondition of the ignore.** Each own emission is preceded, in the same
  synchronous mutation path, by the client's own local effect: a patch
  (merge, upsert, remove) or `clear<Family>Cache()`. HEAD already does this
  (for example `createPage` runs `clearPagesCache()` before its `invalidate`
  broadcast, `pagesClient.ts:322-323`, and `deletePage` runs
  `removeCachedPage(id)` before it, `:472-473`). A site with neither calls
  `clear<Family>Cache()` before `emit`.
- **Fence.** `emit` advances `ownMutationEpoch` and runs `onOwnEmit` (clears
  the client's page dedupe map) BEFORE broadcasting. A read in flight across
  the mutation therefore resolves `{ kind: "superseded" }` and installs
  nothing, so it can never overwrite the patch with pre-mutation rows.
  Memory freshness still compares only `invalidationEpoch`, so the patched
  memory entries and the patched slot stay fresh. This is a writer
  refinement that keeps "the patched slot and memory stay" true under
  concurrency. It makes the R6-01 same-epoch argument for (I)-before-(O)
  cover both counters, because both only grow.
- **Scope of the ignore.** `isEmitting()` is true only during the synchronous
  local handler loop of the client's own `emit`. Remote echoes of the client's
  own events never arrive, because cacheBus drops `sourceId === cacheBusId`
  (`cacheBus.ts` `deliverRemote`). A foreign broadcast of the same key that
  another module issues synchronously from inside a handler of that loop is
  also ignored. That is unreachable at HEAD (only `postsClient` emits
  `postsList`, only `mediaFoldersClient.ts:281` emits `mediaList` from
  outside `mediaClient`, and neither does so from a handler). If it is ever
  reached, the view hook still forces its read (R5-07).
- The hook side is unchanged: a view subscription still dispatches
  `revalidate()` for every event, own or foreign, so every rendered list
  forces one read after its own mutation.

**Affected existing pins (all stay green unmodified).** Each asserts the
patched cache after the client's own mutation. The ignore keeps exactly that
reading. Each broadcasts the same key/action sequence as at HEAD, so every
event-count pin stays intact.

- `tests/vitest/admin/mediaClient.test.ts:467` "media mutations patch the
  cached list and broadcast update events" (`:498-516`: `getCachedMedia()`
  after update, recover, replace, upload and delete; 5 `mediaList` events).
- `tests/vitest/admin/pagesClient.test.ts:293` (`:329`), `:701` (`:731`) and
  `:751` (`:823-841`), the page-merge and invalidate-on-create pins.
- `tests/vitest/admin/entriesClientMutationReconciliation.test.ts:73-89` and
  `tests/vitest/admin/entriesClient.test.ts:499-507`.
- `tests/vitest/admin/detailPagesClient.test.ts:274-282`.
- `tests/vitest/admin/formsClient.test.ts` and
  `tests/vitest/admin/bookingClient.test.ts`: no `getCached*` pin at HEAD
  (grep count 0). Their mutation and event-order tests stay green.
- `tests/vitest/admin/postsClient.test.ts` and
  `postsClientCacheAuthority.test.ts` (R7-01).

These suites run in fence commands `w2-client-vitest` and
`admin-pagination-vitest-1`. None is edited for R7-02.

### R7-03 — One layout effect writes every latest-render input (MEDIUM; S2-A, S2-B; security row)

The R5 layout effect (`:6782`) re-ran only when `o.fetchPage` changed
identity. A view whose `fetchPage` is stable across scopes (a client method
passed directly, as R6-04 allows) would keep `listKeyRef` at the old scope,
and `rekey` would dispatch the old scope's `initialFilters`. **Rule:** one
layout effect is the only writer of the three latest-render refs, with all
three inputs as deps.

```ts
// core/admin/ui/shared/useBoundedAdminList.ts (R7-03; replaces R5 :6782-6784 quoted below; :6781 `io` stands)
const identityItems = <T,>(items: readonly T[]): readonly T[] => items; // module level; used when mapItems is omitted
// inside useBoundedAdminList (after the useReducer lazy initializer of R6-03/R6-04):
const io = useRef(o.fetchPage);
const mapItemsRef = useRef(o.mapItems);
const listKeyRef = useRef(o.listKey);
useLayoutEffect(() => { io.current = o.fetchPage; mapItemsRef.current = o.mapItems;
  listKeyRef.current = o.listKey; }, [o.fetchPage, o.mapItems, o.listKey]); // the ONLY writer of the three refs
const fetchKey = o.listKey.fetchKey;
const keyRef = useRef(o.listKey.fetchKey); const latestTokenRef = useRef(0); // effects/callbacks only
const pending = state.pending;
// data effect (deps stay [fetchKey, pending], R5-11): runRequest(io.current, mapItemsRef.current ?? identityItems,
//   pending, isLatest); the key-change branch reads listKeyRef.current.initialFilters inside the microtask (R6-03)
```

- A view may build `listKey` inline, so the object is new on every render.
  The layout effect then runs on every render. It only writes refs: it never
  dispatches and never fetches. H3 stands, with zero calls for a new object
  with the same `fetchKey` and a new closure.
- `identityItems` is used only when `mapItems` is omitted. The R6-04 overload
  makes `I = R` in that case, so the fallback is sound (one function-level
  type assertion; no data cast).
- Layout effects run before passive effects in the same commit. So the
  microtask of the key-change branch always reads the `listKey` of the render
  that changed `fetchKey`.

**Test** (`task551PaginatedListViews.test.tsx`), row **H19b** "stable
fetchPage across screens". A module-level `fetchPage` spy keeps one identity
across renders, with the same `mapItems`. Two custom screens S1 and S2 are
over ONE content type: `listKey` S1 =
`boundedListKey("custom-screen-entries", { screenId: "s1" }, s1Initial)`, and
S2 likewise with `s2Initial`. On S1, `reset(next)` sets
`fieldFilter.color = "red"`. The test then re-renders with S2's `listKey` and
the same `fetchPage`. Every `fetchPage` call after the rekey receives filters
deep-equal to `s2Initial`, with no `fieldFilter.*` key of S1. The reverse
switch (S2 → S1) receives exactly `s1Initial`.

### R7-04 — Superseded-quote completion (MEDIUM; S2-A, S3-A)

Every sentence named by the disposition, plus every other sentence this
round changes, is quoted verbatim in "Superseded sentences (Round 7)" below:

- `:6724` and `:6728`, which go to R6-03 `stale`/`slotKey`;
- `:6754`, which goes to the R6-03 `loaded` row ("other entries are kept");
- `:6766` and `:6769-6773`, which go to R6-04 `runRequest` over the
  discriminated type;
- `:6782-6784`, which go to R7-03;
- `:6816-6818`, which go to the per-instance `slotKey` map;
- `:5256`, which goes to `CachedAdminListPage` with `fetchedAtEpoch`;
- `:5303` and the 3-argument `readVerifiedAdminListPage` calls at `:2715`,
  `:3954`, `:4010` and `:5315`, which go to the 4-argument form;
- `:2760-2762` F-40, which goes to R7-06;
- `:6841` H9, which goes to R7-07;
- `:6937-6938` and `:6946`, which go to R7-08.

**4-argument rule.** `readVerifiedAdminListPage(cache, key, filters, epoch)`
(R6-01 signature, `epoch: number | "hydrate"`, no default) is the only form.
Every `getCached*` accessor and every hook `hydrate` passes `"hydrate"`.
Every network-path hit check passes the client's current
`invalidationEpoch`. A 3-argument call is a type error, so `tsc` rejects it
and no extra test is needed.

### R7-05 — Test applicability matrix for `task551PaginatedClients.test.ts` (MEDIUM; S2-A)

This replaces "`test.each` over the seven client rows above, plus detail
pages when present" (quoted below). Each cell is one case, or "n/a
(reason)". Booking is one case per family (reservations, resources,
services, blackouts), because each family has its own slot and key under
the one booking epoch. Entries is one case per family (type,
custom-screen, all). "clear" means the column's public
`clear<Family>Cache` from the R6-01/R7-01/R7-12 table. "event" means a
foreign `broadcastCacheEvent` of a predicate key issued by the test itself,
not through the client's guard. "advance" means
`advanceAdminCacheInstallationAuthority()`. Each outcome is asserted through
public reads only: the resolved read, `getCached*` ("hydrate"), the stubbed
`fetch` call log and `Storage` spies.

| # | Test | Pages | Posts (`readPostsListPage`) | Entries ×3 | Forms (+ submissions) | Media | Booking ×4 | Users | Detail pages |
|---|---|---|---|---|---|---|---|---|---|
| T1 | clear during the await: resolves `superseded`, installs nothing | ✓ | ✓ for both `clearPostsCache()` and event; with event, `getCachedPosts()` before = after | ✓ each of `clearEntriesCache(slug)`, `clearAllEntriesCache()` | ✓ forms and submissions | ✓ | ✓ | ✓ `clearAdminUsersCache()` | ✓ `clearDetailPagesCache()` and `clearDetailPageListCache(id)` |
| T2 | advance during the await: resolves `reset` | ✓ | ✓ (token, R5-10) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| T3 | clear then advance in one await: `reset` wins | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| T4 | after clear/event, a non-forced read of a stale memory entry fetches, and a `"hydrate"` read still returns it | ✓ | event: cursor entry stale (fetches); first page fetches (`postFirstPageEpochs` mismatch) while `getCachedPosts(f)` still returns it. `clearPostsCache()`: memory CLEARED, not stale (`getCachedPosts(nonDefault)` is `null`) | ✓ | ✓ | ✓ | ✓ | stale entry fetches ✓; hydrate n/a (memory-only, no `getCached*` export, R3-18) | ✓ |
| T5 | clear/event clears the in-flight dedupe and the persisted slot | ✓ | event: `postPagePromises` cleared, slot UNCHANGED (TASK-554-owned); `clearPostsCache()`: slot cleared by the HEAD body | ✓ every family slot | ✓ every slot the client holds | ✓ | ✓ each family slot | dedupe ✓; slot n/a (no slot, R3-18) | ✓ both key shapes |
| T6 | overtake observables: A, B for one key, B resolves, A resolves through B's result; A started before a clear and B after: A `superseded`, never B's rows installed by A; `admin_list_overtake_invariant` never thrown | ✓ | ✓ first page and cursor pages | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| T7 | lazy subscription: client-first gives one forced read; view-first gives two, the first `superseded` (R7-12 harness) | ✓ `pagesList` | ✓ `postsList`; `listPostsCached` outcome unchanged | ✓ `entriesList(slug)` and `entriesAllList` | ✓ `formsList` | ✓ `mediaList`, including a `mediaFoldersClient`-style foreign emission | ✓ each of the four list keys; the week key never invalidates a list | n/a (no users key in `cachePolicy.ts`, no subscription, R3-18) | ✓ `detailPagesList` and `detailPagesListByContentType(id)` |
| T8 | own emission (R7-02): the patched slot and memory stay; an in-flight read started before the mutation resolves `superseded` and does not overwrite the patch; a later foreign event of the same key does invalidate | ✓ `updatePage` | ✓ `publishPost`; the slot keeps the published row | ✓ | ✓ | ✓ `updateMedia` | ✓ | n/a (users broadcast no list key) | ✓ |
| T9 | static: every broadcast of an own predicate key goes through `<client>SelfEmit.emit` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | n/a (no list key) | ✓ |
| T10 | the reset unsubscribes; the next read re-subscribes once (observable: an event between reset and read supersedes nothing) | ✓ | ✓ (R7-01 second row); `clearPostsCache()` alone keeps the subscription | ✓ | ✓ | ✓ | ✓ | n/a (no subscription) | ✓ |
| T11 | R6-02 p3/p4/p5 rejection parity (reset > superseded > error; plain rejection installs nothing) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| T12 | TASK-554 reading: after a bare `clearPostsCache()`, `listPostsCached` resolves `getCachedPosts() ?? emptyAdminListPage()` while `readPostsListPage` resolves `superseded` | n/a (posts only) | ✓ | n/a | n/a | n/a | n/a | n/a | n/a |
| T13 | TASK-554 pins with the subscription installed (R7-01) | n/a (posts only) | ✓ | n/a | n/a | n/a | n/a | n/a | n/a |
| T14 | folder rename then facet refresh (R7-06) | n/a (media only) | n/a | n/a | n/a | ✓ | n/a | n/a | n/a |
| T15 | zero `Storage` calls across list, forced list, every mutation, clear and reset | n/a (persists by contract) | n/a | n/a | n/a | n/a | n/a | ✓ | n/a |

The R6-01 test titles map as follows: "installs nothing" → T1; "resolves
reset" → T2; "reset wins" → T3; "stale" → T4; "dedupe and slot" → T5;
"pageGenerations and pageLatest survive" → T6 (restated as observables,
R7-12); "family event" → T7; "unsubscribes" → T10; "posts: listPostsCached"
→ T12; "users: … no Storage" → T15. The R6-02 rows are T11. The R6-04 "no
identity sentinel remains" static row stands outside the matrix.

### R7-06 — F-40 is subsumed by the single media subscription (MEDIUM; S2-A; LOW S2-B)

C9 F-40 (`:2760-2762`, quoted below) is superseded. `mediaClient.ts` holds
exactly ONE lazy `subscribeCacheEvents` subscription, the R6-01 media row
with predicate `event.key === cacheKeys.mediaList`. A folder event from
`mediaFoldersClient.ts:281` (forbidden, consumed only) is a foreign local
event, so it runs `invalidateMediaList`. That is the only media
`invalidate`. It advances `mediaInvalidationEpoch` and clears the media
dedupe and slot. It thereby makes stale EVERY media memory entry for any
non-forced read, whether rows, `summary` or `facets`. It also covers any
summary/facet family the client holds, because one `invalidationEpoch`
covers all of a client's paged families (R6-01). This is the F-40 "clears
its summary/facet families on any event" under the two-counter model: stale
for the network path, readable only through `"hydrate"`. No second media
subscription and no separate facet clear exist. `mediaGeneration` is not
touched (an event is not a reset).

**Test** (matrix T14, "media: folder rename then facet refresh"):

1. A media page with facets F1 is installed. A forced read A for the same
   key is in flight.
2. The test broadcasts `{ key: cacheKeys.mediaList, action: "update" }` as
   `mediaFoldersClient` does (foreign; `renameMediaFolder` itself when the
   test stubs its fetch).
3. A resolves `superseded` and installs nothing.
4. The next non-forced `listMediaPageCached` for that key fetches, because
   the entry is stale, and resolves the fresh facets F2 (renamed folder
   label and count).
5. `getCachedMedia*` in `"hydrate"` returned F1 until the fetch landed.
6. A registered-reset probe shows that `mediaGeneration` did not move: a
   read started before the event resolves `superseded`, never `reset`.
7. Static: `mediaClient.ts` contains exactly one `subscribeCacheEvents(`
   call.

### R7-07 — Fetch bound per mode; an append `superseded` queues one chain (MEDIUM; S2-B)

**Bound.**

- **Paged mode**, and every non-merge page request in either mode (initial,
  `reset(next)`, recovery): at most 2 forced reads per event. A `superseded`
  page is re-run once, forced, under the new epoch (R6-01, H15). Client-first
  order gives one read.
- **Append mode, chain or `loadMore` merge page:** a `superseded` outcome
  never restarts anything immediately. The chain ends at that page: the
  already-fetched pages of that chain are discarded, and the hook's current
  rows, summary, facets and stack are kept. The outcome sets
  `revalidateQueued`, and when the pending request settles, exactly ONE
  forced chain from `null` follows. For a chain, it runs at depth
  `d = min(stack.length, 20)`. For a `loadMore` page, it runs at
  `min(stack.length + 1, 20)`, so the requested page is folded into the
  chain.
- Every view `revalidate()` that arrives while the request is pending
  coalesces into the same flag, and `issue` subsumes it. So N invalidations
  during one depth-d chain cost at most `d` fetches (the chain stops at its
  first superseded page and fetches nothing after it; R6-04 `runRequest`)
  plus `d` (the one re-run): at most `2 × d`, independent of N.
- Invalidations that land during the re-run start one more such cycle. Each
  cycle needs a fresh invalidation during its own await, so there is no
  retry counter.

```ts
// core/admin/ui/shared/useBoundedAdminList.ts (R7-07; the `loaded` superseded rows; MAX_APPEND_DEPTH = 20)
const onSuperseded = <I, S, F, Fl>(s: State<I, S, F, Fl>, p: Pending<Fl>): State<I, S, F, Fl> => {
  const next: State<I, S, F, Fl> = { ...s, familyEpoch: s.familyEpoch + 1, pending: null }; // rows/summary/facets/stack/status kept
  if (p.request.kind === "chain") return drain({ ...next, revalidateQueued: true });        // ONE chain, depth min(stack, 20)
  if (p.request.merge)                                                                       // append loadMore page
    return issue(next, { kind: "chain", depth: Math.min(s.cursorStack.length + 1, MAX_APPEND_DEPTH) }, "loadingMore");
  return issue(next, { ...p.request, force: true }, s.status);                              // paged / non-merge page
};
// issue(...) reads the NEW familyEpoch, so pending.epoch === familyEpoch after the re-run is issued (R7-12),
// and issue() clears revalidateQueued, which subsumes every queued view revalidate.
```

| Action | Guard | Next state (supersedes the R6-01 "Hook rules" re-run sentence quoted below) |
|---|---|---|
| `loaded` superseded, page request, `merge = false` (paged or append) | token = pending | `onSuperseded` → one forced re-run of `pending.request` (`recovery` kept); status unchanged; no reset UI |
| `loaded` superseded, `chain` (append) | token = pending | `onSuperseded` → `pending null`, `revalidateQueued = true`, then `drain` issues ONE chain, depth `min(stack.length, 20)`, every fetch forced |
| `loaded` superseded, page request, `merge = true` (append `loadMore`) | token = pending | `onSuperseded` → the page is neither re-run nor appended; ONE chain, depth `min(stack.length + 1, 20)`, status `loadingMore`; the chain's `loaded` row replaces the rows atomically (R6-03 row) |

**Tests** (`task551PaginatedListViews.test.tsx`):

| # | Transition | Assertion |
|---|---|---|
| H9 (restated) | chain burst, stub never `superseded` | depth 3, a `fetchPage` stub that never resolves `superseded`; one event starts the chain and N more arrive during it: 3 + 3 forced calls for N = 1 and N = 10 (at most 2 × depth, independent of N) |
| H16 (rewritten) | `superseded` during an append `loadMore` | with or without a queued event: no re-run of the page; exactly one forced chain from `null` with depth `stack.length + 1`; the rows are replaced once with the chain's pages (old pages + the requested page); status never `reset`, no hint |
| H23 | storm with real client invalidations | `append` mode over the real `listPagesPageCached` (stubbed `fetch` with deferred responses), 3 pages rendered. One foreign `pagesList` event starts a depth-3 chain (the test's subscriber calls `revalidate()` per event). During page 2's await the test fires N more foreign events (N = 1 and N = 10), each also calling `revalidate()`. GET `/pages…` count = 2 (chain up to the superseded page 2) + 3 (the one re-run) = 5 for both N, which is ≤ 2 × 3. Exactly one atomic replace. `status` never `reset`, no hint. `lastRequest` is the chain |

H15 (paged) stands. H22's `superseded` variant now gives the H16
(rewritten) outcome.

### R7-08 — Root-tsc baselines leave `audit-evidence/`; TASK-551-11 obligations (MEDIUM; S3-A)

**Paths.** `audit-evidence/` is the TASK-551-11 closed canonical root
(`_docs/_workflows/lib/task-551-evidence-contract.mjs:17`
`TASK551_CANONICAL_EVIDENCE_ROOT`). It admits only the eleven manifest
destinations, and any foreign direct entry blocks recovery (11 contract
`:512`, V7-1 `:1535`). The INITIAL and FINAL root-tsc baselines therefore
move to:

- INITIAL: `_docs/_workflows/_smoke/task-551/03-l02-baselines/03-l02-root-tsc-baseline.txt`
- FINAL: `_docs/_workflows/_smoke/task-551/03-l02-baselines/03-l02-root-tsc-baseline-final.txt`

Every other R5-12/R5-13/R6-05 rule is unchanged: tracked, orchestrator-written
only, the argv, the key, the multiset diff, the sha256 in the W0/FINAL
receipt, and the R6-05 git-state receipt (whose `baselinePath` holds the new
path). No baseline has been captured yet (INITIAL W0 is blocked, R6-08 (2)),
so nothing moves on disk.

**Inventory (R5-12 update; owner TASK-551-03-L02; written at W0).** The two
`FAMILY_RECEIPT_EXACT_PATHS` entries that R5-12 appended become:

```ts
// tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts (W0; replaces the two R5-12 audit-evidence entries)
  "_docs/_workflows/_smoke/task-551/03-l02-baselines/03-l02-root-tsc-baseline.txt",       // owner: TASK-551-03-L02
  "_docs/_workflows/_smoke/task-551/03-l02-baselines/03-l02-root-tsc-baseline-final.txt", // owner: TASK-551-03-L02
```

No R4-10 gloss matches `03-l02-baselines/`. The `task-551-admin-lists
sessions` regex needs the `03-l02/` directory followed by a session
directory and `.png`. So the exact paths are the only classification, and
the R4-10 "Every exact path matches" test covers both. The FINAL path is
declared ahead of capture, as before.

**TASK-551-11 obligations** (these replace the Round-6 Handoffs row
"TASK-551-11. Nothing owed.", quoted below):

- (a) **Relocation (11 V7-1 `:1539`).** The orchestrator's untracked
  `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-faza0-dispositions.md`
  and `…/03-l02-round{2,3,4,5,6,7}-dispositions.md` are foreign direct
  entries under the canonical root. They must be relocated out of
  `audit-evidence/` before TASK-551-10-L02 closure. Owner: orchestrator
  follow-up, cited from 03-L02. 03-L02 edits no evidence file. When they
  move, the citations of Rounds 2-7 in this file (their `Source:` lines,
  for example `:6612`, `:6988` and this section's own) are re-pointed by
  ONE append-only "relocation map" section in this file (old path → new
  path), never by an in-place edit. If the destination is tracked, it also
  needs an R4-10 gloss or exact path. That is an edit to
  `smoke-evidence-inventory.test.ts` (03-L02 W0-owned), so the relocation
  lands before W0 or its entry joins the W0 edit.
- (b) **V11-2 `./` argv.** Adopted for every Round-6/7 gate that names a
  `tests/unit/workflows/*.test.ts` path. See "Gate argv (Round 7)" below.

### R7-09 — RUN shape for the write-concurrency suite (MEDIUM; S1-B)

The C-section idiom "copy … a `randomUUID()` RUN marker (`:118`)" (`:2944`,
quoted below) cites
`tests/integration/server/task551RevisionConcurrency.test.ts:118`,
``const RUN = `task551-06l02-concurrency-${randomUUID()}`;``. That RUN has a
non-hex prefix, so `Number.parseInt(run.slice(0, 8), 16)` is `NaN`. For
`tests/integration/server/task551AdminWriteConcurrency.test.ts` ONLY, the
RUN shape is pinned as below. The other new suites keep the `:118` idiom.

```ts
// tests/integration/server/task551AdminWriteConcurrency.test.ts (R7-09; test-local, not exported)
const RUN = randomUUID();                                      // bare lowercase UUID (node:crypto)
const MARKER = `t551-03l02-write-${RUN}`;                      // every fixture slug, email and name; afterAll deletes MARKER rows only
const BOOKING_LEG_RUN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function bookingLegWindows(run: string) {
  if (!BOOKING_LEG_RUN_PATTERN.test(run)) throw new Error("booking_leg_run_invalid"); // fail closed, never NaN windows
  /* the R6-07 body, unchanged: k, block, blackout and the five frozen windows */
}
```

**DB-free vectors** (added to the R6-07 test "booking leg windows are
pairwise disjoint and RUN-derived"): `bookingLegWindows("task551-x")`
throws `booking_leg_run_invalid`, and so does
`bookingLegWindows(\`task551-06l02-concurrency-${randomUUID()}\`)`. The
bare-UUID vectors of R6-07 still pass.

### R7-10 — Booking-window wording (LOW; S1-A, S1-B)

- **Citations.** R4-01 superseded R3-03 in full (`:5940`). The "What stands"
  list belongs to R4-01 (`:5959-5962`), as extended by R5-02 (`:6639-6649`).
  So R6-07 "This refines R5-02 and R3-03's "What stands" legs." now reads
  "This refines R5-02 and R4-01's "What stands" legs (`:5959-5962`)." The
  blackout bullet's "(R3-03 stands)" now reads "(R5-02 stands)". The helper
  comment `// year 2300 (R3-03, R5-02)` now reads `// year 2300 (R4-01,
  R5-02)`. Nothing of R3-03 is revived: no `40P01` retry and no
  `withReservationExclusion`.
- **Heading.** R6-07 is read as "Five pairwise-disjoint booking windows
  (four + the R4-01 lock-wait window)".
- **Reactivation legs.** Leg (a) uses
  `[reactivation.from, reactivation.from + 1 h)`. Leg (b) uses
  `[reactivation.from + 2 h, reactivation.from + 3 h)`. Both lie inside
  `reactivation` (`[block + 170 h, block + 174 h)`).
- **Seed client.** "one multi-row INSERT on the owner DB" now reads "one
  multi-row INSERT through the suite's `db` client (`<db-env>`
  `DATABASE_URL`)".
- **Global-blackout precondition.** Before the blackout leg creates its own
  reservation, one bounded read runs:
  `db.select({ id: bookingBlackouts.id }).from(bookingBlackouts).where(and(isNull(bookingBlackouts.resourceId), lt(bookingBlackouts.startsAt, new Date(w.blackout.to)), gt(bookingBlackouts.endsAt, new Date(w.blackout.from)))).limit(1)`.
  It must return zero rows. Otherwise the leg fails with the explicit
  message `booking_leg_blackout_window_occupied: a global blackout overlaps
  the RUN blackout window` (for example one leaked by a killed earlier run).
  It never deletes a row it did not create.
- **DB-free test addition.** "every leg timestamp lies inside its declared
  window". It checks all 501 week-cap slots in `weekCap`, the race slot in
  `race`, legs (a) and (b) in `reactivation`, the lock-wait reservations in
  `lockWait` and the blackout leg's reservation in `blackout`, each as
  `from <= start && end <= to`.

### R7-11 — R6-08 state refreshed (LOW; S3-A)

The R6-08 (1) table and the (2) state line are refreshed as of `420bb24a`
(the symbol stays authoritative wherever a line drifts):

| C17 v4 anchor (quoted) | Today (step 4 in flight, sha_3 `420bb24a`) | Final home |
|---|---|---|
| `task551WorkflowContracts.test.ts:121-125` `expectedL11SidecarTests` | `tests/unit/workflows/task551WorkflowContracts.test.ts:126-131` (4 entries at `420bb24a`; the uncommitted step-4 tree extends the list) | `tests/unit/workflows/task551WorkflowContractsFixtures.ts`, step 5 (unchanged) |
| `task551EvidenceContract.test.ts:901` | `tests/unit/workflows/task551EvidenceContract.test.ts:883` (unchanged) | `tests/unit/workflows/evidenceContractMatrix.test.ts`, step 6 (unchanged) |
| `task-551-worktree-compatibility.mjs:111-115` `ownedTests` | `_docs/_workflows/lib/task-551-phase-provenance.mjs:116-121` (sidecar `ownedTests`, landed at step 3) | reached at step 3 (11 **V4-6**) |

**State (replaces the R6-08 (2) state line, quoted below).** Steps 1-3 are
committed (`03d42b90`, `66203e22`, `420bb24a`). Step 4 is in flight. Steps
5-7 are pending. The receipt
`_docs/_workflows/_smoke/task-551/impl-11-reopen-20260925.json` is absent.
INITIAL W0 stays blocked (R6-08 (2) rule unchanged).
**Not adopted:** the S3-A LOW proposal to add
`_docs/_workflows/_smoke/task-551/11-reopen/.gitignore` to
`FAMILY_RECEIPT_EXACT_PATHS`. 11 **V8-1** (`:1608`) supersedes the V7-1 "tracked
`.gitignore`" sentence, and `git ls-files _docs/_workflows/_smoke/task-551/11-reopen/`
is empty on 2026-09-26. So the `git ls-files`-based inventory never sees
that directory.

### R7-12 — Detail pages row, H21 rewrite, observable pins, event-order harness (LOW; S2-A, S2-B)

**Eighth client row (unconditional).** C9 v2 already fixes
`DEFAULT_DETAIL_PAGE_LIST_FILTERS` (`:3994`), so the R6-01 condition is
true, and the conditional bullet (quoted below) is replaced by a table row:

| Client (file) | Public clear (HEAD anchor) | Families invalidated | `resetGeneration` | `invalidationEpoch` | Subscription predicate on `event.key` |
|---|---|---|---|---|---|
| `detailPagesClient.ts` | `clearDetailPagesCache()` (`:188`), `clearDetailPageListCache(contentTypeId?)` (`:176`) | detail-pages (the global list and every per-content-type list, for either call) | `detailPagesGeneration` | `detailPagesInvalidationEpoch` | `.startsWith(cacheKeys.detailPagesList)` (matches `detailPagesListByContentType(id)`, `cachePolicy.ts:45-47`; never `detailPageDetail(id)`) |

Both clears keep their HEAD bodies and then run the client's `invalidate`.
The client's reset body follows the pages body with its own maps and
`detailPagesSelfEmit` (R7-02). The client has a matrix column (R7-05).

**H21 (rewritten; supersedes the R6-03 H21 row quoted below).** Paged mode,
`fetchPage` stub:

1. Mount, then one event: `familyEpoch` is 1, and the current `null` slot is
   re-read forced and recorded at 1.
2. Record 256 more slots with `next`, 257 slots in total, all at epoch 1,
   with no further event.
3. Walk back with `previous`. Every retained slot is `force: false`. The
   evicted oldest (the `null` first-page slot) is `force: true`.

Control, with 256 slots in total: the same walk ends with the `null` slot at
`force: false`.

**Observable pins (replacing private-state pins).**

- R6-01 "memory, slot and `pageLatest` are unchanged by that completion" is
  asserted through `getCached*` ("hydrate") before and after, and through the
  fetch log.
- "pageGenerations and pageLatest survive clear<Family>Cache" is matrix T6:
  an overtaken read resolves through the newer result and never throws
  `admin_list_overtake_invariant`.
- H20's "`familyEpoch` … is ≥ its value before (never 0 again)" is asserted
  as: after an event followed by `reset(next)`, `rekey`, or a `reset` result,
  navigation to a slot read before that event is `force: true`. The H20
  `reset(f2)`/`reset(f1)` clause stands.

**Event-order harness (R6-01 "Event order", R7-05 T7).** "View-first" is a
subscriber registered BEFORE the client's lazy subscription. The test runs
the registered reset (unsubscribe), registers the harness subscriber, and
only then makes the first client read, so the client subscribes after the
harness. The harness handler calls
`list<X>PageCached(filters, cursor, { force: true })` synchronously and
keeps the promise; on `superseded` it re-runs the same call forced, as the
hook does. A foreign `broadcastCacheEvent` of a predicate key gives: the
first forced read `superseded`, the re-run `page`, 2 network reads.
"Client-first" registers the harness after the first read: 1 network read,
`page`. The rendered hook never starts a read inside a handler (it only
dispatches `revalidate()`), so the hook-level count for one local event is
1. The hook pin for a `superseded` re-run: it is `issue(...)` AFTER
`familyEpoch + 1` (R7-07 `onSuperseded`), so `pending.epoch` equals the new
`familyEpoch`. Observable: after the re-run's page lands and no further
event arrives, navigating away and back to that slot is `force: false`.
Own-mutation slot clearing is closed by R7-02 (matrix T8).

### R7-13 — Labels and ranges (INFO; S3-A)

- Round-6 quote 1 is labelled "C9". `:2687-2689` lies under "### C8 —
  Preservation clauses (O13)" (`:2658`), so the label reads "C8"; the quote
  text is unchanged.
- The Round-6 preamble's **V3-5** range `:1103-1110` reads `:1103-1106`
  (V3-6 starts at `:1108`).
- The R6-06 figure is confirmed: Round 6 ended at 573,282 bytes. The Round-7
  size is under "Envelope record (Round 7)".
- The R6-08 L11 paths are named in the "Envelope record (Round 7)".

### Gate argv (Round 7; TASK-551-11 V11-2, `:1854-1865`)

`bun test` treats a bare argument as a substring filter and a `./`-prefixed
one as an exact path (11 **V11-1** `:1858`). Every Round-6/7 gate that names
a `tests/unit/workflows/*.test.ts` path is therefore written with `./`:

- R6-00 boundary suite and the R6-06 stop-rule companion:
  `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test ./tests/unit/workflows/dispatchContractCaps.test.ts`
  (3 pass, 0 fail; T3 accepts the live 03-L02 file).
- Writer check of a 03-L02 append (optional, when present):
  `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test ./tests/unit/workflows/task551AuthorAudit.test.ts`.

The fence is not edited. Its one bare `tests/unit/workflows` path is
`tests/unit/workflows/task554WorkflowContracts.test.ts` in command
`owned-module-consumers-bun` (argv of 41 test paths). It gets a
precondition instead: before running that command, the orchestrator checks
that `find . -path ./node_modules -prune -o -name 'task554WorkflowContracts.test.ts' -print`
prints exactly `./tests/unit/workflows/task554WorkflowContracts.test.ts`.
Any other match (for example a dry-run copy under `11-reopen/`) STOPS the
gate before it runs, and the orchestrator reports it. This is a procedure
note with no envelope delta. The `./` form joins the argv the next time the
fence is legitimately edited.

### Superseded sentences (Round 7)

Each quote is verbatim (text authoritative; a hard wrap is one space). The
replacement is the named Round-7 item.

1. R5 hook state (`:6724`): "fetchedAtEpoch: ReadonlyMap<string, number> }>;
   // slot(cursor) -> epoch captured at issue" → R6-03: the per-instance map
   keyed by `slotKey(fetchKey, filters, cursor)`, at most 256 entries.
2. R5 hook (`:6728`): "const stale = <I, S, F, Fl>(s: State<I, S, F, Fl>, c:
   string | null) => (s.fetchedAtEpoch.get(slot(c)) ?? 0) < s.familyEpoch;"
   → R6-03 `stale` over `slotKey`.
3. R5 table (`:6754`): "| `loaded` page/chain | token = pending | R4-06
   merge/dedupe/summary/stack, `ready`, `pending null`; page: `slot(cursor)
   → pending.epoch`; chain: map rebuilt from `result.stack`; then `drain` |"
   → R6-03 `loaded` page/chain row (page sets its `slotKey`; chain sets every
   `result.stack` cursor; other entries are kept).
4. R5 hook (`:6766`): "const reads: AdminListRead<I, S, F>[] = []; const
   stack: (string | null)[] = []; let cursor: string | null = null;" and
   (`:6769-6773`): "const read = await fetchPage(p.filters, cursor, { force:
   true }); // a rejection rejects the chain" / "if
   (isAdminListResetPage(read)) return { kind: "reset" };" / "reads.push(read);
   stack.push(cursor);" / "if (!read.hasMore || read.nextCursor === null)
   break;" / "cursor = read.nextCursor;" → R6-04 `runRequest` over the
   discriminated `AdminListRead` (`read.kind`, `read.page.*`, `mapPage`).
5. R5 hook (`:6782-6784`): "useLayoutEffect(() => { io.current =
   o.fetchPage; }, [o.fetchPage]); // R5-11: new closure, no refetch" / "const
   keyRef = useRef(o.fetchKey); const latestTokenRef = useRef(0);   //
   effects/callbacks only" / "const { fetchKey } = o; const pending =
   state.pending;" → R7-03.
6. R5-07 (`:6816-6818`): "The epoch record lives in hook state per cursor
   slot because `familyEpoch` is per hook and client maps cannot compare it."
   → R6-03: per hook instance, keyed by `slotKey(fetchKey, filters, cursor)`,
   persisting across `rekey`, `reset(next)` and a `reset` result.
7. R3-15 (`:5256`): "export type CachedAdminListPage<I, S, F> = Readonly<{
   canonicalFilters: string; envelope: AdminListEnvelope<I, S, F> }>;" →
   R6-01 `CachedAdminListPage` with `fetchedAtEpoch`.
8. R3-16 (`:5303`): "pageCache.set(key, { canonicalFilters:
   canonicalJson(filters), envelope });" → R6-01 install with
   `fetchedAtEpoch: epoch`.
9. The 3-argument reads: C9 (`:2715`) "const hit =
   readVerifiedAdminListPage(pageCache, key, filters);", C9 v2 (`:3954`)
   "const hit = readVerifiedAdminListPage(pageCache, key, filters)", C9 v2
   (`:4010`) ": readVerifiedAdminListPage(postPageCache,
   postFirstPageKey(filters), filters);" and R3-16 (`:5315`) "return
   readVerifiedAdminListPage(pageCache, key, filters)           // 2.
   verified memory" → R7-04 4-argument rule (`"hydrate"` for every
   `getCached*`/hydrate call, including `getCachedPosts`; the client's
   `invalidationEpoch` on the network path).
10. C9 F-40 (`:2760-2762`): "**Folders (F-40).** `mediaClient` subscribes to
    `cacheKeys.mediaList` (sent by `mediaFoldersClient.ts:281`, read-only)
    and clears its summary/facet families on any event. Test: folder rename
    then facet refresh." → R7-06 (one media subscription;
    `invalidateMediaList`; T14).
11. R5 H9 (`:6841`): "| H9 | chain burst | depth 3, one event starts the
    chain, N more during it: 3 + 3 forced calls for N = 1 and N = 10 (≤ 2 ×
    depth, independent of N) |" → R7-07 H9 (restated for a stub that never
    resolves `superseded`; the bound is now written as a rule and holds with
    real invalidations, H23).
12. R5-12 (`:6935-6939`): "**File:** the sorted error lines
    (`file(line,col): error TSxxxx: message`, continuation lines joined) go
    to `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-root-tsc-baseline.txt`
    (tracked; sha256 in the W0 receipt; orchestrator-written only)." and
    (`:6945-6948`) "W0 appends both baseline paths
    (`…/audit-evidence/03-l02-root-tsc-baseline.txt` and
    `…-baseline-final.txt`, owner TASK-551-03-L02) to
    `FAMILY_RECEIPT_EXACT_PATHS` (`:6428-6433`);" → R7-08 (`03-l02-baselines/`
    paths and the two replacement entries).
13. R5-13 (`:6954-6955`): "captures its OWN baseline immediately before its
    first edit, same argv/cwd, to
    `…/audit-evidence/03-l02-root-tsc-baseline-final.txt`" → R7-08 (FINAL
    path).
14. C-section new DB suites (`:2943-2945`): "a `randomUUID()` RUN marker
    (`:118`); every fixture slug/email carries the marker" → R7-09 for
    `task551AdminWriteConcurrency.test.ts` only (bare `RUN`, separate
    `MARKER`); the other suites keep it.
15. R6 preamble (`:6993-6994`): "11 contract **V3-5** (`:1103-1110`)" → R7-13
    (`:1103-1106`).
16. R6-01 (`:7031-7034`): "`invalidate` runs from the client's public
    `clear<Family>Cache` (mutation callers) and from the client's lazy
    cacheBus subscription to its family keys (any origin, `local` or
    `remote`; `core/admin/utils/cacheBus.ts:18-22`, consumed only)." →
    R7-02 (any origin except the client's own local emission).
17. R6-01 (`:7035-7037`): "`invalidate` does three things: it marks the page
    memory stale (entries stay, each keeping the `fetchedAtEpoch` it was
    installed at), it clears the in-flight dedupe map, and it clears the
    persisted first-page slot." → R7-01 (posts: the TASK-554 slot is not
    cleared by `invalidatePostsList`); unchanged for every other client.
18. R6-01 (`:7041-7043`): "The hook then re-runs that request silently in
    the background: there is no reset UI, and the current rows stay rendered
    until the fresh page lands." → R7-07 (paged and non-merge pages re-run;
    an append chain or `loadMore` page queues one chain; no reset UI in any
    case).
19. R6-01 template (`:7077`): "pagesSubscription ??=
    subscribeCacheEvents((event) => { if (event.key === cacheKeys.pagesList)
    invalidatePagesList(); });" → R7-02 handler (`origin` plus
    `pagesSelfEmit.isEmitting()`).
20. R6-01 table (`:7177`): "| `postsClient.ts` | `clearPostsCache()` (`:292`)
    | posts | installation token (R5-10) | `postsCacheAuthorityEpoch`
    (TASK-554) | `=== cacheKeys.postsList` |" → R7-01. The row now reads:
    `postsClient.ts` | `clearPostsCache()` (`:292`) | posts hook pages
    (TASK-554 state by its own HEAD body) | installation token (R5-10) |
    `postsInvalidationEpoch` (list-only; never `postsCacheAuthorityEpoch`) |
    `=== cacheKeys.postsList`.
21. R6-01 posts bullet (`:7188-7197`): "Its first-page path is the R5-10 path
    with discriminated outcomes: a non-current token gives `{ kind: "reset"
    }`, and an authority-epoch advance gives `{ kind: "superseded" }`.
    Cursor pages follow the generic template with `postsCacheAuthorityEpoch`
    as the epoch. `listPostsCached(filters?, options?)` stays the
    TASK-554-facing legacy projection of `readPostsListPage(filters, null,
    options)`: `page` → the page; `superseded` → `getCachedPosts(filters) ??
    emptyAdminListPage()` byte-for-byte (TASK-554 `:1574-1582`); `reset` →
    `emptyAdminListPage()`." → R7-01 (`readPostsListPage` wraps
    `listPostsCached(filters, { force: true })` for the first page; every
    page uses `postsInvalidationEpoch`; `listPostsCached` keeps its own
    C9 v2 + R5-10 outcomes and is no projection).
22. R6-01 detail bullet (`:7206-7209`): "**Detail pages.** If
    `detailPagesClient.ts` holds paged maps (C9 v2
    `DEFAULT_DETAIL_PAGE_LIST_FILTERS`), then `clearDetailPagesCache` and
    `clearDetailPageListCache` follow the pages body with their own
    `detailPagesGeneration`/`detailPagesInvalidationEpoch`." → R7-12 (the
    unconditional eighth row).
23. R6-01 event order (`:7217`): "The bound is ≤ 2 forced reads per event."
    → R7-07 (bound per mode).
24. R6-01 hook rules (`:7219-7221`): "A `superseded` result re-runs
    `pending.request` (which equals `lastRequest`) with `force: true`,
    keeping `merge`, `recovery` and the chain depth." and (`:7224-7226`) "A
    queued revalidate is subsumed, except when the re-run is an append
    `merge` page. There the queue survives, and `drain` then refreshes the
    whole chain." → R7-07 `onSuperseded` and its three rows. The
    `familyEpoch + 1`, "Rows, summary, facets and `status` stay unchanged"
    and "no retry counter" sentences stand.
25. R6-01 tests (`:7229-7231`): "(`test.each` over the seven client rows
    above, plus detail pages when present):" → R7-05 matrix; (`:7233-7234`)
    "(memory, slot and `pageLatest` are unchanged by that completion)" and
    (`:7240-7241`) "pageGenerations and pageLatest survive
    clear<Family>Cache; only the registered reset clears them and advances
    the generation" → R7-12 observables (T1, T6).
26. R6-01 H16 (`:7254`): "| H16 | `superseded` during an append `loadMore`
    with a queued event | the page re-runs forced, then one chain
    revalidate; otherwise a queued revalidate is subsumed (paged: exactly
    one call after the settle) |" → R7-07 H16 (rewritten).
27. R6-03 H20 (`:7335`): "`familyEpoch` after an event, `reset(next)`,
    `rekey` and a `reset` result is ≥ its value before (never 0 again)" →
    R7-12 (observable `force: true` on a pre-event slot); the rest of H20
    stands.
28. R6-03 H21 (`:7336`): "| H21 | slot bound | 257 recorded slots: the oldest
    is evicted and, after an event, forced |" → R7-12 H21 (rewritten).
29. R6-04 hook comment (`:7399`): "// mapItems is read through the same ref
    as fetchPage (new closure, no refetch);" → R7-03 (`mapItemsRef`, written
    by the same single layout effect; new closure, no refetch).
30. R6-04 H22 (`:7408-7409`): "The same adapter with `{ kind: "superseded"
    }` gives H15's outcome." → R7-07 (the H16 rewritten outcome: one chain
    at depth `stack.length + 1`, rows mapped).
31. R6-05 (`:7420-7422`): "A root-tsc baseline (INITIAL
    `…/audit-evidence/03-l02-root-tsc-baseline.txt`, FINAL
    `…-baseline-final.txt`) may be RE-captured only when the working tree
    has no 03-L02 wave edits." → R7-08 (the `03-l02-baselines/` paths; the
    re-capture rule is unchanged).
32. R6-07 (`:7458`): "### R6-07 — Four pairwise-disjoint booking windows
    (LOW; S1-A)", (`:7460`) "This refines R5-02 and R3-03's "What stands"
    legs.", (`:7473`) "// year 2300 (R3-03, R5-02)", (`:7484-7485`) "one
    multi-row INSERT on the owner DB", (`:7494-7496`) "Leg (a), cancelled over
    active, uses `[reactivation.from, +1 h)`. Leg (b), two overlapping
    cancelled rows reactivated concurrently, uses `[reactivation.from + 2 h,
    +3 h)`." and (`:7499-7500`) "(R3-03 stands)" → R7-10.
33. R6-08 (1) header (`:7517`): "Today (step 2 green)", with the cells
    (`:7519`) "`tests/unit/workflows/task551WorkflowContracts.test.ts:123-128`
    (4 entries since step 2)" and (`:7521`)
    "`_docs/_workflows/lib/task-551-worktree-compatibility.mjs:113-118`
    (sidecar `ownedTests`)"; and R6-08 (2) (`:7546-7548`) "State on
    2026-09-26: steps 1 (`03d42b90`) and 2 (`66203e22`) are green; steps 3-7
    are pending, and the receipt does not exist yet." → R7-11.
34. Superseded sentences (Round 6), item 1 label (`:7564`): "1. C9
    (`:2687-2689`):" → R7-13 ("C8"; the quote text is unchanged).
35. Handoffs (Round 6) (`:7708-7709`): "**TASK-551-11.** Nothing owed. R6-08
    is the 03-L02 side of **V3-5**, **V4-6**, **V4-7** and **V6-5**." →
    R7-08 and "Handoffs (Round 7)".

**Stands** (non-exhaustive reminders): R6-01's two-counter model, (R) → (I)
→ (O), the rejection order and the reset bodies (with the R7-01 posts and
R7-12 detail-pages rows); R6-02; R6-03 except H20's quoted clause and H21;
R6-04 except the two quoted sentences; R6-05's rule and receipt shape;
R6-06 and its stop rule; R6-07 except the quoted wording; R6-08 (1b) and the
(2) rule; R5-10 (p1)-(p3); H15, H17, H18, H19, H22's reset variant.

### Security Contract rows (Round 7)

No route, schema, auth, RBAC, CSRF or rate-limit change. Endpoint
visibility, the auth model and rate-limit buckets stay as in Rounds 2-6.

- **TASK-554 authority isolation.** The posts list subscription never
  advances `postsCacheAuthorityEpoch`, never calls `clearPostsCache`, and
  never touches the TASK-554 slot, tickets, detail, tombstone or publication
  state (R7-01). A post mutation's cache publication and its epoch checks
  (`postsClient.ts:506`, `:522`, `:534`, `:707`) therefore cannot be skipped
  because of a list event.
- **Reset isolation.** Unchanged and extended to posts hook pages. A read
  overtaken by an installation advance resolves `{ kind: "reset" }` before
  the TASK-554 branch and even after a rejection (R7-01 `readPostsListPage`,
  R6-01, R6-02).
- **Own-emission ignore.** This is scoped to the synchronous local delivery
  of the client's own `emit`. Remote and foreign events still invalidate.
  The `ownMutationEpoch` fence keeps an in-flight pre-mutation read from
  installing over a patch (R7-02). The caller-owned cacheBus operation token
  passes through unchanged, so editor lease filtering is unaffected.
- **Scope-bound filters.** One layout effect writes `listKeyRef` for every
  render, so a rekey never sends another screen's `fieldFilter.*` or
  `systemFilter.*`, even with a stable `fetchPage` (R7-03, H19b).
- **Anti-amplification.** Fetches per event are bounded per mode: paged ≤ 2;
  append ≤ 2 × depth per storm window, independent of the event count
  (R7-07, H23).
- **Test fixtures.** The write-concurrency suite's windows fail closed on a
  malformed `RUN` (`booking_leg_run_invalid`). The global-blackout
  precondition read is bounded and never deletes foreign rows (R7-09,
  R7-10).
- **Evidence.** The baselines live outside the TASK-551-11 closed root, and
  the R6-05 receipts hold commit ids, paths and digests only (R7-08).

### Handoffs (Round 7)

- **TASK-551-10-L02 (owed mirror; another writer's file).** The
  `ADMIN_CACHE`/`ADMIN_CACHE_MAP` delta, in addition to the Round-6 items:
  - the posts list-only `postsInvalidationEpoch`, kept separate from the
    TASK-554 `postsCacheAuthorityEpoch`, and the inverted
    `readPostsListPage` → `listPostsCached` direction;
  - own-emission ignore through `createAdminListSelfEmitGuard` (emitting
    flag plus `ownMutationEpoch` fence);
  - detail pages as the eighth paged client;
  - F-40 subsumed by the single media subscription;
  - the per-mode fetch bound.

  10-L02 records these in its next append-only section.
- **TASK-554.** Unchanged, with no file edited. The proof is R7-01:
  `listPostsCached` never reads the list-only state, the subscription never
  touches TASK-554 state, own emissions are ignored, and
  `postsClientCacheAuthority.test.ts:725-750` and `:769-781` pass
  unmodified with the subscription installed (matrix T13, plus the
  unmodified file in `w2-client-vitest`).
- **TASK-551-11.** This row replaces "Nothing owed." (quote 35):
  - (a) the V7-1 relocation obligation (R7-08 (a); owner: orchestrator
    follow-up, cited from 03-L02; before TASK-551-10-L02 closure;
    `03-l02-faza0-dispositions.md` and `03-l02-round{2..7}-dispositions.md`);
  - (b) the V11-2 `./` argv is adopted for every Round-6/7 gate that names a
    `tests/unit/workflows/*.test.ts` path ("Gate argv (Round 7)"), plus the
    `owned-module-consumers-bun` precondition in place of a fence edit.

  R6-08, as refreshed by R7-11, remains the 03-L02 side of **V3-5**,
  **V4-6**, **V4-7** and **V6-5**. L11 edits none of 03-L02's files.
- **TASK-551-09-L04.** None. `cacheBus.ts` and `adminCacheAuthority.ts` stay
  forbidden and consumed only. R7-02 adds no cacheBus field and uses the
  existing `origin` argument.
- **TASK-551-01-L01.** Unchanged. Round 7 adds no server statement. The
  R7-10 precondition read is test-only.
- **Orchestrator.** The R7-08 relocation follow-up and baseline paths. The
  `owned-module-consumers-bun` precondition. The R6-06 stop rule (measured
  below). INITIAL W0 still waits for R6-08 (2).

### Envelope record (Round 7)

No edit: the fence (`:1441-2172`) stays byte-identical, with allowlist 321,
forbidden 52, commands 34, `initial` 30 and `final` 11. Every path this
round names was checked against the fence on 2026-09-26 at `420bb24a`.

- **Allowlisted:**
  - `core/admin/services/{pagesClient,postsClient,entriesClient,entriesClientPagination,formsClient,mediaClient,bookingClient,adminUsersClient,detailPagesClient,adminListEnvelope}.ts`
  - `core/admin/ui/shared/useBoundedAdminList.ts`
  - `core/admin/ui/custom-screens/{CustomScreenEntriesPage.tsx,useCustomScreenEntryList.ts}`
  - `tests/vitest/admin/{task551PaginatedClients,postsClientCacheAuthority,postsClient,mediaClient,pagesClient,entriesClient,entriesClientMutationReconciliation,formsClient,bookingClient,detailPagesClient,adminUsersClient}.test.ts`
  - `tests/vitest/admin/task551PaginatedListViews.test.tsx`
  - `tests/integration/server/task551AdminWriteConcurrency.test.ts`
  - `tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts`
- **Forbidden and consumed only:** `core/admin/utils/cacheBus.ts`,
  `core/admin/services/cachePolicy.ts`, `core/admin/utils/adminCacheAuthority.ts`
  and `core/admin/services/mediaFoldersClient.ts`.
- **TASK-554-owned and not edited here:** `postsClientCacheAuthority.test.ts`
  is allowlisted for the fence's own runs, but R7-01 forbids editing it.
- **Outside the envelope:**
  - The R6-08/R7-11 paths are TASK-551-11-owned, outside this envelope and
    read-only anchors here: `tests/unit/workflows/{task551WorkflowContracts,task551EvidenceContract,dispatchContractCaps,task551AuthorAudit}.test.ts`,
    `_docs/_workflows/lib/{task-551-phase-provenance,task-551-worktree-compatibility,task-551-evidence-contract}.mjs`,
    `_docs/_workflows/_smoke/task-551/11-reopen/` and
    `impl-11-reopen-20260925.json`.
  - The `03-l02-baselines/` files and the dispositions records are
    orchestrator evidence, not allowlisted paths.
  - `core/db/tables/bookings.ts` (`bookingBlackouts`) is consumed through an
    import in the test only.

No NEW allowlisted path is needed. The Gate-argv precondition is a prose
orchestrator procedure. One JSON fence. **Size (R6-06 stop rule).** This
file is 640,024 bytes after the Round-7 append (`wc -c`), well below the
1,048,576-byte cap.

## Dated Contract Corrections — 2026-09-26 (Round 8: TASK-554 D2 parity, posts first-page marker, own-emit invalidate, media folders predicate, chain fold, C17 v5, FINAL capture precondition; append-only)

Source:
`_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round8-dispositions.md`
(R8-01..R8-14 over the Round-7 auditors S1-A, S1-B, S2-A, S2-B, S3-A and S3-B,
plus the resumed S3-B Round-6 items R8-a..R8-d; HEAD
`8f84fe0a778bc93775efc6767f644d41777ca923`; the TASK-551-11 re-open is
complete at sha_7 `051e36bc9f1bead4b3fb28a1f4f6cb8d1339057a`; the only dirty
path is one foreign audit-evidence addendum, not this file). This section
applies R8-01..R8-14. **This section wins** over every earlier part where they
differ. No in-place edit: the fence (`:1441-2172`), "Validation Commands" and
all earlier text stay byte-identical, and there is no envelope delta. The
section is appended after `contract :8740`, so no citation shifts. Anchors
were re-read on 2026-09-26 at `8f84fe0a` (the symbol stays authoritative
wherever a line drifts). Every sentence this round supersedes is quoted
verbatim under "Superseded sentences (Round 8)" (text authoritative; a hard
line wrap inside a quote is rendered as one space). Everything not quoted
there stays binding.

### R8-01 — `postsClientCacheAuthority.test.ts` carries the D2 edits only (HIGH; S2-A, S2-B)

**Finding (verified).** D2 (`:2311-2316`) allows the mechanical array→envelope
adaptation of the mocks in
`tests/vitest/admin/postsClientCacheAuthority.test.ts`, and C9 v2 gives
`listPostsCached(filters = DEFAULT_POST_LIST_FILTERS, options?)` an envelope
result (`:4027-4028`). TASK-554's D2 extension pins those edits on exactly the
lines R7-01 replays
(`TASK-554_Post_Metadata_Publish_RBAC_Hardening.md:1617-1624`: test `:731`,
`:747`, `:749`, `:750`, `:769`, `:771-778`, `:780`, `:781`). Unedited,
`listPostsCached({ force: true })` binds `{ force: true }` as filters, and
array mocks and array expectations cannot match an envelope. R7-01's "NOT
edited" and "unmodified" wording (quoted below) therefore contradicted the
binding D2 contract.

**Rule.**

- `postsClientCacheAuthority.test.ts` carries ONLY the D2 / TASK-554
  D2-extension mechanical edits (TASK-554 `:1617-1624` for the replayed
  lines): `listPostsCached(undefined, { force: true })`, list mocks as
  `jsonResponse({ items: [...], nextCursor: null, hasMore: false })`, and `{
  items: [...] }` expectations with the same element values and count. R7-01
  and R7-02 add no further edit to it. Every ordering, race and cache
  assertion stays 1:1.
- It keeps running in fence commands `w2-client-vitest` and
  `admin-pagination-vitest-1` in that D2-adapted form.
- Matrix T13 and the R7-01 pinned row (`task551PaginatedClients.test.ts`,
  posts block) replay the D2-adapted forms of `:725-750` and `:769-781` with
  the list subscription installed: the same fetch stubs and the same
  assertions, each in its D2 envelope form (mocks `:747`, `:771-778`;
  `resolves.toMatchObject({ items: [...] })` at `:749`, `:780`;
  `getCachedPosts()).toMatchObject({ items: [...] })` at `:750`, `:781`;
  TASK-554 HEAD `9c5b6666` numbering, which moves with the D2 edits). The
  added assertion that `postsCacheAuthorityEpoch` is unchanged stands.
- No TASK-554 task-file edit and no TASK-554 re-open is owed. The D2 parity
  statement is under "Handoffs (Round 8)".

### R8-02 — Posts first-page marker lifecycle (MEDIUM; S2-A, S2-B)

**Finding (verified).** For `cursor === null`, `readPostsListPage` reaches the
network only through `listPostsCached(filters, { force: true })` (`:7829`).
That call installs through `primePostsFirstPage` (`:4042`) BEFORE
`readPostsListPage` runs (R)/(I)/(O) (`:7836-7842`). An older read A that
lands after a newer read B has set `postFirstPageEpochs` (`:7843`) overwrites
the slot or memory entry with A's rows while the marker still matches, so the
next non-forced first-page read (`:7815`) would serve A's rows as fresh. A
direct `listPostsCached` call that installs after the marker was set has the
same effect.

**Rule.** A `postFirstPageEpochs` entry for key K asserts two things: the
TASK-554 read at K was installed by a `readPostsListPage` first-page
completion classified `page` under the current `postsInvalidationEpoch`, and
nothing has installed at K since.

1. Every `primePostsFirstPage(filters, …)` install, from any caller (the inner
   read of `readPostsListPage`, a direct `listPostsCached`, a prefetch),
   deletes the marker for that key FIRST.
2. Only a `readPostsListPage` first-page completion classified `page` (after
   (R), (I) and (O) all pass) sets the marker, to its captured `epoch` (as at
   `:7843`).
3. In `readPostsListPage` with `cursor === null`, every
   `ADMIN_LIST_SUPERSEDED` return (after a rejection and after the await) and
   the (O) branch delete the marker before returning.
4. The (R) branch needs no delete. Under a non-current token the inner read
   installs nothing (R5-10), and the registered reset already cleared
   `postFirstPageEpochs` (R7-01 reset body).

```ts
// core/admin/services/postsClient.ts (R8-02; amends C9 v2 primePostsFirstPage and the R7-01 readPostsListPage body)
const postFirstPageMarkerKey = (filters: PostListFilters): string =>
  buildAdminListCacheKey(cacheKeys.postsList, "page", filters, null); // === the readPostsListPage key for cursor === null
function primePostsFirstPage(filters: PostListFilters, envelope: PostListEnvelope): void {
  postFirstPageEpochs.delete(postFirstPageMarkerKey(filters));       // (1) every install drops the marker first
  /* C9 v2 body unchanged: the versioned slot for the default filters, memory (fetchedAtEpoch: 0) otherwise */
}
// readPostsListPage (R7-01): only the lines below change; everything else stands
  const dropFirstPageMarker = (): void => { if (cursor === null) postFirstPageEpochs.delete(key); }; // (3)
  // ...
    } catch (error) {
      if (isReset()) return ADMIN_LIST_RESET;                           // (4) nothing installed under a stale token
      if (isSuperseded()) { dropFirstPageMarker(); return ADMIN_LIST_SUPERSEDED; }
      throw error;                                                      // nothing installed; marker untouched
    }
    if (isReset()) return ADMIN_LIST_RESET;                             // (R)
    if (isSuperseded()) { dropFirstPageMarker(); return ADMIN_LIST_SUPERSEDED; } // (I)
    if (postPageGenerations.get(key) !== keyGeneration) {               // (O)
      const latest = postPageLatest.get(key);
      if (latest === undefined || latest === request) throw new Error("admin_list_overtake_invariant");
      dropFirstPageMarker();                                            // conservative: at most one extra fetch
      return resolveOvertakenPostRead(latest, isReset, isSuperseded);
    }
    if (firstPage !== null) { postFirstPageEpochs.set(key, epoch); return { kind: "page", page: firstPage }; } // (2)
```

- The (O) delete is conservative. If the newer read's marker was valid, the
  cost is one extra network read on the next non-forced first-page read. A
  stale first page is never served as fresh.
- `listPostsCached` still never READS the marker or any `postPage*` map. Its
  install now deletes a marker entry, which no TASK-554 path observes, so its
  outcomes stay those of R5-10 byte-for-byte and the Round-7 "TASK-554
  authority isolation" row is unchanged.
- **T1, posts first page** (event during the await): `readPostsListPage`
  resolves `superseded` and the marker is not advanced, so the next non-forced
  `readPostsListPage(f)` fetches. The inner TASK-554 `listPostsCached`
  installs its reconciled envelope (TASK-554 behaviour, unchanged), so
  `getCachedPosts(f)` may change. **T1, posts cursor page:** installs nothing;
  `getCachedPosts()` before = after, and the next non-forced read of that
  cursor fetches. With `clearPostsCache()` during the await, the inner read is
  authority-stale and installs nothing (R5-10).
- **T6, posts first page:** (a) A and B for one key; B resolves `page`, then A
  lands and resolves through B's result; the next non-forced
  `readPostsListPage(f)` fetches. (b) A started before a foreign `postsList`
  event and B after; B resolves `page`, then A lands and resolves
  `superseded`; the next non-forced `readPostsListPage(f)` fetches. (c) After
  a direct `listPostsCached(f, { force: true })` resolves, the next non-forced
  `readPostsListPage(f)` fetches. `admin_list_overtake_invariant` is never
  thrown. Posts cursor pages keep the R7-05 T6 reading.
- **R7-12 observable, posts first page only:** "`readPostsListPage` resolves
  superseded/through-latest and the marker is not advanced; the inner TASK-554
  `listPostsCached` installs its reconciled envelope — TASK-554 behaviour,
  unchanged". Every other client, and posts cursor pages, keep the R7-12
  reading (memory, slot and `pageLatest` unchanged by that completion).

### R8-03 — An own emission runs the invalidate minus the slot clear (MEDIUM; S2-B; INFO S2-A)

**Finding (verified).** Under R7-02, `onOwnEmit` only cleared the page dedupe
(`:7789`, `:7945`), and memory freshness compared only `invalidationEpoch`
(`:7982-7983`). A patch replaces rows but never inserts into filtered or
cursor pages (`:4022`), and posts prepend a missing row into the default slot
only (`:4019`). After an own publish, create or status change, a freshly
mounted hook (`familyEpoch` 0, so `next` issues `force: false`) could serve
pre-mutation cursor and filtered pages as fresh, and could show one post on
page 1 (slot) and page 2 (memory).

**Rule.** Each paged client's `onOwnEmit` is its `invalidate` MINUS the
persisted-slot clear: it advances `<client>InvalidationEpoch` and clears the
client's dedupe map(s), and it keeps every persisted slot. After an own
emission the patched slot stays and serves every hit it served before. Every
memory entry, patched or not, is stale for non-forced network reads and
readable only through `"hydrate"`. Posts pass `invalidatePostsList` itself,
which never clears the slot (R7-01).

```ts
// core/admin/services/pagesClient.ts (R8-03; replaces the R7-02 `pagesSelfEmit` line; the template for every paged client)
function advancePagesListEpoch(): void {                   // invalidate minus the slot clear
  pagesInvalidationEpoch += 1; pagePromises.clear();       // memory stays, now stale; pagesFirstPage untouched
}
function invalidatePagesList(): void {                     // THE invalidate (R6-01 effect unchanged)
  advancePagesListEpoch(); pagesFirstPage.clear();
}
const pagesSelfEmit = createAdminListSelfEmitGuard(advancePagesListEpoch);

// core/admin/services/postsClient.ts (R8-03; replaces the R7-01 `postsSelfEmit` line)
const postsSelfEmit = createAdminListSelfEmitGuard(invalidatePostsList); // epoch +1, postPagePromises cleared; slot untouched
```

| Client | `onOwnEmit` (the invalidate minus the slot clear) | Kept by an own emission |
|---|---|---|
| pages | `advancePagesListEpoch` | `pagesFirstPage` |
| posts | `invalidatePostsList` | `postsListCache` (TASK-554 slot), tickets, `postsCacheAuthorityEpoch` |
| entries | `entriesInvalidationEpoch` +1; every entries dedupe map cleared | every entries family slot |
| forms (+ submissions) | `formsInvalidationEpoch` +1; forms and submissions dedupe cleared | every forms slot |
| media | `mediaInvalidationEpoch` +1; media dedupe cleared | the media slot |
| booking (four families) | `bookingListsInvalidationEpoch` +1; the four families' dedupe cleared | each family slot; the week cache (R3-07) untouched |
| detail pages | `detailPagesInvalidationEpoch` +1; dedupe cleared | every persisted slot in `listCacheByKey` |
| users | n/a (no list key, no guard) | — |

- **(I) and the fence.** `isSuperseded` keeps the R7-02 form `epoch !==
  <client>InvalidationEpoch || mutation !==
  <client>SelfEmit.ownMutationEpoch()`. Every own emission now also advances
  `invalidationEpoch`, so the second disjunct is implied. `ownMutationEpoch`
  stays only as the documented fence; no test distinguishes the two. (I)
  reads: "`invalidationEpoch` or `ownMutationEpoch` moved → `{ kind:
  "superseded" }`" (R6-01 `:7058-7059` and the pages line `:7102`, quoted
  below, superseded by R7-02 and R8-03).
- **The subscription still skips the client's own local emission** (R7-02
  `isEmitting()`). It must not run the full invalidate, which would clear the
  patched slot. The own emission's epoch advance comes from `onOwnEmit` only,
  once per emission.
- **Posts upsert-before-await window closed.** At HEAD
  `postsClient.ts:468-474` the detail upsert precedes an await and the
  `postsList` emission follows it. A cursor read that settles inside that
  window installs under the pre-emission epoch, and the emission then makes it
  stale. No `upsertCachedPost` change is needed.
- **R8-14 (design note; covered).** Non-default and cursor memory entries
  become stale on an own emission, while the patched default slot stays
  served.
- **Posts state row** (replaces the R7-01 own-mutation row, quoted below): own
  mutation (`postsSelfEmit.emit`) | `postsCacheAuthorityEpoch` unchanged |
  `postsInvalidationEpoch` +1 | slot: TASK-554 patch stays | `postPageCache`:
  TASK-554 patch stays, stale for network reads | maps kept;
  `ownMutationEpoch` +1, `postPagePromises` cleared | subscription kept.
- **T8 (restated).** Own emission: the slot stays (`getCached*()` in
  `"hydrate"` returns the patch, and a non-forced default first-page read is
  served by the patched slot, except posts, whose first page fetches because
  the marker no longer matches); memory is stale for network reads (a
  non-forced read of a patched non-default or cursor key fetches, while
  `"hydrate"` returns the patched entry); an in-flight read started before the
  mutation resolves `superseded` and does not overwrite the patch; a later
  foreign event of the same key invalidates (slot cleared, except the posts
  TASK-554 slot). The R7-05 T8 cells (`updatePage`, `publishPost`,
  `updateMedia`, users n/a) stand.
- **Existing pins.** The R7-02 pins read the patched cache through
  `getCached*` or the default first-page slot, so R8-03 changes none of them
  (R8-07). If the implementer finds a pin that R8-03 would change, it STOPs
  and reports to the orchestrator; there is no silent re-baseline.

### R8-04 — Media also invalidates on `mediaFolders` (MEDIUM; S2-A, S2-B)

**Finding (verified).** In `core/admin/services/mediaFoldersClient.ts`
(forbidden, consumed only), `createMediaFolder` (`:236`), `updateMediaFolder`
(`:251`) and `reorderMediaFolders` (`:268`) broadcast only
`cacheKeys.mediaFolders`; `deleteMediaFolder` broadcasts `mediaFolders` and
then `mediaList` (`:280-281`). No `renameMediaFolder` exists: a rename is
`updateMediaFolder` (`PATCH /media/folders/<id>`, `:240-252`). Media facets
carry `folders` (contract `:658-661`, `MediaListFacets`). With the predicate
`=== cacheKeys.mediaList` a rename never invalidated the facets, and T14 hid
this by broadcasting a synthetic `mediaList` event.

**Rule.**

- The media row predicate reads `event.key === cacheKeys.mediaList ||
  event.key === cacheKeys.mediaFolders`. Both keys come from
  `core/admin/services/cachePolicy.ts` (forbidden, unchanged).
  `mediaClient.ts` still holds exactly ONE lazy `subscribeCacheEvents`
  subscription and ONE invalidate (`invalidateMediaList`); R7-06 otherwise
  stands.
- Every `mediaFoldersClient` emission is a foreign local event for
  `mediaClient`. `deleteMediaFolder` delivers two events, so
  `invalidateMediaList` runs twice (epoch +2, the same observable effect as
  once).
- `mediaClient.ts` never emits `mediaFolders`, so its self-emit sites (R7-02,
  T9) are unchanged.
- **Hydrate accessor.** Only the default first page has a persisted slot;
  pages for non-default filters live in memory. The media `getCached*`
  accessor follows the `getCachedPosts` shape (C9 v2 `:4007-4010`): the slot
  for the default filters, verified memory in `"hydrate"` otherwise (R7-04
  4-argument rule). T14 uses non-default filters.
- **View** (`core/admin/ui/media/MediaLibraryPage.tsx`; owner: this leaf;
  allowlisted at fence `:1510`). At HEAD the results subscription (`:361-365`)
  returns early unless `event.key === cacheKeys.mediaList` (`:362`). After
  this leaf it also handles `cacheKeys.mediaFolders`: a `mediaFolders` event
  always dispatches the hook's `revalidate()` and never takes the
  `applyCachedMediaRows()` short-circuit (`:363`), because a folder change
  alters facets and folder membership, not patched rows. The `mediaList`
  branch keeps its owning-section behaviour. The folder-rail subscription
  (`:529-540`, `mediaFolders` → `reconcileFolderCacheEvent`) is unchanged.
  After the C11 split, whichever allowlisted module holds the results
  subscription (`MediaLibraryPage.tsx`, `MediaLibraryResults.tsx` or
  `useMediaFolderOperations.ts`) carries this rule.

**Tests.**

- **T7, media cell** (restated): ✓ `mediaList` and `mediaFolders`, each
  including a `mediaFoldersClient`-style foreign emission.
- **T14 (rewritten; "media: folder rename then facet refresh").**
  1. With non-default filters `fm` (any value different from
     `DEFAULT_MEDIA_LIST_FILTERS`), a media page with facets F1 is installed.
     A forced read A for the same key is in flight.
  2. The test stubs the `PATCH /media/folders/<id>` request and calls
     `updateMediaFolder(id, { name: "Renamed" })`. A cacheBus spy records
     exactly one event, `{ key: cacheKeys.mediaFolders, action: "update" }`,
     and no `mediaList` event.
  3. A resolves `superseded` and installs nothing.
  4. The next non-forced `listMediaPageCached(fm)` fetches, because the entry
     is stale, and resolves the fresh facets F2 (renamed folder label and
     count).
  5. The media `getCached*` accessor for `fm` in `"hydrate"` returned F1 until
     the fetch landed.
  6. The registered-reset probe stands: a read started before the event
     resolves `superseded`, never `reset` (`mediaGeneration` did not move).
  7. Static: `mediaClient.ts` contains exactly one `subscribeCacheEvents(`
     call, and its predicate names both `cacheKeys.mediaList` and
     `cacheKeys.mediaFolders`.
- **T14b ("media: folder delete then facet refresh").** The same steps with a
  stubbed `DELETE /media/folders/<id>` and `deleteMediaFolder(id)`. The spy
  records `mediaFolders` then `mediaList`. A resolves `superseded`, and the
  next non-forced read resolves facets without the deleted folder.
- **View test** (`tests/vitest/ui/media-library-load-retry-wave.test.tsx`;
  allowlisted; the owned "loading/cache/revalidation" suite per `:383-386`; in
  fence command `admin-pagination-vitest-1`): "a foreign mediaFolders event
  revalidates the media results". With the library mounted and settled, one
  foreign `broadcastCacheEvent({ key: cacheKeys.mediaFolders, action: "update"
  })` causes exactly one forced background media list read. The rendered rows
  stay until the fresh page lands, `status` is never `reset`, and the folder
  GET counts of the existing folder-event tests are unchanged.
- **Intended contract change (named here).** An existing media view assertion
  that counts media LIST GETs across a `mediaFolders` event gains exactly that
  one forced read and nothing else. Folder GET counts, row values and every
  other assertion stay as they are.

### R8-05 — A superseded append chain re-issues at its own depth (MEDIUM; S2-A, S2-B)

**Finding (verified).** The R7-07 chain branch (`:8198`) drained a queued
revalidate, and `revalidateRequest` sizes that chain as
`min(cursorStack.length, 20)` (`:6733`). A chain folded from a `loadMore` has
depth `stack.length + 1` (`:8200`), so a second supersede during that chain
dropped the requested page and ended `ready` without it.

**Rule.**

```ts
// core/admin/ui/shared/useBoundedAdminList.ts (R8-05; replaces the R7-07 chain branch; the other two branches stand)
const onSuperseded = <I, S, F, Fl>(s: State<I, S, F, Fl>, p: Pending<Fl>): State<I, S, F, Fl> => {
  const next: State<I, S, F, Fl> = { ...s, familyEpoch: s.familyEpoch + 1, pending: null }; // rows/summary/facets/stack/status kept
  if (p.request.kind === "chain") return issue(next, { kind: "chain", depth: p.request.depth }, s.status); // same depth, forced
  if (p.request.merge)                                                                       // append loadMore page (R7-07)
    return issue(next, { kind: "chain", depth: Math.min(s.cursorStack.length + 1, MAX_APPEND_DEPTH) }, "loadingMore");
  return issue(next, { ...p.request, force: true }, s.status);                              // paged / non-merge page (R7-07)
};
```

- `p.request.depth` is already clamped: `revalidateRequest` built it as
  `min(stack.length, 20)`, or the fold built it as `min(stack.length + 1,
  20)`. No re-clamp is needed. The requested page of a folded `loadMore` stays
  in every re-issued chain, and `s.status` keeps `loadingMore` across
  re-issues.
- `issue` clears `revalidateQueued`, which subsumes every queued view
  `revalidate()`, exactly as in the other two branches. A chain is always
  forced (R6-04 `runRequest`).
- The bound is unchanged. Each re-issue needs a fresh invalidation during the
  previous chain's await. Per storm window a depth-d chain costs at most `d`
  fetches up to its first superseded page plus `d` for the one re-issue: at
  most `2 × d`, independent of N.
- The R7-07 `loaded` superseded `chain` row (quoted below) now reads: `loaded`
  superseded, `chain` (append) | token = pending | `onSuperseded` → `pending
  null`; ONE forced chain from `null` issued immediately at the superseded
  chain's own depth `p.request.depth`; status unchanged (`loadingMore` stays
  for a folded `loadMore`); `revalidateQueued` cleared by `issue`.
- The R7-07 "Append mode" bullet (quoted below) now reads: a `superseded`
  chain or `loadMore` page ends that request at the superseded page (its
  already-fetched pages are discarded; rows, summary, facets and stack are
  kept) and immediately issues exactly ONE forced chain from `null`: a chain
  at its own depth, a `loadMore` page at `min(stack.length + 1, 20)`, so the
  requested page is folded into the chain and stays folded across further
  supersedes.

**Test H16b** (`task551PaginatedListViews.test.tsx`, "second supersede during
the folded chain"). Append mode, 3 pages rendered (stack length 3). The
`fetchPage` stub resolves the `loadMore` page `{ kind: "superseded" }`, which
issues one forced chain of depth 4. The stub then resolves that chain's page 2
`{ kind: "superseded" }`, which issues exactly one forced chain from `null` of
depth 4 again (never 3). That chain lands: exactly one atomic replace with 4
pages (the 3 old pages plus the requested page). `status` stays `loadingMore`
until that landing, then `ready`; it is never `reset`, and no hint appears.
`fetchPage` calls after the `loadMore` click: 1 (the superseded page) + 2 (the
chain up to its superseded page 2) + 4 (the re-issued chain) = 7.

### R8-06 — T10 observables that can fail (MEDIUM; S2-A)

Any read started before a reset resolves `reset`, and a read started after an
event cannot be superseded by it, so the R7-05 T10 observable "an event
between reset and read supersedes nothing" held with or without the
unsubscribe. T10 ("the reset unsubscribes; the next read re-subscribes once")
is pinned by these two observables instead:

1. **Slot-bearing clients** (pages; entries ×3; forms and submissions; media;
   booking ×4; detail pages with the global key and one per-content-type key).
   After `advanceAdminCacheInstallationAuthority()`, the test seeds a
   versioned first-page slot for the default filters through `Storage`, in the
   client's persisted wire form. A foreign event of a predicate key before the
   next read leaves `getCached*()` (`"hydrate"`) returning the seeded page,
   because no subscription exists. After the next read of that client (which
   re-subscribes), the same foreign event clears the slot, and `getCached*()`
   for the default filters returns `null`.
2. **Once.** The suite installs a partial passthrough mock,
   `vi.mock("@/utils/cacheBus", async (importOriginal) => { const actual =
   await importOriginal<typeof import("@/utils/cacheBus")>(); return {
   ...actual, subscribeCacheEvents: vi.fn(actual.subscribeCacheEvents) }; })`.
   For each client, after the reset, the call count of `subscribeCacheEvents`
   grows by exactly 1 across two consecutive reads of that client, and by 0 on
   a third read, with no other client read in between. Every other cacheBus
   behaviour is the real module, so the R7-12 event-order harness is
   unaffected.

Posts and users use (2) only. Posts, because its subscription never clears the
TASK-554 slot (R7-01). Users, because they have no subscription: their count
grows by 0, and the R7-05 users cell for (1) stays n/a. The R7-01 second-row
observable "a foreign event before the next read supersedes nothing
(unsubscribed)" is replaced by (2) for posts (quoted below); the rest of that
row stands.

### R8-07 — Existing pins keep values and counts (MEDIUM; S2-A, S2-B)

The R7-02 heading "Affected existing pins (all stay green unmodified)" and its
first two sentences (quoted below) now read: "**Affected existing pins.** Each
keeps its assertion values and event counts; the only edits are the C9 v2 /
C11 / C12 (and D2 for posts) wire-shape adaptations their owning sections
already mandate; R7-02 adds no edit and changes no event key, action or count;
line anchors move with the C11 splits." Examples of such owed adaptations:
`mediaClient.test.ts:497-516` seeds a raw `rows` array, which the C9 v2
versioned slot treats as a miss (`:3931-3932`); `pagesClient.test.ts:823-841`
asserts a raw-array `pagesList` slot; both files are C11 split targets. The
sentence "None is edited for R7-02." (`:8019-8020`) stands, and R8-03 adds no
edit either.

### R8-08 — C17 v5 is 10-L02's copy authority (MEDIUM; S3-A, S3-B, S2-B; R8-a)

10-L02 copies only from the highest dated `C17 v` heading in 03-L02
(`TASK-551-10-L02-Documentation-Runbooks-And-Family-Closure.md:1628-1633`).
Rounds 5-7 filed their owed 10-L02 items under "Handoffs (Round N)" headings,
which that rule never reads. The heading below consolidates them with the
Round-8 items. The Round-6 and Round-7 Handoffs 10-L02 rows are quoted below
as superseded by it.

### C17 v5 — Handoffs and owed mirrors (2026-09-26; Rounds 5-8)

C17 v4 (`:6561-6583`) stands except where quoted under the Round-5..8
superseded lists; this heading is 10-L02's copy authority
(`TASK-551-10-L02…md:1628-1633`). It consolidates the Round-5/6/7 owed 10-L02
items (`:6970-6976`, `:7700-7705`, `:8670-8681`) and the Round-8 items.

**TASK-551-10-L02 (owed mirror; another writer's file).** The `ADMIN_CACHE` /
`ADMIN_CACHE_MAP` delta, plus the notes C17 v4 already routes to `CMS_API` and
the booking docs:

1. **C17 v4** (`:6563-6569`): the Round-3 mirror and the Round-4 additions
   stand as written.
2. **Round 5:** nothing further. The R5-03 mirror is already in 10-L02's own
   "Amendment (2026-09-25): Round-4/5 items" (`TASK-551-10-L02…md:1603`;
   `:6972-6974`).
3. **Round 6:** the two-counter model per paged client (`invalidationEpoch`,
   advanced only by the invalidate, vs `resetGeneration`, advanced only by the
   registered reset); the lazy family subscriptions with the R6-01 predicates
   as amended (R7-12 detail-pages row, R8-04 media predicate); the new export
   `clearAdminUsersCache` (memory-only, no Storage); `clearFormsCache`
   covering form submissions; the `readPostsListPage` / `listPostsCached`
   split.
4. **Round 7:** the posts list-only `postsInvalidationEpoch`, kept separate
   from the TASK-554 `postsCacheAuthorityEpoch`, and the inverted direction
   (`readPostsListPage` calls `listPostsCached(filters, { force: true })`);
   own-emission handling through `createAdminListSelfEmitGuard` (in its
   Round-8 form, item 5 (b)); detail pages as the eighth paged client; F-40
   subsumed by the single media subscription; the per-mode fetch bound (paged
   ≤ 2 forced reads per event; append ≤ 2 × depth per storm window).
5. **Round 8:** (a) the posts first-page marker `postFirstPageEpochs`: set
   only by a current `page` completion of `readPostsListPage`, dropped by
   every `primePostsFirstPage` install and by superseded or overtaken
   first-page completions (R8-02); (b) an own emission runs the invalidate
   minus the persisted-slot clear: epoch +1 and dedupe cleared, the patched
   slot kept, memory stale for network reads (R8-03); (c) the media
   subscription predicate `mediaList` or `mediaFolders`, and the media library
   results view revalidates on `mediaFolders` (R8-04); (d) a superseded append
   chain re-issues once at its own depth, so a folded `loadMore` page survives
   repeated supersedes (R8-05); (e) the detail-pages invalidate clears every
   persisted slot in `listCacheByKey` (R8-13).

**TASK-551-11.** Nothing owed. C17 v4 `:6570-6573` is superseded (quoted
below; R8-11). The split edits named at `:6573-6577` landed in the completed
re-open (R8-11 table). **Query inventory (01-L01).** C17 v4 `:6577-6583`
stands; Rounds 5-8 add no server statement. **TASK-554, TASK-551-09-L04 and
the orchestrator:** "Handoffs (Round 8)" below.

### R8-09 — FINAL capture precondition; the W0 split condition now holds (MEDIUM; S3-A, S3-B, S2-B; R8-b)

**R6-05 (restated; replaces the "by construction" sentence quoted below).**
Every capture, first or re-capture, requires empty `committedDiff` and
`worktreeDiff`. Before FINAL's `preWaveCommit` is recorded, the owner has
committed the INITIAL closure state of every allowlist path. A non-empty
allowlist status at any capture STOPs and is reported to the owner; it never
captures. The git-state receipt shape, the `:(literal)` pathspecs and the
re-capture rule of R6-05 stand; `kind: "capture"` carries the same two empty
arrays.

**R6-08 (2) (tightened; replaces the rule sentence quoted below).** "The split
landed" (R4-12 Precondition 5, C13 v4 item 5) now means: W0 unblocks only when
the step-7 checkpoint commit exists and the receipt is tracked at HEAD (`git
ls-files --error-unmatch
_docs/_workflows/_smoke/task-551/impl-11-reopen-20260925.json` exit 0) and
names sha_7. "Names sha_7" is checked on the commit that adds the receipt,
because the receipt body cannot name its own commit (its `result` field,
`impl-11-reopen-20260925.json:14`, was written before that commit and still
reads "step-7 commit pending"): `git log --diff-filter=A --format=%H --
<receipt>` prints exactly sha_7, and the TASK-551-11 ledger records the same
sha_7 (`_docs/_workflows/_smoke/task-551/11-reopen/ledger.jsonl:39-40`,
untracked by 11 **V8-1**).

**State on 2026-09-26 at `8f84fe0a`: the condition HOLDS.** TASK-551-11
re-open steps 1-7 are committed (`03d42b90`, `66203e22`, `420bb24a`,
`2ee1c1a9`, `e9373a26`, `5cf53490`, `051e36bc`); `git ls-files
--error-unmatch` on the receipt exits 0; `git log --diff-filter=A --format=%H`
on it prints `051e36bc9f1bead4b3fb28a1f4f6cb8d1339057a`; the ledger's last
line records the re-open `phase` "complete". C13 v4 item 5 holds as well:
`task551AuthorAudit.test.ts` (448 lines), `authorAuditDriftRounds.test.ts`
(459) and `authorAuditBoundedChild.test.ts` (318) are each ≤ 700 lines, and
the receipt records the split. The R5-12 INITIAL capture window at
`_docs/_workflows/_smoke/task-551/03-l02-baselines/03-l02-root-tsc-baseline.txt`
(R7-08 path) is therefore OPEN. At `8f84fe0a`, `git status --porcelain=v1
--untracked-files=all` over the 321 allowlist paths (each a `:(literal)`
pathspec) prints nothing. The INITIAL `preWaveCommit` is still the commit the
orchestrator records immediately before W0's first edit, and every other W0
precondition (C13 v3 list, R7-08 (a) as restated by R8-13) is unchanged.

R7-08 `:8239-8240` ("INITIAL W0 is blocked"), R6-08 (2) `:7548-7549`, the
Round-6 Handoffs line `:7712-7713` and the Round-7 Handoffs line `:8704-8705`
are quoted below as superseded by this state.

### R8-10 — Gate argv (Round 8; TASK-551-11 V12-V24) (MEDIUM; S3-A, S3-B; LOW S2-B)

- The fence argv and `positiveDiscovery.paths` stay bare permanently
  (TASK-551-11 **V12-2** `:1873`;
  `_docs/_workflows/lib/task-551-dispatch-envelope.mjs:130-139` rejects `./`:
  every `positiveDiscovery.paths` entry must start with `tests/` and appear
  verbatim in `argv`). 03-L02 has no V11-2 site. Prose gates outside the fence
  use `./` as belt and braces (V12-2).
- Context owned by TASK-551-11 and cited here only: **V12-1** (`:1871`, bun
  skips `node_modules` and hidden directories), **V12-2** (`:1873`), **V12-3**
  (`:1875-1877`, the V11-1 and V11-2 restatements), and v13-v24 (`:1882-2052`:
  the hidden `.dryrun/` root, literal gates and evidence-loss rules). The
  Round-7 heading's "V11-2, `:1854-1865`" citation stays as history.
- The two Round-7 prose gates
  (`./tests/unit/workflows/dispatchContractCaps.test.ts`,
  `./tests/unit/workflows/task551AuthorAudit.test.ts`) keep their `./` form.
- **`owned-module-consumers-bun` precondition (restated).** With cwd = the
  worktree root that runs the fence command, `find . \( -path ./node_modules
  -o -name '.*' -a ! -name . \) -prune -o -name
  'task554WorkflowContracts.test.ts' -print` prints exactly
  `./tests/unit/workflows/task554WorkflowContracts.test.ts` (verified
  2026-09-26 at `8f84fe0a`). The prune mirrors bun discovery (V12-1): hidden
  directories such as `.dryrun/` and `.git/` are skipped, so a hidden dry-run
  copy that bun never runs does not STOP the gate. Any other match STOPs the
  gate before it runs, and the orchestrator reports it. No envelope delta; the
  argv is never rewritten to `./`.
- R7-08 (b) and the Round-7 Handoffs (b) are corrected (quoted below): nothing
  is owed to TASK-551-11.

### R8-11 — R6-08 and R7-11 refreshed at the live tree (MEDIUM; S3-A, S3-B)

The R6-08 (1) / R7-11 table now reads (Today = Final home; verified at
`8f84fe0a`; the symbol stays authoritative):

| C17 v4 anchor (quoted) | Today = Final home |
|---|---|
| `task551WorkflowContracts.test.ts:121-125` `expectedL11SidecarTests` | `tests/unit/workflows/task551WorkflowContractsFixtures.ts:51-66` (14 entries; step 5 `e9373a26`) |
| `task551EvidenceContract.test.ts:901` | `tests/unit/workflows/evidenceContractMatrix.test.ts:130`, the test "keeps test-only declaration imports and the owner bridge closed" (step 6 `5cf53490`) |
| `task-551-worktree-compatibility.mjs:111-115` `ownedTests` | `_docs/_workflows/lib/task-551-phase-provenance.mjs:116-131` (sidecar `ownedTests`, 14 entries; landed at step 3 `420bb24a`, extended through step 6) |

**State (replaces the R7-11 state line, quoted below).** Steps 1-7 committed
(`03d42b90`, `66203e22`, `420bb24a`, `2ee1c1a9`, `e9373a26`, `5cf53490`,
`051e36bc`); receipt tracked. The docs commit `6845ace2` carries the 11
amendments v11-v24. R6-08 (2) holds (R8-09).

**Self-cap figure (replaces R6-08 `:7555-7557` and C17 v4 `:6570-6573`, quoted
below).** 11-owned; the 11 fence cap at 11 `:987` (currently 2,100, V19) and
the V4-2 frozen per-path ceilings govern; 03-L02 pins no number.

**Evidence tracking (live fact).** The eight
`_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-*-dispositions.md`
files (`faza0`, `round2`..`round8`) are TRACKED at HEAD since `2aef9f68`.
R7-08 (a) called them untracked; R8-13 restates it.

### R8-12 — Booking legs consume one slot helper (LOW; S1-A, S1-B)

```ts
// tests/integration/server/task551AdminWriteConcurrency.test.ts (R8-12; test-local, not exported)
type LegSlot = Readonly<{ start: number; end: number }>;               // epoch ms, [start, end)
const MINUTE_MS = 60_000;
function bookingLegSlots(w: ReturnType<typeof bookingLegWindows>) {
  const slot = (start: number, lengthMs: number): LegSlot => Object.freeze({ start, end: start + lengthMs });
  return Object.freeze({
    weekCap: Object.freeze(Array.from({ length: 501 }, (_, i) => slot(w.weekCap.from + i * 20 * MINUTE_MS, 20 * MINUTE_MS))),
    race: slot(w.race.from, 30 * MINUTE_MS),                           // all 50 creates
    reactivationA: slot(w.reactivation.from, HOUR_MS),                 // leg (a): [from, +1 h)
    reactivationB: slot(w.reactivation.from + 2 * HOUR_MS, HOUR_MS),   // leg (b), both rows: [from + 2 h, from + 3 h)
    lockWaitFirst: slot(w.lockWait.from, 30 * MINUTE_MS),              // first marker resource
    lockWaitSecond: slot(w.lockWait.from, 30 * MINUTE_MS),             // second marker resource
    blackoutReservation: slot(w.blackout.from, w.blackout.to - w.blackout.from), // [blackout.from, blackout.to)
  });
}
```

- Every DB leg reads its timestamps only from
  `bookingLegSlots(bookingLegWindows(RUN))`. The DB-free test "every leg
  timestamp lies inside its declared window" iterates the same object for the
  R6-07 fixed vectors and the 256 `randomUUID()` values: each `weekCap` slot
  in `weekCap` (the last one ends exactly at `weekCap.to`), `race` in `race`,
  `reactivationA` and `reactivationB` in `reactivation`, `lockWaitFirst` and
  `lockWaitSecond` in `lockWait`, `blackoutReservation` in `blackout`, each as
  `from <= start && end <= to`.
- **Blackout marker.** The leg creates the global blackout with
  `createBookingBlackout({ resourceId: null, startsAt, endsAt, reason: MARKER
  })` (the service stores `reason`,
  `core/services/booking/bookingService.ts:851-859`). `afterAll` also deletes
  `booking_blackouts` rows `where resource_id is null and reason = MARKER`
  (this run's rows only), in addition to the `finally` delete by id.
- **Precondition read** (replaces the R7-10 statement, quoted below):
  `db.select({ id: bookingBlackouts.id, reason: bookingBlackouts.reason
  }).from(bookingBlackouts).where(and(isNull(bookingBlackouts.resourceId),
  lt(bookingBlackouts.startsAt, new Date(w.blackout.to)),
  gt(bookingBlackouts.endsAt, new Date(w.blackout.from)))).limit(1)`. It must
  return zero rows. Otherwise the leg fails with
  `booking_leg_blackout_window_occupied: a global blackout overlaps the RUN
  blackout window (reason: <row.reason ?? "null">)`, so a leaked row's owner
  run is identifiable. It never deletes a row it did not create.
- **Leg order (pinned).** Precondition read → `createBookingReservation` at
  `blackoutReservation` (inside `blackout`) → the R2-30 counter opens →
  `createBookingBlackout({ resourceId: null, … })` → the counter closes. Only
  that window is asserted: 1 counted INSERT, 0 `lock`, 0 SELECT.
- **RUN idiom** (replaces `:8284` and quote 14's "the other suites keep it",
  quoted below): `tests/integration/routes/task551BoundedAdminLists.test.ts`
  keeps the `:118` idiom; `tests/perf/database-admin-list-budgets.test.ts`
  keeps its R2-13 shape (`:4279`).
- **Seed client** (replaces the R7-10 wording, quoted below): "one multi-row
  INSERT through the suite's lazily loaded `db` client, bound by the C13
  runtime override to `TASK551_FIXTURE_DATABASE_URL` (`<URL3>` under
  `<db-env>`); no second client" (idiom:
  `tests/integration/server/task551RevisionConcurrency.test.ts:84-100`).
- **DB-free vector** (rendering fix only):
  ``bookingLegWindows(`task551-06l02-concurrency-${randomUUID()}`)`` throws
  `booking_leg_run_invalid`.
- **Anchor note (INFO).** The C13 `afterAll` marker delete cited as `:739-741`
  (`:2945`) is now `task551RevisionConcurrency.test.ts:747-749`; the symbol
  governs.

### R8-13 — LOW bundle (S2, S3)

- **H19b distinct initials.** `s1Initial = { fieldFilter: { size: "L" } }` and
  `s2Initial = { fieldFilter: { weight: "1" } }`. On S1, `reset(next)` sets
  `fieldFilter.color = "red"`. Every `fetchPage` call after the rekey to S2
  equals `s2Initial` and never contains `size` or `color`. The reverse switch
  receives exactly `s1Initial`. With the pre-R7-03 deps `[o.fetchPage]` the
  test fails, because S1's `initialFilters` differ from S2's.
- **H23 count.** "GET `/pages…` calls after the first foreign event = 5" (2
  for the chain up to its superseded page 2, plus 3 for the one re-run; the 3
  pre-event page loads are excluded) for both N, which is ≤ 2 × 3.
- **Entries self-emit guard owner.** R8-03 makes `entriesSelfEmit`'s
  `onOwnEmit` advance `entriesInvalidationEpoch` and clear the entries dedupe
  maps, which live in `entriesClientPagination.ts` (C11, R2-34). So the guard
  is created in `entriesClientPagination.ts`, next to that state and the
  subscription, and exported. `entriesClient.ts` imports it (and the
  invalidate its public clears call) for its broadcast sites (every
  `broadcastCacheEvent` whose key is an entries predicate key, R7-02). The
  import goes one direction only: `entriesClientPagination.ts` has no value
  import from `./entriesClient` (`import type` only). A value helper it needs
  comes from its owner module (`./apiClient`, `./entryData`,
  `@/services/cachePolicy`, `@/utils/storageCache`); if the C11 split needs
  one that only `entriesClient.ts` owns, the implementer STOPs and reports.
  The T9 static row covers both files, and a second static assertion checks
  the no-value-import rule.
- **T6 mapping.** "pageGenerations and pageLatest survive clear<Family>Cache"
  is a design note with no behavioural observable, because (I) runs before
  (O). It is dropped from T6's mapping (`:8129-8130`) and from the R7-12
  observables (`:8390-8392`), both quoted below. T6 keeps its own overtake
  observables.
- **Detail pages invalidate.** `invalidateDetailPagesList()`:
  `detailPagesInvalidationEpoch` +1, dedupe cleared, and every persisted slot
  in `listCacheByKey` cleared (the global `detailPagesList` key and every
  per-content-type key; HEAD `detailPagesClient.ts:176-199`), for either
  public clear. Its R8-03 `onOwnEmit` is the same body minus the slot clears.
- **R7-08 (a) (restated; quoted below).** Relocation (11 V7-1 `:1539`): every
  `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-*-dispositions.md`
  (`03-l02-faza0-dispositions.md` and `03-l02-round{2..N}-dispositions.md`, N
  = the last round, 8 today, including later rounds) is a foreign direct entry
  under the canonical root. All of them are tracked at HEAD (R8-11); until
  they move, R4-10 gloss 2 (`:6423`) classifies them at W0. They are relocated
  out of `audit-evidence/` before TASK-551-10-L02 closure. Owner: orchestrator
  follow-up, cited from 03-L02; 03-L02 edits no evidence file. When they move,
  this file's citations (the Round-2..8 `Source:` lines, for example `:6612`,
  `:6989` and this section's own) are re-pointed by ONE append-only
  "relocation map" section here (old path → new path), never in place. The
  other citing task files (parent, 01-L01, 03, 06-L02, 07-L02, 08-L03, 09-L01,
  09-L02, 10, 10-L01, 10-L02, 11, TASK-554) are re-pointed by their owners'
  append-only sections per 11 V7-1 `:1539`. A tracked destination is decided
  before W0 so its gloss joins the W0 edit of
  `smoke-evidence-inventory.test.ts`; otherwise the destination is untracked.
- **09-L04 row (R8-d).** See "Handoffs (Round 8)".
- **Outside the envelope.** R7-02's three read-only anchors are listed there
  ("Envelope record (Round 8)").
- **R7-04 bullet anchors.** "`:6937-6938` and `:6946`, which go to R7-08" now
  reads "`:6935-6939` and `:6945-6948`, which go to R7-08", aligned with quote
  12.

### Superseded sentences (Round 8)

Each quote is verbatim (text authoritative; a hard wrap is one space). The
replacement is the named Round-8 item.

1. C17 v4 (`:6570-6573`): "**TASK-551-11 (owed; R4-16).** The self-cap (sh
   fence at about `:971`, `awk 'NR > 999'`) applies only to the CONTRACT file.
   Its limit rises to ≤ 1,300, with the reason that task docs are exempt from
   the AGENTS 1,000-line gate. Sidecar code and test paths keep ≤ 999." →
   R8-11 (self-cap figure: 11-owned; 03-L02 pins no number) and C17 v5
   (nothing owed to TASK-551-11).
2. R6-01 check order (`:7058-7059`): "(I) `invalidationEpoch` moved → `{ kind:
   "superseded" }`." → R7-02 and R8-03: (I) = `invalidationEpoch` or
   `ownMutationEpoch` moved.
3. R6-01 template (`:7102`): "const isSuperseded = () => epoch !==
   pagesInvalidationEpoch;" → R7-02 and R8-03 (the two-disjunct form).
4. R6-01 table, media row (`:7180`): "| `mediaClient.ts` | `clearMediaCache()`
   (`:144`) | media | `mediaGeneration` | `mediaInvalidationEpoch` | `===
   cacheKeys.mediaList` |" → R8-04: the predicate reads `event.key ===
   cacheKeys.mediaList || event.key === cacheKeys.mediaFolders`; the other
   cells stand.
5. R6-05 (`:7430-7431`): "The first capture (R5-12, R5-13) meets the same rule
   by construction." → R8-09 (every capture requires both diffs empty; the
   owner commits the INITIAL closure state before FINAL's `preWaveCommit`; a
   non-empty status STOPs).
6. R6-08 (2) (`:7543-7546`): ""the split landed" now means that TASK-551-11
   re-open steps 1-7 are ALL green AND the receipt
   `_docs/_workflows/_smoke/task-551/impl-11-reopen-20260925.json` exists."
   and (`:7548-7549`): "INITIAL W0 stays blocked until both conditions hold."
   → R8-09 (tightened rule; it holds on 2026-09-26).
7. R6-08 self-cap (`:7555-7557`): "**Self-cap figure.** The C17 v4 "≤ 1,300"
   for the 11 contract file is 11-owned and superseded there (the 11 fence now
   reads `awk 'NR > 1900'`, `TASK-551-11…md:987`). It is informational here."
   → R8-11 (11-owned; the 11 fence cap at 11 `:987`, currently 2,100 (V19),
   and the V4-2 frozen per-path ceilings govern; 03-L02 pins no number).
8. Handoffs (Round 6), 10-L02 (`:7700-7705`): "**TASK-551-10-L02 (owed
   mirror).** The `ADMIN_CACHE`/`ADMIN_CACHE_MAP` delta: the two-counter model
   per paged client (`invalidationEpoch` vs `resetGeneration`), the lazy
   family subscriptions (R6-01 table), the new export `clearAdminUsersCache`
   (memory-only), `clearFormsCache` covering form submissions, and the
   `readPostsListPage`/`listPostsCached` split. 10-L02 records these in its
   next append-only section (another writer's file)." → C17 v5 (items 3 and
   5).
9. Handoffs (Round 6), TASK-554 (`:7706-7707`): "**TASK-554.** Unchanged.
   `listPostsCached` keeps every TASK-554 pin byte-for-byte (R6-01 posts
   bullet)." → R8-01 (the pins hold in their D2-adapted form).
10. Handoffs (Round 6), orchestrator (`:7712-7713`): "INITIAL W0 waits for
    R6-08 (2)." → R8-09 (the condition holds).
11. R7-01 rule (`:7770-7771`): "Two things advance it: the subscription's
    `invalidatePostsList` and `clearPostsCache`." → R8-03: three things
    advance it, all through `invalidatePostsList`: the subscription on a
    foreign or remote event, `onOwnEmit` on an own emission, and
    `clearPostsCache`.
12. R7-01 code (`:7789`): "const postsSelfEmit =
    createAdminListSelfEmitGuard(() => { postPagePromises.clear(); }); //
    R7-02" → R8-03 (`createAdminListSelfEmitGuard(invalidatePostsList)`).
13. R7-01 code (`:7833`): "if (isSuperseded()) return
    ADMIN_LIST_SUPERSEDED;             // superseded wins over error" and
    (`:7837`): "if (isSuperseded()) return
    ADMIN_LIST_SUPERSEDED;               // (I): also every authority-epoch
    advance" and (`:7841`): "return resolveOvertakenPostRead(latest, isReset,
    isSuperseded); // the R6-01 resolveOvertakenPageRead body" → R8-02 (each
    drops the first-page marker first when `cursor === null`).
14. R7-01 "Why the TASK-554 reading holds" (`:7870`): "A local `postsList`
    event from the client's own mutation is ignored (R7-02)." → R8-03: the
    subscription ignores the client's own local `postsList` emission (R7-02),
    and that emission runs `invalidatePostsList` once through `onOwnEmit`; the
    next two sentences stand.
15. R7-01 state table (`:7880`): "| own mutation (`postsSelfEmit.emit`) |
    unchanged | unchanged | TASK-554 patch stays | TASK-554 patch stays |
    kept; `ownMutationEpoch` +1, `postPagePromises` cleared | kept |" → R8-03
    posts state row.
16. R7-01 pinned test (`:7887-7892`): "It then replays the scenarios of
    `postsClientCacheAuthority.test.ts:725-750` ("a stale list read initiated
    by a cache event merges a later metadata mutation before cache and
    return") and `:769-781` ("a stale list read merges the forced publish
    detail instead of its older scheduled row") with the same fetch stubs and
    byte-identical assertions." and (`:7893-7899`): "The TASK-554 file
    `postsClientCacheAuthority.test.ts` is NOT edited. It keeps running
    unmodified in fence commands `w2-client-vitest` and
    `admin-pagination-vitest-1` (it is not changed by this contract; its
    `afterEach` `clearPostsCache()` advances both epochs and does not
    unsubscribe, which is harmless because `invalidatePostsList` touches no
    TASK-554 state)." → R8-01 (the D2-adapted forms, replayed with the
    subscription installed; the file carries only the D2 edits).
17. R7-01 second row (`:7904-7907`): "After
    `advanceAdminCacheInstallationAuthority()`, a foreign event before the
    next read supersedes nothing (unsubscribed), and the next
    `readPostsListPage` re-subscribes once." → R8-06 (2) for posts.
18. R7-02 code (`:7945`): "const pagesSelfEmit =
    createAdminListSelfEmitGuard(() => { pagePromises.clear(); });" and
    (`:7948`): "if (origin === "local" && pagesSelfEmit.isEmitting()) return;
    // own emission: patched slot and memory stay" → R8-03
    (`createAdminListSelfEmitGuard(advancePagesListEpoch)`; the handler line
    stands, and its comment reads: own emission, skipped; `onOwnEmit` already
    advanced the epoch; the slot stays).
19. R7-02 precondition (`:7971-7973`): "Each own emission is preceded, in the
    same synchronous mutation path, by the client's own local effect: a patch
    (merge, upsert, remove) or `clear<Family>Cache()`." → R8-03: each own
    emission is preceded by the client's own local effect; for posts the
    detail upsert may precede an await (HEAD `postsClient.ts:468-474`), which
    R8-03 makes harmless.
20. R7-02 fence (`:7978-7979`): "`emit` advances `ownMutationEpoch` and runs
    `onOwnEmit` (clears the client's page dedupe map) BEFORE broadcasting."
    and (`:7982-7985`): "Memory freshness still compares only
    `invalidationEpoch`, so the patched memory entries and the patched slot
    stay fresh. This is a writer refinement that keeps "the patched slot and
    memory stay" true under concurrency." → R8-03 (`onOwnEmit` = the
    invalidate minus the slot clear; memory stale for network reads; the slot
    stays).
21. R7-02 pins (`:8000-8002`): "**Affected existing pins (all stay green
    unmodified).** Each asserts the patched cache after the client's own
    mutation. The ignore keeps exactly that reading." → R8-07.
22. R7-03 H19b (`:8063`): "S2 likewise with `s2Initial`." and (`:8065-8066`):
    "Every `fetchPage` call after the rekey receives filters deep-equal to
    `s2Initial`, with no `fieldFilter.*` key of S1." → R8-13 (distinct
    initials; never `size` or `color`).
23. R7-04 (`:8085`): "`:6937-6938` and `:6946`, which go to R7-08." → R8-13
    (`:6935-6939` and `:6945-6948`).
24. R7-05 T1, posts cell (`:8111`): "✓ for both `clearPostsCache()` and event;
    with event, `getCachedPosts()` before = after" → R8-02 T1 (first page vs
    cursor page).
25. R7-05 T6, posts cell (`:8116`): "✓ first page and cursor pages" → R8-02 T6
    (a)-(c) for the first page; cursor pages as before.
26. R7-05 T7, media cell (`:8117`): "✓ `mediaList`, including a
    `mediaFoldersClient`-style foreign emission" → R8-04 T7.
27. R7-05 T8 (`:8118`): "own emission (R7-02): the patched slot and memory
    stay; an in-flight read started before the mutation resolves `superseded`
    and does not overwrite the patch; a later foreign event of the same key
    does invalidate" → R8-03 T8.
28. R7-05 T10 (`:8120`): "the reset unsubscribes; the next read re-subscribes
    once (observable: an event between reset and read supersedes nothing)" →
    R8-06.
29. R7-05 mapping (`:8129-8130`): ""pageGenerations and pageLatest survive" →
    T6 (restated as observables, R7-12);" → R8-13 (design note; dropped from
    the mapping).
30. R7-06 (`:8137-8141`): "the R6-01 media row with predicate `event.key ===
    cacheKeys.mediaList`. A folder event from `mediaFoldersClient.ts:281`
    (forbidden, consumed only) is a foreign local event, so it runs
    `invalidateMediaList`." → R8-04 (both keys; every `mediaFoldersClient`
    emission is foreign).
31. R7-06 T14 (`:8153-8154`): "1. A media page with facets F1 is installed. A
    forced read A for the same key is in flight." and (`:8155-8157`): "2. The
    test broadcasts `{ key: cacheKeys.mediaList, action: "update" }` as
    `mediaFoldersClient` does (foreign; `renameMediaFolder` itself when the
    test stubs its fetch)." and (`:8162`): "5. `getCachedMedia*` in
    `"hydrate"` returned F1 until the fetch landed." and (`:8165-8166`): "7.
    Static: `mediaClient.ts` contains exactly one `subscribeCacheEvents(`
    call." → R8-04 T14 (rewritten) and T14b.
32. R7-07 bound (`:8176-8177`): "a `superseded` outcome never restarts
    anything immediately." and (`:8179-8182`): "The outcome sets
    `revalidateQueued`, and when the pending request settles, exactly ONE
    forced chain from `null` follows. For a chain, it runs at depth `d =
    min(stack.length, 20)`." → R8-05 (the restated "Append mode" bullet).
33. R7-07 code (`:8198`): "if (p.request.kind === "chain") return drain({
    ...next, revalidateQueued: true });        // ONE chain, depth min(stack,
    20)" → R8-05 (`issue(next, { kind: "chain", depth: p.request.depth },
    s.status)`).
34. R7-07 table (`:8210`): "| `loaded` superseded, `chain` (append) | token =
    pending | `onSuperseded` → `pending null`, `revalidateQueued = true`, then
    `drain` issues ONE chain, depth `min(stack.length, 20)`, every fetch
    forced |" → R8-05 (the restated row).
35. R7-07 H23 (`:8219`): "GET `/pages…` count = 2 (chain up to the superseded
    page 2) + 3 (the one re-run) = 5 for both N, which is ≤ 2 × 3." → R8-13
    (calls after the first foreign event).
36. R7-08 (`:8239-8240`): "No baseline has been captured yet (INITIAL W0 is
    blocked, R6-08 (2)), so nothing moves on disk." → R8-09: no baseline has
    been captured yet; the INITIAL capture window is open, and the INITIAL
    capture goes directly to the `03-l02-baselines/` path.
37. R7-08 (a) (`:8260-8263`): "The orchestrator's untracked
    `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-faza0-dispositions.md`
    and `…/03-l02-round{2,3,4,5,6,7}-dispositions.md` are foreign direct
    entries under the canonical root." and (`:8265-8269`): "When they move,
    the citations of Rounds 2-7 in this file (their `Source:` lines, for
    example `:6612`, `:6988` and this section's own) are re-pointed by ONE
    append-only "relocation map" section in this file (old path → new path),
    never by an in-place edit." and (`:8270-8272`): "That is an edit to
    `smoke-evidence-inventory.test.ts` (03-L02 W0-owned), so the relocation
    lands before W0 or its entry joins the W0 edit." → R8-13 (tracked;
    `round{2..N}`; `:6989`; other citing task files; destination decided
    before W0).
38. R7-08 (b) (`:8273-8274`): "(b) **V11-2 `./` argv.** Adopted for every
    Round-6/7 gate that names a `tests/unit/workflows/*.test.ts` path. See
    "Gate argv (Round 7)" below." → R8-10 (nothing owed to TASK-551-11; the
    fence stays bare).
39. R7-09 (`:8284`): "The other new suites keep the `:118` idiom." → R8-12
    (RUN idiom).
40. R7-09 DB-free vectors (`:8298-8300`): "and so does
    `bookingLegWindows(\`task551-06l02-concurrency-${randomUUID()}\`)`." →
    R8-12 (the same vector in a double-backtick span; text unchanged).
41. R7-10 seed client (`:8319-8321`): ""one multi-row INSERT on the owner DB"
    now reads "one multi-row INSERT through the suite's `db` client
    (`<db-env>` `DATABASE_URL`)"." → R8-12 (seed client).
42. R7-10 precondition (`:8324`): "`db.select({ id: bookingBlackouts.id
    }).from(bookingBlackouts).where(and(isNull(bookingBlackouts.resourceId),
    lt(bookingBlackouts.startsAt, new Date(w.blackout.to)),
    gt(bookingBlackouts.endsAt, new Date(w.blackout.from)))).limit(1)`." and
    (`:8325-8327`): "Otherwise the leg fails with the explicit message
    `booking_leg_blackout_window_occupied: a global blackout overlaps the RUN
    blackout window` (for example one leaked by a killed earlier run)." →
    R8-12 (`{ id, reason }`; the message appends `reason`).
43. R7-10 DB-free test (`:8330-8333`): "It checks all 501 week-cap slots in
    `weekCap`, the race slot in `race`, legs (a) and (b) in `reactivation`,
    the lock-wait reservations in `lockWait` and the blackout leg's
    reservation in `blackout`, each as `from <= start && end <= to`." → R8-12
    (`bookingLegSlots`).
44. R7-11 (`:8340`): "| C17 v4 anchor (quoted) | Today (step 4 in flight,
    sha_3 `420bb24a`) | Final home |" and (`:8346-8350`): "Steps 1-3 are
    committed (`03d42b90`, `66203e22`, `420bb24a`). Step 4 is in flight. Steps
    5-7 are pending. The receipt
    `_docs/_workflows/_smoke/task-551/impl-11-reopen-20260925.json` is absent.
    INITIAL W0 stays blocked (R6-08 (2) rule unchanged)." → R8-11 (the table
    and the state line); the three R7-11 "Today" cells go with the table.
45. R7-12 observables (`:8387-8389`): "R6-01 "memory, slot and `pageLatest`
    are unchanged by that completion" is asserted through `getCached*`
    ("hydrate") before and after, and through the fetch log." and
    (`:8390-8392`): ""pageGenerations and pageLatest survive
    clear<Family>Cache" is matrix T6: an overtaken read resolves through the
    newer result and never throws `admin_list_overtake_invariant`." → R8-02
    (the posts first-page exception; the rest stands) and R8-13 (design note).
46. Gate argv (Round 7) (`:8441-8444`): "It gets a precondition instead:
    before running that command, the orchestrator checks that `find . -path
    ./node_modules -prune -o -name 'task554WorkflowContracts.test.ts' -print`
    prints exactly `./tests/unit/workflows/task554WorkflowContracts.test.ts`."
    and (`:8445-8446`): "Any other match (for example a dry-run copy under
    `11-reopen/`) STOPS the gate before it runs, and the orchestrator reports
    it." and (`:8447-8448`): "The `./` form joins the argv the next time the
    fence is legitimately edited." → R8-10.
47. Superseded sentences (Round 7), item 14 (`:8521-8524`): "the other suites
    keep it." → R8-12 (RUN idiom).
48. Handoffs (Round 7), 10-L02 (`:8670-8671`): "**TASK-551-10-L02 (owed
    mirror; another writer's file).** The `ADMIN_CACHE`/`ADMIN_CACHE_MAP`
    delta, in addition to the Round-6 items:" and (`:8681`): "10-L02 records
    these in its next append-only section." → C17 v5 (items 4 and 5).
49. Handoffs (Round 7), TASK-554 (`:8682-8687`): "**TASK-554.** Unchanged,
    with no file edited. The proof is R7-01: `listPostsCached` never reads the
    list-only state, the subscription never touches TASK-554 state, own
    emissions are ignored, and `postsClientCacheAuthority.test.ts:725-750` and
    `:769-781` pass unmodified with the subscription installed (matrix T13,
    plus the unmodified file in `w2-client-vitest`)." → R8-01 and "Handoffs
    (Round 8)".
50. Handoffs (Round 7), TASK-551-11 (`:8691`):
    "`03-l02-round{2..7}-dispositions.md`" and (`:8692-8694`): "(b) the V11-2
    `./` argv is adopted for every Round-6/7 gate that names a
    `tests/unit/workflows/*.test.ts` path ("Gate argv (Round 7)"), plus the
    `owned-module-consumers-bun` precondition in place of a fence edit." →
    R8-13 (`round{2..N}`) and R8-10 (nothing owed).
51. Handoffs (Round 7), 09-L04 (`:8698`): "**TASK-551-09-L04.** None." →
    "Handoffs (Round 8)" (informational row).
52. Handoffs (Round 7), orchestrator (`:8704-8705`): "INITIAL W0 still waits
    for R6-08 (2)." → R8-09 (the condition holds).
53. Envelope record (Round 7) (`:8724-8725`): "**TASK-554-owned and not edited
    here:** `postsClientCacheAuthority.test.ts` is allowlisted for the fence's
    own runs, but R7-01 forbids editing it." → R8-01 (it carries only the D2
    edits; R7-01 and R7-02 add none).

**Stands** (non-exhaustive reminders): R6-01's two-counter model and check
order (with (I) as restated), the rejection order and the reset bodies; R7-01
except the quoted sentences and lines (the list-only epoch, the inverted
direction, the reset body, T12); R7-02's emitting flag, `isEmitting()` scope,
detail-key rule and hook-side rule; R7-03; R7-05 except the quoted cells;
R7-06 except the quoted sentences and steps; R7-07 except the chain branch,
its row and the quoted bullet sentences (paged bound, fold depth, H9, H16
(rewritten)); R7-08 except `:8239-8240`, (a) and (b); R7-09 except `:8284` and
the vector rendering; R7-10 except the quoted wording; R7-12 except the quoted
observables; R7-13; the Round-7 Security Contract rows.

### Security Contract rows (Round 8)

No route, schema, auth, RBAC, CSRF or rate-limit change. Endpoint visibility,
the auth model and rate-limit buckets stay as in Rounds 2-7.

- **TASK-554 authority isolation.** Unchanged. The posts marker is 03-L02 list
  state that no TASK-554 path reads; `primePostsFirstPage` only deletes it
  (R8-02). The authority-epoch checks (`postsClient.ts:506`, `:522`, `:534`,
  `:707`) are untouched, and `postsClientCacheAuthority.test.ts` changes only
  by the D2 wire-shape edits, keeping every ordering, race and cache assertion
  1:1 (R8-01).
- **No stale page served as fresh.** A posts first page installed by any path
  other than a current `page` completion is never served on the network path
  (R8-02). After an own mutation, pre-mutation cursor and filtered pages are
  stale for network reads (R8-03). A folder rename, reorder, create or delete
  makes media facets stale (R8-04).
- **Own-emission scope.** Still limited to the synchronous local delivery of
  the client's own `emit`; the caller-owned cacheBus operation token passes
  through unchanged, so editor lease filtering is unaffected (R7-02, R8-03).
- **Anti-amplification.** Unchanged per mode: paged ≤ 2 forced reads per
  event; append ≤ 2 × depth per storm window, including repeated supersedes of
  a folded chain (R8-05). A `deleteMediaFolder` delivers two events and is
  bounded per event.
- **Test fixtures.** The global blackout carries `reason = MARKER`; `afterAll`
  deletes only this run's rows; the precondition read stays bounded
  (`.limit(1)`) and never deletes a foreign row; its failure message reports
  only the offending row's `reason` text (R8-12).
- **Evidence.** Git-state receipts keep commit ids, paths and digests only. No
  capture runs over uncommitted wave edits, and FINAL starts only from a
  committed INITIAL state (R8-09).

### Handoffs (Round 8)

- **TASK-554 (D2 parity statement).** `postsClientCacheAuthority.test.ts` and
  `postsClient.test.ts` carry only the D2 / TASK-554 D2-extension mechanical
  edits that TASK-554 already records
  (`TASK-554_Post_Metadata_Publish_RBAC_Hardening.md:1617-1624` for the lines
  replayed by T13). Every ordering, race and cache assertion stays 1:1.
  03-L02's R7-01, R7-02, R8-02 and R8-03 add no edit and change no TASK-554
  assertion. `listPostsCached` keeps the R5-10 outcomes byte-for-byte. No
  TASK-554 file edit and no re-open is owed.
- **TASK-551-10-L02.** Owed through C17 v5 (the copy authority), in 10-L02's
  next append-only section.
- **TASK-551-09-L04 (informational; no edit owed).** 03-L02 R7-02 relies on
  synchronous local delivery with `origin` 'local', operation-token
  pass-through and own-sourceId drop (`cacheBus.ts:151-153`, `:170`). New
  module-level state: per-client lazy subscription handles,
  `postFirstPageEpochs`, `<client>SelfEmit` guards (monotonic counters;
  cleared or unsubscribed by the registered resets). A 09-L04 FINAL cacheBus
  or event-shape change must keep these or re-open R7-02/R7-06. 09-L04 FINAL
  also owns `mediaFoldersClient.ts`, whose `mediaFolders` and `mediaList`
  emissions R8-04 consumes.
- **TASK-551-11.** Nothing owed. V12-2 ends the V11-2 ripple for 03-L02
  (R8-10), and the re-open is complete (R8-09, R8-11). R6-08, as refreshed by
  R8-11, remains the 03-L02 side of **V3-5**, **V4-6**, **V4-7** and **V6-5**,
  and those conditions are met. L11 edits none of 03-L02's files.
- **TASK-551-01-L01.** Unchanged. Round 8 adds no server statement; the R8-12
  reads and deletes are test-only.
- **Relocation follow-up (orchestrator).** R7-08 (a) as restated by R8-13: the
  eight tracked `03-l02-*-dispositions.md` files (and later rounds) leave
  `audit-evidence/` before TASK-551-10-L02 closure; the destination is decided
  before W0.
- **Orchestrator.** The INITIAL capture window is open (R8-09): capture before
  W0's first edit with both diffs empty. The restated
  `owned-module-consumers-bun` precondition (R8-10). The R6-06 stop rule (size
  below).

### Envelope record (Round 8)

No edit: the fence (`:1441-2172`) stays byte-identical, with allowlist 321,
forbidden 52, commands 34, `initial` 30 and `final` 11. Every path this round
names was checked against the fence on 2026-09-26 at `8f84fe0a` (grep over the
parsed fence; line numbers are file lines).

- **Allowlisted** (no new entry): the eight clients plus
  `adminListEnvelope.ts` and `entriesClientPagination.ts` under
  `core/admin/services/` (as in Round 7);
  `core/admin/ui/shared/useBoundedAdminList.ts`;
  `core/admin/ui/media/MediaLibraryPage.tsx` (`:1510`),
  `MediaLibraryResults.tsx` and `useMediaFolderOperations.ts`;
  `core/services/booking/bookingService.ts`; the Round-7 test list plus
  `tests/vitest/ui/media-library-load-retry-wave.test.tsx`,
  `tests/integration/routes/task551BoundedAdminLists.test.ts` and
  `tests/perf/database-admin-list-budgets.test.ts`.
- **Forbidden and consumed only:** `core/admin/utils/cacheBus.ts`,
  `core/admin/services/cachePolicy.ts`,
  `core/admin/utils/adminCacheAuthority.ts` and
  `core/admin/services/mediaFoldersClient.ts`.
- **Outside the envelope (read-only anchors):** R7-02's
  `core/admin/ui/posts/editor/PostClassicEditorShell.tsx:568`,
  `core/admin/ui/custom-screens/hooks/useCustomScreenEditorPersistence.ts:481`
  and `core/admin/services/customScreensClient.ts:516` (none is in the fence);
  `tests/integration/server/task551RevisionConcurrency.test.ts` (the C13
  idiom); `core/db/tables/bookings.ts` (consumed through an import in the
  test); the TASK-551-11-owned
  `tests/unit/workflows/{task551WorkflowContractsFixtures.ts,evidenceContractMatrix.test.ts,task551WorkflowContracts.test.ts,task551EvidenceContract.test.ts,dispatchContractCaps.test.ts,task551AuthorAudit.test.ts,authorAuditDriftRounds.test.ts,authorAuditBoundedChild.test.ts}`
  and `tests/unit/workflows/task554WorkflowContracts.test.ts` (an argv path of
  `owned-module-consumers-bun`, not allowlisted),
  `_docs/_workflows/lib/{task-551-phase-provenance,task-551-dispatch-envelope,task-551-worktree-compatibility}.mjs`,
  `_docs/_workflows/_smoke/task-551/11-reopen/ledger.jsonl` and
  `impl-11-reopen-20260925.json`; the task files of TASK-554, TASK-551-10-L02,
  TASK-551-09-L04 and TASK-551-11; the `03-l02-baselines/` files and the
  dispositions records (orchestrator evidence).

No NEW allowlisted path is needed. One JSON fence. **Size (R6-06 stop rule).**
This file is 707,757 bytes after the Round-8 append (`wc -c`), below the
1,048,576-byte cap with the 200-byte closure headroom.

## Dated Contract Corrections — 2026-09-26 (Round 9: posts patch marker drop, detail-pages event-key clear, media-library pin, INITIAL capture dependencies, own-emit epoch wording, slot-bearing families; append-only)

Source:
`_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round9-dispositions.md`
(R9-01..R9-13 over the Round-8 auditors S1, S2-A, S2-B, S3-A and S3-B;
audited HEAD `74fe8f4ea4324a4ef3a04a610983779c9649632e`, with Round 8
committed; the only untracked paths are the TASK-551-11 re-open evidence under
`_docs/_workflows/_smoke/task-551/11-reopen/` and orchestrator evidence, never
this file). This section applies R9-01..R9-12. R9-13 corrects the
orchestrator's mandate only (the module is
`core/admin/services/cachePolicy.ts`, not `core/admin/utils/`, and the audited
HEAD is `74fe8f4e`); it changes no contract text. **This section wins** over
every earlier part where they differ. No in-place edit: the fence
(`:1441-2172`), "Validation Commands" and all earlier text stay
byte-identical, and there is no envelope delta. The section is appended after
`contract :9806`, so no citation shifts. Anchors were re-read on 2026-09-26 at
`74fe8f4e` (the symbol stays authoritative wherever a line drifts). Every
sentence this round supersedes is quoted verbatim under "Superseded sentences
(Round 9)" (text authoritative; a hard line wrap inside a quote is rendered as
one space). Everything not quoted there stays binding.

### R9-01 — A posts patch drops the first-page marker; no other client patches a null slot into existence (MEDIUM; S2-A; INFO S2-B)

**Finding (verified).** C9 v2 `upsertCachedPost` (`:4011-4025`) reads the
default slot. When `postsListCache.read()` is `null`, it synthesizes `base = {
v: 1, filters: DEFAULT_POST_LIST_FILTERS, items: [], nextCursor: null,
hasMore: false }` (`:4014-4016`) and writes the slot (`:4021`). The read is
`null` once the list TTL has passed: `createMemoryBackedStorageCache` drops a
memory entry older than `ttlMs` and reads Storage through the same freshness
check (`core/admin/utils/storageCache.ts:130-150`). Only `primePostsFirstPage`
drops the marker (R8-02 rule (1), `:8832-8833`), and the first-page hit path
(`:7815`) serves `getCachedPosts(filters)` whenever the marker equals
`postsInvalidationEpoch`. HEAD `getPostCached` (`postsClient.ts:436-458`)
calls `upsertCachedPost` and broadcasts nothing. So a detail read after the
TTL writes a one-row page with `hasMore: false` under a still-valid marker,
and the next non-forced `readPostsListPage()` serves it on the network path.
That contradicts the Round-8 security row (`:9711-9713`).

The other clients carry the same "patch into nothing" idiom at HEAD:
`pagesClient.ts:161` (`readPagesCache() ?? []`), `formsClient.ts:229`
(`upsertCachedFormSummary`, also reached by the detail read at `:242`),
`bookingClient.ts:257`, `:266`, `:275` (`upsertResource`, `upsertService`,
`upsertReservation`) and `:579` (`createBookingBlackout`), and
`entriesClient.ts:321` (`mergeSummaryIntoCurrentList`). `mediaClient.ts:122`
and `detailPagesClient.ts:150-151` already return early on a missing list.

**Rule.**

- **(1b) Posts patches drop the default marker.** Every slot write by
  `upsertCachedPost` or `removeCachedPost` first runs
  `postFirstPageEpochs.delete(postFirstPageMarkerKey(DEFAULT_POST_LIST_FILTERS))`
  and then `postsListCache.write(...)`. The drop is unconditional: it runs for
  a synthesized base and for a stored one alike. That simpler form costs at
  most one extra network read on the next non-forced default first-page read.
  A path that writes no slot (a tombstoned upsert, a remove with no stored
  slot) drops nothing.
- These patches are NOT installs for rule (1). They keep the C9 v2 direct write
  (`:4021`) and never call `primePostsFirstPage`. They keep the TASK-554
  precondition that a detail upsert creates or patches the default-filter
  envelope (`:4053-4054`), so the synthesis itself stays. Only the default key
  is dropped, because only the default slot is written. `patchMemoryPages`
  stays replace-only (`:4022`) and moves no marker.
- **R8-02's marker assertion** (the sentence quoted below) now reads: a
  `postFirstPageEpochs` entry for key K asserts that the TASK-554 read at K was
  installed by a `readPostsListPage` first-page completion classified `page`
  under the current `postsInvalidationEpoch`, and that since then nothing has
  installed at K and, for the default key, no patch has written the persisted
  slot.
- **Every other slot-bearing client** (pages; entries-type per slug and
  `entriesAllList`; the forms list; media; booking ×4; detail pages, global
  and per content type; R9-06): a patch (merge, upsert, prepend, status patch
  or remove) whose persisted default slot reads `null` writes NOTHING to the
  persisted slot. `null` means missing, expired, or a legacy shape that
  `isPersistedFirstPage` rejects. The patch then touches only the client's
  memory pages, replace only and never inserting, exactly like the posts
  `patchMemoryPages` (`:4022`). An existing versioned slot is patched as at
  HEAD, including a prepend on create where HEAD prepends. Every HEAD `?? []`
  base listed above is retired. Posts is the only client whose patch may
  create the slot (the TASK-554 precondition), and (1b) keeps that slot off
  the network path.
- **C9 v2 / C11 / C12 patch sentences.** A grep of this file at `74fe8f4e` for
  patch wording (`merge`, `upsert`, `prepend`, `unshift`, `patch`) finds a
  slot synthesis only for posts (C9 v2 `:4014-4016`, R3-17 "Posts prepend"
  `:5432-5435`, R8-03 `:8889`). All of these stand. C11 (`:2819-2880`) and C12
  (`:2882-2932`) contain no patch sentence. No sentence synthesizes a slot from
  `null` for another client, so nothing beyond the R8-03 sentence below is
  quoted. The blackouts row (`:434`, "never synthesize a full list") already
  agrees with this rule.

```ts
// core/admin/services/postsClient.ts (R9-01; amends C9 v2 upsertCachedPost/removeCachedPost; everything else in them stands)
const dropDefaultPostFirstPageMarker = (): void => {
  postFirstPageEpochs.delete(postFirstPageMarkerKey(DEFAULT_POST_LIST_FILTERS)); // === the readPostsListPage key for (DEFAULT, null)
};
const upsertCachedPost = (post: PostListItem | PostDetail) => {
  if (postDetailTombstones.has(post.id)) return false;             // no slot write; marker untouched
  invalidatedPostListRows.delete(post.id);
  const stored = postsListCache.read();                            // null after the list TTL
  const base = stored ?? { v: 1, filters: DEFAULT_POST_LIST_FILTERS, items: [],
    nextCursor: null, hasMore: false };                            // C9 v2 synthesis, unchanged (TASK-554 precondition)
  const row = toPostListItem(post);
  const index = base.items.findIndex((item) => item.id === row.id);
  const items = index === -1 ? [row, ...base.items]
    : base.items.map((item, i) => (i === index ? { ...item, ...row } : item));
  dropDefaultPostFirstPageMarker();                                // (1b): BEFORE the slot write
  postsListCache.write({ ...base, items });                        // C9 v2 direct write (:4021); not a rule-(1) install
  patchMemoryPages(row);                                           // replace only; moves no marker
  /* detail cache, tombstones and recordPostListRowPublication unchanged */
  return true;
};
const removeCachedPost = (id: string, options?: { invalidateListRow?: boolean }) => {
  /* HEAD invalidatedPostListRows handling (postsClient.ts:266-267) unchanged */
  const stored = postsListCache.read();
  if (stored !== null) {                                           // no stored slot: no write, marker untouched
    dropDefaultPostFirstPageMarker();                              // (1b)
    postsListCache.write({ ...stored, items: stored.items.filter((item) => item.id !== id) });
  }
  /* memory pages filtered (C9 v2 :4026); detail, revision and publication paths unchanged (HEAD :270-274) */
};

// core/admin/services/pagesClient.ts (R9-01; the null-slot patch rule; the template for every slot-bearing client except posts)
function patchPagesFirstPageSlot(patch: (items: readonly PageListItem[]) => readonly PageListItem[]): void {
  const stored = pagesFirstPage.read();                            // PersistedFirstPage | null (missing, expired, legacy => null)
  if (stored === null) return;                                     // null slot: install NOTHING (retires HEAD :161 `?? []`)
  pagesFirstPage.write({ ...stored, items: patch(stored.items) }); // v, filters, nextCursor, hasMore kept
}
const mergeCachedPageIntoList = (page: PageListItem | PageDetail): void => {
  const row = toPageListItem(page);                                // the C9 v2 narrowing
  patchPagesFirstPageSlot((items) => mergeOrPrependPageRow(items, row, hasAuthorField(page))); // HEAD :163-171 semantics
  patchPageMemoryPages(row);                                       // memory pages: replace only, never inserts
  /* the detail cache write (HEAD :178-180) unchanged */
};
// updateCachedPageStatus and removeCachedPage keep their HEAD `if (current)` guards (:185, :197) over the versioned slot.
// Entries (per slug and entriesAllList), forms, booking ×4, media and detail pages (each key) follow the same shape;
// helper names are the writer's, and the `stored === null` early return is binding.
```

**Tests.**

- **T6 (d), posts first page** (`tests/vitest/admin/task551PaginatedClients.test.ts`,
  posts block; "posts: a detail upsert after the list TTL never serves a
  synthesized first page"). The test fakes `Date` only
  (`vi.useFakeTimers({ toFake: ["Date"] })`, restored in `afterEach`).
  1. Stub `fetch`: the default list GET returns an envelope of three rows with
     `nextCursor` non-null and `hasMore: true`; the detail GET for an id X
     that is not among the three returns a post detail.
  2. `readPostsListPage()` resolves `{ kind: "page" }`, which sets the marker.
     Control: a second non-forced `readPostsListPage()` issues 0 list GETs.
  3. `vi.setSystemTime(Date.now() + cacheTtlMs.list + 1)`. `getCachedPosts()`
     now returns `null`.
  4. `await getPostCached(X, { force: true })` issues exactly one detail GET.
     `getCachedPosts()` (`"hydrate"`) then returns the synthesized page
     `{ items: [X's row], nextCursor: null, hasMore: false }` (TASK-554
     precondition, unchanged).
  5. The next non-forced `readPostsListPage()` issues exactly one list GET and
     resolves the fetched envelope (three rows, `hasMore: true`). It never
     resolves the synthesized one-row page.
  6. Variant with the slot present (no time advance): the upsert in step 4
     patches the stored slot and still drops the marker, so step 5 again
     issues exactly one list GET. That is the at-most-one-extra-fetch cost.
  Without (1b), step 5 resolves the synthesized page with 0 list GETs, so the
  case fails.
- **T16 (new matrix row; "a patch into a null default slot installs
  nothing").** Cells: pages `updatePage`; entries-type and `entriesAllList`,
  through any own mutation whose HEAD path reaches
  `mergeSummaryIntoCurrentList`; forms `updateForm`, plus the detail read that
  reaches `upsertCachedFormSummary` (`formsClient.ts:242`); media
  `updateMedia`; booking resources, services and reservations through their
  create mutations (`upsertResource`, `upsertService`, `upsertReservation`),
  and blackouts through `createBookingBlackout`; detail pages through an
  update that reaches `upsertCachedDetailPage`, for both key shapes; posts
  n/a (the TASK-554 precondition synthesizes; T6 (d)); users n/a (no slot,
  R3-18). Each case starts with no persisted default slot, either never read
  or read and then expired with `vi.setSystemTime(Date.now() + cacheTtlMs.list
  + 1)`. It runs the mutation against a stubbed response and asserts: the
  `Storage` spy records no write to the family list key; `getCached*()` for
  the default filters returns `null`; the next non-forced default first-page
  read issues exactly one list GET. The patched-slot pins (R8-07) cover the
  "slot present" half, which is unchanged.
- The R8-02 T6 (a)-(c) cases stand.

### R9-02 — Detail pages: the subscription also clears the triggering key (MEDIUM; S2-A)

**Finding (verified).** `detailPagesClient.ts` creates its list caches lazily:
`getListCache` (`:103-114`) and `upsertListCache` (`:141-149`) add a
`listCacheByKey` entry only on first use. HEAD's public clears handle a key
that has never been read in this tab with `clearLocalCache(key)` (`:180`, and
`:189-198` for the known keys). The R8-13 invalidate text (`:9405-9409`)
enumerates only `listCacheByKey`. A per-content-type slot that exists only in
Storage therefore survives a foreign `detailPagesListByContentType(ct)` event,
and a later non-forced read serves it as fresh.

**Rule.** The detail-pages subscription path is `invalidateDetailPagesList()`
(R8-13: epoch +1, dedupe cleared, every slot in `listCacheByKey` cleared) PLUS
the triggering event key: `listCacheByKey.get(event.key)?.clear()` when that
key has a cache, otherwise `clearLocalCache(event.key)` (the HEAD `:180`
idiom). Storage is never enumerated. The public clears
`clearDetailPageListCache` and `clearDetailPagesCache` keep their HEAD bodies
(`:176-199`) and then run the invalidate (R7-12). The R8-03 `onOwnEmit` stays
the invalidate minus the slot clears, and it clears no event key, because an
own emission is skipped by the subscription (R7-02).

```ts
// core/admin/services/detailPagesClient.ts (R9-02; the subscription handler; the R7-12 predicate and R8-13 invalidate stand)
function ensureDetailPagesListSubscription(): void {                // lazy on the first page read; idempotent
  detailPagesSubscription ??= subscribeCacheEvents((event, origin) => {
    if (origin === "local" && detailPagesSelfEmit.isEmitting()) return; // R7-02: own emission, skipped (onOwnEmit already ran)
    if (!event.key.startsWith(cacheKeys.detailPagesList)) return;       // R7-12 predicate; never detailPageDetail(id)
    invalidateDetailPagesList();                                       // R8-13: epoch +1, dedupe cleared, every listCacheByKey slot cleared
    const slot = listCacheByKey.get(event.key);
    if (slot) slot.clear();                                           // the triggering key, when this tab created its cache
    else clearLocalCache(event.key);                                  // Storage-only slot (HEAD :180 idiom); no Storage enumeration
  });
}
```

- **R8-06 (1), detail-pages cell** (restated): the test seeds the global slot
  and the per-content-type slot for `ct` through `Storage`. The next read is
  the GLOBAL non-forced default first-page read, served by the seeded global
  slot with 0 `fetch` calls, and it re-subscribes. The foreign event carries
  `cacheKeys.detailPagesListByContentType(ct)`. Afterwards
  `getCachedDetailPages(ct)` is `null`, whether or not the client created a
  `listCacheByKey` entry for `ct` before the event.
- **Design note (HEAD parity; LOW; not a defect of this leaf).** A
  per-content-type slot that exists only in Storage survives a foreign GLOBAL
  (`detailPagesList`) event until its own key is read or cleared, exactly as
  at HEAD.

### R9-03 — The media view pin that actually changes (MEDIUM; S2-A; LOW S2-B; INFO S3-A)

The R8-04 "Intended contract change" bullet (quoted below) is replaced by (a)
and (b).

(a) **No folder-event list counter exists.** At HEAD no view assertion counts
media list GETs across a `mediaFolders` event. The only media list GET
counters in `tests/vitest/ui/media-library*.test.tsx` are
`media-library.test.tsx:235` and `:268` (the `"/admin/api/media"` filter), and
neither crosses a `mediaFolders` event. The folder-event tests (their
`mediaFolders` broadcasts are at `media-library-load-retry-wave.test.tsx:203`
and `media-library-mutation-retry-wave.test.tsx:557`, `:613`, `:654`, `:830`)
count folder GETs only. The new R8-04 view test ("a foreign mediaFolders
event revalidates the media results") is therefore additive, and every folder
GET count stays unchanged.

(b) **The named intended contract change** is
`tests/vitest/ui/media-library.test.tsx:242-273` ("MediaLibraryPage applies
media update events from storage without fetching media"). The mechanism:

1. The media client's lazy subscription is registered synchronously inside
   the first media list read the view issues on mount. At HEAD that read is
   `listMediaCached` in the mount refresh effect
   (`core/admin/ui/media/MediaLibraryPage.tsx:356-358`), which precedes the
   view's own subscription effect (`:360-366`: `:362` key filter, `:363`
   `update` short-circuit through `applyCachedMediaRows()`, `:364` forced
   background refresh).
2. cacheBus delivers local handlers synchronously in insertion order: the
   `localHandlers` Set gets `add` at `core/admin/utils/cacheBus.ts:157`, and
   the loop runs at `:151-153`.
3. A foreign `mediaList` `update` event therefore runs `invalidateMediaList`
   first, which clears the slot in memory and in Storage. Then
   `applyCachedMediaRows()` (`getCachedMediaForEvent()`, Storage first) finds
   nothing and returns `false`, and the view performs exactly ONE forced
   background read.

The test's assertions become the following:

- exactly 1 media list GET after the broadcast;
- after flushing, the rendered rows equal the fetched page (the stub's
  "Network update" row);
- the "Storage update" expectation is replaced. The test may still assert
  that the "Storage update" row the test wrote is never rendered.

The fetch stub and the `writeMediaCache` seed take their C9 v2 envelope and
versioned-slot wire forms. That is the owning-section adaptation (R8-07), not
part of this named change. Every other assertion in the file stands.

**STOP rules.** If the implementer observes the opposite handler order (the
view's handler before the client's), it STOPs and reports to the orchestrator.
This can happen, for example, when a C11 extraction registers the results
subscription before the first list read. The implementer does not re-baseline
silently. The R8-03/R8-04 STOP-and-report rule stays in force for every other
pin.

### R9-04 — INITIAL capture waits for the declared dependencies (MEDIUM; S3-A; INFO S3-B)

The R8-09 state sentence and the Round-8 Handoffs orchestrator line (both
quoted below) are replaced by this text:

"R6-08 (2) no longer blocks W0. INITIAL W0 and its capture remain blocked by
the occurrence dependency `TASK-551-09-L04:initial` (fence `:2162`) and the
header Dependencies (`:9-11`: TASK-551-03-L01, 05-L02, 06-L03, the 09-L04
INITIAL receipt and the 08-L03 INITIAL receipt, all `⏳ To Do` at
`74fe8f4e`). The INITIAL capture runs once, at the INITIAL `preWaveCommit`,
immediately before W0's first edit, after those dependencies have landed. A
capture taken earlier is void and is not a re-capture."

The R8-09 sentence "The INITIAL `preWaveCommit` is still the commit the
orchestrator records immediately before W0's first edit, and every other W0
precondition (C13 v3 list, R7-08 (a) as restated by R8-13) is unchanged."
stands. The dependency gate above is in addition to it.

**R8-09 receipt commands: satisfied at `74fe8f4e`** (run 2026-09-26 from the
worktree root; re-run by this writer with the same outputs):

| Command | Output at `74fe8f4e` |
|---|---|
| `git ls-files --error-unmatch _docs/_workflows/_smoke/task-551/impl-11-reopen-20260925.json` | prints the path; exit 0 |
| `git log --diff-filter=A --format=%H -- _docs/_workflows/_smoke/task-551/impl-11-reopen-20260925.json` | `051e36bc9f1bead4b3fb28a1f4f6cb8d1339057a` (= sha_7) |
| `git status --porcelain=v1 --untracked-files=all -- <the 321 allowlist paths, each a :(literal) pathspec>` | prints nothing (allowlist clean) |

The five dependency statuses were read from each task file's `**Status:**`
line at `74fe8f4e`. The W0 receipt re-runs all three commands at the INITIAL
`preWaveCommit`. The value recorded there, not the one recorded here, is the
capture evidence.

### R9-05 — Own emissions advance the epoch: R6-01 wording and C17 v5 item 3 (MEDIUM; S2-B)

R8-03 made `onOwnEmit` (the invalidate minus the persisted-slot clear) a
second advancer of each client's `invalidationEpoch`, and R6-01 still says
"ONLY by `invalidate`". Only the posts sentence was quoted in Round 8 (quote
11). The R6-01 sentences at `:7031-7034` and the template comment at `:7067`
(quoted below) now read:

- `:7031-7034`: "`invalidationEpoch` is advanced by `invalidate` (public clear
  or subscription) and by `onOwnEmit` on an own emission (the invalidate minus
  the persisted-slot clear); `invalidate` runs from the client's public
  `clear<Family>Cache` (mutation callers) and from the client's lazy cacheBus
  subscription to its family keys (any origin, `local` or `remote`;
  `core/admin/utils/cacheBus.ts:18-22`, consumed only)." The rest of
  `:7035-7044` is unchanged.
- `:7067`: "let pagesInvalidationEpoch = 1; // invalidationEpoch: advanced by
  invalidatePagesList and by advancePagesListEpoch (own emission, R8-03)".

The posts comment `:7782` ("advanced ONLY by invalidatePostsList") stays
true: the posts `onOwnEmit` IS `invalidatePostsList` (R8-03). C17 v5 item 3
is amended under "C17 v5 amendments (Round 9)" below.

### R9-06 — T10 observable (1) covers only the families with a persisted slot (MEDIUM; S2-B)

Observable (1) of R8-06 names "forms and submissions" and "entries ×3" (quoted
below). Form submissions and custom-screen entries have no persisted slot.
`core/admin/services/cachePolicy.ts:70-73` has only `formsList`,
`formDetail`, `formActions` and `formActionRuns`. `:31-38` has
`entriesAllList` and `entriesList(slug)`, and no custom-screen-entries list
key. C9 v2 persists only the default first page, under the family list key
(`:3985-3991`), and fixes no submissions or custom-screen default constant
(`:3992-3997`).

- **R8-06 (1) family list** (replaces `:9117-9118`): "(the families that own a
  persisted default slot: pages; entries-type per slug (`entriesList(slug)`)
  and `entriesAllList`; the forms list (`formsList`); media; booking ×4;
  detail pages, global plus one per-content-type key)".
- **Memory-only families.** Form submissions and custom-screen entries use
  observable (2) only. Their (1) cell reads "n/a (memory-only; no persisted
  slot)". The R8-06 sentence "Posts and users use (2) only." (quoted below)
  now reads "Posts, users, form submissions and custom-screen entries use (2)
  only." The posts and users reasons after it stand.
- **R8-03 table cells** (`:8921-8922`, quoted below): the entries row's "Kept
  by an own emission" cell reads "the `entriesList(slug)` and `entriesAllList`
  slots (custom-screen entries: memory-only)". The forms row's cell reads "the
  `formsList` slot (submissions: memory-only)". The other cells of both rows
  stand.

### R9-07 — "The next read" and the accessor shape (LOW; S2-B)

- **The next read** in R8-06 (1) (the sentence quoted below) is pinned as a
  non-forced default first-page read of that client, served by the seeded
  slot with 0 `fetch` calls, which re-subscribes. The sentence now reads:
  "After the next read of that client, a non-forced default first-page read
  served by the seeded slot with 0 `fetch` calls (it re-subscribes), the same
  foreign event clears the slot, and `getCached*()` for the default filters
  returns `null`." For detail pages the next read is the global read and the
  event is the per-content-type key (R9-02).
- **Accessor shape.** Every slot-bearing `getCached*()` accessor has the
  `getCachedPosts` shape (C9 v2 `:4007-4010`; media R8-04 `:8994-8998`). For
  the default filters it reads the persisted slot only
  (`readPersistedFirstPage`). For other filters it reads verified memory in
  `"hydrate"` (R7-04 4-argument rule). This applies to the pages, entries
  (per slug and `entriesAllList`), forms-list, media, booking (each family)
  and detail-pages (each key) accessors.
- **Verification (no quote needed).** At `74fe8f4e` this file defines
  accessor bodies only for `getCachedPosts` (`:4007-4010`) and the media
  accessor (`:8994-8998`). No sentence defines a `getCached*` accessor that
  reads verified memory first for the default filters. The memory-first
  reads at C9 v2 `:3954-3955` and R6-01 `:7093-7094` are network-path hit
  checks, not accessors. After the registered reset their memory is empty,
  so the pinned next read is served by the slot. No sentence is quoted for
  R9-07.

### R9-08 — T1 posts first page: the install is deterministic (LOW; S2-B)

The R8-02 T1 posts first-page clause (quoted below) now reads: "The inner
TASK-554 `listPostsCached` installs its reconciled envelope (TASK-554
behaviour, unchanged), so `getCachedPosts(f)` equals the fetched envelope
reconciled by TASK-554." A `postsList` event never advances
`postsCacheAuthorityEpoch` (R7-01). The install at C9 v2 `:4039-4042` is
skipped only when that epoch advanced, so for an event during the await the
install always runs. With `clearPostsCache()` during the await the R8-02
reading stands (authority-stale, installs nothing).

### R9-09 — Booking legs: rows from slots, window reads from `w` (LOW; S1; INFO S1 ×2)

- **Timestamps** (replaces `:9332-9333`, quoted below): "Every row timestamp a
  DB leg writes (the week-cap seed rows and every reservation) comes only from
  `s = bookingLegSlots(w)`, where `w = bookingLegWindows(RUN)`. Service inputs
  pass `new Date(slot.start).toISOString()` / `new
  Date(slot.end).toISOString()`. The global blackout row spans `w.blackout`
  (`startsAt: new Date(w.blackout.from).toISOString()`, `endsAt: new
  Date(w.blackout.to).toISOString()`). Window-bound reads (the week-cap route
  query, the R5-02 race precondition and the blackout precondition) read `w`
  directly." The DB-free containment test that follows it stands.
- **Anchor note** (replaces `:9371-9373`, quoted below): "**Anchor note
  (INFO).** For the C13 `afterAll` citation `:739-741` (`:2945`): the
  `afterAll` opens at `task551RevisionConcurrency.test.ts:739`; its marker
  deletes are `:747` (pages) and `:749` (users); the symbol governs."
- **`reason` anchor** (appended; quoted below): "(the service stores `reason`,
  `core/services/booking/bookingService.ts:851-859`; after the C7 split:
  `bookingMutationService.ts`, same body)".
- The Round-7 S1 note on two same-`k` runs (probability 1/4096, a loud
  failure that never passes falsely) needs no change.

### R9-10 — 09-L04 owes a mirror (LOW; S3-A)

The Round-8 Handoffs 09-L04 row (`:9743-9751`) was labelled "informational; no
edit owed" (quoted below). It is reclassified as an owed mirror in another
writer's file:

"TASK-551-09-L04 (owed mirror): its next append-only section records the
R7-02/R8-04 consumer constraints (synchronous local delivery,
operation-token pass-through, own-sourceId drop; `mediaFoldersClient.ts`
emissions `:236/:251/:268` `mediaFolders` only, `:280-281` both keys) and
adds `tests/vitest/admin/task551PaginatedClients.test.ts` (T14/T14b) to its
FINAL gate."

The rest of that row stands as the content of the mirror: the module-level
state list, the "keep these or re-open R7-02/R7-06" rule, and the 09-L04
FINAL ownership of `mediaFoldersClient.ts`. The mirror is listed in "C17 v5
amendments (Round 9)" next to the TASK-554 and orchestrator pointers. The
orchestrator queues the 09-L04 mirror writer. 09-L04 is 1,308 lines at
`74fe8f4e`, and its own writer edits it, not 03-L02's writer.

### R9-11 — Entries self-emit guard placement: accepted (INFO; S2-A, S2-B, S3-A)

The contract text at `:9386-9399` is ACCEPTED as written:

- the guard is created in `entriesClientPagination.ts` and exported one way
  to `entriesClient.ts`;
- `entriesClientPagination.ts` has no value import from `./entriesClient`;
- the STOP fallback covers a helper that only `entriesClient.ts` owns;
- the second static assertion checks the one-way import rule.

The opposite direction in `03-l02-round8-dispositions.md` (R8-13) is
superseded by the Round-9 dispositions record. This file changes nothing.

### R9-12 — Superseded-list completeness (INFO; S3-B, S3-A)

Three sentences are added to the superseded list below:

- the R7-08 lead-in `:8257-8258`;
- the Round-7 Handoffs TASK-551-11 lead-in `:8688`;
- the Round-7 Handoffs 10-L02 sub-bullet `:8675-8676` ("own-emission ignore …
  (emitting flag plus `ownMutationEpoch` fence)").

The two lead-ins are replaced by R8-10 ("nothing is owed to TASK-551-11") and
"Handoffs (Round 8)". The R7-08 (a) relocation lives on as an orchestrator
follow-up (R8-13 restatement). The sub-bullet is replaced by R8-03 (an own
emission runs the invalidate minus the persisted-slot clear) and by C17 v5
item 4 in its Round-8 form.

### C17 v5 amendments (Round 9)

The heading `### C17 v5 — Handoffs and owed mirrors (2026-09-26; Rounds 5-8)`
(`:9166`) stays 10-L02's copy authority
(`TASK-551-10-L02-Documentation-Runbooks-And-Family-Closure.md:1628-1633`).
Under that rule, the closure writer greps 03-L02 for every `C17 v` heading,
copies from the highest dated one, and applies earlier C17 bullets only where
that heading leaves them standing. This subsection is NOT a new C17 version
and has no date of its own. 10-L02 copies C17 v5 as amended here.

1. **Item 3** now reads: "the two-counter model per paged client
   (`invalidationEpoch`, advanced by the invalidate and by an own emission
   (item 5 (b)), vs `resetGeneration`, advanced only by the registered
   reset)". The rest of item 3 stands (R9-05).
2. **Item 6 (Round 9; added to the 10-L02 mirror).**
   - (a) Posts `upsertCachedPost` and `removeCachedPost` slot writes drop the
     default first-page marker. Every other slot-bearing client never patches
     a `null` persisted slot into existence; it patches memory only (R9-01).
   - (b) The detail-pages subscription also clears the triggering event key,
     through its cache or `clearLocalCache` (R9-02).
   - (c) Media library: a foreign `mediaList` update clears the media slot
     before the view's handler runs, so the view performs one forced
     background read instead of applying Storage rows (R9-03).
   - (d) Form submissions and custom-screen entries are memory-only list
     families with no persisted slot (R9-06).
3. **Pointers.** These replace the C17 v5 pointer sentence quoted below:
   - **TASK-554:** unchanged; see "Handoffs (Round 9)".
   - **TASK-551-09-L04:** owed mirror (R9-10); see "Handoffs (Round 9)".
   - **Orchestrator:** "Handoffs (Round 8)" as amended by "Handoffs (Round
     9)".
   - The C17 v5 TASK-551-11 and query-inventory (01-L01) sentences stand.

### Superseded sentences (Round 9)

Each quote is verbatim (text authoritative; a hard wrap is one space). The
replacement is the named Round-9 item.

1. R6-01 model (`:7031-7034`): "`invalidationEpoch` is advanced ONLY by
   `invalidate`. `invalidate` runs from the client's public
   `clear<Family>Cache` (mutation callers) and from the client's lazy
   cacheBus subscription to its family keys (any origin, `local` or `remote`;
   `core/admin/utils/cacheBus.ts:18-22`, consumed only)." → R9-05 (the epoch
   is also advanced by `onOwnEmit`; the rest of the sentence stands).
2. R6-01 template (`:7067`): "let pagesInvalidationEpoch = 1; //
   invalidationEpoch: advanced ONLY by invalidatePagesList" → R9-05 (advanced
   by `invalidatePagesList` and by `advancePagesListEpoch`).
3. R7-08 lead-in (`:8257-8258`): "**TASK-551-11 obligations** (these replace
   the Round-6 Handoffs row "TASK-551-11. Nothing owed.", quoted below):" →
   R9-12 (R8-10: nothing is owed to TASK-551-11; the (a) relocation is an
   orchestrator follow-up per R8-13).
4. Handoffs (Round 7), 10-L02 (`:8675-8676`): "own-emission ignore through
   `createAdminListSelfEmitGuard` (emitting flag plus `ownMutationEpoch`
   fence);" → R9-12 (R8-03 and C17 v5 item 4).
5. Handoffs (Round 7), TASK-551-11 (`:8688`): "**TASK-551-11.** This row
   replaces "Nothing owed." (quote 35):" → R9-12 (R8-10 and "Handoffs (Round
   8)").
6. R8-02 rule (`:8812-8813`): "`postsInvalidationEpoch`, and nothing has
   installed at K since." → R9-01 (nothing has installed at K and, for the
   default key, no patch has written the persisted slot).
7. R8-02 T1 (`:8865-8866`): "installs its reconciled envelope (TASK-554
   behaviour, unchanged), so `getCachedPosts(f)` may change." → R9-08
   (`getCachedPosts(f)` equals the fetched envelope reconciled by TASK-554).
8. R8-03 table, entries row (`:8921`): "| entries |
   `entriesInvalidationEpoch` +1; every entries dedupe map cleared | every
   entries family slot |" → R9-06 (last cell only: the `entriesList(slug)` and
   `entriesAllList` slots; custom-screen entries memory-only).
9. R8-03 table, forms row (`:8922`): "| forms (+ submissions) |
   `formsInvalidationEpoch` +1; forms and submissions dedupe cleared | every
   forms slot |" → R9-06 (last cell only: the `formsList` slot; submissions
   memory-only).
10. R8-03 (`:8944`): "No `upsertCachedPost` change is needed." → R9-01 (the
    upsert-before-await argument stands; the (1b) marker drop is the only
    `upsertCachedPost` and `removeCachedPost` change).
11. R8-04 (`:9047-9050`): "**Intended contract change (named here).** An
    existing media view assertion that counts media LIST GETs across a
    `mediaFolders` event gains exactly that one forced read and nothing else.
    Folder GET counts, row values and every other assertion stay as they
    are." → R9-03 (a) and (b).
12. R8-06 (1) (`:9117-9118`): "(pages; entries ×3; forms and submissions;
    media; booking ×4; detail pages with the global key and one
    per-content-type key)." → R9-06 (the families with a persisted slot).
13. R8-06 (1) (`:9123-9125`): "After the next read of that client (which
    re-subscribes), the same foreign event clears the slot, and `getCached*()`
    for the default filters returns `null`." → R9-07 (a non-forced default
    first-page read served by the seeded slot, 0 `fetch` calls) and R9-02
    (the detail-pages cell).
14. R8-06 (`:9136`): "Posts and users use (2) only." → R9-06 (posts, users,
    form submissions and custom-screen entries).
15. C17 v5 item 3 (`:9182-9183`): "`invalidationEpoch`, advanced only by the
    invalidate," → "C17 v5 amendments (Round 9)" item 1 (R9-05).
16. C17 v5 (`:9211-9212`): "**TASK-554, TASK-551-09-L04 and the
    orchestrator:** "Handoffs (Round 8)" below." → "C17 v5 amendments (Round
    9)" item 3.
17. R8-09 state (`:9246-9248`): "The R5-12 INITIAL capture window at
    `_docs/_workflows/_smoke/task-551/03-l02-baselines/03-l02-root-tsc-baseline.txt`
    (R7-08 path) is therefore OPEN." → R9-04 (blocked by the occurrence
    dependency and the header Dependencies; one capture at the INITIAL
    `preWaveCommit`).
18. R8-12 (`:9332-9333`): "Every DB leg reads its timestamps only from
    `bookingLegSlots(bookingLegWindows(RUN))`." → R9-09 (rows from `s`,
    window reads and the blackout row from `w`).
19. R8-12 blackout marker (`:9342-9343`): "(the service stores `reason`,
    `core/services/booking/bookingService.ts:851-859`)" → R9-09 (the C7-split
    anchor appended).
20. R8-12 anchor note (`:9371-9373`): "**Anchor note (INFO).** The C13
    `afterAll` marker delete cited as `:739-741` (`:2945`) is now
    `task551RevisionConcurrency.test.ts:747-749`; the symbol governs." →
    R9-09 (`afterAll` opens at `:739`; deletes at `:747` and `:749`).
21. Security Contract rows (Round 8) (`:9711-9713`): "A posts first page
    installed by any path other than a current `page` completion is never
    served on the network path (R8-02)." → "Security Contract rows (Round 9)"
    (extended by R9-01).
22. Handoffs (Round 8), 09-L04 (`:9743`): "**TASK-551-09-L04 (informational;
    no edit owed).**" → R9-10 (owed mirror; the rest of the row is the
    mirror's content).
23. Handoffs (Round 8), orchestrator (`:9762-9763`): "The INITIAL capture
    window is open (R8-09): capture before W0's first edit with both diffs
    empty." → R9-04 and "Handoffs (Round 9)".

**Stands** (non-exhaustive reminders):

- R8-02 rules (1)-(4), its code block and T6 (a)-(c);
- R8-03 except the two quoted table cells and `:8944`;
- R8-04 except the quoted bullet (predicate, T7, T14, T14b and the view test);
- R8-05;
- R8-06 (2) and R8-06 except the quoted sentences;
- R8-07 and R8-08;
- C17 v5 except items 3 and the pointer sentence, as amended;
- R8-09 except `:9246-9248`, including the tightened R6-05 and R6-08 (2)
  rules and the sentence at `:9250-9252`;
- R8-10 and R8-11;
- R8-12 except the three quoted pieces;
- R8-13 (the detail-pages invalidate stands and gains the R9-02 event-key
  clear on the subscription path only);
- the Round-8 Security, Handoffs and Envelope records except the quoted
  sentences.

### Security Contract rows (Round 9)

No route, schema, auth, RBAC, CSRF or rate-limit change. Endpoint visibility,
the auth model and rate-limit buckets stay as in Rounds 2-8.

- **No stale page served as fresh (extended; replaces the sentence quoted as
  item 21).** "A posts first page installed by any path other than a current
  `page` completion is never served on the network path (R8-02), and no patch
  creates a servable first-page slot where none existed (R9-01)." The rest of
  the Round-8 row stands. A posts detail upsert after the list TTL may still
  synthesize the TASK-554 default slot. The TASK-554 `listPostsCached` readers
  see it exactly as at HEAD (`postsClient.ts:250`), and (1b) keeps it off the
  `readPostsListPage` network path.
- **Detail pages.** A foreign event of a per-content-type key clears that
  key's persisted slot even when this tab never created its cache (R9-02).
  The clear applies only to keys that pass the family predicate
  (`event.key.startsWith(cacheKeys.detailPagesList)`). It removes exactly one
  Storage key and never enumerates Storage.
- **Media view.** Storage rows written under an invalidated slot are never
  applied as fresh. The event costs one forced background read (R9-03),
  within the Round-8 per-event bound (paged ≤ 2 forced reads per event).
- **TASK-554 authority isolation.** Unchanged. (1b) deletes only
  `postFirstPageEpochs` entries, which are 03-L02 list state that no TASK-554
  path reads. The synthesis and the tombstone, publication and
  authority-epoch paths are untouched (`postsClient.ts:506`, `:522`, `:534`,
  `:707`).
- **Evidence.** The INITIAL capture runs once, at the INITIAL
  `preWaveCommit`, after the declared dependencies land (R9-04). Receipts
  keep commit ids, paths and digests only.
- **Test fixtures.** R9-09 changes wording only. The marker-scoped deletes and
  the bounded blackout precondition read (`.limit(1)`, no foreign delete)
  stand.

### Handoffs (Round 9)

- **TASK-554.** Unchanged: no file edit and no re-open. (1b) touches only
  `postFirstPageEpochs`, which no TASK-554 path reads. The C9 v2 synthesis
  that TASK-554's precondition requires stays. `postsClientCacheAuthority.test.ts`
  keeps only the D2 edits (R8-01). T6 (d) and T16 live in
  `task551PaginatedClients.test.ts`.
- **TASK-551-10-L02.** Owed through C17 v5 as amended by "C17 v5 amendments
  (Round 9)", in 10-L02's next append-only section.
- **TASK-551-09-L04 (owed mirror; another writer's file).** "Its next
  append-only section records the R7-02/R8-04 consumer constraints
  (synchronous local delivery, operation-token pass-through, own-sourceId
  drop; `mediaFoldersClient.ts` emissions `:236/:251/:268` `mediaFolders`
  only, `:280-281` both keys) and adds
  `tests/vitest/admin/task551PaginatedClients.test.ts` (T14/T14b) to its FINAL
  gate." (R9-10.)
- **TASK-551-11.** Nothing owed. Round 9 adds no gate argv, no `./` site and
  no evidence path under the 11 closed root.
- **TASK-551-01-L01.** Unchanged. Round 9 adds no server statement.
- **Orchestrator.**
  - (a) INITIAL capture blocked by dependencies. INITIAL W0 and its capture
    are blocked by `TASK-551-09-L04:initial` (fence `:2162`) and the header
    Dependencies (`:9-11`) (R9-04). The W0 receipt re-runs the three R8-09
    commands at the INITIAL `preWaveCommit`.
  - (b) Queue the 09-L04 mirror writer (R9-10).
  - (c) The R8-13 relocation follow-up now covers
    `03-l02-round9-dispositions.md` too (N = 9). That record is untracked at
    `74fe8f4e`. Until it is committed or moved, R4-10 gloss 2 (`:6423`)
    classifies it at W0 like the others.
  - (d) The restated `owned-module-consumers-bun` precondition (R8-10) and
    the R6-06 stop rule (size below).
  - (e) R9-13 corrections for future mandates: `core/admin/services/cachePolicy.ts`;
    audited HEAD `74fe8f4e`.

### Envelope record (Round 9)

No edit: the fence (`:1441-2172`) stays byte-identical. It has allowlist 321,
forbidden 52, commands 34, and occurrences `initial` (30 command ids,
`dependsOn` `TASK-551-09-L04:initial`) and `final` (11). Every path this
round names was checked on 2026-09-26 at `74fe8f4e` (a parse of the fence;
line numbers are file lines).

- **Allowlisted** (no new entry):
  - `core/admin/services/pagesClient.ts` (`:1480`),
    `detailPagesClient.ts` (`:1481`), `entriesClient.ts` (`:1482`),
    `postsClient.ts` (`:1483`), `formsClient.ts` (`:1485`),
    `mediaClient.ts` (`:1486`) and `bookingClient.ts` (`:1487`);
  - `adminListEnvelope.ts` (`:1541`) and `entriesClientPagination.ts`
    (`:1542`);
  - `core/admin/ui/media/MediaLibraryPage.tsx` (`:1510`),
    `MediaLibraryResults.tsx` (`:1512`) and `useMediaFolderOperations.ts`
    (`:1553`);
  - `core/services/booking/bookingMutationService.ts` (`:1458`) and
    `bookingService.ts` (`:1460`);
  - `tests/integration/server/task551AdminWriteConcurrency.test.ts`
    (`:1570`);
  - `tests/vitest/admin/task551PaginatedClients.test.ts` (`:1571`; argv
    `:1919`, `:1996`);
  - `tests/vitest/ui/media-library.test.tsx` (`:1613`; argv `:1919`);
  - `tests/vitest/ui/media-library-load-retry-wave.test.tsx` (`:1615`);
  - `tests/vitest/ui/media-library-mutation-retry-wave.test.tsx` (`:1616`;
    cited read-only);
  - `tests/vitest/admin/postsClientCacheAuthority.test.ts` (`:1640`;
    unchanged by Round 9).
- **Forbidden and consumed only:** `core/admin/services/cachePolicy.ts`
  (`:1773`), `core/admin/utils/adminCacheAuthority.ts` (`:1774`),
  `core/admin/services/mediaFoldersClient.ts` (`:1808`) and
  `core/admin/utils/cacheBus.ts` (`:1823`).
- **Outside the envelope (read-only anchors; none is in the fence):**
  - `core/admin/utils/storageCache.ts`;
  - `tests/integration/server/task551RevisionConcurrency.test.ts`;
  - the task files of TASK-551-09-L04, TASK-551-10-L02 and TASK-551-11;
  - `_docs/_workflows/_smoke/task-551/impl-11-reopen-20260925.json`;
  - the `03-l02-baselines/` path;
  - the dispositions records, including `03-l02-round9-dispositions.md`
    (orchestrator evidence).

No NEW allowlisted path is needed. One JSON fence. **Size (R6-06 stop rule).**
This file is 750,900 bytes after the Round-9 append (`wc -c`), below the
1,048,576-byte cap with the 200-byte closure headroom.

## Dated Contract Corrections — 2026-09-26 (Round 10: C17 v6, media view revalidate-only, entries own-mutation path, T16 setups, absent-slot pins, blackouts reset, W0 landing checks, slots suite; append-only)

Source:
`_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round10-dispositions.md`
(R10-01..R10-16 over the Round-9 auditors S1, S2-A, S2-B, S3-A and S3-B of
workflow `wf_4844ed38-c42`; audited HEAD
`c237e05de2965eedc624961553bff0664c7811c4`, with Round 9 committed) and the
orchestrator decisions H7 and H8 of Addendum H in
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`.
This section applies R10-01..R10-16 and re-decides nothing. **This section
wins** over every earlier part where they differ. It makes exactly ONE
in-place edit: the R10-09 fence amendment (one allowlist line and one
command; the second command R10-09 names is held by the argv cap, see R10-09
and "Envelope record (Round 10)"). "Validation Commands" and every
other earlier line stay byte-identical.

**Line numbers.** Every bare `:NNNN` anchor in this section is a line of this
file at `c237e05d`, that is, before the R10-09 fence edit, so it matches the
dispositions record and the auditors' evidence. The fence edit inserts one
line after `:1571`. In the file as it stands after this round, every line
from `:1572` on (the rest of the fence, every later section and this one)
sits one line later: add 1 to any anchor ≥ `:1572`, here and in every earlier
section. Anchors ≤ `:1571` do not move. Code and test anchors (`*.ts`,
`*.tsx`) were re-read on 2026-09-26 at `c237e05d`; the symbol stays
authoritative wherever a line drifts. Every sentence this round supersedes is
quoted verbatim under "Superseded sentences (Round 10)" (text authoritative;
a hard line wrap inside a quote is rendered as one space). Everything not
quoted there stays binding.

### R10-01 — C17 v6 is 10-L02's copy authority (MEDIUM; S3-A, S3-B, S1)

The Round-9 subsection "C17 v5 amendments (Round 9)" (`:10277-10308`) has no
date and is not a `C17 v` version, while 10-L02 copies only from the highest
dated `C17 v` heading
(`TASK-551-10-L02-Documentation-Runbooks-And-Family-Closure.md:1628-1633`;
R8-08 `:9159`). A closure writer following that rule literally would copy the
old C17 v5 item 3 and miss item 6. The dated heading `### C17 v6` below
restates C17 v5 (`:9166-9212`) with item 3 as amended by Round 9, item 6
(Round 9, with (c) as amended by R10-03), a new item 7 (Round 10: the R10-03
to R10-08 behaviours), the 09-L04 owed mirror (R10-13) and the TASK-554 and
orchestrator pointers. The R8-08 rule is unchanged: C17 v6 is now the highest
dated `C17 v` heading, so it is the copy authority. The Round-9 subsection is
quoted as superseded ("folded into C17 v6", quote 1). No 10-L02 rule change
is owed (R10-11).

### C17 v6 — Handoffs and owed mirrors (2026-09-26; Rounds 5-10)

C17 v4 (`:6561-6583`) stands except where quoted under the Round-5..10
superseded lists. This heading replaces C17 v5 (`:9166-9212`) and the
Round-9 "C17 v5 amendments (Round 9)" (`:10277-10308`) as 10-L02's copy
authority (`TASK-551-10-L02…md:1628-1633`; R8-08 `:9159`, unchanged). The
closure writer greps 03-L02 for every `C17 v` heading, copies from this one
(the highest dated), and applies C17 v4 bullets only where this heading
leaves them standing. It consolidates the owed 10-L02 items of Rounds 5-10
(`:6970-6976`, `:7700-7705`, `:8670-8681`, C17 v5, Round 9, Round 10).

**TASK-551-10-L02 (owed mirror; another writer's file).** The `ADMIN_CACHE` /
`ADMIN_CACHE_MAP` delta, plus the notes C17 v4 already routes to `CMS_API` and
the booking docs:

1. **C17 v4** (`:6563-6569`): the Round-3 mirror and the Round-4 additions
   stand as written.
2. **Round 5:** nothing further. The R5-03 mirror is already in 10-L02's own
   "Amendment (2026-09-25): Round-4/5 items" (`TASK-551-10-L02…md:1603`;
   `:6972-6974`).
3. **Round 6:** the two-counter model per paged client (`invalidationEpoch`,
   advanced by the invalidate and by an own emission (item 5 (b)), vs
   `resetGeneration`, advanced only by the registered reset); the lazy family
   subscriptions with the R6-01 predicates as amended (R7-12 detail-pages row,
   R8-04 media predicate); the new export `clearAdminUsersCache` (memory-only,
   no Storage); `clearFormsCache` covering form submissions; the
   `readPostsListPage` / `listPostsCached` split.
4. **Round 7:** the posts list-only `postsInvalidationEpoch`, kept separate
   from the TASK-554 `postsCacheAuthorityEpoch`, and the inverted direction
   (`readPostsListPage` calls `listPostsCached(filters, { force: true })`);
   own-emission handling through `createAdminListSelfEmitGuard` (in its
   Round-8 form, item 5 (b)); detail pages as the eighth paged client; F-40
   subsumed by the single media subscription; the per-mode fetch bound (paged
   ≤ 2 forced reads per event; append ≤ 2 × depth per storm window).
5. **Round 8:** (a) the posts first-page marker `postFirstPageEpochs`: set
   only by a current `page` completion of `readPostsListPage`, dropped by
   every `primePostsFirstPage` install and by superseded or overtaken
   first-page completions (R8-02); (b) an own emission runs the invalidate
   minus the persisted-slot clear: epoch +1 and dedupe cleared, the patched
   slot kept, memory stale for network reads (R8-03); (c) the media
   subscription predicate `mediaList` or `mediaFolders`, and the media library
   results view revalidates on `mediaFolders` (R8-04); (d) a superseded append
   chain re-issues once at its own depth, so a folded `loadMore` page survives
   repeated supersedes (R8-05); (e) the detail-pages invalidate clears every
   persisted slot in `listCacheByKey` (R8-13).
6. **Round 9:**
   - (a) Posts `upsertCachedPost` and `removeCachedPost` slot writes drop the
     default first-page marker. Every other slot-bearing client never patches
     a `null` persisted slot into existence; it patches memory only (R9-01).
   - (b) The detail-pages subscription also clears the triggering event key,
     through its cache or `clearLocalCache` (R9-02).
   - (c) Media library: the results view never applies Storage rows on a
     cache event; every `mediaList` and `mediaFolders` event forces one read
     (R9-03 as amended by R10-03; item 7 (a)).
   - (d) Form submissions and custom-screen entries are memory-only list
     families with no persisted slot (R9-06).
7. **Round 10:**
   - (a) Media library results view on `useBoundedAdminList`: every
     `mediaList` and every `mediaFolders` event dispatches the hook's
     `revalidate()`; there is no Storage-apply path
     (`applyCachedMediaRows()` is retired with the leaf). Storage rows written
     under an invalidated slot are never applied as fresh, whatever order
     cacheBus runs the client's and the view's handlers in (R10-03).
   - (b) Entries own mutations no longer call the public
     `clearAllEntriesCache()`: they run the guarded emit plus an explicit
     `entriesAllList` slot clear. The public `clearEntriesCache(typeSlug)` and
     `clearAllEntriesCache()` stay full entries invalidates (R10-04).
   - (c) A patch writes a persisted first-page slot only when its items
     change (HEAD's changed-only guard, pages template); a no-op patch writes
     nothing and never refreshes `savedAt` (R10-02).
   - (d) Booking blackouts create and delete RESET the exact filtered
     blackouts family (slot cleared, memory stale, one forced read by the
     view); resources, services and reservations patch an existing versioned
     slot as at HEAD (R10-06).
   - (e) Closure-record notes with no `ADMIN_CACHE` delta: the entries
     absent-slot pins change by name (R10-05); W0 readiness is decided by
     landing checks, never by `**Status:**` lines (R10-07); the Round-10
     wording corrections (R10-08); `task551PaginatedClientsSlots.test.ts`
     hosts T6 (d), T14, T14b and T16 (R10-09).

**TASK-551-09-L04 (owed mirror; another writer's file).** The executable spec
R10-13 below: the consumer constraints; the in-place `final-admin-cache-tests`
fence edit that adds both paginated-client suites; `TASK-551-03-L02:initial`
in 09-L04's FINAL `dependsOn`; both files run whole. The cacheBus
handler-order item is NOT owed to 09-L04: R10-03 makes the media fail-closed
guarantee independent of handler order (H7).

**TASK-551-11.** Nothing owed. C17 v4 `:6570-6573` is superseded (quoted
under Round 8; R8-11). The split edits named at `:6573-6577` landed in the
completed re-open (R8-11 table). **Query inventory (01-L01).** C17 v4
`:6577-6583` stands; Rounds 5-10 add no server statement. **TASK-554 and the
orchestrator:** "Handoffs (Round 10)" below.

### R10-02 — T16 setups; the pages template keeps HEAD's changed-only guard (MEDIUM; S2-A, S2-B)

**Finding (verified).** List memory pages have no time TTL. The network-path
hit check reads memory before the slot (R6-01 `:7093-7094`), and a numeric
epoch hits only when `fetchedAtEpoch === epoch` (`:7164`). Only the
Storage-backed slot expires (`core/admin/utils/storageCache.ts:130-131`). The
forms detail read `getFormDetailCached` (`formsClient.ts:303-309`) reaches
`upsertCachedFormDetail` (`:240-244`) and `upsertCachedFormSummary`
(`:227-238`) and broadcasts nothing, so no epoch moves. A T16 cell that
starts "read and then expired" on such a path keeps an epoch-fresh default
memory page, and the next non-forced read is served from memory with 0 list
GETs instead of the pinned "exactly one". Separately, the Round-9 pages
template writes the slot on every patch, which drops HEAD's changed-only
guard (`pagesClient.ts:172-177`) and lets a no-op patch refresh `savedAt`
(`storageCache.ts:153-155`).

**T16 setup rules** (replace the setup sentence quoted as quote 3; the cell
list at `:9971-9980` stands except the `entriesAllList` cell restated below).

- **Emission cells.** The mutation broadcasts an own predicate key through
  `<client>SelfEmit.emit`, whose `onOwnEmit` advances the client's
  `invalidationEpoch` (R8-03, R9-05). Such a case may start either "never
  read" (the registered reset, no Storage seed) or "read and then expired"
  (`vi.setSystemTime(Date.now() + cacheTtlMs.list + 1)`). The named emission
  cells: pages `updatePage`; entries-type through an own mutation that reaches
  `mergeSummaryIntoCurrentList` (`entriesClient.ts:315-331`, for example
  `updateEntry`); the `entriesAllList` cell (below); forms `updateForm`; media
  `updateMedia`; booking resources, services and reservations through their
  create mutations; blackouts through `createBookingBlackout` (now a reset,
  R10-06); detail pages through an update that reaches
  `upsertCachedDetailPage`, for both key shapes.
- **No-emission cells.** A read that patches without broadcasting: the forms
  detail read (`getFormDetailCached` → `upsertCachedFormDetail`,
  `formsClient.ts:303-309`), and any other detail-read cell a writer adds (at
  HEAD: `getPageCached` `pagesClient.ts:300-306`, `getEntryCached` through
  `entriesClient.ts:658`, `getDetailPageCached` `detailPagesClient.ts:262-268`).
  Such a case starts "never read", or directly after the registered reset
  (`advanceAdminCacheInstallationAuthority()`). It never starts "read and then
  expired".
- **Assertions per cell** (every cell): (1) no `setItem` call for the family
  list key; a `Storage` `setItem` spy (or the stub's `setItem` log) is
  filtered by key, and `removeItem` is not counted, because reading an expired
  slot removes it (`storageCache.ts:65-67`); (2) `getCached*()` for the
  default filters returns `null`; (3) the next non-forced default first-page
  read issues exactly one list GET.
- **`entriesAllList` cell** (kept; restated). It runs an own entries mutation
  (for example `updateEntry`). HEAD `mergeSummaryIntoCurrentList` never writes
  `entriesAllList`; it writes only `entriesList(typeSlug)`
  (`primeEntriesCacheInternal`, `entriesClient.ts:212-215`, called at `:330`).
  The path this cell exercises is the R10-04 own-mutation all-list slot clear,
  a `removeItem`. It pins: no `setItem` for `cacheKeys.entriesAllList`; the
  all-list `getCached*()` accessor for the default filters (HEAD
  `getCachedAllEntries`) returns `null`; the next non-forced default all-list
  first-page read issues exactly one list GET.
- Posts n/a (the TASK-554 synthesis; T6 (d)); users n/a (no slot, R3-18). The
  R8-07 patched-slot pins still cover the "slot present" half. T16 lives in
  `tests/vitest/admin/task551PaginatedClientsSlots.test.ts` (R10-09).

**Pages template (restated; replaces the template line quoted as quote 4).**
HEAD's guard in `mergeCachedPageIntoList` writes only when the patched array
differs from the stored one (`pagesClient.ts:172-177`: a length change or any
element whose reference differs). The template keeps exactly that guard, so a
patch that returns the stored rows writes nothing and never refreshes
`savedAt`.

```ts
// core/admin/services/pagesClient.ts (R10-02; replaces the R9-01 patchPagesFirstPageSlot body; the rest of the R9-01 block stands)
function patchPagesFirstPageSlot(patch: (items: readonly PageListItem[]) => readonly PageListItem[]): void {
  const stored = pagesFirstPage.read();                            // PersistedFirstPage | null (missing, expired, legacy => null)
  if (stored === null) return;                                     // R9-01: a null slot installs NOTHING
  const next = patch(stored.items);
  const changed = next.length !== stored.items.length
    || next.some((item, index) => item !== stored.items[index]);   // HEAD :172-175 guard, reference-based
  if (!changed) return;                                            // no-op patch: no write, savedAt untouched
  pagesFirstPage.write({ ...stored, items: next });                // v, filters, nextCursor, hasMore kept
}
// Every patch helper returns the stored element references for rows it does not touch (HEAD `[...current]`, :164).
// So the no-op cases are exactly HEAD's: an author-less row that is not in the page (HEAD :165-168), a status patch
// or remove whose id is absent. A merge into an existing row builds a new object and writes, as at HEAD.
// Entries (per slug), forms, booking resources/services/reservations, media and detail pages (each key)
// follow the same shape; the `stored === null` early return and the changed-only guard are both binding.
```

### R10-03 — Media results view: every event revalidates; no Storage apply (MEDIUM; S2-A, S2-B; k4)

**Finding (verified).** R9-03 steps 1-3 and the Round-9 "Media view" security
row rest on HEAD view code this leaf replaces: `listMediaCached` in the mount
`refresh` effect (`MediaLibraryPage.tsx:356-358`) and the `update`
short-circuit through `applyCachedMediaRows()` (`:347-354`, `:363`). After
the leaf the results run on `useBoundedAdminList` in `append` mode
(`:6204`), whose API (`:5411-5414`) has no row-apply entry point, and earlier
rounds already say every view subscription calls `revalidate()`
(`:5421-5422`; `:7996-7998`). R8-04 left the `mediaList` branch to an
"owning-section behaviour" (`:9005-9006`) that no section defined. If a
Storage-apply short-circuit survived, the fail-closed guarantee would rest on
handler registration order. The media-library view pins also ignored R5 H1
(k4): a hydrated start is followed by one forced read (`:6833`, `:7156`).

**Decision (R10-03).** The results view has NO Storage-apply short-circuit.
Every `mediaList` event and every `mediaFolders` event, of any action, own or
foreign, dispatches the hook's `revalidate()`. `applyCachedMediaRows()` and
its `setItems` path (HEAD `MediaLibraryPage.tsx:347-354`, called from the
subscription at `:360-366`) are retired with the leaf. The guarantee "Storage
rows written under an invalidated slot are never applied as fresh" is
order-independent: the client's subscription clears the slot, and the view's
`revalidate()` forces one read that never reads Storage.

```tsx
// core/admin/ui/media/MediaLibraryPage.tsx, or whichever allowlisted module holds the results subscription after
// the C11 split (MediaLibraryResults.tsx, useMediaFolderOperations.ts); R10-03 replaces HEAD :347-366 for the results
const results = useBoundedAdminList(fetchMediaPage, initialFilters, { hydrate: hydrateMediaPage }); // `append` mode (:6204)
const revalidateResults = results.revalidate;          // kept referentially stable (writer's mechanism, React Hooks rules)
useEffect(() => subscribeCacheEvents((event) => {
  if (event.key !== cacheKeys.mediaList && event.key !== cacheKeys.mediaFolders) return; // the R8-04 predicate
  revalidateResults();                                 // every event, every action: one forced read; never a Storage read
}), [revalidateResults]);
// Retired with the leaf: applyCachedMediaRows() (HEAD :347-354), the `update` short-circuit (:363), the refresh()
// mount effect (:356-358). No results code reads getCachedMediaForEvent() or Storage on an event. The export
// getCachedMediaForEvent (mediaClient.ts:142) and its client pins (mediaClient.test.ts:410-456) are untouched.
// The folder-rail subscription (:529-540, mediaFolders → reconcileFolderCacheEvent) is unchanged.
```

**R9-03 steps 1-3, re-anchored** (replace the steps quoted as quote 6):

1. The media client's lazy subscription is registered synchronously inside
   the first media page read the view issues, which after the leaf is the
   hook's `fetchPage` call in its pending effect (`:5405-5410`): the forced
   H1 read after a hydrated start, or the non-forced first read otherwise.
2. cacheBus still delivers local handlers synchronously in insertion order
   (`core/admin/utils/cacheBus.ts:151-153`, `:157`), but no rule relies on
   that order any more.
3. Client handler first: `invalidateMediaList` clears the slot in memory and
   in Storage, then the view's handler dispatches `revalidate()`, and the
   hook issues one forced read. View handler first: `revalidate()` is
   dispatched, the hook's effect issues the forced read after the synchronous
   handler loop has finished (so after the client's invalidate), and the read
   never consults Storage. Either way the rendered rows come only from a
   network page. When a view-issued read was already in flight across the
   client's invalidate, it resolves `superseded` and one re-read follows (the
   T7 view-first shape), within the Round-8 per-mode bound.

The handler-order pin and its STOP rule (quote 9) are withdrawn. The
R8-03/R8-04 STOP-and-report rule stays in force for every other pin
(`:10088-10089`).

**Named intended contract changes** (both in `tests/vitest/ui/media-library.test.tsx`,
allowlisted `:1613`; the C9 v2 wire-form adaptation of the fetch stub and of
the `writeMediaCache` seed, `mediaLibraryTestUtils.tsx` `:1614`, stays the
owning-section adaptation of R8-07):

- **(i) `:242-273`** ("MediaLibraryPage applies media update events from
  storage without fetching media"; replaces the assertions quoted as quote 7).
  Retitle it (for example "MediaLibraryPage revalidates on a media update
  event and never applies storage rows"). The `/media` stub returns DISTINCT
  rows for the mount read ("Network mount") and for the post-broadcast read
  ("Network update"). Steps: mount with the seeded slot ("Before update") and
  flush; take `c0` = the number of `"/admin/api/media"` calls after the mount
  flush and before the broadcast (`c0` = 1 under H1); write the "Storage
  update" slot; broadcast `{ key: cacheKeys.mediaList, action: "update" }`
  inside `React.act`; assert "Storage update" is not rendered; flush; assert
  the call count is exactly `c0 + 1` (cumulative 2); assert the rendered rows
  equal the second fetched page ("Network update" rendered, "Network mount"
  gone); assert again that "Storage update" is not rendered. The "Storage
  update never rendered" assertion is mandatory at both points.
- **(ii) `:214-240`** ("MediaLibraryPage route entry reuses fresh media cache
  without fetching media"; k4). Hydrated start under H1 (`:6833`, `:7156`).
  Retitle it (for example "MediaLibraryPage route entry renders the fresh
  media cache at once, then revalidates once"). The `/media` stub returns a
  deferred promise. Assert "Cached hero" renders before the deferred resolves;
  assert exactly 1 `"/admin/api/media"` call (the forced read; a non-forced
  read would have been served by the fresh slot); resolve the deferred with
  "Network hero", flush, and assert the rendered rows equal "Network hero"
  ("Cached hero" gone). "Every other assertion in the file stands" (quote 8)
  is withdrawn for `:234-235` only; it stands for every other assertion.

**R9-03 (a) enumeration (restated; replaces quote 10).** The folder-event
tests' `mediaFolders` broadcasts are at
`media-library-load-retry-wave.test.tsx:203` and
`media-library-mutation-retry-wave.test.tsx:557`, `:613`, `:654`, `:830` and
`:926`. `:926` counts no media list GET: its `retryCalls` records only
`"POST reorder"` and `"GET folders"` (`:939`). The conclusion of R9-03 (a)
stands: no existing folder-event test counts media list GETs, the R8-04 view
test is additive, and every folder GET count stays unchanged.

### R10-04 — Entries own mutations do not call the public all-list clear (MEDIUM; S2-B)

**Finding (verified).** At HEAD every entries mutation calls
`broadcastAllEntriesListEvent` (`entriesClient.ts:559-562`; call sites
`:682`, `:705`, `:731`, `:753`, `:783`, `:801`, `:819`, `:882`), which calls
the public `clearAllEntriesCache()` (`:553-557`). Under R6-01 that public
clear is the HEAD body plus the full entries invalidate ("all three for
either call", `:7178`), so every own entries mutation would clear the
`entriesList(slug)` slot it has just patched, which defeats R8-03 for
entries.

**Decision (a).** C11's entries mutation path stops calling the public
`clearAllEntriesCache()`. It runs the guarded emit (`entriesSelfEmit.emit` →
`onOwnEmit`: `entriesInvalidationEpoch` +1, entries dedupe maps cleared) plus
an explicit `entriesAllList` slot clear (the HEAD semantics for the all-list:
`cachedAllEntries = null` and `clearLocalCache(cacheKeys.entriesAllList)`),
and it broadcasts `entriesAllList` and the type key as at HEAD.

```ts
// core/admin/services/entriesClient.ts (R10-04; replaces the HEAD body of broadcastAllEntriesListEvent, :559-562)
const clearEntriesAllListSlot = (): void => {             // HEAD clearAllEntriesCache body (:554-556) WITHOUT the invalidate
  cachedAllEntries = null;                                // the all-list default page in memory (HEAD field; C11 may move it)
  cachedAllEntriesPromise = null;                         // HEAD field, where it survives the C11 split
  clearLocalCache(cacheKeys.entriesAllList);              // the persisted all-list slot: a removeItem, never a setItem
};
const broadcastAllEntriesListEvent = (action: "invalidate" | "update"): void => {
  clearEntriesAllListSlot();                              // the own mutation's local effect (R7-02 precondition of the ignore)
  entriesSelfEmit.emit({ key: cacheKeys.entriesAllList, action }); // onOwnEmit: epoch +1, dedupe cleared; the subscription skips it
};
export const clearAllEntriesCache = (): void => {         // PUBLIC clear, unchanged in effect (R6-01 :7178): HEAD body + the invalidate
  clearEntriesAllListSlot();
  invalidateEntriesLists();                               // all three families, slots included; the name is the writer's (R8-13 import)
};

// Every entries mutation (createEntry :668, updateEntry, updateEntryMetadata, duplicateEntry, publishEntry,
// unpublishEntry, deleteEntry :810, restoreEntryRevision) keeps its HEAD order:
//   publishSuccessful…(typeSlug, …);                                      // patches entriesList(typeSlug) (R9-01, R10-02 rules)
//   entriesSelfEmit.emit({ key: cacheKeys.entriesList(typeSlug), action }); // own emission of the type key (R7-02)
//   broadcastAllEntriesListEvent(action);                                   // the body above; never clearAllEntriesCache()
//   broadcastCacheEvent({ key: cacheKeys.entryDetail(typeSlug, id), action }); // detail key stays bare (R7-02)
// No entries mutation path calls clearEntriesCache(typeSlug) or clearAllEntriesCache().
```

- **R6-01 `:7178` scope (stands; quoted for scope, not superseded).** The
  entries row's "Families invalidated" cell, "entries-type,
  custom-screen-entries, entries-all (all three for either call)", is
  unchanged for the PUBLIC clears: `clearEntriesCache(typeSlug)` and
  `clearAllEntriesCache()` stay full entries invalidates, including their
  external callers (`core/admin/services/assistantClient.ts:315`, `:317`).
  Added sentence: the entries mutation path no longer calls either public
  clear.
- **R8-03 entries cell (restated; replaces the R9-06 restatement quoted as
  quote 11).** The entries row's "Kept by an own emission" cell reads: "the
  `entriesList(slug)` slot (patched as at HEAD); the `entriesAllList` slot is
  cleared by the own mutation (HEAD `clearLocalCache`); custom-screen entries
  memory-only".
- **T8, entries all-list case.** After an own entries mutation the all-list
  slot is cleared (no patch), and the next non-forced default all-list
  first-page read issues exactly one list GET. An all-list read in flight
  across the mutation resolves `superseded` and installs nothing. The
  entries-type case keeps the R8-03 T8 wording (the patched `entriesList(slug)`
  slot stays).
- The R9-11 guard placement stands (R10-14): `entriesSelfEmit` is created in
  `entriesClientPagination.ts` and imported one way by `entriesClient.ts`.

### R10-05 — Entries absent-slot pins: named intended contract change (MEDIUM; S2-B)

R9-01 retires the HEAD `?? []` synthesis for entries
(`entriesClient.ts:321`), and two existing pins read a type slot that the
patch used to create from nothing. They are named here as intended contract
changes under R9-01, so R8-07's "Each keeps its assertion values and event
counts" (quote 12) does not bind them:

- **`tests/vitest/admin/entriesClient.test.ts:482-506`** ("duplicateEntry uses
  CSRF and primes list/detail caches"; allowlisted `:1639`). Only
  `entriesAllList` is seeded (`:495-498`). `:506`
  `expect(getCachedEntries("blog")?.[0]?.id).toBe("entry-copy")` becomes: the
  `"blog"` default slot is `null` after `duplicateEntry` (the accessor for the
  default filters returns `null`), and the next non-forced default first-page
  read of `"blog"` issues exactly one list GET. `:507`
  (`getCachedAllEntries()` is `null`) stands; R10-04 keeps it true. Every
  CSRF, URL, method and body assertion (`:501-505`) stands.
- **`tests/vitest/admin/entriesClientMutationReconciliation.test.ts:88-90`**
  (allowlisted `:1637`). The `absent` branch: after `operation.run`, the
  accessor for `typeSlug` returns `null`, replacing `:88` (title) and `:90`
  (`toHaveLength(1)`) for that branch. The `present` branch (`:88`, `:89`) is
  unchanged. The later assertions after the stale read settles (`:97-104`)
  are not absent-slot pins: HEAD `reconcileEntryList`
  (`entriesClient.ts:396-424`) builds from the server rows plus the settled
  authority. If one of them fails only because no slot was synthesized, the
  implementer STOPs and reports (the R8-03/R8-04 rule); it does not
  re-baseline.

**Grep result (no further pins).** Pages, forms, booking and detail-pages
vitest suites were searched at `c237e05d` for absent-slot patch outcomes (an
unseeded list slot that a patch fills, then a non-null `getCached*`, a list
Storage read or a zero-GET list read): `grep` over `tests/vitest` for
`getCachedPages()`, `getCachedForms()`, `getCachedBooking*()`,
`getCachedDetailPages(` and the `cacheKeys.{pagesList,formsList,booking*List,detailPagesList*}`
keys, and a per-test scan of the entries suites. The only other hits already
assert `null` or seed the slot first, so they stay green unmodified:
`pagesClient.test.ts:680` and `:694` (a forced author-less detail read keeps
the list `null`, HEAD `pagesClient.ts:165-168`), `:841` and `:855` (cleared after an
invalidating mutation); `formsClient.test.ts:444` (export, `null`);
`bookingClient.test.ts:118` (seeded); `detailPagesClient.test.ts:237-311`
(both slots seeded at `:266-267`); in `entriesClientMutationReconciliation.test.ts`,
`:165` and `:232` already assert `null` for the absent case (HEAD status and
delete patches are guarded), and `:361-403` asserts only after the older read
reconciles (the target is in the server rows). View suites under
`tests/vitest/ui` mock these clients or never read a list slot after a patch.

### R10-06 — Blackouts create and delete reset; the per-family rule (MEDIUM; S2-B; LOW S2-A)

**Finding (verified).** R9-01 says an existing versioned slot is patched as
at HEAD, "including a prepend on create where HEAD prepends", and claims the
blackouts row "already agrees". HEAD `createBookingBlackout` prepends
(`bookingClient.ts:579-580`, `primeBlackoutsCache([created, ...current])`),
while the blackouts contract row (`:434`) says "create/delete reset the exact
filtered family, never synthesize a full list". With "This section wins", the
Round-9 text would have turned the blackouts create into a prepend-patch into
a `starts_at DESC` page.

**Rule.** The `:434` row governs blackouts. The R9-01 clause "patched as at
HEAD, including a prepend on create where HEAD prepends" (quote 13)
applies only to families whose contract row does not say reset. (The dispositions record
cites the booking rows as `:431-434`; at `c237e05d` they are reservations
`:429`, resources `:430`, services `:431` and blackouts `:434`; `:432-433`
are the service-resources and schedules rows, which hold no persisted list
slot.)

| Family (row) | Order | Create | Update | Delete |
|---|---|---|---|---|
| reservations (`:429`) | `starts_at DESC,id DESC` | existing slot patched as at HEAD, including HEAD's prepend (`upsertReservation`, `bookingClient.ts:274-281`); `null` slot: nothing (R9-01) | merge as at HEAD (`updateBookingReservationStatus` → `upsertReservation`) | none at HEAD |
| resources (`:430`) | `name ASC,id ASC` | as reservations (`upsertResource`, `:256-263`) | merge as at HEAD | remove as at HEAD (`removeResource`, `:283-287`, guarded) |
| services (`:431`) | `name ASC,id ASC` | as reservations (`upsertService`, `:265-272`) | merge as at HEAD | remove as at HEAD (`removeService`, `:289-293`, guarded) |
| blackouts (`:434`) | `starts_at DESC,id DESC` | RESET (below); never a prepend-patch | n/a (no update at HEAD) | RESET (below); never a filter-patch |

- **Ordering note (HEAD parity).** A row prepended into a reservations,
  resources or services first page can sit out of its row order until the
  view's own-mutation revalidate lands (a view subscription dispatches
  `revalidate()` for every event, own or foreign, `:7996-7998`). HEAD
  prepends into the same unordered array.
- **Blackouts reset** = the persisted blackouts slot cleared, every blackouts
  memory page stale (the own emission advances
  `bookingListsInvalidationEpoch`), and one forced read by the view (its
  own-mutation `revalidate()`).

```ts
// core/admin/services/bookingClient.ts (R10-06; retires HEAD :579-580 and :593-594)
const resetBlackoutsList = (): void => {                   // the :434 reset of the exact filtered family
  blackoutsFirstPage.clear();                              // the persisted default slot and its memory copy; helper names are the writer's
};
export async function createBookingBlackout(input: BookingBlackoutInput) {
  const created = await apiRequest<BookingBlackoutRecord>(/* HEAD :569-577 request, unchanged */);
  if (created) {
    resetBlackoutsList();                                  // never `[created, ...current]`
    bookingSelfEmit.emit({ key: cacheKeys.bookingBlackoutsList, action: "update" }); // onOwnEmit: epoch +1, dedupe cleared
  }
  return created;
}
// deleteBookingBlackout (HEAD :586-598): on `result?.ok`, resetBlackoutsList() then
// bookingSelfEmit.emit({ key: cacheKeys.bookingBlackoutsList, action: "invalidate" }); no filter-patch of the stored page.
```

- **R8-03 booking cell (restated; replaces quote 15).** The booking row's
  "Kept by an own emission" cell reads: "each family slot, except the
  blackouts slot, which a blackouts create or delete clears (the `:434`
  reset, R10-06); the week cache (R3-07) untouched".
- **T8, blackouts case.** After `createBookingBlackout` or
  `deleteBookingBlackout`, the blackouts accessor for the default filters
  returns `null`, and the next non-forced default first-page read issues
  exactly one list GET. The T8 cells of the other three booking families keep
  the R8-03 wording.
- **T16 blackouts cell** stands: with a `null` slot the reset writes nothing.
- The "already agrees" sentence (quote 14) is corrected by this rule.

### R10-07 — W0 readiness is decided by landing checks, not by `**Status:**` lines (MEDIUM; S2-B)

**Finding (verified).** R9-04 read the dependency state from each task
file's `**Status:**` line. By family precedent a leaf keeps `⏳ To Do` until
TASK-551-10-L02 closure (09-L04 `:1229-1230`, I7), and 10-L02 closes after
03-L02, so a Status-based check never unblocks. 08-L03 already records its
INITIAL as landed (`TASK-551-08-L03…md:612`, "INITIAL (landed) is
unchanged."), and R9-04 left out TASK-554 (`✅ Done`).

**Rule (replaces the R9-04 state sentence and its status sentence, quotes 16
and 17, and the Round-8 replacement text quoted as quote 18).** "R6-08 (2) no
longer blocks W0. INITIAL W0 and its capture are blocked until every header
Dependency (`:9-11`) passes its landing check below. The INITIAL capture runs
once, at the INITIAL `preWaveCommit`, immediately before W0's first edit,
after every check passes. A capture taken earlier is void and is not a
re-capture."

"Landed" means the concrete check in this table, run from the worktree root
at the INITIAL `preWaveCommit`. A receipt check is: `git ls-files
--error-unmatch <receipt>` exits 0, and `git log --diff-filter=A --format=%H
-- <receipt>` prints exactly one commit, the landing commit that the W0
receipt records. A leaf's `**Status:**` line is never a readiness signal.

| Dependency (header `:9-11`) | Landing check | Enforced by | Observed at `c237e05d` (informational) |
|---|---|---|---|
| TASK-554 | `TASK-554_Post_Metadata_Publish_RBAC_Hardening.md:8` reads `**Status:** ✅ Done` (a closed board task; the only Status-based check) | orchestrator | ✅ Done, satisfied |
| TASK-551-08-L03 INITIAL | 08-L03 `:612` "INITIAL (landed) is unchanged." plus the receipt check on `_docs/_workflows/_smoke/task-551/impl-08-l03-initial.json` | orchestrator; the 03-L02 fence names only `TASK-551-08-L03:final` (`dependencies` `:1826`, occurrence `final` `dependsOn` `:2167`) | satisfied; landing commit `62438e4ecc13e8309b4641cf6f5afaa1b9a93bc1` |
| TASK-551-09-L04 INITIAL | the receipt of the 09-L04 fence occurrence `initial` (09-L04 fence `:794` at `c237e05d`): receipt check on `_docs/_workflows/_smoke/task-551/impl-09-l04-initial.json`, whose `verdict` is `INITIAL_ADMITTED_GATES_GREEN` | the dispatch graph (`TASK-551-09-L04:initial`: `dependencies` `:1826`, occurrence `initial` `dependsOn` `:2162`) and the orchestrator | tracked; landing commit `ae6bea8ac9afea8a2e68cf6fd403ac2ffc5ddc36`; verdict as required |
| TASK-551-03-L01 | receipt check on `_docs/_workflows/_smoke/task-551/impl-03-l01.json` (named by 03-L01 `:448`, `:754`) | orchestrator only | tracked; landing commit `801334e2b09e5e4924475421f7a414c81d95a531` |
| TASK-551-05-L02 | receipt check on `_docs/_workflows/_smoke/task-551/impl-05-l02.json` (fields `task` `TASK-551-05-L02`, `occurrence` `single`; cited as accepted predecessor by `impl-03-l01.json`) | orchestrator only | tracked; landing commit `741b8b98d01de5db954ce14aa22612a4c0a0590d` |
| TASK-551-06-L03 | receipt check on `_docs/_workflows/_smoke/task-551/impl-06-l03.json` (named by 06-L03 `:930`, `:1272`), whose `verdict` is `SINGLE_ADMITTED_GATES_GREEN` | orchestrator only | tracked; landing commit `8f73a0f8398e69f9b86f8e0e4fbffa4a0a657a33`; verdict as required |

- The "Observed" column is this writer's reading at `c237e05d` (commands
  above, 2026-09-26). It is not capture evidence. The W0 receipt records the
  outputs at the INITIAL `preWaveCommit`, together with the three R8-09
  commands (R9-04 table), whose allowlist status command now covers the 322
  post-R10-09 allowlist paths. The orchestrator decides readiness from that
  record.
- None of the fences of 03-L01, 05-L02 or 06-L03 names a receipt path; the
  receipt paths above come from the task bodies and the tracked receipts.
- The R8-09 sentence kept by R9-04 ("The INITIAL `preWaveCommit` is still the
  commit the orchestrator records immediately before W0's first edit, …")
  stands.

### R10-08 — LOW bundle (S1, S2-A, S2-B)

- **(a) R9-09 anchor note** (replaces quote 19): "**Anchor note (INFO).** For
  the C13 `afterAll` citation `:739-741` (`:2945`): the `afterAll` opens at
  `task551RevisionConcurrency.test.ts:739`; its marker deletes are `:745`
  (page revisions), `:747` (pages) and `:749` (users); the symbol governs."
- **(b)** The R10-07 table lists TASK-554 (`✅ Done`, satisfied).
- **(c) postsClient anchors.** The R9-01 finding's "HEAD `getPostCached`
  (`postsClient.ts:436-458`)" (quote 20) reads "HEAD `getPostCached`
  (`postsClient.ts:436-447`) → `readPostDetailWithAuthority` (`:410-434`,
  upsert at `:422`)". The Round-9 security row's `postsClient.ts:250`
  (quote 21) is the HEAD synthesis line (`readPostsCache() ?? []` inside
  `upsertCachedPost`); the non-forced `listPostsCached` reader is `:365`.
- **(d) TASK-551-11 Handoffs row** (replaces quote 22): "**TASK-551-11.**
  Nothing owed. Round 9 adds no gate argv, no `./` site and no contract
  evidence path; the orchestrator's dispositions records are covered by
  Orchestrator (c)."
- **(e) R7-05 T4/T5 cells for the memory-only families** (replace the
  entries and forms cells quoted as quotes 23 and 24, for custom-screen
  entries and form submissions only): T4 "stale entry fetches ✓; hydrate n/a
  as users (R3-18)"; T5 "dedupe ✓; slot n/a (memory-only)". The entries-type,
  entries-all and forms-list cases keep "✓" (T4), "✓ every family slot" and
  "✓ every slot the client holds" (T5), read over their persisted slots only
  (R9-06).
- **(f) Security wording.** See "Security Contract rows (Round 10)" (quotes
  25 and 26).
- **(g) T4 note.** For slot-bearing clients the T4 cell "a `"hydrate"` read
  still returns it" uses non-default filters: R9-07 makes the default-filter
  accessor read the persisted slot only, which an event clears.

### R10-09 — Test-file budget: `task551PaginatedClientsSlots.test.ts` (LOW; S3-A, S2-B line gate)

`tests/vitest/admin/task551PaginatedClients.test.ts` would carry T1-T16 over
eight clients plus T6 (d), T14 and T14b in one new file with no line budget.
Decision: the tests are split by responsibility before implementation.

- `tests/vitest/admin/task551PaginatedClientsSlots.test.ts` (NEW; allowlisted
  by this round's fence edit) hosts T6 (d), T14, T14b and T16: the persisted
  first-page slot, patch and media-facet cases.
- `tests/vitest/admin/task551PaginatedClients.test.ts` keeps T1-T13 and T15.
  Wherever an earlier section places T6 (d), T14, T14b or T16 in
  `task551PaginatedClients.test.ts`, read `task551PaginatedClientsSlots.test.ts`
  (quotes 27-29); every other test named for `task551PaginatedClients.test.ts`
  stays there.
- W2 creates both files before the W2 gate (as for
  `task551PaginatedClients.test.ts`, `:5757`), because `w2-client-vitest`
  discovers both.
- Each file is independently runnable in the vitest lane. Neither imports the
  other (importing a test file registers its tests twice). Shared setup lives
  in an already-allowlisted module or is kept local. A new support module is
  not allowlisted, so needing one is a STOP-and-report.
- **Fence (in place; the first fence edit since Round 1).** The allowlist
  gains the path. The command `w2-client-vitest` (`:1994`) gains it in `argv`
  and in `positiveDiscovery.paths`, directly after
  `tests/vitest/admin/task551PaginatedClients.test.ts`, and its `minimum`
  rises by one (17 → 18). Details: "Envelope record (Round 10)".
- **Held: `admin-pagination-vitest-1` (`:1917`).** R10-09 also names this
  command, but its `argv` already has 128 tokens (`:1919`), and the dispatch
  validator caps a literal argv at 128
  (`_docs/_workflows/lib/task-551-dispatch-envelope.mjs:100`,
  `requireLiteralArgv` → `requireOwnDataArray(value, code, { min: 1, max: 128 })`).
  With the path added, the family preflight fails with
  `task551_dispatch_envelope_command:<this file>` (run on 2026-09-26 by this
  writer; the edit was then withdrawn). So this command is NOT edited; its
  `argv`, `positiveDiscovery.paths` and `minimum` 124 stay byte-identical. The
  new suite runs at the W2 gate and at INITIAL closure through
  `w2-client-vitest` (waves `:1234`), but not in the W3 run of
  `admin-pagination-vitest-1`. Where the path goes instead (for example
  `admin-pagination-vitest-2`, `:1928`, which has 34 argv tokens) is an
  orchestrator decision ("Handoffs (Round 10)", orchestrator (f)); this
  section does not take it.
- **STOP rule.** If either file exceeds 1,000 physical lines, the implementer
  STOPs and reports; it never adds a third file on its own. The fence
  `line-count-1` (`:2095-2100`) names only `task551PaginatedClients.test.ts`;
  R10-09 authorizes no line-count edit, so the implementer runs `wc -l` on
  both files at every gate that touches them (the repository line gate covers
  every touched file).

### R10-10, R10-11, R10-12, R10-14, R10-15, R10-16 — INFO items

- **R10-10.** The Round-9 envelope claims the auditors could not run were
  verified by the orchestrator: see "Envelope record (Round 10)".
- **R10-11.** The 10-L02 owed-item wording "in 10-L02's next append-only
  section" stays. With C17 v6 the copy authority is a dated heading, so
  nothing else is owed to 10-L02 from Round 10.
- **R10-12.** "Handoffs (Round 10)" below.
- **R10-14.** The entries guard placement accepted by R9-11 is unchanged.
- **R10-15.** The Round-9 security row wording for detail pages and posts
  follows R10-08 (f); the R9-03 (a) `:926` addition follows R10-03.
- **R10-16.** Every superseded Round 1-9 sentence changed by Round 10 is
  quoted verbatim under "Superseded sentences (Round 10)", and "This section
  wins" is retained.

### R10-13 — 09-L04 owed mirror: executable spec (MEDIUM; S3-B; LOW S3-A)

09-L04's own writer carries this out in its file in this writer round; 03-L02
records the same text and edits nothing in 09-L04. The spec replaces the
R9-10 mirror text (quote 30) and the Round-9 Handoffs 09-L04 row (quote 31).

TASK-551-09-L04 appends a dated section that:

1. **Records the R7-02/R8-04 consumer constraints.** Synchronous local
   delivery with `origin` `"local"`, operation-token pass-through and
   own-sourceId drop (`core/admin/utils/cacheBus.ts:151-153`, `:170`);
   `mediaFoldersClient.ts` emissions `:236`, `:251` and `:268` carry
   `mediaFolders` only, and `:280-281` emits both keys; the new 03-L02
   module-level state (per-client lazy subscription handles,
   `postFirstPageEpochs`, `<client>SelfEmit` guards), cleared or unsubscribed
   by the registered resets. A 09-L04 FINAL change to any of these re-opens
   03-L02 R7-02, R7-06 and R8-04.
2. **Makes an IN-PLACE fence edit** (the 09-L04 C1/I4 precedent) to the
   command `final-admin-cache-tests`: `tests/vitest/admin/task551PaginatedClients.test.ts`
   and `tests/vitest/admin/task551PaginatedClientsSlots.test.ts` are added to
   `argv` and to `positiveDiscovery.paths`, and `minimum` rises to the full
   path count; the matching prose line is added to the FINAL block (09-L04
   `:557-569` at `c237e05d`), so prose and envelope agree (I4).
3. **Adds `TASK-551-03-L02:initial`** to the `dependsOn` of the 09-L04 `final`
   occurrence (09-L04 `:800` at `c237e05d`). No cycle: 03-L02 `initial`
   depends on 09-L04 `initial`.
4. **States that both files run whole** (not only T14 and T14b).

The family inventory stays 41/11/29/33. The cacheBus handler-order constraint
is not part of the mirror: R10-03 removed the dependency on it (H7).

### Superseded sentences (Round 10)

Each quote is verbatim at its `c237e05d` anchor (text authoritative; a hard
wrap is one space). The replacement is the named Round-10 item.

1. "C17 v5 amendments (Round 9)", the whole subsection (`:10277-10307`): "###
   C17 v5 amendments (Round 9) The heading `### C17 v5 — Handoffs and owed
   mirrors (2026-09-26; Rounds 5-8)` (`:9166`) stays 10-L02's copy authority
   (`TASK-551-10-L02-Documentation-Runbooks-And-Family-Closure.md:1628-1633`).
   Under that rule, the closure writer greps 03-L02 for every `C17 v` heading,
   copies from the highest dated one, and applies earlier C17 bullets only
   where that heading leaves them standing. This subsection is NOT a new C17
   version and has no date of its own. 10-L02 copies C17 v5 as amended
   here. 1. **Item 3** now reads: "the two-counter model per paged client
   (`invalidationEpoch`, advanced by the invalidate and by an own emission
   (item 5 (b)), vs `resetGeneration`, advanced only by the registered
   reset)". The rest of item 3 stands (R9-05). 2. **Item 6 (Round 9; added to
   the 10-L02 mirror).** - (a) Posts `upsertCachedPost` and `removeCachedPost`
   slot writes drop the default first-page marker. Every other slot-bearing
   client never patches a `null` persisted slot into existence; it patches
   memory only (R9-01). - (b) The detail-pages subscription also clears the
   triggering event key, through its cache or `clearLocalCache` (R9-02). - (c)
   Media library: a foreign `mediaList` update clears the media slot before
   the view's handler runs, so the view performs one forced background read
   instead of applying Storage rows (R9-03). - (d) Form submissions and
   custom-screen entries are memory-only list families with no persisted slot
   (R9-06). 3. **Pointers.** These replace the C17 v5 pointer sentence quoted
   below: - **TASK-554:** unchanged; see "Handoffs (Round 9)". -
   **TASK-551-09-L04:** owed mirror (R9-10); see "Handoffs (Round 9)". -
   **Orchestrator:** "Handoffs (Round 8)" as amended by "Handoffs (Round
   9)". - The C17 v5 TASK-551-11 and query-inventory (01-L01) sentences
   stand." → R10-01: folded into C17 v6, which is the copy authority.
2. Handoffs (Round 9), TASK-551-10-L02 (`:10454-10455`): "**TASK-551-10-L02.**
   Owed through C17 v5 as amended by "C17 v5 amendments (Round 9)", in
   10-L02's next append-only section." → C17 v6 (R10-01); the R10-11 wording
   "in 10-L02's next append-only section" stays.
3. R9-01 T16 setup (`:9980-9985`): "Each case starts with no persisted default
   slot, either never read or read and then expired with
   `vi.setSystemTime(Date.now() + cacheTtlMs.list + 1)`. It runs the mutation
   against a stubbed response and asserts: the `Storage` spy records no write
   to the family list key; `getCached*()` for the default filters returns
   `null`; the next non-forced default first-page read issues exactly one list
   GET." → R10-02 (setup rules per cell kind; `setItem` only; the
   `entriesAllList` cell restated).
4. R9-01 pages template (`:9932`): "pagesFirstPage.write({ ...stored, items:
   patch(stored.items) }); // v, filters, nextCursor, hasMore kept" → R10-02
   (HEAD's changed-only guard before the write).
5. R8-04 view (`:9005-9006`): "The `mediaList` branch keeps its owning-section
   behaviour." → R10-03 (every `mediaList` and `mediaFolders` event dispatches
   `revalidate()`; no Storage apply).
6. R9-03 (b) mechanism, steps 1-3 (`:10056-10070`): "1. The media client's
   lazy subscription is registered synchronously inside the first media list
   read the view issues on mount. At HEAD that read is `listMediaCached` in
   the mount refresh effect
   (`core/admin/ui/media/MediaLibraryPage.tsx:356-358`), which precedes the
   view's own subscription effect (`:360-366`: `:362` key filter, `:363`
   `update` short-circuit through `applyCachedMediaRows()`, `:364` forced
   background refresh). 2. cacheBus delivers local handlers synchronously in
   insertion order: the `localHandlers` Set gets `add` at
   `core/admin/utils/cacheBus.ts:157`, and the loop runs at `:151-153`. 3. A
   foreign `mediaList` `update` event therefore runs `invalidateMediaList`
   first, which clears the slot in memory and in Storage. Then
   `applyCachedMediaRows()` (`getCachedMediaForEvent()`, Storage first) finds
   nothing and returns `false`, and the view performs exactly ONE forced
   background read." → R10-03 (steps re-anchored on the hook's `fetchPage`
   effect `:5405-5410`; order-independent).
7. R9-03 (b) assertions (`:10072-10078`): "The test's assertions become the
   following: - exactly 1 media list GET after the broadcast; - after
   flushing, the rendered rows equal the fetched page (the stub's "Network
   update" row); - the "Storage update" expectation is replaced. The test may
   still assert that the "Storage update" row the test wrote is never
   rendered." → R10-03 (i) (a delta `c0 + 1`; distinct stub rows; the "Storage
   update" assertion mandatory).
8. R9-03 (b) (`:10082`): "Every other assertion in the file stands." → R10-03
   (ii): withdrawn for `media-library.test.tsx:234-235`; it stands for every
   other assertion.
9. R9-03 STOP rules (`:10084-10088`): "If the implementer observes the
   opposite handler order (the view's handler before the client's), it STOPs
   and reports to the orchestrator. This can happen, for example, when a C11
   extraction registers the results subscription before the first list read.
   The implementer does not re-baseline silently." → withdrawn by R10-03 (no
   rule relies on handler order); the sentence at `:10088-10089` stands.
10. R9-03 (a) (`:10045-10048`): "The folder-event tests (their `mediaFolders`
    broadcasts are at `media-library-load-retry-wave.test.tsx:203` and
    `media-library-mutation-retry-wave.test.tsx:557`, `:613`, `:654`, `:830`)
    count folder GETs only." → R10-03 (the enumeration adds
    `media-library-mutation-retry-wave.test.tsx:926`).
11. R9-06, R8-03 entries cell (`:10165-10167`): "the entries row's "Kept by an
    own emission" cell reads "the `entriesList(slug)` and `entriesAllList`
    slots (custom-screen entries: memory-only)"." → R10-04 (the
    `entriesList(slug)` slot patched; the `entriesAllList` slot cleared by the
    own mutation; custom-screen entries memory-only).
12. R8-07 (`:9146-9147`): "Each keeps its assertion values and event counts" →
    R10-05, for the two pins named there only
    (`entriesClient.test.ts:482-506`,
    `entriesClientMutationReconciliation.test.ts:88-90`, absent branch); it
    stands for every other pin.
13. R9-01 (`:9883-9884`): "An existing versioned slot is patched as at HEAD,
    including a prepend on create where HEAD prepends." → R10-06 (only for
    families whose contract row does not say reset: reservations, resources,
    services; blackouts reset).
14. R9-01 (`:9894-9895`): "The blackouts row (`:434`, "never synthesize a full
    list") already agrees with this rule." → R10-06 (the `:434` reset governs
    blackouts create and delete).
15. R8-03 table, booking row, last cell (`:8924`): "each family slot; the week
    cache (R3-07) untouched" → R10-06 (except the blackouts slot, cleared by a
    blackouts create or delete).
16. R9-04 state (`:10096-10100`): "INITIAL W0 and its capture remain blocked
    by the occurrence dependency `TASK-551-09-L04:initial` (fence `:2162`) and
    the header Dependencies (`:9-11`: TASK-551-03-L01, 05-L02, 06-L03, the
    09-L04 INITIAL receipt and the 08-L03 INITIAL receipt, all `⏳ To Do` at
    `74fe8f4e`)." → R10-07 (landing checks per dependency; TASK-554
    satisfied).
17. R9-04 (`:10118-10119`): "The five dependency statuses were read from each
    task file's `**Status:**` line at `74fe8f4e`." → R10-07 (a `**Status:**`
    line is never a readiness signal).
18. Superseded sentences (Round 8), quote 36, replacement text (`:9599-9601`):
    "→ R8-09: no baseline has been captured yet; the INITIAL capture window is
    open, and the INITIAL capture goes directly to the `03-l02-baselines/`
    path." → R9-04 as restated by R10-07 (no capture window is open until
    every landing check passes).
19. R9-09 anchor note (`:10220-10222`): "its marker deletes are `:747` (pages)
    and `:749` (users);" → R10-08 (a) (`:745` page revisions, `:747` pages,
    `:749` users).
20. R9-01 finding (`:9840-9841`): "HEAD `getPostCached`
    (`postsClient.ts:436-458`) calls `upsertCachedPost` and broadcasts
    nothing." → R10-08 (c) (`:436-447` → `readPostDetailWithAuthority`
    `:410-434`, upsert at `:422`; the "broadcasts nothing" fact stands).
21. Security Contract rows (Round 9) (`:10424-10425`): "The TASK-554
    `listPostsCached` readers see it exactly as at HEAD
    (`postsClient.ts:250`)," → R10-08 (c) (`:250` is the HEAD synthesis line;
    the non-forced reader is `:365`); "Security Contract rows (Round 10)".
22. Handoffs (Round 9), TASK-551-11 (`:10463-10464`): "Round 9 adds no gate
    argv, no `./` site and no evidence path under the 11 closed root." →
    R10-08 (d).
23. R7-05 T4 row (`:8114`), the "Entries ×3" cell "✓" and the "Forms (+
    submissions)" cell "✓" → R10-08 (e) for custom-screen entries and form
    submissions only ("stale entry fetches ✓; hydrate n/a as users (R3-18)").
24. R7-05 T5 row (`:8115`), the "Entries ×3" cell "✓ every family slot" and
    the "Forms (+ submissions)" cell "✓ every slot the client holds" → R10-08
    (e) for custom-screen entries and form submissions only ("dedupe ✓; slot
    n/a (memory-only)").
25. Security Contract rows (Round 9) (`:10421-10422`): "and no patch creates a
    servable first-page slot where none existed (R9-01)." → "Security Contract
    rows (Round 10)" (scoped to the `readPostsListPage` network path; R10-08
    (f)).
26. Security Contract rows (Round 9) (`:10430-10431`): "It removes exactly one
    Storage key and never enumerates Storage." → "Security Contract rows
    (Round 10)" (at most one Storage key beyond the `listCacheByKey` slots;
    R10-08 (f)).
27. Handoffs (Round 9), TASK-554 (`:10452-10453`): "T6 (d) and T16 live in
    `task551PaginatedClients.test.ts`." → R10-09 (T6 (d) and T16 live in
    `task551PaginatedClientsSlots.test.ts`).
28. R9-01 T6 (d) (`:9947`):
    "(`tests/vitest/admin/task551PaginatedClients.test.ts`," → R10-09 (file
    only: `tests/vitest/admin/task551PaginatedClientsSlots.test.ts`, posts
    block; the case stands).
29. R7-05 heading (`:8094`): "Test applicability matrix for
    `task551PaginatedClients.test.ts`" → R10-09 (rows T14, T14b and the R9-01
    row T16 live in `task551PaginatedClientsSlots.test.ts`; the other rows
    stay).
30. R9-10 mirror text (`:10235-10240`): "TASK-551-09-L04 (owed mirror): its
    next append-only section records the R7-02/R8-04 consumer constraints
    (synchronous local delivery, operation-token pass-through, own-sourceId
    drop; `mediaFoldersClient.ts` emissions `:236/:251/:268` `mediaFolders`
    only, `:280-281` both keys) and adds
    `tests/vitest/admin/task551PaginatedClients.test.ts` (T14/T14b) to its
    FINAL gate." → R10-13 (the executable spec).
31. Handoffs (Round 9), TASK-551-09-L04 (`:10456-10462`): "**TASK-551-09-L04
    (owed mirror; another writer's file).** "Its next append-only section
    records the R7-02/R8-04 consumer constraints (synchronous local delivery,
    operation-token pass-through, own-sourceId drop; `mediaFoldersClient.ts`
    emissions `:236/:251/:268` `mediaFolders` only, `:280-281` both keys) and
    adds `tests/vitest/admin/task551PaginatedClients.test.ts` (T14/T14b) to
    its FINAL gate." (R9-10.)" → R10-13 and "Handoffs (Round 10)".
32. Security Contract rows (Round 9), media view (`:10432-10434`): "**Media
    view.** Storage rows written under an invalidated slot are never applied
    as fresh. The event costs one forced background read (R9-03), within the
    Round-8 per-event bound (paged ≤ 2 forced reads per event)." → "Security
    Contract rows (Round 10)" (order-independent; R10-03).
33. Handoffs (Round 9), orchestrator (a) (`:10467-10470`): "(a) INITIAL
    capture blocked by dependencies. INITIAL W0 and its capture are blocked by
    `TASK-551-09-L04:initial` (fence `:2162`) and the header Dependencies
    (`:9-11`) (R9-04). The W0 receipt re-runs the three R8-09 commands at the
    INITIAL `preWaveCommit`." → "Handoffs (Round 10)" orchestrator (a)
    (R10-07).
34. Validation Commands, envelope counts (`:1121-1122`): "Envelope counts:
    allowlist 321, forbiddenPaths 52, commands 34; INITIAL 30 ids, FINAL 11
    ids." → R10-09: allowlist 322 (fence; the fence wins, `:1113-1117`).
35. Validation Commands, `w2-client-vitest` (`:1234`): "`minimum` 17, argv 21
    tokens" → R10-09: `minimum` 18, argv 22 tokens (the fence wins; the argv
    line `:1237` lacks the new path until this section is regenerated).

**Stands** (non-exhaustive reminders):

- R9-01 except quotes 3, 4, 13, 14, 20 and 28 (the posts rule (1b), its code
  block, T6 (d) and the other T16 cells stand);
- R9-02; R9-03 except quotes 6-10, including `:10088-10089` and the R8-07
  wire-form adaptation (`:10080-10082`, first two sentences);
- R9-04 except quotes 16 and 17, including the R8-09 receipt commands table
  and the kept R8-09 `preWaveCommit` sentence;
- R9-05, R9-07, R9-08, R9-11 and R9-12;
- R9-06 except quote 11 (the forms cell and the memory-only family list
  stand);
- R9-09 except quote 19; R9-10 except quote 30;
- the R6-01 `:7178` entries row (quoted for scope under R10-04, unchanged for
  the public clears);
- R8-07 for every pin not named in R10-05; R8-03 except quote 15 and the
  entries cell restated by R10-04;
- the Round-9 Security, Handoffs and Envelope records except the quoted
  sentences.

### Security Contract rows (Round 10)

No route, schema, auth, RBAC, CSRF or rate-limit change. Endpoint visibility,
the auth model and rate-limit buckets stay as in Rounds 2-9.

- **No stale page served as fresh (restated; replaces quote 25; R10-08
  (f)).** "A posts first page installed by any path other than a current
  `page` completion is never served on the `readPostsListPage` network path
  (R8-02), and no patch creates a first-page slot that the
  `readPostsListPage` network path serves where none existed (R9-01)." The
  posts synthesis (the TASK-554 precondition) stays readable through the
  non-forced `listPostsCached` reader (`postsClient.ts:365`) and through hook
  hydration (R3-17), exactly as at HEAD (the HEAD synthesis line is
  `postsClient.ts:250`). The rest of the Round-8 and Round-9 rows stands.
- **Detail pages (restated; replaces quote 26).** A foreign event of a
  per-content-type key clears that key's persisted slot even when this tab
  never created its cache (R9-02). The clear applies only to keys that pass
  the family predicate (`event.key.startsWith(cacheKeys.detailPagesList)`).
  The event-key clear removes at most one Storage key beyond the
  `listCacheByKey` slots, and nothing enumerates Storage.
- **Media view (restated; replaces quote 32).** Storage rows written under
  an invalidated slot are never applied as fresh, in either cacheBus handler
  order: the results view has no Storage-apply path, and every `mediaList`
  or `mediaFolders` event forces a network read through the hook (R10-03).
  The cost is one forced read per event, or two when a view-issued read in
  flight is superseded by the client's invalidate (T7), within the Round-8
  per-mode bound (append ≤ 2 × depth per storm window).
- **Entries own mutations (R10-04).** An own entries mutation clears only
  the `entriesAllList` slot and advances the entries epoch; it no longer runs
  the full entries invalidate. The public clears, including the
  `assistantClient.ts:315`/`:317` callers, stay full invalidates, and foreign
  or remote entries events still run the invalidate (R7-02). No slot outlives
  a foreign event.
- **Blackouts (R10-06).** A blackouts create or delete never synthesizes,
  prepends or filters a stored page; it resets the family (slot cleared,
  memory stale, one forced read), as the `:434` row requires.
- **Patch writes (R10-02).** A no-op patch writes nothing, so it never
  extends a slot's freshness window (`savedAt`) without new server data.
- **TASK-554 authority isolation.** Unchanged (Round 9 row).
- **Evidence (R10-07).** W0 readiness receipts keep commit ids, paths and
  receipt `verdict` fields only. `.env` values are never read into a receipt
  or a prompt.
- **Test fixtures.** Unchanged; R10-08 (a) changes an anchor only.

### Handoffs (Round 10)

- **TASK-554.** Unchanged: no file edit and no re-open. T6 (d) and T16 now
  live in `task551PaginatedClientsSlots.test.ts` (R10-09);
  `postsClientCacheAuthority.test.ts` keeps only the D2 edits (R8-01). R10-08
  (c) corrects anchors only.
- **TASK-551-10-L02** (replaces quote 2). Owed through C17 v6 (the copy
  authority, R10-01), in 10-L02's next append-only section (R10-11). No
  10-L02 rule change is owed.
- **TASK-551-09-L04 (owed mirror; another writer's file).** Per R10-13. The
  09-L04 writer runs in this writer round from the same R10-13 spec; its
  section is cited here by R10-13, not by a 09-L04 line. The cacheBus
  handler-order item is not owed (H7).
- **TASK-551-11.** Nothing owed. Round 10 adds one bare `tests/` path to one
  03-L02 fence command (R10-09; no `./` site, R8-10) and no contract evidence
  path; the orchestrator's dispositions records are covered by Orchestrator
  (c). The 128-token argv cap that holds the second command is 11-owned
  (`task-551-dispatch-envelope.mjs:100`) and is consumed, not changed.
- **TASK-551-01-L01.** Unchanged. Round 10 adds no server statement.
- **Other task files citing 03-L02 lines.** A citation of a 03-L02 line
  ≥ `:1572` made before this round now points one line early; the quoted
  text, symbol or heading governs (for example the 10-L02 copy rule selects
  C17 headings by name, not by line).
- **Orchestrator.**
  - (a) INITIAL capture blocked until every R10-07 landing check passes and
    is recorded in the W0 receipt, together with the three R8-09 commands
    (replaces quote 33).
  - (b) Queue nothing new for 09-L04: its writer runs in this round (R10-13).
  - (c) Relocation follow-up unchanged; it now also covers
    `03-l02-round10-dispositions.md` (N = 10; untracked at `c237e05d`).
    Until the records move, R4-10 gloss 2 (`:6423`) classifies them at W0.
  - (d) "Validation Commands" (`:1111-1374`) is behind the fence for
    `w2-client-vitest` and for the allowlist count (quotes 34 and 35). By its own rule the fence wins (`:1113-1117`); the
    section is regenerated from the fence by a later authorized in-place
    edit, never hand-patched.
  - (e) The restated `owned-module-consumers-bun` precondition (R8-10) and
    the R6-06 stop rule (size below) stand.
  - (f) Decide the home of `tests/vitest/admin/task551PaginatedClientsSlots.test.ts`
    in the W3/INITIAL-closure vitest run: `admin-pagination-vitest-1` cannot
    take it under the 128-token argv cap (R10-09 "Held"). Until then the
    suite runs through `w2-client-vitest` only.
  - (g) The fence `line-count-1` does not name the new suite; the R10-09
    STOP rule relies on the implementer's `wc -l` and the repository line
    gate.

### Envelope record (Round 10)

**The in-place fence edit (R10-09).** It is the first fence edit since
Round 1. The JSON stays valid, and every key other than the edited ones is
byte-identical (`schema`, `taskId`, `parent`, `forbiddenPaths`,
`dependencies`, `occurrences` and every other command). Checked on 2026-09-26
by parsing both fences (`c237e05d` and the edited file): after removing the
new path and restoring the one `minimum`, the two parses are equal. The diff
of this file against `c237e05d` outside this appended section is exactly
three hunks, all inside the fence; the only removed lines are the three
replaced `w2-client-vitest` lines (`argv`, `paths`, `minimum`):

| Change | Before (`c237e05d`) | After (this round) |
|---|---|---|
| allowlist entry `tests/vitest/admin/task551PaginatedClientsSlots.test.ts` inserted directly after `tests/vitest/admin/task551PaginatedClients.test.ts` | — (`:1571` is the last line before it) | new line `:1572` |
| `w2-client-vitest` `argv`: the path inserted after `tests/vitest/admin/task551PaginatedClients.test.ts` (21 → 22 tokens) | `:1996` | `:1997` (line replaced) |
| `w2-client-vitest` `positiveDiscovery.paths`: the same insertion (17 → 18 paths) | `:2000` | `:2001` (line replaced) |
| `w2-client-vitest` `positiveDiscovery.minimum` 17 → 18 | `:2001` | `:2002` (line replaced) |
| `admin-pagination-vitest-1` (`argv` 128 tokens, 124 paths, `minimum` 124) | `:1917-1926` | `:1918-1927`, content unchanged (held by the argv cap, R10-09) |

**Line shift.** One line is inserted after `:1571`, so every line from
`:1572` on moves down by one. Shifted ranges that earlier sections cite:

- the fence `:1441-2172` → `:1441-2173`; the allowlist entries `:1450-1770`
  (321) → `:1450-1771` (322); `forbiddenPaths` `:1773-1824` (52) →
  `:1774-1825`; `dependencies` `:1826` → `:1827`;
- `admin-pagination-vitest-1` id `:1917` → `:1918`, `argv` `:1919` → `:1920`,
  paths `:1923` → `:1924`, `minimum` `:1924` → `:1925`;
  `admin-pagination-vitest-2` `:1928` → `:1929`;
- `w2-client-vitest` id `:1994` → `:1995` (argv, paths and minimum as in the
  table); `line-count-1` `:2095-2100` → `:2096-2101`;
- occurrence `initial` `dependsOn` `:2162` → `:2163`; occurrence `final`
  `:2166-2168` → `:2167-2169`;
- every section after the fence: for example R8-08 `:9159` → `:9160`, C17 v5
  `:9166` → `:9167`, Round 9 `:9807-10526` → `:9808-10527`, and "C17 v5
  amendments (Round 9)" `:10277-10308` → `:10278-10309`.

Lines `:1-1571`, including "Validation Commands" (`:1111-1374`) and the
header Dependencies (`:9-11`), do not move. Bare anchors in this section use
the `c237e05d` numbering (see the section's opening paragraph).

**Counts after the edit.** Allowlist 322 (no duplicate), `forbiddenPaths` 52,
commands 34, occurrences `initial` (30 command ids, `dependsOn`
`TASK-551-09-L04:initial`) and `final` (11 ids, `dependsOn`
`TASK-551-08-L03:final`). `w2-client-vitest`: `argv` 22 tokens, 18 paths,
`minimum` 18, and every path appears verbatim in `argv` (R8-10). The family
preflight (`TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md:1173`) run on
the edited tree with the current HEAD prints
`{"taskFileCount":41,"childTaskCount":11,"leafTaskCount":29,"occurrenceCount":33}`.
With the path also in `admin-pagination-vitest-1` it failed with
`task551_dispatch_envelope_command:_docs/_TASKS/TASK-551-03-L02-Bounded-Admin-Lists-And-Oversized-Service-Splits.md`
(129 argv tokens over the cap of 128), so that part was withdrawn.

**R10-10 (the Round-9 envelope claims the auditors could not run).** The
orchestrator ran them, and this writer re-ran them on 2026-09-26:
`git diff HEAD~1 HEAD -- <this file> | grep '^@@'` prints one hunk,
`@@ -9804,3 +9804,723 @@`, whose added lines all follow `:9806`; `cmp -n
707757` of the `HEAD~1` and `HEAD` blobs reports no difference (the first
707,757 bytes, that is the whole Round-8 file, are identical); `wc -c` of the
`c237e05d` blob is 750,900. So Round 9 was a pure append.

**Paths this round names** (fence lines at `c237e05d`; add 1 for lines ≥
`:1572`):

- **Allowlisted:** `core/admin/services/pagesClient.ts` (`:1480`),
  `detailPagesClient.ts` (`:1481`), `entriesClient.ts` (`:1482`),
  `postsClient.ts` (`:1483`), `formsClient.ts` (`:1485`), `mediaClient.ts`
  (`:1486`), `bookingClient.ts` (`:1487`), `entriesClientPagination.ts`
  (`:1542`); `core/admin/ui/shared/useBoundedAdminList.ts` (`:1543`);
  `core/admin/ui/media/MediaLibraryPage.tsx` (`:1510`),
  `MediaLibraryResults.tsx` (`:1512`), `useMediaFolderOperations.ts`
  (`:1553`); `tests/vitest/admin/task551PaginatedClients.test.ts` (`:1571`)
  and the new `tests/vitest/admin/task551PaginatedClientsSlots.test.ts`
  (post-edit `:1572`); `tests/vitest/admin/formsClient.test.ts` (`:1575`),
  `bookingClient.test.ts` (`:1576`), `mediaClient.test.ts` (`:1577`),
  `pagesClient.test.ts` (`:1579`), `detailPagesClient.test.ts` (`:1581`),
  `entriesClientMutationReconciliation.test.ts` (`:1637`),
  `entriesClient.test.ts` (`:1639`); `tests/vitest/ui/media-library.test.tsx`
  (`:1613`), `mediaLibraryTestUtils.tsx` (`:1614`),
  `media-library-load-retry-wave.test.tsx` (`:1615`),
  `media-library-mutation-retry-wave.test.tsx` (`:1616`; cited read-only).
- **Forbidden and consumed only:** `core/admin/services/mediaFoldersClient.ts`
  (`:1808`), `core/admin/utils/cacheBus.ts` (`:1823`),
  `core/admin/utils/adminCacheAuthority.ts` (`:1774`).
- **Outside the envelope (read-only anchors; none is in the fence):**
  `core/admin/services/assistantClient.ts`; `core/admin/utils/storageCache.ts`;
  `tests/integration/server/task551RevisionConcurrency.test.ts`; the task
  files of TASK-554, TASK-551-03-L01, 05-L02, 06-L03, 08-L03, 09-L04, 10-L02
  and 11; the receipts `impl-03-l01.json`, `impl-05-l02.json`,
  `impl-06-l03.json`, `impl-08-l03-initial.json` and
  `impl-09-l04-initial.json` under `_docs/_workflows/_smoke/task-551/`;
  `_docs/_workflows/lib/task-551-dispatch-envelope.mjs` (the argv cap); the
  dispositions records, including `03-l02-round10-dispositions.md`
  (orchestrator evidence).

No other NEW allowlisted path is needed. One JSON fence. **Size (R6-06 stop
rule).** This file is 821,180 bytes after the Round-10 fence edit and append
(`wc -c`), below the 1,048,576-byte cap with the 200-byte closure headroom.
