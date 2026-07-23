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
pass may authorize product implementation.

## Exclusive Ownership and Collision Guards

- `_docs/_workflows/task-548-author-audit.mjs`;
- `_docs/_workflows/task-548-implement.mjs`;
- `_docs/_workflows/task-548-fix.mjs`;
- `_docs/_workflows/lib/task-548-contract.mjs`;
- `tests/unit/workflows/task548AuthorAudit.test.ts`;
- `tests/unit/workflows/task548WorkflowContracts.test.ts`.

The pre-authoring authorization order is exactly:

1. require TASK-545 to be exactly `✅ Done`;
2. require TASK-547 to be terminal;
3. require the TASK-548 parent amendment with every literal TASK-547 overlap,
   serialized owner, and matching forbidden-path guard to be landed;
4. use the sole bounded pre-audit exception to rebuild only the six paths above,
   importing the tracked TASK-545 owners; before any owner checkpoint/commit,
   require only the exact six-file write set and forbidden-path gate, Node
   syntax checks, targeted workflow tests, line counts, and `git diff --check`;
5. hand the exact reviewed-byte checkpoint to the owner; only the owner stages
   and commits exactly those six paths;
6. from that new committed HEAD, require the exact commit path set,
   `git ls-files --error-unmatch` for all six paths, clean status and unstaged/
   staged diffs, `git show HEAD:<path>` byte parity for every path, and the
   clean-checkout/worktree tests; none of these post-commit gates may be required
   of the uncommitted rebuild;
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

Every 01..07 source/test/docs/task/changelog/screenshot path is forbidden.
Scripts may dispatch scoped writers but never mutate those files directly.
Only 07-L01 writes changelog 1261, closeout, the canonical manifest, and exactly
eight acceptance screenshots; TASK-545 `createResumeCheckpoint` phase 1 alone
writes `resume-checkpoint.json`. 08 verifies their receipt/hashes read-only and
returns bounded structured round/post-audit outcomes for current-process gating
plus the first-attempt post-resume structured final-drift result. No pre-pause
agent/runtime payload is claimed to survive owner action. Post-resume closeout
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
tests/unit/workflows/workflowContracts.test.ts
tests/unit/workflows/auditRounds.test.ts
tests/unit/workflows/postAudit.test.ts
tests/unit/workflows/workflowStaticContract.test.ts
tests/unit/workflows/smokeEvidence.test.ts
```

The wrappers call the exact owner exports `requireAllResults`,
`runCanonicalAuditRounds`, `runCanonicalPostAudit`,
`createResumeCheckpoint`, `openWorkflowClosureResume`, and
`validateMetadataOnlyClosureDelta`. Missing/untracked owner modules/tests,
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

## Provisional Pre-TASK-545 Authoring Evidence (Non-authorizing Placeholder)

**Rerun State:** awaiting mandatory fresh post-TASK-545 rerun.

**Rounds 1–5 summary:** intentionally not recorded here. The mandatory rerun
uses verified structured counts/fingerprints/resolutions only for current-run
authorization. After owner pause, closeout may reference only the existing
on-disk planning-audit record as explicitly non-authorizing; it does not
reconstruct missing round details or claim an authoring/post-audit outcome from
the checkpoint. The workflow never mutates this task file or the TASK-545
manifest. Do not fabricate results from the current local helper.

**Implementation authorization:** none. Any pre-TASK-545 round, provisional
local script, ignored artifact, or current authoring conversation cannot satisfy
the five-round gate.

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
export const TASK_548_EXECUTION_ORDER = Object.freeze([
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
  "07-L01-runtime-docs-and-gates-preparation",
  "08-post-audit-lenses/fixes/revalidation",
  "07-L01-final-smoke-phase1-owner-pause",
  "07-L01-owner-resume-tracked-parity",
  "08-final-read-only-drift",
  "07-L01-terminal-metadata-closeout-and-mechanical-delta-verification",
]);
```

The conditional retirement-restart does not re-enter that array at its
beginning. After exact mode parsing, its complete dispatched order is:

```text
07-L01-confirm-invalidated-checkpoint-retired
affected-owner-fixes-and-per-leaf-gates
07-L01-runtime-docs-and-gates-preparation
08-post-audit-lenses/fixes/revalidation
07-L01-final-smoke-phase1-owner-pause
```

There is exactly one post-pilot same-owner refresh after 02-L02's five pilots
and before 02-L03/TASK-548-03, and exactly one final same-owner handback after
06-L01 and before 06-L02. All four normal-path 07 labels and both conditional
checkpoint-retirement labels invoke the same physical 07-L01 owner, which
remains the only status/changelog writer and stays open until its terminal
metadata phase. `08-final-read-only-drift` is substantive and runs
after checkpoint-bound owner resume/tracked parity but before any terminal
status or changelog mutation. The final 07 phase then persists the bounded,
deterministic closeout, closes descendants before parents, and performs only
TASK-545's mechanical metadata-delta validation after the terminal writes.
Those six normal labels describe the first `frozen` closure attempt. A
final-drift non-pass adds only the retirement-pause/confirmation exception
defined below. The returned restart argv selects a mutually exclusive
retirement-restart invocation whose first workflow action is
`07-L01-confirm-invalidated-checkpoint-retired`. That invocation skips
dependency/bootstrap, authoring and the already-landed full implementation
sequence; after exact ten-path absence is confirmed, it runs only the affected
owner fixes/gates and the complete preparation→post-audit→smoke→fresh-phase-1
sequence. A crash before
changelog 1261, the first metadata write, re-enters `frozen` and repeats the
read-only final-drift label. A crash after that write re-enters only the
resume/terminal-closeout recovery branch as `metadata_recovery`: it skips smoke
and final drift, validates an exact prefix of the deterministic metadata plan,
and completes missing writes idempotently. Neither operational 01-L02 call
reopens or changes 01-L02 status.

## Implementation Pseudocode

