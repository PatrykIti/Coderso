# TASK-551-01: Performance Baseline, Query Inventory, and Budgets
# FileName: TASK-551-01-Performance-Baseline-Query-Inventory-And-Budgets.md

**Parent Task:** TASK-551
**Priority:** High
**Category:** Database / Performance / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-551 external dispatch gate; TASK-551-11 compatibility-bootstrap v2 sidecar prerequisite
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Own a two-phase machine-readable inventory of production database callers,
their single-writer ownership, and reproducible small/large performance budgets.
The initial phase freezes the current exact set plus an explicit planned-delta
manifest before implementation. The same L01 leaf is re-dispatched after
TASK-551-09 to replace that manifest with a fresh final exact-set receipt before
TASK-551-10-L01. Evidence is sanitized and may not contain SQL bind values,
secrets, raw PII, or customer payloads.

Before author-audit reads the product graph, TASK-551-11 must first land its
closed ten-source/declaration-plus-three-existing-test capacity sequence:
contract amendment → fresh audit → filesystem extraction → facade worktree-
compatibility extraction → parser prerequisite/two-subgate update → injected
executor/DB-free compatibility bootstrap. Its frozen in-memory receipt proves
parser/executor support for L02's exact prerequisite, two ordered subgates, L04
phase, and declared nine-path Bun membership. Its bootstrap is descriptor-only:
it resolves neither future L03, L04, nor L02 modules/bytes. Its epoch-bound
receipt admits only author-audit -> graph -> L02 in that successful order; named
literal L03/L04 seams become available only after their closures, while the L02
seam/outer host import require the distinct code/test materialization closure
after L04 adaptation and before L02 `single`. It is not a TASK-551-01 leaf, graph
node, fixture command, or evidence row; actual provenance occurs only after L04
closure in the normal L01 initial → L03 → L04 → L11 gate → L02 order.

## Locked Deliverables

- Every direct and dynamically loaded production DB caller receives one query
  classification, cardinality/projection/order contract, owner leaf, and
  terminal disposition.
- The initial receipt records the exact current set and every approved planned
  caller delta by owning leaf. The final receipt permits no unresolved planned
  delta and proves exact coverage of the post-TASK-551-09 tree.
- The initial planned set is closed at 34 records: 32 individually identified
  TASK-551-03-L02 page/list/fixed-summary/facet statements plus the existing
  outbox-age and public-HTML-dependency records. Every record has its future
  file/symbol, statement class, result/work bound, fixture-budget ID,
  fingerprint key, and sole owner. The 32 Admin shapes are defined once in
  L02's test-only statement-shape registry, consumed by TASK-551-05-L02, and
  compared byte-for-byte with the later production SQL after TASK-551-03-L02.
- Small and large fixture profiles are deterministic, uniquely scoped, and
  clean up only owned rows. L02 pins every physical target/support table,
  per-profile row count, status/time/FK distribution, pool capacity, warmup and
  sample/repetition count, and the exact variance/runner normalization formula;
  every gated inventory ID names one of those frozen scenarios. Submission and
  booking summary clocks use L02's explicit `asOf`-relative exceptions rather
  than the general January 1 fixture timestamps. Later work never rediscovers or
  resizes them.
- L02 also owns exact evidence fixtures for page/entry/typed-entry/post-author
  traversal, role-leading user lookup, one-tag post, multi-tag media AND, webhook
  event containment, and the 128-tuple public-HTML dependency aggregate. Their
  literal selectivities/bind shapes feed TASK-551-05/09 plans; later leaves may
  not substitute a friendlier distribution.
- Every append-heavy family in TASK-551-06 has a literal retention-clock fixture.
  This includes password resets, both preview-token tables, assistant ingest,
  form-action children, and solution-kit run/items with exact boundary/anchor/
  child-first counts plus 499/500/501/2,000/2,001 batch edges.
