import {
  canonicalizeTask551Rfc8785,
  computeTask551ReviewableReceiptDigest,
  type JsonValue,
  type Task551LowercaseSha256,
  type Task551ReviewableFreezeReceiptV1,
} from "../../../scripts/task551DatabaseBaseline/digestContract";
import {
  TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2,
  type Task551FreezeCandidateGenerationBootstrapV2,
} from "../../../scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap";

// This module is the typed source/fixture model of the active v2 generation
// state. It is pure: no filesystem, environment, database, archive, or state
// I/O happens here. The mutable runtime state lives only in the private store
// authority; this file never reads or writes it.

export const TASK551_FREEZE_CANDIDATE_GENERATION_STATE_SCHEMA_V2 =
  "coderso.task551.freeze-candidate-generation-state@v2" as const;
export const TASK551_FREEZE_CANDIDATE_GENERATION_ID_V2 =
  "task551-freeze-candidate-generation-v2" as const;
export const TASK551_ACTIVE_GENERATION_STATE_KEYS_V2 = [
  "schema",
  "version",
  "generationId",
  "archive",
  "state",
  "receipts",
] as const;
export const TASK551_ACTIVE_GENERATION_RECEIPT_SLOT_KEYS_V2 = ["profile", "receipt"] as const;
export const TASK551_ACTIVE_GENERATION_ARCHIVE_KEYS_V2 = ["path", "sha256"] as const;

export type Task551FreezeCandidateGenerationArchiveV2 =
  Task551FreezeCandidateGenerationBootstrapV2["archive"];
export type Task551FreezeCandidateGenerationStateNameV2 =
  "awaiting-small" | "awaiting-large" | "ready-for-review" | "reviewed";

export type Task551SmallCandidateReceiptV2 = Readonly<{
  profile: "small";
  receipt: Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: "candidate" }>;
}>;
export type Task551LargeCandidateReceiptV2 = Readonly<{
  profile: "large";
  receipt: Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: "candidate" }>;
}>;
export type Task551SmallReviewedReceiptV2 = Readonly<{
  profile: "small";
  receipt: Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: "reviewed" }>;
}>;
export type Task551LargeReviewedReceiptV2 = Readonly<{
  profile: "large";
  receipt: Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: "reviewed" }>;
}>;

type Task551FreezeCandidateGenerationStateHeaderV2 = Readonly<{
  schema: typeof TASK551_FREEZE_CANDIDATE_GENERATION_STATE_SCHEMA_V2;
  version: 2;
  generationId: typeof TASK551_FREEZE_CANDIDATE_GENERATION_ID_V2;
  archive: Task551FreezeCandidateGenerationArchiveV2;
}>;

export type Task551FreezeCandidateGenerationStateV2 =
  | (Task551FreezeCandidateGenerationStateHeaderV2 &
      Readonly<{ state: "awaiting-small"; receipts: readonly [] }>)
  | (Task551FreezeCandidateGenerationStateHeaderV2 &
      Readonly<{ state: "awaiting-large"; receipts: readonly [Task551SmallCandidateReceiptV2] }>)
  | (Task551FreezeCandidateGenerationStateHeaderV2 &
      Readonly<{
        state: "ready-for-review";
        receipts: readonly [Task551SmallCandidateReceiptV2, Task551LargeCandidateReceiptV2];
      }>)
  | (Task551FreezeCandidateGenerationStateHeaderV2 &
      Readonly<{
        state: "reviewed";
        receipts: readonly [Task551SmallReviewedReceiptV2, Task551LargeReviewedReceiptV2];
      }>);

export type Task551ActiveGenerationStateDigestV2 = Task551LowercaseSha256 | "absent";

export const initialTask551FreezeCandidateGenerationStateV2: Task551FreezeCandidateGenerationStateV2 =
  Object.freeze({
    schema: TASK551_FREEZE_CANDIDATE_GENERATION_STATE_SCHEMA_V2,
    version: 2 as const,
    generationId: TASK551_FREEZE_CANDIDATE_GENERATION_ID_V2,
    archive: TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2.archive,
    state: "awaiting-small" as const,
    receipts: Object.freeze([]) as readonly [],
  });

