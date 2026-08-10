# TASK-489-03-L02: Tests, Six-Flow Shared Runtime Smoke, Docs, Changelog, and Closure
# FileName: TASK-489-03-L02-Docs-And-Closure.md

**Parent Subtask:** TASK-489-03
**Priority:** High
**Category:** Solution Kits / Tests / Runtime Smoke / Docs / Closure
**Estimated Effort:** Very Large
**Dependencies:** All TASK-489 parent-level start gates; TASK-489-03-L01 and all prior TASK-489 leaves green; TASK-547 done; complete terminal TASK-551/TASK-414-03-L03 receipts
**Status:** ⏳ To Do
**Changelog:** 1268 (pinned; sole closure writer)

---

## Overview

Close the complete family with dependency-shaped regression coverage, exactly
six real shared runtime-smoke flows in both profiles, synchronized source-of-
truth docs, changelog 1268, all ten task statuses, task board/statistics, final
drift audit, line-count gates, and truthful validation receipts. This leaf must
not reopen product source.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Tests/smoke:**
`scripts/runtime-smoke/contracts.ts`, `scripts/runtime-smoke/cli.ts`,
`scripts/runtime-smoke/registry.ts`,
`scripts/runtime-smoke/adapters/solution-kit-run-operations.ts` (new),
`scripts/runtime-smoke/adapters/solution-kit-run-operations/worker-entry.ts` (new),
`scripts/runtime-smoke/adapters/solution-kit-run-operations/worker-operations.ts` (new),
`scripts/runtime-smoke/adapters/solution-kit-run-operations/production-handlers.ts` (new),
`scripts/runtime-smoke/adapters/solution-kit-run-operations/environment.ts` (new),
`scripts/runtime-smoke/adapters/solution-kit-run-operations/fixture-definitions.ts` (new),
`scripts/runtime-smoke/adapters/solution-kit-run-operations/fixture-coordinator.ts` (new),
`scripts/runtime-smoke/adapters/solution-kit-run-operations/browser-actions.ts` (new),
`scripts/runtime-smoke/database/exclusive-lease.ts` (new shared helper),
`scripts/coderso-release-gates.ts` for the exact reliability/security regression
commands,
`tests/unit/runtime-smoke/cli-registry.test.ts`,
`tests/unit/runtime-smoke/solution-kit-run-operations-adapter.test.ts` (new), and
`tests/unit/runtime-smoke/solution-kit-run-operations-worker.test.ts` (new),
`tests/unit/runtime-smoke/solution-kit-run-operations-fixtures.test.ts` (new), and
`tests/unit/runtime-smoke/exclusive-database-lease.test.ts` (new), and
new `tests/unit/release/codersoReleaseGates.test.ts`.

**Docs/closure:**
`_docs/CMS_API.md`, `_docs/SOLUTION_KITS.md`, `_docs/SECURITY_SPEC.md`,
`_docs/AUDIT_SPEC.md`,
`_docs/ARCHITECTURE.md`, `_docs/ASSISTANT_SITE_BUILDER.md`,
`_docs/DATA_MODEL.md`, `_docs/TEMPLATE_CONTRACTS.md`, `_docs/CODERSO_MODULES.md`,
`_docs/CODERSO_RELEASE_GATES.md`, `docs/develop/plugins-and-store.md`,
`_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`,
`docs/develop/runtime-smoke-cookbook.md`, `tests/README.md`,
`docs/guide/coderso/solution-kits.md`,
terminal TASK-548 source records
`docs/guide/capabilities/atomic-controls.v1.json`,
`docs/guide/capabilities/composed-workflows.v1.json`, and
`docs/guide/capabilities/section-bindings.v1.json`, plus the exact tool-owned
TASK-548 generated-output inventory from its terminal receipt, including
`core/generated/docs/coderso-docs-v2.json`,
`core/generated/docs/coderso-docs-coverage-v2.json`, and
`docs/guide/_COVERAGE_MATRIX.md`,
`_docs/_CHANGELOG/1268-YYYY-MM-DD-task-489-safe-solution-kit-run-history-and-exact-rollback.md`
(substitute only the actual closure date; number and slug are fixed),
`_docs/_CHANGELOG/README.md`, `_docs/_TASKS/README.md`, and exactly
the ten existing TASK-489 files.

