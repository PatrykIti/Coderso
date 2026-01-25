# Filename: 002-2026-01-25-pages-revisions-preview.md

# 2. Pages, Revisions, and Preview

**Date:** 2026-01-25  
**Version:** 0.1.0  
**Tasks:** TASK-002

## 🚀 Key Changes

### Core/DB
- Added `pages`, `page_revisions`, and `preview_tokens` tables.
- Generated migration `core/db/migrations/0001_productive_jazinda.sql`.

### Core/Services
- Added page CRUD + publish/unpublish flow with revision creation.
- Added revision service (list/create/restore).
- Added preview token service with hashing and TTL.

### Core/API
- Added pages routes and JSON schema validation.

### Tests
- Added unit tests for page, revision, and preview services.
- Added integration test for route registration.
