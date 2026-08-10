# TASK-489-01-L01: Bounded Safe Keyset Run History and Sanitized Detail Read Model
# FileName: TASK-489-01-L01-Run-History-List-Panel.md

**Parent Subtask:** TASK-489-01
**Priority:** High
**Category:** Solution Kits / Read Model / Database / Security
**Estimated Effort:** Large
**Dependencies:** All TASK-489 parent-level start gates; TASK-547 done; complete terminal TASK-551 with the full cursor/repository/cache/active-owner evidence receipt
**Status:** ⏳ To Do
**Changelog:** 1268 (pinned; closure only)

---

## Overview

Implement one bounded keyset history query, one sanitized detail read model, the
no-mutation source-scoped legacy rollback claim primitive, and the exact Setup
active-owner/phase/evidence/finalization persistence API over the shared install
ledger. Cover all ten TASK-547 resource kinds while
ensuring browser-facing data can never contain actor identity, run options,
snapshots, rollback payloads, raw errors, or arbitrary JSON.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Production:**
`core/services/kits/solutionKitInstallHistoryTypes.ts` (new),
`core/services/kits/solutionKitInstallHistoryService.ts` (new),
terminal `core/services/kits/solutionKitInstallRunRepository.ts` for explicit
safe projections, the exact legacy rollback claim, and every exact Setup/
rollback transaction API below, new
`core/services/kits/solutionKitRollbackAudit.ts` for the strict deterministic
terminal-audit descriptor/transaction helper, new pure strict
`core/services/setup/starterContentRollbackEnvelope.ts`, and
`core/services/audit/auditService.ts` only for transaction-aware deterministic
`logAuditOnceTx` needed by exact owner finalization.

**Tests:**
`tests/vitest/kits/solutionKitInstallHistoryTypes.test.ts` (new),
`tests/vitest/setup/starterContentRollbackEnvelope.test.ts` (new),
`tests/unit/kits/solutionKitInstallHistoryService.test.ts` (new),
`tests/unit/kits/solutionKitRollbackAudit.test.ts` (new),
`tests/integration/kits/solutionKitInstallHistoryDb.test.ts` (new), and
`tests/perf/solution-kit-run-history-budgets.test.ts` (new), plus the bounded
`logAuditOnceTx` region in `tests/unit/audit/auditService.test.ts`.

No other files may be edited. In particular routes, validation schemas, Admin
clients/hooks/UI, DB schema/migrations, retention code, full-site rollback code,
task/changelog/board files, and TASK-555/TASK-556 are forbidden.
This leaf imports terminal TASK-551-06-L01's Bun-free
`buildLegacyRollbackInstallItemDigest` and
`buildLegacyTemplateStateDigest`,
`buildLegacyTemplateSourceEvidenceDigest`,
`buildLegacyTemplateRollbackProgressDigest`, and
`buildLegacyCombinedPositionMap`, and
`buildLegacyRollbackCombinedProgressDigest` plus the shared limit constants and
strict input types read-only; it does not redeclare or fork their parser,
canonicalization, or digest contract.

## Safe Types

```ts
type SafeInstallEngine = "legacy" | "full_site" | "unknown";
type SafeInstallMode = "dry_run" | "apply" | "rollback";
type SafeInstallStatus = "running" | "success" | "failed";
type SafeInstallResourceKind =
  | "content_type" | "form" | "page_template" | "listing_template"
  | "content_entry" | "listing_query" | "detail_page" | "page"
  | "menu" | "setting";
type SafeInstallOperation = "create" | "update" | "noop" | "delete" | "restore";
type SafeInstallItemStatus = "planned" | "success" | "failed" | "skipped";
type SafeRollbackIneligibleCode =
  | "solution_kit_rollback_source_superseded"
  | "solution_kit_rollback_relation_limit_exceeded";
type SafeInstallSummaryDto = Readonly<{
  total: number; success: number; failed: number; planned: number; skipped: number;
  operations: Readonly<{
    create: number; update: number; noop: number; delete: number; restore: number;
  }>;
}>;

type SafeSolutionKitRunSummaryBaseDto = Readonly<{
  id: string; packageKey: string; engine: SafeInstallEngine;
  mode: SafeInstallMode; rollbackOfRunId: string | null;
  rollbackEligible: boolean;
  rollbackIneligibleCode: SafeRollbackIneligibleCode | null;
  createdAt: string;
}>;
type SafeSolutionKitRunSummaryDto =
  | (SafeSolutionKitRunSummaryBaseDto & Readonly<{
      status: "running"; summary: null; safeErrorCode: null;
      finishedAt: null;
    }>)
  | (SafeSolutionKitRunSummaryBaseDto & Readonly<{
      status: "success"; summary: SafeInstallSummaryDto;
      safeErrorCode: null; finishedAt: string;
    }>)
  | (SafeSolutionKitRunSummaryBaseDto & Readonly<{
      status: "failed"; summary: SafeInstallSummaryDto;
      safeErrorCode: string; finishedAt: string;
    }>);
type SafeSolutionKitRunItemDto = Readonly<{
  position: number; resourceKind: SafeInstallResourceKind; resourceKey: string;
  operation: SafeInstallOperation; status: SafeInstallItemStatus;
  safeErrorCode: string | null;
}>;
type SafeSolutionKitRunDetailDto =
  | Readonly<{
      run: Extract<SafeSolutionKitRunSummaryDto, {status: "running"}>;
      items: readonly SafeSolutionKitRunItemDto[];
      itemTrace: "nonterminal"; omittedItemCount: null;
    }>
  | Readonly<{
      run: Exclude<SafeSolutionKitRunSummaryDto, {status: "running"}>;
      items: readonly SafeSolutionKitRunItemDto[];
      itemTrace: "complete" | "legacy_template_summary_only";
       omittedItemCount: number;
     }>;
type SafeSolutionKitRollbackResultBaseDto = Readonly<{
  sourceRunId: string; rollbackRunId: string; packageKey: string;
  engine: "legacy" | "full_site";
}>;
type SafeSolutionKitRollbackResultDto =
  | (SafeSolutionKitRollbackResultBaseDto & Readonly<{
      status: "success"; safeErrorCode: null; summary: SafeInstallSummaryDto;
    }>)
  | (SafeSolutionKitRollbackResultBaseDto & Readonly<{
      status: "failed"; safeErrorCode: string; summary: SafeInstallSummaryDto;
    }>)
  | (SafeSolutionKitRollbackResultBaseDto & Readonly<{
      status: "recovery_required"; safeErrorCode: string; summary: null;
    }>);
```

