# TASK-552-04: Native TASK-540 Suite Migration and Legacy Cleanup
# FileName: TASK-552-04-Native-TASK-540-Suite-Migration-And-Legacy-Cleanup.md

**Parent Task:** TASK-552
**Priority:** High
**Category:** Testing Infrastructure / Runtime / Performance / Cleanup
**Estimated Effort:** Very Large
**Dependencies:** TASK-552-01 through TASK-552-03 landed; corrective audit grounded on 2026-08-06
**Status:** ✅ Done
**Started:** 2026-08-06
**Completed:** 2026-08-08
**Changelog:** 1264 (Final)

---

## Objective

Finish the migration that TASK-552 previously claimed complete. The registered
`task-540` suite must own its executable contract under
`scripts/runtime-smoke/`, use the shared persistent workers, Playwright
dispatcher, supervised server resource, lifecycle, timing, cleanup and report
contracts directly, and leave no executable TASK-540 harness under `_docs/`.
The existing widget contract must also stop owning a parallel Playwright/process
loop and use the same shared dispatcher end to end.

This is a tooling correction only. It preserves the proven seven scenarios,
496 logical actions (420 browser and 76 runtime), 13 PNGs, visible-effect and
console/page-error assertions, first-failure identity and complete cleanup. It
must not reinterpret or weaken TASK-540 product behavior to make migration
easier.

## Grounded Reopen Evidence

The 2026-08-06 audit found that the shared CLI is real, but its TASK-540 adapter
still transitively executes the old workflow tree:

- `_docs/_workflows/task-540-smoke/**` contains 162 `.mjs` modules;
- seven additional top-level `task-540-*.mjs` workflow modules bring the legacy
  deletion inventory to exactly 169 modules;
- the registered adapter reaches 148 legacy modules, approximately 58,886
  physical lines, through dynamic root-module loading; that closure includes 44
  import-time self-test modules;
- the separate host subprocess adds `task-540-smoke-host.mjs` plus 16 host
  modules, while four further top-level files are workflow-only, yielding the
  exact 169-file deletion inventory;
- the worker bridge still carries 57 unique source-string handler bodies behind
  160 accepted operation IDs/aliases and compiles them through a dynamic
  Blob/module import path instead of static typed handlers;
- the practical `playwright-cli` dispatcher and supervised-server lifecycle are
  still private adapter implementations rather than shared capabilities;
- the widget adapter still spawns the 5,530-line
  `scripts/playwright-widget-contract-smoke.ts`, whose direct Bun/Playwright
  process and fixed-wait loops bypass the shared runtime-smoke wrappers.

The historical `19:38.580` fast run remains valid evidence that the wrapped
flow passed. It is not evidence that the old runtime was migrated or removable.
Changelog 1264 therefore remained a draft until this corrective family closed.

## Execution Leaves and Land Order

| ID | Title | Status |
|---|---|---|
| TASK-552-04-L01 | Native Suite Relocation and No-Docs-Import Boundary | ✅ Done |
| TASK-552-04-L02 | Typed TASK-540 Operations and Persistent Worker | ✅ Done |
| TASK-552-04-L03 | Shared Playwright Dev Host and Scenario Composition | ✅ Done |
| TASK-552-04-L04 | Legacy Deletion, Benchmark, Docs, and Reclosure | ✅ Done |

Land strictly in this order:

1. freeze all 169 legacy paths in one reviewed, exclusively classified manifest
   and relocate only L01-owned pure/stable contract/shared modules; every
   source-dependent executor/runtime, operation descriptor/registry and every
   browser/host/composition path is excluded; keep the registered adapter
   unchanged;
2. freeze the exact 160-ID-to-57-handler mapping, including per-alias input and
   output schema authority, then replace the complete source-dependent
   executor/runtime/descriptor/registry lane through static typed
   `WorkerOperationDefinition` entries on the shared `WorkerPool`;
3. extract and adopt one shared Playwright dispatcher and supervised server,
   mandatorily split/migrate the complete 5,530-line widget runner into
   cohesive <=1,000-line modules, compose TASK-540 browser/host modules, and
   perform the only registered adapter switch;
4. port essential tests, delete the exact legacy inventory, run both runtime
   profiles, update documentation and reclose only from fresh evidence.

## Single-Writer Boundaries

- L01 owns the immutable 169-path source manifest and only destination files
  whose full graph is pure/stable under `suite/contract/**` or
  `suite/shared/**`. It never moves a source-dependent executor/runtime,
  operation descriptor/registry, browser, host or composition file and never
  edits the registered adapter.
