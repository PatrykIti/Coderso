# TASK-545-03-L03: Checkpoint and Owner Resume

# FileName: TASK-545-03-L03-Checkpoint-And-Owner-Resume.md

**Parent Task:** TASK-545
**Parent Subtask:** TASK-545-03
**Priority:** High
**Category:** Workflow Evidence / Checkpoint / Resume Integrity
**Estimated Effort:** Medium
**Dependencies:** TASK-545-03-L01
**Status:** ✅ Done
**Completed:** 2026-08-14
**Changelog:** 1257 (pinned; closure only)
**Split From:** TASK-545-03-L01 (2026-08-13)

---

## Overview

Own the phase-1 owner-review checkpoint, the exact-path/hash tracked resume, and
the canonical closure-resume state machine. This leaf was split out of
TASK-545-03-L01 on 2026-08-13 so that the shared `lib/smoke-evidence.mjs` stays
below the 1,000-line gate. It consumes the manifest/validator surface from
TASK-545-03-L01 and produces the checkpoint that TASK-545-03-L04 consumes for
closure metadata/delta.

Phase 1 never claims durability; tracked resume is the only tracked-evidence
pass. `createResumeCheckpoint` validates identity/schema/file set/hashes,
atomically writes a strict `resume-checkpoint.json` without overwriting or
staging it, and returns an exact `owner_action_required` pause payload. The
repository owner reviews and stages only the canonical evidence directory, then
re-enters the owning workflow with the unchanged checkpoint hash/run ID.
`resumeTrackedEvidence` verifies exact canonical path/hash/schema/task/run/
owning workflow and tracked parity, and `openWorkflowClosureResume` returns the
canonical `none | file-only | both` resume state that the closure branch
consumes.

## Sub-Tasks

None; this is an executable leaf with the exclusive file ownership below.

## Exclusive ownership

- existing `_docs/_workflows/smoke-evidence-checkpoint.schema.json` (checkpoint
  schema; owned with TASK-545-03-L01 for the manifest schema sibling)
- new `_docs/_workflows/lib/smoke-evidence-checkpoint.mjs` (all checkpoint/resume
  exports: `createResumeCheckpoint`, `resumeTrackedEvidence`,
  `openWorkflowClosureResume`, `requireTaskBoundOwningWorkflow`, and their
  private helpers)
- new `_docs/_workflows/lib/smoke-evidence-checkpoint.d.mts` (checkpoint/closure
  type declarations below)
- `_docs/_workflows/lib/smoke-evidence.mjs` ONLY as a thin re-export surface:
  `export { createResumeCheckpoint, resumeTrackedEvidence,
  openWorkflowClosureResume, requireTaskBoundOwningWorkflow } from
  "./smoke-evidence-checkpoint.mjs"` (a few lines; the 1,000-line gate is why
  this leaf was split from L01, so the shared module must never absorb the
  checkpoint implementation)
- `_docs/_workflows/lib/smoke-evidence.d.mts` ONLY as a thin re-export type
  surface mirroring the `.mjs` re-export
- new `tests/unit/workflows/smokeEvidenceCheckpoint.test.ts`
- test fixtures under `tests/fixtures/workflows/smoke-evidence/checkpoint/`

TASK-545-03-L01 owns the manifest schema and validator; TASK-545-03-L04 owns the
closure metadata/delta writer and `closure-delta` CLI; TASK-545-03-L05 owns the
TASK-548 bootstrap gate. This leaf is the sole owner of the checkpoint/resume
artifacts.

## Implementation Pseudocode

The named types below are the moved exports previously declared in
TASK-545-03-L01; the companion `_docs/_workflows/lib/smoke-evidence.d.mts`
declares them and the runtime exports them from `smoke-evidence.mjs`.

```ts
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
```

`createResumeCheckpoint` returns exactly the pause payload

```
{ pass: false, code: "owner_action_required",
  action: "review_and_stage_evidence",
  taskId, evidenceDirectory, checkpointPath, checkpointSha256, runId,
  resumeArgv, resumeCommand, frozenRuntimeRevision }
```

`resumeArgv` and `resumeCommand` re-enter the same owning workflow closure-only
branch with the unchanged checkpoint path/hash/run ID; no caller path, date, or
workflow override is accepted. The standalone `validate-tracked` diagnostic is
never the owner closure entrypoint.

## Checkpoint and resume lifecycle

Phase 1 validates exact manifest/present-file parity, revision, and hashes, then
atomically creates the strict `resume-checkpoint.json` beside the manifest
without staging it. Atomic creation is create-only with same-directory
temp + fsync + rename + directory fsync; an existing checkpoint is never
overwritten. The checkpoint contains only safe identity/integrity metadata:
schema version, task/run identity, canonical repository-relative evidence
directory, manifest hash, sorted evidence file paths/hashes, the frozen runtime
revision, sorted status/path/mode/content-hash records outside evidence, the
exact frozen physical task-family file list plus pinned changelog number/safe
slug, the exact canonical owning workflow entry, and phase-1 state/timestamp. It
never contains file bodies, command output, environment values, or agent
payloads.