```ts
const TASK_548_08_BOOTSTRAP_PATHS = [
  "_docs/_workflows/task-548-author-audit.mjs",
  "_docs/_workflows/task-548-implement.mjs",
  "_docs/_workflows/task-548-fix.mjs",
  "_docs/_workflows/lib/task-548-contract.mjs",
  "tests/unit/workflows/task548AuthorAudit.test.ts",
  "tests/unit/workflows/task548WorkflowContracts.test.ts",
] as const;

// Read this discriminator before every dependency, bootstrap, authoring,
// implementation, fix, gate, preparation, resume or checkpoint operation.
const retiredCheckpoint =
  readOptionalInvalidatedCheckpointRestartArgsFromCurrentProcess();
if (retiredCheckpoint) {
  await requireExactMutuallyExclusiveRetirementRestartMode(retiredCheckpoint, {
    forbidBootstrapAuthoringAndFullImplementationReplay: true,
    forbidFrozenOrMetadataRecoveryResume: true,
    forbidEvidenceOrCheckpointMutationBeforeFreshPhase1: true,
  });
  await dispatchSamePhysical07L01(
    "07-L01-confirm-invalidated-checkpoint-retired",
    retiredCheckpoint
  ); // exact ten paths absent before any affected fix/gate/preparation
  const affectedOwners =
    await dispatchOwnerApprovedAffectedFixesAfterRetirementConfirmation({
      restart: retiredCheckpoint,
      readFindingsFromCheckpointOrEvidence: false,
    });
  await runAffectedPerLeafGates(affectedOwners);
  await dispatchSamePhysical07L01(
    "07-L01-runtime-docs-and-gates-preparation"
  );
  let retirementPostAuditFixApplied = false;
  let retirementAffectedPostAuditOwners = [];
  const retirementPostAudit = await runCanonicalPostAudit({
    lenses: TASK_548_POST_AUDIT_LENSES,
    runLens: runFreshPostAuditLens,
    fix: async (blocking) => {
      retirementPostAuditFixApplied = true;
      retirementAffectedPostAuditOwners =
        await dispatchFixesToExactOwningLeavesOnce(blocking);
    },
    validate: async () => {
      await runAffectedTargetedGates(retirementAffectedPostAuditOwners);
      if (retirementPostAuditFixApplied) {
        await dispatchSamePhysical07L01(
          "07-L01-runtime-docs-and-gates-preparation"
        );
      }
    },
    fingerprint: fingerprintFinalTask548RuntimeTree,
    label: "TASK-548:post-audit",
  });
  if (!retirementPostAudit.pass) {
    throw new Error("task548_post_audit_not_converged");
  }
  await assertPostAuditGateAllowsSmokeInCurrentRun(retirementPostAudit);
  const freshOwnerAction = await dispatchSamePhysical07L01(
    "07-L01-final-smoke-phase1-owner-pause",
    retirementPostAudit
  );
  await yieldOwnerActionRequired(freshOwnerAction);
  return; // retirement-restart invocation ends after the fresh phase-1 pause
}

// This dependency/bootstrap phase runs before importing a TASK-548 wrapper.
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
  requireForbiddenPathsClean: true,
  requireNodeSyntaxChecks: true,
  requireTargetedWorkflowTests: true,
  requireLineCountsAtMost1000: true,
  requireGitDiffCheck: true,
});
const ownerCheckpoint = await createExactBootstrapOwnerCheckpoint(bootstrap);
await yieldBootstrapOwnerCommitRequired(ownerCheckpoint);
// The bootstrap process stops. Only the owner stages/commits the reviewed bytes.

// A new invocation starts from the owner's new committed HEAD.
const committedBootstrap = await requireCommittedTask548WorkflowBootstrap({
  checkpoint: requireBootstrapCheckpointFromCurrentInvocation(),
  paths: TASK_548_08_BOOTSTRAP_PATHS,
});
await requireExactBootstrapCommitPathSet(committedBootstrap);
await requireGitLsFilesForEveryBootstrapPath(TASK_548_08_BOOTSTRAP_PATHS);
await requireCleanStatusAndUnstagedStagedDiffs();
await requireGitShowHeadByteParityForEveryBootstrapPath(
  TASK_548_08_BOOTSTRAP_PATHS
);
await runTask548BootstrapCleanCheckoutWorktreeTests({
  paths: TASK_548_08_BOOTSTRAP_PATHS,
  head: committedBootstrap.head,
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
  TASK_548_EXECUTION_ORDER.slice(
    0,
    TASK_548_EXECUTION_ORDER.indexOf(
      "07-L01-runtime-docs-and-gates-preparation"
    )
  )
);
await dispatchSamePhysical07L01(
  "07-L01-runtime-docs-and-gates-preparation"
);

let postAuditFixApplied = false;
let affectedPostAuditOwners = [];
const postAudit = await runCanonicalPostAudit({
  lenses: TASK_548_POST_AUDIT_LENSES,
  runLens: runFreshPostAuditLens,
  fix: async (blocking) => {
    postAuditFixApplied = true;
    affectedPostAuditOwners =
      await dispatchFixesToExactOwningLeavesOnce(blocking);
  },
  validate: async () => {
    await runAffectedTargetedGates(affectedPostAuditOwners);
    if (postAuditFixApplied) {
      // Rebuild the complete preparation receipt before the canonical fresh pass.
      await dispatchSamePhysical07L01(
        "07-L01-runtime-docs-and-gates-preparation"
      );
    }
  },
  fingerprint: fingerprintFinalTask548RuntimeTree,
  label: "TASK-548:post-audit",
});
if (!postAudit.pass) {
  throw new Error("task548_post_audit_not_converged");
}
await assertPostAuditGateAllowsSmokeInCurrentRun(postAudit);

const ownerAction = await dispatchSamePhysical07L01(
  "07-L01-final-smoke-phase1-owner-pause",
  postAudit
);
await yieldOwnerActionRequired(ownerAction); // normal invocation ends here

// A later mutually exclusive closure-only invocation reads only its current
// TASK-545-bound CLI args. `ownerAction` and every other pre-pause payload are
// unavailable and must not be consumed here.
const resumeRequest = requireResumeArgumentsFromCurrentProcess();
const resumed = await dispatchSamePhysical07L01(
  "07-L01-owner-resume-tracked-parity",
  resumeRequest
);
let closeoutInput;
if (resumed.state === "frozen") {
  const finalDrift = await runFinalTask548DriftReadOnly({
    phase: "08-final-read-only-drift",
    frozenRuntimeRevision: resumed.checkpoint.frozenRuntime,
  });
  if (!finalDrift.pass || finalDrift.findings.length !== 0) {
    // Abort with no closure metadata/evidence write. TASK-545 no-overwrite
    // requires an explicit owner-mediated retirement before a fresh phase 1.
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
  // TASK-545 has already proven an allowlisted partial metadata delta and
  // byte-identical evidence/runtime. Do not rerun smoke/final drift or require
  // the prior process's in-memory result.
  closeoutInput = { resume: resumed };
}
const delta = await dispatchSamePhysical07L01(
  "07-L01-terminal-metadata-closeout-and-mechanical-delta-verification",
  closeoutInput
);
await handExactMetadataDeltaToOwner(delta); // external result; never persisted
```

