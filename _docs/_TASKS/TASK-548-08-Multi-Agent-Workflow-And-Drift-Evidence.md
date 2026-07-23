# TASK-548-08: Multi-Agent Workflow and Drift Evidence
# FileName: TASK-548-08-Multi-Agent-Workflow-And-Drift-Evidence.md

**Parent Task:** TASK-548
**Priority:** Critical
**Category:** Workflow / Contract Audit / Collision Safety
**Estimated Effort:** Large
**Dependencies:** TASK-545 must be `✅ Done` and TASK-547 must be terminal before
any TASK-548 implementation; TASK-545 must be `✅ Done` before the mandatory fresh
authoring rerun or task-specific wrapper tracking; after TASK-547, the TASK-548
parent must name and serialize every literal final overlapping path; runs
throughout TASK-548
**Status:** ⏳ To Do

---

## Overview

Own reproducible author, audit, implementation, fix, post-audit, and smoke
orchestration. This child writes tracked workflow wrappers/contracts/tests and
returns bounded in-process gate outcomes to 07; all product, product-test, docs,
canonical evidence, task-board, status and changelog edits remain with 01..07
single writers.

Implementation begins only after five sequential authoring rounds and a fresh
reconcile report zero HIGH/MEDIUM drift. Missing, timed-out, malformed, or
unparseable agent output fails the round; it never creates a clean pass.

The current local/provisional TASK-548 authoring helper and any evidence it
produced before TASK-545 reaches `✅ Done` are non-authorizing research only.
After TASK-545 is `✅ Done`, track the exact wrappers below and rerun all five rounds
from fresh contexts through its tracked shared drivers. No implementation may
start until TASK-547 is also terminal and the parent contains the literal final
overlap/serialization amendment; only a clean rerun plus both dependency gates
may authorize implementation.

## Exclusive Ownership and Collision Guards

- `_docs/_workflows/task-548-author-audit.mjs`;
- `_docs/_workflows/task-548-implement.mjs`;
- `_docs/_workflows/task-548-fix.mjs`;
- `_docs/_workflows/lib/task-548-contract.mjs`;
- `tests/unit/workflows/task548AuthorAudit.test.ts`;
- `tests/unit/workflows/task548WorkflowContracts.test.ts`.

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
evidence file. There is no separate 08 evidence tree.
The only canonical TASK-548 evidence directory is the 07-owned
`_docs/_workflows/_smoke/evidence/task-548/`.

Only after TASK-545 is `✅ Done`, the four task-specific workflow modules and
both exact tests above must be tracked and present after a clean checkout;
their implementations import the final owner bytes. `.gitignore` is never a reason to
depend on an untracked local helper, ignored test fixture, or untracked workflow
script; implementation cannot start until `git ls-files --error-unmatch`
then succeeds for every path and TASK-547 plus the literal-path parent amendment
also pass. The wrappers import the tracked TASK-545 shared
contracts rather than copying count-only logic:

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

There is exactly one post-pilot same-owner refresh after 02-L02's five pilots
and before 02-L03/TASK-548-03, and exactly one final same-owner handback after
06-L01 and before 06-L02. All four 07 labels invoke the same physical 07-L01
owner, which remains the only status/changelog writer and stays open until its
terminal metadata phase. `08-final-read-only-drift` is substantive and runs
after checkpoint-bound owner resume/tracked parity but before any terminal
status or changelog mutation. The final 07 phase then persists the bounded,
deterministic closeout, closes descendants before parents, and performs only
TASK-545's mechanical metadata-delta validation after the terminal writes.
Those six labels describe the first `frozen` closure attempt. A crash before
changelog 1261, the first metadata write, re-enters `frozen` and repeats the
read-only final-drift label. A crash after that write re-enters only the
resume/terminal-closeout recovery branch as `metadata_recovery`: it skips smoke
and final drift, validates an exact prefix of the deterministic metadata plan,
and completes missing writes idempotently. Neither operational 01-L02 call
reopens or changes 01-L02 status.

## Implementation Pseudocode

