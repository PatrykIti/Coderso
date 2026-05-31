# Search Box Widget (v1)

## Purpose

Render a bounded listing or global public search form with runtime-safe source
 selection.

## Widget ID

`search-box`

## Variants (v1)

- `default`

## Editor Modes (current after TASK-336-19)

### Wizard
- owns first-time source/setup:
  - `mode`
  - `listingQueryId`
  - `targetRoute`
  - `sources.pages`
  - `sources.entries`
  - `sources.posts`
- shows listing-query loading, empty, error, and retry guidance
- route-submit target pages use the shared page destination picker
- public endpoint and query-key values are support-owned diagnostics, not
  ordinary author inputs

### Visual
- owns visitor-facing copy:
  - `title`
  - `description`
  - `placeholder`
  - `submitLabel`
- owns visible interaction/presentation:
  - `displayMode`
  - `autoApply`
  - `style.frameBackground`
  - `style.frameBorderColor`
  - `style.actionBackground`
- does not expose source, route, query-param, or endpoint controls
- color controls are swatch-first, label theme-token fallback previews
  truthfully, and do not ask authors to type CSS tokens
- saved default Search Box theme tokens are labeled as `Theme default`; cleared
  color fields remain explicit `No inline color` states

### Advanced
- read-only runtime diagnostics for source/routing state
- read-only human runtime status
- read-only contract summary
- no duplicate writable copy, source, or style controls

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
- Each runtime branch exposes a stable section name through the widget title.
  Active forms render that title as a heading; the no-query listing placeholder
  keeps an `sr-only` heading for the section name.
- Search inputs have stable widget-scoped `id` values and `sr-only` labels so
  they do not rely on placeholder text for the accessible name.
- In React admin preview, global source checkboxes are controlled from the
  widget data so source toggle changes update the live checked state without a
  reload. Public SSR still renders ordinary checked source inputs for runtime
  submission.
- `displayMode: "compact"` narrows the runtime shell, tightens spacing, keeps
  the input row on one line, and hides helper description copy in listing,
  route-submit, and global branches.
- The editor keeps endpoint and query parameter values backward-compatible in
  the stored data model, but ordinary authors manage only source, destination
  page, copy, interaction, and swatches.

## Clear Controls

- `style.frameBackground`, `style.frameBorderColor`, and
  `style.actionBackground` are clearable. Clear removes the saved inline color
  value instead of promising a theme reset.

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
