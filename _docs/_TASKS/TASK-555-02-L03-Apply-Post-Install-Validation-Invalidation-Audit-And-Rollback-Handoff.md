# TASK-555-02-L03: Apply Post-Install Validation Invalidation Audit and Rollback Handoff
# FileName: TASK-555-02-L03-Apply-Post-Install-Validation-Invalidation-Audit-And-Rollback-Handoff.md

**Parent Subtask:** TASK-555-02
**Priority:** High
**Category:** Domain Execution / Reliability / Audit / Rollback
**Estimated Effort:** Large
**Dependencies:** TASK-555-02-L02 and landed TASK-555-06-L01 lineage plus
TASK-555-06-L02 drift-policy receipts; terminal TASK-551-08 backend-specific
invalidation lifecycle
**Status:** ⏳ To Do

---

## Overview

Execute the preview-bound fixed starter through its registered provider, verify the
committed source run and effective settings, persist the full bounded post-install
receipt, recover deterministic audit/backend-specific invalidation, and reserve then
delegate exact source-run rollback through one server-verified composite shared by the
curated lifecycle routes and TASK-489's generic exact-run route. Supersede the
drifted Setup wrapper with thin compatibility exports over this one domain. A
successful authoritative run remains a success even if a post-commit cache or audit
effect fails, but replay completes receipt recovery before result projection. Failed
apply settlement clears pending ownership only after exact zero-net proof; terminal
failed rollback consumes TASK-489's zero-net guarantee and clears only TASK-555's
reservation while recovery-required retains the same source/engine owner.

## Sub-Tasks

None; this is an executable leaf.

## Exact Single-Writer Ownership

This leaf is the sole writer for exactly:

- `core/services/kits/curatedStarters/providerExecution.ts` (new);
- `core/services/kits/curatedStarters/curatedStarterService.ts` (new);
- `core/services/kits/curatedStarters/rollbackCoordinator.ts` (new shared
  curated-lineage classifier/composite; terminal TASK-489 remains engine-only);
- `core/services/kits/curatedStarters/postCommitEffects.ts` (new);
- `core/services/audit/idempotentAuditService.ts` (new narrow successor helper over
  existing `audit_logs.id`; `auditService.ts` remains read-only);
- `core/services/setup/starterContentService.ts` (thin compatibility delegation);
- `tests/vitest/kits/curated-starter-post-commit.test.ts` (new);
- `tests/unit/kits/curatedStarterApplyService.test.ts` (new);
- `tests/unit/kits/curatedStarterProviderExecution.test.ts` (new);
- `tests/unit/kits/curatedStarterRollbackCoordinator.test.ts` (new);
- `tests/unit/audit/idempotentAuditService.test.ts` (new);
- `tests/integration/routes/starterContent.test.ts` (service contract rebaseline); and
- `tests/integration/kits/curatedStarterRollbackCoordinatorDb.test.ts` (new).

No route, Admin cache/client, DB schema/migration, artifact, TASK-489 UI, L06 lineage
owner, or full-site/legacy persistence file is edited.

## Dependencies and Land Order

Final TASK-555-02 leaf. Consume L02's preview claim/requested-run support and the
already-landed installed/drift policy. Hand service functions and error codes to
TASK-555-03. TASK-555-06-L03 later composes status UI without reopening these
execution files.

## Forbidden Paths

- TASK-414/489/545/547/548/551/554 tasks, all foreign
  changelogs/indexes/workflows/smoke; the tracked TASK-555 workflow is read-only;
- DB/schema/migrations, package/release/registry, existing provider persistence,
  routes/Admin/Setup UI/client, and L01/L02 source/tests;
- `solutionKitsCatalog.ts` and all unrelated dirty files.

## Security Contract

- **Endpoint visibility:** no route; internal route caller only.
- **Auth:** valid actor UUID and L02 actor-bound preview proof are required.
- **RBAC/CSRF/rate limit:** route-owned; service accepts no client permission/provider.
- **Validation:** strict starter ID, proof, requested deterministic run and lineage
  reservation/fence, provider result, successful run provenance, full validation
  receipt, deterministic audit/invalidation identities, effective settings, paths,
  warning codes, and exact source-run rollback marker.
- **Anti-abuse:** no public write/nonce/CAPTCHA; one claimed preview/run identity,
  bounded validation/effects, no continue-on-error request knob.
- **Privacy:** audit/result/logs exclude package, resource documents, snapshots,
  settings payloads, raw idempotency key, actor/session data, and form submissions.

## Execution Contract

