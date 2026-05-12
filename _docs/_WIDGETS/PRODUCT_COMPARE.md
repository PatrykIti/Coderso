# Product Compare Widget (v1)

## Purpose

Render a bounded commerce comparison matrix for resolved products.

## Widget ID

`product-compare`

## Variants (v1)

- `matrix`

## Editor Modes

### Wizard
- source/query basics
- visible compare fields

### Visual
- source and filters
- field visibility
- labels
- empty state
- surfaces

### Advanced
- resolved runtime payload
- query diagnostics

## Runtime Behavior Notes

- Runtime emits deterministic markers:
  - `data-widget="product-compare"`
  - `data-product-compare-count`
- Empty-state copy is rendered when no rows resolve.
- Prices, compare-at values, and stock fields are normalized through the shared
  commerce compare contract.

## Clear Controls

- `style.tableBackground`, `style.headerBackground`, and `style.emptyBackground`
  are clearable.

## Data Model (summary)

```json
{
  "source": {
    "limit": 3,
    "search": "",
    "collectionIds": [],
    "status": [],
    "sortField": "title",
    "sortDir": "asc"
  },
  "fields": {
    "showCompareAt": true,
    "showStockQuantity": true,
    "showSlug": false
  },
  "labels": {
    "price": "Price",
    "compareAt": "Compare at",
    "stock": "Stock",
    "quantity": "Quantity",
    "slug": "Slug"
  },
  "emptyState": {
    "title": "No products to compare",
    "description": "Update source filters or publish products."
  },
  "style": {
    "tableBackground": "var(--color-bg)",
    "tableBorderColor": "var(--color-border)",
    "headerBackground": "color-mix(in srgb, var(--color-bg) 80%, transparent)",
    "emptyBackground": "color-mix(in srgb, var(--color-bg) 70%, transparent)",
    "emptyBorderColor": "var(--color-border)"
  }
}
```
