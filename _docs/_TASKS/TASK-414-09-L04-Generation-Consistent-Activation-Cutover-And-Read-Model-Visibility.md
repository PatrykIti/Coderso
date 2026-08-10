# TASK-414-09-L04: Generation-Consistent Activation Cutover and Read-Model Visibility
# FileName: TASK-414-09-L04-Generation-Consistent-Activation-Cutover-And-Read-Model-Visibility.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-09
**Priority:** Critical
**Category:** Designer / Atomic Visibility / Read Models / Search / Cache
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-09-L01; TASK-414-09-L02; verified digest-bound
TASK-414-09-L05 AUTHOR-gate receipt (its task status closes only in L01);
terminal TASK-547;
terminal TASK-551 cache/search lifecycle owners
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Make a Designer approval visible as one complete content generation across
normal Admin lists/details, public rendering, search, route resolution, and
cache fills. PostgreSQL transaction atomicity protects canonical row writes,
but does not by itself stop an old cache/search artifact or a multi-query
request from mixing old and new site state. This leaf adds one active-generation
scope, prepares generation-bound artifacts, and switches one DB pointer in the
same product transaction as the canonical graph and complete promotion ledger.
It also keeps that scope coherent after promotion: every later ordinary native
create/update/delete updates the active membership and activation epoch in the
same transaction as the canonical mutation.

- **Owning modules:** TASK-414-03-L02 activation tables/repositories, the
  generation cutover service, and generation-aware CMS read-model seams.
- **Source-of-truth docs:** `_docs/ARCHITECTURE.md`, `_docs/DATA_MODEL.md`,
  `_docs/SEARCH_SPEC.md`, `_docs/PREVIEW_SPEC.md`, terminal TASK-547 adapter
  contract, and terminal TASK-551 cache lifecycle.
- **Out of scope:** a second CMS store, long-running DB transaction around
  provider/object I/O, public mutation API, direct cache epoch manipulation,
  and replacing native resource validators/services or their domain rules.

## Security Contract

- **Endpoint visibility:** no new endpoint. Internal promotion invokes this
  service; all affected existing Admin/public reads keep their native visibility.
- **Auth model:** promotion uses the authenticated actor and exact approval
  tuple from L01. Public reads remain anonymous only where the native resource
  contract already allows it.
- **RBAC:** cutover requires `designer:promote` plus the complete native write
  union re-resolved inside the transaction. Every Admin read retains native
  permissions. Generation scope never grants access.
- **CSRF:** the calling internal promotion POST requires CSRF; read requests do
  not gain side effects.
- **Rate-limit bucket:** `designer-promotion` for cutover; existing read/search
  buckets remain unchanged.
- **Validation:** strict prepared-generation, mapping, artifact, adapter receipt,
  baseline, approval, and pointer schemas; reject unknown and require exact
  digest/byte identity.
- **Anti-abuse:** no public write. Locks, baseline CAS, lease fence,
  idempotency, bounded artifact preparation, and one pointer switch prevent
  replay/race abuse.
- **Secret handling:** generation IDs/digests may be cache metadata; workspace,
  approval, lease, private object, provider, and unpublished payloads may not.

## Sub-Tasks

None; this is an executable leaf. Land in this order:

1. generation-scope contract and legacy-generation bootstrap guard;
2. generation-aware adapters for every canonical Admin/public/search read model;
3. one activation-coherent transaction guard at every canonical native mutation
   boundary plus its inventory/parity gate;
4. private search/cache/route artifact preparation and product transaction;
5. race/crash/cache/search/public parity integration tests.

## Exact Exclusive Ownership

This leaf owns new focused modules:

- `core/services/contentActivation/contentActivationContract.ts`
- `core/services/contentActivation/contentActivationScope.ts`
- `core/services/contentActivation/contentActivationResolver.ts`
- `core/services/contentActivation/contentGenerationArtifactService.ts`
- `core/services/contentActivation/contentGenerationCutoverService.ts`
- `core/services/contentActivation/contentGenerationRecovery.ts`
- `core/services/contentActivation/contentActivationQueryGuards.ts`
- `core/services/contentActivation/contentActivationMutationGuard.ts`
- `core/services/contentActivation/contentActivationMutationInventory.ts`
- `core/services/contentActivation/contentActivationContribution.ts`
- focused tests under `tests/vitest/content-activation/` and
  `tests/integration/content-activation/`.

