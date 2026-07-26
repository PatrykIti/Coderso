# TASK-548-08: Multi-Agent Workflow and Drift Evidence
# FileName: TASK-548-08-Multi-Agent-Workflow-And-Drift-Evidence.md

**Parent Task:** TASK-548
**Priority:** Critical
**Category:** Workflow / Contract Audit / Collision Safety
**Estimated Effort:** Large
**Dependencies:** TASK-545 must be exactly `✅ Done`; TASK-547 must be terminal;
the TASK-548 parent literal overlap/serialization amendment must land before the
bounded workflow-infrastructure bootstrap; the committed bootstrap and a fresh
five-round authoring PASS are required before product implementation; runs
throughout TASK-548
**Status:** ⏳ To Do

---

## Overview

Own reproducible author, audit, implementation, fix, post-audit, and smoke
orchestration. This child writes tracked workflow wrappers/contracts/tests and
returns bounded in-process gate outcomes to 07; all product, product-test, docs,
canonical evidence, task-board, status and changelog edits remain with 01..07
single writers.

Product implementation begins only after the bounded workflow-infrastructure
bootstrap, five fresh sequential authoring rounds, and a fresh reconcile report
with zero HIGH/MEDIUM drift. The bootstrap is the sole pre-authoring-audit
implementation exception; it grants no product/source or status-write authority.
Missing, timed-out, malformed, or unparseable agent output fails the round; it
never creates a clean pass.

The current local/provisional TASK-548 authoring helper and any evidence it
produced before TASK-545 reaches `✅ Done` are non-authorizing research only.
It cannot be promoted by tracking its current ignored bytes. After both
dependency gates and the landed parent amendment, rebuild all six exact files
below against the tracked TASK-545 drivers and run only their pre-commit gates,
then hand their exact reviewed bytes to the owner for checkpoint/commit. Run the
separate post-commit tracked/HEAD-parity/clean-worktree gates from the resulting
new HEAD. Only five fresh rounds plus reconcile after that complete post-commit
pass may authorize product implementation. These are mutually exclusive modes:
`task548-bootstrap-build` must end after the owner checkpoint, while only a new
`task548-bootstrap-committed-resume` may validate the commit and continue; the
resume mode never rebuilds or reruns pre-commit gates.

## Exclusive Ownership and Collision Guards

- `_docs/_workflows/lib/task-548-contract.mjs`;
- `_docs/_workflows/task-548-author-audit.mjs`;
- `_docs/_workflows/task-548-fix.mjs`;
- `_docs/_workflows/task-548-implement.mjs`;
- `tests/unit/workflows/task548AuthorAudit.test.ts`;
- `tests/unit/workflows/task548WorkflowContracts.test.ts`.

The pre-authoring authorization order is exactly:

1. require TASK-545 to be exactly `✅ Done`;
2. require TASK-547 to be terminal;
3. require the TASK-548 parent amendment with every literal TASK-547 overlap,
   serialized owner, and matching forbidden-path guard to be landed;
4. select only `task548-bootstrap-build` and use the sole bounded pre-audit
   exception to rebuild only the six paths above,
   importing the tracked TASK-545 owners; before any owner checkpoint/commit,
   require only the exact six-file write set and forbidden-path gate, Node
   syntax checks, targeted workflow tests, line counts, and `git diff --check`;
5. hand the strict bounded TASK-548/schema/resume-mode checkpoint owner action,
   prior 40-hex HEAD, exact six sorted path/SHA-256 records, canonical aggregate,
   base64url checkpoint/hash and authoritative resume argv to the owner; only the
   owner stages and commits exactly those six paths; return immediately;
6. in a new invocation select only `task548-bootstrap-committed-resume`, strictly
   decode and timing-safe verify its current-process checkpoint, then require the
   new HEAD to be one exact single-parent commit over its recorded prior HEAD with
   the exact six-path diff,
   `git ls-files --error-unmatch` for all six paths, clean status and unstaged/
   staged diffs, `git show HEAD:<path>` byte parity for every path, and the
   clean-checkout/worktree tests; none of these post-commit gates may be required
   of the uncommitted rebuild; this mode cannot call rebuild/pre-commit helpers;
7. only after that complete post-commit gate passes, run five mandatory fresh
   sequential authoring rounds, each with exactly one fresh reconcile, and
   require the final round to PASS with zero unresolved HIGH/MEDIUM findings;
   and
8. authorize only then the unchanged product implementation order
   `01 → 02 → 03 → 04 → 05 → 06 → 07`, while these wrappers orchestrate
   throughout.

TASK-548-08 remains `⏳ To Do` during bootstrap. The exception cannot edit any
01..07 product/source/test path, task contract, product/developer documentation,
changelog, status, or evidence byte and cannot dispatch product implementation.
Any later change to one of the six bootstrap artifacts, any TASK-548 task
contract, or an imported TASK-545 driver invalidates every authoring round and
requires all five rounds plus reconcile again from the resulting new HEAD.

The checkpoint is capped at 16,384 decoded bytes and encoded as canonical
unpadded base64url JSON. Strict schemas reject unknown/missing fields, duplicate
arguments/records/paths, unsorted or non-exact paths, malformed hashes/mode/task,
non-canonical transport, aggregate/hash mismatch, and a stale prior HEAD. Only
committed-resume decodes it; build emits the exact owner action and terminates.

Every 01..07 source/test/docs/task/changelog/screenshot path is forbidden.
Scripts may dispatch scoped writers but never mutate those files directly.
Only 07-L01 writes changelog 1261, closeout, the canonical manifest, and exactly
eight acceptance screenshots; TASK-545 `createResumeCheckpoint` phase 1 alone
writes `resume-checkpoint.json`. 08 verifies their receipt/hashes read-only and
returns bounded structured round/post-audit outcomes for current-process gating
plus the first-attempt post-resume structured final-drift result. No pre-pause
agent/runtime payload is claimed to survive either the release action or the
checkpoint owner action. Fresh release-resume authority comes only from its
strict current-process CLI fields plus revalidated committed HEAD/tree and
immutable release/deployment receipts. Post-resume closeout
uses only verified checkpoint identity/frozen revision/closure contract,
canonical manifest/eight screenshots, deterministic current frozen on-disk
product/task facts and durable repository receipts, and the existing
non-authorizing planning-audit record. It never reconstructs historical
authoring/post-audit, page-error, network, bundle/health, or cleanup outcomes
and never serializes dynamic final-drift findings/resolutions. None of these
values extend TASK-545 manifest/checkpoint schemas or create a standalone
evidence file. There is no separate 08 evidence tree. The only canonical
TASK-548 evidence directory is
`_docs/_workflows/_smoke/evidence/task-548/`, with the split byte ownership
defined above.

