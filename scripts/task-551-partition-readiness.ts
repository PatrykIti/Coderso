/**
 * TASK-551-06-L03 partition-readiness check CLI (`--check`).
 *
 * Thin, fail-closed facade over
 * `core/services/maintenance/partitionReadinessService.inspectPartitionReadiness`
 * (doc :112-115 pseudocode, :172-181 Partition Decision Contract, :238-240
 * testing requirements, :367-372 dispatch envelope). All inspection logic —
 * the compile-time allowlisted table registry, the catalog/aggregate reads,
 * the threshold classification and the sanitization — lives in the service.
 * This file owns only the argv grammar, the output location, the stable
 * exit-code map and redacted error reporting; it never sees a table name,
 * a SQL fragment or a path from its caller.
 *
 * INVOCATION (envelope form): `bun --env-file=/dev/null
 * scripts/task-551-partition-readiness.ts --check`. The argv grammar is
 * closed: exactly one `--check` token and nothing else. Any other token —
 * unknown flag, positional table name, SQL fragment, output path — is
 * refused with the usage line on stderr and exit code 1 before any database
 * contact. There is no caller-selectable output location (stdout is the only
 * sink) and no caller-selectable table set.
 *
 * Database configuration is consumed exactly the way core consumes it: the
 * core client module is imported lazily inside the guarded run and parses
 * `process.env` itself. This file never reads the environment, never sources
 * `.env` (the runner profile injects `DATABASE_URL`), and never renders or
 * logs a configuration value.
 *
 * OUTPUT: exactly one JSON line on stdout for a completed inspection —
 * status `observe` (every allowlisted table classifies below the planning
 * threshold, exit 0) or status `plan` (at least one table justifies a future
 * partition migration, always planned as a separate task, exit 2). The
 * relayed `report` value is the service's own sanitized output: table
 * identifiers, aggregate counts/sizes, timings, status — never row samples,
 * content, binds, URLs, credentials or tokens. Every failure path prints to
 * stderr only and stays sanitized: the usage line for argv refusals, else
 * one JSON line carrying a stable code — `partition_readiness_unavailable`
 * when the service raises its own typed inspection failure (its stable leaf
 * reason token, e.g. `catalog_read_failed`, is relayed whole as the reason)
 * or the relayed report shape fails the seam guard,
 * `partition_readiness_unexpected` only for genuinely untyped failures —
 * plus at most a leaf-namespaced reason slug. Raw driver/database error text
 * never prints.
 *
 * FACADE/SERVICE SEAM: the relayed report must expose a non-empty `tables`
 * array whose every row names one allowlisted registry id and carries the
 * service's own `observe`/`plan` status — keyed `status`, the key the service
 * actually emits (doc :298-310), which the facade projects onto its
 * `classification` shape. The facade trusts the service for sanitization, not
 * for shape: any other shape — a row outside the registry id set included —
 * fails closed as `partition_readiness_unavailable` instead of being relayed
 * or guessed at.
 *
 * MIGRATION SAFETY: the check is read-only by construction. It issues zero
 * partition-migration statements and zero destructive statements; it can
 * only relay the service's classification. This source carries no
 * structural-migration vocabulary, the same guard expectation as the
 * service.
 */
import {
  PARTITION_READINESS_TABLE_IDS,
  PartitionReadinessError,
  inspectPartitionReadiness,
} from "../core/services/maintenance/partitionReadinessService";

/** Stable output envelope identifiers (house `coderso.task551.*@v1` form). */
const REPORT_SCHEMA = "coderso.task551.partition-readiness-check@v1" as const;
const REPORT_TASK_ID = "TASK-551-06-L03" as const;
const REPORT_CHECK = "partition-readiness-check" as const;

/**
 * Stable, printable codes. `partition_readiness_unavailable` is the
 * contract-pinned inspection failure code (doc :158) and covers both the
 * service's typed `PartitionReadinessError` and this facade's own
 * report-shape refusal; `partition_readiness_unexpected` is reserved for
 * genuinely untyped failures. Raw error text is never printed beside them.
 */