TASK-414-09-L05 freezes the post-TASK-547/TASK-551 source inventory of every
normal CMS read-model and canonical mutation owner from TASK-414-02-L01's pure
native-feature/adapter source registries. This leaf consumes that immutable,
freshly audited inventory and is the sole TASK-414 writer of the small
generation-scope/transaction-guard integration in those owners. Native owners
retain validation, error mapping, and business semantics. The minimum verified
baseline inventory is:

- Pages/templates/public shell: `core/services/pages/pageService.ts`,
  `pageTemplateService.ts`, `publicSiteShell.ts`, and
  `core/server/publicSite.tsx`;
- Posts/content types/entries/listings: terminal facades for
  `core/services/content/postsService.ts`, content type/entry services,
  `listingQueriesService.ts`, `listingTemplatesService.ts`, and runtime
  resolvers;
- Menus/forms/redirects/media: `core/services/menus/menuService.ts`,
  `core/services/forms/formsService.ts`,
  `core/services/redirects/redirectService.ts`, and the bounded Media read
  facade (private bytes remain outside DB);
- booking/commerce/theme/settings: terminal read facades under
  `core/services/booking/`, `core/services/commerce/`,
  `core/services/themes/`; for settings, consume TASK-414-06-L05's terminal
  `core/services/settings/settingsMutationGuard.ts` contribution seam and do
  not edit `core/services/settings/settingsService.ts`;
- route/search/cache boundaries: `core/services/search/searchIndexService.ts`,
  `searchService.ts`, terminal route resolution, `core/site/cache/siteCache.ts`,
  and public runtime read composition.

The same source contribution must name every create/update/delete entry point for Pages,
Posts/content entries, menus, forms, redirects, Media metadata/adoption,
booking, commerce, themes/settings, and every installed manifest resource. Each
entry point must call one `ContentActivationMutationGuard` with its existing
transaction-aware native adapter and emit a normalized membership delta plus
required transactional search/route receipt. Import/restore/bulk paths are
included; direct table writes outside bounded migrations/maintenance are
forbidden after activation readiness.

L05 must name exact files and exported symbols and update this leaf's exact
ownership list before implementation dispatch; the resulting contract requires
a fresh reconcile audit. Wildcards above are discovery instructions, not edit
authorization. A manifest
resource missing either a generation-aware read owner or mutation-guard owner
makes activation readiness and Designer promotion unavailable. If any named
legacy module is already above 1,000 lines, perform a cohesive read/mutation
facade extraction while preserving public imports before adding the scope.

Do not edit schema/migration files (L02), promotion approval/lease orchestration
(L01), reject/backup (L02), shared route/navigation/rate/lifecycle mounts (L03),
TASK-547/TASK-551 internals, task board, or changelog. Native mutation adapters
remain their terminal owners and are injected; this leaf owns only the common
transaction envelope and exact integration inventory.

For settings specifically,
`core/services/contentActivation/contentActivationContribution.ts` registers
the exact activation guard implementation into TASK-414-06-L05's terminal
settings hook. This keeps TASK-414-06-L05 as the sole TASK-414 writer of
`settingsService.ts` while forcing every native settings write through the same
locked transaction and normalized activation delta.

This leaf emits `ContentActivationCapabilityContributionV1` rows through the
L01 pure contribution type. It never imports or reads the final generated
`CmsCapabilityManifestV1`; TASK-414-02-L02 lands later and verifies these rows
against every other source. Runtime authorization uses native services and the
activation registry, never the generated drift artifact.

## Generation Scope Contract

`ActiveContentScopeV1` is exactly:

```ts
type ActiveContentScopeV1 = {
  generationId: string;
  contentEpoch: number;
  activationDigest: Sha256Digest;
  pointerVersion: number;
  capturedAt: string;
};
```

- Every normal Admin/public/search/cache request captures the active pointer
  once. All DB reads needed for one rendered/read response use one repository
  transaction/snapshot and the same scope; no helper re-reads the pointer.
- Generation mapping controls resource membership (new/deleted resources).
  Rows of the current active generation may evolve only through the guard below;
  inactive/retired generation rows are sealed. PostgreSQL MVCC snapshot plus
  captured content epoch controls membership and updated row versions for an
  in-flight old request. A read facade that cannot honor both is not activation-
  capable.
- Cache keys and search/route artifact IDs include the safe generation ID,
  content epoch, activation digest, and their native bounded key. Old entries
  may finish and be served only to requests that captured that exact tuple.
