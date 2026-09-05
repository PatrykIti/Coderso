/**
 * TASK-551-02-L03 real-pool telemetry gate (bun lane, requires DATABASE_URL).
 *
 * This file is the leaf's sole writer surface. It consumes TASK-551-02-L02's
 * closed public APIs -- `measureDatabaseQuery`, `databaseTelemetry`, and
 * `probeDatabasePoolHealth` -- through one scoped fixture operation against
 * the real configured pool. It adds no production caller, edits no registry,
 * and asserts no coverage for production callers owned by other leaves.
 *
 * Execution contract: importing `core/db/client` constructs the real pool, so
 * a run without a reachable DATABASE_URL fails closed with
 * `database_url_missing`. The one database binding is supplied only by
 * TASK-551-11's owner-injected `task551-db-test` map; this leaf never loads,
 * maps, or inspects an environment source and never reads `process.env`.
 *
 * Sanitization: telemetry labels are closed registry fingerprints only. The
 * fixture statements, the driver error, and the connection URL stay in memory
 * and never enter a telemetry snapshot, a log line, or an assertion message.
 */
import { describe, expect, test } from "bun:test";
import type { ReservedSql, Sql } from "postgres";

import { listDatabaseClients, probeDatabasePoolHealth } from "../../core/db/client";
import {
  TASK551_QUERY_FINGERPRINTS,
  type QueryFingerprintKey,
} from "../../core/db/queryFingerprintRegistry";
import {
  POOL_ACQUISITION_DEADLINE_MS,
  POOL_CELLS,
  POOL_OUTCOMES,
  POOL_WAIT_BUCKET_MAX_MS,
  QUERY_CELLS_PER_FINGERPRINT,
  QUERY_DURATION_BUCKET_MAX_MS,
  QUERY_FAMILIES,
  QUERY_OUTCOMES,
  ROWS_RETURNED_BUCKET_MAX,
  databaseTelemetry,
  measureDatabaseQuery,
  toRowsReturnedBucket,
  type DatabasePoolMetricAggregate,
  type DatabaseTelemetrySnapshot,
  type QueryFamily,
  type QueryOutcome,
  type RowsReturnedBucket,
} from "../../core/db/queryTelemetry";
import { PLANNED_QUERY_FINGERPRINT_REGISTRY } from "./fixtures/task551QueryInventory";

/**
 * One reviewed point-read fingerprint of the TASK-551-01 inventory, transcribed
 * into L02's production registry. It labels the fixture observations only: it
 * is never derived from the fixture statements, binds, or input, and it claims
 * nothing about the production callers owned by other leaves.
 */
const FINGERPRINT: QueryFingerprintKey = "cache_outbox_oldest_unprocessed";
/** The measured family is a closed `QUERY_FAMILIES` member, pinned below. */
const FAMILY: QueryFamily = "point";

/** Contracted minimum for the real test pool (>=2 reservable sessions). */
const MINIMUM_TEST_POOL_SESSIONS = 2;

/**
 * Bounded deadline of the pool-returns-to-idle proof: twice the shared
 * acquisition deadline, still fail-closed and still far below the family's
 * 4,500 ms cancellation ceiling.
 */
const POOL_DRAIN_PROOF_DEADLINE_MS = POOL_ACQUISITION_DEADLINE_MS * 2;

/** Closed bucket counts derived from the registries (maxima plus overflow). */
const DURATION_BUCKET_COUNT = QUERY_DURATION_BUCKET_MAX_MS.length + 1; // 12
const ROWS_BUCKET_COUNT = ROWS_RETURNED_BUCKET_MAX.length + 1; // 9
const POOL_WAIT_BUCKET_COUNT = POOL_WAIT_BUCKET_MAX_MS.length + 1; // 11

/** Closed failure codes of this leaf; no driver detail or statement text. */
const POOL_TELEMETRY_TEST_CODES = {
  fixtureRowShape: "task551_l03_fixture_row_shape",
  fixtureDidNotFail: "task551_l03_fixture_operation_did_not_fail",
  drainDeadlineExceeded: "task551_l03_pool_drain_deadline_exceeded",
} as const;

/**
 * Sentinels that must never appear in a snapshot: statement text, bind
 * placeholders, connection URLs, and credential material.
 */