Only during step 4 above may the four task-specific workflow modules and both
exact tests be created. Before the authoring audit, they must be committed,
tracked, byte-identical to `HEAD`, and present after a clean checkout.
`.gitignore` is never a reason to depend on an untracked local helper, ignored
test fixture, or workflow script. The provisional helper is a research input
only: it must be rebuilt as part of the exact six-file set and cannot be
promoted or authorize a run by merely adding its existing bytes. The wrappers
import the tracked TASK-545 shared contracts rather than copying count-only
logic:

```text
_docs/_workflows/lib/workflow-contracts.mjs
_docs/_workflows/lib/audit-rounds.mjs
_docs/_workflows/lib/post-audit.mjs
_docs/_workflows/smoke-evidence.schema.json
_docs/_workflows/smoke-evidence-checkpoint.schema.json
_docs/_workflows/lib/smoke-evidence.mjs
_docs/_workflows/lib/smoke-evidence.d.mts
tests/unit/workflows/workflowContracts.test.ts
tests/unit/workflows/auditRounds.test.ts
tests/unit/workflows/postAudit.test.ts
tests/unit/workflows/workflowStaticContract.test.ts
tests/unit/workflows/smokeEvidence.test.ts
```

The wrappers call the exact owner exports `requireAllResults`,
`runCanonicalAuditRounds`, `runCanonicalPostAudit`,
`createResumeCheckpoint`, `openWorkflowClosureResume`, and
`validateMetadataOnlyClosureDelta`, plus `VerifiedTask545Checkpoint`,
`Task545ClosureIdentity`, `VerifiedTask545MetadataRecoveryDelta`, and the typed
resume union. Both closure branches import and call
`writeOrResumeOrderedDurableChangelogFileThenIndexV1` directly with literal
`ordered-durable-changelog-file-then-index@v1`; no TASK-548 alias may mediate it.
Missing/untracked owner modules/tests,
any TASK-545 status other than `✅ Done`, or a local substitute blocks before
dispatch.

Before dispatch, TASK-547 is terminal. Amend the parent with every literal final
overlapping user/developer/shared-doc path, then serialize its single writer.
In particular, 07 cannot concurrently share
`_docs/ASSISTANT_SITE_BUILDER.md`, `_docs/CMS_API.md`,
`_docs/ARCHITECTURE.md`, or `_docs/SECURITY_SPEC.md` with TASK-547.
Ambiguous, wildcard, missing, or concurrent ownership blocks.

## Five-Round Authoring Audit Contract

Each of rounds 1 through 5 executes, in order:

1. fingerprint the exact task-file set, HEAD, and relevant dirty-worktree scope;
2. dispatch one parallel job set containing one fresh-context read-only audit
   per task file plus exactly one fresh cross-subtask reconcile; the reconcile
   independently reads the same on-disk contract and never consumes per-file
   agent results;
3. call `requireAllResults` once for the complete trusted identity set containing
   every `file:<repo-relative-path>` identity plus `reconcile`;
4. fingerprint again, reject any revision change, then verify and classify every
   structured finding against current files/diff;
5. optionally dispatch scoped per-file fixers plus one cross-file fixer for
   actionable findings; the next round fingerprints and reads fresh bytes;
6. return a bounded structured round result including HEAD and dirty-worktree scope,
   used only for current-process authorization. It is never claimed to survive
   owner pause, persisted for closeout, added to the manifest/checkpoint, or
   written as a separate evidence file.

A clean round never shortens the minimum. Fixes invalidate prior passes; the next
round reads fresh bytes and again dispatches the full parallel per-file plus
reconcile job set. At or after round 5, only a complete canonical round with no
actionable findings may authorize implementation; there is no standalone
reconcile that bypasses the shared driver.

## Pre-TASK-545 Planning-Audit History (Non-authorizing)

**Window / rerun state:** 2026-07-23–24; awaiting the mandatory fresh post-TASK-545 rerun.

**Observed HEAD checkpoints:** `d3286d6a` → `2a82d460` → `7af0fc62` → `e168df0e` → `9d439824` → `7a4665f0` → `741f61a8` → `ef2578f8` → `33e1c0e0` (the final value remained current while this record was written).

**Scope:** 26 TASK-548 files (1 parent + 8 children + 17 executable leaves), pinned changelog 1261, and the minimal TASK-545 dependency amendments. Concurrent TASK-539 work and owner notes `1.md`/`2.md`/`3.md` were preserved and excluded whenever present.

**Rounds 1–4:** established the strict corpus, visual, Help/Guide, portal, release, migration, closure and ownership foundations.
**Round 5:** corrected atomic loader/targets/release/migration contracts and made TASK-545/TASK-547/bootstrap blockers explicit.
**Round 6:** fixed identity, durable publication, `sourceHash`, CLI, preview, portal, baseline, coverage and closure drift.
**Round 7:** fixed localized paths, preparing states, validators/scripts/Docker, wildcard scope, portal/release and TASK-545 integration.
**Rounds 8–9:** verified and repaired respectively `2 HIGH + 4 MEDIUM` and `2 HIGH + 2 MEDIUM` findings.
**Round 10 family / final planning pass:** repaired promotion leases, CI recovery, parsers, reindex, DB-only Guide, path-free projections/hydration/client assets, Cloudflare publication, same-handle loaders, workflow recovery, release-tree binding, restartable per-source migration and durable artifact/coverage pairs; the last parallel pass reported `5 HIGH + 14 MEDIUM + 4 LOW`, all were repaired and locally rechecked after subagent quota exhaustion. This record and any ignored helper remain planning evidence only, not a canonical TASK-545 round result.
**Implementation authorization:** none. TASK-545 is still `⏳ To Do`; TASK-547 terminal/literal-overlap amendment, the tracked exact-six bootstrap, and five fresh canonical shared-driver rounds on unchanged bytes remain mandatory. The future workflow never rewrites this history or infers missing structured results from it.

## Cross-Subtask Reconcile Matrix

- exclusive writer paths, forbidden paths, changelog 1261 and the exact
  execution constant below; operational 01-L02 calls do not transfer ownership
  or change TASK-548 status;
- exact discriminator, shared types/enums, stable IDs, targets and present-only rules;
- generated bundle/assets, renderer imports, Admin helpers, portal/release paths;
- shared permission/locale/version semantics, error codes, clamp/budget limits,
  hash algorithms and deterministic ordering;
- exact helper names defined by owners and consumed downstream;
- scenario/receipt/coverage identities, promised test filenames and commands;
- TASK-547 guide-path serialization and TASK-545 workflow-harness dependency;
- closure ownership, acceptance scenario order and screenshot/evidence paths.

