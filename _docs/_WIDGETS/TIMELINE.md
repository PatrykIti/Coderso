# Timeline Widget (v1)

## Purpose

Elastyczna os procesu bez dat. Uzywana do pokazania etapow lub krokow.

## Widget ID

`timeline`

## Variants (v1)

- milestones (domyslny; linia + markery + etykiety nad osia)
- cards (kroki jako karty przy osi)
- compact (kropki + krotkie etykiety)

## Wizard flow (v1)

- Pytanie 1: Ile etapow? (3-8)
- Pytanie 2: Wariant (milestones / cards / compact)
- Pytanie 3: Uklad (horizontal / vertical)
- Pytanie 4: Etykiety (nad / pod osia)
- Pytanie 5: Linie pomocnicze (tak/nie)

Wizard generuje liste etapow z placeholderami.

## Visual mode

- Podglad osi z krokami i etykietami.
- Po wyborze wariantu wyswietlane sa tylko pasujace opcje.

## Advanced options (v1)

- steps: title, description, icon, accent
- layout: orientation, align, spacing, labelPosition
- guides: enabled, style
- line: style, thickness, markerSize
- background: color

## Data model (summary)

```json
{
  "variant": "milestones",
  "steps": [
    { "title": "string", "description": "string", "icon": "string" }
  ],
  "layout": { "orientation": "horizontal", "align": "center", "labelPosition": "top" },
  "guides": { "enabled": true, "style": "dashed" },
  "style": { "lineStyle": "solid", "markerSize": "md" }
}
```