const CODE_UNAVAILABLE = "partition_readiness_unavailable" as const;
const CODE_UNEXPECTED = "partition_readiness_unexpected" as const;
const CODE_REPORT_INVALID = "partition_readiness_report_invalid" as const;
const CODE_ARGV_INVALID = "partition_readiness_argv_invalid" as const;

/** Stable exit-code map: observe passes; plan and every failure fail closed. */
export const PARTITION_READINESS_EXIT_CODES = Object.freeze({
  observe: 0,
  argvInvalid: 1,
  plan: 2,
  unavailable: 3,
  unexpected: 4,
} as const);

const USAGE_LINE =
  "usage: bun --env-file=/dev/null scripts/task-551-partition-readiness.ts --check" as const;

/** Budget for ending the core pool after the inspection (best-effort). */
const DB_CLOSE_BUDGET_MS = 2_000 as const;

/** Only leaf-namespaced slugs survive redaction; any other message text does not. */
const PRINTABLE_REASON = /^partition_[a-z0-9_]+/;

export type PartitionReadinessTableClassification = "observe" | "plan";

/** The one table-row shape this facade derives decisions from. */
export type PartitionReadinessClassifiedTable = Readonly<{
  table: string;
  classification: PartitionReadinessTableClassification;
}>;

type PartitionReadinessServiceReport = Awaited<ReturnType<typeof inspectPartitionReadiness>>;

/**
 * The row shape the service actually emits (doc :298-310): the classification
 * is keyed `status`, and the identifier is a closed registry id.
 */
type PartitionReadinessServiceTableRow = Readonly<{
  table: string;
  status: PartitionReadinessTableClassification;
}>;

export type PartitionReadinessCheckReport = Readonly<{
  schema: typeof REPORT_SCHEMA;
  taskId: typeof REPORT_TASK_ID;
  check: typeof REPORT_CHECK;
  status: "observe" | "plan";
  tableCount: number;
  planTables: readonly string[];
  report: PartitionReadinessServiceReport;
}>;

export type PartitionReadinessCheckFailure = Readonly<{
  schema: typeof REPORT_SCHEMA;
  taskId: typeof REPORT_TASK_ID;
  check: typeof REPORT_CHECK;
  status: "failed";
  code: typeof CODE_UNAVAILABLE | typeof CODE_UNEXPECTED;
  reason?: string;
}>;

/** Facade refusal carrying a single stable, printable slug — never raw detail. */
export class PartitionReadinessCheckError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(reason);
    this.name = "PartitionReadinessCheckError";
    this.reason = reason;
  }
}

/**
 * Closed argv grammar (doc :367-372 envelope form): exactly one `--check`
 * and nothing else. A second `--check`, an unknown flag, a positional table
 * name, a SQL fragment or an output path is a refusal, before any database
 * contact.
 */
export const parsePartitionReadinessArgv = (argv: readonly string[]): Readonly<{ check: true }> => {
  let check = false;
  for (const token of argv) {
    if (token === "--check" && !check) {
      check = true;
      continue;
    }
    throw new PartitionReadinessCheckError(CODE_ARGV_INVALID);
  }
  if (!check) throw new PartitionReadinessCheckError(CODE_ARGV_INVALID);
  return Object.freeze({ check: true as const });
};

const isClassification = (value: unknown): value is PartitionReadinessTableClassification =>
  value === "observe" || value === "plan";

const isServiceTableRow = (value: unknown): value is PartitionReadinessServiceTableRow => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Readonly<Record<string, unknown>>;
  return (
    typeof candidate.table === "string" &&
    // Registry drift fails closed here too: only ids the service itself
    // allowlists (its frozen id set) may reach a derived decision.
    PARTITION_READINESS_TABLE_IDS.includes(candidate.table) &&
    isClassification(candidate.status)
  );
};

/**
 * Facade/service seam guard (see header): a completed inspection must expose
 * a non-empty `tables` array of service rows — registry ids only, each with
 * one `observe`/`plan` status. Anything else is an unavailable inspection,
 * never a relayed guess. Rows are projected onto the facade's
 * `classification` shape.
 */
