/**
 * Structured content: type definitions, entries, entry revisions and the
 * taxonomy/term graph entries are classified by.
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
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./identity";

export const contentTypes = pgTable("content_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  schema: jsonb("schema").notNull(),
  status: text("status").notNull().default("draft"),
  config: jsonb("config").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contentEntries = pgTable(
  "content_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    typeId: uuid("type_id")
      .notNull()
      .references(() => contentTypes.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("draft"),
    // TASK-514-01: entry visibility (prototype Publish card). 'public' default
    // = legacy behavior byte-identical. accessPassword is a HASHED secret,
    // never selected into any read map (see entryService).
    visibility: text("visibility").notNull().default("public"), // public|private|password
    accessPassword: text("access_password"), // hashed; null unless visibility='password'
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    data: jsonb("data").notNull(),
    publishedAt: timestamp("published_at"),
    scheduledAt: timestamp("scheduled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    typeSlugIdx: uniqueIndex("content_entries_type_slug_idx").on(t.typeId, t.slug),
    authorIdx: index("content_entries_author_idx").on(t.authorId),
    statusIdx: index("content_entries_status_idx").on(t.status),
    titleIdx: index("content_entries_title_idx").on(t.title),
    scheduledAtIdx: index("content_entries_scheduled_at_idx").on(t.scheduledAt),
    // TASK-459-04 listing pushdown indexes: the composite btree serves the
    // published-catalog base predicate (type + status + publishedAt) pushed
    // into SQL by the listing execution path; the jsonb_path_ops GIN serves
    // containment/jsonpath probes over entry data. Per-field expression
    // btrees for hot numeric comparisons are an operator-level optimization
    // documented in _docs/DATA_MODEL.md (field paths are user-defined and
    // cannot be statically migrated).
    typeStatusPublishedIdx: index("content_entries_type_status_published_idx").on(
      t.typeId,
      t.status,
      t.publishedAt
    ),
    dataGinIdx: index("content_entries_data_gin_idx").using("gin", t.data.op("jsonb_path_ops")),
  })
);

export const contentRevisions = pgTable(
  "content_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => contentEntries.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => ({
    entryIdIdx: index("content_revisions_entry_id_idx").on(t.entryId),
    // TASK-570 (N3): concurrency-safe version allocation. The unique
    // (entry_id, version) constraint backs the bounded-retry insert in
    // `createEntryRevisionTx` so a writer that does NOT hold the entry row
    // `FOR UPDATE` can never allocate a duplicate version.
    entryVersionIdx: uniqueIndex("content_revisions_entry_version_idx").on(t.entryId, t.version),
  })
);

export const contentTaxonomies = pgTable(
  "content_taxonomies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    typeId: uuid("type_id")
      .notNull()
      .references(() => contentTypes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    typeIdx: index("content_taxonomies_type_id_idx").on(t.typeId),
    typeKindIdx: uniqueIndex("content_taxonomies_type_kind_idx").on(t.typeId, t.kind),
    typeSlugIdx: uniqueIndex("content_taxonomies_type_slug_idx").on(t.typeId, t.slug),
  })
);

export const contentTerms = pgTable(
  "content_terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taxonomyId: uuid("taxonomy_id")
      .notNull()
      .references(() => contentTaxonomies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    taxonomyIdx: index("content_terms_taxonomy_id_idx").on(t.taxonomyId),
    taxonomySlugIdx: uniqueIndex("content_terms_taxonomy_slug_idx").on(t.taxonomyId, t.slug),
  })
);

export const contentTermAssignments = pgTable(
  "content_term_assignments",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => contentEntries.id, { onDelete: "cascade" }),
    termId: uuid("term_id")
      .notNull()
      .references(() => contentTerms.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.entryId, t.termId] }),
    entryIdx: index("content_term_assignments_entry_id_idx").on(t.entryId),
    termIdx: index("content_term_assignments_term_id_idx").on(t.termId),
  })
);
