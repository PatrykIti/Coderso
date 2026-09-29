# TASK-551-02-L02: Pool Lifecycle, Timeouts, and Sanitized Query Telemetry
# FileName: TASK-551-02-L02-Pool-Lifecycle-Timeouts-And-Sanitized-Query-Telemetry.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-02
**Priority:** High
**Category:** Database / Infrastructure / Observability
**Estimated Effort:** Medium
**Dependencies:** TASK-551-02-L01
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Apply the validated config to postgres.js, create the optional direct/session-
pooled maintenance channel, verify physical-session affinity, set bounded
timeouts, expose one idempotent lifecycle close path, and collect query-family/
pool metrics without leaking SQL binds or credentials.

## Sub-Tasks

None; this is an executable leaf.

## File Ownership

**Allowlist:** `core/db/client.ts`, `core/db/databaseLifecycle.ts`,
`core/db/databaseApplicationIdentity.ts`,
`core/db/queryFingerprintRegistry.ts`, `core/db/queryTelemetry.ts`, `core/server/runtimeLifecycle.ts`,
`core/server/runtimeEntrypoint.ts`, `core/server/prod.ts`, `core/server/dev.ts`,
`scripts/task-551-pg-stat-interval.ts`,
`tests/vitest/db/queryFingerprintRegistry.test.ts`,
`tests/vitest/db/databaseApplicationIdentity.test.ts`,
`tests/integration/server/task551DatabaseLifecycle.test.ts`,
`tests/integration/server/task551RuntimeEntrypoints.test.ts`,
`tests/perf/database-pg-stat-interval.test.ts` only.

**Forbidden:** `tests/perf/database-pool-telemetry.test.ts` (the sole L03 test
owner); schema/migrations; service/route behavior; TASK-511 backup and scheduler
source; TASK-517 entry/public source; TASK-493 SEO source; cache/Redis 07/08
paths; task/changelog/workflow files. L02 must not add telemetry wrappers to
caller sources: each reviewed caller remains owned by its domain leaf. L03 may
read L02's public APIs but may not edit any file in this L02 allowlist.

## Implementation Pseudocode

```ts
const config = parseDatabaseRuntimeConfig(process.env);
const fleet = config.fleet; // sole parse performed by L01's config owner
const identity = parseDatabaseApplicationIdentity(process.env, fleet);
const sqlClient = postgres(requireDatabaseUrlRedacted(), {
  max: config.poolMax,
  connect_timeout: config.connectTimeoutSeconds,
  idle_timeout: config.idleTimeoutSeconds,
  max_lifetime: config.maxLifetimeSeconds,
  prepare: config.pgbouncerMode !== "transaction",
  connection: {
    application_name: buildDatabaseApplicationName(identity.processKind, identity.replicaId),
    // postgres.js sends these startup parameters on every new physical session.
    statement_timeout: config.statementTimeoutMs,
    lock_timeout: config.lockTimeoutMs,
    idle_in_transaction_session_timeout: config.idleInTransactionTimeoutMs,
  },
});
export const db = drizzle(sqlClient, { schema });

const maintenanceSqlClient = config.maintenanceMode === "primary"
  ? sqlClient
  : postgres(requireMaintenanceDatabaseUrlRedacted(), {
      max: config.maintenancePoolMax, // >= 2: lock owner + independent verifier
      connect_timeout: config.connectTimeoutSeconds,
      idle_timeout: config.idleTimeoutSeconds,
      max_lifetime: config.maxLifetimeSeconds,
      prepare: config.maintenanceMode === "direct",
      connection: {
        ...sameBoundedStartupTimeouts(config),
        application_name: buildDatabaseApplicationName("maintenance", identity.replicaId),
      },
    });

export async function assertMaintenanceSessionAffinity(): Promise<void> {
  // Idempotent per lifecycle generation. Fail with the stable
  // database_maintenance_session_unavailable code for transaction+primary,
  // fewer than two available physical sessions, failed probe, or pool outage.
  // Reserve an owner and independent verifier from maintenanceSqlClient. The
  // owner takes a task-scoped session advisory lock and records its backend PID;
  // two separate owner transactions must retain that PID and lock. The verifier
  // must have a different PID and must fail pg_try_advisory_lock while the owner
  // holds it. Unlock on the owner's same PID and release/cancel both sessions in
  // finally. A verifier that re-enters the lock exposes transaction pooling and
  // fails the probe after balancing that re-entrant acquisition.
}

type RuntimeLifecyclePhase = "database" | "cache" | "worker";
type RuntimeCloseContext = Readonly<{
  absoluteDeadline: number;
  signal: AbortSignal;
}>;
type RuntimeLifecycleParticipant = Readonly<{
  id: string;
  phase: RuntimeLifecyclePhase;
  start: () => Promise<void>;
  close: (reason: ShutdownReason, context: RuntimeCloseContext) => Promise<void>;
}>;

registerRuntimeLifecycleParticipant({
  id: "database",
  phase: "database",
  start: async () => {
    await verifyDatabaseSessions();
    // Ordinary primary-mode startup never consumes a second connection merely
    // to prove an unused maintenance capability. Explicit dedicated modes are
    // infrastructure declarations and fail fast here.
    if (config.maintenanceMode !== "primary")
      await assertMaintenanceSessionAffinity();
  },
  close: async (_reason, context) =>
    closeAllDatabaseClientsWithinAbsoluteDeadline(context.absoluteDeadline),
});

// prod.ts and dev.ts both delegate to this one runtimeEntrypoint.ts owner. It
// installs exactly one temporary SIGINT/SIGTERM pair before startup, removes it
// in finally, and never calls process.exit from a handler.
await runRuntimeEntrypoint({
  registerModeParticipants: mode === "development"
    ? () => registerViteSidecarLifecycleParticipant({
        start: startViteSidecars,
        close: closeViteSidecarsBounded,
      })
    : undefined,
  startServer: () => startHttpServer({ port, adminDevUrl }),
});

async function runRuntimeEntrypoint(input: RuntimeEntrypointInput): Promise<void> {
  const signal = createOneShotShutdownSignal();
  let server: HttpServerHandle | null = null;
  let lifecycleStarted = false;
  try {
    // Registration is side-effect-free. In development the awaited Vite child
    // start/close callbacks are lifecycle participants, not post-listen work.
    input.registerModeParticipants?.();
    await startRuntimeLifecycle();
    lifecycleStarted = true;
    if (signal.alreadyReceived()) {
      await closeRuntimeLifecycle(signal.reason());
      lifecycleStarted = false;
      return; // never open a listener after an in-startup signal
    }
    server = input.startServer(); // all awaited participants are running first
    const reason = await signal.wait(); // explicit running boundary
    await stopAcceptingAndDrainHttp(server, {
      gracefulMs: HTTP_DRAIN_DEADLINE_MS,
      force: true,
    });
    server = null;
    await closeRuntimeLifecycle(reason); // worker -> cache -> database
    lifecycleStarted = false;
  } catch (error) {
    // startRuntimeLifecycle owns partial-start rollback. If listen or later work
    // fails, stop any opened listener before closing every started participant.
    if (server) await stopAcceptingAndDrainHttpBestEffort(server);
    if (lifecycleStarted) await closeRuntimeLifecycle("startup_failure");
    throw sanitizeRuntimeEntrypointError(error);
  } finally {
    signal.dispose();
  }
}

export type DedicatedDatabaseTransaction = DrizzleTransactionBoundToReservedSql;
export type DedicatedCancelReason = ShutdownReason | "lease_release" | "retention_lock_lost";
export type DedicatedDatabaseSession = Readonly<{
  execute<T>(statement: StaticDedicatedStatement<T>, signal: AbortSignal): Promise<T>;
  transaction<T>(input: {
    signal: AbortSignal;
    statementTimeoutMs: number;
    run: (tx: DedicatedDatabaseTransaction) => Promise<T>;
  }): Promise<T>;
  assertAlive(signal: AbortSignal): Promise<void>;
  cancelActiveAndRollback(reason: DedicatedCancelReason): Promise<
    "rolled_back" | "connection_terminated"
  >;
}>;

export async function withDedicatedDatabaseSession<T>(
  run: (session: DedicatedDatabaseSession) => Promise<T>
): Promise<T> {
  await assertMaintenanceSessionAffinity();
  const reserved = await reserveWithValidatedDeadline(maintenanceSqlClient);
  const session = createTrackedDedicatedSession(reserved);
  try { return await run(session); }
  finally {
    // Never return a connection with active SQL/open transaction to the pool.
    await session.cancelActiveAndRollback("lease_release");
    await releaseDedicatedSessionExactlyOnce(reserved);
  }
}

export type DedicatedAdvisoryLockInput<T> = Readonly<{
  key: bigint;
  signal: AbortSignal;
  conflictCode: string;
  run: (session: DedicatedDatabaseSession) => Promise<T>;
}>;

export async function withDedicatedDatabaseAdvisoryLock<T>(
  input: DedicatedAdvisoryLockInput<T>
): Promise<T>;

async function closeAllDatabaseClientsWithinAbsoluteDeadline(
  absoluteDeadline: number,
): Promise<void> {
  // The database phase is the sole 5-second participant-limit exemption. Give
  // the distinct set {maintenanceSqlClient, sqlClient} at most
  // min(10_000, absoluteDeadline-now) total, start their postgres.js end calls
  // together, and await all terminal outcomes. At the absolute deadline invoke
  // the driver's supported forced cancellation/termination path and await its
  // terminal confirmation. Never use Promise.race in a way that leaves end(),
  // rollback, or socket teardown running detached.
}

type DatabaseQueryMetricSample = StrictReadonly<{
  family: QueryFamily;
  fingerprint: QueryFingerprint;
  durationBucket: QueryDurationBucket;
  outcome: QueryOutcome;
  rowsReturnedBucket: RowsReturnedBucket;
}>;

export const QUERY_FAMILIES = strictReadonly([
  "point", "list", "search", "aggregate", "append", "maintenance",
] as const);
export const QUERY_OUTCOMES = strictReadonly([
  "success", "domain_error", "timeout", "cancelled", "driver_error",
] as const);
export const QUERY_DURATION_BUCKET_MAX_MS = strictReadonly([
  1, 5, 10, 25, 50, 100, 250, 500, 1_000, 5_000, 15_000,
] as const); // plus one overflow bucket
export const ROWS_RETURNED_BUCKET_MAX = strictReadonly([
  0, 1, 10, 50, 100, 500, 1_000, 10_000,
] as const); // plus one overflow bucket
export const POOL_WAIT_BUCKET_MAX_MS = strictReadonly([
  1, 5, 10, 25, 50, 100, 250, 500, 1_000, 2_000,
] as const); // plus one overflow bucket
export const POOL_OUTCOMES = strictReadonly([
  "available", "saturated", "timeout", "driver_error",
] as const);
// Ceiling must cover the full reviewed 1,065-key TASK-551-01 receipt with
// headroom; 512 was a pre-review estimate superseded by contract correction
// of 2026-08-26.
export const MAX_QUERY_FINGERPRINTS = 2048;
export const MAX_COUNTER_VALUE = Number.MAX_SAFE_INTEGER;

// Pure production module: no DB/runtime/env/test-fixture import.
export const TASK551_QUERY_FINGERPRINT_DEFINITIONS = strictReadonly({
  /* closed reviewed key -> { value, normalizedQuerySha256[], sourceClass }
     map; digests are lowercase SHA-256 of the code-owned PostgreSQL-normalized
     statement shape and never the SQL or a bind value */
});
export const TASK551_QUERY_FINGERPRINTS = mapFingerprintValues(
  TASK551_QUERY_FINGERPRINT_DEFINITIONS,
);
export type QueryFingerprintKey = keyof typeof TASK551_QUERY_FINGERPRINTS;
export type QueryFingerprint = (typeof TASK551_QUERY_FINGERPRINTS)[QueryFingerprintKey];

type DatabaseTelemetrySnapshot = StrictReadonly<{
  queries: readonly DatabaseQueryMetricAggregate[];
  pool: readonly DatabasePoolMetricAggregate[];
}>;

export type DatabaseTelemetrySink = Readonly<{
  observeQuery(sample: DatabaseQueryMetricSample): void;
  observePool(sample: PoolHealthSample): void;
  snapshot(): DatabaseTelemetrySnapshot;
  reset(): void;
}>;

export const databaseTelemetry: DatabaseTelemetrySink =
  createBoundedDatabaseTelemetrySink({
    queryFamilies: QUERY_FAMILIES,
    fingerprints: TASK551_QUERY_FINGERPRINTS,
    durationBucketMaxMs: QUERY_DURATION_BUCKET_MAX_MS,
    rowsReturnedBucketMax: ROWS_RETURNED_BUCKET_MAX,
    poolWaitBucketMaxMs: POOL_WAIT_BUCKET_MAX_MS,
  });

export async function measureDatabaseQuery<T>(input: {
  family: QueryFamily;
  fingerprint: QueryFingerprint; // canonical production-registry value
  run: () => Promise<T>;
  rowsReturned: (result: T) => number;
}, sink: DatabaseTelemetrySink = databaseTelemetry): Promise<T> {
  // Measure wall duration/outcome around this opted-in operation. Convert the
  // trusted result count to a closed bucket, then best-effort observe an
  // aggregate. Sink/counting failure is redacted and never changes the domain
  // result or error. SQL text, binds, URLs and free-form labels are not accepted.
}

export async function probeDatabasePoolHealth(
  sink: DatabaseTelemetrySink = databaseTelemetry
): Promise<PoolHealthSample> {
  // Independently time acquisition of one dedicated reserved session under a
  // validated deadline, bucket the wait/saturation outcome, release in finally,
  // and best-effort record the closed aggregate without changing probe outcome.
}
```

`databaseApplicationIdentity.ts` is a pure Bun/DB-free owner used by runtime,
workers, maintenance, and TASK-551-05's rollout tool. It accepts the already
parsed L01 `DatabaseFleetConfig`; it must not parse or default either count.
Its remaining strict environment contract is exact:

- `CODERSO_DB_PROCESS_KIND=runtime|worker`, default `runtime`;
- `CODERSO_DB_REPLICA_ID`, globally unique across runtime and worker arrays,
  matches `[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?`; default `replica-1` is legal
  only for the default one-runtime/zero-worker fleet;
- L01's fleet is exactly runtime `1..256`, worker `0..256`; process kind
  `worker` requires `workerProcessCount >= 1`. Any non-default fleet requires an
  explicit replica ID; unknown/coerced/whitespace/case-variant values fail.
  Tests fail if config, identity, adapter array lengths, or migration receipt
  counts do not have exact `DatabaseFleetConfig` equality.

`buildDatabaseApplicationName(kind,identity)` accepts closed kind
`runtime|worker|maintenance|migration`. Runtime, worker, and distinct maintenance
sessions are exactly `coderso:<kind>:<replicaId>`; the migration identity is a
canonical lowercase UUID and renders `coderso:migration:<operationId>`. Every
result is ASCII and at most PostgreSQL's 63-byte limit. Primary-mode maintenance
shares the already named runtime/worker connection and is not renamed mid-
session. No hostname, tenant, URL, credential, user input, or random suffix may
enter a name. The rollout tool imports only this pure module, never `client.ts`.
L05 uses these same two parsed fleet counts for adapter-array cardinality
and these names for fail-closed `pg_stat_activity` drain proof.

These are closed registries, not examples. `queryFingerprintRegistry.ts` fails
module validation if the reviewed map exceeds `MAX_QUERY_FINGERPRINTS` (2048
after the 2026-08-26 correction below; it must cover the full reviewed receipt
with headroom), contains duplicate values, or contains a member outside the
initial TASK-551-01 receipt.

### Contract correction (2026-08-26)

- The reviewed TASK-551-01 inventory fixture contains exactly **1,065**
  distinct fingerprint rows (independently verified against
  `tests/perf/fixtures/task551QueryInventory.ts`). The original
  `MAX_QUERY_FINGERPRINTS = 512` was a pre-review estimate and is stale. This
  contract now pins `MAX_QUERY_FINGERPRINTS = 2048`, and the registry enforces
  exact-set closure against the reviewed 1,065-key receipt: no key may be
  added, removed, or duplicated without a new reviewed receipt.
- The prior L02 pass exported `normalizedQuerySha256` digests that were
  deterministically derived from the reviewed fixture (not independently
  human-reviewed). Final TASK-551-01-L01 exact-set verification must confirm
  or replace those digests before the TASK-551-01 receipt is promoted.

Every observation validates family, fingerprint, outcome, and bucket before it
touches storage; an unknown member is rejected and allocates no label or counter.
The sink preallocates one fixed array per registered fingerprint with exactly
`6 × 5 × 12 × 9 = 3,240` query cells (the listed maxima plus the stated
overflow buckets) and one fixed pool array with exactly `11 × 4 = 44` cells.
Each counter saturates at `MAX_COUNTER_VALUE`; `reset()` writes every cell to
zero without replacing the registries. A successful acquisition waiting at
least 1,000 ms but less than the 2,000 ms deadline is exactly `saturated`; a
deadline win is `timeout`, a faster success is `available`, and a known driver
failure is `driver_error`.

The lifecycle constants are equally exact:

```ts
export const POOL_ACQUISITION_DEADLINE_MS = 2_000;
export const PARTICIPANT_CLOSE_DEADLINE_MS = 5_000; // non-database only
export const HTTP_DRAIN_DEADLINE_MS = 10_000;
export const GRACEFUL_SHUTDOWN_DEADLINE_MS = 15_000;
export const DATABASE_CLOSE_TIMEOUT_SECONDS = 10;
export const RETENTION_CANCEL_DRAIN_DEADLINE_MS = 4_500;
export const RETENTION_STATEMENT_TIMEOUT_MS = 4_000;
```

Every non-database participant receives a cancellation-aware ceiling of
`min(5_000, absoluteShutdownDeadline - now)`. Database close is the one explicit
exception: it receives `min(10_000, absoluteShutdownDeadline - now)` and remains
fully awaited/cancellable. The complete stop-accepting → worker → cache →
database sequence shares one absolute 15-second deadline; no nested outer
5-second race wraps the database close, and no timeout abandons a live promise.
The shared `runtimeEntrypoint.ts` owner starts
`server.stop(false)` and awaits it for at most 10 seconds in both production and
development; on that deadline it awaits `server.stop(true)` before lifecycle
close continues. `prod.ts` and `dev.ts` only supply mode dependencies and never
own drain/forced-stop behavior. Shutdown completion and forced-stop failures
remain bounded categories without raw error text.
`reserveWithValidatedDeadline` assigns an attempt token before racing reserve
against 2 seconds. If reserve fulfills after the deadline/shutdown won, its
continuation releases that session exactly once and never invokes `run`; the
normal path and every callback-error path also release exactly once. Timeout
timers are cleared on every settlement, and shutdown prevents new attempts.

The dedicated-session wrapper reserves only from `maintenanceSqlClient`, which
is the primary pool solely for `off + primary`; a transaction-pooled primary
returns `database_maintenance_session_unavailable`. `direct|session` use the
separate URL and pool budget from L01. Before any lease is exposed, the live
affinity probe must have proved that an owner survives two transaction
boundaries on one backend PID while an independent backend cannot acquire its
session lock. The successful probe is cached only for the current started
lifecycle and is cleared on close/restart; failures are never cached as success.
Primary mode does not probe at ordinary database-participant start: a pool of
one is valid when no session-affine consumer starts. The first enabled consumer
(L03 scheduler startup or a direct call to this wrapper) awaits the probe and
fails before work when the primary pool has fewer than two sessions. An explicit
`direct|session` selection is probed once at database startup; L03's later
assertion observes the same lifecycle-scoped successful promise/result and does
not perform a second physical probe.
The dedicated-session wrapper is connection-affine: `execute`, `assertAlive`,
every `transaction` callback, advisory-lock ownership, cancellation, rollback,
and final release use the same reserved physical PostgreSQL session. It tracks
the current postgres.js `PendingQuery` through its supported `cancel()` surface
without debug hooks or undocumented pool internals. Abort cancels active SQL
and awaits rollback; if rollback cannot be confirmed, the wrapper terminates
that reserved connection and waits for PostgreSQL to end its backend before it
resolves. Only `rolled_back|connection_terminated` is a successful drain.
Session loss rejects the active operation as
`dedicated_database_session_lost`, publishes no result, and never returns a
still-active lease to the pool.

`withDedicatedDatabaseAdvisoryLock` is the sole public owner for a consumer that
must hold a PostgreSQL session advisory lock across multiple transactions and
non-DB work. It first awaits the same lifecycle-scoped affinity proof, reserves
one maintenance session, executes one static parameterized
`pg_try_advisory_lock(key)`, and throws the caller's bounded `conflictCode`
without invoking `run` when false. It invokes `run` at most once with that same
session. In `finally`, it cancels/rolls back active work and executes one static
`pg_advisory_unlock(key)` on the same backend. Exact true permits normal release;
false, error, abort, session loss, or ambiguous result uses the owner's private
reserved-handle termination path, awaits backend disappearance, and never
returns that connection to a pool. Consumer code receives no raw reserved
handle, release, discard, terminate, or unlock primitive.

The helper obeys the terminal maintenance-mode matrix. `off + primary` requires
`DB_POOL_MAX >= 2` and the live affinity proof; `transaction + primary` is
unavailable. A `direct|session` maintenance mode uses its separately budgeted
URL/pool. A consumer that enables session-lock work under an incapable
configuration receives `database_maintenance_session_unavailable` before its
callback and must map that bounded code at its own boundary; no process mutex,
ordinary pooled query, or silent extra client is a fallback. The exact
`assertDedicatedDatabaseSessionBudget` helper additionally validates a
consumer's requested `lockOwners + workSessions + ordinaryHeadroom` budget
against the live mode and pool (for example the TASK-548 Guide ingest budget of
two dedicated sessions plus one ordinary-query headroom slot requires
`DB_POOL_MAX >= 3` under `off + primary`), so a session-affine consumer can
never starve ordinary primary queries or exceed the budgeted maintenance pool.

Do not issue a one-off `SET` query: it would configure only one checked-out
session and leave the rest of the pool unbounded. The fixed-name startup
parameters above apply to every initial and replacement physical connection.
`verifyDatabaseSessions()` validates ordinary primary connectivity and startup
parameters without assuming maintenance: at `poolMax=1` it reserves/tests one
session and never waits for a second; multi-session sampling is used only when
configured capacity is at least 2. It never calls the affinity seam.
`registerRuntimeLifecycleParticipant`, `startRuntimeLifecycle`, and
`closeRuntimeLifecycle` are the only registry API. The separate
`client.ts` exports `DedicatedDatabaseSession`,
`assertMaintenanceSessionAffinity()`, and
`withDedicatedDatabaseSession<T>(run)` plus
`withDedicatedDatabaseAdvisoryLock<T>(input)` and the exact public
`assertDedicatedDatabaseSessionBudget(input)` helper as the only supported
maintenance-connection boundaries. TASK-551-06-L03 consumes the session
wrapper; terminal
TASK-548-01-L03 consumes BOTH `withDedicatedDatabaseAdvisoryLock` and
`withDedicatedDatabaseSession`, plus `assertDedicatedDatabaseSessionBudget`,
without transferring source ownership of any of them.
The registry rejects
duplicate IDs/late registration, starts database → cache → worker exactly once,
rolls back already-started participants on failure, closes in reverse phase and
registration order, and memoizes concurrent close calls.
`runtimeEntrypoint.ts` owns the one process-signal/drain algorithm;
`prod.ts` and `dev.ts` are thin mode adapters and install no handlers of their
own. Their static `httpServer.ts` import evaluates route/composition modules
first; both then delegate to `runRuntimeEntrypoint`, which starts the lifecycle,
including every registered development Vite participant, before it accepts HTTP
traffic; it then waits for a signal, stops acceptance, drains/forces HTTP within
the exact ceilings, and awaits reverse lifecycle close. A participant failure or
signal received during startup prevents listen; a listen failure closes the
already-started lifecycle and leaves no listener or Vite child.
TASK-551-03-L02 registers the
cursor participant from `routes/index.ts` module evaluation. TASK-551-08-L03
must preserve that import/participant and may add cache, retention and backup
participant registration from its later sole `httpServer.ts` composition
ownership, but it may not edit `dev.ts`, `prod.ts`, or install another signal
owner. TASK-551-06-L03 and TASK-551-08-L03 import
the exact registry APIs and may not add signal handlers. TASK-551-06-L03 does
not own `dockerStart.ts` or any HTTP/development composition file.

Known timeout/cancel/deadlock errors map to bounded categories. Raw driver
message, statement text, bind values, and `DATABASE_URL` never enter logs.
postgres.js does not expose reliable driver-wide per-query row counts or pool
wait for every Drizzle call, so this contract makes no such claim:
`measureDatabaseQuery` covers only explicitly opted-in optimized callers, while
`probeDatabasePoolHealth` separately measures bounded reserved-session wait and
saturation. Neither uses undocumented driver internals or the debug callback as
a completion hook. This leaf transcribes TASK-551-01's reviewed initial mapping
once into `queryFingerprintRegistry.ts`; `queryTelemetry.ts` imports it and no
production file imports `tests/**`. Final 01-L01 dynamically imports and verifies
the registry, then removes its temporary mapping. Later callers consume the
branded contract without editing telemetry. `databaseTelemetry` stores only fixed-cardinality aggregate
counters/buckets from those closed registries. `snapshot()` returns a frozen
bounded copy and `reset()` clears counters for deterministic tests/known
operations intervals; neither surface returns events, SQL, binds, driver errors,
URLs, or labels. Sink/snapshot/reset failure never changes an authoritative query
or probe result. No caller-derived SQL, route value, bind, URL, or free-form
label may become a fingerprint.

### Sanitized `pg_stat_statements` interval receipt

This leaf also owns an executable, read-only interval collector. It never calls
`pg_stat_statements_reset()` and never treats cumulative counters as a named
interval. The DB-profile operations run only through TASK-551-11's
`task551-db-test` capability, which supplies the private non-inherited binding;
their exact commands are:

```text
bun --env-file=/dev/null scripts/task-551-pg-stat-interval.ts start --name task551-predecision-clean --purpose pre-decision --snapshot .tmp/task551-pg-stat-task551-predecision-clean-start.json --operator-evidence .tmp/task551-pg-stat-operator-evidence.json
bun --env-file=/dev/null scripts/task-551-pg-stat-interval.ts end --name task551-predecision-clean --purpose pre-decision --start .tmp/task551-pg-stat-task551-predecision-clean-start.json --receipt .tmp/task551-pg-stat-task551-predecision-clean.json --operator-evidence .tmp/task551-pg-stat-operator-evidence.json
```

L05 runs the same pair with names `task551-index-before`/`before` and
`task551-index-after`/`after` around the identical synthetic workload. Paths are
exact `.tmp/task551-pg-stat-<name>-start.json` and
`.tmp/task551-pg-stat-<name>.json`; the tool rejects arbitrary output roots,
unknown flags, reused interval names, or mismatched purpose/name. Start must be
strictly after the operator evidence's `diagnosticsEndedAt`, so prioritization
always uses a fresh clean interval after diagnostic work.

```ts
type TrafficSourceClass =
  | "application" | "migration" | "maintenance"
  | "external_diagnostic" | "unknown";
type PgStatCounter = StrictReadonly<{
  queryId: string; // canonical signed bigint decimal
  calls: number; rows: number;
  totalPlanMs: number; totalExecMs: number;
}>;
type PgStatIntervalReceipt = StrictReadonly<{
  version: 1;
  name: "task551-predecision-clean" | "task551-index-before" | "task551-index-after";
  purpose: "pre-decision" | "before" | "after";
  start: { capturedAt: string; snapshotSha256: string };
  end: { capturedAt: string; snapshotSha256: string };
  statsReset: string;
  serverIdentitySha256: string;
  databaseIdentitySha256: string;
  extensionVersion: string;
  cleanAfterDiagnostics: true;
  deltas: readonly StrictReadonly<{
    queryId: string;
    fingerprintKey: QueryFingerprintKey | null;
    sourceClass: TrafficSourceClass;
    classificationEvidenceId: string;
    callsDelta: number; rowsDelta: number;
    totalPlanMsDelta: number; totalExecMsDelta: number;
  }>[];
  sourceClassTotals: Readonly<Record<TrafficSourceClass, {
    statements: number; calls: number; rows: number;
    totalPlanMs: number; totalExecMs: number;
  }>>;
  eligibleApplicationQueryIds: readonly string[];
  excludedQueryIds: readonly string[];
}>;
```

At both boundaries a max-1 client enters a read-only transaction, applies
`statement_timeout=5000`, selects at most the configured
`pg_stat_statements.max` rows for the current database, and closes fully. It
derives server/database identities in memory and stores only SHA-256 digests.
Start and end must have byte-equal server/database identity, PostgreSQL major,
extension version, and `pg_stat_statements_info.stats_reset`; a reset, restart,
counter decrease, query-ID reuse with incompatible metadata, or more than
10,000 rows fails `pg_stat_interval_invalid`. Snapshot JSON is strict,
canonical, bounded to 4 MiB, mode `0600`, and contains no statement text, bind,
role name, application name, URL, host, database name, error text, or row data.

Statement text is held only long enough in memory to normalize and SHA-256 it
against `TASK551_QUERY_FINGERPRINT_DEFINITIONS`. A safely dedicated database
role may supply a closed class mapping. `pg_stat_statements` does **not** retain
`application_name`; the receipt never claims otherwise. A contemporaneous
`pg_stat_activity.query_id` observation may record only the closed application-
name class as corroboration for that instant and cannot retroactively classify
historical calls. Unmatched rows remain `unknown` unless a strict operator-owned
classification object names the query ID, class, bounded evidence ID, purpose,
and canonical timestamp. Only that explicit evidence may mark
`external_diagnostic`; inference from slow duration or SQL appearance is
forbidden. Only `application` deltas are eligible for index/cache
prioritization. Migration, maintenance, external-diagnostic, and unknown totals
remain separately visible; external-diagnostic and unknown IDs are always in
`excludedQueryIds`.

The initial owner-supplied production sample is explicitly polluted: it contains
one cross-table whole-row text-regex diagnostic family plus four `access_logs`
column text-regex diagnostic families (ID, user-agent, user-ID, and path). A
repository-wide source scan found no matching application callsite. Because
historical application names are unavailable, the collector records those IDs
as `external_diagnostic` only with the operator evidence above and otherwise as
`unknown`; neither class can justify an application index. Operations guidance
forbids repeating an all-table/whole-row regex scan. A necessary diagnostic uses
explicit columns and selective predicates on a bounded read-only/maintenance
session with the 5-second timeout, preferably on a replica, followed by a new
clean named interval. Raw SQL, patterns, binds, rows, and customer data never
enter the receipt or task evidence.

## Testing Requirements

- With a test pool configured at least 2, real DB reserves at least two
  simultaneous physical connections, verifies the
  three startup timeout settings on both, replaces one connection, verifies the
  replacement, and exercises a deliberately bounded timeout cancellation.
- Identity tests cover every kind, default local fleet, min/max L01 fleet
  counts, exact config/identity equality, global-ID grammar, explicit multi-
  process requirement, runtime/worker count distinction,
  63-byte ceiling, unknown fields/values, and absence of URLs/credentials. Real
  sessions prove main/replacement/distinct-maintenance `application_name` values;
  primary maintenance retains its main name. A pure import opens zero DB clients.
- A separate `off + primary + DB_POOL_MAX=1` runtime fixture starts and closes
  the ordinary database lifecycle successfully with exactly zero affinity-probe
  or second-reservation attempts. Invoking `assertMaintenanceSessionAffinity`
  in that same fixture fails deterministically as
  `database_maintenance_session_unavailable` without damaging the ordinary
  client; raising capacity to 2 permits the probe.
- Lifecycle tests register fake database/cache/worker participants, assert
  awaited start order and reverse close order, HTTP starts only after the
  registry and stops before close, rollback after partial start,
  duplicate/late-registration rejection, and concurrent SIGTERM/SIGINT/shutdown
  calls invoking each close exactly once. They pin the 2,000/5,000/10,000/
  15,000-millisecond and 10-second ceilings, prove `server.stop(false)` is
  awaited, and prove the forced `server.stop(true)` branch is awaited. A clocked
  test consumes 10 seconds in HTTP drain and proves non-DB phases receive only
  remaining global time while DB is not wrapped in a 5-second race. Another
  gives DB the full remaining 10 seconds, forces at the absolute deadline, and
  proves both primary and distinct maintenance clients reach a terminal closed
  state with zero detached `end`/rollback/socket work.
- Entrypoint tests execute the real thin prod/dev adapters through injected
  server/sidecar fakes and prove exact mode-participant registration -> awaited
  lifecycle start (including Vite in development) -> listen -> await-signal ->
  stop-acceptance/drain -> reverse-lifecycle order. In both prod and dev, a
  participant/start failure opens zero listeners and leaves no active listener
  or child; a listen failure closes the already-started lifecycle and Vite child.
  Also cover a signal during startup (zero listens), SIGINT/SIGTERM coalescing,
  graceful and forced HTTP branches, startup failure rollback, listener
  disposal, and zero direct signal handlers/`process.exit` calls in prod/dev.
- L02's Vitest registry suite tests `measureDatabaseQuery` success/error/timeout
  and returned-row buckets through the closed API; the inventory/fingerprint set
  has exact coverage, cardinality remains fixed, and a secret sentinel cannot
  appear in metrics/log output. A throwing row counter or sink cannot replace
  the operation's value/error. L03 alone owns the real-pool Bun test and must
  not add or change a production caller.
- Registry tests pin closed key/value uniqueness, stable ordering, each
  lowercase normalized-query SHA-256 and closed source class, side-effect-free
  import, and zero production imports from `tests/**`; final 01-L01 owns
  independent exact-set verification. No statement text is exported.
- L03's sole real-pool test proves `probeDatabasePoolHealth` saturates only its
  test pool, records a bounded reservation-wait/saturation sample, releases
  every reserved session in `finally`, and returns to zero after drain. Neither
  leaf claims this is driver-wide per-query wait telemetry.
- Snapshot/reset tests pin the complete fixed bucket registry, frozen snapshots,
  the exact 3,240-cells-per-fingerprint and 44-cell pool bounds, saturating
  `Number.MAX_SAFE_INTEGER` counters, deterministic zeroed state after reset,
  rejection/no-allocation for every unknown enum/fingerprint, bounded memory
  independent of sample count, and best-effort behavior when an injected sink
  throws.
- Interval tests use synthetic `pg_stat_statements`/`pg_stat_activity` views and
  a disposable real extension to pin all three names/purposes, calls/rows/plan/
  exec-time deltas, unchanged reset/server/database/snapshot identity,
  10,000-row/4-MiB/5-second bounds, canonical `0600` writes, and zero shared
  reset calls. Counter decrease, reset/restart, identity change, query-ID reuse,
  path escape, replay, malformed operator evidence, or unknown source class
  fails closed. Registry-digest/safe-role matching is proven; live activity is
  contemporaneous only, and unmatched rows remain `unknown`. Explicit
  external-diagnostic and unknown IDs are separately totaled/excluded while
  only application IDs become eligible.
- Seed the five sanitized diagnostic families from the polluted observation and
  prove zero registry callsites, zero proposed indexes, and a required later
  clean interval. Sentinels prove no SQL, bind, regex pattern, role/application/
  host/database name, URL, PII, or row body is persisted.
- Dedicated-session tests prove success, thrown callback, acquisition timeout,
  delayed post-timeout acquisition, and shutdown races release exactly once;
  a late session never reaches the callback, its timer is cleared, and
  L06-L03 imports the exact helper name. Real-DB cases acquire a session
  advisory lock, run multiple transactions through that same backend PID,
  cancel a hung statement, and prove cancellation plus rollback or backend
  termination is confirmed within 4,500 ms before release. Lost-session and
  shutdown races produce `dedicated_database_session_lost`, commit/publish zero
  result, leave no active transaction/query, and permit no detached work.
- Maintenance-mode integration covers the complete L01 matrix against direct
  PostgreSQL plus real PgBouncer transaction/session pools. `off + primary`,
  `direct`, and session-pooled maintenance pass the two-transaction/two-backend
  lock probe; `transaction + primary`, a transaction-pooled maintenance URL,
  a same main/maintenance URL in transaction mode, and affinity/PID drift fail
  before returning a lease. Pin primary pool 1 as ordinary-start PASS and
  affinity-consumer FAIL; pin direct/session as exactly one startup probe whose
  result is reused by an enabled L03 consumer. URLs and probe SQL/binds never
  appear in output.

## Security Contract

- No route changes; operations metrics stay internal.
- Existing auth/RBAC/CSRF/rate-limit and anti-abuse contracts are untouched.
- Env values are parsed by L01; both URLs are required only by their declared
  modes and are never returned, echoed, logged, or put in telemetry.
- Application identity values use the strict L02-owned closed grammar and reveal
  only process class plus opaque replica/operation ID; no URL, host, tenant,
  credential, user ID, or request value is permitted.
- Telemetry labels are allowlisted enums/fingerprints, not caller-controlled SQL.
- Interval collection is read-only, timeout-bounded and non-resetting. Operator
  evidence contains only query IDs/classes/bounded evidence IDs/timestamps; no
  diagnostic SQL, patterns, binds, rows, role, host, or database identifier.

## Validation Commands

- `task551-db-test` commands run only through TASK-551-11's owner-injected
  private map, which provides the one DB binding plus fixed OS keys with no
  inherited environment. This leaf never loads, maps, or inspects a source.
- `bun --env-file=/dev/null test tests/integration/server/task551DatabaseLifecycle.test.ts`
- `bun test tests/integration/server/task551RuntimeEntrypoints.test.ts`
- `bunx vitest run tests/vitest/db/queryFingerprintRegistry.test.ts`
- `bunx vitest run tests/vitest/db/databaseApplicationIdentity.test.ts`
- `bun --env-file=/dev/null test tests/perf/database-pg-stat-interval.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso`
- `bun run gates:coderso:perf`
- `bun run scan:security`

## Documentation Updates Required

Do not edit `.env.example`. Hand L01's exact env table and the lifecycle contract
to TASK-551-10-L02, which solely owns environment, ORM, performance, deployment,
health prose, and changelog 1310.

## Quantified Acceptance

- All configured timeouts are visible on every sampled initial/replacement
  physical connection and finite.
- Graceful shutdown completes within 15,000 ms in both modes:
  `runtimeEntrypoint.ts` awaits the HTTP drain for at most 10,000 ms (then
  awaits forced stop), then the registry closes workers/schedulers →
  cache/Redis → DB against the same absolute deadline. Non-DB participants are
  capped at 5,000 ms each; DB is the explicit exception capped at 10 seconds or
  the remaining global time, whichever is smaller, and has no outer 5-second
  race. Every close/cancel/force path is awaited to terminal state exactly once;
  neither adapter owns a separate deadline or stop call.
- A cancellation-aware worker such as retention receives its own run
  `AbortSignal`; participant close aborts that signal first and confirms active
  SQL cancellation plus transaction rollback/connection termination within
  `RETENTION_CANCEL_DRAIN_DEADLINE_MS=4,500`, below the shared 5,000 ms
  participant ceiling. Cache/Redis/DB close cannot begin while that confirmation
  is unresolved, and no timed-out promise continues detached.
