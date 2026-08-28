import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import {
  assertExactTask551ReviewedCandidateTransition,
  assertExactTask551ReviewedCandidateTransitionInput,
  buildTask551ReviewedCandidateTransitionInput,
  buildExactTask551ReviewedResultByChangingOnlyReviewState,
  canonicalizeTask551Rfc8785,
  computeTask551ReviewableReceiptDigest,
  requireTask551LowercaseSha256,
  type JsonValue,
  type Task551L02OwnerCapabilityReceiptV1,
  type Task551LowercaseSha256,
  type Task551ReviewedCandidateTransitionInputV1,
  type Task551ReviewedCandidateTransitionResultV1,
  type Task551ReviewableFreezeReceiptV1,
  type Task551ScaleProfile,
} from "./digestContract";

export type { Task551L02OwnerCapabilityReceiptV1 } from "./digestContract";

const INVALID_ERROR_MESSAGE = "database_baseline_invalid";
function invalid(): never {
  throw new Error(INVALID_ERROR_MESSAGE);
}

class Task551L02OwnerCapabilityError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "Task551L02OwnerCapabilityError";
    this.code = code;
  }
}

function ownerCapabilityInvalid(code: string): never {
  throw new Task551L02OwnerCapabilityError(code);
}

export type Task551L02OwnerCapabilityObserved = Readonly<{
  headDigest: Task551LowercaseSha256;
  smallCandidateDigest: Task551LowercaseSha256;
  largeCandidateDigest: Task551LowercaseSha256;
  now: number;
}>;

interface Task551L02OwnerCapabilityBinding {
  brand: symbol;
  headDigest: Task551LowercaseSha256;
  smallCandidateDigest: Task551LowercaseSha256;
  largeCandidateDigest: Task551LowercaseSha256;
  expiresAt: number;
  nonce: string;
  receiptDigest: Task551LowercaseSha256;
  consumed: boolean;
}

interface Task551L02OwnerCapabilityFactoryBinding {
  brand: symbol;
  trustedHeadDigest: Task551LowercaseSha256;
  nonces: Set<string>;
  issued: boolean;
}

// Module-closure identity registries: capabilities and factories are recognized
// by WeakSet membership plus a WeakMap binding keyed on a closure-private brand.
const task551L02OwnerCapabilities = new WeakSet<object>();
const task551L02OwnerCapabilityBindings = new WeakMap<object, Task551L02OwnerCapabilityBinding>();
const task551L02OwnerCapabilityFactories = new WeakSet<object>();
const task551L02OwnerCapabilityFactoryBindings = new WeakMap<
  object,
  Task551L02OwnerCapabilityFactoryBinding
>();

export type Task551L02OwnerApprovalCapability = object;
export type Task551L02OwnerCapabilityFactory = Readonly<{
  issueForCandidates(
    input: Readonly<{
      smallCandidateDigest: Task551LowercaseSha256;
      largeCandidateDigest: Task551LowercaseSha256;
      expiresAt: number;
      nonce: string;
    }>
  ): Task551L02OwnerApprovalCapability;
  consumeForReviewedTransition(
    capability: Task551L02OwnerApprovalCapability,
    observed: Task551L02OwnerCapabilityObserved
  ): Task551L02OwnerCapabilityReceiptV1;
}>;

function capabilityDigest(
  binding: Readonly<{
    headDigest: string;
    smallCandidateDigest: string;
    largeCandidateDigest: string;
    expiresAt: number;
    nonce: string;
  }>
): Task551LowercaseSha256 {
  const bytes = canonicalizeTask551Rfc8785({
    schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1",
    headDigest: binding.headDigest,
    smallCandidateDigest: binding.smallCandidateDigest,
    largeCandidateDigest: binding.largeCandidateDigest,
    expiresAt: binding.expiresAt,
    nonce: binding.nonce,
  });
  return requireTask551LowercaseSha256(createHash("sha256").update(bytes).digest("hex"));
}

function ownerDigest(value: unknown, code: string): Task551LowercaseSha256 {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) ownerCapabilityInvalid(code);
  return value;
}

