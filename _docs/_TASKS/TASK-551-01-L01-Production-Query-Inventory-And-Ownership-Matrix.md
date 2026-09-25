# TASK-551-01-L01: Production Query Inventory and Ownership Matrix
# FileName: TASK-551-01-L01-Production-Query-Inventory-And-Ownership-Matrix.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-01
**Priority:** High
**Category:** Database / Performance / Tooling
**Estimated Effort:** Small
**Dependencies:** TASK-551 external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Create a deterministic scanner plus reviewed inventory that covers direct
Drizzle calls, transaction executors, raw SQL, and dynamic DB imports in
production `core/**`. Generated migrations and tests are inputs, not production
caller records. This leaf runs twice under the same single-writer ownership:
initially before TASK-551-02, then as a fresh final re-dispatch after TASK-551-09
and before TASK-551-10-L01.

The initial L01 dispatch establishes the complete planned Bun-suite set before
either dependent leaf is dispatched: L03, then L04, then L02 retain their
declared source and test ownership. That set names seven L03/L04/L02 paths: the exact four-test
pre-classifier prerequisite, the pre-existing L02-owned
`reviewedPairPersistence.test.ts`, and the one future L02-owned
`runnerLifecycle.test.ts`, plus the L04 bootstrap test. After all seven dependent files exist, and only the
designated four pass the explicit
pre-classifier static gate, the L01-owned
post-materialization lane-finalization gate below completes the one
generated-file step. TASK-551-11 dispatches that gate and records its receipt;
the classifier process changes only the committed Bun manifest. The gate neither
reverses the `L01 -> L03 -> L04 -> L02` land order nor grants L03/L04/L02 permission to
edit L01's inventory fixture, membership proof, classifier, or manifest. It is
an L02-phase family subgate after L03's independent closure, not a third leaf
or a reason to reopen L03.

## Sub-Tasks

None; this is an executable leaf with initial and final dispatch phases.

## File Ownership

**Allowlist (finite and exact):**

- `scripts/task-551-query-inventory.ts`
- `scripts/task551QueryInventory/bunLane.ts`
- `scripts/task551QueryInventory/canonical.ts`
- `scripts/task551QueryInventory/check.ts`
- `scripts/task551QueryInventory/clientExpressions.ts`
- `scripts/task551QueryInventory/clientNamespaceAssignments.ts`
- `scripts/task551QueryInventory/contracts.ts`
- `scripts/task551QueryInventory/dynamicCapabilityAliases.ts`
- `scripts/task551QueryInventory/dynamicImportOrigins.ts`
- `scripts/task551QueryInventory/dynamicImportProvenance.ts`
- `scripts/task551QueryInventory/fileDiscovery.ts`
- `scripts/task551QueryInventory/literalDynamicClientImports.ts`
- `scripts/task551QueryInventory/gscDynamicCapabilitySafety.ts`
- `scripts/task551QueryInventory/literalDynamicCapabilityFactories.ts`
- `scripts/task551QueryInventory/literalDynamicCapabilityTypeFlow.ts`
- `scripts/task551QueryInventory/literalDynamicCapabilityOpaqueTypeFlow.ts`
- `scripts/task551QueryInventory/literalDynamicCapabilitySafety.ts`
- `scripts/task551QueryInventory/literalDynamicNamespaceSafety.ts`
- `scripts/task551QueryInventory/nonliteralDynamicImports.ts`
- `scripts/task551QueryInventory/productionScan.ts`
- `scripts/task551QueryInventory/scan.ts`
- `tests/perf/fixtures/task551QueryInventory.ts`
- `tests/perf/database-query-inventory.test.ts`
- `tests/perf/database-query-inventory-capability-routes.test.ts`
- `tests/integration/server/task551BunLaneMembership.test.ts`
- `tests/bun-lane-manifest.json`

This closure is limited to inventory strict contracts, canonicalization/receipt
and redaction helpers, AST traversal, and Bun-lane assertions. During the
initial occurrence it must not become a general script utility area, lexically
import a production DB/runtime module (including the absent future registry),
read an environment, or open a connection. The final re-dispatch may add the
one final-only registry loader described below only after L02 has landed that
module. The root script remains a thin CLI facade and public re-export surface;
it owns `process.argv`/console handling only. No test-helper split is
authorized: keep focused test builders in the named fixture until a separately
audited contract proves a split necessary. The sole narrow exception is the
standalone, DB-free
`tests/perf/database-query-inventory-capability-routes.test.ts` regression gate:
it contains no reusable fixture or builder and remains an L01-owned direct test,
not a third lifecycle-membership or planned-manifest path.

`core/**` is scanner input only: L01 never edits a core source file. In
particular, `core/services/settings/securitySettings.ts` is a required
read-only regression input, not an L01 ownership path or a permitted source
refactor.

L01 is the sole code/test writer of every listed path and the sole writer of
the generated manifest content. TASK-551-11 may dispatch the exact gate command
and write its separately allowed workflow receipt, but does not receive manifest
content ownership. The classifier authorization is limited to the single,
deterministic command specified below after all seven planned L03/L04/L02 files exist
and the exact four-test pre-classifier prerequisite has passed; it does not
authorize edits to the classifier, lane runner, timing file, `package.json`, or
another manifest path.

**Forbidden:** every omitted production, helper, script, test, migration/meta,
task, changelog, and workflow path; the named current conflicts in the workflow
dispatch envelope; and all TASK-511, TASK-517, TASK-493, and TASK-518 owners.

### Initial Bun-Lane Membership and Generated Manifest Completion

The pre-graph L11 compatibility bootstrap validates only the declared
nine-path capability and does not materialize this file. Before normal
orchestration dispatches `TASK-551-01-L03`, `TASK-551-01-L04`, or
`TASK-551-01-L02`, the initial L01 implementation must establish exactly one
membership for each of these seven planned L03/L04/L02 paths in
`TASK551_PLANNED_BUN_TEST_PATHS`. `TASK551_L01_BUN_TEST_PATHS` is the exact
two-path L01 lifecycle list. The distinct four-path
`TASK551_INITIAL_DEPENDENT_BUN_PATHS` array is the exact pre-classifier
prerequisite, not the full planned set:

```ts
const TASK551_L01_BUN_TEST_PATHS = [
  "tests/perf/database-query-inventory.test.ts",
  "tests/integration/server/task551BunLaneMembership.test.ts",
] as const;

const TASK551_L01_AUXILIARY_FOCUSED_TEST_PATHS = [
  "tests/perf/database-query-inventory-capability-routes.test.ts",
] as const;

const TASK551_INITIAL_DEPENDENT_BUN_PATHS = [
  "tests/perf/task551FixtureTargetBootstrap.test.ts",
  "tests/perf/database-query-baseline.test.ts",
  "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
  "tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts",
] as const;

const TASK551_L02_PREEXISTING_BUN_PATHS = [
  "tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts",
] as const;

const TASK551_L02_FUTURE_BUN_PATHS = [
  "tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts",
] as const;

const TASK551_L02_FOLLOWUP_BUN_PATHS = [
  ...TASK551_L02_PREEXISTING_BUN_PATHS,
  ...TASK551_L02_FUTURE_BUN_PATHS,
] as const;

const TASK551_L04_BUN_TEST_PATHS = [
  "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts",
] as const;

const TASK551_RECOVERY_INITIAL_DEPENDENT_BUN_PATHS = [
  ...TASK551_INITIAL_DEPENDENT_BUN_PATHS,
  ...TASK551_L02_FOLLOWUP_BUN_PATHS,
] as const;

const TASK551_PLANNED_BUN_TEST_PATHS = [
  ...TASK551_L01_BUN_TEST_PATHS,
  ...TASK551_INITIAL_DEPENDENT_BUN_PATHS,
  ...TASK551_L04_BUN_TEST_PATHS,
  ...TASK551_L02_FOLLOWUP_BUN_PATHS,
] as const;
```

The full self-contained `TASK551_PLANNED_BUN_TEST_PATHS` therefore has exactly
nine paths: the two L01-owned paths above plus the seven planned L03/L04/L02
dependent paths, including the one L04 bootstrap path. References to the
seven-path set and its timing below concern only those dependent paths.

`TASK551_L01_AUXILIARY_FOCUSED_TEST_PATHS` is deliberately outside both exact
arrays: its one direct capability-routes regression runs in each L01 occurrence
as a DB-free focused gate, but it never changes recovery state, the nine-path
manifest slice, or L11's four-test prerequisite/barrier receipt. It may be a
normal generic `tests/perf` row after classifier regeneration without becoming
TASK-551 lifecycle membership.

The initial L01 change to the planned suite set may add no other L03/L04/L02 suite
path, and duplicate entries fail. The pre-existing reviewed-pair path remains
its one existing membership rather than being appended a second time. Both
`TASK551_L02_FOLLOWUP_BUN_PATHS` entries are declarative planned membership
only: their test source remains L02-owned, and L01 does not write or execute
either source in its four-test prerequisite. The shared state guard below—not a
simple runner-absence check—controls the filesystem state: legal-initial has
only `reviewedPairPersistence.test.ts`; recovery-initial has exactly
`TASK551_RECOVERY_INITIAL_DEPENDENT_BUN_PATHS` reference-only with the L04
bootstrap absent; and post-finalization has all seven dependent paths. This
exact pre-dispatch invariant is checked by the two L01 planned-membership
tests,
`tests/perf/database-query-inventory.test.ts` and
`tests/integration/server/task551BunLaneMembership.test.ts`; L03, L04, and L02 are
read-only consumers of those checks and the planned membership set, and may
not modify either test or the manifest. The separate capability-routes test is
an L01 direct auxiliary gate only; it is neither a state input nor a dependent
leaf test.

#### Recovery and Re-entry Filesystem States

This guard preserves the canonical initial land order
`L01 initial -> L03 -> L04 -> L02`; it is not a waiver to start a later leaf
early or to reinterpret a partially materialized later state as an initial
baseline. Before any source traversal/scanner or dependent-suite, runner,
fixture, process, evidence, or classifier action, the two L01-owned checks
must classify the exact seven dependent paths and the exact TASK-551 manifest
slice. They return exactly one of these three complete states:

- **Legal initial:** `reviewedPairPersistence.test.ts` is the only materialized
  path in the dependent set. Every path in
  `TASK551_INITIAL_DEPENDENT_BUN_PATHS`, `TASK551_L04_BUN_TEST_PATHS`, and
  `TASK551_L02_FUTURE_BUN_PATHS` is absent. In particular, the L04 bootstrap
  and L02 `runnerLifecycle.test.ts` are absent. The planned membership remains
  declarative and has one entry for each of the nine planned L01/dependent
  paths; it does not claim that future source files exist, and the exact
  TASK-551 manifest slice is empty.
- **Recovery-initial:** exactly these six already-existing dependent paths are
  reference-only (`TASK551_RECOVERY_INITIAL_DEPENDENT_BUN_PATHS`): the L03
  `tests/perf/task551FixtureTargetBootstrap.test.ts` path and the L02
  `tests/perf/database-query-baseline.test.ts`,
  `tests/perf/task551DatabaseBaseline/digestContract.test.ts`,
  `tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts`,
  `tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts`, and
  `tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts` paths. The L04
  `tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts`
  path is absent, and the exact TASK-551 slice of the generated manifest is
  empty. In this recovery state, initial L01 may perform only DB-free inventory
  work; it must not invoke dependent test, runner, fixture, process, evidence,
  or classifier behavior. Reference-only presence neither materializes nor
  validates a later leaf and cannot substitute for its owning leaf's required
  gate.
- **Post-finalization:** all seven dependent paths exist after L03, L04, and
  L02 have closed in that order. The generated manifest's exact TASK-551 slice
  equals the materialized `TASK551_PLANNED_BUN_TEST_PATHS` set, with no missing,
  duplicate, or unplanned Task-551-marked path.

Every other combination is an **illegal partial state** and must fail closed:
for example, a premature L02 profile/fixture/runner artifact outside the exact
recovery-initial state, an L04 bootstrap without its legal predecessor state,
any subset of later paths other than the reviewed-pair-only legal initial or
the exact six-path recovery-initial state, or a manifest that names a missing
or wrong Task-551 path. A partial state must fail before an L01 initial source
traversal/scanner or any downstream suite, runner, fixture, process, evidence,
or classifier action; it may not be hidden, accepted as legacy, or normalized
by weakening inventory discovery, classification, ownership, or manifest checks.

L01 never repairs, rehomes, removes, or rewrites L02-owned files in order to
make this guard pass. If re-entry discovers an illegal partial state, the L02
owner must first supply an audited recovery contract that assigns the exact
L02-owned artifact disposition and validation needed to restore a legal state;
only then may a new L01 initial occurrence be dispatched. L01 may verify that
declared resulting state, but it cannot manufacture it. The same ownership rule
leaves the L04 bootstrap path with L04; neither later owner grants L01 authority
over it.

The exact four-test pre-classifier suites are default-`test:bun` DB-free
static/mock contract tests, not fixture or measurement tests. Their source and transitive imports
must never create a database client or connection; execute a preflight,
transaction, seed, cleanup, freeze, check, or measurement; or read a generic
database/fixture environment variable, `process.env`, `Bun.env`, or a dotenv
source—even when an ambient `.env` exists. They may exercise parsing and error
paths only through injected plain-object environment maps and mock adapters.
L11's isolated durable-evidence reruns remain limited to the L03 bootstrap
suite and exactly the two L02 profile-evidence suites
(`database-query-baseline` and `digestContract`). The L04 bootstrap and
`fixtureTarget.test.ts` suites participate only in the ordinary default lane
and this lane-finalization validation; neither has an isolated rerun or durable
per-profile evidence requirement. No evidence rerun makes an environment value
a test input or replaces the DB-free default-lane contract.

### Post-Materialization Lane-Finalization Gate

The pre-dispatch manifest can be older than not-yet-materialized tests, so it
is not regenerated before their own leaves land. L03 may close immediately
after its own targeted static and isolated CLI gates; L04 then closes after its
own DB-free focused test and does not wait for L02 materialization or this
manifest work. L02 next preserves and validates its pre-existing
`reviewedPairPersistence.test.ts` owner test and
completes static implementation needed to materialize its remaining four
L02-owned test files: the two profile-evidence suites, `fixtureTarget.test.ts`,
and `runnerLifecycle.test.ts`. This initial-phase family subgate—not a third
leaf—then starts only after **all seven**
`tests/perf/task551FixtureTargetBootstrap.test.ts`,
`tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts`,
`tests/perf/database-query-baseline.test.ts`,
`tests/perf/task551DatabaseBaseline/digestContract.test.ts`, and
`tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts`,
`tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts`, and
`tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts` exist. The
pre-existing reviewed-pair path must remain present, and the newly materialized
runner-lifecycle path plus the L04-owned bootstrap path must now be present and
participate in full manifest membership; neither is added to the following exact DB-free pre-classifier
command:

```sh
bun --env-file=/dev/null test tests/perf/task551FixtureTargetBootstrap.test.ts tests/perf/database-query-baseline.test.ts tests/perf/task551DatabaseBaseline/digestContract.test.ts tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts
```

The `database-query-baseline` suite in that command must execute the L02-owned
exact comparison of the immutable L01 Admin projection. L11 records this as a
distinct `preClassifierStaticPrerequisite` receipt. It is a required first pass:
the classifier snapshot/command may not begin until it is positive, and a later
re-run of any or all four suites cannot create, replace, or backdate it. The
pre-classifier command receives no fixture map, target, database identity, or
generic/fixture database environment value. This subgate must finish before
L02's first fixture-target `--freeze` or `--check`, L02 evidence capture or
closure, and dispatch beyond TASK-551-01. It is not the later post-TASK-551-09
final inventory refresh: it does not run the inventory CLI, transition the
inventory receipt phase, modify a product source owner, alter the declared land
order, or reopen L03.

Only after that receipt is positive does TASK-551-11 capture the generator
snapshot and dispatch L01's sole repository-root generator exactly once with
this invocation and no arguments:

```sh
bun scripts/bun-lane-classify.ts
```

Do not probe the classifier with `--help`, omit/replace its program path, pass
additional flags, or use an alternate generator. L11 captures a pre-command
snapshot and rejects any mutation attributable to this generator other than
`tests/bun-lane-manifest.json`; pre-existing unrelated working-tree changes are
preserved and do not widen that command's mutation allowlist. Its generated
`generatedAt` metadata is not an acceptance input; the classifier's ordered
`rows` are. After the generator, L11 runs the shared `bunLaneManifest` suite
and the L01 membership suite against that generated manifest. It records the
redacted finalization receipt under its own workflow-evidence contract,
including the pre-classifier static receipt, prerequisite-path existence, the
literal command, the one-path mutation proof, and post-generator
manifest/membership validation outcomes—never environment values, database
identities, SQL, or fixture data. If the L11 evidence shape retains a grouped
four-suite run after the generator, it is a separately named
`postGeneratorStaticRevalidation` receipt only: it may confirm that the
generator did not perturb the static contracts, but it must never be described
or accepted as their first pass or as a substitute for
`preClassifierStaticPrerequisite`. This lane-finalization receipt is not L02
durable profile evidence and does not add a `fixtureTarget.test.ts` per-profile
receipt requirement. L01 writes no workflow sidecar or receipt itself.

After that L11-dispatched regeneration, the membership suite must compare the
exact sorted sets rather than retain a pending-row exception. The equality is
required only after all seven L03/L04/L02 planned files exist; it therefore
includes the L04 bootstrap path and both L02 follow-up paths even though none
was part of the four-test command:

```ts
const materializedPlanned = TASK551_PLANNED_BUN_TEST_PATHS.filter(existsSync).sort();
const manifestTask551Slice = manifest.rows
  .map((row) => normalizeManifestFilename(row.file))
  .filter((file) => {
    const isPlanned = TASK551_PLANNED_BUN_TEST_PATHS.includes(file);
    return isPlanned || (!isPlanned && file.includes("task551"));
  })
  .sort();

expect(new Set(manifestTask551Slice).size).toBe(manifestTask551Slice.length);
expect(manifestTask551Slice).toEqual(materializedPlanned);
```

For this contract, the TASK-551-owned manifest slice is the duplicate-preserving
list of normalized manifest filenames formed from (1) every planned path and
(2) every otherwise-unplanned path whose normalized filename contains
`task551`. This includes every materialized planned path (including the baseline
path, whose filename does not itself contain `task551`). Generic rows matching
neither condition are outside TASK-551 ownership, even if the manifest contains
duplicates of them. Duplicate rejection and exact equality apply only to this
defined slice: an unplanned `task551`-marked row fails, while a nonmatching
generic row is ignored by this contract. It may use a root-membership-only
assertion before all seven files exist. L03 and L04 remain independently
eligible to close after their own targeted static gates. This post-generation
receipt instead blocks only L02's fixture `--freeze`/`--check`, L02
evidence/closure, and every dispatch beyond TASK-551-01 until the
pre-classifier static prerequisite, exact equality, and the post-generator
manifest/membership tests pass. It is not a third leaf, never reopens L03, and
does not make `fixtureTarget.test.ts` durable profile evidence. The named L01
capability-routes auxiliary test is intentionally neither planned nor
`task551`-marked, so it remains outside this exact manifest slice and its
barrier receipts.

## Inventory Contract

### Canonical Records, Call Sites, and Digests

One current record exists for every database-relevant **call site**, never merely
one per file or enclosing function. A current call site has a repository-relative
`core/**` file, a named enclosing symbol (or the literal `<module>`), a positive
one-based line and column at the opening classified AST call/tag/import node,
and a classified caller family/operation. Its stable ID is generated, not
hand-written:

```text
<file>#<symbol>:L<line>:C<column>:<caller.family>:<caller.operation>
```

The scanner emits this complete shape, rejects duplicate IDs/anchors, sorts the
canonical discovered set by `id`, and compares that full set—not a per-file
summary—against the reviewed current records. A line or column shift is an
intentional inventory refresh: it cannot silently retain a prior record. Planned
deltas retain their approved semantic IDs until landed, but must carry the
complete expected caller metadata and have `source.line`/`source.column` equal
to `null`; a final run has no planned record at all.

`source.file` is a normalized relative `core/` path with no traversal segment;
`source.symbol` is `<module>` or a normalized identifier/path segment without
the ID delimiters; and `line`/`column` are safe positive integers. An anonymous
or syntactically unrepresentable database-relevant call site fails closed rather
than inventing an unstable anchor.

Every record is strict and uses the following closed shape. All fields are
required; `null` and explicit enum values are used instead of omitted properties.
The validator rejects unknown fields at every nesting level and rejects invalid
enum combinations, non-canonical IDs, non-positive current anchors, and a
planned/current anchor-state mismatch.

