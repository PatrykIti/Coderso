# Screen Two Column Widget (v1)

## Purpose

Screen-builder layout primitive for placing primary record content beside a
supporting admin panel.

## Widget ID

`screen-two-column`

## Variants (v1)

- `balanced`: two equal columns
- `aside`: primary column plus narrower supporting aside

## Slots

- `left`: primary column
- `right`: secondary column

## Editor Modes

### Visual

- variant selection
- left/right titles
- gap token

### Advanced

- normalized payload snapshot and technical gap token

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
