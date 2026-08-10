# TASK-555-06-L01: Installed State Query and Bounded Validation Service
# FileName: TASK-555-06-L01-Installed-State-Query-And-Bounded-Validation-Service.md

**Parent Subtask:** TASK-555-06
**Priority:** High
**Category:** Reliability / Read Model / Database
**Estimated Effort:** Large
**Status:** ⏳ To Do
**Dependencies:** landed TASK-555-02-L01 plus terminal TASK-551-03-L03,
TASK-551-05-L01, TASK-551-06-L01, and TASK-551-08 receipts. TASK-551 supplies the
base TASK-489 Solution Kit anchor/evidence policy only. This leaf is its serialized
post-migration successor for curated active/pending/transitive predecessor retention.

---

## Overview

Add the typed DB-authoritative curated lineage/reservation owner, then derive bounded
installed-state and validation projections from its active head plus exact ledger
evidence before any route or mutation consumes them. Also land the only explicit
historical FormaDom reconciliation command and extend the landed Solution Kit pruner so
it cannot sever a curated lineage after this migration exists. The repository also
enforces resulting predecessor caps before preview/apply claim and consumes TASK-489's
landed transaction-aware `logAuditOnceTx` for reconciliation without adding a receipt
column.

## Sub-Tasks

None; this is an executable leaf.

## Scope and Exact Single-Writer Files

Own the only lineage schema/repository plus bounded installed-state lookup and
validation before routes exist. Sole writer:

- new `core/db/tables/curatedStarters.ts` and only its re-export line in
  `core/db/schema.ts`;
- the next live `core/db/migrations/*_curated_starter_lineages.sql`, matching
  `meta/*_snapshot.json`, and exact append to `meta/_journal.json`, allocated only
  after rereading the terminal journal;
- new `core/services/kits/curatedStarters/lineageRepository.ts` and
  `lineageTypes.ts`;
- new `core/services/kits/curatedStarters/lineageReconciliationService.ts`;
- `core/services/kits/curatedStarters/installedStateRepository.ts`,
  `installedStateService.ts`, and `validationService.ts`;
- landed `core/services/kits/solutionKitRetentionService.ts` only as the serialized
  successor that adds curated lineage roots after the new table/migration is present;
- new `scripts/kits/reconcile-curated-starter-lineage.ts` (fixed internal FormaDom
  reconciliation command; no route or caller-supplied package identity);
- `tests/vitest/kits/curated-starter-lineage-schema.test.ts`,
  `tests/unit/kits/curatedStarterInstalledState.test.ts`,
  `tests/unit/kits/curatedStarterLineageReconciliation.test.ts`,
  `tests/integration/kits/curatedStarterLineageDb.test.ts`,
  `tests/integration/kits/curatedStarterInstalledStateDb.test.ts`,
  `tests/integration/kits/curatedStarterRetentionDb.test.ts`,
  `tests/perf/curated-starter-lineage-budgets.test.ts`, and
  `tests/perf/curated-starter-retention-budgets.test.ts`.

No later TASK-555 leaf edits schema/migration files or reimplements head selection.
Terminal TASK-489's `core/services/audit/auditService.ts` is a read-only dependency;
this leaf calls its landed `logAuditOnceTx` and does not create another audit helper.

## Forbidden Paths

TASK-551-owned repository/schema/migrations/retention files other than the exact
landed `solutionKitRetentionService.ts` successor region named above, routes/Admin/Setup,
artifacts, all forbidden task families/indexes/changelogs/workflows/smokes/root/TMP.
The tracked HEAD-identical TASK-555 workflow is read-only. Do not edit TASK-551 task
contracts or hand curated lineage ownership back to its pre-migration implementation.

## Security Contract

No endpoint. Preview ownership remains actor-bound elsewhere; installed status,
validation, and rollback source resolution are administrator-wide under route RBAC
and do not filter by installer actor. Exact bounded projections only; no unbounded list,
snapshot transfer, secrets, form submissions, SQL, or driver text. No public anti-abuse
mechanism applies. Route RBAC/CSRF/rate comes later.

## Implementation Pseudocode

