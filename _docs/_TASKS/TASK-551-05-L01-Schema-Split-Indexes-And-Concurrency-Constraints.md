# TASK-551-05-L01: Schema Split, Indexes, and Concurrency Constraints
# FileName: TASK-551-05-L01-Schema-Split-Indexes-And-Concurrency-Constraints.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-05
**Priority:** Critical
**Category:** Database / Schema / Migration / Integrity
**Estimated Effort:** Extra Large
**Dependencies:** TASK-551-02-L02; TASK-551 external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Extend the already-split `core/db/tables/**` schema through its guarded
`core/db/schema.ts` facade: canonical local search vectors, the cache-
invalidation-outbox table, minimum evidence-backed composite/reverse-FK/cutoff
indexes, the L03-owned Solution Kit rollback authority (landed here), and
concurrency constraints required by later query/cache contracts. This is the
sole TASK-551 schema and migration writer and must not create a second
schema-module hierarchy.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Schema:** existing `core/db/schema.ts` only for exact facade re-exports;
existing table owners
`core/db/tables/analytics.ts`, `assistant.ts`, `bookings.ts`, `content.ts`,
`forms.ts`, `identity.ts`, `integrations.ts`, `media.ts`, `observability.ts`,
`operations.ts`, `pages.ts`, `platform.ts`, `posts.ts`, and `widgets.ts` only for
their exact catalog members; new cohesive table owners
`core/db/tables/cacheInvalidationOutbox.ts`,
`core/db/tables/solutionKitRollbackAuthority.ts`, and
`core/db/tables/task551MigrationOperations.ts`; and pure Bun-free definitions
`core/db/searchVectorDefinitions.ts` plus
`core/db/bookingReservationExclusion.ts`. Existing table declarations remain in
their current owner modules; only the declared columns/indexes/checks/FKs are
added.

**Tests:** existing `tests/unit/db/schemaTableFacade.test.ts` and
`tests/unit/db/schemaColumnTypeContracts.test.ts` for exact additions only, new
`tests/vitest/db/searchVectorDefinitions.test.ts`,
`tests/integration/server/task551SchemaMigrationParity.test.ts`,
`tests/integration/server/task551SearchVectorMigration.test.ts`,
`tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts`,
`tests/integration/server/task551IndexAndConstraintCatalog.test.ts`,
`tests/integration/server/task551ConcurrencyConstraints.test.ts`,
`tests/integration/server/task551OnlineIndexDeployment.test.ts`, and
`tests/perf/database-index-write-overhead.test.ts`. The Solution Kit authority
suite (`task551SolutionKitRollbackAuthoritySchema.test.ts`) is owned and run by
TASK-551-05-L03 after this migration lands.
`task551ConcurrencyConstraints.test.ts` is the exclusive raw concurrency-fixture
owner: it supplies L02 only an in-memory redacted
`coderso.task551.l05-concurrency-receipt@v1`, never a fixture/client/target.

**Migration:** exactly one next-free transactional SQL file with suffix
`_task551_search_indexes_constraints_outbox.sql`, its exact matching
`meta/*_snapshot.json`, and the fresh `meta/_journal.json` entry. The same writer
also owns the same-ID non-transactional companion with suffix
`_task551_online_indexes.sql`, `scripts/task-551-online-indexes.ts`, and
`tests/perf/fixtures/task551OnlineIndexManifest.ts`. At the start of either
rollout command, the tool re-reads the journal and resolves the unique exact
migration ID and paths; no human-entered migration number/path placeholder or
separate resolver step is accepted. The companion is part of the same migration
deployment contract but is deliberately absent from the transactional Drizzle
journal; it may contain only the closed snapshot-owned index set rendered as
`CREATE [UNIQUE] INDEX CONCURRENTLY` plus matching guarded drop/retry operations.
Its exact receipt/mirror/GUC/reverse semantics are the Locked Rollout
Orchestrator contract below.

No service, route, client, cache, or other test file may be edited. TASK-551-04
search services and TASK-551-08 outbox services consume these schema exports
read-only. The parent gate makes TASK-511/TASK-493/TASK-517/TASK-518 terminal by
default; only its fresh exact all-path serialized handoff may substitute. Their
final table declarations remain neither moved nor duplicated; only this leaf's
declared additions may touch their current table-owner modules. TASK-517
entry/public behavior and all task/changelog/workflow files remain forbidden.
The rollout script imports L01's `parseDatabaseFleetConfig` and L02's pure
application-name builder read-only, never copying either parser or importing the
live DB client.

## Existing Table-Facade Contract

- `core/db/schema.ts` remains the sole public import surface. Its current 20
  `./tables/*` exports stay byte-identical and it adds only the three new table-
  module exports named above. `tests/unit/db/schemaTableFacade.test.ts` must pass
  against the immediately-current committed snapshot before and after generation.
- First run the current `bun run db:generate` path without source changes and
  prove zero schema/snapshot drift; only then add this leaf's generated columns,
  outbox, indexes, and constraints
  and generate exactly one migration triple. The final generated snapshot must
  describe every Drizzle-representable schema change. Every new snapshot-owned
  index is removed from the transactional SQL and emitted byte-for-byte by the
  closed online-index manifest; a parity test rejects an index present in only
  one representation. The installed Drizzle
  pg-core DSL cannot represent a PostgreSQL GiST exclusion constraint, so the
  exact exported `BOOKING_RESERVATION_EXCLUSION_SQL` descriptor, the custom SQL
  seam in that same migration, and live `pg_constraint` evidence are the sole
  explicit snapshot exception; the exception is tested and may not be inferred
  for any other object.
- No unrelated default, enum, nullability, FK action, name, or column order
  changes are allowed. The sole existing-FK action change is the explicitly
  owned `solution_kit_install_runs.rollback_of_run_id` transition from
  `ON DELETE SET NULL` to `ON DELETE RESTRICT`; its full authority contract,
  named checks, and index rows are owned by TASK-551-05-L03 and landed by this
  leaf's one migration; migration/catalog tests pin it.

## Locked Rollout Orchestrator, Admission, and Budgets

This migration is executed only by one resumable command:

`bun scripts/task-551-online-indexes.ts rollout-forward --receipt .tmp/task551-migration-receipt.json --admission-mode <external|offline-single>`

`rollout-reverse` is the only reverse command and `status` is read-only. Generic
`bun run db:migrate`, `drizzle-kit migrate`, startup migration, direct SQL, and
the former split `resolve-receipt`/`apply-resume-check` sequence are not valid
TASK-551 rollout paths. The orchestrator creates a max-1 postgres-js client with
L02's `coderso:migration:<operationId>` identity, calls `reserve()` once, takes
the advisory lock on that handle, sets all three GUCs with parameterized
`set_config(...,false)`, verifies TASK-551 is the only pending journal member,
and passes only `drizzle(adaptedReserved)` to the installed
`drizzle-orm/postgres-js/migrator`. Direct `drizzle(reserved)` is forbidden:
postgres.js 3.4.9's `reserve()` result lacks runtime `.options` and `.begin`,
while Drizzle 0.45.2 requires both.

L01 solely owns
`createTask551ReservedDrizzleClient(poolClient, reserved)`. It returns a
callable proxy whose tag invocation, `.unsafe()` (including `.values()`), and
other existing SQL/value helpers forward to the same reserved handler, never to
the pool. Its non-writable/non-configurable `.options` property is the identical
`poolClient.options` object—not a clone—and its nested `parsers`/`serializers`
maps remain mutable because Drizzle installs transparent date/time and JSON
handlers there and the reserved handler closes over that same object. Its
non-reassignable `.begin` supports only `begin(callback)` and
`begin("", callback)`; every nonempty option string, malformed overload, nested
or concurrent begin rejects before `BEGIN`. It issues static `BEGIN`, invokes
the callback with the same adapted callable identity, awaits scalar or array
results like postgres.js, then issues static `COMMIT`; callback failure issues
static `ROLLBACK` and preserves the original error when rollback succeeds.
`BEGIN`, `COMMIT`, or `ROLLBACK` failure makes transaction outcome unknown,
poisons the lease, and forbids any later query or release. It never calls or
delegates `poolClient.begin` and, after reservation, the pool callable/SQL
helpers are never dispatched; only the exact `.options` reference and `.end()`
remain usable.

Creation records `pg_backend_pid()` through `reserved`; PID is rechecked after
GUC setup/before `BEGIN` and after cleanup. The first SQL guard, expand DDL,
receipt insert, and Drizzle journal insert expose test-only stage observations
of that identical PID. After a known committed or rolled-back transaction, the
orchestrator statically `RESET`s exactly the three TASK-551 custom GUCs, proves
all three read as unset/empty on the same PID, calls `reserved.release()` once,
then awaits normal `poolClient.end()`. Reset/PID failure poisons instead: do not
release, perform no more SQL, and await `poolClient.end({ timeout: 0 })` to
terminate the max-1 pool. Pool end runs exactly once in either branch.

The static SQL's first guard reads all GUCs with strict `current_setting(...,
true)`, rejects missing/empty/oversized values, parses the JSON, checks exact
recursive key sets/types/array bounds/version/task/state/generation/digest
grammar, requires its operation ID to equal both GUC and exact migration
`application_name`, and recomputes the core SHA-256 over the exact receipt text.
Its final statement inserts that receipt with no conflict clause and requires
one row. Different-session setup, wrong operation/digest/application name,
tampering, oversize and replay therefore fail inside the migrator transaction
before commit. It never spawns a shell or delegates phase 2 to an opaque command.
The real-PostgreSQL adapter compatibility suite is a rollout prerequisite. If
faithful callable/options/parser/serializer/transaction behavior fails against
the pinned versions, rollout stops with
`task551_reserved_drizzle_adapter_incompatible`; the contract must be amended to
replace this path with the custom same-reserved transaction runner before work
continues. There is no runtime fallback or deployment containing two selectable
migration paths.

The command holds one dedicated TASK-551 advisory-lock session for its complete
run and follows this exact state machine:

1. **Resolve/classify/preflight.** Resolve/harden/hash the exact migration,
   snapshot, online SQL, manifest, and current journal; reject any other pending
   migration. Before freezing any read-index candidate, consume L02's strict
   `task551-predecision-clean` interval and admit only its `application` deltas;
   reject a reset/identity mismatch, polluted interval, or diagnostic/unknown-
   driven candidate. Capture exact row/byte counts, free disk, replication lag, oldest
   transaction, duplicate revisions, invalid windows, and overlapping active
   bookings into a canonical preflight digest. Free disk is at least `2.5 *` the
   combined touched size; lag `<=5s`; oldest transaction `<=30s`. `small` means
   every touched table `<=100,000` rows and `<=256 MiB` and combined size
   `<=1 GiB`; otherwise `large`. Select and persist lock/statement/phase budgets:
   lock 2s in both classes, statement/transaction 30/120s small and 300/900s
   large, online member 30 minutes and combined 2 hours. Before phase 2, a resumed
   command must reproduce both artifact and canonical preflight digest. After DDL
   or compatible traffic begins, the original digest/classification/budgets stay
   immutable; resume instead appends a fresh health recheck digest, requires all
   current ceilings/invariants to pass, and may never downgrade the classification
   or loosen a budget merely because live counts changed.
2. **Stop admission and drain.** `external` mode is mandatory when the shared
   fleet has more than one total process or autoscaling/scale-to-zero is enabled. Resolve the
   adapter only from `TASK551_ADMISSION_ADAPTER`: absolute regular executable,
   owner-executable, not group/world writable, SHA-256 pinned into the receipt.
   Runtime and worker target counts come from the exact L01
   `parseDatabaseFleetConfig` result (`1..256` and `0..256`); identity and this
   adapter do not reparse them, and neither is inferred from the other. The
   cluster budget reserves at least three rollout connections: this migration/
   advisory-lock lease plus the two visibility probes below.
   Invoke Node `execFile` directly with fixed argv
   `prepare --operation-id <uuid> --nonce <32-byte-base64url> --receipt-sha256 <hex>`;
   never use a shell, concatenated command, or adapter-supplied argument. Timeout
   is 120s, stdout one UTF-8 JSON object `<=16 KiB`, stderr `<=16 KiB` diagnostic
   bytes and never receipted. The strict response is exactly
   `{version:1,action:"prepare",operationId,nonce,receiptSha256,
   admissionStopped:true,workersDrained:true,maintenanceStopped:true,
   runtimeReplicas:[{id,state:"stopped",binarySha256}],
   workerReplicas:[{id,state:"stopped",binarySha256}],completedAt}`. Objects at
   both levels reject unknown keys; IDs satisfy L02's replica-ID grammar and are
   unique across arrays; SHA-256 is lowercase hex; runtime/worker array lengths
   equal their respective configured counts. Echoes match byte-for-byte and
   `completedAt` is canonical UTC within the invocation window. There is no
   unimplemented signature claim: executable pinning plus operation/nonce/
   receipt binding is the exact local trust boundary. Malformed/stale output
   fails closed.
3. **Prove database quiescence.** Adapter acknowledgement is necessary but not
   sufficient. On the migration session, sample `pg_stat_activity` for the same
   database and application role, excluding its own PID, every 250ms for a
   continuous 5s within a 120s deadline. Exact L02 names
   `coderso:runtime:<replicaId>`, `coderso:worker:<replicaId>`, and
   `coderso:maintenance:<replicaId>` must be absent; an unknown same-role
   `application_name`, missing name, or a new session resets/fails the drain.
   Before trusting this observation, open one runtime- and one worker-named probe
   connection under the exact application DB role, require the migration session
   to observe both distinct backend PIDs/application names, close both, and
   require their disappearance. Failure to read `pg_stat_activity`, a differing
   runtime role, redacted/missing identity, or failure to observe the probes is
   `task551_migration_activity_visibility_invalid`; rollout stops. No privilege
   or visibility limitation is treated as an empty result.
   Persist the adapter ack, nonce, observed replica set, and quiescence window.
4. **Transactional expand.** Persist `transaction_apply_pending`, then use the
   reserved GUC-bound migration handle to apply the guarded artifact with
   selected `lock_timeout`, `statement_timeout`, and whole-phase cancellation.
   Precompute its canonical successor receipt/digest, set the three session
   GUCs, then invoke the installed migrator bound to that handle. That same
   transaction creates `task551_migration_operations`, applies columns/tables/
   checks/generated backfill/exclusion DDL, inserts exactly one validated v2 row
   already marked `transaction_applied`, and writes Drizzle's journal row.
   Timeout/signal rolls everything back. Recovery probes
   both journal and receipt-table/catalog identity; it reruns only when nothing
   committed and never assumes success from the filesystem mirror.
5. **Drained revision-integrity group.** Keep admission stopped and workers
   drained. In exact order build
   `page_revisions_page_version_idx` and
   `widget_template_revisions_template_version_idx` using top-level autocommit
   `CREATE UNIQUE INDEX CONCURRENTLY`; assert the already-committed
   `content_revisions_entry_version_idx` byte-identical without building it
   (content.ts:97, TASK-570). Before/after each member CAS-persist state;
   require byte-identical definition plus `indisready/indisvalid=true`. Sixteen
   writer probes per family remain rejected before SQL. Valid identical members
   skip; task-owned invalid residue drops concurrently then rebuilds; a wrong
   valid/foreign object fails. Only the durable group barrier authorizes resume.
6. **Authorize and resume only the compatible binary in external mode.** The old
   pre-TASK-551 binary is never resumed. After the durable revision-integrity
   barrier, validate the
   supplied `TASK551_RESUME_BINARY_SHA256` and
   `TASK551_REVISION_WRITER_COMPATIBILITY_SHA256` against the release receipt
   proving the resumed TASK-551 binary already uses the shared race-safe revision
   allocator and conflict mapping for page/content/widget writers. Persist
   `resume_authorized` only after that proof. In external mode call `execFile`
   with fixed argv
   `resume --operation-id <uuid> --nonce <new nonce> --receipt-sha256 <hex>
   --authorization-sha256 <final-catalog-and-binary digest>`; timeout 180s and
   the same output limits. Its exact object is
   `{version:1,action:"resume",operationId,nonce,receiptSha256,
   authorizationSha256,admissionResumed:true,workersResumed:true,
   runtimeReplicas:[{id,state:"running",binarySha256}],
   workerReplicas:[{id,state:"running",binarySha256}],completedAt}`; counts/IDs/
   echoes are revalidated and every binary digest equals the authorized digest.
   Persist `resume_completed` only after this acknowledgement. That transition
   records `newBinaryTrafficAccepted=true`, permanently forbids reverse, and
   makes every later failure forward-fix only. If compatibility evidence is
   absent, admission stays stopped. `offline-single` does not resume here and
   remains cold through phase 7.
7. **Online read-performance group and final gate.** In external mode build every
   remaining ordered member with per-member CAS receipts while the compatible
   binary serves real traffic; 16 representative writers must have zero
   invariant/deadlock errors and `<=20%` p95 regression. In `offline-single`,
   admission remains stopped and only rehearsal evidence supplies the write-cost
   gate. Verify schema/snapshot/manifest/live-catalog parity and every member
   ready/valid, then persist `forward_ready`. Only now may offline mode persist
   `operator_resume_authorized`; the tool never starts a process, and the operator
   may start exactly one compatible binary after successful command exit.

`offline-single` is allowed only when the shared fleet is exactly one runtime
and zero workers,
autoscaling is false, and exact environment confirmation
`TASK551_OFFLINE_SINGLE_ACK=all-coderso-processes-stopped` is present. It invokes
no external adapter and is valid only as a cold upgrade: the same 5-second DB
quiescence proof must pass before phase 2, no app/worker/maintenance session may
appear before command completion, and the tool merely authorizes the operator's
post-exit start. This is the exact local/small-site path, not a claim that a
process was remotely resumed.

Pre-cutover `rollout-reverse` requires a fresh drain (even if forward receipt
says stopped), a nonce-bound reverse authorization, and proof
`newBinaryTrafficAccepted` was never set. It reverses online members in recorded dependency-safe order
with top-level `DROP INDEX CONCURRENTLY`, persists each reverse member, then sets
`reverse_transaction_pending` and reverses the transactional artifact including
the receipt table and exclusion `.dropSql`, deliberately preserving `btree_gist`.
After commit it uses the filesystem pending state plus exact catalog/journal
probe to mark `reverse_complete`. After any external compatible-binary resume
acknowledgement, reverse is forbidden and the path is forward-fix only. Resume/reverse tests kill
the process after every state transition, adapter boundary, transaction commit,
group barrier, and member in both directions; no recovery path resumes admission
before authorization or loses ordered progress.

## Implementation Pseudocode

```ts
// core/db/schema.ts keeps its current 20 exports and adds only these table owners.
export * from "./tables/cacheInvalidationOutbox";
export * from "./tables/solutionKitRollbackAuthority";
export * from "./tables/task551MigrationOperations";

