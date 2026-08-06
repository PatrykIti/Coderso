/**
 * Reusable authoring building blocks: widget templates and their revisions, plus
 * the listing templates and saved listing queries that drive collection views.
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

export const widgetTemplates = pgTable(
  "widget_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    status: text("status").notNull().default("draft"),
    blocks: jsonb("blocks").notNull(),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    nameIdx: index("widget_templates_name_idx").on(t.name),
    statusIdx: index("widget_templates_status_idx").on(t.status),
    categoryIdx: index("widget_templates_category_idx").on(t.category),
  })
);

export const listingTemplates = pgTable(
  "listing_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    layout: text("layout").notNull().default("grid"),
    config: jsonb("config").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("listing_templates_slug_idx").on(t.slug),
    layoutIdx: index("listing_templates_layout_idx").on(t.layout),
    updatedAtIdx: index("listing_templates_updated_at_idx").on(t.updatedAt),
  })
);

export const listingQueries = pgTable(
  "listing_queries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    query: jsonb("query").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    nameIdx: index("listing_queries_name_idx").on(t.name),
    updatedAtIdx: index("listing_queries_updated_at_idx").on(t.updatedAt),
  })
);

export const widgetTemplateRevisions = pgTable(
  "widget_template_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => widgetTemplates.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    status: text("status").notNull(),
    blocks: jsonb("blocks").notNull(),
    settings: jsonb("settings").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => ({
    templateIdIdx: index("widget_template_revisions_template_id_idx").on(t.templateId),
  })
);
