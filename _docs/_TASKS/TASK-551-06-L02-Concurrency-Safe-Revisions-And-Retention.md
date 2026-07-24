# TASK-551-06-L02: Concurrency-Safe Revisions and Retention
# FileName: TASK-551-06-L02-Concurrency-Safe-Revisions-And-Retention.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-06
**Priority:** Critical
**Category:** Database / Content / Reliability / Performance
**Estimated Effort:** Extra Large
**Dependencies:** TASK-551-06-L01, TASK-551-05-L02
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Make page and widget-template service allocation monotonic and race-safe using
transaction-scoped parent serialization plus the TASK-551-05 unique constraints.
Bound page/widget/detail revision reads and prune superseded history in small
batches. Export one family-aware lock/allocator/retention contract for
TASK-551-09-L03 to adopt in the whole detail-page document writer and for later
entry/post adoption after TASK-517 serialization.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Shared revision owner:** `core/services/database/revisionAllocation.ts` and
`core/services/content/revisionRetentionService.ts`.

**Other revision services:** `core/services/pages/revisionService.ts`,
`core/services/widgets/widgetTemplateRevisionService.ts`,
and `core/services/content/detailPageRevisionService.ts`.

**Tests:** `tests/vitest/database/revisionAllocation.test.ts`,
`tests/unit/pages/revisionService.test.ts`,
`tests/unit/widgets/widgetTemplateRevisionService.test.ts`,
`tests/unit/content/detailPageRevisionService.test.ts`,
`tests/integration/server/task551RevisionConcurrency.test.ts`,
`tests/integration/server/task551RevisionRetention.test.ts`, and
`tests/perf/database-revision-budgets.test.ts`.

No entry/post facade, persistence, mutation, revision-adoption, or test path may
be edited; TASK-551-09 owns each whole service after TASK-517 and consumes this
leaf's helper. `detailPageDocumentService.ts` is likewise TASK-551-09-owned.
No routes/admin/public runtime may be edited, and `publicSite.tsx` remains
forbidden. TASK-511/TASK-493/TASK-517/TASK-518, schema/migrations, cache,
scheduler, task/changelog/workflow files are forbidden.

## Revision Retention Policy

The shared strict policy defaults to enabled, `maxAgeDays=180` (`30..2555`) and
`keepNewestPerParent=50` (`1..500`), plus L01's batch 500/max 2,000 and maximum
10/max 100 batches. A row is eligible only when it is both older than the age
cutoff and outside the newest-count floor. Ordering is `version ASC, id ASC`;
published/current/protected anchors always survive. Exact environment prefixes
are `RETENTION_PAGE_REVISIONS_`, `RETENTION_WIDGET_TEMPLATE_REVISIONS_`,
`RETENTION_DETAIL_PAGE_REVISIONS_`, `RETENTION_ENTRY_REVISIONS_`, and
`RETENTION_POST_REVISIONS_`; each exposes `ENABLED`, `MAX_AGE_DAYS`, and
`KEEP_NEWEST_PER_PARENT`. This leaf adopts the first three. TASK-551-09 must
adopt the final two without changing these values before overall closure. Here,
"adopts" means page/widget service allocation plus bounded retention for the
first three tables; actual detail document allocation remains TASK-551-09-L03.
All five families consume L01's required typed `RetentionPolicy.dryRun`; there
is no revision-family dry-run variable or override. Global true keeps the same
bounded eligible-ID read and anchor/count preservation, but performs zero
delete/update/destructive-row-lock/cache/outbox/high-water mutation. Direct
service dry-run does not acquire L03's scheduler advisory lock; scheduled use is
serialized once by L03 before invoking this same service contract.

## Implementation Pseudocode

```ts
export type RevisionFamily =
  | "page" | "widget_template" | "detail_page" | "entry" | "post";

export async function withRevisionParentLock<T>(
  identity: { family: RevisionFamily; parentId: string },
  tx: Tx,
  run: () => Promise<T>
): Promise<T> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${stableFamilyKey(identity.family)}, ${stableParentKey(identity.parentId)})`);
  return run();
}

export async function allocateRevision<T>(input: RevisionInsert<T>, tx: Tx): Promise<Revision<T>> {
  return withRevisionParentLock(input, tx, async () => {
    const next = await selectNextVersionForParent(input.family, input.parentId, tx);
    try { return await insertRevision({ ...input, version: next }, tx); }
    catch (error) { throw mapNamedRevisionConstraint(error, "revision_conflict"); }
  });
}

// Every adopter uses these exact argument orders. Do not add tx-first overloads.
await withRevisionParentLock(identity, tx, async () => {
  await allocateRevision(input, tx);
});

async function listRevisions(parentId: string, input: RevisionListInput, db: Db): Promise<RevisionPage> {
  // projection, version DESC/id DESC keyset, default 50/max 100, LIMIT + 1;
  // exact cursor scope is revision:<family>:v1:<sha256(canonicalJson({parentId}))>.
}

