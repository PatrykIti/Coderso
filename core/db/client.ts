/**
 * Config-driven database client (TASK-551-02-L02).
 *
 * Owns the primary pool, the optional distinct maintenance channel, bounded
 * startup timeout parameters, physical-session affinity proof, and the only
 * supported dedicated-maintenance-session boundaries. Configuration is parsed
 * once by the L01 owner (`./databaseConfig`); this module never re-parses or
 * defaults a count.
 *
 * Secrets policy: `DATABASE_URL` and `DB_MAINTENANCE_URL` are consumed here and
 * are never returned, echoed, logged, or embedded in telemetry or errors.
 * Timeout parameters are sent as PostgreSQL startup parameters on every new
 * physical session (never via one-off `SET`, which would configure only one
 * checked-out session).
 */
import postgres from "postgres";
import type { PendingQuery, ReservedSql, Sql, TransactionSql } from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { resolveDefaultDatabaseTarget } from "./connectionTargets";
import { parseDatabaseRuntimeConfig } from "./databaseConfig";
import {
  buildDatabaseApplicationName,
  parseDatabaseApplicationIdentity,
} from "./databaseApplicationIdentity";
import {
  POOL_ACQUISITION_DEADLINE_MS,
  toPoolWaitBucket,
  databaseTelemetry,
  type DatabaseTelemetrySink,
  type PoolHealthSample,
  type PoolOutcome,
} from "./queryTelemetry";

/** Machine-readable failure codes emitted by this module. */
export const DATABASE_CLIENT_ERROR_CODES = {
  urlMissing: "database_url_missing",
  maintenanceUrlRequired: "database_maintenance_url_required",
  maintenanceSessionUnavailable: "database_maintenance_session_unavailable",
  dedicatedSessionLost: "dedicated_database_session_lost",
  reserveTimeout: "database_pool_reserve_timeout",
  budgetInvalid: "database_dedicated_session_budget_invalid",
  startupParameterMismatch: "database_startup_parameter_mismatch",
  advisoryLockConflict: "database_dedicated_advisory_lock_conflict",
} as const;

let config = parseDatabaseRuntimeConfig(process.env);
const identity = parseDatabaseApplicationIdentity(process.env, config.fleet);

/** Typed view over one postgres.js result list (cast through unknown). */
async function queryRows<TRow>(query: Promise<unknown>): Promise<TRow[]> {
  return ((await query) ?? []) as unknown as TRow[];
}

function requireDatabaseUrlRedacted(): string {
  const overridden = activeDatabaseUrlOverrideForTests();
  if (overridden !== null) return overridden;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error(DATABASE_CLIENT_ERROR_CODES.urlMissing);
  resolveDefaultDatabaseTarget();
  return url;
}

function requireMaintenanceDatabaseUrlRedacted(): string {
  const url = activeMaintenanceUrlOverrideForTests() ?? process.env.DB_MAINTENANCE_URL?.trim();
  if (!url) throw new Error(DATABASE_CLIENT_ERROR_CODES.maintenanceUrlRequired);
  return url;
}

/** Startup parameters applied to every initial and replacement session. */
const boundedStartupConnectionParams = (
  applicationName: string
): Partial<postgres.ConnectionParameters> => ({
  application_name: applicationName,
  statement_timeout: config.statementTimeoutMs,
  lock_timeout: config.lockTimeoutMs,
  idle_in_transaction_session_timeout: config.idleInTransactionTimeoutMs,
});

const sqlClient: Sql = postgres(requireDatabaseUrlRedacted(), {
  max: config.poolMax,
  connect_timeout: config.connectTimeoutSeconds,
  idle_timeout: config.idleTimeoutSeconds,
  max_lifetime: config.maxLifetimeSeconds,
  prepare: config.pgbouncerMode !== "transaction",
  connection: boundedStartupConnectionParams(
    buildDatabaseApplicationName(identity.processKind, identity.replicaId)
  ),
});

