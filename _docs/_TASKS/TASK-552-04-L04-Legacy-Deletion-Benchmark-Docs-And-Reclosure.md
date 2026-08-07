# TASK-552-04-L04: Legacy Deletion, Benchmark, Docs, and Reclosure
# FileName: TASK-552-04-L04-Legacy-Deletion-Benchmark-Docs-And-Reclosure.md

**Parent Subtask:** TASK-552-04
**Priority:** High
**Category:** Testing Infrastructure / Cleanup / Documentation / Closure
**Estimated Effort:** Large
**Dependencies:** TASK-552-04-L03 complete
**Status:** 🚧 In Progress
**Started:** 2026-08-06
**Changelog:** 1264 (family reclosure)

---

## Objective

Port the remaining essential regression coverage to the native runtime-smoke
lane, delete the exact obsolete TASK-540 workflow runtime, prove no consumer
remains, benchmark both profiles, document the final architecture and reclose
TASK-552 only from current-source evidence. The TASK-552-03-L02 fast-only
closure and its `19:38.580` receipt are historical/superseded comparison
evidence; neither can satisfy either final native profile gate.

## Exact Deletion and Documentation Ownership

After replacement tests pass, this leaf deletes exactly 169 legacy `.mjs`
modules:

- all 162 files under `_docs/_workflows/task-540-smoke/**`;
- `_docs/_workflows/task-540-codex-agent-bridge.mjs`;
- `_docs/_workflows/task-540-implement.mjs`;
- `_docs/_workflows/task-540-local-orchestrator.mjs`;
- `_docs/_workflows/task-540-smoke-contract.mjs`;
- `_docs/_workflows/task-540-smoke-executor.mjs`;
- `_docs/_workflows/task-540-smoke-host.mjs`;
- `_docs/_workflows/task-540-test-name-contract.mjs`.

It removes the 13 `tests/unit/workflows/task540*.test.ts` files only after each
still-relevant invariant is present in focused native tests. Workflow
orchestrator status tables, frozen hashes, line-limit tripwires and agent-bridge
self-tests are obsolete and are not recreated. Runtime product assertions,
operation validation, failure classification, ownership-safe cleanup and
environment/path security are ported, not discarded.

The oversized widget runner and test split is already completed and tested by
L03. L04 does not reopen those production contracts; it verifies that the thin
compatibility CLI and registered widget adapter both consume the shared modular
suite and that no direct `Bun.spawn`, raw `playwright-cli`, fixed settle sleep or
private session lifecycle remains.

This leaf may update stale path-only comments in
`scripts/smoke-auth-rate-window.ts` and
`tests/unit/toolchain/trackedSourcesAreText.test.ts`; it must not delete the
supported auth-window tool. Historical smoke evidence under
`_docs/_workflows/_smoke/` is not executable code: keep the canonical receipts
and 13 review PNGs unless an exact duplicate is proven, and ensure no runtime
imports them.

Documentation/closure ownership is limited to:

- `docs/develop/runtime-smoke-cookbook.md`;
- `_docs/PLAYWRIGHT/ENVIRONMENT.md` and `docs/develop/project-structure.md` for
  the preserved thin widget CLI and native module locations;
- `tests/README.md` and `_docs/TESTING_STRATEGY.md`;
- TASK-552 parent/04 family files and `_docs/_TASKS/README.md`;
- changelog 1264 and `_docs/_CHANGELOG/README.md`;
- final safe reports under `_docs/_workflows/_smoke/`.

## Coverage-Port Gate Before Deletion

Build a reviewed mapping from every legacy test to one of:

1. an existing native test with the same or stronger behavioral assertion;
2. a new focused runtime-smoke test owned by L01/L02/L03;
3. an obsolete orchestration-only assertion with a written deletion rationale.