```ts
type CuratedStarterLineageRowV1 = Readonly<{
  starterId: CuratedStarterId;
  version: number;
  activeHeadRunId: string | null;
  pendingOperation: "apply" | "rollback" | null;
  pendingReservationId: string | null;
  pendingPreviewRunId: string | null;
  pendingRequestedRunId: string | null;
  pendingEngineRunId: string | null;
  pendingSourceRunId: string | null;
  pendingPredecessorRunId: string | null;
  leaseToken: string | null;
  leaseFence: number | null;
  leaseExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export async function assertResultingCuratedLineageLimitsTx(
  tx: CuratedStarterLineageTx,
  lockedRows: readonly CuratedStarterLineageRowV1[],
  starterId: CuratedStarterId,
  input: Readonly<{ appendSuccessor: true }>,
): Promise<void> {
  assertExactlySevenRowsInStarterOrder(lockedRows);
  const closure = await readAllCuratedPredecessorClosuresSetBasedTx(tx, lockedRows, {
    perStarterLimit: 512,
    aggregateLimit: 3_584,
    includeProposedSuccessorFor: starterId,
  });
  if (!closure.complete || closure.resultingDepthByStarter[starterId] > 512 ||
      closure.resultingDistinctRunCount > 3_584) {
    throw code("curated_starter_lineage_limit_exceeded");
  }
}

const lineage = await repo.getLineageByStarterId(starterId); // PK point read
if (!lineage) return projectUnknown("curated_starter_lineage_missing");
if (lineage.pendingOperation) return projectRecoveringOrUnknown(lineage);
if (!lineage.activeHeadRunId) return projectNotInstalled();
const head = await repo.getVerifiedHeadRun(lineage.activeHeadRunId);
return projectInstalledStatus(lineage, head, await validateOwnersBounded(head));

export async function validateCuratedStarterBounded(
  source: CuratedStarterSourceRun,
): Promise<CuratedStarterValidationReceiptV1> {
  return projectBoundedValidationReceipt(await validateOwnersBounded(source));
}
```

## Historical FormaDom Reconciliation

Status GET remains strictly read-only. Historical TASK-547 evidence is adopted only by
the explicit internal command:

```bash
bun scripts/kits/reconcile-curated-starter-lineage.ts --starter-id formadom-studio
```

The CLI accepts exactly that one fixed enum argument, no run ID, package key,
fingerprint, path, force/latest flag, or provider input. It calls only
`reconcileHistoricalFormaDomLineage()` from
`lineageReconciliationService.ts`. The service acquires the landed current native CMS
writer fence, opens one transaction, locks the `formadom-studio` lineage row, and
requires idle state. It selects at most two candidates with exact package key
`formadom-studio`, exact terminal TASK-547 fingerprint
`418691434dcb4bc8044bad3789a031a59e71e8fb3783503522e1b30554f0a470`, successful
full-site apply markers, complete bounded item evidence, and no successful rollback.
Zero candidates is `curated_starter_reconciliation_candidate_not_found`; two is
`curated_starter_reconciliation_ambiguous`. Created-at order is never a tie-breaker.

Exactly one candidate is rechecked after locks are held, including current writer
marker absence, package/fingerprint, status, rollback state, complete item positions,
and provider kind. With a null head, the same transaction installs that exact candidate
as the active head at the next positive lineage version and calls the landed
`logAuditOnceTx` before commit. The deterministic audit UUID uses domain
`coderso.curated-starter.formadom-reconciliation-audit.v1` and canonical exact-order
`{starterId,sourceRunId,packageFingerprint}`. Its safe event is action
`solution_kits.curated_starter_lineage_reconcile`, target type
`curated_starter_lineage`, target ID `formadom-studio`, `actorId:null`, and metadata
containing only those three identity fields plus the fixed `releaseDescriptorDigest`.
There is no lineage receipt column or options patch. If the row already points to that
candidate, replay point-reads and verifies the exact audit ID/action/target/metadata
digest through `logAuditOnceTx`; only matching head plus matching audit is an idempotent
no-op. A different head/audit identity, pending reservation, changed candidate, missing
evidence, or current writer race fails closed with zero lineage/run/item mutation. The
command never rewrites the historical run/options/items, and status never invokes it
implicitly.

Candidate discovery is one set-based statement, not a latest-run loop. The migration
adds exactly:

```sql
CREATE INDEX curated_starter_formadom_candidate_idx
ON solution_kit_install_runs (kit_id, ((options ->> 'packageFingerprint')), id)
WHERE mode = 'apply' AND status = 'success' AND finished_at IS NOT NULL
  AND options ->> 'fullSitePackage' = 'true';
```

The query binds the fixed package key/fingerprint,
orders only by `id` for deterministic evidence, takes `LIMIT 2`, anti-joins successful
rollback through terminal `solution_kit_runs_successful_rollback_relation_idx`, and
aggregates complete ordered items through
`solution_kit_install_items_run_position_idx`. Ordering never chooses a winner: two
eligible rows remain ambiguous.

