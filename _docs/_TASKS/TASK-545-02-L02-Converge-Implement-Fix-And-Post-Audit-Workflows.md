# TASK-545-02-L02: Converge Implement, Fix, and Post-Audit Workflows

# FileName: TASK-545-02-L02-Converge-Implement-Fix-And-Post-Audit-Workflows.md

**Parent Task:** TASK-545
**Parent Subtask:** TASK-545-02
**Priority:** High
**Category:** Workflow Orchestration / Implementation / Post-Audit
**Estimated Effort:** Large
**Dependencies:** TASK-545-02-L01
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)

---

## Overview

Converge implementation, fix, full, and post-audit workflows on exact lens
identity, bounded fix loops, owner-controlled closure, and mandatory smoke.

## Sub-Tasks

None; this is an executable leaf with the exclusive script inventory below.

## Exclusive ownership

- new `_docs/_workflows/lib/post-audit.mjs`;
- new `_docs/_workflows/lib/post-audit.d.mts`;
- new `tests/unit/workflows/postAudit.test.ts`;
- new `tests/unit/workflows/task543WorkflowModules.test.ts`;
- exactly these four tracked implementation/fix/closeout entries after security-first
TASK-554 lands:

```text
task-543-implement.mjs
task-554-closeout.mjs
task-554-fix.mjs
task-554-implement.mjs
```

## Mandatory staged implementation order

1. Create `post-audit.mjs` and `postAudit.test.ts` before touching any of the four scripts.
2. Run the helper contract, landed audit-round suite, and new synthetic post-audit suite.
3. Only after those pass, migrate the exact four-file inventory in lexical order.
4. Re-run both driver suites, helper tests, `node --check`, inventory checks and the
   owned-script violation scans before handing the tree to TASK-545-01-L02.

The synthetic suite owns post-driver behavior only and imports no live workflow. UI
checkpoint/resume runtime behavior remains owned later by TASK-545-03-L01's
`smokeEvidence.test.ts`; this leaf specifies/migrates the call sites, while the later
live-tree static leaf checks their complete inventory shape without duplicating driver
behavior tests.

Do not edit L01-owned scripts. Before editing, derive the top-level executable
inventory from `git ls-files` and reconcile it against L01's two files plus this
four-file set. Any missing or additional tracked entry blocks work until it is
explicitly assigned and freshly audited. Ignored owner-local scripts and entries
removed by `5facaf32` are not implementation targets.

## Grounded violation inventory

- `task-543-implement.mjs:6702-6740` has a two-pass all-lens replay loop instead
  of finding-driven affected-lens reruns through the canonical post-audit driver.
- Its local `requireAllResults` at `:1986-2035` is superseded by the shared
  helper so workflow result semantics have one owner.
- Literal `.filter(Boolean)` calls at `:2408`, `:2521`, and `:3340` filter URL or
  process-domain data and are explicitly valid; they are not evidence of a
  false-clean agent-result path.
- TASK-554's three terminal entries are read fresh after their committed handoff
  and migrated only where their canonical driver/import/closure contracts drift.

The tracked static scan, not ignored local files or deleted historical scripts,
is authoritative and must reach zero semantic workflow violations.

### Mandatory TASK-543 cohesive split before migration

The tracked `task-543-implement.mjs` is 7,079 physical lines at the refreshed
baseline. Before changing its driver behavior, split it by responsibility into a
thin orchestration entry and these flat tracked libraries under
`_docs/_workflows/lib/`:

- `task-543-gate-contracts.mjs` — command allowlists, gate schemas, strict-scan
  projections, and gate receipt validation;
- `task-543-smoke-schema.mjs` — smoke constants and recursively strict result,
  lifecycle, fixture, scenario, and evidence schemas;
- `task-543-smoke-command-builders.mjs` — canonical CLI/process/browser command
  construction and raw receipt parsing;
- `task-543-smoke-operation-code.mjs` — bounded evidence-operation validation
  and code-source generation;
- `task-543-smoke-scenario-validation.mjs` — success scenario semantics,
  geometry/DOM assertions, screenshot, and reset validation;
- `task-543-smoke-failure-prefix.mjs` — acquired-resource and canonical
  failure-prefix validation;
