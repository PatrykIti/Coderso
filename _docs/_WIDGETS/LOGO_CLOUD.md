# Logo Cloud Widget (v1)

> **Historical compatibility boundary:** this file documents a retained renderer/read-
> compatibility contract. Configurable widgets exist only on the Admin Dashboard;
> active editors own their sections and blocks. Do not add or expand a non-Dashboard
> editor, registry entry, preset, or module-pack surface from this file.

## Purpose

Trust-focused section that displays partner/client logos with optional links.

## Widget ID

`logo-cloud`

## Variants (v1)

- `grid`: balanced multi-column logo grid
- `strip`: horizontal wrapped strip
- `dense`: high-density logo matrix

## Editor Modes (current after TASK-336-19)

### Wizard (one-time starter setup)
- Read-only current layout
- Read-only logo count

Wizard no longer edits layout, title, count, or starter logo rows. Images,
accessible descriptions, logo destinations, CTA, count changes, and
presentation styling belong to Visual after first setup or an explicit
`Run setup again`.

### Visual (primary editing mode)
Sections:
1. Variant and layout structure
2. Header copy
3. Logos list and links
4. Section CTA
5. Display style

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
  picking, explicit accessible descriptions, and read-only replace/clear
  guidance for legacy invalid/broken image URLs.
- Visual repeated-logo cards now support drag-handle reorder plus inline Undo
  after removal, while retaining Move up / Move down as deterministic fallback
  controls.
- Reducing `Logo count` confirms before truncating saved logo rows. The prompt
  names the first removed logos and blocks the reduction when cancelled.
- `Display style` now also exposes Strip-only `Row behavior` and `Motion`
  controls for wrapped rows, single-row overflow, and marquee gating.
  Grid/Dense show saved Strip values as inactive; Visual and Advanced report
  the effective state separately from saved Strip settings.
- `Section CTA` now owns one optional CTA below the logo list with enable
  toggle, label, published-page destination, and target controls.
- `Display style` now also owns bounded `Tile radius`, `Tile border width`, and
  one global `Open logo links in new tab` toggle for logo tiles.
- Section, tile, and tile-border colors use swatch-only controls in Visual.
  Theme tokens, saved legacy custom colors, and fallback previews are labelled
  separately instead of asking authors to type raw CSS variables or color
  tokens.
- `Colorize on hover` is effective only when grayscale is enabled. Turning
  grayscale off clears the saved hover-color flag and renders the disabled
  hover switch unchecked.

### Advanced (read-only diagnostics)
- Layout summary
- Content summary
- Presentation summary
- Authoring boundaries

Advanced does not duplicate live Logo Cloud style controls. It exposes human
read-only summaries for layout, logo/media/link readiness, CTA state, visual
presentation, and the Wizard/Visual ownership boundary. It does not render raw
JSON payloads and it does not expose normalize/reset mutations.

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
- Saved Strip row/motion values are preserved for later Strip use, but runtime
  `data-logo-cloud-row-mode` and `data-logo-cloud-motion` always expose the
  effective behavior for the active variant.
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

## Playwright Fixture Seed

The widget contract smoke harness seeds one deterministic Logo Cloud image when
the selected smoke cases include `logo-cloud`. The seed uses the existing
authenticated admin media API, including CSRF, and uploads
`widget-fixture-logo-cloud-acme.svg` as `image/svg+xml` only when a valid
matching image is not already present. Existing matching fixtures keep their
stored file and receive only metadata updates for `alt`, `title`, and
`caption`.

After the seed, the smoke admin probe runs a Logo Cloud `mediaProof`: it opens
Visual, selects the seeded asset through the real MediaPicker, confirms admin
preview image/alt/grayscale/hover output, publishes the fixture page, and then
checks the public fixture route for the same `<img>` behavior.

This seed exists only to make browser-level MediaPicker proof reproducible. It
does not change public runtime behavior, widget defaults, or production media
resolution.

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
    "href": "",
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

## TASK-336-19 Editor Contract

- Exports `logoCloudEditorContract` with `version: 2`.
- Contract target: Wizard is a read-only starter summary; Visual owns layout,
  logo count, headline copy, logo images, accessible descriptions,
  destinations, CTA, motion, swatch-only color controls, and style; Advanced
  is read-only human diagnostics.
- Wizard/Visual duplicate ownership has been removed for the normal editor
  flow; saved legacy state remains backward-compatible without reopening raw
  `TASK-336-19`.

## Validation Surface

- `tests/vitest/widgets/logoCloud.test.tsx`
- `tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `tests/vitest/widgets/logoCloudStyles.test.ts`
