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
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/server/task551DatabaseLifecycle.test.ts", "tests/integration/server/task551DatabaseLifecycleRealDb.test.ts", "tests/integration/server/task551DedicatedSessionGuards.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/server/task551DatabaseLifecycle.test.ts", "tests/integration/server/task551DatabaseLifecycleRealDb.test.ts", "tests/integration/server/task551DedicatedSessionGuards.test.ts"],
        "minimum": 3
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
