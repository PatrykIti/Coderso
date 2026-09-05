# TASK-551-01-L03: Isolated Fixture Target Bootstrap
# FileName: TASK-551-01-L03-Isolated-Fixture-Target-Bootstrap.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-01
**Priority:** High
**Category:** Database / Test Safety / Reliability
**Estimated Effort:** Small
**Dependencies:** TASK-551-01-L01; TASK-551 external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Create the one-time, opt-in bootstrap that establishes the trust anchor for the
already dedicated TASK-551 DB3 fixture database, whose literal name is
`coderso02`. It is not a general database setup, migration, seed, cleanup, or
performance command. Its only permitted database mutation is to create or
verify the one fixture-only sentinel table and its one marker row after proving
that exact live target name.

L03 lands after the initial L01 inventory and before any L02 fixture-database
operation. A successful L03 `--check` proof, captured and durably accepted by
the TASK-551-11 workflow launcher, is required first. `--initialize` and
`--check` are separate lifecycles: each consumes a distinct fresh L03 broker,
derives its own four fixture values and exact-own child environment, launches
once, captures its redacted command receipt, and disposes all operation-local
authority before the next lifecycle begins. Neither raw source, broker,
fixture value, environment map, nor launch may be retained, inspected,
transformed, or mapped into L02 input. L03 owns no L02 map or environment
handoff and cannot authorize one. L02's DB-free static and manifest finalization
occur without L03 environment data; only after that finalization may
TASK-551-11 begin distinct fresh broker lifecycles for L02's individual fixture
operations. The only L03→L02 cross-phase material is redacted durable L03
evidence, never a source value, database name, sentinel, confirmation, or
environment map.
L02 must not create, replace, repair, or delete this marker.

## Sub-Tasks

None; this is an executable leaf.

## File Ownership

**Code/Test Allowlist:**

- `scripts/task-551-fixture-target-bootstrap.ts`
- `tests/perf/task551FixtureTargetBootstrap.test.ts`

The allowlisted bootstrap script is the checked-in owner of the two required,
import-safe, pure non-secret helper exports
`getTask551FixtureBootstrapToolContractIdentity` and
`getTask551FixtureBootstrapToolContractDigest`. Their module import and either
helper call must not connect to a database or read environment, CLI, clock,
filesystem-discovery, receipt, target, URL, user, confirmation, sentinel, SQL,
timing, or platform data. The pre-graph compatibility bootstrap resolves no L03
module/path/byte/export, and no L11 module statically imports either helper. Only
after L03 closure, non-public `adaptTask551L03ClosureV2(closure)` may
literal-dynamically import `../../../scripts/task-551-fixture-target-bootstrap.ts`,
verify the exact current L03 closure receipt/bytes, and freeze only those two
values to verify the transient `--check` record; generic/computed imports and the
CLI-adapter seam, `main`, `runBootstrap`, or any bootstrap configuration
type/value fail. Later L11 implementation must remove any current facade static
L03 import. For L11 only, this script is a deferred literal target: it remains
L03-owned and line-counted, but is absent from generic sidecar import/discovery/
validation/closed/worktree/pre-spawn projections; L03 may materialize/spawn
while L04/L02 targets are absent, and only its named post-L03 seam resolves it.
The focused L03 suite may additionally import the
one named, import-safe `task551FixtureBootstrapCliAdapterTestSeam` export and
its structural test types, solely to provide fake argv/environment/dependency/
output values. That seam must not run the CLI entry wrapper, inspect a process,
or create a client during module import.

**Forbidden:** production source, `core/**`, schema/migration and migration
metadata paths, all L01/L02-owned paths, every existing task/changelog/workflow
file, `_docs/_workflows/**`, all fixture seeds, baseline measurements, cleanup
tools, runtime configuration files, and unrelated test paths.

This task contract is authored before implementation. The later implementation
edits only the two allowlisted code/test files. It does not change shared
documentation, task board state, changelog, or workflow evidence.

During recovery-initial state, any already-present bytes at the two L03
allowlisted paths are reference-only. They become eligible for use only through
the normal L03 dispatch after L01 has freshly validated the current source and
test state and L03 has passed its own focused gate. Their presence creates no
receipt, broker authority, database operation, process action, or evidence,
and it neither relaxes the L01 dependency nor skips normal L03 closure.

### Broker-bound fixture authority (fresh-audit correction)

L03 defines no raw-ingress, local phase label, or authority object.
`task-551-author-audit.mjs` alone accepts trusted source authority and creates
opaque one-use `Task551PhaseSourceBrokerV1` instances; `task-551-implement.mjs`
matches the closed L11 expected context and hands it to `task-551-fix.mjs`, which
alone calls `consumeOnce(expected)` before supplier/source access. Each broker
is bound to the exact L03 initialize/check table row, not merely a phase tuple.
It drops the raw source/broker and passes L03 only exact
`fixtureValues`: URL, name, confirmation, and sentinel. Confirmation is the
narrow L03-only fourth-value exception; L02 and 05-L02 use only URL, name, and
sentinel. For a child launch, L11 builds a distinct exact-own `childEnv` from
those `fixtureValues` plus only defined `PATH`, `TMPDIR`, `LANG`, `LC_ALL`, and
`TZ`; it never merges or inherits an environment. Bun is launched with an argv
array, never a shell/string wrapper, and literal `--env-file=/dev/null`.

L03 tests cover only the four-value adapter and static/mock behavior. L11
workflow tests own the broker consumption and launch assertions: exact
phase/operation binding, one use, four `fixtureValues`, OS-augmented own
`childEnv`, argv array/no shell wrapper, literal env-file flag, and rejection of
an inherited, merged, extra, or L02/05-L02-shaped map before spawn.

## Bootstrap Environment and CLI Contract

The tool reads values only from these four L11 broker-derived mapped child
values:

| Variable | Strict requirement |
|---|---|
| `TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL` | Nonempty PostgreSQL connection string whose UTF-8 encoded byte length is at most 4,096 bytes, produced only by TASK-551-11's broker-derived private child-map value; consumed only by the bootstrap client and never emitted. L03 never reads a raw source, generic URL, dotenv, or ambient process value as a URL source. |
| `TASK551_FIXTURE_BOOTSTRAP_DATABASE_NAME` | Must exactly equal the literal `coderso02`, not merely be nonempty. L11 supplies that fixed literal and L03 compares the live value byte-for-byte through a parameterized `current_database()` proof. |
| `TASK551_FIXTURE_BOOTSTRAP_CONFIRMATION` | Must exactly equal the fixed literal `INITIALIZE_TASK551_FIXTURE_TARGET`. This is an intentional human acknowledgement, not an authenticator for a production target. |
| `TASK551_FIXTURE_BOOTSTRAP_SENTINEL` | Opaque secret whose UTF-8 encoded byte length is 32 through 512 bytes inclusive; it is bound only for sentinel verification/insert and never emitted. |

TASK-551-11's implementation/fix boundary consumes the author-audit broker and creates the four-key L03
`fixtureValues`; its URL value is copied only to
`TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL`, while its name value is the fixed
literal `coderso02`. The normal module, all exports, pure helpers, test seams,
and tests receive that map only as an explicit argument and never directly read
`process.env`, a dotenv file, or a generic/runtime URL source. The sole narrow
exception is the actual CLI entry adapter guarded by `if (import.meta.main)`.
Because L11 launches a separate non-inherited Bun child, that adapter may
snapshot its already-validated child `process.env` transport exactly once: it
may enumerate key names once, read each of the four owned bootstrap values once,
and copy them into a fresh own-property four-key map before it calls `main`.
It may read `process.argv` only once to pass the child argv to `main`. It must
not pass, spread, merge, retain, or otherwise expose `process.env`; it must not
read any other environment value. It is not an alternative configuration path,
and importing the module never invokes it.

A direct `DATABASE_URL3`, `DATABASE_URL`, or `DATABASE_DIRECT_URL` name in that
child transport is an invalid source and is rejected by name before any
configured value, client, or target parser exists; the private values of those
names are never read. The adapter's name-only pass permits only the four names
in the table and the defined OS allowlist `PATH`, `TMPDIR`, `LANG`, `LC_ALL`,
and `TZ`; it rejects every other `TASK551_FIXTURE_BOOTSTRAP_*` name, every
other `TASK551_*` name, every database-name or URL alias, and every unexpected
transport key as `fixture_bootstrap_invalid`. It copies none of the OS keys.
After that name pass, it reads values only for the four owned names, validates
their presence/string shape into the fresh map, and lets `parseBootstrapConfig`
perform the full bounded UTF-8-byte validation before a client is created: URL
is nonempty and `<= 4,096` bytes; sentinel is `32..512` bytes inclusive. The
adapter must not print environment values, CLI values, a URL, target name, user
name, sentinel, SQL bind, stack trace, or raw driver error.

### PostgreSQL Driver Environment Boundary

This section distinguishes L03's own configuration behavior from the installed
`postgres@3.4.9` driver's implementation behavior. The L03 module's own code
does not read an environment object outside the guarded `if (import.meta.main)`
entry adapter above. Its pure helpers, named test seam, parser, dependency
factory, client adapter, and tests receive explicit arguments only. In
particular, none of that L03-owned code reads `DATABASE_URL3`, `DATABASE_URL`,
`DATABASE_DIRECT_URL`, a `PG*` variable, dotenv, or an ambient URL fallback.

`postgres@3.4.9` unconditionally captures `process.env` while its
`parseOptions` function constructs a client, even when an explicit URL and
options are supplied. That transitive driver lookup is unavoidable and is not
an alternative configuration channel. It is permitted only at the one
L03-owned `postgres(databaseUrl, options)` construction call described in the executable
adapter pseudocode below, and only after `parseBootstrapConfig` has accepted
the explicit four-key map and its strict PostgreSQL URL shape. It never occurs
on module import, a pure helper call, a test-seam call using a fake dependency,
or before CLI/config validation.

L11 makes that narrow exception safe by launching the real CLI in an exact,
non-inherited, **PG-free** child transport: the four bootstrap keys plus only
`PATH`, `TMPDIR`, `LANG`, `LC_ALL`, and `TZ`. It contains no `PG*` name, generic
database/URL name, direct source name, dotenv-derived key, or other inherited
ambient value. `parseBootstrapConfig` requires a parseable `postgres:` or
`postgresql:` URL with explicit host, user, and database path before the driver
is constructed. Its port may be absent: postgres.js then uses its deterministic
5432 default, never `PGPORT`, because the L11 child is PG-free. The driver may
observe absent `PG*` properties in that PG-free child, but it cannot obtain a
URL, target, user, password, or option from an inherited environment.
The current dedicated DB3 input shape—no explicit port and the exact raw
`?sslmode=require` search below—remains accepted and is never emitted.

The URL validator must apply its raw grammar before it uses `new URL`. It
rejects every raw `#`; its raw search is no raw query or exactly the bytes
`?sslmode=require` from the first raw `?` onward, so a bare trailing `?` fails
even though `new URL` normalizes it to an empty search. It derives the raw
driver authority exactly conservatively relative to postgres.js: take the
substring after the scheme through the first raw `/`, `?`, or `#`; require one
and only one raw `@`; then `decodeURIComponent` the suffix after that first
`@`, rejecting decode errors. The decoded driver authority must be nonempty and
contain none of `,`, `@`, `/`, `?`, or `#`. This rejects both raw and
percent-encoded comma multi-host forms plus raw or decoded extra-`@` authority
ambiguities before `connect`. Only after those checks may `new URL` validate the
scheme, username, host, and database path. `URL.hostname` alone is not a
sufficient proof of one target because postgres.js derives multi-host routing
from the raw/decoded authority before URL normalization. Therefore exactly one
host target reaches the constructor.

Every other query parameter, duplicate, alternate spelling/encoding, or extra
separator fails before `connect`, including `database`, `user`,
`application_name`, `client_encoding`, `options`, `ssl`, `sslnegotiation`,
`timeout`, and `target_session_attrs`. postgres.js maps the sole allowed
`sslmode=require` into its SSL default; it cannot merge another URL query value
into startup `connection`. That preserves the adapter's static
`application_name` and UTF-8 startup settings rather than letting a URL query
replace them.

The single L03 construction call must force the static no-output operation
options pinned below: `max: 1`, `debug: false`, no `timeout` option,
`onnotice`, `onnotify`, `onclose`, and `onparameter` no-ops, static application
name, disabled prepared statements, and bounded connection/pipeline settings.
`postgres@3.4.9` necessarily allocates its internal subscription-helper
subclient/pool during that same construction. L03 never invokes a subscription
or LISTEN API, so that helper opens no active subscriber connection; the one
active reserved operation connection (`max: 1`) remains the only connection used
for target proof through transaction. The terminal `pool.end()` call must clean
up both the operation pool and the driver's internal helper through postgres.js
cascading cleanup. The adapter must not set or accept URL
`target_session_attrs`: postgres.js would then run an extra driver preflight
before the fixed current-database proof. The adapter itself never logs or
serializes a driver value; normal driver debug and notice paths therefore have
no output sink. Any driver exception still travels only to the existing outer
redaction boundary, which emits at most `fixture_bootstrap_invalid`.

