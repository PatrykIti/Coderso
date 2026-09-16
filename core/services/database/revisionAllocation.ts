/**
 * Family-aware revision allocation contract (TASK-551-06-L02).
 *
 * The five family identifiers are a closed set: `page` and `detail_page` have
 * wired writers here, while `widget_template`, `entry`, and `post` are
 * retention/lock-only identifiers — `entry`/`post` adoption is TASK-551-09 and
 * `widget_template` is legacy-table retention-only (no live writer remains
 * after TASK-580; writer revival is a follow-up outside TASK-551). All three
 * participate in key derivation, digest scope, and conflict identity, and this
 * module creates no writer for their tables.
 *
 * Concurrency model: `withRevisionParentLock(identity, tx, run)` takes the
 * deterministic transaction-scoped advisory lock
 * `pg_advisory_xact_lock(stableFamilyKey(family), stableParentKey(parentId))`
 * so contenders for one parent queue in a stable, family-scoped order. The lock
 * is ordering, never correctness: `allocateRevision(input, tx)` still derives
 * `max(version) + 1` under the lock through the `(parent, version)` index and
 * relies on the database-owned unique constraint as the final integrity guard,
 * mapping a unique violation to `RevisionConflictError` (`revision_conflict`).
 *
 * PostgreSQL class-40 outcomes (`40001` serialization, `40P01` deadlock) abort
 * the whole transaction, so they are retried only around the caller's whole
 * unit of work via `retryRevisionAllocation` (three attempts, fixed bounded
 * backoff). Domain conflicts are never retried.
 *
 * Security posture: derived keys, digests, and error messages never embed a raw
 * parent id, SQL text, binds, or constraint names; family/parent travel only as
 * typed error fields and the module performs no logging. Importing this module
 * dials nothing: the shared client is imported solely to derive the `Tx`
 * type, and every statement runs on a caller-owned transaction.
 */

import { createHash } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { detailPageRevisions, pageRevisions } from "../../db/schema";

/** The five revision families. Closed set: adopters consume, never extend. */
export type RevisionFamily = "page" | "widget_template" | "detail_page" | "entry" | "post";

/** Parent identity for one family-scoped revision operation. */
export type RevisionFamilyIdentity = Readonly<{
  family: RevisionFamily;
  parentId: string;
}>;

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Machine-readable failure codes emitted by this module. */
export const REVISION_ALLOCATION_ERROR_CODES = {
  conflict: "revision_conflict",
  familyInvalid: "revision_family_invalid",
  familyWriterUnavailable: "revision_family_writer_unavailable",
  parentInvalid: "revision_parent_invalid",
  kindInvalid: "revision_kind_invalid",
  scopeInvalid: "revision_scope_invalid",
  insertMissing: "revision_insert_missing",
} as const;

const MAX_PARENT_ID_LENGTH = 128;
const MAX_KIND_LENGTH = 64;
const UNIQUE_VIOLATION_SQL_STATE = "23505";
const SQL_STATE_PATTERN = /^[0-9A-Z]{5}$/;
const MAX_SQLSTATE_CAUSE_DEPTH = 8;
const RETRYABLE_SQL_STATES: ReadonlySet<string> = new Set(["40001", "40P01"]);

/** At most three attempts: the initial try plus two class-40 retries. */
export const MAX_REVISION_ALLOCATION_ATTEMPTS = 3;
/** Fixed bounded backoff sequence (ms) before the second and third attempt. */
const RETRY_BACKOFF_MS: readonly [number, number] = [20, 60];

/**
 * One revision insert. `kind` stays a bounded free string because each family
 * owns its own closed kind union. `version` exists only for row-shape parity
 * with the planned insert (`{ ...input, version: next }`); allocation always
 * writes the parent-derived next version and never honors a caller value.
 */
export type RevisionInsert<T> = Readonly<{
  family: RevisionFamily;
  parentId: string;
  kind: string;
  data: T;
  createdBy?: string | null;
  version?: number;
}>;

