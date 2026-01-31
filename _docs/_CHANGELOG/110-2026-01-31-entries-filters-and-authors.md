# 110 - Entries filters and authors

**Date:** 2026-01-31  
**Version:** 0.1.0  
**Tasks:** TASK-066

## Key Changes

### Core/Content
- Content entries now store `author_id` and list queries include author details.
- Content types list now returns entry counts per type.
- Added delete entry endpoint.

### Admin/UI
- Entries filters are wired (search/status/type/author).
- Grid view implemented for entries list.
- Content types sidebar supports search and mobile rendering.
- Entries table now shows author from data instead of placeholder.
- Entries delete action now removes records via API.

### Migrations
- Added `author_id` on `content_entries` with index + FK.