- Production and development use the same single signal/drain owner; both wait
  in the running state until a signal, never listen after an in-startup signal,
  never listen after any lifecycle-participant failure, close all started
  participants after a listen failure, and leave zero competing handlers, active
  listeners, or live Vite children after close.
- Opted-in query telemetry has fixed label cardinality and bounded duration/
  outcome/returned-row buckets. The separate pool probe records bounded reserve
  wait/saturation. Snapshot/reset is deterministic and bounded, metric failures
  never alter authoritative results, and no surface emits raw SQL binds, secrets,
  URLs, driver errors, free-form labels, or PII. L03's sole real-pool test is the
  live proof for this public API; it does not authorize a production caller edit.
- `queryFingerprintRegistry.ts` is the only production fingerprint value source;
  telemetry imports it and final inventory verifies exact key/value/set parity.
- Session-affine work is impossible through a declared transaction-pooled main
  channel: it either uses a live-proven direct/session-pooled maintenance pool
  or fails fast with `database_maintenance_session_unavailable` before work.
- A single-connection primary pool remains a supported small-site ordinary DB
  configuration. It is rejected only at activation of a session-affine
  consumer, never by unused-capability probing during normal DB startup.
- Every physical DB session has one exact sanitized application-name class;
  runtime and worker fleet counts remain distinct, replacement sessions preserve
  identity, and TASK-551 rollout can prove drain without SQL text or secrets.
- Config, identity, migration-adapter arrays and receipt use one exactly equal
  fleet; every runtime/worker and distinct-maintenance pool plus the three
  rollout connections is budgeted before startup.
- Pre-decision/before/after receipts contain non-negative per-query-ID deltas
  over unchanged statistics identity without resetting shared state. Only
  registry/role-proven application traffic is prioritizable; polluted external
  diagnostics and unknowns are separately reported and excluded.

## Workflow Dispatch Envelope

The finite `forbiddenPaths` list captures named current ownership conflicts.
The closed `allowlist` rejects every omitted path, including the broad foreign
categories described in the file-ownership contract.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-02-L02",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-02"
  },
  "allowlist": [
    "core/db/client.ts",
    "core/db/dedicatedDatabaseSession.ts",
    "core/db/databaseLifecycle.ts",
    "core/db/databaseApplicationIdentity.ts",
    "core/db/queryFingerprintRegistry.ts",
    "core/db/queryTelemetry.ts",
    "core/server/runtimeLifecycle.ts",
    "core/server/runtimeEntrypoint.ts",
    "core/server/prod.ts",
    "core/server/dev.ts",
    "scripts/task-551-pg-stat-interval.ts",
    "tests/vitest/db/queryFingerprintRegistry.test.ts",
    "tests/vitest/db/databaseApplicationIdentity.test.ts",
    "tests/integration/server/task551DatabaseLifecycle.test.ts",
    "tests/integration/server/task551DatabaseLifecycleRealDb.test.ts",
    "tests/integration/server/task551DedicatedSessionGuards.test.ts",
    "tests/integration/server/task551DedicatedMaintenanceSeam.test.ts",
    "tests/integration/server/task551RuntimeEntrypoints.test.ts",
    "tests/perf/database-pg-stat-interval.test.ts"
  ],
  "forbiddenPaths": [
    "core/db/databaseConfig.ts",
    "tests/vitest/db/databaseConfig.test.ts",
    "tests/perf/database-pool-telemetry.test.ts",
    "core/services/analytics/analyticsService.ts",
    "core/services/analytics/trafficAggregationService.ts",
    "core/services/dashboard/dashboardService.ts",
    "core/services/webhooks/webhooksService.ts",
    "core/services/webhooks/deliveryService.ts",
    "core/db/schema.ts",
    "core/db/migrations/meta/_journal.json"
  ],
  "dependencies": ["TASK-551-02-L01:single"],
  "commands": [
    {
      "id": "database-lifecycle-test",
      "lane": "bun-test",
      "environmentProfile": "task551-db-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/server/task551DatabaseLifecycle.test.ts", "tests/integration/server/task551DatabaseLifecycleRealDb.test.ts", "tests/integration/server/task551DedicatedSessionGuards.test.ts", "tests/integration/server/task551DedicatedMaintenanceSeam.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/server/task551DatabaseLifecycle.test.ts", "tests/integration/server/task551DatabaseLifecycleRealDb.test.ts", "tests/integration/server/task551DedicatedSessionGuards.test.ts", "tests/integration/server/task551DedicatedMaintenanceSeam.test.ts"],
        "minimum": 4
      }
    },
    {
      "id": "runtime-entrypoints-test",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "test", "tests/integration/server/task551RuntimeEntrypoints.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/server/task551RuntimeEntrypoints.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "fingerprint-registry-test",
      "lane": "vitest",
      "environmentProfile": "none",
      "argv": ["bunx", "vitest", "run", "tests/vitest/db/queryFingerprintRegistry.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/db/queryFingerprintRegistry.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "application-identity-test",
      "lane": "vitest",
      "environmentProfile": "none",
      "argv": ["bunx", "vitest", "run", "tests/vitest/db/databaseApplicationIdentity.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/db/databaseApplicationIdentity.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "pg-stat-interval-test",
      "lane": "bun-test",
      "environmentProfile": "task551-db-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/perf/database-pg-stat-interval.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/database-pg-stat-interval.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "pg-stat-interval-start",
      "lane": "cli",
      "environmentProfile": "task551-db-test",
      "argv": ["bun", "--env-file=/dev/null", "scripts/task-551-pg-stat-interval.ts", "start", "--name", "task551-predecision-clean", "--purpose", "pre-decision", "--snapshot", ".tmp/task551-pg-stat-task551-predecision-clean-start.json", "--operator-evidence", ".tmp/task551-pg-stat-operator-evidence.json"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "pg-stat-interval-end",
      "lane": "cli",
      "environmentProfile": "task551-db-test",
      "argv": ["bun", "--env-file=/dev/null", "scripts/task-551-pg-stat-interval.ts", "end", "--name", "task551-predecision-clean", "--purpose", "pre-decision", "--start", ".tmp/task551-pg-stat-task551-predecision-clean-start.json", "--receipt", ".tmp/task551-pg-stat-task551-predecision-clean.json", "--operator-evidence", ".tmp/task551-pg-stat-operator-evidence.json"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint-types",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "--cwd", "core", "lint"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "coderso-gate",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "run", "gates:coderso"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "performance-gate",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "run", "gates:coderso:perf"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "security-scan",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "run", "scan:security"],
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "single",
      "dependsOn": ["TASK-551-02-L01:single"],
      "commandIds": [
        "database-lifecycle-test",
        "runtime-entrypoints-test",
        "fingerprint-registry-test",
        "application-identity-test",
        "pg-stat-interval-test",
        "pg-stat-interval-start",
        "pg-stat-interval-end",
        "core-lint-types",
        "core-lint",
        "coderso-gate",
        "performance-gate",
        "security-scan"
      ]
    }
  ]
}
```

---

## Contract correction (2026-09-03, pg_stat_interval failure-code set)

Discovered while executing this leaf's fix round 2: the interval section above
states a single failure code for every drift trigger — "a reset, restart,
counter decrease, query-ID reuse with incompatible metadata, or more than
10,000 rows fails `pg_stat_interval_invalid`" — while the implemented collector
(`scripts/task-551-pg-stat-interval.ts`) throws a bounded, granular set, all of
them fail-closed and all inside the `pg_stat_interval_*` namespace. The
implemented set, straight from the bytes:

- `pg_stat_interval_flag_unknown` — unknown command word, unknown flag, or
  missing flag value (`parseIntervalArgs`).
- `pg_stat_interval_name_purpose_mismatch` — a name outside the closed
  name/purpose matrix, or a purpose that is not that name's matrix value
  (`validateCliSpec`).
- `pg_stat_interval_output_path_invalid` — a `--snapshot`/`--receipt` path off
  the canonical `.tmp/task551-pg-stat-<name>…` form, or a non-canonical
  `--operator-evidence` path (`validateCliSpec`).
- `pg_stat_interval_reused` — an existing start-snapshot or receipt file for
  the same interval name at CLI invocation (`main`).
- `pg_stat_interval_invalid` — the generic shape/consistency code: non-canonical
  or malformed snapshot bytes, boundary/name/purpose mismatch, closed-enum or
  per-counter drift, more than 10,000 counters, missing identity row, missing
  `DATABASE_URL`, a start not strictly after `diagnosticsEndedAt`, and (added in
  this correction, see below) query-ID reuse with incompatible metadata
  (`decodeSnapshot`, `buildIntervalReceipt`, `collectIdentityAndCounters`,
  `main`).
- `pg_stat_interval_identity_changed` — the reset/restart trigger: any of
  server identity, database identity, PostgreSQL major, extension version, or
  `stats_reset` differing between the start and end boundaries (identity check
  in `buildIntervalReceipt`, line 389 when this correction was written).
- `pg_stat_interval_counter_regression` — the counter-decrease trigger: a
  negative calls/rows/plan/exec delta in the delta loop of
  `buildIntervalReceipt` (line 430 when this correction was written).
- `pg_stat_interval_bounds_exceeded` — snapshot or operator-evidence bytes over
  4 MiB at decode, or a write payload whose canonical form exceeds 4 MiB
  (`decodeSnapshot`, `decodeOperatorEvidence`, `writeBounded0600`).
- `pg_stat_interval_evidence_invalid` — malformed operator evidence
  (`decodeOperatorEvidence`, `main`).

The granular set is kept as implemented, and the single-code sentence above is
corrected rather than the code collapsed:

- Every trigger still throws and aborts the receipt — fail-closed behavior is
  exactly as contracted; only the diagnostic name differs.
- All codes stay inside the closed `pg_stat_interval_*` namespace, so the
  failure surface remains bounded and greppable.
- Identity/reset and counter-regression drift are strictly better reported by
  their own codes than by the generic one: an operator reading a failed run can
  tell a `stats_reset` flip from a negative delta without re-deriving it.
- Precedent: the contract correction of 2026-08-26 above, where the reviewed
  receipt superseded the stale authored `MAX_QUERY_FINGERPRINTS = 512` estimate
  with `2048` instead of weakening the bound. This is the same direction of
  travel: the bytes and the reviewed behavior refine the authored wording, and
  nothing becomes permitted that was forbidden.
- The original single-code wording is preserved where it is exact: query-ID
  reuse with incompatible metadata — the trigger implemented in this same round
  by comparing `normalizedQuerySha256` for a query ID present at both
  boundaries — fails `pg_stat_interval_invalid`, exactly as the original line
  demands. The 10,000-row cap also lands on `pg_stat_interval_invalid` (shape
  bound in `decodeSnapshot`); the separate 4-MiB cap is
  `pg_stat_interval_bounds_exceeded`.

Everything else in this contract is unchanged, including the receipt shape, the
read-only/no-reset guarantee, the closed name/purpose matrix, and the exact
CLI commands. `tests/perf/database-pg-stat-interval.test.ts` pins the corrected
set and the code map above.

## Dated Contract Corrections — 2026-09-25 (re-open: reserved-session transactions; append-only)

Append-only re-open. Every earlier section, the Workflow Dispatch Envelope, `**Status:**` and
`**Changelog:**` stay byte-identical; where this section contradicts earlier wording, this
section wins and the superseded sentence is quoted below. Anchors were grounded on 2026-09-25
against the working tree of `/home/coder/project/Coderso-551` (branch `feat/task-551-db-cache`,
HEAD `9c5b6666` plus uncommitted 06-L02/06-L03 work; `core/db/client.ts` 736 lines and
`tests/integration/server/task551DatabaseLifecycle.test.ts` 818 lines, both clean against HEAD).
Line numbers are anchors at that moment, not contract.

### R1 — Defect (orchestrator-verified 2026-09-25)

postgres.js 3.4.9 `reserve()` (`node_modules/postgres/src/index.js:203-231`) returns
`Sql(handler)` plus `release`. Only the top-level pool object receives `options`, `reserve`,
`begin`, `close` and `end` (`src/index.js:69-81`); a reserved handle has neither `begin` nor
`options`. `types/index.d.ts:730` declares `ReservedSql extends Sql`, so the missing `begin` is
inherited in the types: type checks pass while the runtime throws
`TypeError: owner.begin is not a function`. A scratch reproduction on `DATABASE_URL3`
(`coderso02`) confirmed it. Affected sites:

- `runAffinityProbe` (`core/db/client.ts:216`): `owner.begin(...)` at `:226` and `:235`. Every
  maintenance affinity probe throws, so `assertMaintenanceSessionAffinity` never succeeds.
- `createTrackedDedicatedSession(...).transaction` (`core/db/client.ts:423-437`):
  `reserved.begin(...)` at `:429`. Every real dedicated-session transaction throws.
- The `finally` block of `runAffinityProbe` (`:259-261`) unlocks unconditionally
  (`if (owner) { await owner\`select pg_advisory_unlock(...)\` }`). When the lock was never
  acquired, PostgreSQL emits `WARNING 01000 "you don't own a lock of type ExclusiveLock"`.

Consequences (review evidence from the diagnosis journal, not re-run here):

- `tests/integration/server/task551RetentionJobService.test.ts` gates `hasDb` on
  `assertMaintenanceSessionAffinity()` (`:97-108`, call at `:100`), so all 9 DB legs skip.
- The real legs of `tests/integration/runtime/retentionScheduler.test.ts` fail.
- Every real `runRetentionPlan` batch (06-L03) fails.

The DB-free fakes hid the defect: `makeFakeReserved` in
`tests/integration/server/task551DatabaseLifecycle.test.ts` (`:364-384`) gives the reserved
handle a `begin` (`:369`) that the real driver never has. The pool fakes (`makeFakeSql`
`:392-`, `begin` at `:398`; the `dedicatedFixtures` pool `:599-644`, `begin` at `:617`) have
`begin` but no `options`. The file has no real-DB leg at all: its only describes are the
lifecycle/registry ones and the DB-free `:436` and `:578` blocks. So the "Real-DB cases …"
promise in Testing Requirements (quoted in R4) was never executed.

### R2 — Binding fix: `runAffinityProbe`

Superseded sentence (pseudocode, `assertMaintenanceSessionAffinity` comment): "Unlock on the
owner's same PID and release/cancel both sessions in finally." Replaced by: unlock on the
owner's same PID **only when the owner actually acquired the lock**, then release both
sessions in `finally`.

- Each of the two owner transactions is explicit SQL on the reserved handle, never `.begin()`:
  `await owner\`begin\`` → the probe query through `owner` → `await owner\`commit\``. On any
  error inside that window, run a best-effort `await owner\`rollback\`` and rethrow the original
  error. postgres.js permits a literal `BEGIN` on a reserved connection: its `UNSAFE_TRANSACTION`
  guard only fires when `!connection.reserved` (`src/connection.js:604-605`).
- A local `ownerAcquired` flag becomes `true` only after the first transaction's row reports
  `acquired === true`. The `finally` unlock runs only when `ownerAcquired` is true. The
  verifier's re-entrant balancing unlock (`:254`) is unchanged because it already runs only
  after `verifierRow.acquired`.
- The probe semantics are unchanged: two owner transactions on one PID, a different verifier
  PID, a verifier that cannot acquire the lock, the bounded
  `database_maintenance_session_unavailable` code, lifecycle-generation caching, and no caching
  of failures.

### R3 — Binding fix: dedicated-session transactions and the drizzle seam

Superseded sentence (pseudocode): "export type DedicatedDatabaseTransaction =
DrizzleTransactionBoundToReservedSql;". The landed alias `DedicatedDatabaseTransaction =
TransactionSql` (`core/db/client.ts:318`) is superseded too. No `TransactionSql` object ever
exists on this path at runtime.

- `transaction(input)` issues `await reserved\`begin\``. If `input.signal` is already aborted,
  it drains through `drainActiveAndRollback(input.signal)` and throws
  `dedicated_database_session_lost`, as today. Otherwise it awaits `input.run(reserved)` and then
  `await reserved\`commit\``, and returns the callback result only after that commit resolves.
  On any error from `begin`, `run` or `commit`, it calls
  `drainActiveAndRollback(input.signal)` (`:367-384`; its rollback-else-terminate outcome is
  unchanged) and rethrows. The rethrown error is `dedicated_database_session_lost` when the
  signal aborted, otherwise the original error.
- The callback receives `reserved` itself as its transaction handle. That is the same physical
  session that `execute` already hands to `StaticDedicatedStatement` (`:325-327`).
  `DedicatedDatabaseTransaction` is retyped to that reserved surface, minus at least `begin`
  (absent at runtime) and `release` (calling it would re-pool a live lease). The implementer
  chooses the exact spelling, provided no consumer can type-call a member that is absent at
  runtime or that ends the lease. The handle stays callback-scoped, as the existing "Consumers
  receive no retained handle" rule (`:320-324`) requires.
- `input.statementTimeoutMs` stays as landed: the session-level startup bound applies. The
  transaction-local `set_config('statement_timeout', …, true)` pattern that consumers issue
  inside the callback is now a real transaction boundary, and R4 proves it.
- New export from `core/db/client.ts`: `withPoolOptions`, a drizzle-compatible view of a
  dedicated-session handle. Its public form takes one argument,
  `withPoolOptions(handle: DedicatedDatabaseTransaction)`. It returns the same handle with the
  live `maintenanceSqlClient.options` object (`:101`, including a test override installed by
  `setDatabaseClientRuntimeForTests`) attached **by reference**. It is typed so that
  `drizzle(withPoolOptions(tx))` compiles with no consumer-side cast; client.ts is the one owner
  of the single documented cast.
  - Why by reference: drizzle-orm 0.45.2 `postgres-js/driver.js:15-22` mutates
    `client.options.parsers`/`serializers` in place, and postgres.js connections read the same
    `parsers` object (`src/connection.js:61`, `:660`). A copy would make drizzle's parser
    override inert.
  - The helper never exposes `begin`, `release` or the pool. Drizzle's own `.transaction` over
    it stays forbidden, as 06-L03 already requires.
- Recorded consequence: in `primary` mode `maintenanceSqlClient === sqlClient`, and `db`
  (`:91`) already applied those transparent parsers, so nothing changes. In `direct|session`
  mode the first helper-backed drizzle construction makes the eight date/time OIDs transparent
  for later raw queries on that maintenance pool. Today, client.ts's own raw maintenance
  statements read only pid/boolean columns. Any consumer's raw `execute` statement that reads
  those types must not rely on `Date` parsing.
- Cross-leaf seam: TASK-551-06-L03's drizzle-over-transaction adapter (its R1) consumes
  `withPoolOptions`, which replaces its inline `drizzle(tx as unknown as Sql)` cast. Land order is
  02-L02 (this correction) → 06-L03. 06-L03 owns its own file edits; this leaf edits no 06-L03
  file.

### R4 — Binding test changes (`tests/integration/server/task551DatabaseLifecycle.test.ts`)

Kept, now actually executed: Testing Requirements, "Real-DB cases acquire a session advisory
lock, run multiple transactions through that same backend PID, cancel a hung statement, and
prove cancellation plus rollback or backend termination is confirmed within 4,500 ms before
release."

- Fakes model the real surface. `makeFakeReserved` loses `begin` and has no `options`; its
  literal `begin`/`commit`/`rollback` statements are recorded in `sqlCalls` like any other SQL.
  The affinity and dedicated-session DB-free legs assert the explicit statement sequence:
  `begin` → probe → `commit` twice for the owner, and `begin` → run → `commit` (or `rollback`
  on throw/abort) for `transaction`. The finally-unlock is asserted absent whenever the owner
  never acquired the lock. Pool fakes keep `begin` (the real pool has it) and gain `options`
  only where a leg exercises `withPoolOptions`. No behavioral assertion is weakened.
- New real-DB leg, gated by the presence-only owner-map idiom of
  `tests/integration/server/task551RevisionConcurrency.test.ts:46-65` (all three
  `TASK551_FIXTURE_DATABASE_*` keys present; the fixture URL is the only URL dialed; otherwise
  `test.skip` by name). It builds its own `postgres(<fixture URL>, { max: 2, onnotice: <recorder> })`
  pool and injects it through `setDatabaseClientRuntimeForTests({ config: { pgbouncerMode: "off",
  maintenanceMode: "primary", poolMax: 2 }, maintenanceSqlClient })`. In `finally` it restores
  the override and `end()`s the pool. It proves:
  1. the affinity probe succeeds, the owner lock is acquired, and the owner PID is identical
     across both explicit transactions;
  2. the verifier (a different PID) cannot acquire the lock (a forced foreign-PID/re-entrant
     case yields `database_maintenance_session_unavailable`);
  3. inside a dedicated-session `transaction`, `set_config('statement_timeout', '<n>ms', true)`
     is visible via `current_setting` and has reverted to the session value after `commit`;
  4. a probe run in which the owner lock is NOT acquired (the key pre-held by a separate test
     session) records zero `WARNING`/`01000` notices from the unlock path;
  5. `drizzle(withPoolOptions(tx))` executes a query on the same PID.
- The leg touches no application table: advisory locks, `pg_backend_pid`, `set_config` and
  `current_setting` only, so there are no rows to clean. Each DB test carries an explicit
  `60_000` timeout (repo convention, e.g. `tests/unit/kits/fullSiteAdapterAtomicity.test.ts:707`;
  remote round trips cost about 1.2-1.8 s per transaction).
- Scope note (not binding): an idle `rollback` from `drainActiveAndRollback` at lease release
  can itself raise PostgreSQL's `25P01 "there is no transaction in progress"` warning. Per
  PostgreSQL semantics this is expected, but it was not reproduced here. The zero-WARNING
  assertion is scoped to the probe's unlock path, and any change to idle-rollback behavior is
  an orchestrator decision.
- Line budget: soft target ≤ 960, hard cap 1,000. If the leg cannot fit, STOP and report: a new
  test file needs an envelope change that this correction does not grant.

### R5 — Gates, envelope and receipt

- The envelope stays byte-identical. `core/db/client.ts` and
  `tests/integration/server/task551DatabaseLifecycle.test.ts` are already in the closed
  `allowlist` and in the `database-lifecycle-test` argv/discovery. No path, command or
  occurrence is added.
- Implementer FAST gates:
  - `./node_modules/.bin/eslint --max-warnings=0 core/db/client.ts tests/integration/server/task551DatabaseLifecycle.test.ts`;
  - airtight run (the real leg skips by name):
    `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/server/task551DatabaseLifecycle.test.ts tests/integration/server/task551RuntimeEntrypoints.test.ts tests/perf/database-pg-stat-interval.test.ts`;
  - `./node_modules/.bin/vitest run tests/vitest/db/queryFingerprintRegistry.test.ts tests/vitest/db/databaseApplicationIdentity.test.ts`;
  - `wc -l` on both touched files, `git diff --check`.
- Orchestrator gates:
  - the closed owner-map form on `DATABASE_URL3` (`coderso02`), with the real leg EXECUTED
    (not skipped):
    `env -i PATH=… HOME=… DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_NAME=coderso02 TASK551_FIXTURE_DATABASE_SENTINEL=<bootstrap sentinel> DB_LOCK_TIMEOUT_MS=15000 bun --env-file=/dev/null test tests/integration/server/task551DatabaseLifecycle.test.ts tests/perf/database-pg-stat-interval.test.ts`;
  - `bun --cwd core lint:types` and `bun --cwd core lint`.
  - Then 06-L03 reruns its own owner-map gate, where `task551RetentionJobService.test.ts` must
    execute, not skip, its DB legs.
  - Not re-run for this correction: the `pg-stat-interval-start`/`-end` CLI commands (an
    operator-named interval; the transaction mechanism does not affect them).
    `gates:coderso`, `gates:coderso:perf` and `scan:security` move to the combined run under
    Validation Rules.
- Receipt: the orchestrator appends one dated top-level addendum key to
  `_docs/_workflows/_smoke/task-551/impl-02-l02.json` (for example
  `"reopenAddendum20260925"`), leaving every existing key byte-identical. The addendum records
  the defect summary, the final line counts and sha256 of both touched files, and every gate
  result above, including real-leg executed/skipped counts. This task file records the contract
  only.

### Re-open amendments (2026-09-25, orchestrator decisions)

Append-only. It amends the "Dated Contract Corrections — 2026-09-25" section above; where the two
disagree, this section wins, and each superseded sentence is quoted. The one in-place edit is the
`json` fence of the Workflow Dispatch Envelope, as B1 describes. Everything else above stays
byte-identical. Anchors were grounded on 2026-09-25 against `/home/coder/project/Coderso-551`
(HEAD `9c5b6666` plus uncommitted work). `core/db/client.ts` is 736 lines and
`tests/integration/server/task551DatabaseLifecycle.test.ts` is 818 lines; both are clean against
HEAD. Line numbers are anchors, not contract.

#### B1 — Real-DB leg moves to a new test file (line cap)

Superseded sentences (quoted):

- R4: "Line budget: soft target ≤ 960, hard cap 1,000. If the leg cannot fit, STOP and report: a new
  test file needs an envelope change that this correction does not grant."
- R5: "The envelope stays byte-identical." and "No path, command or occurrence is added."
- Dated Contract Corrections preamble: "Every earlier section, the Workflow Dispatch Envelope,
  `**Status:**` and `**Changelog:**` stay byte-identical". This now holds for everything except the
  envelope `json` fence.
- File Ownership: the closing "… `tests/perf/database-pg-stat-interval.test.ts` only." The
  allowlist now also contains `tests/integration/server/task551DatabaseLifecycleRealDb.test.ts`.

Binding replacement:

- The whole R4 real-DB leg lives in the NEW file
  `tests/integration/server/task551DatabaseLifecycleRealDb.test.ts`. That covers R4 items 1-5 and
  the B2 assertion below. The R4 fake rewrites (`makeFakeReserved` without `begin`/`options`, the
  explicit statement-sequence assertions, and the absent finally-unlock) stay in
  `tests/integration/server/task551DatabaseLifecycle.test.ts`, which must stay at or under 1,000
  lines. The new file has the same 1,000-line hard cap. It is independently runnable. It reuses the
  presence-only owner-map gate, its own `max: 2` pool with the `onnotice` recorder, the
  `setDatabaseClientRuntimeForTests` injection with restore and `end()` in `finally`, and the
  explicit `60_000` per-test timeout, all exactly as R4 specifies. In the airtight run (no
  `TASK551_FIXTURE_DATABASE_*` keys) every real-DB test skips by name.
- This is binding, not conditional: the envelope's positive discovery now requires both paths. The
  envelope edit is `allowlist` += the new path, the `database-lifecycle-test` argv += the new path,
  and its `positiveDiscovery.paths` += the new path with `minimum` 1 → 2. No other command,
  occurrence or `forbiddenPaths` entry changes. The envelope has no line-count command, so there was
  nothing else to extend. After the edit the family preflight
  (`preflightTask551DispatchSnapshot`, `sourceHead` `9c5b6666`, repo-relative paths) passes.
- R5 FAST gates, restated: `./node_modules/.bin/eslint --max-warnings=0 core/db/client.ts
  tests/integration/server/task551DatabaseLifecycle.test.ts
  tests/integration/server/task551DatabaseLifecycleRealDb.test.ts`. Both airtight and
  owner-map `bun --env-file=/dev/null test` commands name
  `tests/integration/server/task551DatabaseLifecycleRealDb.test.ts` right after
  `tests/integration/server/task551DatabaseLifecycle.test.ts`. `wc -l` covers all three touched
  files. The orchestrator owner-map run on `DATABASE_URL3` must show the new file's real-DB tests
  EXECUTED, not skipped. The R5 receipt addendum records line counts and sha256 for all three files.
- Not in scope: the generated `tests/bun-lane-manifest.json` (owner TASK-551-01-L01, not in this
  allowlist) has no row for the new file. This follows the recorded stale-manifest precedent in
  `TASK-551-03-L02-…md:4219-4221`. This leaf does not hand-edit the manifest; the rebaseline belongs
  to 01-L01.

#### B2 — Idle-rollback `25P01` warning: verified, not optional (new R4 item 6)

Superseded sentence (quoted, R4 "Scope note (not binding)"): "The zero-WARNING assertion is scoped
to the probe's unlock path, and any change to idle-rollback behavior is an orchestrator decision."
The orchestrator has now decided, as follows.

Grounding: `drainActiveAndRollback` (`core/db/client.ts:367-384`) issues `reserved\`rollback\``
unconditionally (`:379`). Both lease-release paths call it through
`cancelActiveAndRollback("lease_release")`, even after a committed transaction or plain `execute`
use: `withDedicatedDatabaseSession` at `:511`, and the advisory-lock lease `finally` at `:560`.
PostgreSQL answers `ROLLBACK` outside a transaction block with `WARNING 25P01 "there is no
transaction in progress"`.

- R4 item 6 (binding, in the new real-DB file): on the recorder pool, open a dedicated session, run
  one `transaction` that commits and one `execute`, then let the lease release. The recorder must
  hold ZERO `WARNING` notices, including `25P01`. The implementer runs this assertion against the
  real driver first. If it passes unguarded, record that and leave the drain unchanged.
- If it emits the warning, guard the drain. The binding guard is LOCAL state tracking:
  `createTrackedDedicatedSession` keeps a `transactionOpen` flag. The flag is set before the
  wrapper issues its own `begin` and cleared only after that wrapper's `commit` or `rollback`
  resolves. `drainActiveAndRollback` issues `rollback` only while the flag is set. Otherwise it
  issues a no-op confirmation round trip on the same session (for example `select 1`), so the
  "cancellation plus rollback or backend termination is confirmed within 4,500 ms before release"
  guarantee still holds. The return union `"rolled_back" | "connection_terminated"` and
  terminate-on-confirmation-failure stay unchanged. A server-side
  `txid_current_if_assigned()`/`pg_current_xact_id_if_assigned()` check is NOT an acceptable sole
  guard. It returns NULL inside an open transaction that has not been assigned an xid yet (every
  read-only or pre-write transaction), so it would skip the rollback and re-pool an open
  transaction.
- If the guard lands, the following re-baselines of
  `tests/integration/server/task551DatabaseLifecycle.test.ts` are intended contract changes, not
  weakenings: `:664` (idle release after `execute` plus a committed `transaction` asserts no
  `rollback` and one confirmation statement); `:675` (run throws outside any transaction → no
  `rollback`, one confirmation); `:679-690` (the terminate case fails the confirmation statement).
  Add one fake leg where the drain runs with the wrapper transaction open and asserts exactly one
  `rollback`, plus one where that `rollback` fails and asserts `connection_terminated`. Every
  existing release-exactly-once and termination assertion is kept.

#### B3 — Helper name pinned: `withPoolOptions(handle)`

Restated from R3, now pinned for cross-leaf citation: `core/db/client.ts` exports exactly
`withPoolOptions(handle)`. It takes one argument, `handle: DedicatedDatabaseTransaction`. It returns
that same handle with the live `maintenanceSqlClient.options` attached BY REFERENCE (a test override
installed by `setDatabaseClientRuntimeForTests` included), typed so that
`drizzle(withPoolOptions(tx), { schema })` compiles with no consumer-side cast. No other name,
arity, or options-copying variant is contract. TASK-551-06-L03 R1-c cites this same name for its
"<02-L02 helper>" (`TASK-551-06-L03-…md:1101-1102`). Land order is 02-L02 (this re-open) →
TASK-551-06-L02 R8/R9 → TASK-551-06-L03 R1. This extends R3's "Land order is 02-L02 (this
correction) → 06-L03" (quoted, superseded) by inserting the 06-L02 R8/R9 step. This leaf still edits
no 06-L02 or 06-L03 file.

### Re-open amendment R6 (2026-09-25): reserved-session guard design

Append-only. It amends R1-R5 and B1-B3 above; where they disagree, R6 wins, and every superseded
sentence is quoted in R6.8. The only in-place edit is again the `json` fence of the Workflow
Dispatch Envelope (R6.4). Anchors were grounded on 2026-09-25 against
`/home/coder/project/Coderso-551` (HEAD `9c5b6666` plus uncommitted work; `core/db/client.ts`
736 lines, clean against HEAD). Line numbers are anchors, not contract.

Evidence: an orchestrator-dispatched design diagnosis ran scratch probes against `coderso02`
(`DATABASE_URL3`) with postgres.js 3.4.9 under Bun 1.4.2 (driver cancel also re-checked under
Node 26). It then built a prototype of the design below; 11 of its 12 legs passed. The one failure
is the driver residual in R6.3. Probes used explicit PIDs, advisory key `551551551` and two
session-temp tables, all dropped. A residue probe confirmed zero probe sessions, zero probe-key
locks and zero temp tables afterwards. The findings are review evidence verified by the
orchestrator; the probe scripts are scratch-only and are not repository artifacts.

#### R6.1 — Verified defects in the landed `core/db/client.ts`

| # | Anchor | Probe evidence |
|---|---|---|
| D1 | `terminateReservedBackend` `:350-364` | It runs `select pg_backend_pid()` on the reserved handle with no deadline. On a dead handle that never settles, so no `withDedicated*` call returns. |
| D2 | `withDedicatedDatabaseSession` `:516`; advisory lease `:566`, `:573`; probe `:267`, `:272` | `release()` after loss or after our own termination puts a closed connection into the pool's open queue. Later pool queries and `reserve()` then hang (10 s timeout on both). With no release, the pool recovers the slot through its closed queue and stays healthy. |
| D3 | `drainActiveAndRollback` `:367-384` | The drain `rollback` on a dead handle hangs. An idle `rollback` emits `WARNING 25P01`. |
| D4 | `:372`, `:399`, `:409` (`query.cancel()`) | The driver's `PendingQuery.cancel()` has no effect on this deployment (Bun and Node). A hung statement stops only at the 15 s `statement_timeout`, far over the 4,500 ms drain contract. `pg_cancel_backend(pid)` from a second connection works: `57014` in 184 ms warm, 1,952 ms with a cold connect. |
| D5 | `runAffinityProbe` `:205`, `:216-275` | The fixed key `551551551` is released after every probe, so it serialises nothing. But simultaneous probes collide every time: 10 of 10 warm simultaneous pairs had one side fail with `database_maintenance_session_unavailable`. In direct/session mode that fails database startup of one replica in a simultaneous rollout. The probe `finally` also releases handles that may be lost (D2). |
| D6 | `withDedicatedDatabaseAdvisoryLock` `:538-579` | It unlocks only on the success path. A `run` that throws always terminates the backend instead of unlocking in `finally`. |
| D7 | `createTrackedDedicatedSession` `:366-448` | `activeQuery` tracks only `execute`. Statements issued inside `transaction` are untracked, so abort cannot cancel them. |

Driver facts the design depends on (probe-verified, postgres.js 3.4.9):

- COMMIT on an aborted block resolves, with no error and no notice, with the tag
  `result.command === "ROLLBACK"`. A literal `BEGIN` resolves with `result.command === "BEGIN"`.
  Nested `BEGIN` gives `WARNING 25001`.
- `result.state` is `{ pid, secret }` of the backend that served the statement.
- An idle `ROLLBACK` or `COMMIT` emits `WARNING 25P01`. After a failed COMMIT (for example
  `23505`), no block is open, and a later `ROLLBACK` also emits `25P01`.
- When a reserved connection's socket closes, `onclose` (`src/index.js:421-426`) sets
  `c.reserved = null` and moves `c` to the closed queue. The reserved handler
  (`src/index.js:227-231`) still holds `c`, so later statements either hang forever (an uncaught
  `TypeError` from `socket.write` on null; the process survives) or, after ordinary pool traffic
  has reconnected `c`, run silently on a different backend (observed PID 880134 → 880137, no
  error).
- A kill during an in-flight statement surfaces as `CONNECTION_CLOSED`, not `57P01`, because the
  FATAL ErrorResponse is dropped when the socket closes before ReadyForQuery.
- After `pg_terminate_backend`, the backend exits 865-1,208 ms later (RTT included).

#### R6.2 — Binding design

Module split (binding, line cap):

- New module `core/db/dedicatedDatabaseSession.ts` (hard cap 600 lines) owns the guarded-session
  primitive:
  - `guardSession`, the loss classifier, the drain, `terminateAndWait`, the scoped statement
    handle and the close epoch;
  - the deadline constants below;
  - `DEDICATED_DATABASE_SESSION_ERROR_CODES`.
- The module is dependency-injected. Its inputs are the reserved handle, a control executor (below),
  a getter for the live pool `options`, the COMMIT deadline and a clock. It imports no `client.ts`,
  `databaseConfig`, settings or runtime module. So there is no import cycle, and the DB-free suite
  can import it with no environment.
- `core/db/client.ts` keeps: pools, config, lifecycle close, the affinity probe,
  `withDedicatedDatabaseSession`, `withDedicatedDatabaseAdvisoryLock`,
  `assertDedicatedDatabaseSessionBudget`, `withPoolOptions` and the test seams.
- `client.ts` re-exports every public name that consumers import today (`DedicatedDatabaseSession`,
  `DedicatedDatabaseTransaction`, `StaticDedicatedStatement`, `DedicatedCancelReason`) plus
  `maintenanceConnectionCloseObserver`. Consumer import paths do not change.
- `client.ts` deletes `createTrackedDedicatedSession` and `terminateReservedBackend`. It must stay
  at or under 1,000 lines (expected about 650-700).

Error codes (one owner):

- `DEDICATED_DATABASE_SESSION_ERROR_CODES` holds four codes:
  - `sessionLost`: `dedicated_database_session_lost` (unchanged value);
  - `transactionAborted`: `dedicated_database_transaction_aborted` (new);
  - `transactionNested`: `dedicated_database_transaction_nested` (new);
  - `drainUnconfirmed`: `dedicated_database_drain_unconfirmed` (new).
- `DATABASE_CLIENT_ERROR_CODES` keeps its key `dedicatedSessionLost`. It adds the keys
  `dedicatedTransactionAborted`, `dedicatedTransactionNested` and `dedicatedDrainUnconfirmed`, and
  all four refer to the module constants, so no string literal is duplicated.
- Session loss always rejects with `dedicated_database_session_lost`. No path ever surfaces a raw
  driver code (`CONNECTION_CLOSED`, `57P01`, …), a driver message or a PID to a consumer.

Deadline constants (exported from the module and pinned by tests):

- `DEDICATED_CONTROL_STATEMENT_DEADLINE_MS = 2_000`: identity snapshot, `begin`, drain
  `rollback`/confirmation, `pg_advisory_unlock`, and each probe statement.
- `DEDICATED_CANCEL_DEADLINE_MS = 1_500`: the server-side cancel.
- `DEDICATED_EPOCH_VERIFY_DEADLINE_MS = 3_000`. The prototype got a false loss at 1,500 ms when the
  control connection had to connect cold; 3,000 ms passed.
- `DEDICATED_DRAIN_DEADLINE_MS = 4_500`, equal to `RETENTION_CANCEL_DRAIN_DEADLINE_MS`: the whole
  drain, measured from its start.
- `DEDICATED_TERMINATION_POLL_INTERVAL_MS = 100`.
- The COMMIT deadline is the injected session statement bound (`config.statementTimeoutMs`, default
  15,000 ms). The server may legitimately take that long to flush a commit.
- Inside a drain, every control statement (including the epoch verify) is bounded by
  `min(its constant, deadlineAt - now)`.
- An expired control deadline is a session loss. Deadlines are `Promise.race` timers, cleared on
  every settlement; no timed-out promise keeps work alive that the caller relies on.

Control connection (orchestrator-approved design change, recorded here):

- The earlier contract required "the current postgres.js `PendingQuery` through its supported
  `cancel()` surface" (quoted in R6.8). It is replaced by server-side control statements that
  never touch the reserved handle.
- Those statements run as ordinary, unreserved statements on the live `maintenanceSqlClient` pool.
  This is the budgeted control slot in R6.5. No extra client is created.
- The control statements are static and parameterized, and always identify the session by
  `pid = $pid and backend_start::text = $started`, so a recycled PID is never signalled:
  - cancel: `select pg_cancel_backend(pid) from pg_stat_activity where pid = $pid and
    backend_start::text = $started and state = 'active'`;
  - terminate: `select pg_terminate_backend(pid) from pg_stat_activity where pid = $pid and
    backend_start::text = $started`;
  - liveness: `select exists(select 1 from pg_stat_activity where pid = $pid and
    backend_start::text = $started) as alive`.
- Evidence: D4 above.

`guardSession(reserved, control, options)` is a closure over the following state:

- `id = { pid, secret, startedText }`. It is snapshotted from the first statement on the lease:
  `select pg_backend_pid() as pid, (select backend_start::text from pg_stat_activity where pid =
  pg_backend_pid()) as started`.
  - `pid` and `secret` come from `result.state`. The `::text` cast keeps the value independent of
    drizzle's in-place parser mutation (R3).
  - A snapshot failure or deadline is a loss.
- `liveState`: the first result's `state` object, held by reference. Its `pid` and `secret` change
  when the driver reconnects that connection.
- `lost`, `transactionOpen`, `transactionActive`, `scope` (a counter), `inFlight: Set<PendingQuery>`,
  single-flight `draining` and `cancelling` promises, and `verifiedEpoch`.

Module close epoch:

- A module counter `maintenanceCloseEpoch` is bumped by `maintenanceConnectionCloseObserver`.
- `client.ts` passes that observer as the typed pool option `onclose`
  (`types/index.d.ts:121`, `src/index.js:421-426`) on every pool it builds.
- A test pool injected through `setDatabaseClientRuntimeForTests` passes the same observer. Fakes
  call the observer directly.

Guards, applied to every statement issued through the session (`execute`, the transaction handle,
`assertAlive`, the drain's confirmation and the unlock):

- G1, before issue:
  - if `lost`, reject `session_lost`;
  - if `liveState.pid !== id.pid` or `liveState.secret !== id.secret`, mark lost;
  - if `verifiedEpoch !== maintenanceCloseEpoch`, run `verify()`. It asks the control connection
    for liveness, bounded by `DEDICATED_EPOCH_VERIFY_DEADLINE_MS`. If the answer is false, the
    query fails, the deadline expires, or identity changed, mark lost. Otherwise set
    `verifiedEpoch` to the epoch read at the start of the verify.
  - A lost session issues nothing on the handle.
- G3, after every result: `res.state?.pid === id.pid && res.state?.secret === id.secret`, otherwise
  mark lost and reject `session_lost` (the result is discarded).
- G4, the loss classifier:

  ```text
  isDedicatedSessionLossError(e) =
    e.code ∈ { CONNECTION_CLOSED, CONNECTION_ENDED, CONNECTION_DESTROYED, CONNECT_TIMEOUT,
               ECONNRESET, EPIPE, ETIMEDOUT, ECONNREFUSED, EHOSTUNREACH, ENETUNREACH }
    || e.severity ∈ { FATAL, PANIC }
    || e.code starts with "57P" || e.code starts with "08" || e.code === "25P03"
    || e is the module's internal control-deadline error
  ```

  - `57014`, `25P02`, `40P01` and `23xxx` are NOT loss: the backend is alive. They are rethrown
    unchanged unless the caller's signal aborted, in which case the rejection is `session_lost`.
  - A classified loss marks the session lost and rejects `session_lost`.
  - An abort rejects the operation with `session_lost` but does not mark the physical session lost;
    the drain decides that.
- G5, release: see "Release and termination" below.

Scoped statement handle (`DedicatedDatabaseTransaction`, also the argument type of
`StaticDedicatedStatement`):

- It is a Proxy over `reserved`, created per `transaction` scope and per `execute` call.
  - The `apply` and `unsafe` traps return `wrapQuery(q)`.
  - `begin`, `release`, `end`, `close`, `reserve`, `listen` and `subscribe` are `undefined` at
    runtime and absent from the type.
  - `options` returns the live pool `options` object by reference.
- `wrapQuery` proxies the query:
  - its `then` trap checks `myScope === scope`; a handle retained past its scope rejects
    `session_lost` without issuing anything;
  - it then runs G1 (inside a transaction, an unverified epoch rejects `session_lost` without
    issuing the statement), adds the query to `inFlight`, and applies G3/G4 on settlement;
  - methods that return the target (for example `.values()`) return the proxy, so drizzle's
    `.values()` path stays tracked.
- The prototype verified that drizzle `select().from().where()` via `.values()`, drizzle `execute`,
  and three pipelined statements all ran on the session PID. Calls after the scope closed rejected.
- `withPoolOptions(handle)` (name and arity pinned by B3) returns that same handle, typed for
  `drizzle(withPoolOptions(tx), { schema })`. The live `options` reference is the Proxy trap, so it
  stays "attached BY REFERENCE" as B3 requires. `client.ts` supplies the options getter and holds
  the one documented cast.

Transactions:

- `transaction(input)`:
  - if `transactionActive` or `draining`, reject `dedicated_database_transaction_nested`;
  - if `input.signal.aborted`, issue zero statements and reject `session_lost`;
  - otherwise set `transactionActive = true` and `myScope = ++scope`, and register
    abort → `cancelInFlight()`.
- `begin` is a control statement. `transactionOpen` is set when `begin` resolves with
  `command === "BEGIN"`, even if the scope has been taken over by a drain in the meantime. Any
  other tag or a loss marks the session lost.
- `run(handle)` is raced with the abort. Afterwards `scope++` closes the handle. If the scope is no
  longer owned (`scope !== myScope + 1` at that point, meaning a drain took over) or the signal
  aborted, the call goes to `failWith(session_lost)` and the callback result is discarded.
- COMMIT (never cancelled by the signal: the server decides the outcome):

  ```text
  commit = await control(handle`commit`, commitDeadlineMs)
  transactionOpen = false
  if (commit.command !== "COMMIT") throw dedicated_database_transaction_aborted
  ```

  - COMMIT rejected with a non-loss error: `transactionOpen = false` and no rollback is sent (the
    server has already ended the block; a later `ROLLBACK` gives `25P01`). The original error is
    rethrown.
  - COMMIT lost or past its deadline: the session is lost and terminated, and the call rejects
    `session_lost`. The outcome is unknown, so no result is published.
- `failWith(e)`:
  - `external = scope !== myScope` (a drain owns the block);
  - if not external and `transactionOpen`, `await drain()`; else if `draining`, `await draining`;
  - throw `session_lost` when the signal aborted, the session is lost, or `external`; otherwise
    throw `e`.
  - The callback throwing gives exactly one rollback and rethrows the original error.
- `finally`: `transactionActive = false`.
- Nested or concurrent `transaction`, and `execute` while a transaction is active or while
  draining, reject `dedicated_database_transaction_nested`. Concurrent `execute` calls outside a
  transaction pipeline on the one session and stay allowed.
- `execute` on an already-aborted signal issues zero statements and rejects `session_lost`. An
  abort during `execute` rejects `session_lost` immediately and triggers `cancelInFlight()`; the
  drain at lease release or an explicit `cancelActiveAndRollback` confirms the session.
- `assertAlive` issues the identity statement under G1/G3. No row, or a foreign identity, is
  `session_lost`.

Cancel, drain, and termination:

- `cancelInFlight()` is single-flight through `cancelling`. It does nothing when `inFlight` is
  empty. Otherwise it issues the control cancel statement, bounded by
  `DEDICATED_CANCEL_DEADLINE_MS`. Triggers: signal abort (in `execute` and `transaction`) and the
  drain.
- `drain()` (single-flight; it is what `cancelActiveAndRollback(reason)` runs):

  ```text
  drain(): if (draining) return draining; scope++; draining = (async () => {
    deadlineAt = now + DEDICATED_DRAIN_DEADLINE_MS
    if (lost) return terminateAndWait(deadlineAt)
    await cancelInFlight()
    await every inFlight settlement, bounded by deadlineAt   // expiry → terminateAndWait
    try { await control(transactionOpen ? handle`rollback` : handle`select 1`,
                        min(DEDICATED_CONTROL_STATEMENT_DEADLINE_MS, deadlineAt - now))
          transactionOpen = false; return "rolled_back" }
    catch { return terminateAndWait(deadlineAt) } })().finally(() => draining = null)
  ```

  - The rollback-versus-confirmation choice is made only after every in-flight statement
    (including an in-flight `begin`) has settled. So a `BEGIN` that resolves during the drain is
    rolled back, never re-pooled. This orchestrator hardening closes a race the prototype did not
    exercise.
  - `scope++` hands the block to the drain: the transaction path sees that it no longer owns the
    block and joins `draining` instead of issuing its own rollback. Exactly one rollback is sent.
  - The return union stays `"rolled_back" | "connection_terminated"`.
- `terminateAndWait(deadlineAt)`:
  - sets `lost = true` and issues the control terminate statement, bounded by the remaining time;
  - then polls liveness every `DEDICATED_TERMINATION_POLL_INTERVAL_MS` until `deadlineAt`;
  - returns `"connection_terminated"` once the backend is gone;
  - otherwise throws `dedicated_database_drain_unconfirmed`.
  - The reserved handle is never used for termination (D1).
  - It is idempotent: a backend that is already gone returns at once. Because termination matches
    `backend_start`, a connection that the driver reconnected to a new backend for ordinary traffic
    is never terminated.
- Every path that marks a session lost ends in `terminateAndWait` before the lease is discarded. A
  lost-but-still-open socket is then closed by the server, and the pool recovers the slot through
  its closed queue instead of leaking it.
- Budget: cancel ≤ 1,500 ms, then confirmation or rollback ≤ min(2,000, remaining), then terminate
  plus poll for the rest, all inside 4,500 ms.

Release and termination (G5):

- A handle is released only when all three hold:
  - it is not lost;
  - its final confirmation (the drain's `rollback`/`select 1`, or for the advisory lease the exact
    unlock) resolved;
  - `release()` is called in the same continuation as that resolution, with no `await` in between,
    so no `onclose` can run in between.
- A lost or terminated handle is never touched again and never released (D2). The lease is
  discarded.
- A lease-release drain failure (`drain_unconfirmed` or `connection_terminated`) stays contained in
  `withDedicatedDatabaseSession`'s `finally`. It never turns a returned `run` result into a
  failure. The lease is discarded, and a later bounded telemetry/diagnostic owner may count it.
  An explicit `cancelActiveAndRollback` call rejects `drain_unconfirmed` to its caller.

Advisory-lock lease (`withDedicatedDatabaseAdvisoryLock`, fixes D6):

- The `pg_try_advisory_lock` statement runs through the guarded session.
  - Exact `false` throws the caller's `conflictCode` without invoking `run`. No lock is held, so no
    unlock is sent, and the lease follows the "otherwise" branch below (terminated, never
    released). The existing conflict termination behaviour is preserved.
- `finally`, on every path after the lock was acquired (success, throw, abort):
  1. `drain()`;
  2. when not lost, exactly one `pg_advisory_unlock(key)` through the guarded session;
  3. release in the same continuation only when the unlock returned exactly `true`.
- Otherwise (unlock false, error, loss, drain failure, or never acquired), `terminateAndWait` and
  never release.
- `run`'s result or error propagates unchanged. Lease-teardown failures are contained as above.

Affinity probe (supersedes the key choice of R2; R2's explicit `begin`/`commit` and `ownerAcquired`
rules stay):

- The probe is built on `guardSession`. Both the owner and the verifier are guarded, so a lost probe
  handle is terminated and never released.
- Key: a per-probe random two-int key, as the design payload recommends. The call is
  `pg_try_advisory_lock($ns::int4, $key::int4)`, where `$ns = MAINTENANCE_AFFINITY_PROBE_LOCK_NAMESPACE
  = 551022` (derived from TASK-551-02-L02, following the 06-L03 derivation style) and `$key` is a
  fresh `crypto.randomInt(1, 2 ** 31)` for each probe. The owner, the verifier and the `finally`
  unlock all use that same pair.
  - `551022` shares no namespace with the landed inventory (`20260604`, `20260628`, `20260818`,
    `548`, `547`, `551063`).
  - Two-int keys live in `objsubid 2`, so they never collide with any bigint key.
- Replica semantics (binding): the probe is a per-process proof of physical-session affinity, not
  leader election. Concurrent replicas probe independently and no longer contend.
  - A random-key collision between two overlapping probes has probability about 2⁻³¹ per pair. It
    fails closed with `database_maintenance_session_unavailable` and is never cached as success;
    the next probe draws a new key.
  - The rejected alternative was to keep the fixed key and retry on owner contention (3 attempts
    within 3 s). That serialises N replicas at about 0.4-1.3 s each.
- `client.ts` exports `MAINTENANCE_AFFINITY_PROBE_LOCK_NAMESPACE`.
- The test-override input of `setDatabaseClientRuntimeForTests` gains the optional field
  `affinityProbeKey` (an int4), which pins the key for the pre-holder legs.
- `AFFINITY_PROBE_LOCK_KEY = 551551551n` is deleted.
- Capacity: the probe holds the owner and the verifier and needs the control slot. So
  `assertMaintenanceSessionAffinity` fails closed with `database_maintenance_session_unavailable`
  before reserving anything when the active channel has fewer than 3 sessions: `poolMax < 3` in
  `off + primary` (`:287`), or `maintenancePoolMax < 3` in `direct|session`.

Test seam (binding):

- `export function resetMaintenanceSessionAffinityForTests(): void { lifecycleGeneration += 1;
  affinityProofPromise = null; }`. It ends no client.
- `setDatabaseClientRuntimeForTests` does NOT call it automatically. That keeps 06-L03's
  generation "Ordering law" (`tests/integration/runtime/retentionScheduler.test.ts:19-21`)
  unchanged.

#### R6.3 — Known limitations (documented, not fixed)

- Driver residual (postgres.js 3.4.9 `src/connection.js:535-551`, `:436-457`):
  - Terminating a backend while a statement is active leaves the old `query`/`errorResponse` on
    the Connection. The first query that reconnects that pool slot then fails once with `57P01`.
    In probe p8 (active), query #1 was rejected and query #2 succeeded.
  - No documented API fixes this. Mitigation:
    1. Termination is the last resort, reached only after the server-side cancel and the
       rollback/confirmation both failed or the session was already lost. Idle termination (every
       loss path) does not trigger the residual.
    2. In `direct|session` mode the residual lands on the maintenance pool only, never on ordinary
       traffic. In `off + primary` mode one later ordinary query may fail once with `57P01`.
    3. Every dedicated-session statement classifies `57P01` as a loss, so a dedicated caller gets
       `session_lost` and never a result from a stale slot. That handle is terminated (idle, a
       no-op if it is already gone), which closes the slot.
  - Forced termination with an active statement is therefore tested only with fakes (R6.6).
- Partial partition: the client socket closes but the backend stays alive. The control connection
  may still report the backend "alive". This is bounded by the control deadlines: the next
  statement on the dead socket misses its deadline, is classified as a loss, and is terminated.
- `drain_unconfirmed`: when neither cancel/rollback nor termination can be confirmed (for example
  the control connection is unavailable), the handle is discarded unreleased. Its pool slot comes
  back only when the socket closes. For an open block, that is the server's
  `idle_in_transaction_session_timeout` startup bound. Otherwise it is a TCP failure or process
  close. The bounded code surfaces to explicit `cancelActiveAndRollback` callers.

#### R6.4 — Scope and envelope change (binding)

- File Ownership adds `core/db/dedicatedDatabaseSession.ts` (hard cap 600 lines) and the new DB-free
  fake-leg suite `tests/integration/server/task551DedicatedSessionGuards.test.ts` (hard cap 800
  lines).
- `core/db/client.ts` (736 lines today) cannot take about 350-400 more lines within 1,000.
  `tests/integration/server/task551DatabaseLifecycle.test.ts` (818 lines) cannot take the fake
  matrix; it keeps only the re-baselines in R6.6.
- Envelope `json` fence, edited in place:
  - `allowlist` += `core/db/dedicatedDatabaseSession.ts` (after `core/db/client.ts`) and
    `tests/integration/server/task551DedicatedSessionGuards.test.ts` (after
    `tests/integration/server/task551DatabaseLifecycleRealDb.test.ts`);
  - `database-lifecycle-test` `argv` += `tests/integration/server/task551DedicatedSessionGuards.test.ts`
    (6 tokens);
  - its `positiveDiscovery.paths` += the same path, with `minimum` 2 → 3.
  - No other command, occurrence, lane, environment profile or `forbiddenPaths` entry changes.
    The fence parses as JSON.
  - The family preflight (`preflightTask551DispatchSnapshot`, `sourceHead` `9c5b6666`,
    repo-relative paths) passed after the edit on 2026-09-25.
- The guards suite imports `core/db/dedicatedDatabaseSession.ts` directly (no environment needed).
  Only F16/F17 import `core/db/client.ts`, under the same airtight
  `DATABASE_URL=postgresql://127.0.0.1:1/none` convention the lifecycle suite already uses. It opens
  no database connection. It stays a Bun-lane suite, because its owning command is
  `database-lifecycle-test`.
- Implementer FAST gates, restating B1:
  - `./node_modules/.bin/eslint --max-warnings=0` over `core/db/client.ts`,
    `core/db/dedicatedDatabaseSession.ts`, `tests/integration/server/task551DatabaseLifecycle.test.ts`,
    `tests/integration/server/task551DatabaseLifecycleRealDb.test.ts` and
    `tests/integration/server/task551DedicatedSessionGuards.test.ts`;
  - the airtight run of the B1 command with `tests/integration/server/task551DedicatedSessionGuards.test.ts`
    appended after the RealDb file;
  - `wc -l` over all five files, and `git diff --check`.
- The orchestrator owner-map run on `DATABASE_URL3` also appends the guards file. The R5 receipt
  addendum records line counts and sha256 for all five files.
- The generated `tests/bun-lane-manifest.json` is still not hand-edited (B1 precedent; the
  rebaseline belongs to 01-L01).

#### R6.5 — Connection budget (+1 control slot)

`assertDedicatedDatabaseSessionBudget(input)` counts one control slot:

- `off + primary`: `poolMax >= lockOwners + workSessions + ordinaryHeadroom + 1`.
- `direct|session`: `maintenancePoolMax >= lockOwners + workSessions + 1`.
- `transaction + primary` stays unavailable.

The control slot is additive, not shared with ordinary headroom. A drain's cancel/terminate must
not queue behind saturated ordinary traffic within its 4,500 ms deadline. The design payload's
alternative `max(ordinaryHeadroom, 1)` form is rejected for that reason.

Worked values (TASK-548 Guide ingest: lock owner 1, work session 1, headroom 1):

- `DB_POOL_MAX >= 4` under `off + primary` (was 3);
- `DB_MAINTENANCE_POOL_MAX >= 3` under `direct|session` (was 2).

The standalone affinity probe needs 3 sessions (R6.2).

#### R6.6 — Test matrix (binding)

Fake legs, new file `tests/integration/server/task551DedicatedSessionGuards.test.ts` (DB-free):

- Fake shape:
  - The fake reserved handle has no `begin` and no `options`. Its results carry a mutable `state`
    and a `command` tag.
  - The fake control executor records control statements and answers liveness, cancel and
    terminate.
  - The epoch is driven through `maintenanceConnectionCloseObserver`.
- Deadline legs use injected short deadlines or a fake clock. No fixed sleeps.

| Leg | Scenario | Required outcome |
|---|---|---|
| F1 | COMMIT tag `ROLLBACK` | `dedicated_database_transaction_aborted`. The sequence is identity, `begin`, statement, `commit`, then at release `select 1`. No `rollback` is sent. |
| F2 | Callback throws | Exactly one `rollback`. The original error is rethrown. |
| F3 | Signal already aborted (`transaction` and `execute`) | Zero statements. `session_lost`. |
| F4 | COMMIT rejects `23505` | No `rollback`. `transactionOpen` is false. `23505` is rethrown. |
| F5 | COMMIT rejects `CONNECTION_CLOSED` | Lost, `terminateAndWait`, `session_lost`. `release` is never called. |
| F6 | `liveState.pid` mutated before issue | `session_lost` with zero statements issued on the handle. |
| F7 | Epoch bumped, control says alive | The call proceeds (no false positive). |
| F8 | Epoch bumped, control says gone or times out | Lost. No statement is issued on the handle. |
| F9 | Result with a foreign `state.pid` | Lost, `session_lost`, result discarded. |
| F10 | Nested and concurrent `transaction`; `execute` while a transaction is active or draining | `dedicated_database_transaction_nested`. |
| F11 | External `cancelActiveAndRollback` during a transaction | Exactly one `rollback`. The transaction rejects `session_lost`. |
| F12 | Abort during the callback | Exactly one control cancel (single-flight), then one `rollback`. |
| F13 | Rollback misses its deadline | Terminate, poll until gone, `connection_terminated`. `release` is never called. Total time ≤ `DEDICATED_DRAIN_DEADLINE_MS`. |
| F14 | Control connection unavailable | `dedicated_database_drain_unconfirmed`. `release` is never called. |
| F15 | Idle release | One `select 1`, zero `rollback`, `release` exactly once. |
| F16 | Advisory lease (via `client.ts`) | `pg_advisory_unlock` runs in `finally` on the throw path; exact `true` → release once; `false` → terminate, never release. |
| F17 | Probe whose owner is not acquired (via `client.ts`) | No unlock is sent. Owner and verifier drain and release (not lost). |
| F18 | Transaction handle retained after its scope | Rejected `session_lost` with zero statements. |
| F19 | `withPoolOptions` | Returns the same object. `options` is the live pool `options` by reference (identity equality before and after a test override). |
| F20 | Classifier table | Every code in G4 is a loss; `57014`, `25P02`, `40P01` and `23505` are not. |
| F21 | `BEGIN` resolving while a drain is in flight | That drain sends `rollback`, not `select 1`. |
| F22 | Forced termination while a statement is active (replaces the real leg; R6.3) | `connection_terminated`, `release` never called, handle discarded. |

Re-baselines in `tests/integration/server/task551DatabaseLifecycle.test.ts` (intended contract
changes named by R6, not weakenings):

- `makeFakeReserved` results gain `state` and `command`. The lease responder answers the identity
  snapshot. The pool fake gains the control statements.
- `:679-693` (terminate when the drain rollback fails): `pg_terminate_backend` is now a control
  statement followed by a liveness poll, and `releases` 1 → 0.
- `:695-706` (already-aborted `execute`): the expected `cancel select 1` call becomes zero
  statements issued. The idle lease still confirms and releases once.
- `:708-716` (`assertAlive` with no row): the empty responder now fails the lease-start identity
  snapshot, which is a loss, so the rejection is still `dedicated_database_session_lost` and
  `releases` 1 → 0.
- `:732-744` (conflict code without running the body): `releases` 1 → 0 (the conflicted lease is
  terminated, never released).
- `:746-773` (conflicted lock terminates): the `pg_backend_pid` call on the reserved handle is gone
  (identity comes from the snapshot), and `releases` 1 → 0.
- `:775-794` (exact unlock `false`): the same two changes.
- `:796-` (unlock and release after success): only the fake shape changes.
- B2's `:664`, `:675`, `:679-690` re-baselines stay as written.
- Every other behaviour assertion is kept. The file stays at or under 1,000 lines.

Real-DB legs, `tests/integration/server/task551DatabaseLifecycleRealDb.test.ts`:

- The gate is unchanged (presence-only owner map; the fixture URL is the only URL dialed; each test
  has a `60_000` timeout).
- The recorder pool is `postgres(<fixture URL>, { max: 3, onnotice: <recorder>, onclose:
  maintenanceConnectionCloseObserver, connection: { client_min_messages: "notice" } })`.
- `resetMaintenanceSessionAffinityForTests()` runs before each probe leg.
- Zero-WARNING guard:
  - every zero-WARNING assertion first asserts that `current_setting('client_min_messages')` is
    `notice`, `log` or `debug*`;
  - a canary (an idle `rollback` on the recorder, recording exactly one `WARNING:25P01`) runs once
    before any zero-WARNING assertion is trusted.
- Pre-holder: a separate `postgres(<fixture URL>, { max: 1 })` client takes the pinned pair with
  `pg_advisory_lock($ns, $key)`, and unlocks it and `end()`s in `finally`.

| Leg | Scenario | Required outcome |
|---|---|---|
| R4.1-R4.5 | As written (B1), with key-specific wording read against the pinned `affinityProbeKey` | Unchanged. |
| R4.6 | As written (B2) | Unchanged. |
| R6-a | Pinned key pre-held | `database_maintenance_session_unavailable`. Zero WARNINGs after the canary. |
| R6-b | `select 1/0` inside the callback, then COMMIT | `dedicated_database_transaction_aborted`. Zero WARNINGs. |
| R6-c | `execute(select pg_sleep(30))` aborted after 1.5 s | Rejects `session_lost`. The drain returns `rolled_back` within 4,500 ms measured from the abort. The owner-side observer shows that PID not `active`. The lease is released and three follow-up pool queries succeed. |
| R6-d | Same as R6-c inside a transaction via `drizzle(withPoolOptions(tx))` | Same outcome. Exactly one `rollback`. |
| R6-e | External `pg_terminate_backend` on an idle lease (from the pre-holder client) | The next call rejects `session_lost` without hanging and with no uncaught error. The lease is discarded (never released). Three follow-up pool queries succeed. |
| R6-f | Lost handle | `release` is never called on the lost handle (test-side reserve wrapper counts releases). |
| R6-g | After an unrelated idle-timeout close on the recorder pool (`idle_timeout: 1`) | A new dedicated transaction still succeeds (epoch verify, no false loss). |
| R6-h | Two simultaneous probes on two fresh lifecycle generations with random (unpinned) keys | Both succeed (collision regression for D5). |

- None of these legs touches an application table.
- Prototype measurements, for sizing only (not contract):
  - R6-c took 1,190-1,635 ms from abort to `rolled_back`, including a cold control connect;
  - R6-d took 882-1,708 ms;
  - with cancel disabled, forced termination finished in 3,778-3,903 ms.

#### R6.7 — Cross-leaf handoffs (this leaf edits none of these files)

- **TASK-551-06-L03** (land order: 02-L02 R6 → 06-L02 R8/R9 → 06-L03 R1, extending B3):
  - The probe-key inventory in `tests/integration/runtime/retentionScheduler.test.ts:448-462` lists
    `[0, 551551551]`. That becomes stale: replace the row with an assertion that
    `RETENTION_JOB_LOCK_NAMESPACE !== MAINTENANCE_AFFINITY_PROBE_LOCK_NAMESPACE`, importing the
    namespace from `core/db/client`.
  - The collision-inventory comment in `core/services/maintenance/retentionJobService.ts:170-179`
    (at `:178`, "the dedicated-session affinity probe's single key 551551551 (which lives in
    classid 0)") must name the two-int namespace `551022`.
  - Its drizzle-over-transaction adapter (`retentionJobService.ts:282`) consumes `withPoolOptions`
    (B3). The handle is now a scoped Proxy with no `begin`/`release`, and it expires with its
    scope.
  - `session.cancelActiveAndRollback("retention_lock_lost")` (`:259`) may now reject
    `dedicated_database_drain_unconfirmed`. Its callers map the new
    `dedicated_database_transaction_aborted`, `…_nested` and `…_drain_unconfirmed` codes at the 06-L03
    boundary.
  - The generation "Ordering law" is unaffected because the reset seam is never automatic.
- **TASK-548-01-L03**: the Guide budget becomes `DB_POOL_MAX >= 4` under `off + primary` and a
  maintenance pool of at least 3 under `direct|session`
  (`TASK-548-01-L03-…md:1064`, `:2040`). It still calls the helper and never re-implements the
  matrix.
- **TASK-551-02-L01** (`core/db/databaseConfig.ts`, forbidden here):
  - `DB_MAINTENANCE_POOL_MAX` is parsed with default 2, minimum 2 (`databaseConfig.ts:326`), and
    `sessionAffineMaintenanceCandidate` uses `poolMax >= 2` (`:365`).
  - Under R6, a `direct|session` deployment on the default 2 fails closed at its startup probe
    with `database_maintenance_session_unavailable`.
  - 02-L01 must raise the default and minimum to 3 and the primary candidate bound to 3, and
    re-derive the fleet budget, before any deployment enables `direct|session`. Until then this
    leaf's fail-closed check is the guard.
  - This is an open dependency for the orchestrator. R6 does not widen scope into 02-L01.

#### R6.8 — Superseded sentences (quoted)

- Implementation Pseudocode: "It tracks the current postgres.js `PendingQuery` through its
  supported `cancel()` surface without debug hooks or undocumented pool internals."
  - Replaced by the server-side control cancel (R6.2).
- Implementation Pseudocode: "false, error, abort, session loss, or ambiguous result uses the
  owner's private reserved-handle termination path, awaits backend disappearance, and never
  returns that connection to a pool."
  - Termination now uses the control connection (`terminateAndWait`), never the reserved handle.
    The "never returns" rule stands.
- Implementation Pseudocode: "`off + primary` requires `DB_POOL_MAX >= 2` and the live affinity
  proof".
  - Now `DB_POOL_MAX >= 3`.
- Implementation Pseudocode: "(for example the TASK-548 Guide ingest budget of two dedicated
  sessions plus one ordinary-query headroom slot requires `DB_POOL_MAX >= 3` under
  `off + primary`)".
  - Now `>= 4` (R6.5).
- Implementation Pseudocode comment: "fewer than two available physical sessions" and "Unlock on
  the owner's same PID and release/cancel both sessions in finally." (R2 had already superseded
  the latter.)
  - Now fewer than three. Only non-lost probe handles are released.
