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

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Schema:** `core/db/schema.ts`, `core/db/schema/auth.ts`,
`core/db/schema/content.ts`, `core/db/schema/operations.ts`,
`core/db/schema/engagement.ts`, `core/db/schema/commerce.ts`, and
`core/db/schema/analytics.ts`, plus
`core/db/schema/searchVectors.ts` and
`core/db/schema/cacheInvalidationOutbox.ts`.

**Tests:** `tests/vitest/db/schemaExports.test.ts`,
`tests/vitest/db/searchVectorDefinitions.test.ts`,
`tests/integration/server/task551SchemaMigrationParity.test.ts`,
`tests/integration/server/task551SearchVectorMigration.test.ts`,
`tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts`,
`tests/integration/server/task551IndexAndConstraintCatalog.test.ts`,
`tests/integration/server/task551OnlineIndexDeployment.test.ts`, and
`tests/perf/database-index-write-overhead.test.ts`.

**Migration:** exactly one next-free transactional SQL file with suffix
`_task551_schema_search_indexes_constraints_outbox.sql`, its exact matching
`meta/*_snapshot.json`, and the fresh `meta/_journal.json` entry. The same writer
also owns the same-ID non-transactional companion with suffix
`_task551_online_indexes.sql`, `scripts/task-551-online-indexes.ts`, and
`tests/perf/fixtures/task551OnlineIndexManifest.ts`. After generation, the tool's
`resolve-receipt` command re-reads the journal and resolves the unique exact
migration ID and paths; no human-entered migration-number placeholder is
accepted. The companion is part of the same migration deployment contract but
is deliberately absent from the transactional Drizzle journal; it may contain
only the closed snapshot-owned index set rendered as `CREATE [UNIQUE] INDEX
CONCURRENTLY` plus matching guarded drop/retry operations.

The task-owned filesystem mirror is exactly
`.tmp/task551-migration-receipt.json` and is not committed. Its strict version-2
state is also stored in the migration-created
`task551_migration_operations` table from `schema/operations.ts`. It records
artifact identities/digest, preflight digest and selected classification/budgets,
direction, admission mode, adapter executable digest, drain nonce and nonce-
bound acknowledgements, transactional state, ordered forward/reverse group and
member progress, catalog digests, resume authorization/completion, generation,
and previous-state digest. Unknown fields, ambiguous suffix matches, non-fresh
journal state, path escape, missing file, ID mismatch, generation regression, or
hash drift fails `task551_migration_receipt_invalid` before database DDL.

Before the transactional migration creates the receipt table, the crash-safe
filesystem record is authoritative. The phase-2 transaction creates the table
and inserts the operation row atomically with expand DDL. Thereafter the DB row
is authoritative and every transition is a generation compare-and-swap followed
by an atomic `0600` temp-file write, file `fsync`, rename, and directory `fsync`.
A behind mirror is repaired from the DB after validating the digest chain; an
ahead/conflicting mirror fails closed. Reverse execution uses the DB row until
the transaction that drops this task-owned table; its prior durable
`reverse_transaction_pending` filesystem state plus exact live-catalog probe
then distinguishes not-started from committed and completes recovery. A crash at
any persistence boundary is tested; progress is never reset or inferred from an
unchecked file alone.

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
  changes are allowed.

## Locked Rollout Orchestrator, Admission, and Budgets

This migration is executed only by one resumable command:

`bun scripts/task-551-online-indexes.ts rollout-forward --receipt .tmp/task551-migration-receipt.json --admission-mode <external|offline-single>`

`rollout-reverse` is the only reverse command and `status` is read-only. Generic
`bun run db:migrate`, `drizzle-kit migrate`, startup migration, direct SQL, and
the former split `resolve-receipt`/`apply-resume-check` sequence are not valid
TASK-551 rollout paths. The transactional SQL begins with a guard requiring the
same operation UUID in the session GUC `coderso.task551_operation_id` and an
L02-owned `coderso:migration:<operationId>` `application_name`; generic migrators
fail before DDL. The orchestrator creates one max-1 migration client with that
name, sets the GUC, verifies TASK-551 is the only pending journal member, and
invokes the installed `drizzle-orm/postgres-js/migrator` API over the resolved
artifact. It never spawns a shell or delegates phase 2 to an opaque command.

The command holds one dedicated TASK-551 advisory-lock session for its complete
run and follows this exact state machine:

1. **Resolve/classify/preflight.** Resolve/harden/hash the exact migration,
   snapshot, online SQL, manifest, and current journal; reject any other pending
   migration. Capture exact row/byte counts, free disk, replication lag, oldest
   transaction, duplicate revisions, invalid windows, and overlapping active
   bookings into a canonical preflight digest. Free disk is at least `2.5 *` the
   combined touched size; lag `<=5s`; oldest transaction `<=30s`. `small` means
   every touched table `<=100,000` rows and `<=256 MiB` and combined size
   `<=1 GiB`; otherwise `large`. Select and persist lock/statement/phase budgets:
   lock 2s in both classes, statement/transaction 30/120s small and 300/900s
   large, online member 30 minutes and combined 2 hours. A resumed command must
   reproduce the artifact and preflight identity or stop before transition.
2. **Stop admission and drain.** `external` mode is mandatory when configured
   replica count exceeds one or autoscaling/scale-to-zero is enabled. Resolve the
   adapter only from `TASK551_ADMISSION_ADAPTER`: absolute regular executable,
   owner-executable, not group/world writable, SHA-256 pinned into the receipt.
   Runtime and worker target counts come separately from L02's strict
   `CODERSO_RUNTIME_REPLICA_COUNT` (`1..256`) and
   `CODERSO_WORKER_REPLICA_COUNT` (`0..256`); neither is inferred from the other.
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
   dedicated migration client to apply the guarded transactional artifact with
   selected `lock_timeout`, `statement_timeout`, and whole-phase cancellation.
   That same transaction creates `task551_migration_operations`, inserts the
   version-2 row, applies columns/tables/checks/generated backfill/exclusion DDL,
   and marks `transaction_applied`. Timeout/signal rolls back. Recovery probes
   both journal and receipt-table/catalog identity; it reruns only when nothing
   committed and never assumes success from the filesystem mirror.
5. **Drained revision-integrity group.** Keep admission stopped and workers
   drained. In exact order build
   `page_revisions_page_version_idx`,
   `content_revisions_entry_version_idx`, and
   `widget_template_revisions_template_version_idx` using top-level autocommit
   `CREATE UNIQUE INDEX CONCURRENTLY`. Before/after each member CAS-persist state;
   require byte-identical definition plus `indisready/indisvalid=true`. Sixteen
   writer probes per family remain rejected before SQL. Valid identical members
   skip; task-owned invalid residue drops concurrently then rebuilds; a wrong
   valid/foreign object fails. Only the durable group barrier authorizes resume.
6. **Drained online read-performance group.** Admission and workers remain
   stopped; the old pre-TASK-551 binary is never resumed. Build every remaining
   ordered member with per-member CAS receipts. Rehearsal/perf fixtures—not live
   customer rows—run 16 controlled writers and prove zero invariant/deadlock and
   `<=20%` p95 regression. The live rollout performs no synthetic data mutation.
7. **Final gate and resume the compatible binary.** Verify schema/snapshot/
   manifest/live-catalog parity and every member ready/valid, then validate the
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
   Persist `resume_completed` only after this acknowledgement, then
   `forward_ready`. In `offline-single`, persist only
   `operator_resume_authorized`; the tool never starts a process, and the
   operator may start exactly one compatible new binary only after successful
   command exit. If compatibility evidence is absent, admission stays stopped.

`offline-single` is allowed only when validated replica count is exactly one,
autoscaling is false, and exact environment confirmation
`TASK551_OFFLINE_SINGLE_ACK=all-coderso-processes-stopped` is present. It invokes
no external adapter and is valid only as a cold upgrade: the same 5-second DB
quiescence proof must pass before phase 2, no app/worker/maintenance session may
appear before command completion, and the tool merely authorizes the operator's
post-exit start. This is the exact local/small-site path, not a claim that a
process was remotely resumed.

Pre-cutover `rollout-reverse` requires a fresh drain (even if forward receipt
says stopped), a nonce-bound reverse authorization, and proof no new binary ever
accepted traffic. It reverses online members in recorded dependency-safe order
with top-level `DROP INDEX CONCURRENTLY`, persists each reverse member, then sets
`reverse_transaction_pending` and reverses the transactional artifact including
the receipt table and exclusion `.dropSql`, deliberately preserving `btree_gist`.
After commit it uses the filesystem pending state plus exact catalog/journal
probe to mark `reverse_complete`. After any new binary traffic acknowledgement,
reverse is forbidden and the path is forward-fix only. Resume/reverse tests kill
the process after every state transition, adapter boundary, transaction commit,
group barrier, and member in both directions; no recovery path resumes admission
before authorization or loses ordered progress.

