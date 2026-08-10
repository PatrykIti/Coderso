# TASK-489-01-L02: Exact Source-Run Engine-Aware Rollback Dispatcher
# FileName: TASK-489-01-L02-Run-Item-Detail-Drilldown.md

**Parent Subtask:** TASK-489-01
**Priority:** High
**Category:** Solution Kits / Rollback / Reliability / Security
**Estimated Effort:** Large
**Dependencies:** All TASK-489 parent-level start gates; TASK-489-01-L01; TASK-547 done; complete terminal TASK-551 with the full active-owner evidence receipt
**Status:** ⏳ To Do
**Changelog:** 1268 (pinned; closure only)

---

## Overview

Implement an exact source-run dispatcher. Legacy sources invoke the existing
legacy rollback service with the explicit run ID. Full-site sources invoke the
existing fenced `rollbackFullSiteInstall`. Unknown, mixed, contradictory,
pruned, or ineligible evidence fails before any rollback run or domain write.
Created rollback runs reach a proven source-level terminal success/failure when
ownership remains authoritative. If a durable claimed owner cannot be proven
terminal, the dispatcher returns `recovery_required` for exact resume instead of
inventing terminal state. There is no latest fallback and no apply/dry-run UI or
route addition.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Production:**
`core/services/kits/solutionKitInstallRollbackDispatcher.ts` (new),
`core/services/kits/legacyExactRollbackCoordinator.ts` (new),
`core/services/kits/solutionKitRollbackInvalidation.ts` (new),
`core/services/kits/legacyCombinedInstallPlan.ts` (new), and
`core/services/setup/starterContentApplyCoordinator.ts` (new). This leaf consumes
L01's pure `starterContentRollbackEnvelope.ts` and exact owner/phase-CAS APIs.
It owns bounded exact-rollback/evidence and claimed-run regions in terminal
`core/services/kits/solutionKitInstallOperations.ts`, terminal
`core/services/kits/solutionKitsInstallService.ts` (claimed-run plus high-level
generic deferred-terminalization entry points and stable re-exports only),
`core/services/kits/kitInstaller.ts`,
`core/services/kits/legacyInstallRollback.ts`,
`core/services/templates/templateInstaller.ts`,
`core/services/widgets/widgetTemplateService.ts`,
`core/services/widgets/widgetTemplateRevisionService.ts`,
`core/services/setup/starterContentService.ts`. It consumes L01's landed
transaction-aware deterministic `logAuditOnceTx`. It also owns only the explicit-
rollback outcome/audit
finalization regions in `core/services/kits/fullSiteInstall/rollback.ts`,
`core/services/kits/fullSiteInstallTypes.ts`, and
`core/services/kits/legacyInstallRunPersistence/dryRunTerminalization.ts`, plus
the exact explicit-rollback owner-selection region in terminal
`core/services/kits/legacyInstallRunPersistence/ledgerAdapter.ts` so terminal
failed rows are never reset to running and a retry inserts a new owner; the
terminal `legacyInstallRunPersistence.ts` barrel remains byte-identical and all
other full-site fence, compensation, apply, and finalization behavior stays
byte-identical. L01 remains the sole family writer of terminal
`solutionKitInstallRunRepository.ts`, `solutionKitRollbackAudit.ts`, and
`auditService.ts`; this leaf consumes
`claimExactLegacyRollbackSourceTx`,
`claimOrResumeStarterContentApplyOwner`,
`compareAndSetStarterContentApplyPhase`,
`claimLegacyApplyEvidenceWriter`,
`recordLegacyTemplateSourceEvidenceTx`, and
`finalizeGenericLegacyTemplateApply`,
`finalizeStarterContentApplyOwner`,
`readLegacyRollbackReplayStateTx`,
`recordLegacyTemplateRollbackProgressTx`,
`buildCombinedLegacyRollbackSummaryTx`,
`releaseStarterContentApplyOwnerOnRollbackTx`,
`recordSolutionKitRollbackTerminalAuditTx`, and
`finalizeExactLegacyRollbackOwner` without reopening those L01 files.

**Tests:**
`tests/unit/kits/solutionKitInstallRollbackDispatcher.test.ts` (new),
`tests/unit/kits/solutionKitRollbackInvalidation.test.ts` (new),
`tests/unit/setup/starterContentApplyRecovery.test.ts` (new),
`tests/integration/kits/solutionKitExactRollbackDb.test.ts` (new), and
`tests/security/solutionKitExactRollback.test.ts` (new), plus bounded regression
regions in `tests/unit/kits/kitInstaller.test.ts`,
`tests/unit/kits/installService.test.ts`,
`tests/unit/templates/templateInstaller.test.ts`, and
`tests/unit/widgets/widgetTemplateService.test.ts`,
`tests/unit/widgets/widgetTemplateRevisionService.test.ts`,
`tests/integration/routes/starterContent.test.ts`, plus bounded explicit-rollback
regions in existing `tests/unit/kits/fullSiteInstallService.test.ts` and
`tests/unit/kits/fullSiteLegacyLedgerDryRunTerminalization.test.ts`.

No routes/schemas/Admin/UI, DB schema/migrations, retention, unrelated full-site
fence/compensation/apply code, task/changelog/board files, or TASK-555/TASK-556
may be edited. The only apply-side exceptions are the named Setup coordinator,
`starterContentService.ts`, `templateInstaller.ts`, `kitInstaller.ts`, and the
terminal install operation/facade claimed-run regions named above; retained
low-level core-only apply and dry-run behavior is not widened. The high-level
`applyKitInstall` path is deliberately repaired so a source that includes
templates cannot terminalize before normalized template evidence.

