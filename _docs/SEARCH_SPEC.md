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
- `dateRange` przyjmuje tylko: `last-7-days`, `last-30-days`,
  `last-12-months`, `all-time`.
- Nieznana wartosc `dateRange` jest odrzucana jako
  `search_date_range_invalid`.
- Zakres dat jest stosowany do `updatedAt` dla Pages, Content entries i Users
  oraz do `createdAt` dla Media.
- Wyniki zwracane jako lista z polem `type`.
- Odpowiedz zawiera aggregate-only `meta`, bez ujawniania ukrytych rekordow.

## Listing Runtime Query Params

Visitor-facing listing filters use the canonical grammar
`lq.<listingQueryId>.<token>=value`, where `<token>` is one of:

- `__sort` with `field:asc|desc`.
- `__page` with a 1-based page number.
- `__q` with the listing search text.
- `<field>.<operator>` for allowlisted filter operators:
  `eq`, `neq`, `in`, `nin`, `contains`, `startsWith`, `gt`, `gte`, `lt`,
  `lte`, `between`, `exists`.

Filters blocks may define bounded pretty aliases in `props.aliases`, for
example `{ "rooms": "data.rooms.in", "sort": "__sort", "page": "__page" }`.
Aliases are normalized into canonical `lq.*` tokens before filter parsing and
query validation. If both an alias and its canonical `lq.*` token are present
in the same request, the canonical token wins.

The public HTML cache uses option A from TASK-459: filtered Page v2 HTML stays
cacheable only for structurally valid canonical `lq.*` params, legacy
`cl.<blockId>.page`, and route-level `page`/`sort`. Unknown params and
overlong signatures render uncached.

## API

- `GET /search?q=...&limit=20&dateRange=last-7-days` (admin)
- `GET /pages?search=...` (planowane v1.1)
- `GET /content/:type/entries?search=...` (planowane v1.1)

Przykladowa odpowiedz:

```json
{
  "items": [
    { "id": "page-id", "type": "page", "title": "Homepage", "slug": "home" },
    { "id": "entry-id", "type": "entry", "title": "Launch announcement", "slug": "launch" },
    { "id": "media-id", "type": "media", "title": "Hero banner" }
  ],
  "categories": [
    { "id": "page", "label": "Pages", "count": 1 }
  ],
  "meta": {
    "dateRange": "last-7-days",
    "hasSearchableContent": true,
    "hasQueryMatches": true,
    "hasMatchesOutsideDateRange": false,
    "returnedItems": 3
  }
}
```