function ownerIssueInput(value: unknown): Readonly<{
  smallCandidateDigest: Task551LowercaseSha256;
  largeCandidateDigest: Task551LowercaseSha256;
  expiresAt: number;
  nonce: string;
}> {
  const record = assertOwnKeys(value, [
    "smallCandidateDigest",
    "largeCandidateDigest",
    "expiresAt",
    "nonce",
  ]);
  if (!Number.isSafeInteger(record.expiresAt) || (record.expiresAt as number) <= 0)
    ownerCapabilityInvalid("l02_owner_capability_expiry_invalid");
  if (typeof record.nonce !== "string" || record.nonce.length === 0 || record.nonce.length > 256)
    ownerCapabilityInvalid("l02_owner_capability_nonce_invalid");
  return {
    smallCandidateDigest: ownerDigest(
      record.smallCandidateDigest,
      "l02_owner_capability_small_digest_invalid"
    ),
    largeCandidateDigest: ownerDigest(
      record.largeCandidateDigest,
      "l02_owner_capability_large_digest_invalid"
    ),
    expiresAt: record.expiresAt as number,
    nonce: record.nonce,
  };
}

function consumeObservedShape(value: unknown): Readonly<{
  headDigest: unknown;
  smallCandidateDigest: unknown;
  largeCandidateDigest: unknown;
  now: number;
}> {
  const record = assertOwnKeys(value, [
    "headDigest",
    "smallCandidateDigest",
    "largeCandidateDigest",
    "now",
  ]);
  if (!Number.isSafeInteger(record.now) || (record.now as number) < 0)
    ownerCapabilityInvalid("l02_owner_capability_now_invalid");
  return {
    headDigest: record.headDigest,
    smallCandidateDigest: record.smallCandidateDigest,
    largeCandidateDigest: record.largeCandidateDigest,
    now: record.now as number,
  };
}

export function createTask551L02OwnerCapabilityFactory(
  trustedHeadDigest: Task551LowercaseSha256
): Task551L02OwnerCapabilityFactory {
  const brand = Symbol("task551-l02-owner-capability");
  const boundHeadDigest = ownerDigest(trustedHeadDigest, "l02_owner_capability_head_invalid");
  const factoryContainer: Record<string | symbol, unknown> = Object.create(null);
  factoryContainer.issueForCandidates = (
    input: Readonly<{
      smallCandidateDigest: Task551LowercaseSha256;
      largeCandidateDigest: Task551LowercaseSha256;
      expiresAt: number;
      nonce: string;
    }>
  ): Task551L02OwnerApprovalCapability => issueTask551L02OwnerCapability(factoryContainer, input);
  factoryContainer.consumeForReviewedTransition = (
    capability: Task551L02OwnerApprovalCapability,
    observed: Task551L02OwnerCapabilityObserved
  ): Task551L02OwnerCapabilityReceiptV1 =>
    consumeTask551L02OwnerCapability(factoryContainer, capability, observed);
  const factory = Object.freeze(factoryContainer);
  task551L02OwnerCapabilityFactories.add(factory);
  task551L02OwnerCapabilityFactoryBindings.set(factory, {
    brand,
    trustedHeadDigest: boundHeadDigest,
    nonces: new Set<string>(),
    issued: false,
  });
  return factory as Task551L02OwnerCapabilityFactory;
}

function issueTask551L02OwnerCapability(
  factory: object,
  input: unknown
): Task551L02OwnerApprovalCapability {
  if (!task551L02OwnerCapabilityFactories.has(factory))
    ownerCapabilityInvalid("l02_owner_capability_unbranded");
  const factoryBinding = task551L02OwnerCapabilityFactoryBindings.get(factory);
  if (factoryBinding === undefined) ownerCapabilityInvalid("l02_owner_capability_unbranded");
  const checked = ownerIssueInput(input);
  // Nonce reuse is rejected before the single-issue state is consulted or marked,
  // so a failed issue never burns the factory unless its nonce was accepted.
  if (factoryBinding.nonces.has(checked.nonce))
    ownerCapabilityInvalid("l02_owner_capability_nonce_reused");
  if (factoryBinding.issued) ownerCapabilityInvalid("l02_owner_capability_consumed");
  factoryBinding.nonces.add(checked.nonce);
  factoryBinding.issued = true;
  const binding: Task551L02OwnerCapabilityBinding = {
    brand: factoryBinding.brand,
    headDigest: factoryBinding.trustedHeadDigest,
    ...checked,
    receiptDigest: capabilityDigest({
      headDigest: factoryBinding.trustedHeadDigest,
      smallCandidateDigest: checked.smallCandidateDigest,
      largeCandidateDigest: checked.largeCandidateDigest,
      expiresAt: checked.expiresAt,
      nonce: checked.nonce,
    }),
    consumed: false,
  };
  const capability = Object.freeze(Object.create(null)) as object;
  task551L02OwnerCapabilities.add(capability);
  task551L02OwnerCapabilityBindings.set(capability, binding);
  return capability as Task551L02OwnerApprovalCapability;
}