Each L03 operation's private source/broker, exact four-key fixture values, and
exact-own child environment are operation-only state. TASK-551-11 captures and
disposes the initialize lifecycle before it obtains the distinct check broker;
after it validates the transient check record and durably accepts its redacted
evidence, it disposes the check lifecycle too. None is a source for, a template
for, or an authorization of an L02 environment. L03 has no L02 map, mapping
function, or handoff contract. L02's later fixture phase must instead use a
separately fresh author-audit broker for each L02 command only after L02's own
DB-free static and manifest finalization; that separate phase may receive only
the redacted durable L03 evidence from this leaf.

### Static Focused-Test Environment Boundary

The ordinary default-Bun focused suite is a DB-free, static/mock-only
default-lane command. It is not an L11 child and receives no injected
TASK-551-11-owned `Task551StaticEvidenceEnvironmentV1` or fixture map; it
remains safe even if a root runner loaded `.env` because its imports and test
code never read ambient environment values. Only L11's isolated evidence rerun
is a `static-evidence` child command. It receives a fresh TASK-551-11-owned
`Task551StaticEvidenceEnvironmentV1`: either an exactly empty map or a map
containing only the defined non-secret OS keys `PATH`, `TMPDIR`, `LANG`,
`LC_ALL`, and `TZ`. That map is explicit and non-inherited
by construction, is created independently of any fixture broker/value, and is
discarded after the isolated command completes. Its argv is an array with literal
`--env-file=/dev/null`, never a shell/string wrapper; its exact-own static
`childEnv` contains no URL, database name, confirmation, sentinel,
`DATABASE_URL3`, generic `DATABASE_*` key, `TASK551_*` key, or bootstrap/fixture
key. The isolated focused-test child therefore cannot be given the L03 four-key
fixture map, even for a receipt-only rerun.

Only the real fixture CLI operations receive the exact four-key L03 values from
the table above: first `--initialize`, then `--check`. Each gets a distinct fresh
broker-derived values/environment pair and one launch; neither operation may
reuse the other's broker, source, values, child environment, map, or argv. No
command may merge a static map and a fixture map, and no static child may receive
a fixture value through a fallback, dotenv file, or inherited environment. The
required L03 command order is consequently focused static evidence rerun →
`--initialize` → `--check`. A test may construct an in-memory `BootstrapEnvironment` argument
to exercise an injected `runBootstrap`/`main` seam; that local function
argument is not the process environment used to launch the focused test and
does not authorize a fixture map for that test process.

The CLI is closed and accepts exactly one mode:

- `--initialize` is the only mutating mode.
- `--check` validates the existing trust anchor and never mutates.

No mode, both modes, repeated modes, or any unknown argument fails before a
connection. The fixed confirmation is required in both modes so the caller
cannot accidentally repurpose the tool as an ambient database probe; it does
not weaken the independent live-name and marker/sentinel proofs.

### `--check` Stdout Record and Evidence Boundary

Only after every `--check` proof succeeds, the CLI writes exactly one
newline-terminated JSON object to stdout and writes no other stdout bytes. Its
schema is owned by this L03 tool and is exact: unknown, missing, renamed, or
non-canonical fields are invalid.

```ts
type FixtureBootstrapCheckRecord = Readonly<{
  schema: "coderso.task551.fixture-bootstrap-check@v1";
  taskId: "TASK-551-01-L03";
  mode: "check";
  pass: true;
  markerCount: 1;
  targetProof: "current-database-and-single-marker";
  noLeak: true;
  toolContractDigest: `sha256:${string}`;
}>;

```

`toolContractDigest` is exactly the value returned by the checked-in pure
`getTask551FixtureBootstrapToolContractDigest` export: `sha256:` followed by
exactly 64 lowercase hexadecimal SHA-256 digits. It hashes the RFC 8785
canonical UTF-8 representation of the versioned, non-secret value returned by
`getTask551FixtureBootstrapToolContractIdentity`. That identity and its digest
have no database, target, URL, user, sentinel, confirmation, SQL, bind, error,
duration, platform, or receipt-derived input or field. TASK-551-11 loads those
two exports, independently RFC 8785-canonicalizes and hashes the identity, and
requires byte equality with both the helper result and this stdout field; a
syntactically valid old or substituted digest is rejected. The record must
contain no field beyond the eight shown above and must never contain a target
name or hash, connection URL, user, sentinel or sentinel hash, confirmation,
SQL/binds, raw driver error, duration/platform detail, or another receipt.

`--initialize` never emits this record, including on successful idempotent
initialization. Any failure emits no stdout record and leaves stdout empty. At
the outer CLI boundary, the only permitted stderr diagnostic is the stable
redacted `fixture_bootstrap_invalid` code; it must not be supplemented with a
stack, driver detail, or captured record.

L03 does not write, retain, redirect, or otherwise persist a receipt. It does
not create a workflow directory or evidence file. TASK-551-11 alone executes
the controlled capture, validates this exact stdout schema together with the
redacted command receipt, and writes durable audit evidence only below its
allowed `_docs/_workflows/_smoke/task-551/audit-evidence/*.json` path. Later
consumers, including L10, consume that TASK-551-11-owned durable evidence;
they do not treat an arbitrary L03 invocation or a standalone stdout line as a
receipt. That redacted durable evidence is also the only permissible L03→L02
cross-phase input: it cannot carry or reconstitute a URL, database name,
sentinel, confirmation, source provenance, or either environment map.

## Database Mutation and Trust-Anchor Contract

After full explicit config validation, the concrete adapter constructs one
L03-owned postgres.js operation pool with `max: 1` and reserves one active
operation connection. postgres.js also necessarily allocates its inert internal
subscription helper as part of that same construction; L03 makes no subscription
or LISTEN call, so it creates no active subscriber connection. The one reserved
operation connection performs the target proof and the explicit transaction; it
does not prove one pooled session and mutate through another. The adapter has
`fetch_types: false`, no `target_session_attrs` option or URL parameter, and
the exact PG-free L11 child transport described above. Its raw URL search is
closed to absent or exact `?sslmode=require`, so no driver startup-option query
or preflight may precede the fixed target proof. It releases the operation
reservation exactly once at the terminal transaction/cleanup boundary and calls
`pool.end()` once, relying on postgres.js to cascade cleanup to its inert
internal subscription helper while exposing no raw driver result.

Before any DDL or schema inspection, reject a name configuration other than the
literal `coderso02`. Then connect with the dedicated L11-provided DB3 bootstrap
URL only to execute the parameterized identity check
`SELECT current_database() = $1::text AS current_database_matched`, binding the literal
`coderso02` as its sole parameter. A false or missing result, or a connection
error, returns only `fixture_bootstrap_invalid` and performs no DDL.

Only after the name proof, `--initialize` opens one transaction and may perform
the following exact, bounded operation:

```sql
CREATE TABLE IF NOT EXISTS public.task551_fixture_sentinel (
  marker text PRIMARY KEY CHECK (marker = 'task551-baseline-v1'),
  sentinel text NOT NULL
);
```

`--initialize` opens only the typed read-write transaction after the target
proof. Within that one transaction it verifies the exact `public` table shape
and then verifies or inserts exactly this parameterized row:

```ts
{
  marker: "task551-baseline-v1",
  sentinel: configuredOpaqueSentinel,
}
```

The read/write adapter's proof result must report only whether the relation
shape is exact, total `tableRowCount`, canonical `markerCount`, and
`boundSentinelByteMatched`; it cannot return a marker or sentinel. It computes
the latter only with the two bound text values and their UTF-8 `convert_to`
byte sequences plus equal byte length. The implementation rejects and rolls
back for a structural mismatch, non-finite or negative count, duplicate marker
row, extra row, a marker other than `task551-baseline-v1`, or a sentinel whose
bound UTF-8 bytes do not exactly match the supplied secret. A missing row is
valid only for `--initialize` after an exact empty proof
(`tableRowCount === 0`, `markerCount === 0`, and no byte match), where the tool
inserts the sole canonical row and repeats the proof requiring
`tableRowCount === 1`, `markerCount === 1`, and
`boundSentinelByteMatched === true` before its one commit. It is invalid for
`--check` and after initialization. A valid existing table and matching single
row make `--initialize` idempotent. It must not update a different sentinel
value merely to make a run pass; rotation requires an explicit future contract.

`--check` performs the same name proof followed by the typed read-only exact
table/row validation. Its client contract offers `readExactSentinelTableAndMarker`
and `rollback` only: it has no DDL, insert, update, delete, truncate, vacuum,
migration, seed, cleanup, L02 command, or commit operation. It requires the
same exact one-marker/sentinel-byte proof terminology as L02—an exact relation,
`markerCount === 1`, and `boundSentinelByteMatched === true`—then always rolls
back in `finally`. That maps to L11's non-secret
`current-database-and-single-marker` / `markerCount: 1` producer proof without
exposing a target, marker, sentinel, bind, or raw observation.

The marker intentionally remains after a successful bootstrap. It is the
dedicated-fixture trust anchor that ordinary L02 scenario cleanup must retain;
it is not a seed row and must never be included in L02's owned-key deletion
scope. This tool may write only the exact table and row above.

## Security Contract

- **Visibility:** no HTTP route, public endpoint, or runtime configuration
  surface is added; the tool is explicit local/CI test infrastructure only.
- **Auth/RBAC/CSRF/rate limit:** not applicable to this non-server CLI. Its
  opt-in `--initialize`, fixed confirmation, exact current-database proof, and
  opaque marker secret are defense-in-depth controls, not a substitute for
  access control on a database.
- **Strict validation:** reject unknown CLI arguments and unexpected
  `TASK551_FIXTURE_BOOTSTRAP_*` names before connecting. The key-name-only
  namespace scan allows exactly the four declared names, rejects a direct
  `DATABASE_URL3`, `DATABASE_URL`, or `DATABASE_DIRECT_URL` child-transport
  name, and never dereferences unrelated environment values. Only the guarded
  CLI adapter may inspect that non-inherited child transport; after its name
  pass it reads exactly the four owned values once into a fresh map. All normal
  module code receives that map explicitly, then requires the name literal
  `coderso02`, validates a nonempty URL of at most 4,096 UTF-8 bytes and a
  sentinel of 32 through 512 UTF-8 bytes, and uses stable redacted
  `fixture_bootstrap_invalid` failures before a client exists. No unrelated
  process-environment value is read or trusted by L03-owned code. Raw URL
  validation requires one raw authority `@`, a decodable nonempty driver
  authority without raw/decoded structural ambiguity or a comma, then a parsed
  host, user, and database path; `URL.hostname` alone cannot prove one target.
  An absent port is only the driver's deterministic 5432 default in the PG-free
  child, never `PGPORT`. The raw query is absent or exactly one byte-for-byte
  `?sslmode=require` (a bare `?` is invalid); every other/duplicate query name
  or value is rejected before a client exists, including startup
  `application_name`/`client_encoding`/`options` overrides and direct
  `ssl`/`sslnegotiation`/`timeout`/`target_session_attrs` options. This prevents
  raw or percent-encoded comma multi-host routing from reaching the constructor.
- **Static-test isolation:** the ordinary default-Bun focused test receives no
  L11 child map and remains DB-free because its imports/test code never read
  ambient environment, even when a root runner has loaded `.env`. Only an L11
  isolated evidence rerun receives a fresh, explicit, non-inherited
  TASK-551-11-owned `Task551StaticEvidenceEnvironmentV1` that is empty or
  contains only the fixed OS allowlist. That isolated map rejects every
  `DATABASE_*` and `TASK551_*` name, including DB3, generic URL,
  bootstrap/fixture, target, confirmation, and sentinel values; it is discarded
  before either of the two distinct four-key L03 fixture lifecycles begins.
- **Target safety:** TASK-551-11 alone consumes the author-audit opaque broker
  bound to the L03 operation and passes its derived URL only through the exact
  bootstrap child key. Only the guarded CLI adapter may read the already
  exact-own child
  `process.env` transport, and only to snapshot its exact four bootstrap values
  into a fresh map; L03 otherwise never reads a raw source, generic runtime URL,
  `process.env`, or dotenv as a URL source. First prove
  `current_database() = 'coderso02'` through the parameterized literal bind;
  only then enter the one bounded transaction. Each L03 operation's source,
  broker-derived values, and child environment are disposed after its captured
  launch; they cannot feed or authorize L02. Each later L02 operation gets its
  separately fresh author-audit broker only after its DB-free static and manifest
  finalization, with redacted durable L03 evidence as the sole L03 input. The confirmation literal is deliberately insufficient by
  itself to authenticate any target.
