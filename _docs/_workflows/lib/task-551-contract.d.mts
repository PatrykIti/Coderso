// Type declarations for _docs/_workflows/lib/task-551-contract.mjs
// (single owner: TASK-551-11 sidecar). Provenance allowlists, command
// materialization, durable evidence manifest, recovery classification, and
// the no-replace durable writer.

export interface Task551PhaseProvenanceEntry {
  readonly phase: string;
  readonly taskId: string;
  readonly ownedFiles: readonly string[];
  readonly ownedTests: readonly string[];
  readonly readOnlyImports: readonly string[];
  readonly materializedWorktreeOutputs: readonly string[];
  readonly ephemeralPostOperationOutputs: readonly string[];
}

export type Task551LowercaseSha256 = string;
export type Task551PrefixedSha256 = `sha256:${string}`;
export type Task551PhaseId = "sidecar" | "l01" | "l03" | "l04" | "l02" | "05-l02";
export interface Task551DeferredLiteralTargetV1 {
  readonly id: "l03-bootstrap" | "l04-bootstrap" | "l02-persistence" | "l02-owner-host" | "05-l02-predecessor";
  readonly path: string;
  readonly eligibleAfter: "l03-closure" | "l04-closure" | "l02-code-test-materialization" | "05-l02-predecessor-seam";
  readonly seam: string;
}
export interface Task551WorkflowCompatibilityReceiptV2 {
  readonly schema: "coderso.task551.workflow-compatibility-bootstrap@v2";
  readonly phase: "compatibility-bootstrap";
  readonly descriptorSchema: "coderso.task551.workflow-capability-descriptor@v2";
  readonly sidecarClosureSha256: Task551LowercaseSha256;
  readonly sidecarPaths: readonly string[];
  readonly plannedBunPaths: readonly string[];
  readonly l02Subgates: readonly ["classifier-materialization", "reviewed-pair-transition"];
  readonly workflowPrerequisite: "TASK-551-11:compatibility-bootstrap@v2";
  readonly l04Phase: true;
}
declare const task551WorkflowCompatibilityAdmissionBrand: unique symbol;
export type Task551WorkflowCompatibilityAdmissionV2 = Readonly<{
  readonly [task551WorkflowCompatibilityAdmissionBrand]: true;
}>;
export type Task551NamedPhaseClosureV2<
  Phase extends Task551PhaseId = Task551PhaseId,
> = Readonly<{
  readonly schema: "coderso.task551.named-phase-closure@v2";
  readonly phase: Phase;
  readonly taskId: string;
  readonly taskGraphDigest: Task551LowercaseSha256;
  readonly files: readonly Task551PathDigestV1[];
}>;
export type Task551L02CodeTestMaterializationClosureV1 = Readonly<{
  readonly schema: "coderso.task551.l02-code-test-materialization-closure@v1";
  readonly phase: "l02-code-test-materialization";
  readonly taskId: "TASK-551-01-L02";
  readonly taskGraphDigest: Task551LowercaseSha256;
  readonly files: readonly Task551PathDigestV1[];
}>;
export interface Task551L03ClosureProjectionV2 {
  readonly identity: Readonly<{
    schema: string;
    taskId: string;
    checkRecordSchema: string;
    checkMode: string;
    checkMarkerCount: number;
    checkTargetProof: string;
    checkNoLeak: boolean;
  }>;
  readonly toolContractDigest: Task551PrefixedSha256;
}
export interface Task551L04ClosureProjectionV2 {
  readonly schema: "coderso.task551.freeze-candidate-generation-bootstrap@v2";
  readonly version: 2;
  readonly generationId: "task551-freeze-candidate-generation-v2";
  readonly archive: Readonly<{
    path: "tests/perf/task551DatabaseBaseline/freezeReceipts.ts";
    sha256: "17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f";
  }>;
  readonly state: "awaiting-small";
}
declare const task551L02ClosureProjectionBrand: unique symbol;
/** L11-internal projection; its registration hook is deliberately not declared. */
export type Task551L02ClosureProjectionV2 = Readonly<{
  readonly [task551L02ClosureProjectionBrand]: true;
}>;
export type Task551L02SubgateKindV1 =
  "classifier-materialization" | "reviewed-pair-transition";