The statement returns at most two aggregate candidate rows, visits at most three
candidate-index entries, performs at most two indexed rollback probes, and scans at
most `2 * 513 = 1_026` item rows including each sentinel. On 10,000-run/100,000-item
and 1,000,000-run/10,000,000-item fixtures with at least 10,000 same-package wrong-
fingerprint decoys, p95 is `<=25 ms`/`<=100 ms` and shared hit+read blocks are
`<=64`/`<=256`. Sanitized `EXPLAIN (ANALYZE, BUFFERS)` must name all three indexes,
show no run/item sequential scan, and prove the bound before reconciliation ships.

## Pre-Claim Lineage Limit

Preview invokes the same bounded closure reader in inspection mode before persisting a
dry run. Apply is authoritative: while the provider writer fence is held, its claim
transaction locks all seven lineage rows in ascending `starter_id`, calls
`assertResultingCuratedLineageLimitsTx`, and only then may claim preview, insert/verify
the requested run, or reserve lineage. The hypothetical successor counts toward both
limits. Depth 511 may become 512; depth 512, aggregate 3,584, a gap, cycle, duplicate
cross-starter owner, or malformed context rejects the next successor as
`curated_starter_lineage_limit_exceeded` with zero write. Stable all-row lock order
serializes simultaneous claims for different starters.

## Serialized Retention Successor

After the migration lands, `solutionKitRetentionService.ts` must compose TASK-551's
base TASK-489 anchors with curated roots from all seven locked lineage rows. The exact
additional roots are every non-null active head plus pending preview, requested,
engine, source, and predecessor run. From each active/pending source/predecessor root,
the service follows strict `supersedesRunId` links transitively with
`CURATED_STARTER_RETENTION_CHAIN_LIMIT = 512` per starter and at most 3,584 distinct
curated chain runs overall. It also retains every item for each retained run. A missing
link, malformed context, duplicate ownership, cycle, depth 513, or aggregate overflow
returns `solution_kit_retention_recovery_required` and deletes nothing; there is no
unbounded walk or partial-chain pruning.

Candidate selection remains bounded by terminal TASK-551 policy. Before deleting a
batch, the same transaction acquires the current writer fence, locks/reloads all seven
lineage rows and candidate run rows, rebuilds the bounded root closure, and proves the
candidate set is still disjoint. A lineage/reservation/version change restarts or
rejects the batch; it never uses a stale preflight root set. Child items delete only for
verified non-root candidate runs, then parent runs delete in TASK-551 order. Dry-run
performs the same bounded closure and candidate read but no destructive lock/delete.
`ON DELETE RESTRICT` remains a final DB guard, not the primary retention algorithm.
TASK-551 remains authoritative for pre-lineage TASK-489 evidence; this successor is
authoritative for all curated evidence from migration onward, with no later handback.

The migration inserts exactly the seven registry IDs once; every fresh/upgraded DB has
one and only one row per starter before product routes start. The table has primary
key `starter_id`, a named exact seven-ID registry check, positive `version`, nullable active head, and one exact pending
reservation shape. Named checks require all pending fields null when
idle. Apply requires reservation/preview/requested-run/lease fields, no engine/source,
and stores the expected predecessor, which is nullable for a first install. Rollback
requires reservation/source/lease fields, requires preview/requested-run null, stores
the source predecessor with null allowed, and permits `pending_engine_run_id` only
after its exact TASK-489 relation is verified. Positive `lease_fence` is derived from
the locked positive row version so every new reservation is monotonic even though
idle clears lease fields. Unique partial indexes protect non-null active, requested,
and engine run IDs. All non-null run references use `ON DELETE RESTRICT`, so retention
cannot silently sever an active/pending relation.

## Migration Deployment Contract

The SQL migration is one transaction and uses no `CREATE INDEX CONCURRENTLY`. It takes
`ACCESS EXCLUSIVE` only on the newly created `curated_starter_lineages` relation and its
new indexes. Existing `solution_kit_install_runs` takes `SHARE ROW EXCLUSIVE` only for
FK add/validation and `SHARE` for the ordinary historical-candidate index build (reads
continue, writes wait); no stronger existing-table lock is allowed. It takes no lock on
native CMS resource tables. The migration performs no existing-table heap rewrite, no row backfill,
and no volatile default: work is the bounded run-index scan plus exactly seven seed
inserts. Set `lock_timeout` to `1_000 ms`; on the representative 100,000-run fixture the
transaction target is `<=2 s`, and on 1,000,000 runs it is `<=10 s`. A timeout aborts the
whole migration before application deployment; it is not retried while serving writes.