## Engine Classification

- Load the exact source run by canonical UUID with the safe classification
  projection. Never query by package key for a replacement source.
- `full_site` requires `options.fullSitePackage === true` plus a strict valid
  TASK-547 initialization/lifecycle marker shape and item kinds contained in the
  ten-kind registry.
- `legacy` requires absence of every full-site marker and every item kind to be
  in the legacy set `content_type|form|page|menu`.
- A false/malformed full-site marker, legacy marker with extended kinds,
  conflicting lifecycle metadata, mixed evidence, or unknown kind is not
  coerced. Return `solution_kit_run_engine_unknown` or
  `solution_kit_run_engine_mixed` and perform zero writes.
- Source must be mode `apply`, not itself a rollback, and satisfy its engine's
  existing eligibility rules. Repeated/already-completed rollback remains a
  stable conflict; never silently noop against a different/latest run.
- Legacy eligibility is rechecked by L01 under the canonical package/source
  claim lock. A same-package successful apply with a greater `(createdAt,id)`
  rejects as `solution_kit_rollback_source_superseded` before a rollback owner
  only when no terminal successful rollback points to that exact newer apply.
  Active all-noop and byte-equal applies still supersede; successfully rolled-
  back newer applies release the predecessor in `C -> B -> A -> null` order.
  Snapshot comparison is not the supersession test.

## Combined Legacy Preflight And Claimed Run

- `legacyCombinedInstallPlan.ts` imports L01's constants and strictly normalizes
  manifest, core plan, and template seeds/actions before either generic legacy
  apply, Setup claim, or exact rollback claim. It enforces <=512 combined core
  plus template operations and <=100 templates; each normalized template seed
  counts even if current-state diff later makes it noop. It also enforces exact canonical limits of
  4,194,304 template-seed bytes, 524,288 bytes per template snapshot, 1,049,600
  bytes per action, 12,582,912 action-vector bytes, 16,777,216 Setup-envelope
  bytes, and 8,388,608 digest-input bytes. It does not run separate permissive
  loops whose totals can exceed 512.
- The validated plan also carries terminal TASK-551-06-L01's exact
  `buildLegacyCombinedPositionMap` result. Core source positions are their native
  local positions, template source positions are offset by `coreCount`, and every
  rollback position is `combinedCount-1-sourcePosition`. Template evidence and
  progress persist those global positions; core rollback items retain native local
  positions but combined proof projection uses the map's global rollback position.
  Empty, core-only, template-only, and mixed plans share this one mapping.
- `legacyCombinedInstallPlan.ts` owns one
  `buildLegacyTemplatePlanDigest` function. Its strict input is exactly
  `{contract:"coderso.legacy-template-plan@v1",items}`. `items` are in
  source-position order and each has only
  `{sourcePosition,templateKey,seed}`; `seed` is the normalized exact
  `{key,name,description,category,status,blocks,settings}` template seed, with
  `templateKey===seed.key`, canonical strings, explicit nullable fields/status,
  recursively plain normalized block/settings JSON, and the predecessor byte caps.
  The builder returns lowercase SHA-256 over this input's UTF-8 canonical JSON with
  recursive Unicode-code-point key sorting; no implicit prefix, wrapper, insertion
  order, or caller-selected domain exists. Source creation, evidence claim, and
  finalization compute this value once and reuse it. Literal known vectors cover
  empty, one-item, and mixed plans; a reordered item or changed seed changes it.
- `kitInstaller.ts` builds the core plan and template seeds before calling a run
  creator or mutation service, validates them as one vector, and then passes the
  frozen validated plan forward. Count/byte failure is
  `solution_kit_plan_limit_exceeded` with zero run/owner/item/domain/template/
  settings/audit/invalidation writes. Exact rollback strictly parses the persisted
  source core items plus template actions through the same limits before claiming
  an owner; persisted overflow is `solution_kit_run_shape_invalid` with zero write.
- The Setup-only `applyOrResumeClaimedKitInstall` calls the landed
  `applyOrResumeClaimedSolutionKitInstall` with L01's opaque claim and precreated
  run ID. That lower entry point never calls `createRun`, never accepts a raw run
  ID/browser token, requires claim/package/actor/definition/plan parity, and owns
  no terminal audit/finalization. It suppresses the lower generic
  `solution_kits.apply` audit on this claimed path; L01's Setup finalizer emits the
  sole deterministic apply audit. Exact successful/noop core receipts are skipped
  only after same-transaction current-post-state verification; missing/failed
  positions retry through terminal TASK-551's native mutation plus item-receipt
  transaction. Generic apply/dry-run keeps creating its own run and cannot accept
  this capability.
- Claimed execution returns only receipt-derived state for that exact run. It
  cannot synthesize a result from in-memory operations, patch metadata after a
  mutation, or fall back to a newly created run. L01's Setup finalizer alone
  computes the combined <=512 summary and terminalizes/audits the source.
