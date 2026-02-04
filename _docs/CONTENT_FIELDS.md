# Content Fields (v1)

Opisuje pola Content Types oraz ich konfiguracje w Admin UI.

## Typy pola

- text, richtext, number, boolean
- select (lista opcji)
- media (powiazanie z Media Library)
- relation (powiazanie z innym Content Type)

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

## Validation (summary)

- `relation` i `media` sprawdzaja istnienie wskazanych ID w DB.
- `media.accept` ogranicza dozwolone MIME types.
- `media.maxItems` ogranicza liczbe assetow w polu multi.
