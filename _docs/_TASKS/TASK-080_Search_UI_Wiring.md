# TASK-080: Search UI Wiring
# FileName: TASK-080_Search_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-023, TASK-006-22, TASK-020  
**Status:** To Do

---

## Overview

Replace mock search results with live data from the core search API (`GET /search`).

## Goals

- Wire the global topbar SearchBar to `/search`.
- Wire the full Search page to `/search` with query + filters.
- Keep keyboard navigation and empty-state UX.

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/admin/services/searchClient.ts` | `searchAll(query, limit?)` + types |
| `core/admin/ui/search/SearchBar.tsx` | Fetch results on query change (debounced) |
| `core/admin/ui/search/SearchPage.tsx` | Use live results, filters client-side |
| `core/admin/ui/search/SearchResults.tsx` | Keep existing grouping/selection |

### API contract

`GET /search?query=...&limit=...`

Response shape (already in core service):
```json
[
  { "id": "uuid", "type": "page", "title": "Home", "subtitle": "/home" },
  { "id": "uuid", "type": "entry", "title": "Release Notes", "subtitle": "Blog" },
  { "id": "uuid", "type": "media", "title": "hero.jpg", "subtitle": "image" }
]
```

### UX notes

- Debounce input (200–300ms).
- Do not query if `query.length < 2`.
- Show empty state when 0 results.
- Keep keyboard navigation and highlight behavior.

## Testing Requirements

- `tests/unit/admin/searchClient.test.ts` (new): `GET /search`.
- Update `tests/unit/ui/search-page.test.tsx` to render with live results.
- Update `tests/unit/ui/search-results.test.tsx` if needed for new types.

## Documentation Updates Required

- `_docs/CMS_API.md` ensure `/search` is documented for admin UI usage.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-search-ui-wiring.md`
