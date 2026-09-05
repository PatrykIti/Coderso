# TASK-551-01-L02: Small/Large Fixtures, Baselines, and Budgets
# FileName: TASK-551-01-L02-Small-Large-Fixtures-Baselines-And-Budgets.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-01
**Priority:** High
**Category:** Database / Performance / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-551-01-L01; TASK-551-01-L03 Isolated Fixture Target
Bootstrap; TASK-551-01-L04 Archive-Preserving Freeze-Candidate Generation
Bootstrap; TASK-551-11 compatibility bootstrap v2 (sidecar prerequisite, not a
product-graph leaf; it must pass before author-audit or this dispatch)
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Build reproducible, scoped fixture profiles and freeze the initial performance
budgets that all later TASK-551 leaves must meet. The large profile models
growing lists, append-heavy logs/revisions, search candidates, and aggregate
traffic without copying production data.

## Sub-Tasks

None; this is an executable leaf.

## File Ownership

**Allowlist (finite and exact):**

- `scripts/task-551-database-baseline.ts`
- `scripts/task551DatabaseBaseline/catalog.ts`
- `scripts/task551DatabaseBaseline/digestContract.ts`
- `scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts`
- `scripts/task551DatabaseBaseline/fixtureTarget.ts`
- `scripts/task551DatabaseBaseline/fixtureValidation.ts`
- `scripts/task551DatabaseBaseline/metrics.ts`
- `scripts/task551DatabaseBaseline/postgresTransport.ts`
- `scripts/task551DatabaseBaseline/receiptContract.ts`
- `scripts/task551DatabaseBaseline/requiredSanitizedCatalogProjection.ts`
- `scripts/task551DatabaseBaseline/reviewedPairPersistence.ts`
- `scripts/task551DatabaseBaseline/reviewedPairReceiptSource.ts`
- `scripts/task551DatabaseBaseline/reviewedPairTransition.ts`
- `scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts`
- `scripts/task551DatabaseBaseline/runner.ts`
- `scripts/task551DatabaseBaseline/runtimeProvenance.ts`
- `tests/perf/fixtures/task551DatabaseScale.ts`
- `tests/perf/fixtures/task551DatabaseBudgets.ts`
- `tests/perf/fixtures/task551AdminReadStatementShapes.ts`
- `tests/perf/fixtures/task489SolutionKitRunPredecessor.ts`
- `tests/perf/task551DatabaseBaseline/contractTestHelpers.ts`
- `tests/perf/task551DatabaseBaseline/freezeCandidateGenerationState.ts`
- `tests/perf/task551DatabaseBaseline/freezeCandidateGenerationFixture.ts`
- `tests/perf/task551DatabaseBaseline/freezeCandidateGenerationTestHelpers.ts`
- `tests/perf/database-query-baseline.test.ts`
- `tests/perf/task551DatabaseBaseline/digestContract.test.ts`
- `tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts`
- `tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts`
- `tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts`

This literal set is the L02 ownership/provenance closure. It authorizes no
other script, test lane, fixture root, or generic shared helper. In particular,
the checked-in `requiredSanitizedCatalogProjection.ts` is an L02-owned runner-
digest input imported by `digestContract.ts`. The legacy
`tests/perf/task551DatabaseBaseline/freezeReceipts.ts` is explicitly outside
this writer allowlist: it is immutable historical archive input only, pinned to
`17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f` and
may never be written, normalized, demoted, or used as the active pair.

**Phase-1 bridge inventory:** `freezeCandidateGenerationStore.ts`,
`reviewedPairReceiptSource.ts` (imported by `reviewedPairTransition.ts`),
`reviewedPairTransition.ts`, and `reviewedPairOwnerHost.ts` are required finite members of
`TASK551_RUNNER_DIGEST_SOURCE_PATHS`, the L02 dispatch/classifier allowlist, L02
current-byte receipt/provenance closure, and both line-count gates. The L11
provenance gate must require the facade, receipt source, implementation, owner host, and focused
`reviewedPairPersistence.test.ts` as accepted current regular non-symlink files;
only `_docs/_workflows/task-551-implement.mjs`'s outer composition root literal-dynamically imports the owner host, only after the distinct L02 code/test materialization closure; no other L11 module resolves it. That non-graph, non-evidence closure is after L04 closure/adaptation and before `single`, attests only the exact current regular non-symlink closed L02 source/test byte set, excludes archive/state/parent/lock/temp, and is not final L02 leaf closure. It must not add a test path or grow
`runnerLifecycle.test.ts`.

**Read-only L04/archive inputs (not ownership transfers):** L02 may import only
the pure L04 bootstrap parser/constant from
`scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts` and may
read the literal archive path declared there solely through its private store.
Before any active-state I/O, that store verifies the archive is a regular
non-symlink file with exactly the pinned raw SHA-256. Neither the archive nor
the L04 bootstrap is an active receipt map, a candidate source, a capability,
or a fallback. L02 owns the new active v2 state/fixture/helper modules named
above; its existing focused `reviewedPairPersistence.test.ts` owns the storage
state-machine matrix and may use the L02 test helper without creating another
Bun test-path row.

**Module-size gate:** every human-authored production, runner-private helper,
fixture, and test module in this allowlist must remain at most 1,000 physical
lines individually, including blank lines and comments. Splitting the runner or
focused tests does not relax that per-module gate; the closure validation must
check every file in both narrowly allowed helper directories as well as every
listed public file.

**Read-only L01 dependent input (not an ownership transfer):** only after the
initial L01 implementation has landed, the L02 static gate in
`tests/perf/database-query-baseline.test.ts` may import the one immutable value
`TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION` from
`tests/perf/fixtures/task551QueryInventory.ts`. L01 remains the sole writer of
that fixture, projection, its canonical-record validator, and the
L01-owned `tests/perf/database-query-inventory.test.ts` plus
`tests/integration/server/task551BunLaneMembership.test.ts`. L02 is a
read-only consumer of those L01 checks and the planned membership set; it may
not edit either test or the manifest. This one test-only value import does not
authorize L02 to edit another fixture root, recreate/normalize the L01
projection, or make the runner, digest contract, fixture-target seam, a
production module, or a workflow child depend on L01's fixture. The L02 shape fixture remains the sole owner of
`TASK551_ADMIN_READ_STATEMENT_SHAPES`, its canonical template serializer and
template digests, and the L02-only comparison helper described below; L01 must
never import, execute, or assert that future L02 registry.

`scripts/task551DatabaseBaseline/digestContract.ts` is the named L02-owned,
checked-in pure export for the sanitized catalog and canonical digest contract;
`tests/perf/task551DatabaseBaseline/digestContract.test.ts` is its focused test
owner. L02 alone imports and executes those exports to compute and verify its
digest contract. TASK-551-11 neither imports that module nor duplicates its
projection/hash work: its complete L02-facing handoff closure is the non-declared,
accepted-snapshot-only `registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition`
hook, public state-changing `runL02OwnedReviewedTransition`, the two pure
already-reduced-value active-state normalizers, and separately declared
`parseTask489PredecessorReceiptV1` predecessor parser.

`tests/perf/database-query-baseline.test.ts` and
`tests/perf/task551DatabaseBaseline/digestContract.test.ts` are default Bun-lane
tests: mock/static-only, database-free, and independently runnable with plain
`bun test`. They make zero database connections; never read, inspect, parse, or
use `DATABASE_URL`, `DATABASE_DIRECT_URL`, or any `TASK551_FIXTURE_DATABASE_*`
value; and never preflight, seed, clean up, measure, or execute the runner.
They remain so even when a developer has a `.env` file. For every L02
profile/evidence chain, L11 must re-run each of these two tests in a separate
isolated, database-free child and capture one mandatory sanitized receipt per
test. That evidence child has an explicit non-inherited static map with no
generic or fixture database value, no fixture target, and no target authority;
it does not authorize a target parse or any database activity. The association
with a profile/evidence chain belongs only to L11's surrounding evidence record,
not to the test's input. `fixtureTarget.test.ts` is excluded: it is
default-Bun/finalization-only and receives neither an isolated map nor an
isolated receipt.

`scripts/task551DatabaseBaseline/fixtureTarget.ts` is the named L02-owned,
import-safe fixture-target seam. Its focused owner is
`tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts`. The public runner
and TASK-551-05-L02 import this exact module read-only for target parsing and
proofs; neither may import the other, redefine a target type/parser/proof, or
add a generic environment fallback. Its focused test uses injected fake clients
only and is likewise default-Bun-lane/database-free; it never opens a driver
connection or receives a live fixture target. It is a finalization-only static
test, never an L11 isolated-evidence command and never a recipient of an
isolated child map or profile-evidence receipt.

**Forbidden:** production code, migration/meta files, task/changelog/workflow
files, and all TASK-511/517/493/518 owned paths.

**Workflow evidence boundary:** L02 agents never create or edit workflow
sidecars, smoke receipts, or `_docs/_workflows/**`; TASK-551-11 is their sole
owner. This leaf may expose only its checked-in, sanitized fixture/budget
contracts to later consumers. L02 emits an ephemeral, machine-parseable
`--check` success line as specified below, but never captures, persists, or
turns that line into command evidence. TASK-551-11 alone captures and validates
the command stdout and redacted command receipt, then writes its durable audit
evidence in its own allowlist. For every L02 profile/evidence chain, that sole
L11 evidence role also requires the two separate isolated, database-free static
receipts named above; `fixtureTarget.test.ts` remains default-Bun/finalization-
only with no isolated receipt or map. The same boundary applies to the later TASK-489
predecessor receipt: L02 owns its schema/parser/serializer contract only, L05
writes only its temporary file, and L11 alone validates, hashes, and promotes
durable evidence.

### Recovery/re-entry boundary for premature L02 materialization

Any current bytes in the L02 allowlist that were materialized before this leaf's
dependency sequence has been accepted are **reference-only recovery inputs**.
That includes the current `database-query-baseline`, `digestContract`,
`fixtureTarget`, `reviewedPairPersistence`, and `runnerLifecycle` test bytes,
plus every current L02 source byte in `scripts/task-551-database-baseline.ts`
and the allowlisted `scripts/task551DatabaseBaseline/**` modules. They are
neither an L02 receipt nor evidence of L02 completion: they do not grant a
status transition, satisfy a static/finalization/provenance gate, or change the
required graph order `L01 initial -> L03 -> L04 -> L02`. This boundary does not
authorize accepting, deleting, resetting, reverting, relabeling, or otherwise
disposing of those current bytes.

During recovery-initial, no L02 reference input permits `--freeze` or `--check`,
fixture-target parsing or use, active-state or archive I/O, broker consumption,
child-process execution, or durable evidence creation. All such behavior and
every reference input remain unaccepted until the L04 predecessor has closed
and the normal L02 materialization, static, provenance, and finalization gates
have independently passed.

After L04 has closed and its bootstrap/archive contract is available, the L02
owner must preserve and re-home the useful reference inputs under this leaf's
finite allowlist into a legal L02-owned implementation and test state. That
owner-controlled recovery must independently satisfy the normal L02
materialization, static, provenance, and finalization gates; prior presence of
a file, a passing subset of tests, or a historical workflow artifact is never a
substitute for any of those gates. A distinct, authorized archival procedure is
required for any later disposal decision.

L02, and not L01, is the sole owner for resolving this re-entry state in its
owned sources and tests, including `runnerLifecycle.test.ts`, the reviewed-pair
persistence/receipt-source/transition/owner-host modules and their active
store, and their focused persistence test. L01 retains only its initial
inventory contract and may not absorb, normalize, repair, or reclassify those
L02 paths in order to make its initial gate pass.

### Isolated scenario and fixture-target gate

TASK-551-01-L03 is the sole planned bootstrap owner. TASK-551-11's workflow
launcher is the sole supported owner of the ordered L02 **fixture-operation**
child-process boundary. Its required order is: the L01 initial inventory gate;
L03 completion and current durable redacted L03 evidence after L11 has destroyed
the initial L03 source and four-key map; L04's focused DB-free closure plus
L11's source-free non-durable L04 provenance gate; L02's database-free static gates and
manifest finalization, including the required isolated static receipts; then a
one fresh author-audit opaque broker bound to exactly one canonical
phase/operation tuple; then the public runner's `--freeze`/`--check` operation.
The later dynamic TASK-551-05-L02 phase is not an L02 fixture operation: it uses
only its four independent L11 `05-l02` broker contexts and three-value maps.
Durable L03 evidence is a sequencing
prerequisite only: it is never L02 fixture authority, a source, a value, a map,
or material for retaining, reusing, reconstructing, or mapping an L03 source/map.
Those are the only L02 paths permitted to construct or receive a live
fixture/DB3 client. After L02 finalization, the L11 implement/fix boundary
passes one opaque `Task551PhaseSourceBrokerV1` to the adapter, which calls
`consumeOnce(expected)` only for the closed L02 freeze/check small-or-large
context before any supplier/raw-value read and discards the broker/source after it derives
values. L02 defines no raw-ingress type or independent phase label.
It maps only the broker-derived DB3 URL and sentinel plus literal `coderso02` to
exact three-key `fixtureValues`: `TASK551_FIXTURE_DATABASE_{URL,NAME,SENTINEL}`.
Confirmation is deliberately absent from L02 and 05-L02; it is the narrow L03
four-value exception only.

For those fixture operations only, L11 builds an exact-own `childEnv` from the
three `fixtureValues` plus only defined `PATH`, `TMPDIR`, `LANG`, `LC_ALL`, and
`TZ`; it rejects every other key and never merges or inherits an environment.
Its Bun launch uses an argv array (never a shell/string wrapper) whose canonical
prefix is `["bun", "--env-file=/dev/null", ...]`; L11 records only the safe
`Task551CommandReceiptV1.logicalArgv` descriptor
`{ contractId:"coderso.task551.logical-argv@v1", sha256:<raw lowercase 64-hex>, argCount, envFile:"--env-file=/dev/null" }`,
derived from the fixed context-bound registry's version-magic, u32-big-endian-
length-framed UTF-8 preimage before trusted Bun-path substitution, so a missing, substituted, or
relocated flag invalidates evidence. The flag prevents implicit dotenv loading
and is not an environment assignment. This mandatory L11-only regime does
**not** apply to default-Bun static tests, `core` lint/
type lint, or `gates:coderso:perf`: those are non-fixture gates, receive no
fixture map by default, and cannot parse a target, instantiate a fixture client,
connect to DB3, or read generic database state. The two mandatory L11 isolated
static evidence reruns are separately database-free: they use an explicit
non-inherited static map with no generic/fixture database value or target, are
not fixture operations, and do not make `fixtureTarget.test.ts` eligible for an
isolated map or receipt.

The L02 runner and target seam receive only their three direct fixture values.
The target seam parses only `TASK551_FIXTURE_DATABASE_URL`,
`TASK551_FIXTURE_DATABASE_NAME`, and `TASK551_FIXTURE_DATABASE_SENTINEL`; it
requires the name value to byte-equal the literal `coderso02` and rejects every
other name before URL use or client construction. Apart from the one real
CLI-only transport adapter specified below, L02 code must not construct,
enumerate, inspect, persist, hash, or log a parent or child environment, read
`process.env`/`Bun.env`, or use a generic/dotenv fallback. The handoff is
environment-only: neither L02 source nor its receipts, errors, snapshots, or
commands expose values. L02 never creates, replaces, repairs, truncates, or
otherwise provisions `task551_fixture_sentinel`; missing or invalid durable L03
evidence, L02 database-free finalization, fresh broker-bound L02-operation
validation, or L11 target proof is a hard `database_baseline_invalid` failure.
The fixture-operation validation sequence is L01 initial gate, durable redacted
L03 evidence after the initial L03 source/map is destroyed, L02 database-free
static and manifest finalization including its required isolated static receipts,
L11's fresh broker-bound L02-operation validation and direct three-value mapping,
strict L02 three-value parse, one
rolled-back L02 identity/sentinel proof, then and only then seed/measure/cleanup.
Every supported default/direct runner path that lacks the exact three own fixture
values or has malformed argv/env fails before target parsing or a database
connection. That workflow provenance policy is not a cryptographic or local-OS
authentication boundary: no secret/capability is transported, and an equally
privileged local process could independently reproduce non-secret valid values.
Such a process is outside the accepted L11 workflow/evidence path; the contract
does not claim that its direct valid-value invocation necessarily fails.

### Fixture-operation CLI environment adapter

TASK-551-11 deliberately launches the real L02 fixture-operation child with an
exact-own `childEnv`: three `fixtureValues` and only defined members of its fixed
OS allowlist `PATH`, `TMPDIR`, `LANG`, `LC_ALL`, and `TZ`. The launch is an argv
array with literal `--env-file=/dev/null`, never a shell/string wrapper or an
inherited/merged environment. Consequently the public runner needs one narrow
transport boundary, rather than an ambient-environment fallback. Only the actual
`if (import.meta.main)` wrapper in
`scripts/task-551-database-baseline.ts` may snapshot that already
non-inherited child process environment. Imports, pure helpers, target parsing,
runner/main seams, digest code, fixture code, and tests never read
`process.env`, `Bun.env`, or `process.argv`.

The wrapper first performs exactly one key-name-only enumeration of the child
environment. It admits only the three literal L02 fixture names plus the five
listed OS names; the OS values are not copied or passed onward. Before it reads
any value, it rejects every other child key, a direct `DATABASE_URL3`,
`DATABASE_URL`, or `DATABASE_DIRECT_URL`, every other `DATABASE_*` key, every
`TASK551_FIXTURE_BOOTSTRAP_*` key, and every extra or renamed `TASK551_*`/
`TASK551_FIXTURE_*` key. The namespace pass must not dereference an unknown,
OS, or forbidden value. Only after that pass may it read each of the three
fixture values exactly once, require present string own properties, and assign
them explicitly into a newly allocated ordinary three-own-property map. It must
then call `assertTask551FixtureTargetChildKeys` on that fresh map, so inherited,
missing, extra, sparse, `undefined`, or non-string members fail before target
parsing or client construction. It must not spread, merge, retain, return, log,
hash, persist, or otherwise expose the source process map or an OS value.

The same guarded wrapper snapshots child argv once into an owned argument array
and passes only that argv plus the fresh three-key map into an injectable
runner/main seam. It neither passes `process.env` itself nor creates another
configuration path. The seam accepts exactly the existing `--freeze` and
`--check` modes and applies normal closed argv/profile/selector validation; no
omitted, duplicate, combined, or alternative mode may reach target parsing.
The snapshot and entry-forwarding helpers are module-private; the guarded
wrapper is their only production caller, and no import, test, or export may
invoke them. The entry wrapper must load neither dotenv nor a generic/runtime/direct URL,
must not merge any environment source, and must emit no environment, argv,
target, URL, name, sentinel, or raw error value. Importing the module never
invokes this wrapper. A process launched without L11's exact child transport
therefore fails through the redacted `database_baseline_invalid` boundary before
target parsing or a client exists.

### Default Bun static-contract lane

The ordinary developer/CI commands
`bun test tests/perf/database-query-baseline.test.ts` and
`bun test tests/perf/task551DatabaseBaseline/digestContract.test.ts` exercise
only static registries, pure serializers/parsers, injected fakes, and source
contract assertions. They are deliberately not a miniature fixture run: they
must make zero calls to a database client/driver/network connection and must not
invoke `parseTask551FixtureTarget`, a preflight, seed, cleanup, `VACUUM`,
measurement, `--freeze`, or `--check`. Their test setup must not even read the
generic or fixture database variable names; a poisoned `DATABASE_URL`,
`DATABASE_DIRECT_URL`, `TASK551_FIXTURE_DATABASE_*`, or present `.env` is
therefore inert. `fixtureTarget.test.ts` uses only a fake injected transaction
client and follows the same database-free rule; it is finalization-only and has
no L11 isolated evidence receipt or child map.

For every L02 profile/evidence chain, L11 must run the two named static tests
under separate explicit non-inherited static child maps and
`--env-file=/dev/null`, capturing one required zero-exit/no-skip isolated receipt
for each test. The maps contain no generic/fixture database value or target, and
the profile/evidence-chain association remains outside the test process. This is
mandatory evidence transport, not an execution prerequisite: the tests remain
byte-for-byte database-free, must not inspect supplied values, and cannot turn
their isolated map into target authority. `bun --cwd core lint:types`, `bun
--cwd core lint`, and `bun run gates:coderso:perf` remain ordinary static,
non-fixture gates. In this L02 contract they may not import/execute the fixture
runner or a live target client, read generic/fixture database configuration, or
open any DB3/database connection.

### Shared import-safe fixture-target seam

`scripts/task551DatabaseBaseline/fixtureTarget.ts` is the sole L02 owner of the
fixture-target parse and proof contract. It is intentionally independent of the
public runner and of L05: it has no import of the runner, `db/client`, a driver,
environment/runtime adapter, dotenv loader, filesystem, clock, or settings
service; it reads no `process.env`/`Bun.env` at import time or call time. Every
input is an explicit argument, and every database operation is supplied through
the injected client below. Importing it performs no I/O and cannot discover a
target.

```ts
export const TASK551_FIXTURE_TARGET_CHILD_KEYS = [
  "TASK551_FIXTURE_DATABASE_URL",
  "TASK551_FIXTURE_DATABASE_NAME",
  "TASK551_FIXTURE_DATABASE_SENTINEL",
] as const;
export const TASK551_AUTHORIZED_FIXTURE_DATABASE_NAME = "coderso02" as const;
export type Task551FixtureTargetChildValues = Readonly<{
  TASK551_FIXTURE_DATABASE_URL: string;
  TASK551_FIXTURE_DATABASE_NAME: typeof TASK551_AUTHORIZED_FIXTURE_DATABASE_NAME;
  TASK551_FIXTURE_DATABASE_SENTINEL: string;
}>;
export type Task551FixtureTarget = Readonly<{
  url: string;
  expectedDatabaseName: typeof TASK551_AUTHORIZED_FIXTURE_DATABASE_NAME;
  sentinel: string;
}>;
export type Task551FixtureTargetProof = Readonly<{
  rolledBack: true;
  currentDatabaseMatched: true;
  exactSingleMarkerMatched: true;
  boundSentinelByteMatched: true;
}>;
export type Task551FixtureTargetProofObservation = Readonly<{
  currentDatabaseMatched: boolean;
  markerCount: number;
  boundSentinelByteMatched: boolean;
}>;
export type Task551FixtureTargetReadOnlyTransaction = Readonly<{
  readFixtureTargetProof(input: Readonly<{
    expectedDatabaseName: typeof TASK551_AUTHORIZED_FIXTURE_DATABASE_NAME;
    expectedSentinel: string;
    marker: "task551-baseline-v1";
    sentinelTable: "public.task551_fixture_sentinel";
  }>): Promise<Task551FixtureTargetProofObservation>;
  rollback(): Promise<void>;
}>;
export type Task551FixtureTargetClient = Readonly<{
  beginReadOnlyTransaction(): Promise<Task551FixtureTargetReadOnlyTransaction>;
}>;
export function assertTask551FixtureTargetChildKeys(
  value: Readonly<Record<string, unknown>>,
): Task551FixtureTargetChildValues;
export function parseTask551FixtureTarget(
  value: Readonly<Record<string, unknown>>,
): Task551FixtureTarget;
export function assertTask551FixtureTarget(
  target: Task551FixtureTarget,
  client: Task551FixtureTargetClient,
): Promise<Task551FixtureTargetProof>;
export function assertTask551FixtureTargetPostCleanup(
  target: Task551FixtureTarget,
  client: Task551FixtureTargetClient,
): Promise<Task551FixtureTargetProof>;
```

`assertTask551FixtureTargetChildKeys` accepts only a purpose-built, direct
three-key target submap. It requires its own enumerable keyset to equal the
literal tuple above, with no inherited properties, unknown key, generic
`DATABASE_URL`/`DATABASE_DIRECT_URL`, bootstrap key, OS key, `undefined`, or
non-string member. It never receives, enumerates, clones, or filters a parent
environment; L11 validates its larger child map separately and constructs this
three-key value explicitly. `parseTask551FixtureTarget` calls that validator
itself, rejects empty/malformed direct values and every database name other than
the exact literal `coderso02`, and returns an immutable target. It never reads
`process.env`, falls back to a generic URL or dotenv source, accepts a parent
map, or derives/reconstructs a value.

Both proof functions start a new injected-client read-only transaction and
require its adapter to parameterize
`SELECT current_database() = $1::text AS current_database_matched` with the sole
database-name bind `coderso02`; interpolation or a caller-selected name is
invalid. They request only that boolean/count observation, the literal
`public.task551_fixture_sentinel`, marker `task551-baseline-v1`, and the bound
sentinel byte comparison, and always await `rollback()` in `finally`. They
require `currentDatabaseMatched === true`, `markerCount === 1`, and
`boundSentinelByteMatched === true`; only then they return the four literal-true
fields of `Task551FixtureTargetProof`. They return no target, URL, database/user
name, marker, sentinel, hash, SQL, raw observation, or driver value. A begin,
read, comparison, or rollback failure becomes a newly constructed redacted
`database_baseline_invalid` error with no cause or attached driver detail; the
post-cleanup variant has the same parameterized proof bound to `coderso02` but
is a distinct required lifecycle call so nested cleanup `finally` blocks cannot
accidentally omit it.

The public runner imports `parseTask551FixtureTarget`,
`assertTask551FixtureTargetChildKeys`, `assertTask551FixtureTarget`, and
`assertTask551FixtureTargetPostCleanup` only from
`./task551DatabaseBaseline/fixtureTarget`. TASK-551-05-L02 imports those same
symbols only from repository path
`scripts/task551DatabaseBaseline/fixtureTarget.ts`, never from
`scripts/task-551-database-baseline.ts` and never through a wrapper or local
parser/proof. L05 supplies its own injected read-only client; it gains neither
the runner's CLI/environment authority nor target-provisioning authority.

`TASK551_SCENARIOS` in `task551DatabaseScale.ts` is the canonical, static,
reject-unknown manifest. A manifest entry is a stable object with `id`,
`kind`, `targetStatementOrFamily`, `minimumClosure`, `supportTables`,
`expectedTableCounts`, `ownedKeyPredicate`, and `equalityParticipation`.
`expectedTableCounts` is a deterministic derivation from the selected profile,
the declared family recipe, and the listed support-table recipe; it is not a
copied all-family matrix. `ownedKeyPredicate` is a closed predicate descriptor
over the UUIDv5 scope/profile/scenario key representation, never arbitrary SQL.
The fixture source is the sole literal manifest and per-table derivation owner;
the prose below specifies its required classes and recipes, not a second table
matrix that could drift from it.

`public.task551_fixture_sentinel` is an L03-owned, preserve-only table, not a
fixture table. The static manifest validator rejects both that schema-qualified
name and its bare spelling in every mutable/ownership slot: derived
minimum-closure table, `supportTables`, `expectedTableCounts`,
`ownedKeyPredicate`, and lifecycle-ledger table or batch descriptor. The only
L02 reads permitted to name that table are the rolled-back target proofs. Seed,
assertion, and cleanup builders receive only validated ledger descriptors and
must never generate a sentinel-table mutation or cleanup query.

The manifest has three disjoint classes:

- The exact 32 `admin-shape` entries each name one L01 Admin ID, its canonical
  statement target, minimum parent/support closure, expected per-table
  seed/cleanup derivation, and owned-key descriptor. They alone have
  `equalityParticipation:"admin-32"`; their IDs must be in exact 32-way equality
  with the L01 planned IDs, shape templates/digests, and budget IDs.
- Explicit `supplemental` entries cover `public-html-dependencies-128`, each
  named retention/batch family, and other required non-Admin L02 baseline
  cases. They declare the same closure/count/key fields, have
  `equalityParticipation:"supplemental"`, and are deliberately excluded from
  the 32-way equality rather than silently inflating it.
- `task489-predecessor` is a deferred static-registry entry with
  `equalityParticipation:"deferred"`. It permits L02 arithmetic and registry
  validation only; its normalized-support seed, execution, plan capture, and
  cleanup are absent from the executable L02 manifest and are owned later by
  TASK-551-05-L02 after its declared schema dependencies land.

The CLI requires exactly one of `--scenario <id>` or `--all`; neither an omitted
selector nor both selectors are valid. `--scenario` executes one manifest entry.
`--all` expands only executable `admin-shape` and `supplemental` entries in
stable manifest order, sequentially. For every member it seeds only the
declared minimum closure, validates its derived counts, measures it, deletes
owned rows child-first, proves zero residue, and then re-proves in a rolled-back
read-only transaction with a parameterized `current_database() = $1::text`
comparison bound to literal `coderso02` that the exact database and one
marker/sentinel byte are
unchanged before the next member begins or the command can succeed. A supplied
family is not sufficient when its FK parents/support rows are required, and
seeding unrelated families is invalid.

Database access is fixture-only and fail-closed. After the one CLI-only adapter
has made its exact fresh map, the harness reads exactly the strictly validated
`TASK551_FIXTURE_DATABASE_URL`, `TASK551_FIXTURE_DATABASE_NAME`, and
`TASK551_FIXTURE_DATABASE_SENTINEL` direct child values; it never reads
`DATABASE_URL3`, `DATABASE_URL`, `DATABASE_DIRECT_URL`, a loaded `.env`,
`process.env`, or a parent/child environment map. Before any seed, it opens one
transaction and proves with a parameterized
`current_database() = $1::text` check bound to literal `coderso02` that the
current database byte-equals `coderso02` and that the pre-provisioned
fixture-only `task551_fixture_sentinel` has exactly one
`task551-baseline-v1` row whose bound sentinel byte-equals the configured
opaque sentinel. It rolls that transaction back and emits only a stable
`database_baseline_invalid` reason on absent, duplicate, or mismatched proof.
The target identity, URL, sentinel, database/user name, and SQL binds never
enter a receipt, error, or test output. Strict environment validation precedes
all connections; the rolled-back proof precedes every seed or measurement pool,
schema inspection, `VACUUM`, seed, and cleanup.

After every scenario cleanup, L02 repeats that same rolled-back identity and
one-marker/sentinel-byte proof. It is a mandatory postcondition after normal
success and after zero-ledger, partial-seed, full-seed, assertion, measurement,
or cleanup failure; a failed cleanup does not skip the preservation proof. Any
cleanup, zero-residue, or post-cleanup preservation-proof failure fails closed,
blocks the next scenario, and reaches the outer redacted
`database_baseline_invalid` boundary without target detail.

`validatedRunScope()` creates a cryptographically random UUID scope; every
fixture ID incorporates its scope, profile, family, and ordinal, while every
non-ID key additionally carries the scenario identifier; receipts retain only
the scope SHA-256 digest. Before seed, a mutable per-table fixture lifecycle
ledger exists; its `try/finally` begins before every seed/assert/measure step and
records each successful owned batch and ID predicate. On any seed/assert/measure
failure, including zero/partial/full ledger state, it cleans child-first, proves
exact actual deleted/retained counts and zero residue, and then performs the
same rolled-back one-marker/sentinel-byte preservation proof. The ledger and
all owned-key predicates reject the preserved sentinel before a write can be
planned; cleanup derives delete targets solely from those validated owned
descriptors and never names the sentinel table. Its nested `finally` runs the
post-cleanup proof even when cleanup itself throws, and propagates cleanup,
residue, or proof errors unsuppressed to fail the scenario and block the next
one.

The following profile recipes feed the manifest's deterministic count
derivations; an executable scenario materializes only the rows required by its
declared closure, never this complete list at once:

| Family | Small | Large | Relationship recipe |
|---|---:|---:|---|
| users | 100 | 10,000 | exactly one primary role per user; the deterministic additional-role subset is specified below |
| pages | 500 | 100,000 | authors cycle through profile users |
| content types / entries | 20 / 2,000 | 200 / 100,000 | `authorOrdinal=ordinal%userCount`; `occurrence=floor(ordinal/userCount)`; `typeOrdinal=(authorOrdinal+occurrence)%typeCount`, preserving even type totals while spreading repeat rows across types |
| posts | 1,000 | 100,000 | authors cycle through profile users |
| media | 2,000 | 100,000 | 20 / 1,000 folders; exactly 10% null folder |
| form submissions | 2,000 | 100,000 | 20 / 200 forms, even distribution |
| bookings | 2,000 | 100,000 | 20 / 1,000 resources/services; 20% each current status |
| `booking_blackouts` | 500 | 100,000 | exactly 10% global (`resource_id IS NULL`); remaining rows cycle evenly through the profile resources |
| `booking_service_resources` | 100 | 5,000 | exactly five distinct resources per service, ordered by `resource_id` |
| `booking_schedules` | 140 | 7,000 | exactly seven day rows per resource, ordered by day/start/id |
| search history | 5,000 | 100,000 | distributed evenly by profile users |
| `access_logs` | 5,000 | 100,000 | actor/user references cycle through profile users; methods cycle `GET,POST,PATCH,DELETE`; status codes cycle `200,201,400,403,404,429,500` |
| `audit_logs` | 5,000 | 100,000 | actor references cycle through profile users including every tenth row `NULL`; actions cycle `create,update,publish,delete` |
| `email_delivery_logs` | 5,000 | 100,000 | status cycle `queued,sent,failed`; provider cycle `smtp,mock`; no support rows |
| `integration_requests` + `integrations` support | 5,000 + 10 | 100,000 + 200 | requests distributed evenly across exact support integrations; status cycle `pending,success,failed` |
| `webhook_deliveries` + `webhooks` support | 5,000 + 20 | 100,000 + 200 | deliveries distributed evenly across support webhooks; status cycle `pending,success,failed`, attempts `0,1,2,3`; webhook events cycle ten canonical values and event 0 appears on exactly 10% |
| `sessions` | 5,000 | 100,000 | users cycle through profile users; exactly 20% revoked, 20% expired-unrevoked, and 60% active |
| `password_resets` | 5,000 | 100,000 | users cycle through profile users; synthetic unique token hashes are never emitted |
| `preview_tokens` / `post_preview_tokens` | 2,500 / 2,500 | 50,000 / 50,000 | page and post parents cycle independently; synthetic unique token hashes are never emitted |
| `assistant_doc_ingest_runs` | 5,000 | 100,000 | 100 / 1,000 canonical `source_root` values; 50 / 100 runs per source |
| `settings` | 50 | 500 | deterministic unique keys; scalar/object/array values repeat in a fixed three-row cycle |
| `redirects` | 500 | 100,000 | unique source paths; status-code cycle `301,302,307,308`; exactly 90% enabled |
| assistant docs / chunks | 200 / 2,000 | 10,000 / 100,000 | exactly 10 chunks per doc |
| assistant executions / undo items | 1,000 / 3,000 | 100,000 / 300,000 | exactly 3 undo items per execution |
| analytics sessions / pageviews | 2,000 / 10,000 | 20,000 / 100,000 | exactly 5 pageviews per session |
| `form_action_runs` + `form_actions` support | 6,000 + 60 | 300,000 + 600 | exactly 3 runs/submission and 3 actions/form; action/run FKs cycle without orphan rows |
| `solution_kit_install_runs` / items | 1,000 / 5,000 | 100,000 / 500,000 | 20 / 200 kit IDs; exactly 5 ordered items/run |
| each page/content/post/widget/detail revision family | 2,000 | 100,000 | 20 / 100 versions for 100 / 1,000 parents |

The general TASK-551 matrix above remains unchanged. In addition, the dedicated
TASK-489 predecessor fixture is mandatory and deliberately separate from both
the general `solution_kit_install_runs` scenario and the closed 37-ID TASK-551
plan registry. Its bulk history is exactly 10,000 small / 1,000,000 large runs
with ten-equal-timestamp groups and 20/2,000 package keys. The required bounded
support adds exactly 109,890 runs in either profile (103,727 relation-heavy
history, 6,157 supersession chains, and 6 sentinel/owner/rollback graph runs),
so the predecessor scenario's exact total is 119,890 small / 1,109,890 large
runs. It also has one 513-item detail sentinel, one active Setup owner graph,
one running rollback graph, and relation chains of 0/1/511/512/513 newer
successful applies with exact successful rollback rows. The 513-chain case has
all 513 rolled back; companion cases place one unrolled row first/middle/last.
Both all-history and package-history fixtures include one page of exactly 101
legacy candidates, each with up to 513 newer applies and indexed successful-
rollback relations, so the endpoint's per-row classifier is measured as a whole
page rather than one source.

L02's initial phase validates this arithmetic and the static parameterized
registry only. Here and only for TASK-489 predecessor portions, `static-only`
means registry/arithmetic validation before TASK-551-05-L01 and TASK-551-05-L03
land their normalized schema surfaces; it does not make ordinary executable L02
Admin or supplemental fixture/baseline scenarios static. L02 must not seed or
execute the predecessor's normalized owner/template-evidence/progress rows.
The future normalized registry field is exactly `source_run_id`, never
`owner_run_id`. Its safe-detail projections exclude `actor_id`, options,
summary payloads, snapshots, rollback actions, envelopes, and raw error bytes;
it may not smuggle an actor or another unsafe field through a JSON projection.
TASK-551-05-L02 is the deferred read-only consumer: after its declared schema
dependencies land, it owns dynamic normalized-support closure, safe projection,
fixture-only execution, one sanitized temporary 30-statement-scale receipt, and
fail-closed cleanup proof described in its own contract. L11 alone later
validates that temporary receipt, records its digest, and promotes its exact
canonical bytes; L05 has no durable-evidence or successor-consumption authority.
The static registry names only
future normalized columns, strict synthetic digests/event keys, UUIDv5
scope-derived IDs, and child-first ownership; it neither invents a pre-05
database dependency nor writes a workflow sidecar.

TASK-551-01-L02 alone owns
`tests/perf/fixtures/task489SolutionKitRunPredecessor.ts`. It exports exactly
`Task489CompanionId`, `Task489StaticPlanStatement`,
`TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS`, and
`TASK489_SOLUTION_KIT_RUN_PREDECESSOR_CASES`; its canonical receipt exports are
`TASK489_SOLUTION_KIT_RUN_PREDECESSOR_RECEIPT_SCHEMA`,
`Task489PredecessorFixtureCountsV1`,
`Task489PredecessorLogicalCaseV1`,
`Task489PredecessorReceiptV1`,
`Task489PredecessorStatementReceiptV1`,
`Task489PredecessorProfileResultV1`,
`TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS`,
`TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES`,
`TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS`,
`createTask489PredecessorReceiptV1`,
`serializeTask489PredecessorReceiptV1`, and
`parseTask489PredecessorReceiptV1`. The cases export remains the sole registry
of static parameterized statement builders and finite small/large numeric budgets
for exactly five companion IDs:
`task489-runs-all-keyset`, `task489-runs-package-keyset`,
`task489-effective-supersession`, `task489-active-starter-owner`, and
`task489-safe-detail`. They are future-query contracts consumed read-only by
TASK-551-05-L02. After L11's required first validation and sole promotion,
TASK-551-10-L01 and
TASK-489 consume only the promoted bytes and L11-recorded hash, verify that
hash, then call the sole L02 parser directly on those exact bytes; no other leaf
writes or forks this fixture, and they do not alter the TASK-551
Admin planned-count or general plan-registry cardinality. Their exact companion
shape is five IDs, fourteen logical cases, fifteen statement cases, and thirty
numeric small/large statement receipts: two history cases per history ID; eight
supersession cases; one active-owner case; and one safe-detail logical case with
separate run-point and item-page statements.
For L11, this remains an L02-owned/line-counted static-registry source, but is
not a 05-L02 `readOnlyImports` or generic sidecar import/discovery/validation/
closed/worktree/pre-spawn input; only
`readTask55105L02PredecessorAtNamedSeam` may recheck its exact regular bytes and
literal-resolve it after the named later seam.

### Canonical TASK-489 predecessor receipt handoff

The same L02 fixture is the **only** owner of the predecessor receipt schema.
It exports `TASK489_SOLUTION_KIT_RUN_PREDECESSOR_RECEIPT_SCHEMA` with the exact
literal value `"coderso.task551.task489-predecessor@v1"`; neither TASK-551-05-L02
nor TASK-551-10-L01 may define a parallel receipt type, a keyed statement map,
or another companion-ID tuple. L05 imports the L02 serializer only to write its
single temporary artifact; L11 first calls
`parseTask489PredecessorReceiptV1` to validate that temporary artifact and alone
promotes it. After L11's promotion, TASK-551-10-L01 and TASK-489 read only the
durable bytes and L11-recorded hash, verify the hash before calling that same
sole L02 parser directly on the exact durable bytes, and never read the
temporary file, use the serializer, define a receipt type or consumer-local
projection, reconstruct a shape, or reserialize it.

```ts
export const TASK489_SOLUTION_KIT_RUN_PREDECESSOR_RECEIPT_SCHEMA =
  "coderso.task551.task489-predecessor@v1" as const;
export type Task489PredecessorFixtureCountsV1 = Readonly<{
  bulkHistoryRuns: Readonly<{ small: 10_000; large: 1_000_000 }>;
  boundedSupportRuns: 109_890;
  totalRuns: Readonly<{ small: 119_890; large: 1_109_890 }>;
  syntheticActorUsers: 100;
  safeDetailItems: 513;
  activeStarterOwners: 1;
  templateEvidenceRows: 1;
  rollbackProgressRows: 1;
}>;
export type Task489PredecessorLogicalCaseV1 = Readonly<{
  companionId: Task489CompanionId;
  logicalCaseId: string;
  statementIds: readonly string[];
}>;
export type Task489PredecessorProfileResultV1<Profile extends ScaleProfile> =
  Readonly<{
    profile: Profile;
    planDigest: string; // runtime: exactly 64 lowercase SHA-256 hex characters
    queryCount: 1;
    rowsRead: number;
    rowsReturned: number;
    transferredBytes: number;
    sharedBuffers: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  }>;
export type Task489PredecessorStatementReceiptV1 = Readonly<{
  companionId: Task489CompanionId;
  logicalCaseId: string;
  statementId: string;
  profileResults: readonly [
    Task489PredecessorProfileResultV1<"small">,
    Task489PredecessorProfileResultV1<"large">,
  ];
}>;
export type Task489PredecessorReceiptV1 = Readonly<{
  schema: "coderso.task551.task489-predecessor@v1";
  pass: true;
  noLeak: true;
  companionIds: readonly Task489CompanionId[];
  fixtureCounts: Task489PredecessorFixtureCountsV1;
  logicalCases: readonly Task489PredecessorLogicalCaseV1[];
  statementReceipts: readonly Task489PredecessorStatementReceiptV1[];
}>;
export const TASK489_SOLUTION_KIT_RUN_PREDECESSOR_FIXTURE_COUNTS:
  Task489PredecessorFixtureCountsV1;
export const TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES:
  readonly Task489PredecessorLogicalCaseV1[];
export const TASK489_SOLUTION_KIT_RUN_PREDECESSOR_STATEMENT_IDS:
  readonly string[];
export function createTask489PredecessorReceiptV1(
  statementReceipts: readonly Task489PredecessorStatementReceiptV1[],
): Task489PredecessorReceiptV1;
export function serializeTask489PredecessorReceiptV1(
  receipt: Task489PredecessorReceiptV1,
): Uint8Array;
export function parseTask489PredecessorReceiptV1(
  bytes: Uint8Array,
): Task489PredecessorReceiptV1;
```

This is deliberately one array representation: `statementReceipts` is the sole
statement-result representation and must never be a `Record`, keyed object, map,
or consumer-local projection. The top-level keys serialize in this exact order:
`schema`, `pass`, `noLeak`, `companionIds`, `fixtureCounts`, `logicalCases`, and
`statementReceipts` (seven fields total, with the required literal `noLeak: true`).
The parser/normalizer requires `noLeak` to be the boolean literal `true` and
rejects a missing, false, non-boolean, or unknown placement of `noLeak`, as well as
unknown fields. `fixtureCounts` keys serialize in the exact type order
above; `bulkHistoryRuns` and `totalRuns` each serialize `small` then `large`.
Each logical-case object serializes `companionId`, `logicalCaseId`, then
`statementIds`; each statement receipt serializes `companionId`, `logicalCaseId`,
`statementId`, then `profileResults`; each profile result serializes `profile`,
`planDigest`, `queryCount`, `rowsRead`, `rowsReturned`, `transferredBytes`,
`sharedBuffers`, `p50Ms`, `p95Ms`, then `p99Ms`. All metric values are finite,
non-negative numbers, `queryCount` is exactly one, and `planDigest` is exactly
lowercase 64-hex; raw plan JSON, SQL, binds, target identity, actor/user data,
options, summary, snapshots, actions, envelopes, and errors are forbidden.

The arrays have exact cardinality and order. `companionIds` byte-equals the
existing `TASK489_SOLUTION_KIT_RUN_PREDECESSOR_IDS.companionIds` tuple of five.
`logicalCases` is the following fourteen-member companion-first tuple; its
`statementIds` provide the one and only ordered fifteen-member flattening for
`statementReceipts`:

```ts
const TASK489_SOLUTION_KIT_RUN_PREDECESSOR_LOGICAL_CASES = [
  { companionId: "task489-runs-all-keyset", logicalCaseId: "default",
    statementIds: ["task489-runs-all-keyset/default"] },
  { companionId: "task489-runs-all-keyset", logicalCaseId: "relation-heavy-101",
    statementIds: ["task489-runs-all-keyset/relation-heavy-101"] },
  { companionId: "task489-runs-package-keyset", logicalCaseId: "default",
    statementIds: ["task489-runs-package-keyset/default"] },
  { companionId: "task489-runs-package-keyset", logicalCaseId: "relation-heavy-101",
    statementIds: ["task489-runs-package-keyset/relation-heavy-101"] },
  { companionId: "task489-effective-supersession", logicalCaseId: "newer-0",
    statementIds: ["task489-effective-supersession/newer-0"] },
  { companionId: "task489-effective-supersession", logicalCaseId: "newer-1",
    statementIds: ["task489-effective-supersession/newer-1"] },
  { companionId: "task489-effective-supersession", logicalCaseId: "newer-511",
    statementIds: ["task489-effective-supersession/newer-511"] },
  { companionId: "task489-effective-supersession", logicalCaseId: "newer-512",
    statementIds: ["task489-effective-supersession/newer-512"] },
  { companionId: "task489-effective-supersession", logicalCaseId: "newer-513-all-rolled",
    statementIds: ["task489-effective-supersession/newer-513-all-rolled"] },
  { companionId: "task489-effective-supersession", logicalCaseId: "newer-513-unrolled-first",
    statementIds: ["task489-effective-supersession/newer-513-unrolled-first"] },
  { companionId: "task489-effective-supersession", logicalCaseId: "newer-513-unrolled-middle",
    statementIds: ["task489-effective-supersession/newer-513-unrolled-middle"] },
  { companionId: "task489-effective-supersession", logicalCaseId: "newer-513-unrolled-last",
    statementIds: ["task489-effective-supersession/newer-513-unrolled-last"] },
  { companionId: "task489-active-starter-owner", logicalCaseId: "active-owner",
    statementIds: ["task489-active-starter-owner/active-owner"] },
  { companionId: "task489-safe-detail", logicalCaseId: "point-plus-items",
    statementIds: ["task489-safe-detail/run-point", "task489-safe-detail/items-page"] },
] as const;
```

Every one of the fifteen statement-receipt entries contains exactly two results,
in the fixed `small`, then `large` order, yielding exactly thirty profile-scale
results. The parser rejects an extra/missing/reordered companion, logical case,
statement, or profile result; duplicate IDs; unknown fields; a map-shaped
statement result; a bad count; non-finite metrics; an over-budget result; or a
noncanonical UTF-8 serialization. `serializeTask489PredecessorReceiptV1` emits
the canonical seven-field set, including `noLeak: true`, in one RFC 8785
canonical JSON document followed by exactly one LF. Digest input and canonical
bytes include `noLeak: true`; omitting or changing it is rejected. The
`parseTask489PredecessorReceiptV1` reserializes/compares bytes before returning.
A failed dynamic run writes no receipt; the only valid artifact has `pass:true`
and `noLeak:true`. Test pseudocode pins the seven-field round-trip and rejects
absent, false, non-boolean, unknown placement, and unknown-field `noLeak` forms.

TASK-551-05-L02 produces exactly one temporary
`.tmp/task-551/task489-predecessor-v1.json` file through this serializer after
its schema-present execution, without adding/rebasing static IDs or counts. It
is the **sole** writer of that temporary path and must not write workflow
evidence, a digest sidecar, or another successor artifact.

L11 alone then reads the temporary bytes, calls the existing
`parseTask489PredecessorReceiptV1` (which proves the canonical bytes), computes
the lowercase SHA-256 of those exact LF-terminated bytes, and records that hash
in its own evidence. Only after that succeeds, L11 promotes the exact same byte
sequence, without parsing-and-reserializing or reshaping it, to its sole durable
path:
`_docs/_workflows/_smoke/task-551/audit-evidence/task489-predecessor-v1.json`.
The temporary path is never a durable input and is never consumed by L10 or
TASK-489. L11's promotion record may contain the fixed durable path, exact
lowercase hash, and pass/failure state only; it contains no target, URL,
database/user/actor identity, sentinel, SQL/bind, plan JSON, raw error, or
additional receipt shape.

TASK-551-10-L01 and TASK-489 consume only that L11-owned durable file together
with the L11-recorded hash. They treat it as opaque canonical bytes, first
require the exact lowercase SHA-256 to match, then call
`parseTask489PredecessorReceiptV1` directly on those same durable bytes and
carry the source bytes unchanged. They must not read the temporary file, use the
serializer, define a receipt type or consumer-local projection, redeclare
companion IDs, convert the statement array to a map, synthesize a result,
reconstruct a shape, or reserialize any value. L02 itself validates the receipt
schema definition, all static cardinalities and arithmetic, `source_run_id`
naming, and the safe projection contract; L11 alone first validates the
L05-produced temporary receipt artifact via the parser. L02 rejects
`owner_run_id`, `actor_id`, any
actor alias/projection, and unsafe detail fields, but before TASK-551-05-L01/L03
it neither seeds nor dynamically executes the predecessor schema, plans,
receipt, or cleanup and never writes durable evidence. L02's owner tests may
exercise its parser only against synthetic in-memory schema fixtures; they never
read L05's temporary artifact, record a promotion hash, or write durable
evidence.

The `10,000/1,000,000` figures describe bulk run history only. The separate
`119,890/1,109,890` figures are complete predecessor scenario totals after the
fixed `109,890` bounded-support rows are added; neither pair is a generic
solution-kit seed count. L02 tests verify only this literal arithmetic, the
closed registry, `source_run_id` naming, safe projection allowlist, and receipt
cardinality until TASK-551-05-L01/05-L03 exist. They do not assert the absent
normalized tables, dynamic data, plans, or cleanup; those are exclusively the
later TASK-551-05-L02 dynamic-consumer contract.

The row counts are insufficient without deterministic predicate selectivity, so
the following distribution is equally frozen. Status/filter percentages are
exact because each affected family count is divisible by 100; assignment is by
`ordinal % 100`, never random:

| Family | Exact distribution used by every seed/check |
|---|---|
| users / roles | statuses `active=80%`, `inactive=10%`, `pending=10%`; create exactly five fixture roles; every user has exactly one primary role `ordinal % 5`, while every tenth user has one additional distinct role `(ordinal + 1) % 5`, so every user has at least one and only that subset has two total assignments |
| pages | `published=50%`, `draft=30%`, `scheduled=10%`, `archived=10%`; published rows have non-null `published_at`, scheduled rows have non-null future `published_at`; authors cycle over every profile user, yielding exactly 5 pages/author small and 10 pages/author large |
| entries | same status cycle as pages; visibility `public=70%`, `private=20%`, `password=10%`; password rows receive a synthetic non-reversible fixture hash and no output assertion may expose it; the relationship formula above yields exactly 20/10 entries for author 0 and exactly 1/1 for `(type 0,author 0)` |
| posts | same status/publish-time cycle as pages; authors cycle through every profile user, yielding exactly 10/10 posts for author 0; primary tag is exactly `task551-post-tag-${ordinal % 10}` and every row with `ordinal % 10 === 0` additionally has `task551-post-extra`, so each primary tag and the extra tag select exactly 10% |
| forms / submissions | forms `published=60%`, `draft=30%`, `archived=10%`; submission status `new=70%`, `processed=20%`, `spam=10%` |
| media | `image=80%`, `file=20%`; exactly 10% null folder as above; MIME and created-time filters have 10 equal buckets; primary tag is `task551-media-tag-${ordinal % 10}`, while every `ordinal % 100 === 0` row also has `task551-media-pair`, making the normalized AND array `["task551-media-pair","task551-media-tag-0"]` select exactly 1% |
| bookings | the already-pinned five statuses remain exactly 20% each; resource/service/time-window filters each select exactly 1%, 10%, and 50% through named fixture cases |

Every list-sort family groups exactly ten adjacent rows on the same sort
timestamp (`base + floor(ordinal / 10) ms`) so the `id` tiebreaker is exercised;
append-only families that do not use a keyset timestamp retain unique
`base + ordinal ms` timestamps. Search tokens use exact integer hit counts,
never percentages or fractional rounding:

| Search family | Small common / rare hits | Large common / rare hits |
|---|---:|---:|
| users | 1 / 1 | 100 / 10 |
| pages | 5 / 1 | 1,000 / 100 |
| entries | 20 / 2 | 1,000 / 100 |
| posts | 10 / 1 | 1,000 / 100 |
| media | 20 / 2 | 1,000 / 100 |
| assistant docs | 2 / 1 | 100 / 10 |
| assistant chunks | 20 / 2 | 1,000 / 100 |