Parsers reject unknown DTO keys. Safe error conversion accepts only reviewed
lowercase machine codes matching `^[a-z][a-z0-9_]{0,95}$`; everything else maps
to `solution_kit_operation_failed` or `solution_kit_install_failed`. Never trim
driver text into a "safe" message.
Every terminal summary member is an integer `0..512`; status and operation
counters each sum to `total`. Contradictory persisted terminal summaries fail
closed rather than being silently recalculated from a partial projection. A
running row is parsed only through the `summary:null` branch regardless of a
legacy persisted `{}`; it never acquires synthesized zero counters.
`rollbackEligible=true` is valid only for a strictly classified
`engine:"legacy"|"full_site"`, `mode:"apply"`, `status:"success"`, non-null
`finishedAt`, null `rollbackOfRunId` source whose locked engine-specific classifier
is eligible. Every dry-run, rollback, running, failed, unknown-engine, malformed,
already-rolled-back, active-owner/recovery, superseded, or relation-overflow row must
project false. True requires `rollbackIneligibleCode=null`; the superseded or relation-
limit code requires false. Other reviewed engine-specific ineligibility may remain
false/null and may not invent a free-form reason. The UI consumes this parsed boolean
only after the same mode/status/engine matrix passes; it never treats the flag alone as
authority.
`omittedItemCount` is an integer `0..512` only for terminal detail. `complete`
requires zero omitted items. `legacy_template_summary_only` is valid only for a
strictly classified legacy run and equals `summary.total - items.length`; a
negative difference, full-site omission, or any other mismatch fails closed. No
options or snapshots are loaded to derive these fields. `nonterminal` requires a
running run, `omittedItemCount:null`, and makes no final-completeness claim about
its bounded point-in-time items.

## Query And Cursor Contract

Implementation is blocked unless the terminal TASK-551 start receipt contains the
two named successful-apply/successful-rollback relation indexes, sanitized small/
large `EXPLAIN (ANALYZE, BUFFERS)` evidence for this exact predicate, the unique
active Setup marker, and retention proof for both sides of every relation. This
leaf does not substitute an unmeasured index or add a migration.

- Input keys: `packageKey?`, `cursor?`, `limit?`.
- `packageKey`: NFC, control-free, 1..128 UTF-8 bytes. `limit` is integer
  1..100, default 25. Cursor follows terminal TASK-551's <=2,048 ASCII-byte
  wire cap.
- Cursor scope:
  `admin:solution-kit-runs:v1:<sha256(canonicalJson({packageKey: normalizedPackageKeyOrNull}))>`.
  The normalized value is a validated string or explicit `null`; `undefined` is
  never passed to canonical JSON.
  The code-owned `KeysetSpec` has exactly non-null timestamp `created_at DESC`
  and canonical UUID `id DESC`. Encode/decode/build-predicate use terminal
  TASK-551 `encodeKeysetCursor`, `decodeKeysetCursor`, and
  `PaginationCursorKeyring`; TASK-489 does not define, parse, or sign a custom
  payload. Scope mismatch remains fail closed.
- SQL order and predicate are exactly `created_at DESC, id DESC` and
  `(created_at,id) < (:createdAt,:id)` for the next page. Fetch `limit + 1`.
- History selects only fields needed to build the safe summary. `options` may be
  inspected as a SQL boolean/classification expression but is never selected as
  JSON. `actor_id` is never selected.
- For a strictly classified legacy candidate, the same statement projects
  rollback eligibility with one canonical bounded lateral classifier. It reads
  same-package `mode=apply,status=success,finished_at IS NOT NULL` rows newer than
  the candidate in `(created_at DESC,id DESC)` order with `LIMIT 513`; each row
  uses the successful-rollback relation index to project whether an exact same-
  package `mode=rollback,status=success,finished_at IS NOT NULL` points to it. If
  any bounded row is unrolled, state is `active` and the source gets
  `solution_kit_rollback_source_superseded`. If <=512 rows are all rolled back,
  state is `clear`. If all 513 sentinel rows are rolled back, state is `overflow`
  and the source gets `solution_kit_rollback_relation_limit_exceeded`; no query
  walks farther. Operation counts and snapshot equality are deliberately
  irrelevant. A successfully rolled-back `C` permits restored `B`, and successful
  rollback of `B` then permits `A`. Full-site rows keep their existing engine-
  owned eligibility rules.
- Exact-source eligibility also classifies rollback owners: a terminal successful
  owner makes that source already rolled back; one compatible running owner makes
  it in-progress/recovery-only; a TASK-489 terminal failed owner with locked
  zero-net proof does not block a new exact claim. A failed row without that proof,
  multiple running owners, or contradictory relations fails closed. Advisory
  history/detail and the locked claim use the same decision.
- Detail statement 1 reads one safe run projection by canonical UUID. Statement
  2 selects item `position,resource_type,resource_key,operation,status` and a
  safe SQL/service error classification only, ordered `position ASC,id ASC`,
  `LIMIT 513`. It never selects snapshot or rollback-action columns.
- More than 512 items, duplicate positions, unknown kind/enum, malformed safe
  field, or contradictory engine markers fails `solution_kit_run_shape_invalid`.
