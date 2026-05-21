# Product Table Widget (v1)

## Purpose

Render a resolved commerce table with shared column metadata, guarded column
visibility, editable labels, bounded status and stock presentation, safe
product links, an optional action column, empty-state styling, and admin
preview parity for the current source query.

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
- columns
- column labels
- stock presentation
- links and actions
- empty state
- surfaces

### Advanced
- read-only runtime/admin preview diagnostics
- query diagnostics
- manual preview refresh

## Column Model

- Shared column order: Product, Slug, Price, Compare at, Status, Stock,
  Collections.
- Visual mode exposes toggles and header labels for all seven columns through
  the shared `productTableColumns` registry.
- `showTitle` can be disabled only while Slug remains visible. If both identity
  columns are turned off, Product is restored automatically.
- `showPrice` can be disabled only while Compare at remains visible. If both
  pricing columns are turned off, Price is restored automatically.

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
  - `data-product-status`
- `resolved.items[].productHref` is derived from the shared commerce
  content-route contract and normalized to safe relative URLs before render.
- Empty-state copy is rendered when no items resolve.
- Product status and stock values are normalized through the shared commerce
  card contract.

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
  "fields": {
    "showTitle": true,
    "showSlug": true,
    "showPrice": true,
    "showStatus": true,
    "showStock": true,
    "showStockQuantity": false,
    "showCompareAt": false,
    "showCollectionCount": false
  },
  "labels": {
    "title": "Product",
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
