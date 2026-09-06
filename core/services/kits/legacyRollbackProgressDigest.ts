/**
 * Bun-free legacy rollback combined-progress digest contract
 * (TASK-551-06-L01).
 *
 * Pure production module: no Bun APIs, no DB client or schema import, no
 * import-time environment access, and no runtime template/widget registry
 * import. Only `node:crypto` primitives are used.
 *
 * Every digest builder hashes exactly the UTF-8 bytes of its strict input
 * object's canonical JSON. The required literal `contract` member is the sole
 * domain/version frame: there is no implicit prefix, NUL separator, wrapper
 * object, insertion-order encoding, or caller-selected domain, and a missing or
 * wrong contract is rejected before hashing. Canonical JSON recursively sorts
 * object keys by Unicode code point, preserves array order, requires NFC
 * strings and finite JSON primitives, rejects unknown keys, accessors,
 * symbols, and non-plain objects, and UTF-8 encodes the preimage exactly once.
 * The returned lowercase SHA-256 hex string is the only valid value for the
 * `solution_kit_install_runs.rollback_proof_digest` column and its sibling
 * evidence/progress digest columns. Persisted digests are comparison data and
 * are never part of their own preimage.
 *
 * The install-item helper hashes one bounded item at a time, so aggregate
 * snapshot bytes are never retained in memory. Nested template snapshots and
 * rollback actions are validated against the shared byte caps below before any
 * hashing, and every preimage is additionally bounded by
 * `LEGACY_COMBINED_DIGEST_INPUT_MAX_BYTES`.
 */

import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Shared constants (TASK-489 imports these read-only; never redeclare them)
// ---------------------------------------------------------------------------

/** Hard combined-operation ceiling shared by proofs and position maps. */
export const LEGACY_COMBINED_OPERATION_LIMIT = 512;
/** Hard per-run legacy template operation ceiling. */
export const LEGACY_TEMPLATE_OPERATION_LIMIT = 100;
/** Serialized legacy template seeds byte ceiling. */
export const LEGACY_TEMPLATE_SEEDS_MAX_BYTES = 4_194_304;
/** Serialized single template snapshot byte ceiling. */
export const LEGACY_TEMPLATE_SNAPSHOT_MAX_BYTES = 524_288;
/** Serialized single template rollback action byte ceiling. */
export const LEGACY_TEMPLATE_ACTION_MAX_BYTES = 1_049_600;
/** Serialized template rollback action collection byte ceiling. */
export const LEGACY_TEMPLATE_ACTIONS_MAX_BYTES = 12_582_912;
/** Serialized starter lifecycle envelope byte ceiling. */
export const STARTER_LIFECYCLE_ENVELOPE_MAX_BYTES = 16_777_216;
/** Hard byte ceiling applied to every digest preimage in this module. */
export const LEGACY_COMBINED_DIGEST_INPUT_MAX_BYTES = 8_388_608;

// ---------------------------------------------------------------------------
// Typed failure
// ---------------------------------------------------------------------------

export type LegacyRollbackDigestErrorCode =
  | "legacy_rollback_digest_schema_invalid"
  | "legacy_rollback_digest_value_invalid"
  | "legacy_rollback_digest_limit_exceeded";

/** Typed digest failure carrying only a bounded code, never input text. */
export class LegacyRollbackProgressDigestError extends Error {
  readonly code: LegacyRollbackDigestErrorCode;

  constructor(code: LegacyRollbackDigestErrorCode) {
    super(code);
    this.name = "LegacyRollbackProgressDigestError";
    this.code = code;
  }
}

const SCHEMA_INVALID: LegacyRollbackDigestErrorCode = "legacy_rollback_digest_schema_invalid";
const VALUE_INVALID: LegacyRollbackDigestErrorCode = "legacy_rollback_digest_value_invalid";
const LIMIT_EXCEEDED: LegacyRollbackDigestErrorCode = "legacy_rollback_digest_limit_exceeded";

function fail(code: LegacyRollbackDigestErrorCode): never {
  throw new LegacyRollbackProgressDigestError(code);
}

// ---------------------------------------------------------------------------
// Strict input and persisted types
// ---------------------------------------------------------------------------

export type StrictJsonPrimitive = null | boolean | number | string;
export type StrictJsonValue = StrictJsonPrimitive | readonly StrictJsonValue[] | StrictJsonObject;
export type StrictJsonObject = Readonly<{ [key: string]: StrictJsonValue }>;