- `claimExactLegacyRollbackSourceTx` takes a canonical source/actor ID, obtains
  the canonical package lock and source-scoped PostgreSQL transaction advisory
  lock in one fixed order, locks the exact source row, revalidates successful
  eligible legacy apply evidence, rejects every newer successful same-package
  apply that lacks its own terminal successful rollback, checks for any existing
  rollback owner, and inserts one durable
  `running` rollback owner row. The terminal legacy apply path uses the same
  package-lock linearization and refuses to finalize success while an active
  rollback owner holds that package/source claim. The first claim wins;
  a verifiable same-source running owner is returned with its durable ID for exact
  resume. A terminal successful owner is already-rolled-back; a terminal failed
  owner is immutable and, only after its persisted zero-net proof is revalidated,
  no longer owns the claim, so this request inserts a new rollback owner. An
  incompatible/owner-less concurrent claim rejects with stable
  `solution_kit_rollback_in_progress` or
  `solution_kit_rollback_recovery_required`; a newer apply returns
  `solution_kit_rollback_source_superseded`, while a clear decision requiring more
  than 512 newer relations returns
  `solution_kit_rollback_relation_limit_exceeded`. Every rejection occurs before owner
  insertion, template/core mutation, audit, or invalidation-plan persistence and
  accepts no package-key/latest lookup.

## Exact Setup And Legacy Rollback Persistence APIs

Terminal TASK-551-06-L01's shared constants are exact and are used for both apply preflight and source
rollback parsing: `LEGACY_COMBINED_OPERATION_LIMIT=512`,
`LEGACY_TEMPLATE_OPERATION_LIMIT=100`,
`LEGACY_TEMPLATE_SEEDS_MAX_BYTES=4_194_304`,
`LEGACY_TEMPLATE_SNAPSHOT_MAX_BYTES=524_288`,
`LEGACY_TEMPLATE_ACTION_MAX_BYTES=1_049_600`,
`LEGACY_TEMPLATE_ACTIONS_MAX_BYTES=12_582_912`,
`STARTER_LIFECYCLE_ENVELOPE_MAX_BYTES=16_777_216`, and
`LEGACY_COMBINED_DIGEST_INPUT_MAX_BYTES=8_388_608`. L01 imports and may re-export
these from the predecessor pure contract module; L02 must not duplicate literals. UTF-8 sizes are measured
over canonical JSON after strict normalization. The complete core-plus-template
count is exactly normalized core-plan length plus normalized template-seed length,
including templates that later resolve to noop. It is checked once before owner
insertion or mutation; core-only and template-only checks do not substitute for
the combined bound.

The same preflight calls predecessor-owned `buildLegacyCombinedPositionMap` once.
Core local positions remain source-global `0..coreCount-1`; template local
position `t` persists as source-global `coreCount+t`. Rollback-global position is
always `total-1-sourcePosition`, so reverse template operations precede reverse
core operations. Native core item rows retain their existing local positions; all
combined proof members and normalized template evidence/progress use the returned
global positions. No L01/L02 loop computes an offset independently.

The pure `starterContentRollbackEnvelope.ts` owner exports
`buildStarterContentDefinitionDigest` and
`buildStarterContentLifecycleEnvelopeDigest`; no coordinator hashes ad hoc JSON.
The definition builder accepts the exact closed input
`{contract:"coderso.starter-content-definition@v1",packageKey,manifest,corePlan,
templateSeeds}` over server-normalized deterministic values. The lifecycle builder
accepts the complete strict envelope below, whose own contract literal supplies its
domain frame; the separately stored `envelopeDigest` is never a member of that
preimage. Both return lowercase SHA-256 over the UTF-8 canonical JSON bytes, with
recursive Unicode-code-point key sorting and no implicit prefix/wrapper/insertion-
order rule. Their known-vector tests pin one empty-template and one mixed-plan
definition plus every phase transition.

The pure envelope has contract literal `coderso.starter-content-rollback@v1`,
`active:true|false`, and
`definitionDigest = buildStarterContentDefinitionDigest(...)`, encoded as 64
lowercase hex characters. Its outer persisted `envelope_digest` is exactly
`buildStarterContentLifecycleEnvelopeDigest(envelope)`. Digest input exceeding the
combined cap is rejected before claim. Its exact apply phases are
`before_captured -> core_applying -> core_applied -> templates_applying ->
templates_applied -> shell_write_prepared -> shell_write_applied -> complete`.
It carries the sorted three-key presence-aware capture, then exact changed-key
`before/appliedAfter` arrays, at most 100 template progress/actions with canonical
`afterSnapshot`, and no actor or browser token. Each template snapshot, action,
action vector, seed vector, digest input, and complete envelope uses the exact
caps above. Unknown keys/phases, a fourth setting key, duplicate template
position/key, count 101, combined count 513, byte overflow, or missing phase-
required evidence fails strict parsing.

Terminal TASK-551-06-L01 owns the pure strict digest-input and persisted-record
types plus builders consumed by these repository APIs. L01 imports aliases only
and may re-export them without redeclaration or widening:

```ts
type StrictLegacyTemplateSourceEvidenceDigestInputV1 =
  LegacyTemplateSourceEvidenceDigestInputV1;
type StrictLegacyTemplateSourceEvidenceV1 =
  LegacyTemplateSourceEvidenceRecordV1;
type StrictLegacyTemplateRollbackProgressDigestInputV1 =
  LegacyTemplateRollbackProgressDigestInputV1;
type StrictLegacyTemplateRollbackProgressV1 =
  LegacyTemplateRollbackProgressRecordV1;
```

Source evidence uses the predecessor-owned snapshot/action caps, 1..128-byte normalized
template key, canonical UUID, exact source-run `legacyTemplatePlanDigest`, and
lowercase 64-hex evidence digest recomputed by
`buildLegacyTemplateSourceEvidenceDigest`. Successful create requires null before plus a delete
rollback action; successful update requires before/after plus a restore action;
successful noop requires byte-identical before/after plus null rollback action.
Success has null safe error. Failed/skipped have null after/action; failed alone
requires a reviewed safe code. Progress accepts only a relationally bound
`sourceStatus:"success"`. Unknown keys or cross-field mismatch fail before
persistence.

UUIDs are canonical; positions are integers `0..511`; digests are lowercase
64-hex; event keys are canonical TASK-551 keys of 1..128 UTF-8 bytes. State is
relationally constrained: `failed_no_mutation` has no rollback target/event keys,
`rollback_committed` has a target plus mutation event only, and
`source_restored` has a target plus both mutation and compensation events.
`progressDigest` is recomputed by the predecessor-owned
`buildLegacyTemplateRollbackProgressDigest`. Unknown keys or any state/key
contradiction fail closed. The same predecessor-owned
`buildLegacyTemplateStateDigest` recomputes source-after and rollback-target state
from the strict evidence row; repository APIs never accept those digest preimages
from a caller.

