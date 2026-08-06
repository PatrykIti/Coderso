# TASK-552-03-L01: Persistent Playwright Transport and Scenario Checkpoints
# FileName: TASK-552-03-L01-Persistent-Playwright-Transport-And-Scenario-Checkpoints.md

**Parent Subtask:** TASK-552-03
**Priority:** High
**Category:** Testing Infrastructure / Browser / Performance / Reliability
**Estimated Effort:** Large
**Dependencies:** TASK-552-01-L01 and TASK-552-02-L01 complete
**Status:** ✅ Done
**Started:** 2026-08-06
**Completed:** 2026-08-06
**Changelog:** 1264 (family closure)

---

## Objective

Provide a reusable run-scoped Playwright transport that keeps one named browser
session while dispatching bounded contiguous action segments, plus reusable
checkpoint validation, sealing, compatibility, and atomic-storage primitives.
Integrate TASK-540's browser dependency graph and seven-scenario reset inventory
without losing any of its 496 logical actions or exact first-failure identity.
Automatic TASK-540 checkpoint consumption is not claimed by this leaf.
## Exact Single-Writer Ownership

This leaf alone creates:

- `scripts/runtime-smoke/browser/contracts.ts`;
- `scripts/runtime-smoke/browser/protocol.ts`;
- `scripts/runtime-smoke/browser/segment-compiler.ts`;
- `scripts/runtime-smoke/browser/transport.ts`;
- `scripts/runtime-smoke/browser/action-frames.ts`;
- `scripts/runtime-smoke/checkpoints/contracts.ts`;
- `scripts/runtime-smoke/checkpoints/store.ts`;
- `scripts/runtime-smoke/checkpoints/digests.ts`;
- `scripts/runtime-smoke/adapters/task-540/browser-segments.ts`;
- `scripts/runtime-smoke/adapters/task-540/browser-executor.ts`;
- `scripts/runtime-smoke/adapters/task-540/scenario-resets.ts`;
- `tests/unit/runtime-smoke/browser-segments.test.ts`;
- `tests/unit/runtime-smoke/browser-transport.test.ts`;
- `tests/unit/runtime-smoke/checkpoints.test.ts`;
- `tests/unit/runtime-smoke/task540-browser-plan.test.ts`;
- `tests/unit/runtime-smoke/task540-scenario-resets.test.ts`.

For the canonical TASK-540 integration this leaf alone may also edit:

- `scripts/runtime-smoke/repository-guard.ts` to expose safe known-path
  rehashing without another Git process;
- `_docs/_workflows/task-540-smoke/executor/capabilities/real-capabilities.mjs`;
- `_docs/_workflows/task-540-smoke/executor/capabilities/execute-action.mjs`;
- `_docs/_workflows/task-540-smoke/runtime/command-authority.mjs`;
- focused TASK-540 self-tests and source/security contract tests required by
  those intended seams.

No sibling-owned CLI/worker file, product code, frozen TASK-540 facade,
action/selector contract, task/changelog, schema/migration, or oversized legacy
widget file may change. TASK-552-03-L02 composes these APIs in thin adapters.

## Browser Transport Contract

- Compile consecutive browser actions until a runtime operation, native CLI
  action, screenshot boundary, unresolved capture dependency, or bounded-size
  limit requires a flush. The frozen manifest has 16 scenario/runtime groups
  before those additional flushes. Native/screenshot/global-list,
  capture-frontier, and `set-011-login-submit` boundaries yield 47 run-code
  batches plus 28 standalone actions (75 dispatches) before measured byte-limit
  splits; derive and pin the final count instead of asserting 16.
- Keep one task-scoped named Playwright session for the run. The transport is
  persistent at the run/session level, pauses for parent runtime barriers, and
  resumes with validated captures. Each physical CLI process/frame is counted;
  do not claim one uninterrupted program per product flow.
- A segment emits one strict frame per original browser action with action ID,
  sequence, validated output/capture digest, assertion disposition, and exact
  first failure. Preserve all 420 browser and 76 runtime logical receipts.