- **Driver boundary:** the preceding no-environment rule applies to L03-owned
  code. The installed `postgres@3.4.9` implementation itself reads
  `process.env` while parsing options at the one deferred L03-owned
  construction call. That is allowed only after explicit config validation in
  L11's exact non-inherited PG-free child transport, never as an L03
  configuration source, and never during import/test-seam/pure-helper work.
  The construction has the pinned `max: 1`, `debug: false`, no-op driver
  callbacks, no deprecated `timeout` option, no `target_session_attrs`, and
  a closed raw URL policy that preserves static startup settings; adapter code
  produces no driver output. postgres.js necessarily allocates its internal
  subscription helper at this one construction, but L03 invokes no
  subscription/LISTEN API and opens no active subscriber connection; the sole
  final `pool.end()` must cascade cleanup of that helper.
- **Secrets and privacy:** redact URL, database/user name, confirmation,
  sentinel, bind values, driver messages, and stack traces from output, errors,
  test snapshots, receipts, and logs. Tests use non-secret canaries only to
  prove redaction.
- **Mutation boundary:** only `--initialize` can create/verify the one named
  table and one marker row; all other schema/data changes fail closed.
- **Anti-abuse:** no public write surface exists. Broker-derived bootstrap
  values and the one-time explicit acknowledgement prevent an ambient process
  from silently turning ordinary application configuration into a test target.

## Implementation Pseudocode

```ts
import canonicalize from "canonicalize";
import { createHash } from "node:crypto";
import postgres from "postgres";

const CONFIRMATION = "INITIALIZE_TASK551_FIXTURE_TARGET";
const MARKER = "task551-baseline-v1";
const EXPECTED_DATABASE_NAME = "coderso02" as const;
const DATABASE_URL_MAX_UTF8_BYTES = 4_096;
const SENTINEL_MIN_UTF8_BYTES = 32;
const SENTINEL_MAX_UTF8_BYTES = 512;
const BOOTSTRAP_ENV_PREFIX = "TASK551_FIXTURE_BOOTSTRAP_";
const ALLOWED_POSTGRES_URL_SEARCH = "?sslmode=require";
const discardDriverEvent = (): void => undefined;
// Do not add `timeout`: postgres.js logs for that deprecated option. These
// options are supplied only at the one L03-owned `postgres(...)` construction
// for the max:1 operation pool. postgres@3.4.9 also allocates its internal,
// inert subscription helper during that construction; it is not a second L03
// operation pool and L03 never invokes a subscription or LISTEN API.
const TASK551_BOOTSTRAP_POSTGRES_OPTIONS = Object.freeze({
  max: 1,
  idle_timeout: 0,
  connect_timeout: 10,
  max_pipeline: 1,
  keep_alive: 0,
  prepare: false,
  fetch_types: false,
  debug: false,
  connection: Object.freeze({
    application_name: "task551-fixture-bootstrap",
    client_encoding: "UTF8",
  }),
  onnotice: discardDriverEvent,
  onnotify: discardDriverEvent,
  onclose: discardDriverEvent,
  onparameter: discardDriverEvent,
});
type BootstrapEnvironmentKey =
  | "TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL"
  | "TASK551_FIXTURE_BOOTSTRAP_DATABASE_NAME"
  | "TASK551_FIXTURE_BOOTSTRAP_CONFIRMATION"
  | "TASK551_FIXTURE_BOOTSTRAP_SENTINEL";
const BOOTSTRAP_ENV_KEYS = new Set<BootstrapEnvironmentKey>([
  "TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL",
  "TASK551_FIXTURE_BOOTSTRAP_DATABASE_NAME",
  "TASK551_FIXTURE_BOOTSTRAP_CONFIRMATION",
  "TASK551_FIXTURE_BOOTSTRAP_SENTINEL",
]);
const FORBIDDEN_DATABASE_SOURCE_ENV_KEYS = new Set([
  "DATABASE_URL3",
  "DATABASE_URL",
  "DATABASE_DIRECT_URL",
]);

type BootstrapMode = "initialize" | "check";
export type Task551FixtureBootstrapEnvironment = Readonly<
  Record<string, string | undefined>
>;
export type Task551FixtureBootstrapCliProcessEnvironment = Readonly<
  Record<string, string | undefined>
>;
type BootstrapEnvironment = Task551FixtureBootstrapEnvironment;
type CliProcessEnvironment = Task551FixtureBootstrapCliProcessEnvironment;
type BootstrapConfig = Readonly<{
  databaseUrl: string;
  databaseName: typeof EXPECTED_DATABASE_NAME;
  confirmation: string;
  sentinel: string;
}>;

// Private production-adapter facades deliberately stay structural and are not
// exports. They let the focused suite use the public injected client/dependency
// contracts without constructing postgres.js or a network client.
type Task551PostgresRow = Readonly<Record<string, unknown>>;
type Task551PostgresQuery = Readonly<{
  unsafe<TRow extends Task551PostgresRow>(
    statement: string,
    bindings?: readonly unknown[],
  ): Promise<readonly TRow[]>;
}>;
type Task551ReservedPostgresQuery = Task551PostgresQuery & Readonly<{
  release(): void;
}>;
// This facade represents only the L03-owned main operation pool. The installed
// driver creates its hidden subscription helper during this construction; that
// helper is intentionally outside this L03 operation surface and remains inert.
type Task551PostgresPool = Task551PostgresQuery & Readonly<{
  reserve(): Promise<Task551ReservedPostgresQuery>;
  end(): Promise<void>;
}>;
type Task551PostgresFactory = (
  databaseUrl: string,
  options: typeof TASK551_BOOTSTRAP_POSTGRES_OPTIONS,
) => Task551PostgresPool;
type Task551ReservedLease = {
  reserved: Task551ReservedPostgresQuery | undefined;
  releaseAttempted: boolean;
  transactionState: "none" | "read-only" | "read-write" | "committed" | "rolled-back";
};

// Fixed, parameterized statements only. No helper interpolates a config value
// into statement text or logs a statement/result. The DDL is byte-for-byte the
// mutation contract in the Database Mutation and Trust-Anchor Contract section.
const CURRENT_DATABASE_PROOF_SQL =
  "SELECT current_database() = $1::text AS current_database_matched";
const BEGIN_READ_ONLY_SQL = "BEGIN READ ONLY";
const BEGIN_READ_WRITE_SQL = "BEGIN";
const COMMIT_SQL = "COMMIT";
const ROLLBACK_SQL = "ROLLBACK";
const CREATE_EXACT_SENTINEL_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS public.task551_fixture_sentinel (
    marker text PRIMARY KEY CHECK (marker = 'task551-baseline-v1'),
    sentinel text NOT NULL
  );
`;
const INSERT_CANONICAL_MARKER_SQL = `
  INSERT INTO public.task551_fixture_sentinel (marker, sentinel)
  VALUES ($1::text, $2::text)
`;
const READ_EXACT_SENTINEL_TABLE_AND_MARKER_SQL = `
  WITH target_relation AS (
    SELECT relation.oid AS relation_oid
    FROM pg_catalog.pg_class AS relation
    INNER JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = 'task551_fixture_sentinel'
  ), relation_contract AS (
    SELECT target_relation.relation_oid,
      (
        relation.relkind = 'r'
        AND relation.relpersistence = 'p'
        AND relation.relispartition = false
        AND relation.relhassubclass = false
        AND relation.relrowsecurity = false
        AND (
          SELECT count(*)
          FROM pg_catalog.pg_attribute AS attribute
          WHERE attribute.attrelid = relation.oid
            AND attribute.attnum > 0
            AND NOT attribute.attisdropped
        ) = 2
        AND EXISTS (
          SELECT 1
          FROM pg_catalog.pg_attribute AS attribute
          INNER JOIN pg_catalog.pg_type AS type ON type.oid = attribute.atttypid
          WHERE attribute.attrelid = relation.oid
            AND attribute.attnum = 1
            AND attribute.attname = 'marker'
            AND type.oid = 'pg_catalog.text'::regtype
            AND attribute.attnotnull
            AND NOT attribute.atthasdef
            AND attribute.attidentity = ''
            AND attribute.attgenerated = ''
        )
        AND EXISTS (
          SELECT 1
          FROM pg_catalog.pg_attribute AS attribute
          INNER JOIN pg_catalog.pg_type AS type ON type.oid = attribute.atttypid
          WHERE attribute.attrelid = relation.oid
            AND attribute.attnum = 2
            AND attribute.attname = 'sentinel'
            AND type.oid = 'pg_catalog.text'::regtype
            AND attribute.attnotnull
            AND NOT attribute.atthasdef
            AND attribute.attidentity = ''
            AND attribute.attgenerated = ''
        )
        AND (
          SELECT count(*)
          FROM pg_catalog.pg_constraint AS constraint
          WHERE constraint.conrelid = relation.oid
        ) = 2
        AND EXISTS (
          SELECT 1
          FROM pg_catalog.pg_constraint AS constraint
          WHERE constraint.conrelid = relation.oid
            AND constraint.contype = 'p'
            AND constraint.conkey = ARRAY[1]::smallint[]
            AND constraint.convalidated
            AND NOT constraint.condeferrable
            AND NOT constraint.condeferred
        )
        AND EXISTS (
          SELECT 1
          FROM pg_catalog.pg_constraint AS constraint
          WHERE constraint.conrelid = relation.oid
            AND constraint.contype = 'c'
            AND constraint.convalidated
            AND pg_catalog.pg_get_constraintdef(constraint.oid, false) =
              'CHECK ((marker = ''task551-baseline-v1''::text))'
        )
        AND (
          SELECT count(*)
          FROM pg_catalog.pg_index AS index
          WHERE index.indrelid = relation.oid
        ) = 1
        AND NOT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_trigger AS trigger
          WHERE trigger.tgrelid = relation.oid
            AND NOT trigger.tgisinternal
        )
      ) AS exact_relation_shape_matched
    FROM target_relation
    INNER JOIN pg_catalog.pg_class AS relation
      ON relation.oid = target_relation.relation_oid
  )
  SELECT
    COALESCE(
      (SELECT exact_relation_shape_matched FROM relation_contract),
      false
    ) AS exact_relation_shape_matched,
    (SELECT count(*)::integer FROM public.task551_fixture_sentinel)
      AS table_row_count,
    (
      SELECT count(*)::integer
      FROM public.task551_fixture_sentinel
      WHERE marker = $1::text
    ) AS marker_count,
    COALESCE(
      (
        SELECT count(*) = 1 AND bool_and(
          octet_length(convert_to(sentinel, 'UTF8')) =
            octet_length(convert_to($2::text, 'UTF8'))
          AND convert_to(sentinel, 'UTF8') = convert_to($2::text, 'UTF8')
        )
        FROM public.task551_fixture_sentinel
        WHERE marker = $1::text
      ),
      false
    ) AS bound_sentinel_byte_matched
`;

// These are deliberately structural, injected test/adapter contracts. They
// contain no driver, process, environment, filesystem, or receipt capability.
// The focused suite can construct fakes from them; TASK-551-11 may not import
// or invoke them.
export type Task551FixtureBootstrapOutput = Readonly<{
  write(chunk: string): void;
}>;
export type Task551FixtureBootstrapCurrentDatabaseProof = Readonly<{
  currentDatabaseMatched: boolean;
}>;
export type Task551FixtureBootstrapMarkerProofInput = Readonly<{
  marker: typeof MARKER;
  sentinelTable: "public.task551_fixture_sentinel";
  expectedSentinel: string;
}>;
export type Task551FixtureBootstrapMarkerProof = Readonly<{
  // True only for the exact public table/column/PK/CHECK/nullability contract
  // printed in this leaf; a merely compatible or additional schema object is
  // false.
  exactRelationShapeMatched: boolean;
  // Both are finite non-negative integers. tableRowCount counts every physical
  // row in the table; markerCount counts rows whose bound marker is exactly
  // task551-baseline-v1. Existing-valid state requires both values to be 1.
  tableRowCount: number;
  markerCount: number;
  // The adapter sets this true only when the one bound marker row compares the
  // stored and supplied sentinel as equal UTF-8 byte sequences, not through a
  // JavaScript string comparison or a collation-dependent database comparison.
  boundSentinelByteMatched: boolean;
}>;
export type Task551FixtureBootstrapReadOnlyTransaction = Readonly<{
  mode: "read-only";
  readExactSentinelTableAndMarker(
    input: Task551FixtureBootstrapMarkerProofInput,
  ): Promise<Task551FixtureBootstrapMarkerProof>;
  rollback(): Promise<void>;
}>;
export type Task551FixtureBootstrapReadWriteTransaction = Readonly<{
  mode: "read-write";
  createExactSentinelTableIfAbsent(): Promise<void>;
  readExactSentinelTableAndMarker(
    input: Task551FixtureBootstrapMarkerProofInput,
  ): Promise<Task551FixtureBootstrapMarkerProof>;
  insertCanonicalMarker(
    input: Readonly<{
      marker: typeof MARKER;
      expectedSentinel: string;
    }>,
  ): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}>;
