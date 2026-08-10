# TASK-414-09-L02: Reject, Expiry, Purge, Backup, Restore, and Private Asset Cleanup
# FileName: TASK-414-09-L02-Reject-Expiry-Purge-Backup-Restore-And-Private-Asset-Cleanup.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-09
**Priority:** Critical
**Category:** Designer / Lifecycle / Backup / Private Storage
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-09-L01; TASK-414-03-L02 terminal; TASK-414-04-L02
terminal; TASK-511 terminal; TASK-551-06-L01 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Reject or expire an unpromoted Designer workspace without racing promotion,
purge only its Designer-owned rows/private objects, extend terminal TASK-511
encrypted backup with recoverable Designer state, and restore that state into
review rather than resuming provider or promotion work. Canonical resources and
ownership-transferred assets are deletion canaries and must remain untouched.


## Sub-Tasks

None; this is an executable leaf.
## Exact Ownership

This leaf is the sole writer for these new modules:

- `core/services/designer/workspaceExpiryService.ts`
- `core/services/designer/workspacePurgeService.ts`
- `core/services/designer/designerPrivateAssetCleanup.ts`
- `core/services/backups/designerBackupSection.ts`
- `core/services/backups/designerRestoreSection.ts`
- `tests/vitest/designer/designer-purge-policy.test.ts`
- `tests/vitest/backups/designer-backup-contract.test.ts`
- `tests/integration/designer/designer-reject-expiry.test.ts`
- `tests/integration/designer/designer-private-asset-cleanup.test.ts`
- `tests/unit/backups/designerBackupSection.test.ts`
- `tests/unit/backups/designerRestoreSection.test.ts`

After re-reading terminal TASK-511, it is also the only TASK-414 writer for the
small strict Designer-section registration/adoption regions in:

- `core/services/backups/backupTypes.ts`
- `core/services/backups/backupArchive.ts`
- `core/services/backups/backupImport.ts`
- `tests/unit/backups/backupArchive.test.ts`
- `tests/unit/backups/backupImport.test.ts`

TASK-511 does not currently promise a generic section registry. This leaf must
therefore add one closed, compile-time Designer extension seam in the exact files
above; it must not claim that a terminal registry already exists. The seam
exports `DESIGNER_BACKUP_SECTION_V1`, `exportDesignerBackupSection()`,
`prepareDesignerRestoreSection()`, `restoreDesignerSectionTx(tx, ...)`, and
`finalizeDesignerRestoreAfterCommit(...)`. `backupArchive.ts` invokes export;
`backupImport.ts` prepares private objects before its outer transaction, invokes
the tx helper with that transaction handle, then invokes the post-commit
finalizer. Unknown extension IDs still reject. No runtime plugin callback,
directory scan, table-name passthrough, or independently committed section is
allowed.

Keep archive/import orchestration thin by delegating all Designer selection,
normalization, FK ordering, activation rebuild, and finalization to the new
focused modules. If terminal TASK-511 paths or its outer-transaction signature
differ, update and freshly audit this contract before dispatch; do not create a
parallel backup format. Split a touched human-authored file first if the
extension would leave it above 1,000 physical lines.

Forbidden: DB schema/migrations, canonical CMS resource services/tables,
TASK-547 package files, promotion transaction/ledger, preview route/token
implementation, shared route/nav/cache integration, Media/public storage,
task indexes, and changelog files.

## Reject and Expiry Contract

Explicit rejection is permitted from `draft`, `failed`, or `ready`. A
`generating` workspace must first fence/cancel the current run and prove no
worker can complete it. `promotion_pending` cannot be rejected or expired by an
ordinary request; TASK-414-09-L03 reconciles the lease/checkpoint first.
`promoted`, `rejected`, and `expired` remain terminal.

Expiry scans a bounded keyset batch and uses TASK-551 retention helpers, but
eligibility comes from TASK-414-07-L01. Claiming reject/expiry takes the same
singleton-activation/workspace/lease lock order as promotion, verifies no live promotion lease
or current generation fence, CAS-transitions the workspace, revokes all preview
sessions, inserts a durable `assistant_designer_cleanup_jobs` row with the exact
immutable cleanup-plan digest, and records the safe audit/
tombstone in one transaction. No row or object is deleted before the claim
commits.

