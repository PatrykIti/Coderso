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
- quick preset cards and matching variant cards
- label/title/description onboarding
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
- Section also owns optional editor-only region labels keyed by the stable
  repeatable slot instance id; the shared builder surfaces reuse them without
  changing `region:<id>` storage or public runtime copy.
- Shared inspector rows emit stable `data-widget-editor-section` and
  `data-widget-control` metadata for automation and accessible labels.
- Width, min-height, region flow, and spacing are bounded by schema-owned
  layout tokens instead of raw CSS fields.
- Width controls use friendly labels such as `7XL (80rem / 1280px)`, and the
  editor guidance explains that `Wide alias` intentionally shares the same
  wrapper classes as `Content`; visible widening comes from `Max width`, while
  true edge-to-edge still needs `Bleed` + `Full-width wrapper` + `No max width`.
- Grid columns stay inactive until `layout.regionFlow = "grid"`, and `regionGap`
  can remain unset to keep the legacy variant spacing contract.
- Responsive padding overrides now use the same bounded padding tokens with
  `Match base` fallbacks; mobile-only overrides automatically restore the base
  token from `md` upward.
- Visual guidance explains that two gradient stops become the visible surface
  while background color remains the fallback after the gradient is cleared.
- Heading controls now include bounded `h1`-`h6`, left/center/right alignment,
  label/title/description size tokens, and clearable heading text colors with
  guidance that the default section title remains `h2`.
- Surface and borders now adds optional shadow and motion presets plus a derived
  `Surface preview` swatch; the preview reflects current background, gradient,
  overlay, border, radius, and effective shadow without persisting extra state.
- Background media is decorative only: Visual exposes bounded image/video source,
  fit, position, blend, opacity, and layer-order controls plus video poster
  metadata without widening Section into interactive media.

### Advanced
- semantics tokens (`anchorId`, `ariaLabel`)
- normalized payload snapshot for diagnostics
- no duplicated surface numeric controls; `gradientAngle` and `overlayOpacity` stay in Visual

## Local Presets

- `Standard content`: legacy-safe grouped content baseline
- `Framed panel`: contained panel with light framing
- `Edge-to-edge`: applies `bleed` plus `layout.containerWidth = "full"` and `layout.maxWidth = "none"`
- `Hero band`: centered heading with `layout.minHeight = "hero"` and generous spacing
- `Two-column region group`: safe default two-column grid with `layout.maxWidth = "7xl"`
- Presets preserve current heading copy and region slot content while resetting only supported Section-owned `heading`, `layout`, `style`, and `variant` tokens.

## Runtime Behavior Notes

- Renders semantic element selected in data (`section` or `div`).
- Supports optional overlay on top of background color/gradient.
- Optional `style.shadow` tokens stay bounded to `none`, `sm`, `md`, `lg`, and
  `xl`; when unset, contained sections keep the legacy `shadow-sm` framing while
  other variants stay flat.
- Optional `style.motion` is bounded to CSS-only `none`, `fade`, and
  `slide-up`, always emitted through `motion-safe` / `motion-reduce` classes and
  never through observers or inline scripts.
- Optional `regions[]` metadata can relabel builder-only slot affordances by
  stable repeatable instance id, but runtime markup keeps generic structural
  markers only and never emits author labels publicly.
- Section headings default to a safe `h2` path and can opt into bounded `h1`-`h6`,
  left/center/right alignment, size tokens, and optional clearable text colors
  without widening into rich text or raw HTML.
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
  - `data-section-shadow`
  - `data-section-motion`
  - `data-section-background-media`
  - `data-section-layer-order`
  - `data-section-regions`
  - `data-section-element`
  - `data-section-background-overlay` per rendered overlay layer
  - `data-section-region` per region slot instance

## Clear Controls

- `style.backgroundColor` is clearable; clear removes the key and the renderer
  omits a forced `backgroundColor` style.
- `style.gradientFrom` and `style.gradientTo` are also clearable; when both are
  absent, the gradient output drops and background color remains the visible
  fallback.
- `overlayOpacity: 0` remains the existing no-output behavior and is not
  replaced with a `None` token.
- Deliberate `transparent` authored by a user remains a normal color value.

## Data Model (summary)

```json
{
  "heading": {
    "label": "",
    "title": "",
    "description": "",
    "level": "h2",
    "align": "left",
    "labelSize": "xs",
    "titleSize": "2xl",
    "descriptionSize": "sm"
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
    "shadow": "none",
    "motion": "none",
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

Responsive padding override keys stay absent until an author chooses a mobile
or desktop deviation from the base padding tokens.

## Heading Tokens

- `heading.level`: bounded `h1` to `h6`; legacy and default output stays on `h2`
- `heading.align`: `left`, `center`, `right`
- `heading.labelSize`: `xs`, `sm`, `md`
- `heading.titleSize`: `xl`, `2xl`, `3xl`
- `heading.descriptionSize`: `sm`, `base`, `lg`
- `heading.labelColor`, `heading.titleColor`, `heading.descriptionColor`: optional
  clearable text colors that reuse the shared token-aware clearable field contract

## Layout Tokens

- `layout.paddingBlock`: base vertical padding token `sm`, `md`, `lg`, `xl`
- `layout.paddingInline`: base side padding token `none`, `sm`, `md`, `lg`
- `layout.mobilePaddingBlock`, `layout.mobilePaddingInline`: optional mobile
  overrides that replace the base padding on smaller screens while `md` restores
  the base token when no desktop override is present
- `layout.desktopPaddingBlock`, `layout.desktopPaddingInline`: optional `md`+
  overrides that replace the base or restored desktop padding through bounded
  class maps only
- `layout.minHeight`: `none`, `compact`, `hero`, `screen`
- `layout.regionFlow`: `stack`, `row`, `grid`
- `layout.regionColumns`: `1` to `8`, applied only when `regionFlow = "grid"`
- `layout.headingGap`: `none`, `sm`, `md`, `lg`, `xl`
- `layout.regionGap`: optional `none`, `sm`, `md`, `lg`, `xl`; if omitted, the
  renderer keeps the legacy variant spacing (`default=lg`, `contained=md`,
  `bleed=xl`)

## Region Metadata

- `regions[]`: optional editor-only `{ id, label }` entries keyed by the
  repeatable region instance id (`1`, `2`, ... or normalized from `region:<id>`).
- Empty or missing labels fall back to the shared builder copy (`Region N`).
- Shared builder surfaces (`VisualPanelSlotControls`, canvas slot headers, and
  insert-target selectors) may render custom labels, but public runtime output
  stays unlabeled unless a future user-facing caption contract is added.

## Surface Tokens

- `style.shadow`: optional `none`, `sm`, `md`, `lg`, `xl`; when omitted, the
  renderer matches the current variant fallback (`contained=sm`, others `none`)
  until the author chooses an explicit override
- `style.motion`: `none`, `fade`, `slide-up`; runtime output stays CSS-only and
  reduced-motion safe through bounded class maps
- `Surface preview` is editor-only derived UI and never persists extra keys into
  `SectionData`

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
