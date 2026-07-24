# TASK-551-05-L01: Schema Split, Indexes, and Concurrency Constraints
# FileName: TASK-551-05-L01-Schema-Split-Indexes-And-Concurrency-Constraints.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-05
**Priority:** Critical
**Category:** Database / Schema / Migration / Integrity
**Estimated Effort:** Extra Large
**Dependencies:** TASK-551-02-L02; TASK-551 external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Decompose the 1,700+ line schema into stable domain modules without changing
existing exports or generated DDL, then add the canonical local search vectors,
cache-invalidation-outbox table, and minimum evidence-backed composite/reverse-
FK/cutoff indexes and concurrency constraints required by later query/cache
contracts. This is the sole TASK-551 schema and migration writer.

## Exact File Ownership

**Schema:** `core/db/schema.ts`, `core/db/schema/auth.ts`,
`core/db/schema/content.ts`, `core/db/schema/operations.ts`,
`core/db/schema/engagement.ts`, `core/db/schema/commerce.ts`, and
`core/db/schema/analytics.ts`, plus
`core/db/schema/searchVectors.ts` and
`core/db/schema/cacheInvalidationOutbox.ts`.

**Tests:** `tests/vitest/db/schemaExports.test.ts`,
`tests/vitest/db/searchVectorDefinitions.test.ts`,
`tests/integration/database/schemaMigrationParity.test.ts`,
`tests/integration/database/searchVectorMigration.test.ts`,
`tests/integration/database/cacheInvalidationOutboxSchema.test.ts`,
`tests/integration/database/task551IndexAndConstraintCatalog.test.ts`, and
`tests/perf/database-index-write-overhead.test.ts`.

**Migration:** exactly one next-free
`core/db/migrations/NNNN_task551_schema_search_indexes_constraints_outbox.sql`, its matching
`core/db/migrations/meta/NNNN_snapshot.json`, and
`core/db/migrations/meta/_journal.json`, where `NNNN` is resolved atomically at
leaf start under the parent migration guard.

No service, route, client, cache, or other test file may be edited. TASK-551-04
search services and TASK-551-08 outbox services consume these schema exports
read-only. The parent gate makes TASK-511/TASK-493/TASK-517/TASK-518 terminal by
default; only its fresh exact all-path serialized handoff may substitute. Their
final table declarations may then be moved
byte-for-byte during the split, but their behavior is forbidden. TASK-517
entry/public behavior and all task/changelog/workflow files remain forbidden.

## Schema Split Contract

- `schema.ts` remains the sole public import surface and re-exports every
  existing symbol with identical TypeScript and runtime identity.
- Modules are cohesive: auth/security identity; content/search/revisions;
  operations/settings/audit/webhooks/assistant; engagement/presentation/forms/
  booking/kits; commerce; analytics; a pure local search-vector definition
  module; and the cache-invalidation-outbox table. Cross-module foreign
  references use narrow imports without circular initialization.
- First run a split-only generation check and prove it emits zero DDL/artifacts;
  only then add this leaf's generated columns, outbox, indexes, and constraints
  and generate exactly one migration triple. The final generated snapshot must
  describe every final schema change.
- No unrelated default, enum, nullability, FK action, name, or column order
  changes are allowed.

## Implementation Pseudocode

```ts
export { users, roles, sessions, apiKeys, passwordResets } from "./schema/auth";
export { pages, pageRevisions, contentEntries, contentRevisions, posts, postRevisions } from "./schema/content";
export { cacheInvalidationOutbox } from "./schema/cacheInvalidationOutbox";
// operations, engagement, commerce, analytics retain the complete old surface.

const SEARCH_VECTOR_SQL = strictReadonly({
  pages: weightedLocalVector("simple", { A: ["title"], B: ["slug"] }),
  entries: weightedLocalVector("simple", { A: ["title"], B: ["data->>title", "slug", "tags"] }),
  posts: weightedLocalVector("simple", { A: ["title"], B: ["slug", "excerpt", "data->>title"] }),
  media: weightedLocalVector("simple", { A: ["title", "alt"], B: ["caption", "key"] }),
  users: weightedLocalVector("simple", { A: ["name"] }),
  assistantDocs: weightedLocalVector("simple", { A: ["title"], B: ["keywords_json"] }),
  assistantDocChunks: weightedLocalVector("simple", { A: ["heading"], B: ["content"] }),
});

// Each owning table declares a stored generated searchVector from its matching
// literal above and a GIN index over that column. No expression references a
// different table. Query services consume only the exported generated columns.

export const cacheInvalidationOutbox = pgTable("cache_invalidation_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventKey: text("event_key").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  availableAt: timestamp("available_at").defaultNow().notNull(),
  attempts: integer("attempts").default(0).notNull(),
  claimToken: text("claim_token"),
  claimUntil: timestamp("claim_until"),
  processedAt: timestamp("processed_at"),
  lastErrorCode: text("last_error_code"),
}, outboxIndexesAndNamedStateChecks);

type IndexCandidate = StrictReadonly<{
  inventoryId: string;
  name: string;
  ddl: string;
  expectedPlanNode: string;
  maxWriteRegressionPercent: 20;
}>;

function selectIndex(candidate: IndexCandidate, evidence: BaselineEvidence): SelectedIndex {
  // Require exact predicate/order match and measured large-fixture benefit.
}
```

