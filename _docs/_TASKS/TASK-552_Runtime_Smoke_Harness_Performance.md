# TASK-552: Runtime Smoke Harness Performance
# FileName: TASK-552_Runtime_Smoke_Harness_Performance.md

**Priority:** High
**Category:** Testing / Developer Experience / Performance / Reliability / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-540 and TASK-546 complete
**Related Tasks:** TASK-543, TASK-545, TASK-548, TASK-550, TASK-551
**Status:** ✅ Done
**Started:** 2026-08-06
**Reopened:** 2026-08-06
**Completed:** 2026-08-08
**Previous Completion:** 2026-08-06 (superseded by the corrective reopen)
**Historical Closure:** TASK-552-03-L02 fast-only evidence is superseded and is not final evidence
**Changelog:** 1264 (Final)

---

## Objective

Replace task-local process-per-action smoke execution with one reusable,
measured runtime-smoke platform for current and future workflows. Preserve the
complete TASK-540 product proof while reducing physical Playwright, Bun, Git,
and database round trips. Speed must come from shared transports, batching,
polling, and resumable scenario boundaries, never from fewer assertions.

The only public command for the initial suites is:

```text
bun scripts/runtime-smoke.ts run --suite <task-540|widget-contract|production-boundary> --profile <fast|certification> --session <name>
```

New workflows add a thin registered suite adapter and compose the shared
wrappers under `scripts/runtime-smoke/`; they must not copy lifecycle,
Playwright, worker, database cleanup, timing, checkpoint, or reporting loops.

## Corrective Reopen

The shared CLI and generic primitives landed, but the 2026-08-06 audit proved
that the registered TASK-540 adapter still transitively executes 148 modules
from the old `_docs/_workflows/task-540*` runtime (approximately 58,886 lines),
including 57 unique source-string handler bodies behind 160 accepted operation
IDs and dynamic module compilation. The old tree contains 169 workflow modules
in total and therefore cannot yet be removed. The widget adapter also still
spawns a 5,530-line runner with its own Playwright/process/wait loop.
TASK-552-04 owns the native relocation, typed worker operations, full widget
runner split, shared Playwright/server adoption, exact legacy deletion and fresh
fast plus certification proof. The earlier benchmark remains historical
behavior evidence only; it does not prove a complete migration.

## Verified Baseline and Database Decision

- TASK-540 contains 496 logical actions: 420 browser and 76 runtime actions,
  seven real product scenarios, 13 screenshots, and 72 nominal cleanup/proof
  operations.
- The current harness starts a fresh `playwright-cli` process for nearly every
  browser action, snapshots the repository before and after every action, and
  starts a fresh Bun/DB process for individual bridge operations.
- Browser work is interrupted by parent-side runtime dependencies. The current
  plan has about 16 contiguous browser segments; one uninterrupted program per
  scenario is therefore not a truthful or implementable contract.
- A fresh Bun process plus DB connection costs about 1.1 seconds per operation;
  one persistent process performed 72 sequential DB round trips in about 12.4
  seconds instead of roughly 81 seconds of one-shot overhead.
- PostgreSQL uses migration `0070`'s access-log index and measured harness
  lookups are sub-millisecond to low-millisecond. TASK-552 adds no migration or
  index. The pre-existing `users_email_hash_idx` representation drift belongs
  to TASK-551; TASK-552 must not duplicate live DDL.

## Scope

- Add the strict CLI, static three-suite registry, host lifecycle, bounded
  readiness polling, process supervision, monotonic timings, repository guard,
  redaction, and versioned JSON/Markdown reports under `scripts/runtime-smoke/`.
- Provide reusable profile-scoped persistent Bun workers. Each worker receives
  only its declared environment; no union-secret worker, raw SQL frame,
  arbitrary module path, or dynamic source is allowed.
- Freeze the exact TASK-540 operation authority as 160 accepted operation IDs
  (57 canonical IDs, 26 explicit aliases, 36 response-lost aliases and 41
  resource aliases) mapped to 57 typed handler bodies, with exact per-alias
  input/output-schema parity.
- Provide reusable set-based DB cleanup/proof primitives and a TASK-540
  operation pack that preserves provenance, transaction rollback, response-lost
  reconciliation, and the original ordered logical receipts.