export type Task551FixtureBootstrapClient = Readonly<{
  proveExpectedDatabase(
    expectedDatabaseName: typeof EXPECTED_DATABASE_NAME,
  ): Promise<Task551FixtureBootstrapCurrentDatabaseProof>;
  beginReadOnlyTransaction(): Promise<Task551FixtureBootstrapReadOnlyTransaction>;
  beginReadWriteTransaction(): Promise<Task551FixtureBootstrapReadWriteTransaction>;
  close(): Promise<void>;
}>;
export type Task551FixtureBootstrapDeps = Readonly<{
  connect(databaseUrl: string): Promise<Task551FixtureBootstrapClient>;
}>;
export type Task551FixtureBootstrapCliResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; code: "fixture_bootstrap_invalid" }>;
export type Task551FixtureBootstrapMain = (
  argv: readonly string[],
  env: Task551FixtureBootstrapEnvironment,
  deps: Task551FixtureBootstrapDeps,
  stdout: Task551FixtureBootstrapOutput,
  stderr: Task551FixtureBootstrapOutput,
) => Promise<Task551FixtureBootstrapCliResult>;
export type Task551FixtureBootstrapCliAdapterTestSeam = Readonly<{
  run(
    childArgv: readonly string[],
    childProcessEnvironment: Task551FixtureBootstrapCliProcessEnvironment,
    createDepsWithoutConnecting: () => Task551FixtureBootstrapDeps,
    stdout: Task551FixtureBootstrapOutput,
    stderr: Task551FixtureBootstrapOutput,
    invokeMain?: Task551FixtureBootstrapMain,
  ): Promise<Task551FixtureBootstrapCliResult>;
}>;

`createCliBootstrapDepsWithoutConnecting` is private and returns only a lazy
`connect` closure; it does not construct postgres.js until `runBootstrap` has
parsed the mode and full bootstrap config. The concrete private adapter's
L03-owned `max: 1` operation pool reserves exactly one active operation
connection after that construction, runs the parameterized `SELECT
current_database() = $1::text AS current_database_matched` with fixed
`coderso02` as its sole bind, and keeps that same reservation for the following
explicit `BEGIN READ ONLY` or `BEGIN`. postgres.js necessarily also allocates
its internal subscription helper at construction, but no L03 code calls a
subscription or LISTEN API, so it has no active subscriber connection. The
adapter has no `target_session_attrs` option or URL parameter and has
`fetch_types: false`, so it does not introduce a driver preflight before that
target proof.

`readExactSentinelTableAndMarker` executes one static catalog-and-marker proof
statement whose only runtime binds are `$1::text` marker and `$2::text`
sentinel. It first checks the exact public relation's ordinary-table shape,
two text/non-null/no-default columns, single marker primary-key index, one
validated nondeferrable PK, one exact marker CHECK, and no user trigger; then it
reduces the result to the four public proof fields only. Its
`boundSentinelByteMatched` is true only for the one canonical marker row when
both `octet_length(convert_to(sentinel, 'UTF8'))` and
`convert_to(sentinel, 'UTF8') = convert_to($2::text, 'UTF8')` match the bound
sentinel; it never returns the stored or configured sentinel. The read-only
transaction exposes no DDL, insert, or commit capability and always rolls back.
The read-write transaction exposes only the listed exact-table creation and
canonical-marker insertion operations; it may commit only after its post-insert
or pre-existing proof has exact shape, `tableRowCount === 1`,
`markerCount === 1`, and `boundSentinelByteMatched === true`. Every successful
terminal transaction releases the reservation exactly once; `close` rolls back
an unexpectedly open transaction, releases an untransactioned proof lease, and
calls `pool.end()` exactly once without formatting a driver error. That one
postgres.js end call must cascade cleanup to the otherwise inert internal
subscription helper.

type FixtureBootstrapCheckRecord = Readonly<{
  schema: "coderso.task551.fixture-bootstrap-check@v1";
  taskId: "TASK-551-01-L03";
  mode: "check";
  pass: true;
  markerCount: 1;
  targetProof: "current-database-and-single-marker";
  noLeak: true;
  toolContractDigest: `sha256:${string}`;
}>;

type Task551FixtureBootstrapToolContractIdentity = Readonly<{
  schema: "coderso.task551.fixture-bootstrap-tool-contract@v1";
  taskId: "TASK-551-01-L03";
  checkRecordSchema: "coderso.task551.fixture-bootstrap-check@v1";
  checkMode: "check";
  checkMarkerCount: 1;
  checkTargetProof: "current-database-and-single-marker";
  checkNoLeak: true;
}>;

const TASK551_FIXTURE_BOOTSTRAP_TOOL_CONTRACT_IDENTITY = Object.freeze({
  schema: "coderso.task551.fixture-bootstrap-tool-contract@v1",
  taskId: "TASK-551-01-L03",
  checkRecordSchema: "coderso.task551.fixture-bootstrap-check@v1",
  checkMode: "check",
  checkMarkerCount: 1,
  checkTargetProof: "current-database-and-single-marker",
  checkNoLeak: true,
} satisfies Task551FixtureBootstrapToolContractIdentity);

export function getTask551FixtureBootstrapToolContractIdentity(): Task551FixtureBootstrapToolContractIdentity {
  // Return this static public identity only. Do not accept arguments or read
  // environment, argv, database, clock, filesystem, receipt, target, URL,
  // user, confirmation, sentinel, SQL, timing, or platform state.
  return TASK551_FIXTURE_BOOTSTRAP_TOOL_CONTRACT_IDENTITY;
}

export function getTask551FixtureBootstrapToolContractDigest(): `sha256:${string}` {
  // `canonicalize` is used as the RFC 8785/JCS canonical JSON encoder; do not
  // substitute JSON.stringify or a source-text hash. The static identity above
  // has no secret or runtime input. The returned digest must match
  // /^sha256:[0-9a-f]{64}$/ exactly.
  const canonicalIdentity = canonicalize(
    getTask551FixtureBootstrapToolContractIdentity(),
  );
  if (typeof canonicalIdentity !== "string") {
    throw new Error("fixture_bootstrap_invalid");
  }
  const hex = createHash("sha256")
    .update(canonicalIdentity, "utf8")
    .digest("hex");
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error("fixture_bootstrap_invalid");
  }
  return `sha256:${hex}`;
}

function createFixtureBootstrapCheckRecord(): FixtureBootstrapCheckRecord {
  return {
    schema: "coderso.task551.fixture-bootstrap-check@v1",
    taskId: "TASK-551-01-L03",
    mode: "check",
    pass: true,
    markerCount: 1,
    targetProof: "current-database-and-single-marker",
    noLeak: true,
    toolContractDigest: getTask551FixtureBootstrapToolContractDigest(),
  };
}

function parseMode(argv: readonly string[]): BootstrapMode {
  // Permit exactly one recognized flag. Default, duplicate, combined, or
  // unknown flags fail before opening a client. This helper emits no diagnostic;
  // the outer `main` boundary maps every thrown value to the stable code.
}

function assertExactBootstrapEnvironmentKeySet(
  env: BootstrapEnvironment,
): void {
  // Before any configured value is read or a client exists, enumerate only
  // environment key names. Filter that list to the bootstrap prefix and allow
  // exactly BOOTSTRAP_ENV_KEYS. Reject an extra prefixed name or a direct
  // FORBIDDEN_DATABASE_SOURCE_ENV_KEYS name so the outer boundary emits
  // fixture_bootstrap_invalid. Never read/dereference/coerce an unrelated
  // key's value while performing this namespace check.
}

function snapshotL11InjectedBootstrapEnvironmentForCli(
  childProcessEnvironment: CliProcessEnvironment,
): BootstrapEnvironment {
  // This pure adapter helper receives its input from the one guarded
  // `import.meta.main` wrapper below; it does not reference process.env itself.
  // Enumerate Object.keys(childProcessEnvironment) exactly once and inspect only
  // names. Permit the four BOOTSTRAP_ENV_KEYS plus the five fixed OS names, but
  // reject every direct DATABASE_URL3/DATABASE_URL/DATABASE_DIRECT_URL name,
  // every other URL/database-name alias, every extra TASK551_* name, inherited
  // member, or unexpected transport key before reading any value. Then read each
  // of the four BOOTSTRAP_ENV_KEYS exactly once, require a present string, and
  // copy only those values into a newly allocated own-property four-key map.
  // Do not copy OS keys; do not spread, merge, retain, or return the process map.
  // Run assertExactBootstrapEnvironmentKeySet on the fresh map, leaving detailed
  // URL/name/confirmation/sentinel validation to parseBootstrapConfig.
  const names = Object.keys(childProcessEnvironment);
  assertExactL11CliBootstrapTransportKeyNames(childProcessEnvironment, names);
  const snapshot = Object.freeze({
    TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL:
      readOneOwnedCliBootstrapString(childProcessEnvironment,
        "TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL"),
    TASK551_FIXTURE_BOOTSTRAP_DATABASE_NAME:
      readOneOwnedCliBootstrapString(childProcessEnvironment,
        "TASK551_FIXTURE_BOOTSTRAP_DATABASE_NAME"),
    TASK551_FIXTURE_BOOTSTRAP_CONFIRMATION:
      readOneOwnedCliBootstrapString(childProcessEnvironment,
        "TASK551_FIXTURE_BOOTSTRAP_CONFIRMATION"),
    TASK551_FIXTURE_BOOTSTRAP_SENTINEL:
      readOneOwnedCliBootstrapString(childProcessEnvironment,
        "TASK551_FIXTURE_BOOTSTRAP_SENTINEL"),
  });
  assertExactBootstrapEnvironmentKeySet(snapshot);
  return snapshot;
}

function assertExactL11CliBootstrapTransportKeyNames(
  childProcessEnvironment: CliProcessEnvironment,
  names: readonly string[],
): void {
  // Name-only helper: require every listed name to be own/enumerable, allow only
  // BOOTSTRAP_ENV_KEYS plus the L11-owned OS-key allowlist, and reject
  // every forbidden direct source, alternate URL/database-name alias, extra
  // TASK551_* key, or other transport key. It must not read any property value.
}

function readOneOwnedCliBootstrapString(
  childProcessEnvironment: CliProcessEnvironment,
  key: BootstrapEnvironmentKey,
): string {
  // Read childProcessEnvironment[key] exactly once after the name-only pass.
  // Reject absent/non-string values with only fixture_bootstrap_invalid; never
  // format the key's value. This helper may not inspect a different key.
}

async function runCliEntryFromL11ChildProcess(
  childArgv: readonly string[],
  childProcessEnvironment: CliProcessEnvironment,
  createDepsWithoutConnecting: () => Task551FixtureBootstrapDeps,
  stdout: Task551FixtureBootstrapOutput,
  stderr: Task551FixtureBootstrapOutput,
  invokeMain: Task551FixtureBootstrapMain = main,
): Promise<Task551FixtureBootstrapCliResult> {
  // CLI-bound adapter seam only: snapshot the exact four-key map before calling
  // main(childArgv, map, createDepsWithoutConnecting(), stdout, stderr). Wrap
  // snapshot/dependency-factory failures in the same redacted result boundary;
  // do not let a pre-main failure expose a cause. The dependency factory creates
  // no client, and main still parses the map before runBootstrap calls connect.
  // The optional injected main is only the focused-test seam; production uses
  // the private main default. This function does not read process state itself.
  try {
    let env = snapshotL11InjectedBootstrapEnvironmentForCli(
      childProcessEnvironment,
    );
    childProcessEnvironment = undefined as never;
    const completion = invokeMain(
      childArgv,
      env,
      createDepsWithoutConnecting(),
      stdout,
      stderr,
    );
    env = undefined as never; // adapter retains its own start-bound argument, not this lexical map
    const result = await completion;
    return result;
  } catch {
    writeOnlyRedactedFailure(stderr);
    return { ok: false, code: "fixture_bootstrap_invalid" };
  }
}

// This is the sole named non-helper runtime export available to the focused L03
// test; its companion structural type exports are compile-time only.
// Object construction only captures private function references: it does not
// read argv/environment, create a client, emit output, or start a CLI action.
// TASK-551-11 must import only the two pure identity/digest helpers above, never
// this seam or any of the exported adapter types.
export const task551FixtureBootstrapCliAdapterTestSeam = Object.freeze({
  run: runCliEntryFromL11ChildProcess,
} satisfies Task551FixtureBootstrapCliAdapterTestSeam);