export const db = drizzle(sqlClient, { schema });

/**
 * The maintenance channel. `off + primary` shares the already-named runtime
 * pool; `direct|session` open their separately budgeted pool from L01's
 * distinct URL (`max >= 2`: lock owner plus independent verifier). A
 * transaction-pooled primary can never become session-affine and is rejected
 * at every affinity seam instead of here, so ordinary pooled traffic keeps
 * working.
 */
let maintenanceSqlClient: Sql =
  config.maintenanceMode === "primary"
    ? sqlClient
    : postgres(requireMaintenanceDatabaseUrlRedacted(), {
        max: config.maintenancePoolMax,
        connect_timeout: config.connectTimeoutSeconds,
        idle_timeout: config.idleTimeoutSeconds,
        max_lifetime: config.maxLifetimeSeconds,
        prepare: config.maintenanceMode === "direct",
        connection: boundedStartupConnectionParams(
          buildDatabaseApplicationName("maintenance", identity.replicaId)
        ),
      });

/** Distinct clients that must reach a terminal closed state on shutdown. */
export function listDatabaseClients(): readonly Sql[] {
  return maintenanceSqlClient === sqlClient ? [sqlClient] : [sqlClient, maintenanceSqlClient];
}

// ---------------------------------------------------------------------------
// Lifecycle-scoped close
// ---------------------------------------------------------------------------

/** Monotonic generation; any close invalidates cached affinity proofs. */
let lifecycleGeneration = 0;
let affinityProofPromise: Promise<void> | null = null;

/**
 * Ends every distinct database client within the given budget milliseconds.
 * All end calls start together and every terminal outcome is awaited; the
 * driver's timeout option performs the forced termination at the deadline so
 * no socket teardown runs detached.
 */
export async function closeAllDatabaseClientsWithin(budgetMs: number): Promise<void> {
  lifecycleGeneration += 1;
  affinityProofPromise = null;
  const timeoutSeconds = Math.max(0, Math.min(budgetMs, 10_000) / 1000);
  await Promise.all(listDatabaseClients().map((client) => client.end({ timeout: timeoutSeconds })));
}

/** Backward-compatible alias for the previous single-client close path. */
export const closeDatabase = async (): Promise<void> => {
  await closeAllDatabaseClientsWithin(10_000);
};

// ---------------------------------------------------------------------------
// Ordinary connectivity/startup-parameter verification
// ---------------------------------------------------------------------------

type StartupSettingRow = Readonly<{
  name: string;
  setting: string;
}>;

async function verifyOneSession(): Promise<void> {
  const reserved = await sqlClient.reserve();
  try {
    const rows = await queryRows<StartupSettingRow>(reserved`
      select name, setting
      from pg_settings
      where name in (
        'statement_timeout',
        'lock_timeout',
        'idle_in_transaction_session_timeout',
        'application_name'
      )
    `);
    const byName = new Map(rows.map((row) => [row.name, row.setting]));
    const expectedApplicationName = buildDatabaseApplicationName(
      identity.processKind,
      identity.replicaId
    );
    const expectations: readonly (readonly [string, string])[] = [
      ["statement_timeout", String(config.statementTimeoutMs)],
      ["lock_timeout", String(config.lockTimeoutMs)],
      ["idle_in_transaction_session_timeout", String(config.idleInTransactionTimeoutMs)],
      ["application_name", expectedApplicationName],
    ];
    for (const [name, expected] of expectations) {
      if (byName.get(name) !== expected) {
        throw new Error(`${DATABASE_CLIENT_ERROR_CODES.startupParameterMismatch}: ${name}`);
      }
    }
  } finally {
    reserved.release();
  }
}

/**
 * Validates ordinary primary connectivity and the fixed startup parameters.
 * At `poolMax=1` exactly one session is reserved and tested; multi-session
 * sampling happens only when configured capacity allows it without waiting
 * for a second connection beyond what exists. Never touches the affinity seam.
 */
