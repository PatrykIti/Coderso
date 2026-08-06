# TASK-552-02: Profile-Scoped Persistent Bun Bridge and Batched Cleanup
# FileName: TASK-552-02-Profile-Scoped-Persistent-Bun-Bridge-And-Batched-Cleanup.md

**Parent Task:** TASK-552
**Priority:** High
**Category:** Testing Infrastructure / Database / Performance / Reliability
**Estimated Effort:** Large
**Dependencies:** TASK-552-01
**Status:** ✅ Done
**Started:** 2026-08-06
**Completed:** 2026-08-06
**Changelog:** 1264 (family closure)

---

## Execution Leaf

Implementation is delegated to the physical execution leaf
`TASK-552-02-L01-Profile-Scoped-Workers-And-Batched-Database-Operations.md`.
That authored leaf is the executable contract and must pass contract audit
before implementation.

## Objective

Replace TASK-540's one-Bun-process-per-operation bridge with reusable, bounded
persistent workers partitioned by the existing least-privilege environment
profiles, then batch independent baseline, cleanup, and absence queries.
Preserve logical receipts, provenance, response-lost recovery, transaction
boundaries, and foreign-row protection. Do not change product behavior, browser
flows, or database schema.

## Grounded Baseline and Required Outcome

- The canonical plan has 496 logical actions: 420 browser and 76 manifest
  runtime actions, plus 13 required screenshots.
- Bridge operations currently start separate `bun --eval` processes and new DB
  clients. Setup performs 18 serial response-lost baselines; the persistent
  cleanup contract contains 72 logical provenance/delete/absence operations.
- Six SEO resources alone currently require 18 one-shot operations.
- Existing profiles are `schema-only`, `database`, `bootstrap-preflight`,
  `user-identity-proof`, and `user-provisioning`; they must never be merged
  into one superset-secret worker.
- Migration `0070` intentionally supports the access-log lookup. Measured
  harness cost points to process/connection overhead, not proof of another
  missing index.

Required structural outcome: at most one lazy worker per profile, at most five
worker starts in nominal certification, one batch for 18 baselines, and at most
three SQL statements for the six-SEO provenance/delete/absence cycle, while
retaining 72 ordered logical cleanup receipts.

## Exact Single-Writer Ownership

The physical leaf is authoritative. It alone owns the reusable TypeScript
modules under `scripts/runtime-smoke/workers/` and
`scripts/runtime-smoke/database/`, the TASK-540 worker-operation and cleanup
adapter modules, and their `tests/unit/runtime-smoke/*` suites listed in that
leaf. For canonical TASK-540 integration it also alone owns these existing
runtime seams:

- `_docs/_workflows/task-540-smoke/runtime/bun-bridge-transport.mjs`;
- `_docs/_workflows/task-540-smoke/runtime/bun-child-protocol.mjs`;
- `_docs/_workflows/task-540-smoke/runtime/response-lost-baselines.mjs`;
- `_docs/_workflows/task-540-smoke/executor/cleanup-execution.mjs`;
- `_docs/_workflows/task-540-smoke/executor/capabilities/cleanup-lifecycle.mjs`;
- `_docs/_workflows/task-540-smoke/cleanup/final-baselines.mjs`;
- focused TASK-540 source/security tests only where those seams require an
  intended contract update.

It must not edit the frozen TASK-540 facade/orchestrator/bridge, action
manifest, product services, schema/migrations, task board, or changelog.
TASK-552-01 owns the shared entry point; TASK-552-03 owns browser transport,
profiles, checkpoints, auth-window control, and runtime benchmarks. Every
touched human-authored module/test remains at most 1,000 lines.

## Reusable Worker and Protocol Contract

- The reusable worker package under `scripts/runtime-smoke/workers/` must not
  import TASK-540 manifests or fixture constants. Task adapters register closed
  operation handlers, profiles, schemas, limits, and timing names.
- Key the pool only by exact environment profile. Keep `DB_POOL_MAX=1` for all
  database-bearing profiles. Start lazily, close privileged workers after their
  declared phase, and register all workers with TASK-552-01 supervision.
- Keep one-shot transport as an explicit test oracle/fail-closed fallback. Both
  transports call one handler registry; no duplicated operation logic.
- Use versioned, newline-delimited canonical JSON over inherited stdin/stdout:

```ts
type Request = {
  protocol: 1;
  requestId: number;
  operationId: RegisteredOperationId;
  inputSchemaId: string;
  sourceSha256: LowerHexSha256;
  input: PlainJsonObject;
};
type Response =
  | { protocol: 1; requestId: number; ok: true; output: PlainJsonValue }
  | { protocol: 1; requestId: number; ok: false; code: ClosedErrorCode };
```

- Parent and worker independently enforce exact keys, bounded UTF-8/frame size,
  monotonic IDs, descriptor/profile/handler hash, input/output schemas, and one
  response per request. Unknown, replayed, skipped, out-of-profile, malformed,
  or oversized frames terminate the worker.
- No listener, shell, arbitrary source/SQL/import path, environment upgrade, raw
  stdout diagnostics, or unbounded request concurrency is allowed.

## Batching and Failure Contract

1. Replace 18 serial baselines with two bounded least-privilege profile
   requests: 14 database reads and 4 identity-profile reads, with stable ordered
   projection into 18 logical receipts.
