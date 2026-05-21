# Section Widget (v1)

## Purpose

Semantic layout wrapper for grouped page bands with local surface styling and
repeatable internal regions.

## Widget ID

`section`

## Variants (v1)

- `default`: balanced wrapper width and region spacing
- `contained`: tighter framed section panel
- `bleed`: expanded section presentation; true edge-to-edge still requires
  `layout.containerWidth = "full"` and `layout.maxWidth = "none"`

## Slots

- `region` (repeatable): region instances are stored as `region:<id>` in
  block `slots` map (`region:1`, `region:2`, ...).

## Editor Modes (current after TASK-050-15-02)

### Wizard
- quick variant selection
- title/description onboarding
- basic background color

### Visual
Sections:
1. Variant and structure
2. Heading and intro
3. Semantics and anchor
4. Width and spacing
5. Surface and borders
6. Regions
7. Background media and layers

Notes:
- Section owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Region count is controlled by builder-owned repeatable slot controls in the
  `Regions` Visual section rather than by a banner above the mode tabs.
- Shared inspector rows emit stable `data-widget-editor-section` and
  `data-widget-control` metadata for automation and accessible labels.
- Width, min-height, region flow, and spacing are bounded by schema-owned
  layout tokens instead of raw CSS fields.
- Grid columns stay inactive until `layout.regionFlow = "grid"`, and `regionGap`
  can remain unset to keep the legacy variant spacing contract.
- Background media is decorative only: Visual exposes bounded image/video source,
  fit, position, blend, opacity, and layer-order controls plus video poster
  metadata without widening Section into interactive media.

### Advanced
- semantics tokens (`anchorId`, `ariaLabel`)
- surface numeric tokens (`gradientAngle`, `overlayOpacity`)
- normalized payload snapshot for diagnostics

## Runtime Behavior Notes

- Renders semantic element selected in data (`section` or `div`).
- Supports optional overlay on top of background color/gradient.
- Supports decorative background image/video layers with bounded fit, position,
  opacity, blend, and overlay ordering; unsupported or unsafe media URLs fail
  closed at render time.
- Background, border, radius, and overlay clipping now live in a decorative
  inset layer instead of the same wrapper that owns slotted child content.
- Slotted child widgets are no longer clipped by the old live surface wrapper,
  so Section itself does not block child `position: sticky` behavior.
- Decorative videos always render as muted, looping, `autoPlay`, `playsInline`,
  and `aria-hidden`, while heading/region content stays above media/overlay
  layers.
- Uses deterministic runtime markers:
  - `data-section-variant`
  - `data-section-container-width`
  - `data-section-max-width`
  - `data-section-min-height`
  - `data-section-region-flow`
  - `data-section-region-columns`
  - `data-section-heading-gap`
  - `data-section-region-gap`
  - `data-section-background-media`
  - `data-section-layer-order`
  - `data-section-regions`
  - `data-section-element`
  - `data-section-background-overlay` per rendered overlay layer
  - `data-section-region` per region slot instance

## Clear Controls

- `style.backgroundColor` is clearable; clear removes the key and the renderer
  omits a forced `backgroundColor` style.
- Empty gradient endpoints and `overlayOpacity: 0` remain the existing
  no-output behavior and are not replaced with a `None` token.
- Deliberate `transparent` authored by a user remains a normal color value.

## Data Model (summary)

```json
{
  "heading": {
    "label": "",
    "title": "",
    "description": ""
  },
  "layout": {
    "containerWidth": "content",
    "maxWidth": "6xl",
    "paddingBlock": "md",
    "paddingInline": "md",
    "minHeight": "none",
    "regionFlow": "stack",
    "regionColumns": "1",
    "headingGap": "md"
  },
  "semantics": {
    "element": "section",
    "anchorId": "",
    "ariaLabel": ""
  },
  "style": {
    "backgroundColor": "transparent",
    "gradientFrom": "",
    "gradientTo": "",
    "gradientAngle": 180,
    "borderColor": "var(--color-border)",
    "borderWidth": "0",
    "radius": "none",
    "overlayColor": "#000000",
    "overlayOpacity": 0,
    "backgroundMedia": {
      "type": "none",
      "source": "external",
      "fit": "cover",
      "position": "center",
      "opacity": 100,
      "blendMode": "normal",
      "layerOrder": "media-under-overlay"
    }
  }
}
```

## Layout Tokens

- `layout.minHeight`: `none`, `compact`, `hero`, `screen`
- `layout.regionFlow`: `stack`, `row`, `grid`
- `layout.regionColumns`: `1` to `8`, applied only when `regionFlow = "grid"`
- `layout.headingGap`: `none`, `sm`, `md`, `lg`, `xl`
- `layout.regionGap`: optional `none`, `sm`, `md`, `lg`, `xl`; if omitted, the
  renderer keeps the legacy variant spacing (`default=lg`, `contained=md`,
  `bleed=xl`)

## Background Media Tokens

- `style.backgroundMedia.type`: `none`, `image`, `video`
- `style.backgroundMedia.source`: `library`, `external`; library selections
  persist `assetId` plus the resolved `src` from `listMediaCached({ force: true })`
- `style.backgroundMedia.fit`: `cover`, `contain`
- `style.backgroundMedia.position`: `center`, `top`, `bottom`, `left`, `right`
- `style.backgroundMedia.blendMode`: `normal`, `multiply`, `screen`, `overlay`
- `style.backgroundMedia.layerOrder`: `media-under-overlay`,
  `overlay-under-media`
- Video-only metadata includes optional `posterSource`, `posterAssetId`,
  `posterSrc`, `title`, and `description` for decorative muted loops