export const readClassifiedTables = (
  report: unknown
): readonly PartitionReadinessClassifiedTable[] => {
  const tables =
    typeof report === "object" && report !== null
      ? (report as Readonly<Record<string, unknown>>).tables
      : undefined;
  if (!Array.isArray(tables) || tables.length === 0 || !tables.every(isServiceTableRow)) {
    throw new PartitionReadinessCheckError(CODE_REPORT_INVALID);
  }
  // Runtime-validated above; this cast only restores the row type the guard
  // proved (house documented-cast discipline).
  return Object.freeze(
    (tables as readonly PartitionReadinessServiceTableRow[]).map((row) =>
      Object.freeze({ table: row.table, classification: row.status })
    )
  );
};

/**
 * One guarded inspection: lazily import the core client (it parses
 * `process.env` itself), run the service, always end the pool within a small
 * budget, then derive the stable status from the sanitized report. The pool
 * close is best-effort and never masks the inspection outcome.
 */
export const runPartitionReadinessCheck = async (): Promise<PartitionReadinessCheckReport> => {
  const { db, closeAllDatabaseClientsWithin } = await import("../core/db/client");
  try {
    const serviceReport = await inspectPartitionReadiness(db);
    const tables = readClassifiedTables(serviceReport);
    const planTables = Object.freeze(
      tables.filter((table) => table.classification === "plan").map((table) => table.table)
    );
    return Object.freeze({
      schema: REPORT_SCHEMA,
      taskId: REPORT_TASK_ID,
      check: REPORT_CHECK,
      status: planTables.length > 0 ? ("plan" as const) : ("observe" as const),
      tableCount: tables.length,
      planTables,
      report: serviceReport,
    });
  } finally {
    try {
      await closeAllDatabaseClientsWithin(DB_CLOSE_BUDGET_MS);
    } catch {
      // A close failure must not mask the inspection outcome.
    }
  }
};

/** Only leaf-namespaced slugs survive redaction; raw error text never prints. */
const printableReason = (error: unknown): string | undefined => {
  const message = error instanceof Error ? error.message : undefined;
  return message === undefined ? undefined : PRINTABLE_REASON.exec(message)?.[0];
};

/**
 * One JSON line per outcome: the report to stdout for a completed inspection
 * (exit 0 observe / exit 2 plan), the usage line or a sanitized failure code
 * to stderr otherwise. Returns the process exit code.
 */
export const main = async (argv: readonly string[]): Promise<number> => {
  try {
    parsePartitionReadinessArgv(argv);
  } catch {
    process.stderr.write(`${USAGE_LINE}\n`);
    return PARTITION_READINESS_EXIT_CODES.argvInvalid;
  }
  try {
    const report = await runPartitionReadinessCheck();
    process.stdout.write(`${JSON.stringify(report)}\n`);
    return report.status === "plan"
      ? PARTITION_READINESS_EXIT_CODES.plan
      : PARTITION_READINESS_EXIT_CODES.observe;
  } catch (error) {
    // The service's typed inspection failure and this facade's own refusals
    // are both `unavailable` (exit 3); anything genuinely untyped stays
    // `unexpected` (exit 4).
    const unavailable =
      error instanceof PartitionReadinessError || error instanceof PartitionReadinessCheckError;
    // Typed failures carry their own stable leaf reason token
    // (`catalog_read_failed`, `table_not_allowlisted`, ...); relay it whole
    // instead of truncating it to the leading code slug. Untyped failures
    // still pass through the leaf-slug redaction filter.
    const reason = unavailable
      ? // Documented cast: `unavailable` just proved the error is one of the
        // two typed failures, both of which expose `.reason`.
        (error as PartitionReadinessError | PartitionReadinessCheckError).reason
      : printableReason(error);
    const failure: PartitionReadinessCheckFailure = Object.freeze({
      schema: REPORT_SCHEMA,
      taskId: REPORT_TASK_ID,
      check: REPORT_CHECK,
      status: "failed" as const,
      code: unavailable ? CODE_UNAVAILABLE : CODE_UNEXPECTED,
      ...(reason === undefined ? {} : { reason }),
    });
    process.stderr.write(`${JSON.stringify(failure)}\n`);
    return unavailable
      ? PARTITION_READINESS_EXIT_CODES.unavailable
      : PARTITION_READINESS_EXIT_CODES.unexpected;
  }
};

// Envelope form (see header): `bun --env-file=/dev/null <this file> --check`.
if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