- The TASK-540 coordinator caches only decoded raw per-action frames. The outer
  canonical loop finalizes, validates, ledgers, registers resources, and binds
  captures one action at a time. A later batched failure is deferred until its
  logical action is reached, so the successful prefix cannot be lost.
- Browser actions are registered code generated locally from the frozen plan.
  Frames contain no arbitrary JavaScript, selectors, URLs, headers, cookies,
  credentials, raw DOM, or response bodies.
- Replace per-action repository snapshots with bounded canonical boundaries and
  final verification; the measured fresh TASK-540 run used nine full snapshots.
  Rehash only registered screenshot paths immediately before/after their owning
  actions. Adapters that later consume compatible seals may reuse these same
  boundaries without changing the repository guard.

## Checkpoint Contract

- Shared checkpoint code knows only suite/profile/scenario identities, ordered
  action IDs, adapter-supplied reset/cleanup proofs, dependency digests, local
  origins, and safe evidence hashes.
- Seal only after assertions, screenshot verification, zero console/page
  errors, fixture cleanup, settings restoration, canonical reset, and
  repository guard pass.
- Bind revision/working-tree, harness, manifest, scenario, reset, fixture-ledger,
  profile, origin, action, and evidence digests. Store no secrets/raw product
  values. Unknown fields or any digest drift invalidate the checkpoint.
- A future resume consumer may resume only after re-proving prior cleanup and
  canonical preconditions. Harness interruption may restart only the failed
  scenario; a product assertion invalidates that scenario. Never replay a
  completed destructive operation.
- TASK-540 currently exposes reset contracts for all seven scenarios, but its
  canonical executor performs one terminal cleanup and does not yet seal or
  consume per-scenario checkpoints. TASK-552 therefore claims checkpoint
  primitives and reset inventory, not automatic TASK-540 resume.

## Execution Pseudocode

```ts
async function sealCompatibleScenario(store, identity, contract, proof) {
  assertScenarioProofMatchesContract(contract, proof);
  const checkpoint = sealScenarioCheckpoint(identity, proof);
  await store.save(checkpoint);
  return store.loadLatestCompatible(identity, [contract]);
}

const task540Resets = buildTask540ScenarioResetContracts(canonicalPlan);
const task540BrowserPlan = compileTask540BrowserDispatchPlan(canonicalPlan);
```

## Failure Handling

Partial/missing/duplicate/out-of-order frames, first-failure mismatch, capture
drift, timeout, client exit, unexpected stderr, console/page error, screenshot
hash mismatch, repository mutation, reset failure, or stale checkpoint fails
closed. Do not synthesize remaining receipts. Reap only the owned transport and
session, run final cleanup, and retain primary plus cleanup failure codes.

## Security Contract

- **Visibility:** local Playwright/test transport; no endpoint.
- **Auth/RBAC/CSRF/rate limits:** existing browser sessions, permissions, CSRF,
  and rate limits remain active; fast auth settings are adapter-owned/restored.
- **Validation:** closed segments, monotonic frames, exact capture allowlists,
  canonical local origins/paths, bounded checkpoints and reject-unknown data.
- **Anti-abuse/secrets:** no public write; no arbitrary code/selector/URL,
  credential, cookie, token, header, raw DOM/response, PII, or secret in frames,
  checkpoints, diagnostics, or reports.

## Tests and Gates

```bash
bun test tests/unit/runtime-smoke/browser-*.test.ts \
  tests/unit/runtime-smoke/checkpoints.test.ts \
  tests/unit/runtime-smoke/task540-browser-plan.test.ts \
  tests/unit/runtime-smoke/task540-scenario-resets.test.ts
node _docs/_workflows/task-540-smoke-executor.mjs --self-test
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l scripts/runtime-smoke/browser/*.ts scripts/runtime-smoke/checkpoints/*.ts \
  scripts/runtime-smoke/adapters/task-540/{browser-segments,scenario-resets}.ts
```

Acceptance pins the exact manifest-derived segment plan, 496/420/76 identities,
13 screenshot identities, first-failure fidelity, checkpoint tamper/staleness
rejection and atomic storage, complete seven-scenario reset inventory, bounded
physical dispatch/snapshots, session absence, and the 1,000-line file limit. It
does not claim TASK-540 automatic resume.