```js
export const TASK_548_BOOTSTRAP_MODES = Object.freeze([
  "task548-bootstrap-build",
  "task548-bootstrap-committed-resume",
]);
export const TASK_548_INITIAL_EXECUTION_ORDER = Object.freeze([
  "01-L01",
  "01-L02-initial",
  "01-L03",
  "02-L01",
  "02-L02",
  "01-L02-post-pilot-refresh-gate",
  "02-L03",
  "03-L01",
  "03-L02",
  "03-L03",
  "04-L01",
  "04-L02",
  "04-L03",
  "05-L01",
  "05-L02",
  "06-L01",
  "01-L02-final-native-handback-gate",
  "06-L02",
  "07-L01-release-inputs-and-prerelease-gates",
  "08-prerelease-post-audit-lenses/fixes/revalidation",
  "07-L01-owner-commit-merge-tag-release-cloudflare-deploy-pause",
]);
export const TASK_548_RELEASE_RESUME_ORDER = Object.freeze([
  "07-L01-release-resume-committed-head-tree-and-receipt-validation",
  "08-release-resume-fresh-committed-head-drift-gate",
  "07-L01-runtime-docs-and-gates-preparation",
  "07-L01-final-smoke-phase1-owner-pause",
]);
export const TASK_548_CLOSURE_RESUME_ORDER = Object.freeze([
  "07-L01-owner-resume-tracked-parity",
  "08-final-read-only-drift",
  "07-L01-terminal-metadata-closeout-and-mechanical-delta-verification",
]);
```

The conditional retirement-restart invocation does not re-enter the initial array at its
beginning. After exact mode parsing, that invocation's complete dispatched order
ends at the owner release pause:

```text
07-L01-confirm-invalidated-checkpoint-retired
08-retirement-restart-fresh-current-tree-drift
derive-affected-owners-from-fresh-verified-findings
affected-owner-fixes-and-per-leaf-gates
07-L01-release-inputs-and-prerelease-gates
08-prerelease-post-audit-lenses/fixes/revalidation
07-L01-owner-commit-merge-tag-release-cloudflare-deploy-pause
```

That process terminates. Only after the owner creates the replacement release
may a separately parsed `task548-release-resume` run this distinct order:

```text
07-L01-release-resume-committed-head-tree-and-receipt-validation
08-release-resume-fresh-committed-head-drift-gate
07-L01-runtime-docs-and-gates-preparation
07-L01-final-smoke-phase1-owner-pause
```

There is exactly one post-pilot same-owner refresh after 02-L02's five pilots
and before 02-L03/TASK-548-03, and exactly one final same-owner handback after
06-L01 and before 06-L02. All seven normal-path 07 labels and both conditional
checkpoint-retirement labels invoke the same physical 07-L01 owner, which
remains the only status/changelog writer and stays open until its terminal
metadata phase. Initial execution ends at the owner commit/merge/tag/release/
Cloudflare-deploy action. Only an independently parsed fresh release-resume may
run its four labels, and that process ends at the evidence/checkpoint pause.
Only a separately parsed TASK-545 closure resume may run its three labels.
No result or object crosses either process boundary as authority.
`08-final-read-only-drift` is substantive and runs
after checkpoint-bound owner resume/tracked parity but before any terminal
status or changelog mutation. The final 07 phase then persists the bounded,
deterministic closeout, closes descendants before parents, and performs only
TASK-545's mechanical metadata-delta validation after the terminal writes.
The closure-resume labels describe the first `frozen` closure attempt. A
final-drift non-pass adds only the retirement-pause/confirmation exception
defined below. The returned restart argv selects a mutually exclusive
retirement-restart invocation whose first workflow action is
`07-L01-confirm-invalidated-checkpoint-retired`. That invocation skips
dependency/bootstrap, authoring and the already-landed full implementation
sequence; after exact ten-path absence is confirmed, it runs only the affected
owner fixes derived from a new current-tree read-only drift, their gates, and
the complete prerelease-inputs→post-audit→owner-release pause. It never reads
old unserialized findings or retired evidence. A fresh release-resume validates
the replacement release before preparation/smoke/new phase 1. Before the first
canonical changelog write, replay remains `frozen` and repeats final drift. A
crash after no-replace changelog fsync may leave valid `file-only`; after index
CAS rename/fsync it is `both`. Recovery skips smoke/final drift, validates the
exact ordered prefix and completes missing writes idempotently. Neither operational 01-L02 call
reopens or changes 01-L02 status.

## Implementation Pseudocode

