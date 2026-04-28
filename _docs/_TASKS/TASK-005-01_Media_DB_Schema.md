# TASK-005-01: Media DB Schema
# FileName: TASK-005-01_Media_DB_Schema.md

**Priority:** Medium  
**Category:** CMS/Media  
**Estimated Effort:** Small  
**Dependencies:** TASK-001  
**Status:** Done (2026-01-28)  

---

## Overview

Define the `media` table for uploaded assets and metadata. This is the source of truth for media library screens and API responses.

## Schema

Table: `media`
- `id` uuid primary key
- `key` text (storage key)
- `url` text (public URL)
- `type` text (`image` | `file` | `video`)
- `mime_type` text
- `size` integer (bytes)
- `width` integer nullable
- `height` integer nullable
- `alt` text nullable
- `title` text nullable
- `caption` text nullable
- `created_at` timestamp
- `created_by` uuid nullable -> `users.id`

Indexes:
- `media_key_idx` (unique) on `key`
- `media_created_at_idx` on `created_at`

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/db/schema.ts` | add/verify `media` table + indexes | align with DATA_MODEL |
| `core/db/migrations/*` | generate migration | drizzle-kit generate |

## Tests

Covered by `mediaService` tests in TASK‑005‑06.

## Documentation Updates Required

- `_docs/DATA_MODEL.md`
- `_docs/MEDIA_SPEC.md`

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-media-storage-and-uploads.md`
