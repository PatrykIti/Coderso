/**
 * The blog: posts, post revisions, post share-preview tokens and post taxonomy
 * assignments.
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
import { contentTerms } from "./content";
import { users } from "./identity";
import { media } from "./media";

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    featuredMediaId: uuid("featured_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("draft"),
    excerpt: text("excerpt"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    data: jsonb("data").notNull().default({}),
    metadata: jsonb("metadata").notNull().default({}),
    seo: jsonb("seo").notNull().default({}),
    publishedAt: timestamp("published_at"),
    scheduledAt: timestamp("scheduled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex("posts_slug_idx").on(t.slug),
    authorIdx: index("posts_author_idx").on(t.authorId),
    statusIdx: index("posts_status_idx").on(t.status),
    titleIdx: index("posts_title_idx").on(t.title),
    publishedAtIdx: index("posts_published_at_idx").on(t.publishedAt),
    scheduledAtIdx: index("posts_scheduled_at_idx").on(t.scheduledAt),
    updatedAtIdx: index("posts_updated_at_idx").on(t.updatedAt),
  })
);

export const postRevisions = pgTable(
  "post_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => ({
    postIdIdx: index("post_revisions_post_id_idx").on(t.postId),
    postVersionIdx: uniqueIndex("post_revisions_post_version_idx").on(t.postId, t.version),
  })
);

export const postPreviewTokens = pgTable(
  "post_preview_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    tokenHashIdx: uniqueIndex("post_preview_tokens_token_hash_idx").on(t.tokenHash),
    postIdIdx: index("post_preview_tokens_post_id_idx").on(t.postId),
    expiresAtIdx: index("post_preview_tokens_expires_at_idx").on(t.expiresAt),
  })
);

export const postTermAssignments = pgTable(
  "post_term_assignments",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    termId: uuid("term_id")
      .notNull()
      .references(() => contentTerms.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.termId] }),
    postIdx: index("post_term_assignments_post_id_idx").on(t.postId),
    termIdx: index("post_term_assignments_term_id_idx").on(t.termId),
  })
);