```ts
type CallerFamily =
  | "drizzle-executor"
  | "postgres-client"
  | "session-client"
  | "tagged-raw-sql"
  | "transaction-executor"
  | "dynamic-db-import"
  | "client-construction";

type CallerOperation =
  | "select" | "query" | "execute" | "insert" | "update" | "delete"
  | "transaction" | "batch" | "tag" | "import" | "postgres" | "drizzle";

const CALLER_FAMILY_OPERATION_PAIRS = {
  "drizzle-executor": [
    "select", "query", "execute", "insert", "update", "delete", "transaction", "batch",
  ],
  "postgres-client": ["query", "execute", "tag", "postgres"],
  "session-client": [
    "select", "query", "execute", "insert", "update", "delete", "transaction", "batch", "tag",
  ],
  "tagged-raw-sql": ["tag"],
  "transaction-executor": [
    "select", "query", "execute", "insert", "update", "delete", "transaction", "batch", "tag",
  ],
  "dynamic-db-import": ["import"],
  "client-construction": ["postgres", "drizzle"],
} as const satisfies Readonly<Record<CallerFamily, readonly CallerOperation[]>>;

// The 34 members above are the complete closed CallerFamily × CallerOperation
// allow-pairs relation. Every other one of the 84 enum cross-product pairs is
// invalid.

type QueryInventoryRecord = StrictReadonly<{
  schemaVersion: 1;
  recordState: "current" | "planned";
  id: string;
  source: StrictReadonly<{
    file: string;
    symbol: string;
    line: number | null;
    column: number | null;
  }>;
  caller: StrictReadonly<{ family: CallerFamily; operation: CallerOperation }>;
  kind: "point" | "list" | "search" | "aggregate" | "mutation" | "append" | "maintenance";
  statementRole: "page" | "fixed-summary" | "facet" | "fixed-list" | "not-applicable";
  projectionSensitivity: "narrow" | "summary" | "aggregate" | "wide-reviewed" | "mutation-only" | "external-unreviewed";
  filterShape: "none" | "exact-key" | "bounded-filter" | "keyset" | "external-unreviewed";
  joinShape: "none" | "bounded" | "external-unreviewed";
  orderShape: "not-applicable" | "stable" | "external-unreviewed";
  bound: number | "stream" | "missing";
  queryCountBudget: number | "external-unreviewed";
  cacheEligibility: "eligible" | "ineligible" | "external-unreviewed";
  freshnessPolicy: "request" | "ttl" | "event-invalidated" | "not-applicable" | "external-unreviewed";
  transactionMode: "none" | "transaction" | "session-client" | "external-unreviewed";
  constraintOwner: `TASK-551-${string}` | `TASK-${number}` | "database-existing" | "none" | "external-unreviewed";
  budgetId: string;
  plannedShapeId: string | null;
  telemetryFingerprintKey: string | null;
  owner: `TASK-551-${string}` | `TASK-${number}`;
  disposition: "optimize" | "preserve-bounded" | "external-handoff";
}>;

type DiscoveredCaller = StrictReadonly<{
  id: string;
  source: QueryInventoryRecord["source"] & { line: number; column: number };
  caller: QueryInventoryRecord["caller"];
}>;

type QueryInventoryReceipt = StrictReadonly<{
  schemaVersion: 1;
  phase: "initial" | "final";
  sourceTreeDigest: string; // SHA-256 of canonical discovered call sites.
  inventoryDigest: string; // SHA-256 of every canonical current-record field.
  plannedDeltaDigest: string; // SHA-256 of every canonical planned-record field.
  fingerprintAssociationDigest: string; // SHA-256 of exact id -> key pairs.
  discoveredCount: number;
  ownedCount: number;
  plannedDeltaCount: number;
  adminReadPlannedCount: number;
  legacyPlannedCount: number;
  // Historical field name retained: this is a fixed reviewed-fixture marker,
  // not a wall-clock execution timestamp.
  validatedAt: `reviewed-fixture-v${number}`;
}>;
```

`scripts/task551QueryInventory/contracts.ts` owns this same exact closed
allow-pairs table; it must validate a caller against the table rather than
against the two independent enums. The focused contract tests enumerate all 34
allowed tuples and enumerate the complete `CallerFamily × CallerOperation`
cross-product to reject each of the other 50 tuples. A record that uses two
individually valid enum values but an absent table pair is invalid.

For `optimize` and `preserve-bounded`, `queryCountBudget` is a positive integer
and `bound` is a positive integer or the explicitly reviewed `stream` value;
`missing` is an initial-review failure. `external-handoff` records use
`external-unreviewed` for the review fields they do not own and have a null
fingerprint key. `cacheEligibility: "eligible"` requires `request`, `ttl`, or
`event-invalidated` freshness; `ineligible` requires `not-applicable`; and the
external state requires `external-unreviewed`. `transactionMode: "none"`
requires `constraintOwner: "none"`; a transaction/session requires its explicit
owning task or `database-existing`. These matrix rules are schema validation,
not advisory documentation.

`canonicalizeDiscoveredCallers`, `canonicalizeInventoryRecords`, and
`canonicalizeFingerprintAssociations` each sort by stable ID, serialize only
their closed public fields with canonical JSON, and SHA-256 the resulting bytes.
`sourceTreeDigest` covers `id`, every source-anchor member, and both caller
members; `inventoryDigest` and `plannedDeltaDigest` cover every field shown
above; and `fingerprintAssociationDigest` covers the exact selected
`record.id -> telemetryFingerprintKey` mapping. No digest input contains SQL,
binds, URLs, environment values, or customer data.

`validatedAt` retains its historical field name but is a deterministic,
fixture-owned review marker matching `reviewed-fixture-v<positive decimal>`.
It is checked in as immutable reviewed metadata and is never sampled from
`Date`, `Date.now`, `performance`, filesystem time, a process clock, or an
environment value. The computed receipt identity is the phase, current
`sourceTreeDigest`, the three semantic digests, and the five counts; it
deliberately excludes `validatedAt`. Receipt validation checks that fixed marker
as fixture metadata separately **and** pairs it with the freshly computed
source-tree and semantic digests, so a wall-clock value cannot make a stale tree
look current.

The telemetry-selected set is exactly every current or planned record whose
`disposition` is `optimize` or `preserve-bounded`:

```ts
function selectedTelemetryRecords(records: readonly QueryInventoryRecord[]) {
  return canonicalizeInventoryRecords(records.filter((record) =>
    record.disposition === "optimize" || record.disposition === "preserve-bounded",
  ));
}
```

Only this selected set has a non-null, globally unique
`telemetryFingerprintKey`. Every `external-handoff` record must have
`telemetryFingerprintKey: null`, is excluded from the association map and its
digest input, and makes validation fail if it carries a key. The validator first
checks this exact selection/nullability rule and then requires
`TASK551_QUERY_FINGERPRINT_ASSOCIATIONS` to equal the selected
`record.id -> telemetryFingerprintKey` mapping in both key **and** value; it
does not impose an association or uniqueness rule on external-handoff records.
That map is an association map, not a second production fingerprint-value
registry. The sole production value registry remains
`core/db/queryFingerprintRegistry.ts`, owned only by TASK-551-02-L02 and
imported by telemetry; production never imports this test fixture. Initial
phase stores one temporary reviewed `PLANNED_QUERY_FINGERPRINT_REGISTRY`
definition handoff plus the exact selected association map. Its CLI grammar
still accepts `--phase final`, but the initial occurrence returns only the fixed
`query_inventory_final_receipt_missing` failure: it contains no lexical module
specifier or loader for the absent future registry. On the final L01
re-dispatch—only after L02 has landed
`core/db/queryFingerprintRegistry.ts`—L01 adds the final-only loader and its
registry import in allowlisted `scripts/task551QueryInventory/check.ts`, verifies
the landed closed definitions and association only against the selected set, and
removes the temporary mapping rather than creating a second registry. Raw or
normalized SQL is never a key, a value, a digest input, or an error detail.

The initial scan requires exact coverage of every currently discovered call site
and permits only explicit `plannedDelta` records for production callers that a
named TASK-551-02..09 leaf will add. A planned delta includes the future file,
symbol/caller contract, query class, projection/filter/join/order contract,
cardinality and query-count budgets, cache/freshness contract,
transaction/constraint owner, and sole owner, but is not counted as a currently
discovered caller. The final scan is run from the validated post-09 tree,
rejects every remaining planned delta, and requires exact discovered/fixture
equality. Later leaves never edit these artifacts; orchestration re-dispatches
this same leaf as their sole writer.

### Fail-Closed Source Traversal and Classification

The scanner accepts only the repository-root `core` traversal requested by the
CLI. It recursively enumerates sorted `.ts`, `.tsx`, `.mts`, and `.cts`
production files, explicitly excludes tests and generated `core/db/migrations`,
and fails with `query_inventory_scan_invalid` on an unreadable file, symlink,
unsupported source form, parse diagnostic, unresolved database-like import, or
an AST construct that may be database-relevant but cannot be classified. It
must not catch-and-skip a directory/file, silently downgrade a parser error, or
use a prefilter that can suppress a database-relevant source file. It parses the
whole allowed source set deterministically; filesystem and TypeScript adapters
are injected into DB-free helpers so focused tests use in-memory source text.

For every source, classification is multi-call-site: a function containing two
eligible calls produces two separately anchored discoveries. Coverage includes
Drizzle executor chains and transactions; direct/raw `postgres(...)` and
`drizzle(...)` construction; imported or aliased postgres clients; session
clients and `withSessionDatabaseClient` callback bindings; client/tagged raw SQL;
transaction callback and destructured/aliased executor bindings; and static or
literal dynamic imports resolving to `core/db/client`, `postgres`, or the
postgres.js Drizzle constructor module when their binding reaches a client or
constructor call. A non-literal dynamic import or unknown alias that can reach
one of those DB capabilities fails closed rather than being omitted. A raw SQL
tag is a record only when issued through a classified client/session/transaction;
a standalone Drizzle schema/query-fragment `sql` tag is not independently
executed and is represented by its enclosing classified executor call. The
scanner records only the closed caller family/operation and anchor—never source
text or SQL.

The required `core/services/settings/securitySettings.ts` regression case splits
type syntax from runtime provenance. The type-only `ImportTypeNode` in the
`getDb` cache declaration at `L133:C24` produces no import or executor record.
The direct async-IIFE runtime `await import("../../db/client")` that destructures
`db` at `getDb` `L137:C26` produces exactly one dynamic-import discovery. Its
projected `db` must retain async-IIFE, cache (`dbPromise`), and return (`getDb`)
provenance, so the scanner attributes the downstream executor anchors
`getSecuritySettings` `L806:C23` (`select`), `setSecuritySettings` `L831:C9`
(`insert`), and `getSecuritySettingsUpdatedAt` `L852:C23` (`select`). A type
import double count, a missing runtime import, or a broken async-IIFE/cache/return
edge is a fail-closed inventory mismatch.

This caller-producing path is distinct from the narrow opaque zero-argument
`loadClientModule` lifecycle flow in `core/db/databaseLifecycle.ts`. Exactly two
live loaders are allowed: the initial loader and the `next ??` reset fallback.
Each is a zero-argument loader whose body reaches a direct literal
`import("./client")`; only transparent type-assertion wrappers and the internal
`loadClientModule` flow may surround it, and both emit zero caller records. A
nonzero loader/import argument, changed specifier, occurrence outside that file,
namespace/capability or pass-through escape, `.then` projection, or promise-wrapper
escape must fail closed with `query_inventory_scan_invalid` rather than be omitted,
normalized, or reclassified.

For `core/db/client.ts` `maintenanceSqlClient`, use an exact conditional
resolver: accept only one transparent `ConditionalExpression` whose true and
false branches independently resolve through the existing direct
alias/constructor rules to the **same** non-unknown `ClientKind`, then bind that
kind. Transparent type assertions may be stripped only to reach that conditional
or either direct branch; the resolver must not add a new alias, wrapper, or
provenance rule. Preserve the independently classified nested postgres-constructor
record at `L104:C7`. Every mixed-kind, unknown-kind, nested-conditional, or
namespace/capability/pass-through escape form fails closed with
`query_inventory_scan_invalid`.

The initial planned-delta set contains exactly 34 records. The following 32 are
owned solely by TASK-551-03-L02. `bound` is the maximum physical rows returned
by that statement, including lookahead; `budgetId` is also the exact key in
L02's numeric small/large budget map. Each symbol is a required named function,
not a prose placeholder, and each telemetry-selected fingerprint key is
globally unique. The table is the human review index. L01 owns the immutable
`TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION`: a frozen canonical projection
created only from these reviewed 32 **L01 strict planned records** after strict
validation, not a separately authored template or digest registry. It includes
the record ID, planned-shape ID, full future source/caller anchor state,
kind/statement role, projection/filter/join/order tuple, bound/query-count
budget, cache/freshness/transaction/constraint tuple, budget ID, fingerprint
key, owner, and disposition. Initial L01 validates its complete planned-record
semantic tuples directly, with no defaulting or generated fallback, then exposes
that immutable projection as L02's later read-only handoff. It must never
import, instantiate, or assert the later L02-owned
`TASK551_ADMIN_READ_STATEMENT_SHAPES` static template/digest registry:

| Planned ID | Future file and symbol | Class / bound | `budgetId` | Fingerprint key |
|---|---|---|---|---|
| `admin-pages-page` | `pageReadService.ts#selectPageListRows` | page / 101 | `admin-pages-page` | `admin_pages_page` |
| `admin-pages-fixed-summary` | `pageReadService.ts#selectPageListFixedSummary` | fixed-summary / 1 | `admin-pages-fixed-summary` | `admin_pages_fixed_summary` |
| `admin-pages-authors-facet` | `pageReadService.ts#selectPageAuthorFacetPage` | facet / 51 | `admin-pages-authors-facet` | `admin_pages_authors_facet` |
| `admin-entries-global-page` | `entryReadService.ts#selectGlobalEntryListRows` | page / 101 | `admin-entries-global-page` | `admin_entries_global_page` |
| `admin-entries-global-fixed-summary` | `entryReadService.ts#selectGlobalEntryFixedSummary` | fixed-summary / 1 | `admin-entries-global-fixed-summary` | `admin_entries_global_fixed_summary` |
| `admin-entries-global-facets` | `entryReadService.ts#selectGlobalEntryFacetBatch` | facet / 102 | `admin-entries-global-facets` | `admin_entries_global_facets` |
| `admin-entries-typed-page` | `entryReadService.ts#selectTypedEntryListRows` | page / 101 | `admin-entries-typed-page` | `admin_entries_typed_page` |
| `admin-entries-typed-fixed-summary` | `entryReadService.ts#selectTypedEntryFixedSummary` | fixed-summary / 1 | `admin-entries-typed-fixed-summary` | `admin_entries_typed_fixed_summary` |
| `admin-entries-typed-authors-facet` | `entryReadService.ts#selectTypedEntryAuthorFacetPage` | facet / 51 | `admin-entries-typed-authors-facet` | `admin_entries_typed_authors_facet` |
| `admin-posts-page` | `postReadService.ts#selectPostListRows` | page / 101 | `admin-posts-page` | `admin_posts_page` |
| `admin-posts-fixed-summary` | `postReadService.ts#selectPostListFixedSummary` | fixed-summary / 1 | `admin-posts-fixed-summary` | `admin_posts_fixed_summary` |
| `admin-posts-authors-facet` | `postReadService.ts#selectPostAuthorFacetPage` | facet / 51 | `admin-posts-authors-facet` | `admin_posts_authors_facet` |
| `admin-users-page` | `userReadService.ts#selectUserListRows` | page / 101 | `admin-users-page` | `admin_users_page` |
| `admin-users-fixed-summary` | `userReadService.ts#selectUserListFixedSummary` | fixed-summary / 1 | `admin-users-fixed-summary` | `admin_users_fixed_summary` |
| `admin-users-roles-facet` | `userReadService.ts#selectUserRoleFacetPage` | facet / 51 | `admin-users-roles-facet` | `admin_users_roles_facet` |
| `admin-forms-page` | `formReadService.ts#selectFormListRows` | page / 101 | `admin-forms-page` | `admin_forms_page` |
| `admin-forms-fixed-summary` | `formReadService.ts#selectFormListFixedSummary` | fixed-summary / 1 | `admin-forms-fixed-summary` | `admin_forms_fixed_summary` |
| `admin-form-submissions-page` | `submissionReadService.ts#selectSubmissionListRows` | page / 101 | `admin-form-submissions-page` | `admin_form_submissions_page` |
| `admin-form-submissions-fixed-summary` | `submissionReadService.ts#selectSubmissionListFixedSummary` | fixed-summary / 1 | `admin-form-submissions-fixed-summary` | `admin_form_submissions_fixed_summary` |
| `admin-media-page` | `mediaReadService.ts#selectMediaListRows` | page / 101 | `admin-media-page` | `admin_media_page` |
| `admin-media-fixed-summary` | `mediaReadService.ts#selectMediaListFixedSummary` | fixed-summary / 1 | `admin-media-fixed-summary` | `admin_media_fixed_summary` |
| `admin-media-facets` | `mediaReadService.ts#selectMediaFacetBatch` | facet / 102 | `admin-media-facets` | `admin_media_facets` |
| `admin-booking-reservations-page` | `bookingReadService.ts#selectReservationListRows` | page / 101 | `admin-booking-reservations-page` | `admin_booking_reservations_page` |
| `admin-booking-reservations-fixed-summary` | `bookingReadService.ts#selectReservationListFixedSummary` | fixed-summary / 1 | `admin-booking-reservations-fixed-summary` | `admin_booking_reservations_fixed_summary` |
| `admin-booking-resources-page` | `bookingReadService.ts#selectResourceListRows` | page / 101 | `admin-booking-resources-page` | `admin_booking_resources_page` |
| `admin-booking-resources-fixed-summary` | `bookingReadService.ts#selectResourceListFixedSummary` | fixed-summary / 1 | `admin-booking-resources-fixed-summary` | `admin_booking_resources_fixed_summary` |
| `admin-booking-services-page` | `bookingReadService.ts#selectServiceListRows` | page / 101 | `admin-booking-services-page` | `admin_booking_services_page` |
| `admin-booking-services-fixed-summary` | `bookingReadService.ts#selectServiceListFixedSummary` | fixed-summary / 1 | `admin-booking-services-fixed-summary` | `admin_booking_services_fixed_summary` |
| `admin-booking-blackouts-page` | `bookingReadService.ts#selectBlackoutListRows` | page / 101 | `admin-booking-blackouts-page` | `admin_booking_blackouts_page` |
| `admin-booking-blackouts-fixed-summary` | `bookingReadService.ts#selectBlackoutListFixedSummary` | fixed-summary / 1 | `admin-booking-blackouts-fixed-summary` | `admin_booking_blackouts_fixed_summary` |
| `admin-booking-service-resources-fixed-list` | `bookingReadService.ts#selectServiceResourceRows` | fixed-list / 101 | `admin-booking-service-resources-fixed-list` | `admin_booking_service_resources_fixed_list` |
| `admin-booking-schedules-fixed-list` | `bookingReadService.ts#selectScheduleRows` | fixed-list / 101 | `admin-booking-schedules-fixed-list` | `admin_booking_schedules_fixed_list` |

#### Required L02 Static Comparison (Dependent Owner Follow-up)

This is a required dependent contract change in
`_docs/_TASKS/TASK-551-01-L02-Small-Large-Fixtures-Baselines-And-Budgets.md`,
but is not an L01 edit: **L02's DB-free static phase must import
`TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION` from
`tests/perf/fixtures/task551QueryInventory.ts` and call
`assertExactAdminShapeProjection({ l01Projection,
shapes: TASK551_ADMIN_READ_STATEMENT_SHAPES })`, failing unless all 32 IDs and
every shared semantic tuple member match exactly; L02 remains the sole writer
of `TASK551_ADMIN_READ_STATEMENT_SHAPES` and its static template/digest
registry.** L02 may use an explicit field-name mapping only where the two
closed contracts intentionally use different names; it must reject a missing,
extra, duplicate, defaulted, or semantically divergent member. The comparison
flows one way from L01's immutable planned-record handoff to L02's later static
registry—never by making initial L01 depend on future L02 source.

The remaining two records preserve the previously agreed contracts:

- `core/services/cache/cacheInvalidationOutbox.ts#readOldestUnprocessedAge`,
  ID/budget ID `cache-outbox-oldest-unprocessed`, owner `TASK-551-08-L02`,
  kind `point`, bound `1`, fingerprint key
  `cache_outbox_oldest_unprocessed`, predicate `processed_at IS NULL`, and order
  `created_at ASC,id ASC`. It explicitly includes claimed and backed-off rows;
  claimability/availability fields are absent from the predicate. Because the
  table is introduced later by TASK-551-05, its scale/EXPLAIN/write budget is
  owned by TASK-551-05-L01/L02 rather than the pre-schema L01-L02 baseline.
- `core/services/content/publicContentVisibilityGateRead.ts#validatePublicHtmlDependencies`,
  ID/budget ID `public-html-dependencies-128`, sole owner `TASK-551-09-L01`,
  kind `aggregate`, result bound `1`, input cap
  `128` dependency tuples, canonical-input cap `16,384` bytes, root-list bound
  `<= 100 + 1`, and fingerprint key `public_html_dependency_validation`. One
  parameterized `VALUES`/CTE statement validates root membership plus all nested
  page, post, and content-entry visibility projections. It selects no page/post/
  entry bodies, document/data JSON, or password hashes. L02 supplies its initial
  planned fixture/budget; the final refresh records the landed caller or removes
  this planned record when TASK-551-09-L01 proves that no new caller is needed.

Both legacy planned records also carry the full strict canonical tuple above;
their stated predicate/order/projection limits are asserted as values of that
tuple, never preserved only in prose or inferred from a default.

