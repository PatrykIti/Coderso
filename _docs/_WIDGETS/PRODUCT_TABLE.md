# Product Table Widget (v1)

## Purpose

Render a resolved commerce table with bounded column visibility, labels,
empty-state styling, and admin preview parity for the current source query.

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
- empty state
- surfaces

### Advanced
- read-only runtime/admin preview diagnostics
- query diagnostics
- manual preview refresh

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
    "showSlug": true,
    "showStatus": true,
    "showStock": true,
    "showCompareAt": false,
    "showCollectionCount": false
  },
  "labels": {
    "title": "Product",
    "price": "Price",
    "compareAt": "Compare at",
    "status": "Status",
    "stock": "Stock",
    "collections": "Collections",
    "slug": "Slug"
  },
  "emptyState": {
    "title": "No products available",
    "description": "Publish products or adjust source query."
  }
}
```