All durations and batch behavior import `ASSISTANT_RETENTION_POLICY_V1` from
TASK-414-03-L02. Active/saved workspaces do not auto-expire; reject/expiry/
delete sets immediate purge eligibility, processes dependency-safe keyset
batches of at most 100 with bounded retry/quarantine, and leaves only a 30-day
safe tombstone. Temporary Figma/Designer assets use the hard 24-hour class and
are cleaned immediately on abort/failure; adopted assets atomically leave it.
This leaf may not introduce another TTL, retry ceiling, or cleanup worker loop.

Purge consumes at most a fixed keyset batch of fenced
`assistant_designer_cleanup_jobs` claims. It deletes
workspace-owned staging edges/resources/revisions/artifacts/receipts/decisions/
bindings in FK-safe order or retains the minimal policy-required tombstone.
External private-object deletion occurs idempotently through the registered
Designer cleanup lifecycle participant with bounded retries; TASK-551's cache
outbox is not reused for object keys or deletion payloads. A failed object delete never
restores workspace visibility.

Every deletable asset must have exact `ownerKind = designer_workspace`, matching
    workspace ID, and no atomic promotion ownership-transfer/ledger record.
Unknown ownership, canonical Media identity, promoted mapping, or cross-
workspace reference means quarantine for operator reconciliation, not delete.
The cleanup worker lists only the dedicated Designer/private prefix in bounded
pages; it never scans Media/public storage or arbitrary buckets.

## Designer Backup Section Contract

Consume terminal TASK-511's encrypted/compressed `.cbk` v2 archive, manifest,
streaming tar/NDJSON, passphrase, confirmation, maintenance, transaction, and
audit contracts. Designer is a named strict archive section, not an unfiltered
addition to `ARCHIVE_TABLE_DESCRIPTORS`.

Register exactly one versioned extension through the closed seam this leaf adds
to terminal TASK-511's archive/import owners:

```ts
type DesignerBackupSectionV1 = Readonly<{
  schema: "coderso.backup.designer@v1";
  sectionId: "designer";
  ownerScopeDigest: string;
  recordsManifest: readonly DesignerBackupRecordGroupV1[];
  privateObjectManifest: readonly DesignerBackupObjectV1[];
  designerSiteBundleDigests: readonly string[];
  sectionDigest: string;
}>;
```

Each record group pins schema version, table/read-model owner, count, byte
count, canonical digest, FK predecessors, and stable restore order. Each object
pins opaque archive member ID, MIME, bytes, SHA-256, owning workspace/revision/
asset key, and no live storage path. Unknown extension IDs/versions/record
groups/members reject; there is no generic table-name or JSON passthrough.

When the database include is selected, the Designer section contains bounded,
owner/workspace-scoped recoverable records for the current installation in
explicit FK order:

- saved workspace metadata and safe lifecycle state;
- immutable briefs and `DesignerSiteBundleV1` revisions, including canonical
  terminal core-package bytes, strict sidecars, and all digests;
- staged resources/edges/route manifests and graph/plan digests;
- validation receipts and deterministic preview artifacts/manifests;
- safe generation/promotion decisions, idempotency result, and promotion ledger
  needed to distinguish transferred ownership;
- clean workspace-owned private inputs/assets required to reopen the draft,
  streamed as encrypted digest-verified entries.

It explicitly excludes preview-session rows/bind-secret state, active or
expired leases/fences/heartbeats, quarantine/scanner/Tika transient objects,
raw attachment/provider/tool request or response bodies, prompts outside the
normalized saved brief, provider credentials/settings, cleanup/retry claims,
temporary files, and public/canonical assets already owned elsewhere.

Every exported row/object is constrained to the requested owner scope and exact
workspace composite FKs. Cross-owner IDs/references fail export and restore;
archive ownership metadata never reassigns an object to a body-supplied owner.
Selection is bounded and streamed. List rows select no large payload; detail
payloads stream by stable keyset/ID batches with deterministic order. Manifest
counts/digests/bytes and exact section/schema version are checked before restore.
All private Designer bytes remain inside TASK-511 encryption; no plaintext
sidecar, debug dump, screenshot, or task evidence is produced.

`coderso.backup.designer@v1` is frozen after TASK-414. A successor that adds a
new persisted Designer source subtype must not silently append a V1 record
group. It owns `DesignerBackupSectionV2` with discriminator
`coderso.backup.designer@v2`, a strict V1-to-V2 read adapter, writer-default V2,
an exact additive record-group allowlist, FK/restore order, and round-trip plus
unknown-group tests. Live claims, fences, aliases containing raw request keys,
and external artifact locations remain excluded. TASK-556 is the first reserved
consumer and must include its static source binding/idempotency evidence while
restoring with no automatic generation or promotion resume.

