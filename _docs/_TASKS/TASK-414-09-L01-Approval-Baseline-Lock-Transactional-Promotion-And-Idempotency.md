# TASK-414-09-L01: Approval Baseline Lock, Transactional Promotion, and Idempotency
# FileName: TASK-414-09-L01-Approval-Baseline-Lock-Transactional-Promotion-And-Idempotency.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-09
**Priority:** Critical
**Category:** Designer / Transactions / Promotion
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-08 terminal; TASK-547-02-L01,
TASK-547-02-L02, and TASK-547-02-L03 terminal; TASK-551-08-L02,
TASK-551-09-L02, and TASK-551-09-L03 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Capture a short-lived actor-bound approval intent against a fresh live-site
baseline, serialize promotion with a durable workspace/global-content lease,
and orchestrate promotion of the exact reviewed staged graph through one
encompassing product-transaction seam. TASK-414-09-L04 implements that seam and
the generation-consistent active-pointer cutover; this leaf owns the approval,
lease, adapter, ledger/idempotency contracts and calls the injected cutover.
Idempotent replay returns only the result for the same complete approval tuple.


## Sub-Tasks

None; this is an executable leaf.
## Exact Ownership

This leaf is the sole writer for:

- `core/services/designer/approvalContract.ts`
- `core/services/designer/liveSiteBaseline.ts`
- `core/services/designer/promotionLeaseService.ts`
- `core/services/designer/promotionAdapterContract.ts`
- `core/services/designer/promotionCapabilityRegistry.ts`
- `core/services/designer/promotionLedgerService.ts`
- `core/services/designer/promotionService.ts`
- `core/services/designer/promotionIdempotency.ts`
- `tests/vitest/designer/designer-approval-contract.test.ts`
- `tests/vitest/designer/designer-live-baseline.test.ts`
- `tests/vitest/designer/designer-promotion-plan.test.ts`
- `tests/integration/designer/designer-promotion-lease.test.ts`
- `tests/integration/designer/designer-promotion-transaction.test.ts`
- `tests/integration/designer/designer-promotion-idempotency.test.ts`

It consumes terminal TASK-547 graph/plan/native adapter contracts and terminal
TASK-551 transaction-aware native services/invalidation APIs. It must not edit
TASK-547 or native domain services, canonical schemas/tables, TASK-551 cache
modules, route/schema/mount files, Admin UI, cleanup/backup/recovery modules,
runtime-smoke files, task indexes, or changelog.

TASK-414-09-L04 supplies the generation-aware product transaction and
TASK-414-09-L03 later supplies aggregate invalidation plus final composition.
This leaf declares those injected seams but does not invent cache tags, switch
the active generation itself, or call cache epochs/fences directly.

## Approval and Baseline Contract

`prepareDesignerApproval()` locks the owner-scoped ready workspace, rechecks
all revision/core/sidecar/bundle/graph/plan/receipt/preview/version bindings, resolves the
current native permission union from the server plan, checks every permission,
and computes a fresh deterministic live-site baseline.

The baseline is a versioned canonical digest over only the live resource and
installation dependencies the exact promotion plan may observe or mutate, including
stable native identity/version tokens, relevant route/slug uniqueness sets,
selected shell/settings dependencies, and adapter capability versions. Reads
use stable ordering, bounded projections, and one consistent DB snapshot. Large
documents/secrets are represented only by owner-produced version/digests; raw
credentials, encrypted fields, or unrelated rows are never selected.

The immutable approval intent binds the full locked tuple, actor ID, permission
union/digest, baseline digest, issued/expiry time, and one normalized
idempotency key. It imports `ASSISTANT_RETENTION_POLICY_V1` and uses exactly
`assistant-approval-intent`: five minutes from `issued_at`, no refresh, hard
and non-configurable. It is single-use except for
same-tuple idempotent replay. Preparing approval performs no canonical write,
external I/O, lease claim, or workspace state transition.

## Durable Lease and Adapter Contract

Promotion acquires locks in one canonical order: global content-activation
pointer/serialization key, workspace row, then lease row. The durable lease
records owner/run ID, random secret hash, monotonically increasing fence,
acquired/heartbeat/expiry times, and bounded phase. Compare-and-swap heartbeat/
release requires the same fence. The installation can have only one activation
cutover and each workspace only one live promotion. Expiry, reject, and cleanup
take the same locks and cannot claim a live promotion.

This promotion lease is unrelated to the Assistant action-execution lease:
`assistant_action_execution_leases` and its fence compare-and-swap lifecycle
are owned by TASK-414-05-L04's transactional action executor.

```ts
export interface DesignerPromotionAdapter<Resource> {
  readonly kind: DesignerStagedResourceKindV1;
  readonly capabilityVersion: string;
  validateStage(value: unknown): NormalizedStageResource<Resource>;
  preparePrivate?(
    input: PreparedResourceInput,
    context: PromotionPrepareContext
  ): Promise<PrivatePreparationReceipt>;
  applyTx(
    tx: ProductTransaction,
    input: NormalizedStageResource<Resource>,
    context: PromotionApplyContext
  ): Promise<CanonicalResourceReceipt>;
  compensatePrivate?(
    receipt: PrivatePreparationReceipt,
    context: PromotionCompensationContext
  ): Promise<void>;
}
```

