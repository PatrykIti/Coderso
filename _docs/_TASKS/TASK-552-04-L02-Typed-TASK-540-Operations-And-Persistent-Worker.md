# TASK-552-04-L02: Typed TASK-540 Operations and Persistent Worker
# FileName: TASK-552-04-L02-Typed-TASK-540-Operations-And-Persistent-Worker.md

**Parent Subtask:** TASK-552-04
**Priority:** High
**Category:** Testing Infrastructure / Workers / Database / Security
**Estimated Effort:** Large
**Dependencies:** TASK-552-04-L01 complete
**Status:** ✅ Done
**Started:** 2026-08-06
**Completed:** 2026-08-06
**Changelog:** 1264 (family reclosure)

---

## Objective

Replace TASK-540's 57 unique source-string handler bodies and dynamic
Blob/module executor with static typed operations on the existing shared
`WorkerOperationRegistry` and `WorkerPool`. Preserve all 160 accepted operation
IDs/aliases, their exact per-alias input/output authority, logical receipts,
provenance, transactions, uncertain-response reconciliation and cleanup proofs.
L02 freezes and owns this 57-to-160 mapping; it is not inferred from L01's path
inventory and is never delegated to a later browser/composition leaf.

## Exact Single-Writer Ownership

L02 alone consumes every source-manifest entry classified
`l02-typed-operation` and owns:

- `scripts/runtime-smoke/adapters/task-540/suite/operations/**`;
- source-dependent native executor/runtime modules under
  `scripts/runtime-smoke/adapters/task-540/suite/executor/**` and
  `scripts/runtime-smoke/adapters/task-540/suite/runtime/**`;
- `scripts/runtime-smoke/adapters/task-540/operations/contracts.ts`;
- `scripts/runtime-smoke/adapters/task-540/operations/registry.ts`;
- `scripts/runtime-smoke/adapters/task-540/operations/aliases.ts`;
- `scripts/runtime-smoke/adapters/task-540/operations/handlers/*.ts`;
- `scripts/runtime-smoke/adapters/task-540/operations/packs/*.ts`;
- `scripts/runtime-smoke/adapters/task-540/operations/worker-entry.ts`;
- `scripts/runtime-smoke/adapters/task-540/persistent-bridge.ts`;
- `scripts/runtime-smoke/adapters/task-540/production-handlers.ts`;
- `scripts/runtime-smoke/adapters/task-540/worker-entry.ts`;
- `scripts/runtime-smoke/adapters/task-540/worker-operations.ts`;
- `scripts/runtime-smoke/adapters/task-540/cleanup-batches.ts`;
- `scripts/runtime-smoke/adapters/task-540/auth-window.ts`;
- deletion/replacement of adapter-local `source-catalog.ts`,
  `source-compiler.ts` and `source-executor.ts` after parity passes;
- `tests/fixtures/runtime-smoke/task540-operation-parity.json`, which freezes
  the exact accepted-ID-to-handler/schema mapping independently of executable
  legacy source;
- `tests/unit/runtime-smoke/task540-operation-registry.test.ts`;
- `tests/unit/runtime-smoke/task540-operation-handlers.test.ts`;
- replacement of `task540-source-worker.test.ts` by the typed tests;
- focused updates to `task540-persistent-bridge.test.ts`,
  `task540-worker-operations.test.ts` and shared worker lifecycle tests required
  to prove privileged-profile close/restart.

L02 does not edit `task-540.ts`, any L01 stable file, native browser/host/
composition files, shared worker production primitives, widget/production
adapters, legacy workflow files, docs or product persistence code.

The L02 source disposition includes every production module that owns or
depends on Bun source execution authority: the `executor/bridge-sources/**` and
`executor/bridge-output-validators/**` families; operation
`bridge-descriptors.mjs`, `bridge-input-validators.mjs`,
`bridge-operation-registry.mjs`, `bun-bridge-resource-sources.mjs`,
`bun-bridge-validation-primitives.mjs` and `resource-bun-authority.mjs`; the
source-dependent `runtime/bun-child-protocol.mjs`,
`runtime/bun-bridge-transport.mjs`, `runtime/operation-router.mjs` and
`runtime/response-lost-*.mjs` family; and every further executor/runtime module
the reviewed graph proves participates in descriptor construction, registered
dispatch, response-lost reconciliation, typed cleanup or output validation.
None may be moved first by L01 or rewritten by L03. L03 consumes only L02's
exported typed operation API.

## Frozen 57/160 Operation Contract

- L02 reads the hash-verified L01 source manifest, evaluates the old registries
  once during migration and writes
  `tests/fixtures/runtime-smoke/task540-operation-parity.json`. The fixture
  freezes exactly 57 canonical handler IDs and 160 accepted operation IDs:
  57 canonical IDs, 26 explicit aliases, 36 response-lost preflight/discovery
  aliases and 41 resource aliases. It is sorted, duplicate-free and committed;
  native tests read it as data and never execute legacy source.
- Every fixture row records `operationId`, `handlerId`, `profileId`, exact input
  schema/shape identity, exact output schema/validator identity, retry class and
  static handler-artifact digest. L02 creates one typed static handler owner per
  body and one `WorkerOperationDefinition` per accepted operation ID.
- `operations/aliases.ts` is an exhaustive 160-entry mapping to the 57 handler
  IDs. Each alias installs its own reject-unknown input validator and exact
  output validator from the frozen row. An alias may share an `execute` handler,
  but it must not inherit wider input or output authority from another alias.
- Completeness tests compare the native definitions with the frozen parity
  fixture: exactly 57 reachable handlers and 160 registry definitions, no
  duplicate/unreachable handler, no missing/extra alias and byte-identical
  alias-to-handler plus input/output-schema mapping.
