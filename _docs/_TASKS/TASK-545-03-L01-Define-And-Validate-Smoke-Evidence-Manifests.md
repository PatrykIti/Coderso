# TASK-545-03-L01: Define and Validate Smoke Evidence Manifests

# FileName: TASK-545-03-L01-Define-And-Validate-Smoke-Evidence-Manifests.md

**Parent Task:** TASK-545
**Parent Subtask:** TASK-545-03
**Priority:** High
**Category:** Workflow Evidence / Schema / Integrity
**Estimated Effort:** Medium
**Dependencies:** TASK-545-01-L02, TASK-545-02-L02
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)

---

## Overview

Define and validate the strict runtime-smoke evidence, checkpoint, Git binding,
and owner-controlled resume contracts while consuming the shared smoke runner.

## Sub-Tasks

None; this is an executable leaf with the exclusive file ownership below.

## Exclusive ownership

- new `_docs/_workflows/smoke-evidence.schema.json`
- new `_docs/_workflows/smoke-evidence-checkpoint.schema.json`
- new `_docs/_workflows/lib/smoke-evidence.mjs`
- new `_docs/_workflows/lib/smoke-evidence.d.mts`
- existing `scripts/runtime-smoke/adapters/types.ts`, only for the generic
  backward-compatible visible-evidence result extension below
- new `scripts/runtime-smoke/visible-evidence.ts`
- new `tests/unit/workflows/smokeEvidence.test.ts`
- new `tests/unit/runtime-smoke/visible-evidence.test.ts`
- test fixtures under `tests/fixtures/workflows/smoke-evidence/`

Because the two schemas, runtime, and declaration live below the globally
ignored workflow tree, all four are explicit owner-review/force-track artifacts.
The implementing agent returns their exact normalized paths and SHA-256 values
and stops; a fresh invocation proves tracked regular-file, no-symlink, clean
worktree, and `git show HEAD:<path>` byte parity before any workflow imports
them. A pre-existing ignored lookalike is rebuilt and cannot authorize itself.
This leaf is the sole owner of these artifacts; TASK-545-03-L02 owns `.gitignore`
and evidence-guidance only.

## Manifest contract

Each UI task writes
`_docs/_workflows/_smoke/evidence/task-###/<session>/manifest.json` from the
strict shared-runner report, with exact top/nested
keys and:

```json
{
  "schemaVersion": 1,
  "taskId": "TASK-540",
  "suiteId": "task-540",
  "profile": "certification",
  "session": "task-540-certification",
  "report": { "path": "report.json", "sha256": "64-lowercase-hex" },
  "revision": {
    "gitHead": "40-lowercase-hex",
    "workingTreeDirty": true,
    "workingTreeSha256": "64-lowercase-hex"
  },
  "generatedAt": "ISO-8601 UTC",
  "serverUp": true,
  "scenarios": [
    {
      "id": "stable-kebab-id",
      "title": "human title",
      "variants": [
        {
          "id": "dark-narrow",
          "surface": "admin",
          "theme": "dark",
          "viewport": { "width": 390, "height": 844 },
          "assertions": [
            {
              "kind": "computed-style",
              "target": "safe selector/description",
              "property": "display",
              "expected": "none",
              "actual": "none",
              "pass": true
            }
          ],
          "consoleErrors": []
        }
      ],
      "screenshots": [
        { "path": "stable-kebab-id.png", "sha256": "64-lowercase-hex" }
      ]
    }
  ]
}
```

At least five distinct scenario IDs are required. Every scenario has a non-empty
strict `variants[]`; variant IDs are unique within the scenario. Every variant
has non-empty visible assertions, zero console errors, an explicit
`admin|public` surface, and a valid viewport/theme. Every scenario has at least
one bounded screenshot/hash for human review; additional variant screenshots
are allowed but not required when machine-visible proof distinguishes them. If
any Admin surface is present, the manifest's variants must
collectively contain both Admin light and Admin dark. Profile-specific contracts
may require the same scenario in multiple theme/viewport variants without
inventing extra scenario IDs.
Assertion kinds are an enum:
`computed-style|geometry|dom-state|aria`. Mere control/rule/string presence is
not a valid visible assertion.

The shared runner report, not a task workflow or handwritten manifest, is the
sole authority for scenario pass state, title, variants, visible assertions,
variant console errors, and screenshot path/hash assignment. The generic
`SmokeScenarioResult` gains optional strict `title`, `variants`, and
`screenshots` fields so existing non-manifest adapters remain source-compatible.
Any suite entering this manifest lifecycle must provide all three, and every new
or substantially changed UI adapter must do so. `scripts/runtime-smoke/
visible-evidence.ts` owns their bounded recursive normalizer/builders; task-local
copies or report postprocessors are forbidden.

For a manifest-bearing report, the report's global `screenshots` array is
byte-equivalent, after canonical ordering, to the unique union of scenario-owned
screenshots. A screenshot belongs to exactly one scenario. Manifest generation
is a pure projection that drops only runtime-only elapsed/timing/cleanup fields;
it cannot add, rename, reinterpret, or mark passing a scenario, variant,
assertion, console result, or screenshot. `requireManifestEqualsRunnerReport`
requires exact ordered scenario IDs, every report `pass === true`, exact titles,
deep byte-equivalent variants/assertions/console arrays, exact scenario
screenshots, and exact global screenshot union. Missing report evidence,
manifest-only evidence, duplicate ownership, or any difference fails before
filesystem screenshot hashing.

`revision` is mandatory. `workingTreeSha256` is SHA-256 over a canonical stream made
from `gitHead`, sorted `git status --porcelain=v1 -z --untracked-files=all` records, and
for each changed/untracked path its status, normalized repository-relative path, mode,
and content hash (or deletion marker). The implementation derives the one exclusion from
the real Git repository root, `expectedTask`, and strict report-bound
`expectedSession` as
`_docs/_workflows/_smoke/evidence/task-###/<session>/`; callers cannot supply an evidence root.
Do not exclude source, tests, configuration, task contracts, runtime documentation, or
other dirty files.

