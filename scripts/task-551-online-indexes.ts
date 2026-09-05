/** TASK-551-05-L01 locked rollout orchestrator (owner barrier: authored here, never executed by the authoring leaf against any database). bun scripts/task-551-online-indexes.ts rollout-forward|rollout-reverse \ --receipt .tmp/task551-migration-receipt.json --admission-mode external|offline-single bun scripts/task-551-online-indexes.ts status --receipt .tmp/task551-migration-receipt.json Importing this module performs no I/O, opens no connection and reads no environment: every DB-facing action happens only under `import.meta.main`. Locked: journal-driven artifact resolution; one max-1 postgres.js client, one `reserve()`, one advisory lock, three parameterized `set_config(..., false)` GUCs, only `drizzle(<adapted reserved>)` handed to the migrator; forward and reverse states, each CAS-persisted to the receipt row AND the strict 0600 mirror. The receipt row exists only from the guarded atomic in-transaction insert onward, so a cold pre-0081 database never touches a missing relation: pre-transaction states persist to the mirror alone and every row read/write is gated on a `to_regclass` probe. The migrator transaction opens with the strict static GUC guard and closes with the already-`transaction_applied` successor insert (:243-246); `transaction_apply_pending` recovery reruns only when nothing committed (:246-249). A resume reproduces the artifact and canonical preflight digests before phase 2 and, once DDL exists, appends a fresh health recheck and re-requires every ceiling (:190-197). Phase 1 consumes L02's strict `task551-predecision-clean` interval before any read-index candidate is frozen (:183-186) and binds replication lag, the oldest in-flight transaction and the invalid booking windows into that preflight digest (:186-189). Both building groups own resumable handlers (:250-260, :283-285) and so does the reverse mirror group (:298-314); each member CAS-persists `building` before and `ready`/`dropped` after its concurrent statement. Members are built and dropped only as top-level `CREATE/DROP INDEX CONCURRENTLY` in closed manifest order; a valid identical member skips, task-owned invalid residue drops concurrently then rebuilds, a foreign object refuses (:255-259), and the gate is canonical shape plus `indisready`/`indisvalid`, never byte equality. Quiescence is closed-world AND role-scoped, re-proven at completion (:226-237, :283-284). `offline-single` stays cold and ends at `operator_resume_authorized` (:281-291); external alone cuts over — the resume-ack transition alone records `newBinaryTrafficAccepted`, permanently forbidding the nonce-bound pre-cutover reverse (:268-280, :298-308), which drops the members, then the transactional artifact itself, then the Drizzle journal row. A poisoned lease performs no further SQL, is never released, and ends the max-1 pool exactly once in either branch (:155-159). / */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  statfsSync,
  statSync,
  writeSync,
} from "node:fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { parseDatabaseFleetConfig } from "../core/db/databaseConfig";
import { buildDatabaseApplicationName } from "../core/db/databaseApplicationIdentity";
import { resolveSessionDatabaseTarget } from "../core/db/connectionTargets";
import {
  TASK551_MIGRATION_GUCS,
  TASK551_MIGRATION_RECEIPT_MAX_BYTES,
  TASK551_MIGRATION_STATE_LITERALS,
  type Task551MigrationReceipt,
  type Task551OnlineIndexMemberReceipt,
} from "../core/db/tables/task551MigrationOperations";
import { BOOKING_RESERVATION_EXCLUSION_SQL } from "../core/db/bookingReservationExclusion";
import {
  TASK551_ASSERTED_UNIQUE_CONSTRAINTS,
  TASK551_EXCLUSION_CONSTRAINT_NAME,
  TASK551_ONLINE_INDEX_MEMBERS,
  TASK551_REVISION_INTEGRITY_MEMBERS,
  type Task551OnlineIndexMember,
} from "../tests/perf/fixtures/task551OnlineIndexManifest";
import {
  buildIntervalReceipt,
  canonicalJson,
  decodeOperatorEvidence,
  decodeSnapshot,
  EXPECTED_OPERATOR_EVIDENCE_PATH,
  expectedReceiptPath,
  expectedStartPath,
  INTERVAL_NAME_PURPOSES,
  sha256Hex,
  type PgStatIntervalReceipt,
  type PgStatSnapshot,
} from "./task-551-pg-stat-interval";

/** Fail-closed error codes for every locked refusal of this rollout tool. */
export const TASK551_ORCHESTRATOR_ERROR_CODES = {
  usage: "task551_orchestrator_usage_invalid",
  journalNotUnique: "task551_journal_not_unique_pending",
  artifactMissing: "task551_artifact_missing",
  artifactDigestChanged: "task551_artifact_digest_changed",
  receiptInvalid: "task551_receipt_invalid",
  receiptConflict: "task551_migration_receipt_conflict",
  admissionModeInvalid: "task551_admission_mode_invalid",
  offlineSingleDenied: "task551_offline_single_denied",
  adapterInvalid: "task551_admission_adapter_invalid",
  adapterPrepareFailed: "task551_adapter_prepare_failed",
  adapterResumeFailed: "task551_adapter_resume_failed",
  quiescenceFailed: "task551_quiescence_failed",
  activityVisibilityInvalid: "task551_migration_activity_visibility_invalid",
  preflightFailed: "task551_preflight_failed",
  dataConflict: "task551_preflight_data_conflict",
  memberInvalid: "task551_online_member_invalid",
  reverseForbidden: "task551_reverse_forbidden",
  catalogMismatch: "task551_final_catalog_mismatch",
  reservedAdapterIncompatible: "task551_reserved_drizzle_adapter_incompatible",
  leasePoisoned: "task551_reserved_lease_poisoned",
} as const;

/** The fixed deployment ceilings, in milliseconds, from the contract. */
const BUDGETS = Object.freeze({
  lockTimeoutMs: 2_000,
  onlineMemberMs: 30 * 60_000,
  freeDiskFactor: 2.5,
  probeIntervalMs: 250,
  maxLagSeconds: 5,
  maxOldestTransactionSeconds: 30,
  smallTableRows: 100_000,
  smallTableBytes: 256 * 1024 * 1024,
  combinedBytes: 1024 * 1024 * 1024,
  quiescenceWindowMs: 5_000,
  quiescenceDeadlineMs: 120_000,
  idleInTransactionTimeoutMs: 900_000,
  adapterPrepareTimeoutMs: 120_000,
  adapterResumeTimeoutMs: 180_000,
  adapterStdoutMaxBytes: 16 * 1024,
  adapterStderrMaxBytes: 16 * 1024,
  small: Object.freeze({ statementTimeoutMs: 30_000, transactionTimeoutMs: 120_000 }),
  large: Object.freeze({ statementTimeoutMs: 300_000, transactionTimeoutMs: 900_000 }),
} as const);

const MIGRATION_TAG = "0081_task551_search_indexes_constraints_outbox";
const ONLINE_TAG = "0081_task551_online_indexes";
const MIGRATIONS_FOLDER = "core/db/migrations";
const STATEMENT_BREAKPOINT = "--> statement-breakpoint";
const ADVISORY_LOCK_PURPOSE = "coderso.task551_rollout_advisory_lock";
const OFFLINE_SINGLE_ACK = "all-coderso-processes-stopped";
const REVISION_INTEGRITY_GROUP = "revision-integrity" as const;
const READ_PERFORMANCE_GROUP = "read-performance" as const;
const JOURNAL_TABLE = "drizzle.__drizzle_migrations";
const RECEIPT_TABLE = "public.task551_migration_operations";
const MANIFEST_PATH = "tests/perf/fixtures/task551OnlineIndexManifest.ts";
const HEX64 = /^[0-9a-f]{64}$/;
const UUID_GRAMMAR = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const REPLICA_ID_GRAMMAR = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
const NONCE_GRAMMAR = /^[A-Za-z0-9_-]{43}$/;
const CANONICAL_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
/** The exact two visibility probes of phase 3: `[application role kind, replica id]`, opened under the application database role. */
const VISIBILITY_PROBES: readonly (readonly ["runtime" | "worker", string])[] = [
  ["runtime", "rollout-probe-runtime"],
  ["worker", "rollout-probe-worker"],
];
/** Tables the transactional artifact itself creates or alters; the manifest members' tables are added at resolution time. */
const TRANSACTIONAL_TOUCHED_TABLES = [
  "pages",
  "content_entries",
  "page_revisions",
  "content_revisions",
  "posts",
  "media",
  "users",
  "assistant_docs",
  "assistant_doc_chunks",
  "bookings",
  "cache_invalidation_outbox",
  "solution_kit_install_runs",
  "solution_kit_legacy_rollback_progress",
  "solution_kit_legacy_template_evidence",
  "solution_kit_starter_apply_owners",
  "task551_migration_operations",
] as const;
/** Probe-visible ack keys; anything else is a foreign object and fails closed. */
const ALLOWED_ACK_KEYS = [
  "version",
  "action",
  "operationId",
  "nonce",
  "receiptSha256",
  "admissionStopped",
  "workersDrained",
  "maintenanceStopped",
  "admissionResumed",
  "workersResumed",
  "authorizationSha256",
  "runtimeReplicas",
  "workerReplicas",
  "completedAt",
] as const;
/** Per-phase exactness (:213-218, :273-277): a prepare ack may not carry a resume key and vice versa — each phase's object is closed, not a shared superset. */
const PHASE_ACK_KEYS: Record<"prepare" | "resume", readonly string[]> = Object.freeze({
  prepare: [
    "version",
    "action",
    "operationId",
    "nonce",
    "receiptSha256",
    "admissionStopped",
    "workersDrained",
    "maintenanceStopped",
    "runtimeReplicas",
    "workerReplicas",
    "completedAt",
  ],
  resume: [
    "version",
    "action",
    "operationId",
    "nonce",
    "receiptSha256",
    "admissionResumed",
    "workersResumed",
    "authorizationSha256",
    "runtimeReplicas",
    "workerReplicas",
    "completedAt",
  ],
});
type ReceiptState = Task551MigrationReceipt["state"];
/** Mirror-only states: the receipt table does not exist before the guarded insert, and the pre-traffic reverse transaction drops it again. */
const PRE_TRANSACTION_STATES: readonly ReceiptState[] = [
  "resolved",
  "preflight_passed",
  "drain_requested",
  "drain_confirmed",
  "transaction_apply_pending",
  "reverse_complete",
];
/** Terminal forward states: the mandated rerun proves the catalog and transitions nothing. */
const TERMINAL_FORWARD_STATES: readonly ReceiptState[] = [
  "forward_ready",
  "operator_resume_authorized",
];
/** States a forward command may continue from; every other mirror fails closed instead of exiting silently. */
const FORWARD_RESUMABLE_STATES: readonly ReceiptState[] = [
  "resolved",
  "preflight_passed",
  "drain_requested",
  "drain_confirmed",
  "transaction_apply_pending",
  "transaction_applied",
  "revision_integrity_building",
  "revision_integrity_ready",
  "resume_authorized",
  "resume_completed",
  "read_performance_building",
];
/** States frozen after DDL: a resume re-requires every ceiling and appends a fresh health recheck (:190-197). `transaction_apply_pending` is deliberately absent — nothing is committed there, so its recovery is the guarded phase-4 rerun (:246-249), never a post-DDL ceiling recheck. */
const DDL_RECHECK_STATES: readonly ReceiptState[] = [
  "transaction_applied",
  "revision_integrity_building",
  "revision_integrity_ready",
  "resume_authorized",
  "resume_completed",
  "read_performance_building",
];
/** The contracted pre-cutover reverse window (:298-308): every forward state at or past the transactional commit whose `newBinaryTrafficAccepted` is still false. `resume_completed` IS the external cutover and always carries the flag, so it is reverse-forbidden, never reverse-admissible. */
const REVERSE_START_STATES: readonly ReceiptState[] = [
  "transaction_applied",
  "revision_integrity_building",
  "revision_integrity_ready",
  "resume_authorized",
  "read_performance_building",
  "forward_ready",
  "operator_resume_authorized",
];
const REVERSE_CONTINUATION_STATES: readonly ReceiptState[] = [
  ...REVERSE_START_STATES,
  "reverse_drain_requested",
  "reverse_drain_confirmed",
  "reverse_indexes_building",
  "reverse_transaction_pending",
];
/** L02's strict pre-decision interval (:183-186): exactly this closed name's produced pair is consumed before any read-index candidate is frozen. */
const PREDECISION_INTERVAL_NAME = "task551-predecision-clean";
/** States a forward resume sits in *before phase 2*: there the canonical preflight digest itself must reproduce, not merely the artifacts (:190-191). */
const PRE_DDL_REPRODUCE_STATES: readonly ReceiptState[] = ["resolved", "preflight_passed"];

interface CliSpec {
  readonly command: "rollout-forward" | "rollout-reverse" | "status";
  readonly receiptPath: string;
  readonly admissionMode: "external" | "offline-single" | null;
}
type Environment = Readonly<Record<string, string | undefined>>;
type PoolClient = ReturnType<typeof postgres>;
type ReservedSession = {
  (
    strings: readonly string[],
    ...values: readonly unknown[]
  ): {
    values: () => Promise<unknown>;
    catch: (onRejected: (error: unknown) => undefined) => Promise<unknown>;
  };
  unsafe: (query: string, ...params: readonly unknown[]) => Promise<unknown>;
  release: () => Promise<void>;
};
interface JournalEntry {
  readonly idx: number;
  readonly tag: string;
  readonly when: number;
}
interface ReplicaRecord {
  readonly id: string;
  readonly state: string;
  readonly binarySha256: string;
}
interface AdapterAck {
  readonly version: number;
  readonly action: string;
  readonly operationId: string;
  readonly nonce: string;
  readonly receiptSha256: string;
  readonly admissionStopped?: boolean;
  readonly workersDrained?: boolean;
  readonly maintenanceStopped?: boolean;
  readonly admissionResumed?: boolean;
  readonly workersResumed?: boolean;
  readonly authorizationSha256?: string;
  readonly runtimeReplicas: readonly ReplicaRecord[];
  readonly workerReplicas: readonly ReplicaRecord[];
  readonly completedAt: string;
}
interface ReservedLeaseState {
  active: boolean;
  poisoned: boolean;
  inTransaction: boolean;
}
/** Statement stream of one guarded transactional apply, verified statement by statement. */
interface TransactionalPlan {
  readonly statements: readonly string[];
  readonly guardSql: string;
  readonly insertSql: string;
  readonly session: ReservedSession;
  readonly progress: { guardRan: boolean; applied: number; insertRan: boolean; journaled: boolean };
}
export interface IndexShape {
  readonly unique: boolean;
  readonly name: string;
  readonly schema: string;
  readonly table: string;
  readonly method: string;
  readonly columns: readonly string[];
  readonly predicate: string | null;
}
type ReceiptSpec = Readonly<{
  kind: string;
  keys?: Readonly<Record<string, ReceiptSpec>>;
  items?: ReceiptSpec | readonly ReceiptSpec[];
  min?: number;
  max?: number;
  value?: string;
  values?: readonly string[];
}>;

function fail(code: string, detail?: string): never {
  throw new Error(detail === undefined ? code : `${code}: ${detail}`);
}
/** Runs one tagged query to its raw row values, typed by the call site. */
async function values<T>(pending: { values: () => Promise<unknown> }): Promise<T[]> {
  return (await pending.values()) as unknown as T[];
}
function sqlText(text: string): string {
  return `'${text.replace(/'/g, "''")}'`;
}

export function parseOrchestratorArgs(argv: readonly string[]): CliSpec {
  const [command, ...rest] = argv;
  if (command !== "rollout-forward" && command !== "rollout-reverse" && command !== "status")
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.usage, `unknown command ${String(command)}`);
  let receiptPath: string | null = null;
  let admissionMode: CliSpec["admissionMode"] = null;
  for (let index = 0; index < rest.length; index += 2) {
    const [flag, value] = [rest[index], rest[index + 1]];
    if (flag === "--receipt" && value !== undefined) receiptPath = value;
    else if (flag === "--admission-mode" && (value === "external" || value === "offline-single"))
      admissionMode = value;
    else if (flag === "--admission-mode")
      fail(TASK551_ORCHESTRATOR_ERROR_CODES.admissionModeInvalid, String(value));
    else fail(TASK551_ORCHESTRATOR_ERROR_CODES.usage, `unknown flag ${String(flag)}`);
  }
  if (receiptPath === null || (command !== "status" && admissionMode === null))
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.usage,
      "--receipt, and --admission-mode for a rollout, are required"
    );
  return { command, receiptPath, admissionMode };
}
// --- Journal-driven artifact resolution -------------------------------------
export interface Task551Artifacts {
  readonly journalIndex: number;
  readonly tag: string;
  readonly transactionalPath: string;
  readonly snapshotPath: string;
  readonly onlinePath: string;
  readonly transactionalSha256: string;
  readonly snapshotSha256: string;
  readonly onlineSha256: string;
  readonly manifestSha256: string;
  readonly aggregateSha256: string;
  readonly transactionalStatements: readonly string[];
  readonly touchedTables: readonly string[];
}
function readJournalEntries(folder: string): readonly JournalEntry[] {
  return (
    JSON.parse(readFileSync(`${folder}/meta/_journal.json`, "utf8")) as { entries: JournalEntry[] }
  ).entries;
}
/** The transactional artifact, split exactly as the installed migrator splits it. */
export function transactionalStatements(sqlText_: string): readonly string[] {
  return sqlText_
    .split(STATEMENT_BREAKPOINT)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}
