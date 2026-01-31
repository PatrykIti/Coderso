# TASK-043-01: Content Entry Metadata DB + Schema
# FileName: TASK-043-01_Content_Entry_Metadata_DB.md

**Priority:** High  
**Category:** Content / DB  
**Estimated Effort:** Medium  
**Dependencies:** TASK-043  
**Status:** To Do

---

## Overview

Add dedicated metadata columns to `content_entries` for tags and scheduling.
Do not store tags inside `data`. Keep SEO in `seo_documents`.

---

## Scope

### DB changes
- Add `tags` column: `jsonb` default `[]` (not null).
- Add `scheduled_at` column: `timestamp` nullable.

### Schema changes
- Update `core/db/schema.ts` so `contentEntries` includes:
  - `tags: jsonb("tags").notNull().default([])`
  - `scheduledAt: timestamp("scheduled_at")`

---

## Implementation Checklist

| File | Action |
| --- | --- |
| `core/db/schema.ts` | Add `tags` + `scheduledAt` to `contentEntries` |
| `core/db/migrations/XXXX_*.sql` | Migration: `ALTER TABLE content_entries ADD COLUMN tags jsonb NOT NULL DEFAULT '[]';` and `ADD COLUMN scheduled_at timestamp;` |
| `core/db/migrations/meta/XXXX_snapshot.json` | Regenerate snapshot |
| `core/db/migrations/meta/_journal.json` | Update journal |

---

## Testing Requirements

- No new tests required at DB layer, but existing DB tests must pass.

---

## Documentation Updates Required

- `_docs/DATA_MODEL.md`: add `tags`, `scheduled_at` to `content_entries`.

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-entry-metadata-db.md`

