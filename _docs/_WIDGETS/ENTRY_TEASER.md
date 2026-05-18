# Entry Teaser Widget (v2)

## Purpose

Highlight one resolved content entry with bounded layout, heading, media, CTA,
and fallback controls.

The widget supports:

- legacy content-type sources with `latest`, `featured`, or `manual` entry
  selection
- listing-query sources with `latest` or `featured` one-item selection
- admin preview hydration through an internal preview route
- fixed-map layout/media controls without raw class-name passthrough

Manual listing-row selection is intentionally deferred to
`TASK-294_Entry_Teaser_Listing_Manual_Picker.md`.

## Widget ID

`entry-teaser`

## Variants

- `horizontal`: media and content side by side
- `vertical`: stacked card teaser
- `minimal`: compact teaser layout

## Editor Ownership

### Wizard

Wizard is the single mutable owner for source selection.

- source type: `Content type` or `Listing query`
- source mode:
  - legacy: `latest`, `featured`, `manual`
  - listing: `latest`, `featured`
- content-type picker and manual entry picker
- listing query/template picker
- variant thumbnail selection

### Visual

Visual owns content-facing presentation.

Sections:
1. Variant and structure
2. Section context
3. Source summary (read-only)
4. Teaser content fields
5. CTA behavior
6. Fallback state

Notes:

- Entry Teaser keeps `visualOwnsVariantSelection = true`.
- Source mutation is intentionally read-only here to avoid duplicated editor
  ownership.
- Field toggles show a local preview card that uses resolved preview data when
  available.

### Advanced

Advanced owns technical layout/style diagnostics.

Sections:
1. Layout and media
2. Style tokens
3. Runtime payload snapshot

## Runtime Behavior

### Source resolution

- runtime data is resolved server-side before rendering
- published runtime uses only published entries
- preview runtime may use all statuses

Legacy content-type source modes:

- `manual`: selected `entryId`
- `latest`: newest eligible entry
- `featured`: first featured entry (`tags` includes `featured` or
  `data.featured === true`)

Listing source modes:

- `latest`: first listing result
- `featured`: first listing result tagged/flagged as featured
- if no listing featured match exists and `fallback.fallbackToLatest === true`,
  runtime falls back to the first listing result

### Admin preview

- Page Editor and Widget Template Editor keep preview-only resolved data in
  transient editor context, not in persisted widget JSON.
- `POST /widgets/entry-teaser/preview` is an internal admin endpoint used only
  for editor preview hydration.
- runtime snapshot in Advanced reads the resolved preview payload when available
  and can be copied to the clipboard.

### CTA safety

- `hrefMode: "auto"` uses the resolved entry detail route from
  `site.contentRoutes`
- `hrefMode: "custom"` accepts only relative paths, hash URLs, or `http(s)`
  URLs
- invalid custom URLs normalize to an empty non-navigating CTA state
- `opensInNewTab` resolves through shared safe-link helpers and adds
  `rel="noopener noreferrer"`

## Layout and Accessibility Notes

- optional section heading renders independently from the entry title heading
- section heading levels: `h2`, `h3`, `h4`
- entry title heading levels: `h2`, `h3`, `h4`
- max-width uses fixed tokens: `sm`, `md`, `lg`, `xl`, `full`
- media mode uses fixed tokens: `image`, `icon`, `none`
- media aspect uses fixed tokens: `auto`, `16:9`, `4:3`, `1:1`
- media height uses fixed tokens: `auto`, `sm`, `md`, `lg`
- media fit uses fixed tokens: `cover`, `contain`
- rendered images always include deterministic `width` and `height`
- tag rendering respects `fields.tagLimit`

## Clearable Style Controls

- `style.surface` and `style.border` use the shared swatch-plus-text
  `SharedColorControl`
- clear removes the persisted style field instead of writing a sentinel token
- text input remains authoritative for CSS variables or `rgba(...)` values,
  while the swatch uses a bounded fallback hex preview

## Data Model Summary

```json
{
  "sourceMode": "latest",
  "source": {
    "mode": "legacy",
    "listingQueryId": "",
    "listingTemplateId": "",
    "contentTypeId": "",
    "entryId": ""
  },
  "fields": {
    "showImage": true,
    "showExcerpt": true,
    "showMeta": true,
    "showTags": true,
    "tagLimit": 5
  },
  "cta": {
    "label": "Read more",
    "hrefMode": "auto",
    "href": "",
    "opensInNewTab": false,
    "style": "link"
  },
  "style": {
    "surface": "var(--color-bg)",
    "border": "var(--color-border)",
    "radius": "lg",
    "spacing": "md"
  },
  "section": {
    "title": "",
    "headingLevel": "h2"
  },
  "title": {
    "headingLevel": "h3"
  },
  "media": {
    "mode": "image",
    "aspect": "auto",
    "height": "auto",
    "fit": "cover"
  },
  "layout": {
    "maxWidth": "lg"
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

## Public DOM markers

- `data-entry-teaser-variant`
- `data-entry-teaser-data-source-mode`
- `data-entry-teaser-source-mode`
- `data-entry-teaser-source`
- `data-entry-teaser-state`
- `data-entry-teaser-media-mode`
- `data-entry-teaser-max-width`
- `data-entry-teaser-tag-limit`
