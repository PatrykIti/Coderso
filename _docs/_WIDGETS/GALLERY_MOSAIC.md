# Gallery Mosaic Widget (v1)

## Purpose

Media storytelling section for portfolios, product highlights, and campaigns.

## Widget ID

`gallery-mosaic`

## Variants (v1)

- `mosaic`: asymmetric layout with lead media emphasis
- `uniform-grid`: consistent media tile grid
- `feature-left`: large lead media on left and supporting stack on right

## Editor Modes (current after TASK-050-13-02)

### Wizard (minimal onboarding)
- Gallery layout variant
- Section title
- Initial media count
- Shared MediaPicker-backed media selection

Wizard media selection currently uses the admin media cache for current-contract
image and video assets and persists selected media as schema-owned public
`image` or `video` values plus caption copy. It does not seed
`header.description`; Visual owns supporting copy after setup.
Wizard now also points authors toward the final flow: Visual owns per-item
captions, destinations, alt text, posters, lightbox, density, and motion
controls, while Advanced owns confirm-gated support import/export for the
schema payload.

### Visual (primary editing mode)
Sections:
1. Variant and media structure
2. Header copy
3. Media items and links
4. Interaction
5. Overlay and caption controls
6. Layout style
7. Density and motion

Notes:
- Gallery Mosaic owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Generic Visual variant selector is suppressed.
- Each item now shows a shared-contract current-media badge (`Image`, `Video`,
  `Placeholder`) and saved-asset status text when the persisted media URL came
  from an earlier edit and cannot be rehydrated to a media library id.
- Visual item cards now include a local preview panel plus a per-item
  MediaPicker that can replace or clear the current image/video asset without
  forcing hand-copied asset links. Clearing media also clears the video poster.
- Visual item rows now support drag reorder with keyboard fallback
  (`Alt` + arrow keys), explicit confirmation before destructive count
  reductions or row removal, and a `feature-left` warning when only a single
  lead tile remains.
- Per-item media presentation fields now include dedicated `alt` text, an
  image-only MediaPicker for video poster frames, bounded focus point
  (`center/top/bottom/left/right`), and an optional per-item ratio override that
  can inherit the section ratio.
- Per-item destinations use the shared page-first `LinkDestinationField`.
  Published pages are selectable, while older hand-typed/hash/external
  destinations stay visible as replace-or-clear compatibility state instead of
  editable raw URL fields.
- Interaction controls now include an opt-in lightbox mode plus bounded
  `fit` / `fill` zoom behavior. Items with `href` keep navigation precedence,
  and Visual explains that the link must be cleared before that tile can open
  the lightbox.
- Overlay color authoring uses a swatch-only control with clear/legacy-state
  support and visible saved-opacity guidance instead of asking authors to type
  raw `rgba(...)` or CSS token values.
- Density and motion now stay in bounded product presets: `layoutDensity`
  (`auto`, `compact`, `balanced`, `dense`) changes responsive packing through
  static variant-owned class maps, and `motionPreset` (`none`, `fade`,
  `slide-up`) stays reduced-motion safe.

### Advanced (technical-only)
- Shared style ownership summary (read-only)
- Configuration import/export with explicit confirmation before import
- Confirm-gated normalization and reset support actions
- Runtime summary rows for variant, media count, links, and interaction

Advanced no longer duplicates the live shared style controls that Visual owns
for ratio, gap, radius, caption position, and overlay. It no longer renders a
raw payload snapshot. The bounded JSON import/export surface validates unknown
fields and invalid enum values first, then requires confirmation before applying
the config.

## Runtime Behavior Notes

- Invalid/unknown variant falls back to `mosaic`.
- Renderer outputs deterministic markers:
  - `data-gallery-mosaic-variant`
  - `data-gallery-mosaic-gap`
  - `data-gallery-mosaic-ratio`
  - `data-gallery-mosaic-count`
  - `data-gallery-mosaic-caption-position`
  - `data-gallery-mosaic-interaction`
  - `data-gallery-mosaic-zoom`
  - `data-gallery-mosaic-layout-density`
  - `data-gallery-mosaic-motion`
  - `data-gallery-media-type`
- Media priority per item:
  - `video` when video URL exists
  - otherwise `image`
  - otherwise placeholder tile
- Opt-in lightbox is widget-local and off by default for backward
  compatibility. When enabled, non-linked media tiles render deterministic
  trigger/dialog markers, use instance-scoped ids, close via backdrop, close
  button, or `Escape`, and return focus to the originating trigger.
- Tiles with `href` keep the shared safe-link runtime contract and do not open
  the lightbox.
- Default Gallery Mosaic items no longer seed `href: "#"` so newly inserted or
  reset widgets start without fake custom destinations.
- Responsive layout density stays bounded to variant-owned presets instead of
  raw breakpoint maps. `auto` preserves the legacy layout, while `compact`,
  `balanced`, and `dense` switch only between pre-approved tablet/desktop
  class maps for each variant.
- Motion presets are opt-in and use static Tailwind `motion-safe:*` /
  `motion-reduce:*` classes. `none` remains the default.
- Advanced import/export uses the normalized Gallery Mosaic payload only.
  Invalid JSON, unknown nested fields, or invalid enum values are rejected
  non-destructively with machine-readable error codes and paths. Valid imports
  require explicit confirmation before mutation.
- Shared runtime semantics currently use semantic `<figure>` / `<figcaption>`
  wrappers for gallery media and keep current caption-derived naming/title
  behavior unless a dedicated per-item `alt` value overrides them.
- Current video runtime keeps visible controls available in the shared baseline.
  Poster image is now available per item; broader video product fields remain
  follow-up scope.

## Clear Controls

- `style.overlay` is clearable; clear removes the overlay value and the renderer
  omits the caption overlay node/style instead of writing a transparent overlay.
- `image`, `video`, and `poster` are clearable through Visual actions. Clearing
  the active media also clears the poster because poster frames only apply to
  video items.
- Destinations are clearable through `LinkDestinationField`; caption position
  remains controlled by bounded presets.

## Data Model (summary)

```json
{
  "header": {
    "title": "Gallery highlights",
    "description": "Visual storytelling block for products, portfolio, and campaigns."
  },
  "items": [
    {
      "id": "gallery-1",
      "image": "https://cdn.example.com/photo.jpg",
      "video": "",
      "poster": "",
      "caption": "Product overview",
      "href": "/case-study"
    }
  ],
  "interaction": {
    "mode": "none",
    "zoom": "fit"
  },
  "style": {
    "ratio": "4:3",
    "gap": "md",
    "radius": "lg",
    "overlay": "rgba(15, 23, 42, 0.35)",
    "captionPosition": "inside",
    "layoutDensity": "auto",
    "motionPreset": "none"
  }
}
```

## TASK-336-18 Editor Contract

- Exports `galleryMosaicEditorContract` with `version: 2`.
- Contract target: Wizard seeds initial media/copy/count; Visual owns media,
  captions, links, lightbox, density, and motion; Advanced is read-only runtime
  diagnostics.
- TASK-336-19 removed raw image/video/link/poster URL authoring from normal
  Visual flows. The contract still stores runtime-safe string paths, but the
  beginner UI uses media and page pickers plus read-only legacy state.
- The Wizard contract now matches actual writes: `variant`, `header.title`,
  `items.count`, `items.image`, `items.video`, and `items.caption`.
