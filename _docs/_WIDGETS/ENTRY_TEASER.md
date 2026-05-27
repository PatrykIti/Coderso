# Entry Teaser Widget (v2)

## Purpose

Highlight one resolved content entry with bounded layout, heading, media, CTA,
and fallback controls.

The widget supports:

- legacy content-type sources with `latest`, `featured`, or `manual` entry
  selection
- listing-query sources with `latest`, `featured`, or deterministic `manual`
  row selection
- admin preview hydration through an internal preview route
- fixed-map layout/media controls without raw class-name passthrough

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
  - listing: `latest`, `featured`, `manual`
- content-type picker and manual entry picker
- listing query/template picker
- manual listing-row picker for previewed rows with stable IDs

### Visual

Visual owns daily content-facing presentation and destination editing.

Sections:
1. Variant and structure
2. Section context
3. Source summary (read-only)
4. Teaser content fields
5. Layout and media
6. Style
7. CTA behavior
8. Fallback state

Notes:

- Entry Teaser keeps `visualOwnsVariantSelection = true`.
- Source mutation is intentionally read-only here to avoid duplicated editor
  ownership.
- Field toggles show a local preview card that uses resolved preview data when
  available.
- CTA custom destinations use the shared page-first `LinkDestinationField`;
  saved legacy custom/hash/external hrefs stay replace-or-clear compatible.
- Style colors are swatch-only for ordinary editing. Saved custom CSS/token
  values remain readable as saved custom color state that can be replaced or
  cleared.

### Advanced

Advanced is read-only diagnostics only. It never mutates source, destination,
layout, media, style, or fallback settings.

Sections:
1. Source diagnostics
2. Presentation diagnostics
3. Runtime summary
4. Contract summary

Notes:

- Advanced now opens with an explicit read-only banner, matching the Hero
  daily-tab pattern.
- Wizard/Visual/Advanced ownership is also restated inside a read-only
  contract summary instead of leaving that split implicit.

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
- `manual`: selected `source.listingManualTarget`
- if no listing featured match exists and `fallback.fallbackToLatest === true`,
  runtime falls back to the first listing result

Manual listing targets persist as:

- `source.listingManualTarget.rowId`: stable row identifier from the listing
  preview/runtime row
- `source.listingManualTarget.entryId`: duplicated when the listing source is
  `entries` or `posts`, so runtime can prefer a stable entry/post ID match

Rows without stable IDs are not offered in the manual picker.

### Admin preview

- Page Editor and Widget Template Editor keep preview-only resolved data in
  transient editor context, not in persisted widget JSON.
- `POST /widgets/entry-teaser/preview` is an internal admin endpoint used only
  for editor preview hydration.
- Advanced runtime summary reads preview state when available, but renders
  human-readable summary rows instead of raw JSON.

### CTA safety

- `hrefMode: "auto"` uses the resolved entry detail route from
  `site.contentRoutes`
- `hrefMode: "custom"` is edited through a page picker; existing relative,
  hash, or `http(s)` hrefs stay compatible as saved custom destinations
- invalid custom URLs normalize to an empty non-navigating CTA state
- `opensInNewTab` resolves through shared safe-link helpers and adds
  `rel="noopener noreferrer"`
- `cta.label`, `fallback.title`, and `fallback.description` are length-bounded
  in the editor and normalizer.

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

- `style.surface` and `style.border` use the shared swatch-only
  `SharedColorControl` in Visual
- clear removes the persisted style field instead of writing a sentinel token
- fresh defaults do not persist CSS variable strings for surface/border
- saved CSS variables, `rgba(...)`, or other legacy custom strings are shown as
  saved custom color state and can be replaced by a swatch or cleared

## Data Model Summary

```json
{
  "sourceMode": "latest",
  "source": {
    "mode": "legacy",
    "listingQueryId": "",
    "listingTemplateId": "",
    "listingManualTarget": {
      "rowId": "",
      "entryId": ""
    },
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

## TASK-336-18 Editor Contract

- Exports `entryTeaserEditorContract` with `version: 2`.
- Contract target: Wizard owns source setup; Visual owns display fields, CTA,
  fallback copy, media, layout, and style; Advanced is read-only source/runtime
  diagnostics.
- `TASK-336-19` closes the stale Advanced mutation and raw custom authoring
  drift for Entry Teaser: Wizard is source-only, Visual owns page-first CTA and
  swatch-only style authoring, and Advanced renders summary rows only.