- Initial L01 owns exactly 34 planned callers. Thirty-two are the complete
  `TASK551_ADMIN_READ_STATEMENT_SHAPES` set enumerated in L01/L02; the other two
  remain the outbox `readOldestUnprocessedAge` point read (bound 1,
  TASK-551-08-L02) and
  `publicContentVisibilityGateRead.ts#validatePublicHtmlDependencies` (one
  aggregate result over at most 128 tuples/16,384 canonical bytes and a
  `<= 100 + 1` root list, TASK-551-09-L01). The former receives its later
  TASK-551-05 fixture; L02 baselines the latter. Final L01 must discover each
  landed caller or record the reviewed removal allowed only for the public-HTML
  dependency record, then remove every planned record. No 03-L02 planned record
  may disappear merely because several statements share one service operation
  or transaction.
- Query-count, rows-read/returned, p50/p95/p99, and pool-acquisition-wait
  budgets are checked-in finite numeric release-gate inputs before TASK-551-02.
  L02's deterministic formula is used only for the initial reviewed freeze;
  normal checks never recompute ceilings. L02 measures acquisition wait
  independently by timing contention for an explicitly reserved connection; it
  does not depend on TASK-551-02 telemetry. Later leaves may tighten but not
  silently weaken these budgets.
- A separate, one-time isolated fixture-target bootstrap precedes every L02
  database invocation. L03 alone owns its opt-in bootstrap tool and focused
  test, but TASK-551-11 alone owns process dispatch and the L03→L02 environment
  handoff. `task-551-author-audit.mjs` is the sole supported owner-controlled source ingress
  and creates an opaque one-use broker; `task-551-fix.mjs` alone consumes it
  after validating one canonical phase/operation binding. No caller-supplied
  database name, ambient/generic URL, dotenv, or process environment is
  admitted. L11 derives each L03 operation's exact four `fixtureValues` (URL,
  literal `coderso02` name, confirmation, sentinel) only from its distinct L03
  broker, and first
  launches the L03 focused test through a fresh exact-own empty/OS-only static
  `childEnv`. That map contains no URL, database name, confirmation, sentinel,
  `DATABASE*`, or `TASK551*` key. After discarding that static map, L11 performs
  two independent L03 lifecycles in order: `--initialize` consumes one fresh
  broker to derive four `fixtureValues`, builds one exact-own OS-augmented
  `childEnv`, launches once, captures its redacted command receipt, and disposes
  that environment and values; only then does `--check` repeat that lifecycle
  from a distinct fresh broker and its own distinct values/environment. Every
  launch uses an argv array, never a shell/string wrapper, with canonical
  `bun --env-file=/dev/null …` argv. After proving
  `current_database()` is the
  literal target, L03 may create or verify only the fixture-only
  `task551_fixture_sentinel` table and its single `task551-baseline-v1` marker
  row bound to that secret. It emits neither target identity nor a confirmation
  or sentinel value. L11 captures the transient L03 `--check` record and its
  matching focused-test/check receipts, validates them, and writes current
  durable L03 evidence before disposing that check lifecycle. After L04's
  DB-free focused closure and the later actual L11 source-free non-durable
  provenance gate (not its earlier compatibility bootstrap),
  the DB-free L02 static phase and post-materialization lane finalization let
  L11 first create four
  fresh explicit non-inherited L02 static child maps: baseline then digest for
  `small`, then independently baseline then digest for `large`. No map
  contains `DATABASE_URL3`, `DATABASE_URL`, `DATABASE_DIRECT_URL`, another
  generic/alternate database URL, a fixture database value, fixture target, or
  sentinel. The test argv receives no profile; its closed command ID/evidence
  binding supplies the profile association. L11 validates and disposes all four
  static receipts/maps before beginning any L02 fixture lifecycle. Only then
  may L11 perform four independent L02 lifecycles: freeze small, freeze large,
  the L02-owned active-v2 review transition, check small, then check large.
  Each fixture child consumes its own fresh broker bound to the
  exact L02 action/dispatch, derives three `fixtureValues` (URL, literal
  `coderso02` name, sentinel), builds one exact-own OS-augmented `childEnv`,
  launches once, captures its own redacted receipt, and disposes that
  environment and values before the next command. Confirmation is L03-only and
  never enters L02/05-L02. No broker, raw source, `fixtureValues`, `childEnv`,
  argv/launch, or map is reused across operations. Neither leaf receives or
  reconstructs the other leaf's environment.
