# Divider Widget (v1)

## Purpose

Reusable visual separator for structuring layouts with optional centered label.

## Widget ID

`divider`

## Variants (v1)

- `line`: standard solid line
- `dashed`: dashed line style
- `label-center`: line with optional centered label

## Slots

None.

## Editor Modes (current after TASK-050-15-07)

### Wizard
- divider style
- optional center label (for `label-center`)
- line thickness

### Visual
Sections:
1. Variant and label
2. Line style and width
3. Spacing around divider

Notes:
- Divider owns variant selection in Visual (`visualOwnsVariantSelection = true`).

### Advanced
- direct token-level access to thickness, color, width mode and spacing
- normalized payload snapshot

## Runtime Behavior Notes

- Renders a deterministic separator with style and spacing markers.
- Supports width modes:
  - `full`: 100%
  - `container`: constrained width
  - `custom`: user-defined width value
- `label-center` renders centered label only when label is non-empty.
- Exposes deterministic runtime markers:
  - `data-divider`
  - `data-divider-variant`
  - `data-divider-thickness`
  - `data-divider-color`
  - `data-divider-width-mode`
  - `data-divider-width-resolved`
  - `data-divider-custom-width`
  - `data-divider-margin-top`
  - `data-divider-margin-bottom`
  - `data-divider-has-label`

## Data Model (summary)

```json
{
  "label": "",
  "thickness": 1,
  "color": "var(--color-border)",
  "width": "full",
  "customWidth": "320px",
  "marginTop": "6",
  "marginBottom": "6"
}
```
