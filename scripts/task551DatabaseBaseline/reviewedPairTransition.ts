import { randomUUID } from "node:crypto";
import {
  assertExactTask551ReviewedCandidateTransition,
  buildExactTask551ReviewedResultByChangingOnlyReviewState,
  buildTask551ReviewedCandidateTransitionInput,
  canonicalizeTask551Rfc8785,
  computeTask551ReviewableReceiptDigest,
  requireTask551LowercaseSha256,
  type JsonValue,
  type Task551L02OwnerCapabilityReceiptV1,
  type Task551LowercaseSha256,
  type Task551ReviewedCandidateTransitionInputV1,
  type Task551ReviewedCandidateTransitionResultV1,
  type Task551ReviewableFreezeReceiptV1,
  type Task551ReviewableReceiptDigestInputV1,
  type Task551ScaleProfile,
} from "./digestContract";
import {
  TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_KEYS_V2,
  TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_SCHEMA_V2,
  requireExactTask551L02ActiveStateTransitionReceiptV2,
  requireExactTask551L02ReviewedStateAttestationV2,
  type Task551L02ActiveStateTransitionReceiptV2,
  type Task551L02ReviewedStateAttestationV2,
} from "./receiptContract";
import {
  computeTask551ActiveGenerationClosureBindingsForStore,
  readTask551ActiveGenerationStateForStore,
  refuseTask551LegacyActiveInputForStore,
  withTask551ActiveGenerationStoreLock,
  writeTask551ActiveGenerationStateForStore,
  sha256Task551ActiveGenerationBytesForStore,
  type Task551ActiveGenerationStoreReadResult,
} from "./freezeCandidateGenerationStore";
import {
  computeTask551ActiveGenerationStateDigestV2,
  initialTask551FreezeCandidateGenerationStateV2,
  task551AwaitingLargeStateV2,
  task551ReadyForReviewStateV2,
  task551ReviewedStateV2,
  type Task551FreezeCandidateGenerationStateV2,
} from "../../tests/perf/task551DatabaseBaseline/freezeCandidateGenerationState";
import { task551ReviewedPairV2FromState } from "../../tests/perf/task551DatabaseBaseline/freezeCandidateGenerationFixture";

const INVALID_ERROR_MESSAGE = "database_baseline_invalid";
const REVIEW_REQUEST_SCHEMA = "coderso.task551.l02-owner-review-request@v1" as const;
const APPROVAL_MAX_LIFETIME_MS = 60_000;

type Task551L02ReviewedTransitionErrorCode =
  | "l02_owned_reviewed_transition_invalid"
  | "l02_owned_reviewed_transition_snapshot_unregistered"
  | "l02_owned_reviewed_transition_snapshot_registration_reused"
  | "l02_owned_reviewed_transition_snapshot_registration_stale"
  | "l02_owned_reviewed_transition_snapshot_mismatch"
  | "l02_owned_reviewed_transition_candidate_mismatch"
  | "l02_owned_reviewed_transition_approval_denied"
  | "l02_owned_reviewed_transition_approval_ingress_reused"
  | "l02_owned_reviewed_transition_expired"
  | "l02_owned_reviewed_transition_replayed"
  | "l02_owned_reviewed_transition_conflict"
  | "l02_owned_reviewed_transition_legacy_migration_required";

class Task551L02ReviewedTransitionError extends Error {
  readonly code: Task551L02ReviewedTransitionErrorCode;

  constructor(code: Task551L02ReviewedTransitionErrorCode) {
    super(code);
    this.name = "Task551L02ReviewedTransitionError";
    this.code = code;
  }
}

function transitionFailure(code: Task551L02ReviewedTransitionErrorCode): never {
  throw new Task551L02ReviewedTransitionError(code);
}

function invalid(): never {
  throw new Error(INVALID_ERROR_MESSAGE);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function readOwnRecord(
  value: unknown,
  keys: readonly string[],
  fail: () => never
): Record<string, unknown> {
  if (!isPlainObject(value)) fail();
  const ownKeys = Reflect.ownKeys(value);
  const expected = new Set(keys);
  const mismatched =
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string" || !expected.has(key)) ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(value, key));
  if (mismatched) fail();
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    const brokenDescriptor =
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined;
    if (brokenDescriptor) fail();
  }
  return value;
}

function requireTransitionDigest(value: unknown): Task551LowercaseSha256 {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/u.test(value) || /^0{64}$/u.test(value)) {
    transitionFailure("l02_owned_reviewed_transition_invalid");
  }
  return value;
}

export type Task551L02ReviewedTransitionInputV1 = Readonly<{
  worktreeSnapshotDigest: Task551LowercaseSha256;
  smallCandidateCanonicalDigest: Task551LowercaseSha256;
  largeCandidateCanonicalDigest: Task551LowercaseSha256;
}>;

function requireExactTransitionRequest(value: unknown): Task551L02ReviewedTransitionInputV1 {
  const record = readOwnRecord(
    value,
    ["worktreeSnapshotDigest", "smallCandidateCanonicalDigest", "largeCandidateCanonicalDigest"],
    () => transitionFailure("l02_owned_reviewed_transition_invalid")
  );
  return Object.freeze({
    worktreeSnapshotDigest: requireTransitionDigest(record.worktreeSnapshotDigest),
    smallCandidateCanonicalDigest: requireTransitionDigest(record.smallCandidateCanonicalDigest),
    largeCandidateCanonicalDigest: requireTransitionDigest(record.largeCandidateCanonicalDigest),
  });
}