/** One persisted revision row mapped back into the caller's family shape. */
export type Revision<T> = Readonly<{
  id: string;
  family: RevisionFamily;
  parentId: string;
  version: number;
  kind: string;
  data: T;
  createdAt: Date;
  createdBy: string | null;
}>;

/**
 * A lost allocation race: the database-owned `(parent, version)` uniqueness
 * guard rejected the insert. Terminal by contract — never retried. The message
 * is the bounded code alone; family/parent travel as typed fields, so no raw
 * parent id, SQL, or constraint name enters the message.
 */
export class RevisionConflictError extends Error {
  readonly code = "revision_conflict";
  readonly family: RevisionFamily;
  readonly parentId: string;

  constructor(identity: RevisionFamilyIdentity) {
    super(REVISION_ALLOCATION_ERROR_CODES.conflict);
    this.name = "RevisionConflictError";
    this.family = identity.family;
    this.parentId = identity.parentId;
  }
}

// ---------------------------------------------------------------------------
// Advisory-key derivation
// ---------------------------------------------------------------------------

/**
 * Code-owned family lock constants. PostgreSQL's two-argument
 * `pg_advisory_xact_lock(int, int)` form takes two int4 keys, so both key
 * components are confined to the signed 32-bit range (itself 63-bit-safe). The
 * family component is this never-renumber constant table: renumbering would
 * silently move every live parent lock. The parent component is the first four
 * bytes of the SHA-256 of the parent id, re-biased from unsigned into the
 * signed int4 range, so no raw parent id reaches a key, log, or error message.
 * Family scoping comes from the tuple itself: cross-family parent-key equality
 * can never share a lock, and contract tests pin collision-freedom across all
 * five constants. A rare SHA-256 collision between two distinct parents of one
 * family (32-bit birthday bound) only queues them on each other's lock —
 * ordering, never correctness, which stays with the unique constraint.
 */
const FAMILY_LOCK_KEYS: Readonly<Record<RevisionFamily, number>> = Object.freeze({
  page: 551_001,
  widget_template: 551_002,
  detail_page: 551_003,
  entry: 551_004,
  post: 551_005,
});

function requireKnownFamily(family: RevisionFamily): RevisionFamily {
  if (typeof family !== "string" || !(family in FAMILY_LOCK_KEYS)) {
    throw new Error(REVISION_ALLOCATION_ERROR_CODES.familyInvalid);
  }
  return family;
}

function requireParentId(parentId: string): string {
  if (
    typeof parentId !== "string" ||
    parentId.length === 0 ||
    parentId.length > MAX_PARENT_ID_LENGTH
  ) {
    throw new Error(REVISION_ALLOCATION_ERROR_CODES.parentInvalid);
  }
  return parentId;
}

function readIdentity(identity: RevisionFamilyIdentity): RevisionFamilyIdentity {
  if (identity === null || typeof identity !== "object") {
    throw new Error(REVISION_ALLOCATION_ERROR_CODES.familyInvalid);
  }
  return Object.freeze({
    family: requireKnownFamily(identity.family),
    parentId: requireParentId(identity.parentId),
  });
}

/** Stable int4 family component of the two-key advisory lock. */
export function stableFamilyKey(family: RevisionFamily): number {
  return FAMILY_LOCK_KEYS[requireKnownFamily(family)];
}

/** Stable int4 parent component: SHA-256-derived, never the raw parent id. */
export function stableParentKey(parentId: string): number {
  const digest = createHash("sha256").update(requireParentId(parentId), "utf8").digest();
  return digest.readUInt32BE(0) - 0x8000_0000;
}

/**
 * Serializes `run` behind the transaction-scoped parent lock. The lock is held
 * until the caller's transaction ends and exists separately from allocation so
 * TASK-551-09-L03 can serialize a latest-snapshot equality decision before
 * allocating. Argument order is contractual: `(identity, tx, run)`.
 */