The mapping must show explicit coverage for seven scenarios, 496 action IDs,
420/76 lane partition, 13 screenshots, all 57 static handler bodies and all 160
accepted operation IDs with exact alias-to-handler plus input/output-schema
parity, every visible-effect predicate,
console/page errors, failure-token classification, environment rejection,
profile isolation/privileged phase closure, response-lost behavior and complete
cleanup. Delete nothing that is the only owner of one of those contracts.

## Deletion and Proof Pseudocode

```ts
await assertNativeReplacementMatrixPasses();
await deleteExactReviewedPaths(legacyManifest169);

const remaining = await searchRepository({
  imports: ["_docs/_workflows/task-540-smoke", "task-540-smoke-executor.mjs"],
  executableOnly: true,
});
assert.deepEqual(remaining, []);
assert.equal(await countTrackedLegacyModules(), 0);
await runNativeTask540UnitLane();
```

Use explicit reviewed paths or a manifest whose 169 entries are validated
against `git ls-files` before deletion. Never use a broad recursive target
outside `_docs/_workflows/task-540-smoke/` and the seven named top-level files.

## Runtime Benchmarks

Run from the final tree with the worktree root environment and the shared entry
point:

```bash
bun scripts/runtime-smoke.ts run --suite task-540 --profile fast \
  --session wf552-native-fast
bun scripts/runtime-smoke.ts run --suite task-540 --profile certification \
  --session wf552-native-certification
```

Both runs must report the same seven scenarios, 496 logical actions and 13
valid distinct PNG receipts; zero console/page errors; real scenario/phase
timings; no per-action process fallback; exact auth/settings restoration; and
zero DB/storage/session/process/port residue. Record total duration, browser
dispatch count, worker starts/requests, DB batches, polling time and cleanup
time. Compare truthfully with the historical `19:38.580` fast receipt and the
older full-strength run; do not declare improvement unless profiles and
assertions are comparable. Both commands must run against the same final native
working tree after legacy deletion; an earlier adapter-wrapped fast result, a
fast-only run or a certification run from a different tree blocks reclosure.

## Failure Handling

Missing replacement coverage, any remaining executable legacy reference,
wrong deletion count, changed scenario/action/assertion cardinality, type/lint
failure, console/page error, invalid PNG, fixed-sleep/per-action fallback,
server/session/worker leak, DB/storage residue or benchmark/report redaction
failure blocks reclosure. A harness-only fix reruns focused harness tests plus
the affected runtime profile; unrelated static gates are retained when inputs
did not change.

## Final Gates and Reclosure

- `bun test tests/unit/runtime-smoke` and all directly touched toolchain tests;
- root TypeScript plus relevant core lint/types;
- no runtime `_docs/_workflows/task-540*` imports/requires/subprocesses;
- no TASK-540 worker `Blob`, object URL, dynamic source import/eval or arbitrary
  module/SQL/source frame (browser run-code remains its distinct bounded lane);
- exact 57-handler/160-operation alias parity and no widget-private
  Playwright/process/wait loop;
- exact legacy tracked-module count zero and no orphan workflow-only tests;
- both runtime profiles green with cleanup evidence;
- cookbook/testing docs describe native suite layout, typed operations, shared
  Playwright/server API, the modular widget suite/thin compatibility CLI,
  profile use and evidence/cleanup rules;
- H1/FileName/parent/status/task-count/changelog checks, `git diff --check` and
  touched production/test files at most 1,000 lines.

Only then mark L01–L04, TASK-552-04 and TASK-552 Done; restore changelog 1264 to
final/indexed state and synchronize board statistics. The old TASK-552-03-L02
fast-only closure stays labelled historical/superseded and is never promoted
back to final evidence.

## Local Tooling and Security Constraints

No API route changes. Deletion is bounded to the reviewed tracked manifest and
is recoverable from git until commit. Runtime evidence is secret/PII-free,
loopback-only and bounded; cleanup uses exact ownership identities, never broad
database or filesystem patterns.