## Restore Normalization Contract

TASK-511 validates/decrypts the entire archive. Before opening its one outer DB
restore transaction, it calls `prepareDesignerRestoreSection()` to place exact
digest-bound private Designer objects under unreachable temporary ownership.
That preparation performs no canonical/Designer DB write. Inside the already
open outer transaction, TASK-511 calls `restoreDesignerSectionTx(tx, ...)`; this
helper must use only the supplied `tx`, recursively reject unknown fields,
recompute digests, validate graph/FKs/ownership, reject excluded record types,
and perform no external I/O or nested/global-client transaction.

Every imported nonterminal workspace first enters L02's hidden `restoring`
state regardless of its eventual review state. Normal Admin/Designer lists,
preview, generation, and promotion exclude `restoring`. State normalization is
mandatory:

| Archived state | Restored state | Required evidence |
|---|---|---|
| `draft`, `ready`, `failed` | `restoring` -> same safe review state | New restore event, complete object finalize receipt, all preview sessions absent. |
| `generating` | `restoring` -> `failed` | `designer_restore_generation_review_required`; no run claim/job/provider call. |
| `promotion_pending` | `restoring` -> `reconciliation_required` | Preserve immutable intent/ledger evidence, clear lease, never run adapters. |
| `promoted` | `restoring` -> `promoted` only if canonical ledger/resource/generation restore parity is exact | Otherwise remain hidden and fail the whole restore as inconsistent; never downgrade/delete canonical data. |
| `rejected`, `expired` | `restoring` -> same terminal state/tombstone | Restore only retained policy evidence; schedule no purge implicitly. |

All preview sessions/bind-secret state, generation claims, lease owners/fences, transient
cleanup claims, and pending external calls are regenerated as absent. Restored
nonterminal work becomes visible only in Designer review/reconciliation. No
provider run, promotion resume, cache publication, private asset publication,
or cleanup starts merely because restore committed.

The one outer TASK-511 transaction writes normalized Designer rows as hidden
`restoring`, rebuilds and verifies the complete activation generation/resource/
artifact mapping plus pointer epoch/digest through L04's tx-aware restore seam,
checks canonical promotion-ledger parity, and persists the exact row in
`assistant_designer_restore_finalizations`. Canonical tables, Designer evidence,
activation mapping/pointer, and finalization intent therefore commit or roll back
together with every other TASK-511 database section.

After that outer commit, `finalizeDesignerRestoreAfterCommit()` adopts each
prepared object idempotently and verifies raw/canonical digest plus owner
binding. A bounded short finalizer transaction may update only the Designer
restore-finalization row and hidden `restoring` workspace states to their already
committed normalized review/terminal states; it may not touch canonical CMS
rows, activation mappings/pointer/epoch/digest, promotion ledgers, or run
generation/promotion. It returns exactly `complete` or
`committed_pending_finalization`. The latter is a successful database restore
with Designer workspaces still hidden, not a rollback claim; the shared worker
retries only object adoption and state reveal under a fence.

On an outer-transaction error, compensate temporary objects only after querying
the finalization identity and proving the transaction absent. Complete/pending
evidence means no compensation; unavailable or contradictory evidence means
`designer_restore_reconciliation_required` and leaves private objects
unreachable. Canonical or already adopted assets are immutable canaries.

## Implementation Pseudocode

