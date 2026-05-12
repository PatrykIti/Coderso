# Listing Filters Widget (v1)

## Purpose

Render listing-query facets, search, and apply/reset behavior against the
listing runtime token contract.

## Widget ID

`listing-filters`

## Variants (v1)

- `default`

## Editor Modes

### Wizard
- listing query selection
- title and search visibility

### Visual
- query and facets
- runtime behavior
- surface styling

### Advanced
- resolved runtime payload
- diagnostics

## Runtime Behavior Notes

- Runtime emits deterministic markers:
  - `data-listing-widget="listing-filters"`
  - `data-listing-block-id`
  - `data-listing-query-id`
  - `data-listing-runtime-form`
  - `data-listing-auto-apply`
- Search and facet inputs bind to `listingRuntimeTokens`.
- When `listingQueryId` is missing, runtime renders a configuration hint instead
  of a live filter form.

## Clear Controls

- `style.frameBackground` is clearable.

## Data Model (summary)

```json
{
  "listingQueryId": "",
  "title": "Filter results",
  "description": "Narrow down listing results with reusable facets.",
  "autoApply": true,
  "showSearch": true,
  "searchPlaceholder": "Search results...",
  "searchLabel": "Search",
  "applyLabel": "Apply filters",
  "facets": [
    {
      "id": "sort",
      "kind": "sort",
      "label": "Sort"
    }
  ],
  "style": {
    "frameBackground": "color-mix(in srgb, var(--color-bg) 80%, transparent)",
    "frameBorderColor": "var(--color-border)",
    "actionBackground": "var(--color-primary)"
  }
}
```
