// Type declarations for _docs/_workflows/lib/smoke-evidence.mjs (single owner:
// TASK-545-03-L01). Covers every runtime export consumed by strict TypeScript
// tests and by the runner-side visible-evidence entry point. The runtime file
// is valid plain JavaScript; consumers import the exact owner types from
// ./lib/smoke-evidence.mjs without local substitutes.

export const SMOKE_MANIFEST_SCHEMA_VERSION: 1;
export const SMOKE_CHECKPOINT_SCHEMA_VERSION: 1;
export const MAX_MANIFEST_BYTES: 1_048_576;
export const MAX_REPORT_BYTES: 1_048_576;
export const MAX_SCREENSHOT_BYTES: 8_388_608;
export const MAX_STRING_CHARS: 10_000;
export const MAX_PATH_CHARS: 2_048;
export const MIN_MANIFEST_SCENARIOS: 5;
export const MAX_SCENARIOS: 512;
export const MAX_VARIANTS_PER_SCENARIO: 64;
export const MAX_ASSERTIONS_PER_VARIANT: 256;
export const MAX_CONSOLE_ERRORS_PER_VARIANT: 64;
export const MAX_SCREENSHOTS_PER_SCENARIO: 128;

export class SmokeEvidenceError extends Error {
  constructor(code: string, label: string, detail: string);
  readonly name: "SmokeEvidenceError";
  code: string;
  label: string;
  detail: string;
}

export type SmokeProfile = "fast" | "certification";
export type SmokeSurface = "admin" | "public";
export type SmokeTheme = "light" | "dark";
export type SmokeAssertionKind = "computed-style" | "geometry" | "dom-state" | "aria";

export interface SmokeEvidenceScreenshotV1 {
  readonly path: string;
  readonly sha256: string;
}

export interface SmokeEvidenceAssertionV1 {
  readonly kind: SmokeAssertionKind;
  readonly target: string;
  readonly property: string;
  readonly expected: string;
  readonly actual: string;
  readonly pass: boolean;
}

export interface SmokeEvidenceVariantV1 {
  readonly id: string;
  readonly surface: SmokeSurface;
  readonly theme: SmokeTheme;
  readonly viewport: Readonly<{ width: number; height: number }>;
  readonly assertions: readonly SmokeEvidenceAssertionV1[];
  readonly consoleErrors: readonly string[];
}

// Persisted manifest scenario: no runtime-only `elapsedMs`, no scenario-level
// `pass` bit (pass is enforced separately against the runner report).
export interface SmokeEvidenceScenarioV1 {
  readonly id: string;
  readonly title: string;
  readonly variants: readonly SmokeEvidenceVariantV1[];
  readonly screenshots: readonly SmokeEvidenceScreenshotV1[];
}

// Report-side manifestable scenario: adds the runtime-only fields.
export interface ManifestableSmokeScenarioResult extends SmokeEvidenceScenarioV1 {
  readonly pass: true;
  readonly elapsedMs: number;
}

export interface SmokeEvidenceReportRefV1 {
  readonly path: string;
  readonly sha256: string;
}

export interface WorkingTreeRevisionV1 {
  readonly gitHead: string;
  readonly workingTreeDirty: boolean;
  readonly workingTreeSha256: string;
}

export interface SmokeEvidenceRecordV1 {
  readonly status: string;
  readonly path: string;
  readonly mode: string;
  readonly contentHash: string;
}

export interface WorkingTreeRevisionWithRecords extends WorkingTreeRevisionV1 {
  readonly records: readonly SmokeEvidenceRecordV1[];
}

export interface SmokeEvidenceManifestV1 {
  readonly schemaVersion: 1;
  readonly taskId: string;
  readonly suiteId: string;
  readonly profile: SmokeProfile;
  readonly session: string;
  readonly report: SmokeEvidenceReportRefV1;
  readonly revision: WorkingTreeRevisionV1;
  readonly generatedAt: string;
  readonly serverUp: true;
  readonly scenarios: readonly SmokeEvidenceScenarioV1[];
}

