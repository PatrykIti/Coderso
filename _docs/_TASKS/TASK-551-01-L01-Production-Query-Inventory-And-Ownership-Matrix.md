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
