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

## Data Model (summary)

```json
{
  "leftTitle": "Primary",
  "rightTitle": "Details",
  "gap": "md"
}
```