/** Journal-driven artifact resolution: unique tail tag, unjournaled companion, digests, single seam. The touched-table set is derived, never hand-pinned: the manifest's own member tables plus the transactional family, so classification and the free-disk gate measure exactly what 0081 touches. */
export function resolveTask551Artifacts(manifestSha256: string): Task551Artifacts {
  const entries = readJournalEntries(MIGRATIONS_FOLDER);
  const hits = entries.filter((entry) => entry.tag === MIGRATION_TAG);
  if (hits.length !== 1)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.journalNotUnique,
      `${hits.length} entries for ${MIGRATION_TAG}`
    );
  const entry = hits[0];
  if (entries[entries.length - 1]?.idx !== entry.idx)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.journalNotUnique,
      `${MIGRATION_TAG} is not the journal tail`
    );
  if (entries.some((candidate) => candidate.tag === ONLINE_TAG))
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.journalNotUnique, `${ONLINE_TAG} must not be journaled`);
  const transactionalPath = `${MIGRATIONS_FOLDER}/${entry.tag}.sql`;
  const snapshotPath = `${MIGRATIONS_FOLDER}/meta/${String(entry.idx).padStart(4, "0")}_snapshot.json`;
  const onlinePath = `${MIGRATIONS_FOLDER}/${ONLINE_TAG}.sql`;
  for (const artifactPath of [transactionalPath, snapshotPath, onlinePath])
    if (!existsSync(artifactPath))
      fail(TASK551_ORCHESTRATOR_ERROR_CODES.artifactMissing, artifactPath);
  const transactionalSql = readFileSync(transactionalPath, "utf8");
  if (
    transactionalSql.includes("CONCURRENTLY") ||
    transactionalSql.includes("CREATE INDEX") ||
    transactionalSql.includes("DROP INDEX")
  ) {
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.artifactDigestChanged,
      "transactional SQL carries a companion statement"
    );
  }
  const extensionCount =
    transactionalSql.split(BOOKING_RESERVATION_EXCLUSION_SQL.extensionSql).length - 1;
  const seamCount = transactionalSql.split(BOOKING_RESERVATION_EXCLUSION_SQL.addSql).length - 1;
  if (extensionCount !== 1 || seamCount !== 1)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.artifactDigestChanged,
      `${extensionCount} extension seams, ${seamCount} exclusion seams`
    );
  const statements = transactionalStatements(transactionalSql);
  const withoutSemicolon = (statement: string): string => statement.replace(/;\s*$/, "");
  if (
    withoutSemicolon(statements[statements.length - 1] ?? "") !==
    withoutSemicolon(BOOKING_RESERVATION_EXCLUSION_SQL.addSql)
  ) {
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.artifactDigestChanged,
      "the exclusion seam is not the artifact tail"
    );
  }
  const snapshotSha256 = sha256Hex(readFileSync(snapshotPath, "utf8"));
  const onlineSha256 = sha256Hex(readFileSync(onlinePath, "utf8"));
  const transactionalSha256 = sha256Hex(transactionalSql);
  const aggregateSha256 = sha256Hex(
    canonicalJson({
      journal: { index: entry.idx, tag: entry.tag },
      transactionalSha256,
      snapshotSha256,
      onlineSha256,
      manifestSha256,
    })
  );
  const touchedTables = [
    ...new Set([
      ...TRANSACTIONAL_TOUCHED_TABLES,
      ...TASK551_ONLINE_INDEX_MEMBERS.map((member) => member.table),
    ]),
  ].sort();
  return Object.freeze({
    journalIndex: entry.idx,
    tag: entry.tag,
    transactionalPath,
    snapshotPath,
    onlinePath,
    transactionalSha256,
    snapshotSha256,
    onlineSha256,
    manifestSha256,
    aggregateSha256,
    transactionalStatements: statements,
    touchedTables,
  });
}
/** Contract :190-197 — before phase 2 a resumed command must reproduce both artifact and canonical preflight digests: the freshly resolved journal entry, paths and digests are compared against the frozen receipt, and any drift refuses before one statement runs. */
export function assertArtifactsReproduced(
  receipt: Task551MigrationReceipt,
  artifacts: Task551Artifacts
): void {
  const binds = (
    artifact: { path: string; sha256: string },
    path: string,
    sha256: string,
    label: string
  ): void => {
    if (artifact.path !== path || artifact.sha256 !== sha256)
      fail(
        TASK551_ORCHESTRATOR_ERROR_CODES.artifactDigestChanged,
        `the receipt's ${label} artifact does not reproduce ${path}`
      );
  };
  if (receipt.journal.index !== artifacts.journalIndex || receipt.journal.tag !== artifacts.tag)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.journalNotUnique,
      "the receipt's journal entry is not the resolved 0081 tail"
    );
  binds(
    receipt.artifacts.transactionalSql,
    artifacts.transactionalPath,
    artifacts.transactionalSha256,
    "transactional"
  );
  binds(receipt.artifacts.snapshot, artifacts.snapshotPath, artifacts.snapshotSha256, "snapshot");
  binds(receipt.artifacts.onlineSql, artifacts.onlinePath, artifacts.onlineSha256, "online");
  if (
    receipt.artifacts.manifestSha256 !== artifacts.manifestSha256 ||
    receipt.artifacts.aggregateSha256 !== artifacts.aggregateSha256
  )
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.artifactDigestChanged,
      "the receipt's manifest or aggregate digest does not reproduce"
    );
}
// --- Receipt: strict 0600 mirror + database row compare-and-set -------------
function assertReceiptShape(value: unknown): Task551MigrationReceipt {
  const receipt = value as Task551MigrationReceipt;
  const directionOk = receipt?.direction === "forward" || receipt?.direction === "reverse";
  if (receipt?.version !== 2 || receipt.taskId !== "TASK-551" || !directionOk)
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptInvalid, "version/taskId/direction");
  if (
    typeof receipt.operationId !== "string" ||
    typeof receipt.generation !== "number" ||
    !HEX64.test(receipt.stateSha256)
  )
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptInvalid, "operationId/generation/stateSha256");
  return receipt;
}
export function readReceiptMirror(path: string): Task551MigrationReceipt | null {
  return existsSync(path) ? assertReceiptShape(JSON.parse(readFileSync(path, "utf8"))) : null;
}
export function writeReceiptMirror(path: string, receipt: Task551MigrationReceipt): void {
  const text = canonicalJson(receipt);
  if (Buffer.byteLength(text, "utf8") > TASK551_MIGRATION_RECEIPT_MAX_BYTES)
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptInvalid, "mirror exceeds the byte ceiling");
  mkdirSync(path.slice(0, Math.max(path.lastIndexOf("/"), 0)) || ".", { recursive: true });
  const descriptor = openSync(path, "w", 0o600);
  try {
    writeSync(descriptor, `${text}\n`);
  } finally {
    closeSync(descriptor);
  }
}
/** One compare-and-set transition; the new `stateSha256` binds the whole successor. */
export function casReceipt(
  current: Task551MigrationReceipt,
  expectedState: Task551MigrationReceipt["state"] | null,
  patch: Partial<Omit<Task551MigrationReceipt, "stateSha256" | "generation">>
): Task551MigrationReceipt {
  if (expectedState !== null && current.state !== expectedState)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict,
      `${String(current.state)} is not ${expectedState}`
    );
  const successor = {
    ...current,
    ...patch,
    state: (patch.state ?? current.state) as Task551MigrationReceipt["state"],
    generation: current.generation + 1,
    previousStateSha256: current.stateSha256,
  } as Omit<Task551MigrationReceipt, "stateSha256">;
  return { ...successor, stateSha256: sha256Hex(canonicalJson(successor)) };
}
/** `to_regclass` probe: absent relations read as NULL instead of raising 42P01, which is what keeps a cold pre-0081 database on the fail-closed path. */
async function relationExists(session: ReservedSession, qualifiedName: string): Promise<boolean> {
  const present = (await values<[string | null]>(session`select to_regclass(${qualifiedName})`))[0];
  return present !== undefined && present[0] !== null;
}
/** Compare-and-set of one receipt row: only the guarded in-transaction insert creates the row, so an absent row is an inconsistency, never a reason to write one from the outside; a pre-0081 database (no table) is refused instead of crashing with a missing relation. */
async function persistReceiptRow(
  session: ReservedSession,
  receipt: Task551MigrationReceipt
): Promise<void> {
  if (!(await relationExists(session, RECEIPT_TABLE)))
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict, `${RECEIPT_TABLE} is absent`);
  const existing = (
    await values<string[]>(
      session`select state_sha256, generation from task551_migration_operations where operation_id = ${receipt.operationId}`
    )
  )[0];
  if (existing === undefined)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict,
      "the receipt row is absent; only the guarded transaction may create it"
    );
  if (existing[0] === receipt.stateSha256 && Number(existing[1]) === receipt.generation) return;
  const updated = await values<string[]>(session`update task551_migration_operations
      set generation = ${receipt.generation}, direction = ${receipt.direction}, state = ${receipt.state}, receipt = ${canonicalJson(receipt)},
          state_sha256 = ${receipt.stateSha256}, updated_at = now()
      where operation_id = ${receipt.operationId} and generation = ${receipt.generation - 1} and state_sha256 = ${receipt.previousStateSha256 ?? ""} returning operation_id`);
  if (updated.length !== 1) fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict);
}
async function readReceiptRow(
  session: ReservedSession,
  operationId: string
): Promise<{ state: string; stateSha256: string; generation: number } | null> {
  const row = (
    await values<string[]>(
      session`select state, state_sha256, generation from task551_migration_operations where operation_id = ${operationId}`
    )
  )[0];
  return row === undefined
    ? null
    : { state: row[0], stateSha256: row[1], generation: Number(row[2]) };
}
/** Mirror persist always; the row persist only once the receipt table provably exists (never on a cold pre-0081 database). */
async function persistAdvance(
  session: ReservedSession,
  receiptPath: string,
  receipt: Task551MigrationReceipt,
  persistRow: boolean
): Promise<void> {
  writeReceiptMirror(receiptPath, receipt);
  if (persistRow) await persistReceiptRow(session, receipt);
}
// --- Reserved Drizzle adapter: the sole bridge to the installed migrator -----
function defineImmutable(target: object, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    writable: false,
    configurable: false,
    enumerable: true,
  });
}
/** The backend id of the reserved session, verified before the transaction so the exit-path reset can prove it never changed. */
async function readBackendPid(session: ReservedSession): Promise<number> {
  const pid = Number((await values<string[]>(session`select pg_backend_pid()`))[0]?.[0]);
  if (!Number.isInteger(pid) || pid <= 0)
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.reservedAdapterIncompatible, "pid");
  return pid;
}
/** One guarded in-transaction statement: guard first, then the exact artifact stream, then the receipt insert, then only the journal insert. Statement parameters are forwarded untouched, because the migrator's journal insert is parameterized and must land exactly as Drizzle rendered it. */
async function driveGuardedStatement(
  plan: TransactionalPlan,
  state: ReservedLeaseState,
  query: string,
  parameters: readonly unknown[]
): Promise<unknown> {
  if (!plan.progress.guardRan) {
    plan.progress.guardRan = true;
    await plan.session.unsafe(plan.guardSql);
  }
  const statement = query.trim();
  if (plan.progress.applied < plan.statements.length) {
    if (statement !== plan.statements[plan.progress.applied])
      fail(
        TASK551_ORCHESTRATOR_ERROR_CODES.artifactDigestChanged,
        `artifact statement ${plan.progress.applied} drifted`
      );
    plan.progress.applied += 1;
    const result = await plan.session.unsafe(query, ...parameters);
    if (plan.progress.applied === plan.statements.length) {
      await plan.session.unsafe(plan.insertSql);
      plan.progress.insertRan = true;
    }
    return result;
  }
  if (plan.progress.insertRan && !plan.progress.journaled && isDrizzleJournalInsert(statement)) {
    plan.progress.journaled = true;
    return plan.session.unsafe(query, ...parameters);
  }
  fail(
    TASK551_ORCHESTRATOR_ERROR_CODES.leasePoisoned,
    `unexpected statement inside the migrator transaction: ${statement.slice(0, 64)}`
  );
}
/** The migrator's journal insert, recognized structurally: `insert into "drizzle"."__drizzle_migrations" (...)`. The expected head is written in the tokenizer's own `I:`-tagged vocabulary, so the comparison is like-for-like and cannot be bypassed by case, quoting or whitespace. */
function isDrizzleJournalInsert(statement: string): boolean {
  return (
    tokenizeSqlFragment(statement, TASK551_ORCHESTRATOR_ERROR_CODES.leasePoisoned)
      .slice(0, 5)
      .join(" ") === "I:INSERT I:INTO I:DRIZZLE . I:__DRIZZLE_MIGRATIONS"
  );
}
async function runReservedBegin(input: {
  args: readonly unknown[];
  adapted: PoolClient;
  reserved: ReservedSession;
  state: ReservedLeaseState;
}): Promise<unknown> {
  const { args, adapted, reserved, state } = input;
  if (state.poisoned || !state.active)
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.leasePoisoned, "lease is not live");
  if (state.inTransaction)
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.reservedAdapterIncompatible, "nested begin");
  const hasOptionString = args.length === 2;
  const callback = hasOptionString ? args[1] : args[0];
  const option = hasOptionString ? args[0] : undefined;
  if (typeof callback !== "function" || (option !== undefined && option !== ""))
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.reservedAdapterIncompatible, "begin signature");
  state.inTransaction = true;
  try {
    await reserved.unsafe("BEGIN");
    const result = await (callback as (client: PoolClient) => Promise<unknown>)(adapted);
    await reserved.unsafe("COMMIT");
    state.inTransaction = false;
    return result;
  } catch (error) {
    state.inTransaction = false;
    try {
      await reserved.unsafe("ROLLBACK");
    } catch {
      state.poisoned = true;
      poisonLease();
    }
    throw error;
  }
}
/** Wraps the postgres.js `reserve()` handle in a callable that also exposes the two members Drizzle 0.45.2 requires and the raw handle lacks: the pool `.options` object and a strictly stateful, non-reentrant `.begin`; the reserved backend stays the only statement channel. With a plan, the in-transaction statements of that plan are driven through the guard and the atomic receipt insert, and every other statement is forwarded as is. An unknown-outcome rollback poisons the adapter lease AND the command's own lease guard (:155-159), so no later step can dispatch SQL. */
export async function createTask551ReservedDrizzleClient(
  poolClient: PoolClient,
  reserved: ReservedSession,
  plan?: TransactionalPlan
): Promise<PoolClient> {
  const state: ReservedLeaseState = { active: true, poisoned: false, inTransaction: false };
  const live = (): void => {
    if (state.poisoned || !state.active)
      fail(TASK551_ORCHESTRATOR_ERROR_CODES.leasePoisoned, "lease is not live");
  };
  const adapted = ((...args: readonly unknown[]) => {
    live();
    return (reserved as unknown as (...a: readonly unknown[]) => Promise<unknown>)(...args);
  }) as unknown as PoolClient;
  defineImmutable(adapted, "options", poolClient.options);
  defineImmutable(adapted, "unsafe", (...args: readonly unknown[]) => {
    live();
    const query = String(args[0]);
    const parameters = args.slice(1);
    return plan === undefined || !state.inTransaction
      ? reserved.unsafe(query, ...parameters)
      : driveGuardedStatement(plan, state, query, parameters);
  });
  defineImmutable(adapted, "begin", (...args: readonly unknown[]) =>
    runReservedBegin({ args, adapted, reserved, state })
  );
  defineImmutable(adapted, "end", () => poolClient.end());
  return adapted;
}
async function setTask551MigrationGucs(
  reserved: ReservedSession,
  gucValues: { operationId: string; receiptText: string; receiptSha256: string }
): Promise<void> {
  await reserved`select set_config(${TASK551_MIGRATION_GUCS.operationId}, ${gucValues.operationId}, false),
      set_config(${TASK551_MIGRATION_GUCS.receipt}, ${gucValues.receiptText}, false), set_config(${TASK551_MIGRATION_GUCS.receiptSha256}, ${gucValues.receiptSha256}, false)`;
}
/** Reset-and-verify: every GUC must come back unset on the same backend. `pg_backend_pid()` is int4 (OID 23) and the installed postgres.js 3.4.9 parser (`types.js`: `number.from: [21, 23, 26, 700, 701]`, `parse: x => +x`) returns it as a JS NUMBER, so the same-backend proof compares in the number domain — never against a `String(...)` render, which no int4 row can ever equal. */
async function resetVerifyTask551Gucs(
  reserved: ReservedSession,
  expectedPid: number
): Promise<void> {
  for (const name of Object.values(TASK551_MIGRATION_GUCS))
    await reserved.unsafe(`reset "${name}"`);
  const gucs = Object.values(TASK551_MIGRATION_GUCS);
  const cleared = (
    await values<string[]>(
      reserved`select current_setting(${gucs[0]}, true), current_setting(${gucs[1]}, true), current_setting(${gucs[2]}, true), pg_backend_pid()`
    )
  )[0];
  if (cleared === undefined || Number(cleared[3]) !== expectedPid)
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.leasePoisoned, "backend changed under the receipt reset");
  if (cleared.slice(0, 3).some((value) => value !== "" && value !== null))
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.leasePoisoned, "a GUC survived the reset");
}
// --- Phase 4: the strict in-transaction GUC guard and atomic receipt insert ---

