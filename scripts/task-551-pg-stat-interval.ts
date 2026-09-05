/**
 * Read-only `pg_stat_statements` interval collector (TASK-551-02-L02).
 *
 * Owns the executable pre-decision/before/after interval receipt pair. It
 * never calls `pg_stat_statements_reset()`, never treats cumulative counters
 * as a named interval, and holds statement text only long enough to normalize
 * and SHA-256 it against the closed TASK-551 fingerprint registry. Snapshots
 * are strict canonical JSON bounded to 4 MiB written with mode 0600 and carry
 * no statement text, binds, role name, application name, URL, host, database
 * name, error text, or row data.
 *
 * Exact commands:
 *   bun scripts/task-551-pg-stat-interval.ts start --name <name> --purpose <purpose>
 *     --snapshot .tmp/task551-pg-stat-<name>-start.json
 *     --operator-evidence .tmp/task551-pg-stat-operator-evidence.json
 *   bun scripts/task-551-pg-stat-interval.ts end --name <name> --purpose <purpose>
 *     --start .tmp/task551-pg-stat-<name>-start.json
 *     --receipt .tmp/task551-pg-stat-<name>.json
 *     --operator-evidence .tmp/task551-pg-stat-operator-evidence.json
 *
 * All DB access happens only when the CLI is invoked (`import.meta.main`);
 * importing this module as a library performs no I/O and opens no connection.
 */
import { createHash } from "node:crypto";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { TASK551_QUERY_FINGERPRINT_DEFINITIONS } from "../core/db/queryFingerprintRegistry";

// ---------------------------------------------------------------------------
// Closed constants and pure validation
// ---------------------------------------------------------------------------

export const PG_STAT_INTERVAL_ERROR_CODES = {
  unknownFlag: "pg_stat_interval_flag_unknown",
  namePurposeMismatch: "pg_stat_interval_name_purpose_mismatch",
  outputPathInvalid: "pg_stat_interval_output_path_invalid",
  intervalReused: "pg_stat_interval_reused",
  intervalInvalid: "pg_stat_interval_invalid",
  identityChanged: "pg_stat_interval_identity_changed",
  counterRegression: "pg_stat_interval_counter_regression",
  boundsExceeded: "pg_stat_interval_bounds_exceeded",
  evidenceInvalid: "pg_stat_interval_evidence_invalid",
} as const;

export type TrafficSourceClass =
  "application" | "migration" | "maintenance" | "external_diagnostic" | "unknown";

export const TRAFFIC_SOURCE_CLASSES: readonly TrafficSourceClass[] = [
  "application",
  "migration",
  "maintenance",
  "external_diagnostic",
  "unknown",
];

/** Closed name -> purpose matrix owned by this leaf and L05. */
export const INTERVAL_NAME_PURPOSES: Readonly<Record<string, "pre-decision" | "before" | "after">> =
  Object.freeze({
    "task551-predecision-clean": "pre-decision",
    "task551-index-before": "before",
    "task551-index-after": "after",
  });

export const MAX_INTERVAL_ROWS = 10_000;
export const MAX_SNAPSHOT_BYTES = 4 * 1024 * 1024;
export const STATEMENT_TIMEOUT_MS = 5_000;

export function expectedStartPath(name: string): string {
  return `.tmp/task551-pg-stat-${name}-start.json`;
}
export function expectedReceiptPath(name: string): string {
  return `.tmp/task551-pg-stat-${name}.json`;
}
export const EXPECTED_OPERATOR_EVIDENCE_PATH = ".tmp/task551-pg-stat-operator-evidence.json";

function fail(code: string, detail?: string): never {
  throw new Error(detail ? `${code}: ${detail}` : code);
}

export interface CliSpec {
  readonly command: string;
  readonly flags: Readonly<Record<string, string>>;
}

/**
 * Strict argument parser: rejects unknown flags and missing values. Only the
 * exact flag surface of the contract is accepted.
 */
