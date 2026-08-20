# Admin Cache Map (Routes -> Files -> Cached APIs)

This file maps admin UI surfaces to their implementation files and the cached API calls they rely on.

## Dashboard
- Configurable Dashboard
  - UI: `core/admin/ui/dashboard/DashboardPage.tsx`,
    `DashboardBuilder.tsx`, `DashboardWidgetHost.tsx`
  - Cached APIs: `getDashboardLayoutCached`, `getCachedDashboardLayout`,
    `getDashboardWidgetDataCached`, `getCachedDashboardWidgetData`
  - Draft preview: `resolveDashboardWidgetData` / `previewDashboardWidgetData`
    uses `POST /dashboard/widget-data` and is intentionally uncached
  - Mutations: `saveDashboardLayout`, `resetDashboardLayout`
  - Cache bus: `dashboard:layout`, `dashboard:widgetData`
  - Permission gate: read/model data requires `content:read`; customize/save
    controls require `dashboard:write`.

## Pages
- Pages list
  - UI: `core/admin/ui/pages/PageListPage.tsx`
  - Cached APIs: `listPagesCached`, `getCachedPages`
- Page editor
  - UI: `core/admin/ui/pages/PageEditor.tsx`
  - Cached APIs: `getPageCached`, `getCachedPageDetail`
  - Data shape: cached page detail `currentData`/`publishedData` are
    `PageDocumentV2` documents with `schemaVersion: 2` and `sections[]`.
    Legacy/versionless Page rows are normalized to an empty v2 document by the
    service before they reach the admin cache.

## Posts
- Posts list
  - UI: `core/admin/ui/posts/PostsListPage.tsx`
  - Cached APIs: `listPostsCached`, `getCachedPosts`
  - Cache bus: `posts:list`, `posts:detail:<id>`
  - Authority: an in-flight list is reconciled against newer detail/list-row
    publications and delete tombstones before it becomes the cached list.
- Post editor
  - UI: `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`,
    `core/admin/ui/posts/editor/PostClassicEditorShell.tsx`
  - Cached APIs: `getPostCached`, `getCachedPostDetail`,
    `listPostRevisionsCached`, `getCachedPostRevisions`
  - Cache bus: `posts:list`, `posts:detail:<id>`, `posts:revisions:<id>`
  - Mutation authority: detail generations/read sequences and per-id tombstones
    reject stale metadata, autosave, restore, and status continuations; a
    still-authoritative failed reconciliation emits ordered list/detail
    invalidations.
  - Hydration: Classic editor cache continuations defer while a mutation lease
    owns the route identity, preserving dirty metadata and remote-update state.

## Content Entries
- Entries list
  - UI: `core/admin/ui/entries/EntryList.tsx`
  - Cached APIs: `listContentTypesCached`, `listAllEntriesCached`, `getCachedAllEntries`
  - Mutations: `duplicateEntry`, `deleteEntry`, `updateEntryMetadata`, `restoreEntryRevision`
  - Cache bus: `entries:list:all`, `entries:list:<typeSlug>`, `entries:detail:<typeSlug>:<id>`,
    `entries:revisions:<id>`
  - Type-scoped authority: one monotonic order spans complete
    `entries:list:<typeSlug>` reads, per-entry details, successful mutations, and
    delete tombstones. Older lists preserve newer authority for the same entry while
    still filling unrelated rows; authoritative list omission clears an observed
    detail only when no newer per-entry publication exists.
  - Failure/clear: rejected work publishes nothing, successful mutations alone emit
    their cache events, and `clearEntriesCache(typeSlug)` prevents captured pre-clear
    list/detail promises from publishing.
- Entry editor
  - UI: `core/admin/ui/entries/EntryEditor.tsx`
  - Cached APIs: `listContentTypesCached`, `getEntryCached`, `getCachedEntryDetail`,
    `listEntryRevisionsCached`, `getCachedEntryRevisions` (metadata-only page,
    no `data`), `getEntryRevisionData` (narrow on-demand detail read for the
    revision drawer preview; NOT cached)
  - Mutations: `updateEntry`, `updateEntryMetadata`, `deleteEntry`, `restoreEntryRevision`
  - Cache bus: `entries:list:<typeSlug>`, `entries:detail:<typeSlug>:<id>`,
    `entries:revisions:<id>`

