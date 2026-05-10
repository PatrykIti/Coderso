# Admin Cache Map (Routes -> Files -> Cached APIs)

This file maps admin UI surfaces to their implementation files and the cached API calls they rely on.

## Pages
- Pages list
  - UI: `core/admin/ui/pages/PageListPage.tsx`
  - Cached APIs: `listPagesCached`, `getCachedPages`
- Page editor
  - UI: `core/admin/ui/pages/PageEditor.tsx`
  - Cached APIs: `getPageCached`, `getCachedPageDetail`

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
- Content type editor
  - UI: `core/admin/ui/content-types/ContentTypeEditor.tsx`
  - Cached APIs: `getContentTypeCached`, `listContentTypesCached`
  - Mutations: save draft, publish, duplicate, delete update or invalidate
    `contentTypes:detail:<id>` and `contentTypes:list`
- Schema builder
  - UI: `core/admin/ui/content-types/SchemaBuilderPage.tsx`
  - Cached APIs: `listContentTypesCached`, `getContentTypeCached`

## Detail Pages
- Detail-page admin client
  - UI: future collection workspace and detail-template editor surfaces
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
  - Shortcut gate: only active screens with `supportsDedicatedEditor=true`
    become sidebar workspace links

## Widget Templates
- Template editor
  - UI: `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
  - Cached APIs: `getWidgetTemplateCached`, `listWidgetTemplateCategoriesCached`, `getCachedWidgetTemplateCategories`
- Templates list hook
  - UI: `core/admin/ui/widgets/hooks/useWidgetTemplates.ts`
  - Cached APIs: `listWidgetTemplatesCached`, `getCachedWidgetTemplates`
  - Mutations: `deleteWidgetTemplate`, `duplicateWidgetTemplate`
  - Cache bus: `widgetTemplates:list`, `widgetCatalog:list`,
    `widgetTemplates:detail:<id>`
- Widget insert dialog
  - UI: `core/admin/ui/widgets/WidgetInsertDialog.tsx`
  - Cached APIs: `getWidgetTemplateCached`, `getPageCached`
- Widget library
  - UI: `core/admin/ui/widgets/WidgetLibraryPage.tsx`
  - Cached APIs: `listWidgetCatalogCached`, `getCachedWidgetCatalog`, `listWidgetTemplateCategoriesCached`, `getCachedWidgetTemplateCategories`, `listPagesCached`, `getCachedPages`, `getPageCached`
  - UI state: section dropdown, table/grid mode, pagination, and selected row ids
    are shell-owned; only catalog/category/page data comes from cache.
  - Cache bus: `widgetCatalog:list`, `widgetTemplateCategories:list`, and
    `pages:list` refresh the section-aware model in the background.


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
- Menu editor
  - UI: `core/admin/ui/menus/MenuEditorPage.tsx`
  - Cached APIs: `getMenuWithItemsCached`, `getCachedMenuDetail`, `listPagesCached`, `getCachedPages`
- SEO manager
  - UI: `core/admin/ui/seo/SeoManagerPage.tsx`
  - Cached APIs: none; consumes cache bus events for assistant/direct SEO mutations
  - Cache bus: `seo:list`, `seo:detail:<id>`
- Admin UI themes
  - UI: `core/admin/ui/themes/ThemesPage.tsx`
  - Cached APIs: `listAdminThemeTemplatesCached`, `getCachedAdminThemeTemplates`, `listAdminThemeProfilesCached`, `getCachedAdminThemeProfiles`
- Theme editor
  - UI: `core/admin/ui/themes/ThemeEditorPage.tsx`
  - Cached APIs: `listPagesCached`
- Site settings
  - UI: `core/admin/ui/site/SiteSettingsPage.tsx`
  - Cached APIs: `listPagesCached`, `listContentTypesCached`

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
- `/advanced/engine` -> `listContentTypesCached`
- `/advanced/entries` -> `listContentTypesCached`, `listAllEntriesCached`
- `/advanced/forms` -> `listFormsCached`
- `/advanced/listings` -> `listListingQueriesCached`, `listListingTemplatesCached`
- `/advanced/filters` -> `listListingQueriesCached`
- `/advanced/search` -> `listListingQueriesCached`
- `/advanced/booking` -> `listBookingResourcesCached`, `listBookingServicesCached`, `listBookingReservationsCached`, `listBookingBlackoutsCached`
- `/advanced/reviews` -> `listReviewsCached`
- `/advanced/commerce` -> `listCommerceProductsCached`, `listCommerceCollectionsCached`
- `/advanced/popups` -> `listPopupsCached`
- `/menus` -> `listMenusCached`
- `/media` -> `listMediaCached`
- `/themes` -> `listAdminThemeTemplatesCached`, `listAdminThemeProfilesCached`