2. Freeze and validate the resource ledger before cleanup. Batch only its 32
   Bun/DB cleanup slots in foreign-key-safe dependency layers. Preserve the
   other 40 API/Node receipts under their existing authority; never run all 72
   logical receipts via unbounded `Promise.all` or synthesize them from DB output.
3. In each DB batch, read exact ownership/provenance, compare the complete set,
   delete only owned rows in one transaction, verify affected cardinality, then
   perform a bounded post-commit absence proof.
4. Batch SEO, settings/preferences, entries/types, screens/overrides, users,
   media metadata, sessions, access/audit logs, task traffic, and final baselines
   only where the existing dependency graph permits. Filesystem media remains
   under its current storage authority.
5. Project results back to the original deterministic logical receipt order.
   Never manufacture or drop a receipt.

Pre-dispatch failure may retry once only for an idempotent read. EOF, timeout,
invalid response, or worker death after complete dispatch is uncertain: never
replay a mutation. Terminate and prove the worker absent, start a fresh
least-privilege worker, run existing response-lost reconciliation, and accept
only exact pre-state or exact post-state. Partial/foreign/ambiguous state fails
closed. Signals stop admission, bound the in-flight operation, close DB once,
and preserve primary plus cleanup error codes without raw errors.

## Database Evidence and Migration Gate

No migration is authorized here. Inventory each changed query shape and record
sanitized `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` for representative
small/large synthetic fixtures with a read-only role and statement timeout.
Pin caller, selected columns, bounded cardinality, predicates/order, plan/index,
rows, and buffers; verify the intended `0070` access-log shape. Evidence must
exclude URLs, SQL binds, PII, credentials, and customer data.

If large-fixture evidence proves a production query needs schema/index work,
stop and author a separate migration task containing SQL, snapshot, journal,
locking/deploy/recovery notes, and production-caller evidence. Never add an
index solely to accelerate smoke tooling.

## Implementation Pseudocode

```ts
async function dispatch(state, descriptor, input) {
  validateDescriptorInputAndProfile(descriptor, input);
  const worker = await state.pool.forProfile(descriptor.envProfileId);
  const boundary = await worker.write(encodeFrame(descriptor, input));
  try {
    return validateOutput(descriptor, await worker.read(boundary.requestId));
  } catch (error) {
    await worker.invalidateAndProveAbsent();
    if (!boundary.dispatched && descriptor.retryClass === "idempotent-read")
      return retryOnce(state, descriptor, input);
    return reconcileUncertainMutationOrThrow(state, descriptor, input, error);
  }
}

async function cleanupLayer(state, layer) {
  const plan = buildExactBoundedBatch(state.frozenLedger, layer);
  const result = await dispatch(state, plan.descriptor, plan.input);
  assertExactProvenanceAffectedRowsAndAbsence(plan, result);
  return projectOriginalLogicalReceipts(plan, result);
}
```

## Tests and Gates

- Protocol/lifecycle: framing chunks, UTF-8/JSON/bounds/exact keys, IDs,
  profile/hash/schema drift, backpressure, EOF/timeout, process identity,
  TERM/KILL, signal, one DB close, exact environment, lazy reuse, and absence.
- Parity: every registered operation through persistent and one-shot transports
  returns the same validated output/error; registry completeness is pinned.
- Recovery/cleanup: pre/post-dispatch loss, committed/rolled-back/ambiguous
  writes, foreign/stale ownership, rollback/cardinality/FK ordering, 18 baseline
  receipts, six-SEO three-statement ceiling, and the exact 32 DB plus 40 API/Node
  split within all 72 cleanup receipts.
- Performance/redaction: at most five worker starts, no per-operation child in
  persistent mode, bounded timings/counters, and canary secrets absent.
- Plans: sanitized small/large evidence, query-count/cardinality/order budgets,
  selected-column contracts, and `0070` lookup coverage.

```bash
bun test tests/unit/workflows/task552*Bun*.test.ts \
  tests/unit/workflows/task552BatchedCleanup.test.ts \
  tests/unit/workflows/task552SmokeDatabasePlans.test.ts \
  tests/unit/workflows/task540SmokeExecutor{BunBridgeResourceSources,Security,SourceContracts}.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

TASK-552-03 owns the full runtime run. This task's gates still pin 496 logical
actions, 420 browser receipts, 76 runtime receipts, 13 screenshots, and all
existing product assertions.

## Security Contract

- **Visibility:** local inherited-pipe tooling only; no HTTP/API endpoint.
- **Auth/RBAC/CSRF/rate limits:** unchanged product contracts and no bypass.
- **Validation:** strict reject-unknown bounded frames, registries, arrays,
  cardinalities, and outputs on both sides.
- **Anti-abuse/secrets:** public nonce/HMAC/CAPTCHA are not applicable. Workers
  receive least-privilege profile environments and no arbitrary SQL/source/path;
  evidence excludes secrets, tokens, cookies, PII, SQL, binds, IDs, and stacks.

## Acceptance Criteria

All structural targets above pass; persistent and one-shot behavior is
equivalent; uncertain writes and cleanup fail closed; no migration/product/
browser/task-board/changelog file changes; certification semantics remain
496/420/76/13; and every touched human-authored module/test is at most 1,000
lines.