For `solution-kit`, load the exact pinned catalog release and call L02's crash-safe
legacy coordinator with the server-only requested run ID and strict
`runOptions.curatedStarter`; no direct curated call to the lower installer remains.
For `full-site-package`, load the verified runtime artifact and call
`applyFullSitePackage` with requested owner ID and expected preview proof. FormaDom is
never converted into a catalog definition.

Explicit settings takeover is passed only when the current replan reports the exact
same sorted key set as preview. The provider cannot infer confirmation from a truthy
field or omit a conflicting setting. Legacy shell wiring uses IDs from authoritative
install results and stores only actual presence-aware `{key,before,after}` transitions
for `site.homepageId`, `site.navigationMenuId`, and `site.footerTemplateId`.
Full-site settings remain TASK-547 resource items/stages and its TASK-555 transition
list is empty. Both paths return settings read after commit.

## Implementation Pseudocode

```ts
export async function applyCuratedStarter(input: CuratedStarterApplyInput): Promise<CuratedStarterApplyResultV1> {
  const identity = deriveCuratedApplyRunIdentity(input);
  const replay = await readAndVerifyExistingCuratedApply(identity, input);
  if (replay) {
    const recovered = await resumeCuratedPostCommitRecovery(replay);
    return projectReplayResult(recovered, { replayed: true });
  }

  const prepared = await prepareCuratedApplyExecutionIntent({ ...input, ...identity });
  let providerResult: CuratedStarterProviderResult;
  try {
    providerResult = await requireProviderExecutor(prepared.definition.source.kind).apply({
      ...prepared,
      requestedRunId: identity.runId,
      idempotencyScope: identity.scopeDigest,
    });
  } catch (error) {
    const committed = await readCommittedCuratedRun(identity.runId);
    if (!committed) {
      const settlement = await readExactCuratedApplyFailureSettlement(identity.runId);
      if (settlement.kind === "failed_zero_net") {
        throw code("curated_starter_apply_failed"); // pending apply already cleared atomically
      }
      throw code("curated_starter_reconciliation_required"); // same owner/reservation retained
    }
    providerResult = rebuildProviderResultFromCommittedRun(committed);
  }

  const committed = await requireSuccessfulCuratedSourceRun(providerResult.runId, prepared);
  const effectiveSettings = await readEffectiveNameAndLocale();
  const recovered = await resumeCuratedPostCommitRecovery(committed);
  return projectApplyResult({
    committed: recovered.run,
    effectiveSettings,
    validation: recovered.validationReceipt,
    warnings: recovered.warningCodes,
    replayed: false,
  });
}

export async function rollbackCuratedStarter(input: CuratedStarterRollbackInput) {
  const reserved = await reserveOrResumeExactActiveHeadRollback(input);
  const existingRelation = await readAndVerifyReservedTask489Relation(reserved);
  const result = existingRelation
    ? await resumeExactTask489Rollback(existingRelation)
    : await startThenPersistExactTask489Relation(reserved, input.actorId);
  if (result.status === "failed") {
    const settled = await settleTerminalFailedRollbackAndReleaseReservation(reserved, result);
    const recovered = await resumeCuratedRollbackInvalidationRecovery(settled);
    return projectSafeTerminalFailedRollbackResult(settled, result, recovered.warningCodes);
  }
  if (result.status === "recovery_required") {
    return projectRecoveryRollbackResultPreservingReservation(reserved, result);
  }
  const committed = await finalizeReservedRollbackAndInvalidation(reserved, result);
  const effectiveSettings = await readEffectiveNameAndLocale();
  const recovered = await resumeCuratedRollbackInvalidationRecovery(committed);
  return projectSuccessfulRollbackResult(result, effectiveSettings, recovered.warningCodes);
}

type ServerVerifiedRollbackResultV1 =
  | Readonly<{
      kind: "engine_only";
      result: SafeSolutionKitRollbackResultDto;
    }>
  | Readonly<{
      kind: "curated";
      starterId: CuratedStarterId;
      result: CuratedStarterRollbackResultV1;
    }>;

export async function rollbackServerVerifiedSolutionKitRun(
  input: ServerVerifiedRollbackInput,
): Promise<ServerVerifiedRollbackResultV1> {
  const ownership = await classifyCuratedRollbackMembership(input.sourceRunId);
  if (ownership.kind === "invalid_curated_evidence") {
    throw code("curated_starter_rollback_invalid_source");
  }
  if (ownership.kind === "curated") {
    if (input.expectedStarterId && input.expectedStarterId !== ownership.starterId) {
      throw code("curated_starter_rollback_invalid_source");
    }
    return {
      kind: "curated",
      starterId: ownership.starterId,
      result: await rollbackCuratedStarter({ ...input, starterId: ownership.starterId }),
    };
  }
  if (input.expectedStarterId) throw code("curated_starter_rollback_invalid_source");
  return {
    kind: "engine_only",
    result: await rollbackExactInstallRunEngineOnly({
      sourceRunId: input.sourceRunId,
      actorId: input.actorId,
    }),
  };
}

export function projectTask489RollbackResult(
  outcome: ServerVerifiedRollbackResultV1,
): SafeSolutionKitRollbackResultDto {
  if (outcome.kind === "engine_only") return outcome.result;
  return normalizeSafeSolutionKitRollbackResultDto({
    sourceRunId: outcome.result.sourceRunId,
    rollbackRunId: outcome.result.rollbackRunId,
    packageKey: outcome.result.packageKey,
    engine: outcome.result.engine,
    status: outcome.result.status,
    safeErrorCode: outcome.result.safeErrorCode,
    summary: outcome.result.summary,
  });
}
```