Deploy order is schema SQL + snapshot + journal -> migration completion on every
database -> compatible application -> optional fixed FormaDom reconciliation command ->
API/runtime smoke. Docker migration-before-server startup enforces this order. A failed
migration transaction leaves no table/index/seed. Before any lineage row differs from
its seven-row null-head seed and before the reconciliation audit exists, rollback may
redeploy the prior application and transactionally drop the candidate index/table in
reverse dependency order. After any head, pending reservation, version advance, or
reconciliation audit exists, destructive down migration is forbidden; retain evidence,
deploy a forward-compatible fix, and rerun bounded reconciliation/validation.

`lineageRepository` exposes tx-requiring reserve/finalize/recover functions; it never
opens its own transaction inside a provider fence. Apply reservation verifies the
expected active head/version and records exact predecessor. Rollback reservation
requires `pending_source_run_id === active_head_run_id` and stores that source's exact
predecessor before TASK-489. Lease expiry permits recovery inspection, not mutation
takeover; an existing requested/engine relation is resumed. Finalization CASes
`version + lease_fence + reservation_id`, advances the exact head, and clears every
pending field atomically with the source run's terminal metadata and invalidation
receipt. Requested-owner apply success uses that finalization inside the provider's
existing terminal transaction. Apply failure may leave the head at its predecessor and
clear pending fields only through L02's transaction callback after exact zero-net proof;
otherwise repository state remains pending/reconciliation-required. TASK-489 terminal
rollback failed carries its repaired zero-net proof, so the rollback settlement CAS
keeps the head and clears pending source/engine fields; recovery-required keeps the same
reservation/owner. No generic `clearReservation` API exists.

Each successful apply stores `supersedesRunId` and a strict managed-lineage item set;
each successful curated rollback records the exact restored predecessor. Malformed
table/run mismatch, gap, cycle, stale reservation, or inconsistent rollback transition
is `unknown`. Existing exact TASK-547 evidence with an initialized null-head lineage
row may be reported as a reconciliation candidate, but only the explicit command above
can adopt it. Status GET never writes or silently adopts it by recency.

Starter -> one lineage point read -> exact head run/options plus bounded ordered items
-> current owner point/batch reads -> strict status/receipt DTO. Terminal TASK-547 legacy
evidence is accepted only for exact package key plus fingerprint
`418691434dcb4bc8044bad3789a031a59e71e8fb3783503522e1b30554f0a470`.
Ambiguous/missing/malformed evidence is `unknown`, never adopted.

## Error Handling

An initialized row with null head is safely not installed unless the read-only
projection reports exact historical reconciliation availability; a missing row or
ambiguous/malformed lineage is unknown. Reconciliation candidate absence/ambiguity,
audit-identity mismatch, writer conflict, and retention root recovery use only the
stable codes named above. Resulting depth/aggregate/gap/cycle/duplicate-owner failure is
`curated_starter_lineage_limit_exceeded`; DB failures map to sanitized stable codes and
never expose SQL/snapshots.

## Testing Requirements

Test exact seven-row migration seed/idempotency, no/single/ambiguous/rolled-back
evidence, exact legacy fingerprint, at least three successive reapplies, active-head
succession, rollback-to-predecessor/not-installed,
branch/gap/cycle/stale-head rejection, apply/rollback reservation races, lease/fence
recovery, first-install/null-predecessor apply and rollback, rollback with no wrapper
requested run, malformed exact pending shapes, FK/check/partial-unique constraints,
validation caps, no snapshot response, and sanitized DB errors. Proactive claim tests
pin 511->512 success, 512->513 rejection, aggregate 3,583->3,584 success,
3,584->3,585 rejection, cross-starter claim serialization, the exact stable code, and
zero preview-claim/run/reservation write on every rejected closure.

Reconciliation tests invoke only the fixed command, prove zero/one/two candidates,
same-candidate head+audit idempotency, audit conflict rollback, no receipt column,
different existing head, pending reservation, current writer race, changed fingerprint/
items, successful rollback exclusion, and zero status-GET writes. Head adoption and
`logAuditOnceTx` are crash-tested as one transaction. Retention tests preserve active/
pending roots and every A/B/C predecessor
item, prune only old unrelated runs, lock/recheck against concurrent head movement, and
fail with zero delete for missing links, cycles, depth 513, or aggregate overflow.