```ts
import type { Task548PhasePayloadMapV1 } from "../../scripts/docs/run-acceptance-smoke.ts"; // exact 07-L01 owner export
import type { DocsReleaseTreeBindingV1 } from "../../core/services/documentation/release/docsReleaseTreeBinding";
import {
  TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1,
  requireTask548CommittedSixPathBootstrapAuthorizationV1,
  type Task548CommittedBootstrapFileV1,
  type Task548CommittedBootstrapSixFilesV1,
  type Task548CommittedSixPathBootstrapReceiptV1,
} from "./lib/smoke-evidence.mjs";
// dispatchSamePhysical07L01<L extends keyof Task548PhasePayloadMapV1>
// takes (label: L, payload: Task548PhasePayloadMapV1[L]); never redeclare the map.
const TASK_548_08_BOOTSTRAP_PATHS =
  TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1;

const TASK_548_BOOTSTRAP_CHECKPOINT_MAX_BYTES = 16_384;
type Task548BootstrapFileV1 = Task548CommittedBootstrapFileV1;
type Task548BootstrapSixFilesV1 = Task548CommittedBootstrapSixFilesV1;
type Task548BootstrapCheckpointV1 = Readonly<{
  schemaVersion: 1; taskId: "TASK-548";
  mode: "task548-bootstrap-committed-resume";
  priorHead: string; // exactly 40 lowercase hex
  files: Task548BootstrapSixFilesV1; // exact path-sorted constant membership
  aggregateSha256: string; // canonical JSON of priorHead + files
}>;
type Task548BootstrapOwnerActionRequired = Readonly<{
  pass: false; code: "owner_action_required";
  action: "commit_task548_bootstrap"; taskId: "TASK-548"; schemaVersion: 1;
  mode: "task548-bootstrap-committed-resume"; priorHead: string;
  files: Task548BootstrapSixFilesV1; aggregateSha256: string;
  checkpointBase64url: string; checkpointSha256: string;
  resumeArgv: readonly [
    "--mode", "task548-bootstrap-committed-resume",
    "--bootstrap-checkpoint", string,
    "--bootstrap-checkpoint-sha256", string
  ];
}>;

async function runTask548PrereleasePostAudit(initialPrerelease) {
  let prerelease = initialPrerelease;
  let fixApplied = false;
  let affectedOwners = [];
  const result = await runCanonicalPostAudit({
    lenses: TASK_548_POST_AUDIT_LENSES,
    runLens: runFreshPostAuditLens,
    fix: async (blocking) => {
      fixApplied = true;
      affectedOwners = await dispatchFixesToExactOwningLeavesOnce(blocking);
    },
    validate: async () => {
      await runAffectedTargetedGates(affectedOwners);
      if (fixApplied) prerelease = await dispatchSamePhysical07L01(
        "07-L01-release-inputs-and-prerelease-gates", {}
      );
    },
    fingerprint: fingerprintFinalTask548RuntimeTree,
    label: "TASK-548:prerelease-post-audit",
  });
  if (!result.pass) throw new Error("task548_prerelease_audit_not_converged");
  return { prerelease, postAudit: result };
}

// Parse this mode before every dependency/bootstrap/authoring/implementation,
// fix/gate/preparation/resume/checkpoint action. Modes cannot be mixed.
const invocation = readExactTask548InvocationModeFromCurrentProcess();
if (invocation.mode === "task548-release-resume") {
  const release = await dispatchSamePhysical07L01(
    "07-L01-release-resume-committed-head-tree-and-receipt-validation",
    { argv: invocation.argv }
  );
  const runtimeTree: DocsReleaseTreeBindingV1 = release.runtimeTree;
  const committedHeadDrift = await runFreshCommittedHeadDriftReadOnly({
    phase: "08-release-resume-fresh-committed-head-drift-gate",
    runtimeTree,
    receipts: release,
    forbidWritesAndFixes: true,
  });
  await requireZeroFindingCurrentHeadPass(committedHeadDrift, release);
  const preparation = await dispatchSamePhysical07L01(
    "07-L01-runtime-docs-and-gates-preparation",
    { release, committedHeadDrift }
  );
  const action = await dispatchSamePhysical07L01(
    "07-L01-final-smoke-phase1-owner-pause",
    { preparation }
  );
  await yieldOwnerActionRequired(action);
  return; // process ends; closure resume must be a separate invocation
}

if (invocation.mode === "task548-closure-resume") {
  const resumed = await dispatchSamePhysical07L01(
    "07-L01-owner-resume-tracked-parity",
    { argv: invocation.argv }
  );
  let closeoutInput;
  if (resumed.state === "frozen") {
    const finalDrift = await runFinalTask548DriftReadOnly({
      phase: "08-final-read-only-drift",
      frozenRuntimeRevision: resumed.checkpoint.frozenRuntime,
    });
    if (!finalDrift.pass || finalDrift.findings.length !== 0) {
      await abortResumeWithoutMetadataMutation();
      const retirement = await dispatchSamePhysical07L01(
        "07-L01-invalidated-checkpoint-owner-retirement-pause",
        { resume: resumed, finalDrift }
      );
      await yieldOwnerActionRequired(retirement);
      return;
    }
    closeoutInput = { resume: resumed, finalDrift };
  } else {
    closeoutInput = { resume: resumed };
  }
  const delta = await dispatchSamePhysical07L01(
    "07-L01-terminal-metadata-closeout-and-mechanical-delta-verification",
    closeoutInput
  );
  await handExactMetadataDeltaToOwner(delta);
  return; // the orchestrator emits exactly once; neither layer persists it
}

if (invocation.mode === "retirement-restart") {
  await requireExactMutuallyExclusiveRetirementRestartMode(invocation.argv, {
    forbidBootstrapAuthoringAndFullImplementationReplay: true,
    forbidFrozenOrMetadataRecoveryResume: true,
    forbidReleaseResume: true,
  });
  await dispatchSamePhysical07L01(
    "07-L01-confirm-invalidated-checkpoint-retired",
    { argv: invocation.argv }
  );
  const currentTreeDrift = await runFreshTask548CurrentTreeDriftReadOnly({
    phase: "08-retirement-restart-fresh-current-tree-drift",
    forbidRetiredEvidenceAccess: true,
    forbidPriorFinalDriftPayload: true,
  });
  await requireCompleteFreshRetirementDrift(currentTreeDrift);
  const affectedOwners =
    await deriveAffectedOwnersFromFreshVerifiedFindings(currentTreeDrift);
  await dispatchFreshRetirementDriftFixes(currentTreeDrift, affectedOwners);
  await runAffectedPerLeafGates(affectedOwners);
  const prerelease = await dispatchSamePhysical07L01(
    "07-L01-release-inputs-and-prerelease-gates", {}
  );
  const audited = await runTask548PrereleasePostAudit(prerelease);
  const releaseAction = await dispatchSamePhysical07L01(
    "07-L01-owner-commit-merge-tag-release-cloudflare-deploy-pause",
    { prerelease: audited.prerelease, postAudit: audited.postAudit }
  );
  await yieldOwnerActionRequired(releaseAction);
  return; // owner release then a fresh release-resume; no smoke in this process
}

if (invocation.mode === "task548-bootstrap-build") {
  await requireTask545ExactlyDone();
  await requireTask547Terminal();
  await requireLiteralTask547OverlapSerializationInTask548Parent();
  const bootstrap = await rebuildTask548WorkflowInfrastructure({
    paths: TASK_548_08_BOOTSTRAP_PATHS,
    importOnlyTrackedTask545Owners: true,
    ignoreProvisionalHelperBytes: true,
  });
  await assertExactWriteSet(bootstrap, TASK_548_08_BOOTSTRAP_PATHS);
  await assertNoProductTaskDocsChangelogStatusOrEvidenceWrite(bootstrap);
  await runTask548BootstrapPreCommitGates(bootstrap, {
    exactWriteSet: TASK_548_08_BOOTSTRAP_PATHS,
    requireForbiddenPathsClean: true, requireNodeSyntaxChecks: true,
    requireTargetedWorkflowTests: true, requireLineCountsAtMost1000: true,
    requireGitDiffCheck: true,
  });
  const ownerAction: Task548BootstrapOwnerActionRequired =
    await createExactBootstrapOwnerAction({
      bootstrap, schemaVersion: 1, taskId: "TASK-548",
      mode: "task548-bootstrap-committed-resume",
      priorHead: await requireLowercase40HexHead(),
      exactSortedPaths: TASK_548_08_BOOTSTRAP_PATHS,
      hash: "sha256", aggregateOver: "canonical-json-priorHead-and-files",
      checkpointTransport: "canonical-unpadded-base64url",
      maxCheckpointBytes: TASK_548_BOOTSTRAP_CHECKPOINT_MAX_BYTES,
    });
  await validateExactTask548BootstrapOwnerAction(ownerAction);
  await yieldBootstrapOwnerCommitRequired(ownerAction);
  return; // mandatory end: only the owner commits these reviewed bytes
}

await requireExactBootstrapCommittedResumeMode(invocation, {
  exactMode: "task548-bootstrap-committed-resume",
  forbidRebuildAndPreCommitGates: true,
  forbidReleaseClosureOrRetirementArgs: true,
});
await requireTask545ExactlyDone();
await requireTask547Terminal();
await requireLiteralTask547OverlapSerializationInTask548Parent();
const checkpoint = await decodeAndVerifyTask548BootstrapCheckpointV1({
  argv: invocation.argv,
  exactArgvShape: [
    "--mode", "task548-bootstrap-committed-resume",
    "--bootstrap-checkpoint", "<canonical-base64url>",
    "--bootstrap-checkpoint-sha256", "<64-lowercase-hex>",
  ],
  maxDecodedBytes: TASK_548_BOOTSTRAP_CHECKPOINT_MAX_BYTES,
  requireCanonicalUnpaddedBase64url: true,
  timingSafeSha256Verification: true,
  rejectUnknownMissingDuplicateFields: true,
  requireExactSchemaTaskModeAndLowercase40HexPriorHead: true,
  requireExactSixSortedUniquePathSha256Records: TASK_548_08_BOOTSTRAP_PATHS,
  requireCanonicalAggregateSha256: true,
});
const committedBootstrap: Task548CommittedSixPathBootstrapReceiptV1 =
  await requireCommittedTask548WorkflowBootstrap({
  checkpoint,
  paths: TASK_548_08_BOOTSTRAP_PATHS,
});
await requireExactSingleParentOwnerCommitAndDiff(committedBootstrap, {
  expectedOnlyParent: checkpoint.priorHead,
  exactChangedPaths: TASK_548_08_BOOTSTRAP_PATHS,
  rejectStaleCheckpoint: true,
});
await requireHeadFileHashesAndAggregateEqualCheckpoint(
  committedBootstrap,
  checkpoint
);
await requireGitLsFilesForEveryBootstrapPath(TASK_548_08_BOOTSTRAP_PATHS);
await requireCleanStatusAndUnstagedStagedDiffs();
await requireGitShowHeadByteParityForEveryBootstrapPath(
  TASK_548_08_BOOTSTRAP_PATHS
);
await runTask548BootstrapCleanCheckoutWorktreeTests({
  paths: TASK_548_08_BOOTSTRAP_PATHS,
  head: committedBootstrap.head,
});
await requireTask548CommittedSixPathBootstrapAuthorizationV1({
  repoRoot, receipt: committedBootstrap,
});
await requireTask54808Status("⏳ To Do");

const authoringBaseline = await fingerprintBootstrapTasksAndTask545Drivers();

const authoring = await runCanonicalAuditRounds({
  minimumRounds: 5,
  groups: TASK_548_TASK_FILE_GROUPS,
  auditFile: runFreshPerFileAudit,
  reconcile: runExactlyOneCrossTaskReconcile,
  fix: runOwnershipScopedFixers,
  fingerprint: fingerprintTask548ContractAndDirtyScope,
  label: "TASK-548:authoring",
});
assertAtLeastFiveCompleteSharedDriverRounds(authoring);
assertFinalRoundContainsFreshParallelReconcile(authoring);
await assertBootstrapTasksAndTask545DriversUnchanged(authoringBaseline);
await assertAuthoringGateAllowsImplementationInCurrentRun(authoring);

// The tracked TASK-548-08 wrappers orchestrate this unchanged product order.
await implementSequentiallyWithPerLeafGates(
  TASK_548_INITIAL_EXECUTION_ORDER.slice(
    0,
    TASK_548_INITIAL_EXECUTION_ORDER.indexOf(
      "07-L01-release-inputs-and-prerelease-gates"
    )
  )
);
const prerelease = await dispatchSamePhysical07L01(
  "07-L01-release-inputs-and-prerelease-gates", {}
);
const audited = await runTask548PrereleasePostAudit(prerelease);
const releaseAction = await dispatchSamePhysical07L01(
  "07-L01-owner-commit-merge-tag-release-cloudflare-deploy-pause",
  { prerelease: audited.prerelease, postAudit: audited.postAudit }
);
await yieldOwnerActionRequired(releaseAction);
return; // owner-only release action; this process must terminate here
```

