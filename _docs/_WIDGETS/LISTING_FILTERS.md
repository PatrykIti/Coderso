# Listing Filters Widget (v1)

## Purpose

Render listing-query facets, search, and apply/reset behavior against the
listing runtime token contract.

## Widget ID

`listing-filters`

## Variants (v1)

- `default`
- `horizontal`
- `sidebar`
- `drawer`

## Editor Modes

### Wizard
- listing query selection
- safe facet onboarding through the shared facet editor
- runtime behavior basics
- diagnostics that explain why editor `resolved` payloads stay sparse before public SSR

### Visual
- variant cards for `default`, `horizontal`, `sidebar`, and `drawer`
- bounded width selection plus collapsible/sticky guidance
- query selection plus field suggestions from the selected listing query
- kind-scoped facet controls with structured option and sort-option rows
- taxonomy parent-value rows plus searchable-option mode
- range/date presentation settings with dual inputs and optional slider pairing
- facet preview, runtime behavior, diagnostics, and surface styling
- runtime behavior
- surface styling

### Advanced
- the same facet authoring surface for expert workflows
- resolved runtime payload and diagnostics
- contract linkage to `_docs/_WIDGETS/LISTING_FILTERS.md`

## Runtime Behavior Notes

- Runtime emits deterministic markers:
  - `data-listing-widget="listing-filters"`
  - `data-listing-variant`
  - `data-listing-block-id`
  - `data-listing-query-id`
  - `data-listing-runtime-form`
  - `data-listing-auto-apply`
  - `data-listing-clear-all`
  - `data-listing-runtime-status`
  - `data-listing-runtime-loading`
  - `data-listing-runtime-error`
  - `data-listing-composite-control`
  - `data-listing-searchable-options`
- Search and facet inputs bind to `listingRuntimeTokens`.
- When `listingQueryId` is missing, runtime renders a configuration hint instead
  of a live filter form.
- Editor authoring keeps runtime normalization strict while the editor surface
  preserves incomplete facet drafts long enough to show inline validation.
- Auto-apply mode renders helper copy instead of a second manual submit button.
- Active filters render chips plus a `Clear all` action from resolved runtime
  state; fallback metrics no longer pretend unloaded counts are truthful zeroes.
- `sidebar` uses bounded width plus optional desktop sticky behavior, while
  `drawer` and per-facet collapsible states use native disclosure markup instead
  of widget-owned runtime JS.

## Clear Controls

- `style.frameBackground` is clearable.
- `style.frameBorderColor` is clearable.
- `style.actionBackground` is clearable.

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
      "id": "category",
      "kind": "taxonomy",
      "label": "Category",
      "field": "category",
      "op": "in",
      "presentation": {
        "controlMode": "searchable"
      },
      "options": [
        { "value": "houses", "label": "Houses" },
        { "value": "modern", "label": "Modern", "parentValue": "houses" }
      ]
    },
    {
      "id": "price",
      "kind": "range",
      "label": "Price",
      "field": "price",
      "op": "between",
      "presentation": {
        "rangeInputMode": "inputs-slider",
        "rangeStep": 5
      }
    },
    {
      "id": "published-at",
      "kind": "date-range",
      "label": "Published at",
      "field": "publishedAt",
      "op": "between",
      "presentation": {
        "dateInputMode": "native-date"
      }
    }
  ],
  "layout": {
    "maxWidth": "wide",
    "stickySidebar": false,
    "collapsibleFacets": false,
    "defaultCollapsed": false
  },
  "style": {
    "frameBackground": "color-mix(in srgb, var(--color-bg) 80%, transparent)",
    "frameBorderColor": "var(--color-border)",
    "actionBackground": "var(--color-primary)"
  }
}
```
