# TASK-552-02-L01: Profile-Scoped Workers and Batched Database Operations
# FileName: TASK-552-02-L01-Profile-Scoped-Workers-And-Batched-Database-Operations.md

**Parent Subtask:** TASK-552-02
**Priority:** High
**Category:** Testing Infrastructure / Database / Performance / Security
**Estimated Effort:** Large
**Dependencies:** TASK-552-01-L01 complete
**Status:** ✅ Done
**Started:** 2026-08-06
**Completed:** 2026-08-06
**Changelog:** 1264 (family closure)

---

## Objective

Provide reusable persistent Bun workers and transactional set-based database
operations so smoke adapters avoid one process/connection per lookup, delete,
or absence proof. Preserve least privilege, exact logical receipts,
provenance, and uncertain-write reconciliation. Add no migration or index.

## Exact Single-Writer Ownership

This leaf alone creates:

- `scripts/runtime-smoke/workers/contracts.ts`;
- `scripts/runtime-smoke/workers/protocol.ts`;
- `scripts/runtime-smoke/workers/pool.ts`;
- `scripts/runtime-smoke/workers/client.ts`;
- `scripts/runtime-smoke/workers/entry.ts`;
- `scripts/runtime-smoke/workers/operation-registry.ts`;
- `scripts/runtime-smoke/database/batch-contract.ts`;
- `scripts/runtime-smoke/database/fixture-ledger.ts`;
- `scripts/runtime-smoke/database/transactional-batch.ts`;
- `scripts/runtime-smoke/adapters/task-540/worker-operations.ts`;
- `scripts/runtime-smoke/adapters/task-540/cleanup-batches.ts`;
- `scripts/runtime-smoke/adapters/task-540/source-catalog.*`;
- `scripts/runtime-smoke/adapters/task-540/source-executor.*`;
- `scripts/runtime-smoke/adapters/task-540/worker-entry.*`;
- `scripts/runtime-smoke/adapters/task-540/persistent-bridge.*`;
- `tests/unit/runtime-smoke/worker-protocol.test.ts`;
- `tests/unit/runtime-smoke/worker-lifecycle.test.ts`;
- `tests/unit/runtime-smoke/worker-profile-isolation.test.ts`;
- `tests/unit/runtime-smoke/database-batches.test.ts`;
- `tests/unit/runtime-smoke/task540-worker-operations.test.ts`.

For canonical TASK-540 integration this leaf alone may also edit:

- `_docs/_workflows/task-540-smoke/runtime/bun-bridge-transport.mjs`;
- `_docs/_workflows/task-540-smoke/runtime/bun-child-protocol.mjs`;
- `_docs/_workflows/task-540-smoke/runtime/response-lost-baselines.mjs`;
- `_docs/_workflows/task-540-smoke/executor/cleanup-execution.mjs`;
- `_docs/_workflows/task-540-smoke/executor/capabilities/cleanup-lifecycle.mjs`;
- `_docs/_workflows/task-540-smoke/cleanup/final-baselines.mjs`;
- focused TASK-540 source/security tests required by those intended seam
  changes.

No frozen TASK-540 facade/orchestrator/bridge, schema declaration, SQL
migration, snapshot, journal, product module, TASK-540 action-manifest file,
task/changelog, or sibling-owned shared file may change. TASK-552-03-L02
consumes these APIs through its adapter.

## Worker Contract

- Pool workers by exact registered environment profile, never by a union of
  required secrets. Keep the normal database profile persistent with
  `DB_POOL_MAX=1`; privileged provisioning/identity profiles are lazy and
  close immediately after their declared phase.
- Use canonical, size-bounded NDJSON over inherited stdin/stdout with protocol
  version, monotonic request ID, registered operation ID, schema/digest, strict
  input, and exactly one strict output.
- Both persistent and one-shot oracle transports call the same handler
  registry. Frames cannot contain raw SQL, JavaScript, imports, environment
  upgrades, file paths, credentials, or arbitrary concurrency.
