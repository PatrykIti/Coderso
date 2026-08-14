// Type declarations for _docs/_workflows/lib/smoke-evidence-closure.mjs
// (single owner: TASK-545-03-L04). Covers the closure mutation plan, the
// ordered-durable writer options, the metadata-only recovery delta, the exact
// metadata allowlist, and the `closure-delta` CLI entry. The checkpoint,
// `closureIdentity`, and `Task545ClosureResume` types are consumed from
// TASK-545-03-L03 (`./smoke-evidence-checkpoint.d.mts`) with no local
// substitutes; runtime values are passed as arguments and never re-derived
// from caller-supplied paths/hunks/dates.

import type {
  SmokeEvidenceCheckpointV1,
  SmokeEvidenceClosureContractV1,
  Task545ClosureIdentity,
  Task545ClosureResume,
  VerifiedTask545Checkpoint,
  VerifiedTask545MetadataRecoveryDelta,
} from "./smoke-evidence-checkpoint.d.mts";

export type OrderedDurableProtocolV1 = "ordered-durable-changelog-file-then-index@v1";
export type CanonicalUtcDate = string; // runtime-validated YYYY-MM-DD
export type ClosureMetadataOperationKindV1 =
  | "replace_once"
  | "upsert_field"
  | "replace_board_row"
  | "replace_statistics_row"
  | "create_file"
  | "insert_after";

export interface ClosureMetadataOperationV1 {
  readonly kind: ClosureMetadataOperationKindV1;
  readonly label: string;
  readonly search?: string;
  readonly replacement?: string;
  readonly field?: string;
  readonly value?: string;
  readonly afterField?: string;
  readonly from?: string;
  readonly to?: string;
  readonly anchor?: string;
  readonly line?: string;
  readonly bytes?: string;
}

// Deeply frozen plan record: the exact frozen before-hash, the ordered
// metadata operations, and the recomputed after-hash over the frozen bytes.
export interface ClosureMetadataMutationRecordV1 {
  readonly path: string;
  readonly beforeSha256: string;
  readonly operations: readonly ClosureMetadataOperationV1[];
  readonly expectedAfterSha256: string;
}

export type ClosureMetadataMutationPlanV1 = readonly ClosureMetadataMutationRecordV1[];

// The exact changelog index mutation consumed by the ordered-durable writer:
// insert `row` after the single `anchor` line and replace `pointerFrom` with
// `pointerTo`, both exactly once.
export interface ChangelogIndexMutationV1 {
  readonly anchor: string;
  readonly row: string;
  readonly pointerFrom: string;
  readonly pointerTo: string;
}

export interface OrderedDurableWriterOptionsV1 {
  readonly repoRoot: string;
  readonly checkpoint: VerifiedTask545Checkpoint;
  readonly runId: string;
  readonly closureIdentity: Task545ClosureIdentity;
  readonly changelogBytes: string;
  readonly changelogIndexMutation: ChangelogIndexMutationV1;
  readonly protocol: OrderedDurableProtocolV1;
}

export interface ClosurePlanOptionsV1 {
  readonly repoRoot: string;
}

export interface ClosureDeltaCliSuccessV1 {
  readonly pass: true;
  readonly taskId: string;
  readonly runId: string;
  readonly durableState: "none" | "file-only" | "both";
  readonly closureMetadataRevision: {
    readonly gitHead: string;
    readonly workingTreeDirty: boolean;
    readonly workingTreeSha256: string;
  };
  readonly changedPaths: readonly string[];
}

export function buildClosureMetadataMutationPlanV1(
  checkpoint: SmokeEvidenceCheckpointV1,
  closureIdentity: Task545ClosureIdentity,
  options: ClosurePlanOptionsV1
): Promise<ClosureMetadataMutationPlanV1>;

export function writeOrResumeOrderedDurableChangelogFileThenIndexV1(
  options: OrderedDurableWriterOptionsV1
): Promise<Task545ClosureIdentity & { readonly durableState: "both" }>;

export function validateMetadataOnlyClosureDelta(
  checkpoint: SmokeEvidenceCheckpointV1,
  closureIdentity: Task545ClosureIdentity,
  repoRoot: string
): Promise<VerifiedTask545MetadataRecoveryDelta>;

export function buildExactClosureMetadataAllowlist(options: {
  readonly frozenContract: SmokeEvidenceClosureContractV1;
  readonly pinnedChangelogPath: `_docs/_CHANGELOG/${string}.md`;
  readonly closureUtcDate: CanonicalUtcDate;
}): Set<string>;

export function runClosureDeltaCli(argv: readonly string[]): Promise<void>;

// Re-export the consumed resume discriminant so callers of the thin surface
// never need a second import path for the closure contract.
export type { Task545ClosureResume, VerifiedTask545Checkpoint };
