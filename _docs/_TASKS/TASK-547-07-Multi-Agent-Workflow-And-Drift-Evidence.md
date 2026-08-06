# TASK-547-07: Multi-Agent Workflow and Drift Evidence
# FileName: TASK-547-07-Multi-Agent-Workflow-And-Drift-Evidence.md

**Parent Task:** TASK-547
**Priority:** Critical
**Category:** Agent Workflow / Validation
**Estimated Effort:** Large
**Dependencies:** TASK-547 task family
**Status:** 🚧 In Progress
**Validation:** The interrupted branch is being re-inventoried on the merged
working tree; current audit, implementation, gate and smoke evidence is pending.

## Overview

Own the reproducible TASK-547 orchestration and drift evidence without taking
production ownership from the 13 executable leaves. The root Codex orchestrator
is the final reviewer and commit owner. Agent reports are review evidence, not
authority; every actionable finding is verified against local files and command
output before code or task state changes.

This contract supersedes historical fixed counts of audit rounds, jobs,
receipts and micro-phases. Resuming starts from the actual merged HEAD and
working-tree inventory. Clean completed work is retained; only unfinished or
changed dependency scopes are implemented and regated.

## Internal Agent Contract

Fresh audit/implementation/fixer agents receive the worktree path, HEAD/branch
and dirty status, exact task/owned paths, read-only or writable authority,
forbidden paths, required gates and structured output schema. They do not read
or expose `.env`, secrets, provider keys, raw sensitive logs or user data. They
do not stage, commit, push or merge unless the owner explicitly authorizes it.

Each report is shaped as one of:

- audit: `{severity,area,finding,evidence,recommendation}`;
- gate: `{pass,summary,errors[]}`;
- smoke: `{pass,serverUp,scenarios[],consoleErrors,screenshots[],failures[]}`.

Missing results are not clean passes. The root verifies file/line evidence and
rejects path drift or claims unsupported by the repository.

## Pre-Implementation Audit

Run one complete dependency-shaped read-only audit round over the current
TASK-547 contracts, implementation, tests, validation lanes, git diff/status and
merged shared-runner architecture. Use parallel per-file/lens audits where safe
and one reconcile pass when shared types, selectors, ownership or land order
intersect.

The reconcile checks:

- one writer for every changed source/test/doc path;
- identical shared type shapes, enum values, limits, selectors and helper names;
- package reference ownership and dependency order;
- promised test paths versus real runner ownership;
- pinned changelog 1260, which remains Draft and unindexed;
- all 18 runtime scenario IDs/order/assertions in both profiles;
- exhaustive `task-547` registration/profile ownership across
  `scripts/runtime-smoke/contracts.ts`, `scripts/runtime-smoke/cli.ts`,
  `scripts/runtime-smoke/registry.ts` and
  `tests/unit/runtime-smoke/cli-registry.test.ts`, including fail-closed
  suite/profile negatives;
- no duplicate task-local lifecycle, worker, DB cleanup, Playwright or report
  loop.

A round passes only with every expected result present and no unresolved
HIGH/MEDIUM finding. After a verified finding is fixed, repeat only the affected
audit scopes and reconcile edges. Do not replay unchanged clean scopes or run a
minimum number of ceremonial clean rounds.

## Ownership and Implementation Order

Preserve the parent land order:

1. `TASK-547-01-L01` then `TASK-547-01-L02`;
2. `TASK-547-02-L01`, the L03 pre-land compatibility checkpoint, L02, then final
   L03 completion;
3. `TASK-547-03-L01` → L02 → L03;
4. `TASK-547-04-L01` → L02 → L03;
5. `TASK-547-05-L01`;
6. TASK-552-04 shared dispatcher/server extraction, then `TASK-547-06-L01`
   acceptance, shared smoke adapter, docs and closure.

Before continuing, map each leaf to `complete`, `unfinished` or `changed by
merge` using code, tests and receipts—not task prose alone. Implement only
unfinished/changed scopes, strictly in dependency order. Each changed leaf runs
`bun --cwd core lint:types`, `bun --cwd core lint`, its targeted Vitest/Bun lanes
and touched-file line counts before the next leaf. A later test-only mechanical
repair follows the narrow AGENTS.md exception; a behavioral change invalidates
its affected audit and gate inputs normally.

The closure leaf owns shared docs/task/changelog state and does not reopen source
contracts without a verified defect routed to the owning leaf. Changelog 1260
stays Draft and absent from `_docs/_CHANGELOG/README.md` until final closure.

## Shared Runtime Smoke

TASK-547 registers `task-547` through the shared static entry point:

```text
bun scripts/runtime-smoke.ts run --suite task-547 --profile fast --session wf547fast
bun scripts/runtime-smoke.ts run --suite task-547 --profile certification --session wf547certification
```

Both profiles execute the same ordered 18 product-visible scenarios and the
same assertions: eight public FormaDom flows, five Form Design flows and five
Page Editor flows. `fast` may shorten only bounded polling/auth infrastructure
windows; `certification` uses production-strength waits. Both use the same
persistent-worker and set-based DB batching. A profile never omits a scenario,
weakens an assertion or silently falls back to the other.

One installed fixture remains live for all ordered rows 01..18. Row 08
`publish-lifecycle-parity` proves publish/front and native lifecycle parity but
does not roll back; rows 09..18 reuse the fixture's exact Form/Page identities.
After row 18, the adapter's explicit `finally` phase performs one bounded
submission cleanup, resets temporary authored mutations and rolls back the exact
source run once with prior-state equality proof.

