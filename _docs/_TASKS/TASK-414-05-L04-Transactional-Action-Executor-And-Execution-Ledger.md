# TASK-414-05-L04: Transactional Action Executor and Execution Ledger
# FileName: TASK-414-05-L04-Transactional-Action-Executor-And-Execution-Ledger.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-05
**Priority:** Critical
**Category:** Agent / Action Runtime / Transactions / Modularity
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-02-L01 terminal; TASK-414-03-L02 terminal;
TASK-414-05-L05 terminal; TASK-551-08-L02 terminal; TASK-551-09-L02 terminal;
TASK-554 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Split the current 6,765-line
`core/services/assistant/actionExecutorService.ts` by cohesive action-domain
responsibility and add one transaction-owned execution lane for sensitive
Agent actions. In that lane the native effect, single-use approval settlement,
audit/outbox data, undo metadata, and complete sanitized execution result are
committed through one supplied transaction handle. A crash can therefore
replay the exact result or roll back the entire effect; it cannot publish a Post
and lose its idempotency/approval result.

Preserve the existing public imports and behavior for legacy reviewed action
families. This leaf does not turn every unrelated legacy action plan into one
cross-domain transaction. A transaction-owned action is deliberately a
single-action plan; mixed or multi-action plans containing one fail closed.
TASK-414-05-L01 registers all three Post actions in that strict lane.

## Sub-Tasks

None; this is an executable leaf that lands second inside TASK-414-05 after
L05's strict action contribution registry and closed-union split.

## Exact File Ownership

This leaf is the sole writer for:

- `core/services/assistant/actionExecutorService.ts` as a compatibility facade
  below 1,000 physical lines;
- `core/services/assistant/actionExecutionStore.ts` as a Bun-free facade over
  the tx-aware repository supplied by TASK-414-03-L02;
- new `core/services/assistant/actionExecution/actionExecutionContract.ts`;
- new `core/services/assistant/actionExecution/actionExecutionErrors.ts`;
- new `core/services/assistant/actionExecution/actionExecutionResult.ts`;
- new `core/services/assistant/actionExecution/actionExecutorDeps.ts`;
- new `core/services/assistant/actionExecution/actionExecutionOrchestrator.ts`;
- new `core/services/assistant/actionExecution/actionPostCommitCollector.ts`;
- new `core/services/assistant/actionExecution/actionHandlerRegistry.ts`;
- new `core/services/assistant/actionExecution/actionPreviewHelpers.ts`;
- new `core/services/assistant/actionExecution/actionDependencyHelpers.ts`;
- new handler modules under
  `core/services/assistant/actionExecution/handlers/` named
  `contentTypeActionHandlers.ts`, `customScreenActionHandlers.ts`,
  `listingActionHandlers.ts`, `pageActionHandlers.ts`,
  `widgetActionHandlers.ts`, `formActionHandlers.ts`,
  `entryActionHandlers.ts`, `menuSeoActionHandlers.ts`,
  `routeSettingActionHandlers.ts`, `automationActionHandlers.ts`, and
  `siteKitCompatibilityActionHandlers.ts`;
- new focused suites under
  `tests/unit/assistant/actionExecution/` and
  `tests/integration/assistant/actionExecution/`;
- existing `tests/unit/assistant/actionExecutor*.test.ts` and
  `tests/unit/assistant/support/actionExecutor*.ts` only for import-preserving
  regression adjustments; every touched file remains below 1,000 lines;
- new `core/db/tables/assistantActionExecutionLease.ts` and one SQL migration
  with matching `meta/*_snapshot.json` and `_journal.json` artifacts for the
  durable `assistant_action_execution_leases` table — this leaf's own migration
  scope, never TASK-414-03-L02's 41-table migration;
- new `core/services/assistant/actionExecution/actionExecutionLeaseStore.ts`
  (durable lease repository) and focused lease fixtures under
  `tests/unit/assistant/actionExecution/` and
  `tests/integration/assistant/actionExecution/`.

The final split may introduce an additional narrowly named handler/helper only
when line-count or dependency analysis proves one listed module would exceed
1,000 lines; amend this exact ownership list before editing it. Do not create a
generic `utils.ts`, duplicate registry, or index-barrel import cycle.