**Smoke evidence:** task-scoped screenshots/reports under
`_docs/_workflows/_smoke/evidence/task-489/<session>/` only. `wf489fast` uses
normal ignored/task-temporary operational output and creates no TASK-545
manifest, checkpoint, owner-review inventory, or closure artifact. Only
`wf489cert` contains terminal TASK-545 `manifest.json`, the strict shared
runtime-smoke `report.json`, referenced screenshots, and the phase-1-created
`resume-checkpoint.json`; no alternate evidence root is accepted.

No production service/route/client/hook/UI, DB schema/migration, TASK-551 owner,
unrelated task/changelog, AGENTS/config, TASK-555/TASK-556, TMP, apply/dry-run,
public/API-key path, full-site lifecycle module, or
`core/generated/cms/coderso-cms-capabilities-v1.json` may be edited. Generated
TASK-548 files are changed only by its terminal transaction, never by hand.

## Canonical Workflow And Evidence Gate

- Before any TASK-489 leaf dispatch, terminal TASK-545 must validate the exact
  tracked regular non-symlink owner
  `_docs/_workflows/task-489-implement.mjs` as byte-identical to HEAD and green
  under its canonical static/import contract. The same owner runs both profiles,
  but only the final certification branch creates and resumes a checkpoint;
  caller-selected workflow/root overrides fail closed.
- `wf489fast` is operational non-checkpoint evidence only. It runs the exact six
  scenarios and cleanup contract, but creates no TASK-545 manifest/checkpoint,
  has no owner-review or staging step, is never copied into the final evidence
  inventory, and has no closure authority.
- Complete every production/test/runtime-smoke adapter/release-gate write, all
  TASK-548 Guide/generated-output transactions, all other non-metadata docs,
  targeted and full gates, touched-file line counts, diff checks, and fresh
  post-audits before final certification. After fast passes and cleans up, no
  non-metadata mutation or gate may run before `wf489cert`.
- Only `wf489cert` writes its canonical
  `_docs/_workflows/_smoke/evidence/task-489/wf489cert/` inventory. Its manifest
  and report bind TASK-489, session/profile, HEAD, dirty-state digest, exact six
  scenario IDs, visible assertions, zero console/page errors, screenshot paths/
  hashes, and cleanup result. Unreferenced, untracked, linked, alternate-root, or
  cross-session files fail.
- Terminal TASK-545 phase 1 runs exactly once for `wf489cert`, validates revision/
  schema/file set/hashes, atomically creates `resume-checkpoint.json`, returns
  `owner_action_required`, and stops. Only the owner reviews and stages that exact
  certification directory. The emitted closure-only phase-2 resume runs through
  the same checkpoint-bound HEAD-identical workflow owner, requires exact tracked
  parity and unchanged hashes/revision, and does not replay implementation,
  gates, audits, or smoke. Agents never stage or commit.
- After that checkpoint, only changelog 1268, its changelog index row, the ten
  TASK-489 status fields, and the TASK board row/statistics may change under
  terminal TASK-545 rules. Any source, test, workflow, runtime-doc, generated
  TASK-548, evidence, gate, audit, smoke, or HEAD drift invalidates the checkpoint.

## Dedicated Runtime-Smoke Database And Fixtures

- Both profiles require non-empty `CODERSO_RUNTIME_SMOKE_DATABASE_URL` before a
  process, worker, browser, fixture, or server starts. `environment.ts` parses it
  and ordinary `DATABASE_URL` as PostgreSQL URLs and compares the canonical
  database identity `(lowercase hostname,effective port,decoded database name)`;
  query-string, password, encoding, or textual URL differences do not make the
  same database distinct. In addition to tuple inequality, the decoded dedicated
  database name must differ from the ordinary database name, preventing host/DNS
  aliases from bypassing isolation. Missing/invalid dedicated configuration,
  equal identity, or equal database name fails `smoke_argument_invalid`. The
  normal/shared URL is never a fallback.
- This leaf is the sole owner of the `CODERSO_RUNTIME_SMOKE_DATABASE_URL`
  infrastructure contract: it registers the variable in `.env.example` (additive
  documented line, no default value, alongside the existing entries) and in
  `docs/develop/runtime-smoke-cookbook.md` (dedicated-DB section), and owns the
  `environment.ts` parse contract. TASK-555-07-L02 consumes the same variable
  read-only through this contract and must not re-own or re-document it.