- `task-543-smoke-cleanup-validation.mjs` — cleanup suffix, process/port,
  fixture, route, state, and remaining-resource validation;
- `task-543-smoke-timeline.mjs` — exact success/failure command timeline
  construction and chronology checks;
- `task-543-codeql-self-test.mjs` — the existing CodeQL source/execution
  self-test; and
- `task-543-prompts-and-closure.mjs` — bounded prompts, declared lenses, closure
  plan, and final metadata-gate helpers.

`task-543-implement.mjs` retains only `meta`, fixed task constants, phase order,
agent dispatch, and calls to those owners. Public behavior, exact command bytes,
schemas, validation order, smoke scenario inventory, and exports used by the
existing security suite remain stable. No arbitrary line-range extraction or
generic helper file is valid. If a named module would exceed 1,000 lines, split
that responsibility once more with a specific name before continuing; do not
merge responsibilities to reduce file count. The new module test pins import
acyclicity, owner/export inventory, entry thinness, byte-equivalent golden
commands/results, and the existing `task543ImplementSecurity.test.ts` contract.
Measure every touched entry/library/test from the verified pre-family baseline
through the final tree; every human-authored result must be at most 1,000 lines.

## Implementation Pseudocode

```js
// post-audit.mjs
export async function runCanonicalPostAudit({
  lenses,
  runLens,
  fix,
  validate,
  fingerprint, // SHA-256 over the audited contract set + HEAD + relevant dirty context
  maximumFixPasses,
  label,
}) {
  requireNonEmptyUniqueDeclaredLensKeys(lenses); // no arbitrary minimum
  requireBoundedMaximumFixPasses(maximumFixPasses); // 1..3
  const passes = [];
  const currentReceipts = new Map();
  let expectedRevision = await fingerprint();
  let pending = lenses;
  for (let pass = 0; pass <= maximumFixPasses; pass += 1) {
    const before = await fingerprint();
    if (before !== expectedRevision) {
      throw new WorkflowResultError("workflow_post_revision_changed", label, `pass=${pass}`);
    }
    const jobs = pending.map((lens) => ({
      identity: `lens:${lens.key}`,
      run: () => runLens(lens, pass),
    }));
    const results = await parallel(jobs.map((job) => async () => ({
      identity: job.identity, // trusted wrapper, never agent-authored
      value: await job.run(),
    })));
    requireAllResults(
      results,
      jobs.map((job) => job.identity),
      `${label}:post-audit:${pass}`
    );
    const after = await fingerprint();
    if (after !== before) {
      throw new WorkflowResultError("workflow_post_revision_changed", label, `pass=${pass}`);
    }
    for (const result of results) currentReceipts.set(result.identity, result.value);
    const findings = collectStructuredFindings([...currentReceipts.values()]);
    const blocking = highMedium(findings);
    passes.push({ pass, expected: pending.length, fingerprint: after,
      lensKeys: pending.map((lens) => lens.key), findings });
    if (blocking.length === 0) {
      return { pass: true, passes, findings,
        receipts: requireEveryDeclaredLensReceipt(currentReceipts, lenses) };
    }
    if (pass === maximumFixPasses) {
      return { pass: false, passes, findings, reason: "post_audit_not_converged" };
    }
    const beforeFixUniverse = await fingerprintUniverse(lenses);
    const beforeByLens = await fingerprintEveryLensInput(lenses);
    const fixResult = await fix(blocking);
    const declaredAffectedLensKeys = requireNonEmptyAffectedLensSubset(
      fixResult.affectedLensKeys,
      lenses
    );
    const afterByLens = await fingerprintEveryLensInput(lenses);
    const fixed = await fingerprintUniverse(lenses);
    const actualAffectedLensKeys = deriveChangedLensKeys(beforeByLens, afterByLens);
    requireExactIdentitySet(
      declaredAffectedLensKeys,
      actualAffectedLensKeys,
      `${label}:post-fix:${pass}`,
    );
    if (fixed === beforeFixUniverse) {
      throw new WorkflowResultError("workflow_post_fixer_no_change", label, `pass=${pass}`);
    }
    await validate({ ...fixResult, affectedLensKeys: actualAffectedLensKeys });
    const validated = await fingerprintUniverse(lenses);
    if (validated !== fixed) {
      throw new WorkflowResultError(
        "workflow_post_validation_mutated_contract",
        label,
        `pass=${pass}`
      );
    }
    pending = lenses.filter((lens) => actualAffectedLensKeys.includes(lens.key));
    for (const lens of pending) currentReceipts.delete(`lens:${lens.key}`);
    expectedRevision = validated;
  }
  throw new WorkflowResultError("workflow_post_audit_unreachable", label, "state");
}

// Every closure prompt:
// - states literal pinned changelog number
// - requires gates + mandatory smoke/evidence before status closure
// - returns file scope, gates, evidence paths, residuals
// - says owner commits; agent MUST NOT git add/commit/push
// - phase1 derives the canonical evidence root and yields owner_action_required with
//   exact checkpoint path/hash + task/run/resume arguments for human review/stage
// - a mutually exclusive --resume-evidence branch verifies owner-staged evidence and
//   enters closure only; it never dispatches author/implementation/fix/post-audit/smoke
// - after closure edits, validates the frozen snapshot's exact metadata-only delta

const EXECUTING_IMPORT_META_URL = import.meta.url;

async function routeUiWorkflow(args) {
  rejectCallerWorkflowEntryOverride(args);
  if (args.resumeEvidence) {
    rejectImplementationOrMutationArguments(args);
    const parsed = parseAuthoritativeTask545ResumeArgv(args.argv, {
      expectedTask: PINNED_TASK_ID,
      expectedSession: PINNED_SMOKE_SESSION,
      rejectUnknownMissingDuplicateOrMixedModeArguments: true,
    });
    const resume: Task545ClosureResume = await openWorkflowClosureResume({
      repoRoot: args.repoRoot,
      expectedTask: PINNED_TASK_ID,
      checkpointPath: parsed.checkpointPath,
      checkpointSha256: parsed.checkpointSha256,
      runId: parsed.runId,
      expectedSession: PINNED_SMOKE_SESSION,
      expectedWorkflowRole: PINNED_WORKFLOW_ROLE,
      executingImportMetaUrl: EXECUTING_IMPORT_META_URL,
    });
    // frozen => first closure attempt; metadata_recovery => a prior closure attempt
    // crashed after writing only allowlisted metadata. Both paths have already proven
    // tracked evidence and an owner-resolved closure identity; neither can dispatch
    // implementation/post-audit/smoke or independently resolve a date/path.
    await requireFrozenOrAllowlistedRecovery(resume, resume.closureIdentity);
    const completedClosureIdentity =
      await runIdempotentClosureMetadataOnly(resume.closureIdentity);
    return validateMetadataOnlyClosureDelta(
      resume.checkpoint,
      completedClosureIdentity,
      args.repoRoot
    );
  }
  const runtimeResult = await runImplementationAuditGatesAndSmoke(args);
  return createResumeCheckpoint({
    repoRoot: args.repoRoot,
    expectedTask: PINNED_TASK_ID,
    pinnedChangelogNumber: PINNED_CHANGELOG_NUMBER,
    pinnedChangelogSlug: PINNED_CHANGELOG_SLUG,
    expectedWorkflowRole: PINNED_WORKFLOW_ROLE,
    executingImportMetaUrl: EXECUTING_IMPORT_META_URL,
    expectedSuite: PINNED_SMOKE_SUITE,
    expectedProfile: PINNED_SMOKE_PROFILE,
    expectedSession: PINNED_SMOKE_SESSION,
    runtimeResult,
  }); // structured owner_action_required; workflow stops here
}
```