- Implementation Pseudocode: "fails before work when the primary pool has fewer than two
  sessions."
  - Now fewer than three.
- Testing Requirements: "raising capacity to 2 permits the probe."
  - Now 3. The `DB_POOL_MAX=1` fixture otherwise stands.
- R2: "then release both sessions in `finally`."
  - Release only non-lost handles after confirmation; lost handles go through `terminateAndWait`.
- R3: "If `input.signal` is already aborted, it drains through
  `drainActiveAndRollback(input.signal)` and throws `dedicated_database_session_lost`, as today."
  - Zero statements, `session_lost` (F3).
- R3: "On any error from `begin`, `run` or `commit`, it calls `drainActiveAndRollback(input.signal)`
  (`:367-384`; its rollback-else-terminate outcome is unchanged) and rethrows."
  - `failWith` and the COMMIT rules in R6.2. A non-loss COMMIT error sends no rollback. The COMMIT
    tag `ROLLBACK` gives `dedicated_database_transaction_aborted`.
- R3: "The rethrown error is `dedicated_database_session_lost` when the signal aborted, otherwise
  the original error."
  - `session_lost` also on loss or on an external drain. `transaction_aborted` on the COMMIT tag.
    `transaction_nested` on nesting.
- R3: "The callback receives `reserved` itself as its transaction handle."
  - It receives the scoped guarded handle (R6.2).
- R4: "It builds its own `postgres(<fixture URL>, { max: 2, onnotice: <recorder> })` pool", and B1:
  "its own `max: 2` pool with the `onnotice` recorder".
  - `max: 3` with `onclose` and `client_min_messages` (R6.6).
- B1: "The envelope edit is `allowlist` += the new path, the `database-lifecycle-test` argv += the
  new path, and its `positiveDiscovery.paths` += the new path with `minimum` 1 → 2. No other
  command, occurrence or `forbiddenPaths` entry changes."
  - Extended by R6.4 (two more allowlist paths, one more argv/discovery path, `minimum` 2 → 3).
- B1 and R5 FAST gates, and the receipt "line counts and sha256 for all three files".
  - Now five files (R6.4).
- B2: "The implementer runs this assertion against the real driver first. If it passes unguarded,
  record that and leave the drain unchanged."
  - Probe p1 confirmed the warning, so the guard is unconditional.
- B2: "The flag is set before the wrapper issues its own `begin` and cleared only after that
  wrapper's `commit` or `rollback` resolves."
  - The flag is set when `begin` resolves with the `BEGIN` tag. It is cleared per the R6.2 COMMIT
    and drain rules, including a non-loss COMMIT rejection. The drain chooses only after in-flight
    statements settle.
- B2: "The return union `"rolled_back" | "connection_terminated"` and terminate-on-confirmation-failure
  stay unchanged."
  - The union stands. An unconfirmed termination now rejects
    `dedicated_database_drain_unconfirmed` (R6.2).

## Dated Contract Corrections — 2026-09-25 (re-open R7: dedicated-client pivot; supersedes R6; append-only)

Append-only. R7 supersedes the re-open amendment R6 (R6.2-R6.8) in full and the sentences of the
earlier sections quoted in R7.12. R6.1 stays as historical defect evidence: every D1-D7 site lives
in the reserve-based code that R7 deletes. Where anything above disagrees with R7, R7 wins. No
earlier byte is edited. The Workflow Dispatch Envelope `json` fence is NOT edited: the entries that
R6.4 added (`core/db/dedicatedDatabaseSession.ts`,
`tests/integration/server/task551DedicatedSessionGuards.test.ts`, the `database-lifecycle-test`
argv and `positiveDiscovery.paths` with `minimum` 3) are exactly the paths R7 needs (R7.10).

Anchors were grounded on 2026-09-25 against `/home/coder/project/Coderso-551` at HEAD `ee4c7f93`
(checkpoint C0). The worktree was dirty only in 06-L02/06-L03 files that R7 does not own.
`core/db/client.ts` has 736 lines and is unchanged since `9c5b6666`. Other counts:
`tests/integration/server/task551DatabaseLifecycle.test.ts` 818, `core/db/connectionTargets.ts`
404, `core/db/databaseConfig.ts` 368, `core/services/maintenance/retentionJobService.ts` 947 and
`tests/integration/runtime/retentionScheduler.test.ts` 998, all clean against HEAD. Line numbers are
anchors, not contract.

### R7.1 — Evidence (pivot design run; review evidence, not repository artifacts)

An orchestrator-dispatched design run probed `coderso02` (`DATABASE_URL3`; the URL has no port, so
5432) with postgres.js 3.4.9, Bun 1.4.2 and PostgreSQL 18.4. It then ran a 10-leg prototype of the
design below. All 10 legs passed with no uncaught error and zero residue (0 probe sessions, 0 probe
locks). The probe scripts were scratch-only.

The decisive finding is the reason R7 uses literal transaction statements:

- Native `client.begin()` on a `max: 1` client is unsafe. If the backend is killed while a
  transaction statement is running, begin() sends its automatic rollback over the closed socket.
  That throws an uncaught `TypeError` at `node_modules/postgres/src/connection.js:254-255`
  (`socket.write` on null), and the process exits 1 (probe p2g, native variant).
- The literal-`BEGIN` variant exits 0 with no `TypeError`.
- `core/` installs no `uncaughtException` or `unhandledRejection` handler.
- A top-level statement or a nested `client.begin` issued inside begin() on a `max: 1` client waits
  forever (deadlock, p1d).

Probe digest (sizing and design evidence, not contract):

| Probe | Result |
|---|---|
| P0 | `result.state.pid === pg_backend_pid()` on the direct target. `show pool_mode` returns `42704`, so it cannot tell direct from pooled. Cold first query 564 ms. `client_connection_check_interval` exists (default 0). |
| P1c | A literal `BEGIN` on a `max: 1` client is allowed: the `UNSAFE_TRANSACTION` guard (`connection.js:605-606`) fires only when `max !== 1 && !connection.reserved`. `COMMIT` on an aborted block resolves with tag `ROLLBACK` and no notice. |
| P1e | A tx-local `set_config('statement_timeout','4000',true)` reads 4 s inside the transaction and 15 s after it, on the same PID. |
| P1f/g | `drizzle(ownClient)` works and mutates only that client's own `options.parsers`. `drizzle(rawTx)` throws (`options` undefined). |
| P2 | After an idle kill, the next query SILENTLY reconnects to a new PID (`result.state` mutated in place; `onclose` fires once). With `end({ timeout: 0 })` inside `onclose`, the next query rejects `CONNECTION_ENDED` in 0-1 ms, with no reconnect and no ghost backend. Statements pipelined at kill time reject `CONNECTION_CLOSED`. `end()` on an idle-in-transaction session holding a session lock and a transaction lock took 32 ms, and both locks were free at once. |
| P3 | Native `Query.cancel()` had no effect after 4,003 ms (confirms R6.1 D4). `pg_cancel_backend` from a cold control client reached `57014` 411 ms after the abort (53 ms warm). Cancel then `end()` inside a transaction took 1,319 ms, lock free. With `client_connection_check_interval=1000`, destroy-only (`end({ timeout: 0 })`) during `pg_sleep` rejected the client side in 2 ms and the backend was gone in 282 ms. Without it, the backend was still alive after 6 s. Cold control connects took 380-667 ms (R6 saw 1,952 ms once). |
| P4 | A session lock survives two literal transactions plus 1.2 s of non-DB work on one PID, and an independent client cannot take it. With `idle_timeout: 1` the client silently reconnected after 1.8 s idle and the lock was lost, so `idle_timeout: 0` and `max_lifetime: null` must be explicit. `pg_terminate_backend` to backend gone took 110 ms. |

Prototype legs L1-L10 (all passed):

- L1: drizzle over the scoped handle runs on the session PID. The tx timeout is 4 s and reverts.
  drizzle `.transaction` gives `nested`. A graceful close returns `rolled_back` and frees the lock.
- L2: a swallowed statement error gives `transaction_aborted`, and the session stays usable.
- L3: a throwing callback gets exactly one rollback.
- L4: an abort mid-statement inside a transaction rejects in 6 ms. The backend was confirmed gone
  442 ms after the abort.
- L5: an external idle kill makes the next call reject `session_lost` in 0 ms, with no reconnect.
- L6: an external kill mid-transaction statement gives `session_lost` with no uncaught error.
- L7: the watchdog fires at 2,561 ms for a 2,000 ms bound plus 500 ms grace.
- L8: every nesting form gives `nested`, and a retained handle gives `session_lost`.
- L9: parallel sessions get distinct PIDs.
- L10: an already-aborted signal issues zero statements.

Driver facts re-grounded here:

- `idle_timeout` defaults to `process.env.PGIDLE_TIMEOUT` (`types/index.d.ts:55-57`).
- `max_lifetime` defaults to a random 30-60 min (`src/index.js:515-517`).
- The query execution triggers are the `this.handle()` call sites in `src/query.js`: `forEach`
  `:125`, `execute` `:144`, `then` `:149`, `catch` `:154` and `finally` `:159`.

### R7.2 — Target and deployment rule (grounded; fail closed)

The seed claim "DATABASE_DIRECT_URL required ... per the existing connectionTargets rule (:133,
:262-274)" was checked against the source:

- `core/db/connectionTargets.ts:133` lies inside the `DatabaseUrlInspection` type (`:125-138`).
- `:262-274` is the tail of `resolveDefaultDatabaseTarget` (`:259-269`, informational only) plus
  `pooledPortHint` (`:271-276`).
- The actual rule is the module header (`:1-73`) and `resolveSessionDatabaseTarget` (`:333-394`):
  - use `DATABASE_DIRECT_URL` when it is set, and refuse it when it is pooled or unverifiable;
  - otherwise fall back to `DATABASE_URL`, but only when that URL is verified non-pooled;
  - otherwise refuse.
- That rule does not make `DATABASE_DIRECT_URL` mandatory.
- The L01/L02 maintenance channel is keyed on `DB_MAINTENANCE_MODE`/`DB_MAINTENANCE_URL`
  (`databaseConfig.ts:217-263`, `:320-328`).

R7 composes the two sources without adding a third:

| L01 mode | Dedicated-session target |
|---|---|
| `off + primary` | `resolveSessionDatabaseTarget("dedicated_database_session")`: `DATABASE_DIRECT_URL` when set, else a verified non-pooled `DATABASE_URL` |
| `transaction + primary` | unavailable (unchanged) |
| `direct` (either PgBouncer mode) | `DB_MAINTENANCE_URL`, accepted only when `inspectDatabaseUrl(url, resolvePooledDatabasePort(env), env)` is `verified` and not `pooled`. This is the same fail-closed rule. |
| `session` | unavailable. PgBouncer would be in the path, and the live proof below cannot pass because PgBouncer's BackendKeyData is its own. |

Rules for every row:

- Any resolver throw, an unverifiable URL, or an unavailable row rejects
  `database_maintenance_session_unavailable`. The resolver's message is not surfaced; it is
  credential-free, but the boundary emits only the bounded code.
- An unverifiable URL includes a unix socket, a host list and a custom transport. R6 open decision
  O2 is resolved conservatively, per the connectionTargets rule; the remedy is an explicit TCP port.
- The factory passes no `host`, `port`, `path` or `socket` option, so the endpoint dialled is the
  endpoint that was inspected (the `core/db/sessionClient.ts:50-62` rule).
- The target is read at open time, not at module import. The maintenance pool that
  `client.ts:101-113` builds at import is deleted (R7.9).
- Test URL placeholders from `setDatabaseClientRuntimeForTests` (`databaseUrl`, `maintenanceUrl`)
  overlay `DATABASE_URL`/`DB_MAINTENANCE_URL` in the env map handed to the resolver.

The live proof runs at every open:

- The first statement's `result.state.pid` (the BackendKeyData PID) must equal the
  `pg_backend_pid()` it returns (P0).
- A mismatch means a pooler is in the path. The client is destroyed and the open rejects
  `database_maintenance_session_unavailable`.
- Deployment requirement: dedicated sessions need a non-pooled PostgreSQL endpoint. Behind a
  transaction pooler (the Render shape: `DATABASE_URL` → 6432), declare `DB_MAINTENANCE_MODE=direct`
  with the direct URL.
- Accepting `DATABASE_DIRECT_URL` under `transaction + primary` (R6 open decision O1) is an L01
  compatibility-matrix change. R7 does not adopt it; it stays an open owner decision for 02-L01
  (R7.11).

### R7.3 — Binding design: one session is its own client

New module `core/db/dedicatedDatabaseSession.ts` (hard cap 600 lines; expected 350-450):

- It is dependency-injected:
  `openDedicatedDatabaseSession(deps, target)` with
  `deps = { createClient(target), createControlClient(target), clock, bounds }`.
- It imports only `postgres` types. It imports no `client.ts`, `databaseConfig`, schema, drizzle,
  settings or runtime module, so there is no import cycle and the DB-free guards suite imports it
  with no environment.

Client options (the real factory lives in `client.ts`):

```ts
postgres(target.url, {
  max: 1,
  idle_timeout: 0,          // explicit: otherwise PGIDLE_TIMEOUT applies (P4 hazard)
  max_lifetime: null,       // explicit: the default recycles after 30-60 min
  connect_timeout: Math.ceil(DEDICATED_OPEN_DEADLINE_MS / 1000),
  prepare: true,
  onclose: () => { if (!closing) markLost(); },
  connection: {
    ...boundedStartupConnectionParams(buildDatabaseApplicationName("maintenance", identity.replicaId)),
    client_connection_check_interval: DEDICATED_CLIENT_CONNECTION_CHECK_INTERVAL_MS,
  },
});
```

- The spread is the existing `client.ts:71-78` L01 values.
- Right after construction, the real factory constructs `drizzle(client, { schema })` once. This
  applies drizzle's transparent parsers eagerly to THAT client's own `options`. Raw `execute`
  results on a dedicated session then always return strings for the eight date/time OIDs. The
  primary `db` and `sqlClient` are never mutated.

Open:

```text
open(deps, target):
  client = deps.createClient(target)
  r = await deadline(client`select pg_backend_pid() as pid,
        (select backend_start::text from pg_stat_activity where pid = pg_backend_pid()) as started`,
      DEDICATED_OPEN_DEADLINE_MS)                     // includes the cold connect
  if (!r[0] || r.state.pid !== r[0].pid): destroy(); throw maintenance_session_unavailable
  id = { pid: r[0].pid, started: r[0].started }       // started only matches control statements
  any open error or deadline: destroy(); throw maintenance_session_unavailable
```

State: `lost`, `closing`, `busy` (one operation at a time), `scope` (a counter), `inFlight`
(executed queries), `commitInFlight`, `poisonPending`, a single-flight `draining` promise and the
watchdog timer.

Loss detection is local to THIS client. There is no global epoch, no pool `onclose` and no
per-statement identity SQL.

- `onclose` sets lost and calls `end({ timeout: 0 })` at once. That is what stops postgres.js from
  silently reconnecting a `max: 1` client on its next query (P2, L5).
- G3: every result must satisfy `result.state.pid === id.pid` (typed `ResultMeta.state`).
  Otherwise mark lost and reject `session_lost`; the result is discarded.
- The loss classifier is R6 G4, kept verbatim:
  - loss: `CONNECTION_CLOSED/ENDED/DESTROYED`, `CONNECT_TIMEOUT`, `ECONNRESET`, `EPIPE`,
    `ETIMEDOUT`, `ECONNREFUSED`, `EHOSTUNREACH`, `ENETUNREACH`, severity `FATAL`/`PANIC`, `57P*`,
    `08*`, `25P03`, and the module's internal deadline error;
  - not loss: `57014`, `25P02`, `40P01` and `23xxx`.
- Watchdog: while `inFlight` holds an executed statement and nothing settles for
  `effectiveStatementTimeout + DEDICATED_STATEMENT_GRACE_MS`, mark lost.
- `markLost()` is terminal: `lost = true`, then `end({ timeout: 0 })`. The session is never reused,
  and `createClient` is never called again for it.
- Every later call issues zero statements and rejects `session_lost`.

Scoped handle (`DedicatedDatabaseTransaction`, also the parameter type of
`StaticDedicatedStatement`):

- It is a Proxy over the session client, one per `execute` call or `transaction` scope.
- The `apply` and `unsafe` traps check scope and lost state, build the query, and return a Query
  proxy. The Query proxy registers the query in `inFlight` on its first execution trigger (`then`,
  `catch`, `finally`, `execute`, `forEach`, R7.1). It observes settlement through
  `Promise.prototype.then.call`, which does not trigger execution, and applies G3/G4 there.
  Methods that return the target (for example `.values()`) return the proxy.
- `begin` and `savepoint` throw `dedicated_database_transaction_nested`. This also blocks drizzle's
  `.transaction`.
- `end`, `close`, `reserve`, `release`, `listen`, `subscribe`, `notify` and `cursor` are `undefined`
  at runtime and absent from the type.
- `options` returns the session client's own `options` object. That is what makes
  `drizzle(tx, { schema })` construct on the same object (P1f/g).
- A handle retained past its scope rejects `session_lost` without issuing anything.

Operations:

```text
execute(stmt, signal):
  if lost || closing || signal.aborted: throw session_lost        // zero statements
  if busy: throw transaction_nested
  busy = true; open scope; on abort -> poison()                  // poison = markLost unless commitInFlight
  try: return await stmt(scoped(scope))
  catch e: throw lost || signal.aborted ? session_lost : e        // non-loss errors unchanged
  finally: close scope; busy = false

transaction({ signal, statementTimeoutMs, run }):
  preconditions as execute; busy = true; open scope; on abort -> poison()
  b = await client`begin`;  if b.command !== "BEGIN": markLost; throw session_lost
  if statementTimeoutMs < config.statementTimeoutMs:
    await client`select set_config('statement_timeout', ${String(statementTimeoutMs)}, true)`
    // binding now; the watchdog uses the effective bound; consumers may only lower it
  try: result = await run(scoped(scope))
  catch e:
    if !lost && !signal.aborted: await client`rollback`           // tracked; its failure is a loss
    throw lost || signal.aborted ? session_lost : e
  close scope
  if lost || signal.aborted: throw session_lost
  commitInFlight = true; c = await client`commit`                 // abort deferred until it settles
  commitInFlight = false; if poisonPending: markLost()
  COMMIT rejects with a loss      -> session_lost (outcome unknown; nothing published)
  COMMIT rejects otherwise (23505) -> rethrow; no rollback (the block already ended)
  if c.command !== "COMMIT": throw transaction_aborted            // session stays usable
  return result

assertAlive(signal) = execute((sql) => sql`select 1`, signal)     // plus G3
```

- There is exactly one operation at a time. An overlapping `execute` or `transaction`, a nested
  `transaction`, `execute` inside a transaction, `tx.begin`, `tx.savepoint` and drizzle
  `.transaction` all reject `dedicated_database_transaction_nested` with zero statements.
- The one landed consumer (06-L03) is sequential on its session
  (`retentionJobService.ts:759-826`, `:911`). TASK-548 (not landed) must stay sequential per session
  as well.

### R7.4 — Cancel, drain and terminate

This reconciles the design run's destroy-first D5 with the orchestrator's cancel decision.
`cancelActiveAndRollback(reason)` is terminal and single-flight. It returns
`"rolled_back" | "connection_terminated"` or rejects `dedicated_database_drain_unconfirmed`.

```text
deadlineAt = now + DEDICATED_DRAIN_DEADLINE_MS                      // 4,500 from drain start
graceful: if !lost && inFlight empty && !destroyed:
  closing = true
  ok = race(client.end({ timeout: DEDICATED_GRACEFUL_END_TIMEOUT_S }).then(() => true),
            sleep(1_900).then(() => false))
  if ok: return "rolled_back"      // Terminate processed: the server rolled back any open block and
                                    // dropped every session lock before closing (P2, L1)
forced:
  destroy()                         // end({ timeout: 0 }) if not already; pending promises reject ~2 ms
  ctl = acquireControlClient(target)   // process-wide, single-flight, refcounted
  every control statement is bounded client-side by
    min(DEDICATED_CONTROL_STATEMENT_DEADLINE_MS, deadlineAt - now)   // includes the cold connect
  cancel:    select pg_cancel_backend(pid) from pg_stat_activity
               where pid = $pid and backend_start::text = $started and state = 'active'
  loop until deadlineAt:
    alive = select exists(select 1 from pg_stat_activity
               where pid = $pid and backend_start::text = $started) as alive
    if !alive: return "connection_terminated"
    if !terminated && now - destroyedAt >= DEDICATED_TERMINATE_AFTER_MS:
      select pg_terminate_backend(pid) from pg_stat_activity
        where pid = $pid and backend_start::text = $started            // exactly once
    sleep DEDICATED_TERMINATION_POLL_INTERVAL_MS
  throw drain_unconfirmed
  finally: releaseControlClient()   // end({ timeout: 0 }) when the last drain releases it
```

- The control client is a second, short-lived
  `postgres(target.url, { max: 1, idle_timeout: 0, max_lifetime: null, connect_timeout: 2, connection: { application_name: <maintenance>, statement_timeout: 2000 } })`.
  It dials the same target, passes no host/port override, and is never a reserved handle.
- Order: destroy first, then cancel. Destroying first makes the abort visible to the caller at once
  and removes every reconnect path. The `pg_cancel_backend` then interrupts a running statement
  without waiting for `client_connection_check_interval`. The terminate is the last resort after
  1,500 ms.
- Measured evidence covers cancel-then-end (P3, 1,319 ms) and destroy-then-confirm (L4, 442 ms).
  The destroy-then-cancel order is not measured, so the RD-cancel real-DB leg (R7.8) is its proof.