## Forms
- Forms list
  - UI: `core/admin/ui/forms/FormListPage.tsx`
  - Cached APIs: `listFormsCached`, `getCachedForms`
  - Mutations: `createForm`, `updateForm`, `deleteForm`
  - Cache bus: `forms:list`, `forms:detail:<id>`
- Form editor
  - UI: `core/admin/ui/forms/FormBuilderPage.tsx`
  - Cached APIs: `getFormDetailCached`, `getCachedFormDetail`, `listFormActionsCached`, `getCachedFormActions`, `listContentTypesCached`
- Form action logs
  - UI: `core/admin/ui/forms/FormActionLogsPage.tsx`
  - Cached APIs: `listFormActionRuns` (`forms:action-runs:<id>` storage cache key)

## Listings
- Listings list + templates tab
  - UI: `core/admin/ui/listings/ListingListPage.tsx`
  - Cached APIs: `listListingQueriesCached`, `getCachedListingQueries`, `listListingTemplatesCached`, `getCachedListingTemplates`
  - Hydration: query and template caches hydrate independently on mount; cache
    hits revalidate in the background, cache misses show foreground loading, and
    cache-bus events refresh in the background.
- Listings editor
  - UI: `core/admin/ui/listings/ListingEditorPage.tsx`
  - Cached APIs: `getListingQueryCached`, `listListingTemplatesCached`, `listContentTypesCached`

## Commerce
- Commerce product catalog list
  - UI: `core/admin/ui/commerce/CommerceListPage.tsx`
  - Cached APIs: `listCommerceProductsCached`, `getCachedCommerceProducts`,
    `listCommerceCollectionsCached`, `getCachedCommerceCollections`
  - Mutations: `updateCommerceProduct`, `deleteCommerceProduct`
  - Cache bus: `commerce:products:list`, `commerce:collections:list`
  - Hydration: product and collection caches hydrate independently on mount;
    cache misses show foreground loading, and cache-bus events refresh in the
    background while preserving visible rows.
- Commerce product editor
  - UI: `core/admin/ui/commerce/CommerceEditorPage.tsx`
  - Cached APIs: `getCommerceProductCached`, `getCachedCommerceProduct`,
    `listCommerceCollectionsCached`
- Commerce collections manager (TASK-488)
  - UI: `core/admin/ui/commerce/CommerceCollectionsPage.tsx`
  - Cached APIs: `listCommerceCollectionsCached`, `getCachedCommerceCollections`
  - Mutations: `createCommerceCollection`, `updateCommerceCollection`,
    `deleteCommerceCollection`
  - Cache bus: `commerce:collections:list` (update on create/update,
    invalidate on delete; the manager re-reads with `{ force: true }` after
    each mutation)

## Engagement
- Popups list
  - UI: `core/admin/ui/popups/PopupsListPage.tsx`
  - Cached APIs: `listPopupsCached`, `getCachedPopups`
- Popup editor
  - UI: `core/admin/ui/popups/PopupEditorPage.tsx`
  - Cached APIs: `getPopupCached`, `getCachedPopup`
- Reviews moderation
  - UI: `core/admin/ui/reviews/ReviewsModerationPage.tsx`
  - Cached APIs: `listReviewsCached`, `getCachedReviews`

## Content Types
- Content types list
  - UI: `core/admin/ui/content-types/ContentTypeList.tsx`
  - Cached APIs: `listContentTypesCached`, `getCachedContentTypes`
  - Mutations: create, duplicate, delete update or invalidate `contentTypes:list`
  - Assistant mutations: `content-type.upsert`, `content-type.field.add`, and
    `content-type.delete` invalidate `contentTypes:list`
- Content type editor
  - UI: `core/admin/ui/content-types/ContentTypeEditor.tsx`
  - Cached APIs: `getContentTypeCached`, `listContentTypesCached`
  - Mutations: save draft, publish, duplicate, delete update or invalidate
    `contentTypes:detail:<id>` and `contentTypes:list`
  - Assistant mutations: `content-type.field.add` invalidates the touched
    `contentTypes:detail:<id>` and `contentTypes:list` keys
- Schema builder
  - UI: `core/admin/ui/content-types/SchemaBuilderPage.tsx`
  - Cached APIs: `listContentTypesCached`, `getContentTypeCached`