export type LegacyRollbackInstallItemDigestInputV1 = Readonly<{
  contract: "coderso.legacy-rollback-install-item@v1";
  id: string;
  runId: string;
  position: number;
  resourceType: "content_type" | "form" | "page" | "menu";
  resourceKey: string;
  operation: "create" | "update" | "noop" | "delete" | "restore";
  status: "planned" | "success" | "failed" | "skipped";
  beforeSnapshot: StrictJsonObject | null;
  afterSnapshot: StrictJsonObject | null;
  rollbackAction: StrictJsonObject | null;
}>;
export type LegacyRollbackInstallItemRecordV1 = Omit<
  LegacyRollbackInstallItemDigestInputV1,
  "contract"
>;

export type StrictTemplateSnapshot = Readonly<{
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: "draft" | "published";
  blocks: readonly StrictJsonObject[];
  settings: Readonly<{ layout: StrictJsonObject }>;
}>;
export type StrictTemplateDeleteRollbackAction = Readonly<{
  key: string;
  operation: "create";
  templateId: string;
  beforeSnapshot: null;
  afterSnapshot: StrictTemplateSnapshot;
}>;
export type StrictTemplateRestoreRollbackAction = Readonly<{
  key: string;
  operation: "update";
  templateId: string;
  beforeSnapshot: StrictTemplateSnapshot;
  afterSnapshot: StrictTemplateSnapshot;
}>;

export type LegacyTemplateStateDigestInputV1 = Readonly<{
  contract: "coderso.legacy-template-state@v1";
  state:
    Readonly<{ present: false }> | Readonly<{ present: true; snapshot: StrictTemplateSnapshot }>;
}>;

export type LegacyTemplateEvidenceIdentityV1 = Readonly<{
  contract: "coderso.legacy-template-evidence@v1";
  sourceRunId: string;
  sourcePosition: number;
  templateKey: string;
  planDigest: string;
}>;
export type LegacyTemplateSourceEvidenceDigestInputV1 =
  | (LegacyTemplateEvidenceIdentityV1 &
      Readonly<{
        templateId: string;
        operation: "create";
        beforeSnapshot: null;
        status: "success";
        afterSnapshot: StrictTemplateSnapshot;
        rollbackAction: StrictTemplateDeleteRollbackAction;
        safeErrorCode: null;
      }>)
  | (LegacyTemplateEvidenceIdentityV1 &
      Readonly<{
        templateId: string;
        operation: "update";
        beforeSnapshot: StrictTemplateSnapshot;
        status: "success";
        afterSnapshot: StrictTemplateSnapshot;
        rollbackAction: StrictTemplateRestoreRollbackAction;
        safeErrorCode: null;
      }>)
  | (LegacyTemplateEvidenceIdentityV1 &
      Readonly<{
        templateId: string;
        operation: "noop";
        beforeSnapshot: StrictTemplateSnapshot;
        status: "success";
        afterSnapshot: StrictTemplateSnapshot;
        rollbackAction: null;
        safeErrorCode: null;
      }>)
  | (LegacyTemplateEvidenceIdentityV1 &
      Readonly<{
        templateId: string | null;
        operation: "create" | "update" | "noop";
        beforeSnapshot: StrictTemplateSnapshot | null;
        status: "failed";
        afterSnapshot: null;
        rollbackAction: null;
        safeErrorCode: string;
      }>)
  | (LegacyTemplateEvidenceIdentityV1 &
      Readonly<{
        templateId: string | null;
        operation: "create" | "update" | "noop";
        beforeSnapshot: StrictTemplateSnapshot | null;
        status: "skipped";
        afterSnapshot: null;
        rollbackAction: null;
        safeErrorCode: null;
      }>);
export type WithoutContract<T> = T extends unknown ? Omit<T, "contract"> : never;
export type WithEvidenceDigest<T> = T extends unknown
  ? T & Readonly<{ evidenceDigest: string }>
  : never;
export type LegacyTemplateSourceEvidenceRecordV1 = WithEvidenceDigest<
  WithoutContract<LegacyTemplateSourceEvidenceDigestInputV1>
>;