- `environment.ts` creates one bounded child environment by replacing
  `DATABASE_URL` with the dedicated value for both the supervised Coderso server
  and the database-bearing worker. No child receives the ordinary value. Tests
  pin aliases with different credentials/query/order as equal and genuinely
  different host/port/database identities as distinct, without printing either
  URL or credentials.
- Before baseline capture, `exclusive-lease.ts` opens one max-1 direct session to
  the validated dedicated database and obtains the shared global-settings runtime-
  smoke advisory lease keyed by the canonical database identity. It polls with a
  bounded 30-second deadline, returns `smoke_database_busy` before fixture writes
  on contention, records and rechecks one backend PID, and holds that exact session
  until cleanup plus baseline proof finish. Release/connection failure fails the
  profile and never reports clean evidence. The server/worker pools do not own or
  release this lease, and a transaction-pooler/session hop is rejected.
- `fixture-definitions.ts` is pure and builds only strict typed, session-prefixed
  `SolutionKitDefinition`/full-site package inputs through their current schemas.
  `fixture-coordinator.ts` is server-only and owns one typed session state machine
  for actor/session, definitions, source runs, rollback owners, resources,
  settings, audits, and invalidation receipts. `production-handlers.ts` delegates
  worker operations to that coordinator. Browser/worker frames contain bounded
  IDs/codes/digests only.
- Every valid run/item relation is produced through the actual apply/dry-run/
  claim/rollback APIs. The sole exception is the deliberately invalid
  `corrupt-detail-sentinel`: after dedicated-database/lease validation, one
  fixture-only server transaction inserts one session-scoped terminal run with a
  valid safe summary total of 512 and exactly 513 safe item rows, no snapshots,
  rollback actions, actor, owner, or domain mutation. This impossible-through-
  production-API row exists only to exercise the fail-closed read/UI boundary and
  is deleted by its exact recorded IDs. No other direct insert/update of
  `solution_kit_install_runs` or `solution_kit_install_items`, fabricated recovery
  evidence, broad service stub, `as unknown as`, or unsafe cast is allowed. A
  running fixture uses the real owner-claim lifecycle and remains registered for
  exact resume/cleanup.
- The fixed `applyStarterContent` flow may execute only after the dedicated-
  identity guard passes and only against that projected database. Session-scoped
  A/B definitions use the same package identity with scoped resource keys; C uses
  the real fixed Setup definition so its marker/envelope/audit path is genuine.
  No Setup flow may run against the ordinary/shared database.
- Before fixture creation the coordinator records exact presence-aware baselines
  for every setting as `{key,present:false}` or `{key,present:true,value}`, exact
  resource snapshots/IDs, permission assignments, and run/audit sets. Cleanup
  uses owner services and expected-current guards in reverse dependency order,
  deletes only coordinator-recorded created IDs, restores both absence and value,
  and proves the dedicated database baseline. It never truncates, broad-deletes,
  regex-scans, fabricates ledger cleanup rows, or treats `null` as absence.

## Shared Runtime-Smoke Registration

Register literal suite ID `solution-kit-run-operations` in all four shared
registry locations and support exactly `fast|certification`. Use the shared
lifecycle, polling, process supervision, bounded worker, browser framing,
redaction, timing, report, and cleanup contracts. Do not create a task-local
Playwright/process/DB loop or fixed sleep.

Run both:

```bash
bun scripts/runtime-smoke.ts run --suite solution-kit-run-operations --profile fast --session wf489fast
bun scripts/runtime-smoke.ts run --suite solution-kit-run-operations --profile certification --session wf489cert
```

Both profiles execute the same exact scenario IDs and visible effects:

| ID | Real flow and required visible effect |
|---|---|
| `history-pagination-light` | Seed >25 mixed-engine runs under a unique package key, including one running row with persisted legacy `{}` summary; in light mode open Solution Kits, observe exactly first-page rows, prove the running row shows nonterminal copy with no summary/zero counters, activate `Load more`, and prove new unique rows append in `createdAt DESC,id DESC` order with an end state and no prohibited DOM text. |
| `full-site-detail-dark` | In dark mode select a real TASK-547 full-site run containing all ten resource kinds; prove the detail displays all ten safe labels/counters, `itemTrace=complete`, zero omitted items, and computed dark-theme styles, while actor/options/snapshot/rollback/raw-error sentinels are absent from DOM and browser storage. Then select the real 513-item sentinel run through the same UI, observe the fixed `corrupt_detail` integrity state, and prove the safe history row remains while items/counters/rollback controls and raw error text remain absent. |
| `read-only-rbac` | Log in as a scoped fixture with `solution-kits:read` but without each write permission; history/detail remain visibly usable and no enabled rollback control/dialog exists. Server rollback attempt is denied with zero new run/item rows. |
| `rollback-confirm-cancel` | At an exact 390x844 viewport with both writes, open exact-source confirm and verify source/package visible and typed confirmation required. Assert history/detail stack vertically without rectangle overlap, each panel and the dialog remain inside viewport bounds, `documentElement.scrollWidth <= clientWidth`, then cancel and prove focus returns to the visible trigger while DB source/run/item/domain fingerprints remain unchanged. |
| `exact-legacy-rollback` | In the dedicated DB, seed `A` through a session-scoped real legacy definition, `B` as its newer successful all-noop same-package apply with byte-equal snapshots, and `C` through the fixed real Setup apply carrying the strict recoverable shell/template envelope. `A` visibly renders superseded copy, and direct POST returns 409 with zero writes. A pre-mutation fault on `C` proves terminal failed only with zero-net evidence, keeps the source/Setup marker active, releases that rollback claim, and a refreshed retry claims a different owner. A later fault after one committed mutation with incomplete compensation must return HTTP 202 recovery on the same running owner with no counters; resume that owner to success, proving same-transaction template mutation/revision/item receipt, expected-current shell restoration, atomic audit, durable invalidation, and marker release. Refresh and prove `B` is eligible while `A` is not; roll back `B`, prove `A` becomes eligible, then roll back `A` to complete `C -> B -> A -> null`. Failed/running/recovery relations never release a predecessor. |
| `exact-full-site-rollback` | Install a session-scoped real TASK-547 package through the existing full-site lifecycle, select that exact run, confirm rollback, and visibly prove the result plus restored/removed public/admin resource effects; assert fenced lifecycle evidence, same-transaction invalidation adoption, atomic terminal audit, and no legacy dispatcher mutation. One bounded fault proves failed only after no-mutation/full-compensation source-state evidence and that a retry claims a new owner. A partial/ownership-loss fault after a durable rollback owner exists returns HTTP 202 `recovery_required` with that same running owner ID and no counters, visibly renders recovery state, then resumes it to a proven terminal result without creating a second relation. |

Fast uses the minimum valid fixture cardinality; certification uses the large
profile fixture and full screenshot set. Neither profile may skip a scenario or
replace visible proof with control presence, CSS text, or direct DB-only claims.
Attach browser console/page-error listeners before navigation and require zero
console errors in every scenario.

## Exact Cleanup

- Prefix all fixture package/resource keys and the synthetic actor's email/display
  label with the validated session scope. The canonical actor identity remains
  the exact recorded UUID; never prefix, rewrite, derive, or substitute that UUID.
  Record every exact created ID before mutation.
- Cleanup in reverse dependency order through native owner APIs under the shared
  bounded worker and full-site writer fence where required. Never truncate,
  broad-delete, regex-scan, or remove rows not in the recorded ID set.
- Remove rollback/items/runs only after native resources are restored/removed and
  only by exact recorded IDs; preserve pre-existing TASK-547 fixtures.
- Restore permission assignments, auth incarnation, theme, selected kit, cache
  namespaces, settings values/presence, ports/processes, and browser session.
- Assert DB/resource/settings fingerprints equal pre-suite state, fixture ID sets
  are absent, shared lifecycle `proveAbsent()` passes, repository snapshot is
  unchanged except the declared canonical session evidence, and cleanup passes
  after failure too.
- Screenshots are redacted and contain no actor/options/snapshot/raw error data.

## Security Contract

- **Endpoint visibility:** suite exercises internal Admin routes only; source
  scan and HTTP checks prove no public/API-key registration.
- **Auth/RBAC:** real session fixtures cover read-only and require-all writes.
- **CSRF/rate limit:** exact rollback uses real CSRF and `admin_write`; negative
  request proves missing token is rejected without mutation.