- Collection workspace
  - UI: `core/admin/ui/content-types/CollectionWorkspacePage.tsx`,
    `CollectionOverview.tsx`, `CollectionReadinessChecklist.tsx`
  - Cached APIs: `getContentTypeCollectionWorkspaceCached`,
    `getCachedContentTypeCollectionWorkspace`, `listContentTypesCached`
  - Cache bus: `contentTypes:collectionWorkspace:<contentTypeId>`,
    `contentTypes:detail:<contentTypeId>`, `contentTypes:list`
  - Prefetch: `/advanced/engine/:contentTypeId/collection` uses a predicate
    prefetch matcher before the generic `/advanced/engine` prefix and warms the
    workspace summary with `{ force: false }`
  - Detail template prefetch:
    `/advanced/engine/:contentTypeId/collection/detail-template/:detailPageId`
    warms the workspace summary, detail-page record, content-types list, and
    bounded sample entries with `{ force: false }`

## Detail Pages
- Detail-page admin client
  - UI: collection workspace and detail-template editor surfaces
  - Cached APIs: `listDetailPagesCached`, `getDetailPageCached`,
    `getCachedDetailPages`, `getCachedDetailPage`
  - Mutations: `createDetailPage`, `updateDetailPage`, `deleteDetailPage`,
    `publishDetailPage`, `unpublishDetailPage`, `restoreDetailPageRevision`
  - Lifecycle/revisions: `previewDetailPage`, `autosaveDetailPage`,
    `listDetailPageRevisions`, `discardDetailPageRevision`
  - Cache bus: `detailPages:list`,
    `detailPages:list:contentType:<contentTypeId>`,
    `detailPages:detail:<id>`
  - Assistant execution: `detail-page.upsert` emits the same list/detail cache
    events as manual admin mutations

## Custom Screens
- Screens list
  - UI: `core/admin/ui/custom-screens/CustomScreenListPage.tsx`
  - Cached APIs: `listCustomScreensCached`, `getCachedCustomScreens`,
    `listContentTypesCached`, `getCachedContentTypes`
  - Record metadata: cached custom screen rows preserve nullable
    `collectionRole` / `compositionKey` from the custom-screen owner seam for
    later workspace resolution; legacy cached rows normalize missing values to
    `null`
  - Data shape: cached custom screen rows use `schemaVersion: 4` plus V4
    `definition`; legacy `blocks` / `bindings` are read-migration inputs and
    are not active browser write state.
  - Mutations: `createCustomScreen`, `updateCustomScreen`,
    `deleteCustomScreen`
  - List/detail authority: one monotonic order spans complete list reads, per-screen
    detail reads, successful create/update publications, and delete tombstones. Older
    lists preserve newer same-screen authority while still accepting unrelated rows;
    authoritative omission cleans up observed details without replacing newer values.
    A detail fallback publishes/reconciles the complete returned list, not only the
    requested screen.
  - Failure/clear: reads that ultimately reject and rejected mutations
    publish/broadcast nothing;
    `clearCustomScreensCache()` clears tracked list/detail/pending/authority state and
    prevents captured pre-clear list/detail publishers from settling into cache, with
    corrupt stored-list discovery handled fail-safe.
  - Assistant mutations: `custom-screen.upsert`, `custom-screen.update`,
    `custom-screen.delete`, `custom-screen.section.add`,
    `custom-screen.block.add`, `custom-screen.block.patch`,
    `custom-screen.block.move`, `custom-screen.block.remove`,
    `custom-screen.binding.set`, and `custom-screen.list-view.patch` invalidate
    the same list/detail keys through lightweight cache helpers.
  - Cache bus: `customScreens:list`, `contentTypes:list` for label projection
  - Prefetch: `/advanced/custom-screens` warms both `customScreens:list` and
    `contentTypes:list`
