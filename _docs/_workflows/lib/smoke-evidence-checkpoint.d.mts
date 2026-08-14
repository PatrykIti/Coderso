// Type declarations for _docs/_workflows/lib/smoke-evidence-checkpoint.mjs
// (single owner: TASK-545-03-L03). Covers the checkpoint/closure types and
// the four public entry points plus the owner-side supplemental helper. The
// runtime file is valid plain JavaScript; consumers import the exact owner
// types from ./lib/smoke-evidence-checkpoint.mjs (or the thin re-export on
// ./lib/smoke-evidence.mjs) without local substitutes. `TaskId`,
// `CanonicalUtcDate`, and `PublicWorkingTreeRevision` are structurally loose
// aliases: runtime grammar is enforced by the strict schema/validators, and
// literal-type fields (schemaVersion, profile, state, durableState,
// pinnedChangelogPath) reject widened shapes at the type boundary.

export type TaskId = string;
export type SmokeProfile = "fast" | "certification";
export type CanonicalUtcDate = string; // runtime-validated YYYY-MM-DD
export type PublicWorkingTreeRevision = Readonly<{
  gitHead: string;
  workingTreeDirty: boolean;
  workingTreeSha256: string;
}>;
export type SmokeEvidenceOwnerRole = "author-audit" | "implement" | "fix";
export type SmokeEvidenceDurableState = "none" | "file-only" | "both";

export interface SmokeEvidenceCheckpointV1 {
  readonly schemaVersion: 1;
  readonly taskId: TaskId;
  readonly suiteId: string;
  readonly profile: SmokeProfile;
  readonly session: string;
  readonly runId: string;
  readonly workflowEntry: string;
  readonly evidenceDirectory: string;
  readonly manifestSha256: string;
  readonly evidenceFiles: readonly Readonly<{ path: string; sha256: string }>[];
  readonly frozenRuntime: PublicWorkingTreeRevision;
  readonly closureContract: SmokeEvidenceClosureContractV1;
  readonly phase1: Readonly<{
    state: "owner_review_required";
    generatedAt: string;
  }>;
}

declare const verifiedTask545Checkpoint: unique symbol;
export type VerifiedTask545Checkpoint = Readonly<
  SmokeEvidenceCheckpointV1 & { [verifiedTask545Checkpoint]: true }
>;

export interface Task545ClosureIdentity {
  readonly taskId: TaskId;
  readonly suiteId: string;
  readonly profile: SmokeProfile;
  readonly session: string;
  readonly runId: string;
  readonly checkpointSha256: string;
  readonly changelogNumber: number;
  readonly changelogSlug: string;
  readonly closureUtcDate: CanonicalUtcDate;
  readonly pinnedChangelogPath: `_docs/_CHANGELOG/${string}.md`;
  readonly durableState: SmokeEvidenceDurableState;
}

export interface VerifiedTask545MetadataRecoveryDelta {
  readonly pass: true;
  readonly taskId: TaskId;
  readonly runId: string;
  readonly closureMetadataRevision: PublicWorkingTreeRevision;
  readonly changedPaths: readonly string[];
}

export interface SmokeEvidenceClosureContractV1 {
  readonly taskFiles: readonly string[];
  readonly supplementalTaskFiles: readonly string[];
  readonly taskIndex: "_docs/_TASKS/README.md";
  readonly changelogIndex: "_docs/_CHANGELOG/README.md";
  readonly changelogNumber: number;
  readonly changelogSlug: string;
}

export type Task545ClosureResume =
  | Readonly<{
      state: "frozen";
      checkpoint: VerifiedTask545Checkpoint;
      closureIdentity: Task545ClosureIdentity & { durableState: "none" };
    }>
  | Readonly<{
      state: "metadata_recovery";
      checkpoint: VerifiedTask545Checkpoint;
      closureIdentity: Task545ClosureIdentity & { durableState: "file-only" | "both" };
      delta: VerifiedTask545MetadataRecoveryDelta;
    }>;

export interface SmokeEvidenceOwnerOptions {
  readonly repoRoot: string;
  readonly expectedTask: string;
  readonly expectedWorkflowRole: SmokeEvidenceOwnerRole;
  readonly executingImportMetaUrl: string;
}

export interface SmokeEvidenceResumeOptions extends SmokeEvidenceOwnerOptions {
  readonly checkpointPath: string;
  readonly checkpointSha256: string;
  readonly runId: string;
  readonly expectedSession: string;
}

export interface SmokeEvidenceCreateOptions {
  readonly repoRoot: string;
  readonly expectedTask: string;
  readonly pinnedChangelogNumber: number;
  readonly pinnedChangelogSlug: string;
  readonly expectedWorkflowRole: SmokeEvidenceOwnerRole;
  readonly executingImportMetaUrl: string;
  readonly expectedSuite: string;
  readonly expectedProfile: SmokeProfile;
  readonly expectedSession: string;
  readonly runtimeResult: Readonly<Record<string, unknown>>;
}

export interface OwnerActionRequiredPayload {
  readonly pass: false;
  readonly code: "owner_action_required";
  readonly action: "review_and_stage_evidence";
  readonly taskId: string;
  readonly evidenceDirectory: string;
  readonly checkpointPath: string;
  readonly checkpointSha256: string;
  readonly runId: string;
  readonly resumeArgv: readonly string[];
  readonly resumeCommand: string;
  readonly frozenRuntimeRevision: PublicWorkingTreeRevision;
}

export interface TrackedEvidencePass {
  readonly pass: true;
  readonly code: "tracked_evidence_ok";
  readonly taskId: string;
  readonly suiteId: string;
  readonly profile: SmokeProfile;
  readonly session: string;
  readonly runId: string;
  readonly checkpointPath: string;
  readonly checkpointSha256: string;
  readonly frozenRuntimeRevision: PublicWorkingTreeRevision;
}

export function requireTaskBoundOwningWorkflow(options: SmokeEvidenceOwnerOptions): Promise<string>;
export function resolveOwnerControlledSupplementalClosureTaskFiles(
  repoRoot: string,
  expectedTask: string
): Promise<readonly string[]>;
export function createResumeCheckpoint(options: SmokeEvidenceCreateOptions): Promise<OwnerActionRequiredPayload>;
export function resumeTrackedEvidence(options: SmokeEvidenceResumeOptions): Promise<TrackedEvidencePass>;
export function openWorkflowClosureResume(options: SmokeEvidenceResumeOptions): Promise<Task545ClosureResume>;
