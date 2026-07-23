# TASK-548-08: Multi-Agent Workflow and Drift Evidence
# FileName: TASK-548-08-Multi-Agent-Workflow-And-Drift-Evidence.md

**Parent Task:** TASK-548
**Priority:** Critical
**Category:** Workflow / Contract Audit / Collision Safety
**Estimated Effort:** Large
**Dependencies:** TASK-545 before implementation dispatch; runs throughout TASK-548
**Status:** ⏳ To Do

---

## Overview

Own reproducible author, audit, implementation, fix, post-audit, and smoke
orchestration. This child writes workflow/evidence only; all product, test,
docs, task-board, status and changelog edits remain with 01..07 single writers.

Implementation begins only after five sequential authoring rounds and a fresh
reconcile report zero HIGH/MEDIUM drift. Missing, timed-out, malformed, or
unparseable agent output fails the round; it never creates a clean pass.

## Exclusive Ownership and Collision Guards

- `_docs/_workflows/task-548-author-audit.mjs`;
- `_docs/_workflows/task-548-implement.mjs`;
- `_docs/_workflows/task-548-fix.mjs`;
- `tests/unit/workflows/task548AuthorAudit.test.ts`;
- `tests/unit/workflows/task548WorkflowContracts.test.ts`;
- `_docs/_workflows/_smoke/task-548/workflow/**`.

Every 01..07 source/test/docs/task/changelog/screenshot path is forbidden.
Scripts may dispatch scoped writers but never mutate those files directly.
Only 07-L01 writes changelog 1261, closeout, and acceptance screenshots; 08
verifies their receipt/hashes read-only and stores separate workflow evidence.

The live `.gitignore` excludes `_docs/_workflows/`; the three orchestration
scripts and structured evidence are task-local, repo-ignored control material,
not shipped product artifacts. The two exact Bun tests above remain tracked and
exercise the scripts through bounded fixtures. All TASK-548 product task files,
source, tests, canonical documentation assets and closeout artifacts remain
tracked through their owning leaves.

Before dispatch, TASK-547 names its exact guide path; forbid it or serialize 06
after TASK-547. Ambiguous or concurrent ownership blocks.

## Five-Round Authoring Audit Contract

Each of rounds 1 through 5 executes, in order:

1. one fresh-context read-only audit per task file, parallel within the round;
2. an all-results guard proving every file returned one schema-valid result;
3. one fresh cross-subtask reconcile after per-file results are present;
4. verification of every finding against current files/diff;
5. scoped per-file fixers plus one cross-file fixer for HIGH/MEDIUM findings;
6. durable structured round evidence including HEAD and dirty-worktree scope.

A clean round never shortens the minimum. Fixes invalidate prior passes; the next
round reads fresh bytes. After round 5, reconcile the final contract. Resolve
residual drift with fresh scoped agents and repeat reconcile before implementation.

## Cross-Subtask Reconcile Matrix

- exclusive writer paths, forbidden paths, changelog 1261 and exact execution
  order `01 (including initial 01-L02 bundle/report) → 02 → 03 → 04 → 05 →
  06-L01 → one final same-owner 01-L02 handback/gate → 06-L02 → 07`; the
  handback does not transfer ownership or change TASK-548 status;
- exact discriminator, shared types/enums, stable IDs, targets and present-only rules;
- generated bundle/assets, renderer imports, Admin helpers, portal/release paths;
- shared permission/locale/version semantics, error codes, clamp/budget limits,
  hash algorithms and deterministic ordering;
- exact helper names defined by owners and consumed downstream;
- scenario/receipt/coverage identities, promised test filenames and commands;
- TASK-547 guide-path serialization and TASK-545 workflow-harness dependency;
- closure ownership, acceptance scenario order and screenshot/evidence paths.

## Implementation Pseudocode

```ts
for (let round = 1; round <= 5; round += 1) {
  const audits = await runParallelPerFileAudits(taskFiles, freshContext());
  assertAllExpectedResults(audits, taskFiles);
  const reconcile = await runOneReconcile({
    audits,
    ownership: SINGLE_WRITER_MAP,
    landOrder: TASK_548_EXECUTION_ORDER_WITH_FINAL_01_L02_HANDBACK,
    changelog: 1261,
  });
  const findings = await verifyAgainstWorkingTree(audits, reconcile);
  await runScopedFixers(findings.filter(isHighOrMedium));
  await persistRoundEvidence(round, audits, reconcile, findings);
}
await assertFreshFinalReconcile();
await implementSequentiallyWithPerLeafGates(
  TASK_548_EXECUTION_ORDER_WITH_FINAL_01_L02_HANDBACK
);
await runPostAuditLensesAndAcceptanceEvidenceCheck();
```