- Custom screen builder and records workflow
  - UI: `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`,
    `ListViewDesigner.tsx`, `ListViewCanvas.tsx`,
    `ListViewElementLibrary.tsx`, `ListViewColumnInspector.tsx`,
    `CustomScreenWorkspacePreviewDialog.tsx`,
    `CustomScreenEntriesPage.tsx`, `CustomScreenEntriesTable.tsx`,
    `CustomScreenEntryEditor.tsx`, `CustomScreenEntryCanvas.tsx`
  - Cached APIs: `getCustomScreenCached`, `getCachedCustomScreen`,
    `listCustomScreensCached`, `listContentTypesCached`, `listEntriesCached`,
    `getEntryCached`, `listMediaCached`, `getScreenEntryOverridesCached`,
    `getCachedScreenEntryOverrides`; Screen entry preferences intentionally use
    isolated `getUserSettingIsolated` / `setUserSettingIsolated` transport rather
    than the aggregate user-settings cache
  - Preview owner: `customScreenPreviewData.ts` reuses
    `entries:list:<typeSlug>` for cached-first first-record hydration in both
    the builder canvas and the preview dialog
  - Mutations: `updateCustomScreen`, `createEntry`, `updateEntry`,
    `deleteEntry`, `replaceScreenEntryOverrides`,
    `invalidateScreenEntryOverrides`
  - Cache bus: `customScreens:list`, `customScreens:detail:<id>`,
    `contentTypes:list`, `entries:list:<typeSlug>`,
    `entries:detail:<typeSlug>:<entryId>`,
    `customScreens:entryOverrides:<screenId>:<entryId>` for presentation
    override cache updates and invalidation. The shared bus publishes canonical
    and legacy transport copies during compatibility migration, correlates
    those copies to one remote delivery, and reports `local` or `remote`
    origin. Same-context builder saves may attach a local-only symbol operation
    token; origin/token metadata is never serialized and is absent from remote
    delivery.
  - Retry/identity: related targets, media, and override reads publish
    only from the exact request that still owns their pending slot. Rejections
    release that slot; forced/newer requests and successful mutations cannot be
    cleared or overwritten by older settlements. Related target changes clear
    stale rows immediately; same-target cache refresh keeps the last good rows
    while the refresh is pending.
  - Dirty safety: Screen document/binding drafts and entry
    content/presentation drafts use the shared navigation/`beforeunload` guard.
    Background cache events never replace dirty state. Builder detail mutation
    events carry a non-serialized operation token so its own save event is not
    misclassified as an external revision; independent detail events remain
    visible and require authoritative reconciliation.
  - Record presentation: `CustomScreenEntryEditor.tsx` hydrates entry content
    and per-record presentation overrides independently. Content edits continue
    through `entriesClient`; text/media presentation saves use
    `PATCH /admin/api/custom-screens/:screenId/entries/:entryId/overrides`.
    Direct image overrides and media-field values stay as media UUIDs in caches;
    only an ephemeral winning-ID map carries resolved safe URLs to the renderer.
  - Entry preference: `useScreenEntryPreferences.ts` stores
    `{version:1, showFieldMetadata:boolean}` at
    `customScreens.entry.preferences` through the existing user-settings route.
    In-memory snapshots are keyed by authenticated user and pruned after the
    bounded settled handoff; auth-identity epochs cancel old-user queues. There
    is no Screen preference cache-bus key, aggregate-cache merge, or
    `localStorage` value. An unauthenticated hook keeps only mount-local state.
  - Prefetch: `/advanced/custom-screens/:screenId/entries` warms screen,
    content type list, and the assigned entries list. Detail routes warm the
    entry detail cache except for `entries/new`.
- Advanced sidebar shortcuts
  - UI: `core/admin/ui/layouts/AdminShell.tsx`
  - Cached APIs: `listCustomScreensCached`
  - Cache bus: `customScreens:list`
  - Permission gate: shortcut cache hydration and revalidation require
    `content:read`; unauthorized shells keep shortcuts empty and do not call the
    endpoint.
  - Shortcut gate: only active screens with `supportsDedicatedEditor=true`
    become sidebar workspace links
- Advanced solution-kit nav context
  - UI: `core/admin/ui/layouts/AdminShell.tsx`
  - Cached APIs: `listSolutionKitsCached`
  - Permission gate: hydration and revalidation require `solution-kits:read`;
    users without that permission keep default Advanced nav context without a
    solution-kit list fetch.