- Provide one run-scoped Playwright transport over a named session. It batches
  consecutive browser actions into bounded contiguous segments, pauses for
  runtime barriers, then resumes without claiming one physical process for an
  impossible cross-barrier flow.
- Provide reusable sealed-checkpoint contracts, compatibility validation, and
  atomic storage plus a TASK-540 seven-scenario reset inventory. TASK-540's
  canonical executor still owns terminal full-flow cleanup, so automatic resume
  is not claimed until a future adapter proves per-scenario cleanup/reset and
  consumes those seals end to end.
- Add thin adapters for TASK-540, the existing widget contract (focused
  `gallery-mosaic` fast benchmark), and TASK-546's production boundary.
- Split the oversized widget runner and its oversized unit test by cohesive
  responsibility, preserve its direct CLI, and route every widget Playwright
  session/process through the shared dispatcher/supervisor without fixed settle
  sleeps or private command loops. This complete 5,530-line migration is a
  mandatory L03 deliverable, not deferred cleanup.
- Document the extension contract so later workflows reuse the same entry
  point, transports, workers, batching, evidence, and cleanup ownership.
- Benchmark complete TASK-540 fast and certification runs on the final native
  tree. Validate the widget and production-boundary adapters in their owning
  tests and run the bounded widget host/Playwright integration probe without
  claiming an unexecuted live result.

## Out of Scope

- Product UI/API/auth/RBAC/CSRF/rate-limit/persistence changes.
- Any TASK-552 schema, migration, snapshot, journal, or index change.
- Weakening TASK-540's seven flows, 496 action identities, visible-effect
  assertions, light/dark coverage, 13 PNGs, console checks, or cleanup.
- Retrofitting every historical task workflow; the documented shared adapter
  contract is mandatory for new work and adopted by the three initial suites.

## Locked Shared Architecture

`scripts/runtime-smoke.ts` parses only the exact `run`, `--suite`, `--profile`,
and `--session` shape above. Suite IDs and adapter module paths are a static
allowlist. Suite-specific choices live in registered adapter configuration,
not extra public shell/process/database arguments.

Shared code owns lifecycle, local-origin validation, polling, process groups,
bounded streams, repository mutation checks, timing/counters, worker pools,
browser transport, checkpoints, redaction, cleanup aggregation, and reports.
Thin adapters own selectors, fixtures, logical flows, registered worker
operations, reset proofs, and suite-specific evidence. No executable TASK-540
runtime may remain under `_docs/` after TASK-552-04 closes, and the widget suite
may not retain a private Playwright/process/wait loop behind its adapter. Every
initial registered suite uses the shared wrappers for each capability it needs;
the compatibility widget CLI calls the same modular suite as its adapter.

`fast` retains every product-visible scenario but uses the existing supported
five-second auth window and restores the exact prior value in `finally`.
`certification` uses the real production-strength 60-second window. Reports
separate deliberate product waits from harness overhead; profiles never
silently fall back.

Browser receipts retain all 420 logical action IDs and exact first-failure
identity. The frozen plan has 16 scenario/runtime groups; native, screenshot,
global-list, capture-frontier, and bootstrap-login boundaries compile those to
75 physical browser dispatches before any measured byte-limit splits, with
pause/resume around the 76 runtime actions.
The named browser session persists across segments. Repository snapshots occur
only at baseline, sealed checkpoint boundaries as needed, and finalization.

Workers use bounded versioned NDJSON over inherited pipes, strict exact-key
schemas, monotonic request IDs, registered operation IDs, per-profile handler
allowlists, `DB_POOL_MAX=1`, bounded timeouts, and exact process cleanup.
Destructive operations are never blindly replayed after an uncertain response.
DB-owned cleanup is grouped into foreign-key-safe transactional waves and
projected back to the canonical logical receipt order; Admin API cleanup stays
API-owned where it proves product behavior.

Privileged bootstrap-preflight, user-identity-proof and user-provisioning
profiles close at their phase boundary. The used clients must prove immediate
absence before the next phase; a later genuine dispatch restarts lazily with a
different PID. The normal database worker stays persistent for its bounded run.

