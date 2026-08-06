# TASK-552-03-L02: Adapters, Benchmarks, Documentation, and Closure
# FileName: TASK-552-03-L02-Adapters-Benchmarks-Documentation-And-Closure.md

**Parent Subtask:** TASK-552-03
**Priority:** High
**Category:** Testing Infrastructure / Integration / Documentation / Closure
**Estimated Effort:** Large
**Dependencies:** TASK-552-03-L01 complete
**Status:** ✅ Done
**Started:** 2026-08-06
**Completed:** 2026-08-06
**Changelog:** 1264 (family closure)

---

## Objective

Compose the landed shared capabilities through three thin suite adapters, run
the owner-selected complete TASK-540 benchmark, document repo-wide reuse, and
close TASK-552.
Adapters own product selectors/flows/configuration only; shared lifecycle,
workers, DB batches, browser transport, checkpoints, timing, and reports must
not be copied.

## Exact Single-Writer Ownership

This leaf alone creates:

- `scripts/runtime-smoke/adapters/task-540.ts`;
- `scripts/runtime-smoke/adapters/widget-contract.ts`;
- `scripts/runtime-smoke/adapters/production-boundary.ts`;
- `scripts/runtime-smoke/adapters/task-540/auth-window.ts`;
- `tests/unit/runtime-smoke/task540-adapter.test.ts`;
- `tests/unit/runtime-smoke/widget-adapter.test.ts`;
- `tests/unit/runtime-smoke/production-boundary-adapter.test.ts`.

After source, tests, gates, audits, and runtime evidence freeze, this closure
leaf alone updates `AGENTS.md`, `tests/README.md`, `_docs/TESTING_STRATEGY.md`,
the TASK-552 family files, `_docs/_TASKS/README.md`, changelog `1264`, and
`_docs/_CHANGELOG/README.md`. It does not edit the oversized legacy widget
runner/test, product code, TASK-551 files, migrations, or sibling-owned shared
modules. Any necessary cross-ownership source change requires a contract fix
and affected audit before editing.

## Adapter Contract

- `task-540` composes all seven canonical scenarios, 496 logical actions,
  420/76 receipt partition, 13 screenshots, worker operation pack, segment plan,
  reset/checkpoint proofs, and zero console/page errors.
- `fast` uses only the supported five-second auth window and restores the exact
  prior value after success, failure, signal, or resume. `certification` uses
  the real 60-second window; deliberate wait time is reported separately.
- `widget-contract` invokes the existing runner as one supervised child.
  Static adapter configuration makes fast the strict focused
  `gallery-mosaic` benchmark; no extra public CLI flags are introduced. Because
  the legacy gallery report does not itself guarantee a screenshot or public
  console/page-error proof, the adapter writes a bounded task-scoped inventory
  overlay that marks only gallery as screenshot priority, then runs a fresh
  shared-transport public probe with listeners installed before navigation.
  The overlay is removed in cleanup and no empty error array is manufactured.
- `production-boundary` owns the production server PID/port and verifies root,
  Admin, install status, one built asset, exact `/peri` 404, root recovery,
  bounded clean logs, exact stop, and released port.
- Every adapter returns the shared strict result schema and declares exact
  host, profile, environment projection, scenarios, cleanup, evidence paths,
  and reset/checkpoint capabilities.

The public command remains exactly:

```text
bun scripts/runtime-smoke.ts run --suite <task-540|widget-contract|production-boundary> --profile <fast|certification> --session <name>
```

## Execution Pseudocode

```ts
const task540 = defineSuiteAdapter({
  host: "coderso-dev-core-host",
  profiles: { fast: fiveSecondWindow, certification: productionWindow },
  run: (ctx) => runScenarios(ctx, compileTask540Adapter(ctx)),
  cleanup: (ctx) => cleanupTask540Ledger(ctx),
  expected: { scenarios: 7, actions: 496, browser: 420, runtime: 76, png: 13 },
});

async function benchmark(command) {
  const before = await captureHostRevisionAndFixtureShape();
  const result = await runExactPublicCli(command);
  assertSameEnvironment(before, result);
  assertEvidenceAndCleanup(result);
  return writeSafeBenchmarkComparison(result);
}
```

## Benchmark Result

```bash
bun scripts/runtime-smoke.ts run --suite task-540 --profile fast \
  --session wf552-task540-fast-15
```

The fresh full run passed in `1178.580s` (`19:38.580`) with seven scenarios,
13 PNGs, zero console errors, nine repository snapshots, and complete cleanup.
The owner accepts this measured residual over the 15-minute target. The widget
and production adapters passed their owning unit tests but are not claimed as
live benchmark runs; TASK-540 certification remains a release-boundary lane.
Durable evidence is
`_docs/_workflows/_smoke/task-552-task-540-fast-2026-08-06.md`.

## Failure Handling

Adapter/schema mismatch, host/readiness failure, assertion/console/page error,
missing screenshot, auth restore failure, stale checkpoint, benchmark identity
drift, leftover fixture/process/port, or report failure blocks closure. A
harness-only repair reruns its self-test and affected smoke; product failure
reruns only the affected scenario after proven reset; interruption resumes only
from a compatible seal. Static gates and unrelated audits are not replayed.

## Security Contract

- **Visibility:** local developer/test tooling; production probes are read-only.
- **Auth/RBAC/CSRF/rate limits:** existing contracts stay active; no bypass.
- **Validation:** fixed adapters/profiles/origins/hosts, exact scenario totals,
  bounded reports/evidence, strict cleanup and reject-unknown outputs.
- **Anti-abuse/secrets:** no public write. Least-privilege environments; no
  shell/raw SQL/dynamic source, credentials/cookies/tokens/headers/PII/raw logs
  in reports, screenshots, checkpoints, or benchmark evidence.

## Gates and Closure

```bash
bun test tests/unit/runtime-smoke
node _docs/_workflows/task-540-smoke-executor.mjs --self-test
node _docs/_workflows/task-540-smoke-host.mjs --self-test
bunx tsc -p tsconfig.json --noEmit --pretty false
git diff --check
```

The product/security gates and TASK-540 audits predate this harness-only leaf and
remain valid; they are not replayed. Closure uses the focused 58-test harness
suite, root TypeScript check, the fresh full smoke and cleanup proof, task-graph/
H1/FileName/parent/status/changelog checks, and touched-file line counts. It
requires all descendants terminal, changelog 1264 covering every leaf,
synchronized board statistics, and no migration/index.
