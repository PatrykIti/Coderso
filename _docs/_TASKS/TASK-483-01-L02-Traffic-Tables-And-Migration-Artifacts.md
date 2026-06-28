# TASK-483-01-L02: Traffic Tables And Migration Artifacts
# FileName: TASK-483-01-L02-Traffic-Tables-And-Migration-Artifacts.md

**Parent Subtask:** TASK-483-01
**Priority:** High
**Category:** Tools / Analytics / DB Schema
**Estimated Effort:** Medium
**Dependencies:** TASK-483-01-L01
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

- **Goal:** Add the two traffic tables to `core/db/schema.ts` with full Drizzle
  migration artifacts so the pipeline has durable storage.
- **Owning module(s) to extend:** `core/db/schema.ts` (add `analyticsPageviews`,
  `analyticsSessions`). New migration under `core/db/migrations/`.
- **Source-of-truth docs:** `_docs/DATA_MODEL.md`, `_docs/ORM_SPEC.md`,
  `_docs/SECURITY_SPEC.md`.
- **Out-of-scope:** repository functions (L03), ingestion (TASK-483-02). No raw
  IP column — the visitor identity is a salted hash only.

## DB Migration Artifacts (MANDATORY)

This leaf changes the database. It **requires the full migration artifact set**:

- A new SQL migration file `core/db/migrations/0064_<slug>.sql` (next index
  after the current head `0063_yummy_glorian`).
- A new `core/db/migrations/meta/0064_snapshot.json` (next after `0063_snapshot.json`).
- An appended entry in `core/db/migrations/meta/_journal.json` (next `idx` after
  `63`, version `"7"`, with a new `when` epoch and a `tag` matching the SQL file).

Generate via the repo's Drizzle generate flow rather than hand-editing snapshots;
verify the SQL matches the `pgTable` definitions before committing.

## Implementation Pseudocode

```ts
// core/db/schema.ts (mirror existing table style: timestamp("...").defaultNow().notNull(), index(...))
export const analyticsSessions = pgTable(
  "analytics_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    visitorHash: text("visitor_hash").notNull(),      // salted daily hash, NOT raw IP
    sourceKind: text("source_kind").notNull(),        // TrafficSourceKind
    referrerHost: text("referrer_host"),
    deviceClass: text("device_class").notNull(),      // TrafficDeviceClass
    lang: text("lang"),
    entryPath: text("entry_path").notNull(),
    exitPath: text("exit_path"),
    pageviewCount: integer("pageview_count").notNull().default(1),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  },
  (t) => ({
    startedAtIdx: index("analytics_sessions_started_at_idx").on(t.startedAt),
    visitorIdx: index("analytics_sessions_visitor_idx").on(t.visitorHash),
  })
);

export const analyticsPageviews = pgTable(
  "analytics_pageviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => analyticsSessions.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    referrerHost: text("referrer_host"),
    sourceKind: text("source_kind").notNull(),
    deviceClass: text("device_class").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    createdAtIdx: index("analytics_pageviews_created_at_idx").on(t.createdAt),
    pathIdx: index("analytics_pageviews_path_idx").on(t.path),
    sessionIdx: index("analytics_pageviews_session_idx").on(t.sessionId),
  })
);
```

Data flow: ingestion (TASK-483-02) upserts a session row keyed by
`visitorHash` within a rolling 30-minute window and inserts one `pageviews` row
per event; aggregation (TASK-483-04) reads both. Indexes back the time-range,
path-ranking, and visitor-uniqueness queries.

Error handling: schema-level only (FK cascade on session delete enables
retention pruning in TASK-483-06).

Regression-test shape (Bun, DB-backed, `tests/integration/analytics/trafficSchema.test.ts`):

```ts
test("migration creates analytics tables with expected columns", async () => {
  const cols = await db.execute(sql`
    select table_name, column_name from information_schema.columns
    where table_name in ('analytics_pageviews','analytics_sessions')`);
  expect(colNames(cols, "analytics_sessions")).toContain("visitor_hash");
  expect(colNames(cols, "analytics_sessions")).not.toContain("ip"); // no raw IP
});
```

## Security Contract

- **Endpoint visibility:** none (schema only).
- **Auth model / RBAC / CSRF:** N/A.
- **Rate-limit bucket:** N/A.
- **Validation schema-owner module:** column shape mirrors
  `trafficSchemas.ts` (L01); persisted enums must match the domain enums.
- **Anti-abuse controls:** N/A at schema layer.
- **Secret/PII handling:** **No raw IP, no full referrer URL, no User-Agent
  string** persisted. Visitor identity is a salted daily hash (`visitor_hash`)
  produced in TASK-483-02-L03. Referrer is stored as host only. This keeps the
  table outside reversible-PII scope per `_docs/SECURITY_SPEC.md`.

## Testing Requirements

- **Bun** DB-backed smoke (`set -a && source .env && set +a` first): assert the
  migration applies and the tables/columns/indexes exist, and that no `ip`
  column exists. Use a scoped check; do not truncate shared tables.
- `bun --cwd core lint`, `bun --cwd core lint:types`, `git diff --check`.
