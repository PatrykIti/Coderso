/**
 * The media library: the nested folder tree and the asset records inside it.
 *
 * Re-exported verbatim by `core/db/schema.ts`; import from there, not from here.
 */

import { desc, sql } from "drizzle-orm";
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
import {
  normalizeTask551TrigramSql,
  SEARCH_VECTOR_SQL,
  TRIGRAM_SOURCE_SQL,
  tsvector,
} from "../searchVectorDefinitions";

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
    // TASK-551-05-L01: canonical local search vectors. Stored generated, so
    // the column is maintained by the database and every reader sees the same
    // tsvector the GIN index holds.
    searchVector: tsvector("search_vector").generatedAlwaysAs(sql.raw(SEARCH_VECTOR_SQL.media)),
    searchTrigramText: text("search_trigram_text").generatedAlwaysAs(
      normalizeTask551TrigramSql(sql.raw(TRIGRAM_SOURCE_SQL.media))
    ),
  },
  (t) => ({
    folderIdx: index("media_folder_idx").on(t.folderId),
    mediaSearchVectorIdx: index("media_search_vector_idx").using("gin", t.searchVector),
    mediaSearchTrigramIdx: index("media_search_trigram_idx").using(
      "gin",
      t.searchTrigramText.op("gin_trgm_ops")
    ),
    // TASK-551-05-L01 tag containment: `tags @> :normalizedUniqueSortedTags::jsonb`
    // resolves through this opclass only, preserving AND semantics.
    mediaTagsGinIdx: index("media_tags_gin_idx").using("gin", t.tags.op("jsonb_path_ops")),
    // TASK-551-05-L01 evidence-backed list traversal: the library sorts by
    // recency and paginates on the stable (created_at DESC, id DESC) keyset.
    mediaListCreatedIdIdx: index("media_list_created_id_idx").on(desc(t.createdAt), desc(t.id)),
    mediaFolderListCreatedIdIdx: index("media_folder_list_created_id_idx").on(
      t.folderId,
      desc(t.createdAt),
      desc(t.id)
    ),
  })
);