```ts
export async function rejectDesignerWorkspace(
  command: RejectDesignerWorkspaceCommand,
  deps: DesignerLifecycleDeps
): Promise<DesignerRejectionView> {
  return deps.db.transaction(async (tx) => {
    await deps.locks.lockContentActivationSingletonTx(tx);
    const workspace = await deps.workspaces.lockOwnedTx(tx, command);
    await deps.leases.assertNoLivePromotionTx(tx, workspace.id);
    await deps.runs.fenceOrAssertIdleTx(tx, workspace, command);
    const rejected = await deps.workspaces.casRejectTx(tx, workspace, command);
    await deps.preview.revokeAllTx(tx, rejected.id, "rejected");
    const owned = await deps.assets.listExactOwnedCleanupProjectionTx(tx, rejected.id);
    await deps.cleanupJobs.enqueueTx(tx, buildDesignerCleanupPlan(rejected, owned));
    await deps.audit.recordRejectTx(tx, rejected, command.actor);
    return projectRejection(rejected);
  });
}

export async function exportDesignerBackupSection(ctx: BackupExportContext) {
  const manifest = await streamDesignerRecordsAndPrivateAssets({
    batchSize: DESIGNER_BACKUP_BATCH_SIZE,
    include: DESIGNER_BACKUP_ALLOWLIST,
    writer: ctx.encryptedArchiveWriter,
  });
  assertNoForbiddenDesignerSection(manifest);
  return manifest;
}

export async function prepareDesignerRestoreSection(
  section: ValidatedDesignerArchiveSection,
  deps: DesignerRestoreDeps
): Promise<PreparedDesignerRestoreV1> {
  const normalized = normalizeDesignerRestoreRecords(section.records);
  const objects = await deps.privateObjects.prepareUnreachable(section.assets);
  return freezePreparedDesignerRestore(normalized, objects);
}

export async function restoreDesignerSectionTx(
  tx: BackupOuterTransaction,
  prepared: PreparedDesignerRestoreV1,
  deps: DesignerRestoreTxDeps
): Promise<CommittedDesignerRestoreV1> {
  await deps.repository.restoreInFkOrderAsHiddenTx(tx, prepared.records, "restoring");
  const activation = await deps.activation.rebuildAndVerifyRestoreTx(tx, prepared.records);
  await deps.repository.assertCanonicalLedgerParityTx(tx, prepared.records, activation);
  const finalization = await deps.repository.insertRestoreFinalizationTx(tx, {
    prepared,
    activation,
  });
  return freezeCommittedDesignerRestore(prepared, activation, finalization);
}

export async function finalizeDesignerRestoreAfterCommit(
  committed: CommittedDesignerRestoreV1,
  deps: DesignerRestoreFinalizerDeps
): Promise<DesignerRestoreFinalizeResultV1> {
  try {
    const objectReceipt = await deps.privateObjects.adoptAndVerifyIdempotently(committed);
    await deps.finalizationDb.transaction(async (tx) => {
      await deps.repository.completeFinalizationOnlyTx(tx, committed, objectReceipt);
      await deps.repository.revealNormalizedDesignerStatesOnlyTx(tx, committed);
    });
    return { status: "complete", receipt: projectDesignerRestoreReceipt(committed, objectReceipt) };
  } catch (error) {
    await deps.worker.ensureRetryScheduled(committed, mapSafeRestoreFinalizeError(error));
    return { status: "committed_pending_finalization", finalizationId: committed.finalizationId };
  }
}
```

## Data Flow

```text
reject/expiry candidate
  -> singleton-activation/workspace/lease lock + CAS + preview revocation
  -> atomic cleanup outbox + tombstone
  -> bounded worker verifies exact Designer ownership
  -> Designer rows/private objects only

recoverable Designer rows/private clean assets
  -> bounded deterministic TASK-511 encrypted section
  -> full archive integrity/decrypt/strict validation
  -> private unreachable preparation
  -> private unreachable object preparation
  -> TASK-511 one outer maintenance transaction: all DB sections + hidden
     Designer state + complete activation rebuild/parity + finalization row
  -> commit
  -> private post-commit adoption + Designer-only reveal
  -> complete OR committed_pending_finalization; never auto-resume work
```

## Machine-Readable Errors

- `designer_reject_conflict`
- `designer_expiry_not_eligible`
- `designer_promotion_lease_active`
- `designer_purge_ownership_ambiguous`
- `designer_private_cleanup_failed`
- `designer_backup_invalid`
- `designer_backup_limit_exceeded`
- `designer_backup_forbidden_record`
- `designer_restore_invalid`
- `designer_restore_digest_mismatch`
- `designer_restore_graph_invalid`
- `designer_restore_canonical_mismatch`
- `designer_restore_reconciliation_required`

Routes expose only bounded safe codes. Object keys, archive paths beyond safe
section IDs, passphrases, token/lease values, raw row contents, driver/parser
messages, canonical IDs before authorization, and private bytes stay hidden.

## Security Contract