**Data flow:** `task548-bootstrap-build` dependency/parent gates → exact six-file
rebuild/pre-commit gate → strict hashed checkpoint/owner action → mandatory return
→ fresh mutually exclusive `task548-bootstrap-committed-resume` decode/integrity/
single-parent exact-diff/HEAD/clean-
checkout validation with no rebuild → five fresh authoring rounds/reconcile → sequential
01..06 implementation/gates → 07 release inputs/prerelease gates → canonical
08 prerelease post-audit/fix/revalidation → owner-only commit/merge/plain-tag/
release/Cloudflare action → terminate. A fresh release-resume parses eight CLI
fields → 07 validates one bounded untouched canonical Git record stream, calls
L01's pure create/normalize/serialize API directly, produces the exact
`DocsReleaseTreeBindingV1`, and proves clean HEAD/tag plus byte-identical binding through manifest/artifact/retained/rollback/health receipts
→ 08 runs a zero-finding committed-HEAD drift gate → 07 read-only full
preparation/gates and smoke → exact manifest/eight screenshots → TASK-545
checkpoint → second owner pause and termination. The separate closure resume
does tracked parity → final drift → date-stable changelog-first closeout → 07
returns the mechanical delta and 08 emits it exactly once. No pre-pause memory
authorizes either resume. Retirement confirms exact absence, runs a new current-
tree drift, derives owners only from its verified findings, then scoped fixes/
gates and the prerelease/release path; the
replacement release-resume must pass before any new smoke/checkpoint.

**Error handling:** nonzero agent exit, missing result, duplicate result,
malformed JSON, stale HEAD/diff scope, forbidden write, conflicting owner,
failed gate, dirty unowned path, or unresolved HIGH/MEDIUM stops dispatch.
Wrong dependency status/order, an unlanded parent amendment, a bootstrap write
outside the six exact paths, an untracked wrapper/shared owner/test, HEAD-byte
mismatch, dirty clean-checkout gate, provisional-helper promotion, provisional
pre-TASK-545 result, count-only local substitute, evidence path outside the
canonical directory, or attempt by 08 to stage/commit/write final evidence also
stops. Agents never stage or commit the bootstrap; absent owner checkpoint/
commit stops before audit. Any change after that commit to a bootstrap artifact,
TASK-548 task contract, or imported TASK-545 driver invalidates the complete
authoring result and restarts all five fresh rounds plus reconcile from the new
HEAD; no partial-round reuse is allowed. Never retry by weakening a test,
suppressing a scanner, or treating absence as success.
A mixed/missing bootstrap mode, build-mode continuation after its checkpoint,
committed-resume rebuild/pre-commit call, malformed/non-canonical/oversized
base64url, unknown/missing/duplicate owner-action/checkpoint fields or argv, wrong record
order/count/path/hash/aggregate, stale prior HEAD, non-single-parent commit, wrong
diff, or authoring before exact committed path/HEAD/clean-checkout validation stops.
A missing/duplicate/unknown/unbounded release field, mixed invocation modes,
wrong SHA-1/SHA-256 object format/OID width, HEAD/tag commit, clean checkout, or
noncanonical/divergent `DocsReleaseTreeBindingV1`,
mutable/conflicting release asset,
wrong 05-L02 workflow/deployment identity, malformed health receipt, or any
attempt to reuse prerelease memory stops before committed-HEAD drift,
preparation or smoke. 08 never stages, commits, merges, tags, releases,
publishes or deploys. A post-release failure requires a new release identity.
A final-drift result is read-only and runs before any terminal metadata write.
Every finding makes it non-pass; resume aborts without a closeout/evidence edit
and returns the exact 07-owned
`retire_invalidated_task548_checkpoint` owner action bound to task, run,
canonical ten-path inventory and checkpoint hash. Agents neither unstage nor
delete it. The owner retires only that reviewed inventory; the next mutually
exclusive retirement-restart invocation supplies the returned restart argv and
07 confirms
the ten paths are absent from index/worktree and the directory is absent/empty
before a fresh current-tree drift. Missing/malformed drift, owner derivation from
old findings, or any retired-evidence access blocks before fixes/gates.
Late confirmation, any bootstrap/authoring/full
implementation replay, or any retired checkpoint/evidence access or mutation
blocks before affected work. Partial/wrong retirement blocks. This transition
is never used for `metadata_recovery` or a clean pre-metadata crash. A
`metadata_recovery` delta
that is not an exact ordered prefix of the deterministic plan, or has index-only/
corrupt/multiple/wrong TASK-548 1261 path/index/date state, blocks. After terminal metadata, only the narrow TASK-545
mechanical delta validator may run; its structured result is an external owner
handoff emitted exactly once by 08 and never persisted by either layer.

