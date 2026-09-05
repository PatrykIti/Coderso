# TASK-551-01-L04: Archive-Preserving Freeze-Candidate Generation Bootstrap
# FileName: TASK-551-01-L04-Archive-Preserving-Freeze-Candidate-Generation-Bootstrap.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-01
**Priority:** High
**Category:** Database / Performance / Reliability / Migration Safety
**Estimated Effort:** Small
**Dependencies:** TASK-551 external dispatch gate; TASK-551-01-L03
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Replace the stranded mixed historical freeze-receipt pair with a
non-destructive bootstrap boundary. The legacy source
`tests/perf/task551DatabaseBaseline/freezeReceipts.ts` is historical archive
input, not the active mutable receipt store: it is pinned byte-for-byte to
SHA-256
`17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f`.
It contains a small `candidate` and large `reviewed` receipt, which is never a
legal active lifecycle state. This task must not repair that history by
demoting, rewriting, normalizing, copying, or deleting it.

L04 creates the pure v2 bootstrap contract only. The later L02 integration
creates one separate active v2 generation, starts it at `awaiting-small`, and
is the sole owner of every active-state read/write. A new measured small
candidate may then be followed by one large candidate and the existing L02
owner review. The old archive remains verifiable evidence of history and never
becomes a fallback, input pair, or writable template for an active check.

This is not a database migration, a data repair command, a fixture operation,
or a workflow evidence producer. It is DB-free, process-free, environment-free
pure contract code that lands after L03 and before L11's actual post-L04
provenance adaptation and L02's active-v2 integration.

L04 is not a guard for the current legacy writer: it cannot change, wrap, or
block the pre-existing runner. Its successful focused test authorizes **zero**
L02 CLI/process dispatches. Until L02 has landed the active-v2 store, the
legacy-write guard, and the immutable-archive check below, the workflow must
not run freeze, review, or check; the final repository must keep the archive
immutable rather than treating this pure declaration as runtime protection.

## Sub-Tasks

None; this is an executable leaf.

## File Ownership

**Code/Test allowlist (finite and exact):**

- `scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts`
- `tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts`

L04 is the sole writer of those two files. It may not edit the legacy archive,
an active receipt/state file, runner, transition, persistence facade, owner
host, workflow sidecar, task board, changelog, database fixture, migration, or
production source. The historical archive is a read-only named input only:

```text
tests/perf/task551DatabaseBaseline/freezeReceipts.ts
sha256: 17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f
```

The L04 module is pure and imports no database driver, filesystem, crypto
provider, process/global environment, CLI adapter, runtime/server module, or
workflow code. It does not inspect the archive file at import or call time; it
owns the exact static path/hash declaration. L02's later private store owns the
physical regular-file and hash verification before it reads or writes active
state.

**Future-owner boundary (not an L04 allowlist extension):** after this leaf,
L02 alone owns `scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts`,
its active v2 state and fixture modules, and all integration in
`reviewedPairReceiptSource.ts`, `reviewedPairTransition.ts`,
`reviewedPairPersistence.ts`, `reviewedPairOwnerHost.ts`, and `runner.ts`.
L11 may only read the L04 pure bootstrap through its facade provenance gate; it
does not write, reset, map, or supply a fixture/state value and creates no
durable evidence row for L04.
For L11 only, this bootstrap is a deferred literal target: it remains L04-owned
and line-counted, but is absent from generic sidecar import/discovery/
validation/closed/worktree/pre-spawn projections and may be checked/resolved
only by the named post-L04 closure seam. L04 may materialize while L02 targets
are absent.

### Recovery-initial predecessor rule

During `recovery-initial`, both L04-owned paths in the finite allowlist above
must remain absent. Their absence is a predecessor invariant, not a reason to
invoke an L04 gate early. L04 may materialize them only after an independently
accepted `TASK-551-01-L03:single` closure. Once materialized, they still require
L04's own pure, DB-free focused gate. That gate grants no L02 runtime,
evidence, or active-state authority, and cannot authorize a freeze, review, or
check dispatch.

**Forbidden:** every other path, including `core/**`, migrations and metadata,
`.env*`, `scripts/task-551-database-baseline.ts`, all L01/L02/L03/L11-owned
paths, `_docs/_workflows/**`, task/changelog files, and any generated or
temporary receipt/lock file.

