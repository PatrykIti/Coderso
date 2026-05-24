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
- bounded shopper-facing price filters

### Visual
- section header
- card metadata and link controls
- optional selected-product picker and card order
- more-products page picker and link label
- card density and presentation
- empty state
- surfaces

### Advanced
- preview status and refresh
- read-only source, curation, route, pagination, and query diagnostics

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

## TASK-336-18 Editor Contract

- Exports `productGalleryEditorContract` with `version: 2`.
- Contract target: Wizard owns commerce source setup; Visual owns section
  header, card fields, selected-product curation, links, pagination, empty
  state, columns, and style; Advanced is read-only query/runtime diagnostics.
- `TASK-336-19` removes beginner-mode raw product IDs, collection fallback IDs,
  route-prefix editing, and minor-unit price wording. Legacy saved product
  routes and curation stay backward-compatible and are summarized in Advanced.