const INT = (min: number, max: number): ReceiptSpec => ({ kind: "int", min, max });
const PATH_SHA: ReceiptSpec = {
  kind: "object",
  keys: { path: { kind: "str" }, sha256: { kind: "hex64" } },
};
const ISO_OR_NULL: ReceiptSpec = { kind: "isoOrNull" };
const MEMBER_SPEC: ReceiptSpec = {
  kind: "object",
  keys: {
    name: { kind: "str" },
    group: { kind: "oneof", values: [REVISION_INTEGRITY_GROUP, READ_PERFORMANCE_GROUP] },
    order: INT(0, 4096),
    definitionSha256: { kind: "hex64" },
    state: { kind: "oneof", values: ["pending", "building", "ready", "dropped"] },
    complete: { kind: "bool" },
    completedAt: ISO_OR_NULL,
  },
};
const GROUP_SPEC = (members: ReceiptSpec): ReceiptSpec => ({
  kind: "object",
  keys: { name: { kind: "str" }, members, complete: { kind: "bool" }, completedAt: ISO_OR_NULL },
});
/** The exact recursive key set/type/array-bounds grammar the in-transaction guard enforces. */
const RECEIPT_SPEC: ReceiptSpec = {
  kind: "object",
  keys: {
    version: INT(2, 2),
    taskId: { kind: "literal", value: "TASK-551" },
    operationId: { kind: "uuid" },
    generation: INT(1, 2147483647),
    previousStateSha256: { kind: "hex64OrNull" },
    stateSha256: { kind: "hex64" },
    direction: { kind: "oneof", values: ["forward", "reverse"] },
    state: { kind: "str" },
    journal: { kind: "object", keys: { index: INT(0, 2147483647), tag: { kind: "str" } } },
    artifacts: {
      kind: "object",
      keys: {
        transactionalSql: PATH_SHA,
        snapshot: PATH_SHA,
        onlineSql: PATH_SHA,
        manifestSha256: { kind: "hex64" },
        aggregateSha256: { kind: "hex64" },
      },
    },
    preflight: {
      kind: "object",
      keys: {
        digest: { kind: "hex64" },
        classification: { kind: "oneof", values: ["small", "large"] },
        lockTimeoutMs: INT(1, 2147483647),
        statementTimeoutMs: INT(1, 2147483647),
        transactionTimeoutMs: INT(1, 2147483647),
        recheckDigests: { kind: "array", min: 1, max: 4096, items: { kind: "hex64" } },
      },
    },
    admission: {
      kind: "object",
      keys: {
        mode: { kind: "oneof", values: ["external", "offline-single"] },
        fleet: {
          kind: "object",
          keys: {
            runtimeProcessCount: INT(0, 4096),
            workerProcessCount: INT(0, 4096),
            totalProcessCount: INT(0, 4096),
          },
        },
        adapterSha256: { kind: "hex64OrNull" },
        drainNonce: { kind: "nonce" },
        prepareAckSha256: { kind: "hex64OrNull" },
        quiescentFrom: ISO_OR_NULL,
        quiescentUntil: ISO_OR_NULL,
        resumeNonce: { kind: "nonceOrNull" },
        resumeAuthorizationSha256: { kind: "hex64OrNull" },
        resumeAckSha256: { kind: "hex64OrNull" },
        resumeBinarySha256: { kind: "hex64OrNull" },
        revisionWriterCompatibilitySha256: { kind: "hex64OrNull" },
        newBinaryTrafficAccepted: { kind: "bool" },
      },
    },
    transaction: {
      kind: "object",
      keys: {
        apply: { kind: "oneof", values: ["pending", "applied", "reversed"] },
        catalogSha256: { kind: "hex64OrNull" },
      },
    },
    groups: {
      kind: "array",
      min: 2,
      max: 2,
      items: [
        GROUP_SPEC({ kind: "array", min: 2, max: 2, items: { kind: "str" } }),
        GROUP_SPEC({ kind: "array", min: 0, max: 4096, items: { kind: "str" } }),
      ],
    },
    forwardMembers: { kind: "array", min: 0, max: 4096, items: MEMBER_SPEC },
    reverseMembers: { kind: "array", min: 0, max: 4096, items: MEMBER_SPEC },
    finalCatalogReady: { kind: "bool" },
  },
};
/** The static first statement of the guarded transaction: strict `current_setting(..., true)` reads, missing/empty/oversize rejection, JSON parse, exact recursive key set/type/bounds grammar, operation id equal to both GUC and the exact migration `application_name`, and a recomputed SHA-256 over the exact receipt text. Any violation raises before one byte of DDL. */
function buildReceiptGuardSql(
  state: string,
  generation: number,
  previousStateSha256: string
): string {
  if (!(TASK551_MIGRATION_STATE_LITERALS as readonly string[]).includes(state))
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptInvalid, `unknown state ${state}`);
  if (
    !Number.isSafeInteger(generation) ||
    generation < 1 ||
    generation > 2147483647 ||
    !HEX64.test(previousStateSha256)
  )
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptInvalid, "generation/previousStateSha256");
  const gucs = Object.values(TASK551_MIGRATION_GUCS);
  return `do $task551_guard$ declare
  guc_operation text := current_setting('${gucs[0]}', true); guc_receipt text := current_setting('${gucs[1]}', true);
  guc_digest text := current_setting('${gucs[2]}', true); application text := current_setting('application_name', true);
  receipt jsonb; spec jsonb; frames jsonb; frame jsonb; expected jsonb; value jsonb; object_key text; kind text; base text; slot integer; member integer;
begin
  if guc_operation is null or guc_receipt is null or guc_digest is null or guc_operation = '' or guc_receipt = '' or guc_digest = '' or application is null then raise exception 'task551_receipt_invalid: a TASK-551 GUC is missing or empty'; end if;
  if octet_length(convert_to(guc_receipt, 'UTF8')) > ${TASK551_MIGRATION_RECEIPT_MAX_BYTES} then raise exception 'task551_receipt_invalid: the receipt GUC exceeds its byte ceiling'; end if;
  if guc_operation !~ '${UUID_GRAMMAR.source}' or guc_digest !~ '${HEX64.source}' then raise exception 'task551_receipt_invalid: the operation or digest GUC breaks its grammar'; end if;
  if application <> 'coderso:migration:' || guc_operation then raise exception 'task551_receipt_invalid: the session application_name is not this migration'; end if;
  begin receipt := guc_receipt::jsonb; exception when others then raise exception 'task551_receipt_invalid: the receipt GUC is not JSON'; end;
  if guc_digest <> encode(sha256(convert_to(guc_receipt, 'UTF8')), 'hex') or receipt ->> 'stateSha256' is distinct from guc_digest
      or receipt ->> 'operationId' is distinct from guc_operation or receipt ->> 'version' is distinct from '2' or receipt ->> 'taskId' is distinct from 'TASK-551'
      or receipt ->> 'state' is distinct from '${state}' or receipt ->> 'generation' is distinct from '${generation}'
      or coalesce(receipt ->> 'previousStateSha256', '') is distinct from '${previousStateSha256}' then raise exception 'task551_receipt_invalid: the receipt does not bind this operation'; end if;
  spec := ${sqlText(JSON.stringify(RECEIPT_SPEC))}::jsonb; frames := jsonb_build_array(jsonb_build_array(spec, receipt));
  while jsonb_array_length(frames) > 0 loop
    slot := jsonb_array_length(frames) - 1; frame := frames -> slot; frames := frames - slot;
    spec := frame -> 0; value := frame -> 1; kind := spec ->> 'kind'; base := replace(kind, 'OrNull', '');
    if base <> kind and jsonb_typeof(value) = 'null' then continue; elsif base = 'object' then
      if jsonb_typeof(value) <> 'object' then raise exception 'task551_receipt_invalid: an object slot is not an object'; end if;
      expected := spec - 'kind' - 'min' - 'max' - 'items' - 'value' - 'values';
      if (select count(*) from jsonb_object_keys(value) object_key where not (expected ? object_key)) > 0
          or (select count(*) from jsonb_object_keys(expected) object_key where not (value ? object_key)) > 0 then raise exception 'task551_receipt_invalid: a receipt object has an unexpected key set'; end if;
      for object_key in select jsonb_object_keys(expected) loop frames := frames || jsonb_build_array(expected -> object_key, value -> object_key); end loop;
    elsif base = 'array' then
      if jsonb_typeof(value) <> 'array' or jsonb_array_length(value) < (spec ->> 'min')::int or jsonb_array_length(value) > (spec ->> 'max')::int
          or (jsonb_typeof(spec -> 'items') = 'array' and jsonb_array_length(value) <> jsonb_array_length(spec -> 'items')) then raise exception 'task551_receipt_invalid: an array slot breaks its bounds'; end if;
      for member in 0 .. jsonb_array_length(value) - 1 loop frames := frames || jsonb_build_array(case when jsonb_typeof(spec -> 'items') = 'array' then (spec -> 'items') -> member else spec -> 'items' end, value -> member); end loop;
    elsif base = 'int' then
      if jsonb_typeof(value) <> 'number' or value::text ~ '[.eE]' or value::bigint < (spec ->> 'min')::bigint or value::bigint > (spec ->> 'max')::bigint then raise exception 'task551_receipt_invalid: an integer slot breaks its bounds'; end if;
    elsif base = 'bool' then
      if jsonb_typeof(value) <> 'boolean' then raise exception 'task551_receipt_invalid: a boolean slot is not boolean'; end if;
    else
      if jsonb_typeof(value) <> 'string' then raise exception 'task551_receipt_invalid: a scalar slot is not a string'; end if;
      if (base = 'str' and value #>> '{}' = '') or (base = 'hex64' and (value #>> '{}') !~ '${HEX64.source}')
          or (base = 'uuid' and (value #>> '{}') !~ '${UUID_GRAMMAR.source}') or (base = 'nonce' and (value #>> '{}') !~ '${NONCE_GRAMMAR.source}')
          or (base = 'iso' and (value #>> '{}') !~ '${CANONICAL_UTC.source}') or (base = 'literal' and (value #>> '{}') <> (spec ->> 'value'))
          or (base = 'oneof' and not (spec -> 'values') ? (value #>> '{}')) then raise exception 'task551_receipt_invalid: a scalar slot breaks its grammar'; end if;
    end if;
  end loop;
end $task551_guard$;`;
}
/** The final statement of the guarded transaction: the receipt insert with no conflict clause, reading only the validated GUCs, requiring one row. */
const RECEIPT_INSERT_SQL = `do $task551_receipt_insert$ declare
  receipt jsonb := current_setting('${Object.values(TASK551_MIGRATION_GUCS)[1]}', true)::jsonb; inserted integer;
begin
  insert into task551_migration_operations (operation_id, task_id, generation, direction, state, receipt, previous_state_sha256, state_sha256)
  values (current_setting('${Object.values(TASK551_MIGRATION_GUCS)[0]}', true)::uuid, 'TASK-551', (receipt ->> 'generation')::integer, receipt ->> 'direction',
          receipt ->> 'state', receipt, nullif(receipt ->> 'previousStateSha256', ''), current_setting('${Object.values(TASK551_MIGRATION_GUCS)[2]}', true));
  get diagnostics inserted = row_count;
  if inserted <> 1 then raise exception 'task551_migration_receipt_conflict: the receipt insert did not produce exactly one row'; end if;
end $task551_receipt_insert$;`;
function guardedApplyPlan(
  receipt: Task551MigrationReceipt,
  artifacts: Task551Artifacts,
  session: ReservedSession
): TransactionalPlan {
  if (receipt.state !== "transaction_applied")
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.receiptInvalid,
      "the transactional receipt is not the transaction_applied successor"
    );
  const previousStateSha256 = receipt.previousStateSha256 ?? "";
  if (
    !Number.isSafeInteger(receipt.generation) ||
    receipt.generation < 1 ||
    receipt.generation > 2147483647 ||
    !HEX64.test(previousStateSha256)
  ) {
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptInvalid, "generation/previousStateSha256");
  }
  return {
    statements: artifacts.transactionalStatements,
    guardSql: buildReceiptGuardSql(receipt.state, receipt.generation, previousStateSha256),
    insertSql: RECEIPT_INSERT_SQL,
    session,
    progress: { guardRan: false, applied: 0, insertRan: false, journaled: false },
  };
}
/** Phase 4: binds the precomputed successor receipt into the three session GUCs and runs the installed migrator against the adapted reserved handle; on every exit path the GUCs are reset and verified, and a poisoned reset ends the pool with timeout 0 in the caller. */
async function applyBoundTransactionalMigration(
  receipt: Task551MigrationReceipt,
  artifacts: Task551Artifacts,
  session: ReservedSession
): Promise<void> {
  const receiptText = canonicalJson(receipt);
  if (Buffer.byteLength(receiptText, "utf8") > TASK551_MIGRATION_RECEIPT_MAX_BYTES)
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.receiptInvalid, "GUC payload exceeds the byte ceiling");
  const pool = reservedPool;
  if (pool === null) fail(TASK551_ORCHESTRATOR_ERROR_CODES.leasePoisoned, "no reserved pool");
  const plan = guardedApplyPlan(receipt, artifacts, session);
  const pid = await readBackendPid(session);
  const adapted = await createTask551ReservedDrizzleClient(pool, session, plan);
  // :155-159 — a failed reset/PID proof poisons the lease: the pool ends here with timeout 0 and the command's own exit path performs no further SQL, no release and no second end.
  const resetOrEnd = async (): Promise<void> => {
    try {
      await resetVerifyTask551Gucs(session, pid);
    } catch (error) {
      poisonLease();
      await endPoolOnce();
      throw error;
    }
  };
  try {
    await setTask551MigrationGucs(session, {
      operationId: receipt.operationId,
      receiptText,
      receiptSha256: sha256Hex(receiptText),
    });
    await migrate(drizzle(adapted), { migrationsFolder: MIGRATIONS_FOLDER });
    if (
      !plan.progress.guardRan ||
      !plan.progress.insertRan ||
      !plan.progress.journaled ||
      plan.progress.applied !== plan.statements.length
    ) {
      fail(
        TASK551_ORCHESTRATOR_ERROR_CODES.artifactDigestChanged,
        "the guarded transaction did not run to its journal insert"
      );
    }
  } catch (migrationError) {
    await resetOrEnd();
    throw migrationError;
  }
  await resetOrEnd();
}
/** Contract :246-249 — recovery of `transaction_apply_pending` reruns the guarded transaction ONLY when nothing committed: this operation's receipt row, the 0081 journal row and the artifact's own tables are probed, and any committed residue refuses (`task551_migration_receipt_conflict`) instead of rerunning. */
async function assertNothingCommitted(
  session: ReservedSession,
  artifacts: Task551Artifacts,
  operationId: string
): Promise<void> {
  const code = TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict;
  if (
    (await relationExists(session, RECEIPT_TABLE)) &&
    (await readReceiptRow(session, operationId)) !== null
  )
    fail(
      code,
      "the guarded transaction already committed this operation's receipt row; the phase-4 rerun is forbidden"
    );
  if (await relationExists(session, JOURNAL_TABLE)) {
    const applied = await values<[string]>(
      session`select 1 from drizzle.__drizzle_migrations where hash = ${artifacts.transactionalSha256} limit 1`
    );
    if (applied.length > 0)
      fail(
        code,
        "the 0081 journal row is already applied, so the transactional phase cannot rerun"
      );
  }
  if (await relationExists(session, "public.cache_invalidation_outbox"))
    fail(code, "a transactional-artifact table already exists, so phase 4 is not rerunnable");
}
// --- Canonical member gate: structural comparison, never byte equality ------
/** Tagged SQL tokens: `I:` identifier (uppercased, unquoted), `S:` literal, `N:` number, `P:` parameter, else raw punctuation; comments and `::casts` are dropped. */
function tokenizeSqlFragment(fragment: string, code: string): string[] {
  const tokens: string[] = [];
  let index = 0;
  const match = (pattern: RegExp, at: number): RegExpExecArray | null =>
    pattern.exec(fragment.slice(at));
  while (index < fragment.length) {
    const char = fragment[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === "-" && fragment[index + 1] === "-") {
      const end = fragment.indexOf("\n", index);
      index = end === -1 ? fragment.length : end + 1;
      continue;
    }
    if (char === "/" && fragment[index + 1] === "*") {
      const end = fragment.indexOf("*/", index + 2);
      if (end === -1) fail(code, "unterminated comment");
      index = end + 2;
      continue;
    }
    if (char === "'") {
      let literal = "";
      index += 1;
      for (;;) {
        if (index >= fragment.length) fail(code, "unterminated literal");
        if (fragment[index] === "'") {
          if (fragment[index + 1] === "'") {
            literal += "'";
            index += 2;
            continue;
          }
          index += 1;
          break;
        }
        literal += fragment[index];
        index += 1;
      }
      tokens.push(`S:${literal}`);
      continue;
    }
    if (char === '"') {
      const end = fragment.indexOf('"', index + 1);
      if (end === -1) fail(code, "unterminated identifier");
      tokens.push(`I:${fragment.slice(index + 1, end).toUpperCase()}`);
      index = end + 1;
      continue;
    }
    if (char === "$" && /[0-9]/.test(fragment[index + 1] ?? "")) {
      const param = match(/^\$[0-9]+/, index);
      if (param === null) fail(code, "parameter");
      tokens.push(`P:${param[0].slice(1)}`);
      index += param[0].length;
      continue;
    }
    if (/[0-9]/.test(char)) {
      const number = match(/^[0-9]+(?:\.[0-9]+)?/, index);
      if (number === null) fail(code, "number");
      tokens.push(`N:${number[0]}`);
      index += number[0].length;
      continue;
    }
    if (char === ":") {
      if (fragment[index + 1] !== ":") fail(code, "colon");
      const type = match(/^[A-Za-z_][\w$]*/, index + 2);
      if (type === null) fail(code, "cast");
      index += 2 + type[0].length;
      continue;
    }
    const operator = match(/^(<>|<=|>=|!=|=|<|>|\|\||,|\(|\)|\.|\[|\])/, index);
    if (operator !== null) {
      tokens.push(operator[0]);
      index += operator[0].length;
      continue;
    }
    const word = match(/^[A-Za-z_][\w$]*/, index);
    if (word === null) fail(code, `unparsable at ${fragment.slice(index, index + 12)}`);
    tokens.push(`I:${word[0].toUpperCase()}`);
    index += word[0].length;
  }
  return tokens;
}
function splitTokenList(
  tokens: readonly string[],
  separator: string
): readonly (readonly string[])[] {
  const parts: string[][] = [];
  let current: string[] = [];
  let depth = 0;
  for (const token of tokens) {
    if (token === "(" || token === "[") depth += 1;
    else if (token === ")" || token === "]") depth -= 1;
    if (token === separator && depth === 0) {
      parts.push(current);
      current = [];
      continue;
    }
    current.push(token);
  }
  parts.push(current);
  return parts;
}
/** Index of the token closing the bracket opened at `open`, or -1. */
function matchingClose(tokens: readonly string[], open: number): number {
  let depth = 0;
  for (let scan = open; scan < tokens.length; scan += 1) {
    if (tokens[scan] === "(" || tokens[scan] === "[") depth += 1;
    else if (tokens[scan] === ")" || tokens[scan] === "]") {
      depth -= 1;
      if (depth === 0) return scan;
    }
  }
  return -1;
}
/** `IN (a, b)` and the server's `(col)::text = ANY ((ARRAY[a, b]))` are one shape after this rewrite. */
function rewriteInLists(tokens: readonly string[], code: string): readonly string[] {
  const rewritten: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const close =
      tokens[index] === "I:IN" && tokens[index + 1] === "(" ? matchingClose(tokens, index + 1) : -1;
    if (close === -1) {
      rewritten.push(tokens[index]);
      continue;
    }
    const group = tokens.slice(index + 2, close);
    if (group.some((token) => token !== "," && !/^(S:|N:|P:)/.test(token)))
      fail(code, "an IN list outside the closed literal grammar");
    rewritten.push("=", "I:ANY", "(", "I:ARRAY", "[", ...group, "]", ")");
    index = close;
  }
  return rewritten;
}
/** Drops parentheses that group a single operand, so `ANY((ARRAY[x]))` and `ANY(ARRAY[x])` agree. */
function canonicalOperand(tokens: readonly string[]): string {
  let current = tokens;
  while (current[0] === "(" && matchingClose(current, 0) === current.length - 1)
    current = current.slice(1, -1);
  return current.join(" ");
}
type PredicateNode = string | { readonly [operator: string]: readonly PredicateNode[] };
const COMPARISON_OPERATORS = ["=", "<>", "!=", "<", ">", "<=", ">="] as const;
function parsePredicateAtom(input: readonly string[]): PredicateNode {
  const code = TASK551_ORCHESTRATOR_ERROR_CODES.memberInvalid;
  let tokens = input;
  for (;;) {
    if (tokens.length === 0) fail(code, "an empty predicate atom");
    if (tokens[0] === "I:NOT") return { not: [parsePredicateAtom(tokens.slice(1))] };
    if (tokens[0] === "(" && matchingClose(tokens, 0) === tokens.length - 1) {
      tokens = tokens.slice(1, -1);
      continue;
    }
    break;
  }
  // Paren-stripping can reveal a top-level AND/OR; hand such lists back to the flattening splitter instead of swallowing operands.
  if (splitTokenList(tokens, "I:AND").length > 1 || splitTokenList(tokens, "I:OR").length > 1)
    return JSON.parse(canonicalPredicate(tokens)) as PredicateNode;
  for (let index = 0; index + 1 < tokens.length; index += 1) {
    if (tokens[index] !== "I:IS") continue;
    if (tokens[index + 1] === "I:NULL")
      return { is: [canonicalOperand(tokens.slice(0, index)), "NULL"] };
    if (tokens[index + 1] === "I:NOT" && tokens[index + 2] === "I:NULL")
      return { "is-not": [canonicalOperand(tokens.slice(0, index)), "NULL"] };
  }
  for (const operator of COMPARISON_OPERATORS) {
    const at = tokens.indexOf(operator);
    if (at > 0)
      return {
        [operator]: [canonicalOperand(tokens.slice(0, at)), canonicalOperand(tokens.slice(at + 1))],
      };
  }
  return canonicalOperand(tokens);
}
/** AND/OR are flattened one level, deduplicated and sorted, so redundant grouping cannot change the shape; anything else stays exact. */
function canonicalPredicate(tokens: readonly string[]): string {
  const code = TASK551_ORCHESTRATOR_ERROR_CODES.memberInvalid;
  const rewrite = rewriteInLists(tokens, code);
  for (const operator of ["I:OR", "I:AND"] as const) {
    const parts = splitTokenList(rewrite, operator);
    if (parts.length < 2) continue;
    const key = operator.slice(2).toLowerCase();
    const nodes = parts.map((part) => JSON.parse(canonicalPredicate(part)) as PredicateNode);
    const flattened = nodes.flatMap((node) =>
      typeof node !== "string" && node[key] !== undefined ? node[key] : [node]
    );
    const unique = [...new Set(flattened.map((node) => canonicalJson(node)))].map(
      (text) => JSON.parse(text) as PredicateNode
    );
    unique.sort((left, right) => (canonicalJson(left) < canonicalJson(right) ? -1 : 1));
    return canonicalJson(unique.length === 1 ? unique[0] : { [key]: unique });
  }
  return canonicalJson(parsePredicateAtom(rewrite));
}
/** Parses either representation of a member — the manifest's `CREATE [UNIQUE] INDEX CONCURRENTLY` bytes or the server's `pg_get_indexdef` text — into one closed structural shape. Equality of these shapes, plus `indisready`/`indisvalid`, is the whole member gate; raw byte equality against a Drizzle rendering is never used. */
export function canonicalIndexShape(definition: string): IndexShape {
  const code = TASK551_ORCHESTRATOR_ERROR_CODES.memberInvalid;
  const tokens = tokenizeSqlFragment(definition, code);
  let cursor = 0;
  const take = (expected?: string): string => {
    const token = tokens[cursor];
    if (token === undefined || (expected !== undefined && token !== expected))
      fail(code, `index definition broke at token ${cursor} of ${definition.slice(0, 80)}`);
    cursor += 1;
    return token;
  };
  take("I:CREATE");
  const unique = tokens[cursor] === "I:UNIQUE";
  if (unique) cursor += 1;
  take("I:INDEX");
  if (tokens[cursor] === "I:CONCURRENTLY") cursor += 1;
  const name = take();
  if (!name.startsWith("I:")) fail(code, "index name");
  take("I:ON");
  let table = take();
  let schema = "public";
  while (tokens[cursor] === ".") {
    cursor += 1;
    schema = table.slice(2).toLowerCase();
    table = take();
  }
  take("I:USING");
  const method = take();
  take("(");
  const close = matchingClose(tokens, cursor - 1);
  if (close === -1) fail(code, "unterminated column list");
  const columns = splitTokenList(tokens.slice(cursor, close), ",").map((item) => item.join(" "));
  cursor = close + 1;
  if (tokens[cursor] !== undefined && tokens[cursor] !== "I:WHERE")
    fail(code, "trailing tokens after the column list");
  const predicate =
    tokens[cursor] === undefined ? null : canonicalPredicate(tokens.slice(cursor + 1));
  return {
    unique,
    name: name.slice(2).toLowerCase(),
    schema,
    table: table.slice(2).toLowerCase(),
    method: method.slice(2).toLowerCase(),
    columns,
    predicate,
  };
}
/** The one pre-existing member the rollout must never rebuild or drop, pinned by the same canonical gate. */
const PRESERVED_MEMBER_SHAPE = canonicalIndexShape(
  "CREATE INDEX content_revisions_entry_version_idx ON public.content_revisions USING btree (entry_id, version)"
);
/** Live `pg_get_indexdef` text versus the manifest's executable bytes, in canonical shape, plus the receipt's definition digest. */
function assertMemberDefinition(indexdef: string, createSql: string, name: string): void {
  const live = canonicalIndexShape(indexdef);
  const expected = canonicalIndexShape(createSql);
  for (const key of [
    "unique",
    "name",
    "schema",
    "table",
    "method",
    "columns",
    "predicate",
  ] as const) {
    if (canonicalJson(live[key]) !== canonicalJson(expected[key]))
      fail(TASK551_ORCHESTRATOR_ERROR_CODES.memberInvalid, `${name} breaks its ${key} shape`);
  }
  if (live.name !== name)
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.memberInvalid, `${live.name} is not ${name}`);
}
function manifestMember(name: string): Task551OnlineIndexMember {
  const member = TASK551_ONLINE_INDEX_MEMBERS.find((candidate) => candidate.name === name);
  if (member === undefined)
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.memberInvalid, `${name} is not a manifest member`);
  if (member.dropSql !== `DROP INDEX CONCURRENTLY IF EXISTS "${name}"`)
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.memberInvalid, `${name} has a foreign dropSql`);
  return member;
}
// --- Admission: byte-digested adapter, fleet counts, strict quiescence ------
/** The admission adapter gate: an absolute regular file, owner-readable and owner-executable, not group/world writable. The receipt pins the adapter's CONTENT bytes (never its path string), so the pinned digest survives a rename and changes with any byte of the executable. */
function admissionAdapterSha256(path: string): string {
  const stats = existsSync(path) ? statSync(path) : null;
  if (
    stats === null ||
    !path.startsWith("/") ||
    !stats.isFile() ||
    (stats.mode & 0o500) !== 0o500 ||
    (stats.mode & 0o022) !== 0
  ) {
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.adapterInvalid,
      "the adapter is not an absolute, owner-executable, non-group/world-writable regular file"
    );
  }
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
/** The receipt's prepare-time adapter pin (:221): the env-path bytes' digest is re-derived and compared before the adapter executes in BOTH phases — prepare (:858-859) and the resume cutover — so a binary swapped after prepare never runs unverified. */
export function assertAdapterDigestReproduced(
  receipt: Task551MigrationReceipt,
  derivedSha256: string
): void {
  if (receipt.admission.adapterSha256 !== null && receipt.admission.adapterSha256 !== derivedSha256)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.adapterInvalid,
      "the admission adapter's content does not reproduce the digest frozen in the receipt"
    );
}
/** The per-phase replica gate: grammar-checked ids and binary digests, exactly the state that phase expects (prepare drains to `stopped`, resume proves `running`), and exactly the configured fleet count (:262-267). */
function assertReplica(
  replicas: readonly ReplicaRecord[],
  label: string,
  expectedState: "stopped" | "running",
  expectedCount: number
): void {
  const invalid =
    replicas.length !== expectedCount
      ? `${label} declares ${replicas.length} of the configured ${expectedCount}`
      : replicas.find(
          (replica) =>
            !REPLICA_ID_GRAMMAR.test(replica.id) ||
            !HEX64.test(replica.binarySha256) ||
            replica.state !== expectedState
        )?.id;
  if (invalid !== undefined)
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.adapterInvalid, `${label}: ${invalid}`);
}
/** Strict response parse (:262-269): closed key set, byte ceiling, operation/nonce/receipt echoes, canonical completion time, per-phase replica states and fleet counts, cross-array id uniqueness, and — for a resume — the runner's own authorization digest echoed back. */
export function parseAdapterAck(
  text: string,
  action: string,
  operationId: string,
  nonce: string,
  receiptSha256: string,
  fleet: Task551MigrationReceipt["admission"]["fleet"],
  expectedAuthorizationSha256?: string
): AdapterAck {
  const code = TASK551_ORCHESTRATOR_ERROR_CODES.adapterInvalid;
  const ack = JSON.parse(text) as AdapterAck & Record<string, unknown>;
  if (
    Buffer.byteLength(text, "utf8") > BUDGETS.adapterStdoutMaxBytes ||
    Object.keys(ack).some((key) => !(ALLOWED_ACK_KEYS as readonly string[]).includes(key))
  ) {
    fail(code, "the ack exceeds its byte ceiling or carries a foreign key");
  }
  if (action !== "prepare" && action !== "resume") fail(code, `unknown action ${action}`);
  if (Object.keys(ack).some((key) => !(PHASE_ACK_KEYS[action] as readonly string[]).includes(key)))
    fail(code, `the ${action} ack carries a key of the other phase`);
  if (
    ack.version !== 1 ||
    ack.action !== action ||
    ack.operationId !== operationId ||
    ack.nonce !== nonce ||
    ack.receiptSha256 !== receiptSha256
  )
    fail(code, "the ack does not bind this operation");
  if (!CANONICAL_UTC.test(ack.completedAt)) fail(code, "completedAt");
  const expectedState = action === "prepare" ? "stopped" : "running";
  assertReplica(ack.runtimeReplicas, "runtimeReplicas", expectedState, fleet.runtimeProcessCount);
  assertReplica(ack.workerReplicas, "workerReplicas", expectedState, fleet.workerProcessCount);
  const ids = [...ack.runtimeReplicas, ...ack.workerReplicas].map((replica) => replica.id);
  if (new Set(ids).size !== ids.length)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.adapterInvalid,
      "a replica id repeats across the runtime and worker arrays"
    );
  if (action === "prepare") {
    if (
      ack.admissionStopped !== true ||
      ack.workersDrained !== true ||
      ack.maintenanceStopped !== true
    )
      fail(
        TASK551_ORCHESTRATOR_ERROR_CODES.adapterPrepareFailed,
        "the prepare ack is not fully drained"
      );
  } else if (action === "resume") {
    if (ack.admissionResumed !== true || ack.workersResumed !== true)
      fail(
        TASK551_ORCHESTRATOR_ERROR_CODES.adapterResumeFailed,
        "the resume ack is not fully resumed"
      );
    if (ack.authorizationSha256 === undefined || !HEX64.test(ack.authorizationSha256))
      fail(TASK551_ORCHESTRATOR_ERROR_CODES.adapterResumeFailed, "authorizationSha256");
    if (ack.authorizationSha256 !== expectedAuthorizationSha256)
      fail(
        TASK551_ORCHESTRATOR_ERROR_CODES.adapterResumeFailed,
        "the resume ack does not echo the runner's authorization digest"
      );
  }
  return ack;
}
/** One adapter invocation: the contract's flag-form argv (:255-256, :267-269), byte-capped output, hard timeout, non-zero exit refusal; every refusal rejects the awaiting rollout. */
function runAdmissionAdapter(
  path: string,
  action: "prepare" | "resume",
  operationId: string,
  nonce: string,
  receiptSha256: string,
  fleet: Task551MigrationReceipt["admission"]["fleet"],
  authorizationSha256?: string
): Promise<AdapterAck> {
  const argv = [
    action,
    "--operation-id",
    operationId,
    "--nonce",
    nonce,
    "--receipt-sha256",
    receiptSha256,
  ];
  if (action === "resume") argv.push("--authorization-sha256", authorizationSha256 ?? "");
  return new Promise((resolveAdapter, rejectAdapter) => {
    execFile(
      path,
      argv,
      {
        timeout:
          action === "prepare" ? BUDGETS.adapterPrepareTimeoutMs : BUDGETS.adapterResumeTimeoutMs,
        maxBuffer: BUDGETS.adapterStdoutMaxBytes,
        encoding: "utf8",
        windowsHide: true,
      },
      (error: (Error & { code?: number | string }) | null, stdout: string, stderr: string) => {
        try {
          if (error !== null)
            fail(
              action === "prepare"
                ? TASK551_ORCHESTRATOR_ERROR_CODES.adapterPrepareFailed
                : TASK551_ORCHESTRATOR_ERROR_CODES.adapterResumeFailed,
              `${action} exited ${String(error.code)} with ${stderr.slice(0, 200)}`
            );
          if (stderr.length > BUDGETS.adapterStderrMaxBytes)
            fail(
              TASK551_ORCHESTRATOR_ERROR_CODES.adapterInvalid,
              "stderr exceeds its byte ceiling"
            );
          resolveAdapter(
            parseAdapterAck(
              stdout,
              action,
              operationId,
              nonce,
              receiptSha256,
              fleet,
              authorizationSha256
            )
          );
        } catch (refusal) {
          rejectAdapter(refusal);
        }
      }
    );
  });
}
/** Phase-3 visibility prerequisite: one runtime- and one worker-named probe connection under the exact application database role must be observable by the migration session with two distinct backends, and both must be gone after they close. Any read/visibility failure is `task551_migration_activity_visibility_invalid`; no limitation is ever treated as an empty result. */
async function probeActivityVisibility(session: ReservedSession, target: string): Promise<void> {
  const code = TASK551_ORCHESTRATOR_ERROR_CODES.activityVisibilityInvalid;
  const probes = postgres(target, {
    max: 2,
    idle_timeout: 0,
    max_lifetime: 0,
    connect_timeout: 30,
    backoff: false,
  });
  const observed = new Set<string>();
  const held: ReservedSession[] = [];
  try {
    const identity =
      (await values<[string]>(session`select current_database() || '|' || current_user`))[0]?.[0] ??
      "";
    for (const [kind, replicaId] of VISIBILITY_PROBES) {
      const name = buildDatabaseApplicationName(kind, replicaId);
      const connection = (await probes.reserve()) as unknown as ReservedSession;
      held.push(connection);
      await connection.unsafe(`set application_name = '${name}'`);
      const row = (
        await values<
          [string, string, string]
        >(session`select pid::text, coalesce(datname, '') || '|' || coalesce(usename, ''), coalesce(application_name, '')
          from pg_stat_activity where application_name = ${name} and pid <> pg_backend_pid() and backend_type = 'client backend'`)
      )[0];
      if (row === undefined || row[1] === "" || row[1] !== identity || row[2] !== name)
        fail(code, `${name} is not visible under the application role`);
      if (observed.has(row[0])) fail(code, `${name} does not hold a distinct backend`);
      observed.add(row[0]);
    }
    if (observed.size !== VISIBILITY_PROBES.length)
      fail(code, "the probes did not yield distinct backends");
  } catch (error) {
    fail(code, error instanceof Error ? error.message : String(error));
  } finally {
    for (const connection of held) await connection.release().catch(() => undefined);
    await probes.end({ timeout: 0 }).catch(() => undefined);
  }
  for (const [kind, replicaId] of VISIBILITY_PROBES) {
    const name = buildDatabaseApplicationName(kind, replicaId);
    if (
      (
        await values<[string]>(
          session`select pid from pg_stat_activity where application_name = ${name}`
        )
      ).length > 0
    )
      fail(code, `${name} survived the probe release`);
  }
}
/** The phase-3 sample (:226-230): same database AND same application role, own PID excluded — after the probes are gone every other same-role client backend is an intruder. */
async function sampleRoleSessions(session: ReservedSession): Promise<readonly string[]> {
  return (
    await values<
      [string, string]
    >(session`select pid::text, coalesce(application_name, '') from pg_stat_activity
      where pid <> pg_backend_pid() and backend_type = 'client backend' and datname = current_database() and usename = current_user`)
  ).map(([pid, name]) => `${pid}:${name}`);
}
/** Contract :283-284, :297-299 — in `offline-single` no application/worker/maintenance session may appear before command completion, so the closed-world role sample is re-proven at the end of the command, not only before the first DDL. */
async function assertQuietCompletion(session: ReservedSession, offline: boolean): Promise<void> {
  if (!offline) return;
  const intruders = await sampleRoleSessions(session);
  if (intruders.length > 0)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.quiescenceFailed,
      `an application session appeared before command completion: ${intruders.slice(0, 8).join(" | ")}`
    );
}
/** Full phase-3 proof: visibility first, then — when quiescence is required now (`offline-single` before phase 2, and every post-drain window) — a continuous 5s intruder-free window inside the 120s deadline. Returns the window start, persisted as `quiescentFrom`, or null when none was due. */
async function proveQuiescence(
  session: ReservedSession,
  target: string,
  immediate: boolean
): Promise<string | null> {
  await probeActivityVisibility(session, target);
  if (!immediate) return null;
  const deadline = Date.now() + BUDGETS.quiescenceDeadlineMs;
  let quietSince: number | null = null;
  for (;;) {
    const intruders = await sampleRoleSessions(session);
    if (intruders.length > 0) {
      quietSince = null;
      if (Date.now() > deadline)
        fail(TASK551_ORCHESTRATOR_ERROR_CODES.quiescenceFailed, intruders.slice(0, 8).join(" | "));
    } else {
      quietSince ??= Date.now();
      if (Date.now() - quietSince >= BUDGETS.quiescenceWindowMs)
        return new Date(quietSince).toISOString();
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, BUDGETS.probeIntervalMs));
  }
}
/** The B6 disk gate: real `statfs` free bytes on the migrations filesystem, never a folder inode size. The suite injects ONE fixed reading through `injectFreeDiskBytes`, so the digest producer and its reproduction read the same single value and no assertion ever compares two live `statfs` readings — the pre-DDL cases are deterministic by construction; the default `null` keeps the live read. Injected and live readings resolve to ONE value that passes through the SAME finite/positive guard: a non-finite or non-positive injection refuses the gate exactly like a bad live read. */
let injectedFreeBytes: number | null = null;
export function injectFreeDiskBytes(freeBytes: number | null): void {
  injectedFreeBytes = freeBytes;
}
const liveFreeBytes = (): number => {
  const stats = statfsSync(MIGRATIONS_FOLDER);
  return Number(stats.bavail) * Number(stats.bsize);
};
export function freeDiskBytes(): number {
  const freeBytes = injectedFreeBytes ?? liveFreeBytes();
  if (!Number.isFinite(freeBytes) || freeBytes <= 0)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
      "the migrations filesystem reports no usable free bytes"
    );
  return freeBytes;
}
export function assertFreeDisk(requirementBytes: number, freeBytes: number): void {
  if (freeBytes < requirementBytes * BUDGETS.freeDiskFactor)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
      `only ${freeBytes} free for ${requirementBytes} x${BUDGETS.freeDiskFactor}`
    );
}
/** The frozen preflight budgets are the only source of session budgets — on resume they are re-applied verbatim, never recomputed or loosened (:190-197). */
async function setSessionBudgets(
  session: ReservedSession,
  preflight: Task551MigrationReceipt["preflight"]
): Promise<void> {
  await session`select set_config('lock_timeout', ${String(preflight.lockTimeoutMs)}, false), set_config('statement_timeout', ${String(preflight.statementTimeoutMs)}, false),
      set_config('idle_in_transaction_session_timeout', ${String(BUDGETS.idleInTransactionTimeoutMs)}, false)`;
  await session.unsafe(`set transaction_timeout = '${String(preflight.transactionTimeoutMs)}'`);
}
/** Per-table measurement of one touched table: the exact :181 classification input. */
export interface TouchedMeasure {
  readonly name: string;
  readonly bytes: number;
  readonly rows: number;
}
/** Per-table bytes and rows of the touched set: the classification input and the free-disk requirement. Every touched table must be present by name, no foreign row may appear, and a never-analyzed table (negative planner estimate) refuses instead of reading as empty. */
async function measureTouchedTables(
  session: ReservedSession,
  touchedTables: readonly string[]
): Promise<{ tables: readonly TouchedMeasure[]; bytes: number }> {
  const rows = await values<
    [string, string, string]
  >(session`select c.relname, coalesce(pg_total_relation_size(c.oid), 0), c.reltuples
      from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = any(${[...touchedTables]}) and c.relkind = 'r'`);
  const tables = [...touchedTables].sort().map((name) => {
    const row = rows.find((candidate) => candidate[0] === name);
    if (row === undefined)
      fail(
        TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
        `the touched table ${name} does not exist`
      );
    const estimate = Number(row[2]);
    if (!Number.isFinite(estimate) || estimate < 0)
      fail(
        TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
        `${name} has no analyzed row estimate`
      );
    return { name, bytes: Number(row[1]), rows: estimate };
  });
  if (tables.length !== rows.length)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
      `${String(rows.length)} measured rows for ${String(tables.length)} touched tables`
    );
  return { tables, bytes: tables.reduce((total, table) => total + table.bytes, 0) };
}
/** Data conflicts captured into the canonical preflight digest (:186-188): duplicate revision keys and overlapping active booking windows. */
export interface PreflightConflicts {
  readonly duplicateRevisionGroups: number;
  readonly overlappingBookingWindows: number;
}
async function measureDataConflicts(session: ReservedSession): Promise<PreflightConflicts> {
  // All four probes are schema-qualified like every other catalog probe in this file (:617, :680): an unqualified table resolves through the session's search_path, so a same-named foreign object could false-pass the conflict gate.
  const duplicates = await values<[string]>(session`select count(*) from (
      select entry_id, version from public.page_revisions group by 1, 2 having count(*) > 1 union all select entry_id, version from public.content_revisions group by 1, 2 having count(*) > 1
      union all select template_id, version from public.widget_template_revisions group by 1, 2 having count(*) > 1) as offenders`);
  const overlaps = await values<
    [string]
  >(session`select count(*) from public.bookings a join public.bookings b on a.resource_id = b.resource_id and a.id < b.id
      and a.status in ('pending', 'confirmed') and b.status in ('pending', 'confirmed') and tsrange(a.starts_at, a.ends_at, '[)') && tsrange(b.starts_at, b.ends_at, '[)')`);
  return {
    duplicateRevisionGroups: Number(duplicates[0]?.[0]),
    overlappingBookingWindows: Number(overlaps[0]?.[0]),
  };
}
export function assertDataConflicts(conflicts: PreflightConflicts): void {
  if (
    !Number.isInteger(conflicts.duplicateRevisionGroups) ||
    conflicts.duplicateRevisionGroups < 0 ||
    !Number.isInteger(conflicts.overlappingBookingWindows) ||
    conflicts.overlappingBookingWindows < 0
  ) {
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
      "a data-conflict count measured outside its own domain"
    );
  }
  if (conflicts.duplicateRevisionGroups !== 0)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.dataConflict,
      `${conflicts.duplicateRevisionGroups} duplicate revision key groups`
    );
  if (conflicts.overlappingBookingWindows !== 0)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.dataConflict,
      `${conflicts.overlappingBookingWindows} booking window overlaps would break the exclusion seam`
    );
}
/** The closed small/large rule (:181), exactly per table: EVERY touched table at most 100,000 rows and 256 MiB, and the combined size at most 1 GiB. */
export function classifyMeasured(tables: readonly TouchedMeasure[]): "small" | "large" {
  const combined = tables.reduce((total, table) => total + table.bytes, 0);
  return tables.every(
    (table) => table.rows <= BUDGETS.smallTableRows && table.bytes <= BUDGETS.smallTableBytes
  ) && combined <= BUDGETS.combinedBytes
    ? "small"
    : "large";
}
// --- Contract :183-186 — the L02 pre-decision interval, consumed before any candidate is frozen ---
/** The closed receipt key set L02's collector writes; anything else is a foreign artifact. */
const INTERVAL_RECEIPT_KEYS = [
  "cleanAfterDiagnostics",
  "databaseIdentitySha256",
  "deltas",
  "eligibleApplicationQueryIds",
  "end",
  "excludedQueryIds",
  "extensionVersion",
  "name",
  "purpose",
  "serverIdentitySha256",
  "sourceClassTotals",
  "start",
  "statsReset",
  "version",
] as const;
type PredecisionReceipt = PgStatIntervalReceipt & Record<string, unknown>;
/** Rebuilds the interval's end boundary from the receipt's own deltas over the decoded start snapshot, so L02's `buildIntervalReceipt` can recompute the receipt and every delta, classification and total is proven rather than trusted. */
function reconstructedEndSnapshot(
  start: PgStatSnapshot,
  receipt: PredecisionReceipt
): PgStatSnapshot {
  const before = new Map(start.counters.map((counter) => [counter.queryId, counter]));
  const deltas = receipt.deltas as readonly {
    queryId: string;
    callsDelta: number;
    rowsDelta: number;
    totalPlanMsDelta: number;
    totalExecMsDelta: number;
  }[];
  return {
    version: 1,
    boundary: "end",
    name: start.name,
    purpose: start.purpose,
    capturedAt: receipt.end.capturedAt as string,
    identity: {
      serverIdentitySha256: receipt.serverIdentitySha256 as string,
      databaseIdentitySha256: receipt.databaseIdentitySha256 as string,
      postgresMajor: start.identity.postgresMajor,
      extensionVersion: receipt.extensionVersion as string,
      statsReset: receipt.statsReset as string,
    },
    counters: deltas.map((delta) => {
      const prior = before.get(delta.queryId);
      return {
        queryId: delta.queryId,
        calls: (prior?.calls ?? 0) + delta.callsDelta,
        rows: (prior?.rows ?? 0) + delta.rowsDelta,
        totalPlanMs: (prior?.totalPlanMs ?? 0) + delta.totalPlanMsDelta,
        totalExecMs: (prior?.totalExecMs ?? 0) + delta.totalExecMsDelta,
        normalizedQuerySha256: prior?.normalizedQuerySha256,
      };
    }),
  };
}
/** Consumes the strict `task551-predecision-clean` pair L02 produced: decode, identity/reset agreement with the start snapshot, start-snapshot byte binding, clean-after-diagnostics, a recomputation through `buildIntervalReceipt`, and application-only deltas — a reset/identity mismatch, polluted interval or diagnostic/unknown-driven candidate refuses before the read-index candidates are frozen. Returns the interval's canonical digest for the preflight digest. */
export function consumePredecisionInterval(
  startBytes: Buffer,
  receiptBytes: Buffer,
  evidenceBytes: Buffer
): { digest: string; statsReset: string } {
  const refuse = (detail: string): never =>
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
      `the ${PREDECISION_INTERVAL_NAME} interval is not usable: ${detail}`
    );
  const start = decodeSnapshot(startBytes);
  if (start.name !== PREDECISION_INTERVAL_NAME || start.boundary !== "start")
    refuse("the start snapshot is not this interval's start boundary");
  const evidence = decodeOperatorEvidence(evidenceBytes);
  if (new Date(start.capturedAt) <= new Date(evidence.diagnosticsEndedAt))
    refuse("the interval started before the operator's diagnostics ended");
  let parsed: unknown;
  try {
    parsed = JSON.parse(receiptBytes.toString("utf8"));
  } catch {
    return refuse("the interval receipt is not JSON");
  }
  const receipt = parsed as PredecisionReceipt;
  if (
    receipt === null ||
    typeof receipt !== "object" ||
    Object.keys(receipt).sort().join(",") !== INTERVAL_RECEIPT_KEYS.join(",")
  )
    refuse("the interval receipt carries a foreign key set");
  if (
    !Array.isArray(receipt.deltas) ||
    typeof (receipt.end as { capturedAt?: unknown } | null)?.capturedAt !== "string"
  )
    refuse("the interval receipt breaks its own shape");
  if (
    receipt.version !== 1 ||
    receipt.name !== PREDECISION_INTERVAL_NAME ||
    receipt.purpose !== INTERVAL_NAME_PURPOSES[PREDECISION_INTERVAL_NAME]
  )
    refuse("the interval receipt is not this interval");
  if (
    receipt.start === null ||
    typeof receipt.start !== "object" ||
    (receipt.start as { snapshotSha256?: unknown }).snapshotSha256 !==
      sha256Hex(canonicalJson(start))
  )
    refuse("the receipt is not bound to this start snapshot");
  if (
    receipt.statsReset !== start.identity.statsReset ||
    receipt.serverIdentitySha256 !== start.identity.serverIdentitySha256 ||
    receipt.databaseIdentitySha256 !== start.identity.databaseIdentitySha256 ||
    receipt.extensionVersion !== start.identity.extensionVersion
  )
    refuse("the counters were reset or the identity changed inside the interval");
  if (receipt.cleanAfterDiagnostics !== true) refuse("the interval is not clean after diagnostics");
  const end = reconstructedEndSnapshot(start, receipt);
  const rebuilt = buildIntervalReceipt({ start, end, evidence });
  const same = (key: string): boolean =>
    canonicalJson((rebuilt as unknown as Record<string, unknown>)[key]) ===
    canonicalJson(receipt[key]);
  if (!INTERVAL_RECEIPT_KEYS.filter((key) => key !== "end" && key !== "start").every(same))
    refuse("the receipt does not recompute from its own start snapshot");
  if (
    (receipt.deltas as readonly { sourceClass: string }[]).some(
      (delta) => delta.sourceClass !== "application"
    ) ||
    (receipt.excludedQueryIds as readonly unknown[]).length > 0
  ) {
    refuse("the interval carries a diagnostic or unknown-driven candidate");
  }
  return {
    statsReset: receipt.statsReset as string,
    digest: sha256Hex(
      canonicalJson({
        name: receipt.name,
        purpose: receipt.purpose,
        start: receipt.start,
        statsReset: receipt.statsReset,
        serverIdentitySha256: receipt.serverIdentitySha256,
        databaseIdentitySha256: receipt.databaseIdentitySha256,
        extensionVersion: receipt.extensionVersion,
        deltas: receipt.deltas,
        sourceClassTotals: receipt.sourceClassTotals,
        eligibleApplicationQueryIds: receipt.eligibleApplicationQueryIds,
      })
    ),
  };
}
/** The file-bound form: exactly the paths L02's own collector names for this interval, present and read. */
function consumePredecisionIntervalFiles(): { digest: string; statsReset: string } {
  const paths = [
    expectedStartPath(PREDECISION_INTERVAL_NAME),
    expectedReceiptPath(PREDECISION_INTERVAL_NAME),
    EXPECTED_OPERATOR_EVIDENCE_PATH,
  ];
  for (const path of paths)
    if (!existsSync(path))
      fail(
        TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
        `the ${PREDECISION_INTERVAL_NAME} artifact ${path} is absent`
      );
  return consumePredecisionInterval(
    readFileSync(paths[0]),
    readFileSync(paths[1]),
    readFileSync(paths[2])
  );
}
/** The live :186-189 health ceilings, measured on the migration session. Every value is read as `::text` so no server OID shape can surprise the runtime type. */
export interface PreflightHealth {
  readonly lagSeconds: number;
  readonly oldestTransactionSeconds: number;
  readonly invalidBookingWindows: number;
}
/** Replication lag on a primary is zero by definition — the rollout writes where it reads; a standby that has replayed nothing has unbounded lag and refuses. The oldest transaction is the oldest in-flight `xact_start` of any other client backend of this database; the invalid windows are `ends_at < starts_at`. */
async function measureHealthCeilings(session: ReservedSession): Promise<PreflightHealth> {
  const row = (
    await values<[string, string | null, string, string]>(session`select pg_is_in_recovery()::text,
      (case when pg_is_in_recovery() then extract(epoch from (now() - pg_last_xact_replay_timestamp())) else 0 end)::text,
      (coalesce((select max(extract(epoch from (now() - a.xact_start))) from pg_stat_activity a where a.datname = current_database()
        and a.pid <> pg_backend_pid() and a.backend_type = 'client backend' and a.xact_start is not null), 0))::text,
      (select count(*) from public.bookings where ends_at < starts_at)::text`)
  )[0];
  if (row === undefined)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
      "the health ceilings could not be measured"
    );
  const lagSeconds = Number(row[1]);
  // `bool::text` renders 't'/'f' over the wire (text OID 25 has no registered parser, so the raw server text arrives) — admit both renders, exactly like :681 does for `indisready::text`, so a standby whose lag column is NULL refuses instead of reading as 0s.
  const inRecovery = row[0] === "t" || row[0] === "true";
  if (inRecovery && row[1] === null)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
      "the standby has replayed no transaction, so replication lag is unbounded"
    );
  if (
    !Number.isFinite(lagSeconds) ||
    lagSeconds < 0 ||
    !Number.isFinite(Number(row[2])) ||
    Number(row[2]) < 0 ||
    !Number.isFinite(Number(row[3]))
  ) {
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
      "a health ceiling measured outside its own domain"
    );
  }
  return {
    lagSeconds,
    oldestTransactionSeconds: Number(row[2]),
    invalidBookingWindows: Number(row[3]),
  };
}
/** The :186-189 gates. Lag and the oldest transaction are timing ceilings; a corrupt booking window is a data conflict that no rollout may paper over. */
export function assertHealthCeilings(health: PreflightHealth): void {
  if (health.lagSeconds > BUDGETS.maxLagSeconds)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
      `replication lag ${health.lagSeconds}s exceeds the ${BUDGETS.maxLagSeconds}s ceiling`
    );
  if (health.oldestTransactionSeconds > BUDGETS.maxOldestTransactionSeconds)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
      `the oldest transaction ${health.oldestTransactionSeconds}s exceeds the ${BUDGETS.maxOldestTransactionSeconds}s ceiling`
    );
  if (!Number.isInteger(health.invalidBookingWindows) || health.invalidBookingWindows < 0)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
      "the invalid booking window count is not a count"
    );
  if (health.invalidBookingWindows > 0)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.dataConflict,
      `${health.invalidBookingWindows} booking windows end before they start`
    );
}
/** One canonical preflight measurement: re-measures, re-requires every ceiling and invariant, and returns the exact evidence bundle the canonical preflight digest binds. */
async function measurePreflightEvidence(
  session: ReservedSession,
  touchedTables: readonly string[]
): Promise<{
  health: PreflightHealth;
  conflicts: PreflightConflicts;
  tables: readonly TouchedMeasure[];
  bytes: number;
  freeBytes: number;
}> {
  const health = await measureHealthCeilings(session);
  assertHealthCeilings(health);
  const conflicts = await measureDataConflicts(session);
  assertDataConflicts(conflicts);
  const measured = await measureTouchedTables(session, touchedTables);
  const freeBytes = freeDiskBytes();
  assertFreeDisk(measured.bytes, freeBytes);
  return { health, conflicts, tables: measured.tables, bytes: measured.bytes, freeBytes };
}
/** The canonical preflight digest (:184-189): the resolved artifacts, the frozen budgets, the L02 pre-decision interval and the exact captured evidence — counts, free disk, lag, oldest transaction, duplicate revisions, invalid and overlapping windows — one closed hash. */
export function canonicalPreflightDigest(input: {
  aggregateSha256: string;
  classification: "small" | "large";
  conflicts: PreflightConflicts;
  lockTimeoutMs: number;
  statementTimeoutMs: number;
  transactionTimeoutMs: number;
  predecisionSha256: string;
  health: PreflightHealth;
  tables: readonly TouchedMeasure[];
  bytes: number;
  freeBytes: number;
}): string {
  return sha256Hex(canonicalJson(input));
}
/** A resumed pre-phase-2 command must reproduce that digest, not merely the artifacts (:190-191): the same evidence is re-measured and re-gated, and any drift refuses while nothing has been written yet. */
export async function assertPreflightReproduced(
  session: ReservedSession,
  receipt: Task551MigrationReceipt,
  touchedTables: readonly string[],
  predecisionSha256: string
): Promise<void> {
  const evidence = await measurePreflightEvidence(session, touchedTables);
  const digest = canonicalPreflightDigest({
    aggregateSha256: receipt.artifacts.aggregateSha256,
    classification: receipt.preflight.classification,
    lockTimeoutMs: receipt.preflight.lockTimeoutMs,
    statementTimeoutMs: receipt.preflight.statementTimeoutMs,
    transactionTimeoutMs: receipt.preflight.transactionTimeoutMs,
    predecisionSha256,
    ...evidence,
  });
  if (digest !== receipt.preflight.digest)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
      "the canonical preflight digest does not reproduce its captured evidence"
    );
}
/** Contract :190-197 — after DDL or compatible traffic a resume never rewrites the frozen digest/classification/budgets: it re-measures, re-requires every ceiling and invariant (the :186-189 health ceilings included), refuses a live classification the frozen one no longer covers, and appends one fresh health recheck digest. */
export async function appendHealthRecheck(
  session: ReservedSession,
  receipt: Task551MigrationReceipt,
  touchedTables: readonly string[]
): Promise<Task551MigrationReceipt["preflight"]> {
  const measured = await measurePreflightEvidence(session, touchedTables);
  if (
    classifyMeasured(measured.tables) === "large" &&
    receipt.preflight.classification === "small"
  ) {
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
      "the live counts no longer fit the frozen small classification; the rollout stops instead of loosening a budget"
    );
  }
  const digest = sha256Hex(
    canonicalJson({
      at: nowUtc(),
      aggregateSha256: receipt.artifacts.aggregateSha256,
      bytes: measured.bytes,
      tables: measured.tables,
      conflicts: measured.conflicts,
      freeBytes: measured.freeBytes,
      health: measured.health,
      classification: receipt.preflight.classification,
      lockTimeoutMs: receipt.preflight.lockTimeoutMs,
      statementTimeoutMs: receipt.preflight.statementTimeoutMs,
      transactionTimeoutMs: receipt.preflight.transactionTimeoutMs,
      state: receipt.state,
    })
  );
  return { ...receipt.preflight, recheckDigests: [...receipt.preflight.recheckDigests, digest] };
}
// --- Reserved session: one max-1 client, one reserve(), one advisory lock ----
let reservedPool: PoolClient | null = null;
/** Contract :155-159 — a poisoned lease performs no more SQL and is never released; the pool ends exactly once in either branch. The guard is shared by the migrator-transaction adapter and by the command's own exit path, so a reset/PID failure cannot leak an unlock, a release or a second `end()`. */
const leaseGuard: { poisoned: boolean; ended: boolean } = { poisoned: false, ended: false };
function poisonLease(): void {
  leaseGuard.poisoned = true;
}
async function endPoolOnce(): Promise<void> {
  if (leaseGuard.ended || reservedPool === null) return;
  leaseGuard.ended = true;
  await reservedPool.end({ timeout: 0 }).catch(() => undefined);
}
async function openReservedSession(target: string, operationId: string): Promise<ReservedSession> {
  const pool = postgres(target, {
    max: 1,
    idle_timeout: 0,
    max_lifetime: 0,
    connect_timeout: 30,
    backoff: false,
  });
  reservedPool = pool;
  leaseGuard.poisoned = false;
  leaseGuard.ended = false;
  const reserved = (await pool.reserve()) as unknown as ReservedSession;
  await reserved`select set_config('application_name', ${buildDatabaseApplicationName("migration", operationId)}, false)`;
  return reserved;
}
/** The dedicated lease step. The installed postgres.js parses bool (OID 16, `parsers[16] = x => x === 't'`) into the JS boolean `true`, so the live value of `pg_try_advisory_lock` is `true` — never the strings a `::text` render would give. Both runtime shapes are admitted, nothing else. */
async function takeAdvisoryLock(session: ReservedSession, operationId: string): Promise<void> {
  const locked = await values<[boolean | string]>(
    session`select pg_try_advisory_lock(hashtext(${ADVISORY_LOCK_PURPOSE}), hashtext(${operationId}))`
  );
  const granted = locked[0]?.[0];
  if (granted !== true && granted !== "true" && granted !== "t")
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.leasePoisoned,
      "the rollout advisory lock is held elsewhere"
    );
}
async function releaseAdvisoryLock(session: ReservedSession, operationId: string): Promise<void> {
  await session`select pg_advisory_unlock(hashtext(${ADVISORY_LOCK_PURPOSE}), hashtext(${operationId}))`;
}
/** One exit path for every command: unlock, release the reserved backend, end the max-1 pool with timeout 0. A poisoned lease does none of the SQL and only ends the pool — exactly once. */
async function closeReserved(session: ReservedSession, operationId: string | null): Promise<void> {
  if (leaseGuard.poisoned) {
    await endPoolOnce();
    return;
  }
  if (operationId !== null) await releaseAdvisoryLock(session, operationId).catch(() => undefined);
  await session.release().catch(() => undefined);
  await endPoolOnce();
}
// --- Online members, journal cleanup, and the final catalog gate -------------
/** The live catalog row of one member index. `relkind` admits both index flavours (`i` plain, `I` partitioned) like every other index lookup in this repo: all 89 manifest members are plain btree indexes, so a partitioned-index-only pin would make this lookup vacuous and brick the three-way build path. */
async function indexCatalogRow(
  session: ReservedSession,
  name: string
): Promise<{ definition: string; ready: boolean; valid: boolean } | null> {
  const row = (
    await values<
      [string, string, string]
    >(session`select pg_get_indexdef(c.oid), i.indisready::text, i.indisvalid::text from pg_class c
      join pg_index i on i.indexrelid = c.oid join pg_namespace n on n.oid = c.relnamespace
      where c.relname = ${name} and n.nspname = 'public' and c.relkind in ('i', 'I')`)
  )[0];
  return row === undefined
    ? null
    : {
        definition: row[0],
        ready: row[1] === "true" || row[1] === "t",
        valid: row[2] === "true" || row[2] === "t",
      };
}
/** Contract :255-259 — the three-way classification of a pre-existing object: a valid identical member skips, task-owned invalid residue (same canonical shape but not ready/valid) drops concurrently then rebuilds, and a foreign or wrongly shaped valid object refuses instead of being adopted or dropped. */
async function buildMember(session: ReservedSession, name: string): Promise<void> {
  const member = manifestMember(name);
  const existing = await indexCatalogRow(session, name);
  if (existing !== null) {
    const expected = canonicalIndexShape(member.createSql);
    if (
      canonicalJson(canonicalIndexShape(existing.definition)) !== canonicalJson(expected) ||
      expected.name !== name
    )
      fail(
        TASK551_ORCHESTRATOR_ERROR_CODES.memberInvalid,
        `${name} is a foreign or wrongly shaped object and is never adopted or dropped`
      );
    if (existing.ready && existing.valid) return;
    await session.unsafe(`drop index concurrently if exists "${name}"`);
    if ((await indexCatalogRow(session, name)) !== null)
      fail(
        TASK551_ORCHESTRATOR_ERROR_CODES.memberInvalid,
        `${name} survived its invalid-residue drop`
      );
  }
  await session.unsafe(`set statement_timeout = '${BUDGETS.onlineMemberMs}'`);
  await session.unsafe(member.createSql);
  const row = await indexCatalogRow(session, name);
  if (row === null || !row.valid || !row.ready)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.memberInvalid,
      `${name} is not valid and ready after its concurrent build`
    );
  assertMemberDefinition(row.definition, member.createSql, name);
}
async function dropMember(session: ReservedSession, name: string): Promise<void> {
  if (name === PRESERVED_MEMBER_SHAPE.name)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.reverseForbidden,
      "the preserved revision index is never dropped"
    );
  await session.unsafe(manifestMember(name).dropSql);
  if ((await indexCatalogRow(session, name)) !== null)
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.memberInvalid, `${name} survived its concurrent drop`);
}
/** B7: the migrator's own journal row is removed by its content hash, so a forward reapply is never silently skipped. */
async function dropJournalRow(session: ReservedSession, migrationSha256: string): Promise<void> {
  const removed = await values<[string]>(
    session`delete from drizzle.__drizzle_migrations where hash = ${migrationSha256} returning hash`
  );
  if (removed.length !== 1)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.artifactDigestChanged,
      `${removed.length} journal rows matched the transactional migration hash`
    );
}
/** The transactional artifact's own objects, derived from its statements — never a hand-pinned catalog (:307-308). The exclusion seam is deliberately excluded here: it is reversed only through its descriptor `dropSql`. */
export function transactionalReverseTargets(
  statements: readonly string[]
): readonly { kind: "constraint" | "column" | "table"; table: string; name: string }[] {
  const targets: { kind: "constraint" | "column" | "table"; table: string; name: string }[] = [];
  for (const statement of statements) {
    const table = /^CREATE TABLE "([^"]+)"/.exec(statement);
    const column = /^ALTER TABLE "([^"]+)" ADD COLUMN "([^"]+)"/.exec(statement);
    const constraint = /^ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)"/.exec(statement);
    if (table !== null) targets.push({ kind: "table", table: table[1], name: table[1] });
    else if (column !== null) targets.push({ kind: "column", table: column[1], name: column[2] });
    else if (constraint !== null && constraint[2] !== TASK551_EXCLUSION_CONSTRAINT_NAME)
      targets.push({ kind: "constraint", table: constraint[1], name: constraint[2] });
  }
  if (
    !targets.some(
      (target) => target.kind === "table" && target.name === RECEIPT_TABLE.split(".")[1]
    )
  ) {
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.artifactDigestChanged,
      "the artifact no longer creates the receipt table, so a reverse could not remove it"
    );
  }
  return targets;
}
/** Contract :307-308 — one transaction reverses the transactional artifact itself: the exclusion through its descriptor `dropSql`, then every added constraint, generated/plain column and table, the receipt table included. `btree_gist` is deliberately preserved, and the live catalog is proven clean afterwards. */
async function reverseTransactionalArtifact(
  session: ReservedSession,
  artifacts: Task551Artifacts
): Promise<void> {
  const order = { constraint: 0, column: 1, table: 2 } as const;
  const targets = transactionalReverseTargets(artifacts.transactionalStatements)
    .slice()
    .sort((left, right) => order[left.kind] - order[right.kind]);
  await session.unsafe("begin");
  try {
    await session.unsafe(BOOKING_RESERVATION_EXCLUSION_SQL.dropSql);
    for (const target of targets) {
      await session.unsafe(
        target.kind === "table"
          ? `drop table if exists "${target.name}" cascade`
          : target.kind === "column"
            ? `alter table "${target.table}" drop column if exists "${target.name}"`
            : `alter table "${target.table}" drop constraint if exists "${target.name}"`
      );
    }
    await session.unsafe("commit");
  } catch (error) {
    await session.unsafe("rollback").catch(() => undefined);
    throw error;
  }
  if (await relationExists(session, RECEIPT_TABLE))
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.catalogMismatch,
      "the receipt table survived the reverse"
    );
  for (const target of targets.filter((candidate) => candidate.kind !== "table")) {
    const residue = await values<
      [string]
    >(session`select 1 from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = ${target.table} and a.attname = ${target.name} and a.attnum > 0 limit 1`);
    if (residue.length > 0)
      fail(
        TASK551_ORCHESTRATOR_ERROR_CODES.catalogMismatch,
        `${target.table}.${target.name} survived the reverse`
      );
  }
}
/** B5b: 0081 must be the ONLY pending journal member when migrate() runs, and every applied row must hash its own journal file. */
async function assertSinglePendingMigration(
  session: ReservedSession,
  artifacts: Task551Artifacts
): Promise<void> {
  const entries = readJournalEntries(MIGRATIONS_FOLDER);
  if (!(await relationExists(session, JOURNAL_TABLE))) {
    if (artifacts.journalIndex !== 1)
      fail(
        TASK551_ORCHESTRATOR_ERROR_CODES.journalNotUnique,
        "the drizzle journal table is absent under a non-empty journal"
      );
    return;
  }
  const applied = (
    await values<[string]>(
      session`select hash from drizzle.__drizzle_migrations order by created_at`
    )
  ).map((row) => row[0]);
  if (applied.length !== artifacts.journalIndex - 1)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.journalNotUnique,
      `${applied.length} applied rows under a ${entries.length} entry journal`
    );
  for (const [index, hash] of applied.entries()) {
    const entry = entries[index];
    if (
      entry === undefined ||
      hash !== sha256Hex(readFileSync(`${MIGRATIONS_FOLDER}/${entry.tag}.sql`, "utf8"))
    )
      fail(
        TASK551_ORCHESTRATOR_ERROR_CODES.journalNotUnique,
        `applied row ${index} does not hash its own journal file`
      );
  }
}
async function assertCatalogSeams(session: ReservedSession, present: boolean): Promise<void> {
  // Both constraint probes are namespace-scoped like every other catalog lookup in this file: a same-named constraint in a foreign schema may otherwise false-pass the forward seam proof or false-fail the reverse catalog proof.
  const exclusion = await values<
    [string]
  >(session`select c.contype from pg_constraint c join pg_namespace n on n.oid = c.connamespace
      where c.conname = ${TASK551_EXCLUSION_CONSTRAINT_NAME} and c.contype = 'x' and n.nspname = 'public'`);
  if ((exclusion.length === 1) !== present)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.catalogMismatch,
      "the exclusion seam is not in its required state"
    );
  const extension = (
    await values<[string]>(session`select extname from pg_extension where extname = 'btree_gist'`)
  ).length;
  if (extension !== 1)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.catalogMismatch,
      present ? "btree_gist is absent" : "btree_gist must survive the reverse"
    );
  if (!present) return;
  const uniques = await values<
    [string]
  >(session`select c.conname from pg_constraint c join pg_namespace n on n.oid = c.connamespace
      where c.contype = 'u' and n.nspname = 'public' and c.conname = any(${[...TASK551_ASSERTED_UNIQUE_CONSTRAINTS]})`);
  if (uniques.length !== TASK551_ASSERTED_UNIQUE_CONSTRAINTS.length)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.catalogMismatch,
      "a composite unique constraint is absent"
    );
  const preserved = await indexCatalogRow(session, PRESERVED_MEMBER_SHAPE.name);
  if (
    preserved === null ||
    canonicalJson(canonicalIndexShape(preserved.definition)) !==
      canonicalJson(PRESERVED_MEMBER_SHAPE)
  )
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.catalogMismatch, "the preserved revision index drifted");
}
async function verifyFinalCatalog(session: ReservedSession, present: boolean): Promise<void> {
  for (const member of TASK551_ONLINE_INDEX_MEMBERS) {
    const row = await indexCatalogRow(session, member.name);
    if (!present) {
      if (row !== null)
        fail(
          TASK551_ORCHESTRATOR_ERROR_CODES.catalogMismatch,
          `${member.name} survived the reverse`
        );
      continue;
    }
    if (row === null || !row.valid || !row.ready)
      fail(
        TASK551_ORCHESTRATOR_ERROR_CODES.catalogMismatch,
        `${member.name} is not valid and ready`
      );
    assertMemberDefinition(row.definition, member.createSql, member.name);
  }
  await assertCatalogSeams(session, present);
}
async function catalogDigest(session: ReservedSession): Promise<string> {
  const rows = await values<
    [string]
  >(session`select pg_get_indexdef(c.oid) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('i', 'I') order by c.relname`);
  return sha256Hex(canonicalJson(rows.map((row) => row[0])));
}
function nowUtc(): string {
  return new Date().toISOString();
}
/** The recorded per-member state a resume continues from: an unrecorded member reads as pending, never as done. */
function memberState(
  receipt: Task551MigrationReceipt,
  name: string
): Task551OnlineIndexMemberReceipt["state"] {
  return receipt.forwardMembers.find((member) => member.name === name)?.state ?? "pending";
}
function reverseMemberState(
  receipt: Task551MigrationReceipt,
  name: string
): Task551OnlineIndexMemberReceipt["state"] {
  return receipt.reverseMembers.find((member) => member.name === name)?.state ?? "pending";
}
function reverseMemberSeed(): Task551OnlineIndexMemberReceipt[] {
  return TASK551_ONLINE_INDEX_MEMBERS.map((member) => ({
    name: member.name,
    group: member.group,
    order: member.order,
    definitionSha256: sha256Hex(member.createSql),
    state: "pending" as const,
    complete: false,
    completedAt: null,
  }));
}
function memberReceipt(
  receipt: Task551MigrationReceipt,
  direction: "forwardMembers" | "reverseMembers",
  name: string,
  state: Task551OnlineIndexMemberReceipt["state"]
): Task551OnlineIndexMemberReceipt[] {
  const done = state === "ready" || state === "dropped";
  return receipt[direction].map((member) =>
    member.name === name
      ? { ...member, state, complete: done, completedAt: done ? nowUtc() : null }
      : member
  );
}
async function advance(
  session: ReservedSession,
  receiptPath: string,
  current: Task551MigrationReceipt,
  expectedState: ReceiptState | null,
  patch: Partial<Omit<Task551MigrationReceipt, "stateSha256" | "generation">>,
  persistRow = !PRE_TRANSACTION_STATES.includes(current.state)
): Promise<Task551MigrationReceipt> {
  const successor = casReceipt(current, expectedState, patch);
  await persistAdvance(session, receiptPath, successor, persistRow);
  return successor;
}
function seedReceipt(
  artifacts: Task551Artifacts,
  mode: "external" | "offline-single",
  fleet: Task551MigrationReceipt["admission"]["fleet"]
): Task551MigrationReceipt {
  const body: Omit<Task551MigrationReceipt, "stateSha256"> = {
    version: 2,
    taskId: "TASK-551",
    operationId: randomUUID(),
    generation: 1,
    previousStateSha256: null,
    direction: "forward",
    state: "resolved",
    journal: { index: artifacts.journalIndex, tag: artifacts.tag },
    artifacts: {
      transactionalSql: {
        path: artifacts.transactionalPath,
        sha256: artifacts.transactionalSha256,
      },
      snapshot: { path: artifacts.snapshotPath, sha256: artifacts.snapshotSha256 },
      onlineSql: { path: artifacts.onlinePath, sha256: artifacts.onlineSha256 },
      manifestSha256: artifacts.manifestSha256,
      aggregateSha256: artifacts.aggregateSha256,
    },
    preflight: {
      digest: artifacts.aggregateSha256,
      classification: "small",
      lockTimeoutMs: 2_000,
      statementTimeoutMs: 30_000,
      transactionTimeoutMs: 120_000,
      recheckDigests: [artifacts.transactionalSha256, artifacts.onlineSha256],
    },
    admission: {
      mode,
      fleet,
      adapterSha256: null,
      drainNonce: randomBytes(32).toString("base64url"),
      prepareAckSha256: null,
      quiescentFrom: null,
      quiescentUntil: null,
      resumeNonce: null,
      resumeAuthorizationSha256: null,
      resumeAckSha256: null,
      resumeBinarySha256: null,
      revisionWriterCompatibilitySha256: null,
      newBinaryTrafficAccepted: false,
    },
    transaction: { apply: "pending", catalogSha256: null },
    groups: [
      {
        name: REVISION_INTEGRITY_GROUP,
        members: [...TASK551_REVISION_INTEGRITY_MEMBERS],
        complete: false,
        completedAt: null,
      },
      {
        name: READ_PERFORMANCE_GROUP,
        members: TASK551_ONLINE_INDEX_MEMBERS.filter(
          (member) => member.group === READ_PERFORMANCE_GROUP
        ).map((member) => member.name),
        complete: false,
        completedAt: null,
      },
    ] as unknown as Task551MigrationReceipt["groups"],
    forwardMembers: TASK551_ONLINE_INDEX_MEMBERS.map((member) => ({
      name: member.name,
      group: member.group,
      order: member.order,
      definitionSha256: sha256Hex(member.createSql),
      state: "pending" as const,
      complete: false,
      completedAt: null,
    })),
    reverseMembers: [],
    finalCatalogReady: false,
  };
  return { ...body, stateSha256: sha256Hex(canonicalJson(body)) };
}
// --- The two locked rollouts and the read-only status ------------------------
/** The phase-6 release evidence (:264-265): a resumed binary may only be authorized with both compatibility digests supplied and well-formed. */
export function requireReleaseDigest(env: Environment, name: string): string {
  const value = env[name];
  if (value === undefined || !HEX64.test(value))
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.adapterResumeFailed,
      `${name} is absent or not a lowercase sha-256 digest`
    );
  return value;
}
/** Contract :199-200, :293-295 — the fleet counts carry no autoscaling signal, so scale-to-zero is an exact environment declaration: absent or `false` is disabled, `true` enabled, anything else refuses. Enabled, external admission is mandatory and `offline-single` is forbidden. */
export function autoscalingEnabled(env: Environment): boolean {
  const value = env.TASK551_AUTOSCALING_ENABLED;
  if (value === undefined || value === "false") return false;
  if (value === "true") return true;
  fail(
    TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
    "TASK551_AUTOSCALING_ENABLED is neither absent, `false` nor `true`"
  );
}
/** The phase-7 write-cost evidence document (:286-288, :291-293): exactly these keys, at most 16 KiB. */
export interface Task551WriteCostEvidence {
  readonly source: "live-traffic" | "rehearsal";
  readonly writers: number;
  readonly invariantErrors: number;
  readonly deadlockErrors: number;
  readonly p95RegressionRatio: number;
}
const WRITE_COST_EVIDENCE_KEYS = "deadlockErrors,invariantErrors,p95RegressionRatio,source,writers";
/** Contract :286-293 — the write-cost gate is consumed before `forward_ready`: external mode needs 16 representative live-traffic writers with zero invariant/deadlock errors and at most a 20% p95 regression; `offline-single` accepts rehearsal evidence only. `TASK551_WRITE_COST_EVIDENCE` names the evidence artifact; absent, oversize, foreign-keyed or failing evidence refuses (`task551_preflight_failed`, :792). */
export function readWriteCostEvidence(
  env: Environment,
  mode: "external" | "offline-single"
): Task551WriteCostEvidence {
  const code = TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed;
  const path = env.TASK551_WRITE_COST_EVIDENCE;
  if (path === undefined || path.length === 0 || !existsSync(path))
    fail(code, "TASK551_WRITE_COST_EVIDENCE is absent, so the write-cost gate has no evidence");
  const text = readFileSync(path, "utf8");
  if (Buffer.byteLength(text, "utf8") > BUDGETS.adapterStdoutMaxBytes)
    fail(code, "the write-cost evidence exceeds its 16 KiB ceiling");
  let evidence: Task551WriteCostEvidence & Record<string, unknown>;
  try {
    evidence = JSON.parse(text) as Task551WriteCostEvidence & Record<string, unknown>;
  } catch {
    fail(code, "the write-cost evidence is not JSON");
  }
  if (Object.keys(evidence).sort().join(",") !== WRITE_COST_EVIDENCE_KEYS)
    fail(code, "the write-cost evidence carries a foreign key set");
  const requiredSource = mode === "external" ? ("live-traffic" as const) : ("rehearsal" as const);
  if (evidence.source !== requiredSource)
    fail(
      code,
      `${mode} accepts ${requiredSource} write-cost evidence only, not ${String(evidence.source)}`
    );
  if (evidence.writers !== 16 || !Number.isInteger(evidence.writers))
    fail(
      code,
      `the write-cost evidence covers ${String(evidence.writers)} representative writers, not 16`
    );
  if (evidence.invariantErrors !== 0 || evidence.deadlockErrors !== 0)
    fail(code, "the write-cost evidence records an invariant or deadlock error");
  const ratio = evidence.p95RegressionRatio;
  if (typeof ratio !== "number" || !Number.isFinite(ratio) || ratio < 0 || ratio > 1.2)
    fail(code, "the write-cost p95 regression is absent or above the 20% ceiling");
  return evidence;
}
/** The nonce-bound reverse authorization (:304-305): bound to this operation's id and drain nonce, so a replayed or foreign authorization cannot drive a reverse. */
export function reverseAuthorizationSha256(receipt: Task551MigrationReceipt): string {
  return sha256Hex(
    canonicalJson({
      operationId: receipt.operationId,
      nonce: receipt.admission.drainNonce,
      direction: "reverse",
    })
  );
}
async function rolloutForward(spec: CliSpec, env: Environment): Promise<void> {
  const artifacts = resolveTask551Artifacts(sha256Hex(readFileSync(MANIFEST_PATH, "utf8")));
  const fleet = parseDatabaseFleetConfig(env);
  const offline = spec.admissionMode === "offline-single";
  const adapterPath = env.TASK551_ADMISSION_ADAPTER;
  if (!offline && adapterPath === undefined)
    fail(TASK551_ORCHESTRATOR_ERROR_CODES.adapterInvalid, "TASK551_ADMISSION_ADAPTER is not set");
  if (fleet.totalProcessCount < 1)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.preflightFailed,
      "the fleet configuration admits no processes"
    );
  // :199-200, :293-295 — autoscaling/scale-to-zero makes external admission mandatory and offline-single impossible.
  if (offline && autoscalingEnabled(env))
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.offlineSingleDenied,
      "autoscaling/scale-to-zero is enabled, so external admission is mandatory"
    );
  let adapterSha = "";
  const mirror = readReceiptMirror(spec.receiptPath);
  let receipt = mirror ?? seedReceipt(artifacts, spec.admissionMode ?? "external", fleet);
  if (receipt.admission.mode !== (spec.admissionMode ?? "external"))
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict,
      "the receipt was seeded under a different admission mode"
    );
  if (mirror !== null) assertArtifactsReproduced(receipt, artifacts);
  if (
    !TERMINAL_FORWARD_STATES.includes(receipt.state) &&
    !FORWARD_RESUMABLE_STATES.includes(receipt.state)
  ) {
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict,
      `a ${receipt.state} receipt has no forward continuation; reverse owns it`
    );
  }
  const target = resolveSessionDatabaseTarget("task-551 rollout", env).url;
  const session = await openReservedSession(target, receipt.operationId);
  const step = async (
    expected: ReceiptState | null,
    patch: Parameters<typeof advance>[4],
    persistRow?: boolean
  ): Promise<void> => {
    receipt = await advance(session, spec.receiptPath, receipt, expected, patch, persistRow);
  };
  try {
    await takeAdvisoryLock(session, receipt.operationId);
    if (TERMINAL_FORWARD_STATES.includes(receipt.state)) {
      await verifyFinalCatalog(session, true);
      await assertQuietCompletion(session, offline);
      return;
    }
    // :183-186, :190-191 — before phase 2 a resumed command reproduces the canonical preflight digest itself: re-measured, re-gated, and compared while nothing is written yet.
    if (mirror !== null && PRE_DDL_REPRODUCE_STATES.includes(receipt.state)) {
      await assertPreflightReproduced(
        session,
        receipt,
        artifacts.touchedTables,
        consumePredecisionIntervalFiles().digest
      );
    }
    if (mirror !== null && DDL_RECHECK_STATES.includes(receipt.state)) {
      await setSessionBudgets(session, receipt.preflight);
      await step(null, {
        preflight: await appendHealthRecheck(session, receipt, artifacts.touchedTables),
      });
    }
    if (mirror !== null && receipt.state === "transaction_apply_pending") {
      // :246-249 — this mirror reruns phase 4 only when nothing committed, under the frozen budgets, and never through the post-DDL recheck.
      await assertNothingCommitted(session, artifacts, receipt.operationId);
      await setSessionBudgets(session, receipt.preflight);
    }
    if (receipt.state === "resolved") {
      if (offline) {
        if (env.TASK551_OFFLINE_SINGLE_ACK !== OFFLINE_SINGLE_ACK)
          fail(
            TASK551_ORCHESTRATOR_ERROR_CODES.offlineSingleDenied,
            `TASK551_OFFLINE_SINGLE_ACK must be ${OFFLINE_SINGLE_ACK}`
          );
        if (fleet.runtimeProcessCount !== 1 || fleet.workerProcessCount !== 0)
          fail(
            TASK551_ORCHESTRATOR_ERROR_CODES.offlineSingleDenied,
            "offline-single requires exactly one runtime and zero workers"
          );
        await assertSinglePendingMigration(session, artifacts);
        if (await relationExists(session, RECEIPT_TABLE))
          fail(
            TASK551_ORCHESTRATOR_ERROR_CODES.offlineSingleDenied,
            "the receipt table exists, so this is not a cold upgrade"
          );
      } else adapterSha = admissionAdapterSha256(adapterPath as string);
      // :183-186 — the L02 pre-decision interval is consumed before one candidate is frozen; only its application deltas may drive the read-index group.
      const predecision = consumePredecisionIntervalFiles();
      const evidence = await measurePreflightEvidence(session, artifacts.touchedTables);
      const classification = classifyMeasured(evidence.tables);
      const preflight: Task551MigrationReceipt["preflight"] = {
        digest: canonicalPreflightDigest({
          aggregateSha256: artifacts.aggregateSha256,
          classification,
          lockTimeoutMs: BUDGETS.lockTimeoutMs,
          statementTimeoutMs: BUDGETS[classification].statementTimeoutMs,
          transactionTimeoutMs: BUDGETS[classification].transactionTimeoutMs,
          predecisionSha256: predecision.digest,
          ...evidence,
        }),
        classification,
        lockTimeoutMs: BUDGETS.lockTimeoutMs,
        statementTimeoutMs: BUDGETS[classification].statementTimeoutMs,
        transactionTimeoutMs: BUDGETS[classification].transactionTimeoutMs,
        recheckDigests: receipt.preflight.recheckDigests,
      };
      await setSessionBudgets(session, preflight);
      await proveQuiescence(session, target, offline);
      await step("resolved", { state: "preflight_passed", preflight });
    }
    if (receipt.state === "preflight_passed") {
      if (receipt.admission.mode === "offline-single") {
        await step("preflight_passed", {
          state: "drain_requested",
          admission: { ...receipt.admission, fleet },
        });
      } else {
        // The adapter digest is the receipt's trust/audit bound: a resumed external preflight_passed mirror re-derives it and compares it against the frozen value, failing closed on any drift — it never silently overwrites `adapterSha256`, and a mirror that already records a prepare acknowledgement refuses instead of re-running prepare over it.
        const pinnedSha =
          adapterSha === "" ? admissionAdapterSha256(adapterPath as string) : adapterSha;
        assertAdapterDigestReproduced(receipt, pinnedSha);
        if (receipt.admission.prepareAckSha256 !== null)
          fail(
            TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict,
            "the mirror already records a prepare acknowledgement before its drain transition"
          );
        const ack = await runAdmissionAdapter(
          adapterPath as string,
          "prepare",
          receipt.operationId,
          receipt.admission.drainNonce,
          receipt.stateSha256,
          fleet
        );
        await step("preflight_passed", {
          state: "drain_requested",
          admission: {
            ...receipt.admission,
            fleet,
            adapterSha256: pinnedSha,
            prepareAckSha256: sha256Hex(canonicalJson(ack)),
          },
        });
      }
    }
    if (receipt.state === "drain_requested") {
      const quiescentFrom = await proveQuiescence(session, target, true);
      await step("drain_requested", {
        state: "drain_confirmed",
        admission: {
          ...receipt.admission,
          quiescentFrom: quiescentFrom ?? receipt.admission.quiescentFrom,
          quiescentUntil: nowUtc(),
        },
      });
    }
    if (receipt.state === "drain_confirmed") {
      await step("drain_confirmed", { state: "transaction_apply_pending" });
      await assertSinglePendingMigration(session, artifacts);
    }
    if (receipt.state === "transaction_apply_pending") {
      // Contract :243-246 — the successor is precomputed HERE and the guarded transaction inserts it already marked transaction_applied; the state guard is never relaxed.
      const successor = casReceipt(receipt, "transaction_apply_pending", {
        state: "transaction_applied",
        transaction: { apply: "applied", catalogSha256: null },
      });
      await applyBoundTransactionalMigration(successor, artifacts, session);
      const row = await readReceiptRow(session, receipt.operationId);
      if (row === null || row.stateSha256 !== successor.stateSha256)
        fail(
          TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict,
          "the guarded insert did not land this receipt"
        );
      receipt = successor;
      await persistAdvance(session, spec.receiptPath, successor, true);
      await step("transaction_applied", {
        transaction: { apply: "applied", catalogSha256: await catalogDigest(session) },
      });
    }
    if (receipt.state === "transaction_applied")
      await step("transaction_applied", { state: "revision_integrity_building" });
    if (receipt.state === "revision_integrity_building") {
      // :250-260, :255-256 — the drained revision-integrity group builds in manifest order, CAS-persisting `building` before and `ready` after each member; a resume continues from the receipt.
      for (const name of TASK551_REVISION_INTEGRITY_MEMBERS) {
        if (memberState(receipt, name) === "ready") continue;
        if (memberState(receipt, name) !== "building")
          await step(null, {
            forwardMembers: memberReceipt(receipt, "forwardMembers", name, "building"),
          });
        await buildMember(session, name);
        await step(null, {
          forwardMembers: memberReceipt(receipt, "forwardMembers", name, "ready"),
        });
      }
      await step(null, {
        state: "revision_integrity_ready",
        groups: [
          { ...receipt.groups[0], complete: true, completedAt: nowUtc() },
          receipt.groups[1],
        ],
      });
    }
    if (receipt.state === "revision_integrity_ready") {
      if (receipt.admission.mode === "offline-single") {
        // :281-282, :289-291 — offline-single never enters the resume machinery; it stays cold into the read-performance group.
        await step("revision_integrity_ready", { state: "read_performance_building" });
      } else {
        const expected = sha256Hex(
          canonicalJson({
            operationId: receipt.operationId,
            nonce: receipt.admission.drainNonce,
            group: REVISION_INTEGRITY_GROUP,
          })
        );
        if (env.TASK551_RESUME_AUTHORIZATION !== expected)
          fail(
            TASK551_ORCHESTRATOR_ERROR_CODES.adapterResumeFailed,
            "the operator resume authorization is absent or foreign"
          );
        // :264-265 — resume_authorized exists only once both release digests are pinned; admission stays stopped when the evidence is absent.
        await step("revision_integrity_ready", {
          state: "resume_authorized",
          admission: {
            ...receipt.admission,
            resumeNonce: randomBytes(32).toString("base64url"),
            resumeAuthorizationSha256: expected,
            resumeBinarySha256: requireReleaseDigest(env, "TASK551_RESUME_BINARY_SHA256"),
            revisionWriterCompatibilitySha256: requireReleaseDigest(
              env,
              "TASK551_REVISION_WRITER_COMPATIBILITY_SHA256"
            ),
          },
        });
      }
    }
    if (receipt.state === "resume_authorized") {
      // :268-280 — the cutover: the awaited adapter acknowledgement admits compatible-binary traffic and THIS transition alone records the irreversible flag.
      let admission = { ...receipt.admission, newBinaryTrafficAccepted: true };
      // :858-859 mirrored — the prepare-time pin is re-derived from the env-path bytes and compared before the resume adapter executes; a binary swapped between phase 2 and phase 6 never runs unverified.
      const resumeSha =
        adapterSha === "" ? admissionAdapterSha256(adapterPath as string) : adapterSha;
      assertAdapterDigestReproduced(receipt, resumeSha);
      const ack = await runAdmissionAdapter(
        adapterPath as string,
        "resume",
        receipt.operationId,
        receipt.admission.resumeNonce ?? "",
        receipt.stateSha256,
        receipt.admission.fleet,
        receipt.admission.resumeAuthorizationSha256 ?? ""
      );
      for (const replica of [...ack.runtimeReplicas, ...ack.workerReplicas]) {
        if (replica.binarySha256 !== receipt.admission.resumeBinarySha256)
          fail(
            TASK551_ORCHESTRATOR_ERROR_CODES.adapterResumeFailed,
            `${replica.id} does not run the authorized binary`
          );
      }
      admission = { ...admission, resumeAckSha256: sha256Hex(canonicalJson(ack)) };
      await step("resume_authorized", { state: "resume_completed", admission });
    }
    if (receipt.state === "resume_completed")
      await step("resume_completed", { state: "read_performance_building" });
    if (receipt.state === "read_performance_building") {
      // :255-256, :283-285 — the remaining ordered members build with a `building` CAS before and a `ready` CAS after each concurrent build, then the write-cost gate is consumed BEFORE forward_ready.
      for (const member of TASK551_ONLINE_INDEX_MEMBERS.filter(
        (candidate) => candidate.group === READ_PERFORMANCE_GROUP
      )) {
        if (memberState(receipt, member.name) === "ready") continue;
        if (memberState(receipt, member.name) !== "building")
          await step(null, {
            forwardMembers: memberReceipt(receipt, "forwardMembers", member.name, "building"),
          });
        await buildMember(session, member.name);
        await step(null, {
          forwardMembers: memberReceipt(receipt, "forwardMembers", member.name, "ready"),
        });
      }
      readWriteCostEvidence(env, receipt.admission.mode);
      await step(null, {
        state: "forward_ready",
        groups: [
          receipt.groups[0],
          { ...receipt.groups[1], complete: true, completedAt: nowUtc() },
        ],
      });
    }
    if (receipt.state === "forward_ready") {
      await verifyFinalCatalog(session, true);
      await step("forward_ready", {
        finalCatalogReady: true,
        transaction: { apply: "applied", catalogSha256: await catalogDigest(session) },
      });
      // :289-291 — only after forward_ready may offline-single persist its terminal, authorizing the operator's single post-exit binary start.
      if (offline) await step("forward_ready", { state: "operator_resume_authorized" });
    }
    await assertQuietCompletion(session, offline);
  } finally {
    await closeReserved(session, receipt.operationId);
  }
}
async function rolloutReverse(spec: CliSpec, env: Environment): Promise<void> {
  const artifacts = resolveTask551Artifacts(sha256Hex(readFileSync(MANIFEST_PATH, "utf8")));
  const mirror = readReceiptMirror(spec.receiptPath);
  if (mirror === null)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict,
      "reverse requires an existing mirror receipt"
    );
  let receipt = mirror;
  // :190-197, :303-314 — a reverse resume reproduces the resolved artifacts before one statement runs. Every reverse start state sits at or after the transactional commit, i.e. past the pre-DDL preflight reproduction window, so the reverse re-applies the frozen budgets verbatim and re-proves a fresh full drain instead of rewriting the captured preflight.
  assertArtifactsReproduced(receipt, artifacts);
  if (receipt.admission.newBinaryTrafficAccepted)
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.reverseForbidden,
      "compatible-binary traffic was already admitted"
    );
  if (env.TASK551_REVERSE_AUTHORIZATION !== reverseAuthorizationSha256(receipt))
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.reverseForbidden,
      "the nonce-bound reverse authorization is absent or foreign"
    );
  if (!REVERSE_CONTINUATION_STATES.includes(receipt.state))
    fail(
      TASK551_ORCHESTRATOR_ERROR_CODES.receiptConflict,
      `a ${receipt.state} receipt has no reverse continuation; forward owns it`
    );
  const target = resolveSessionDatabaseTarget("task-551 rollout", env).url;
  const session = await openReservedSession(target, receipt.operationId);
  const step = async (
    expected: ReceiptState | null,
    patch: Parameters<typeof advance>[4],
    persistRow?: boolean
  ): Promise<void> => {
    receipt = await advance(session, spec.receiptPath, receipt, expected, patch, persistRow);
  };
  try {
    await takeAdvisoryLock(session, receipt.operationId);
    if (!REVERSE_START_STATES.includes(receipt.state)) {
      // :877-880 mirrored for the reverse — a resume landing past the start branch re-applies the frozen budgets before its first statement.
      await setSessionBudgets(session, receipt.preflight);
    }
    if (REVERSE_START_STATES.includes(receipt.state)) {
      await setSessionBudgets(session, receipt.preflight);
      await step(null, {
        state: "reverse_drain_requested",
        direction: "reverse",
        reverseMembers: reverseMemberSeed(),
      });
    }
    if (receipt.state === "reverse_drain_requested") {
      await proveQuiescence(session, target, true);
      await step("reverse_drain_requested", { state: "reverse_drain_confirmed" });
    }
    if (
      receipt.state === "reverse_drain_confirmed" ||
      receipt.state === "reverse_indexes_building"
    ) {
      // :298-308, :311-314 — the ordered drop loop is owned by `reverse_indexes_building` and hoisted out of the entering transition, so a mirror frozen
      // mid-group-drop resumes exactly where it stopped with per-member ordered progress, instead of silently exiting as a no-op.
      if (receipt.state === "reverse_drain_confirmed")
        await step("reverse_drain_confirmed", { state: "reverse_indexes_building" });
      if (receipt.reverseMembers.length !== TASK551_ONLINE_INDEX_MEMBERS.length) {
        await step(null, {
          state: "reverse_indexes_building",
          reverseMembers: reverseMemberSeed(),
        });
      }
      for (const member of [...TASK551_ONLINE_INDEX_MEMBERS].reverse()) {
        if (reverseMemberState(receipt, member.name) === "dropped") continue;
        await dropMember(session, member.name);
        await step(null, {
          reverseMembers: memberReceipt(receipt, "reverseMembers", member.name, "dropped"),
        });
      }
      await step(null, {
        state: "reverse_transaction_pending",
        transaction: { apply: "reversed", catalogSha256: null },
      });
    }
    if (receipt.state === "reverse_transaction_pending") {
      // :307-308 — the transactional artifact itself (exclusion dropSql, columns, constraints, tables, receipt table) is reversed, then the journal row and both probes authorize reverse_complete; a resume after the commit finds nothing left to drop.
      if (await relationExists(session, RECEIPT_TABLE))
        await reverseTransactionalArtifact(session, artifacts);
      if (
        (
          await values<[string]>(
            session`select 1 from drizzle.__drizzle_migrations where hash = ${artifacts.transactionalSha256} limit 1`
          )
        ).length > 0
      )
        await dropJournalRow(session, artifacts.transactionalSha256);
      await verifyFinalCatalog(session, false);
      await assertSinglePendingMigration(session, artifacts);
      await step(
        "reverse_transaction_pending",
        { state: "reverse_complete", finalCatalogReady: false },
        false
      );
    }
  } finally {
    await closeReserved(session, receipt.operationId);
  }
}
async function writeStatus(spec: CliSpec, env: Environment): Promise<void> {
  const mirror = readReceiptMirror(spec.receiptPath);
  const target = resolveSessionDatabaseTarget("task-551 status", env).url;
  const session = await openReservedSession(target, mirror?.operationId ?? randomUUID());
  try {
    const tableExists = mirror === null ? false : await relationExists(session, RECEIPT_TABLE);
    process.stdout.write(
      `${canonicalJson({ command: spec.command, mirror, tableExists, row: tableExists ? await readReceiptRow(session, mirror?.operationId ?? "") : null })}\n`
    );
  } finally {
    await closeReserved(session, null);
  }
}
async function main(): Promise<void> {
  const spec = parseOrchestratorArgs(process.argv.slice(2));
  if (spec.command === "status") return writeStatus(spec, process.env);
  if (spec.command === "rollout-forward") return rolloutForward(spec, process.env);
  return rolloutReverse(spec, process.env);
}
if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