- L02 alone owns every manifest path that participates in source execution,
  typed executor/runtime dispatch, operation descriptor/registry authority,
  response-lost reconciliation or worker cleanup; native `suite/operations/**`
  plus its source-dependent `suite/executor/**`/`suite/runtime/**` modules; all
  57 static handlers; the frozen 160-ID alias/input/output fixture; all 160
  `WorkerOperationDefinition` entries; worker entry/bridge; and operation/
  cleanup tests. It does not own browser, server or adapter composition files.
- L03's TASK-540 authority is exclusively native `suite/browser/**`,
  `suite/host/**`, `suite/composition/**`, browser execution seams and
  `task-540.ts`. It also owns the final no-`_docs` dependency test, shared
  Playwright/server code, mandatory complete widget runner/oversized-test splits
  and production-boundary adoption. It imports L01/L02 contracts read-only.
- L04 consumes the immutable L01 manifest read-only and owns the exact legacy
  deletion, workflow-only test removal, coverage mapping, documentation,
  benchmarks, evidence and TASK-552/changelog/board reclosure.

Every legacy path receives one source disposition and every new physical path
receives exactly one leaf writer. L01 never creates a file later rewritten by
L02/L03. L02/L03 reimplement their classified legacy behavior directly in their
exclusive destination directories; L04 only deletes the untouched old paths.

## Locked Acceptance Contract

- `bun scripts/runtime-smoke.ts run --suite task-540 --profile fast --session
  <safe-name>` and the corresponding `certification` command both execute the
  same seven product scenarios and 496 logical actions.
- Profile differences are infrastructure timing only. Neither profile may skip
  a scenario, assertion, screenshot, console/page-error listener or cleanup.
- The registered runtime dependency graph contains no import, require, dynamic
  path or subprocess entry under `_docs/_workflows/task-540*`.
- Bun/DB work uses static registered operation IDs, strict schemas and bounded
  `WorkerPool` profiles. All 57 handler bodies and 160 operation IDs have exact
  alias-to-handler, input-schema and output-schema parity coverage. No source
  string, arbitrary module path, raw SQL frame, Blob URL or dynamic worker-code
  import remains.
- Privileged bootstrap-preflight, identity-proof and provisioning clients close
  at each phase boundary. Their already-started `WorkerClient` objects prove
  absence immediately; later work restarts lazily with a different PID, while
  unrelated non-privileged workers remain persistent.
- Browser work uses the shared `PlaywrightCliDispatcher`; TASK-540, the widget
  adapter and TASK-547 consume the same exported capability rather than private
  copies. The widget compatibility CLI is thin and contains no independent
  Playwright/process/wait loop.
- Dev-server work uses `startSupervisedServer(...)` and
  `SupervisedServerResource`. The helper self-registers before spawn; TASK-540's
  literal `coderso-dev-core-host` name is the only PATH-resolved server command,
  resolves internally to an absolute executable through an explicitly bounded
  projected PATH, and owns the 3000/5173/5174 development host. Environment
  projection is exact-key/required-key and evidence records names, never values.
- Cleanup remains ownership-safe and set-based, restores the exact auth/window
  and settings baselines, proves DB/storage/session/process/port absence and
  never deletes by broad slug or unverified pattern.
- All touched human-authored production and test files remain at most 1,000
  physical lines.

## Local Tooling and Security Constraints

No endpoint or product security contract changes, so no API Security Contract
is required. This local-only harness still fails closed: fixed suite/operation
registries, loopback-only origins, canonical paths, safe session names,
least-privilege environment projection, bounded frames/logs/timeouts, no shell
fragments, no arbitrary SQL/module/source execution, and no credentials,
cookies, tokens, PII, SQL/binds or raw logs in reports/screenshots/checkpoints.

## Reclosure Gates

Reclosure requires all four leaves terminal, targeted tests after every leaf,
root/core static checks for touched contracts, the complete runtime-smoke unit
lane, task-graph and line-count checks, `git diff --check`, zero executable
legacy paths, and fresh green fast plus certification runs with cleanup proof on
the same final native tree. The old TASK-552-03-L02 fast-only closure and
`19:38.580` receipt remain historical/superseded comparison evidence. Changelog
Changelog 1264 and the board remained draft/in progress until both current-tree
results existed.

## Completion Evidence

All four leaves are terminal. The 169-module legacy runtime is absent, the
registered TASK-540 dependency graph is native, and the 57-handler/160-alias
typed contract plus shared Playwright/dev-host composition are covered by the
green 164-test runtime-smoke lane. On the same final native code, TASK-540 fast
passed in `349.437s` and certification passed in `682.228s`; both retained all
seven scenarios, 496 actions, 13 PNG paths, zero console/page errors, two
repository snapshots and complete 60-receipt cleanup. Changelog 1264 and the
board are therefore final.