Every UI-capable script exposes exactly this non-overlapping CLI mode:

```text
node <checkpoint.workflowEntry> --repo-root <real-root>
  --resume-evidence <canonical-checkpoint-path>
  --checkpoint-sha256 <64-hex> --run-id <bounded-run-id>
```

The phase-1 result provides both a structured `resumeArgv` array and a display-only
`resumeCommand` produced by the canonical shell-quoting helper; the argv array is
authoritative. `workflowEntry` is derived from that script's `import.meta.url`, normalized
relative to the real repository root, and integrity-bound in the checkpoint. The initial
six tracked TASK-545 migration entries remain exact. A later owner is accepted only when its canonical path matches
its TASK ID and `author-audit|implement|fix` suffix, except the explicitly
inventoried `task-554-closeout.mjs` guard (`TASK-9999` is the sole four-digit
exception), is tracked, regular/non-symlink, byte-identical to `git show HEAD:<path>`, and
passes TASK-545 static-contract/import gates. It is never accepted from an agent result or
caller override. On resume, the currently executing entry must equal the checkpoint
entry before tracked evidence or closure is examined. The smoke-evidence validator CLI may
diagnose artifacts, but it is not the owner resume command and cannot close a task.

Declare the exact independent lens IDs appropriate to each touched contract,
selecting from scope fidelity, security/fail-closed model,
compatibility/present-only, cross-stream/runtime behavior, and test integrity
only where relevant. Do not inflate the set by splitting one duplicated prompt.
Require all declared identities and rerun only lenses whose audited inputs
actually changed. Each lens declares its exact normalized input path set; a
shared input maps to every consuming lens. Fingerprint every lens input set and
the full audited implementation/task/test/docs universe,
HEAD, and relevant porcelain dirty context immediately before and after every
initial or affected-lens dispatch. A mismatch is stale evidence and cannot be
classified. Fingerprint again after every verified fixer and targeted
validation; validation may write excluded generated reports but must not mutate
the audited contract set. A fixer's declared affected set is checked against the
before/after-derived set and is never trusted as authority. Declared `A` with
actual `A+B`, declared `A+B` with actual `A`, or any unowned/unmappable change
invalidates every retained receipt and requires a new complete initial pass.
Only an exact verified set retains unaffected receipts and reruns narrowly.

