# Product Table Widget (v1)

## Purpose

Render a resolved commerce table with an optional section header, shared
column metadata, guarded column visibility, bounded status and stock
presentation, public-safe product thumbnails, optional excerpt context, safe
product links, an optional action column, SSR page-query public controls for
search/filter/sort/pagination, empty-state styling, and admin preview parity
for the current source query.

## Widget ID

`product-table`

## Variants (v1)

- `default`

## Editor Modes

### Wizard
- source/query basics
- admin preview status summary
- surfaces

### Visual
- admin preview status summary
- section header
- columns
- column labels
- public controls
- stock presentation
- links and actions
- empty state
- surfaces

### Advanced
- read-only runtime/admin preview diagnostics
- query diagnostics
- manual preview refresh

## Column Model

- Shared column order: Image, Product, Excerpt, Slug, Price, Compare at,
  Status, Stock, Collections.
- Visual mode exposes toggles and header labels for all nine columns through
  the shared `productTableColumns` registry.
- `showTitle` can be disabled only while Slug remains visible. If both identity
  columns are turned off, Product is restored automatically.
- `showPrice` can be disabled only while Compare at remains visible. If both
  pricing columns are turned off, Price is restored automatically.

## Section Header, Media, and Excerpt

- `header.eyebrow`, `header.title`, and `header.description` add optional
  context above the table without changing the shared widget-section contract.
- `header.title` becomes the preferred section/table accessible label when it
  is present; otherwise the sr-only caption falls back to `Product table`.
- `fields.showImage` adds a bounded thumbnail column backed only by public-safe
  media data resolved in `hydrateProductTableRuntimeData()`.
- `fields.showExcerpt` adds a plain-text excerpt column that clamps long values
  to 160 characters in the renderer.
- Missing media degrades to a `No image` fallback instead of rendering a broken
  request or exposing a private URL.

## Status and Stock Presentation

- Status cells render fixed badges for Published, Draft, and Archived instead
  of raw enum text.
- Draft and archived rows get bounded row-state treatment through fixed tone
  classes; published rows stay neutral.
- Product titles keep the `(draft)` / `(archived)` suffix only when the Status
  column is hidden.
- Visual mode exposes `showStockQuantity` only while the Stock column is
  visible, and the flag is cleared when Stock is turned off so hidden quantity
  state does not linger in widget JSON.

## Links and Actions

- `links.linkedColumn` can keep links disabled or link either the Product or
  Slug column through a shared bounded mode: `none`, `title`, or `slug`.
- `links.showAction` adds a fixed Action header and per-row CTA that reuses the
  same safe product href as the linked cell.
- `links.actionLabel` is a bounded schema-owned label with the default `View`.
- `links.openInNewTab` reuses the shared safe-href contract and always adds
  `rel="noopener noreferrer"` when links open in a new tab.
- Missing or unsafe hrefs degrade to plain text and suppress the Action link
  instead of rendering broken or arbitrary URLs.
- Interactive rows get a bounded hover cue only when a real safe product link
  is active; this is not the broader row-hover styling wave owned by
  `TASK-281-08`.

## Public Controls and Query Contract

- `controls.showSearchInput`, `showCollectionFilter`, `showStatusFilter`,
  `sorting`, `pagination`, and `pageSize` are Product Table-owned schema fields
  with bounded defaults and clamps.
- Public runtime uses block-scoped page-query keys derived from `blockId`:
  `pt.<blockId>.q`, `.collection`, `.status`, `.sort`, `.dir`, and `.page`.
- `sorting: indicator` surfaces the active sort affordance without changing the
  query, while `sorting: interactive` keeps the current `<th scope="col">`
  semantics and adds safe query-preserving sort links with `aria-sort`.
- `pagination: paged` emits Previous/Next links and page metadata;
  `pagination: load-more` emits a bounded `Load more` link; `pageSize` is
  clamped to `1..24`.
- Public `status` params may only narrow the public-safe baseline and never
  widen frontend access to draft/archived rows. Invalid Product Table query
  params are ignored and surfaced through `resolved.runtime.rejectedTokens`.
- `resolved.runtime` is runtime-only metadata for active query state, retained
  non-widget params, available collection/status options, and clear/previous/
  next hrefs.

## Accessibility Notes

- Product Table now renders an sr-only caption and keeps `scope="col"` on every rendered header, including the optional Action column.
- When `header.title` is present, the section, scroll region, and sr-only caption all reuse it as the preferred accessible table label; otherwise they fall back to `Product table`.
- Thumbnail images use `loading="lazy"`, `decoding="async"`, and safe alt fallback to the product title when media metadata omits alt text.
- Commerce runtime warnings announce through `role="alert"`, preview refresh banners announce through `role="status"` with polite live behavior, and the existing editor-preview empty state keeps polite live semantics without broadening this into a shared helper.
- The existing `TASK-281-03` status badge/title copy baseline remains intact and is now locked by focused SSR assertions.

## Runtime Behavior Notes

- Public rendering hydrates Product Table rows through
  `hydrateProductTableRuntimeData()`.
- Admin preview hydrates the same widget through the shared
  `WidgetPreviewState` seam and the internal
  `/admin/api/widgets/product-table/preview` route.
- Preview requests reuse `buildProductTableQueryInput()`, ignore stale async
  responses, and keep the last safe preview patch when a newer request fails.
- Runtime emits deterministic markers:
  - `data-widget="product-table"`
  - `data-product-table-count`
  - `data-product-table-page`
  - `data-product-status`
- `resolved.items[].productHref` is derived from the shared commerce
  content-route contract and normalized to safe relative URLs before render.
- `resolved.items[].media` is attached only from public image media resolved via
  `primaryMediaId` or the first `mediaIds[]` entry; missing or non-image media
  resolves to a local fallback instead of an exposed URL.
- Empty-state copy is rendered when no items resolve.
- Product status, stock values, and excerpt text are normalized through the
  shared commerce card contract before render.

## Clear Controls

- `style.tableBackground`
- `style.tableBorderColor`
- `style.headerBackground`
- `style.emptyBackground`
- `style.emptyBorderColor`

## Data Model (summary)

```json
{
  "source": {
    "limit": 12,
    "search": "",
    "collectionIds": [],
    "status": [],
    "sortField": "updatedAt",
    "sortDir": "desc"
  },
  "header": {
    "eyebrow": "Featured catalog",
    "title": "Summer release",
    "description": "Curated product context above the table."
  },
  "fields": {
    "showImage": false,
    "showTitle": true,
    "showExcerpt": false,
    "showSlug": true,
    "showPrice": true,
    "showStatus": true,
    "showStock": true,
    "showStockQuantity": false,
    "showCompareAt": false,
    "showCollectionCount": false
  },
  "controls": {
    "showSearchInput": false,
    "showCollectionFilter": false,
    "showStatusFilter": false,
    "sorting": "none",
    "pagination": "none",
    "pageSize": 12
  },
  "labels": {
    "image": "Image",
    "title": "Product",
    "excerpt": "Excerpt",
    "slug": "Slug",
    "price": "Price",
    "compareAt": "Compare at",
    "status": "Status",
    "stock": "Stock",
    "collections": "Collections"
  },
  "links": {
    "linkedColumn": "none",
    "showAction": false,
    "actionLabel": "View",
    "openInNewTab": false
  },
  "emptyState": {
    "title": "No products available",
    "description": "Publish products or adjust source query."
  }
}
```

Runtime-only `resolved.runtime` metadata carries the current public query state, available filter options, page meta, retained params, rejected tokens, and safe clear/previous/next hrefs.