- `backend_start` matching guarantees that a recycled PID is never signalled.
- The 57P01 residual, documented and not fixed:
  - `pg_terminate_backend` makes the backend emit `FATAL 57P01` ("terminating connection due to
    administrator command") to its socket and to the server log, and it counts in
    `pg_stat_database.sessions_killed`.
  - The session client was destroyed before the control path ran and is never reused. So no
    consumer observes the 57P01, and no pooled slot inherits a stale `errorResponse`. R6.3's driver
    residual (the first reconnect of a pool slot failing once with `57P01`) cannot occur.
  - What remains is one server-log line and one counter increment per forced termination.
- Abort semantics:
  - An abort during `execute`/`transaction` rejects the caller `session_lost` immediately.
  - It poisons the session (terminal, local destroy), deferred only while a COMMIT is in flight.
  - Confirmation happens in the lease-release drain or in an explicit `cancelActiveAndRollback`.
- No path issues an idle `rollback` or `select 1`, so the B2 `25P01` warning is impossible by
  construction.
- A graceful close with an open block rolls it back on the server; the result is `rolled_back`.
- The graceful/forced split uses a 1,900 ms race marker. A close that finishes in the last 100 ms is
  over-confirmed, which is the safe direction.

### R7.5 — `client.ts` API (names kept; consumer import paths unchanged)

`withDedicatedDatabaseSession(run)` keeps its signature:

```text
withDedicatedDatabaseSession(run):
  await assertMaintenanceSessionAffinity()        // cached startup check (below)
  target = resolveDedicatedSessionTarget()          // R7.2
  slot = await semaphore.acquire(POOL_ACQUISITION_DEADLINE_MS)   // else database_pool_reserve_timeout
  session = await open(realDeps, target); registry.add(session)
  try: return await run(session)
  finally:
    try: await session.cancelActiveAndRollback("lease_release")
    catch: contained                               // never turns a returned result into a failure
    registry.delete(session); slot.release()       // exactly once on every path
```

- The per-process semaphore size is `dedicatedSessionMax = config.maintenancePoolMax` (R7.7). It is
  acquired before the client is created. A late acquisition after the deadline releases its slot
  and never opens a client.

`withDedicatedDatabaseAdvisoryLock({ key, signal, conflictCode, run })` is
`withDedicatedDatabaseSession`:

- It runs one static `pg_try_advisory_lock(${key}::bigint)` through `execute`.
- Anything but an exact `true` throws `conflictCode` without invoking `run`.
- Otherwise it returns `run(session)`.
- There is no explicit `pg_advisory_unlock`. Closing the client is the unlock: a graceful close
  frees the session lock before the socket closes (P2, L1), and a forced close ends the backend.
  This removes R6 D6 and every false-unlock/terminate branch.

`assertMaintenanceSessionAffinity()` keeps its name. It replaces the old probe with a startup
check:

- It first applies the mode matrix in R7.2. `transaction + primary`, `session`, or a target that is
  statically refused reject `database_maintenance_session_unavailable` with ZERO factory calls.
- It then opens one dedicated session through the semaphore; the open includes the key/pid direct
  proof. It closes it gracefully and caches success per lifecycle generation. Failures are never
  cached.
- `assertMaintenanceSessionAffinityIfDeclared()` keeps its current rule: `primary` returns without
  a check, and a declared `direct` checks once at database startup. A declared `session` mode now
  rejects `database_maintenance_session_unavailable`, so database startup fails closed, exactly as a
  failed probe does today.
- The names stay pinned by `scripts/task551QueryInventory/literalDynamicClientImports.ts:305`,
  `:322`, `core/db/databaseLifecycle.ts:36-37`, `:92` and `core/server/jobs/retentionScheduler.ts:61`,
  `:619`.
- The `off + primary` `poolMax < 2` gate at `client.ts:287` is removed: no dedicated session uses
  the primary pool any more.
- `resetMaintenanceSessionAffinityForTests()` (the R6.2 test seam, never automatic) is kept.

What the old probe proved, and why a `max: 1` client makes it inherent:

- Owner PID stability across two transaction boundaries while holding a session lock (no
  transaction pooling):
  - The pool path needed it because `reserve()` could hand out different backends over time.
  - Now it holds by construction: one `max: 1` client, `idle_timeout: 0`, `max_lifetime: null`,
    `onclose` → lost and ended (no silent reconnect), and the G3 PID check on every result.
  - Pooler exclusion is the key/pid equality at open.
- An independent backend cannot take the lock (the pool is not re-entrant):
  - This is trivial now, because each session is its own connection (L9).
- Removed with the probe: `AFFINITY_PROBE_LOCK_KEY` (`client.ts:205`), the verifier, the random-key
  collision handling and R6 D5. There is no advisory key to inventory any more.

`drizzleForDedicatedTransaction(tx: DedicatedDatabaseTransaction): PostgresJsDatabase<typeof schema>`
is new and replaces `withPoolOptions`:

- It returns `drizzle(tx as unknown as Sql, { schema })`. `client.ts` holds this single documented
  cast.
- It works because the scoped handle's `options` is the session client's own object. drizzle
  therefore mutates only that client's parsers (already applied at open), never the primary pool.
- drizzle `.transaction` over it throws `nested`.

`DedicatedDatabaseTransaction` is the scoped handle type. `StaticDedicatedStatement<TRow>` becomes
`(sql: DedicatedDatabaseTransaction) => PendingQuery<[TRow]>` instead of taking `ReservedSql`.

`closeAllDatabaseClientsWithin(budgetMs)` works in this order:

1. It bumps the generation.
2. It calls `end({ timeout: 0 })` on every registry session; their in-flight operations reject
   `session_lost`.
3. It ends the shared control client, if one is open.
4. It ends `sqlClient` exactly as today.

`listDatabaseClients()` returns `[sqlClient]` only.

`DatabaseClientRuntimeOverrideForTests` changes as follows:

- `maintenanceSqlClient` is replaced by `dedicatedClientFactory?: (target) => Sql` and
  `controlClientFactory?: (target) => Sql`.
- `config`, `databaseUrl` and `maintenanceUrl` stay.
- Clearing the override restores the real factories.

### R7.6 — Error codes and constants

- The `DEDICATED_DATABASE_SESSION_ERROR_CODES` ownership and the four `DATABASE_CLIENT_ERROR_CODES`
  keys from R6.2 stand, and their values are unchanged. They are `session_lost`,
  `transaction_aborted`, `transaction_nested` and `drain_unconfirmed`.
- `database_maintenance_session_unavailable` also covers:
  - the R7.2 target refusals;
  - an open failure or deadline;
  - the key/pid mismatch.
- `database_pool_reserve_timeout` now means a semaphore wait.
- Session loss never surfaces a raw driver code, message or PID.

Constants exported from `dedicatedDatabaseSession.ts` and pinned by tests:

| Constant | Value | Note |
|---|---:|---|
| `DEDICATED_OPEN_DEADLINE_MS` | 4,000 | at least 2 × the worst cold connect seen (1,952 ms) |
| `DEDICATED_STATEMENT_GRACE_MS` | 2,000 | watchdog = effective statement bound + grace |
| `DEDICATED_DRAIN_DEADLINE_MS` | 4,500 | `= RETENTION_CANCEL_DRAIN_DEADLINE_MS` (`core/db/databaseLifecycle.ts:30`) |
| `DEDICATED_GRACEFUL_END_TIMEOUT_S` | 2 | race marker 1,900 ms |
| `DEDICATED_CONTROL_STATEMENT_DEADLINE_MS` | 2,000 | per control statement, cold connect included |
| `DEDICATED_TERMINATE_AFTER_MS` | 1,500 | measured from the local destroy |
| `DEDICATED_TERMINATION_POLL_INTERVAL_MS` | 100 | unchanged from R6 |
| `DEDICATED_CLIENT_CONNECTION_CHECK_INTERVAL_MS` | 1,000 | startup parameter; PostgreSQL ≥ 14 |

- Deleted: `DEDICATED_CANCEL_DEADLINE_MS` and `DEDICATED_EPOCH_VERIFY_DEADLINE_MS`.
- The R6 COMMIT deadline (the session statement bound) is subsumed by the watchdog.
- Deadlines are `Promise.race` timers cleared on every settlement.

### R7.7 — Connection budget

- A dedicated session is +1 direct connection outside the primary pool. There is no maintenance pool
  any more, and `lockOwners` and `workSessions` each count as one direct connection.
- The control client adds at most one transient direct connection per process.
- Per process that is `poolMax + dedicatedSessionMax + 1`.
- Open decision O3 is resolved minimally. `DB_MAINTENANCE_POOL_MAX` keeps its name and its L01
  bounds, default 2 and range `2..4` (`databaseConfig.ts:326`). It is reinterpreted as the
  per-process `dedicatedSessionMax`, enforced by the semaphore.

`assertDedicatedDatabaseSessionBudget({ lockOwners, workSessions, ordinaryHeadroom })`:

- any value not a non-negative integer → `database_dedicated_session_budget_invalid`;
- `transaction + primary` or `session` → `database_maintenance_session_unavailable`;
- `lockOwners + workSessions > config.maintenancePoolMax` → `…budget_invalid`;
- `ordinaryHeadroom > config.poolMax` → `…budget_invalid`.

Worked values:

- TASK-548 Guide ingest (1, 1, 1) needs `dedicatedSessionMax >= 2` (the default passes) and
  `DB_POOL_MAX >= 1`.
- Retention needs (1, 0, 0).
- This reverts R6.5 (`DB_POOL_MAX >= 4`, `DB_MAINTENANCE_POOL_MAX >= 3`) and the pre-R6 text
  (`DB_POOL_MAX >= 3`).

The 02-L01 2→3 mirror is no longer needed:

- 02-L01 C2-C4 ("maintenance pool bounds for the 02-L02 R6 guard") existed only for R6's in-pool
  control slot and probe owner/verifier.
- R7 has neither. The control slot is a separate client and the probe is gone, so the bound
  reverts to `2..4`, default 2.
- C2-C4 have NOT landed: `databaseConfig.ts:326` still reads `2, 2, 4`, and `:365` still reads
  `poolMax >= 2`. So nothing is reverted in source.
- 02-L01 receives a dated superseding note (R7.11) instead of its C4 pin changes.
- One budget change IS needed in 02-L01, and it is recorded as a handoff (R7.11):
  - the fleet formula must price dedicated sessions in every mode:
    `planned = N × (poolMax + dedicatedSessionMax + 1) + migrationReserve`;
  - L01 today prices `maintenancePoolMax` only in `direct|session` and nothing in `primary`
    (`databaseConfig.ts:334-338`);
  - defaults (N 1, pool 10, max 2, reserve 3): 16 < 82.

### R7.8 — Test matrix (binding)

The DB-free suite is `tests/integration/server/task551DedicatedSessionGuards.test.ts`. Its path is
unchanged, it stays in the Bun lane, and its hard cap is 800 lines.

- It uses a fake client factory, a fake control client and a fake clock, with no fixed sleeps.
- Fake results carry `state` and `command`, and the fake client has no `begin`.
- F21-F25 import `core/db/client.ts` under the airtight
  `DATABASE_URL=postgresql://127.0.0.1:1/none` convention. They inject factories through
  `setDatabaseClientRuntimeForTests`.

| Leg | Scenario | Required outcome |
|---|---|---|
| F1 | Open: key/pid mismatch; open error; open deadline | `database_maintenance_session_unavailable`. The client is ended with `timeout: 0`. |
| F2 | Transaction happy path | The sequence is identity, `begin`, statements, `commit`; the tx-local `set_config` appears only when `statementTimeoutMs` is lower than the session bound. |
| F3 | COMMIT tag `ROLLBACK` | `dedicated_database_transaction_aborted`. No `rollback` is sent. The session stays usable. |
| F4 | Callback throws | Exactly one `rollback`. The original error is rethrown. |
| F5 | Loss inside the callback | No `rollback`. `session_lost`. Later calls issue zero statements. |
| F6 | COMMIT rejects `23505` / `CONNECTION_CLOSED` | Rethrown with no rollback / `session_lost`. |
| F7 | Abort during a statement | Immediate `session_lost`; exactly one `end({ timeout: 0 })`. |
| F8 | Abort during COMMIT | Deferred until the COMMIT settles, then terminal. |
| F9 | Signal already aborted (`execute`, `transaction`) | Zero statements. `session_lost`. |
| F10 | `onclose` fires (no-reuse-after-loss) | Lost. The factory is called exactly once for the session, and no statement reaches the client again. |
| F11 | Foreign `state.pid` on a result | Lost. `session_lost`. The result is discarded. |
| F12 | Watchdog | Fires on an executed statement past bound + grace; never on an unexecuted fragment. |
| F13 | Nesting (the full list in R7.3) | `dedicated_database_transaction_nested` with zero statements. |
| F14 | Handle retained after its scope | `session_lost` with zero statements. |
| F15 | Graceful close | Idle: one `end({ timeout: 2 })` → `rolled_back`, no control client created. Open block: the same. |
| F16 | Forced drain | Cancel first; gone → `connection_terminated`; still alive at 1,500 ms → exactly one matched terminate; never gone → `drain_unconfirmed` at 4,500 ms. The control client is released on every path. |
| F17 | Control connect fails | `drain_unconfirmed`. |
| F18 | Concurrent drains | Single-flight; one shared control client; the session stays terminal. |
| F19 | Classifier table | Every G4 loss code is a loss; `57014`, `25P02`, `40P01` and `23505` are not. |
| F20 | Trigger tripwire | The Query proxy's trigger set equals the `this.handle()` call sites in `postgres/src/query.js` (R7.1). |
| F21 | Lease (via `client.ts`) | A drain failure is contained. The semaphore times out with `database_pool_reserve_timeout`. The slot is released on every path. `closeAllDatabaseClientsWithin` destroys live sessions. |
| F22 | Advisory lock (via `client.ts`) | `false` → the conflict code with `run` never invoked. Success and throw both close the client; no unlock statement is sent. |
| F23 | Startup check (via `client.ts`) | `transaction + primary`, `session` and a pooled/unverifiable URL make zero factory calls. A mismatch → unavailable. Success is cached per generation; failure is not. |
| F24 | Budget matrix | The R7.7 rules, including (1,1,1) with max 2 passing and (2,1,0) with max 2 failing. |
| F25 | drizzle seam | `drizzleForDedicatedTransaction(tx)` constructs. The tx `options` is the session client's own object. The primary `db` parsers are unchanged. |

Re-baselines in `tests/integration/server/task551DatabaseLifecycle.test.ts` (intended contract
changes, not weakenings; the file stays at or under 1,000 lines):

- Delete the reserve-based fakes: `makeFakeReserved` (`:364`), `makeFakeSql` (`:392`),
  `OWNER_PROOF` (`:420`), `VERIFIER_PROOF` (`:426`), `VERIFIER_REENTRANT` (`:431`) and
  `dedicatedFixtures` (`:599-644`).
- Rewrite the affinity describe (`:436-576`) onto the factory seam:
  - `:455` (transaction+primary, zero attempts) is kept as zero factory calls;
  - `:467` ("below two sessions") becomes a semaphore/budget case, because pool size no longer
    gates the check;
  - `:479` becomes "startup check once per generation";
  - `:506` (re-entrant lock) is deleted with the probe;
  - `:522-576` becomes the R7.7 budget matrix, with the `:551` direct fixture kept at
    `maintenancePoolMax: 2`.
- Rewrite the dedicated describe (`:578-818`) onto the factory seam:
  - `:646`/`:668` become open → run → graceful close with the slot released once;
  - `:679` becomes the forced drain via the control client;
  - `:695` means zero statements;
  - `:708` means `assertAlive` loss;
  - `:718` becomes the semaphore timeout;
  - `:732`, `:746`, `:775` and `:796` become the R7.5 advisory-lock rules (no unlock statement;
    close is the release).
- Retitle `:120` to "probes a declared direct maintenance channel exactly once at start". Its
  fake-module assertions are unchanged. `session` rejection is pinned in F23.
- `:65-118` and `:130-435` are unchanged.

Real-DB legs in `tests/integration/server/task551DatabaseLifecycleRealDb.test.ts` (path unchanged,
from B1):

- The gate is unchanged: the presence-only owner map; the fixture URL is the only URL dialed (the
  test's factory wrapper asserts `target.url === TASK551_FIXTURE_DATABASE_URL` before dialing); and
  each test has a `60_000` timeout.
- Injection: `setDatabaseClientRuntimeForTests({ config: { pgbouncerMode: "off", maintenanceMode: "primary", maintenancePoolMax: 2 }, dedicatedClientFactory: <real factory + onnotice recorder> })`,
  restored in `finally`.
- The R6.6 `client_min_messages` guard and the `25P01` canary stay in force for every zero-WARNING
  assertion.
- Advisory keys are test-only two-int keys in a namespace asserted to differ from every landed
  inventory namespace (`20260604`, `20260628`, `20260818`, `548`, `547`, `551063`).

| Leg | Scenario | Required outcome |
|---|---|---|
| RD1 | Startup check on the direct target (P0) | Succeeds. The open's `state.pid` equals `pg_backend_pid()`. |
| RD2 | Transaction via `drizzleForDedicatedTransaction(tx)` (L1) | Runs on the session PID. `set_config` is visible inside and reverted after `commit`. drizzle `.transaction` → `nested`. Zero WARNINGs. |
| RD3 | `select 1/0` swallowed, then COMMIT (L2, P1c) | `dedicated_database_transaction_aborted`. A following `execute` succeeds on the same PID. Zero WARNINGs. |
| RD4 | Callback throws while holding `pg_advisory_xact_lock` (L3) | Exactly one `rollback`. An independent client takes the xact lock at once. |
| RD5 | Advisory-lock lease, then close (P2) | After `withDedicatedDatabaseAdvisoryLock` returns, an independent client acquires the same key at once. The session emitted no unlock statement and zero WARNINGs. |
| RD6 | 2 s idle inside a lease (P4 reverse) | Same PID, and the lock is still held. |
| RD-cancel | `execute(select pg_sleep(30))` aborted after 1.5 s | Rejects `session_lost` before the drain starts. The drain returns `connection_terminated` within 4,500 ms of the abort. The backend (pid + `backend_start`) is gone. |
| RD7 | Same inside a transaction holding a transaction lock (L4) | Same outcome, and the lock is free. |
| RD8 | External `pg_terminate_backend` on an idle lease (L5) | The next call rejects `session_lost` without hanging. The factory was called once. No reconnect: after the drain settles, an independent client sees no backend with the test's maintenance `application_name`. |
| RD9 | External kill during a transaction statement (L6, P2g) — the kill-mid-transaction exit-0 proof | `session_lost`. A recorder on `uncaughtException`/`unhandledRejection`, installed for the leg, is empty after the drain settles: the P2g exit 1 was exactly such an uncaught `TypeError`. |
| RD10 | Two parallel leases (L9) | Distinct PIDs. A third concurrent lease with max 2 rejects `database_pool_reserve_timeout`. |
| RD11 | Residue | After the file: zero backends with the test `application_name` and zero advisory locks in the test namespace. |

- The legs touch no application table.
- Superseded real legs: R4.1, R4.2 and R4.4 (probe), R4.5 (`withPoolOptions`), R6-a, R6-f, R6-g and
  R6-h are deleted. R4.3 → RD2, R4.6 → RD5 plus RD2 (zero WARNINGs by construction), R6-b → RD3,
  R6-c → RD-cancel, R6-d → RD7, R6-e → RD8.
- The R6.3 fake-only restriction for forced termination with an active statement is lifted.
  RD-cancel and RD7 exercise it on the real driver, because the client is never reused.

### R7.9 — Deleted (from R6 and from the current `client.ts`)

- From `core/db/client.ts`:
  - the `maintenanceSqlClient` pool (`:93-113`) and `requireMaintenanceDatabaseUrlRedacted` at
    import;
  - the second `listDatabaseClients` entry (`:116-118`);
  - `AFFINITY_PROBE_LOCK_KEY` (`:205`) and `runAffinityProbe` (`:216-275`);
  - `CancellableQuery` (`:345-347`), `terminateReservedBackend` (`:350-364`) and
    `createTrackedDedicatedSession` (`:364-448`);
  - the `reserve()`/`release()` lease bodies (`:498-579`);
  - the `maintenanceSqlClient` override field (`:692-693`, `:721`, `:735`).
- `reserveWithValidatedDeadline` (`:455-490`) is kept for `probeDatabasePoolHealth` only.
- From the R6 contract:
  - `guardSession`, the G1 epoch verify, `maintenanceCloseEpoch`,
    `maintenanceConnectionCloseObserver` and the pool `onclose`;
  - the in-pool control slot and its +1 budget;
  - the per-lease identity snapshot on a reserved handle;
  - the idle `select 1` confirmation and the idle `rollback`;
  - the G5 same-continuation release rule;
  - the explicit advisory unlock;
  - `MAINTENANCE_AFFINITY_PROBE_LOCK_NAMESPACE` `551022`, the random probe keys and the
    `affinityProbeKey` override;
  - `withPoolOptions` and its by-reference serializer side effect on a shared pool;
  - `DEDICATED_CANCEL_DEADLINE_MS` and `DEDICATED_EPOCH_VERIFY_DEADLINE_MS`.
- From the 02-L01 contract: the C2 raise to 3 (R7.7).

### R7.10 — Module split, envelope and gates

- `core/db/dedicatedDatabaseSession.ts` (≤ 600 lines) owns:
  - the session primitive (R7.3-R7.4);
  - the error codes, the constants and the classifier;
  - the `DedicatedDatabaseTransaction`, `StaticDedicatedStatement`, `DedicatedDatabaseSession` and
    `DedicatedCancelReason` types.
- `core/db/client.ts` owns:
  - the target resolution and the real factories (with the eager drizzle construction);
  - the semaphore, the registry and the shared control-client refcount;
  - `withDedicatedDatabaseSession`, `withDedicatedDatabaseAdvisoryLock`,
    `assertMaintenanceSessionAffinity(IfDeclared)` and `assertDedicatedDatabaseSessionBudget`;
  - `drizzleForDedicatedTransaction` and the test seams.
- `client.ts` re-exports the four types, so consumer import paths do not change. It must stay at
  or under 1,000 lines; it is expected to shrink below 736.
- Envelope: no fence edit. Every R7 path is already in the closed `allowlist`: `core/db/client.ts`,
  `core/db/dedicatedDatabaseSession.ts` and the three lifecycle/RealDb/Guards test files. The
  `database-lifecycle-test` argv and `positiveDiscovery.paths` (`minimum` 3) already name the three
  test files.
- The family preflight (`preflightTask551DispatchSnapshot`, `sourceHead` `ee4c7f93`,
  repo-relative paths) passed on 2026-09-25 after this section was appended.
- Implementer FAST gates (restating R6.4):
  - `./node_modules/.bin/eslint --max-warnings=0` over the five files;
  - the airtight
    `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/server/task551DatabaseLifecycle.test.ts tests/integration/server/task551DatabaseLifecycleRealDb.test.ts tests/integration/server/task551DedicatedSessionGuards.test.ts tests/integration/server/task551RuntimeEntrypoints.test.ts tests/perf/database-pg-stat-interval.test.ts`
    (the real legs skip by name);
  - `wc -l` on the five files, and `git diff --check`.
- Orchestrator gates:
  - the closed owner-map run on `DATABASE_URL3` (`coderso02`) with the same env as R5, appending
    the RealDb and Guards files, with RD1-RD11 EXECUTED;
  - `bun --cwd core lint:types` and `bun --cwd core lint`;
  - then the 06-L03 owner-map gate, where `task551RetentionJobService.test.ts` executes its DB
    legs.
- Receipt: the orchestrator appends one dated top-level key `"reopenR7Addendum20260925"` to
  `_docs/_workflows/_smoke/task-551/impl-02-l02.json`, leaving every existing key byte-identical.
  It records line counts and sha256 for the five files and every gate result, including RD
  executed/skipped counts.
- The generated `tests/bun-lane-manifest.json` is still not hand-edited (B1 precedent; owner
  01-L01).

### R7.11 — Cross-leaf handoffs (this leaf edits none of these files)

- **TASK-551-06-L03** (`retentionJobService.ts`, `retentionScheduler.test.ts`,
  `task551RetentionJobService.test.ts`):
  - The R1-c "<02-L02 helper>" is re-pointed from `withPoolOptions` to
    `drizzleForDedicatedTransaction`. `drizzleOverTransaction` (`retentionJobService.ts:282-283`,
    used at `:771`, `:826`) becomes `drizzleForDedicatedTransaction(tx)`. The R1-c3 source guard
    (no `.options`, `maintenanceSqlClient` or `reserve(`) stands.
  - The statement builders at `:190`, `:201` and `:214` retype their parameter from `ReservedSql` to
    `DedicatedDatabaseTransaction` (`StaticDedicatedStatement`'s new parameter type).
  - The collision comment at `:170-179` (`:178`, "the dedicated-session affinity probe's single key
    551551551 (which lives in classid 0)") must say that no probe key exists. R6.7's `551022`
    instruction is withdrawn.
  - `setTransactionStatementTimeout` (`:304-306`) stays; it is harmless and R7 also binds the bound.
  - `cancelActiveAndRollback("retention_lock_lost")` (`:259`) is terminal and may reject
    `drain_unconfirmed`. The later `releaseRetentionLockQuietly` (`:246`) then rejects `session_lost`
    and is swallowed, which is correct because the lock died with the backend.
  - The 06-L03 boundary maps `transaction_aborted`, `transaction_nested` and `drain_unconfirmed`.
  - `retentionScheduler.test.ts` (HEAD anchors; the 06-L03 A1 split may move them):
    - the `maintenanceSqlClient` overrides and pool fakes (`:218-249`, `:265`, `:399`, `:596`,
      `:601`, `:657`, `:683`, `:907`, `:919`) move to `dedicatedClientFactory`;
    - `CHANNEL.direct` `:251` stays `maintenancePoolMax: 2` (the 02-L01 C4 "→ 3" is withdrawn);
    - the `session` leg (`:675-690`, "the guard accepts") now expects
      `database_maintenance_session_unavailable` with zero factory calls;
    - the inventory row `[0, 551551551]` (`:456`) and `:459` are removed, and R6.7's replacement
      namespace assertion is withdrawn.
  - `task551RetentionJobService.test.ts` keeps its `assertMaintenanceSessionAffinity` gate
    (`:97-108`).
  - `core/server/jobs/retentionScheduler.ts` needs no API change.
- **TASK-551-02-L01** (`databaseConfig.ts`, forbidden here) needs a dated note that:
  - supersedes C2-C4 (bound stays `2..4`, default 2; `:365` stays; the C4 test pins are not
    applied);
  - reinterprets `DB_MAINTENANCE_POOL_MAX` as the per-process dedicated-session cap;
  - prices `N × (poolMax + dedicatedSessionMax + 1)` in every mode (R7.7);
  - marks `session` mode as unavailable for dedicated sessions (compatibility matrix `:128-145`);
  - records O1 (`DATABASE_DIRECT_URL` under `transaction + primary`) as an open owner decision.
  - Until that lands, R7's fail-closed seams are the guard. The primary-mode fleet undercount (at
    most N × 3 connections at the defaults) is the open budget gap, and it must close before the
    combined gates.
- **TASK-548-01-L03** (`:1064-1069`, `:2039-2043`):
  - The budget helper call is unchanged. The requirement becomes `dedicatedSessionMax >= 2` and
    `DB_POOL_MAX >= 1`, replacing "`DB_POOL_MAX >= 3` under `off + primary`" and R6.5's `>= 4`.
  - Connection churn note: each dedicated session costs one cold direct connect (380-670 ms
    measured; up to about 1.9 s). Short read-only helper sessions that do not need the lock should
    run on `db`.
- **Land order** (extends 06-L03 A3):
  1. 02-L02 R7 code;
  2. the 02-L01 R7 note (and its budget source change if the owner approves);
  3. 06-L02 R8/R9;
  4. 06-L03 R1 (with this re-point);
  5. the combined gates;
  6. at least two post-auditors per scope.

### R7.12 — Superseded sentences (quoted; line = current anchor)

Base contract:

- `:17-18` Overview: "create the optional direct/session-pooled maintenance channel, verify
  physical-session affinity". Now: dedicated own-client sessions on a verified direct target, with a
  key/pid startup check (R7.2, R7.5).
- `:71`: "`max: config.maintenancePoolMax, // >= 2: lock owner + independent verifier`". The pool is
  deleted (R7.9).
- `:86-90`: "Reserve an owner and independent verifier from maintenanceSqlClient. …" (R2 and R6 had
  already amended it). The probe is replaced (R7.5).
- `:395-398`: "The dedicated-session wrapper reserves only from `maintenanceSqlClient`, which is the
  primary pool solely for `off + primary`; … `direct|session` use the separate URL and pool budget
  from L01." Now: R7.2 target matrix, one own client per session.
- `:398-401`: "Before any lease is exposed, the live affinity probe must have proved that an owner
  survives two transaction boundaries on one backend PID while an independent backend cannot
  acquire its session lock." Now: the startup check (R7.5).
- `:405-406`: "fails before work when the primary pool has fewer than two sessions." Removed (R7.5).
- `:410-412`: "… advisory-lock ownership, cancellation, rollback, and final release use the same
  reserved physical PostgreSQL session." Now: the same own `max: 1` client.
- `:428-429`: "In `finally`, it cancels/rolls back active work and executes one static
  `pg_advisory_unlock(key)` on the same backend. Exact true permits normal release;". Now: close is
  the unlock (R7.5).
- `:435-438`: "`off + primary` requires `DB_POOL_MAX >= 2` and the live affinity proof; … A
  `direct|session` maintenance mode uses its separately budgeted URL/pool." Now: R7.2 and R7.7.
- `:444-446`: "(for example the TASK-548 Guide ingest budget … requires `DB_POOL_MAX >= 3` under
  `off + primary`)". Now: `dedicatedSessionMax >= 2`, `DB_POOL_MAX >= 1`.
- `:618-623`: "Invoking `assertMaintenanceSessionAffinity` in that same fixture fails
  deterministically as `database_maintenance_session_unavailable` …; raising capacity to 2 permits
  the probe." Now: pool size does not gate the check. The fixture's zero-attempt ordinary start
  stands (zero factory calls).
- `:689-692`: "`off + primary`, `direct`, and session-pooled maintenance pass the
  two-transaction/two-backend lock probe;". Now: `off + primary` and `direct` pass the startup
  check. Session-pooled maintenance is unavailable.
- `:765-767`: "it either uses a live-proven direct/session-pooled maintenance pool or fails fast".
  Now: a live-proven direct dedicated client, or fail fast.

R2-R5 and B1-B3:

- R2 in full (`:1071-1090`, starting "Each of the two owner transactions is explicit SQL on the
  reserved handle", `:1078`). The probe is deleted.
- R3 `:1117-1120`: "New export from `core/db/client.ts`: `withPoolOptions`, a drizzle-compatible view
  of a dedicated-session handle. … It returns the same handle with the live
  `maintenanceSqlClient.options` object … attached **by reference**." Withdrawn. Now
  `drizzleForDedicatedTransaction` (R7.5).
- R3 `:1136`: "Cross-leaf seam: TASK-551-06-L03's drizzle-over-transaction adapter (its R1) consumes
  `withPoolOptions`". Re-pointed (R7.11).
- R4 `:1158-1160`: "It builds its own `postgres(<fixture URL>, { max: 2, onnotice: <recorder> })`
  pool and injects it through `setDatabaseClientRuntimeForTests({ … maintenanceSqlClient })`".
  Now: the factory injection (R7.8).
- R4 items 1, 2, 4 and 5 (`:1162`, `:1164`, `:1168`, `:1170`). Deleted or mapped per R7.8.
- B1 `:1244`: "its own `max: 2` pool with the `onnotice` recorder". Now: the factory wrapper with
  the recorder.
- B2 `:1284`: "The binding guard is LOCAL state tracking …". Withdrawn: no idle statement exists.
- B3 `:1307`: "`core/db/client.ts` exports exactly `withPoolOptions(handle)`." Withdrawn.
- B3 `:1313`: "Land order is 02-L02 (this re-open) → TASK-551-06-L02 R8/R9 → TASK-551-06-L03 R1."
  Extended by R7.11.

R6:

- R6.2 `:1374`: "The module is dependency-injected. Its inputs are the reserved handle, a control
  executor (below), a getter for the live pool `options`, the COMMIT deadline and a clock." Now:
  R7.3 deps.
- R6.2 `:1378-1383`: "`core/db/client.ts` keeps: pools, config, lifecycle close, the affinity
  probe, … `withPoolOptions` …" and "plus `maintenanceConnectionCloseObserver`". Now: R7.10.
- R6.2 `:1404-1405`: `DEDICATED_CANCEL_DEADLINE_MS = 1_500` and
  `DEDICATED_EPOCH_VERIFY_DEADLINE_MS = 3_000`. Deleted.
- R6.2 `:1410`: "The COMMIT deadline is the injected session statement bound". Now: the watchdog.
- R6.2 `:1422-1423`: "Those statements run as ordinary, unreserved statements on the live
  `maintenanceSqlClient` pool. This is the budgeted control slot in R6.5. No extra client is
  created." Now: a separate short-lived control client (R7.4).
- R6.2 `:1434`: "`guardSession(reserved, control, options)` is a closure over the following state:".
  Now: R7.3.
- R6.2 `:1449`: "A module counter `maintenanceCloseEpoch` is bumped by
  `maintenanceConnectionCloseObserver`." Deleted.
- R6.2 `:1542-1543`: "Concurrent `execute` calls outside a transaction pipeline on the one session
  and stay allowed." Now: one operation at a time (R7.3).
- R6.2 `:1586-1588`: "Every path that marks a session lost ends in `terminateAndWait` before the
  lease is discarded." Now: local destroy plus the R7.4 control path.
- R6.2 `:1589-1590`: "Budget: cancel ≤ 1,500 ms, then confirmation or rollback ≤ min(2,000,
  remaining), then terminate plus poll for the rest". Now: R7.4.
- R6.2 `:1594`: "A handle is released only when all three hold:". Deleted (no pool).
- R6.2 `:1615`: "when not lost, exactly one `pg_advisory_unlock(key)` through the guarded session;".
  Deleted.
- R6.2 `:1626`, `:1642`, `:1645`: the random probe key, the `affinityProbeKey` field, and
  "Capacity: the probe holds the owner and the verifier and needs the control slot." Deleted.
- R6.3 `:1661-1673`: the driver residual and "Forced termination with an active statement is
  therefore tested only with fakes (R6.6)." Now: the R7.4 57P01 residual and the RD-cancel/RD7 real
  legs.
- R6.4 `:1703`: "Only F16/F17 import `core/db/client.ts`". Now: F21-F25.
- R6.5 `:1722-1735` in full, including "`DB_POOL_MAX >= 4` under `off + primary` (was 3)" and
  "`DB_MAINTENANCE_POOL_MAX >= 3` under `direct|session` (was 2)". Now: R7.7.
- R6.6 `:1746`, `:1748`, `:1779`, `:1801`, `:1809`: the fake control executor, the epoch-driven
  fakes, the `makeFakeReserved` shape, the recorder pool `max: 3` with `onclose`, and the pre-holder.
  Now: R7.8.
- R6.7 `:1835`: "replace the row with an assertion that `RETENTION_JOB_LOCK_NAMESPACE !==
  MAINTENANCE_AFFINITY_PROBE_LOCK_NAMESPACE`". R6.7 `:1840`: "must name the two-int namespace
  `551022`". R6.7 `:1841`: "Its drizzle-over-transaction adapter … consumes `withPoolOptions`". R6.7
  `:1849`: "the Guide budget becomes `DB_POOL_MAX >= 4`". R6.7 `:1858`: "02-L01 must raise the
  default and minimum to 3 and the primary candidate bound to 3". All are superseded by R7.11.
- R6.8 replacement values `:1875` ("Now `DB_POOL_MAX >= 3`."), `:1879` ("Now `>= 4` (R6.5)."),
  `:1883` and `:1886` ("Now fewer than three."), `:1888` ("Now 3."), `:1915` ("Probe p1 confirmed
  the warning, so the guard is unconditional."). Superseded by R7.5, R7.7 and R7.4 (no idle
  statement exists).

## Dated Contract Corrections — 2026-09-26 (re-open R8: R7 audit closure; append-only)

Append-only. R8 closes the two fresh read-only R7 audits (audit A: 0 HIGH, 6 MEDIUM, 5 LOW;
audit B: 0 HIGH, 5 MEDIUM, 4 LOW) and records the orchestrator decisions of 2026-09-26. R8 amends
R7 (R7.1-R7.12). Where R8 and R7 disagree, R8 wins; R7 otherwise stands. No earlier byte is edited.

- Precedence of older supersessions: base-contract sentences that R6.8 superseded stay superseded
  under R7 and R8. R7's "supersedes R6 in full" withdraws R6's replacement text, not R6.8's
  supersession of the base text. Where an R6.8 replacement no longer applies, the R7/R8
  replacement quoted in R8.11 is binding (for example base `:413-414` native `cancel()` and
  `:429-432` reserved-handle termination).
- The Workflow Dispatch Envelope `json` fence is NOT edited. Every new export lives in
  `core/db/client.ts` or `core/db/dedicatedDatabaseSession.ts`, every new leg lives in the three
  test files the fence already lists, and the R8.6 replica-ID variable is part of the
  orchestrator's closed gate command, not an envelope path.

Anchors were grounded on 2026-09-26 against `/home/coder/project/Coderso-551` at HEAD `ee4c7f93`.
The worktree was dirty in 06-L02, 06-L03, 01-L01 and 11 files, the `_docs/_workflows/lib/`
modules, and this file; none of the source anchors below is in a dirty file. Counts:
`core/db/client.ts` 736 (unchanged since `9c5b6666`), `core/db/connectionTargets.ts` 404,
`core/db/databaseConfig.ts` 368, `tests/integration/server/task551DatabaseLifecycle.test.ts` 818,
`tests/integration/runtime/retentionScheduler.test.ts` 998, postgres.js 3.4.9. The RealDb and
Guards test files do not exist yet. Line numbers are anchors, not contract.

### R8.1 — Real factory and option builder (orchestrator decision 1; closes B-M1, A-M5)

R7.3 gave the session `createClient(target)`, but postgres.js reads `onclose`/`onnotice` only at
construction (`node_modules/postgres/src/connection.js:52-63`, `src/index.js:491-493`). The
session-owned `onclose` closure and the test recorder therefore need a hook parameter, and the RD
legs need the production options, not a copy.

Types, owned by `core/db/dedicatedDatabaseSession.ts` and re-exported by `client.ts`:

```ts
export type DedicatedSessionTarget = Readonly<{ url: string }>;
export type DedicatedClientHooks = Readonly<{
  onclose: () => void;
  onnotice?: (notice: postgres.Notice) => void;
}>;
```

Exports from `core/db/client.ts`:

```ts
export function createDedicatedClientOptions(
  target: DedicatedSessionTarget,
  hooks: DedicatedClientHooks
): postgres.Options<Record<string, postgres.PostgresType>> {
  if (typeof target.url !== "string" || target.url.length === 0)
    throw new Error(DATABASE_CLIENT_ERROR_CODES.maintenanceSessionUnavailable); // zero clients
  return {
    max: 1,
    idle_timeout: 0,                 // R7.3: explicit, otherwise PGIDLE_TIMEOUT applies
    max_lifetime: null,              // R7.3: explicit, otherwise 30-60 min recycling
    connect_timeout: Math.ceil(DEDICATED_OPEN_DEADLINE_MS / 1000),
    prepare: true,
    onclose: hooks.onclose,
    ...(hooks.onnotice ? { onnotice: hooks.onnotice } : {}), // present-only; the primary pool sets none
    connection: {
      ...boundedStartupConnectionParams(buildDatabaseApplicationName("maintenance", identity.replicaId)),
      client_connection_check_interval: DEDICATED_CLIENT_CONNECTION_CHECK_INTERVAL_MS,
    },
  };
}

export function openDedicatedClient(target: DedicatedSessionTarget, hooks: DedicatedClientHooks): Sql {
  const client = postgres(target.url, createDedicatedClientOptions(target, hooks));
  drizzle(client, { schema });       // R7.3 eager parser application on THIS client only
  return client;
}

export function createControlClientOptions(target: DedicatedSessionTarget): postgres.Options<…>;
// same target check; returns exactly the R7.4 control options (max 1, idle_timeout 0,
// max_lifetime null, connect_timeout 2, application_name <maintenance>, statement_timeout 2000)
```

- `target` is used only for the fail-closed shape check and as the URL that is dialed. No
  `host`, `port`, `path` or `socket` key is ever derived from it (R7.2, `sessionClient.ts:50-62`).
- The internal default control factory is
  `openControlClient(target) = postgres(target.url, createControlClientOptions(target))`.
- R7.3 `deps` becomes `{ createClient(target, hooks), createControlClient(target), clock, bounds }`.
  The session module builds the hooks itself: `{ onclose: () => { if (!closing) markLost(); } }`.
  It never passes `onnotice`.
- R7.5 test override becomes
  `dedicatedClientFactory?: (target: DedicatedSessionTarget, hooks: DedicatedClientHooks) => Sql`
  and `controlClientFactory?: (target: DedicatedSessionTarget) => Sql`. Clearing the override
  restores `openDedicatedClient` and `openControlClient`.
- RD injection (replaces R7.8 `:2468`):

  ```ts
  dedicatedClientFactory: (target, hooks) => {
    if (target.url !== TASK551_FIXTURE_DATABASE_URL) throw new Error("t551rd_foreign_target");
    factoryCalls += 1;
    return openDedicatedClient(target, { ...hooks, onnotice: recorder.record });
  },
  ```

  The session's own `onclose` hook is passed through unchanged. `controlClientFactory` is not
  overridden in the RD file, so the real control options are exercised.
- F25 additionally pins both builders: `createDedicatedClientOptions(t, hooks)` has `max 1`,
  `idle_timeout 0`, `max_lifetime null`, `connect_timeout 4`, `prepare true`,
  `onclose === hooks.onclose`, no `onnotice` key unless one is given,
  `connection.client_connection_check_interval === 1000`,
  `connection.application_name === "coderso:maintenance:<replicaId>"`, and no
  `host`/`port`/`path`/`socket` key. `createControlClientOptions(t)` matches R7.4. An empty
  `target.url` throws the unavailable code with zero clients.
- F10 additionally pins the hook plumbing: the fake factory receives the hooks; invoking
  `hooks.onclose()` marks the session lost and calls `end({ timeout: 0 })` exactly once, and the
  factory is called exactly once.

### R8.2 — Scoped-handle allowlist and one statement in flight (closes A-M1, A-M2)

Reconnect hazard, grounded in postgres.js 3.4.9:

- The pool `onclose` calls the user hook and then reconnects synchronously when the pool queue is
  not empty (`src/index.js:421-426`). `end()` sets `ending` only after `await 1`
  (`src/index.js:365-371`).
- `connect()` resets `terminated` (`src/connection.js:335-336`).
- A first-time parameterized statement sets `describeFirst` (`src/connection.js:238`), which leaves
  the connection `full` (`:173-177`), so a second concurrently triggered statement waits in the
  pool queue.
- Result: a kill while two statements are in flight can leave an idle ghost backend that nothing
  closes (`idle_timeout: 0`, `max_lifetime: null`).

Binding rule (added to R7.3): at most ONE executed statement is in flight per session.

- The first execution trigger (R7.1 list) registers the query in `inFlight` and executes it.
- A second execution trigger on any Query proxy of the same session, while `inFlight` is not
  empty, issues nothing: the underlying Query is never handled, and that proxy's settlement
  rejects `dedicated_database_transaction_nested`. It is not a loss; the first statement and the
  session are unaffected.
- The module's own `begin`, `set_config`, `rollback` and `commit` are issued only when `inFlight`
  is empty (already true by the R7.3 sequencing).
- With one statement in flight, the pool queue is empty at `onclose`, so `src/index.js:426` never
  reconnects. R7.4's "removes every reconnect path" holds only together with this rule.
- The one landed consumer (06-L03) is strictly sequential on its session
  (`retentionJobService.ts:755-829`, `:859-946`, no `Promise.all`). TASK-548 must stay sequential
  per session (R8.9).

The scoped handle becomes an ALLOWLIST, replacing the R7.3 denylist (`:2128-2129`):

- Present on the handle: the `apply` trap (a tagged template returns a Query proxy; a non-template
  call returns the driver's Identifier/Builder fragment unchanged, because fragments do not
  execute), `unsafe`, `options`, `parameters`, `typed`, `types`, `array` and `json`.
- `begin` and `savepoint` stay present and throw `dedicated_database_transaction_nested`, so
  drizzle `.transaction` gets `nested` and not a `TypeError`.
- Every other string key is `undefined` at runtime and absent from the type. This includes
  `file` (it builds a Query outside the `apply`/`unsafe` traps, `src/index.js:129-144`),
  `largeObject` (bound to the raw client and calling native `begin`, `src/index.js:71`,
  `src/large.js:5`), `notify`, `end`, `close`, `reserve`, `release`, `listen` and `subscribe`.
- The Query proxy is also an allowlist: `then`, `catch`, `finally`, `execute`, `forEach`,
  `values`, `raw` and `simple`. `cursor` (it overwrites `resolve`/`reject`, `src/query.js:74-111`,
  so the watchdog would see a false hang), `readable`, `writable`, `cancel` (a native cancel dials
  a new connection), `describe` and `stream` are `undefined`. Well-known symbols pass through for
  Promise interop.
- Methods that return the Query (`values`, `raw`, `simple`) return the proxy (R7.3).

Test legs:

- F13 is extended: two tagged-template statements with one bound parameter each, awaited through
  one `Promise.all` inside `execute` and inside `transaction` → the second rejects `nested` with zero statements issued
  for it, the first resolves, and the session stays usable.
- F26 (new): allowlist tripwire. Every non-allowlisted handle key listed above and every
  non-allowlisted Query key is `undefined`, and the handle's own-key set equals the allowlist.
- RD12 (new): inside one `execute`, trigger two first-time parameterized statements concurrently
  (the second rejects `nested`); while the first (`select pg_sleep(30)` with a bound parameter)
  runs, kill the leg's own backend (R8.6 pinned kill). After the drain settles, polling for up to
  3,000 ms at 100 ms finds zero backends with the run's maintenance `application_name`.

### R8.3 — Transaction pseudocode correction (closes A-L3)

The tx-local `set_config` moves inside the `try` whose `catch` issues the single rollback. This
replaces R7.3 `:2147-2151`:

```text
transaction({ signal, statementTimeoutMs, run }):
  preconditions as execute; busy = true; open scope; on abort -> poison()
  b = await client`begin`;  if b.command !== "BEGIN": markLost; throw session_lost
  try:
    if statementTimeoutMs < deps.bounds.statementTimeoutMs:
      await client`select set_config('statement_timeout', ${String(statementTimeoutMs)}, true)`
    result = await run(scoped(scope))
  catch e:
    if !lost && !signal.aborted: await client`rollback`           // exactly one; its failure is a loss
    throw lost || signal.aborted ? session_lost : e
  … (COMMIT handling unchanged from R7.3)
```

- R7.3's `config.statementTimeoutMs` means `deps.bounds.statementTimeoutMs`. The module imports no
  config; `client.ts` supplies the L01 session bound through `bounds`.
- F2/F4 variant (new): `set_config` rejects `57014` → exactly one `rollback`, the `57014` error is
  rethrown, and a following `execute` succeeds on the same client.

### R8.4 — Shutdown semantics (orchestrator decision 3; closes A-M3, B-M4, A-L4)

R7.5 steps 1-4 (`:2310-2316`) are replaced. State in `client.ts`:
`closeState: "open" | "closing" | "closed"`, the registry, the semaphore waiters, and the control
holder `{ client, refcount, closed }`.

```text
fence(): if closeState !== "open": throw dedicated_database_session_lost   // zero factory calls, zero slots
  // checked first in withDedicatedDatabaseSession, withDedicatedDatabaseAdvisoryLock,
  // assertMaintenanceSessionAffinity(IfDeclared) and before every semaphore grant

closeAllDatabaseClientsWithin(budgetMs):
  closeDeadlineAt = now + min(budgetMs, 10_000)
  1. closeState = "closing"; lifecycleGeneration += 1; affinityProofPromise = null
     reject every semaphore waiter dedicated_database_session_lost
  2. primary = sqlClient.end({ timeout: max(0, closeDeadlineAt - now) / 1000 })   // started now, as today
     drains = registry.map(s =>
       s.drainWithin("shutdown", min(now + DEDICATED_DRAIN_DEADLINE_MS, closeDeadlineAt)))
     await Promise.allSettled(drains)       // every drain bounded by its deadlineAt; outcomes never thrown
  3. await endControlClient()               // control.closed = true; end({ timeout: 0 }) if open — LAST dedicated step
  4. await primary
  closeState = "closed"
```

- Registry membership starts when the client is constructed, before the identity statement. A
  session whose open is still pending is destroyed locally (`end({ timeout: 0 })`); with no
  pid/`backend_start` it cannot be confirmed, so its drain settles `drain_unconfirmed` and its open
  rejects `database_maintenance_session_unavailable`. No caller SQL ran on it.
- `drainWithin(reason, deadlineAt)` is internal to `client.ts` and the session module, and absent
  from the consumer-facing `DedicatedDatabaseSession` type. It starts the single-flight R7.4 drain
  with that deadline, or lowers a running drain's `deadlineAt` to `min(current, deadlineAt)`. The
  loop and every control-statement bound read the current value. A lease `finally` that calls
  `cancelActiveAndRollback("lease_release")` joins the same promise.
- `DedicatedCancelReason` gains `"shutdown"` (today `client.ts:315-316`). It is informational
  only.
- Idle sessions take the graceful path (≤ 1,900 ms); busy sessions take the forced path, and their
  in-flight operations reject `session_lost` at once.
- Control path during a close: drains the close awaits may acquire, or dial, the still-open control
  client. Once `control.closed` is set, `acquireControlClient` dials nothing and throws internally.
  The drain treats that like F17 and settles `drain_unconfirmed` with zero control factory calls.
- Last resort after the control client is closed: the session was already destroyed locally, and
  the server's `client_connection_check_interval` (1,000 ms, R7.3) ends the backend even during a
  running statement (P3: gone in 282 ms). No control connection is ever dialed after the database
  participant closed.
- `releaseControlClient()` in the drain `finally` (`:2204`) is AWAITED. When the refcount reaches
  0 it awaits `end({ timeout: 0 })`. A drain settles only after its control client (if it was the
  last holder) has ended. This closes A-L4 (RD8/RD11 cannot see a closing control backend from a
  settled drain).
- Bound: `closeAll` resolves no later than `closeDeadlineAt` plus the local `end({ timeout: 0 })`
  settlements. Nothing runs detached (base `:218-219`, `:744`).
- Re-arm: production never re-opens. `closeState` stays `"closed"` for the process, so the base
  rule "shutdown prevents new attempts" (`:393`) holds. The ONLY re-arm is the test seam: every
  `setDatabaseClientRuntimeForTests(...)` call (install or clear) sets `closeState = "open"` and
  `control.closed = false`. It first asserts that the registry is empty (else it throws
  `dedicated_database_session_lost`). It bumps no generation and clears no cached proof, so the
  06-L03 "Ordering law" (`retentionScheduler.test.ts:19-21`) is unchanged. The landed idioms
  already call it after `closeAll`: `retentionScheduler.test.ts:585-587` then `withFakeClient`
  `:254-261`, and `task551DatabaseLifecycle.test.ts:452`/`:591` then each test's override.
- The `:479` leg rewrite (R7.8 "startup check once per generation") re-installs its override after
  its mid-leg `closeAll` (today `:499-501`), then asserts two factory calls in total.

F21 sub-legs (fake clock, Guards file):

- F21a: during `closeAll`, a new `withDedicatedDatabaseSession` rejects `session_lost` with zero
  factory calls; a pending semaphore waiter rejects `session_lost`; a busy lease's operation
  rejects `session_lost`; `closeAll` resolves only after both drains settle; the control client is
  ended after the last drain settles and before `closeAll` resolves.
- F21b: a drain started after `control.closed` → `drain_unconfirmed` with zero control factory
  calls.
- F21c: `closeAll(1_000)` lowers a running forced drain's deadline; the drain settles by the close
  deadline and `closeAll` resolves by `closeDeadlineAt`.
- F21d: after `closeAll`, an open without re-arm → `session_lost`; after
  `setDatabaseClientRuntimeForTests(override)`, exactly one factory call.
- F21e: see R8.5.
- If these legs would push the Guards file past its 800-line cap, the implementer STOPS and
  reports: a new test path needs a fence edit plus the family preflight.

### R8.5 — Connection budget, per process (orchestrator decision 2; closes B-M3)

The semaphore is one per process, shared by every consumer. Concurrent consumer shapes in one
process add up:

- retention: 1 session, held for up to its run bound;
- TASK-548 Guide ingest: 2 sessions (lock owner + one work/reconcile session, 548-01-L03
  `:1051-1055`);
- one runtime process with both enabled: 3 sessions.

Decision:

- `dedicatedSessionMax = config.maintenancePoolMax` (R7.5 `:2252`, unchanged).
- Its 02-L01 default becomes 3 and its accepted bound becomes `2..6`
  (`databaseConfig.ts:326` `2, 2, 4` → `3, 2, 6`; 02-L01 owns the change, R8.9).
- 02-L02 code never reads or pins the default. Every 02-L02 test injects `maintenancePoolMax`
  explicitly; RD10 keeps `2`.
- `assertDedicatedDatabaseSessionBudget` stays per consumer, with the same four rules and the same
  signature (548 calls it exactly).
- Process rule, documented, and pinned by F21e and the handoffs: when retention scheduling and
  Guide ingest can run in one process, `DB_MAINTENANCE_POOL_MAX >= 3`. The default satisfies it.
- Contention outcome under an operator-lowered `2`: Guide's second acquisition waits at most
  `POOL_ACQUISITION_DEADLINE_MS` (2,000 ms, `queryTelemetry.ts:347`) and rejects
  `database_pool_reserve_timeout`. Its lease `finally` then closes the lock owner, which releases
  the lock. The wait is bounded and cannot deadlock. The 548 boundary maps the code (R8.9).
- The `drain_unconfirmed` transient (a slot freed while the old backend may linger up to the
  1,000 ms check interval) is an accepted, bounded over-budget.

Worked values, per process (`N × (poolMax + dedicatedSessionMax + 1) + migrationReserve`):

- defaults `N = 1`, pool 10, `dedicatedSessionMax` 3, control 1, reserve 3:
  `1 × (10 + 3 + 1) + 3 = 17 < 82` (`103 − 21`, `databaseConfig.ts:274-282`);
- upper bounds of one process, pool 50 and max 6: `1 × (50 + 6 + 1) + 3 = 60 < 82`;
- per consumer: Guide `(1, 1, 1)` needs `maintenancePoolMax >= 2` and `DB_POOL_MAX >= 1`;
  retention needs `(1, 0, 0)`; both together need `maintenancePoolMax >= 3` (process rule).

Test legs:

- F24 adds `(1, 1, 1)` with max 3 passing and `(3, 1, 0)` with max 3 failing. The R7 cases stay.
- F21e (new): with max 3, three concurrent leases (1 + 2) all acquire; a fourth waits and rejects
  `database_pool_reserve_timeout` at 2,000 ms (fake clock) with zero factory calls. With max 2,
  the third rejects the same way.

### R8.6 — Real-DB identity isolation on the shared `coderso02` (orchestrator decision 4; closes B-M5)

- The name is fixed at import (`client.ts:48`, `identity` parsed from `process.env`); the default
  is `replica-1` (`databaseApplicationIdentity.ts:72`).
- The RD run env therefore sets `CODERSO_DB_REPLICA_ID=test-<run>`, where `<run>` is 12 lowercase
  hex characters generated per run by the orchestrator.
- The value satisfies `REPLICA_ID_PATTERN` (`databaseApplicationIdentity.ts:41`, at most 32
  chars), and the default fleet (1 runtime, 0 workers) accepts an explicit ID.
- The run's maintenance name is `coderso:maintenance:test-<run>`.
- The R7.10 orchestrator gate (`:2551-2552`) becomes:

  ```text
  env -i PATH=… HOME=… DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_NAME=coderso02 TASK551_FIXTURE_DATABASE_SENTINEL=<bootstrap sentinel> DB_LOCK_TIMEOUT_MS=15000 CODERSO_DB_REPLICA_ID=test-<run> bun --env-file=/dev/null test tests/integration/server/task551DatabaseLifecycle.test.ts tests/integration/server/task551DatabaseLifecycleRealDb.test.ts tests/integration/server/task551DedicatedSessionGuards.test.ts tests/integration/server/task551RuntimeEntrypoints.test.ts tests/perf/database-pg-stat-interval.test.ts
  ```

  RD1-RD12 and RD-cancel must be EXECUTED. None of the co-run files pins `replica-1` (verified
  2026-09-26).
- Fail closed: when the owner map is present, the RD file's `beforeAll` requires
  `process.env.CODERSO_DB_REPLICA_ID` to match `/^test-[0-9a-f]{12}$/u`, and otherwise FAILS (it
  does not skip). Residue checks on the shared default name would be unscoped. The airtight FAST
  gate (no owner map) still skips by name.
- The test's independent observer client uses `application_name` `t551rd-observer-<run>` and is
  ended in `afterAll`.
- External kills (RD8, RD9, RD12) are pinned to the leg's own session. The leg first records
  `{ pid, started }` through one `execute`
  (`select pg_backend_pid() as pid, (select backend_start::text from pg_stat_activity where pid = pg_backend_pid()) as started`),
  then kills only through
  `select pg_terminate_backend(pid) from pg_stat_activity where pid = $pid and backend_start::text = $started and application_name = $runMaintenanceName`.
  The kill must return exactly one `true` row, or the leg fails.
- Advisory keys:
  - The literal "`551_034 + hashtext(run)`" is not adopted as the namespace. The two-int advisory
    keys are `int4`, and the sum can overflow (`integer out of range`).
  - The per-run component moves to the second key. The namespace is `551034`: test-only, unused
    anywhere in `core/`, `tests/`, `scripts/` and `_docs/` on 2026-09-26, and asserted to differ
    from every landed namespace (R7.8 list).
  - Per run: `base = hashtext('t551rd:' || <run>) & 2147483392` (`0x7FFFFF00`), computed once in
    `beforeAll` on the observer client. The leg key is `base | leg` with `leg` in `1..255`.
  - The bigint key passed to `withDedicatedDatabaseAdvisoryLock` is `(551034n << 32n) | BigInt(base | leg)`.
    `pg_locks` then shows `classid = 551034` and `objid = base | leg`.
- RD8 (replaces `:2485`): the next call rejects `session_lost` without hanging, and the factory was
  called once. After the drain settles, polling for up to 3,000 ms at 100 ms finds no backend with
  `application_name = $runMaintenanceName`.
- RD11 (replaces `:2488`): after the file, polling for up to 3,000 ms finds zero backends with the
  run's maintenance name. Zero advisory locks match
  `locktype = 'advisory' and classid = 551034 and (objid::bigint & 2147483392) = $base`.

### R8.7 — Zero-WARNING guard and `25P01` canary under R7 (closes B-L2, A-M5 part 2)

The R6.6 canary pool (`:1801-1808`) is gone. Replacement:

- Canary: once in `beforeAll`, a separate canary client is built from the production builder:
  `postgres(fixtureUrl, createDedicatedClientOptions({ url: fixtureUrl }, { onclose: () => {}, onnotice: canaryRecorder.record }))`.
  It runs one idle `rollback` and must record exactly one `WARNING` with code `25P01`. It is ended
  in `finally`. No session is used for it, so R7.4's "no path issues an idle rollback" stays true
  for the module.
- Guard: before every zero-WARNING assertion, `current_setting('client_min_messages')` is read
  through `execute` on the session under test and must be `notice`, `log` or `debug*`. The
  production builder sets no `client_min_messages`, so a stricter server default FAILS the leg
  instead of producing a false clean.

### R8.8 — Other test-matrix corrections (closes A-L2)

- `task551DatabaseLifecycle.test.ts`: the "unchanged" range is `:65-118` and `:130-338`
  (replaces "`:130-435`", `:2460`).
  - `FakeReserved` (`:339-343`) is deleted with `makeFakeReserved`.
  - `makeTag` (`:345-362`) stays only if a rewritten leg uses it; otherwise it is deleted (no unused
    helpers).
- The R7.8 table gains F26 (R8.2), the F2/F4 variant (R8.3), F21a-F21e (R8.4, R8.5) and the
  F10/F13/F24/F25 extensions. The RD table gains RD12, with RD8 and RD11 revised (R8.6).

### R8.9 — Cross-leaf handoffs, completed (orchestrator decision 5; closes A-M4, B-M2, A-M6, B-L4, B-L3)

This leaf edits none of these files.

**TASK-551-06-L03**: R7.11's bullets stand. In addition, these contract sentences are superseded
(quoted; `TASK-551-06-L03-…md` line = current anchor):

- `:123-126` "Thus `DB_PGBOUNCER_MODE=transaction` with `DB_MAINTENANCE_MODE=primary`, a declared
  transaction-pooled maintenance URL, PID drift, or a verifier that can re-enter the owner lock
  fails startup as `database_maintenance_session_unavailable`."
  - Now: `transaction + primary`, `session` mode, a pooled or unverifiable dedicated-session
    target, an open failure or deadline, and a key/pid mismatch fail startup with that code.
  - Startup PID drift and verifier re-entry no longer exist. In-lease PID drift is R7.3 G3
    (`session_lost`).
- `:127` "Direct PostgreSQL and PgBouncer session-pooling maintenance URLs must pass."
  - Now: direct passes; `session` is unavailable.
- `:128-130` "`off + primary + DB_POOL_MAX=1` is valid while this scheduler is disabled, but
  enabled scheduler startup fails before timer/listen because the two-session probe cannot run."
  - Now: an enabled start at `DB_POOL_MAX=1` PASSES when the R7.2 target resolves, because
    dedicated sessions never use the primary pool.
- `:130-132` "For explicit `direct|session`, L02 has already started the same lifecycle-scoped
  probe; this assertion awaits/reuses its settled success rather than acquiring two more sessions
  or probing twice."
  - Now: for `direct`, one startup-check open per generation is reused. `session` rejects at
    database startup.
- `:187-189` "Disabled mode at `off + primary + DB_POOL_MAX=1` performs no affinity
  probe/reservation and starts ordinary runtime successfully. Enabled mode with that same
  capacity awaits the probe and fails before timer/listen."
  - Now: disabled makes zero factory calls; enabled makes exactly one factory call and passes.
- `:191-194` "direct and session-pooled channels pass, while transaction-primary,
  transaction-pooled maintenance, PID drift, lock re-entry, missing URL, and outage fail startup
  with the exact stable code and zero timer/job activity."
  - Now: direct passes.
  - `session`, transaction-primary, pooled or unverifiable maintenance target, key/pid mismatch,
    missing URL and outage fail with `database_maintenance_session_unavailable` and zero
    timer/job activity. An outage no longer propagates its raw message.
- `:194-195` "A dedicated-mode fixture proves DB startup plus scheduler startup execute one
  physical affinity probe total."
  - Now: one startup-check open (one factory call) in total.
- A6 (`:1572-1598`), the `withPoolOptions` import pin: the pinned list becomes
  `["DATABASE_CLIENT_ERROR_CODES", "drizzleForDedicatedTransaction", "withDedicatedDatabaseSession", "type DedicatedDatabaseSession", "type DedicatedDatabaseTransaction"]`
  (values, then types, ASCII order within each group).
  - The A6 header comment names `drizzleForDedicatedTransaction`, not `withPoolOptions`.
  - The `retentionJobService.ts` import block (today `:90-95`) matches.

`tests/integration/runtime/retentionScheduler.test.ts` re-baselines (HEAD anchors; the 06-L03 A1
split may move them). These are intended contract changes, not weakenings:

- `OWNER_LOCK`, `VERIFIER_FREE`, `proofPool` and `fakePool` (`:239-245`) are replaced by a fake
  `dedicatedClientFactory` (a matching identity result: `state.pid === row.pid`) with a
  factory-call counter.
- `CHANNEL` (`:248-252`):
  - `direct` keeps `maintenancePoolMax: 2` and every direct-mode override adds
    `maintenanceUrl: "postgres://task551-sched.invalid:5432/task551sched"`, a verified non-pooled
    placeholder with an explicit port. Without it, R7.2 target resolution fails closed.
  - `cappedPrimary` overrides add the same URL as `databaseUrl`, so resolution does not depend on
    the ambient `DATABASE_URL`.
- `:614-619` capped-primary enabled: it moves to the PASS side. Exactly one factory call, one
  scheduled timer, and `controller.stop()` in `finally`.
- `:620-622` transaction-primary: unchanged (zero factory calls).
- `:623-627` outage: a factory that throws `synthetic_maintenance_outage` →
  `database_maintenance_session_unavailable` with exactly one factory call. The raw message is
  asserted ABSENT from the rejection.
- `:628-646` the re-entrant and PID-drift legs are deleted with the probe. They are replaced by ONE
  key/pid-mismatch leg: `state.pid !== row.pid` → `UNAVAILABLE`, one factory call, the fake client
  ended with `timeout: 0`, zero timer/job activity.
- `:650-675` the direct pass leg: `reservations()` `2` becomes factory calls `1`, still memoized
  across the idempotent second start.
- `:676-697` the `session` leg: `database_maintenance_session_unavailable` with zero factory calls
  (as R7.11).
- `:264-265` `withDirectChannel` uses the fake factory plus the `maintenanceUrl` placeholder.

**TASK-551-02-L01**: the dated note replaces R7.11's `:2592-2601` bullets. It must be appended
BEFORE any 02-L02 R7/R8 code is dispatched (orchestrator hold: 02-L01 C2-C4 and the C5 land order,
`TASK-551-02-L01-…md:319`, `:412-414`, must not be dispatched as written). It:

- supersedes C2-C4: `DB_MAINTENANCE_POOL_MAX` default 3 and bound `2..6`
  (`databaseConfig.ts:326` `2, 2, 4` → `3, 2, 6`), reinterpreted as the per-process
  `dedicatedSessionMax`;
  - `:365` stays `poolMax >= 2` (no consumer reads it; retiring it is 02-L01's call);
  - new pins: default 3; 2 and 6 accepted; 1 and 7 rejected;
- prices `N × (poolMax + dedicatedSessionMax + 1) + migrationReserve` in every mode (replacing
  `:334-338`); defaults `17 < 82`;
- recomputes the overflow-ceiling comment `databaseConfig.ts:181-182` for the new maximum
  (`512 × 50 + 512 × (6 + 1) + 8 = 29,192`);
- documents the R8.5 process rule (`>= 3` when retention and Guide ingest share a process);
- marks `session` unavailable for dedicated sessions (compatibility matrix `:128-145`);
- keeps O1 (`DATABASE_DIRECT_URL` under `transaction + primary`) as an open owner decision.

Until the 02-L01 source lands, the primary-mode fleet undercount is at most `N × 4` connections at
the new defaults (3 sessions + 1 control). It must close before the combined gates.

**TASK-548-01-L03**: replacement wording (quoted; 548 file line = current anchor):

- `:1057-1058` "TASK-551 alone unlocks normally or terminates/awaits the backend on false, error,
  abort, session loss or ambiguous unlock."
  - Now: "TASK-551 alone releases the lock by closing the dedicated client. A graceful close ends
    the session server-side and frees the lock; a forced close ends the backend and is awaited. No
    unlock statement exists."
- `:1064-1067` and `:2040-2043`: "`off + primary` requires `DB_POOL_MAX >= 3` (two dedicated
  sessions plus one retained ordinary-query headroom slot); `transaction + primary` is incapable;
  `direct|session` requires a maintenance pool of at least 2 while the primary keeps its own
  headroom."
  - Now: "`off + primary` and `direct` require `DB_MAINTENANCE_POOL_MAX >= 2` for the Guide shape
    (default 3; at least 3 whenever retention scheduling runs in the same process) and
    `DB_POOL_MAX >= 1`. `transaction + primary` and `session` are unavailable."
- `:1074-1076` and `:2047-2048`: "a pool-one primary receives an explicit not-ready/startup
  failure, never a process mutex or unsafe pooled fallback."
  - Now: "a pool-one primary is capable. An incapable configuration (`transaction + primary`,
    `session`, or a pooled/unverifiable dedicated-session target) receives the explicit not-ready
    failure, never a process mutex or unsafe pooled fallback."
- New, decided here for 548 to adopt:
  - `database_pool_reserve_timeout` (semaphore contention, R8.5) maps to the same retryable
    `assistant_docs_db_unavailable`;
  - `dedicated_database_session_lost` during shutdown keeps 548's session-loss mapping;
  - every Guide session stays strictly sequential (one statement in flight, R8.2); a pipelined
    statement rejects `dedicated_database_transaction_nested`.
- R7.11's connection-churn note stands.

**TASK-551-01-L01** (query-inventory delta, deferred consolidated rebaseline; closes B-L3, A-I1):

- Stale rows in `tests/perf/fixtures/task551QueryInventory.ts` (`:283-360`): `core/db/client.ts`
  `<module>` `104` (maintenance pool construction), `runAffinityProbe` `227` and `236`, and
  `terminateReservedBackend` `355`.
- New sites that need review classification:
  - the dedicated-client and control-client construction in `openDedicatedClient`/`openControlClient`;
  - `pg_try_advisory_lock` in `withDedicatedDatabaseAdvisoryLock`;
  - in `dedicatedDatabaseSession.ts`: the open identity statement, the literal
    `begin`/`set_config`/`rollback`/`commit`, and the control `pg_cancel_backend`, alive poll and
    `pg_terminate_backend`.
- All of these go to `_docs/_workflows/_smoke/task-551/inventory-rebase-kit/` (README `:14-17`
  deferral rationale, as in the 06-L01 precedent). No new inventory-test expectation is added by
  this leaf.

**TASK-551-10-L02** (deployment docs, informational; B-I1): dedicated sessions require
PostgreSQL ≥ 14 for `client_connection_check_interval` on a platform that supports it, plus a
non-pooled endpoint (R7.2).

**Land order** (replaces R7.11 `:2608-2614`):

0. the 02-L01 dated note (docs), before any 02-L02 R7/R8 code dispatch;
1. 02-L02 R7 + R8 code;
2. the 02-L01 source change (default 3, `2..6`, fleet formula, ceiling comment);
3. 06-L02 R8/R9;
4. 06-L03 R1 (with the R7.11 re-point and the R8.9 flips);
5. the combined gates;
6. at least two post-auditors per scope.

### R8.10 — Smaller corrections (closes A-L1, A-I2)

- R7.5 `:2283` is wrong about the seam's existence: `resetMaintenanceSessionAffinityForTests()`
  does not exist in source (0 matches in `core/db/client.ts`). It is ADDED:
  `export function resetMaintenanceSessionAffinityForTests(): void { lifecycleGeneration += 1; affinityProofPromise = null; }`.
  It ends no client, is never called automatically, and does not re-arm the R8.4 close fence.
- Destroy timing (A-I2): after a lost graceful race, `end({ timeout: 0 })` returns the existing
  `ending` promise (`src/index.js:366-367`). The real destroy happens at the driver's own 2 s
  timer, about 100 ms later. `DEDICATED_TERMINATE_AFTER_MS` is measured from the `destroy()` call,
  so the terminate may come up to about 100 ms early. That is the safe direction; it is matched by
  pid + `backend_start`.
- Receipt: the R7.10 key `"reopenR7Addendum20260925"` also records that R8 is part of the validated
  contract, the RD executed/skipped counts for RD1-RD12 and RD-cancel, and the run's replica-ID
  shape (never the URL).

### R8.11 — Superseded sentences (quoted; line = current anchor)

Base contract (not listed in R7.12):

- `:189-190`, `:195` "`const reserved = await reserveWithValidatedDeadline(maintenanceSqlClient);`",
  "`const session = createTrackedDedicatedSession(reserved);`",
  "`await releaseDedicatedSessionExactlyOnce(reserved);`".
  - Now: the R7.5 lease (semaphore, open, drain, slot release).
- `:213-215` "Give the distinct set {maintenanceSqlClient, sqlClient} at most
  min(10_000, absoluteDeadline-now) total".
  - Now: R8.4 (drains, then the control client, alongside `sqlClient`).
  - `:218-219` ("Never use Promise.race in a way that leaves end(), rollback, or socket teardown
    running detached.") STANDS, and R8.4 satisfies it.
- `:413-414` "It tracks the current postgres.js `PendingQuery` through its supported `cancel()`
  surface". This stays superseded (R6.8). Now: local destroy plus the R7.4 control cancel; the
  Query `cancel` is not exposed (R8.2).
- `:415-417` "Abort cancels active SQL and awaits rollback; if rollback cannot be confirmed, the
  wrapper terminates that reserved connection and waits for PostgreSQL to end its backend".
  - Now: R7.4 (abort poisons, destroy, control cancel, bounded confirm or terminate).
- `:424-425` "reserves one maintenance session". Now: opens one dedicated client.
- `:429-432` "Exact true permits normal release; false, error, abort, session loss, or ambiguous
  result uses the owner's private reserved-handle termination path". This stays superseded
  (R6.8). Now: close is the release (R7.5).
- `:616-617` "Real sessions prove main/replacement/distinct-maintenance `application_name`
  values; primary maintenance retains its main name."
  - Now: dedicated sessions carry `coderso:maintenance:<replicaId>` in every mode, including
    `off + primary`.
- `:634-635` "proves both primary and distinct maintenance clients reach a terminal closed state".
  - Now: the primary client, every registry session and the control client (R8.4).
- `:693-695` "Pin primary pool 1 as ordinary-start PASS and affinity-consumer FAIL; pin
  direct/session as exactly one startup probe whose result is reused by an enabled L03 consumer."
  - Now: pool 1 is ordinary-start PASS and affinity-consumer PASS (target permitting); `direct` is
    exactly one startup-check open, reused; `session` FAILS.
- `:768-770` "It is rejected only at activation of a session-affine consumer, never by
  unused-capability probing during normal DB startup."
  - Now: pool size is never a rejection reason. The ban on probing during a `primary` normal
    startup stands.
- Reviewed and NOT superseded:
  - `:608-611`: primary-pool reserve and replacement; the primary pool keeps `reserve`;
  - `:393` "shutdown prevents new attempts": implemented by R8.4;
  - `:686-687` "shutdown races produce `dedicated_database_session_lost`": R8.4 uses it;
  - `:744` "Every close/cancel/force path is awaited to terminal state exactly once": implemented
    by R8.4.

R7:

- `:2054` "`deps = { createClient(target), createControlClient(target), clock, bounds }`". Now R8.1.
- `:2068` "`onclose: () => { if (!closing) markLost(); }`" as a literal option. Now: the session's
  hook, passed through `createDedicatedClientOptions` (R8.1).
- `:2128-2129` "`end`, `close`, `reserve`, `release`, `listen`, `subscribe`, `notify` and `cursor`
  are `undefined` at runtime and absent from the type." Now: the R8.2 allowlists.
- `:2147-2151`: the `set_config` placement before `try`. Now R8.3.
- `:2167-2169` "There is exactly one operation at a time." Extended: and at most one executed
  statement in flight (R8.2).
- `:2204` "`finally: releaseControlClient()`". Now awaited (R8.4).
- `:2210-2211` "Destroying first makes the abort visible to the caller at once and removes every
  reconnect path." Now: true only together with the R8.2 one-statement rule.
- `:2283` "`resetMaintenanceSessionAffinityForTests()` (the R6.2 test seam, never automatic) is
  kept." Now: added (R8.10).
- `:2310-2316`: the `closeAllDatabaseClientsWithin` steps 1-4. Now R8.4.
- `:2322-2323` "`dedicatedClientFactory?: (target) => Sql` and `controlClientFactory?: (target) => Sql`".
  Now R8.1.
- `:2362-2364` "`DB_MAINTENANCE_POOL_MAX` keeps its name and its L01 bounds, default 2 and range
  `2..4`". Now: default 3, `2..6`, owned by 02-L01 (R8.5).
- `:2386` "so the bound reverts to `2..4`, default 2." Now R8.5.
- `:2395` "defaults (N 1, pool 10, max 2, reserve 3): 16 < 82." Now `17 < 82` (R8.5).
- `:2460` "`:65-118` and `:130-435` are unchanged." Now R8.8.
- `:2468` "`dedicatedClientFactory: <real factory + onnotice recorder>`". Now R8.1.
- `:2470-2471` "The R6.6 `client_min_messages` guard and the `25P01` canary stay in force for every
  zero-WARNING assertion." Now R8.7.
- `:2472-2473` "Advisory keys are test-only two-int keys in a namespace asserted to differ …". Now
  R8.6.
- `:2485` (RD8) "no backend with the test's maintenance `application_name`" and `:2488` (RD11)
  "zero backends with the test `application_name`". Now R8.6.
- `:2551-2552` the owner-map run "with RD1-RD11 EXECUTED". Now the R8.6 command, with RD1-RD12 and
  RD-cancel executed.
- `:2584` "`CHANNEL.direct` `:251` stays `maintenancePoolMax: 2`". Extended: plus the
  `maintenanceUrl` placeholder (R8.9).
- `:2593-2594` "supersedes C2-C4 (bound stays `2..4`, default 2; `:365` stays; the C4 test pins
  are not applied)". Now R8.9.
- `:2599-2601` "The primary-mode fleet undercount (at most N × 3 connections at the defaults)". Now
  `N × 4` (R8.9).
- `:2603-2604` "The requirement becomes `dedicatedSessionMax >= 2` and `DB_POOL_MAX >= 1`".
  Extended by the R8.5 process rule and the R8.9 548 wording.
- `:2608-2614`: the land order. Now R8.9.

### R8.12 — Finding → disposition

Audit A = agent `a201084a0788777c5`; audit B = agent `a02973687bae4e738`.

| Finding | Sev | Disposition |
|---|---|---|
| A-M1 reconnect ghost with a queued statement | MEDIUM | Fixed: one statement in flight, F13 extension, RD12 (R8.2) |
| A-M2 handle denylist misses `largeObject`/`file`; `cursor` is a Query method | MEDIUM | Fixed: handle and Query allowlists, F26 (R8.2) |
| A-M3 closeAll dials control after close; detached drains | MEDIUM | Fixed: close fence, awaited bounded drains, control last, no post-close dial, F21a-d (R8.4) |
| A-M4 06-L03 scheduler-test handoff incomplete | MEDIUM | Fixed: every leg dispositioned, `maintenanceUrl` placeholder, A6 list (R8.9) |
| A-M5 RD factory seam cannot add `onnotice`; canary has no client | MEDIUM | Fixed: exported builder and factory (R8.1); canary client from the builder (R8.7) |
| A-M6 02-L01 land-order contradiction | MEDIUM | Fixed: 02-L01 note is step 0, before code dispatch; C2-C4 hold (R8.9) |
| A-L1 reset seam "kept" but absent | LOW | Fixed: "added", body restated (R8.10) |
| A-L2 unchanged range overlaps deleted fakes | LOW | Fixed: `:130-338` (R8.8) |
| A-L3 `set_config` outside `try` | LOW | Fixed: pseudocode and F2/F4 variant (R8.3) |
| A-L4 `releaseControlClient` not awaited | LOW | Fixed: awaited (R8.4); RD8/RD11 also poll (R8.6) |
| A-L5 R7.12 misses base sentences | LOW | Fixed (R8.11) |
| A-I1 inventory rows | INFO | Handed to the 01-L01 rebase kit (R8.9) |
| A-I2 forced destroy returns the existing `ending` | INFO | Recorded (R8.10) |
| B-M1 `createClient(target)` cannot carry hooks | MEDIUM | Fixed: `createClient(target, hooks)`, builder, F10/F25 (R8.1) |
| B-M2 06-L03 contract and test handoff incomplete; TASK-548 sentences | MEDIUM | Fixed (R8.9) |
| B-M3 per-process semaphore vs retention + Guide | MEDIUM | Fixed: default 3, `2..6`, process rule, contention mapping, F21e/F24 (R8.5) |
| B-M4 shutdown semantics undefined | MEDIUM | Fixed (R8.4) |
| B-M5 no test-unique `application_name`; unpinned kills; fixed namespace | MEDIUM | Fixed: per-run replica ID, pinned kills, per-run keys (R8.6); literal `551_034 + hashtext` replaced to avoid `int4` overflow |
| B-L1 R7.12 omissions; R6.8 precedence | LOW | Fixed (R8 preamble precedence bullet, R8.11) |
| B-L2 canary location | LOW | Fixed (R8.7) |
| B-L3 inventory delta not recorded | LOW | Fixed (R8.9) |
| B-L4 02-L01 on-disk contradiction | LOW | Fixed: same as A-M6 (R8.9) |
| B-I1 pooled URL fails closed; PostgreSQL ≥ 14 | INFO | Deployment note handed to 10-L02 (R8.9) |
| B-I2 destroy-before-cancel acceptable | INFO | No action; RD-cancel stays the proof |

## Dated Contract Corrections — 2026-09-26 (re-open R9: R8 audit closure)

Append-only. R9 closes the two fresh read-only R8 audits (audit A = agent `aa8b3be89491d9f5c`:
0 HIGH, 3 MEDIUM, 4 LOW; audit B = agent `a6533ed79680810a4`: 0 HIGH, 3 MEDIUM, 3 LOW, 1 INFO)
under the orchestrator dispositions of 2026-09-26
(`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`; this
section implements D1, D3 (a)-(i) and states the D7 content). R9 amends R8 (R8.1-R8.12) and,
through R8, R7. Where R9 and R8 disagree, R9 wins; R8 otherwise stands. No earlier byte is edited.

- The Workflow Dispatch Envelope `json` fence is NOT edited. The one new export lives in
  `core/db/client.ts`; every new leg lives in `task551DedicatedSessionGuards.test.ts` or
  `task551DatabaseLifecycleRealDb.test.ts`, which the fence already lists.
- The R8.4 STOP rule covers every Guards leg added here (F27, the F21a/F21c sub-legs, the F18
  overlap leg): if they would push the Guards file past its 800-line cap, the implementer STOPS
  and reports; a new test path needs a fence edit plus the family preflight.
- Anchors were grounded on 2026-09-26 against `/home/coder/project/Coderso-551` at HEAD
  `66203e22`. The worktree was dirty in 06-L02 source and tests, the 11 workflow modules and test,
  sibling task files and this file (R8 is uncommitted); none of the source anchors below is in a
  dirty file. Counts: `core/db/client.ts` 736, `core/db/databaseConfig.ts` 368,
  `tests/integration/runtime/retentionScheduler.test.ts` 998, postgres.js 3.4.9. Line numbers are
  anchors, not contract.

### R9.1 — Maintenance-statement seam (D1; closes A-M1, B-M1)

The 06-L02 pre-retention `VACUUM (ANALYZE)` needs one autocommit statement with a bound above the
session bound. R8 offers no sanctioned path: `openDedicatedClient` bypasses target resolution, the
close fence, the semaphore, the registry and the drain, and `withDedicatedDatabaseSession` +
`execute` runs under the L01 session bound (watchdog at 15 s + 2 s grace by default). R9 adds one
seam in `core/db/client.ts`. Owner: this leaf. Consumers: 06-L02 R13 (D2, D4) and 06-L03.

```ts
export type DedicatedClientStatementOptions = Readonly<{ statementTimeoutMs: number }>;

export function createDedicatedClientOptions(
  target: DedicatedSessionTarget,
  hooks: DedicatedClientHooks,
  statementOptions?: DedicatedClientStatementOptions
): postgres.Options<Record<string, postgres.PostgresType>>;

export function openDedicatedClient(
  target: DedicatedSessionTarget,
  hooks: DedicatedClientHooks,
  statementOptions?: DedicatedClientStatementOptions
): Sql; // postgres(target.url, createDedicatedClientOptions(target, hooks, statementOptions)); eager drizzle as R8.1

export async function runDedicatedMaintenanceStatement<TRow extends postgres.Row>(input: {
  signal: AbortSignal;
  statementTimeoutMs: number;
  statement: StaticDedicatedStatement<TRow>;
}): Promise<TRow[]>;
```

Builder third argument (present-only):

- Absent: the result is deep-equal to R8.1's two-argument result. Every R8.1 F25 pin is unchanged.
- Present: `statementTimeoutMs` must be a safe integer, otherwise the builder throws
  `database_maintenance_statement_bound_invalid` with zero clients. The value is clamped to
  `[config.statementTimeoutMs, 120_000]` (120,000 is the `DB_STATEMENT_TIMEOUT_MS` ceiling,
  `databaseConfig.ts:293-299`) and overrides ONLY the `connection.statement_timeout` startup
  parameter. `lock_timeout` and `idle_in_transaction_session_timeout` keep the 02-L01 values
  (`client.ts:71-78`); `application_name`, `client_connection_check_interval` and every other
  R8.1 option are unchanged. No `set_config` is ever issued for it.
- New key `DATABASE_CLIENT_ERROR_CODES.maintenanceStatementBoundInvalid =
  "database_maintenance_statement_bound_invalid"`. D1 requires an out-of-range bound to reject
  but names no code; this is that code. It is a caller-contract error, never an availability
  outcome: no consumer may map it to a skip.

Test seam and injection:

- The R8.1 override becomes
  `dedicatedClientFactory?: (target: DedicatedSessionTarget, hooks: DedicatedClientHooks, statementOptions?: DedicatedClientStatementOptions) => Sql`.
  `client.ts` passes the third argument only for seam opens; lease and startup-check opens pass
  `undefined`.
- The session module stays config-free: `deps.createClient(target, hooks)` keeps two parameters.
  `client.ts` builds per-open deps whose `createClient` closes over `statementOptions` and whose
  `bounds.statementTimeoutMs` is the clamped value, so the R7.3 watchdog is
  `clamped + DEDICATED_STATEMENT_GRACE_MS`.
- RD injection (replaces the R8.1 `:2811-2815` factory body; the rest of R8.1 stands):

  ```ts
  dedicatedClientFactory: (target, hooks, statementOptions) => {
    if (target.url !== TASK551_FIXTURE_DATABASE_URL) throw new Error("t551rd_foreign_target");
    factoryCalls += 1;
    return openDedicatedClient(target, { ...hooks, onnotice: recorder.record }, statementOptions);
  },
  ```

Seam pseudocode:

```text
runDedicatedMaintenanceStatement({ signal, statementTimeoutMs, statement }):
  fence()                                       // R8.4 close fence FIRST: session_lost, zero factory calls, zero slots
  if !Number.isSafeInteger(statementTimeoutMs) || statementTimeoutMs < 1 || statementTimeoutMs > 120_000:
    throw database_maintenance_statement_bound_invalid        // zero factory calls, zero slots
  if signal.aborted: throw dedicated_database_session_lost      // zero factory calls, zero slots
  target = resolveDedicatedSessionTarget()      // R7.2 matrix: transaction+primary, session, resolver throw,
                                                // pooled/unverifiable URL -> maintenance_session_unavailable, zero factory calls
  effectiveMs = clamp(statementTimeoutMs, config.statementTimeoutMs, 120_000)
  slot = await semaphore.acquire(POOL_ACQUISITION_DEADLINE_MS)  // else database_pool_reserve_timeout
  if closeState !== "open": slot.release(); throw dedicated_database_session_lost   // R9.3, same tick as below
  { session, ready } = open(depsFor({ statementTimeoutMs: effectiveMs }), target)  // R9.4; a sync throw: slot.release(); unavailable
  registry.add(session)                          // membership from construction (R9.4)
  try:
    await ready                                  // key/pid proof (R7.2); unavailable, or session_lost when shutdown interrupted it (R9.7)
    return await session.execute(statement, signal)             // exactly ONE execute: autocommit, no begin, no set_config
  finally:
    try: await session.cancelActiveAndRollback("lease_release") // the R7.4 drain; joins a running drain (R8.4)
    catch: contained                                            // never turns a returned result into a failure
    registry.delete(session); slot.release()                    // exactly once on every path
```

Rules:

- One statement, one backend, never shared. The seam calls `session.execute` exactly once; the
  statement receives the R8.2 scoped handle (a second trigger rejects `nested`). There is no
  `transaction`, no `begin` and no `set_config`, so `VACUUM` runs outside any transaction block.
- The client is a short-lived own `max: 1` client built for this call and discarded on every
  path. There is no `reset`, no `set_config(..., false)`, no terminate-a-pooled-backend branch and
  no reuse; the startup parameter dies with the backend.
- No startup-check call: the seam does not await `assertMaintenanceSessionAffinity()`. The open's
  own key/pid proof (R7.2) is the affinity proof for this backend, and a mismatch rejects
  `database_maintenance_session_unavailable`.
- Watchdog: `effectiveMs + DEDICATED_STATEMENT_GRACE_MS`. A server `57014` normally arrives first
  and is rethrown unchanged (not a loss, R7.3 classifier); the drain then takes the graceful path
  (subject to R9.2).
- Abort: `execute` rejects `session_lost` at once and poisons the session (R7.4 local destroy).
  The `finally` runs the R7.4 forced drain (control `pg_cancel_backend(pid)` matched on pid +
  `backend_start`, terminate as the last resort, bounded by `DEDICATED_DRAIN_DEADLINE_MS` =
  `RETENTION_CANCEL_DRAIN_DEADLINE_MS`), then releases the slot. The seam's promise rejects
  `dedicated_database_session_lost` only after that drain settles.
- Shutdown: the session is a registry member from construction, so `closeAll` drains it (idle →
  graceful per R9.2, busy → forced) and the pending `execute` rejects `session_lost`.
- Clamp lower edge: a value below `config.statementTimeoutMs` is raised to it; the seam never sets
  a server bound below L01's. A caller that must stop earlier aborts through `signal` (the 06-L02
  D4 run budget does).
- Budget: one semaphore slot per call. Retention stays `(1, 0, 0)` only while its pre-step never
  overlaps its plan lease; 06-L02 R13 owns that ordering (D2, D4). A caller that calls the seam
  while holding a lease needs one more slot.
- Error surface: `dedicated_database_session_lost`, `database_maintenance_session_unavailable`,
  `database_pool_reserve_timeout`, `database_maintenance_statement_bound_invalid`, and non-loss
  server errors rethrown unchanged (R7.3). Loss and unavailability never surface a raw driver
  message (R7.6).

Test legs:

- F27 (Guards; fake factory, fake control client, fake clock; `client.ts` imported under the
  airtight convention of R7.8):
  - startup parameter present only when given: a lease open hands the factory
    `statementOptions === undefined`; a seam open hands `{ statementTimeoutMs: <clamped> }`.
    `createDedicatedClientOptions(t, h, { statementTimeoutMs: 60_000 })` differs from the
    two-argument result only in `connection.statement_timeout === 60_000`; with
    `config.statementTimeoutMs` 15,000, `5_000` → 15,000 and `120_000` → 120,000; `1.5` → throws
    `database_maintenance_statement_bound_invalid`;
  - one statement: the fake records the identity statement, then exactly one caller statement, no
    `begin`, `set_config`, `rollback` or `commit`, then one graceful `end({ timeout: 2 })`; the rows
    are returned, the slot is released and the registry is empty; the watchdog is armed at
    `clamped + 2_000`;
  - abort during the statement → forced drain (cancel matched on pid + `backend_start`; the fake
    control reports the backend gone → `connection_terminated`) → the seam rejects
    `dedicated_database_session_lost`; the fake client is ended with `timeout: 0` exactly once; the
    slot is released;
  - after `closeAll` without re-arm → `session_lost`, zero factory calls, zero slots taken;
  - `transaction + primary`, `session` and a pooled URL → `database_maintenance_session_unavailable`
    with zero factory calls;
  - out-of-range bound (`0`, `-1`, `1.5`, `120_001`, `NaN`) → `database_maintenance_statement_bound_invalid`
    with zero factory calls.
- RD13 (RealDb; owner map and the R8.6 run env):
  - A leg-owned table `t551rd_vac_<run>` is created by the observer client in `current_schema()`
    and dropped in `finally`. No application table is touched (R7.8 `:2490` stands).
  - ``runDedicatedMaintenanceStatement({ signal, statementTimeoutMs: 60_000, statement: (sql) => sql`vacuum (analyze) ${sql(tableName)}` })``
    resolves. It ran outside a block (inside one, PostgreSQL raises `25001`). The observer then
    sees `vacuum_count >= 1` for that table in `pg_stat_user_tables` (`schemaname =
    current_schema()`), polling for up to 3,000 ms at 100 ms. The recorder holds zero WARNINGs
    (R8.7 guard applies).
  - A second seam call with `statementTimeoutMs: 60_000` runs
    `select pg_backend_pid() as pid, setting from pg_settings where name = 'statement_timeout'`
    and returns `"60000"` on a pid different from the first call's backend.
  - A following `withDedicatedDatabaseSession` `execute` of the same select returns
    `String(<the run's L01 statement bound>)`, and the observer's own session is unchanged: the
    startup value never leaked to another session.
  - RD11 residue covers the leg (zero backends with the run's maintenance name).

### R9.2 — Graceful race bound (D3 a; closes A-M2, B-M3)

The R7.4 graceful step (`:2182-2185`) is replaced:

```text
graceful: if !lost && inFlight empty && !destroyed:
  remainingMs = deadlineAt - now
  markerMs    = min(1_900, remainingMs - 100)
  endTimeoutS = ceil(markerMs / 1000)
  if markerMs > 0 && endTimeoutS * 1000 <= remainingMs:   // else skip graceful: forced only
    closing = true
    ok = race(client.end({ timeout: endTimeoutS }).then(() => true),
              sleepUntil(min(gracefulStartedAt + markerMs, deadlineAt)).then(() => false))
              // re-armed whenever drainWithin lowers deadlineAt: the race ends at the new deadline
    if ok: return "rolled_back"
forced: as R7.4; every bound reads the current deadlineAt. With deadlineAt - now <= 0 no
  control statement is issued, and the drain settles drain_unconfirmed after the local destroy.
```

- D3 (a) states marker, `ceil` and "`<= 0` → skip". The second skip condition
  (`endTimeoutS * 1000 <= remainingMs`) is required by D3 (a)'s own F21c variant and bound: with
  `closeAll(500)` the marker is 400 ms, its `ceil` is a 1 s driver timer, and postgres.js `end()`
  returns the existing `ending` to the later forced destroy (`src/index.js:365-367`), so a graceful
  attempt would settle only at 1,000 ms, past `closeDeadlineAt`. With the condition, a graceful end
  that starts after the deadline is known always fits inside it. At the unlowered 4,500 ms deadline
  the values stay 1,900 ms and 2 s (R7.6 unchanged).
- Bound, restated honestly (replaces R8.4 `:2962-2963`): `closeAll` resolves no later than
  `closeDeadlineAt` plus the local `end({ timeout: 0 })` settlements. The one exception is a
  graceful end already started before `closeAll` lowered that session's deadline: its local end
  settles at the driver's own timer, so for that case the bound is `closeDeadlineAt` plus at most
  `DEDICATED_GRACEFUL_END_TIMEOUT_S`. Nothing runs detached (base `:218-219`, `:744`).
- F21c variant (Guards, fake clock): an idle session inside a lease, `closeAll(500)`. The fake
  client's `end` is called only with `{ timeout: 0 }` (no graceful attempt), the fake control
  reports the backend gone at the first alive poll (`connection_terminated`), and `closeAll`
  resolves by `closeDeadlineAt`. The R8.4 F21c leg stays.

### R9.3 — Post-grant fence re-check (D1, D3 b; closes A-M3)

- Every semaphore acquisition (the lease in `withDedicatedDatabaseSession`, and through it
  `withDedicatedDatabaseAdvisoryLock`; the startup check; the R9.1 seam) re-checks the fence
  synchronously after `semaphore.acquire` resolves and before `createClient`:
  `if closeState !== "open": slot.release(); throw dedicated_database_session_lost` (zero factory
  calls).
- The registry insertion (R9.4) runs in that same tick. `closeAll`'s synchronous prefix therefore
  meets each acquisition as exactly one of: a waiter (rejected in step 1), a registry member
  (drained in step 2), or a granted continuation that fails the re-check.
- F21a-1 (Guards): the leg calls the R9.1 seam with a free slot (its first await is the semaphore
  acquire, so the grant is resolved) and, in the same synchronous tick,
  `closeAllDatabaseClientsWithin(1_000)`. The seam rejects `session_lost` with zero factory calls,
  the semaphore's free count equals `maintenancePoolMax` again, and `closeAll` resolves with an
  empty registry.

### R9.4 — `open` returns `{ session, ready }` (D3 c; closes A-L1, B-L3 part 1)

The R7.3 open (`:2085-2093`) and the R7.5 lease line `:2244` are replaced:

```text
open(deps, target): { session, ready }            // synchronous
  client = deps.createClient(target, hooks)       // a throw propagates synchronously as maintenance_session_unavailable
  session = <session over client>                 // "opening": drainWithin and cancelActiveAndRollback available now
  ready = (async () => {
    r = await deadline(<identity statement>, DEDICATED_OPEN_DEADLINE_MS)   // includes the cold connect
    if <a drain destroyed the session while pending>: throw dedicated_database_session_lost   // R9.7
    if (!r[0] || r.state.pid !== r[0].pid): destroy(); throw maintenance_session_unavailable
    id = { pid: r[0].pid, started: r[0].started }  // "open"
    any other open error or deadline: destroy(); throw maintenance_session_unavailable
  })()
  return { session, ready }

withDedicatedDatabaseSession(run):
  fence()
  await assertMaintenanceSessionAffinity()
  target = resolveDedicatedSessionTarget()
  slot = await semaphore.acquire(POOL_ACQUISITION_DEADLINE_MS)
  if closeState !== "open": slot.release(); throw dedicated_database_session_lost   // R9.3
  { session, ready } = open(realDeps, target)    // a sync throw: slot.release(); rethrow
  registry.add(session)                          // same tick as the re-check
  try:
    await ready
    return await run(session)
  finally:
    try: await session.cancelActiveAndRollback("lease_release")
    catch: contained
    registry.delete(session); slot.release()     // exactly once on every path
```

- `client.ts` never hands the session to `run` (or to the seam's `execute`) before `ready`
  resolves.
- `drainWithin` on an opening session destroys it locally (`end({ timeout: 0 })`), issues no
  control statement (there is no pid/`backend_start` to match) and settles `drain_unconfirmed`. A
  drain on any session whose `ready` rejected settles the same way, with zero control factory
  calls; the lease `finally` contains it.
- F1 is re-expressed on the new shape: `const { ready } = open(...)`, and `await ready` rejects
  `database_maintenance_session_unavailable`; the client is ended with `timeout: 0`.
- F21a-2 (Guards; also pins R9.7): the fake identity statement never settles; `closeAll(1_000)`
  runs. The drain settles `drain_unconfirmed` with zero control factory calls, the fake client is
  ended with `timeout: 0` exactly once, the lease rejects `dedicated_database_session_lost` and
  `run` is never invoked, the slot is released, the registry is empty, and `closeAll` resolves by
  `closeDeadlineAt`.

### R9.5 — Control holder detaches synchronously (D3 d; closes A-L2)

```text
acquireControlClient(target):
  if control.closed: throw <internal control_closed>     // drain -> drain_unconfirmed, zero dials (R8.4)
  if control.client === null: control.client = deps.createControlClient(target)   // a fresh client, never an ending one
  control.refcount += 1; return control.client
releaseControlClient():                                  // awaited in the drain finally (R8.4)
  control.refcount -= 1
  if control.refcount === 0:
    ending = control.client; control.client = null      // detached synchronously, before any await
    await ending.end({ timeout: 0 })
endControlClient():                                      // closeAll step 3
  control.closed = true
  if control.client !== null: ending = control.client; control.client = null; await ending.end({ timeout: 0 })
```

- A detached, ending client receives no further statements. An acquire during that window dials a
  fresh client, or dials nothing once `control.closed` is set.
- F18 overlap sub-leg (Guards): drain A is the last holder and its fake control `end` is held on a
  deferred; while A's release awaits it, drain B acquires. The control factory is called a second
  time (two calls in total), B's cancel and alive statements go to the second fake, B settles
  `connection_terminated` (not `drain_unconfirmed`), A's fake receives zero statements after its
  release, and resolving the deferred settles A.

### R9.6 — F21 row (D3 e; closes A-L3, B-L3 part 2)

The R7.8 F21 row's last sentence (`:2430`) is superseded. The row's required outcome now reads: "A
drain failure is contained. The semaphore times out with `database_pool_reserve_timeout`. The slot
is released on every path. `closeAllDatabaseClientsWithin` drains every registry session per R8.4
(idle graceful, busy forced), with the graceful step bounded by R9.2."

### R9.7 — Pending open interrupted by shutdown (D3 f; closes B-L2)

- A pending open that a shutdown drain interrupts rejects `dedicated_database_session_lost`
  (R9.4). Base `:686-687` ("shutdown races produce `dedicated_database_session_lost`") stands, and
  R8.11's "Reviewed and NOT superseded" entry for it (`:3307`) is now true.
- Every other open failure (key/pid mismatch, open error, open deadline, factory throw) still
  rejects `database_maintenance_session_unavailable` (R7.6).
- R8.4 `:2938-2941` is corrected accordingly (R9.13); the code is pinned in F21a-2. The R8.9
  TASK-548 mapping ("`dedicated_database_session_lost` during shutdown keeps 548's session-loss
  mapping") already covers it.

### R9.8 — Advisory namespace inventory for `551034` (D3 g; closes A-L4)

- The RD collision assertion (R8.6 "asserted to differ from every landed namespace (R7.8 list)")
  uses the complete list: `20260604`, `20260628`, `20260818`, `548`, `547`, `551063`
  (`retentionJobService.ts:182`), `551001`-`551005` (revision families,
  `core/services/database/revisionAllocation.ts:136-142`) and `551031`-`551033` (contracted by
  TASK-551-03-L02: `ADMIN_SET_LOCK_NAMESPACE`, the suite lock `551_032`,
  `BOOKING_RESOURCE_LOCK_NAMESPACE`; 03-L02 file `:3225`, `:5050`, `:5974`).
- `551034` is recorded as RESERVED for the TASK-551-02-L02 RealDb identity (test-only). No other
  TASK-551 leaf may allocate it. On 2026-09-26 it appears only in this file and the disposition
  record; `551031`-`551033` have no code match yet.
- TASK-551-03-L02 is told through R9.11.

### R9.9 — 06-L03 `retentionScheduler.test.ts` handoff, executable (D3 h; closes B-M2)

This leaf edits none of these files. The R8.9 re-baselines stand except where amended below (HEAD
anchors; the 06-L03 A1 split may move them). These are intended contract changes, not weakenings.

- Ordering (`:613-646`): the startup-check success is cached per lifecycle generation and
  `setDatabaseClientRuntimeForTests` bumps no generation (R8.4), so a capped-primary PASS that
  runs first would serve the later `direct` outage and key/pid-mismatch legs from the cache (zero
  factory calls, no rejection). The capped-primary PASS leg therefore runs AFTER the rejection legs
  (transaction-primary, outage, key/pid mismatch), OR in its own test (the per-test `beforeEach`
  `closeAll` bumps the generation), OR calls `resetMaintenanceSessionAffinityForTests()` right
  after it. The transaction-primary leg rejects by the mode matrix before any cache read, so its
  position is free.
- Ordering-law banner (`:19-21`): the law is unchanged (only a generation bump clears a cached
  proof). The banner text is updated to name both bumps (the `beforeEach` `closeAll` and
  `resetMaintenanceSessionAffinityForTests()`), and to state that every rejection leg on a mode
  that passes the matrix precedes the one counting PASS leg of its generation.
- Clock capture (02-L02 side, binding): `client.ts` captures `globalThis.setTimeout`,
  `globalThis.clearTimeout` (bound) and `performance.now` once at module evaluation into the real
  deps' `clock`. The `withTimers` global swap (`:148-192`) therefore records no dedicated-path
  timer (open deadline, graceful marker, watchdog, drain loop, semaphore deadline), so the
  index-based `fireTurn(recorder, 0)` (`:666`) and the `toHaveLength(0|1)` timer counts stay
  valid. `DatabaseClientRuntimeOverrideForTests` gains `clock?` for the Guards fake clock;
  clearing the override restores the captured clock. The 06-L03 legs may additionally assert
  scheduler timers by `delayMs`; that form is also valid.
- `:395-412` (configuration failures): the override becomes
  `{ config: CHANNEL.direct, maintenanceUrl: <placeholder>, dedicatedClientFactory: <fake> }`;
  `pool.reservations()` `0` becomes factory calls `0`; `recorder.scheduled` stays length 0.
- `:900-945` (default job binding): `pool()` is replaced by a fake `dedicatedClientFactory` whose
  identity result carries `state.pid === <identity pid>` and `{ pid, started }`; every result
  carries that `state.pid` and a `command` tag equal to the upper-cased first keyword of the
  statement text (`BEGIN`, `COMMIT`, `SELECT`, and `VACUUM` if the 06-L02 pre-step reaches this
  path through the R9.1 seam); a graceful `end` resolves; `end({ timeout: 0 })` resolves. The
  override adds the `maintenanceUrl` placeholder. The existing assertions (`:927-936`) stay; the
  factory-call count is not pinned in this leg.
- `:614-619` capped-primary PASS (R8.9) keeps exactly one factory call, one scheduled timer and
  `controller.stop()` in `finally`, now at the position above.

### R9.10 — 02-L01 dated note content (D7; R8.9 step 0)

This leaf does not write 02-L01; a sibling writer does. The 02-L01 dated note must carry, citing
D7:

- It withdraws C2's default `3` / bound `3..4` (02-L01 `:319`, `:334`, `:431`) in favour of R8:
  `DB_MAINTENANCE_POOL_MAX` default 3, bound `2..6` (`databaseConfig.ts:326` `2, 2, 4` →
  `3, 2, 6`), reinterpreted as the per-process `dedicatedSessionMax`; pins: default 3; 2 and 6
  accepted; 1 and 7 rejected.
- The fleet formula `N × (poolMax + dedicatedSessionMax + 1) + migrationReserve` in every mode
  (replacing `databaseConfig.ts:334-338`), defaults `17 < 82`, and the recomputed overflow-ceiling
  comment (`databaseConfig.ts:180-183`: `512 × 50 + 512 × (6 + 1) + 8 = 29,192`).
- The forced fixture re-baselines in `tests/vitest/db/databaseConfig.test.ts`: `:48`, `:203-207`,
  `:580-601`, `:614-619`, `:656-663`, and the comments at `:684`, `:690`, `:715`, `:727`.
- The new minimum usable `DB_SERVER_MAX_CONNECTIONS` at pool 1 (`N` 1, `dedicatedSessionMax` 3,
  migration reserve 3, `DB_RESERVED_CONNECTIONS` at its 20 % minimum): planned `1 + 3 + 1 + 3 = 8`
  must be `< server − ceil(server × 20 / 100)` (`databaseConfig.ts:340`), which first holds at
  `12` (`12 − 3 = 9`); today's primary-mode minimum is `7`. The sibling writer re-verifies this
  arithmetic against the source.
- The R8.5 process rule, `session` unavailable for dedicated sessions, O1 still open, and `:365`
  `poolMax >= 2` kept as 02-L01's call (all as R8.9).
- It withdraws the earlier sentence that the correction "lands BEFORE the 02-L02 R6 code"
  (02-L01 `:412-414`); the R6 → R7/R8 pivot replaced it with R9.12 step 0.

### R9.11 — Other handoffs (this leaf edits none of these files)

- **TASK-551-06-L02 R13** (D1, D2, D4): the pre-step calls only `runDedicatedMaintenanceStatement`
  and maps `database_maintenance_session_unavailable` to its skip code;
  `database_maintenance_statement_bound_invalid` is never a skip. Its channel, target, abort and
  budget text are 06-L02's own (D2, D4).
- **TASK-551-06-L03**: R9.9, plus the seam as the only VACUUM path; `query.cancel()` is never
  relied on (D2).
- **TASK-551-03-L02**: `551034` is reserved (R9.8); the 03-L02 namespace series continues at
  `551035` or later.
- **TASK-551-01-L01** (inventory delta, same deferral as R8.9): the seam's `execute` site and the
  third `createDedicatedClientOptions` argument go to
  `_docs/_workflows/_smoke/task-551/inventory-rebase-kit/`; no inventory-test expectation is
  added by this leaf.

### R9.12 — Land order (D1, D3 i; replaces R8.9 `:3242-3250`)

0. the 02-L01 dated note (docs, R9.10 / D7), before any 02-L02 R7/R8/R9 code dispatch;
1. 02-L02 R7 + R8 + R9 code, including the R9.1 seam (it lands WITH this code);
2. the 02-L01 source change (default 3, `2..6`, fleet formula, ceiling comment);
3. 06-L02 R8-R13;
4. 06-L03 R1 (with the R7.11 re-point, the R8.9 flips and R9.9);
5. the combined gates;
6. at least two post-auditors per scope.

- The R8.6 owner-map run executes RD1-RD13 and RD-cancel; the R8.10 receipt records the
  executed/skipped counts for RD1-RD13 and RD-cancel and that R9 is part of the validated
  contract. The R8.6 gate command is unchanged.
- The R8.8 table gains F27, F21a-1, F21a-2, the F21c variant and the F18 overlap sub-leg; the RD
  table gains RD13.

### R9.13 — Superseded sentences (quoted; line = current anchor)

R7:

- `:2085` "`open(deps, target):`" (awaited, returning the session). Now R9.4 (`{ session, ready }`).
- `:2182-2185` "`graceful: if !lost && inFlight empty && !destroyed:` / `closing = true` /
  `ok = race(client.end({ timeout: DEDICATED_GRACEFUL_END_TIMEOUT_S }).then(() => true),` /
  `sleep(1_900).then(() => false))`". Now R9.2.
- `:2232-2233` "The graceful/forced split uses a 1,900 ms race marker." Extended: at most 1,900 ms,
  bounded by the drain deadline (R9.2).
- `:2244` "`session = await open(realDeps, target); registry.add(session)`". Now R9.4.
- `:2430` "`closeAllDatabaseClientsWithin` destroys live sessions." Now R9.6.

R8:

- `:2765-2768` and `:2786-2787`: the two-parameter `createDedicatedClientOptions(target, hooks)`
  and `openDedicatedClient(target, hooks)`. Extended by the present-only third argument (R9.1).
- `:2805` "`dedicatedClientFactory?: (target: DedicatedSessionTarget, hooks: DedicatedClientHooks) => Sql`".
  Now R9.1 (third parameter).
- `:2811` "`dedicatedClientFactory: (target, hooks) => {`" and `:2814`
  "`return openDedicatedClient(target, { ...hooks, onnotice: recorder.record });`". Now R9.1.
- `:2921-2923` "`fence(): if closeState !== "open": throw dedicated_database_session_lost   // zero factory calls, zero slots`
  / `// checked first in withDedicatedDatabaseSession, withDedicatedDatabaseAdvisoryLock,` /
  `// assertMaintenanceSessionAffinity(IfDeclared) and before every semaphore grant`". Extended: also
  first in `runDedicatedMaintenanceStatement` (R9.1), and re-checked after every grant (R9.3).
- `:2927-2932` (closeAll steps 1-2: waiters rejected, primary `end` started, `registry.map` drains
  awaited). Extended: the registry includes opening sessions (R9.4), each graceful step obeys
  R9.2, and a granted continuation is caught by R9.3.
- `:2938-2941` "Registry membership starts when the client is constructed, before the identity
  statement. A session whose open is still pending is destroyed locally (`end({ timeout: 0 })`);
  with no pid/`backend_start` it cannot be confirmed, so its drain settles `drain_unconfirmed` and
  its open rejects `database_maintenance_session_unavailable`. No caller SQL ran on it." Now: the
  membership and drain parts stand, realized by R9.4; the open rejects
  `dedicated_database_session_lost` (R9.7).
- `:2944-2945` "or lowers a running drain's `deadlineAt` to `min(current, deadlineAt)`. The loop
  and every control-statement bound read the current value." Extended: the graceful race marker
  reads it too (R9.2).
- `:2949` "Idle sessions take the graceful path (≤ 1,900 ms)". Now: idle sessions take the
  graceful path only when R9.2's condition holds; otherwise forced.
- `:2958-2961` "`releaseControlClient()` in the drain `finally` (`:2204`) is AWAITED. When the
  refcount reaches 0 it awaits `end({ timeout: 0 })`." Extended: the holder is detached
  synchronously before that await (R9.5); the rest stands.
- `:2962-2963` "Bound: `closeAll` resolves no later than `closeDeadlineAt` plus the local
  `end({ timeout: 0 })` settlements." Now R9.2 (restated bound).
- `:2968-2969` "It bumps no generation and clears no cached proof, so the 06-L03 "Ordering law"
  (`retentionScheduler.test.ts:19-21`) is unchanged." The law stands; the banner text and leg
  order change per R9.9.
- `:3049` "RD1-RD12 and RD-cancel must be EXECUTED." Now RD1-RD13 (R9.12).
- `:3067-3068` "and asserted to differ from every landed namespace (R7.8 list)." Now the R9.8
  list.
- `:3161-3162` "`:614-619` capped-primary enabled: it moves to the PASS side. Exactly one factory
  call, one scheduled timer, and `controller.stop()` in `finally`." Extended: its position (R9.9).
- `:3164-3169` (outage and key/pid-mismatch legs). Extended: they precede the capped-primary PASS
  of their generation (R9.9).
- `:3242-3250` the R8.9 land order, including "3. 06-L02 R8/R9;". Now R9.12.
- `:3264` "the RD executed/skipped counts for RD1-RD12 and RD-cancel". Now RD1-RD13 (R9.12).
- `:3307` "`:686-687` "shutdown races produce `dedicated_database_session_lost`": R8.4 uses it;"
  Stands, and is now accurate through R9.7.

### R9.14 — Finding → disposition

Audit A = agent `aa8b3be89491d9f5c`; audit B = agent `a6533ed79680810a4`.

| Finding | Sev | Disposition |
|---|---|---|
| A-M1 no maintenance-statement seam for the 06-L02 pre-step; land order stale | MEDIUM | Fixed: `runDedicatedMaintenanceStatement`, builder third argument, F27, RD13 (R9.1); land order (R9.12) — D1 |
| A-M2 graceful race ignores a lowered deadline | MEDIUM | Fixed: clamped marker, skip rule, honest bound, F21c variant (R9.2) — D3 a |
| A-M3 post-grant gap in the close fence | MEDIUM | Fixed: synchronous re-check, F21a-1 (R9.3) — D3 b |
| A-L1 registry-at-construction has no open API; `:2244` not quoted | LOW | Fixed: `{ session, ready }`, F21a-2, `:2244` quoted (R9.4, R9.13) — D3 c |
| A-L2 awaited control release can hand out an ending client | LOW | Fixed: synchronous detach, F18 overlap (R9.5) — D3 d |
| A-L3 F21 row says "destroys live sessions" | LOW | Fixed (R9.6) — D3 e |
| A-L4 incomplete namespace collision list | LOW | Fixed: full list, `551034` reserved, 03-L02 told (R9.8, R9.11) — D3 g |
| B-M1 no VACUUM pre-step seam | MEDIUM | Fixed: same as A-M1 (R9.1) — D1 |
| B-M2 06-L03 scheduler-test handoff not executable | MEDIUM | Fixed: leg order, banner, clock capture, `:395-412` and `:900-945` dispositions (R9.9) — D3 h |
| B-M3 graceful race overruns the close bound | MEDIUM | Fixed: same as A-M2 (R9.2) — D3 a |
| B-L1 02-L01 note absent; fixtures not named | LOW | Handed: the note's content (R9.10); step 0 hold kept (R9.12) — D7, D3 i |
| B-L2 pending-open code contradicts `:686-687` | LOW | Fixed: `session_lost`, pinned in F21a-2 (R9.7) — D3 f |
| B-L3 R8.11 misses `:2244` and `:2430` | LOW | Fixed (R9.13) — D3 c, D3 e |
| B-I1 dedicated/control clients `console.log` server notices | INFO | Not dispositioned in D1-D9; no R9 contract change. Recorded for the orchestrator. |

## Dated Contract Corrections — 2026-09-26 (re-open R10: R9 audit closure; append-only)

Append-only. R10 closes the two fresh read-only R9 audits (audit A = agent `a5bc5987b5abf2b17`:
0 HIGH, 1 MEDIUM, 8 LOW, 2 INFO; audit B = agent `a8c8b9ae5db9039f0`: 0 HIGH, 3 MEDIUM, 8 LOW,
2 INFO) under Addendum D of the orchestrator dispositions of 2026-09-26
(`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`). This
section implements D-1, D-2, D-3, D-4 and D-8 (which includes B2). It does not re-decide them. R10
amends R9 (R9.1-R9.14) and, through R9, R8 and R7. Where R10 and R9 disagree, R10 wins; R9
otherwise stands. No earlier byte is edited.

- The Workflow Dispatch Envelope `json` fence is NOT edited. Every export added here lives in
  `core/db/client.ts`. Every new leg lives in `task551DedicatedSessionGuards.test.ts` or
  `task551DatabaseLifecycleRealDb.test.ts`, and the fence already lists both files.
- The R8.4 STOP rule covers every Guards leg and sub-leg added here. If they would push the Guards
  file past its 800-line cap, the implementer STOPS and reports. A new test path needs a fence
  edit plus the family preflight.
- Anchors were grounded on 2026-09-26 against `/home/coder/project/Coderso-551` at HEAD
  `420bb24a`. The worktree was dirty in sibling task files, 06-L02 source and tests, and TASK-551-11
  workflow files. `core/db/client.ts` (736 lines), `core/db/connectionTargets.ts`,
  `core/db/databaseConfig.ts` and `tests/integration/runtime/retentionScheduler.test.ts` (998 lines)
  were clean. postgres.js is 3.4.9. Line numbers are anchors, not contract.

### R10.1 — Driver facts relied on (postgres.js 3.4.9; grounding only)

- `end()` returns the existing `ending` promise when one is set (`src/index.js:365-367`).
  Otherwise, after `await 1`, it races a `destroy` timer of `timeout * 1000` ms against the
  graceful connection ends (`:369-377`).
- `destroy` terminates every connection and rejects every queued query with
  `CONNECTION_DESTROYED` (`src/index.js:384-388`). A connection's `terminate` errors its in-flight
  query with `CONNECTION_DESTROYED` (`src/connection.js:422-425`). A pending identity statement
  therefore REJECTS when a drain destroys an opening session; it does not hang.
- The `connection` option object is built as `application_name` default, then `...o.connection`,
  then every URL query key that is not a driver default (`src/index.js:484-488`). A URL query key
  therefore overrides a builder-supplied startup parameter of the same name.
- The StartupMessage sends `Object.assign({ user, database, client_encoding }, options.connection)`
  with falsy values filtered (`src/connection.js:996-1005`). `statement_timeout` given in
  `connection` is a startup parameter and outranks role and database defaults.
- Server fact (not driver): `current_setting('statement_timeout')` and `SHOW` render the value
  with units (`60000` ms displays as `1min`). `pg_settings.setting` returns the base-unit string
  (`"60000"`). R10.8 reads `pg_settings` for that reason.

### R10.2 — `55P03` is not a loss; SQLSTATE rethrow (D-1)

- The R7.3 not-loss list (`:2110`) becomes: not loss: `57014`, `25P02`, `40P01`, `55P03` and
  `23xxx`. The G4 predicate is unchanged (`55P03` was already outside it). This pins it. The F19
  row gains `55P03` among the codes that are not a loss.
- The seam rethrows `57014` and `55P03` unchanged: the same error object, with its string `code`
  property intact. The seam never wraps, renames or re-codes a non-loss server error. The session
  is not marked lost, so the `finally` drain then runs normally: the graceful path when R9.2's
  condition holds, else forced.
- D-1's closed mapping is NOT in this leaf. The lazy-deps module
  `core/services/maintenance/preRetentionVacuum.ts` (06-L03-owned, 06-L03 A8) maps every seam
  rejection into
  `{ kind: "unavailable" | "lost" | "bound_invalid" | "reserve_timeout" | "sqlstate" | "other", sqlstate?: "57014" | "55P03" }`,
  and it reads ONLY the string `code` property (never `message`, `detail` or `query`). R10
  guarantees that the property it reads survives the seam.
- F27 sub-leg `sqlstate` (Guards; fake factory and clock): the caller statement rejects a fake
  server error whose `code` is `"57014"`. The seam rejects with that same object (`toBe`), and the
  session is not lost. The fake client receives exactly one graceful `end({ timeout: 2 })` and no
  `end({ timeout: 0 })`. The slot is released and the registry is empty. The same leg is repeated
  with `code` `"55P03"`.

### R10.3 — Abort observed from entry (D-2)

R9.1's "Abort" rule (`:3509-3513`) is replaced. The seam observes `signal` from entry to
settlement.

- (a) Slot wait: `semaphore.acquire(POOL_ACQUISITION_DEADLINE_MS, signal)`. An abort while
  waiting removes the waiter from the queue and rejects `dedicated_database_session_lost`, with
  zero factory calls and no slot taken. The abort listener is removed on every settlement.
- (b) `ready` pending: once the session is a registry member, an abort runs
  `session.drainWithin("signal", clock.now() + DEDICATED_DRAIN_DEADLINE_MS)`. That is the local
  destroy of an opening session (R9.4, R10.4), settling `drain_unconfirmed` with zero control
  statements. `ready` rejects `dedicated_database_session_lost` through the R10.4 race.
- (c) After `ready`: an abort during `execute` keeps R7.4 (`execute` rejects `session_lost` at
  once and poisons the session). When `signal.aborted` holds at the `finally`, the drain skips the
  graceful step and runs forced only. The internal flag or parameter that carries this is the
  implementer's choice; the behaviour is binding.
- Bound: the seam settles within `DEDICATED_DRAIN_DEADLINE_MS` (4,500 ms =
  `RETENTION_CANCEL_DRAIN_DEADLINE_MS`, `databaseLifecycle.ts:30`) of the abort. Residual: a
  backend that the forced drain leaves unconfirmed is contained by `closeAll`, which drains every
  registry member, and by the server's `client_connection_check_interval` (R8.4).
- The signal listener is registered once (`{ once: true }`) and removed in the seam's `finally`.
  No listener outlives the call.

Seam pseudocode (replaces R9.1 `:3473-3492`; unchanged lines keep their R9 meaning):

```text
runDedicatedMaintenanceStatement({ signal, statementTimeoutMs, statement }):
  fence()                                            // R8.4 close fence FIRST: session_lost, zero calls, zero slots
  assertStatementBound(statementTimeoutMs)           // R10.5: safe integer in [1, 120_000], else bound_invalid
  if signal.aborted: throw dedicated_database_session_lost        // zero factory calls, zero slots
  target = resolveDedicatedSessionTarget()           // R7.2 matrix + R10.6 env map; unavailable, zero calls
  effectiveMs = clamp(statementTimeoutMs, effectiveDedicatedStatementBoundMs(), 120_000)
  slot = await semaphore.acquire(POOL_ACQUISITION_DEADLINE_MS, signal)
                                                     // entry: closeState check (R10.4); abort: waiter removed,
                                                     // session_lost (R10.3 a); deadline: database_pool_reserve_timeout
  if closeState !== "open": slot.release(); throw dedicated_database_session_lost   // R9.3
  { session, ready } = open(depsFor({ statementTimeoutMs: effectiveMs }), target)  // sync throw: slot.release(); unavailable
  registry.add(session)                              // same tick as the re-check (R9.3, R9.4)
  onAbort = () => session.drainWithin("signal", clock.now() + DEDICATED_DRAIN_DEADLINE_MS)
  signal.addEventListener("abort", onAbort, { once: true })       // R10.3 b
  try:
    await ready                                      // R10.4 race: unavailable, or session_lost after a drain
    return await session.execute(statement, signal)  // exactly ONE execute: autocommit, no begin, no set_config
  finally:
    signal.removeEventListener("abort", onAbort)
    try: await session.cancelActiveAndRollback("lease_release", { forcedOnly: signal.aborted })
                                                     // R7.4 drain; joins a running drain (R8.4); R10.3 c
    catch: contained
    registry.delete(session); slot.release()         // exactly once on every path
```

The `{ forcedOnly }` argument above is notation for R10.3 (c), not a mandated signature.

F27 sub-legs (Guards; fake clock; each asserts settlement at most 4,500 ms after the abort):

- `abort-slot-wait` (a): `maintenancePoolMax` blocked fake leases hold every slot. A seam call
  waits, and `dedicatedSessionSemaphoreStateForTests()` reports `waiters: 1`. Its signal is aborted
  at `t0`. It rejects `dedicated_database_session_lost` by `t0 + 4_500`, the factory call count
  does not grow, and the accessor reports `waiters: 0`. Releasing the blocked leases then restores
  `free` to `maintenancePoolMax`.
- `abort-ready-pending` (b): the fake identity statement stays pending until the fake client is
  ended, and then rejects `CONNECTION_DESTROYED` (R10.4 fake rule). The signal is aborted at `t0`.
  The seam rejects `dedicated_database_session_lost` by `t0 + 4_500`. The fake client is ended
  with `timeout: 0` exactly once, there are zero control factory calls, the caller statement is
  never issued, the slot is released and the registry is empty.

### R10.4 — `ready` vs drain, startup check, acquire entry check (D-3)

The R9.4 `ready` body (`:3627-3631`) is replaced:

```text
open(deps, target): { session, ready }                 // synchronous, as R9.4
  client = deps.createClient(target, hooks)            // a throw propagates synchronously as maintenance_session_unavailable
  session = <session over client>                      // "opening"
  destroyedByDrain = false
  drainedWhileOpening = <deferred>                     // a no-op catch is attached at creation (never unhandled)
  ready = (async () => {
    try:
      r = await race(deadline(<identity statement>, DEDICATED_OPEN_DEADLINE_MS), drainedWhileOpening)
    catch e:
      if destroyedByDrain: throw dedicated_database_session_lost        // R9.7, D3 f
      destroy(); throw maintenance_session_unavailable                  // open error or deadline
    finally:
      clear the open-deadline timer                                     // on every settlement
    if destroyedByDrain: throw dedicated_database_session_lost          // a drain that landed after the identity settled
    if (!r[0] || r.state.pid !== r[0].pid): destroy(); throw maintenance_session_unavailable
    id = { pid: r[0].pid, started: r[0].started }      // "open"
  })()
  return { session, ready }

drainWithin(reason, deadlineAt) on an "opening" session:
  destroyedByDrain = true                              // set BEFORE the local destroy
  end({ timeout: 0 })                                  // local destroy; no control statement (no pid/backend_start)
  reject drainedWhileOpening                           // right after the local destroy
  settle drain_unconfirmed
```

- `destroyedByDrain` wins on the success, error and deadline paths, so a drain always yields
  `session_lost` and never `unavailable`. Every other open failure keeps
  `database_maintenance_session_unavailable` (R9.7).
- Guards fake rule: the fake client rejects every pending query with an error whose `code` is
  `CONNECTION_DESTROYED` when it receives `end({ timeout: 0 })`, as postgres.js does (R10.1). This
  replaces "the fake identity statement never settles" as the default Guards behaviour for
  opening-session legs.
- F21a-2 is re-pinned: the fake identity statement is pending, and `closeAll(1_000)` runs. The
  lease rejects `dedicated_database_session_lost` BEFORE the fake clock reaches `closeDeadlineAt`,
  with zero factory re-calls and zero control factory calls. The fake client is ended with
  `timeout: 0` exactly once, `run` is never invoked, the slot is released, the registry is empty,
  and `closeAll` resolves by `closeDeadlineAt`. A variant whose fake identity instead never
  settles (no rejection on `end`) proves the same outcome through `drainedWhileOpening` alone.
- Startup check: `assertMaintenanceSessionAffinity()` uses the lease sequence: `fence()`, R7.2
  matrix, `semaphore.acquire` (with its entry check), the R9.3 post-grant re-check, `open` →
  `{ session, ready }`, same-tick `registry.add`, `await ready`, then in `finally` the graceful
  drain and `registry.delete` plus `slot.release`. Success is still cached per lifecycle
  generation, and failures are never cached. `:2271-2272` is extended accordingly (R10.14).
- `semaphore.acquire` checks `closeState` synchronously on entry. When it is not `"open"` it
  rejects `dedicated_database_session_lost` without enqueuing. A caller that passed `fence()`
  before `closeAll` and then resumed from `await assertMaintenanceSessionAffinity()` after
  `closeAll`'s synchronous prefix therefore gets `session_lost`, never
  `database_pool_reserve_timeout`, and can never be granted after a test re-arm.
- R9.3's "exactly one of" is extended to four cases: a caller that enters `acquire` after the
  prefix (rejected on entry), a waiter (rejected in step 1), a registry member (drained in step
  2), or a granted continuation that fails the re-check.
- Test re-arm (R8.4): every `setDatabaseClientRuntimeForTests(...)` call first asserts that the
  registry is empty AND the semaphore has zero waiters (else it throws
  `dedicated_database_session_lost`). It then rebuilds the semaphore for the new
  `maintenancePoolMax`. The rest of R8.4's re-arm rule stands.
- New test-only export from `core/db/client.ts`:
  `export function dedicatedSessionSemaphoreStateForTests(): Readonly<{ free: number; waiters: number }>`.
  It reads the current semaphore and changes nothing. Because re-arm rebuilds the semaphore, every
  leak assertion reads it BEFORE any re-arm.
- F21a-1 (R9.3) now reads `dedicatedSessionSemaphoreStateForTests()` right after `closeAll`
  resolves and before any re-arm: `{ free: maintenancePoolMax, waiters: 0 }`.
- F21a-3 (Guards; new): the startup proof is cached for the current generation, and
  `maintenancePoolMax` blocked fake leases hold every slot, with their fake `end` held on a
  deferred so that their drains stay pending. A new lease call is started, and in the same
  synchronous tick `closeAll(1_000)` runs. The lease resumes from `await
  assertMaintenanceSessionAffinity()` after the prefix and rejects `dedicated_database_session_lost`
  at `acquire` entry while those drains are still pending (without the entry check it would sit
  as a waiter). `dedicatedSessionSemaphoreStateForTests().waiters` is `0` at that point, the
  factory call count does not grow, and resolving the deferred lets `closeAll` settle.

### R10.5 — Statement bound rule, builder = seam (D-4)

- One rule, shared by `createDedicatedClientOptions` (third argument) and
  `runDedicatedMaintenanceStatement`: `statementTimeoutMs` must be a safe integer in
  `[1, 120_000]`. Otherwise each throws `database_maintenance_statement_bound_invalid`: zero clients
  from the builder, and zero factory calls and zero slots from the seam. A value in
  `[1, config.statementTimeoutMs)` is then raised to the L01 bound, and the result is the startup
  `statement_timeout`. One private helper serves both call sites, so the rule cannot diverge.
- F27 builder pins gain `0` and `120_001` (both throw `database_maintenance_statement_bound_invalid`
  from the builder), next to the existing `1.5`. The existing `5_000` → 15,000 and `120_000` →
  120,000 pins stand. The seam pins at `:3548` stand.
- The Clamp lower edge rule's parenthetical is replaced. The rule now reads: "A value below
  `config.statementTimeoutMs` is raised to it; the seam never sets a server bound below L01's. A
  caller that must stop earlier aborts through `signal`. 06-L02 never calls the seam below the
  floor: it reads the floor from `effectiveDedicatedStatementBoundMs()` and records
  `budget_exhausted` instead (D-4)."
- New export (a D1 addition), `core/db/client.ts`:
  `export function effectiveDedicatedStatementBoundMs(): number`. It returns the
  `statementTimeoutMs` of the active configuration: the override's `config` while a
  `setDatabaseClientRuntimeForTests` override is installed, else the parsed 02-L01 configuration.
  It is the single source of the floor for consumers. It issues no SQL and constructs no client.
  F27 pins it both under an override with `statementTimeoutMs: 15_000` and after clearing.
- The 120,000 ceiling stays the `DB_STATEMENT_TIMEOUT_MS` parser ceiling (`databaseConfig.ts:293-299`).
  R10 adds no export for it.
- Statement adapter (D-4, consumer side, recorded here): the pre-step passes
  `(sql) => sql.unsafe(renderedText)` for its VACUUM and its two catalog reads, with bytes
  unchanged. `unsafe` is on the R8.2 scoped-handle allowlist, so the adapter needs no change in
  this leaf. Those call sites belong to their owners and join the 01-L01 inventory rebase kit
  through them.

### R10.6 — Test override `databaseDirectUrl?` (D-8)

- `DatabaseClientRuntimeOverrideForTests` gains `databaseDirectUrl?: string`. While any override is
  installed, the env map handed to the resolver takes `DATABASE_DIRECT_URL` from that field. When
  the field is absent, the key is DELETED from the map. It is not inherited from `process.env`.
  Clearing the override restores the ambient env. This extends the R7.2 overlay (`:2032-2033`).
- Reason: `resolveSessionDatabaseTarget` takes `DATABASE_DIRECT_URL` first
  (`connectionTargets.ts:338-362`). The 01-L01 lane-runner and closed-form runs set it, so an
  override-based leg must not depend on the ambient value.
- The F27 pooled leg is pinned twice, each with zero factory calls and
  `database_maintenance_session_unavailable`: (1) `direct` mode with a pooled `maintenanceUrl`;
  (2) `off + primary` with a pooled `databaseUrl` while an ambient `DATABASE_DIRECT_URL` is set in
  `process.env` for the leg (a placeholder, restored in `finally`). The `transaction + primary`
  and `session` legs of `:3546` stand. Any F23 pooled-URL leg follows the same override rule.
- R9.9's `cappedPrimary` capped-primary PASS leg is independent of the ambient env: its override
  sets no `databaseDirectUrl`, so the key is deleted and the fake factory receives the override's
  `databaseUrl` placeholder.

### R10.7 — URL-query guard in both builders (D-8)

- `createDedicatedClientOptions` and `createControlClientOptions` throw
  `database_maintenance_session_unavailable` (zero clients) when the target URL's query contains
  any of `statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout`,
  `application_name`, `client_connection_check_interval` or `options`. The check runs after the
  existing empty-URL check and before any option is built.
- Key names are compared case-insensitively, because the server treats parameter names
  case-insensitively and the driver forwards the key as written (R10.1). A URL whose query cannot
  be parsed rejects the same way. The thrown error carries only the bounded code, never the URL or
  the key's value (R7.6).
- Without this guard, R9.1's "overrides ONLY the `connection.statement_timeout` startup parameter"
  would not hold: a `statement_timeout=0` query key would leave the VACUUM unbounded server-side.
- F25 pins: for each builder and each of the six keys (one of them in mixed case), the builder
  throws the unavailable code. A URL whose query holds only `sslmode=require` builds normally.
- F27 pin: a fake factory that calls the real `createDedicatedClientOptions(target, hooks, statementOptions)`
  before constructing its fake client, with a target URL carrying `statement_timeout=0`. The seam
  rejects `database_maintenance_session_unavailable`, zero fake clients are constructed, the slot
  is released and the registry is empty.

### R10.8 — RD13 rewrite (D-8)

RD13 (R9.1 `:3550-3564`) now reads:

- The leg-owned table `t551rd_vac_<run>` is created by the observer and dropped in `finally`, as
  in R9.1.
- R8.7 guard: `client_min_messages` cannot be read on the VACUUM's own client, which runs exactly
  one `execute` and is then discarded. The guard therefore runs as a separate seam call on the
  same target and role immediately before the VACUUM:
  ``runDedicatedMaintenanceStatement({ signal, statementTimeoutMs: 60_000, statement: (sql) => sql`select current_setting('client_min_messages') as level` })``,
  whose `level` must be `notice`, `log` or `debug*`. This is valid because the value comes from the
  same server, role and database defaults, and the builder sets no `client_min_messages` (R8.7).
- The VACUUM call and its `vacuum_count >= 1` observation stand (R9.1). The recorder holds zero
  WARNINGs.
- Two further seam calls, each with `statementTimeoutMs: 60_000`, run
  `select pg_backend_pid() as pid, (select backend_start::text from pg_stat_activity where pid = pg_backend_pid()) as started, (select setting from pg_settings where name = 'statement_timeout') as setting`.
  Both return `setting === "60000"`, and their `(pid, started)` pairs differ.
- A following `withDedicatedDatabaseSession` `execute` of the same select returns
  `setting === String(<the run's L01 statement bound>)`. The observer's own session is unchanged,
  so the startup value never leaked to another session.
- RD11 residue covers the leg: zero backends with the run's maintenance name.

### R10.9 — R9.8 namespace list (D-8)

- The word "complete" is dropped. The list is: `20260604`, `20260628`, `20260818`, `547`, `548`, the
  test-lane writer-fence range `548`-`1548` (`548` plus `BUN_TEST_FENCE_NAMESPACE_OFFSET` in
  `1..1000`, `core/db/nativeCmsWriterFence.ts:94-97`), `551063`, `551001`-`551005` and
  `551031`-`551033`. `551034` stays reserved (R9.8).
- Single-bigint note: single-key advisory locks (`pg_advisory_xact_lock(hashtext(...))` and
  similar) appear in `pg_locks` with `objsubid = 1`. The two-int4 namespaces, including the RD
  identity `551034`, appear with `objsubid = 2`. The two key spaces never collide, so the RD
  collision assertion compares only two-int4 namespaces.

### R10.10 — R9.9 amendments (D-8)

- Option 3 (keep the capped-primary PASS first and call `resetMaintenanceSessionAffinityForTests()`
  right after it) is valid only when each later rejection leg asserts a recorder LENGTH DELTA of
  zero (no new entry) or runs inside its own `withTimers`. Its scheduled timer is already in the
  shared recorder, so an absolute `toHaveLength(0)` would fail. R9.9's "the `toHaveLength(0|1)`
  timer counts stay valid" holds unconditionally for options 1 and 2 only.
- `:900-945` fake rows follow the current `OWNER_LOCK` responder (`retentionScheduler.test.ts:239-240`):
  the `pg_try_advisory_lock` statement returns one row with `acquired: true`, and every other
  statement returns one row. The pid in those rows is the identity pid. The `state.pid` and
  `command` tag rules of R9.9 stand.
- Landing rule: `retentionScheduler.test.ts` is at 998 lines at HEAD. The R9.9 re-baselines land
  together with, or after, the 06-L03 A1-b split. The same step checks that the file is at or under
  1,000 lines. They never land on the unsplit file.
- The capped-primary PASS leg's env independence is R10.6.

### R10.11 — R9.10 correction (D-8, B2)

- R9.10's "today's primary-mode minimum is `7`" becomes "today's primary-mode minimum is `10`
  (parser floor, `databaseConfig.ts:275-281`; arithmetic minimum 7)".
- R9.10's re-baseline anchor list is "at least these; the authoritative table is 02-L01 S5"
  (02-L01 `### S5`, `:553`).

### R10.12 — Handoffs, restated (replaces R9.11's 06-L02 and 06-L03 bullets; this leaf edits none of these files)

- **TASK-551-06-L02 R14** (D-1, D-2, D-4, D-5):
  - The pre-step calls only `runDedicatedMaintenanceStatement`, and maps
    `database_maintenance_session_unavailable` to its skip code.
    `database_maintenance_statement_bound_invalid` is never a skip.
  - The exact bound rule (R10.5): a safe integer is required; values `< 1` or `> 120_000` reject
    `database_maintenance_statement_bound_invalid`; values in `[1, config.statementTimeoutMs)` are
    raised to the L01 bound. The pre-step passes integers and reads the floor from
    `effectiveDedicatedStatementBoundMs()`; below the floor it records `budget_exhausted` and does
    not call.
  - Abort bound: the seam settles within `DEDICATED_DRAIN_DEADLINE_MS` of the abort from any point
    (R10.3), with `closeAll` containment as the residual.
  - `57014` and `55P03` are rethrown unchanged (R10.2). The closed mapping lives in 06-L03 A8
    (D-1).
  - Statement adapter `(sql) => sql.unsafe(renderedText)` (R10.5).
  - R14 records the R9.1 anchors `:3406-3564` together with the R10 sections.
- **TASK-551-06-L03 A8 (2026-09-26)**:
  - The seam is the only VACUUM path, and `query.cancel()` is never relied on (D2).
  - R9.9 as amended by R10.10.
  - The D-1 mapping module reads only the string `code` (R10.2).
  - The exact bound rule, restated verbatim from the 06-L02 bullet above.
  - A3 is restated as the R10.13 steps (the R9.12 steps as extended), citing the R7.11 re-point
    and the R8.9 flips. The pre-step modules land only after the F27/RD13 receipts.
- **TASK-551-03-L02**: unchanged from R9.11 (`551034` reserved; the series continues at `551035`
  or later).
- **TASK-551-01-L01**: R10 adds no SQL site in this leaf. `effectiveDedicatedStatementBoundMs()`
  and `dedicatedSessionSemaphoreStateForTests()` issue no SQL. The R9.11 inventory-delta entry
  stands. The consumers' `sql.unsafe` adapter sites join the rebase kit through their owners (D-4).
- **TASK-551-02-L01**: its C5 note re-points to R9.12 (`:3799-3807`). R10.13 keeps that numbering
  and only extends steps 1, 3 and 4, so the re-point stays valid.

### R10.13 — Land order (extends R9.12)

0. the 02-L01 dated note (docs, R9.10 / D7, as corrected by R10.11), before any 02-L02 R7-R10 code
   dispatch;
1. 02-L02 R7 + R8 + R9 code, including the R9.1 seam, as amended by R10 (R10 amends that same
   code and lands with it);
2. the 02-L01 source change (default 3, `2..6`, fleet formula, ceiling comment; Addendum A3);
3. 06-L02 R8-R14;
4. 06-L03 R1 + A8 (with the R7.11 re-point, the R8.9 flips and R9.9 as amended by R10.10); the
   pre-step modules after the F27/RD13 receipts;
5. the combined gates;
6. at least two post-auditors per scope.

- The R8.6 owner-map run executes RD1-RD13, with RD13 as rewritten in R10.8, and RD-cancel. The
  R8.10 receipt records that R9 and R10 are part of the validated contract. The R8.6 gate command
  is unchanged.
- The R8.8 table gains the F27 sub-legs `sqlstate`, `abort-slot-wait` and `abort-ready-pending`,
  the F27 builder `0`/`120_001` pins, the `effectiveDedicatedStatementBoundMs` pin, the two pooled
  legs and the URL-query pin, the F25 URL-query pins, the re-pinned F21a-1 and F21a-2 (plus the
  never-settles variant), and F21a-3.

### R10.14 — Superseded sentences (quoted; line = current anchor)

R7:

- `:2032-2033` "Test URL placeholders from `setDatabaseClientRuntimeForTests` (`databaseUrl`, `maintenanceUrl`)
  overlay `DATABASE_URL`/`DB_MAINTENANCE_URL` in the env map handed to the resolver." Extended:
  `databaseDirectUrl` sets or deletes `DATABASE_DIRECT_URL` (R10.6).
- `:2110` "not loss: `57014`, `25P02`, `40P01` and `23xxx`." Extended: `55P03` (R10.2).
- `:2271-2272` "It then opens one dedicated session through the semaphore; the open includes the
  key/pid direct proof. It closes it gracefully and caches success per lifecycle generation."
  Extended: the lease sequence of R10.4.
- `:2428` (F19 row) "Every G4 loss code is a loss; `57014`, `25P02`, `40P01` and `23505` are not."
  Extended: `55P03` is not a loss either (R10.2).

R8:

- `:2967-2968` "It first asserts that the registry is empty (else it throws
  `dedicated_database_session_lost`)." Extended: it also asserts zero semaphore waiters and then
  rebuilds the semaphore for the new `maintenancePoolMax` (R10.4).
- `:3258-3262` "Destroy timing (A-I2): after a lost graceful race, `end({ timeout: 0 })` returns the
  existing `ending` promise (`src/index.js:366-367`). The real destroy happens at the driver's own
  2 s timer, about 100 ms later. `DEDICATED_TERMINATE_AFTER_MS` is measured from the `destroy()`
  call, so the terminate may come up to about 100 ms early. That is the safe direction; it is
  matched by pid + `backend_start`." Extended: after a race that a lowered deadline ended early
  (R9.2), the gap between `destroy()` and the driver's real destroy is up to
  `DEDICATED_GRACEFUL_END_TIMEOUT_S`, so the terminate may come up to that much early. The
  terminate stays matched on pid + `backend_start`, which keeps it safe.

R9:

- `:3417-3421` "`export function createDedicatedClientOptions(` / `target: DedicatedSessionTarget,` /
  `hooks: DedicatedClientHooks,` / `statementOptions?: DedicatedClientStatementOptions` /
  `): postgres.Options<Record<string, postgres.PostgresType>>;`". The signature stands. Extended: the builder also throws per R10.5 (bound) and R10.7
  (URL query).
- `:3439-3442` "Present: `statementTimeoutMs` must be a safe integer, otherwise the builder throws
  `database_maintenance_statement_bound_invalid` with zero clients. The value is clamped to
  `[config.statementTimeoutMs, 120_000]`". Now R10.5: a safe integer in `[1, 120_000]`, else it
  throws; then clamped.
- `:3442-3445` "and overrides ONLY the `connection.statement_timeout` startup parameter.
  `lock_timeout` and `idle_in_transaction_session_timeout` keep the 02-L01 values". Stands, and is
  made true by the R10.7 URL-query guard.
- `:3473-3492` the R9.1 seam pseudocode, including
  "`slot = await semaphore.acquire(POOL_ACQUISITION_DEADLINE_MS)  // else database_pool_reserve_timeout`"
  and "`try: await session.cancelActiveAndRollback("lease_release") // the R7.4 drain; joins a running drain (R8.4)`".
  Now the R10.3 pseudocode.
- `:3506-3508` "A server `57014` normally arrives first and is rethrown unchanged (not a loss, R7.3
  classifier); the drain then takes the graceful path (subject to R9.2)." Extended: `55P03` is
  rethrown the same way (R10.2), and when `signal.aborted` holds the drain is forced only
  (R10.3 c).
- `:3509-3513` "Abort: `execute` rejects `session_lost` at once and poisons the session (R7.4 local
  destroy). The `finally` runs the R7.4 forced drain (control `pg_cancel_backend(pid)` matched on
  pid + `backend_start`, terminate as the last resort, bounded by `DEDICATED_DRAIN_DEADLINE_MS` =
  `RETENTION_CANCEL_DRAIN_DEADLINE_MS`), then releases the slot. The seam's promise rejects
  `dedicated_database_session_lost` only after that drain settles." Now R10.3 (a)-(c). The
  during-`execute` case keeps this text.
- `:3514-3515` "Shutdown: the session is a registry member from construction, so `closeAll` drains
  it (idle → graceful per R9.2, busy → forced) and the pending `execute` rejects `session_lost`."
  Extended: a pending `ready` rejects `session_lost` too (R10.4).
- `:3517-3518` "A caller that must stop earlier aborts through `signal` (the 06-L02 D4 run budget
  does)." Now R10.5 (06-L02 never calls below the floor, reads it from
  `effectiveDedicatedStatementBoundMs()`, and records `budget_exhausted`).
- `:3522-3524` "and non-loss server errors rethrown unchanged (R7.3)." Extended: the same error
  object with its `code` intact, `57014` and `55P03` named (R10.2).
- `:3535-3536` "`1.5` → throws `database_maintenance_statement_bound_invalid`;". Extended: `0` and
  `120_001` builder throws (R10.5).
- `:3546` "`transaction + primary`, `session` and a pooled URL → `database_maintenance_session_unavailable`
  with zero factory calls;". Now: the pooled URL case is the two legs of R10.6; the rest stands.
- `:3556-3557` "The recorder holds zero WARNINGs (R8.7 guard applies)." Now R10.8 (guard as a
  separate seam call before the VACUUM).
- `:3558-3560` "A second seam call with `statementTimeoutMs: 60_000` runs `select pg_backend_pid()
  as pid, setting from pg_settings where name = 'statement_timeout'` and returns `"60000"` on a pid
  different from the first call's backend." Now R10.8 (two calls, differing `(pid, started)`).
- `:3604-3608` "Every semaphore acquisition (the lease in `withDedicatedDatabaseSession`, and through
  it `withDedicatedDatabaseAdvisoryLock`; the startup check; the R9.1 seam) re-checks the fence
  synchronously after `semaphore.acquire` resolves and before `createClient`". Stands. Extended:
  `acquire` also checks `closeState` on entry (R10.4).
- `:3609-3611` "`closeAll`'s synchronous prefix therefore meets each acquisition as exactly one of:
  a waiter (rejected in step 1), a registry member (drained in step 2), or a granted continuation
  that fails the re-check." Now the four cases of R10.4.
- `:3614-3616` "the semaphore's free count equals `maintenancePoolMax` again, and `closeAll` resolves
  with an empty registry." Extended: observed through `dedicatedSessionSemaphoreStateForTests()`
  before any re-arm (R10.4).
- `:3620` "The R7.3 open (`:2085-2093`) and the R7.5 lease line `:2244` are replaced:". Extended:
  the startup check (`:2271-2272`) follows the same sequence (R10.4).
- `:3627-3631` "`r = await deadline(<identity statement>, DEDICATED_OPEN_DEADLINE_MS)   // includes the cold connect`
  / `if <a drain destroyed the session while pending>: throw dedicated_database_session_lost   // R9.7`
  / … / `any other open error or deadline: destroy(); throw maintenance_session_unavailable`". Now
  the R10.4 race.
- `:3639` "`slot = await semaphore.acquire(POOL_ACQUISITION_DEADLINE_MS)`" (inside the `:3636-3642`
  lease pseudocode). Stands.
  Extended: `semaphore.acquire` has the R10.4 entry check.
- `:3654-3657` "`drainWithin` on an opening session destroys it locally (`end({ timeout: 0 })`),
  issues no control statement (there is no pid/`backend_start` to match) and settles
  `drain_unconfirmed`." Stands. Extended: it first sets `destroyedByDrain` and then rejects
  `drainedWhileOpening` (R10.4).
- `:3660-3664` "F21a-2 (Guards; also pins R9.7): the fake identity statement never settles;
  `closeAll(1_000)` runs." Now the re-pinned F21a-2 of R10.4 (fake rejects on `end`, `session_lost`
  before `closeDeadlineAt`; the never-settles form is a variant).
