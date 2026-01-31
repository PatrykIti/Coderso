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
Tags must **not** be stored inside `data`. SEO stays in `seo_documents`.

---

## Data Model Changes

**Table: `content_entries`**
- `tags` (jsonb, NOT NULL, default `[]`)
- `scheduled_at` (timestamp, nullable)

**Indexes**
- `content_entries_scheduled_at_idx` on `scheduled_at`

---

## Sub-Tasks

1. Update Drizzle schema for `content_entries`.
2. Generate migration and verify snapshot/journal updates.
3. Ensure old rows get `tags = []` automatically (no NULLs).

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/db/schema.ts` | add `tags`, `scheduledAt` | `tags` must default to `[]` |
| `core/db/schema.ts` | add index on `scheduledAt` | for future scheduler |
| `core/db/migrations/XXXX_*.sql` | add columns + index | see SQL snippet |
| `core/db/migrations/meta/XXXX_snapshot.json` | regenerate | keep in sync |
| `core/db/migrations/meta/_journal.json` | update | new entry |

---

## Drizzle Schema Example

```ts
export const contentEntries = pgTable(
  "content_entries",
  {
    // ...existing fields
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    scheduledAt: timestamp("scheduled_at"),
  },
  (t) => ({
    // ...existing indexes
    scheduledAtIdx: index("content_entries_scheduled_at_idx").on(t.scheduledAt),
  })
);
```

---

## Migration SQL Example

```sql
ALTER TABLE "content_entries"
  ADD COLUMN "tags" jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN "scheduled_at" timestamp;

CREATE INDEX "content_entries_scheduled_at_idx"
  ON "content_entries" ("scheduled_at");
```

---

## Testing Requirements

- No new tests required at DB layer, but all existing DB tests must pass.

---

## Documentation Updates Required

- `_docs/DATA_MODEL.md`: add `tags`, `scheduled_at` to `content_entries`.

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-entry-metadata-db.md`

