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
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

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

`core/admin/services/cachePolicy.ts` is a read-only dependency owned solely by
TASK-551-09-L04. This leaf may compose its existing bounded-key helper with
client-local typed page/summary/facet discriminators, but it neither edits nor
duplicates cache-policy TTLs. Every one of the eight owned clients registers
all module maps/promises with L04 INITIAL's `adminCacheAuthority`, captures an
installation token before async work, and verifies that token plus its own
resource generation immediately before any cache install. Its reset callback
clears every legacy and newly added page/summary/facet/detail promise or value.

**Complete current list-client consumer graph, all in this leaf's allowlist:**
`core/admin/ui/custom-screens/CustomScreenEntriesPage.tsx`,
`core/admin/ui/custom-screens/customScreenPreviewData.ts`,
`core/admin/ui/custom-screens/hooks/useScreenEntryPresentationMedia.ts`,
`core/admin/ui/custom-screens/hooks/useScreenRelatedEntries.ts`,
`core/admin/ui/entries/FieldRenderer.tsx`,
`core/admin/ui/forms/hooks/useForms.ts`,
`core/admin/ui/menus/MenuDesignEditor.tsx`,
`core/admin/ui/menus/MenuEditorPage.tsx`,
`core/admin/ui/posts/editor/PostEditorCanvas.tsx`,
`core/admin/ui/site/SiteSettingsPage.tsx`,
`core/admin/ui/themes/ThemeEditorPage.tsx`,
`core/admin/ui/widgets/WidgetLibraryPage.tsx`,
`core/admin/ui/widgets/editors/ContentListEditors.tsx`,
`core/admin/ui/widgets/editors/CtaBannerEditors.tsx`,
`core/admin/ui/widgets/editors/EntryTeaserEditors.tsx`,
`core/admin/ui/widgets/editors/FeatureGridEditors.tsx`,
`core/admin/ui/widgets/editors/FooterEditors.tsx`,
`core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx`,
`core/admin/ui/widgets/editors/HeroEditors.tsx`,
`core/admin/ui/widgets/editors/LinkDestinationField.tsx`,
`core/admin/ui/widgets/editors/LogoCloudEditors.tsx`,
`core/admin/ui/widgets/editors/NavigationEditors.tsx`,
`core/admin/ui/widgets/editors/PostsFeedEditors.tsx`,
`core/admin/ui/widgets/editors/RichTextSectionEditors.tsx`,
`core/admin/ui/widgets/editors/SectionEditors.tsx`,
`core/admin/ui/widgets/editors/TeamEditors.tsx`,
`core/admin/ui/widgets/editors/TestimonialsEditors.tsx`,
`core/admin/utils/adminPrefetch.ts`, and
`core/admin/utils/adminPrefetchCustomScreens.ts`. This is the grounded current
`rg -l` call graph for the seven changed clients. Rerun it immediately before
implementation and add any new consumer to this same single-writer leaf before
changing a client contract.

**Cohesive UI extractions required before behavior changes:** the existing
`components/ReservationsTab.tsx` already owns the reservation table and row
actions; it receives the new pagination controls and is not duplicated or
renamed. `components/ResourcesTab.tsx` and `components/ServicesTab.tsx` receive
their own list controls, while `AvailabilityTab.tsx` and `SlotPreviewTab.tsx`
consume bounded resource/service picker summaries. To bring the 1,000-line page
under the gate, new `core/admin/ui/booking/BookingOverviewPanel.tsx` owns only
the current stat/quick-action/weekly-calendar presentation; `BookingPage.tsx`
retains fetch/cache/mutation/dialog orchestration. `core/admin/ui/media/MediaLibraryFolderState.ts` owns folder-operation types and
pure state helpers, while `core/admin/ui/media/MediaLibraryResults.tsx` owns the
grid/list result renderer and page controls formerly embedded in
`MediaLibraryPage.tsx`; and `core/admin/ui/users/UsersRolesContent.tsx` owns the
member/invitation list, role cards, filters, and page controls formerly embedded
in `UsersRolesPage.tsx`. The page modules retain orchestration, cache hydration,
dirty-state guards, dialogs, and selection state. These names are part of the
single-writer allowlist; do not invent generic helper dumping grounds.

Every other touched legacy module currently above 1,000 lines is split by these
exact cohesive paths before pagination; originals and extractions must each end
at or below 1,000 lines:

| Existing module | Required extraction paths |
|---|---|
| `DetailTemplateEditorPage.tsx` | `DetailTemplateRevisionPanel.tsx` |
| `MenuDesignEditor.tsx` | `MenuDesignCanvas.tsx`; `MenuDesignInspector.tsx`; `MenuDesignDataSources.tsx` |