- Worker frames carry only operation ID, schema/digest fields and bounded JSON
  input. The existing protocol field named `sourceSha256` carries a static
  handler-artifact/version digest; it is never computed from or accompanied by
  executable source.
- Remove source text, arbitrary module paths, raw SQL frames, Blob/object URLs,
  `eval`, `Function`, source compilation and dynamic worker-code imports from
  the complete operation lane, including bootstrap CAS restoration.

## Worker Profiles and Lifecycle

- Preserve five least-privilege profiles: schema-only, database, bootstrap
  preflight, user identity proof and user provisioning. Database-bearing
  profiles force `DB_POOL_MAX=1`.
- The normal database worker persists for its bounded run. Privileged bootstrap,
  identity and provisioning workers are lazy and persist only within their
  declared phase.
- At each privileged phase boundary, call the existing
  `WorkerPool.closePrivilegedProfiles()`, await exact client exit and immediately
  prove every client used by that phase absent before the next phase starts. A
  later genuine use lazily starts a fresh client with the same registered
  profile; no eager restart, union-secret worker or environment upgrade is
  allowed.
- Tests retain each phase's `WorkerClient`, prove `client.proveAbsent()` directly
  after the boundary close, prove no replacement starts until the next dispatch,
  then prove the next `pool.forProfile(...)`/dispatch has a different PID. They
  also cover one start within a phase, idempotent boundary close, unrelated
  non-privileged worker persistence and final whole-pool absence.

## Database and Cleanup Contract

- Destructive DB work remains ownership-bound and set-based. A cleanup wave
  verifies exact identifiers/provenance in one transaction, deletes only matching
  rows, projects canonical logical order and proves absence after commit.
- Preserve 18 response-lost baseline receipts and 72 cleanup receipts, including
  the existing 32 DB plus 40 API/Node authority split. No blind retry follows an
  uncertain mutation delivery.
- Preserve bootstrap compare-and-set restoration as a static typed handler with
  the same conflict/absence behavior.
- Return only consumed columns and sanitized counters; never expose SQL, binds,
  driver text, credentials or row payloads.

## Implementation Pseudocode

```ts
const handlers: ReadonlyMap<Task540HandlerId, Task540TypedHandler> =
  createTask540TypedHandlers(); // exactly 57 entries
const definitions: readonly WorkerOperationDefinition[] =
  TASK540_OPERATION_PARITY.map((alias): WorkerOperationDefinition => {
    const handler = requireTask540Handler(handlers, alias.handlerId);
    return {
      ...workerDescriptorForAlias(alias),
      validateInput: validatorForInputSchema(alias.inputSchemaId),
      validateOutput: validatorForOutputSchema(alias.outputSchemaId),
      execute: (input, context) => handler.execute(input, context),
    };
  });

assert.equal(handlers.size, 57);
assert.equal(definitions.length, 160);
const registry = new WorkerOperationRegistry(definitions);
const pool = await WorkerPool.create({ ...workerPoolOptions, registry });

export async function dispatchTask540Operation(
  request: Task540OperationRequest,
  pool: WorkerPool
) {
  const definition = registry.require(request.operationId);
  const input = definition.validateInput(request.input);
  const output = await pool.dispatch(definition, input, request.executionBoundaryObserver);
  return definition.validateOutput(output);
}

const phaseClient: WorkerClient = await pool.forProfile("user-provisioning");
await phaseClient.dispatch(provisionDefinition, provisionInput);
const startsBeforeBoundary = pool.counters().starts;
await pool.closePrivilegedProfiles();
assert.equal(await phaseClient.proveAbsent(), true);
assert.equal(pool.counters().starts, startsBeforeBoundary); // no eager restart

const restartedClient = await pool.forProfile("user-provisioning");
assert.notEqual(restartedClient.pid, phaseClient.pid); // lazy restart on later use
```

Production dispatch uses `WorkerPool.dispatch(...)`; the direct
`WorkerClient.dispatch(...)` call above is the phase-lifecycle regression shape
for the real client API, not a second production routing path.

## Failure Handling

Unknown/duplicate/missing aliases or handlers, alias schema widening, profile or
digest mismatch, malformed output, excess frame size, timeout, worker exit,
DB timeout/deadlock, provenance/cardinality mismatch, lost-response ambiguity,
CAS conflict or absence failure returns a bounded machine-readable harness
failure. Preserve the primary failure while aggregating cleanup failures.

## Regression Tests and Gates

- Exact 57-handler/160-operation parity plus mutant rejection for one missing,
  extra, duplicated or wrongly mapped alias, an input-schema drift, an
  output-schema drift and one shared-handler authority leak.
- Mutants cover unknown fields/IDs, wrong profile, malformed output, timeout,
  pre/post-dispatch failure, partial cleanup and CAS conflict.
- Parity fixtures pin all logical IDs/order and baseline/cleanup/absence
  projections without comparing generated source text.
- Worker tests prove phase persistence, privileged close/absence/restart,
  `DB_POOL_MAX=1`, profile isolation, bounded frames and final absence.
- DB tests use owned fixtures/transactions, set-based query-count bounds and no
  unrelated scans.
- Run focused TASK-540 operation/worker/DB tests, shared worker lifecycle tests,
  root/core types and relevant lint, formatting, `git diff --check` and line
  counts. A full live smoke waits for L03 composition.

## Local Tooling and Security Constraints

No API route changes. Strict schemas, static allowlists, least-privilege
environment projection, bounded timeouts/frames and redacted failures are
mandatory. Arbitrary source, module paths, raw SQL frames and union-secret
workers are forbidden.