export async function verifyDatabaseSessions(): Promise<void> {
  const sessionsToSample = Math.min(config.poolMax, 2);
  await Promise.all(Array.from({ length: sessionsToSample }, () => verifyOneSession()));
}

// ---------------------------------------------------------------------------
// Maintenance session-affinity probe
// ---------------------------------------------------------------------------

/** Session advisory-lock key used exclusively by the affinity probe. */
const AFFINITY_PROBE_LOCK_KEY = 551551551n;

type PidProbeRow = Readonly<{ pid: number }>;

/**
 * Live two-transaction/two-backend proof: an owner survives two transaction
 * boundaries on one backend PID while holding a session advisory lock, and an
 * independent backend cannot acquire it. Re-entrant acquisition by the
 * verifier exposes transaction pooling and fails the probe. Success is cached
 * for the current lifecycle generation only.
 */
async function runAffinityProbe(): Promise<void> {
  let owner: ReservedSql | null = null;
  let verifier: ReservedSql | null = null;
  const unavailable = (): Error =>
    new Error(DATABASE_CLIENT_ERROR_CODES.maintenanceSessionUnavailable);
  try {
    owner = await maintenanceSqlClient.reserve();
    verifier = await maintenanceSqlClient.reserve();

    let ownerPid = -1;
    await owner.begin(async (tx) => {
      const rows = await queryRows<{ pid: number; acquired: boolean }>(tx`
        select pg_backend_pid() as pid,
               pg_try_advisory_lock(${AFFINITY_PROBE_LOCK_KEY.toString()}::bigint) as acquired
      `);
      const row = rows[0];
      if (!row || !row.acquired) throw unavailable();
      ownerPid = row.pid;
    });
    await owner.begin(async (tx) => {
      const rows = await queryRows<PidProbeRow>(tx`
        select pg_backend_pid() as pid
      `);
      if (!rows[0] || rows[0].pid !== ownerPid) throw unavailable();
    });

    const verifierRows = await queryRows<{
      pid: number;
      acquired: boolean;
    }>(verifier`
      select pg_backend_pid() as pid,
             pg_try_advisory_lock(${AFFINITY_PROBE_LOCK_KEY.toString()}::bigint) as acquired
    `);
    const verifierRow = verifierRows[0];
    if (!verifierRow) throw unavailable();
    if (verifierRow.acquired) {
      // Re-entrant acquisition means the pool handed the same session back
      // (transaction pooling): balance the lock before failing deterministically.
      await verifier`select pg_advisory_unlock(${AFFINITY_PROBE_LOCK_KEY.toString()}::bigint)`;
      throw unavailable();
    }
    if (verifierRow.pid === ownerPid) throw unavailable();
  } finally {
    try {
      if (owner) {
        await owner`select pg_advisory_unlock(${AFFINITY_PROBE_LOCK_KEY.toString()}::bigint)`;
      }
    } catch {
      // Unlock failure leaves the probe unsuccessful; release still happens.
    }
    try {
      owner?.release();
    } catch {
      // Already released/lost.
    }
    try {
      verifier?.release();
    } catch {
      // Already released/lost.
    }
  }
}

/**
 * Idempotent per lifecycle generation. Fails with the stable
 * `database_maintenance_session_unavailable` code for transaction+primary,
 * fewer than two available sessions in the active channel, a failed probe, or
 * a pool outage. Failures are never cached as success.
 */
export async function assertMaintenanceSessionAffinity(): Promise<void> {
  if (config.maintenanceMode === "primary") {
    if (config.pgbouncerMode !== "off" || config.poolMax < 2) {
      throw new Error(DATABASE_CLIENT_ERROR_CODES.maintenanceSessionUnavailable);
    }
  }
  const generation = lifecycleGeneration;
  if (!affinityProofPromise) {
    affinityProofPromise = runAffinityProbe().catch((error: unknown) => {
      if (lifecycleGeneration === generation) affinityProofPromise = null;
      throw error instanceof Error ? error : new Error(String(error));
    });
  }
  await affinityProofPromise;
}