| Concern | Contract |
|---|---|
| Visibility | Reject is internal `/admin/api/designer/*`; expiry/purge are internal workers. Backup/restore remains terminal TASK-511's internal Admin surface. No public delete, archive, object, or restore endpoint is added. |
| Authentication | Reject requires Admin session and server-derived owner. Workers use registered lifecycle identities and fenced claims. Backup/restore uses TASK-511's authenticated Admin model and encrypted archive boundary. |
| RBAC | Reject requires `designer:write`. A pending-promotion decision requires `designer:promote` through reconciliation, not this path. Backup/restore requires `backups:write`; download/read remains `backups:read`. |
| CSRF | Reject and every backup/restore Admin mutation require shared CSRF. Scheduler/worker calls are non-HTTP lifecycle operations and cannot be invoked with public input. |
| Rate limits | Reject uses `admin_write`; backup/restore retains TASK-511's Admin bucket; expiry/purge/restore workers use fixed batch/concurrency/byte/time/retry budgets. Promotion lease exclusion is mandatory. |
| Validation | Strict reject-unknown lifecycle commands and archive section/manifest/record schemas; owner/workspace/FK/digest/state/version checks; encrypted byte/count limits; exact backup allowlist and exclusion guards. |
| Anti-abuse | Session + CSRF + RBAC + CAS + canonical lock order + lease/fence + bounded workers apply. No public write, nonce/HMAC, or reCAPTCHA path exists. Cleanup denies on ambiguous ownership. |

## Regression-Test Shape

Pure tests cover every reject/expiry state, lock/eligibility matrix, asset
ownership outcomes, exact backup inclusion/exclusion inventory, deterministic
section order/digests, strict unknown keys, all restore state mappings, and
forbidden token/lease/quarantine/provider/tool/credential fixtures.

Bun/PostgreSQL/storage tests cover:

- reject versus generation completion and expiry versus promotion lease under
  the canonical lock order;
- preview revocation and cleanup-outbox insert atomically with terminal CAS;
- purge fault injection at every FK group/object delete with idempotent retry;
- cross-workspace, transferred, canonical Media, and ambiguous assets never
  deleted; canonical table/object canaries remain byte-identical;
- bounded keyset expiry/purge with no N+1 and fixed query-count/column budgets;
- encrypted archive round trip for each included Designer record/artifact/asset;
- closed Designer-section registration in the exact TASK-511 archive/import
  owners, duplicate/unknown extension rejection, and proof that the importer
  calls `restoreDesignerSectionTx` with its existing outer transaction handle;
- manifest/count/hash/order tampering and every excluded record type fail before
  DB/private finalization;
- generating/promotion-pending restore maps to review-required failure with no
  token, lease, job, provider call, adapter call, cache publication, or auto-
  resume;
- canonical promoted ledger or activation generation/membership/epoch/digest
  mismatch aborts the entire TASK-511 outer transaction;
- spies prove the tx helper performs no nested/global-client transaction or
  external I/O, and the post-commit finalizer cannot mutate canonical/activation
  state;
- outer rollback permits temporary-object cleanup only after absent-commit
  proof; commit ambiguity preserves unreachable objects for reconciliation;
- exact `complete` versus `committed_pending_finalization` responses and
  postcommit private-finalize retry;
- crashes before/after each object adoption and before final review CAS keep all
  restored workspaces hidden in `restoring`, then resume idempotently without
  generation/promotion, duplicate objects, or partial visibility.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/designer/designer-purge-policy.test.ts \
  tests/vitest/backups/designer-backup-contract.test.ts
set -a && source .env && set +a && bun test \
  tests/integration/designer/designer-reject-expiry.test.ts \
  tests/integration/designer/designer-private-asset-cleanup.test.ts \
  tests/unit/backups/designerBackupSection.test.ts \
  tests/unit/backups/designerRestoreSection.test.ts \
  tests/unit/backups/backupArchive.test.ts \
  tests/unit/backups/backupImport.test.ts
git diff --check
wc -l core/services/designer/workspaceExpiryService.ts \
  core/services/designer/workspacePurgeService.ts \
  core/services/designer/designerPrivateAssetCleanup.ts \
  core/services/backups/designerBackupSection.ts \
  core/services/backups/designerRestoreSection.ts \
  core/services/backups/backupTypes.ts \
  core/services/backups/backupArchive.ts \
  core/services/backups/backupImport.ts \
  tests/vitest/designer/designer-purge-policy.test.ts \
  tests/vitest/backups/designer-backup-contract.test.ts \
  tests/integration/designer/designer-reject-expiry.test.ts \
  tests/integration/designer/designer-private-asset-cleanup.test.ts \
  tests/unit/backups/designerBackupSection.test.ts \
  tests/unit/backups/designerRestoreSection.test.ts \
  tests/unit/backups/backupArchive.test.ts \
  tests/unit/backups/backupImport.test.ts
```

## Documentation Updates Required

Provide the closure leaf with reject/expiry eligibility and retention windows,
purge/retry/operator reconciliation, exact backup include/exclude matrix,
encrypted private-asset behavior, restore state mapping, and no-auto-resume
rules. Do not edit TASK-511 docs, task indexes, or changelog 1266 here.