**Data flow:** TASK-545 exactly Done → TASK-547 terminal → landed literal-overlap
parent amendment → sole bounded six-file TASK-548-08 bootstrap → pre-commit exact
write-set/forbidden-path, Node syntax, targeted-test, line-count and
`git diff --check` gates → exact owner checkpoint/commit → post-commit exact
commit-scope, tracked-file, clean status/diffs, `git show HEAD:<path>` byte
parity and clean-checkout/worktree gates → five fresh shared-driver authoring
rounds plus reconcile → schema-valid read-only reports/all-results guards → verified
findings → ownership-scoped fixes → fresh audit → exact sequential product
implementation/gates through 06-L02, orchestrated by the 08 wrappers → same
physical 07-L01 runtime-docs/gates preparation → one canonical shared-driver,
two-pass post-audit invocation with at most one bounded fix,
affected gates and preparation rerun inside its validation boundary → bounded
current-run post-audit gate → same physical 07-L01 final smoke → exact canonical
TASK-545 manifest/eight screenshots → TASK-545 phase 1 immediately and
atomically creates the sole checkpoint → owner-stage pause with no metadata
write → exact
owning-workflow resume/tracked parity → substantive fresh read-only final drift
on a first `frozen` attempt → require no findings without serializing its
dynamic payload → deterministic metadata plan derived only from verified
checkpoint identity/frozen revision/closure contract, exact canonical
manifest/eight screenshots, rereadable frozen on-disk product/task facts and
durable repository receipts, and the existing non-authorizing planning record
→ changelog 1261 created as the first metadata write → descendant-first
terminal metadata → exact mechanical metadata-delta receipt returned externally
and never persisted. A crash before the first write reruns final drift as
`frozen`; a crash after it resumes as `metadata_recovery`, validates the exact
changelog-first plan prefix, and finishes missing metadata without smoke, final
drift, or lost in-memory payloads. The mutually exclusive retirement-restart
flow instead reads its exact restart discriminator first → proves that
bootstrap/authoring/full implementation and frozen/metadata-recovery resume are
not selected → confirms the prior manifest/eight PNGs/checkpoint are absent
from index/worktree and their directory is absent or empty without a symlink →
runs only owner-approved affected fixes and per-leaf gates → preparation →
canonical post-audit → smoke and a fresh no-overwrite phase 1. It never reads,
rewrites or deletes the retired checkpoint/evidence and does not recover
findings from them.

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
A final-drift result is read-only and runs before any terminal metadata write.
Every finding makes it non-pass; resume aborts without a closeout/evidence edit
and returns the exact 07-owned
`retire_invalidated_task548_checkpoint` owner action bound to task, run,
canonical ten-path inventory and checkpoint hash. Agents neither unstage nor
delete it. The owner retires only that reviewed inventory; the next mutually
exclusive retirement-restart invocation supplies the returned restart argv and
07 confirms
the ten paths are absent from index/worktree and the directory is absent/empty
before affected gates, preparation, post-audit, smoke and a fresh no-overwrite
phase 1. Mixed invocation modes, late confirmation, any bootstrap/authoring/full
implementation replay, or any retired checkpoint/evidence access or mutation
blocks before affected work. Partial/wrong retirement blocks. This transition
is never used for `metadata_recovery` or a clean pre-metadata crash. A
`metadata_recovery` delta
that is not an exact changelog-first prefix
of the deterministic metadata plan also blocks without inventing the lost
final-drift payload. After terminal metadata, only the narrow TASK-545
mechanical delta validator may run; its structured result is an external owner
handoff and is never written back into task, changelog, manifest, checkpoint,
or another evidence file.