- The checked-in mixed `freezeReceipts.ts` pair is immutable historical archive
  input, pinned to SHA-256
  `17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f`.
  L04 owns only a DB-free, strict v2 bootstrap declaring a fixed generation,
  that archive path/hash, and `awaiting-small`; it writes neither archive nor
  active state. After L04, L11 accepts a source-free non-durable provenance
  gate and L02 alone creates/advances a separate active v2 state from
  `awaiting-small` through small candidate, large candidate, review, and
  checked reviewed pair. No legacy demotion, reset, partial pair, active-state
  fallback, or reviewed overwrite is legal.

## Single-Writer Ownership and Collision Guards

| Leaf | Exact allowlist |
|---|---|
| TASK-551-01-L01 | `scripts/task-551-query-inventory.ts`; cohesive DB-free scanner-private helpers only under the finite narrow `scripts/task551QueryInventory/**` scope (including `gscDynamicCapabilitySafety.ts`, `literalDynamicCapabilityFactories.ts`, `literalDynamicCapabilityTypeFlow.ts`, `literalDynamicCapabilityOpaqueTypeFlow.ts`, and `literalDynamicCapabilitySafety.ts`; strict contracts, canonicalization/receipt-redaction, AST traversal, and Bun-lane assertions only); `tests/perf/fixtures/task551QueryInventory.ts`; `tests/perf/database-query-inventory.test.ts`; `tests/perf/database-query-inventory-capability-routes.test.ts` as the direct standalone auxiliary gate (not a fixture-builder split or lifecycle member); `tests/integration/server/task551BunLaneMembership.test.ts`; no test-helper subtree; `tests/bun-lane-manifest.json` as the L01-only generated output. Before its one classifier snapshot, all seven dependent L03/L04/L02 files must exist: `tests/perf/task551FixtureTargetBootstrap.test.ts`, `tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts`, `tests/perf/database-query-baseline.test.ts`, `tests/perf/task551DatabaseBaseline/digestContract.test.ts`, `tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts`, `tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts`, and `tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts`. The complete planned-manifest equality is exactly nine paths: L01's two lifecycle tests plus those seven; the auxiliary gate stays outside that nine-path set and the exact four-test pre-classifier command. The exact pre-classifier command is only `bun --env-file=/dev/null test tests/perf/task551FixtureTargetBootstrap.test.ts tests/perf/database-query-baseline.test.ts tests/perf/task551DatabaseBaseline/digestContract.test.ts tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts`; it excludes the L04 bootstrap test and both L02 follow-up paths. |
| TASK-551-01-L03 | One dedicated, test-only fixture-target bootstrap tool plus its focused test and fixture-marker contract; its child contract selects exact filenames, which must be disjoint from the L01/L02 allowlists. |
| TASK-551-01-L04 | Only `scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts` and `tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts`: pure strict bootstrap v2 with fixed generation, archive path/hash, and `awaiting-small`; no DB/environment/process/filesystem/fixture authority, archive write, active-state write, or durable evidence. Its focused test is a seventh planned default-Bun dependent path, but never an isolated child/evidence receipt or logical-argv registry row. |
| TASK-551-01-L02 | `scripts/task-551-database-baseline.ts`; cohesive runner-private helpers only under the finite narrow `scripts/task551DatabaseBaseline/**` scope (including `scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts`, `digestContract.ts`, `fixtureTarget.ts`, `reviewedPairReceiptSource.ts`, `reviewedPairTransition.ts`, and private same-realm `reviewedPairOwnerHost.ts`); active v2 state/fixture/test-helper modules only under `tests/perf/task551DatabaseBaseline/**`, with the store matrix added to existing `reviewedPairPersistence.test.ts` rather than a new test path; `tests/perf/fixtures/task551DatabaseScale.ts`; `tests/perf/fixtures/task551DatabaseBudgets.ts`; `tests/perf/fixtures/task551AdminReadStatementShapes.ts`; `tests/perf/fixtures/task489SolutionKitRunPredecessor.ts`; and `tests/perf/database-query-baseline.test.ts`. The legacy `freezeReceipts.ts` is a read-only pinned archive, never an L02 writer path. Its envelope has the exact L11 sidecar prerequisite but adds no graph node: parser/executor first require the frozen compatibility receipt, then L02 still depends on L04. L02 runs reviewed-pair-persistence then runner-lifecycle as ordinary default-Bun gates after fixture-target and before L11 accepts the materialization/capability barrier; neither is isolated evidence. L03's focused static test plus L02 baseline/digest independently bound to `small` and then `large` are five L11 isolated evidence-test reruns; together with L03 initialize/check and L02 freeze/check per profile, L03/L02 have eleven isolated child launches. `fixtureTarget.test.ts` and the L04 test are default-Bun-only, receive no fixture map, and produce no profile receipt. |