/**
 * Lifecycle-start variant: ordinary primary mode never probes an unused
 * maintenance capability; a declared `direct|session` channel proves affinity
 * once at startup.
 */
export async function assertMaintenanceSessionAffinityIfDeclared(): Promise<void> {
  if (config.maintenanceMode === "primary") return;
  await assertMaintenanceSessionAffinity();
}

// ---------------------------------------------------------------------------
// Dedicated (connection-affine) maintenance sessions
// ---------------------------------------------------------------------------

export type DedicatedCancelReason =
  "signal" | "startup_failure" | "close_failure" | "test" | "lease_release" | "retention_lock_lost";

export type DedicatedDatabaseTransaction = TransactionSql;

/**
 * A statement builder evaluated against the one reserved physical session.
 * Consumers receive no retained handle: the builder result is used for this
 * call only, tracked so abort can cancel the live pending query.
 */
export type StaticDedicatedStatement<TRow extends postgres.Row> = (
  sql: ReservedSql
) => PendingQuery<[TRow]>;

export type DedicatedDatabaseSession = Readonly<{
  execute<TRow extends postgres.Row>(
    statement: StaticDedicatedStatement<TRow>,
    signal: AbortSignal
  ): Promise<TRow[]>;
  transaction<T>(input: {
    signal: AbortSignal;
    statementTimeoutMs: number;
    run: (tx: DedicatedDatabaseTransaction) => Promise<T>;
  }): Promise<T>;
  assertAlive(signal: AbortSignal): Promise<void>;
  cancelActiveAndRollback(
    reason: DedicatedCancelReason
  ): Promise<"rolled_back" | "connection_terminated">;
}>;

interface CancellableQuery {
  cancel(): void;
}

/** Terminates one reserved backend by PID through the sibling channel. */
async function terminateReservedBackend(reserved: ReservedSql): Promise<void> {
  try {
    const rows = await queryRows<PidProbeRow>(reserved`select pg_backend_pid() as pid`);
    const pid = rows[0]?.pid;
    if (pid === undefined) return;
    await maintenanceSqlClient`
      select pg_terminate_backend(${pid}::int)
      where exists (select 1 from pg_stat_activity where pid = ${pid})
    `;
  } catch {
    // Termination is best-effort; the lease must simply never be re-pooled.
  }
}

