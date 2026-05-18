# Divider Widget (v2)

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
- divider style
- optional center label
- line thickness
- line color
- width mode plus container/custom width support
- horizontal alignment for non-full widths
- top and bottom spacing

### Visual
Sections:
1. `Preview`
2. `Variant and label`
3. `Line style and width`
4. `Spacing around divider`

Notes:
- Divider owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- `label-center` adds label color, typography, letter-spacing, gap, and clear-label controls.

### Advanced
Sections:
1. `Preview`
2. `Technical divider tokens`
3. `Normalization and safeguards`
4. `Raw payload snapshot`

Notes:
- Advanced keeps the variant field disabled/read-only and routes variant changes
  back to Visual.
- Reset actions are data-only and never mutate the active variant.

## Runtime Behavior Notes

- Width modes:
  - `full`: `100%`
  - `container`: bounded token width (`sm`, `md`, `lg`)
  - `custom`: validated CSS length from the editor
- Non-full dividers support `left`, `center`, and `right` alignment.
- `label-center` renders label text only when the label is non-empty and
  `visibility="line"`.
- `visibility="spacer-only"` preserves vertical rhythm without a visible line.
- Line styling is bounded to:
  - `solid`
  - `dashed` with bounded dash patterns
  - `dotted`
- Transparency is controlled through bounded opacity tokens.

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