const SNAPSHOT_FORBIDDEN_MARKERS = Object.freeze([
  "postgres://",
  "postgresql://",
  "select ",
  "insert ",
  "update ",
  "delete from",
  "$1",
  "password",
] as const);

/**
 * The primary pool is always the first client of L02's close list; the probe
 * below reserves from that same module-level pool, so reserving every
 * configured session proves the pool returned to idle.
 */
const primaryPool: Sql = listDatabaseClients()[0]!;

type PoolFixtureRow = Readonly<{ one: number }>;

/**
 * Scoped fixture operation: one bounded, parameter-free statement on the real
 * configured pool. It exists only for this leaf's measurement -- it is not a
 * production caller, and its statement text never reaches telemetry or this
 * file's output.
 */
async function runScopedPoolFixtureOperation(): Promise<readonly PoolFixtureRow[]> {
  const rows = (await primaryPool`select 1 as one`) as unknown as readonly PoolFixtureRow[];
  if (rows.length !== 1 || rows[0]?.one !== 1) {
    throw new Error(POOL_TELEMETRY_TEST_CODES.fixtureRowShape);
  }
  return rows;
}

/**
 * Deliberately failing fixture operation: one deterministic server-side
 * division by zero. The driver error is reclassified to the closed
 * `driver_error` outcome and rethrown unchanged; its message and code stay in
 * memory and never reach a snapshot or this file's output.
 */
async function runFailingPoolFixtureOperation(): Promise<never> {
  await primaryPool`select 1 / 0 as zero`;
  throw new Error(POOL_TELEMETRY_TEST_CODES.fixtureDidNotFail);
}

type ExpectedQueryAggregate = Readonly<{
  family: QueryFamily;
  fingerprint: QueryFingerprintKey;
  outcome: QueryOutcome;
  rowsReturnedBucket: RowsReturnedBucket;
  count: number;
}>;

type ExpectedSnapshot = Readonly<{
  queries: readonly ExpectedQueryAggregate[];
  pool: readonly DatabasePoolMetricAggregate[];
}>;

/**
 * Exact closed-snapshot assertion. Every deterministic axis (family,
 * fingerprint, outcome, returned-row bucket, count) must match exactly and no
 * extra aggregate may exist. Only the duration axis of a query aggregate and
 * the wait axis of a pool aggregate are wall-clock inside L02's implementation
 * (`Date.now()` re-read on the sink path), so those two axes are pinned to
 * their closed bucket ranges instead of a single value; nothing else is loose.
 */
function assertExactClosedSnapshot(
  snapshot: DatabaseTelemetrySnapshot,
  expected: ExpectedSnapshot
): void {
  expect(snapshot.queries).toHaveLength(expected.queries.length);
  for (const expectedAggregate of expected.queries) {
    const matches = snapshot.queries.filter(
      (aggregate) =>
        aggregate.family === expectedAggregate.family &&
        aggregate.fingerprint === expectedAggregate.fingerprint &&
        aggregate.outcome === expectedAggregate.outcome &&
        aggregate.rowsReturnedBucket === expectedAggregate.rowsReturnedBucket
    );
    expect(matches).toHaveLength(1);
    const aggregate = matches[0]!;
    expect(aggregate.count).toBe(expectedAggregate.count);
    expect(Number.isInteger(aggregate.durationBucket)).toBe(true);
    expect(aggregate.durationBucket).toBeGreaterThanOrEqual(0);
    expect(aggregate.durationBucket).toBeLessThan(DURATION_BUCKET_COUNT);
    expect(Number.isInteger(aggregate.rowsReturnedBucket)).toBe(true);
    expect(aggregate.rowsReturnedBucket).toBeGreaterThanOrEqual(0);
    expect(aggregate.rowsReturnedBucket).toBeLessThan(ROWS_BUCKET_COUNT);
  }

  expect(snapshot.pool).toHaveLength(expected.pool.length);
  for (const expectedAggregate of expected.pool) {
    const matches = snapshot.pool.filter(
      (aggregate) => aggregate.outcome === expectedAggregate.outcome
    );
    expect(matches).toHaveLength(1);
    const aggregate = matches[0]!;
    expect(aggregate.count).toBe(expectedAggregate.count);
    expect(Number.isInteger(aggregate.waitBucket)).toBe(true);
    expect(aggregate.waitBucket).toBeGreaterThanOrEqual(0);
    expect(aggregate.waitBucket).toBeLessThan(POOL_WAIT_BUCKET_COUNT);
  }

  // Frozen snapshots: no later observation can rewrite what was asserted.
  expect(Object.isFrozen(snapshot)).toBe(true);
  expect(Object.isFrozen(snapshot.queries)).toBe(true);
  expect(Object.isFrozen(snapshot.pool)).toBe(true);
}