- Generic legacy apply is not exempt. After its server-created running source
  run is created with typed template-plan version/count/digest and core execution
  is deferred from terminalization, `kitInstaller.ts` obtains L01's opaque
  `LegacyApplyEvidenceClaim`. Every template create/update/noop/failed/skipped
  attempt then calls
  `recordLegacyTemplateSourceEvidenceTx` with `setupGuard:null`; Setup passes the
  same evidence claim plus its exact phase/digest guard. Generic and Setup source
  finalization both reject a missing/duplicate/mismatched evidence position.
  Generic finalization calls L01 `finalizeGenericLegacyTemplateApply`; Setup keeps
  `finalizeStarterContentApplyOwner`. The
  existing aggregate `templateInstallSummary` and changed-only
  `templateRollbackPlan` may remain compatibility mirrors but cannot authorize
  rollback, retry, retention, or source terminalization.

## Legacy Current-State Guard

- Every successful legacy source item must carry a strict canonical
  `afterSnapshot`. A create is deleted only when the current resource equals
  that snapshot; an update is restored only when current equals that snapshot.
- The compare and delete/restore execute under the same resource transaction and
  native-writer fence. A newer apply, administrator edit, missing row, duplicate
  natural key, malformed snapshot, or compare mismatch fails
  `solution_kit_rollback_state_changed` with zero mutation for that item.
- `TemplateInstallRollbackAction` gains the exact applied `afterSnapshot`, which
  is captured for every successful apply-side create/update. Every new Setup
  operation, including noop, is persisted in normalized
  `solution_kit_legacy_template_evidence` through L01's same-transaction API;
  rollback actions exist only for changed templates. Source options may retain a
  strict bounded mirror for compatibility, but no retry/progress/retention query
  treats it as authority. For a pre-normalized historical run only,
  `kitInstaller.ts` uses one recursively strict all-or-nothing parser for the
  complete progress/action vector and L01 materializes deterministic normalized
  evidence under the exact source lock before owner insertion. Action identities
  must be a subset of matching progress identities; malformed entries are never
  dropped while continuing. Historical missing/invalid after-state or an existing
  evidence digest mismatch fails
  `solution_kit_template_rollback_after_snapshot_missing` before owner or template
  write.
- Template current read, canonical compare to `afterSnapshot`, delete/restore,
  and required revision insertion execute through one transaction-aware
  widget-template service/revision seam and one transaction handle. That same
  transaction calls L01 `recordLegacyTemplateRollbackProgressTx`, so mutation,
  revision, rollback-owner item receipt, and invalidation receipt commit together
  or not at all. Resume calls `readLegacyRollbackReplayStateTx` under the same
  lock and skips only a byte-identical receipt whose current state equals its
  recorded target. A verified conflict before mutation records only
  `pending_to_failed_no_mutation`; it never claims a mutation occurred. A missing
  row, concurrent edit, invalid snapshot, name
  conflict, compare race, or replay mismatch rolls back that transaction and
  never falls back to marker/name/stale-ID mutation.

## Setup Rollback Envelope And Resume

- `applyStarterContent` adds no request/browser run ID or idempotency key. The
  authenticated actor and server-selected package/definition digest are its only
  recovery scope. While holding the canonical package lock it captures presence-
  aware raw state through terminal `captureFullSiteSettingsBatchRaw` for the sorted
  allowlist `site.footerTemplateId`, `site.homepageId`, and
  `site.navigationMenuId`, then calls L01's exact
  `claimOrResumeStarterContentApplyOwner`. The TASK-551 unique partial marker
  permits one active `coderso.starter-content-rollback@v1` source per package/
  actor across running and terminal response replay. Same-scope retry resumes it;
  terminal phase `complete` returns its same safe result with zero mutation. A
  contradictory/duplicate marker fails
  `solution_kit_starter_apply_recovery_required` without a second run.
- `starterContentApplyCoordinator` drives only L01's exact digest/phase CAS:
  `before_captured -> core_applying -> core_applied -> templates_applying ->
  templates_applied -> shell_write_prepared -> shell_write_applied -> complete`.
  It calls Setup-only `applyOrResumeClaimedKitInstall`, which passes the opaque
  claim to `applyOrResumeClaimedSolutionKitInstall`; neither accepts a bare
  preclaimed run ID and neither can create another run. Both force
  `continueOnError:false`; retained `applyKitInstall` behavior is unchanged.
  Deterministic core positions already carrying exact successful/noop
  receipts are verified against current post-state and skipped. Missing or failed
  positions retry through terminal TASK-551's one-transaction native-mutation plus
  item-receipt seam. Thus a crash cannot leave a committed core mutation without
  its durable source-run evidence, and resume never creates another run.
- Every successful template create/update transaction performs current-state
  compare, native mutation, required revision write, exact applied-state capture,
  and L01 `recordLegacyTemplateSourceEvidenceTx` on the same transaction handle.
  Its strict rollback action includes only
  `key,templateId,operation,beforeSnapshot,afterSnapshot`; `sourcePosition` belongs
  to the enclosing normalized evidence/progress row and never enters the reject-
  unknown action object. The returned normalized source-evidence ID/digest is stored in
  the envelope mirror and is the only identity later accepted by progress. Failure
  on either side rolls back both; replay accepts only a byte-identical persisted
  evidence row whose current state still equals `afterSnapshot`.
  No later `patchRunMetadata` window may attach rollback evidence after the
  template commit.