The terminal TASK-551 schema receipt must provide
`solution_kit_starter_apply_owners` with one row per source, typed package/actor/
phase/digest/release columns and strict envelope JSON, plus measured unique partial
`solution_kit_starter_apply_owners_active_idx(package_key,actor_id) WHERE
released_at IS NULL`. Table presence plus `released_at IS NULL`, never an
`options` predicate or run status, is active-owner authority. It must also provide
`solution_kit_legacy_template_evidence` for apply-side template source identity/
snapshots/actions, `solution_kit_legacy_rollback_progress` matching the type
above, typed template-plan and rollback-proof columns on runs, composite relation FKs,
`rollback_of_run_id ON DELETE RESTRICT`, and the unique running-rollback-per-
source index. L01 consumes those exports but owns no migration. The owner remains
unreleased through terminal response replay.
Exactly these repository exports are added; no generic metadata patch API is a
substitute:

```ts
claimOrResumeStarterContentApplyOwner(input: {
  packageKey: string; actorId: string; definitionDigest: string;
  legacyTemplatePlanCount: number; legacyTemplatePlanDigest: string;
  capturedBefore: readonly FullSiteRawSettingState[];
}): Promise<{
  claim: StarterContentApplyOwnerClaim; runId: string;
  evidenceClaim: LegacyApplyEvidenceClaim;
  envelope: StarterContentLifecycleEnvelopeV1;
}>;

claimLegacyApplyEvidenceWriter(input: {
  sourceRunId: string; packageKey: string; actorId: string;
  legacyTemplatePlanCount: number; legacyTemplatePlanDigest: string;
}): Promise<LegacyApplyEvidenceClaim>;

compareAndSetStarterContentApplyPhase(input: {
  claim: StarterContentApplyOwnerClaim;
  expectedPhase: StarterContentApplyPhase;
  expectedEnvelopeDigest: string;
  nextEnvelope: StarterContentLifecycleEnvelopeV1;
}): Promise<"advanced" | "already_advanced">;

recordLegacyTemplateSourceEvidenceTx(tx, input: {
  claim: LegacyApplyEvidenceClaim;
  setupGuard: null | Readonly<{
    claim: StarterContentApplyOwnerClaim;
    expectedPhase: "templates_applying";
    expectedEnvelopeDigest: string;
  }>;
  evidence: StrictLegacyTemplateSourceEvidenceV1;
}): Promise<{
  state: "recorded" | "already_recorded";
  sourceEvidenceId: string; sourceEvidenceDigest: string;
}>;

materializeHistoricalLegacyTemplateEvidenceTx(tx, input: {
  lockedSource: ExactLegacyRollbackSourceLock;
  sourceRunId: string;
  evidence: readonly StrictLegacyTemplateSourceEvidenceV1[];
}): Promise<readonly Readonly<{
  sourceEvidenceId: string; sourcePosition: number;
  sourceEvidenceDigest: string;
}>>;

readLegacyRollbackReplayStateTx(tx, input: {
  claim: LegacyRollbackOwnerClaim;
  sourceEvidenceId: string; sourcePosition: number;
  expectedSourceEvidenceDigest: string;
}): Promise<
  | { state: "pending"; expectedSourceAfterDigest: string }
  | { state: "rollback_committed"; progress: StrictLegacyTemplateRollbackProgressV1 }
  | { state: "source_restored"; progress: StrictLegacyTemplateRollbackProgressV1 }
  | { state: "failed_no_mutation"; progress: StrictLegacyTemplateRollbackProgressV1 }
>;

recordLegacyTemplateRollbackProgressTx(tx, input: {
  claim: LegacyRollbackOwnerClaim;
  sourceEvidenceId: string; sourcePosition: number; rollbackPosition: number;
  expectedSourceEvidenceDigest: string;
  transition:
    | "pending_to_rollback_committed"
    | "rollback_committed_to_source_restored"
    | "pending_to_failed_no_mutation";
  progress: StrictLegacyTemplateRollbackProgressV1;
  invalidationTags: readonly CacheTag[];
}): Promise<"recorded" | "already_recorded">;

materializeUntouchedLegacyRollbackNoMutationTx(tx, input: {
  claim: LegacyRollbackOwnerClaim;
  expectedCombinedOperationCount: number;
}): Promise<Readonly<{ materializedCore: number; materializedTemplates: number }>>;

buildCombinedLegacyRollbackSummaryTx(tx, input: {
  claim: LegacyRollbackOwnerClaim;
}): Promise<
  | { summary: SafeInstallSummaryDto; combinedProgressDigest: string;
      terminalState: "complete" | "zero_net" }
  | { summary: null; combinedProgressDigest: null; terminalState: "unresolved" }
>;

releaseStarterContentApplyOwnerOnRollbackTx(tx, input: {
  claim: LegacyRollbackOwnerClaim;
  sourceRunId: string; rollbackRunId: string;
  expectedEnvelopeDigest: string | null;
  terminalStatus: "success" | "failed";
}): Promise<"released" | "kept_active" | "not_applicable">;

recordSolutionKitRollbackTerminalAuditTx(tx, input: {
  sourceRunId: string; rollbackRunId: string;
  packageKey: string; engine: "legacy" | "full_site";
  terminal:
    | { status: "success"; safeErrorCode: null }
    | { status: "failed"; safeErrorCode: string };
  summary: SafeInstallSummaryDto;
}): Promise<"inserted" | "already_recorded">;

finalizeExactLegacyRollbackOwner(input: {
  claim: LegacyRollbackOwnerClaim;
  desired:
    | { status: "success"; safeErrorCode: null; setupEnvelopeDigest: string | null }
    | { status: "failed"; safeErrorCode: string; setupEnvelopeDigest: string | null };
}): Promise<{
  result: Extract<SafeSolutionKitRollbackResultDto, {status: "success" | "failed"}>;
  plan: CacheInvalidationPlan | null;
}>;

finalizeStarterContentApplyOwner(input: {
  claim: StarterContentApplyOwnerClaim;
  expectedPhase: "shell_write_applied"; expectedEnvelopeDigest: string;
  terminalAudit: DeterministicStarterApplyAuditV1;
  invalidationTags: readonly CacheTag[];
}): Promise<{runId: string; plan: CacheInvalidationPlan | null}>;

finalizeGenericLegacyTemplateApply(input: {
  claim: LegacyApplyEvidenceClaim;
  expectedTemplatePlanCount: number;
  expectedTemplatePlanDigest: string;
  coreResult: StrictLegacyCoreInstallResult;
  terminalAudit: DeterministicLegacyApplyAuditV1;
  invalidationTags: readonly CacheTag[];
}): Promise<{
  result: SolutionKitInstallResult;
  plan: CacheInvalidationPlan | null;
}>;
```