function createTrackedDedicatedSession(reserved: ReservedSql): DedicatedDatabaseSession {
  let activeQuery: CancellableQuery | null = null;

  const drainActiveAndRollback = async (
    signal: AbortSignal | null
  ): Promise<"rolled_back" | "connection_terminated"> => {
    if (activeQuery && signal?.aborted) {
      try {
        activeQuery.cancel(); // Supported driver surface; no debug hooks.
      } catch {
        // Cancel request failure falls through to rollback confirmation.
      }
    }
    activeQuery = null;
    try {
      await reserved`rollback`;
      return "rolled_back";
    } catch {
      await terminateReservedBackend(reserved);
      return "connection_terminated";
    }
  };

  return Object.freeze({
    async execute<TRow extends postgres.Row>(
      statement: StaticDedicatedStatement<TRow>,
      signal: AbortSignal
    ): Promise<TRow[]> {
      const query = statement(reserved);
      activeQuery = query;
      try {
        if (signal.aborted) {
          // An already-aborted signal never fires `abort` again: cancel the
          // pending query and surface the bounded lost-session outcome instead
          // of resolving with data that must not be used.
          query.cancel();
          throw new Error(DATABASE_CLIENT_ERROR_CODES.dedicatedSessionLost);
        }
        return await Promise.race([
          query,
          new Promise<never>((_, reject) => {
            signal.addEventListener(
              "abort",
              () => {
                try {
                  query.cancel();
                } catch {
                  // Handled by the rollback/drain path below.
                }
                reject(new Error(DATABASE_CLIENT_ERROR_CODES.dedicatedSessionLost));
              },
              { once: true }
            );
          }),
        ]);
      } finally {
        activeQuery = null;
      }
    },
    async transaction<T>(input: {
      signal: AbortSignal;
      statementTimeoutMs: number;
      run: (tx: DedicatedDatabaseTransaction) => Promise<T>;
    }): Promise<T> {
      void input.statementTimeoutMs; // Session-level startup bound already applies.
      return (await reserved.begin(async (tx) => {
        if (input.signal.aborted) {
          await drainActiveAndRollback(input.signal);
          throw new Error(DATABASE_CLIENT_ERROR_CODES.dedicatedSessionLost);
        }
        return input.run(tx);
      })) as T;
    },
    async assertAlive(signal: AbortSignal): Promise<void> {
      if (signal.aborted) {
        throw new Error(DATABASE_CLIENT_ERROR_CODES.dedicatedSessionLost);
      }
      const rows = await queryRows<PidProbeRow>(reserved`select pg_backend_pid() as pid`);
      if (!rows[0]) {
        throw new Error(DATABASE_CLIENT_ERROR_CODES.dedicatedSessionLost);
      }
    },
    cancelActiveAndRollback: (_reason: DedicatedCancelReason) => drainActiveAndRollback(null),
  });
}

/**
 * Reserves one session against a validated deadline. A late fulfillment after
 * the deadline/shutdown wins releases that session exactly once and rejects;
 * timers are cleared on every settlement.
 */
async function reserveWithValidatedDeadline(
  client: Sql,
  deadlineMs: number = POOL_ACQUISITION_DEADLINE_MS
): Promise<ReservedSql> {
  let settled = false;
  let lateReservation: ReservedSql | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const winner = await Promise.race([
      client.reserve().then((reserved) => {
        if (settled) {
          // Deadline won earlier: never hand a post-timeout session onward.
          try {
            reserved.release();
          } catch {
            // Best-effort release of the late reservation.
          }
          return null;
        }
        lateReservation = reserved;
        return reserved;
      }),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), deadlineMs);
      }),
    ]);
    settled = true;
    if (!winner) {
      throw new Error(DATABASE_CLIENT_ERROR_CODES.reserveTimeout);
    }
    return winner;
  } finally {
    if (timer) clearTimeout(timer);
    void lateReservation;
  }
}

/**
 * Runs `run` with one proven-affine reserved maintenance session. The lease is
 * drained (cancel + rollback confirmed, or backend terminated) and released
 * exactly once on every path; a connection with active SQL never returns to
 * the pool.
 */
export async function withDedicatedDatabaseSession<T>(
  run: (session: DedicatedDatabaseSession) => Promise<T>
): Promise<T> {
  await assertMaintenanceSessionAffinity();
  const reserved = await reserveWithValidatedDeadline(maintenanceSqlClient);
  const session = createTrackedDedicatedSession(reserved);
  let released = false;
  try {
    return await run(session);
  } finally {
    if (!released) {
      released = true;
      try {
        await session.cancelActiveAndRollback("lease_release");
      } catch {
        // Drain outcome is contained; release still proceeds best-effort.
      }
      try {
        reserved.release();
      } catch {
        // Exactly-once release guard.
      }
    }
  }
}

export type DedicatedAdvisoryLockInput<T> = Readonly<{
  key: bigint;
  signal: AbortSignal;
  conflictCode: string;
  run: (session: DedicatedDatabaseSession) => Promise<T>;
}>;

/**
 * Sole public owner of a PostgreSQL session advisory lock held across multiple
 * transactions and non-DB work. Throws the caller's bounded `conflictCode`
 * without invoking `run` when the lock cannot be taken. Release uses exact
 * `pg_advisory_unlock` on the same backend; any ambiguity terminates that
 * reserved backend instead of returning it to a pool.
 */