- Register every worker with the shared lifecycle and report worker starts,
  requests, reconnects, DB batches, statements, rows, and elapsed time without
  exposing query text/binds.

## Batched Database Contract

- Freeze a bounded run-owned fixture ledger before destructive cleanup.
- Group resources into foreign-key-safe waves. One transaction verifies exact
  ownership/provenance, performs set-based `DELETE ... RETURNING`, and checks
  affected cardinality; one bounded post-commit request proves absence.
- Project batch outputs back to the original deterministic logical receipt
  order. TASK-540 retains its 18 baseline receipts and 72 cleanup receipts even
  though physical worker frames/statements are fewer. Exactly 32 of the 72
  nominal cleanup receipts invoke Bun/DB work (18 SEO, 4 settings, 4 users,
  3 media, and 3 already-reset override absence checks); the other 40 remain
  under their existing API/Node authority and must never be synthesized by a
  generic database batch.
- Partition the 18 response-lost baselines into exactly two least-privilege
  worker groups: 14 `database` operations and 4 `user-identity-proof`
  operations. A batch counter is not a claim that heterogeneous table families
  execute as one SQL statement.
- API-owned cleanup remains API-owned where it proves product behavior.
  Filesystem media remains under its storage authority.
- Record sanitized small/large query-plan evidence. Migration `0070` remains;
  a measured production-index need stops this leaf and requires a separate
  migration task rather than smoke-only DDL.

## Execution Pseudocode

```ts
async function dispatch(ctx, operationId, input) {
  const descriptor = registry.require(operationId);
  descriptor.input.parseExact(input);
  const worker = await ctx.workerPool.forProfile(descriptor.profile);
  const boundary = await worker.send(descriptor, input);
  try { return descriptor.output.parseExact(await worker.read(boundary.id)); }
  catch (error) {
    await worker.invalidateAndProveAbsent();
    if (!boundary.dispatched && descriptor.idempotentRead)
      return dispatchOnceMore(ctx, operationId, input);
    return reconcileUncertainMutationOrThrow(ctx, descriptor, input, error);
  }
}

async function executeCleanupWave(ctx, ledger, wave) {
  const plan = buildExactBatch(ledger, wave);
  const result = await dispatch(ctx, plan.operationId, plan.input);
  assertReturningAndAbsenceParity(plan, result);
  return projectLogicalReceipts(plan, result);
}
```

## Failure Handling

Malformed/oversized/out-of-order/replayed frames, unexpected stderr, timeout,
EOF, handler/profile mismatch, foreign ownership, affected-row mismatch, or
partial state fail closed. Retry once only before dispatch for an idempotent
read. Never replay a mutation after uncertain delivery; reconcile exact
pre-state or post-state, otherwise fail and preserve cleanup evidence.

## Security Contract

- **Visibility:** inherited local pipes only; no listener/API.
- **Auth/RBAC/CSRF/rate limits:** unchanged and never bypassed.
- **Validation:** exact frames, schemas, operation/profile registries, ledger
  bounds, stable ordering, cardinality, transaction and output contracts.
- **Anti-abuse/secrets:** no public write. Least-privilege env projection; no
  union-secret worker, arbitrary SQL/source/path, raw DB error, bind, PII,
  credential, token, or cookie in output/evidence.

## Tests and Gates

```bash
bun test tests/unit/runtime-smoke/worker-*.test.ts \
  tests/unit/runtime-smoke/database-batches.test.ts \
  tests/unit/runtime-smoke/task540-worker-operations.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l scripts/runtime-smoke/workers/*.ts scripts/runtime-smoke/database/*.ts \
  scripts/runtime-smoke/adapters/task-540/{worker-operations,cleanup-batches}.ts
```

Acceptance pins profile isolation, pool max one, persistent/one-shot parity,
bounded query/frame counts, rollback and uncertain-write safety, 18 baseline
receipt parity, the exact 32 DB plus 40 API/Node cleanup split within all 72
canonical receipts, exact process absence, secret-free evidence, and the
1,000-line limit for every touched human-authored file.