- After core/template phases, shell targets are derived only from persisted source
  items and template actions, never an in-memory prior response. A phase CAS stores
  sorted changed-key-only `before` and `appliedAfter`. In
  `shell_write_prepared`, current exactly equal to `before` runs terminal
  `applyFullSiteSettingsBatchAtomic({expectedCurrent:before,target:appliedAfter})`;
  current exactly equal to `appliedAfter` proves a prior commit and advances
  without a second write; any third state is
  `solution_kit_rollback_state_changed`. Empty changed-key sets advance without
  calling the nonempty batch API. `shell_write_applied` then terminalizes the same
  source run through L01 `finalizeStarterContentApplyOwner`, which atomically writes
  phase `complete`, status/summary, deterministic apply audit, and source-run
  invalidation receipt; after commit the coordinator awaits its returned
  `applyAfterCommit` plan. A crash at every named boundary resumes the first
  incomplete phase; no completed core/template/shell write is replayed.
- The strict envelope retains only changed-key rollback `before/appliedAfter` after
  prepare. Each state is exactly `{key,present:false}` or
  `{key,present:true,value}`; `null` is present, never absence. Malformed, legacy
  `priorShellRefs`-only, missing-after, unknown-key, or contradictory metadata is
  `solution_kit_starter_rollback_metadata_invalid` and is not rollbackable.
- The rollback relation stores the envelope digest and phases
  `engine_claimed -> engine_dispatching -> engine_succeeded ->
  settings_restore_pending -> compensating_to_source -> complete`. One phase-CAS
  winner invokes the legacy
  engine; a retry resumes the same preclaimed engine/items/finalization and never
  starts a second relation or top-level engine invocation. The generic dispatcher
  detects the envelope and restores only after terminal engine success through
  `restoreFullSiteSettingsBatchRawAtomic({expectedCurrent:appliedAfter,target:before})`.
  Administrator drift maps to `solution_kit_rollback_state_changed` and preserves
  current settings. Because engine mutations may already have committed, the
  coordinator must then compensate every rollback progress receipt back to the
  exact source state through the same transaction-aware native/template seams.
  Only locked proof that no engine mutation committed or that all such mutations
  reached L01 `source_restored` permits terminal failed; otherwise the same owner
  remains running as recovery-required. The legacy coordinator defers success
  finalization until settings restoration is complete. Its atomic successful
  finalization CASes the exact source envelope `active:true -> false`; terminal
  failed keeps `active:true`, releases only the rollback claim, and lets a later
  exact rollback request claim a new owner. Recovery keeps both marker and the
  same running rollback owner.
- `rollbackStarterContent({sourceRunId,actorId})` is only a compatibility wrapper
  around this same coordinator. `kitId`, latest lookup, direct
  `rollbackKitInstall`, and any wrapper-owned second settings phase are removed.

## Terminal Finalization, Invalidation, And Audit

This section may not start unless the terminal TASK-551 receipt proves actual
full-site apply/rollback/compensation adapters use the same-transaction finite-tag
collector, backend-specific durable receipt, and awaited public
`applyAfterCommit` boundary. A generic cache API or legacy-only adoption test is a
hard predecessor blocker, not permission for this leaf to patch invalidation after
the fact.

- Pre-write classification/eligibility rejection throws a mapped error and creates
  no rollback run. Once a run is claimed, the coordinator returns strict
  `success|failed|recovery_required`; `running` is not a DTO status. Success
  requires a proven complete rollback. Failed requires L01's locked proof that
  zero rollback mutation committed or every committed rollback mutation was
  compensated to exact source state; it terminalizes that owner and leaves the
  source eligible for a new exact claim. `recovery_required` is mandatory for any
  partial/unresolved mutation or when terminal ownership cannot be proven; it
  returns the same running owner ID, safe code, and `summary:null` for exact resume.
- Terminal success writes typed proof kind `complete`; terminal failed writes
  typed proof kind `zero_net`; both bind the locked canonical combined-progress
  digest in the same terminal transaction. A terminal failed row without that
  normalized proof is never retry authority, regardless of options/summary JSON.
- For terminal failed, L01's finalizer first proves no uncompensated committed
  mutation and materializes all untouched core/template positions as deterministic
  no-mutation receipts in that same transaction. Summary/digest/audit/proof/status
  are computed only after the complete position set exists; L02 never asks the
  repository to derive a proof from a sparse early-failure graph.
- After any post-claim item/settings failure, each engine either proves no mutation
  committed or runs its existing/native reverse compensation to exact source state.
  L01 progress receipts make legacy compensation resumable; full-site keeps its
  existing compensation ledger. Failure to complete or prove that compensation is
  recovery-required, never terminal failed.
- Run creation and every terminal finalization trigger best-effort invalidation
  of all safe global/package history pages plus source/rollback detail families.
  The browser repeats this invalidation after success, failed, or
  recovery-required response so other tabs cannot retain a fresh-looking pre-
  rollback page or miss the durable running owner.
- Each resource transaction maps only actually mutated families to finite
  terminal TASK-551 cache tags, persists one deduplicated outbox plan in that
  same transaction, commits, then awaits the sole
  `getServerCacheRuntime().invalidation.applyAfterCommit(plan)` boundary. Noop,
  rejected, or database-rolled-back transactions persist no plan. A later item
  failure does not discard plans for earlier commits, but those commits force
  recovery until their compensations commit and are proven; they cannot be hidden
  behind terminal failed. Cache/outbox delivery failure records bounded telemetry/
  retry state and never changes the committed mutation into an apparent API failure.