`rollbackExactInstallRunEngineOnly` remains terminal TASK-489's engine-only exact
dispatcher. `ServerVerifiedRollbackResultV1` is a server-only discriminated outcome,
not either browser DTO. The generic TASK-489 route passes it through
`projectTask489RollbackResult`, which returns the exact safe TASK-489 result and strips
curated-only settings/warnings. Curated aliases require `kind:"curated"` and return its
strict curated result. A kind mismatch fails closed before serialization.
`rollbackServerVerifiedSolutionKitRun` is the only post-TASK-555 server entry point for
both `POST /solution-kits/runs/:runId/rollback` and the curated Solution Kits/Setup
aliases. Classification is DB-authoritative: an active head, pending relation,
historically reconciled head, or any strict curated predecessor-chain member belongs to
curated lineage. Only a source with no curated membership/evidence may fall through to
the engine-only dispatcher. A curated older non-head is rejected and can never bypass
lineage by using the generic TASK-489 route.

TASK-555 never branches engines by provider, but its lineage reservation is created
before dispatch. `readAndVerifyReservedTask489Relation` always runs first; after a
crash it resumes the exact source/engine run relation rather than invoking the
dispatcher blindly. TASK-489 owns both the legacy Setup three-key restore and the
full-site engine delegation. Its `success` result therefore proves every required
engine-owned settings restore completed; TASK-555 performs no second settings CAS.
Its exact `failed` result preserves `safeErrorCode` and every terminal summary counter.
Its `recovery_required` result preserves `safeErrorCode` with exact `summary:null`
because the owner is not proven terminal. Repaired TASK-489 guarantees that terminal
`failed` proves zero net rollback mutation. In one TASK-555 transaction,
`settleTerminalFailedRollbackAndReleaseReservation` locks the exact lineage/source/
engine relation, rechecks the failed owner, leaves `active_head_run_id` unchanged,
persists strict null for TASK-551 server invalidation when only lineage/status changed,
and clears every pending/lease field. The failed DTO remains HTTP 200 with
`effectiveSettings:null`; L04 invalidates its browser status/history selectors after
the strict response, and a later explicit
request may claim a fresh rollback owner after pending lineage/status receipt recovery
and must not resume the terminal failed one.
`recovery_required` remains HTTP 202 with `effectiveSettings:null`, the same fenced
reservation/source/engine owner, and no second dispatcher call. TASK-555 performs no
second settings restore or centralized rollback audit for any status.

Apply-only `resumeCuratedPostCommitRecovery` uses L02's repository CAS helpers and
deterministic identities. It first computes/persists the complete bounded validation receipt when
absent, then inserts one audit row through `logIdempotentAuditEvent`. The helper derives
the UUID by applying the parent's framed SHA-256-to-RFC-4122 conversion with domain
`coderso.curated-starter.audit-event.v1` to canonical exact-order
`{eventKind,sourceRunId}`, inserts that explicit
`audit_logs.id` with `ON CONFLICT DO NOTHING`, point-reads on conflict, and verifies
actor/action/target/sanitized metadata digest. A mismatch is
`curated_starter_audit_identity_conflict`; no random duplicate row is written.

Invalidation recovery treats strict null as complete no-server-cache work. For a
non-null receipt, Redis verifies the exact
durable outbox event and awaits terminal TASK-551 `applyAfterCommit`; its worker/fence
owns later transport recovery. Memory reads the persisted committed plan, asserts no
outbox row exists, awaits in-process `applyAfterCommit`, and CASes `committed ->
applied`; after process restart an unapplied plan is safe to apply again, and a fresh
process cache is empty until then. Stable warnings are
`curated_starter_cache_invalidation_deferred`, `curated_starter_audit_deferred`, and
`curated_starter_post_commit_recovery_required`. Status GET only projects receipt
state and performs zero recovery writes.

