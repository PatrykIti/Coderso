# TASK-552-03: Browser Scenario Batching, Checkpoints, and Benchmarks
# FileName: TASK-552-03-Browser-Scenario-Batching-Checkpoints-And-Benchmarks.md

**Parent Task:** TASK-552
**Priority:** High
**Category:** Testing Infrastructure / Browser / Performance / Reliability
**Estimated Effort:** Large
**Dependencies:** TASK-552-01, then TASK-552-02
**Status:** ✅ Done
**Started:** 2026-08-06
**Completed:** 2026-08-06
**Changelog:** 1264 (family closure)

---

## Objective

Finish the shared runtime-smoke platform with reusable run-scoped Playwright
segmentation and suite-neutral checkpoint primitives, then adopt the platform
through thin TASK-540, widget-contract, and production-boundary adapters. The
owner selected the complete TASK-540 fast run as the final required live
benchmark; the other adapters are validated in their owning tests and are not
claimed as live passes. Preserve all seven TASK-540 flows, 496 logical action
IDs, 420 browser plus 76 manifest-runtime receipts, and 13 PNGs.

The only public command is:

```text
bun scripts/runtime-smoke.ts run --suite <suite-id> \
  --profile fast|certification --session <task-scoped-name>
```

TASK-552-01 must land that exact path, `run` verb, `--suite` flag, profile
values, static three-suite registry, and adapter extension seam before this
child starts. Any `scripts/run-runtime-smoke.ts --target ... fast|certify`
draft shape is stale and is a blocking contract correction, not an alias.

## Grounded Execution Model

TASK-540 runtime work is interleaved with browser work. The current manifest
contains 16 baseline contiguous browser groups: setup 2, button-image 3, tabs-content
1, tabs-keyboard-aria 1, space-selection 1, dirty-guards 1,
related-retry-cache 1, responsive-users 5, and cleanup 1. A single synchronous
`run-code` invocation cannot cross those parent-side runtime dependencies.

Use one supervised run-scoped transport and one named Playwright session with a
bounded framed pause/resume protocol. The parent dispatches only locally
compiled registered segments; each client invocation executes one segment,
emits one validated result frame per logical browser action, and exits while
the named browser session persists across parent-side runtime barriers. Do not
claim one uninterrupted browser program per scenario or hide client processes.

Report separately and honestly: client processes, transport frames, logical
browser actions, Playwright session/server starts discovered or owned, browser
engine processes observed by the supervisor, and any fallback/retry process.
The compiler reports 75 dispatches before measured byte-limit splits: 47
run-code batches plus 28 standalone native/screenshot/global-list actions. The
16 scenario/runtime groups remain only a baseline. An unplanned fallback or
retry fails the benchmark even if product assertions pass.

## Physical Leaves and Exact Single-Writer Ownership

Implementation is owned only by these physical leaves, in order:

1. `TASK-552-03-L01-Persistent-Playwright-Transport-And-Scenario-Checkpoints.md`
   owns exactly the shared browser/checkpoint modules, TASK-540 segment/reset
   modules, the named existing TASK-540 execution seams and repository-guard
   known-path rehash seam, and tests listed in that leaf.
2. `TASK-552-03-L02-Adapters-Benchmarks-Documentation-And-Closure.md` owns thin
   adapters, durable benchmark evidence, documentation, TASK-552 status/index
   closure, changelog 1264, and changelog index exactly as listed in that leaf.

TASK-552-01 owns the common parser, registry, lifecycle, supervisor, base
repository guard, timings, and adapter extension seam; TASK-552-02 owns all Bun
workers and DB cleanup. L01 may extend only the repository guard's known-path
rehash API and the exact TASK-540 execution seams listed in its physical
contract. Product code,
TASK-551 schema/migrations, `scripts/playwright-widget-contract-smoke.ts`,
TASK-545/TASK-548, and unrelated task evidence are forbidden. If landed seams
require a shared-file edit, stop and correct/re-audit the task contracts first.

Every touched human-authored source/test file must remain at most 1,000 lines.

## Browser Transport and Failure Contract

Frames are canonical length-bounded NDJSON with protocol version, run ID,
monotonic sequence, scenario ID, segment ID, manifest digest, and exact allowed
capture names. Strictly reject unknown, duplicate, skipped, replayed, oversized,
out-of-order, or post-terminal frames. No frame contains dynamic JavaScript,
CLI args, selectors, URLs, credentials, cookies, headers, or raw DOM/response
bodies; registered segment source is compiled locally from the frozen plan.

Each action result retains its original ID, receipt sequence, output-schema
validation, visible assertion, capture binding, screenshot identity, and first
failure classification. Missing/partial client output, client exit, timeout,
stderr, schema failure, repository mutation, console/page error, screenshot
hash mismatch, or parent runtime failure aborts the segment. Reap the exact
client/session process group and run final cleanup; never synthesize remaining
receipts or replay a completed write.

Repository guarding occurs before setup, at each of the seven safe scenario
boundaries, and at finalization, with at most nine full Git snapshots for a
no-resume run. Known screenshot paths are rehashed cheaply around their owning
actions, and remain the only declared evidence mutations.

## Reusable Checkpoint Primitives and TASK-540 Reset Inventory

The shared checkpoint layer knows only registered suite/scenario identities,
adapter-supplied reset/cleanup proofs, dependency digests, and safe evidence. It
must not import TASK-540 contracts, selectors, fixtures, screenshots, auth-rate
helpers, or product adapters. Adapters own compilation and proof callbacks.