> **Rebaseline note (TASK-542-03-L03):** this row's `MenuDesignEditor.tsx` split
> names are superseded by the post-TASK-542 modules
> `MenuDesignEditorCanvas/Controls/BarPanel/BrandNavControls/BlockPanel` (plus
> optional `MenuDesignEditorBlockFields`). At this task's closure, rebaseline the
> split table against the post-TASK-542 modules instead of splitting
> `MenuDesignEditor.tsx` again; `MenuDesignEditor.tsx` remains a thin facade after
> TASK-542.
| `MenuEditorPage.tsx` | `MenuEditorWorkspace.tsx` (editor frame, add-items rail, canvas, and inspector composition; page retains loading, mutation, dialog, and cache orchestration) |
| `PostEditorCanvas.tsx` | `PostEditorMediaControls.tsx` |
| `ContentListEditors.tsx` | `ContentListSourceEditors.tsx`; `ContentListPresentationEditors.tsx` |
| `CtaBannerEditors.tsx` | `CtaBannerContentEditors.tsx` |
| `EntryTeaserEditors.tsx` | `EntryTeaserSourceEditors.tsx`; `EntryTeaserPresentationEditors.tsx` |
| `FeatureGridEditors.tsx` | `FeatureGridItemEditors.tsx` |
| `FooterEditors.tsx` | `FooterNavigationEditors.tsx`; `FooterBrandEditors.tsx` |
| `GalleryMosaicEditors.tsx` | `GalleryMosaicItemEditors.tsx` |
| `HeroEditors.tsx` | `HeroContentEditors.tsx`; `HeroMediaEditors.tsx`; `HeroLayoutEditors.tsx` |
| `LogoCloudEditors.tsx` | `LogoCloudItemEditors.tsx` |
| `NavigationEditors.tsx` | `NavigationItemEditors.tsx`; `NavigationPresentationEditors.tsx` |
| `PostsFeedEditors.tsx` | `PostsFeedSourceEditors.tsx` |
| `RichTextSectionEditors.tsx` | `RichTextContentEditors.tsx`; `RichTextLayoutEditors.tsx` |
| `SectionEditors.tsx` | `SectionContentEditors.tsx`; `SectionLayoutEditors.tsx` |
| `TeamEditors.tsx` | `TeamMemberEditors.tsx`; `TeamLayoutEditors.tsx` |
| `TestimonialsEditors.tsx` | `TestimonialItemEditors.tsx` |

Each extraction lives beside its named existing module; these resolved exact
paths are also in the single-writer allowlist.

**Tests:** `tests/integration/routes/task551BoundedAdminLists.test.ts`,
`tests/integration/routes/bookingRoutes.test.ts`,
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
`tests/vitest/ui/page-revision-drawer.test.tsx`,
the replaced legacy `tests/vitest/ui/page-editor-v2-flow.test.tsx`,
`tests/vitest/ui/pageEditorV2FlowFixtures.tsx`,
`tests/vitest/ui/page-editor-v2-loading-cache.test.tsx`,
`tests/vitest/ui/page-editor-v2-editing-dirty-state.test.tsx`,
`tests/vitest/ui/page-editor-v2-autosave-conflicts.test.tsx`,
`tests/vitest/ui/page-editor-v2-preview-device.test.tsx`,
`tests/vitest/ui/page-editor-v2-publish-revisions.test.tsx`,
`tests/vitest/ui/page-editor-v2-sections-blocks.test.tsx`,
`tests/vitest/ui/page-editor-v2-accessibility-navigation.test.tsx`,
`tests/vitest/ui/page-editor-v2-persistence-roundtrip.test.tsx`,
`tests/vitest/ui/detail-template-editor.test.tsx`,
the replaced legacy `tests/vitest/ui/booking-page.test.tsx`,
`tests/vitest/ui/bookingPageTestFixtures.tsx`,
`tests/vitest/ui/booking-page-loading-pagination.test.tsx`,
`tests/vitest/ui/booking-page-mutations.test.tsx`,
`tests/vitest/ui/booking-page-calendar.test.tsx`,
`tests/vitest/ui/booking-tabs-interactions-wave.test.tsx`,
`tests/vitest/ui/booking-tabs-leaf.test.tsx`,
`tests/vitest/ui/booking-helpers.test.ts`,
`tests/vitest/ui/form-submissions-page.test.tsx`,
the replaced legacy `tests/vitest/ui/media-library.test.tsx`,
`tests/vitest/ui/mediaLibraryTestFixtures.tsx`,
`tests/vitest/ui/media-library-loading-pagination.test.tsx`,
`tests/vitest/ui/media-library-selection-folders.test.tsx`,
`tests/vitest/ui/media-library-upload-edit.test.tsx`,
`tests/vitest/ui/media-picker.test.tsx`,
the replaced legacy `tests/vitest/ui/forms-pages-wave.test.tsx`,
`tests/vitest/ui/formsPagesWaveFixtures.tsx`,
`tests/vitest/ui/forms-list-page-wave.test.tsx`,
`tests/vitest/ui/form-builder-page-wave.test.tsx`,
`tests/vitest/ui/forms-component-wave.test.tsx`,
`tests/vitest/ui-integration/forms-list-restyle.test.tsx`,
`tests/vitest/ui-integration/forms.test.tsx`,
`tests/vitest/ui-integration/forms-submissions-restyle.test.tsx`,
`tests/integration/routes/forms.test.ts`,
`tests/vitest/validation/task551ListSchemas.test.ts`, and
`tests/perf/database-admin-list-budgets.test.ts`.

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
L03's `tests/integration/server/route-response-headers.test.ts`. This leaf edits
none of them; absence or drift of either INITIAL receipt blocks implementation.