export interface SmokeEvidenceValidationResultV1 {
  readonly pass: true;
  readonly taskId: string;
  readonly suiteId: string;
  readonly profile: SmokeProfile;
  readonly session: string;
  readonly revision: WorkingTreeRevisionV1;
  readonly scenarios: number;
  readonly referencedFiles: readonly string[];
}

export interface SmokeEvidenceValidationOptions {
  readonly repoRoot: string;
  readonly expectedTask: string;
  readonly expectedSuite: string;
  readonly expectedProfile: SmokeProfile;
  readonly expectedSession: string;
  readonly expectedRevision: WorkingTreeRevisionV1;
}

export interface SmokeEvidenceAuditOptions extends SmokeEvidenceValidationOptions {
  readonly requireCheckpoint: boolean;
  readonly requireTracked: boolean;
  readonly requirePrivateEvidenceFiles?: boolean;
}

export interface SmokeEvidenceProjectInput {
  readonly taskId: string;
  readonly suiteId: string;
  readonly profile: SmokeProfile;
  readonly session: string;
  readonly reportPath: string;
  readonly reportSha256: string;
  readonly revision: WorkingTreeRevisionV1;
  readonly generatedAt: string;
  readonly report: Readonly<Record<string, unknown>>;
}

export function canonicalJson(value: unknown): string;
export function sha256(input: string | Uint8Array): string;
export function isLowercaseHex(value: unknown, length: number): value is string;
export function timingSafeEqualHex(actual: string, expected: string): boolean;
export function requireRepoTaskId(taskId: unknown): string;
export function requireRuntimeSmokeSessionName(session: unknown): string;
export function requireExactKeys(value: unknown, expected: readonly string[], label: string): Record<string, unknown>;
export function requireSafeRepoRelativePath(value: unknown, label: string): string;
export function validateStrictAssertion(value: unknown): SmokeEvidenceAssertionV1;
export function validateStrictVariant(value: unknown): SmokeEvidenceVariantV1;
export function validateStrictScreenshot(value: unknown): SmokeEvidenceScreenshotV1;
export function validateStrictManifestableScenario(value: unknown): ManifestableSmokeScenarioResult;
export function validateManifestScenario(value: unknown): SmokeEvidenceScenarioV1;
export function validateReportRef(value: unknown): SmokeEvidenceReportRefV1;
export function validateRevision(value: unknown): WorkingTreeRevisionV1;
export function validateGeneratedAt(value: unknown): string;
export function validateSmokeEvidenceManifest(value: unknown): SmokeEvidenceManifestV1;
export function projectManifestableScenarioWithoutElapsedMs(scenario: unknown): SmokeEvidenceScenarioV1;
export function uniqueScenarioScreenshotUnion(
  scenarios: readonly SmokeEvidenceScenarioV1[]
): readonly SmokeEvidenceScreenshotV1[];
export function requireCanonicalByteEquality(actual: unknown, expected: unknown, code: string, label: string): void;
export function requireEveryScenarioPassed(scenarios: readonly { readonly id: string; readonly pass: boolean }[]): void;
export function requireExactOrderedIds(
  actual: readonly { readonly id: string }[],
  expected: readonly { readonly id: string }[],
  label: string
): void;
export function requireManifestEqualsRunnerReport(manifest: SmokeEvidenceManifestV1, report: unknown): void;
export function requireRegisteredRuntimeSmokeIdentity(identity: {
  readonly suiteId: string;
  readonly profile: string;
  readonly session: string;
  readonly expectedSuite: string;
  readonly expectedProfile: string;
  readonly expectedSession: string;
}): void;
export function publicRevision(revision: WorkingTreeRevisionV1): WorkingTreeRevisionV1;
export function revisionEquals(left: WorkingTreeRevisionV1, right: WorkingTreeRevisionV1): boolean;
export function isStrictDescendant(root: string, candidate: string): boolean;
export function requireRealGitTopLevel(repoRoot: string): Promise<string>;
export function resolveCanonicalEvidenceDirectory(repoRoot: string, expectedTask: string, expectedSession: string): Promise<string>;
export function readExactGitHead(repoRoot: string): Promise<string>;
export function readPorcelainRecords(
  repoRoot: string,
  options?: { readonly includeUntracked?: boolean }
): Promise<readonly { readonly status: string; readonly path: string }[]>;
export function canonicalStatusRecords(
  records: readonly { readonly status: string; readonly path: string }[],
  options?: { readonly repoRoot: string; readonly excludeStrictDescendant?: string }
): Promise<readonly SmokeEvidenceRecordV1[]>;
export function canonicalRevisionStream(
  gitHead: string,
  records: readonly { readonly status: string; readonly path: string }[],
  options?: { readonly repoRoot: string; readonly excludeStrictDescendant?: string }
): Promise<string>;
export function computeWorkingTreeRevision(
  repoRoot: string,
  expectedTask: string,
  expectedSession: string
): Promise<WorkingTreeRevisionWithRecords>;
export function validateSmokeEvidence(options: SmokeEvidenceValidationOptions): Promise<SmokeEvidenceValidationResultV1>;
export function enumerateRegularFilesNoSymlinks(dir: string): Promise<readonly string[]>;
export function sameSortedPaths(left: readonly string[], right: readonly string[]): boolean;
export function auditSmokeEvidenceDirectory(options: SmokeEvidenceAuditOptions): Promise<SmokeEvidenceValidationResultV1>;
export function readCanonicalSmokeEvidenceReport(input: {
  readonly repoRoot: string;
  readonly expectedTask: string;
  readonly expectedSession: string;
}): Promise<{ readonly report: Readonly<Record<string, unknown>>; readonly sha256: string }>;
export function projectSmokeEvidenceManifest(input: SmokeEvidenceProjectInput): SmokeEvidenceManifestV1;
export function writeSmokeEvidenceManifest(input: {
  readonly repoRoot: string;
  readonly expectedTask: string;
  readonly expectedSession: string;
  readonly manifest: SmokeEvidenceManifestV1;
}): Promise<{ readonly path: string; readonly sha256: string }>;

