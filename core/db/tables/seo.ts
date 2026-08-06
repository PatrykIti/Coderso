/**
 * Search-engine surface: per-target SEO documents and URL redirects.
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
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const seoDocuments = pgTable(
  "seo_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    slug: text("slug"),
    title: text("title"),
    description: text("description"),
    canonicalUrl: text("canonical_url"),
    robots: text("robots"),
    score: integer("score"),
    status: text("status").notNull().default("warning"),
    issues: jsonb("issues").notNull().default([]),
    lastAuditAt: timestamp("last_audit_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    targetIdx: uniqueIndex("seo_documents_target_idx").on(t.targetType, t.targetId),
    scoreIdx: index("seo_documents_score_idx").on(t.score),
    updatedAtIdx: index("seo_documents_updated_at_idx").on(t.updatedAt),
  })
);

export const redirects = pgTable(
  "redirects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromPath: text("from_path").notNull(),
    toPath: text("to_path").notNull(),
    statusCode: integer("status_code").notNull().default(301),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    fromPathIdx: uniqueIndex("redirects_from_path_idx").on(t.fromPath),
    enabledIdx: index("redirects_enabled_idx").on(t.enabled),
  })
);
