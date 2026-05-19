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
- `Link URL` inputs surface shared safe-link feedback for invalid values while
  widget-local image preview/media picking stays in the later `TASK-274`
  product family.

### Advanced (technical-only)
- Technical layout diagnostics
- Normalization and safeguards
- Raw payload snapshot

Advanced does not duplicate live Logo Cloud style controls. It exposes a
read-only summary of the shared `logoHeight`, `gap`, and `alignment` tokens,
plus normalize/reset and raw payload diagnostics.

## Runtime Behavior Notes

- Invalid/unknown variant falls back to `grid`.
- Renderer outputs deterministic markers:
  - `data-logo-cloud-variant`
  - `data-logo-cloud-gap`
  - `data-logo-cloud-count`
  - `data-logo-cloud-alignment`
  - `data-logo-cloud-grayscale`
  - `data-logo-cloud-hover-color`
- When a section title is present, the shared section shell renders it as
  `<h2>` and names the region through `aria-labelledby`. When the title is
  empty, the section falls back to `aria-label="Partner logos"`.
- Logo cards render as links only when `href` is provided.
- Missing image URL falls back to text logo label.
- `logoHeight: "none"` keeps the visible token in normalized data, but runtime
  image output is still capped with `max-h-16` so tall assets stay bounded.

## Clear Controls

- `style.tileBackground` and `style.tileBorderColor` are clearable; clear
  removes the tile style fields and logo tiles render without forced background
  or border-color inline styles.
- Logo height, gap, grayscale, hover-color, and alignment keep their existing
  token/boolean semantics. `logoHeight: "none"` remains a shared “no fixed
  token” choice rather than an unbounded image-height escape hatch.

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