Phase 1 also writes a strict `resume-checkpoint.json` control file beside the manifest.
It contains only safe identity/integrity metadata: schema version, task/run identity,
canonical repository-relative evidence directory, manifest hash, sorted evidence file
paths/hashes, the frozen runtime revision, sorted status/path/mode/content-hash records
outside evidence, an exact frozen list of physical task-family metadata files plus pinned
changelog number/safe slug, the exact canonical owning workflow entry, and phase-1
state/timestamp. It never contains file bodies,
command output, environment values, or agent payloads. The checkpoint is integrity-bound
by a SHA-256 returned separately to the owner and is never rewritten during resume.
The owning entry is derived only from the executing module's `import.meta.url`.
Exact built-ins remain accepted; a future entry must match the task-bound
`task-(three digits|9999)-(author-audit|implement|fix).mjs` rule, be tracked,
regular/no-symlink, byte-identical to `git show HEAD`, and pass TASK-545 static/
canonical-import gates. The exact tracked `task-554-closeout.mjs` guard is
validated by TASK-545's dedicated `closeout` static role and never reaches this
smoke-evidence owning-entry function. Caller path overrides fail.

The TASK-548 bootstrap exception uses the declaration-owned exact six-path
constant and receipt below. Its normalizer recursively rejects unknowns,
requires path-sorted constant membership, lowercase 40-hex `priorHead`/`head`
and lowercase 64-hex file/aggregate hashes, and recomputes the aggregate over
the checkpoint-compatible canonical JSON `{ priorHead, files }` with displayed
key order and one final LF. The authorization gate additionally proves
current HEAD equals `head`, is the single direct child of `priorHead`, its exact
diff is those six regular non-symlink paths, each tracked HEAD byte hash matches,
the worktree/index are clean for them, and the exact workflow static/import gates
pass. The receipt carries no root, timestamp, body, command output or override.

## Implementation Pseudocode

The named types and exact tuple declaration are real exports from the companion
`_docs/_workflows/lib/smoke-evidence.d.mts` declaration contract for
`smoke-evidence.mjs`; runtime exports the same deeply frozen tuple and the
declaration also types every runtime export used below.
This keeps the runtime file valid JavaScript while allowing consumers to import
the exact owner types from `./lib/smoke-evidence.mjs` without local substitutes.

