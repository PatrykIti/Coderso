# Product Compare Widget (v2)

## Purpose

Render a bounded commerce comparison surface for curated or query-resolved
products, with section copy, layout variants, safe product merchandising, and
read-only runtime diagnostics.

## Widget ID

`product-compare`

## Variants

- `matrix` - attribute rows with products as columns
- `compact` - denser comparison table for tighter layouts
- `cards` - stacked product cards with comparison details

## Editor Modes

### Wizard
- source/query basics
- backend preview status and refresh
- dense compare guidance

### Visual
- variant and structure
- selected-product picker and comparison order
- section title/description/caption
- attribute row visibility
- labels and stock-state copy
- product header image/link/CTA controls
- money/quantity formatting
- featured-product picker and sticky header
- empty state
- swatch-only surfaces

### Advanced
- read-only runtime preview status
- read-only runtime warning copy
- read-only source and surface summaries
- read-only contract summary

Notes:

- Product Compare now owns its variant selector inside Visual instead of
  relying on the shared wrapper variant surface.
- Advanced now opens with an explicit read-only banner plus a contract summary,
  while the preview refresh button remains a diagnostics-only action.
- Advanced labels saved search, collection, and status filters as inactive
  whenever selected products own runtime resolution; saved dormant values stay
  visible for authors but are not presented as active filters.

## Runtime Behavior Notes

- Runtime emits deterministic markers:
  - `data-widget="product-compare"`
  - `data-product-compare-count`
- When `source.productIds` is present, Product Compare resolves the exact
  curated product set in manual order and ignores search/collection/status
  filters.
- Public rendering and admin preview both use backend-owned commerce resolution.
- The 31-05 smoke fixture seeds media-backed commerce products, a safe
  `/fixture-products/:slug` products route, visible title links/CTAs, and an
  out-of-stock product for Product Compare browser proof.
- Admin canvas refresh uses the internal widget preview route and keeps preview
  data transient; it does not persist resolved product payload into author data.
- Matrix/compact variants render table caption, scoped column headers, alert
  semantics, and keyboard-focusable horizontal scroll.

## Clear Controls

- `style.tableBackground`
- `style.tableBorderColor`
- `style.headerBackground`
- `style.emptyBackground`
- `style.emptyBorderColor`

Visual color authoring is swatch-only. Legacy saved CSS/token color values
remain compatible as replace-or-clear saved custom colors, but fresh defaults
do not seed raw CSS token strings.

## Data Model (summary)

```json
{
  "source": {
    "limit": 3,
    "search": "",
    "collectionIds": [],
    "productIds": [],
    "status": [],
    "sortField": "title",
    "sortDir": "asc"
  },
  "rows": [
    { "key": "price", "visible": true },
    { "key": "compareAt", "visible": true },
    { "key": "stock", "visible": true },
    { "key": "quantity", "visible": true },
    { "key": "slug", "visible": false },
    { "key": "excerpt", "visible": false }
  ],
  "labels": {
    "attributeHeader": "Attribute",
    "price": "Price",
    "compareAt": "Compare at",
    "stock": "Stock",
    "quantity": "Quantity",
    "slug": "Slug",
    "excerpt": "Excerpt",
    "inStock": "In stock",
    "outOfStock": "Out of stock",
    "backorder": "Backorder"
  },
  "format": {
    "moneyLocale": "en-US",
    "quantityDisplay": "exact",
    "quantityCompactLimit": 99
  },
  "header": {
    "showImages": false,
    "linkTitles": false,
    "ctaMode": "none",
    "ctaLabel": "View product"
  },
  "section": {
    "title": "",
    "description": "",
    "caption": "Product comparison",
    "hideCaption": true
  },
  "layout": {
    "featuredProductId": "",
    "stickyHeader": false
  },
  "emptyState": {
    "title": "No products to compare",
    "description": "Update source filters or publish products."
  },
  "style": {}
}
```

## TASK-336-18 Editor Contract

- Exports `productCompareEditorContract` with `version: 2`.
- Contract target: Wizard seeds query-based source setup; Visual owns selected
  products, rows, labels, visible fields, header, empty state, format, layout,
  and swatch-only style; Advanced is read-only preview, source, and surface
  diagnostics without raw JSON payloads.
- `TASK-336-19` removes the temporary Wizard/Visual duplicate allowance for
  `source.productIds`. Product curation now uses Visual product pickers instead
  of raw ID text fields, while runtime still preserves exact manual order.
- `TASK-336-19` also removes raw CSS/token color text inputs, phantom
  `runtime.*` contract paths, and the Advanced raw query disclosure.
