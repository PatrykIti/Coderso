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

## Exclusive ownership

- new `_docs/_workflows/lib/post-audit.mjs`;
- new `tests/unit/workflows/postAudit.test.ts`;
- exactly these 44 current scripts:

```text
task-480-fix.mjs
task-480-impl-audit.mjs
task-482-implement.mjs
task-483-implement.mjs
task-484-implement.mjs
task-497-02-implement.mjs
task-498-implement.mjs
task-499-contract-fix-reaudit.mjs
task-499-implement.mjs
task-500-implement.mjs
task-501-implement.mjs
task-502-implement.mjs
task-503-implement.mjs
task-504-implement.mjs
task-505-implement.mjs
task-506-implement.mjs
task-507-fix.mjs
task-508-implement.mjs
task-509-security.mjs
task-512-impl.mjs
task-513-impl.mjs
task-514-impl.mjs
task-515-impl.mjs
task-516-impl.mjs
task-519-520-fix.mjs
task-519-520-fix2.mjs
task-519-520-fix3.mjs
task-519-520-fix4.mjs
task-519-impl.mjs
task-520-impl.mjs
task-521-impl.mjs
task-522-impl.mjs
task-523-full.mjs
task-524-impl.mjs
task-525-impl.mjs
task-526-full.mjs
task-528-full.mjs
task-529-full.mjs
task-530-full.mjs
task-531-impl.mjs
task-532-impl.mjs
task-533-impl.mjs
task-534-impl.mjs
task-535-remediation.mjs
```

## Mandatory staged implementation order

1. Create `post-audit.mjs` and `postAudit.test.ts` before touching any of the 44 scripts.
2. Run the helper contract, landed audit-round suite, and new synthetic post-audit suite.
3. Only after those pass, migrate the exact 44-file inventory in lexical order.
4. Re-run both driver suites, helper tests, `node --check`, inventory checks and the
   owned-script violation scans before handing the tree to TASK-545-01-L02.

The synthetic suite owns post-driver behavior only and imports no live workflow. UI
checkpoint/resume runtime behavior remains owned later by TASK-545-03-L01's
`smokeEvidence.test.ts`; this leaf specifies/migrates the call sites, while the later
live-tree static leaf checks their complete inventory shape without duplicating driver
behavior tests.

This explicitly includes the otherwise unmatched `task-509-security.mjs`, combined
full pipelines, and the `task-519-520-fix*.mjs` series. Do not edit L01-owned scripts.
Before editing, reconcile both exact inventories against all active top-level `.mjs`;
any missing/new file blocks work until assigned to one leaf and freshly audited.

## Grounded violation inventory

- Result filters span implementation families 480, 482–484, 497–508, 512–516,
  519–535 and the 519–520 fix series.
- Only 2–3 post lenses appear in `task-523-full`, `524-impl`, `525-impl`,
  `526-full`, `528-full`, `529-full`, `530-full`, `531-impl`, `532-impl`,
  `533-impl`, `534-impl`, and `535-remediation`.
- Agent commit directives remain in 20 scripts:
  `512–516-impl`, `519–522-impl`, `524/525-impl`, `526/528/529/530-full`,
  `531–534-impl`, and `535-remediation`.
- Dynamic next-free language occurs in 498 and multiple 501–535 author/closure
  prompts. Deferred smoke occurs at least in 482–484, 515, 519–522, 532, and 534.

The static scan, not this prose list, is authoritative and must reach zero.

## Implementation Pseudocode

