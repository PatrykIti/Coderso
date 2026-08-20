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
  numeric,
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

export const seoIndexedPages = pgTable(
  "seo_indexed_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull(),
    targetType: text("target_type"), // "page" | "entry" | null (unmatched)
    targetId: uuid("target_id"),
    coverageState: text("coverage_state"), // GSC coverageState (e.g. "Submitted and indexed")
    indexingState: text("indexing_state"), // "INDEXED" | "NOT_INDEXED" | "EXCLUDED" | "UNKNOWN"
    verdict: text("verdict"), // GSC verdict: "PASS" | "FAIL" | "NEUTRAL"
    robotsState: text("robots_state"),
    googleCanonical: text("google_canonical"),
    userCanonical: text("user_canonical"),
    lastCrawledAt: timestamp("last_crawled_at"),
    lastFetchedAt: timestamp("last_fetched_at"),
    syncedAt: timestamp("synced_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    urlIdx: uniqueIndex("seo_indexed_pages_url_idx").on(t.url),
    targetIdx: index("seo_indexed_pages_target_idx").on(t.targetType, t.targetId),
    stateIdx: index("seo_indexed_pages_state_idx").on(t.indexingState),
  })
);

export const seoSearchMetrics = pgTable(
  "seo_search_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull(),
    date: timestamp("date").notNull(), // day bucket (UTC midnight)
    clicks: integer("clicks").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    ctr: numeric("ctr"), // 0..1
    position: numeric("position"), // avg position
    syncedAt: timestamp("synced_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    urlDateIdx: uniqueIndex("seo_search_metrics_url_date_idx").on(t.url, t.date),
    dateIdx: index("seo_search_metrics_date_idx").on(t.date),
  })
);

export const seoSearchQueries = pgTable(
  "seo_search_queries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull(), // always present (03-L02 syncs date+page+query)
    query: text("query").notNull(),
    date: timestamp("date").notNull(),
    clicks: integer("clicks").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    ctr: numeric("ctr"),
    position: numeric("position"),
    syncedAt: timestamp("synced_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    urlQueryDateIdx: uniqueIndex("seo_search_queries_url_query_date_idx").on(
      t.url,
      t.query,
      t.date
    ),
    queryIdx: index("seo_search_queries_query_idx").on(t.query),
  })
);

export const seoSitemapSubmissions = pgTable(
  "seo_sitemap_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sitemapUrl: text("sitemap_url").notNull(),
    source: text("source").notNull().default("google"), // submission target
    status: text("status").notNull().default("pending"), // pending|submitted|processed|error
    isPending: boolean("is_pending").notNull().default(true),
    urlCount: integer("url_count"),
    warnings: integer("warnings").notNull().default(0),
    errors: integer("errors").notNull().default(0),
    lastSubmittedAt: timestamp("last_submitted_at"),
    lastDownloadedAt: timestamp("last_downloaded_at"),
    lastErrorMessage: text("last_error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    sourceUrlIdx: uniqueIndex("seo_sitemap_submissions_source_url_idx").on(t.source, t.sitemapUrl),
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