Final inventory must discover each landed caller and remove both planned records;
if TASK-551-09-L01 removes its planned query after final source discovery, the
receipt records that evidence and removes only that no-longer-present delta.

`tests/perf/fixtures/task551QueryInventory.ts` exports the reviewed records,
the exact selected `record.id -> telemetryFingerprintKey` association map, and
the complete `TASK551_QUERY_INVENTORY_RECEIPT` above. The initial receipt is the
implementation handoff. The final receipt replaces it and is the mandatory
immutable input to TASK-551-10-L01. It contains no diff bodies, SQL, binds,
environment values, or customer data.

## Implementation Pseudocode

Split the present near-limit scanner before adding behavior. The root
`scripts/task-551-query-inventory.ts` is a small facade only; its L01-owned
helpers are cohesive modules such as `contracts.ts` (types/strict schemas),
`scan.ts` (injected traversal and AST classification), `canonical.ts`
(stable IDs/digests/receipt), `check.ts` (exact-set and association checks),
and `bunLane.ts` (membership/manifest checks) below
`scripts/task551QueryInventory/`. Every authored production or test module,
including the facade and each helper, remains at or below 1,000 physical lines.

The literal dynamic-client-import path uses only the existing
`literalDynamicClientImports.ts`, `dynamicImportOrigins.ts`,
`dynamicImportProvenance.ts`, `gscDynamicCapabilitySafety.ts`,
`literalDynamicCapabilityFactories.ts`, `literalDynamicCapabilityTypeFlow.ts`,
`literalDynamicCapabilityOpaqueTypeFlow.ts`, `literalDynamicCapabilitySafety.ts`,
`literalDynamicNamespaceSafety.ts`, `scan.ts`, and `check.ts` helpers. It accepts
only a runtime `CallExpression` with a literal
`ImportKeyword` and string-literal specifier. For `securitySettings`, it traces
the direct async-IIFE `await import("../../db/client")`, destructured `db`, and
its cache/return provenance; a TypeScript `ImportTypeNode` never enters this
runtime path and cannot double count the import. Separately, it recognizes only
the two live zero-argument `loadClientModule` lifecycle loaders whose bodies
directly use literal `import("./client")`: the initial loader and the `next ??`
reset fallback. Only transparent type-assertion wrappers and that internal
loader flow are allowed, and each emits zero caller records. A nonzero loader
call or extra import argument, a different specifier, an occurrence outside
`databaseLifecycle.ts`, namespace/capability or pass-through escape, `.then`
projection, or promise-wrapper escape fails closed. Do not add `assertions.ts`:
it is outside the finite allowlist, and its former exact-set/association role
stays in allowlisted `check.ts`.

`runInventoryCheck` accepts an optional DB-free dependency input with only
`exists`, `readManifest`, and `scan` functions. When omitted, those use the
existing production defaults; the exact filesystem-state classifier itself is
not overridable. This makes state ordering observable without authorizing a
database, dependent-suite, runner, fixture, process, evidence, or classifier
callback. The initial accepted `--phase final` grammar is a hard short-circuit:
it invokes neither the filesystem-state classifier nor `scan` (and therefore
must not call injected `exists` or `readManifest`). An illegal or
post-finalization initial state reaches the state classifier but calls `scan`
zero times; legal-initial and recovery-initial each call it exactly once and
invoke no dependent callback.

```ts
type RunInventoryCheckDependencies = Readonly<{
  exists?: (path: string) => boolean;
  readManifest?: () => BunLaneManifest;
  scan?: () => Promise<readonly DiscoveredCaller[]>;
}>;

async function runInventoryCheck(
  argv: readonly string[] = process.argv.slice(2),
  dependencies: RunInventoryCheckDependencies = {},
): Promise<void> {
const { phase } = parseExactInventoryCliArgs(argv);
// Accept exactly one --check and one --phase <initial|final>; reject duplicate,
// positional, --key=value, missing-value, and every unknown/junk token.

if (phase === "final") {
  // Initial occurrence only. This branch deliberately has no registry loader or
  // core/db/queryFingerprintRegistry module specifier, so root TypeScript can
  // compile before L02 creates that file. It is before every state-classifier
  // input and before scan, so the accepted final grammar invokes neither.
  return failFixedInventoryCheck("query_inventory_final_receipt_missing");
}

const exists = dependencies.exists ?? existsSync;
const readManifest = dependencies.readManifest ?? readBunLaneManifest;
const scan = dependencies.scan ?? (async () => {
  const files = await listCanonicalCoreFilesOrThrow({ root: "core", io });
  return canonicalizeDiscoveredCallers(
    files.flatMap((file) => scanSourceTextOrThrow({ file, text: io.readUtf8(file), ts })),
  );
});

assertExactTask551BunTestPlan({
  planned: TASK551_PLANNED_BUN_TEST_PATHS,
  l01Owned: TASK551_L01_BUN_TEST_PATHS,
  initialDependent: TASK551_INITIAL_DEPENDENT_BUN_PATHS,
  l04: TASK551_L04_BUN_TEST_PATHS,
  l02Followups: TASK551_L02_FOLLOWUP_BUN_PATHS,
  l02Preexisting: TASK551_L02_PREEXISTING_BUN_PATHS,
  l02Future: TASK551_L02_FUTURE_BUN_PATHS,
});
const lifecycleState = assertTask551BunLaneMembershipState({
  exists,
  planned: TASK551_PLANNED_BUN_TEST_PATHS,
  l01Owned: TASK551_L01_BUN_TEST_PATHS,
  initialDependent: TASK551_INITIAL_DEPENDENT_BUN_PATHS,
  l04: TASK551_L04_BUN_TEST_PATHS,
  l02Followups: TASK551_L02_FOLLOWUP_BUN_PATHS,
  l02Preexisting: TASK551_L02_PREEXISTING_BUN_PATHS,
  l02Future: TASK551_L02_FUTURE_BUN_PATHS,
  manifest: readManifest(),
});
if (lifecycleState === "post-finalization") {
  return fail("query_inventory_invalid", "initial-inventory-state");
}

// The state guard ran before traversal. Legal-initial and recovery-initial may
// continue only through this DB-free inventory body; neither may dispatch a
// dependent suite/runner, fixture/process/evidence action, classifier, or
// manifest writer.
const discovered = await scan();
const current = TASK551_QUERY_INVENTORY.map(validateStrictInventoryRecord);
const planned = PLANNED_QUERY_DELTAS.map(validateStrictInventoryRecord);
assertExactCurrentCallSiteCoverage({ discovered, current });
assertSingleWriterOwnership(current);
assertExactTelemetrySelectionAndFingerprintNullability({
  records: [...current, ...planned],
  selectedDispositions: ["optimize", "preserve-bounded"],
  externalDisposition: "external-handoff",
});
assertExactFingerprintAssociations({
  selected: selectedTelemetryRecords([...current, ...planned]),
  associations: TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
});
assertExactPlannedSet(planned, {
  total: 34, adminRead: 32, legacy: 2,
});
assertExactAdminPlannedRecordSemantics(planned);
assertExactL01AdminPlannedRecordProjection({
  planned,
  projection: TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION,
});
// The projection is L01-owned and immutable. Initial L01 does not import or
// assert the future L02 static template/digest registry.
assertEveryPlannedDeltaHasOneFutureOwner(planned);
assertPlannedFingerprintRegistryExact({
  selected: selectedTelemetryRecords([...current, ...planned]),
  associations: TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
  definitions: PLANNED_QUERY_FINGERPRINT_REGISTRY,
});
assertDeterministicReviewedReceiptMetadata({
  receipt: TASK551_QUERY_INVENTORY_RECEIPT,
  markerGrammar: /^reviewed-fixture-v[1-9][0-9]*$/,
  // No clock input; this metadata is checked separately from computed identity.
});
assertExactSanitizedReceipt(
  buildCanonicalReceipt({ phase, discovered, current, planned, associations: TASK551_QUERY_FINGERPRINT_ASSOCIATIONS }),
  TASK551_QUERY_INVENTORY_RECEIPT,
);

// The manifest contains every TASK-551 Bun-owned test path, including planned
// files. Initial phase checks that each path is under a root literally executed
// by package.json test:bun; final phase additionally requires every path to
// exist. A targeted-only path fails even when its leaf command would pass.
const executedRoots = canonicalBunLaneRootsFromClassifier(LANE_DIRS);
// `LANE_DIRS` is the single canonical classifier source and includes
// `tests/integration/toolchain`; do not maintain a divergent local root list.
assertCanonicalBunLaneMembership(TASK551_PLANNED_BUN_TEST_PATHS, {
  script: readRootPackageScript("test:bun"),
  executedRoots,
  requireFiles: phase === "final",
  rejectDuplicateManifestRows: true,
});

// The separate L01 membership suite classifies legal-initial, recovery-initial,
// and post-finalization before any scan. Legal-initial has only the reviewed-pair
// dependent path; recovery-initial has the exact six reference-only dependent
// paths with L04 absent; both have an empty TASK-551 manifest slice. Every other
// mix fails before traversal or downstream work. Only after L03 -> L04 -> L02
// materialize all seven paths does TASK-551-11 first record the four-suite
// pre-classifier pass and dispatch L01's one allowed classifier command. The
// post-generator suite verifies exact nine-path materialized-set equality with
// the generated manifest. The inventory CLI never regenerates that file.
}
```

The code above is the complete **initial** occurrence. Its accepted `--phase
final` branch always returns the same fixed
`query_inventory_final_receipt_missing` failure before any final receipt or
registry lookup; a regression test pins both the accepted grammar and that
fixed result. It must have no lexical `core/db/queryFingerprintRegistry` import
or computed loader declaration anywhere in the initial source tree.

Only on the final L01 re-dispatch, after TASK-551-02-L02 has landed
`core/db/queryFingerprintRegistry.ts`, replace the initial final boundary and
initial-only phase body with the following final-only behavior. This replacement
is absent from—and must not be type-checked as part of—the initial occurrence;
`check.ts` is the sole allowlisted owner of
`loadFinalFingerprintRegistryModule` and its import.

```ts
// Final re-dispatch only; this code is not present in the initial source.
if (phase === "final") {
  assertNoPlannedDeltasRemain(planned);
  assertTemporaryFingerprintRegistryAbsent();
  const canonical = await loadFinalFingerprintRegistryModule();
  assertCanonicalFingerprintRegistryExact({
    selected: selectedTelemetryRecords(current),
    associations: TASK551_QUERY_FINGERPRINT_ASSOCIATIONS,
    definitions: canonical.TASK551_QUERY_FINGERPRINT_DEFINITIONS,
  });
  return assertFinalDeterministicReceiptAndMembership();
}

return runInitialInventoryCheck(); // The initial-only body shown above.

// Final re-dispatch only, in scripts/task551QueryInventory/check.ts.
async function loadFinalFingerprintRegistryModule() {
  return import("../../core/db/queryFingerprintRegistry");
}
```

Final tests exercise the loader only after the registry file exists and require
the same fixed `query_inventory_final_receipt_missing` code for an absent,
malformed, or non-closed final receipt/module. They also prove that the initial
root `bun run lint:repo:types` succeeds before this final-only import is added.

The following is the required external TASK-551-11 dispatch pseudocode; it is
not code executed by the inventory CLI and uses no fixture map or database
authority:

```ts
const preClassifierStaticPrerequisite = await runRepositoryStaticBunCommand({
  argv: [
    "bun", "--env-file=/dev/null", "test",
    "tests/perf/task551FixtureTargetBootstrap.test.ts",
    "tests/perf/database-query-baseline.test.ts",
    "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
    "tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts",
  ],
});
requirePositiveDiscovery(preClassifierStaticPrerequisite);
requireExactL02ProjectionComparison(preClassifierStaticPrerequisite);

const beforeGenerator = await snapshotRepositoryPathsForOneCommand();
const generator = await runRepositoryStaticBunCommand({
  argv: ["bun", "scripts/bun-lane-classify.ts"],
});
const afterGenerator = await snapshotRepositoryPathsForOneCommand();
requireExactOneTimeGeneratorReceipt(generator, ["bun", "scripts/bun-lane-classify.ts"]);
requireChangedPathSubsetForThisCommand(beforeGenerator, afterGenerator, [
  "tests/bun-lane-manifest.json",
] as const);

const postGeneratorManifestMembership = await runRepositoryStaticBunCommandsInOrder([
  { argv: ["bun", "test", "tests/unit/toolchain/bunLaneManifest.test.ts"] },
  { argv: ["bun", "test", "tests/integration/server/task551BunLaneMembership.test.ts"] },
] as const);
requireAllPositiveDiscoveryStaticTestReceipts(postGeneratorManifestMembership);
requireExactMaterializedTask551BunLaneMembership();

// An implementation that keeps a grouped four-suite command here records it
// as postGeneratorStaticRevalidation; it cannot satisfy the prerequisite above.
```

Errors are stable (`query_inventory_invalid`, `query_inventory_unowned`,
`query_inventory_writer_conflict`, `query_inventory_cli_invalid`,
`query_inventory_scan_invalid`, `query_inventory_phase_invalid`,
`query_inventory_planned_delta_unresolved`, and
`query_inventory_final_receipt_missing`). Every error uses only a fixed error
code and, after strict grammar validation, a canonical `file#symbol:Lline:Ccolumn`
anchor or fixed field role; it never echoes raw CLI text, parser/source text,
unknown keys, SQL, binds, URLs, environment values, credentials, emails, or
customer data.

## Testing Requirements

- Initial fixture covers every currently discovered **call site** and all seven
  query classes while accepting only schema-valid, single-owner planned deltas.
  Tests pin every required canonical field, including the current
  file/symbol/line/column/caller-derived ID; enumerate every allowed member of
  `CALLER_FAMILY_OPERATION_PAIRS`, reject every other enum cross-product pair,
  and reject an omitted/null current anchor, a non-null planned anchor, every
  unknown top-level or nested field, and each invalid enum/budget state.
- Focused in-memory source tests exercise multiple discovered calls inside one
  function and assert their distinct stable IDs and ordered canonical set. They
  cover Drizzle executors/transactions, raw postgres and Drizzle construction,
  imported/aliased postgres clients, session-client callbacks, client/tagged raw
  SQL (while excluding a standalone schema/query-fragment tag), destructured
  transaction bindings, and literal dynamic `core/db/client`/postgres/Drizzle
  constructor imports. A
  malformed source, unreadable/symlinked traversal entry, unresolved DB-like
  import, non-literal dynamic import, unknown potential DB alias, or unsupported
  database-relevant AST form fails `query_inventory_scan_invalid`; no source is
  silently skipped.
- Pin the live `core/db/client.ts` `maintenanceSqlClient` positive case: one
  transparent conditional with two same-kind branches resolved only through the
  existing direct alias/constructor rules may bind the result, while preserving
  the independent nested postgres-constructor discovery at `L104:C7`. Synthetic
  positive cases cover same-kind direct-alias and constructor branches (with
  transparent type assertions only). Synthetic mixed-kind, unknown-branch,
  nested-conditional, and namespace/capability/pass-through escape cases must
  each fail `query_inventory_scan_invalid`; no new resolver/provenance form is
  accepted merely to make a synthetic case pass.
- Pin the `core/services/settings/securitySettings.ts` regression case without
  editing that core source: ignore the type-only `ImportTypeNode` in the
  `getDb` cache declaration at `L133:C24`; record exactly one direct async-IIFE
  runtime `await import("../../db/client")` discovery at `L137:C26`; and trace
  its destructured `db`, `dbPromise` cache, and `getDb` return provenance to the
  downstream executor anchors `getSecuritySettings` `L806:C23` (`select`),
  `setSecuritySettings` `L831:C9` (`insert`), and
  `getSecuritySettingsUpdatedAt` `L852:C23` (`select`). The test fails on a
  type-import double count, a missing or incorrectly anchored runtime import, a
  lost async-IIFE/cache/return provenance edge, or any missing/misclassified
  downstream executor. Separately, use the real lifecycle source to pin both
  zero-argument direct literal `"./client"` imports (initial loader and `next ??`
  reset fallback), transparent assertion wrappers, and recognized internal loader
  flow as zero-caller cases. Synthetic nonzero-argument, changed-specifier,
  outside-file, namespace/capability, pass-through, `.then`, and promise-wrapper
  escape cases must each fail `query_inventory_scan_invalid`.
- Test `parseExactInventoryCliArgs` with the one valid `--check --phase
  <initial|final>` grammar and reject duplicate `--check`, duplicate `--phase`,
  a duplicate phase value, missing values, `--phase=value`, positional/junk
  tokens, and unknown flags. In the initial occurrence, the accepted final form
  must return exactly `query_inventory_final_receipt_missing` before a registry
  lookup; tests pin that fixed result and prove root
  `bun run lint:repo:types` succeeds without a lexical future-registry import.
  CLI tests inject argv and never read process environment or execute a database
  action.
- Define the telemetry-selected set exactly as all current and planned
  `optimize | preserve-bounded` records. Only that set has one non-null,
  globally unique key and an association entry; every `external-handoff` record
  must have `telemetryFingerprintKey: null` and be absent from
  `TASK551_QUERY_FINGERPRINT_ASSOCIATIONS`. Assert the full selected
  `record.id -> telemetryFingerprintKey` object equals that association map in
  both directions—key-set equality alone is insufficient. Initial tests verify
  the temporary definition handoff without a lexical future-registry import and
  pin the fixed final-phase-missing result; final re-dispatch tests require the
  temporary handoff gone and compare the exact association and closed L02
  production definitions, including values, against the selected callers only.
- Simulate post-09 callers: an extra or relocated call site fails until the
  same L01 refreshes its complete reviewed record; final phase fails with any
  planned delta, stale discovered/inventory/planned/association digest, count
  mismatch, or absent final receipt. Mutating each individual canonical record
  field changes the appropriate digest and makes the stored receipt fail.
- Pin `validatedAt` as the immutable `reviewed-fixture-v<positive decimal>`
  marker. Tests must install throwing/counting guards for every receipt-reachable
  clock source (`Date`, `Date.now`, `performance`, filesystem time, and process
  time) and prove receipt construction makes no clock call. Build otherwise
  identical receipts with two distinct valid markers and prove that every
  computed identity/digest member is byte-identical while marker validation
  remains a separate exact check. Mutate `sourceTreeDigest`, `inventoryDigest`,
  `plannedDeltaDigest`, and `fingerprintAssociationDigest` one at a time in a
  stored receipt and require rejection in each case; the marker cannot mask a
  stale reviewed receipt.
- Add synthetic duplicate ID/anchor/owner, unknown field, missing-bound,
  missing-caller, duplicate fingerprint association, mismatched association
  value, and missing query-count/cache/freshness/transaction/constraint fields;
  each must fail deterministically.
- Pin handoffs for TASK-511, TASK-517, TASK-493, and TASK-518.
- Pin both planned records above. Mutating either owner, kind, bound, fingerprint,
  future symbol, or query shape fails initial inventory. The dependency record
  additionally rejects changes to tuple/root/byte caps, projection allowlist, or
  the one-statement `VALUES`/CTE shape; fixtures prove no bodies/data/password
  hashes are selected. Leaving a landed record planned, failing to discover its
  exact caller, or retaining the dependency delta without TASK-551-09-L01's
  reviewed final-removal evidence fails final inventory.
- Pin all 32 Admin planned IDs, symbols, caller metadata, owners, projection/
  filter/join/order tuples, result/query-count bounds, cache/freshness and
  transaction/constraint tuples, budget IDs, and fingerprint keys from L01's
  immutable `TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION` and strict planned
  records. Pin that the projection is the frozen canonical result of those
  validated records, not an independently authored template. Missing/extra/
  duplicate projection IDs, a statement merged into another inventory record,
  or initial counts other than exactly `34/32/2` fail. Initial L01 tests must
  not import or assert L02's later
  `TASK551_ADMIN_READ_STATEMENT_SHAPES`; L02 owns the subsequent exact static
  projection-to-template comparison. Final phase requires `0/0/0`.
- Assert no inventory, association, digest input, receipt, or error output
  matches credential/URL/token/email patterns. Feed secret-like CLI values,
  unknown keys, parser text, and malformed anchors to failure paths; assertions
  must expose only the stable code plus a fixed field role or validated canonical
  anchor, never the injected text.