`applyTx` must use only the supplied transaction and tx-aware native service
adapters, return only required canonical identity/version fields, and perform
no external I/O/cache publication. Private preparation is unreachable and
workspace-owned until ownership transfers in the product transaction.
Correctness-critical post-commit external publication uses the durable outbox.
If any plan kind lacks this capability, approval returns unavailable before a
lease or canonical mutation.

## Implementation Pseudocode

```ts
export async function promoteDesignerWorkspace(
  command: PromoteDesignerWorkspaceCommand,
  deps: DesignerPromotionDeps
): Promise<DesignerPromotionResult> {
  const replay = await deps.idempotency.readExact(command.actor, command.idempotencyKey);
  if (replay) return assertSameApprovalTupleOrConflict(replay, command);

  const lease = await deps.leases.acquire({
    actor: command.actor,
    workspaceId: command.workspaceId,
    expectedVersion: command.expectedVersion,
    approvalIntentId: command.approvalIntentId,
  }); // atomically enters promotion_pending

  const snapshot = await deps.stage.loadExactApprovedSnapshot(command, lease);
  const preparation = await deps.privatePreparation.prepareCheckpointed(
    snapshot, deps.adapters, lease,
  );
  if (preparation.state === "failed_before_cutover") {
    await deps.recovery.enqueueExactPrivateCompensation(
      lease, preparation.compensationPlan,
    );
    throw mapPromotionDomainError(preparation.error);
  }
  await deps.checkpoints.recordPrivatePrepared(lease, preparation.receipt);

  const commitOutcome = await deps.cutover.commitPreparedDesignerGeneration({
    command,
    lease,
    prepared: preparation.receipt,
    // L04 re-locks and reauthorizes every approval/baseline/generation fact
    // and performs native writes, complete generation mapping/artifacts,
    // ledger/outbox/state/audit, and pointer CAS in one DB transaction.
  });

  if (commitOutcome.state === "precommit_absent") {
    await deps.recovery.enqueueExactPrivateCompensation(
      lease, commitOutcome.compensationPlan,
    );
    await deps.leases.returnToReviewAfterAbsentCommit(lease);
    throw domainError("designer_promotion_conflict");
  }
  if (commitOutcome.state === "reconciliation_required") {
    await deps.leases.markReconciliationRequired(
      lease, commitOutcome.reconciliationId,
    );
    // Commit state is ambiguous: preserve every private object and never rerun
    // native adapters until the durable classifier reaches complete or absent.
    throw domainError("designer_promotion_reconciliation_required");
  }

  const observation = await deps.invalidation.applyAfterCommit(
    commitOutcome.postCommitPlan,
  );
  await deps.checkpoints.markPostCommitObserved(lease, observation);
  await deps.leases.completeCommitted(lease, commitOutcome.commitEvidence);
  return commitOutcome.result;
}
```

`persistCacheInvalidationTx(tx, plan, backend)` and the runtime handle come
from terminal TASK-551. The exact plan is `{ eventKey, tags }` with finite
`CacheTag` values only—no IDs, slugs, paths, package data, or arbitrary
payload. After commit the caller invokes and awaits only
`runtime.invalidation.applyAfterCommit(plan)` once in the uninterrupted call.
Recovery may invoke it again with the same stable `eventKey`, so delivery is
at-least-once and the terminal TASK-551 effect is idempotent/effectively-once.
Its
`applied | queued | bypassed` result does not roll back a committed promotion;
transport failure is absorbed by the terminal lifecycle/outbox contract.

## Data Flow

```text
reviewed ready revision
  -> current actor/native RBAC + fresh baseline approval intent
  -> same-tuple idempotency check
  -> singleton activation lock + workspace durable lease + promotion_pending CAS
  -> private unreachable external preparation
  -> L04 one product transaction:
       lease/binding/RBAC/baseline recheck
       tx-aware native apply in stable plan order
       canonical graph + complete generation mapping/artifacts
       ledger + ownership + promoted state + audit + invalidation outbox
       active-generation pointer CAS
  -> commit
  -> await applyAfterCommit(plan); recovery may replay the same eventKey
  -> complete lease/checkpoint
```

Only classifier evidence of `absent` permits private compensation after a
cutover attempt. `complete` is projected as committed replay; unavailable,
contradictory, or otherwise ambiguous evidence preserves private preparation
and enters reconciliation. A postcommit interruption never reruns native
adapters; TASK-414-09-L03 reconciles from the atomic ledger and replays only
the stable postcommit event.

## Machine-Readable Errors

- `designer_approval_invalid`
- `designer_approval_expired`
- `designer_approval_actor_mismatch`
- `designer_receipt_stale`
- `designer_preview_stale`
- `designer_baseline_stale`
- `designer_native_permission_denied`
- `designer_promotion_capability_unavailable`
- `designer_promotion_in_progress`
- `designer_promotion_lease_lost`
- `designer_promotion_conflict`
- `designer_idempotency_conflict`
- `designer_promotion_reconciliation_required`