Claim runs under the canonical package lock, point/partial-index reads at most two
active marker rows, rejects a duplicate as
`solution_kit_starter_apply_recovery_required`, and creates no second source run.
When one same-package/actor/definition owner already exists, its persisted envelope
is authoritative and the retry-time capture is discarded; phase-specific current-
state reconciliation in L02 decides before-vs-applied-vs-drift.
If that owner is terminal with phase `complete`, Setup returns the same safe result
with zero core/template/settings writes. This Setup surface is intentionally
single-apply per package/actor while its normalized owner has `releasedAt:null`;
only a successful exact rollback atomically sets `releasedAt` and changes the
strict source envelope to `active:false`, after which a new Setup apply may claim
a new owner. Failed/recovery rollback changes neither authority. The envelope flag
is a strictly checked payload mirror and is never the uniqueness/query predicate.
The returned claim is an opaque server-only capability scoped to that active
package-lock callback and cannot be serialized or constructed by a route/browser.
`LegacyApplyEvidenceClaim` is an opaque server-only capability returned for both
generic and Setup legacy apply runs. Generic creation/recovery obtains it through
`claimLegacyApplyEvidenceWriter`; Setup receives the same capability with its
owner claim. Recording locks the exact running apply run, requires source/package/
actor plus typed template-plan count/digest parity, and for Setup additionally
requires the exact owner phase/digest.
Create/update evidence commits with template mutation/revision/invalidation;
noop evidence commits with its same-transaction locked current-state comparison.
Thus every new generic or Setup operation has one stable normalized row before
that source can terminalize.

`finalizeGenericLegacyTemplateApply` locks the same source, requires exact typed
plan count/digest, one unique evidence position for every expected template
operation, and no failed/skipped row for terminal success. It derives template
counters from normalized rows, combines them with the strict persisted core
result, inserts/verifies the one existing generic apply audit, and commits final
status/summary plus invalidation receipt atomically. It accepts no caller-supplied
template totals. A failed template attempt may terminalize failed only from its
exact normalized failed/skipped receipts; an interrupted or incomplete position
keeps the source nonterminal for recovery.

All CAS/progress APIs lock the exact run, require claim/package/actor/contract/
digest/phase parity, accept a byte-identical replay only, and reject stale or
contradictory state. Apply-side template evidence is a normalized row, not a
synthetic install item or options-only action, and is called with the transaction
that mutates/revisions the template. Its returned ID/digest become the only source
evidence identity accepted by rollback progress. Rollback-side
`recordLegacyTemplateRollbackProgressTx` is called with that same template
transaction too: current-state lock/compare, delete/restore, required revision,
rollback-owner item receipt, and invalidation receipt either all commit or all
roll back. The `source_restored` transition is likewise atomic with compensation
back to the source `afterSnapshot`. No caller may construct a receipt after the
template transaction.

For a pre-normalized historical legacy run only, L02 may call
`materializeHistoricalLegacyTemplateEvidenceTx` while L01's exact source/package
claim locks are held, after eligibility recheck and before owner insertion or any
domain mutation, but only after a strict parser proves a complete per-position
`StrictLegacyTemplateSourceEvidenceV1[]` including every noop and after-state.
Current pre-TASK-489 `templateInstallSummary/templateRollbackPlan` rows do not
contain that complete evidence and therefore fail
`solution_kit_template_rollback_after_snapshot_missing`; no snapshot/noop is
invented from aggregate summary data. For a genuinely complete transitional row,
one transaction installs typed plan version/count/digest on the locked source and
all deterministic evidence rows, then verifies their composite FKs before owner
insertion; partial materialization rolls back. `ExactLegacyRollbackSourceLock` is an opaque transaction-scoped
capability returned by that locked recheck and cannot be serialized or constructed
by a caller. Evidence IDs are deterministic UUIDv5 from domain
`coderso.legacy-template-evidence.v1` over `sourceRunId,sourcePosition`; insert-or-
verify accepts only byte-identical digest/action/snapshot data. Missing/invalid
after-state or any mismatch fails before owner creation. After materialization,
all retry/progress/retention reads use the normalized table and never query
options as authority.

`readLegacyRollbackReplayStateTx` returns only a strictly parsed persisted state.
For `rollback_committed`, L02 must lock and compare current state to the recorded
rollback target before skipping; for `source_restored` or `failed_no_mutation`, it
must compare to the source after-state before retry/final failure. Any mismatch is
recovery-required, not a replay. `buildCombinedLegacyRollbackSummaryTx` loads core and template
receipts itself, enforces one <=512 identity/position set, and derives all counters;
it accepts no caller-supplied totals.

`finalizeStarterContentApplyOwner` locks the same owner, verifies exact shell
phase/digest and evidence completeness, computes the terminal summary, inserts or
verifies through `logAuditOnceTx` the UUIDv5 event derived from domain
`coderso.starter-content.apply-audit.v1` plus the source run ID, persists the
deduplicated backend-specific invalidation receipt, and writes phase `complete`,
an unreleased normalized owner, envelope `active:true`, status `success`, and
`finishedAt` in one transaction. Any failure rolls back all
of those writes. L02 is the only coordinator consumer.