function consumeTask551L02OwnerCapability(
  factory: object,
  capability: Task551L02OwnerApprovalCapability,
  observed: Task551L02OwnerCapabilityObserved
): Task551L02OwnerCapabilityReceiptV1 {
  if (!task551L02OwnerCapabilityFactories.has(factory))
    ownerCapabilityInvalid("l02_owner_capability_unbranded");
  const factoryBinding = task551L02OwnerCapabilityFactoryBindings.get(factory);
  if (factoryBinding === undefined) ownerCapabilityInvalid("l02_owner_capability_unbranded");
  const binding = task551L02OwnerCapabilityBindings.get(capability);
  if (
    binding === undefined ||
    !task551L02OwnerCapabilities.has(capability) ||
    binding.brand !== factoryBinding.brand
  )
    ownerCapabilityInvalid("l02_owner_capability_unbranded");
  if (binding.consumed) ownerCapabilityInvalid("l02_owner_capability_consumed");
  const checkedObserved = consumeObservedShape(observed);
  // The observed HEAD is compared against the HEAD bound at factory creation;
  // it is never caller-trusted.
  if (checkedObserved.headDigest !== binding.headDigest)
    ownerCapabilityInvalid("l02_owner_capability_head_mismatch");
  if (checkedObserved.smallCandidateDigest !== binding.smallCandidateDigest)
    ownerCapabilityInvalid("l02_owner_capability_small_digest_mismatch");
  if (checkedObserved.largeCandidateDigest !== binding.largeCandidateDigest)
    ownerCapabilityInvalid("l02_owner_capability_large_digest_mismatch");
  if (checkedObserved.now >= binding.expiresAt)
    ownerCapabilityInvalid("l02_owner_capability_expired");
  binding.consumed = true;
  return Object.freeze({
    schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1" as const,
    digest: binding.receiptDigest,
  });
}

const TASK551_REVIEWED_PAIR_PERSISTENCE_BRAND = Symbol("task551-reviewed-pair-persistence");
const task551ReviewedPairPersistenceCapabilities = new WeakSet<object>();

export type Task551ReviewedPairPersistenceCapability = Readonly<{
  readonly [TASK551_REVIEWED_PAIR_PERSISTENCE_BRAND]: true;
  readonly readExactCurrentCandidateSnapshot: () => Promise<
    readonly [
      Readonly<{ profile: "small"; candidateReceipt: Task551ReviewableFreezeReceiptV1 }>,
      Readonly<{ profile: "large"; candidateReceipt: Task551ReviewableFreezeReceiptV1 }>,
    ]
  >;
  readonly atomicallyTransitionExactReviewedPair: (
    expectedInput: Task551ReviewedCandidateTransitionInputV1
  ) => Promise<Task551ReviewedCandidateTransitionOutcome>;
  readonly readExactCurrentReviewedResult: () => Promise<Task551ReviewedCandidateTransitionResultV1>;
  readonly sha256Bytes: (bytes: Uint8Array) => string;
  readonly writeCandidateReceipt: (
    receipt: Task551ReviewableFreezeReceiptV1
  ) => Promise<Task551ReviewedPairWriteResult>;
}>;
export type Task551ReviewedPairPersistence = Task551ReviewedPairPersistenceCapability;
export type Task551L02ReviewedCandidateTransitionDeps = Task551ReviewedPairPersistenceCapability;
export type Task551L02OwnedReviewedCandidateTransitionDeps =
  Task551ReviewedPairPersistenceCapability;
export type Task551ReviewedCandidateTransitionOutcome = Task551ReviewedCandidateTransitionResultV1 &
  Readonly<{
    writeResult: Task551ReviewedPairWriteResult;
  }>;

function canonicalTask551Value(value: unknown): string {
  return new TextDecoder().decode(canonicalizeTask551Rfc8785(value as JsonValue));
}

function assertSameTask551CandidateSnapshot(
  expected: Task551ReviewedCandidateTransitionInputV1,
  actual: Task551ReviewedCandidateTransitionInputV1,
  errorCode = "l02_owner_capability_candidate_mismatch"
): void {
  if (canonicalTask551Value(expected) !== canonicalTask551Value(actual))
    ownerCapabilityInvalid(errorCode);
  for (let index = 0; index < expected.candidates.length; index += 1) {
    const expectedCandidate = expected.candidates[index]!;
    const actualCandidate = actual.candidates[index]!;
    const expectedBytes = canonicalizeTask551Rfc8785(
      expectedCandidate.candidateReceipt as JsonValue
    );
    const actualBytes = canonicalizeTask551Rfc8785(actualCandidate.candidateReceipt as JsonValue);
    if (
      new TextDecoder().decode(expectedBytes) !== new TextDecoder().decode(actualBytes) ||
      expectedCandidate.candidateCanonicalReceiptDigest !==
        actualCandidate.candidateCanonicalReceiptDigest
    )
      ownerCapabilityInvalid(errorCode);
  }
}