The 6,813-line `page-editor-v2-flow.test.tsx` is deleted after its assertions are
partitioned by the eight exact behavior suites above. Shared render builders and
fixtures live only in `pageEditorV2FlowFixtures.tsx`; each suite imports that
focused helper, remains independently runnable, and stays at most 1,000 physical
lines. `pagesClient.test.ts` retains non-pagination CRUD/cache behavior and the
new `pagesClientPagination.test.ts` owns every envelope/cursor/filter test, so
the current 943-line file cannot cross the gate. These are mandatory splits,
not conditional follow-up work.
The current 1,186-line `forms-pages-wave.test.tsx` is likewise deleted after its
shared mocks/builders move to `formsPagesWaveFixtures.tsx`, list/hook behavior
moves to `forms-list-page-wave.test.tsx`, and builder/detail behavior moves to
`form-builder-page-wave.test.tsx`. All three replacements remain independently
runnable and at most 1,000 physical lines.

The current 1,313-line `booking-page.test.tsx` is deleted after its shared
mocks/render builders move only to `bookingPageTestFixtures.tsx`. Assertion
ownership is exact: `booking-page-loading-pagination.test.tsx` owns initial/
cache/background loading, five-tab summary stability, filters, first/next/
previous/reset/end pagination; `booking-page-mutations.test.tsx` owns create,
edit, delete, status, conflict, dirty-state and mutation-error behavior; and
`booking-page-calendar.test.tsx` owns overview cards, quick actions, weekly
calendar, date navigation, timezone and layout behavior. The fixture module has
no tests. Each behavior suite imports it and is independently runnable.

The current 1,973-line `media-library.test.tsx` is deleted after shared mocks,
builders and render helpers move only to `mediaLibraryTestFixtures.tsx`.
`media-library-loading-pagination.test.tsx` owns loading/cache/revalidation,
filters, result modes and first/next/reset/end behavior;
`media-library-selection-folders.test.tsx` owns grid/list selection, folder
tree/descendants, folder mutations and selected-detail boundaries; and
`media-library-upload-edit.test.tsx` owns upload, edit, delete, progress, error
and dirty-dialog behavior. The helper has no tests; all three suites remain
independently runnable. Both legacy files must be absent at leaf completion,
all eight replacement/helper files are in this leaf's exact allowlist, and each
result is at most 1,000 physical lines. Shared runner manifest reconciliation is
deferred only to the family reconciliation owner; this leaf's explicit commands
below already invoke every replacement suite directly.

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
Every one—not only each page query—must have checked-in numeric small/large
receipts with finite rows-read, rows-returned, shared-buffer and normalized-p95
ceilings before this leaf dispatches. The aggregate
receipt may honestly budget a scan proportional to the 100,000-row authorized
fixture, but it cannot use “one result row” as a bounded-work claim. Any missing
receipt, unexpected growing-table scan, or failed numeric ceiling blocks L02 and
returns to the evidence owner for a contract amendment; this leaf neither adds a
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
name, projection, predicate/order, output bound and normalized rendered byte
string equals its L01 planned-shape row; the 32-member set is exact, so inline
or merged anonymous statements fail. Keep
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
  summary/facet fingerprints. Each resolves to a reviewed TASK-551-01 numeric
  small/large budget and TASK-551-05-L02 receipt; a missing/placeholder receipt
  or production/static shape-byte mismatch fails before execution. Assertions
  distinguish rows read from the one
  aggregate row returned and apply the checked-in rows/buffers/normalized-p95
  ceilings to each statement independently.
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
- Each of the eight owned clients is present in the L04 INITIAL authority
  manifest. Delay a request across an installation transition and prove its
  completion may return only to the initiating caller but cannot install; the
  registered reset clears all old/new maps and promises. L04's exhaustive FINAL
  matrix must accept this leaf's receipt without reopening these clients.
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
- Admin client module caches are availability optimizations only. L04's opaque
  installation token/reset seam prevents pre-transition promises from writing
  into a later deployment/auth audience; these clients do not infer RBAC from a
  cache hit.