- Terminal TASK-551 must already prove full-site reversal adapters return the same-
  transaction persisted invalidation plan for every atomic mutation and expose the
  sole public apply-after-commit handle. This leaf does not retrofit post-hoc tags.
  Its bounded `fullSiteInstall/rollback.ts` successor region catches failures only
  after `ownerRunId` exists. It finalizes failed only when native-writer authority
  and engine receipts prove no rollback mutation or full compensation to the
  source. Otherwise, including authority/finalization uncertainty, it leaves the
  same owner nonterminal and returns `recovery_required`. A terminal failed owner
  is not reset to running; the next exact request claims a new owner. The existing
  fence and compensation algorithms are not copied or weakened.
- Both engine finalizers receive one strict terminal-audit descriptor. In the same
  DB transaction that computes the final summary and writes status/finishedAt,
  `recordSolutionKitRollbackTerminalAuditTx` calls `logAuditOnceTx`. Its UUIDv5
  identity is deterministic from the source/rollback run pair. The event keeps
  action `solution_kits.rollback`, target type `solution_kit_install_run`, and
  target ID equal to the source run ID. Metadata contains only rollback run ID,
  package key, engine, terminal status, safe code/null, and the five status plus
  five operation counters. Audit insert/identity mismatch rolls back
  terminalization; the caller returns `recovery_required` unless a locked reread
  proves the exact terminal status plus audit row. There is no terminal-without-
  audit crash window and no audit for a nonterminal owner. The lower legacy event
  is suppressed on the preclaimed exact path.

## Dispatcher Result

The dispatcher imports L01-owned `SafeSolutionKitRollbackResultDto`; it does not
redeclare a parallel union. Its exact branches remain success with null code and
summary, failed with bounded code and summary, or recovery-required with bounded
code and `summary:null`; every branch carries only source/rollback IDs, package
key, and strict legacy/full-site engine.

The parser rejects unknown keys and no engine result may include items,
snapshots, options, actors, rollback payloads, or raw errors. A terminal failed
DTO is a completed zero-net command result; it can never hide a committed
uncompensated item.
`success` requires `safeErrorCode:null`; `failed` requires one reviewed bounded
machine code and never a message. `recovery_required` requires a canonical durable
rollback owner ID, one reviewed bounded code, and exactly `summary:null`; it is
forbidden before owner claim or when a locked reread proves terminal success/failed.

## TASK-555 Successor Composite Reservation

This leaf exports both `rollbackExactInstallRunEngineOnly` and the initial
route-facing alias `rollbackExactInstallRun`. Serialized TASK-555 later replaces
only the route dependency with `rollbackServerVerifiedSolutionKitRun`; it does
not rename or wrap the engine-only export. The successor composite performs
TASK-555's bounded server-side membership classification by exact source run ID
across all seven lineage roots and their strict capped managed-lineage/run
evidence. Browser starter identity is ignored:

1. An active head, same-source pending rollback, historically reconciled head, or
   predecessor-chain member remains on the curated branch. The exact active source
   delegates to `rollbackCuratedStarter`; an older non-head rejects there before
   engine work. Ambiguity, gap, cycle, overflow, or parity mismatch fails closed.
2. Only proof of zero curated membership/evidence calls
   `rollbackExactInstallRunEngineOnly({sourceRunId,actorId})` directly.
3. The curated coordinator's engine callback also calls only the engine-only
   export. It never calls the route composite, preventing recursion.

TASK-555 must project the generic safe DTO only after its lineage CAS. Repeated
direct generic-route rollback of curated `C`, restored `B`, then restored `A`
therefore advances `activeHeadRunId` to `B`, `A`, then `null`. A terminal failed
zero-net engine outcome preserves the head but releases its pending reservation,
so a later exact request can reserve a new owner. Only `recovery_required`
preserves the exact pending source/engine relation and same running owner. Until
TASK-555 lands there is no lineage table to inspect and
the initial alias remains engine-only; no speculative JSON marker substitutes for
the later server-verified relation. TASK-555 must preserve an engine-returned
recovery branch but cannot invent TASK-489 `recovery_required` after a proven
terminal engine merely because its own lineage/invalidation finalization is
uncertain; that uses TASK-555's mapped recovery contract and keeps the generic
route from returning premature success.

## Security Contract

- **Endpoint visibility:** none in this leaf; internal service only.
- **Auth/RBAC:** caller must pass the authenticated session actor UUID;
  TASK-489-02-L01 enforces require-all `solution-kits:write` and
  `settings:write` before invocation.
- **CSRF/rate limit:** route-owned `withCsrf` and `admin_write`.
- **Validation:** canonical source/actor UUIDs; exact engine classification;
  strict output DTO.
- **Anti-abuse:** one exact source, no latest lookup, no caller engine hint, no
  continue-on-error option, and existing full-site package locks/fences.
- **Sensitive data:** audit/telemetry contain only source ID, rollback run ID,
  package key, engine, safe status/code/counters; never payload JSON.

## Implementation Pseudocode