```ts
// scripts/runtime-smoke/adapters/types.ts; optional only for legacy compatibility
export interface SmokeVisibleAssertionResult {
  readonly kind: "computed-style" | "geometry" | "dom-state" | "aria";
  readonly target: string;
  readonly property: string;
  readonly expected: string;
  readonly actual: string;
  readonly pass: boolean;
}
export interface SmokeScenarioVariantResult {
  readonly id: string;
  readonly surface: "admin" | "public";
  readonly theme: "light" | "dark";
  readonly viewport: Readonly<{ width: number; height: number }>;
  readonly assertions: readonly SmokeVisibleAssertionResult[];
  readonly consoleErrors: readonly string[];
}
export interface SmokeScenarioResult {
  readonly id: string;
  readonly pass: boolean;
  readonly elapsedMs: number;
  readonly title?: string;
  readonly variants?: readonly SmokeScenarioVariantResult[];
  readonly screenshots?: readonly SmokeScreenshotResult[];
}
export function requireManifestableScenarioResults(
  scenarios: readonly SmokeScenarioResult[],
  globalScreenshots: readonly SmokeScreenshotResult[],
): readonly ManifestableSmokeScenarioResult[] {
  const normalized = scenarios.map(normalizeStrictManifestableScenario);
  assertExactUniqueScreenshotUnion(normalized, globalScreenshots);
  return Object.freeze(normalized);
}
declare const verifiedTask545Checkpoint: unique symbol;
export type SmokeEvidenceCheckpointV1 = Readonly<{
  schemaVersion: 1;
  taskId: TaskId;
  suiteId: string;
  profile: "fast" | "certification";
  session: string;
  runId: string;
  workflowEntry: string;
  evidenceDirectory: string;
  manifestSha256: string;
  evidenceFiles: readonly Readonly<{ path: string; sha256: string }>[];
  frozenRuntime: WorkingTreeRevision;
  closureContract: SmokeEvidenceClosureContractV1;
  phase1: Readonly<{
    state: "owner_review_required";
    generatedAt: string;
  }>;
}>;
export type VerifiedTask545Checkpoint = Readonly<
  SmokeEvidenceCheckpointV1 & { [verifiedTask545Checkpoint]: true }
>;
export type Task545ClosureIdentity = Readonly<{
  taskId: TaskId; suiteId: string; profile: "fast" | "certification";
  session: string; runId: string; checkpointSha256: string;
  changelogNumber: number; changelogSlug: string;
  closureUtcDate: CanonicalUtcDate;
  pinnedChangelogPath: `_docs/_CHANGELOG/${string}.md`;
  durableState: "none" | "file-only" | "both";
}>;
export type VerifiedTask545MetadataRecoveryDelta = Readonly<{
  pass: true; taskId: TaskId; runId: string;
  closureMetadataRevision: PublicWorkingTreeRevision;
  changedPaths: readonly string[];
}>;
export type SmokeEvidenceClosureContractV1 = Readonly<{
  taskFiles: readonly string[];
  supplementalTaskFiles: readonly string[];
  taskIndex: "_docs/_TASKS/README.md";
  changelogIndex: "_docs/_CHANGELOG/README.md";
  changelogNumber: number;
  changelogSlug: string;
}>;
export type Task545ClosureResume =
  | Readonly<{ state: "frozen"; checkpoint: VerifiedTask545Checkpoint;
      closureIdentity: Task545ClosureIdentity & { durableState: "none" } }>
  | Readonly<{ state: "metadata_recovery"; checkpoint: VerifiedTask545Checkpoint;
      closureIdentity: Task545ClosureIdentity & { durableState: "file-only" | "both" };
      delta: VerifiedTask545MetadataRecoveryDelta }>;
export declare const TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1: readonly [
  "_docs/_workflows/lib/task-548-contract.mjs",
  "_docs/_workflows/task-548-author-audit.mjs",
  "_docs/_workflows/task-548-fix.mjs",
  "_docs/_workflows/task-548-implement.mjs",
  "tests/unit/workflows/task548AuthorAudit.test.ts",
  "tests/unit/workflows/task548WorkflowContracts.test.ts",
];
export type Task548CommittedBootstrapFileV1 = Readonly<{
  path: typeof TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1[number];
  sha256: string;
}>;
export type Task548CommittedBootstrapSixFilesV1 = readonly [
  Task548CommittedBootstrapFileV1, Task548CommittedBootstrapFileV1,
  Task548CommittedBootstrapFileV1, Task548CommittedBootstrapFileV1,
  Task548CommittedBootstrapFileV1, Task548CommittedBootstrapFileV1
];
export type Task548CommittedSixPathBootstrapReceiptV1 = Readonly<{
  schema: "coderso.task548-committed-bootstrap@v1"; taskId: "TASK-548";
  priorHead: string; head: string;
  workflowEntry: "_docs/_workflows/task-548-implement.mjs";
  files: Task548CommittedBootstrapSixFilesV1; aggregateSha256: string;
}>;
declare const verifiedTask548Bootstrap: unique symbol;
export type VerifiedTask548CommittedSixPathBootstrapReceiptV1 = Readonly<
  Task548CommittedSixPathBootstrapReceiptV1 &
  { [verifiedTask548Bootstrap]: true }
>;
export function normalizeTask548CommittedSixPathBootstrapReceiptV1(
  value: unknown
): Task548CommittedSixPathBootstrapReceiptV1;
export function requireTask548CommittedSixPathBootstrapAuthorizationV1(
  options: { repoRoot: string; receipt: unknown }
): Promise<VerifiedTask548CommittedSixPathBootstrapReceiptV1>;
export async function resolveCanonicalEvidenceDirectory(
  repoRoot,
  expectedTask,
  expectedSession
) {
  requireRepoTaskId(expectedTask); // TASK-[0-9]{3}, plus sole TASK-9999 sentinel
  requireRuntimeSmokeSessionName(expectedSession);
  const realRepoRoot = await requireRealGitTopLevel(repoRoot);
  const expected = join(
    realRepoRoot,
    "_docs/_workflows/_smoke/evidence",
    expectedTask.toLowerCase(),
    expectedSession
  );
  await rejectSymlinkedExistingComponents(realRepoRoot, expected);
  return expected;
}
export async function computeWorkingTreeRevision(
  repoRoot,
  expectedTask,
  expectedSession
) {
  const evidenceRoot = await resolveCanonicalEvidenceDirectory(
    repoRoot,
    expectedTask,
    expectedSession
  );
  const gitHead = await readExactGitHead(repoRoot);
  const records = await readPorcelainRecords(repoRoot, { includeUntracked: true });
  const outsideEvidence = canonicalStatusRecords(records, {
    excludeStrictDescendant: evidenceRoot,
  });
  const canonical = canonicalRevisionStream(gitHead, records, {
    excludeStrictDescendant: evidenceRoot,
  });
  return {
    gitHead,
    workingTreeDirty: outsideEvidence.length > 0,
    workingTreeSha256: sha256(canonical),
    records: outsideEvidence,
  };
}
export async function validateSmokeEvidence(options) {
  requireExactExpectedRevisionAndRunnerOptions(options); // repo root, task, suite/profile/session, report, revision
  const root = await resolveCanonicalEvidenceDirectory(
    options.repoRoot,
    options.expectedTask,
    options.expectedSession
  );
  const manifestPath = join(root, "manifest.json");
  await requireExactRealPath(dirname(manifestPath), root);
  if ((await stat(manifestPath)).size > MAX_MANIFEST_BYTES) fail("smoke_manifest_too_large");
  const raw = JSON.parse(await readFile(manifestPath, "utf8"));
  validateExactSchema(raw, smokeEvidenceSchema);
  if (raw.scenarios.length < 5) fail("smoke_scenarios_insufficient");
  if (!raw.serverUp) fail("smoke_server_down");
  if (raw.taskId !== options.expectedTask) fail("smoke_task_manifest_mismatch");
  requireRegisteredRuntimeSmokeIdentity({
    suiteId: raw.suiteId,
    profile: raw.profile,
    session: raw.session,
    expectedSuite: options.expectedSuite,
    expectedProfile: options.expectedProfile,
    expectedSession: options.expectedSession,
  });
  const report = await readHashAndNormalizeSharedRuntimeSmokeReport(root, raw.report);
  requireManifestEqualsRunnerReport(raw, report);
  if (!revisionEquals(raw.revision, options.expectedRevision)) fail("smoke_revision_mismatch");
  const ids = new Set();
  const adminThemes = new Set();
  const referencedFiles = ["manifest.json", "report.json"];
  for (const scenario of raw.scenarios) {
    if (ids.has(scenario.id)) fail("smoke_scenario_duplicate");
    ids.add(scenario.id);
    const variantIds = new Set();
    for (const variant of requireNonEmpty(scenario.variants)) {
      if (variantIds.has(variant.id)) fail("smoke_variant_duplicate");
      variantIds.add(variant.id);
      if (variant.consoleErrors.length !== 0) fail("smoke_console_errors");
      if (variant.surface === "admin") adminThemes.add(variant.theme);
      if (!variant.assertions.every((a) => a.pass === true)) fail("smoke_assertion_failed");
    }
    for (const shot of requireNonEmpty(scenario.screenshots)) {
      const resolved = resolve(root, shot.path);
      if (!isStrictDescendant(root, resolved) || isSymlinkEscape(resolved)) fail(...);
      const actual = sha256(await readFile(resolved));
      if (!timingSafeEqualHex(actual, shot.sha256)) fail("smoke_hash_mismatch");
      referencedFiles.push(shot.path);
    }
  }
  if (adminThemes.size > 0 &&
      !(adminThemes.has("light") && adminThemes.has("dark"))) {
    fail("smoke_admin_theme_coverage_missing");
  }
  return {
    pass: true,
    taskId: raw.taskId,
    suiteId: raw.suiteId,
    profile: raw.profile,
    session: raw.session,
    revision: raw.revision,
    scenarios: raw.scenarios.length,
    referencedFiles: referencedFiles.sort(),
  };
}
function requireManifestEqualsRunnerReport(manifest, report) {
  const scenarios = requireManifestableScenarioResults(
    report.scenarios,
    report.screenshots,
  );
  requireEveryScenarioPassed(scenarios);
  requireExactOrderedIds(manifest.scenarios, scenarios);
  requireCanonicalByteEquality(
    manifest.scenarios,
    scenarios.map(projectManifestScenarioWithoutElapsedMs),
    "smoke_manifest_report_evidence_mismatch",
  );
  requireCanonicalByteEquality(
    uniqueScenarioScreenshotUnion(manifest.scenarios),
    report.screenshots,
    "smoke_manifest_report_screenshot_mismatch",
  );
}
export async function auditSmokeEvidenceDirectory(options) {
  const taskDir = await resolveCanonicalEvidenceDirectory(
    options.repoRoot,
    options.expectedTask,
    options.expectedSession
  );
  const result = await validateSmokeEvidence(options);
  const referenced = result.referencedFiles;
  const present = await enumerateRegularFilesNoSymlinks(taskDir);
  const expectedPresent = options.requireCheckpoint
    ? [...referenced, "resume-checkpoint.json"].sort()
    : referenced;
  if (!sameSortedPaths(expectedPresent, present)) fail("smoke_evidence_file_set_mismatch");
  if (options.requireTracked) {
    const tracked = (await gitLsFiles(taskDir)).map((path) => relative(taskDir, path));
    if (!sameSortedPaths(expectedPresent, tracked)) fail("smoke_evidence_untracked");
  }
  return result;
}
async function requireTaskBoundOwningWorkflow(options) {
  requireNoWorkflowEntryOverride(options);
  requireCanonicalOwnerRole(options.expectedWorkflowRole);
  const entry = deriveCanonicalRepoPathOnlyFromImportMetaUrl(
    options.repoRoot,
    options.executingImportMetaUrl
  );
  if (isExactTask545BuiltinEntry(entry)) {
    requireExactBuiltinTaskAndRoleBinding(
      entry, options.expectedTask, options.expectedWorkflowRole
    );
  } else {
    requireCanonicalFutureTaskOwner(entry, options.expectedTask, {
      pattern:
        /^_docs\/_workflows\/task-(?:[0-9]{3}|9999)-(author-audit|implement|fix)\.mjs$/,
      expectedRole: options.expectedWorkflowRole,
      requireTaskIdAndSuffixBinding: true,
    });
  }
  await requireGitTrackedRegularNoSymlink(entry);
  await requireWorktreeBytesEqualGitShowHead(entry);
  await requireCanonicalTask545StaticContractAndImportGates(entry);
  return entry;
}
export async function requireTask548CommittedSixPathBootstrapAuthorizationV1(options) {
  requireExactKeys(options, ["repoRoot", "receipt"]);
  const receipt = normalizeTask548CommittedSixPathBootstrapReceiptV1(
    options.receipt
  );
  await requireExactCommittedTask548SixPathReceipt(receipt, {
    repoRoot: options.repoRoot,
    expectedTask: "TASK-548",
    expectedWorkflowEntry: "_docs/_workflows/task-548-implement.mjs",
    expectedPaths: TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1,
    requireExactSchemaTaskPriorHeadCurrentHeadFilesAndAggregate: true,
    requireCurrentHeadDirectParentEqualsPriorHead: true,
    requireCurrentHeadAndExactStaticImportGates: true,
  });
  return brandVerifiedTask548CommittedBootstrapReceipt(receipt);
}
export async function createResumeCheckpoint(options) {
  requireExactKeys(options, ["repoRoot", "expectedTask", "pinnedChangelogNumber",
    "pinnedChangelogSlug", "expectedWorkflowRole", "executingImportMetaUrl",
    "expectedSuite", "expectedProfile", "expectedSession", "runtimeResult"]);
  requirePinnedClosureIdentity(
    options.pinnedChangelogNumber,
    options.pinnedChangelogSlug,
    options.expectedTask
  );
  const workflowEntry = await requireTaskBoundOwningWorkflow(options);
  await requireNoCanonicalPinnedChangelogOrIndexRow({
    repoRoot: options.repoRoot, taskId: options.expectedTask,
    changelogNumber: options.pinnedChangelogNumber,
    changelogSlug: options.pinnedChangelogSlug,
  });
  const revision = await computeWorkingTreeRevision(
    options.repoRoot,
    options.expectedTask,
    options.expectedSession
  );
  const result = await auditSmokeEvidenceDirectory({
    ...options,
    expectedRevision: publicRevision(revision),
    requireCheckpoint: false,
    requireTracked: false,
  });
  const checkpoint = exactCheckpoint({
    schemaVersion: 1,
    taskId: options.expectedTask,
    suiteId: options.expectedSuite,
    profile: options.expectedProfile,
    session: options.expectedSession,
    runId: deterministicRunId(
      options.expectedTask,
      options.expectedSession,
      result,
      revision
    ),
    workflowEntry,
    evidenceDirectory: canonicalRepoRelativeEvidencePath(
      options.expectedTask,
      options.expectedSession
    ),
    manifestSha256: sha256(await readCanonicalManifest(options)),
    evidenceFiles: await hashSortedReferencedFiles(result),
    frozenRuntime: revision,
    closureContract: {
      taskFiles: await listExactPhysicalTaskFamilyFiles(
        options.repoRoot,
        options.expectedTask
      ),
      supplementalTaskFiles:
        await resolveOwnerControlledSupplementalClosureTaskFiles(
          options.repoRoot,
          options.expectedTask,
        ),
      taskIndex: "_docs/_TASKS/README.md",
      changelogIndex: "_docs/_CHANGELOG/README.md",
      changelogNumber: options.pinnedChangelogNumber,
      changelogSlug: options.pinnedChangelogSlug,
    },
    phase1: { state: "owner_review_required", generatedAt: nowUtc() },
  });
  await writeNewCheckpointAtomically(options.repoRoot, checkpoint); // refuse overwrite
  await requireExactPresentSet(result.referencedFiles, "resume-checkpoint.json");
  return ownerActionRequired(checkpoint, sha256(canonicalJson(checkpoint)));
}
export async function resumeTrackedEvidence(options) {
  requireExactKeys(options, ["repoRoot", "expectedTask", "checkpointPath",
    "checkpointSha256", "runId", "expectedSession", "expectedWorkflowRole",
    "executingImportMetaUrl"]);
  const executingWorkflowEntry = await requireTaskBoundOwningWorkflow(options);
  const canonicalPath = canonicalCheckpointPath(
    options.repoRoot,
    options.expectedTask,
    options.expectedSession
  );
  requireExactPath(options.checkpointPath, canonicalPath);
  const bytes = await readCappedFileNoSymlink(canonicalPath);
  timingSafeRequireSha256(bytes, options.checkpointSha256);
  const checkpoint = validateExactSchema(JSON.parse(bytes), checkpointSchema);
  requireTaskSessionAndRun(
    checkpoint,
    options.expectedTask,
    options.expectedSession,
    options.runId
  );
  requireExecutingWorkflowEntry(
    options.repoRoot,
    checkpoint.workflowEntry,
    executingWorkflowEntry
  );
  requireRevisionEquals(
    checkpoint.frozenRuntime,
    await computeWorkingTreeRevision(
      options.repoRoot,
      options.expectedTask,
      options.expectedSession
    )
  );
  await auditSmokeEvidenceDirectory({
    repoRoot: options.repoRoot,
    expectedTask: options.expectedTask,
    expectedSuite: checkpoint.suiteId,
    expectedProfile: checkpoint.profile,
    expectedSession: checkpoint.session,
    expectedRevision: publicRevision(checkpoint.frozenRuntime),
    requireCheckpoint: true,
    requireTracked: true,
  });
  await requireEvidenceHashesEqualCheckpoint(checkpoint);
  return trackedEvidencePass(checkpoint); // read-only and replay-safe
}
export async function openWorkflowClosureResume(
  options
): Promise<Task545ClosureResume> {
  requireExactKeys(options, ["repoRoot", "expectedTask", "checkpointPath",
    "checkpointSha256", "runId", "expectedSession", "expectedWorkflowRole",
    "executingImportMetaUrl"]);
  const executingWorkflowEntry = await requireTaskBoundOwningWorkflow(options);
  const checkpoint = await readVerifyCheckpointIdentityAndWorkflow({
    ...options, executingWorkflowEntry,
  });
  let current = await computeWorkingTreeRevision(
    options.repoRoot,
    options.expectedTask,
    options.expectedSession
  );
  await requireEvidenceHashesAndTrackedParity(checkpoint, options);
  let pair = await inspectBoundOrderedChangelogPair(checkpoint, options, {
    validStates: ["none", "file-only", "both"],
    rejectIndexOnlyCorruptOrMultiple: true,
  });
  if (pair.state === "none" && pair.staleBoundTempOrJournalOnly) {
    await cleanStaleBoundTransactionArtifactsAndFsyncDirectory(pair);
    current = await computeWorkingTreeRevision(
      options.repoRoot,
      options.expectedTask,
      options.expectedSession
    );
    pair = await inspectBoundOrderedChangelogPair(checkpoint, options, {
      validStates: ["none"], rejectAnyCanonicalMetadata: true,
    });
  }
  if (pair.state === "none" && revisionEquals(current, checkpoint.frozenRuntime)) {
    const closureIdentity = await createFrozenClosureIdentityFromCheckpoint({
      checkpoint,
      checkpointSha256: options.checkpointSha256,
      repoRoot: options.repoRoot,
      closureUtcDate: currentCanonicalUtcDate(),
      durableState: "none",
    });
    return { state: "frozen", checkpoint, closureIdentity };
  }
  if (pair.state !== "file-only" && pair.state !== "both") {
    fail("smoke_non_metadata_delta");
  }
  // Discover identity before constructing the allowlist or validating the delta.
  const closureIdentity = await discoverMetadataRecoveryClosureIdentity({
    checkpoint,
    checkpointSha256: options.checkpointSha256,
    repoRoot: options.repoRoot,
    expectedTask: options.expectedTask,
    closureContract: checkpoint.closureContract,
    requireExactlyOneRegularNoSymlinkChangelog: true,
    requireCanonicalPathFromClosureContract:
      "_docs/_CHANGELOG/<number>-YYYY-MM-DD-<safe-slug>.md",
    requireStrictBodyTaskDateAndNumber: true,
    requireMatchingChangelogIndexRows: pair.state === "file-only" ? 0 : 1,
    durableState: pair.state,
  });
  if (pair.boundTempOrJournalPresent) {
    await requireBoundTransactionArtifactsMatchCheckpointRunAndIdentity({
      pair, checkpoint, closureIdentity,
    });
    await cleanBoundTransactionArtifactsAndFsyncDirectory(pair);
    current = await computeWorkingTreeRevision(
      options.repoRoot,
      options.expectedTask,
      options.expectedSession
    );
    pair = await inspectBoundOrderedChangelogPair(checkpoint, options, {
      validStates: [closureIdentity.durableState],
      rejectAnyBoundTransactionArtifacts: true,
      rejectIndexOnlyCorruptOrMultiple: true,
    });
  }
  // This accepts only an exact subset of the frozen task/index/date-resolved
  // changelog allowlist, with no source/workflow/evidence/HEAD delta.
  const delta = await validateMetadataOnlyClosureDelta(
    checkpoint, closureIdentity, options.repoRoot
  );
  return { state: "metadata_recovery", checkpoint, closureIdentity, delta };
}
export async function writeOrResumeOrderedDurableChangelogFileThenIndexV1(options) {
  requireExactKeys(options, ["repoRoot", "checkpoint", "runId", "closureIdentity",
    "changelogBytes", "changelogIndexMutation", "protocol"]);
  requireExactProtocolMarker(
    options.protocol, "ordered-durable-changelog-file-then-index@v1"
  );
  requireTaskRunAndIdentityBinding(options);
  const tx = deriveCheckpointRunBoundSameRepoTransaction(options);
  await createOrVerifyJournalViaTempFsyncRenameAndDirectoryFsync(tx);
  let state = await inspectBoundOrderedChangelogPair(
    options.checkpoint, options, {
      validStates: ["none", "file-only", "both"],
      rejectIndexOnlyCorruptOrMultiple: true,
    }
  );
  if (state.state === "none") {
    await writeCanonicalChangelogRegularFileNoReplace(tx, options.changelogBytes);
    await fsyncFileThenContainingDirectory(tx.changelogPath);
    state = await requireExactPairState(tx, "file-only");
  }
  if (state.state === "file-only") {
    const indexBytes = await applyExactChangelogIndexMutation(
      tx, options.changelogIndexMutation
    );
    const temp = await writeSameDirectoryIndexCasTemp(tx, indexBytes);
    await fsyncFile(temp);
    await requireIndexBaseSha256Unchanged(tx);
    await renameTempOverIndex(temp, tx.changelogIndex);
    await fsyncContainingDirectory(tx.changelogIndex);
  }
  await requireExactPairState(tx, "both");
  await removeBoundTempAndJournalThenFsyncDirectory(tx);
  return advanceClosureIdentity(options.closureIdentity, "both");
}
export async function validateMetadataOnlyClosureDelta(
  checkpoint, closureIdentity, repoRoot
): Promise<VerifiedTask545MetadataRecoveryDelta> {
  await requireCheckpointAndEvidenceStillExact(checkpoint, { closureIdentity, repoRoot });
  const current = await computeWorkingTreeRevision(
    repoRoot,
    closureIdentity.taskId,
    closureIdentity.session
  );
  if (current.gitHead !== checkpoint.frozenRuntime.gitHead) fail("smoke_head_changed");
  await requireExactOrderedChangelogPrefix(checkpoint, closureIdentity, current);
  const changed = diffCanonicalRecords(checkpoint.frozenRuntime.records, current.records);
  const allowlist = buildExactClosureMetadataAllowlist({
    frozenContract: checkpoint.closureContract,
    pinnedChangelogPath: closureIdentity.pinnedChangelogPath,
    closureUtcDate: closureIdentity.closureUtcDate,
  });
  if (changed.some((entry) => !allowlist.has(entry.path))) {
    fail("smoke_non_metadata_delta");
  }
  return {
    pass: true,
    taskId: closureIdentity.taskId,
    runId: checkpoint.runId,
    closureMetadataRevision: publicRevision(current),
    changedPaths: uniqueSorted(changed.map((entry) => entry.path)),
  };
}
const TASK_414_SUPPLEMENTAL_CLOSURE_TASK_FILES = Object.freeze([
  "_docs/_TASKS/TASK-406_Assistant_Cross_Industry_Reset_E2E.md",
]);
async function resolveOwnerControlledSupplementalClosureTaskFiles(
  repoRoot,
  expectedTask,
) {
  // This is an owner-side static switch. No task workflow, CLI argument,
  // manifest, checkpoint caller, or agent result may extend this set.
  const paths = expectedTask === "TASK-414"
    ? TASK_414_SUPPLEMENTAL_CLOSURE_TASK_FILES
    : [];
  await requireEveryRepoRelativePathRegularNoSymlinkTrackedAtHead(repoRoot, paths);
  return paths;
}
function buildExactClosureMetadataAllowlist({
  frozenContract,
  pinnedChangelogPath,
  closureUtcDate,
}) {
  validateExactFrozenClosureContract(frozenContract, {
    requireSortedUniqueTaskAndSupplementalFiles: true,
    requireDisjointTaskAndSupplementalFiles: true,
    rejectUnknownKeys: true,
  });
  requirePinnedChangelogPathMatchesFrozenNumberSlugAndDate(
    pinnedChangelogPath,
    frozenContract,
    closureUtcDate,
  );
  return new Set([
    ...frozenContract.taskFiles,
    ...frozenContract.supplementalTaskFiles,
    frozenContract.taskIndex,
    frozenContract.changelogIndex,
    pinnedChangelogPath,
  ]);
}
// Owning workflow API only; no CLI/API workflow-entry override exists:
// await requireTask548CommittedSixPathBootstrapAuthorizationV1({
//   repoRoot, receipt: committedExactSixPathReceipt }) // TASK-548 only, immediately first
// createResumeCheckpoint({...}) -> {pass:false,code:"owner_action_required",
//   action:"review_and_stage_evidence",taskId,evidenceDirectory,checkpointPath,
//   checkpointSha256,runId,resumeArgv,resumeCommand,frozenRuntimeRevision}
// Diagnostic only (never the owner closure command):
// node smoke-evidence.mjs validate-tracked --repo-root <root> --task TASK-###
//   --suite <registered-suite> --profile <fast|certification> --session <session>
//   --checkpoint <canonical-path> --checkpoint-sha256 <sha> --run-id <run-id>
//   --audit-directory --require-tracked
// node smoke-evidence.mjs closure-delta --repo-root <root> --task TASK-###
//   --suite <registered-suite> --profile <fast|certification> --session <session>
//   --checkpoint <canonical-path> --checkpoint-sha256 <sha> --run-id <run-id>
// The diagnostic recovers the identity from the checkpoint plus strict on-disk
// changelog/index facts; callers never supply a path or date.
// Exit 0 only for validate-tracked/closure-delta success; owner_action_required exits with the
// documented pause code, and every failure is structured JSON without raw identities.
```