function assertStrictPostgresConnectionString(databaseUrl: string): void {
  // Validate raw structure before URL normalization. postgres.js derives its
  // multi-host input from the raw authority, so URL.hostname alone cannot prove
  // that one host target will reach the constructor.
  const schemePrefix = databaseUrl.startsWith("postgres://")
    ? "postgres://"
    : databaseUrl.startsWith("postgresql://")
      ? "postgresql://"
      : undefined;
  if (!schemePrefix) throw new Error("fixture_bootstrap_invalid");

  const authorityStart = schemePrefix.length;
  const rawFragmentOffset = databaseUrl.indexOf("#", authorityStart);
  if (rawFragmentOffset !== -1) {
    // Reject the raw delimiter because new URL normalizes a trailing-empty #.
    throw new Error("fixture_bootstrap_invalid");
  }
  const rawQuestionOffset = databaseUrl.indexOf("?", authorityStart);
  const rawSearch =
    rawQuestionOffset === -1 ? "" : databaseUrl.slice(rawQuestionOffset);
  if (rawSearch !== "" && rawSearch !== ALLOWED_POSTGRES_URL_SEARCH) {
    // In particular, a bare trailing ? is invalid rather than normalized away.
    throw new Error("fixture_bootstrap_invalid");
  }

  // Match postgres.js parseUrl authority splitting: after the scheme through
  // the first raw /, ?, or #. The # is already rejected but remains in this
  // boundary calculation to keep the grammar explicit and conservative.
  const rawSlashOffset = databaseUrl.indexOf("/", authorityStart);
  const rawAuthorityEnd = Math.min(
    rawSlashOffset === -1 ? databaseUrl.length : rawSlashOffset,
    rawQuestionOffset === -1 ? databaseUrl.length : rawQuestionOffset,
    rawFragmentOffset === -1 ? databaseUrl.length : rawFragmentOffset,
  );
  const rawAuthority = databaseUrl.slice(authorityStart, rawAuthorityEnd);
  const firstRawAt = rawAuthority.indexOf("@");
  if (firstRawAt <= 0 || firstRawAt !== rawAuthority.lastIndexOf("@")) {
    // Require exactly one raw userinfo boundary, as the driver uses its first.
    throw new Error("fixture_bootstrap_invalid");
  }

  let decodedDriverAuthority: string;
  try {
    decodedDriverAuthority = decodeURIComponent(
      rawAuthority.slice(firstRawAt + 1),
    );
  } catch {
    throw new Error("fixture_bootstrap_invalid");
  }
  if (
    decodedDriverAuthority.length === 0 ||
    /[,@/?#]/u.test(decodedDriverAuthority)
  ) {
    // Reject raw/encoded comma multi-host and raw/decoded authority ambiguity.
    throw new Error("fixture_bootstrap_invalid");
  }

  // Only now use URL for standard scheme, host, user, and database-path checks.
  // Explicit host, user, and database path prevent postgres.js defaults. Port
  // is intentionally optional: absent means deterministic 5432 in the PG-free
  // L11 child, never PGPORT. Passwordless authentication remains possible, but
  // the child denies an environment password fallback.
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("fixture_bootstrap_invalid");
  }
  if (
    (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") ||
    parsed.hostname.length === 0 ||
    parsed.username.length === 0 ||
    parsed.pathname === "/" ||
    parsed.pathname.length === 0 ||
    parsed.hash.length !== 0
  ) {
    throw new Error("fixture_bootstrap_invalid");
  }
}

function parseBootstrapConfig(env: BootstrapEnvironment): BootstrapConfig {
  // First call assertExactBootstrapEnvironmentKeySet(env). Then read values
  // only for the four TASK551_FIXTURE_BOOTSTRAP_* keys. Require
  // DATABASE_NAME === EXPECTED_DATABASE_NAME before any client exists; reject
  // every other nonempty name rather than treating it as an allowed target.
  // DATABASE_URL is only L11's broker-derived private child-map value; never
  // read a raw source, process.env, dotenv, or a generic URL fallback here.
  // Require the fixed confirmation, a nonempty supplied child URL with UTF-8
  // byte length <= DATABASE_URL_MAX_UTF8_BYTES, and an opaque sentinel with
  // UTF-8 byte length in SENTINEL_MIN_UTF8_BYTES..SENTINEL_MAX_UTF8_BYTES.
  // Measure encoded bytes (for example with Buffer.byteLength(value, "utf8")),
  // never JavaScript string.length. An absent, non-string, oversized, or
  // out-of-range value throws only fixture_bootstrap_invalid before a client is
  // created and is never formatted into an error, log, or receipt. Finally call
  // assertStrictPostgresConnectionString on the already bounded URL; it neither
  // reads environment nor returns a parsed URL/credential object.
}

function createCliBootstrapDepsWithoutConnecting(): Task551FixtureBootstrapDeps {
  // This factory is invoked by the guarded CLI wrapper only after it has copied
  // the four child values. It creates no postgres.js client, opens no socket,
  // reads no environment, and retains no URL. Its returned connect function is
  // called only by runBootstrap after parseMode and parseBootstrapConfig pass.
  return Object.freeze({
    connect: async (databaseUrl) =>
      createTask551PostgresBootstrapClient(
        databaseUrl,
        postgres as unknown as Task551PostgresFactory,
      ),
  });
}

function assertExactBootstrapMarkerInput(
  input: Task551FixtureBootstrapMarkerProofInput,
): void {
  if (
    input.marker !== MARKER ||
    input.sentinelTable !== "public.task551_fixture_sentinel"
  ) {
    throw new Error("fixture_bootstrap_invalid");
  }
}

function normalizeCurrentDatabaseProof(
  rows: readonly Task551PostgresRow[],
): Task551FixtureBootstrapCurrentDatabaseProof {
  // Do not return a database name or a driver row. This adapter surface reduces
  // the raw result to one boolean before it crosses into the public contract.
  return Object.freeze({
    currentDatabaseMatched:
      rows.length === 1 && rows[0]?.current_database_matched === true,
  });
}

function normalizeMarkerProof(
  rows: readonly Task551PostgresRow[],
): Task551FixtureBootstrapMarkerProof {
  // The static catalog/marker query selects exactly these non-secret scalar
  // fields. Reject a malformed result instead of exposing its row or values.
  const row = rows.length === 1 ? rows[0] : undefined;
  if (
    !row ||
    typeof row.exact_relation_shape_matched !== "boolean" ||
    typeof row.table_row_count !== "number" ||
    typeof row.marker_count !== "number" ||
    typeof row.bound_sentinel_byte_matched !== "boolean"
  ) {
    throw new Error("fixture_bootstrap_invalid");
  }
  return Object.freeze({
    exactRelationShapeMatched: row.exact_relation_shape_matched,
    tableRowCount: row.table_row_count,
    markerCount: row.marker_count,
    boundSentinelByteMatched: row.bound_sentinel_byte_matched,
  });
}

function createTask551PostgresBootstrapClient(
  databaseUrl: string,
  createPostgresClient: Task551PostgresFactory,
): Task551FixtureBootstrapClient {
  // This is the only L03-owned postgres.js construction site. Its caller has already
  // parsed and structurally validated databaseUrl, and the real L11 child map
  // is exact/non-inherited/PG-free. postgres@3.4.9 may read process.env inside
  // this call only; this function itself never does. That construction always
  // allocates the driver's internal subscription-helper subclient/pool too.
  // L03 invokes no subscription or LISTEN API, so the helper has no active
  // subscriber connection. The main operation pool alone is max:1 and yields
  // the one reserved connection used from target proof through transaction.
  // No result/error is logged.
  const pool = createPostgresClient(
    databaseUrl,
    TASK551_BOOTSTRAP_POSTGRES_OPTIONS,
  );
  const lease: Task551ReservedLease = {
    reserved: undefined,
    releaseAttempted: false,
    transactionState: "none",
  };
  let targetProved = false;
  let poolEnded = false;

  async function reserveForTargetProof(): Promise<Task551ReservedPostgresQuery> {
    if (lease.reserved) return lease.reserved;
    if (lease.releaseAttempted || poolEnded) {
      throw new Error("fixture_bootstrap_invalid");
    }
    lease.reserved = await pool.reserve();
    return lease.reserved;
  }

  function requireProvedIdleReservation(): Task551ReservedPostgresQuery {
    if (
      !targetProved ||
      !lease.reserved ||
      lease.releaseAttempted ||
      lease.transactionState !== "none"
    ) {
      throw new Error("fixture_bootstrap_invalid");
    }
    return lease.reserved;
  }

  function requireOpenReservation(
    mode: "read-only" | "read-write",
  ): Task551ReservedPostgresQuery {
    if (
      !lease.reserved ||
      lease.releaseAttempted ||
      lease.transactionState !== mode
    ) {
      throw new Error("fixture_bootstrap_invalid");
    }
    return lease.reserved;
  }

  function releaseReservedConnectionExactlyOnce(): void {
    if (lease.releaseAttempted) return;
    const reserved = lease.reserved;
    if (!reserved) {
      throw new Error("fixture_bootstrap_invalid");
    }
    // Mark before release so a throwing release remains exactly one attempt.
    lease.releaseAttempted = true;
    lease.reserved = undefined;
    reserved.release();
  }

  async function rollbackOpenTransactionAndRelease(): Promise<void> {
    if (
      lease.transactionState === "committed" ||
      lease.transactionState === "rolled-back"
    ) {
      return;
    }
    const reserved = lease.reserved;
    if (!reserved || lease.releaseAttempted) {
      throw new Error("fixture_bootstrap_invalid");
    }
    let failed = false;
    try {
      await reserved.unsafe(ROLLBACK_SQL);
    } catch {
      failed = true;
    } finally {
      lease.transactionState = "rolled-back";
      try {
        releaseReservedConnectionExactlyOnce();
      } catch {
        failed = true;
      }
    }
    if (failed) throw new Error("fixture_bootstrap_invalid");
  }

  async function readExactSentinelTableAndMarker(
    mode: "read-only" | "read-write",
    input: Task551FixtureBootstrapMarkerProofInput,
  ): Promise<Task551FixtureBootstrapMarkerProof> {
    assertExactBootstrapMarkerInput(input);
    const rows = await requireOpenReservation(mode).unsafe(
      READ_EXACT_SENTINEL_TABLE_AND_MARKER_SQL,
      [input.marker, input.expectedSentinel],
    );
    return normalizeMarkerProof(rows);
  }

  function createReadOnlyTransaction(): Task551FixtureBootstrapReadOnlyTransaction {
    return Object.freeze({
      mode: "read-only" as const,
      readExactSentinelTableAndMarker: (input) =>
        readExactSentinelTableAndMarker("read-only", input),
      rollback: rollbackOpenTransactionAndRelease,
    });
  }

  function createReadWriteTransaction(): Task551FixtureBootstrapReadWriteTransaction {
    return Object.freeze({
      mode: "read-write" as const,
      createExactSentinelTableIfAbsent: async () => {
        await requireOpenReservation("read-write").unsafe(
          CREATE_EXACT_SENTINEL_TABLE_SQL,
        );
      },
      readExactSentinelTableAndMarker: (input) =>
        readExactSentinelTableAndMarker("read-write", input),
      insertCanonicalMarker: async (input) => {
        if (input.marker !== MARKER) {
          throw new Error("fixture_bootstrap_invalid");
        }
        await requireOpenReservation("read-write").unsafe(
          INSERT_CANONICAL_MARKER_SQL,
          [input.marker, input.expectedSentinel],
        );
      },
      commit: async () => {
        const reserved = requireOpenReservation("read-write");
        // On a failed COMMIT retain the reservation/open state so the caller's
        // mandatory rollback attempt uses this same session. On success, release
        // exactly once; a release failure is redacted by the outer boundary.
        await reserved.unsafe(COMMIT_SQL);
        lease.transactionState = "committed";
        releaseReservedConnectionExactlyOnce();
      },
      rollback: rollbackOpenTransactionAndRelease,
    });
  }

  return Object.freeze({
    proveExpectedDatabase: async (expectedDatabaseName) => {
      if (expectedDatabaseName !== EXPECTED_DATABASE_NAME) {
        throw new Error("fixture_bootstrap_invalid");
      }
      const rows = await (await reserveForTargetProof()).unsafe(
        CURRENT_DATABASE_PROOF_SQL,
        [expectedDatabaseName],
      );
      const proof = normalizeCurrentDatabaseProof(rows);
      targetProved = proof.currentDatabaseMatched;
      return proof;
    },
    beginReadOnlyTransaction: async () => {
      await requireProvedIdleReservation().unsafe(BEGIN_READ_ONLY_SQL);
      lease.transactionState = "read-only";
      return createReadOnlyTransaction();
    },
    beginReadWriteTransaction: async () => {
      await requireProvedIdleReservation().unsafe(BEGIN_READ_WRITE_SQL);
      lease.transactionState = "read-write";
      return createReadWriteTransaction();
    },
    close: async () => {
      if (poolEnded) return;
      poolEnded = true;
      let failed = false;
      try {
        if (
          lease.transactionState === "read-only" ||
          lease.transactionState === "read-write"
        ) {
          await rollbackOpenTransactionAndRelease();
        } else if (lease.reserved && !lease.releaseAttempted) {
          releaseReservedConnectionExactlyOnce();
        }
      } catch {
        failed = true;
      } finally {
        try {
          // postgres@3.4.9 cascades this one main-pool end call to the inert
          // subscription helper's internal client cleanup as well.
          await pool.end();
        } catch {
          failed = true;
        }
      }
      if (failed) throw new Error("fixture_bootstrap_invalid");
    },
  });
}

async function proveFixtureTarget(
  client: Task551FixtureBootstrapClient,
  config: BootstrapConfig,
): Promise<void> {
  // The injected client executes only the parameterized
  // SELECT current_database() = $1::text AS current_database_matched query
  // described above, with EXPECTED_DATABASE_NAME as its sole bind. A false,
  // malformed, or missing currentDatabaseMatched result, or any driver error,
  // throws without formatting; only outer main maps it to the stable redacted
  // code. config is present only to make the target/config dependency explicit
  // and must not be interpolated into a query.
  const proof = await client.proveExpectedDatabase(config.databaseName);
  if (proof.currentDatabaseMatched !== true) {
    throw new Error("fixture_bootstrap_invalid");
  }
}

function markerProofInput(
  config: BootstrapConfig,
): Task551FixtureBootstrapMarkerProofInput {
  return {
    marker: MARKER,
    sentinelTable: "public.task551_fixture_sentinel",
    expectedSentinel: config.sentinel,
  };
}

function assertFiniteNonNegativeInteger(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("fixture_bootstrap_invalid");
  }
}

