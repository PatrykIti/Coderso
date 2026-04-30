# Logo Cloud Widget (v1)

## Purpose

Trust-focused section that displays partner/client logos with optional links.

## Widget ID

`logo-cloud`

## Variants (v1)

- `grid`: balanced multi-column logo grid
- `strip`: horizontal wrapped strip
- `dense`: high-density logo matrix

## Editor Modes (current after TASK-050-13-01)

### Wizard (minimal onboarding)
- Logo cloud layout variant
- Section title
- Logo count
- Basic names for all visible logos in the selected wizard count

The wizard count selector and rendered logo-name inputs must stay synchronized.

### Visual (primary editing mode)
Sections:
1. Variant and layout structure
2. Header copy
3. Logos list and links
4. Display style

Notes:
- Logo Cloud owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Generic Visual variant selector is suppressed.

### Advanced (technical-only)
- Technical layout tokens
- Normalization and safeguards
- Raw payload snapshot

## Runtime Behavior Notes

- Invalid/unknown variant falls back to `grid`.
- Renderer outputs deterministic markers:
  - `data-logo-cloud-variant`
  - `data-logo-cloud-gap`
  - `data-logo-cloud-count`
  - `data-logo-cloud-alignment`
  - `data-logo-cloud-grayscale`
  - `data-logo-cloud-hover-color`
- Logo cards render as links only when `href` is provided.
- Missing image URL falls back to text logo label.

## Clear Controls

- `style.tileBackground` and `style.tileBorderColor` are clearable; clear
  removes the tile style fields and logo tiles render without forced background
  or border-color inline styles.
- Logo height, gap, grayscale, hover-color, and alignment keep their existing
  token/boolean semantics.

## Data Model (summary)

```json
{
  "header": {
    "title": "Trusted by teams worldwide",
    "description": "Showcase partner and client logos to build instant credibility."
  },
  "logos": [
    {
      "id": "logo-1",
      "name": "Acme",
      "image": "https://cdn.example.com/acme.svg",
      "href": "https://acme.example.com"
    }
  ],
  "style": {
    "logoHeight": "md",
    "grayscale": true,
    "hoverColor": true,
    "gap": "md",
    "alignment": "center",
    "tileBackground": "var(--color-bg)",
    "tileBorderColor": "color-mix(in srgb, var(--color-border) 60%, transparent)"
  }
}
```