## Two-phase evidence lifecycle

```text
agent after smoke:
  owning workflow calls phase 1 with its own import.meta.url; no path override
  require exact manifest/present-file parity, revision and hashes
  atomically create the strict resume-checkpoint.json without staging it
  return { pass:false, code:"owner_action_required", action:"review_and_stage_evidence",
           taskId, evidenceDirectory, checkpointPath, checkpointSha256, runId,
           resumeArgv, resumeCommand, frozenRuntimeRevision }
  pause; do not edit task/changelog closure metadata and do not run git add
repository owner:
  inspect report, screenshots, manifest and checkpoint for visible correctness and secret/PII safety
  stage only the reviewed task evidence directory; do not stage source/task metadata here
  invoke the returned owning-workflow resume argv with the unchanged checkpoint hash/run ID
resumed agent:
  verify exact canonical checkpoint path/hash/schema/task/run/owning workflow
  run --audit-directory --require-tracked with report/manifest/screenshots/checkpoint parity
  continue only in the closure branch; do not replay implementation/fix/source mutation
  after all closure edits, validate the exact metadata-only delta and return its digest/paths
```

An owner commit is not required at the checkpoint: staging makes reviewed evidence visible
to `git ls-files`, while the final owner commit remains after closure. Checkpoint/evidence
parity validation is read-only and idempotent. Closure may clean only stale correctly bound
temp/journal-only residue, then perform the separately bounded metadata writes. The returned command re-enters exactly the checkpoint-owned workflow's
closure-only branch; the standalone validator is diagnostic only. Replaying the same
task/run/path/hash before closure returns the same pass, and replay after an allowlisted
partial or complete closure continues/no-ops through `metadata_recovery` without modifying
the checkpoint. A wrong task/run/workflow/hash, tampered checkpoint, stale non-metadata
revision, non-canonical path, or a resume routed through implementation returns a
machine-readable failure. Missing owner staging remains a machine-readable pause, never a
downgraded pass.