export type Task551ReviewedPairCleanupFailureKind = "temporary-unlink" | "lock-release";
export type Task551ReviewedPairCleanupTelemetry = Readonly<{
  kind: Task551ReviewedPairCleanupFailureKind;
}>;
export type Task551ReviewedPairWriteResult = Readonly<{
  committed: true;
  cleanupFailures: readonly Task551ReviewedPairCleanupTelemetry[];
}>;

export type Task551CandidateReceiptWriterForRunner = Readonly<{
  writeCandidateReceipt: (
    receipt: Task551ReviewableFreezeReceiptV1
  ) => Promise<Task551ReviewedPairWriteResult>;
}>;

type Task551ActiveStateIo = Readonly<{
  withLock: <T>(callback: () => T) => T;
  readState: (
    options: Readonly<{ allowAbsent: boolean }>
  ) => Task551ActiveGenerationStoreReadResult;
  writeState: (
    next: Task551FreezeCandidateGenerationStateV2
  ) => Task551ActiveGenerationStoreReadResult;
  sha256Bytes: (bytes: Uint8Array) => string;
  now: () => number;
  readAcceptedSnapshotDigest: (registeredDigest: Task551LowercaseSha256) => Task551LowercaseSha256;
}>;

function defaultSha256Bytes(bytes: Uint8Array): string {
  return sha256Task551ActiveGenerationBytesForStore(bytes);
}

// The default storage authority is the private active-generation store: the
// same lock, atomic write, re-read, and absence rules the runner entry uses.
const defaultActiveStateIo: Task551ActiveStateIo = Object.freeze({
  withLock: withTask551ActiveGenerationStoreLock,
  readState: readTask551ActiveGenerationStateForStore,
  writeState: writeTask551ActiveGenerationStateForStore,
  sha256Bytes: defaultSha256Bytes,
  now: Date.now,
  readAcceptedSnapshotDigest: (registeredDigest) => registeredDigest,
});

type Task551FocusedStateIoInput = Task551ActiveStateIo;

const FOCUSED_STATE_IO_KEYS = [
  "withLock",
  "readState",
  "writeState",
  "sha256Bytes",
  "now",
  "readAcceptedSnapshotDigest",
] as const;

let focusedStorage: Task551ActiveStateIo | undefined;

function requireFocusedStorage(value: unknown): Task551ActiveStateIo {
  const record = readOwnRecord(value, FOCUSED_STATE_IO_KEYS, () =>
    transitionFailure("l02_owned_reviewed_transition_invalid")
  );
  // Every member is already proven to be exactly one own function-valued key,
  // so the validated record narrows as a whole.
  for (const key of FOCUSED_STATE_IO_KEYS) {
    if (typeof record[key] !== "function") {
      transitionFailure("l02_owned_reviewed_transition_invalid");
    }
  }
  return Object.freeze(record as unknown as Task551ActiveStateIo);
}

export function installTask551L02ReviewedTransitionFocusedStorageForTest(
  input: Task551FocusedStateIoInput
): void {
  if (focusedStorage !== undefined)
    transitionFailure("l02_owned_reviewed_transition_approval_ingress_reused");
  focusedStorage = requireFocusedStorage(input);
}

function activeStateIo(): Task551ActiveStateIo {
  return focusedStorage ?? defaultActiveStateIo;
}

type Task551CandidateReceiptV2 = Task551ReviewableFreezeReceiptV1 &
  Readonly<{ reviewState: "candidate" }>;
type Task551ReviewedReceiptV2 = Task551ReviewableFreezeReceiptV1 &
  Readonly<{ reviewState: "reviewed" }>;