export type Task551L02ClassifierMaterializationSubgateV1 = Readonly<{
  readonly id: "l11-classifier-materialization";
  readonly kind: "classifier-materialization";
  readonly ordinal: 1;
  readonly ownerTaskId: "TASK-551-11";
  readonly occurrenceId: "single";
  readonly afterCommandIds: readonly [
    "projection-static-test",
    "digest-static-test",
    "fixture-target-static-test",
    "reviewed-pair-persistence-static-test",
    "runner-lifecycle-static-test",
  ];
  readonly beforeCommandId: "core-lint-types";
  readonly barrier: Readonly<{
    exactFourTestPrerequisite: true;
    classifierManifestDeltaPath: "tests/bun-lane-manifest.json";
    exactNinePathManifestMembershipPostchecks: true;
    currentByteState: true;
  }>;
}>;
export type Task551L02ReviewedPairTransitionSubgateV1 = Readonly<{
  readonly id: "l11-reviewed-pair-transition";
  readonly kind: "reviewed-pair-transition";
  readonly ordinal: 2;
  readonly ownerTaskId: "TASK-551-11";
  readonly occurrenceId: "single";
  readonly afterCommandIds: readonly [
    "projection-static-test",
    "digest-static-test",
    "fixture-target-static-test",
    "reviewed-pair-persistence-static-test",
    "runner-lifecycle-static-test",
    "core-lint-types",
    "core-lint",
    "performance-gate",
    "isolated-projection-static-small",
    "isolated-digest-static-small",
    "isolated-projection-static-large",
    "isolated-digest-static-large",
    "freeze-small",
    "freeze-large",
  ];
  readonly beforeCommandId: "check-small";
  readonly barrier: Readonly<{
    validatedSnapshotRegistrationHook: "registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition";
    publicTransition: "runL02OwnedReviewedTransition";
    activeStateTransitionReceiptSchema: "coderso.task551.l02-active-state-transition-receipt@v2";
    activeStateTransitionReceiptNormalizer: "parseTask551L02ActiveStateTransitionReceiptV2";
    reviewedStateAttestationNormalizer: "parseTask551L02ReviewedStateAttestationV2";
    inMemoryExpectedStateDigestRebase: true;
    l02CodeTestMaterializationClosure: "coderso.task551.l02-code-test-materialization-closure@v1";
    materializationClosureTiming: "after-l04-adaptation-before-single";
    finalLeafClosureTiming: "after-check-small-and-check-large";
    sourceFree: true;
    zeroCheckDispatchesOnFailure: true;
  }>;
}>;
export type Task551L02RequiredSubgateV1 =
  | Task551L02ClassifierMaterializationSubgateV1
  | Task551L02ReviewedPairTransitionSubgateV1;
export type Task551L02WorkflowCompatibilityExtensionsV1 = Readonly<{
  readonly workflowPrerequisites: readonly [
    "TASK-551-11:compatibility-bootstrap@v2",
  ];
  readonly subgates: typeof TASK551_L02_REQUIRED_SUBGATES;
}>;
export interface Task551PathDigestV1 {
  readonly path: string;
  readonly sha256: Task551LowercaseSha256;
}
export interface Task551CurrentWorktreeFileV1 extends Task551PathDigestV1 {
  readonly kind: "regular" | "symlink";
}
export interface Task551CurrentWorktreeSnapshotV1 {
  readonly taskGraphDigest: Task551LowercaseSha256;
  readonly taskFileDigests: readonly Task551PathDigestV1[];
  readonly predecessorDigests: readonly Task551PathDigestV1[];
  readonly activeDigests: readonly Task551PathDigestV1[];
}
export interface Task551CurrentWorktreeV1 {
  readonly taskGraphDigest: Task551LowercaseSha256;
  readonly taskFileDigests: readonly Task551PathDigestV1[];
  readonly files: readonly Task551CurrentWorktreeFileV1[];
  readonly discoveredByPhase: Readonly<Record<string, readonly string[]>>;
  readonly closedByPhase: Readonly<Record<string, readonly string[]>>;
  readonly deltaPaths: readonly string[];
}