**Regression-test shape:** bootstrap fixtures pin all eight prerequisite steps
in order: dependency and parent gates; exact six-file rebuild; pre-commit exact
write-set/forbidden-path, Node syntax, targeted-test, line-count and diff-check
gates; owner-only checkpoint/commit; then post-commit exact commit scope, clean
status/diffs, `git ls-files` membership, `git show HEAD:<path>` byte parity and
clean-checkout/worktree tests before any authoring round. TASK-548-08 remains To
Do and imports tracked TASK-545 owners throughout. Fixtures seed the
ignored provisional helper with distinguishable bytes and prove it is rebuilt,
not promoted; every product/source/task/docs/changelog/status/evidence write is
rejected. Mutating any bootstrap artifact, TASK-548 task contract, or imported
TASK-545 driver after a PASS proves that all five rounds plus reconcile rerun
from a new HEAD. Workflow smoke fixtures also prove five rounds cannot
short-circuit, all-results false-clean protection, exactly one reconcile per
round, scoped fixer dispatch, forbidden-path enforcement, the unchanged 01..07
sequential land order, stale-evidence rejection, structured schema validation,
and nonzero failure behavior.

## Sequential Implementation and Gates

- Dispatch only through `TASK_548_EXECUTION_ORDER`, including the initial
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
- A retirement-restart is mutually exclusive with the normal sequential
  implementation and closure-resume modes. Read its exact argv first, dispatch
  `07-L01-confirm-invalidated-checkpoint-retired` as the first workflow action,
  and only after exact ten-path absence run affected owner fixes/gates,
  preparation, post-audit, smoke and a fresh phase 1. Do not rerun bootstrap,
  authoring or the complete implementation order and do not access the retired
  checkpoint/evidence.
- After 06-L02, TASK-548-07 first runs runtime docs and combined gates without
  smoke/checkpoint. 08 then calls the canonical TASK-545 post-audit driver
  exactly once. The driver itself owns pass 1, at most one fix, validation, and
  the second full fresh pass; there is no outer retry loop and no invented
  result field. Its validation callback reruns affected targeted gates and the
  complete 07 preparation receipt after any fix. Only a fresh pass may re-enter
  the same physical 07-L01 owner for final browser smoke and phase 1.
- After owner review/staging, 07 resumes only to verify checkpoint/tracked
  parity. For `frozen`, 08 runs the substantive final drift read-only before
  closeout; a zero-finding pass authorizes 07 to create changelog 1261 as the
  first deterministic metadata write and close statuses. For
  `metadata_recovery`, 08 does not rerun final drift: 07 validates the existing
  exact changelog-first plan prefix and idempotently completes only missing
  metadata. After terminal writes, only mechanical metadata-delta validation
  runs.

## Post-Implementation Audit

Run at least five independent fresh-context lenses:

1. scope fidelity, single-writer ownership and no out-of-scope Designer/API;
2. schema, stable identity, deterministic bytes, fail-closed and legacy safety;
3. auth/RBAC/CSRF/privacy/content safety and release immutability;
4. Help/Guide/Agent offline isolation, UX, accessibility and renderer parity;
5. corpus/route/visual/publication coverage and TASK-547 serialization;
6. test integrity, required gates, evidence/hash completeness and cleanup.

Verify every reported line locally. Call `runCanonicalPostAudit` exactly once:
its first full lens set may trigger exactly one owning-leaf HIGH/MEDIUM fix,
then its validation boundary reruns affected gates plus 07 preparation before
the driver dispatches the second complete fresh lens set. A non-pass result
blocks; no outer loop repeats only selected lenses. LOW may be deferred only
through an execution-ready TASK-9999 leaf with the repository-required
zero-impact evidence; otherwise it is fixed before closure.