## Validation Commands

- `set -a && source .env && set +a && bun test tests/integration/routes/task551BoundedAdminLists.test.ts tests/integration/routes/bookingRoutes.test.ts tests/integration/routes/forms.test.ts tests/integration/server/task551AdminWriteConcurrency.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/server/route-response-headers.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/paginationCursorLifecycle.test.ts`
- `bunx vitest run tests/vitest/admin/task551PaginatedClients.test.ts tests/vitest/admin/task551PaginatedListViews.test.tsx tests/vitest/admin/task551PaginatedConsumerGraphScreens.test.tsx tests/vitest/admin/task551PaginatedConsumerGraphEditors.test.tsx tests/vitest/admin/formsClient.test.ts tests/vitest/admin/bookingClient.test.ts tests/vitest/admin/mediaClient.test.ts tests/vitest/admin/mediaUtils.test.ts tests/vitest/admin/pagesClient.test.ts tests/vitest/admin/pagesClientPagination.test.ts tests/vitest/admin/detailPagesClient.test.ts tests/vitest/ui/booking-page-loading-pagination.test.tsx tests/vitest/ui/booking-page-mutations.test.tsx tests/vitest/ui/booking-page-calendar.test.tsx tests/vitest/ui/booking-tabs-interactions-wave.test.tsx tests/vitest/ui/booking-tabs-leaf.test.tsx tests/vitest/ui/booking-helpers.test.ts tests/vitest/ui/form-submissions-page.test.tsx tests/vitest/ui/media-library-loading-pagination.test.tsx tests/vitest/ui/media-library-selection-folders.test.tsx tests/vitest/ui/media-library-upload-edit.test.tsx tests/vitest/ui/media-picker.test.tsx tests/vitest/ui/forms-list-page-wave.test.tsx tests/vitest/ui/form-builder-page-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui-integration/forms-list-restyle.test.tsx tests/vitest/ui-integration/forms.test.tsx tests/vitest/ui-integration/forms-submissions-restyle.test.tsx tests/vitest/ui/page-revision-drawer.test.tsx tests/vitest/ui/page-editor-v2-loading-cache.test.tsx tests/vitest/ui/page-editor-v2-editing-dirty-state.test.tsx tests/vitest/ui/page-editor-v2-autosave-conflicts.test.tsx tests/vitest/ui/page-editor-v2-preview-device.test.tsx tests/vitest/ui/page-editor-v2-publish-revisions.test.tsx tests/vitest/ui/page-editor-v2-sections-blocks.test.tsx tests/vitest/ui/page-editor-v2-accessibility-navigation.test.tsx tests/vitest/ui/page-editor-v2-persistence-roundtrip.test.tsx tests/vitest/ui/detail-template-editor.test.tsx tests/vitest/validation/task551ListSchemas.test.ts`
- `set -a && source .env && set +a && bun test tests/perf/database-admin-list-budgets.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso`
- `bun run gates:coderso:perf`
- `bun run scan:security`
- `playwright-cli -s=wf55103l02` for the five visible-effect scenarios in light
  and dark mode, with zero console errors and the required screenshots

## Documentation Updates Required

No shared docs. Supply endpoint cursor/limit/error deltas and service split map
to TASK-551-10-L02; that closure leaf owns `_docs/CMS_API.md`, ORM docs, and
changelog 1263.

## Quantified Acceptance

- All seven collection families default to at most 50 and reject limits above
  100; no endpoint issues an unbounded select or uses offset pagination.
- All five additional booking collection contracts are bounded exactly as
  specified; form list SQL is owned by `formReadService`, and legacy
  `formsService.listForms` has zero production callers. Every form-list row has
  exactly `id,name,slug,status,description,submissionAccess,updatedAt`; current
  list filters/table work without N+1 or hidden detail fallback.
- Every representative 100k-row list request is at most 3 SQL statements and
  every page/fixed-summary/facet statement has its own checked-in L01/L02 numeric
  p95/row/buffer budget plus L05 sanitized-plan receipt; response size stays
  within its fixture budget. Fixed summaries return exactly one row without
  claiming one-row work, relation facets are bounded as declared, arbitrary
  filters use `matchingTotal:null` plus `hasMore`, and no displayed global metric
  changes while traversing pages.
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
- The complete seven-client graph has no remaining array assumption,
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
