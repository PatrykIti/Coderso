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
`image` or `video` URLs plus caption copy. Per-item Visual media picking stays
in `TASK-270-01`.

### Visual (primary editing mode)
Sections:
1. Variant and media structure
2. Header copy
3. Media items and links
4. Interaction
5. Overlay and caption controls
6. Layout style

Notes:
- Gallery Mosaic owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Generic Visual variant selector is suppressed.
- Each item now shows a shared-contract current-media badge (`Image`, `Video`,
  `Placeholder`) so the existing image/video priority is visible before richer
  Gallery-local authoring lands.
- Visual item cards now include a local preview panel plus a per-item
  MediaPicker that can replace the current image or video URL without forcing
  hand-copied asset links.
- Visual item rows now support drag reorder with keyboard fallback
  (`Alt` + arrow keys), explicit confirmation before destructive count
  reductions or row removal, and a `feature-left` warning when only a single
  lead tile remains.
- Per-item media presentation fields now include dedicated `alt` text,
  poster-image URL for video, bounded focus point (`center/top/bottom/left/right`),
  and an optional per-item ratio override that can inherit the section ratio.
- Interaction controls now include an opt-in lightbox mode plus bounded
  `fit` / `fill` zoom behavior. Items with `href` keep navigation precedence,
  and Visual explains that the link must be cleared before that tile can open
  the lightbox.

### Advanced (technical-only)
- Shared style ownership summary (read-only)
- Normalization and safeguards
- Raw payload snapshot

Advanced no longer duplicates the live shared style controls that Visual owns
for ratio, gap, radius, caption position, and overlay.

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
- Shared runtime semantics currently use semantic `<figure>` / `<figcaption>`
  wrappers for gallery media and keep current caption-derived naming/title
  behavior unless a dedicated per-item `alt` value overrides them.
- Current video runtime keeps visible controls available in the shared baseline.
  Poster image is now available per item; broader video product fields remain
  follow-up scope.

## Clear Controls

- `style.overlay` is clearable; clear removes the overlay value and the renderer
  omits the caption overlay node/style instead of writing a transparent overlay.
- Caption position, media links, and media source fields are unchanged by clear.

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
      "caption": "Product overview",
      "href": "#"
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
    "captionPosition": "inside"
  }
}
```
