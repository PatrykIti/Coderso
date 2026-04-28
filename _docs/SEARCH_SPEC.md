# Search Spec (v1)

Zakres: wyszukiwanie w panelu admina.

## Zakres v1

- Pages (title, slug).
- Content entries (title i pola tekstowe).
- Media (title, alt).

## Implementacja

- Postgres full-text (tsvector) dla pol tekstowych.
- `plainto_tsquery('simple', q)` dla bezpiecznego parsowania zapytan.
- Trigram (pg_trgm) dla szybkim dopasowan typu ILIKE.

## Indeksy (v1)

- GIN tsvector: `pages(title + slug)`, `content_entries(title + slug)`, `media(title + alt + caption)`.
- GIN trigram: `pages.title`, `pages.slug`, `content_entries.title`, `content_entries.slug`, `media.title`.

## Query rules

- Minimalna dlugosc zapytania: 2 znaki.
- Limit domyslny: 20 (max 50).
- Wyniki zwracane jako lista z polem `type`.

## API

- `GET /search?q=...&limit=20` (admin)
- `GET /pages?search=...` (planowane v1.1)
- `GET /content/:type/entries?search=...` (planowane v1.1)

Przykladowa odpowiedz:

```json
{
  "items": [
    { "id": "page-id", "type": "page", "title": "Homepage", "slug": "home" },
    { "id": "entry-id", "type": "entry", "title": "Launch announcement", "slug": "launch" },
    { "id": "media-id", "type": "media", "title": "Hero banner" }
  ]
}
```