function invalid(): never {
  throw new Error("database_baseline_invalid");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

// Exact own-data record: canonical key order, no inherited/accessor/sparse/
// undefined/defaulted/unknown member, and no prototype other than
// Object.prototype.
function requireExactOrderedRecord(
  value: unknown,
  keys: readonly string[]
): Record<string, unknown> {
  if (!isPlainRecord(value)) invalid();
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== keys.length || ownKeys.some((key, index) => key !== keys[index])) {
    invalid();
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      descriptor.value === undefined
    ) {
      invalid();
    }
  }
  return value;
}

function requireArchiveV2(value: unknown): Task551FreezeCandidateGenerationArchiveV2 {
  const record = requireExactOrderedRecord(value, TASK551_ACTIVE_GENERATION_ARCHIVE_KEYS_V2);
  if (
    record.path !== TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2.archive.path ||
    record.sha256 !== TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2.archive.sha256
  ) {
    invalid();
  }
  return TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2.archive;
}

function requireReceipt(
  value: unknown,
  profile: "small" | "large",
  reviewState: "candidate" | "reviewed",
  sha256Bytes: (bytes: Uint8Array) => string
): Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: "candidate" | "reviewed" }> {
  const receipt = value as Task551ReviewableFreezeReceiptV1;
  if (
    !isPlainRecord(receipt) ||
    receipt.profile !== profile ||
    receipt.reviewState !== reviewState
  ) {
    invalid();
  }
  let selfDigest: string;
  try {
    selfDigest = computeTask551ReviewableReceiptDigest(receipt, sha256Bytes);
  } catch {
    invalid();
  }
  if (receipt.reviewableReceiptDigest !== selfDigest) invalid();
  return receipt as Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: "candidate" }>;
}

function requireReceiptSlot(
  value: unknown,
  profile: "small" | "large",
  reviewState: "candidate" | "reviewed",
  sha256Bytes: (bytes: Uint8Array) => string
): Task551SmallCandidateReceiptV2 | Task551LargeCandidateReceiptV2 {
  const record = requireExactOrderedRecord(value, TASK551_ACTIVE_GENERATION_RECEIPT_SLOT_KEYS_V2);
  const receipt = requireReceipt(record.receipt, profile, reviewState, sha256Bytes);
  return Object.freeze({ profile, receipt }) as
    Task551SmallCandidateReceiptV2 | Task551LargeCandidateReceiptV2;
}

function requireStateName(value: unknown): Task551FreezeCandidateGenerationStateNameV2 {
  if (
    value !== "awaiting-small" &&
    value !== "awaiting-large" &&
    value !== "ready-for-review" &&
    value !== "reviewed"
  ) {
    invalid();
  }
  return value;
}

function stateHeader(archive: Task551FreezeCandidateGenerationArchiveV2) {
  return {
    schema: TASK551_FREEZE_CANDIDATE_GENERATION_STATE_SCHEMA_V2,
    version: 2 as const,
    generationId: TASK551_FREEZE_CANDIDATE_GENERATION_ID_V2,
    archive,
  };
}