export type LegacyTemplateRollbackProgressBaseV1 = Readonly<{
  contract: "coderso.legacy-template-rollback-progress@v1";
  rollbackRunId: string;
  sourceRunId: string;
  sourceEvidenceId: string;
  sourcePosition: number;
  rollbackPosition: number;
  sourceStatus: "success";
  sourceEvidenceDigest: string;
  sourceAfterDigest: string;
}>;
export type LegacyTemplateRollbackProgressDigestInputV1 =
  | (LegacyTemplateRollbackProgressBaseV1 &
      Readonly<{
        state: "failed_no_mutation";
        rollbackTargetDigest: null;
        mutationInvalidationEventKey: null;
        compensationInvalidationEventKey: null;
      }>)
  | (LegacyTemplateRollbackProgressBaseV1 &
      Readonly<{
        state: "rollback_committed";
        rollbackTargetDigest: string;
        mutationInvalidationEventKey: string;
        compensationInvalidationEventKey: null;
      }>)
  | (LegacyTemplateRollbackProgressBaseV1 &
      Readonly<{
        state: "source_restored";
        rollbackTargetDigest: string;
        mutationInvalidationEventKey: string;
        compensationInvalidationEventKey: string;
      }>);
export type LegacyTemplateRollbackProgressRecordV1 = LegacyTemplateRollbackProgressDigestInputV1 &
  Readonly<{ progressDigest: string }>;

export type LegacyRollbackCombinedCoreMemberV1 = Readonly<{
  kind: "core";
  sourcePosition: number;
  rollbackPosition: number;
  sourceItemId: string;
  sourceItemDigest: string;
  rollbackItemId: string;
  rollbackItemDigest: string;
}>;
export type LegacyRollbackCombinedTemplateMemberV1 = Readonly<{
  kind: "template";
  sourcePosition: number;
  rollbackPosition: number;
  sourceEvidenceId: string;
  sourceEvidenceDigest: string;
  progressDigest: string;
}>;
export type LegacyRollbackCombinedProgressMemberV1 =
  LegacyRollbackCombinedCoreMemberV1 | LegacyRollbackCombinedTemplateMemberV1;
export type LegacyRollbackCombinedProgressDigestInputV1 = Readonly<{
  contract: "coderso.legacy-rollback-combined-progress@v1";
  sourceRunId: string;
  rollbackRunId: string;
  members: readonly LegacyRollbackCombinedProgressMemberV1[];
}>;
export type LegacyRollbackCombinedProgressRecordV1 = Omit<
  LegacyRollbackCombinedProgressDigestInputV1,
  "contract"
> &
  Readonly<{ rollbackProofDigest: string }>;

/** One deeply frozen core local-to-global position entry. */
export type LegacyRollbackCombinedCorePositionEntryV1 = Readonly<{
  kind: "core";
  localPosition: number;
  sourcePosition: number;
  rollbackPosition: number;
}>;
/** One deeply frozen template local-to-global position entry. */
export type LegacyRollbackCombinedTemplatePositionEntryV1 = Readonly<{
  kind: "template";
  localPosition: number;
  sourcePosition: number;
  rollbackPosition: number;
}>;
/** Deeply frozen core/template position map over one combined plan. */
export type LegacyRollbackCombinedPositionMapV1 = Readonly<{
  coreCount: number;
  templateCount: number;
  total: number;
  core: readonly LegacyRollbackCombinedCorePositionEntryV1[];
  template: readonly LegacyRollbackCombinedTemplatePositionEntryV1[];
}>;

// ---------------------------------------------------------------------------
// Internal grammar helpers
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HEX64_PATTERN = /^[0-9a-f]{64}$/;
const SAFE_ERROR_CODE_PATTERN = /^[ -~]{1,96}$/;

/** Identity-string byte bound shared by keys and invalidation event keys. */
const MAX_KEY_BYTES = 128;
/** Snapshot display-string byte bound for names and categories. */
const MAX_TEMPLATE_TEXT_BYTES = 256;

const CONTRACT_INSTALL_ITEM = "coderso.legacy-rollback-install-item@v1";
const CONTRACT_TEMPLATE_STATE = "coderso.legacy-template-state@v1";
const CONTRACT_TEMPLATE_EVIDENCE = "coderso.legacy-template-evidence@v1";
const CONTRACT_TEMPLATE_PROGRESS = "coderso.legacy-template-rollback-progress@v1";
const CONTRACT_COMBINED_PROGRESS = "coderso.legacy-rollback-combined-progress@v1";