/** Redacted static-command result accepted by the L11 classifier barrier. */
export interface Task551L11BarrierReceiptV1 {
  readonly id: string;
  readonly argv: readonly string[];
  readonly exitCode: number;
  readonly signalCode: null;
  readonly timedOut: false;
  readonly overflowed: false;
  readonly discoveredTestCount: number | null;
  /** Canonical digest of the redacted current-worktree snapshot exercised. */
  readonly worktreeDigest: Task551LowercaseSha256;
}
export interface Task551L11PostGeneratorBarrierReceiptV1 extends Task551L11BarrierReceiptV1 {
  readonly manifestSha256: Task551LowercaseSha256;
}
/** Redacted acceptance binding for the canonical durable L03 check evidence. */
export interface Task551L11L03EvidenceProofV1 {
  readonly path: string;
  readonly schema: string;
  readonly phase: "l03-check";
  readonly taskId: "TASK-551-01-L03";
  readonly accepted: true;
  /** Durable writer receipt: `sha256:` followed by a nonzero lowercase SHA-256. */
  readonly acceptedEvidenceDigest: Task551PrefixedSha256;
  /** Canonical L03 predecessor-plus-active snapshot digest, before narrow L02 inputs. */
  readonly worktreeDigest: Task551LowercaseSha256;
}
/** Exact non-secret `--check` record nested under durable L03 evidence. */
export interface Task551L03BootstrapCheckProducerV1 {
  readonly schema: "coderso.task551.fixture-bootstrap-check@v1";
  readonly taskId: "TASK-551-01-L03";
  readonly mode: "check";
  readonly pass: true;
  readonly markerCount: 1;
  readonly targetProof: "current-database-and-single-marker";
  readonly noLeak: true;
  readonly toolContractDigest: Task551PrefixedSha256;
}
/** Strict current-byte fence used before each L02 prefix test process can launch. */
export interface Task551L01PreClassifierBarrierInputV1 {
  readonly auditSnapshot: Task551CurrentWorktreeSnapshotV1;
  readonly currentWorktree: Task551CurrentWorktreeV1;
  readonly l03EvidenceProof: Task551L11L03EvidenceProofV1;
}
export interface Task551L01PreClassifierBarrierStateV1 {
  readonly taskGraphDigest: Task551LowercaseSha256;
  readonly taskFileDigests: readonly Task551PathDigestV1[];
  readonly beforeWorktreeDigest: Task551LowercaseSha256;
  readonly l03WorktreeSnapshotDigest: Task551LowercaseSha256;
  readonly l03EvidenceProof: Task551L11L03EvidenceProofV1;
  readonly l03ActiveSnapshot: Task551CurrentWorktreeSnapshotV1;
  readonly l04ActiveSnapshot: Task551CurrentWorktreeSnapshotV1;
}
export interface Task551L11MaterializedManifestV1 {
  readonly path: "tests/bun-lane-manifest.json";
  readonly sha256: Task551LowercaseSha256;
  readonly task551Paths: readonly string[];
}
export interface Task551L01MaterializationBarrierInputV1 {
  readonly auditSnapshot: Task551CurrentWorktreeSnapshotV1;
  readonly beforeClassifierWorktree: Task551CurrentWorktreeV1;
  readonly afterClassifierWorktree: Task551CurrentWorktreeV1;
  readonly fourTestReceipt: Task551L11BarrierReceiptV1;
  readonly classifierReceipt: Task551L11BarrierReceiptV1;
  readonly manifest: Task551L11MaterializedManifestV1;
  readonly postGeneratorReceipts: readonly Task551L11PostGeneratorBarrierReceiptV1[];
  readonly l03EvidenceProof: Task551L11L03EvidenceProofV1;
}
export interface Task551L01MaterializationBarrierStateV1 {
  readonly taskGraphDigest: Task551LowercaseSha256;
  readonly taskFileDigests: readonly Task551PathDigestV1[];
  readonly beforeWorktreeDigest: Task551LowercaseSha256;
  readonly afterWorktreeDigest: Task551LowercaseSha256;
  readonly l03WorktreeSnapshotDigest: Task551LowercaseSha256;
  readonly l03EvidenceProof: Task551L11L03EvidenceProofV1;
  readonly l03ActiveSnapshot: Task551CurrentWorktreeSnapshotV1;
  readonly l04ActiveSnapshot: Task551CurrentWorktreeSnapshotV1;
  readonly l01ActiveSnapshot: Task551CurrentWorktreeSnapshotV1;
  readonly l02PredecessorSnapshot: Task551CurrentWorktreeSnapshotV1;
  readonly manifest: Task551L11MaterializedManifestV1;
}

