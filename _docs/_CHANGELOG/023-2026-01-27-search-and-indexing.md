# Filename: 023-2026-01-27-search-and-indexing.md

# 23. Search and indexing

**Date:** 2026-01-27  
**Version:** 0.1.0  
**Tasks:** TASK-013

## Key Changes

### Search
- Added full-text + trigram indexes for pages, entries, and media.
- Added search service and `/search` admin endpoint.
- Added global admin search UI with grouped results.

### Tests
- Added unit tests for search normalization and min-length behavior.
- Added route integration test for search endpoints.

### Docs
- Documented search rules, indexes, and API responses.
