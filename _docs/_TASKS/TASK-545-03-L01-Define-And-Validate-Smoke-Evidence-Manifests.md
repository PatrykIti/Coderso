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

## Exclusive ownership

- new `_docs/_workflows/smoke-evidence.schema.json`
- new `_docs/_workflows/smoke-evidence-checkpoint.schema.json`
- new `_docs/_workflows/lib/smoke-evidence.mjs`
- new `_docs/_workflows/lib/smoke-evidence.d.mts`
- new `tests/unit/workflows/smokeEvidence.test.ts`
- test fixtures under `tests/fixtures/workflows/smoke-evidence/`

Do not edit `.gitignore`, real smoke screenshots, unrelated workflows, or docs in this
leaf. TASK-545-03-L02 is the sole `.gitignore`/evidence-guidance writer.

## Manifest contract

Each UI task writes
`_docs/_workflows/_smoke/evidence/task-###/manifest.json` with exact top/nested
keys and:

```json
{
  "schemaVersion": 1,
  "taskId": "TASK-540",
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
      "surface": "admin",
      "theme": "light",
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
      "consoleErrors": [],
      "screenshots": [
        { "path": "scenario-1.png", "sha256": "64-lowercase-hex" }
      ]
    }
  ]
}
```

At least five distinct scenarios are required. Every scenario has non-empty
visible assertions, zero console errors, an explicit `admin|public` surface, a
valid viewport/theme, and at least one screenshot/hash. If any admin surface is
present, the manifest must contain both an admin-light and admin-dark scenario.
Assertion kinds are an enum:
`computed-style|geometry|dom-state|aria`. Mere control/rule/string presence is
not a valid visible assertion.

`revision` is mandatory. `workingTreeSha256` is SHA-256 over a canonical stream made
from `gitHead`, sorted `git status --porcelain=v1 -z --untracked-files=all` records, and
for each changed/untracked path its status, normalized repository-relative path, mode,
and content hash (or deletion marker). The implementation derives the one exclusion from
the real Git repository root and `expectedTask` as
`_docs/_workflows/_smoke/evidence/task-###/`; callers cannot supply an evidence root.
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
canonical-import gates. Caller path overrides fail.

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
// smoke-evidence.d.mts
declare const verifiedTask545Checkpoint: unique symbol;
export type VerifiedTask545Checkpoint = Readonly<
  SmokeEvidenceCheckpointV1 & { [verifiedTask545Checkpoint]: true }