```ts
export async function applyKitInstall(input: ApplyInput, deps = defaults) {
  const definition = resolveKitDefinition(input);
  const combined = normalizeCombinedCoreAndTemplatePlan(definition);
  if (input.dryRun) return deps.runExistingBoundedDryRun(combined, input);

  const templatePlan = buildStrictLegacyTemplatePlan(combined.templateSeeds);
  const templatePlanDigest = buildLegacyTemplatePlanDigest({
    contract: "coderso.legacy-template-plan@v1",
    items: templatePlan,
  });
  const core = await deps.applyOrResumeGenericLegacyInstallDeferred({
    ...input,
    corePlan: combined.corePlan,
    legacyTemplatePlanVersion: 1,
    legacyTemplatePlanCount: templatePlan.length,
    legacyTemplatePlanDigest: templatePlanDigest,
  }); // source remains running; no generic terminal audit yet
  const evidenceClaim = await deps.claimLegacyApplyEvidenceWriter({
    sourceRunId: core.run.id,
    packageKey: core.run.kitId,
    actorId: requireServerActor(input),
    legacyTemplatePlanCount: templatePlan.length,
    legacyTemplatePlanDigest: templatePlanDigest,
  });
  await deps.applyTemplatePlanWithEvidence({
    plan: templatePlan,
    continueOnError: input.continueOnError,
    recordTx: (tx, evidence) => deps.recordLegacyTemplateSourceEvidenceTx(tx, {
      claim: evidenceClaim, setupGuard: null, evidence,
    }),
  });
  const committed = await deps.finalizeGenericLegacyTemplateApply({
    claim: evidenceClaim,
    expectedTemplatePlanCount: templatePlan.length,
    expectedTemplatePlanDigest: templatePlanDigest,
    coreResult: core,
    terminalAudit: buildGenericLegacyApplyAudit(core),
    invalidationTags: collectActualGenericApplyTags(core),
  });
  if (committed.plan) await deps.cache.applyAfterCommit(committed.plan);
  return committed.result;
}

export async function rollbackExactInstallRunEngineOnly(input: unknown, deps = defaults) {
  const { sourceRunId, actorId } = parseExactRollbackCommand(input);
  const source = await deps.history.getRollbackClassification(sourceRunId);
  if (!source) throw new Error("solution_kit_install_run_not_found");
  const engine = classifyInstallEngineStrict(source);
  assertEligibleExactSource(source, engine);
  const setup = parseOptionalStarterContentRollbackEnvelope(source.options);
  const historicalEvidenceCandidate = engine === "legacy"
    ? preflightStrictHistoricalLegacyEvidenceCandidate(source)
    : null; // all-or-nothing core+template <=512/count/byte parser
  if (setup && engine !== "legacy") {
    throw new Error("solution_kit_starter_rollback_metadata_invalid");
  }

  const legacyRelation = engine === "legacy"
    ? await deps.resolveOrClaimExactLegacyRollbackRelation({
        sourceRunId, actorId, setupEnvelopeDigest: setup?.digest ?? null,
        historicalEvidenceCandidate,
      })
    : null; // full-site ownership remains inside rollbackFullSiteInstall
  const outcome = await deps.resumeExactRollback({
    source, legacyRelation, engine,
    executeEngineOnce: () => engine === "full_site"
      ? deps.rollbackFullSiteInstall({
          sourceRunId, actorId,
          terminalAudit: buildTerminalAuditDescriptor(source),
        })
      : deps.rollbackClaimedLegacyInstall({
          claim: requireLegacyRelation(legacyRelation),
          evidence: requireNormalizedLegacyEvidence(legacyRelation),
          assertCurrentMatchesPersistedAfterState: true,
          terminalAudit: buildTerminalAuditDescriptor(source),
        }),
    afterEngineSuccess: setup
      ? () => deps.restoreStarterSettingsCas(setup.appliedAfter, setup.before)
      : null,
  });
  const dto = await toSafeRollbackResultDtoFromProvenOwner(source, outcome);
  deps.invalidateSafeHistoryAndDetailsBestEffort(dto);
  return dto;
}

// Route-facing alias until TASK-555 installs its serialized lineage-aware composite.
export const rollbackExactInstallRun = rollbackExactInstallRunEngineOnly;

// Bounded successor region inside fullSiteInstall/rollback.ts, after owner claim.
async function finishOwnedFullSiteRollback(ownerRunId, source, execute) {
  let executionError: unknown = null;
  try {
    await execute();
  } catch (error) {
    executionError = error;
  }
  const desired = executionError === null
    ? { status: "success", safeErrorCode: null }
    : await proveFullSiteRollbackZeroNetOrCompensated(ownerRunId, source)
      ? {
          status: "failed",
          safeErrorCode: toSafeFullSiteErrorCode(
            executionError, "site_package_rollback_failed"
          ),
        }
      : null;
  if (desired === null) {
    return recoveryRequiredForSameRunningOwner(ownerRunId);
  }
  const proof = await tryFinalizeOrRereadOwnedRollbackWithAudit({
    ownerRunId, source, ...desired,
  });
  return proof.terminal
    ? proof.outcome
    : {
        runId: ownerRunId,
        status: "recovery_required",
        safeErrorCode: proof.safeRecoveryCode,
      };
}
```

**Data flow:** route actor + path ID -> strict command -> exact ledger
classification -> engine eligibility -> full-site existing lifecycle OR legacy
package/source-lock/durable owner claim or existing-relation resume -> template
rollback -> core rollback using the same preclaimed owner, with per-resource
same-transaction current/after-state comparison and durable invalidation plan ->
optional Setup expected-current settings restore -> on failure exact compensation
back to source or same-owner recovery -> terminal finalization -> one
atomic deterministic safe audit -> safe result projection or durable
recovery-required projection -> history/detail invalidation
route/client handoff. No template or core mutation precedes claim or bypasses the
current-state guard; no success precedes Setup restoration.