**Regression-test shape:** bootstrap fixtures pin both mutually exclusive modes
and all prerequisite steps: build dependency/parent gates; exact six-file rebuild; pre-commit exact
write-set/forbidden-path, Node syntax, targeted-test, line-count and diff-check
gates; exact strict owner action, capped canonical base64url checkpoint, timing-
safe digest, six sorted file hashes and aggregate; then an owner-only direct-child
commit with exact diff and post-commit clean
status/diffs, `git ls-files` membership, `git show HEAD:<path>` byte parity and
clean-checkout/worktree tests before any authoring round. Build returns after
the checkpoint; committed-resume never rebuilds. TASK-548-08 remains To
Do and imports tracked TASK-545 owners throughout. Fixtures seed the
ignored provisional helper with distinguishable bytes and prove it is rebuilt,
not promoted; every product/source/task/docs/changelog/status/evidence write is
rejected. Mutating any bootstrap artifact, TASK-548 task contract, or imported
TASK-545 driver after a PASS proves that all five rounds plus reconcile rerun
from a new HEAD. Workflow smoke fixtures also prove five rounds cannot
short-circuit, all-results false-clean protection, exactly one reconcile per
round, scoped fixer dispatch, forbidden-path enforcement, the unchanged 01..07
sequential land order, stale-evidence rejection, structured schema validation,
and nonzero failure behavior. Mode fixtures pin both terminating owner pauses,
the exact initial/release-resume/closure-resume/retirement orders, eight bounded
release fields, repository-format Git OIDs and exact runtime-tree binding joins
through manifest/artifact/retained/rollback/health receipts, no cross-
process payload authority, no release mutation, one 07 return plus one 08 emit,
and frozen-current-date versus cross-UTC-day on-disk recovery-date behavior.

## Sequential Implementation and Gates

- Dispatch only after the two exclusive bootstrap modes and through the three
  exact post-bootstrap order constants, including the initial
  01-L02 bundle/report, one post-02-L02 same-owner refresh/gate before 02-L03,
  and one final same-owner handback between 06-L01 and 06-L02. Operational
  owner reruns do not reopen/change status or create a second writer. Each
  dispatch receives only its owned paths and current on-disk shared contracts.
- After each leaf, run `bun --cwd core lint:types`,
  `bun --cwd core lint`, and its targeted Vitest/Bun/DB/security lane.
- Allow at most three scoped fix rounds before escalation. Fix source when it
  violates the contract; rebaseline only an explicitly intended contract
  change and never weaken a behavior assertion.
- A task/source/test/validation-contract change after a pass makes the pass
  stale. Rerun affected gates and audits.
- A retirement-restart invocation is mutually exclusive with initial, release-resume and
  closure-resume modes. Read its exact argv first, dispatch
  `07-L01-confirm-invalidated-checkpoint-retired` as the first workflow action,
  and only after exact ten-path absence run a new current-tree read-only drift,
  derive owners from that result, then scoped fixes/gates, prerelease audit and
  the owner release pause. A later fresh
  release-resume must verify the new release before smoke/phase 1. Do not rerun
  bootstrap, authoring or full implementation or access retired evidence.
- After 06-L02, TASK-548-07 completes docs, release inputs and prerelease gates.
  08 then calls the canonical TASK-545 post-audit driver
  exactly once. The driver itself owns pass 1, at most one fix, validation, and
  the second full fresh pass; there is no outer retry loop and no invented
  result field. Its validation callback reruns affected targeted gates and the
  complete 07 release-input receipt after any fix. Only a fresh pass may return
  the owner release action, and that process terminates. A fresh release-resume
  validates committed HEAD/tree/receipts; 08 then runs a read-only committed-HEAD
  drift gate before 07 preparation/full gates and final smoke, ending at the
  checkpoint owner pause.
- The distinct checkpoint resume, after owner evidence review/staging, verifies
  only checkpoint/tracked
  parity. For `frozen`, 08 runs the substantive final drift read-only before
  closeout; a zero-finding pass authorizes 07's ordered no-replace changelog then
  index-CAS/fsync transaction before statuses. For `metadata_recovery`, 08 does
  not rerun final drift: 07 validates `file-only|both`, completes the index when
  absent, and then only missing metadata. After terminal writes, 07 returns the
  mechanical delta and 08 emits it exactly once.

## Post-Implementation Audit

Run at least five independent fresh-context lenses:

1. scope fidelity, single-writer ownership and no out-of-scope Designer/API;
2. schema, stable identity, deterministic bytes, fail-closed and legacy safety;
3. auth/RBAC/CSRF/privacy/content safety and release immutability;
4. Help/Guide/Agent offline isolation, UX, accessibility and renderer parity;
5. corpus/route/visual/publication coverage and TASK-547 serialization;
6. test integrity, required gates, evidence/hash completeness and cleanup.

Verify every reported line locally before release. Call
`runCanonicalPostAudit` exactly once in the prerelease invocation:
its first full lens set may trigger exactly one owning-leaf HIGH/MEDIUM fix,
then its validation boundary reruns affected gates plus 07 release-input gates before
the driver dispatches the second complete fresh lens set. A non-pass result
blocks; no outer loop repeats only selected lenses. LOW may be deferred only
through an execution-ready TASK-9999 leaf with the repository-required
zero-impact evidence; otherwise it is fixed before closure.

## Canonical Evidence and Closure Boundary