`task551-common` and `task551-rare` occur on exactly those first N
authorization-eligible rows in stable ordinal order; the query result must equal
the corresponding integer. Every searchable row has a unique per-row token and
`task551-miss` occurs zero times. For public-search families, seed exactly one
deterministic draft/private/password row with `task551-hidden` and no eligible
row with that token; its expected result is zero. Thus successful common/rare,
unique point-hit, hidden authorization-zero, and true miss-zero paths all use
real stored text rather than mocked counts.
Each budget record names one of the exact `point`, `filter-1pct`,
`filter-10pct`, `filter-50pct`, `search-common`, `search-rare`, `search-miss`, or
`search-hidden`, `equal-sort-page`, `pages-author`, `users-role-30pct`,
`entries-author`, `entries-type-author`, `posts-author`, `posts-tag-10pct`,
`media-tags-and-1pct`, `webhooks-event-10pct`,
`webhook-deliveries-parent`, `page-latest-autosave`, or
`public-html-dependencies-128` cases. Author ordinal 0
returns pages `5/10`, entries `20/10`, typed entries for type ordinal 0 `1/1`,
and posts `10/10` (small/large); `users-role-30pct` means role 1 and returns
30/3,000 users. The two tag cases return exactly 100/10,000 posts and 20/1,000
media rows. Webhook event 0 matches 2/20 hooks, one parent's deliveries are
250/500, and latest page autosave returns exactly one projected row from a
20/100-version parent. No seed or plan test may choose its own
distribution, predicate, tag array, or query token.

`public-html-dependencies-128` is the initial TASK-551-09-L01 planned-caller
fixture. It builds exactly 128 canonical dependency tuples (43 page, 43 post,
42 content-entry), exactly 101 root candidates (100 eligible plus the `LIMIT + 1`
sentinel), and a canonical JSON input of at most 16,384 bytes. One parameterized
`VALUES`/CTE aggregate returns one row containing only membership/visibility
booleans and counts. Its transfer fixture rejects any page/post/entry body,
document/data JSON, or password hash. Companion cases pin 0, 1, and 128 tuples;
129 tuples, 16,385 bytes, or 102 root candidates fail before SQL. Final inventory
discovery either binds this budget to the landed fingerprint
`public_html_dependency_validation` or removes both fixture and planned record
under TASK-551-09-L01's reviewed no-caller evidence.

Retention fixtures use the separate frozen clock
`2036-01-01T00:00:00.000Z`. For each row-count family above, ordinal buckets
`0..59`, `60..79`, and `80..99` are respectively one millisecond before its
effective deletion cutoff, exactly at the cutoff, and one millisecond after it;
only the first bucket is age-eligible. The previously missing families have
these exact additional distributions and named budget cases:

- `password-resets-expired`: `3,000/60,000` age-eligible rows; boundary/recent
  rows are retained and token hashes are absent from evidence;
- `preview-tokens-expired`: independently `1,500/30,000` page-token and
  `1,500/30,000` post-token candidates, with page rows processed before post
  rows and no cross-table overrun;
- `assistant-ingest-old`: statuses cycle `success,failed,running`; the last run
  for every source is forced to recent `success`, so `3,000/60,000` old rows are
  candidates while exactly 100/1,000 newest-success anchors survive;
- `form-runs-child-first`: form runs inherit their submission's age bucket,
  producing `3,600/180,000` child and `1,200/60,000` parent candidates; the
  family remains disabled unless explicitly enabled and deletes children first;
- `solution-kit-child-first`: exact mode/status tuples cycle
  `apply/success`, `rollback/success`, `apply/failed`, `apply/running` by
  `ordinal % 4`. Every rollback/success row has non-null `finished_at` and an
  exact fixture-owned `rollback_of_run_id` pointing to its apply source; rollback
  is never represented as a status. Each kit's newest successful-apply and
  successful-rollback-relation anchors are forced recent, leaving exactly
  `600/60,000` ordinary run and `3,000/300,000` item candidates; items/rollback
  children precede source runs and the family remains disabled by default. These
  anchors prove the frozen boundary distribution only: they never authorize a
  deletion or replace TASK-551-06-L01's later fail-closed complete-graph
  predicate.

Every retention budget runs default batch `500`, max batch `2,000`, one-row-
below/exactly-one/one-row-above-batch variants, and a ten-batch convergence case.
It asserts candidate rows, rows read/returned, statements, transferred bytes,
oldest-first order, child-before-parent order, boundary retention, and dry-run
zero mutations. A fixture family or policy-matrix family missing one named budget
fails pre-measurement validation.

TASK-551-03-L02 summary/facet evidence uses the same rows and the frozen
operation clock `2026-01-15T12:00:00.000Z`. The following additional recipes are
exact in both profiles:

- page/post/entry/form/user status totals follow the percentage tables above;
  summary expectations are integer multiplication by the physical family count;
- every page/post/entry author cycles through all profile users, so author facets
  contain exactly 100/10,000 global members before their bounded facet paging;
  entry content-type counts remain exactly even and include a separate synthetic
  authorized zero-entry type in the facet fixture;
- role `0` is the administrator role; primary assignments give every role
  exactly 20% of users, and the every-tenth additional assignment goes to role
  `1`, yielding role usage `20%,30%,20%,20%,20%`, administrator counts
  20/2,000 and `soleAdministratorId=null`; a separate scoped mutation fixture
  contains exactly one administrator for the sole-admin guard;
- form-submission `created_at` is an explicit exception to the general fixture
  timestamp rule. For `ordinal % 4 === 0`, set it to
  `asOf - (1 + (floor(ordinal / 4) % 6)) days`; for every other row, set it to
  `asOf - (8 + (floor(ordinal / 4) % 30)) days`. The first branch is always
  inside the inclusive rolling-seven-day predicate and the second is always
  outside it, so `rollingSevenDays` is exactly 500/25,000; spam remains exactly
  200/10,000 from the independent status distribution;
- media `size = 1_000 + ordinal` bytes, giving exact global bytes
  `n*1_000 + n*(n-1)/2`; non-null media folders cycle evenly through flat fixture
  folders, tags use the existing ten equal buckets, and type totals remain
  80% image/20% file;
- booking resources total 20/1,000. Reservation `starts_at`/`ends_at` are the
  second explicit exception to the general timestamp rule. Timezones cycle
  `UTC,America/New_York,Asia/Tokyo`; convert the following local-wall-clock
  instants in each row's IANA timezone back to UTC, and set `ends_at` exactly 60
  minutes after `starts_at`:

| `ordinal % 100` | Exact local start relative to `asOf` in the row timezone | Today | Upcoming |
|---:|---|---:|---:|
| `0..9` | same local date, `asOfLocal - (1 + ordinal % 2) hours` | yes | no |
| `10..19` | same local date, `asOfLocal + (1 + ordinal % 2) hours` | yes | yes |
| `20..59` | local noon on `asOfLocalDate + (1 + ordinal % 40) days` | no | yes |
| `60..99` | local noon on `asOfLocalDate - (1 + ordinal % 40) days` | no | no |

The at-most-two-hour same-day offsets are valid for all three frozen timezone
localizations of `asOf`. Because both profiles are divisible by 100, `today` is
exactly 400/20,000, `upcoming` exactly 1,000/50,000, and `startsAt <= asOf`
(`pastOrCurrent`) exactly 1,000/50,000. Tests derive none of these classes from
the host timezone.

Every filtered summary fixture expects `matchingTotal:null`, at most the
requested bounded `items`, and `hasMore` derived only from the `LIMIT + 1` row.
It instruments SQL and requires zero filtered `COUNT(*)`. First/middle/last and
filtered pages return byte-identical fixed global summaries and facet pages;
filters may change only `items`, `nextCursor`, and `hasMore`, and no global
expectation is calculated from returned `items.length`.

### Frozen future Admin statement shapes and budgets

`task551AdminReadStatementShapes.ts` is the test-only source of the exact 32
planned TASK-551-03-L02 statement shapes enumerated by L01. Every member owns
its required future file/symbol, exact projected columns, authorization/parent
and normalized-filter predicate slots, keyset predicate, join direction, order,
`LIMIT` expression, fixture case, and expected output bound. Each also exports
one `task551-admin-read-v1` canonical statement template with fixed whitespace,
placeholder grammar, and UTF-8 SHA-256 digest. The template is a test-only,
static representation of the declared future statement shape, not a claim that
the future production SQL or its indexes already exist. The registry serializer
has one fixed field order and rejects a template/digest mismatch, a duplicate
canonical byte string, or any shape that cannot be re-serialized byte-for-byte.
It contains no production import and accepts no request-selected identifier or
raw CLI SQL.
Pages are `LIMIT <=101`, fixed summaries return exactly one row, ordinary facets
return `<=51`, the two discriminated `UNION ALL` facet batches return `<=102`,
and capped service-resource/schedule lists read `<=101`. Fixed summaries omit
all normalized row filters; facets retain authorization/parent scope but omit
row filters. Page statements include them. No statement contains a filtered
count.

The shape fixture is L02's sole owner of the static 32-template serializer,
template digests, and exact Admin equality tuple. The budget fixture plus L02's
active-v2 state/store closure are the sole owners of budget records, active
freeze receipts, receipt serialization, review state, and the only writer that can perform the capability-authorized
candidate-to-reviewed transition. TASK-551-03-L02, TASK-551-05-L02, and
TASK-551-10-L01 consume those published contracts read-only. After validating
the immutable snapshot, TASK-551-11 may use only L02's non-declared facade hook
to register it, then invoke `runL02OwnedReviewedTransition` with that digest
and the two redacted candidate canonical digests, and consume its redacted
result plus its sanitized state-transition receipt. Per operation it may pass
only an already-reduced result through L02's two pure receipt/attestation
normalizers before its in-memory rebase; neither accepts a path or raw bytes.
L11 never imports, receives, creates, issues, or consumes a capability or
factory, and it never writes, mints, synthesizes, or transitions a receipt.
This handoff does not prescribe edits in consumer files or grant them a second
serializer, digest, capability factory, or receipt writer.

### Required L01 projection-to-shape static gate

After the initial L01 implementation and its `--check --phase initial` receipt
have landed, but before L02 asks for a fixture map, a fixture target, a manifest
finalization, or a `--freeze`/`--check` operation, the default-Bun static test
`tests/perf/database-query-baseline.test.ts` must import exactly
`TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION` from
`tests/perf/fixtures/task551QueryInventory.ts`. It must pass that immutable
value and L02's own `TASK551_ADMIN_READ_STATEMENT_SHAPES` raw canonical registry
to the L02-owned helper:

```ts
assertExactAdminShapeProjection({
  l01Projection: TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION,
  shapes: TASK551_ADMIN_READ_STATEMENT_SHAPES,
});
```

The helper lives with the L02 statement-shape fixture and accepts structural
input; it does not cause the fixture serializer/digester or any runner module to
import the L01 fixture. The test entry point is the one consumer that imports
both sides. It first validates the L02 raw canonical registry, including the
L02-owned canonical-template/UTF-8-digest relation, then performs a bidirectional
32-member semantic comparison. L01 supplies no template text, digest, serializer,
or template assertion, and L02 does not rewrite, sort-and-replace, or otherwise
mutate L01's projection.

For every member, both contracts must project to this complete closed semantic
tuple in the stated order:

```text
id
plannedShapeId
future source: file, symbol, line, column
caller: family, operation
kind, statementRole
projectionSensitivity, filterShape, joinShape, orderShape
bound, queryCountBudget
cacheEligibility, freshnessPolicy, transactionMode, constraintOwner
budgetId, telemetryFingerprintKey, owner, disposition
```

The intentional field-name mapping is explicit and local to this L02 helper:
L01 `source.file`, `source.symbol`, `source.line`, and `source.column` map to
the shape's future-source fields; L01 `caller.family` and `caller.operation` map
to the shape's caller fields; and L01 `telemetryFingerprintKey` maps to the
shape's `fingerprintKey` only if that is the declared L02 field name. All other
members retain the tuple names above. Planned source anchors must carry their
explicit L01 null-anchor state; L02 may not invent a line/column, erase that
state, or treat an absent anchor as equivalent. A field-name mapping may never
merge two source fields, synthesize a semantic value from template text, or
discard a member that is inconvenient for the L02 template representation.

Both projectors must first require every listed own property with its declared
value type and reject inherited members, unknown members, `undefined`, sparse
entries, and duplicate IDs before using any keyed lookup. No `??`, `||`,
destructuring default, fallback map, inferred role, or defaulted enum may turn a
missing value into a valid tuple; an explicit reviewed literal such as
`"none"` remains valid only when it is actually present. The L02 raw declaration
must be duplicate-checked before any `Record`/map projection could overwrite an
entry. The comparison then rejects a count other than 32, a missing or extra ID
on either side, duplicate IDs/shape IDs, a mismatched key versus member ID,
different tuple order after canonical ID sorting, and any member mismatch. It
must fail closed on a projection that is missing, extra, duplicate, defaulted,
or semantically divergent; a matching template digest cannot excuse a semantic
mismatch, and a matching semantic tuple cannot excuse an invalid L02 template
or digest.

This is a one-way dependent-owner gate: L01 validates only its strict planned
records and emits its frozen projection. L02 validates its own template/digest
registry and compares that later registry against the already-landed L01 value.
Initial L01 never imports the shape fixture, calls this helper, or treats the
comparison as an L01 test. The passed static gate is a prerequisite to L11's
one L01-owned `bun scripts/bun-lane-classify.ts` finalization command; that
finalization remains a separate generated-manifest gate and is still required
before any fixture operation.

`task551DatabaseBudgets.ts` contains exactly 32 corresponding records. Each has
literal finite `small` and `large` objects with numeric `queryCountMax=1`,
`rowsReadMax`, `rowsReturnedMax`, `transferredBytesMax`, `sharedBuffersMax`, and
normalized `p50MsMax/p95MsMax/p99MsMax`; `null`, `Infinity`, `NaN`, formulas,
sentinel zero, or a profile derived at check time is invalid. The frozen result
bounds above are hard maxima, while measured work/latency ceilings come only
from this leaf's reviewed `--freeze` run and thereafter cannot increase without
a contract amendment. The same file persists one sanitized, checked-in
`TASK551_DATABASE_FREEZE_RECEIPT` per profile: contract/fixture/schema digests,
runner digest, provenance commit, platform/architecture, CPU model/count, memory, PostgreSQL major and
config digest, Bun version, exact pool capacity, container mode, calibration
method/counts/median, scope digest, and review state. It contains no URL,
database or user name, sentinel, bind, payload, or raw hardware/config output.
`--freeze` creates a candidate receipt and its exact numeric ceilings; only a
reviewed receipt is a release-gate input, and `--check` rejects missing,
candidate, stale, or context/calibration-mismatched receipts without writing.

All receipt digests use RFC 8785 canonical JSON encoded as UTF-8, followed by
exactly 64 lowercase SHA-256 hexadecimal characters (no `sha256:` prefix,
uppercase, whitespace, base64, or alternate representation). Inputs reject
duplicate keys, non-finite numbers, undefined values, and non-JSON values;
arrays retain their declared canonical order and object keys use the RFC 8785
sort. `contractDigest` hashes only the versioned static Admin equality contract:
the 32 IDs, each canonical template and template digest, their fixed
projection/predicate/order/bound descriptors, and the measurement constants.
`fixtureDigest` hashes only the versioned executable L02 manifest and
deterministic seed/count/key-derivation descriptors, including supplemental
entries and the deferred TASK-489 entry's static descriptor, but excluding its
deferred dynamic execution and normalized support.

`schemaDigest` is deterministic and independent of profile and selector. It
hashes the checked-in required sanitized catalog projection for the union of all
executable manifest physical target/support tables, not a request-selected or
runtime-discovered subset. After the fixture-target preflight, the L02 runner
may read catalog metadata only, normalize it through the same pure projection,
and must reject a byte difference before it emits any record; it never puts that
live target projection in stdout, receipts, evidence, or a cache. The checked-in
projection contains only each required physical table's schema/name, required
column name/type/nullability, named FK/unique/check descriptor, and named index
descriptor in canonical order. It contains no row, row count, database/target,
URL, user, sentinel, bind, SQL value, payload, check expression, index
predicate, planner field, or other runtime value. The L03-owned
`public.task551_fixture_sentinel` is excluded.

`runnerDigest` hashes a canonical map of raw UTF-8 SHA-256 values for the public
runner, scale fixture, statement-shape fixture, and every executable
runner-private helper from the finite literal
`TASK551_RUNNER_DIGEST_SOURCE_PATHS` export, including `digestContract.ts`,
`fixtureTarget.ts`, owned `reviewedPairReceiptSource.ts` imported by the
L02-private `reviewedPairTransition.ts`, and `reviewedPairOwnerHost.ts` sources.
The list is path-sorted, rejects a missing, duplicate, unknown, or unlisted
executable helper, and never includes the mutable budget/receipt source as raw
text. A source path and raw source SHA-256 are non-secret inputs; source bytes,
environment data, and database data are not digest payload fields.

### Checked-in pure integrity-digest export

`scripts/task551DatabaseBaseline/digestContract.ts` is the sole L02 owner of a
versioned, checked-in, non-secret integrity contract that L02 imports only
within its own closure. It has no database, environment, filesystem, server, settings,
request, clock, or runtime-adapter import; it neither queries nor writes at
module import time. Every exported normalizer, selector resolver, payload
builder, canonicalizer, and digest calculator is a pure function over explicit
JSON-compatible arguments. The only hashing capability is an explicit
`sha256Bytes` argument supplied by the caller, so importing the contract cannot
select a runtime, inherit an environment, or access the fixture target.

```ts
export type JsonValue = null | boolean | number | string |
  readonly JsonValue[] | Readonly<{ readonly [key: string]: JsonValue }>;
export type Task551LowercaseSha256 = string; // runtime: /^[0-9a-f]{64}$/
export type Task551BaselineCheckSuccessRecord = Readonly<{
  schema: "coderso.task551.database-baseline-check@v1";
  taskId: "TASK-551-01-L02";
  mode: "check";
  profile: "small" | "large";
  pass: true;
  fixtureTargetPreflight: Readonly<{
    rolledBack: true;
    currentDatabaseMatched: true;
    exactSingleMarkerMatched: true;
    boundSentinelByteMatched: true;
  }>;
  reviewableReceiptDigest: Task551LowercaseSha256;
  contractDigest: Task551LowercaseSha256;
  fixtureDigest: Task551LowercaseSha256;
  schemaDigest: Task551LowercaseSha256;
  runnerDigest: Task551LowercaseSha256;
  manifestScenarioResultDigest: Task551LowercaseSha256;
}>;
export type Task551CanonicalSelector =
  | Readonly<{ kind: "all" }>
  | Readonly<{ kind: "scenario"; id: string }>;
export type Task551ReviewableReceiptNumericCeilingV1 = Readonly<{
  queryCountMax: 1;
  rowsReadMax: number;
  rowsReturnedMax: 1 | 51 | 101 | 102;
  transferredBytesMax: number;
  sharedBuffersMax: number;
  p50MsMax: number;
  p95MsMax: number;
  p99MsMax: number;
}>;
export type Task551ReviewableReceiptStatementCeilingV1 = Readonly<{
  statementId: string;
  ceiling: Task551ReviewableReceiptNumericCeilingV1;
}>;
export type Task551ReviewableReceiptDigestInputV1 = Readonly<{
  // Omitted only while materializing the first candidate; it is mandatory in
  // every persisted candidate/reviewed receipt and then must equal this helper's
  // recomputation.
  reviewableReceiptDigest?: Task551LowercaseSha256;
  reviewState: "candidate" | "reviewed";
  profile: "small" | "large";
  provenanceCommit: string;
  contractDigest: Task551LowercaseSha256;
  fixtureDigest: Task551LowercaseSha256;
  schemaDigest: Task551LowercaseSha256;
  runnerDigest: Task551LowercaseSha256;
  platform: string;
  arch: string;
  cpuModel: string;
  logicalCpus: number;
  memoryMb: number;
  postgresMajor: number;
  postgresConfigDigest: string;
  bunVersion: string;
  poolCapacity: number;
  containerMode: string;
  scopeDigest: string;
  calibration: Readonly<{ warmups: 20; samples: 100; medianMs: number }>;
  statementCeilings: readonly Task551ReviewableReceiptStatementCeilingV1[];
  poolWaitCeiling: Task551ReviewableReceiptNumericCeilingV1;
}>;
export type Task551ReviewableFreezeReceiptV1 = Readonly<
  Omit<Task551ReviewableReceiptDigestInputV1, "reviewableReceiptDigest"> & Readonly<{
    // Required for every freeze candidate and reviewed persisted receipt.
    reviewableReceiptDigest: Task551LowercaseSha256;
  }>
>;
export type Task551L02OwnerCapabilityReceiptV1 = Readonly<{
  schemaVersion: "coderso.task551.l02-owner-capability-receipt@v1";
  digest: Task551LowercaseSha256;
}>;
export type Task551ReviewedCandidateTransitionInputV1 = Readonly<{
  schema: "coderso.task551.reviewed-candidate-transition-input@v1";
  candidates: readonly [
    Readonly<{
      profile: "small";
      candidateReceipt: Task551ReviewableFreezeReceiptV1;
      candidateCanonicalReceiptDigest: Task551LowercaseSha256;
    }>,
    Readonly<{
      profile: "large";
      candidateReceipt: Task551ReviewableFreezeReceiptV1;
      candidateCanonicalReceiptDigest: Task551LowercaseSha256;
    }>,
  ];
}>;
export type Task551ReviewedCandidateTransitionResultV1 = Readonly<{
  schema: "coderso.task551.reviewed-candidate-transition-result@v1";
  capabilityReceipt: Task551L02OwnerCapabilityReceiptV1;
  reviewed: readonly [
    Readonly<{
      profile: "small";
      candidateCanonicalReceiptDigest: Task551LowercaseSha256;
      reviewedReceipt: Task551ReviewableFreezeReceiptV1;
      reviewedCanonicalReceiptDigest: Task551LowercaseSha256;
    }>,
    Readonly<{
      profile: "large";
      candidateCanonicalReceiptDigest: Task551LowercaseSha256;
      reviewedReceipt: Task551ReviewableFreezeReceiptV1;
      reviewedCanonicalReceiptDigest: Task551LowercaseSha256;
    }>,
  ];
}>;
export type Task551DigestScenario = Readonly<{
  id: string;
  kind: "admin-shape" | "supplemental" | "task489-predecessor";
  targetStatementOrFamily: string;
  minimumClosure: readonly string[];
  supportTables: readonly string[];
  expectedTableCounts: JsonValue;
  ownedKeyPredicate: JsonValue;
  equalityParticipation: "admin-32" | "supplemental" | "deferred";
  statementShapeId?: string;
}>;
export type Task551SanitizedCatalogProjectionV1 = Readonly<{
  version: "task551-sanitized-catalog@v1";
  tables: readonly Readonly<{
    schema: "public";
    name: string;
    columns: readonly Readonly<{
      name: string;
      postgresType: string;
      nullable: boolean;
    }>[];
    constraints: readonly Readonly<{
      name: string;
      kind: "foreign-key" | "unique" | "check";
      columns: readonly string[]; // declared physical ordinal
      referencedTable: string | null;
      referencedColumns: readonly string[];
    }>[];
    indexes: readonly Readonly<{
      name: string;
      unique: boolean;
      method: string;
      columns: readonly Readonly<{
        name: string;
        direction: "asc" | "desc";
      }>[];
    }>[];
  }>[];
}>;
export const TASK551_DATABASE_BASELINE_DIGEST_CONTRACT_VERSION:
  "task551-database-baseline-digest@v1";
export const TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION:
  Task551SanitizedCatalogProjectionV1;
export const TASK551_RUNNER_DIGEST_SOURCE_PATHS: readonly string[];

export function normalizeTask551SanitizedCatalogProjection(
  value: Task551SanitizedCatalogProjectionV1,
): Task551SanitizedCatalogProjectionV1;
export function assertExactTask551RequiredCatalogProjection(
  value: Task551SanitizedCatalogProjectionV1,
): void;
export function resolveTask551ExecutableScenarioSelector(
  selector: Task551CanonicalSelector,
  scenarios: readonly Task551DigestScenario[],
): readonly Task551DigestScenario[];
export function canonicalizeTask551Rfc8785(value: JsonValue): Uint8Array;
export function requireTask551LowercaseSha256(
  value: string,
): Task551LowercaseSha256;
export function digestTask551CanonicalBytes(
  bytes: Uint8Array,
  sha256Bytes: (bytes: Uint8Array) => string,
): Task551LowercaseSha256;
export function buildTask551ContractDigestInput(
  input: Task551ContractDigestSource,
): Task551ContractDigestInput;
export function buildTask551FixtureDigestInput(
  input: Task551FixtureDigestSource,
): Task551FixtureDigestInput;
export function computeTask551ContractDigest(
  input: Task551ContractDigestInput,
  sha256Bytes: (bytes: Uint8Array) => string,
): Task551LowercaseSha256;
export function computeTask551FixtureDigest(
  input: Task551FixtureDigestInput,
  sha256Bytes: (bytes: Uint8Array) => string,
): Task551LowercaseSha256;
export function computeTask551SchemaDigest(
  projection: Task551SanitizedCatalogProjectionV1,
  sha256Bytes: (bytes: Uint8Array) => string,
): Task551LowercaseSha256;
export function computeTask551RunnerDigest(
  sourceHashes: Readonly<Record<string, Task551LowercaseSha256>>,
  sha256Bytes: (bytes: Uint8Array) => string,
): Task551LowercaseSha256;
export function computeTask551ManifestScenarioResultDigest(
  input: Readonly<{
    profile: "small" | "large";
    selector: Task551CanonicalSelector;
    scenarios: readonly Task551DigestScenario[];
  }>,
  sha256Bytes: (bytes: Uint8Array) => string,
): Task551LowercaseSha256;
export function computeTask551ReviewableReceiptDigest(
  receipt: Task551ReviewableReceiptDigestInputV1,
  sha256Bytes: (bytes: Uint8Array) => string,
): Task551LowercaseSha256;
export function buildTask551ReviewedCandidateTransitionInput(
  candidateSnapshot: readonly [
    Readonly<{ profile: "small"; candidateReceipt: Task551ReviewableFreezeReceiptV1 }>,
    Readonly<{ profile: "large"; candidateReceipt: Task551ReviewableFreezeReceiptV1 }>,
  ],
  sha256Bytes: (bytes: Uint8Array) => string,
): Task551ReviewedCandidateTransitionInputV1;
export function assertExactTask551ReviewedCandidateTransition(input: Readonly<{
  input: Task551ReviewedCandidateTransitionInputV1;
  result: Task551ReviewedCandidateTransitionResultV1;
  sha256Bytes: (bytes: Uint8Array) => string;
}>): Task551ReviewedCandidateTransitionResultV1;
export function parseCanonicalTask551BaselineCheckStdout(
  stdout: string,
): Task551BaselineCheckSuccessRecord;
```

`digestContract.ts` exports no owner capability, factory, issue/consume method,
or review-transition operation. `reviewedPairPersistence.ts` is the stable L02
public facade: it retains only required deprecated legacy **types**; every legacy
runtime authority alias and runner re-export throws the one fixed migration code
before I/O. It exports the one public L11 operation below and one-way imports
cohesive private implementation `reviewedPairTransition.ts`. The implementation
is never re-exported by the runner or declaration. Private
`reviewedPairOwnerHost.ts` imports only the transition's internal owner-host
installer for the same-realm production bootstrap; it is never a facade/runner/
declaration export and is literal-dynamically imported only after the L02 code/test
materialization closure by the outer `_docs/_workflows/task-551-implement.mjs` composition root,
never by the L11 facade or another workflow module; final L02 leaf closure remains after checks.