export interface Task551EvidenceManifestRow {
  readonly path: string;
  readonly schema: string;
  readonly phase: string;
  readonly profile?: string;
  readonly keys: readonly string[];
}

export interface Task551EvidenceDescriptorNode {
  readonly kind: string;
  readonly keys?: readonly string[];
  readonly fields?: Readonly<Record<string, Task551EvidenceDescriptorNode>>;
}

export interface Task551EvidenceValueDescriptor {
  readonly manifestRow: Task551EvidenceManifestRow;
  readonly path: string;
  readonly expectedTaskId: string;
  readonly keys: readonly string[];
  readonly root: Task551EvidenceDescriptorNode;
  readonly result: Task551EvidenceDescriptorNode | null;
  readonly maxDepth: number;
  readonly maxNodes: number;
  readonly maxItems: number;
  readonly maxUtf8Bytes: number;
  readonly maxDocumentUtf8Bytes: number;
}

export interface Task551TerminalHeadFileV1 {
  readonly path: string;
  readonly tracked: true;
  readonly kind: "regular";
  readonly bytes: Uint8Array;
}

export interface Task551TerminalCurrentTreeFileV1 extends Task551TerminalHeadFileV1 {
  readonly dirty: false;
  readonly replaced: false;
}

export interface Task551TerminalCommittedHeadHandoffInputV1 {
  readonly sourceHead: string;
  readonly terminalHead: string;
  readonly terminalParentHead: string;
  readonly commitBChangedPaths: readonly string[];
  readonly terminalHeadFiles: readonly Task551TerminalHeadFileV1[];
  readonly currentTreeFiles: readonly Task551TerminalCurrentTreeFileV1[];
}

export interface Task551RecoverySummary {
  readonly clear: boolean;
  readonly rows: readonly Readonly<{
    rowId: Task551EvidenceRowId;
    terminalResult: string;
    telemetry: string;
  }>[];
  readonly blockers: readonly Readonly<{
    scope: "global-root" | "row";
    code: "task551_evidence_recovery_blocked_foreign_entry" | "task551_evidence_recovery_blocked";
    rowId?: Task551EvidenceRowId;
  }>[];
}

/** Minimal Bun.spawn-shaped child contract shared by the workflow modules. */
export interface Task551ChildProcess {
  readonly pid: number;
  readonly exited: Promise<number>;
  readonly stdout: AsyncIterable<Uint8Array>;
  readonly stderr: AsyncIterable<Uint8Array>;
  readonly signalCode?: string | null;
}

export const TASK551_CANONICAL_EVIDENCE_ROOT: string;
export const TASK551_PARENT_IMPL_FILE: string;
export const TASK551_TERMINAL_HANDOFF_PATHS: readonly string[];

export const TASK551_PHASE_PROVENANCE: readonly Task551PhaseProvenanceEntry[];