function assertExactExistingMarkerProof(
  proof: Task551FixtureBootstrapMarkerProof,
): void {
  assertFiniteNonNegativeInteger(proof.tableRowCount);
  assertFiniteNonNegativeInteger(proof.markerCount);
  if (
    proof.exactRelationShapeMatched !== true ||
    proof.tableRowCount !== 1 ||
    proof.markerCount !== 1 ||
    proof.boundSentinelByteMatched !== true
  ) {
    throw new Error("fixture_bootstrap_invalid");
  }
}

function assertExactEmptyMarkerProof(
  proof: Task551FixtureBootstrapMarkerProof,
): void {
  assertFiniteNonNegativeInteger(proof.tableRowCount);
  assertFiniteNonNegativeInteger(proof.markerCount);
  if (
    proof.exactRelationShapeMatched !== true ||
    proof.tableRowCount !== 0 ||
    proof.markerCount !== 0 ||
    proof.boundSentinelByteMatched !== false
  ) {
    throw new Error("fixture_bootstrap_invalid");
  }
}

async function validateExistingMarkerReadOnly(
  client: Task551FixtureBootstrapClient,
  config: BootstrapConfig,
): Promise<void> {
  const tx = await client.beginReadOnlyTransaction();
  try {
    // A check transaction may only inspect the exact relation and request the
    // bounded proof. It has no mutating or commit operation and rolls back even
    // on a successful proof, matching L02's rolled-back one-marker/sentinel-byte
    // terminology.
    const proof = await tx.readExactSentinelTableAndMarker(
      markerProofInput(config),
    );
    assertExactExistingMarkerProof(proof);
  } finally {
    await tx.rollback();
  }
}

async function initializeOrValidateExistingMarkerReadWrite(
  client: Task551FixtureBootstrapClient,
  config: BootstrapConfig,
): Promise<void> {
  const tx = await client.beginReadWriteTransaction();
  let committed = false;
  try {
    // This is the sole DDL operation. The adapter emits exactly the fixed
    // CREATE TABLE IF NOT EXISTS statement specified by this leaf and no other
    // schema or data mutation.
    await tx.createExactSentinelTableIfAbsent();
    const firstProof = await tx.readExactSentinelTableAndMarker(
      markerProofInput(config),
    );
    try {
      assertExactExistingMarkerProof(firstProof);
    } catch {
      // Initialization is permitted only from a structurally exact empty table,
      // never to repair a wrong/duplicate/extra marker or a mismatched sentinel.
      assertExactEmptyMarkerProof(firstProof);
      await tx.insertCanonicalMarker({
        marker: MARKER,
        expectedSentinel: config.sentinel,
      });
      const insertedProof = await tx.readExactSentinelTableAndMarker(
        markerProofInput(config),
      );
      assertExactExistingMarkerProof(insertedProof);
    }
    await tx.commit();
    committed = true;
  } catch {
    // A work or commit failure makes one rollback attempt before the redacted
    // outer boundary receives the failure. A rollback failure likewise reaches
    // that boundary without an observed driver cause.
    if (!committed) {
      await tx.rollback();
    }
    throw new Error("fixture_bootstrap_invalid");
  }
}

async function validateMarker(
  client: Task551FixtureBootstrapClient,
  config: BootstrapConfig,
  mode: BootstrapMode,
): Promise<void> {
  if (mode === "check") {
    await validateExistingMarkerReadOnly(client, config);
    return;
  }
  await initializeOrValidateExistingMarkerReadWrite(client, config);
}

async function runBootstrap(
  argv: readonly string[],
  env: BootstrapEnvironment,
  deps: Task551FixtureBootstrapDeps,
): Promise<FixtureBootstrapCheckRecord | undefined> {
  // Do not catch, log, wrap, or emit errors here. `main` below is the one
  // total redaction boundary for parse/connect/proof/transaction/rollback/
  // cleanup/close failures. Keeping this helper emission-free also means a
  // close failure prevents a successful --check record from being returned.
  let client: Task551FixtureBootstrapClient | undefined;
  try {
    const mode = parseMode(argv);
    const config = parseBootstrapConfig(env); // all validation before connect
    client = await deps.connect(config.databaseUrl);
    await proveFixtureTarget(client, config);
    await validateMarker(client, config, mode);
    if (mode === "check") {
      // Return only fixed non-secret values after exact target/table/marker/
      // sentinel validation. The digest is derived from the versioned tool
      // contract, never from the target, config, SQL, timing, or a receipt.
      return createFixtureBootstrapCheckRecord();
    }
  } finally {
    // Always await close after a client was created. If this rejects, it is
    // deliberately allowed to reach the outer `main` boundary below; it must
    // never replace a failure with a raw driver diagnostic or skip redaction.
    if (client) {
      await client.close();
    }
  }
}

function writeOnlyRedactedFailure(stderr: Task551FixtureBootstrapOutput): void {
  // The diagnostic channel is best effort: never let an unavailable stream
  // expose a cause or create an unhandled rejection. This function receives no
  // error object and may emit only the stable code plus a newline.
  try {
    stderr.write("fixture_bootstrap_invalid\n");
  } catch {
    // Intentionally empty: the CLI still returns the same machine-readable
    // result below and never attempts to serialize an underlying cause.
  }
}

async function main(
  argv: readonly string[],
  env: BootstrapEnvironment,
  deps: Task551FixtureBootstrapDeps,
  stdout: Task551FixtureBootstrapOutput,
  stderr: Task551FixtureBootstrapOutput,
): Promise<Task551FixtureBootstrapCliResult> {
  // This is the one outer, total error/redaction boundary. It covers parsing,
  // config validation, connect, target proof, explicit read-only/read-write
  // transaction begin/work/commit/rollback, all cleanup, and close.
  // Nothing below it receives, formats, logs, or rethrows a caught cause.
  try {
    const record = await runBootstrap(argv, env, deps);
    if (record) {
      // This is reachable only after transaction cleanup and close completed.
      // The successful --check path writes exactly this one fixed JSON line;
      // --initialize returns undefined and stays silent.
      stdout.write(`${JSON.stringify(record)}\n`);
    }
    return { ok: true };
  } catch {
    // A rollback or close error is indistinguishable from every other failure
    // at the CLI boundary. Do not inspect `cause`, concatenate Error text, or
    // expose a stack; the return and optional stderr bytes stay stable.
    writeOnlyRedactedFailure(stderr);
    return { ok: false, code: "fixture_bootstrap_invalid" };
  }
}

if (import.meta.main) {
  // The only L03-owned production argv/environment reads in this module.
  // `slice(2)` and process.env each occur exactly once here. The separate
  // postgres.js construction-time transitive lookup is constrained above.
  // The adapter first snapshots the exact four owned child values and routes any
  // pre-main failure to the same redacted result boundary; it never loads dotenv,
  // merges an ambient map, or adds a fallback configuration path.
  const result = await runCliEntryFromL11ChildProcess(
    process.argv.slice(2),
    process.env,
    createCliBootstrapDepsWithoutConnecting,
    process.stdout,
    process.stderr,
  );
  process.exitCode = result.ok ? 0 : 1;
}
```

`task551FixtureBootstrapCliAdapterTestSeam` is the sole named non-helper test
seam. It accepts injected argv, a child-map-shaped environment, dependency
factory, output sinks, and (only in tests) an injected `main` implementation;
it never references `process.argv` or `process.env`. The private `runBootstrap`,
`main`, and map-snapshot helpers remain reachable only through that seam's
adapter call. Only the actual CLI-only entry wrapper, guarded by
`if (import.meta.main)`, may snapshot L11's already non-inherited child
transport. It reads child argv once and reads exactly the four owned bootstrap
values once only after its key-name pass, copies them to a fresh four-key map,
then passes that map and argv into private `main`. It must not discover, merge,
spread, retain, or fall back to an ambient/generic environment. Importing the
module, calling either pure helper, or importing the named seam has no CLI,
database, filesystem, dotenv, argv, or environment-read side effect. The
focused Bun suite never invokes the `import.meta.main` wrapper and uses only
explicit fake values.

Keep the client adapter injectable. It must record no sensitive data and expose
only the typed parameterized operations required for target proof, exact relation
validation, marker read/insert, explicit read-only/read-write transaction
begin/commit/rollback, and close. Do not import L02 fixture/seed/cleanup modules.
Route all caught driver or permission errors to the outer `main` boundary above.
The read-only `--check` transaction has no commit surface and always makes one
rollback attempt in `finally`; the read-write `--initialize` transaction makes
one rollback attempt when work or commit fails and otherwise commits once after
the exact postcondition. Neither path logs a cause. `runBootstrap` awaits
`client.close()` in `finally` whether the transaction succeeds or fails, and the
outer boundary maps any rollback/close failure to only
`fixture_bootstrap_invalid`, without logging a raw cause.

The following is TASK-551-11-owned caller-side invocation pseudocode, included
to pin the environment separation and command order. It is not code imported,
exported, or owned by this L03 tool:

```ts
const staticEvidenceChildEnv = createFreshStaticEvidenceEnvironment();
// TASK-551-11 asserts its Task551StaticEvidenceEnvironmentV1 contract here:
// exact empty/OS-only map; no DATABASE_*, TASK551_*, bootstrap, or fixture key.
try {
  await runFocusedBootstrapTest({
    argv: [
      "bun",
      "--env-file=/dev/null",
      "test",
      "tests/perf/task551FixtureTargetBootstrap.test.ts",
    ],
    childEnv: staticEvidenceChildEnv,
  });
} finally {
  discardStaticEvidenceEnvironment(staticEvidenceChildEnv);
}

