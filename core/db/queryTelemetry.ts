/**
 * Bun-free bounded database query/pool telemetry sink (TASK-551-02-L02).
 *
 * Stores only fixed-cardinality aggregate counters over closed registries.
 * No SQL text, binds, URLs, driver errors, free-form labels, events, or PII
 * can enter storage: every observation validates family, fingerprint,
 * outcome, and buckets before touching a cell, and unknown members are
 * rejected without allocating anything.
 */

import { TASK551_QUERY_FINGERPRINTS, type QueryFingerprintKey } from "./queryFingerprintRegistry";

export const QUERY_FAMILIES = Object.freeze([
  "point",
  "list",
  "search",
  "aggregate",
  "append",
  "maintenance",
] as const);
export type QueryFamily = (typeof QUERY_FAMILIES)[number];

export const QUERY_OUTCOMES = Object.freeze([
  "success",
  "domain_error",
  "timeout",
  "cancelled",
  "driver_error",
] as const);
export type QueryOutcome = (typeof QUERY_OUTCOMES)[number];

/** Listed maxima plus one overflow bucket each. */
export const QUERY_DURATION_BUCKET_MAX_MS = Object.freeze([
  1, 5, 10, 25, 50, 100, 250, 500, 1_000, 5_000, 15_000,
] as const);
export const ROWS_RETURNED_BUCKET_MAX = Object.freeze([
  0, 1, 10, 50, 100, 500, 1_000, 10_000,
] as const);
export const POOL_WAIT_BUCKET_MAX_MS = Object.freeze([
  1, 5, 10, 25, 50, 100, 250, 500, 1_000, 2_000,
] as const);
export const POOL_OUTCOMES = Object.freeze([
  "available",
  "saturated",
  "timeout",
  "driver_error",
] as const);
export type PoolOutcome = (typeof POOL_OUTCOMES)[number];

export const MAX_COUNTER_VALUE = Number.MAX_SAFE_INTEGER;

export type QueryDurationBucket = number;
export type RowsReturnedBucket = number;
export type PoolWaitBucket = number;

const DURATION_BUCKETS = QUERY_DURATION_BUCKET_MAX_MS.length + 1; // 12
const ROWS_BUCKETS = ROWS_RETURNED_BUCKET_MAX.length + 1; // 9
const POOL_WAIT_BUCKETS = POOL_WAIT_BUCKET_MAX_MS.length + 1; // 11

/** Exactly `6 x 5 x 12 x 9` fixed cells preallocated per registered fingerprint. */
export const QUERY_CELLS_PER_FINGERPRINT =
  QUERY_FAMILIES.length * QUERY_OUTCOMES.length * DURATION_BUCKETS * ROWS_BUCKETS;
/** Exactly `11 x 4` fixed cells for the whole pool registry. */
export const POOL_CELLS = POOL_WAIT_BUCKETS * POOL_OUTCOMES.length;

function closedBucket(value: number, maxima: readonly number[]): number {
  let index = 0;
  while (index < maxima.length && value > maxima[index]) index += 1;
  return index;
}

export type DatabaseQueryMetricSample = Readonly<{
  family: QueryFamily;
  fingerprint: QueryFingerprintKey;
  durationBucket: QueryDurationBucket;
  outcome: QueryOutcome;
  rowsReturnedBucket: RowsReturnedBucket;
}>;

export type PoolHealthSample = Readonly<{
  outcome: PoolOutcome;
  waitBucket: PoolWaitBucket;
}>;

export type DatabaseQueryMetricAggregate = DatabaseQueryMetricSample & {
  readonly count: number;
};

export type DatabasePoolMetricAggregate = PoolHealthSample & {
  readonly count: number;
};

export type DatabaseTelemetrySnapshot = Readonly<{
  queries: readonly DatabaseQueryMetricAggregate[];
  pool: readonly DatabasePoolMetricAggregate[];
}>;

export type DatabaseTelemetrySink = Readonly<{
  observeQuery(sample: DatabaseQueryMetricSample): void;
  observePool(sample: PoolHealthSample): void;
  snapshot(): DatabaseTelemetrySnapshot;
  reset(): void;
}>;

function isValidEnum<T extends string>(value: string, values: readonly T[]): value is T {
  return (values as readonly string[]).includes(value);
}

/**
 * Creates one fixed-cardinality sink: exactly `6 x 5 x 12 x 9` cells per
 * registered fingerprint and exactly `11 x 4` pool cells. Counters saturate at
 * `MAX_COUNTER_VALUE`; `reset()` zeroes every cell in place.
 */
