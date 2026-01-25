# Search Spec (v1)

Zakres: wyszukiwanie w panelu admina.

## Zakres v1

- Pages (title, slug).
- Content entries (title i pola tekstowe).
- Media (title, alt).

## Implementacja

- Postgres full-text (tsvector) dla pol tekstowych.
- Trigram/ILIKE dla szybkiego wyszukiwania po tytule.

## Indeksy (przyklad)

- `pages(title, slug)`
- `content_entries(title)`
- `media(title, alt)`

## API

- `GET /search?q=...` (admin)
- `GET /pages?search=...`
- `GET /content/:type/entries?search=...`
