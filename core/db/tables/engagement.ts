/**
 * Visitor-facing engagement surfaces: popups and moderated reviews.
 *
 * Re-exported verbatim by `core/db/schema.ts`; import from there, not from here.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./identity";

export const popups = pgTable(
  "popups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull().default("draft"),
    trigger: jsonb("trigger").notNull().default({}),
    targeting: jsonb("targeting").notNull().default({}),
    frequency: jsonb("frequency").notNull().default({}),
    content: jsonb("content").notNull().default({}),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    publishedAt: timestamp("published_at"),
  },
  (t) => ({
    slugIdx: uniqueIndex("popups_slug_idx").on(t.slug),
    statusIdx: index("popups_status_idx").on(t.status),
    updatedIdx: index("popups_updated_idx").on(t.updatedAt),
  })
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    status: text("status").notNull().default("pending"),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body"),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email"),
    metadata: jsonb("metadata").notNull().default({}),
    moderatedBy: uuid("moderated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    moderatedAt: timestamp("moderated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    publishedAt: timestamp("published_at"),
  },
  (t) => ({
    entityIdx: index("reviews_entity_idx").on(t.entityType, t.entityId),
    statusIdx: index("reviews_status_idx").on(t.status),
    createdIdx: index("reviews_created_idx").on(t.createdAt),
  })
);