```ts
await requireTask545DoneAndTask547Terminal();
await requireLiteralTask547OverlapSerializationInTask548Parent();
await requireTask545DoneAndTrackedOwners();

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
await assertAuthoringGateAllowsImplementationInCurrentRun(authoring);

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
await yieldOwnerActionRequired(ownerAction);

const resumed = await dispatchSamePhysical07L01(
  "07-L01-owner-resume-tracked-parity",
  { resumeArgv: ownerAction.resumeArgv }
);
let closeoutInput;
if (resumed.state === "frozen") {
  const finalDrift = await runFinalTask548DriftReadOnly({
    phase: "08-final-read-only-drift",
    frozenRuntimeRevision: resumed.checkpoint.frozenRuntime,
  });
  if (!finalDrift.pass || finalDrift.findings.length !== 0) {
    // Abort with no closure metadata write. Every finding returns to its owner;
    // a new normal run repeats affected gates, preparation, post-audit, smoke,
    // and TASK-545 phase 1.
    await abortResumeWithoutMetadataMutation();
    throw new Error("task548_final_drift_blocked");
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

**Data flow:** completed/tracked TASK-545 owner contracts → HEAD/status/diff +
task/docs/source/tests → shared-driver schema-valid read-only reports/all-results
guards → verified findings → ownership-scoped fixes → fresh audit → exact
sequential implementation/gates through 06-L02 → same physical 07-L01
runtime-docs/gates preparation → one canonical shared-driver, two-pass
post-audit invocation with at most one bounded fix,
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
drift, or lost in-memory payloads.

**Error handling:** nonzero agent exit, missing result, duplicate result,
malformed JSON, stale HEAD/diff scope, forbidden write, conflicting owner,
failed gate, dirty unowned path, or unresolved HIGH/MEDIUM stops dispatch.
An untracked wrapper/shared owner/test, provisional pre-TASK-545 result,
count-only local substitute, evidence path outside the canonical directory, or
attempt by 08 to stage/commit/write final evidence also stops. Never retry by
weakening a test, suppressing a scanner, or treating absence as success.
A final-drift result is read-only and runs before any terminal metadata write.
Every finding makes it non-pass; resume aborts without a closeout edit,
invalidates the final smoke/checkpoint, and starts a new normal run at the
owning leaf, affected gates, 07 preparation, canonical post-audit, smoke, and
phase 1. A `metadata_recovery` delta that is not an exact changelog-first prefix
of the deterministic metadata plan also blocks without inventing the lost
final-drift payload. After terminal metadata, only the narrow TASK-545
mechanical delta validator may run; its structured result is an external owner
handoff and is never written back into task, changelog, manifest, checkpoint,
or another evidence file.

**Regression-test shape:** workflow smoke fixtures prove five rounds cannot
short-circuit, all-results false-clean protection, exactly one reconcile per
round, scoped fixer dispatch, forbidden-path enforcement, sequential land
order, stale-evidence rejection, structured schema validation and nonzero
failure behavior.

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
post-audit, or smoke. Before any closeout mutation it dispatches only
`08-final-read-only-drift`, a substantive read-only audit bound to the frozen
runtime revision. A failure aborts resume without editing metadata; a required
fix invalidates smoke/checkpoint and requires a new normal run and phase 1.

On a clean final drift, 07 reconstructs closeout deterministically from only:

1. the checkpoint-owned workflow control outcome;
2. the frozen canonical manifest/eight screenshots;
3. the current validated final tree and existing receipts;
4. the existing on-disk non-authorizing planning-audit record; and
5. the structured `finalDrift` result.

The reconstruction records generic literal authoring/post-audit outcomes
`completed-before-implementation` and `completed-before-phase1` only when the
checkpoint-owned control transition proves those gates were required and
reached. It never reconstructs missing per-agent counts/findings, claims a
pre-pause payload survived, or invents `authoring.pass`/`postAudit.pass`.
Material final-drift resolutions are copied only from the validated
`finalDrift.resolutions` records; the existing planning record remains explicitly
non-authorizing.

07 then creates changelog 1261 for the first time and changes only
checkpoint-allowlisted TASK-548 task/index and pinned changelog metadata. It
completes every required descendant before its parent and moves TASK-548 to
terminal only after all required work is complete. After the terminal writes,
the only operation is TASK-545's narrow mechanical validator returning exactly
`{ pass, taskId, runId, closureMetadataRevision, changedPaths }`. That result is
an external structured owner handoff and is never persisted. No substantive
audit runs after terminal metadata. 08 never writes statuses, closeout, or the
final canonical evidence set.

## Security Contract

No endpoint or permission changes. Prompts/results exclude credentials, provider
keys, cookies, private logs, raw user data and unredacted payloads. Evidence
contains only safe relative file/line anchors, command outcomes and hashes.
Agents default read only; writer dispatch is limited to the explicit owner map.

## Sub-Tasks

- [ ] Implement author-audit, sequential implement, and scoped-fix workflows.
- [ ] Prove five rounds, all-results guards, reconcile, collision, and staleness.
- [ ] Prove bounded audit identities authorize only the current process, verify
  post-resume deterministic closeout reconstruction, and inspect 07's exact
  TASK-545 manifest/checkpoint/eight screenshots read-only.

## Testing Requirements

```bash
node --check _docs/_workflows/task-548-author-audit.mjs
node --check _docs/_workflows/task-548-implement.mjs
node --check _docs/_workflows/task-548-fix.mjs
node --check _docs/_workflows/lib/task-548-contract.mjs
git ls-files --error-unmatch \
  _docs/_workflows/task-548-author-audit.mjs \
  _docs/_workflows/task-548-implement.mjs \
  _docs/_workflows/task-548-fix.mjs \
  _docs/_workflows/lib/task-548-contract.mjs \
  tests/unit/workflows/task548AuthorAudit.test.ts \
  tests/unit/workflows/task548WorkflowContracts.test.ts
