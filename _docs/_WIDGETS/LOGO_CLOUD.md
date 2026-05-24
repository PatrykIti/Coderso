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
- Compact starter-logo rows with Name, Media Library image picking, Alt text,
  published-page destination picking, and bounded preview for the visible
  wizard count

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
- Logo and CTA destinations use the shared published-page destination picker.
  Existing custom/hash/external `href` values stay read-only replace/clear
  state in Wizard/Visual.
- `Header copy` now includes an optional `Eyebrow` field.
- `Display style` now includes `Section background`, `Header alignment`, and
  `Header size` controls.
- Visual repeated-logo cards now expose bounded previews, Media Library image
  picking, explicit `Alt text`, and read-only replace/clear guidance for legacy
  invalid/broken image URLs.
- Visual repeated-logo cards now support drag-handle reorder plus inline Undo
  after removal, while retaining Move up / Move down as deterministic fallback
  controls.
- `Display style` now also exposes Strip-only `Row behavior` and `Motion`
  controls for wrapped rows, single-row overflow, and marquee gating.
- `Section CTA` now owns one optional CTA below the logo list with enable
  toggle, label, published-page destination, and target controls.
- `Display style` now also owns bounded `Tile radius`, `Tile border width`, and
  one global `Open logo links in new tab` toggle for logo tiles.

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
  - `data-logo-cloud-row-mode`
  - `data-logo-cloud-motion`
  - `data-logo-cloud-tile-radius`
  - `data-logo-cloud-tile-border-width`
  - `data-logo-cloud-open-in-new-tab`
- When a section title is present, the shared section shell renders it as
  `<h2>` and names the region through `aria-labelledby`. When the title is
  empty, the section falls back to `aria-label="Partner logos"`.
- Dense layout now eases to `md:grid-cols-4` and only returns to six columns at
  `xl`, keeping max-count logo lists bounded on smaller desktops.
- Strip can stay wrapped, switch to `overflow-x-auto` single-row scroll, or use
  a marquee track that pauses on hover/focus and disables animation under
  reduced motion.
- Tile links can opt into shared safe new-tab behavior through one global
  `openLinksInNewTab` control.
- CTA renders below the logo list only when enabled, labeled, and resolved to a
  safe href.
- Logo cards render as links only when `href` is provided.
- Logo images render explicit `logos[].alt` when present and fall back to
  `logos[].name` for legacy payloads.
- Missing image falls back to text logo label.
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
  "cta": {
    "enabled": false,
    "label": "Get started",
    "href": "#",
    "target": "same-tab"
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
    "rowMode": "wrap",
    "motionMode": "static",
    "tileRadius": "lg",
    "tileBorderWidth": "sm",
    "openLinksInNewTab": false,
    "tileBackground": "var(--color-bg)",
    "tileBorderColor": "color-mix(in srgb, var(--color-border) 60%, transparent)"
  }
}
```

## TASK-336-18 Editor Contract

- Exports `logoCloudEditorContract` with `version: 2`.
- Contract target: Wizard seeds starter logos and copy; Visual owns logo list,
  links, CTA, motion, and style; Advanced is read-only runtime diagnostics.
- Remaining reset/normalize support actions are routed to `TASK-336-19`.
