# Section Widget (v1)

> **Historical compatibility boundary:** this file documents a retained renderer/read-
> compatibility contract. Configurable widgets exist only on the Admin Dashboard;
> active editors own their sections and blocks. Do not add or expand a non-Dashboard
> editor, registry entry, preset, or module-pack surface from this file.

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

## Editor Modes (current after TASK-336-19 follow-up)

### Wizard
- read-only section wrapper summary
- guidance that Visual owns heading copy, spacing, surface styling, presets, and media
- no visible surface, CSS, or token text entry; surface authoring stays in Visual

### Visual
Sections:
1. Variant and structure
2. Heading and intro
3. Section link and accessibility
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
- Builder-owned Region controls also emit stable `data-widget-control-path`
  metadata: Add Region maps to `regions`, region rows map to
  `regions.<instanceId>`, and region-label inputs map to
  `regions.<instanceId>.label` with writable ownership.
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
- Section link and accessibility uses beginner-facing copy (`Section link name`
  and `Accessibility name`) while still persisting the normalized
  `semantics.anchorId` / `semantics.ariaLabel` contract.
- Visual guidance explains that two gradient stops become the visible surface
  while background color remains the fallback after the gradient is cleared.
- Heading controls now include bounded `h1`-`h6`, left/center/right alignment,
  label/title/description size tokens, and clearable heading text colors with
  guidance that the default section title remains `h2`.
- Surface and borders now adds optional shadow and motion presets plus a derived
  `Surface preview` swatch; the preview reflects current background, gradient,
  overlay, border, radius, and effective shadow without persisting extra state.
- Gradient angle and overlay opacity now use slider + stepper controls on the
  single-owner Visual surface while keeping exact numeric inputs for precise
  bounded values.
- Background media is decorative only: Visual uses Media Library pickers for
  image/video and poster assets, exposes bounded fit, position, blend, opacity,
  and layer-order controls, and keeps older external media URLs as read-only
  replace-or-clear compatibility state.

### Advanced
- read-only layout, surface, and semantics summaries
- read-only support diagnostics for heading, background media, and visual
  effects
- no raw JSON payload snapshot and no hidden writable inputs
- no duplicated surface numeric controls; `gradientAngle` and `overlayOpacity` stay in Visual
- section link and accessibility editing is Visual-owned so Advanced stays
  diagnostic

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
- Public inline color output is canonicalized at normalization and render time.
  The direct fields `heading.labelColor`, `heading.titleColor`,
  `heading.descriptionColor`, `style.backgroundColor`, `style.borderColor`, and
  `style.overlayColor` use the shared `inherited-render` profile and therefore
  accept canonical `currentColor` and `inherit`. The nested gradient stops
  `style.gradientFrom` and `style.gradientTo` use that profile with
  `allowInheritKeyword=false`: `currentColor` remains valid, but `inherit` is
  rejected instead of being interpolated into a composite. Unsafe or
  semantically invalid values are omitted, never rendered raw.
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
- Page-builder data writes validate Section blocks through the same widget
  schema used by public rendering before create/update/autosave snapshots and
  publish. Invalid enum payloads are rejected before `currentData` or
  `publishedData` persistence instead of becoming public invalid-widget
  placeholders.
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

- `style.backgroundColor` is clearable on an authored `style` object; clear
  removes that key and the renderer omits a forced `backgroundColor` style.
  A legacy document with no `style` object retains the historical normalized
  `transparent` default.
- `style.gradientFrom` and `style.gradientTo` are also clearable; when both are
  absent, the gradient output drops and background color remains the visible
  fallback.
- `overlayOpacity: 0` remains the existing no-output behavior and is not
  replaced with a `None` token.
- Deliberate `transparent` authored by a user remains a normal color value.
- TASK-541 seeds no new replacement bytes. Authored sparse overrides clear by
  omission, while the pre-existing no-`style` defaults (including overlay
  fallback values) remain byte-compatible.

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
    "borderWidth": "0",
    "radius": "none",
    "shadow": "none",
    "motion": "none",
    "overlayColor": "#000000",
    "overlayOpacity": 0,
    "backgroundMedia": {
      "type": "none",
      "source": "library",
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
  clearable text colors authored through swatches; saved custom CSS/token values
  remain replace-or-clear compatible but are not editable as raw text. Public
  runtime emits only the allowlisted color grammar described above.

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
- In the Visual `Regions` section, `Add Region` is action-owned with path
  `regions`, while each label input is writable at
  `regions.<instanceId>.label`.

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
- `style.backgroundMedia.source`: `library`, `external`; normal Visual
  authoring uses `library` via Media Library pickers and persists `assetId` plus
  the resolved `src` from `listMediaCached({ force: true })`. Existing
  `external` values remain runtime-compatible but appear only as read-only
  replace-or-clear compatibility notices.
- `style.backgroundMedia.fit`: `cover`, `contain`
- `style.backgroundMedia.position`: `center`, `top`, `bottom`, `left`, `right`
- `style.backgroundMedia.blendMode`: `normal`, `multiply`, `screen`, `overlay`
- `style.backgroundMedia.layerOrder`: `media-under-overlay`,
  `overlay-under-media`
- Video-only metadata includes optional `posterSource`, `posterAssetId`,
  `posterSrc`, `title`, and `description` for decorative muted loops