**Data flow:** HEAD/status/diff + task/docs/source/tests → schema-valid read-only
reports → verified findings → ownership-scoped fixes → fresh audit → sequential
implementation/gates → final working-tree post-audits → read-only acceptance
receipt/hash verification.

**Error handling:** nonzero agent exit, missing result, duplicate result,
malformed JSON, stale HEAD/diff scope, forbidden write, conflicting owner,
failed gate, dirty unowned path, or unresolved HIGH/MEDIUM stops dispatch.
Never retry by weakening a test, suppressing a scanner, or treating absence as
success.

**Regression-test shape:** workflow smoke fixtures prove five rounds cannot
short-circuit, all-results false-clean protection, exactly one reconcile per
round, scoped fixer dispatch, forbidden-path enforcement, sequential land
order, stale-evidence rejection, structured schema validation and nonzero
failure behavior.

## Sequential Implementation and Gates

- Dispatch in the exact root-parent execution order, including the initial
  01-L02 bundle/report and the single final same-owner 01-L02 handback between
  06-L01 and 06-L02. The handback reruns the landed owner without reopening it,
  changing status, or creating a second writer. Each dispatch receives only its
  owned paths and current on-disk shared contracts.
- After each leaf, run `bun --cwd core lint:types`,
  `bun --cwd core lint`, and its targeted Vitest/Bun/DB/security lane.
- Allow at most three scoped fix rounds before escalation. Fix source when it
  violates the contract; rebaseline only an explicitly intended contract
  change and never weaken a behavior assertion.
- A task/source/test/validation-contract change after a pass makes the pass
  stale. Rerun affected gates and audits.
- TASK-548-07 runs combined full gates and browser smoke only after 01..06 pass.

## Post-Implementation Audit

Run at least five independent fresh-context lenses:

1. scope fidelity, single-writer ownership and no out-of-scope Designer/API;
2. schema, stable identity, deterministic bytes, fail-closed and legacy safety;
3. auth/RBAC/CSRF/privacy/content safety and release immutability;
4. Help/Guide/Agent offline isolation, UX, accessibility and renderer parity;
5. corpus/route/visual/publication coverage and TASK-547 serialization;
6. test integrity, required gates, evidence/hash completeness and cleanup.

Verify every reported line locally. Fix HIGH/MEDIUM through the owning leaf,
rerun targeted gates, and repeat affected fresh lenses. LOW may be deferred
only through an execution-ready TASK-9999 leaf with the repository-required
zero-impact evidence; otherwise it is fixed before closure.

## Security Contract

No endpoint or permission changes. Prompts/results exclude credentials, provider
keys, cookies, private logs, raw user data and unredacted payloads. Evidence
contains only safe relative file/line anchors, command outcomes and hashes.
Agents default read only; writer dispatch is limited to the explicit owner map.

## Sub-Tasks

- [ ] Implement author-audit, sequential implement, and scoped-fix workflows.
- [ ] Prove five rounds, all-results guards, reconcile, collision, and staleness.
- [ ] Record post-audit and read-only acceptance evidence hashes.

## Testing Requirements

```bash
node --check _docs/_workflows/task-548-author-audit.mjs
node --check _docs/_workflows/task-548-implement.mjs
node --check _docs/_workflows/task-548-fix.mjs
bun test tests/unit/workflows/task548AuthorAudit.test.ts \
  tests/unit/workflows/task548WorkflowContracts.test.ts
wc -l _docs/_workflows/task-548-author-audit.mjs \
  _docs/_workflows/task-548-implement.mjs \
  _docs/_workflows/task-548-fix.mjs \
  tests/unit/workflows/task548AuthorAudit.test.ts \
  tests/unit/workflows/task548WorkflowContracts.test.ts
```

Fixtures cover missing results, bad schema, timeout, stale evidence, collision,
wrong land order, incomplete rounds and unresolved reconcile findings. Also run
the task graph/H1/FileName/parent/status audit and one dry workflow proving no
direct product/task/changelog writes. Durable ignored evidence must include all
round/reconcile/post-audit summaries and acceptance receipt hashes.

The workflow evidence records material findings and their verified resolution.
TASK-548-07-L01 copies only the concise closeout summary into changelog 1261;
this child never edits the changelog or task statuses.

## Documentation Updates Required

Store repo-ignored structured workflow/audit evidence under the exact owned path
and hand its verified closeout summary to TASK-548-07-L01; the tracked workflow
tests document the contract, and this child edits no shared product docs.