- Before any dependent leaf is dispatched, pin that the complete
  `TASK551_PLANNED_BUN_TEST_PATHS` has exactly nine unique paths: its two
  L01-owned paths plus exactly one occurrence of
  `tests/perf/task551FixtureTargetBootstrap.test.ts`, exactly one occurrence of
  `tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts`,
  exactly one occurrence of
  `tests/perf/database-query-baseline.test.ts`, and exactly one occurrence of
  `tests/perf/task551DatabaseBaseline/digestContract.test.ts`, and exactly one
  occurrence of `tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts`,
  `tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts`, and
  `tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts`, with no other
  L03/L04/L02 dependent-suite membership added by this initial L01 change. The
  first four and only the first four are
  `TASK551_INITIAL_DEPENDENT_BUN_PATHS` and the exact grouped pre-classifier
  command. The shared state test accepts only legal-initial (reviewed-pair
  alone, empty Task-551 manifest slice), recovery-initial (the exact six
  reference-only dependent paths, L04 absent, empty Task-551 manifest slice,
  and DB-free inventory only), or post-finalization (all seven dependent paths
  and the exact duplicate-free nine-path Task-551 manifest slice). It pins
  `L01 initial -> L03 -> L04 -> L02` as the only transition to
  post-finalization; recovery-initial is an alternate re-entry state, never a
  shortcut around that order. Every other existence/manifest combination,
  including a premature L04 path, a runner path outside the exact recovery set,
  a nonempty pre-finalization manifest, or a missing/duplicate/unplanned
  Task-551-owned final row, fails before an injected scanner or any downstream suite, runner,
  fixture, process, evidence, or classifier callback. Neither follow-up path is
  an argument to the grouped command.
  Separately, run
  `tests/perf/database-query-inventory-capability-routes.test.ts` as the named
  DB-free L01 auxiliary gate. It exercises literal dynamic PostgreSQL, Drizzle,
  session, object-factory, typed-container, and callback-escape routes, but is
  not a fixture-builder split, planned membership, recovery-state input,
  pre-classifier argument, or manifest-barrier receipt.
  Use `runInventoryCheck`'s optional DB-free `exists`, `readManifest`, and
  `scan` dependencies as counters. The accepted initial `--phase final` grammar
  must retain its fixed failure with zero `exists`, `readManifest`, and `scan`
  calls, proving that it invokes neither state classification nor scanning.
  Illegal and post-finalization initial states must make zero `scan` calls;
  legal-initial and recovery-initial must each make exactly one `scan` call and
  invoke no dependent callback. A return-code-only assertion is insufficient.
- Treat the exact four-test pre-classifier suites as DB-free static/mock
  contracts in the shipped default Bun lane. Their tests must prove an injected mock adapter can
  cover each expected success/failure branch without a connection, preflight,
  seed, cleanup, freeze/check, or measurement; a direct or transitive generic
  database/fixture environment read, dotenv load, or client creation fails.
  This remains true when `.env` exists. L11's evidence-only isolated reruns are
  limited to the L03 bootstrap suite and exactly L02's two profile-evidence
  suites (`database-query-baseline` and `digestContract`); the L04 bootstrap
  and fourth static `fixtureTarget.test.ts` require neither an isolated
  rerun nor durable per-profile evidence and cannot become a source of test
  configuration.
  `reviewedPairPersistence.test.ts` and `runnerLifecycle.test.ts` remain
  L02-owned follow-up tests. The former is the legal-initial baseline path; the
  latter is absent only in legal-initial and may be reference-only only in the
  exact recovery-initial state. Both are required for full planned membership
  before classifier finalization, but L01 neither writes their source nor
  expands the four-test static prerequisite to execute them.
- Parse the shipped root `test:bun` command and derive its accepted roots from
  the classifier's canonical exported `LANE_DIRS`, rather than a divergent
  local copy. The current canonical set includes `tests/unit`,
  `tests/integration/routes`, `tests/integration/runtime`,
  `tests/integration/server`, `tests/integration/store`,
  `tests/integration/plugins`, `tests/integration/analytics`,
  `tests/integration/toolchain`, `tests/perf`, and `tests/security`. A path
  under `tests/integration/database`, `tests/integration/assistant`, or any
  other targeted-only directory fails. A test pins that the derived root set is
  exactly the classifier set, so a valid classifier lane cannot be rejected by
  L01 membership logic.
  Before L11's post-materialization classifier, legal-initial and
  recovery-initial both have an empty Task-551 manifest slice. Legal-initial
  has only the reviewed-pair path; recovery-initial has the exact six
  reference-only dependent paths with L04 absent and permits DB-free inventory
  only. Only after the ordered `L01 initial -> L03 -> L04 -> L02` progression,
  all seven planned dependent paths exist, and the exact four-suite prerequisite
  passes may L11 invoke the classifier, which creates the complete exact
  nine-row Task-551 manifest slice. The post-classifier guard first rejects every
  duplicate filename in the defined Task-551-owned slice before any Set
  conversion, then requires the exact sorted-array equality defined above:
  `materializedPlanned === manifestTask551Slice`. Thus a missing/duplicate
  planned row, an unplanned `task551` manifest suite, or a baseline row omitted
  because it lacks the `task551` marker fails. The previous pending-current-suite
  exception is forbidden after the gate. This is an L02-only pre-fixture gate;
  L03 and L04 can already close after their own targeted static gates.
  Final phase additionally requires every planned file to exist. The guard reads
  but never edits `package.json` or the manifest.
- In the post-materialization lane-finalization gate, test the strict command
  order: L11 first captures a positive, no-fixture
  `preClassifierStaticPrerequisite` receipt from the exact grouped four-suite
  command above. Its `database-query-baseline` result must include the L02
  bidirectional L01-projection comparison; a passed L02 static implementation
  receipt or an after-generator test run alone is insufficient. Only then may
  L11 snapshot and invoke the classifier. The classifier's command delta must
  contain only `tests/bun-lane-manifest.json`. After that mutation, the shared
  `bunLaneManifest` and L01 membership suites must prove the committed ordered
  rows equal a fresh classification (ignoring only `generatedAt`), all seven
  planned L03/L04/L02 tests are `perf` rows (with the exact four-test prerequisite
  still the only grouped static command), and the exact duplicate-free Task-551
  manifest slice equals the sorted materialized planned set. If a grouped
  four-suite command is retained after the generator, test that it is recorded
  only as `postGeneratorStaticRevalidation` and cannot meet, overwrite, or
  reorder the required first-pass receipt.
  L11 records the redacted validation receipt; a missing/negative prerequisite,
  manual manifest edit, substituted or duplicate generator invocation, wider
  command mutation, or post-generator-only static evidence fails. This family
  subgate does not reopen L03/L04 and blocks dispatch only beyond TASK-551-01 after
  L02 static materialization. Its lane-finalization receipt does not make
  `fixtureTarget.test.ts` durable L02 profile evidence.

## Security Contract

- No API route; internal tooling only.
- Auth, RBAC, CSRF, rate-limit, nonce/HMAC, and CAPTCHA contracts are unchanged.
- Strict reject-unknown schemas apply to records, nested source/caller objects,
  receipts, association maps, manifest rows, and CLI grammar. The root is the
  fixed repository `core` directory; no arbitrary traversal path, symlink,
  source text, SQL, or environment value is accepted from an HTTP or CLI input.
- Initial L01 helpers remain DB-free and environment-free: injected
  filesystem/parser adapters may read only the fixed production tree for the
  scanner; no initial helper has a lexical production DB/runtime import,
  dotenv, `process.env`, or `Bun.env`, and none creates a client or connection.
  The only final-occurrence exception is the `check.ts` final loader, added only
  after L02 lands `core/db/queryFingerprintRegistry.ts`; initial `--phase final`
  instead returns fixed `query_inventory_final_receipt_missing` without a loader
  or module specifier.
- Initial L01 may consume only its own immutable Admin planned-record projection;
  it must not import, execute, or assert the future L02 static
  `TASK551_ADMIN_READ_STATEMENT_SHAPES` template/digest registry. L02 later
  consumes the L01 projection through the owner-only exact comparison specified
  above, preserving one-way dependency and single-writer ownership.
- Store closed caller families, canonical source anchors, reviewed bounded
  metadata, SHA-256 digests, and fixed error codes only; never store or echo
  statement text, bind values, parser diagnostics, raw CLI tokens, data, URLs,
  credentials, or PII. Redaction applies before both receipts and error output.
- `validatedAt` is fixed, checked-in review metadata rather than a time source;
  no receipt path may access a clock. Its literal marker is validated separately
  while the freshly computed source-tree and semantic digests establish current
  identity.
- The exact four-test default-Bun pre-classifier prerequisite is an
  environment-independent static/mock contract: no generic or fixture
  environment read, dotenv load, database connection, preflight, seed, cleanup,
  freeze/check, or measurement. Before traversal, the state guard accepts only
  legal-initial (reviewed-pair alone), recovery-initial (the exact six
  reference-only dependent paths, L04 absent, and an empty Task-551 manifest
  slice), or post-finalization (all seven dependent paths and the exact
  nine-path slice); every other combination fails before scanner or downstream
  behavior. Recovery-initial permits DB-free inventory only. Neither follow-up
  path is added to that prerequisite. L11's separately isolated evidence reruns remain
  exactly the L03 bootstrap suite plus L02's two profile-evidence suites;
  the L04 bootstrap and `fixtureTarget.test.ts` only participate in ordinary
  lane/finalization validation and add no durable profile evidence condition.
- The direct capability-routes auxiliary gate is likewise DB-free and
  environment-free, but it is owned and executed by L01 alone rather than being
  added to the exact four-test prerequisite, nine-path planned membership, or
  L11 barrier receipt.
- The lane-finalization sequence fails closed: L11 may not snapshot or invoke
  the classifier, mutate the manifest, or create a generator receipt until all
  seven planned L03/L04/L02 files are present and the exact four-suite
  `preClassifierStaticPrerequisite` is positive and proves the L02 projection
  comparison. That receipt and any separately retained
  `postGeneratorStaticRevalidation` contain only redacted static command
  outcomes; neither may carry fixture authority, database identity, or an
  environment value, and post-generator evidence can never be used to satisfy
  the pre-classifier check.

## Validation Commands

- `bun test tests/perf/database-query-inventory.test.ts`
- `bun test tests/perf/database-query-inventory-capability-routes.test.ts`
- `bun test tests/integration/server/task551BunLaneMembership.test.ts`
- Initial dispatch: `bun scripts/task-551-query-inventory.ts --check --phase initial`
- `bun run lint:repo:types`
- Run this finite root ESLint command with no glob or implicit directory scope:

  ```sh
  bunx eslint --max-warnings=0 \
    scripts/task-551-query-inventory.ts \
    scripts/task551QueryInventory/bunLane.ts \
    scripts/task551QueryInventory/canonical.ts \
    scripts/task551QueryInventory/check.ts \
    scripts/task551QueryInventory/clientExpressions.ts \
    scripts/task551QueryInventory/clientNamespaceAssignments.ts \
    scripts/task551QueryInventory/contracts.ts \
    scripts/task551QueryInventory/dynamicCapabilityAliases.ts \
    scripts/task551QueryInventory/dynamicImportOrigins.ts \
    scripts/task551QueryInventory/dynamicImportProvenance.ts \
    scripts/task551QueryInventory/fileDiscovery.ts \
    scripts/task551QueryInventory/literalDynamicClientImports.ts \
    scripts/task551QueryInventory/gscDynamicCapabilitySafety.ts \
    scripts/task551QueryInventory/literalDynamicCapabilityFactories.ts \
    scripts/task551QueryInventory/literalDynamicCapabilityTypeFlow.ts \
    scripts/task551QueryInventory/literalDynamicCapabilityOpaqueTypeFlow.ts \
    scripts/task551QueryInventory/literalDynamicCapabilitySafety.ts \
    scripts/task551QueryInventory/literalDynamicNamespaceSafety.ts \
    scripts/task551QueryInventory/nonliteralDynamicImports.ts \
    scripts/task551QueryInventory/productionScan.ts \
    scripts/task551QueryInventory/scan.ts \
    tests/perf/fixtures/task551QueryInventory.ts \
    tests/perf/database-query-inventory.test.ts \
    tests/perf/database-query-inventory-capability-routes.test.ts \
    tests/integration/server/task551BunLaneMembership.test.ts
  ```
- Run this finite per-file line-count command with no glob, shell expansion, or
  implicit directory scope; every one of its 25 named production/test modules
  must individually report at most 1,000 physical lines (the aggregate `total`
  line is not a per-file result):

  ```sh
  wc -l \
    scripts/task-551-query-inventory.ts \
    scripts/task551QueryInventory/bunLane.ts \
    scripts/task551QueryInventory/canonical.ts \
    scripts/task551QueryInventory/check.ts \
    scripts/task551QueryInventory/clientExpressions.ts \
    scripts/task551QueryInventory/clientNamespaceAssignments.ts \
    scripts/task551QueryInventory/contracts.ts \
    scripts/task551QueryInventory/dynamicCapabilityAliases.ts \
    scripts/task551QueryInventory/dynamicImportOrigins.ts \
    scripts/task551QueryInventory/dynamicImportProvenance.ts \
    scripts/task551QueryInventory/fileDiscovery.ts \
    scripts/task551QueryInventory/literalDynamicClientImports.ts \
    scripts/task551QueryInventory/gscDynamicCapabilitySafety.ts \
    scripts/task551QueryInventory/literalDynamicCapabilityFactories.ts \
    scripts/task551QueryInventory/literalDynamicCapabilityTypeFlow.ts \
    scripts/task551QueryInventory/literalDynamicCapabilityOpaqueTypeFlow.ts \
    scripts/task551QueryInventory/literalDynamicCapabilitySafety.ts \
    scripts/task551QueryInventory/literalDynamicNamespaceSafety.ts \
    scripts/task551QueryInventory/nonliteralDynamicImports.ts \
    scripts/task551QueryInventory/productionScan.ts \
    scripts/task551QueryInventory/scan.ts \
    tests/perf/fixtures/task551QueryInventory.ts \
    tests/perf/database-query-inventory.test.ts \
    tests/perf/database-query-inventory-capability-routes.test.ts \
    tests/integration/server/task551BunLaneMembership.test.ts
  ```
- **Post-materialization lane-finalization (TASK-551-11 dispatch only), phase
  1 — pre-classifier static prerequisite:** L03 can first close after its own
  targeted static and isolated CLI gates; L04 then closes after its focused
  DB-free test. After L02 preserves its existing
  reviewed-pair test and materializes its two profile-evidence tests,
  `fixtureTarget.test.ts`, and `runnerLifecycle.test.ts`, all seven planned
  L03/L04/L02 files (including the L04 bootstrap test) must exist. Then first run and record a positive receipt
  for the exact four-path command `bun --env-file=/dev/null test tests/perf/task551FixtureTargetBootstrap.test.ts tests/perf/database-query-baseline.test.ts tests/perf/task551DatabaseBaseline/digestContract.test.ts tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts`.
  The L04 path and two L02 follow-up paths are required members but never arguments to this
  command. It includes L02's exact L01-projection comparison and is DB-free,
  target-free, and environment-free. It must pass before any generator snapshot
  or classifier invocation; no post-generator re-run can substitute for it.
- **Phase 2 — single generated-file mutation:** only after phase 1 passes, take
  the generator snapshot and dispatch exactly once from the repository root:
  `bun scripts/bun-lane-classify.ts`. Compare its pre/post mutation scope and
  allow only `tests/bun-lane-manifest.json`. No `--help`, alternate path, flags,
  manual manifest edit, later-final-inventory substitution, third leaf, or L03/L04
  reopen is allowed.
- **Phase 3 — post-generator manifest/membership validation:** after that one
  mutation, run `bun test tests/unit/toolchain/bunLaneManifest.test.ts` and
  `bun test tests/integration/server/task551BunLaneMembership.test.ts` against
  the generated manifest. If L11 retains the grouped four-suite command after
  phase 2, record it only as `postGeneratorStaticRevalidation`, distinct from
  and unable to satisfy phase 1. L11 records the redacted gate receipt. All
  three phases must finish before L02's first fixture-target `--freeze` or
  `--check`, L02 evidence/closure, or dispatch beyond TASK-551-01. This gate
  receipt is not an isolated L02 profile-evidence receipt for
  `fixtureTarget.test.ts`.
- Final post-TASK-551-09 dispatch: `bun scripts/task-551-query-inventory.ts --check --phase final`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `git diff --check`

The core-only lint/type lanes remain required for the scanned production tree,
but they do not type-check or lint L01's repository-root `scripts/**` and
`tests/**` sources. `bun run lint:repo:types` covers those root TypeScript paths
through the root `tsconfig.json`; the explicit zero-warning ESLint command
enumerates all 25 L01-owned `.ts` source/test paths, so a new or omitted file
cannot be concealed by scope. The matching explicit `wc -l` argv applies the
per-file 1,000-physical-line limit to that same closed 25-path set.

## Documentation Updates Required

No shared docs. The L02 owner must make the exact dependent static-comparison
change stated in **Required L02 Static Comparison (Dependent Owner Follow-up)**
above; L01 must not make that edit or absorb L02's registry ownership.
TASK-551-10-L01 consumes the final receipt as a read-only gate; TASK-551-10-L02
consumes its reviewed matrix summary.

## Quantified Acceptance

- Current scanner/inventory call-site-set equality is 100% in both phases;
  missing, extra, duplicate, relocated, or differently classified current
  callers fail. Final phase also has zero planned deltas and a fresh exact-set
  receipt whose discovered, record, planned, and association digests all match.
- Every record has exactly one writer and one terminal disposition; every
  current record has a generated stable ID and positive file/symbol/line/column
  anchor, and every planned record has the explicit null-anchor state.
- Final phase has exactly one fingerprint value source, zero production→test
  imports, an exact `optimize | preserve-bounded` caller-ID-to-key association
  map, and null/absent external-handoff keys.
- `CALLER_FAMILY_OPERATION_PAIRS` has exactly its documented 34 allowed tuples;
  all other 50 `CallerFamily × CallerOperation` enum combinations fail strict
  record validation.
- Initial phase has exactly 34 planned deltas and a complete 32-record L01
  Admin planned-record semantic projection. L02's later DB-free static phase
  compares that immutable projection exactly to its own 32 template/digest
  records; initial L01 never imports that future registry. Final phase has none.
- Initial `--phase final` is accepted by the strict CLI grammar but returns only
  `query_inventory_final_receipt_missing`; the initial tree contains no lexical
  registry import or loader and passes root `bun run lint:repo:types`. Only the
  final L01 re-dispatch after L02 lands the registry adds the final loader.
- `validatedAt` is a fixed reviewed-fixture marker outside the computed receipt
  identity; the current source-tree and semantic digests still match exactly,
  with no wall-clock input.
- Runtime is under 10 seconds on the repository source tree and produces zero
  secret/PII findings in its own redaction guard. The facade, every narrowly
  scoped helper, and every touched test/fixture module are each at most 1,000
  physical lines.
- Before L03, L04, or L02 starts, the planned suite set contains exactly nine
  paths: two L01-owned paths plus seven declared L03/L04/L02 paths once each,
  including the L04 bootstrap. The exact DB-free, environment-independent
  pre-classifier prerequisite is `bun --env-file=/dev/null test` over only the
  designated four paths, even with `.env` present; its command never names the
  L04 bootstrap or two L02-owned follow-up paths. The state guard accepts only
  legal-initial (reviewed-pair alone and an empty Task-551 manifest slice),
  recovery-initial (the exact six reference-only dependent paths, L04 absent,
  empty Task-551 manifest slice, and DB-free inventory only), or
  post-finalization (all seven dependent paths and the exact duplicate-free
  nine-path manifest slice). Every other partial state fails before source
  scanning or downstream suite, runner, fixture, process, evidence, or
  classifier behavior; tests include negative existence, ordering, and manifest
  coverage for each state boundary. L03 can close after its own targeted static and isolated CLI gates;
  L04 can close after its focused DB-free gate. After L02 preserves the existing
  reviewed-pair test and materializes its two profile-evidence tests,
  `fixtureTarget.test.ts`, and `runnerLifecycle.test.ts`, L11 first
  records a positive DB-free `preClassifierStaticPrerequisite` for the exact
  four suites, including L02's exact L01-projection comparison. Only then may
  it dispatch the one L01-owned post-materialization classifier; its recorded
  command delta contains only the generated manifest. The generated manifest
  then passes the shared manifest
  test and L01 membership test, and its exact Task-551-owned slice has zero
  missing, duplicate, or unplanned `task551`-marked suite paths. A retained post-generator four-suite
  revalidation is distinct and cannot satisfy that first-pass prerequisite. All
  of this finishes before L02's first fixture-target `--freeze`/`--check`, L02
  evidence/closure, or dispatch beyond TASK-551-01. The lane-finalization
  receipt adds no durable per-profile evidence condition for the L04 bootstrap or
  `fixtureTarget.test.ts`; isolated durable evidence remains L03 plus exactly
  the two L02 profile-evidence suites. This is not the later post-09 final
  inventory refresh, a third leaf, or a reason to reopen L03. Every Bun-owned
  TASK-551 test is included by the shipped default lane using the classifier's
  canonical `LANE_DIRS` (including `tests/integration/toolchain`); final receipt
  has zero missing, extra, or targeted-only test paths.
  The one named L01 capability-routes test is a separately executed direct
  auxiliary gate: it remains outside the two-path L01 lifecycle list, exact
  nine-path plan, four-test prerequisite, and L11 manifest/barrier receipts.

## Workflow Dispatch Envelope