## Page Templates
- Templates list
  - UI: `core/admin/ui/pages/templates/PageTemplatesPage.tsx` (+ hook
    `core/admin/ui/pages/templates/usePageTemplates.ts`)
  - Cached APIs: `listPageTemplatesCached`, `getCachedPageTemplates`
  - Mutations: `createPageTemplate`, `duplicatePageTemplate`,
    `deletePageTemplate`
  - Cache bus: `pageTemplates:list`, `pageTemplates:detail:<id>`
- Template editor (shared Page Editor v2 surface via editor host)
  - UI: `core/admin/ui/pages/templates/PageTemplateEditorPage.tsx`
  - Cached APIs: `getPageTemplateCached`, `getCachedPageTemplateDetail`
  - Mutations: `updatePageTemplate` (document + metadata), `previewPageTemplate`
  - Cache bus: `pageTemplates:detail:<id>` background revalidation with
    dirty-state protection
- Page editor insert picker (published templates)
  - UI: `core/admin/ui/pages/PageEditor.tsx` (command palette group)
  - Cached APIs: `listPageTemplatesCached`, `getPageTemplateCached`


## Media
- Media library
  - UI: `core/admin/ui/media/MediaLibraryPage.tsx`,
    `core/admin/ui/media/MediaFolderRail.tsx`
  - Cached APIs: `listMediaCached`, `getCachedMedia`,
    `getCachedMediaForEvent`, `listMediaFoldersCached`,
    `getCachedMediaFolders`, `getCachedMediaFoldersForEvent`
  - Mutating cached APIs: `uploadMedia`, `updateMedia`,
    `recoverMediaDimensions`, `replaceMedia`, `deleteMedia`,
    `createMediaFolder`, `updateMediaFolder`, `reorderMediaFolders`,
    `deleteMediaFolder`
  - Folder cache shape: `media:folders` stores only validated six-field folder
    projections; malformed persisted rows evict and malformed network responses
    reject with `media_folders_response_invalid` without priming cache.
  - Cache bus: `media:list` update events hydrate from patched cache; explicit
    refresh/true invalidation may reload the list. Successful folder mutations
    clear/broadcast `media:folders`; folder delete also broadcasts `media:list`.
    Rejected mutations preserve cache and emit nothing.
  - Folder event hydration: every same-tab/cross-tab `media:folders` event forces
    a fresh GET. Events overlapping manual Retry are queued; load/operation
    generations preserve the last good tree, retained form/selection/order, and
    visible retry state until successful reconciliation.
  - Read-only uncached API: `getMediaUsage`
- Media picker
  - UI: `core/admin/ui/media/MediaPicker.tsx`
  - Cached APIs: `listMediaCached`, `getCachedMedia`
  - Cache policy: closed/no-selection state does not fetch; selected/open state reuses fresh `media:list` before network fallback

## Menus / Themes / Site Settings
- Menus list
  - UI: `core/admin/ui/menus/MenuListPage.tsx`
  - Cached APIs: `listMenusCached`, `getCachedMenus`
- Site shell dialog (Menus surface, TASK-458-01)
  - UI: `core/admin/ui/menus/SiteShellDialog.tsx` (wraps the presentational
    `core/admin/ui/site/SiteShellCard.tsx`)
  - Cached APIs: `getSiteSettingsCached`, `getCachedSiteSettings`,
    `listMenusCached`, `getCachedMenus`, `listPageTemplatesCached`,
    `getCachedPageTemplates`
  - Cache policy: all reads are LAZY on dialog open (no page-mount or
    prefetch warmup beyond the existing `/menus` -> `menus:list` entry);
    cached values hydrate instantly and settings revalidate in the background
    on open. Save issues a scoped partial settings PATCH carrying exactly
    `site.navigationMenuId` + `site.footerTemplateId`, which primes
    `settings:redacted` and broadcasts the standard `settings:redacted`
    update event.
- Menu editor
  - UI: `core/admin/ui/menus/MenuEditorPage.tsx`
  - Cached APIs: `getMenuWithItemsCached`, `getCachedMenuDetail`, `listPagesCached`, `getCachedPages`
- Search
  - UI: `core/admin/ui/search/SearchPage.tsx`,
    `core/admin/ui/search/useSearchResults.ts`
  - Cached APIs: `listRecentSearchesCached`, `getCachedRecentSearches`,
    `searchAllCached`, `getCachedSearchResults`
  - Cache keys: `search:recent`,
    `search:results:<boundedQuery>:limit:<limit>:date:<dateRange>`
  - Hydration: recent searches hydrate immediately; result caches are keyed by
    query, limit, and date range, then revalidated through explicit searches.
