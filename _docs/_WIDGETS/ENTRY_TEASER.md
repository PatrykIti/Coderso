# Entry Teaser Widget (v1)

## Purpose

Dynamic teaser widget for highlighting one entry selected manually or resolved automatically (`latest` / `featured`).

## Widget ID

`entry-teaser`

## Variants (v1)

- `horizontal`: media and content side by side
- `vertical`: stacked card teaser
- `minimal`: compact teaser layout

## Editor Modes (current after TASK-050-14-02)

### Wizard (minimal onboarding)
- source mode (`latest` / `featured` / `manual`)
- content type selection
- manual entry selection (only for `manual`)
- variant selection

### Visual (primary editing mode)
Sections:
1. Variant and structure
2. Source configuration
3. Teaser content fields
4. CTA behavior
5. Empty state copy

Notes:
- Entry Teaser owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Generic Visual variant selector is suppressed.

### Advanced (technical-only)
- style tokens (`surface`, `border`, `radius`, `spacing`)
- fallback behavior (`fallbackToLatest` for featured mode)
- runtime payload snapshot

## Runtime Behavior Notes

- Runtime data is resolved server-side before rendering.
- Published runtime:
  - only published entries are eligible.
- Preview runtime:
  - all entry statuses are eligible.
- Source modes:
  - `manual`: pick selected `entryId`
  - `latest`: newest eligible entry
  - `featured`: first featured entry (`tags` includes `featured` or `data.featured === true`)
- If `featured` has no match and `fallback.fallbackToLatest === true`, runtime falls back to `latest`.
- Detail URL is resolved from `site.contentRoutes` detail path; fallback pattern is `/{typeSlug}/:slug`.
- Widget outputs deterministic markers:
  - `data-entry-teaser-variant`
  - `data-entry-teaser-source-mode`
  - `data-entry-teaser-source`
  - `data-entry-teaser-state`

## Data Model (summary)

```json
{
  "sourceMode": "latest",
  "source": {
    "contentTypeId": "",
    "entryId": ""
  },
  "fields": {
    "showImage": true,
    "showExcerpt": true,
    "showMeta": true,
    "showTags": true
  },
  "cta": {
    "label": "Read more",
    "hrefMode": "auto",
    "href": ""
  },
  "style": {
    "surface": "var(--color-bg)",
    "border": "var(--color-border)",
    "radius": "lg",
    "spacing": "md"
  },
  "fallback": {
    "title": "No entry selected",
    "description": "Choose a source mode and content type to render teaser content.",
    "fallbackToLatest": true
  },
  "resolved": {
    "item": null,
    "sourceTypeId": "",
    "sourceTypeSlug": "",
    "resolvedAt": ""
  }
}
```
