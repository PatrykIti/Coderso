/**
 * The page builder: standalone pages, reusable page templates, publish/draft
 * revisions, share-preview tokens, and the per-content-type detail-page documents
 * that render individual entries.
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
import { contentTypes } from "./content";
import { users } from "./identity";

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    status: text("status").notNull().default("draft"),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    currentData: jsonb("current_data").notNull(),
    publishedData: jsonb("published_data"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    publishedAt: timestamp("published_at"),
  },
  (t) => ({
    statusIdx: index("pages_status_idx").on(t.status),
  })
);

export const pageTemplates = pgTable(
  "page_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    category: text("category"),
    status: text("status").notNull().default("draft"),
    document: jsonb("document").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("page_templates_slug_idx").on(t.slug),
    statusIdx: index("page_templates_status_idx").on(t.status),
    nameIdx: index("page_templates_name_idx").on(t.name),
    updatedAtIdx: index("page_templates_updated_at_idx").on(t.updatedAt),
  })
);

export const pageRevisions = pgTable(
  "page_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    kind: text("kind").notNull().default("publish"),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => ({
    pageIdIdx: index("page_revisions_page_id_idx").on(t.pageId),
    pageKindIdx: index("page_revisions_page_kind_idx").on(t.pageId, t.kind),
  })
);

export const previewTokens = pgTable(
  "preview_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    context: jsonb("context").$type<null | {
      kind: "detail-page";
      sampleEntryId: string;
    }>(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("preview_tokens_token_hash_idx").on(t.tokenHash),
    expiresAtIdx: index("preview_tokens_expires_at_idx").on(t.expiresAt),
  })
);

export const detailPageDocuments = pgTable(
  "detail_page_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    contentTypeId: uuid("content_type_id")
      .notNull()
      .references(() => contentTypes.id),
    status: text("status").notNull().default("draft"),
    currentDocument: jsonb("current_document").notNull(),
    publishedDocument: jsonb("published_document"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    publishedAt: timestamp("published_at"),
  },
  (t) => ({
    contentTypeIdx: index("detail_page_documents_content_type_id_idx").on(t.contentTypeId),
    statusIdx: index("detail_page_documents_status_idx").on(t.status),
    updatedAtIdx: index("detail_page_documents_updated_at_idx").on(t.updatedAt),
  })
);

export const detailPageRevisions = pgTable(
  "detail_page_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    detailPageId: uuid("detail_page_id")
      .notNull()
      .references(() => detailPageDocuments.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    kind: text("kind").notNull().default("publish"),
    document: jsonb("document").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => ({
    detailPageIdIdx: index("detail_page_revisions_detail_page_id_idx").on(t.detailPageId),
    detailPageKindIdx: index("detail_page_revisions_detail_page_kind_idx").on(
      t.detailPageId,
      t.kind
    ),
    detailPageVersionIdx: uniqueIndex("detail_page_revisions_detail_page_version_idx").on(
      t.detailPageId,
      t.version
    ),
  })
);