All leaves forbid edits to production source, `core/db/migrations/**`,
`core/db/migrations/meta/**`, `_docs/_TASKS/**`, `_docs/_CHANGELOG/**`, and
`_docs/_workflows/**`. They inventory/bootstrap but do not edit TASK-511 backup
paths, TASK-517 entry/public paths, TASK-493 SEO-indexing paths, or TASK-518
migration artifacts. L11, rather than an operator or either leaf, validates the
author-audit broker bound to the requested phase/operation, rejects every
caller-supplied database name or alternate URL, derives the literal
`coderso02` name, and gives L03's focused test only its separate fresh
empty/OS-only static childEnv. It gives each of `--initialize` and `--check` a
distinct fresh L03 broker → four fixtureValues → OS-augmented exact-own childEnv
lifecycle, and never reuses one for the other. L03 must reject unknown
bootstrap keys before connecting,
verify the literal supplied database name
before it creates the sole marker table or row, and never expose a target
identity or secret through its tool, test, receipt, error, or console output.
It cannot run an L02 seed, measurement, cleanup, or command; its successful
one-row marker proof is only a prerequisite for L11's separate L02 fixture-only
target gate.
L01 is the sole writer of its named top-level files, the finite
`scripts/task551QueryInventory/**` subtree, and its one generated manifest
output. That helper scope must not become a generic `scripts/**` utility area or
import production DB/runtime modules, read an environment, or open a connection;
no `tests/**` helper subtree is authorized. Every L01-owned human-authored
production or test module, including each helper, remains at most 1,000 physical
lines.
Later leaves consume but never edit the inventory, manifest, or receipt. Only
TASK-551-01-L01 may refresh those artifacts when orchestration re-dispatches the
same leaf for its final phase.

The L02 `single` occurrence has the L02-only exact
`workflowPrerequisites:["TASK-551-11:compatibility-bootstrap@v2"]` sidecar
gate and a closed, ordered two-member `subgates` tuple:
`{ kind:"classifier-materialization", ordinal:1 }` then
`{ kind:"reviewed-pair-transition", ordinal:2 }`. For both records,
`afterCommandIds` is the exact ordered completed command prefix and
`beforeCommandId` is its immediate next command. Thus classifier requires its
five default-static predecessors before `core-lint-types`; transition requires
the complete prefix ending `freeze-small`, `freeze-large` before `check-small`.
The parser rejects a duplicate, gap, reordering, partial prefix, or wrong next
command; L11 invokes only the source-free L02 transition there and failure
dispatches zero `check-*` commands.