export async function transitionJustFrozenCandidatesAfterL02HumanApproval(
  input: Task551ReviewedCandidateTransitionInputV1,
  persistence: Task551ReviewedPairPersistenceCapability
): Promise<Task551ReviewedCandidateTransitionOutcome> {
  assertTask551ReviewedPairPersistenceCapability(persistence);
  const sha256Bytes = persistence.sha256Bytes;
  const frozenInput = assertExactTask551ReviewedCandidateTransitionInput(
    buildTask551ReviewedCandidateTransitionInput(
      await persistence.readExactCurrentCandidateSnapshot(),
      sha256Bytes
    ),
    sha256Bytes
  );
  const suppliedInput = assertExactTask551ReviewedCandidateTransitionInput(input, sha256Bytes);
  assertSameTask551CandidateSnapshot(frozenInput, suppliedInput);
  const outcome = await persistence.atomicallyTransitionExactReviewedPair(frozenInput);
  if (outcome.writeResult.committed !== true) invalid();
  let persisted: Task551ReviewedCandidateTransitionResultV1;
  try {
    persisted = await persistence.readExactCurrentReviewedResult();
  } catch {
    invalid();
  }
  const checkedPersisted = assertExactTask551ReviewedCandidateTransition({
    input: frozenInput,
    result: persisted,
    sha256Bytes,
  });
  return Object.freeze({ ...checkedPersisted, writeResult: outcome.writeResult });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function assertOwnKeys(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!isPlainObject(value)) invalid();
  const ownKeys = Reflect.ownKeys(value);
  const expected = new Set(keys);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string" || !expected.has(key)) ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
  )
    invalid();
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    )
      invalid();
  }
  return value;
}

const FREEZE_RECEIPTS_SOURCE_URL = new URL(
  "../../tests/perf/task551DatabaseBaseline/freezeReceipts.ts",
  import.meta.url
);
const FREEZE_RECEIPTS_LOCK_URL = new URL("./freezeReceipts.ts.lock", FREEZE_RECEIPTS_SOURCE_URL);

type Task551ReviewedPairOwnershipToken = symbol;

type Task551ReviewedPairFileIo = Readonly<{
  read: (url: URL) => string;
  write: (url: URL, source: string) => void;
  unlink: (url: URL) => void;
  compareAndRename: (
    from: URL,
    to: URL,
    expectedSource: string,
    ownershipToken: Task551ReviewedPairOwnershipToken
  ) => void;
  lock: <T>(
    ownershipToken: Task551ReviewedPairOwnershipToken,
    callback: (ownershipToken: Task551ReviewedPairOwnershipToken) => T
  ) => T;
  readTrustedCurrentHeadDigest?: () => Task551LowercaseSha256;
  now?: () => number;
  nonce?: () => string;
  reportCleanupFailure?: (failure: Task551ReviewedPairCleanupTelemetry) => void;
}>;

export type Task551ReviewedPairCleanupFailureKind = "temporary-unlink" | "lock-release";
export type Task551ReviewedPairCleanupTelemetry = Readonly<{
  kind: Task551ReviewedPairCleanupFailureKind;
}>;
export type Task551ReviewedPairWriteResult = Readonly<{
  committed: true;
  cleanupFailures: readonly Task551ReviewedPairCleanupTelemetry[];
}>;

class Task551ReviewedPairLockReleaseError extends Error {
  constructor() {
    super("task551_reviewed_pair_lock_release_failed");
    this.name = "Task551ReviewedPairLockReleaseError";
  }
}

let defaultReviewedPairLockToken: Task551ReviewedPairOwnershipToken | undefined;