- Designer staging/preview never receives an active-generation mapping and
  remains excluded from all normal read paths.
- Existing installations bootstrap one verified `legacy` complete generation
  mapping every currently visible canonical resource before generation-aware
  reads become mandatory. A missing/incomplete bootstrap fails startup/readiness
  and disables Designer promotion; it never treats all rows as active fallback.

## Ordinary Canonical Mutation Contract

After bootstrap, every canonical create/update/delete/bulk/import/restore
transaction uses the same guard:

1. resolve native RBAC/validation and any external private preparation before
   the transaction where the native contract requires it;
2. open one transaction and lock the activation pointer first, followed by the
   native resource locks in the frozen canonical order;
3. execute the native mutation through its transaction-aware service and return
   an exact `ContentActivationDeltaV1` containing created/updated/deleted keys,
   canonical IDs, versions/digests, and public paths only;
4. apply that delta to the current active generation mapping, create every
   correctness-critical transactional search/route artifact receipt, append a
   chain digest from the prior digest + normalized mutation receipt, increment
   content epoch and pointer version, and persist the finite TASK-551 outbox/
   invalidation plan; then commit once; and
5. after commit, publish/warm only through terminal TASK-551. Cache warming or
   transport delay is never required for correctness because the new epoch has
   no stale key and all authoritative read artifacts were ready at commit.

The guard is re-entrant only through an explicit transaction handle so nested
domain writes join one outer activation mutation. It rejects a second pointer
lock, missing/duplicate/unmapped delta, current-pointer drift, or native service
using the global DB handle. A mutation rollback exposes neither canonical nor
activation changes. A postcommit failure leaves one durable outbox plan and is
idempotently recoverable. Designer approval baselines bind exact
`{generationId, contentEpoch, activationDigest, pointerVersion}`; any ordinary
mutation makes an older approval stale before canonical promotion writes.

## Prepare and Atomic Cutover Contract

1. L01 validates exact approval/permission/baseline and acquires the fenced
   promotion lease.
2. Outside the DB transaction, prepare only private/unreachable asset bytes and
   deterministic generation-bound search/cache/route artifacts. Persist their
   content digests and readiness through L02; no public alias/key points to them.
3. Open the product transaction, lock active pointer -> workspace -> lease in
   canonical order, and recheck actor, permissions, lease fence, approval tuple,
   validation/preview/bundle/plan digests, and the complete base
   generation/content-epoch/activation-digest/pointer-version baseline.
4. Apply all native adapters through the supplied transaction in stable plan
   order. Build the complete generation membership map from unchanged retained
   resources plus created/updated/deleted plan results.
5. Verify every required mapping and artifact digest, write the complete
   generation, mappings, artifact receipts, promotion items/ledger, workspace
   state, audit, and terminal TASK-551 invalidation/outbox plan.
6. CAS the singleton pointer from the exact base tuple to the new complete
   generation with incremented pointer version/content epoch and its initial
   activation-chain digest in that same transaction. Seal the prior generation
   at its final epoch/digest and commit once.
7. After commit, the immediate caller awaits TASK-551
   `applyAfterCommit(postCommitPlan)` once. Recovery may invoke it again after a
   crash, so the stable event key and terminal TASK-551 outbox make delivery
   at-least-once and effects idempotent/effectively-once; no contract claims a
   physically exactly-once transport.
   Readers address committed artifacts directly by the captured generation;
   no post-commit alias flip is correctness-critical. The durable outbox may
   warm derived caches or retire old generation artifacts, but delayed/queued
   transport cannot create a missing or mixed new-generation response. Old
   generation cleanup imports `ASSISTANT_RETENTION_POLICY_V1`: rollback remains
   eligible for exactly 24 hours after retirement and the normal hard-retention
   target is seven days. Cleanup still waits for zero request leases, rollback/
   backup/legal pins and pending cache/search/artifact reconciliation; a blocker
   at day seven defers with an operator alert rather than deleting referenced
   state.

No request can see a new canonical resource without the new mapping/pointer, a
new pointer without a complete mapping/artifact set, or a mixture from two
generations. A precommit failure rolls back all canonical/mapping/ledger/pointer
writes. A postcommit crash never reruns native adapters; recovery reads the
complete ledger and performs only postcommit observation, cache warming, and
bounded old-generation retirement.

## Implementation Pseudocode