- `:3700-3701` "A pending open that a shutdown drain interrupts rejects
  `dedicated_database_session_lost` (R9.4)." Stands, and is realized by R10.4 (R9.4 alone could not
  reach it).
- `:3711-3712` "The RD collision assertion (R8.6 "asserted to differ from every landed namespace
  (R7.8 list)") uses the complete list:". Now R10.9 ("complete" dropped, list extended).
- `:3724-3725` "The R8.9 re-baselines stand except where amended below (HEAD anchors; the 06-L03 A1
  split may move them)." Extended: the R10.10 landing rule.
- `:3729-3733` "The capped-primary PASS leg therefore runs AFTER the rejection legs
  (transaction-primary, outage, key/pid mismatch), OR in its own test (the per-test `beforeEach`
  `closeAll` bumps the generation), OR calls `resetMaintenanceSessionAffinityForTests()` right
  after it." Extended: the third option needs the R10.10 delta or own-`withTimers` form.
- `:3742-3744` "so the index-based `fireTurn(recorder, 0)` (`:666`) and the `toHaveLength(0|1)` timer
  counts stay valid." Extended: unconditionally for options 1 and 2 only (R10.10).
- `:3750-3752` "`:900-945` (default job binding): `pool()` is replaced by a fake
  `dedicatedClientFactory` whose identity result carries `state.pid === <identity pid>` and
  `{ pid, started }`;". Extended: row contents follow `OWNER_LOCK` (R10.10); the rest of
  `:3750-3756` stands.
