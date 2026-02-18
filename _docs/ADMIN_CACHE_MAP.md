# Admin Cache Map (Routes -> Files -> Cached APIs)

This file maps admin UI surfaces to their implementation files and the cached API calls they rely on.

## Pages
- Pages list
  - UI: `core/admin/ui/pages/PageListPage.tsx`
  - Cached APIs: `listPagesCached`, `getCachedPages`
- Page editor
  - UI: `core/admin/ui/pages/PageEditor.tsx`
  - Cached APIs: `getPageCached`, `getCachedPageDetail`

## Content Entries
- Entries list
  - UI: `core/admin/ui/entries/EntryList.tsx`
  - Cached APIs: `listContentTypesCached`, `listEntriesCached`, `getCachedEntries`
- Entry editor
  - UI: `core/admin/ui/entries/EntryEditor.tsx`
  - Cached APIs: `listContentTypesCached`, `getEntryCached`, `getCachedEntryDetail`

## Forms
- Forms list
  - UI: `core/admin/ui/forms/FormListPage.tsx`
  - Cached APIs: `listFormsCached`, `getCachedForms`
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
- Listings editor
  - UI: `core/admin/ui/listings/ListingEditorPage.tsx`
  - Cached APIs: `getListingQueryCached`, `listListingTemplatesCached`, `listContentTypesCached`

## Content Types
- Content types list
  - UI: `core/admin/ui/content-types/ContentTypeList.tsx`
  - Cached APIs: `listContentTypesCached`, `getCachedContentTypes`
- Content type editor
  - UI: `core/admin/ui/content-types/ContentTypeEditor.tsx`
  - Cached APIs: `getContentTypeCached`
- Schema builder
  - UI: `core/admin/ui/content-types/SchemaBuilderPage.tsx`
  - Cached APIs: `listContentTypesCached`, `getContentTypeCached`

## Widget Templates
- Template editor
  - UI: `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
  - Cached APIs: `getWidgetTemplateCached`, `listWidgetTemplateCategoriesCached`, `getCachedWidgetTemplateCategories`
- Templates list hook
  - UI: `core/admin/ui/widgets/hooks/useWidgetTemplates.ts`
  - Cached APIs: `listWidgetTemplatesCached`, `getCachedWidgetTemplates`
- Widget insert dialog
  - UI: `core/admin/ui/widgets/WidgetInsertDialog.tsx`
  - Cached APIs: `getWidgetTemplateCached`, `getPageCached`
- Widget library
  - UI: `core/admin/ui/widgets/WidgetLibraryPage.tsx`
  - Cached APIs: `listWidgetCatalogCached`, `getCachedWidgetCatalog`, `listWidgetTemplateCategoriesCached`, `getCachedWidgetTemplateCategories`, `listPagesCached`, `getCachedPages`, `getPageCached`


## Media
- Media library
  - UI: `core/admin/ui/media/MediaLibraryPage.tsx`
  - Cached APIs: `listMediaCached`, `getCachedMedia`
- Media picker
  - UI: `core/admin/ui/media/MediaPicker.tsx`
  - Cached APIs: `listMediaCached`, `getCachedMedia`

## Menus / Themes / Site Settings
- Menu editor
  - UI: `core/admin/ui/menus/MenuEditorPage.tsx`
  - Cached APIs: `listMenusCached`, `getMenuWithItemsCached`, `getCachedMenus`, `getCachedMenuDetail`, `listPagesCached`, `getCachedPages`
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
- `/coderso/widgets` -> `listWidgetCatalogCached`, `listWidgetTemplateCategoriesCached`, `listWidgetTemplatesCached`
- `/coderso/engine` -> `listContentTypesCached`
- `/coderso/entries` -> `listContentTypesCached`
- `/coderso/forms` -> `listFormsCached`
- `/coderso/listings` -> `listListingQueriesCached`, `listListingTemplatesCached`
- `/menus` -> `listMenusCached`
- `/media` -> `listMediaCached`
- `/themes` -> `listAdminThemeTemplatesCached`, `listAdminThemeProfilesCached`