The finite `forbiddenPaths` list captures named current ownership conflicts.
The closed `allowlist` rejects every omitted path, including the broad foreign
categories described in the file-ownership contract. TASK-551-11 owns the
separately scheduled post-materialization classifier gate, so it is not a leaf
dispatch command for either L01 graph occurrence.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-01-L01",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-01"
  },
  "allowlist": [
    "scripts/task-551-query-inventory.ts",
    "scripts/task551QueryInventory/bunLane.ts",
    "scripts/task551QueryInventory/canonical.ts",
    "scripts/task551QueryInventory/check.ts",
    "scripts/task551QueryInventory/clientExpressions.ts",
    "scripts/task551QueryInventory/clientNamespaceAssignments.ts",
    "scripts/task551QueryInventory/contracts.ts",
    "scripts/task551QueryInventory/dynamicCapabilityAliases.ts",
    "scripts/task551QueryInventory/dynamicImportOrigins.ts",
    "scripts/task551QueryInventory/dynamicImportProvenance.ts",
    "scripts/task551QueryInventory/fileDiscovery.ts",
    "scripts/task551QueryInventory/literalDynamicClientImports.ts",
    "scripts/task551QueryInventory/gscDynamicCapabilitySafety.ts",
    "scripts/task551QueryInventory/literalDynamicCapabilityFactories.ts",
    "scripts/task551QueryInventory/literalDynamicCapabilityTypeFlow.ts",
    "scripts/task551QueryInventory/literalDynamicCapabilityOpaqueTypeFlow.ts",
    "scripts/task551QueryInventory/literalDynamicCapabilitySafety.ts",
    "scripts/task551QueryInventory/literalDynamicNamespaceSafety.ts",
    "scripts/task551QueryInventory/nonliteralDynamicImports.ts",
    "scripts/task551QueryInventory/productionScan.ts",
    "scripts/task551QueryInventory/scan.ts",
    "tests/perf/fixtures/task551QueryInventory.ts",
    "tests/perf/database-query-inventory.test.ts",
    "tests/perf/database-query-inventory-capability-routes.test.ts",
    "tests/perf/database-query-inventory-final-forms.test.ts",
    "tests/integration/server/task551BunLaneMembership.test.ts",
    "tests/bun-lane-manifest.json"
  ],
  "forbiddenPaths": [
    "core/services/backups/backupArchive.ts",
    "core/services/backups/backupCrypto.ts",
    "core/services/backups/backupImport.ts",
    "core/services/backups/backupRestore.ts",
    "core/services/backups/backupService.ts",
    "core/services/backups/backupTypes.ts",
    "core/services/backups/backupUsersSection.ts",
    "core/services/backups/mediaArchive.ts",
    "core/services/content/entryService.ts",
    "core/server/publicSite.tsx",
    "core/admin/services/seoClient.ts",
    "core/server/routes/seoRoutes.ts"
  ],
  "dependencies": ["TASK-551-09-L04:final"],
  "commands": [
    {
      "id": "inventory-focused-test",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "test", "tests/perf/database-query-inventory.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/database-query-inventory.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "inventory-capability-routes-focused-test",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "test", "tests/perf/database-query-inventory-capability-routes.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/database-query-inventory-capability-routes.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "lane-membership-test",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "test", "tests/integration/server/task551BunLaneMembership.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/integration/server/task551BunLaneMembership.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "inventory-check-initial",
      "lane": "cli",
      "environmentProfile": "none",
      "argv": ["bun", "scripts/task-551-query-inventory.ts", "--check", "--phase", "initial"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "inventory-check-final",
      "lane": "cli",
      "environmentProfile": "none",
      "argv": ["bun", "scripts/task-551-query-inventory.ts", "--check", "--phase", "final"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "inventory-final-forms-disposition-test",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "test", "tests/perf/database-query-inventory-final-forms.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/database-query-inventory-final-forms.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "inventory-final-forms-eslint",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bunx", "eslint", "--max-warnings=0", "tests/perf/database-query-inventory-final-forms.test.ts"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "inventory-final-forms-line-count",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["wc", "-l", "tests/perf/database-query-inventory-final-forms.test.ts"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "root-lint-types",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "run", "lint:repo:types"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "root-eslint",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": [
        "bunx", "eslint", "--max-warnings=0",
        "scripts/task-551-query-inventory.ts",
        "scripts/task551QueryInventory/bunLane.ts",
        "scripts/task551QueryInventory/canonical.ts",
        "scripts/task551QueryInventory/check.ts",
        "scripts/task551QueryInventory/clientExpressions.ts",
        "scripts/task551QueryInventory/clientNamespaceAssignments.ts",
        "scripts/task551QueryInventory/contracts.ts",
        "scripts/task551QueryInventory/dynamicCapabilityAliases.ts",
        "scripts/task551QueryInventory/dynamicImportOrigins.ts",
        "scripts/task551QueryInventory/dynamicImportProvenance.ts",
        "scripts/task551QueryInventory/fileDiscovery.ts",
        "scripts/task551QueryInventory/literalDynamicClientImports.ts",
        "scripts/task551QueryInventory/gscDynamicCapabilitySafety.ts",
        "scripts/task551QueryInventory/literalDynamicCapabilityFactories.ts",
        "scripts/task551QueryInventory/literalDynamicCapabilityTypeFlow.ts",
        "scripts/task551QueryInventory/literalDynamicCapabilityOpaqueTypeFlow.ts",
        "scripts/task551QueryInventory/literalDynamicCapabilitySafety.ts",
        "scripts/task551QueryInventory/literalDynamicNamespaceSafety.ts",
        "scripts/task551QueryInventory/nonliteralDynamicImports.ts",
        "scripts/task551QueryInventory/productionScan.ts",
        "scripts/task551QueryInventory/scan.ts",
        "tests/perf/fixtures/task551QueryInventory.ts",
        "tests/perf/database-query-inventory.test.ts",
        "tests/perf/database-query-inventory-capability-routes.test.ts",
        "tests/integration/server/task551BunLaneMembership.test.ts"
      ],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "per-file-line-count",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": [
        "wc", "-l",
        "scripts/task-551-query-inventory.ts",
        "scripts/task551QueryInventory/bunLane.ts",
        "scripts/task551QueryInventory/canonical.ts",
        "scripts/task551QueryInventory/check.ts",
        "scripts/task551QueryInventory/clientExpressions.ts",
        "scripts/task551QueryInventory/clientNamespaceAssignments.ts",
        "scripts/task551QueryInventory/contracts.ts",
        "scripts/task551QueryInventory/dynamicCapabilityAliases.ts",
        "scripts/task551QueryInventory/dynamicImportOrigins.ts",
        "scripts/task551QueryInventory/dynamicImportProvenance.ts",
        "scripts/task551QueryInventory/fileDiscovery.ts",
        "scripts/task551QueryInventory/literalDynamicClientImports.ts",
        "scripts/task551QueryInventory/gscDynamicCapabilitySafety.ts",
        "scripts/task551QueryInventory/literalDynamicCapabilityFactories.ts",
        "scripts/task551QueryInventory/literalDynamicCapabilityTypeFlow.ts",
        "scripts/task551QueryInventory/literalDynamicCapabilityOpaqueTypeFlow.ts",
        "scripts/task551QueryInventory/literalDynamicCapabilitySafety.ts",
        "scripts/task551QueryInventory/literalDynamicNamespaceSafety.ts",
        "scripts/task551QueryInventory/nonliteralDynamicImports.ts",
        "scripts/task551QueryInventory/productionScan.ts",
        "scripts/task551QueryInventory/scan.ts",
        "tests/perf/fixtures/task551QueryInventory.ts",
        "tests/perf/database-query-inventory.test.ts",
        "tests/perf/database-query-inventory-capability-routes.test.ts",
        "tests/integration/server/task551BunLaneMembership.test.ts"
      ],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint-types",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "--cwd", "core", "lint"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "diff-check",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["git", "diff", "--check"],
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "initial",
      "dependsOn": [],
      "commandIds": [
        "inventory-focused-test",
        "inventory-capability-routes-focused-test",
        "lane-membership-test",
        "inventory-check-initial",
        "root-lint-types",
        "root-eslint",
        "core-lint-types",
        "core-lint",
        "per-file-line-count",
        "diff-check"
      ]
    },
    {
      "id": "final",
      "dependsOn": ["TASK-551-09-L04:final"],
      "commandIds": [
        "inventory-focused-test",
        "inventory-capability-routes-focused-test",
        "lane-membership-test",
        "inventory-check-final",
        "inventory-final-forms-disposition-test",
        "inventory-final-forms-eslint",
        "inventory-final-forms-line-count",
        "root-lint-types",
        "root-eslint",
        "core-lint-types",
        "core-lint",
        "per-file-line-count",
        "diff-check"
      ]
    }
  ]
}
```

---

## Contract correction (2026-09-02, L11 classifier-materialization barrier)

Discovered while executing the L11-dispatched, exactly-once `bun scripts/bun-lane-classify.ts` (the
barrier between TASK-551-01-L04 and TASK-551-01-L02): the TASK-551-owned manifest slice rule above
("an unplanned `task551`-marked row fails") was authored 2026-07-24 against a tree in which no
unplanned `task551`-marked lane test existed. Between 2026-08-26 and 2026-08-28, five lane test
files with `task551` in their filenames were materialized as contracted products of other TASK-551
steps, each pinned by literal path in its own contract:

1. `tests/integration/server/task551DatabaseLifecycle.test.ts` — TASK-551-02-L02 product
2. `tests/integration/server/task551RuntimeEntrypoints.test.ts` — TASK-551-02-L02 product
3. `tests/unit/workflows/task551AuthorAudit.test.ts` — TASK-551-11 product
4. `tests/unit/workflows/task551EvidenceContract.test.ts` — TASK-551-11 product
5. `tests/unit/workflows/task551WorkflowContracts.test.ts` — TASK-551-11 product

Renaming, moving, or replanning any of them would violate those owning contracts. The unplanned-row
rule targets unplanned strays, not these five contracted files. Effective at this barrier:

- The slice for the exact post-generation equality is every planned path plus every
  otherwise-unplanned path whose normalized filename contains `task551`, EXCEPT exactly these five
  literal paths. Any unplanned `task551`-marked row outside this closed five-path list still fails.
- `task551ManifestSlice` in `scripts/task551QueryInventory/bunLane.ts` implements exactly this
  exclusion, and the L01 membership suite pins all five paths present in the generated manifest so
  a future rename, move, or removal of any of them fails loudly.
- The L01 inventory suite's recovery-era live-filesystem pin that required the L04 bootstrap test
  path to be absent is flipped at this same barrier: all nine planned paths are now pinned present,
  matching the L04 closure receipt impl-01-l04.json; this is the same phase transition the contract
  schedules for the membership suite at :340-357.
- Everything else in this contract is unchanged: the nine-path planned set, the exact-four
  pre-classifier command, the exactly-once classifier command, and all receipts.

Evidence: `_docs/_workflows/_smoke/task-551/impl-11-classifier-gate.json` (pre-classifier
receipts, one-path mutation proof, manifest digest, membership postcheck outcomes).

## Dated Contract Corrections — 2026-09-25 (03-L02 round-2 mirror)

Source: disposition R2-11 in
`_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round2-dispositions.md`
("F-31 `deprecated-unused` assertion → dated 01-L01 FINAL correction"). This
section is append-only. It amends only the FINAL occurrence and the envelope
edits listed under E1. The INITIAL occurrence, its receipts, and every other
clause above are unchanged.

**Handed-over item (quoted from TASK-551-03-L02).** C1 (`:1946-1947`):
"**F-31.** The `deprecated-unused` inventory assertion leaves this leaf and is
handed to TASK-551-01-L01 final (C16)." C16 (`:2619-2622`): "Contract :985-986
and :1103-1104 read: "`formsService.listForms` has zero Admin route/client
callers; its assistant callers are preserved (C8)". The `deprecated-unused`
inventory assertion is removed from this leaf's tests and handed to
TASK-551-01-L01 final." The superseded 03-L02 sentence was (`:1015-1016`):
"Assert no production import/call of `formsService.listForms` remains and the
final inventory disposition is `deprecated-unused`". From this date
TASK-551-01-L01 FINAL is the sole owner of the inventory half of that
assertion. TASK-551-03-L02 keeps the caller half ("zero Admin route/client
callers; assistant callers preserved", its C8 `:2257-2260` and C16).

**Verified constraints (HEAD `9c5b6666`).**

- `deprecated-unused` is not a value of the closed `Disposition` enum. The
  record shape above (`:476`), `scripts/task551QueryInventory/contracts.ts:60`
  and `:204`, and the fixture codebook
  (`tests/perf/fixtures/task551QueryInventory.ts:106`) admit only `optimize`,
  `preserve-bounded` and `external-handoff`. A record carrying
  `deprecated-unused` fails validation with `query_inventory_invalid`. This
  correction does not add an enum member. Adding one would change the closed
  schema, codebook, validator, digests and focused tests, and would need its own
  audited correction.
- The inventory records database call sites in `core/**`, not function callers.
  `formsService.listForms` keeps its assistant callers
  (`core/services/assistant/actionExecutorService.ts:66,151`,
  `core/services/assistant/adminContextCatalogs.ts:240`), so its select
  (`core/services/forms/formsService.ts:65-67`) stays a discovered call site.
  At HEAD it is fixture row `current-593` (`tests/perf/fixtures/task551QueryInventory.ts:15183-15207`,
  `L66:C13`, drizzle-executor/select, bound 101, owner `TASK-551-03-L02`,
  disposition `optimize`). TASK-551-03-L02 no longer optimizes this function,
  so that tuple goes stale once 03-L02 lands.
- The focused suite `tests/perf/database-query-inventory.test.ts` is already
  1,889 physical lines at HEAD, above the 1,000-line limit. Adding the assertion
  there would first require a split, so it goes into a new focused suite (E1).

**F-31 assertion, restated in closed-schema terms (FINAL only).** The FINAL
receipt proves that `formsService.listForms` has left the Admin form-list read
model for good:

1. `TASK551_QUERY_INVENTORY` contains exactly one `current` record whose
   `source.file` is `core/services/forms/formsService.ts` and whose
   `source.symbol` is `listForms` (drizzle-executor/select). It is anchored at
   its landed line and column and is not deleted, because the scanner still
   discovers it.
2. That record does not carry the `admin-forms-page` or
   `admin-forms-fixed-summary` `budgetId`, does not carry the
   `admin_forms_page` or `admin_forms_fixed_summary` fingerprint key, and is not
   `disposition: "optimize"` owned by `TASK-551-03-L02`. FINAL review refreshes
   its remaining tuple (`preserve-bounded` or `external-handoff`, owner, bound,
   fingerprint nullability) from the landed source under the existing matrix
   rules (`:510-520`). The literal `deprecated-unused` never appears in the
   fixture, the receipt or the suite.
3. `PLANNED_QUERY_DELTAS` contains no `admin-forms-page` or
   `admin-forms-fixed-summary` record (the planned rows at `:685-686` are
   consumed). The landed `core/services/forms/formReadService.ts` records
   `selectFormListRows` and `selectFormListFixedSummary` are the only records
   carrying those two budget IDs and fingerprint keys.

**Owning test.** New DB-free Bun suite
`tests/perf/database-query-inventory-final-forms.test.ts` (FINAL only; imports
only the reviewed fixture exports `TASK551_QUERY_INVENTORY`,
`PLANNED_QUERY_DELTAS` and `TASK551_QUERY_INVENTORY_RECEIPT`; no scan, DB or
environment). It asserts items 1-3 with one positive test and negative
mutations: a cloned record set carrying `optimize`/`TASK-551-03-L02` on the
`listForms` row, an `admin_forms_page` key on it, a surviving planned
`admin-forms-page` row, and a `deprecated-unused` disposition (which must fail
the existing strict validator with `query_inventory_invalid`). Each mutation
must fail. The suite stays at or below 1,000 lines. It runs through its literal
envelope argv. This correction does not hand-edit `tests/bun-lane-manifest.json`,
and default-lane membership follows the family's existing classifier path.

**E1 — envelope edits (in place, this date).** `allowlist` gains
`tests/perf/database-query-inventory-final-forms.test.ts`. `commands` gains
three FINAL-only commands, all profile `none`:
`inventory-final-forms-disposition-test`
(`["bun","test","tests/perf/database-query-inventory-final-forms.test.ts"]`,
`test-paths` minimum 1), `inventory-final-forms-eslint`
(`["bunx","eslint","--max-warnings=0","tests/perf/database-query-inventory-final-forms.test.ts"]`),
and `inventory-final-forms-line-count`
(`["wc","-l","tests/perf/database-query-inventory-final-forms.test.ts"]`).
`occurrences.final.commandIds` references all three, directly after
`inventory-check-final`. The shared `root-eslint` and `per-file-line-count`
argv, the "closed 25-path set" wording (`:1394-1396`), the `initial`
occurrence, `dependencies` and `dependsOn` are unchanged. The new path is
covered only by the FINAL-only commands, because it does not exist when the
INITIAL commands run. `forbiddenPaths` is unchanged.

**Validation Commands addendum (FINAL).** After
`bun scripts/task-551-query-inventory.ts --check --phase final`:
`bun test tests/perf/database-query-inventory-final-forms.test.ts`,
`bunx eslint --max-warnings=0 tests/perf/database-query-inventory-final-forms.test.ts`,
`wc -l tests/perf/database-query-inventory-final-forms.test.ts`.

## Dated Contract Corrections — 2026-09-25 (re-open: bun-lane classifier ownership rule; append-only)

This section is append-only. It re-opens only the TASK-551 manifest-slice rule
and the code that implements it. Every other clause above stays in force,
including the 2026-09-02 correction's evidence and the 2026-09-25 03-L02 mirror.

**Defect (verified at HEAD `9c5b6666`, dirty tree).**

- `bun scripts/bun-lane-classify.ts` writes `tests/bun-lane-manifest.json`
  (`scripts/bun-lane-classify.ts:731-733`).
- `scripts/task551QueryInventory/bunLane.ts:37-46` keeps a closed five-path list
  of contracted non-planned `task551` tests. `task551ManifestSlice`
  (`:210-224`, filter `:220-221`) counts every other `task551`-named row as an
  unplanned stray. That fails `assertExactMaterializedTask551BunLaneMembership`
  (`:342-348`, `query_inventory_final_receipt_missing:task551-manifest-membership`),
  and so fails the live pin in
  `tests/integration/server/task551BunLaneMembership.test.ts:151-162` and any
  post-finalization call through `scripts/task551QueryInventory/check.ts:77-87`.
- A fresh in-process classification at this tree has 475 rows against 454
  committed, so `tests/unit/toolchain/bunLaneManifest.test.ts` is already red
  ("committed manifest equals a fresh classification run" and "manifest rows
  are internally consistent"). There are 21 new rows and none removed. Twelve
  of the new rows are `task551`-named integration tests that belong to later
  leaves:
  `tests/integration/server/task551{ActionExecutionStore,AppendHeavyRetention}.test.ts`
  (TASK-551-06-L01),
  `task551{CacheInvalidationOutboxSchema,ConcurrencyConstraints,IndexAndConstraintCatalog,OnlineIndexDeployment,SchemaMigrationParity,SearchVectorMigration}.test.ts`
  (TASK-551-05-L01), `task551SolutionKitRollbackAuthoritySchema.test.ts`
  (TASK-551-05-L03), `task551{RevisionConcurrency,RevisionRetention}.test.ts`
  (TASK-551-06-L02), and `task551RetentionJobService.test.ts` (TASK-551-06-L03).
  TASK-551-03-L02 will add `tests/integration/routes/task551BoundedAdminLists.test.ts`
  and `tests/integration/server/task551AdminWriteConcurrency.test.ts`. The
  other nine new rows are not `task551`-named and become ordinary generic rows.
- So a regeneration cannot turn green under the five-path rule, and that
  includes the regeneration at 01-L01 FINAL. The filename heuristic is a
  latent defect, not a stale count.

**Superseded sentences (quoted; superseded from this date).**

- 2026-09-02 correction (`:1764-1766`): "The slice for the exact
  post-generation equality is every planned path plus every
  otherwise-unplanned path whose normalized filename contains `task551`,
  EXCEPT exactly these five literal paths. Any unplanned `task551`-marked row
  outside this closed five-path list still fails."
- 2026-09-02 correction (`:1767-1769`): "`task551ManifestSlice` in
  `scripts/task551QueryInventory/bunLane.ts` implements exactly this exclusion,
  and the L01 membership suite pins all five paths present in the generated
  manifest so a future rename, move, or removal of any of them fails loudly."
- Post-Materialization Lane-Finalization Gate (`:366-368`), refined rather than
  removed: "Duplicate rejection and exact equality apply only to this defined
  slice: an unplanned `task551`-marked row fails, while a nonmatching generic
  row is ignored by this contract." From this date, "unplanned" means neither
  planned nor contracted under the ownership rule below.

**Unchanged sentences (quoted; still binding).**

- 03-L02 mirror (`:1859-1860`): "This correction does not hand-edit
  `tests/bun-lane-manifest.json`, and default-lane membership follows the
  family's existing classifier path." This correction does not hand-edit the
  manifest either. It changes only through the literal classifier command.
- `:922`: "The inventory CLI never regenerates that file."
- 2026-09-02 correction (`:1761-1762`): the five files stay contracted products
  of their owners. Renaming, moving, or replanning them would still violate
  those contracts. They now qualify through the ownership rule, not through a
  literal list.

**Binding rule (ownership, replaces the filename heuristic).** Take a manifest
row whose normalized filename contains `task551` (case-insensitive) and that is
not one of the nine `TASK551_PLANNED_BUN_TEST_PATHS`. That row is *contracted*
when its exact path (case-sensitive) matches at least one of these in the
TASK-551 family dispatch projection returned by `preflightTask551DispatchSnapshot`:

1. an entry of a leaf envelope's `allowlist`, or
2. a token of any command's `argv` in a leaf envelope, or
3. a `positiveDiscovery.paths` entry of kind `test-paths`.

Otherwise the row is a *stray*, and a stray still fails
`task551-manifest-membership`. The TASK-551 slice is every planned row plus every
stray. Exact duplicate-free equality with the sorted materialized planned set
is unchanged.

What the projection exposes (verified): each `dispatchOrder[]` node carries
`taskId`, `allowlist`, and `commands[]` (`argv`, `positiveDiscovery`),
built by `_docs/_workflows/lib/task-551-dispatch-contract.mjs:1002-1018`. The
preflight already rejects the same path allowlisted by two leaves
(`allowlist_cross_owner`, `:954-960`), so each contracted path has at most one
allowlist owner. At this tree the family preflight passes: 41 task files, 11
children, 29 leaves, 33 occurrences. After filtering to lane test paths the rule
yields 26 contracted paths, 17 of which are present on disk. The five paths from
2026-09-02 are all contracted: the two TASK-551-02-L02 paths through its
allowlist, and the three `tests/unit/workflows/task551*.test.ts` paths through
TASK-551-10-L02's `workflow-contract-tests` positive discovery. TASK-551-11 is
a child and has no envelope. Applied to the fresh 475-row classification, the
slice is exactly the nine planned paths, with zero strays.

**Decision: remove the five-path constant; no fallback.** The
`TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS` export and its set are deleted.
`contractedPaths` is a required input wherever a manifest slice is computed.
A missing, malformed, or failing snapshot fails closed with
`query_inventory_invalid`. The stale list is not used as a fallback, for three
reasons:

- A fallback would silently bring back exactly this defect: the twelve owned
  rows would count as strays again.
- It would keep two sources of truth that drift apart.
- It would be a fallback added only so that tests pass, which AGENTS.md forbids.

The historical five paths survive only as a test-side regression pin (below).

**Pure derivation and loader.** Both live in
`scripts/task551QueryInventory/bunLane.ts`. The module keeps no import-time
coupling to `_docs/`. The sidecar is reached through a lazy dynamic import of
the typed facade `preflightTask551AuthorAuditDispatch`
(`_docs/_workflows/task-551-author-audit.mjs`, types in
`task-551-author-audit.d.mts`). The facade returns `{ sourceHead, inventory,
taskFiles, dispatchOrder }`. Only `dispatchOrder` is consumed. The `dispatch`
key that the `.d.mts` declares is not present at runtime, so it must not be
read. Node fields beyond `taskId` are typed `unknown`, so the derivation
validates them structurally.

```ts
// scripts/task551QueryInventory/bunLane.ts
const TASK551_TASK_FILE = /^TASK-551(?:[-_].*)?\.md$/u;
// Non-evidentiary: the projection's sourceHead is never read or emitted; the
// task-file bytes of the current tree are the only input (task551AuthorAudit
// test precedent). Must satisfy the preflight's /^[0-9a-f]{7,64}$/ shape.
const CONTRACTED_PATHS_SNAPSHOT_HEAD = "0000000";

export function deriveTask551ContractedLaneTestPaths(input: {
  dispatchOrder: unknown;
  planned: readonly string[];
}): readonly string[] {
  const bad = () => fail("query_inventory_invalid", "task551-dispatch-snapshot");
  if (!Array.isArray(input.dispatchOrder) || input.dispatchOrder.length === 0) bad();
  const candidates = new Set<string>();
  for (const node of input.dispatchOrder) {
    if (!isPlainRecord(node) || typeof node.taskId !== "string" ||
        !node.taskId.startsWith("TASK-551-") || !isStringArray(node.allowlist) ||
        !Array.isArray(node.commands)) bad();
    node.allowlist.forEach((p) => candidates.add(p));
    for (const command of node.commands) {
      if (!isPlainRecord(command) || !isStringArray(command.argv) ||
          !isPlainRecord(command.positiveDiscovery)) bad();
      command.argv.forEach((token) => candidates.add(token));
      if (command.positiveDiscovery.kind === "test-paths") {
        if (!isStringArray(command.positiveDiscovery.paths)) bad();
        command.positiveDiscovery.paths.forEach((p) => candidates.add(p));
      }
    }
  }
  const planned = new Set(input.planned);
  return Object.freeze([...candidates].filter((p) =>
    TEST_FILE.test(p) && !hasDotPathSegment(p) &&
    EXECUTED_ROOTS.some((root) => p.startsWith(`${root}/`)) &&
    p.toLowerCase().includes("task551") && !planned.has(p)).sort());
}

export async function readTask551ContractedLaneTestPaths(
  planned: readonly string[]
): Promise<readonly string[]> {
  let dispatchOrder: unknown;
  try {
    const dir = path.join(ROOT, "_docs/_TASKS");
    const names = readdirSync(dir).filter((n) => TASK551_TASK_FILE.test(n)).sort();
    const taskFiles = names.map((n) => ({
      path: `_docs/_TASKS/${n}`, text: readFileSync(path.join(dir, n), "utf8") }));
    const { preflightTask551AuthorAuditDispatch } =
      await import("../../_docs/_workflows/task-551-author-audit.mjs");
    dispatchOrder = preflightTask551AuthorAuditDispatch({
      sourceHead: CONTRACTED_PATHS_SNAPSHOT_HEAD, taskFiles }).dispatchOrder;
  } catch {
    // Never echo sidecar codes, task text, or paths beyond the fixed detail.
    return fail("query_inventory_invalid", "task551-dispatch-snapshot");
  }
  return deriveTask551ContractedLaneTestPaths({ dispatchOrder, planned });
}

function task551ManifestSlice(planned, manifest, contractedPaths): readonly string[] {
  assertUniquePaths(contractedPaths, "task551-contracted-paths");
  const plannedSet = new Set(planned);
  if (contractedPaths.some((p) => plannedSet.has(p)))
    fail("query_inventory_invalid", "task551-contracted-paths");
  const contracted = new Set(contractedPaths);
  return manifest.rows.map((row) => row.file)
    .filter((file) => plannedSet.has(file) ||
      (file.toLowerCase().includes("task551") && !contracted.has(file)))
    .sort();
}
// assertTask551BunLaneMembershipState(input & { contractedPaths: readonly string[] })
//   -> passes contractedPaths to both slice calls (ownsNoRows and post-finalization).
// assertExactMaterializedTask551BunLaneMembership(input & { contractedPaths }) -> required.
// BunLaneMembershipInput gains `contractedPaths?: readonly string[]`; when
//   `manifest !== undefined && contractedPaths === undefined` ->
//   fail("query_inventory_invalid", "task551-contracted-paths"). No default.
```

```ts
// scripts/task551QueryInventory/check.ts
export type RunInventoryCheckDependencies = Readonly<{
  exists?; readManifest?; scan?;
  readContractedPaths?: (planned: readonly string[]) => Promise<readonly string[]>;
}>;
// in runInventoryCheck, AFTER parseExactInventoryCliArgs, the final-phase
// short-circuit, and assertExactTask551BunTestPlan (so the final branch still
// performs zero exists/manifest/scan/snapshot calls), BEFORE the state call:
const contractedPaths = await (dependencies.readContractedPaths ??
  readTask551ContractedLaneTestPaths)(TASK551_PLANNED_BUN_TEST_PATHS);
const state = assertTask551BunLaneMembershipState({ ...plan, manifest, exists, contractedPaths });
// :123 assertCanonicalBunLaneMembership keeps no manifest, so it needs no paths.
```

**Tests (`tests/integration/server/task551BunLaneMembership.test.ts`; there is
no separate `bunLane.ts` unit test, and this suite is the unit owner).**

- Remove the `TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS` import.
  `task551StateInput(manifest, exists, contractedPaths)` takes explicit paths.
  Synthetic cases pass `[]` where every row is planned.
- Rename "keeps the five contracted non-planned task551 lane tests outside the
  slice and strays failing" to "keeps every leaf-contracted task551 lane test
  outside the slice and strays failing".
- Live pin: `contracted = await readTask551ContractedLaneTestPaths(planned)`.
  Each of the five 2026-09-02 literal paths (kept as a test-local regression
  list) must be in `contracted` and must be exactly one manifest row. The live
  manifest must classify as `post-finalization` and must pass
  `assertExactMaterializedTask551BunLaneMembership` with `contracted`. Do not
  pin a count of the derived set, because later leaves may add owned paths.
- New synthetic case, owned is contracted: a two-node `dispatchOrder`. Node A
  allowlists `tests/integration/server/task551SyntheticOwned.test.ts`. Node B
  lists `tests/unit/workflows/task551SyntheticArgv.test.ts` only in a
  `test-paths` positive discovery. The derived set contains both. The
  materialized manifest plus both rows classifies as `post-finalization`.
- New synthetic case, owned nowhere is a stray: the same manifest plus
  `tests/perf/task551StrayProbe.test.ts` fails with
  `query_inventory_final_receipt_missing`. So does
  `tests/perf/Task551StrayProbe.test.ts` while only the lower-case path is
  allowlisted, because matching is exact.
- Fail-closed: `deriveTask551ContractedLaneTestPaths` throws
  `query_inventory_invalid` for a non-array or empty `dispatchOrder`, a node
  without `allowlist`, a non-string `argv` token, and a `test-paths` discovery
  whose `paths` is not a string array. A manifest-bearing
  `assertCanonicalBunLaneMembership` without `contractedPaths` throws
  `query_inventory_invalid`. A `contractedPaths` value that overlaps a planned
  path, or contains a duplicate, throws `query_inventory_invalid`.
- Planned paths never enter the derived set, even though L02, L03, and L04
  allowlist them. Vitest and non-lane paths are filtered out.
- Keep all existing state, bucket, duplicate, extra, and parse assertions
  unchanged. Do not weaken any of them.

`tests/perf/database-query-inventory.test.ts` is not touched. It is already
1,889 lines, and touching it would first require a split. Its `runInventoryCheck`
cases at `:1840-1889` inject `exists`, `readManifest`, and `scan` only, so they
use the default DB-free loader against the live task files. The final-phase
zero-call pin still holds because the loader runs after the final
short-circuit. The legal-initial and recovery-initial cases keep an empty
slice. The all-planned case still fails `initial-inventory-state`.

**Regeneration and `bunLaneManifest.test.ts`.** After the source and test edits
pass their targeted gates, the orchestrator runs the literal
`bun scripts/bun-lane-classify.ts` from the worktree root. It takes a pre/post
`git status --porcelain` snapshot. The only mutation this command may cause is
`tests/bun-lane-manifest.json`, a generated artifact that is exempt from the
line gate.

This run is a dated re-open regeneration. It is not a replay of, and does not
amend, the closed L11 barrier receipt `impl-11-classifier-gate.json`. The
"exactly once" wording at `:312` and `:1370` governs that barrier only.

`tests/unit/toolchain/bunLaneManifest.test.ts` pins no row count. It compares
against a fresh classification (`:235-240`) and the git golden set (`:242-245`),
so it needs no re-baseline and stays read-only, as declared in L01's
`readOnlyImports`. The golden set includes untracked files, so an unrelated
new lane test in the shared tree makes it red until the next regeneration.

**Line gate (verified `wc -l`).** Current counts, with the projected count
after this correction in parentheses:

| File | Lines now | Projected |
| --- | --- | --- |
| `bunLane.ts` | 356 | about 430 |
| `check.ts` | 127 | about 140 |
| `task551BunLaneMembership.test.ts` | 449 | about 560 |
| `bunLaneManifest.test.ts` | 304 | untouched |
| `scripts/bun-lane-classify.ts` | 744 | untouched |

No touched file exceeds 1,000 lines, so no split is part of this correction.
`tests/perf/database-query-inventory.test.ts` (1,889 lines) must stay untouched
here.

**Envelope.** No change. `bunLane.ts`, `check.ts`, the membership test and
`tests/bun-lane-manifest.json` are already in the single envelope `allowlist`,
which both occurrences share. The eslint and `wc -l` argv of `root-eslint` and
`per-file-line-count` already cover the three sources. The facade
`scripts/task-551-query-inventory.ts` needs no edit, because `export *`
re-exports the new functions and drops the deleted constant. The family
preflight passes on the tree that carries this section.

**Land order.** This correction lands on its own as soon as its post-audit is
clean. It is not sequenced behind the TASK-551-11 re-open splits or 03-L02 W0.
Its regeneration captures whatever lane files exist when its gate runs. Any
later lane-file addition makes `bunLaneManifest.test.ts` red until the next
regeneration: the TASK-551-11 re-open's new non-`task551` tests, and the two
03-L02 `task551` tests, which are already contracted through the 03-L02
allowlist and so can never become strays. The canonical regeneration is
repeated at 01-L01 FINAL with the same literal command and the same one-path
mutation proof.

**Validation (this correction).**

- `./node_modules/.bin/eslint --max-warnings=0 scripts/task551QueryInventory/bunLane.ts scripts/task551QueryInventory/check.ts tests/integration/server/task551BunLaneMembership.test.ts`
- Airtight, after regeneration:
  `env DATABASE_URL=postgresql://127.0.0.1:1/none bun --env-file=/dev/null test tests/integration/server/task551BunLaneMembership.test.ts tests/unit/toolchain/bunLaneManifest.test.ts tests/perf/database-query-inventory.test.ts`.
  All must be green.
- `wc -l` on the three touched sources, then `git diff --check` and
  `git status --short`.
- The orchestrator runs `bun run lint:repo:types` between phases.

**Receipt addendum.** The orchestrator records the addendum, not the L01
implementer (L01 "writes no workflow sidecar or receipt itself", `:338`). It
appends one entry to a new top-level `reopenAddenda` array in
`_docs/_workflows/_smoke/task-551/impl-01-l01-initial.json`, with these fields:

- `id: "2026-09-25-bun-lane-ownership-rule"`
- `headAtStart`
- `filesTouched`
- `classifierCommand`
- `mutationProof`, where the changed-path delta is exactly
  `["tests/bun-lane-manifest.json"]`
- `manifestRows` as `{ before, after }`
- `contractedPathCount`
- `task551SliceEqualsPlanned`
- `gates[]` as `{ command, exit, detail }`
- `verdict`

Existing keys stay byte-unchanged. The entry holds no environment values, DB
identities, SQL, or fixture data.

### Amendment v2 (2026-09-25): static contracted list, no L11 edge

Recorded at HEAD `9c5b6666` (dirty tree) from orchestrator decisions D1-D6,
verified against two independent audits of the v1 section above. This
amendment is append-only. It supersedes v1 wherever stated, and **V2-11**
quotes every superseded sentence. Every v1 clause that is not quoted there
stays binding, in particular: the **Defect** evidence, the three 2026-09-02 and
`:366-368` supersessions (they stay superseded; v2 does not revive the closed
five-path rule), the **Unchanged sentences** block, the one-path mutation proof
of the regeneration, the statement that the regeneration is a dated re-open and
not a replay of `impl-11-classifier-gate.json`, the no-re-baseline analysis of
`tests/unit/toolchain/bunLaneManifest.test.ts`, the untouched
`tests/perf/database-query-inventory.test.ts`, and the receipt addendum
location.

#### V2-1 Why v1 is replaced

The v1 loader made `scripts/task551QueryInventory/bunLane.ts` import the
TASK-551-11 private sidecar (`_docs/_workflows/task-551-author-audit.mjs`) at
runtime and read `_docs/_TASKS/TASK-551*.md` on every inventory check. That
adds an L01-to-L11 import edge, couples the inventory CLI to task-file text,
and widens `RunInventoryCheckDependencies` with a fourth callback. v2 removes
all three. The contracted non-planned list becomes static data owned by
01-L01, and a DB-free test binds it to the task-file fences. The binding lives
in the test, not in production code.

#### V2-2 Binding rule (static contracted list)

Take a manifest row whose normalized path contains `task551`
(case-insensitive) and that is not one of the nine
`TASK551_PLANNED_BUN_TEST_PATHS`. That row is *contracted* when its exact path
(case-sensitive) is a member of the static frozen
`TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS` (**V2-3**). Otherwise it is a
*stray*, and a stray still fails `task551-manifest-membership`. The TASK-551
slice is every planned row plus every stray. Exact duplicate-free equality with
the sorted materialized planned set is unchanged.

The list admits an entry only when a TASK-551 leaf envelope already names that
path in its `allowlist`, in a command `argv`, or in a `positiveDiscovery.paths`
entry of kind `test-paths`. **V2-5** enforces this. An entry may be declared
before its file exists; a declared-but-absent entry has no manifest row and so
never enters the slice.

**Growth rule.** When a leaf starts naming a new `task551`-path Bun-lane test,
a dated 01-L01 mirror adds that exact path to the static list in the same land
window. The mirror is the single writer of `bunLane.ts`. Until it lands, the
membership suite fails closed and names the missing path. A leaf that does not
want this coupling names its new test without the `task551` token, as the
TASK-551-11 re-open does.

**Placement: `bunLane.ts`, not a new module.** D1 proposed a new data module,
`scripts/task551QueryInventory/contractedLaneTests.ts`. This amendment keeps
the frozen list in `bunLane.ts` instead, where the historical five-path
constant already lives (`:37-46`). A new L01 source file would break D1's own
"no new edges" invariant, for three reasons (verified):

- The L01 phase provenance in
  `_docs/_workflows/lib/task-551-worktree-compatibility.mjs:121-155`
  (`ownedFiles`, `ownedTests`, `readOnlyImports`) is a closed literal list.
  `TASK551_L01_BARRIER_INPUT_PATHS` (`:289-316`) is checked by `exactSorted`
  against that projection (`:435-440`). An unlisted module would sit outside
  the L11 barrier digest, which is a coverage gap. Listing it would need a
  TASK-551-11 edit, which is an L11 edge.
- The 01-L01 envelope `allowlist` and the `root-eslint` and
  `per-file-line-count` argv in the ` ```json ` fence (`:1482`) would each need
  an in-place fence edit.
- The TASK-551-11 all-phase `ownedFiles + ownedTests` pins (TASK-551-11
  **V3-3**, `l01 22 + 3 = 25`) would shift.

Keeping the list in `bunLane.ts` needs no new file, no envelope change, no
provenance or barrier change, and no TASK-551-11 edit.

#### V2-3 The static list (exact; 26 entries; sorted by UTF-16 code unit)

| # | Path | Contracted via (owner) | On disk at `9c5b6666` |
| --- | --- | --- | --- |
| 1 | `tests/integration/routes/task551BoundedAdminLists.test.ts` | allowlist (TASK-551-03-L02) | no |
| 2 | `tests/integration/runtime/task551ServerCacheFaultMatrix.test.ts` | allowlist (TASK-551-10-L01) | no |
| 3 | `tests/integration/runtime/task551TwoProcessRedisSmoke.test.ts` | allowlist (TASK-551-10-L01) | no |
| 4 | `tests/integration/server/task551ActionExecutionStore.test.ts` | allowlist (TASK-551-06-L01) | yes |
| 5 | `tests/integration/server/task551AdminWriteConcurrency.test.ts` | allowlist (TASK-551-03-L02) | no |
| 6 | `tests/integration/server/task551AppendHeavyRetention.test.ts` | allowlist (TASK-551-06-L01) | yes |
| 7 | `tests/integration/server/task551AssistantDocsCandidateQuery.test.ts` | allowlist (TASK-551-04-L02) | no |
| 8 | `tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts` | allowlist (TASK-551-05-L01) | yes |
| 9 | `tests/integration/server/task551ConcurrencyConstraints.test.ts` | allowlist (TASK-551-05-L01) | yes |
| 10 | `tests/integration/server/task551DatabaseLifecycle.test.ts` | allowlist (TASK-551-02-L02); historical five | yes |
| 11 | `tests/integration/server/task551DatabaseLifecycleRealDb.test.ts` | allowlist (TASK-551-02-L02) | no |
| 12 | `tests/integration/server/task551IndexAndConstraintCatalog.test.ts` | allowlist (TASK-551-05-L01) | yes |
| 13 | `tests/integration/server/task551OnlineIndexDeployment.test.ts` | allowlist (TASK-551-05-L01) | yes |
| 14 | `tests/integration/server/task551RetentionJobService.test.ts` | allowlist (TASK-551-06-L03) | yes |
| 15 | `tests/integration/server/task551RevisionConcurrency.test.ts` | allowlist (TASK-551-06-L02) | yes |
| 16 | `tests/integration/server/task551RevisionRetention.test.ts` | allowlist (TASK-551-06-L02) | yes |
| 17 | `tests/integration/server/task551RuntimeEntrypoints.test.ts` | allowlist (TASK-551-02-L02); historical five | yes |
| 18 | `tests/integration/server/task551SchemaMigrationParity.test.ts` | allowlist (TASK-551-05-L01) | yes |
| 19 | `tests/integration/server/task551SearchRankedQueries.test.ts` | allowlist (TASK-551-04-L01) | no |
| 20 | `tests/integration/server/task551SearchVectorMigration.test.ts` | allowlist (TASK-551-05-L01); argv (TASK-551-04-L01) | yes |
| 21 | `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` | allowlist (TASK-551-05-L03) | yes |
| 22 | `tests/perf/task551DatabaseCachePerformanceGate.test.ts` | allowlist (TASK-551-10-L01) | no |
| 23 | `tests/security/task551ServerCacheSecurityGate.test.ts` | allowlist (TASK-551-10-L01) | no |
| 24 | `tests/unit/workflows/task551AuthorAudit.test.ts` | argv + test-paths (TASK-551-10-L02); historical five | yes |
| 25 | `tests/unit/workflows/task551EvidenceContract.test.ts` | argv + test-paths (TASK-551-10-L02); historical five | yes |
| 26 | `tests/unit/workflows/task551WorkflowContracts.test.ts` | argv + test-paths (TASK-551-10-L02); historical five | yes |

The list has 17 entries on disk: the historical five plus the twelve v1
**Defect** rows. It has 9 declared-but-absent entries: the two TASK-551-03-L02
suites, plus seven more that are already named in leaf allowlists:
`task551DatabaseLifecycleRealDb` (02-L02), `task551SearchRankedQueries`
(04-L01), `task551AssistantDocsCandidateQuery` (04-L02), and four TASK-551-10-L01
suites (`task551ServerCacheFaultMatrix`, `task551TwoProcessRedisSmoke`,
`task551DatabaseCachePerformanceGate`, `task551ServerCacheSecurityGate`). The
seven must be listed now. Without them the fence-binding assertion in **V2-5**
would fail on the current tree. The five TASK-551-03-L02 Vitest paths
(`tests/vitest/**`) are outside the Bun lane roots
(`scripts/bun-lane-classify.ts:62-73`), so they never enter the list. This
equals the v1 derivation result ("26 contracted paths, 17 of which are present
on disk"). Applied to the fresh 475-row classification, the slice is still
exactly the nine planned paths, with zero strays.

#### V2-4 Source change (`scripts/task551QueryInventory/bunLane.ts` only)

```ts
// scripts/task551QueryInventory/bunLane.ts — replaces :30-46; no new import.
/**
 * Amendment v2 (2026-09-25): the static contracted non-planned TASK-551
 * Bun-lane test list. Each entry is named by a TASK-551 leaf envelope
 * (allowlist, argv, or test-paths discovery) and may be declared before its
 * file exists. task551BunLaneMembership.test.ts binds this list to the
 * task-file fences; only a dated TASK-551-01-L01 mirror may change it.
 */
