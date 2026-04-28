# 108 - Search history and categories

**Date:** 2026-01-31  
**Version:** 0.1.0

## Key Changes

### Core/Search
- Added search history tracking per user (last 10 queries).
- Added search category metadata and override support.

### Admin/UI
- Wired Search screen to recent searches and dynamic categories.
- Added category filtering based on search results.

### API
- Added `/search/recent` endpoint and category metadata in `/search` response.

### Tests
- Added search history service tests and updated search client/routes tests.