## Locked Bootstrap Contract

The module owns exactly one versioned data contract and one strict parser. The
authoritative exported constant is immutable and contains only the following
own enumerable JSON fields:

```ts
export type Task551FreezeCandidateGenerationBootstrapV2 = Readonly<{
  schema: "coderso.task551.freeze-candidate-generation-bootstrap@v2";
  version: 2;
  generationId: "task551-freeze-candidate-generation-v2";
  archive: Readonly<{
    path: "tests/perf/task551DatabaseBaseline/freezeReceipts.ts";
    sha256: "17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f";
  }>;
  state: "awaiting-small";
}>;

export const TASK551_FREEZE_CANDIDATE_GENERATION_BOOTSTRAP_V2:
  Task551FreezeCandidateGenerationBootstrapV2;

export function parseTask551FreezeCandidateGenerationBootstrapV2(
  value: unknown,
): Task551FreezeCandidateGenerationBootstrapV2;

export function getTask551FreezeCandidateGenerationBootstrapV2():
  Task551FreezeCandidateGenerationBootstrapV2;
```

`parseTask551FreezeCandidateGenerationBootstrapV2` is strict reject-unknown:
it accepts only a plain, own-data record with exactly `schema`, `version`,
`generationId`, `archive`, and `state`; the nested archive has exactly `path`
and `sha256`. It rejects inherited, accessor, sparse, missing, `undefined`,
extra, non-string, non-lowercase-hex, wrong-version,
wrong-generation, wrong-path, wrong-hash, and any state other than the one
literal `awaiting-small`. It returns a deeply frozen, canonical immutable
value and never applies defaults or performs a partial parse.

This API receives already-decoded `unknown`; it does not own a raw JSON parser,
so it makes no duplicate-key-at-decode claim or test. Any future raw decoder
would need its own explicit strict duplicate-key contract and writer task.

The fixed generation ID is intentionally a contract identifier, not a secret,
capability, nonce, database name, source authority, or evidence row ID. The
archive hash pins a history input; it does not authorize a rewrite, a
review-state transition, or a check.

## L02 Active Generation Integration Contract

L02 lands after L04 and must create a new active state without changing the
archive. These paths are pre-declared for L02's later single-writer allowlist;
they are not L04-owned:

- `scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts`
- `tests/perf/task551DatabaseBaseline/freezeCandidateGenerationState.ts`
- `tests/perf/task551DatabaseBaseline/freezeCandidateGenerationFixture.ts`
- `tests/perf/task551DatabaseBaseline/freezeCandidateGenerationTestHelpers.ts`

The initial active source file exports only a v2 state derived from the L04
bootstrap. Its closed discriminated state machine is:

| State | Exact active receipts | Permitted next mutation |
|---|---|---|
| `awaiting-small` | none | one measured small `candidate` freeze |
| `awaiting-large` | exactly one small `candidate` | one measured large `candidate` freeze |
| `ready-for-review` | small then large `candidate` pair | L02 owner review only |
| `reviewed` | small then large `reviewed` pair | no L02 freeze/review overwrite; checks only |

Every state carries the literal v2 schema/version/generation ID and the exact
archive path/hash above. The state parser accepts no mixed pair, no omitted or
duplicated profile, no reversed order, no candidate after `reviewed`, no
reviewed member before `ready-for-review`, no unknown key, and no defaulted
receipt. The checked-in legacy pair is never read as the active pair. L02 may
read it only to verify that the legacy archive is a regular non-symlink file
with the pinned raw SHA-256 before an active read/write.

`freezeCandidateGenerationStore.ts` must first split the current transition's
storage/locking responsibility out of the 939-line
`reviewedPairTransition.ts`, keeping every touched production/test module at
most 1,000 physical lines. The store is the only module that may perform
active-state filesystem I/O. It must fail closed before mutation when either
archive or active state path is missing, symlinked, nonregular, outside the
literal repository-relative path, hash-mismatched, stale, mixed, malformed, or
not the exact expected prior state. It uses a private lock, atomic temp/write/
fsync/rename/re-read sequence for the active state only; it never opens a
write handle to `freezeReceipts.ts`.

