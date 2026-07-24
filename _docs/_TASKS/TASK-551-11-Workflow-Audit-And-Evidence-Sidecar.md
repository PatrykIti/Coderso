# TASK-551-11: Workflow, Audit, and Evidence Sidecar
# FileName: TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md

**Parent Task:** TASK-551
**Priority:** High
**Category:** Workflow / Audit / Evidence / Collision Safety
**Estimated Effort:** Large
**Dependencies:** None; runs throughout TASK-551 and gates every product dispatch
**Status:** ⏳ To Do
**Changelog:** 1263 pinned (closure only)

---

## Overview

Own the reproducible TASK-551 multi-agent workflow: grounded research, authoring,
at least five sequential contract drift-audit rounds, strict implementation
dispatch in child/leaf order, per-leaf gates, independent post-audit lenses,
two-process Redis-smoke dispatch, fresh final drift, and structured evidence.

This is an orchestration sidecar with no product leaf. It never implements or
fixes database, query, migration, cache, route, service, UI, product test,
documentation, task-status, board, or changelog behavior. Every verified finding
is returned to the exact single-writer leaf; TASK-551-10-L02 alone performs final
documentation and metadata closure.

## Exact Single-Writer Ownership

This child may create or edit only:

- `_docs/_workflows/lib/task-551-contract.mjs`;
- `_docs/_workflows/task-551-author-audit.mjs`;
- `_docs/_workflows/task-551-implement.mjs`;
- `_docs/_workflows/task-551-fix.mjs`;
- `tests/unit/workflows/task551AuthorAudit.test.ts`;
- `tests/unit/workflows/task551WorkflowContracts.test.ts`;
- `_docs/_workflows/_smoke/task-551/audit-evidence/*.json`.

The audit-evidence directory is separate from
`_docs/_workflows/_smoke/task-551/runtime/redis-smoke-v1.json`, which is written
only by TASK-551-10-L01. This sidecar verifies the runtime evidence schema/hash
read-only and never rewrites it.

Forbidden paths are every `core/**`, `tests/**` path outside the two workflow
tests, migration, product/developer doc, TASK-551 contract, task board,
changelog, runtime-smoke, package/lock, CI, release-gate, and product evidence
path. Agents never stage or commit. The repository owner owns commits.

## Frozen Task Graph and Land Order

The workflow requires exactly 37 TASK-551 files: one parent, 11 children, and 25
leaves distributed `2,2,3,2,2,3,2,3,4,2,0`. Missing, duplicate, extra,
misnamed, wrong-H1, wrong-FileName, wrong-parent, noncanonical status, or
non-1263 task metadata fails before implementation.

TASK-551-11 runs throughout, while product children execute strictly:

```text
01 → 02 → 05 → 03 → 04 → 06 → 07 → 08 → 09 → 10-L01
→ post-audit/fixes/affected gates → fresh aggregate/full gates and Redis smoke
→ final drift → 10-L02 docs/changelog/status/board closure
```

Within each child, leaves run numerically. The workflow loads the ownership
matrix frozen by TASK-551-01 and rejects any overlapping writer or undeclared
changed path. It re-reads shared bytes immediately before dispatch.

## Authoring Drift-Audit Contract

Before any product implementation:

1. Research agents independently ground DB callers/schema/migrations, query and
   search paths, pool/retention/concurrency, memory cache/public runtime, Redis/
   outbox, Admin/security cache, tests/gates/docs, and active task collisions.
2. Authors write only their assigned task contract. Every executable leaf must
   include exact ownership/forbidden paths, helper/function pseudocode, data flow,
   error handling, regression shape, security contract, DB/Redis fixture safety,
   and correct commands.
3. Run at least five sequential rounds. Each round dispatches one read-only
   per-file audit for every one of the 37 files plus exactly one cross-file
   reconcile audit.
4. Require every expected structured result. A timeout, malformed/missing result,
   or absent reconcile makes the whole round void; it is never a clean pass.
5. Verify every finding locally. Dispatch per-file fixers plus one cross-file
   fixer for real HIGH/MEDIUM findings, restricted to named task files. Record
   LOW findings and apply the parent's strict TASK-9999 eligibility policy.