function startFreshL03Child(expected: Task551PhaseBrokerContextV1, argv: readonly string[]): Bun.Process {
  let values = consumeFreshL03BrokerToFixtureValues(expected);
  let childEnv = buildExactL03ChildEnv(values);
  try { return startFixtureBootstrapCliSynchronously({ argv, childEnv }); }
  finally { discardExactL03ChildEnv(childEnv); childEnv = undefined as never; discardExactL03FixtureValues(values); values = undefined as never; }
}
const initializeChild = startFreshL03Child(TASK551_PHASE_BROKER_CONTEXTS.l03Initialize, ["--initialize"]);
try { const receipt = await captureRedactedL03OperationReceipt({ operation: "initialize", child: initializeChild }); acceptExactL03Receipt(receipt); }
finally { await disposeTask551Child(initializeChild); }
const checkChild = startFreshL03Child(TASK551_PHASE_BROKER_CONTEXTS.l03Check, ["--check"]);
try { const receipt = await captureRedactedL03OperationReceipt({ operation: "check", child: checkChild }); await captureValidateAndDurablyAcceptRedactedL03CheckEvidence(receipt); }
finally { await disposeTask551Child(checkChild); }
// Each cycle clears broker/source/fixtureValues/childEnv/launch before capture; no L02 handoff.
```

`consumeFreshL03BrokerToFixtureValues` is the synchronous L11 hidden boundary:
it consumes the one-shot `consumeOnce(expected: Task551PhaseBrokerContextV1)`
before it returns four resolved fixture values. The expected context must equal the
closed L03 initialize/check table row before supplier/source access. Each call
consumes exactly one fresh author-audit broker and drops that broker
and its raw source. No broker/source/fixtureValues/childEnv/launch reference may
survive an await; no unresolved `Promise` may reach
`buildExactL03ChildEnv`. It never makes L03 read `DATABASE_URL3`, dotenv, or an
ambient environment. The static child is complete and discarded before either
real fixture operation begins. Each real operation separately launches, captures
its redacted command receipt, and disposes its actual `childEnv` and broker-
derived values before the next operation may acquire a new broker. Neither operation is
an L02 handoff: L02's DB-free static/manifest finalization remains a separate,
environment-free phase, and each later L02 operation gets a separately fresh
broker under L02's own contract.

## Testing Requirements

`tests/perf/task551FixtureTargetBootstrap.test.ts` is one of L01's default-Bun
planned suites and must remain DB-free and static/mock-only. It imports no live
target, runtime DB client, L02 fixture, or production `import.meta.main` entry
wrapper. It imports only the two pure helpers, the named
`task551FixtureBootstrapCliAdapterTestSeam`, and its structural type exports;
it exercises that seam with explicit argv/environment arguments, in-memory
adapters, injected private-main callbacks, and fake output sinks. It makes zero
real database or network connection, DDL, or CLI database action, and it never
reads generic or fixture `process.env` values even when a repository `.env` is
present. It must prove only this leaf's adapter/config/mock-database behavior:

- the ordinary default-Bun focused test receives no injected static/fixture map
  at all. It remains DB-free with an absent, present, or poisoned ambient
  environment because its imports and test code never read it. Local in-memory
  `Task551FixtureBootstrapEnvironment` values exist only as explicit seam
  inputs and are never an actual test-process map;
- the named CLI-adapter seam receives an own-property fake child environment and
  fake argv, never the test process's `process.env` or `process.argv`. It proves
  one key-name enumeration, rejection before value access of direct
  `DATABASE_URL3`/`DATABASE_URL`/`DATABASE_DIRECT_URL`, every extra
  `TASK551_FIXTURE_BOOTSTRAP_*` or `TASK551_*` name, every URL/database-name
  alias, inherited member, and unexpected transport key. With the exact four
  bootstrap names plus only the permitted OS-key names, it reads each owned
  value once, copies no OS key, produces a new exact four-key map, and passes
  only that map plus argv to `main`; no spread/merge/retained parent map,
  dotenv lookup, generic fallback, log, or client action is permitted;
- import and pure-helper regressions prove the production `if (import.meta.main)`
  block is not evaluated during module import or focused tests. A source/adapter
  contract assertion pins that this is the sole **L03-owned**
  `process.env`/`process.argv` read site, it is guarded by `import.meta.main`,
  and it snapshots values before `main` can connect; fake getters on unrelated
  values prove neither imports nor pure seams dereference them. That assertion
  explicitly excludes postgres.js's transitive construction-time implementation
  read: the focused suite uses injected fakes and must not falsely claim that a
  fake adapter exercised or eliminated the real driver's `parseOptions` read;
- a static production-adapter contract check proves that the sole
  `postgres(databaseUrl, TASK551_BOOTSTRAP_POSTGRES_OPTIONS)` construction is
  private and reachable only through lazy `connect` after parsed config. It pins
  `max: 1`, `debug: false`, `fetch_types: false`, no `timeout`, no
  `target_session_attrs`, fixed no-op callbacks, and the raw URL grammar: no
  raw `#`, no raw query or exactly one raw `?sslmode=require` (never a bare
  `?`), exactly one raw authority `@`, and a decodable driver authority with no
  comma or decoded structural delimiter. It proves no URL query can override
  static `application_name` or UTF-8 startup settings and that
  `URL.hostname` is never treated as sufficient one-host proof. It documents
  postgres.js's unavoidable inert internal subscription helper, pins that L03
  invokes no subscription/LISTEN API or active subscriber connection, then pins
  the exact one-operation-connection `reserve`/`BEGIN READ ONLY` or
  `BEGIN`/`COMMIT` or `ROLLBACK`/single `release` lifecycle and one `pool.end()`
  call that cascades helper cleanup. It checks source text or an equivalent
  structural fixture only; it does not invoke postgres.js, open a connection,
  or read the test process environment;
- missing/malformed variables, an unexpected
  `TASK551_FIXTURE_BOOTSTRAP_*` key, a configured database name other than the
  literal `coderso02`, direct `DATABASE_URL3`, generic `DATABASE_URL`, or
  `DATABASE_DIRECT_URL` fallback attempts, default/no flag, duplicate/both
  modes, and unknown CLI arguments fail before connection and make no mutation;
- bounded-value regressions accept a nonempty URL at exactly 4,096 UTF-8 bytes
  and sentinels at exactly 32 and 512 UTF-8 bytes, while rejecting an empty URL,
  a 4,097-byte URL, and 31- or 513-byte sentinels before connection. ASCII and
  multibyte vectors prove the implementation measures encoded UTF-8 bytes rather
  than JavaScript character count; no rejected value may reach output, a log,
  fake-client input, receipt, snapshot, or error detail;
- strict-URL regressions accept only a bounded `postgres:` or `postgresql:` URL
  with explicit host, user, and database path. They accept an absent port as the
  deterministic 5432 default in the PG-free L11 child and accept the one exact
  raw `?sslmode=require` form. They reject a missing required component, every
  raw fragment including a trailing-empty `#`, a bare trailing `?`, duplicate
  `sslmode`, percent/case-altered `sslmode`, a trailing extra query separator,
  a raw comma multi-host authority, a percent-encoded comma multi-host
  authority, an extra raw `@`, or a decoded `@`/`/`/`?`/`#` authority delimiter.
  Each rejection occurs before fake `connect`; no test may rely only on the
  normalized `URL.hostname`. They also reject every other query key/value,
  specifically `database`, `user`, `application_name`, `client_encoding`,
  `options`, `ssl`, `sslnegotiation`, `timeout`, and `target_session_attrs`.
  They prove the tool never deliberately relies on `PGPORT` or another PG
  environment default, permits a startup override, admits postgres.js
  multi-host routing, or admits a driver target-session preflight trigger;
- the namespace validator accepts exactly the four declared bootstrap key names
  and rejects any additional prefixed name or injected direct
  `DATABASE_URL3`/`DATABASE_URL`/`DATABASE_DIRECT_URL` name before connection
  with the stable result. A focused proxy/accessor test whose forbidden or
  unrelated environment value throws on access proves that the name-only scan
  and value parser do not dereference arbitrary unrelated/private source values
  while the expected four values remain valid;
- poison-environment/no-connect regressions place non-secret poison canaries
  only in explicit fake child-map keys and inaccessible throwing getters; they
  neither read nor mutate the test process environment or any `.env` file. For
  malformed argv/config, an unexpected bootstrap key, or any name other than
  `coderso02`, fake `connect`, transaction/DDL, and child process counters
  remain zero. Matching-state tests use only the in-memory adapter and prove no
  live target, CLI child, or runtime connection is attempted;
- no DDL runs before the successful literal-`coderso02` live-name proof. The
  mock asserts the only identity-query bind is `coderso02`; a false/missing
  result maps to `fixture_bootstrap_invalid` without exposing that target;
- the production-adapter source contract pins the static parameterized
  `current_database` proof, fixed DDL, marker insert, and catalog/marker proof.
  It permits only the target-name bind for the first statement and only marker
  plus sentinel binds for the latter proof/insert; the catalog projection
  returns no marker, sentinel, URL, or driver row. A fake public client validates
  the same reduced proof shape without pretending to be postgres.js;
- `--check` calls only the fake read-only transaction contract, validates the
  exact existing relation/one-row marker, always rolls it back exactly once,
  and never receives a DDL, insert, or commit method or issues data mutation;
- `--initialize` calls only the fake read-write transaction contract, produces
  the exact parameterized DDL/read/insert/read/commit sequence when an exact
  empty table is observed, creates or verifies only the specified table and
  row, rejects structural/count/byte-proof mismatch, and is idempotent for the
  matching one-row state. Fakes prove it requires `tableRowCount === 1`,
  `markerCount === 1`, and `boundSentinelByteMatched === true` before commit,
  treats `0/0/false` as the sole insert-eligible state, and never receives a raw
  sentinel observation;
- a successful `--check` emits exactly one JSON line with the eight-field
  `coderso.task551.fixture-bootstrap-check@v1` schema and only the fixed
  non-secret values above; a successful `--initialize` emits no check record;
- the checked-in script exports exactly the required named pure helpers
  `getTask551FixtureBootstrapToolContractIdentity` and
  `getTask551FixtureBootstrapToolContractDigest`. Tests pin the static public
  identity and its stable lowercase `sha256:` digest by independently RFC
  8785-canonicalizing the identity and hashing its UTF-8 bytes; changing
  environment, argv, time, database mocks, or an unrelated receipt cannot
  change either helper result or trigger database work;
- a local check-record integrity assertion accepts the current helper digest in
  a successful L03 `--check` record, then substitutes a different syntactically
  valid lowercase `sha256:` digest and rejects it. It proves this leaf emits the
  one current checked-in identity digest rather than merely a digest-shaped
  value; L11's independent import/comparison remains an L11 workflow test;
- every failing path leaves stdout empty and exposes at most the stable redacted
  `fixture_bootstrap_invalid` stderr code; output and strict-schema tests prove
  that the literal `coderso02` and every target/secret/SQL/error/duration/
  platform canary are absent;
- a transaction-work or commit failure attempts rollback exactly once; an
  injected rollback failure still reaches `runBootstrap` cleanup and then the
  one outer CLI boundary as the identical
  `{ ok: false, code: "fixture_bootstrap_invalid" }` result. Mocks prove that
  no raw driver message, stack, bind, target, URL/DSN, sentinel, or SQL canary
  reaches stdout, stderr, a thrown rejection, snapshot, or log;
- a `client.close()` failure after both a successful `--check` validation and a
  failed transaction still attempts close exactly once, suppresses the check
  record, and reaches that same stable result/stderr code. A combined
  transaction/rollback/close failure likewise yields one redacted result with
  no unhandled rejection or raw diagnostic;
- L03 exposes no receipt, workflow-file, or `_docs/_workflows/**` writer; the
  focused test covers only its own fake output sinks and no-workflow-side-effect
  adapter behavior. Durable receipt capture, scheduling, map lifetime, and
  evidence persistence are exclusively TASK-551-11 workflow-test concerns;
- the L03 tool and focused suite neither construct, inspect, authorize, nor
  derive an L02 environment or variable mapping. The L03 focused suite asserts
  only this absence from its own module/seam; all L11 scheduling, source/map
  disposal, and later-L02 fresh-source assertions remain exclusively L11
  workflow tests;
- sentinel/URL/name/confirmation canaries cannot appear in normal output,
  errors, snapshots, logs, or mock receipts;
- no L02 seed, measurement, cleanup, `VACUUM`, migration, or generic runtime
  configuration operation is imported or invoked.

The default L01 Bun lane runs the focused suite without a fixture target,
bootstrap environment requirement, or L11 child map. Its local seam arguments
remain in-memory test data. The suite is static/mock-only, so it must behave
identically with an absent, present, or poisoned ambient process environment;
even if the root runner sources `.env`, its imports/test code do not read it and
it does not need `--env-file=/dev/null` to be valid:

```bash
bun test tests/perf/task551FixtureTargetBootstrap.test.ts
bun run lint:repo:types
bunx eslint --max-warnings=0 scripts/task-551-fixture-target-bootstrap.ts tests/perf/task551FixtureTargetBootstrap.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun run gates:coderso:perf
wc -l scripts/task-551-fixture-target-bootstrap.ts tests/perf/task551FixtureTargetBootstrap.test.ts
```

The root `lint:repo:types` gate covers both allowlisted root source/test paths
through `tsconfig.json`; the explicit root ESLint command checks exactly those
same two paths with zero warnings. The `wc -l` gate is mandatory and each of
the two future implementation files must be at most 1,000 physical lines. These
are targeted commands only: this leaf must not invoke generic `bun test`,
`test:bun`, a lane classifier, a fixture CLI operation, or a database command.

