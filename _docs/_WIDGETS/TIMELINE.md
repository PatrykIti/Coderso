# Timeline Widget (v1)

## Purpose

Elastyczna os procesu bez dat. Uzywana do pokazania etapow lub krokow.

## Widget ID

`timeline`

## Variants (v1)

- horizontal (domyslny)
- vertical
- compact (zredukowane opisy, tylko tytuly)

## Wizard flow (v1)

- Pytanie 1: Ile etapow? (3-8)
- Pytanie 2: Uklad (horizontal / vertical)
- Pytanie 3: Styl (klasyczny / kompakt)

Wizard generuje liste etapow z placeholderami.

## Visual mode

- Podglad osi z krokami i etykietami.
- Po wyborze wariantu wyswietlane sa tylko pasujace opcje.

## Advanced options (v1)

- steps: title, description, icon, accent
- layout: orientation, align, spacing
- line: style, thickness, markerSize
- background: color

## Data model (summary)

```json
{
  "variant": "horizontal",
  "steps": [
    { "title": "string", "description": "string", "icon": "string" }
  ],
  "layout": { "orientation": "horizontal", "align": "center" },
  "style": { "lineStyle": "solid", "markerSize": "md" }
}
```
