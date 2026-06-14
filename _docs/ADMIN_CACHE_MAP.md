# Admin Cache Map (Routes -> Files -> Cached APIs)

This file maps admin UI surfaces to their implementation files and the cached API calls they rely on.

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
- Post editor
  - UI: `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
  - Cached APIs: `getPostCached`, `getCachedPostDetail`,
    `listPostRevisionsCached`, `getCachedPostRevisions`
  - Cache bus: `posts:list`, `posts:detail:<id>`, `posts:revisions:<id>`

## Content Entries
- Entries list
  - UI: `core/admin/ui/entries/EntryList.tsx`
  - Cached APIs: `listContentTypesCached`, `listAllEntriesCached`, `getCachedAllEntries`
  - Mutations: `duplicateEntry`, `deleteEntry`, `updateEntryMetadata`
  - Cache bus: `entries:list:all`, `entries:list:<typeSlug>`, `entries:detail:<typeSlug>:<id>`
- Entry editor
  - UI: `core/admin/ui/entries/EntryEditor.tsx`
  - Cached APIs: `listContentTypesCached`, `getEntryCached`, `getCachedEntryDetail`
  - Mutations: `updateEntry`, `updateEntryMetadata`, `deleteEntry`
  - Cache bus: `entries:list:<typeSlug>`, `entries:detail:<typeSlug>:<id>`

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
  - Mutations: `createCustomScreen`, `updateCustomScreen`,
    `deleteCustomScreen`
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
    `getEntryCached`
  - Preview owner: `customScreenPreviewData.ts` reuses
    `entries:list:<typeSlug>` for cached-first first-record hydration in both
    the builder canvas and the preview dialog
  - Mutations: `updateCustomScreen`, `createEntry`, `updateEntry`,
    `deleteEntry`
  - Cache bus: `customScreens:list`, `customScreens:detail:<id>`,
    `contentTypes:list`, `entries:list:<typeSlug>`,
    `entries:detail:<typeSlug>:<entryId>`
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

## Widgets
- Widget insert dialog
  - UI: `core/admin/ui/widgets/WidgetInsertDialog.tsx`
  - Cached APIs: `getPageCached`
- Widget library
  - UI: `core/admin/ui/widgets/WidgetLibraryPage.tsx`
  - Cached APIs: `listWidgetCatalogCached`, `getCachedWidgetCatalog`, `listPagesCached`, `getCachedPages`, `getPageCached`
  - UI state: section dropdown, table/grid mode, pagination, and selected row ids
    are shell-owned; only catalog/page data comes from cache.
  - Cache bus: `widgetCatalog:list` and `pages:list` refresh the section-aware
    model in the background.


## Media
- Media library
  - UI: `core/admin/ui/media/MediaLibraryPage.tsx`
  - Cached APIs: `listMediaCached`, `getCachedMedia`, `getCachedMediaForEvent`
  - Mutating cached APIs: `uploadMedia`, `updateMedia`, `recoverMediaDimensions`, `replaceMedia`, `deleteMedia`
  - Cache bus: `media:list` update events hydrate from patched cache; explicit refresh/true invalidation may reload the list
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
    `getTopContentCached`, `getCachedTopContent`
  - Cache keys: `analytics:overview:<rangeDays>`,
    `analytics:topContent:<rangeDays>:<limit>:<type>`
  - Hydration: selected range hydrates from cache when available and
    background refreshes preserve the visible table/card state.
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

## Widget Editors (data selectors)
- Hero
  - UI: `core/admin/ui/widgets/editors/HeroEditors.tsx`
  - Cached APIs: `listMediaCached`
- Navigation
  - UI: `core/admin/ui/widgets/editors/NavigationEditors.tsx`
  - Cached APIs: `listMediaCached`
- Content list
  - UI: `core/admin/ui/widgets/editors/ContentListEditors.tsx`
  - Cached APIs: `listContentTypesCached`, `listEntriesCached`
- Entry teaser
  - UI: `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx`
  - Cached APIs: `listContentTypesCached`, `listEntriesCached`

## Content Editor Fields
- Relation field suggestions
  - UI: `core/admin/ui/entries/FieldRenderer.tsx`
  - Cached APIs: `listEntriesCached`


## Prefetch Routes
- `/pages` -> `listPagesCached`
- `/advanced/widgets` -> `listWidgetCatalogCached`, `listWidgetTemplateCategoriesCached`, `listWidgetTemplatesCached`
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
- `/analytics` -> `getOverviewCached`, `getTopContentCached`
- `/backups` -> `listBackupsCached`, `getBackupScheduleCached`
- `/tools/import-export` -> `listImportHistoryCached`
- `/redirects` -> `listRedirectsCached`
- `/settings` -> `getSettingsCached`
- `/settings/site` -> `getSiteSettingsCached`, `listPagesCached`, `listContentTypesCached`
