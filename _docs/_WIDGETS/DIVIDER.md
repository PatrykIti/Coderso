# Divider Widget (v2)

> **Historical compatibility boundary:** this file documents a retained renderer/read-
> compatibility contract. Configurable widgets exist only on the Admin Dashboard;
> active editors own their sections and blocks. Do not add or expand a non-Dashboard
> editor, registry entry, preset, or module-pack surface from this file.

## Purpose

Reusable visual separator for structuring layouts with optional centered label,
bounded line-style controls, and spacer-only vertical rhythm mode.

## Widget ID

`divider`

## Variants

- `line`: standard solid separator baseline
- `dashed`: starts with a dashed line-style baseline
- `label-center`: line with optional centered label

## Slots

None.

## Editor Modes

### Wizard
- live preview
- read-only divider style summary

Wizard is a one-time setup surface. It seeds the basic separator style only.
Completed widgets use Visual for daily label, line, width, color, alignment,
and spacing changes.

### Visual
Sections:
1. `Preview`
2. `Variant and label`
3. `Line style and width`
4. `Spacing around divider`

Notes:
- Divider owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- `label-center` adds label color, typography, letter-spacing, gap, and clear-label controls.
- Line color uses a swatch-first control and spacing uses token presets; Visual
  does not expose raw CSS/token text entry for nontechnical authoring.
- Width and spacing compatibility values remain supported, but normal Visual
  authoring uses friendly width and rhythm labels instead of raw CSS lengths.

### Advanced
Sections:
1. `Preview`
2. `Runtime divider summary`
3. `Support summary`

Notes:
- Advanced is read-only diagnostics; variant, line, width, color, and spacing
  edits are Visual-owned.
- Advanced shows human runtime/support summaries only. It does not render raw
  JSON payload snapshots, hidden mutators, raw CSS/length text entry, or
  writable line/width/spacing controls.

## Runtime Behavior Notes

- Width modes:
  - `full`: `100%`
  - `container`: bounded token width (`sm`, `md`, `lg`)
  - `custom`: legacy/runtime-compatible saved CSS length; new Visual authoring
    offers bounded width presets instead of a raw CSS length textbox
- Non-full dividers support `left`, `center`, and `right` alignment.
- `label-center` renders label text only when the label is non-empty and
  `visibility="line"`.
- `visibility="spacer-only"` preserves vertical rhythm without a visible line.
- Line styling is bounded to:
  - `solid`
  - `dashed` with bounded dash patterns
  - `dotted`
- Transparency is controlled through bounded opacity tokens.
- `color` and `labelColor` are normalized before rendering. Imported/admin/API
  payloads may only use bounded clearable CSS colors:
  - hex colors (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`)
  - bounded `rgb/rgba` and `hsl/hsla` values
  - `var(--color-*)` theme tokens
  - `transparent`, `currentColor`, and `inherit`
- Unsafe CSS strings such as `url(...)`, `expression(...)`, `javascript:`,
  `data:`, delimiter injection, unknown functions, and malformed colors are
  rejected before they can reach inline styles or dashed/dotted gradients.

## Runtime Marker Contract

The public DOM keeps deterministic bounded markers but no longer exposes raw
style strings.

Exposed markers:
- `data-divider`
- `data-divider-variant`
- `data-divider-thickness`
- `data-divider-color-kind`
- `data-divider-width-mode`
- `data-divider-width-kind`
- `data-divider-margin-top-kind`
- `data-divider-margin-bottom-kind`
- `data-divider-has-label`
- `data-divider-line-style`
- `data-divider-visibility`

## Data Model (summary)

```json
{
  "label": "",
  "labelColor": "var(--color-border)",
  "labelSize": "xs",
  "labelWeight": "medium",
  "labelTransform": "uppercase",
  "labelLetterSpacing": "wide",
  "labelGap": "3",
  "thickness": 1,
  "color": "var(--color-border)",
  "width": "full",
  "containerWidth": "md",
  "customWidth": "320px",
  "align": "center",
  "lineStyle": "solid",
  "opacity": "100",
  "dashPattern": "browser",
  "visibility": "line",
  "marginTop": "6",
  "marginBottom": "6"
}
```

## Backward Compatibility

- Legacy saved `0` spacing values still normalize safely, but the editor shows
  only the canonical `None` off-state.
- Legacy saved unitless custom widths still normalize safely in runtime, while
  new editor authoring requires explicit CSS lengths.
- Existing dashed variants keep their dashed baseline even when `lineStyle`
  was not previously persisted.
- Saved custom width and spacing values remain compatible and can be replaced
  through friendly Visual presets.
- Unsafe saved colors are not preserved as active runtime behavior. The line
  color falls back to `var(--color-border)`, and label color falls back to the
  sanitized line color.