// Existing pages/content/posts/media/identity/assistant table modules import
// generated-column literals from this Bun-free owner without moving tables.

export const SEARCH_VECTOR_SQL = strictReadonly({
  pages: `setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(slug, '')), 'B')`,
  entries: `setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(data ->> 'title', '') || ' ' || coalesce(slug, '') || ' ' || coalesce(tags::text, '')), 'B')`,
  posts: `setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(slug, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(data ->> 'title', '')), 'B')`,
  media: `setweight(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(alt, '')), 'A') || setweight(to_tsvector('simple', coalesce(caption, '') || ' ' || coalesce(key, '')), 'B')`,
  users: `setweight(to_tsvector('simple', coalesce(name, '')), 'A')`,
  assistantDocs: `setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(keywords_json::text, '')), 'B')`,
  assistantDocChunks: `setweight(to_tsvector('simple', coalesce(heading, '')), 'A') || setweight(to_tsvector('simple', coalesce(content, '')), 'B')`,
});

export const normalizeTask551TrigramSql = (value: SQLWrapper) =>
  sql`lower(regexp_replace(btrim(coalesce(${value}, '')), '[[:space:]]+', ' ', 'g'))`;

const TRIGRAM_CANDIDATES = strictReadonly({
  pages: {
    sourceSql: "coalesce(title, '') || ' ' || coalesce(slug, '')",
    column: "search_trigram_text", index: "pages_search_trigram_idx",
  },
  entries: {
    sourceSql: "coalesce(title, '') || ' ' || coalesce(data ->> 'title', '') || ' ' || coalesce(slug, '') || ' ' || coalesce(tags::text, '')",
    column: "search_trigram_text", index: "content_entries_search_trigram_idx",
  },
  posts: {
    sourceSql: "coalesce(title, '') || ' ' || coalesce(slug, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(data ->> 'title', '')",
    column: "search_trigram_text", index: "posts_search_trigram_idx",
  },
  media: {
    sourceSql: "coalesce(title, '') || ' ' || coalesce(alt, '') || ' ' || coalesce(caption, '') || ' ' || coalesce(key, '')",
    column: "search_trigram_text", index: "media_search_trigram_idx",
  },
  users: {
    sourceSql: "coalesce(name, '')",
    column: "search_trigram_text", index: "users_search_trigram_idx",
  },
});

export const TRIGRAM_INDEXED_SOURCE_CONTRACT = strictReadonly({
  pages: selectedOrNull(TRIGRAM_CANDIDATES.pages),
  entries: selectedOrNull(TRIGRAM_CANDIDATES.entries),
  posts: selectedOrNull(TRIGRAM_CANDIDATES.posts),
  media: selectedOrNull(TRIGRAM_CANDIDATES.media),
  users: selectedOrNull(TRIGRAM_CANDIDATES.users),
});

// Exported from core/db/bookingReservationExclusion.ts. The installed Drizzle DSL cannot express
// exclusion constraints, so this frozen descriptor is the schema-side source
// of truth for the one explicitly custom migration fragment.
export const BOOKING_RESERVATION_EXCLUSION_SQL = Object.freeze({
  table: "bookings",
  extensionSql: "CREATE EXTENSION IF NOT EXISTS btree_gist",
  name: "bookings_active_resource_window_excl",
  predicate: "status IN ('pending', 'confirmed')",
  definition: "EXCLUDE USING gist (resource_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('pending', 'confirmed'))",
  addSql: "ALTER TABLE bookings ADD CONSTRAINT bookings_active_resource_window_excl EXCLUDE USING gist (resource_id WITH =, tsrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('pending', 'confirmed'))",
  dropSql: "ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_active_resource_window_excl",
} as const);

export const GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES = Object.freeze([
  "to_tsvector(regconfig,text)",
  "setweight(tsvector,\"char\")",
  "lower(text)",
  "regexp_replace(text,text,text,text)",
  "btrim(text)",
  "jsonb_object_field_text(jsonb,text)",
  "jsonb_out(jsonb)",
  "textcat(text,text)",
  "tsvector_concat(tsvector,tsvector)",
] as const);

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