```ts
// scripts/task551DatabaseBaseline/reviewedPairPersistence.ts
export type Task551L02ReviewedTransitionInputV1 = Readonly<{
  worktreeSnapshotDigest: Task551LowercaseSha256;
  smallCandidateCanonicalDigest: Task551LowercaseSha256;
  largeCandidateCanonicalDigest: Task551LowercaseSha256;
}>;

export async function runL02OwnedReviewedTransition(
  input: Task551L02ReviewedTransitionInputV1,
): Promise<Task551ReviewedCandidateTransitionResultV1 & Readonly<{
  stateTransitionReceipt: Task551L02ActiveStateTransitionReceiptV2;
}>>;
export function parseTask551L02ActiveStateTransitionReceiptV2(
  value: unknown,
): Task551L02ActiveStateTransitionReceiptV2;
export function parseTask551L02ReviewedStateAttestationV2(
  value: unknown,
): Task551L02ReviewedStateAttestationV2;
// Facade-internal L11 handoff only: absent from public declarations/runner exports.
export function registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition(
  worktreeSnapshotDigest: Task551LowercaseSha256,
): void;
```

That input is a closed three-digest request, not a candidate pair, source,
environment, child map, launch, factory, or capability. Its
`worktreeSnapshotDigest` is the accepted immutable
`Task551CurrentWorktreeSnapshotV1` digest from L11's L01 materialization
barrier, never `git HEAD` or a commit identifier. All three handoff digests are
the same raw lowercase 64-hex `Task551LowercaseSha256` values—there is no
`sha256:`-prefixed alternate or prefix-normalizer. L11 validates them first, then
uses the non-declared hook to register exactly that digest; L02 never imports
L11 or its receipt. The result's v1 `capabilityReceipt` is a redacted audit
receipt, not an approval object or reusable credential. The facade owns only
compatibility/handoff; `reviewedPairTransition.ts` alone owns private
module-closure snapshot/capability/approval state and the atomic writer.

`Task551ContractDigestSource`/`Input` and
`Task551FixtureDigestSource`/`Input` are exported JSON-only structural types in
the same module. The former accepts only the L01 IDs, static shape templates/
descriptors, and measurement constants; the latter accepts only the static
manifest version, entries, and seed/count/key-derivation descriptors. The
builders reject unknown fields and return their closed versioned payloads, so
the runner and L02 transition use one input shape rather than hand-assembling
digest JSON. `Task551DigestScenario` is the corresponding data-only manifest
view; the runner and L02 map the static manifest through it after rejecting
non-JSON or unknown fields, rather than importing a runner/service type into
the pure module.

The normalizer rejects unknown keys, duplicate names, non-`public` schema, the
preserved sentinel table, and every field outside the type above. It produces a
canonical collection by sorting tables by `(schema, name)`, columns by name,
constraints by `(kind, name)`, and indexes by name; each constraint/index column
array retains its declared physical order. The checked-in projection must
already byte-equal that normalized representation, while a live catalog result
is normalized before the exact comparison. Named check constraints carry only
their name/kind/columns, never a check expression; index descriptors carry only
name/uniqueness/method/ordered columns, never predicates or expressions. Thus
this projection is sufficient to assert the required physical fixture schema
without accepting a target identity or a data value.

Each `compute*` function first constructs its closed versioned payload, then
returns `digestTask551CanonicalBytes(canonicalizeTask551Rfc8785(payload),
sha256Bytes)`. `computeTask551ContractDigest` consumes the static 32-way Admin
tuple, templates, and constants; `computeTask551FixtureDigest` consumes the
full static manifest/derivations; `computeTask551SchemaDigest` consumes exactly
`TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION`; and
`computeTask551RunnerDigest` requires the exact finite source-hash map keyed by
`TASK551_RUNNER_DIGEST_SOURCE_PATHS`. No profile or selector changes any of
those four values.

Only `computeTask551ManifestScenarioResultDigest` is profile/selector-specific.
It accepts exactly `profile:"small" | "large"` and the parsed command selector:
`{kind:"scenario",id}` resolves exactly one executable manifest entry, while
`{kind:"all"}` resolves all executable `admin-shape` and `supplemental` entries
in static manifest order. It rejects omitted/duplicate/unknown selectors,
deferred TASK-489 selection, and an attempted caller-provided expansion. Its
canonical payload is exactly the digest-contract version, manifest version,
profile, normalized selector, resolved entry IDs and static entry digests in
that order, plus the fixed `preflight-complete` and `cleanup-zero-residue`
tokens. No target, result row, scope, timing, or runtime value participates.

`parseCanonicalTask551BaselineCheckStdout` accepts exactly one LF-terminated
JSON line, rejects duplicate/unknown fields and every non-lowercase-hex digest,
validates the fixed closed success schema, and requires the captured bytes to
equal `canonicalizeTask551Rfc8785(parsedRecord) + LF` byte-for-byte. L02 uses
this pure parser, canonical argv, checked-in source hashes, and the reviewable
receipt helper to derive and verify its six record values. TASK-551-11 does not
import this parser or any digest helper; its complete L02 closure is the
accepted-snapshot registration hook, state-changing
`runL02OwnedReviewedTransition`, the two pure sanitized state
receipt/attestation normalizers, and the separately declared
`parseTask489PredecessorReceiptV1` handoff. None receives a database target,
environment value, live catalog, or secret.

`computeTask551ReviewableReceiptDigest` is the one L02-owned, import-safe
canonical reviewable-receipt digester. The runner uses it to materialize and
re-verify a freeze receipt; the L02 transition uses it internally and L11 never
imports `digestContract.ts`, this function, or any other generic L02 digest,
serializer, or parser; the only exception is the named pure sanitised-state
receipt/attestation normalizers. L11 otherwise uses only the closure's
non-declared registration hook, `runL02OwnedReviewedTransition` result, and
`parseTask489PredecessorReceiptV1` handoffs. Its input schema is closed exactly
as `Task551ReviewableReceiptDigestInputV1`: the fixed sanitized
metadata above, `profile`, one exact-capacity pool wait ceiling, and exactly 32
statement-ceiling entries in the static Admin ID order. Each entry has exactly
the eight named numeric ceiling fields; `queryCountMax` is exactly `1`,
`rowsReturnedMax` is one of `1 | 51 | 101 | 102`, every other ceiling and
calibration/context count is finite, safe, and non-sentinel, and the receipt's
`poolCapacity` is exactly `2` for `small` or `10` for `large`. The function
rejects duplicate, missing, reordered, or unknown static statement IDs and any
unknown key at any depth.

The function consumes and validates the same five freeze-receipt digest fields:
`reviewableReceiptDigest`, `contractDigest`, `fixtureDigest`, `schemaDigest`,
and `runnerDigest`. All five must be exact lowercase 64-hex SHA-256 strings;
the four static digests are included in the digest input. A persisted candidate
or reviewed receipt must also carry its own `reviewableReceiptDigest`; the
function recomputes it and rejects a mismatch. Only the first in-memory
candidate-materialization call may omit that self field, obtains the returned
digest, attaches it, and immediately calls the function again to prove the
persisted form; explicit `undefined`, a placeholder, or an alternate digest
representation is invalid. `manifestScenarioResultDigest` is deliberately not
accepted by this input: it belongs only to the ephemeral profile/selector
`--check` record.

After closed-schema validation, the digest payload contains every accepted
receipt field unchanged **except** `reviewState` and the receipt's own
`reviewableReceiptDigest`; those are the only two input fields omitted. The
function applies RFC 8785 canonical JSON to that payload, hashes the exact
canonical UTF-8 bytes with the explicit injected `sha256Bytes` function, and
returns only the exact lowercase 64-hex result. It rejects any target,
environment, URL, database/user name, sentinel, SQL/bind, raw row, `row`,
`rows`, `value`, `values`, payload, or unrecognized field rather than silently
dropping it; `rowsReadMax` and `rowsReturnedMax` remain permitted only as the
named numeric ceilings. It has no runtime imports or import-time effects and
cannot read a database, filesystem, clock, process, or environment.

`provenanceCommit` records the clean source commit observed before candidate
generation, but it is descriptive receipt metadata and never review authority.
The transition is instead bound to the accepted immutable
`worktreeSnapshotDigest`: the SHA-256 digest of L11's L01 materialization
snapshot captured before any L02 spawn. It is not Git `HEAD`, is not recomputed
from a later commit, and is compared only with the trusted accepted snapshot
record plus the current exact candidate-pair digests inside L02's transition.
This lets a final reviewed commit have a different HEAD without making
`--check` impossible. Candidate-to-reviewed review may change only the exact
persisted `reviewState` token; since that token is the sole lifecycle omission,
the digest is byte-identical across that mechanical transition. Changing a
ceiling, digest, provenance/context field, snapshot binding, or any other
receipt byte requires a new candidate freeze under an amended contract. A
reviewer compares the candidate's complete numeric/context diff before that
transition.

#### L02-only reviewed-candidate transition

`Task551ReviewableFreezeReceiptV1` is the strict persisted form: it has every
closed `Task551ReviewableReceiptDigestInputV1` member, a required own
`reviewableReceiptDigest`, and no defaulted, inherited, `undefined`, unknown,
or omitted member at any depth. The two transition types are deliberately a
closed small-then-large pair rather than a map or a per-profile action. Their
`candidateCanonicalReceiptDigest` and `reviewedCanonicalReceiptDigest` mean the
lowercase SHA-256 of `canonicalizeTask551Rfc8785(receipt)` for the complete
receipt object, including `reviewState` and its own reviewable digest; no LF,
alias, prefix, caller-supplied hash, or reconstructed partial projection is
accepted.

`buildTask551ReviewedCandidateTransitionInput(candidateSnapshot, sha256Bytes)`
is pure and receives exactly the just-frozen small/large candidate pair. It
requires the outer and inner profile to agree, the fixed order `small`, then
`large`, `reviewState:"candidate"`, a valid persisted self digest through
`computeTask551ReviewableReceiptDigest`, and the entire strict sanitized
receipt schema. It canonicalizes and hashes each complete candidate itself and
returns those two exact bindings; it never trusts a candidate digest supplied
by a caller. Missing, duplicate, reversed, cross-profile, defaulted, or
noncanonical candidates fail before an input object is returned. The L02 writer
rejects a stale/replayed pair by rebuilding this input from the just-written
current receipts before it permits review.

`assertExactTask551ReviewedCandidateTransition({ input, result, sha256Bytes })`
is the single pure L02 verifier for the redacted reviewed-transition receipt and
pair. It rejects unknown, inherited, missing, `undefined`, duplicate, sparse,
or defaulted keys at every input/result/pair/receipt depth; verifies the fixed
schemas, pair cardinality, and `small`, then `large` order; requires the fixed
redacted receipt schema and lowercase digest; recomputes every candidate and
reviewed canonical digest; and requires exactly one
`reviewState:"candidate"` → `reviewState:"reviewed"` byte change. It cannot
authenticate a private capability lifecycle and never reads a file, database,
environment, clock, target, or runtime adapter, or mints, issues, consumes, or
authorizes a capability.

The actual transition is the L02-owned facade operation
`runL02OwnedReviewedTransition`; its internal implementation is
`reviewedPairTransition.ts`. Immediately after L11 validates and registers the
immutable snapshot, it passes only that digest and two candidate canonical
digests. Within the synchronous atomic writer/re-read lock, L02 consumes the
one-use registration, re-reads the snapshot/candidate pair, validates all three
digests, invokes `ownerReviewChannel.review` exactly once only after those
lock re-reads, then mints/consumes one sealed approval and one private capability,
writes both reviewed receipts, and re-reads the committed result.
It returns only the reviewed pair plus v1 `capabilityReceipt`. L11 never sees a
factory, capability, nonce, authority, current receipt, or approval decision.

### Ephemeral `--check` success record

After and only after a `--check` invocation has completed its rolled-back
fixture-target preflight and every selected executable scenario has passed,
the runner writes exactly one RFC 8785 canonical-JSON line followed by one LF
to stdout. Its entire schema is the exact
`Task551BaselineCheckSuccessRecord` export above, which the runner imports from
`./task551DatabaseBaseline/digestContract` rather than redefining; no additional
keys, nesting, or second structured line is permitted:

```ts
import type { Task551BaselineCheckSuccessRecord } from
  "./task551DatabaseBaseline/digestContract";
```

`manifestScenarioResultDigest` is lowercase SHA-256 over RFC 8785 canonical
JSON for the fixed manifest version, profile, canonical selector expansion in
manifest order, and each selected executable scenario's stable ID, static
manifest-entry digest, `preflight-complete` result token, and
`cleanup-zero-residue` result token. It contains neither rows nor runtime
scope. The other five digest values must byte-match the reviewed budget receipt
or the recomputed static contract values already defined above. Thus the line
binds a successful command to the reviewed contract and the exact non-deferred
scenario expansion without revealing a database target.

This record is ephemeral command output, not a freeze receipt and not an L02
artifact: L02 does not write it to a file, sidecar, snapshot, budget fixture,
or database. On success stdout consists solely of that one line and stderr is
empty. Any non-success path exits nonzero, writes no structured success record
and no stdout, and writes only the exact stable redacted stderr token
`database_baseline_invalid\n`; it must not reveal an error cause. Neither path
may emit a database/user/URL/sentinel value, a target-derived name or hash, SQL
bind, raw query output, raw scope or scope digest, runtime context/config,
platform detail, duration, or unredacted error text. The required receipt and
static digests above are the only hashes allowed in the success schema; none is
a direct fixture-target identifier.

TASK-551-11 is the sole durable-evidence owner: it captures the exact stdout
line and a redacted command receipt with no environment assignment, whose fixed
15-row logical-argv registry descriptor binds literal `--env-file=/dev/null`, a raw
lowercase-64-hex digest, and its magic/u32BE length-framed UTF-8 context/id/count/
token preimage before Bun substitution, verifies
the schema, one-line/silence rules, exit status, profile argument, all boolean
preflight claims, and each digest against checked-in inputs, then writes only
its own permitted audit evidence. L02 must not add a workflow write, a receipt
serializer, or any persistence path for this command output.

The 32 shapes, the 32 `admin-shape` manifest IDs, and 32 budget IDs must have
exact set equality. Supplemental and deferred IDs are excluded from that tuple.
Each shape/profile receipt enforces all eight
stored numeric ceilings, yielding `32 * 2 * 8 = 512` shape/profile assertions;
the two pool receipts enforce the same eight fields, for 528 enforced ceilings
in total. Actual dispatch count, EXPLAIN work, returned rows, serialized
transferred bytes, shared buffers, and normalized p50/p95/p99 all participate;
checking only p95 or rows is invalid.
TASK-551-05-L02 imports the static templates/budgets read-only after its schema
dependencies land, adds five preserved non-Admin plan members, and writes the
37-member sanitized plan receipt. TASK-551-03-L02, and only after it lands its
production builders, renders its fixed placeholder mapping and compares each
compiled SQL byte string to the corresponding L02 canonical template before
behavior tests. L02 never purports to compare absent production SQL.

IDs are UUIDv5 from `(validatedRunScope, profile, family, ordinal)`. Timestamps
other than form-submission `created_at` and booking
`starts_at`/`ends_at` follow the frozen unique/equal-sort rule above from
`2026-01-01T00:00:00Z`; the two exceptions use only the exact `asOf` formulas
above. The raw scope exists only in process memory and receipts retain its hash.
The lifecycle ledger derives the same IDs, deletes child-first, and asserts zero
owned rows remain per physical table even after a partial seed. It excludes the
preserved sentinel from every descriptor and always follows cleanup with the
rolled-back exact-marker/sentinel-byte proof before any next scenario or outer
success result.
The physical tables named before `+ support` receive the first count; every
support-table count is part of the same scenario and is asserted independently.
Every Admin inventory budget record must declare exactly one `admin-shape`
scenario. Every supplemental baseline contract must declare exactly one
`supplemental` scenario. An unmapped hot/release-gated Admin record, an
undeclared supporting table, or an equality class violation fails
`database_baseline_invalid` before seeding.

## Implementation Pseudocode

The first L02 static-phase gate is test-only and runs after L01's initial
contract is present. It has no runner, client, environment, dotenv, filesystem,
or network import:

```ts
// tests/perf/database-query-baseline.test.ts
import { TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION } from
  "./fixtures/task551QueryInventory";
import {
  assertExactAdminShapeProjection,
  TASK551_ADMIN_READ_STATEMENT_SHAPES,
} from "./fixtures/task551AdminReadStatementShapes";

test("L02 static shapes exactly preserve L01 Admin planned semantics", () => {
  assertExactAdminShapeProjection({
    l01Projection: TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION,
    shapes: TASK551_ADMIN_READ_STATEMENT_SHAPES,
  });
});

// tests/perf/fixtures/task551AdminReadStatementShapes.ts (L02-owned)
export function assertExactAdminShapeProjection(input: Readonly<{
  l01Projection: readonly Task551L01AdminProjectionRecord[];
  shapes: Task551AdminReadStatementShapeRegistry;
}>): void {
  const l01Tuples = input.l01Projection.map(readStrictL01AdminSemanticTuple);
  const shapeTuples = readStrictRawL02AdminShapeSemanticTuples(input.shapes);
  // Each reader checks closed own-key sets and every explicit semantic member
  // before canonical ID sorting. The L02 reader also validates its own canonical
  // template serialization and UTF-8 digest relation; it never delegates that
  // ownership to L01.
  assertExactlyThirtyTwoUniqueIds(l01Tuples);
  assertExactlyThirtyTwoUniqueIds(shapeTuples);
  assertExactCanonicalIdOrderAndSet(l01Tuples, shapeTuples);
  for (const id of canonicalAdminIds(l01Tuples)) {
    assertStrictSemanticTupleEqual(l01Tuples.byId(id), shapeTuples.byId(id));
  }
}
```

`readStrictL01AdminSemanticTuple` and
`readStrictRawL02AdminShapeSemanticTuples` produce the complete tuple enumerated
in **Required L01 projection-to-shape static gate**. They reject rather than
default missing fields, inspect the pre-map L02 declaration so duplicate entries
cannot be collapsed, and do not return a partial or template-derived tuple. The
comparison test is the first L02 static prerequisite: it completes before L11
may run the classifier finalization and before any code path can construct a
fixture target or dispatch a fixture operation.