`finalizeExactLegacyRollbackOwner` is also one transaction. It locks source,
owner, all bounded progress receipts, and optional Setup envelope; derives the
combined summary; and calls `recordSolutionKitRollbackTerminalAuditTx` before
terminal status/finishedAt and invalidation receipt commit. Success requires every
operation durably complete and transitions a matching Setup marker
from unreleased to released plus envelope `active:true -> false`; a null Setup
digest is a verified `not_applicable`, never
a guessed marker. Failed is legal only when the locked progress proves no
`rollback_committed` mutation exists or every such mutation reached
`source_restored`. Before summary/digest construction, the same transaction calls
`materializeUntouchedLegacyRollbackNoMutationTx`: it revalidates the predecessor-
owned combined position map and inserts/verifies deterministic skipped core rollback
items plus template `failed_no_mutation` progress for every still-pending position.
Those receipts carry no mutation/invalidation key. Only then does the finalizer
recompute every component/combined digest, project compensated positions as non-
success, and derive counters over exactly the combined operation count. It leaves the source
and Setup owner unreleased and terminalizes the rollback owner with typed
`rollbackProofKind:"zero_net"` plus terminal TASK-551-06-L01's independently
recomputed canonical combined-progress digest without
reopening it. Success writes `rollbackProofKind:"complete"`. Any
unresolved progress, marker ambiguity, audit
ambiguity, or finalization uncertainty leaves the same owner running and is
projected by L02 as recovery-required with no summary. A later request may create
a new owner only after rereading a terminal failed row carrying this zero-net
proof.

## Numeric Budgets

- History: exactly one statement, <=101 decoded rows, base traversal index rows
  visited <=4*(limit+1) before separately counted bounded relation probes.
  Default p95 is <=75 ms at 10,000 runs and <=200 ms at 1,000,000 runs. The
  mandatory relation-heavy page evaluates exactly 101 candidates with up to 513
  newer applies and indexed relation probes each, visits at most 51,813 rows per
  relation arm, and has p95 <=250/750 ms on the same fixtures.
- Effective supersession: one set-based statement returning at most one row per
  candidate after at most 513 newer-apply rows and 513 indexed rollback-relation
  probes; sanitized plans use
  `solution_kit_runs_successful_apply_order_idx` and
  `solution_kit_runs_successful_rollback_relation_idx`, never a sequential scan,
  with p95 <=75/200 ms on the same small/large fixtures. The history statement
  evaluates this lateral state for at most 101 candidate rows; the write recheck
  evaluates one source.
- Setup active-owner lookup: one package/actor partial-index statement with
  `LIMIT 2`, at most two decoded normalized owner rows, zero run-options predicate
  or JSON heap-wide scan, and p95 <=25/25 ms on the exact
  10,000/1,000,000-run fixtures. Claim/CAS/finalize statements are exact owner point
  reads/writes under the package lock.
- Legacy apply/rollback preflight uses one combined operation vector: <=512 core
  plus template members and <=100 templates. It enforces the exact 4-MiB seed,
  512-KiB snapshot, 1,049,600-byte action, 12-MiB action-vector, 16-MiB envelope,
  and 8-MiB digest-input limits before owner insertion or mutation. Summary and
  safe DTO counters remain integers `0..512`.
- Detail: exactly one run-point statement plus one item `LIMIT 513` statement,
  each with an independent plan receipt and p95 ceiling: run-point <=25/50 ms and
  items-page <=75/200 ms small/large. The two-statement combined p95 remains
  <=100/250 ms; <=1 run + 513 item rows. Assert zero selected/transferred bytes from `actor_id`,
  `options`, `before_snapshot`, `after_snapshot`, and `rollback_action`.
- Capture sanitized `EXPLAIN (ANALYZE, BUFFERS)` for both fixture classes; no raw
  customer data or payload JSON enters evidence.

## Security Contract

- **Endpoint visibility:** none in this leaf; internal service only.
- **Auth/RBAC:** TASK-489-02-L01 enforces session plus `solution-kits:read`.
- **CSRF/rate limit:** GET route responsibility; no write here.
- **Validation:** strict reject-unknown input, cursor, rows, and DTO parsers.
- **Anti-abuse:** bounded page/item counts, bytes, statements, cursor scope, and
  keyset traversal; no offset or eager all-page loop.
- **Sensitive data:** prohibited columns never cross the projection boundary;
  no raw operational persistence, logs, snapshots, or telemetry.

## Implementation Pseudocode