The runner accepts `--freeze --profile small` only from `awaiting-small` and
`--freeze --profile large` only from `awaiting-large`; it cannot reset or
replace a prior candidate. `runL02OwnedReviewedTransition` accepts only
`ready-for-review`, performs the existing owner-host review under its
same-realm lock, and produces only the two reviewed members. `--check` accepts
only `reviewed`. A stale/mixed/unknown state, archive mismatch, interrupted
write, lock/re-read mismatch, attempted partial state, or attempted reviewed
overwrite returns a stable redacted `l02_owned_reviewed_transition_*` or
`database_baseline_invalid` path and starts zero checks. A new generation or
changed receipt policy requires a later task-contract amendment; no `--force`,
reset, demotion, or legacy compatibility fallback is permitted.

The fixture re-export exposes only a validated active reviewed pair to runner
consumers. It cannot expose the archive as a mutable map or let callers select
a generation, source path, state token, candidate writer, approval channel, or
storage implementation.

## L11 Adaptation Boundary

L11 first applies its ten-source/declaration-plus-three-existing-test capacity
sequence: contract amendment → fresh audit → filesystem extraction → facade
worktree-compatibility extraction → parser prerequisite/two-subgate update →
injected executor/bootstrap. Its owner-only compatibility bootstrap then lands
and runs before author-audit or normal L04 dispatch, but checks only parser/
executor support and does not attempt this actual L04 validation. After L04's
focused test has passed, the facade's named `adaptTask551L04ClosureV2` post-closure
seam literal-dynamically imports only the L04 bootstrap getter, freezes its identity/
worktree descriptor projection, and adds an `l04` provenance phase and non-durable
pre-L02 gate. The descriptor-only bootstrap never resolves this path; private
`task-551-worktree-compatibility.mjs` has no fs/DB/L02 import. The gate
verifies the exact two L04 current regular, non-symlink source/test paths and
literal pure bootstrap identity before L02 sidecar/static/freeze/review/check
work begins. This gate is source-free, DB-free, non-spawning, and has no broker,
fixture map, archive bytes, active-state bytes, or durable evidence output. It
does not add a logical-argv row, does not alter the fixed fifteen-row registry,
and does not become a twelfth evidence artifact. A missing/foreign/nonregular/
byte-drifted L04 path or altered bootstrap literal fails L11 closed as
`task551_l04_bootstrap_provenance_invalid`, with no raw path/state/fixture
detail in the result.

L11 remains the sole workflow/adaptation writer. Its private `task-551-l02-subgate-executor.mjs`
executor receives only frozen dispatch projection/callbacks, has no host/DB
import, and cannot receive L04/archive/state values; its filesystem companion
alone owns moved physical evidence I/O. After L04 closure/adaptation and before
L02 `single`, L11 may create the distinct non-graph, non-evidence L02 code/test
materialization closure over only current regular non-symlink closed L02
source/test bytes; it excludes archive/state/parent/lock/temp and is not final
L02 leaf closure. Preserve the outer sole literal owner-host import in
`_docs/_workflows/task-551-implement.mjs` only after that closure, plus the
L02-owned review pause between `freeze-large` and `check-small`. L11 invokes no
L04 bootstrap writer, reads no fixture/receipt state, and cannot use L04 to
bypass L02's registered-snapshot transition.

## Security Contract

- **Visibility:** internal, local workflow-contract module only; no HTTP,
  admin, public API, CLI mode, database command, or browser surface.
- **Auth/RBAC/CSRF/rate limit:** no route exists. The repository owner and
  L11's existing current-worktree dispatch fence control when the pure contract
  is used; CSRF, session/API-key, and rate limits are not applicable.
- **Validation:** strict own-data reject-unknown v2 parsing, fixed literal
  generation/path/hash/state, deep freeze, and no implicit defaults.
- **Data integrity:** L04 preserves the legacy archive. L02 later proves the
  archive/active paths are regular non-symlink files, validates the raw archive
  hash before active I/O, and atomically changes only the active v2 state.
- **Anti-abuse and threat model:** no public write is added. This is a local
  owner-controlled process/repository boundary, not cryptographic or OS-sandbox
  authentication against an equally privileged hostile process.