- **Validation:** real strict query/path/empty-body and safe DTO boundaries.
- **Anti-abuse:** bounded fixtures/pages/workers, no arbitrary package upload,
  exact source and exact cleanup.
- **Sensitive data:** reports, console, screenshots, worker frames, and failures
  use safe IDs/codes/counters only; redaction validators fail closed.

## Implementation Pseudocode

```ts
const scenarioIds = Object.freeze([
  "history-pagination-light", "full-site-detail-dark", "read-only-rbac",
  "rollback-confirm-cancel", "exact-legacy-rollback", "exact-full-site-rollback",
]);

async function run(context: RuntimeSmokeContext) {
  assertSuiteAndProfile(context.input);
  const dedicated = requireDistinctRuntimeSmokeDatabase(process.env);
  const lease = await acquireExclusiveRuntimeSmokeDatabaseLease({
    databaseUrl: dedicated, family: "global-settings", timeoutMs: 30_000,
  });
  try {
    const coordinator = await createSolutionKitRunFixtureCoordinator({
      context, environment: projectDedicatedDatabaseEnvironment(dedicated),
    });
    const baseline = await coordinator.capturePresenceAwareBaseline();
    const fixtures = await coordinator.createSessionScopedFixtures(baseline);
    try {
      const scenarios = [];
      for (const id of scenarioIds) scenarios.push(await runRealFlow(id, context, fixtures));
      assertExactScenarioSet(scenarios, scenarioIds);
      assertZeroConsoleErrors(scenarios);
      return buildStrictResult(scenarios);
    } finally {
      await coordinator.cleanupExactRecordedFixtures(fixtures);
      await coordinator.assertBaselineRestored(baseline);
    }
  } finally {
    await lease.releaseOnSameBackend();
  }
}

await runProfile({ profile: "fast", session: "wf489fast", checkpoint: false });
assertFastCreatedNoTask545ClosureArtifact();
const certification = await runProfile({
  profile: "certification", session: "wf489cert", checkpoint: true,
});
return createTask545CheckpointForFinalCertificationOnly(certification);
```

**Data flow:** shared CLI/profile -> distinct dedicated-DB guard/projection ->
typed server-only fixture coordinator -> owned host/browser/worker lifecycle ->
real service-created session-scoped fixtures -> real session/API/UI flows ->
visible/browser/DB/fence assertions ->
strict redacted report -> exact reverse cleanup and baseline proof.

**Error handling:** any missing scenario, console error, unsafe evidence, stale
fixture, cleanup mismatch, wrong engine, latest-source fallback, or product
failure throws a stable `SmokeError` and fails the profile. Cleanup always runs;
never manufacture a passing result. Re-run only invalidated smoke scenarios
after harness-only repair per repository policy.

## Regression And Closure Tests

- Adapter/worker strict schemas, scenario exact-set/order, profile parity,
  redaction, timeout, worker framing, failure cleanup, and repository unchanged.
- Re-run every targeted suite from L01-L03 plus route registration/error mapping,
  security, DB race, query-budget, client authority, hook race, and UI tests.
- Pin same-package effective supersession independent of state equality, successful-
  rollback release through `C -> B -> A -> null`, both measured TASK-551 relation
  indexes, strict template after-state/transactional revision behavior, package/
  actor Setup marker plus exact apply crash resume/CAS, terminal failed only for
  zero-net/full-source compensation versus same-running-owner partial/unresolved
  recovery, durable invalidation on every
  committed family, terminal-response-loss replay with no browser identity, marker
  release only after successful exact rollback, and one audit row atomically
  coupled to each terminal result.
- Pin one combined legacy preflight before claim/mutation: template count 100/101,
  combined totals 511/512/513, and every exact canonical byte limit plus one byte.
  Include `tests/unit/kits/installService.test.ts` claimed-run cases proving the
  precreated run is reused, no second run is created, and persisted current-state/
  receipt evidence gates skips.
- Pin the exact 512-plus-sentinel relation bound: 512 rolled-back successors can
  restore a predecessor, 513 all-rolled-back successors fail the explicit limit
  code, and no 514th relation probe occurs.
