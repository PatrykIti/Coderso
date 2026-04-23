# Content Fields (v1)

Opisuje pola Content Types oraz ich konfiguracje w Admin UI.

## Typy pola

- text, richtext, number, boolean
- select (lista opcji, single albo multi-select)
- media (powiazanie z Media Library)
- relation (powiazanie z innym Content Type)

## Helper text (help)

Pole `help` w definicji pola wyswietla sie jako podpowiedz w edytorze wpisu.
Uzywaj go dla pol mniej oczywistych (np. format, ograniczenia, kontekst).

## Layout & grouping (tabs/sections)

UI pozwala ustawic **tab**, **sekcje**, **szerokosc** i **gestosc wyswietlania**
dla kazdego pola, aby edytor wpisu byl czytelny i WordPress‑like.

Przyklad meta w schema:

```json
{
  "type": "string",
  "xFieldType": "text",
  "xFieldConfig": {
    "layout": {
      "tab": "SEO",
      "section": "Metadata",
      "width": "half",
      "display": "compact"
    }
  }
}
```

Zasady:
- `tab` tworzy nowa zakladke lub dolacza do istniejacej.
- `section` grupuje pola wewnatrz zakladki.
- `width`: `full` lub `half` (uklad 2‑kolumnowy na desktopie).
- `display`: `default` lub `compact` (gestosc formularza).

## Media field

Entry data:

```json
{ "hero-image": "media-id-123" }
```

Multi‑media:

```json
{ "gallery": ["media-id-1", "media-id-2"] }
```

Schema meta:

```json
{
  "type": "array",
  "items": { "type": "string" },
  "xFieldType": "media",
  "xFieldConfig": {
    "media": { "multiple": true, "accept": ["image/*"], "maxItems": 6 }
  }
}
```

## Select field

Single select zapisuje jedna wartosc:

```json
{ "tone": "warm" }
```

Multi-select zapisuje tablice wartosci:

```json
{ "channels": ["web", "email"] }
```

Schema meta:

```json
{
  "type": "array",
  "items": { "type": "string", "enum": ["web", "email"] },
  "xFieldType": "select",
  "xFieldConfig": {
    "select": {
      "multiple": true,
      "options": [
        { "label": "Website", "value": "web" },
        { "label": "Email", "value": "email" }
      ]
    }
  }
}
```

Starsze schematy z `options: string[]` sa nadal odczytywane i renderowane.

## Number field

Schema meta:

```json
{
  "type": "number",
  "minimum": 0,
  "maximum": 1000,
  "multipleOf": 0.01,
  "xFieldType": "number",
  "xFieldConfig": {
    "number": { "format": "decimal", "min": 0, "max": 1000, "step": 0.01 }
  }
}
```

Format `integer` zapisuje `type: "integer"`; format `decimal` zapisuje
`type: "number"`. Entry renderer przekazuje `min`, `max` i `step` do inputa.

## Relation field

Entry data:

```json
{ "related-projects": ["entry-id-1", "entry-id-2"] }
```

Schema meta:

```json
{
  "type": "string",
  "xFieldType": "relation",
  "xRelationTarget": "projects",
  "xFieldConfig": { "relation": { "target": "projects" } }
}
```

## Taxonomies (Categories/Tags)

Taxonomie nie sa polami w schema, tylko meta‑danymi wpisu.

Entry metadata payload (example):

```json
{
  "taxonomy": {
    "categoryId": "term-id-123",
    "tagIds": ["term-id-555", "term-id-777"]
  }
}
```

Zasady:
- Kategorie to single‑select, tagi to multi‑select.
- Kategorie/tagi sa wlaczane per Content Type.
- Tagi sa zapisywane takze w `content_entries.tags` dla wyszukiwania.

## Validation (summary)

- `relation` i `media` sprawdzaja istnienie wskazanych ID w DB.
- `media.accept` ogranicza dozwolone MIME types.
- `media.maxItems` ogranicza liczbe assetow w polu multi.
- Select `enum` ogranicza wartosci do skonfigurowanych opcji.
- Number `minimum`, `maximum` i `multipleOf` sa walidowane przez JSON Schema.