```ts
import {
  TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION,
  TASK551_RUNNER_DIGEST_SOURCE_PATHS,
  assertExactTask551ReviewedCandidateTransition,
  buildTask551ContractDigestInput,
  buildTask551FixtureDigestInput,
  buildTask551ReviewedCandidateTransitionInput,
  computeTask551ContractDigest,
  computeTask551FixtureDigest,
  computeTask551ManifestScenarioResultDigest,
  computeTask551ReviewableReceiptDigest,
  computeTask551RunnerDigest,
  computeTask551SchemaDigest,
  normalizeTask551SanitizedCatalogProjection,
} from "./task551DatabaseBaseline/digestContract";
import {
  TASK551_FIXTURE_TARGET_CHILD_KEYS,
  assertTask551FixtureTarget,
  assertTask551FixtureTargetChildKeys,
  assertTask551FixtureTargetPostCleanup,
  parseTask551FixtureTarget,
} from "./task551DatabaseBaseline/fixtureTarget";
import type {
  Task551BaselineCheckSuccessRecord,
  Task551CanonicalSelector,
  Task551LowercaseSha256,
  Task551ReviewableFreezeReceiptV1,
  Task551ReviewableReceiptDigestInputV1,
  Task551ReviewedCandidateTransitionInputV1,
  Task551ReviewedCandidateTransitionResultV1,
} from "./task551DatabaseBaseline/digestContract";
import type {
  Task551FixtureTarget,
  Task551FixtureTargetChildValues,
  Task551FixtureTargetClient,
} from "./task551DatabaseBaseline/fixtureTarget";

type Task551CliProcessEnvironment = Readonly<Record<string, string | undefined>>;
type Task551CliOsEnvironmentKey = "PATH" | "TMPDIR" | "LANG" | "LC_ALL" | "TZ";
const TASK551_CLI_OS_ENVIRONMENT_KEYS = [
  "PATH", "TMPDIR", "LANG", "LC_ALL", "TZ",
] as const satisfies readonly Task551CliOsEnvironmentKey[];

function snapshotL11InjectedFixtureTargetForCli(
  childProcessEnvironment: Task551CliProcessEnvironment,
): Task551FixtureTargetChildValues {
  // Module-private CLI-adapter seam only. It has no reference to process.env
  // or process.argv and is reached in production only from the guarded wrapper.
  // Enumerate Object.keys(childProcessEnvironment) exactly once, inspect only
  // names, and permit only TASK551_FIXTURE_TARGET_CHILD_KEYS plus the fixed OS
  // tuple above. Reject all other names, including DATABASE_URL3, DATABASE_URL,
  // DATABASE_DIRECT_URL, any other DATABASE_* name, every bootstrap name, and
  // every extra TASK551_*/TASK551_FIXTURE_* name before dereferencing a value.
  // Then read each of the three fixture names exactly once and explicitly assign
  // it into a fresh ordinary three-own-property object. Do not copy an OS value,
  // spread/merge/retain the source map, or create a fallback. Pass the fresh map
  // to assertTask551FixtureTargetChildKeys before main can parse a target.
}

async function runCliEntryFromL11ChildProcess(
  childArgv: readonly string[],
  childProcessEnvironment: Task551CliProcessEnvironment,
  deps: Task551DatabaseBaselineRunnerDeps,
  output: Task551DatabaseBaselineCliOutput,
): Promise<Task551DatabaseBaselineCliResult> {
  // Module-private forwarding seam called only by the guarded wrapper. Snapshot
  // first, then call only the injectable main(childArgv, fixtureMap,
  // deps, output) seam. This function neither connects, logs, nor receives a
  // parent environment. The map passed to main contains exactly the three direct
  // fixture keys; no OS, generic, bootstrap, or process-environment object can
  // cross this boundary.
}

async function main(
  argv: readonly string[],
  fixtureTargetSubmap: Task551FixtureTargetChildValues,
  deps: Task551DatabaseBaselineRunnerDeps,
  output: Task551DatabaseBaselineCliOutput,
): Promise<Task551DatabaseBaselineCliResult> {
  // Injectable runner/main seam. Parse only --freeze or --check and their
  // closed profile/selector arguments, then parseL11SuppliedFixtureTarget from
  // the already exact submap. It never reads environment or argv globals.
}

if (import.meta.main) {
  // This is the sole production read of process.argv/process.env in the L02
  // source tree. Copy argv once and pass the process map only to the exact-key
  // snapshot seam above. Do not load dotenv, merge/spread ambient state, or log
  // a value; all failures route through main's redacted CLI boundary.
}

type ScaleProfile = "small" | "large";
type FixtureFamily = keyof typeof TASK551_SCALE_COUNTS;
const TASK551_PRESERVED_SENTINEL_TABLE = "public.task551_fixture_sentinel" as const;
type FixtureScenario = StrictReadonly<{
  id: string;
  kind: "admin-shape" | "supplemental" | "task489-predecessor";
  targetStatementOrFamily: string;
  minimumClosure: readonly FixtureFamily[];
  supportTables: readonly string[];
  expectedTableCounts: ScenarioTableCountDerivation;
  ownedKeyPredicate: OwnedKeyPredicate;
  equalityParticipation: "admin-32" | "supplemental" | "deferred";
  statementShapeId?: string;
}>;
const PROFILE_POOL_CAPACITY = strictReadonly({ small: 2, large: 10 });
const MEASUREMENT = strictReadonly({ repetitions: 3, warmups: 5, samples: 30,
  calibrationWarmups: 20, calibrationSamples: 100, maxP95VariancePercent: 20 });
const TASK551_SCALE_DISTRIBUTIONS = strictReadonly({
  users: { active: 80, inactive: 10, pending: 10, roles: 5 },
  contentStatus: { published: 50, draft: 30, scheduled: 10, archived: 10 },
  entryVisibility: { public: 70, private: 20, password: 10 },
  formStatus: { published: 60, draft: 30, archived: 10 },
  submissionStatus: { new: 70, processed: 20, spam: 10 },
  userRoles: { primaryPerUser: 1, additionalEvery: 10, additionalPerMatch: 1 },
  postTags: { buckets: 10, extraTag: "task551-post-extra", extraEvery: 10 },
  mediaTags: { buckets: 10, pairTag: "task551-media-pair", pairEvery: 100 },
  equalSortGroupSize: 10,
});
const TASK551_SEARCH_HIT_COUNTS = strictReadonly({
  users: { small: { common: 1, rare: 1 }, large: { common: 100, rare: 10 } },
  pages: { small: { common: 5, rare: 1 }, large: { common: 1_000, rare: 100 } },
  entries: { small: { common: 20, rare: 2 }, large: { common: 1_000, rare: 100 } },
  posts: { small: { common: 10, rare: 1 }, large: { common: 1_000, rare: 100 } },
  media: { small: { common: 20, rare: 2 }, large: { common: 1_000, rare: 100 } },
  assistantDocs: { small: { common: 2, rare: 1 }, large: { common: 100, rare: 10 } },
  assistantChunks: { small: { common: 20, rare: 2 }, large: { common: 1_000, rare: 100 } },
});

type NumericPlanBudget = StrictReadonly<{
  queryCountMax: 1;
  rowsReadMax: number;
  rowsReturnedMax: 1 | 51 | 101 | 102;
  transferredBytesMax: number;
  sharedBuffersMax: number;
  p50MsMax: number;
  p95MsMax: number;
  p99MsMax: number;
}>;

type SanitizedFreezeReceipt = Task551ReviewableFreezeReceiptV1;

function parseL11SuppliedFixtureTarget(
  childTargetSubmap: Readonly<Record<string, unknown>>,
): Task551FixtureTarget {
  // The runner receives only the fresh direct three-key submap the guarded CLI
  // adapter copied after L11 had current durable redacted L03 evidence,
  // completed L02's DB-free static/manifest finalization and required isolated
  // static receipts, validated the fresh
  // `l02-fixture-operation` source before reading its values, and mapped only
  // that source's own URL/sentinel plus the fixed `coderso02` name. These
  // imported helpers never inspect an ambient/parent environment, process.env,
  // dotenv, or an L03 source/map and have no generic URL fallback.
  return parseTask551FixtureTarget(
    assertTask551FixtureTargetChildKeys(childTargetSubmap),
  );
}

function assertScenarioAndLedgerExcludePreservedSentinel(
  scenario: FixtureScenario, ledger?: FixtureLifecycleLedger,
): void {
  // Reject the schema-qualified and bare sentinel table name from every derived
  // closure/support/count/key-predicate/ledger descriptor before any mutable
  // operation. Cleanup receives only this validated ledger and never contains a
  // sentinel table name or a sentinel mutation branch.
}

function parseScenarioSelection(argv: readonly string[]): ScenarioSelection {
  // Require --scenario <id> XOR --all. --all expands only executable admin-shape
  // and supplemental manifest entries in static order; deferred Task489 never
  // executes here. Unknown, duplicate, or partial closure definitions fail
  // database_baseline_invalid before connecting.
}

async function verifyPostPreflightFixtureCatalog(sql: SqlClient): Promise<void> {
  // The runner adapter reads only required table/column/nullability/named
  // constraint/index metadata after target preflight. It passes the JSON-only
  // result to normalizeTask551SanitizedCatalogProjection(), then requires exact
  // equality with TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION. It neither
  // returns nor serializes the live projection outside this boundary.
}

function computeTask551CheckDigests(
  profile: ScaleProfile,
  selector: Task551CanonicalSelector,
  reviewedReceipt: SanitizedFreezeReceipt,
  sourceHashes: Readonly<Record<string, Task551LowercaseSha256>>,
  sha256Bytes: (bytes: Uint8Array) => string,
) {
  // The runner reads and hashes only TASK551_RUNNER_DIGEST_SOURCE_PATHS, then
  // calls the pure export for all values. The four static values use the full
  // static contracts; only manifestScenarioResultDigest receives profile/selector.
  // The receipt profile must equal this dispatch profile; both runner and L11
  // call the same reviewable-receipt helper rather than reconstructing bytes.
  if (reviewedReceipt.profile !== profile) throw new Error("database_baseline_invalid");
  return strictReadonly({
    reviewableReceiptDigest: requireReviewableFreezeReceipt(reviewedReceipt, sha256Bytes),
    contractDigest: computeTask551ContractDigest(buildTask551ContractDigestInput({
      plannedIds: TASK551_ADMIN_READ_PLANNED_IDS,
      shapes: TASK551_ADMIN_READ_STATEMENT_SHAPES,
      measurement: MEASUREMENT,
    }), sha256Bytes),
    fixtureDigest: computeTask551FixtureDigest(buildTask551FixtureDigestInput({
      manifestVersion: TASK551_SCENARIO_MANIFEST_VERSION,
      scenarios: TASK551_SCENARIOS,
      scaleCounts: TASK551_SCALE_COUNTS,
      distributions: TASK551_SCALE_DISTRIBUTIONS,
    }), sha256Bytes),
    schemaDigest: computeTask551SchemaDigest(
      TASK551_REQUIRED_SANITIZED_CATALOG_PROJECTION, sha256Bytes,
    ),
    runnerDigest: computeTask551RunnerDigest(sourceHashes, sha256Bytes),
    manifestScenarioResultDigest: computeTask551ManifestScenarioResultDigest(
      { profile, selector, scenarios: TASK551_SCENARIOS }, sha256Bytes,
    ),
  });
}

function materializeCandidateFreezeReceipt(
  candidate: Omit<
    Task551ReviewableReceiptDigestInputV1,
    "reviewState" | "reviewableReceiptDigest"
  >,
  sha256Bytes: (bytes: Uint8Array) => string,
): SanitizedFreezeReceipt {
  // This is the runner's only reviewable-receipt serializer/digester. The
  // initial call has no self digest, then the complete persisted form is passed
  // through the same pure helper again; L02 retains that verification internally.
  const withCandidateState = strictReadonly({ ...candidate, reviewState: "candidate" });
  const reviewableReceiptDigest = computeTask551ReviewableReceiptDigest(
    withCandidateState, sha256Bytes,
  );
  const persisted = strictReadonly({ ...withCandidateState, reviewableReceiptDigest });
  assertEqual(
    computeTask551ReviewableReceiptDigest(persisted, sha256Bytes),
    reviewableReceiptDigest,
  );
  return persisted;
}

function requireReviewableFreezeReceipt(
  receipt: SanitizedFreezeReceipt,
  sha256Bytes: (bytes: Uint8Array) => string,
): Task551LowercaseSha256 {
  // The imported helper validates all five receipt digest fields and rejects a
  // right-shaped receipt whose persisted reviewable digest is not its exact
  // RFC8785-derived value. No caller may hand-build a comparison projection.
  return computeTask551ReviewableReceiptDigest(receipt, sha256Bytes);
}

// This runner creates only candidate receipts and performs --check. It has no
// capability/factory import or review transition. After the two freezes, L11
// alone calls reviewedPairPersistence.ts's narrow L02-owned transition API;
// a successful reviewed result is the precondition for either --check.

assertExactAdminShapeAndBudgetSets({
  expectedIds: TASK551_ADMIN_READ_PLANNED_IDS, // exact 32-member tuple from L01
  shapes: TASK551_ADMIN_READ_STATEMENT_SHAPES,
  budgets: TASK551_DATABASE_BUDGETS,
  profiles: ["small", "large"],
});
assertExactScenarioShapeBudgetCoverage({
  scenarios: TASK551_SCENARIOS,
  shapeIds: TASK551_ADMIN_READ_PLANNED_IDS,
  budgetIds: Object.keys(TASK551_DATABASE_BUDGETS),
  canonicalTemplates: TASK551_ADMIN_READ_STATEMENT_SHAPES,
  profiles: ["small", "large"],
  requiredNumericFields: ["queryCountMax", "rowsReadMax", "rowsReturnedMax",
    "transferredBytesMax", "sharedBuffersMax", "p50MsMax", "p95MsMax", "p99MsMax"],
});

function expectedSearchHits(
  family: keyof typeof TASK551_SEARCH_HIT_COUNTS,
  profile: ScaleProfile,
  token: "common" | "rare" | "unique" | "hidden" | "miss",
): number {
  if (token === "unique") return 1;
  if (token === "hidden" || token === "miss") return 0;
  return TASK551_SEARCH_HIT_COUNTS[family][profile][token];
}

async function withTask551Scenario<T>(
  target: Task551FixtureTarget,
  targetProofClient: Task551FixtureTargetClient,
  profile: ScaleProfile,
  scenario: FixtureScenario,
  run: (scope: FixtureScope) => Promise<T>,
) {
  assertScenarioAndLedgerExcludePreservedSentinel(scenario);
  await assertTask551FixtureTarget(target, targetProofClient);
  // The imported preflight has completed its read-only rollback before seed.
  const scope = validatedRunScope();
  const ledger = createMutableFixtureLifecycleLedger(profile, scenario, scope);
  assertScenarioAndLedgerExcludePreservedSentinel(scenario, ledger);
  try {
    await assertNoOwnedResidue(target, profile, scenario, scope);
    await seedDependencyClosure(target, profile, scenario, scope, ledger);
    // Record every successful owned batch and ID predicate before the next write.
    await assertExactScenarioRows(target, profile, scenario, scope);
    return await run(scope);
  }
  finally {
    try {
      await cleanupFixtureLifecycleLedgerChildFirst({
        target, profile, scenario, scope, ledger,
        requireExactActualDeletedRetainedCounts: true, proveZeroResidue: true,
      });
      // Delete targets derive only from the validated ledger, never the sentinel.
    } finally {
      // Run even if zero/partial/full work or cleanup failed; any failed proof
      // overrides success and fails closed at the outer redacted error boundary.
      await assertTask551FixtureTargetPostCleanup(target, targetProofClient);
    }
  }
}

async function measureQueryFamily(contract: BudgetContract, scope: FixtureScope) {
  // Each of three repetitions runs five unrecorded warmups then 30 samples.
  // Instrument actual statement dispatch (=1), take one sanitized EXPLAIN
  // work pass, serialize returned fixture projection bytes, and calculate
  // normalized p50/p95/p99 from all three repetitions. Every field is checked.
  return sampleExactAndEnforceAllEight(MEASUREMENT, contract, scope);
}

async function measurePoolAcquisitionWait(profile: ScaleProfile, sql: SqlClient) {
  // Create a harness-owned pool with max PROFILE_POOL_CAPACITY[profile], reserve
  // exactly that numeric capacity, synchronize one
  // additional waiter, measure reserve->acquire latency, then release every
  // reservation in finally. This is an external contention measurement and
  // does not consume TASK-551-02's later telemetry implementation. The same
  // pool used for calibration/measurement has exactly this max; a max of
  // capacity + reserve, an inherited maximum, or an extra hidden client fails.
}

function p95SpreadPercent(repetitionP95Ms: readonly [number, number, number]): number {
  const median = medianOfThree(repetitionP95Ms);
  if (repetitionP95Ms.every((value) => value === 0)) return 0;
  return ((Math.max(...repetitionP95Ms) - Math.min(...repetitionP95Ms)) /
    Math.max(median, 0.1)) * 100;
}

function freezeCeiling(kind: QueryKind, medianRepetitionPercentileMs: number) {
  const floor = { point: 1, list: 5, search: 10, aggregate: 10, append: 2, pool: 5 }[kind];
  return ceilToTenthMillisecond(Math.max(floor, medianRepetitionPercentileMs * 1.25));
}

async function freezeOrCheckScenario(
  mode: "freeze" | "check", profile: ScaleProfile, scenario: FixtureScenario,
) {
  // Safe target preflight comes first. --freeze writes finite measurements plus
  // a candidate receipt. --check writes no artifact and cannot start until the
  // separate L02-owner/capability-authorized pair transition has returned an exact
  // reviewed result for both just-frozen profiles. It then recomputes contract,
  // fixture, schema, runner, and reviewable receipt digests plus runtime context
  // after preflight, and rejects candidate/stale/context or calibration
  // mismatches, a factor outside 0.80..1.20, p95 spread >20%, or any of the 528
  // numeric budget assertion failures. Only after every selected scenario has
  // completed its cleanup proof does the outer command emit exactly one
  // Task551BaselineCheckSuccessRecord to stdout; failures emit only the stable
  // redacted failure token to stderr. A reviewed receipt is immutable and
  // --freeze then fails.
}

function emitCheckSuccessRecord(record: Task551BaselineCheckSuccessRecord): void {
  // Validate the exact closed schema and canonicalize it once. Write the single
  // line only after target preflight and all scenario checks are complete; never
  // serialize target data, scope data, context, timing, or a failure cause.
  // The caller never persists stdout; TASK-551-11 is the exclusive capture and
  // durable-evidence owner.
}
```

The reviewed transition is deliberately separate from the runner above. The
following historical pre-split sketch is retained only as compatibility context
and is superseded in full by **Phase-1 reviewed-pair bridge replacement** below:
the stable facade is `reviewedPairPersistence.ts`, the implementation is
`reviewedPairTransition.ts`, and `Task551ReviewedPairPersistenceCapability`
remains an L02-internal runner/persistence seam rather than an L11 handoff.

```ts
// scripts/task551DatabaseBaseline/reviewedPairPersistence.ts
type Task551L02OwnerApprovalCapability = object;
type Task551L02OwnerCapabilityFactory = Readonly<{
  issueForCandidates(input: Readonly<{
    worktreeSnapshotDigest: Task551LowercaseSha256;
    smallCandidateDigest: Task551LowercaseSha256;
    largeCandidateDigest: Task551LowercaseSha256;
    expiresAt: number;
    nonce: string;
  }>): Task551L02OwnerApprovalCapability;
  consumeForReviewedTransition(
    capability: Task551L02OwnerApprovalCapability,
    observed: Readonly<{
      worktreeSnapshotDigest: Task551LowercaseSha256;
      smallCandidateDigest: Task551LowercaseSha256;
      largeCandidateDigest: Task551LowercaseSha256;
      now: number;
    }>,
  ): Task551L02OwnerCapabilityReceiptV1;
}>;

function createTask551L02OwnerCapabilityFactory(
  trustedWorktreeSnapshotDigest: Task551LowercaseSha256,
): Task551L02OwnerCapabilityFactory {
  // A module-closure WeakSet/WeakMap/Symbol binding; neither this function, its
  // return value, nor an issued capability is exported or accepted from L11.
}

type Task551L02ReviewedTransitionWithStateReceiptV2 =
  Task551ReviewedCandidateTransitionResultV1 & Readonly<{
    stateTransitionReceipt: Task551L02ActiveStateTransitionReceiptV2;
  }>;
type Task551L02OwnedReviewedTransitionDeps = Readonly<{
  requireAcceptedL11WorktreeSnapshotDigest(
    received: Task551LowercaseSha256,
  ): Promise<Task551LowercaseSha256>;
  readExactCurrentCandidateSnapshot(): Promise<readonly [
    Readonly<{ profile: "small"; candidateReceipt: Task551ReviewableFreezeReceiptV1 }>,
    Readonly<{ profile: "large"; candidateReceipt: Task551ReviewableFreezeReceiptV1 }>,
  ]>;
  requireL02OwnerReviewedCandidateDiff(input: Task551ReviewedCandidateTransitionInputV1): Promise<void>;
  now(): number;
  atomicallyVerifyAndWriteReviewedPair(args: Readonly<{
    input: Task551ReviewedCandidateTransitionInputV1;
    capability: Task551L02OwnerApprovalCapability;
    observed: Readonly<{
      worktreeSnapshotDigest: Task551LowercaseSha256;
      smallCandidateDigest: Task551LowercaseSha256;
      largeCandidateDigest: Task551LowercaseSha256;
      now: number;
    }>;
    factory: Task551L02OwnerCapabilityFactory;
    sha256Bytes: (bytes: Uint8Array) => string;
  }>): Promise<Task551L02ReviewedTransitionWithStateReceiptV2>;
  readExactCurrentReviewedResult(): Promise<Task551L02ReviewedTransitionWithStateReceiptV2>;
  sha256Bytes(bytes: Uint8Array): string;
}>;

export async function runL02OwnedReviewedTransition(
  request: Task551L02ReviewedTransitionInputV1,
): Promise<Task551L02ReviewedTransitionWithStateReceiptV2> {
  return runL02OwnedReviewedTransitionWithDeps(request, l02OwnedTransitionDeps);
}

async function runL02OwnedReviewedTransitionWithDeps(
  request: Task551L02ReviewedTransitionInputV1,
  deps: Task551L02OwnedReviewedTransitionDeps,
): Promise<Task551L02ReviewedTransitionWithStateReceiptV2> {
  const received = requireExactL02ReviewedTransitionRequest(request);
  const worktreeSnapshotDigest = await deps.requireAcceptedL11WorktreeSnapshotDigest(
    received.worktreeSnapshotDigest,
  ); // compares an accepted immutable L11 materialization receipt; never Git HEAD
  if (worktreeSnapshotDigest !== received.worktreeSnapshotDigest)
    throwL02OwnedReviewedTransition("l02_owned_reviewed_transition_snapshot_mismatch");
  const currentInput = buildTask551ReviewedCandidateTransitionInput(
    await deps.readExactCurrentCandidateSnapshot(), deps.sha256Bytes,
  );
  if (currentInput.candidates[0].candidateCanonicalReceiptDigest !==
        received.smallCandidateCanonicalDigest ||
      currentInput.candidates[1].candidateCanonicalReceiptDigest !==
        received.largeCandidateCanonicalDigest)
    throwL02OwnedReviewedTransition("l02_owned_reviewed_transition_candidate_mismatch");
  await deps.requireL02OwnerReviewedCandidateDiff(currentInput);
  const factory = createTask551L02OwnerCapabilityFactory(worktreeSnapshotDigest);
  const capability = factory.issueForCandidates({
    worktreeSnapshotDigest,
    smallCandidateDigest: received.smallCandidateCanonicalDigest,
    largeCandidateDigest: received.largeCandidateCanonicalDigest,
    expiresAt: requireBoundedExpiry(), nonce: requireFreshNonce(),
  });
  const persisted = await deps.atomicallyVerifyAndWriteReviewedPair({
    input: currentInput, capability,
    observed: {
      worktreeSnapshotDigest,
      smallCandidateDigest: received.smallCandidateCanonicalDigest,
      largeCandidateDigest: received.largeCandidateCanonicalDigest,
      now: deps.now(),
    },
    factory, sha256Bytes: deps.sha256Bytes,
  }); // transaction rechecks snapshot/current pair, consumes once, and writes both.
  assertExactTask551ReviewedCandidateTransition({
    input: currentInput, result: persisted, sha256Bytes: deps.sha256Bytes,
  });
  const current = await deps.readExactCurrentReviewedResult();
  assertExactTask551ReviewedCandidateTransition({
    input: currentInput, result: current, sha256Bytes: deps.sha256Bytes,
  });
  return current;
}

function atomicallyVerifyAndWriteReviewedPair(args: Readonly<{
  input: Task551ReviewedCandidateTransitionInputV1;
  capability: Task551L02OwnerApprovalCapability;
  observed: Readonly<{
    worktreeSnapshotDigest: Task551LowercaseSha256;
    smallCandidateDigest: Task551LowercaseSha256;
    largeCandidateDigest: Task551LowercaseSha256;
    now: number;
  }>;
  factory: Task551L02OwnerCapabilityFactory;
  sha256Bytes: (bytes: Uint8Array) => string;
}>): Promise<Task551ReviewedCandidateTransitionResultV1> {
  // In one transaction re-read the accepted immutable snapshot binding and the
  // current strict candidate pair, consume the private capability exactly once,
  // change only reviewState, no-replace write both reviewed receipts, and commit.
  const capabilityReceipt = args.factory.consumeForReviewedTransition(
    args.capability, args.observed,
  );
  const result = buildExactReviewedResultByChangingOnlyReviewState({
    input: args.input, capabilityReceipt, sha256Bytes: args.sha256Bytes,
  });
  assertExactTask551ReviewedCandidateTransition({
    input: args.input, result, sha256Bytes: args.sha256Bytes,
  });
  return commitReviewedPairAtomically(result);
}
```

The preceding `requireAcceptedL11WorktreeSnapshotDigest` sketch, including its
older result shape without the active-v2 state receipt, is superseded by the
non-declared registration hook and module-closure registry below: L02 does not
read an L11 receipt, execute Git, or trust current `HEAD`.
`throwL02OwnedReviewedTransition` maps malformed/foreign input, snapshot
mismatch, candidate mismatch, denied owner review, ingress reuse, expiry,
replay, and transaction conflict to exactly
`l02_owned_reviewed_transition_invalid`, `_snapshot_mismatch`,
`_candidate_mismatch`, `_approval_denied`, `_approval_ingress_reused`, `_expired`, `_replayed`, and
`_conflict`, with no nonce, path, candidate body, or private-state detail.

### Archive-Preserving Active v2 Candidate Generation (L04 prerequisite)

The historical source
`tests/perf/task551DatabaseBaseline/freezeReceipts.ts` is a byte-pinned archive,
not the active receipt state. Its SHA-256 is exactly
`17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f`; its
mixed small-candidate/large-reviewed contents are deliberately rejected as an
active state. No L02 code opens that archive for write, uses it as a candidate
template, replaces it, changes its `reviewState`, or falls back to it after an
active-state error.

This section supersedes every earlier sketch in this leaf that calls a
checked-in freeze pair/current pair/persisted receipt writable: after L04 those
phrases mean only the separate active v2 state below. Earlier pure digest and
review-state invariants remain unchanged; they do not authorize the legacy
archive as a writer target.

After L04's accepted strict bootstrap **and only after the L02 active-v2
replacement plus legacy-write guard have landed**, L02 alone creates the
separate active v2 state. `tests/perf/task551DatabaseBaseline/freezeCandidateGenerationState.ts`
is the typed source/fixture model, not the mutable state file; it exposes only
validated reviewed receipts through
`tests/perf/task551DatabaseBaseline/freezeCandidateGenerationFixture.ts`, and
keeps builders/fakes in
`tests/perf/task551DatabaseBaseline/freezeCandidateGenerationTestHelpers.ts`.
`scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts` is the
single private storage authority. It is extracted from the 939-line transition
before further storage logic lands; `reviewedPairTransition.ts`, the store,
the facade, runner, fixtures, helpers, and existing focused tests must each end
at no more than 1,000 physical lines.

The store exports and the two existing focused suites pin these exact runtime
paths; no caller may supply, normalize, or join them:

```ts
const TASK551_ACTIVE_GENERATION_PARENT = ".tmp/task-551/freeze-candidate-generation-v2";
const TASK551_ACTIVE_GENERATION_STATE_PATH = ".tmp/task-551/freeze-candidate-generation-v2/state.json";
const TASK551_ACTIVE_GENERATION_LOCK_PATH = ".tmp/task-551/freeze-candidate-generation-v2/state.lock";
const TASK551_ACTIVE_GENERATION_TEMP_PATH = ".tmp/task-551/freeze-candidate-generation-v2/state.json.tmp";
```

The parent is an owner-created directory and every existing ancestor/parent is
a non-symlink directory; state/temp are regular non-symlink files and the lock
is an exclusive, regular non-symlink file. Before the first small freeze only,
the state path must be absent and semantically means `awaiting-small`; later
absence, any stale temp/lock, foreign child, traversal, symlink, nonregular, or
parent identity drift fails closed. A successful or failed mutation releases the
lock and removes the exact temp path in `finally`; tests pin all four literals,
parent/ancestor checks, no-follow behavior, cleanup on throw, and no archive
write. The runtime state is private L02 storage, never an L11 source snapshot,
workflow evidence row, or task-file output.

The active state has exact own-data fields `schema`, `version`, `generationId`,
`archive`, `state`, and `receipts`, with literal bootstrap identity:

```ts
type Task551FreezeCandidateGenerationArchiveV2 = Readonly<{
  path: "tests/perf/task551DatabaseBaseline/freezeReceipts.ts";
  sha256: "17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f";
}>;
type Task551SmallCandidateReceiptV2 = Readonly<{
  profile: "small";
  receipt: Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: "candidate" }>;
}>;
type Task551LargeCandidateReceiptV2 = Readonly<{
  profile: "large";
  receipt: Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: "candidate" }>;
}>;
type Task551SmallReviewedReceiptV2 = Readonly<{
  profile: "small";
  receipt: Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: "reviewed" }>;
}>;
type Task551LargeReviewedReceiptV2 = Readonly<{
  profile: "large";
  receipt: Task551ReviewableFreezeReceiptV1 & Readonly<{ reviewState: "reviewed" }>;
}>;
type Task551FreezeCandidateGenerationStateV2 =
  | Readonly<{
      schema: "coderso.task551.freeze-candidate-generation-state@v2";
      version: 2;
      generationId: "task551-freeze-candidate-generation-v2";
      archive: Readonly<{
        path: "tests/perf/task551DatabaseBaseline/freezeReceipts.ts";
        sha256: "17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f";
      }>;
      state: "awaiting-small";
      receipts: readonly [];
    }>
  | Readonly<{
      schema: "coderso.task551.freeze-candidate-generation-state@v2";
      version: 2;
      generationId: "task551-freeze-candidate-generation-v2";
      archive: Task551FreezeCandidateGenerationArchiveV2;
      state: "awaiting-large";
      receipts: readonly [Task551SmallCandidateReceiptV2];
    }>
  | Readonly<{
      schema: "coderso.task551.freeze-candidate-generation-state@v2";
      version: 2;
      generationId: "task551-freeze-candidate-generation-v2";
      archive: Task551FreezeCandidateGenerationArchiveV2;
      state: "ready-for-review";
      receipts: readonly [Task551SmallCandidateReceiptV2, Task551LargeCandidateReceiptV2];
    }>
  | Readonly<{
      schema: "coderso.task551.freeze-candidate-generation-state@v2";
      version: 2;
      generationId: "task551-freeze-candidate-generation-v2";
      archive: Task551FreezeCandidateGenerationArchiveV2;
      state: "reviewed";
      receipts: readonly [Task551SmallReviewedReceiptV2, Task551LargeReviewedReceiptV2];
    }>;
```

The state parser is strict at every depth: no inherited/accessor/duplicate,
unknown, missing, sparse, `undefined`, defaulted, reordered, cross-profile,
mixed-review-state, or noncanonical receipt is accepted. It validates the L04
bootstrap identity before reading the active file, then validates the literal
archive as a regular non-symlink with its exact raw SHA-256 before every active
read or write. The exact parent/state/lock/temp literals above are the only
active paths; they fail closed on traversal, foreign file, symlink, nonregular,
stale lock/re-read, cleanup failure, or archive mismatch.

The only forward edges are:

```text
awaiting-small --freeze small candidate--> awaiting-large
awaiting-large --freeze large candidate--> ready-for-review
ready-for-review --L02 owner review--> reviewed
reviewed --check small/large only--> reviewed
```

For every legal mutating edge, L02 returns only one strict, sanitized,
in-memory `Task551L02ActiveStateTransitionReceiptV2` to L11; it never writes
this receipt to the archive, active-state file, task tree, or durable evidence:

```ts
type Task551L02ActiveStateTransitionReceiptV2 = Readonly<{
  schema: "coderso.task551.l02-active-state-transition-receipt@v2"; version: 2;
  generationId: "task551-freeze-candidate-generation-v2";
  operation: "freeze-small" | "freeze-large" | "review"; sequence: 1 | 2 | 3;
  transitionId: Task551LowercaseSha256; previousTransitionId: Task551LowercaseSha256 | null;
  beforeState: "awaiting-small" | "awaiting-large" | "ready-for-review";
  beforeStateDigest: "absent" | Task551LowercaseSha256;
  afterState: "awaiting-large" | "ready-for-review" | "reviewed";
  afterStateDigest: Task551LowercaseSha256;
  archiveSha256: "17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f";
  bootstrapSourceSha256: Task551LowercaseSha256; l02ClosureSha256: Task551LowercaseSha256;
}>;
type Task551L02ReviewedStateAttestationV2 = Readonly<{
  schema: "coderso.task551.l02-reviewed-state-attestation@v2"; version: 2;
  generationId: "task551-freeze-candidate-generation-v2";
  state: "reviewed"; sequence: 3; transitionId: Task551LowercaseSha256;
  stateDigest: Task551LowercaseSha256;
  archiveSha256: "17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f";
  bootstrapSourceSha256: Task551LowercaseSha256; l02ClosureSha256: Task551LowercaseSha256;
}>;
```