Pin these budgets with sanitized `EXPLAIN (ANALYZE, BUFFERS)` against 7 lineage rows,
100,000 unrelated install runs, and 1,000,000 unrelated items: head lookup is one PK
index query returning/scanning at most one lineage row, at most 8 shared-hit/read
blocks, and <=25 ms; source run is one PK index query with the same row/block/time
budget; ordered item read uses `solution_kit_install_items_run_position_idx`, returns
at most 512 rows, scans at most 513 rows, uses at most 96 shared-hit/read blocks, and
finishes <=50 ms. Installed-state projection executes at most 4 SQL statements before
owner validation, independent of total ledger cardinality. A seq scan of the large
run/item fixture, missing index node, budget overflow, or unbounded predecessor walk
fails the gate.

Complete owner validation is set-based, never one query per item. It groups the at-most
512 exact persisted owner IDs by the ten resource kinds and issues at most ten non-empty
base-owner statements (`id = ANY($1)` or the settings-owner `key = ANY($1)`) plus at
most three child statements for form fields, form actions, and menu items: 13 total and therefore 17 total including the four
lineage/run/item statements above. Base statements return at most 512 rows in aggregate.
With `F <= 256` forms and `M <= 256` menus, child sentinel budgets are exactly
`F * (100 + 1)` fields, `F * (256 + 1)` actions, and `M * (256 + 1)` menu items; any
parent overflow fails validation rather than truncating. Queries select only each
owner-normalized equality projection and use owner PKs/the settings key index plus
`form_fields_order_idx`, `form_actions_order_idx`, and `menu_items_order_idx`.

Sanitized owner-validation `EXPLAIN (ANALYZE, BUFFERS)` runs every non-empty branch on
the real FormaDom fixture and a maximum 512-resource fixture embedded in large unrelated
owner tables. It must name the exact PK/child indexes, perform zero per-item statement
dispatch and no large owner/child sequential scan, stay within the row formulas above,
use at most `512` shared hit+read blocks for base owners and `4_096` for all child reads,
and complete the whole validation at p95 `<=75 ms` small / `<=300 ms` large. Missing,
duplicate, or extra owner rows fail closed; query count and latency cannot grow with
unrelated table cardinality.

The retention perf fixture additionally uses all seven active chains at depth 512 plus
100,000 unrelated runs/1,000,000 items. Root closure is bounded by the constants above,
candidate selection remains `batchSize + 1`, and no query/row count grows with unrelated
cardinality. Cycle/overflow fixtures must terminate within the same statement/timeout
budget and issue zero delete.

Migration tests capture `pg_locks` during FK and candidate-index phases and prove the
stated new-table `ACCESS EXCLUSIVE`, existing-run `SHARE ROW EXCLUSIVE`/`SHARE` ceiling,
lock timeout, seven inserts, zero heap rewrite/backfill, migration-first application
boot, complete transactional rollback before use, and forward-fix-only behavior after
head/audit state exists.

```bash
bun test tests/unit/kits/curatedStarterInstalledState.test.ts tests/unit/kits/curatedStarterLineageReconciliation.test.ts
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/kits/curated-starter-lineage-schema.test.ts
set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 tests/integration/kits/curatedStarterLineageDb.test.ts tests/integration/kits/curatedStarterInstalledStateDb.test.ts tests/integration/kits/curatedStarterRetentionDb.test.ts tests/perf/curated-starter-lineage-budgets.test.ts tests/perf/curated-starter-retention-budgets.test.ts
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/db/tables/curatedStarters.ts core/services/kits/curatedStarters/lineage*.ts core/services/kits/curatedStarters/installedState*.ts core/services/kits/curatedStarters/validationService.ts core/services/kits/solutionKitRetentionService.ts scripts/kits/reconcile-curated-starter-lineage.ts tests/vitest/kits/curated-starter-lineage-schema.test.ts tests/unit/kits/curatedStarterInstalledState.test.ts tests/unit/kits/curatedStarterLineageReconciliation.test.ts tests/integration/kits/curatedStarterLineageDb.test.ts tests/integration/kits/curatedStarterInstalledStateDb.test.ts tests/integration/kits/curatedStarterRetentionDb.test.ts tests/perf/curated-starter-lineage-budgets.test.ts tests/perf/curated-starter-retention-budgets.test.ts
```

All files <=1000 lines.

## Documentation Updates Required

TASK-555-07-L01 documents query and retention truth; L03 is closure metadata only.