```ts
export type DesignerGenerationCommitOutcomeV1 =
  | Readonly<{
      state: "committed";
      result: DesignerPromotionResult;
      postCommitPlan: CacheInvalidationPlan;
      commitEvidence: DesignerCommitEvidenceV1;
    }>
  | Readonly<{
      state: "precommit_absent";
      compensationPlan: PrivatePreparationCompensationPlanV1;
    }>
  | Readonly<{
      state: "reconciliation_required";
      reconciliationId: string;
    }>;

export async function withActiveContentScope<T>(
  deps: ContentActivationDeps,
  read: (tx: ReadTransaction, scope: ActiveContentScopeV1) => Promise<T>,
): Promise<T> {
  return deps.db.repeatableRead(async (tx) => {
    const scope = await deps.activation.captureActiveScopeTx(tx);
    return read(tx, scope);
  });
}

export async function commitPreparedDesignerGeneration(
  input: CommitPreparedDesignerGenerationInput,
  deps: ContentGenerationCutoverDeps,
): Promise<DesignerGenerationCommitOutcomeV1> {
  try {
    const committed = await deps.db.transaction(async (tx) => {
      const pointer = await deps.activation.lockActivePointerTx(tx);
      const locked = await deps.promotion.lockAndReauthorizeTx(tx, input);
      assertBaseGenerationAndApproval(pointer, locked, input);

      const nativeReceipts = await deps.adapters.applyAllTx(tx, locked.plan);
      const mapping = await deps.activation.buildCompleteMappingTx(
        tx, pointer.generationId, locked.plan, nativeReceipts,
      );
      await deps.artifacts.assertPreparedExactTx(tx, input.prepared, mapping);
      const generation = await deps.activation.insertCompleteGenerationTx(
        tx, { input, prepared: input.prepared, mapping, nativeReceipts },
      );
      const postCommitPlan = deps.invalidation.buildFinitePlan(generation);
      await deps.promotion.commitLedgerStateAuditAndOutboxTx(
        tx, { input, generation, nativeReceipts, postCommitPlan },
      );
      await deps.activation.compareAndSwapPointerTx(tx, {
        expected: pointer,
        next: generation,
      });
      return projectCommittedDesignerGeneration({ generation, postCommitPlan });
    });
    return { state: "committed", ...committed };
  } catch (error) {
    const evidence = await deps.commitClassifier.classifyExact({
      approvalTuple: input.approvalTuple,
      idempotencyKey: input.idempotencyKey,
      preparedDigest: input.prepared.digest,
    });
    if (evidence.state === "complete") {
      return { state: "committed", ...projectCommittedReplay(evidence) };
    }
    if (evidence.state === "absent") {
      return {
        state: "precommit_absent",
        compensationPlan: buildExactPrivateCompensationPlan(input.prepared),
      };
    }
    const reconciliationId = await deps.recovery.recordAmbiguousWithoutDeleting(
      input, evidence, error,
    );
    return { state: "reconciliation_required", reconciliationId };
  }
}

export async function mutateCanonicalContent<T>(
  input: ActivationAwareNativeMutation<T>,
  deps: ContentActivationMutationDeps,
): Promise<T> {
  const prepared = await input.preparePrivate?.();
  const attempt = freezeActivationMutationAttempt(input, prepared);
  let committed: CommittedActivationMutationV1;
  try {
    committed = await deps.db.transaction(async (tx) => {
      const pointer = await deps.activation.lockActivePointerTx(tx);
      const native = await input.applyNativeTx(tx, prepared);
      const delta = normalizeContentActivationDeltaV1(native.activationDelta);
      await deps.activation.applyDeltaToActiveGenerationTx(tx, pointer, delta);
      await deps.artifacts.writeRequiredMutationReceiptsTx(tx, pointer, delta);
      const next = await deps.activation.advanceEpochAndDigestTx(tx, {
        pointer,
        mutationReceiptDigest: digestActivationMutation(delta),
        eventKey: attempt.eventKey,
      });
      const postCommitPlan = deps.invalidation.buildFiniteMutationPlan(next, delta);
      await deps.invalidation.persistOutboxTx(tx, postCommitPlan);
      return { value: native.value, next, postCommitPlan };
    });
  } catch (error) {
    const evidence = await deps.commitClassifier.classifyMutation(attempt.eventKey);
    if (evidence.state === "absent") {
      await input.compensatePrivate?.(prepared);
      throw mapContentActivationError(error);
    }
    if (evidence.state !== "complete") {
      await deps.recovery.recordMutationAmbiguityWithoutDeleting(attempt, evidence);
      throw domainError("content_activation_reconciliation_required");
    }
    committed = await deps.commitClassifier.projectCommittedMutation<T>(evidence);
  }
  await deps.invalidation.applyAfterCommit(committed.postCommitPlan);
  return committed.value;
}
```