/**
 * Bounded wait helper: the loser of the race keeps no timer behind and its
 * rejection stays handled, so a stalled acquisition fails closed at the
 * deadline instead of hanging the gate.
 */
function withDeadline<T>(promise: Promise<T>, deadlineMs: number, code: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(code)), deadlineMs);
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

/**
 * Pool-returns-to-idle proof: every one of the configured sessions can be
 * reserved again inside a bounded deadline, so the probe released the session
 * it reserved in `finally`. Any session leaked outside a `finally` leaves one
 * slot unreservable and fails the deadline instead of hanging the gate.
 */
async function assertEveryReservedTestSessionReleased(): Promise<void> {
  const maxSessions = primaryPool.options.max;
  expect(maxSessions).toBeGreaterThanOrEqual(MINIMUM_TEST_POOL_SESSIONS);

  const reserved: ReservedSql[] = [];
  try {
    const acquisitions = Array.from({ length: maxSessions }, () =>
      primaryPool.reserve().then((session) => {
        reserved.push(session);
        return session;
      })
    );
    await withDeadline(
      Promise.all(acquisitions),
      // One acquisition already proved fast (the probe above records
      // available/saturated), so the whole-pool reservation gets twice the
      // shared deadline: still bounded and fail-closed, but not sensitive to
      // the physical session count of the owner's fixture pool.
      POOL_DRAIN_PROOF_DEADLINE_MS,
      POOL_TELEMETRY_TEST_CODES.drainDeadlineExceeded
    );
    expect(reserved).toHaveLength(maxSessions);
  } finally {
    for (const session of reserved.splice(0, reserved.length)) {
      session.release();
    }
  }
}

