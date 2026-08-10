# TASK-555-02-L02: Preview Reservation Stale Baseline Takeover and Idempotency
# FileName: TASK-555-02-L02-Preview-Reservation-Stale-Baseline-Takeover-And-Idempotency.md

**Parent Subtask:** TASK-555-02
**Priority:** High
**Category:** Installer Planning / Concurrency / Idempotency / Security
**Estimated Effort:** Very Large
**Dependencies:** landed TASK-555-02-L01, TASK-555-06-L01 lineage/migration, and
TASK-555-06-L02 drift-policy receipts; terminal TASK-551-03-L03, TASK-551-05-L01,
TASK-551-06-L01 base Solution Kit retention, TASK-551-08, and TASK-551-09-L04
receipts. TASK-555-06-L01, not TASK-551, owns post-migration curated-chain retention.
**Status:** ⏳ To Do

---

## Overview

Create the actor-bound preview proof and provider planning adapters, require an exact
live-baseline replan before apply, and atomically bind one preview, one deterministic
requested run, and one L06 lineage predecessor/head reservation under the provider
writer fence. The existing run primary key owns requested-run idempotency; L06's typed
row owns active head and pending apply/rollback uniqueness. No second ledger exists.

Before extending full-site reservation, cohesively extract the package-lock region
from terminal TASK-551's `legacyInstallRunPersistence/lockLifecycle.ts` (that leaf
is the prior writer and lands before this one; this edit is a serialized
successor). The extracted seam accepts the
deterministic requested owner ID and one transaction callback that inserts-or-verifies
that requested run, CAS-claims the preview, and reserves lineage atomically while the
existing global/package/native writer locks are held. The same requested-owner object
also supplies exact transaction-scoped terminal-success and proven-zero-net-failure
settlement callbacks; generic full-site calls remain unchanged. It maps curated
`preserve` decisions through exact provider live-target bridges without widening either
engine's native operation union.

The server derives a UUID-compatible apply run ID from canonical
`actorId + starterId + previewId + idempotencyKey`; the raw key is discarded. Both
legacy and full-site run creation accept that server-only requested run ID. A primary
key conflict loads and verifies the existing run plus reservation/fence and
replays/resumes it rather than executing a second install.

## Sub-Tasks

None; this is an executable leaf.

## Exact Single-Writer Ownership

This leaf is the sole writer for exactly:

- `core/services/kits/curatedStarters/previewProof.ts` (new);
- `core/services/kits/curatedStarters/providerPlanning.ts` (new);
- `core/services/kits/curatedStarters/previewReservationStore.ts` (new);
- `core/services/kits/curatedStarters/previewService.ts` (new);
- `core/services/kits/curatedStarters/idempotency.ts` (new);
- `core/services/kits/curatedStarters/legacyCuratedApplyCoordinator.ts` (new);
- `core/services/kits/curatedStarters/legacySettingTransitions.ts` (new);
- `core/services/kits/curatedStarters/providerPreserveBridge.ts` (new; both provider
  bridge shapes and immutable target/live evidence validation);
- landed `core/services/kits/solutionKitInstallTypes.ts` (requested-run/proof types);
- landed `core/services/kits/solutionKitInstallOperations.ts` (fenced execution);
- landed `core/services/kits/solutionKitInstallRunRepository.ts` (JSONB claim CAS);
- landed `core/services/kits/solutionKitsInstallService.ts` (orchestration only);
- terminal `core/services/kits/legacyInstallRunPersistence/lockLifecycle.ts` only
  for the cohesive package-lock extraction and stable package-lock re-export;
- new
  `core/services/kits/legacyInstallRunPersistence/packageLockReservation.ts`, the sole
  package-lock/requested-owner reservation implementation;
- landed `core/services/kits/legacyInstallRunPersistence/runInitialization.ts` only
  for requested-run initialization and persisted curated phases;
- landed `core/services/kits/legacyInstallRunPersistence/dryRunTerminalization.ts`
  only for deferred terminalization and the exact finalization transaction;