```ts
async function listSafeInstallRuns(raw: unknown, keyring: PaginationCursorKeyring, deps = defaults) {
  const input = parseHistoryInput(raw);
  const scope = buildRunCursorScope(input.filters);
  const spec = buildRunHistoryKeysetSpec(scope);
  const after = input.cursor ? decodeKeysetCursor(input.cursor, spec, keyring) : null;
  const rows = await deps.repo.listSafeRuns({ ...input, after, take: input.limit + 1 });
  assertSafeRunRows(rows, input.limit + 1);
  return pageFromSentinel(rows, input.limit, spec, keyring, toSafeRunSummaryDto);
}

async function getSafeInstallRunDetail(runIdRaw: unknown, deps = defaults) {
  const runId = parseCanonicalUuid(runIdRaw);
  const run = await deps.repo.getSafeRun(runId);
  if (!run) throw new Error("solution_kit_install_run_not_found");
  const items = await deps.repo.listSafeItems(runId, 513);
  assertSafeItemRows(items, 512);
  const safeRun = toSafeRunSummaryDto(run);
  const trace = safeRun.status === "running"
    ? { itemTrace: "nonterminal", omittedItemCount: null }
    : deriveTerminalSafeItemTrace(safeRun, items.length);
  return parseSafeRunDetailDto({ run: safeRun, items, ...trace });
}

async function claimExactLegacyRollbackSourceTx(tx, input, deps = defaults) {
  await deps.repo.lockLegacyPackageClaimTx(tx, input.serverClassifiedPackageKey);
  await deps.repo.lockExactRollbackSourceTx(tx, input.sourceRunId);
  const source = await deps.repo.readExactRollbackSourceForUpdateTx(tx, input.sourceRunId);
  assertEqual(source.kitId, input.serverClassifiedPackageKey);
  assertEligibleLegacyApplySource(source);
  const relation = await deps.repo.classifyNewerApplyRelationsTx(tx, source.kitId, {
    createdAt: source.createdAt, id: source.id,
  });
  if (relation === "active") throw new Error("solution_kit_rollback_source_superseded");
  if (relation === "overflow") {
    throw new Error("solution_kit_rollback_relation_limit_exceeded");
  }
  const owner = await deps.repo.classifyExactRollbackOwnerTx(tx, source.id);
  if (owner.state === "success") throw new Error("solution_kit_already_rolled_back");
  if (owner.state === "running") return deps.repo.resumeExactRollbackOwnerTx(tx, owner, input);
  if (owner.state === "failed") assertLockedZeroNetTerminalProof(owner);
  const templateEvidence = await deps.repo.loadOrMaterializeStrictTemplateEvidenceTx(
    tx, source, input.historicalEvidenceCandidate,
  ); // normalized deterministic rows before owner insert; no options authority after
  return deps.repo.insertClaimedRollbackOwnerTx(tx, source, input.actorId, templateEvidence);
}

async function finalizeStarterContentApplyOwner(input, deps = defaults) {
  const committed = await deps.db.transaction(async tx => {
    const owner = await deps.repo.lockExactStarterApplyOwnerTx(tx, input);
    assertExactShellAppliedPhaseAndEvidence(owner, input.expectedEnvelopeDigest);
    const summary = await deps.repo.buildExactRunSummaryTx(tx, owner.id);
    const invalidation = deps.cache.createTransactionInvalidationCollector(tx, owner.id);
    invalidation.add(input.invalidationTags);
    const plan = await invalidation.persistForOuterCommitTx(tx);
    await deps.audit.logAuditOnceTx(tx, input.terminalAudit.withSummary(summary));
    await deps.repo.writeStarterApplyTerminalTx(tx, owner, summary, "complete");
    return { runId: owner.id, plan };
  });
  return committed;
}

async function finalizeExactLegacyRollbackOwner(input, deps = defaults) {
  return deps.db.transaction(async tx => {
    const locked = await deps.repo.lockExactRollbackGraphTx(tx, input.claim);
    if (input.desired.status === "failed") {
      assertNoUncompensatedCommittedMutation(locked);
      await materializeUntouchedLegacyRollbackNoMutationTx(tx, {
        claim: input.claim,
        expectedCombinedOperationCount: locked.combinedOperationCount,
      });
    }
    const proof = await buildCombinedLegacyRollbackSummaryTx(tx, {
      claim: input.claim,
    });
    if (proof.terminalState === "unresolved") {
      throw new Error("solution_kit_rollback_recovery_required");
    }
    if (input.desired.status === "failed") assert(proof.terminalState === "zero_net");
    else assert(proof.terminalState === "complete");
    const { summary, combinedProgressDigest } = proof;
    await releaseStarterContentApplyOwnerOnRollbackTx(tx, {
      ...input, terminalStatus: input.desired.status,
    });
    await recordSolutionKitRollbackTerminalAuditTx(tx, {
      ...terminalAuditIdentityFields(locked), terminal: input.desired, summary,
    });
    const plan = await deps.repo.writeRollbackTerminalAndInvalidationTx(
      tx, locked, input.desired, summary, combinedProgressDigest
    );
    return { result: toTerminalSafeRollbackResult(locked, input.desired, summary), plan };
  });
}
```

**Data flow:** strict filters -> scoped cursor -> explicit SQL projection ->
row-shape guard -> safe DTO parser -> route/client. Detail follows the same
projection boundary and never loads recovery JSON. Setup persistence follows
package lock -> unique active owner -> exact envelope digest/phase CAS -> same-tx
template evidence -> atomic terminal status/audit/invalidation receipt -> returned
post-commit plan for L02 to await. Rollback persistence follows strict combined
preflight -> exact owner -> same-tx resource/revision/receipt progress -> locked
safe replay or compensation -> combined summary -> Setup-marker transition plus
terminal TASK-551 combined-progress digest -> audit/status/invalidation in one
transaction.

**Error handling:** invalid input/cursor -> `solution_kit_runs_query_invalid`;
terminal cursor expiry or retired signing key ->
`solution_kit_runs_cursor_expired`; missing run ->
`solution_kit_install_run_not_found`; corrupt/oversized data ->
`solution_kit_run_shape_invalid`; unexpected DB error ->
`solution_kit_history_read_failed`. Setup duplicate/stale/contradictory owner or
phase evidence -> `solution_kit_starter_apply_recovery_required`; no terminal or
audit partial write survives. Relation sentinel overflow ->
`solution_kit_rollback_relation_limit_exceeded`. Combined count/template count or
canonical byte overflow before apply -> `solution_kit_plan_limit_exceeded`;
persisted overflow/corruption on rollback -> `solution_kit_run_shape_invalid`.
Unresolved rollback progress/finalization remains a running owner and maps through
L02 to recovery-required. All codes are stable and sanitized.

## Regression Tests

- Round-trip strict DTOs and reject every prohibited/unknown key recursively.
- Prove all ten resource kinds and every closed mode/status/operation.
- Pin default/max limits, package-bound/all-runs cursor scopes, no gaps/duplicates
  across tied timestamps, stale/malformed/cross-filter cursor rejection, and
  terminal TASK-551 current/previous key behavior.
- Query-spy asserts explicit columns, exact order, `LIMIT + 1`, statement counts,
  exact newer-unrolled-successful-apply relation predicate, both TASK-551 partial
  indexes, relation `LIMIT 513`, one outward state row, and zero prohibited-column
  transfer.
- Eligibility fixtures reject `rollbackEligible:true` for every dry-run, rollback,
  running, failed, unknown-engine, already-rolled-back, active-owner/recovery,
  superseded, and relation-overflow row; only a supported terminal successful apply
  with null `rollbackOfRunId` and an eligible locked classifier may parse true.
- Budget parity byte-matches TASK-551-01-L02's companion registry, including the
  active-owner lookup's exact <=25/25 ms small/large ceilings; either scale drifting
  from the predecessor receipt fails.
- An older legacy source becomes ineligible after a newer successful legacy apply
  even when the newer run is entirely `noop` and every before/after snapshot is
  byte-equal.
  Direct claim returns `solution_kit_rollback_source_superseded` with zero new
  run/item/audit/invalidation/domain writes; concurrent apply terminalization and
  claim cannot both win the package linearization point.