- SEO manager
  - UI: `core/admin/ui/seo/SeoManagerPage.tsx`
  - Cached APIs: `listSeoCached`, `getCachedSeo`, `getSeoCached`,
    `getCachedSeoDetail`
  - Mutations: SEO save/audit update list/detail caches and clear public HTML
    cache so saved metadata reaches public rendering.
  - Cache bus: `seo:list`, `seo:detail:<id>`
- Analytics
  - UI: `core/admin/ui/analytics/AnalyticsPage.tsx`
  - Cached APIs: `getOverviewCached`, `getCachedOverview`,
    `getTopContentCached`, `getCachedTopContent`,
    `getTrafficOverviewCached`, `getCachedTrafficOverview`,
    `getTopPagesCached`, `getCachedTopPages`
  - Cache keys: `analytics:overview:<rangeDays>`,
    `analytics:topContent:<rangeDays>:<limit>:<type>`,
    `analytics:traffic:overview:<rangeDays>` (TTL `detail`),
    `analytics:traffic:topPages:<rangeDays>:<limit>` (TTL `list`)
  - Hydration: selected range hydrates from cache when available and
    background refreshes preserve the visible table/card state. The real
    traffic overview/Top Pages caches follow the same range-scoped read-only
    pattern; the public ingestion beacon never invalidates admin caches.
    `exportTopPages` (`/analytics/traffic/top-pages/export`) is a direct CSV
    fetch and is not cached.
- Backups
  - UI: `core/admin/ui/backups/BackupsPage.tsx`
  - Cached APIs: `listBackupsCached`, `getCachedBackups`,
    `getBackupScheduleCached`, `getCachedBackupSchedule`
  - Cache keys: `backups:list:<page>:<limit>:<boundedQuery>`,
    `backups:schedule`
  - Mutations: create, delete, restore, and schedule updates patch cache pages
    only when local row/totals can remain correct; affected pages whose
    pagination can shift are invalidated through cache-bus events.
  - Security: browser cache redacts local artifact paths to
    `artifactPath: "local"` and never stores backup download content.
- Import / Export
  - UI: `core/admin/ui/import-export/ImportExportPage.tsx`,
    `core/admin/ui/import-export/ImportDropzone.tsx`
  - Cached APIs: `listImportHistoryCached`, `getCachedImportHistory`,
    `writeImportHistoryCache`
  - Cache key: `tools:import:history`
  - Cache scope: Recent Imports is browser-local activity history; export
    bundle payloads and uploaded bundle contents are not cached.
  - Mutations: successful import invalidates only the imported resource-family
    caches, including menus, admin themes, and redirects when present in the
    bundle scope.
- Redirects
  - UI: `core/admin/ui/redirects/RedirectsPage.tsx`,
    `core/admin/ui/redirects/RedirectsTable.tsx`,
    `core/admin/ui/redirects/RedirectDrawer.tsx`
  - Cached APIs: `listRedirectsCached`, `getCachedRedirects`
  - Mutations: `createRedirect`, `updateRedirect`, and `deleteRedirect` patch
    or remove rows from `redirects:list` and broadcast cache-bus updates.
  - Cache bus: `redirects:list`
- Admin UI themes
  - UI: `core/admin/ui/themes/ThemesPage.tsx`
  - Cached APIs: `listAdminThemeTemplatesCached`, `getCachedAdminThemeTemplates`, `listAdminThemeProfilesCached`, `getCachedAdminThemeProfiles`
  - Shell token refresh: `core/admin/app/AdminApp.tsx` uses cached theme
    template/profile reads only when the current permission snapshot has
    `themes:read`; otherwise stored/default tokens render without network
    refresh.
- Theme editor
  - UI: `core/admin/ui/themes/ThemeEditorPage.tsx`
  - Cached APIs: `listPagesCached`
- General / Assistant settings
  - UI: `core/admin/app/AdminApp.tsx`,
    `core/admin/ui/settings/GeneralSettingsPage.tsx`,
    `core/admin/ui/settings/AssistantSettingsPage.tsx`
  - Cached APIs: `getSettingsCached`, `getCachedSettings`
  - Cache bus: `settings:redacted`
  - Prefetch: `/settings` warms `settings:redacted`