## Implementation Pseudocode

```ts
export { users, roles, sessions, apiKeys, passwordResets } from "./schema/auth";
export { pages, pageRevisions, contentEntries, contentRevisions, posts, postRevisions } from "./schema/content";
export { cacheInvalidationOutbox } from "./schema/cacheInvalidationOutbox";
export { BOOKING_RESERVATION_EXCLUSION_SQL } from "./schema/engagement";
// operations, engagement, commerce, analytics retain the complete old surface.

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

// Exported from schema/engagement.ts. The installed Drizzle DSL cannot express
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
    transactionTimeoutMs: 120_000 | 900_000 };
  admission: {
    mode: "external" | "offline-single";
    runtimeReplicaCount: number; workerReplicaCount: number;
    adapterSha256: string | null;
    drainNonce: string; prepareAckSha256: string | null;
    quiescentFrom: string | null; quiescentUntil: string | null;
    resumeNonce: string | null; resumeAuthorizationSha256: string | null;
    resumeAckSha256: string | null;
    resumeBinarySha256: string | null;
    revisionWriterCompatibilitySha256: string | null;
  };
  transaction: { apply: "pending" | "applied" | "reversed";
    catalogSha256: string | null };
  groups: readonly [
    { name: "revision-integrity"; members: readonly [
      "page_revisions_page_version_idx",
      "content_revisions_entry_version_idx",
      "widget_template_revisions_template_version_idx",
    ]; complete: boolean; completedAt: string | null },
    { name: "read-performance"; members: readonly string[];
      complete: boolean; completedAt: string | null },
  ];
  forwardMembers: readonly OnlineIndexMemberReceipt[];
  reverseMembers: readonly OnlineIndexMemberReceipt[];
  finalCatalogReady: boolean;
}>;

async function rolloutTask551Migration(
  direction: "forward" | "reverse",
  receiptPath: ".tmp/task551-migration-receipt.json",
  deps: RolloutDeps,
): Promise<Task551MigrationReceipt> {
  const receipt = await reconcileDbAndFilesystemReceipt(receiptPath, deps);
  await deps.advisoryLock.withDedicatedSession(async migrationSession => {
    await verifyArtifactsAndPreflight(receipt, migrationSession);
    await stopAdmissionAndProveQuiescence(receipt, migrationSession, deps.execFile);
    if (direction === "forward") {
      await applyTransactionalArtifactWithGuard(receipt, migrationSession);
      await applyOnlineGroup(receipt, "revision-integrity", migrationSession);
      await applyOnlineGroup(receipt, "read-performance", migrationSession);
      await verifyAndPersistFinalCatalog(receipt, migrationSession);
      await authorizeAndResumeCompatibleBinary(receipt, deps.execFile);
    } else {
      await assertPreCutoverReverseAllowed(receipt, migrationSession);
      await reverseOnlineMembers(receipt, migrationSession);
      await reverseTransactionalArtifactAndRecoverFilesystem(receipt, migrationSession);
    }
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
`page_revisions_page_version_idx(page_id,version)`,
`content_revisions_entry_version_idx(entry_id,version)`, and
`widget_template_revisions_template_version_idx(template_id,version)`; preserves
existing `post_revisions_post_version_idx(post_id,version)` and
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

- Snapshot all pre-split public exports and table/column/index/FK/default names;
  prove split-only state is byte/DDL equivalent and imports remain stable.
- Clean and prior-version databases migrate to equivalent catalogs; migration
  rollback/recovery and forward-reapply procedures are exercised on disposable
  fixtures, including exact custom exclusion add/drop SQL and preservation of
  the shared extension. Each fixture first resolves its exact artifact receipt,
  then runs `apply-resume-check`; the command must apply before it checks. A
  second identical invocation performs zero DDL and proves completed-receipt
  resume/catalog idempotence.
- Small/large boundary fixtures pin every numeric deployment ceiling. Kill the
  deployer after each transactional phase and each online index member; reruns
  resume idempotently, repair only owned invalid residue, and never duplicate or
  silently accept a wrong index. Reverse recovery is likewise resumable.
- The online manifest has exact one-to-one parity with all new snapshot-owned
  indexes. Its statements are sequential top-level `CREATE [UNIQUE] INDEX
  CONCURRENTLY`; the transactional migration contains none. Its immutable first
  group/order is the three new revision unique indexes. During those builds,
  16 synchronized page/content/widget writer probes are rejected before SQL and
  the old application remains drained. Only after all three are durably
  ready/valid may resume occur; a 50-way same-parent/current-max race then proves
  zero duplicate version. During every remaining build, 16 concurrent writers
  stay correct with zero invariant error/deadlock and at most 20% p95 regression.
  Crash injection before/after each group receipt proves no resume window.
- Catalog tests pin exact index column order, sort/null order, predicates,
  opclasses, constraint names/definitions, generated search expressions, and
  extensions. They explicitly pin `pages_author_list_updated_id_idx`,
  role-leading `user_roles_role_user_idx`, and both `jsonb_path_ops` tag GIN
  indexes against their L03 parameterized `@>` predicate bytes.
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
- Write benchmark covers inserts/updates at representative scale and fails above
  20% p95 regression or the L01 storage budget. It reports the incremental
  storage/write cost of the page-author, role-leading, post-tag, and media-tag
  indexes separately rather than hiding them in an aggregate.
  It also reports `cache_outbox_unprocessed_age_idx` storage and insert,
  claim/retry, completion-update p95 deltas separately; each must stay within
  the same 20% representative-write ceiling.

## Security Contract

- Database schema/migration only; no endpoint, auth, RBAC, CSRF, rate-limit,
  nonce/HMAC, or CAPTCHA changes.
- Constraints reinforce authorization-independent data integrity but do not
  replace route/service permission checks.
- Migration diagnostics include counts/IDs only when synthetic; production
  guidance must never emit customer fields, binds, tokens, hashes, or secrets.
- The task receipt contains only repository-relative artifact paths, digests,
  fixed catalog identifiers, numeric budgets, and completion state. It contains
  no connection URL, credentials, SQL binds, customer rows, or environment dump.

## Validation Commands

- `bunx vitest run tests/vitest/db/schemaExports.test.ts`
- `bunx vitest run tests/vitest/db/searchVectorDefinitions.test.ts`
- `set -a && source .env && set +a && bun run db:generate`
- `set -a && source .env && set +a && bun scripts/task-551-online-indexes.ts resolve-receipt --output .tmp/task551-migration-receipt.json`
- `set -a && source .env && set +a && bun run db:migrate`
- `set -a && source .env && set +a && bun test tests/integration/server/task551SchemaMigrationParity.test.ts tests/integration/server/task551SearchVectorMigration.test.ts tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts tests/integration/server/task551IndexAndConstraintCatalog.test.ts tests/integration/server/task551OnlineIndexDeployment.test.ts tests/perf/database-index-write-overhead.test.ts`
- `set -a && source .env && set +a && bun scripts/task-551-online-indexes.ts apply-resume-check --receipt .tmp/task551-migration-receipt.json --through-group revision-integrity`
- `set -a && source .env && set +a && bun scripts/task-551-online-indexes.ts apply-resume-check --receipt .tmp/task551-migration-receipt.json`
- `set -a && source .env && set +a && bun scripts/task-551-online-indexes.ts apply-resume-check --receipt .tmp/task551-migration-receipt.json` (mandatory idempotent resume rerun; zero DDL, full ready/valid catalog recheck)
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
- Clean/prior migrations both pass, generated artifacts are complete, and a
  fresh `db:generate` produces no unexplained drift. The one documented
  snapshot limitation is protected by the exact exported exclusion descriptor,
  migration containment, live-catalog parity, rollback/forward rehearsal, and
  a zero-drop generation guard.
- All new snapshot-owned indexes are created only by the non-transactional
  companion and finish ready/valid within the 30-minute/member and 2-hour phase
  ceilings. Crash/resume and reverse rollback receipts are idempotent, and the
  new application is never admitted before the exact catalog gate passes.
- The old `max(version)+1` writers remain drained until all three missing
  revision unique indexes are durably ready/valid. No crash point admits one of
  those writers earlier, and the immediate 50-way post-resume races create zero
  duplicate versions.
- Write p95 regression is at most 20%; duplicate versions and overlapping active
  bookings are rejected in 100% of race fixtures.