## Canonical Evidence and Closure Boundary

TASK-548-07-L01 finishes product/runtime docs and full gates, then 08 completes
one canonical post-audit invocation. Only afterward does the same physical
07-L01 owner run final smoke and call TASK-545's canonical checkpoint owner.
After smoke/cleanup, 07 writes only the exact TASK-545 `manifest.json` and eight
screenshots under `_docs/_workflows/_smoke/evidence/task-548/`. It invokes
TASK-545 phase 1 immediately; that owner atomically creates the sole
`resume-checkpoint.json` and returns
exactly `{ pass, code, action, taskId, evidenceDirectory, checkpointPath,
checkpointSha256, runId, resumeArgv, resumeCommand, frozenRuntimeRevision }`
under 07's pinned literals/types. Agents never stage or commit. The manifest
stays byte-for-byte within the TASK-545 schema; audit, bundle, network, cleanup,
or workflow-summary additions reject. 07 never writes a pre-phase-1 checkpoint.
Before returning `owner_action_required`, it writes no task, changelog, board,
status, or other metadata; after phase 1 it performs no further action.

Only after the owner reviews and stages that exact directory may the returned
`resumeArgv` re-enter the checkpoint-bound owning workflow. Resume verifies
tracked parity and cannot dispatch authoring, implementation, fix, canonical
post-audit, or smoke.

When TASK-545 returns `frozen`, 08 dispatches
`08-final-read-only-drift`, a substantive read-only audit bound to the frozen
runtime revision, before any closeout mutation. A pass has exactly no findings.
Any finding aborts resume without metadata, returns to the exact owner, and
returns the exact checkpoint-retirement owner action. Only after the owner
unstages/retires the bound ten-path inventory may a new mutually exclusive
retirement-restart invocation confirm absence as its first workflow action and
run the affected fixes/gates/preparation/post-audit/smoke/new phase 1. It skips
bootstrap, authoring and full implementation replay and never reads or mutates
the retired bytes. The dynamic result is used only in the process that found it
and is not serialized.
If the process crashes before the first metadata write after a clean final
drift, replay remains `frozen` and reruns a fresh final drift without retirement.

07 derives its deterministic metadata plan from only:

1. verified checkpoint task/run/workflow identity, frozen revision, and closure
   contract;
2. the exact canonical manifest plus eight screenshots and their schema fields/
   hashes;
3. current frozen on-disk product/task facts and durable repository receipts
   that can be reread deterministically; and
4. the existing on-disk non-authorizing planning-audit record.

The plan contains a fixed `final-drift: passed-before-closure` marker, never
dynamic final-drift records. It does not reconstruct historical per-agent,
authoring/post-audit, page-error, unexpected-network, bundle/production-health,
or cleanup outcomes and does not claim that an in-memory pre-pause payload
survived. Pre-checkpoint checks remain mandatory and block phase 1 on failure,
but their absent fields are not invented after resume.

On `frozen`, 07 creates changelog 1261 as the first atomic metadata write and
then applies the rest of the deterministic descendant-first plan. If the
process crashes after that first write, TASK-545 returns `metadata_recovery`.
That branch does not run smoke or final drift and does not require the lost
result. It first requires the changed allowlisted bytes to be an exact
changelog-first prefix of the deterministic plan; wrong bytes, order, or a
missing first changelog write reject. It then completes only missing writes
idempotently.

07 changes only checkpoint-allowlisted TASK-548 task/index and pinned changelog
metadata, completing every required descendant before its parent and moving
TASK-548 to terminal only after all required work is complete. After terminal
writes, the only operation is TASK-545's narrow mechanical validator returning
exactly `{ pass, taskId, runId, closureMetadataRevision, changedPaths }`. That
result is an external structured owner handoff and is never persisted. No
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

Before the owner checkpoint/commit, the wrapper first proves the exact six-file
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