The initial L11 expectation is `{ state:"awaiting-small", digest:"absent", sequence:0, transitionId:null }`; exactly the three
receipts are `1 awaiting-small/absent -> awaiting-large`, `2 awaiting-large/<hex> -> ready-for-review`, and `3 ready-for-review/<hex> -> reviewed`.
L02 derives `afterStateDigest` and `transitionId` from canonical strict receipt
fields (the latter's self field excluded) only after atomic re-read; it emits no
receipt for an invalid edge. A non-mutating check
returns exactly `Task551L02ReviewedStateAttestationV2`, with the current state
digest, final sequence/transition ID, and the same archive/bootstrap/L02-closure
bindings. L11 consumes
the transition ID once, binds `previousTransitionId`, sequence, operation,
before/after state and digest to its in-memory expectation, rechecks immutable
code/bootstrap closure, and rebases only after all comparisons pass. It never
receives raw state/archive bytes; a replay, skipped/reversed edge, altered code
or bootstrap closure, archive-hash failure, state-digest mismatch, or bad check
attestation stops all later children/check evidence with a fixed redacted code.

`--freeze --profile small` rejects every state except `awaiting-small`;
`--freeze --profile large` rejects every state except `awaiting-large`; the
owner transition accepts only `ready-for-review`; and `--check` accepts only
the exact reviewed pair. The store writes only the active v2 file through one
private lock plus atomic temp/write/fsync/rename/re-read sequence. A partial
pair, reset, retry overwrite, candidate after review, reviewed-to-candidate
demotion, direct fixture map, `--force`, or legacy-state repair is not an API
and fails before any fixture check dispatch. A different generation is a future
task-contract amendment, never an in-band recovery.

Before the active-v2 store and legacy-write guard exist, every L02 CLI entry
for `--freeze` or `--check` and every legacy reviewed-pair writer must fail
`l02_active_generation_migration_required` before fixture source, DB, archive,
or state I/O. L04 alone never authorizes such a dispatch. Once L02 lands, the
runner/store permanently rejects an archive write handle or legacy pair as an
active input, so final-repository archive immutability is enforced in code.

The runner receives a private store result rather than a mutable receipt map.
`reviewedPairTransition.ts` asks that store to re-read the exact two candidate
members under its existing synchronous lock, calls the owner review only after
the triple re-read, and commits only the `ready-for-review -> reviewed` pair.
`reviewedPairPersistence.ts` remains the stable facade; it cannot expose a
store, state path, legacy archive, candidate writer, review ingress, or active
state reset. It may expose only the type-only receipt shapes and the two pure
strict normalizers `parseTask551L02ActiveStateTransitionReceiptV2` and
`parseTask551L02ReviewedStateAttestationV2`; both accept an already-reduced
value, reject unknown data, and perform no filesystem, archive, environment,
or state I/O. The L02 host and L11 composition boundary remain exactly as
specified below: only the outer L11 composition root literal-dynamically imports
the owner host after the L02 code/test materialization closure; no other L11 module resolves it. L11
registers only the accepted digest and calls the public transition, and does not
read/write archive or active bytes or mint a new
durable evidence row.

`reviewedPairPersistence.test.ts` owns archive-integrity, nonregular/symlink,
state-machine, atomic/re-read, no-archive-write, and owner-transition tests;
`runnerLifecycle.test.ts` owns runner refusal/zero-check dispatch tests. They
may use the named helper but add no new `*.test.ts` path, so the L01 planned Bun
  manifest is the initial and continuous fixed nine-path set; L02 adds no
  manifest path for this work.

### Phase-1 reviewed-pair bridge replacement

The preceding pre-split sketch is superseded by this complete implementation
contract and the preceding active-v2 state section; it must not be combined
with an archive writer. The split is exactly
`scripts/task551DatabaseBaseline/reviewedPairPersistence.ts` (stable facade),
`scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts` (private
active-state/lock I/O), `scripts/task551DatabaseBaseline/reviewedPairReceiptSource.ts`
(owned transition receipt source), `scripts/task551DatabaseBaseline/reviewedPairTransition.ts`
(private transition importing that source), `scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts`
(private same-realm owner host), the named active state/fixture/helper modules,
and `tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts` (the
sole focused runtime/storage suite). The facade is the sole L11 import surface: its exact
closure is state-changing public `runL02OwnedReviewedTransition`, the two pure
sanitized receipt/attestation normalizers, the runtime-only non-declared
registration hook, and the separately declared predecessor parser; only the
transition changes state. The hook is absent from `.d.mts` and generic runner
exports. The implementation and owner host import no L11/workflow module
or facade; the sole reverse-free composition edge is
`task-551-implement.mjs -[literal post-L02-code/test-materialization dynamic import]-> reviewedPairOwnerHost.ts -> reviewedPairTransition.ts`,
and the facade and owner host each import implementation one way only.

Deprecated legacy **types** remain only where TypeScript compatibility requires
them. Runtime authority entry points
`createTask551ReviewedPairPersistence`,
`defaultTask551ReviewedPairPersistence`,
`transitionJustFrozenCandidatesAfterL02HumanApproval`,
`createTask551L02OwnerCapabilityFactory`, and every corresponding
`runner.ts` re-export must synchronously throw
`l02_owned_reviewed_transition_legacy_migration_required` before I/O, factory
issue/consume, candidate/reviewed write, or approval access. They cannot
delegate or retain an old bypass. The candidate-only runner writer is instead a
private `reviewedPairTransition.ts` seam, never a facade/runner export or
capability, and cannot mark a pair reviewed.

```ts
// reviewedPairPersistence.ts: stable facade; required legacy types only.
export { runL02OwnedReviewedTransition } from "./reviewedPairTransition";
export function parseTask551L02ActiveStateTransitionReceiptV2(
  value: unknown,
): Task551L02ActiveStateTransitionReceiptV2 {
  return requireExactTask551L02ActiveStateTransitionReceiptV2(value); // pure own-data validator; no I/O
}
export function parseTask551L02ReviewedStateAttestationV2(
  value: unknown,
): Task551L02ReviewedStateAttestationV2 {
  return requireExactTask551L02ReviewedStateAttestationV2(value); // pure own-data validator; no I/O
}
export { registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition } from
  "./reviewedPairTransition"; // L11-facade internal, non-declared
function failTask551LegacyReviewedAuthority(): never {
  throwL02OwnedReviewedTransition("l02_owned_reviewed_transition_legacy_migration_required");
}
export const createTask551ReviewedPairPersistence = failTask551LegacyReviewedAuthority;
export const defaultTask551ReviewedPairPersistence = failTask551LegacyReviewedAuthority;
export const transitionJustFrozenCandidatesAfterL02HumanApproval = failTask551LegacyReviewedAuthority;
export const createTask551L02OwnerCapabilityFactory = failTask551LegacyReviewedAuthority;

// reviewedPairTransition.ts: L02-private implementation (not a runner/declaration export).
type Task551RegisteredSnapshotV1 = Readonly<{
  digest: Task551LowercaseSha256; generation: number; consumed: boolean;
}>;
let registeredSnapshot: Task551RegisteredSnapshotV1 | undefined; // module closure only
let nextSnapshotGeneration = 0;
export function registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition(
  digest: Task551LowercaseSha256,
): void {
  requireLowercaseSha256(digest);
  if (registeredSnapshot?.consumed === false)
    throwL02OwnedReviewedTransition("l02_owned_reviewed_transition_snapshot_registration_reused");
  registeredSnapshot = { digest, generation: ++nextSnapshotGeneration, consumed: false };
}
const task551L02OwnerApprovalBrand: unique symbol = Symbol("task551-l02-owner-review-approval");
type Task551L02OwnerReviewRequestV1 = Readonly<{ schema: "coderso.task551.l02-owner-review-request@v1"; worktreeSnapshotDigest: Task551LowercaseSha256; smallCandidateCanonicalDigest: Task551LowercaseSha256; largeCandidateCanonicalDigest: Task551LowercaseSha256 }>;
type Task551L02OwnerReviewDecisionV1 = Readonly<{ approved: true; expiresAtUnixMs: number }> | Readonly<{ approved: false }>;
export type Task551L02OwnerPauseResumeIngressV1 = Readonly<{ review(request: Task551L02OwnerReviewRequestV1): Task551L02OwnerReviewDecisionV1 }>; // internal owner-host import only; never facade/declaration exported
type Task551L02SealedOwnerReviewApprovalV1 = Task551L02OwnerReviewRequestV1 & Readonly<{ approvedAtUnixMs: number; expiresAtUnixMs: number; readonly [task551L02OwnerApprovalBrand]: true }>;
let sealedOwnerReviewApproval: Task551L02SealedOwnerReviewApprovalV1 | undefined;
let ownerPauseResumeIngress: Task551L02OwnerPauseResumeIngressV1 | undefined;
export function installTask551L02OwnerPauseResumeIngressForOwnerHost(review: Task551L02OwnerPauseResumeIngressV1["review"]): void {
  if (ownerPauseResumeIngress) throwL02OwnedReviewedTransition("l02_owned_reviewed_transition_approval_ingress_reused");
  ownerPauseResumeIngress = Object.freeze({ review: requireSynchronousOwnerReviewCallback(review) });
}
export function revokeTask551L02OwnerPauseResumeIngressForOwnerHost(): void {
  sealedOwnerReviewApproval = undefined; ownerPauseResumeIngress = undefined;
}
function resetTask551L02OwnerPauseResumeIngressForFocusedTest(): void {
  revokeTask551L02OwnerPauseResumeIngressForOwnerHost();
}
// reviewedPairOwnerHost.ts is its sole production importer; the focused harness
// accesses/reset its private seam in finally. L11/child/evidence cannot.
function runL02OwnedReviewedTransitionSync(
  request: Task551L02ReviewedTransitionInputV1,
): Task551ReviewedCandidateTransitionResultV1 & Readonly<{
  stateTransitionReceipt: Task551L02ActiveStateTransitionReceiptV2;
}> {
  return withSynchronousAtomicReviewedPairWriterLock(() => { // no await in this callback
    const slot = registeredSnapshot;
    if (!slot) throwL02OwnedReviewedTransition("l02_owned_reviewed_transition_snapshot_unregistered");
    if (slot.consumed) throwL02OwnedReviewedTransition("l02_owned_reviewed_transition_snapshot_registration_reused");
    if (slot.generation !== nextSnapshotGeneration)
      throwL02OwnedReviewedTransition("l02_owned_reviewed_transition_snapshot_registration_stale");
    const accepted = rereadAcceptedSnapshotDigestInsideLock();
    if (accepted !== slot.digest || request.worktreeSnapshotDigest !== slot.digest)
      throwL02OwnedReviewedTransition("l02_owned_reviewed_transition_snapshot_mismatch");
    registeredSnapshot = { ...slot, consumed: true }; // generation-bound consume before write
    const input = buildTask551ReviewedCandidateTransitionInput(
      rereadExactCurrentCandidatePairInsideLock(), sha256Bytes,
    );
    requireRequestCandidateDigests(input, request);
    const ownerRequest = toExactOwnerReviewRequest(input); // all three re-read digests
    requireExactOwnerReviewTripleAfterLockReread(ownerRequest, slot.digest, input, request);
    const decision = ownerPauseResumeIngress?.review(ownerRequest) ?? { approved: false }; // sole review call: exactly once, synchronous, only here
    if (!decision.approved) throwL02OwnedReviewedTransition("l02_owned_reviewed_transition_approval_denied");
    sealedOwnerReviewApproval = mintSealedOwnerReviewApproval(ownerRequest, decision, task551L02OwnerApprovalBrand);
    try { consumeExactSealedOwnerReviewApproval(sealedOwnerReviewApproval, ownerRequest); const factory = createPrivateTask551L02OwnerCapabilityFactoryInsideTransition(slot.digest); const capability = factory.issueForCandidates(requireBoundedCapabilityInput(input)); const capabilityReceipt = factory.consumeForReviewedTransition(capability, requireObserved(input)); const result = buildExactReviewedResultByChangingOnlyReviewState({ input, capabilityReceipt, sha256Bytes }); commitActiveV2ReadyPairAsReviewedInsideLock(result); const reread = rereadExactCurrentReviewedResultInsideLock(); assertExactTask551ReviewedCandidateTransition({ input, result: reread, sha256Bytes }); const stateTransitionReceipt = buildExactActiveStateTransitionReceiptAfterReread(reread, slot); return Object.freeze({ ...reread, stateTransitionReceipt }); }
    finally { sealedOwnerReviewApproval = undefined; } // consume/revoke inside the same lock on every outcome
  });
}
export async function runL02OwnedReviewedTransition(
  request: Task551L02ReviewedTransitionInputV1,
): Promise<Task551ReviewedCandidateTransitionResultV1 & Readonly<{
  stateTransitionReceipt: Task551L02ActiveStateTransitionReceiptV2;
}>> {
  return runL02OwnedReviewedTransitionSync(requireExactL02ReviewedTransitionRequest(request));
}

// reviewedPairOwnerHost.ts (separate source): production-reachable L02 owner wrapper.
import type { Task551L02OwnerPauseResumeIngressV1 } from "./reviewedPairTransition";
import { installTask551L02OwnerPauseResumeIngressForOwnerHost, revokeTask551L02OwnerPauseResumeIngressForOwnerHost } from "./reviewedPairTransition";
function createTask551OwnerReviewChannelForOwnerHost(): Task551L02OwnerPauseResumeIngressV1["review"] {
  return requireOwnerLocalPauseResumePolicyOrDefaultDeny(); // host closure only; no L11/caller/input configuration
}
export async function runTask551L02OwnerHostInSameRealm<T>(
  invokeWorkflow: () => Promise<T>, // injected callback; no L02 -> L11 import
): Promise<T> {
  let ownerReviewChannel = createTask551OwnerReviewChannelForOwnerHost();
  installTask551L02OwnerPauseResumeIngressForOwnerHost(ownerReviewChannel);
  try { return await invokeWorkflow(); } // exactly one wrapper invocation, strictly after install
  finally { revokeTask551L02OwnerPauseResumeIngressForOwnerHost(); ownerReviewChannel = undefined as never; }
}
```

Only `_docs/_workflows/task-551-implement.mjs` outer
`runTask551ImplementWorkflow` literal-dynamically imports/calls `runTask551L02OwnerHostInSameRealm`
once after the L02 code/test materialization closure and before `single` dispatch in the same module realm as the transition singleton.
The host derives its synchronous interactive policy from its own owner-local
closure (default deny), not an L11/facade/caller input; it injects the facade
callback, never a candidate/digest/approval. The wrapper is source-free, non-child,
and non-spawning; it receives no broker/source/map/env/argv/child result, calls
`invokeWorkflow` exactly once after installation, and its `finally` always revokes
the ingress. `createTask551OwnerReviewChannelForOwnerHost` is the L02-private
production factory for that same-realm owner policy and returns a deny callback
when no owner policy exists; only the focused private seam may replace it and it
resets in `finally`.
`mintSealedOwnerReviewApproval` accepts only the exact re-read request plus
`approved:true` and a finite bounded future expiry; `consumeExact...` verifies
the runtime brand, exact triple, expiry, and one-use state, then revokes it on
every outcome. Neither a child result nor evidence, L11, facade input, runner,
or legacy caller has a declared/importable supported path to install, read, or
configure this ingress.

The registration is one-use and generation-bound. Its exhaustive fixed errors
are `l02_owned_reviewed_transition_invalid`,
`l02_owned_reviewed_transition_snapshot_unregistered`,
`l02_owned_reviewed_transition_snapshot_registration_reused`,
`l02_owned_reviewed_transition_snapshot_registration_stale`,
`l02_owned_reviewed_transition_snapshot_mismatch`,
`l02_owned_reviewed_transition_candidate_mismatch`,
`l02_owned_reviewed_transition_approval_denied`,
`l02_owned_reviewed_transition_approval_ingress_reused`,
`l02_owned_reviewed_transition_expired`,
`l02_owned_reviewed_transition_replayed`, and
`l02_owned_reviewed_transition_conflict`, and
`l02_owned_reviewed_transition_legacy_migration_required`. Every error is a fixed code only: no
digest body, candidate, capability, nonce, authority, path, or caught cause may
escape. The new `capabilityReceipt` retains exact v1 schema/name; never rename
it to `reviewedTransitionReceipt`.

Invalid profiles/counts fail `database_baseline_invalid`; an unreachable or
unproven fixture database fails the identity/sentinel preflight without seeding.
Measurement reports sanitized fingerprints only. The persisted freeze receipt
pins contract/fixture/schema/runner and reviewable-receipt digests, the
provenance commit, Linux/architecture, CPU model and logical count, memory,
PostgreSQL major/config digest, Bun version, pool capacity, container mode,
scope digest, and calibration metadata/median. Before any `--check` comparison,
the safe target preflight succeeds and check recomputes every digest and the
sanitized runtime context without writing.
Calibration uses 20 warmups plus 100 timed `SELECT 1` calls through the same
exact-capacity pool. Checks normalize every latency percentile with
`observedMs * referenceCalibrationMedian / currentCalibrationMedian` and reject
a context/version mismatch or factor outside `0.80..1.20`.
The receipt requires pool size `2` for the small profile and `10` for the large
profile; any inherited driver/env maximum, additional measurement client, or
capacity other than that exact value fails.

For p50/p95/p99, freeze the median of the three repetition percentiles with the
formula above. `--freeze` also writes exact numeric query-count, rows-read,
rows-returned, transferred-byte, shared-buffer, p50/p95/p99, and pool-wait
ceilings plus the candidate receipt to `task551DatabaseBudgets.ts`.
Missing/placeholders fail. Before L02 `single` workflow dispatch, only
`_docs/_workflows/task-551-implement.mjs`'s outer composition root literal-dynamically
imports/calls L02's same-realm `runTask551L02OwnerHostInSameRealm` wrapper after the L02 code/test materialization closure, which
privately derives and installs the in-process pause/resume review callback; absent is deny,
and no child/evidence/L11 input has a declared/importable supported path to
install, read, or configure it. The callback receives no candidate data until
the transition re-reads it under lock. The
L11-controlled sequence pauses after both small/large `--freeze` commands and
before the first `--check` command. At that pause L11 registers the independently validated snapshot through the
  non-declared facade hook, then calls only
  `runL02OwnedReviewedTransition({ worktreeSnapshotDigest,
smallCandidateCanonicalDigest, largeCandidateCanonicalDigest })`. It supplies
the accepted immutable L01 materialization snapshot digest and the two redacted
candidate canonical digests; it does not build or pass the full pair, a
callback, an approval record, a factory, a capability, a nonce, a source, or a child object. L02
re-reads the strict active-v2 pair, verifies the private snapshot binding and all three
digests, calls its installed owner reviewer once, then mints/consumes/revokes a
sealed bounded-lifetime approval inside its lock before atomically advancing only
the active v2 state from `ready-for-review` to both receipts `reviewed` through the one pure
assertion. L11 receives only the redacted result and reduces it to evidence; it
does not re-run a full-pair assertion or compare current checked-in receipt
bodies. A missing, rejected, stale, mismatched, or locally fabricated result
stops the workflow before either check starts. After the transition, only
`--check` is permitted; re-freezing or increasing a ceiling requires a
task-contract amendment.

## Testing Requirements

- **L01-dependent semantic static gate:** only after the initial L01 export has
  landed, `tests/perf/database-query-baseline.test.ts` imports the untouched
  immutable `TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION` and invokes the
  L02-owned `assertExactAdminShapeProjection` with
  `TASK551_ADMIN_READ_STATEMENT_SHAPES`. It proves exactly 32 matching IDs and
  the complete tuple: ID/planned-shape ID; future file/symbol/null anchor and
  caller family/operation; kind/statement role; projection/filter/join/order;
  bound/query-count; cache/freshness/transaction/constraint; and
  budget/fingerprint/owner/disposition. It exercises one isolated negative case
  for every tuple member plus missing, extra, duplicate, wrong-key, inherited,
  `undefined`, sparse, and defaulted member cases on either input. The test
  never mutates the imported L01 value; its synthetic malformed values are
  separate in-memory copies passed only to the L02 helper. It also proves the
  L02 raw declaration is duplicate-checked before a keyed lookup and that an
  invalid L02 template or digest fails even when semantic metadata matches.
  This command is database-free, environment-free, dotenv-free, and client-free;
  it runs before L11's manifest finalization and before a fixture map, target,
  preflight, freeze, check, seed, cleanup, or measurement can be requested.
  L01's tests never import this L02 registry/helper, so the gate does not create
  a reverse ownership dependency.
- **Lane boundary:** `database-query-baseline.test.ts`,
  `task551DatabaseBaseline/digestContract.test.ts`,
  `task551DatabaseBaseline/reviewedPairPersistence.test.ts`, and
  `task551DatabaseBaseline/runnerLifecycle.test.ts` validate only static
  contract behavior with fakes/mocks; `fixtureTarget.test.ts` uses the same
  rule for its injected proof client. They never execute a fixture operation.
  Any requirement below that needs a real preflight, seed, cleanup, `VACUUM`,
  calibration, measurement, pool saturation, freeze, check, or DB3 observation
  belongs to the L11-dispatched `--freeze`/`--check` fixture-operation evidence
  path, not to the default test commands. The default lane proves those branches
  using poison environment values, fake clients, and no-connect assertions; it
  must remain safe with `.env` present. `fixtureTarget.test.ts`,
  `reviewedPairPersistence.test.ts`, and `runnerLifecycle.test.ts` participate
  only in default-Bun/finalization or capability validation: L11 rejects an
  isolated child map, isolated receipt, or profile-evidence association for each
  of them.
- **Focused capability/materialization prerequisites:** after the preceding
  `fixture-target-static-test`, run
  `bun test tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts`
  and then
  `bun test tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts`.
  Both DB-free focused commands must pass before L11 accepts the L02
  capability/materialization barrier. They are default-Bun static validation
  only, never isolated profile-evidence commands, and do not alter L11's exact
  four-test pre-classifier evidence command.
- `reviewedPairPersistence.test.ts` owns the active-v2 receipt matrix and the
  two pure normalizers: the exact absent sentinel and three legal state-receipt
  edges, canonical transition-ID binding, reviewed attestation sequence/ID,
  all receipt own keys/versions, archive/bootstrap/closure bindings,
  duplicate/replayed or skipped transition IDs, code/archive/state drift,
  unsafe parent/state/lock/temp paths, cleanup on success/throw, and no archive
  write. `runnerLifecycle.test.ts`
  owns refusal before migration and the zero-later-check result for every bad
  receipt/attestation or illegal edge; neither adds a Bun test path.
- **CLI transport boundary static contract:** the existing DB-free,
  finalization-only
  `tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts` also owns a
  source/AST contract that proves the runner has exactly
  one `process.env` and one `process.argv` access, both lexically contained by
  the real `if (import.meta.main)` wrapper; imports, `main`, the runner helpers,
  target seam, digest contract, fixtures, and every default-Bun test have none.
  It must also pin the wrapper's single name-only child-key pass before every
  fixture-value read, the exact three-key fresh-map construction and
  `assertTask551FixtureTargetChildKeys` call before target parsing/client
  creation, and an explicit argv-plus-fresh-map call into an injectable
  runner/main seam. It also proves the two transport helpers are module-private
  and the guarded wrapper is their sole production caller. The static test does not execute the guarded wrapper,
  `runCliEntryFromL11ChildProcess`,
  `snapshotL11InjectedFixtureTargetForCli`, or a fixture CLI child, and it does
  not read process environment/argv itself. It must reject source wiring that
  reads a generic/DB3 value, imports dotenv, uses `Bun.env`, spreads or merges a
  process map, copies an OS value, passes a process map to main, logs a
  transport value, or admits a mode beyond `--freeze`/`--check`.
- L11 workflow launch tests, not this DB-free L02 suite, capture the real-child
  launch descriptor and require an argv array with no shell/string wrapper,
  literal second `--env-file=/dev/null`, and an exact-own `childEnv` made from
  three `fixtureValues` plus only defined OS allowlist keys. They reject a
  missing/relocated flag, inherited key, prototype key, merged ambient map, or
  L03 confirmation value in L02/05-L02 before `Bun.spawn`.
- The same source/AST contract must use only non-secret synthetic key names and
  fake parser/client symbols to pin the fail-before-target control flow: an
  absent or non-own fixture member, direct `DATABASE_URL3`, `DATABASE_URL`, or
  `DATABASE_DIRECT_URL`, an extra `DATABASE_*`,
  `TASK551_FIXTURE_BOOTSTRAP_*`, `TASK551_FIXTURE_*`, or other `TASK551_*`
  name, and any non-OS extra child key are rejected during transport validation.
  Its control-flow assertions model getter/proxy poison canaries and require no
  property-access node for a forbidden/OS value plus exactly one admitted-value
  access per fixture key beneath the successful name-pass branch. The produced
  map has exactly the three literal own keys and no OS/inherited member. These
  assertions remain pure/static: no test starts the real entry adapter, loads
  dotenv, parses a live target, or creates a database client.
- L11 evidence tests require exactly two isolated static-test receipts for every
  L02 profile/evidence chain: one zero-exit/no-skip receipt for
  `database-query-baseline.test.ts` and one for `digestContract.test.ts`.
  Missing, duplicate, substituted, skipped, or cross-chain receipts fail the
  chain. Each corresponding child is non-inherited and has no generic/fixture
  database value or target; the test process receives no profile or target input.
  `reviewedPairPersistence.test.ts` and `runnerLifecycle.test.ts` are not
  isolated receipt producers and receive neither an isolated map nor a
  profile-evidence association.
- **Cross-phase source lifecycle:** L11 workflow tests, not any default L02
  suite, must prove this exact order: L01 initial gate; durable redacted L03
  evidence after the initial L03 source/map has been destroyed; L02 database-free
  static gates (including the focused reviewed-pair and runner-lifecycle
  prerequisites), manifest finalization, and the two isolated static receipts;
  then a newly consumed author-audit opaque broker bound to one
  `{ phase:"l02", operation:"freeze" | "check" }` tuple; then the fixture
  operation. The L03 evidence may be asserted only as a prerequisite. Tests must
  reject any retained, reused, reconstructed, inspected, or mapped initial-L03
  source/map; reject a broker bound to L03 or 05-L02 before any raw-value read;
  and prove L11 creates exact three-key L02 `fixtureValues` only from the fresh
  broker-derived values plus literal `coderso02`, then a separate OS-augmented
  exact-own `childEnv`.
- Default-lane isolation tests run each named static suite with distinct poison
  `DATABASE_URL`, `DATABASE_DIRECT_URL`, and three-key fixture/DB3 canaries plus
  a present `.env` fixture. They assert zero generic/fixture environment reads,
  zero target-parser/preflight/seed/cleanup/measurement calls, and zero
  client/driver/network connection attempts; a fake connection factory throws
  if reached. They never execute the guarded CLI wrapper or
  `runCliEntryFromL11ChildProcess`. A separate L11 workflow command-boundary
  test, not either default suite, attempts a direct non-L11 `--freeze`/`--check`
  path without L11's exact three-key submap (but with generic DB3 canaries) and
  proves it fails before target parsing or client construction. The only supported
  test path permitted to inject a live fixture client is the L11 fixture-operation
  dispatcher, so a DB3 operation cannot occur from the default lane, ordinary
  gates, or a supported direct runner path lacking the exact map; this test makes
  no claim about an equally privileged process independently supplying non-secret
  valid values outside workflow provenance.
- The fixture-target unit tests use injected fakes to model only L11's exact
  three-value child interface and reject missing/malformed fixture values or any attempted
  `DATABASE_URL`/`DATABASE_DIRECT_URL` fallback, `process.env`/dotenv access,
  every database name other than literal `coderso02`, mismatched database
  identity, absent/duplicate/mismatched sentinel, and every output path that
  would expose target identity or a sentinel. They prove the target seam itself
  neither enumerates nor constructs, inspects, persists, hashes, or logs a
  parent/child environment. L11's workflow tests own construction of the
  non-inherited child map, its no-dotenv launch, and the canonical second-argv
  `--env-file=/dev/null` receipt requirement; the L02 runner source contract
  independently pins its own one-wrapper transport rejection before the seam
  can parse a target. Traced preflight and post-cleanup fakes require the sole
  expected-database argument to be `coderso02`; runner adapter integration pins a parameterized
  `current_database() = $1::text` proof with that bind in both paths, never an
  interpolation or caller-selected name. The L02 tests prove target failure would
  stop before schema work, seed, `VACUUM`, or cleanup, and prove L02 cannot
  create or repair the L03-owned sentinel. The L11-dispatched fixture-operation
  evidence, not these default tests, proves for both profiles that a successful
  `--check` has completed the rolled-back current-database/coderso02 and
  exact-single-marker/bound-sentinel-byte proof before any scenario work, emits exactly one canonical
  `coderso.task551.database-baseline-check@v1` stdout line with the fixed
  closed keys/values and independently recomputable
  `manifestScenarioResultDigest`, and has empty stderr. Failure tests prove
  stdout is silent, no structured success record is emitted, and stderr is
  exactly `database_baseline_invalid\n` with no target-derived name/hash, URL,
  user, sentinel, bind, scope/scope digest, raw output, context/config,
  platform/duration, or error cause.
- `tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts` imports the seam
  directly and proves its source imports neither
  `scripts/task-551-database-baseline.ts` nor a database/runtime/environment or
  dotenv module. It passes a purpose-built three-key object, never `process.env`
  or an L11 parent map, and rejects every extra/missing/inherited/non-string
  member, `DATABASE_URL`, `DATABASE_DIRECT_URL`, bootstrap key, dotenv-shaped
  fallback, and all malformed direct URL/name/sentinel values, including every
  direct name other than `coderso02`. A successful injected client must observe
  exactly one fresh read-only transaction and one rollback, with the expected
  database name fixed to `coderso02`, then receive only the four literal-true
  redacted proof booleans. The normal post-cleanup API repeats the same
  parameterized proof bound to `coderso02` and rollback behavior after a
  completed cleanup.
  For zero/partial/full cleanup, mismatch/zero/two marker,
  changed sentinel byte, driver-read, begin, and rollback failures, the
  post-cleanup API still attempts the rollback where a transaction exists,
  returns no proof or target value, and throws only `database_baseline_invalid`
  without a cause/raw driver detail. This suite is default-Bun/finalization-only:
  it rejects any isolated L11 receipt/map/profile-evidence invocation. Runner
  integration tests prove both L11 fixture-operation preflight and nested-finally
  calls use these imported APIs; L05's focused tests import the exact seam rather
  than the runner or a duplicate parser.
- The focused digest-contract tests import
  `scripts/task551DatabaseBaseline/digestContract.ts` without a database,
  environment, filesystem-module, or runtime-adapter dependency and pin RFC
  8785 UTF-8 bytes plus independently recomputed `contractDigest`, `fixtureDigest`,
  `schemaDigest`, `runnerDigest`, and `manifestScenarioResultDigest` for both
  profiles and both selector forms. They reject an unknown/unlisted runner source
  path or hash, an unlisted executable helper, a catalog row/value/target/URL/
  sentinel/check-expression/index-predicate field, duplicate metadata name, or
  a catalog projection that differs from the checked-in required projection.
  They pin that the four static digests do not change with profile/selector and
  that only manifest-result digest does. They also reject a cryptographically
  correct L02 digest rendered in an otherwise valid but wrong format, including
  uppercase hex or a `sha256:` prefix, and reject a parsed-schema-equivalent
  stdout line whose whitespace, key order, escaping, LF framing, or second line
  is not the exact RFC 8785 canonical byte representation. The same pure parser
  remains L02-internal; it must not grow a separate verifier. The
  suite also pins `computeTask551ReviewableReceiptDigest` with a complete
  persisted receipt: a capturing injected `sha256Bytes` receives exactly the
  RFC 8785 UTF-8 bytes with only `reviewState` and the own digest absent, all
  four static digest fields and every finite ceiling present, and no target/env/
  row/value field. It rejects each missing/unknown/static field, duplicate or
  reordered statement ceiling, non-finite/sentinel ceiling, invalid pool
  capacity, malformed one of the five receipt digests, and a right-shaped
  receipt carrying a different valid lowercase `reviewableReceiptDigest`.
  The runner-focused path and L02 transition path must each pass the same
  complete parsed receipt and injected SHA-256 implementation to this one
  helper; their captured hash input bytes and exact lowercase result must
  byte-match. L11 tests receive only the transition result or predecessor-parser
  result and may not reproduce the projection or hash locally.
- The same default-Bun `digestContract.test.ts` owns the pure reviewed-candidate
  transition suite. With an injected deterministic `sha256Bytes`, it builds an
  input from one strict just-frozen `small` and one strict just-frozen `large`
  candidate, then accepts only a result carrying the literal
  `coderso.task551.l02-owner-capability-receipt@v1` redacted
  `capabilityReceipt`, exact candidate canonical digests, and an exact
  reviewed pair. It pins that the complete canonical
  candidate bytes transform to the reviewed bytes only by the one
  `reviewState:"candidate"` → `reviewState:"reviewed"` token change, while the
  persisted reviewable self digest remains valid and equal. It has one negative
  case for each changed canonical semantic field (including each nested ceiling
  family and context/static-digest group), wrong/missing/duplicate/reordered
  profile, inner/outer profile disagreement, candidate replay through a
  different input digest, a candidate result, a reviewed input, missing/extra/
  inherited/`undefined`/defaulted member, malformed/self-mismatched canonical
  digest, and absent/wrong redacted reviewed-transition receipt. The test proves
  the builder never trusts a supplied candidate digest and the assertion neither
  mutates either value nor imports/reads a file, database, environment, process,
  clock, target, or runtime adapter.
- `reviewedPairPersistence.test.ts` exclusively owns the runtime transition and
  private owner-host-seam lifecycle tests. Through its owner-local private
  implementation harness only, it exercises the accepted snapshot reader, atomic
  writer/post-write reader, and same-realm owner-host wrapper; it proves install
  precedes one `invokeWorkflow` call, that callback receives no
  channel/decision/approval, and `finally` revokes/resets the host/ingress seam on
  success and throw. It separately proves the emitted runtime
  `const Symbol(...)` brand cannot be supplied by a cooperating caller without the
  module-private reference (not a cryptographic or hostile-process non-forgeability
  claim), default absent or denied ingress fails closed, and
  `ownerReviewChannel.review` is called exactly once only after the lock re-read
  and exact accepted-snapshot/small/large triple validation; the sealed bounded-
  lifetime triple is minted/consumed/revoked wholly inside that lock. L11 has no declared/importable supported path to the
  harness, ingress, factory, or capability. It proves the non-declared registration hook
  accepts one already validated digest, rejects pending replacement, stale
  generation and replay, and is neither declaration nor runner exported. It
  proves the public transition accepts exactly the closed three-digest request,
  rejects a Git HEAD substitute, and consumes registration, approval, factory
  issue, and factory consume only inside the synchronous writer/re-read lock. A
  success atomically advances/re-reads only the active v2 reviewed pair and returns only v1
  `capabilityReceipt`; every fixed error is redacted. It also invokes every
  legacy runtime authority export and runner re-export, asserting the fixed
  migration code before any I/O/issue/consume/write. `runnerLifecycle.test.ts`
  is not extended. A separate L11 boundary test records registration then one
  transition call and proves zero direct factory/issue/consume/capability/nonce/
  current-receipt/ingress/child/spawn access.
  Its command-order fake proves both freezes finish, then the L02 transition and
  pure assertion pass, before `--check small` or `--check large` can dispatch;
  any transition/read/write failure returns its fixed
  `l02_owned_reviewed_transition_*` code, starts zero checks, and creates no
  durable L02 or L11 evidence.
- Sentinel-preservation tests pin `public.task551_fixture_sentinel` as a
  preserve-only L03 table. They reject its schema-qualified and bare spelling
  in every manifest closure/support/count/key-predicate and lifecycle-ledger
  descriptor before any write. A traced execution permits the table only in the
  rolled-back read-only pre/post target proofs; no seed, assertion, delete, or
  cleanup query may name it. For normal success and injected zero-ledger,
  partial-seed, full-seed, assertion, measurement, and cleanup failures, tests
  prove cleanup attempts exact owned-row/residue handling and then invokes the
  parameterized post-cleanup proof of `current_database() = $1::text` bound to
  `coderso02`, exactly one marker, and byte-identical configured sentinel. An
  absent, duplicate, or changed marker/
  sentinel fails closed and blocks the next scenario or success record.
- Manifest tests reject an unknown field, duplicate ID, incomplete minimum
  closure/support table, missing expected-count derivation, arbitrary-SQL owned
  key predicate, or unknown equality class. They pin 32 and only 32
  `admin-shape` entries in equality, explicit supplemental public-html/retention
  entries outside it, and the one deferred TASK-489 entry outside executable
  selection.
- Every executable scenario in L11 fixture-operation evidence has one explicit
  target plus a complete minimal dependency closure. The CLI rejects omitted selector, both selectors, an
  unknown scenario, or deferred TASK-489 execution; `--all` runs only executable
  manifest entries sequentially and instrumentation proves no next seed starts
  until the previous closure's exact child-first cleanup and per-table zero-
  residue proof finish. Inject failures before seed and after zero/first/middle/
  final successful batches, count assertion, and measurement; each must prove
  the mutable ledger recorded only completed owned batches/ID predicates, then
  performed exact actual deleted/retained-count cleanup and zero-residue proof,
  followed by the rolled-back unchanged-one-marker/sentinel-byte proof.
  Cleanup/proof failures must propagate unsuppressed and block the next scenario;
  the preservation proof still runs if cleanup itself throws.
  A fixed test scope may not collide with a concurrent random scope.
- Every matrix family matches its exact small/large count and relationship
  recipe; off-by-one seeds or residual derived IDs fail.
- Assert the exact status/visibility/role/tag/MIME/filter/search distributions,
  equal-sort groups, and publication exclusions above before any warmup. Mutate
  one ordinal bucket or searchable token and prove pre-measurement validation
  fails rather than freezing a different plan. Role assertions require one
  primary assignment for every user and one distinct additional assignment only
  for ordinals divisible by ten. Search assertions compare each profile/family
  to the literal integer table through `expectedSearchHits`, including one-hit,
  hidden-zero, and miss-zero cases; no percentage-derived expectation is legal.
- Pin the seven index-evidence fixture cases independently: page author 0 returns
  exactly 5/10, entry author 0 `20/10`, entry `(type 0,author 0)` `1/1`, post
  author 0 `10/10`, role 1 `30/3,000`, the one-element post containment array
  `100/10,000`, and the sorted unique media AND array `20/1,000`. Mutating the
  author/type formula, author cycling, role direction, tag spelling/order/
  deduplication, or second-tag ordinal fails fixture validation before capture.
- Pin webhook list/event/delivery and page-latest-autosave evidence independently:
  list totals `20/200`, event 0 `2/20`, parent deliveries `250/500`, and latest
  autosave exactly one from the 20/100-version parent with no document-wide read.
- Pin the five formerly missing retention-family scenarios, their literal
  eligible/boundary/anchor counts, batch edges, child ordering, and dry-run zero-
  mutation behavior. Mutating one timestamp/status/anchor or omitting a policy
  family from the budget registry fails before measurement.
- Pin the TASK-489 predecessor registry's 10,000/1,000,000 bulk count,
  109,890 bounded-support count, and 119,890/1,109,890 exact scenario totals;
  every 0/1/511/512/513 relation shape; the 513-item detail sentinel; and five
  exact companion IDs/fourteen logical cases/fifteen statements/thirty scale
  receipts. They pin the single strict
  `coderso.task551.task489-predecessor@v1` schema, all eight ordered
  `fixtureCounts` fields, the companion-first 14-case/15-statement flattening,
  the array-only statement receipt representation, and exactly `[small, large]`
  results per statement. Factory/parser tests require canonical RFC 8785 bytes
  plus one LF and reject a map/keyed object, a reordered/extra/missing member,
  a wrong profile order, invalid metric/digest, or a noncanonical byte-equivalent
  receipt. The L02 test is static-only for this predecessor portion: it rejects
  `owner_run_id`, a JSON owner predicate, actor/unsafe projection, random
  distribution, broad item seed, missing detail statement, sixth ID, or
  inclusion in the closed TASK-551 37-ID registry, but never assumes the
  post-05 normalized support tables exist or dynamically executes an L05 plan,
  receipt, fixture, or cleanup. TASK-551-05-L02 owns the later schema-present
  dynamic seed, safe projection, plan, cleanup verification, and sole temporary
  file write. L11's workflow test alone feeds that temporary byte sequence to
  `parseTask489PredecessorReceiptV1`, rejects a malformed/noncanonical/digest-
  mismatched artifact, records the exact lowercase hash, and proves the durable
  `_docs/_workflows/_smoke/task-551/audit-evidence/task489-predecessor-v1.json`
  bytes are byte-identical to the validated temporary bytes. L10/TASK-489 tests
  accept only that durable L11 path plus recorded hash, reject a temporary-path
  read, local parser/schema/shape, reconstruction, reserialization, or hash
  mismatch, and require SHA-256 verification before the direct call to the sole
  L02 `parseTask489PredecessorReceiptV1` on the exact durable bytes.
- Pin `public-html-dependencies-128`, including exact tuple/table split, root and
  canonical-byte caps, one aggregate result/statement, projection allowlist, and
  129/16,385/102 rejection cases.
- L11 fixture-operation evidence runs representative
  point/list/search/aggregate/append families and records current baseline
  separately from target budget; default tests exercise only the corresponding
  static contracts.
- L11 fixture-operation evidence alone saturates this harness's exact-capacity
  `2/10` pool and freezes acquisition-wait p50/p95/p99 without inspecting
  postgres.js internals or logging SQL/binds. Default tests use fakes to reject
  `capacity + reserve`, an inherited capacity, or a second measurement client.
- Prove a deliberately unbounded fixture query fails the rows/query-count gate,
  and independently prove failures for each of query count, rows read, rows
  returned, transferred bytes, shared buffers, normalized p50, normalized p95,
  and normalized p99. The pool case exercises the same eight-field validator.
- L11 fixture-operation evidence, not the named default perf test, runs exact
  3 × (5 warmup + 30 sample) measurements and rejects `p95SpreadPercent` above
  20% or normalization outside `0.80..1.20`.
  The spread denominator is the median repetition p95 floored at `0.1 ms`; three
  exact zero p95 values yield `0%` rather than division by zero.
- Default freeze-contract tests pin formula/rounding, all 528 finite numeric
  ceiling assertions, canonical UTF-8 digest inputs/exclusions, and a synthetic
  persisted sanitized context/calibration receipt. They prove `reviewState` and only the own
  `reviewableReceiptDigest` field are excluded from the reviewable-digest
  payload; every other accepted receipt byte changes the digest. They prove a
  candidate is re-verified after self-digest attachment, a reviewed receipt
  rejects a right-shape/wrong-self-digest value, and candidate-to-reviewed
  changes no persisted byte except `reviewState`. The L11 fixture-operation
  `--check` cannot rewrite or derive a ceiling and, after safe preflight,
  rejects an unreviewed, stale, digest-mismatched, context-mismatched, or
  out-of-factor receipt while permitting a reviewed final HEAD that differs
  because review validity is bound to the accepted immutable worktree snapshot,
  not Git HEAD. The check-output
  tests distinguish this active v2 freeze receipt from ephemeral stdout: L02
  persists no command evidence, while TASK-551-11 can verify the one success
  line's receipt/static digests and redacted command receipt without reading
  target data.
- With the frozen operation clock, assert the literal small/large counts
  `rollingSevenDays=500/25_000`, booking `today=400/20_000`,
  `upcoming=1_000/50_000`, and `pastOrCurrent=1_000/50_000` in UTC, New York,
  and Tokyo.
  Mutating either exception back to the general January 1 timestamp rule must
  fail before summary/plan measurement.
- Assert exact 32-member ID/set equality across planned inventory, canonical
  statement templates/digests, fixture scenarios, fingerprint keys, and numeric
  budgets. Re-serialization and UTF-8 byte/digest comparison are exact; this is
  a static L02 contract, while TASK-551-03-L02 later compares landed production
  builders. L02's pre-02 gate validates the complete static set and receipts;
  TASK-551-05-L02 exercises every shape at both scales after schema availability.
  A missing profile, non-finite ceiling, wrong canonical projection/order/
  predicate/bound, filtered count, or unowned supporting table fails the owning
  pre-dispatch gate rather than claiming absent production SQL is executable.
- A filtered three-page fixture pins `matchingTotal:null`, bounded `items`, exact
  `hasMore`, zero filtered-count statements, and byte-identical fixed summary
  plus facet bytes versus the unfiltered first/middle/last snapshots.

## Security Contract

- No routes or product writes beyond isolated test fixtures.
- Existing protected route auth/RBAC/CSRF/rate limits remain in force when route
  measurement is used.
- Reject unknown CLI/profile/scenario fields and clamp row/sample/time limits.
- Database targeting is fixture-only: accept only the three named
  `TASK551_FIXTURE_DATABASE_*` values, require the name to equal literal
  `coderso02`, and require rolled-back parameterized
  `current_database() = $1::text` proof bound to that literal plus the
  L03-owned preserve-only one-row sentinel proof before every connection can
  seed. The L11 workflow is the only supported dispatcher for this leaf's
  fixture-target operations (`--freeze`, `--check`). The later dynamic 05-L02
  phase is a separate leaf and may use only
  its four independent `05-l02` broker contexts, never this L02 broker/map. L11
  dispatches this leaf only in this order: L01 initial
  gate; current durable redacted L03 evidence after the initial L03 source/map
  has been destroyed; L02's database-free static gates and manifest
  finalization including the required isolated static receipts; one fresh
  author-audit broker bound to the L02 fixture operation; and finally the
  operation. Durable L03 evidence is a prerequisite, never a source, value, map,
  reconstruction input, or fixture authority. L11 validates the broker-bound
  L02 phase/operation before reading values and maps only its URL/sentinel plus
  literal `coderso02` to three `fixtureValues`, then to an exact-own OS-augmented
  `childEnv`; it never loads/parses/sources dotenv or inherits `process.env`.
  It must never retain, reuse, reconstruct, or map an L03 source/map into L02.
  Each such operation's Bun argv has the
  literal second element `--env-file=/dev/null`, which L11 binds only through the
  fixed registry's raw lowercase-64-hex logical-argv descriptor in its receipt.
  Default static tests and lint/perf gates are excluded: they
  receive no target map, cannot read generic or fixture database state, and
  cannot open a DB3 connection. The two mandatory isolated static evidence
  reruns are also database-free and target-free; `fixtureTarget.test.ts` remains
  default-Bun/finalization-only with no isolated map or receipt. L02 never
  provisions the sentinel, loads `.env`, falls back to generic runtime/direct
  URLs, or lets a runner/seam/import/test inspect or construct a parent
  environment. The sole exception is the guarded real CLI wrapper's one
  name-first snapshot of L11's already non-inherited child map: it accepts only
  the three fixture names plus the fixed OS allowlist, copies only a fresh exact
  three-key map into injected main, and rejects generic/DB3/unknown names before
  target parsing. It never logs, merges, spreads, retains, or forwards
  `process.env`, reads `Bun.env`, or creates a fallback path. These are
  fail-closed workflow provenance/input checks, not a cryptographic identity or
  OS-authentication claim against an equally privileged local process that can
  independently reproduce non-secret values; no fixture secret/capability is
  transported to the child.
- The L01-to-L02 Admin projection comparison is a preceding static-only
  fail-closed gate. Its only cross-owner runtime-value import is the named
  immutable projection into `database-query-baseline.test.ts`; the L02 helper
  accepts it structurally and does not import L01 from the runner, target seam,
  digest contract, or template serializer. It has no database/client/network or
  filesystem-adapter import, environment/`process.env`/`Bun.env`, dotenv,
  target, or CLI input.
  Closed own-key validation and explicit field mapping reject missing, extra,
  duplicate, inherited, sparse, `undefined`, or defaulted semantic values before
  any map lookup; no serializer, digest, or template can mask that failure. L01
  never imports or asserts the L02 registry, preserving the one-way handoff and
  preventing an unaudited reverse test dependency.
- Synthetic data only; no fixture URL, database/user identity, sentinel, SQL
  binds, PII, row bodies, target-derived name/hash, raw scope/scope digest,
  runtime context/config, platform detail, duration, or error cause in output,
  receipts, snapshots, or sidecars. A successful `--check` may write only the
  exact one-line schema record above after preflight and scenario completion;
  failure stdout is silent and failure stderr is only the stable redacted code.
- L02 owns only the separate active v2 state/fixture paths. Before every active
  read/write its private store checks the L04 bootstrap identity plus regular,
  non-symlink archive/state paths and the pinned archive SHA-256; it rejects a
  stale/mixed/unknown state, partial pair, reset, reviewed overwrite, or archive
  mismatch before any fixture check. The historical `freezeReceipts.ts` archive
  is never writable. L02 never persists `--check` stdout or command evidence;
  TASK-551-11 alone captures, validates, and durably records the redacted
  command receipt plus the ephemeral success line. The L02 store alone reads
  archive/active bytes; it returns only the strict in-memory sanitized
  transition receipt or reviewed-state attestation. L11 holds/rebases only
  digests and fixed literals, never a raw byte, path-derived value, or durable
  copy of that state data.
- The reviewed-candidate pause is fail-closed and L02-owned. After both freeze
  commands and before either check, L11 registers its independently validated
  immutable `worktreeSnapshotDigest` through the non-declared facade hook, then
  calls only `runL02OwnedReviewedTransition` with that digest and two redacted
  candidate canonical digests. L02
  itself re-reads the just-frozen active-v2 sanitized pair, verifies its private immutable
  snapshot binding and exact three digests under lock, calls
  `ownerReviewChannel.review` once, then mints/consumes its sealed approval and module-private
  capability within the atomic write advancing only the exact active pair to
  `reviewed`.
  The pure digest-contract builder and assertion validate strict canonical
  inputs/results but have no file, database, environment, process, clock,
  target, approval, or write authority. TASK-551-11 never receives or imports a
  factory, capability, nonce, current receipt, or approval adapter; it reduces
  only the returned redacted result to evidence. It may not write a receipt,
  treat the public literal as approval, choose a candidate, or start a check
  without the exact two-profile result. The literal is an audit identifier,
  never a credential or a substitute for the L02 owner decision.
- `digestContract.ts` is import-safe and pure: it owns only versioned static
  schemas, sanitized catalog metadata, RFC 8785 byte canonicalization, exact
  lowercase-hex validation, selector normalization, and digest computation over
  explicit non-secret values. L02 reads it and the listed checked-in source
  bytes within its private digest closure; neither L02 nor its L11 handoff may
  pass a target, live catalog, URL,
  sentinel, row/value, environment, or runtime adapter into the integrity
  evidence path.
- `public.task551_fixture_sentinel` is preserve-only: it is forbidden from the
  manifest, owned-key predicates, ledger, and all mutation/cleanup paths. After
  every success or zero/partial/full failure cleanup, a separate rolled-back
  target proof must still parameterized-confirm `current_database() = $1::text`
  bound to `coderso02`, exactly one marker, and byte-identical configured
  sentinel before later work or command success.
- A per-table ledger starts before seed, records only owned batches/ID predicates,
  drives zero/partial/full child-first cleanup, runs the sentinel-preservation
  proof even if cleanup throws, and propagates exact cleanup/residue/proof
  failure to block later scenarios without fixture-data output.

## Validation Commands

- **First L02 static-phase prerequisite:** after L01's initial
  `bun scripts/task-551-query-inventory.ts --check --phase initial` gate has
  passed and its immutable projection is present, run
  `bun test tests/perf/database-query-baseline.test.ts`. This command must invoke
  `assertExactAdminShapeProjection` over the imported L01 projection and the
  L02-owned raw shape/template/digest registry, prove the exact bidirectional
  32-member tuple contract, and fail on every missing/extra/duplicate/defaulted/
  mismatch case. It is a DB-free, target-free, environment-free prerequisite to
  the L11-owned `bun scripts/bun-lane-classify.ts` manifest finalization, all
  isolated evidence reruns, and every fixture-target `--freeze`/`--check`
  operation. It does not run the inventory CLI itself or make L01 import the L02
  registry.
- The remaining default-Bun static lane is runnable by a developer or ordinary
  CI without L11, a fixture map, or `--env-file`:
  `bun test tests/perf/task551DatabaseBaseline/digestContract.test.ts`,
  `bun test tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts`,
  `bun test tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts`,
  and `bun test tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts`.
  Together with the preceding projection gate, these tests are mock/static-only
  and must make zero database connections even when `.env`, `DATABASE_URL`,
  `DATABASE_DIRECT_URL`, or all three fixture variables are present. The same
  `fixtureTarget.test.ts` command includes the runner source/AST transport
  contract but never executes its guarded entry wrapper or fixture CLI adapter.
  The reviewed-pair command must precede the runner-lifecycle command; both must
  pass before L11 accepts the L02 capability/materialization barrier. The focused
  L11 workflow contract test must assert the full order `L04 closure/adaptation ->
  L02 code/test materialization closure -> L02 single/subgates -> final L02 leaf
  closure after check-small/check-large`; neither
  command is an isolated profile-evidence rerun or receipt producer, and neither
  changes L11's exact four-test pre-classifier evidence command. The ordinary
  non-fixture default lane also runs
  `bun --cwd core lint:types`, `bun --cwd core lint`, and
  `bun run gates:coderso:perf`; none may invoke the fixture runner, receive a
  fixture client, parse a target, or read generic/fixture database state.
- For every L02 profile/evidence chain, L11 must run both isolated static
  evidence commands and capture their separate zero-exit/no-skip receipts:
  `bun --env-file=/dev/null test tests/perf/database-query-baseline.test.ts` and
  `bun --env-file=/dev/null test tests/perf/task551DatabaseBaseline/digestContract.test.ts`.
  Each receives a separate explicit non-inherited static map containing no
  generic/fixture database value or target. Those mandatory receipts do not
  change the database-free/default-lane contract, do not require a target
  preflight, and do not make a map visible to test behavior.
  `fixtureTarget.test.ts`, `reviewedPairPersistence.test.ts`, and
  `runnerLifecycle.test.ts` are not rerun here: they remain default-Bun
  finalization/capability validation only and L11 rejects any isolated receipt or
  map for them. Those two reruns are themselves ordered after the preceding
  L01-projection static gate and remain target-free; their execution cannot
  substitute for the required default-gate comparison before manifest
  finalization.
- Fixture-target operations are the only supported L11 child dispatches that
  receive a fixture child map. Their exact prerequisite order is the L01 initial inventory gate;
  current durable redacted L03 evidence, after L11 has destroyed the initial L03
  source/map; L04's focused DB-free closure and L11's source-free non-durable
  provenance gate; L02's database-free default static gates (projection, digest,
  fixture-target, reviewed-pair persistence, and runner lifecycle), L01-owned
  manifest finalization, and required isolated static receipts; then a separately
  fresh author-audit opaque broker bound to one L02 fixture operation; then one
  fixture operation. Durable L03 evidence is the sole L03 cross-phase
  prerequisite and never grants fixture authority or supplies a source, value,
  map, reconstructor, or mapping input. Before reading values, L11 validates the
  broker's one `{ phase:"l02", operation:"freeze" | "check" }` binding; an L03
  or 05-L02 binding fails before consumption. It validates only the broker-derived
  L02 values, rejects generic URL aliases, caller-selected database names, and
  unknown `TASK551_*` names, then discards the raw source. L11 must never retain,
  reuse, reconstruct, or map an L03 source/map. In memory only, it maps the L02
  URL and sentinel plus literal `coderso02` to three `fixtureValues`, omits
  confirmation, and never loads/parses/sources dotenv. At the fixture child
  boundary it builds a separate exact-own `childEnv` from those values plus only
  defined `PATH`, `TMPDIR`, `LANG`, `LC_ALL`, and `TZ`, rejecting every other key
  and all inherited keys. Supported workflow provenance forbids an operator or
  L02 runner/seam/import from manually exporting, sourcing `.env`, inspecting,
  or constructing that environment; it does not assert that an equally privileged
  local process reproducing non-secret values cannot invoke code independently.
  The sole guarded CLI wrapper only name-validates and copies its three direct
  fixture values as specified above. Each fixture-operation canonical Bun argv is an array, never
  a shell/string wrapper, and has `"bun"` followed immediately by
  `"--env-file=/dev/null"`; L11 rejects a receipt whose fixed raw lowercase-64-hex
  logical-argv descriptor omits, replaces, or moves that literal flag, while continuing to omit
  all environment assignments.