export function createBoundedDatabaseTelemetrySink(): DatabaseTelemetrySink {
  const fingerprintKeys = Object.keys(TASK551_QUERY_FINGERPRINTS);
  // Per-fingerprint layout: family(6) x outcome(5) x duration(12) x rows(9).
  const perFingerprintCells = QUERY_CELLS_PER_FINGERPRINT;
  const queryCounts = new SaturatingCounterArray(fingerprintKeys.length * perFingerprintCells);
  const poolCounts = new SaturatingCounterArray(POOL_CELLS);

  const queryIndex = (sample: DatabaseQueryMetricSample): number => {
    const keyIndex = fingerprintKeys.indexOf(sample.fingerprint);
    if (keyIndex < 0) return -1;
    if (!isValidEnum(sample.family, QUERY_FAMILIES)) return -1;
    if (!isValidEnum(sample.outcome, QUERY_OUTCOMES)) return -1;
    if (
      !Number.isInteger(sample.durationBucket) ||
      sample.durationBucket < 0 ||
      sample.durationBucket >= DURATION_BUCKETS
    )
      return -1;
    if (
      !Number.isInteger(sample.rowsReturnedBucket) ||
      sample.rowsReturnedBucket < 0 ||
      sample.rowsReturnedBucket >= ROWS_BUCKETS
    )
      return -1;
    return (
      keyIndex * perFingerprintCells +
      ((QUERY_FAMILIES.indexOf(sample.family) * QUERY_OUTCOMES.length +
        QUERY_OUTCOMES.indexOf(sample.outcome)) *
        DURATION_BUCKETS +
        sample.durationBucket) *
        ROWS_BUCKETS +
      sample.rowsReturnedBucket
    );
  };

  return Object.freeze({
    observeQuery(sample: DatabaseQueryMetricSample): void {
      const index = queryIndex(sample);
      if (index < 0) return; // Unknown member: rejected, nothing allocated.
      queryCounts.increment(index);
    },
    observePool(sample: PoolHealthSample): void {
      if (!isValidEnum(sample.outcome, POOL_OUTCOMES)) return;
      if (
        !Number.isInteger(sample.waitBucket) ||
        sample.waitBucket < 0 ||
        sample.waitBucket >= POOL_WAIT_BUCKETS
      )
        return;
      const index = POOL_OUTCOMES.indexOf(sample.outcome) * POOL_WAIT_BUCKETS + sample.waitBucket;
      poolCounts.increment(index);
    },
    snapshot(): DatabaseTelemetrySnapshot {
      const queries: DatabaseQueryMetricAggregate[] = [];
      for (let keyIndex = 0; keyIndex < fingerprintKeys.length; keyIndex += 1) {
        const base = keyIndex * perFingerprintCells;
        for (let family = 0; family < QUERY_FAMILIES.length; family += 1) {
          for (let outcome = 0; outcome < QUERY_OUTCOMES.length; outcome += 1) {
            for (let duration = 0; duration < DURATION_BUCKETS; duration += 1) {
              for (let rows = 0; rows < ROWS_BUCKETS; rows += 1) {
                const offset =
                  ((family * QUERY_OUTCOMES.length + outcome) * DURATION_BUCKETS + duration) *
                    ROWS_BUCKETS +
                  rows;
                const count = queryCounts.get(base + offset);
                if (count === 0) continue;
                queries.push({
                  family: QUERY_FAMILIES[family]!,
                  fingerprint: fingerprintKeys[keyIndex]! as QueryFingerprintKey,
                  outcome: QUERY_OUTCOMES[outcome]!,
                  durationBucket: duration,
                  rowsReturnedBucket: rows,
                  count,
                });
              }
            }
          }
        }
      }
      const pool: DatabasePoolMetricAggregate[] = [];
      for (let outcome = 0; outcome < POOL_OUTCOMES.length; outcome += 1) {
        for (let wait = 0; wait < POOL_WAIT_BUCKETS; wait += 1) {
          const count = poolCounts.get(outcome * POOL_WAIT_BUCKETS + wait);
          if (count === 0) continue;
          pool.push({
            outcome: POOL_OUTCOMES[outcome]!,
            waitBucket: wait,
            count,
          });
        }
      }
      return Object.freeze({ queries: Object.freeze(queries), pool: Object.freeze(pool) });
    },
    reset(): void {
      queryCounts.reset();
      poolCounts.reset();
    },
  });
}

/**
 * Saturating counter storage backed by Float64 (safe up to 2^53). Storage is
 * one fixed-length array: it never grows with the number of observations.
 */