- Seed `A`, then `B`, then `C`: active `C` supersedes `B/A`; terminal successful
  rollback of `C` makes `B` eligible but not `A`; terminal successful rollback of
  `B` makes `A` eligible. Failed/running/recovery rollback rows do not release
  supersession, and a corrupt success with null `finishedAt` fails shape/release.
  The advisory list/detail projection and locked claim return the same decision in
  each phase.
- Relation fixtures pin 0/1/511/512/513 newer applies. Up to 512 all-successfully-
  rolled-back relations clear eligibility; any unrolled relation is superseded;
  513 all-rolled-back rows produce the explicit limit code with zero owner/domain
  writes and no 514th probe. History and direct claim agree.
- DB fixtures cover empty, 1, 25, 26, 100, 101, 512, and 513 item/run edges.
- Detail derives both terminal item-trace variants and bounded omitted counts from
  safe summary/item counts; running detail uses only
  `itemTrace:"nonterminal", omittedItemCount:null`. Running history/detail never
  renders or serializes synthesized zero counters. Full-site omission,
  negative/overflow differences, or any attempt to read options/snapshots fails.
- Retention-created missing source remains not-found; this leaf does not bypass
  or reconstruct TASK-551 retention.
- Two-connection claim race creates one rollback owner before any mutation;
  repeat and retained-running owner return stable conflict/recovery states. A
  terminal failed owner with locked zero-net proof is never reopened: the next
  exact request creates one new owner ID. A failed row without that proof is
  recovery-required and cannot release the claim.
- Retention overlap proves a running rollback owner pins itself, its exact source
  run, every source core item, normalized template-evidence row, historical source
  classification/options only where still required, Setup envelope, template
  after-state, and every newer-successful-apply/successful-rollback relation until
  finalization/recovery is terminal; the pruner locks/rechecks and skips the
  complete active graph.
- Setup persistence tests prove one package/actor active marker under concurrent
  claims, different actors remain distinct, bounded duplicate detection, exact
  phase/digest CAS, byte-identical replay, stale-phase rejection, and one template
  transaction rolling back both native mutation/revision and `afterSnapshot`
  evidence on either-side failure. Template rollback and compensation each prove
  current-state compare, mutation, required revision, rollback-owner item receipt,
  and invalidation receipt commit together or all roll back. Safe replay accepts
  only exact persisted receipt/current-state parity.
- Schema-adoption tests prove every active-owner/evidence/progress/retry-authority
  query uses normalized columns/tables and named indexes, never `options->`, `@>`,
  `jsonb_path_*`, or caller-supplied terminal proof. Composite-FK fixtures reject
  owner source/package/actor mismatch and progress linked to another rollback or
  evidence row; source deletion is blocked while a rollback relation exists.
  Terminal failed retry requires typed `zero_net` proof plus exact recomputation
  through TASK-551's combined-progress helper; deleting/changing a member or
  substituting an arbitrary valid 64-hex digest makes the source recovery-required
  without a new owner. The finalizer accepts no caller-supplied proof digest.
- Budget tests accept template counts 0/100 and reject 101, accept combined
  core-plus-template counts 0/511/512 and reject 513 before owner/run/domain writes.
  Position fixtures pin empty, core-only, template-only, and mixed 512-member
  maps, exact core/template source offsets, exact reverse rollback order, and no
  duplicate/non-contiguous global position.
  The zero-total case finalizes with the predecessor's exact empty-members digest,
  a zero summary, and byte-equal retention recomputation. Tests also cover every
  exact byte cap at boundary plus one byte. Safe DTO/summary parsers
  still reject 513 and are not widened.
- Terminalization/audit/invalidation fault
  injection proves one atomic commit or no terminal change, response-loss replay
  returns the same terminal run with zero mutation, and only successful exact
  rollback releases the Setup marker. Failed requires zero committed rollback
  mutations or full source-state compensation, releases only its rollback claim,
  and allows a new owner on exact retry; any partial/unresolved mutation keeps the
  same owner running with no summary or terminal audit.
- Failure before the first rollback member is tested for both zero-member and full
  512-member plans: the failed finalizer atomically materializes every deterministic
  no-mutation receipt before digest/summary, or commits none. Faults after any
  materialization insert leave no partial receipt because owner proof/audit/status
  share that transaction.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/kits/solutionKitInstallHistoryTypes.test.ts tests/vitest/kits/legacyRollbackProgressDigest.test.ts
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/setup/starterContentRollbackEnvelope.test.ts
set -a && source .env && set +a && bun test tests/unit/kits/solutionKitInstallHistoryService.test.ts tests/unit/kits/solutionKitRollbackAudit.test.ts tests/integration/kits/solutionKitInstallHistoryDb.test.ts tests/integration/server/task551AppendHeavyRetention.test.ts tests/perf/solution-kit-run-history-budgets.test.ts tests/unit/audit/auditService.test.ts
wc -l core/services/kits/solutionKitInstallHistoryTypes.ts core/services/kits/solutionKitInstallHistoryService.ts core/services/kits/solutionKitInstallRunRepository.ts core/services/kits/solutionKitRollbackAudit.ts core/services/setup/starterContentRollbackEnvelope.ts core/services/audit/auditService.ts tests/vitest/kits/solutionKitInstallHistoryTypes.test.ts tests/vitest/setup/starterContentRollbackEnvelope.test.ts tests/unit/kits/solutionKitInstallHistoryService.test.ts tests/unit/kits/solutionKitRollbackAudit.test.ts tests/integration/kits/solutionKitInstallHistoryDb.test.ts tests/perf/solution-kit-run-history-budgets.test.ts tests/unit/audit/auditService.test.ts
git diff --check
```

Every listed production/test file must be <=1,000 physical lines. DB tests are
blocked, not skipped silently, when `DATABASE_URL` is unavailable.

## Documentation Updates Required

TASK-489-03-L02 documents safe DTOs, package/all-runs cursor scopes, budgets, all ten kinds,
retention ownership, and the explicit non-exposure list in `_docs/CMS_API.md`,
`_docs/SOLUTION_KITS.md`, and developer testing/runtime-smoke docs.