export async function withDedicatedDatabaseAdvisoryLock<T>(
  input: DedicatedAdvisoryLockInput<T>
): Promise<T> {
  await assertMaintenanceSessionAffinity();
  const reserved = await reserveWithValidatedDeadline(maintenanceSqlClient);
  const session = createTrackedDedicatedSession(reserved);
  let unlockedExactly = false;
  try {
    const rows = await queryRows<{ acquired: boolean }>(reserved`
      select pg_try_advisory_lock(${input.key.toString()}::bigint) as acquired
    `);
    if (!rows[0] || !rows[0].acquired) {
      throw new Error(input.conflictCode);
    }
    const result = await input.run(session);
    const unlockRows = await queryRows<{ unlocked: boolean }>(reserved`
      select pg_advisory_unlock(${input.key.toString()}::bigint) as unlocked
    `);
    if (unlockRows[0]?.unlocked === true) unlockedExactly = true;
    return result;
  } finally {
    try {
      await session.cancelActiveAndRollback("lease_release");
    } catch {
      // Contained; termination path below covers ambiguity.
    }
    if (unlockedExactly) {
      try {
        reserved.release();
      } catch {
        // Exactly-once release guard.
      }
    } else {
      await terminateReservedBackend(reserved);
      try {
        reserved.release();
      } catch {
        // The terminated backend will not serve another lease.
      }
    }
  }
}

export type DedicatedDatabaseSessionBudgetInput = Readonly<{
  lockOwners: number;
  workSessions: number;
  ordinaryHeadroom: number;
}>;

/**
 * Validates a consumer's requested dedicated budget (for example TASK-548's
 * two dedicated sessions plus one ordinary headroom slot requires
 * `DB_POOL_MAX >= 3` under `off + primary`) against the live mode and pools so
 * session-affine work can neither starve ordinary queries nor exceed the
 * budgeted maintenance pool.
 */
export function assertDedicatedDatabaseSessionBudget(
  input: DedicatedDatabaseSessionBudgetInput
): void {
  const { lockOwners, workSessions, ordinaryHeadroom } = input;
  const values = [lockOwners, workSessions, ordinaryHeadroom];
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error(DATABASE_CLIENT_ERROR_CODES.budgetInvalid);
  }
  if (config.maintenanceMode === "primary") {
    if (config.pgbouncerMode !== "off") {
      throw new Error(DATABASE_CLIENT_ERROR_CODES.maintenanceSessionUnavailable);
    }
    if (config.poolMax < lockOwners + workSessions + ordinaryHeadroom) {
      throw new Error(DATABASE_CLIENT_ERROR_CODES.budgetInvalid);
    }
    return;
  }
  if (config.maintenancePoolMax < lockOwners + workSessions) {
    throw new Error(DATABASE_CLIENT_ERROR_CODES.budgetInvalid);
  }
}

// ---------------------------------------------------------------------------
// Bounded pool-health probe
// ---------------------------------------------------------------------------

/**
 * Independently times acquisition of one reserved session under the shared
 * 2-second deadline, buckets the wait/saturation outcome, releases in
 * `finally`, and records the closed aggregate best-effort. This measures the
 * bounded reserved-session wait only; it makes no claim about driver-wide
 * per-query wait telemetry.
 */
