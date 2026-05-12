# Product Table Widget (v1)

## Purpose

Render a resolved commerce table with bounded column visibility, labels, and
empty-state styling.

## Widget ID

`product-table`

## Variants (v1)

- `default`

## Editor Modes

### Wizard
- source/query basics
- visible columns

### Visual
- source and filters
- columns
- column labels
- empty state
- surfaces

### Advanced
- resolved runtime payload
- query diagnostics

## Runtime Behavior Notes

- Runtime emits deterministic markers:
  - `data-widget="product-table"`
  - `data-product-table-count`
- Empty-state copy is rendered when no items resolve.
- Product status and stock values are normalized through the shared commerce
  card contract.

## Clear Controls

- `style.tableBackground`, `style.headerBackground`, and `style.emptyBackground`
  are clearable.

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