- Pin running `summary:null`/nonterminal trace, terminal `itemTrace`/omitted-count
  reconciliation, the visible 513-item corrupt-detail fail-closed branch, safe
  cursor-expiry collapse and one-shot notice/reset,
  failed/recovery browser invalidation, HTTP 202 no-store recovery transport,
  wire-cap-first zero-byte ordering with exact `parseErrorCode`, and descriptive
  route/control contribution parity. The 1,071-line
  `tests/vitest/admin/assistantClient.test.ts` must remain untouched; run the
  focused independently runnable invalidation-caller suite instead.
- Re-run the exact existing Setup route suites
  `setupStarterContent.test.ts`, `onboardingFlow.test.ts`, and
  `setupStarterContent.security.test.ts`; prove exhaustive new Setup error maps,
  no route-owned duplicate apply audit, and no apparent HTTP failure after a
  committed service success. Do not substitute the service-only
  `starterContent.test.ts` or unrelated `setupAdvancedWizardPayloads.test.ts`.
- Fixture tests prove canonical dedicated-vs-shared database identity rejection,
  dedicated child-environment projection, strict session-scoped definitions,
  typed worker frames, no unsafe casts/direct ledger fabrication outside the exact
  bounded 513-item corruption sentinel, fixed Setup
  gating, presence-aware cleanup, and baseline restoration after each fault.
- Exclusive-lease tests prove same-database concurrent profiles cannot both pass
  preflight, timeout performs zero fixture mutation, PID/session hops fail, release
  occurs only after baseline proof, and a subsequent clean session can acquire.
- Release-gate tests pin the exact new reliability/security command membership;
  `bun run gates:coderso` must execute the exact rollback state-change/race lane.
- Run full mandatory gates and isolate any unrelated broad failure by named file.
- Fresh post-implementation audits check scope, safe DTO non-exposure, exact
  engine dispatch, cache authority, test integrity, docs/status/changelog drift.
- Workflow/registry tests prove fast cannot request a checkpoint and certification
  requests exactly one only after all non-metadata writes, gates, audits, and
  exact cleanup pass.

## TASK-548 Serialized Successor Transaction

This closure leaf is the sole TASK-489 successor writer after terminal TASK-548:

1. Read TASK-548's terminal receipt and freeze the exact landed source/output
   paths, transaction recovery rules, and ordered write/check argv before any
   Guide edit. A missing/renamed seam or command stops for contract amendment;
   do not guess an alias or create a second compiler.
2. Add only the TASK-489 records to
   `docs/guide/capabilities/atomic-controls.v1.json`,
   `docs/guide/capabilities/composed-workflows.v1.json`, and
   `docs/guide/capabilities/section-bindings.v1.json`, bound to exact localized
   sections in `docs/guide/coderso/solution-kits.md`. The stable atom IDs are
   `docs.control.solution-kits.run-history`,
   `docs.control.solution-kits.run-detail`, and
   `docs.control.solution-kits.exact-rollback`; the complete workflow ID is
   `docs.workflow.solution-kits.run-history-and-exact-rollback` in that ordered
   atom sequence. Preserve every terminal pre-TASK-489 record byte-for-byte.
3. Through terminal TASK-548's unchanged durable generated-output transaction,
   run its exact recovery/write sequence for the permission snapshot,
   composition catalog, packaged bundle/source hash, and coverage/link/route/
   publication pair, then every corresponding read-only check. At minimum the
   resulting tracked inventory includes `core/generated/docs/coderso-docs-v2.json`,
   `core/generated/docs/coderso-docs-coverage-v2.json`, and
   `docs/guide/_COVERAGE_MATRIX.md`; outputs are never hand-edited.
4. Prove generated route/control relations match TASK-489-02-L01's pure
   contribution and TASK-489-03-L01's rendered controls. Do not run a CMS-
   capability compiler and do not create or
   edit `core/generated/cms/coderso-cms-capabilities-v1.json`; TASK-414 owns the
   first final CMS manifest after TASK-555.

The serialized successor segment remains exactly
`TASK-548 -> TASK-489 -> TASK-555 -> remaining TASK-414 -> TASK-556`; no concurrent
successor writer is permitted. Terminal TASK-414-03-L03 precedes TASK-489 and
terminal TASK-414-02-L01 precedes TASK-555 as external prerequisite leaves; they
are not included in `remaining TASK-414`.

## Documentation Updates Required