export class SaturatingCounterArray {
  private readonly cells: Float64Array;

  constructor(size: number) {
    this.cells = new Float64Array(size); // zero-initialized
  }

  /** Total fixed cell count; bounded memory independent of sample count. */
  get length(): number {
    return this.cells.length;
  }

  increment(index: number): void {
    this.add(index, 1);
  }

  /** Adds `delta` observations to one cell, saturating at MAX_COUNTER_VALUE. */
  add(index: number, delta: number): void {
    const next = this.cells[index]! + delta;
    this.cells[index] = next > MAX_COUNTER_VALUE ? MAX_COUNTER_VALUE : next;
  }

  get(index: number): number {
    return this.cells[index]!;
  }

  reset(): void {
    this.cells.fill(0);
  }
}

/** Bucket helpers shared by measurement wrappers. */
export function toQueryDurationBucket(durationMs: number): QueryDurationBucket {
  return closedBucket(durationMs, QUERY_DURATION_BUCKET_MAX_MS);
}
export function toRowsReturnedBucket(rows: number): RowsReturnedBucket {
  return closedBucket(Math.max(0, Math.trunc(rows)), ROWS_RETURNED_BUCKET_MAX);
}
export function toPoolWaitBucket(waitMs: number): PoolWaitBucket {
  return closedBucket(waitMs, POOL_WAIT_BUCKET_MAX_MS);
}

const TIMEOUT_ERROR_PATTERN =
  /(?:statement_timeout|lock_timeout|idle_in_transaction|idle_session_timeout|query_canceled|timed?\s?out|deadline_exceeded)/i;
const CANCEL_ERROR_PATTERN = /(?:cancel|aborted?|terminat)/i;

/**
 * Maps a rejected operation onto the closed outcome registry. Only bounded
 * enum members leave this module: the raw driver message, statement text,
 * binds, and URLs are inspected for classification and never stored.
 */
export function classifyQueryOutcomeError(error: unknown): QueryOutcome {
  const code =
    typeof error === "object" && error !== null
      ? (error as { code?: unknown; message?: unknown }).code
      : undefined;
  const message =
    typeof error === "object" && error !== null
      ? (error as { code?: unknown; message?: unknown }).message
      : undefined;
  const text = `${typeof code === "string" ? code : ""} ${
    typeof message === "string" ? message : ""
  }`;
  if (TIMEOUT_ERROR_PATTERN.test(text)) return "timeout";
  if (CANCEL_ERROR_PATTERN.test(text)) return "cancelled";
  return "driver_error";
}

/**
 * Measures one explicitly opted-in database operation. The trusted row-count
 * callback converts the result to a closed bucket. Telemetry failure is fully
 * contained: it never replaces the operation's value or error, and the
 * recorded outcome is always one of the closed registry members.
 */
export async function measureDatabaseQuery<T>(
  input: Readonly<{
    family: QueryFamily;
    fingerprint: QueryFingerprintKey;
    run: () => Promise<T>;
    rowsReturned?: (result: T) => number;
  }>,
  sink: DatabaseTelemetrySink | null = databaseTelemetry
): Promise<T> {
  let outcome: QueryOutcome = "success";
  let started: number | null = null;
  try {
    started = Date.now();
    const result = await input.run();
    if (sink) {
      try {
        const rows = input.rowsReturned ? input.rowsReturned(result) : 0;
        sink.observeQuery({
          family: input.family,
          fingerprint: input.fingerprint,
          outcome: "success",
          durationBucket: toQueryDurationBucket(Date.now() - started),
          rowsReturnedBucket: toRowsReturnedBucket(rows),
        });
      } catch {
        // Sink/counting failure never changes the domain result.
      }
    }
    return result;
  } catch (error) {
    outcome = classifyQueryOutcomeError(error);
    if (started !== null && sink) {
      try {
        sink.observeQuery({
          family: input.family,
          fingerprint: input.fingerprint,
          outcome,
          durationBucket: toQueryDurationBucket(Date.now() - started),
          rowsReturnedBucket: 0,
        });
      } catch {
        // Contained.
      }
    }
    throw error;
  }
}

/**
 * Process-wide default sink (fixed-cardinality, sanitized). Measurement
 * wrappers accept an injected sink; production callers default to this one.
 */
export const databaseTelemetry: DatabaseTelemetrySink = createBoundedDatabaseTelemetrySink();

/** Shared bounded reservation deadline for pool acquisition probes. */
export const POOL_ACQUISITION_DEADLINE_MS = 2_000;