export async function probeDatabasePoolHealth(
  sink: DatabaseTelemetrySink | null = databaseTelemetry
): Promise<PoolHealthSample> {
  const startedAt = Date.now();
  let outcome: PoolOutcome = "available";
  let reserved: ReservedSql | null = null;
  try {
    reserved = await reserveWithValidatedDeadline(sqlClient, POOL_ACQUISITION_DEADLINE_MS);
    const waitedMs = Date.now() - startedAt;
    outcome = waitedMs >= 1_000 ? "saturated" : "available";
    return Object.freeze({ outcome, waitBucket: toPoolWaitBucket(waitedMs) });
  } catch (error) {
    outcome =
      error instanceof Error && error.message === DATABASE_CLIENT_ERROR_CODES.reserveTimeout
        ? "timeout"
        : "driver_error";
    return Object.freeze({
      outcome,
      waitBucket: toPoolWaitBucket(Date.now() - startedAt),
    });
  } finally {
    if (reserved) {
      try {
        reserved.release();
      } catch {
        // Exactly-once release guard.
      }
    }
    if (sink) {
      try {
        sink.observePool({
          outcome,
          waitBucket: toPoolWaitBucket(Date.now() - startedAt),
        });
      } catch {
        // Telemetry failure never changes the probe outcome.
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Test-only runtime override seam
// ---------------------------------------------------------------------------

/**
 * Test-only override for the connection-URL placeholders, the parsed L01
 * configuration, and the live maintenance channel. It exists so the contracted
 * affinity, dedicated-session, and dedicated-budget boundaries stay executable
 * with zero database contact: the override supplies synthetic, never-dialed URL
 * placeholders plus a fake pool, and `null` restores production bindings.
 *
 * The carrier is a `globalThis` key so a test can bootstrap the URL
 * placeholders *before* this module is imported (module evaluation constructs
 * both pools once); the setter below then swaps the config and maintenance
 * pool for each test. Production never sets the key.
 */
export type DatabaseClientRuntimeOverrideForTests = Readonly<{
  /** Overrides of the L01-parsed values read by this module's boundaries. */
  config?: Partial<ReturnType<typeof parseDatabaseRuntimeConfig>>;
  /** Synthetic URL placeholder used to construct the primary pool. */
  databaseUrl?: string;
  /** Synthetic URL placeholder used to construct the maintenance pool. */
  maintenanceUrl?: string;
  /** Replacement maintenance pool (fake); the primary pool binding is untouched. */
  maintenanceSqlClient?: Sql;
}>;

export const DATABASE_CLIENT_RUNTIME_OVERRIDE_GLOBAL_KEY =
  "task551DatabaseClientRuntimeOverrideForTests";

/**
 * The lookup reads the carrier key through its literal so module evaluation
 * (which constructs the pools before the const above initializes) can consult
 * the seam without touching an uninitialized binding. The test suite pins the
 * exported constant to this exact literal.
 */
function activeRuntimeOverrideForTests(): DatabaseClientRuntimeOverrideForTests | null {
  const override = (globalThis as Record<string, unknown>)[
    "task551DatabaseClientRuntimeOverrideForTests"
  ];
  if (typeof override !== "object" || override === null) return null;
  return override as DatabaseClientRuntimeOverrideForTests;
}

function activeDatabaseUrlOverrideForTests(): string | null {
  return activeRuntimeOverrideForTests()?.databaseUrl ?? null;
}

function activeMaintenanceUrlOverrideForTests(): string | null {
  return activeRuntimeOverrideForTests()?.maintenanceUrl ?? null;
}

const defaultDatabaseConfig = config;
const defaultMaintenanceSqlClient = maintenanceSqlClient;

/**
 * Installs (or clears) the test-only runtime override and rebinds the parsed
 * configuration and the live maintenance pool to it. Clearing the override
 * restores the production config and maintenance pool exactly.
 */
export function setDatabaseClientRuntimeForTests(
  override: DatabaseClientRuntimeOverrideForTests | null
): void {
  (globalThis as Record<string, unknown>)[DATABASE_CLIENT_RUNTIME_OVERRIDE_GLOBAL_KEY] = override;
  config = override?.config
    ? { ...defaultDatabaseConfig, ...override.config }
    : defaultDatabaseConfig;
  maintenanceSqlClient = override?.maintenanceSqlClient ?? defaultMaintenanceSqlClient;
}
