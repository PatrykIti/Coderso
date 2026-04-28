# TASK-049-01: Widget Templates DB Schema
# FileName: TASK-049-01_Widget_Templates_DB_Schema.md

**Priority:** High  
**Category:** CMS/Widgets (DB)  
**Estimated Effort:** Medium  
**Dependencies:** TASK-049  
**Status:** Done (2026-02-02)

---

## Overview

Introduce a persistent table for **custom widget templates** created in the admin UI.
Templates store serialized widget blocks (array of `WidgetBlock`) that can be inserted into pages.

---

## Data Model

### `widget_templates`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (pk) | primary key |
| `name` | text | display name |
| `slug` | text (unique) | stable identifier |
| `description` | text | optional |
| `category` | text | enum: layout/content/forms/navigation/media |
| `status` | text | enum: draft/published (default `draft`) |
| `blocks` | jsonb | array of `WidgetBlock` |
| `created_by` | uuid | FK users.id (nullable) |
| `updated_by` | uuid | FK users.id (nullable) |
| `created_at` | timestamp | default now |
| `updated_at` | timestamp | default now |

### Indexes
- `widget_templates_slug_idx` (unique)
- `widget_templates_category_idx`
- `widget_templates_status_idx`

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/db/schema.ts` | add `widget_templates` table | include indexes + refs |
| `core/db/migrations/*` | generate migration | `bun x drizzle-kit generate` |

---

## Example Schema (Drizzle)

```ts
export const widgetTemplates = pgTable(
  "widget_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    status: text("status").notNull().default("draft"),
    blocks: jsonb("blocks").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("widget_templates_slug_idx").on(t.slug),
    categoryIdx: index("widget_templates_category_idx").on(t.category),
    statusIdx: index("widget_templates_status_idx").on(t.status),
  })
);
```

---

## Testing Requirements

- Migration applies cleanly.
- Schema snapshot updated.

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-widget-templates-db.md`