const defaultReviewedPairFileIo: Task551ReviewedPairFileIo = {
  read: (url) => readFileSync(url, "utf8"),
  write: (url, source) => writeFileSync(url, source, "utf8"),
  unlink: (url) => unlinkSync(url),
  compareAndRename: (from, to, expectedSource, ownershipToken) => {
    if (defaultReviewedPairLockToken !== ownershipToken) invalid();
    let currentSource: string;
    try {
      currentSource = readFileSync(to, "utf8");
    } catch {
      invalid();
    }
    if (currentSource !== expectedSource) invalid();
    renameSync(from, to);
  },
  lock: <T>(
    ownershipToken: Task551ReviewedPairOwnershipToken,
    callback: (ownershipToken: Task551ReviewedPairOwnershipToken) => T
  ): T => {
    if (
      typeof ownershipToken !== "symbol" ||
      typeof callback !== "function" ||
      defaultReviewedPairLockToken !== undefined
    )
      invalid();
    try {
      mkdirSync(FREEZE_RECEIPTS_LOCK_URL);
    } catch {
      invalid();
    }
    defaultReviewedPairLockToken = ownershipToken;
    let callbackResult: T | undefined;
    let callbackFailed = false;
    let callbackError: unknown;
    try {
      callbackResult = callback(ownershipToken);
    } catch (error) {
      callbackFailed = true;
      callbackError = error;
    } finally {
      defaultReviewedPairLockToken = undefined;
    }
    let releaseFailed = false;
    try {
      rmdirSync(FREEZE_RECEIPTS_LOCK_URL);
    } catch {
      releaseFailed = true;
    }
    if (releaseFailed) {
      throw new Task551ReviewedPairLockReleaseError();
    }
    if (callbackFailed) {
      throw callbackError;
    }
    return callbackResult as T;
  },
  readTrustedCurrentHeadDigest: () => {
    try {
      const head = execFileSync("git", ["rev-parse", "--verify", "HEAD"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (!/^[0-9a-f]{40,64}$/u.test(head)) invalid();
      return requireTask551LowercaseSha256(createHash("sha256").update(head, "utf8").digest("hex"));
    } catch {
      invalid();
    }
  },
  now: Date.now,
  nonce: randomUUID,
};

export function assertTask551ReviewedPairPersistenceCapability(
  value: unknown
): asserts value is Task551ReviewedPairPersistenceCapability {
  if (
    value === null ||
    typeof value !== "object" ||
    !task551ReviewedPairPersistenceCapabilities.has(value)
  )
    invalid();
}

function assertTask551ReviewedPairFileIo(
  fileIo: unknown
): asserts fileIo is Task551ReviewedPairFileIo {
  if (fileIo === null || typeof fileIo !== "object" || Array.isArray(fileIo)) invalid();
  const candidate = fileIo as Record<string | symbol, unknown>;
  const ownKeys = Reflect.ownKeys(candidate);
  const allowedKeys = new Set([
    "read",
    "write",
    "unlink",
    "compareAndRename",
    "lock",
    "readTrustedCurrentHeadDigest",
    "now",
    "nonce",
    "reportCleanupFailure",
  ]);
  if (ownKeys.some((key) => typeof key !== "string" || !allowedKeys.has(key))) invalid();
  for (const key of ["read", "write", "unlink", "compareAndRename", "lock"] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined ||
      typeof descriptor.value !== "function"
    )
      invalid();
  }
  for (const key of [
    "readTrustedCurrentHeadDigest",
    "now",
    "nonce",
    "reportCleanupFailure",
  ] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
    if (
      descriptor !== undefined &&
      (descriptor.enumerable !== true ||
        !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
        descriptor.get !== undefined ||
        descriptor.set !== undefined ||
        typeof descriptor.value !== "function")
    )
      invalid();
  }
}

function trustedHeadDigest(fileIo: Task551ReviewedPairFileIo): Task551LowercaseSha256 {
  return ownerDigest(
    (
      fileIo.readTrustedCurrentHeadDigest ?? defaultReviewedPairFileIo.readTrustedCurrentHeadDigest!
    )(),
    "l02_owner_capability_head_invalid"
  );
}

function trustedNow(fileIo: Task551ReviewedPairFileIo): number {
  const now = (fileIo.now ?? defaultReviewedPairFileIo.now!)();
  if (!Number.isSafeInteger(now) || now < 0)
    ownerCapabilityInvalid("l02_owner_capability_now_invalid");
  return now;
}

function trustedNonce(fileIo: Task551ReviewedPairFileIo): string {
  const nonce = (fileIo.nonce ?? defaultReviewedPairFileIo.nonce!)();
  if (typeof nonce !== "string" || nonce.length === 0 || nonce.length > 256)
    ownerCapabilityInvalid("l02_owner_capability_nonce_invalid");
  return nonce;
}

function withTask551ReviewedPairLock<T>(
  fileIo: Task551ReviewedPairFileIo,
  callback: (ownershipToken: Task551ReviewedPairOwnershipToken) => T
): T {
  const ownershipToken = Symbol("task551-reviewed-pair-lock");
  return fileIo.lock(ownershipToken, (heldToken) => {
    if (heldToken !== ownershipToken) invalid();
    return callback(heldToken);
  });
}

function isErrnoCode(error: unknown, expectedCode: string): boolean {
  if (error === null || typeof error !== "object") return false;
  return (error as Readonly<{ code?: unknown }>).code === expectedCode;
}

function verifyTask551ReviewedPairReplacement(
  fileIo: Task551ReviewedPairFileIo,
  expectedSource: string
): boolean {
  let currentSource: string;
  try {
    currentSource = fileIo.read(FREEZE_RECEIPTS_SOURCE_URL);
  } catch {
    invalid();
  }
  if (currentSource !== expectedSource) return false;
  parsePersistedFreezeReceipts(currentSource);
  return true;
}

function reportTask551ReviewedPairCleanupFailures(
  fileIo: Task551ReviewedPairFileIo,
  kinds: readonly Task551ReviewedPairCleanupFailureKind[]
): Task551ReviewedPairWriteResult {
  const cleanupFailures = kinds.map((kind) => Object.freeze({ kind }));
  for (const failure of cleanupFailures) {
    try {
      fileIo.reportCleanupFailure?.(failure);
    } catch {
      // Telemetry must never turn a committed replacement into a mutation failure.
    }
  }
  return Object.freeze({
    committed: true as const,
    cleanupFailures: Object.freeze(cleanupFailures),
  });
}

type Task551PreparedReviewedPairReplacement = Readonly<{
  expectedSource: string;
  nextSource: string;
}>;

function atomicallyReplaceTask551ReviewedPair(
  fileIo: Task551ReviewedPairFileIo,
  prepare: () => Task551PreparedReviewedPairReplacement
): Task551ReviewedPairWriteResult {
  assertTask551ReviewedPairFileIo(fileIo);
  const temporaryUrl = new URL("./freezeReceipts.ts.tmp", FREEZE_RECEIPTS_SOURCE_URL);
  let replacementSource: string | undefined;
  let replacementAttempted = false;
  let replacementCommitted = false;
  let callbackReturned = false;
  const cleanupFailureKinds: Task551ReviewedPairCleanupFailureKind[] = [];
  try {
    withTask551ReviewedPairLock(fileIo, (ownershipToken) => {
      const prepared = prepare();
      replacementSource = prepared.nextSource;
      try {
        fileIo.write(temporaryUrl, prepared.nextSource);
        replacementAttempted = true;
        compareAndRenameTask551ReviewedPair(
          fileIo,
          temporaryUrl,
          FREEZE_RECEIPTS_SOURCE_URL,
          prepared.expectedSource,
          ownershipToken
        );
        replacementCommitted = true;
      } finally {
        try {
          fileIo.unlink(temporaryUrl);
        } catch (error) {
          if (!isErrnoCode(error, "ENOENT")) {
            cleanupFailureKinds.push("temporary-unlink");
          }
        }
      }
      callbackReturned = true;
    });
  } catch (error) {
    if (
      !replacementCommitted &&
      replacementAttempted &&
      replacementSource !== undefined &&
      verifyTask551ReviewedPairReplacement(fileIo, replacementSource)
    ) {
      replacementCommitted = true;
    }
    if (!replacementCommitted) {
      if (error instanceof Task551L02OwnerCapabilityError) throw error;
      invalid();
    }
    if (callbackReturned || error instanceof Task551ReviewedPairLockReleaseError) {
      cleanupFailureKinds.push("lock-release");
    }
  }
  if (!replacementCommitted || replacementSource === undefined) invalid();
  if (!verifyTask551ReviewedPairReplacement(fileIo, replacementSource)) invalid();
  return reportTask551ReviewedPairCleanupFailures(fileIo, cleanupFailureKinds);
}

function compareAndRenameTask551ReviewedPair(
  fileIo: Task551ReviewedPairFileIo,
  from: URL,
  to: URL,
  expectedSource: string,
  ownershipToken: Task551ReviewedPairOwnershipToken
): void {
  fileIo.compareAndRename(from, to, expectedSource, ownershipToken);
}

function findJsonObjectEnd(source: string, start: number): number {
  if (source[start] !== "{") invalid();
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  invalid();
}

function parsePersistedFreezeReceipts(source: string): Record<string, unknown> {
  const exportMarker = "export const TASK551_DATABASE_FREEZE_RECEIPT";
  const exportIndex = source.indexOf(exportMarker);
  if (exportIndex < 0) invalid();
  const objectStart = source.indexOf("{", exportIndex);
  if (objectStart < 0) invalid();
  const objectEnd = findJsonObjectEnd(source, objectStart);
  let parsed: unknown;
  try {
    parsed = JSON.parse(source.slice(objectStart, objectEnd + 1)) as unknown;
  } catch {
    invalid();
  }
  return assertOwnKeys(parsed, ["small", "large"]);
}

function readPersistedFreezeReceipts(
  fileIo: Task551ReviewedPairFileIo = defaultReviewedPairFileIo
): Record<string, unknown> {
  assertTask551ReviewedPairFileIo(fileIo);
  let source: string;
  try {
    source = fileIo.read(FREEZE_RECEIPTS_SOURCE_URL);
  } catch {
    invalid();
  }
  return parsePersistedFreezeReceipts(source);
}

export function defaultReadReceipt(profile: Task551ScaleProfile): Task551ReviewableFreezeReceiptV1 {
  const receipt = readPersistedFreezeReceipts()[profile];
  if (receipt === undefined) invalid();
  return receipt as Task551ReviewableFreezeReceiptV1;
}

function atomicallyWriteTask551CandidateReceipt(
  fileIo: Task551ReviewedPairFileIo,
  receipt: Task551ReviewableFreezeReceiptV1
): Task551ReviewedPairWriteResult {
  if (receipt.reviewState !== "candidate") invalid();
  return atomicallyReplaceTask551ReviewedPair(fileIo, () => {
    let source: string;
    try {
      source = fileIo.read(FREEZE_RECEIPTS_SOURCE_URL);
    } catch {
      invalid();
    }
    const persisted = parsePersistedFreezeReceipts(source);
    persisted[receipt.profile] = receipt;
    const nextSource = buildFreezeReceiptSource(
      source,
      persisted as {
        small: Task551ReviewableFreezeReceiptV1;
        large: Task551ReviewableFreezeReceiptV1;
      }
    );
    return { expectedSource: source, nextSource };
  });
}

function buildFreezeReceiptSource(
  source: string,
  pair: Readonly<{
    small: Task551ReviewableFreezeReceiptV1;
    large: Task551ReviewableFreezeReceiptV1;
  }>
): string {
  const exportMarker = "export const TASK551_DATABASE_FREEZE_RECEIPT";
  const exportIndex = source.indexOf(exportMarker);
  if (exportIndex < 0) invalid();
  const objectStart = source.indexOf("{", exportIndex);
  if (objectStart < 0) invalid();
  const objectEnd = findJsonObjectEnd(source, objectStart);
  return `${source.slice(0, objectStart)}${JSON.stringify(pair, null, 2)}${source.slice(objectEnd + 1)}`;
}

function assertExactReviewedPair(
  result: Task551ReviewedCandidateTransitionResultV1,
  sha256Bytes: (bytes: Uint8Array) => string
): Readonly<{ small: Task551ReviewableFreezeReceiptV1; large: Task551ReviewableFreezeReceiptV1 }> {
  const record = assertOwnKeys(result, ["schema", "capabilityReceipt", "reviewed"]);
  if (record.schema !== "coderso.task551.reviewed-candidate-transition-result@v1") invalid();
  if (!Array.isArray(record.reviewed) || record.reviewed.length !== 2) invalid();
  const reviewed =
    record.reviewed as unknown as Task551ReviewedCandidateTransitionResultV1["reviewed"];
  if (reviewed[0]?.profile !== "small" || reviewed[1]?.profile !== "large") invalid();
  for (const entry of reviewed) {
    if (
      entry.reviewedReceipt.reviewState !== "reviewed" ||
      entry.reviewedReceipt.profile !== entry.profile
    )
      invalid();
    if (
      computeTask551ReviewableReceiptDigest(entry.reviewedReceipt, sha256Bytes) !==
      entry.reviewedReceipt.reviewableReceiptDigest
    )
      invalid();
  }
  return { small: reviewed[0]!.reviewedReceipt, large: reviewed[1]!.reviewedReceipt };
}

function atomicallyTransitionTask551ReviewedPair(
  expectedInput: Task551ReviewedCandidateTransitionInputV1,
  sha256Bytes: (bytes: Uint8Array) => string,
  fileIo: Task551ReviewedPairFileIo
): Task551ReviewedCandidateTransitionOutcome {
  let result: Task551ReviewedCandidateTransitionResultV1 | undefined;
  const writeResult = atomicallyReplaceTask551ReviewedPair(fileIo, () => {
    const checkedInput = assertExactTask551ReviewedCandidateTransitionInput(
      expectedInput,
      sha256Bytes
    );
    let originalSource: string;
    try {
      originalSource = fileIo.read(FREEZE_RECEIPTS_SOURCE_URL);
    } catch {
      invalid();
    }
    const persisted = parsePersistedFreezeReceipts(originalSource);
    if (
      (persisted.small as Task551ReviewableFreezeReceiptV1).reviewState !== "candidate" ||
      (persisted.large as Task551ReviewableFreezeReceiptV1).reviewState !== "candidate"
    )
      invalid();
    const currentInput = buildTask551ReviewedCandidateTransitionInput(
      [
        { profile: "small", candidateReceipt: persisted.small as Task551ReviewableFreezeReceiptV1 },
        { profile: "large", candidateReceipt: persisted.large as Task551ReviewableFreezeReceiptV1 },
      ],
      sha256Bytes
    );
    assertSameTask551CandidateSnapshot(
      checkedInput,
      currentInput,
      "l02_reviewed_pair_atomic_conflict"
    );
    // The owner capability is issued and consumed inside the mandatory lock/CAS
    // boundary, after the candidate re-read and before any write. The factory is
    // always created from the trusted HEAD source of the injected/default fileIio,
    // never from caller-supplied head observation.
    const ownerFactory = createTask551L02OwnerCapabilityFactory(trustedHeadDigest(fileIo));
    const issuedAt = trustedNow(fileIo);
    const capability = ownerFactory.issueForCandidates({
      smallCandidateDigest: currentInput.candidates[0]!.candidateCanonicalReceiptDigest,
      largeCandidateDigest: currentInput.candidates[1]!.candidateCanonicalReceiptDigest,
      expiresAt: issuedAt + 60_000,
      nonce: trustedNonce(fileIo),
    });
    const capabilityReceipt = ownerFactory.consumeForReviewedTransition(capability, {
      headDigest: trustedHeadDigest(fileIo),
      smallCandidateDigest: currentInput.candidates[0]!.candidateCanonicalReceiptDigest,
      largeCandidateDigest: currentInput.candidates[1]!.candidateCanonicalReceiptDigest,
      now: trustedNow(fileIo),
    });
    result = buildExactTask551ReviewedResultByChangingOnlyReviewState({
      input: currentInput,
      capabilityReceipt,
      sha256Bytes,
    });
    const checkedResult = assertExactTask551ReviewedCandidateTransition({
      input: currentInput,
      result,
      sha256Bytes,
    });
    const pair = assertExactReviewedPair(checkedResult, sha256Bytes);
    return {
      expectedSource: originalSource,
      nextSource: buildFreezeReceiptSource(originalSource, pair),
    };
  });
  if (result === undefined) invalid();
  return Object.freeze({ ...result, writeResult });
}

export function createTask551ReviewedPairPersistence(
  sha256Bytes: (bytes: Uint8Array) => string,
  fileIo: unknown = defaultReviewedPairFileIo
): Task551ReviewedPairPersistenceCapability {
  if (typeof sha256Bytes !== "function") invalid();
  assertTask551ReviewedPairFileIo(fileIo);
  let persistedResult: Task551ReviewedCandidateTransitionResultV1 | undefined;
  const readPair = () => {
    const persisted = readPersistedFreezeReceipts(fileIo);
    if (persisted.small === undefined || persisted.large === undefined) invalid();
    return [
      persisted.small as Task551ReviewableFreezeReceiptV1,
      persisted.large as Task551ReviewableFreezeReceiptV1,
    ] as const;
  };
  const capability = {
    [TASK551_REVIEWED_PAIR_PERSISTENCE_BRAND]: true as const,
    sha256Bytes,
    readExactCurrentCandidateSnapshot: async () => {
      const [small, large] = readPair();
      if (small.reviewState !== "candidate" || large.reviewState !== "candidate") invalid();
      return [
        { profile: "small", candidateReceipt: small },
        { profile: "large", candidateReceipt: large },
      ];
    },
    atomicallyTransitionExactReviewedPair: async (expectedInput) => {
      const outcome = atomicallyTransitionTask551ReviewedPair(expectedInput, sha256Bytes, fileIo);
      persistedResult = {
        schema: outcome.schema,
        capabilityReceipt: outcome.capabilityReceipt,
        reviewed: outcome.reviewed,
      };
      return outcome;
    },
    readExactCurrentReviewedResult: async () => {
      if (persistedResult === undefined) invalid();
      const [small, large] = readPair();
      if (small.reviewState !== "reviewed" || large.reviewState !== "reviewed") invalid();
      const expected = assertExactReviewedPair(persistedResult, sha256Bytes);
      if (canonicalTask551Value({ small, large }) !== canonicalTask551Value(expected)) invalid();
      return persistedResult;
    },
    writeCandidateReceipt: async (receipt) =>
      atomicallyWriteTask551CandidateReceipt(fileIo, receipt),
  } as Task551ReviewedPairPersistenceCapability;
  task551ReviewedPairPersistenceCapabilities.add(capability);
  return Object.freeze(capability);
}

export const defaultTask551ReviewedPairPersistence = createTask551ReviewedPairPersistence(() =>
  invalid()
);