export const TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS: readonly string[] = Object.freeze([
  "tests/integration/routes/task551BoundedAdminLists.test.ts",
  // ... the 26 V2-3 paths, byte-exact and in V2-3 order ...
  "tests/unit/workflows/task551WorkflowContracts.test.ts",
]);
const TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATH_SET: ReadonlySet<string> = new Set(
  TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS
);
```

The following stay byte-unchanged (verified):

- `task551ManifestSlice` (`bunLane.ts:210-224`) keeps its current two-argument
  shape and its filter at `:220-221`. It reads the widened set.
- `BunLaneMembershipInput` (`:15-20`), `assertTask551BunLaneMembershipState`,
  and `assertExactMaterializedTask551BunLaneMembership` (`:330-356`) keep their
  signatures. No `contractedPaths` parameter is added.
- `scripts/task551QueryInventory/check.ts` is unchanged, including `:40`.
  `RunInventoryCheckDependencies` stays the three-function shape. The prose at
  this file's `:788-791` ("`runInventoryCheck` accepts an optional DB-free
  dependency input with only `exists`, `readManifest`, and `scan` functions")
  and the type block at `:801-805` stay binding verbatim.
- `bunLane.ts` gains no `_docs/` import, no dynamic import, no filesystem read
  of task files, and no fallback.

The facade `scripts/task-551-query-inventory.ts` needs no edit. Its
`export * from "./task551QueryInventory/bunLane"` keeps re-exporting the
constant under the same name, so the membership test's import at `:17` stays
valid.

The L11 barrier input set
(`task-551-worktree-compatibility.mjs:289-316`), the L01 phase provenance, and
the L01 import closure are unchanged. v2 adds no edges.

#### V2-5 Tests (`tests/integration/server/task551BunLaneMembership.test.ts`)

The membership suite is 449 lines now and projected at about 690 after v2, so
no new test file is needed (the D2 fallback of a separate test of at most 400
lines is not triggered). The suite stays DB-free. It imports no
`_docs/_workflows` module. It reads the `TASK-551*.md` task files with a
minimal in-test parser:

```ts
// additions; existing imports and helpers stay
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const TASK551_TASK_FILE = /^TASK-551(?:[-_].*)?\.md$/u;
const FIRST_JSON_FENCE = /^```json\n([\s\S]*?)\n```$/mu;
const LANE_TEST_FILE = /^tests\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.test\.(?:ts|tsx)$/u;
const HISTORICAL_CONTRACTED_PATHS: readonly string[] = Object.freeze([
  "tests/integration/server/task551DatabaseLifecycle.test.ts",
  "tests/integration/server/task551RuntimeEntrypoints.test.ts",
  "tests/unit/workflows/task551AuthorAudit.test.ts",
  "tests/unit/workflows/task551EvidenceContract.test.ts",
  "tests/unit/workflows/task551WorkflowContracts.test.ts",
]);
// Static entries that a dated 01-L01 mirror declared before the owning leaf's
// envelope names them. Must be empty at every 01-L01 closure; empty today.
const DECLARED_NOT_YET_ALLOWLISTED: readonly string[] = Object.freeze([]);