## Sub-Tasks

- [ ] **TASK-551-01-L01** — Production query inventory and ownership matrix.
- [ ] **TASK-551-01-L03** — Isolated Fixture Target Bootstrap.
- [ ] **TASK-551-01-L04** — Archive-preserving freeze-candidate generation bootstrap.
- [ ] **TASK-551-01-L02** — Small/large fixtures, baselines, and frozen budgets.

## Land Order

Pre-graph L11 contract amendment → fresh audit → filesystem extraction → facade
worktree-compatibility extraction → parser two-subgates/prerequisite → injected
executor/bootstrap v2 → initial L01 → L03 → non-graph L11 L03 adaptation →
L04 bootstrap contract → actual L11 L04 provenance/adaptation gate → distinct
non-graph/non-evidence L02 code/test materialization closure → L11 L02
adaptation/outer literal host import → L02 `single` → final L02 leaf closure
after checks → TASK-551-02..09 → final L01 refresh → TASK-551-10-L01. The
pre-graph sidecar steps are not product leaf/graph occurrences and validate only
compatibility support; L04 is DB-free and finishes before L11 admits any L02
sidecar/static/freeze/review/check operation. L11's L04 gate is non-spawning,
source-free, has no broker/map/archive/state bytes or durable evidence row, and
does not change the fixed fifteen-row logical-argv registry.
The L03 bootstrap, L04 bootstrap, L02 persistence/owner host, and L02-owned
predecessor registry are deferred literal seam targets only for L11: they remain
their owners' normal provenance/line-count inputs, but are excluded from generic
sidecar import/discovery/validation/closed/worktree/pre-spawn projections and
can be resolved only by the named post-closure seams.
All child fixture operations in the initial sequence are non-interactive and
L11-dispatched. The sole exception is one L02 owner-only, source-free, non-child,
non-spawning review pause after `freeze-large` and before `check-small`: before
workflow dispatch only `_docs/_workflows/task-551-implement.mjs` outer
`runTask551ImplementWorkflow` literal-dynamically imports/calls L02's same-realm private only after the L02 code/test materialization closure
owner-host wrapper around the facade callback, which installs then finally revokes
the owner policy. The facade only registers/calls the transition and receives no
channel, approval, or fixture value from it.
For every child operation, only the author-audit opaque broker bound to the requested operation enters its source
boundary; it rejects ambient/generic URLs and caller database names, derives
literal `coderso02`, and first launches L03's focused test with a fresh
empty/OS-only exact-own static childEnv containing no URL, database name,
confirmation, sentinel, `DATABASE*`, or `TASK551*` key. L11 discards that
static childEnv, then runs the one-time initializer and `--check` as distinct
fresh L03 broker → four fixtureValues → OS-augmented exact-own childEnv
lifecycles, with argv-array/no-shell semantics and `bun --env-file=/dev/null`.
Each launch is captured and its values/environment are disposed before the next
one. After L04's focused DB-free closure and L11 provenance gate, then L02's
  DB-free static phase and post-materialization lane-finalization, L11 runs
  baseline then digest-contract
  isolated evidence for `small`, then independently baseline then digest-contract
  for `large`, each in a fresh explicit non-inherited static map with no
  `DATABASE_URL3`, generic URL, fixture value, fixture target, or sentinel. It disposes all four static maps
  and only then runs freeze small, freeze large, the L02-owned active-v2 review
  transition, check small, then check large
  as four distinct fresh L02 broker → three fixtureValues → OS-augmented
  exact-own `coderso02` childEnv lifecycles. Each command is captured and its
  values/environment are disposed before the next command. Supported workflow
  policy forbids a user, focused test, or leaf source from bypassing that boundary
  by manually exporting fixture values, invoking L03/L02 fixture commands, or
  sourcing `.env`; it does not claim cryptographic authentication against an
  equally privileged local process independently reproducing non-secret values.
  TASK-551-02 cannot start until
  the initial L01/L03/L02 gates pass, the current caller set is exact, and every
  planned delta has one future leaf owner. TASK-551-10-L01 cannot start until
  final L01 removes all planned deltas and emits a fresh exact-set receipt for
  the validated post-TASK-551-09 working tree.
