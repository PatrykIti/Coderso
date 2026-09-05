import type {
  Task551L02OwnerCapabilityReceiptV1,
  Task551LowercaseSha256,
  Task551ReviewedCandidateTransitionInputV1,
  Task551ReviewedCandidateTransitionResultV1,
  Task551ReviewableFreezeReceiptV1,
} from "./digestContract";
import {
  requireExactTask551L02ActiveStateTransitionReceiptV2,
  requireExactTask551L02ReviewedStateAttestationV2,
  type Task551L02ActiveStateTransitionReceiptV2,
  type Task551L02ReviewedStateAttestationV2,
} from "./receiptContract";
import type {
  Task551L02ReviewedTransitionInputV1,
  Task551L02ReviewedTransitionWithStateReceiptV2,
  Task551ReviewedPairCleanupFailureKind,
  Task551ReviewedPairCleanupTelemetry,
  Task551ReviewedPairWriteResult,
} from "./reviewedPairTransition";

// This is the stable L02 facade. It deliberately exposes no persistence,
// capability, approval, or candidate-write authority at runtime.
export {
  registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition,
  runL02OwnedReviewedTransition,
} from "./reviewedPairTransition";

// The two pure sanitized normalizers: already-reduced validation only, no
// persistence, capability, approval, or candidate-write authority.
export function parseTask551L02ActiveStateTransitionReceiptV2(
  value: unknown
): Task551L02ActiveStateTransitionReceiptV2 {
  return requireExactTask551L02ActiveStateTransitionReceiptV2(value);
}

export function parseTask551L02ReviewedStateAttestationV2(
  value: unknown
): Task551L02ReviewedStateAttestationV2 {
  return requireExactTask551L02ReviewedStateAttestationV2(value);
}

export type {
  Task551L02ActiveStateTransitionReceiptV2,
  Task551L02ReviewedStateAttestationV2,
} from "./receiptContract";
export type {
  Task551L02ReviewedTransitionInputV1,
  Task551L02ReviewedTransitionWithStateReceiptV2,
  Task551ReviewedPairCleanupFailureKind,
  Task551ReviewedPairCleanupTelemetry,
  Task551ReviewedPairWriteResult,
} from "./reviewedPairTransition";
export type { Task551L02OwnerCapabilityReceiptV1 } from "./digestContract";

// Legacy declarations intentionally remain structurally compatible while their
// runtime factories are retired below. The unique symbol is declaration-only;
// no runtime capability or persistence object is constructed by this facade.
declare const task551LegacyReviewedPairPersistenceBrand: unique symbol;

export type Task551L02OwnerCapabilityObserved = Readonly<{
  worktreeSnapshotDigest: Task551LowercaseSha256;
  smallCandidateDigest: Task551LowercaseSha256;
  largeCandidateDigest: Task551LowercaseSha256;
  now: number;
}>;

export type Task551L02OwnerApprovalCapability = object;
export type Task551L02OwnerCapabilityFactory = Readonly<{
  issueForCandidates: (
    input: Readonly<{
      smallCandidateDigest: Task551LowercaseSha256;
      largeCandidateDigest: Task551LowercaseSha256;
      expiresAt: number;
      nonce: string;
    }>
  ) => Task551L02OwnerApprovalCapability;
  consumeForReviewedTransition: (
    capability: Task551L02OwnerApprovalCapability,
    observed: Task551L02OwnerCapabilityObserved
  ) => Task551L02OwnerCapabilityReceiptV1;
}>;

export type Task551ReviewedPairPersistenceCapability = Readonly<{
  readonly [task551LegacyReviewedPairPersistenceBrand]: true;
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

function failTask551LegacyReviewedAuthority(..._ignored: readonly unknown[]): never {
  throw new Error("l02_owned_reviewed_transition_legacy_migration_required");
}

// Deprecated runtime authorities are intentionally fail-closed. Their types
// remain above only for source compatibility while callers migrate to L11's
// three-digest facade handoff.
export const createTask551ReviewedPairPersistence = failTask551LegacyReviewedAuthority;
export const defaultTask551ReviewedPairPersistence = failTask551LegacyReviewedAuthority;
export const transitionJustFrozenCandidatesAfterL02HumanApproval =
  failTask551LegacyReviewedAuthority;
export const createTask551L02OwnerCapabilityFactory = failTask551LegacyReviewedAuthority;
