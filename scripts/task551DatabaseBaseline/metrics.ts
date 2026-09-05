export type Task551MetricKind = "point" | "list" | "search" | "aggregate" | "append" | "pool";

export type Task551MeasuredCeiling = Readonly<{
  queryCountMax: 1;
  rowsReadMax: number;
  rowsReturnedMax: 1 | 51 | 101 | 102;
  transferredBytesMax: number;
  sharedBuffersMax: number;
  p50MsMax: number;
  p95MsMax: number;
  p99MsMax: number;
}>;

const MINIMUM_CEILING_MS: Readonly<Record<Task551MetricKind, number>> = {
  point: 1,
  list: 5,
  search: 10,
  aggregate: 10,
  append: 2,
  pool: 5,
};

function invalid(): never {
  throw new Error("database_baseline_invalid");
}

function positiveFinite(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) invalid();
  return value;
}

export function medianOfThree(values: readonly [number, number, number]): number {
  const checked = values.map(positiveFinite).sort((left, right) => left - right);
  return checked[1]!;
}

export function p95SpreadPercent(values: readonly [number, number, number]): number {
  const checked = values.map((value) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) invalid();
    return value;
  });
  if (checked.every((value) => value === 0)) return 0;
  const median = [...checked].sort((left, right) => left - right)[1]!;
  return ((Math.max(...checked) - Math.min(...checked)) / Math.max(median, 0.1)) * 100;
}

export function ceilToTenthMillisecond(value: number): number {
  const checked = positiveFinite(value);
  return Math.ceil(checked * 10) / 10;
}

export function freezeCeiling(
  kind: Task551MetricKind,
  medianRepetitionPercentileMs: number
): number {
  if (!(kind in MINIMUM_CEILING_MS)) invalid();
  const median = positiveFinite(medianRepetitionPercentileMs);
  return ceilToTenthMillisecond(Math.max(MINIMUM_CEILING_MS[kind], median * 1.25));
}

export function assertMeasuredCeiling(value: unknown): Task551MeasuredCeiling {
  if (value === null || typeof value !== "object" || Array.isArray(value)) invalid();
  const record = value as Record<string, unknown>;
  const keys = [
    "queryCountMax",
    "rowsReadMax",
    "rowsReturnedMax",
    "transferredBytesMax",
    "sharedBuffersMax",
    "p50MsMax",
    "p95MsMax",
    "p99MsMax",
  ] as const;
  const ownKeys = Reflect.ownKeys(record);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string" || !keys.includes(key as (typeof keys)[number]))
  )
    invalid();
  if (record.queryCountMax !== 1) invalid();
  const rowsReturnedMax = record.rowsReturnedMax;
  if (
    rowsReturnedMax !== 1 &&
    rowsReturnedMax !== 51 &&
    rowsReturnedMax !== 101 &&
    rowsReturnedMax !== 102
  )
    invalid();
  return {
    queryCountMax: 1,
    rowsReadMax: positiveFinite(record.rowsReadMax),
    rowsReturnedMax,
    transferredBytesMax: positiveFinite(record.transferredBytesMax),
    sharedBuffersMax: positiveFinite(record.sharedBuffersMax),
    p50MsMax: positiveFinite(record.p50MsMax),
    p95MsMax: positiveFinite(record.p95MsMax),
    p99MsMax: positiveFinite(record.p99MsMax),
  };
}

export function assertP95SpreadWithinBudget(
  values: readonly [number, number, number],
  maximumPercent = 20
): void {
  const checkedMaximum = positiveFinite(maximumPercent);
  if (p95SpreadPercent(values) > checkedMaximum) invalid();
}