export const TASK551_PHASE_IMPORT_CLOSURE: ReadonlyMap<string, readonly string[]>;
export const TASK551_PHASE_DISCOVERY_ALLOWLIST: ReadonlyMap<string, readonly string[]>;
export const TASK551_PHASE_CLOSED_ALLOWLIST: ReadonlyMap<string, readonly string[]>;
export const TASK551_PHASE_VALIDATION_PATHS: ReadonlyMap<string, readonly string[]>;
export const TASK551_PHASE_OWNED_CODE_TEST_PATHS: ReadonlyMap<string, readonly string[]>;
export const TASK551_PHASE_LINE_COUNT_PATHS: ReadonlyMap<string, readonly string[]>;
export const TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS: ReadonlyMap<string, readonly string[]>;
export const TASK551_PHASE_EPHEMERAL_POST_OPERATION_OUTPUTS: ReadonlyMap<string, readonly string[]>;
export const TASK551_PHASE_MATERIALIZED_WORKTREE_CLOSURE: ReadonlyMap<string, readonly string[]>;
export const TASK551_PHASE_RUNTIME_OUTPUTS: ReadonlyMap<string, readonly string[]>;

export function deriveTask551ClosedWorktreeSet(phases: readonly string[]): string[];
export const TASK551_L01_MATERIALIZATION_WORKTREE_PHASES: readonly ["l01"];
export function deriveTask551L01MaterializationClosedSet(): string[];
export function getTask55105L02Provenance(): Task551PhaseProvenanceEntry | undefined;
export function getTask55105L02ValidationPaths(): readonly string[] | undefined;
export function getTask55105L02LineCountPaths(): readonly string[] | undefined;
export const TASK551_05_L02_PROVENANCE: Task551PhaseProvenanceEntry | undefined;
export const TASK551_05_L02_VALIDATION_PATHS: readonly string[] | undefined;
export const TASK551_05_L02_LINE_COUNT_PATHS: readonly string[] | undefined;
export const TASK551_DEFERRED_LITERAL_TARGETS: readonly Task551DeferredLiteralTargetV1[];
export const TASK551_DEFERRED_LITERAL_TARGET_PATHS: readonly string[];

