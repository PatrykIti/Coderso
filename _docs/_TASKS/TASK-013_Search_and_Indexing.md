# TASK-013: Search and Indexing
# FileName: TASK-013_Search_and_Indexing.md

**Priority:** Medium
**Category:** CMS/Search
**Estimated Effort:** Medium
**Dependencies:** TASK-002, TASK-003, TASK-005
**Status:** To Do

---

## Overview

Implement admin search across pages, content entries, and media using
Postgres full-text search and lightweight filters.

**Goals:**
- Search endpoints for admin UI.
- DB indexes for fast lookup.
- Unified search results.

---

## Architecture

```
core/services/search/
  searchService.ts
core/server/routes/
  searchRoutes.ts
core/db/migrations/
  search_indexes.sql
admin/ui/search/
  SearchBar.tsx
  SearchResults.tsx

tests/unit/search/
  searchService.test.ts
```

---

## Sub-Tasks

### TASK-013-01_DB_indexes_and_tsvector

**Status:** To Do

Add full-text indexes and trigram indexes.

Notes:
- Enable `pg_trgm` extension for trigram search.
- Use `simple` dictionary for locale-neutral admin search.
- Prefer `plainto_tsquery` to avoid injection.

Example SQL:

```sql
CREATE INDEX pages_search_idx ON pages USING GIN (to_tsvector('simple', title || ' ' || slug));
CREATE INDEX entries_search_idx ON content_entries USING GIN (to_tsvector('simple', title || ' ' || slug));
CREATE INDEX media_search_idx ON media USING GIN (to_tsvector('simple', title || ' ' || alt));
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/db/migrations/search_indexes.sql` | indexes and triggers |

---

### TASK-013-02_Search_service_and_endpoints

**Status:** To Do

Implement `GET /search?q=...` and `search` params on list endpoints.

Rules:
- Minimum query length 2.
- Return grouped results with `type` and `id`.
- Add limit and pagination.

Example query:

```sql
SELECT id, title, 'page' AS type
FROM pages
WHERE to_tsvector('simple', title || ' ' || slug) @@ plainto_tsquery('simple', $1)
LIMIT 10;
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/search/searchService.ts` | search queries |
| `core/server/routes/searchRoutes.ts` | search endpoints |

---

### TASK-013-03_Admin_UI_search

**Status:** To Do

- Global search bar in admin layout.
- Result grouping by type.
- Keyboard navigation.
- Highlight query matches.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/search/SearchBar.tsx` | search input |
| `admin/ui/search/SearchResults.tsx` | results list |

---

## Testing Requirements

- [ ] `tests/unit/search/searchService.test.ts` returns matches.
- [ ] `tests/integration/routes/search.test.ts` validates endpoints.
- [ ] UI test verifies keyboard navigation.
- [ ] `tests/integration/routes/search.test.ts` enforces min length.

---

## New Files to Create

- `core/services/search/searchService.ts`
- `core/server/routes/searchRoutes.ts`
- `core/db/migrations/search_indexes.sql`
- `admin/ui/search/SearchBar.tsx`
- `admin/ui/search/SearchResults.tsx`
- `tests/unit/search/searchService.test.ts`
- `tests/integration/routes/search.test.ts`

---

## Documentation Updates Required

- `_docs/SEARCH_SPEC.md` (indexes and endpoint behavior).
- `_docs/CMS_API.md` (search endpoints).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-search-and-indexing.md`
- Notes: admin search and DB indexes.

---

## Additional Docs

- `_docs/CMS_SPEC.md`