describe("task551 pool telemetry real-pool gate", () => {
  test("consumes only L02's closed public surface through one reviewed fingerprint", () => {
    expect(typeof measureDatabaseQuery).toBe("function");
    expect(typeof probeDatabasePoolHealth).toBe("function");
    expect(typeof databaseTelemetry.snapshot).toBe("function");
    expect(typeof databaseTelemetry.reset).toBe("function");

    // The closed axes this leaf asserts on.
    expect(QUERY_FAMILIES).toContain(FAMILY);
    expect(QUERY_OUTCOMES).toContain("success");
    expect(QUERY_OUTCOMES).toContain("driver_error");
    expect(POOL_OUTCOMES).toContain("available");
    expect(POOL_OUTCOMES).toContain("saturated");

    // The fixed-cell context of every snapshot asserted below.
    expect(QUERY_CELLS_PER_FINGERPRINT).toBe(6 * 5 * 12 * 9);
    expect(POOL_CELLS).toBe(11 * 4);

    // Exactly one reviewed registry fingerprint labels the fixture operation:
    // present in the production registry, canonically valued, and already
    // reviewed in the TASK-551-01 inventory fixture. Nothing is authored here.
    expect(FINGERPRINT in TASK551_QUERY_FINGERPRINTS).toBe(true);
    expect(TASK551_QUERY_FINGERPRINTS[FINGERPRINT]).toBe(FINGERPRINT);
    expect(FINGERPRINT in PLANNED_QUERY_FINGERPRINT_REGISTRY).toBe(true);

    // The real configured pool must hold the contracted minimum capacity, and
    // the probe deadline this leaf reuses for its drain proof stays pinned.
    expect(listDatabaseClients().length).toBeGreaterThan(0);
    expect(primaryPool.options.max).toBeGreaterThanOrEqual(MINIMUM_TEST_POOL_SESSIONS);
    expect(POOL_ACQUISITION_DEADLINE_MS).toBe(2_000);
  });

  test("records one successful scoped operation as exact closed aggregates", async () => {
    databaseTelemetry.reset();

    const value = await measureDatabaseQuery({
      family: FAMILY,
      fingerprint: FINGERPRINT,
      // The test-bound operation runs on the real configured pool. It adds no
      // production caller and derives no fingerprint from SQL, binds, or input.
      run: runScopedPoolFixtureOperation,
      rowsReturned: () => 1,
    });
    expect(value).toHaveLength(1);
    expect(value[0]?.one).toBe(1);

    assertExactClosedSnapshot(databaseTelemetry.snapshot(), {
      queries: [
        {
          family: FAMILY,
          fingerprint: FINGERPRINT,
          outcome: "success",
          rowsReturnedBucket: toRowsReturnedBucket(1),
          count: 1,
        },
      ],
      pool: [],
    });
  });

  test("records driver_error and preserves the original driver error identity", async () => {
    databaseTelemetry.reset();

    let thrownByOperation: unknown = null;
    let captured: unknown = null;
    try {
      await measureDatabaseQuery({
        family: FAMILY,
        fingerprint: FINGERPRINT,
        run: async () => {
          try {
            await runFailingPoolFixtureOperation();
          } catch (error) {
            thrownByOperation = error;
            throw error;
          }
        },
      });
    } catch (error) {
      captured = error;
    }

    // The exact object the driver threw is what the caller receives, and the
    // failure is stored only as the closed `driver_error` outcome on the
    // overflow-free returned-row bucket.
    expect(thrownByOperation).not.toBeNull();
    expect(captured).toBe(thrownByOperation);

    assertExactClosedSnapshot(databaseTelemetry.snapshot(), {
      queries: [
        {
          family: FAMILY,
          fingerprint: FINGERPRINT,
          outcome: "driver_error",
          rowsReturnedBucket: 0,
          count: 1,
        },
      ],
      pool: [],
    });
  });

  test("probes once, records one bounded sample, and returns every session to idle", async () => {
    databaseTelemetry.reset();

    const sample: Awaited<ReturnType<typeof probeDatabasePoolHealth>> =
      await probeDatabasePoolHealth();

    // A reachable real test pool answers inside the shared deadline, so the
    // closed verdict is the wait/saturation boundary and never a driver fault.
    expect(POOL_OUTCOMES).toContain(sample.outcome);
    expect(sample.outcome === "available" || sample.outcome === "saturated").toBe(true);
    expect(Number.isInteger(sample.waitBucket)).toBe(true);
    expect(sample.waitBucket).toBeGreaterThanOrEqual(0);
    expect(sample.waitBucket).toBeLessThan(POOL_WAIT_BUCKET_COUNT);

    assertExactClosedSnapshot(databaseTelemetry.snapshot(), {
      queries: [],
      pool: [{ outcome: sample.outcome, waitBucket: sample.waitBucket, count: 1 }],
    });

    await assertEveryReservedTestSessionReleased();
  });

  test("keeps statements, binds, and URLs out of the snapshot labels", async () => {
    databaseTelemetry.reset();

    await measureDatabaseQuery({
      family: FAMILY,
      fingerprint: FINGERPRINT,
      run: runScopedPoolFixtureOperation,
      rowsReturned: () => 1,
    });
    await probeDatabasePoolHealth();

    const snapshot = databaseTelemetry.snapshot();
    expect(snapshot.queries.length).toBeGreaterThan(0);
    expect(snapshot.pool).toHaveLength(1);

    // Structural closure: an aggregate carries exactly the closed axes, so no
    // free-form payload (statement, bind, URL, error, or label) can ride along.
    for (const aggregate of snapshot.queries) {
      expect(Object.keys(aggregate).sort()).toEqual([
        "count",
        "durationBucket",
        "family",
        "fingerprint",
        "outcome",
        "rowsReturnedBucket",
      ]);
      expect(Object.keys(TASK551_QUERY_FINGERPRINTS)).toContain(aggregate.fingerprint);
      expect(QUERY_FAMILIES).toContain(aggregate.family);
      expect(QUERY_OUTCOMES).toContain(aggregate.outcome);
    }
    for (const aggregate of snapshot.pool) {
      expect(Object.keys(aggregate).sort()).toEqual(["count", "outcome", "waitBucket"]);
      expect(POOL_OUTCOMES).toContain(aggregate.outcome);
    }

    // Sentinel sweep over the fully serialized snapshot.
    const serialized = JSON.stringify(snapshot) ?? "";
    for (const marker of SNAPSHOT_FORBIDDEN_MARKERS) {
      expect(serialized.includes(marker)).toBe(false);
    }
  });
});