- Site settings
  - UI: `core/admin/ui/site/SiteSettingsPage.tsx` (the Site shell card moved
    to the Menus-surface `SiteShellDialog`, TASK-458-01; this page no longer
    reads or writes `site.navigationMenuId` / `site.footerTemplateId`)
  - Cached APIs: `getSiteSettingsCached`, `getCachedSiteSettings`,
    `listPagesCached`, `getCachedPages`, `listContentTypesCached`,
    `getCachedContentTypes`
  - Cache bus: `settings:redacted`, `pages:list`, `contentTypes:list`
  - Prefetch: `/settings/site` warms `settings:redacted`, `pages:list`, and
    `contentTypes:list` with `{ force: false }`
  - Server-side invalidation trigger: settings writes/deletes touching
    `site.navigationMenuId` or `site.footerTemplateId` clear the server-side
    public site HTML cache (`clearSiteCache()` via
    `core/services/settings/settingsService.ts`) because cached public pages
    embed the rendered site shell
  - Safety: only redacted/non-secret Settings values are stored in
    `settings:redacted`; credential-bearing Settings endpoints remain uncached
    in browser storage.

## Removed v1 widget surface (TASK-580)

The historical `core/admin/ui/widgets` namespace and its editor controls were
removed with the v1 widget kernel (TASK-580). Surviving render contracts live
under `core/services/renderContracts/*` and are consumed by the Page V2
pipeline; they are not a generic editor extension point.

## Content Editor Fields
- Relation field suggestions
  - UI: `core/admin/ui/entries/FieldRenderer.tsx`
  - Cached APIs: `listEntriesCached`


## Prefetch Routes
- `/pages` -> `listPagesCached`
- `/advanced/page-templates` -> `listPageTemplatesCached`
- `/advanced/engine/:contentTypeId/collection/detail-template/:detailPageId` -> `getContentTypeCollectionWorkspaceCached`, `getDetailPageCached`, `listContentTypesCached`, optional `listEntriesCached`
- `/advanced/engine/:contentTypeId/collection` -> `listContentTypesCached`, `getContentTypeCollectionWorkspaceCached`
- `/advanced/engine` -> `listContentTypesCached`
- `/advanced/entries` -> `listContentTypesCached`, `listAllEntriesCached`
- `/advanced/custom-screens` -> `listCustomScreensCached`, `listContentTypesCached`
- `/advanced/custom-screens/:screenId/entries/:entryId?` -> `listCustomScreensCached`, `getCustomScreenCached`, `listContentTypesCached`, `listEntriesCached`, optional `getEntryCached`
- `/advanced/forms` -> `listFormsCached`
- `/advanced/listings` -> `listListingQueriesCached`, `listListingTemplatesCached`
- `/advanced/filters` -> `listListingQueriesCached`
- `/advanced/search` -> `listListingQueriesCached`
- `/advanced/booking` -> `listBookingResourcesCached`, `listBookingServicesCached`, `listBookingReservationsCached`, `listBookingBlackoutsCached`
- `/advanced/commerce` -> `listCommerceProductsCached`, `listCommerceCollectionsCached`
- `/advanced/popups` -> `listPopupsCached`
- `/advanced/reviews` -> `listReviewsCached`
- `/advanced/solution-kits` -> `listSolutionKitsCached`, `listSolutionKitRunsCached`
- `/menus` -> `listMenusCached`
- `/media` -> `listMediaCached`
- `/themes` -> `listAdminThemeTemplatesCached`, `listAdminThemeProfilesCached`
- `/search` -> `listRecentSearchesCached`
- `/seo` -> `listSeoCached`
- `/analytics` -> `getOverviewCached`, `getTopContentCached`, `getTrafficOverviewCached`
- `/backups` -> `listBackupsCached`, `getBackupScheduleCached`
- `/tools/import-export` -> `listImportHistoryCached`
- `/redirects` -> `listRedirectsCached`
- `/settings` -> `getSettingsCached`
- `/settings/site` -> `getSiteSettingsCached`, `listPagesCached`, `listContentTypesCached`
