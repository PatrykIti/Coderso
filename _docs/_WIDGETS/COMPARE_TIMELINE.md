# Compare Timeline Widget (v1)

## Purpose

Porownanie dwoch procesow na wspolnej osi bez dat.
Przyklad: tradycyjna budowa vs budowa z firma.

## Widget ID

`compare-timeline`

## Variants (v1)

- dual-track (dwie linie, wspolna os i etykiety etapow)
- dual-track-highlight (z wyroznionymi segmentami na wybranym torze)

## Wizard flow (v1)

- Pytanie 1: Nazwy torow (np. "Tradycyjna budowa" / "Z nami")
- Pytanie 2: Etapy osi (3-6)
- Pytanie 3: Markery na torze A (wybor etapow)
- Pytanie 4: Markery na torze B (wybor etapow)
- Pytanie 5: Czy wyroznic segmenty? (tak/nie)
- Pytanie 6: Ktory tor jest priorytetem (kolor akcentu)

## Visual mode

- Podglad dwoch osi z etykietami.
- Wariant highlight pokazuje segmenty w kolorze akcentu.

## Advanced options (v1)

- axis: lista etapow (etykieta, opis opcjonalny)
- tracks: nazwy, markery, segmenty
- highlight: kolor, styl labeli
- guides: enabled, style
- layout: spacing miedzy torami, labelPosition

## Data model (summary)

```json
{
  "variant": "dual-track",
  "axis": {
    "steps": [{ "label": "string" }]
  },
  "tracks": [
    {
      "id": "a",
      "label": "string",
      "markers": [0, 1, 2]
    },
    {
      "id": "b",
      "label": "string",
      "markers": [0, 2, 3],
      "segments": [{ "from": 1, "to": 2, "label": "string" }]
    }
  ],
  "guides": { "enabled": true, "style": "dashed" },
  "style": {
    "highlightColor": "amber"
  }
}
```