Rollback calls TASK-551 server invalidation recovery only when its own lineage
settlement also committed an actual resource change carrying a non-null valid server
plan; lineage/status-only settlement stores null. TASK-489 has already completed the
one centralized terminal rollback audit and actual-resource server/history browser
invalidation before returning its terminal DTO. TASK-555 never inserts, retries, or
warns about a second rollback audit and never duplicates TASK-489's resource plan. For
terminal failed, browser invalidation follows the strict response after the atomic
reservation clear; for recovery-required there is no TASK-555 terminal receipt because
the reservation is still authoritative.

`CuratedStarterInvalidationPlanV1` is the server-only TASK-551
`CacheInvalidationPlan`: exact opaque event key plus only members of TASK-551's closed
finite `CacheTag` union. Providers derive it from actual committed resource identities
and map those identities to existing broad server dependencies; resource IDs, slugs,
setting keys, TASK-489 global/package/detail selectors, curated status, and lineage/head
selectors never enter the plan. Renamed resources contribute old/new identities only
to derive the same valid broad tags. Redis uses terminal TASK-551 outbox/
`applyAfterCommit`; memory uses its persisted committed plan and awaited
`applyAfterCommit`. A commit with no matching server tag, including all-noop and
lineage/status-only settlement, stores null and emits no outbox. Separately, L04 runs
the exact best-effort Admin cache/cacheBus matrix after the strict response, including
TASK-489 global/package/source/rollback details and curated status. Apply compensation
emits only its actual valid server plan and a pre-write failure emits none. TASK-489 remains the sole
actual-resource/history rollback-plan owner; successful curated rollback contributes
only its committed lineage/status plan.

The compatibility `starterContentService.ts` removes `STARTER_BLUEPRINTS`,
`blueprintKey`, the fake default footer mutation, and the ID-collision workaround.
It accepts a `CuratedStarterId` and delegates preview/apply/rollback to this domain so
Setup and Solution Kits cannot drift again.

Curated rollback uses TASK-489's lossless summary/status/engine result and L06's exact
reservation. It records phases `reserved`, `engine_running`, `engine_terminal`,
`effects_pending`, `complete`, `failed`, or `reconciliation_required`. A retry verifies
the existing source/rollback relation and resumes the first incomplete phase. No API
result is `running`: `failed` keeps its exact safe code/counters, while
`recovery_required` keeps its safe code with `summary:null`. Both keep
`effectiveSettings:null` and trigger no second restore/audit or TASK-555 resource
effect. Failed is terminal zero-net settlement, clears the reservation, and permits a
fresh exact retry; recovery retains the same reservation/owner and resumes it. Terminal success
already includes TASK-489-owned settings restoration before TASK-555 advances the
lineage head and applies its own post-commit effects.

## Data Flow

Strict apply input -> deterministic existing-run/reservation check -> recovery before
replay OR current preview/replan plus requested-owner intent -> registry-selected
provider -> provider writer/package locks -> atomic requested-run insert + preview CAS +
lineage reservation -> authoritative run -> effective settings -> full validation receipt ->
deterministic audit + backend-specific invalidation recovery -> safe result. Rollback
first classifies server-side lineage ownership -> curated sources reserve the exact
active head while non-curated sources use TASK-489 engine-only dispatch -> resume/start
one TASK-489 relation -> dispatcher-owned settings restore where applicable -> success
atomically advances head; terminal failed leaves head and atomically clears reservation;
recovery leaves both head and reservation -> safe result/history.

## Error Handling

- L01/L02 codes retain meaning; provider failures map to stable
  `curated_starter_apply_failed` only when no successful authoritative run exists.
- A matching successful run wins over a thrown post-commit provider/audit error and
  returns replay/warning state after idempotent receipt recovery; client retries
  cannot duplicate resources.
- Invalid/missing/mismatched/non-head source run:
  `curated_starter_run_not_found` or `curated_starter_rollback_invalid_source`.
- Running legacy state resumes the exact coordinator phase; an unprovable partial
  state maps to `curated_starter_reconciliation_required`. Full-site follows TASK-547
  recovery/compensation codes.
- Failed post-install checks return committed success with a bounded
  `curated_starter_validation_warning`; they do not erase or auto-rollback a valid
  install unless the provider itself failed before successful finalization.