function requireValidStateReceipt(
  value: Task551ReviewableFreezeReceiptV1,
  expectedProfile: Task551ScaleProfile | undefined,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551ReviewableFreezeReceiptV1 {
  const receipt = value as Task551ReviewableFreezeReceiptV1;
  const selfDigest = computeTask551ReviewableReceiptDigest(receipt, sha256Bytes);
  if (
    (receipt.profile !== "small" && receipt.profile !== "large") ||
    (receipt.reviewState !== "candidate" && receipt.reviewState !== "reviewed") ||
    (expectedProfile !== undefined && receipt.profile !== expectedProfile) ||
    receipt.reviewableReceiptDigest !== selfDigest
  ) {
    invalid();
  }
  return receipt;
}

function assertCandidateReceipt(
  receipt: Task551ReviewableFreezeReceiptV1,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551CandidateReceiptV2 {
  const checked = requireValidStateReceipt(receipt, undefined, sha256Bytes);
  if (checked.reviewState !== "candidate") invalid();
  return checked as Task551CandidateReceiptV2;
}

function stateDigestV2(
  state: Task551FreezeCandidateGenerationStateV2,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551LowercaseSha256 {
  return computeTask551ActiveGenerationStateDigestV2(state, sha256Bytes);
}

// The only legal freeze edges: the small candidate is accepted while the
// generation is awaiting its first receipt, and the large candidate only while
// exactly the small candidate is present. Any other state refuses.
function writeCandidateReceipt(
  receipt: Task551ReviewableFreezeReceiptV1,
  io: Task551ActiveStateIo
): Task551ReviewedPairWriteResult {
  const candidate = assertCandidateReceipt(receipt, io.sha256Bytes);
  io.withLock(() => {
    if (candidate.profile === "small") {
      const before = io.readState({ allowAbsent: true });
      if (before.state.state !== "awaiting-small") invalid();
      io.writeState(task551AwaitingLargeStateV2(candidate));
      return;
    }
    const before = io.readState({ allowAbsent: false });
    if (before.state.state !== "awaiting-large") invalid();
    const slot = before.state.receipts[0];
    if (slot === undefined || slot.profile !== "small") invalid();
    io.writeState(task551ReadyForReviewStateV2(slot.receipt, candidate));
  });
  return Object.freeze({ committed: true, cleanupFailures: Object.freeze([]) });
}

export function createTask551CandidateReceiptWriterForFocusedTest(
  sha256Bytes: (bytes: Uint8Array) => string,
  input: Omit<Task551FocusedStateIoInput, "sha256Bytes">
): Task551CandidateReceiptWriterForRunner {
  if (typeof sha256Bytes !== "function") invalid();
  const io = requireFocusedStorage({ ...input, sha256Bytes });
  return Object.freeze({
    writeCandidateReceipt: async (receipt) => writeCandidateReceipt(receipt, io),
  });
}

export const defaultTask551CandidateReceiptWriterForRunner: Task551CandidateReceiptWriterForRunner =
  Object.freeze({
    writeCandidateReceipt: async (receipt) => writeCandidateReceipt(receipt, defaultActiveStateIo),
  });

let focusedCandidateReceiptWriterForRunner: Task551CandidateReceiptWriterForRunner | undefined;

function requireFocusedCandidateReceiptWriter(
  value: unknown
): Task551CandidateReceiptWriterForRunner {
  const record = readOwnRecord(value, ["writeCandidateReceipt"], invalid);
  if (typeof record.writeCandidateReceipt !== "function") invalid();
  return Object.freeze(record as unknown as Task551CandidateReceiptWriterForRunner);
}

// This override is intentionally reachable only through the implementation
// module in focused tests. The runner dependency surface never accepts it.
export function replaceTask551CandidateReceiptWriterForFocusedTest(value: unknown): void {
  focusedCandidateReceiptWriterForRunner = requireFocusedCandidateReceiptWriter(value);
}

export function resetTask551CandidateReceiptWriterForFocusedTest(): void {
  focusedCandidateReceiptWriterForRunner = undefined;
}

export function activeTask551CandidateReceiptWriterForRunner(): Task551CandidateReceiptWriterForRunner {
  return focusedCandidateReceiptWriterForRunner ?? defaultTask551CandidateReceiptWriterForRunner;
}

// The only reviewed-receipt read: it narrows the durable reviewed state through
// the fixture module, so a candidate, absent, or foreign state never surfaces.
export function defaultReadReceipt(profile: Task551ScaleProfile): Task551ReviewableFreezeReceiptV1 {
  if (profile !== "small" && profile !== "large") invalid();
  const io = activeStateIo();
  return task551ReviewedPairV2FromState(io.readState({ allowAbsent: false }).state)[profile];
}

// The legacy pair-storage and archive-write inputs are permanently refused:
// presenting either is a migration, never a fallback or a repair.
function refuseLegacyActiveInput(value: unknown): void {
  try {
    refuseTask551LegacyActiveInputForStore(value);
  } catch {
    transitionFailure("l02_owned_reviewed_transition_legacy_migration_required");
  }
}

type Task551RegisteredSnapshotV1 = Readonly<{
  digest: Task551LowercaseSha256;
  generation: number;
  consumed: boolean;
}>;

let registeredSnapshot: Task551RegisteredSnapshotV1 | undefined;
let nextSnapshotGeneration = 0;

export function registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition(
  digest: Task551LowercaseSha256
): void {
  const checked = requireTransitionDigest(digest);
  if (registeredSnapshot?.consumed === false) {
    transitionFailure("l02_owned_reviewed_transition_snapshot_registration_reused");
  }
  nextSnapshotGeneration += 1;
  registeredSnapshot = Object.freeze({
    digest: checked,
    generation: nextSnapshotGeneration,
    consumed: false,
  });
}

const task551L02OwnerApprovalBrand: unique symbol = Symbol("task551-l02-owner-review-approval");
const task551L02CapabilityBrand: unique symbol = Symbol("task551-l02-owner-capability");

type Task551L02OwnerReviewRequestV1 = Readonly<{
  schema: typeof REVIEW_REQUEST_SCHEMA;
  worktreeSnapshotDigest: Task551LowercaseSha256;
  smallCandidateCanonicalDigest: Task551LowercaseSha256;
  largeCandidateCanonicalDigest: Task551LowercaseSha256;
}>;

type Task551L02OwnerReviewDecisionV1 =
  Readonly<{ approved: true; expiresAtUnixMs: number }> | Readonly<{ approved: false }>;

export type Task551L02OwnerPauseResumeIngressV1 = Readonly<{
  review: (request: Task551L02OwnerReviewRequestV1) => Task551L02OwnerReviewDecisionV1;
}>;

type Task551L02SealedOwnerReviewApprovalV1 = Task551L02OwnerReviewRequestV1 &
  Readonly<{
    approvedAtUnixMs: number;
    expiresAtUnixMs: number;
    readonly [task551L02OwnerApprovalBrand]: true;
  }>;

let ownerPauseResumeIngress: Task551L02OwnerPauseResumeIngressV1 | undefined;
let sealedOwnerReviewApproval: Task551L02SealedOwnerReviewApprovalV1 | undefined;

function requireSynchronousOwnerReviewCallback(
  value: unknown
): Task551L02OwnerPauseResumeIngressV1["review"] {
  if (typeof value !== "function") transitionFailure("l02_owned_reviewed_transition_invalid");
  return value as Task551L02OwnerPauseResumeIngressV1["review"];
}

export function installTask551L02OwnerPauseResumeIngressForOwnerHost(
  review: Task551L02OwnerPauseResumeIngressV1["review"]
): void {
  if (ownerPauseResumeIngress !== undefined) {
    transitionFailure("l02_owned_reviewed_transition_approval_ingress_reused");
  }
  ownerPauseResumeIngress = Object.freeze({
    review: requireSynchronousOwnerReviewCallback(review),
  });
}

export function revokeTask551L02OwnerPauseResumeIngressForOwnerHost(): void {
  sealedOwnerReviewApproval = undefined;
  ownerPauseResumeIngress = undefined;
}

function ownerReviewRequest(
  request: Task551L02ReviewedTransitionInputV1
): Task551L02OwnerReviewRequestV1 {
  return Object.freeze({
    schema: REVIEW_REQUEST_SCHEMA,
    worktreeSnapshotDigest: request.worktreeSnapshotDigest,
    smallCandidateCanonicalDigest: request.smallCandidateCanonicalDigest,
    largeCandidateCanonicalDigest: request.largeCandidateCanonicalDigest,
  });
}

function requireOwnerDecision(value: unknown, now: number): Task551L02OwnerReviewDecisionV1 {
  if (!Number.isSafeInteger(now) || now < 0)
    transitionFailure("l02_owned_reviewed_transition_invalid");
  const record = isPlainObject(value)
    ? value
    : transitionFailure("l02_owned_reviewed_transition_invalid");
  if (record.approved === false) {
    readOwnRecord(record, ["approved"], () =>
      transitionFailure("l02_owned_reviewed_transition_invalid")
    );
    return Object.freeze({ approved: false });
  }
  readOwnRecord(record, ["approved", "expiresAtUnixMs"], () =>
    transitionFailure("l02_owned_reviewed_transition_invalid")
  );
  if (
    record.approved !== true ||
    !Number.isSafeInteger(record.expiresAtUnixMs) ||
    (record.expiresAtUnixMs as number) <= now ||
    (record.expiresAtUnixMs as number) > now + APPROVAL_MAX_LIFETIME_MS
  ) {
    transitionFailure("l02_owned_reviewed_transition_invalid");
  }
  return Object.freeze({ approved: true, expiresAtUnixMs: record.expiresAtUnixMs as number });
}

function mintSealedOwnerReviewApproval(
  request: Task551L02OwnerReviewRequestV1,
  decision: Extract<Task551L02OwnerReviewDecisionV1, Readonly<{ approved: true }>>,
  now: number
): Task551L02SealedOwnerReviewApprovalV1 {
  const approval: Record<string | symbol, unknown> = {
    ...request,
    approvedAtUnixMs: now,
    expiresAtUnixMs: decision.expiresAtUnixMs,
  };
  Object.defineProperty(approval, task551L02OwnerApprovalBrand, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  });
  return Object.freeze(approval) as Task551L02SealedOwnerReviewApprovalV1;
}

function consumeExactSealedOwnerReviewApproval(
  approval: Task551L02SealedOwnerReviewApprovalV1,
  request: Task551L02OwnerReviewRequestV1,
  now: number
): void {
  if (
    sealedOwnerReviewApproval !== approval ||
    !Object.prototype.hasOwnProperty.call(approval, task551L02OwnerApprovalBrand) ||
    approval[task551L02OwnerApprovalBrand] !== true ||
    approval.schema !== request.schema ||
    approval.worktreeSnapshotDigest !== request.worktreeSnapshotDigest ||
    approval.smallCandidateCanonicalDigest !== request.smallCandidateCanonicalDigest ||
    approval.largeCandidateCanonicalDigest !== request.largeCandidateCanonicalDigest
  ) {
    transitionFailure("l02_owned_reviewed_transition_replayed");
  }
  if (!Number.isSafeInteger(now) || now >= approval.expiresAtUnixMs) {
    transitionFailure("l02_owned_reviewed_transition_expired");
  }
  sealedOwnerReviewApproval = undefined;
}

type Task551PrivateCapabilityBinding = Readonly<{
  readonly [task551L02CapabilityBrand]: true;
  worktreeSnapshotDigest: Task551LowercaseSha256;
  smallCandidateCanonicalDigest: Task551LowercaseSha256;
  largeCandidateCanonicalDigest: Task551LowercaseSha256;
  expiresAtUnixMs: number;
  nonce: string;
  consumed: boolean;
}>;

const privateCapabilities = new WeakSet<object>();
const privateCapabilityBindings = new WeakMap<object, Task551PrivateCapabilityBinding>();

function createPrivateTask551L02OwnerCapabilityFactoryInsideTransition(
  worktreeSnapshotDigest: Task551LowercaseSha256,
  sha256Bytes: (bytes: Uint8Array) => string,
  now: number
): Readonly<{
  issueForCandidates: (
    input: Readonly<{
      smallCandidateCanonicalDigest: Task551LowercaseSha256;
      largeCandidateCanonicalDigest: Task551LowercaseSha256;
    }>
  ) => object;
  consumeForReviewedTransition: (
    capability: object,
    observed: Task551L02OwnerReviewRequestV1
  ) => Task551L02OwnerCapabilityReceiptV1;
}> {
  let issued = false;
  return Object.freeze({
    issueForCandidates: (input) => {
      if (issued) transitionFailure("l02_owned_reviewed_transition_replayed");
      const checked = readOwnRecord(
        input,
        ["smallCandidateCanonicalDigest", "largeCandidateCanonicalDigest"],
        () => transitionFailure("l02_owned_reviewed_transition_invalid")
      );
      const binding: Task551PrivateCapabilityBinding = {
        [task551L02CapabilityBrand]: true,
        worktreeSnapshotDigest,
        smallCandidateCanonicalDigest: requireTransitionDigest(
          checked.smallCandidateCanonicalDigest
        ),
        largeCandidateCanonicalDigest: requireTransitionDigest(
          checked.largeCandidateCanonicalDigest
        ),
        expiresAtUnixMs: now + APPROVAL_MAX_LIFETIME_MS,
        nonce: randomUUID(),
        consumed: false,
      };
      issued = true;
      const capability: Record<string | symbol, unknown> = Object.create(null);
      Object.defineProperty(capability, task551L02CapabilityBrand, {
        configurable: false,
        enumerable: false,
        value: true,
        writable: false,
      });
      const sealedCapability = Object.freeze(capability) as object;
      privateCapabilities.add(sealedCapability);
      privateCapabilityBindings.set(sealedCapability, binding);
      return sealedCapability;
    },
    consumeForReviewedTransition: (capability, observed) => {
      const binding = privateCapabilityBindings.get(capability);
      if (
        binding === undefined ||
        !privateCapabilities.has(capability) ||
        !Object.prototype.hasOwnProperty.call(capability, task551L02CapabilityBrand) ||
        (capability as Record<string | symbol, unknown>)[task551L02CapabilityBrand] !== true ||
        binding[task551L02CapabilityBrand] !== true ||
        binding.consumed ||
        observed.worktreeSnapshotDigest !== binding.worktreeSnapshotDigest ||
        observed.smallCandidateCanonicalDigest !== binding.smallCandidateCanonicalDigest ||
        observed.largeCandidateCanonicalDigest !== binding.largeCandidateCanonicalDigest
      ) {
        transitionFailure("l02_owned_reviewed_transition_replayed");
      }
      if (now >= binding.expiresAtUnixMs)
        transitionFailure("l02_owned_reviewed_transition_expired");
      const digest = requireTask551LowercaseSha256(
        sha256Bytes(
          canonicalizeTask551Rfc8785({
            schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1",
            worktreeSnapshotDigest: binding.worktreeSnapshotDigest,
            smallCandidateCanonicalDigest: binding.smallCandidateCanonicalDigest,
            largeCandidateCanonicalDigest: binding.largeCandidateCanonicalDigest,
            expiresAtUnixMs: binding.expiresAtUnixMs,
            nonce: binding.nonce,
          })
        )
      );
      privateCapabilityBindings.set(capability, Object.freeze({ ...binding, consumed: true }));
      return Object.freeze({
        schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1" as const,
        digest,
      });
    },
  });
}

function requireReadyForReviewState(
  read: Task551ActiveGenerationStoreReadResult
): Task551FreezeCandidateGenerationStateV2 & {
  state: "ready-for-review";
} {
  if (read.state.state !== "ready-for-review") {
    transitionFailure("l02_owned_reviewed_transition_candidate_mismatch");
  }
  return read.state as Task551FreezeCandidateGenerationStateV2 & { state: "ready-for-review" };
}

function requireCurrentCandidateInput(
  read: Task551ActiveGenerationStoreReadResult,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551ReviewedCandidateTransitionInputV1 {
  const state = requireReadyForReviewState(read);
  try {
    return buildTask551ReviewedCandidateTransitionInput(
      [
        { profile: "small", candidateReceipt: state.receipts[0]!.receipt },
        { profile: "large", candidateReceipt: state.receipts[1]!.receipt },
      ],
      sha256Bytes
    );
  } catch {
    transitionFailure("l02_owned_reviewed_transition_invalid");
  }
}

function requireRequestCandidateDigests(
  input: Task551ReviewedCandidateTransitionInputV1,
  request: Task551L02ReviewedTransitionInputV1
): void {
  if (
    input.candidates[0].candidateCanonicalReceiptDigest !== request.smallCandidateCanonicalDigest ||
    input.candidates[1].candidateCanonicalReceiptDigest !== request.largeCandidateCanonicalDigest
  ) {
    transitionFailure("l02_owned_reviewed_transition_candidate_mismatch");
  }
}

// The receipt is materialized in exactly its canonical key order: the strict
// v2 validator accepts only ordered own-data records, and the identifier is
// derived from the same canonical projection.
function canonicalActiveTransitionReceiptV2(
  fields: Omit<Task551L02ActiveStateTransitionReceiptV2, "transitionId">,
  transitionId: Task551LowercaseSha256
): Task551L02ActiveStateTransitionReceiptV2 {
  const source = { ...fields, transitionId } as Task551L02ActiveStateTransitionReceiptV2;
  const ordered: Record<string, unknown> = {};
  for (const key of TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_KEYS_V2) {
    ordered[key] = source[key];
  }
  return ordered as unknown as Task551L02ActiveStateTransitionReceiptV2;
}

// Deterministic transition-identifier derivation: the digest of the exact
// canonical receipt payload without its own identifier field, in canonical key
// order. Every edge identifier is therefore reproducible from state alone.
function computeActiveTransitionIdV2(
  fields: Omit<Task551L02ActiveStateTransitionReceiptV2, "transitionId">,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551LowercaseSha256 {
  const ordered: Record<string, unknown> = {};
  for (const key of TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_KEYS_V2) {
    if (key === "transitionId") continue;
    ordered[key] = (fields as Record<string, unknown>)[key];
  }
  return requireTask551LowercaseSha256(
    sha256Bytes(canonicalizeTask551Rfc8785(ordered as unknown as JsonValue))
  );
}

function candidateFormOfReviewedReceipt(
  receipt: Task551ReviewedReceiptV2,
  sha256Bytes: (bytes: Uint8Array) => string
): Task551CandidateReceiptV2 {
  const { reviewState: _state, reviewableReceiptDigest: _self, ...payload } = receipt;
  // The digest input carries no self key: the digest contract computes the
  // reviewable digest of exactly the payload and rejects a placeholder self
  // digest, so the candidate form is digested first and sealed afterwards.
  const candidate = {
    ...payload,
    reviewState: "candidate" as const,
  } as Task551ReviewableReceiptDigestInputV1;
  return {
    ...candidate,
    reviewableReceiptDigest: computeTask551ReviewableReceiptDigest(candidate, sha256Bytes),
  } as unknown as Task551CandidateReceiptV2;
}

type Task551ActiveTransitionChainV2 = Readonly<{
  receipt: Task551L02ActiveStateTransitionReceiptV2;
  attestation: Task551L02ReviewedStateAttestationV2;
  readyForReviewStateDigest: Task551LowercaseSha256;
  awaitingLargeStateDigest: Task551LowercaseSha256;
}>;

// The complete three-edge identifier chain is a pure function of the reviewed
// pair plus the repository bindings: the small candidate alone reconstructs the
// awaiting-large state, the pair reconstructs the ready state, and the review
// edge seals the reviewed digest.
function buildExactActiveTransitionChainV2(
  input: Readonly<{
    smallReviewed: Task551ReviewedReceiptV2;
    largeReviewed: Task551ReviewedReceiptV2;
    reviewedStateDigest: Task551LowercaseSha256;
    bindings: ReturnType<typeof computeTask551ActiveGenerationClosureBindingsForStore>;
    sha256Bytes: (bytes: Uint8Array) => string;
  }>
): Task551ActiveTransitionChainV2 {
  const smallCandidate = candidateFormOfReviewedReceipt(input.smallReviewed, input.sha256Bytes);
  const largeCandidate = candidateFormOfReviewedReceipt(input.largeReviewed, input.sha256Bytes);
  const awaitingLargeDigest = stateDigestV2(
    task551AwaitingLargeStateV2(smallCandidate),
    input.sha256Bytes
  );
  const readyState = task551ReadyForReviewStateV2(smallCandidate, largeCandidate);
  const readyDigest = stateDigestV2(readyState, input.sha256Bytes);
  const base = {
    schema: TASK551_L02_ACTIVE_STATE_TRANSITION_RECEIPT_SCHEMA_V2,
    version: 2 as const,
    generationId: initialTask551FreezeCandidateGenerationStateV2.generationId,
    archiveSha256: input.bindings.archiveSha256,
    bootstrapSourceSha256: input.bindings.bootstrapSourceSha256,
    l02ClosureSha256: input.bindings.l02ClosureSha256,
  };
  const first = {
    ...base,
    operation: "freeze-small" as const,
    sequence: 1 as const,
    previousTransitionId: null,
    beforeState: "awaiting-small" as const,
    beforeStateDigest: "absent" as const,
    afterState: "awaiting-large" as const,
    afterStateDigest: awaitingLargeDigest,
  };
  const firstId = computeActiveTransitionIdV2(first, input.sha256Bytes);
  const second = {
    ...base,
    operation: "freeze-large" as const,
    sequence: 2 as const,
    previousTransitionId: firstId,
    beforeState: "awaiting-large" as const,
    beforeStateDigest: awaitingLargeDigest,
    afterState: "ready-for-review" as const,
    afterStateDigest: readyDigest,
  };
  const secondId = computeActiveTransitionIdV2(second, input.sha256Bytes);
  const third = {
    ...base,
    operation: "review" as const,
    sequence: 3 as const,
    previousTransitionId: secondId,
    beforeState: "ready-for-review" as const,
    beforeStateDigest: readyDigest,
    afterState: "reviewed" as const,
    afterStateDigest: input.reviewedStateDigest,
  };
  const receipt = requireExactTask551L02ActiveStateTransitionReceiptV2(
    canonicalActiveTransitionReceiptV2(third, computeActiveTransitionIdV2(third, input.sha256Bytes))
  );
  const attestation = requireExactTask551L02ReviewedStateAttestationV2({
    schema: "coderso.task551.l02-reviewed-state-attestation@v2",
    version: 2 as const,
    generationId: initialTask551FreezeCandidateGenerationStateV2.generationId,
    state: "reviewed" as const,
    sequence: 3 as const,
    transitionId: receipt.transitionId,
    stateDigest: input.reviewedStateDigest,
    archiveSha256: input.bindings.archiveSha256,
    bootstrapSourceSha256: input.bindings.bootstrapSourceSha256,
    l02ClosureSha256: input.bindings.l02ClosureSha256,
  });
  return Object.freeze({
    receipt,
    attestation,
    readyForReviewStateDigest: readyDigest,
    awaitingLargeStateDigest: awaitingLargeDigest,
  });
}

function requireReviewedPairOfState(
  state: Task551FreezeCandidateGenerationStateV2
): Readonly<{ small: Task551ReviewedReceiptV2; large: Task551ReviewedReceiptV2 }> {
  if (state.state !== "reviewed") invalid();
  return task551ReviewedPairV2FromState(state) as Readonly<{
    small: Task551ReviewedReceiptV2;
    large: Task551ReviewedReceiptV2;
  }>;
}

// The non-mutating reviewed attestation: it re-derives the whole identifier
// chain from the durable reviewed pair and the repository bindings, and never
// accepts or produces a candidate, absent, or partial state.
export function readTask551L02ReviewedStateAttestationForCheck(): Task551L02ReviewedStateAttestationV2 {
  const io = activeStateIo();
  const read = io.readState({ allowAbsent: false });
  const pair = requireReviewedPairOfState(read.state);
  return buildExactActiveTransitionChainV2({
    smallReviewed: pair.small,
    largeReviewed: pair.large,
    reviewedStateDigest: read.stateDigest,
    bindings: computeTask551ActiveGenerationClosureBindingsForStore(),
    sha256Bytes: io.sha256Bytes,
  }).attestation;
}

export type Task551L02ReviewedTransitionWithStateReceiptV2 =
  Task551ReviewedCandidateTransitionResultV1 &
    Readonly<{ stateTransitionReceipt: Task551L02ActiveStateTransitionReceiptV2 }>;

function runL02OwnedReviewedTransitionSync(
  request: Task551L02ReviewedTransitionInputV1
): Task551L02ReviewedTransitionWithStateReceiptV2 {
  const storage = activeStateIo();
  return storage.withLock(() => {
    const slot = registeredSnapshot;
    if (slot === undefined)
      transitionFailure("l02_owned_reviewed_transition_snapshot_unregistered");
    if (slot.consumed)
      transitionFailure("l02_owned_reviewed_transition_snapshot_registration_reused");
    if (slot.generation !== nextSnapshotGeneration) {
      transitionFailure("l02_owned_reviewed_transition_snapshot_registration_stale");
    }
    let acceptedSnapshot: Task551LowercaseSha256;
    try {
      acceptedSnapshot = requireTransitionDigest(storage.readAcceptedSnapshotDigest(slot.digest));
    } catch (error) {
      if (error instanceof Task551L02ReviewedTransitionError) throw error;
      transitionFailure("l02_owned_reviewed_transition_invalid");
    }
    if (acceptedSnapshot !== slot.digest || request.worktreeSnapshotDigest !== slot.digest) {
      transitionFailure("l02_owned_reviewed_transition_snapshot_mismatch");
    }
    registeredSnapshot = Object.freeze({ ...slot, consumed: true });
    const initialRead = storage.readState({ allowAbsent: false });
    const input = requireCurrentCandidateInput(initialRead, storage.sha256Bytes);
    requireRequestCandidateDigests(input, request);
    const ownerRequest = ownerReviewRequest(request);
    if (
      ownerRequest.worktreeSnapshotDigest !== slot.digest ||
      ownerRequest.smallCandidateCanonicalDigest !==
        input.candidates[0].candidateCanonicalReceiptDigest ||
      ownerRequest.largeCandidateCanonicalDigest !==
        input.candidates[1].candidateCanonicalReceiptDigest
    ) {
      transitionFailure("l02_owned_reviewed_transition_candidate_mismatch");
    }
    const currentNow = storage.now();
    let decision: Task551L02OwnerReviewDecisionV1;
    try {
      decision =
        ownerPauseResumeIngress?.review(ownerRequest) ?? Object.freeze({ approved: false });
    } catch {
      transitionFailure("l02_owned_reviewed_transition_invalid");
    }
    decision = requireOwnerDecision(decision, currentNow);
    if (!decision.approved) transitionFailure("l02_owned_reviewed_transition_approval_denied");
    if (
      registeredSnapshot?.generation !== slot.generation ||
      registeredSnapshot.consumed !== true ||
      nextSnapshotGeneration !== slot.generation
    ) {
      transitionFailure("l02_owned_reviewed_transition_snapshot_registration_stale");
    }
    const approval = mintSealedOwnerReviewApproval(ownerRequest, decision, currentNow);
    sealedOwnerReviewApproval = approval;
    try {
      consumeExactSealedOwnerReviewApproval(approval, ownerRequest, storage.now());
      const factory = createPrivateTask551L02OwnerCapabilityFactoryInsideTransition(
        slot.digest,
        storage.sha256Bytes,
        currentNow
      );
      const capability = factory.issueForCandidates({
        smallCandidateCanonicalDigest: input.candidates[0].candidateCanonicalReceiptDigest,
        largeCandidateCanonicalDigest: input.candidates[1].candidateCanonicalReceiptDigest,
      });
      const capabilityReceipt = factory.consumeForReviewedTransition(capability, ownerRequest);
      const result = buildExactTask551ReviewedResultByChangingOnlyReviewState({
        input,
        capabilityReceipt,
        sha256Bytes: storage.sha256Bytes,
      });
      assertExactTask551ReviewedCandidateTransition({
        input,
        result,
        sha256Bytes: storage.sha256Bytes,
      });
      const beforeWrite = storage.readState({ allowAbsent: false });
      const rereadInput = requireCurrentCandidateInput(beforeWrite, storage.sha256Bytes);
      requireRequestCandidateDigests(rereadInput, request);
      if (
        rereadInput.candidates[0].candidateCanonicalReceiptDigest !==
          input.candidates[0].candidateCanonicalReceiptDigest ||
        rereadInput.candidates[1].candidateCanonicalReceiptDigest !==
          input.candidates[1].candidateCanonicalReceiptDigest
      ) {
        transitionFailure("l02_owned_reviewed_transition_candidate_mismatch");
      }
      const readyState = requireReadyForReviewState(beforeWrite);
      const reviewed = task551ReviewedStateV2(
        readyState,
        result.reviewed[0].reviewedReceipt as Task551ReviewedReceiptV2,
        result.reviewed[1].reviewedReceipt as Task551ReviewedReceiptV2
      );
      try {
        storage.writeState(reviewed);
      } catch (error) {
        if (error instanceof Task551L02ReviewedTransitionError) throw error;
        transitionFailure("l02_owned_reviewed_transition_conflict");
      }
      let persisted: Task551ActiveGenerationStoreReadResult;
      try {
        persisted = storage.readState({ allowAbsent: false });
      } catch (error) {
        if (error instanceof Task551L02ReviewedTransitionError) throw error;
        transitionFailure("l02_owned_reviewed_transition_conflict");
      }
      const persistedPair = requireReviewedPairOfState(persisted.state);
      if (persisted.stateDigest === "absent") {
        transitionFailure("l02_owned_reviewed_transition_conflict");
      }
      if (
        canonicalizeTask551Rfc8785(persistedPair.small as unknown as JsonValue).toString() !==
          canonicalizeTask551Rfc8785(
            result.reviewed[0].reviewedReceipt as unknown as JsonValue
          ).toString() ||
        canonicalizeTask551Rfc8785(persistedPair.large as unknown as JsonValue).toString() !==
          canonicalizeTask551Rfc8785(
            result.reviewed[1].reviewedReceipt as unknown as JsonValue
          ).toString()
      ) {
        transitionFailure("l02_owned_reviewed_transition_conflict");
      }
      assertExactTask551ReviewedCandidateTransition({
        input,
        result,
        sha256Bytes: storage.sha256Bytes,
      });
      const chain = buildExactActiveTransitionChainV2({
        smallReviewed: result.reviewed[0].reviewedReceipt as Task551ReviewedReceiptV2,
        largeReviewed: result.reviewed[1].reviewedReceipt as Task551ReviewedReceiptV2,
        reviewedStateDigest: persisted.stateDigest,
        bindings: computeTask551ActiveGenerationClosureBindingsForStore(),
        sha256Bytes: storage.sha256Bytes,
      });
      if (
        beforeWrite.stateDigest === "absent" ||
        chain.readyForReviewStateDigest !== beforeWrite.stateDigest ||
        chain.receipt.beforeStateDigest !== beforeWrite.stateDigest ||
        chain.receipt.afterStateDigest !== persisted.stateDigest
      ) {
        transitionFailure("l02_owned_reviewed_transition_conflict");
      }
      return Object.freeze({ ...result, stateTransitionReceipt: chain.receipt });
    } finally {
      sealedOwnerReviewApproval = undefined;
    }
  });
}

export async function runL02OwnedReviewedTransition(
  request: Task551L02ReviewedTransitionInputV1
): Promise<Task551L02ReviewedTransitionWithStateReceiptV2> {
  const received = requireExactTransitionRequest(request);
  refuseLegacyActiveInput(received);
  try {
    return runL02OwnedReviewedTransitionSync(received);
  } catch (error) {
    if (error instanceof Task551L02ReviewedTransitionError) throw error;
    transitionFailure("l02_owned_reviewed_transition_invalid");
  }
}

export function verifyTask551L02OwnerApprovalRuntimeBrandForFocusedTest(): boolean {
  const request = Object.freeze({
    schema: REVIEW_REQUEST_SCHEMA,
    worktreeSnapshotDigest: "a".repeat(64) as Task551LowercaseSha256,
    smallCandidateCanonicalDigest: "b".repeat(64) as Task551LowercaseSha256,
    largeCandidateCanonicalDigest: "c".repeat(64) as Task551LowercaseSha256,
  });
  const approval = mintSealedOwnerReviewApproval(
    request,
    Object.freeze({ approved: true, expiresAtUnixMs: 1 }),
    0
  );
  const callerGuessedBrand: symbol = Symbol("task551-l02-owner-review-approval");
  const forged = Object.create(approval) as object;
  return (
    Object.getOwnPropertySymbols(approval).includes(task551L02OwnerApprovalBrand) &&
    Object.prototype.hasOwnProperty.call(approval, task551L02OwnerApprovalBrand) &&
    callerGuessedBrand !== task551L02OwnerApprovalBrand &&
    !Object.prototype.hasOwnProperty.call(approval, callerGuessedBrand) &&
    !Object.prototype.hasOwnProperty.call(forged, task551L02OwnerApprovalBrand)
  );
}

export function resetTask551L02ReviewedTransitionForFocusedTest(): void {
  focusedStorage = undefined;
  resetTask551CandidateReceiptWriterForFocusedTest();
  registeredSnapshot = undefined;
  nextSnapshotGeneration = 0;
  revokeTask551L02OwnerPauseResumeIngressForOwnerHost();
}