async function createOrReplaceAutosaveRevisionTx(
  tx: Tx, pageId: string, snapshot: PageRevisionSnapshot, userId: string,
): Promise<PageAutosaveRevisionResult> {
  return withRevisionParentLock({ family: "page", parentId: pageId }, tx, async () => {
    const latest = await selectLatestPageAutosave(tx, {
      pageId,
      columns: ["id", "pageId", "version", "kind", "data", "createdAt", "createdBy"],
      orderBy: ["version DESC", "id DESC"],
      limit: 1,
    });
    const normalized = normalizePageRevisionSnapshot(snapshot);
    if (latest && areRevisionSnapshotsEqual(normalizePageRevisionSnapshot(latest.data), normalized)) {
      return { revision: mapRevisionRow(latest), reusedRevision: true }; // zero delete
    }
    const created = await allocateRevision({
      family: "page", parentId: pageId, kind: "autosave", data: normalized,
      createdBy: userId,
    }, tx);
    if (latest) await deleteExactSupersededAutosave(tx, {
      id: latest.id, pageId, kind: "autosave", excludeId: created.id,
    });
    return { revision: mapRevisionRow(created), reusedRevision: false };
  });
}

async function pruneRevisions(policy: ParentRevisionPolicy, tx: Tx): Promise<number> {
  // Keep newest/count floor, preserve protected/published anchors, delete oldest
  // IDs in bounded SKIP LOCKED batches; never delete current referenced revision.
  // When policy.dryRun, run only the LIMIT-bounded candidate read and return
  // matched/deleted=0 without a destructive lock or persisted state change.
}
```

Advisory key derivation is deterministic, collision-tested, family scoped, and
does not expose raw UUIDs in logs. The unique constraint is the final integrity
guard; retry only serialization/deadlock errors with capped jitter (`<= 3`), not
domain conflicts. The helper's closed family identifiers already include entry
and post so TASK-551-09 cannot invent incompatible advisory keys, conflict codes,
cursor shapes, or retention defaults; that inclusion grants no source ownership
to this leaf.
`withRevisionParentLock` exists separately because TASK-551-09-L03 must serialize
the detail autosave's latest-snapshot equality decision before allocation. In one
transaction it locks `{ family: "detail_page", parentId }`, selects only the
latest autosave, reuses an identical snapshot or calls `allocateRevision`, then
deletes only that exact superseded autosave ID. Scheduled retention owns older
history; no request-path bulk prune remains. The TASK-551-09-L03 adapter maps the
shared `revision_conflict` to the route's existing `detail_page_conflict` code;
this leaf and TASK-551-09-L03 do not edit `detailPageRoutes.ts`.
The page implementation above is owned and landed here, not deferred to L09. Its
latest query is exactly one explicitly projected row ordered
`version DESC,id DESC LIMIT 1`; it never loads all autosaves. Equality reuse
performs zero insert and zero delete. A changed snapshot allocates through the
shared helper inside the same parent-locked transaction, then deletes at most the
exact previously selected ID with predicates `id=:previousId AND page_id=:pageId
AND kind='autosave' AND id<>:createdId`. It never deletes an ID list, the new row,
or older legacy history. Older autosaves are eligible only through this leaf's
scheduled bounded retention service/L03 scheduler; request autosave performs no
bulk cleanup. The statement budget is at most two for reuse and at most six for
changed allocation including lock/allocation/delete, independent of history size.
The callable owner contract is exactly
`withRevisionParentLock(identity, tx, run)` and `allocateRevision(input, tx)`.
Consumer pseudocode, fixtures, and implementations must use those orders;
tx-first calls, overloads, or compatibility adapters are contract drift.

This leaf's bounded read boundary preserves two real, family-specific summary
contracts rather than inventing one lossy union:

```ts
type PageRevisionSummary = Readonly<{
  id: string;
  pageId: string;
  version: number;
  kind: "publish" | "autosave";
  title: string | null;
  slug: string | null;
  createdAt: Date;
  createdBy: { id: string; name: string | null; email: string } | null;
}>;
type DetailPageRevisionSummary = Readonly<{
  id: string;
  detailPageId: string;
  version: number;
  kind: DetailPageRevisionKind;
  createdAt: Date;
  createdBy: string | null;
}>;
type RevisionPage<T> = Readonly<{
  items: readonly T[];
  nextCursor: string | null;
  hasMore: boolean;
}>;
```

Page list SQL projects `title` and `slug` with bounded JSON scalar extraction
from the stored snapshot and joins only the authorized author columns needed to
construct `createdBy`; it never transfers `data`. Detail-page list SQL projects
only the six declared columns and never transfers `document`. The respective
return types are `RevisionPage<PageRevisionSummary>` and
`RevisionPage<DetailPageRevisionSummary>`. The service input is exactly
`{ cursor?: string, limit?: number }`, rejects unknown keys, defaults to 50,
caps at 100, and orders `version DESC, id DESC`. A same-parent point read by
revision ID is the only operation that returns full `data` or `document`.
L02 owns these service types and behavior only. TASK-551-03-L02 is the sole
later writer of `pageRoutes.ts`, `pageSchemas.ts`, `pagesClient.ts`,
`detailPageRoutes.ts`, `detailPageSchemas.ts`, `detailPagesClient.ts`, and their
page/detail UI/tests; it adopts the respective envelope without changing it.
No raw-array compatibility overload or invented `reason` field is permitted.

## Testing Requirements

- Contract tests pin all five family identifiers and prove entry/post resolve to
  the same allocator/policy shape without importing their services.
- Synchronize 50 concurrent creates through the actual page/widget services;
  committed versions are unique, contiguous for successful transactions,
  monotonic, and correctly parent/family scoped. Exercise the generic
  `detail_page` lock/allocator directly without claiming document-service
  adoption; inject rollback/deadlock/unique-conflict paths.
- Synchronize 50 actual page autosaves for an empty parent, an existing differing
  autosave, identical snapshots, and distinct snapshots. Identical contenders
  create at most one row then all reuse its exact ID; distinct contenders receive
  contiguous committed versions and only each immediately selected predecessor
  is deleted. Seed 100,000 older autosaves and prove request query count/rows/
  bytes remain within the two/six-statement budgets, older IDs survive until the
  scheduled retention run, and a delete-race fault cannot remove the new row or
  another parent's/publish revision.
- Pin the exact `withRevisionParentLock` and `allocateRevision` exports, all five
  family literals, shared advisory-key derivation, and `revision_conflict`.
  An executable typed consumer fixture calls
  `withRevisionParentLock(identity, tx, run)` and `allocateRevision(input, tx)`
  and proves swapped tx-first invocation does not typecheck. TASK-551-09-L03
  owns the later 50-way real detail document/autosave test.
- Revision reads select summaries only, default 50/max 100, deterministic ties,
  `<= 2` SQL statements, use the exact family/parent-digest scope and strict
  family-specific envelopes above, and never transfer full snapshots until
  detail lookup. Exact-key tests preserve page `kind,title,slug,createdBy`
  author shape and detail-page `kind,createdBy` ID while rejecting `reason`,
  `data`, and `document` in list rows.
- Retention fixtures preserve newest N, protected/published/current anchors,
  boundary ages, and rows belonging to other parents; repeated batches converge.
  Global dry-run repeats the bounded candidate read but executes exactly zero
  deletes/updates/destructive row locks/cache/outbox/high-water writes for every
  revision family; direct service invocation does not acquire L03's scheduler
  advisory lock.
- Plan/perf tests assert parent/version indexes and bounded rows/buffers on 100k
  revisions without full scans or all-history materialization.

## Security Contract

- Internal service changes only; existing revision endpoints retain session
  auth, resource RBAC, CSRF on writes/deletes/restores, current rate limits, and
  strict route schemas.
- No public write or nonce/HMAC/CAPTCHA change. TASK-517 publication/visibility
  enforcement remains authoritative.
- Parent authorization is completed before service invocation; cursor/parent
  mismatch fails closed. Summaries omit document bodies; errors/logs omit
  revision snapshots, PII, SQL/binds, advisory keys, and internal constraint SQL.

## Validation Commands

- `bunx vitest run tests/vitest/database/revisionAllocation.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/pages/revisionService.test.ts tests/unit/widgets/widgetTemplateRevisionService.test.ts tests/unit/content/detailPageRevisionService.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/server/task551RevisionConcurrency.test.ts tests/integration/server/task551RevisionRetention.test.ts tests/perf/database-revision-budgets.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso`
- `bun run gates:coderso:perf`

## Documentation Updates Required

No shared docs. Hand locking/retry/error rules, bounded read shape, exact
retention env/default table, and explicit TASK-551-09 detail/entry/post adoption
requirements to TASK-551-10-L02.

## Quantified Acceptance

- Fifty concurrent actual page/widget service attempts produce zero duplicate
  versions/partial rows and a valid monotonic committed sequence. Generic
  `detail_page`/entry/post identifiers and lock/allocation behavior remain
  contract-tested for TASK-551-09 adoption; no claim is made that this leaf
  changes the detail document writer.
- Page autosave reads one latest row, uses at most two statements on equality and
  six on replacement, deletes only the exact predecessor, and performs zero
  request-path old-history prune with 100,000 existing rows. Fifty contenders
  never delete the new row, a publish revision, older history, or another parent.
- Summary reads return at most 101 DB rows, at most 100 items, and at most 2 SQL
  statements; a detail fetch returns exactly one snapshot.
- Retention never exceeds 2,000 deletes/batch, preserves 100% of protected and
  other-parent rows, and converges idempotently; global dry-run returns bounded
  match counts and performs zero mutations.
- No entry/post/detail-document file changes in this leaf; all touched
  production/test files are at most 1,000 lines.
- Exported and consumer-facing signatures remain exactly
  `withRevisionParentLock(identity, tx, run)` and `allocateRevision(input, tx)`,
  with no tx-first overload or adapter.
