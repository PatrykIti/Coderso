/**
 * The media library: the nested folder tree and the asset records inside it.
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
  real,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "./identity";

export const mediaFolders = pgTable(
  "media_folders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => mediaFolders.id, {
      onDelete: "set null",
    }),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => ({
    slugIdx: uniqueIndex("media_folders_slug_idx").on(t.slug),
    parentIdx: index("media_folders_parent_idx").on(t.parentId),
    parentOrderIdx: index("media_folders_parent_order_idx").on(t.parentId, t.orderIndex),
  })
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    url: text("url").notNull(),
    originalName: text("original_name"),
    type: text("type").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    width: integer("width"),
    height: integer("height"),
    alt: text("alt"),
    title: text("title"),
    caption: text("caption"),
    folderId: uuid("folder_id").references(() => mediaFolders.id, { onDelete: "set null" }),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    focalX: real("focal_x"),
    focalY: real("focal_y"),
    description: text("description"),
    credit: text("credit"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => ({
    folderIdx: index("media_folder_idx").on(t.folderId),
  })
);
