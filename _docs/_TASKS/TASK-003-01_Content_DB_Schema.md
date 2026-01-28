# TASK-003-01: Content DB Schema
# FileName: TASK-003-01_Content_DB_Schema.md

**Priority:** High  
**Category:** CMS/Content  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** To Do  

---

## Overview

Define DB tables for dynamic content types, entries, and revisions. These tables allow creating new content structures from the admin UI without shipping a new migration for each type.

**UI Alignment:**
- Content Types list/editor needs `content_types`.
- Entries list/editor needs `content_entries` + `content_revisions`.

## Data Model

**Table: `content_types`**
- `id` uuid primary key
- `name` text (display name)
- `slug` text unique (URL-safe identifier)
- `schema` jsonb (JSON Schema for entries)
- `created_at`, `updated_at` timestamps

**Table: `content_entries`**
- `id` uuid primary key
- `type_id` uuid -> `content_types.id` (cascade delete)
- `slug` text (unique per type)
- `title` text
- `status` text (`draft` | `published` | `archived`)
- `data` jsonb (entry data)
- `published_at` timestamp nullable
- `created_at`, `updated_at` timestamps

**Table: `content_revisions`**
- `id` uuid primary key
- `entry_id` uuid -> `content_entries.id` (cascade delete)
- `version` integer
- `data` jsonb (snapshot)
- `created_by` uuid -> `users.id` nullable
- `created_at` timestamp

**Indexes**
- `content_types.slug` unique
- `content_entries (type_id, slug)` unique
- `content_entries.status` index
- `content_entries.title` index
- `content_revisions.entry_id` index

## Sub-Tasks

1. Add/verify tables and indexes in `core/db/schema.ts`.
2. Generate and apply Drizzle migration.
3. Update any seed fixtures if needed.

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/db/schema.ts` | add tables + indexes | align with types above |
| `core/db/migrations/*` | generate migration | `drizzle-kit generate` |
| `core/db/migrations/meta/*` | auto-generated | keep in sync |

## Mock Data Examples

```json
{
  "content_types": {
    "id": "ct_blog",
    "name": "Blog Post",
    "slug": "blog",
    "schema": {
      "type": "object",
      "additionalProperties": false,
      "required": ["title"],
      "properties": {
        "title": {"type": "string"},
        "body": {"type": "string"}
      }
    }
  },
  "content_entries": {
    "id": "entry_001",
    "type_id": "ct_blog",
    "title": "First Post",
    "slug": "first-post",
    "status": "draft",
    "data": {"title": "First Post", "body": "..."}
  }
}
```

## Testing Requirements

- Schema changes are validated by service tests in TASK-003-03.
- Run `bun test` after migrations to ensure content services pass.

## Documentation Updates Required

- `_docs/DATA_MODEL.md`
- `_docs/CONTENT_TYPES_SPEC.md`

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-content-types-engine.md`
