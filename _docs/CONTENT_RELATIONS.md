# Content Relations

Relacje lacza wpisy z roznych Content Types (np. Team → Projects).
W UI sa wybierane z listy (search + selekcja), bez wpisywania ID.

## Data shape (entry payload)

Single relation:

```json
{
  "leadProject": "entry-id-123"
}
```

Multi relation:

```json
{
  "relatedProjects": ["entry-id-123", "entry-id-456"]
}
```

## Schema meta (Content Types)

Single relation:

```json
{
  "type": "string",
  "xFieldType": "relation",
  "xRelationTarget": "projects",
  "xFieldConfig": { "relation": { "target": "projects" } }
}
```

Multi relation:

```json
{
  "type": "array",
  "items": { "type": "string" },
  "xFieldType": "relation",
  "xRelationTarget": "projects",
  "xFieldConfig": { "relation": { "target": "projects", "multiple": true } }
}
```

## Validation rules

- `target` musi wskazywac istniejacy Content Type (slug).
- Single relation wymaga string ID (pusty string jest bledem).
- Multi relation wymaga tablicy string ID.
- Wszystkie wskazane entry IDs musza istniec w docelowym typie.

## Admin UI behavior

- Content Type Editor: wybierasz target z listy + przełącznik "Allow multiple".
- Entry Editor: wyszukiwarka + lista wpisow; multi‑select gdy włączone.

## Praktyczny flow (krok po kroku)

1. Utworz typ docelowy (np. Projects).\n2. W typie zrodlowym dodaj pole relation i wskaz target.\n3. Zapisz Content Type.\n4. W Entry Editorze wybierz powiazane wpisy z listy.

Zobacz tez: `CONTENT_MODELING_COOKBOOK.md`.