export function normalizeTask551RepoPath(input: string): string;
export function requireTask551LiteralUniquePaths(
  paths: readonly string[],
  label: string
): string[];
export function requireTask551ContractIntegrity(): boolean;
export function task551DependenciesThrough(phase: string): readonly string[];
export function task551FullProvenanceClosureForSpawn(phase: string): readonly string[];
export function requireExactDiscoveredPaths(
  discovered: readonly unknown[],
  allowlist: ReadonlyMap<string, readonly string[]> | readonly unknown[],
  phase: string
): void;
export function requireExactClosedPaths(
  materialized: readonly unknown[],
  allowlist: ReadonlyMap<string, readonly string[]> | readonly unknown[],
  phase: string
): void;
export function task551TaskGraphDigest(taskFileDigests: readonly Task551PathDigestV1[]): string;
export function task551CurrentWorktreeDigest(current: Task551CurrentWorktreeV1): string;
export function task551L11BarrierCurrentWorktreeDigest(current: Task551CurrentWorktreeV1): string;
export function task551WorktreeSnapshotDigest(snapshot: Task551CurrentWorktreeSnapshotV1): string;
export function task551L11BarrierSnapshotDigest(snapshot: Task551CurrentWorktreeSnapshotV1): string;
export function createTask551TaskGraphSnapshot(
  taskFileDigests: readonly Task551PathDigestV1[]
): Task551CurrentWorktreeSnapshotV1;
export function requireTaskFilesAndGraphBytesEqual(
  taskFileDigests: readonly Task551PathDigestV1[],
  taskGraphDigest: string,
  current: Task551CurrentWorktreeV1
): boolean;
export const TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS: readonly string[];
export const TASK551_PLANNED_BUN_PATHS: readonly string[];
export const TASK551_L02_SUBGATE_KINDS: readonly [
  "classifier-materialization",
  "reviewed-pair-transition",
];
export const TASK551_L02_REQUIRED_SUBGATES: readonly [
  Task551L02ClassifierMaterializationSubgateV1,
  Task551L02ReviewedPairTransitionSubgateV1,
];
export const TASK551_WORKFLOW_COMPATIBILITY_RECEIPT_SCHEMA: "coderso.task551.workflow-compatibility-bootstrap@v2";
export const TASK551_WORKFLOW_CAPABILITY_DESCRIPTOR_SCHEMA: "coderso.task551.workflow-capability-descriptor@v2";
export const TASK551_WORKFLOW_COMPATIBILITY_PREREQUISITE: "TASK-551-11:compatibility-bootstrap@v2";
export function runTask551WorkflowCompatibilityBootstrapV2(): Task551WorkflowCompatibilityReceiptV2;
export function admitTask551WorkflowCompatibilityAuthorAuditV2(
  receipt: unknown,
  operation: (
    complete: () => Task551WorkflowCompatibilityAdmissionV2,
  ) => unknown,
): Task551WorkflowCompatibilityAdmissionV2;
export function admitTask551WorkflowCompatibilityGraphV2(
  receipt: unknown,
  authorAuditResult: unknown,
  operation: (
    complete: () => Task551WorkflowCompatibilityAdmissionV2,
  ) => unknown,
): Task551WorkflowCompatibilityAdmissionV2;
export function admitTask551WorkflowCompatibilityL02V2(
  receipt: unknown,
  graphResult: unknown,
  operation: (
    complete: () => Task551WorkflowCompatibilityAdmissionV2,
  ) => unknown,
): Task551WorkflowCompatibilityAdmissionV2;
export function requireTask551WorktreeCompatibilityIntegrity(): true;
export function createTask551NamedPhaseClosureV2<Phase extends Task551PhaseId>(
  phaseId: Phase,
  currentWorktree: Task551CurrentWorktreeV1,
): Task551NamedPhaseClosureV2<Phase>;
export function requireTask551NamedPhaseClosureV2<Phase extends Task551PhaseId>(
  value: unknown,
  phaseId: Phase,
  currentWorktree?: Task551CurrentWorktreeV1 | null,
): Task551NamedPhaseClosureV2<Phase>;
export function createTask551L02CodeTestMaterializationClosureV1(
  currentWorktree: Task551CurrentWorktreeV1,
): Task551L02CodeTestMaterializationClosureV1;
export function requireTask551L02CodeTestMaterializationClosureV1(
  value: unknown,
  currentWorktree?: Task551CurrentWorktreeV1 | null,
): Task551L02CodeTestMaterializationClosureV1;
export function requireTask551L02WorkflowCompatibilityExtensions(
  descriptor: unknown,
): Task551L02WorkflowCompatibilityExtensionsV1;
export function requirePhaseReadOnlyImportsInCurrentWorktree(
  phase: string,
  current: Task551CurrentWorktreeV1
): boolean;
export function requireNoForeignPathOrByteDrift(
  snapshot: Task551CurrentWorktreeSnapshotV1,
  current: Task551CurrentWorktreeV1,
  allowedPaths: readonly string[]
): boolean;
export function captureTask551PreSpawnWorktreeSnapshot(
  phase: string,
  auditSnapshot: Task551CurrentWorktreeSnapshotV1,
  current: Task551CurrentWorktreeV1
): Task551CurrentWorktreeSnapshotV1;
export function captureTask551MaterializedWorktreeSnapshot(
  phase: string,
  predecessorSnapshot: Task551CurrentWorktreeSnapshotV1,
  current: Task551CurrentWorktreeV1
): Task551CurrentWorktreeSnapshotV1;
export function requireTask551PredecessorWorktreeSnapshotBeforeSpawn(
  phase: string,
  snapshot: Task551CurrentWorktreeSnapshotV1,
  current: Task551CurrentWorktreeV1
): boolean;
export function requireExactActivePhaseSnapshotBeforeSpawn(
  phase: string,
  activeDigests: readonly Task551PathDigestV1[],
  current: Task551CurrentWorktreeV1,
  snapshot?: Task551CurrentWorktreeSnapshotV1 | null
): boolean;
export function captureTask551L01PreClassifierBarrier(
  input: Task551L01PreClassifierBarrierInputV1
): Task551L01PreClassifierBarrierStateV1;
export function captureTask551L01MaterializationBarrier(
  input: Task551L01MaterializationBarrierInputV1
): Task551L01MaterializationBarrierStateV1;
export function requireTask551L01MaterializationBarrierBeforeL02(
  state: Task551L01MaterializationBarrierStateV1,
  currentWorktree: Task551CurrentWorktreeV1
): boolean;
export function adaptTask551L03ClosureV2(
  closure: unknown,
  currentWorktree?: Task551CurrentWorktreeV1 | null,
): Promise<Task551L03ClosureProjectionV2>;
export function adaptTask551L04ClosureV2(
  closure: unknown,
  currentWorktree?: Task551CurrentWorktreeV1 | null,
): Promise<Task551L04ClosureProjectionV2>;
export function adaptTask551L02ClosureV2(
  closure: unknown,
  currentWorktree?: Task551CurrentWorktreeV1 | null,
): Promise<Task551L02ClosureProjectionV2>;
export function recordTask551L02MaterializationForWorkflow(
  permit: unknown,
  graphDigest: string,
  currentWorktree: Task551CurrentWorktreeV1,
): Task551L02CodeTestMaterializationClosureV1;
export function requireTask551RecordedL02MaterializationForWorkflow(
  permit: unknown,
  graphDigest: string,
): Task551L02CodeTestMaterializationClosureV1;
export function readTask55105L02PredecessorAtNamedSeam(
  closure: unknown,
  l02Materialization: unknown,
  currentWorktree: Task551CurrentWorktreeV1,
): Promise<Task55105L02PredecessorSeamV1>;
export function prepareTask55105L02PredecessorEvidenceAtNamedSeam(
  permit: unknown,
  graphDigest: string,
  currentWorktree: Task551CurrentWorktreeV1,
  privateL02Materialization?: Task551L02CodeTestMaterializationClosureV1 | null,
): Promise<Task55105L02PredecessorSeamV1>;
export function buildTask55105L02PromotionAtNamedSeam(
  predecessor: unknown,
  commitA: unknown,
  predecessorReceipt: unknown,
): Task55105L02PromotionSeamV1;

