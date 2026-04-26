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

Wizard media selection uses admin media cache and persists only schema-owned
public runtime fields such as `image`, `video`, `caption`, and `href`.

### Visual (primary editing mode)
Sections:
1. Variant and media structure
2. Header copy
3. Media items and links
4. Overlay and caption controls
5. Layout style

Notes:
- Gallery Mosaic owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Generic Visual variant selector is suppressed.

### Advanced (technical-only)
- Technical ratio and layout tokens
- Normalization and safeguards
- Raw payload snapshot

## Runtime Behavior Notes

- Invalid/unknown variant falls back to `mosaic`.
- Renderer outputs deterministic markers:
  - `data-gallery-mosaic-variant`
  - `data-gallery-mosaic-gap`
  - `data-gallery-mosaic-ratio`
  - `data-gallery-mosaic-count`
  - `data-gallery-mosaic-caption-position`
  - `data-gallery-media-type`
- Media priority per item:
  - `video` when video URL exists
  - otherwise `image`
  - otherwise placeholder tile

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
  "style": {
    "ratio": "4:3",
    "gap": "md",
    "radius": "lg",
    "overlay": "rgba(15, 23, 42, 0.35)",
    "captionPosition": "inside"
  }
}
```
