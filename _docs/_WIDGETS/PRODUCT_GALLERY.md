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
- variant and structure
- section header
- card metadata and link controls
- optional selected-product picker and card order
- more-products page picker and link label
- card density and presentation
- empty state
- swatch-only surfaces

### Advanced
- preview status and refresh
- read-only product behavior, source, preview, and surface summaries
- read-only contract summary

Notes:

- Product Gallery now owns its variant selector inside Visual instead of relying
  on the shared wrapper variant surface.
- Advanced now opens with an explicit read-only banner plus a contract summary,
  while the preview refresh button remains a diagnostics-only action.

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
- Editor previews never render raw media IDs. Media diagnostics stay
  backend/support-owned instead of becoming beginner-facing card controls.

## Clear Controls

- `style.cardBackground`, `style.cardBorderColor`, `style.emptyBackground`, and
  `style.emptyBorderColor` are clearable.
- Visual color authoring is swatch-only. Legacy saved CSS/token color values
  remain compatible as replace-or-clear saved custom colors, but fresh defaults
  do not seed raw CSS token strings.

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
    "showStatus": false
  },
  "emptyState": {
    "title": "No products found",
    "description": "Adjust query filters or publish products."
  },
  "style": {
    "columns": "3",
    "cardStyle": "outlined"
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
  state, columns, and swatch-only style; Advanced is read-only product
  behavior, source, preview, and surface diagnostics without raw query payloads.
- `TASK-336-19` removes beginner-mode raw product IDs, collection fallback IDs,
  route-prefix editing, and minor-unit price wording. Legacy saved product
  routes and curation stay backward-compatible and are summarized in Advanced.
- `TASK-336-19` also removes raw CSS/token color text inputs, raw media-ID
  preview hints, phantom `runtime.*` contract paths, and the Advanced raw query
  disclosure.