- TASK-489 `failed`, including dispatcher-owned settings CAS failure/drift, remains a
  safe HTTP 200 command result with exact bounded `safeErrorCode`, counters, and
  `effectiveSettings:null`. An unresolved committed phase remains HTTP 202
  `recovery_required` with exact safe code, `summary:null`, and null effective settings.
  Failed's zero-net proof lets TASK-555 clear pending rollback while preserving head and
  enabling a fresh exact retry. Recovery leaves head plus the same reservation/owner
  unchanged for explicit recovery and never retries the restore or audit.
- Apply failure is `curated_starter_apply_failed` only after the provider-owned terminal
  transaction proves zero net state and clears pending apply while preserving the prior
  head. Any partial/unprovable compensation remains
  `curated_starter_reconciliation_required` with the same owner/reservation.
- Unknown errors/log data are redacted.

## Regression Tests

- Exact provider dispatch for every registry entry; FormaDom never reaches
  `SolutionKitDefinition`, legacy never reaches package loader.
- Apply requires claimed fresh preview, exact takeover, and matching lineage fence;
  second same-key request returns the same run/resources/effective settings with
  `replayed:true`, zero provider/resource writes, and only necessary idempotent
  validation/audit/invalidation recovery writes.
- Full-site orchestration performs zero preview-claim/requested-run/lineage writes
  before the existing global/package locks; L02's requested-owner callback performs
  exact requested-run insert -> preview CAS -> lineage reservation in the package-
  lock transaction. Legacy claims only inside its own landed writer/package fence.
- Legacy/full-site result provenance, shell wiring, effective name/locale, public path
  projection, source-run options, active predecessor/managed lineage, and the single
  L06 bounded validation receipt.
- Cache-only, audit-only, dual post-commit failure and provider-throws-after-success
  all return committed success with stable warnings. Audit replay inserts one
  deterministic UUID row and verifies identity on conflict. Redis creates exactly one
  outbox row; memory creates none and persists one committed plan. Status GET performs
  zero recovery writes.
- True pre-commit/provider failure has no successful run/result and maps safely.
- Rollback atomically reserves only the active head, losslessly preserves TASK-489
  package key/safe code, terminal counters or recovery `summary:null`, and exact
  `success|failed|recovery_required` status,
  discovers/resumes an existing engine relation before dispatch, proves no TASK-555
  settings-restore or rollback-audit call exists, recovers only its lineage/status
  invalidation receipt after success/terminal failed, clears failed reservation only
  after TASK-489 zero-net proof, retains the exact recovery reservation/owner, resumes
  every recovery crash boundary idempotently, permits a fresh owner only after failed
  settlement, and appears in existing run history; request provider spoofing is
  impossible.
- Apply crash tests prove success terminalization and proven-zero-net failure settlement
  each atomically bind run status, unchanged/advanced head, reservation clear, and
  backend receipt; partial compensation/fence loss leaves all settlement pending and
  cannot project `curated_starter_apply_failed`.
- Both direct route families call `rollbackServerVerifiedSolutionKitRun`. DB and route
  tests build `A -> B -> C`, roll back through the generic TASK-489 path as
  `C -> B -> A -> null`, and prove direct attempts against C/B after they cease to be
  head reject before TASK-489 dispatch, run creation, settings work, audit, or resource
  mutation. A non-curated legacy/full-site source still reaches the engine-only
  dispatcher exactly once.
- Setup compatibility layer accepts only registry IDs and returns the same DTOs; old
  `blueprintKey`/raw definitions are rejected at type and runtime boundaries.
- DB tests are self-restoring and delete only tracked lineage/run/items/audit/outbox/
  fixture rows.

## Testing Requirements

```bash
NODE_ENV=test vitest run --config vitest.config.ts \
  tests/vitest/kits/curated-starter-post-commit.test.ts
bun test tests/unit/kits/curatedStarterApplyService.test.ts \
  tests/unit/kits/curatedStarterProviderExecution.test.ts \
  tests/unit/kits/curatedStarterRollbackCoordinator.test.ts \
  tests/unit/audit/idempotentAuditService.test.ts
set -a && source /home/coder/project/Coderso/.env && set +a && \
  bun test --parallel=1 --timeout 360000 \
  tests/integration/kits/curatedStarterLegacyApplyRecoveryDb.test.ts \
  tests/integration/kits/curatedStarterRollbackCoordinatorDb.test.ts \
  tests/integration/routes/starterContent.test.ts
bun run lint:repo:types
bun --cwd core lint:types
bun --cwd core lint
git diff --check
```

Run `wc -l` for every owned human-authored source/test file and fail above 1,000.

## Documentation Updates Required

None. TASK-555-07-L01 owns final lifecycle/audit/cache/rollback documentation and
generated-doc validation; L03 is closure metadata only.