Stop after producing the exact reviewed-byte checkpoint. Agents do not stage or
commit. After the owner commits exactly those six paths, a new invocation first
calls `requireExactBootstrapCommitPathSet()` and then runs this post-commit
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
bytes. The exact commit path set, `git ls-files`, clean status/diffs,
`git show HEAD:<path>` byte parity, and clean-checkout/worktree tests are
post-commit gates only. An extra/missing commit path or any post-commit failure
blocks before the first fresh canonical authoring round.

In addition to the fixed workflow-file count above, audit every added or
modified human-authored production module and test file from the pre-task
baseline with `wc -l`; any result above 1,000 fails.

Fixtures cover missing results, bad schema, timeout, stale evidence, collision,
wrong exact constant (including either missing 01-L02 operational rerun),
incomplete rounds, provisional pre-TASK-545 input, untracked/missing shared
owner files/tests, count-only local guards, and unresolved reconcile findings.
They also cover skipped/reordered dependency/bootstrap steps, a missing/extra
bootstrap commit path, dirty checkout, HEAD-byte mismatch, direct promotion of
the ignored provisional helper, and full five-round invalidation after each of
the three protected input classes changes. Also run the task graph/H1/FileName/
parent/status audit and one dry workflow proving no direct product/task/docs/
changelog/status/evidence writes by 08.

Phase-order fixtures pin all six exact normal post-06-L02 labels, the same
physical 07-L01 owner across its four normal and two conditional retirement
phases, nonterminal status through final drift,
post-audit before final smoke, owner-scoped non-metadata loopback, substantive
read-only final drift after owner-resume parity but before closeout on
`frozen`, and only mechanical metadata-delta validation after terminal
metadata. Replay fixtures prove a pre-metadata crash remains `frozen` and reruns
final drift, while a post-changelog crash returns `metadata_recovery` and skips
smoke/final drift. A non-pass final drift returns the exact owner-retirement
payload, performs no deletion/unstage itself, rejects wrong/partial ten-path
retirement, and requires the next invocation to select only retirement-restart
mode. Fixtures prove restart argv is read before every other workflow action,
the same-owner confirmation is first, exact absent index/worktree inventory and
an absent/empty no-symlink directory precede every affected fix/gate/preparation,
bootstrap/authoring/full implementation and closure resume are not called, the
retired checkpoint/evidence is never accessed or mutated, and the normal
args-absent first-implementation order remains byte-for-byte unchanged. Only
then may affected work and a fresh no-overwrite phase 1 run.

Evidence tests require only
`_docs/_workflows/_smoke/evidence/task-548/`, exact manifest/checkpoint/screenshot
inventory with split byte ownership, phase1 `owner_action_required`,
owner-stage pause, exact workflow-bound resume, tracked parity, metadata-only
delta and invalidation on any later non-metadata mutation. They prove 07 alone
writes manifest + eight screenshots, TASK-545 phase 1 alone atomically writes
checkpoint, final drift blocks every terminal write, and phase 1 has zero
pre-pause task/changelog/board/status writes, immediately returns owner action,
and has no later action. Deterministic closeout accepts only the four durable
sources above. `frozen` requires a current `{ pass: true, findings: [] }` but
does not serialize it; `metadata_recovery` requires no prior result, accepts
only an exact changelog-first plan prefix, and idempotently fills missing
writes. Tests reject invented authoring/post-audit or page-error/network/
bundle/health/cleanup outcomes, dynamic final-drift serialization, wrong
partial bytes/order, and unavailable in-memory payloads. Changelog 1261 is the
first metadata write before descendant-first closure. The final delta receipt
is external-only. The exact TASK-545 manifest rejects audit, bundle, network,
cleanup, or summary fields and no summary evidence file may exist. Legacy
acceptance/workflow evidence paths fail. This child never edits changelog,
status, canonical evidence, or screenshot/checkpoint bytes.

## Documentation Updates Required

Keep all task-specific wrappers/modules/tests tracked in clean checkout. Only 07
serializes the canonical manifest/eight screenshots and deterministic closeout;
TASK-545 phase 1 alone serializes the checkpoint. Closeout uses only the durable
sources above and does not claim absent runtime history. This child edits no
shared product docs, evidence, task status, or changelog.