export async function withRevisionParentLock<T>(
  identity: RevisionFamilyIdentity,
  tx: Tx,
  run: () => Promise<T>
): Promise<T> {
  const bounded = readIdentity(identity);
  await tx.execute(
    sql`select pg_advisory_xact_lock(${stableFamilyKey(bounded.family)}, ${stableParentKey(
      bounded.parentId
    )})`
  );
  return run();
}

/**
 * The only sanctioned cursor-scope digest: exactly
 * `revision:<family>:v1:<sha256(canonicalJson({parentId}))>` in lowercase hex.
 * The raw parent id is hashed, never embedded.
 */
export function revisionScopeDigest(family: RevisionFamily, parentId: string): string {
  const boundedFamily = requireKnownFamily(family);
  const boundedParentId = requireParentId(parentId);
  const digest = createHash("sha256")
    .update(canonicalJson({ parentId: boundedParentId }), "utf8")
    .digest("hex");
  return `revision:${boundedFamily}:v1:${digest}`;
}

/**
 * Minimal canonical JSON: object keys sorted by code unit, no whitespace, only
 * JSON round-trippable scalars. Sufficient for the closed scope payload shape;
 * anything else fails closed instead of guessing an unstable encoding.
 */
function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(REVISION_ALLOCATION_ERROR_CODES.scopeInvalid);
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0
    );
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  throw new Error(REVISION_ALLOCATION_ERROR_CODES.scopeInvalid);
}

// ---------------------------------------------------------------------------
// Per-family writers (this leaf wires page and detail_page only)
// ---------------------------------------------------------------------------

type PlannedRevisionInsert<T> = Readonly<{
  family: RevisionFamily;
  parentId: string;
  version: number;
  kind: string;
  data: T;
  createdBy: string | null;
}>;

type FamilyWriter = Readonly<{
  nextVersion: (tx: Tx, parentId: string) => Promise<number>;
  insert: <T>(tx: Tx, planned: PlannedRevisionInsert<T>) => Promise<Revision<T>>;
}>;

const FAMILY_WRITER_TABLE: Partial<Record<RevisionFamily, FamilyWriter>> = {
  page: {
    async nextVersion(tx, parentId) {
      const [row] = await tx
        .select({ version: pageRevisions.version })
        .from(pageRevisions)
        .where(eq(pageRevisions.pageId, parentId))
        .orderBy(desc(pageRevisions.version))
        .limit(1);
      return (row?.version ?? 0) + 1;
    },
    async insert<T>(tx: Tx, planned: PlannedRevisionInsert<T>) {
      const [row] = await tx
        .insert(pageRevisions)
        .values({
          pageId: planned.parentId,
          version: planned.version,
          kind: planned.kind,
          data: planned.data,
          createdBy: planned.createdBy,
        })
        .returning({
          id: pageRevisions.id,
          pageId: pageRevisions.pageId,
          version: pageRevisions.version,
          kind: pageRevisions.kind,
          data: pageRevisions.data,
          createdAt: pageRevisions.createdAt,
          createdBy: pageRevisions.createdBy,
        });
      if (!row) throw new Error(REVISION_ALLOCATION_ERROR_CODES.insertMissing);
      return {
        id: row.id,
        family: "page",
        parentId: row.pageId,
        version: row.version,
        kind: row.kind,
        data: row.data as T,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
      };
    },
  },
  detail_page: {
    async nextVersion(tx, parentId) {
      const [row] = await tx
        .select({ version: detailPageRevisions.version })
        .from(detailPageRevisions)
        .where(eq(detailPageRevisions.detailPageId, parentId))
        .orderBy(desc(detailPageRevisions.version))
        .limit(1);
      return (row?.version ?? 0) + 1;
    },
    async insert<T>(tx: Tx, planned: PlannedRevisionInsert<T>) {
      const [row] = await tx
        .insert(detailPageRevisions)
        .values({
          detailPageId: planned.parentId,
          version: planned.version,
          kind: planned.kind,
          document: planned.data,
          createdBy: planned.createdBy,
        })
        .returning({
          id: detailPageRevisions.id,
          detailPageId: detailPageRevisions.detailPageId,
          version: detailPageRevisions.version,
          kind: detailPageRevisions.kind,
          document: detailPageRevisions.document,
          createdAt: detailPageRevisions.createdAt,
          createdBy: detailPageRevisions.createdBy,
        });
      if (!row) throw new Error(REVISION_ALLOCATION_ERROR_CODES.insertMissing);
      return {
        id: row.id,
        family: "detail_page",
        parentId: row.detailPageId,
        version: row.version,
        kind: row.kind,
        data: row.document as T,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
      };
    },
  },
};