Forbidden: L05-owned `core/services/assistant/actionPlanTypes.ts`,
`actionPlanSchema.ts`, `actionFamilyContracts.ts`, and `actionRegistry.ts`,
`core/server/validation/assistantActionSchemas.ts`,
`core/server/routes/assistantRoutes.ts`, native domain services, Post files,
TASK-554 files, TASK-414-03 schema/migrations/repositories (the durable
execution lease table and its migration are this leaf's own scope, not
TASK-414-03-L02's), shared route mounts, Admin UI, task indexes, and changelog. If the terminal L05 contribution seam is
incomplete, return to L05 contract correction; do not reopen or bypass its
facades/registry.

## Handler and Transaction Contract

The registry is closed/static and exposes exactly two execution modes:

```ts
export type AssistantActionExecutionModeV1 =
  | "legacy_reviewed"
  | "transaction_owned_single";

export interface TransactionOwnedAssistantActionHandlerV1<Action, Result> {
  readonly type: string;
  readonly executionMode: "transaction_owned_single";
  preview(input: ActionPreviewInput<Action>): Promise<AssistantActionPreviewChange>;
  executeTx(
    tx: ProductTransaction,
    input: TransactionOwnedActionInput<Action>,
  ): Promise<TransactionOwnedNativeReceipt<Result>>;
}

export type TransactionOwnedNativeReceipt<Result> = Readonly<{
  value: Result;
  cacheFacts: readonly FiniteNativeCacheFactV1[];
  auditFacts: SafeActionAuditFactsV1;
  undoFacts: readonly BoundedActionUndoFactV1[];
  approvalSettlement: ActionApprovalSettlementFactV1 | null;
}>;
```

`executeTx` receives the only DB handle and performs no provider, network,
object-store, cache publication, or other irreversible external I/O. Any
private preparation occurs outside the native-effect transaction only after a
fresh authorization check and a short actor/idempotency-key transaction has
returned a durable fenced preparation attempt. It is idempotently reused by
retry and marked consumed in the native-effect transaction; compensation is
allowed only after exact absent-commit plus attempt-fence evidence.
Correctness-critical external work is represented by the terminal
transactional outbox.

A transaction-owned handler may read/lock and mutate only its native domain
through `tx`, then return the strict receipt above. It may not create an event
key, build/persist/apply an invalidation plan, write an outbox/audit/execution/
undo row, claim or settle an approval, or call a global DB/cache client. The L04
orchestrator is the sole owner of those cross-cutting writes. The static action
descriptor tells L04 whether a generic L02 approval row is required and supplies
pure binding validation; L04 locks/revalidates that row before the handler and
settles it after receipt validation in the same transaction.

The executor rejects a transaction-owned action unless the normalized plan has
exactly one action, one completed current dry-run/review, one immutable plan and
action hash, one actor-scoped idempotency key, and all handler-owned approval
facts required by the action. It never silently falls back to the legacy lane.

The existing `assistant_action_executions` repository contract from
TASK-414-03-L02 is actor-scoped by the named unique key
`(actor_id, idempotency_key)` and supports all reads/writes through a supplied
`tx`. Lookup must include exact actor, plan ID, plan hash, action ID/hash, and
execution mode. A matching complete row returns its original sanitized result;
any mismatch is `assistant_action_idempotency_conflict`.

## Durable Execution Lease Contract

Execution serializes in one canonical order: actor/idempotency advisory lock,
exact ledger row, then the durable execution lease. The lease lives in a new
L04-owned storage table `assistant_action_execution_leases` — one row per
actor/idempotency-key execution — created by this leaf's own SQL migration
plus matching `meta/*_snapshot.json` and `_journal.json` artifacts; it is not
part of TASK-414-03-L02's migration or schema scope. The row records the owner
run ID, actor, idempotency key, random secret hash, monotonically increasing
fence, acquired/heartbeat/expiry timestamps, and bounded phase. The raw random
secret remains process memory only; stored and returned values are the hash.
Acquire, renew/heartbeat, release, expiry, and recovery use compare-and-swap
fence semantics: every transition requires the exact current fence (and, on
release/renew, the matching secret hash), so a lower fence can never displace a
live owner. Acquisition is a transaction-safe insert/CAS — an active
(unexpired) lease returns `assistant_action_lease_busy`, and only an expired
lease may be reclaimed by a higher fence. Multi-replica exclusivity comes from
the durable row plus fence compare-and-swap; there is no process mutex and no
in-memory lock can substitute for the lease. Recovery reclaims expired leases
through `reclaimExpiredActionLeaseWithHigherFence(runId, actor, idempotencyKey,
secretHash)`, which becomes the new owner only when the recorded lease is
expired. Expiry, release, and cleanup take the same lock/lease path and cannot
claim a live execution. The lease never weakens the actor-scoped idempotency
ledger: a matching complete ledger row still returns its stored replay before
any preparation, and the native transaction re-reads the exact binding under
the same lease. The executor composes the advisory lock and the durable lease
in the same short transactions as preparation-claim and native execution; the
lease is renewed by heartbeat and released only after complete evidence or
exact expired higher-fence reclaim.

## Atomic Execution Protocol

1. Strictly normalize and hash the plan/action outside the transaction; perform
   fresh current RBAC, capability, session, target, and dry-run checks before
   any private preparation or other effect.
2. In one short transaction, acquire the actor/idempotency advisory lock AND
   the durable execution lease (`assistant_action_execution_leases`) for that
   actor/idempotency key, then read the exact ledger binding. Return a matching
   complete replay before any preparation; reject a binding conflict; otherwise
   create/claim exactly one durable fenced preparation attempt on that unique
   ledger row. An active lease returns busy
   (`assistant_action_lease_busy`), and only an expired lease may move to a
   higher fence through `reclaimExpiredActionLeaseWithHigherFence`.
3. Reauthorize the exact preparation permission against current server state,
   then prepare-or-reuse private material idempotently by `{attemptId, fence,
   bindingDigest}`. Persist the encrypted reference/digest with a fenced CAS.
   Process loss leaves one reclaimable attempt, never an unbound object.
4. Allocate or load from that ledger row one opaque execution ID, one opaque
   cache `eventKey`, and one empty bounded `ActionPostCommitCollectorV1`.
   Retries/replays never allocate new identities for the same actor/key.
5. Open the native-effect transaction, reacquire the same advisory lock,
   renew/heartbeat the same durable execution lease, and reread the exact
   ledger/attempt. A now-complete matching replay returns only
   its stored result and consumes no new preparation; a prepared attempt is
   reused. Any missing, stale-fence, unbound, or inconsistent state enters
   reconciliation before native calls.
6. Reauthorize current native permissions, rehydrate every target/binding, and
   lock/revalidate the exact generic action approval through L02 when required.
7. Invoke exactly one `transaction_owned_single` handler through the same `tx`;
   accept only its normalized native receipt/facts.
8. Feed the receipt into the preallocated collector and finalize exactly one
   canonical TASK-551 plan `{ eventKey, tags }`. Build and schema-normalize the
   complete result, approval settlement, bounded undo item, and audit receipt.
9. Persist approval settlement, audit, exact TASK-551 outbox plan, undo row,
   attempt `consumed` transition, and complete sanitized execution ledger
   through the same `tx`. The ledger stores the exact `eventKey`, canonical plan
   body/version/digest, result/digest, and execution/approval/preparation
   binding; assert its plan is byte-equivalent to the outbox input before
   commit. Commit once.
10. Invoke `applyAfterCommit(plan)` after commit. Recovery may replay the stable
   event key, so transport is at-least-once and effects are idempotent/
   effectively-once.

A thrown transaction rolls back the native effect and every terminal receipt.
An unavailable/ambiguous commit classifier never reruns the native handler or
compensates private preparation; it records reconciliation. Exact `absent`
evidence plus ownership of the current preparation fence permits one idempotent
compensation CAS. Exact `complete` evidence must include the matching consumed
attempt and projects the stored result without preparing or executing again.

For exact committed recovery, parse the plan only from the execution ledger,
verify its version/digest/event key against the transactional outbox row, and
replay that exact plan. Missing/malformed/mismatched plan evidence transitions
to `assistant_action_reconciliation_required`; it is never regenerated from the
current resource, result, or action. A successful postcommit observation may be
recorded idempotently after `applyAfterCommit`, but failure to record that
observation cannot undo or repeat the native transaction.

## Implementation Pseudocode

```ts
export async function executeTransactionOwnedAssistantAction(
  input: ExecuteTransactionOwnedActionV1,
  deps: TransactionOwnedActionDeps,
): Promise<AssistantActionExecuteResult> {
  const normalized = assertSingleTransactionOwnedPlan(input);
  await deps.authorization.requireCurrentPreparationAccess(normalized);
  const claim = await deps.db.transaction(async (tx) => {
    await deps.executionStore.lockActorIdempotencyAndLeaseTx(
      tx,
      normalized.actorKey,
    ); // advisory lock + durable `assistant_action_execution_leases` CAS
    return deps.executionStore.returnReplayOrClaimPreparationAttemptTx(
      tx,
      normalized.binding,
      { reclaimExpiredWithHigherFence: true },
    );
  });
  let committed: CommittedActionExecutionV1;

  if (claim.state === "complete") {
    committed = projectCommittedActionReplay(
      requireConsumedPreparationBinding(claim),
    );
  } else {
    let prepared: FencedPreparedActionAttemptV1 | null = null;
    try {
      await deps.authorization.requireCurrentPreparationAccess(normalized);
      const preparedAttempt = await deps.privatePreparation.prepareOrReuseExact({
        attemptId: claim.attemptId,
        fence: claim.fence,
        bindingDigest: claim.bindingDigest,
        normalized,
      });
      prepared = preparedAttempt;
      await deps.executionStore.markPreparedFenced(preparedAttempt);
      const postCommitCollector = createActionPostCommitCollector({
        eventKey: claim.eventKey,
      });
      committed = await deps.db.transaction(async (tx) => {
        await deps.executionStore.lockActorIdempotencyAndLeaseTx(
          tx,
          normalized.actorKey,
        ); // reacquire lock + renew/heartbeat durable lease
        const current = await deps.executionStore.readExactTx(tx, normalized.binding);
        if (current.state === "complete") {
          return projectCommittedActionReplay(
            requireConsumedPreparationBinding(current),
          );
        }
        const exactPrepared =
          await deps.executionStore.lockAndRequirePreparedAttemptTx(tx, {
            attemptId: claim.attemptId,
            fence: claim.fence,
            preparedDigest: preparedAttempt.digest,
          });
        const authorized = await deps.authorization.reauthorizeTx(tx, normalized);
        const approval = await deps.approvals.lockAndRequireExactTx(
          tx,
          normalized.requiredApprovalBinding,
        );
        const handler = deps.handlers.requireTransactionOwned(normalized.action.type);
        const native = await handler.executeTx(tx, {
          ...authorized,
          approval,
          action: normalized.action,
          preview: normalized.preview,
          prepared: exactPrepared,
        });
        const result = normalizeCompleteExecutionResult(normalized, native);
        const postCommitPlan = postCommitCollector.finalize(native.cacheFacts);
        await deps.approvals.settleFromReceiptTx(tx, {
          approval,
          executionId: claim.executionId,
          fact: native.approvalSettlement,
          resultDigest: digestExecutionResult(result),
        });
        await deps.audit.writeActionExecutionTx(tx, normalized, native.auditFacts);
        await deps.invalidation.persistOutboxTx(tx, postCommitPlan);
        await deps.undo.persistFactsTx(tx, claim.executionId, native.undoFacts);
        await deps.executionStore.saveCompleteAndConsumePreparationTx(tx, {
          ...normalized.binding,
          executionId: claim.executionId,
          eventKey: claim.eventKey,
          preparationAttemptId: claim.attemptId,
          preparationFence: claim.fence,
          preparedDigest: preparedAttempt.digest,
          postCommitPlan,
          postCommitPlanDigest: digestCanonicalPostCommitPlan(postCommitPlan),
          result,
          resultDigest: digestExecutionResult(result),
        });
        await deps.executionStore.assertOutboxPlanIdentityTx(tx, {
          executionId: claim.executionId,
          postCommitPlan,
        });
        return {
          executionId: claim.executionId,
          result,
          postCommitPlan,
          postCommitPlanDigest: digestCanonicalPostCommitPlan(postCommitPlan),
        };
      });
    } catch (error) {
      const evidence = await deps.commitClassifier.classifyExact({
        binding: normalized.binding,
        attemptId: claim.attemptId,
        fence: claim.fence,
      });
      if (evidence.state === "complete_consumed") {
        committed = projectCommittedActionReplay(evidence);
      } else if (evidence.state === "absent_attempt_owned") {
        await deps.privatePreparation.compensateExactFenced({ prepared, evidence });
        throw mapAssistantActionExecutionError(error);
      } else {
        await deps.recovery.recordAmbiguousWithoutReexecution({
          normalized, prepared, claim,
        });
        throw domainError("assistant_action_reconciliation_required");
      }
    }
  }

  await deps.invalidation.applyAfterCommit(committed.postCommitPlan);
  await deps.executionStore.recordPostCommitObservedIdempotently({
    executionId: committed.executionId,
    planDigest: committed.postCommitPlanDigest,
  });
  return committed.result;
}
```

The legacy facade continues to export `dryRunAssistantActionPlan` and
`executeAssistantActionPlan`. It delegates previews and legacy handlers to the
new registry/orchestrator, and delegates strict actions to the transaction-owned
lane based only on the server-owned static descriptor. No provider/client flag
selects execution mode.

## Machine-Readable Errors

- `assistant_action_transaction_required`
- `assistant_action_transaction_mixed_plan`
- `assistant_action_transaction_handler_missing`
- `assistant_action_idempotency_conflict`
- `assistant_action_lease_busy`
- `assistant_action_lease_lost`
- `assistant_action_reconciliation_required`
- `assistant_action_postcommit_plan_invalid`
- `assistant_action_postcommit_evidence_mismatch`
- existing normalized native/approval errors through centralized mappers

Errors omit plan/action bodies, unpublished content, actor/session values,
approval tokens, advisory-lock digests, SQL/driver text, private object refs,
provider payloads, and stack traces.

## Security Contract

| Concern | Contract |
|---|---|
| Visibility | Service-only executor; no new endpoint. Existing internal Assistant routes remain the only callers. |
| Authentication | Trusted server-derived Admin actor/session context is required; IDs and execution mode in provider/client data are never trusted. |
| RBAC | Recheck `assistant:use` and the handler's exact current native permission union immediately before the effect inside the transaction. No Assistant capability widens native RBAC. |
| CSRF | Calling Admin execute POST retains shared CSRF. The service and recovery worker expose no HTTP bypass. |
| Rate limit | Existing `assistant` execute bucket plus one actor/idempotency advisory lock and one durable execution lease (`assistant_action_execution_leases`) per actor/key, bounded plan size, private-preparation quota, and bounded reconciliation retries. Replays consume quota. |
| Validation | Recursive reject-unknown plan/action/approval/result/receipt schemas; exact hashes and actor-scoped key; single transaction-owned action; bounded result/undo/audit/postcommit data. |
| Anti-abuse | No public write. Session + CSRF + RBAC + current target rehydration + tx advisory lock + durable execution lease/fence (`assistant_action_execution_leases`) + unique actor/key + immutable hashes + commit classifier prevent replay, duplicate cross-replica execution, and confused-deputy writes. |

## Regression-Test Shape

- Import-compatibility suites prove every pre-split public export and existing
  legacy action result remains stable.
- Registry parity proves every action type has exactly one handler and one
  server-owned execution mode; duplicate/missing registrations fail startup.
- All extracted production/test files remain independently runnable and at most
  1,000 physical lines; no circular imports or import-time DB coupling in pure
  contracts/registries.
- Mixed/multi-action transaction-owned plans, unknown modes, unknown nested
  fields, and provider/client mode overrides fail before service I/O.
- Concurrent same actor/key requests serialize and execute the native handler
  once; same key for another actor is independent; changed plan/action binding
  conflicts.
- Multi-replica lease fixtures prove acquire/renew/release/expiry with fence
  compare-and-swap, `assistant_action_lease_busy` on an active lease, exactly
  one higher-fence reclaim of an expired lease via
  `reclaimExpiredActionLeaseWithHigherFence`, `assistant_action_lease_lost` on
  heartbeat/fence loss, and no process-mutex path; the lease table is covered
  by this leaf's own migration/snapshot/journal parity test.
- Authorization revoked before preparation causes zero external preparation;
  revoked after preparation but before native execution causes no native effect
  and compensates only through exact absent-commit/current-fence evidence.
- A committed replay exits before preparation. A crash after preparation leaves
  one fenced attempt that a retry reuses byte-for-byte; concurrent retries
  cannot allocate a second private object. A replay observed after preparation
  requires the same attempt already marked consumed and never leaks or blindly
  compensates a newly created attempt.
- Fault injection before/after native effect, approval settlement, audit,
  outbox, undo, result insert, and commit proves complete rollback or exact
  replay. Ambiguous evidence causes no handler replay or compensation.
- Process loss immediately after commit returns byte-equivalent sanitized result
  and produces no duplicate native effect/approval consumption.
- Global-DB spies fail if a transaction-owned handler/repository path escapes
  its supplied `tx`; external-I/O spies fail inside the transaction.
- Postcommit recovery may call the same event key repeatedly with one effective
  cache/outbox outcome.
- Source/dependency spies prove handlers return only the closed native receipt and
  cannot import/call audit, approval settlement, undo, outbox, event-key,
  invalidation persistence/application, or global DB owners. Ledger/outbox tests
  mutate event key, plan version/body/digest, tags, and result binding; any
  difference stops recovery without native re-execution.

## Testing Requirements

```bash
bun test \
  tests/unit/assistant/actionExecution \
  tests/unit/assistant/actionExecutor*.test.ts
set -a && source .env && set +a
bun test tests/integration/assistant/actionExecution
# this leaf's own `assistant_action_execution_leases` migration: run the
# terminal migration/schema parity command and a clean-DB migration lane
bun --cwd core lint:types
bun --cwd core lint
bun run scan:security:strict
git diff --check
wc -l core/services/assistant/actionExecutorService.ts \
  core/services/assistant/actionExecutionStore.ts \
  core/services/assistant/actionExecution/*.ts \
  core/services/assistant/actionExecution/handlers/*.ts \
  core/db/tables/assistantActionExecutionLease.ts \
  tests/unit/assistant/actionExecution/*.ts \
  tests/integration/assistant/actionExecution/*.ts
```

## Done Criteria

- The 6,765-line executor is split by domain; every touched production/test file
  is at most 1,000 physical lines and public imports remain stable.
- Transaction-owned actions are strict single-action plans with no legacy
  fallback.
- Native effect, approval settlement, audit/outbox, undo metadata, and complete
  actor-scoped execution result commit through one transaction handle.
- Current authorization and the unique actor/key ledger gate precede private
  preparation; retries reuse one fenced attempt, and the native transaction
  consumes it atomically or exact evidence drives bounded compensation.
- One L04-owned collector allocates the pretransaction event key; the exact
  canonical plan is byte-bound in ledger and outbox and is the only recovery
  input.
- Crash/race tests prove exact replay or full rollback and no blind replay on an
  ambiguous commit.
- One L04-owned durable execution lease (`assistant_action_execution_leases`,
  fence compare-and-swap) provides multi-replica exclusivity per actor/key and
  is created by this leaf's own migration with full SQL/snapshot/journal
  artifacts.
- TASK-414-05-L01 can register Post actions without editing any oversized legacy
  module.

## Documentation Updates Required

Hand the split map, execution modes, atomicity/idempotency protocol, durable
execution lease contract, recovery, and validation receipts to TASK-414-11-L01.
This leaf edits no shared docs, task board/status, or changelog.
