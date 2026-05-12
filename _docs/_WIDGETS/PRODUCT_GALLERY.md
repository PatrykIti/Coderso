# Product Gallery Widget (v1)

## Purpose

Render a resolved commerce product gallery with bounded query fields, optional
product metadata, and explicit empty-state styling.

## Widget ID

`product-gallery`

## Variants (v1)

- `cards`
- `compact`

## Editor Modes

### Wizard
- source/query basics
- visible product fields
- gallery density

### Visual
- source and filters
- fields visibility
- empty state
- surfaces

### Advanced
- resolved runtime payload
- query diagnostics

## Runtime Behavior Notes

- Runtime emits deterministic markers:
  - `data-widget="product-gallery"`
  - `data-product-gallery-count`
  - `data-product-id` per resolved item
- Empty-state copy is rendered when no items resolve.
- Resolved runtime cards stay normalized through the commerce widget shared
  contract.

## Clear Controls

- `style.cardBackground` and `style.emptyBackground` are clearable.

## Data Model (summary)

```json
{
  "source": {
    "limit": 8,
    "search": "",
    "collectionIds": [],
    "status": [],
    "sortField": "updatedAt",
    "sortDir": "desc"
  },
  "fields": {
    "showExcerpt": true,
    "showPrice": true,
    "showStock": true,
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
  }
}
```