const FAMILY_WRITERS: Readonly<Partial<Record<RevisionFamily, FamilyWriter>>> =
  Object.freeze(FAMILY_WRITER_TABLE);

function requireFamilyWriter(family: RevisionFamily): FamilyWriter {
  const writer = FAMILY_WRITERS[requireKnownFamily(family)];
  if (!writer) throw new Error(REVISION_ALLOCATION_ERROR_CODES.familyWriterUnavailable);
  return writer;
}

function requireKind(kind: string): string {
  if (typeof kind !== "string" || kind.length === 0 || kind.length > MAX_KIND_LENGTH) {
    throw new Error(REVISION_ALLOCATION_ERROR_CODES.kindInvalid);
  }
  return kind;
}

// ---------------------------------------------------------------------------
// Allocation and bounded retry
// ---------------------------------------------------------------------------

/**
 * Allocates the next version for one parent inside the caller's transaction:
 * parent lock, indexed `version DESC LIMIT 1` projection, insert with
 * `max + 1`, and unique-violation mapping to `RevisionConflictError`. Argument
 * order is contractual: `(input, tx)`. The unique constraint is the final
 * integrity guard; a conflict is terminal, never retried.
 */
export async function allocateRevision<T>(input: RevisionInsert<T>, tx: Tx): Promise<Revision<T>> {
  const identity = readIdentity(input);
  const writer = requireFamilyWriter(input.family);
  const kind = requireKind(input.kind);
  const createdBy = input.createdBy ?? null;
  return withRevisionParentLock(identity, tx, async () => {
    const next = await writer.nextVersion(tx, identity.parentId);
    try {
      return await writer.insert(tx, {
        family: identity.family,
        parentId: identity.parentId,
        version: next,
        kind,
        data: input.data,
        createdBy,
      });
    } catch (error) {
      if (sqlStateOf(error) === UNIQUE_VIOLATION_SQL_STATE) {
        throw new RevisionConflictError(identity);
      }
      throw error;
    }
  });
}

/**
 * Walks a bounded driver cause chain (drizzle wraps postgres.js errors) to find
 * the five-character SQLSTATE. Only the state code is read; messages that could
 * carry SQL or bind text are never touched or surfaced.
 */
function sqlStateOf(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < MAX_SQLSTATE_CAUSE_DEPTH; depth += 1) {
    if (current === null || typeof current !== "object") return null;
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && SQL_STATE_PATTERN.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Retries ONLY PostgreSQL class-40 outcomes — `40001` serialization failure and
 * `40P01` deadlock — around the caller's WHOLE unit of work (typically the
 * `db.transaction` closure that invoked `allocateRevision`): both outcomes
 * abort the transaction, so an in-transaction retry is impossible and the
 * documented recovery is to retry the transaction. At most
 * `MAX_REVISION_ALLOCATION_ATTEMPTS` attempts with the fixed `RETRY_BACKOFF_MS`
 * sequence: bounded, deterministic, free of `Math.random`. A unique violation
 * (hence `RevisionConflictError`) and every other failure surface immediately —
 * domain conflicts are never retried.
 */
export async function retryRevisionAllocation<T>(attempt: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let index = 0; index < MAX_REVISION_ALLOCATION_ATTEMPTS; index += 1) {
    if (index > 0) await sleep(RETRY_BACKOFF_MS[index - 1]);
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      if (!RETRYABLE_SQL_STATES.has(sqlStateOf(error) ?? "")) throw error;
    }
  }
  throw lastError;
}