```js
// post-audit.mjs
export async function runCanonicalPostAudit({
  lenses,
  runLens,
  fix,
  validate,
  fingerprint, // SHA-256 over the audited contract set + HEAD + relevant dirty context
  label,
}) {
  if (!Array.isArray(lenses) || lenses.length < 5) {
    throw new WorkflowResultError("workflow_post_lenses_insufficient", label, ...);
  }
  const passes = [];
  let expectedRevision = await fingerprint();
  for (let pass = 1; pass <= 2; pass += 1) {
    const before = await fingerprint();
    if (before !== expectedRevision) {
      throw new WorkflowResultError("workflow_post_revision_changed", label, `pass=${pass}`);
    }
    const jobs = lenses.map((lens) => ({
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
    const findings = collectStructuredFindings(results.map((result) => result.value));
    const blocking = highMedium(findings);
    passes.push({ pass, expected: lenses.length, fingerprint: after, findings });
    if (blocking.length === 0) return { pass: true, passes, findings };
    if (pass === 2) {
      return { pass: false, passes, findings, reason: "post_audit_not_converged" };
    }
    await fix(blocking); // exactly one HIGH/MEDIUM fix opportunity
    const fixed = await fingerprint();
    if (fixed === after) {
      throw new WorkflowResultError("workflow_post_fixer_no_change", label, `pass=${pass}`);
    }
    await validate();
    const validated = await fingerprint();
    if (validated !== fixed) {
      throw new WorkflowResultError(
        "workflow_post_validation_mutated_contract",
        label,
        `pass=${pass}`
      );
    }
    expectedRevision = validated; // pass 2 is fresh and bound to the fixed/validated tree
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

const WORKFLOW_ENTRY = requireCanonicalRepoRelativeWorkflowEntry(import.meta.url);

async function routeUiWorkflow(args) {
  if (args.resumeEvidence) {
    rejectImplementationOrMutationArguments(args);
    const resume = await openWorkflowClosureResume({
      repoRoot: args.repoRoot,
      expectedTask: PINNED_TASK_ID,
      checkpointPath: args.resumeEvidence,
      checkpointSha256: args.checkpointSha256,
      runId: args.runId,
      executingWorkflowEntry: WORKFLOW_ENTRY,
    });
    const closureIdentity = resolvePinnedClosureIdentity({
      checkpoint: resume.checkpoint,
      repoRoot: args.repoRoot,
    });
    // frozen => first closure attempt; metadata_recovery => a prior closure attempt
    // crashed after writing only allowlisted metadata. Both paths have already proven
    // tracked evidence; neither can dispatch implementation/post-audit/smoke.
    await requireFrozenOrAllowlistedRecovery(resume, closureIdentity);
    await runIdempotentClosureMetadataOnly(closureIdentity);
    return validateMetadataOnlyClosureDelta(resume.checkpoint, closureIdentity);
  }
  const runtimeResult = await runImplementationAuditGatesAndSmoke(args);
  return createResumeCheckpoint({
    repoRoot: args.repoRoot,
    expectedTask: PINNED_TASK_ID,
    pinnedChangelogNumber: PINNED_CHANGELOG_NUMBER,
    pinnedChangelogSlug: PINNED_CHANGELOG_SLUG,
    workflowEntry: WORKFLOW_ENTRY,
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
relative to the real repository root, checked against the exact 24+44 workflow inventory,
and integrity-bound in the checkpoint. It is never accepted from an agent result or an
owner-supplied override. On resume, the currently executing entry must equal the checkpoint
entry before tracked evidence or closure is examined. The smoke-evidence validator CLI may
diagnose artifacts, but it is not the owner resume command and cannot close a task.

Use approximately five independent lenses appropriate to each workflow, covering
at least scope fidelity, security/fail-closed model, compatibility/present-only,
cross-stream/runtime behavior, and test integrity. Do not reach five by splitting
one duplicated prompt. Fingerprint the exact audited implementation/task/test/docs set,
HEAD, and relevant porcelain dirty context immediately before and after every complete
lens dispatch. A mismatch is stale evidence and cannot be classified. Fingerprint again
after the one fixer and after targeted validation; validation may write excluded generated
reports but must not mutate the audited contract set.

Replace `.filter(Boolean)` with `requireAllResults` before any map/flatMap/count.
Remove all executable `git commit`/`git add` prompts, dynamic changelog scans or
renumber instructions, and mandatory-smoke deferral. Historical completed task
scripts receive their actual pinned changelog number; prospective scripts use
their task contract pin.

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
the same task, and may safely continue after a process crash. `openWorkflowClosureResume`
returns `frozen` when no closure metadata changed, or `metadata_recovery` only when the
current delta is already a subset of the checkpoint-frozen closure allowlist and tracked
evidence is still byte-identical. It rejects every other delta. Replaying after complete
closure is a metadata no-op plus the same final delta result; replay never reruns smoke or
product mutation.

## Error/compatibility flow

- Fewer/missing lens results fail; no partial clean.
- Wrong, duplicate, or reordered stable lens identities fail before findings are read;
  identities come from trusted `lens:<key>` wrappers, not agent payloads.
- First-pass HIGH/MEDIUM triggers exactly one fix, targeted gates, and one fresh
  complete lens pass. Second-pass HIGH/MEDIUM returns explicit non-convergence and
  blocks closure; it never recurses or fixes again silently.
- Any contract-byte/HEAD/relevant-dirty change during a lens pass, between passes, or
  during validation aborts stale classification and requires a fresh complete pass.
- Unresolved findings block closure or become explicit non-blocking follow-up
  tasks with rationale; they are not discarded.
- Agent output contains no commit SHA claim because owner commits separately.
- Missing owner evidence review/stage returns `owner_action_required` and leaves task
  closure open; the agent never runs `git add` on the owner's behalf.
- Wrong task/run/path/hash, stale revision, an implementation-mode resume, non-metadata
  closure drift, or any post-validation mutation blocks closure and requires correction or
  a fresh smoke as specified by the evidence validator.
- A wrong executing script, caller-overridden workflow path, malformed shell argument, or
  ambiguous/multiple pinned changelog path fails before closure. An allowlisted partial
  closure after a crash resumes idempotently; a partial non-allowlisted write never does.

## Synthetic behavior tests owned by this leaf

`tests/unit/workflows/postAudit.test.ts` proves missing lens, one fix plus validation,
fresh second-pass success,
correctly identified envelopes carrying null/undefined values that abort before findings
flattening, wrong/duplicate/reordered lens identities, second-pass non-convergence without another
fix, independent lens labels, mutation during
either lens pass, drift between passes, fixer no-op, and validation mutation. Exact
owner-stage/resume lifecycle, closure-only branching, idempotent replay, metadata
allowlists and returned-argv execution belong to the later `smokeEvidence.test.ts`; do not
create a pre-helper mock contract here.

## Validation

```bash
node --check _docs/_workflows/lib/post-audit.mjs
for file in _docs/_workflows/*.mjs; do node --check "$file"; done
bun test tests/unit/workflows/workflowContracts.test.ts \
  tests/unit/workflows/auditRounds.test.ts \
  tests/unit/workflows/postAudit.test.ts
if rg -n -F '.filter(Boolean)' _docs/_workflows -g '*.mjs'; then exit 1; fi
if rg -n 'git commit|Commit on the worktree|next[- ]free|smokeDeferred' \
  _docs/_workflows -g '*.mjs'; then exit 1; fi
git diff --check
```

Both `rg` commands must produce no active-workflow violations; document any
test-fixture matches separately rather than weakening the scan.