// Strict at every depth: no inherited, accessor, duplicate, unknown, missing,
// sparse, undefined, defaulted, reordered, cross-profile, mixed-review-state,
// or noncanonical receipt is accepted, and every state/receipts pair must be
// one of the four legal active shapes.
export function parseTask551FreezeCandidateGenerationStateV2(
  value: unknown,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551FreezeCandidateGenerationStateV2 {
  if (typeof sha256Bytes !== "function") invalid();
  const record = requireExactOrderedRecord(value, TASK551_ACTIVE_GENERATION_STATE_KEYS_V2);
  if (
    record.schema !== TASK551_FREEZE_CANDIDATE_GENERATION_STATE_SCHEMA_V2 ||
    record.version !== 2 ||
    record.generationId !== TASK551_FREEZE_CANDIDATE_GENERATION_ID_V2
  ) {
    invalid();
  }
  const archive = requireArchiveV2(record.archive);
  const state = requireStateName(record.state);
  const receipts = record.receipts;
  if (!Array.isArray(receipts) || Object.getPrototypeOf(receipts) !== Array.prototype) invalid();
  if (state === "awaiting-small") {
    if (receipts.length !== 0) invalid();
    return Object.freeze({
      ...stateHeader(archive),
      state,
      receipts: Object.freeze([]) as readonly [],
    });
  }
  if (state === "awaiting-large") {
    // Awaiting-large carries exactly the small candidate; the large slot is
    // structurally absent, so any second or cross-profile member is rejected.
    if (receipts.length !== 1) invalid();
    const small = requireReceiptSlot(receipts[0], "small", "candidate", sha256Bytes);
    return Object.freeze({
      ...stateHeader(archive),
      state,
      receipts: Object.freeze([small]) as readonly [Task551SmallCandidateReceiptV2],
    }) as unknown as Task551FreezeCandidateGenerationStateV2;
  }
  if (receipts.length !== 2) invalid();
  const small = requireReceiptSlot(
    receipts[0],
    "small",
    state === "ready-for-review" ? "candidate" : "reviewed",
    sha256Bytes
  );
  const large = requireReceiptSlot(
    receipts[1],
    "large",
    state === "ready-for-review" ? "candidate" : "reviewed",
    sha256Bytes
  );
  return Object.freeze({
    ...stateHeader(archive),
    state,
    receipts: Object.freeze([small, large]),
  }) as unknown as Task551FreezeCandidateGenerationStateV2;
}

// The only legal successor-state builders. Each returns a frozen canonical
// state for exactly one edge, and no filesystem, environment, store, or
// database participates.
export function task551AwaitingLargeStateV2(
  small: Task551SmallCandidateReceiptV2["receipt"]
): Task551FreezeCandidateGenerationStateV2 {
  return Object.freeze({
    ...stateHeader(TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2.archive),
    state: "awaiting-large" as const,
    receipts: Object.freeze([{ profile: "small" as const, receipt: small }]),
  }) as unknown as Task551FreezeCandidateGenerationStateV2;
}

export function task551ReadyForReviewStateV2(
  small: Task551SmallCandidateReceiptV2["receipt"],
  large: Task551LargeCandidateReceiptV2["receipt"]
): Task551FreezeCandidateGenerationStateV2 {
  return Object.freeze({
    ...stateHeader(TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2.archive),
    state: "ready-for-review" as const,
    receipts: Object.freeze([
      { profile: "small" as const, receipt: small },
      { profile: "large" as const, receipt: large },
    ]),
  }) as unknown as Task551FreezeCandidateGenerationStateV2;
}

export function task551ReviewedStateV2(
  previous: Task551FreezeCandidateGenerationStateV2,
  small: Task551SmallReviewedReceiptV2["receipt"],
  large: Task551LargeReviewedReceiptV2["receipt"]
): Task551FreezeCandidateGenerationStateV2 {
  return Object.freeze({
    schema: previous.schema,
    version: previous.version,
    generationId: previous.generationId,
    archive: previous.archive,
    state: "reviewed" as const,
    receipts: Object.freeze([
      { profile: "small" as const, receipt: small },
      { profile: "large" as const, receipt: large },
    ]),
  }) as unknown as Task551FreezeCandidateGenerationStateV2;
}

// The canonical state digest is the RFC 8785 digest of the exact own-data
// state. The absent file has the fixed literal sentinel, never a digest.
export function computeTask551ActiveGenerationStateDigestV2(
  state: Task551FreezeCandidateGenerationStateV2,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551LowercaseSha256 {
  if (typeof sha256Bytes !== "function") invalid();
  return sha256Bytes(
    canonicalizeTask551Rfc8785(state as unknown as JsonValue)
  ) as Task551LowercaseSha256;
}