const INSTALL_ITEM_KEYS = Object.freeze([
  "contract",
  "id",
  "runId",
  "position",
  "resourceType",
  "resourceKey",
  "operation",
  "status",
  "beforeSnapshot",
  "afterSnapshot",
  "rollbackAction",
]);
const SNAPSHOT_KEYS = Object.freeze([
  "id",
  "name",
  "description",
  "category",
  "status",
  "blocks",
  "settings",
]);
const ACTION_KEYS = Object.freeze([
  "key",
  "operation",
  "templateId",
  "beforeSnapshot",
  "afterSnapshot",
]);
const EVIDENCE_KEYS = Object.freeze([
  "contract",
  "sourceRunId",
  "sourcePosition",
  "templateKey",
  "planDigest",
  "templateId",
  "operation",
  "beforeSnapshot",
  "status",
  "afterSnapshot",
  "rollbackAction",
  "safeErrorCode",
]);
const PROGRESS_KEYS = Object.freeze([
  "contract",
  "rollbackRunId",
  "sourceRunId",
  "sourceEvidenceId",
  "sourcePosition",
  "rollbackPosition",
  "sourceStatus",
  "state",
  "sourceEvidenceDigest",
  "sourceAfterDigest",
  "rollbackTargetDigest",
  "mutationInvalidationEventKey",
  "compensationInvalidationEventKey",
]);
const COMBINED_KEYS = Object.freeze(["contract", "sourceRunId", "rollbackRunId", "members"]);
const CORE_MEMBER_KEYS = Object.freeze([
  "kind",
  "sourcePosition",
  "rollbackPosition",
  "sourceItemId",
  "sourceItemDigest",
  "rollbackItemId",
  "rollbackItemDigest",
]);
const TEMPLATE_MEMBER_KEYS = Object.freeze([
  "kind",
  "sourcePosition",
  "rollbackPosition",
  "sourceEvidenceId",
  "sourceEvidenceDigest",
  "progressDigest",
]);

function requireExactKeys(value: unknown, keys: readonly string[]): Record<string, unknown> {
  const record = requirePlainJsonObject(value);
  const expected = [...keys].sort(compareByCodePoint);
  const actual = Object.keys(record).sort(compareByCodePoint);
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(SCHEMA_INVALID);
  }
  return record;
}

function requirePlainJsonObject(value: unknown): StrictJsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(SCHEMA_INVALID);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(SCHEMA_INVALID);
  const record = value as Record<string, unknown>;
  if (Object.getOwnPropertySymbols(value).length > 0) fail(SCHEMA_INVALID);
  if (Object.getOwnPropertyNames(value).length !== Object.keys(record).length) fail(SCHEMA_INVALID);
  for (const key of Object.keys(record)) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (!descriptor || descriptor.get !== undefined || descriptor.set !== undefined) {
      fail(SCHEMA_INVALID);
    }
  }
  return record as StrictJsonObject;
}

/** Rejects lone surrogates (which cannot round-trip UTF-8) and non-NFC text. */
function requireNfcStable(value: string): void {
  for (const char of value) {
    if (char.length === 1) {
      const unit = char.charCodeAt(0);
      if (unit !== undefined && unit >= 0xd800 && unit <= 0xdfff) fail(SCHEMA_INVALID);
    }
  }
  if (value.normalize("NFC") !== value) fail(SCHEMA_INVALID);
}

/** Unicode code point comparison; UTF-16 unit order would sort BMP-first. */
function compareByCodePoint(left: string, right: string): number {
  const leftChars = Array.from(left);
  const rightChars = Array.from(right);
  const shared = Math.min(leftChars.length, rightChars.length);
  for (let index = 0; index < shared; index += 1) {
    const leftCode = leftChars[index]?.codePointAt(0);
    const rightCode = rightChars[index]?.codePointAt(0);
    if (leftCode !== undefined && rightCode !== undefined && leftCode !== rightCode) {
      return leftCode < rightCode ? -1 : 1;
    }
  }
  return leftChars.length - rightChars.length;
}

function requireCanonicalUuid(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) fail(SCHEMA_INVALID);
  return value;
}

function requireHex64Digest(value: unknown): string {
  if (typeof value !== "string" || !HEX64_PATTERN.test(value)) fail(SCHEMA_INVALID);
  return value;
}

function requirePosition(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value >= LEGACY_COMBINED_OPERATION_LIMIT
  ) {
    fail(SCHEMA_INVALID);
  }
  return value;
}

function requireOperationCount(value: unknown, limit: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) fail(SCHEMA_INVALID);
  if (value > limit) fail(LIMIT_EXCEEDED);
  return value;
}

function requireEnum<T extends string>(value: unknown, allowed: readonly T[]): T {
  if (typeof value !== "string") fail(SCHEMA_INVALID);
  const match = allowed.find((candidate) => candidate === value);
  if (match === undefined) fail(SCHEMA_INVALID);
  return match;
}