Checkpoints bind suite/profile, revision and working-tree digest, harness and
scenario digests, fixture namespace/ledger, origins, reset proof, completed
actions, and evidence hashes. They contain no secrets or raw customer data.
Only a scenario that completed assertions, console checks, screenshots,
cleanup, setting restoration, canonical reset, and repository guard may seal.

## Task Tree and Land Order

This family contains four technical subtasks and eight execution leaves (12
physical descendants):

| ID | Title | Status | Leaves |
|---|---|---|---|
| TASK-552-01 | Shared Runtime Smoke Entry Point and Timings | ✅ Done | TASK-552-01-L01 |
| TASK-552-02 | Profile-Scoped Persistent Bun Bridge and Batched Cleanup | ✅ Done | TASK-552-02-L01 |
| TASK-552-03 | Browser Scenario Batching, Checkpoints, and Benchmarks | ✅ Done | TASK-552-03-L01, TASK-552-03-L02 |
| TASK-552-04 | Native TASK-540 Suite Migration and Legacy Cleanup | ✅ Done | TASK-552-04-L01, TASK-552-04-L02, TASK-552-04-L03, TASK-552-04-L04 |

Land strictly:

1. `TASK-552-01-L01` — shared CLI, registry, lifecycle, polling, timing,
   supervision, repository guard, report, and adapter seam.
2. `TASK-552-02-L01` — reusable profile workers and transactional batched DB
   operations, then TASK-540 integration.
3. `TASK-552-03-L01` — reusable Playwright segment transport and checkpoints,
   then TASK-540's bounded segment/reset integration.
4. `TASK-552-03-L02` — three thin adapters, benchmarks, documentation,
   and the now-superseded first closure evidence.
5. `TASK-552-04-L01` — exact 169-path classification plus only pure/stable native
   contract/shared relocation; the registered adapter is intentionally not
   switched yet.
6. `TASK-552-04-L02` — every source-dependent executor/runtime/descriptor/
   registry path, the frozen 160-ID-to-57-handler input/output mapping and all
   160 static definitions on shared persistent, phase-scoped workers.
7. `TASK-552-04-L03` — shared Playwright CLI dispatcher, self-registering
   supervised server, full widget runner/test split, native TASK-540 browser/
   host composition and the only registered adapter switch.
8. `TASK-552-04-L04` — exact legacy deletion, coverage port, fast and
   certification benchmarks, documentation, changelog 1264 and reclosure.

Each implementation source/test file has exactly one leaf writer. If an
implementation needs to cross an ownership boundary, correct and re-audit the
affected contracts before editing.

## Acceptance and Performance Contract

- TASK-540 preserves seven flows, 496 actions, 420/76 receipt partition, 13
  valid PNGs, visible assertions, dark/light coverage, zero console/page errors,
  and complete fixture/session/process/port/settings cleanup.
- TASK-540 fast retains the 10–15 minute target. The historical wrapped run was
  `19:38.580`; reclosure records the fresh native duration truthfully and does
  not claim the target or an improvement unless comparable evidence proves it.
- A no-resume run uses no per-action Git snapshots and at most nine full
  repository snapshots (baseline, the seven safe scenario boundaries, and
  finalization), plus cheap known-screenshot rehashes around screenshot actions.
- Nominal browser execution reports every physical segment/process and reduces
  420 per-action launches to the dependency-bounded segment plan; no fallback
  or restart is hidden.
- The database profile is persistent with pool max one; privileged profiles
  remain isolated and close with immediate absence at phase boundaries before
  any lazy restart. Batched cleanup/proofs use bounded waves, exact provenance,
  affected-row parity, and post-commit absence proof.
- `widget-contract` fast exercises the existing strict focused
  `gallery-mosaic` flow; `production-boundary` proves root/Admin/install status,
  a built asset, exact `/peri` 404, root recovery, clean logs, and PID/port
  cleanup.
- The complete widget contract keeps its backwards-compatible direct CLI, but
  both that CLI and the registered adapter call one modular suite whose browser
  and process work uses shared runtime-smoke capabilities only. Every extracted
  production/test file is at most 1,000 physical lines.
- `startSupervisedServer(...)` self-registers before spawn, resolves only the
  literal `coderso-dev-core-host` through an explicitly bounded projected PATH
  to an absolute executable, and projects only named required/optional/fixed
  runtime environment keys. Evidence records key names and never values.