After its initial receipt, L01 and this umbrella remain `🚧 In Progress`; L02 may
close and the receipt—not a false parent completion—unblocks TASK-551-02. Final
L01 marks itself and this umbrella `✅ Done` only after the final receipt passes.
The parent external dispatch gate must pass before L01 edits tooling/tests; its
default is terminal TASK-511/TASK-493/TASK-517/TASK-518, with only the parent's
fresh exact all-path serialized-handoff audit accepted as a substitute.

## Security Contract

- **Visibility:** no route or endpoint changes.
- **Auth/RBAC/CSRF/rate limits:** unchanged; fixtures call existing protected
  paths only through their current auth contracts.
- **Validation:** inventory and budget files use strict reject-unknown parsing
  and bounded counts/durations.
- **Fixture bootstrap:** only the author-audit opaque broker bound to one
  canonical L03/L02 operation enters TASK-551-11's source boundary. It rejects
  caller database names and every ambient/generic/alternate URL, derives only
  the L03/L02 fixture-operation values, and fixes both database names to literal
  `coderso02`. L11 runs L03's focused test first with a fresh empty/OS-only
  exact-own static childEnv containing no URL, database name, confirmation,
  sentinel, `DATABASE*`, or `TASK551*` key. L03 `--initialize` and `--check`
  each receive their own fresh four-value L03 `fixtureValues` and OS-augmented
  exact-own `childEnv`; neither lifecycle is reused.
  Every child launch uses an argv array/no shell wrapper and `bun --env-file=/dev/null`.
  L11 captures each L03 command receipt and durable L03 check evidence, then
  disposes each L03 broker-derived values/environment pair independently, then
  runs four L02 evidence reruns—baseline/digest for each profile—under fresh
  database-free static maps, with no DB3/generic URL, fixture target, or sentinel. Only after
  their receipts are validated and maps discarded may it run the four L02 fixture
  operations, each through its own fresh broker → three fixtureValues → exact-own
  OS-augmented childEnv lifecycle. L03 proves the literal current database
  before a one-table/one-row marker create or verification and redacts every
  identity and secret. L02 never reads L03 bootstrap values, and neither leaf
  source loads or sources `.env`.
- **Secrets/privacy:** statement fingerprints only; no binds, credentials, raw
  URLs, cookies, tokens, PII, or production row bodies.
- **Anti-abuse:** no public write surface is added.

## Testing Requirements

