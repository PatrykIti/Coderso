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
- one-time gallery layout seed
- read-only section title summary
- one-time initial media count seed
- read-only configured-media summary

Wizard does not seed `header.description`; Visual owns supporting copy after
setup. Wizard now points authors toward the final flow: Visual owns per-item
captions, destinations, alt text, posters, lightbox, overlay, density, and
motion controls. If the one-time count seed is rerun against existing authored
tiles, reducing the count opens the same destructive confirmation used by
Visual and explains that restoring the count creates placeholders rather than
recovering removed tile data.

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
  lead tile remains. Count-reduction confirmation names removed tiles and calls
  out that saved media, captions, alt text, posters, and destinations are
  removed from the widget data.
- Per-item row removal uses the shared `ConfirmActionDialog` cancel/accept
  flow. It no longer calls native `window.confirm`, and cancel keeps the item
  order plus authored media intact.
- Per-item media presentation fields now include dedicated `alt` text, an
  image-only MediaPicker for video poster frames, bounded focus point
  (`center/top/bottom/left/right`), and an optional per-item ratio override that
  can inherit the section ratio.
- Per-item destinations use the shared page-first `LinkDestinationField`.
  Published pages are selectable, while older hand-typed/hash/external
  destinations stay visible as replace-or-clear compatibility state instead of
  editable raw URL fields.
- Visual textboxes and comboboxes now use the same shared labeled-field
  contract as Hero, including Gallery-local rows and the shared destination
  picker.
- Interaction controls now include an opt-in lightbox mode plus bounded
  `fit` / `fill` zoom behavior. Items with `href` keep navigation precedence,
  and Visual explains that the link must be cleared before that tile can open
  the lightbox. In admin, the editor also explains that the canvas shows static
  lightbox markup; published pages bind the widget-local script.
- Overlay color authoring uses a swatch-only control with clear/legacy-state
  support and visible saved-opacity guidance instead of asking authors to type
  raw `rgba(...)` or CSS token values.
- Density and motion now stay in bounded product presets: `layoutDensity`
  (`auto`, `compact`, `balanced`, `dense`) changes responsive packing through
  static variant-owned class maps, and `motionPreset` (`none`, `fade`,
  `slide-up`) stays reduced-motion safe.

### Advanced (technical-only)
- Runtime summary rows for variant, media count, links, and interaction
- Read-only style summary for ratio, gap, radius, overlay, density, and motion
- Read-only accessibility diagnostics for heading/copy, alt coverage, poster
  coverage, and link/lightbox behavior
- Read-only contract summary for Wizard / Visual / Advanced ownership

Advanced no longer duplicates the live shared style controls that Visual owns
for ratio, gap, radius, caption position, and overlay. It no longer renders a
raw payload snapshot or mutating support actions in the daily tab flow.
When lightbox mode is selected, Advanced reports the effective runtime state:
linked items keep navigation, and a gallery with zero eligible media tiles says
`Lightbox selected; no media tiles currently open` instead of claiming active
lightbox triggers.

## Runtime Behavior Notes

- Invalid/unknown variant falls back to `mosaic`.
- The root section exposes an accessible name in admin and public output:
  `aria-labelledby` points at the visible section heading when present, and
  titleless sections fall back to `aria-label="Gallery"`.
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
- The widget Playwright smoke harness now seeds a deterministic Gallery Mosaic
  image through the authenticated admin media API before media proofs. It also
  defines a video seed for environments whose storage policy allows `video/mp4`;
  the default storage MIME policy may reject that optional video upload without
  failing the image/lightbox proof.
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
- `feature-left` density presets own the grid container classes directly so the
  renderer does not duplicate `grid grid-cols-1` when density changes.
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
- Count reduction is destructive by model. Wizard and Visual both require
  confirmation before reducing authored tiles and explicitly state that
  increasing the count later creates placeholder tiles rather than restoring
  removed media, captions, alt text, posters, or destinations.

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
- Contract target: Wizard is a read-only starter summary; Visual owns media,
  captions, links, lightbox, density, and motion; Advanced is read-only
  runtime/style/accessibility/ownership diagnostics.
- TASK-336-19 removed raw image/video/link/poster URL authoring from normal
  Visual flows. The contract still stores runtime-safe string paths, but the
  beginner UI uses media and page pickers plus read-only legacy state.
- The Wizard contract now seeds layout and item count while keeping title and
  configured-media summaries read-only before Visual editing.