bun test tests/unit/workflows/task548AuthorAudit.test.ts \
  tests/unit/workflows/task548WorkflowContracts.test.ts \
  tests/unit/workflows/workflowContracts.test.ts \
  tests/unit/workflows/auditRounds.test.ts \
  tests/unit/workflows/postAudit.test.ts \
  tests/unit/workflows/workflowStaticContract.test.ts \
  tests/unit/workflows/smokeEvidence.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l _docs/_workflows/task-548-author-audit.mjs \
  _docs/_workflows/task-548-implement.mjs \
  _docs/_workflows/task-548-fix.mjs \
  _docs/_workflows/lib/task-548-contract.mjs \
  tests/unit/workflows/task548AuthorAudit.test.ts \
  tests/unit/workflows/task548WorkflowContracts.test.ts
```

In addition to the fixed workflow-file count above, audit every added or
modified human-authored production module and test file from the pre-task
baseline with `wc -l`; any result above 1,000 fails.

Fixtures cover missing results, bad schema, timeout, stale evidence, collision,
wrong exact constant (including either missing 01-L02 operational rerun),
incomplete rounds, provisional pre-TASK-545 input, untracked/missing shared
owner files/tests, count-only local guards, and unresolved reconcile findings.
Also run the task graph/H1/FileName/parent/status audit and one dry workflow
proving no direct product/task/changelog/evidence writes by 08.

Phase-order fixtures pin all six exact post-06-L02 labels, the same physical
07-L01 owner across its four phases, nonterminal status through final drift,
post-audit before final smoke, owner-scoped non-metadata loopback, substantive
read-only final drift after owner-resume parity but before closeout, and only
mechanical metadata-delta validation after terminal metadata.

Evidence tests require only
`_docs/_workflows/_smoke/evidence/task-548/`, exact manifest/checkpoint/screenshot
inventory, phase1 `owner_action_required`, owner-stage pause, exact
workflow-bound resume, tracked parity, metadata-only delta and invalidation on
any later non-metadata mutation. They prove final drift blocks every terminal
write; phase 1 has zero pre-pause task/changelog/board/status writes, immediately
returns owner action, and has no later action. Resume reconstruction accepts
only the five sources above, records generic gate outcomes without invented pass
fields, copies material final-drift resolutions only from structured records,
and creates changelog 1261 for the first time before descendant-first closure.
The final delta receipt is external-only. The exact TASK-545
manifest rejects audit,
bundle, network, cleanup, or summary fields and no summary evidence file may
exist. Legacy acceptance/workflow evidence paths fail. TASK-548-07-L01 records
the verified concise summary in task/changelog closeout; this child never edits
changelog, status, canonical evidence, or screenshot bytes.

## Documentation Updates Required

Keep all task-specific wrappers/modules/tests tracked in clean checkout. Only 07
serializes the canonical manifest/checkpoint/screenshots and reconstructs the
post-resume changelog summary from the bounded on-disk/control sources above;
this child edits no shared product docs, evidence, task status, or changelog.