- `bun test tests/perf/database-query-inventory.test.ts`
- `bun test tests/perf/database-query-inventory-capability-routes.test.ts`
- `bun test tests/integration/server/task551BunLaneMembership.test.ts`
- `bun scripts/task-551-query-inventory.ts --check --phase initial`
- After TASK-551-09: `bun scripts/task-551-query-inventory.ts --check --phase final`
- The following fixture sequence is an L11 workflow manifest, not a shell
  recipe for an operator, test, L03, or L02. L11 alone validates the private
  author-audit broker bound to one operation, rejects every caller database name
  and ambient/generic URL, derives fixtureValues only at the L11 boundary, and
  fixes each internal database name to literal `coderso02`. L03's focused test
  gets its own fresh empty/OS-only static childEnv
  with no URL, database name, confirmation, sentinel, `DATABASE*`, or
  `TASK551*` key. Each L03 operation independently consumes a fresh one-use
  broker and creates its own four-key bootstrap `fixtureValues` and
  OS-augmented exact-own `childEnv`; the two lifecycles share no broker, source,
  values, environment, map, or launch. The four L02 isolated evidence reruns use
  fresh explicit database-free static maps, one for baseline/digest per profile. Each of the four L02
  fixture operations likewise has its own fresh broker → exact three-key
  `coderso02` fixtureValues → OS-augmented exact-own childEnv lifecycle.
  Every isolated child uses an argv array with no shell/string wrapper and first
  tokens `bun --env-file=/dev/null`:
  1. With the separate L03 static map only, `bun --env-file=/dev/null test
     tests/perf/task551FixtureTargetBootstrap.test.ts`.
  2. After L11 discards that static map, it consumes one fresh L03
     initialize-bound broker, derives one exact four-key L03
     `fixtureValues`/OS-augmented `childEnv` pair, and launches exactly once:
     `bun --env-file=/dev/null scripts/task-551-fixture-target-bootstrap.ts --initialize`.
     L11 captures the redacted initialize command receipt and disposes that
     values/environment pair before any check broker is consumed.
  3. Only then it consumes a distinct fresh L03 check-bound broker, derives a
     distinct exact four-key L03 `fixtureValues`/OS-augmented `childEnv` pair,
     and launches exactly once:
     `bun --env-file=/dev/null scripts/task-551-fixture-target-bootstrap.ts --check`,
     followed by L11 capture/validation of the transient record, focused-test
     receipt, and check receipt into current durable
     `coderso.task551.fixture-check-evidence@v1` evidence. It then disposes that
     distinct check values/environment pair. After L04's focused DB-free closure
     and source-free L11 provenance gate, then the DB-free L02 static phase and
     its post-materialization lane-finalization, L11 creates four fresh explicit
     non-inherited static maps—baseline/digest for `small`, then for `large`—before it consumes the first fresh
     L02 broker. None has
     `DATABASE_URL3`, `DATABASE_URL`, `DATABASE_DIRECT_URL`, another generic
     database URL, a `TASK551_FIXTURE_DATABASE_*` value, fixture target, or
     sentinel.
  4. With those separate static maps, L11 runs four profile-bound static evidence
     reruns in order: baseline then digest for `small`, followed by baseline then
     digest for `large`; each pair uses its unchanged corresponding test argv:
     `bun --env-file=/dev/null test tests/perf/database-query-baseline.test.ts`
     then `bun --env-file=/dev/null test tests/perf/task551DatabaseBaseline/digestContract.test.ts`.
     Together with L03's test in step 1 these are five L11 isolated evidence-test
     reruns; L03 initialize/check plus four L02 fixture operations bring the
     L03/L02 isolated child-launch total to eleven. All four L02 zero-exit/no-skip
     positive-discovery receipts are mandatory before L11 may reduce or persist
     either small or large profile evidence; none is optional or substitutable. The default-Bun static
     test, `tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts`, remains
     default-Bun-only, receives no fixture map, and produces no profile receipt.
     L11 validates all four static receipts and destroys the static maps before it
     begins the first L02 fixture-operation lifecycle.
  5. Only after the required L02 rerun receipts, L11 dispatches the final four
     L02 forms in this exact order. For each listed form independently, it
     consumes a fresh one-use broker bound to that L02 action/dispatch,
     constructs fixed-`coderso02` three-key fixtureValues and an OS-augmented
     exact-own childEnv, launches one argv, captures that command's redacted
     receipt, and disposes the values/environment before the next form:
     `bun --env-file=/dev/null scripts/task-551-database-baseline.ts --freeze --profile small --all`,
     `bun --env-file=/dev/null scripts/task-551-database-baseline.ts --freeze --profile large --all`,
     the sole L02 owner-only source-free/non-child active-v2 review pause through the
     same-realm owner host invoked only by that outer composition root, without
     changing measured values or exposing its policy/approval to the facade, then
     `bun --env-file=/dev/null scripts/task-551-database-baseline.ts --check --profile small --all`
     and
     `bun --env-file=/dev/null scripts/task-551-database-baseline.ts --check --profile large --all`.
     The four L02 operations share no broker, source, values, childEnv, map, or
     launch. L11 retains the redacted
     `coderso.task551.baseline-check-evidence@v1` objects only after their
     respective captures. The complete, immutable eight-form L02 order is
     baseline small → digest small → baseline large → digest large → freeze small →
     freeze large → check small → check large; the required candidate-budget
     review occurs after both freeze forms and before the first check form.
