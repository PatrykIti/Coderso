# Screen Two Column Widget (v1)

## Purpose

Screen-builder layout primitive for placing primary record content beside a
supporting admin panel.

## Widget ID

`screen-two-column`

## Surfaces and Data Access

- surfaces: `custom-screen-builder`, `admin-editor-view`
- data access: `selected-content-type` (`read`)

## Variants (v1)

- `balanced`: two equal columns
- `aside`: primary column plus narrower supporting aside

## Slots

- `left`: primary column
- `right`: secondary column

## Editor Modes

### Wizard

- variant selection
- left/right column labels
- fast structure-first setup before chrome tuning

### Visual

- left/right labels
- gap token (`none | sm | md | lg`)
- slot guidance for primary editable content vs supporting context

### Advanced

- clearable column background and border tokens
- removable chrome only; no duplicate structure editing

## Nested Rendering

- `left` and `right` slots render nested screen widgets through the shared
  read-only screen-widget bridge in preview and the read-only portions of the
  record editor.
- Nested child widgets are rendered as separate canvas blocks instead of being
  flattened into one parent-only surface.

## None Token Support

- `gap`: `none` renders zero grid gap between columns.

## Clear Controls

- `style.columnBackground` and `style.columnBorderColor` are clearable; clear
  removes column frame style fields and preserves the left/right slot layout.
- Related custom-screen widgets use the same frame style clear semantics:
  `screen-record-header` (`frameBackground`, `frameGradient`,
  `frameBorderColor`), `screen-field-value` (`frameBackground`,
  `frameBorderColor`), and `screen-field-group` (`frameBackground`,
  `frameBorderColor`).

## Data Model (summary)

```json
{
  "leftTitle": "Primary",
  "rightTitle": "Details",
  "gap": "md",
  "style": {
    "columnBackground": "color-mix(in srgb, var(--color-bg) 60%, transparent)",
    "columnBorderColor": "color-mix(in srgb, var(--color-border) 60%, transparent)"
  }
}
```