/** Non-empty, NFC-stable, control-character-free bounded identity text. */
function requireIdentityText(value: unknown, maxBytes: number): string {
  if (typeof value !== "string") fail(SCHEMA_INVALID);
  requireNfcStable(value);
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit === 0 || unit < 0x20 || (unit >= 0x7f && unit <= 0x9f)) fail(VALUE_INVALID);
  }
  const bytes = encoder.encode(value).length;
  if (bytes < 1 || bytes > maxBytes) fail(VALUE_INVALID);
  return value;
}

function requireSafeErrorCode(value: unknown): string {
  if (typeof value !== "string" || !SAFE_ERROR_CODE_PATTERN.test(value)) fail(VALUE_INVALID);
  return value;
}

/**
 * Canonical JSON of one strict value: recursive code-point key ordering,
 * preserved array order, NFC strings, finite numbers, and no unknown shapes.
 */
function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    let out = "[";
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) out += ",";
      out += canonicalJson(value[index]);
    }
    return `${out}]`;
  }
  if (typeof value === "string") {
    requireNfcStable(value);
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(SCHEMA_INVALID);
    return JSON.stringify(value);
  }
  if (typeof value === "object") {
    const record = requirePlainJsonObject(value);
    const keys = Object.keys(record).sort(compareByCodePoint);
    let out = "{";
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index] as string;
      requireNfcStable(key);
      if (index > 0) out += ",";
      out += `${JSON.stringify(key)}:${canonicalJson(record[key])}`;
    }
    return `${out}}`;
  }
  return fail(SCHEMA_INVALID);
}

function canonicalJsonBytes(value: unknown): Uint8Array {
  return encoder.encode(canonicalJson(value));
}

