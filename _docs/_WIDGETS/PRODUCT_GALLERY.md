# Product Gallery Widget (v1)

## Purpose

Render a resolved commerce product gallery with bounded query fields, optional
product metadata, safe product links, manual curation, and explicit empty-state
styling.

## Widget ID

`product-gallery`

## Variants (v1)

- `cards`
- `compact`

## Editor Modes

### Wizard
- source/query basics
- bounded price filters in commerce minor units
- gallery density

### Visual
- section header
- card metadata and link controls
- empty state
- surfaces

### Advanced
- manual curation and view-all behavior
- preview status and refresh
- query diagnostics

## Runtime Behavior Notes

- Runtime emits deterministic markers:
  - `data-widget="product-gallery"`
  - `data-product-gallery-count`
  - `data-product-gallery-total`
  - `data-product-id` per resolved item
- Empty-state copy is rendered when no items resolve.
- Resolved runtime cards stay normalized through the commerce widget shared
  contract.
- Admin preview resolves products through an internal `/admin/api/widgets/*`
  route and patches preview data through `WidgetPreviewState.dataPatch`.

## Clear Controls

- `style.cardBackground`, `style.cardBorderColor`, `style.emptyBackground`, and
  `style.emptyBorderColor` are clearable.

## Data Model (summary)

```json
{
  "source": {
    "limit": 8,
    "search": "",
    "collectionIds": [],
    "status": [],
    "sortField": "updatedAt",
    "sortDir": "desc",
    "minPriceMinor": 19900,
    "maxPriceMinor": 49900
  },
  "link": {
    "basePath": "/catalog",
    "target": "same-tab",
    "ctaLabel": "View product",
    "ctaStyle": "text"
  },
  "header": {
    "title": "Featured products",
    "description": "Highlighted catalog items."
  },
  "pagination": {
    "mode": "view-all",
    "viewAllHref": "/catalog",
    "viewAllLabel": "View all products"
  },
  "curation": {
    "mode": "query",
    "productIds": []
  },
  "fields": {
    "showExcerpt": true,
    "showPrice": true,
    "showStock": true,
    "showStatus": false,
    "showMediaHint": false
  },
  "emptyState": {
    "title": "No products found",
    "description": "Adjust query filters or publish products."
  },
  "style": {
    "columns": "3",
    "cardStyle": "outlined",
    "cardBackground": "var(--color-bg)",
    "cardBorderColor": "var(--color-border)",
    "emptyBackground": "color-mix(in srgb, var(--color-bg) 70%, transparent)",
    "emptyBorderColor": "var(--color-border)"
  },
  "resolved": {
    "items": [],
    "total": 0,
    "resolvedAt": "2026-05-19T12:00:00.000Z"
  }
}
```
