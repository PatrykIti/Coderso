# Page Builder Data Model (v1)

Specyfikacja JSON dla `pages.current_data` i `pages.published_data`.
Model musi byc stabilny i wersjonowany.

## Root document

```json
{
  "schemaVersion": 1,
  "title": "Home",
  "seo": {
    "title": "string",
    "description": "string",
    "noIndex": false
  },
  "blocks": []
}
```

## Block structure

```json
{
  "id": "uuid",
  "type": "hero",
  "variant": "centered",
  "data": {},
  "layout": {
    "container": "default",
    "padding": { "top": "xl", "bottom": "xl" },
    "margin": { "top": "none", "bottom": "none" },
    "background": { "color": "white", "image": null }
  },
  "visibility": {
    "devices": ["desktop", "mobile"],
    "enabled": true
  },
  "editor": {
    "mode": "visual",
    "wizardCompleted": true
  }
}
```

Notes:
- `editor` jest tylko dla `current_data` (nie kopiujemy do published).
- `variant` jest opcjonalny, ale rekomendowany dla widgetow.

---

## Layout tokens (v1)

Dozwolone wartosci:
- container: `default | narrow | full`
- spacing: `none | xs | sm | md | lg | xl | 2xl`

---

## Example: Hero block

```json
{
  "id": "b1",
  "type": "hero",
  "variant": "split",
  "data": {
    "headline": "Budujemy szybciej",
    "subhead": "Oszczedzaj czas",
    "primaryCta": { "label": "Umow konsultacje", "href": "/kontakt" },
    "media": { "type": "image", "src": "/img/hero.jpg", "alt": "Dom" }
  },
  "layout": {
    "container": "default",
    "padding": { "top": "xl", "bottom": "xl" },
    "background": { "color": "white" }
  }
}
```

---

## Example: Compare timeline block

```json
{
  "id": "b2",
  "type": "compare-timeline",
  "variant": "dual-track-highlight",
  "data": {
    "axis": { "steps": [{ "label": "Projekt" }, { "label": "Fundament" }] },
    "tracks": [
      { "id": "a", "label": "Tradycyjna budowa", "markers": [0, 1] },
      { "id": "b", "label": "Z nami", "markers": [0, 1],
        "segments": [{ "from": 0, "to": 1, "label": "Prefabrykacja" }] }
    ],
    "guides": { "enabled": true, "style": "dashed" },
    "style": { "highlightColor": "amber" }
  }
}
```
