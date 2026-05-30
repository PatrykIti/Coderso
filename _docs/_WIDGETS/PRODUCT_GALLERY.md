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
- read-only preview summary with refresh when source edits make preview data
  stale

### Visual
- read-only preview summary with refresh when source or curation edits make
  preview data stale
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
- Wizard, Visual, and Advanced can hydrate the admin preview through the shared
  internal preview state. The first daily-mode open no longer depends on an
  Advanced detour; source and curation edits keep the last resolved cards until
  `Refresh products` runs.
- Advanced opens with an explicit read-only banner plus a contract summary.

## Runtime Behavior Notes

- Runtime emits deterministic markers:
  - `data-widget="product-gallery"`
  - `data-product-gallery-count`
  - `data-product-gallery-total`
  - `data-product-gallery-route-state`
  - `data-product-gallery-cta-state`
  - `data-product-gallery-view-all-state`
  - `data-product-id` per resolved item
- The public section is named by the configured section title when present, and
  otherwise falls back to `aria-label="Product gallery"`.
- Empty-state copy is rendered when no items resolve.
- Resolved runtime cards stay normalized through the commerce widget shared
  contract.
- Admin preview resolves products through an internal `/admin/api/widgets/*`
  route and patches preview data through `WidgetPreviewState.dataPatch`.
- If `link.basePath` is missing, product cards stay non-clickable and CTA labels
  are hidden in public render. Editor preview and editor panels show explicit
  missing-route guidance.
- `view-all` pagination renders only when a destination is configured and the
  resolved total is greater than the shown cards. Hidden states are exposed as
  `missing_destination` or `all_products_visible` in runtime/editor guidance.
- Editor previews never render raw media IDs. Media diagnostics stay
  backend/support-owned instead of becoming beginner-facing card controls.
- Legacy `fields.showMediaHint` payloads are accepted for backward
  compatibility but dropped during normalization; the field has no editor or
  renderer surface.

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
- `TASK-343-16` adds daily-mode preview hydration, explicit stale-preview
  refresh ownership, route/view-all truthfulness markers, public section naming,
  and legacy `fields.showMediaHint` normalization.