- **Secrets/privacy:** the fixed generation ID and source digest are non-secret;
  no database URL, credential, sentinel, SQL, bind, row, or raw fixture value
  enters L04's API, test output, workflow state, or evidence.

## Implementation Pseudocode

```ts
const EXPECTED = Object.freeze({
  schema: "coderso.task551.freeze-candidate-generation-bootstrap@v2",
  version: 2,
  generationId: "task551-freeze-candidate-generation-v2",
  archive: Object.freeze({
    path: "tests/perf/task551DatabaseBaseline/freezeReceipts.ts",
    sha256: "17da0343d65322e51b76dd8f0d71f2a2471f7ef776bdcbaa03559f34e0355c4f",
  }),
  state: "awaiting-small",
});

export function parseTask551FreezeCandidateGenerationBootstrapV2(
  value: unknown,
): Task551FreezeCandidateGenerationBootstrapV2 {
  const record = requireExactOwnRecord(value, ["schema", "version", "generationId", "archive", "state"]);
  const archive = requireExactOwnRecord(record.archive, ["path", "sha256"]);
  requireExactLiteral(record.schema, EXPECTED.schema);
  requireExactLiteral(record.version, 2);
  requireExactLiteral(record.generationId, EXPECTED.generationId);
  requireExactLiteral(archive.path, EXPECTED.archive.path);
  requireExactLowercaseSha256(archive.sha256, EXPECTED.archive.sha256);
  requireExactLiteral(record.state, "awaiting-small");
  return cloneAndDeepFreeze(EXPECTED);
}

// L02-only later integration; L04 does not implement or call it.
async function advanceActiveGeneration(
  expected: "awaiting-small" | "awaiting-large" | "ready-for-review",
  next: ActiveGenerationV2,
): Promise<void> {
  const archive = await readLegacyArchiveAsRegularFileAndVerifyPinnedHash();
  const current = await readActiveStateAsRegularFileAndParseStrictly();
  requireExactBootstrap(current, EXPECTED, archive);
  requireExactState(current, expected);
  requireOnlyLegalStateTransition(current, next);
  await atomicWriteActiveStateThenReRead(next); // never writes archive
}
```

Error handling is fixed and redacted. The pure parser throws/returns only
`task551_freeze_candidate_generation_bootstrap_invalid`. The later store maps archive/state/mutation
failures to the existing L02 redacted boundary and never includes a path from a
caller, file contents, or a hash mismatch detail in a fixture command output.

## Testing Requirements

- `freezeCandidateGenerationBootstrap.test.ts` proves exact positive parsing
  of the authoritative constant and stable generation/path/hash/state values.
- It has independent negative cases for every missing, extra, inherited,
  accessor, sparse, `undefined`, wrong primitive,
  wrong-schema, wrong-version, wrong-generation, wrong-path, malformed or
  nonmatching hash, and wrong-state field. No branch may default a missing
  value or mutate the input/returned object.
- Every rejected parser case yields only
  `task551_freeze_candidate_generation_bootstrap_invalid`; the L11 provenance
  negative matrix yields only `task551_l04_bootstrap_provenance_invalid` before
  any source, fixture, archive, state, child, or evidence access.
- The test proves no import/call accesses a database client, filesystem,
  environment, process argv, CLI wrapper, workflow broker, clock, or fixture
  runtime. A static source guard rejects imports/references that would create
  those dependencies.
- L02's existing `reviewedPairPersistence.test.ts` owns the physical archive
  hash/nonregular/symlink and active state-machine matrix, using its new
  L02-owned test helper. It covers
  `awaiting-small → awaiting-large → ready-for-review → reviewed`, rejection of
  every other edge, interrupted/partial write recovery, stale/replayed state,
  archive mismatch, no archive mutation, and zero-check dispatch after failure.
- Existing L02 `reviewedPairPersistence.test.ts` and
  `runnerLifecycle.test.ts` retain owner-host/runner integration coverage; they
  must prove the active v2 pair, not the legacy mixed pair, reaches review and
  checks. L11's existing workflow-contract test additionally pins the ordering
  `L04 closure/adaptation -> L02 code/test materialization closure -> L02 single/
  subgates -> final L02 leaf closure after checks`; no L04-focused test gains
  state, host, or workflow authority.