- Produce one candidate freeze sequentially per executable L02 manifest entry
  (`--all` excludes deferred TASK-489 dynamic execution):
  `bun --env-file=/dev/null scripts/task-551-database-baseline.ts --freeze --profile small --all` and
  `bun --env-file=/dev/null scripts/task-551-database-baseline.ts --freeze --profile large --all`.
  The command stream must then pause before either check. After independently
  validating the L01 snapshot, L11 uses only the non-declared facade hook to
  register its immutable `worktreeSnapshotDigest`, then calls only
  `runL02OwnedReviewedTransition` with that digest and the two redacted canonical
  candidate digests.
  L02 re-reads the `ready-for-review` active-v2 pair, rejects a snapshot/digest/profile
  mismatch, validates the exact three-digest request under lock, calls
  `ownerReviewChannel.review` once, then mints/
  consumes/revokes the sealed approval for the complete
  `task551DatabaseBudgets.ts` numeric/context diff and creates/issues/consumes its
  private capability inside the atomic transition, changes only
  `reviewState:"candidate"` to `reviewState:"reviewed"`, validates the result
  with `assertExactTask551ReviewedCandidateTransition`, and atomically advances
  only the active v2 state to both reviewed receipts. L11 receives only the redacted result; it has no
  factory/capability/nonce/current-pair access and does not reconstruct a pair
  or compare receipt bodies. A missing transition, denied review, stale/replayed
  candidate, one-profile result, wrong transition receipt, changed byte, or
  digest mismatch is a hard stop with zero check dispatches. Only then run, in
  order:
  `bun --env-file=/dev/null scripts/task-551-database-baseline.ts --check --profile small --all` and
  `bun --env-file=/dev/null scripts/task-551-database-baseline.ts --check --profile large --all`.
  Each successful command must have exactly one ephemeral success line and
  empty stderr; failures must have silent stdout and only the redacted failure
  code on stderr. TASK-551-11, not L02, captures that stdout and a command
  receipt without environment assignments but with the literal env-file argv
  flag, validates every fixed field/digest against the reviewed contracts, and
  writes the durable audit evidence.
