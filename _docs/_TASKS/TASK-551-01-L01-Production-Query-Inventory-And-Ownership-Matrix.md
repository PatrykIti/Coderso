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

### Amendment v4 (2026-09-25): regeneration as a command, per-suite receipts, growth gate

Recorded at HEAD `ee4c7f93` (dirty tree: in-flight 06-L02/06-L03 code and test
edits, not part of this amendment) from the v3 audit findings H and M1-M4,
verified against the current fences, workflow libraries, and test sources.
This amendment is append-only. It supersedes v3 (and the v2 clauses v3 kept)
only where stated, and **V4-7** quotes every superseded sentence with its
current line. Every clause not quoted there stays binding. No ` ```json `
fence byte of this file changes (**V4-6**).

#### V4-1 Regeneration is authorized as a command, not as file ownership (finding H)

**Defect (verified).** **V3-3** told TASK-551-10-L01 to allowlist
`tests/bun-lane-manifest.json`. That path is already in the 01-L01 fence
`allowlist` (`:1517`). The family preflight rejects a second owner:
`_docs/_workflows/lib/task-551-dispatch-contract.mjs:955-960` throws
`allowlist_cross_owner:<path>`. An in-memory run of
`preflightTask551DispatchSnapshot` at `ee4c7f93` with that path added to the
10-L01 `allowlist` fails with
`task551_dispatch_allowlist_cross_owner:tests/bun-lane-manifest.json`. So
**V3-3** can never land. v4 replaces it.

**Rule (01-L01 authorization; family-wide).** 01-L01 stays the only
`allowlist` owner of `tests/bun-lane-manifest.json`, of the classifier output
contract, and of `bunLane.ts`. Any TASK-551 leaf whose work lands new Bun-lane
test files may run the literal classifier as a named command in its OWN
envelope, under these conditions:

1. The command is exactly
   `{ "id": "bun-lane-classify", "lane": "cli", "argv": ["bun", "scripts/bun-lane-classify.ts"], "environmentProfile": "none", "positiveDiscovery": { "kind": "not-applicable" } }`.
   It needs no DB, no Redis, and no env: the classifier reads no environment
   variable and writes only the manifest (`scripts/bun-lane-classify.ts:731-733`).
   `tests/bun-lane-manifest.json` never enters that leaf's `allowlist`.
2. It runs only after the **V4-2** precondition is green for the to-be-added
   set recomputed at that moment.
3. It keeps v1's one-path mutation proof: a pre/post scope comparison shows
   that exactly `tests/bun-lane-manifest.json` changed. The manifest is never
   hand-edited. Any other changed path fails the command.
4. The next command in the same envelope runs the membership suite and
   `tests/unit/toolchain/bunLaneManifest.test.ts` on the regenerated tree
   (the full suites, not the **V4-3** filter), both green.
5. It is a delegated regeneration of a generated artifact under a literal
   command. It never makes the leaf a second writer of a human-authored file.

**Handoff to TASK-551-10-L01 (its owner writes the dated mirror; append-only).**
The 10-L01 fence (`TASK-551-10-L01-Small-Large-Load-Fault-Security-And-Redis-Smoke-Gates.md`
`:1163-1439`) changes as follows. Its `allowlist` does not change.

- Add two commands to `commands[]`, placed before the `full-bun-test` object
  (`:1381-1387`):

  ```text
  { "id": "bun-lane-classify", "lane": "cli",
    "argv": ["bun", "scripts/bun-lane-classify.ts"],
    "environmentProfile": "none", "positiveDiscovery": { "kind": "not-applicable" } }
  { "id": "bun-lane-membership-test", "lane": "bun-test",
    "argv": ["bun", "--env-file=/dev/null", "test",
             "tests/integration/server/task551BunLaneMembership.test.ts",
             "tests/unit/toolchain/bunLaneManifest.test.ts"],
    "environmentProfile": "none",
    "positiveDiscovery": { "kind": "test-paths",
      "paths": ["tests/integration/server/task551BunLaneMembership.test.ts",
                "tests/unit/toolchain/bunLaneManifest.test.ts"],
      "minimum": 2 } }
  ```

- Reorder `occurrences[0].commandIds` (`:1435`) so the two ids come right
  after `cache-contract-vitest` and right before `full-bun-test`:
  `…, "cache-contract-vitest", "bun-lane-classify", "bun-lane-membership-test", "full-bun-test", "coverage", …`.
  All other ids keep their order.
- Both commands are DB-free. The membership suite is DB-free by **V2-5**, and
  `bunLaneManifest.test.ts` already runs airtight in **V2-10**. `minimum`
  equals the path count (2). The argv has 5 tokens (limit 128). Neither path
  enters the **V2-5** derivation: the membership path is planned, and
  `bunLaneManifest.test.ts` carries no `task551` token.
- Verification (2026-09-25, DB-free, read-only, in memory only). Apply exactly
  this edit to the 10-L01 text in memory and run
  `preflightTask551DispatchSnapshot({ sourceHead: "ee4c7f93", taskFiles })`
  over repo-relative `_docs/_TASKS/TASK-551*` paths. It passes, with inventory
  `41` task files, `11` children, `29` leaves, and `33` occurrences. No file
  on disk was changed by that check.
- Where the regeneration sits: the four 10-L01 suite commands
  (`cache-performance-gate`, `cache-fault-matrix`, `cache-security-gate`,
  `two-process-redis-smoke-test`, `:1332-1359`) run first and create the
  lane files. The orchestrator runs the **V4-2** precondition before it
  dispatches `bun-lane-classify`. `full-bun-test` then runs on a regenerated
  manifest.

**Conditional handoff to TASK-551-11 (workflow owner; not blocking today).**
At this tree 10-L01 is not a dispatchable phase of
`_docs/_workflows/task-551-implement.mjs` (the provenance phases are
`sidecar`, `l01`, `l03`, `l04`, `l02`, and `05-l02`;
`task-551-worktree-compatibility.mjs:93-222`). `tests/bun-lane-manifest.json`
is declared only as the L01 `materializedWorktreeOutputs` entry (`:156`).
Suppose a later correction makes 10-L01, or any other leaf that uses this
rule, a dispatchable phase. Then its phase provenance must declare the
manifest as a command-scoped output of `bun-lane-classify`. Otherwise
`requireNoForeignPathOrByteDrift` (`:930-960`) rejects the write as
`task551_current_worktree_foreign_delta:tests/bun-lane-manifest.json`. That
declaration is TASK-551-11's to write. It is not an `allowlist` entry.

#### V4-2 Precondition: per-suite receipts plus one lane-runner run (finding M1)

**Defect (verified).** The **V2-6** step-2 run that **V3-4** judged per suite
is the lane runner. The lane runner reports per worker, not per suite:
`WorkerResult` is `{ name, files, exit, durationMs, attempted }`
(`scripts/run-bun-parallel.ts:74-80`), and the report is `{ results, totalMs }`
(`:341`). A worker also retries a failed file set once unless `--no-retry` is
set (`:148-150`, `:212-217`). So "record pass, skip, or fail for each suite"
could not be read from that run.

v4 splits the precondition into two parts. Both are orchestrator-only, and
neither writes a tracked path.

**Part 1: per-suite receipts (source of `ownerMap`).** For every suite in the
recomputed to-be-added set, run one plain command, one suite per process, in
the closed owner-map environment:

```text
env -i PATH="$PATH" HOME="$HOME" \
  DATABASE_URL=<DATABASE_URL3> DATABASE_DIRECT_URL=<DATABASE_URL3> \
  DB_LOCK_TIMEOUT_MS=15000 <the owning leaves' TASK551_FIXTURE_* keys> \
  [REDIS_URL=<REDIS_URL from .env>   # class service only, V4-4]
  bun --env-file=/dev/null test <one suite path>
```

The orchestrator reads the values from `.env` in its own shell and never
echoes or records them. The verdict per class:

| Class | Required result of the plain run |
| --- | --- |
| `fixture` (A) | PASS with 0 skips; a skip is blocking |
| `ambient` (B) | PASS under `DATABASE_URL` = `DATABASE_URL3`; a skip of a DB leg is blocking |
| `injection` (C) | PASS; live halves inert (unchanged **V3-4** reasoning) |
| `ungated` (D) | PASS |
| `service` (E, **V4-4**) | PASS with 0 skips; a missing service blocks |

The result is the suite's `ownerMap` value. The map-free run (**V2-6** step 3)
is unchanged, except for class `service` (**V4-4**).

**Part 2: one lane-runner run (source of `laneRunnerRun`).** After part 1 is
green for every suite, run the runner once over the scratch manifest from
**V2-6** step 1, in the same closed env:

```text
env -i PATH="$PATH" HOME="$HOME" \
  DATABASE_URL=<DATABASE_URL3> DATABASE_DIRECT_URL=<DATABASE_URL3> \
  DB_LOCK_TIMEOUT_MS=15000 <TASK551_FIXTURE_* keys> [REDIS_URL=<…>] \
  BUN_LANE_MANIFEST_PATH=.tmp/task551-reopen-v2/precondition-manifest.json \
  bun --env-file=/dev/null scripts/run-bun-parallel.ts --lane all --no-retry \
    --workers <N> --pool <P> --report .tmp/task551-reopen-v2/precondition-report.json
```

- Retries: the runner supports `--no-retry` (verified: flag parse `:125-126`,
  retry guard `:214`). It is mandatory here, so every worker has
  `attempted: 1`. The receipt still copies `attempted` from the report. A
  value other than 1 invalidates the run.
- `--workers`/`--pool` must satisfy `workers x pool <= 10` and the lane-aware
  `worker_count_too_low` bound (`:19-28`). A budget, direct-URL
  (`scripts/bun-lane-worker-url.ts:150`), or provisioning error is a run
  error to fix, not a suite verdict.
- Workers get `DATABASE_URL` = `DATABASE_DIRECT_URL` plus
  `options=-csearch_path=bun_worker_<i>` (`scripts/bun-lane-worker-url.ts:61-66`,
  `:152-161`). Provisioning drops and re-migrates exactly
  `bun_worker_0..K-1` on `DATABASE_URL3` and leaves them in place after the
  run (`scripts/bun-lane-provision.ts:50-67`). This is why **V4-3a** (M2)
  matters. `DATABASE_URL3` is the owner-approved lane database (2026-09-24).
- Workers are spawned as `bun test` without `--env-file=/dev/null`
  (`scripts/run-bun-parallel.ts:166`). Keys the closed env sets reach the
  workers as set (`resolveWorkerEnv` spreads the base env, `:152-161`). The
  env is closed only for keys it sets. This is an observation, not a gate.
- Blocking: any worker `exit` other than 0 blocks regeneration. Re-run each
  file of that worker once, by name, with the part-1 command and
  `DATABASE_URL` set to the same worker URL form. This attributes the failure
  (unchanged **V2-6** step-2 rule). A suite that passes part 1 but fails only
  in its worker has a lane-isolation defect. It is handed off to the suite's
  owner, with **V4-3a** as the first suspect.

**Order.** Part 1 runs, then the map-free run, then part 2, then the
literal classifier command.

#### V4-3 Growth gate: filtered membership run and pending regeneration (finding M3)

**Leaf-side gate (replaces the V3-2 item 1 command).** A leaf covered by
**V3-2** runs only the two contract cases, by exact name:

```text
env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/server/task551BunLaneMembership.test.ts -t 'binds the static contracted list to every TASK-551 task-file fence|every task551-path lane file on disk is planned or statically contracted'
```

- The two names are the **V2-5** case 1 and case 8 titles, byte-exact. They
  become load-bearing: an implementer must not rename them, and a rename is
  a contract change of this file.
- Bun matches `-t` as a regular expression against the full name, which
  includes the `describe` prefix `"TASK-551 L01 Bun-lane membership"` (`:75`).
  Neither title contains a regex metacharacter. Verified with Bun `1.4.2` on
  a scratch copy of the three-name shape: `2 pass`, `1 filtered out`, `0 fail`.
- Green means: exit 0, exactly `2 pass`, `0 fail`, and 0 skipped. The
  `filtered out` count is informational. Fewer than 2 passes (for example,
  after a drifted title) is red, so the filter cannot pass vacuously.
- Why filter: before the next regeneration, the live pin (`:137-163`) and the
  two `bunLaneManifest.test.ts` cases named in v1 are legitimately red. The
  growth gate must not depend on them.

**Live-case re-specification (the V2-5 renamed case's live half).** The live
half is re-specified so that a regeneration lag is never red:

- a static entry on disk with no manifest row is **pending regeneration**:
  an INFO row, never red;
- a manifest row whose normalized path contains `task551`, that is not
  planned, and that is missing from the static list is red (the existing
  stray rule, unchanged);
- the pre-existing strictness for rows that do exist is kept, not weakened:
  a static entry with more than one manifest row, or with a row while its
  file is absent on disk, stays red. This is not a growth-direction
  condition, and the original clause already made it red.

```ts
// task551BunLaneMembership.test.ts — additions; pure, DB-free.
type StaticManifestAudit = Readonly<{
  red: readonly string[];
  pendingRegeneration: readonly string[];
}>;

function auditStaticEntriesAgainstManifest(
  staticList: readonly string[],
  manifestPaths: readonly string[],
  exists: (path: string) => boolean
): StaticManifestAudit {
  const rows = new Map<string, number>();
  for (const p of manifestPaths) rows.set(p, (rows.get(p) ?? 0) + 1);
  const red: string[] = [];
  const pendingRegeneration: string[] = [];
  for (const p of staticList) {
    const count = rows.get(p) ?? 0;
    if (count > 1) red.push(`duplicate-row:${p}`);
    else if (count === 1 && !exists(p)) red.push(`phantom-row:${p}`);
    else if (count === 0 && exists(p)) pendingRegeneration.push(p);
  }
  return { red, pendingRegeneration };
}
```

- Live use: the renamed case asserts `audit.red` equals `[]`. It emits one
  `console.info("task551_pending_regeneration:" + path)` line per pending
  entry. It asserts nothing about `pendingRegeneration`. The existing stray
  and case-variant stray assertions stay byte-unchanged.
- Added synthetic case 9, "classifies static entries as pending regeneration
  or red": an on-disk entry with no row yields only
  `pendingRegeneration: [p]`; two rows yield `duplicate-row:<p>`; a row with an
  absent file yields `phantom-row:<p>`; an absent entry with no row yields
  neither list; one row with the file present yields neither list.
- Receipt: the orchestrator copies each emitted line into
  `pendingRegeneration: [{ path, severity: "info" }]`. INFO rows never block.

**V4-3a Class-B catalog legs and worker schemas (finding M2; handoffs).**
Some class-B suites look up catalog rows by `relname`/`conname` with no
schema filter. Wherever `bun_worker_*` schemas exist on the target database,
such a lookup also sees the worker copies. That applies to part 2 always,
and to part 1 once any lane run has provisioned them (**V4-2**). The lookup
then returns more than one row, and `toHaveLength(1)` or a scalar subquery
fails. The grep at this tree covered `pg_class`, `pg_constraint`,
`pg_attribute`, `pg_stat_user_tables`, `information_schema`, `relname`,
`conname`, and `::regclass` over the nine class-B suites:

| Suite | Owner | Unqualified lookups (anchor) |
| --- | --- | --- |
| `tests/integration/server/task551IndexAndConstraintCatalog.test.ts` | TASK-551-05-L01 | `pg_class … relname` `:169`, `:179`; `pg_constraint` joined to `pg_class` by `conname` and `rel.relname = 'bookings'` `:196-200`; `conname like 'cache_invalidation_outbox%'` `:224`; `conname = any(…)` `:231-233`. The expected text at `:184` also pins `ON public.content_revisions`. |
| `tests/integration/server/task551SchemaMigrationParity.test.ts` | TASK-551-05-L01 | `pg_class … relname` `:334` |
| `tests/integration/server/task551SearchVectorMigration.test.ts` | TASK-551-05-L01 | `pg_attrdef`/`pg_class`/`pg_attribute` by `c.relname` `:204-207` |
| `tests/integration/server/task551RetentionJobService.test.ts` | TASK-551-06-L03 | `pg_stat_user_tables where relname = …` inside a scalar subquery, `:156` in the working tree (`:155` at `ee4c7f93`; the file carries in-flight 06-L03 edits) |

- Handoff (each owner writes, append-only): qualify each lookup by the
  session schema, for example `c.relnamespace = current_schema()::regnamespace`,
  `connamespace = current_schema()::regnamespace`, or
  `schemaname = current_schema()`. Compare schema-qualified expected text
  against `current_schema()` instead of a literal `public.`. `current_schema()`
  is `public` in the part-1 run and `bun_worker_<i>` in a worker.
- Not affected: the `to_regprocedure`/`to_regoperator` lookups in
  `task551SearchVectorMigration.test.ts` (`:216-245`) resolve one object
  through `search_path`. The other five class-B suites
  (`task551CacheInvalidationOutboxSchema`, `task551ConcurrencyConstraints`,
  `task551SolutionKitRollbackAuthoritySchema`, `retentionScheduler`, and
  `database-index-write-overhead`) have no such lookup, so they get no
  handoff.
- Until each handoff lands, that suite's catalog legs may fail in part 1 or
  part 2. That failure blocks regeneration under the **V3-4** blocking rule.
  The receipt records it per suite in `handoffs[]` as
  `{ taskId, reason: "catalog-schema-qualification:<path>" }`.

#### V4-4 Suite class `service` (finding M4)

The **V3-4** table gains class E:

| Class | Suites | Gate (verified anchor) | Owner-map (part 1) | Map-free run |
| --- | --- | --- | --- | --- |
| E. `service` (a required external service, here Redis) | `tests/perf/task551DatabaseCachePerformanceGate.test.ts` (static entry 23), `tests/integration/runtime/task551ServerCacheFaultMatrix.test.ts` (2), `tests/integration/runtime/task551TwoProcessRedisSmoke.test.ts` (3), `tests/security/task551ServerCacheSecurityGate.test.ts` (24) | 10-L01 profile `task551-db-redis-test` (fence `:1336`, `:1343`, `:1350`, `:1357`); "A missing required service blocks rather than skips." (10-L01 `:1124-1125`) | PASS with 0 skips in the closed env plus `REDIS_URL` from `.env` (and the 10-L01 profile's other keys); a missing or unreachable service blocks | not run; recorded `"not-applicable"`, because a service-less run must fail closed by the 10-L01 contract, not skip |

- Blocking semantics: a skip, a fail, or a missing `REDIS_URL` in part 1 or
  part 2 blocks regeneration and is a handoff to TASK-551-10-L01.
- None of the four exists on disk at `ee4c7f93`, so the **V3-4** count stays
  9 + 9 + 2 + 1 = 21, with 0 in class E. They join the recomputed set at the
  10-L01 regeneration (**V4-1**). Any other suite that needs a required
  external service is classified E by the same grep before the run.
- Verified observation: the worktree `.env` has no `REDIS_URL` key at this
  tree (key-name count 0; no value read). A class-E run is therefore blocked,
  not skipped, until the owner provisions it. This does not block 01-L01,
  whose to-be-added set has no class-E suite.
- Receipt: `gatingClass` gains `"service"`. `mapFree` gains
  `"not-applicable"`, which is legal only for class `service`.

#### V4-5 Receipt addendum (additive)

The v2/v3 receipt entry (`reopenAddenda` in
`_docs/_workflows/_smoke/task-551/impl-01-l01-initial.json`) gains:

- `preRegenerationLaneRun[]`: `{ path, gatingClass, ownerMap, mapFree }`,
  where `ownerMap` comes from **V4-2** part 1;
  `gatingClass: "fixture" | "ambient" | "injection" | "ungated" | "service"`;
- `laneRunnerRun`: `{ noRetry: true, workers: [{ name, files, exit, attempted }] }`,
  copied from the part-2 report `results`, plus
  `attributedFailures: [{ path, worker }]` when a worker failed;
- `pendingRegeneration: [{ path, severity: "info" }]` (**V4-3**);
- `handoffs[]` entries for **V4-3a** and **V4-4**.

The entry still holds no environment values, URLs, DB identities, SQL, or
fixture data. A leaf that runs **V4-1** writes the same shape into its own
receipt location.

#### V4-6 Envelope, line gate, land order

- **Envelope.** No 01-L01 fence byte changes, so the family preflight result
  is unchanged. The only fence change is the 10-L01 mirror in **V4-1**, and
  the 10-L01 owner writes it.
- **Line gate (projected).** `tests/integration/server/task551BunLaneMembership.test.ts`
  goes from about 690 (**V2-8**) to about 730: one helper, case 9, and the
  live-half change. `bunLane.ts` is unchanged by v4. No file exceeds 1,000
  lines.
- **Validation.** **V2-10** applies, as amended by **V4-7**. The pre-regeneration
  airtight run may be red only in the live pin and the two
  `bunLaneManifest.test.ts` cases. The **V4-3** filtered run must be green
  at every point.
- **Land order.** v4 lands with the v2/v3 source and test edits, under the
  **V2-10** order. The **V4-2** precondition replaces the **V2-6** steps 2-4
  runs in step 3 of that order.

#### V4-7 Superseded v2/v3 sentences (quoted; superseded from this date)

- `:2881-2882` (**V3-2** item 1): "run airtight as
  `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/server/task551BunLaneMembership.test.ts`."
  Replaced by: the filtered `-t` command of **V4-3**, with exactly `2 pass`.
- `:2899-2900` (**V3-2**): "Until that note lands, the 02-L02 post-audit must
  re-run the membership suite itself." Replaced by: it re-runs the **V4-3**
  filtered command.
- `:2912-2913` (**V3-2**): "The owed part is the membership-suite gate and the
  regeneration handoff in **V3-3**." Replaced by: the **V4-3** filtered gate
  and the **V4-1** command handoff.
- `:2927-2930` (**V3-3**): "The 10-L01 owner adds a dated mirror correction.
  It allowlists the generated `tests/bun-lane-manifest.json` for exactly one
  purpose: the literal command `bun scripts/bun-lane-classify.ts` from the
  worktree root." Replaced by **V4-1**: a `bun-lane-classify` command, with no
  `allowlist` entry (the allowlist variant fails with `allowlist_cross_owner`).
- `:2930-2931` (**V3-3**): "That command is the FIRST command of the 10-L01
  gate sequence." Replaced by: it sits immediately before `full-bun-test`,
  after the four suite commands and `cache-contract-vitest` (**V4-1**).
- `:2934-2936` (**V3-3**): "Next in the sequence comes the airtight membership
  suite (**V3-2**). Then comes `tests/unit/toolchain/bunLaneManifest.test.ts`,
  followed by the rest of the existing gates, `full-bun-test` included."
  Replaced by: one `bun-lane-membership-test` command that covers both suites
  unfiltered, then `full-bun-test` and the rest (**V4-1**).
- `:2940-2942` (**V3-3**): "The 10-L01 write is a delegated regeneration of a
  generated artifact under the literal command, not a second writer of any
  human-authored file." Kept in substance. The authorization basis is the
  **V4-1** command rule, not file ownership.
- `:2949-2950` (**V3-4**): "The class decides the required result in each
  run." and the column header "Owner-map run (step 2)" (`:2952`). Refined: the
  owner-map verdict is the **V4-2** part-1 plain run. Part 2 is judged per
  worker.
- `:2991-2993` (**V3-4** Receipt): "`gatingClass` (`"fixture" | "ambient" |
  "injection" | "ungated"`). `ownerMap` and `mapFree` keep the values
  `"pass" | "skip" | "fail"`". Replaced by: the **V4-4**/**V4-5** unions
  (`"service"`; `"not-applicable"` for class E only).
- `:3005-3007` (**V3-5**): "The **V3-3** 10-L01 regeneration is a separate,
  later gate in TASK-551-10-L01." Replaced by: the **V4-1** command in
  TASK-551-10-L01.
- `:2597-2599` (**V2-6**): "`bun scripts/bun-lane-classify.ts` may write
  `tests/bun-lane-manifest.json` only after every to-be-added suite has passed
  through the real lane runner." Replaced by: only after **V4-2** parts 1 and
  2 are green.
- `:2621-2629` (**V2-6** step 2, the owner-map run through
  `scripts/run-bun-parallel.ts`, already refined by **V3-6**): replaced by
  **V4-2**. The per-suite verdict comes from part 1, and part 2 adds
  `--no-retry` and records per-worker exits. The rule "When a worker holding
  several files fails, re-run each of its files once by name to attribute
  the failure." stays.
- `:2571-2572` (**V2-5** renamed case): "Every static entry has exactly one
  live manifest row when its file exists on disk and none when it does not."
  Replaced by the **V4-3** live re-specification. A missing row for an
  on-disk entry is INFO. Duplicate and phantom rows stay red.
- `:2721-2724` (**V2-10**): "Before regeneration: the airtight run of the
  membership suite has **V2-5** cases 1-8 green. Only the live-manifest
  assertions may be red: the live pin, the renamed case's live half, and the
  two `bunLaneManifest.test.ts` cases named in v1." Replaced by: cases 1-9
  green, and only the live pin and the two `bunLaneManifest.test.ts` cases
  may be red (**V4-6**).

### Amendment v5 (2026-09-26)

Recorded at HEAD `ee4c7f93` from the two v4 audit results (A: 2 MEDIUM,
2 LOW, 2 INFO; B: 4 MEDIUM, 5 LOW, 2 INFO) and five orchestrator decisions,
each verified against the current task files, scripts and test sources. The
tree was dirty with in-flight 06-L02 R6/R7 and 06-L03 re-seed code and test
edits, plus dated sections in the 06-L02, 02-L02 and 11 task files. None of
them is part of this amendment. During authoring the owner committed
`85fb9f55` (TASK-551-11 v10) and `03d42b90` (TASK-551-11 re-open step 1, the
dispatch-library split). The dispatch anchors in **V5-7** are read at
`03d42b90`. This amendment is append-only. It supersedes v4 (and the v2/v3
clauses v4 kept) only where stated, and **V5-10** quotes every superseded
sentence with its current line. Every clause not quoted there stays binding.
No ` ```json ` fence byte of this file changes (**V5-9**).

#### V5-1 The precondition is per-suite plain runs only (decisions 1 and 2)

**Rule.** The regeneration precondition (**V2-6** as amended by **V3-4** and
**V4-2**) is exactly, in this order:

1. the read-only pre-run checks of **V5-4**;
2. for every suite in the recomputed to-be-added set, one plain run
   `bun --env-file=/dev/null test [<the owning command's non-path flags>] <one suite path>`
   under the closed environment map that **V5-2** assigns to that suite. One
   suite per process, strictly one process at a time, under the
   serialization rule of **V5-3**. The result is the suite's `ownerMap`
   value, judged by the **V4-2** part-1 class table (unchanged);
3. the map-free run (**V2-6** step 3, unchanged; class `service` is
   `"not-applicable"` per **V4-4**);
4. the **V3-4** blocking rule plus the **V5-6** blocked list.