Replace filtering of agent-result collections with `requireAllResults` before
any map/flatMap/count or clean classification. Do not rewrite legitimate
domain/browser/process collection filters. Remove executable `git commit`/
`git add` prompts, dynamic changelog scans or renumber instructions, and
mandatory-smoke deferral. Historical completed task scripts receive their actual
pinned changelog number; prospective scripts use their task contract pin.

UI workflows restart the server and complete the required real flows before the
closure agent changes statuses. Evidence is validated through TASK-545-03 in two phases:
the agent performs canonical-root identity/schema/hash validation immediately, creates the
strict checkpoint, then returns a structured `owner_action_required` result and pauses.
Only the repository owner reviews and stages the evidence directory. The exact resume
arguments select a mutually exclusive closure-only branch, which checks checkpoint
path/hash/task/run/workflow-entry/revision and runs tracked-directory validation; it cannot call
implementation, fixer, post-audit, smoke, or other mutation stages. The branch then makes
only bounded task/index/pinned-changelog metadata edits and validates their delta against
the frozen snapshot. Runtime docs and every non-closure contract update land before smoke.
An agent never stages, commits, bypasses, or rewrites the checkpoint. Exact resume and
metadata validation are replay-safe; checkpoint/evidence validation is read-only, while
the owning closure branch performs only its bounded idempotent metadata writes.

`runIdempotentClosureMetadataOnly` uses exact upserts/checks: it never duplicates a board or
changelog row, never allocates a number, verifies an existing pinned changelog belongs to
the same task, and calls TASK-545's exact
`writeOrResumeOrderedDurableChangelogFileThenIndexV1` export with literal
`ordered-durable-changelog-file-then-index@v1` before later metadata. That protocol binds
same-repository temp/journal state to checkpoint/run, creates
and fsyncs the changelog no-replace first, then CAS-temp/rename/fsyncs the index; only
`none`, `file-only`, and `both` are valid. `file-only` resumes the index idempotently;
index-only, corrupt, or multiple state fails. `openWorkflowClosureResume`
computes the current revision before identity selection. It returns `frozen` only for
canonical state `none`; bound stale temp/journal-only residue is cleaned, the revision
recomputed, and cannot set the UTC identity. Before a `metadata_recovery` delta
is allowlisted, it returns an identity recovered from exactly one regular non-symlink
checkpoint-number/date/slug changelog with strict body task/date/number and zero or one
matching index row/date. File-only or both may pass; zero/multiple files, index-only, or a
mismatched/duplicate row fails. Consumers use only
`resume.closureIdentity`; they never resolve current time or rediscover the path. Tracked
evidence must remain byte-identical and every other delta is rejected. Replaying after complete
closure is a metadata no-op plus the same final delta result; replay never reruns smoke or
product mutation.