6. After five completed rounds, run one fresh final reconcile. Product dispatch
   requires zero findings of any severity and zero audit errors.

The reconcile checks only cross-file contradictions: exact writer/forbidden
paths, shared type/helper/error/schema/key/tag/env names, clamp/budget values,
test/evidence paths, migration ownership, fixture profiles, Redis behavior,
TASK-511/517/493/518 handoffs, land order, 37-file graph, and changelog 1263.

Any task/source/test/gate/doc contract change after the PASS invalidates that
PASS for the changed contract and requires fresh affected-file audits plus a
fresh reconcile before dispatch.

## Implementation and Gate Orchestration

- Before the first product dispatch, require TASK-511, TASK-493, TASK-517, and
  TASK-518 terminal. The only substitute is the parent's fresh exact serialized
  audit proving byte-disjoint schema/journal/`.env.example`/publicSite/entry/
  SEO/import/lifecycle source, test, migration and documentation paths. Recheck
  it before every affected leaf; unknown/wildcard/stale ownership blocks.
- Dispatch one executable leaf at a time in the exact order. Provide its current
  on-disk ownership allowlist and explicit forbidden-path set.
- After each leaf, require its targeted Bun/Vitest/DB/migration/Redis tests plus
  `bun --cwd core lint:types` and `bun --cwd core lint`. A fixer loop may run at
  most three rounds and may edit only the same leaf-owned paths.
- Prefer source correction. A test expectation changes only for an intended
  contract change and never weakens a behavior/security/performance assertion.
- Before any migration leaf, require a fresh journal read and exact migration
  writer. Before TASK-551-09 public runtime dispatch, require TASK-517's relevant
  writer terminal and read current bytes.
- At the initial and final collision gates, classify TASK-511, TASK-493,
  TASK-517, and TASK-518 as terminal verified or covered by that one exact
  serialized all-path handoff. A narrower or stale assumed state blocks.
- TASK-551-10-L01 runs the aggregate gate only after 01..09 targeted receipts are
  current. Required DB/Redis absence is a failure, not a skip.

## Post-Audit and Final Drift

After 01..09 and the initial L01 aggregate gate, dispatch exactly five fresh
read-only post-audit lenses:

1. `scope-query-inventory` — every DB caller has one disposition/writer; bounded
   projections, pagination/search/aggregate and active handoffs are complete.
2. `persistence-concurrency-migrations` — constraints, transactions, revisions,
   retention, journal artifacts, locking/backfill and rollback behavior.
3. `cache-coherence-security` — memory/Redis parity, key/envelope limits,
   eligibility, after-commit/outbox generations, bounded-eventual public-cache
   behavior, outage/lease behavior, identity and secret isolation. Globally
   unavailable Redis must bypass on every replica; ambiguous/partial delivery may
   expose only safe public old-generation data until delivery or the measured hard
   TTL. Security/private data stays fail-closed and DB-authoritative.
4. `performance-reliability-test-integrity` — frozen budgets, plans/query counts,
   fixture realism/cleanup, fault tests, no weakened assertions or false skips.
5. `cross-stream-doc-task-closure` — ownership, TASK-511/517/493/518 state,
   release-gate/runtime evidence, docs, 37-file graph, status order, board and
   changelog 1263 readiness.

Every finding includes current `file:line` evidence. Verified HIGH/MEDIUM
findings return once to their exact original owners, followed by affected
targeted gates and a fresh L01 aggregate/full/smoke pass. LOW findings are fixed
unless they satisfy the strict zero-impact policy; performance/reliability/
security/data/test residuals cannot enter TASK-9999.

After all fixes and fresh aggregate gates, run a separate final read-only drift
against the current working tree, task graph, receipts, docs plan, board and
changelog reservation. Only a zero-finding current-tree PASS authorizes
TASK-551-10-L02. A metadata-only closure crash/retry must re-read current indexes
and validate the existing changes as the same deterministic plan; it cannot
reuse stale substantive audit results after a product byte changes.

## Structured Evidence Schemas

All workflow results use strict reject-unknown schemas and sanitized evidence:

```ts
type Task551AuditFindingV1 = Readonly<{
  severity: "HIGH" | "MEDIUM" | "LOW";
  area: string;
  finding: string;
  evidence: string; // current file:line, no raw data
  recommendation: string;
}>;

type Task551AuditResultV1 = Readonly<{
  schema: "coderso.task551.audit-result@v1";
  pass: boolean;
  summary: string;
  findings: readonly Task551AuditFindingV1[];
  errors: readonly string[];
}>;

type Task551FixResultV1 = Readonly<{
  schema: "coderso.task551.fix-result@v1";
  ownerTaskId: string;
  pass: boolean;
  summary: string;
  changedPaths: readonly string[];
  fixed: readonly string[];
  rejected: readonly string[];
  errors: readonly string[];
}>;

type Task551RoundFixerResultV1 = Readonly<{
  ownerTaskId: string;
  pass: boolean;
  changedPaths: readonly string[];
  errors: readonly string[];
}>;

type Task551RoundEvidenceV1 = Readonly<{
  schema: "coderso.task551.audit-round@v1";
  round: 1 | 2 | 3 | 4 | 5;
  expectedPerFile: 37;
  returnedPerFile: 37;
  reconcileReturned: true;
  findingCounts: Readonly<{ high: number; medium: number; low: number }>;
  fixerResults: readonly Task551RoundFixerResultV1[];
  pass: boolean;
}>;

type Task551AuthorAuditResultV1 = Readonly<{
  schema: "coderso.task551.author-audit@v1";
  pass: boolean;
  tree: "TASK-551";
  expectedFiles: 37;
  changelog: 1263;
  landOrder: readonly ["551-01", "551-02", "551-05", "551-03", "551-04",
    "551-06", "551-07", "551-08", "551-09", "551-10"];
  rounds: readonly Task551RoundEvidenceV1[];
  finalReconcile: Task551AuditResultV1;
  errors: readonly string[];
}>;

type Task551PostAuditEvidenceV1 = Readonly<{
  schema: "coderso.task551.post-audit@v1";
  pass: boolean;
  lenses: readonly {
    id: "scope-query-inventory" | "persistence-concurrency-migrations" |
      "cache-coherence-security" | "performance-reliability-test-integrity" |
      "cross-stream-doc-task-closure";
    result: Task551AuditResultV1;
  }[];
  affectedOwners: readonly string[];
  rerunGateIds: readonly string[];
  errors: readonly string[];
}>;

type Task551WorkflowResultV1 = Readonly<{
  schema: "coderso.task551.workflow-result@v1";
  pass: boolean;
  summary: string;
  rounds: readonly Task551RoundEvidenceV1[];
  finalReconcile: Task551AuditResultV1;
  implementationReceipts: readonly { taskId: string; pass: boolean;
    changedPaths: readonly string[]; gateIds: readonly string[] }[];
  postAudit: Task551PostAuditEvidenceV1;
  finalDrift: Task551AuditResultV1;
  runtimeEvidenceSha256: string;
  errors: readonly string[];
}>;
```

`task-551-author-audit.mjs` emits `Task551AuthorAuditResultV1`; later workflow
scripts consume it rather than inventing a second round/fixer/final-reconcile
shape. Fix agents return the full `Task551FixResultV1`, but round evidence maps
each result to the exact four-field `Task551RoundFixerResultV1`; embedded round
objects do not repeat a `schema`, summary, finding, or rejection field. Audit
`pass` is true only when `errors` and HIGH/MEDIUM findings are empty;
the final reconcile additionally requires zero findings of any severity. Fix
results use the exact V1 owner/path/result shape above. Validate exact lens
IDs/order, five rounds, result cardinality, file ownership, finite counts,
canonical task IDs and lowercase SHA-256. Evidence contains no
prompt transcript, provider metadata, env value, connection URL, SQL/bind,
cached body, Redis key, cookie/token, raw log, PII, or secret.

## Security Contract

- **Visibility/routes:** workflow/test evidence only; no endpoint or route change.
- **Auth/RBAC/CSRF/rate limit:** agents cannot change these contracts. Audits
  verify the existing behavior and route failures to the owning leaf.