- L11 also runs the associated ordinary non-fixture gates without a fixture map:
  `bun --cwd core lint:types`, `bun --cwd core lint`, and
  `bun run gates:coderso:perf`.

## Documentation Updates Required

No shared docs are edited here. L01/L02 produce bounded test artifacts; final
L01 hands its exact-set receipt to TASK-551-10-L01 and the receipt summary to
TASK-551-10-L02 for `_docs/DATABASE_PERFORMANCE.md` and changelog 1310.

## Acceptance Criteria

- Initial and final scans cover 100% of their discovered production DB callers;
  the final receipt has zero unresolved planned deltas and exactly one owner/
  disposition per caller.
- Status transitions preserve the two-phase gate: neither L01 nor this umbrella
  is marked done between the initial receipt and the post-09 final refresh.
- Both scale profiles match L02's exact row-count matrix and publish checked-in
  numeric budgets with its fixed sampling, variance, hardware-context, and
  calibration-normalization contract.
- L03 proves exactly one fixture marker table and one marker row only in the
  explicitly named isolated target, without emitting its identity or bootstrap
  secrets. The author-audit is the sole supported owner-controlled source ingress; for each L03
  operation L11 alone consumes its opaque one-use broker, validates its bound
  operation, derives four L03 `fixtureValues` (URL, literal `coderso02` name,
  confirmation, sentinel), and rejects every ambient/generic source and caller
  name. It sends
  L03's focused test through a separate fresh empty/OS-only static `childEnv`
  with no URL, database name, confirmation, sentinel, `DATABASE*`, or
  `TASK551*` key. It then launches `--initialize` and `--check` through two
  independent fresh L03 broker → four `fixtureValues` → exact-own childEnv
  lifecycles, each captured and disposed before the other begins. Every child
  uses a Bun argv array with no shell/string wrapper and literal
  `--env-file=/dev/null`. It captures durable L03 check evidence, accepts L04's
  DB-free source-free provenance gate, then runs L02
  baseline/digest for `small` and independently for `large` under four fresh
  database-free static child environments before consuming any
  fresh L02 broker. Those environments contain no DB3/generic URL, fixture target, or
  sentinel and are discarded after receipt validation. L03's focused test plus
  L02 baseline/digest for both profiles are five isolated evidence-test reruns,
  and all four L02 rerun receipts are mandatory
  before either profile evidence. Only then may L11 execute freeze small →
  freeze large → L02 active-v2 owner review → check small → check large as four independent fresh L02 broker
  → three `fixtureValues` (URL, literal `coderso02` name, sentinel) → exact-own
  OS-augmented `childEnv` lifecycles, each captured and disposed before the next.
  The default-Bun-only
  `fixtureTarget.test.ts` receives no map or profile receipt. L02 begins fixture
  operations only after these gates and never reads a generic URL, `.env`, or a
  bootstrap variable; no user, test, or leaf source manually constructs either
  `childEnv`
  or invokes a fixture command.
- No evidence artifact contains a forbidden secret/PII field or raw bind value.
- Initial receipt counts are exactly `planned=34`, `adminReadPlanned=32`, and
  `legacyPlanned=2`; final counts are all zero. The 32 Admin IDs have exact
  statement-shape and numeric small/large budget coverage before 05 dispatch.