- `:3757-3758` "`:614-619` capped-primary PASS (R8.9) keeps exactly one factory call, one scheduled
  timer and `controller.stop()` in `finally`, now at the position above." Stands. Extended: it is
  independent of the ambient env (R10.6).
- `:3772-3773` "The forced fixture re-baselines in `tests/vitest/db/databaseConfig.test.ts`: `:48`,
  `:203-207`, `:580-601`, `:614-619`, `:656-663`, and the comments at `:684`, `:690`, `:715`,
  `:727`." Extended: "at least these; the authoritative table is 02-L01 S5" (R10.11).
- `:3777` "today's primary-mode minimum is `7`." Now `10` (parser floor; arithmetic 7) (R10.11,
  B2).
- `:3786-3789` "**TASK-551-06-L02 R13** (D1, D2, D4): the pre-step calls only
  `runDedicatedMaintenanceStatement` and maps `database_maintenance_session_unavailable` to its skip
  code; `database_maintenance_statement_bound_invalid` is never a skip. Its channel, target, abort
  and budget text are 06-L02's own (D2, D4)." Now the R10.12 06-L02 R14 bullet.
- `:3790-3791` "**TASK-551-06-L03**: R9.9, plus the seam as the only VACUUM path; `query.cancel()`
  is never relied on (D2)." Now the R10.12 06-L03 A8 bullet.