- All three suites are invokable through the exact public CLI. Reports contain
  suite/profile/session, pass/server state, scenario and phase timings,
  process/snapshot counters, suite cleanup/worker/database metrics,
  screenshots, console errors, lifecycle cleanup, and failures.
- Every touched human-authored production/test file is at most 1,000 physical
  lines.

## Security Contract

- **Visibility:** local developer/test CLI only; no endpoint is added.
- **Auth/RBAC/CSRF/rate limits:** existing product contracts remain unchanged;
  fast mode only uses the existing safe auth-window helper and always restores.
- **Validation:** CLI, registry, paths, origins, reports, frames, operation IDs,
  checkpoints, ledgers, arrays, and outputs are strict reject-unknown/bounded.
- **Anti-abuse/secrets:** public nonce/HMAC/CAPTCHA are not applicable. No
  arbitrary command, SQL, source, remote origin, or union-secret environment;
  credentials, cookies, tokens, URLs with secrets, PII, SQL/binds, and raw logs
  are excluded from evidence.

## Required Validation and Documentation

Run leaf-targeted tests after each land, the replacement TASK-540 native
contract/operation/browser tests, split widget suites, root TypeScript,
task-graph checks, `git diff --check`, and touched-file line counts.
Product/security gates already green before this harness-only family are not
replayed. Runtime reclosure requires fresh complete TASK-540 fast and
certification runs with bounded post-run cleanup proof; repeat only an
interrupted or affected runtime boundary.

Document the command, profiles, suite adapter API, shared worker/operation-pack
API, browser segmentation, checkpoint rules, evidence locations, cleanup rules,
and troubleshooting in `tests/README.md` and `_docs/TESTING_STRATEGY.md`, and
update `AGENTS.md` so future workflows compose this shared platform.

## Superseded Historical Evidence

The following results describe the adapter-wrapped legacy run and remain useful
as a comparison baseline. They are not current TASK-552 closure evidence:

- `bun test tests/unit/runtime-smoke`: 58 pass, 548 assertions, 0 fail.
- Root TypeScript check passed.
- Full TASK-540 fast runtime smoke passed in `1178.580s` with seven scenarios,
  13 PNGs, zero console errors, nine repository snapshots, and cleanup PASS.
- Post-run proof found exact auth/bootstrap restoration, zero DB/storage fixture
  leakage, zero owned processes, and released ports `3000`, `5173`, and `5174`.
- Compared with `36.9m` fast, runtime is `46.77%` shorter (`1.879x`); compared
  with historical `56.5m` full-strength it is `65.23%` shorter (`2.876x`), with
  the documented authentication-profile caveat.
- No migration or index was added. Migration `0070` remains the intentional
  recurring access-log lookup index.
- Durable receipt:
  `_docs/_workflows/_smoke/task-552-task-540-fast-2026-08-06.md`.

The final reclosure evidence below, owned by TASK-552-04-L04, proves zero
executable legacy modules plus both fast and certification profiles on the
same final native tree. The old fast-only TASK-552-03-L02 closure stays
historical/superseded after the family reclosure.

## Final Reclosure Evidence

TASK-552 reclosed on 2026-08-08 after the exact legacy deletion and native
migration were proved from the final tree. The final comparable receipts are:

- `fast`: PASS in `349.437s` (`5:49.437`), seven scenarios, 496 logical
  actions, 13 PNG paths, zero console/page errors, two repository snapshots,
  149 Playwright run-code dispatches, five worker starts / 31 requests, exact
  auth-window restoration and 60 cleanup receipts;
- `certification`: PASS in `682.228s` (`11:22.228`) with the identical product
  contract, 149 dispatches, five worker starts / 29 requests, unchanged
  production auth settings and 60 cleanup receipts.

Native fast is `70.35%` shorter than the comparable `1178.580s` wrapped-fast
receipt while preserving every scenario and assertion. The certification
delta is intentionally dominated by six real production-strength auth-window
barriers. The complete runtime-smoke unit lane passed 164 tests / 6,760
assertions, repo-wide TypeScript and diff checks passed, the executable legacy
count is zero, and every touched production/test file respects the 1,000-line
limit. No schema, migration, snapshot, journal or product endpoint was added.