- **Validation:** strict schemas, exact phase/lens/task/file membership, bounded
  evidence, ownership allowlists, forbidden-path checks, and all-results guards.
- **Agent egress:** no secret, credential, private provider key, raw sensitive
  log, submission, cached body, unredacted user data, or live bind value enters a
  prompt/result/evidence file.
- **Mutation authority:** auditors are read-only; fixers edit only verified
  task/source owner paths; agents never stage, commit, push, tag, deploy, flush
  Redis, truncate DB tables, or clean another process's files.

## Implementation Pseudocode

```ts
async function runTask551Workflow(): Promise<Task551WorkflowResultV1> {
  const graph = await requireExactTask551Graph(37, [2,2,3,2,2,3,2,3,4,2,0]);
  const research = await requireAllResults(await runGroundedResearchScopes());
  await runScopedAuthors(graph, research);

  const rounds = [];
  for (let round = 1 as 1 | 2 | 3 | 4 | 5; round <= 5; round++) {
    const perFile = requireAllResults(await auditEveryTaskFile(graph));
    const reconcile = requireOneResult(await auditCrossFileReconcile(graph));
    const verified = await verifyFindingsLocally(perFile, reconcile);
    const fixes = await runScopedTaskFixersForHighMedium(verified);
    rounds.push(normalizeRoundEvidence(round, perFile, reconcile, fixes));
  }
  const finalReconcile = requireClean(await runFreshFinalReconcile(graph));

  const implementationReceipts = [];
  for (const leaf of graph.productLeavesInOrder) {
    implementationReceipts.push(await dispatchLeafAndRequireTargetedGates(leaf));
  }
  const initialAggregate = await dispatchTask55110L01();
  const postAudit = await runFivePostAuditLenses(initialAggregate);
  if (!postAudit.pass) await fixExactOwnersOnceAndRerunAffectedThenAggregate(postAudit);

  const finalDrift = requireClean(await runFreshCurrentTreeFinalDrift());
  await dispatchTask55110L02({ finalDrift });
  return normalizeWorkflowResult({ rounds, finalReconcile,
    implementationReceipts, postAudit, finalDrift });
}
```

**Data flow:** HEAD/status/diff + docs/source/tests/current task state → grounded
research/authors → five complete audit/reconcile/fix rounds → final reconcile
→ sequential leaf implementation and targeted gates → L01 aggregate gate →
five post-audit lenses/fixes/reruns → fresh final drift → L02 closeout.

**Error handling:** missing/malformed result, false clean, stale audit, ownership
violation, unexpected changed path, failed/required-skipped gate, invalid
evidence, missing service, task-graph drift, or unresolved finding terminates the
phase. Resume only from freshly validated current state; do not infer success
from an incomplete prior run.

**Regression-test shape:** workflow tests assert exact 37-file graph and leaf
distribution, five sequential rounds, 37/37 per-file results plus one reconcile
per round, final reconcile, strict land order, per-leaf gate/fix cap, collision
owner verification, forbidden-path enforcement, five post-audit lenses, L01
Redis evidence hash verification, L02-only metadata authority, structured schema
rejection, and non-zero failure on every false-clean condition.

## Sub-Tasks

- None. This is the workflow/audit sidecar and intentionally has no product leaf.

## Exact Validation Commands

```bash
node --check _docs/_workflows/lib/task-551-contract.mjs
node --check _docs/_workflows/task-551-author-audit.mjs
node --check _docs/_workflows/task-551-implement.mjs
node --check _docs/_workflows/task-551-fix.mjs
bun test tests/unit/workflows/task551AuthorAudit.test.ts tests/unit/workflows/task551WorkflowContracts.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Also run the workflow's exact task-graph/H1/FileName/parent/status/changelog,
forbidden-path, all-results, structured-schema, line-count, and smoke-evidence
hash self-tests. Re-run a named failure once in isolation before classification.

## Documentation Updates Required

Record concise audit summaries that materially changed implementation in the
owning TASK-551 task and changelog 1263 through TASK-551-10-L02. This child writes
only its structured audit evidence and never edits the final documentation.