- `:3802` "1. 02-L02 R7 + R8 + R9 code, including the R9.1 seam (it lands WITH this code);",
  `:3804` "3. 06-L02 R8-R13;" and `:3805` "4. 06-L03 R1 (with the R7.11 re-point, the R8.9 flips
  and R9.9);". Now R10.13 steps 1, 3 and 4. Steps 0, 2, 5 and 6 stand.
- `:3809-3811` "The R8.6 owner-map run executes RD1-RD13 and RD-cancel; the R8.10 receipt records
  the executed/skipped counts for RD1-RD13 and RD-cancel and that R9 is part of the validated
  contract." Extended: RD13 as rewritten, and R10 recorded too (R10.13).

### R10.15 — Finding → disposition

Audit A = agent `a5bc5987b5abf2b17`; audit B = agent `a8c8b9ae5db9039f0`.

| Finding | Sev | Disposition |
|---|---|---|
| A-M1 `ready`'s drain check unreachable (the driver rejects the pending identity); F21a-2 not executable | MEDIUM | Fixed: `race` with `drainedWhileOpening`, `destroyedByDrain`, timer cleared, Guards fake rejects on `end`, F21a-2 re-pinned (R10.4) — D-3 |
| A-L1 RD13 pid comparison has no first pid | LOW | Fixed: two select calls with differing `(pid, started)` (R10.8) — D-8 |
| A-L2 R8.7 guard cannot run on the seam's session | LOW | Fixed: separate seam call immediately before the VACUUM (R10.8) — D-8 |
| A-L3 startup check not restated in the `{ session, ready }` shape | LOW | Fixed: lease sequence, `:2271-2272` quoted (R10.4, R10.14) — D-3 |
| A-L4 R9.10 minimum `7`; re-baseline list partial | LOW | Fixed: `10` (parser floor; arithmetic 7); "at least these; 02-L01 S5" (R10.11) — D-8, B2 |
| A-L5 R9.8 "complete" list misses the fence range and single-bigint keys | LOW | Fixed: 548-1548 added, objsubid note, "complete" dropped (R10.9) — D-8 |
| A-L6 06-L03 A3 land order stale | LOW | Handed: 06-L03 A8 restates A3 as the R10.13 steps (R10.12) — D-8, D-9 |
| A-L7 06-L02 clamp rule stated inexactly | LOW | Fixed: exact rule in R10.5 and in both handoff bullets (R10.12) — D-4, D-8 |
| A-L8 `retentionScheduler.test.ts` at 998 lines | LOW | Fixed: landing rule tied to the A1-b split plus the ≤ 1,000 check (R10.10) — D-8 |
| A-I1 driver facts; URL query overrides startup parameters | INFO | Recorded (R10.1); guard added (R10.7) — D-8 |
| A-I2 06-L03 "A4" id ambiguous | INFO | Orchestrator: relabelled A8 (Addendum C2, D-9); R10 cites "06-L03 A8" |
| B-M1 `ready`'s drain check unreachable | MEDIUM | Fixed: same as A-M1 (R10.4) — D-3 |
| B-M2 abort not observed during slot wait and pending open | MEDIUM | Fixed: abort from entry (a)-(c), F27 `abort-slot-wait` and `abort-ready-pending` (R10.3) — D-2 |
| B-M3 ambient `DATABASE_DIRECT_URL` leaks into override legs | MEDIUM | Fixed: `databaseDirectUrl?` set-or-delete, two pooled F27 legs, `cappedPrimary` independence (R10.6) — D-8 |
| B-L1 builder silently clamps `0`/`-1`/`120_001` | LOW | Fixed: one rule for builder and seam, F27 `0`/`120_001` builder throws, `effectiveDedicatedStatementBoundMs()` (R10.5) — D-4 |
| B-L2 RD13 pid comparison has no first pid; pid reuse | LOW | Fixed: same as A-L1 (R10.8) — D-8 |
| B-L3 no semaphore-state accessor; re-arm may hide a leak | LOW | Fixed: `dedicatedSessionSemaphoreStateForTests()`, read before re-arm; re-arm rebuilds (R10.4) — D-3 |
| B-L4 caller resumed after `closeAll`'s prefix enqueues as a new waiter | LOW | Fixed: `acquire` entry check, zero-waiter re-arm, F21a-3 (R10.4) — D-3 |
| B-L5 R9.9 option 3 breaks absolute timer counts | LOW | Fixed: length delta or own `withTimers` (R10.10) — D-8 |
| B-L6 R9.10 minimum `7` | LOW | Fixed: same as A-L4 (R10.11) — D-8, B2 |
| B-L7 URL query keys override startup parameters | LOW | Fixed: URL-query guard in both builders, F25/F27 pins (R10.7) — D-8 |
| B-L8 R8.10 destroy-timing note stale under R9.2 | LOW | Fixed: `:3258-3262` extended (R10.14) — D-8 |
| B-I1 06-L03 "A4" id ambiguous | INFO | Orchestrator: same as A-I2 (Addendum C2, D-9) |
| B-I2 `:900-945` fake rows unspecified | INFO | Fixed: rows follow `OWNER_LOCK` (R10.10) — D-8 |

## Dated Contract Corrections — 2026-09-27 (re-open R11: R10 audit closure, lane-worker schema binding, abort-after-grant; append-only)

Append-only. R11 closes the R10 conformity audit — r10a, agent `a59fe5fe4ff107ac0` (journal
`wf_14885132-56b`): 0 HIGH, 2 MEDIUM, 1 LOW, 2 INFO; r10b never returned (Addendum G1: not re-run;
the audit pair over the R11/R15/A8-k output covers the adversarial lens) — and implements Addendum
F9 in full plus H1 (the restated E1 (a)). Decisions live in
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md` (F1-F9, H1,
D-1-9, E1-E2, G1 as cited); R11 does not re-decide them. R11 amends R10 (R10.1-R10.15) and, through
R10, R9, R8 and R7. Where R11 and R10 disagree, R11 wins; R10 otherwise stands. No earlier byte is
edited.

- The Guards split fence edit IS made in this round, pre-authorized by F9 (b): inside the `json`
  fence only, the `allowlist` gains `tests/integration/server/task551DedicatedMaintenanceSeam.test.ts`
  (19 entries, no duplicates), the `database-lifecycle-test` command's `argv` and
  `positiveDiscovery.paths` gain it, and `minimum` is `3` → `4`. Every other key is byte-identical;
  `python3 json.loads` validates; the family preflight literal
  (TASK-551-11 `:1173`, last argument `git rev-parse HEAD`) prints exactly
  `{"taskFileCount":41,"childTaskCount":11,"leafTaskCount":29,"occurrenceCount":33}` at HEAD
  `9d27d93d` — no new occurrence.
- Line shift: the fence edit inserts one line at `:813` (working tree). Every anchor at or after
  HEAD `:813` that an earlier section quotes reads +1 in the working tree (e.g. R10.14's
  `:3417-3811` quotes read `:3418-3812`); anchors at or before HEAD `:812` are unchanged. The R11
  quotes below use working-tree lines.
- Anchors were grounded on 2026-09-27 against `/home/coder/project/Coderso-551` at HEAD
  `9d27d93d`. The worktree was dirty in sibling task files (one writer per file), the untracked
  11-reopen evidence and the orchestrator audit records. `scripts/bun-lane-worker-url.ts` (173
  lines) was clean. `.env` facts are count-only (H1). Line numbers are anchors, not contract.

### R11.1 — Abort after the grant (F9 (a), D-2; closes r10a-M1)

- Finding (r10a-M1, verified): in the R10.3 pseudocode an abort that fires after
  `semaphore.acquire` grants the slot but before `onAbort` is registered is observed by nobody —
  the acquire's own abort listener is gone once the grant settles, and `addEventListener` on an
  already-aborted signal never fires. The seam then constructs the client and awaits `ready`
  unwatched, for up to `DEDICATED_OPEN_DEADLINE_MS`, and the later forced-only drain adds up to
  `DEDICATED_DRAIN_DEADLINE_MS` — about 8,500 ms, breaking the binding "settles within
  `DEDICATED_DRAIN_DEADLINE_MS` of the abort from any point" (R10.3; restated for 06-L02 in
  R10.12). Simplest trigger: a free slot with the caller aborting in the same synchronous tick
  (the F21a-1 pattern).
- Rule: the seam re-checks the signal synchronously after the R9.3 re-check and before `open`:
  `if signal.aborted: slot.release(); throw dedicated_database_session_lost` — zero factory calls,
  zero statements, no registry entry. Position is pinned by F9; the rejected alternative (an
  `if signal.aborted: onAbort()` after `addEventListener`) is unnecessary, because between the new
  check and `addEventListener` the seam runs only synchronous code (`open`, `registry.add`), so
  `signal.aborted` cannot flip there; any abort after the listener is registered fires `onAbort`.
- `onAbort` requests a forced-only drain on every path (F9):
  `onAbort = () => session.drainWithin("signal", clock.now() + DEDICATED_DRAIN_DEADLINE_MS,
  { forcedOnly: true })`. The `{ forcedOnly }` argument stays notation (R10.3); the behaviour is
  binding: an abort observed while `ready` is pending, between `ready` and `execute`, or during
  `execute` never takes the graceful step. D-2 (c) therefore holds from `ready` through
  settlement, not only at the `finally` (which keeps `forcedOnly: signal.aborted`).
- Bound: the abort-after-grant rejection settles in the grant's microtask chain — no timer is
  involved — so the R10.3 bound holds with margin and the r10a-M1 scenario cannot occur. The
  R10.12 06-L02 abort-bound restatement stands unchanged.

Seam pseudocode (replaces the R10.3 block at `:3983-4007`; unchanged lines keep their R10
meaning):

```text
runDedicatedMaintenanceStatement({ signal, statementTimeoutMs, statement }):
  fence()                                            // R8.4 close fence FIRST: session_lost, zero calls, zero slots
  assertStatementBound(statementTimeoutMs)           // R10.5: safe integer in [1, 120_000], else bound_invalid
  if signal.aborted: throw dedicated_database_session_lost        // zero factory calls, zero slots
  target = resolveDedicatedSessionTarget()           // R7.2 matrix + R10.6 env map + R11.3 worker rule; unavailable, zero calls
  effectiveMs = clamp(statementTimeoutMs, effectiveDedicatedStatementBoundMs(), 120_000)
  slot = await semaphore.acquire(POOL_ACQUISITION_DEADLINE_MS, signal)
                                                     // entry: closeState check (R10.4); abort: waiter removed,
                                                     // session_lost (R10.3 a); deadline: database_pool_reserve_timeout
  if closeState !== "open": slot.release(); throw dedicated_database_session_lost   // R9.3
  if signal.aborted: slot.release(); throw dedicated_database_session_lost          // R11.1: abort-after-grant
                                                     // zero factory calls, zero statements, no registry entry
  { session, ready } = open(depsFor({ statementTimeoutMs: effectiveMs }), target)  // sync throw: slot.release(); unavailable
  registry.add(session)                              // same tick as the re-check (R9.3, R9.4)
  onAbort = () => session.drainWithin("signal", clock.now() + DEDICATED_DRAIN_DEADLINE_MS, { forcedOnly: true })
                                                     // R11.1: forced only on EVERY path (D-2 c from `ready` on)
  signal.addEventListener("abort", onAbort, { once: true })       // R10.3 b
  try:
    await ready                                      // R10.4 race: unavailable, or session_lost after a drain
    return await session.execute(statement, signal)  // exactly ONE execute: autocommit, no begin, no set_config
  finally:
    signal.removeEventListener("abort", onAbort)
    try: await session.cancelActiveAndRollback("lease_release", { forcedOnly: signal.aborted })
                                                     // R7.4 drain; joins a running drain (R8.4); R10.3 c
    catch: contained
    registry.delete(session); slot.release()         // exactly once on every path
```

- F27 sub-leg `abort-after-grant` (Guards split file; fake clock): the leg calls the seam with a
  free slot — its first await is the semaphore acquire, so the grant is resolved — and aborts the
  signal in the same synchronous tick as the call (the F21a-1 pattern). The seam rejects
  `dedicated_database_session_lost` in the grant's microtask chain, well before `t0 + 4_500`, with
  zero factory calls; the caller statement is never issued; the slot is released;
  `dedicatedSessionSemaphoreStateForTests()` — read before any re-arm — reports
  `{ free: maintenancePoolMax, waiters: 0 }`; the registry is empty.
- The R10.13 R8.8 list gains `abort-after-grant` (R11.5).

### R11.2 — Guards split: pre-authorized fence edit, hosting and budgets (F9 (b); closes r10a-L1)

- Finding (r10a-L1, verified): `task551DedicatedSessionGuards.test.ts` does not exist yet; it must
  hold roughly 60 cases plus a fake client, a fake control client and a fake clock under the
  800-line hard cap, so the R8.4/R10 STOP rule would very likely fire mid-implementation in
  land-order step 1.
- Hosting (F9): the new Bun-lane file
  `tests/integration/server/task551DedicatedMaintenanceSeam.test.ts` hosts F27 with every sub-leg
  (including the R10 `sqlstate`, `abort-slot-wait`, `abort-ready-pending` and the R11.1
  `abort-after-grant`), F21a-1, F21a-2 (plus the never-settles variant) and F21a-3, and the F25
  URL pins — now including the R11.3 binding pins. It follows the R7.8 conventions (airtight
  `DATABASE_URL=postgresql://127.0.0.1:1/none`, factories through
  `setDatabaseClientRuntimeForTests`, fake client/control/clock, no fixed sleeps).
  `task551DedicatedSessionGuards.test.ts` keeps everything else (F1-F26 except the F25 URL pins,
  F21b-F21e, the F21c variant, the F18 overlap leg, the F2/F4 variant).
- Budgets: both files stay at or under 1,000 physical lines (the repository line gate). The Guards
  file keeps its stricter 800-line hard cap; the seam file's cap is 1,000 lines and it has no
  separate 800 cap. The R8.4 STOP rule stands for the Guards file; the seam file's equivalent rule
  is its 1,000-line cap: if the landing would push either file past its cap, the implementer STOPS
  and reports — the split is not self-service extended and no leg moves between the files without
  an orchestrator note. Because the hosting decision and the fence `minimum: 4` are made up front,
  the 800-line STOP never fires in step 1.
- Fence edit (made this round, recorded in the preamble): allowlist + `database-lifecycle-test`
  `argv` + `positiveDiscovery.paths` (+`minimum` 3 → 4); JSON validated; family preflight
  41/11/29/33 at HEAD `9d27d93d`; one inserted line at `:813` (shift rule in the preamble).

### R11.3 — `lane-worker-dedicated-schema-binding` (F9 (c); E1 as restated by H1 — NOT E1 (a) as written)

- Grounding (verified): `buildWorkerDatabaseUrl` (`scripts/bun-lane-worker-url.ts:56-66`) appends
  `options=<url-encoded "-csearch_path=bun_worker_<i>">` to the direct URL, with `&` when the URL
  already carries a query; the worker env map (`:155-158`) sets `DATABASE_URL` to that worker URL,
  keeps `DATABASE_DIRECT_URL` at the bare direct URL, and sets
  `BUN_TEST_WORKER_INDEX: String(workerIndex)`. The root `.env` `DATABASE_DIRECT_URL` already
  carries a query (H1: 1 line matches `?`, 1 matches `sslmode`; count-only greps, never values),
  so every worker URL has ≥ 2 query keys and a `%3D`-encoded value. H1: E1 (a) as written
  ("a query whose only key is `options`") would reject the binding target; R11 is written from H1.
- Guard exception (one, named `lane-worker-dedicated-schema-binding`, in BOTH builders): the R10.7
  guard rejects a target URL whose query contains a guarded key. The exception rescues exactly the
  `options`-present case when ALL of the following hold; otherwise the R10.7 rejection stands
  unchanged (`database_maintenance_session_unavailable`, zero clients, only the bounded code —
  never the URL or the value). A query with no guarded key builds normally, as today.
  1. `options` is the only GUARDED key present (the R10.7 guarded-key list is unchanged; unguarded
     keys such as `sslmode` stay allowed as today). At most one `options` key; a repeated
     `options` key rejects.
  2. The URL-decoded `options` value (the same single URL-decode the query parser applies) matches
     `^-csearch_path=bun_worker_(\d+)$`.
  3. `BUN_TEST_WORKER_INDEX` is set, matches `^\d+$` (a missing or non-numeric value rejects), and
     the captured `<n>` equals it as a decimal string (`String(<n>) === BUN_TEST_WORKER_INDEX`).
     Zero-padded captures therefore reject (fail-closed): the session must bind to the schema this
     worker provisioned (`bun_worker_${BUN_TEST_WORKER_INDEX}`), and a `01`-style capture names a
     different schema even when numerically equal. Builder-produced URLs always carry canonical
     decimal, so provisioned workers are unaffected.
  Production never sets `BUN_TEST_WORKER_INDEX`, so the exception is inactive there and the guard
  behaves exactly as R10.7 wrote it. The builders read the variable from `process.env` at check
  time; Guards legs set and restore it per leg.
- Target rule (E1 (b)): under R7.2's `off + primary` row (`:2017`), when `BUN_TEST_WORKER_INDEX`
  is set the dedicated target takes the worker `DATABASE_URL` — the verified non-pooled URL
  carrying the `options` query — instead of the bare `DATABASE_DIRECT_URL`, so dedicated and
  control sessions bind to `bun_worker_<n>`. Fail-closed: there is NO fallback to
  `DATABASE_DIRECT_URL` under this rule; if the worker `DATABASE_URL` does not verify as
  non-pooled, the resolver rejects `database_maintenance_session_unavailable` (a wrong-schema bind
  is worse than a refusal). The variable is read from the same env map the resolver consults
  (R7.2 `:2033-2034` overlay rule), so R10.6's `databaseDirectUrl?` set-or-delete overlay keeps
  working unchanged. The `transaction + primary`, `direct` and `session` rows are unchanged.
- F-leg pins (E1 (c); F25-family URL pins in the seam file, plus one F27-style target pin):
  - accepted: `<direct-url>?sslmode=require&options=-csearch_path%3Dbun_worker_3` with
    `BUN_TEST_WORKER_INDEX=3` builds in both builders (two keys, encoded value; one concrete
    `<n>` pinned).
  - rejected: the same URL with any other `options` value (any value failing the regex, e.g.
    `-csearch_path=public`); worker-shaped `options` without `BUN_TEST_WORKER_INDEX`;
    worker-shaped `options` with a mismatched or zero-padded index; a URL that also carries
    `statement_timeout` (the only-guarded-key condition fails even when the `options` pair is
    valid).
  - target pin (F27-style, seam file): the fake factory records its `target`. With the worker
    variable set and both URLs present (override `databaseUrl` = a verified non-pooled worker-URL
    placeholder, `databaseDirectUrl` = a bare direct placeholder), the factory receives the worker
    URL; without the worker variable it receives the direct URL (today's rule, R10.6).
- No re-baseline: every existing F23/F25/F27 leg and every RD leg runs without
  `BUN_TEST_WORKER_INDEX`, so the exception and the target rule are inactive for them.

### R11.4 — RD13 SQL: D-8 superseded by R10.8 (F9 (d); records r10a-I1)

- Addendum D-8's RD13 sentence (dispositions file `:168`) — "two `select pg_backend_pid() as pid,
  backend_start::text as started, current_setting('statement_timeout') as setting` seam calls
  return `"60000"` with differing `(pid, started)` pairs" — is SUPERSEDED by R10.8 (`:4183-4184`):
  the two seam calls read `(select setting from pg_settings where name = 'statement_timeout')` and
  `backend_start::text` from `pg_stat_activity`. `current_setting('statement_timeout')` is never
  reinstated in this leaf, its tests or its handoffs (R10.1 documents why: `current_setting`/`SHOW`
  render units, `pg_settings.setting` returns base units).
- Scope of the supersession: ONLY the `statement_timeout` read. The R8.7 guard's separate seam call
  `select current_setting('client_min_messages') as level` (R10.8 `:4177`) stands — it reads a
  different parameter and was re-added by R10.8 itself. The `withDedicatedDatabaseSession`
  follow-up execute returning `setting === String(<the run's L01 statement bound>)` stands.

### R11.5 — Land order (F9 (e); extends R10.13)

- Step 0 reads "before any 02-L02 R7-R11 code dispatch" (was "R7-R10").
- Step 1 becomes: "02-L02 R7 + R8 + R9 code, including the R9.1 seam, as amended by R10 and R11 —
  the seam code lands with the R11.2 split file (the fence `minimum: 4` covers it)".
- The R8.8 list gains `abort-after-grant` and the R11.3 binding pins on top of the R10 list.
- Steps 2-6 are unchanged. 06-L03 A8-k cites step 0 as "R7-R10" (F7); that citation reads as this
  extended step 0 through R10.13 — no 06-L03 edit is made here.

### R11.6 — Handoffs and cross-file notes (this leaf edits none of these files)

- **TASK-551-06-L02 R15** (F2, F8): the R14 abort bound ("settles within
  `DEDICATED_DRAIN_DEADLINE_MS` of the abort from any point"; 06-L02 `:4916-4918`) is strengthened,
  not changed, by R11.1 — the same-tick case now rejects immediately. F2's abort path (adapter maps
  the rejection; the pure loop logs `{ family, code }` once and throws
  `retention_pre_vacuum_aborted`) is unaffected: the R11.1 rejection maps to `lost` like every
  other abort rejection.
- **TASK-551-06-L03 A8-k** (F1, F7): the D-1 parity finding (r10a-M2) is disposed by F1 — the flat
  shape and the names `PreRetentionSeamFailure` / `toPreRetentionSeamFailure` win; A8-k supersedes
  J5's `PreRetentionVacuumRejection` / `mapSeamRejection`; "02-L02 R10.2 needs no edit" stands.
  A8-k's J3 citation of step 0 reads "R7-R11" through R11.5.
- **TASK-551-01-L01 v9** (H1): drops v8's "already satisfy (a)" claim (`:4866-4868`) and mirrors
  the R11.3 wording; the FINAL STOP step for `lane-worker-dedicated-schema-binding` clears only
  when this leaf's step-1 code lands (R11.5).
- r10b never returned (G1): recorded; the R10 scope's adversarial lens is covered by the audit
  pair over the R11/R15/A8-k output, not by a re-run.

### R11.7 — Finding → disposition (R10 audit)

Audit r10a = agent `a59fe5fe4ff107ac0` (journal `wf_14885132-56b`): 0 HIGH, 2 MEDIUM, 1 LOW,
2 INFO. r10b never returned (Addendum G1).

| Finding | Sev | Disposition |
|---|---|---|
| r10a-M1 abort after the grant is observed by nobody; the bound could reach ~8,500 ms | MEDIUM | Fixed: post-re-check `signal.aborted` check, forced-only `onAbort` on every path, F27 `abort-after-grant`, R8.8 list + land order (R11.1, R11.5) — F9 (a) |
| r10a-M2 D-1 shape/mapper names and the abort path disagree across 06-L02/06-L03 | MEDIUM | Orchestrator (F1): flat shape + `PreRetentionSeamFailure`/`toPreRetentionSeamFailure` win; 06-L03 A8-k supersedes J5; "02-L02 R10.2 needs no edit" stands (R11.6) |
| r10a-L1 Guards file ~60 cases under the 800 cap; STOP likely mid-step-1 | LOW | Fixed: split pre-authorized, fence edited this round, hosting and budgets stated, `minimum: 4` (R11.2) — F9 (b) |
| r10a-I1 R10.8's RD13 SQL departs from D-8 (correctly) | INFO | Recorded: D-8's `current_setting('statement_timeout')` superseded by R10.8, never reinstated; the `client_min_messages` guard call stands (R11.4) — F9 (d) |
| r10a-I2 wrong seed path in the mandate; optional J3 re-point | INFO | Recorded: the contract path stands (`:813`, `:2400`); the J3 re-point is absorbed by F7's A8-k, which cites R10.13 directly (R11.6) |

### R11.8 — Superseded sentences (quoted; line = working-tree anchor after the R11 fence edit)

Quotes keep the source line breaks; list-markup dashes and indentation are collapsed. Everything
not quoted below stays binding.

R7:

- `:2017` "| `off + primary` | `resolveSessionDatabaseTarget("dedicated_database_session")`: `DATABASE_DIRECT_URL` when set, else a verified non-pooled `DATABASE_URL` |". Extended: with
  `BUN_TEST_WORKER_INDEX` set, the worker `DATABASE_URL` takes precedence and there is no fallback
  to `DATABASE_DIRECT_URL` (R11.3, E1 (b)).
- `:2400-2401` "The DB-free suite is `tests/integration/server/task551DedicatedSessionGuards.test.ts`. Its path is
  unchanged, it stays in the Bun lane, and its hard cap is 800 lines." Extended: the
  seam file joins it as a second Bun-lane suite with a 1,000-line cap (R11.2).

R8:

- `:2989-2990` "If these legs would push the Guards file past its 800-line cap, the implementer STOPS and
  reports: a new test path needs a fence edit plus the family preflight." Extended: the
  seam-hosted legs live in the split file under its own 1,000-line cap, so this STOP cannot fire
  for them in step 1 (R11.2).

R9:

- `:3394-3396` "The Workflow Dispatch Envelope `json` fence is NOT edited. The one new export lives in
  `core/db/client.ts`; every new leg lives in `task551DedicatedSessionGuards.test.ts` or
  `task551DatabaseLifecycleRealDb.test.ts`, which the fence already lists." Now: the fence IS
  edited by R11.2 (pre-authorized) and the split file is a third leg host.

R10:

- `:3906-3908` "The Workflow Dispatch Envelope `json` fence is NOT edited. Every export added here lives in
  `core/db/client.ts`. Every new leg lives in `task551DedicatedSessionGuards.test.ts` or
  `task551DatabaseLifecycleRealDb.test.ts`, and the fence already lists both files." Now: the
  fence IS edited by R11.2 (pre-authorized) and the split file is a third leg host.
- `:3909-3911` "The R8.4 STOP rule covers every Guards leg and sub-leg added here. If they would push the Guards
  file past its 800-line cap, the implementer STOPS and reports. A new test path needs a fence
  edit plus the family preflight." Now R11.2: the seam-hosted legs carry the split
  file's 1,000-line cap; the 800-line STOP never fires in step 1.
- `:3970-3973` "(c) After `ready`: an abort during `execute` keeps R7.4 (`execute` rejects `session_lost` at
  once and poisons the session). When `signal.aborted` holds at the `finally`, the drain skips the
  graceful step and runs forced only. The internal flag or parameter that carries this is the
  implementer's choice; the behaviour is binding." Extended: the forced-only
  drain starts at `onAbort`, so D-2 (c) holds between `ready` and `execute` too (R11.1).
- `:3981` "Seam pseudocode (replaces R9.1 `:3473-3492`; unchanged lines keep their R9 meaning):", with
  `:3984` "runDedicatedMaintenanceStatement({ signal, statementTimeoutMs, statement }):",
  `:3993` "if closeState !== "open": slot.release(); throw dedicated_database_session_lost   // R9.3",
  `:3996` "onAbort = () => session.drainWithin("signal", clock.now() + DEDICATED_DRAIN_DEADLINE_MS)" and
  the closing fence `:4007` — the R10.3 seam pseudocode block. Now the R11.1 block (the block is
  replaced in full; unchanged lines keep their R10 meaning).
- `:4150-4154` "`createDedicatedClientOptions` and `createControlClientOptions` throw
  `database_maintenance_session_unavailable` (zero clients) when the target URL's query contains
  any of `statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout`,
  `application_name`, `client_connection_check_interval` or `options`. The check runs after the
  existing empty-URL check and before any option is built." Extended: the one named exception
  `lane-worker-dedicated-schema-binding` (R11.3, H1).
- `:4258-4259` "0. the 02-L01 dated note (docs, R9.10 / D7, as corrected by R10.11), before any 02-L02 R7-R10 code
  dispatch;" Now: "R7-R11" (R11.5).
- `:4260-4261` "1. 02-L02 R7 + R8 + R9 code, including the R9.1 seam, as amended by R10 (R10 amends that same
  code and lands with it);" Now R11.5 (amended by R10 and R11, landing with the split
  file).
- `:4272-4275` "The R8.8 table gains the F27 sub-legs `sqlstate`, `abort-slot-wait` and `abort-ready-pending`,
  the F27 builder `0`/`120_001` pins, the `effectiveDedicatedStatementBoundMs` pin, the two pooled
  legs and the URL-query pin, the F25 URL-query pins, the re-pinned F21a-1 and F21a-2 (plus the
  never-settles variant), and F21a-3."
  Extended: `abort-after-grant` and the R11.3 binding pins (R11.1, R11.3, R11.5).

Everything not quoted above stays binding.
