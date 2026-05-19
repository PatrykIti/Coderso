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
- Compact starter-logo rows with Name, Image URL, Alt text, Link URL, bounded
  preview, and Media Library picking for the visible wizard count

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
  widget-local image preview/media picking stay owned by the `TASK-274` product
  family.
- `Header copy` now includes an optional `Eyebrow` field.
- `Display style` now includes `Section background`, `Header alignment`, and
  `Header size` controls.
- Visual repeated-logo cards now expose bounded previews, Media Library image
  picking, explicit `Alt text`, and an editor-local unavailable-preview state
  for invalid/broken image URLs.
- Visual repeated-logo cards now support drag-handle reorder plus inline Undo
  after removal, while retaining Move up / Move down as deterministic fallback
  controls.

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
  - `data-logo-cloud-header-align`
  - `data-logo-cloud-header-size`
- When a section title is present, the shared section shell renders it as
  `<h2>` and names the region through `aria-labelledby`. When the title is
  empty, the section falls back to `aria-label="Partner logos"`.
- Logo cards render as links only when `href` is provided.
- Logo images render explicit `logos[].alt` when present and fall back to
  `logos[].name` for legacy payloads.
- Missing image URL falls back to text logo label.
- `logoHeight: "none"` keeps the visible token in normalized data, but runtime
  image output is still capped with `max-h-16` so tall assets stay bounded.

## Clear Controls

- `style.sectionBackground`, `style.tileBackground`, and
  `style.tileBorderColor` are clearable; clear removes the inline surface field
  instead of forcing transparent/fallback styles.
- Section background renders as an inline surface color only when the field is
  explicitly set; the current defaults leave the section transparent.
- Logo height, gap, grayscale, hover-color, and alignment keep their existing
  token/boolean semantics. `logoHeight: "none"` remains a shared “no fixed
  token” choice rather than an unbounded image-height escape hatch.

## Data Model (summary)

```json
{
  "header": {
    "eyebrow": "",
    "title": "Trusted by teams worldwide",
    "description": "Showcase partner and client logos to build instant credibility."
  },
  "logos": [
    {
      "id": "logo-1",
      "name": "Acme",
      "alt": "Acme partner logo",
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
    "headerAlign": "center",
    "headerSize": "md",
    "tileBackground": "var(--color-bg)",
    "tileBorderColor": "color-mix(in srgb, var(--color-border) 60%, transparent)"
  }
}
```