## Validation Commands

```sh
bun test tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts
bun run lint:repo:types
bunx eslint --max-warnings=0 \
  scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts \
  tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts
bun --cwd core lint:types
bun --cwd core lint
bun --env-file=/dev/null -e 'const paths=["scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts","tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts"]; for (const path of paths) { const file=Bun.file(path); if (!(await file.exists())) throw new Error(`missing ${path}`); const text=await file.text(); const lines=(text.match(/\n/g)?.length ?? 0)+Number(text.length>0 && !text.endsWith("\n")); if (lines>1000) throw new Error(`overlong ${path}: ${lines}`); }'
git diff --check -- \
  scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts \
  tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts
```

Each named production/test module must be at most 1,000 physical lines. These
commands are DB-free and must not load credentials, a dotenv file, or a
fixture target. The later L02 integration reruns its focused default-Bun,
lint/type, source-digest, line-count, and L11 provenance gates; no database
freeze/check is accepted from this leaf's validation alone.

## Documentation Updates Required

This task creates only its task contract and two implementation paths. It does
not change product documentation, task status, board statistics, changelog, or
workflow evidence. TASK-551-10-L02 records the final active-generation outcome
and archive-preservation validation in changelog 1310 at family closure.

## Quantified Acceptance

- The exact archive path/hash and the exact v2 bootstrap object are immutable
  and accepted only as an all-or-nothing strict record.
- L04 writes exactly two code/test paths; it writes zero database, archive,
  active state, workflow, evidence, board, or changelog paths.
- The future active state has exactly four legal states and three legal forward
  edges. It has no reset, force, partial-pair, reviewed-overwrite, or
  reviewed-to-candidate edge.
- L11 has exactly eleven durable evidence rows and fifteen logical argv rows
  before and after this task. L04 contributes one ordinary planned Bun test path
  and one provenance gate, not an evidence row or fixture command.
- Every L04-owned production/test module is at most 1,000 physical lines and
  all named DB-free static gates pass.

## Workflow Dispatch Envelope

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-01-L04",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-01"
  },
  "allowlist": [
    "scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts",
    "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts"
  ],
  "forbiddenPaths": [
    "tests/perf/task551DatabaseBaseline/freezeReceipts.ts",
    "scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts",
    "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationState.ts",
    "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationFixture.ts",
    "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationTestHelpers.ts",
    "scripts/task551DatabaseBaseline/reviewedPairReceiptSource.ts",
    "scripts/task551DatabaseBaseline/reviewedPairTransition.ts",
    "scripts/task551DatabaseBaseline/reviewedPairPersistence.ts",
    "scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts",
    "scripts/task551DatabaseBaseline/runner.ts",
    "_docs/_workflows/task-551-implement.mjs",
    "_docs/_workflows/lib/task-551-contract.mjs"
  ],
  "dependencies": ["TASK-551-01-L03:single"],
  "commands": [
    {
      "id": "bootstrap-static-test",
      "lane": "bun-test",
      "environmentProfile": "none",
      "argv": ["bun", "test", "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts"],
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
      "argv": ["bunx", "eslint", "--max-warnings=0", "scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts", "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts"],
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
      "id": "line-count",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "--env-file=/dev/null", "-e", "const paths=[\"scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts\",\"tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts\"]; for (const path of paths) { const file=Bun.file(path); if (!(await file.exists())) throw new Error(`missing ${path}`); const text=await file.text(); const lines=(text.match(/\\n/g)?.length ?? 0)+Number(text.length>0 && !text.endsWith(\"\\n\")); if (lines>1000) throw new Error(`overlong ${path}: ${lines}`); }"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "diff-check",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["git", "diff", "--check", "--", "scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts", "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts"],
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "single",
      "dependsOn": ["TASK-551-01-L03:single"],
      "commandIds": [
        "bootstrap-static-test",
        "root-lint-types",
        "root-eslint",
        "core-lint-types",
        "core-lint",
        "line-count",
        "diff-check"
      ]
    }
  ]
}
```