At minimum add the seven exact local stored-vector GIN indexes and the outbox
unique/event-state/cutoff indexes and checks. Also verify and, only when
supported, add: list/keyset composites for
pages, entries, posts, users, submissions, media, and booking; reverse-FK plus
created/cutoff indexes for delivery/action/session/analytics children; unique
`(parent_id, version)` constraints named
`page_revisions_page_version_idx`,
`content_revisions_entry_version_idx`, and
`widget_template_revisions_template_version_idx` (preserving existing post and
detail-page equivalents); and a named GiST exclusion constraint
`bookings_active_resource_window_excl` over resource equality and
`tsrange(starts_at, ends_at, '[)')` overlap with the exact predicate
`status IN ('pending', 'confirmed')`. Add
`btree_gist` idempotently if the exclusion contract needs it. Validate
`ends_at > starts_at`. Before DDL, a deterministic read-only preflight detects
duplicate revision versions, invalid windows, and overlapping pending/confirmed
bookings; any real conflict aborts with bounded counts and a stable migration
code, never deletes/rewrites customer rows. The recovery runbook requires an
operator-owned correction followed by rerun. Do not put `CREATE INDEX
CONCURRENTLY` inside the transactional Drizzle migration. If measured lock time
cannot meet the deployment budget, stop and amend the contract with a separately
validated non-transactional operations phase before implementation.

## Regression-Test Shape

- Snapshot all pre-split public exports and table/column/index/FK/default names;
  prove split-only state is byte/DDL equivalent and imports remain stable.
- Clean and prior-version databases migrate to equivalent catalogs; migration
  rollback/recovery procedure is exercised on disposable fixtures.
- Catalog tests pin exact index column order, sort/null order, predicates,
  constraint names/definitions, generated search expressions, and extensions.
- Vector tests pin byte identity across the schema definition, generated-column
  DDL, snapshot, GIN index target, and the generated columns consumed by 04.
- Outbox tests pin strict columns, unique event key, non-negative attempts,
  claim/processed state checks, and pending/claim/processed cutoff indexes.
- Seed duplicate revision/overlap fixtures before constraint creation and prove
  the migration reports/remediates deterministically without silent deletion.
- Write benchmark covers inserts/updates at representative scale and fails above
  20% p95 regression or the L01 storage budget.

## Security Contract

- Database schema/migration only; no endpoint, auth, RBAC, CSRF, rate-limit,
  nonce/HMAC, or CAPTCHA changes.
- Constraints reinforce authorization-independent data integrity but do not
  replace route/service permission checks.
- Migration diagnostics include counts/IDs only when synthetic; production
  guidance must never emit customer fields, binds, tokens, hashes, or secrets.

## Validation Commands

- `bunx vitest run tests/vitest/db/schemaExports.test.ts`
- `bunx vitest run tests/vitest/db/searchVectorDefinitions.test.ts`
- `set -a && source .env && set +a && bun run db:generate`
- `set -a && source .env && set +a && bun run db:migrate`
- `set -a && source .env && set +a && bun test tests/integration/database/schemaMigrationParity.test.ts tests/integration/database/searchVectorMigration.test.ts tests/integration/database/cacheInvalidationOutboxSchema.test.ts tests/integration/database/task551IndexAndConstraintCatalog.test.ts tests/perf/database-index-write-overhead.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `git diff --check`

## Documentation Updates Required

No shared docs. Supply the schema module map, exact DDL, phased rollout/rollback,
storage, and write-cost evidence to TASK-551-10-L02.

## Quantified Acceptance

- Pre-existing public schema exports and non-TASK-551 catalog definitions have
  100% parity after the split; all nine human-authored schema files are at most
  1,000 lines.
- Seven local generated-vector definitions have byte-identical schema/DDL/
  snapshot/index coverage; no definition references another table.
- The outbox table is available through `core/db/schema.ts` with 100% catalog
  parity to its strict state and index contract before TASK-551-08 starts.
- Every new index/constraint has one inventory owner and evidence record; no
  speculative or duplicate-prefix index lands.
- Clean/prior migrations both pass, generated artifacts are complete, and a
  fresh `db:generate` produces no unexplained drift.
- Write p95 regression is at most 20%; duplicate versions and overlapping active
  bookings are rejected in 100% of race fixtures.