## Error/compatibility flow

- Fewer/missing lens results fail; no partial clean.
- Wrong, duplicate, or reordered stable lens identities fail before findings are read;
  identities come from trusted `lens:<key>` wrappers, not agent payloads.
- Initial HIGH/MEDIUM findings trigger a bounded verified fix, targeted gates,
  and only the fingerprint-derived affected lens IDs. Unaffected clean receipts
  remain current only after exact declared-versus-actual equality.
  Residual HIGH/MEDIUM may repeat this bounded cycle up to
  `maximumFixPasses`; exhaustion returns explicit non-convergence.
- Any unexpected contract-byte/HEAD/relevant-dirty change during dispatch or
  validation aborts stale classification and requires a fresh complete pass.
  A verified fixer-owned change follows the affected-lens path above.
- Unresolved findings block closure or become explicit non-blocking follow-up
  tasks with rationale; they are not discarded.
- Agent output contains no commit SHA claim because owner commits separately.
- Missing owner evidence review/stage returns `owner_action_required` and leaves task
  closure open; the agent never runs `git add` on the owner's behalf.
- Wrong task/run/path/hash, stale revision, an implementation-mode resume, non-metadata
  closure drift, or any post-validation mutation blocks closure and requires correction or
  a fresh smoke as specified by the evidence validator.
- A wrong executing script, caller-overridden/untracked/dirty/wrong-task/symlink owner,
  malformed shell argument, zero/multiple/non-regular changelog, strict body mismatch,
  index-only, duplicate/mismatched row, or corrupt journal fails before allowlisting. An allowlisted partial
  closure after a crash resumes idempotently; a partial non-allowlisted write never does.

## Synthetic behavior tests owned by this leaf

`tests/unit/workflows/postAudit.test.ts` proves non-empty exact declared lens
identity without an arbitrary count, missing lens, one or multiple bounded fixes
plus validation, affected-lens-only success with unaffected receipt retention,
correctly identified envelopes carrying null/undefined values that abort before findings
flattening, wrong/duplicate/reordered lens identities, bounded non-convergence,
unknown/empty affected sets, independent lens labels, mutation during initial or
affected dispatch, unexpected drift between passes, fixer no-op, declared `A`
versus actual `A+B`, declared `A+B` versus actual `A`, unmappable shared-input
mutation with complete receipt invalidation, and validation mutation. Exact
owner-stage/resume lifecycle, closure-only branching, idempotent replay, metadata
allowlists, extensible entry rejection, every ordered-pair child-process kill
boundary, UTC rollover and returned argv belong to later `smokeEvidence.test.ts`;
do not create a pre-helper mock contract here.

## Testing Requirements

```bash
node --check _docs/_workflows/lib/post-audit.mjs
git ls-files -z -- '_docs/_workflows/*.mjs' '_docs/_workflows/lib/*.mjs' |
  xargs -0 -r -n1 node --check
bun test tests/unit/workflows/workflowContracts.test.ts \
  tests/unit/workflows/auditRounds.test.ts \
  tests/unit/workflows/postAudit.test.ts \
  tests/unit/workflows/task543WorkflowModules.test.ts \
  tests/unit/workflows/task543ImplementSecurity.test.ts
bun run lint:repo:types
wc -l _docs/_workflows/task-543-implement.mjs \
  _docs/_workflows/lib/task-543-*.mjs \
  tests/unit/workflows/{task543WorkflowModules,task543ImplementSecurity}.test.ts
git diff --check
```

L02 hands the migrated tree to TASK-545-01-L02, whose static suite enumerates
tracked files and distinguishes agent-result filtering from domain-data
  filtering. New ignored libraries/declarations or TASK-554 entries require an owner-review/
force-track handoff and committed `git ls-files`/`git show HEAD` byte parity
before this leaf imports or migrates them. Agents never stage files.

## Documentation Updates Required

- No shared documentation edit in this leaf; keep the owned script inventory
  current in this contract.
- TASK-545-04-L03 owns board and changelog 1257 closure evidence.
