# Search Box Widget (v1)

## Purpose

Render a bounded listing or global public search form with runtime-safe source
 selection.

## Widget ID

`search-box`

## Variants (v1)

- `default`

## Editor Modes

### Wizard
- mode selection
- title/copy basics

### Visual
- mode
- copy and behavior
- display mode
- route target and query binding when `mode=route-submit`
- surface styling

### Advanced
- runtime payload
- diagnostics

## Runtime Behavior Notes

- Runtime supports two modes:
  - `listing`
  - `global`
- `route-submit` submits the query to a public page route instead of a search
  API endpoint.
- Runtime emits deterministic markers:
  - `data-listing-widget="search-box"`
  - `data-search-box-display-mode`
  - `data-listing-block-id`
  - `data-listing-query-id`
  - `data-listing-runtime-form`
  - `data-global-search-form`
  - `data-search-box-id`
  - `data-search-endpoint`
  - `data-search-box-mode="route-submit"`
  - `data-search-target-route`
  - `data-search-query-param`
- Listing mode binds to `listingRuntimeTokens.search`; global mode uses the
  configured public search endpoint and source toggles; route-submit binds to a
  sanitized public route and configurable query parameter.

## Clear Controls

- `style.frameBackground` is clearable.

## Data Model (summary)

```json
{
  "mode": "listing",
  "displayMode": "full",
  "listingQueryId": "",
  "title": "Search",
  "description": "Search listing items in real time.",
  "placeholder": "Type to search...",
  "submitLabel": "Search",
  "autoApply": true,
  "endpoint": "/api/search",
  "targetRoute": "/search",
  "queryParam": "q",
  "sources": {
    "pages": true,
    "entries": true,
    "posts": false
  }
}
```
