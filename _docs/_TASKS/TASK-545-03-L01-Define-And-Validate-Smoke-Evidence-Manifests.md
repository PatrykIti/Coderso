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

## Implementation Pseudocode

```js
export async function resolveCanonicalEvidenceDirectory(repoRoot, expectedTask) {
  requireExactTaskId(expectedTask); // exactly TASK-[0-9]{3}
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

export async function createResumeCheckpoint(options) {
  requirePinnedClosureIdentity(
    options.pinnedChangelogNumber,
    options.pinnedChangelogSlug,
    options.expectedTask
  );
  const workflowEntry = await requireOwnedWorkflowEntry(
    options.repoRoot,
    options.workflowEntry,
    options.expectedTask
  );
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
  const canonicalPath = canonicalCheckpointPath(options.repoRoot, options.expectedTask);
  requireExactPath(options.checkpointPath, canonicalPath);
  const bytes = await readCappedFileNoSymlink(canonicalPath);
  timingSafeRequireSha256(bytes, options.checkpointSha256);
  const checkpoint = validateExactSchema(JSON.parse(bytes), checkpointSchema);
  requireTaskAndRun(checkpoint, options.expectedTask, options.runId);
  requireExecutingWorkflowEntry(
    options.repoRoot,
    checkpoint.workflowEntry,
    options.executingWorkflowEntry
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

export async function openWorkflowClosureResume(options) {
  const checkpoint = await readVerifyCheckpointIdentityAndWorkflow(options);
  await requireEvidenceHashesAndTrackedParity(checkpoint, options);
  const closureIdentity = resolvePinnedClosureIdentityFromCheckpoint(
    checkpoint,
    options.repoRoot,
    nowUtc()
  );
  const current = await computeWorkingTreeRevision(options.repoRoot, options.expectedTask);
  if (revisionEquals(current, checkpoint.frozenRuntime)) {
    return { state: "frozen", checkpoint, closureIdentity };
  }
  // This also supports crash recovery: it accepts any subset of the exact frozen
  // task/index/pinned-changelog allowlist, but no source/workflow/evidence/HEAD delta.
  const delta = await validateMetadataOnlyClosureDelta(checkpoint, closureIdentity);
  return { state: "metadata_recovery", checkpoint, closureIdentity, delta };
}

export async function validateMetadataOnlyClosureDelta(checkpoint, options) {
  await requireCheckpointAndEvidenceStillExact(checkpoint, options);
  const current = await computeWorkingTreeRevision(options.repoRoot, options.expectedTask);
  if (current.gitHead !== checkpoint.frozenRuntime.gitHead) fail("smoke_head_changed");
  const changed = diffCanonicalRecords(checkpoint.frozenRuntime.records, current.records);
  const allowlist = buildExactClosureMetadataAllowlist({
    frozenContract: checkpoint.closureContract,
    pinnedChangelogPath: options.pinnedChangelogPath,
    closureUtcDate: options.closureUtcDate,
  });
  if (changed.some((entry) => !allowlist.has(entry.path))) {
    fail("smoke_non_metadata_delta");
  }
  return {
    pass: true,
    taskId: options.expectedTask,
    runId: checkpoint.runId,
    closureMetadataRevision: publicRevision(current),
    changedPaths: uniqueSorted(changed.map((entry) => entry.path)),
  };
}

// Exact validator CLI stages; repoRoot/task are always explicit and evidence paths derived:
// node smoke-evidence.mjs phase1 --repo-root <root> --task TASK-### --audit-directory
//   --changelog-number <pinned-number> --changelog-slug <pinned-safe-slug>
//   --workflow-entry <canonical-repo-relative-owning-workflow.mjs>
// -> {pass:false,code:"owner_action_required",action:"review_and_stage_evidence",
//     taskId,evidenceDirectory,checkpointPath,checkpointSha256,runId,resumeArgv,
//     resumeCommand,frozenRuntimeRevision}
// Diagnostic only (never the owner closure command):
// node smoke-evidence.mjs validate-tracked --repo-root <root> --task TASK-###
//   --checkpoint <canonical-path> --checkpoint-sha256 <sha> --run-id <run-id>
//   --executing-workflow-entry <checkpoint-entry> --audit-directory --require-tracked
// node smoke-evidence.mjs closure-delta --repo-root <root> --task TASK-###
//   --checkpoint <canonical-path> --checkpoint-sha256 <sha> --run-id <run-id>
//   --pinned-changelog <exact-repo-relative-path> --closure-utc-date YYYY-MM-DD
// Exit 0 only for validate-tracked/closure-delta success; owner_action_required exits with the
// documented pause code, and every failure is structured JSON without raw identities.
```

## Two-phase evidence lifecycle

```text
agent after smoke:
  run the exact phase1 CLI with repo root + task; it derives the canonical directory
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
resume validation is read-only and idempotent; the owning closure branch may perform only
the separately bounded metadata writes. The returned command re-enters exactly the checkpoint-owned workflow's
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
number/slug; the date-resolved path must match the explicit UTC closure date. Matching is
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
- A checkpoint conflict is never overwritten, and a successful resume never mutates state.
- Closure-delta success permits only bounded metadata drift; it never blesses source drift.

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
git diff --check
```