Complete every source-of-truth/runtime/Guide/generated documentation write in
this section before `wf489cert`. Changelog 1268, the two indexes, and TASK-489
status metadata are the only documentation/task writes allowed after its
checkpoint.

- `_docs/CMS_API.md`: exact three endpoints, raw query/default/max/order/cursor,
  safe DTOs, all ten kinds, item trace/omitted count, empty rollback body,
  running-null summary, strict success/failed/recovery result union, HTTP 200/202
  no-store behavior, terminal wire-cap-first order and parse code, safe cursor-
  expiry collapse, stable codes, and permission matrix; also document the existing
  Setup route's exhaustive recovery/conflict map and service-owned atomic apply
  audit/no post-service failure boundary.
- `_docs/SOLUTION_KITS.md`: legacy/full-site engine classification, exact-source
  rollback, retirement of the kit-key/latest route, no apply/dry-run UI, fenced
  full-site delegation/failure terminalization, effective newer-unrolled-apply
  supersession, restored predecessor chains, and bounded relation-limit failure,
  server-only package/actor Setup apply marker and exact envelope/CAS resume,
  combined 512/template 100/byte limits, current-state guards, zero-net terminal
  failure versus same-owner partial/unresolved recovery, full-site transactional
  invalidation adoption, and complete active-rollback relation evidence.
- `_docs/TEMPLATE_CONTRACTS.md` and `docs/develop/plugins-and-store.md`: remove the
  stale kit-key/latest rollback route and document strict persisted template
  after-state plus one-transaction compare/mutation/revision/rollback-owner-item
  receipt and safe replay.
- `_docs/CODERSO_MODULES.md`: replace the stale read-only-only surface statement
  with the bounded operational history/detail/exact rollback contract.
- `_docs/CODERSO_RELEASE_GATES.md` and the release-gate runner: register exact
  rollback state-change, concurrency, security, and reliability coverage.
- Architecture/assistant/user Guide truth: fixed Solution Kit operations are
  provider-free, the all-runs history exposes full-site runs before TASK-555,
  and no stale legacy rollback endpoint is documented.
- `_docs/SECURITY_SPEC.md`: session-only internal visibility, require-all writes,
  CSRF, buckets, wire-cap-before-auth ordering, no public/API-key mode, and
  prohibited data scoped to TASK-489 history/detail/rollback browser surfaces.