export const TASK551_PROFILE_VALUES: readonly ["small", "large"];
export const TASK551_CHILD_TIMEOUT_MS: number;
export const TASK551_CHILD_MAX_OUTPUT_BYTES: number;
export const TASK551_CHILD_KILL_GRACE_MS: number;
export const TASK551_CHILD_DIAGNOSTIC_MAX_BYTES: number;
export const TASK551_CHILD_FAILURE_CODES: Readonly<
  Record<
    | "stdout_reader"
    | "stderr_reader"
    | "reducer"
    | "parser"
    | "timeout"
    | "overflow"
    | "abort"
    | "spawn",
    string
  >
>;

export const TASK551_DURABLE_EVIDENCE_MANIFEST: readonly Task551EvidenceManifestRow[];
export type Task551EvidenceRowId =
  | "l03Initialize" | "l03Check" | "l02StaticSmall" | "l02StaticLarge"
  | "l02FreezeCandidateSmall" | "l02FreezeCandidateLarge" | "l02ReviewedCandidates"
  | "l02CheckSmall" | "l02CheckLarge" | "task489Predecessor" | "task489PredecessorPromotion";
export type Task551EvidenceFaultPlanV1 = readonly Readonly<{
  operationIndex: number;
  occurrence: number;
  operation: "open" | "stat" | "write" | "fsync" | "link" | "unlink";
}>[];
declare const task551CanonicalPredecessorValueBrand: unique symbol;
export type Task551CanonicalPredecessorValueV1 = Readonly<{
  readonly [task551CanonicalPredecessorValueBrand]: true;
}>;
export type Task551ImmutableEvidenceValue = Readonly<Record<string, unknown>>;
export type Task551EvidenceWriteValueV1 = Task551ImmutableEvidenceValue | Task551CanonicalPredecessorValueV1;
export interface Task551EvidenceWriteReceiptV1 {
  readonly path: string;
  readonly phase: string;
  readonly digest: Task551PrefixedSha256;
  readonly bytes: number;
  readonly action: "committed_no_replace" | "destination_eexist_race_committed";
}
export interface Task55105L02CommitARecordV1 {
  readonly sourceHead: string;
  readonly createdAt: string;
  readonly reviewedAt: string;
  readonly promotedAt: string;
  readonly ownerCapabilityReceiptDigest: Task551LowercaseSha256;
}
declare const task55105L02PredecessorTokenBrand: unique symbol;
export type Task55105L02PredecessorTokenV1 = Readonly<{
  readonly [task55105L02PredecessorTokenBrand]: true;
}>;
export interface Task55105L02PredecessorSeamV1 {
  readonly predecessorValue: Task551CanonicalPredecessorValueV1;
  readonly digest: Task551LowercaseSha256;
  readonly token: Task55105L02PredecessorTokenV1;
}
export interface Task55105L02PromotionSeamV1 {
  readonly predecessorValue: Task551CanonicalPredecessorValueV1;
  readonly sourceDigest: Task551LowercaseSha256;
  readonly promotionValue: Task551CanonicalPredecessorValueV1;
  readonly token: Task55105L02PredecessorTokenV1;
}
export const TASK551_EVIDENCE_ROW_IDS: readonly Task551EvidenceRowId[];
export const TASK551_EVIDENCE_MANIFEST_INDEX_BY_ROW_ID: Readonly<Record<Task551EvidenceRowId, number>>;
export const TASK551_EVIDENCE_VALUE_DESCRIPTORS: readonly Task551EvidenceValueDescriptor[];
export const TASK551_L10_PROJECTION_KEYS: readonly string[];
export const TASK551_L10_RESULT_FIELDS: Readonly<Record<string, readonly string[]>>;
export const TASK551_L10_PROJECTION_MATRIX: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
export const TASK551_CONSUMER_FIELDS: Readonly<Record<string, readonly string[]>>;