export function parseIntervalArgs(argv: readonly string[]): CliSpec {
  const allowed = new Set([
    "--name",
    "--purpose",
    "--snapshot",
    "--start",
    "--receipt",
    "--operator-evidence",
  ]);
  const command = argv[0];
  if (command !== "start" && command !== "end") {
    fail(PG_STAT_INTERVAL_ERROR_CODES.unknownFlag, String(command ?? ""));
  }
  const flags: Record<string, string> = {};
  for (let i = 1; i < argv.length; i += 2) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!flag || !allowed.has(flag) || value === undefined) {
      fail(PG_STAT_INTERVAL_ERROR_CODES.unknownFlag, String(flag ?? ""));
    }
    flags[flag] = value;
  }
  return { command, flags };
}

/** Validates the closed name/purpose pairing and output-path contract. */
export function validateCliSpec(spec: CliSpec): void {
  const expectedPurpose = INTERVAL_NAME_PURPOSES[spec.flags["--name"] ?? ""];
  if (!expectedPurpose || spec.flags["--purpose"] !== expectedPurpose) {
    fail(
      PG_STAT_INTERVAL_ERROR_CODES.namePurposeMismatch,
      `${spec.flags["--name"]} ${spec.flags["--purpose"]}`
    );
  }
  const outputs = spec.command === "start" ? ["--snapshot"] : ["--receipt"];
  for (const flag of outputs) {
    const expected =
      flag === "--snapshot"
        ? expectedStartPath(spec.flags["--name"]!)
        : expectedReceiptPath(spec.flags["--name"]!);
    if (spec.flags[flag] !== expected) {
      fail(PG_STAT_INTERVAL_ERROR_CODES.outputPathInvalid, spec.flags[flag] ?? "");
    }
  }
  if (
    spec.flags["--operator-evidence"] !== EXPECTED_OPERATOR_EVIDENCE_PATH &&
    spec.flags["--operator-evidence"] !== undefined
  ) {
    fail(PG_STAT_INTERVAL_ERROR_CODES.outputPathInvalid, spec.flags["--operator-evidence"]);
  }
}

// ---------------------------------------------------------------------------
// Canonical snapshots and operator evidence
// ---------------------------------------------------------------------------

export type PgStatCounter = Readonly<{
  queryId: string; // canonical signed bigint decimal
  calls: number;
  rows: number;
  totalPlanMs: number;
  totalExecMs: number;
  /**
   * Lowercase SHA-256 of the code-owned normalized statement shape. The
   * statement text itself is held in memory only long enough to produce this
   * digest and is never persisted, logged, or classified by appearance.
   */
  normalizedQuerySha256?: string;
}>;

export type PgStatIdentity = Readonly<{
  serverIdentitySha256: string;
  databaseIdentitySha256: string;
  postgresMajor: number;
  extensionVersion: string;
  statsReset: string;
}>;

export type PgStatSnapshot = Readonly<{
  version: 1;
  boundary: "start" | "end";
  name: string;
  purpose: string;
  capturedAt: string;
  identity: PgStatIdentity;
  counters: readonly PgStatCounter[];
}>;

export type OperatorEvidenceEntry = Readonly<{
  queryId: string;
  sourceClass: TrafficSourceClass;
  classificationEvidenceId: string;
  purpose: string;
  recordedAt: string;
}>;

export type OperatorEvidence = Readonly<{
  diagnosticsEndedAt: string;
  classifications: readonly OperatorEvidenceEntry[];
}>;

/** Deterministic canonical JSON: recursively sorted keys, no whitespace. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Strict snapshot decode: bounded size, exact shape, canonical byte form,
 * monotone counters, closed enums. Oversized bytes fail
 * `pg_stat_interval_bounds_exceeded`; shape, enum, canonical-form, and
 * per-counter drift fail `pg_stat_interval_invalid` (the 2026-09-03 contract
 * correction documents this bounded code set).
 */