export const task551MigrationOperations = pgTable("task551_migration_operations", {
  operationId: uuid("operation_id").primaryKey(),
  taskId: text("task_id").notNull(), // CHECK task_id = 'TASK-551'
  generation: integer("generation").notNull(), // CHECK 0..2^31-1
  direction: text("direction").notNull(), // CHECK forward|reverse
  state: text("state").notNull(), // CHECK exact version-2 state literals
  receipt: jsonb("receipt").$type<Task551MigrationReceipt>().notNull(),
  previousStateSha256: text("previous_state_sha256"),
  stateSha256: text("state_sha256").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, task551MigrationOperationChecks);

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

type Task551MigrationReceipt = StrictReadonly<{
  version: 2;
  taskId: "TASK-551";
  operationId: string;
  generation: number;
  previousStateSha256: string | null;
  stateSha256: string;
  direction: "forward" | "reverse";
  state:
    | "resolved" | "preflight_passed" | "drain_requested"
    | "drain_confirmed" | "transaction_apply_pending"
    | "transaction_applied" | "revision_integrity_building"
    | "revision_integrity_ready" | "resume_authorized"
    | "resume_completed" | "operator_resume_authorized"
    | "read_performance_building" | "forward_ready"
    | "reverse_drain_requested" | "reverse_drain_confirmed"
    | "reverse_indexes_building" | "reverse_transaction_pending"
    | "reverse_complete";
  journal: { index: number; tag: string };
  artifacts: {
    transactionalSql: { path: string; sha256: string };
    snapshot: { path: string; sha256: string };
    onlineSql: { path: string; sha256: string };
    manifestSha256: string;
    aggregateSha256: string;
  };
  preflight: { digest: string; classification: "small" | "large";
    lockTimeoutMs: 2_000; statementTimeoutMs: 30_000 | 300_000;
   transactionTimeoutMs: 120_000 | 900_000;
   recheckDigests: readonly string[] };
  admission: {
    mode: "external" | "offline-single";
    fleet: DatabaseFleetConfig; // exact L01 parser result; no local reparsing
    adapterSha256: string | null;
    drainNonce: string; prepareAckSha256: string | null;
    quiescentFrom: string | null; quiescentUntil: string | null;
    resumeNonce: string | null; resumeAuthorizationSha256: string | null;
    resumeAckSha256: string | null;
    resumeBinarySha256: string | null;
    revisionWriterCompatibilitySha256: string | null;
    newBinaryTrafficAccepted: boolean;
  };
  transaction: { apply: "pending" | "applied" | "reversed";
    catalogSha256: string | null };
  groups: readonly [
    { name: "revision-integrity"; members: readonly [
      "page_revisions_page_version_idx",
      "widget_template_revisions_template_version_idx",
    ]; complete: boolean; completedAt: string | null },
    { name: "read-performance"; members: readonly string[];
      complete: boolean; completedAt: string | null },
  ];
  forwardMembers: readonly OnlineIndexMemberReceipt[];
  reverseMembers: readonly OnlineIndexMemberReceipt[];
  finalCatalogReady: boolean;
}>;

const TASK551_MIGRATION_RECEIPT_MAX_BYTES = 65_536;
const TASK551_MIGRATION_GUCS = strictReadonly({
  operationId: "coderso.task551_operation_id",
  receipt: "coderso.task551_receipt_v2",
  receiptSha256: "coderso.task551_receipt_sha256",
});

export async function createTask551ReservedDrizzleClient(
  poolClient: PostgresSql,
  reserved: ReservedPostgresSql,
): Promise<Task551ReservedDrizzleClient> {
  const state = { active: false, poisoned: false,
    pid: await readBackendPid(reserved) };
  const adaptedReserved = createCallableReservedProxy(reserved, state);
  defineImmutableIdentity(adaptedReserved, "options", poolClient.options);
  defineImmutableIdentity(adaptedReserved, "begin", (...args: BeginArgs) =>
    runTask551ReservedBeginStateMachine({
      args, adaptedReserved, reserved, state,
      allowedOptions: [undefined, ""],
    }));
  return adaptedReserved;
}

async function applyBoundTransactionalMigration(
  receipt: Task551MigrationReceipt,
  poolClient: PostgresSql,
  reserved: ReservedPostgresSql,
): Promise<void> {
  const receiptText = canonicalJson(receipt);
  assertCanonicalReceiptBytes(receiptText, TASK551_MIGRATION_RECEIPT_MAX_BYTES);
  const receiptSha256 = sha256Hex(receiptText);
  const adaptedReserved = await createTask551ReservedDrizzleClient(poolClient, reserved);
  try {
    await setTask551MigrationGucs(reserved, {
      operationId: receipt.operationId, receiptText, receiptSha256,
    });
    await assertSameReservedPid(adaptedReserved);
    await migrate(drizzle(adaptedReserved), {
      migrationsFolder: resolvedTask551Folder(),
    });
  } finally {
    await resetVerifyReleaseOrPoisonAndEnd({ poolClient, reserved,
      adaptedReserved, gucs: TASK551_MIGRATION_GUCS });
  }
}

async function rolloutTask551Migration(
  direction: "forward" | "reverse",
  receiptPath: ".tmp/task551-migration-receipt.json",
  deps: RolloutDeps,
): Promise<Task551MigrationReceipt> {
  const receipt = await reconcileDbAndFilesystemReceipt(receiptPath, deps);
  await withOneReservedMigrationSession(deps.migrationClient, async migrationSession => {
    await acquireTask551AdvisoryLock(migrationSession);
    await verifyArtifactsAndPreflight(receipt, migrationSession);
    await stopAdmissionAndProveQuiescence(receipt, migrationSession, deps.execFile);
    if (direction === "forward") {
      await applyBoundTransactionalMigration(
        buildTransactionAppliedSuccessor(receipt),
        migrationSession,
      );
      await applyOnlineGroup(receipt, "revision-integrity", migrationSession);
      await authorizeAndResumeCompatibleBinary(receipt, deps.execFile);
      await applyOnlineGroup(receipt, "read-performance", migrationSession);
      await verifyAndPersistFinalCatalog(receipt, migrationSession);
      await authorizeOfflineSingleOperatorResume(receipt);
    } else {
      await assertPreCutoverReverseAllowed(receipt, migrationSession);
      await reverseOnlineMembers(receipt, migrationSession);
      await reverseTransactionalArtifactAndRecoverFilesystem(receipt, migrationSession);
    }
    await releaseTask551AdvisoryLock(migrationSession);
  });
  return readStrictReceipt(receiptPath);
}
```

`SEARCH_VECTOR_SQL` is the one source used by Drizzle generated columns,
migration DDL, snapshot assertions, and TASK-551-04 imports. The seven columns
are all named `search_vector`; their exact GIN indexes are
`pages_search_vector_idx`, `content_entries_search_vector_idx`,
`posts_search_vector_idx`, `media_search_vector_idx`,
`users_search_vector_idx`, `assistant_docs_search_vector_idx`, and
`assistant_doc_chunks_search_vector_idx`. Configuration, `coalesce`, JSON
`->>`/`::text`, exact `|| ' ' ||` separators, and A/B weights above are literal
contract bytes; no generic builder may render a different expression. A stable
variadic concatenation helper is forbidden in generated expressions because
its PostgreSQL volatility is not immutable.

### Normalized Solution Kit rollback authority

Owned by `TASK-551-05-L03`; the contract bytes there are authoritative. This
leaf lands the four schema surfaces (`solution_kit_starter_apply_owners`,
`solution_kit_legacy_template_evidence`,
`solution_kit_legacy_rollback_progress`, and the
`solution_kit_install_runs.rollback_of_run_id`/template-plan/proof-column
changes) with their named checks and mandatory index rows in this leaf's one
generated migration triple, exactly as L03 declares them. This leaf stays the
sole schema/migration writer; L03 owns the tests, named-check rows, and
acceptance.

The exact mandatory new btree catalog is:

| Name | Table | Ordered columns | Predicate |
|---|---|---|---|
| `pages_list_updated_id_idx` | `pages` | `updated_at DESC, id DESC` | none |
| `pages_author_list_updated_id_idx` | `pages` | `author_id ASC, updated_at DESC, id DESC` | none |
| `content_entries_list_updated_id_idx` | `content_entries` | `updated_at DESC, id DESC` | none |
| `content_entries_type_list_updated_id_idx` | `content_entries` | `type_id ASC, updated_at DESC, id DESC` | none |
| `content_entries_author_list_updated_id_idx` | `content_entries` | `author_id ASC, updated_at DESC, id DESC` | none |
| `content_entries_type_author_list_updated_id_idx` | `content_entries` | `type_id ASC, author_id ASC, updated_at DESC, id DESC` | none |
| `posts_list_updated_id_idx` | `posts` | `updated_at DESC, id DESC` | none |
| `posts_author_list_updated_id_idx` | `posts` | `author_id ASC, updated_at DESC, id DESC` | none |
| `users_list_created_id_idx` | `users` | `created_at DESC, id DESC` | none |
| `user_roles_role_user_idx` | `user_roles` | `role_id ASC, user_id ASC` | none |
| `forms_list_updated_id_idx` | `forms` | `updated_at DESC, id DESC` | none |
| `form_submissions_form_list_idx` | `form_submissions` | `form_id ASC, created_at DESC, id DESC` | none |
| `media_list_created_id_idx` | `media` | `created_at DESC, id DESC` | none |
| `media_folder_list_created_id_idx` | `media` | `folder_id ASC, created_at DESC, id DESC` | none |
| `booking_resources_name_id_idx` | `booking_resources` | `name ASC, id ASC` | none |
| `booking_services_name_id_idx` | `booking_services` | `name ASC, id ASC` | none |
| `booking_schedules_resource_order_idx` | `booking_schedules` | `resource_id ASC, day_of_week ASC, start_minute ASC, id ASC` | none |
| `booking_blackouts_starts_id_idx` | `booking_blackouts` | `starts_at DESC, id DESC` | none |
| `booking_blackouts_resource_starts_id_idx` | `booking_blackouts` | `resource_id ASC, starts_at DESC, id DESC` | none |
| `bookings_list_starts_id_idx` | `bookings` | `starts_at DESC, id DESC` | none |
| `bookings_resource_list_starts_id_idx` | `bookings` | `resource_id ASC, starts_at DESC, id DESC` | none |
| `bookings_service_list_starts_id_idx` | `bookings` | `service_id ASC, starts_at DESC, id DESC` | none |
| `bookings_status_list_starts_id_idx` | `bookings` | `status ASC, starts_at DESC, id DESC` | none |
| `search_history_user_created_id_idx` | `search_history` | `user_id ASC, created_at DESC, id DESC` | none |
| `access_logs_retention_idx` | `access_logs` | `created_at ASC, id ASC` | none |
| `audit_logs_retention_idx` | `audit_logs` | `created_at ASC, id ASC` | none |
| `email_delivery_logs_retention_idx` | `email_delivery_logs` | `created_at ASC, id ASC` | none |
| `search_history_retention_idx` | `search_history` | `created_at ASC, id ASC` | none |
| `integration_requests_retention_idx` | `integration_requests` | `created_at ASC, id ASC` | none |
| `password_resets_retention_idx` | `password_resets` | `expires_at ASC, id ASC` | none |
| `preview_tokens_retention_idx` | `preview_tokens` | `expires_at ASC, id ASC` | none |
| `post_preview_tokens_retention_idx` | `post_preview_tokens` | `expires_at ASC, id ASC` | none |
| `assistant_ingest_retention_idx` | `assistant_doc_ingest_runs` | `started_at ASC, id ASC` | none |
| `assistant_ingest_source_success_idx` | `assistant_doc_ingest_runs` | `source_root ASC, started_at DESC, id DESC` | `status = 'success'` |
| `assistant_action_executions_retention_idx` | `assistant_action_executions` | `created_at ASC, id ASC` | none |
| `assistant_action_undo_execution_created_idx` | `assistant_action_undo_items` | `execution_id ASC, created_at ASC, id ASC` | none |
| `form_action_runs_submission_created_idx` | `form_action_runs` | `submission_id ASC, created_at ASC, id ASC` | none |
| `form_submissions_retention_idx` | `form_submissions` | `created_at ASC, id ASC` | none |
| `form_action_runs_retention_idx` | `form_action_runs` | `created_at ASC, id ASC` | none |
| `analytics_pageviews_session_created_idx` | `analytics_pageviews` | `session_id ASC, created_at ASC, id ASC` | none |
| `analytics_pageviews_retention_idx` | `analytics_pageviews` | `created_at ASC, id ASC` | none |
| `sessions_user_id_idx` | `sessions` | `user_id ASC` | none |
| `sessions_expired_retention_idx` | `sessions` | `expires_at ASC, id ASC` | `revoked_at IS NULL` |
| `sessions_revoked_retention_idx` | `sessions` | `revoked_at ASC, id ASC` | `revoked_at IS NOT NULL` |
| `analytics_sessions_retention_idx` | `analytics_sessions` | `last_seen_at ASC, id ASC` | none |
| `webhooks_list_created_id_idx` | `webhooks` | `created_at DESC, id DESC` | none |
| `webhook_deliveries_webhook_list_idx` | `webhook_deliveries` | `webhook_id ASC, created_at DESC, id DESC` | none |
| `webhook_deliveries_retry_idx` | `webhook_deliveries` | `status ASC, created_at ASC, id ASC` | `status IN ('pending','failed')` |
| `webhook_deliveries_terminal_retention_idx` | `webhook_deliveries` | `created_at ASC, id ASC` | `status IN ('success','failed')` |
| `solution_kit_runs_retention_idx` | `solution_kit_install_runs` | `created_at ASC, id ASC` | none |
| `solution_kit_runs_anchor_idx` | `solution_kit_install_runs` | `kit_id ASC, created_at DESC, id DESC` | none |
| `page_revisions_page_kind_version_id_idx` | `page_revisions` | `page_id ASC, kind ASC, version DESC, id DESC` | none |
| `page_revisions_retention_idx` | `page_revisions` | `created_at ASC, id ASC` | none |
| `content_revisions_retention_idx` | `content_revisions` | `created_at ASC, id ASC` | none |
| `post_revisions_retention_idx` | `post_revisions` | `created_at ASC, id ASC` | none |
| `widget_template_revisions_retention_idx` | `widget_template_revisions` | `created_at ASC, id ASC` | none |
| `detail_page_revisions_retention_idx` | `detail_page_revisions` | `created_at ASC, id ASC` | none |

The mandatory JSON containment catalog additionally contains exactly these
non-btree members:

| Name | Table | Exact definition | Owning production predicate |
|---|---|---|---|
| `posts_tags_gin_idx` | `posts` | `USING GIN (tags jsonb_path_ops)` | `tags @> :normalizedOneTagArray::jsonb`, where the bound JSON value is exactly one normalized tag in an array |
| `media_tags_gin_idx` | `media` | `USING GIN (tags jsonb_path_ops)` | `tags @> :normalizedUniqueSortedTags::jsonb`, where the bound array contains all requested tags and preserves AND semantics |
| `webhooks_events_gin_idx` | `webhooks` | `USING GIN (events jsonb_path_ops)` | `enabled = true AND events @> :normalizedOneEventArray::jsonb`, where the bound JSON value is exactly one normalized event in an array |

TASK-551-03-L02 must use the tag shapes and TASK-551-03-L03 must use the webhook
event shape exactly; neither owner may spell containment as `jsonb_array_elements`, `?`, `?|`,
`jsonb::text`, leading-wildcard text search, or an expression that cannot use
the declared opclass. Empty tag filters omit the predicate before SQL; request
normalization caps/deduplicates as declared by L03.

The existing primary key on
`booking_service_resources(service_id,resource_id)` already exactly serves its
bounded parent traversal and is asserted rather than duplicated. Legacy
single-column prefixes such as `forms_updated_idx`, created/expiry indexes, and
booking start/name prefixes remain in the migration by default. A legacy index
may be removed only in this same closed catalog when L02 supplies a named
representative observation interval, zero missing query shapes, measured write/
storage benefit, and an exact rollback statement; cumulative or polluted
`idx_scan=0` alone never authorizes removal.

The exact integrity catalog adds unique
`page_revisions_page_version_idx(page_id,version)` and
`widget_template_revisions_template_version_idx(template_id,version)`; preserves
existing `content_revisions_entry_version_idx(entry_id,version)`,
`post_revisions_post_version_idx(post_id,version)`, and
`detail_page_revisions_detail_page_version_idx(detail_page_id,version)`; and adds
`bookings_valid_window_chk CHECK (ends_at > starts_at)` plus
the byte-exact `BOOKING_RESERVATION_EXCLUSION_SQL.definition` shown above. Its
name is `bookings_active_resource_window_excl` and its predicate is exactly
`status IN ('pending', 'confirmed')`. Those five exact current booking status
literals remain `pending|confirmed|cancelled|completed|no_show`; the constraint
blocks only the first two and invents no new enum/state.

The outbox catalog is exactly the columns shown in pseudocode plus unique
`cache_invalidation_outbox_event_key_idx(event_key)`, where event key is 1..128
bytes, and these definitions:

| Name | Exact definition |
|---|---|
| `cache_invalidation_outbox_attempts_chk` | `CHECK (attempts >= 0)` |
| `cache_invalidation_outbox_tags_chk` | `CHECK (jsonb_typeof(tags)='array' AND jsonb_array_length(tags) BETWEEN 1 AND 32)` |
| `cache_invalidation_outbox_event_key_bytes_chk` | `CHECK (octet_length(event_key) BETWEEN 1 AND 128)` |
| `cache_invalidation_outbox_state_chk` | `CHECK ((processed_at IS NULL AND claim_token IS NULL AND claim_until IS NULL) OR (processed_at IS NULL AND claim_token IS NOT NULL AND claim_until IS NOT NULL) OR (processed_at IS NOT NULL AND claim_token IS NULL AND claim_until IS NULL))` |
| `cache_invalidation_outbox_pending_idx` | `(available_at ASC,id ASC) WHERE processed_at IS NULL AND claim_token IS NULL` |
| `cache_invalidation_outbox_expired_claim_idx` | `(claim_until ASC,id ASC) WHERE processed_at IS NULL AND claim_token IS NOT NULL` |
| `cache_invalidation_outbox_processed_idx` | `(processed_at ASC,id ASC) WHERE processed_at IS NOT NULL` |
| `cache_outbox_unprocessed_age_idx` | `(created_at ASC,id ASC) WHERE processed_at IS NULL` |

The task-owned migration-operation table is exactly the pseudocode columns and
named checks `task551_migration_operations_task_chk` (`task_id='TASK-551'`),
`..._generation_chk` (`generation BETWEEN 0 AND 2147483647`),
`..._direction_chk` (closed `forward|reverse`), `..._state_chk` (the exact
version-2 state union), `..._state_sha256_chk` (lowercase 64-hex), and
`..._receipt_version_chk` (`receipt->>'version'='2'`),
`..._receipt_operation_chk` (`receipt->>'operationId'=operation_id::text`), and
`..._receipt_size_chk` (canonical input and stored JSON each at most 65,536
bytes). Runtime/static-migration strict parsing
still rejects unknown JSON keys and requires top-level generation/state/digests
to equal columns. Each transition executes one
`UPDATE ... WHERE operation_id=:id AND generation=:expected AND state_sha256=:expectedDigest`
and requires exactly one returned row; zero rows is
`task551_migration_receipt_conflict`. This table is created/seeded inside forward
phase 2 and removed only by the pre-traffic reverse transaction described above.

`cache_outbox_unprocessed_age_idx` is not interchangeable with the claim index.
It owns the bounded health/recovery statement `WHERE processed_at IS NULL ORDER
BY created_at ASC,id ASC LIMIT 1`, which must see ready, backed-off/future-
`available_at`, live/expired claimed, and unclaimed rows alike. Adding
`claim_token IS NULL`, `available_at <= now`, or claim-expiry filtering to that
oldest-age predicate is a correctness failure because it can report healthy
while an older unprocessed event remains claimed or backed off. TASK-551-08-L02
consumes this schema/query contract read-only.
It is a snapshot-owned member of the online manifest's `read-performance`
group, absent from transactional index DDL, created with top-level `CREATE INDEX
CONCURRENTLY`, and subject to the same receipt/hash/ready/valid/crash-resume and
reverse-drop contract as every other member.

The catalog contains no other TASK-551 index/constraint. A required member that
misses its read/integrity/write-cost gate blocks and amends this contract rather
than disappearing. Each of the five trigram members is the sole conditional
exception: its already-declared exact column/index pair is selected or `null` as
one atomic unit by the frozen receipt.

For each selected trigram source, the migration atomically adds its stored
  generated `search_trigram_text` using `normalizeTask551TrigramSql` around the exact
`sourceSql`, then adds `USING GIN (search_trigram_text gin_trgm_ops)` under the
exact index name above. The query needle uses the byte-identical normalization
literal. Schema definition, SQL, snapshot, catalog, query contract, and L02
receipt must match. Email/email hash is absent from the users source. A rejected
candidate lands neither column nor index and its exported contract member is
`null`; no unindexed trigram fallback is permitted.

All generated-expression functions and operator implementations must be
immutable. `searchVectorMigration.test.ts` resolves every exact signature in
`GENERATED_EXPRESSION_IMMUTABLE_PROC_SIGNATURES` with `to_regprocedure`, joins
`pg_proc`, and requires one row with `provolatile = 'i'` for each. It also uses
`pg_operator.oprcode` and the JSONB-to-text output dependency to prove the
`->>`, text/tsvector `||`, and `jsonb::text` implementations used by the literal
expressions resolve to that same closed immutable set. `coalesce` is a parser
construct rather than a `pg_proc` member and is checked by the exact-expression
guard. A missing, overloaded-to-a-different-signature, stable, or volatile
dependency aborts before migration execution.

The transactional SQL owns the seven stored-vector columns, outbox table/checks,
generated trigram columns selected by evidence, valid-window check, and exact
exported `BOOKING_RESERVATION_EXCLUSION_SQL` seam. After Drizzle generates the
one migration triple, the L01 writer strips every new plain `CREATE [UNIQUE]
INDEX` from that SQL into the closed companion manifest and appends
`BOOKING_RESERVATION_EXCLUSION_SQL.extensionSql` followed by `.addSql` exactly
once inside the transaction. No second journal entry, raw duplicate, plain
index, or check-constraint approximation is allowed. The snapshot continues to
describe all Drizzle indexes while the manifest owns their executable
`CONCURRENTLY` form; parity tests make this deliberate representation split
exhaustive. The installed Drizzle snapshot omits only the unrepresentable GiST
exclusion object. Catalog tests require `pg_constraint.contype = 'x'`, the
exact name/table/predicate, GiST access method, equality/overlap operators, and
`btree_gist` extension.

Before phase 2, the bounded read-only preflight detects duplicate revision
versions, invalid windows, and overlapping pending/confirmed bookings; a real
conflict aborts with counts and a stable migration code and never edits customer
rows. Operator-owned correction is followed by a complete rerun. Clean and
immediately-prior fixtures must both execute phases 1–4 and produce the same
live catalog. A disposable rehearsal executes the exact pre-cutover rollback
and forward reapply, including interruption after every manifest member.
Fresh `db:generate` must be zero-drift, the transactional SQL must contain zero
`CREATE INDEX CONCURRENTLY` and zero new plain index statements, and a guard
fails any generated artifact containing `.dropSql` or a `DROP CONSTRAINT`
targeting `bookings_active_resource_window_excl`. Missing budget evidence,
insufficient disk, excess lag/old transactions, a phase timeout, or a catalog
mismatch blocks deployment; there is no generic future operations choice.

## Testing Requirements

- Capture the current facade/table-module projection and newest committed
  snapshot before source edits; prove zero initial drift. After additions,
  `schemaTableFacade.test.ts`, `schemaColumnTypeContracts.test.ts`, generated
  snapshot, and runtime exports must agree exactly, with no existing declaration
  relocated or hidden.
- Clean and prior-version databases migrate to equivalent catalogs; migration
  rollback/recovery and forward-reapply procedures are exercised on disposable
  fixtures, including exact custom exclusion add/drop SQL and preservation of
  the shared extension. Each fixture runs the one `rollout-forward` orchestrator,
  which resolves, drains, applies, verifies, and only then authorizes resume. A
  second identical invocation performs zero DDL/adapter transition and proves
  final receipt/catalog idempotence.
- Invoke generic `db:migrate`, startup migration, a differently named client,
  direct SQL, a wrong/missing operation GUC, and a folder with another pending
  migration; each fails before the first TASK-551 DDL/catalog change. A real-
  PostgreSQL suite records the identical `pg_backend_pid()` at GUC set, first
  guard, representative DDL, receipt insert, and Drizzle journal insert; it
  covers clean, immediately-prior, replay rejection, pre-traffic reverse, and
  forward reapply. Injected failures after DDL and receipt prove DDL, receipt,
  and journal roll back as one. Valid GUCs on another session cannot authorize
  it; exactly the three canonical custom GUCs exist, and missing/empty/tampered/
  noncanonical/65,537-byte/wrong-operation/application/SHA/key/type/array cases
  fail atomically.
- Against postgres.js 3.4.9 and Drizzle 0.45.2, assert the adapter is callable,
  its immutable `.options` reference is `=== poolClient.options`, Drizzle's exact
  parser/serializer map mutations affect reserved query round trips, `.unsafe`
  keeps `.values()`, and both allowed `.begin` overloads pass that same adapter
  to the callback. Nonempty options and concurrent/nested begin reject before
  SQL. Instrument the pool after `reserve()` and require zero pool callable,
  `.unsafe`, or `.begin` dispatch. Success/known rollback resets and verifies all
  three GUCs on the same PID, releases once, and normally ends once; reset/PID/
  begin/commit/rollback unknown state issues no later SQL or release and hard-
  ends once. A replacement pool observes no leaked GUC. Any faithful-adapter
  failure blocks rollout for the single custom-runner contract amendment; tests
  may not accept a runtime fallback or two selectable paths.
- Small/large boundary fixtures pin every numeric deployment ceiling. Kill the
  deployer after every version-2 CAS, DB/file persistence boundary, adapter
  prepare/resume boundary, first SQL guard, receipt insert, Drizzle journal
  insert, transaction commit, group barrier, and online member;
  reruns resume idempotently, repair only owned invalid residue, and never
  duplicate or silently accept a wrong index. Reverse recovery is likewise
  resumable through receipt-table removal. Kill before commit leaves no DDL,
  receipt, or journal row; rerun applies once. Kill after commit discovers the
  exact DB-authoritative receipt and executes no second migration. Pre-traffic
  reverse and forward reapply bind fresh GUCs and cannot replay the old receipt.
- Adapter tests use executable fake adapters and pin exact argv/no-shell behavior,
  permissions/SHA-256, timeouts/output caps, unknown-key rejection, operation/
  nonce/digest replay rejection, separate runtime/worker counts, duplicate IDs,
  binary compatibility digests, and stderr redaction. Injection strings remain
  one literal argv value and can never execute. Activity tests prove the two
  visibility probes are observed, unknown/blank/surprise same-role sessions fail,
  and five seconds of uninterrupted quiescence is required.
- Fleet tests import L01's parser and require exact equality across budget,
  identity, adapter arrays and receipt. One runtime/zero worker is the only
  offline-single fleet; an extra/omitted worker, underdeclared array, legacy
  count key, or migration reserve below three fails before adapter invocation.
- Prioritization tests consume the named clean interval without resetting it,
  accept only application-class deltas, and reject changed reset/server identity
  or an external-diagnostic/unknown-only candidate. The five sanitized polluted
  diagnostic IDs produce no index proposal; a new clean interval is mandatory.
- The online manifest has exact one-to-one parity with all new snapshot-owned
  indexes. Its statements are sequential top-level `CREATE [UNIQUE] INDEX
  CONCURRENTLY`; the transactional migration contains none. Its immutable first
  group/order is the two new revision unique indexes
  (`page_revisions_page_version_idx`,
  `widget_template_revisions_template_version_idx`); the already-committed
  `content_revisions_entry_version_idx` is a preserved catalog member asserted
  byte-identical, never a manifest build. During that first group,
  16 synchronized page/content/widget admission probes are rejected before SQL
  and the old application remains drained. External resume then requires the
  durable barrier and reviewed compatible-binary/revision-writer receipt; the
  read-performance group runs with 16 real writers and the 20% gate. Offline-
  single stays drained through both groups. Crash injection before/after each
  group and resume receipt proves no old/early-binary window.
- Catalog tests pin exact index column order, sort/null order, predicates,
  opclasses, constraint names/definitions, generated search expressions, and
  extensions. They explicitly pin all page/entry/post author composites,
  role-leading `user_roles_role_user_idx`, webhook traversal indexes, and all
  three `jsonb_path_ops` containment indexes against their L03 parameterized
  `@>` predicate bytes.
- Solution Kit authority tests are owned, run, and commanded by TASK-551-05-L03
  (its Testing Requirements and Validation Commands carry the exact suite
  command) and pin all three normalized tables, every FK/check/default/
  nullability rule, proof columns, active-owner and one-running-rollback unique
  partial indexes, plus the two successful relation indexes and all-runs history
  index. This leaf defers to L03 after its migration lands.
- Vector tests pin byte identity across the schema definition, generated-column
  DDL, migration SQL, snapshot, GIN index target, and the generated columns
  consumed by 04. Before PostgreSQL parsing, schema render, migration literal,
  and query-normalizer render are compared byte-for-byte with no whitespace
  canonicalization; live `pg_get_expr` is an additional catalog-semantic check.
- Trigram tests pin all five source concatenations, the byte-identical
  normalization literal, `search_trigram_text` columns, exact index names,
  `gin_trgm_ops`, selected-or-null export, and atomic column/index presence.
- The volatility test resolves the closed function/operator dependency list in
  `pg_proc` and rejects anything except `provolatile = 'i'`; source guards
  reject any variadic stable concatenation helper or expression not built from
  the literal `coalesce(...) || ' ' || ...` bytes above.
- The exclusion seam test proves the descriptor is deeply immutable and exported,
  the migration contains `.extensionSql` and `.addSql` exactly once, the
  generated snapshot intentionally has no fake exclusion representation, the
  live `pg_constraint` object matches the descriptor, and a fresh generation/
  drift pass emits neither a second add nor `.dropSql`.
- Outbox tests pin strict columns, unique event key, non-negative attempts,
  claim/processed state checks, pending/claim/processed cutoff indexes, and the
  exact oldest-unprocessed partial index. Seed 1,000/100,000 synthetic outbox
  rows with 25% each ready-unclaimed, backed-off-unclaimed, claimed, and
  processed; make the two oldest unprocessed rows respectively claimed and
  backed off. `WHERE processed_at IS NULL ORDER BY created_at,id LIMIT 1` must
  still return the oldest claimed row, while mutations adding availability or
  claim predicates fail. The large sanitized plan uses
  `cache_outbox_unprocessed_age_idx` with bounded rows/buffers.
- Seed duplicate revision/overlap fixtures before constraint creation and prove
  the migration reports bounded counts and aborts deterministically without any
  deletion or rewrite. Only the operator remediates customer rows before rerun.
- `task551ConcurrencyConstraints.test.ts` alone starts 50 synchronized,
  scope-unique raw inserts for each page/entry/post/widget/detail-page revision
  uniqueness family, 50 overlapping/non-overlapping booking attempts, and the
  transferred raw authority-race probe. It releases barriers in `finally`,
  asserts only invariant-compatible commits and exact constraint/error outcomes,
  performs child-first scope-local cleanup, and emits only strict redacted
  `Task551L05ConcurrencyReceiptV1` counts/booleans/digest. L05-L02 may consume
  that receipt only; L05-L03 still owns its separate authority-contract/state-
  matrix suite and neither leaf writes this fixture.
- Write benchmark covers inserts/updates at representative scale and fails above
  20% p95 regression or the L01 storage budget. It reports the incremental
  storage/write cost of the page/entry/typed-entry/post-author, role-leading,
  post/media tag, and webhook list/event indexes separately rather than hiding
  them in an aggregate. It also reports `cache_outbox_unprocessed_age_idx`
  storage and insert, claim/retry, completion-update p95 deltas separately; each
  must stay within the same 20% representative-write ceiling.

## Security Contract

- Database schema/migration only; no endpoint, auth, RBAC, CSRF, rate-limit,
  nonce/HMAC, or CAPTCHA changes.
- Constraints reinforce authorization-independent data integrity but do not
  replace route/service permission checks.
- Migration diagnostics include counts/IDs only when synthetic; production
  guidance must never emit customer fields, binds, tokens, hashes, or secrets.
- The task receipt contains only repository-relative artifact paths, digests,
  fixed catalog identifiers, numeric budgets, and completion state; no
  connection URL, credentials, SQL binds, customer rows, or environment dump.
- Session GUCs carry only the same bounded canonical receipt, operation UUID and
  SHA-256. They are parameterized, session-local, cleared before release, never
  logged, and never used as an authorization secret.
- Adapter execution is local `execFile` with a pinned absolute executable and
  fixed argv. Receipt output stores only validated IDs, nonces/digests, counts,
  booleans, timestamps, and state—not stderr, raw environment, command strings,
  database URLs, credentials, or application logs.

## Validation Commands

- `bun test tests/unit/db/schemaTableFacade.test.ts tests/unit/db/schemaColumnTypeContracts.test.ts`
- `bunx vitest run tests/vitest/db/searchVectorDefinitions.test.ts`
- `set -a && source .env && set +a && bun run db:generate`
- `set -a && source .env && set +a && bun test tests/integration/server/task551SchemaMigrationParity.test.ts tests/integration/server/task551SearchVectorMigration.test.ts tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts tests/integration/server/task551IndexAndConstraintCatalog.test.ts tests/integration/server/task551ConcurrencyConstraints.test.ts tests/integration/server/task551OnlineIndexDeployment.test.ts tests/perf/database-index-write-overhead.test.ts`
- With the disposable validation DB and release compatibility digests configured: `set -a && source .env && set +a && TASK551_OFFLINE_SINGLE_ACK=all-coderso-processes-stopped bun scripts/task-551-online-indexes.ts rollout-forward --receipt .tmp/task551-migration-receipt.json --admission-mode offline-single`
- Repeat the exact `rollout-forward` command (mandatory idempotent zero-DDL/zero-transition final catalog rerun)
- `set -a && source .env && set +a && bun scripts/task-551-online-indexes.ts status --receipt .tmp/task551-migration-receipt.json`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `git diff --check`

## Documentation Updates Required

No shared docs. Supply the table-module/facade map, exact DDL, phased rollout/rollback,
storage, and write-cost evidence to TASK-551-10-L02.

## Quantified Acceptance

- Pre-existing public schema exports and non-TASK-551 catalog definitions have
  100% parity through the existing facade. Every touched existing/new table,
  pure definition, production tool, and test file is at most 1,000 lines; no
  second `core/db/schema/**` tree exists.
- Seven local generated-vector definitions have byte-identical schema/DDL/
  migration/snapshot/index coverage; every called PostgreSQL function/operator
  is catalog-proven immutable and no definition references another table.
- Every selected trigram candidate has byte-identical schema/DDL/snapshot/query
  normalization and its exact GIN/`gin_trgm_ops` index; rejected candidates have
  neither a column/index nor an enabled fallback contract.
- The outbox table is available through `core/db/schema.ts` with 100% catalog
  parity to its strict state and index contract before TASK-551-08 starts,
  including the ready/claim/processed indexes and exact partial
  `cache_outbox_unprocessed_age_idx` for all `processed_at IS NULL` ages.
- Every new index/constraint has one inventory owner and evidence record; no
  speculative or duplicate-prefix index lands.
- Normalized Solution Kit owner/template-evidence/progress/proof authority and
  every named TASK-489 index/FK/check are migration/snapshot/catalog-identical.
  Tests reject source/package/actor mismatch, progress linked to another rollback
  or evidence row, proof/status mismatch, duplicate evidence identity, deletion
  that would orphan a rollback relation, and duplicate running owners; active/
  retry decisions require zero JSON predicate. The full authority acceptance
  contract is owned by TASK-551-05-L03.
- Clean/prior migrations both pass, generated artifacts are complete, and a
  fresh `db:generate` produces no unexplained drift. The one documented
  snapshot limitation is protected by the exact exported exclusion descriptor,
  migration containment, live-catalog parity, rollback/forward rehearsal, and
  a zero-drop generation guard.
- All new snapshot-owned indexes are created only by the non-transactional
  companion and finish ready/valid within the 30-minute/member and 2-hour phase
  ceilings. Crash/resume and reverse rollback receipts are idempotent. External
  admission waits for the revision-integrity barrier plus compatible-binary gate;
  offline-single admission waits for the complete exact catalog gate. The old
  `max(version)+1` page/widget-template writers remain drained through the
  revision-integrity group and are never resumed; no crash point admits external
  traffic before its
  durable barrier plus compatible TASK-551 binary/revision-writer receipt, and
  the first acknowledged new-binary traffic irreversibly selects forward-fix.
- The installed migrator executes the transactional artifact on exactly one
  reserved backend with strict operation/receipt/SHA/application-name GUC
  validation. DDL, receipt row and Drizzle journal commit atomically; every
  missing/tampered/different-session/oversized/replay/crash/rerun/reverse case
  has the fail-closed outcome specified above and no GUC leaks to pool reuse.
- Write p95 regression is at most 20%; duplicate versions and overlapping active
  bookings are rejected in 100% of race fixtures.

## Workflow Dispatch Envelope

`artifactPolicy` makes the runtime-allocated migration surface closed without
inventing a number, path, or glob: before a write, the trusted L05 resolver
returns the verified per-run migration/snapshot/journal set and required same-ID
companion. The migration profile supplies the offline-admission acknowledgement
only through its owner capability; it is deliberately absent from argv and
overrides. The static closed `allowlist` covers every other owned path.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "artifactPolicy": "task551-drizzle-migration-triple",
  "taskId": "TASK-551-05-L01",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-05"
  },
  "allowlist": [
    "core/db/schema.ts",
    "core/db/tables/analytics.ts",
    "core/db/tables/assistant.ts",
    "core/db/tables/bookings.ts",
    "core/db/tables/content.ts",
    "core/db/tables/forms.ts",
    "core/db/tables/identity.ts",
    "core/db/tables/integrations.ts",
    "core/db/tables/media.ts",
    "core/db/tables/observability.ts",
    "core/db/tables/operations.ts",
    "core/db/tables/pages.ts",
    "core/db/tables/platform.ts",
    "core/db/tables/posts.ts",
    "core/db/tables/widgets.ts",
    "core/db/tables/cacheInvalidationOutbox.ts",
    "core/db/tables/solutionKitRollbackAuthority.ts",
    "core/db/tables/task551MigrationOperations.ts",
    "core/db/searchVectorDefinitions.ts",
    "core/db/bookingReservationExclusion.ts",
    "scripts/task-551-online-indexes.ts",
    "scripts/task-551-online-indexes-catalog.ts",
    "scripts/task-551-online-indexes-rollout.ts",
    "tests/perf/fixtures/task551OnlineIndexManifest.ts",
    "tests/unit/db/schemaTableFacade.test.ts",
    "tests/unit/db/schemaColumnTypeContracts.test.ts",
    "tests/vitest/db/searchVectorDefinitions.test.ts",
    "tests/integration/server/task551SchemaMigrationParity.test.ts",
    "tests/integration/server/task551SearchVectorMigration.test.ts",
    "tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts",
    "tests/integration/server/task551IndexAndConstraintCatalog.test.ts",
    "tests/integration/server/task551ConcurrencyConstraints.test.ts",
    "tests/integration/server/task551OnlineIndexDeployment.test.ts",
    "tests/integration/server/task551OnlineIndexDeployment-catalog.test.ts",
    "tests/integration/server/task551OnlineIndexDeployment-rollout.test.ts",
    "tests/perf/database-index-write-overhead.test.ts"
  ],
  "forbiddenPaths": [
    "core/db/client.ts",
    "core/services/cache/serverCacheContracts.ts",
    "core/services/cache/serverCacheRuntime.ts",
    "core/services/content/entryService.ts",
    "core/server/routes/index.ts",
    "core/server/publicSite.tsx",
    "tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts",
    "_docs/_TASKS/TASK-551_Scalable_Database_Query_And_Cache_Optimization.md",
    "_docs/_TASKS/README.md",
    "_docs/_CHANGELOG/README.md",
    "_docs/_workflows/task-551-implement.mjs"
  ],
  "dependencies": ["TASK-551-08-L03:initial"],
  "commands": [
    {
      "id": "schema-facade-unit-tests",
      "lane": "bun-test",
      "argv": ["bun", "test", "tests/unit/db/schemaTableFacade.test.ts", "tests/unit/db/schemaColumnTypeContracts.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/unit/db/schemaTableFacade.test.ts", "tests/unit/db/schemaColumnTypeContracts.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "search-vector-vitest",
      "lane": "vitest",
      "argv": ["bunx", "vitest", "run", "tests/vitest/db/searchVectorDefinitions.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/db/searchVectorDefinitions.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "db-generate",
      "lane": "tooling",
      "argv": ["bun", "--env-file=/dev/null", "run", "db:generate"],
      "environmentProfile": "task551-db-migration-test",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "migration-and-index-tests",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/server/task551SchemaMigrationParity.test.ts", "tests/integration/server/task551SearchVectorMigration.test.ts", "tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts", "tests/integration/server/task551IndexAndConstraintCatalog.test.ts", "tests/integration/server/task551ConcurrencyConstraints.test.ts", "tests/integration/server/task551OnlineIndexDeployment.test.ts", "tests/perf/database-index-write-overhead.test.ts"],
      "environmentProfile": "task551-db-migration-test",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/server/task551SchemaMigrationParity.test.ts", "tests/integration/server/task551SearchVectorMigration.test.ts", "tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts", "tests/integration/server/task551IndexAndConstraintCatalog.test.ts", "tests/integration/server/task551ConcurrencyConstraints.test.ts", "tests/integration/server/task551OnlineIndexDeployment.test.ts", "tests/perf/database-index-write-overhead.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "rollout-forward",
      "lane": "cli",
      "argv": ["bun", "--env-file=/dev/null", "scripts/task-551-online-indexes.ts", "rollout-forward", "--receipt", ".tmp/task551-migration-receipt.json", "--admission-mode", "offline-single"],
      "environmentProfile": "task551-db-migration-test",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "rollout-forward-idempotence",
      "lane": "cli",
      "argv": ["bun", "--env-file=/dev/null", "scripts/task-551-online-indexes.ts", "rollout-forward", "--receipt", ".tmp/task551-migration-receipt.json", "--admission-mode", "offline-single"],
      "environmentProfile": "task551-db-migration-test",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "rollout-status",
      "lane": "cli",
      "argv": ["bun", "--env-file=/dev/null", "scripts/task-551-online-indexes.ts", "status", "--receipt", ".tmp/task551-migration-receipt.json"],
      "environmentProfile": "task551-db-migration-test",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint-types",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "diff-check",
      "lane": "tooling",
      "argv": ["git", "diff", "--check"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "single",
      "dependsOn": ["TASK-551-08-L03:initial"],
      "commandIds": ["schema-facade-unit-tests", "search-vector-vitest", "db-generate", "migration-and-index-tests", "rollout-forward", "rollout-forward-idempotence", "rollout-status", "core-lint-types", "core-lint", "diff-check"]
    }
  ]
}
```

## Contract correction (2026-09-04, downstream select-shape ripple)

Reason. The L01 contract mandates the seven `search_vector` columns and five
`search_trigram_text` columns on `pages`/`content_entries`/`posts`/`media`/`users`/
`assistant_docs`/`assistant_doc_chunks`, and mandates `core-lint-types` green at
admission. Those two mandates interact through drizzle-orm's row types in a way
this contract did not state: with the installed drizzle-orm 0.45.2
(`node_modules/drizzle-orm`), `InferSelectModel` (i.e. `users.$inferSelect`) maps
over every declared column key with no generated-column filter
(`node_modules/drizzle-orm/table.d.ts`, `InferModelFromColumns` `select` branch,
keyed by `MapColumnName` over `TTable['_']['columns']`), while generated columns
are excluded from `$inferInsert` only (`operations.d.ts` `OptionalKeyOnly`
returns `never` for any column whose `_: { generated }` is set). `.generatedAlwaysAs(...)`
without `.notNull()` therefore changes only the select value type to `| null`;
the KEY is still required in every select-typed row. Byte-verified against the
installed 0.45.2 type sources and against the resulting compiler output:
root `bunx tsc -p tsconfig.json --noEmit` reports exactly 10 errors, and
`bun --cwd core lint:types` reports exactly 1, all of them the form TS2739/TS2322
"missing searchVector, searchTrigramText" at select-typed full-row literals.

Resolution. The seven `search_vector` and five `search_trigram_text` columns are
part of each owning table's select shape. The exact consuming sites below gain
the missing keys in their select-typed full-row literals with value `null`: the
columns are DB-computed `GENERATED ALWAYS AS ... STORED`, so they carry no
backup-artifact or fixture semantics and `null` is the only honest value a
fixture/restore literal can name. The contract's own `USER_KEYS`/artifact
allowlist and the generated-column fixture bytes elsewhere are untouched.

Exact edits authorized (10 compiler error sites, collapsing to 5 literals):

- `core/services/backups/backupUsersSection.ts:113` — the `normalizeUserRow`
  returned users restore-row literal (1 root error; also the single `core`
  lint:types error). `stagedUserRow` (:320) copies explicit fields only, so the
  added keys cannot leak into restore inserts.
- `tests/integration/routes/auth.test.ts:422`, `:427`, `:453`, `:458`, `:483`,
  `:488` — six errors that all flow from the one `loginUserStub` users
  select-row literal (:317), which gains the two keys once.
- `tests/integration/routes/adminUsers.test.ts:60` — the `makeUserRecord`
  users select-row literal.
- `tests/unit/commerce/commerceRuntimeResolver.test.ts:48`, `:104` — the two
  `readMedia` media select-row literals.

Scope note. These minimal literal edits are 05-L01 writer surface for the
`single` occurrence ONLY. Full ownership of each listed file stays with its
owning occurrence: no reformatting, no renamed identifiers, no other line of
those files may change, and no producer of these rows outside the files above is
authorized by this correction. If a listed site turns out to be insert-typed
rather than select-typed, it is left untouched and reported.

## Dated Contract Corrections — 2026-09-26 (re-open note: manifest index rendering and worker-schema online indexes)

**Authority and scope.** This append-only note implements orchestrator
decision **D8** of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`
(with **D6 (i)**, **D6 (ii)** and **D9** of the same file cited, not
re-decided). It answers the TASK-551-01-L01 v5 items that name this leaf: the
**V5-6** rendering rows and owner item **V5-5 (a)** (`TASK-551-01-L01…md`,
Amendment v5, `:3647-3720` at HEAD `66203e22`). It is text only. This round
edits no source, test, migration or fence byte. The dispatch envelope above is
unchanged: both suites and the manifest are already in the `allowlist`
(`:1054`, `:1058`, `:1061`), and the follow-on items below land as writer
surface of the `single` occurrence. `**Status:**` is unchanged.

### Verified facts (read from source at `66203e22`; nothing executed)

- **F1 — rendering.** The manifest stores quoted, unqualified bytes, for
  example `tests/perf/fixtures/task551OnlineIndexManifest.ts:43`:
  `CREATE UNIQUE INDEX CONCURRENTLY "page_revisions_page_version_idx" ON "page_revisions" USING btree ("page_id","version")`.
  Both live legs compare `pg_get_indexdef` byte-for-byte with that text minus
  ` CONCURRENTLY`: `tests/integration/server/task551IndexAndConstraintCatalog.test.ts:165-175`
  (strip `:166`, compare `:173`) and
  `tests/integration/server/task551SchemaMigrationParity.test.ts:331-340`
  (helper `:106-107`, compare `:338`). PostgreSQL renders unquoted identifiers,
  `ON <schema>.<table>` and `(a, b)`, as the preserved-member pin at catalog
  `:184` shows:
  `CREATE INDEX content_revisions_entry_version_idx ON public.content_revisions USING btree (entry_id, version)`.
  The gap is wider than quoting and qualification. The two server renderings
  pinned in `tests/integration/server/task551OnlineIndexDeployment.test.ts:570-575`
  also show upper-case `DESC` (27 members carry `" desc` keys), parenthesised
  predicates with literal casts (`WHERE (status = 'success'::text)`; 13 members
  are partial) and `IN (...)` rewritten as `= ANY (ARRAY[...])` (2 members). A
  rule that only unquotes identifiers and qualifies the relation therefore
  still fails for at least 27 of the 89 members.
- **F2 — result shape.** `db` is drizzle over postgres-js
  (`core/db/client.ts:18`, `:91`). `db.execute` resolves to the postgres.js
  `Result` array itself (`node_modules/drizzle-orm/pg-core/db.js:273-287`,
  `node_modules/drizzle-orm/postgres-js/session.js:31-34`,
  `node_modules/postgres/src/result.js:1-15`), which has no `rows` property.
  Every DB leg of the two blocked suites reads
  `(result as unknown as { rows: … }).rows` (catalog `:171`, `:181`, `:206`,
  `:222`, `:226`, `:235`; parity `:336`), gets `undefined`, and fails before
  any comparison. The repository convention is `Array.isArray(result)`
  (`tests/utils/db.ts:19`, `core/services/maintenance/partitionReadinessService.ts:344`).
  Fixing F1 alone cannot clear either **V5-6** row.
- **F3 — the canonical form already exists.** This leaf's rollout tool exports
  `canonicalIndexShape(definition): IndexShape`
  (`scripts/task-551-online-indexes.ts:1221-1268`; shape `:298-306`). It parses
  either the manifest bytes or `pg_get_indexdef` text into
  `{ unique, name, schema, table, method, columns, predicate }`: identifiers
  unquoted and upper-cased, `::casts` and comments dropped, `IN` lists
  rewritten to the `ANY (ARRAY[...])` form, AND/OR flattened and sorted
  (`:1027-1028`, `:1143-1162`, `:1201-1219`). It is the rollout member gate
  (`assertMemberDefinition`, `:1273-1291`). Importing the module performs no
  I/O (header `:1`, `import.meta.main` guard `:2952`). The deployment suite
  already proves it for all 89 members against generated server renderings
  (`task551OnlineIndexDeployment.test.ts:566-601`). One detail matters: an
  unqualified definition parses with `schema: "public"` (`:1242`).
- **F4 — worker schemas.** The lane runner provisions `bun_worker_0..K-1`
  before each run by dropping and re-migrating them
  (`scripts/run-bun-parallel.ts:271`; `scripts/bun-lane-provision.ts:54`,
  `:74`). `scripts/bun-lane-migrate.ts:9-10` applies only `_journal.json`
  entries. The journal holds the transactional
  `0081_task551_search_indexes_constraints_outbox` (`meta/_journal.json:562`)
  and never the companion. A worker session's `search_path` is only
  `bun_worker_<i>` (`scripts/bun-lane-worker-url.ts:63-65`). No TASK-551 fence
  `allowlist` contains `scripts/bun-lane-migrate.ts` or
  `scripts/bun-lane-provision.ts` (a fence scan of all 41 files found 0). This
  leaf names `rollout-forward` as the only executor of the companion and
  forbids direct SQL (`:115-122`). The 89 members on `coderso02` exist only as
  orchestrator environment provisioning (06-L02 **G3**,
  `TASK-551-06-L02…md:1233-1246`).

### R1 — Owned follow-on: live-catalog rendering fix (D8; clears the two V5-6 rows)

**Decision.** Compare on a canonical form, and use this leaf's own
`canonicalIndexShape` (F3) as the canonicalizer. The session schema comes from
`current_schema()`. The alternative, rendering `createSql` schema-qualified,
is rejected for three reasons:

- `createSql` is the executable byte truth. The companion must be byte-identical
  to it (parity suite), and G3 pinned its SHA-256.
- A literal `public.` would bind the rollout to one schema.
- F1 shows qualification alone still misses `DESC`, predicate and `ANY`
  rendering.

A second, test-local string normalizer is rejected as a DRY violation of the
rollout member gate.

**Test change (both suites; test files only).**

1. Add a local `rowsOf<T>(result: unknown): T[]`. It returns the array and
   throws `catalog_result_not_array` otherwise, so there is no `.rows`
   fallback. Every DB leg of both files reads through it (F2 sites).
2. Add a local `sessionSchema()`: `select current_schema() as schema`. A null
   or empty value throws `catalog_session_schema_missing`, which is a failure
   and never a skip.
3. Qualify every catalog lookup by the session schema. This delivers the
   01-L01 **V4-3a** handoffs for these two files in the same edit:
   `c.relnamespace = current_schema()::regnamespace` for `pg_class` (catalog
   `:169`, `:179`, `:198-200`; parity `:334`) and
   `connamespace = current_schema()::regnamespace` for `pg_constraint`
   (catalog `:224`, `:231-233`). The `pg_extension` lookup (`:220`) stays
   database-wide.
4. The online-index leg (catalog `:165-175`, parity `:331-340`) runs ONE
   bounded read:
   `select c.relname as name, pg_get_indexdef(c.oid) as indexdef from pg_class c where c.relkind = 'i' and c.relnamespace = current_schema()::regnamespace and c.relname = any(<the 89 manifest names>)`.
   Outside a worker schema (R2), the name set must equal the manifest set
   exactly. For each member,
   `expect(canonicalIndexShape(live.indexdef), member.name).toEqual({ ...canonicalIndexShape(member.createSql), schema })`.
   The `schema` override is the session schema, because PostgreSQL resolves
   the unqualified manifest relation through the first `search_path` entry.
   Casts are outside the live leg, as in the rollout gate. Column types stay
   pinned by `schemaColumnTypeContracts.test.ts` and by the static snapshot
   legs, which keep exact predicate bytes.
5. The preserved-member leg (catalog `:177-186`) keeps a byte pin. The expected
   text is `CREATE INDEX content_revisions_entry_version_idx ON ${q}.content_revisions USING btree (entry_id, version)`,
   where `q` is `select quote_ident(current_schema())`. In `public` this is
   byte-identical to today's `:184`. The index is journaled
   (`core/db/migrations/0076_content_revisions_version_uniq.sql`), so it exists
   in every schema.
6. Rewrite the docblocks that promise raw equality (catalog `:26`, parity
   `:41-42`, `:101-105`) to say "equals its manifest bytes in canonical shape".
   Delete the helpers `transactional` (`:166`) and `transactionalDefinition`
   (`:106-107`) once they have no callers. Test files cannot import each other
   without registering the other file's tests, and no helper file is in the
   `allowlist`, so the roughly 20 shared lines are duplicated per file. Both
   files stay far below 1,000 lines (240 and 340 today).

```ts
// Shape only; names are binding, formatting is prettier's.
import { canonicalIndexShape } from "../../../scripts/task-551-online-indexes";
const LANE_WORKER_SCHEMA = /^bun_worker_[0-9]+$/;
const rowsOf = <T>(result: unknown): T[] => {
  if (!Array.isArray(result)) throw new Error("catalog_result_not_array");
  return result as T[];
};
testIfDb("every member's catalog definition equals its manifest bytes in canonical shape", async () => {
  const schema = await sessionSchema();
  const live = rowsOf<{ name: string; indexdef: string }>(await db.execute(sql`…one bounded read (item 4)…`));
  if (LANE_WORKER_SCHEMA.test(schema)) {
    expect(live).toEqual([]); // R2: the unjournaled companion is never in a worker schema
    return;
  }
  expect(live.map((row) => row.name).sort()).toEqual(TASK551_ONLINE_INDEX_MEMBERS.map((m) => m.name).sort());
  for (const member of TASK551_ONLINE_INDEX_MEMBERS) {
    const row = live.find((entry) => entry.name === member.name)!;
    expect(canonicalIndexShape(row.indexdef), member.name).toEqual({ ...canonicalIndexShape(member.createSql), schema });
  }
});
```

**Gates for the R1 edit (implementer, fast).** Run
`./node_modules/.bin/eslint --max-warnings=0` on both files. Run the DB-free
proof
`env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test <both files>`:
the static legs pass and the DB legs skip. Run `wc -l` and `git diff --check`.
The DB proof is the orchestrator's 01-L01 **V5-1** part-1 run under
`M-ambient` on `coderso02`, serialized per **D9**.

### R2 — Online indexes in worker schemas (D8 with D6 (ii); answers 01-L01 V5-5 (a))

**Decision.** The 89 online indexes do NOT have to exist in lane worker
schemas for these two suites. Nobody replays them there: no provisioning code,
and no orchestrator step between provisioning and the run. This takes the
**V5-5 (a)** option "name those legs lane-incompatible", but as a pinned
invariant rather than a skip. When `current_schema()` matches
`^bun_worker_[0-9]+$`, the online-index leg asserts that zero manifest members
exist in the session schema. In every other schema it runs the full R1
comparison, and a missing member fails.

Why:

- Worker schemas are dropped and re-migrated from the journal on every run
  (**D6 (ii)**, F4).
- A replay would need either an unowned provisioning edit (no fence owns
  `scripts/bun-lane-*.ts`) or a per-run orchestrator step. A per-run step
  would leave every ordinary local `bun run test` red.
- A replay would also bypass the only-executor rule (`:115-122`).
- In a worker session `gin_trgm_ops` is not on the `search_path` (F4), so even
  a replay would render opclasses differently.

The branch is selected by schema name, never by index presence, so a
provisioned schema with a missing member still fails. If a later change
journals the companion or replays it into workers, the worker branch fails
loudly, which forces this decision to re-open. That is intended. Every other
leg of the two suites (preserved member, exclusion, `btree_gist`, unique
constraints, and all static legs) runs unchanged in worker schemas, because
0076 and the transactional 0081 are journaled.

**Consequence for the 01-L01 initial regeneration (V5-5 (a), V5-6, V5-9).**

- Nothing in the initial regeneration waits on **V5-5 (a)**: R2 needs no
  environment provisioning. It waits only on R1 landing plus the two part-1
  rows.
- Both suites stay class B with map `M-ambient`, because the branch reads
  `current_schema()` and no environment key. The 01-L01 **V5-2** tables need no
  edit.
- **V5-4** check 1 (0 worker schemas on `coderso02`) keeps part 1 in `public`,
  where the full R1 branch runs. **V5-4** check 3 stays mandatory: those 89
  members come only from G3, and a missing or invalid member is an environment
  STOP, not a suite verdict.
- The map-free run keeps DB legs skipped (connect probe), as before.
- The worker branch first executes in the 01-L01 FINAL lane-runner run on the
  **D6 (ii)** target. It closes **V5-5 (a)** there; it is not an initial
  precondition.
- Prediction from source, not a receipt: after R1 and R2 land, neither suite is
  part of the **D6 (i)** interim lane red set.

### R3 — Owner-item home for D6 (i) (`task551SearchVectorMigration`)

**D6 (i)** keeps `tests/integration/server/task551SearchVectorMigration.test.ts`
a BLOCKED row with an owner item for this leaf until it is schema-qualified.
The item is:

- qualify `:204-207` with `c.relnamespace = current_schema()::regnamespace`;
- read `:209`, `:221`, `:238` and `:247` through the same `rowsOf` (F2
  applies; without it the row cannot clear).

The `to_regprocedure`/`to_regoperator` lookups stay unqualified (01-L01
**V4-3a**, `:216-245`). The R1 gates and part-1 clearing rule apply.

### Handoff rows consumed by the 01-L01 initial regeneration (V5-6, V5-8 `handoffs[]`)

| Handoff reason (01-L01 receipt) | Delivered by | Clears when | Consumed at |
| --- | --- | --- | --- |
| `catalog-indexdef-rendering:tests/integration/server/task551IndexAndConstraintCatalog.test.ts` | R1 | the R1 edit has landed and the suite's **V5-1** part-1 row under `M-ambient` is `pass` with 0 failed and 0 skipped tests, after green **V5-4** checks | initial, **V5-9** step 6 |
| `catalog-indexdef-rendering:tests/integration/server/task551SchemaMigrationParity.test.ts` | R1 | same | initial, **V5-9** step 6 |
| `catalog-schema-qualification:` plus each of the two paths above (**V4-3a**) | R1 item 3 (same edit) | same edit | recorded as delivered; owner item, not a precondition (**V5-6** decision 4) |
| `catalog-schema-qualification:tests/integration/server/task551SearchVectorMigration.test.ts` (**D6 (i)** BLOCKED row) | R3 | the R3 edit has landed and its part-1 row is `pass` | initial, **V5-9** step 6 |
| **V5-5 (a)** owner item (online indexes in worker schemas) | R2 (decided here; lands with the R1 edit) | the worker branch passes in the FINAL lane-runner run | FINAL only (**V5-5**); not an initial precondition |

Land order: R1, R2 and R3 are one 05-L01 test-only edit to these three test
files (the manifest is read, not changed). It lands before 01-L01 initial
**V5-9** step 4. It reopens no product, migration or rollout contract.

### Observations for orchestrator disposition (not decided here)

- **O1 (F2 elsewhere).** The same `.rows` read occurs in 05-L01 suites outside
  **D8**: `task551CacheInvalidationOutboxSchema.test.ts:248`, `:274` and
  `tests/perf/database-index-write-overhead.test.ts:151` (there `.rows[0]`
  throws a `TypeError`). From source, their part-1 rows fail and join
  **V5-6** by its growth rule. Proposal: fold the same `rowsOf` change into the
  R1 edit.
- **O2 (line gate).** Two files this leaf owns exceed the 1,000-line gate at
  this tree: `scripts/task-551-online-indexes.ts` (2,959 lines) and
  `tests/integration/server/task551OnlineIndexDeployment.test.ts` (3,513
  lines). R1 imports the script read-only and does not touch either file. They
  still block this leaf's closure under the root file-size rule.

### Superseded sentences

None. No earlier sentence of this file is contradicted. The following stay
binding, refined as stated:

- `:862-864`: "the already-committed
  `content_revisions_entry_version_idx` is a preserved catalog member asserted
  byte-identical, never a manifest build." This is refined by R1 item 5: the
  pin is byte-identical with the schema taken from `current_schema()`, and
  identical to the old literal in `public`.
- `:871-872`: "Catalog tests pin exact index column order, sort/null order,
  predicates, opclasses, …". This is refined by R1 item 4: exact bytes stay in
  the static snapshot legs, and the live legs pin the canonical shape.

## Dated Contract Corrections — 2026-09-26 (second note: catalog legs, UNIQUE member, SearchVector deparse, five-file edit)

**Authority and scope.** This append-only note implements orchestrator
decisions **B4** and **C6** of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`
in full. It also cites **A4**, **A5**, **B1**, **C1**, **C3 (b)** and **C7**
and does not re-decide them. It corrects the re-open note directly above
(`:1223-1485`, "the first note"). The corrections come from two read-only
audits of the first note, and every anchor below was re-read from source at
HEAD `420bb24a` (nothing executed). It is text only: this round edits no
source, test, migration or fence byte. The dispatch envelope is unchanged,
and every file named below is already in this leaf's `allowlist`
(`:1053`, `:1058`-`:1064`). `**Status:**` is unchanged (`⏳ To Do`).
Everything in the first note that is not quoted under "Superseded sentences"
stays binding.

### Verified facts (read from source at `420bb24a`)

- **G1 — the preserved member is UNIQUE.** It is unique in migration
  `core/db/migrations/0076_content_revisions_version_uniq.sql:1`
  (`CREATE UNIQUE INDEX "content_revisions_entry_version_idx" …`), in the
  schema (`core/db/tables/content.ts:138`, `uniqueIndex(…)`) and in the
  snapshot (`core/db/migrations/meta/0081_snapshot.json:3459`,
  `"isUnique": true`). Live `pg_get_indexdef` therefore prints
  `CREATE UNIQUE INDEX …`. The literal at catalog `:184` is a wrong test
  pin, not a server rendering.
  The same wrong literal feeds the rollout tool:
  - `PRESERVED_MEMBER_SHAPE` is built from `"CREATE INDEX …"`
    (`scripts/task-551-online-indexes.ts:1270-1272`), which gives
    `unique: false`.
  - `assertCatalogSeams` compares it with the live row (`:2281-2287`). Its
    `catalogMismatch` check ("the preserved revision index drifted") would
    fail on every real database.
  - The deployment suite pins the same shape
    (`tests/integration/server/task551OnlineIndexDeployment.test.ts:639-643`:
    literal `:640`, `unique: false` `:643`).
  - The failure never surfaced because 06-L02 **G3** provisioned the members
    without running the tool (`TASK-551-06-L02…md:1242-1243`).
- **G2 — the remaining catalog legs fail from source once `.rows` stops
  masking them** (`tests/integration/server/task551IndexAndConstraintCatalog.test.ts`):
  - (a) The exclusion leg joins `pg_am am on am.oid = c.conindid` (`:199`).
    `conindid` is the supporting index's `pg_class` OID, not an access-method
    OID, so the query returns 0 rows.
  - (b) The same leg expects source bytes (`:211`
    `tsrange(starts_at, ends_at, '[)') WITH &&`; `:212` the predicate
    `status IN ('pending', 'confirmed')`). `pg_get_constraintdef` prints
    literal casts and `= ANY (ARRAY[...])`, in the same way as the pinned
    server renderings at deployment `:570-575`.
  - (c) The "no other constraint" probe (`:224`, `contype <> 'c'`) returns
    the outbox primary key (contype `p`, from 0081 `:2`
    `"id" uuid PRIMARY KEY`). On PG 18 it also returns the catalogued
    NOT NULL constraints (contype `n`).
  - (d) The unique-constraint leg writes `conname = any(${[...]})` (`:233`).
    Drizzle's `sql` tag expands a JS array to a parenthesised list,
    `($1, $2, …)` (`node_modules/drizzle-orm/sql/sql.js:93-102`), so
    PostgreSQL rejects the query ("op ANY/ALL (array) requires array on
    right side"). The rollout tool is not affected: it uses the postgres.js
    tag, which binds arrays.
- **G3 — SearchVector.** Three defects remain after the first note's R3:
  - The `pg_attrdef` join has no `a.attnum = ad.adnum`
    (`tests/integration/server/task551SearchVectorMigration.test.ts:204-207`).
    It returns one row per column default, so `toHaveLength(1)` fails.
  - `pg_get_expr` returns the deparsed form (`COALESCE`,
    `'simple'::regconfig`, `''::text`, `'A'::"char"`, extra parentheses),
    which never equals the frozen `SEARCH_VECTOR_SQL` bytes
    (`core/db/searchVectorDefinitions.ts:51`; compare at `:211`).
  - `to_regoperator` takes `name(left,right)`, but `:229-231` pass
    `"text || text"`-style strings, so `:236` resolves nothing.
- **G4 — O1 readers.** Two more files read `.rows`:
  - `tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts`
    at `:248` and `:274`. Its plan leg (`:268-277`) also reads `row.plan`,
    but the EXPLAIN output column is `QUERY PLAN`.
  - `tests/perf/database-index-write-overhead.test.ts` at `:151`, where
    `.rows[0]` throws a `TypeError`.

  The whole-tree count of `as unknown as { rows` is 13 matches across
  exactly five files: catalog 5, parity 1, SearchVector 4, outbox 2, perf 1.
- **G5 — online-member dependents.** The manifest has 89 member names. A grep
  of those names across `tests/`, plus a behavioural check of each DB leg
  whose outcome needs an online-only index, gives the inventory in R2.4.
  At least the outbox plan leg (`OLDEST_AGE_INDEX`,
  `task551CacheInvalidationOutboxSchema.test.ts:77`, manifest
  `tests/perf/fixtures/task551OnlineIndexManifest.ts:103`) cannot pass in a
  `bun_worker_*` schema.

### R1 — corrected and extended (the ONE five-file test-only edit)

**Five-file list (A5, B4, C6).** R1 is one 05-L01 test-only edit to exactly:

1. `tests/integration/server/task551IndexAndConstraintCatalog.test.ts`
2. `tests/integration/server/task551SchemaMigrationParity.test.ts`
3. `tests/integration/server/task551SearchVectorMigration.test.ts` (R3
   items land in this same edit)
4. `tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts`
5. `tests/perf/database-index-write-overhead.test.ts`

The R2.3 legs (below) add
`tests/integration/server/task551ConcurrencyConstraints.test.ts` (allowlist
`:1062`) to the same change, but that file is edited only for its R2
branch. The manifest and `scripts/task-551-online-indexes.ts` are read only
(import of `canonicalIndexShape`). No production file changes in this edit.

**R1 item 1 (extended).** Each of the five files gets its own local
`rowsOf<T>(result: unknown): T[]` with the same body. It throws
`catalog_result_not_array` when the result is not an array, and it has no
`.rows` fallback. All 13 sites read through it: catalog `:171`, `:181`,
`:202-206`, `:222`, `:226`, `:235`; parity `:336`; SearchVector `:209`,
`:221`, `:238`, `:247`; outbox `:248`, `:274`; perf `:151`. After the edit,
none of the five files contains `?? []`, `?? { bytes: 0 }` or
`?.proname ?? ""` at those sites. Do not copy the 05-L03 helper of the same
name (`task551SolutionKitRollbackAuthoritySchema.test.ts:1013`), which reads
`.rows` (**B1**).

**R1 item 3 (corrected alias for the exclusion leg).**
- The preserved leg (`:179`) keeps `c.relnamespace = current_schema()::regnamespace`,
  where `c` is `pg_class`.
- In the exclusion leg (`:198-200`), `c` is `pg_constraint`. There the
  qualifier is `c.connamespace = current_schema()::regnamespace`.
- Catalog `:169` and parity `:334` are subsumed by item 4.

**R1 item 4 (corrected binding form).** The one bounded read under the
drizzle `sql` tag is:

`select c.relname as name, pg_get_indexdef(c.oid) as indexdef from pg_class c where c.relkind = 'i' and c.relnamespace = current_schema()::regnamespace and c.relname in ${TASK551_ONLINE_INDEX_MEMBERS.map((member) => member.name)}`

**Ban (all six files).** Never write `any(${array})` under the drizzle `sql`
tag. Drizzle renders `in ${array}` as `in ($1, …)` (sql.js `:93-102`). This
applies to item 4 and item 9, and to any new query in these files.

**R1 item 5 (corrected expected text).**
- The expected text is
  `CREATE UNIQUE INDEX content_revisions_entry_version_idx ON ${q}.content_revisions USING btree (entry_id, version)`,
  where `q` is `select quote_ident(current_schema())`, read through
  `rowsOf`.
- The lookup keeps `c.relnamespace = current_schema()::regnamespace` and
  expects exactly one row.
- In `public`, the expected string differs from today's `:184` by the
  `UNIQUE ` keyword. `:184` is corrected (**G1**), not preserved.

**R1 item 6 (anchor).** The parity docblock to rewrite is `:41-43` (the
raw-equality sentence ends at `:43`). Catalog `:26` and parity `:101-105`
are unchanged from the first note.

**R1 item 7 (new; exclusion leg).** The query is:

`select c.contype, pg_get_constraintdef(c.oid) as pg_get_constraintdef, am.amname from pg_constraint c join pg_class rel on rel.oid = c.conrelid join pg_class i on i.oid = c.conindid join pg_am am on am.oid = i.relam where c.conname = ${TASK551_EXCLUSION_CONSTRAINT_NAME} and rel.relname = 'bookings' and c.connamespace = current_schema()::regnamespace`

It is read through `rowsOf` and must return exactly one row. Assertions:

- `contype` is `"x"` and `amname` is `"gist"`.
- The definition contains the server renderings (**B4**):
  - `toContain("resource_id WITH =")`
  - `toContain("tsrange(starts_at, ends_at, '[)'::text) WITH &&")`
  - `toContain("status = ANY (ARRAY['pending'::text, 'confirmed'::text])")`
- The predicate matches in canonical form (**C6**). Split the definition on
  `" WHERE "`. Anything other than exactly two parts throws
  `exclusion_predicate_missing`. Then
  `expect(canonicalPredicateOf(livePredicate)).toBe(canonicalPredicateOf(BOOKING_RESERVATION_EXCLUSION_SQL.predicate))`.
- `canonicalPredicateOf(predicate: string): string | null` is local to the
  catalog file. It returns
  `canonicalIndexShape(\`CREATE INDEX task551_predicate_probe ON bookings USING gist (resource_id) WHERE ${predicate}\`).predicate`.
  It reuses the rollout canonicalizer (DRY), which strips outer parentheses,
  drops single-identifier casts and folds `IN` into `= ANY (ARRAY[...])`
  (`:1143-1219`).
- The element list is NOT passed through `canonicalIndexShape`: its
  tokenizer has no `&&` operator (`:1098`), so the element fragments stay
  pinned by the `toContain` rendering checks above.
- The source `:211`/`:212` expectations are deleted. The source bytes stay
  pinned by the static `addSql` leg (`:161`).

**R1 item 8 (new; `btree_gist` / constraint probe).**
- The extension read stays database-wide. It goes through `rowsOf` and
  expects `.length` 1, with no `?? []`.
- The probe becomes
  `select conname, contype from pg_constraint where conname like 'cache_invalidation_outbox%' and contype not in ('c', 'p', 'n') and connamespace = current_schema()::regnamespace`,
  and `rowsOf(...)` must equal `[]`.

**R1 item 9 (new; unique-constraint leg `:229-239`).**
- The predicate becomes
  `conname in ${[...TASK551_ASSERTED_UNIQUE_CONSTRAINTS]} and connamespace = current_schema()::regnamespace`,
  read through `rowsOf`.
- The sorted-name and `contype === "u"` assertions are unchanged.

**R1 item 10 (new; outbox).**
- `:248` becomes `rowsOf<{ event_key: string }>(result)`, and its assertions
  are unchanged.
- At `:268-277`, `db.execute<{ "QUERY PLAN": string }>(…)` is followed by
  `rowsOf<{ "QUERY PLAN": string }>(result).map((row) => row["QUERY PLAN"]).join("\n")`,
  with no `?? []`.
- The `toContain(OLDEST_AGE_INDEX)` and `toContain("Limit")` assertions are
  unchanged.
- The leg also takes the R2.2 branch. The row clears only after both edits.

**R1 item 11 (new; perf `:151`).** `relationBytes` reads
`const [row] = rowsOf<{ bytes: string }>(result)`. If `row === undefined` it
throws `relation_size_row_missing`, then returns `Number(row.bytes)`. The
`?? { bytes: 0 }` fallback is removed, so a missing row can no longer record
a silent zero storage delta.

**R1 gates (unchanged form, six files).**
- `./node_modules/.bin/eslint --max-warnings=0 <the six files>`.
- The DB-free proof
  `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test <the six files>`.
  Static legs pass and DB legs skip.
- `wc -l` (every file stays at or below 1,000 lines) and `git diff --check`.
- The DB proof stays the orchestrator's 01-L01 **V5-1** part-1 run under
  `M-ambient` on `coderso02`, serialized per **D9**.

**R1 item 12 (owned follow-on; the UNIQUE correction, gated on the O2
split).**
- Edits:
  - `scripts/task-551-online-indexes.ts:1271` becomes
    `"CREATE UNIQUE INDEX content_revisions_entry_version_idx ON public.content_revisions USING btree (entry_id, version)"`.
  - `tests/integration/server/task551OnlineIndexDeployment.test.ts:640`
    carries the same literal.
  - `:643` becomes `unique: true`.
- A grep at HEAD finds no other copy of the non-unique literal in `scripts/`,
  `tests/` or `core/` outside migrations. The only other copy is catalog
  `:184`, which item 5 corrects.
- Both files exceed the line gate (2,959 and 3,513 lines; **O2**). Root
  `AGENTS.md` (File Size and Modularity) requires a legacy file above 1,000
  lines to be split "by cohesive responsibility as part of the same
  substantive change before adding further behavior". So the follow-on lands
  as ONE 05-L01 change, in this order:
  1. Split both files below 1,000 lines each, keeping `canonicalIndexShape`
     and the other public exports import-stable.
  2. Make the two edits above.
- The follow-on is NOT part of the five-file R1 edit and is NOT a
  precondition of the 01-L01 initial regeneration: the deployment suite is
  static, with 0 `testIfDb(` legs.
- It IS a precondition of any `rollout-forward` execution (**G1**) and of
  05-L01 closure (**O2**).
- Until it lands, the static pin (`unique: false`) and R1 item 5
  (`UNIQUE`) disagree by design. That window is recorded, not a defect of
  the R1 edit.

### F3 limits (qualification of the first note's F3; recorded, no change)

`canonicalIndexShape` is exact for today's 89 members in `public`, with
these limits:

- **Casts.** A cast is dropped only when its type is a single identifier
  (`/^[A-Za-z_][\w$]*/`, `:1091-1096`). `::character varying`, `::text[]`
  and schema-qualified types leave residue. Every current partial-index
  predicate column is `text`. A future member that hits this fails loudly;
  it never passes falsely.
- **Column items.** Column items are joined raw (`:1253`), not through
  `canonicalOperand`. A schema-qualified opclass (`public.gin_trgm_ops`) or
  a parenthesised expression therefore does not match. The `public` branch
  assumes `pg_trgm` is visible on the session `search_path`.
- **Schema case.** The parsed schema is lower-cased (`:1245`), but
  `current_schema()` is used raw. The override matches only lower-case
  schema names. `public` and `bun_worker_<n>` qualify; anything else fails
  loudly.
- **`$user` schema.** `current_schema()` is the first existing
  `search_path` schema. If a `$user` schema exists without the TASK-551
  tables, the unqualified manifest relation resolves to a later schema, and
  the leg fails (zero rows in `current_schema()`). This fails closed; the
  precondition below (`current_schema()` is `public`) excludes it for part 1.
- **New environment precondition (01-L01 v7 records it next to V5-4
  check 3).** Before part 1:
  - `gin_trgm_ops` is visible to the part-1 session
    (`pg_opclass_is_visible` true for the `gin_trgm_ops` opclass);
  - `current_schema()` is `public`.

  Either one false is an environment STOP, not a suite verdict.

### R2 — extended to every 05-L01 DB leg that reads an online member (C6)

**R2.1 Rule (unchanged in kind).**
- The branch is selected by schema name. When
  `LANE_WORKER_SCHEMA.test(await sessionSchema())`, the leg asserts that
  none of ITS online guard members exists in the session schema, then
  returns. In every other schema it runs in full, and a missing member
  fails.
- Presence check (drizzle form):
  `select c.relname as name from pg_class c where c.relkind = 'i' and c.relnamespace = current_schema()::regnamespace and c.relname in ${guards}`,
  read through `rowsOf`; the worker branch expects `[]`.
- A static test in each file asserts that every guard name is a member of
  `TASK551_ONLINE_INDEX_MEMBERS`, so a renamed member cannot silently empty
  a guard.
- `LANE_WORKER_SCHEMA`, `sessionSchema` and `rowsOf` are file-local
  duplicates, as the first note item 6 already allows.

**R2.2 Outbox plan leg**
(`task551CacheInvalidationOutboxSchema.test.ts:262-284`).
- Guards: `[OLDEST_AGE_INDEX]`.
- The worker branch returns BEFORE `seedQuarters(100_000)`.
- The non-worker branch first asserts that the guard is present (one row),
  then runs the R1 item 10 plan check.
- The health leg (`:239-260`) reads only the journaled table and runs in
  every schema.

**R2.3 Concurrency legs**
(`tests/integration/server/task551ConcurrencyConstraints.test.ts`). These
were found by the behavioural check, not by name.
- The revision race (`:189-235`) needs the online unique members
  `page_revisions_page_version_idx` and
  `widget_template_revisions_template_version_idx` (manifest members).
  Without them, more than one duplicate commits.
  - The whole leg takes the worker branch, because `familiesRaced` must
    equal the digest-bound `TASK551_L05_CONCURRENCY_RECEIPT.counts.families`
    (`:232`). A partial race would break the receipt.
  - Guards: those two names.
- The apply-owner race (`:279-306`) needs
  `solution_kit_starter_apply_owners_active_idx`. Guards: that name.
- The booking exclusion leg (`:237-277`) depends only on the journaled
  transactional 0081 and runs in every schema.
- The file imports the manifest read-only for the static guard test. It
  stays far below 1,000 lines (349 today).

**R2.4 Inventory (grep of the 89 member names across `tests/` plus the
behavioural check; HEAD `420bb24a`).**

| File (owner) | Member-reading legs | Class |
| --- | --- | --- |
| catalog (05-L01) | online-index leg `:165-175` | R2 (first note) |
| catalog (05-L01) | `:68-119` | static snapshot legs; no DB |
| parity (05-L01) | `:331-340` | R2 (first note) |
| outbox (05-L01) | plan leg `:262-284` | R2.2 |
| outbox (05-L01) | `:86-191` | static companion-byte legs |
| concurrency (05-L01) | `:189`, `:279` | R2.3 (behavioural) |
| perf index-write-overhead (05-L01) | builds its own copies in shadow schema `task551_overhead` | not an R2 leg (reads no session-schema member) |
| deployment (05-L01) | none | static; 0 DB legs |
| `tests/vitest/db/searchVectorDefinitions.test.ts` (05-L01) | none | Vitest, names as data |
| `task551SolutionKitRollbackAuthoritySchema.test.ts` (05-L03; forbidden `:1073`) | `:1979`, `:2016`, `:2062` expect SQLSTATE 23505 naming online unique members | out of reach; **O3** |
| `tests/perf/database-explain-plans.test.ts`, `tests/perf/task489-solution-kit-run-predecessor-plans.test.ts` (05-L02 et al.) | live halves bind an injected fixture map (headers `:13-16`; `:1270-1340`), not the session schema | not decided here; **O4** |
| `tests/perf/fixtures/task551QueryPlanContracts.ts`, the manifest | data | none |

### R3 — SearchVector, restated in full (clears the D6 (i) row)

R3 lands in the five-file R1 edit. Items:

- **R3.1 (retained).** Qualify `:204-207` with
  `c.relnamespace = current_schema()::regnamespace`.
- **R3.2 (new).** The join becomes
  `join pg_attribute a on a.attrelid = c.oid and a.attnum = ad.adnum and a.attname = ${SEARCH_VECTOR_COLUMN}`,
  so exactly one row per member is returned.
- **R3.3 (retained and extended).** `:209`, `:221`, `:238` and `:247` read
  through `rowsOf`. At `:247` the `?.proname ?? ""` fallback becomes a
  length-1 assertion, followed by the unchanged `startsWith` check.
- **R3.4 (new; deparse on both sides).**
  - The live expression is compared with the SERVER's deparse of the frozen
    source bytes, never with the raw bytes.
  - Helper: file-local `deparsedExpected(table: string, bytes: string):
    Promise<string>`. In ONE `db.transaction`, it runs:
    1. `create temp table task551_sv_probe (like ${sql.identifier(schema)}.${sql.identifier(table)}) on commit drop`
    2. `alter table task551_sv_probe add column task551_sv_expected tsvector generated always as (${sql.raw(bytes)}) stored`
    3. `select pg_get_expr(ad.adbin, ad.adrelid) as expression from pg_attrdef ad join pg_attribute a on a.attrelid = ad.adrelid and a.attnum = ad.adnum where ad.adrelid = 'pg_temp.task551_sv_probe'::regclass and a.attname = 'task551_sv_expected'`
    4. It reads that one row through `rowsOf`.
  - `bytes` is the frozen `SEARCH_VECTOR_SQL` constant, never input.
    `LIKE` without `INCLUDING GENERATED` copies the columns as plain columns
    with identical types.
  - Assertion: `expect(live.expression).toBe(await deparsedExpected(member.table, bytes))`,
    with no whitespace collapsing.
  - The source bytes stay pinned by the static legs (`:117`).
- **R3.5 (new).** The operator signatures at `:229-231` become `"||(text,text)"`,
  `"||(tsvector,tsvector)"` and `"->>(jsonb,text)"`. The expected
  implementations and `:236`'s `to_regoperator(${signature})` are
  unchanged.
- The `to_regprocedure`/`to_regoperator` lookups stay database-wide
  (01-L01 **V4-3a**).

### Handoff rows for 01-L01 v7 (replaces the first note's table)

Every "Clears when" below is reachable only after EVERY listed item has
landed in the one test-only edit. A part-1 row is a `pass` with 0 failed and
0 skipped tests, under the suite's map, after green **V5-4** checks
(including the F3 environment precondition).

| Handoff reason (copy verbatim) | Delivered by | Clears when | Consumed at |
| --- | --- | --- | --- |
| `catalog-indexdef-rendering:tests/integration/server/task551IndexAndConstraintCatalog.test.ts` | R1 items 1-9 and R2 (first note) | items 1, 2, 3 (as corrected), 4, 5, 6, 7, 8, 9 landed; part-1 row under `M-ambient` passes | initial, **V5-9** step 6 |
| `catalog-indexdef-rendering:tests/integration/server/task551SchemaMigrationParity.test.ts` | R1 items 1, 2, 3, 4, 6 and R2 | those items landed; part-1 row under `M-ambient` passes | initial, **V5-9** step 6 |
| `catalog-schema-qualification:tests/integration/server/task551SearchVectorMigration.test.ts` (**D6 (i)** BLOCKED row) | R3.1-R3.5 | R3.1-R3.5 landed; part-1 row passes | initial, **V5-9** step 6 |
| `result-shape:tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts` (**A5**, **C3 (b)**) | R1 items 1, 10 and R2.2 | those items landed; part-1 row under `M-ambient` passes | initial, **V5-9** step 6 |
| `result-shape:tests/perf/database-index-write-overhead.test.ts` (**A5**, **C3 (b)**) | R1 items 1, 11 | those items landed; part-1 row under `M-ambient` passes | initial, **V5-9** step 6 |
| `catalog-schema-qualification:` plus the catalog and parity paths (**V4-3a**) | R1 item 3 (as corrected) | same edit | recorded as delivered; owner item, not a precondition (**V5-6** decision 4) |
| `result-shape:tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` | NOT delivered here: 05-L03 owner item (**B1**, **C7**) | 05-L03's own dated note | per 01-L01 v7 |
| **V5-5 (a)** owner item, 05-L01 share | R2 (first note), R2.2, R2.3 | all five worker branches pass in the FINAL lane-runner run: catalog and parity online-index legs, outbox plan leg, concurrency revision race, concurrency apply-owner race | FINAL only; not an initial precondition |

The FINAL target is the direct (non-pooled) endpoint of the `DATABASE_URL`
target (**C1**). **V5-5 (a)** as a whole also needs the orchestrator's
dispositions of **O3** and **O5**. 05-L01 cannot close those.

**Land order (restated).**
- The five-file R1/R2/R3 edit, plus the R2.3 branch in
  `task551ConcurrencyConstraints.test.ts`, is one 05-L01 test-only change.
  It lands before 01-L01 initial **V5-9** step 4.
- R1 item 12 (O2 split, then the UNIQUE edits) is a later 05-L01 change.
  It reopens the rollout tool's preserved-member pin and nothing else.

### Observations for orchestrator disposition (not decided here)

- **O3.** In `task551SolutionKitRollbackAuthoritySchema.test.ts`
  (05-L03-owned), the DB legs at `:1979`, `:2016` and `:2062` expect
  SQLSTATE 23505 with online unique member names. They fail in any
  `bun_worker_*` schema. This is the same class of issue as R2.3, outside
  05-L01's reach.
- **O4.** The injection-gated live halves of the two plan perf suites bind a
  fixture map, not the lane session schema. Whether they ever run against a
  worker schema is for their owner.
- **O5.** 06-L02-owned
  `tests/integration/server/task551RevisionConcurrency.test.ts:634`
  ("the unique (page, version) constraint is the final guard behind a lock
  bypass") depends on the online member `page_revisions_page_version_idx`
  whenever its owner map is present in a worker schema. This is from
  source; the map/worker combination was not verified.

### Superseded sentences (first note; verbatim, with replacements)

1. `:1246-1249` — "PostgreSQL renders unquoted identifiers,
   `ON <schema>.<table>` and `(a, b)`, as the preserved-member pin at
   catalog `:184` shows:
   `CREATE INDEX content_revisions_entry_version_idx ON public.content_revisions USING btree (entry_id, version)`."
   → **G1**. Server rendering evidence is deployment `:570-575`. `:184` is a
   wrong test pin.
2. `:1270-1275` (F3) — "It parses either the manifest bytes or
   `pg_get_indexdef` text into
   `{ unique, name, schema, table, method, columns, predicate }`:
   identifiers unquoted and upper-cased, `::casts` and comments dropped,
   `IN` lists rewritten to the `ANY (ARRAY[...])` form, AND/OR flattened and
   sorted (`:1027-1028`, `:1143-1162`, `:1201-1219`)." → The same, with only
   single-identifier casts dropped and column items compared raw (F3
   limits).
3. `:1320-1325` — "This delivers the 01-L01 **V4-3a** handoffs for these two
   files in the same edit: `c.relnamespace = current_schema()::regnamespace`
   for `pg_class` (catalog `:169`, `:179`, `:198-200`; parity `:334`) and
   `connamespace = current_schema()::regnamespace` for `pg_constraint`
   (catalog `:224`, `:231-233`)." → R1 item 3 (corrected alias).
4. `:1327-1329` — "The online-index leg (catalog `:165-175`, parity
   `:331-340`) runs ONE bounded read:
   `select c.relname as name, pg_get_indexdef(c.oid) as indexdef from pg_class c where c.relkind = 'i' and c.relnamespace = current_schema()::regnamespace and c.relname = any(<the 89 manifest names>)`."
   → R1 item 4 (`in ${…}` form and the ban).
5. `:1333-1334` — "The `schema` override is the session schema, because
   PostgreSQL resolves the unqualified manifest relation through the first
   `search_path` entry." → The same, under the F3 `$user` and schema-case
   limits and their precondition.
6. `:1338-1340` — "The expected text is
   `CREATE INDEX content_revisions_entry_version_idx ON ${q}.content_revisions USING btree (entry_id, version)`,
   where `q` is `select quote_ident(current_schema())`." → R1 item 5.
7. `:1340-1341` — "In `public` this is byte-identical to today's `:184`." →
   R1 item 5 (`:184` is corrected).
8. `:1344-1345` — "Rewrite the docblocks that promise raw equality (catalog
   `:26`, parity `:41-42`, `:101-105`) to say "equals its manifest bytes in
   canonical shape"." → R1 item 6 (`:41-43`).
9. `:1408-1411` — "Every other leg of the two suites (preserved member,
   exclusion, `btree_gist`, unique constraints, and all static legs) runs
   unchanged in worker schemas, because 0076 and the transactional 0081 are
   journaled." → These legs run in worker schemas only as edited by R1
   items 5, 7, 8 and 9. The static legs are unchanged.
10. `:1416-1417` — "It waits only on R1 landing plus the two part-1 rows." →
    It waits on the one test-only edit and the five part-1 rows in the
    handoff table.
11. `:1426-1428` — "The worker branch first executes in the 01-L01 FINAL
    lane-runner run on the **D6 (ii)** target." → The worker branches
    first execute in that run on the **C1** target (the direct endpoint).
12. `:1428` — "It closes **V5-5 (a)** there; it is not an initial
    precondition." → The handoff table's **V5-5 (a)** row (05-L01 share;
    **O3**/**O5** for the orchestrator).
13. `:1429-1430` — "Prediction from source, not a receipt: after R1 and R2
    land, neither suite is part of the **D6 (i)** interim lane red set." →
    Withdrawn. No prediction is made until every item lands and the part-1
    rows are receipts.
14. `:1436` — "The item is:" → The item is R3.1-R3.5 (the two original
    bullets survive as R3.1 and R3.3).
15. `:1449` (and "same" at `:1450`) — Clears when: "the R1 edit has landed
    and the suite's **V5-1** part-1 row under `M-ambient` is `pass` with 0
    failed and 0 skipped tests, after green **V5-4** checks" → The
    handoff-table rows above.
16. `:1452` — Clears when: "the R3 edit has landed and its part-1 row is
    `pass`" → R3.1-R3.5 landed (not achievable before R3.2, R3.4 and R3.5),
    then the part-1 row.
17. `:1453` — Delivered by: "R2 (decided here; lands with the R1 edit)" and
    Clears when: "the worker branch passes in the FINAL lane-runner run" →
    The **V5-5 (a)** row above.
18. `:1455-1456` — "Land order: R1, R2 and R3 are one 05-L01 test-only edit
    to these three test files (the manifest is read, not changed)." → The
    land order restated above.
19. `:1457` — "It reopens no product, migration or rollout contract." →
    The R1/R2/R3 edit reopens none. R1 item 12 reopens the rollout tool's
    preserved-member pin.
20. `:1480-1482` — "This is refined by R1 item 5: the pin is byte-identical
    with the schema taken from `current_schema()`, and identical to the old
    literal in `public`." → The pin is the server's `CREATE UNIQUE INDEX …`
    rendering with the schema from `current_schema()`. It is not identical
    to the old `:184` literal.

**Retained and refined, not superseded.**
- `:1363-1365`: the worker-branch pseudocode applies unchanged, and R2.2 and
  R2.3 repeat its shape.
- Base `:862-864` ("asserted byte-identical"): refined by item 5 as
  corrected.
- Base `:871-872` ("constraint names/definitions, generated search
  expressions"): refined. The live legs pin the constraint definition by
  server-rendering fragments plus the canonical predicate (item 7), and pin
  generated expressions by server-deparse equality (R3.4). Exact source
  bytes stay in the static legs.
- First-note O1's proposal is adopted (**A5**) as R1 items 10-11.

## Dated Contract Corrections — 2026-09-26 (third note: perf and concurrency source defects, split allowlist, env precondition)

**Authority and scope.** This append-only note implements orchestrator
decision **E3** of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`
in full. It cites **E2** (the **O3**/**O5** dispositions), **E4** (01-L01 v8
consumes the handoff rows below), **C3 (b)**, **C6** and **D8**, and does not
re-decide them. It corrects the second note directly above ("the second
note"). The corrections come from two read-only audits of the second note;
every anchor below was re-read from source at HEAD `74fe8f4e` (nothing
executed). This round changes no source, test or migration byte. Its only
non-text change is the in-place envelope amendment recorded under
"Envelope amendment" below (four `allowlist` entries). `**Status:**` is
unchanged (`⏳ To Do`). Everything in the first and second notes that is not
quoted under "Superseded sentences (third note)" stays binding. A reference
to an item (for example "R2.3" or "R3.4") means that item as amended here.

**Anchor rule.** The envelope amendment inserts two lines after HEAD `:1053`
and two after HEAD `:1063`. Anchors into THIS file below are line numbers of
the amended tree. A HEAD line `L` maps to `L` when `L <= 1053`, to `L + 2`
when `1054 <= L <= 1063`, and to `L + 4` when `L >= 1064`. So the second
note now spans `:1491-1989`, and its fence anchors (`:1053`,
`:1058`-`:1064`, forbidden `:1073`) and the first note's (`:1054`, `:1058`,
`:1061`) are HEAD numbers. Anchors into other files are unchanged.

### Verified facts (read from source at `74fe8f4e`)

- **H1 — the perf suite fails from source in every schema**
  (`tests/perf/database-index-write-overhead.test.ts`, 267 lines). Both DB
  legs call `measureAllGroups` (`:214-224`), and three defects stop them
  whatever `rowsOf` does:
  - (a) `memberBytes` (`:125-128`) only prefixes the manifest's table with
    the shadow schema: `.replace(/ ON /, \` ON ${SHADOW_SCHEMA}.\`)` turns
    `ON "pages"` into `ON task551_overhead."pages"`. That table never exists.
    The shadow tables are `<member stem>_baseline` / `<member stem>_indexed`
    (`:163-167`). So the first `CREATE INDEX` fails with 42P01. The third
    `.replace` (`:128`) never matches (`USING …` separates the relation from
    `(`) and is a no-op.
  - (b) `createTable` is renamed by the regex at `:167`, but `insertRow`
    (`:67`, `:78`, `:89`, `:98`, `:108`) and `updateStatement` (`:70`,
    `:81`, `:90`, `:99`, `:111-118`) still name the `overhead_*` tables,
    which are never created.
  - (c) `measure` receives the already-qualified `tableName(suffix)`
    (`:165`, `:195-196`) and passes it to `relationBytes` (`:192`), which
    qualifies it again (`:148`). The result is a three-part name, which
    PostgreSQL rejects as a cross-database reference.
  - (d) Limitation, not a defect: the insert "p95" is ONE sample of one
    5,000-statement batch (`timedRuns(..., 1)`, `:182-187`, `:186`). The
    update p95 uses 25 samples (`:188`).
  - The member column lists do fit the shadow tables (manifest `:817`
    pages `("author_id","updated_at" desc,"id" desc)`, `:516`, `:897`,
    `:596`, `:103`), so once each member is rewritten onto its shadow table
    the bytes build. Two rewritten index names exceed 63 bytes
    (`${member}_${suffix}` at `:170`: 69 bytes for the pages and outbox
    groups). PostgreSQL truncates them with a NOTICE. That is harmless
    (one index per shadow table) and recorded, not changed.
  - The second note's R2.4 row "builds its own copies in shadow schema
    `task551_overhead`" therefore describes the intent, not the source.
- **H2 — the concurrency suite fails from source in every schema**
  (`tests/integration/server/task551ConcurrencyConstraints.test.ts`, 349
  lines). The second note's R2.3 premise was drawn from this defective
  source.
  - (1) The revision race (`:189`) builds raw SQL with the parent UUID
    unquoted: `` `(${parentId}, 1, '{}')` `` (`:213`, and `:212` for the
    widget-template family), executed through `sql.raw` (`:214`, `:218`).
    Every probe is a syntax error, so `committed` is 0.
  - (2) The column list `(${parentColumn}, version, data)` (`:209`) is
    wrong for `detail_page_revisions`. Its payload column is `document`
    (`core/db/tables/pages.ts:171`, in `detailPageRevisions` `:162`; the
    seed anchor `pages.ts:77` is `page_templates.document`, not this
    table). The other three share `data` (`pages.ts:98`,
    `content.ts:128`, `posts.ts:95`).
  - (3) In the apply-owner race (`:279`) all 50 probes insert the same
    `source_run_id` (`fixture.runId`, `:289`). That column is the journaled
    PRIMARY KEY
    (`core/db/migrations/0081_task551_search_indexes_constraints_outbox.sql:99`).
    So the PK alone would reject the duplicates, and the online member
    `solution_kit_starter_apply_owners_active_idx`
    (`core/db/migrations/0081_task551_online_indexes.sql:23`,
    `("package_key","actor_id") WHERE released_at IS NULL`) never decides.
  - (4) The FK `solution_kit_starter_apply_owners_source_identity_fk`
    (0081 `:165`) maps `(source_run_id, package_key, actor_id)` to
    `solution_kit_install_runs (id, kit_id, actor_id)`. The run is seeded
    with `kit_id = SCOPE` (`:160-161`) while `package_key` is
    `unique("package")` (`:282`), so every probe fails 23503. 05-L03
    documents the same trap at
    `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts:2028`.
  - (5) The booking disjoint probes (`:258-272`) use `hour = 12 + index`
    for index 0..49 (`:260`), which yields literals up to `61:00`. Only the
    first 12 probes have valid bounds, so `toHaveLength(FAMILY_SIZE)`
    (`:272`) fails.
  - After (1)-(2), the families that need online members are exactly
    `page_revisions` and `widget_template_revisions` (companion `:11-12`).
    `content_revisions` (0076), `post_revisions` (0045 `:54`) and
    `detail_page_revisions` (0054 `:31`) are journaled. After (3)-(4), the
    apply-owner race needs `solution_kit_starter_apply_owners_active_idx`.
- **H3 — outbox seeding.** `seedQuarters`
  (`task551CacheInvalidationOutboxSchema.test.ts:207-231`) awaits one
  INSERT per row. The plan leg seeds 100,000 rows (`:267`) under a
  300,000 ms timeout (`:283`), so it needs a round trip under 3 ms. No
  timing evidence exists: the leg has never run green.
- **H4 — counts.** The whole-tree single-line grep for
  `as unknown as { rows` gives 13 matches in the five files (catalog 5,
  parity 1, SearchVector 4, outbox 2, perf 1). The catalog read at
  `:202-206` is a multi-line cast (`as unknown as {` at `:203`, `rows:` at
  `:204`). So there are 14 read sites. `grep -c '\.rows\b'` over the five
  files gives 6/1/4/2/1 = 14 at HEAD.
- **H5 — R3.4 helper.** The signature `deparsedExpected(table, bytes)`
  (`:1835-1836`) interpolates `schema`, which is not a parameter. "In ONE
  `db.transaction`" does not require the transaction handle. A `db.execute`
  inside the callback runs on another pooled connection, where
  `'pg_temp.task551_sv_probe'::regclass` does not resolve.
- **H6 — env precondition not routed.** An untruncated count of
  `pg_opclass_is_visible|gin_trgm_ops` in
  `_docs/_TASKS/TASK-551-01-L01-Production-Query-Inventory-And-Ownership-Matrix.md`
  is 0 at HEAD. The second note's claim that 01-L01 v7 records it is
  false, and its handoff table has no row for it.
- **H7 — split targets outside the fence.** R1 item 12 splits
  `scripts/task-551-online-indexes.ts` (2,959 lines) and
  `tests/integration/server/task551OnlineIndexDeployment.test.ts` (3,513
  lines) into new files, and no TASK-551 fence named any split target at
  HEAD. The four E3 names occur nowhere in `scripts/`, `tests/`, `core/` or
  `_docs/_TASKS/` at HEAD (only in the dispositions file).

### Envelope amendment (in place, E3; the only fence edit)

- The json fence `allowlist` (`:1032-1069`) gains exactly four entries, the
  orchestrator-approved **O2** split targets:
  - `scripts/task-551-online-indexes-catalog.ts` (`:1054`)
  - `scripts/task-551-online-indexes-rollout.ts` (`:1055`)
  - `tests/integration/server/task551OnlineIndexDeployment-catalog.test.ts`
    (`:1066`)
  - `tests/integration/server/task551OnlineIndexDeployment-rollout.test.ts`
    (`:1067`)
- Each is placed after its source file's entry. Every existing entry keeps
  its bytes and relative order (32 → 36 entries, no duplicates). `schema`,
  `artifactPolicy`, `taskId`, `parent`, `forbiddenPaths`, `dependencies`,
  `commands` and `occurrences` are byte-identical. The JSON parses. No other
  TASK-551 fence names these paths, so single-writer ownership holds.
- The family preflight literal
  (`TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md`, "Family preflight
  (literal; repo root)") with last argument `74fe8f4e…` prints
  `{"taskFileCount":41,"childTaskCount":11,"leafTaskCount":29,"occurrenceCount":33}`
  on this tree, unchanged from before the amendment.
- The names bind the R1 item 12 split. Its writer may refine the split by
  cohesive responsibility. Any path other than these four is a further
  05-L01 fence amendment under the same rules, never an implicit widening.
- The amendment grants write surface only. It adds no command, argv,
  `positiveDiscovery` path or occurrence (see **O6**).

### R1 items 13-15 — perf suite source fixes (E3; same test-only edit)

- **R1 item 13 (member bytes on the paired shadow table).**
  `memberBytes(member, table)` rewrites the manifest's single
  ` ON "<table>" ` token to ` ON ${SHADOW_SCHEMA}.${table} `, where `table` is
  the `_indexed` suffix table, and drops ` CONCURRENTLY`. Exactly one match
  is required; otherwise it throws `overhead_member_rewrite_missing`. The
  no-op third `.replace` (`:128`) is deleted. The index-name rewrite
  (`:170`) and the static manifest-bytes leg (`:226-233`) are unchanged.
- **R1 item 14 (statements parameterised by the suffix table).**
  `insertRow(table, index)` and `updateStatement(table)` become functions of
  the qualified shadow table `tableName(suffix)`. `createTable(table)` may
  take the same parameter in place of the `:167` regex. All three builders
  must target the same qualified name. The warm-up insert (`:174`,
  `:178-181`) is built inside `measure` from `insertRow(table, 0)`.
- **R1 item 15 (single qualification).** `measure(suffix)` receives the BARE
  suffix (`:195-196` pass `baseTable` / `indexedTable`). The statements use
  `tableName(suffix)`, and `relationBytes(suffix)` qualifies exactly once
  (`:148`), read through `rowsOf` per item 11.
- **Limitation (recorded, no change).** The insert p95 is a single-sample
  measurement (**H1 (d)**). Once items 1, 11 and 13-15 land, a ceiling red
  is a measured finding, not a source defect. Per root `AGENTS.md`, it is
  re-run once in isolation before it counts. This note does not change the
  sampling.

```ts
// Shape only; names are binding, formatting is prettier's.
const memberBytes = (member: string, table: string): string => {
  const found = TASK551_ONLINE_INDEX_MEMBERS.find((entry) => entry.name === member);
  if (found === undefined) throw new Error(`member ${member} is not in the closed manifest`);
  const on = / ON "[a-z_]+" /g;
  if ((found.createSql.match(on) ?? []).length !== 1) throw new Error("overhead_member_rewrite_missing");
  return found.createSql.replace(on, ` ON ${SHADOW_SCHEMA}.${table} `).replace(" CONCURRENTLY", "");
};
const measure = async (suffix: string) => {
  const table = tableName(suffix); // qualified once
  await timedRuns(group.insertRow(table, 0), 3);
  const insertSamples = await timedRuns(batchOf(group, table), 1); // limitation: one sample
  const updateSamples = await timedRuns(group.updateStatement(table), 25);
  return { insert: p95(insertSamples), update: p95(updateSamples), bytes: await relationBytes(suffix) };
};
```

### R2.3 — corrected (concurrency; E3; same test-only edit)

The file is edited for these source fixes AND for its R2 branch, in the one
test-only change.

- **R2.3a (bind `parentId`).** The revision insert is built with the
  drizzle `sql` tag and bound values. It no longer uses `sql.raw` string
  assembly for any value: identifiers go through `sql.identifier`, and
  `parentId`, name and category are bound parameters. The widget-template
  name and category are computed ONCE per family, outside the probe
  closure, so all 50 probes insert the identical `(parent, 1)` row.
- **R2.3b (`document` for `detail_page_revisions`).** The payload column
  comes from a closed per-family map: `data` for `page_revisions`,
  `content_revisions` and `post_revisions`, `document` for
  `detail_page_revisions`. `widget_template_revisions` keeps its own list.
- **R2.3c (50 valid disjoint 30-minute windows).** Probe `i` uses
  `start = base + i × 30 min` and `end = start + 30 min`, with
  `base = 2026-05-02 12:00`. The values are computed by UTC arithmetic and
  formatted `YYYY-MM-DD HH:MM` (the same zone-less form as the overlap
  probe). Windows are adjacent `[)` ranges and never overlap each other or
  the 2026-05-01 overlap window. The three assertions (`:272-274`) are
  unchanged.
- **R2.3d (apply-owner race on the active index).**
  - Before the barrier, seed 50 install runs with distinct `id`s,
    `kit_id = packageKey`, `actor_id = fixture.userId`, `mode 'apply'` and
    `status 'running'`. Use one set-based insert,
    `values ${sql.join(rows, sql\`, \`)}`; the drizzle `any(${array})` ban
    applies.
  - Probe `i` inserts the owner row with `source_run_id = runIds[i]` and
    the shared `(packageKey, fixture.userId)`, with `released_at` null. The
    PK and the FK are satisfied, so ONE actor and the ACTIVE INDEX, not the
    PK, decide.
  - Assertions: 1 fulfilled, 49 × 23505, and every rejection names
    `solution_kit_starter_apply_owners_active_idx`. Read `constraint_name`
    the way `failureCode` reads `code`, including `cause`.
  - `cleanupParents` gains `delete from solution_kit_install_runs where
    actor_id = ${fixture.userId}` after the owner delete and before the user
    delete, so it stays child-first and scope-owned.
- **R2.3e (explicit guard presence outside worker schemas).** Both
  member-reading legs follow R2.2's shape. Read `sessionSchema()` and run
  the R2.1 presence read. A worker schema expects `[]` and returns before
  any seeding. Any other schema first asserts that the sorted present names
  equal the sorted guards (revision race: the two revision members;
  apply-owner race: `solution_kit_starter_apply_owners_active_idx`), then
  runs the leg.
- **R2.3f (legs by dependency, restated).** Revision race: guards
  `page_revisions_page_version_idx` and
  `widget_template_revisions_template_version_idx`, whole-leg worker branch
  (the `:232` receipt rule is unchanged). Apply-owner race: guard
  `solution_kit_starter_apply_owners_active_idx`, after R2.3d. Booking
  exclusion: no online member, so it runs in every schema, but only after
  R2.3c. The file stays far below 1,000 lines.

### R2.1 and R2.2 — refinements

- **R2.1.** "Runs in full" means that a non-worker branch first asserts that
  every guard is present (R2.3e form), then runs. A missing guard fails
  there, before any seeding. This applies to every R2 leg: catalog, parity,
  outbox and both concurrency legs.
- **R2.2 (set-based seeding; E3).** `seedQuarters(rows)` becomes ONE
  set-based statement,
  `insert into cache_invalidation_outbox (…) select … from (values (0, ${…}::int), (1, …), (2, …), (3, …)) as quarter(q, first_minute) cross join generate_series(0, ${perQuarter}::int - 1) as p`.
  It produces the same rows as the loop:
  - `event_key` = `'seed-' || q || '-' || p`;
  - `created_at` = `timestamp '2026-01-01 00:00:00' + make_interval(mins => ((first_minute + p) / 60) % 60, secs => (first_minute + p) % 60)`;
  - the same `available_at`, `claim_token`, `claim_until` and
    `processed_at` rules per quarter, and `attempts` 0.

  First minutes come from `QUARTER_FIRST_MINUTE` as bound `::int`
  parameters. Both the health leg (`:239-260`, 1,000 rows) and the plan leg
  use it, and every assertion is unchanged. The worker branch still returns
  before seeding.

### R1 item 1 and R3.4 — wording corrections

- **R1 item 1 count.** There are 13 single-line grep matches and 14 read
  sites. Done-check: `grep -c '\.rows\b'` is 0 in each of the five files
  (HEAD 6/1/4/2/1).
- **R3.4 helper.** The signature is
  `deparsedExpected(schema: string, table: string, bytes: string): Promise<string>`.
  `schema` is the SearchVector file's own file-local `sessionSchema()`
  result (first note item 2 form; `catalog_session_schema_missing` on null or
  empty), read once per test. The helper runs
  `db.transaction(async (tx) => …)`, and steps 1-3 plus the step-4 read all
  use `tx.execute`; no `db.execute` inside the callback. The assertion is
  `expect(live.expression).toBe(await deparsedExpected(schema, member.table, bytes))`,
  with no whitespace collapsing.
- **File-local duplicates.** `rowsOf` and `sessionSchema` are file-local in
  all six files (the SearchVector file included). `LANE_WORKER_SCHEMA` is
  file-local in the R2 files (catalog, parity, outbox, concurrency).

### Environment precondition (routed; E3)

Before part 1, the executor checks both conditions:

- `select bool_or(pg_opclass_is_visible(oid)) from pg_opclass where opcname = 'gin_trgm_ops'`
  is `true` (null or false fails);
- `select current_schema()` is `public`.

Either one failing is an environment STOP, never a suite verdict. 01-L01 v8
records this as **V5-4** check 4 (**E4**). Until that lands, part 1 has no
executor for it (**H6**).

### Handoff rows for 01-L01 v8 (replaces the second note's table)

The second note's lead-in stays binding: every "Clears when" is reachable
only after EVERY listed item has landed in the one test-only change. A
part-1 row is a `pass` with 0 failed and 0 skipped tests under the suite's
map, after green **V5-4** checks (now including check 4, row 9).

| # | Handoff reason (copy verbatim) | Delivered by | Clears when | Consumed at |
| --- | --- | --- | --- | --- |
| 1 | `catalog-indexdef-rendering:tests/integration/server/task551IndexAndConstraintCatalog.test.ts` | R1 items 1-9 and R2 (first note; R2.1 as refined) | items 1, 2, 3 (as corrected), 4, 5, 6, 7, 8, 9 and the R2.1 guard assertion landed; part-1 row under `M-ambient` passes | initial, **V5-9** step 6 |
| 2 | `catalog-indexdef-rendering:tests/integration/server/task551SchemaMigrationParity.test.ts` | R1 items 1, 2, 3, 4, 6 and R2 (R2.1 as refined) | those items landed; part-1 row under `M-ambient` passes | initial, **V5-9** step 6 |
| 3 | `catalog-schema-qualification:tests/integration/server/task551SearchVectorMigration.test.ts` (**D6 (i)** BLOCKED row) | R3.1-R3.5 (R3.4 as corrected here) | R3.1-R3.5 landed; part-1 row passes | initial, **V5-9** step 6 |
| 4 | `result-shape:tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts` (**A5**, **C3 (b)**) | R1 items 1, 10; R2.2 including set-based seeding | those items landed; part-1 row under `M-ambient` passes | initial, **V5-9** step 6 |
| 5 | `result-shape:tests/perf/database-index-write-overhead.test.ts` (**A5**, **C3 (b)**) | R1 items 1, 11, 13, 14, 15 | ALL of items 1, 11, 13, 14 and 15 landed (never items 1 and 11 alone); part-1 row under `M-ambient` passes; a ceiling red after that is a measured finding | initial, **V5-9** step 6 |
| 6 | `catalog-schema-qualification:` plus the catalog and parity paths (**V4-3a**) | R1 item 3 (as corrected) | same edit | recorded as delivered; owner item, not a precondition (**V5-6** decision 4) |
| 7 | `result-shape:tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` | NOT delivered here: 05-L03 owner item (**B1**, **C7**; **O3** per **E2**) | 05-L03's own dated note | per 01-L01 v8 |
| 8 | **V5-5 (a)** owner item, 05-L01 share | R2 (first note), R2.2, R2.3 (R2.3a-f) | R2.3a-f landed, and all five worker branches pass in the FINAL lane-runner run (catalog and parity online-index legs, outbox plan leg, concurrency revision race, concurrency apply-owner race), with the booking leg green in the same worker run | FINAL only; not an initial precondition |
| 9 | `env-precondition:pg_trgm-visible-and-public-schema` | F3 limits (second note) and "Environment precondition" above | 01-L01 v8 has added **V5-4** check 4 and it is green before part 1; either condition false is an environment STOP | initial, before **V5-1** part 1 |
| 10 | `catalog-concurrency-source:tests/integration/server/task551ConcurrencyConstraints.test.ts` (01-L01 v8 blocked row) | R2.3a-f (+ R1 item 1 form where it reads rows) | R2.3a-f landed; part-1 row under `M-ambient` passes, including both guard assertions and the booking leg | initial, **V5-9** step 6 |

The FINAL target is still the direct (non-pooled) endpoint of the
`DATABASE_URL` target (**C1**). **V5-5 (a)** as a whole closes only when
05-L01 R2 + R2.2 + R2.3, 05-L03 **O3** and 06-L02 **O5** have landed
(**E2**). Row 8 is 05-L01's share only.

**Land order (restated).**
- One 05-L01 test-only change covers the five-file R1/R2/R3 edit (with R1
  items 13-15 in the perf file and the R2.2 seeding in the outbox file),
  plus the R2.3a-f source fixes and R2 branch in
  `task551ConcurrencyConstraints.test.ts`. It lands before 01-L01 initial
  **V5-9** step 4.
- Its fast gates are the second note's "R1 gates" over the six files.
- R1 item 12 (the **O2** split into the four amended `allowlist` paths,
  then the UNIQUE edits) is still a later, separate 05-L01 change.

### Observations for orchestrator disposition (not decided here)

- **O6 (split vs command surface).** `migration-and-index-tests` names
  `tests/integration/server/task551OnlineIndexDeployment.test.ts` in its
  argv and `positiveDiscovery` (fence `:1115-1124`). If the item-12 split
  moves legs into the two new test files, or removes or renames the
  original, then the argv and `positiveDiscovery` need a same-change
  envelope amendment with no new occurrence, and E3 authorised the
  `allowlist` only. Without it the split tests go undiscovered or
  discovery fails.
- **O7 (index-name truncation).** The two 69-byte shadow index names
  (**H1**) are truncated silently apart from a NOTICE. They are recorded
  only; no change is proposed.

### Superseded sentences (third note; verbatim, with replacements)

Anchors are amended-tree lines (the Anchor rule above).

1. `:1501-1503` (second note) — "The dispatch envelope is unchanged,
   and every file named below is already in this leaf's `allowlist`
   (`:1053`, `:1058`-`:1064`)." → True for the six test files and the
   script. The R1 item 12 split targets were NOT in the fence. The
   "Envelope amendment" above adds them.
2. `:1566-1567` — "The whole-tree count of `as unknown as { rows` is 13
   matches across exactly five files: catalog 5, parity 1, SearchVector 4,
   outbox 2, perf 1." → The count holds for single-line grep matches. The
   read-site count is 14 (**H4**).
3. `:1587-1590` — "The R2.3 legs (below) add
   `tests/integration/server/task551ConcurrencyConstraints.test.ts`
   (allowlist `:1062`) to the same change, but that file is edited only for
   its R2 branch." → It is edited for R2.3a-f (source fixes plus the R2
   branch) in the same change. The allowlist anchor is `:1064` in this tree.
4. `:1596` — "All 13 sites read through it:" → All 14 read sites (13
   single-line grep matches) read through it, with the `grep -c '\.rows\b'`
   done-check.
5. `:1715-1716` — "1. Split both files below 1,000 lines each, keeping
   `canonicalIndexShape` and the other public exports import-stable." → Split
   both files below 1,000 lines each into the four amended `allowlist`
   paths (or a refinement through a further fence amendment), keeping
   `canonicalIndexShape` and the other public exports import-stable; see
   **O6**.
6. `:1750-1751` — "**New environment precondition (01-L01 v7 records it
   next to V5-4 check 3).** Before part 1:" → New environment precondition,
   handed off as row 9 to 01-L01 v8 **V5-4** check 4 (not recorded in v7).
   The two conditions and the STOP rule stay binding in the "Environment
   precondition" form above.
7. `:1764-1765` (R2.1) — "In every other schema it runs in full, and a
   missing member fails." → R2.1 as refined: it first asserts every guard
   present, then runs.
8. `:1772-1773` — "`LANE_WORKER_SCHEMA`, `sessionSchema` and `rowsOf` are
   file-local duplicates, as the first note item 6 already allows." → The
   "File-local duplicates" bullet above (the SearchVector file included).
9. `:1785-1786` (R2.3) — "These were found by the behavioural check, not by
   name." → That check ran against defective source (**H2**). The corrected
   dependency list is R2.3f.
10. `:1787-1790` — "The revision race (`:189-235`) needs the online unique
    members `page_revisions_page_version_idx` and
    `widget_template_revisions_template_version_idx` (manifest members).
    Without them, more than one duplicate commits." → The same only after
    R2.3a-b. At HEAD no probe commits in any schema.
11. `:1795-1796` — "The apply-owner race (`:279-306`) needs
    `solution_kit_starter_apply_owners_active_idx`. Guards: that name." →
    At HEAD the PK and the FK decide, and the member is never exercised. The
    guard is valid only after R2.3d.
12. `:1797-1798` — "The booking exclusion leg (`:237-277`) depends only on
    the journaled transactional 0081 and runs in every schema." → It depends
    only on 0081 and runs in every schema only after R2.3c. At HEAD it fails
    in every schema.
13. `:1813` (R2.4 row) — "| perf index-write-overhead (05-L01) | builds its
    own copies in shadow schema `task551_overhead` | not an R2 leg (reads no
    session-schema member) |" → Intended to build its own copies in
    `task551_overhead`, but at HEAD it fails before building any (**H1**).
    Items 13-15 make that true. The class "not an R2 leg" stays.
14. `:1835-1836` (R3.4) — "Helper: file-local `deparsedExpected(table:
    string, bytes: string): Promise<string>`. In ONE `db.transaction`, it
    runs:" → The "R3.4 helper" bullet above (`schema` parameter, every
    statement on `tx`).
15. `:1844-1845` — "Assertion: `expect(live.expression).toBe(await
    deparsedExpected(member.table, bytes))`, with no whitespace collapsing."
    → `deparsedExpected(schema, member.table, bytes)`, as above.
16. `:1866` (outbox row) — Delivered by: "R1 items 1, 10 and R2.2" →
    row 4 (R2.2 including set-based seeding).
17. `:1867` (perf row) — Delivered by: "R1 items 1, 11"; Clears when:
    "those items landed; part-1 row under `M-ambient` passes" → row 5
    (items 1, 11, 13, 14, 15; never items 1 and 11 alone).
18. `:1870` (V5-5 (a) row) — Delivered by: "R2 (first note), R2.2, R2.3";
    Clears when: "all five worker branches pass in the FINAL lane-runner
    run: catalog and parity online-index legs, outbox plan leg, concurrency
    revision race, concurrency apply-owner race" → row 8.
19. `:1873-1874` — "**V5-5 (a)** as a whole also needs the orchestrator's
    dispositions of **O3** and **O5**. 05-L01 cannot close those." → The
    dispositions exist (**E2**). The closing condition is the sentence under
    the table above.
20. `:1877-1878` — "The five-file R1/R2/R3 edit, plus the R2.3 branch in
    `task551ConcurrencyConstraints.test.ts`, is one 05-L01 test-only
    change." → The land order restated above.

**Retained, not re-quoted.**
- First note `:1412-1415` (HEAD `:1408-1411`) was already superseded by the
  second note's item 9. That replacement concerns the catalog and parity
  legs only and stays binding. The concurrency and outbox legs are governed
  by R2.2 and R2.3 as amended here.
- The second note's R1 item 11 (`relation_size_row_missing`, no
  `?? { bytes: 0 }`), R1 item 12's ordering and gating, the F3 limits, R2.4's
  other rows, and **O3**-**O5** stay binding.