- Run exactly this DB-free static per-file gate; it fails for a missing path or
  any individual file over 1,000 physical lines, rather than reporting an
  aggregate total:

  ```sh
  bun --env-file=/dev/null -e 'const paths=["scripts/task-551-database-baseline.ts","scripts/task551DatabaseBaseline/catalog.ts","scripts/task551DatabaseBaseline/digestContract.ts","scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts","scripts/task551DatabaseBaseline/fixtureTarget.ts","scripts/task551DatabaseBaseline/fixtureValidation.ts","scripts/task551DatabaseBaseline/metrics.ts","scripts/task551DatabaseBaseline/postgresTransport.ts","scripts/task551DatabaseBaseline/receiptContract.ts","scripts/task551DatabaseBaseline/requiredSanitizedCatalogProjection.ts","scripts/task551DatabaseBaseline/reviewedPairPersistence.ts","scripts/task551DatabaseBaseline/reviewedPairReceiptSource.ts","scripts/task551DatabaseBaseline/reviewedPairTransition.ts","scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts","scripts/task551DatabaseBaseline/runner.ts","scripts/task551DatabaseBaseline/runtimeProvenance.ts","tests/perf/fixtures/task551DatabaseScale.ts","tests/perf/fixtures/task551DatabaseBudgets.ts","tests/perf/fixtures/task551AdminReadStatementShapes.ts","tests/perf/fixtures/task489SolutionKitRunPredecessor.ts","tests/perf/task551DatabaseBaseline/contractTestHelpers.ts","tests/perf/task551DatabaseBaseline/freezeCandidateGenerationState.ts","tests/perf/task551DatabaseBaseline/freezeCandidateGenerationFixture.ts","tests/perf/task551DatabaseBaseline/freezeCandidateGenerationTestHelpers.ts","tests/perf/database-query-baseline.test.ts","tests/perf/task551DatabaseBaseline/digestContract.test.ts","tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts","tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts","tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts"]; for (const path of paths) { const file=Bun.file(path); if (!(await file.exists())) throw new Error(`missing ${path}`); const text=await file.text(); const lines=(text.match(/\n/g)?.length ?? 0)+Number(text.length>0 && !text.endsWith("\n")); if (lines>1000) throw new Error(`overlong ${path}: ${lines}`); }'
  git diff --check -- scripts/task-551-database-baseline.ts scripts/task551DatabaseBaseline/catalog.ts scripts/task551DatabaseBaseline/digestContract.ts scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts scripts/task551DatabaseBaseline/fixtureTarget.ts scripts/task551DatabaseBaseline/fixtureValidation.ts scripts/task551DatabaseBaseline/metrics.ts scripts/task551DatabaseBaseline/postgresTransport.ts scripts/task551DatabaseBaseline/receiptContract.ts scripts/task551DatabaseBaseline/requiredSanitizedCatalogProjection.ts scripts/task551DatabaseBaseline/reviewedPairPersistence.ts scripts/task551DatabaseBaseline/reviewedPairReceiptSource.ts scripts/task551DatabaseBaseline/reviewedPairTransition.ts scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts scripts/task551DatabaseBaseline/runner.ts scripts/task551DatabaseBaseline/runtimeProvenance.ts tests/perf/fixtures/task551DatabaseScale.ts tests/perf/fixtures/task551DatabaseBudgets.ts tests/perf/fixtures/task551AdminReadStatementShapes.ts tests/perf/fixtures/task489SolutionKitRunPredecessor.ts tests/perf/task551DatabaseBaseline/contractTestHelpers.ts tests/perf/task551DatabaseBaseline/freezeCandidateGenerationState.ts tests/perf/task551DatabaseBaseline/freezeCandidateGenerationFixture.ts tests/perf/task551DatabaseBaseline/freezeCandidateGenerationTestHelpers.ts tests/perf/database-query-baseline.test.ts tests/perf/task551DatabaseBaseline/digestContract.test.ts tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts
  ```

  The lists are the finite L02 allowlist, with no glob or unresolved variable.
  The immutable legacy archive is deliberately excluded because L02 may not
  write it.

## Documentation Updates Required

No shared docs; emit the sanitized budget contract for TASK-551-10-L02.

## Quantified Acceptance

- Small and large datasets match declared row counts exactly and leak zero rows
  after teardown. Every fixture invocation uses a DB3-only target that L11 maps
  only after consuming a separately fresh author-audit opaque broker bound to
  one `l02` fixture operation, after the L01 initial gate, durable redacted L03
  evidence, and L02 database-free static/manifest finalization including the
  required isolated static receipts. Durable L03
  evidence is never a source, value, map, reconstruction input, or fixture
  authority; no L03 source/map may be retained, reused, reconstructed, or mapped
  into the L02 child. L11 validates the broker's L02 phase/operation before any
  raw-value read.
  Every invocation first proves the fixed name `coderso02` through a
  parameterized `current_database() = $1::text` check and the L03-owned
  preserve-only sentinel, without generic URL fallback, dotenv access, or L02
  sentinel provisioning. Only the documented guarded CLI wrapper may perform
  its one name-first `process.env` transport snapshot; its fresh three-key
  output is the sole runner input and it rejects all generic/DB3/unknown names
  before target parsing. Every scenario cleanup then repeats that parameterized
  proof bound to `coderso02` and
  re-proves exactly one unchanged marker/sentinel byte before later work or
  command success. Every
  successful small/large `--check` exposes exactly one ephemeral,
  target-redacted success record whose four preflight proof booleans are true before
  scenario work; no L02 command evidence is persisted.
- Every L02 profile/evidence chain contains exactly two mandatory, separate,
  zero-exit/no-skip isolated static receipts: one for
  `database-query-baseline.test.ts` and one for `digestContract.test.ts`.
  Their non-inherited maps contain no generic/fixture database value or target;
  `fixtureTarget.test.ts`, `reviewedPairPersistence.test.ts`, and
  `runnerLifecycle.test.ts` remain default-Bun finalization/capability-only and
  have neither an isolated map nor a receipt.
- Before either an L11 manifest-finalization command or fixture operation, the
  L02 default static order has passed the focused reviewed-pair-persistence and
  runner-lifecycle commands after the fixture-target command, and L11 has
  accepted that DB-free capability/materialization prerequisite without adding
  either command to the exact four-test pre-classifier evidence command. The
  projection gate has imported L01's immutable
  `TASK551_ADMIN_READ_PLANNED_RECORD_PROJECTION` and compared it
  bidirectionally with L02's own raw `TASK551_ADMIN_READ_STATEMENT_SHAPES`
  registry. The result is exactly 32 unique matching semantic tuples spanning
  ID/planned-shape ID, future source/caller state, kind/role,
  projection/filter/join/order, bounds/query count, cache/freshness/transaction/
  constraint, and budget/fingerprint/owner/disposition. A missing, extra,
  duplicate, inherited, sparse, `undefined`, defaulted, wrong-key, or divergent
  member fails before any template/map fallback, manifest mutation, DB3 source
  load, target parse, client creation, or fixture activity. The gate remains
  DB-free and does not make L01 import/assert L02 templates or digests.
- The checked-in pure digest contract lets **L02**, within its private digest
  closure, recompute all six `--check` record digests: the five freeze-receipt
  fields (including the shared reviewable-receipt digest) plus the
  profile/selector manifest result. L11 imports neither this module nor a
  generic digester and receives only the registered-snapshot transition result,
  the two pure already-reduced state normalizers, and the predecessor parser
  handoff.
- The required L02-owned two-profile review transition separates the ordered
  small/large freezes from the ordered small/large checks. L11 first registers
  its accepted immutable `worktreeSnapshotDigest` through the non-declared
  facade hook, then invokes only `runL02OwnedReviewedTransition` with that
  digest and the two redacted candidate canonical digests.
  L02's private operation re-reads and binds the strict candidate pair, validates
  the exact three-digest request, calls `ownerReviewChannel.review` once (default
  deny), then mints/
  consumes/revokes its sealed approval and creates/issues/consumes its opaque capability only inside
  the atomic transition; it returns the strict reviewed pair, a redacted
  `coderso.task551.l02-owner-capability-receipt@v1` transition receipt, and the
  ephemeral sanitized active-v2 state-transition receipt for L11's rebase.
  The L02 pure assertion proves that each reviewed receipt is byte/semantically
  identical to its bound candidate except for
  `reviewState:"candidate"` → `reviewState:"reviewed"`, including matching
  valid self digests, and rejects a malformed result, profile/pair omission,
  default, receipt substitution, changed value, or digest mismatch. L11 only
  reduces the returned redacted result to evidence; it never validates a private
  capability or current receipt state, approves, or writes it. Without the
  exact result, zero `--check` commands may start.
- Every declared distribution and selectivity case has exact expected counts in
  both profiles; public/private authorization and equal-sort fixtures are never
  inferred from column defaults.
- Budgets cover 100% of inventory records classified hot/release-gated, with
  exact L01-projection/32-shape/32-`admin-shape`-scenario/32-budget
  template-set equality; supplemental scenarios are explicit and outside that
  equality; all 528 numeric ceiling checks are enforced from reviewed receipts.
- Pool acquisition-wait budgets are reproducible from the independent reserved-
  connection contention fixture before TASK-551-02 begins.
- Repeat-run p95 variance is at most the frozen tolerance (initial ceiling 20%);
  every p50/p95/p99 check is calibration-normalized, and a later leaf cannot
  increase any budget without a task-contract amendment.
- TASK-551-02 remains blocked until every gated inventory ID has finite
  checked-in numeric latency/query/row/byte/pool ceilings.
- All 32 future Admin statement IDs have canonical byte-comparable template
  coverage and two finite, reviewed numeric budget receipts; TASK-551-03-L02
  owns the later comparison to landed production builders. The two prior planned
  callers retain their existing independent budget contracts.
- The separate TASK-489 predecessor registry remains static before 05-L01/L03;
  its normalized association is `source_run_id`, and TASK-551-05-L02 alone
  performs its schema-present 30-receipt execution and writes exactly one
  temporary canonical `coderso.task551.task489-predecessor@v1` file. L11 alone
  parses/validates the temporary file before promotion, records its lowercase
  hash, and promotes the exact
  byte sequence to
  `_docs/_workflows/_smoke/task-551/audit-evidence/task489-predecessor-v1.json`.
  TASK-551-10-L01 and TASK-489 consume only that L11-owned durable path plus
  hash, verify that exact hash first, then call the sole L02
  `parseTask489PredecessorReceiptV1` directly on the same durable bytes while
  carrying those source bytes unchanged. Neither consumer reads the temporary
  file, defines a local parser or receipt shape, reconstructs/reserializes it,
  redeclares the five companion IDs, or converts its fifteen statement receipts
  into a map. L02 creates no TASK-551-11 workflow
  evidence.

## Canonical noLeak invariant

`noLeak: true`

- Static/baseline fixtures: small and large.
- Freeze candidates: small and large.
- Reviewed pair/members: the reviewed small and large fixture pair and their explicitly reviewed members.
- Checks: small and large.
- Predecessor/handoff: preserve the predecessor contract and record the handoff for both fixture sizes.
- The strict parser rejects a missing `noLeak`, a `false` value, a non-boolean value, or `noLeak` in an unknown placement.
- Round-trip and projection tests pin `noLeak` to `true`.

## Workflow Dispatch Envelope

The finite `forbiddenPaths` list captures named current ownership conflicts.
The closed `allowlist` rejects every omitted path, including the broad foreign
categories described in the file-ownership contract.
The `single` occurrence has exactly two ordered, discriminated L11 subgates;
neither is an L02 command or ownership transfer. The parser consumes only frozen
immutable descriptors from private `task-551-worktree-compatibility.mjs`; the outer L11
implementer passes frozen projection/callbacks to its private `task-551-l02-subgate-executor.mjs`
executor, which has no host/DB import and never receives raw archive/state
values. The tuple order is immutable: ordinal `1` `classifier-materialization`,
then ordinal `2` `reviewed-pair-transition`. For both, `afterCommandIds` means
the exact ordered completed occurrence prefix, not an unordered subset: the parser validates
every ID once, prefix order, `beforeCommandId` as the immediate next command,
and no dispatched command after that prefix. The classifier prefix is the five
listed default static commands and permits next `core-lint-types` only after
the four-test prerequisite, the required manifest delta, exact nine-path
manifest/membership postchecks, and current-byte state. The transition prefix
ends `freeze-small`, `freeze-large`, permits next `check-small`, validates its
snapshot, calls only
`registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition`, then public
`runL02OwnedReviewedTransition`; any failure dispatches zero `check-*` commands.
Its separate `workflowPrerequisites` value is not a graph node or product leaf:
after the L11 capacity sequence, its descriptor-only bootstrap accepts only the
exact compatibility literal and resolves no L02 module. After L04 closure/adaptation
and before this `single` occurrence, L11 creates the sole named non-graph,
non-evidence `Task551L02CodeTestMaterializationClosureV1` from the exact current
regular non-symlink closed L02 source/test byte set only; it excludes archive,
active state, parent, lock, and temp paths and proves neither command/subgate
success nor final leaf closure. Only that current closure permits named
`adaptTask551L02ClosureV2` to literal-dynamically import the persistence facade's
closed export projection and the outer composition root to import the owner host.
It is a named owner closure, not a generic sidecar projection: the deferred
persistence/owner-host targets and L02-owned predecessor registry remain
line-counted but are absent from generic sidecar import/discovery/validation/
closed/worktree/pre-spawn paths and may resolve only at their named seams.
The materialization closure follows L04 adaptation and precedes `single`;
`single` then runs its subgates/checks, and final L02 leaf closure occurs only after
those required gates pass.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-01-L02",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-01"
  },
  "allowlist": [
    "scripts/task-551-database-baseline.ts",
    "scripts/task551DatabaseBaseline/catalog.ts",
    "scripts/task551DatabaseBaseline/digestContract.ts",
    "scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts",
    "scripts/task551DatabaseBaseline/fixtureTarget.ts",
    "scripts/task551DatabaseBaseline/fixtureValidation.ts",
    "scripts/task551DatabaseBaseline/metrics.ts",
    "scripts/task551DatabaseBaseline/postgresTransport.ts",
    "scripts/task551DatabaseBaseline/receiptContract.ts",
    "scripts/task551DatabaseBaseline/requiredSanitizedCatalogProjection.ts",
    "scripts/task551DatabaseBaseline/reviewedPairPersistence.ts",
    "scripts/task551DatabaseBaseline/reviewedPairReceiptSource.ts",
    "scripts/task551DatabaseBaseline/reviewedPairTransition.ts",
    "scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts",
    "scripts/task551DatabaseBaseline/runner.ts",
    "scripts/task551DatabaseBaseline/runtimeProvenance.ts",
    "tests/perf/fixtures/task551DatabaseScale.ts",
    "tests/perf/fixtures/task551DatabaseBudgets.ts",
    "tests/perf/fixtures/task551AdminReadStatementShapes.ts",
    "tests/perf/fixtures/task489SolutionKitRunPredecessor.ts",
    "tests/perf/task551DatabaseBaseline/contractTestHelpers.ts",
    "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationState.ts",
    "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationFixture.ts",
    "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationTestHelpers.ts",
    "tests/perf/database-query-baseline.test.ts",
    "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
    "tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts",
    "tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts",
    "tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts"
  ],
  "forbiddenPaths": [
    "scripts/task-551-query-inventory.ts",
    "scripts/bun-lane-classify.ts",
    "tests/perf/fixtures/task551QueryInventory.ts",
    "tests/perf/database-query-inventory.test.ts",
    "tests/integration/server/task551BunLaneMembership.test.ts",
    "tests/unit/toolchain/bunLaneManifest.test.ts",
    "tests/bun-lane-manifest.json",
    "scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts",
    "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts",
    "tests/perf/task551DatabaseBaseline/freezeReceipts.ts",
    "core/db/client.ts",
    "core/db/schema.ts",
    "core/db/migrations/meta/_journal.json",
    "_docs/_workflows/task-551-implement.mjs"
  ],
  "dependencies": ["TASK-551-01-L04:single"],
  "workflowPrerequisites": ["TASK-551-11:compatibility-bootstrap@v2"],
  "commands": [
    {
      "id": "projection-static-test",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "test", "tests/perf/database-query-baseline.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/database-query-baseline.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "digest-static-test",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "test", "tests/perf/task551DatabaseBaseline/digestContract.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/task551DatabaseBaseline/digestContract.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "fixture-target-static-test",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "test", "tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "reviewed-pair-persistence-static-test",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "test", "tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "runner-lifecycle-static-test",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "test", "tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts"],
        "minimum": 1
      }
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
      "id": "performance-gate",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "run", "gates:coderso:perf"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "isolated-projection-static-small",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/perf/database-query-baseline.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/database-query-baseline.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "isolated-digest-static-small",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/perf/task551DatabaseBaseline/digestContract.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/task551DatabaseBaseline/digestContract.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "isolated-projection-static-large",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/perf/database-query-baseline.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/database-query-baseline.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "isolated-digest-static-large",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/perf/task551DatabaseBaseline/digestContract.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/task551DatabaseBaseline/digestContract.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "freeze-small",
      "lane": "cli",
      "environmentProfile": "task551-phase-l02",
      "argv": ["bun", "--env-file=/dev/null", "scripts/task-551-database-baseline.ts", "--freeze", "--profile", "small", "--all"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "freeze-large",
      "lane": "cli",
      "environmentProfile": "task551-phase-l02",
      "argv": ["bun", "--env-file=/dev/null", "scripts/task-551-database-baseline.ts", "--freeze", "--profile", "large", "--all"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "check-small",
      "lane": "cli",
      "environmentProfile": "task551-phase-l02",
      "argv": ["bun", "--env-file=/dev/null", "scripts/task-551-database-baseline.ts", "--check", "--profile", "small", "--all"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "check-large",
      "lane": "cli",
      "environmentProfile": "task551-phase-l02",
      "argv": ["bun", "--env-file=/dev/null", "scripts/task-551-database-baseline.ts", "--check", "--profile", "large", "--all"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "diff-check",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["git", "diff", "--check", "--", "scripts/task-551-database-baseline.ts", "scripts/task551DatabaseBaseline/catalog.ts", "scripts/task551DatabaseBaseline/digestContract.ts", "scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts", "scripts/task551DatabaseBaseline/fixtureTarget.ts", "scripts/task551DatabaseBaseline/fixtureValidation.ts", "scripts/task551DatabaseBaseline/metrics.ts", "scripts/task551DatabaseBaseline/postgresTransport.ts", "scripts/task551DatabaseBaseline/receiptContract.ts", "scripts/task551DatabaseBaseline/requiredSanitizedCatalogProjection.ts", "scripts/task551DatabaseBaseline/reviewedPairPersistence.ts", "scripts/task551DatabaseBaseline/reviewedPairReceiptSource.ts", "scripts/task551DatabaseBaseline/reviewedPairTransition.ts", "scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts", "scripts/task551DatabaseBaseline/runner.ts", "scripts/task551DatabaseBaseline/runtimeProvenance.ts", "tests/perf/fixtures/task551DatabaseScale.ts", "tests/perf/fixtures/task551DatabaseBudgets.ts", "tests/perf/fixtures/task551AdminReadStatementShapes.ts", "tests/perf/fixtures/task489SolutionKitRunPredecessor.ts", "tests/perf/task551DatabaseBaseline/contractTestHelpers.ts", "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationState.ts", "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationFixture.ts", "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationTestHelpers.ts", "tests/perf/database-query-baseline.test.ts", "tests/perf/task551DatabaseBaseline/digestContract.test.ts", "tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts", "tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts", "tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "line-count",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "--env-file=/dev/null", "-e", "const paths=[\"scripts/task-551-database-baseline.ts\",\"scripts/task551DatabaseBaseline/catalog.ts\",\"scripts/task551DatabaseBaseline/digestContract.ts\",\"scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts\",\"scripts/task551DatabaseBaseline/fixtureTarget.ts\",\"scripts/task551DatabaseBaseline/fixtureValidation.ts\",\"scripts/task551DatabaseBaseline/metrics.ts\",\"scripts/task551DatabaseBaseline/postgresTransport.ts\",\"scripts/task551DatabaseBaseline/receiptContract.ts\",\"scripts/task551DatabaseBaseline/requiredSanitizedCatalogProjection.ts\",\"scripts/task551DatabaseBaseline/reviewedPairPersistence.ts\",\"scripts/task551DatabaseBaseline/reviewedPairReceiptSource.ts\",\"scripts/task551DatabaseBaseline/reviewedPairTransition.ts\",\"scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts\",\"scripts/task551DatabaseBaseline/runner.ts\",\"scripts/task551DatabaseBaseline/runtimeProvenance.ts\",\"tests/perf/fixtures/task551DatabaseScale.ts\",\"tests/perf/fixtures/task551DatabaseBudgets.ts\",\"tests/perf/fixtures/task551AdminReadStatementShapes.ts\",\"tests/perf/fixtures/task489SolutionKitRunPredecessor.ts\",\"tests/perf/task551DatabaseBaseline/contractTestHelpers.ts\",\"tests/perf/task551DatabaseBaseline/freezeCandidateGenerationState.ts\",\"tests/perf/task551DatabaseBaseline/freezeCandidateGenerationFixture.ts\",\"tests/perf/task551DatabaseBaseline/freezeCandidateGenerationTestHelpers.ts\",\"tests/perf/database-query-baseline.test.ts\",\"tests/perf/task551DatabaseBaseline/digestContract.test.ts\",\"tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts\",\"tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts\",\"tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts\"]; for (const path of paths) { const file=Bun.file(path); if (!(await file.exists())) throw new Error(`missing ${path}`); const text=await file.text(); const lines=(text.match(/\\n/g)?.length ?? 0)+Number(text.length>0 && !text.endsWith(\"\\n\")); if (lines>1000) throw new Error(`overlong ${path}: ${lines}`); }"],
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "subgates": [
    {
      "id": "l11-classifier-materialization",
      "kind": "classifier-materialization",
      "ordinal": 1,
      "ownerTaskId": "TASK-551-11",
      "occurrenceId": "single",
      "afterCommandIds": [
        "projection-static-test",
        "digest-static-test",
        "fixture-target-static-test",
        "reviewed-pair-persistence-static-test",
        "runner-lifecycle-static-test"
      ],
      "beforeCommandId": "core-lint-types",
      "barrier": {
        "exactFourTestPrerequisite": true,
        "classifierManifestDeltaPath": "tests/bun-lane-manifest.json",
        "exactNinePathManifestMembershipPostchecks": true,
        "currentByteState": true
      }
    },
    {
      "id": "l11-reviewed-pair-transition",
      "kind": "reviewed-pair-transition",
      "ordinal": 2,
      "ownerTaskId": "TASK-551-11",
      "occurrenceId": "single",
      "afterCommandIds": [
        "projection-static-test",
        "digest-static-test",
        "fixture-target-static-test",
        "reviewed-pair-persistence-static-test",
        "runner-lifecycle-static-test",
        "core-lint-types",
        "core-lint",
        "performance-gate",
        "isolated-projection-static-small",
        "isolated-digest-static-small",
        "isolated-projection-static-large",
        "isolated-digest-static-large",
        "freeze-small",
        "freeze-large"
      ],
      "beforeCommandId": "check-small",
      "barrier": {
        "validatedSnapshotRegistrationHook": "registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition",
        "publicTransition": "runL02OwnedReviewedTransition",
        "activeStateTransitionReceiptSchema": "coderso.task551.l02-active-state-transition-receipt@v2",
        "activeStateTransitionReceiptNormalizer": "parseTask551L02ActiveStateTransitionReceiptV2",
        "reviewedStateAttestationNormalizer": "parseTask551L02ReviewedStateAttestationV2",
        "inMemoryExpectedStateDigestRebase": true,
        "l02CodeTestMaterializationClosure": "coderso.task551.l02-code-test-materialization-closure@v1",
        "materializationClosureTiming": "after-l04-adaptation-before-single",
        "finalLeafClosureTiming": "after-check-small-and-check-large",
        "sourceFree": true,
        "zeroCheckDispatchesOnFailure": true
      }
    }
  ],
  "occurrences": [
    {
      "id": "single",
      "dependsOn": ["TASK-551-01-L04:single"],
      "commandIds": [
        "projection-static-test",
        "digest-static-test",
        "fixture-target-static-test",
        "reviewed-pair-persistence-static-test",
        "runner-lifecycle-static-test",
        "core-lint-types",
        "core-lint",
        "performance-gate",
        "isolated-projection-static-small",
        "isolated-digest-static-small",
        "isolated-projection-static-large",
        "isolated-digest-static-large",
        "freeze-small",
        "freeze-large",
        "check-small",
        "check-large",
        "diff-check",
        "line-count"
      ]
    }
  ]
}
```