Only then may the literal classifier command run. This applies to the
01-L01 initial and FINAL regenerations and to every **V4-1** command
regeneration.

**Part 2 is removed.** The **V4-2** part-2 lane-runner run on `coderso02` is
no longer part of any precondition. `scripts/run-bun-parallel.ts` is never
run against `DATABASE_URL3`, and no `bun_worker_*` schema is ever provisioned
on `coderso02` by this contract. The `attempted: 1` rule is dropped with it
(audit A found it unsatisfiable: `--lane all` always adds the pure-A worker
`a`, which returns `attempted: 0` with no files,
`scripts/run-bun-parallel.ts:314-324`, `scripts/run-bun-pure-lane.ts:94`).
Lane-runner semantics are verified only at 01-L01 FINAL, on a dedicated
worker database named by the owner (**V5-5**).

The owner approval of `DATABASE_URL3` (2026-09-24) stands for the part-1
plain runs only.

#### V5-2 Per-suite closed environment (decision 1; audit B M1, audit A L1)

**Common rules.** Every part-1 run is `env -i PATH="$PATH" HOME="$HOME"`
plus exactly the keys of its map below. The orchestrator builds each map in
its own shell and never echoes or records a value; receipts carry the map id
only. Value sources:

- `<URL3>` is the value of the `.env` key `DATABASE_URL3` (key-name count 1
  in the worktree `.env`; no value read by this amendment).
- `TASK551_FIXTURE_DATABASE_URL` is the same `<URL3>`.
  `TASK551_FIXTURE_DATABASE_NAME` and `TASK551_FIXTURE_DATABASE_SENTINEL`
  are orchestrator constants: `coderso02` and the pinned orchestrator
  sentinel literal of `TASK-551-03-L02…md:1133`. They are never read from
  `.env`; the worktree `.env` has no `TASK551_FIXTURE_*` key (key-name count 0).
- `PAGINATION_CURSOR_SECRET` and `REDIS_URL` come from `.env` when the map
  names them (`PAGINATION_CURSOR_SECRET` key-name count 1; `REDIS_URL` 0).
- `DATABASE_DIRECT_URL`, `DB_MAINTENANCE_URL`, `DB_MAINTENANCE_MODE`,
  `PII_HASH_KEY` and `PII_ENC_KEY` are never set in a part-1 run. No owning
  closed form sets `DATABASE_DIRECT_URL`, and 03-L02 forbids it
  (`TASK-551-03-L02…md:1134-1136`).

**Maps (keys only).**

| Map id | Keys | Source contract |
| --- | --- | --- |
| `M-fixture-lock` | `DATABASE_URL`, `TASK551_FIXTURE_DATABASE_URL`, `TASK551_FIXTURE_DATABASE_NAME`, `TASK551_FIXTURE_DATABASE_SENTINEL`, `DB_LOCK_TIMEOUT_MS=15000` | 06-L03 closed form (`TASK-551-06-L03…md:1261`, `:1610`); 06-L02 R8/I2 (`TASK-551-06-L02…md:1476-1478`, `:2188-2189`); 02-L02 closed form (`TASK-551-02-L02…md:1198`) |
| `M-fixture` | `DATABASE_URL`, `TASK551_FIXTURE_DATABASE_URL`, `TASK551_FIXTURE_DATABASE_NAME`, `TASK551_FIXTURE_DATABASE_SENTINEL` | the base shared by every written `task551-db-test` closed form (03-L02 `:1130-1133`, 06-L02 `:1016`, 06-L03 `:922`); used for a `task551-db-test` owner whose file writes no closed form |
| `M-03l02` | `DATABASE_URL`, the three `TASK551_FIXTURE_DATABASE_*` keys, `PAGINATION_CURSOR_SECRET`; no `DB_LOCK_TIMEOUT_MS` | 03-L02 `<db-env>` (`TASK-551-03-L02…md:1130-1137`) |
| `M-ambient` | `DATABASE_URL` only | 05-L01 profile `task551-db-migration-test` (fence `TASK-551-05-L01…md:1107-1139`); 05-L01 writes no closed form and its suites read only `DATABASE_URL` (class B/D gates, **V3-4**) |
| `M-none` | `DATABASE_URL=postgresql://127.0.0.1:1/none` | 03-L02 `<none-env>` (`:1126-1128`); precedent: 03-L02 runs `tests/perf/database-explain-plans.test.ts` with profile `none` (`database-explain-plans-receipt`, `:2049-2052`) |
| `M-redis` | `DATABASE_URL`, `REDIS_URL`, `SERVER_CACHE_BACKEND=redis`, `SERVER_CACHE_NAMESPACE=<the profile's derived task551-* slug>`, plus any key the 10-L01 contract adds to that profile when its suites land | 10-L01 profile `task551-db-redis-test` (fence `:1336`, `:1343`, `:1350`, `:1357`); parent `TASK-551_…md:1066-1068` (fixed backend, derived namespace); provisional until the four suites exist |

**Per-suite assignment (the 21 suites of the current set).** The owner is
the leaf whose fence `allowlist` holds the path (**V2-3** owner column; for
generic rows, verified by fence scan at this tree). No owning command of
these 21 carries a non-path flag, so the plain argv has no extra flag.

| Suite | Class | Owner (allowlist) | Map |
| --- | --- | --- | --- |
| `tests/integration/server/task551ActionExecutionStore.test.ts` | A | TASK-551-06-L01 | `M-fixture-lock` (decision) |
| `tests/integration/server/task551AppendHeavyRetention.test.ts` | A | TASK-551-06-L01 | `M-fixture-lock` (decision) |
| `tests/perf/database-retention-batches.test.ts` | A | TASK-551-06-L01 | `M-fixture-lock` (decision) |
| `tests/integration/server/task551RevisionConcurrency.test.ts` | A | TASK-551-06-L02 | `M-fixture-lock` |
| `tests/integration/server/task551RevisionRetention.test.ts` | A | TASK-551-06-L02 | `M-fixture-lock` |
| `tests/perf/database-revision-budgets.test.ts` | A | TASK-551-06-L02 | `M-fixture-lock` |
| `tests/perf/database-retention-jobs.test.ts` | A | TASK-551-06-L03 | `M-fixture-lock` |
| `tests/perf/database-partition-readiness.test.ts` | A | TASK-551-06-L03 | `M-fixture-lock` |
| `tests/integration/server/task551RetentionJobService.test.ts` | B | TASK-551-06-L03 | `M-fixture-lock` |
| `tests/integration/runtime/retentionScheduler.test.ts` | B | TASK-551-06-L03 | `M-fixture-lock` |
| `tests/perf/database-pool-telemetry.test.ts` | A | TASK-551-02-L03 | `M-fixture` |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` | B | TASK-551-05-L03 | `M-fixture` |
| `tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts` | B | TASK-551-05-L01 | `M-ambient` |
| `tests/integration/server/task551ConcurrencyConstraints.test.ts` | B | TASK-551-05-L01 | `M-ambient` |
| `tests/integration/server/task551IndexAndConstraintCatalog.test.ts` | B | TASK-551-05-L01 | `M-ambient` (blocked, **V5-6**) |
| `tests/integration/server/task551SchemaMigrationParity.test.ts` | B | TASK-551-05-L01 | `M-ambient` (blocked, **V5-6**) |
| `tests/integration/server/task551SearchVectorMigration.test.ts` | B | TASK-551-05-L01 | `M-ambient` |
| `tests/perf/database-index-write-overhead.test.ts` | B | TASK-551-05-L01 | `M-ambient` |
| `tests/integration/server/task551OnlineIndexDeployment.test.ts` | D | TASK-551-05-L01 | `M-ambient` |
| `tests/perf/database-explain-plans.test.ts` | C | TASK-551-05-L02 | `M-none` (decision) |
| `tests/perf/task489-solution-kit-run-predecessor-plans.test.ts` | C | TASK-551-05-L02 | `M-none` (decision) |

Count: 21 (9 A, 9 B, 2 C, 1 D), matching **V3-4**.

**Suites that join the set later** (static entries not on disk at this tree;
each is classified by grep at run time, **V3-4**):

| Suite | Owner | Map | Owning flags |
| --- | --- | --- | --- |
| `tests/integration/routes/task551BoundedAdminLists.test.ts`, `tests/integration/server/task551AdminWriteConcurrency.test.ts` | TASK-551-03-L02 | `M-03l02` | none |
| `tests/integration/server/task551DatabaseLifecycleRealDb.test.ts`, `tests/integration/server/task551DedicatedSessionGuards.test.ts` | TASK-551-02-L02 | `M-fixture-lock` | none |
| `tests/integration/server/task551SearchRankedQueries.test.ts` | TASK-551-04-L01 | `M-fixture` | none |
| `tests/integration/server/task551AssistantDocsCandidateQuery.test.ts` | TASK-551-04-L02 | `M-fixture` | none |
| the four class-E suites of **V4-4** | TASK-551-10-L01 | `M-redis` | `--timeout 120000` (`:1335`, `:1342`, `:1349`) or `--timeout 180000` (`task551TwoProcessRedisSmoke`, `:1356`) |

Any other joining suite takes the map of its `allowlist` owner by the same
rule. A suite whose owner cannot be resolved from the fences blocks.

**Decisions recorded.**

- 06-L01 writes no closed form. Orchestrator decision 1 assigns the 06-family
  map, so its three suites get `M-fixture-lock`.
- 02-L03, 05-L03, 04-L01 and 04-L02 write no closed form either. They get
  `M-fixture` (the written base form, with no extra key they do not name).
- Class C is owned by 05-L02, whose profile `task551-phase-05-l02` is an L11
  phase context, distinct from the generic profiles (parent `TASK-551_…md:1078-1080`),
  that only the L11 broker supplies. A plain run cannot reproduce it.
  Its live halves are gated only by in-process injection (**V3-4**), so the
  plain run uses `M-none` and must PASS. Its live proof stays with 05-L02 and
  the TASK-489 predecessor owners, unchanged.

#### V5-3 Serialization of database-wide observers (decision 3; audit A M2, audit B M2)

Some suites assert, or mutate, database-wide state that no schema, marker, or
fixture scoping can isolate. While any suite on this list runs, no other
DB-touching gate may run against `coderso02`. That covers every other leaf's
owner-map gate (06-L02 gate 2/R8, 06-L03 gate 3, 03-L02 `<db-env>`, the 02-L02
closed form, and the 05-L01/10-L01 migration tests), any runtime smoke or lane
run on `DATABASE_URL3`, and any manual session other than the orchestrator's
**V5-4** read-only checks, which run before the suite starts.

| Suite | Owner | Database-wide observer (anchor, working tree) |
| --- | --- | --- |
| `tests/integration/server/task551RetentionJobService.test.ts` | TASK-551-06-L03 | reads `pg_locks` for the fixed production lock 551063/3 (`:128-131`; constants `core/services/maintenance/retentionJobService.ts:182-183`) and takes that lock itself (`:417`, `:726`); asserts that the `pg_stat_activity` active-backend count for `current_database()` equals a baseline (`:148-149`; `:481`, `:551`, `:605`, `:655`, `:697`, `:781`); reads the unqualified `pg_stat_user_tables` counter (`:156`); runs the whole-family revunit apply (06-L02 G4, `TASK-551-06-L02…md:1251-1256`) |
| `tests/integration/runtime/retentionScheduler.test.ts` | TASK-551-06-L03 | real-DB legs read `pg_locks` for lock 551063/3 (`:77-81`) |
| `tests/integration/server/task551RevisionConcurrency.test.ts` | TASK-551-06-L02 | 50-way autosave storms (`:511-602`) under the I2 lock timeout (`TASK-551-06-L02…md:1474-1482`); concurrent sessions change both lock waits and budgets |
| `tests/integration/server/task551RevisionRetention.test.ts` | TASK-551-06-L02 | whole-family read-only guard with an exact count (06-L02 G4, `:1251-1256`) |
| `tests/perf/database-index-write-overhead.test.ts` | TASK-551-05-L01 | drops and recreates the fixed-name shadow schema `task551_overhead` (`:33`, `:156`) |

- Part 1 is strictly sequential anyway (**V5-1**). This rule also forbids
  other leaves' DB gates from overlapping these five suites.
- Growth: before the run, any joining suite is added to this list when it
  reads `pg_stat_activity`, `pg_locks`, `pg_stat_user_tables` or
  `pg_stat_statements`, takes a fixed production advisory lock, runs DDL on a
  fixed-name schema, or asserts a whole-family exact count.
- The retention-lock/backend-count filtering fix proposed by audit A (filter
  by own backend pids or `application_name`) is an optional owner item for
  TASK-551-06-L03, recorded in `handoffs[]`. It is not a precondition:
  serialization is the contract. The **V4-3a** verdict "not affected" for
  `retentionScheduler` holds only for schema qualification.

#### V5-4 Read-only pre-run checks (orchestrator)

Before the first part-1 run, and again before each **V5-3** suite when any
other DB gate ran on `coderso02` in between, the orchestrator runs these
checks in one `READ ONLY` transaction with a statement timeout. It records
counts only.

1. **No worker schemas.** The count of `pg_namespace` rows whose `nspname`
   matches `^bun_worker_[0-9]+$` must be 0. If it is not 0, STOP and raise an
   owner item. This contract never drops a schema, because a worker schema
   makes the unqualified **V4-3a** lookups return duplicates.
2. **Zero collateral.** Re-take the 06-L02 G4 counts (`TASK-551-06-L02…md:1248-1266`).
   Both must be 0.
3. **Online indexes present.** The 89 members of
   `core/db/migrations/0081_task551_online_indexes.sql` exist on `coderso02`
   with `indisvalid AND indisready` (06-L02 G3, `:1233-1246`). A missing or
   invalid member is an environment STOP, not a suite verdict.

#### V5-5 Lane-runner verification at 01-L01 FINAL only (decision 2; audit B M3/M4, audit B L-pool)

- **Target.** A dedicated worker database named by the owner. Never
  `coderso02`/`DATABASE_URL3`, and never the shared `DATABASE_URL`. This is
  an OPEN OWNER ITEM (`lane-runner-worker-database`). Until the owner names
  the database, the 01-L01 FINAL regeneration STOPs after step 3 of **V5-1**.
  The initial regeneration and **V4-1** command regenerations do not wait on it.
- **Form, once named.** Run the lane runner once over the **V2-6** step-1
  scratch manifest:
  `bun --env-file=/dev/null scripts/run-bun-parallel.ts --lane all --no-retry --workers <N> --pool <P> --report .tmp/task551-reopen-v2/precondition-report.json`,
  with `BUN_LANE_MANIFEST_PATH=.tmp/task551-reopen-v2/precondition-manifest.json`,
  `DATABASE_URL` and `DATABASE_DIRECT_URL` set to the named database (a direct
  URL, `scripts/bun-lane-worker-url.ts:150`), and NO
  `TASK551_FIXTURE_*` key. This mirrors the real lane: class-A DB legs skip
  there, and their DB proof is part 1. `P >= 2`, because the
  `task551RetentionJobService` affinity gate needs `poolMax >= 2`
  (`core/db/client.ts:287`; suite `:97-108`). `N` is at least the lane-aware
  `worker_count_too_low` minimum (4 for `--lane all`), and `N x P <= 10`
  (`scripts/run-bun-parallel.ts:19-28`), for example `--workers 4 --pool 2`.
- **Verdict.** Any worker `exit` other than 0 blocks. `attempted` is copied
  for information only. `{ name: "a", files: [], exit: 0, attempted: 0 }` is a
  legal entry. Attribution re-runs a failed worker's files once by name
  (**V2-6** step 2 rule, kept). With no fixture keys, a class-A failure can
  never come from a fixture-URL collision.
- **Known FINAL owner items** (recorded in `handoffs[]`, not preconditions
  of the initial regeneration):
  - (a) The online indexes are not journaled. `scripts/bun-lane-migrate.ts:9-10`
    applies only `_journal.json` entries, and the journal holds only the
    transactional `0081_task551_search_indexes_constraints_outbox` (`:562`).
    So the online-index catalog legs of `task551IndexAndConstraintCatalog`
    and `task551SchemaMigrationParity` find 0 rows in any worker schema.
    TASK-551-05-L01 must decide one of two options: replay the 0081 online
    statements into each worker schema as recorded environment provisioning,
    or name those legs lane-incompatible.
  - (b) The **V4-3a** schema-qualification handoffs (TASK-551-05-L01,
    TASK-551-06-L03).
  - (c) The **V5-3** observers across concurrent workers. The owner decides
    either to serialize those suites into one worker or to land the
    pid/`application_name` filter.

#### V5-6 Blocked suites and STOP (decisions 4 and 5; audit B L-indexdef)

The regeneration (the classifier command) does not run while any suite in
the recomputed set is on this list. A row clears only when its owner's fix
or decision has landed and the suite's part-1 row meets the class table. A
blocked row is never recorded as `"pass"`.

| Suite | Owner | Reason (verified from source; not executed) | Handoff reason |
| --- | --- | --- | --- |
| `tests/integration/server/task551IndexAndConstraintCatalog.test.ts` | TASK-551-05-L01 | The online-index leg compares `pg_get_indexdef` with the quoted, unqualified manifest `createSql` minus ` CONCURRENTLY` (`:165-175`; manifest `tests/perf/fixtures/task551OnlineIndexManifest.ts:43`, `"page_revisions_page_version_idx" ON "page_revisions" USING btree ("page_id","version")`). PostgreSQL renders unquoted identifiers, `ON public.<table>`, and `(a, b)` (compare the expected text at `:184`). The leg cannot pass on `coderso02`, where G3 provisioned all 89 members. | `catalog-indexdef-rendering:tests/integration/server/task551IndexAndConstraintCatalog.test.ts` |
| `tests/integration/server/task551SchemaMigrationParity.test.ts` | TASK-551-05-L01 | Same comparison (`:106-107`, `:331-340`) | `catalog-indexdef-rendering:tests/integration/server/task551SchemaMigrationParity.test.ts` |
| the four class-E suites (**V4-4**) | TASK-551-10-L01; the owner provisions `REDIS_URL` | `REDIS_URL` is absent from the worktree `.env` (key-name count 0). This blocks the 10-L01 regeneration when they join, not 01-L01, because 10-L01 depends on `TASK-551-01-L01:final` (`TASK-551-10-L01…md:1211`). | `service-missing:REDIS_URL` |

- If the part-1 run of a listed suite passes as the class table requires,
  the row clears on that evidence. The verdict above is a prediction from
  source, not a receipt.
- Any other suite whose part-1 row fails or skips for a reason outside
  01-L01 joins this list under its **V2-3**/**V3-1** owner, by the same rule.
- Decision on the orchestrator's example `task551OnlineIndexDeployment`
  ("ungated"): verified NOT blocked. It has no DB leg to skip. Its only
  `postgres(...)` handle targets `postgresql://127.0.0.1:1/none` and is never
  connected (`:69`, `:832`), and it reads no DATABASE_URL. It stays class D:
  it must PASS in part 1 and in the map-free run (**V2-6** verdict, kept).
  The online-index dependency that does block is the rendering row above.
- Decision 4: the **V4-3a** schema-qualification handoffs remain owner
  items in `handoffs[]`. They are not preconditions. With part 2 removed and
  **V5-4** check 1 green, the part-1 lookups see only `public`.
- Consequence for land order: the 01-L01 initial regeneration waits on
  TASK-551-05-L01 for the two rendering rows (audit A L2).

#### V5-7 Remaining LOW closures

- **V4-1 condition 6** (audit B): the command is not available to a leaf
  whose envelope `forbiddenPaths` contains `tests/bun-lane-manifest.json`.
  At this tree that is TASK-551-01-L02 (`TASK-551-01-L02…md:3588-3595`).
- **V4-1 condition 2** now reads: "It runs only after the **V5-1**
  precondition is green for the to-be-added set recomputed at that moment."
- **Anchor refresh** (at `03d42b90`, where the TASK-551-11 re-open step 1
  split the dispatch library). `allowlist_cross_owner` is at
  `_docs/_workflows/lib/task-551-dispatch-contract.mjs:271`, and `:955-960`
  is its `ee4c7f93` anchor. The profile enum is at
  `_docs/_workflows/lib/task-551-dispatch-envelope.mjs:74-83`. The error
  prefix is at `_docs/_workflows/lib/task-551-dispatch-primitives.mjs:12`.
  The **V4-1** rule is unchanged in substance.
- **`resolveWorkerEnv` anchor** (audit A INFO): the spread is
  `scripts/bun-lane-worker-url.ts:152-161`, not `run-bun-parallel.ts`. The
  v4 bullet that carries it is superseded (**V5-10**).
- **V4-6 step wording** (audit B): the precondition replaces the **V2-6**
  steps 2 and 4. Step 3 (map-free) stays (**V5-10**).

#### V5-8 Receipt addendum (additive; replaces the V4-5 `laneRunnerRun` timing)

- `preRegenerationLaneRun[]`: `{ path, gatingClass, envMap, ownerMap, mapFree, blocked? }`.
  `envMap` is the **V5-2** map id. `ownerMap` is `"pass" | "skip" | "fail"`.
  `mapFree` is `"pass" | "skip" | "fail" | "not-applicable"` (the last for
  class `service` only). `blocked` is `{ taskId, reason }` for a **V5-6** row.
- `preRunChecks`: `{ workerSchemaCount, g4Counts: [n, n], onlineIndexesValid }`,
  counts only.
- `serializedSuites: [path]` (the **V5-3** members that ran).
- `laneRunnerRun` is written only at 01-L01 FINAL (**V5-5**):
  `{ ownerDecisionDate, noRetry: true, workers, pool, results: [{ name, files, exit, attempted }] }`.
  It never names the database. The initial and **V4-1** receipts omit it.
- `handoffs[]` gains the **V5-3** optional filter item, the **V5-5** owner
  items (a)-(c), and the **V5-6** rows.

The entry still holds no environment values, URLs, DB identities, SQL, or
fixture data.

#### V5-9 Envelope, line gate, land order

- **Envelope.** No fence byte changes, in this file or elsewhere. The
  **V4-1** 10-L01 mirror is unchanged.
- **Line gate.** v5 changes no source or test projection (**V4-6**, kept).
- **Land order.** 01-L01 initial runs these steps in order:
  1. source and test edits;
  2. fast gates;
  3. **V5-4** checks;
  4. **V5-1** part-1 runs (sequential, **V5-3**);
  5. map-free run;
  6. STOP if any **V5-6** row remains;
  7. the literal classifier command with the one-path proof;
  8. airtight gates.

  01-L01 FINAL runs the same steps, with the **V5-5** lane-runner run added
  after the map-free run. It STOPs there until the owner names the worker
  database.

#### V5-10 Superseded sentences (quoted; superseded from this date)

- `:3088-3089` (**V4-1** condition 2): "It runs only after the **V4-2**
  precondition is green for the to-be-added set recomputed at that moment."
  Replaced by **V5-7** (the **V5-1** precondition).
- `:3139-3140` (**V4-1**): "The orchestrator runs the **V4-2** precondition
  before it dispatches `bun-lane-classify`." Replaced by: the **V5-1**
  precondition.
- `:3169-3171` (**V4-2** part 1): "For every suite in the recomputed
  to-be-added set, run one plain command, one suite per process, in the
  closed owner-map environment:" and the template `:3173-3179`, which sets
  `DATABASE_DIRECT_URL` and one key list for all suites. Replaced by
  **V5-1** step 2 with the per-suite **V5-2** maps. `DATABASE_DIRECT_URL` is
  never set.
- `:3181-3182` (**V4-2**): "The orchestrator reads the values from `.env` in
  its own shell and never echoes or records them." Refined by **V5-2**:
  fixture name and sentinel are orchestrator constants. Only `DATABASE_URL3`,
  `PAGINATION_CURSOR_SECRET` and `REDIS_URL` come from `.env`.
- `:3195-3197` (**V4-2** part 2): "After part 1 is green for every suite,
  run the runner once over the scratch manifest from **V2-6** step 1, in the
  same closed env:" and the command `:3199-3206`. Removed from the
  precondition (**V5-1**). The FINAL-only form is **V5-5**.
- `:3208-3211` (**V4-2**): "It is mandatory here, so every worker has
  `attempted: 1`. The receipt still copies `attempted` from the report. A
  value other than 1 invalidates the run." Removed. `attempted` is
  informational (**V5-5**).
- `:3212-3215` (**V4-2**): the `--workers`/`--pool` bullet. Replaced by
  **V5-5** (`P >= 2`, `N x P <= 10`).
- `:3218-3221` (**V4-2**): "Provisioning drops and re-migrates exactly
  `bun_worker_0..K-1` on `DATABASE_URL3` and leaves them in place after the
  run (`scripts/bun-lane-provision.ts:50-67`). This is why **V4-3a** (M2)
  matters. `DATABASE_URL3` is the owner-approved lane database (2026-09-24)."
  Replaced by: no provisioning on `DATABASE_URL3`, ever (**V5-1**). The owner
  approval covers the part-1 runs only.
- `:3222-3225` (**V4-2**): the worker-spawn observation bullet, with the
  misattributed anchor "`resolveWorkerEnv` spreads the base env, `:152-161`".
  It moves to **V5-5**, and the anchor is `scripts/bun-lane-worker-url.ts:152-161`.
- `:3226-3231` (**V4-2**): "A suite that passes part 1 but fails only in its
  worker has a lane-isolation defect. It is handed off to the suite's owner,
  with **V4-3a** as the first suspect." Replaced by **V5-5**: FINAL only, no
  fixture keys, owner items (a)-(c) first.
- `:3233-3234` (**V4-2**): "Part 1 runs, then the map-free run, then part 2,
  then the literal classifier command." Replaced by the **V5-9** land order.
- `:3312-3314` (**V4-3a**): "That applies to part 2 always, and to part 1
  once any lane run has provisioned them (**V4-2**)." Replaced by: part 2 is
  removed, and **V5-4** check 1 keeps part 1 free of worker schemas.
- `:3335-3339` (**V4-3a**): "The other five class-B suites
  (`task551CacheInvalidationOutboxSchema`, `task551ConcurrencyConstraints`,
  `task551SolutionKitRollbackAuthoritySchema`, `retentionScheduler`, and
  `database-index-write-overhead`) have no such lookup, so they get no
  handoff." Kept for schema qualification only. `retentionScheduler` and
  `database-index-write-overhead` join **V5-3**.
- `:3340-3343` (**V4-3a**): "Until each handoff lands, that suite's catalog
  legs may fail in part 1 or part 2. That failure blocks regeneration under
  the **V3-4** blocking rule." Replaced by **V5-6** (decision 4). The
  handoffs are owner items, not preconditions, and the blocked list governs.
- `:3351` (**V4-4** table, class E owner-map cell): "(and the 10-L01
  profile's other keys)". Replaced by `M-redis` and the owning `--timeout`
  flags (**V5-2**).