export function sha256Task551Bytes(bytes: Uint8Array): string;

export interface Task551L10EvidenceEnvelope {
  readonly consumer: "TASK-551-10-L01";
  readonly schema: string;
  readonly taskId: "TASK-551-11";
  readonly phase: string;
  readonly scenario: string;
  readonly profile: string | null;
  readonly status: "accepted";
  readonly result: Readonly<Record<string, unknown>> | null;
  readonly timestamp: string;
  readonly sourceHead: string;
  readonly sourceDigest: string;
  readonly noLeak: true | null;
  readonly predecessor: Readonly<Record<string, unknown>> | null;
  readonly promotion: Readonly<Record<string, unknown>> | null;
}

export function buildTask551L10EvidenceProjection(input: unknown): Task551L10EvidenceEnvelope;

export function recoverTask551EvidenceRoot(): Promise<Task551RecoverySummary>;
export function requireTask551EvidenceRecoveryClearBeforePhase(summary: unknown): true;
export function awaitTask551EvidenceRecoveryPreflightBeforePhase(): Promise<true>;

export function validateTask551EvidenceBytes(
  manifestRow: Task551EvidenceManifestRow,
  bytes: Uint8Array
): string | null;
export function validateTask551EvidenceValue(
  manifestRow: Task551EvidenceManifestRow,
  value: unknown
): string | null;
export function verifyTask551TerminalCommittedHeadHandoff(
  input: Task551TerminalCommittedHeadHandoffInputV1
): Promise<true>;
export function requireTask551EvidenceWriteReceiptDigest(
  manifestRowValue: unknown,
  value: unknown,
  receipt: unknown,
): true;
export function requireTask551TerminalEvidenceHandoffBinding(
  handoff: unknown,
  terminal: unknown,
  predecessorReceipt: unknown,
  promotionReceipt: unknown,
): true;

export function writeTask551EvidenceFileIfAbsent(
  rowId: Exclude<Task551EvidenceRowId, "task489Predecessor" | "task489PredecessorPromotion">,
  value: Task551ImmutableEvidenceValue
): Promise<Task551EvidenceWriteReceiptV1>;
export function writeTask551EvidenceFileIfAbsent(
  rowId: "task489Predecessor" | "task489PredecessorPromotion",
  value: Task551CanonicalPredecessorValueV1
): Promise<Task551EvidenceWriteReceiptV1>;