Make the existing theme, auth, page/tab, route, cache/preference, fixture, and
auth-window handoffs explicit. Every scenario declares `prepare`, ordered
segments/runtime barriers, `verify`, and `reset`. `reset` restores the canonical
state expected by the next scenario and proves it through product-visible state
or the existing authorized API/worker contract. Mutable scenarios stay serial.

A checkpoint seals only after scenario assertions, required screenshot hashes,
zero console/page errors, fixture cleanup, route release, setting restoration,
canonical reset, and repository guard all pass. It binds suite/profile/run,
revision and working-tree digest, harness/manifest/scenario/reset digests,
fixture namespace and ledger digest, local origins, completed action IDs,
evidence hashes, and cleanup proof; it stores no secret or raw product data.

An adapter that supports resume accepts the newest compatible seal, rebuilds
only explicitly renewable host/browser state, proves prior cleanup and
canonical preconditions, then starts at the next scenario. Source/profile/
origin/fixture/reset/evidence drift invalidates the seal. Product assertion
failure invalidates its scenario; harness or external interruption may resume
only after the failed scenario's cleanup succeeds.

TASK-540 now has an exact reset inventory for all seven scenarios, but its
canonical executor still owns one full-flow terminal cleanup. It does not yet
seal or consume per-scenario checkpoints, so this family does not claim
automatic TASK-540 resume or skipped scenario replay. The reusable checkpoint
contracts/store remain available to adapters that can prove independent
scenario cleanup and reset end to end.

## Implementation Pseudocode

```ts
const browserPlan = compileTask540BrowserDispatchPlan(canonicalPlan);
const resetInventory = buildTask540ScenarioResetContracts(canonicalPlan);
const evidence = await executeCanonicalTask540WithBatchedBrowserSegments({
  browserPlan,
  persistentBridge,
});
assertExactCanonicalTotals(evidence);

// Generic adapters may separately seal only a fully proved scenario.
await checkpointStore.save(sealScenarioCheckpoint(identity, proof));
```

## Security Contract

- **Visibility:** no endpoint is added or changed; the CLI is local
  developer/test tooling and accepts only canonical local origins.
- **Authentication/RBAC:** TASK-540 uses existing Admin sessions and permissions;
  production-boundary probes are read-only. No bypass or synthetic privileged
  role is added.
- **CSRF:** all existing Admin writes retain the current CSRF acquisition and
  validation. Browser frames never carry session or CSRF material.
- **Rate limits:** certification keeps the real 60-second window. Fast uses only
  the supported five-second setting, refuses concurrent backend use, and
  restores the exact prior value on success, failure, signal, and resume.
- **Validation:** CLI, suite/profile/session, frames, reports, checkpoint data,
  paths, origins, and adapter results are strict reject-unknown and bounded.
- **Anti-abuse/secrets:** no public write exists, so nonce/HMAC and CAPTCHA are
  not applicable. Run nonces scope synthetic fixtures only. Credentials stay in
  least-privilege process environments and are redacted from every artifact.

## Tests and Static Gates

- Batch tests pin all 496 IDs, the 420/76 partition, seven ordered flows, the
  compiler-derived segment count and every required safety boundary,
  per-action output parity, first-failure identity,
  exact client-dispatch/zero-fallback counts, pause/resume interleaving, partial frames,
  crash/timeout/stderr, process absence, and nine-snapshot maximum.
- Checkpoint tests cover every digest field, unknown fields, tamper/stale seal,
  atomic storage, compatibility, and secret/PII redaction. TASK-540 reset tests
  pin the seven-scenario/action/screenshot inventory without claiming live
  resume consumption.
- Production adapter tests prove root/Admin/install-status/one built asset 200,
  exact `/peri` 404, root still 200, clean bounded logs, exact PID stop, and
  released port. Widget tests retain the existing strict focused contract and
  pin the task-scoped screenshot-priority overlay plus fresh pre-navigation
  public console/page-error probe.
- Run all owning unit files, TASK-540 contract/executor/host self-tests, widget
  dry-run/strict focused tests, `bun --cwd core lint:types`, `bun --cwd core lint`,
  `bun run precommit:check`, `bun run gates:coderso`,
  `bun run scan:security:strict`, `git diff --check`, task-graph checks, and
  touched source/test line counts.

## Benchmark and Closure Result

The owner made TASK-540 fast the final required runtime row after the earlier
product/security gates were already green. The fresh command
`bun scripts/runtime-smoke.ts run --suite task-540 --profile fast --session
wf552-task540-fast-15` passed in `1178.580s` (`19:38.580`) with all seven flows,
13 PNGs, zero console errors, nine repository snapshots, and complete DB,
storage, auth, process, and port cleanup. The owner accepts the measured
`4:38.580` residual over the aspirational 15-minute target; closure does not
claim that target was met.

Compared with the earlier `36.9m` fast run this is `46.77%` shorter and
`1.879x` faster. Compared with the historical `56.5m` full-strength run it is
`65.23%` shorter and `2.876x` faster, with the explicit caveat that the latter
used the 60-second authentication profile. Durable evidence lives in
`_docs/_workflows/_smoke/task-552-task-540-fast-2026-08-06.md`.

TASK-540 certification remains a release-boundary lane. Widget fast and
production certification are adapter/test coverage in this family, not claimed
live benchmark passes. Closure uses the targeted 58-test runtime-smoke suite,
root TypeScript check, exact full TASK-540 smoke, cleanup proof, diff/line-count
checks, docs, changelog 1264, and explicit no-migration decision; it does not
replay unrelated gates or audits.