TASK-548-07-L01 finishes product/runtime docs and prerelease gates, then 08
completes one canonical prerelease post-audit. 07 returns the exact owner
commit/merge/tag/release/Cloudflare-deploy action and the process stops; 07/08
never perform those mutations. A fresh release-resume trusts only its bounded
CLI fields and revalidates clean HEAD/tag identity, then validates one bounded
untouched canonical Git record stream and calls L01's pure create/normalize/serialize API directly to require the same canonical runtime-tree
binding in release, retained, rollback and health receipts. After a fresh
read-only committed-HEAD drift pass, 07 runs
full preparation/gates and final smoke in that same invocation.
After smoke/cleanup, 07 writes only the exact TASK-545 `manifest.json` and eight
screenshots under `_docs/_workflows/_smoke/evidence/task-548/`. TASK-545 first validates
the exact-six-path committed-bootstrap receipt; exact phase-1 args pin
1261/`task-548-hybrid-visual-documentation` and derive the owning
`_docs/_workflows/task-548-implement.mjs` only from its `import.meta.url` and creates the sole
`resume-checkpoint.json` and returns
exactly `{ pass, code, action, taskId, evidenceDirectory, checkpointPath,
checkpointSha256, runId, resumeArgv, resumeCommand, frozenRuntimeRevision }`
under 07's pinned literals/types. Agents never stage or commit. The manifest
stays byte-for-byte within the TASK-545 schema; audit, bundle, network, cleanup,
or workflow-summary additions reject. 07 never writes a pre-phase-1 checkpoint.
Before returning `owner_action_required`, it writes no task, changelog, board,
status, or other metadata; after phase 1 it performs no further action.

Only a separate closure-resume process, after the owner reviews and stages that
exact directory, may use the returned `resumeArgv`. Resume verifies
tracked parity and cannot dispatch authoring, implementation, fix, canonical
post-audit, or smoke.

When TASK-545 returns `frozen`, 08 dispatches
`08-final-read-only-drift`, a substantive read-only audit bound to the frozen
runtime revision, before any closeout mutation. A pass has exactly no findings.
Any finding aborts resume without metadata, returns to the exact owner, and
returns the exact checkpoint-retirement owner action. Only after the owner
unstages/retires the bound ten-path inventory may a new mutually exclusive
retirement-restart invocation confirm absence as its first workflow action and
run a new current-tree drift, derive affected owners solely from those fresh
verified findings, then scoped fixes/gates/prerelease audit/release pause. Its
replacement release-resume must verify the new release before smoke/new phase 1.
It skips bootstrap, authoring/full implementation replay and never reads or
mutates retired bytes. The dynamic result is current-process-only.
If the process crashes before the first metadata write after a clean final
drift, replay remains `frozen` and reruns a fresh final drift without retirement.

07 derives its deterministic metadata plan from only:

1. verified checkpoint task/run/workflow identity, frozen revision, and closure
   contract;
2. the exact canonical manifest plus eight screenshots and their schema fields/
   hashes;
3. current frozen on-disk product/task facts and durable repository receipts
   that can be reread deterministically; and
4. the existing on-disk non-authorizing planning-audit record; and
5. TASK-545's returned `resume.closureIdentity`, never an 07/08 clock read or
   independently resolved path.

The plan contains a fixed `final-drift: passed-before-closure` marker, never
dynamic final-drift records. It does not reconstruct historical per-agent,
authoring/post-audit, page-error, unexpected-network, bundle/production-health,
or cleanup outcomes and does not claim that an in-memory pre-pause payload
survived. Pre-checkpoint checks remain mandatory and block phase 1 on failure,
but their absent fields are not invented after resume.

On `frozen`, TASK-545 permits only canonical state `none`; bound temp/journal-only
residue is cleaned and cannot supply date authority. 07 consumes its UTC identity,
then invokes `writeOrResumeOrderedDurableChangelogFileThenIndexV1` with marker
`ordered-durable-changelog-file-then-index@v1` to write/fsync canonical
`1261-YYYY-MM-DD-task-548-hybrid-visual-documentation.md`
no-replace before index CAS-temp/rename/fsync and later metadata. Recovery does
not run smoke/final drift. Before allowlisting, TASK-545 derives identity from one
strict regular non-symlink file and zero (`file-only`) or one (`both`) matching
index row/date. It rejects index-only/corrupt/multiple states; 07 consumes the
identity directly, completes file-only's index, and validates both.
Thus a UTC-day rollover after the first write cannot change closure identity.

07 changes only checkpoint-allowlisted TASK-548 task/index and pinned changelog
metadata, completing every required descendant before its parent and moving
TASK-548 to terminal only after all required work is complete. After terminal
writes, the only substantive operation is TASK-545's narrow validator returning
exactly `{ pass, taskId, runId, closureMetadataRevision, changedPaths }`. That
result is returned by 07, emitted exactly once by 08, and never persisted. No
substantive audit runs after terminal metadata. 08 never writes statuses,
closeout, or the final canonical evidence set.

## Security Contract

No endpoint or permission changes. Prompts/results exclude credentials, provider
keys, cookies, private logs, raw user data and unredacted payloads. Evidence
contains only safe relative file/line anchors, command outcomes and hashes.
Agents default read only; writer dispatch is limited to the explicit owner map.

## Sub-Tasks

- [ ] Implement author-audit, sequential implement, and scoped-fix workflows.
- [ ] Prove five rounds, all-results guards, reconcile, collision, and staleness.
- [ ] Prove bounded audit identities authorize only the current process, verify
  post-resume deterministic closeout reconstruction, and inspect the exact
  07-owned manifest/eight screenshots plus TASK-545-owned checkpoint read-only.

## Testing Requirements

Only `task548-bootstrap-build` may prove the exact six-file
write set and all forbidden paths, then runs only this pre-commit block:

```bash
node --check _docs/_workflows/task-548-author-audit.mjs
node --check _docs/_workflows/task-548-implement.mjs
node --check _docs/_workflows/task-548-fix.mjs
node --check _docs/_workflows/lib/task-548-contract.mjs
bun test tests/unit/workflows/task548AuthorAudit.test.ts \
  tests/unit/workflows/task548WorkflowContracts.test.ts \
  tests/unit/workflows/workflowContracts.test.ts \
  tests/unit/workflows/auditRounds.test.ts \
  tests/unit/workflows/postAudit.test.ts \
  tests/unit/workflows/workflowStaticContract.test.ts \
  tests/unit/workflows/smokeEvidence.test.ts
wc -l _docs/_workflows/task-548-author-audit.mjs \
  _docs/_workflows/task-548-implement.mjs \
  _docs/_workflows/task-548-fix.mjs \
  _docs/_workflows/lib/task-548-contract.mjs \
  tests/unit/workflows/task548AuthorAudit.test.ts \
  tests/unit/workflows/task548WorkflowContracts.test.ts
git diff --check -- \
  _docs/_workflows/task-548-author-audit.mjs \
  _docs/_workflows/task-548-implement.mjs \
  _docs/_workflows/task-548-fix.mjs \
  _docs/_workflows/lib/task-548-contract.mjs \
  tests/unit/workflows/task548AuthorAudit.test.ts \
  tests/unit/workflows/task548WorkflowContracts.test.ts
```

