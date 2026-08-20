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

---

## SEO search-performance ingest (TASK-493)

Everything above describes the in-app admin search: Postgres full-text +
trigram over the CMS's own Pages/entries/media rows, queried live by admins.
The SEO search-performance pipeline is a **separate, server-side ingest** from
Google Search Console (GSC) and must not be confused with it:

- **Source:** GSC Search Analytics, pulled through the encrypted
  `google-search-console` integration credential. It measures how the public
  site performs in Google Search (impressions, clicks, CTR, average position
  per URL/query/day) plus per-URL indexing state from the v1 URL Inspection
  API. It is not a query over CMS content.
- **Daily-bucket ingest:** metrics and queries are stored in UTC-midnight day
  buckets in `seo_search_metrics` and `seo_search_queries`, unique per
  `url+date` and `url+query+date`. Re-syncing the same window overwrites the
  same buckets (idempotent upserts), so a window can be re-run after GSC data
  settles. Indexed-page state is stored in `seo_indexed_pages`, unique per
  `url`, refreshed by the bounded URL Inspection loop (max 50 URLs per run).
- **Trigger:** admin-driven only. `POST /seo/search-performance/sync`
  (`settings:write`, CSRF, `admin_write` rate limit) pulls a clamped window
  (default last 28 inclusive days ending today; GSC retains 16 months) and
  then inspects sitemap URLs. There is no scheduler and no public ingest
  endpoint, unlike the public analytics beacon.
- **Consumption:** the admin SEO Manager reads aggregated totals via
  `GET /seo/overview` and `GET /seo/search-performance` (`content:read`).
  These reads do not touch the admin search index at all.
- **Distinction at a glance:** in-app admin search indexes `pages`,
  `content_entries`, and `media` for finding CMS records; the SEO ingest
  indexes GSC performance rows for the admin SEO Manager. They share no
  tables, no write path, and no query model.