**Error handling:** stable codes include
`solution_kit_install_run_not_found`, `solution_kit_rollback_invalid_source`,
`solution_kit_run_engine_unknown`, `solution_kit_run_engine_mixed`,
`solution_kit_already_rolled_back`, `solution_kit_rollback_in_progress`,
`solution_kit_rollback_recovery_required`,
`solution_kit_rollback_source_superseded`,
`solution_kit_rollback_relation_limit_exceeded`,
`solution_kit_rollback_state_changed`,
`solution_kit_plan_limit_exceeded`, `solution_kit_run_shape_invalid`,
`solution_kit_starter_apply_recovery_required`,
`solution_kit_starter_rollback_metadata_invalid`,
`solution_kit_template_rollback_after_snapshot_missing`,
`site_package_already_rolled_back`,
`native_cms_writer_fence_busy`, `native_cms_writer_recovery_required`,
`site_package_rollback_conflict`, `solution_kit_rollback_failed`, and
`site_package_rollback_failed`. Unexpected values map to the engine-specific
safe failure code; raw messages are never returned.
Before owner claim these remain mapped errors. After owner claim, inability to
prove exact terminal status (including `native_cms_writer_fence_lost`) is projected
as the strict `recovery_required` DTO with the existing owner ID, never as a
synthetic terminal failure or an owner-less exception.

## Regression Tests

- Exact legacy source dispatch passes the same ID and never calls full-site.
- Exact full-site source dispatch calls `rollbackFullSiteInstall` and preserves
  its fenced lifecycle; never calls legacy.
- Missing, dry-run, rollback, mixed, malformed-marker, unknown-kind, pruned,
  already-rolled-back, and package-key-only inputs perform zero writes.
- A newer same-package successful legacy run without its own successful rollback
  cannot replace or permit the requested legacy source. An active all-noop newer
  run with byte-equal snapshots still returns
  `solution_kit_rollback_source_superseded` before rollback run/item/domain/
  settings/template/invalidation/audit writes. Exact successful rollbacks release
  `C`, then `B`, so direct dispatch can execute `C -> B -> A -> null`; failed,
  running, and recovery-required rollback owners do not release a predecessor.
  More than 512 newer all-rolled-back relations fail the bounded relation-limit
  code before owner/domain writes rather than walking unbounded history.
- Full-site lock/recovery/conflict codes remain stable and sanitized.
- Dispatcher output rejects injected actors/options/snapshots/raw errors.
- Output accepts only strict `success|failed|recovery_required`. Pre-write
  rejection creates no run. Failure before any mutation or after fully proven
  compensation returns terminal failed with truthful zero-net counters, keeps the
  source/Setup marker active, and lets the next request create a different owner.
  A late failure with any committed uncompensated/uncertain item returns recovery
  on the same running owner with `summary:null`; injected fence loss/finalization
  ambiguity follows that branch. A locked terminal reread collapses to success or
  zero-net failed rather than falsely returning recovery.
- DB race proves two exact rollback requests rely on existing engine ownership
  and cannot both mutate the source.
- Legacy coordinator proves the old latest lookup is unreachable, the exported
  lower rollback requires `sourceRunId + claimedRollbackRunId`, and template
  rollback cannot begin before the durable owner exists.
- Created/updated core resources and templates are tested against exact matching
  state, administrator edits, newer applies, missing/malformed after-state, and a
  compare-to-mutation race. Every mismatch performs zero mutation for that item,
  records a sanitized failure, stops later rollback items, and either compensates
  prior committed items to source for terminal failed or retains the same owner as
  recovery-required.
- Generic and Setup apply-side template operations round-trip strict canonical
  `afterSnapshot` through normalized template-evidence rows, including noop; one
  malformed or missing member rejects source finalization. Pre-normalized
  historical options materialize deterministic evidence under the locked source
  recheck only when they already contain complete strict per-position data;
  current aggregate/changed-only legacy rows fail closed before owner insertion.
  Retry/progress/retention then read only the normalized table; digest mismatch
  performs zero owner or domain write.
- A direct generic legacy apply with create/update/noop and a Setup apply with the
  same vector each persist one evidence row per position and cannot terminalize
  when one row is missing. A current pre-TASK-489 row carrying only
  `templateInstallSummary/templateRollbackPlan` fails before rollback owner
  insertion, proving no inferred noop or after-state fallback exists.
  Widget-template `FOR UPDATE` read/compare/delete-or-restore/revision uses one
  transaction with the rollback-owner item/invalidation receipt, and injected
  failure on either the native/revision side or receipt side leaves all unchanged.
- Combined-plan fixtures accept exactly 100 templates and reject 101, accept
  combined core-plus-template totals 511 and 512, and reject 513 before claim/run/
  item/domain/template writes. Every canonical byte cap is tested at limit and
  limit+1. `tests/unit/kits/installService.test.ts` proves claimed execution uses
  the precreated run ID, never calls `createRun`, verifies persisted receipt/current
  state before skip, retries only missing/failed positions, rejects stale/foreign
  claims without writes, emits no lower generic apply audit/finalization, and
  leaves generic apply/dry-run behavior unchanged.
- Setup tests pin the exact three-key allowlist, changed-key-only and presence-
  aware before/applied-after states, server-only package/actor active marker,
  definition digest, exact apply phase CAS, and every apply/rollback crash phase.
  Crash injection before/after each core receipt, template transaction, phase CAS,
  shell CAS, and terminal transaction resumes the same run, performs each native
  mutation at most once, and never commits template mutation/revision without the
  same-transaction `afterSnapshot` action. Crash after terminal commit/before
  response replays the same run with zero mutation. No browser ID is added.
  Rollback proves
  one relation/engine invocation and restoration only after engine success.
  Administrator drift and historical `priorShellRefs`-only/partial metadata
  preserve settings and trigger exact source compensation; terminal failed is
  allowed only after zero-net proof, otherwise the same owner remains recovery-
  required. The wrapper rejects `kitId`/missing actor and delegates to the same
  coordinator without a second restore. Successful rollback clears the active
  marker atomically; failed/recovery outcomes do not, but failed releases its
  rollback claim for a new exact owner while recovery retains the same owner.