- `:3353-3354` (**V4-4**): "a skip, a fail, or a missing `REDIS_URL` in part
  1 or part 2 blocks regeneration and is a handoff to TASK-551-10-L01."
  Replaced by: in part 1 (**V5-6** row).
- `:3374-3376` (**V4-5**): "`laneRunnerRun`: `{ noRetry: true, workers: [{
  name, files, exit, attempted }] }`, copied from the part-2 report
  `results`, plus `attributedFailures: [{ path, worker }]` when a worker
  failed;". Replaced by the **V5-8** FINAL-only shape. `attributedFailures`
  stays for FINAL.
- `:3397-3399` (**V4-6**): "v4 lands with the v2/v3 source and test edits,
  under the **V2-10** order. The **V4-2** precondition replaces the **V2-6**
  steps 2-4 runs in step 3 of that order." Replaced by the **V5-9** land
  order: steps 2 and 4 are replaced, and step 3 (map-free) stays.
- `:2738-2739` (**V2-10** receipt, missed by **V4-7**): "The entry adds
  `preRegenerationLaneRun` as `[{ path, ownerMap, mapFree }]`, where each
  value is `"pass" | "skip" | "fail"`." Replaced by the **V5-8** shape and
  unions.

### Amendment v6 (2026-09-26)

Recorded at HEAD `66203e22` from the two v5 audit results (A: 3 MEDIUM,
4 LOW, 1 INFO; B: 3 MEDIUM, 2 LOW) and the orchestrator dispositions D5,
D6 (i)-(viii), D8 and D9 of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`.
The dispositions decide; this section records them as contract text and
does not re-decide them. Every anchor below was re-read at this tree. The
tree was dirty with in-flight 06-L02 code and test edits (among them
`tests/integration/server/task551RetentionJobService.test.ts`), the
TASK-551-11 re-open step 3, and sibling task-file amendments of this round.
None of them is part of this amendment. v6 is append-only. It supersedes v5
(and the earlier clauses v5 kept) only where stated, and **V6-9** quotes
every superseded sentence with its current line. Every clause not quoted
there stays binding. No fence byte of this file changes, and no source or
test file changes.

#### V6-1 Interim lane red set and the FORBIDDEN lane target (D6 (i); audit A M1)

**Scope.** Between the 01-L01 initial regeneration and 01-L01 FINAL, the
tracked `tests/bun-lane-manifest.json` carries the suites that the initial
regeneration added. `bun run test`, `bun run test:bun` and
`bun run test:full` source `.env` and run
`scripts/run-bun-parallel.ts --lane all` over that manifest
(`package.json:28`, `:29`, `:30`). GitHub CI is not affected: its
`test:bun:lane` step (`package.json:39`,
`.github/workflows/coderso-pr-gates.yml:135`) runs `scripts/run-bun-lane.ts`,
which reads no manifest.

**Defect 1: `task551SearchVectorMigration` stays BLOCKED.**
`tests/integration/server/task551SearchVectorMigration.test.ts:204-210`
looks up the generated column by `c.relname = ${member.table}` with no
schema filter and asserts `toHaveLength(1)`. The runner provisions every
`bun_worker_0..K-1` schema before any worker runs
(`scripts/run-bun-parallel.ts:271`, `scripts/bun-lane-provision.ts:54-67`),
so in a lane run the lookup returns K + 1 rows and the leg fails. The fence
owner is TASK-551-05-L01 (`allowlist`, `TASK-551-05-L01…md:1059`;
TASK-551-04-L01 `:486` and TASK-551-04-L02 `:223` hold the path in
`forbiddenPaths`). The suite joins the **V5-6** blocked list (row in
**V6-5**), with the owner item
`catalog-schema-qualification:tests/integration/server/task551SearchVectorMigration.test.ts`
for TASK-551-05-L01. The row clears only when BOTH hold: the 05-L01
schema-qualified lookup (the **V4-3a** handoff form, for example
`c.relnamespace = current_schema()::regnamespace`) has landed, and the
suite's part-1 row meets the class table. Part-1 evidence alone does not
clear this row. The part-1 run sees only `public` (**V5-4** check 1), so it
cannot show the lane defect. While the row stands, the suite never enters
the manifest and the classifier command does not run (**V5-6** rule).

**Defect 2: `task551RetentionJobService` is fixed by 06-L02 R13 and joins
normally.** `tests/integration/server/task551RetentionJobService.test.ts:156`
reads `n_tup_del` from `pg_stat_user_tables where relname = ${relname}`
inside a scalar subquery. With worker schemas present the subquery returns
several rows and raises "more than one row returned". Per D5 the lookup
gains `schemaname = current_schema()` in 06-L02 R13. The suite therefore
joins the set by the ordinary rule, and no blocked row is written for it.
Its **V5-3** row stays, because its `pg_locks` and `pg_stat_activity`
observers are database-wide and the fix does not change them. Fence note:
the `allowlist` owner of the file is TASK-551-06-L03
(`TASK-551-06-L03…md:326`). The assignment of this edit to 06-L02 R13 is
the orchestrator's D5 decision and is recorded here as given.

**Interim red set, per suite.** These are predictions from source, not
receipts. A lane run between the initial regeneration and FINAL is expected
to show exactly these rows, and none of them may be read as a regression:

| Suite | Lane prediction | Cause (anchor) | Clears when |
| --- | --- | --- | --- |
| `tests/integration/server/task551SearchVectorMigration.test.ts` | absent from the manifest (BLOCKED) | Defect 1 (`:204-210`) | the 05-L01 schema qualification lands and part 1 passes (**V6-5**) |
| `tests/integration/server/task551RetentionJobService.test.ts` | red until 06-L02 R13 lands; afterwards red only under worker contention | Defect 2 (`:156`); its `pg_stat_activity` baseline (`:148-149`) and lock 551063/3 (`:128-131`) race `retentionScheduler` in a concurrent worker | 06-L02 R13 (D5); the contention part is **V5-5** owner item (c) |
| `tests/integration/runtime/retentionScheduler.test.ts` | red only under worker contention | its `pg_locks` read of lock 551063/3 (`:77-81`) races the job-service suite | **V5-5** owner item (c); after 06-L03 A1-b these legs move to the real-db split (**V6-4**) |
| `tests/integration/server/task551IndexAndConstraintCatalog.test.ts`, `tests/integration/server/task551SchemaMigrationParity.test.ts` | absent while their **V5-6** rendering rows stand; once they join, red in worker schemas | 0 online indexes in a worker schema (**V5-5** (a)); unqualified lookups (**V4-3a** table) | the 05-L01 (a) decision and the **V4-3a** handoff land |
| every class-A suite of **V5-2** and **V6-5** | skip, not red | the lane sets no `TASK551_FIXTURE_*` key | by design; the DB proof is part 1 |

**FORBIDDEN.** `bun run test`, `bun run test:bun`, `bun run test:full`, and
any direct `scripts/run-bun-parallel.ts` invocation are FORBIDDEN whenever
the `DATABASE_DIRECT_URL` that the invocation will see resolves to
`coderso02`. The runner drops and re-migrates `bun_worker_0..K-1` on that
target (`scripts/run-bun-parallel.ts:271`), and on `coderso02` that makes
**V5-4** check 1 STOP permanently, because this contract never drops a
schema. The package-script forms take `DATABASE_DIRECT_URL` from the
sourced `.env` (key-name count 1 in the worktree `.env` and in the root
`.env`; no value read by this amendment). Before any such invocation the
orchestrator decides, in its own shell and without echoing or recording the
value, whether the database-name path segment of that URL equals
`coderso02`. It records only the boolean. `true` or undetermined means
FORBIDDEN (fail closed). The only lane-runner form this contract runs is
the FINAL form of **V6-6**. The **V5-1** rule that the runner is never run
against `DATABASE_URL3` stays.

#### V6-2 Owner item `lane-runner-worker-database` is RESOLVED (D6 (ii), D9; audit A M2 and INFO)

- **Resolution.** The owner's 2026-09-24 grant ("DATABASE_URL i
  DATABASE_URL3 ... oba sa wolne i nie uzywane") answers the item. The FINAL
  lane-runner worker database is the target of the `DATABASE_URL` key of
  the root `.env` (`/home/coder/project/Coderso/.env`, key-name count 1).
  The item is recorded as RESOLVED, not open.
- **Use.** The orchestrator sets `DATABASE_URL` and `DATABASE_DIRECT_URL` to
  that target for the **V6-6** run only, in the closed `env -i` form, and
  for the **V6-6** attribution re-runs of that run. It never prints, echoes
  or records the value. Receipts never name the database (**V5-8**, kept).
  If the target resolves to `coderso02`, the **V6-1** FORBIDDEN rule applies
  and the run STOPs with an owner item.
- **Direct URL.** Worker spawn asserts a direct URL
  (`scripts/bun-lane-worker-url.ts:150`; the pooled-port default applies,
  because `DATABASE_POOLED_PORT` has key-name count 0). A failure there is a
  run error: STOP and raise an owner item. No other URL is ever substituted.
- **Worker schemas.** Provisioning drops and re-migrates exactly
  `bun_worker_0..K-1` on that target and leaves them in place
  (`scripts/bun-lane-provision.ts:50-67`). They are additive to the
  target's other schemas, and this contract never drops them by hand.
  **V5-4** check 1 stays scoped to `coderso02` and is not run against this
  target.
- **Serialization (D9).** The run, including its attribution re-runs, is
  serialized with every runtime smoke on that database target: no smoke and
  no dev host may use the target while the runner runs. The D9 rule of at
  most one `coderso02` DB gate at a time does not govern this target.
- **Mirrors.** D6 (ii) is mirrored as a family-closure precondition in the
  parent's dated section (D9) and in TASK-551-10-L02, each written by that
  file's own writer. This file does not edit them.

#### V6-3 Map `M-fixture-lock-rd` and its value-source rule (D6 (iii); audit A M3, audit B M1)

- **Map.** `M-fixture-lock-rd` = the keys of `M-fixture-lock` plus
  `CODERSO_DB_REPLICA_ID=test-<run>`, where `<run>` is 12 lowercase hex
  characters. Source contract: 02-L02 R8.6
  (`TASK-551-02-L02…md:3038-3053`). Its RD gate sets that key, and the RD
  file's `beforeAll` FAILS (it does not skip) when the owner map is present
  and the key is absent or does not match `/^test-[0-9a-f]{12}$/u`
  (`:3051-3053`).
- **Assignment.** Both 02-L02 joiners take `M-fixture-lock-rd`:
  `tests/integration/server/task551DatabaseLifecycleRealDb.test.ts` and
  `tests/integration/server/task551DedicatedSessionGuards.test.ts`
  (**V6-5**).
- **Value-source rule (new category).** `CODERSO_DB_REPLICA_ID` is an
  orchestrator-generated per-run value. It is never read from `.env` (the
  worktree and root `.env` have key-name count 0 for it). The orchestrator
  generates a fresh value for each part-1 process in its own shell and never
  echoes it. Receipts record the map id only, never the value.
- **Serialization.** The RD suite joins **V5-3** through the growth rule
  (row in **V6-4**).

#### V6-4 V5-3 serialization: sixth row, RD growth, `pg_locks` hand-over (D6 (iv), (iii), (vii); audit B M2, audit B L1)

**Sixth row (added to the **V5-3** table).**

| Suite | Owner | Database-wide observer (anchor, working tree) |
| --- | --- | --- |
| `tests/integration/server/task551AppendHeavyRetention.test.ts` | TASK-551-06-L01 | runs the table-wide production pruners with no marker scope at the frozen 2036 clock (`RETENTION_CLOCK`, `:106`; for example `pruneExpiredAuthArtifactsBatch(…, RETENTION_CLOCK, db)`, `:616`, whose service predicate is `lt(passwordResets.expiresAt, cutoff)` with no marker filter, `core/services/auth/expiredAuthArtifactRetentionService.ts:199`); asserts exact `matched`/`deleted` ledgers (`:620-622`, and the same pattern across `:468-897`). A concurrent gate can lose aged rows to these deletes, and its rows break the exact ledgers |

- "five" becomes "six": the **V5-3** rule forbids other leaves' DB gates
  from overlapping these six suites and every suite added by the growth rule
  (quote in **V6-9**).
- Owner item for TASK-551-06-L01, recorded in `handoffs[]` as
  `retention-ledger-marker-scope:tests/integration/server/task551AppendHeavyRetention.test.ts`:
  marker-scope the ledgers. It is not a precondition; serialization is the
  contract.
- **RD suite by the growth rule.** When
  `tests/integration/server/task551DatabaseLifecycleRealDb.test.ts` joins,
  it is added to **V5-3**. Its 02-L02 contract reads `pg_stat_activity`
  (residue checks and the observer client
  `t551rd-observer-<run>`, `TASK-551-02-L02…md:3053-3056`) and cancels or
  terminates backends in the R7.4 drain (D1). The other joiners of **V6-5**
  are classified by the growth rule at run time.
- **`pg_locks` hand-over.** Once 06-L03 A1-b lands
  (`TASK-551-06-L03…md:1348-1351`; post-split table `:1614-1619`, where
  `retentionScheduler.test.ts` is pure with 0 fail, 0 skip), the
  `retentionScheduler.test.ts` row of **V5-3** passes to
  `tests/integration/runtime/retentionScheduler-real-db.test.ts`, with the
  same observer (lock 551063/3 via `pg_locks`). `retentionScheduler.test.ts`
  then leaves **V5-3**, and its **V5-2** row is re-classified by grep at run
  time (**V3-4**). The same re-classification applies to
  `tests/perf/database-partition-readiness.test.ts` after A1-a (pure after
  A1-a, `:1618`).

#### V6-5 Per-suite env tables (keys only; D6 (i), (iii), (vii))

**Maps table: added row.** No value appears here or in any receipt.

| Map id | Keys | Source contract |
| --- | --- | --- |
| `M-fixture-lock-rd` | `DATABASE_URL`, `TASK551_FIXTURE_DATABASE_URL`, `TASK551_FIXTURE_DATABASE_NAME`, `TASK551_FIXTURE_DATABASE_SENTINEL`, `DB_LOCK_TIMEOUT_MS=15000`, `CODERSO_DB_REPLICA_ID=test-<run>` (orchestrator-generated per run, **V6-3**) | 02-L02 R8.6 (`TASK-551-02-L02…md:3038-3053`) |

The `M-fixture-lock` source cell no longer cites the 02-L02 closed form
(quote in **V6-9**). Its 06-L03 and 06-L02 sources stand.

**Per-suite assignment: changed row.** The other 20 rows of the **V5-2**
table are unchanged.

| Suite | Class | Owner (allowlist) | Map |
| --- | --- | --- | --- |
| `tests/integration/server/task551SearchVectorMigration.test.ts` | B | TASK-551-05-L01 | `M-ambient` (blocked, **V6-1**) |

**Suites that join the set later (restated in full; replaces the **V5-2**
table).**

| Suite | Owner | Map | Owning flags |
| --- | --- | --- | --- |
| `tests/integration/routes/task551BoundedAdminLists.test.ts`, `tests/integration/server/task551AdminWriteConcurrency.test.ts` | TASK-551-03-L02 | `M-03l02` | none |
| `tests/integration/server/task551DatabaseLifecycleRealDb.test.ts`, `tests/integration/server/task551DedicatedSessionGuards.test.ts` | TASK-551-02-L02 | `M-fixture-lock-rd` | none |
| `tests/integration/server/task551SearchRankedQueries.test.ts` | TASK-551-04-L01 | `M-fixture` | none |
| `tests/integration/server/task551AssistantDocsCandidateQuery.test.ts` | TASK-551-04-L02 | `M-fixture` | none |
| `tests/integration/runtime/retentionScheduler-real-db.test.ts` (06-L03 A1-b split) | TASK-551-06-L03 (`allowlist` `:330`) | `M-fixture-lock` | none (argv `:372`) |
| `tests/perf/database-partition-readiness-catalog.test.ts` (06-L03 A1-a split) | TASK-551-06-L03 (`allowlist` `:329`) | `M-fixture-lock` | none (argv `:416`) |
| `tests/perf/database-revision-candidate-bounds.test.ts` | TASK-551-06-L02 (`allowlist` `:340`) | `M-fixture-lock` | none (argv `:380`) |
| the four class-E suites of **V4-4** | TASK-551-10-L01 | `M-redis` | `--timeout 120000` (`:1335`, `:1342`, `:1349`) or `--timeout 180000` (`task551TwoProcessRedisSmoke`, `:1356`) |

The **V5-2** rule that any other joining suite takes the map of its
`allowlist` owner, and that an unresolvable owner blocks, stays.

**Blocked list: added row (to the **V5-6** table).**

| Suite | Owner | Reason (verified from source; not executed) | Handoff reason |
| --- | --- | --- | --- |
| `tests/integration/server/task551SearchVectorMigration.test.ts` | TASK-551-05-L01 | `pg_attrdef`/`pg_class`/`pg_attribute` lookup by `c.relname` with no schema filter, `toHaveLength(1)` (`:204-210`). It fails in any lane run with worker schemas present. It clears only on the landed qualification plus a passing part-1 row (**V6-1**), never on part-1 evidence alone. | `catalog-schema-qualification:tests/integration/server/task551SearchVectorMigration.test.ts` |

The 01-L01 initial regeneration therefore waits on TASK-551-05-L01 for
three rows: the two rendering rows and this one. The owner item must reach
TASK-551-05-L01 through a dated 05-L01 note before the row can clear
(**V6-7**).

#### V6-6 V5-5 FINAL form, worker `.env` observation, attribution (D6 (vi); audit A L2, audit B L2)

**Form.** Run once from the worktree root over the **V2-6** step-1 scratch
manifest, under **V6-2**:

```text
env -i PATH="$PATH" HOME="$HOME" \
  DATABASE_URL=<ROOT_DATABASE_URL> DATABASE_DIRECT_URL=<ROOT_DATABASE_URL> \
  BUN_LANE_MANIFEST_PATH=.tmp/task551-reopen-v2/precondition-manifest.json \
  bun --env-file=/dev/null scripts/run-bun-parallel.ts --lane all --no-retry \
    --workers <N> --pool <P> --report .tmp/task551-reopen-v2/precondition-report.json
```

- `<ROOT_DATABASE_URL>` is the value of the root `.env` key `DATABASE_URL`,
  built in the orchestrator's shell and never echoed (**V6-2**).
- The listed keys are exactly these three. No `TASK551_FIXTURE_*`,
  `CODERSO_DB_REPLICA_ID`, `DB_LOCK_TIMEOUT_MS`, `REDIS_URL`,
  `DB_MAINTENANCE_*` or `PII_*` key is set.
- `N` and `P` keep the **V5-5** bounds: `P >= 2`, `N >= 4` for
  `--lane all`, `N x P <= 10` (for example `--workers 4 --pool 2`).

**Worker `.env` observation (not a gate; the anchor that **V5-10** moved
here).** Each worker is spawned as
`bun test --parallel=1 --timeout=15000 <files>` without
`--env-file=/dev/null` (`scripts/run-bun-parallel.ts:166`). Its `env` comes
from `resolveWorkerEnv`, which spreads the base env and then sets
`NODE_ENV`, `DATABASE_URL` (the worker URL form), `DATABASE_DIRECT_URL`,
`DB_POOL_MAX` and `BUN_TEST_WORKER_INDEX`
(`scripts/bun-lane-worker-url.ts:152-161`). The worker Bun process
therefore auto-loads the worktree `.env` for every key the spawn env does
not set. The closed form is closed only for the keys it sets. "No
`TASK551_FIXTURE_*` key" holds only while the worktree `.env` has no such
key name. Immediately before the run the orchestrator counts key names only
(no values) in the worktree `.env` for `TASK551_FIXTURE_`,
`CODERSO_DB_REPLICA_ID`, `REDIS_URL` and `DB_MAINTENANCE_` (each 0 at this
tree) and STOPs if any count is not 0. Keys that do reach workers from
`.env` (at this tree for example `DATABASE_URL3`,
`PAGINATION_CURSOR_SECRET` and the two `PII_*` keys) are recorded by key
name only. This matches the real lane, whose package scripts source the
same `.env`.

**Attribution.** For each file of a worker whose `exit` is not 0, run one
process per file, strictly one at a time, still under the **V6-2**
serialization:

```text
env -i PATH="$PATH" HOME="$HOME" \
  DATABASE_URL=<worker URL form of ROOT_DATABASE_URL for worker i> \
  DATABASE_DIRECT_URL=<ROOT_DATABASE_URL> NODE_ENV=test DB_POOL_MAX=<P> \
  bun --env-file=/dev/null test --timeout=15000 <one file of worker i>
```

- The worker URL form is `buildWorkerDatabaseUrl(<ROOT_DATABASE_URL>, i)`
  (`scripts/bun-lane-worker-url.ts:61-66`): the direct URL plus
  `options=-csearch_path=bun_worker_<i>` (URL-encoded, joined with `?` or
  `&`). The `bun_worker_<i>` schema is the one the run left in place.
- `NODE_ENV=test` and `DB_POOL_MAX=<P>` mirror the worker env
  (`scripts/bun-lane-worker-url.ts:154-157`); `--timeout=15000` mirrors the
  worker argv (`scripts/run-bun-parallel.ts:166`).
- A file that fails in its worker but passes here has a lane-isolation
  defect. It is handed off to the suite's owner, with **V5-5** owner items
  (a)-(c) as the first suspects (**V5-5**, kept). The receipt keeps
  `attributedFailures: [{ path, worker }]` (**V5-10**, kept).

#### V6-7 V5-9 FINAL order and the 05-L01 note (D6 (vi), (viii); audit A L3)

- **01-L01 initial.** The **V5-9** order stands (steps 1-8). Step 6 now
  covers the added **V6-5** blocked row.
- **01-L01 FINAL** runs, in this order:
  1. source and test edits;
  2. fast gates;
  3. **V5-4** checks;
  4. **V5-1** part-1 runs (sequential, **V5-3** with the **V6-4** rows);
  5. map-free run;
  6. STOP if any **V5-6** or **V6-5** blocked row remains;
  7. **V2-6** step 1: write the scratch manifest
     `.tmp/task551-reopen-v2/precondition-manifest.json`;
  8. the **V6-1** FORBIDDEN check, the **V6-6** key-name count, and the
     **V6-2** serialization (no runtime smoke or dev host on the target);
  9. the **V6-6** lane-runner run, then attribution re-runs for any
     non-zero worker `exit`; any non-zero `exit` blocks;
  10. the literal classifier command with the one-path proof;
  11. airtight gates.

  FINAL no longer STOPs on a missing owner decision (**V6-2**).
- **05-L01 re-open note (D8).** The dated, append-only 05-L01 note that
  names the manifest rendering fix (quoted, unqualified `createSql` against
  `pg_get_indexdef`; `task551IndexAndConstraintCatalog`,
  `task551SchemaMigrationParity`) and the **V5-5** (a) decision on online
  indexes in worker schemas is written in this round by the orchestrator's
  sibling writer. It is the handoff that the 01-L01 initial regeneration
  consumes (**V5-6**). This file does not edit the 05-L01 task file. The
  **V6-1** schema-qualification item for `task551SearchVectorMigration`
  reaches 05-L01 through a dated 05-L01 note as well (that note or a later
  one). Until it does, the **V6-5** row cannot clear.

#### V6-8 Receipt addendum (additive)

- `preRegenerationLaneRun[].envMap` may take the value
  `M-fixture-lock-rd`. The generated `CODERSO_DB_REPLICA_ID` value is never
  recorded.
- `preRegenerationLaneRun[].blocked` covers the **V6-5** row with
  `{ taskId: "TASK-551-05-L01", reason: "catalog-schema-qualification:tests/integration/server/task551SearchVectorMigration.test.ts" }`.
- `serializedSuites` includes the **V6-4** rows that ran.
- `handoffs[]` gains the **V6-1** SearchVectorMigration item and the
  **V6-4** 06-L01 item `retention-ledger-marker-scope:tests/integration/server/task551AppendHeavyRetention.test.ts`.
- `laneRunnerRun.ownerDecisionDate` is `2026-09-24` (**V6-2**). The entry
  still never names the database.

The entry still holds no environment values, URLs, DB identities, SQL, or
fixture data.

#### V6-9 Superseded sentences (v6)

Quoted verbatim with their current lines (line breaks folded to spaces).
The quoted text is authoritative for what is superseded.

**Completing V5-10 (D6 (v)).**

- `:3429-3432` (**V4-7**), which reads: "`:2949-2950` (**V3-4**): "The
  class decides the required result in each run." and the column header
  "Owner-map run (step 2)" (`:2952`). Refined: the owner-map verdict is the
  **V4-2** part-1 plain run. Part 2 is judged per worker." Replaced by: the
  owner-map verdict is the **V5-1** step-2 plain run under its **V5-2** or
  **V6-5** map. There is no part 2. The FINAL-only **V6-6** lane-runner run
  is judged per worker `exit`.
