# 109 - Search UX refinements

**Date:** 2026-01-31  
**Version:** 0.1.0  
**Tasks:** TASK-082

## Key Changes

### Admin/UI
- Search results now navigate to the correct edit screens (pages, entries, media).
- View All actions switch the Search tab to the selected content type.
- Recent searches list scrolls when long lists are present.
- Users can be searched by name or email (and open the user panel).
- Global header search now navigates to selected results.

### Core/Search
- Search uses prefix matching for partial queries (e.g., “ab” matches “about”).
- Added fallback matching for entries/media/users to reduce false negatives.
- Prefix query now handles punctuation (emails, dot-separated values).

### Tests
- Added prefix query unit coverage.