type FenceRecord = Readonly<Record<string, unknown>>;
type StaticListBindingInput = Readonly<{
  derived: readonly string[];
  staticList: readonly string[];
  allowance: readonly string[];
}>;

function isFenceRecord(value: unknown): value is FenceRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fenceArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`task551_fence_shape:${label}`);
  const items: readonly unknown[] = value;
  return items;
}

function fenceStrings(value: unknown, label: string): readonly string[] {
  const strings: string[] = [];
  for (const item of fenceArray(value, label)) {
    if (typeof item !== "string") throw new Error(`task551_fence_shape:${label}`);
    strings.push(item);
  }
  return strings;
}

/** First ```json fence only; top-level allowlist, commands[].argv, test-paths. */
function collectFenceLaneTestPaths(markdown: string, source: string): readonly string[] {
  const match = FIRST_JSON_FENCE.exec(markdown);
  if (match === null) return [];
  const parsed: unknown = JSON.parse(match[1] ?? "");
  if (!isFenceRecord(parsed)) throw new Error(`task551_fence_shape:${source}`);
  const tokens: string[] = [];
  if (parsed.allowlist !== undefined)
    tokens.push(...fenceStrings(parsed.allowlist, `${source}:allowlist`));
  const commands: readonly unknown[] =
    parsed.commands === undefined ? [] : fenceArray(parsed.commands, `${source}:commands`);
  for (const command of commands) {
    if (!isFenceRecord(command)) throw new Error(`task551_fence_shape:${source}:command`);
    tokens.push(...fenceStrings(command.argv, `${source}:argv`));
    const discovery: unknown = command.positiveDiscovery;
    if (isFenceRecord(discovery) && discovery.kind === "test-paths")
      tokens.push(...fenceStrings(discovery.paths, `${source}:discovery`));
  }
  return tokens.filter((token) => LANE_TEST_FILE.test(token));
}

function readFamilyFenceLaneTestPaths(): readonly string[] {
  const dir = path.join(REPO_ROOT, "_docs/_TASKS");
  const union = new Set<string>();
  const names = readdirSync(dir).filter((name) => TASK551_TASK_FILE.test(name)).sort();
  for (const name of names)
    for (const testPath of collectFenceLaneTestPaths(readFileSync(path.join(dir, name), "utf8"), name))
      union.add(testPath);
  return [...union].sort();
}

function contractedFromFencePaths(
  fencePaths: readonly string[],
  planned: readonly string[],
  laneRoots: readonly string[]
): readonly string[] {
  const plannedSet = new Set(planned);
  return fencePaths
    .filter(
      (testPath) =>
        testPath.toLowerCase().includes("task551") &&
        !plannedSet.has(testPath) &&
        laneRoots.some((root) => testPath.startsWith(`${root}/`))
    )
    .sort();
}

function staticListBindingErrors(input: StaticListBindingInput): readonly string[] {
  const staticSet = new Set(input.staticList);
  const derivedSet = new Set(input.derived);
  const allowanceSet = new Set(input.allowance);
  return [
    ...input.derived.filter((p) => !staticSet.has(p)).map((p) => `missing-from-static:${p}`),
    ...input.staticList
      .filter((p) => !derivedSet.has(p) && !allowanceSet.has(p))
      .map((p) => `undeclared-static:${p}`),
    ...input.allowance
      .filter((p) => !staticSet.has(p) || derivedSet.has(p))
      .map((p) => `stale-allowance:${p}`),
  ];
}

function laneTestFilesOnDisk(laneRoots: readonly string[]): readonly string[] {
  const files: string[] = [];
  for (const root of laneRoots)
    for (const entry of readdirSync(path.join(REPO_ROOT, root), { recursive: true, encoding: "utf8" })) {
      const file = `${root}/${entry.split(path.sep).join("/")}`;
      if (LANE_TEST_FILE.test(file)) files.push(file);
    }
  return files.sort();
}

function unownedTask551LaneFiles(
  files: readonly string[],
  planned: readonly string[],
  staticList: readonly string[]
): readonly string[] {
  const owned = new Set([...planned, ...staticList]);
  return files.filter((file) => file.toLowerCase().includes("task551") && !owned.has(file)).sort();
}
```

`laneRoots` is always `canonicalBunLaneRootsFromClassifier()`, which the suite
already imports, and `planned` is always `TASK551_PLANNED_BUN_TEST_PATHS`.
Failures are fail-closed and name the paths: each case asserts
`expect(errors).toEqual([])`, so the diff shows each offending path.

**Cases (added):**

1. "binds the static contracted list to every TASK-551 task-file fence" (live).
   Set `derived = contractedFromFencePaths(readFamilyFenceLaneTestPaths(), …)`.
   `derived` is non-empty, the historical five are all in `derived` (the fence
   read is not vacuous),
   `staticListBindingErrors({ derived, staticList: TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS, allowance: DECLARED_NOT_YET_ALLOWLISTED })`
   equals `[]`, and `DECLARED_NOT_YET_ALLOWLISTED` equals `[]`.
2. "keeps the static contracted list sorted, unique, frozen, lane-rooted,
   task551-named and disjoint from the plan". The historical five are members.
   Do not pin a count.
3. Allowlist branch: a synthetic fence whose only path is
   `tests/integration/server/task551SyntheticAllow.test.ts` in `allowlist`,
   with `commands: []`, yields exactly that path.
4. argv-only branch: `allowlist: []` and one command
   `{ argv: ["bun", "test", "tests/unit/workflows/task551SyntheticArgv.test.ts"], positiveDiscovery: { kind: "not-applicable" } }`
   yields exactly that path.
5. Discovery branch: `allowlist: []` and one command with
   `argv: ["bun", "run", "gate"]` and
   `positiveDiscovery: { kind: "test-paths", paths: ["tests/perf/task551SyntheticDiscovery.test.ts"] }`
   yields exactly that path. The same `paths` under any other `kind` yields
   `[]`, which isolates the kind guard.
6. Parser shape: a markdown file without a fence yields `[]`. A fence without
   `allowlist` or `commands` (the family graph shape) yields `[]`. Each of the
   following throws `task551_fence_shape`: a non-object fence, a non-string
   `allowlist` item, a non-array `commands`, a command without `argv`, and a
   `test-paths` discovery whose `paths` is not a string array. Invalid JSON
   throws. Non-lane (`tests/vitest/...`) and planned paths never reach
   `contractedFromFencePaths` output.
7. Absent-entry allowance branch. A static entry that is not in `derived`
   yields `undeclared-static:<path>`. With that path in `allowance`, the
   result is `[]`. An allowance entry that is also derived, or that is not
   static, yields `stale-allowance:<path>`. A derived path that is missing from
   the static list yields `missing-from-static:<path>`.
8. "every task551-path lane file on disk is planned or statically contracted"
   (live): `unownedTask551LaneFiles(laneTestFilesOnDisk(roots), planned, static)`
   equals `[]`. The synthetic stray `tests/perf/task551StrayProbe.test.ts` is
   reported. So is the case-variant
   `tests/integration/server/Task551DatabaseLifecycle.test.ts`, because
   matching is exact.

**Case renamed (D5).** "keeps the five contracted non-planned task551 lane
tests outside the slice and strays failing" becomes "keeps the static
contracted task551 lane-test list outside the slice and strays failing".

- The historical five are members of the static list, and each is exactly one
  live manifest row. This is the original pin, kept.
- Every static entry has exactly one live manifest row when its file exists
  on disk and none when it does not.
- The present rows plus the materialized manifest classify as
  `post-finalization`.
- A synthetic manifest that materializes all 26 entries also classifies as
  `post-finalization`. This proves that declared-but-absent entries are
  accepted once they land.
- The existing stray and case-variant stray assertions
  (`tests/perf/task551StrayProbe.test.ts` and
  `tests/perf/Task551StrayProbe.test.ts` fail with
  `query_inventory_final_receipt_missing`) stay byte-unchanged.

**Unchanged (D5).**

- `task551StateInput(manifest, exists)` keeps two parameters.
- Every direct call of `assertExactMaterializedTask551BunLaneMembership`
  (`:159`, `:344-418`) keeps its `{ planned, manifest, exists? }` argument, so
  those assertions stay byte-unchanged.
- The live pin (`:137-163`), and every state, bucket, duplicate, extra, and
  parse assertion, is kept and not weakened.
- `tests/perf/database-query-inventory.test.ts` stays untouched. Its
  `runInventoryCheck` cases inject only `exists`, `readManifest`, and `scan`,
  which remains the complete dependency shape.

#### V2-6 Regeneration precondition (D3)

This extends v1's **Regeneration** paragraph. `bun scripts/bun-lane-classify.ts`
may write `tests/bun-lane-manifest.json` only after every to-be-added suite has
passed through the real lane runner. The to-be-added set is recomputed at gate
time as the fresh in-process classification rows minus the committed rows. At
`9c5b6666` it is the 21 v1 **Defect** rows:

- the twelve `task551` rows, and
- the nine generic rows `tests/integration/runtime/retentionScheduler.test.ts`,
  `tests/perf/database-explain-plans.test.ts`,
  `tests/perf/database-index-write-overhead.test.ts`,
  `tests/perf/database-partition-readiness.test.ts`,
  `tests/perf/database-pool-telemetry.test.ts`,
  `tests/perf/database-retention-batches.test.ts`,
  `tests/perf/database-retention-jobs.test.ts`,
  `tests/perf/database-revision-budgets.test.ts`, and
  `tests/perf/task489-solution-kit-run-predecessor-plans.test.ts`.

Steps (orchestrator; none of them writes a tracked path):

1. **Scratch manifest.** Classify exactly the to-be-added rows in process,
   using the exported `classify` (`scripts/bun-lane-classify.ts:694`, `:744`).
   Write them as a v2 manifest to
   `.tmp/task551-reopen-v2/precondition-manifest.json`. The `.tmp` directory
   is gitignored (`.gitignore:18`). Never use `/tmp`, and never use `tests/`.
2. **Owner-map run (DB).**
   `BUN_LANE_MANIFEST_PATH=.tmp/task551-reopen-v2/precondition-manifest.json bun scripts/run-bun-parallel.ts --lane all --report .tmp/task551-reopen-v2/precondition-report.json`,
   with `--workers`/`--pool` inside the runner's `workers x pool <= 10`
   budget. It runs in the closed owner-map environment on `DATABASE_URL3`:
   the URL as `DATABASE_URL` and `DATABASE_DIRECT_URL`, the owning leaves'
   `TASK551_FIXTURE_*` keys, and `DB_LOCK_TIMEOUT_MS=15000`. Record one of
   pass, skip, or fail for each suite. When a worker holding several files
   fails, re-run each of its files once by name to attribute the failure. The
   tracked `tests/bun-lane-timings.json` is read-only here.
3. **Map-free run (DB-free).**
   `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test <the to-be-added files>`.
   Each suite either passes, or its DB-gated tests skip cleanly. A connection
   error, hang, or failure means the suite lacks a DB gate.
4. **Blocking.** Any owner-map fail, or any map-free failure, is a hand-off to
   the leaf that allowlists that suite (**V2-3** owner column; for the generic
   rows, the leaf whose envelope names the path). That leaf adds the DB gate or
   the fix. Regeneration is blocked until the hand-off lands and steps 2 and 3
   are green for that suite.

**`task551OnlineIndexDeployment.test.ts` gating verdict (verified at
`9c5b6666`).** The suite really has no DB or skip gating. It never reads
`DATABASE_URL`. Its one `testIfDb` hit (`:363`) counts gates in a different
file. It needs none, because it is DB-free by construction. Its header
(`:68-69`) states that no test opens a connection, and its only `postgres(...)`
handle (`:832`) targets `postgresql://127.0.0.1:1/none`, is never connected,
and is ended at once. The map-free run at this tree gives 49 pass, 0 fail. So
there is no DB-gate hand-off to TASK-551-05-L01, and it does not block
regeneration. The suite must *pass*, not skip, in both steps 2 and 3.

Separate observation, handed off to the owners and not blocking 01-L01: the
file is 3,513 lines and `task551SolutionKitRollbackAuthoritySchema.test.ts` is
2,182 lines. Both exceed the 1,000-line gate. Those splits belong to
TASK-551-05-L01 and TASK-551-05-L03.

#### V2-7 Cross-file effects (D4; hand-offs, append-only, owners write)

- **TASK-551-11 V3-2 (`TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md:1088`)
  becomes stale rationale.** It says: "`scripts/task551QueryInventory/bunLane.ts:37-43`
  closes the non-planned `task551` lane-test list to five paths, and
  `:220-221` (`task551ManifestSlice`) treats any other manifest row whose path
  contains `task551` as an unplanned stray." It also says: "The three monolith
  names are kept, so the closed five-path list and its TASK-551-01-L01 mirror
  (`TASK-551-01-L01…md:1758-1759`) stay valid." Hand-off: the TASK-551-11
  owner appends a dated note citing this amendment. The naming rule "Every NEW
  test file carries no `task551` token" stays binding and harmless. Such files
  are ordinary generic rows, never slice members, and need no static-list
  entry. No TASK-551-11 source, test, provenance, or barrier list changes.
- **TASK-551-10-L02
  (`TASK-551-10-L02-Documentation-Runbooks-And-Family-Closure.md:1702-1706`)
  becomes stale rationale.** It says: "The three original names stay, because
  `scripts/task551QueryInventory/bunLane.ts:37-43` pins them in the closed
  five-path `TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS` list. `:218-221`
  treats any other `task551`-named test as an unplanned stray." Hand-off: the
  TASK-551-10-L02 closure writer appends a dated note. The three names remain
  contracted as static entries 24-26.
- **Every leaf that names a new `task551`-path Bun-lane test** falls under the
  **V2-2** growth rule.

#### V2-8 Line gate (verified `wc -l`; projected)

| File | Lines now | Projected |
| --- | --- | --- |
| `scripts/task551QueryInventory/bunLane.ts` | 356 | about 380 |
| `tests/integration/server/task551BunLaneMembership.test.ts` | 449 | about 690 |
| `scripts/task551QueryInventory/check.ts` | 127 | untouched |
| `tests/unit/toolchain/bunLaneManifest.test.ts` | 304 | untouched |
| `scripts/bun-lane-classify.ts` | 744 | untouched |
| `tests/perf/database-query-inventory.test.ts` | 1,889 | untouched |

No new data module exists (**V2-2** placement). No touched file exceeds
1,000 lines, and no split is part of v2.

#### V2-9 Envelope

No change. `bunLane.ts`, the membership test, and
`tests/bun-lane-manifest.json` are already in the single envelope `allowlist`.
The `root-eslint` and `per-file-line-count` argv already cover `bunLane.ts`.
The family preflight passes on the tree that carries this amendment, because
no fence byte changes.

#### V2-10 Land order, validation, receipt (D6)

**Land order.** v2 lands on its own once its post-audit is clean. It does not
depend on the TASK-551-11 re-open or on 03-L02 W0. The order is:

1. source and test edits,
2. their fast gates,
3. the **V2-6** precondition,
4. the literal classifier command with v1's one-path mutation proof,
5. the airtight gates.

The regeneration is repeated at 01-L01 FINAL with the same precondition, the
same literal command, and the same one-path proof. Later lane-file additions
make `bunLaneManifest.test.ts` red until the next regeneration. A new
`task551`-path addition also makes membership cases 1 and 8 red until its
**V2-2** mirror lands.

**Validation.**

- `./node_modules/.bin/eslint --max-warnings=0 scripts/task551QueryInventory/bunLane.ts tests/integration/server/task551BunLaneMembership.test.ts`
- Before regeneration: the airtight run of the membership suite has
  **V2-5** cases 1-8 green. Only the live-manifest assertions may be red: the
  live pin, the renamed case's live half, and the two
  `bunLaneManifest.test.ts` cases named in v1.
- Airtight, after regeneration, all green:
  `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/server/task551BunLaneMembership.test.ts tests/unit/toolchain/bunLaneManifest.test.ts tests/perf/database-query-inventory.test.ts tests/perf/database-query-inventory-capability-routes.test.ts`
- `wc -l scripts/task551QueryInventory/bunLane.ts tests/integration/server/task551BunLaneMembership.test.ts`,
  then `git diff --check` and `git status --short`.
- The orchestrator runs `bun run lint:repo:types` between phases.

**Receipt addendum.** The location and the v1 fields are unchanged: one entry
in `reopenAddenda` of `_docs/_workflows/_smoke/task-551/impl-01-l01-initial.json`,
written by the orchestrator.

