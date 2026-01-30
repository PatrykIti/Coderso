# 082 - Search UI wiring

**Date:** 2026-01-30  
**Version:** 0.1.0  
**Tasks:** TASK-026

## Key Changes

### Admin/UI
- Wired global search bar and search page to the live `/search` API.
- Added debounced querying, loading/error states, and empty-state messaging.

### Tests
- Added search client unit test for `/search` requests.
- Updated search page UI test to reflect live data flow.