TASK-551-11 may rerun the focused test only with its fresh
`Task551StaticEvidenceEnvironmentV1` solely to collect a redacted test receipt.
That workflow invocation remains mock-only: the suite receives neither the L03
source nor the four-key fixture-operation map, cannot turn its static map into
a CLI/database action, and has no fixture-map dependency. The isolated form
uses an argv array with `--env-file=/dev/null` and an exact-own static `childEnv`
with no inherited/merged key or shell/string wrapper; those launch semantics
cannot alter the suite's static behavior or create a default-lane fixture
prerequisite.

For each real L03 fixture CLI operation, four broker-derived `fixtureValues`
plus its fixed OS-key allowlist, a distinct exact-own `childEnv`, argv-array/no-
shell semantics, and `--env-file=/dev/null` are hard requirements. The L11
implement/fix boundary consumes one fresh author-audit broker bound to that L03 operation, maps its URL
to `TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL`, and sets
`TASK551_FIXTURE_BOOTSTRAP_DATABASE_NAME` to literal `coderso02`; confirmation
and sentinel are the other two L03-only fixture values. The guarded CLI adapter
may snapshot only those four mapped values from that already exact-own child
transport; it has no direct raw-source, generic, dotenv, merged, or ambient
process URL path. No `source .env`, generic value, or inherited process
environment is allowed there. The child is also PG-free:
it has no `PG*` name and its raw URL search is absent or exactly
`?sslmode=require`; it rejects a raw `#`, bare `?`, raw or percent-encoded comma
multi-host authority, and raw/decoded extra-`@` authority ambiguity before the
constructor. `URL.hostname` is not treated as sufficient proof. It therefore
rejects `target_session_attrs` and every other startup-option query.
postgres.js's unavoidable construction-time `process.env` lookup cannot obtain
an ambient driver option or issue a target-session preflight. The full
real-operation argv, including the literal env-file flag, is the sole input to
the redacted command-receipt argv hash:

```bash
bun --env-file=/dev/null scripts/task-551-fixture-target-bootstrap.ts --initialize
bun --env-file=/dev/null scripts/task-551-fixture-target-bootstrap.ts --check
```

The mutating CLI operation is intentionally a one-time action against the
already dedicated DB3 target `coderso02`. If it fails, stop before L02. Its
fresh broker-derived values and exact-own child environment are captured and
disposed immediately after its one launch. Only then does TASK-551-11's workflow
launcher acquire a distinct fresh check-bound L03 broker, derive a distinct
four-key values/environment pair, and run the L03 `--check`. It captures and
validates that transient record, writes/accepts the required durable L11
evidence, and disposes the check lifecycle. Neither lifecycle may retain, map,
transform, compare, or otherwise use its source, values, environment, or launch
as L02 input; L03 owns no L02 environment, mapping, or authorization.

The resulting L03 stdout line remains transient. TASK-551-11, not this leaf or
its runner, owns its redacted command capture, strict validation, and durable
audit-evidence write. That redacted durable L03 evidence is the sole material
that may cross into L02; it contains no source value, database name, sentinel,
confirmation, source provenance, or child map.

L02's DB-free static and manifest finalization run with no L03 environment
data. Only after that finalization, TASK-551-11 may start the first of four
separate L02 lifecycles. For freeze small, freeze large, check small, and check
large independently, the L11 implement/fix boundary consumes a fresh author-audit broker and, under L02's
separate contract, creates distinct fixture-operation `fixtureValues` and an
OS-augmented `childEnv`, launches once, captures the redacted receipt, then
disposes that operation's authority and environment before the next one. None is
derived from or authorized by an L03 lifecycle and all are outside L03's
ownership. L11 never logs, hashes, serializes, dumps, or persists any environment
value.

## Documentation Updates Required

None. This leaf changes no shared documentation, task/changelog index, or
workflow evidence. TASK-551-10-L02 alone records the family changelog closure
under pinned entry 1310.

## Acceptance Criteria

- L03 is the sole owner of the two exact allowlisted files and lands after L01,
  before any L02 database operation.
- The tool requires an explicit mode and all four dedicated bootstrap values.
  Its private URL originates only from L11's broker-derived child-map value, its
  configured name must be literal `coderso02`, its URL must be nonempty and at
  most 4,096 UTF-8 bytes, and its sentinel must be 32 through 512 UTF-8 bytes.
  Any direct `DATABASE_URL3`/generic URL child-map name or out-of-range value is
  rejected before a client exists. Only the guarded CLI adapter may snapshot the
  exact four mapped values from its already exact-own child transport; it never
  reads a generic URL/dotenv/ambient URL source or emits identity or secret
  material. Raw URL validation requires exactly one authority `@` and a
  decodable post-`@` driver authority with no comma or structural delimiter,
  then requires an explicit parsed host, user, and database path; normalized
  `URL.hostname` alone is insufficient. Port is intentionally optional and
  defaults only to deterministic 5432 in the PG-free child, never from
  `PGPORT`. Its raw query is absent or exactly one byte-for-byte
  `?sslmode=require`; a bare `?`, any raw `#`, raw/percent-encoded comma
  multi-host authority, and all other/duplicate query forms fail before
  connection, including `database`, `user`, `application_name`,
  `client_encoding`, `options`, `ssl`, `sslnegotiation`, `timeout`, and
  `target_session_attrs`.
- L03-owned code reads no environment outside that guarded CLI wrapper. The
  sole narrow exception is postgres.js's unavoidable transitive
  `process.env` lookup during the private lazy `postgres(...)` construction,
  after config validation and only in L11's exact PG-free non-inherited child;
  it is never an L03 URL/target/option source and does not run on import, pure
  helper, or fake-adapter test paths.
- `--initialize` proves `current_database()` equals the parameterized literal
  `coderso02` before its only possible DDL and leaves exactly the required
  marker table and one matching row, idempotently.
- `--check` is non-mutating and proves the existing target/table/row/sentinel
  contract before L02 is permitted to run; only its successful path emits the
  exact one-line, eight-field, non-secret L03 check record.
- The checked-in L03 script exposes the two exact pure identity/digest helper
  names; its `--check` record uses their RFC 8785-derived lowercase SHA-256
  digest, which L11 independently recomputes and rejects if substituted.
- TASK-551-11 resolves those two values only through the literal, DB/env-free,
  non-generic `adaptTask551L03ClosureV2` seam after L03 closure; its bootstrap
  has no L03 import or static helper edge.
  The focused L03 suite may import only the named, import-safe
  `task551FixtureBootstrapCliAdapterTestSeam` plus its structural type exports
  to exercise injected fake child maps, dependencies, transactions, results,
  and output sinks; no L03-owned import path reads a process value outside the
  guarded `if (import.meta.main)` CLI wrapper.
- The injected adapter distinguishes read-only and read-write transactions
  mechanically. `--check` has only proof plus one rollback and requires the
  exact relation / `markerCount === 1` / `boundSentinelByteMatched === true`
  proof; `--initialize` may create only the fixed table, insert only after an
  exact `0/0/false` proof, re-proves exact `1/1/true` UTF-8-bound sentinel bytes
  before one commit, and rolls back every failed work/commit path.
- The private production adapter constructs postgres.js only after config
  parsing. Its L03-owned `max: 1` operation pool reserves exactly one active
  operation connection for the parameterized target proof and same explicit
  transaction, issues only static target/DDL/catalog/marker statements with the
  declared binds, releases that reservation exactly once, and calls `pool.end()`
  exactly once. postgres.js necessarily creates an internal subscription helper
  during construction, but L03 calls no subscription/LISTEN API and no active
  subscriber connection is permitted; `pool.end()` must cascade its cleanup. It
  sets no `target_session_attrs` and accepts none in the URL, and it admits no
  URL startup-option override beyond the raw `?sslmode=require` form. This
  preserves static `application_name` and UTF-8 startup settings while
  preventing a driver target-session preflight before the target proof.
- `--initialize` and every failure leave stdout without a check record; L03
  persists neither that line nor a receipt or workflow artifact, and
  TASK-551-11 alone turns the validated capture into durable audit evidence.
- L11 captures and disposes the fresh initialize L03 lifecycle before it
  acquires the distinct check lifecycle; after it durably accepts current L03
  check evidence, it disposes that check lifecycle as well. No L03 URL, name,
  sentinel, confirmation, source provenance, broker, map, values, environment,
  or launch can be retained, transformed, or authorized as L02 input; L03 owns
  no L02 mapping or handoff. L02's DB-free static/manifest finalization runs
  first, then each of its four commands consumes its own separately fresh broker
  under L02's distinct contract. The only L03 material L02 may receive is
  redacted durable evidence.
- The default-Bun focused suite remains DB-free/static/mock-only: it receives
  only injected test arguments and fake adapters, reads neither generic nor
  fixture `process.env`, tolerates a poisoned `.env`, and makes no live target,
  DDL, or CLI database action. Its ordinary default-Bun form receives no L11
  map; only an isolated L11 receipt rerun receives a fresh explicit
  non-inherited empty/OS-only TASK-551-11-owned
  `Task551StaticEvidenceEnvironmentV1` with no URL, target/name, confirmation,
  sentinel, `DATABASE_*`, or `TASK551_*` key. That rerun cannot change the
  default test's DB-free behavior or carry an L03 source/fixture map.
- Each real `--initialize` and `--check` fixture CLI invocation against DB3
  `coderso02` independently requires TASK-551-11's fresh exact four
  `fixtureValues` and distinct OS-augmented exact-own `childEnv`: its URL is
  broker-derived and its name is literal `coderso02`, with argv-array/no-shell
  semantics and `--env-file=/dev/null`. No broker, source, values, child
  environment, map, or launch crosses between those two operations. That child
  has no `PG*` name; the only allowed
  transitive driver environment observation is at
  the deferred postgres.js construction after config validation. Its raw URL
  search is absent or exactly `?sslmode=require`; a bare `?`, raw `#`, and raw
  or percent-encoded comma multi-host authority are rejected before the
  constructor, so no driver startup-option query is inherited or overridden.
  The constructor's unavoidable internal subscription helper remains inert
  because L03 calls no subscription/LISTEN API, and the one `pool.end()` call
  cascades cleanup. Their command-receipt argv hash covers that literal flag.
  Focused, static, and performance gates pass without a fixture target; no
  shared docs are changed.
- The focused Bun test, root `bun run lint:repo:types`, explicit root ESLint
  command over both allowlisted paths, core type/lint gates, performance gate,
  and a two-file `wc -l` at-or-below-1,000 gate all pass without a generic test,
  classifier, fixture CLI action, or database command.

## Workflow Dispatch Envelope

The finite `forbiddenPaths` list captures named current ownership conflicts.
The closed `allowlist` rejects every omitted path, including the broad foreign
categories described in the file-ownership contract.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-01-L03",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-01"
  },
  "allowlist": [
    "scripts/task-551-fixture-target-bootstrap.ts",
    "tests/perf/task551FixtureTargetBootstrap.test.ts"
  ],
  "forbiddenPaths": [
    "scripts/task-551-query-inventory.ts",
    "scripts/task-551-database-baseline.ts",
    "tests/perf/database-query-inventory.test.ts",
    "tests/perf/database-query-baseline.test.ts",
    "core/db/client.ts",
    "core/db/schema.ts",
    "core/db/migrations/meta/_journal.json",
    "_docs/_workflows/task-551-implement.mjs"
  ],
  "dependencies": ["TASK-551-01-L01:initial"],
  "commands": [
    {
      "id": "focused-static-test",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "test", "tests/perf/task551FixtureTargetBootstrap.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/task551FixtureTargetBootstrap.test.ts"],
        "minimum": 1
      }
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
      "argv": ["bunx", "eslint", "--max-warnings=0", "scripts/task-551-fixture-target-bootstrap.ts", "tests/perf/task551FixtureTargetBootstrap.test.ts"],
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
      "id": "performance-gate",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "run", "gates:coderso:perf"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "line-count",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["wc", "-l", "scripts/task-551-fixture-target-bootstrap.ts", "tests/perf/task551FixtureTargetBootstrap.test.ts"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "bootstrap-initialize",
      "lane": "cli",
      "environmentProfile": "task551-phase-l03",
      "argv": ["bun", "--env-file=/dev/null", "scripts/task-551-fixture-target-bootstrap.ts", "--initialize"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "bootstrap-check",
      "lane": "cli",
      "environmentProfile": "task551-phase-l03",
      "argv": ["bun", "--env-file=/dev/null", "scripts/task-551-fixture-target-bootstrap.ts", "--check"],
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "single",
      "dependsOn": ["TASK-551-01-L01:initial"],
      "commandIds": [
        "focused-static-test",
        "root-lint-types",
        "root-eslint",
        "core-lint-types",
        "core-lint",
        "performance-gate",
        "line-count",
        "bootstrap-initialize",
        "bootstrap-check"
      ]
    }
  ]
}
```
