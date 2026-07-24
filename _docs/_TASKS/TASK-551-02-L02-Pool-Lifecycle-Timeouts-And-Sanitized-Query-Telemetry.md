# TASK-551-02-L02: Pool Lifecycle, Timeouts, and Sanitized Query Telemetry
# FileName: TASK-551-02-L02-Pool-Lifecycle-Timeouts-And-Sanitized-Query-Telemetry.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-02
**Priority:** High
**Category:** Database / Infrastructure / Observability
**Estimated Effort:** Medium
**Dependencies:** TASK-551-02-L01
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

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
`core/db/queryFingerprintRegistry.ts`, `core/db/queryTelemetry.ts`, `core/server/runtimeLifecycle.ts`,
`core/server/runtimeEntrypoint.ts`, `core/server/prod.ts`, `core/server/dev.ts`,
`tests/vitest/db/queryFingerprintRegistry.test.ts`,
`tests/integration/server/task551DatabaseLifecycle.test.ts`,
`tests/integration/server/task551RuntimeEntrypoints.test.ts`,
and `tests/perf/database-pool-telemetry.test.ts` only.

**Forbidden:** schema/migrations; service/route behavior; TASK-511 backup and
scheduler source; TASK-517 entry/public source; TASK-493 SEO source; cache/Redis
07/08 paths; task/changelog/workflow files.

## Implementation Pseudocode

```ts
const config = parseDatabaseRuntimeConfig(process.env);
const sqlClient = postgres(requireDatabaseUrlRedacted(), {
  max: config.poolMax,
  connect_timeout: config.connectTimeoutSeconds,
  idle_timeout: config.idleTimeoutSeconds,
  max_lifetime: config.maxLifetimeSeconds,
  prepare: config.pgbouncerMode !== "transaction",
  connection: {
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
      connection: sameBoundedStartupTimeouts(config),
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
export const MAX_QUERY_FINGERPRINTS = 512;
export const MAX_COUNTER_VALUE = Number.MAX_SAFE_INTEGER;

// Pure production module: no DB/runtime/env/test-fixture import.
export const TASK551_QUERY_FINGERPRINTS = strictReadonly({ /* closed reviewed key/value map */ });
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

These are closed registries, not examples. `queryFingerprintRegistry.ts` fails
module validation if the reviewed map exceeds `MAX_QUERY_FINGERPRINTS`, contains
duplicate values, or contains a member outside the initial TASK-551-01 receipt.
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
`withDedicatedDatabaseSession<T>(run)` as the only supported maintenance-
connection boundary and is consumed by TASK-551-06-L03 for advisory-lock work.
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

## Testing Requirements

- With a test pool configured at least 2, real DB reserves at least two
  simultaneous physical connections, verifies the
  three startup timeout settings on both, replaces one connection, verifies the
  replacement, and exercises a deliberately bounded timeout cancellation.
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
- `measureDatabaseQuery` tests success/error/timeout and returned-row buckets for
  opted-in current and planned operations; the inventory/fingerprint set has
  exact coverage, cardinality remains fixed, and a secret sentinel cannot appear
  in metrics/log output. A throwing row counter or sink cannot replace the
  operation's value/error.
- Registry tests pin closed key/value uniqueness, stable ordering, side-effect-
  free import, and zero production imports from `tests/**`; final 01-L01 owns
  independent exact-set verification.
- `probeDatabasePoolHealth` saturates only the test pool, records a bounded
  reservation-wait/saturation sample, releases every reserved session in
  `finally`, and returns to zero after drain. Tests do not claim this is
  driver-wide per-query wait telemetry.
- Snapshot/reset tests pin the complete fixed bucket registry, frozen snapshots,
  the exact 3,240-cells-per-fingerprint and 44-cell pool bounds, saturating
  `Number.MAX_SAFE_INTEGER` counters, deterministic zeroed state after reset,
  rejection/no-allocation for every unknown enum/fingerprint, bounded memory
  independent of sample count, and best-effort behavior when an injected sink
  throws.
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
- Telemetry labels are allowlisted enums/fingerprints, not caller-controlled SQL.

## Validation Commands

- `set -a && source .env && set +a && bun test tests/integration/server/task551DatabaseLifecycle.test.ts`
- `bun test tests/integration/server/task551RuntimeEntrypoints.test.ts`
- `bunx vitest run tests/vitest/db/queryFingerprintRegistry.test.ts`
- `set -a && source .env && set +a && bun test tests/perf/database-pool-telemetry.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso`
- `bun run gates:coderso:perf`
- `bun run scan:security`

## Documentation Updates Required

Do not edit `.env.example`. Hand L01's exact env table and the lifecycle contract
to TASK-551-10-L02, which solely owns environment, ORM, performance, deployment,
health prose, and changelog 1263.

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
  URLs, driver errors, free-form labels, or PII.
- `queryFingerprintRegistry.ts` is the only production fingerprint value source;
  telemetry imports it and final inventory verifies exact key/value/set parity.
- Session-affine work is impossible through a declared transaction-pooled main
  channel: it either uses a live-proven direct/session-pooled maintenance pool
  or fails fast with `database_maintenance_session_unavailable` before work.
- A single-connection primary pool remains a supported small-site ordinary DB
  configuration. It is rejected only at activation of a session-affine
  consumer, never by unused-capability probing during normal DB startup.