export function decodeSnapshot(raw: Buffer | string): PgStatSnapshot {
  if (raw.length > MAX_SNAPSHOT_BYTES) {
    fail(PG_STAT_INTERVAL_ERROR_CODES.boundsExceeded);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    fail(PG_STAT_INTERVAL_ERROR_CODES.intervalInvalid);
  }
  if (canonicalJson(parsed) !== raw.toString("utf8")) {
    fail(PG_STAT_INTERVAL_ERROR_CODES.intervalInvalid);
  }
  const snap = parsed as PgStatSnapshot;
  if (
    snap.version !== 1 ||
    (snap.boundary !== "start" && snap.boundary !== "end") ||
    !INTERVAL_NAME_PURPOSES[snap.name] ||
    INTERVAL_NAME_PURPOSES[snap.name] !== snap.purpose ||
    typeof snap.capturedAt !== "string" ||
    !Array.isArray(snap.counters) ||
    snap.counters.length > MAX_INTERVAL_ROWS ||
    !snap.identity
  ) {
    fail(PG_STAT_INTERVAL_ERROR_CODES.intervalInvalid);
  }
  for (const counter of snap.counters) {
    if (
      typeof counter.queryId !== "string" ||
      !/^-?\d+$/.test(counter.queryId) ||
      !(counter.calls >= 0 && Number.isSafeInteger(counter.calls)) ||
      !(counter.rows >= 0 && Number.isSafeInteger(counter.rows)) ||
      !(counter.totalPlanMs >= 0 && Number.isFinite(counter.totalPlanMs)) ||
      !(counter.totalExecMs >= 0 && Number.isFinite(counter.totalExecMs)) ||
      (counter.normalizedQuerySha256 !== undefined &&
        !/^[0-9a-f]{64}$/.test(counter.normalizedQuerySha256))
    ) {
      fail(PG_STAT_INTERVAL_ERROR_CODES.intervalInvalid);
    }
  }
  return snap;
}