>;
export type Task545ClosureIdentity = Readonly<{
  taskId: TaskId; runId: string; checkpointSha256: string;
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

// smoke-evidence.mjs runtime contract
export async function resolveCanonicalEvidenceDirectory(repoRoot, expectedTask) {
  requireRepoTaskId(expectedTask); // TASK-[0-9]{3}, plus sole TASK-9999 sentinel
  const realRepoRoot = await requireRealGitTopLevel(repoRoot);
  const expected = join(
    realRepoRoot,
    "_docs/_workflows/_smoke/evidence",
    expectedTask.toLowerCase()
  );
  await rejectSymlinkedExistingComponents(realRepoRoot, expected);
  return expected;
}

export async function computeWorkingTreeRevision(repoRoot, expectedTask) {
  const evidenceRoot = await resolveCanonicalEvidenceDirectory(repoRoot, expectedTask);
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
  requireExactExpectedRevisionOptions(options); // repo root, task, all revision fields
  const root = await resolveCanonicalEvidenceDirectory(
    options.repoRoot,
    options.expectedTask
  );
  const manifestPath = join(root, "manifest.json");
  await requireExactRealPath(dirname(manifestPath), root);
  if ((await stat(manifestPath)).size > MAX_MANIFEST_BYTES) fail("smoke_manifest_too_large");
  const raw = JSON.parse(await readFile(manifestPath, "utf8"));
  validateExactSchema(raw, smokeEvidenceSchema);
  if (raw.scenarios.length < 5) fail("smoke_scenarios_insufficient");
  if (!raw.serverUp) fail("smoke_server_down");
  if (raw.taskId !== options.expectedTask) fail("smoke_task_manifest_mismatch");
  if (!revisionEquals(raw.revision, options.expectedRevision)) fail("smoke_revision_mismatch");

  const ids = new Set();
  const adminThemes = new Set();
  const referencedFiles = ["manifest.json"];
  for (const scenario of raw.scenarios) {
    if (ids.has(scenario.id)) fail("smoke_scenario_duplicate");
    ids.add(scenario.id);
    if (scenario.consoleErrors.length !== 0) fail("smoke_console_errors");
    if (scenario.surface === "admin") adminThemes.add(scenario.theme);
    if (!scenario.assertions.every((a) => a.pass === true)) fail("smoke_assertion_failed");
    for (const shot of scenario.screenshots) {
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
    revision: raw.revision,
    scenarios: raw.scenarios.length,
    referencedFiles: referencedFiles.sort(),
  };
}

export async function auditSmokeEvidenceDirectory(options) {
  const taskDir = await resolveCanonicalEvidenceDirectory(
    options.repoRoot,
    options.expectedTask
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
    "runtimeResult"]);
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
  const revision = await computeWorkingTreeRevision(options.repoRoot, options.expectedTask);
  const result = await auditSmokeEvidenceDirectory({
    ...options,
    expectedRevision: publicRevision(revision),
    requireCheckpoint: false,
    requireTracked: false,
  });
  const checkpoint = exactCheckpoint({
    schemaVersion: 1,
    taskId: options.expectedTask,
    runId: deterministicRunId(options.expectedTask, result, revision),
    workflowEntry,
    evidenceDirectory: canonicalRepoRelativeEvidencePath(options.expectedTask),
    manifestSha256: sha256(await readCanonicalManifest(options)),
    evidenceFiles: await hashSortedReferencedFiles(result),
    frozenRuntime: revision,
    closureContract: {
      taskFiles: await listExactPhysicalTaskFamilyFiles(
        options.repoRoot,
        options.expectedTask
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
  const executingWorkflowEntry = await requireTaskBoundOwningWorkflow(options);
  const canonicalPath = canonicalCheckpointPath(options.repoRoot, options.expectedTask);
  requireExactPath(options.checkpointPath, canonicalPath);
  const bytes = await readCappedFileNoSymlink(canonicalPath);
  timingSafeRequireSha256(bytes, options.checkpointSha256);
  const checkpoint = validateExactSchema(JSON.parse(bytes), checkpointSchema);
  requireTaskAndRun(checkpoint, options.expectedTask, options.runId);
  requireExecutingWorkflowEntry(
    options.repoRoot,
    checkpoint.workflowEntry,
    executingWorkflowEntry
  );
  requireRevisionEquals(
    checkpoint.frozenRuntime,
    await computeWorkingTreeRevision(options.repoRoot, options.expectedTask)
  );
  await auditSmokeEvidenceDirectory({
    repoRoot: options.repoRoot,
    expectedTask: options.expectedTask,
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
  const executingWorkflowEntry = await requireTaskBoundOwningWorkflow(options);
  const checkpoint = await readVerifyCheckpointIdentityAndWorkflow({
    ...options, executingWorkflowEntry,
  });
  let current = await computeWorkingTreeRevision(options.repoRoot, options.expectedTask);
  await requireEvidenceHashesAndTrackedParity(checkpoint, options);
  let pair = await inspectBoundOrderedChangelogPair(checkpoint, options, {
    validStates: ["none", "file-only", "both"],
    rejectIndexOnlyCorruptOrMultiple: true,
  });
  if (pair.state === "none" && pair.staleBoundTempOrJournalOnly) {
    await cleanStaleBoundTransactionArtifactsAndFsyncDirectory(pair);
    current = await computeWorkingTreeRevision(options.repoRoot, options.expectedTask);
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
    current = await computeWorkingTreeRevision(options.repoRoot, options.expectedTask);
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
  const current = await computeWorkingTreeRevision(repoRoot, closureIdentity.taskId);
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

// Owning workflow API only; no CLI/API workflow-entry override exists:
// await requireTask548CommittedSixPathBootstrapAuthorizationV1({
//   repoRoot, receipt: committedExactSixPathReceipt }) // TASK-548 only, immediately first
// createResumeCheckpoint({ repoRoot, expectedTask, pinnedChangelogNumber,
//   pinnedChangelogSlug, expectedWorkflowRole,
//   executingImportMetaUrl: import.meta.url, runtimeResult })
// -> {pass:false,code:"owner_action_required",action:"review_and_stage_evidence",
//     taskId,evidenceDirectory,checkpointPath,checkpointSha256,runId,resumeArgv,
//     resumeCommand,frozenRuntimeRevision}
// Diagnostic only (never the owner closure command):
// node smoke-evidence.mjs validate-tracked --repo-root <root> --task TASK-###
//   --checkpoint <canonical-path> --checkpoint-sha256 <sha> --run-id <run-id>
//   --audit-directory --require-tracked
// node smoke-evidence.mjs closure-delta --repo-root <root> --task TASK-###
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
  inspect screenshots, manifest and checkpoint for visible correctness and secret/PII safety
  stage only the reviewed task evidence directory; do not stage source/task metadata here
  invoke the returned owning-workflow resume argv with the unchanged checkpoint hash/run ID

resumed agent:
  verify exact canonical checkpoint path/hash/schema/task/run/owning workflow
  run --audit-directory --require-tracked with manifest/screenshots/checkpoint parity
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
physical task-family files for that exact task, exact `_docs/_TASKS/README.md`, the exact
pinned/date-resolved changelog file, and exact `_docs/_CHANGELOG/README.md`. Allowlist
membership comes from the checkpoint's frozen task-file list and immutable pinned
number/slug. `openWorkflowClosureResume` computes the current revision before resolving
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
duplicate scenario IDs, invalid surface/theme/dimensions/timestamps/hash grammar,
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
deleted-file revision digests; evidence-directory self-exclusion derived only from the real
repository root/task; rejection of an alternate same-basename root, external root,
symlinked component, traversal and prefix lookalike; mandatory task/path/HEAD/dirty/digest
matching; changed byte/hash; missing/untracked/unreferenced file; oversized manifest/
screenshot; console error; failed assertion; duplicate ID; and unknown key.

The same suite covers phase-1 checkpoint schema/caps/safe contents/atomic no-overwrite and
the exact `owner_action_required` resume payload; resume failure before owner staging;
success after staging only manifest/screenshots/checkpoint; wrong task/run/hash/path,
wrong owning/executing workflow entry, unsafe shell arguments, tampered checkpoint, stale
revision, extra tracked file, and non-evidence staging; execution of the exact returned argv;
repeated pre-closure resume success with no byte/status mutation; crash recovery from an
allowlisted partial closure; completed-closure replay without duplicate metadata; and
prevention of every implementation/fix/post-audit/smoke dispatch on resume.
Both `frozen` and `metadata_recovery` fixtures call the exact owner export
`writeOrResumeOrderedDurableChangelogFileThenIndexV1` with literal marker
`ordered-durable-changelog-file-then-index@v1`; a task-local alias, skipped recovery call,
wrong marker, or index-before-file implementation fails.
Entry fixtures retain every exact built-in and cover all future suffixes plus TASK-9999;
caller override, wrong task/suffix, untracked/dirty/HEAD-mismatched, symlink/non-regular,
and static/import failures reject. TASK-548 fixtures require the TASK-545-owned current-HEAD,
exact-six-path committed-bootstrap gate immediately before the exact-argument phase-1 call;
missing/stale/wrong-entry receipts, reordering, an intervening action, an unknown phase-1
option, or passing the receipt into `createResumeCheckpoint` rejects.
TASK-548 fixtures also round-trip the exact receipt, mutate every root/nested
key, path/order/hash/HEAD/parent/aggregate/workflow entry, and prove the branded
receipt is returned only after live Git direct-parent/diff/tracked-byte checks.
Child-process fixtures kill after every journal/temp
write, file fsync, rename, and directory-fsync boundary. They prove only none/file-only/
both recover, stale temp/journal-only cleanup restarts safely, file-only completes the
index once, both validates, bound residue accompanying either state is cleaned only after
identity verification, and index-only/corrupt/multiple state fails. A UTC rollover
after the no-replace changelog write retains its date. Strict path/body/row mismatches fail
before allowlist validation.
Type fixtures import the three exact owner exports plus `Task545ClosureResume`,
pin both discriminants/state-specific fields, and reject widened/local substitute shapes.
Metadata-delta cases prove task-family/index/exact pinned-changelog edits pass while source,
tests, config, runtime/security docs, workflow/evidence, HEAD, another task/changelog,
new same-family task files absent from the frozen list, wrong number/slug/date, traversal,
and prefix-lookalike changes fail. Repeated delta validation is idempotent and
returns a deterministic sorted path list. L02 does not reopen this test file; it runs the
suite after changing `.gitignore` and separately asserts ignore behavior with shell exit
codes.

## Validation

```bash
node --check _docs/_workflows/lib/smoke-evidence.mjs
node _docs/_workflows/lib/smoke-evidence.mjs --help
bun test tests/unit/workflows/smokeEvidence.test.ts
bun run lint:repo:types
git diff --check
```