- `:3440-3443` (**V4-7**), which reads: "`:2597-2599` (**V2-6**): "`bun
  scripts/bun-lane-classify.ts` may write `tests/bun-lane-manifest.json`
  only after every to-be-added suite has passed through the real lane
  runner." Replaced by: only after **V4-2** parts 1 and 2 are green."
  Replaced by: only after the **V5-1** precondition is green and no
  **V5-6**/**V6-5** row remains; at 01-L01 FINAL also after the **V6-6**
  run (**V6-7**).
- `:3444-3449` (**V4-7**), which reads: "`:2621-2629` (**V2-6** step 2, the
  owner-map run through `scripts/run-bun-parallel.ts`, already refined by
  **V3-6**): replaced by **V4-2**. The per-suite verdict comes from part 1,
  and part 2 adds `--no-retry` and records per-worker exits. The rule "When
  a worker holding several files fails, re-run each of its files once by
  name to attribute the failure." stays." Replaced by: **V2-6** step 2 is
  replaced by the **V5-1** step-2 plain runs. `--no-retry` and the
  per-worker exits belong to the FINAL-only **V6-6** run. The attribution
  rule stays for that run only, in the **V6-6** form.
- `:2712-2713` (**V2-10**): "The regeneration is repeated at 01-L01 FINAL
  with the same precondition, the same literal command, and the same
  one-path proof." Replaced by: 01-L01 FINAL follows the **V6-7** order: the
  same **V5-1** precondition, then the scratch manifest and the **V6-6**
  lane-runner run, then the same literal command and one-path proof.

**v5 sentences.**

- `:3503-3504` (**V5-1**): "Lane-runner semantics are verified only at
  01-L01 FINAL, on a dedicated worker database named by the owner
  (**V5-5**)." Replaced by: only at 01-L01 FINAL, on the root `.env`
  `DATABASE_URL` target (**V6-2**).
- `:3534` (**V5-2** maps table, `M-fixture-lock` source cell, last clause):
  "02-L02 closed form (`TASK-551-02-L02…md:1198`)". Removed. The 02-L02
  joiners take `M-fixture-lock-rd`, sourced at
  `TASK-551-02-L02…md:3038-3053` (**V6-3**, **V6-5**).
- `:3578` (**V5-2** later-joiners row): "| `tests/integration/server/task551DatabaseLifecycleRealDb.test.ts`, `tests/integration/server/task551DedicatedSessionGuards.test.ts` | TASK-551-02-L02 | `M-fixture-lock` | none |".
  Replaced by the **V6-5** row (`M-fixture-lock-rd`). The whole
  later-joiners table is restated in **V6-5**.
- `:3612` (**V5-3** row): "| `tests/integration/runtime/retentionScheduler.test.ts` | TASK-551-06-L03 | real-DB legs read `pg_locks` for lock 551063/3 (`:77-81`) |".
  Refined: it holds until 06-L03 A1-b lands, and then the row belongs to
  `retentionScheduler-real-db.test.ts` (**V6-4**).
- `:3617-3618` (**V5-3**): "Part 1 is strictly sequential anyway
  (**V5-1**). This rule also forbids other leaves' DB gates from overlapping
  these five suites." Replaced by: "these six suites and every suite added
  by the growth rule" (**V6-4**). The first sentence stays.
- `:3649-3652` (**V5-5** Target): "**Target.** A dedicated worker database
  named by the owner. Never `coderso02`/`DATABASE_URL3`, and never the
  shared `DATABASE_URL`. This is an OPEN OWNER ITEM
  (`lane-runner-worker-database`). Until the owner names the database, the
  01-L01 FINAL regeneration STOPs after step 3 of **V5-1**." Replaced by
  **V6-2**: the item is RESOLVED, and the target is the root `.env`
  `DATABASE_URL` target, never `coderso02`. The following sentence (`:3653`)
  stays.
- `:3654-3660` (**V5-5** Form): "**Form, once named.** Run the lane runner
  once over the **V2-6** step-1 scratch manifest: `bun --env-file=/dev/null
  scripts/run-bun-parallel.ts --lane all --no-retry --workers <N> --pool <P>
  --report .tmp/task551-reopen-v2/precondition-report.json`, with
  `BUN_LANE_MANIFEST_PATH=.tmp/task551-reopen-v2/precondition-manifest.json`,
  `DATABASE_URL` and `DATABASE_DIRECT_URL` set to the named database (a
  direct URL, `scripts/bun-lane-worker-url.ts:150`), and NO
  `TASK551_FIXTURE_*` key." Replaced by the **V6-6** closed `env -i` form
  and the **V6-6** key-name count. The rest of the bullet (from "This
  mirrors the real lane", `:3660-3665`) stays.
- `:3668-3669` (**V5-5** Verdict): "Attribution re-runs a failed worker's
  files once by name (**V2-6** step 2 rule, kept)." Refined by the **V6-6**
  attribution command.
- `:3700-3701` (**V5-6**): "If the part-1 run of a listed suite passes as
  the class table requires, the row clears on that evidence." Refined: this
  does not apply to the **V6-5** SearchVectorMigration row, which clears
  only as **V6-1** states.
- `:3711-3712` (**V5-6** Decision 4): "Decision 4: the **V4-3a**
  schema-qualification handoffs remain owner items in `handoffs[]`. They are
  not preconditions." Refined: this holds for the
  `task551IndexAndConstraintCatalog` and `task551SchemaMigrationParity`
  handoffs. The `task551SearchVectorMigration` handoff is a BLOCKED row
  (**V6-1**, **V6-5**), and the `task551RetentionJobService` lookup is fixed
  by 06-L02 R13 (D5). The next sentence (`:3712-3713`) stays.
- `:3714-3715` (**V5-6**): "Consequence for land order: the 01-L01 initial
  regeneration waits on TASK-551-05-L01 for the two rendering rows (audit A
  L2)." Replaced by: it waits on TASK-551-05-L01 for the two rendering rows
  and the SearchVectorMigration row (**V6-5**, **V6-7**).
- `:3770-3772` (**V5-9**): "01-L01 FINAL runs the same steps, with the
  **V5-5** lane-runner run added after the map-free run. It STOPs there
  until the owner names the worker database." Replaced by the **V6-7**
  FINAL order.

### Amendment v7 (2026-09-26)

Recorded at HEAD `420bb24a` from the two v6 audit results (A: 1 HIGH,
6 MEDIUM, 4 LOW, 1 INFO; B: 1 HIGH, 4 MEDIUM, 5 LOW, 1 INFO) and the
orchestrator decisions Addendum A1, A5, B1, C1, C2, C3 (a)-(k) and C7 of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`.
The dispositions decide; this section records them as contract text and
does not re-decide them. Every anchor below was re-read at this tree. The
tree was dirty with in-flight 06-L02 code and test edits (among them
`tests/integration/server/task551RetentionJobService.test.ts`, whose `:156`
still reads `pg_stat_user_tables where relname = ${relname}` with no schema
filter), TASK-551-11 step-4 files, audit-evidence records, and sibling
task-file amendments of this round. None of them is part of this
amendment. v7 is append-only. It supersedes v6 (and the earlier clauses v6
kept) only where stated, and **V7-10** quotes every superseded sentence
with its current line. Every clause not quoted there stays binding. No
fence byte of this file changes, and no source or test file changes.
Environment facts below are key-name counts or orchestrator booleans only;
no environment value was read, printed or recorded for this amendment.

**Label rule (C2).** "06-L03 A8 (2026-09-26)" names the section the 06-L03
writer added on 2026-09-26 (at this tree it starts at
`TASK-551-06-L03…md:1625` under its pre-relabel heading; its `:156` item is
at `:1992`). This file never cites that section by any other label.

#### V7-1 FINAL worker database is the direct endpoint of the `DATABASE_URL` target (C1; audit A HIGH, audit B HIGH)

- **Defect in v6.** v6 set both `DATABASE_URL` and `DATABASE_DIRECT_URL` to
  the root `.env` `DATABASE_URL`, which is the pooled endpoint (port 6432).
  The runner provisions first:
  `await provisionWorkers(process.env.DATABASE_DIRECT_URL, flags.workers)`
  (`scripts/run-bun-parallel.ts:271`) drops each `bun_worker_<i>` with
  `cascade` and re-migrates it (`scripts/bun-lane-provision.ts:74`). Only
  after that does it build the worker environments (`:275`), where
  `resolveWorkerEnv` calls
  `assertDirectUrl(directUrl, Number(baseEnv.DATABASE_POOLED_PORT ?? 6432))`
  (`scripts/bun-lane-worker-url.ts:150`). So `:150` is not a preflight:
  with a pooled URL the DDL has already run through the pooler when it
  throws. The v6 attribution form never reaches `:150` at all.
- **Target.** The FINAL lane-runner worker database is the direct
  (non-pooled) endpoint of the `DATABASE_URL` target of the root `.env`
  (`/home/coder/project/Coderso/.env`): the value of its
  `DATABASE_DIRECT_URL` key (key-name count 1), written `<ROOT_DIRECT_URL>`
  in this contract. It is the same database target the owner granted
  (D6 (ii)), reached through its direct endpoint. Orchestrator check
  2026-09-26, booleans only (C1): same host TRUE, same database TRUE,
  direct port ≠ 6432 TRUE, database is `coderso02` FALSE.
- **Use.** The orchestrator assigns `<ROOT_DIRECT_URL>` to the shell
  variable `ROOT_DIRECT_URL` in its own shell, from the root `.env`, without
  echoing, printing or recording it. Both `DATABASE_URL` and
  `DATABASE_DIRECT_URL` are set to `"$ROOT_DIRECT_URL"` (quoted) in the
  **V7-6** run and in its **V7-6** attribution re-runs, and nowhere else.
  The attribution worker URL is built from the same variable (**V7-6**).
  `<ROOT_DATABASE_URL>` no longer appears in any form of this contract.
- **Pre-provisioning step (new; FINAL step 9 in **V7-7**).** Immediately
  before the lane-runner invocation, a command that prints booleans only
  compares the root `.env` `DATABASE_URL` and `"$ROOT_DIRECT_URL"` and the
  orchestrator records four booleans by name:
  1. `directSameHost`: the host of `<ROOT_DIRECT_URL>` equals the host of
     the root `DATABASE_URL`;
  2. `directSameDatabase`: their database-name path segments are equal;
  3. `directPortNotPooled`: the port of `<ROOT_DIRECT_URL>` is not `6432`
     (the `:150` default applies: `DATABASE_POOLED_PORT` has key-name
     count 0 in the worktree and root `.env`, and the runner itself runs
     with `--env-file=/dev/null`);
  4. `directDatabaseNotCoderso02`: the database-name path segment of
     `<ROOT_DIRECT_URL>` is not `coderso02`. This is the **V6-1** FORBIDDEN
     check for this run; C1's "database is coderso02 FALSE" is this
     boolean TRUE.

  STOP before any provisioning if any boolean is FALSE or undetermined; the
  STOP raises an owner item and is never a skipped gate. The step exists
  because `provisionWorkers` runs DDL (`scripts/run-bun-parallel.ts:271`)
  before `assertDirectUrl` (`scripts/bun-lane-worker-url.ts:150`, reached
  from `:275`). The attribution re-runs use the same variable, so the same
  four booleans cover them; if the variable is re-assigned, the step is
  repeated first.
- **Mirrors.** Parent item 3 and TASK-551-10-L02 mirror "the direct
  (non-pooled) endpoint of the `DATABASE_URL` target" through their own
  writers (C1, C4). This file does not edit them.

#### V7-2 `task551RetentionJobService` is fixed by 06-L03 A8 (Addendum A1, C2, C3 (a); audit A M, audit B M)

- Every "06-L02 R13" attribution of the `:156` edit in this file becomes
  "fixed by 06-L03 A8 (Addendum A1; per R13-4 (i) text)". The sites are
  `:3899`, `:3903-3904`, `:3909-3910`, `:3919` (two cells) and
  `:4269-4270`: six occurrences on five lines. The remaining site that C3
  (a) counts, TASK-551-10-L02 `:1825`, belongs to that file's writer (C4).
- `:3909-3910` is replaced by: "D5's assignment of this edit to 06-L02 is
  withdrawn by Addendum A1; the `allowlist` owner TASK-551-06-L03
  (`TASK-551-06-L03…md:326`) makes the `schemaname = current_schema()` edit
  in 06-L03 A8 (2026-09-26)."
- State at this tree: not landed (`:156` is unqualified, see the preamble).
  Until it lands, the suite is red in any lane run with worker schemas
  present, as v6 predicted. The suite still joins by the ordinary rule once
  it lands; no blocked row is written for it (v6 **V6-1**, kept).

#### V7-3 Result-shape blocked rows (Addendum A5, B1, C3 (b), C7; audit A M, audit B M)

drizzle over postgres-js returns the row array itself, with no `.rows`
property. The three suites below read `.rows`, so their DB legs fail in
part 1 as well, not only in lane runs. They join the **V5-6** blocked list
by its growth rule. Each row clears only when its owner's fix has landed
(a `rowsOf` that returns the array, with no fallback; the 05-L01 R1 item 1
form, `TASK-551-05-L01…md:1314`, `:1356`) and the suite's part-1 row meets
the class table (**V5-6** rule).

**Blocked list: added rows (to the **V5-6** table).**

| Suite | Owner | Reason (verified from source; not executed) | Handoff reason |
| --- | --- | --- | --- |
| `tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts` | TASK-551-05-L01 (`allowlist`, `TASK-551-05-L01…md:1060`) | `:248` reads `(result as unknown as { rows: … }).rows` and asserts `toHaveLength(2)`; `:274-275` read `.rows ?? []` and then `row.plan`, but the EXPLAIN output column is `QUERY PLAN` (the fix reads `row["QUERY PLAN"]`, C6). Part of the 05-L01 R1 edit (Addendum A5, B4). | `result-shape:tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts` |
| `tests/perf/database-index-write-overhead.test.ts` | TASK-551-05-L01 (`allowlist`, `:1064`) | `:151` reads `.rows[0]` on the array and throws a `TypeError`. Part of the 05-L01 R1 edit (Addendum A5, B4). | `result-shape:tests/perf/database-index-write-overhead.test.ts` |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` | TASK-551-05-L03 (`allowlist`, `TASK-551-05-L03…md:802`; 05-L01 holds it in `forbiddenPaths`, `TASK-551-05-L01…md:1073`) | The local helper `rowsOf` (`:1013`) returns `(result as { rows: T[] }).rows`, which is `undefined`; its readers throw (first at `:1745`, `rowsOf<…>(result)[0]?.total`). The fix follows the same no-fallback `rowsOf` rule as 05-L01 R1 (B1). | `result-shape:tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` |

- **05-L03 owner item (C7).** TASK-551-05-L03 is `⏳ To Do`
  (`TASK-551-05-L03…md:10`). The item is recorded here and in the
  dispositions file; 05-L03 writes its own dated note when it re-opens.
  This file does not edit the 05-L03 task file.
- **V5-2 map cells.** The three rows read `M-fixture` (blocked, **V7-3**)
  (`:3559`), `M-ambient` (blocked, **V7-3**) (`:3560`) and `M-ambient`
  (blocked, **V7-3**) (`:3565`). Class and owner are unchanged (**V7-8**).
- **Count and land order.** Six blocked rows now hold the 01-L01 initial
  regeneration: the two rendering rows, the SearchVectorMigration row and
  the three result-shape rows. Five wait on TASK-551-05-L01 (its R1-R3
  test-only edit, five files per Addendum B4) and one waits on
  TASK-551-05-L03. The class-E rows of **V5-6** stay
  on the list and hold 10-L01, not 01-L01 (**V5-6**, kept).

#### V7-4 Interim red set, Defect 1, FORBIDDEN outcome (C3 (c), (h), (j); audit A M/L, audit B L)

**Defect 1 reason, extended (C3 (h)).**
`tests/integration/server/task551SearchVectorMigration.test.ts` also reads
`.rows` at `:209`, `:221`, `:238` and `:247`. So its part-1 run fails even
in `public`, not only in a lane run. The 05-L01 R3 item already covers both
parts (`TASK-551-05-L01…md:1438-1440`: qualify `:204-207`, read the four
sites through `rowsOf`). The row clears only when that R3 edit has landed
and the part-1 row meets the class table. The v6 rule that part-1 evidence
alone never clears this row stays.

**Interim red set, per suite (restated in full; replaces the **V6-1**
table).** Predictions from source, not receipts. A lane run between the
initial regeneration and FINAL is expected to show exactly the rows of this
table. None of them may be read as a regression, except where the table
says a red is a finding.

| Suite | Lane prediction | Cause (anchor) | Clears when |
| --- | --- | --- | --- |
| `tests/integration/server/task551SearchVectorMigration.test.ts` | absent from the manifest (BLOCKED) | Defect 1 (`:204-210`); `.rows` reads (`:209`, `:221`, `:238`, `:247`) | the 05-L01 R3 edit lands and part 1 passes (**V6-5**, amended here) |
| `tests/integration/server/task551RetentionJobService.test.ts` | red until 06-L03 A8 lands; afterwards red only under worker contention | Defect 2 (`:156`); its `pg_stat_activity` baseline (`:148-149`) and lock 551063/3 (`:128-131`) race `retentionScheduler` in a concurrent worker | 06-L03 A8 (Addendum A1; per R13-4 (i) text); the contention part is **V5-5** owner item (c), a FINAL precondition (**V7-7** step 8) |
| `tests/integration/runtime/retentionScheduler.test.ts` | red only under worker contention | its `pg_locks` read of lock 551063/3 (`:77-81`) races the job-service suite | **V5-5** owner item (c); after 06-L03 A1-b these legs move to the real-db split (**V6-4**) |
| `tests/integration/server/task551IndexAndConstraintCatalog.test.ts`, `tests/integration/server/task551SchemaMigrationParity.test.ts` | absent while the **V5-6** rows stand; after joining (05-L01 R1 + R2 landed) expected green in worker schemas; a red is a finding | 05-L01 R2 pins zero manifest members in a `bun_worker_*` session schema instead of expecting them (`TASK-551-05-L01…md:1383-1392`; "neither suite is part of the D6 (i) interim lane red set", `:1429-1430`) | not in the red set once joined |
| `tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts`, `tests/perf/database-index-write-overhead.test.ts`, `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` | absent from the manifest (BLOCKED) | result shape (**V7-3**) | **V7-3** |
| every class-A suite of **V5-2** and **V6-5** | skip, not red | the lane sets no `TASK551_FIXTURE_*` key | by design; the DB proof is part 1 |

**FORBIDDEN outcome (C3 (j)).** When the **V6-1** check returns `true` (or
cannot decide) for a gate that must run through a package script or the
lane runner, for example the TASK-551-10-L01 `full-bun-test` gate, the
result is an owner item to repoint the `.env` `DATABASE_DIRECT_URL` of the
checkout that runs the gate. It is never a skipped gate and never a pass.
The only lane-runner form this contract runs is the FINAL form of **V7-6**.

#### V7-5 Exclusion on the target during FINAL (C3 (e); audit A M, audit B L)

While the FINAL lane-runner run and its attribution re-runs are in
progress, nothing else may use the **V7-1** target: no other
`scripts/run-bun-parallel.ts` invocation; no `bun run test`,
`bun run test:bun` or `bun run test:full` (`package.json:28`, `:29`, `:30`)
from any checkout whose `.env` resolves to that target, the root checkout
included; no `scripts/bun-lane-provision.ts`; no dev host; no runtime smoke;
no other DB gate. A concurrent provisioning run drops `bun_worker_<i>` with
`cascade` (`scripts/bun-lane-provision.ts:74`) under the running workers, and
a dev host's retention scheduler contends for lock 551063/3. This extends the
**V6-2** serialization bullet. The D9 rule of at most one `coderso02` DB gate
at a time is unchanged and still does not govern this target.

#### V7-6 FINAL form, scratch manifest, key-name count, per-worker attribution (C1, C3 (d), (g); audit A M/L, audit B M/L)

**Scratch manifest (C3 (d)).** For 01-L01 FINAL,
`.tmp/task551-reopen-v2/precondition-manifest.json` holds every row that
the 01-L01 initial regeneration added to the tracked manifest, united with
the FINAL to-be-added set (fresh in-process classification rows minus the
committed rows). Both parts are classified in process with the exported
`classify` (**V2-6** step 1). The file is written under `.tmp` only, never
to the tracked `tests/bun-lane-manifest.json`. Without the first part, the
suites the initial regeneration committed (among them
`task551IndexAndConstraintCatalog` and `task551SchemaMigrationParity`, whose
worker branch 05-L01 R2 first proves in this run, `TASK-551-05-L01…md:1426-1428`,
and the **V5-5** (c) contention suites) would be missing from FINAL.

**Form.** Run once from the worktree root over that scratch manifest, under
**V6-2**, **V7-1** and **V7-5**:

```text
env -i PATH="$PATH" HOME="$HOME" \
  DATABASE_URL="$ROOT_DIRECT_URL" DATABASE_DIRECT_URL="$ROOT_DIRECT_URL" \
  BUN_LANE_MANIFEST_PATH=.tmp/task551-reopen-v2/precondition-manifest.json \
  bun --env-file=/dev/null scripts/run-bun-parallel.ts --lane all --no-retry \
    --workers <N> --pool <P> --report .tmp/task551-reopen-v2/precondition-report.json
```

- `ROOT_DIRECT_URL` is the **V7-1** shell variable, never echoed.
- The **V6-6** bullets on the three listed keys and on the `N`/`P` bounds
  stay.

**Key-name count (extended).** Immediately before the run, and again
before the attribution re-runs, the orchestrator counts key names only (no
values) in the worktree `.env` for `TASK551_FIXTURE_`,
`CODERSO_DB_REPLICA_ID`, `REDIS_URL`, `DB_MAINTENANCE_`,
`DB_LOCK_TIMEOUT_MS`, `DB_PGBOUNCER_MODE`, `DATABASE_POOLED_PORT` and
`SERVER_CACHE_`. Each is 0 at this tree, in the worktree and in the root
`.env`. It STOPs if any count is not 0. Keys that reach workers from `.env`
(at this tree `DATABASE_URL3`, `PAGINATION_CURSOR_SECRET` and the two
`PII_*` keys) are recorded by key name only.

**Worker env observation (refined).** `resolveWorkerEnv` also sets
`BUN_TEST_FENCE_NAMESPACE_OFFSET` when a `fenceOffset` is given
(`scripts/bun-lane-worker-url.ts:158-161`). The runner passes
`fenceOffset = index + 1` for every B, C and perf worker
(`scripts/run-bun-parallel.ts:275`, `:298`, `:308`, `:332`), and it overlays
`PERF_QUIET_ENV` on the perf worker (`:333`;
`scripts/bun-lane-perf-policy.ts:36-39`). Worker `a` is the pure lane: the
runner's env with `DATABASE_URL` and `DATABASE_DIRECT_URL` deleted
(`scripts/run-bun-pure-lane.ts:101-103`), spawned as
`bun test --env-file=/dev/null --parallel=16 --timeout=60000 <files>`
(`:116`).

**Name-to-index rule (C3 (g)).** `b.length` is the number of B partitions,
`max(1, N - 3)` for `--lane all` (`scripts/run-bun-parallel.ts:241-243`;
`scripts/bun-lane-partition.ts:82`). Empty B partitions count although they
spawn no worker (`scripts/run-bun-parallel.ts:287-288`).

| Report worker | Index `i` | Keys beyond the common set | Argv |
| --- | --- | --- | --- |
| `b<k>` | `k` | none | `bun test --parallel=1 --timeout=15000` |
| `c1` | `b.length` (`:276`) | none | same |
| `c2` | `b.length + 1` (`:277`) | none | same |
| `perf` | `perfIndex`: `b.length + 2` when `c2` exists, else `b.length + 1` (`:279`) | `UV_THREADPOOL_SIZE=4`, `BUN_TEST_PERF_QUIET=1` | same |
| `a` | none | no `DATABASE_*` key and no `NODE_ENV`, `DB_POOL_MAX` or `BUN_TEST_*` key | `bun test --env-file=/dev/null --parallel=16 --timeout=60000` |

**Attribution.** For each file of a worker whose `exit` is not 0, run one
process per file, strictly one at a time, from the worktree root, under the
**V7-1** booleans and the **V7-5** exclusion. For `b<k>`, `c1`, `c2` and
`perf`:

```text
env -i PATH="$PATH" HOME="$HOME" \
  BUN_LANE_MANIFEST_PATH=.tmp/task551-reopen-v2/precondition-manifest.json \
  NODE_ENV=test DATABASE_URL="$WORKER_URL" DATABASE_DIRECT_URL="$ROOT_DIRECT_URL" \
  DB_POOL_MAX=<P> BUN_TEST_WORKER_INDEX=<i> BUN_TEST_FENCE_NAMESPACE_OFFSET=<i+1> \
  bun test --parallel=1 --timeout=15000 <one file of that worker>
```

For `perf`, `UV_THREADPOOL_SIZE=4 BUN_TEST_PERF_QUIET=1` are added to the
listed keys. For `a`:

```text
env -i PATH="$PATH" HOME="$HOME" \
  BUN_LANE_MANIFEST_PATH=.tmp/task551-reopen-v2/precondition-manifest.json \
  bun test --env-file=/dev/null --parallel=16 --timeout=60000 <one file of worker a>
```

- `WORKER_URL` is `buildWorkerDatabaseUrl("$ROOT_DIRECT_URL", <i>)`
  (`scripts/bun-lane-worker-url.ts:61-66`), captured into the shell variable
  by command substitution and never printed. The `bun_worker_<i>` schema is
  the one the run left in place.
- The B, C and perf forms run WITHOUT `--env-file=/dev/null`, like the
  worker (`scripts/run-bun-parallel.ts:166`), so the worktree `.env` supplies
  the same unset keys to both. The extended key-name count above guards
  that. The `a` form keeps `--env-file=/dev/null`, like the pure lane.
- `BUN_LANE_MANIFEST_PATH` is listed because every worker env spreads the
  runner's env (`scripts/bun-lane-worker-url.ts:152-153`; the pure lane
  copies it, `scripts/run-bun-pure-lane.ts:101`).
- A file that fails in its worker but passes here has a lane-isolation
  defect and is handed to the suite's owner (**V5-5** owner items (a)-(c)
  first). The receipt keeps `attributedFailures: [{ path, worker }]`
  (**V5-10**, kept).

#### V7-7 FINAL order (C3 (f); audit B M)

- **01-L01 initial.** The **V5-9** order stands (steps 1-8). Step 6 covers
  the **V6-5** and **V7-3** blocked rows.
- **01-L01 FINAL** runs, in this order:
  1. source and test edits;
  2. fast gates;
  3. **V5-4** checks;
  4. **V5-1** part-1 runs (sequential, **V5-3** with the **V6-4** rows);
  5. map-free run;
  6. STOP if any **V5-6**, **V6-5** or **V7-3** blocked row remains;
  7. **V2-6** step 1: write the scratch manifest
     `.tmp/task551-reopen-v2/precondition-manifest.json` as the **V7-6**
     union;
  8. **V5-5** owner item (c) decided and landed (the **V5-3** suites
     serialized into one worker, or a pid/`application_name` filter),
     else STOP. **V5-5** owner item (a) is answered by 05-L01 R2
     (`TASK-551-05-L01…md:1383-1392`), which lands with the R1 edit and so
     has landed by step 6; this run proves its worker branch;
  9. the **V7-1** pre-provisioning booleans; STOP on any FALSE or
     undetermined value;
  10. the **V7-6** key-name count, with the **V6-2** serialization and the
      **V7-5** exclusion in force;
  11. the **V7-6** lane-runner run, then **V7-6** attribution re-runs for
      any non-zero worker `exit`; any non-zero `exit` blocks;
  12. the literal classifier command with the one-path proof;
  13. airtight gates.

  FINAL does not STOP on a missing owner decision about the worker database
  (**V6-2**, **V7-1**). It STOPs at step 8 while owner item (c) has not
  landed, and at step 9 on any failing boolean.

#### V7-8 Per-suite env tables (keys only)

No value appears here or in any receipt.

**Per-suite assignment: changed rows (to the **V5-2** table).** The other
rows of the **V5-2** table, as amended by **V6-5**, are unchanged.

| Suite | Class | Owner (allowlist) | Map |
| --- | --- | --- | --- |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` | B | TASK-551-05-L03 | `M-fixture` (blocked, **V7-3**) |
| `tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts` | B | TASK-551-05-L01 | `M-ambient` (blocked, **V7-3**) |
| `tests/perf/database-index-write-overhead.test.ts` | B | TASK-551-05-L01 | `M-ambient` (blocked, **V7-3**) |

The maps table and the later-joiners table of **V6-5** are unchanged.

**FINAL lane-runner environment (keys only; not a suite map).**

| Process | Keys set | `.env` auto-load |
| --- | --- | --- |
| runner (**V7-6** form) | `PATH`, `HOME`, `DATABASE_URL`, `DATABASE_DIRECT_URL` (both `"$ROOT_DIRECT_URL"`), `BUN_LANE_MANIFEST_PATH` | none (`--env-file=/dev/null`) |
| B, C workers and their attribution | runner keys with `DATABASE_URL` = the worker URL form, plus `NODE_ENV`, `DB_POOL_MAX`, `BUN_TEST_WORKER_INDEX`, `BUN_TEST_FENCE_NAMESPACE_OFFSET` | worktree `.env`, unset keys only (key-name count, **V7-6**) |
| perf worker and its attribution | the B/C keys plus `UV_THREADPOOL_SIZE`, `BUN_TEST_PERF_QUIET` | same |
| `a` worker and its attribution | `PATH`, `HOME`, `BUN_LANE_MANIFEST_PATH` (no `DATABASE_*`) | none (`--env-file=/dev/null`) |
| **V7-1** boolean check | reads root `.env` `DATABASE_URL` and `DATABASE_DIRECT_URL`; prints four booleans | not applicable |

#### V7-9 Receipt addendum (additive)

- `preRegenerationLaneRun[].blocked` also covers the three **V7-3** rows:
  `{ taskId: "TASK-551-05-L01", reason: "result-shape:tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts" }`,
  `{ taskId: "TASK-551-05-L01", reason: "result-shape:tests/perf/database-index-write-overhead.test.ts" }` and
  `{ taskId: "TASK-551-05-L03", reason: "result-shape:tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts" }`.
- `handoffs[]` gains the same three items.
- `laneRunnerRun.directEndpointChecks` records the four **V7-1** booleans
  by name (`directSameHost`, `directSameDatabase`, `directPortNotPooled`,
  `directDatabaseNotCoderso02`), values `true`/`false` only.
- `laneRunnerRun.ownerDecisionDate` stays `2026-09-24`. The entry still
  never names the database.

The entry still holds no environment values, URLs, DB identities, SQL, or
fixture data.

#### V7-10 Superseded sentences (v7)

Quoted verbatim with their current lines (line breaks folded to spaces).
The quoted text is authoritative for what is superseded.

**Earlier amendments.**

- `:2616-2617` (**V2-6** step 1): "1. **Scratch manifest.** Classify
  exactly the to-be-added rows in process, using the exported `classify`
  (`scripts/bun-lane-classify.ts:694`, `:744`)." Refined for 01-L01 FINAL:
  the scratch manifest holds the **V7-6** union. The rest of the step stays.
- `:3559` (**V5-2** row): "| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` | B | TASK-551-05-L03 | `M-fixture` |".
  Replaced by the **V7-8** row (`M-fixture` (blocked, **V7-3**)).
- `:3560` (**V5-2** row): "| `tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts` | B | TASK-551-05-L01 | `M-ambient` |".
  Replaced by the **V7-8** row (`M-ambient` (blocked, **V7-3**)).
- `:3565` (**V5-2** row): "| `tests/perf/database-index-write-overhead.test.ts` | B | TASK-551-05-L01 | `M-ambient` |".
  Replaced by the **V7-8** row (`M-ambient` (blocked, **V7-3**)).
- `:3681-3682` (**V5-5** owner item (b)): "(b) The **V4-3a**
  schema-qualification handoffs (TASK-551-05-L01, TASK-551-06-L03)."
  Refined (C3 (i)): the `task551IndexAndConstraintCatalog` and
  `task551SchemaMigrationParity` qualifications are delivered by 05-L01 R1
  item 3; the `task551SearchVectorMigration` qualification is a BLOCKED row
  (**V6-1**, **V6-5**, **V7-4**; 05-L01 R3); the TASK-551-06-L03 part (the
  `task551RetentionJobService` `:156` lookup) is fixed by 06-L03 A8
  (Addendum A1; per R13-4 (i) text). None of them stays an open FINAL owner
  item.

**v6 sentences.**

- `:3895-3896` (**V6-1** Defect 1): "The part-1 run sees only `public`
  (**V5-4** check 1), so it cannot show the lane defect." Refined: it cannot
  show the lane defect, but it does fail on the `.rows` reads (`:209`,
  `:221`, `:238`, `:247`) until the 05-L01 R3 edit lands (**V7-4**).
- `:3899-3900` (**V6-1** heading): "**Defect 2: `task551RetentionJobService`
  is fixed by 06-L02 R13 and joins normally.**" Replaced by: "fixed by 06-L03
  A8 (Addendum A1; per R13-4 (i) text) and joins normally" (**V7-2**).
- `:3903-3904` (**V6-1**): "Per D5 the lookup gains `schemaname =
  current_schema()` in 06-L02 R13." Replaced by: per Addendum A1 the lookup
  gains `schemaname = current_schema()` in 06-L03 A8 (2026-09-26)
  (**V7-2**).
- `:3909-3910` (**V6-1**): "The assignment of this edit to 06-L02 R13 is
  the orchestrator's D5 decision and is recorded here as given." Replaced
  by the **V7-2** sentence.
- `:3913-3914` (**V6-1**): "A lane run between the initial regeneration and
  FINAL is expected to show exactly these rows, and none of them may be read
  as a regression:" Replaced by the **V7-4** lead-in (the rows of the
  **V7-4** table; a Catalog/Parity red after joining is a finding).
- `:3919` (**V6-1** row): "| `tests/integration/server/task551RetentionJobService.test.ts` | red until 06-L02 R13 lands; afterwards red only under worker contention | Defect 2 (`:156`); its `pg_stat_activity` baseline (`:148-149`) and lock 551063/3 (`:128-131`) race `retentionScheduler` in a concurrent worker | 06-L02 R13 (D5); the contention part is **V5-5** owner item (c) |".
  Replaced by the **V7-4** row.
- `:3921` (**V6-1** row): "| `tests/integration/server/task551IndexAndConstraintCatalog.test.ts`, `tests/integration/server/task551SchemaMigrationParity.test.ts` | absent while their **V5-6** rendering rows stand; once they join, red in worker schemas | 0 online indexes in a worker schema (**V5-5** (a)); unqualified lookups (**V4-3a** table) | the 05-L01 (a) decision and the **V4-3a** handoff land |".
  Replaced by the **V7-4** row (C3 (c)).
- `:3935-3936` (**V6-1** FORBIDDEN): "`true` or undetermined means
  FORBIDDEN (fail closed)." Refined by the **V7-4** FORBIDDEN outcome: an
  owner item to repoint `.env`, never a skipped gate.
- `:3936-3937` (**V6-1** FORBIDDEN): "The only lane-runner form this
  contract runs is the FINAL form of **V6-6**." Replaced by: the FINAL form
  of **V7-6**.
- `:3943-3945` (**V6-2** Resolution): "The FINAL lane-runner worker
  database is the target of the `DATABASE_URL` key of the root `.env`
  (`/home/coder/project/Coderso/.env`, key-name count 1)." Replaced by
  **V7-1**: the direct (non-pooled) endpoint of that target, the root `.env`
  `DATABASE_DIRECT_URL`. The rest of the bullet stays.
- `:3947-3949` (**V6-2** Use): "The orchestrator sets `DATABASE_URL` and
  `DATABASE_DIRECT_URL` to that target for the **V6-6** run only, in the
  closed `env -i` form, and for the **V6-6** attribution re-runs of that
  run." Replaced by the **V7-1** Use bullet (`"$ROOT_DIRECT_URL"`, **V7-6**
  run and attribution only). The rest of the bullet stays.
- `:3953-3956` (**V6-2** Direct URL): "**Direct URL.** Worker spawn asserts
  a direct URL (`scripts/bun-lane-worker-url.ts:150`; the pooled-port
  default applies, because `DATABASE_POOLED_PORT` has key-name count 0). A
  failure there is a run error: STOP and raise an owner item. No other URL
  is ever substituted." Refined: `:150` is a late backstop, not a
  preflight; the **V7-1** booleans gate the run before provisioning. A
  failure at `:150` is still a run error (STOP and owner item). No URL other
  than `<ROOT_DIRECT_URL>` and the worker form built from it is used.
- `:3964-3965` (**V6-2** Serialization): "no smoke and no dev host may use
  the target while the runner runs." Extended by **V7-5**. The first
  sentence of the bullet stays.
- `:4064` (**V6-5** blocked row, reason cell, first sentence):
  "`pg_attrdef`/`pg_class`/`pg_attribute` lookup by `c.relname` with no
  schema filter, `toHaveLength(1)` (`:204-210`)." Extended: plus the `.rows`
  reads at `:209`, `:221`, `:238` and `:247` (05-L01 R3; **V7-4**). The rest
  of the row stays.
- `:4066-4067` (**V6-5**): "The 01-L01 initial regeneration therefore
  waits on TASK-551-05-L01 for three rows: the two rendering rows and this
  one." Replaced by the **V7-3** count: six rows, five on TASK-551-05-L01
  and one on TASK-551-05-L03.
- `:4073-4074` (**V6-6** Form): "**Form.** Run once from the worktree root
  over the **V2-6** step-1 scratch manifest, under **V6-2**:" Replaced by
  the **V7-6** Form lead-in (the **V7-6** union, under **V6-2**, **V7-1**
  and **V7-5**).
- `:4078` (**V6-6** form, second line): "DATABASE_URL=<ROOT_DATABASE_URL>
  DATABASE_DIRECT_URL=<ROOT_DATABASE_URL> \". Replaced by the **V7-6** form
  (`"$ROOT_DIRECT_URL"` for both). The other lines of the block are carried
  unchanged into the **V7-6** form.
- `:4084-4085` (**V6-6**): "`<ROOT_DATABASE_URL>` is the value of the root
  `.env` key `DATABASE_URL`, built in the orchestrator's shell and never
  echoed (**V6-2**)." Replaced by: `ROOT_DIRECT_URL` is the **V7-1** shell
  variable.
- `:4095-4099` (**V6-6** observation): "Its `env` comes from
  `resolveWorkerEnv`, which spreads the base env and then sets `NODE_ENV`,
  `DATABASE_URL` (the worker URL form), `DATABASE_DIRECT_URL`, `DB_POOL_MAX`
  and `BUN_TEST_WORKER_INDEX` (`scripts/bun-lane-worker-url.ts:152-161`)."
  Refined by the **V7-6** worker env observation
  (`BUN_TEST_FENCE_NAMESPACE_OFFSET`, `PERF_QUIET_ENV`, the pure lane).
- `:4103-4106` (**V6-6**): "Immediately before the run the orchestrator
  counts key names only (no values) in the worktree `.env` for
  `TASK551_FIXTURE_`, `CODERSO_DB_REPLICA_ID`, `REDIS_URL` and
  `DB_MAINTENANCE_` (each 0 at this tree) and STOPs if any count is not 0."
  Replaced by the **V7-6** extended key-name count.
- `:4117-4120` (**V6-6** attribution form): "env -i PATH="$PATH"
  HOME="$HOME" \ DATABASE_URL=<worker URL form of ROOT_DATABASE_URL for
  worker i> \ DATABASE_DIRECT_URL=<ROOT_DATABASE_URL> NODE_ENV=test
  DB_POOL_MAX=<P> \ bun --env-file=/dev/null test --timeout=15000 <one file
  of worker i>". Replaced by the two **V7-6** attribution forms and the
  **V7-6** name-to-index table.
- `:4123-4124` (**V6-6**): "The worker URL form is
  `buildWorkerDatabaseUrl(<ROOT_DATABASE_URL>, i)`
  (`scripts/bun-lane-worker-url.ts:61-66`): the direct URL plus". Replaced
  by: `buildWorkerDatabaseUrl("$ROOT_DIRECT_URL", <i>)` (**V7-6**). The rest
  of the bullet stays.
- `:4127-4129` (**V6-6**): "`NODE_ENV=test` and `DB_POOL_MAX=<P>` mirror the
  worker env (`scripts/bun-lane-worker-url.ts:154-157`); `--timeout=15000`
  mirrors the worker argv (`scripts/run-bun-parallel.ts:166`)." Replaced by
  the **V7-6** table and bullets, which mirror the full worker env and argv
  per worker kind.
- `:4137-4138` (**V6-7**): "Step 6 now covers the added **V6-5** blocked
  row." Replaced by: step 6 covers the **V6-5** and **V7-3** rows
  (**V7-7**).
- `:4146-4151` (**V6-7** FINAL steps 7-9): "7. **V2-6** step 1: write the
  scratch manifest `.tmp/task551-reopen-v2/precondition-manifest.json`; 8.
  the **V6-1** FORBIDDEN check, the **V6-6** key-name count, and the
  **V6-2** serialization (no runtime smoke or dev host on the target); 9.
  the **V6-6** lane-runner run, then attribution re-runs for any non-zero
  worker `exit`; any non-zero `exit` blocks;". Replaced by **V7-7** steps
  7-11. Steps 1-6 stay (step 6 as amended in **V7-7**); steps 10-11 become
  **V7-7** steps 12-13.
- `:4155` (**V6-7**): "FINAL no longer STOPs on a missing owner decision
  (**V6-2**)." Refined by the **V7-7** closing paragraph (STOP at steps 8
  and 9).
- `:4172-4173` (**V6-8**): "`preRegenerationLaneRun[].blocked` covers the
  **V6-5** row with `{ taskId: "TASK-551-05-L01", reason:
  "catalog-schema-qualification:tests/integration/server/task551SearchVectorMigration.test.ts"
  }`." Extended (not replaced) by **V7-9**.
- `:4269-4270` (**V6-9**, replacement text for `:3711-3712`): "and the
  `task551RetentionJobService` lookup is fixed by 06-L02 R13 (D5)." Replaced
  by: "and the `task551RetentionJobService` lookup is fixed by 06-L03 A8
  (Addendum A1; per R13-4 (i) text)".
- `:4273-4274` (**V6-9**, replacement text for `:3714-3715`): "Replaced by:
  it waits on TASK-551-05-L01 for the two rendering rows and the
  SearchVectorMigration row (**V6-5**, **V6-7**)." Replaced by: it waits on
  six rows, the two rendering rows, the SearchVectorMigration row and the
  three result-shape rows; five on TASK-551-05-L01 and one on
  TASK-551-05-L03 (**V7-3**, **V7-7**).

### Amendment v8 (2026-09-26)

Recorded at HEAD `74fe8f4e` from the two v7 audit results (A: 0 HIGH,
1 MEDIUM, 5 LOW, 1 INFO; B: 1 HIGH, 1 MEDIUM, 4 LOW, 2 INFO), the parts of
the two 05-L01 second-note audit results that route to this file, and the
orchestrator decisions Addendum E1 (d), E2, E3 and E4 of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`.
The dispositions decide; this section records them as contract text and
does not re-decide them. Every anchor into this file, into source and into
committed task text was re-read at this tree. Four owner texts this section
depends on are being written in this round or are pending: the 05-L01 third
note (Addendum E3), the 05-L03 dated note (Addendum E2), the 02-L02 R11 item
`lane-worker-dedicated-schema-binding` (Addendum E1 (a)-(c), F9) and the
06-L02 R15 O5 item (Addendum E2, F8). They are cited by Addendum item and
name, never by line. 05-L01 anchors below are HEAD lines of its committed
second note, each paired with its heading, because the in-flight third note
shifts them. The tree carried other writers' uncommitted edits to other
task files and the untracked TASK-551-11 re-open evidence; none of them is
part of this amendment. v8 is append-only. It supersedes v7 (and the
earlier clauses v7 kept) only where stated, and **V8-11** quotes every
superseded sentence with its current line. Every clause not quoted there
stays binding. No fence byte of this file changes, and no source or test
file changes. Environment facts below are key-name counts only; no
environment value was read, printed or recorded for this amendment.

#### V8-1 Label anchors by heading (E4; audit A L, audit B INFO)

The v7 label rule (C2) stays: "06-L03 A8 (2026-09-26)" is the only label
this file uses for that section. It is anchored by heading from now on: the
section is 06-L03 `### A8 — 2026-09-26` (`TASK-551-06-L03…md:1625` at this
tree), and its `:156` item is `#### A8-g` (`:1994` at this tree). When a
line number and a heading disagree, the heading decides.

#### V8-2 `DATABASE_*` keys per process (E4; audit A L, audit B M)

The **V7-1** "Use" bullet is restated per process. The **V7-6** forms and
the **V7-8** table were already correct; the prose now matches them.

- **FINAL lane-runner run** (**V7-6** form): both `DATABASE_URL` and
  `DATABASE_DIRECT_URL` are `"$ROOT_DIRECT_URL"`.
- **B, C and perf attribution re-runs** (**V7-6**): `DATABASE_DIRECT_URL`
  is `"$ROOT_DIRECT_URL"`, and `DATABASE_URL` is `"$WORKER_URL"`, built
  from `"$ROOT_DIRECT_URL"` with the same `<i>` that the form sets as
  `BUN_TEST_WORKER_INDEX`.
- **`a` attribution re-runs**: neither key is set (pure lane,
  `--env-file=/dev/null`).
- Nowhere else. The attribution worker URL is still built from the same
  variable, and `<ROOT_DATABASE_URL>` still appears in no form. 10-L02
  mirrors this wording through its own writer (Addendum E5); this file does
  not edit it.

#### V8-3 Owner item `lane-worker-dedicated-schema-binding` (E1 (d); audit B HIGH)

- **Fact (from source; not executed).** Every B, C and perf lane worker
  gets `DATABASE_URL` = the worker URL (an `options` query that sets
  `search_path` to `bun_worker_<i>`, `scripts/bun-lane-worker-url.ts:61-66`,
  `:155`) and a bare `DATABASE_DIRECT_URL` (`:156`). Under 02-L02 R7.2,
  `off + primary` resolves the dedicated target to `DATABASE_DIRECT_URL`
  when it is set (`TASK-551-02-L02…md:2016`, `### R7.2`). So once 02-L02 R7
  has landed, a lane worker's dedicated sessions bind to the `public`
  schema of the target while the suite's fixtures sit in `bun_worker_<i>`.
  The 02-L02 R10.7 URL-query guard rejects a target URL whose query holds
  `options`, so the worker URL cannot simply be passed through.
- **Owner and decision (Addendum E1 (a)-(c); recorded, not re-decided).**
  Owner TASK-551-02-L02, item R11 `lane-worker-dedicated-schema-binding`
  (pending): (a) R10.7 gains one named exception, a query whose only key is
  `options` with the exact value `-csearch_path=bun_worker_<n>`
  (regex-pinned), accepted only when `BUN_TEST_WORKER_INDEX` is set and
  equals `<n>`; (b) the R7.2 `off + primary` dedicated target takes the
  worker `DATABASE_URL`, not `DATABASE_DIRECT_URL`, when
  `BUN_TEST_WORKER_INDEX` is set, so dedicated and control sessions bind to
  `bun_worker_<n>`; (c) an F-leg pins both.
- **Hazard (E1 (d)).** From the landing of 02-L02 R7 until the item lands,
  a lane run on a target executes production pruners
  (`withDedicatedDatabaseSession`,
  `core/services/maintenance/retentionJobService.ts:859`) against that
  target's `public` schema. This includes the interim `bun run test`,
  `bun run test:bun` and `bun run test:full` runs that **V6-1** does not
  forbid. FINAL cannot reach its lane-runner run in that state (**V8-8**
  step 8a).
- The **V7-6** attribution forms already satisfy (a) once it lands:
  `"$WORKER_URL"` is built with the same `<i>` that the form sets as
  `BUN_TEST_WORKER_INDEX`.
- The item joins `handoffs[]` (**V8-10**). It is a FINAL precondition only,
  not a precondition of the 01-L01 initial regeneration.

#### V8-4 V5-5 owner item (a): closing condition, O3, O5 (E2; audit A M; 05-L01 audit B L)

- **Closing condition.** **V5-5** owner item (a) closes only when all of
  these have landed:
  1. 05-L01 R2 (first note), R2.2 and R2.3: the five worker branches of the
     05-L01 handoff row "**V5-5 (a)** owner item, 05-L01 share"
     (`TASK-551-05-L01…md:1866` at HEAD, under
     `### Handoff rows for 01-L01 v7`): the catalog and parity online-index
     legs, the outbox plan leg, the concurrency revision race and the
     concurrency apply-owner race;
  2. the 05-L03 worker-schema branch for **O3**
     (`tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`,
     the SQLSTATE 23505 legs at `:1979`, `:2016` and `:2062`), in the 05-L03
     dated note of this round (Addendum E2);
  3. the 06-L02 worker-schema branch for **O5**
     (`tests/integration/server/task551RevisionConcurrency.test.ts:634`), in
     06-L02 R15 (Addendum E2, F8; pending).
- 05-L01 R2 alone no longer answers (a) (quote in **V8-11**). The condition
  is checked at **V8-8** step 7.
- **Proof.** The FINAL lane-runner run proves the five 05-L01 branches and
  the O3 branch: the suites that carry them are class B (**V5-2**) and run
  in the lane. The O5 leg belongs to a class-A suite (**V5-2**:
  `task551RevisionConcurrency`, `M-fixture-lock`) whose DB legs skip in the
  lane (**V8-7** class-A row).
  For O5, step 7 checks that the 06-L02 R15 edit has landed; the lane run
  does not prove it.
- **Scratch manifest (V7-6), restated.** Without the first part of the
  union, the suites the initial regeneration committed would be missing
  from FINAL. Among them are `task551IndexAndConstraintCatalog`,
  `task551SchemaMigrationParity`, `task551CacheInvalidationOutboxSchema`
  and `task551ConcurrencyConstraints`, whose 05-L01 worker branches (R2,
  R2.2, R2.3) this run first proves; `task551SolutionKitRollbackAuthoritySchema`,
  whose O3 branch it proves; and the **V5-5** (c) contention suites.

#### V8-5 Blocked rows: clearing per the 05-L01 handoff table; concurrency row added (E2, E3; audit A L; 05-L01 audits A HIGH, B HIGH)

**Clearing rule (replaces the V7-3 clearing sentence and the V7-4 Defect-1
R3 citation).** A 05-L01-owned blocked row clears only per its 05-L01
handoff row (`TASK-551-05-L01…md:1850-1866` at HEAD, under
`### Handoff rows for 01-L01 v7`, as restated by the 05-L01 third note,
Addendum E3). Every item that row lists must have landed in the one 05-L01
test-only edit; only then does the suite's part-1 row decide. That row must
be a `pass` with 0 failed and 0 skipped tests, under the suite's map, after
green **V5-4** checks, check 4 included (**V8-6**). A no-fallback `rowsOf`
alone never clears a row. For R1 item 1 the done-check is 14 read sites:
13 single-line grep matches plus the multi-line catalog cast (E3).

| Suite | Clears when (every listed item landed, then the part-1 row passes) |
| --- | --- |
| `tests/integration/server/task551SearchVectorMigration.test.ts` | R3.1-R3.5 (`TASK-551-05-L01…md:1816` at HEAD, `### R3 — SearchVector, restated in full`), with the third-note helper form `deparsedExpected(schema, table, bytes)`: `schema` from `sessionSchema()`, every statement on the `tx` handle (E3). The v6 rule that part-1 evidence alone never clears this row stays. |
| `tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts` | R1 items 1 and 10 and R2.2, with the set-based outbox plan-leg seeding (`insert … select from generate_series`) of the third note (E3); map `M-ambient`. |
| `tests/perf/database-index-write-overhead.test.ts` | R1 items 1 and 11, plus the third-note perf items (E3): each member's `ON "<table>"` rewritten to its paired shadow table; `insertRow`/`updateStatement` parameterised by the suffix table; the bare suffix passed to `relationBytes`. The p95 single-sample ceiling is a recorded limitation, not a clearing item. Map `M-ambient`. |
| `tests/integration/server/task551ConcurrencyConstraints.test.ts` (row added below) | the third-note R2.3 items (E3); map `M-ambient`. |
| `tests/integration/server/task551IndexAndConstraintCatalog.test.ts`, `tests/integration/server/task551SchemaMigrationParity.test.ts` (**V5-6** rendering rows) | the items of their own 05-L01 handoff rows; map `M-ambient`. |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` (TASK-551-05-L03) | the items of the 05-L03 dated note (Addendum E2): the no-fallback `rowsOf` (B1), the O3 worker-schema branch, and the FK-trap item that the suite documents at `:2028`; map `M-fixture`. |

**Blocked list: added row (to the **V5-6** table).**

| Suite | Owner | Reason (verified from source; not executed) | Handoff reason |
| --- | --- | --- | --- |
| `tests/integration/server/task551ConcurrencyConstraints.test.ts` | TASK-551-05-L01 (`allowlist`, `TASK-551-05-L01…md:1062` at HEAD) | The legs fail from source in every schema, `public` included. The revision race interpolates the parent UUID unquoted (`:212-213`) into `sql.raw` (`:218`), so no probe commits; for `detail_page_revisions` it also writes a `data` column (`:209`) that the table does not have (`core/db/tables/pages.ts:171`, `document`). In the apply-owner race every probe shares one `source_run_id`, the primary key (`core/db/migrations/0081_task551_search_indexes_constraints_outbox.sql:99`), and fails the composite FK (`:165`), because `package_key` is `unique("package")` (`:282`) while the seeded run has `kit_id = SCOPE` (`:160-161`). The booking exclusion leg builds hours `12 + index` for 50 probes (`:260`, `:264-265`), which are invalid from hour 24, so `toHaveLength(FAMILY_SIZE)` (`:272`) fails. Delivered by the 05-L01 third-note R2.3 items (E3). | `catalog-concurrency-source:tests/integration/server/task551ConcurrencyConstraints.test.ts` |

- **V5-2 map cell.** The row reads `M-ambient` (blocked, **V8-5**)
  (`:3561`). Class and owner are unchanged.
- **SolutionKit row.** The **V7-3** row stays BLOCKED until the 05-L03 note
  items above have landed (Addendum E2). Its handoff reason string is
  unchanged.
- **Count and land order.** Seven blocked rows now hold the 01-L01 initial
  regeneration: the two rendering rows, the SearchVectorMigration row, the
  three result-shape rows and the concurrency row. Six wait on
  TASK-551-05-L01, in its one test-only change (the five-file R1/R2/R3 edit
  plus the R2.3 changes to `task551ConcurrencyConstraints.test.ts`, which
  lands before 01-L01 initial **V5-9** step 4,
  `TASK-551-05-L01…md:1873-1875` at HEAD, under
  `**Land order (restated).**`). One waits on TASK-551-05-L03. The O2 split
  (the file names Addendum E3 approves) is a later 05-L01 change and holds
  no 01-L01 row. The class-E rows of **V5-6** stay on the list and hold
  10-L01, not 01-L01 (**V5-6**, kept).

#### V8-6 V5-4 check 4: part-1 session environment (E3; 05-L01 audit B M)

**V5-4** gains a fourth check. It runs in the same `READ ONLY` transaction
and at the same times as checks 1-3, in a session opened with the part-1
`DATABASE_URL` (`<URL3>`, **V5-2**) and no other connection key, so that it
sees the `search_path` part 1 sees. It records booleans only.

4. **Part-1 session environment.** `pg_opclass_is_visible(oid)` is `true`
   for the `gin_trgm_ops` row of `pg_opclass` (no row counts as `false`),
   and `current_schema()` is `public`. Either one `false` is an environment
   STOP, not a suite verdict; the STOP raises an owner item.

This consumes the ninth 05-L01 handoff row (the F3 environment
precondition, written by the 05-L01 third note, Addendum E3). It is
consumed at the 01-L01 initial regeneration before the **V5-1** part-1 runs
(**V5-9** step 3) and again at FINAL step 3. `handoffs[]` records it under
the reason string that note pins, copied verbatim (**V8-10**).

#### V8-7 Interim red set (restated in full; replaces the V7-4 table)

The **V7-4** lead-in stays: these are predictions from source, not
receipts; a lane run between the initial regeneration and FINAL is expected
to show exactly the rows of this table, and none of them may be read as a
regression except where the table says a red is a finding. Rows marked
"(V7-4, unchanged)" carry their **V7-4** cells unchanged; only the marker
(and, for the result-shape row, the **V8-5** pointer) is added.

| Suite | Lane prediction | Cause (anchor) | Clears when |
| --- | --- | --- | --- |
| `tests/integration/server/task551SearchVectorMigration.test.ts` | absent from the manifest (BLOCKED) | Defect 1 (`:204-210`); `.rows` reads (`:209`, `:221`, `:238`, `:247`) | **V8-5** (R3.1-R3.5 landed, then part 1 passes) |
| `tests/integration/server/task551RetentionJobService.test.ts` | red until 06-L03 A8 lands; from the landing of 02-L02 R7, red in every lane run until `lane-worker-dedicated-schema-binding` lands; afterwards red only under worker contention | Defect 2 (`:156`); its dedicated sessions bind to the target's `public`, not to `bun_worker_<i>` (**V8-3**; `scripts/bun-lane-worker-url.ts:156`); its `pg_stat_activity` baseline (`:148-149`) and lock 551063/3 (`:128-131`) race `retentionScheduler` in a concurrent worker | 06-L03 A8 (Addendum A1; per R13-4 (i) text) and 02-L02 R11 `lane-worker-dedicated-schema-binding` (Addendum E1); the contention part is **V5-5** owner item (c), a FINAL precondition (**V8-8** step 7) |
| `tests/integration/runtime/preRetentionVacuum.test.ts` (06-L03 A8 `allowlist` addition, Addendum A2; not on disk at this tree; joins by the **V5-2** rule, owner TASK-551-06-L03) | once joined: from the landing of 02-L02 R7, red in every lane run until `lane-worker-dedicated-schema-binding` lands; afterwards red only under worker contention | its pre-step runs through the dedicated seam, whose sessions bind to the target's `public` (**V8-3**) | 02-L02 R11 `lane-worker-dedicated-schema-binding` (Addendum E1); the contention part is **V5-5** owner item (c) |
| `tests/integration/runtime/retentionScheduler.test.ts` | red only under worker contention | its `pg_locks` read of lock 551063/3 (`:77-81`) races the job-service suite | **V5-5** owner item (c); after 06-L03 A1-b these legs move to the real-db split (**V6-4**) (V7-4, unchanged) |
| `tests/integration/server/task551IndexAndConstraintCatalog.test.ts`, `tests/integration/server/task551SchemaMigrationParity.test.ts` | absent while the **V5-6** rows stand; after joining (05-L01 R1 + R2 landed) expected green in worker schemas; a red is a finding | 05-L01 R2 pins zero manifest members in a `bun_worker_*` session schema instead of expecting them (`TASK-551-05-L01…md:1383-1392`; "neither suite is part of the D6 (i) interim lane red set", `:1429-1430`) | not in the red set once joined (V7-4, unchanged) |
| `tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts`, `tests/perf/database-index-write-overhead.test.ts`, `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` | absent from the manifest (BLOCKED) | result shape (**V7-3**) | **V7-3** (V7-4, unchanged; clearing per **V8-5**) |
| `tests/integration/server/task551ConcurrencyConstraints.test.ts` | absent from the manifest (BLOCKED) | source defects (**V8-5**) | **V8-5** |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`, after joining | expected green in worker schemas through its O3 branch; a red is a finding | before O3, its 23505 legs (`:1979`, `:2016`, `:2062`) expect online unique members that no `bun_worker_*` schema has (Addendum E2) | not in the red set once joined |
| every class-A suite of **V5-2** and **V6-5** | skip, not red | the lane sets no `TASK551_FIXTURE_*` key | by design; the DB proof is part 1 (V7-4, unchanged) |

The `preRetentionVacuum` row states the prediction for its DB legs as
Addendum E1 (d) gives it; the suite's gating class is fixed by the
classifier when it joins (**V3-4**).

#### V8-8 FINAL order (replaces the V7-7 FINAL list; E1 (d), E2; audit A M, audit B H/L)

- **01-L01 initial.** The **V5-9** order stands (steps 1-8). Step 3
  includes **V5-4** check 4 (**V8-6**). Step 6 covers the **V5-6**,
  **V6-5**, **V7-3** and **V8-5** blocked rows.
- **01-L01 FINAL** runs these steps, in this order:

| Step | Action |
| --- | --- |
| 1 | source and test edits |
| 2 | fast gates |
| 3 | **V5-4** checks, check 4 included (**V8-6**) |
| 4 | **V5-1** part-1 runs (sequential, **V5-3** with the **V6-4** rows) |
| 5 | map-free run |
| 6 | STOP if any **V5-6**, **V6-5**, **V7-3** or **V8-5** blocked row remains |
| 7 | **V5-5** owner items decided and landed, else STOP: (c), the **V5-3** suites serialized into one worker or a pid/`application_name` filter; and (a), as **V8-4** closes it (05-L01 R2, R2.2 and R2.3; 05-L03 O3; 06-L02 O5) |
| 8 | **V2-6** step 1: write the scratch manifest `.tmp/task551-reopen-v2/precondition-manifest.json` as the **V7-6** union |
| 8a | `lane-worker-dedicated-schema-binding` (**V8-3**; 02-L02 R11) decided and landed, else STOP |
| 9 | the **V7-1** pre-provisioning booleans; STOP on any FALSE or undetermined value |
| 10 | the **V7-6** key-name count, with the **V6-2** serialization and the **V7-5** exclusion in force |
| 11 | the **V7-6** lane-runner run, then **V7-6** attribution re-runs (keys per **V8-2**) for any non-zero worker `exit`; any non-zero `exit` blocks |
| 12 | the literal classifier command with the one-path proof |
| 13 | airtight gates |

- **Swap.** v7 steps 7 and 8 are swapped (Addendum E2), so the scratch
  manifest is written only after the owner items that can change
  classification have landed. The inserted step is numbered 8a so that
  steps 9-13 keep their v7 numbers; the parent and 10-L02 mirrors cite the
  booleans as "FINAL step 9 of V7-7" (Addendum E5), which stays exact.
- **Resume.** A STOP at step 6, 7, 8a or 9 resumes FINAL at step 1: the
  landing edit changes the tree that steps 1-5 proved, and step 8 is then
  re-run after it.
- FINAL does not STOP on a missing owner decision about the worker database
  (**V6-2**, **V7-1**). It STOPs at step 7 while owner item (a) or (c) has
  not landed, at step 8a while `lane-worker-dedicated-schema-binding` has
  not landed, and at step 9 on any failing boolean.

#### V8-9 `.env` keys that reach workers; `package.json` anchors (E4; audit A INFO, audit B L)

- **Keys that reach workers.** Every worktree `.env` key name that the spawn
  env does not set reaches the B, C and perf workers and their attribution
  re-runs, because those processes run without `--env-file=/dev/null` and
  Bun fills only unset keys from `.env`. They are recorded by key name only.
  At this tree the worktree `.env` has 22 key names; the spawn env sets 3 of
  them (`DATABASE_URL`, `DATABASE_DIRECT_URL`, `DB_POOL_MAX`), so 19 reach
  workers, among others `DATABASE_URL2`, `DATABASE_URL3`, `TMPDIR`,
  `PAGINATION_CURSOR_SECRET` and the two `PII_*` keys. Worker `a` and its
  attribution receive none (`--env-file=/dev/null`). The **V7-6** STOP list
  and its counts are unchanged.
- **`package.json` anchors.** `test` is `package.json:28`, `test:full` is
  `:29` and `test:bun` is `:30`. `test` and `test:full` reach
  `scripts/run-bun-parallel.ts --lane all` through `test:bun`. The **V6-1**
  scope sentence and the **V7-5** exclusion list read these anchors per
  script (quotes in **V8-11**).

#### V8-10 Receipt addendum (additive)

- `preRegenerationLaneRun[].blocked` also covers the **V8-5** row:
  `{ taskId: "TASK-551-05-L01", reason: "catalog-concurrency-source:tests/integration/server/task551ConcurrencyConstraints.test.ts" }`.
- `handoffs[]` gains that item; `lane-worker-dedicated-schema-binding`
  (TASK-551-02-L02, **V8-3**); the **V5-5** (a) parts O3 (TASK-551-05-L03)
  and O5 (TASK-551-06-L02), by owner and Addendum item name (**V8-4**); and
  the ninth 05-L01 handoff row (**V8-6**) under its verbatim reason string.
- `preRunChecks` gains `trgmOpclassVisible` and `sessionSchemaIsPublic`
  (**V8-6**), values `true`/`false` only.
- `laneRunnerRun.ownerDecisionDate` stays `2026-09-24`, and the entry still
  never names the database.

The entry still holds no environment values, URLs, DB identities, SQL, or
fixture data.

#### V8-11 Superseded sentences (v8)

Quoted verbatim with their current lines (line breaks folded to spaces).
The quoted text is authoritative for what is superseded.

**v7 sentences.**

- `:4301-4303` (v7 label rule): "(at this tree it starts at
  `TASK-551-06-L03…md:1625` under its pre-relabel heading; its `:156` item
  is at `:1992`)". Replaced by the **V8-1** heading anchors.
- `:4329-4331` (**V7-1** Use): "Both `DATABASE_URL` and
  `DATABASE_DIRECT_URL` are set to `"$ROOT_DIRECT_URL"` (quoted) in the
  **V7-6** run and in its **V7-6** attribution re-runs, and nowhere else."
  Replaced by the **V8-2** per-process bullets.
- `:4382-4385` (**V7-3**): "Each row clears only when its owner's fix has
  landed (a `rowsOf` that returns the array, with no fallback; the 05-L01
  R1 item 1 form, `TASK-551-05-L01…md:1314`, `:1356`) and the suite's
  part-1 row meets the class table (**V5-6** rule)." Replaced by the
  **V8-5** clearing rule and table.
- `:4402-4406` (**V7-3** count): "Six blocked rows now hold the 01-L01
  initial regeneration: the two rendering rows, the SearchVectorMigration
  row and the three result-shape rows. Five wait on TASK-551-05-L01 (its
  R1-R3 test-only edit, five files per Addendum B4) and one waits on
  TASK-551-05-L03." Replaced by the **V8-5** count: seven rows, six on
  TASK-551-05-L01 and one on TASK-551-05-L03.
- `:4414-4416` (**V7-4** Defect 1): "The 05-L01 R3 item already covers both
  parts (`TASK-551-05-L01…md:1438-1440`: qualify `:204-207`, read the four
  sites through `rowsOf`)." Replaced by: the 05-L01 R3.1-R3.5 items cover
  both parts (**V8-5** table).
- `:4416-4417` (**V7-4** Defect 1): "The row clears only when that R3 edit
  has landed and the part-1 row meets the class table." Replaced by the
  **V8-5** SearchVectorMigration row. The next sentence (the v6 rule) stays.
- `:4428` (**V7-4** row): "| `tests/integration/server/task551SearchVectorMigration.test.ts` | absent from the manifest (BLOCKED) | Defect 1 (`:204-210`); `.rows` reads (`:209`, `:221`, `:238`, `:247`) | the 05-L01 R3 edit lands and part 1 passes (**V6-5**, amended here) |".
  Replaced by the **V8-7** row.
- `:4429` (**V7-4** row): "| `tests/integration/server/task551RetentionJobService.test.ts` | red until 06-L03 A8 lands; afterwards red only under worker contention | Defect 2 (`:156`); its `pg_stat_activity` baseline (`:148-149`) and lock 551063/3 (`:128-131`) race `retentionScheduler` in a concurrent worker | 06-L03 A8 (Addendum A1; per R13-4 (i) text); the contention part is **V5-5** owner item (c), a FINAL precondition (**V7-7** step 8) |".
  Replaced by the **V8-7** row and the **V8-7** `preRetentionVacuum` row
  (Addendum E1 (d)).
- `:4445-4447` (**V7-5**): "no `bun run test`, `bun run test:bun` or
  `bun run test:full` (`package.json:28`, `:29`, `:30`)". Refined by
  **V8-9**: `test` `:28`, `test:full` `:29`, `test:bun` `:30`. The rest of
  the sentence stays.
- `:4464-4468` (**V7-6** scratch manifest): "Without the first part, the
  suites the initial regeneration committed (among them
  `task551IndexAndConstraintCatalog` and `task551SchemaMigrationParity`,
  whose worker branch 05-L01 R2 first proves in this run,
  `TASK-551-05-L01…md:1426-1428`, and the **V5-5** (c) contention suites)
  would be missing from FINAL." Replaced by the **V8-4** restatement.
- `:4491-4493` (**V7-6** key-name count): "Keys that reach workers from
  `.env` (at this tree `DATABASE_URL3`, `PAGINATION_CURSOR_SECRET` and the
  two `PII_*` keys) are recorded by key name only." Replaced by the **V8-9**
  bullet (19 key names at this tree, among others). The rest of the
  paragraph stays.
- `:4560-4561` (**V7-7** initial): "Step 6 covers the **V6-5** and
  **V7-3** blocked rows." Replaced by the **V8-8** initial bullet.
- `:4569-4576` (**V7-7** FINAL steps 7-8): "7. **V2-6** step 1: write the
  scratch manifest `.tmp/task551-reopen-v2/precondition-manifest.json` as
  the **V7-6** union; 8. **V5-5** owner item (c) decided and landed (the
  **V5-3** suites serialized into one worker, or a pid/`application_name`
  filter), else STOP. **V5-5** owner item (a) is answered by 05-L01 R2
  (`TASK-551-05-L01…md:1383-1392`), which lands with the R1 edit and so
  has landed by step 6; this run proves its worker branch;". Replaced by
  **V8-8** steps 7, 8 and 8a. The other v7 FINAL steps are carried into
  the **V8-8** table with their numbers (step 6 and step 11 as amended
  there).
- `:4587-4588` (**V7-7** closing): "It STOPs at step 8 while owner item (c)
  has not landed, and at step 9 on any failing boolean." Replaced by the
  **V8-8** closing bullet. The first sentence of the paragraph stays.

**v6 sentence.**

- `:3871-3874` (**V6-1** scope): "`bun run test`, `bun run test:bun` and
  `bun run test:full` source `.env` and run
  `scripts/run-bun-parallel.ts --lane all` over that manifest
  (`package.json:28`, `:29`, `:30`)." Refined by **V8-9**: `test` `:28`,
  `test:full` `:29` and `test:bun` `:30`; `test` and `test:full` reach the
  runner through `test:bun`. The rest of the paragraph stays.

### Amendment v9 (2026-09-26)

Recorded at HEAD `c237e05d` from orchestrator decisions **H1**, **H2**,
**H3**, **H4** and the **O6** widening of **H6** (Addendum H of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`),
which were taken on the Round-9 / fix2 audit results (`wf_4844ed38-c42`).
The dispositions decide; this section records them as contract text and does
not re-decide them. Every anchor into this file, into source and into
committed task text was re-read at this tree. Owner texts written in the
same round are cited by Addendum item and heading, never by line: the
05-L03 second dated note (**H5**), the 05-L01 fourth note (**H6**), the
02-L02 R11 item `lane-worker-dedicated-schema-binding` (**H1**, Addendum F9)
and the parent and 10-L02 fix notes 3 (**H2**, **H3**). 05-L01 rows are
cited by heading and row number only (**H4**), because the 05-L01 fourth
note may amend that file's fence in place and shift its lines. v9 is
append-only. It supersedes v8 (and the earlier clauses v8 kept) only where
**V9-8** quotes a sentence verbatim with its current line. Every clause not
quoted there stays binding. No fence byte of this file changes, and no
source or test file changes. Environment facts are match counts only; no
environment value was read, printed or recorded.

#### V9-1 E1 (a) restated (H1)

- **Fact (from source and count-only greps; not executed).** The root
  `.env` has one `DATABASE_DIRECT_URL` line. A count-only grep finds 1 match
  for a `?` on that line, 1 for `sslmode`, and 0 for `options`. The worktree
  `.env` line also contains a `?` (1 match). `buildWorkerDatabaseUrl`
  (`scripts/bun-lane-worker-url.ts:61-66`, documented at `:56-60`) picks
  `&` when the direct URL already has a query (`:64`) and appends
  `options=<encodeURIComponent("-csearch_path=bun_worker_<i>")>` (`:65`).
  The lane spawn env sets `DATABASE_URL` from it (`:155`) and sets
  `BUN_TEST_WORKER_INDEX` to the same index (`:158`). So every lane worker
  `DATABASE_URL`, and every **V7-6** `"$WORKER_URL"` built from
  `"$ROOT_DIRECT_URL"`, has at least two query keys, and its `options` value
  is URL-encoded (`=` travels as `%3D`).
- **(a) as H1 restates it.** The R10.7 guarded-key list is unchanged
  (TASK-551-02-L02 `### R10.7 — URL-query guard in both builders (D-8)`: the
  six keys, `options` among them). The R11 exception applies only when
  `options` is the only GUARDED key in the target URL's query. Unguarded
  keys such as `sslmode` stay allowed as today. The exception also requires
  that the URL-DECODED `options` value matches
  `^-csearch_path=bun_worker_(\d+)$`, and that `BUN_TEST_WORKER_INDEX` is set
  and equals the captured `<n>`. Any other query holding a guarded key is
  still rejected with `database_maintenance_session_unavailable`, as R10.7
  says. (b) is unchanged: when `BUN_TEST_WORKER_INDEX` is set, the R7.2
  `off + primary` dedicated target takes the worker `DATABASE_URL`, not
  `DATABASE_DIRECT_URL`.
- **(c) F-leg as H1 restates it.** The R11 F-leg pins two outcomes.
  Accepted: a worker URL of the form `…?sslmode=…&options=…`, with an
  encoded `options` value and a matching `BUN_TEST_WORKER_INDEX`. Rejected:
  `options` with any other decoded value, and `options` without
  `BUN_TEST_WORKER_INDEX`.
- **Attribution forms.** v8's claim that the **V7-6** attribution forms
  "already satisfy (a)" is withdrawn (**V9-8**). From source, those forms
  produce the root query keys plus the encoded `options` value, with the
  same `<i>` that they set as `BUN_TEST_WORKER_INDEX`. E1 (a) as v8 wrote it
  ("a query whose only key is `options`") would reject them. Their
  acceptance is proven by the R11 F-leg above, not asserted by this file.
- The 02-L02 R11 writer works from **H1**, not from E1 (a) (Addendum F9,
  **H1**). This file mirrors that wording and does not edit 02-L02. The
  **V8-3** hazard, the **V8-8** step 8a STOP and the **V8-10** `handoffs[]`
  entry are unchanged.

#### V9-2 Blocked-row count and step labels (H2)

- **Count.** Seven blocked rows hold the 01-L01 initial regeneration. Six
  wait on TASK-551-05-L01 and one on TASK-551-05-L03 (the **V5-6**,
  **V6-5**, **V7-3** and **V8-5** rows). This is the **V8-5** count. The two
  v7 replacement texts that still said "six rows, five on TASK-551-05-L01"
  are superseded (**V9-8**).
- **Step labels.** Mirrors cite the FINAL steps by their v8 numbers. The
  **V5-5** (a) landed-check is "V8-8 step 7"; the E1 (d) STOP is "V8-8
  step 8a"; the pre-provisioning check keeps its v8 number and is cited as
  "the 01-L01 V7-1 pre-provisioning boolean check at its V8-8 step" (step 9).
  The parent and 10-L02 fix notes 3 carry these labels, and cite "the 01-L01
  V8-7 table (which replaces V7-4)" (**H2**). This file does not edit them.
- **Swap bullet, restated (H4).** v7 steps 7 and 8 are swapped (Addendum
  E2), so the scratch manifest is written only after the owner items that
  can change classification have landed. The inserted step is numbered 8a so
  that steps 9-13 keep their v7 numbers. The parent cites the booleans as
  "the 01-L01 V7-1 pre-provisioning boolean check at its V8-8 step"
  (**H2**), which resolves to **V8-8** step 9.

#### V9-3 O5 proof and the E1 (d) hazard (H3; no change)

- The **V8-4** **Proof** wording is authoritative, and the parent item 4
  mirrors it (**H3**). The FINAL lane-runner run proves the five 05-L01
  worker branches and the O3 branch. O5 (class-A suite
  `task551RevisionConcurrency`, whose DB legs skip in the lane) is proven
  only by the landed 06-L02 R15 edit, checked at **V8-8** step 7, plus that
  suite's **V5-1** part-1 evidence. A green lane run is never O5 evidence.
- The E1 (d) hazard is bounded "from the landing of 02-L02 R7" (**V8-3**,
  kept). It covers both **V8-7** rows it changes:
  `tests/integration/server/task551RetentionJobService.test.ts` and
  `tests/integration/runtime/preRetentionVacuum.test.ts`.

#### V9-4 05-L01 anchors by heading; row literals (H4)

- **Rule.** From v9 on, this file cites 05-L01 handoff rows as
  "`### Handoff rows for 01-L01 v8`, row N". That table is in the 05-L01
  third note and its heading reads "(replaces the second note's table)". It
  never cites a bare 05-L01 line. The table was read at this tree: row 8 is
  the **V5-5 (a)** 05-L01 share, row 9 the environment precondition, row 10
  the concurrency source row. Rows 1-5 are the rendering, SearchVector,
  outbox and perf rows. When a **V8-5** or **V8-7** cell and its row
  disagree, the row decides, as amended by later 05-L01 notes (the fourth
  note, **H6**).
- **V8-4 item 1, re-pointed.** The 05-L01 share of **V5-5** owner item (a)
  closes per `### Handoff rows for 01-L01 v8`, row 8. Its "Clears when" cell
  reads, verbatim: "R2.3a-f landed, and all five worker branches pass in the
  FINAL lane-runner run (catalog and parity online-index legs, outbox plan
  leg, concurrency revision race, concurrency apply-owner race), with the
  booking leg green in the same worker run". The **V8-4** O3 and O5 parts
  and the closing condition as a whole are unchanged.
- **V8-5 clearing rule, re-pointed.** A 05-L01-owned blocked row clears
  only per its row of `### Handoff rows for 01-L01 v8`: rows 1 and 2
  (catalog, parity), row 3 (SearchVectorMigration), row 4 (outbox), row 5
  (perf; ALL of items 1, 11, 13, 14 and 15) and row 10 (concurrency). The
  rest of the **V8-5** rule is unchanged (every listed item landed in the
  one test-only change, then a part-1 `pass` with 0 failed and 0 skipped
  under the suite's map after green **V5-4** checks, check 4 included). The
  land order is the `**Land order (restated).**` paragraph under that
  heading. The concurrency suite's `allowlist` entry is the 05-L01
  `## Workflow Dispatch Envelope` entry for its path.
- **Row-9 literal (V8-6, V8-10).** The ninth row's handoff reason, copied
  verbatim, is `env-precondition:pg_trgm-visible-and-public-schema`.
  `handoffs[]` records that item under exactly this string, and **V5-4**
  check 4 consumes it.
- **Quote anchors.** The **V8-11** quote of **V7-5** is anchored at
  `:4446-4447`, not `:4445-4447`: the quoted fragment starts on `:4446`.
  The quoted text and its **V8-9** refinement are unchanged. **V9-8** adds
  the verbatim quotes v8 omitted (`:3561`, `:4565`, `:4568`, `:4768-4770`).

#### V9-5 V8-7 rows restated (H4)

These rows replace the **V8-7** catalog/parity row (`:4984`) and the
result-shape row (`:4985`). The other **V8-7** rows and the **V8-7**
lead-in stay.

| Suite | Lane prediction | Cause (anchor) | Clears when |
| --- | --- | --- | --- |
| `tests/integration/server/task551IndexAndConstraintCatalog.test.ts`, `tests/integration/server/task551SchemaMigrationParity.test.ts` | absent from the manifest while their **V5-6** rows stand; once joined, no prediction from source (05-L01 withdrew its first-note prediction until every item has landed and the part-1 rows are receipts: second note, `### Superseded sentences (first note; verbatim, with replacements)`, item 13) | in a `bun_worker_*` session schema the online-index leg asserts zero manifest members (05-L01 `### R2 — Online indexes in worker schemas (D8 with D6 (ii); answers 01-L01 V5-5 (a))`, R2.1 as refined) | join per `### Handoff rows for 01-L01 v8`, rows 1 and 2 (**V8-5**); their worker branches are proven in the FINAL lane-runner run (row 8; **V8-4**), where any non-zero `exit` blocks (**V8-8** step 11) |
| `tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts`, `tests/perf/database-index-write-overhead.test.ts` | absent from the manifest (BLOCKED) | result shape (**V7-3**) | **V8-5** (`### Handoff rows for 01-L01 v8`, rows 4 and 5) |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` (TASK-551-05-L03) | absent from the manifest (BLOCKED) | result shape (**V7-3**); before O3, the 23505 legs expect online unique members (Addendum E2) | Clears when: 05-L03 Items 1 and 2 landed; O-L03-2 landed (`constraint_name` reader and the probe-before-evidence restrict leg); O-L03-1 split landed with import stability; every split test path is in the V5-1 part-1 set and passes under `M-fixture` with 0 failed, 0 skipped. |

The **V8-7** row "SolutionKit, after joining" stays. Its anchors (`:1979`,
`:2016`, `:2062`) are lines of the unsplit suite at this tree. After the
O-L03-1 split (**H5**) they denote the same SQLSTATE 23505 legs in
whichever split path the 05-L03 second dated note assigns them to.

#### V9-6 SolutionKit rows: the Shared literal (H4, H5)

Both SolutionKit rows, the **V8-5** clearing row and the **V9-5** blocked
row, carry the Shared literal below byte-for-byte. The 05-L03 second dated
note writes the same bytes (**H4**, **H5**):

Clears when: 05-L03 Items 1 and 2 landed; O-L03-2 landed (`constraint_name` reader and the probe-before-evidence restrict leg); O-L03-1 split landed with import stability; every split test path is in the V5-1 part-1 set and passes under `M-fixture` with 0 failed, 0 skipped.

- **V8-5 clearing row, replaced.**

| Suite | Clears when (every listed item landed, then the part-1 row passes) |
| --- | --- |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` (TASK-551-05-L03) | Clears when: 05-L03 Items 1 and 2 landed; O-L03-2 landed (`constraint_name` reader and the probe-before-evidence restrict leg); O-L03-1 split landed with import stability; every split test path is in the V5-1 part-1 set and passes under `M-fixture` with 0 failed, 0 skipped. |

- **The FK trap is a rule, not a clearing item.** The FK-trap item that the
  suite documents at `:2028` (05-L03 Item 3, the FK fixture rule) binds the
  suite and every split path. It is not an item whose landing clears the
  row (**H4**; see **H5** for O-L03-2).
- **Row count.** The suite remains ONE blocked row, owner TASK-551-05-L03,
  handoff reason
  `result-shape:tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`
  (unchanged). The split paths add no blocked row. The literal holds the row
  until every split path passes. The **V9-2** count stays seven.
- **Split paths.** Under the literal, every split test path joins the
  **V5-1** part-1 set with owner TASK-551-05-L03 and map `M-fixture`. The
  classifier fixes its gating class when it joins (**V3-4**).

#### V9-7 Owed mirror: TASK-551-10-L01 fence (H6, O6 widened)

| Owed mirror | Owner | Content | Follow-up |
| --- | --- | --- | --- |
| TASK-551-10-L01 `## Workflow Dispatch Envelope` | TASK-551-10-L01 (its own writer; not the 05-L01 writer, not this file) | The 10-L01 fence also names `tests/integration/server/task551OnlineIndexDeployment.test.ts` (command `migration-and-plan-tests`: `argv` and `positiveDiscovery`). The O6 `migration-and-index-tests` argv/positiveDiscovery edit that the 05-L01 fourth note approves (**H6**) is owed there as a mirror for the deployment-suite split paths. | orchestrator follow-up (**H6**) |

This file records the row only. The split paths join the **V5-2** list by
the ordinary rule. The classifier fixes their class (**V3-4**).

- **Observation (not decided here).** The same 10-L01
  `migration-and-plan-tests` `argv` and `positiveDiscovery` also name
  `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`,
  whose O-L03-1 split **H5** approves. **H5** records only the 05-L03 fence
  amendment. Routed to the orchestrator.

#### V9-8 Superseded sentences (v9)

Quoted verbatim with their current lines (line breaks folded to spaces).
The quoted text is authoritative for what is superseded.

**v8 sentences.**

- `:4851-4854` (**V8-3**, E1 (a)): "(a) R10.7 gains one named exception, a
  query whose only key is `options` with the exact value
  `-csearch_path=bun_worker_<n>` (regex-pinned), accepted only when
  `BUN_TEST_WORKER_INDEX` is set and equals `<n>`;". Replaced by the
  **V9-1** (a) and (c) bullets (**H1**). (b) and the rest of the bullet
  stay.
- `:4866-4868` (**V8-3**): "The **V7-6** attribution forms already satisfy
  (a) once it lands: `"$WORKER_URL"` is built with the same `<i>` that the
  form sets as `BUN_TEST_WORKER_INDEX`." Withdrawn; replaced by the
  **V9-1** attribution-forms bullet.
- `:4876-4881` (**V8-4** item 1): "05-L01 R2 (first note), R2.2 and R2.3:
  the five worker branches of the 05-L01 handoff row "**V5-5 (a)** owner
  item, 05-L01 share" (`TASK-551-05-L01…md:1866` at HEAD, under
  `### Handoff rows for 01-L01 v7`): the catalog and parity online-index
  legs, the outbox plan leg, the concurrency revision race and the
  concurrency apply-owner race;". Replaced by the **V9-4** re-pointed item
  1 (row 8).
- `:4909-4912` (**V8-5** clearing rule): "A 05-L01-owned blocked row clears
  only per its 05-L01 handoff row (`TASK-551-05-L01…md:1850-1866` at HEAD,
  under `### Handoff rows for 01-L01 v7`, as restated by the 05-L01 third
  note, Addendum E3)." Replaced by the **V9-4** re-pointed clearing rule.
  The rest of the paragraph stays.
- `:4926` (**V8-5** row): "| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` (TASK-551-05-L03) | the items of the 05-L03 dated note (Addendum E2): the no-fallback `rowsOf` (B1), the O3 worker-schema branch, and the FK-trap item that the suite documents at `:2028`; map `M-fixture`. |".
  Replaced by the **V9-6** row.
- `:4932` (**V8-5** blocked row, Owner cell): "TASK-551-05-L01
  (`allowlist`, `TASK-551-05-L01…md:1062` at HEAD)". Replaced by: TASK-551-05-L01
  (`allowlist`, 05-L01 `## Workflow Dispatch Envelope`). The other cells
  stay.
- `:4936-4937` (**V8-5**): "The **V7-3** row stays BLOCKED until the 05-L03
  note items above have landed (Addendum E2)." Replaced by: the row stays
  BLOCKED until the Shared literal (**V9-6**) is met. The next sentence (the
  unchanged handoff reason) stays.
- `:4945-4946` (**V8-5** count, fragment): "`TASK-551-05-L01…md:1873-1875`
  at HEAD, under `**Land order (restated).**`". Replaced by: the
  `**Land order (restated).**` paragraph under 05-L01
  `### Handoff rows for 01-L01 v8` (**V9-4**). The rest of the bullet
  stays.
- `:4963-4964` (**V8-6**): "This consumes the ninth 05-L01 handoff row (the
  F3 environment precondition, written by the 05-L01 third note, Addendum
  E3)." Replaced by: this consumes `### Handoff rows for 01-L01 v8`, row 9,
  `env-precondition:pg_trgm-visible-and-public-schema` (**V9-4**).
- `:4966-4967` (**V8-6**): "`handoffs[]` records it under the reason string
  that note pins, copied verbatim (**V8-10**)." Replaced by: `handoffs[]`
  records it under `env-precondition:pg_trgm-visible-and-public-schema`.
- `:4984` (**V8-7** row): "| `tests/integration/server/task551IndexAndConstraintCatalog.test.ts`, `tests/integration/server/task551SchemaMigrationParity.test.ts` | absent while the **V5-6** rows stand; after joining (05-L01 R1 + R2 landed) expected green in worker schemas; a red is a finding | 05-L01 R2 pins zero manifest members in a `bun_worker_*` session schema instead of expecting them (`TASK-551-05-L01…md:1383-1392`; "neither suite is part of the D6 (i) interim lane red set", `:1429-1430`) | not in the red set once joined (V7-4, unchanged) |".
  Replaced by the **V9-5** catalog/parity row. The withdrawn first-note
  prediction is no longer cited.
- `:4985` (**V8-7** row): "| `tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts`, `tests/perf/database-index-write-overhead.test.ts`, `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` | absent from the manifest (BLOCKED) | result shape (**V7-3**) | **V7-3** (V7-4, unchanged; clearing per **V8-5**) |".
  Replaced by the two **V9-5** rows (outbox and perf; SolutionKit).
- `:5021-5022` (**V8-8** Swap): "the parent and 10-L02 mirrors cite the
  booleans as "FINAL step 9 of V7-7" (Addendum E5), which stays exact."
  Replaced by the **V9-2** Swap bullet ("the parent cites"). The rest of
  the Swap bullet stays.
- `:5056` (**V8-10**): "the ninth 05-L01 handoff row (**V8-6**) under its
  verbatim reason string." Replaced by: `### Handoff rows for 01-L01 v8`,
  row 9, under `env-precondition:pg_trgm-visible-and-public-schema`.
- `:5102` (**V8-11** anchor): "`:4445-4447` (**V7-5**)". Replaced by
  `:4446-4447` (**V9-4**). The quote and its refinement stay.

**v7 sentences.**

- `:4716-4717` (**V7-10**, replacement text for `:4066-4067`): "Replaced by
  the **V7-3** count: six rows, five on TASK-551-05-L01 and one on
  TASK-551-05-L03." Replaced by the **V8-5** count: seven rows, six on
  TASK-551-05-L01 and one on TASK-551-05-L03 (**V9-2**).
- `:4768-4770` (**V7-10**, replacement text for `:4155`): "Refined by the
  **V7-7** closing paragraph (STOP at steps 8 and 9)." Replaced by: refined
  by the **V8-8** closing bullet (STOP at steps 7, 8a and 9).
- `:4781-4784` (**V7-10**, replacement text for `:4273-4274`): "Replaced
  by: it waits on six rows, the two rendering rows, the
  SearchVectorMigration row and the three result-shape rows; five on
  TASK-551-05-L01 and one on TASK-551-05-L03 (**V7-3**, **V7-7**)."
  Replaced by: it waits on seven rows, the two rendering rows, the
  SearchVectorMigration row, the three result-shape rows and the
  concurrency row; six on TASK-551-05-L01 and one on TASK-551-05-L03
  (**V8-5**, **V9-2**).
- `:4565` (**V7-7** FINAL step 3): "3. **V5-4** checks;". Replaced by
  **V8-8** step 3 (check 4 included, **V8-6**).
- `:4568` (**V7-7** FINAL step 6): "6. STOP if any **V5-6**, **V6-5** or
  **V7-3** blocked row remains;". Replaced by **V8-8** step 6 (adds the
  **V8-5** row).

**v5 table cell.**

- `:3561` (**V5-2** row): "| `tests/integration/server/task551ConcurrencyConstraints.test.ts` | B | TASK-551-05-L01 | `M-ambient` |".
  Replaced by: map cell `M-ambient` (blocked, **V8-5**), as **V8-5** states.
  Class and owner are unchanged.

### Amendment v10 (2026-09-27)

Recorded at HEAD `a3d46bf1` from orchestrator decisions **J2** and **J4**
(a)-(f), with **J9** and Addendum I3 (a), (b) and (d) for the owed mirrors
(Addenda I and J of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`).
They were taken on the Round-10 / fix3 audit results (`wf_b7515c81-866`).
The dispositions decide; this section records them as contract text and does
not re-decide them. Every anchor into this file, into source and into
committed task text was re-read at this tree. Owner texts are cited by
heading and item, never by a bare line, except where a quoted row is copied
byte-for-byte. The 05-L03 third note (**J7**), the 05-L01 script-split
correction (**J3**) and the 05-L01 item 0 (**J2**) are being written by
their own writers in this round and are cited by Addendum item only. v10 is
append-only. It supersedes v9 (and the earlier clauses v9 kept) only where
**V10-9** quotes a sentence verbatim with its current line. Every clause not
quoted there stays binding. No fence byte of this file changes, and no
source or test file changes. No environment file was read for this
amendment. In this section **Jn** (bold, or bare in a heading) is an
Addendum J item. "The J3 leg" and "fact J4" name the verified facts J3 and
J4 of the 05-L01 fourth note (``### Verified facts (read at `c237e05d`)``),
not Addendum items.

#### V10-1 SolutionKit post-join row and blocked row (J4 (a))

- **Post-join row (V8-7 table).** The 05-L03 post-join row replaces the
  **V8-7** row "SolutionKit, after joining" (`:4987`, quoted in **V10-9**).
  It is copied byte-for-byte from 05-L03
  `### Handoff rows for 01-L01 v9 (row texts; 01-L01's writer copies them)`,
  the row under "Post-join row (**V8-7** table, replacing the first note's
  **V7-4** row; insert as written)":

| Suite | Lane prediction | Cause (anchor) | Clears when |
| --- | --- | --- | --- |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` and `tests/integration/server/task551SolutionKitRollbackAuthoritySchema-static.test.ts` | absent while their **V7-3** row stands; after joining, expected green: the static suite in every schema, and the original path in worker schemas through the Item 2 worker branches; a red is a finding | online members `…_source_position_key`, `…_source_key`, `…_apply_owners_active_idx`, `…_active_rollback_source_idx` are never in `bun_worker_*` (first note L3); worker branches at `:1979`, `:2016`, `:2062` | Clears when: 05-L03 Items 1 and 2 landed; O-L03-2 landed (`constraint_name` reader and the probe-before-evidence restrict leg); O-L03-1 split landed with import stability; every split test path is in the V5-1 part-1 set and passes under `M-fixture` with 0 failed, 0 skipped. |

- **Anchors of that row.** The v9 sentences after the superseded
  "stays" sentence (`:5287-5290`, from "Its anchors" on) stay binding and
  now apply to this row. Its anchors `:1979`, `:2016` and `:2062` are lines
  of the unsplit suite at this tree. Under 05-L03 Item N2-3 the live
  `testIfDb` legs stay in the original path, so after the split they
  denote the same SQLSTATE 23505 legs there.
- **Blocked row, restated (replaces the V9-5 SolutionKit row).** The
  statement now names the `-static` path. Both split test paths are absent
  from the manifest while the one SolutionKit row stands:

| Suite | Lane prediction | Cause (anchor) | Clears when |
| --- | --- | --- | --- |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` and `tests/integration/server/task551SolutionKitRollbackAuthoritySchema-static.test.ts` (TASK-551-05-L03) | absent from the manifest (BLOCKED), both paths, under the one blocked row of **V9-6** | result shape (**V7-3**); before O3, the 23505 legs expect online unique members (Addendum E2) | Clears when: 05-L03 Items 1 and 2 landed; O-L03-2 landed (`constraint_name` reader and the probe-before-evidence restrict leg); O-L03-1 split landed with import stability; every split test path is in the V5-1 part-1 set and passes under `M-fixture` with 0 failed, 0 skipped. |

- **Unchanged.** The row is still ONE blocked row, owner TASK-551-05-L03,
  handoff reason
  `result-shape:tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`
  (**V9-6**). The `-static` path adds no blocked row and no handoff reason.
  The **V9-2** count stays seven. The support module
  `tests/integration/server/task551SolutionKitRollbackAuthoritySchema-support.ts`
  is not a test path (05-L03 Item N2-3) and has no row of any table here.

#### V10-2 Catalog/parity prediction after joining restored (J4 (b), Option 1)

This row replaces the **V9-5** catalog/parity row. Only the lane
prediction changes. The cause and "Clears when" cells are the **V9-5**
cells, byte-for-byte.

| Suite | Lane prediction | Cause (anchor) | Clears when |
| --- | --- | --- | --- |
| `tests/integration/server/task551IndexAndConstraintCatalog.test.ts`, `tests/integration/server/task551SchemaMigrationParity.test.ts` | absent from the manifest while their **V5-6** rows stand; after joining expected green in worker schemas; a red is a finding | in a `bun_worker_*` session schema the online-index leg asserts zero manifest members (05-L01 `### R2 — Online indexes in worker schemas (D8 with D6 (ii); answers 01-L01 V5-5 (a))`, R2.1 as refined) | join per `### Handoff rows for 01-L01 v8`, rows 1 and 2 (**V8-5**); their worker branches are proven in the FINAL lane-runner run (row 8; **V8-4**), where any non-zero `exit` blocks (**V8-8** step 11) |

- **Why the withdrawal does not apply after joining.** 05-L01 withdrew its
  first-note prediction "until every item lands and the part-1 rows are
  receipts" (05-L01 second note,
  `### Superseded sentences (first note; verbatim, with replacements)`,
  item 13). A suite joins only when its row of
  `### Handoff rows for 01-L01 v8` (rows 1 and 2) has cleared: every listed
  item has landed and the part-1 row is a `pass` receipt (**V8-5**). So the
  withdrawal condition has ended by the time the prediction applies.
- This matches the **V7-10** replacement text at `:4676-4677`, whose
  fragment on `:4677` reads "a Catalog/Parity red after joining is a
  finding". That text stays binding.
  Under the **V8-7** lead-in, a joined catalog or parity red in an interim
  lane run is a finding, not an expected red. **V8-8** step 11 is unchanged.

#### V10-3 O8: class-D and map rows for the split test paths (J4 (c); I3 (d))

This disposes the 05-L01 fourth-note observation **O8**
(`### Observation for orchestrator disposition (not decided here)`) and
covers the 05-L03 `-static` path in the same way. The test paths are the
three deployment-suite parts of the 05-L01 fourth note
(`### R1 item 12 split — approved paths, budgets and rules (H6)`) and the
05-L03 static suite (05-L03 Item N2-3).

- **V3-4 class-D row, restated (replaces `:2957`).**

| Class | Suites (of the 21 v1 **Defect** rows) | Gate (verified anchor) | Owner-map run (step 2) | Map-free run (step 3) |
| --- | --- | --- | --- | --- |
| D. Ungated (DB-free by construction) | `task551OnlineIndexDeployment` (verdict in **V2-6**); once on disk, its split parts `task551OnlineIndexDeployment-catalog`, `task551OnlineIndexDeployment-rollout` and `task551OnlineIndexDeployment-evidence` (05-L01 R1 item 12) and `task551SolutionKitRollbackAuthoritySchema-static` (05-L03 Item N2-3) | none | must PASS | must PASS |

- The header is the **V3-4** header. The added suites are not v1
  **Defect** rows; they join by the **V3-4** rule that the to-be-added set
  is recomputed at gate time.
- **Basis (from the owner texts; not executed).** The three deployment
  parts receive whole `describe` blocks of the DB-free suite, with no leg
  dropped or weakened (05-L01 split rule 2). Each imports its fixtures only
  from the support module, which declares no `test` or `describe` (split
  rule 4). The static suite holds the static legs `:1015-1632`, which make
  no `db`/`hasDb` call (05-L03 N3), and it never imports `core/db/client`
  (05-L03 Item N2-3). Its DB-free run passes 14 tests with 0 skipped (05-L03
  `### Gates for the implementer (fast; replaces the first note's list for this edit)`).
- **Classification.** These rows are the expected verdicts. The grep at
  join time still fixes the gating class (**V3-4**; kept by **V9-6** and
  **V9-7**). A different grep result is reported to the orchestrator as a
  finding. The **V3-4** blocking rule applies unchanged: a skip in either run
  of a class-D suite blocks.
- **V5-2 map rows (additive; paths that join the set later).**

| Suite | Class | Owner (allowlist) | Map |
| --- | --- | --- | --- |
| `tests/integration/server/task551OnlineIndexDeployment-catalog.test.ts` | D | TASK-551-05-L01 | `M-ambient` |
| `tests/integration/server/task551OnlineIndexDeployment-rollout.test.ts` | D | TASK-551-05-L01 | `M-ambient` |
| `tests/integration/server/task551OnlineIndexDeployment-evidence.test.ts` | D | TASK-551-05-L01 | `M-ambient` |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema-static.test.ts` | D | TASK-551-05-L03 | `M-fixture` (blocked, **V7-3**; under the one SolutionKit row, **V9-6**) |

- **Owners and maps.** Each owner is the leaf whose fence `allowlist` holds
  the path: 05-L01 `## Workflow Dispatch Envelope` (fence amendment 2) and
  05-L03 `## Workflow Dispatch Envelope` (Item N2-3). The map follows the
  owner by the **V5-2** rule: `M-ambient` for 05-L01, whose suites read only
  `DATABASE_URL`, and `M-fixture` for 05-L03 (**V5-2** decisions, **V9-6**).
  The original paths keep their rows: the deployment suite D/`M-ambient`,
  the SolutionKit suite B/`M-fixture` (blocked, **V7-3**).
- **Support modules.** `tests/integration/server/task551OnlineIndexDeployment-support.ts`
  and `tests/integration/server/task551SolutionKitRollbackAuthoritySchema-support.ts`
  are not test files. They do not match `LANE_TEST_FILE` (`:2399`) and
  register no test. They have no class,
  no map, no part-1 or map-free row and no manifest row.
- **Counts and timing.** None of the four test paths is on disk at this tree
  (count 0 in `tests/integration/server` and in
  `tests/bun-lane-manifest.json`). The **V5-2** count (21: 9 A, 9 B, 2 C,
  1 D) and the **V3-4** count describe this tree and stay. The deployment
  parts join when R1 item 12 creates them. The static suite joins with the
  05-L03 split edit and clears only under the **V9-6** Shared literal.
  Each joined path's receipt carries `gatingClass: "ungated"` (**V3-4**
  receipt).

#### V10-4 The deployment suite's J3 leg until item 0 lands (J2; J4 (d))

- **Fact (from source at HEAD; not executed).** At HEAD `a3d46bf1` the J3
  leg of `tests/integration/server/task551OnlineIndexDeployment.test.ts`
  ("the contract's validation battery commands exactly the seven owned test
  files") asserts `contract.includes(envelopeArgv)` over the seven
  `COMMANDED_TEST_PATHS`. On the 05-L01 task file, that seven-path argv
  literal now occurs only in the ```text block under
  ``### Superseded fence values (verbatim; HEAD `c237e05d` bytes)``. The live
  fence argv of `migration-and-index-tests` has ten paths.
- **Decision recorded (J2).** Item 0 is a standalone test-only 05-L01 edit
  that lands before R1 item 12. It makes the J3 leg parse the ```json block
  under 05-L01 `## Workflow Dispatch Envelope`, compare the
  `migration-and-index-tests` argv structurally with the ten live paths
  (`COMMANDED_TEST_PATHS` holds the ten; the leg title says "ten"), and check
  the validation command against the fourth note's restated ten-path
  command. Owner TASK-551-05-L01. This file does not write it.
- **Rule.** Until item 0 lands, the deployment suite's J3 pass is not
  evidence of the live envelope. No receipt cites it as envelope evidence:
  no part-1 or map-free row, no FINAL lane-runner result, no `handoffs[]`
  entry and no closure note. The class-D requirement is unchanged: the suite
  must PASS in both runs (**V3-4**), and that pass counts only as the
  suite's own verdict. No expected-red row is recorded (**J2** replaces the
  I4 alternative).
- After item 0 lands (its **J2** gates: the DB-free run of the suite and
  eslint on the file), the J3 pass is envelope evidence again. The
  mechanical item-12 done-check stays as **J2** states it: `grep -c` of the
  three split paths in `COMMANDED_TEST_PATHS` is 3.

#### V10-5 Anchors and pending owner texts (J4 (e))

- **V9-8 quote anchor.** The **V9-8** quote of the **V7-10** replacement
  text for `:4155` is anchored at `:4769-4770`, not `:4768-4770`: the quoted
  fragment starts on `:4769`. The quoted text and its replacement are
  unchanged.
- **V7-3 owner cells, by heading.** The three **V7-3** owner cells cite
  fence lines by heading from now on (quotes in **V10-9**):
  - outbox row: TASK-551-05-L01 (`allowlist`, 05-L01
    `## Workflow Dispatch Envelope`);
  - perf row: TASK-551-05-L01 (`allowlist`, 05-L01
    `## Workflow Dispatch Envelope`);
  - SolutionKit row: TASK-551-05-L03 (`allowlist`, 05-L03
    `## Workflow Dispatch Envelope`; 05-L01 holds it in `forbiddenPaths`,
    05-L01 `## Workflow Dispatch Envelope`).
  The other cells of those rows stay.
- **02-L02 R11 item (pending; not yet written).** The 02-L02 R11 item
  `lane-worker-dedicated-schema-binding` is not an owner text written in the
  v9 round. A count-only grep of the 02-L02 task file finds 0 matches for
  `R11` and 0 for `schema-binding` at this tree. It is cited as "02-L02 R11
  `lane-worker-dedicated-schema-binding` (pending; not yet written)"
  (**H1**, Addendum F9). The **V9-1** (c) F-leg is what that item will pin
  once written, not existing contract. The **V8-3** hazard, the **V8-8**
  step 8a STOP and the **V8-10** `handoffs[]` entry are unchanged.

#### V10-6 Owed mirrors: TASK-551-10-L01 fence and validation list (J4 (e), J9; I3 (a), (b))

This table replaces the **V9-7** owed-mirror row and disposes its
observation (Addendum I3 (b)).

| Owed mirror | Owner | Content | Land-order bound | Follow-up |
| --- | --- | --- | --- | --- |
| TASK-551-10-L01 `## Workflow Dispatch Envelope` and `## Exact Validation Commands` (05-L01 O6, widened; **H6**, I3 (a)) | TASK-551-10-L01 (its own writer; not the 05-L01 writer, not this file) | Command `migration-and-plan-tests`: its `argv` and its `positiveDiscovery.paths` gain `tests/integration/server/task551OnlineIndexDeployment-catalog.test.ts`, `tests/integration/server/task551OnlineIndexDeployment-rollout.test.ts` and `tests/integration/server/task551OnlineIndexDeployment-evidence.test.ts`; its `minimum` is set under 10-L01's own rule; the `bun test` list of `## Exact Validation Commands` names the same three paths. | no later than the 05-L01 R1 item 12 change (05-L01 fourth note, `### O6 — disposed and widened (H6)`) | orchestrator follow-up (**J9**) |
| the same two 10-L01 places (05-L03 note 2; I3 (b)) | TASK-551-10-L01 (its own writer) | The same `argv`, `positiveDiscovery.paths`, `minimum` and validation `bun test` list gain `tests/integration/server/task551SolutionKitRollbackAuthoritySchema-static.test.ts`. | no later than the 05-L03 split edit (Item N2-3) | orchestrator follow-up (**J9**) |

- Neither support module is a test path. Neither enters an `argv` or a
  `positiveDiscovery.paths` list (05-L01 fourth note, fact J4: discovery paths
  must be `tests/**.test.ts(x)` paths that also appear in `argv`).
- This file records the rows only. The split paths join the **V5-2** list by
  the ordinary rule, with the expected rows of **V10-3**.

#### V10-7 O5 wording (J4 (f))

- **O5, restated.** O5 (class-A suite `task551RevisionConcurrency`, whose
  DB legs skip in the lane) is checked landed at **V8-8** step 7; the O5
  worker-schema branch is not executed before closure. No executing leg is
  required before closure (**J4** (f)).
- The suite's **V5-1** part-1 row runs in `public` (**V5-4** check 4,
  **V8-6**), so it proves only the suite's non-worker branch. It is not O5
  evidence. A green lane run is never O5 evidence (**V9-3**, kept).
- The **V8-4** closing condition (item 3: the 06-L02 R15 edit has landed)
  and the **V8-4** **Proof** bullet are unchanged. The parent fix 4 mirrors
  this wording through its own writer (**J8**). This file does not edit it.

#### V10-8 Observation for orchestrator disposition (not decided here)

- **V3-2 static-list mirror for the four split test paths.** **V3-2** item 1
  requires that a leaf which names a NEW `task551`-named Bun-lane test path
  in its fence records, in the same correction, a dated 01-L01 amendment
  that adds that exact path to the static list. The three deployment parts
  are named in the 05-L01 fence (`allowlist`, and the
  `migration-and-index-tests` `argv` and `positiveDiscovery.paths`). The
  static suite is named in the 05-L03 fence (`allowlist`, and the
  `rollback-authority-schema-test` `argv` and `positiveDiscovery.paths`).
  Each path matches `LANE_TEST_FILE`, carries the `task551` token, sits
  under the `tests/integration/server` lane root and is not planned (a
  count-only grep of `tests/perf/fixtures/task551QueryInventory.ts` finds
  0). So the **V2-5** case-1 derivation yields all four paths. The **V3-1**
  static list (27 entries) holds none of them, so case 1 would report
  `missing-from-static:` for each, and case 8 would report each once it is
  on disk. Neither the 05-L01 fourth note nor the 05-L03 second note records
  the mirror, and **J4** does not dispose it. Routed to the orchestrator.
  This amendment adds no static-list entry.

#### V10-9 Superseded sentences (v10)

Quoted verbatim with their current lines (line breaks folded to spaces).
The quoted text is authoritative for what is superseded.

**v9 sentences.**

- `:5152-5153` (v9 preamble, fragment of `:5150-5154`): "the 02-L02 R11 item
  `lane-worker-dedicated-schema-binding` (**H1**, Addendum F9)". Replaced
  by: "02-L02 R11 `lane-worker-dedicated-schema-binding` (pending; not yet
  written)" (**V10-5**). It is not an owner text written in the v9 round.
  The rest of the sentence stays.
- `:5189` (**V9-1** (c)): "The R11 F-leg pins two outcomes." Replaced by:
  the R11 F-leg, once written, pins two outcomes (**V10-5**). The rest of
  the bullet stays.
- `:5229-5232` (**V9-3**): "O5 (class-A suite `task551RevisionConcurrency`,
  whose DB legs skip in the lane) is proven only by the landed 06-L02 R15
  edit, checked at **V8-8** step 7, plus that suite's **V5-1** part-1
  evidence." Replaced by the **V10-7** O5 bullet: checked landed at
  **V8-8** step 7; the O5 worker-schema branch is not executed before
  closure. The next sentence stays.
- `:5283` (**V9-5** catalog/parity row, lane-prediction fragment): "once
  joined, no prediction from source (05-L01 withdrew its first-note
  prediction until every item has landed and the part-1 rows are receipts:
  second note, `### Superseded sentences (first note; verbatim, with
  replacements)`, item 13)". Replaced by the **V10-2** row: "after joining
  expected green in worker schemas; a red is a finding".
- `:5285` (**V9-5** SolutionKit row, first two cells): "| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts` (TASK-551-05-L03) | absent from the manifest (BLOCKED) |".
  Replaced by the **V10-1** blocked row, which names both split test paths.
  The cause and "Clears when" cells stay.
- `:5287` (**V9-5**): "The **V8-7** row "SolutionKit, after joining"
  stays." Replaced by the **V10-1** post-join row. The next two sentences
  stay and apply to that row.
- `:5323` (**V9-7** row, Content cell): "The 10-L01 fence also names `tests/integration/server/task551OnlineIndexDeployment.test.ts` (command `migration-and-plan-tests`: `argv` and `positiveDiscovery`). The O6 `migration-and-index-tests` argv/positiveDiscovery edit that the 05-L01 fourth note approves (**H6**) is owed there as a mirror for the deployment-suite split paths."
  Replaced by the **V10-6** rows (`argv`, `positiveDiscovery.paths`,
  `minimum`, the validation `bun test` list, and the land-order bound).
- `:5328-5332` (**V9-7** observation): "**Observation (not decided here).**
  The same 10-L01 `migration-and-plan-tests` `argv` and `positiveDiscovery`
  also name
  `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`,
  whose O-L03-1 split **H5** approves. **H5** records only the 05-L03 fence
  amendment. Routed to the orchestrator." Replaced by: decided by Addendum
  I3 (b) and **J9**; the owed mirror is the second **V10-6** row.
- `:5406` (**V9-8** anchor): "`:4768-4770` (**V7-10**, replacement text
  for `:4155`)". Replaced by `:4769-4770` (**V10-5**). The quote and its
  replacement stay.

**v8 table row.**

- `:4987` (**V8-7** row): "| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`, after joining | expected green in worker schemas through its O3 branch; a red is a finding | before O3, its 23505 legs (`:1979`, `:2016`, `:2062`) expect online unique members that no `bun_worker_*` schema has (Addendum E2) | not in the red set once joined |".
  Replaced by the **V10-1** post-join row (05-L03, byte-for-byte).

**v7 table cells.**

- `:4391` (**V7-3** outbox row, Owner cell): "TASK-551-05-L01
  (`allowlist`, `TASK-551-05-L01…md:1060`)". Replaced by the **V10-5**
  heading anchor.
- `:4392` (**V7-3** perf row, Owner cell): "TASK-551-05-L01 (`allowlist`,
  `:1064`)". Replaced by the **V10-5** heading anchor.
- `:4393` (**V7-3** SolutionKit row, Owner cell): "TASK-551-05-L03
  (`allowlist`, `TASK-551-05-L03…md:802`; 05-L01 holds it in
  `forbiddenPaths`, `TASK-551-05-L01…md:1073`)". Replaced by the **V10-5**
  heading anchors.

**v3 table row.**

- `:2957` (**V3-4** class-D row): "| D. Ungated (DB-free by construction) | `task551OnlineIndexDeployment` (verdict in **V2-6**) | none | must PASS | must PASS |".
  Replaced by the **V10-3** class-D row. The **V3-4** count sentence and
  the blocking rule stay.

### Amendment v11 (2026-09-27)

Recorded at HEAD `b98ed8d9` from orchestrator decision **L7**, with **K2**
and **K3** (Addenda K and L of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`).
They were taken on the Round-11 / fix4 audit results (`wf_75d02a03-d77`).
The dispositions decide; this section records them as contract text and
does not re-decide them. Every anchor into this file, into the 05-L01 and
05-L03 task files and into source was re-read at this tree. Line anchors
into this file are HEAD `b98ed8d9` lines; v11 is appended after the last
of them, so none of them moves. v11 is append-only. It supersedes earlier
text only where **V11-5** quotes a sentence verbatim with its current line.
Every clause not quoted there stays binding. No fence byte of this file
changes, and no source or test file changes. No environment file was read
for this amendment. In this section **Kn** and **Ln** (bold) are Addendum K
and Addendum L items.

#### V11-1 Static list grows to 31 entries (L7; K3; disposes V10-8)

The four test paths of **V10-3** join the **V2-3** static list as amended
by **V3-1**. Each is named by its owner's first ```` ```json ```` fence,
read at this tree:

| Path | Named by (fence field; owner) |
| --- | --- |
| `tests/integration/server/task551OnlineIndexDeployment-catalog.test.ts` | `allowlist`, and the `migration-and-index-tests` `argv` and `positiveDiscovery.paths` (TASK-551-05-L01, fourth note, fence amendment 2) |
| `tests/integration/server/task551OnlineIndexDeployment-rollout.test.ts` | `allowlist`, and the `migration-and-index-tests` `argv` and `positiveDiscovery.paths` (TASK-551-05-L01, fourth note, fence amendment 2) |
| `tests/integration/server/task551OnlineIndexDeployment-evidence.test.ts` | `allowlist`, and the `migration-and-index-tests` `argv` and `positiveDiscovery.paths` (TASK-551-05-L01, fourth note, fence amendment 2) |
| `tests/integration/server/task551SolutionKitRollbackAuthoritySchema-static.test.ts` | `allowlist`, and the `rollback-authority-schema-test` `argv` and `positiveDiscovery.paths` (TASK-551-05-L03, Item N2-3) |

Each path matches `LANE_TEST_FILE`, carries the `task551` token, sits under
the `tests/integration/server` lane root and is not one of the nine
`TASK551_PLANNED_BUN_TEST_PATHS` (resolved at this tree by importing
`tests/perf/fixtures/task551QueryInventory.ts`). None of the four is a file
on disk at this tree.

**Placement (UTF-16 code-unit order).** `-` (U+002D) sorts before `.`
(U+002E). So each split test path sorts immediately before its original
path, and the three deployment parts sort as `-catalog`, `-evidence`,
`-rollout`. The new rows, with their v11 numbers:

| # | Path | Contracted via (owner) | On disk at `b98ed8d9` |
| --- | --- | --- | --- |
| 14 | `tests/integration/server/task551OnlineIndexDeployment-catalog.test.ts` | allowlist + argv + test-paths (TASK-551-05-L01) | no |
| 15 | `tests/integration/server/task551OnlineIndexDeployment-evidence.test.ts` | allowlist + argv + test-paths (TASK-551-05-L01) | no |
| 16 | `tests/integration/server/task551OnlineIndexDeployment-rollout.test.ts` | allowlist + argv + test-paths (TASK-551-05-L01) | no |
| 25 | `tests/integration/server/task551SolutionKitRollbackAuthoritySchema-static.test.ts` | allowlist + argv + test-paths (TASK-551-05-L03) | no |

**Renumbering.** Entries 1-13 keep their numbers. Old entry 14
(`task551OnlineIndexDeployment`) becomes 17. Old entries 15-21 become
18-24. Old entry 22 (`task551SolutionKitRollbackAuthoritySchema`) becomes
26. Old entries 23-27 become 27-31. The paths, owners and on-disk flags of
the old entries do not change. The list therefore has 31 entries: 17 on
disk and 14 declared-but-absent. The historical five are entries 10, 21
and 29-31. The two TASK-551-03-L02 suites are still entries 1 and 5. The
four class-E suites of **V4-4** are entries 27
(`task551DatabaseCachePerformanceGate`), 2 (`task551ServerCacheFaultMatrix`),
3 (`task551TwoProcessRedisSmoke`) and 28 (`task551ServerCacheSecurityGate`).

**The list, restated in order (31 entries; byte-exact).**

1. `tests/integration/routes/task551BoundedAdminLists.test.ts`
2. `tests/integration/runtime/task551ServerCacheFaultMatrix.test.ts`
3. `tests/integration/runtime/task551TwoProcessRedisSmoke.test.ts`
4. `tests/integration/server/task551ActionExecutionStore.test.ts`
5. `tests/integration/server/task551AdminWriteConcurrency.test.ts`
6. `tests/integration/server/task551AppendHeavyRetention.test.ts`
7. `tests/integration/server/task551AssistantDocsCandidateQuery.test.ts`
8. `tests/integration/server/task551CacheInvalidationOutboxSchema.test.ts`
9. `tests/integration/server/task551ConcurrencyConstraints.test.ts`
10. `tests/integration/server/task551DatabaseLifecycle.test.ts`
11. `tests/integration/server/task551DatabaseLifecycleRealDb.test.ts`
12. `tests/integration/server/task551DedicatedSessionGuards.test.ts`
13. `tests/integration/server/task551IndexAndConstraintCatalog.test.ts`
14. `tests/integration/server/task551OnlineIndexDeployment-catalog.test.ts`
15. `tests/integration/server/task551OnlineIndexDeployment-evidence.test.ts`
16. `tests/integration/server/task551OnlineIndexDeployment-rollout.test.ts`
17. `tests/integration/server/task551OnlineIndexDeployment.test.ts`
18. `tests/integration/server/task551RetentionJobService.test.ts`
19. `tests/integration/server/task551RevisionConcurrency.test.ts`
20. `tests/integration/server/task551RevisionRetention.test.ts`
21. `tests/integration/server/task551RuntimeEntrypoints.test.ts`
22. `tests/integration/server/task551SchemaMigrationParity.test.ts`
23. `tests/integration/server/task551SearchRankedQueries.test.ts`
24. `tests/integration/server/task551SearchVectorMigration.test.ts`
25. `tests/integration/server/task551SolutionKitRollbackAuthoritySchema-static.test.ts`
26. `tests/integration/server/task551SolutionKitRollbackAuthoritySchema.test.ts`
27. `tests/perf/task551DatabaseCachePerformanceGate.test.ts`
28. `tests/security/task551ServerCacheSecurityGate.test.ts`
29. `tests/unit/workflows/task551AuthorAudit.test.ts`
30. `tests/unit/workflows/task551EvidenceContract.test.ts`
31. `tests/unit/workflows/task551WorkflowContracts.test.ts`

**Verification (2026-09-27, DB-free, read-only, at `b98ed8d9`).** The
**V3-1** derivation was re-run: the first ```` ```json ```` fence of every
`TASK-551*.md` file; its `allowlist`, every command `argv` and every
`test-paths` discovery; filtered by the **V2-5** predicates and the
`scripts/bun-lane-classify.ts:62-73` lane roots. It yields exactly the 31
paths above, in that order. No other path is derived.
`DECLARED_NOT_YET_ALLOWLISTED` stays `[]`, because every new entry is
already named by its owner's fence. The TASK-551-10-L01 mirror (Addendum
**L10**) may name the same paths in the 10-L01 fence. A path named by
several fences is still one entry, and its owner stays the leaf whose
`allowlist` holds it (**V10-3**).

**`bunLane.ts` edit (V2-4, still the single writer).** The frozen
`TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS` holds the 31 paths above,
byte-exact and in order. Nothing else in **V2-4** changes. The **V2-8**
projection grows by four lines, to about 385. `contractedPathCount` stays
the length read from the tree at the time of the run (31 once this list
lands); **V2-5** case 2 still pins no count. At this tree the constant
(`scripts/task551QueryInventory/bunLane.ts:37-43`) still holds only the
historical five. The list of **V2-3**, with its **V3-1** and **V11-1**
growth, lands with the 01-L01 source edit. v11 changes that edit's target
list; it edits no source now.

- **Unchanged.** Classes, maps, owners and join timing stay as **V10-3**
  records them. Joining the static list is not joining the manifest. Each
  path gets a manifest row only once it is on disk, under the ordinary
  **V3-4** and **V5-2** rules. The two support modules are not test paths
  and join no list.

#### V11-2 Growth-rule state (V3-2) for the four paths

- **Mirror met.** The **V3-2** item 1 mirror for these four paths is
  **V11-1** (**K3**). The **V3-2** list "Owed additions at this tree" gains
  two items:
  - **TASK-551-05-L01 (fourth note, fence amendment 2).** The three
    deployment parts get their mirror through **V11-1**.
  - **TASK-551-05-L03 (Item N2-3).** The static suite gets its mirror
    through **V11-1**.
- **V10-8 disposed.** The **V10-8** observation is decided by **K3** and
  **L7**. v11 adds the four entries.
- **Observation (not decided here).** **V3-2** item 1 also puts the
  membership suite in the naming leaf's own gate set (the **V4-3**
  leaf-side command). A count-only grep for `task551BunLaneMembership`
  finds 0 matches in the 05-L01 task file and 0 in the 05-L03 task file at
  this tree. Neither **K3** nor **L7** disposes that part. The **V4-3**
  command passes only once the 01-L01 source edit carries **V2-5** cases 1
  and 8 with this list. Routed to the orchestrator.

#### V11-3 Item-12 done-check reworded (L7; K2)

- **Fact (from source at HEAD; the check was executed read-only).** Item
  0 landed at `b98ed8d9` (**K2**). `COMMANDED_TEST_PATHS` in
  `tests/integration/server/task551OnlineIndexDeployment.test.ts` holds the
  ten `migration-and-index-tests` paths, the three split paths among them.
  The 05-L01 fifth-note rule-7 awk form (under
  `### R1 item 12 split — script table corrected; budgets restated (Addendum J3)`,
  "Item-12 done-check (Addendum J2)") already prints 3 at this tree, before
  item 12. awk reports the missing `-support.ts` operand on stderr. No split
  test path is a file on disk; the three names occur only inside the item-0
  constant.
- **Rule.** From item 0 on, the `grep -c` = 3 check (**V10-4**, and the
  05-L01 rule-7 form) only guards retention. It shows that the three split
  paths are still in `COMMANDED_TEST_PATHS` and are declared once (a second
  declaration prints 6). It is never evidence that item 12 has landed. No
  receipt, `handoffs[]` entry or closure note cites it as landing evidence.
- **Landing evidence for item 12 (all three required).**
  1. The three split test paths
     `tests/integration/server/task551OnlineIndexDeployment-catalog.test.ts`,
     `…-rollout.test.ts` and `…-evidence.test.ts` exist on disk as files.
  2. The **V3-4** class-D PASS runs: for each of the three split paths, the
     owner-map run and the map-free run both PASS, with 0 failed and 0
     skipped (the **V10-3** class-D row; a skip in either run blocks).
  3. The 05-L01 fifth-note rule-7 awk form, run over the original suite and
     `tests/integration/server/task551OnlineIndexDeployment-support.ts` on
     the item-12 tree, prints 3.
- **Unchanged.** The other **V10-4** rules stand: from item 0 on, the J3
  pass is envelope evidence, and no expected-red row is recorded. v11 adds
  no FINAL step and no handoff row. Item 12 stays outside **V8-8** step 7
  and outside `### Handoff rows for 01-L01 v8`.

#### V11-4 Anchors (L7)

- **V9-4 quote anchors.** The **V9-4** "Quote anchors" bullet lists the
  **V7-10** quote for `:4155` as `:4768-4770`. The quoted fragment starts
  on `:4769`, so the anchor is `:4769-4770`, as **V10-5** already records
  for **V9-8**. The quote is in **V11-5**.
- **V10-9 O5 bullet: anchor kept at `:5229-5232` (L7 re-anchor not
  applied).** **L7** directs re-anchoring this bullet to `:5230-5232`.
  Re-read at `b98ed8d9` (and identical at `a3d46bf1`), `:5229` reads
  "worker branches and the O3 branch. O5 (class-A suite", and `:5230`
  begins with "`task551RevisionConcurrency`, whose DB legs skip". The quoted
  sentence begins on `:5229`, so `:5229-5232` is correct. A `:5230-5232`
  anchor would drop the quote's opening words. The line the audit read as
  `:5229` ("mirrors it (**H3**). The FINAL lane-runner run proves the five
  05-L01") is `:5228`. The V10-9 bullet is not superseded. This is
  routed to the orchestrator as a correction of the **L7** record.

#### V11-5 Superseded sentences (v11)

Quoted verbatim with their current lines (line breaks folded to spaces).
The quoted text is authoritative for what is superseded.

**v3 sentences and v3 replacement texts.**

- `:2845-2846` (**V3-1**, count sentence): "The list therefore has 27
  entries: 17 on disk and 10 declared-but-absent." Replaced by: 31
  entries, 17 on disk and 14 declared-but-absent (**V11-1**).
- `:2846-2847` (**V3-1**): "The historical five are now entries 10, 18,
  and 25-27." Replaced by: entries 10, 21 and 29-31 (**V11-1**).
- `:2854` (**V3-1** verification): "This yields exactly the 27 paths above
  in that order." Replaced by: at `b98ed8d9` the derivation yields exactly
  the 31 paths of **V11-1**, in that order.
- `:2858-2860` (**V3-1**): "The frozen
  `TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS` holds the 27 paths above,
  byte-exact and in order." Replaced by: it holds the 31 paths of
  **V11-1**, byte-exact and in order.
- `:2860-2862` (**V3-1**): "**V2-8** now projects `bunLane.ts` at about 381
  lines; the membership test projection is unchanged." Replaced by: about
  385 lines (**V11-1**); the membership test projection is unchanged.
- `:2866` (**V3-1** receipt, fragment): "(27 when v3 lands)". Replaced by:
  (31 when the **V11-1** list lands). The rest of the sentence stays.
- `:2910-2911` (**V3-2**): "They are ALREADY static entries 23, 2, 3, and
  24 (v2 entries 22, 2, 3, and 23) as declared-but-absent, so v3 adds no row
  for them." Replaced by: they are static entries 27, 2, 3 and 28
  (**V11-1** numbering), declared-but-absent; no row is added for them.
- `:2914-2915` (**V3-2**): "**No other leaf** names an unlisted `task551`
  Bun-lane path at this tree (derivation in **V3-1**)." Replaced by: at
  `b98ed8d9`, 05-L01 and 05-L03 name the four **V11-1** paths, mirrored by
  **V11-1**; no other leaf names an unlisted `task551` Bun-lane path
  (derivation in **V11-1**).
- `:3012` (**V3-6** replacement for `:2292`): "Replaced by: exact, 27
  entries (**V3-1**)." Replaced by: exact, 31 entries (**V11-1**).
- `:3016-3017` (**V3-6** replacement for `:2323-2325`): "Replaced by: 17 on
  disk, 10 declared-but-absent (the nine named in v2 plus
  `task551DedicatedSessionGuards`)." Replaced by: 17 on disk, 14
  declared-but-absent (the ten of **V3-1** plus the four of **V11-1**).
- `:3023` (**V3-6** replacement for `:2351`): "Replaced by: the 27 paths of
  **V2-3** as amended by **V3-1**." Replaced by: the 31 paths of **V2-3** as
  amended by **V3-1** and **V11-1**.
- `:3045` (**V3-6** replacement for `:2674-2675`): "Replaced by: static
  entries 25-27." Replaced by: static entries 29-31.
- `:3050-3051` (**V3-6** replacement for `:2758-2759`): "Replaced by:
  widened to the 27 paths of **V2-3** as amended by **V3-1**." Replaced by:
  widened to the 31 paths of **V2-3** as amended by **V3-1** and **V11-1**.
- `:3052-3053` (**V3-6** replacement for `:2766-2767`): "Replaced by:
  static entries 10, 18, and 25-27." Replaced by: static entries 10, 21 and
  29-31.

**v4 table cell.**

- `:3351` (**V4-4** class-E row, Suites cell): "`tests/perf/task551DatabaseCachePerformanceGate.test.ts` (static entry 23), `tests/integration/runtime/task551ServerCacheFaultMatrix.test.ts` (2), `tests/integration/runtime/task551TwoProcessRedisSmoke.test.ts` (3), `tests/security/task551ServerCacheSecurityGate.test.ts` (24)".
  Replaced by the same four paths with static entries 27, 2, 3 and 28
  (**V11-1**). The other cells of the row stay.

**v9 sentence.**

- `:5272-5273` (**V9-4** "Quote anchors", fragment): "**V9-8** adds the
  verbatim quotes v8 omitted (`:3561`, `:4565`, `:4568`, `:4768-4770`)."
  Replaced by: the same list with `:4769-4770` in place of `:4768-4770`
  (**V11-4**). The rest of the bullet stays.

**v10 sentences.**

- `:5597-5599` (**V10-4**): "The mechanical item-12 done-check stays as
  **J2** states it: `grep -c` of the three split paths in
  `COMMANDED_TEST_PATHS` is 3." Replaced by **V11-3**: that check guards
  retention only; item-12 landing evidence is the three split paths on
  disk, the **V3-4** class-D PASS runs and the 05-L01 fifth-note rule-7 awk
  form.
- `:5668-5669` (**V10-8**, fragment): "The **V3-1** static list (27
  entries) holds none of them". Replaced by: the **V11-1** static list (31
  entries) holds all four.
- `:5672-5673` (**V10-8**): "Routed to the orchestrator. This amendment adds
  no static-list entry." Replaced by: decided by **K3** and **L7**; v11 adds
  the four entries (**V11-1**, **V11-2**).

### Amendment v12 (2026-09-27)

Recorded at HEAD `0d28d915` from orchestrator decision **N9** (Addendum N
of `_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`;
audits `wf_cd2288a2-292`, 01-L01 reports d1 and d2). It records the
decision and does not re-decide it. Anchors are HEAD `0d28d915` lines,
re-read at this tree. v12 is append-only and supersedes earlier text only
where **V12-3** quotes it verbatim; every clause not quoted stays binding.
No fence byte, source or test file changes; no environment file was read.

#### V12-1 V11-3 Rule reworded (N9)

The **V11-3** Rule now reads: from item 0 on, the `grep -c` = 3 check
(**V10-4**, and the 05-L01 rule-7 form) shows that the three split paths
are still in `COMMANDED_TEST_PATHS` and are declared once (a second
declaration prints 6). On its own it is never landing evidence; it is
recorded only as the retention guard next to items 1-2 of the **V11-3**
landing-evidence list. Item-12 landing evidence is the three-part
conjunction of that list: the split files on disk (1), the **V3-4** class-D
PASS runs (2), and the rule-7 awk form printing 3 on the item-12 tree (3);
items 1-2 tell landed from not landed (the check printed 3 before item 12,
**V11-3** Fact). A receipt, `handoffs[]` entry or closure note citing the
check without items 1-2 cites no landing evidence. The other **V11-3**
bullets stay; v12 adds no FINAL step and no handoff row.

#### V12-2 Stale "27" sentences (N9)

Untruncated `grep -n '27 paths\|yields 27\|exactly 27'` hits nine lines:
`:2854`, `:2859`, `:3023`, `:3050` (v3, quoted by **V11-5**) and `:5947`,
`:5951`, `:5974`, `:5980` (those quotes) are historical; `:3020` (**V3-6**)
is live and stale. The second sentence d1 names is the v3 heading `:2824`
("27 entries"), also live and stale. In a wider `grep -n '\b27\b'`,
`:2844` is the v3 renumbering step **V11-1** builds on (historical); other
hits are dates, **V11-5** quotes or **V11-1** numbering. At `0d28d915`, 17
of the 31 **V11-1** paths are on disk; the first-fence `task551` test
paths, less two planned and six `tests/vitest` paths, are the same 31.

#### V12-3 Superseded sentences (v12)

Quoted verbatim with their current lines (line breaks folded to spaces).

- `:2824` (**V3-1** heading): "#### V3-1 Static list grows to 27 entries
  (finding H)". Replaced by: the static list has 31 entries (**V11-1**);
  the label **V3-1** stays the anchor for its v3 text.
- `:3018-3020` (**V3-6**): "`:2334-2335`: "This equals the v1 derivation
  result ("26 contracted paths, 17 of which are present on disk")."
  Replaced by: the fence derivation at this tree yields 27 paths, 17
  present (**V3-1**)." Only its replacement sentence is superseded, by: 31
  paths, 17 present (**V11-1**). Its `:1972` sentence stays.
- `:5898-5902` (**V11-3** Rule): "From item 0 on, the `grep -c` = 3 check
  (**V10-4**, and the 05-L01 rule-7 form) only guards retention. It shows
  that the three split paths are still in `COMMANDED_TEST_PATHS` and are
  declared once (a second declaration prints 6). It is never evidence that
  item 12 has landed. No receipt, `handoffs[]` entry or closure note cites
  it as landing evidence." Replaced by **V12-1**.
- `:6003-6006` (**V11-5** replacement for `:5597-5599`): "Replaced by
  **V11-3**: that check guards retention only; item-12 landing evidence is
  the three split paths on disk, the **V3-4** class-D PASS runs and the
  05-L01 fifth-note rule-7 awk form." Replaced by: replaced by **V11-3** as
  reworded by **V12-1**; on its own that check is never landing evidence.