- Every successfully mutated family persists a same-transaction outbox plan and
  invokes `applyAfterCommit` after commit. Compensations persist/apply their own
  exact plans; a terminal failed result is emitted only after all net effects are
  zero, while a later recovery-required outcome preserves every earlier durable
  plan. Noop/rejected/database-rolled-back work emits none. Cache delivery failure
  preserves the authoritative result and durable retry evidence.
- Success, failed, and resumed legacy/full-site dispatch each atomically
  terminalize with exactly one deterministic audit row and the exact safe field/
  counter set. Injected crash/audit failure cannot expose a terminal row without
  that audit; it rolls back terminalization and returns recovery-required until
  exact resume succeeds. The lower legacy audit is absent and retry cannot
  duplicate the event.
- Existing full-site unit coverage gains two bounded cases: compensation failure
  with locked proof of zero mutations or complete source restoration emits one
  failed finalization/audit, releases that owner, and a later exact retry creates
  a new owner. Partial/failed compensation, fence loss, or an unprovable
  finalization leaves the same owner running and returns recovery-required;
  retrying resumes it and never creates a second relation. A successful
  compensation whose failed finalization/audit is unprovable also remains
  recovery-required and is never relabeled failed merely because finalization
  failed.
- The serialized TASK-555 successor, not this pre-lineage leaf, must add a composite
  fixture proving uncurated sources call the engine-only export, curated active/
  pending sources delegate once, its engine callback cannot recurse, and generic
  direct-route `C -> B -> A -> null` updates lineage after each success while
  releasing a terminal failed zero-net reservation for a new retry but preserving
  the exact recovery reservation/same owner. TASK-489 pins the exports with a pure
  no-recursion dependency test now.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
set -a && source .env && set +a && bun test tests/unit/kits/solutionKitInstallRollbackDispatcher.test.ts tests/unit/kits/solutionKitRollbackInvalidation.test.ts tests/unit/setup/starterContentApplyRecovery.test.ts tests/unit/kits/fullSiteInstallService.test.ts tests/unit/kits/fullSiteLegacyLedgerDryRunTerminalization.test.ts
set -a && source .env && set +a && bun test tests/integration/kits/solutionKitExactRollbackDb.test.ts tests/security/solutionKitExactRollback.test.ts tests/unit/kits/installService.test.ts tests/unit/kits/kitInstaller.test.ts tests/unit/templates/templateInstaller.test.ts tests/unit/widgets/widgetTemplateService.test.ts tests/unit/widgets/widgetTemplateRevisionService.test.ts tests/integration/routes/starterContent.test.ts
wc -l core/services/kits/solutionKitInstallRollbackDispatcher.ts core/services/kits/legacyExactRollbackCoordinator.ts core/services/kits/solutionKitRollbackInvalidation.ts core/services/kits/legacyCombinedInstallPlan.ts core/services/setup/starterContentApplyCoordinator.ts core/services/kits/solutionKitInstallOperations.ts core/services/kits/solutionKitsInstallService.ts core/services/kits/kitInstaller.ts core/services/kits/legacyInstallRollback.ts core/services/templates/templateInstaller.ts core/services/widgets/widgetTemplateService.ts core/services/widgets/widgetTemplateRevisionService.ts core/services/setup/starterContentService.ts core/services/kits/fullSiteInstall/rollback.ts core/services/kits/fullSiteInstallTypes.ts core/services/kits/legacyInstallRunPersistence/ledgerAdapter.ts core/services/kits/legacyInstallRunPersistence/dryRunTerminalization.ts tests/unit/kits/solutionKitInstallRollbackDispatcher.test.ts tests/unit/kits/solutionKitRollbackInvalidation.test.ts tests/unit/setup/starterContentApplyRecovery.test.ts tests/integration/kits/solutionKitExactRollbackDb.test.ts tests/security/solutionKitExactRollback.test.ts tests/unit/kits/installService.test.ts tests/unit/kits/kitInstaller.test.ts tests/unit/templates/templateInstaller.test.ts tests/unit/widgets/widgetTemplateService.test.ts tests/unit/widgets/widgetTemplateRevisionService.test.ts tests/integration/routes/starterContent.test.ts tests/unit/kits/fullSiteInstallService.test.ts tests/unit/kits/fullSiteLegacyLedgerDryRunTerminalization.test.ts
git diff --check
```

Every listed production/test file must be <=1,000 lines. If any touched legacy
module is already over 1,000 physical lines, this leaf first performs a cohesive
responsibility split with stable exports and independently runnable tests. The
terminal TASK-551 split is mandatory; do not revive or append to an obsolete
oversized module.

## Documentation Updates Required

TASK-489-03-L02 documents exact-source semantics, the engine decision table,
stable failure codes, no-latest rule, full-site lifecycle delegation, retention
not-found behavior, strict server-resumable Setup/template evidence, terminal
zero-net failed versus same-owner partial/unresolved recovery semantics, durable
invalidation, atomic terminal audit, restored predecessor chains, combined 512/
template 100/byte limits, and the absence of apply/dry-run controls.