- landed `core/services/kits/legacyInstallRunPersistence/readPersistence.ts` only
  for bounded exact-run/phase recovery reads;
- terminal `core/services/kits/kitInstaller.ts` only for the server-only deferred-
  terminalization handoff used by the curated coordinator;
- terminal `core/services/templates/templateInstaller.ts` only for its exact
  requested-owner/recovery handoff and forced `continueOnError:false` path;
- `core/services/kits/fullSiteInstallTypes.ts` (requested owner ID/proof types);
- `core/services/kits/fullSiteInstall/execute.ts` (replan/proof/requested-run use);
- `core/services/kits/fullSiteInstall/preparedSaga.ts` only for the exact curated
  preserve live-target bridge; ordinary create/update/noop behavior stays compatible;
- `tests/vitest/kits/curated-starter-preview-proof.test.ts` (new);
- `tests/unit/kits/curatedStarterPreviewService.test.ts` (new);
- `tests/unit/kits/legacyCuratedApplyCoordinator.test.ts` (new);
- `tests/unit/kits/fullSiteInstallService.test.ts` (owned expectation additions);
- `tests/unit/kits/fullSiteLegacyLedgerComposition.test.ts` (split/export parity;
  serialized successor edit of this terminal-TASK-547-owned file, additions only
  and no re-baseline of TASK-547's existing assertions);
- `tests/unit/kits/fullSiteLegacyLedgerPackageLockReservation.test.ts` (new);
- `tests/unit/kits/fullSiteCuratedPreserveBridge.test.ts` (new);
- `tests/integration/kits/curatedStarterPreviewDb.test.ts` (new);
- `tests/integration/kits/curatedStarterIdempotencyDb.test.ts` (new);
- `tests/integration/kits/curatedStarterLegacyApplyRecoveryDb.test.ts` (new); and
- bounded successor assertions in `tests/unit/kits/kitInstaller.test.ts` and
  `tests/unit/templates/templateInstaller.test.ts`.

The repository regions also own the run-side half of L06's tx-scoped reservation and
strict phase/post-commit/rollback-restoration receipt read/update helpers used by L03;
this includes threading requested-owner callbacks into the existing owned-run terminal
transaction rather than finalizing run and lineage separately. No later TASK-555 leaf
rewrites these files. L06's lineage/schema/migration files are
read-only here. The first source edit moves the complete package-lock responsibility
from terminal `lockLifecycle.ts` into `packageLockReservation.ts`; `lockLifecycle.ts`
retains owner-lease/direct-session behavior and stable package-lock re-exports. The
terminal root barrel and TASK-489-owned `ledgerAdapter.ts` remain byte-identical.
Only after both touched modules are at most 1,000 lines may the requested-owner
callback be added. No arbitrary line-range split or duplicate facade is allowed.

## Dependencies and Land Order

Second TASK-555-02 leaf. L01 types are frozen input. Land before L03. Fenced requested-
run support and claim CAS land together so no provider is partially idempotent.

## Forbidden Paths

- all TASK-414/489/545/547/548/551/554 task files and foreign
  changelog/index/workflow/smoke; the tracked TASK-555 workflow is read-only;
- `core/db/tables/**`, `core/db/migrations/**`, L06 lineage owner source/tests,
  package artifacts/registry, routes,
  Admin/Setup UI/client, and L03-owned execution/post-commit files;
- TASK-547 task contracts and runtime-smoke adapter;
- unrelated dirty root/handoff files.

The exact lock-lifecycle/extraction files listed above are deliberate successor exceptions to
the general persistence prohibition; all other TASK-551/TASK-547 persistence owners
remain read-only.

## Security Contract

- **Endpoint visibility:** no route; later internal routes supply authenticated actor.
- **Auth:** actor must be a valid UUID and must equal preview-run actor. Mismatch maps
  to not found without revealing another actor's preview.
- **RBAC/CSRF/rate limit:** route-owned; no permission value is accepted here.
- **Validation:** ten-minute TTL, exact starter/provider/release/package/plan/baseline
  fingerprints, strict takeover-key set, UUID preview, 16..128 ASCII idempotency key,
  exact run-option envelope, and bounded ledger items.
- **Anti-abuse:** no public nonce/CAPTCHA. One preview can be claimed by one derived
  apply run; run primary-key uniqueness plus the fenced lineage reservation are the
  concurrency authorities.
- **Secrets:** raw idempotency key, package/snapshots, actor/session values, SQL, and
  driver errors never enter options, result, logs, or evidence.

## Preview Proof Contract

`CURATED_STARTER_PREVIEW_TTL_MS` is exactly `600_000`. Preview calls the selected
provider planner and persists a successful `dry_run` with strict
`options.curatedStarter`. Fingerprints are SHA-256 of canonical length-delimited JSON:

- source identity: full-site uses exact `packageFingerprint` with null
  `catalogDefinitionDigest`; legacy uses exact `catalogDefinitionDigest` with
  null `packageFingerprint`; both bind `releaseDescriptorDigest`;
- baseline fingerprint: ordered `{identity,currentId,currentDesired}` projections;
- plan fingerprint: ordered `{position,identity,operation,desiredDigest}`;
- takeover keys: sorted unique allowed setting keys whose current state would change.
- active lineage: exact L06 row version/head ID plus inherited managed-base/target/live-after
  digests for each bounded resource; preview and apply must observe the same head.
- resulting lineage: preview's bounded inspection and apply's authoritative transaction
  must prove successor depth `<=512` and all-seven-chain aggregate `<=3_584`; apply
  locks all seven rows in stable order and fails
  `curated_starter_lineage_limit_exceeded` before preview CAS/run insert on overflow.

Planning also consumes TASK-555-06-L02's terminal whole-resource drift policy.
The preview records per-resource `base/live/target` classification and may expose
only bounded safe operation rows. User-only changes are internal `preserve_live` and
project as safe operation `preserve`; missing,
ambiguous, or user+release conflicts reject preview before claim. An unmanaged
collision is accepted only when it is an exact
provider-owned setting takeover candidate carrying current presence/value digest.
Legacy permits only its three shell keys; full-site delegates its setting allowlist to
TASK-547. Every non-setting unmanaged collision rejects.

`options.curatedStarter.claim` has exact keys `state,applyRunId,scopeDigest,claimedAt`
and starts `available/null/null/null`. It is replay evidence, not the lineage owner.
Same-actor, TTL, and proof checks precede one conditional JSONB CAS. Zero updated rows
trigger a bounded point reread to classify same-scope replay versus consumed/stale
conflict. Only hashes and bounded operation summaries are returned. Run/items remain
provider evidence and L06's row remains branch/reservation authority.

The apply run context is initialized with exact `supersedesRunId`, bounded
`managedLineage`, provider-specific `settingTransitions`, a strict phase receipt, and
pending `postCommit` identities from the parent contract. Under one provider writer
fence, the service replans and compares proof. The subsequent claim transaction claims
preview, inserts-or-verifies the deterministic requested run, and reserves L06's exact
row version/head/predecessor with a lease token/fence; full-site captures the lock-scoped
replan into `reserveOwnerTx` as specified below. A stale head, second branch, lease
conflict, lineage-limit breach, or altered takeover presence/value fails before provider
writes. Status GET never invokes a reservation/receipt transition.

The legacy coordinator is the only curated legacy apply path. It invokes core and
template owners with `continueOnError:false` and a server-only deferred-terminalization
mode, then applies only actual three-key shell transitions through
`applyFullSiteSettingsBatchAtomic({expectedCurrent:before,target:after})`. It persists
phases `reserved`, `core_running`, `core_complete`, `templates_running`,
`templates_complete`, `shell_pending`, `shell_applied`, `finalizing`, `compensating`,
`reconciliation_required`, `complete`, or `failed`. A crash reads exact run/items/
template/shell receipts and resumes or compensates; it never repeats an unverified
phase. Success is impossible before shell CAS and one final transaction atomically
marks terminal run status, stores managed lineage, advances/clears L06 reservation,
and commits the nullable backend-specific server-cache invalidation receipt. A terminal legacy failure clears
pending apply only in one transaction after all core/template/shell state is proven
equal to the pre-apply baseline; otherwise its run/reservation remains
`reconciliation_required`.

Both providers derive the exact deduplicated server invalidation plan only from actual
committed resource writes that map to terminal TASK-551's closed `CacheTag` union.
Run-history, curated-status, and lineage/head identities are browser-cache selectors,
not server tags. When every provider resource operation is noop/byte-equal or only
those browser authorities change, the server plan and receipt are null; L04 still
performs its exact browser invalidation after the strict authoritative response. For a
non-null server plan, Redis persists one deterministic TASK-551 outbox row in terminal
finalization and marks its receipt `durable`; memory persists the committed plan in
strict run context and writes zero outbox rows. Failed pre-write emits no plan;
compensation emits only existing TASK-551 tags for mutations it actually commits.
TASK-489 remains the owner of actual-resource/history rollback invalidation. L03 awaits
`applyAfterCommit` only for a non-null server receipt and owns idempotent recovery.

## Requested Owner Package-Lock Reservation

`packageLockReservation.ts` keeps the existing generic reservation path byte-behavior
compatible and adds one server-only optional requested-owner branch. The exact seam is:

```ts
type FullSiteRequestedOwnerTerminalTxBaseV1 = Readonly<{
  tx: FullSitePackageReservationTx;
  reservation: FullSiteApplyLockReservation;
  ownerRunId: string;
  fenceGeneration: string;
}>;

type FullSiteRequestedOwnerReservationV1 = Readonly<{
  ownerRunId: string;
  reserveOwnerTx(input: Readonly<{
    tx: FullSitePackageReservationTx;
    reservation: FullSiteApplyLockReservation;
    ownerRunId: string;
    fenceGeneration: string;
  }>): Promise<Readonly<{ resumePhase: "reserved" | "initialized" }>>;
  finalizeOwnerSuccessTx(input: FullSiteRequestedOwnerTerminalTxBaseV1 & Readonly<{
    invalidationPlan: CuratedStarterInvalidationPlanV1 | null;
  }>): Promise<Readonly<{ outcome: "success" }>>;
  settleOwnerZeroNetFailureTx(input: FullSiteRequestedOwnerTerminalTxBaseV1 & Readonly<{
    safeErrorCode: string;
  }>): Promise<Readonly<{ outcome: "failed_zero_net" }>>;
}>;

type FullSiteApplyLockReservation = Extract<
  FullSiteInstallLockReservation,
  { intent: "apply" }
>;
type FullSiteRollbackLockReservation = Extract<
  FullSiteInstallLockReservation,
  { intent: "explicit_rollback" }
>;

export function withFullSiteInstallLocks<T>(
  reservation: FullSiteApplyLockReservation,
  execute: (context: FullSiteInstallLockContext) => Promise<T>,
  requestedOwner?: FullSiteRequestedOwnerReservationV1,
): Promise<T>;
export function withFullSiteInstallLocks<T>(
  reservation: FullSiteRollbackLockReservation,
  execute: (context: FullSiteInstallLockContext) => Promise<T>,
  requestedOwner?: never,
): Promise<T>;
```

`FullSiteInstallLedgerPort.withPackageLock` receives the identical overload set,
and the server-only curated `applyFullSitePackage` invocation passes this object
through that port. An explicit-rollback reservation cannot accept requested-owner
state at the type boundary. Test ledgers either forward all three callbacks for an
apply reservation or omit the third argument for generic behavior; dropping only
terminal callbacks or passing them with explicit rollback is a type and contract
failure.

All three callbacks are function-valued server dependency state and are never cloned
into run options or serialized. After acquiring the existing global writer lock and
exact package lock, the seam opens its existing DB reservation transaction and invokes
`reserveOwnerTx` once. For curated full-site apply, that callback must, in this order
inside the same transaction: lock all seven lineage rows in `starter_id` order; lock/load
the exact preview and target lineage; recheck the already lock-scoped current proof and
resulting 512/3,584 chain caps; insert-or-verify `ownerRunId` with its strict run context
and fence generation; CAS the preview claim; reserve the exact lineage version/head/
predecessor; then return the verified resume phase. The seam validates that the returned
owner is the requested UUID and creates the native writer lease only for that row. Any
throw rolls back preview claim, requested run, and lineage reservation together before
the provider callback starts. A generic non-curated call supplies no third argument and
retains terminal TASK-547/TASK-489 behavior.

The full-site replan occurs after the two advisory locks are held and before
`reserveOwnerTx`; its immutable proof is captured by the callback closure. Neither a
pool transaction outside those locks nor a second transaction may claim the preview,
create the requested run, or reserve lineage. Recovery verifies the same requested ID,
run context, fence generation, preview scope, and lineage reservation; it never swaps
to a randomly allocated owner.

For a requested owner, the existing owned-run finalizer must invoke one terminal
callback inside the exact DB transaction that would otherwise write terminal run state;
it must not finalize the run first and patch lineage later. `finalizeOwnerSuccessTx`
locks/verifies native owner, running run, fence generation, preview scope, lineage
reservation/version/predecessor, complete items, and strict managed-lineage context;
computes the summary; persists the backend-selected Redis or memory invalidation receipt
from a non-null `invalidationPlan`, or strict null when no TASK-551 server tag changed;
marks the run successful; advances the active head to
`ownerRunId`; and clears every pending/lease field atomically.

`settleOwnerZeroNetFailureTx` is callable only after the full-site compensation owner
has retained fence authority. It independently recaptures every bounded native owner
and setting represented by the run and proves equality with the exact pre-apply state;
caller counters or `zeroNet:true` are not proof. It then marks the run terminal failed
with the safe code/summary, leaves
`active_head_run_id` equal to the reserved predecessor, and clears every pending/lease
field in that same transaction. TASK-551 engine-owned apply/compensation transactions
retain their own actual-mutation invalidation receipts; this callback neither duplicates
nor replaces them. Missing/partial evidence,
compensation failure, fence loss, or callback failure leaves run and lineage pending and
maps to `curated_starter_reconciliation_required`; it cannot use generic failed
finalization. A transaction rollback exposes none of run/head/receipt settlement, while
a crash after commit replays the exact complete tuple without provider writes.

## Preserve Bridge

L06 supplies internal decision `disposition:"preserve_live"` with
`releaseTargetDigest`. `providerPreserveBridge.ts` maps it once at the persistence
boundary to managed-lineage `disposition:"preserve"` with `targetReleaseDigest`, while
producing a bounded identity-ordered bridge row containing exact current native ID,
inherited managed-base digest, immutable release-target digest, and live-after digest.
Neither vocabulary may leak across that boundary.

- Legacy coordination does not call `executeInstallOperation` for a preserved row. It
  recaptures and digest-verifies the live owner under the writer fence, records the
  engine-compatible ledger operation `noop`, and writes the bridge's target/live
  evidence only into strict `managedLineage`.
- Full-site execution passes a closed preserve map into `preparedSaga.ts`. The saga
  resolves dependency IDs from the verified live target, recaptures the same native
  snapshot under the lock/fence, requires exact ID and live digest, emits a normal
  `noop` initialization/ledger item whose durable after-state is that live snapshot,
  and retains the immutable package target digest only in `managedLineage`. It does not
  run target normalization/apply for that row or pretend the live document equals the
  release target.

No provider receives `operation:"preserve"`; no initialization-plan or install-item
operation stores it. A missing/moved/changed live target, target-digest mismatch, or
reference mismatch is stale/drift conflict before native writes.

## Implementation Pseudocode

```ts
export function deriveCuratedApplyRunIdentity(input: {
  actorId: string;
  starterId: CuratedStarterId;
  previewId: string;
  idempotencyKey: string;
}): { runId: string; scopeDigest: string } {
  validateApplyIdentityInput(input);
  const digest = sha256(frame(
    "coderso.curated-starter.apply-idempotency.v1",
    canonicalJsonInExactOrder(input, ["actorId", "starterId", "previewId", "idempotencyKey"]),
  ));
  return { runId: digestToUuid(digest, { versionNibble: 5, rfc4122Variant: true }), scopeDigest: digest };
}

export async function previewCuratedStarter(input: {
  starterId: CuratedStarterId;
  actorId: string;
  now?: Date;
}): Promise<CuratedStarterPreviewV1> {
  const definition = requireCuratedStarter(input.starterId);
  const release = await resolveVerifiedRelease(definition);
  const plan = await requireProviderPlanner(definition.source.kind).plan({
    definition,
    release,
    actorId: input.actorId,
    dryRun: true,
  });
  await inspectResultingCuratedLineageLimits(plan.starterId, { appendSuccessor: true });
  const proof = buildPreviewProof(plan, addMs(input.now ?? new Date(), 600_000));
  await persistStrictPreviewContext(plan.runId, input.actorId, proof);
  return projectCuratedStarterPreview(definition, release, plan, proof);
}

export async function claimPreviewForApply(input: {
  previewId: string;
  actorId: string;
  starterId: CuratedStarterId;
  applyRunId: string;
  expectedProof: CuratedStarterPreviewProofV1;
}): Promise<"claimed" | "same_apply"> {
  return withProviderWriterFence(async (tx) => {
    const lineages = await lockAllCuratedLineagesInStarterOrderTx(tx);
    const preview = await lockPreviewPointTx(tx, input.previewId);
    assertSameActorStarterUnexpiredExactProof(preview, input);
    const replanned = await replanUsingSameTxAndFence(tx, input);
    assertResultingCuratedLineageLimitsTx(tx, lineages, input.starterId, {
      appendSuccessor: true,
    });
    assertApplyProofMatches(replanned, input.expectedProof);
    const requested = await insertOrVerifyRequestedRunTx(tx, input.applyRunId);
    await compareAndSwapClaimInsideOptionsJsonb(tx, preview, input.applyRunId);
    const reservation = await reserveExpectedLineageHeadTx(tx, {
      requestedRunId: requested.id,
      expectedVersion: input.expectedProof.lineageVersion,
      expectedHeadRunId: input.expectedProof.activeHeadRunId,
    });
    return reservation.replayed ? "same_apply" : "claimed";
  });
}

// Full-site execute, while its existing exclusive native/package locks are held:
const requestedOwner = buildCuratedRequestedOwnerReservation({
  ownerRunId: input.applyRunId,
  reserveOwnerTx: reservePreviewRequestedRunAndLineageTx,
  finalizeOwnerSuccessTx: finalizeRequestedOwnerSuccessAndLineageTx,
  settleOwnerZeroNetFailureTx: settleRequestedOwnerZeroNetFailureTx,
});
await withFullSiteInstallLocks(lockReservation, async context => {
  assert(context.ownerRunId === input.applyRunId);
  assertManagedWriteSetAllowed(replanned, terminalDriftPolicy);
  await executeOrResumeUsingReservedRequestedRun(context.ownerRunId, replanned);
}, requestedOwner);

// Inside the existing owned-run finalization transaction, never after it:
if (terminal.kind === "success") {
  await requestedOwner.finalizeOwnerSuccessTx({
    tx, reservation: lockReservation, ownerRunId, fenceGeneration, invalidationPlan,
  });
} else if (terminal.kind === "failed" && await proveExactZeroNetApplyTx(tx, ownerRunId)) {
  await requestedOwner.settleOwnerZeroNetFailureTx({
    tx, reservation: lockReservation, ownerRunId, fenceGeneration,
    safeErrorCode: terminal.safeErrorCode,
  });
} else {
  throw code("curated_starter_reconciliation_required");
}
```

The exact frame is `u32be(domainUtf8.length)||domainUtf8||u64be(payloadUtf8.length)||
payloadUtf8`. UUID conversion uses digest bytes 0..15, sets byte 6 to
`(b6&0x0f)|0x50`, byte 8 to `(b8&0x3f)|0x80`, and formats lowercase RFC-4122.
Only digest/run ID persist. The solution-kit planning adapter uses existing
`planOperations` and dry-run native read projections without resource writes. Both
provider paths perform proof comparison, requested-run insert/verify, preview claim,
and lineage reservation in the one fenced transaction before native writes. Each
owner mutation retains its existing transaction/conflict behavior; only the curated
legacy coordinator defers source terminalization across those phases.

Proof/reservation failure, including the proactive lineage-limit check, rolls back
preview claim, requested-run insert, and lineage reservation together. Once that
transaction commits, a later zero-net failure may clear it only through the terminal
callback above; partial/unresolved failure retains it for same-key reconciliation. A
different scope cannot clear or take it over merely because the lease clock elapsed.

## Data Flow

Registry ID/actor -> verified release -> provider plan/live snapshots ->
whole-resource drift policy -> provider-discriminated source identities/canonical
fingerprints -> dry-run ledger/options -> bounded preview. Apply identity -> existing
run point lookup -> current release/replan -> exact proof/takeover/active-head comparison ->
one fenced transaction for requested run + preview claim + predecessor/head
reservation -> crash-safe provider phases -> later L03 receipt recovery/result projection.

## Error Handling

- Unknown/artifact/core errors retain L01 codes.
- Missing/cross-actor preview: `curated_starter_preview_not_found`.
- Expired: `curated_starter_preview_expired`.
- Already claimed by another scope: `curated_starter_preview_consumed`.
- Release/package/plan/baseline/takeover drift: `curated_starter_preview_stale`.
- Invalid key/identity: `curated_starter_idempotency_invalid`.
- Existing run/reservation with mismatched strict context:
  `curated_starter_idempotency_conflict` or `curated_starter_reservation_conflict`.
- Resulting predecessor depth/aggregate overflow or malformed closure:
  `curated_starter_lineage_limit_exceeded`, before claim/run/reservation writes.
- Matching success first resumes pending receipts and is replayable; matching full-site
  running state resumes through existing recovery; matching legacy running state
  resumes the exact persisted coordinator phase. Unprovable partial state returns
  `curated_starter_reconciliation_required` and never reports success.
- A provider failure maps to terminal `curated_starter_apply_failed` and releases the
  apply reservation only after the transaction callback proves zero net mutation;
  otherwise it remains `curated_starter_reconciliation_required` with the same owner.
- Unknown DB/driver details map later; raw messages never leave this layer.

## Regression Tests

- Exact ten-minute boundary (just before valid, at expiry invalid), same/cross actor,
  unknown/failed/non-dry-run preview, altered run options/items, malformed dates/
  fingerprints/takeover lists.
- Deterministic run ID/digest for equal input; every actor/starter/preview/key change
  changes identity; raw key absent from run/options/log/result.
- Concurrent same-key requests create one primary-key run and one lineage reservation/
  fence; the loser replays/in-progress and never duplicates provider writes. A
  different key against one preview or an occupied starter reservation is rejected.
- Replan mismatch for release, package, operation, desired, baseline, or takeover
  fails with zero provider writes and rolls back claim/run/reservation together.
- User-only changes are preserved in preview and apply; release-only/converged
  changes may proceed; allowlisted settings become exact takeover candidates;
  conflict/missing/non-setting-unmanaged evidence fails before writes.
- Three successive same-release reapplies preserve inherited managed bases, reject a
  stale/branched head, and seed deterministic predecessor/post-commit receipts.
- Depth 511 may preview/claim one successor to resulting depth 512; depth 512 and an
  aggregate 3,584 closure reject another successor with the stable lineage-limit code.
  Concurrent different-starter claims serialize on all seven rows, and every overflow/
  gap/cycle case proves zero preview-claim/requested-run/reservation write.
- Both provider proofs and lineage versions are checked while their writer fence is
  held and before run-item/native initialization.
- Full-site interrupted same-key request enters existing resume/compensation rules;
  legacy interruption at every core/template/shell/finalization boundary resumes or
  compensates and never exposes premature success.
- A non-null Redis server plan writes one outbox row; a non-null memory plan writes
  zero outbox rows and persists one committed plan. Both hand one awaited post-commit
  application to L03. A committed all-noop/byte-equal apply persists strict null for
  server invalidation and still triggers L04's exact run-history/status browser
  invalidation, with zero speculative TASK-551 tags.
- Full-site requested-owner crash injection before each success-terminal write proves
  run status, managed lineage, active head/reservation clear, and backend receipt are
  all absent or all committed. Crash after commit/before response replays the same
  complete tuple with zero native write. The same matrix covers zero-net failure:
  exact native/pre-apply equality atomically marks failed and clears only pending apply
  while preserving head and the engine's existing compensation receipts; partial
  compensation/fence loss retains running owner plus reservation and returns
  reconciliation-required. Generic full-site finalization is byte-behavior compatible
  and never invokes these callbacks.
- The package-lock extraction preserves every terminal `lockLifecycle.ts` export/
  behavior before extension and leaves the root barrel/`ledgerAdapter.ts` byte-identical;
  requested-owner tests prove all seven lineage `FOR UPDATE` locks in `starter_id`
  order precede the preview `FOR UPDATE` lock, then exact requested-run insert/verify ->
  preview claim CAS -> lineage reservation are one rollback-atomic transaction under both existing locks,
  `reserveOwnerTx` failure starts no provider work, the ledger port forwards all three callbacks without
  serialization or omission, a compile-time negative fixture rejects a requested
  owner with an `explicit_rollback` reservation, and generic calls still allocate/
  resume exactly as TASK-547/TASK-489 require.
- Legacy and full-site preserve tests prove exact live-target recapture, immutable
  `releaseTargetDigest -> targetReleaseDigest` persistence mapping, dependency-ID
  continuity, zero native mutation, native `noop` ledger compatibility, stale-live
  rejection, and source scans showing no provider/ledger `operation:"preserve"`.
- Cohesive legacy extraction preserves every export/behavior and leaves all touched
  human-authored files <=1,000 lines.
- Deferred terminalization is an unexported/server-owned curated command: ordinary
  legacy callers, including the current internal Assistant `site-kit.install` path,
  retain their pre-TASK-555 behavior until terminal TASK-414 migration.

## Testing Requirements

```bash
NODE_ENV=test vitest run --config vitest.config.ts \
  tests/vitest/kits/curated-starter-preview-proof.test.ts
bun test tests/unit/kits/curatedStarterPreviewService.test.ts \
  tests/unit/kits/legacyCuratedApplyCoordinator.test.ts \
  tests/unit/kits/fullSiteInstallService.test.ts \
  tests/unit/kits/fullSiteLegacyLedgerComposition.test.ts \
  tests/unit/kits/fullSiteLegacyLedgerPackageLockReservation.test.ts \
  tests/unit/kits/fullSiteCuratedPreserveBridge.test.ts \
  tests/unit/kits/kitInstaller.test.ts \
  tests/unit/templates/templateInstaller.test.ts
set -a && source /home/coder/project/Coderso/.env && set +a && \
  bun test --parallel=1 --timeout 360000 \
  tests/integration/kits/curatedStarterPreviewDb.test.ts \
  tests/integration/kits/curatedStarterIdempotencyDb.test.ts \
  tests/integration/kits/curatedStarterLegacyApplyRecoveryDb.test.ts
bun run lint:repo:types
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Run baseline-to-final `wc -l` for every owned human-authored source/test file;
`lockLifecycle.ts` and `packageLockReservation.ts` must each be <=1,000, and
source guards prove the terminal root barrel/`ledgerAdapter.ts` did not change.

## Documentation Updates Required

None. TASK-555-07-L01 records preview/idempotency/recovery truth; L03 is closure
metadata only.
