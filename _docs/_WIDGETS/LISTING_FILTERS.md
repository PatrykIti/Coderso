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
- one-time listing query source selection (`listingQueryId`)
- setup-only facet structure with beginner-safe controls:
  - generated stable keys instead of editable facet IDs
  - facet kinds and operators
  - listing fields chosen from the selected query's field picker
  - sort fields/directions with generated sort keys
- option/data match values and taxonomy hierarchy keys stay read-only; options
  come from listing data/runtime metrics or a safe configured option list
- setup guidance for missing queries, empty facets, invalid fields, duplicate
  IDs, and legacy operators
- no runtime copy, layout, or surface styling ownership

### Visual
- variant cards for `default`, `horizontal`, `sidebar`, and `drawer`
- bounded width selection plus collapsible/sticky guidance
- runtime labels (`title`, `description`, search/apply copy), `showSearch`,
  and `autoApply`
- facet labels, facet order, option labels, sort labels, and preview
- field/kind/operator bindings are read-only human badges with setup ownership
- searchable-option mode, range input mode/step, and date input mode
- range/date presentation settings with dual inputs and optional slider pairing
- surface styling through swatch-only color controls
- saved Action background color is marked inactive while Auto Apply hides the
  manual submit button; the saved value is preserved for manual apply mode
- no listing query rebinding and no facet source/value row creation; Visual can
  rename existing option labels but does not create new match values

### Advanced
- read-only listing query and normalized facet binding summary
- read-only URL/runtime diagnostics for `lq.<queryId>.*` state
- read-only human runtime status from public SSR, without raw JSON payloads
- contract linkage to `_docs/_WIDGETS/LISTING_FILTERS.md`
- no writable facet/source/style controls

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
- The public runtime region and form are labelled by the widget title. The
  search input uses a deterministic id, explicit label association,
  `type="search"`, and `autoComplete="off"`.
- Empty checkbox/radio/taxonomy facets render a visible explanation instead of
  a silent empty control list. If runtime metrics are resolved but empty, the
  message says no matching listing-data options exist yet; otherwise it states
  that options appear after listing data resolves or a safe option list is
  configured.
- Editor authoring keeps runtime normalization strict while the editor surface
  preserves incomplete facet drafts long enough to show inline validation.
- Auto-apply mode renders helper copy instead of a second manual submit button.
  In editor Visual mode, a saved `style.actionBackground` is explicitly marked
  inactive while this manual action button is hidden.
- Active filters render chips plus a `Clear all` action from resolved runtime
  state; fallback metrics no longer pretend unloaded counts are truthful zeroes.
- `sidebar` uses bounded width plus optional desktop sticky behavior, while
  `drawer` and per-facet collapsible states use native disclosure markup instead
  of widget-owned runtime JS.

## Clear Controls

- `style.frameBackground` is clearable.
- `style.frameBorderColor` is clearable.
- `style.actionBackground` is clearable.
- Visual color controls are swatch-only; saved custom CSS/token values can be
  replaced or cleared but are not edited as text by ordinary authors.

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
