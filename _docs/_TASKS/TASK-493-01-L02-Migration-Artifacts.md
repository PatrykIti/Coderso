# TASK-493-01-L02: Full Migration Artifacts (0079)
# FileName: TASK-493-01-L02-Migration-Artifacts.md

**Parent Subtask:** TASK-493-01
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Small
**Dependencies:** TASK-493-01-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Produce the **full Drizzle migration artifacts** that create the
  four tables defined in L01, and verify they apply cleanly. Without this leaf
  the schema change cannot reach a database.
- **Owning module(s) to create-or-extend:**
  - `core/db/migrations/0079_<slug>.sql` (**create** — `CREATE TABLE` +
    `CREATE INDEX`/`CREATE UNIQUE INDEX` statements, `--> statement-breakpoint`
    separated, matching the L01 schema exactly).
  - `core/db/migrations/meta/0079_snapshot.json` (**create** — Drizzle snapshot,
    `"version": "7"`, `"dialect": "postgresql"`).
  - `core/db/migrations/meta/_journal.json` (**extend** — append the `idx: 79`
    entry after the existing `idx: 78` / `0078_backup_users_staging`).
- **Source-of-truth docs:** `_docs/DATA_MODEL.md` (the four tables get
  catalogued here — done in 06-L02), Drizzle migration conventions used by the
  existing `0000`–`0078` files.
- **Out of scope:** any TS schema edit (that is L01); data-access helpers; any
  destructive change to existing tables.

> **Generate, don't hand-write where possible:** prefer the repo's Drizzle
> generate command (e.g. `bun run db:generate` / `drizzle-kit generate`) so the
> SQL **and** snapshot **and** journal entry are produced consistently from the
> L01 schema, then review the diff. Only the four new tables/indexes may appear;
> reject any unrelated drift.

---

## Security Contract

- **Endpoint visibility:** n/a — migration files only.
- **Auth model / RBAC / CSRF / Rate-limit:** n/a.
- **Validation:** the migration must be **additive** (only `CREATE TABLE` /
  `CREATE INDEX`); no `DROP`/`ALTER` against existing tables. Confirm the
  generated diff touches only `seo_indexed_pages`, `seo_search_metrics`,
  `seo_search_queries`, `seo_sitemap_submissions`.
- **Anti-abuse:** n/a.
- **Secret/PII handling:** no secrets/PII in DDL.

---

## Implementation Pseudocode

```sql
-- core/db/migrations/0079_<slug>.sql (shape; mirror L01 exactly)
CREATE TABLE "seo_indexed_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "url" text NOT NULL,
  "target_type" text,
  "target_id" uuid,
  "coverage_state" text,
  "indexing_state" text,
  "verdict" text,
  "robots_state" text,
  "google_canonical" text,
  "user_canonical" text,
  "last_crawled_at" timestamp,
  "last_fetched_at" timestamp,
  "synced_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "seo_indexed_pages_url_idx" ON "seo_indexed_pages" USING btree ("url");
--> statement-breakpoint
CREATE INDEX "seo_indexed_pages_target_idx" ON "seo_indexed_pages" USING btree ("target_type","target_id");
--> statement-breakpoint
CREATE INDEX "seo_indexed_pages_state_idx" ON "seo_indexed_pages" USING btree ("indexing_state");
--> statement-breakpoint
-- ... seo_search_metrics, seo_search_queries, seo_sitemap_submissions (mirror L01) ...
```

```jsonc
// core/db/migrations/meta/_journal.json — append to "entries"
{
  "idx": 79,
  "version": "7",
  "when": <epoch-ms>,
  "tag": "0079_<slug>",
  "breakpoints": true
}
```

**Data flow:** L01 schema ⟶ `drizzle-kit generate` ⟶ SQL + snapshot + journal ⟶
`migrate` applies on boot/CI ⟶ tables exist for 02/03/04.

**Error handling:** if generate reports drift beyond the four tables, fix L01
(do not hand-edit the snapshot to paper over drift). The migrate smoke test
fails loudly if any table/index is missing.

**Regression-test shape:**
- Apply all migrations against a throwaway DB; assert the four tables and their
  unique/secondary indexes exist (`information_schema` / `pg_indexes`).
- Snapshot/journal parity: `idx` is last-shipped + 1 (79 follows 78), `tag` matches
  the SQL filename.

---

## Testing Requirements

- **Bun lane** (`tests/integration/routes/` or a DB-migration smoke under
  `tests/integration/`) — run the migrator against an ephemeral DB and assert
  table/index existence. Migration apply is a **runtime/DB flow → Bun**, not
  Vitest.
- **Migration-smoke test:** `tests/integration/toolchain/bunLaneProvisioning.test.ts`
  is the concrete apply test — after 0079 lands, sync `MIGRATION_COUNT` 77 → 78
  in `tests/integration/toolchain/bunLaneProvision.test.ts`,
  `bunLaneProvisioning.test.ts`, and `runBunParallel.test.ts`.
- Drizzle generate is idempotent afterward (re-running produces no new diff).
- `bun run typecheck` stays green.