- `_docs/AUDIT_SPEC.md`: one deterministic centralized event atomically inserted
  with legacy/full-site terminal success or failure, exact safe field/counter set,
  no event for nonterminal recovery, service-owned Setup apply audit, removal of
  the route duplicate, and suppression of the lower legacy duplicate.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md`: v2 keys, TTLs, terminal
  TASK-551 authority, auth scope/reset, cursor notice/one-shot reset, race guards,
  invalidation on success/zero-net-failed/recovery, new-owner retry after failed,
  same-owner blocking after recovery, safe DTO only, and no broad claim over
  retained apply responses.
- Runtime-smoke cookbook: register the reusable suite and its fast/certification
  parity/cleanup recipe, required `CODERSO_RUNTIME_SMOKE_DATABASE_URL`, canonical
  distinct-database guard, fixed Setup restriction, typed fixture coordinator,
  and presence-aware cleanup.
- Changelog 1268 must explicitly enumerate all ten IDs:
  `TASK-489`, `TASK-489-01`, `TASK-489-01-L01`, `TASK-489-01-L02`,
  `TASK-489-02`, `TASK-489-02-L01`, `TASK-489-02-L02`, `TASK-489-03`,
  `TASK-489-03-L01`, and `TASK-489-03-L02`.
- Mark leaves terminal first, then children, then parent; synchronize
  `_docs/_TASKS/README.md` rows/statistics from a fresh read. Record changelog
  1268 and dependency receipts through the checkpoint-bound metadata-only
  phase-2 resume. Do not close with an open descendant.

## Testing Requirements

Between the targeted suites and runtime smoke, execute the exact terminal
TASK-548 generated-output recovery/write/check argv copied verbatim into the
start receipt. A missing or changed command is a predecessor-amendment blocker,
not permission to guess an alias.

```bash
bun --cwd core lint:types
bun --cwd core lint
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/kits/solutionKitInstallHistoryTypes.test.ts tests/vitest/setup/starterContentRollbackEnvelope.test.ts tests/vitest/server/solutionKitSchemas.test.ts tests/vitest/server/solutionKitRunOperationsRouteContribution.test.ts tests/vitest/admin/solutionKitsClient.test.ts tests/vitest/admin/solutionKitRunsCacheAuthority.test.ts tests/vitest/admin/solutionKitRunHistoryInvalidationCallers.test.ts tests/vitest/admin/starterContentClient.test.ts tests/vitest/ui/solutionKitRunsHook.test.tsx tests/vitest/ui-integration/solution-kits-runs.test.tsx tests/vitest/ui/solution-kits-page.test.tsx
set -a && source .env && set +a && bun test tests/unit/kits/solutionKitInstallHistoryService.test.ts tests/unit/kits/solutionKitInstallRollbackDispatcher.test.ts tests/unit/kits/solutionKitRollbackInvalidation.test.ts tests/unit/kits/solutionKitRollbackAudit.test.ts tests/unit/setup/starterContentApplyRecovery.test.ts tests/unit/kits/fullSiteInstallService.test.ts tests/unit/kits/installService.test.ts tests/unit/kits/kitInstaller.test.ts tests/unit/templates/templateInstaller.test.ts tests/unit/widgets/widgetTemplateService.test.ts tests/unit/widgets/widgetTemplateRevisionService.test.ts tests/unit/audit/auditService.test.ts tests/integration/kits/solutionKitInstallHistoryDb.test.ts tests/integration/kits/solutionKitExactRollbackDb.test.ts tests/integration/routes/solutionKitsRoutes.test.ts tests/integration/routes/setupStarterContent.test.ts tests/integration/routes/onboardingFlow.test.ts tests/integration/routes/starterContent.test.ts tests/security/setupStarterContent.security.test.ts tests/security/solutionKitExactRollback.test.ts tests/perf/solution-kit-run-history-budgets.test.ts tests/unit/runtime-smoke/cli-registry.test.ts tests/unit/runtime-smoke/solution-kit-run-operations-adapter.test.ts tests/unit/runtime-smoke/solution-kit-run-operations-worker.test.ts tests/unit/runtime-smoke/solution-kit-run-operations-fixtures.test.ts tests/unit/runtime-smoke/exclusive-database-lease.test.ts tests/unit/release/codersoReleaseGates.test.ts
bun run test
bun run precommit:check
bun run gates:coderso
bun run scan:security:strict
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
git diff --check
# Run touched-file line counts and every required fresh post-audit here.
bun scripts/runtime-smoke.ts run --suite solution-kit-run-operations --profile fast --session wf489fast
# Assert fast cleanup passed and no TASK-545 manifest/checkpoint/closure path exists.
bun scripts/runtime-smoke.ts run --suite solution-kit-run-operations --profile certification --session wf489cert
# Invoke terminal TASK-545 phase 1 only for wf489cert and stop on
# owner_action_required; the emitted phase-2 resume is metadata-only.
```

Before closure, run `wc -l` over every added/modified human-authored production
and test file from the complete TASK-489 baseline-to-final diff; any result over
1,000 fails closure. Record pass/blocked/skipped truthfully, verify DB reachability
before broad DB lanes, and never treat runtime smoke as a substitute for tests.

## Closure Handoff

This leaf owns and completes the handoff. The pre-certification final audit must
prove docs, cache maps,
security/API/audit contracts, terminal TASK-548 generated bytes, and validation
receipts agree with the final candidate. The certification checkpoint-bound
metadata resume then proves changelog 1268, board/statistics, and all ten
terminal IDs without changing those frozen bytes. The TASK-555 handoff records
`SafeSolutionKitRollbackResultDto` as strict `success|failed|recovery_required`,
preserves success counters, zero-net/full-compensation-only failed counters, and
recovery's same durable running owner ID/null summary. Failed leaves the curated
head/source active but releases its terminal reservation for a new exact owner;
recovery alone retains the pending reservation and same owner. The handoff also
reserves the generic-route lineage composite plus engine-only no-recursion split
and forbids a second Setup settings-restoration phase. TASK-555 remains blocked
until its own contract preserves those branches, HTTP 202 recovery, and direct-
route `C -> B -> A -> null` lineage advancement.