The thin adapter composes real shared primitives: lifecycle resources,
`WorkerPool.create`, `pollUntil`, supervised processes,
`compileBrowserDispatchPlan`, `BrowserTransport`, repository guards, redaction,
timing and `SmokeAdapterResult`/`RuntimeSmokeReport`. It imports TASK-552-04's
`PlaywrightCliDispatcher` from
`scripts/runtime-smoke/browser/playwright-cli-dispatcher.ts` and
`SupervisedServerResource`/`startSupervisedServer(...)` from
`scripts/runtime-smoke/server/supervised-server.ts` instead of copying either
loop. It starts/stops the server only through `coderso-dev-core-host`.
Screenshots and reports go under
`_docs/_workflows/_smoke/task-547/`. No task-local CLI, tracked
`_docs/PLAYWRIGHT` evidence tree or generated ledger is closure authority.

The adapter validates its exact suite and one of the two supported profiles
before any side effect. It takes initial/final `RepositoryGuard` snapshots and
allows changes only to the exact derived screenshot/report files for that run,
not the containing directory. Its final phase idempotently closes browser,
server, submission, reset and rollback resources, verifies all cleanup/absence
receipts and the repository snapshot, then returns `SmokeAdapterResult`; the
shared lifecycle can safely close the same resources again.

Do not claim end-to-end checkpoint resume. A future adapter may skip a completed
scenario only after it consumes a compatible shared checkpoint, rebuilds
renewable host/browser state and reproves cleanup plus canonical preconditions.

## Post-Audit and Closeout

After implementation and draft documentation:

1. run one dependency-shaped post-audit using the relevant independent lenses
   (scope fidelity, fail-closed correctness, present-only/byte identity,
   cross-stream safety and test integrity);
2. verify findings locally, fix HIGH/MEDIUM items and rerun only affected lenses
   and targeted gates;
3. run `fast`, then run the final 18-scenario `certification` smoke on the final
   candidate;
4. verify zero console/page errors, all screenshots, the single final exact-run
   rollback, set-based cleanup, prior-state equality and repository snapshot;
5. terminalize descendants, parent, board and changelog index in dependency
   order, then run one final read-only graph/closeout consistency pass.

A product-code smoke failure invalidates the affected runtime scenarios, not
clean static gates or unrelated audits. A smoke-harness-only repair invalidates
the harness self-test and runtime smoke. A host, power or network interruption
requires a clean smoke restart only.

## Security and Operational Contract

- Before each DB/settings test or dev command, source only
  `/home/coder/project/Coderso/.env` without printing, copying, hashing or
  persisting it or its values; use bounded pass/fail-only reachability checks.
- DB-backed commands run serially with an explicit timeout of at least 360,000
  ms where required by the owning task.
- Runtime output uses fake task-scoped data, relative paths and digests; never
  credentials, cookies, tokens, SQL/binds, raw form payloads or absolute private
  paths.
- Cleanup uses exact-run rollback and expected-current atomic recovery, attempts
  every registered lifecycle close/absence proof and preserves the primary
  failure with cleanup failures.
- Registration and direct-adapter negatives reject a mismatched suite or profile
  before install/server/browser work; the exhaustive CLI map allows exactly
  `fast` and `certification` for `task-547`.
- No workflow step changes endpoint visibility, auth, RBAC, CSRF, rate limits,
  nonce/HMAC, CAPTCHA or secret-handling contracts.

## Implementation Pseudocode

```ts
const inventory = await inventoryTask547({ head, status, taskGraph });
const audit = await runDependencyShapedAudit(inventory);
await requireAllResultsAndNoHighMedium(audit);

for (const leaf of inventory.unfinishedOrChangedInDependencyOrder) {
  const result = await implementWithinSingleWriterScope(leaf);
  if (result.changedPaths.length > 0) {
    await runOwningTypeLintTestsAndLineCounts(leaf, result.changedPaths);
  }
}

await runPostAuditAndAffectedFixLoop();
await runSharedSmoke({ suite: "task-547", profile: "fast", session: "wf547fast" });
await runSharedSmoke({
  suite: "task-547",
  profile: "certification",
  session: "wf547certification",
});
await closeDescendantsThenParentAndIndexes();
```

Error handling: missing audit results, HIGH/MEDIUM findings, path drift, failed
owning gates, dirty cleanup or a failed scenario stop advancement. Fix the
owning scope and rerun only invalidated work. Never convert a failure to PASS via
a generated receipt or by replaying unrelated clean work.

## Sub-Tasks

- [ ] Inventory the interrupted merged branch and classify every leaf.
- [ ] Complete one dependency-shaped pre-implementation audit/reconcile round.
- [ ] Continue only unfinished/changed leaves with owning gates.
- [ ] Complete one dependency-shaped post-audit and affected fixes.
- [ ] Run both shared profiles with all 18 scenarios and clean rollback/cleanup.
- [ ] Close TASK-547 in descendant order and index changelog 1260 last.

## Testing Requirements

- workflow/task graph and single-writer consistency checks;
- dependency-shaped typecheck, lint and targeted test gates for changed leaves;
- shared runtime-smoke self-tests plus focused TASK-547 adapter/profile/
  descriptor/worker/cleanup/browser tests;
- `tests/unit/runtime-smoke/cli-registry.test.ts` proves exact four-file
  registration, both allowed profiles and unsupported suite/profile negatives;
- both shared CLI commands above, with one fixture and identical 18-scenario
  coverage followed by one final cleanup/rollback;
- serial DB acceptance lanes owned by TASK-547-06-L01;
- canonical package generator zero-diff;
- `bun run precommit:check`, `bun run gates:coderso` and
  `bun run scan:security:strict` at closure;
- baseline-to-final line count for every touched human-authored production/test
  file.

## Documentation Updates Required

Record the verified inventory, changed-leaf gates, audit findings/remediation,
both profile timings, 18-scenario result, cleanup proof and final closeout in the
TASK-547 family and Draft changelog 1260. Add the changelog index row only after
terminal closure.