function canonicalJsonEquals(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function requireBoundedCanonicalBytes(value: unknown, maxBytes: number): void {
  if (canonicalJsonBytes(value).length > maxBytes) fail(LIMIT_EXCEEDED);
}

/** Hashes one bounded canonical preimage; the ceiling is checked before hashing. */
function digestPreimage(value: unknown): string {
  const bytes = canonicalJsonBytes(value);
  if (bytes.length > LEGACY_COMBINED_DIGEST_INPUT_MAX_BYTES) fail(LIMIT_EXCEEDED);
  return createHash("sha256").update(bytes).digest("hex");
}

// ---------------------------------------------------------------------------
// Strict template snapshot and rollback action parsing
// ---------------------------------------------------------------------------

function requireStrictTemplateSnapshot(value: unknown): StrictTemplateSnapshot {
  const record = requireExactKeys(value, SNAPSHOT_KEYS);
  requireCanonicalUuid(record.id);
  requireIdentityText(record.name, MAX_TEMPLATE_TEXT_BYTES);
  if (record.description !== null) {
    requireIdentityText(record.description, LEGACY_TEMPLATE_SNAPSHOT_MAX_BYTES);
  }
  requireIdentityText(record.category, MAX_TEMPLATE_TEXT_BYTES);
  requireEnum(record.status, ["draft", "published"]);
  if (!Array.isArray(record.blocks)) fail(SCHEMA_INVALID);
  for (const block of record.blocks) requirePlainJsonObject(block);
  const settings = requireExactKeys(record.settings, ["layout"]);
  requirePlainJsonObject(settings.layout);
  const snapshot = value as StrictTemplateSnapshot;
  requireBoundedCanonicalBytes(snapshot, LEGACY_TEMPLATE_SNAPSHOT_MAX_BYTES);
  return snapshot;
}

function requireDeleteRollbackAction(
  value: unknown,
  expectedKey: string,
  expectedTemplateId: string,
  expectedAfter: StrictTemplateSnapshot
): StrictTemplateDeleteRollbackAction {
  const record = requireExactKeys(value, ACTION_KEYS);
  requireEnum(record.operation, ["create"]);
  if (record.beforeSnapshot !== null) fail(SCHEMA_INVALID);
  requireActionParity(record, expectedKey, expectedTemplateId);
  const afterSnapshot = requireStrictTemplateSnapshot(record.afterSnapshot);
  if (!canonicalJsonEquals(afterSnapshot, expectedAfter)) fail(VALUE_INVALID);
  requireBoundedCanonicalBytes(value, LEGACY_TEMPLATE_ACTION_MAX_BYTES);
  return value as StrictTemplateDeleteRollbackAction;
}

function requireRestoreRollbackAction(
  value: unknown,
  expectedKey: string,
  expectedTemplateId: string,
  expectedBefore: StrictTemplateSnapshot,
  expectedAfter: StrictTemplateSnapshot
): StrictTemplateRestoreRollbackAction {
  const record = requireExactKeys(value, ACTION_KEYS);
  requireEnum(record.operation, ["update"]);
  requireStrictTemplateSnapshot(record.beforeSnapshot);
  requireActionParity(record, expectedKey, expectedTemplateId);
  const afterSnapshot = requireStrictTemplateSnapshot(record.afterSnapshot);
  if (!canonicalJsonEquals(record.beforeSnapshot, expectedBefore)) fail(VALUE_INVALID);
  if (!canonicalJsonEquals(afterSnapshot, expectedAfter)) fail(VALUE_INVALID);
  requireBoundedCanonicalBytes(value, LEGACY_TEMPLATE_ACTION_MAX_BYTES);
  return value as StrictTemplateRestoreRollbackAction;
}

/** Evidence-row key/template identity parity is mandatory, never inferred. */
function requireActionParity(
  record: Record<string, unknown>,
  expectedKey: string,
  expectedTemplateId: string
): void {
  if (requireIdentityText(record.key, MAX_KEY_BYTES) !== expectedKey) fail(VALUE_INVALID);
  if (requireCanonicalUuid(record.templateId) !== expectedTemplateId) fail(VALUE_INVALID);
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * Hashes one bounded install item. The repository reconstructs the fixed
 * contract literal from an explicit-column row projection; timestamps and the
 * raw `error` text are excluded because they are not members of the closed
 * input frame.
 */
export function buildLegacyRollbackInstallItemDigest(
  input: LegacyRollbackInstallItemDigestInputV1
): string {
  const record = requireExactKeys(input, INSTALL_ITEM_KEYS);
  if (record.contract !== CONTRACT_INSTALL_ITEM) fail(SCHEMA_INVALID);
  requireCanonicalUuid(record.id);
  requireCanonicalUuid(record.runId);
  requirePosition(record.position);
  requireEnum(record.resourceType, ["content_type", "form", "page", "menu"]);
  requireIdentityText(record.resourceKey, MAX_KEY_BYTES);
  requireEnum(record.operation, ["create", "update", "noop", "delete", "restore"]);
  requireEnum(record.status, ["planned", "success", "failed", "skipped"]);
  for (const key of ["beforeSnapshot", "afterSnapshot"] as const) {
    if (record[key] === null) continue;
    requirePlainJsonObject(record[key]);
    requireBoundedCanonicalBytes(record[key], LEGACY_TEMPLATE_SNAPSHOT_MAX_BYTES);
  }
  if (record.rollbackAction !== null) {
    requirePlainJsonObject(record.rollbackAction);
    requireBoundedCanonicalBytes(record.rollbackAction, LEGACY_TEMPLATE_ACTION_MAX_BYTES);
  }
  return digestPreimage(input);
}

/**
 * Hashes one tagged template state. The tagged outer object is always part of
 * the preimage; an untagged state object is invalid. The absent state is the
 * only target a noop/failed/skipped source may ever restore to.
 */
export function buildLegacyTemplateStateDigest(input: LegacyTemplateStateDigestInputV1): string {
  const record = requireExactKeys(input, ["contract", "state"]);
  if (record.contract !== CONTRACT_TEMPLATE_STATE) fail(SCHEMA_INVALID);
  const state = requirePlainJsonObject(record.state);
  if (state.present === true) {
    requireExactKeys(state, ["present", "snapshot"]);
    requireStrictTemplateSnapshot(state.snapshot);
  } else if (state.present === false) {
    requireExactKeys(state, ["present"]);
  } else {
    fail(SCHEMA_INVALID);
  }
  return digestPreimage(input);
}

/**
 * Hashes one strict source-evidence row projection. The create/update/noop and
 * success/failed/skipped matrix is exactly the SQL-enforceable matrix of the
 * owning table; digest columns are never part of the preimage.
 */
export function buildLegacyTemplateSourceEvidenceDigest(
  input: LegacyTemplateSourceEvidenceDigestInputV1
): string {
  const record = requireExactKeys(input, EVIDENCE_KEYS);
  if (record.contract !== CONTRACT_TEMPLATE_EVIDENCE) fail(SCHEMA_INVALID);
  requireCanonicalUuid(record.sourceRunId);
  requirePosition(record.sourcePosition);
  const templateKey = requireIdentityText(record.templateKey, MAX_KEY_BYTES);
  requireHex64Digest(record.planDigest);
  const operation = requireEnum(record.operation, ["create", "update", "noop"]);
  const status = requireEnum(record.status, ["success", "failed", "skipped"]);
  const templateId = record.templateId === null ? null : requireCanonicalUuid(record.templateId);
  if (status === "success") {
    // Every successful evidence branch carries a canonical non-null templateId.
    if (templateId === null) fail(VALUE_INVALID);
    if (record.safeErrorCode !== null) fail(SCHEMA_INVALID);
    if (operation === "create") {
      if (record.beforeSnapshot !== null) fail(SCHEMA_INVALID);
      const afterSnapshot = requireStrictTemplateSnapshot(record.afterSnapshot);
      requireDeleteRollbackAction(record.rollbackAction, templateKey, templateId, afterSnapshot);
    } else if (operation === "update") {
      const beforeSnapshot = requireStrictTemplateSnapshot(record.beforeSnapshot);
      const afterSnapshot = requireStrictTemplateSnapshot(record.afterSnapshot);
      requireRestoreRollbackAction(
        record.rollbackAction,
        templateKey,
        templateId,
        beforeSnapshot,
        afterSnapshot
      );
    } else {
      // Static discrimination owns presence; the parser owns value equality.
      const beforeSnapshot = requireStrictTemplateSnapshot(record.beforeSnapshot);
      const afterSnapshot = requireStrictTemplateSnapshot(record.afterSnapshot);
      if (!canonicalJsonEquals(beforeSnapshot, afterSnapshot)) fail(VALUE_INVALID);
      if (record.rollbackAction !== null) fail(SCHEMA_INVALID);
    }
  } else {
    if (record.afterSnapshot !== null) fail(SCHEMA_INVALID);
    if (record.rollbackAction !== null) fail(SCHEMA_INVALID);
    if (status === "failed") {
      requireSafeErrorCode(record.safeErrorCode);
    } else if (record.safeErrorCode !== null) fail(SCHEMA_INVALID);
    if (record.beforeSnapshot !== null) requireStrictTemplateSnapshot(record.beforeSnapshot);
  }
  return digestPreimage(input);
}

/**
 * Hashes one strict rollback-progress row projection. The state/event matrix
 * is exactly the owning table's check: absent mutation for
 * `failed_no_mutation`, mutation-only for `rollback_committed`, and both
 * invalidation receipts for `source_restored`.
 */
export function buildLegacyTemplateRollbackProgressDigest(
  input: LegacyTemplateRollbackProgressDigestInputV1
): string {
  const record = requireExactKeys(input, PROGRESS_KEYS);
  if (record.contract !== CONTRACT_TEMPLATE_PROGRESS) fail(SCHEMA_INVALID);
  requireCanonicalUuid(record.rollbackRunId);
  requireCanonicalUuid(record.sourceRunId);
  requireCanonicalUuid(record.sourceEvidenceId);
  requirePosition(record.sourcePosition);
  requirePosition(record.rollbackPosition);
  if (record.sourceStatus !== "success") fail(SCHEMA_INVALID);
  requireHex64Digest(record.sourceEvidenceDigest);
  requireHex64Digest(record.sourceAfterDigest);
  const state = requireEnum(record.state, [
    "failed_no_mutation",
    "rollback_committed",
    "source_restored",
  ]);
  if (state === "failed_no_mutation") {
    if (record.rollbackTargetDigest !== null) fail(SCHEMA_INVALID);
    if (record.mutationInvalidationEventKey !== null) fail(SCHEMA_INVALID);
    if (record.compensationInvalidationEventKey !== null) fail(SCHEMA_INVALID);
  } else {
    requireHex64Digest(record.rollbackTargetDigest);
    requireIdentityText(record.mutationInvalidationEventKey, MAX_KEY_BYTES);
    if (state === "rollback_committed") {
      if (record.compensationInvalidationEventKey !== null) fail(SCHEMA_INVALID);
    } else {
      requireIdentityText(record.compensationInvalidationEventKey, MAX_KEY_BYTES);
    }
  }
  return digestPreimage(input);
}

/**
 * Builds the deeply frozen core/template position map for one combined plan.
 * Core local position `c` maps to `sourcePosition=c` and
 * `rollbackPosition=templateCount+(coreCount-1-c)`; template local position
 * `t` maps to `sourcePosition=coreCount+t` and
 * `rollbackPosition=templateCount-1-t`. Apply order is core then template and
 * rollback order is exact reverse, so both global position sets are contiguous
 * `0..total-1`. No consumer may infer a second offset formula.
 */
export function buildLegacyCombinedPositionMap(
  input: Readonly<{
    coreCount: number;
    templateCount: number;
  }>
): LegacyRollbackCombinedPositionMapV1 {
  const record = requireExactKeys(input, ["coreCount", "templateCount"]);
  const coreCount = requireOperationCount(record.coreCount, LEGACY_COMBINED_OPERATION_LIMIT);
  const templateCount = requireOperationCount(
    record.templateCount,
    LEGACY_TEMPLATE_OPERATION_LIMIT
  );
  if (coreCount + templateCount > LEGACY_COMBINED_OPERATION_LIMIT) fail(LIMIT_EXCEEDED);
  const core = Object.freeze(
    Array.from({ length: coreCount }, (_unused, localPosition) =>
      Object.freeze({
        kind: "core" as const,
        localPosition,
        sourcePosition: localPosition,
        rollbackPosition: templateCount + (coreCount - 1 - localPosition),
      })
    )
  );
  const template = Object.freeze(
    Array.from({ length: templateCount }, (_unused, localPosition) =>
      Object.freeze({
        kind: "template" as const,
        localPosition,
        sourcePosition: coreCount + localPosition,
        rollbackPosition: templateCount - 1 - localPosition,
      })
    )
  );
  return Object.freeze({
    coreCount,
    templateCount,
    total: coreCount + templateCount,
    core,
    template,
  });
}

/**
 * Hashes one terminal combined-progress input. Members are in exact
 * `sourcePosition ASC` order, both global position sets are exactly contiguous
 * `0..members.length-1`, source identities are unique inside each kind (no two
 * core members may name one `sourceItemId` and no two template members may name
 * one `sourceEvidenceId`, because those ids live in disjoint tables), and every
 * core member names a non-null terminal rollback receipt: a nullable receipt is
 * never a valid nonterminal shorthand and is rejected before hashing. A graph
 * that violates any of these invariants is contradictory and is refused, never
 * hashed into a rollback-proof-valid digest.
 */
export function buildLegacyRollbackCombinedProgressDigest(
  input: LegacyRollbackCombinedProgressDigestInputV1
): string {
  const record = requireExactKeys(input, COMBINED_KEYS);
  if (record.contract !== CONTRACT_COMBINED_PROGRESS) fail(SCHEMA_INVALID);
  requireCanonicalUuid(record.sourceRunId);
  requireCanonicalUuid(record.rollbackRunId);
  if (!Array.isArray(record.members)) fail(SCHEMA_INVALID);
  if (record.members.length > LEGACY_COMBINED_OPERATION_LIMIT) fail(LIMIT_EXCEEDED);
  const rollbackPositions = new Set<number>();
  const coreSourceItemIds = new Set<string>();
  const templateSourceEvidenceIds = new Set<string>();
  let previousSourcePosition = -1;
  for (const member of record.members) {
    const entry = requirePlainJsonObject(member);
    const kind = requireEnum(entry.kind, ["core", "template"]);
    const sourcePosition = requirePosition(entry.sourcePosition);
    const rollbackPosition = requirePosition(entry.rollbackPosition);
    if (sourcePosition !== previousSourcePosition + 1) fail(VALUE_INVALID);
    previousSourcePosition = sourcePosition;
    if (kind === "core") {
      requireExactKeys(entry, CORE_MEMBER_KEYS);
      const sourceItemId = requireCanonicalUuid(entry.sourceItemId);
      requireHex64Digest(entry.sourceItemDigest);
      requireCanonicalUuid(entry.rollbackItemId);
      requireHex64Digest(entry.rollbackItemDigest);
      if (coreSourceItemIds.has(sourceItemId)) fail(VALUE_INVALID);
      coreSourceItemIds.add(sourceItemId);
    } else {
      requireExactKeys(entry, TEMPLATE_MEMBER_KEYS);
      const sourceEvidenceId = requireCanonicalUuid(entry.sourceEvidenceId);
      requireHex64Digest(entry.sourceEvidenceDigest);
      requireHex64Digest(entry.progressDigest);
      if (templateSourceEvidenceIds.has(sourceEvidenceId)) fail(VALUE_INVALID);
      templateSourceEvidenceIds.add(sourceEvidenceId);
    }
    if (rollbackPositions.has(rollbackPosition)) fail(VALUE_INVALID);
    rollbackPositions.add(rollbackPosition);
  }
  for (let expected = 0; expected < record.members.length; expected += 1) {
    if (!rollbackPositions.has(expected)) fail(VALUE_INVALID);
  }
  return digestPreimage(input);
}