- `filesTouched` lists `bunLane.ts`, the membership test, and
  `tests/bun-lane-manifest.json`. It does not list `check.ts`.
- `contractedPathCount` is the static list length (26 at `9c5b6666`).
- The entry adds `preRegenerationLaneRun` as `[{ path, ownerMap, mapFree }]`,
  where each value is `"pass" | "skip" | "fail"`.
- The entry adds `handoffs[]` as `{ taskId, reason }` for **V2-6** and
  **V2-7**.

The entry holds no environment values, DB identities, SQL, or fixture data.

#### V2-11 Superseded v1 sentences (quoted; superseded from this date)

- **Binding rule** (`:1952-1958`): "That row is *contracted* when its exact
  path (case-sensitive) matches at least one of these in the TASK-551 family
  dispatch projection returned by `preflightTask551DispatchSnapshot`: 1. an
  entry of a leaf envelope's `allowlist`, or 2. a token of any command's `argv`
  in a leaf envelope, or 3. a `positiveDiscovery.paths` entry of kind
  `test-paths`." Replaced by: membership in the static list (**V2-2**). The
  three sources now bind the list in the test (**V2-5**), not at runtime.
- **Decision** (`:1979-1983`): "The
  `TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS` export and its set are
  deleted. `contractedPaths` is a required input wherever a manifest slice is
  computed. A missing, malformed, or failing snapshot fails closed with
  `query_inventory_invalid`." Replaced by: the export and its set stay, widened
  to the 26 **V2-3** paths, and no slice function takes a `contractedPaths`
  input.
- `:1988`: "It would keep two sources of truth that drift apart." Superseded
  as a reason. The list is bound to the fences by **V2-5** cases 1 and 8, so
  drift fails closed. The other two v1 reasons still hold, and v2 adds no
  fallback.
- `:1991`: "The historical five paths survive only as a test-side regression
  pin (below)." Replaced by: they are static entries 10, 17, and 24-26, and
  they are also pinned test-side.
- **Pure derivation and loader** (`:1993-1994`): "Both live in
  `scripts/task551QueryInventory/bunLane.ts`." This covers the whole paragraph
  and both ` ```ts ` blocks after it (`deriveTask551ContractedLaneTestPaths`,
  `readTask551ContractedLaneTestPaths`, `CONTRACTED_PATHS_SNAPSHOT_HEAD`, the
  three-argument `task551ManifestSlice`, the `contractedPaths` input rules,
  the `readContractedPaths?` field, and the `check.ts` loader call). None of
  them is implemented.
- **Tests** (`:2098-2100`): "Remove the
  `TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS` import.
  `task551StateInput(manifest, exists, contractedPaths)` takes explicit paths.
  Synthetic cases pass `[]` where every row is planned." Replaced by the
  **V2-5** Unchanged list.
- **Tests** (`:2101-2103`): the rename target "keeps every leaf-contracted
  task551 lane test outside the slice and strays failing". Replaced by the
  **V2-5** rename.
- **Tests** (`:2104-2109`): "Live pin: `contracted = await
  readTask551ContractedLaneTestPaths(planned)`." and "must pass
  `assertExactMaterializedTask551BunLaneMembership` with `contracted`."
  Replaced by the unchanged live pin and **V2-5** case 1.
- **Tests** (`:2110-2126`): the "owned is contracted" two-node
  `dispatchOrder` case and the "Fail-closed:
  `deriveTask551ContractedLaneTestPaths` throws …" bullet, including "A
  manifest-bearing `assertCanonicalBunLaneMembership` without
  `contractedPaths` throws `query_inventory_invalid`." Replaced by **V2-5**
  cases 3-7. The "owned nowhere is a stray" bullet survives in substance
  through the unchanged stray assertions and case 8.
- **Line gate** (`:2162-2164`): "| `bunLane.ts` | 356 | about 430 |",
  "| `check.ts` | 127 | about 140 |", and
  "| `task551BunLaneMembership.test.ts` | 449 | about 560 |". Replaced by
  **V2-8**.
- **Envelope** (`:2172-2178`): "`bunLane.ts`, `check.ts`, the membership test
  and `tests/bun-lane-manifest.json` are already in the single envelope
  `allowlist`" (the conclusion stands, but `check.ts` is no longer touched),
  and "The facade `scripts/task-551-query-inventory.ts` needs no edit, because
  `export *` re-exports the new functions and drops the deleted constant."
  Replaced by: no new functions; the constant stays re-exported (**V2-4**).
- **Land order** (`:2184-2186`): "and the two 03-L02 `task551` tests, which
  are already contracted through the 03-L02 allowlist and so can never become
  strays." Replaced by: they are contracted as static entries 1 and 5.
- **Regeneration** (`:2140-2142`): "After the source and test edits pass their
  targeted gates, the orchestrator runs the literal
  `bun scripts/bun-lane-classify.ts` from the worktree root." Refined, not
  removed: the **V2-6** precondition now runs in between.
- **Validation** (`:2192`): the eslint argv with
  `scripts/task551QueryInventory/check.ts`. Replaced by **V2-10**, which drops
  `check.ts` and adds `tests/perf/database-query-inventory-capability-routes.test.ts`
  to the airtight run.

### Amendment v3 (2026-09-25): static-list growth and gated regeneration

Recorded at HEAD `9c5b6666` (dirty tree) from the v2 audit findings H, M1, and
M2, verified against the current task fences and test sources. This amendment
is append-only. It supersedes v2 only where stated, and **V3-6** quotes every
superseded v2 sentence with its current line. Every v2 clause that is not
quoted there stays binding. No ` ```json ` fence byte changes (**V3-5**).

#### V3-1 Static list grows to 27 entries (finding H)

TASK-551-02-L02 Re-open amendment R6 (2026-09-25) adds
`tests/integration/server/task551DedicatedSessionGuards.test.ts` to its
envelope (`TASK-551-02-L02-Pool-Lifecycle-Timeouts-And-Sanitized-Query-Telemetry.md`
R6.4 at `:1683-1718`; fence `allowlist` at `:812`, `database-lifecycle-test`
`argv` at `:834`, and `positiveDiscovery.paths` at `:837`). The file is not on
disk at this tree, so it is declared-but-absent. It contains `task551`, sits
under the `tests/integration/server` lane root, and is not planned, so the
**V2-5** case-1 derivation already yields it. Without it,
`staticListBindingErrors` reports `missing-from-static:` for that path.

The **V2-3** table gains one row. In UTF-16 order it falls between entry 11
(`task551DatabaseLifecycleRealDb`) and the old entry 12
(`task551IndexAndConstraintCatalog`), because `Da` sorts before `De`:

| # | Path | Contracted via (owner) | On disk at `9c5b6666` |
| --- | --- | --- | --- |
| 12 | `tests/integration/server/task551DedicatedSessionGuards.test.ts` | allowlist + argv + test-paths (TASK-551-02-L02, R6) | no |

Old entries 12-26 become 13-27. Their paths, owners, and on-disk flags do not
change. Entries 1-11 keep their numbers. The list therefore has 27 entries:
17 on disk and 10 declared-but-absent. The historical five are now entries 10,
18, and 25-27. The two TASK-551-03-L02 suites are still entries 1 and 5.

Verification (2026-09-25, DB-free, read-only). Take the first ` ```json `
fence of every `TASK-551*.md` file. Collect the `allowlist`, every command
`argv`, and every `test-paths` discovery. Filter them with the **V2-5**
predicates: the `LANE_TEST_FILE` regex, the `task551` token, not a member of
`TASK551_PLANNED_BUN_TEST_PATHS`, and inside the `scripts/bun-lane-classify.ts:62-73`
lane roots. This yields exactly the 27 paths above in that order. No other
path is derived. `DECLARED_NOT_YET_ALLOWLISTED` stays `[]`, because the new
entry is already named by the 02-L02 fence.

**`bunLane.ts` edit (V2-4, still the single writer).** The frozen
`TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS` holds the 27 paths above,
byte-exact and in order. Nothing else in **V2-4** changes. **V2-8** now
projects `bunLane.ts` at about 381 lines; the membership test projection is
unchanged.

**Receipt.** `contractedPathCount` is not a literal. The orchestrator writes
`TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS.length` as read from the tree
at the time of the run (27 when v3 lands). **V2-5** case 2 already pins no
count, and v3 adds none. Any v2 or v3 number is descriptive, not an assertion.

#### V3-2 Growth-rule gate (finding M1; family rule)

This replaces the **V2-2** growth-rule timing with a same-correction gate:

1. A TASK-551 leaf may allowlist, or name in `argv` or `test-paths`, a NEW
   `task551`-named Bun-lane test path. When it does, the SAME dated correction
   in that leaf must also do two things:
   - record the matching TASK-551-01-L01 mirror (a dated 01-L01 amendment that
     adds the exact path to the static list; 01-L01 stays the single writer of
     `bunLane.ts`), and
   - put the verification suite in its own gate set: the 01-L01
     `lane-membership-test` suite, `tests/integration/server/task551BunLaneMembership.test.ts`,
     run airtight as
     `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/server/task551BunLaneMembership.test.ts`.
2. The leaf's gate is green only when **V2-5** cases 1 and 8 are green on the
   tree that carries both the leaf's correction and the 01-L01 mirror. A
   correction that names a new path without its mirror is incomplete. The
   leaf's post-audit must report it as a MEDIUM finding.
3. The leaf's gate set means its implementer FAST gates and orchestrator gates
   (prose). A fence `commands[]` entry is allowed but not required. The
   membership path is a planned path, so naming it never changes the
   derivation.
4. The escape hatch of a name without the `task551` token (**V2-2**,
   TASK-551-11 precedent) stays available.

**Owed additions at this tree (verified from each fence):**

- **TASK-551-02-L02 (R6).** `task551DedicatedSessionGuards.test.ts` gets its
  mirror through **V3-1**. Hand-off: the 02-L02 owner appends a dated note
  that adds the membership suite to its R6.4 implementer FAST gates. This is
  prose only; the fence does not change. Until that note lands, the 02-L02
  post-audit must re-run the membership suite itself.
- **TASK-551-10-L01.** Its envelope names four future `task551` suites
  (`TASK-551-10-L01-Small-Large-Load-Fault-Security-And-Redis-Smoke-Gates.md`
  fence `allowlist` `:1173-1176`, and the `cache-performance-gate`,
  `cache-fault-matrix`, `cache-security-gate`, and
  `two-process-redis-smoke-test` commands):
  `tests/perf/task551DatabaseCachePerformanceGate.test.ts`,
  `tests/integration/runtime/task551ServerCacheFaultMatrix.test.ts`,
  `tests/integration/runtime/task551TwoProcessRedisSmoke.test.ts`, and
  `tests/security/task551ServerCacheSecurityGate.test.ts`. None of them is on
  disk. They are ALREADY static entries 23, 2, 3, and 24 (v2 entries 22, 2, 3,
  and 23) as declared-but-absent, so v3 adds no row for them. Their mirror
  obligation is met now. The owed part is the membership-suite gate and the
  regeneration handoff in **V3-3**.
- **No other leaf** names an unlisted `task551` Bun-lane path at this tree
  (derivation in **V3-1**).

#### V3-3 TASK-551-10-L01 regeneration handoff (decision: 10-L01 regenerates)

The 10-L01 `full-bun-test` command (`["bun", "--env-file=/dev/null", "run", "test"]`,
fence `:1382-1386`) runs `tests/unit/toolchain/bunLaneManifest.test.ts`. That
suite is red while any lane test file on disk is missing from
`tests/bun-lane-manifest.json`. The four 10-L01 suites are exactly such files
once they are written. So the full run needs a regeneration AFTER those suites
exist. Of the two options, v3 picks the first and records it as a 10-L01
handoff. It does not reorder 01-L01 FINAL after 10-L01.

- **Handoff to TASK-551-10-L01 (its owner writes, append-only).** The 10-L01
  owner adds a dated mirror correction. It allowlists the generated
  `tests/bun-lane-manifest.json` for exactly one purpose: the literal command
  `bun scripts/bun-lane-classify.ts` from the worktree root. That command is
  the FIRST command of the 10-L01 gate sequence. It runs after the four suites
  exist and after the **V3-4** precondition is green for the recomputed
  to-be-added set, which then includes the four suites and any other new
  lane file. Next in the sequence comes the airtight membership suite
  (**V3-2**). Then comes `tests/unit/toolchain/bunLaneManifest.test.ts`,
  followed by the rest of the existing gates, `full-bun-test` included.
- The 10-L01 regeneration keeps v1's one-path mutation proof: exactly
  `tests/bun-lane-manifest.json` changes. The manifest is never hand-edited.
- 01-L01 stays the contract owner of the classifier output and of
  `bunLane.ts`. The 10-L01 write is a delegated regeneration of a generated
  artifact under the literal command, not a second writer of any
  human-authored file.
- The regeneration at 01-L01 FINAL (**V2-10**) is unchanged. It is not
  reordered after 10-L01.

#### V3-4 Owner-map verdicts by gating class (finding M2)

This refines **V2-6** steps 2-4 (quoted in **V3-6**). Each to-be-added suite
is classified by how its real-DB legs are gated. The class decides the
required result in each run. Gating below was verified by grep at this tree.

| Class | Suites (of the 21 v1 **Defect** rows) | Gate (verified anchor) | Owner-map run (step 2) | Map-free run (step 3) |
| --- | --- | --- | --- | --- |
| A. `TASK551_FIXTURE_*` owner-map gated | `task551ActionExecutionStore` (`:37`, `:91`), `task551AppendHeavyRetention` (`:92`, `:100`), `task551RevisionConcurrency` (`:56`, `:113`), `task551RevisionRetention` (`:96`, `:104`), `database-pool-telemetry` (`:61`, `:269`), `database-retention-batches` (`:80`, `:818`), `database-retention-jobs` (`:90`, `:102-113`, `:600`, a map plus routable probe), `database-revision-budgets` (`:84`, `:90`), `database-partition-readiness` (`:70`, `:103`, a map plus routable probe) | `test.skipIf(!OWNER_DB_TEST_MAP_PRESENT …)` over the three `TASK551_FIXTURE_DATABASE_{URL,NAME,SENTINEL}` keys | must PASS; a skip is blocking | pass, with DB legs skipped |
| B. Ambient `DATABASE_URL` gated | `task551CacheInvalidationOutboxSchema` (`:52`, `:61-62`), `task551ConcurrencyConstraints` (`:76`, `:85-86`), `task551IndexAndConstraintCatalog` (`:55`, `:64-65`), `task551RetentionJobService` (`:107-108`), `task551SchemaMigrationParity` (`:109`, `:118-119`), `task551SearchVectorMigration` (`:81`, `:90-91`), `task551SolutionKitRollbackAuthoritySchema` (`:994-999`, a `select 1` probe through the core client), `retentionScheduler` (`:64-65`), `database-index-write-overhead` (`:38`, `:47-48`) | `hasDb ? test : test.skip` after a connect probe on the ambient URL | must PASS with the closed env (`DATABASE_URL` = `DATABASE_URL3`); a skip is blocking | pass, with DB legs skipped |
| C. Injection gated (L11 broker; no env read) | `database-explain-plans` (live halves `:2579-2610` return when `readTask551ExplainAuthority()` is `undefined`; the reader is set only by `configureTask551ExplainAuthority`, `tests/perf/fixtures/task551QueryPlanContracts.ts:3432-3440`), `task489-solution-kit-run-predecessor-plans` (`:2333-2335` returns when `readTask489PredecessorInjection()` is `undefined`, `:1205-1206`) | no env gate; the lane runner injects nothing | must PASS; live halves inert; the airtight arms assert absence | must PASS |
| D. Ungated (DB-free by construction) | `task551OnlineIndexDeployment` (verdict in **V2-6**) | none | must PASS | must PASS |

The count is 9 + 9 + 2 + 1 = 21, which matches the **V2-6** set.

**Correction to the audit seed.** The seed put `database-explain-plans` and
`task489-solution-kit-run-predecessor-plans` in class A. The grep shows no
`process.env.TASK551_FIXTURE_*` read and no `skipIf` in either file. Their
`TASK551_FIXTURE_DATABASE_*` literals (`:2370-2373` and `:1270-1273`) are
synthetic fixtures for the no-socket target-seam tests. Their live halves are
gated by in-process injection, which the lane runner never performs. So the
owner-map run cannot make them execute live. In it they must pass with inert
live halves, and their live proof stays with the L11 broker (TASK-551-05-L02
and the TASK-489 predecessor owners). This does not block regeneration.

**Blocking rule (replaces V2-6 step 4 wording).** Any of these blocks
regeneration and is a hand-off to the owning leaf:

- a fail in either run;
- a skip in the owner-map run of any class-A or class-B DB leg;
- a skip in either run of a class-C or class-D suite;
- a map-free connection error or hang.

The owning leaf is the **V2-3**/**V3-1** owner column, or for generic rows the
leaf whose envelope names the path. Regeneration stays blocked until the
hand-off lands and both runs meet this table for that suite. The
**`task551OnlineIndexDeployment` gating verdict** and its "no DB-gate hand-off
to TASK-551-05-L01" conclusion stand unchanged.

The to-be-added set is still recomputed at gate time (**V2-6**). Suppose
`task551DedicatedSessionGuards.test.ts` (DB-free by the 02-L02 R6.4 contract)
or any 10-L01 suite exists when a regeneration runs. It then joins the set and
is classified by grep in the same way before the run. An unclassifiable suite
blocks.

**Receipt.** Each `preRegenerationLaneRun` entry adds `gatingClass`
(`"fixture" | "ambient" | "injection" | "ungated"`). `ownerMap` and `mapFree`
keep the values `"pass" | "skip" | "fail"`, and a recorded skip that this
table forbids is a blocking result, never a pass. The entry still holds no
environment values.

#### V3-5 Envelope, validation, land order

- **Envelope.** No change. `bunLane.ts`, the membership test, and
  `tests/bun-lane-manifest.json` are already in the 01-L01 `allowlist`. No
  fence byte changes, so the family preflight result is the same as the v2
  tree's.
- **Validation.** **V2-10** is unchanged, with one exception: the receipt
  count follows **V3-1**.
- **Land order.** **V2-10** is unchanged. v3 lands together with v2's source
  and test edits. The **V3-3** 10-L01 regeneration is a separate, later gate
  in TASK-551-10-L01.

#### V3-6 Superseded v2 sentences (quoted; superseded from this date)

- `:2292`: "#### V2-3 The static list (exact; 26 entries; sorted by UTF-16
  code unit)". Replaced by: exact, 27 entries (**V3-1**).
- `:2323-2325`: "The list has 17 entries on disk: the historical five plus the
  twelve v1 **Defect** rows. It has 9 declared-but-absent entries: the two
  TASK-551-03-L02 suites, plus seven more that are already named in leaf
  allowlists:". Replaced by: 17 on disk, 10 declared-but-absent (the nine
  named in v2 plus `task551DedicatedSessionGuards`).
- `:2334-2335`: "This equals the v1 derivation result ("26 contracted paths,
  17 of which are present on disk")." Replaced by: the fence derivation at
  this tree yields 27 paths, 17 present (**V3-1**). The v1 figure at `:1972`
  stays a historical record.
- `:2351`: "// ... the 26 V2-3 paths, byte-exact and in V2-3 order ...".
  Replaced by: the 27 paths of **V2-3** as amended by **V3-1**.
- `:2575-2576`: "A synthetic manifest that materializes all 26 entries also
  classifies as `post-finalization`." Replaced by: all entries of the static
  list, iterated from the constant rather than counted.
- `:2263-2266`: "When a leaf starts naming a new `task551`-path Bun-lane test,
  a dated 01-L01 mirror adds that exact path to the static list in the same
  land window. The mirror is the single writer of `bunLane.ts`. Until it
  lands, the membership suite fails closed and names the missing path."
  Replaced by **V3-2**: same dated correction, a recorded 01-L01 mirror, and
  the membership suite in the leaf's own gate set. The single-writer sentence
  stays.
- `:2626-2627`: "Record one of pass, skip, or fail for each suite." Replaced
  by: record it, and judge it against the **V3-4** class table.
- `:2632-2633`: "Each suite either passes, or its DB-gated tests skip
  cleanly." Replaced by: class A and class B suites pass with DB legs skipped,
  and class C and class D suites must pass (**V3-4**).
- `:2634-2638`: "Any owner-map fail, or any map-free failure, is a hand-off to
  the leaf that allowlists that suite (**V2-3** owner column; for the generic
  rows, the leaf whose envelope names the path)." and "Regeneration is blocked
  until the hand-off lands and steps 2 and 3 are green for that suite."
  Replaced by the **V3-4** blocking rule, which adds forbidden skips.
- `:2674-2675`: "The three names remain contracted as static entries 24-26."
  Replaced by: static entries 25-27.
- `:2737`: "`contractedPathCount` is the static list length (26 at
  `9c5b6666`)." Replaced by: the list length read from the tree at the time
  of the run, not a literal (**V3-1**).
- `:2758-2759`: "the export and its set stay, widened to the 26 **V2-3**
  paths". Replaced by: widened to the 27 paths of **V2-3** as amended by
  **V3-1**.
- `:2766-2767`: "they are static entries 10, 17, and 24-26". Replaced by:
  static entries 10, 18, and 25-27.
