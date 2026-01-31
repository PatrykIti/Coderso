# 109 - Search UX refinements

**Date:** 2026-01-31  
**Version:** 0.1.0  
**Tasks:** TASK-082

## Key Changes

### Admin/UI
- Search results now navigate to the correct edit screens (pages, entries, media).
- View All actions switch the Search tab to the selected content type.

### Core/Search
- Search uses prefix matching for partial queries (e.g., “ab” matches “about”).

### Tests
- Added prefix query unit coverage.