The tracked resume freezes the audited runtime snapshot. Closure may then change only
physical task-family files for that exact task, the frozen owner-controlled supplemental
task-file set, exact `_docs/_TASKS/README.md`, the exact
pinned/date-resolved changelog file, and exact `_docs/_CHANGELOG/README.md`. Allowlist
membership comes from the checkpoint's frozen task-file lists and immutable pinned
number/slug. The only non-family exception is the TASK-545-owned static mapping from
TASK-414 to exactly
`_docs/_TASKS/TASK-406_Assistant_Cross_Industry_Reset_E2E.md`; every other task maps to
an empty supplemental list. Callers cannot supply, override, or broaden it.

Path membership is only the outer boundary. Before the first metadata write,
`buildClosureMetadataMutationPlanV1` — an export OWNED by this leaf's
`lib/smoke-evidence.mjs` (declared in the `.d.mts`; consumed by
TASK-545-04-L03's closure path, which must import it, never redefine it) —
reads the checkpoint-frozen bytes and the
fresh indexes and produces a deeply frozen exact plan whose records contain
`path`, `beforeSha256`, ordered semantic operations, and `expectedAfterSha256`.
Allowed operations are limited to canonical task `Status` plus dedicated
`Started`/`Completed`/`Superseded By` fields; the exact owning board row and
Statistics values; the pinned changelog file generated from a strict bounded
closure-evidence template; and the exact changelog index row/next pointer. The
TASK-414 supplemental TASK-406 plan may change only those same terminal fields
and its own board row. Scenario inventories, acceptance text, dependencies,
pseudocode, security contracts, arbitrary prose, another board row, or another
statistic are not metadata operations.

The writer applies that plan in memory to the exact frozen bytes, refuses a
missing/duplicate/ambiguous field or row, writes with the existing durable
protocol, and rereads every file. `closure-delta` recomputes each final SHA-256
and requires exact equality with the plan; a caller-provided path/hunk/hash is
never accepted. Recovery reconstructs the identical plan from checkpoint,
`closureIdentity`, and durable current prefix and may complete only its next
missing operation. Thus an arbitrary edit inside an allowlisted file fails just
as an unallowlisted path does.

`openWorkflowClosureResume` computes the current revision before resolving
an identity. Only `none`, `file-only`, and `both` are valid canonical states. Bound
temp/journal-only residue is cleaned and directory-fsynced, the revision recomputed,
and `frozen` is allowed only when no canonical closure metadata delta remains; residue never supplies
date authority. A changed revision must, before allowlist/delta validation, discover
exactly one regular non-symlink changelog whose path/body matches checkpoint task/number/
slug and canonical date, with zero matching index rows for `file-only` or exactly one
matching row/date for `both`. Index-only, corruption, duplicate/mismatched rows, zero/
multiple files, non-regular files, and symlinks fail closed. The returned
`closureIdentity` is the only date/path authority consumed by the owning workflow; callers
never resolve it again. Verified bound temp/journal residue accompanying `file-only` or
`both` is identity-checked, removed and directory-fsynced before the current revision and
unchanged canonical state are recomputed; transient paths never join the allowlist. The
first closeout transaction uses checkpoint/run-bound
same-repository temp/journal paths, creates the changelog no-replace and fsyncs its file/
directory, then writes/fsyncs an index CAS temp, verifies the base digest, renames and
directory-fsyncs it. `file-only` is the exact recoverable first prefix; recovery finishes
the index before later metadata, while `both` is revalidated. Matching is
repository-relative, exact, normalized, and rejects traversal, prefix
lookalikes, another task family, or another changelog. Source, tests, configuration,
runtime/security/product docs, workflows, evidence, and HEAD remain byte-identical to the
frozen snapshot. Run `closure-delta` after all closure metadata/status edits and again after
any parent-status adjustment; its structured result carries `closureMetadataRevision` and
the allowed changed paths for the owner handoff. No file may change after the final pass.
Any non-allowlisted delta invalidates the smoke and requires a new runtime smoke/phase 1.

Reject absolute paths, `..`, symlinks escaping the task directory, unknown keys,
duplicate scenario/variant IDs, empty variants, unregistered or mismatched
suite/profile/session/report identity, invalid surface/theme/dimensions/timestamps/hash grammar,
missing light-or-dark admin coverage, empty
assertions/screenshots, false assertions, and any console error. Cap manifest bytes
before JSON parsing, then cap string/array counts and each screenshot byte size before
hashing to prevent pathological evidence ingestion.

Do not inspect image pixels as proof of assertions; manifest assertions remain
machine-verifiable run output, while screenshots are integrity-bound artifacts
for human review.

## Error/compatibility flow

Validator is read-only and returns machine-readable codes without manifest raw
content. Existing loose `_smoke/*.png` is ignored, not grandfathered as evidence.
No manifest is rewritten or hash auto-updated during validation.

- Phase 1 never claims durability; tracked resume is the only tracked-evidence pass.
- The agent never invokes `git add`. A missing/untracked phase-2 file returns
  `smoke_owner_stage_required` and keeps closure open.
- A checkpoint conflict is never overwritten; validation never mutates checkpoint,
  evidence, or canonical metadata, apart from the explicit stale-transient cleanup.
- Closure-delta success permits only bounded metadata drift; it never blesses source drift.
- Ordered-pair recovery never accepts index-only/corrupt/multiple state or treats stale
  temp/journal bytes as date authority.

## Regression-test shape owned by this leaf

`tests/unit/workflows/smokeEvidence.test.ts` owns a temporary Git-repository corpus:
valid five-flow evidence with admin light+dark; deterministic clean/dirty/untracked/
deleted-file revision digests; evidence-directory self-exclusion derived only from
the real repository root/task; rejection of an alternate same-basename root, external
root, symlinked component, traversal and prefix lookalike; mandatory
task/path/HEAD/dirty/digest matching; changed byte/hash; missing/untracked/
unreferenced file; oversized manifest/screenshot; console error; failed assertion;
duplicate ID; and unknown key.

`tests/unit/runtime-smoke/visible-evidence.test.ts` owns the generic report-side
contract: legacy scenario results without optional evidence remain valid for
non-manifest suites; manifestable scenarios require exact title/nonempty unique
variants/visible assertions/scenario screenshots; all scalar/array/dimension/
byte caps and unknowns fail closed; global screenshots equal the unique scenario
union. Cross-suite fixtures prove TASK-548 and TASK-414 manifests are generated
only from their runner-returned variants/assertions/screenshots, and mutate each
report/manifest ID, pass bit, title, variant, assertion expected/actual/pass,
console error, screenshot path/hash/order/ownership to require mismatch failure.

The same suite covers phase-1 checkpoint schema/caps/safe contents/atomic no-overwrite and
the exact `owner_action_required` resume payload; resume failure before owner staging;
success after staging only report/manifest/screenshots/checkpoint; wrong task/run/hash/path,
wrong owning/executing workflow entry, unsafe shell arguments, tampered checkpoint, stale
revision, extra tracked file, and non-evidence staging; execution of the exact returned argv;
repeated pre-closure resume success with no byte/status mutation; crash recovery from an
allowlisted partial closure; completed-closure replay without duplicate metadata; and
prevention of every implementation/fix/post-audit/smoke dispatch on resume.
Checkpoint fixtures prove the supplemental list is strict and frozen: TASK-414 receives
exactly TASK-406, every other task receives `[]`, TASK-406 may change only during the
TASK-414 metadata-only closure, and a caller-supplied, unknown, extra, prefix-lookalike,
untracked, symlinked, or non-regular supplemental path fails closed.
Both `frozen` and `metadata_recovery` fixtures call the exact owner export
`writeOrResumeOrderedDurableChangelogFileThenIndexV1` with literal marker
`ordered-durable-changelog-file-then-index@v1`; a task-local alias, skipped recovery call,
wrong marker, or index-before-file implementation fails.
Entry fixtures retain every exact built-in and cover all future suffixes plus TASK-9999;
caller override, wrong task/suffix, untracked/dirty/HEAD-mismatched, symlink/non-regular,
and static/import failures reject. TASK-548 fixtures require the TASK-545-owned current-HEAD,
exact-six-path committed-bootstrap gate immediately before the exact-argument phase-1 call;
missing/stale/wrong-entry receipts, reordering, an intervening action, an unknown phase-1
option, or passing the receipt into `createResumeCheckpoint` rejects. TASK-548 fixtures
also round-trip the exact receipt, mutate every root/nested key, path/order/hash/HEAD/
parent/aggregate/workflow entry, and prove the branded receipt is returned only after
live Git direct-parent/diff/tracked-byte checks.
Child-process fixtures kill after every journal/temp write, file fsync, rename, and
directory-fsync boundary. They prove only none/file-only/both recover, stale temp/journal-
only cleanup restarts safely, file-only completes the index once, both validates, bound
residue accompanying either state is cleaned only after identity verification, and
index-only/corrupt/multiple state fails. A UTC rollover after the no-replace changelog
write retains its date. Strict path/body/row mismatches fail before allowlist validation.
Type fixtures import the three exact owner exports plus `Task545ClosureResume`,
pin both discriminants/state-specific fields, and reject widened/local substitute shapes.
Metadata-delta cases prove the exact planned status/completion/board/statistics/
pinned-changelog operations and after-hashes pass while source, tests, config,
runtime/security docs, workflow/evidence, HEAD, another task/changelog, new
same-family task files absent from the frozen list, wrong number/slug/date,
traversal, prefix-lookalike changes, arbitrary prose in an allowed task, a changed
scenario or dependency line, another board row, an unplanned statistic, and declared
after-hash drift fail. Kill/recovery fixtures prove every prefix rebuilds the same
plan and cannot skip or add an operation; repeated delta validation is idempotent
and returns a deterministic sorted path list. L02 does not reopen this test file; it
runs the suite after changing `.gitignore` and separately asserts ignore behavior
with shell exit codes.

## Testing Requirements

```bash
node --check _docs/_workflows/lib/smoke-evidence.mjs
node _docs/_workflows/lib/smoke-evidence.mjs --help
bun test tests/unit/workflows/smokeEvidence.test.ts
bun test tests/unit/runtime-smoke/visible-evidence.test.ts
bun run lint:repo:types
git diff --check
wc -l scripts/runtime-smoke/adapters/types.ts \
  scripts/runtime-smoke/visible-evidence.ts \
  tests/unit/runtime-smoke/visible-evidence.test.ts \
  tests/unit/workflows/smokeEvidence.test.ts
```

## Documentation Updates Required

- No guidance file is edited here; TASK-545-03-L02 owns the evidence guide and
  the serialized generic cookbook recipe for this visible-evidence extension.
- TASK-545-04-L03 owns board and changelog 1257 closure evidence.