Safe errors may expose current workspace state/version, missing capability kind,
and bounded retry-after only. They omit canonical IDs before success, baseline
contents, permission inventories, lease/fence tokens, SQL/driver text, private
paths, provider data, and stack traces.

## Security Contract

| Concern | Contract |
|---|---|
| Visibility | Service-only leaf behind internal approval/promotion APIs. It creates no public endpoint and never accepts a preview-session ID or bind secret as Admin authorization. |
| Authentication | Trusted Admin actor context is mandatory at intent and promotion. Recovery uses a bounded system identity but rechecks the recorded actor is active and still holds current permissions before any precommit resume. |
| RBAC | Approval/promotion requires `designer:promote` plus the exact current native permission union derived from the bound plan. Product permissions do not imply Settings or native writes. |
| CSRF | Internal approval and promotion POST callers require shared CSRF before service dispatch. No worker exposes HTTP mutation. |
| Rate limits | Both endpoints use `designer-promotion`; additionally the singleton installation activation lock, one workspace lease, intent TTL, per-actor and installation-wide daily limits, idempotency cardinality, and bounded adapter/recovery retries apply. |
| Validation | Strict reject-unknown commands/intents/leases/adapter receipts/ledger/results; exact binding and baseline equality; native schema normalization; tx constraints; bounded digests, arrays, diagnostics, and idempotency keys. |
| Anti-abuse | Session + CSRF + RBAC + owner scope + fresh baseline + global activation lock + durable workspace lease/fence + idempotency protect internal writes. No public write, nonce/HMAC, or reCAPTCHA path exists. |

## Regression-Test Shape

Vitest covers canonical baseline/approval tuple serialization, every bound-field
mutation, TTL, permission-union derivation, stable adapter order, unsupported
capability, finite cache-plan projection, and idempotency same/different tuple.

Bun/PostgreSQL tests cover:

- concurrent global/workspace lease acquisition, heartbeat/fence loss, expiry,
  canonical lock order, and no deadlock;
- live-site mutation after intent causing baseline conflict before writes;
- actor deactivation/permission loss after intent causing denial before writes;
- all TASK-547 resource kinds supported only through tx-aware adapters;
- injected failure before/after every adapter, ledger, ownership, state, audit,
  invalidation-outbox, and commit boundary;
- rollback leaves canonical tables/cache/outbox/ledger/workspace unchanged and
  compensates only private preparation;
- successful commit exposes the complete graph at once through L04's active
  generation and maps every stable staged key exactly once; concurrent read
  fixtures see complete old or complete new state, never a mixture;
- same idempotency tuple returns the original result with zero adapter calls;
  different tuple/key reuse conflicts;
- `persistCacheInvalidationTx` occurs inside the product transaction and
  the uninterrupted caller invokes and awaits `applyAfterCommit(plan)` after
  commit for each `applied|queued|bypassed` outcome; crash recovery may replay
  the same event key without duplicating its effect; no direct epoch/fence
  calls;
- commit-classifier fixtures prove `absent` is the only outcome that permits
  compensation, `complete` returns the exact committed result, and ambiguous
  evidence preserves private objects and native-write idempotency;
- query-count, returned-column, lock-timeout, and transaction-handle guards.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/designer/designer-approval-contract.test.ts \
  tests/vitest/designer/designer-live-baseline.test.ts \
  tests/vitest/designer/designer-promotion-plan.test.ts
set -a && source .env && set +a && bun test \
  tests/integration/designer/designer-promotion-lease.test.ts \
  tests/integration/designer/designer-promotion-transaction.test.ts \
  tests/integration/designer/designer-promotion-idempotency.test.ts
git diff --check
wc -l core/services/designer/approvalContract.ts \
  core/services/designer/liveSiteBaseline.ts \
  core/services/designer/promotionLeaseService.ts \
  core/services/designer/promotionAdapterContract.ts \
  core/services/designer/promotionCapabilityRegistry.ts \
  core/services/designer/promotionLedgerService.ts \
  core/services/designer/promotionService.ts \
  core/services/designer/promotionIdempotency.ts \
  tests/vitest/designer/designer-approval-contract.test.ts \
  tests/vitest/designer/designer-live-baseline.test.ts \
  tests/vitest/designer/designer-promotion-plan.test.ts \
  tests/integration/designer/designer-promotion-lease.test.ts \
  tests/integration/designer/designer-promotion-transaction.test.ts \
  tests/integration/designer/designer-promotion-idempotency.test.ts
```

## Documentation Updates Required

Provide the closure leaf with approval tuple/TTL, baseline definition,
permission and unsupported-adapter UX, lease/timeout policy, idempotency rules,
transaction boundary, and post-commit outcome semantics. Do not edit TASK-547/
TASK-551 docs, task indexes, or changelog 1266 here.