/** Strict operator-evidence decode; no SQL/patterns/rows are permitted fields. */
export function decodeOperatorEvidence(raw: Buffer | string): OperatorEvidence {
  if (raw.length > MAX_SNAPSHOT_BYTES) {
    fail(PG_STAT_INTERVAL_ERROR_CODES.boundsExceeded);
  }
  let parsed: OperatorEvidence;
  try {
    parsed = JSON.parse(raw.toString("utf8")) as OperatorEvidence;
  } catch {
    // Byte-malformed evidence fails closed with the bounded code; the raw
    // payload is never echoed into the error message.
    fail(PG_STAT_INTERVAL_ERROR_CODES.evidenceInvalid);
  }
  if (typeof parsed.diagnosticsEndedAt !== "string") {
    fail(PG_STAT_INTERVAL_ERROR_CODES.evidenceInvalid);
  }
  if (!Array.isArray(parsed.classifications)) {
    fail(PG_STAT_INTERVAL_ERROR_CODES.evidenceInvalid);
  }
  for (const entry of parsed.classifications) {
    if (
      typeof entry.queryId !== "string" ||
      !/^-?\d+$/.test(entry.queryId) ||
      !TRAFFIC_SOURCE_CLASSES.includes(entry.sourceClass) ||
      typeof entry.classificationEvidenceId !== "string" ||
      entry.classificationEvidenceId.length === 0 ||
      entry.classificationEvidenceId.length > 128 ||
      typeof entry.purpose !== "string" ||
      typeof entry.recordedAt !== "string"
    ) {
      fail(PG_STAT_INTERVAL_ERROR_CODES.evidenceInvalid);
    }
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Interval math and classification (pure)
// ---------------------------------------------------------------------------

const counterMap = (counters: readonly PgStatCounter[]): Map<string, PgStatCounter> =>
  new Map(counters.map((counter) => [counter.queryId, counter]));

let digestToKeyIndex: Map<string, string> | null = null;

/**
 * Closed digest -> fingerprint-key index over the reviewed registry. Matching
 * is exact SHA-256 equality against `TASK551_QUERY_FINGERPRINT_DEFINITIONS`;
 * no SQL appearance, duration, or application-name heuristic participates.
 */
function fingerprintKeyForDigest(normalizedQuerySha256: string | undefined): string | null {
  if (normalizedQuerySha256 === undefined) return null;
  if (digestToKeyIndex === null) {
    digestToKeyIndex = new Map<string, string>();
    for (const [key, definition] of Object.entries(TASK551_QUERY_FINGERPRINT_DEFINITIONS)) {
      for (const digest of definition.normalizedQuerySha256) {
        if (!digestToKeyIndex.has(digest)) digestToKeyIndex.set(digest, key);
      }
    }
  }
  return digestToKeyIndex.get(normalizedQuerySha256) ?? null;
}

/** One per-query-ID delta row of the closed interval receipt. */
export type PgStatIntervalReceiptDelta = Readonly<{
  queryId: string;
  fingerprintKey: string | null;
  sourceClass: TrafficSourceClass;
  classificationEvidenceId: string;
  callsDelta: number;
  rowsDelta: number;
  totalPlanMsDelta: number;
  totalExecMsDelta: number;
}>;

/** Per-class statement/call/row/time totals of one interval receipt. */
export type PgStatIntervalSourceClassTotals = Record<
  TrafficSourceClass,
  {
    statements: number;
    calls: number;
    rows: number;
    totalPlanMs: number;
    totalExecMs: number;
  }
>;

/**
 * Declared receipt surface: exactly the closed field set the collector writes
 * (and the contract pins), including `cleanAfterDiagnostics`.
 */
export type PgStatIntervalReceipt = Readonly<{
  version: 1;
  name: string;
  purpose: string;
  start: { capturedAt: string; snapshotSha256: string };
  end: { capturedAt: string; snapshotSha256: string };
  statsReset: string;
  serverIdentitySha256: string;
  databaseIdentitySha256: string;
  extensionVersion: string;
  cleanAfterDiagnostics: boolean;
  deltas: readonly PgStatIntervalReceiptDelta[];
  sourceClassTotals: Readonly<PgStatIntervalSourceClassTotals>;
  eligibleApplicationQueryIds: readonly string[];
  excludedQueryIds: readonly string[];
}>;

/**
 * Computes one interval receipt from a strictly ordered start/end snapshot
 * pair plus the operator evidence. Identity/reset changes, counter decreases,
 * query-ID reuse with incompatible normalized-statement metadata, or more than
 * the row bound fail closed.
 */
export function buildIntervalReceipt(input: {
  start: PgStatSnapshot;
  end: PgStatSnapshot;
  evidence: OperatorEvidence;
}): PgStatIntervalReceipt {
  const { start, end, evidence } = input;
  if (start.boundary !== "start" || end.boundary !== "end" || start.name !== end.name) {
    fail(PG_STAT_INTERVAL_ERROR_CODES.intervalInvalid);
  }
  const id = start.identity;
  const sameIdentity =
    id.serverIdentitySha256 === end.identity.serverIdentitySha256 &&
    id.databaseIdentitySha256 === end.identity.databaseIdentitySha256 &&
    id.postgresMajor === end.identity.postgresMajor &&
    id.extensionVersion === end.identity.extensionVersion &&
    id.statsReset === end.identity.statsReset;
  if (!sameIdentity) {
    fail(PG_STAT_INTERVAL_ERROR_CODES.identityChanged);
  }
  if (new Date(start.capturedAt) <= new Date(evidence.diagnosticsEndedAt)) {
    // Start must be strictly after the operator evidence's diagnostics end so
    // prioritization always uses a fresh clean interval after diagnostic work.
    fail(PG_STAT_INTERVAL_ERROR_CODES.intervalInvalid);
  }

  const startById = counterMap(start.counters);
  const deltas: PgStatIntervalReceiptDelta[] = [];
  const sourceClassTotals: PgStatIntervalSourceClassTotals = {} as PgStatIntervalSourceClassTotals;
  for (const sourceClass of TRAFFIC_SOURCE_CLASSES) {
    sourceClassTotals[sourceClass] = {
      statements: 0,
      calls: 0,
      rows: 0,
      totalPlanMs: 0,
      totalExecMs: 0,
    };
  }
  const eligibleApplicationQueryIds: string[] = [];
  const excludedQueryIds: string[] = [];

  for (const endCounter of end.counters) {
    const startCounter = startById.get(endCounter.queryId);
    // Query-ID reuse with incompatible metadata is the contract's fourth drift
    // trigger: a query ID present at both boundaries must carry the identical
    // normalized-statement digest, otherwise the counters are not a delta of
    // one statement and the interval fails `pg_stat_interval_invalid`.
    if (
      startCounter !== undefined &&
      startCounter.normalizedQuerySha256 !== endCounter.normalizedQuerySha256
    ) {
      fail(PG_STAT_INTERVAL_ERROR_CODES.intervalInvalid);
    }
    const callsDelta = endCounter.calls - (startCounter?.calls ?? 0);
    const rowsDelta = endCounter.rows - (startCounter?.rows ?? 0);
    const planDelta = endCounter.totalPlanMs - (startCounter?.totalPlanMs ?? 0);
    const execDelta = endCounter.totalExecMs - (startCounter?.totalExecMs ?? 0);
    if (callsDelta < 0 || rowsDelta < 0 || planDelta < 0 || execDelta < 0) {
      fail(PG_STAT_INTERVAL_ERROR_CODES.counterRegression);
    }
    const explicit = evidence.classifications.find((entry) => entry.queryId === endCounter.queryId);
    // Only the explicit operator evidence may classify; inference from
    // duration or SQL appearance is forbidden. Unmatched stays `unknown`.
    const sourceClass: TrafficSourceClass =
      explicit && explicit.purpose === start.purpose ? explicit.sourceClass : "unknown";
    if (sourceClass === "application") {
      eligibleApplicationQueryIds.push(endCounter.queryId);
    } else {
      excludedQueryIds.push(endCounter.queryId);
    }
    const totals = sourceClassTotals[sourceClass];
    totals.statements += 1;
    totals.calls += callsDelta;
    totals.rows += rowsDelta;
    totals.totalPlanMs += planDelta;
    totals.totalExecMs += execDelta;
    deltas.push({
      queryId: endCounter.queryId,
      // Resolved by exact normalized-statement SHA-256 equality against the
      // closed registry; unmatched rows stay null and never become labels.
      fingerprintKey: fingerprintKeyForDigest(endCounter.normalizedQuerySha256),
      sourceClass,
      classificationEvidenceId: explicit?.classificationEvidenceId ?? "",
      callsDelta,
      rowsDelta,
      totalPlanMsDelta: planDelta,
      totalExecMsDelta: execDelta,
    });
  }

  return {
    version: 1,
    name: end.name,
    purpose: end.purpose,
    start: {
      capturedAt: start.capturedAt,
      snapshotSha256: sha256Hex(canonicalJson(start)),
    },
    end: {
      capturedAt: end.capturedAt,
      snapshotSha256: sha256Hex(canonicalJson(end)),
    },
    statsReset: end.identity.statsReset,
    serverIdentitySha256: end.identity.serverIdentitySha256,
    databaseIdentitySha256: end.identity.databaseIdentitySha256,
    extensionVersion: end.identity.extensionVersion,
    cleanAfterDiagnostics: true,
    deltas,
    sourceClassTotals,
    eligibleApplicationQueryIds,
    excludedQueryIds,
  };
}

/**
 * Code-owned normalization used only in memory: statement text collapses to a
 * canonical shape before hashing so the digest can be matched against the
 * closed fingerprint registry without persisting any SQL text.
 */
export function normalizeStatementForDigest(statement: string): string {
  return statement.replace(/\s+/gu, " ").trim().replace(/;$/u, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Snapshot persistence (bounded, canonical, mode 0600)
// ---------------------------------------------------------------------------

export function writeBounded0600(path: string, payload: unknown): void {
  const body = canonicalJson(payload);
  if (Buffer.byteLength(body, "utf8") > MAX_SNAPSHOT_BYTES) {
    fail(PG_STAT_INTERVAL_ERROR_CODES.boundsExceeded);
  }
  writeFileSync(path, body, { encoding: "utf8", mode: 0o600 });
  chmodSync(path, 0o600);
}

// ---------------------------------------------------------------------------
// DB-backed collection (runtime invocation only)
// ---------------------------------------------------------------------------

async function collectIdentityAndCounters(
  sql: import("postgres").Sql
): Promise<{ identity: PgStatIdentity; counters: PgStatCounter[] }> {
  return sql.begin("read only", async (tx) => {
    // One bounded read-only transaction covers every read on this max-1
    // client; the timeout applies locally and never outlives the transaction.
    await tx.unsafe(`set local statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
    const identityRows = (await tx`
      select (select setting from pg_settings where name = 'server_version_num') as version_num,
             (select extversion from pg_extension where extname = 'pg_stat_statements') as ext_version,
             (select stats_reset from pg_stat_statements_info) as stats_reset,
             (select oid::text from pg_database where datname = current_database()) as db_oid
    `) as readonly {
      version_num: string;
      ext_version: string;
      stats_reset: string;
      db_oid: string;
    }[];
    const identityRow = identityRows[0];
    if (!identityRow) fail(PG_STAT_INTERVAL_ERROR_CODES.intervalInvalid);

    const maxRowsSetting = (await tx`
      select current_setting('pg_stat_statements.max') as max_rows
    `) as readonly { max_rows: string }[];
    const maxRows = Math.min(
      MAX_INTERVAL_ROWS,
      Number(maxRowsSetting[0]?.max_rows ?? MAX_INTERVAL_ROWS)
    );

    const counterRows = (await tx`
      select queryid::text as query_id, calls, rows,
             coalesce(total_plan_time, 0) as total_plan_ms,
             coalesce(total_exec_time, 0) as total_exec_ms,
             query as statement_text
      from pg_stat_statements
      where dbid = (select oid from pg_database where datname = current_database())
      order by queryid::text
      limit ${maxRows}
    `) as readonly {
      query_id: string;
      calls: number;
      rows: number;
      total_plan_ms: number;
      total_exec_ms: number;
      statement_text: string | null;
    }[];

    const major = Math.trunc(Number(identityRow.version_num) / 10000);
    return {
      identity: {
        serverIdentitySha256: sha256Hex(identityRow.version_num),
        // Only SHA-256 digests are stored; the database identifier itself
        // never reaches disk.
        databaseIdentitySha256: sha256Hex(identityRow.db_oid),
        postgresMajor: major,
        extensionVersion: identityRow.ext_version,
        statsReset: identityRow.stats_reset,
      },
      // Statement text is held only long enough to normalize and SHA-256 it
      // against the closed registry: it never enters a snapshot, receipt, or
      // log line, and nothing here calls pg_stat_statements_reset().
      counters: counterRows.map((row) => ({
        queryId: row.query_id,
        calls: Number(row.calls),
        rows: Number(row.rows),
        totalPlanMs: Number(row.total_plan_ms),
        totalExecMs: Number(row.total_exec_ms),
        normalizedQuerySha256:
          row.statement_text === null
            ? undefined
            : sha256Hex(normalizeStatementForDigest(row.statement_text)),
      })),
    };
  });
}

async function main(argv: readonly string[]): Promise<void> {
  const spec = parseIntervalArgs(argv);
  validateCliSpec(spec);
  const name = spec.flags["--name"]!;
  const purpose = spec.flags["--purpose"]!;
  const evidencePath = spec.flags["--operator-evidence"] ?? EXPECTED_OPERATOR_EVIDENCE_PATH;
  if (!existsSync(evidencePath)) {
    fail(PG_STAT_INTERVAL_ERROR_CODES.evidenceInvalid);
  }
  const evidence = decodeOperatorEvidence(readFileSync(evidencePath));

  const { default: postgres } = await import("postgres");
  const url = process.env.DATABASE_URL?.trim();
  if (!url) fail(PG_STAT_INTERVAL_ERROR_CODES.intervalInvalid);
  const sql = postgres(url, { max: 1 });
  try {
    const { identity, counters } = await collectIdentityAndCounters(sql);

    if (spec.command === "start") {
      if (existsSync(spec.flags["--snapshot"]!)) {
        fail(PG_STAT_INTERVAL_ERROR_CODES.intervalReused);
      }
      writeBounded0600(spec.flags["--snapshot"]!, {
        version: 1,
        boundary: "start",
        name,
        purpose,
        capturedAt: new Date().toISOString(),
        identity,
        counters,
      } satisfies PgStatSnapshot);
      return;
    }

    // End boundary: replay the stored start snapshot against fresh counters.
    const startRaw = readFileSync(spec.flags["--start"]!);
    const start = decodeSnapshot(startRaw);
    const end: PgStatSnapshot = {
      version: 1,
      boundary: "end",
      name,
      purpose,
      capturedAt: new Date().toISOString(),
      identity,
      counters,
    };
    const receipt = buildIntervalReceipt({ start, end, evidence });
    if (existsSync(spec.flags["--receipt"]!)) {
      fail(PG_STAT_INTERVAL_ERROR_CODES.intervalReused);
    }
    writeBounded0600(spec.flags["--receipt"]!, receipt);
  } finally {
    await sql.end({ timeout: 2 });
  }
}

if (import.meta.main) {
  await main(process.argv.slice(2));
}