**Data flow:** capture one active generation/epoch -> scoped bounded read; or
ordinary private preparation -> pointer-locked native mutation + mapping delta +
artifact receipts + epoch/digest/outbox -> one commit; or Designer private
artifact prepare -> one locked product transaction -> native graph + complete
mappings/artifacts/ledger/outbox -> pointer CAS -> commit -> one postcommit
observation.

**Error handling:** `content_activation_uninitialized`,
`content_activation_scope_invalid`, `content_activation_mapping_incomplete`,
`content_activation_artifact_incomplete`, `content_activation_conflict`,
`content_activation_mutation_unregistered`,
`content_activation_delta_invalid`,
`designer_base_generation_stale`, and
`designer_promotion_reconciliation_required` are safe domain errors. No SQL,
private artifact key, canonical unpublished ID, lease, or workspace detail leaks.

**Regression-test shape:** pure mapping/serialization; every read and mutation
owner rejects missing scope/guard; create/update/delete after a Designer
promotion updates active membership, approval baseline and cache/search/route
epoch atomically; nested/bulk/import writes use one outer transaction; DB races
around pointer capture/mutation/cutover; crash at every prepare/native/delta/
artifact/epoch/adapter/mapping/ledger/pointer/commit/postcommit checkpoint;
old/new cache and search requests; public/Admin list/detail parity and zero
staged leak.

## Testing Requirements

- `bun --cwd core lint:types`
- `bun --cwd core lint`
- targeted Vitest for scope, mapping, artifact, inventory, and query guards
- targeted Bun/PostgreSQL tests (with `set -a && source .env && set +a`) for
  bootstrap, repeatable-read scope, product
  transaction, ordinary create/update/delete/bulk guard, pointer/epoch CAS,
  rollback, recovery, and concurrent readers/writers
- `bun run check:admin-boundary` for every touched Admin/read-model surface
- query-count and sanitized `EXPLAIN (ANALYZE, BUFFERS)` evidence for each hot
  generation-aware read model at small and representative large scale
- terminal TASK-551 cache/search tests proving generation-bound keys/artifacts
  and at-least-once postcommit delivery with idempotent/effectively-once effects
- source inventory parity: every active manifest resource has stage/promote,
  generation-aware Admin/public/search/cache read evidence, and every native
  mutation path has activation-guard/delta/artifact/outbox evidence
- physical line-count gate for every touched production/test file (<=1,000)

Runtime handoff to TASK-414-11-L01 must visibly prove: old request during
cutover sees the complete old site; first new request sees the complete new
site; Admin sections expose all promoted resources together; search and public
routes use one new generation; injected precommit failure exposes none; and
postcommit recovery creates no duplicate. It must then create, update, and
delete ordinary canonical resources after promotion and prove membership,
baseline staleness, Admin/public/search/cache parity, and no old-epoch reuse.
Do not create a task-local browser lifecycle.

## Documentation Updates Required

Provide TASK-414-11-L01 with the generation scope, bootstrap/deploy ordering,
mapping/artifact/cutover transaction, cache/search keying, rollback/recovery,
and operator diagnostics for `_docs/ARCHITECTURE.md`, `_docs/DATA_MODEL.md`,
`_docs/SEARCH_SPEC.md`, `_docs/PREVIEW_SPEC.md`, `_docs/CMS_API.md`, and the
Designer cookbook. This leaf does not edit board/status/changelog.

## Done Criteria

- Every active manifest resource has one generation-aware normal read owner and
  every canonical mutation owner uses the activation guard, or activation
  readiness/Designer promotion is explicitly unavailable.
- Legacy bootstrap is complete before generation-aware reads/promotion enable.
- One request never mixes generations; staging remains invisible.
- Canonical graph, complete mapping/artifacts, promotion ledger/outbox, and
  pointer switch commit atomically.
- Ordinary post-promotion mutations atomically maintain active membership,
  epoch/digest, approval baselines, artifacts, and outbox without whole-
  generation copy-on-write.
- Cache/search/public/Admin evidence proves old-complete -> new-complete cutover
  with no partial visible state and deterministic crash recovery.