The owner inspects report, screenshots, manifest, and checkpoint for visible
correctness and secret/PII safety, stages only the reviewed evidence directory,
and invokes the returned resume argv. `resumeTrackedEvidence` re-derives the
canonical checkpoint path from the real repository root/task/session, requires
the exact caller path, verifies the SHA-256 in constant time, validates the
checkpoint schema, requires exact task/session/run and the exact executing
workflow entry, re-computes and compares the frozen revision, runs the directory
audit with `requireCheckpoint`/`requireTracked`, and re-hashes every referenced
file. It is read-only, idempotent, and replay-safe: repeated pre-closure resume
returns the same pass without byte/status mutation.

`openWorkflowClosureResume` computes the current revision before resolving an
identity. Only `none`, `file-only`, and `both` are valid canonical states. Bound
temp/journal-only residue is cleaned and directory-fsynced, the revision
recomputed, and `frozen` is returned only when no canonical closure metadata
delta remains; residue never supplies date authority. A changed revision must,
before allowlist/delta validation, discover exactly one regular non-symlink
changelog whose path/body matches checkpoint task/number/slug and canonical
date, with zero matching index rows for `file-only` or exactly one matching
row/date for `both`. Index-only, corruption, duplicate/mismatched rows, zero/
multiple files, non-regular files, and symlinks fail closed. The returned
`closureIdentity` is the only date/path authority consumed by the owning
workflow; callers never resolve it again. Verified bound temp/journal residue
accompanying `file-only` or `both` is identity-checked, removed, and
directory-fsynced before the current revision and unchanged canonical state are
recomputed; transient paths never join the allowlist.

## Error/compatibility flow

- Phase 1 never claims durability; tracked resume is the only tracked-evidence pass.
- The agent never invokes `git add`. A missing/untracked phase-2 file returns
  `smoke_owner_stage_required` and keeps closure open.
- A checkpoint conflict is never overwritten; validation never mutates
  checkpoint, evidence, or canonical metadata, apart from the explicit
  stale-transient cleanup.
- A wrong task/run/workflow/hash, tampered checkpoint, stale non-metadata
  revision, non-canonical path, extra tracked file, non-evidence staging, or a
  resume routed through implementation/fix/post-audit/smoke dispatch returns a
  machine-readable failure. Missing owner staging remains a machine-readable
  pause, never a downgraded pass.

## Regression-test shape owned by this leaf

`tests/unit/workflows/smokeEvidenceCheckpoint.test.ts` owns checkpoint fixtures
and reuses the TASK-545-03-L01 temporary Git-repository corpus:

- checkpoint schema/caps/safe contents/atomic no-overwrite and the exact
  `owner_action_required` resume payload;
- resume failure before owner staging and success after staging only
  report/manifest/screenshots/checkpoint;
- wrong task/run/hash/path, wrong owning/executing workflow entry, unsafe shell
  arguments, tampered checkpoint, stale revision, extra tracked file, and
  non-evidence staging;
- execution of the exact returned argv;
- repeated pre-closure resume success with no byte/status mutation;
- crash recovery from an allowlisted partial closure;
- completed-closure replay without duplicate metadata; and
- prevention of every implementation/fix/post-audit/smoke dispatch on resume.
- Checkpoint fixtures prove the supplemental list is strict and frozen: TASK-414
  receives exactly TASK-406, every other task receives `[]`, TASK-406 may change
  only during the TASK-414 metadata-only closure, and a caller-supplied,
  unknown, extra, prefix-lookalike, untracked, symlinked, or non-regular
  supplemental path fails closed.

Both `frozen` and `metadata_recovery` fixtures pin the two `Task545ClosureResume`
discriminants and their state-specific fields, and reject widened/local
substitute shapes. Type fixtures import the exact owner exports and reject
widened checkpoint/closure-identity shapes. Kill/recovery and ordered-durable
changelog marker fixtures belong to TASK-545-03-L04, not this leaf.

## Testing Requirements

```bash
node --check _docs/_workflows/lib/smoke-evidence.mjs
node --check _docs/_workflows/lib/smoke-evidence-checkpoint.mjs
bun test tests/unit/workflows/smokeEvidenceCheckpoint.test.ts
bun test tests/unit/workflows/smokeEvidence.test.ts
bun run lint:repo:types
git diff --check
wc -l _docs/_workflows/lib/smoke-evidence.mjs \
  _docs/_workflows/lib/smoke-evidence-checkpoint.mjs \
  _docs/_workflows/lib/smoke-evidence.d.mts \
  _docs/_workflows/lib/smoke-evidence-checkpoint.d.mts \
  tests/unit/workflows/smokeEvidenceCheckpoint.test.ts
```

## Documentation Updates Required

- No guidance file is edited here; TASK-545-03-L02 owns the evidence guide and
  the generic cookbook recipe.
- Record closure only in changelog 1257 and the TASK-545 board family through
  TASK-545-04-L03.