Stop and return after producing the reviewed-byte checkpoint. Agents do not
commit. After the owner commits exactly those six paths, only a new
`task548-bootstrap-committed-resume` may strictly decode and timing-safe verify
it, require the exact single parent plus six-path diff and checkpoint-bound file/
aggregate hashes, and run this post-commit
block from the new HEAD:

```bash
git ls-files --error-unmatch \
  _docs/_workflows/task-548-author-audit.mjs \
  _docs/_workflows/task-548-implement.mjs \
  _docs/_workflows/task-548-fix.mjs \
  _docs/_workflows/lib/task-548-contract.mjs \
  tests/unit/workflows/task548AuthorAudit.test.ts \
  tests/unit/workflows/task548WorkflowContracts.test.ts
git diff --exit-code
git diff --cached --exit-code
test -z "$(git status --short --untracked-files=all)"
set -o pipefail
for task548_bootstrap_path in \
  _docs/_workflows/task-548-author-audit.mjs \
  _docs/_workflows/task-548-implement.mjs \
  _docs/_workflows/task-548-fix.mjs \
  _docs/_workflows/lib/task-548-contract.mjs \
  tests/unit/workflows/task548AuthorAudit.test.ts \
  tests/unit/workflows/task548WorkflowContracts.test.ts; do
  git show "HEAD:$task548_bootstrap_path" | \
    cmp -s -- "$task548_bootstrap_path" -
done
```

The post-commit invocation then runs
`runTask548BootstrapCleanCheckoutWorktreeTests()` against a task-scoped clean
checkout of that HEAD, proving all six paths, tracked TASK-545 imports, Node
syntax and targeted workflow tests work there without copying local provisional
bytes. The exact single parent/diff, checkpoint hashes, `git ls-files`, clean status/diffs,
`git show HEAD:<path>` byte parity, and clean-checkout/worktree tests are
post-commit gates only. An extra/missing commit path or failure blocks before
authoring. This mode never calls rebuild or pre-commit gates.

In addition to the fixed workflow-file count above, audit every added or
modified human-authored production module and test file from the pre-task
baseline with `wc -l`; any result above 1,000 fails.

Fixtures cover missing results, bad schema, timeout, stale evidence, collision,
wrong exact constant (including either missing 01-L02 operational rerun),
incomplete rounds, provisional pre-TASK-545 input, untracked/missing shared
owner files/tests, count-only local guards, and unresolved reconcile findings.
They also cover skipped/reordered dependency/bootstrap steps, a missing/extra
bootstrap commit path, merge/root/wrong-parent commit, stale prior HEAD, malformed/
oversized/non-canonical transport, digest/aggregate/file-hash mismatch, unknown/
missing/duplicate fields/argv/records, dirty checkout, HEAD-byte mismatch, direct promotion of
the ignored provisional helper, build-mode continuation, committed-resume
rebuild, and full five-round invalidation after each of
the three protected input classes changes. Also run the task graph/H1/FileName/
parent/status audit and one dry workflow proving no direct product/task/docs/
changelog/status/evidence writes by 08.

Phase-order fixtures pin two bootstrap modes, three post-bootstrap arrays, both process-terminating
owner pauses, and the same physical 07-L01 owner across seven normal and two
conditional retirement phases. They prove prerelease post-audit precedes the
release pause; release-resume accepts only bounded version/tag/repository-format
lowercase 40/64-hex nonzero SHA/run/attempt/deployment/origin/base; the computed
`DocsReleaseTreeBindingV1` fields
are not inputs; HEAD/tag commit, clean parity and immutable receipt bindings
precede fresh committed-HEAD drift; and preparation/smoke
cannot run on stale pre-pause memory. They also pin nonterminal status through
final drift, owner-scoped non-metadata loopback, substantive
read-only final drift after owner-resume parity but before closeout on
`frozen`, and only mechanical metadata-delta validation after terminal
metadata. Replay fixtures prove a pre-metadata crash remains `frozen` and reruns
final drift, while a post-changelog crash returns `metadata_recovery` and skips
smoke/final drift. A non-pass final drift returns the exact owner-retirement
payload, performs no deletion/unstage itself, rejects wrong/partial ten-path
retirement, and requires only the `retirement-restart invocation` mode.
Fixtures prove restart argv is read before every other workflow action,
the same-owner confirmation is first, exact absent index/worktree inventory and
an absent/empty no-symlink directory precede a new current-tree drift; only its
fresh findings derive affected owners/fixes/gates/prerelease, while old findings
and retired evidence remain unread,
bootstrap/authoring/full implementation and closure resume are not called, the
retired checkpoint/evidence is never accessed or mutated, and the normal
args-absent first-implementation order remains byte-for-byte unchanged. That
invocation ends at its new prerelease audit/owner release pause. Only a separate
verified release-resume process may run smoke and fresh no-overwrite phase 1.

Evidence tests require only
`_docs/_workflows/_smoke/evidence/task-548/`, exact manifest/checkpoint/screenshot
inventory with split byte ownership, phase1 `owner_action_required`,
owner-stage pause, exact workflow-bound resume, tracked parity, metadata-only
delta and invalidation on any later non-metadata mutation. They prove 07 alone
writes no release/deployment state, the prerelease release action terminates,
release-resume and closure-resume are distinct fresh processes, and no
pre-pause payload authorizes either. They prove 07 alone writes manifest/eight
screenshots; only committed, clean `_docs/_workflows/task-548-implement.mjs`
derived from its `import.meta.url` after exact-six gates may invoke TASK-545 phase
1 and write the checkpoint. Caller override/untracked/dirty/wrong-task/symlink
entries fail. Final drift blocks every terminal write, and phase 1 has zero
pre-pause task/changelog/board/status writes; the TASK-545 bootstrap-receipt gate
immediately precedes the exact seven-key phase-1 call, which immediately returns owner action,
and has no later action. Closeout accepts TASK-545's returned `none|file-only|both`
identity. Child-process kills cover every journal/temp write, fsync, rename and
directory-fsync boundary: stale-artifact cleanup restarts none, file-only finishes
the index once, both validates, and index-only/corrupt/multiple fail. UTC rollover
after the changelog write keeps its date. Tests also reject wrong identity/bytes,
invented history, dynamic final-drift serialization and unavailable payloads. The final
delta is returned by 07, emitted exactly once by 08, and never persisted. The exact TASK-545 manifest rejects audit, bundle, network,
cleanup, or summary fields and no summary evidence file may exist. Legacy
acceptance/workflow evidence paths fail. This child never edits changelog,
status, canonical evidence, or screenshot/checkpoint bytes.

## Documentation Updates Required

Keep all task-specific wrappers/modules/tests tracked in clean checkout. Only 07
serializes the canonical manifest/eight screenshots and deterministic closeout;
TASK-545 phase 1 alone serializes the checkpoint. Closeout uses only the durable
sources above and does not claim absent runtime history. This child edits no
shared product docs, evidence, task status, or changelog.