// Thin re-export type surface for TASK-545-03-L03 (checkpoint/resume);
// mirrors the runtime re-export on smoke-evidence.mjs.
export {
  createResumeCheckpoint,
  openWorkflowClosureResume,
  requireTaskBoundOwningWorkflow,
  resumeTrackedEvidence,
} from "./smoke-evidence-checkpoint.mjs";
export type {
  SmokeEvidenceCheckpointV1,
  SmokeEvidenceClosureContractV1,
  Task545ClosureIdentity,
  Task545ClosureResume,
  VerifiedTask545Checkpoint,
  VerifiedTask545MetadataRecoveryDelta,
} from "./smoke-evidence-checkpoint.mjs";

// Thin re-export surface for TASK-545-03-L04 (closure metadata delta);
// mirrors the runtime re-export on smoke-evidence.mjs.
export {
  buildClosureMetadataMutationPlanV1,
  buildExactClosureMetadataAllowlist,
  runClosureDeltaCli,
  validateMetadataOnlyClosureDelta,
  writeOrResumeOrderedDurableChangelogFileThenIndexV1,
} from "./smoke-evidence-closure.mjs";
export type {
  ClosureDeltaCliSuccessV1,
  ClosureMetadataMutationPlanV1,
  ClosureMetadataMutationRecordV1,
  ChangelogIndexMutationV1,
  OrderedDurableWriterOptionsV1,
} from "./smoke-evidence-closure.mjs";

// Thin re-export surface for TASK-545-03-L05 (TASK-548 committed bootstrap
// gate); mirrors the runtime re-export on smoke-evidence.mjs.
export {
  TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1,
  normalizeTask548CommittedSixPathBootstrapReceiptV1,
  requireTask548CommittedSixPathBootstrapAuthorizationV1,
} from "./smoke-evidence-task548.mjs";
export type {
  Task548CommittedBootstrapFileV1,
  Task548CommittedBootstrapSixFilesV1,
  Task548CommittedSixPathBootstrapReceiptV1,
  VerifiedTask548CommittedSixPathBootstrapReceiptV1,
} from "./smoke-evidence-task548.mjs";
