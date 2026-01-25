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
admin/ui/search/
  SearchBar.tsx
  SearchResults.tsx
```

---

## Sub-Tasks

### TASK-013-1: DB indexes and tsvector

**Status:** To Do

Add tsvector columns or computed expressions for pages, entries, and media.

Example SQL:

```sql
CREATE INDEX pages_search_idx ON pages USING GIN (to_tsvector('simple', title || ' ' || slug));
CREATE INDEX entries_search_idx ON content_entries USING GIN (to_tsvector('simple', title || ' ' || slug));
CREATE INDEX media_search_idx ON media USING GIN (to_tsvector('simple', title || ' ' || alt));
```

---

### TASK-013-2: Search service and endpoints

**Status:** To Do

Implement `GET /search?q=...` and `search` params on list endpoints.

Example query:

```sql
SELECT id, title, 'page' AS type
FROM pages
WHERE to_tsvector('simple', title || ' ' || slug) @@ plainto_tsquery('simple', $1)
LIMIT 10;
```

---

### TASK-013-3: Admin UI search

**Status:** To Do

- Global search bar in admin layout.
- Result grouping by type.
- Keyboard navigation.

---

## Testing Requirements

- [ ] Search returns matches for pages, entries, and media.
- [ ] Empty query returns empty response.
- [ ] Search is fast for large datasets.

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
