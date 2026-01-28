# TASK-002-01: Page DB Schema & Migrations
# FileName: TASK-002-01_Page_DB_Schema.md

**Priority:** High  
**Category:** CMS/Pages  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** To Do  

---

## Overview

Define database structures for pages, revisions, and preview tokens. This is the persistence layer that powers Page List, Page Editor, revisions history, and preview links.

**Why this matters for UI:**
- Page List UI needs reliable page summary data (`title`, `slug`, `status`, `updated_at`, `author`).
- Page Editor UI requires a single canonical `current_data` JSON payload representing blocks and metadata.
- Preview flow depends on `preview_tokens` with TTL for secure sharing.

---

## Architecture

```
core/db/schema.ts
core/db/migrations/
```

---

## Data Model

### Tables

**1) pages**
- Stores draft (current) and published content.
- Single row per page slug.

**2) page_revisions**
- Append-only history of draft changes.
- Includes author for audit & restore.

**3) preview_tokens**
- Ephemeral tokens for secure page preview.

### Constraints + Indexes
- `pages.slug` unique
- `pages.status` indexed
- `page_revisions.page_id` indexed
- `preview_tokens.token_hash` unique + indexed
- `preview_tokens.expires_at` indexed (for cleanup queries)

---

## Schema Definition (Drizzle)

Add the following to `core/db/schema.ts`:

```ts
export const pages = pgTable("pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  currentData: jsonb("current_data").notNull(),
  publishedData: jsonb("published_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
  authorId: uuid("author_id").references(() => users.id),
});

export const pageRevisions = pgTable("page_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  pageId: uuid("page_id").notNull().references(() => pages.id),
  version: integer("version").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id),
});

export const previewTokens = pgTable("preview_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### `current_data` JSON Structure (storage-only)

This is stored as JSONB and validated by schema (in TASK-002-04). It mirrors the Page Builder block model.

```json
{
  "blocks": [
    {
      "id": "blk_hero_1",
      "type": "hero",
      "variant": "centered",
      "data": { "headline": "Build faster" },
      "layout": {
        "container": "default",
        "padding": { "top": "lg", "bottom": "lg" },
        "margin": { "top": "none", "bottom": "md" },
        "background": { "color": "var(--surface)" }
      },
      "visibility": { "devices": ["desktop", "tablet", "mobile"], "enabled": true },
      "editor": { "mode": "visual", "wizardCompleted": true }
    }
  ],
  "seo": {
    "title": "Homepage",
    "description": "Nextless is a runtime CMS",
    "image": null
  },
  "settings": {
    "template": "landing",
    "showInNav": true
  }
}
```

---

## Migration Plan

1. Update `core/db/schema.ts` with the tables and indexes.
2. Generate migration: `bun x drizzle-kit generate --config core/db/drizzle.config.ts`.
3. Apply: `bun x drizzle-kit migrate --config core/db/drizzle.config.ts`.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/db/schema.ts` | add tables + indexes | pages, page_revisions, preview_tokens |
| `core/db/migrations/*` | create migration | generated via drizzle-kit |

---

## Testing Requirements

- No unit tests required for schema definitions.
- Integration tests will validate via services (TASK-002-02 and TASK-002-04).

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (reference JSON structure)
- `_docs/CMS_API.md` (when endpoints are wired)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-pages-revisions-preview.md`
