# TASK-493-01-L01: Schema Tables & Domain Types
# FileName: TASK-493-01-L01-Schema-Tables-And-Domain-Types.md

**Parent Subtask:** TASK-493-01
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-027
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Define four new Drizzle tables for search-performance/indexing data
  and a domain types module that owns their TS types, status enums, and
  `normalize*` helpers. This is the schema foundation for the whole pipeline.
- **Owning module(s) to create-or-extend:**
  - `core/db/schema.ts` (extend — add tables immediately after `seoDocuments`
    at `:988`; the column helpers `uuid/text/integer/boolean/timestamp/jsonb/
    index/uniqueIndex` are already imported at `:1-13`, but **`numeric` is NOT
    currently imported** — **ADD `numeric` to the `drizzle-orm/pg-core` import**
    in `schema.ts` (the only pre-existing "numeric" token is a comment at
    `:783`, not an import or usage)).
  - `core/services/seo/seoSearchPerformanceTypes.ts` (**create** — types, enums,
    `normalize*`; sibling to the existing `seoTypes.ts`).
- **Source-of-truth docs:** `_docs/DATA_MODEL.md` (table catalogue),
  `_docs/SEARCH_SPEC.md` (search-performance addendum), `_docs/CMS_API.md`
  (downstream shapes), `_docs/SECURITY_SPEC.md` (no PII stored — URLs/queries
  only).
- **Out of scope:** the migration SQL/snapshot/journal (that is L02 — this leaf
  only edits `schema.ts` + the types module); any data-access/query helper
  (those live in 03/04); changing `seoDocuments`.

> **DB change:** this leaf alters the Drizzle schema, so it is **incomplete
> without the L02 migration artifacts** (SQL + `meta/0064_snapshot.json` +
> `meta/_journal.json` entry). L01 and L02 land together.

---

## Security Contract

- **Endpoint visibility:** n/a — schema/types only, no route or handler.
- **Auth model:** n/a.
- **RBAC:** n/a (consumers in 02/03/04 enforce `content:*` / `settings:*`).
- **CSRF / Rate-limit:** n/a.
- **Validation:** the new module owns the `normalize*` helpers and status enums
  (`as const` unions) that downstream writers validate against; downstream JSON
  schemas use `additionalProperties: false` (reject-unknown) — see 03/04.
- **Anti-abuse:** n/a (no public write).
- **Secret/PII handling:** store **no PII** — only public URLs, search query
  strings, and aggregate counts. No GSC credentials or tokens are persisted in
  these tables (credentials live in the Integrations secret store, subtask 03).
  Confirm nothing here is logged with request bodies.

---

## Implementation Pseudocode

```ts
// core/db/schema.ts — append after seoDocuments (:1011)

export const seoIndexedPages = pgTable(
  "seo_indexed_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    url: text("url").notNull(),
    targetType: text("target_type"),          // "page" | "entry" | null (unmatched)
    targetId: uuid("target_id"),
    coverageState: text("coverage_state"),     // GSC coverageState (e.g. "Submitted and indexed")
    indexingState: text("indexing_state"),     // "INDEXED" | "NOT_INDEXED" | "EXCLUDED" | "UNKNOWN"
    verdict: text("verdict"),                  // GSC verdict: "PASS" | "FAIL" | "NEUTRAL"
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
    date: timestamp("date").notNull(),         // day bucket (UTC midnight)
    clicks: integer("clicks").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    ctr: numeric("ctr"),                       // 0..1
    position: numeric("position"),             // avg position
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
    url: text("url"),                          // null = site-wide query row
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
      t.url, t.query, t.date
    ),
    queryIdx: index("seo_search_queries_query_idx").on(t.query),
  })
);

export const seoSitemapSubmissions = pgTable(
  "seo_sitemap_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sitemapUrl: text("sitemap_url").notNull(),
    source: text("source").notNull().default("google"),     // submission target
    status: text("status").notNull().default("pending"),    // pending|submitted|processed|error
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
    sourceUrlIdx: uniqueIndex("seo_sitemap_submissions_source_url_idx").on(
      t.source, t.sitemapUrl
    ),
  })
);
```

```ts
// core/services/seo/seoSearchPerformanceTypes.ts (new)

export const seoIndexingStates = ["INDEXED", "NOT_INDEXED", "EXCLUDED", "UNKNOWN"] as const;
export type SeoIndexingState = (typeof seoIndexingStates)[number];

export const seoSitemapStatuses = ["pending", "submitted", "processed", "error"] as const;
export type SeoSitemapStatus = (typeof seoSitemapStatuses)[number];

export type SeoIndexedPage = {
  url: string;
  targetType: "page" | "entry" | null;
  targetId: string | null;
  indexingState: SeoIndexingState;
  coverageState: string | null;
  verdict: string | null;
  lastCrawledAt: Date | null;
};

export type SeoSearchMetricPoint = {
  url: string;
  date: Date;
  clicks: number;
  impressions: number;
  ctr: number;       // 0..1
  position: number;
};

export type SeoSearchQueryRow = {
  url: string | null;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export const isSeoIndexingState = (v: unknown): v is SeoIndexingState =>
  typeof v === "string" && (seoIndexingStates as readonly string[]).includes(v);

// Coerce a raw GSC indexingState/coverageState string into our enum.
export function normalizeIndexingState(raw: string | null | undefined): SeoIndexingState {
  if (!raw) return "UNKNOWN";
  if (isSeoIndexingState(raw)) return raw;
  const lower = raw.toLowerCase();
  if (lower.includes("indexed") && !lower.includes("not")) return "INDEXED";
  if (lower.includes("excluded")) return "EXCLUDED";
  if (lower.includes("not")) return "NOT_INDEXED";
  return "UNKNOWN";
}

// numeric columns come back as strings; coerce defensively.
export const toNumber = (v: number | string | null | undefined, fallback = 0): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
};
```

**Data flow:** schema tables ⟶ (03) GSC sync upserts rows ⟶ (04) aggregation
reads + coerces via `toNumber`/`normalizeIndexingState` ⟶ (05) UI renders. Keep
all enum/`normalize*` ownership in this module; routes re-import, never
re-declare.

**Error handling:** none at this layer (no I/O). Enum guards return `"UNKNOWN"`
rather than throwing, so a drifted GSC string never crashes a sync.

**Regression-test shape:**
- `normalizeIndexingState` maps known/unknown/cased strings correctly.
- `isSeoIndexingState` accepts only the enum members.
- `toNumber` coerces numeric-string columns and falls back on `null`/`NaN`.

---

## Testing Requirements

- **Vitest** (`tests/vitest/seo/seoSearchPerformanceTypes.test.ts`) — pure
  `normalize*`/guard/coercion cases above. No DB.
- `bun run typecheck` must pass with the new `$inferSelect`/`$inferInsert`
  types resolving in downstream modules.
- Migration apply itself is verified in **L02** (Bun lane).
