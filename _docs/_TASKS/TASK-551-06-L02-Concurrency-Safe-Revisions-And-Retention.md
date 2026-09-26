# TASK-551-06-L02: Concurrency-Safe Revisions and Retention
# FileName: TASK-551-06-L02-Concurrency-Safe-Revisions-And-Retention.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-06
**Priority:** Critical
**Category:** Database / Content / Reliability / Performance
**Estimated Effort:** Extra Large
**Dependencies:** TASK-551-06-L01, TASK-551-05-L02
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Make page revision allocation monotonic and race-safe using transaction-scoped
parent serialization plus the TASK-551-05 unique constraints. Widget-template
revisions are legacy-table retention-only: TASK-580 removed the widget-template
authoring stack, zero production writers insert into `widget_template_revisions`
today, and any writer revival is deferred to a follow-up task. Bound
page/detail revision reads and prune superseded history in small batches.
Export one family-aware lock/allocator/retention contract for TASK-551-09-L03
to adopt in the whole detail-page document writer and for later entry/post
adoption after TASK-517 serialization.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Shared revision owner:** `core/services/database/revisionAllocation.ts` and
`core/services/content/revisionRetentionService.ts`.

**Other revision services:** `core/services/pages/revisionService.ts` and
`core/services/content/detailPageRevisionService.ts`. No
`widgetTemplateRevisionService.ts` is created: the widget-template family is
retention-only legacy-table scope (no live writer remains after TASK-580), and
any writer revival belongs to a follow-up task.

**Tests:** `tests/vitest/database/revisionAllocation.test.ts`,
`tests/unit/pages/revisionService.test.ts`,
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
`KEEP_NEWEST_PER_PARENT`. This leaf adopts the first three, where the
widget-template member is retention-only for the legacy table (no live writer
exists). TASK-551-09 must adopt the final two without changing these values
before overall closure. Here, "adopts" means page service allocation plus
bounded retention for the first three tables, where the widget-template member
is legacy-table retention-only; actual detail document allocation remains
TASK-551-09-L03.
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
to this leaf. `widget_template` likewise remains a closed family identifier
solely for the legacy-table retention scope; this leaf creates no
widget-template allocation writer and defers any writer revival to a follow-up
task.
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
- Synchronize 50 concurrent creates through the actual page service; the
  widget-template family has no live writer after TASK-580 and is covered as
  legacy-table retention only;
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
- `set -a && source .env && set +a && bun test tests/unit/pages/revisionService.test.ts tests/unit/content/detailPageRevisionService.test.ts`
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

- Fifty concurrent actual page service attempts produce zero duplicate
  versions/partial rows and a valid monotonic committed sequence; widget-template
  rows are retention-only legacy-table scope with no allocation writer in this
  leaf. Generic
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

## Workflow Dispatch Envelope

The focused unit and integration/performance lanes use L11's generic private
database-test capability. No command loads `.env`, exposes a profile value, or
changes the later TASK-551-09 whole-service ownership.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-06-L02",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-06"
  },
  "allowlist": [
    "core/services/database/revisionAllocation.ts",
    "core/services/content/revisionRetentionService.ts",
    "core/services/pages/revisionService.ts",
    "core/services/content/detailPageRevisionService.ts",
    "tests/vitest/database/revisionAllocation.test.ts",
    "tests/unit/pages/revisionService.test.ts",
    "tests/unit/content/detailPageRevisionService.test.ts",
    "tests/integration/server/task551RevisionConcurrency.test.ts",
    "tests/integration/server/task551RevisionRetention.test.ts",
    "tests/perf/database-revision-budgets.test.ts",
    "tests/perf/database-revision-candidate-bounds.test.ts"
  ],
  "forbiddenPaths": [
    "core/services/content/detailPageDocumentService.ts",
    "core/server/publicSite.tsx",
    "core/db/schema.ts",
    "core/db/migrations/meta/_journal.json",
    "core/services/maintenance/retentionScheduler.ts",
    "core/services/cache/serverCacheRuntime.ts"
  ],
  "dependencies": ["TASK-551-06-L01:single"],
  "commands": [
    {
      "id": "revision-allocation-test",
      "lane": "vitest",
      "argv": ["bunx", "vitest", "run", "tests/vitest/database/revisionAllocation.test.ts"],
      "environmentProfile": "none",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/database/revisionAllocation.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "revision-service-unit-tests",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/unit/pages/revisionService.test.ts", "tests/unit/content/detailPageRevisionService.test.ts"],
      "environmentProfile": "task551-db-test",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": [
          "tests/unit/pages/revisionService.test.ts",
          "tests/unit/content/detailPageRevisionService.test.ts"
        ],
        "minimum": 1
      }
    },
    {
      "id": "revision-concurrency-and-budget-tests",
      "lane": "bun-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/server/task551RevisionConcurrency.test.ts", "tests/integration/server/task551RevisionRetention.test.ts", "tests/perf/database-revision-budgets.test.ts", "tests/perf/database-revision-candidate-bounds.test.ts"],
      "environmentProfile": "task551-db-test",
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": [
          "tests/integration/server/task551RevisionConcurrency.test.ts",
          "tests/integration/server/task551RevisionRetention.test.ts",
          "tests/perf/database-revision-budgets.test.ts",
          "tests/perf/database-revision-candidate-bounds.test.ts"
        ],
        "minimum": 4
      }
    },
    {
      "id": "core-lint-types",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint",
      "lane": "tooling",
      "argv": ["bun", "--cwd", "core", "lint"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "coderso-gate",
      "lane": "tooling",
      "argv": ["bun", "run", "gates:coderso"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "performance-gate",
      "lane": "tooling",
      "argv": ["bun", "run", "gates:coderso:perf"],
      "environmentProfile": "none",
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "single",
      "dependsOn": ["TASK-551-06-L01:single"],
      "commandIds": [
        "revision-allocation-test",
        "revision-service-unit-tests",
        "revision-concurrency-and-budget-tests",
        "core-lint-types",
        "core-lint",
        "coderso-gate",
        "performance-gate"
      ]
    }
  ]
}
```

## Dated Contract Corrections — 2026-09-25 (re-open R6: PageRevisionSummary author email; append-only)

This section is append-only. The Workflow Dispatch Envelope above (allowlist,
forbiddenPaths, `dependencies`, occurrence id `single`, its `dependsOn` and
command ids) is unchanged; nothing in this section edits it.

### R6 — `PageRevisionSummary.createdBy.email` decodes through `resolveEmailValue`

**Finding (06-L02-M2, disclosed in `_docs/_workflows/_smoke/task-551/impl-06-l02.json`
defect `06-L02-M2`; mirrored by TASK-551-03-L02 FAZA-0 F-24 and its C17 handoff).**
`listRevisions` (`core/services/pages/revisionService.ts:348`) selects
`authorEmail: users.email` (`:368`) with no `users.emailEncrypted` column, and
the summary mapper (`:390-397`) returns `createdBy: { id, name, email:
row.authorEmail }` whenever `row.createdById && row.authorEmail`. Every other
admin author surface decodes through `resolveEmailValue` from
`core/services/security/piiEmail.ts:118`, signature
`resolveEmailValue(input: { emailEncrypted?: unknown; email?: string | null }): string | null`
(decrypts the AES-256-GCM `emailEncrypted` payload when present, otherwise
returns `email` only when it is non-blank and `isLikelyEmail`, else `null`).
In-file precedents: the point-read mapper `mapRevisionRow` of the same service
(`revisionService.ts:163-188`, selecting `authorEmailEncrypted` at `:214`) and
the page list `core/services/pages/pageService.ts:149-151`/`:163-172`.

**Severity classification: PII-path defect, not only an inconsistency.** The
`users.email` column (`core/db/tables/identity.ts:34`) is written by
`buildEmailFields` (`piiEmail.ts:138-147`, used by `core/db/seed.ts:54-60` and
`core/services/admin/usersService.ts:134`, `:203`) as the keyed
HMAC-SHA256 `emailHash`, with the address itself only in the encrypted
`email_encrypted` jsonb (`identity.ts:36`). For every user created through the
canonical paths the list therefore ships the keyed email pseudonym (a stable
cross-surface identifier derived from PII) to the admin client labelled as an
email, and renders a hex digest where an address is expected; only legacy
plaintext rows happen to show the real address. The point read and the list
disagree for the same revision.

**Receipt rationale superseded.** The receipt's "changes the frozen-for-03
envelope shape and per-row decrypt cost" reason for not fixing is corrected:
the TypeScript shape is unchanged (`PageRevisionAuthor.email: string`,
`revisionService.ts:40-44`; `RevisionPage<PageRevisionSummary>` keys stay
`items`/`nextCursor`/`hasMore`), only the value changes; the decrypt cost is
bounded by `MAX_PAGE_REVISION_LIST_LIMIT = 100` (`:108`) rows per page, the
same per-row cost `pageService.ts` already pays on the page list.

**Disposition.**

1. In `listRevisions`, add `authorEmailEncrypted: users.emailEncrypted` to the
   projection immediately after `authorEmail` (the list becomes a 12-column
   projection; no other column, predicate, ordering or `limit + 1` change).
2. The summary mapper resolves once per row and gates on the resolved value:

   ```ts
   const email = row.createdById
     ? resolveEmailValue({ emailEncrypted: row.authorEmailEncrypted, email: row.authorEmail })
     : null;
   createdBy: row.createdById && email
     ? { id: row.createdById, name: row.authorName ?? null, email }
     : null,
   ```

   `createdBy` is non-null only when the id AND a resolved email exist (the
   F-24 rule that keeps `PageEditorResourceAuthor.email: string` unchanged);
   a hash-only row with no decryptable payload yields `createdBy: null`, never
   the raw column. `resolveEmailValue` is already imported (`:28`). Decode
   failures keep the point-read behaviour (no new catch or fallback; AGENTS.md
   forbids test-only fallbacks). The point-read `mapRevisionRow` `?? ""`
   policy (`:180-184`) is out of R6 scope and unchanged.
3. `PageRevisionSummary`, `PageRevisionAuthor`, the cursor codec, the envelope
   and every error code are unchanged.

**Detail-page revision summaries (checked, no drift).**
`core/services/content/detailPageRevisionService.ts` never joins `users` and
projects no author email: `createdBy` is the bare `string | null` user id
(`:19`, `:28`, `:41`, `:85`, `:99`, select `:260`). Nothing to align; no edit.

**Tests (owning 06-L02 suite).** `tests/unit/pages/revisionService.test.ts`
covers `listRevisions` / `PageRevisionSummary` (stub legs `:421-460`, DB legs
`:845-895`); `tests/unit/content/detailPageRevisionService.test.ts` needs no
change. Required edits:

- The list stub tuple `listRow` (`:310-322`, "exact 11-column projection")
  grows the 12th `authorEmailEncrypted` element and its comment says 12.
- New stub vector: set `PII_ENC_KEY`/`PII_HASH_KEY` test values with `||=`
  exactly as `tests/unit/security/piiEmail.test.ts:13-14`; a row whose
  `authorEmail` is `hashEmail("ada@example.com")` and whose
  `authorEmailEncrypted` is `encryptEmail("ada@example.com")` must yield
  `createdBy.email === "ada@example.com"` and must NOT equal the hash column
  value; a hash-only row (no encrypted payload) must yield `createdBy: null`.
- The existing `:453` expectation (`email: "ada@example.com"` from a plaintext
  legacy row) stays and pins the legacy branch.
- The DB leg seeds its actor with a plaintext `email` (`:773`); it may add a
  `createdBy.email` equality on `only.items` but must not seed through the
  shared seed admin or delete rows it did not create.

**Scope.** Both edited files are in the envelope allowlist above
(`core/services/pages/revisionService.ts`,
`tests/unit/pages/revisionService.test.ts`). No route, client, UI, schema,
TASK-551-09-L02-owned (`tests/unit/pages/pageService.test.ts`) or
TASK-551-03-L02-owned path is touched.

**Land order.** R6 lands BEFORE TASK-551-03-L02 wave W0 (revision envelope
adoption), so 03-L02 consumes decoded summaries and its F-24/C17 handoff is
satisfied without a second owner of `revisionService.ts`.

**Gates.** The envelope's `revision-service-unit-tests` and
`revision-concurrency-and-budget-tests` commands (the 06-L02 airtight suites
for these files), plus `core-lint` and `core-lint-types`; root `tsc` is run by
the orchestrator between phases. The orchestrator appends the R6 receipt
addendum (final bytes, line counts, sha256, command results) to
`_docs/_workflows/_smoke/task-551/impl-06-l02.json`; this task file records
the contract only.

### R6 amendments (round 2, 2026-09-25)

Append-only corrections after the two R6 pre-implementation audits. Each item
quotes the R6 sentence it supersedes; where an item supersedes text, the
amendment wins and the quoted sentence is read as replaced. The Workflow
Dispatch Envelope, `**Status:**` and `**Changelog:**` fields stay unchanged.

**A1 (MEDIUM) — the perf mirror is a third required edit.** Supersedes
"Both edited files are in the envelope allowlist above
(`core/services/pages/revisionService.ts`,
`tests/unit/pages/revisionService.test.ts`)." R6 edits THREE files, all in the
envelope allowlist: `core/services/pages/revisionService.ts`,
`tests/unit/pages/revisionService.test.ts` and
`tests/perf/database-revision-budgets.test.ts` (allowlist entry `:339`). The
perf file's `compileListQuery` (`database-revision-budgets.test.ts:140-170`)
mirrors the `listRevisions` projection and its comment (`:138-139`) claims
"the source leg below pins the mirror to the body"; R6 makes that true:

- `compileListQuery`: add `authorEmailEncrypted: users.emailEncrypted,` on the
  line immediately after `authorEmail: users.email,` (`:153`).
- Projection leg (`:177-207`): add
  `expect(projection).toContain('"users"."email_encrypted"');` beside the
  existing `'"users"."email"'` assertion.
- Source leg (`:209-225`): add
  `expect(body).toContain("authorEmailEncrypted: users.emailEncrypted,");`.

The file is 959 lines; the edit adds 3-5 lines and stays under 1,000. The
command gate is unchanged: the envelope's `revision-concurrency-and-budget-tests`
command already runs this file. The **Tests** paragraph's required edits are
read as covering these three files.

**A2 (LOW) — line budget and vector shape.** Supersedes the bullet "New stub
vector: set `PII_ENC_KEY`/`PII_HASH_KEY` test values with `||=` ... a hash-only
row (no encrypted payload) must yield `createdBy: null`." as to shape (the key
setup and the two expectations stay). `tests/unit/pages/revisionService.test.ts`
is 949 lines and must stay at or under 1,000 after R6. The two vectors
(hash + encrypted row -> `createdBy.email === "ada@example.com"` and not equal
to the hash column value; hash-only row -> `createdBy: null`) are ONE compact
table-driven test reusing the existing `listRow` (`:310-323`), `runList`
(`:348`) and `LIST_HANDLER` (`:357`) helpers, at most about 40 added lines. A
tamper vector is added only if it fits the budget; otherwise decode-failure
behaviour is recorded as accepted parity (A4) without a vector. If added, it
must assert what `decryptEmail` actually throws
(`core/services/security/piiEmail.ts:97-115`): a wrong-length `tag` (or `iv`)
makes `listRevisions` reject with `encrypted_email_invalid` (`:103`); a
same-length flipped tag fails in `decipher.final()` with the runtime's GCM
authentication error, not `encrypted_email_invalid`, so such a vector may
assert rejection only, never that code.

**A3 (LOW) — tuple anchor and the legacy branch.** Supersedes "The list stub
tuple `listRow` (`:310-322`, "exact 11-column projection") grows the 12th
`authorEmailEncrypted` element and its comment says 12." The anchor is
`:310-323`. The new 12th element is `null` in BOTH branches of the existing
helper (`withAuthor` true and false), so the existing plaintext expectation
(`:453`, `email: "ada@example.com"`) still exercises the plaintext-legacy branch
of `resolveEmailValue`. Encrypted and hash-only rows appear only in the new A2
vector.

**A4 (LOW) — decode-failure rationale.** Supersedes "Decode failures keep the
point-read behaviour (no new catch or fallback; AGENTS.md forbids test-only
fallbacks)." The reason is parity: `getPageRevision`/`mapRevisionRow`,
`listPages` (`pageService.ts:149-172`) and the entries/posts author surfaces
call `resolveEmailValue` without a catch, so a decrypt error propagates and the
read fails closed. R6 adds no catch, no per-row fallback and no partial
envelope.

**A5 (LOW) — remaining hash-only divergence, accepted.** Supplements "The
point-read `mapRevisionRow` `?? ""` policy (`:180-184`) is out of R6 scope
and unchanged." For a hash-only row (hash in `users.email`, null
`email_encrypted`), the point read `mapRevisionRow`
(`revisionService.ts:175-186`) still yields
`createdBy: { id, name, email: "" }`, while the list yields `createdBy: null`
after R6. This divergence is accepted, out of R6 scope, and recorded for the
point-read owner; no follow-up leaf is allocated.

**A6 (INFO) — receipt citation, RBAC parity, UI edge case.** Supplements
"**Receipt rationale superseded.**": the superseded rationale is the
`06-L02-M2` `disposition` at `_docs/_workflows/_smoke/task-551/impl-06-l02.json:211`.
RBAC parity: `GET /pages/:id/revisions` requires `content:read`
(`core/server/routes/pageRoutes.ts:276`), and the same permission already
receives decrypted author emails from `GET /pages`
(`pageRoutes.ts:109`, through `pageService.ts:149-172`); the point-read mapper
decodes on `content:write` restore/autosave responses, a superset. R6 therefore
widens no disclosure. Accepted edge case: a user with a name, a hash in `email`
and null `email_encrypted` now gets `createdBy: null`, so
`PageRevisionDrawer` (`core/admin/ui/pages/PageRevisionDrawer.tsx:102-104`)
shows "System" for that revision. This occurs only for non-canonical data;
canonical writers (`buildEmailFields`) always store the encrypted payload.

### R6 amendments (round 3, 2026-09-25)

Append-only corrections after the two round-2 R6 re-audits (both PASS with
LOW findings). Each item quotes the R6 or round-2 sentence it supersedes;
where an item supersedes text, the amendment wins and the quoted sentence is
read as replaced. The Workflow Dispatch Envelope, `**Status:**` and
`**Changelog:**` fields stay unchanged.

**B1 (orchestrator decision) — the point read adopts the list rule.**
Supersedes "The point-read `mapRevisionRow` `?? ""` policy (`:180-184`) is out
of R6 scope and unchanged." and, in A5, "This divergence is accepted, out of
R6 scope, and recorded for the point-read owner; no follow-up leaf is
allocated." R6 scope now includes `mapRevisionRow`
(`core/services/pages/revisionService.ts:163-188`), still inside the
envelope-allowlisted `revisionService.ts`. It applies the SAME rule as the
list: resolve once, then gate on the resolved value; drop the `?? ""`
fallback (`:180-184`) and the raw-column gate
`row.createdBy && (row.authorEmail || row.authorEmailEncrypted)` (`:175-176`):

```ts
const email = row.createdBy
  ? resolveEmailValue({
      email: row.authorEmail ?? null,
      emailEncrypted: row.authorEmailEncrypted ?? null,
    })
  : null;
createdBy: row.createdBy && email
  ? { id: row.createdBy, name: row.authorName ?? null, email }
  : null,
```

`createdBy` is non-null only when `createdBy` (the id) AND a resolved email
exist; a hash-only row yields `createdBy: null`. No catch and no fallback are
added (A4 parity holds). Callers: the only route-reachable author-bearing
caller is `restoreRevision` (`revisionService.ts:640-648`, route
`POST /pages/:id/revisions/:revisionId/restore`,
`core/server/routes/pageRoutes.ts:280-285`, `content:write`);
`getPageRevision` (`:199-223`) also joins the author but has no route caller
in `core/`; the autosave paths (`createOrReplaceAutosaveRevisionTx` reuse
`:513`, `mapAllocatedRevisionRow` `:190-193`, `discardAutosaveRevision`
`:617-622`) map bare rows without author columns and stay `createdBy: null`.
`PageRevisionRecord`, `PageRevisionAuthor.email: string` and every error code
are unchanged. After B1 the list and the point read agree for the same
revision; the A5 "accepted divergence" no longer exists.

Test: add one stub vector for the point read only if the unit-suite budget
allows (B4 drop order). Preferred shape: inside the existing point-read leg
(`tests/unit/pages/revisionService.test.ts:570-601`), reuse
`pointReadResult` and `RX.pointRead` with a hash-only author row (hash in
`authorEmail`, null `authorEmailEncrypted`) and assert `createdBy: null`
through `getPageRevision`, which exercises the same `mapRevisionRow` that
`restoreRevision` uses; the existing plaintext expectation
(`email: "ada@example.com"`) stays. If a separate test does not fit, it may be
folded into the A2 table-driven leg only if it fits there.

Remaining divergence, handed off (no TASK-9999 leaf): the page list in
`core/services/pages/pageService.ts:163-172` still emits
`author: { id, name, email: resolveEmailValue(...) ?? "" }`, so a hash-only
author yields `email: ""` there instead of `null`. `pageService.ts` is owned
by TASK-551-03-L02; this is recorded as a handoff to TASK-551-03-L02, whose
wave W1 may align it under the same rule. R6 does not touch `pageService.ts`.

**B2 — exact gate forms.** Supersedes "The envelope's
`revision-service-unit-tests` and `revision-concurrency-and-budget-tests`
commands (the 06-L02 airtight suites for these files), plus `core-lint` and
`core-lint-types`;". The R6 gates are, in order:

1. Mandatory airtight form (DB legs skip):
   `cd /home/coder/project/Coderso-551 && env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/unit/pages/revisionService.test.ts tests/perf/database-revision-budgets.test.ts`.
2. Owner-map run on `DATABASE_URL3` under a CLOSED environment:
   `env -i PATH=… HOME=… DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_NAME=coderso02 TASK551_FIXTURE_DATABASE_SENTINEL=<bootstrap sentinel> bun --env-file=/dev/null test tests/unit/pages/revisionService.test.ts tests/perf/database-revision-budgets.test.ts`.
   The perf file imports the shared `db` client
   (`tests/perf/database-revision-budgets.test.ts:35`), which reads
   `DATABASE_URL` (`core/db/client.ts:58`), so `DATABASE_URL` is mapped to
   the same `<URL3>` alongside the three fixture keys. The `DATABASE_URL3`
   migration ledger equals the HEAD journal (80 entries including `0081`),
   verified 2026-09-25 by the orchestrator.
3. `./node_modules/.bin/eslint --max-warnings=0` on the three edited files
   (fast).
4. `bun --cwd core lint:types`, run by the orchestrator between phases.

**B3 (A6 reword) — point-read disclosure and canonical writers.** Supersedes,
in A6, "the point-read mapper decodes on `content:write` restore/autosave
responses, a superset." Read instead: the point-read mapper decodes author
emails only in the `content:write` restore response
(`POST /pages/:id/revisions/:revisionId/restore`,
`revisionService.ts:640-648`); autosave responses carry `createdBy: null`;
`getPageRevision` has no route caller in `core/`. Also supersedes, in the R6
severity paragraph, "used by `core/db/seed.ts:54-60` and
`core/services/admin/usersService.ts:134`, `:203`" as an exhaustive list: the
four canonical `buildEmailFields` writers (verified 2026-09-25) are
`core/db/seed.ts:54`, `core/services/admin/usersService.ts:134` and `:203`,
`core/services/auth/userService.ts:20`, and
`core/services/admin/firstRunService.ts:100`.

**B4 — unit-suite budget drop order.** Supplements A2 ("A tamper vector is
added only if it fits the budget") and the **Tests** bullet "it may add a
`createdBy.email` equality on `only.items`". `tests/unit/pages/revisionService.test.ts`
stays at or under 1,000 lines. If the budget is tight, drop optional items in
this order: first the DB-leg `createdBy.email` equality, then the tamper
vector, then the B1 point-read vector. Required legs are never trimmed: the
12th `listRow` element, the A2 table-driven list vector (encrypted row and
hash-only row), and the A1 perf-mirror edits.

**B5 — anchors and wording.** Supersedes "stub legs `:421-460`" in the
**Tests** paragraph: the list stub leg is `:422-462`. Supersedes, in A3, "The
new 12th element is `null` in BOTH branches of the existing helper
(`withAuthor` true and false)": the new 12th element of `listRow` is a plain
`null,` (not a ternary), so it is `null` for both `withAuthor` values.

## Dated Contract Corrections — 2026-09-25 (re-open R7: retention published anchor, allocated-row mapping, DB-leg fixtures; append-only)

This section is append-only. The Workflow Dispatch Envelope above (allowlist,
forbiddenPaths, `dependencies`, occurrence id `single`, its `dependsOn` and
command ids), `**Status:**` and `**Changelog:**` are unchanged; nothing in this
section edits them. Where an R7 item quotes an earlier sentence (task body or
R6), the R7 item wins and the quoted sentence is read as replaced.

**Trigger.** The first real execution of this leaf's `testIfDb` DB legs, on
`DATABASE_URL3` (database `coderso02`) under the closed owner-map form of R6
B2, exposed two product defects (R7-F1, R7-F2), one fixture defect (R7-F3) and
one environment precondition (R7-F4). The orchestrator verified each finding
against source; every anchor below was re-grounded on 2026-09-25 at HEAD
`9c5b6666` plus the uncommitted R6 edits. The earlier DB-leg evidence in
`_docs/_workflows/_smoke/task-551/impl-06-l02.json` (`:104`, "92 pass / 20
skip / 0 fail" across five files; `:90`, "testIfDb DB legs skip without the
owner map") was reviewed, never executed; it is superseded by the executed R7
receipts (see **Receipt** below).

### R7-F1 (HIGH, product) — the published anchor probe retains every publish row

**Finding.** `publishedAnchorProbe`
(`core/services/content/revisionRetentionService.ts:456-463`):

- (a) `and ${spec.kindColumn} = 'publish'` (`:461`) interpolates the drizzle
  column, which compiles to the OUTER candidate's `"page_revisions"."kind"`
  (resp. `"detail_page_revisions"."kind"`), never to the aliased
  `published.kind`;
- (b) the probe is ANDed into `buildEligibilityWhere` (`:465-476`, conjunct
  `:475`) as a bare `not exists (...)`.

Combined: for an autosave candidate the subquery is empty, so it stays
eligible; a `publish` candidate is eligible only when NO same-parent row of
any kind is newer, which the keep-newest floor (`keepNewestFloorProbe`,
`:443-449`, requires `keepNewestPerParent` strictly newer rows) makes
impossible. Every publish revision on the page and detail_page families is
therefore retained forever, whatever its age. Orchestrator temp-table replay
of the budgets retention fixture (all rows `publish`, see R7-F1 tests): the
current predicate matches 0 of the 505 eligible rows; the fixed predicate
matches 500 under `LIMIT 500`. The existing retention DB legs did not catch
it because each seeds exactly ONE publish row per parent
(`tests/integration/server/task551RevisionRetention.test.ts:785-813`,
`:872-883`), which is protected under both the defective and the fixed
predicate.

**Binding semantics (orchestrator decision).** Only the NEWEST
`kind='publish'` row per parent, in `(version, id)` order, is protected by the
published anchor. Older publish rows, and autosaves newer than that anchor,
are ordinary candidates subject to the age cutoff and the keep-newest floor.
This matches the probe docstring (`revisionRetentionService.ts:451-455`, "the
newest `kind='publish'` row per parent ... is never a candidate") and the
existing DB legs (survivors `2:publish` at `:809`, `1:publish` at `:883`). It
supersedes:

- the module header `revisionRetentionService.ts:27-33` ("a row is protected
  by this anchor exactly when no same-parent `kind='publish'` row is strictly
  newer ...; i.e. the entire lineage from the newest publish row upward
  survives"): rows newer than the newest publish are NOT anchored by it (the
  keep-newest floor alone covers the current lineage);
- this task's Revision Retention Policy sentence (`:61-62`)
  "published/current/protected anchors always survive.", read as: "the newest
  `keepNewestPerParent` rows per parent (the current-document lineage) and, on
  the kind-bearing families (page, detail_page), the newest `kind='publish'`
  row per parent always survive". No revision table carries a protected flag
  or a current-revision pointer (module header `:18-23`), so no other anchor
  exists; the words "protected/published/current anchors" in the Testing
  Requirements (`:255`) and "100% of protected" in Quantified Acceptance
  (`:306`) mean exactly these two anchors.

**Disposition (production).** In `revisionRetentionService.ts` (envelope
allowlist `:331`):

1. Rewrite the probe so that it excludes only the newest publish row and
   binds the kind check inside the subquery to the alias. `kind` is the
   physical, `NOT NULL` column on both kind-bearing tables
   (`core/db/tables/pages.ts:97` in `page_revisions`, `:170` in
   `detail_page_revisions`), so the negated conjunction has no NULL branch:

   ```ts
   const PUBLISHED_KIND = sql.raw("published.kind");

   /** Newest-publish anchor (kind-bearing families only): excluded exactly
    *  when the candidate is `kind='publish'` AND no same-parent publish row is
    *  strictly newer in `(version, id)` order. Older publishes and autosaves
    *  newer than the anchor stay ordinary candidates. */
   const publishedAnchorProbe = (spec: RevisionFamilySpec): SQL | undefined =>
     spec.kindColumn === null
       ? undefined
       : sql`not (${spec.kindColumn} = 'publish' and not exists (
           select 1 from ${spec.table} published
           where published.${sql.raw(spec.parentColumnSql)} = ${spec.parentColumn}
             and ${PUBLISHED_KIND} = 'publish'
             and (${PUBLISHED_ORDER}) > (${spec.versionColumn}, ${spec.idColumn})
           limit 1))`;
   ```

   `buildEligibilityWhere` keeps the probe as its fourth conjunct
   (`:475`); nothing else in the predicate, ordering, `LIMIT`, row lock,
   delete or ledger changes. The compiled page-family text therefore contains
   `not ("page_revisions"."kind" = 'publish' and not exists (` and
   `published.kind = 'publish'`.
2. Rewrite the module header paragraph `:27-33` to state the binding
   semantics: "published anchor — on the kind-bearing families (page,
   detail_page) the newest `kind='publish'` row per parent (by `(version,
   id)`) is never a candidate; older publish rows and autosaves newer than it
   are ordinary candidates." Keep the docstring at `:451-455` consistent.
3. The file is 649 lines; the edit is a few lines net and stays far below
   1,000.

**Tests.**

- `tests/integration/server/task551RevisionRetention.test.ts` (allowlist
  `:338`, 945 lines):
  - dry-run SQL-text leg (`:579-581`): keep `'"page_revisions"."kind" =
    \'publish\''` (the outer check still exists) and `"not exists"`, and
    additionally pin `"published.kind = 'publish'"` and
    `'not ("page_revisions"."kind" = \'publish\' and not exists'`;
  - family-mapping loop (`:689-691`): additionally assert
    `statement.includes("published.kind = 'publish'")` equals `kindBearing`
    for all five families;
  - add ONE `testIfDb` leg with at least two publish rows on one parent,
    driven through `pruneParentRevisions` (`expectPrune`, `:770`) so shared
    table rows of other parents cannot interfere, for example seeds
    `[1, "publish", -10]`, `[2, "autosave", -9]`, `[3, "publish", -8]`,
    `[4, "autosave", -7]`, `[5, "autosave", 1]` with
    `dbPolicy("page", { keepNewestPerParent: 1 })` (`:318`): expect
    `matched = deleted = 3` and `pageSurvivors` (`:741`) equal to
    `["3:publish", "5:autosave"]` — the older publish v1 is deleted, the
    newest publish v3 survives old, and the autosave v4 newer than the anchor
    is an ordinary candidate. Under the defective predicate this leg keeps v1
    (2 deleted), so it fails before the fix. Budget: about 20 added lines,
    the file stays under 1,000.
  - The existing DB legs (`:782-814`, `:872-897`) are unchanged and must stay
    green.
- `tests/perf/database-revision-budgets.test.ts` (allowlist `:339`, 962
  lines): the retention leg seeds 560 `publish` rows (`segment`/`rev` default
  kind `"publish"`, `:700-709`; seeds `:862-867`), so it depends on R7-F1.
  Its dry-run expectation `:943` `[probe.batches, probe.matched]` becomes
  `[1, 500]`: a whole-family dry-run is exactly one candidate read
  (`runRevisionFamilyRetention` dry-run branch `:615-618`, docstring
  `:601-605`) bounded by `policy.batchSize` 500 (`runRetentionBatch`
  `:520-545`, `selectCandidateIds` `.limit(limit)` `:495`), so `505` was a
  test defect independent of R7-F1. The apply expectations (`:950` `[505,
  505]`, `:951` `[500, 5]`, `:955`/`:959` `55`) are correct under the fixed
  predicate and stay unchanged.

### R7-F2 (HIGH, product) — allocated page revisions lose `pageId`

**Finding.** `mapAllocatedRevisionRow` (`core/services/pages/revisionService.ts:186-189`)
takes `created: unknown` and casts it to `RevisionRow`. The allocator returns
`Revision<T>` (`core/services/database/revisionAllocation.ts:88-97`), whose
parent key is `parentId`, not `pageId`; the page writer maps
`parentId: row.pageId` (`:291-300`, `:294`). So `createRevisionTx`
(`revisionService.ts:451`, also behind `createRevision`) and the autosave
changed path (`:539`) return `pageId: undefined`;
`tests/integration/server/task551RevisionConcurrency.test.ts:541`
(`expect(row.pageId).toBe(page.id)`) fails on the real database. The stub
unit legs never asserted `pageId` on an allocated row.

**Disposition (production).** Replace the cast with an explicit, typed
mapping; no `unknown` cast remains:

```ts
import { allocateRevision, type Revision, revisionScopeDigest, withRevisionParentLock }
  from "../database/revisionAllocation";

const mapAllocatedRevisionRow = (
  created: Revision<unknown>,
  kind: PageRevisionKind
): PageRevisionRecord =>
  mapRevisionRow({
    id: created.id,
    pageId: created.parentId,
    version: created.version,
    kind: created.kind ?? kind,
    data: created.data,
    createdAt: created.createdAt,
    createdBy: created.createdBy,
  });
```

The two call sites (`:451`, `:539`) are unchanged. No author columns are
mapped, so `createdBy` stays `null` on these paths exactly as today (R6 B3).
`revisionService.ts` is 678 lines after R6.

**Tests.** `tests/unit/pages/revisionService.test.ts` (988 lines after R6;
the stub `insertReturningResult` already carries `pageId`, `:338-340`):

- autosave replacement leg: add `pageId: PAGE_ID` to the
  `toMatchObject` at `:684` (prettier may wrap it; at most +5 lines);
- DB leg: add `expect(rev1.pageId).toBe(page.id);` beside
  `expect(rev1.kind).toBe("publish");` (`:859`), covering `createRevisionTx`
  through `createRevision`.

The file must stay at or under 1,000 lines. If it would not fit, drop the
unit edits in the order DB leg, then stub leg; the concurrency suite
(`task551RevisionConcurrency.test.ts:541`, unchanged) remains the required
real-database proof, and at least the stub-leg assertion is required if it
fits.

### R7-F3 (MEDIUM, fixture) — budgets marker user collides on `users_email_unique`

**Finding.** In `tests/perf/database-revision-budgets.test.ts`,
`seedMarkerUser()` (`:669-676`) inserts `email: \`${RUN}@fixture.invalid\``
(`:672`) and is called twice per run, by the list leg (`:799`) and the
autosave leg (`:838`). `users.email` is `UNIQUE`
(`core/db/tables/identity.ts:34`; constraint `users_email_unique`,
`core/db/migrations/0000_good_beyonder.sql:35`), so the second leg fails on
insert.

**Disposition (test only).** `seedMarkerUser(suffix: string)` inserts
`email: \`${RUN}-${suffix}@fixture.invalid\``; the list leg calls
`seedMarkerUser("list")`, the autosave leg `seedMarkerUser("autosave")`. The
`afterAll` cleanup (`:661-667`, `like(users.email, \`${RUN}%\`)` at `:666`)
already covers both markers and is unchanged. No assertion changes.

### R7-F4 (environment precondition) — online indexes absent on `coderso02`

**Finding.** The unique index `page_revisions_page_version_idx`
(`core/db/tables/pages.ts:107`) is created only by
`core/db/migrations/0081_task551_online_indexes.sql:11`. That file holds 89
top-level `CREATE [UNIQUE] INDEX CONCURRENTLY` statements (8 unique, 81
non-unique; one more line mentions the phrase in the header comment) and is
deliberately absent from `core/db/migrations/meta/_journal.json`
(`0081_task551_online_indexes.sql:1-8`); it is the separately validated
operations phase executed by `scripts/task-551-online-indexes.ts`. It had
not been applied to `DATABASE_URL3`, so the lock-bypass guard in
`tests/integration/server/task551RevisionConcurrency.test.ts:681`
(`expect(thrown).toBeInstanceOf(allocation.RevisionConflictError)`) sees no
unique violation. R6 B2's "`DATABASE_URL3` migration ledger equals the HEAD
journal (80 entries including `0081`)" covers only the transactional
`0081_task551_search_indexes_constraints_outbox` entry and does not imply the
online indexes exist; it is read with this qualification.

**Disposition.** No test or source change. Precondition for the executed
DB-leg receipt: the orchestrator applies the online-index step to
`coderso02` through `scripts/task-551-online-indexes.ts`, records the exact
command form once known, and verifies `page_revisions_page_version_idx`
exists and is valid (`pg_index.indisvalid` and `indisready` true) before the
owner-map run.

### R7 scope, gates and receipt

**Scope.** R7 edits exactly five files, all in the envelope allowlist:
`core/services/content/revisionRetentionService.ts` (`:331`, 649 lines),
`core/services/pages/revisionService.ts` (`:332`, 678),
`tests/unit/pages/revisionService.test.ts` (`:335`, 988),
`tests/integration/server/task551RevisionRetention.test.ts` (`:338`, 945)
and `tests/perf/database-revision-budgets.test.ts` (`:339`, 962).
`tests/integration/server/task551RevisionConcurrency.test.ts` (`:337`, 752)
is executed, not edited. Every touched file stays at or under 1,000 lines.
The retention consumers `tests/integration/server/task551RetentionJobService.test.ts`
and `tests/perf/database-retention-jobs.test.ts` exist, are owned by
TASK-551-06-L03 (its task file `:37-38`), are NOT in this envelope, and are
not edited; they only import `REVISION_RETENTION_FAMILY_ORDER` / name
`runRevisionFamilyRetention` as a source, and the job-service suite seeds
autosave page revisions only (`:268-272`), so no expectation depends on the
publish semantics. They run as execution-only orchestrator receipts.

**Gates**, in order (the envelope's `revision-service-unit-tests` and
`revision-concurrency-and-budget-tests` suites plus `core-lint` and
`core-lint-types`, in R6 B2's exact forms):

1. Airtight form (DB legs skip):
   `cd /home/coder/project/Coderso-551 && env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/unit/pages/revisionService.test.ts tests/integration/server/task551RevisionConcurrency.test.ts tests/integration/server/task551RevisionRetention.test.ts tests/perf/database-revision-budgets.test.ts tests/integration/server/task551RetentionJobService.test.ts tests/perf/database-retention-jobs.test.ts`.
2. Closed owner-map form on `DATABASE_URL3`, after the R7-F4 precondition:
   `env -i PATH=… HOME=… DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_URL=<URL3> TASK551_FIXTURE_DATABASE_NAME=coderso02 TASK551_FIXTURE_DATABASE_SENTINEL=<bootstrap sentinel> bun --env-file=/dev/null test <the same six files>`,
   with zero skipped DB legs in the four 06-L02 files.
3. `./node_modules/.bin/eslint --max-warnings=0` on the five edited files.
4. `bun --cwd core lint:types`, run by the orchestrator between phases.

**Receipt.** The orchestrator appends one R6+R7 addendum to
`_docs/_workflows/_smoke/task-551/impl-06-l02.json` (final bytes, line
counts, sha256, the R7-F4 online-index command and verification, and the
command results of gates 1-3), marking the earlier DB-leg evidence as
reviewed-not-executed and superseded by the executed receipts. This task
file records the contract only.

### R7 amendments (round 2, 2026-09-25)

Append-only corrections after the two R7 pre-implementation audits (1 HIGH, 4
MEDIUM, LOWs). The orchestrator took each decision below; every anchor was
re-grounded on 2026-09-25 at HEAD `9c5b6666` plus the uncommitted R6 edits,
before any R7 source edit, so line numbers are pre-R7. Each item quotes the
R7 sentence it supersedes; the amendment wins and the quoted sentence is read
as replaced. The Workflow Dispatch Envelope, `**Status:**` and
`**Changelog:**` stay unchanged.

**G1 (HIGH, orchestrator decision) — the page whole-family floor never drops
below the per-page ceiling.** Two knobs govern `page_revisions`:

- the per-page `settings.revisionRetention`
  (`core/services/pages/revisionRetention.ts:4-6`: default 10, min 1, max
  `MAX_PAGE_REVISION_RETENTION = 100`; `_docs/PAGE_MODEL.md:990-993`,
  `:2420`), applied on the request path: `pageService.ts:229`/`:238` ->
  `pruneRevisionsTx` (`revisionService.ts:571-585`) ->
  `normalizeRevisionRetentionPolicy("page", { keepNewestPerParent })`
  (`:580-582`) -> `pruneParentRevisions` (`:584`);
- the whole-family `keepNewestPerParent`
  (`REVISION_RETENTION_DEFAULT_KEEP_NEWEST_PER_PARENT = 50`,
  `revisionRetentionService.ts:99`, env bounds 1..500), which
  `runRevisionFamilyRetention` (`:607-620`) applies alone.

Once R7-F1 makes older publish rows prunable, a page whose own setting keeps
100 rows would lose rows 51..100 (when older than `maxAgeDays`) on the next
scheduled pass. Decision (hard floor): for the `page` family only, every
whole-family pass uses the effective floor
`max(policy.keepNewestPerParent, MAX_PAGE_REVISION_RETENTION)`, whatever the
value's source (default, env key or typed input); the request path keeps the
per-page value. The `detail_page` family keeps the family default: no
per-document retention setting exists (`grep -i retention` over
`core/services/content/detailPage*.ts`, including
`detailPageDocumentService.ts` and `detailPageRevisionService.ts`, returns
nothing).

Named resolution function. The page policy is normalized by
`normalizeRevisionRetentionPolicy` (`revisionRetentionService.ts:315-400`),
but the floor MUST NOT be applied there: the request path shares it
(`revisionService.ts:580-582`, so a floor there would raise every page's own
value, e.g. 10, to 100); its env grammar rejects and never clamps (module
header `:58-65`); and the airtight pins of its raw output
(`task551RevisionRetention.test.ts:339-353`, `:397-403`, `:414-424`, budgets
`:496`) express the raw knob. The whole-family resolution point is
`runRevisionFamilyRetention` (`:612`), the single entry the TASK-551-06-L03
scheduler funnels through (`core/services/maintenance/retentionJobService.ts:804-813`
normalizes, `:826` re-feeds the policy). `revisionRetentionService.ts` adds one
exported pure helper and applies it at `:612`:

```ts
import { MAX_PAGE_REVISION_RETENTION } from "../pages/revisionRetention";

/**
 * Whole-family effective policy. On the `page` family the keep-newest floor
 * never drops below the per-page `settings.revisionRetention` ceiling, so a
 * whole-family pass never deletes a row a page's own setting could keep; the
 * request path (`pruneRevisionsTx` -> `pruneParentRevisions`) keeps the
 * per-page value. Every other family is returned unchanged.
 */
export function resolveWholeFamilyRetentionPolicy(
  policy: RevisionRetentionPolicy
): RevisionRetentionPolicy {
  if (policy.family !== "page") return policy;
  const keepNewestPerParent = Math.max(policy.keepNewestPerParent, MAX_PAGE_REVISION_RETENTION);
  return keepNewestPerParent === policy.keepNewestPerParent
    ? policy
    : Object.freeze({ ...policy, keepNewestPerParent });
}

// runRevisionFamilyRetention (:612)
const policy = resolveWholeFamilyRetentionPolicy(
  normalizeRevisionRetentionPolicy(family, options?.policy, options?.env)
);
```

`core/services/pages/revisionRetention.ts` (34 lines, zero imports, no Bun or
DB coupling) is imported, never edited; it is not in the envelope allowlist.
No cycle arises: `revisionService.ts` imports `revisionRetentionService.ts`,
which now imports the import-free `revisionRetention.ts`. The module header
env paragraph (`:59-65`) gains one sentence naming the page whole-family
floor. `pruneParentRevisions`, `assertPolicyForFamily` (100 lies inside
`KEEP_BOUNDS`) and the ledger shape are unchanged.

The budgets pin `database-revision-budgets.test.ts:496`
(`[policy.maxAgeDays, policy.keepNewestPerParent]` equals `[180, 50]` for
every family) asserts the RAW `normalizeRevisionRetentionPolicy` output with
an empty env. Under this placement the raw value stays 50, so `:496` is
UNCHANGED; the effective floor gets its own pin. G1 tests:

- `tests/perf/database-revision-budgets.test.ts`, airtight, beside `:496`
  (about +14 lines; imports `resolveWholeFamilyRetentionPolicy` and
  `MAX_PAGE_REVISION_RETENTION`): `MAX_PAGE_REVISION_RETENTION` is 100; with
  env `RETENTION_PAGE_REVISIONS_KEEP_NEWEST_PER_PARENT: "50"` the raw page
  policy keeps 50 and the resolved one 100; env `"150"` resolves to 150; an
  empty env resolves to 100; the resolved policy is frozen; for the other four
  families the helper returns the identical policy object (`toBe`).
- Same file, retention leg (`:869-962`), re-seeded so it keeps its
  multi-batch purpose AND proves the floor on the database: the floor segment
  `:881` becomes `segment(100, 511, "floor", old)` (610 rows); the typed
  `keepNewestPerParent: 50` at `:933` stays (raw 50, effective 100). Under the
  raw 50 the aged v511..v560 would also be eligible (555 matched), so the
  pins below fail without G1. `:944` `[0, 560]` becomes `[0, 610]`;
  `:955`/`:959` `55` become `105`; the comment `:876-877` names 610 rows and
  "the newest 100 held by the effective page floor"; `:943` `[1, 500]`
  (R7-F1), `:950` `[505, 505]` and `:951` `[500, 5]` stay.
- `tests/integration/server/task551RevisionRetention.test.ts`, airtight
  dry-run leg: `:578`
  `expect(spy.bound.filter((param) => param === 4)).toHaveLength(2);` becomes
  the same assertion on `MAX_PAGE_REVISION_RETENTION` (typed 4 resolves to
  100, bound as both probe LIMIT and compared count) plus a `param === 4`
  count of 0; the comment `:575-576` says so.
- Same file, DB legs. Add one seed helper
  `floorSeeds(first, count = MAX_PAGE_REVISION_RETENTION, kind = "autosave", offsetDays = 1)`
  returning `RevisionSeed[]` (`[first + index, kind, offsetDays]`) and a
  `version:kind` tag mapper for `pageSurvivors` comparisons.
  - Convergence leg (`:782-814`): replace `[7, "autosave", 1]`,
    `[8, "autosave", 2]` with `...floorSeeds(7)` (v7..v106); `:797`
    `toHaveLength(8)` becomes `toHaveLength(106)`; `:809` survivors become
    `["2:publish", "6:autosave", ...tags(floorSeeds(7))]`; the outcomes
    `[true, true, 1, 4, 0]` (`:800`), `[true, false, 3, 4, 4]` and
    `[true, false, 1, 0, 0]` stay; the comment `:784-786` names the effective
    floor instead of "the newest two".
  - Dry-run leg (`:816-839`): replace `[5, "autosave", 1]` with
    `...floorSeeds(5)` (v5..v104); `:828` `toHaveLength(5)` becomes
    `toHaveLength(104)`; `:836-838` compares the first five tags
    (`"1:autosave,...,5:autosave"`) and the length 104; both `[true, true, 1,
    3, 0]` outcomes stay.
  - NEW `testIfDb` leg, placed directly after the convergence leg and before
    the dry-run leg (the dry-run leg leaves three eligible rows behind, so a
    later whole-family run would count them): one marker page, seeds
    `floorSeeds(1, 105, "publish", -1)`; `const floored = policyInput({
    keepNewestPerParent: 50, batchSize: 500 })` (the typed 50 mirrors the
    scheduler's re-fed normalized policy); expect
    `expectRun("page", { ...floored, dryRun: true }, [true, true, 1, 5, 0])`,
    then `expectRun("page", floored, [true, false, 2, 5, 5])`, then survivors
    equal `tags(floorSeeds(6, 100, "publish", -1))`. It fails without G1 (55
    deleted) and without R7-F1 (0 deleted).
  - The per-parent legs (`:841-870`, `:872-897`) and the R7-F1 per-parent
    publish leg run through `pruneParentRevisions` and are unaffected.
  - Line budget: 945 lines plus about 20 (R7-F1 leg), 3 (R7-F1 pins), 10
    (helpers and import), 14 (G1 leg) and 3 (re-seeding) is about 995. If the
    file would exceed 1,000, the NEW G1 leg moves into the budgets retention
    describe instead (marker-scoped executor, `:887-926`); no assertion is
    dropped.

Collateral (blocks gate 2, outside this envelope): the TASK-551-06-L03 leg
`tests/integration/server/task551RetentionJobService.test.ts:654-692`
("revunit") seeds three aged autosaves (`:262-278`), runs the page family with
env keep 1 (`:663-670`) and expects `[3]` at `:687`. Under G1 the effective
floor is 100, nothing is deleted and `:687` sees `[1, 2, 3]`. This file is
owned by TASK-551-06-L03 and is not edited here. Handoff to TASK-551-06-L03
(see also G4): re-seed the fixture to `MAX_PAGE_REVISION_RETENTION + 3` aged
autosaves and expect survivors v4..v103, or scope the leg as G4 requires. Gate
2 below requires that re-baseline to have landed.

Handoff to TASK-551-10-L02: `_docs/PAGE_MODEL.md:990-993` and `:2420` and
`docs/guide/screens/page-editor-preview-settings-and-history.md:273-275`
must state that the per-page setting governs the request-path newest-N
count; the scheduler prunes only rows older than `maxAgeDays` beyond a floor
never below 100 for pages; the newest publish row per parent always survives;
older publish rows ARE prunable (new after R7). See G5 for the request-path
note.

This supplements R7-F1's reading of the Revision Retention Policy sentence
(`:807-812`) and the defaults sentence (`:58-59`, "`keepNewestPerParent=50`"):
50 is the raw normalized default; the page whole-family pass uses
`max(keepNewestPerParent, 100)`. It supersedes, in R7-F1 **Tests**, "The
existing DB legs (`:782-814`, `:872-897`) are unchanged and must stay green."
(`:880-881`) and "The apply expectations (`:950` `[505, 505]`, `:951`
`[500, 5]`, `:955`/`:959` `55`) are correct under the fixed predicate and
stay unchanged." (`:890-892`), both read as the G1 bullets above.

**G2 (MEDIUM, orchestrator decision) — `mapAllocatedRevisionRow` takes the
allocated row only.** Supersedes, in R7-F2, the parameter
`kind: PageRevisionKind` (`:916`), the field `kind: created.kind ?? kind,`
(`:922`) and "The two call sites (`:451`, `:539`) are unchanged." (`:929`).
The fallback is dead: `Revision<T>.kind` is a required `string`
(`core/services/database/revisionAllocation.ts:93`), the column is
`text("kind").notNull()` (`core/db/tables/pages.ts:97`), the unit stub row
carries a kind (`tests/unit/pages/revisionService.test.ts:338-340`), and
`mapRevisionRow` already normalizes through `normalizeRevisionKind`
(`revisionService.ts:124-125`, `:176`). The binding shape:

```ts
const mapAllocatedRevisionRow = (created: Revision<unknown>): PageRevisionRecord =>
  mapRevisionRow({
    id: created.id,
    pageId: created.parentId,
    version: created.version,
    kind: created.kind,
    data: created.data,
    createdAt: created.createdAt,
    createdBy: created.createdBy,
  });
```

Both call sites change: `revisionService.ts:451`
`return mapAllocatedRevisionRow(created, kind);` becomes
`return mapAllocatedRevisionRow(created);` and `:539` becomes
`return { revision: mapAllocatedRevisionRow(created), reusedRevision: false };`.
The pinned end marker in `tests/perf/database-revision-budgets.test.ts:470`
changes to exactly that `:539` text (allowlisted). No other test pins
`mapAllocatedRevisionRow` (grep over `tests/` and `core/`).

**G3 (MEDIUM, orchestrator record) — the online indexes were provisioned
directly.** Supersedes R7-F4 **Disposition** (`:982-987`, "the orchestrator
applies the online-index step to `coderso02` through
`scripts/task-551-online-indexes.ts`, records the exact command form once
known, ..."). What happened: on 2026-09-25 the orchestrator applied the 89
`CREATE [UNIQUE] INDEX CONCURRENTLY` statements of
`core/db/migrations/0081_task551_online_indexes.sql` (sha256
`35399069330baa449d559c6ea50eb695642ac43e590f6c9e845e14304ea5b092`, verified)
directly on `coderso02`, one statement at a time, outside any transaction, in
manifest order. This is ENVIRONMENT PROVISIONING ONLY: it is not a
TASK-551-05-L01 rollout receipt; `scripts/task-551-online-indexes.ts` was NOT
run; no `task551_migration_operations` row exists. Verification: 89/89
indexes present with `indisvalid AND indisready`, 0 missing. The R7 receipt
addendum records exactly this, in these terms.

**G4 (MEDIUM, orchestrator decision) — gate 2 has a zero-collateral
precondition.** Supersedes "so no expectation depends on the publish
semantics. They run as execution-only orchestrator receipts." (`:1003-1005`).
Under R7-F1 the whole-family runs' collateral scope widens: older publish rows
on ANY parent become eligible. Two legs run whole-family on the shared
tables: the L03 revunit apply (`task551RetentionJobService.test.ts:663-670`,
real clock, 30 days, keep 1) and the 06-L02 read-only guard
(`task551RevisionRetention.test.ts:800`, 2036 clock, 180 days, keep 2, exact
count 4). Before the owner-map run the orchestrator runs a read-only count
(one `READ ONLY` transaction with a statement timeout) of rows on non-marker
parents in `page_revisions` and `detail_page_revisions` that the FIXED
predicate (age AND keep-newest floor AND newest-publish anchor) makes
eligible under (2036 clock, 180 days, keep 2) and (now, 30 days, keep 1). The
raw keep values are used deliberately: for pages they are a superset of the
G1-floored set, and `detail_page` is not floored. Both counts must be 0 and
are recorded in the receipt. Measured 2026-09-25: `coderso02` holds 0
`page_revisions`, 0 `detail_page_revisions`, 0 `post_revisions`, 0
`widget_template_revisions`, 0 `pages` and 0 `users`. Gate 2 is valid only
under this precondition. Handoff to TASK-551-06-L03: scope its revunit leg
to marker parents or guard it with the same read-only count, together with
the G1 re-seed.

**G5 (LOW) — anchors, gate scope and handoffs.**

- R7-F1 budgets seeds anchor: "seeds `:862-867`" (`:884`) reads "seeds
  `:876-883`" (the cutoff/old constants, the comment and the three
  segments).
- Gates 1 and 2 deliberately omit `tests/unit/content/detailPageRevisionService.test.ts`,
  although the envelope's `revision-service-unit-tests` command lists it: R7
  does not touch that file or its production module. "in R6 B2's exact
  forms" is read with this omission.
- Handoff to TASK-551-06-L03: its anchors into `revisionRetentionService.ts`
  (`:428` at its task file `:436`, `:607` at `:442`, `:585` at `:465`, and
  `:203-216`, `:608`, `:308-319` at `:466-468`) shift with the R7-F1 and G1
  edits. The receipt records the post-implementation line numbers of
  `RevisionRetentionExecutor`, `RevisionRetentionRunOptions`,
  `runRevisionFamilyRetention` and `resolveWholeFamilyRetentionPolicy`.
- Handoff to TASK-551-10-L02 (request path, in addition to G1): with R7-F1 a
  page's request-path prune now deletes older publish rows that are older
  than the family `maxAgeDays` (180 by default) and beyond the per-page
  `settings.revisionRetention` floor; the newest publish row per page always
  survives.

**Scope after G1-G5.** Still exactly the five R7 files of "R7 scope, gates
and receipt", all in the envelope allowlist (`:331`, `:332`, `:335`, `:338`,
`:339`); `core/services/pages/revisionRetention.ts` is imported only. Every
touched file stays at or under 1,000 lines.

### R7 amendments (round 3, 2026-09-25)

Append-only corrections after the two re-audits of the round-2 amendments (2
MEDIUM, LOWs). Anchors were re-grounded on 2026-09-25 at HEAD `9c5b6666` plus
the uncommitted R6 edits and before any R7 source edit, so source and test
line numbers are pre-R7; task-file anchors refer to this file. Each item
quotes the sentence it supersedes; the amendment wins. The Workflow Dispatch
Envelope, `**Status:**` and `**Changelog:**` stay unchanged.

**H1 (MEDIUM) — the docs handoff names an owner that owns the docs.**
Supersedes the G1 handoff (`:1182-1188`, "Handoff to TASK-551-10-L02:
`_docs/PAGE_MODEL.md:990-993` and `:2420` and
`docs/guide/screens/page-editor-preview-settings-and-history.md:273-275` must
state that the per-page setting governs the request-path newest-N count; the
scheduler prunes only rows older than `maxAgeDays` beyond a floor never below
100 for pages; the newest publish row per parent always survives; older
publish rows ARE prunable (new after R7). See G5 for the request-path note.")
and the G5 handoff bullet (`:1283-1287`, "Handoff to TASK-551-10-L02 (request
path, in addition to G1): with R7-F1 a page's request-path prune now deletes
older publish rows that are older than the family `maxAgeDays` (180 by
default) and beyond the per-page `settings.revisionRetention` floor; the
newest publish row per page always survives."). Both read as one handoff,
owned through TASK-551-10-L02 dated correction 2026-09-25 (06-L02 R7 docs
mirror), which adds `_docs/PAGE_MODEL.md` and
`docs/guide/screens/page-editor-preview-settings-and-history.md` to the
TASK-551-10-L02 allowlist and Documentation Updates. The docs at
`_docs/PAGE_MODEL.md:990-993`, `:2420` and
`docs/guide/screens/page-editor-preview-settings-and-history.md:273-275` must
state:

- Request path (`pruneRevisionsTx`, `core/services/pages/revisionService.ts:571-585`;
  policy at `:580-582`, prune at `:584`): the per-page
  `settings.revisionRetention` keeps the newest N rows of ANY kind (publish
  rows plus the latest autosave), and a row beyond that count is deleted only
  when it is older than the family `maxAgeDays` (180 by default).
- Lifecycle/full-site path (`preparePageLifecycleNativeTargets`,
  `core/services/pages/pageService.ts:586`; retention at `:633-643`): keeps
  the N newest PUBLISH rows, without an age gate, and filters only publish
  rows. This is a divergent interpretation of the same setting; TASK-551-10-L02
  reconciles it in the docs (and records any product follow-up) instead of
  describing one path as the whole contract.
- The scheduler's whole-family page floor is never below 100
  (`MAX_PAGE_REVISION_RETENTION`, G1).
- The newest publish row per parent always survives; older publish rows are
  prunable once they are older than `maxAgeDays` and beyond the applicable
  floor (new after R7-F1).

**H2 (MEDIUM) — plan evidence for the fixed page candidate read.** Adds one
orchestrator receipt step to "R7 scope, gates and receipt" after gate 2 and
before the receipt addendum is written. The measured statement is the fixed
page whole-family candidate read: the SELECT compiled by `selectCandidateIds`
(`core/services/content/revisionRetentionService.ts:486-496`, invoked through
`runRetentionBatch` `:520`/`:529` with the `age` order from
`runRevisionFamilyRetention` `:616`) with the `where` from
`buildEligibilityWhere` (`:465-476`, `parentId` null, the fixed
`publishedAnchorProbe` `:456` and `keepNewestFloorProbe` `:443`), effective
keep 100, cutoff 180 days, LIMIT = batch size 500. On `coderso02` the
orchestrator captures sanitized `EXPLAIN (ANALYZE, BUFFERS)` for:

1. a small fixture: about 600 `page_revisions` rows on one marker parent;
2. a large fixture: 100,000 `page_revisions` rows across at least 100 marker
   parents, seeded and deleted (marker-scoped, only its own rows) by a scratch
   script run under the closed env of gate 2;
3. a sparse-candidate case on the large fixture: every parent holds at most
   100 aged rows, so the read matches 0 rows and walks the whole aged range.

Each plan records rows scanned, shared buffers (hit/read), execution latency
against the 15 s statement timeout (`DB_STATEMENT_TIMEOUT_MS`,
`core/db/databaseConfig.ts:98`, default `:295-296`) and whether
`page_revisions_retention_idx` (`core/db/tables/pages.ts:114`, `(created_at,
id)`) is used. Budget: latency below 5 s and no sequential scan on
`page_revisions` at 100,000 rows. A breach is not a silent pass: the receipt
records it with the proposed mitigation as a handoff to TASK-551-06-L03 (known
limitation). This is receipt evidence in
`_docs/_workflows/_smoke/task-551/impl-06-l02.json`, not a test, and adds no
file to the R7 scope. Plans carry no secrets, no connection strings and no
row data.

**H3 (LOW) — line-budget fallback.** Supersedes, in G1, "If the file would
exceed 1,000, the NEW G1 leg moves into the budgets retention describe
instead (marker-scoped executor, `:887-926`); no assertion is dropped."
(`:1167-1170`). The primary path stays (the NEW G1 leg in
`tests/integration/server/task551RevisionRetention.test.ts`). If that file
would exceed 1,000 lines, the R7-F1 per-parent publish leg is folded into the
existing anchors leg (`:872-897`) as a third parent instead of a separate
`test(...)`; no assertion is dropped. The re-seeded budgets retention leg
already proves G1 on the database independently (555 matched without G1 vs
505 with it; 0 without R7-F1, because every budgets seed is a publish row,
`database-revision-budgets.test.ts:700-705`). The budget sentence "945 lines
plus about 20 (R7-F1 leg), 3 (R7-F1 pins), 10 (helpers and import), 14 (G1
leg) and 3 (re-seeding) is about 995." (`:1166-1167`) also counts the `:578`
edit (+1..2 lines): about 996-997.

**H4 (LOW) — `floorSeeds` signature.** Supersedes
"`floorSeeds(first, count = MAX_PAGE_REVISION_RETENTION, kind = "autosave", offsetDays = 1)`
returning `RevisionSeed[]`" (`:1139-1140`). The binding signature, over
`RevisionSeed` (`task551RevisionRetention.test.ts:718`):

```ts
const floorSeeds = (
  first: number,
  count: number = MAX_PAGE_REVISION_RETENTION,
  kind: RevisionSeed[1] = "autosave",
  offsetDays = 1
): RevisionSeed[] =>
  Array.from({ length: count }, (_, index): RevisionSeed => [first + index, kind, offsetDays]);
```

**H5 (LOW) — budgets seeds anchor.** Supersedes the G5 bullet's replacement
anchor "seeds `:876-883`" (`:1270-1272`). It reads "seeds `:874-883`": the
cutoff/old constants (`:874-875`), the comment (`:876-877`), the three
segments (`:878-882`) and the other-page seed (`:883`) of
`tests/perf/database-revision-budgets.test.ts`.

**H6 (LOW) — whole-family collateral scope.** Supersedes, in G4, "Two legs
run whole-family on the shared tables: the L03 revunit apply
(`task551RetentionJobService.test.ts:663-670`, real clock, 30 days, keep 1)
and the 06-L02 read-only guard (`task551RevisionRetention.test.ts:800`, 2036
clock, 180 days, keep 2, exact count 4)." (`:1250-1254`). It reads: every
whole-family page/detail_page/post leg of the 06-L02 and L03 suites runs on
the shared tables: `task551RevisionRetention.test.ts:800` (the read-only
guard), `:803`, `:812`, `:827`, `:830`, `:915` and the NEW G1 leg, plus the
L03 revunit leg (`task551RetentionJobService.test.ts:663-670`). The required
zero counts gain `post_revisions` under (2036 clock, 180 days, keep 1),
measured 0 on 2026-09-25; the `page_revisions` and `detail_page_revisions`
counts under (2036 clock, 180 days, keep 2) and (now, 30 days, keep 1) stay.
All three counts must be 0 and are recorded in the receipt.

**H7 (LOW) — gate cross-reference and receipt wording.** In the G1
collateral paragraph, "Gate 2 below requires that re-baseline to have
landed." (`:1179-1180`) reads "Gate 2 above (`:1013-1015`) requires that
re-baseline to have landed." G3 also supersedes the **Receipt** clause "the
R7-F4 online-index command and verification" (`:1021`): the addendum records
the direct 89-statement provisioning of
`core/db/migrations/0081_task551_online_indexes.sql` and its 89/89
`indisvalid AND indisready` verification, in G3's terms, plus the H2 plans
and the H6 zero counts.

**H8 (INFO) — anchor and count corrections.**

- The `revisionRetentionService.ts` module-header env paragraph is `:59-66`
  (reject-never-clamp at `:61-62`); "module header `:58-65`" (`:1068`) and
  "env paragraph (`:59-65`)" (`:1106`) both read `:59-66`.
- The round-2 preamble "(1 HIGH, 4 MEDIUM, LOWs)" (`:1028-1029`) reads "(1
  HIGH, 3 MEDIUM (G2-G4), LOWs)".
- Optional: the budgets comment `database-revision-budgets.test.ts:639-644`
  ("under the 50-row keep-newest floor") stays true under G1 (20 < 50 < 100)
  because it names the raw default; the implementer may add that the page
  whole-family floor is 100. Not required, and its assertions stay.

**Scope after H1-H8.** Unchanged: exactly the five R7 files of "R7 scope,
gates and receipt"; H2 adds orchestrator receipt evidence only. Every touched
file stays at or under 1,000 lines.

### R7 amendments (round 4, 2026-09-25)

Append-only corrections from the TASK-551-03-L02 round-3 orchestrator
dispositions (`_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round3-dispositions.md`,
item R3-34) and one gate-2 environment note measured by the orchestrator on
2026-09-25. Anchors were re-grounded on 2026-09-25 at HEAD `9c5b6666` plus the
uncommitted R6/R7 edits. Each item quotes the sentence it supersedes; the
amendment wins. The Workflow Dispatch Envelope, `**Status:**` and
`**Changelog:**` stay unchanged.

**I1 (MEDIUM, ownership) — `pageService.ts` is owned by TASK-551-09-L02.**
Supersedes, in the R6 round-3 "Remaining divergence" paragraph (`:693-698`),
"`pageService.ts` is owned by TASK-551-03-L02; this is recorded as a handoff
to TASK-551-03-L02, whose wave W1 may align it under the same rule."
(`:696-698`). Verified owner: `core/services/pages/pageService.ts` is in the
TASK-551-09-L02 envelope `allowlist` (its task file `:328`) and in no
TASK-551-03-L02 allowlist. The legacy `listPages` hash-only author rule
(`pageService.ts:163-173`, `email: resolveEmailValue(...) ?? ""`) is handed
to TASK-551-09-L02, which takes it in its dated section "Dated Contract
Corrections — 2026-09-25 (mirror of TASK-551-03-L02 round 3 R3-34;
append-only)", item M1: `author` is `null` when no email resolves, the same
rule as R6. TASK-551-03-L02 C10 v3 pins the same rule for its new
`pageReadService` DTO (R3-34). The rest of the paragraph stands: R6 does not
touch `pageService.ts`, and no TASK-9999 leaf is allocated.

**I2 (environment, not product) — gate-2 lock timeout for the concurrency
suite.** Supplements gate 2 of "R7 scope, gates and receipt" (`:1013-1015`).
The closed owner-map environment of that gate adds exactly one key,
`DB_LOCK_TIMEOUT_MS=15000`, equal to `DB_STATEMENT_TIMEOUT_MS` (default
15,000, `core/db/databaseConfig.ts:293-299`). This satisfies the ordering rule
`lockTimeoutMs <= statementTimeoutMs` (`:309-314`) and the bound 50..30,000
(`:300`); the default is 5,000 (`:300`), applied as the session `lock_timeout`
(`core/db/client.ts:76`). Reason: the 50-way serialized autosave storm
(`tests/integration/server/task551RevisionConcurrency.test.ts:554-597`) needs
about 680 ms per transaction against the remote `coderso02`. The orchestrator
measured this on 2026-09-25: the default 5 s `lock_timeout` fails
reproducibly, and 14-15 s passes 12/12 runs. This matches the queue shape.
With the default pool (`DB_POOL_MAX` 10, `databaseConfig.ts:274`), up to
about nine server-side waiters queue on the parent lock, so the last waiter
waits about 9 x 680 ms ≈ 6.1 s. That is over 5 s and under 15 s, and the leg
stays inside `DB_LEG_CEILING_MS` 60,000 (`:130`). This is environment tuning
for the shared remote database only:

- no product code, default, test assertion or ceiling changes;
- the envelope `environmentProfile` (`task551-db-test`) and its command argv
  are not edited;
- the airtight gate 1 is unaffected.

The binding and the measurement (runs, failing default, passing value) are
recorded in the R6+R7 receipt addendum of
`_docs/_workflows/_smoke/task-551/impl-06-l02.json`.

**Scope after I1-I2.** Unchanged: exactly the five R7 files of "R7 scope,
gates and receipt". I1 is an ownership correction and I2 an orchestrator
environment binding; neither adds a file. Every touched file stays at or
under 1,000 lines.

## Dated Contract Corrections — 2026-09-25 (re-open R8: detail-page DB legs, sparse-range limitation; append-only)

This section is append-only. The Workflow Dispatch Envelope above (allowlist,
forbiddenPaths, `dependencies`, occurrence id `single`, its `dependsOn` and
command ids), `**Status:**` and `**Changelog:**` are unchanged; nothing in this
section edits them. Where an R8 item quotes an earlier sentence (task body, R6
or R7), the R8 item wins and the quoted sentence is read as replaced.

**Trigger.** The first executed run of the envelope's
`revision-service-unit-tests` command (`:362-375`) with
`tests/unit/content/detailPageRevisionService.test.ts` included, on
`DATABASE_URL3` (database `coderso02`: journal `0081`, 89 valid online
indexes, no foreign revision rows) under the closed owner-map form, failed all
four `testIfDb` DB legs of that file (group result 33 pass / 4 fail). The
orchestrator's diagnosis found two test defects (R8-1) and no product defect.
The H2 plan receipt also recorded one budget breach that this leaf does not
fix (R8-2). Every anchor below was re-grounded on 2026-09-25 against the
working tree: HEAD `9c5b6666` plus the uncommitted R6/R7 edits and the
TASK-551-06-L03 revunit re-seed.

### R8-1 (test defects) — detail-page DB-leg timeouts and a false seed premise

**File.** `tests/unit/content/detailPageRevisionService.test.ts` (947 lines).
It is in the envelope `allowlist` (`:336`) and in the
`revision-service-unit-tests` argv (`:365`). It is the only file R8 edits. No
production module changes: `core/services/content/detailPageRevisionService.ts`
(`:333`) is not touched, and `core/services/content/detailPageDocumentService.ts`
stays forbidden (TASK-551-09-owned).

**(a) Per-leg timeout.** The four DB legs are `:779` (list + point read),
`:816` (keyset cursor + foreign cursor), `:866` (restore/discard) and `:918`
(publish/foreign guards). On `coderso02` each leg takes 6.6-12.5 s, because
every remote transaction costs about 1.2-1.8 s. Bun's default per-test
timeout is 5 s. When a leg times out, its body keeps running while the
`afterEach` hook (`:159-179`) deletes the tracked detail pages, content types
and users. The late statements then fail with `detail_page_not_found`,
`detail_page_invalid` or `publish_revision_missing` (the throw at `:929`).
These are cleanup races, not product results.

Binding fix:

- declare one named constant next to `testIfDb` (`:50`), mirroring
  `DB_LEG_CEILING_MS` in
  `tests/integration/server/task551RevisionConcurrency.test.ts:130`:

  ```ts
  /** Remote owner-map legs cost ~1.2-1.8 s per transaction; bun's 5 s default is too short. */
  const DB_LEG_TIMEOUT_MS = 60_000;
  ```

- pass it as the third argument of all four `testIfDb(...)` calls
  (`:779`, `:816`, `:866`, `:918`). This is the repo convention for remote DB
  legs (`}, 60_000);`, for example
  `tests/unit/kits/fullSiteAdapterAtomicity.test.ts:707`);
- pass the same constant as the `afterEach` hook option
  (`afterEach(async () => { ... }, DB_LEG_TIMEOUT_MS)`; bun's `HookOptions` is
  `number | { timeout?: number }`). The hook runs the same remote deletes for
  each leg, one `deleteContentType` per tracked content type (two for legs
  `:816` and `:918`), so it must not time out under the default either. The
  hook's early return for the airtight form (`:160`) is unchanged.

No assertion, fixture value or cleanup statement changes in (a).

**(b) The seed premise is false.** Supersedes the `seedThreeRevisions` doc
comment (`:261-265`): "Three revisions for one parent through the real map: an
autosave (v1), a publish (v2), and a second autosave (v3) — autosave replaces
only its own kind, so all three rows stay distinct." Verified behavior:
`autosaveDetailPageDocument`
(`core/services/content/detailPageDocumentService.ts:614-657`) ends in
`createOrReplaceDetailPageAutosaveRevisionTx` (`:189-236`, called at `:648`).
That function creates the new autosave and then deletes EVERY earlier
autosave of the parent (`:226-231`, delete at `:230`). The v1 autosave is
therefore gone once v3 is written. The observed results were versions `[3, 2]`
where `:792` expects `[3, 2, 1]`, and `hasMore === false` where `:838`
expects `true`. `publishDetailPageDocument` (`:529-570`) inserts one
`publish` row (`:550`) from `currentDocument`. It never deletes an autosave,
and autosave never writes `currentDocument`.

Binding re-seed (test-only; the helper keeps its name):

```ts
/**
 * Three revisions for one parent through the real map: a publish (v1), an
 * autosave (v2), and a second publish (v3). Publish never removes an
 * autosave, so all three rows stay distinct; a later autosave would replace
 * every earlier autosave of the parent.
 */
const seedThreeRevisions = async (
  fixture: DetailPageFixture,
  label: string
): Promise<{ autosaveId: string }> => {
  await documentService.publishDetailPageDocument(fixture.detailPageId, fixture.actorId); // v1
  const autosave = await documentService.autosaveDetailPageDocument(
    fixture.detailPageId,
    { document: documentInput(fixture.contentTypeId, fixture.contentTypeSlug, `${MARKER}-${label}`) },
    fixture.actorId
  ); // v2
  await documentService.publishDetailPageDocument(fixture.detailPageId, fixture.actorId); // v3
  return { autosaveId: autosave.revision.id };
};
```

Leg `:779` becomes `const { autosaveId } = await seedThreeRevisions(fixture,
"autosave")`. It replaces the superseded assertions below with the
corrected ones:

- supersedes `:792` `toEqual([3, 2, 1])`: unchanged (`[3, 2, 1]`);
- supersedes `:793` `toEqual(["autosave", "publish", "autosave"])` with
  `toEqual(["publish", "autosave", "publish"])`;
- supersedes `:794` `expect(page.items[0]?.id).toBe(secondAutosaveId)` and
  `:795` `expect(page.items[2]?.id).toBe(firstAutosaveId)` with
  `expect(page.items[1]?.id).toBe(autosaveId)`;
- the summary-boundary check (`:803-804`) asserts
  `not.toContain(`${MARKER}-autosave`)`, and its comment reads "The autosave
  body never crosses the summary boundary.". The label exists only in the
  autosave revision's document, because publish snapshots the fixture's
  `currentDocument`;
- the point read (`:807-810`) reads `autosaveId` and expects
  `{ id: autosaveId, version: 2, kind: "autosave" }` and
  `full.document` `toMatchObject({ name: `${MARKER}-autosave` })`. The
  unknown-id `detail_page_revision_not_found` rejection (`:811-813`) stays.

The per-item loop (`:796-802`) holds unchanged, including
`createdBy === fixture.actorId`, because both publish calls pass
`fixture.actorId`. Leg `:816` calls `seedThreeRevisions(fixture, "page")`.
Its limit-2 cursor assertions (`:836-853`: page one `[3, 2]`, `hasMore`
true, cursor `version` 2 and `id === items[1].id`, page two `[1]`, three
distinct ids) and the foreign-cursor rejections (`:855-862`) hold unchanged.
Legs `:866` and `:918` do not use the helper and change only by (a).

**Line budget.** 947 lines, plus about 3 for the constant and its comment,
about 2 for the multi-line `testIfDb` closings, and about 1 for the hook, minus
about 3 in the one-autosave helper: about 950, well at or under 1,000.

### R8-2 (known limitation, handed to TASK-551-06-L03) — sparse aged range at 100k

**Evidence.** The H2 receipt
`_docs/_workflows/_smoke/task-551/audit-evidence/06-l02-r7-explain-receipt.json`
(untracked, generated 2026-09-25, `coderso02`) captured the fixed page
whole-family candidate read. That read is the SELECT from `selectCandidateIds`
(`core/services/content/revisionRetentionService.ts:485-507`, `age` order at
`:500`). Its `where` comes from `buildEligibilityWhere` (`:472-483`, with
`keepNewestFloorProbe` `:445` and `publishedAnchorProbe` `:462`), reached
from `runRevisionFamilyRetention` (`:631`, the `age` call at `:642`), with
effective keep 100, cutoff 180 days and LIMIT 500. These anchors supersede the
pre-R7 H2 anchors (`:486-496`, `:465-476`, `:456`, `:443`, `:616`). Worst
execution per case:

| Case | Shape | Worst | Plan |
| --- | --- | --- | --- |
| small | 1 × 600 aged, 500 eligible | 0.46 s | Seq Scan (600 rows; the no-Seq-Scan budget applies at 100k) |
| large | 100 × 1,000 aged = 100k, 90k eligible | 0.90 s (0.09 s warm) | Index Scan `page_revisions_retention_idx`, no Seq Scan |
| sparse | 100 × 100 aged = 10k, 0 eligible | 3.86 s (2.60 s warm) | Index Scan `page_revisions_retention_idx`, no Seq Scan |
| sparse_large | 1,000 × 100 aged = 100k, 0 eligible | cancelled at 15 s in all three runs | informational run at `statement_timeout` 120 s: 34.05 s, 100,000 rows removed by filter, no Seq Scan |

The first three cases are inside the H2 budget (5 s, no Seq Scan at 100k). At
the 100k sparse range the plan is still index-backed. The read walks every
aged row in `(created_at, id)` order and runs the correlated keep-newest probe
per row (99,000 loops), because no row qualifies to fill the `LIMIT`. Cost
grows linearly with the aged range, and the read exceeds the 15 s
`DB_STATEMENT_TIMEOUT_MS`. The receipt's `budgetVerdict` is
`{ pass: false, breaches: ["sparse_large"] }`.

**Correction of the receipt's handoff wording.** The receipt's third mitigation
says the L01 job timeout is "below the 10k-row sparse latency measured here".
The measured 10k sparse worst case (3.86 s) is just UNDER the L01
`RETENTION_STATEMENT_TIMEOUT_MS` of 4 s (`core/db/databaseLifecycle.ts:31`,
applied tx-locally at `core/services/maintenance/retentionJobService.ts:305`),
and the receipt's own flag `underRetentionJobTimeout4s_info` is `true`. The
margin is about 0.14 s, so there is no headroom: a slightly larger or colder
sparse range cancels inside the L01 job.

**Not a regression.** R7 does not introduce this cost. Before R7-F1 the
defective `publishedAnchorProbe` matched 0 rows on publish seeds. It also
could not fill the `LIMIT` and walked the same aged range with the same
per-row floor probe. The fixed predicate only changes which rows qualify.

**Known limitation, handed to TASK-551-06-L03** (its retention job owns
batching, high-water marks and timeout handling). L03 records at least:

1. bound the rows EXAMINED, not only the rows returned: take a keyset window
   over `page_revisions_retention_idx` (`core/db/tables/pages.ts:114`,
   `(created_at, id)`; the detail-page twin is `:185`), apply the floor and
   anchor probes to that window only, and persist a per-family
   `(created_at, id)` high-water mark so the next batch or run resumes after
   it (restart once the aged range is exhausted);
2. and/or semi-join only the parents that can hold a candidate at all (bounded
   `parent_id IN (… GROUP BY parent HAVING count(*) > keepNewest)`), so
   sparse parents cost no per-row probes;
3. map a statement-timeout cancel of the candidate read to
   `retention_batch_failed` (`REVISION_RETENTION_BATCH_FAILED`,
   `revisionRetentionService.ts:96`) as one bounded batch failure, with no
   retry loop inside the run.

This leaf changes no source for R8-2. The receipt is evidence, not a gate: no
test asserts these latencies, and the H2 "breach is not a silent pass" clause
(`:1365-1367`) is satisfied by this record and the handoff.

### R8 scope, gates and receipt

**Supersedes:**

- the R6 sentence
  "`tests/unit/content/detailPageRevisionService.test.ts` needs no change."
  (`:514-515`). R6 still needs no change there; R8 edits it for R8-1 only;
- the G5 bullet "Gates 1 and 2 deliberately omit
  `tests/unit/content/detailPageRevisionService.test.ts`, although the
  envelope's `revision-service-unit-tests` command lists it: R7 does not touch
  that file or its production module. "in R6 B2's exact forms" is read with
  this omission." (`:1273-1276`). From R8 on, the envelope command runs whole,
  with both files.

**Scope.** R8 edits exactly one file,
`tests/unit/content/detailPageRevisionService.test.ts`, for R8-1. The five R7
files are not edited again. They are re-executed as regression receipts only.
Every touched file stays at or under 1,000 lines.

**Gates**, in order:

1. Airtight form of `revision-service-unit-tests`:
   `cd /home/coder/project/Coderso-551 && env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/unit/pages/revisionService.test.ts tests/unit/content/detailPageRevisionService.test.ts`.
   It must show 0 fail, with the DB legs skipped.
2. Closed owner-map form of the same command on `DATABASE_URL3`, in R7 gate 2's
   environment plus I2's `DB_LOCK_TIMEOUT_MS=15000`. It must show 0 fail and
   0 skip in the four DB legs of `detailPageRevisionService.test.ts`. Expected
   group result: 37 pass / 0 fail (17 + 20 tests), where the pre-R8 run was
   33 pass / 4 fail.
3. Regression: `revision-concurrency-and-budget-tests` in the same closed
   form. Expected 79 pass / 0 fail, unchanged from R7.
4. `./node_modules/.bin/eslint --max-warnings=0 tests/unit/content/detailPageRevisionService.test.ts`,
   `wc -l` (at or under 1,000) and `git diff --check`.
5. `bun --cwd core lint:types`, run by the orchestrator between phases.

**Receipt.** Supersedes "The orchestrator appends one R6+R7 addendum to
`_docs/_workflows/_smoke/task-551/impl-06-l02.json`" (`:1019-1020`). The
addendum records R6, R7 and R8 together. For R8 it adds the final bytes, line
count and sha256 of the R8 file, and the executed counts of gates 1-3: the
pre-R8 33/4 group result and the post-R8 results. It also links the H2
receipt as known-limitation evidence (R8-2), not as a gate. This task file
records the contract only.

## Dated Contract Corrections — 2026-09-25 (re-open R9: bounded candidate examination; append-only)

This section is append-only. Its one exception is the in-place edit of the
Workflow Dispatch Envelope fence recorded in R9-5, which the orchestrator
pre-authorized for this re-open. `**Status:**` and `**Changelog:**` are
unchanged. Where an R9 item quotes an earlier sentence (task body, R7 or R8),
the R9 item wins and the quoted sentence is read as replaced. The R8 preamble
sentence "The Workflow Dispatch Envelope above (allowlist, forbiddenPaths,
`dependencies`, occurrence id `single`, its `dependsOn` and command ids),
`**Status:**` and `**Changelog:**` are unchanged; nothing in this section edits
them." stays true of R8 itself. R9 is the first re-open that edits the
envelope.

**Trigger and orchestrator decision.** R8-2 (`:1641`) recorded that the page
whole-family candidate read breaches the H2 budget on the 100k sparse aged
range (`sparse_large`: cancelled at 15 s in all three runs, 34.05 s at a 120 s
informational timeout, 99,000 correlated floor-probe loops; evidence
`_docs/_workflows/_smoke/task-551/audit-evidence/06-l02-r7-explain-receipt.json`,
`budgetVerdict` `{ pass: false, breaches: ["sparse_large"] }`). On 2026-09-25
the orchestrator decided that this leaf FIXES it, as the owner of the
candidate SQL. The fix is not handed to TASK-551-06-L03 and not moved to a new
leaf. Every anchor below was re-grounded on 2026-09-25 against the working
tree: HEAD `9c5b6666` plus the uncommitted R6/R7/R8 edits. Anchors into this
file are post-R9-5 line numbers: the envelope edit shifted every later line
by +2. Quoted text keeps its original anchors.

### R9-1 — Supersessions

- R8-2 heading qualifier "(known limitation, handed to TASK-551-06-L03)"
  (`:1641`) is read as "(fixed by R9)". The R8-2 **Evidence**, table,
  **Correction of the receipt's handoff wording** and **Not a regression**
  paragraphs (`:1643-1682`) stay accurate history of the pre-R9 state.
- Superseded (quoted, `:1684-1685`): "**Known limitation, handed to
  TASK-551-06-L03** (its retention job owns batching, high-water marks and
  timeout handling). L03 records at least:". The three numbered mitigations
  that follow (`:1687-1699`) are disposed of as follows:
  1. keyset window plus a persisted per-family `(created_at, id)` high-water
     mark: NOT adopted. R9 makes no schema change and persists no state;
  2. semi-join on the parents that can hold a candidate: ADOPTED, in the
     corrected form of R9-2 (a count over ALL rows of the parent, evaluated as
     an InitPlan array, not a bare `IN (subquery)`);
  3. map a statement-timeout cancel to `retention_batch_failed`: already
     true, no change. `runRetentionBatch` (`revisionRetentionService.ts:527`)
     catches every non-policy error at `:548` and throws
     `REVISION_RETENTION_BATCH_FAILED` (`:96`) at `:550`, and
     `drainRetentionBatches` has no retry loop.
- Superseded (quoted, `:1701-1703`): "This leaf changes no source for R8-2.
  The receipt is evidence, not a gate: no test asserts these latencies, and
  the H2 "breach is not a silent pass" clause (`:1365-1367`) is satisfied by
  this record and the handoff." From R9 on, this leaf changes source for
  R8-2 (R9-2). A DB leg asserts a latency bound (R9-5), and the re-run
  receipt is a gate (R9-6).
- Superseded (quoted, R7 H2, `:1366-1369`): "Budget: latency below 5 s and no
  sequential scan on `page_revisions` at 100,000 rows. A breach is not a
  silent pass: the receipt records it with the proposed mitigation as a
  handoff to TASK-551-06-L03 (known limitation)." It is replaced by the R9-6
  budget. A breach is now a failed R9 gate, not a handoff.
- Superseded (quoted, R8 gate 3, `:1735`): "Expected 79 pass / 0 fail,
  unchanged from R7." It is replaced by R9-7 gate 3.
- TASK-551-06-L03 R1-d
  (`TASK-551-06-L03-Maintenance-Scheduling-Partition-Readiness-And-Recovery.md:1154`,
  "KNOWN LIMITATION: sparse aged revision range at 100k") is superseded as a
  deferral. That file's own "R1 amendments" A2 (`:1339-1359`) already records
  only the DEPENDENCY: 06-L02 R9 code lands before the 06-L03 R1 gate run, and
  no `TASK-551-06-L04` is allocated. Its A3 land order (`:1361-1374`, step 2)
  places this R9 code with R8. R9 does not edit that file. This section is
  the R9 record that A2 points to.
- The receipt's `knownLimitationHandoff` object (`to: "TASK-551-06-L03"`) is
  superseded. The R9-6 re-run replaces it.

### R9-2 — Binding design: parent pre-filter in the whole-family candidate read

**File.** `core/services/content/revisionRetentionService.ts` (675 lines;
envelope `allowlist` `:331`). No schema, migration, index, persisted
high-water mark, export shape or ledger shape changes.

**Helper.** Add one private helper between `publishedAnchorProbe`
(`:462-470`) and `buildEligibilityWhere` (`:472-483`). The rendered text
must stay on one template line so the R9-5 SQL-text pins match the production
bytes:

```ts
/**
 * Whole-family parent pre-filter (R9): keeps only rows whose parent owns MORE
 * than `keepNewest` rows of any age, which the keep-newest floor probe
 * requires. The uncorrelated ARRAY sub-select runs once per statement as an
 * InitPlan, and `= any(...)` is a cheap scan-level qual that PostgreSQL
 * evaluates before the correlated probes. A bare `IN (subquery)` is not
 * equivalent: the planner may pull it up into a semi-join and push the probes
 * below it into the scan filter.
 */
const candidateParentPrefilter = (spec: RevisionFamilySpec, keepNewest: number): SQL => {
  const parent = sql.raw(`candidate_parents.${spec.parentColumnSql}`);
  return sql`${spec.parentColumn} = any(array(select ${parent} from ${spec.table} candidate_parents group by ${parent} having count(*) > ${keepNewest}))`;
};
```

`spec.parentColumnSql` comes from the closed `REVISION_FAMILY_SPECS` map
(`:158-194`), as in the two existing probes (`:448`, `:467`). It is never
input. The sub-select references only its own alias `candidate_parents` and
never the outer row, so it stays uncorrelated.

**Where.** `buildEligibilityWhere` (`:472-483`) puts the pre-filter in the
first conjunct slot. That slot holds the parent equality on the request path:

```ts
  and(
    parentId === null
      ? candidateParentPrefilter(spec, policy.keepNewestPerParent)
      : eq(spec.parentColumn, parentId),
    lt(spec.createdAtColumn, cutoff),
    keepNewestFloorProbe(spec, policy.keepNewestPerParent),
    publishedAnchorProbe(spec)
  );
```

`selectCandidateIds` (`:485-507`) is unchanged: same projection, `age` order
`created_at ASC, id ASC`, `LIMIT batchSize`, and `FOR UPDATE SKIP LOCKED` on
apply only. The keep-newest floor probe (`:445-451`) and the published anchor
(`:462-470`) stay unchanged as the EXACT eligibility test. The pre-filter only
decides which rows reach them. For the page family (effective keep 100,
cutoff 180 days, LIMIT 500) the compiled whole-family statement is expected to
read:

```text
select "id" from "page_revisions" where ("page_revisions"."page_id" = any(array(select candidate_parents.page_id from "page_revisions" candidate_parents group by candidate_parents.page_id having count(*) > $1)) and "page_revisions"."created_at" < $2 and (select count(*) from (... limit $3) newer_rows) = $4 and not (...)) order by "page_revisions"."created_at" asc, "page_revisions"."id" asc limit $5
```

The bind order is `[100, <cutoff>, 100, 100, 500]`. `keepNewest` is bound
three times and is never used in JS arithmetic.

**Request path: skipped, by decision.** `pruneParentRevisions` (`:659-675`,
`parentId` non-null) keeps the plain parent equality and gets no pre-filter.
Reasons:

1. The equality already bounds the rows examined to one parent's history,
   through the per-parent version indexes;
2. an uncorrelated pre-filter would aggregate the WHOLE family table on every
   request-path prune. That turns an O(parent rows) read into an O(family
   rows) read, a regression on the save path;
3. a parent-scoped variant (`where candidate_parents.page_id = $parentId`) is
   redundant: it collapses to "this parent has more than k rows", which the
   per-row floor probe already decides, at no more than k probes of no more
   than k index entries each.

**Module header.** The header comment says, in the Batching paragraph
(`:47-48`), "the only `count(*)` in play is the in-SQL keep-newest probe,
compared in SQL, never in JS". That becomes false, so it is rewritten to: "every
`count(*)` in play (the keep-newest probe and the whole-family parent
pre-filter's `HAVING`) is compared in SQL, never read into JS". Add one
"Candidate examination (R9)" paragraph after the Ordering paragraph
(`:36-41`), summarizing the pre-filter, the request-path exclusion and the
residual bound of R9-4. Expected size: about 675 + 25 = about 700 lines.

### R9-3 — Proof: the pre-filter never excludes an eligible row

Take one family table `T` with parent column `P`. Let `k` be the effective
`keepNewestPerParent`, after `resolveWholeFamilyRetentionPolicy`
(`:615-624`), which gives page `k >= 100`. Let `c` be the cutoff. For a row
`r`:

- `A(r)`: `r.created_at < c`;
- `F(r)`, the floor probe: the `LIMIT k` sub-select of rows `n` with
  `n.P = r.P` and `(n.version, n.id) > (r.version, r.id)` returns exactly
  `k` rows. That holds exactly when at least `k` strictly newer rows of ANY
  age exist for `r`'s parent;
- `N(r)`: the published anchor;
- eligibility: `E(r) = A(r) AND F(r) AND N(r)`;
- the pre-filter: `G(r)` holds when `r.P` is in `S`, where
  `S = { p : count of ALL rows t with t.P = p > k }`.

**Claim: `F(r)` implies `G(r)`.** The `k` newer rows that `F(r)` requires
are distinct from `r`, because tuple order is strict, and they share `r`'s
parent. So that parent owns at least `k + 1` rows, `count(*) > k`, and `r.P`
is in `S`. Therefore `E(r) AND G(r)` equals `E(r)`: adding `G` never excludes
an eligible row, and it cannot admit one either, because it is a conjunct.

**Same snapshot.** Under READ COMMITTED, the InitPlan and the correlated
SubPlans of one statement read the same snapshot, so the implication holds
over the same row set. Under `FOR UPDATE SKIP LOCKED`, an EvalPlanQual
recheck reuses the statement-start `S`. Because `G` only removes rows, the
worst case is that a candidate waits for the next batch or run. It never
deletes a row that the exact test would keep. Revision rows are insert/delete
only.

**Why the count covers ALL rows, not only aged rows.** This corrects the
seed wording "`<createdAt> < $cutoff group by <parentColumn> having count(*) >
$keepNewest`". The floor probe counts newer rows of any age. Counterexample:
a parent holds 5 aged rows and 100 fresh rows, with `k = 100`. Each aged row
has at least 100 newer rows, so all 5 are eligible. But the parent's AGED
count is 5, which is not above 100, so an aged-only pre-filter would wrongly
drop them. The binding predicate therefore has no `created_at` condition
inside the sub-select. No extra `HAVING` term (for example
`min(created_at) < cutoff`) is added: `A(r)` stays in the outer query, and
one bind is enough (KISS).

### R9-4 — Cost, expected plan and residual bound

**Indexes (from the table modules).** Page: `page_revisions_page_id_idx`
(`core/db/tables/pages.ts:103`), `page_revisions_page_version_idx` (`:107`,
unique `(page_id, version)`), `page_revisions_page_kind_version_id_idx`
(`:108-113`) and `page_revisions_retention_idx` (`:114`, `(created_at, id)`).
Detail page: `detail_page_revisions_detail_page_id_idx` (`:176`),
`detail_page_revisions_detail_page_version_idx` (`:181-184`) and
`detail_page_revisions_retention_idx` (`:185`). The other three families have
the same `*_retention_idx` and a parent-leading version index
(`core/db/tables/widgets.ts:96-104`, `content.ts:133-140`,
`posts.ts:102-105`).

**Expected plan (PostgreSQL 18 on `coderso02`).**

```text
Limit
  -> Index Scan using page_revisions_retention_idx on page_revisions
       Index Cond: (created_at < cutoff)
       Filter: (page_id = ANY ((InitPlan 1).col1)) AND <anchor SubPlan> AND <floor SubPlan>
       InitPlan 1
         -> HashAggregate | GroupAggregate  (Group Key: page_id; Filter: count(*) > k)
              -> Seq Scan on page_revisions
                 | Index Only Scan using page_revisions_page_id_idx / page_revisions_page_version_idx
```

- The `= ANY` qual is ordered first: PostgreSQL orders scan quals by
  per-tuple cost, and an InitPlan array is charged once as startup cost.
  The anchor and floor SubPlans therefore run only for rows whose parent is
  in `S`.
- For `sparse_large` (1,000 x 100 aged, `k = 100`), `S` is empty. The floor
  and anchor SubPlan loops are 0, and the outer scan walks the aged index
  range with a cheap false qual. Expected cost: one aggregate pass over about
  100k rows (tens of ms) plus the index walk, where pre-R9 cost 99,000
  correlated probes (34 s).
- `= any(array)` is a linear search per row, because PostgreSQL hashes a
  ScalarArrayOp only when the array is a Const. Every member of `S` owns more
  than `k` rows, so `|S| <= floor(N / (k + 1))`: at most 990 elements for the
  page family at 100k rows.
- On apply, every batch statement re-runs the aggregate (at most
  `maxBatchesPerRun`: 10 by default, 100 at most). `S` is recomputed each
  time, so a parent that has been trimmed to `k` rows leaves `S`.

**Residual bound (recorded, not a gate, not handed off).** The SubPlans run
only for aged rows of parents in `S`, examined before the LIMIT fills. Per
parent, `created_at` rises with `version`, because allocation writes the row
at `now()`. So the oldest row of a parent in `S` is eligible once it is aged,
and the walk reaches it before that parent's non-eligible rows. Probes per
statement are then about `batchSize x (k + 1)` at most (page: about 500 x 101
= 50.5k), whatever the family size. The worst shape is a transient backlog:
many stale parents, each with just over `k` aged rows, laid out
parent-by-parent in time. The first apply batches trim those parents to `k`
rows, and then they leave `S`. R9 claims no latency for that shape. The
orchestrator MAY add an informational fifth receipt case (`dense_threshold`,
for example 1,000 parents x 101 aged rows with timestamps contiguous per
parent). That case is not an R9 gate.

### R9-5 — Tests and the envelope edit

**(1) SQL-text pins in `tests/integration/server/task551RevisionRetention.test.ts`**
(993 lines). This corrects the seed anchors `:580-581`/`:690-691`: the pins
actually sit at `:579-580` and `:689-690`. It is an intended contract change
named here:

- dry-run test "dry-run executes exactly one LIMIT-bounded read with no row
  lock" (`:555`). The comment at `:576-578` ends "bound as both the probe LIMIT
  and the compared count, never into JS arithmetic." It becomes "bound as the
  probe LIMIT, the compared count and the R9 parent pre-filter's HAVING bound,
  never into JS arithmetic." (still three lines). After `:579`
  (`toContain("newer_rows")`) add the full uncorrelated fragment pin:

  ```ts
      expect(statement).toContain(
        '"page_revisions"."page_id" = any(array(select candidate_parents.page_id from "page_revisions" candidate_parents group by candidate_parents.page_id having count(*) > $'
      );
  ```

  Re-baseline `:580`: `...toHaveLength(2)` becomes `...toHaveLength(3)` (the
  third bind is the HAVING bound). `:581` (`param === 4` has length 0) stays.
- family map test "pins the family->table map and the kind-bearing anchor
  probes" (`:671`). After `:690` (`toContain(parentColumn)`) add
  ``expect(statement).toContain(`group by candidate_parents.${parentColumn} having count(*) > $`);``
  This pins all five families.
- per-parent test "the per-parent prune drains in the contract version order
  and fails closed on ids" (`:636`). After `:649` add
  `expect(statement).not.toContain("candidate_parents");`, which pins the
  request-path exclusion. The comment at `:647-648` may append "(no
  whole-family pre-filter)" only if the line count stays the same.

Budget: about +5 lines, so 993 becomes about 998, at or under 1,000. No
assertion is weakened or removed. If prettier's output would take the file
over 1,000 lines, the implementer STOPS and reports. It must not move pins or
compress unrelated code.

**(2) DB leg placement.** It does not fit `task551RevisionRetention.test.ts`
(about 998 after (1)) or `tests/perf/database-revision-budgets.test.ts`
(983, and the leg is about 90 lines). It goes into the NEW file
`tests/perf/database-revision-candidate-bounds.test.ts`, which R9-5 (3)
pre-authorizes. `database-revision-budgets.test.ts` is not edited. File
shape (about 170 lines, bun lane):

- file header: TASK-551-06-L02 R9 candidate-examination bound; presence-only
  owner-map gate; no `.env`; marker-scoped seed and cleanup; no statement
  text or bind value printed;
- `OWNER_DB_TEST_MAP_PRESENT` and `testIfDb`, verbatim from
  `database-revision-budgets.test.ts:84-90`;
- constants: `FROZEN_NOW = new Date(TASK551_RETENTION_CLOCK_MS)` (from
  `./fixtures/task551DatabaseScale`), `DAY_MS = 86_400_000`,
  `SPARSE_PARENTS = 1_000`, `SPARSE_ROWS = 100`, `DENSE_ROWS = 105`,
  `CANDIDATE_READ_CEILING_MS = 5_000`, `DB_LEG_TIMEOUT_MS = 60_000`, and
  `POLICY = { family: "page", enabled: true, dryRun: true, maxAgeDays: 30,
  keepNewestPerParent: 50, batchSize: 500, maxBatchesPerRun: 10, now:
  FROZEN_NOW }`;
- pure leg (runs in the airtight form): normalize `POLICY` through
  `normalizeRevisionRetentionPolicy("page", POLICY, {})` and
  `resolveWholeFamilyRetentionPolicy`. Assert effective `keepNewestPerParent
  === MAX_PAGE_REVISION_RETENTION`, `SPARSE_ROWS === effective keep` (0
  eligible per sparse parent), `DENSE_ROWS - effective keep === 5`, and
  `SPARSE_PARENTS * SPARSE_ROWS + DENSE_ROWS === 100_105`;
- DB leg, `testIfDb("100,105 aged rows: the dry-run candidate read matches 5 in under 5 s", ..., DB_LEG_TIMEOUT_MS)`:

  ```ts
  const RUN = `task551-06l02-r9-bounds-${randomUUID()}`;
  afterAll(async () => {
    if (!OWNER_DB_TEST_MAP_PRESENT) return;
    // Fixture-scoped: marker pages only; their cascades own the seeded revisions.
    await db.delete(pages).where(like(pages.slug, `${RUN}%`));
  }, DB_LEG_TIMEOUT_MS);

  // Seed, set-based: one pages insert (1,001 rows) and one revisions statement.
  const cutoff = computeRetentionCutoff(FROZEN_NOW, POLICY.maxAgeDays);
  const aged = new Date(cutoff.getTime() - 170 * DAY_MS).toISOString();
  const parents = await db.insert(pages).values(
    Array.from({ length: SPARSE_PARENTS + 1 }, (_, index) => ({
      slug: `${RUN}-${index}`, title: RUN, status: "draft", currentData: {},
    }))
  ).returning({ id: pages.id });
  const denseSlug = `${RUN}-${SPARSE_PARENTS}`;
  await db.execute(sql`insert into page_revisions (page_id, version, kind, data, created_at)
    select p.id, v, 'publish', '{}'::jsonb, ${aged}::timestamp
    from pages p cross join lateral generate_series(1,
      case when p.slug = ${denseSlug} then ${DENSE_ROWS} else ${SPARSE_ROWS} end) v
    where p.slug like ${`${RUN}-%`}`);
  const parentIds = parents.map((row) => row.id);

  // Shared-database discipline: scope the family read to this run's parents,
  // as in database-revision-budgets.test.ts:925-941 (select wrapper only).
  // Dry-run never deletes, so `delete` throws a closed code if reached.
  const executor = scopedSelectExecutor(parentIds); // select wrapped; execute bound; delete throws "task551_l06l02_r9_unexpected_delete"

  const started = performance.now();
  const ledger = await runRevisionFamilyRetention("page", executor, { policy: POLICY });
  const elapsedMs = performance.now() - started;
  expect([ledger.dryRun, ledger.batches, ledger.matched, ledger.deleted]).toEqual([true, 1, 5, 0]);
  expect(elapsedMs).toBeLessThan(CANDIDATE_READ_CEILING_MS);
  // Dry-run left every seeded row in place.
  const [counted] = await db
    .select({ n: count() })
    .from(pageRevisions)
    .where(inArray(pageRevisions.pageId, parentIds));
  expect(counted?.n).toBe(100_105);
  ```

  The scope conjunct admits all 100,105 marker rows, so without the R9
  pre-filter every row is still probed. The pre-R9 statement is cancelled by
  the 15 s `DB_STATEMENT_TIMEOUT_MS` and surfaces as `retention_batch_failed`.
  So the leg fails red before R9 and goes green only with it. No `ANALYZE` is
  needed: the pre-filter's effect on qual order does not depend on
  statistics. Only `elapsedMs` of the one dry-run call is measured. Seeding and
  cleanup are outside the bound but inside `DB_LEG_TIMEOUT_MS`. The leg is
  marker-scoped, deletes only its own pages (cascade), and never prints
  statement text or ids.

**(3) Envelope edit (in place, pre-authorized; recorded here).** The fence
(`:321-438`) was edited on 2026-09-25 in exactly three places, and nothing
else changed:

- `allowlist`: after `"tests/perf/database-revision-budgets.test.ts"` (`:339`),
  append `"tests/perf/database-revision-candidate-bounds.test.ts"` (`:340`).
  Superseded list end (quoted): `"tests/perf/database-revision-budgets.test.ts"`
  followed by `]`;
- `revision-concurrency-and-budget-tests` `argv` (`:380`): append the new
  path. Superseded argv (quoted): `["bun", "--env-file=/dev/null", "test",
  "tests/integration/server/task551RevisionConcurrency.test.ts",
  "tests/integration/server/task551RevisionRetention.test.ts",
  "tests/perf/database-revision-budgets.test.ts"]`. It now has 7 tokens, well
  under the 128-token limit, and still starts `bun --env-file=/dev/null`;
- the same command's `positiveDiscovery`: the new path is appended to `paths`
  (`:384-389`), and `minimum` changes from `1` to `4` (`:390`), the path
  count. Superseded (quoted): `"minimum": 1`.

The family preflight
(`preflightTask551DispatchSnapshot({ sourceHead: '9c5b6666', taskFiles })`
over the repo-relative `_docs/_TASKS/TASK-551*` files) passed after the edit.
Command ids, lanes, `environmentProfile`, `dependencies`, occurrence
`single`, `forbiddenPaths` and every other command are unchanged. Outside
this leaf: TASK-551-10-L01's aggregate revision argv
(`TASK-551-10-L01-Small-Large-Load-Fault-Security-And-Redis-Smoke-Gates.md:1086-1094`
and `:1317-1319`) does not list the new file. Adding it belongs to that
leaf's owner. R9 does not edit it.

### R9-6 — EXPLAIN receipt (orchestrator re-run; now a gate)

After the R9 code lands, the orchestrator re-runs the H2 script with the same
production-builder capture method, the same four cases (`small`, `large`,
`sparse`, `sparse_large`), the same policy (effective keep 100, 180 days,
LIMIT 500) and the same marker/residue discipline. It updates
`_docs/_workflows/_smoke/task-551/audit-evidence/06-l02-r7-explain-receipt.json`
IN PLACE. Changes the receipt must show:

- `statementSource.sqlChecks`: `noParentFilter` is replaced by
  `parentPrefilterUncorrelated: true`, meaning the compiled SQL contains the
  R9-5 (1) fragment verbatim and the sub-select has no outer reference.
  `keepNewestProbeLimit100Twice` is replaced by `keepNewest100BoundThrice:
  true`. `paramShape` becomes `[100, "<cutoff timestamp = now - 180 days>",
  100, 100, 500]`. `sourceAnchors` are re-grounded to the post-R9 lines, and
  `compiledSql`/`compiledSqlSha256` are refreshed;
- budget, which every case must meet: worst measured execution below
  5,000 ms under the 15 s `statement_timeout`, with no informational extended
  timeout run needed. `sparse_large` must finish below 5 s. At 100k rows the
  plan may contain at most one Seq Scan on `page_revisions`, and only inside
  the InitPlan aggregate. The outer candidate scan uses
  `page_revisions_retention_idx`. The InitPlan appears exactly once. In
  `sparse_large` the floor-probe SubPlan loops are 0;
- rows returned are unchanged: `small` 500, `large` 500, `sparse` 0,
  `sparse_large` 0;
- `budgetVerdict` `{ pass: true, breaches: [] }`, top-level `pass: true`,
  `errors: []`, and `knownLimitationHandoff` replaced by `resolvedBy:
  "TASK-551-06-L02 R9"`. Residue is zero.

A breach is a failed R9 gate and blocks closure. Only the orchestrator may
decide what follows. It is never recorded as a handoff.

### R9-7 — Scope, gates, receipt and line counts

**Scope.** R9 edits exactly three code/test files:
`core/services/content/revisionRetentionService.ts` (R9-2),
`tests/integration/server/task551RevisionRetention.test.ts` (R9-5 (1)), and
the new `tests/perf/database-revision-candidate-bounds.test.ts` (R9-5 (2)).
All three are in the envelope `allowlist`. The R7/R8 files are not edited
again. No export, ledger, error code or policy knob changes, so the 06-L03
consumers (`runRevisionFamilyRetention` in `retentionJobService.ts`) need no
change.

**Gates**, in order, with the envelope forms and the closed owner-map
environment of R8 (`DATABASE_URL3`, `coderso02`, `DB_LOCK_TIMEOUT_MS=15000`):

1. `./node_modules/.bin/eslint --max-warnings=0 core/services/content/revisionRetentionService.ts tests/integration/server/task551RevisionRetention.test.ts tests/perf/database-revision-candidate-bounds.test.ts`.
2. Airtight:
   `cd /home/coder/project/Coderso-551 && env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/server/task551RevisionRetention.test.ts tests/perf/database-revision-candidate-bounds.test.ts`.
   It must show 0 fail. The DB legs skip by name, and the pure legs
   (including the three R9-5 (1) pins and the R9-5 (2) arithmetic leg) pass.
3. Closed owner-map `revision-concurrency-and-budget-tests` over the
   four-path argv. Expected 81 pass / 0 fail / 0 skip (R8's 79 plus the 2 new
   tests), with the R9 DB leg under 5,000 ms.
4. Regression: closed owner-map `revision-service-unit-tests`, expected
   37 pass / 0 fail, unchanged from R8.
5. `wc -l` on the three files (each at or under 1,000) and `git diff --check`.
6. Orchestrator, between phases: `bun --cwd core lint:types`, the R9-6
   receipt re-run, and the 06-L03 consumer suites in 06-L03 A3 step 4.

**Receipt.** The orchestrator's `impl-06-l02.json` addendum (R8 "Receipt",
`:1740-1746`) also records R9. It records the final bytes, line counts and
sha256 of the three R9 files, the executed counts of gates 1-5 (including the
DB leg's measured `elapsedMs`), the envelope edit of R9-5 (3), and the R9-6
receipt as a GATE (its `budgetVerdict`), no longer as known-limitation
evidence.

**Line counts.** At contract time: service 675, retention test 993,
budgets test 983 (not edited), and the new file 0. Expected after R9 code:
service about 700, retention test at or under 999, new file about 170, all at
or under 1,000. The implementer records the final `wc -l` values in its
report, and the orchestrator copies them into the receipt addendum.

## Dated Contract Corrections — 2026-09-25 (re-open R10: floor-join candidate read; supersedes R9 design; append-only)

This section is append-only. Nothing above it is edited. The Workflow Dispatch
Envelope fence already carries everything R10 needs, through the R9-5 (3)
edit: `allowlist` `:340`, argv `:380`, `positiveDiscovery` paths `:384-389`
and `"minimum": 4` at `:390`. R10 therefore does not touch the fence.
`**Status:**` and `**Changelog:**` are unchanged. Where an R10 item quotes an
earlier sentence (task body, R7, R8 or R9), the R10 item wins and the quoted
sentence is read as replaced. Anchors into this file are current line numbers.
R10 starts after `:2216`, so no earlier line moves. Every other anchor was
re-grounded on 2026-09-25 against HEAD `9c5b6666` plus the uncommitted working
tree. The R9 source never landed:
`core/services/content/revisionRetentionService.ts` is still 675 lines and
contains no `candidate_parents` (`grep -c` returns 0), and
`tests/perf/database-revision-candidate-bounds.test.ts` does not exist yet.

**Trigger and orchestrator decision.** The R9 design measurement found that the
R9-2 pre-filter (variant `B_r9_any_array`) fails in both directions:

- on `large` (100 × 1,000) and on `dense` (200 × 600, contiguous per parent)
  it hits the 15 s measurement `statement_timeout` in all four stats states;
- where it does finish, the outer candidate scan flips to
  `page_revisions_page_id_idx` with `page_id = ANY ((InitPlan …))` as its
  index condition, followed by a Sort, and the R7 probes still run on every
  fetched row. The measured `outerScanPerState` for `sparse_large` and `sparse`
  is `Index Scan[page_revisions_page_id_idx]` or `Bitmap Heap Scan`.

On 2026-09-25 the orchestrator decided the following:

- R9 v2 is variant F2, the "floor join", exactly as the design recommendation
  proposes. That recommendation is the result of workflow `wf_5aba58b2-4c7`
  that begins "Recommend R9 v2 = F2 'floor join'".
- The R9 `= any(array(... having count(*) > k))` pre-filter is WITHDRAWN and
  must not land.

R10 is binding. This leaf still FIXES R8-2 as the owner of the candidate SQL,
as R9 decided (`:1766-1769`).

**Evidence.** All runs used `coderso02` (PostgreSQL 18.4, `work_mem` 1654 kB,
`shared_buffers` 64 MB). Every receipt is sanitized, and its residue sweep
reports zero. The receipts live in
`_docs/_workflows/_smoke/task-551/audit-evidence/`:

- `06-l02-r9-design-explain.json` (run `d628c463`, `pass: true`). Variants
  `A_r7`, `B_r9_any_array`, `H_fenced_guarded`, `C_window`,
  `D1_window_aged_prescan`, `E_window_index_only` and
  `D2_window_group_prescan`.
- `06-l02-r9-f-floor-join-explain.json` (run `a44606f6`) and
  `06-l02-r9-f-floor-join-explain-part2.json` (run `84f5139b`). These cover
  variant F, the CTE form. Both report `pass: false` with one error,
  `run_failed:canceling statement due to statement timeout`. The recommendation
  attributes that error to harness housekeeping (the seed-stats and cleanup
  scans), not to a measured variant.
- `06-l02-r9-f2-prod-shape-explain.json` (run `07de0980`, `pass: true`,
  `errors: []`). This is F2 in the exact production shape. Its
  `variants.F2_floor_join_prod.sql` (1,324 characters, sha256
  `4335ee3c358334863bbb253ce95366e3fece28a7121f379815c59a5e6d300902`) is
  byte-identical to the page statement in R10-2.

The table gives milliseconds per case. The cells come from the recommendation
and were spot-checked against the F2R receipt. "Wide" means about 1.9 KB rows
(`data` carries 1,792 random hex characters). "Narrow" means `data '{}'`. The
four stats states are `as_is_custom`, `after_analyze_custom`,
`after_analyze_generic` and `after_vacuum_analyze_custom`, in that order.

| case | B (R9-2) | F2 (R10) |
|---|---|---|
| `large` 100 × 1,000 wide | timeout in all 4 states | worst 283 (P1 in all 4 states) |
| `sparse_large` 1,000 × 100 wide | worst 3,491 | 6,395 as-is cold (29.5k read blocks); 3,642 / 2,151 / 148 in the other three states (P2) |
| `dense` 200 × 600 contiguous wide, every 5th version publish | timeout in all 4 states | worst 204 (P1 in all 4 states) |
| DB-leg shape 1,000 × 100 + 1 × 105 narrow | worst 172 | 804 as-is; 162 / 203 / 60 (P2) |
| `backlog` 1,000 × 101 contiguous wide (informational in R9) | timeout | 2,184 / 1,209 / 1,356 / 332 (P2) |
| `many_parents` 20,000 × 5 wide (informational) | not measured | worst 2,414; 1,328 after VACUUM (P2) |

**Equivalence evidence.** The F2R `equiv` case has 300 parents with 0-259 rows
each, random kinds, and hour-truncated random timestamps with ties and fresh
rows: 40,265 rows in total, 8,660 of them eligible under the oracle. On it,
F2's full ordered set and its first 500 rows both equal the JS oracle. The
recommendation reports three such fixtures, with 7,395, 8,061 and 8,660
eligible rows.

**Rendering check.** A scratch script run on 2026-09-25 wrote no repository
file. It rendered the R10-2 builder shape through drizzle 0.45.2
`drizzle.mock()` for `page`, `detail_page` and `post`. Each statement was
byte-identical to its R10-2 text, the params were
`[100, "<cutoff ISO string>", 500]`, and the apply suffix was exactly
` for update of "<table>" skip locked`. It did NOT run the typecheck; see R10-2
**Typing**.

### R10-1 — Supersessions (quoted)

- R9-1 mitigation 2 (`:1786-1788`), quoted: "semi-join on the parents that can
  hold a candidate: ADOPTED, in the corrected form of R9-2 (a count over ALL
  rows of the parent, evaluated as an InitPlan array, not a bare
  `IN (subquery)`);". It now reads NOT adopted, because it measured as a
  regression. R10 computes each parent's floor and anchor once per statement
  (R10-2) instead. Mitigation 1 stays NOT adopted: no schema change and no
  persisted state. Mitigation 3 stays as R9-1 recorded it (`:1789-1793`).
- R9-1 (`:1797-1799`), quoted: "From R9 on, this leaf changes source for R8-2
  (R9-2). A DB leg asserts a latency bound (R9-5), and the re-run receipt is a
  gate (R9-6)." It now reads: the source change is R10-2, the DB legs are
  R10-5 (2), and the receipt gate is R10-7.
- R9-1 (`:1803-1804`), quoted: "It is replaced by the R9-6 budget. A breach is
  now a failed R9 gate, not a handoff." Here "the R9-6 budget" means the R10-7
  budget, and "R9 gate" means R10 gate.
- R9-1 (`:1805-1806`), which replaces R8 gate 3 with "R9-7 gate 3", is read as
  R10-9 gate 3.
- R9-1 (`:1815-1816`), quoted: "The R9-6 re-run replaces it." It now reads
  "The R10-7 re-run replaces it."
- R9-2 (`:1818-1900`) is WITHDRAWN as a whole. The `candidateParentPrefilter`
  helper is never written. Quoted:
  - heading `:1818`: "R9-2 — Binding design: parent pre-filter in the
    whole-family candidate read";
  - `:1824-1826`: "**Helper.** Add one private helper between
    `publishedAnchorProbe` (`:462-470`) and `buildEligibilityWhere`
    (`:472-483`).";
  - `:1850-1851`: "**Where.** `buildEligibilityWhere` (`:472-483`) puts the
    pre-filter in the first conjunct slot.";
  - `:1866-1868`: "The keep-newest floor probe (`:445-451`) and the published
    anchor (`:462-470`) stay unchanged as the EXACT eligibility test.";
  - `:1876-1877`: "The bind order is `[100, <cutoff>, 100, 100, 500]`.
    `keepNewest` is bound three times and is never used in JS arithmetic.";
  - `:1895-1900`: the header rewrite "every `count(*)` in play (the
    keep-newest probe and the whole-family parent pre-filter's `HAVING`) is
    compared in SQL, never read into JS", the "Candidate examination (R9)"
    paragraph, and "Expected size: about 675 + 25 = about 700 lines."

  One part survives in substance: R9-2's "**Request path: skipped, by
  decision.**" (`:1879-1891`). The per-parent statement stays byte-identical
  under R10-2.
- R9-3 (`:1902-1942`) is withdrawn, because it proves a withdrawn predicate.
  Its **Same snapshot** paragraph (`:1925-1931`) is carried into R10-3 by
  reference.
- R9-4 (`:1944-1999`) is withdrawn: the expected plan (`:1957-1968`), the cost
  bullets (`:1970-1985`) and the residual bound (`:1987-1999`). Quoted,
  `:1996-1999`: "R9 claims no latency for that shape. The orchestrator MAY add
  an informational fifth receipt case (`dense_threshold`, for example 1,000
  parents x 101 aged rows with timestamps contiguous per parent). That case is
  not an R9 gate." Under R10-7, `backlog` (that shape) and `dense` are GATED
  receipt cases. The R9-4 **Indexes** paragraph (`:1946-1956`) stays accurate.
- R9-5 (1) (`:2003-2036`) is replaced by R10-5 (1), and none of its three pins
  is written. Quoted:
  - `:2021-2022`: "Re-baseline `:580`: `...toHaveLength(2)` becomes
    `...toHaveLength(3)` (the third bind is the HAVING bound).";
  - the `candidate_parents` fragment pin (`:2012-2018`);
  - the `group by candidate_parents.${parentColumn}` pin (`:2023-2026`);
  - the `not.toContain("candidate_parents")` pin (`:2027-2031`).

  The budget sentence "Budget: about +5 lines, so 993 becomes about 998"
  (`:2033`) is replaced by the R10-5 (1) budget. The STOP rule (`:2034-2036`)
  stays.
- R9-5 (2) (`:2038-2115`) is amended by R10-5 (2). The placement in the new
  file stays, and so do the file-header discipline, the presence-only
  `testIfDb` gate, the marker-scoped seed and cleanup, the scoped select
  executor and the no-printing rule. Quoted:
  - `:2052-2053`: "`SPARSE_PARENTS = 1_000`, `SPARSE_ROWS = 100`,
    `DENSE_ROWS = 105`, `CANDIDATE_READ_CEILING_MS = 5_000`". Replaced by the
    R10-5 (2) constants; the ceiling is now 4,000 ms.
  - `:2043`: "(about 170 lines, bun lane)". Replaced by the R10-9 line budget.
  - `:2063`: the DB-leg title "100,105 aged rows: the dry-run candidate read
    matches 5 in under 5 s". Replaced by the three R10-5 (2) titles.
  - `:2107-2112`: "The scope conjunct admits all 100,105 marker rows, so
    without the R9 pre-filter every row is still probed. [...] So the leg fails
    red before R9 and goes green only with it. No `ANALYZE` is needed: the
    pre-filter's effect on qual order does not depend on statistics."
    Replaced by the R10-5 (2) red/green note.
- R9-5 (3), the envelope edit (`:2117-2143`), stays as recorded. R10 relies on
  it.
- R9-6 (`:2145-2175`) is replaced by R10-7. Quoted:
  - `:2147-2149`: "the same four cases (`small`, `large`, `sparse`,
    `sparse_large`)";
  - `:2154-2160`: the `sqlChecks` bullet (`parentPrefilterUncorrelated`,
    `keepNewest100BoundThrice`, `paramShape` `[100, "<cutoff timestamp = now -
    180 days>", 100, 100, 500]`);
  - `:2161-2167`: "budget, which every case must meet: worst measured
    execution below 5,000 ms under the 15 s `statement_timeout` [...] The
    InitPlan appears exactly once. In `sparse_large` the floor-probe SubPlan
    loops are 0;";
  - `:2171-2172`: "`resolvedBy: "TASK-551-06-L02 R9"`".

  The closing rule (`:2174-2175`, "A breach is a failed R9 gate and blocks
  closure. Only the orchestrator may decide what follows. It is never recorded
  as a handoff.") stays, read as R10.
- R9-7 (`:2177-2216`) is replaced by R10-9 where the two differ. Quoted:
  - gate 2 (`:2194-2195`): "(including the three R9-5 (1) pins and the R9-5
    (2) arithmetic leg)";
  - gate 3 (`:2197-2198`): "Expected 81 pass / 0 fail / 0 skip (R8's 79 plus
    the 2 new tests), with the R9 DB leg under 5,000 ms.";
  - line counts (`:2213-2215`): "Expected after R9 code: service about 700,
    retention test at or under 999, new file about 170".

  Three parts stay as R9-7 set them: the three-file scope (`:2179-2186`),
  gate 4 and gate 6.

### R10-2 — Binding design: whole-family floor join

**File.** The only source file is
`core/services/content/revisionRetentionService.ts` (675 lines; envelope
`allowlist` `:331`). R10 changes no schema, migration or index, persists no
high-water mark, and changes no export, ledger shape, error code or policy
knob. The 06-L03 consumer `runRevisionFamilyRetention(family,
drizzleOverTransaction(tx), { policy })`
(`core/services/maintenance/retentionJobService.ts:826`) needs no change.

**Exact whole-family statements (dry-run; binding bytes).** The five families
come from the closed `REVISION_FAMILY_SPECS` map (`:158-194`). The parent
columns are `page_id`, `template_id`, `detail_page_id`, `entry_id` and
`post_id`. Only `page` and `detail_page` carry `kindColumn`; their physical
column is `kind`, `NOT NULL`, at `core/db/tables/pages.ts:97` and `:170`.
Kind-less families omit two things: the anchor sub-select column and the
`is distinct from retention_floors.anchor_id` conjunct. The binds are always
`[keepNewest, <cutoff>, batchSize]`, so `keepNewest` is bound exactly once, as
the `OFFSET`. Each family's statement is one line, under a `-- <family>`
label line that is not part of the statement:

```text
-- page (page_revisions)
select "page_revisions"."id" from "page_revisions" inner join (with recursive retention_parents(parent_id) as ((select first_parent.page_id from "page_revisions" first_parent order by first_parent.page_id limit 1) union all select (select next_parent.page_id from "page_revisions" next_parent where next_parent.page_id > retention_parents.parent_id order by next_parent.page_id limit 1) from retention_parents where retention_parents.parent_id is not null) select retention_parents.parent_id, floor_row.version as floor_version, (select anchor.id from "page_revisions" anchor where anchor.page_id = retention_parents.parent_id and anchor.kind = 'publish' order by anchor.version desc, anchor.id desc limit 1) as anchor_id from retention_parents cross join lateral (select floor_probe.version from "page_revisions" floor_probe where floor_probe.page_id = retention_parents.parent_id order by floor_probe.version desc offset $1 limit 1) floor_row where retention_parents.parent_id is not null) retention_floors on retention_floors.parent_id = "page_revisions"."page_id" where ("page_revisions"."created_at" < $2 and "page_revisions"."version" <= retention_floors.floor_version and "page_revisions"."id" is distinct from retention_floors.anchor_id) order by "page_revisions"."created_at" asc, "page_revisions"."id" asc limit $3

-- widget_template (widget_template_revisions)
select "widget_template_revisions"."id" from "widget_template_revisions" inner join (with recursive retention_parents(parent_id) as ((select first_parent.template_id from "widget_template_revisions" first_parent order by first_parent.template_id limit 1) union all select (select next_parent.template_id from "widget_template_revisions" next_parent where next_parent.template_id > retention_parents.parent_id order by next_parent.template_id limit 1) from retention_parents where retention_parents.parent_id is not null) select retention_parents.parent_id, floor_row.version as floor_version from retention_parents cross join lateral (select floor_probe.version from "widget_template_revisions" floor_probe where floor_probe.template_id = retention_parents.parent_id order by floor_probe.version desc offset $1 limit 1) floor_row where retention_parents.parent_id is not null) retention_floors on retention_floors.parent_id = "widget_template_revisions"."template_id" where ("widget_template_revisions"."created_at" < $2 and "widget_template_revisions"."version" <= retention_floors.floor_version) order by "widget_template_revisions"."created_at" asc, "widget_template_revisions"."id" asc limit $3

-- detail_page (detail_page_revisions)
select "detail_page_revisions"."id" from "detail_page_revisions" inner join (with recursive retention_parents(parent_id) as ((select first_parent.detail_page_id from "detail_page_revisions" first_parent order by first_parent.detail_page_id limit 1) union all select (select next_parent.detail_page_id from "detail_page_revisions" next_parent where next_parent.detail_page_id > retention_parents.parent_id order by next_parent.detail_page_id limit 1) from retention_parents where retention_parents.parent_id is not null) select retention_parents.parent_id, floor_row.version as floor_version, (select anchor.id from "detail_page_revisions" anchor where anchor.detail_page_id = retention_parents.parent_id and anchor.kind = 'publish' order by anchor.version desc, anchor.id desc limit 1) as anchor_id from retention_parents cross join lateral (select floor_probe.version from "detail_page_revisions" floor_probe where floor_probe.detail_page_id = retention_parents.parent_id order by floor_probe.version desc offset $1 limit 1) floor_row where retention_parents.parent_id is not null) retention_floors on retention_floors.parent_id = "detail_page_revisions"."detail_page_id" where ("detail_page_revisions"."created_at" < $2 and "detail_page_revisions"."version" <= retention_floors.floor_version and "detail_page_revisions"."id" is distinct from retention_floors.anchor_id) order by "detail_page_revisions"."created_at" asc, "detail_page_revisions"."id" asc limit $3

-- entry (content_revisions)
select "content_revisions"."id" from "content_revisions" inner join (with recursive retention_parents(parent_id) as ((select first_parent.entry_id from "content_revisions" first_parent order by first_parent.entry_id limit 1) union all select (select next_parent.entry_id from "content_revisions" next_parent where next_parent.entry_id > retention_parents.parent_id order by next_parent.entry_id limit 1) from retention_parents where retention_parents.parent_id is not null) select retention_parents.parent_id, floor_row.version as floor_version from retention_parents cross join lateral (select floor_probe.version from "content_revisions" floor_probe where floor_probe.entry_id = retention_parents.parent_id order by floor_probe.version desc offset $1 limit 1) floor_row where retention_parents.parent_id is not null) retention_floors on retention_floors.parent_id = "content_revisions"."entry_id" where ("content_revisions"."created_at" < $2 and "content_revisions"."version" <= retention_floors.floor_version) order by "content_revisions"."created_at" asc, "content_revisions"."id" asc limit $3

-- post (post_revisions)
select "post_revisions"."id" from "post_revisions" inner join (with recursive retention_parents(parent_id) as ((select first_parent.post_id from "post_revisions" first_parent order by first_parent.post_id limit 1) union all select (select next_parent.post_id from "post_revisions" next_parent where next_parent.post_id > retention_parents.parent_id order by next_parent.post_id limit 1) from retention_parents where retention_parents.parent_id is not null) select retention_parents.parent_id, floor_row.version as floor_version from retention_parents cross join lateral (select floor_probe.version from "post_revisions" floor_probe where floor_probe.post_id = retention_parents.parent_id order by floor_probe.version desc offset $1 limit 1) floor_row where retention_parents.parent_id is not null) retention_floors on retention_floors.parent_id = "post_revisions"."post_id" where ("post_revisions"."created_at" < $2 and "post_revisions"."version" <= retention_floors.floor_version) order by "post_revisions"."created_at" asc, "post_revisions"."id" asc limit $3
```

These are the SHA-256 digests of each statement line above (label excluded),
without a trailing newline:

- `page`: 1,324 characters, sha256 `4335ee3c358334863bbb253ce95366e3fece28a7121f379815c59a5e6d300902`;
- `widget_template`: 1,198 characters, sha256 `f9a3bf071d1c4e26253803b360d7e4e1b14828b65e5dc390928982444584fbf5`;
- `detail_page`: 1,464 characters, sha256 `1d6b991c6b2fb71267727815797e56a0c8d71d53d8dc6777546b9463b6be0117`;
- `entry`: 1,097 characters, sha256 `82a782ee7fc7e210507b7716815916deb90c9e2aebf3c9102aa9747a03c15fbe`;
- `post`: 1,060 characters, sha256 `1d0b86f41f95342a538d23f712ecfb16daf93e43da745fdeaa4f8c001a38fe16`.

**Apply.** On apply, the statement is the same bytes plus the suffix
` for update of "<table>" skip locked`, for example
` for update of "page_revisions" skip locked`. Dry-run has no `for update`.

**Drizzle shape (binding names; the rendered bytes are the contract).** Two
private helpers go between `publishedAnchorProbe` (`:462-470`) and
`buildEligibilityWhere` (`:472-483`). Each template holds single spaces and no
line breaks, because prettier never reflows template contents and the bytes
are pinned. Named sub-fragments are allowed only if the rendered bytes stay
identical.

```ts
/**
 * Whole-family keep-newest floors (R10): one row per parent that owns MORE
 * than `keepNewest` rows. `floor_version` is the parent's (keepNewest + 1)-th
 * newest version, so a row lies outside the floor exactly when its version is
 * at or below it. Kind-bearing families also carry the newest-publish anchor
 * id. A loose index scan (recursive CTE) enumerates the parents, so every
 * probe runs once per parent, never once per walked row. Aliases and the
 * parent column come from the closed family map; `keepNewest` is the only bind.
 */
const wholeFamilyFloors = (spec: RevisionFamilySpec, keepNewest: number): SQL => {
  const parent = sql.raw(spec.parentColumnSql);
  const anchor =
    spec.kindColumn === null
      ? sql``
      : sql`, (select anchor.id from ${spec.table} anchor where anchor.${parent} = retention_parents.parent_id and anchor.kind = 'publish' order by anchor.version desc, anchor.id desc limit 1) as anchor_id`;
  return sql`(with recursive retention_parents(parent_id) as ((select first_parent.${parent} from ${spec.table} first_parent order by first_parent.${parent} limit 1) union all select (select next_parent.${parent} from ${spec.table} next_parent where next_parent.${parent} > retention_parents.parent_id order by next_parent.${parent} limit 1) from retention_parents where retention_parents.parent_id is not null) select retention_parents.parent_id, floor_row.version as floor_version${anchor} from retention_parents cross join lateral (select floor_probe.version from ${spec.table} floor_probe where floor_probe.${parent} = retention_parents.parent_id order by floor_probe.version desc offset ${keepNewest} limit 1) floor_row where retention_parents.parent_id is not null) retention_floors`;
};

/** Whole-family eligibility: O(1) comparisons against the joined floor row. */
const wholeFamilyEligibilityWhere = (spec: RevisionFamilySpec, cutoff: Date): SQL | undefined =>
  and(
    lt(spec.createdAtColumn, cutoff),
    sql`${spec.versionColumn} <= retention_floors.floor_version`,
    spec.kindColumn === null
      ? undefined
      : sql`${spec.idColumn} is distinct from retention_floors.anchor_id`
  );
```

The whole-family candidate read (a new private
`selectWholeFamilyCandidateIds`, or an equivalent branch) is:

```ts
let query = exec
  .select({ id: spec.idColumn })
  .from(spec.table)
  .innerJoin(
    wholeFamilyFloors(spec, policy.keepNewestPerParent),
    sql`retention_floors.parent_id = ${spec.parentColumn}`
  )
  .where(wholeFamilyEligibilityWhere(spec, cutoff))
  .orderBy(asc(spec.createdAtColumn), asc(spec.idColumn))
  .limit(policy.batchSize)
  .$dynamic();
if (lock) query = query.for("update", { of: spec.table, skipLocked: true });
```

- **The lock names the family table.** Without `of`, PostgreSQL's
  locking-clause rules would also apply the lock to the tables used inside
  the derived sub-query. With `of`, it locks exactly the relation that R7's
  single-table `for update skip locked` locked.
- **Dispatch.** `runRetentionBatch` (`:527-552`) branches on
  `parentId === null`: whole-family goes to the read above, per-parent to the
  unchanged path. Both stay inside the existing `try` (`:535-551`), so a
  statement-timeout cancel still surfaces as `retention_batch_failed`
  (`:550`), and `drainRetentionBatches` keeps no retry loop.
- **The `order` parameter** (`"age" | "version"`) may be dropped, because it
  follows from `parentId`, or kept. Either is fine.
- **Per-parent path: UNCHANGED, byte for byte.** `pruneParentRevisions`
  (`:659-675`) keeps `eq(spec.parentColumn, parentId)`, the R7 probes
  `keepNewestFloorProbe` (`:445-451`) and `publishedAnchorProbe`
  (`:462-470`), `version ASC, id ASC`, and `.for("update", { skipLocked: true })`
  with no `of`. The following pins hold it and must stay green untouched:
  - `tests/unit/pages/revisionService.test.ts:766`, `:775`, `:777` and
    `:783` (`newer_rows`, `not exists`, `for update skip locked$`);
  - the per-parent pins in R10-5 (1).

  `buildEligibilityWhere` becomes per-parent only (`parentId: string`). The
  whole-family path no longer calls the two probes.
- **Module header.** In the Batching paragraph (`:43-49`), the parenthesis
  "(`rowCount` is never read — the only `count(*)` in play is the in-SQL
  keep-newest probe, compared in SQL, never in JS)" becomes "(`rowCount` is
  never read — the only `count(*)` in play is the per-parent path's in-SQL
  keep-newest probe; the whole-family floor is an in-SQL `OFFSET` probe;
  neither is read into JS)". After the Ordering paragraph (`:36-41`), add a
  "Candidate examination (R10)" paragraph of at most 10 lines. It covers the
  derived `retention_floors` table (loose-scan parents, one `OFFSET k` floor
  probe per parent, the anchor column on kind-bearing families), the O(1)
  per-row comparisons, the fact that the per-parent path keeps the correlated
  probes, and a pointer to this section.
- **Doc comments.** The `keepNewestFloorProbe` doc comment (`:439-444`) and
  the `publishedAnchorProbe` doc comment (`:455-461`) each add "(per-parent
  path only)".
- **Size.** Expected size is about 675 + 45 = about 720 lines, well under
  1,000.

**Why the query builder stays.** The capture seams read the builder chain:

- the retention-test spy (`tests/integration/server/task551RevisionRetention.test.ts:184-248`)
  proxies every builder method, records `toSQL()` on `then`, and throws on
  `execute`;
- the shared-database scoped executor
  (`tests/perf/database-revision-budgets.test.ts:931-945`) wraps
  `select().from()` and patches that object's `where`.

In drizzle 0.45.2, `innerJoin` returns the same builder
(`node_modules/drizzle-orm/pg-core/query-builders/select.js:110-169` ends in
`return this`). So a `where` patched on the `from()` result still applies
after the join, and both seams work unchanged. The scoped conjunct is ANDed
into R10's `where`, and R10-3 shows that `E' AND scope = E AND scope`.

**Typing (orchestrator gate) and the decided fallback.** The drizzle types
accept this shape on paper. `PgSelectJoinFn` admits
`TJoinedTable extends PgTable | Subquery | PgViewBase | SQL`, and `LockConfig`
has `of?: ValueOrArray<PgTable>`
(`node_modules/drizzle-orm/pg-core/query-builders/select.types.d.ts:55`,
`:61-62`). But `innerJoin(SQL, SQL)` on a partial select over the generic
`spec.table: PgTable` has not been type-checked, and `bun --cwd core
lint:types` belongs to the orchestrator.

The fallback is DECIDED as follows. It stays on the builder:

- **Allowed.** If and only if `lint:types` rejects the `innerJoin` call or the
  `for(... { of })` call, the implementer applies the smallest local type
  adaptation at that one call site: a named type alias for the dynamic join
  builder, plus at most one type assertion. It uses no `any`, no
  `eslint-disable`, and no change to the rendered bytes.
- **Rejected: a whole-statement `sql` template through `exec.execute`.** It
  would bypass the `select`/`from`/`where` seams both capture tests depend on.
  The spy's `execute` throws `unexpected_family_retention_execute` (`:233-235`),
  and the budgets scoped executor would run an UNSCOPED whole-family read on
  the shared database. Reworking both seams would widen scope into a
  983-line test that R10 does not own, and into a retention test that has no
  line budget left.
- **Otherwise, STOP.** If no builder-level adaptation compiles without `any`,
  the implementer STOPS and reports. The orchestrator re-decides.

### R10-3 — Proof: F2 selects exactly R7's rows

Take one family table `T` with parent column `P` (`NOT NULL` on all five
tables). Let `k` be the effective `keepNewestPerParent` after
`resolveWholeFamilyRetentionPolicy` (`:615-623`), so page `k >= 100`. Let `c`
be the cutoff.

R7's test (the current source) is `E(r) = A(r) AND F(r) AND N(r)`:

- `A(r)`: `r.created_at < c`.
- `F(r)`, the floor probe (`:445-451`): at least `k` rows `n` exist with
  `n.P = r.P` and `(n.version, n.id) > (r.version, r.id)`.
- `N(r)`, the anchor (`:462-470`; kind-bearing families only):
  `NOT (r.kind = 'publish' AND no same-parent publish row is strictly newer
  in (version, id) order)`.

F2's test is `E'(r) = A(r) AND r.P has a retention_floors row AND
r.version <= floor(r.P)`, plus `AND r.id IS DISTINCT FROM anchor(r.P)` on the
kind-bearing families.

1. **Prerequisite: tuple order is version order.** Each family has a UNIQUE
   `(parent, version)` index:
   - `page_revisions_page_version_idx` (`core/db/tables/pages.ts:107`);
   - `detail_page_revisions_detail_page_version_idx` (`pages.ts:181-184`);
   - `content_revisions_entry_version_idx` (`content.ts:138`);
   - `post_revisions_post_version_idx` (`posts.ts:103`);
   - `widget_template_revisions_template_version_idx` (`widgets.ts:96-99`).

   So for two distinct rows `a` and `b` of one parent,
   `(a.version, a.id) > (b.version, b.id)` holds exactly when
   `a.version > b.version`.
2. **Floor.** Order parent `p`'s `n` versions descending:
   `v(1) > v(2) > … > v(n)`. The row at `v(j)` has exactly `j − 1` strictly
   newer rows of any age and kind. So `F` holds exactly when `j − 1 >= k`,
   that is `j >= k + 1`. Because the versions strictly decrease, that is
   exactly `v(j) <= v(k + 1)`.
   - If `n >= k + 1`, `order by floor_probe.version desc offset k limit 1`
     returns `v(k + 1)`.
   - If `n <= k`, it returns no row. The lateral cross join then drops `p`,
     and the inner join drops every row of `p`. R7 agrees, because each such
     row has at most `n − 1 < k` newer rows.
3. **Anchor.** `NOT N(r)` holds exactly when `r` is a publish row with no
   strictly newer publish row of its parent, that is, when `r` is that
   parent's maximum publish row in `(version, id)` order. By step 1 that row
   is unique, and it is exactly the anchor sub-select's
   `order by anchor.version desc, anchor.id desc limit 1` over
   `kind = 'publish'`. So `NOT N(r)` holds exactly when `r.id = anchor(p)`.
   - If `p` has no publish row, `anchor(p)` is NULL. `IS DISTINCT FROM NULL`
     is then true for every row, and R7 excludes nothing either.
   - `id` is the primary key (never NULL), so `IS DISTINCT FROM` equals `<>`
     whenever the anchor exists.
   - Kind-less families have no `N` in R7 and no anchor term in F2.
4. **Parent coverage and multiplicity.** The recursive CTE seeds with the
   smallest `P` and then steps to the smallest `P` strictly greater than the
   previous one. The step yields NULL after the last parent, and that NULL
   row is filtered out. So `retention_parents` holds every distinct parent
   exactly once, and each candidate row joins at most one `retention_floors`
   row. No row is dropped wrongly and none is duplicated.
5. **Order, limit and snapshot.** `A`, `ORDER BY created_at ASC, id ASC` and
   `LIMIT batchSize` are identical to R7. One statement reads one snapshot for
   the CTE, the lateral probe, the anchor sub-select and the outer scan. So
   `E' = E` on every snapshot, and the ordered prefix of `batchSize` rows is
   identical. A test-only scope conjunct (R10-5 (2)) is ANDed on both sides,
   so `E' AND scope = E AND scope`.
6. **Locking and concurrency.**
   - `for update of <table> skip locked` locks only outer family rows, the
     same relation R7's single-table lock covered.
   - Revision rows are insert/delete only. A row that another transaction
     has locked or deleted is skipped, exactly as under R7.
   - The floor and the anchor are statement-snapshot values, as R7's
     correlated probes were.
   - R9-3's **Same snapshot** argument (`:1925-1931`) carries over, with `S`
     read as `retention_floors`. The worst case is that a candidate waits for
     the next batch or run. No row that R7 would keep is deleted.
7. **Empirical.** F2R `equiv` gives 8,660 of 8,660 rows ordered-equal to the
   oracle, with the first 500 equal as well. The recommendation reports three
   such fixtures.

### R10-4 — Plan guard, expected plans and cost

**Expected plans** for the page family, as measured in F2R. Every case keeps
one shape in all four states (`outerScanFlips: false`).

```text
P1 (large, dense):
Limit
  -> Nested Loop   Join Filter: version <= floor_version AND id IS DISTINCT FROM anchor AND page_id = parent_id
       -> Index Scan using page_revisions_retention_idx   Index Cond: (created_at < cutoff)
       -> Materialize
            -> Nested Loop
                 -> CTE Scan retention_parents   (Recursive Union: Index Only Scan on page_revisions_page_id_idx, 1 loop per parent)
                 -> Limit -> Index Only Scan using page_revisions_page_version_idx   (floor_probe, 1 loop per parent)
                 SubPlan (anchor) -> Limit -> Index Only Scan using page_revisions_page_kind_version_id_idx (1 loop per parent)

P2 (sparse_large, DB-leg shape, backlog, many_parents):
Limit
  -> Sort (created_at, id)
       -> Nested Loop
            -> Nested Loop   (retention_floors: the same loose scan, floor probe and anchor as P1)
            -> Index Scan using page_revisions_page_version_idx   Index Cond: (page_id = parent_id AND version <= floor_version)
```

**Plan guard (binding; enforced by the R10-7 receipt in every state of every
case).**

Forbidden:

1. Any plan node on the family table under the aliases `newer`, `published`
   or `candidate_parents`. Those are the R7 and R9 probes.
2. Any SubPlan or Limit over the family table whose `Actual Loops` exceeds
   the number of enumerated parents plus 1. No probe may run once per walked
   row.
3. Any index condition or filter containing `page_id = ANY`.
4. A Seq Scan or Bitmap Heap Scan on `page_revisions` as the candidate scan
   at 100,000 or more rows.
5. `WindowAgg` anywhere.

Required items 1-3 apply to the cases with at least 100,000 rows (`large`,
`sparse_large`, `dense`, `backlog`). On `small` and `sparse` the planner may
legitimately pick another scan, so only the forbidden items and required
item 4 apply there.

Required:

1. One floor probe per parent: a Limit over an Index Scan or Index Only Scan
   on the unique `page_revisions_page_version_idx` (alias `floor_probe`). Its
   loops equal the enumerated parent count (the CTE Scan rows). On every
   family this is the `*_version_idx` of R10-3 step 1.
2. The loose scan: a Recursive Union whose step is an Index Only Scan on a
   `page_id`-leading index. F2R used `page_revisions_page_id_idx`, and
   `page_revisions_page_kind_idx` after VACUUM.
3. The candidate fetch is P1 or P2:
   - **P1:** an Index Scan on `page_revisions_retention_idx`
     (`created_at < cutoff`) under a Nested Loop under the Limit, with no Sort
     between them;
   - **P2:** a Nested Loop from `retention_floors` into an Index Scan on
     `page_revisions_page_version_idx` with
     `page_id = parent_id AND version <= floor_version`, under a Sort on
     `(created_at, id)` under the Limit.

   A case may show P1 in some states and P2 in others. Any other shape fails.
4. In `sparse` and `sparse_large`, `retention_floors` yields 0 rows, so the
   candidate fetch runs 0 loops and returns 0 rows.

**Cost model (recorded, not a gate).**

- About 65-120 µs per parent: one loose-scan step, one floor probe that walks
  up to `k + 1` index entries (index-only once the visibility map is set), and
  one anchor probe on kind-bearing families.
- **P1** rescans the materialized floors once per walked row, about
  `walked rows × |floors|`.
- **P2** fetches every floor-eligible row, aged or not, then sorts it.

The detail-page anchor has no `(detail_page_id, kind, version desc, id desc)`
index. It runs once per parent through
`detail_page_revisions_detail_page_kind_idx` (`pages.ts:177-180`) plus a
per-parent sort of that parent's publish rows. That cost is linear in the
parent's publish count and runs once per parent, never once per row.

### R10-5 — Tests

**(1) In-place re-baselines in `tests/integration/server/task551RevisionRetention.test.ts`**
(993 lines at contract time). These are intended contract changes named by
R10. Every assertion that R10 makes false is REPLACED by the R10 equivalent at
the same place. No assertion is dropped without a replacement, and no
unrelated line moves.

- The dry-run test "dry-run executes exactly one LIMIT-bounded read with no row
  lock" (`:555`). Lines `:576-586` (11 lines) become exactly these 11 lines.
  `:581` is unchanged:

  ```ts
      // The keep-newest floor is one per-parent OFFSET probe (R10): the typed 4
      // resolves to the page whole-family floor (100), bound once as the OFFSET,
      // never into JS arithmetic.
      expect(statement).toContain("offset $1 limit 1) floor_row");
      expect(spy.bound.filter((param) => param === MAX_PAGE_REVISION_RETENTION)).toHaveLength(1);
      expect(spy.bound.filter((param) => param === 4)).toHaveLength(0);
      // The page family carries the newest-publish anchor as one per-parent column.
      expect(statement).toContain("anchor.kind = 'publish'");
      expect(statement).toContain("is distinct from retention_floors.anchor_id");
      expect(statement).not.toContain("newer_rows");
      expect(statement).not.toContain("not exists");
  ```

  Superseded (quoted, `:579`, `:580`, `:583-586`):
  - `expect(statement).toContain("newer_rows");`
  - `...toHaveLength(2);`
  - `expect(statement).toContain('"page_revisions"."kind" = \'publish\'');`
  - `expect(statement).toContain("not exists");`
  - `expect(statement).toContain("published.kind = 'publish'");`
  - `expect(statement).toContain('not ("page_revisions"."kind" = \'publish\' and not exists');`
- The apply test "apply batches lock SKIP LOCKED and count deletes by returning
  length" (`:589`). `:602`
  `expect(statement).toContain("for update skip locked");` becomes
  `expect(statement).toContain('for update of "page_revisions" skip locked');`
  (net 0 lines).
- The per-parent test "the per-parent prune drains in the contract version
  order and fails closed on ids" (`:636`). After `:649` add two lines, which
  pin the request-path exclusion and the kept R7 probe:

  ```ts
      expect(statement).toContain("newer_rows");
      expect(statement).not.toContain("retention_floors");
  ```

  `:655` (no `for update` on dry-run) stays.
- The family map test "pins the family->table map and the kind-bearing anchor
  probes" (`:671`).
  - After `:690` add two lines:

    ```ts
          expect(statement).toContain(`retention_floors.parent_id = "${name}"."${parentColumn}"`);
          expect(statement).toContain(`floor_probe.${parentColumn} = retention_parents.parent_id`);
    ```

  - `:694` becomes `// Only the page/detail_page tables carry the published anchor column.`
  - `:695` stays: it is still true through `anchor.kind = 'publish'`.
  - `:696` `expect(statement.includes("not exists")).toBe(kindBearing);`
    becomes `expect(statement.includes("anchor.kind = 'publish'")).toBe(kindBearing);`.
  - `:697` `expect(statement.includes("published.kind = 'publish'")).toBe(kindBearing);`
    becomes `expect(statement.includes("retention_floors.anchor_id")).toBe(kindBearing);`.

**Budget.** 993 + 4 = 997 lines. Every added or replaced line fits
prettier's `printWidth` 100 (`.prettierrc`), so none wraps. If prettier's
output takes the file over 1,000 lines, the implementer STOPS and reports
(R9-5 (1) STOP rule). The implementer never moves pins or compresses unrelated
code.

**(2) The new file `tests/perf/database-revision-candidate-bounds.test.ts`**
(bun lane; allowlisted at `:340`; argv `:380`). It owns the full R10 SQL-text
contract and the DB legs. The retention test is out of line budget, so the new
legs and new pins go here. File shape:

- **File header.** TASK-551-06-L02 R10 floor-join candidate read. It states
  the presence-only owner-map gate, no `.env`, marker-scoped seed and cleanup,
  and that no statement text, bind value or id is printed.
- **Gate.** `OWNER_DB_TEST_MAP_PRESENT` and `testIfDb`, verbatim from
  `tests/perf/database-revision-budgets.test.ts:84-90`.
- **Constants.**
  - `FROZEN_NOW = new Date(TASK551_RETENTION_CLOCK_MS)`
    (`./fixtures/task551DatabaseScale`, `:33`) and `DAY_MS = 86_400_000`.
  - `CANDIDATE_READ_CEILING_MS = 4_000`. Its comment says it equals
    `RETENTION_STATEMENT_TIMEOUT_MS` (`core/db/databaseLifecycle.ts:31`), the
    06-L03 job's tx-local statement bound. The test does not import it, to
    avoid the lifecycle module's registration side effects.
  - `DB_LEG_TIMEOUT_MS = 60_000`.
  - `POLICY = { family: "page", enabled: true, dryRun: true, maxAgeDays: 30,
    keepNewestPerParent: 50, batchSize: 500, maxBatchesPerRun: 10, now:
    FROZEN_NOW }`, unchanged from R9.
  - `R10_WHOLE_FAMILY_SQL`: a `Readonly<Record<RevisionFamily, string>>`
    holding the five R10-2 statements verbatim, one string literal per family.
  - Leg shapes: `MIXED = { parents: 1_001, rows: 100, lastParentRows: 105,
    publishEvery: 1, contiguous: false, expected: 5 }`, `DENSE = { parents:
    100, rows: 600, publishEvery: 5, contiguous: true, expected: 500 }` and
    `SPARSE = { parents: 100, rows: 100, publishEvery: 1, contiguous: false,
    expected: 0 }`. The field names are the implementer's choice; the values
    are binding.
- **Capture executor (airtight).** A minimal proxy with the same method as the
  R7 receipt and the retention spy. `select` returns the real
  `db.select(...)` builder, wrapped so that every chained method stays
  wrapped. On `then` it records `toSQL()` (sql and params) and resolves `[]`.
  `delete` and `execute` throw closed codes
  (`task551_l06l02_r10_unexpected_delete` and
  `task551_l06l02_r10_unexpected_execute`).
- **Test 1, pure (airtight):** "R10 policy arithmetic: the three legs expect
  5, 500 and 0 matches". It normalizes `POLICY` with
  `normalizeRevisionRetentionPolicy("page", POLICY, {})` and
  `resolveWholeFamilyRetentionPolicy`, then asserts:
  - effective keep `=== MAX_PAGE_REVISION_RETENTION` (100);
  - mixed: `lastParentRows - keep === 5`, `rows === keep`, and 100,105
    seeded rows in total;
  - dense: `(rows - keep) * parents >= batchSize` (50,000 eligible, LIMIT
    500), and the newest publish (version 600) lies inside the newest 100, so
    the anchor never removes an eligible row;
  - sparse: `rows === keep`, so 0 eligible.
- **Test 2, pure (airtight):** "the whole-family dry-run statement is the
  pinned floor-join SQL for all five families". For each family it runs
  `runRevisionFamilyRetention(family, capture, { policy: { ...POLICY, family,
  keepNewestPerParent: 100 }, env: {} })` and asserts:
  - exactly one statement, and `statement === R10_WHOLE_FAMILY_SQL[family]`;
  - params of length 3, `params[0] === 100`, `params[2] === 500`, and
    `params[1]` equal to the driver value of
    `computeRetentionCutoff(FROZEN_NOW, 30)`;
  - no `for update`.
- **Test 3, pure (airtight):** "apply locks only the family table". It runs
  each family with `dryRun: false` and one empty scripted batch, then asserts
  `statement === R10_WHOLE_FAMILY_SQL[family] + ' for update of "<table>" skip
  locked'` and that no delete ran.
- **Tests 4-6, DB legs.** Each is `testIfDb(<title>, ..., DB_LEG_TIMEOUT_MS)`,
  with these exact titles:
  - "sparse_large-mixed 100,105 aged rows: the dry-run read matches 5 in under 4 s";
  - "dense 100 x 600 aged rows: the dry-run read matches 500 in under 4 s";
  - "sparse 100 x 100 aged rows: the dry-run read matches 0 in under 4 s".

  Each leg:
  - **Seeds set-based.** One `pages` insert of the leg's marker pages
    (`slug = ${RUN}-${leg}-${index}`) and one `page_revisions`
    `insert ... select ... generate_series` statement. Rows are narrow
    (`data '{}'::jsonb`) and aged from the base `cutoff - 170 days`. `mixed`
    and `sparse` use that one identical timestamp, as R9-5 (2) and the F2R
    DB-leg shape did. `dense` uses the base plus `(parentOrdinal × 600 +
    version)` seconds, so each parent is contiguous in time and `created_at`
    rises with `version`. Kinds: `publish` for `mixed` and `sparse`; for
    `dense`, `publish` when `version % 5 = 0`, else `autosave`.
  - **Scopes the read** through the R9-5 (2) scoped select executor over the
    leg's own parent ids, with `select` wrapped, `execute` bound, and
    `delete` throwing a closed code.
  - **Times only the one dry-run** `runRevisionFamilyRetention("page",
    executor, { policy: POLICY })` call and asserts
    `[dryRun, batches, matched, deleted]` `=== [true, 1, expected, 0]` and
    `elapsedMs < CANDIDATE_READ_CEILING_MS`.
  - **Re-counts the seeded rows** by parent id (`count()` with `inArray`):
    100,105, 60,000 and 10,000 respectively.
  - **Deletes its own marker pages in a `finally`** (the cascade owns the
    revisions). A file-level `afterAll` sweeps `${RUN}%` as a safety net.
    Cleaning up per leg keeps each leg's floors from enumerating another
    leg's parents.
- **No plan assertion in the DB legs (decided).** Three reasons:
  - the shared-database scope conjunct renders as `page_id in (...)`, which
    PostgreSQL shows as `page_id = ANY ('{...}')` and which may legitimately
    steer the planner. It would trip plan-guard rule 3 for a test-only
    reason;
  - the floors enumerate EVERY parent in the table, foreign rows included, so
    floor-row and loop counts are not fixture-owned;
  - every plan measurement (F2R) is unscoped.

  The plan guard is therefore a receipt gate (R10-7). The DB legs prove
  behavior and the latency bound.
- **Measured margins.** These come from unscoped F2R and F runs; the scope
  conjunct itself is unmeasured.
  - `mixed`: F2 narrow worst 804 ms, so at least 3.2 s of margin.
  - `dense`: F2 wide 200 × 600 worst 204 ms, so at least 3.7 s.
  - `sparse`: F (same predicate) wide worst 75 ms, so at least 3.9 s.

  If a leg's `elapsedMs` reaches 4,000 ms, or a leg fails for a plan or
  timeout reason, the implementer STOPS and reports the measured value. The
  ceiling is never raised.
- **Red/green.**
  - The `mixed` leg is the red-before leg. Against the R7 statement (the
    current source), A_r7 timed out on this exact shape, so the read is
    cancelled by the 15 s `DB_STATEMENT_TIMEOUT_MS` and surfaces as
    `retention_batch_failed`.
  - `dense` and `sparse` are regression bounds (A_r7 finished there in F2R and
    in the R7 receipt). They pin the P1-shape latency and the zero-match
    walk.
  - Test 2 and Test 3 are red-before by construction: the R7 bytes differ.
- **Existing behavioral regression.** The R7 and R8 DB legs are the in-suite
  equivalence regression under F2, and they must pass UNCHANGED. They are the
  owner-map describe in `task551RevisionRetention.test.ts` (from `:800`) and
  the whole-family legs of `database-revision-budgets.test.ts`, whose scoped
  executor sits at `:931-945`.
- **Size.** Expected size is about 330 lines, well under 1,000.

**(3) Envelope.** Unchanged (see the preamble). `database-revision-budgets.test.ts`
and `tests/unit/pages/revisionService.test.ts` are not edited.

### R10-6 — What stays from R9

These parts of R9 remain in force:

- the R9 trigger and decision that this leaf fixes R8-2 (`:1761-1769`);
- the R9-1 disposition of mitigation 3, and the R9-1 supersession of 06-L03
  R1-d as a deferral (`:1807-1814`);
- the R9-2 request-path exclusion (in substance);
- R9-3 **Same snapshot** (by reference);
- the R9-4 **Indexes** paragraph;
- the R9-5 (1) STOP rule;
- the R9-5 (2) discipline items listed in R10-1;
- R9-5 (3);
- the R9-6 closing rule;
- the R9-7 scope and gates 1, 4, 5 and 6, as amended by R10-9.

Nothing else in R9 binds.

### R10-7 — EXPLAIN receipt re-run (orchestrator; a GATE)

After the R10 code lands, the orchestrator re-runs the H2 receipt. It updates
`_docs/_workflows/_smoke/task-551/audit-evidence/06-l02-r7-explain-receipt.json`
IN PLACE, as R9-6 prescribed.

**Method and policy.**

- **Statement.** It uses the production-builder capture method:
  `runRevisionFamilyRetention('page', captureExecutor, …)` with the same
  policy (effective keep 100, 180 days, LIMIT 500).
- **Stats states.** Four, as in F2R: `as_is_custom`, `after_analyze_custom`,
  `after_analyze_generic` and `after_vacuum_analyze_custom`.
- **Timeout.** The measurement `statement_timeout` is 15 s.
- **Markers.** It keeps the same marker and residue discipline.
- **Rows.** Rows are WIDE (`data` = `{blob: <1,792 random hex chars>}`,
  about 1.9 KB inline).

**Cases and expected rows returned.** The `backlog` and `dense` cases replace
R9-4's optional informational case.

| case | shape | rows returned |
|---|---|---|
| `small` | 1 × 600 aged publish | 500 |
| `large` | 100 × 1,000 aged publish, interleaved | 500 |
| `sparse` | 100 × 100 aged | 0 |
| `sparse_large` | 1,000 × 100 aged, interleaved | 0 |
| `dense` | 200 × 600 aged, contiguous per parent, every 5th version publish | 500 |
| `backlog` | 1,000 × 101 aged, contiguous per parent, publish | 500 |

**`statementSource` changes.**

- `compiledSql` equals the R10-2 page statement byte for byte, and
  `compiledSqlSha256` is `4335ee3c358334863bbb253ce95366e3fece28a7121f379815c59a5e6d300902`.
- `sourceAnchors` are re-grounded to the post-R10 lines.
- In `sqlChecks`:
  - `noParentFilter` becomes `wholeFamilyFloorJoin: true`;
  - `keepNewestProbeLimit100Twice` becomes `keepNewest100BoundOnce: true`;
  - `applyVariantAddsOnlySkipLocked` becomes
    `applyVariantAddsOnlyLockOfFamilyTable: true`;
  - the other checks stay.
- `paramShape` becomes `[100, "<cutoff timestamp = now - 180 days>", 500]`.

**Budget (the gate).**

1. **Latency.** Every case's worst `executionMs` across `after_analyze_custom`,
   `after_analyze_generic` and `after_vacuum_analyze_custom` is below
   4,000 ms (`RETENTION_STATEMENT_TIMEOUT_MS`), with no timeout.
2. **Plan guard.** The R10-4 plan guard holds in all four states of every
   case, including `as_is_custom`, within the case scope that R10-4 states
   (required items 1-3 and forbidden item 4 apply at 100,000 or more rows).
3. **Rows.** Each case returns the rows in the table above.
4. **Drain reads.** The apply drain simulation (below) has no candidate READ
   cancelled by the 4,000 ms tx-local bound.
5. **Verdict.** `budgetVerdict` is `{ pass: true, breaches: [] }`, top-level
   `pass: true`, and `errors: []`. `knownLimitationHandoff` is replaced by
   `resolvedBy: "TASK-551-06-L02 R10"`. Residue is zero.

**The `as_is_custom` state.** It is the cold state after a bulk seed, with the
visibility map unset. Every case measures and records it, with `gated: false`
and a `coldVisibilityMapUnset` note. It is NOT a latency gate: F2R measured
wide `sparse_large` there at 6,395 ms, and every exact stateless variant
exceeds 4 s in that state. That gap is residual risk 1 in R10-8, and the owner
decides it. The plan guard still applies in this state.

**Per-run drain evidence (recorded, not a gate).** For every case, record the
apply drain of `maxBatchesPerRun` (10) batches inside ONE transaction. The
drain runs under the tx-local 4,000 ms statement bound and is rolled back, as
F2R did. It is compared against the 06-L03 family unit, which is one
`session.transaction` per family: `retentionJobService.ts:819-828`, the
`set_config` bound at `:305`, and the run budget `DEFAULT_MAX_RUN_MS` of
300,000 ms at `:604`. Record per batch `readWallMs` and `deleteWallMs`, plus
the total. F2R reference totals:

| case | batches | total | reads (max) | deletes (max) |
|---|---|---|---|---|
| `large` | 10 | 8,193 ms | 1,026 ms (187) | 6,658 ms (1,503) |
| `dense` | 10 | 11,828 ms | 1,973 ms (375) | 9,362 ms (2,282) |
| `backlog` | 3, drains all 1,000 eligible | 1,425 ms | 776 ms (372) | 71 ms |
| `sparse_large` | 1 | 598 ms | 105 ms | 0 |

In the same F2R run, the A_r7 and G dense drains were cancelled by the
statement bound.

A breach of any GATE item is a failed R10 gate and blocks closure. Only the
orchestrator may decide what follows, and it is never recorded as a handoff.

### R10-8 — Residual risks and the one open owner decision

The first six risks come from the recommendation and are recorded; none is a
gate unless R10-7 says so.

1. **Cold, wide, VM-unset 100k families (OPEN OWNER DECISION).** With a cold
   cache and the visibility map unset, every exact stateless variant visits
   about N heap tuples. On `coderso02` that took 2-9 s (F2 6.4 s, G 9.1 s,
   H 5.8 s). After VACUUM, F2 takes 148 ms. There are two options:
   - rely on PostgreSQL's insert-triggered autovacuum, since retention only
     reads rows at least 180 days old, whose pages are normally all-visible
     by then;
   - or schedule `VACUUM (ANALYZE)` before retention.

   R10 does not decide this. Its default is the R10-7 `as_is_custom` rule
   (recorded, not gated). The orchestrator records the owner's answer in the
   receipt (`coldStatePolicy`) before closure.
2. **Parent-count scaling.** F2 costs about 65-120 µs per parent. 20,000
   parents took 2.2-2.4 s per batch (1.3 s warm), so the 4 s bound is reached
   at roughly 35,000 parents per family. This matters mainly for `entry`.
3. **Planner shape.** P1 costs `walked rows × |floors|` rescans. P2 fetches
   every floor-eligible row, aged or not, then sorts. The choice was stable
   across all four states in the five F2R cases, but PostgreSQL does not
   guarantee that. The R10-7 plan guard is the tripwire.
4. **Delete statements.** Deleting 500 wide rows took up to 2.3-3.3 s. That
   is the same for every variant, and it competes for the same 4 s
   per-statement bound. It is recorded in the R10-7 drain evidence.
5. **Walk-length bound.** The bound of about `500 × (k + 1)` walked rows
   assumes `created_at` rises with `version` inside a parent. Correctness
   (R10-3) does not depend on that.
6. **Shared-database legs.** A scoped executor scopes only the WHERE. The
   floors derived table still enumerates every parent in the table.
7. **Detail-page anchor (R10 addition).** It runs once per parent through
   `detail_page_revisions_detail_page_kind_idx` plus a per-parent sort
   (R10-4). The cost is linear in that parent's publish count. It is not
   measured, and it is not a gate.

### R10-9 — Scope, gates, receipt, line counts and stop rules

**Scope.** R10 edits exactly the three R9-7 files, all in the envelope
`allowlist`:

- `core/services/content/revisionRetentionService.ts` (R10-2);
- `tests/integration/server/task551RevisionRetention.test.ts` (R10-5 (1));
- the new `tests/perf/database-revision-candidate-bounds.test.ts`
  (R10-5 (2)).

`tests/perf/database-revision-budgets.test.ts`,
`tests/unit/pages/revisionService.test.ts`, the R7/R8 files and the envelope
are not edited.

**Gates**, in order, with the envelope forms and R8's closed owner-map
environment (`DATABASE_URL3`, `coderso02`, `DB_LOCK_TIMEOUT_MS=15000`):

1. `./node_modules/.bin/eslint --max-warnings=0 core/services/content/revisionRetentionService.ts tests/integration/server/task551RevisionRetention.test.ts tests/perf/database-revision-candidate-bounds.test.ts`.
2. Airtight:
   `cd /home/coder/project/Coderso-551 && env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/server/task551RevisionRetention.test.ts tests/perf/database-revision-candidate-bounds.test.ts`.
   It must show 0 fail. The DB legs skip by name. The pure legs pass:
   - the R10-5 (1) re-baselines;
   - new-file Tests 1-3;
   - that is, 3 pass and 3 skip in the new file.
3. Closed owner-map `revision-concurrency-and-budget-tests` over the four-path
   argv (`:380`). Expected: 85 pass / 0 fail / 0 skip, which is R8's 79 plus
   the new file's 6 tests. Every R10 DB leg must run under 4,000 ms, and the
   report records each leg's `elapsedMs`.
4. Regression: closed owner-map `revision-service-unit-tests`. Expected:
   37 pass / 0 fail, unchanged from R8. This proves the per-parent path is
   unchanged.
5. `wc -l` on the three files (each at or under 1,000) and `git diff --check`.
6. Orchestrator, between phases:
   - `bun --cwd core lint:types`, which decides the R10-2 **Typing** fallback;
   - the R10-7 receipt re-run (a gate);
   - the 06-L03 consumer suites in 06-L03 A3 step 4.

**Receipt.** The orchestrator's `impl-06-l02.json` addendum (R8 "Receipt",
`:1740-1746`) records R10 in place of R9. The R9 code never landed. The
addendum records:

- the final bytes, line counts and sha256 of the three files;
- the executed counts of gates 1-5, with each DB leg's `elapsedMs`;
- whether the typing fallback was used;
- the R10-7 receipt as a GATE (its `budgetVerdict` and `coldStatePolicy`).

**Line counts.** At contract time: service 675, retention test 993, budgets
test 983 (not edited), new file 0. Expected after the R10 code:

- service about 720;
- retention test exactly 997;
- new file about 330.

All must be at or under 1,000. The implementer reports the final `wc -l`
values.

**Stop rules (implementer).** The implementer STOPS and reports when:

- any family's rendered whole-family statement differs from its R10-2 bytes
  (the pin is never edited to match the code);
- the retention test would exceed 1,000 lines;
- a DB leg reaches 4,000 ms or fails for a plan or timeout reason;
- the typing fallback cannot compile without `any`.

**Cross-file notes (not edited here; each belongs to its owner).**

- `TASK-551-06-L03-Maintenance-Scheduling-Partition-Readiness-And-Recovery.md`
  A2 and A3 (`:1394-1428`) still name "06-L02 R9". Its `:1421` reads "the R9
  candidate-SQL semi-join pre-filter (A2)". Read both as the R10 floor join;
  the dependency and the land order are unchanged.
- R9-5 (3)'s statement (`:2140-2143`) that TASK-551-10-L01's aggregate argv
  "does not list the new file" is stale. That leaf's amendment now lists
  `tests/perf/database-revision-candidate-bounds.test.ts` (10-L01 `:1092`,
  argv `:1321`, `positiveDiscovery` `:1323`, `"minimum": 12`).

### R10 amendments (R11, 2026-09-25): cold-state gate, cost model, plan guard

This subsection is append-only. Nothing above it is edited. It amends R10
after the R10 contract audits (1 HIGH, 4 MEDIUM and several LOWs). Where an
item below quotes an earlier sentence, the item wins and the quoted sentence
is read as replaced. Anchors into this file are current line numbers. R11
starts after `:3170`, so no earlier line moves. Every other anchor was
grounded on 2026-09-25 against HEAD `ee4c7f93` plus the uncommitted working
tree. R11 does not touch the Workflow Dispatch Envelope fence,
`**Status:**` or `**Changelog:**`. It adds no file to the R10-9 scope and
changes no expected test count.

Receipt figures below are rounded to whole milliseconds. They come from
`_docs/_workflows/_smoke/task-551/audit-evidence/`:

- `06-l02-r7-explain-receipt.json` (run `5a60dbac`, "the R7 receipt");
- `06-l02-r9-f-floor-join-explain.json` (run `a44606f6`);
- `06-l02-r9-f-floor-join-explain-part2.json` (run `84f5139b`);
- `06-l02-r9-f2-prod-shape-explain.json` (run `07de0980`, "F2R").

#### R11-1 (HIGH) — The latency gate applies only in the VM-set state

**Decision.** The R10-7 latency gate (below 4,000 ms) applies ONLY in the
`after_vacuum_analyze_custom` state. Of the four stats states, it is the only
one in which the visibility map is set. `ANALYZE` does not set the visibility
map, so `as_is_custom`, `after_analyze_custom` and `after_analyze_generic`
are all VM-unset states. In each of them every case is measured and RECORDED
(`rowsReturned`, shared hit and read blocks, `executionMs`, the timeout
flag), with `gated: false` and a `coldVisibilityMapUnset` note.

**Why.** A gate on VM-unset states measures the host, not the contract:

- F2R `sparse_large` (wide, 1,000 × 100): F2 measured 3,642 ms in
  `after_analyze_custom`, a margin of 358 ms (about 9 %). Variant F, the same
  predicate in CTE form, measured 4,216 ms in the same state and run.
- `84f5139b` `backlog_1000x101_info`: F measured 5,617 ms in
  `after_analyze_custom`.
- The `as_is_custom` state is run-dependent ("stats as left by the previous
  case"). F2R `sparse_large` measured every exact stateless variant above 4 s
  there (G 9,088, F 7,097, F2 6,395, F3 8,478 ms). The same case in
  `a44606f6` measured F, G and H at about 1.8 s.

R11-2 closes the VM-unset gap in production. The gate does not.

**State evidence.** Immediately before each measured statement, every state
records `page_revisions` `relpages` and `relallvisible` from `pg_class`. The
gated `after_vacuum_analyze_custom` state is valid only when
`relallvisible / greatest(relpages, 1) >= 0.9`. On a miss, the orchestrator
re-runs `VACUUM (ANALYZE)` once. A second miss is a harness STOP, never a
latency pass or breach.

**Unchanged.** The plan guard (R10-7 budget item 2) and the rows check
(item 3) still apply in all four states. The R10-5 (2) DB legs keep their
4,000 ms ceiling. They run on freshly seeded NARROW rows (VM unset). F2R
measured that shape (`dbleg_mixed_narrow`) at 804 ms worst, in
`as_is_custom`.

**Drain reads (R10-7 budget item 4).** The gated drain simulation runs after
the `after_vacuum_analyze_custom` state. A drain that the harness runs in a
VM-unset state is recorded with `gated: false`.

**Superseded (quoted).**

- `:2286`, the evidence-table cell for `sparse_large` under F2: "6,395 as-is
  cold (29.5k read blocks); 3,642 / 2,151 / 148 in the other three states
  (P2)". It now reads: 6,395 in `as_is_custom` (29.5k read blocks), 3,642 in
  `after_analyze_custom` and 2,151 in `after_analyze_generic`, all three
  VM-unset (recorded, not gated); 148 in `after_vacuum_analyze_custom`, the
  VM-set gated state (P2 in all four). "As-is cold" no longer implies that the
  other two ANALYZE-only states are VM-set.
- `:3018-3020`, R10-7 budget item 1: "**Latency.** Every case's worst
  `executionMs` across `after_analyze_custom`, `after_analyze_generic` and
  `after_vacuum_analyze_custom` is below 4,000 ms
  (`RETENTION_STATEMENT_TIMEOUT_MS`), with no timeout." It now reads:
  "**Latency.** Every case's `executionMs` in `after_vacuum_analyze_custom`
  (the VM-set state, validated per R11-1) is below 4,000 ms
  (`RETENTION_STATEMENT_TIMEOUT_MS`), with no timeout. The three VM-unset
  states are recorded with `gated: false`." The `many_parents_k` case
  (R11-3) follows its own outcome rule instead.
- `:3031-3036`, the paragraph "**The `as_is_custom` state.** It is the cold
  state after a bulk seed, with the visibility map unset. Every case measures
  and records it, with `gated: false` and a `coldVisibilityMapUnset` note. It
  is NOT a latency gate: F2R measured wide `sparse_large` there at 6,395 ms,
  and every exact stateless variant exceeds 4 s in that state. That gap is
  residual risk 1 in R10-8, and the owner decides it. The plan guard still
  applies in this state." It now reads as R11-1. The rule covers all three
  VM-unset states, "every exact stateless variant exceeds 4 s" holds for F2R
  only, and the gap is closed by the decided R11-2 policy, not by an open
  owner decision.
- `:3065-3076`, R10-8 risk 1, "**Cold, wide, VM-unset 100k families (OPEN
  OWNER DECISION).**", including "rely on PostgreSQL's insert-triggered
  autovacuum, since retention only reads rows at least 180 days old, whose
  pages are normally all-visible by then;" and "R10 does not decide this. Its
  default is the R10-7 `as_is_custom` rule (recorded, not gated). The
  orchestrator records the owner's answer in the receipt (`coldStatePolicy`)
  before closure." It now reads: "**Cold, wide, VM-unset families
  (DECIDED, R11-2).** VM-unset states are recorded, not gated (R11-1).
  Production closes the gap with the threshold-triggered pre-retention vacuum
  of R11-2, and the R10-7 receipt records that policy as `coldStatePolicy`."

#### R11-2 (MEDIUM) — `coldStatePolicy` decided: threshold-triggered pre-retention vacuum

**Decision.** This is the orchestrator decision relayed in the R11 mandate.
It closes R10-8 risk 1: `coldStatePolicy` is
`"pre_retention_vacuum_on_threshold"`. Before each revision family's
retention transaction, the scheduled retention job (06-L03) runs
`VACUUM (ANALYZE) <family table>` as a separate NON-transactional maintenance
statement, but only when the threshold below fires for that family table.
R10-2's code does not change: the vacuum belongs to the job, and
`runRevisionFamilyRetention` never issues it.

**Threshold (columns verified).** One catalog statement per family table
reads the following:

- from `pg_stat_user_tables`, joined on `relid = pg_class.oid` as in
  `core/services/maintenance/partitionReadinessService.ts:376-392`:
  `n_dead_tup`, `n_live_tup` and `n_ins_since_vacuum`;
- from `pg_class`: `relpages` and `relallvisible`. These two are `pg_class`
  columns, NOT `pg_stat_user_tables` columns.

The vacuum runs when ANY of these holds:

1. `n_dead_tup::float8 / (n_live_tup + 1) > 0.1`;
2. `relallvisible::float8 / greatest(relpages, 1) < 0.9`;
3. `n_ins_since_vacuum::float8 / (n_live_tup + 1) > 0.1`. This is an R11
   addition. Newly inserted pages stay VM-unset until they are vacuumed,
   while `relpages` and `relallvisible` are refreshed only by VACUUM,
   ANALYZE and CREATE INDEX. After a bulk insert, disjunct 2 can therefore be
   stale.

A missing `pg_stat_user_tables` row (for example after a stats reset) counts
as "run the vacuum". An empty table (`relpages = 0`) satisfies disjunct 2,
and vacuuming it is cheap.

**Execution rules (binding handoff to 06-L03).**

- **Statement.** `VACUUM (ANALYZE) <table>`. The identifier comes from the
  closed family map (`REVISION_FAMILY_SPECS`,
  `core/services/content/revisionRetentionService.ts:158-194`) and is
  rendered as a quoted identifier. It never comes from input or settings.
- **Channel.** It runs through the dedicated maintenance session's
  non-transactional `session.execute(statement, signal)`
  (`core/db/client.ts:329-334`), after `session.assertAlive(signal)` and
  before `session.transaction(...)`
  (`core/services/maintenance/retentionJobService.ts:818-819`). `VACUUM`
  cannot run inside a transaction block, so it never goes through
  `session.transaction` or `drizzleOverTransaction(tx)`.
- **Lock.** A plain `VACUUM` takes `SHARE UPDATE EXCLUSIVE`, which blocks no
  reads, inserts or deletes. It can wait on a concurrent vacuum or `ANALYZE`
  of the same table, bounded by the session lock timeout.
- **Bound.** 06-L03 chooses a bounded statement timeout inside the run budget
  (`DEFAULT_MAX_RUN_MS`, 300,000 ms, `retentionJobService.ts:604`). The
  statement honours the abort signal.
- **Failure.** A timeout, lock timeout or error is recorded in the job ledger
  as a redacted, machine-readable code, which 06-L03 names. It does NOT fail
  or skip the family's retention transaction, because correctness (R10-3)
  does not depend on the visibility map. The worst case is a VM-unset
  candidate read cancelled by the 4,000 ms tx-local bound, which surfaces as
  the existing `retention_batch_failed`.
- **Mode.** The vacuum runs for dry-run and apply alike. It changes no
  logical data, and the dry-run reads the same statement. For each family the
  ledger records whether the vacuum ran, was skipped by the threshold, or
  failed.
- **Owner.** 06-L03 R1 gains a "pre-retention vacuum" item. That item
  implements the vacuum, tests it (a pure test of the threshold function, and
  a DB leg that asserts the statement order and the non-transactional
  channel) and receipts it. The handoff is binding and is recorded here; this
  leaf does not edit the 06-L03 file.

**Autovacuum assumption (stated).** PostgreSQL autovacuum stays enabled (the
default). Insert-triggered autovacuum (PostgreSQL 13 and later, through
`autovacuum_vacuum_insert_threshold` and
`autovacuum_vacuum_insert_scale_factor`) normally sets the visibility map on
the pages of aged rows. The design does not RELY on it: the threshold check
exists for the cases where autovacuum lags or is disabled.

**Recent-rows argument (recorded).** R10-8 risk 1 argued that retention only
reads rows at least 180 days old, on pages that are normally all-visible by
then. That holds for the outer candidate scan. It does not hold for the
per-parent probes:

- the floor probe (`order by floor_probe.version desc offset $1 limit 1`)
  reads each parent's NEWEST `k + 1` index entries;
- the anchor sub-select reads each parent's newest publish row.

These are the most recently written rows, on exactly the pages autovacuum is
least likely to have reached. Their index-only scans then fall back to heap
fetches, which is the 2.2-3.6 ms per parent in R11-3. Autovacuum alone does
not bound the VM-unset cost; the threshold vacuum does.

**Receipt.** The R10-7 receipt records:

```text
coldStatePolicy: {
  policy: "pre_retention_vacuum_on_threshold",
  thresholds: { deadRatio: 0.1, allVisibleRatio: 0.9, insertedRatio: 0.1 },
  owner: "TASK-551-06-L03 R1 pre-retention vacuum",
  decidedBy: "TASK-551-06-L02 R11"
}
```

#### R11-3 (MEDIUM) — Cost model restated from the receipts; `many_parents_k`

**Per-parent cost.** These figures are for the page family with `k = 100`.
Each is a whole-statement time divided by the parent count, so it also
includes the candidate fetch.

| regime | per parent | receipt basis | parents at 4 s |
|---|---|---|---|
| 5-row parents (below the floor) | 65-120 µs | F2R `many_parents_info` 20,000 × 5: 1,328 ms VM set, 2,414 ms worst | ≈ 33k-60k |
| ≥ `k` rows, VM set | 148-332 µs | F2R `after_vacuum_analyze_custom`: `sparse_large` 148 ms, `backlog` 332 ms, each over 1,000 parents | ≈ 12k-27k |
| ≥ `k` rows, VM unset | 2.2-3.6 ms | F2R `sparse_large`: 2,151 ms (`after_analyze_generic`) and 3,642 ms (`after_analyze_custom`) over 1,000 parents | ≈ 1.1k-1.8k |

F2R also measured a cold cache on top of an unset VM: `sparse_large` in
`as_is_custom` took 6,395 ms, about 6.4 ms per parent (about 600 parents
within 4 s). That figure is recorded only. It is not a design regime.

R11-2 keeps production in the VM-set regime, where the 4 s bound is reached
at roughly 12k-27k parents with at least `k` rows each. No R10 gate case has
more than 1,000 parents.

**Superseded (quoted).**

- `:2744-2746`, R10-4 cost-model bullet: "About 65-120 µs per parent: one
  loose-scan step, one floor probe that walks up to `k + 1` index entries
  (index-only once the visibility map is set), and one anchor probe on
  kind-bearing families." It now reads: per-parent cost is one loose-scan
  step, one floor probe that walks up to `k + 1` index entries (index-only
  once the visibility map is set) and one anchor probe on the kind-bearing
  families. It costs about 65-120 µs for parents below the floor, about
  148-332 µs for parents with at least `k` rows when the VM is set, and about
  2.2-3.6 ms when it is unset (the R11-3 table).
- `:3077-3079`, R10-8 risk 2: "**Parent-count scaling.** F2 costs about
  65-120 µs per parent. 20,000 parents took 2.2-2.4 s per batch (1.3 s warm),
  so the 4 s bound is reached at roughly 35,000 parents per family. This
  matters mainly for `entry`." It now reads: "**Parent-count scaling.**
  Per-parent cost depends on parent size and VM state (R11-3 table). The 4 s
  bound is reached at about 33k-60k five-row parents, at about 12k-27k
  parents with at least `k` rows when the VM is set, and at about 1.1k-1.8k
  such parents when it is unset. R11-2 keeps families in the VM-set regime.
  The `many_parents_k` receipt case measures that regime at 20,000 parents,
  and its outcome rule decides whether a documented limit applies. This
  matters mainly for `entry`."

**New R10-7 receipt case `many_parents_k`.**

- **Shape.** 20,000 parents × 101 aged rows, contiguous per parent (the
  `backlog` shape at 20 times the parent count). Every row is `publish`, and
  rows are NARROW (`data '{}'::jsonb`), 2,020,000 rows in all. The floor
  probes walk about 2.02 million index entries per batch.
- **Rows returned: 500.** Each parent has exactly one eligible row (version 1).
  Its anchor, version 101, lies inside the newest 100 rows.
- **Why narrow.** Wide rows would put about 4 GB on the shared `coderso02`
  (`shared_buffers` 64 MB). In the gated state the floor probe is index-only,
  so heap width only matters in the VM-unset states, which are recorded
  anyway.
- **Seeding.** Per R11-5 (b): at most 20,000 rows per statement, so 101
  insert statements.

**Outcome rule for `many_parents_k`.** This is not a closure-blocking latency
gate, and it is never silent.

- If `after_vacuum_analyze_custom` measures `executionMs < 4,000`, the receipt
  records `parentCountCeiling: { measuredParents: 20000, withinBound: true }`.
- If it measures 4,000 ms or more, or is cancelled, the receipt records
  `parentCountCeiling` as a DOCUMENTED LIMIT, with the measured ms and the
  derived per-family parent ceiling. Before 06-L02 closes, the orchestrator
  authors a named follow-on leaf for the 06-L03 mitigation: per-parent
  batching by parent ranges, where the job walks bounded parent-id ranges and
  runs one bounded retention statement per range. The limit has performance
  and reliability impact, so the follow-on is active work, never a
  `TASK-9999` deferral.
- When the statement completes, the rows check (500) and the R10-4 plan guard
  stay gated for this case in every state.

At 148-332 µs per parent, the expected cost is about 3.0-6.6 s, so the
documented-limit branch is the likely outcome.

#### R11-4 (MEDIUM) — Plan-guard required item 4; F2 on `sparse` and `small`

**Superseded (quoted).** `:2739-2740`, R10-4 required item 4: "In `sparse`
and `sparse_large`, `retention_floors` yields 0 rows, so the candidate fetch
runs 0 loops and returns 0 rows." It now reads:

> 4. In `sparse` and `sparse_large`, `retention_floors` yields 0 rows and the
> candidate fetch fetches 0 candidate rows. The join node that feeds the Sort
> or the Limit emits 0 rows. In a P2 plan, the inner
> `page_revisions_page_version_idx` Index Scan also reports 0 actual rows in
> total (rows × loops). Loop counts are recorded, not asserted. A P2 inner
> scan may show 0 or more loops, and a P1 outer `page_revisions_retention_idx`
> scan legitimately runs one loop that walks the aged range while the join
> rejects every row.

**F2 on `sparse` and `small` (required).** F2 has never been measured on
`small` or `sparse`. F2R (`07de0980`) has neither case, and `a44606f6`
measured variant F there, which is a different statement text. The R10-7
re-run's `small` and `sparse` cases are therefore REQUIRED F2 measurements of
the production statement in all four states. Citing F cannot satisfy them.
Until that run, the R10-5 (2) `sparse` margin, which rests on F ("F (same
predicate) wide worst 75 ms"), is a pre-run estimate.

#### R11-5 (LOW) — Receipt, harness and anchor items

**(a) Budgets source pins (untouched).**
`tests/perf/database-revision-budgets.test.ts` is outside the R10 scope and
must stay green without edits. The file is dirty in the working tree from
another stream, so its lines were grounded on disk; HEAD `ee4c7f93` lines are
in brackets. Its source pins over `revisionRetentionService.ts`:

- `:591` [`:569`]: `countOccurrences(source, ".limit(limit)")` is 1;
- `:592` [`:570`]: `'.for("update", { skipLocked: true })'`;
- `:593-596` [`:571-574`]: the delete and drain strings;
- `:597` [`:575`]: `lt(spec.createdAtColumn, cutoff)`;
- `:611-613` [`:589-591`]:
  `computeRetentionCutoff(policy.now, policy.maxAgeDays)`.

Consequences for R10-2:

- The whole-family read uses `.limit(policy.batchSize)`, as the R10-2 snippet
  already shows, and never the text `.limit(limit)`. The per-parent
  `.limit(limit)` (the working-tree service at `:502`) stays the only
  occurrence.
- The per-parent `.for("update", { skipLocked: true })` (working tree `:504`)
  stays byte-identical. The whole-family
  `.for("update", { of: spec.table, skipLocked: true })` is a different
  string and leaves every pin unaffected.

New R10-9 stop rule: if any of these pins would go red, the implementer STOPS
and reports.

**(b) Seed and cleanup batching.** R10-5 (2) specifies "**Seeds set-based.**
One `pages` insert of the leg's marker pages [...] and one `page_revisions`
`insert ... select ... generate_series` statement." (`:2894-2896`). A single
statement of about 100k rows can hit the 15 s `DB_STATEMENT_TIMEOUT_MS`. The
R7 receipt's seeds took 48,498 ms (`large`) and 59,846 ms (`sparse_large`).
The rule is now:

- The page insert stays one statement.
- Revisions are seeded in bounded set-based batches of at most 20,000 rows
  per statement: 6 statements for `mixed`, 3 for `dense`, 1 for `sparse`.
- Cleanup deletes the leg's marker pages in batches of at most 200 pages per
  statement, so at most 20,000 cascaded revisions per statement.
- A seed or cleanup timeout or failure is a harness STOP: the implementer
  stops and reports it. It is never a latency breach, because only the one
  dry-run call is timed.

The same rules bind the R10-7 re-run harness, including `many_parents_k` and
`equiv_detail_page`.

**(c) Red-before wording.** Superseded (quoted), `:2937-2943`: "The `mixed`
leg is the red-before leg. Against the R7 statement (the current source),
A_r7 timed out on this exact shape, so the read is cancelled by the 15 s
`DB_STATEMENT_TIMEOUT_MS` and surfaces as `retention_batch_failed`." and
"`dense` and `sparse` are regression bounds (A_r7 finished there in F2R and
in the R7 receipt)." They now read:

- **`mixed` (red-before).** Against R7, the leg's read is either cancelled
  (surfacing as `retention_batch_failed`) or, if it completes, at or above
  the 4,000 ms ceiling. It is red either way. Evidence: A_r7 was cancelled at
  the 15 s measurement bound in all four states on this narrow shape in
  `84f5139b` and in F2R. `a44606f6` has no DB-leg-shape case.
- **`dense` (regression bound).** A_r7 finished on 200 × 600 in `84f5139b`
  (33-494 ms) and in F2R (16-164 ms). The R7 receipt has no dense case.
- **`sparse` (regression bound, not red-before).** A_r7 finished on wide
  100 × 100 in `a44606f6` (2,340-3,531 ms) and in the R7 receipt `5a60dbac`
  (2,565-3,858 ms). F2R has no sparse case. The leg bounds the zero-match
  walk.

**(d) R10-1 vs R10-6 reconciled.** R10-1 (`:2409-2410`) says "Three parts
stay as R9-7 set them: the three-file scope (`:2179-2186`), gate 4 and
gate 6." R10-6 (`:2969`) keeps "the R9-7 scope and gates 1, 4, 5 and 6, as
amended by R10-9." The surviving R9-7 parts are the scope plus gates 1, 4, 5
and 6. Gates 1 and 5 survive byte-identical and are restated in R10-9. R10-9
is the single authoritative gate list, and the R10-1 "Three parts" sentence
is read as R10-6. R9-7 gates 2 and 3, its Receipt paragraph and its line
counts are superseded.

**(e) R9-7 Receipt quoted as superseded.** `:2205-2210`: "**Receipt.** The
orchestrator's `impl-06-l02.json` addendum (R8 "Receipt", `:1740-1746`) also
records R9. It records the final bytes, line counts and sha256 of the three
R9 files, the executed counts of gates 1-5 (including the DB leg's measured
`elapsedMs`), the envelope edit of R9-5 (3), and the R9-6 receipt as a GATE
(its `budgetVerdict`), no longer as known-limitation evidence." R10-9
**Receipt** (`:3134-3141`) replaces it, as amended in (g).

**(f) `budgetMs`.** Add to the R10-7 `statementSource` changes (`:3005-3014`):
the receipt's `budgetMs`, currently `5000`, becomes `4000`. Grounded: in
`06-l02-r7-explain-receipt.json`, `budgetMs` is a TOP-LEVEL key, not a
`statementSource` key. `statementTimeoutMs` stays `15000`.

**(g) Apply statement and receipt fields.** The R10-7 re-run also records
`applyCompiledSql`: the R10-2 page statement plus
` for update of "page_revisions" skip locked`, 1,367 characters. Its
`applyCompiledSqlSha256` must be
`58ce9b6279a3f1fd83d463aba9d8f1699d0ed73205882de94f823eeb40c2572c`
(computed on 2026-09-25 from the `:2435` statement bytes plus the suffix, with
no trailing newline). The R10-9 **Receipt** addendum also records:

- `coldStatePolicy` (R11-2);
- `parentCountCeiling` (R11-3);
- the `equiv_detail_page` verdict (h);
- the per-state `relpages` and `relallvisible` evidence (R11-1).

**(h) Equivalence evidence for the non-page families.**

- **DB-free.** The R10-5 (1) family-map test (all five families: parent
  column, floor probe and anchor presence) and the new-file Tests 2 and 3
  (byte pins of all five statements). The R10-3 proof is family-generic:
  only the table, the parent column and the anchor term vary.
- **DB, a new gated R10-7 case `equiv_detail_page`.** It applies the F2R
  `equiv` method to `detail_page_revisions`: about 300 marker detail-page
  parents with 0-259 rows each, random kinds (about 30 % publish), and
  hour-truncated timestamps with ties and fresh rows. It compares against the
  JS oracle for R7's `E(r)`:
  - the full ordered set of the R10-2 `detail_page` statement (1,464
    characters, sha256
    `1d6b991c6b2fb71267727815797e56a0c8d71d53d8dc6777546b9463b6be0117`),
    bound with `$3` at least the eligible count;
  - its first 500 rows.

  The gate is that both are equal. The case has no latency gate. The
  kind-less families (`widget_template`, `entry`, `post`) rely on the DB-free
  evidence plus the proof: their statements are the same template without the
  anchor term.

**(i) Anchor corrections in R10-1.**

- R9-2 **Helper** is quoted as `:1824-1826`. The quoted sentence spans
  `:1824-1825`.
- The `candidate_parents` fragment pin is cited as `:2012-2018`. It is
  `:2013-2019`: the lead-in sentence at `:2013` and the fence at
  `:2015-2019`.

**(j) Cross-file notes (added; each belongs to its owner, none is edited
here).**

- TASK-551-10-L01, `:1748` (heading "Amendment (2026-09-25): revision-suite
  argv sync with 06-L02 R9 / 06-L03 A1 / 02-L02") and `:1758` ("06-L02 R9:
  `tests/perf/database-revision-candidate-bounds.test.ts`"): read as R10. The
  path is unchanged.
- TASK-551-06-L03 R1 gains the "pre-retention vacuum" item (R11-2).

**Updated R10-7 case table (additions).**

| case | shape | rows returned | gate |
|---|---|---|---|
| `many_parents_k` | 20,000 × 101 aged, contiguous per parent, publish, narrow | 500 | R11-3 outcome rule; rows and plan guard gated when it completes |
| `equiv_detail_page` | about 300 detail-page parents × 0-259 rows, random kinds | oracle-equal | ordered equality only |

**R10-9 stop rules (additions).** The implementer also STOPS and reports
when:

- a budgets-test source pin (a) would go red;
- a DB-leg seed or cleanup statement times out or fails (b).

### R11 amendments (R12, 2026-09-26)

This subsection is append-only. Nothing above it is edited. It amends R11
after the two R11 contract audits (1 HIGH, 10 MEDIUM of which two pairs overlap, and
7 LOWs; the finding-to-disposition table is R12-7). Where an item below quotes
an earlier sentence, the item wins and the quoted sentence is read as
replaced. Anchors into this file are current line numbers. R12 starts after
`:3625`, so no earlier line moves. Every other anchor was grounded on
2026-09-26 against HEAD `ee4c7f93` plus the uncommitted working tree. R12
does not touch the Workflow Dispatch Envelope fence, `**Status:**` or
`**Changelog:**`. It adds no file to the R10-9 scope and changes no expected
test count: the new file keeps 6 tests (85 = 79 + 6, `:3122`) and the unit
regression keeps 37 (`:3126`). Its only code-contract addition is one export
in `core/services/content/revisionRetentionService.ts` (R12-3), a file
already in the R10-9 scope.

The orchestrator decisions relayed in the R12 mandate are cited as D1-D10:

- D1: the pre-retention VACUUM is a scheduler pre-step on the ordinary
  client, with its own 120 s statement bound, before the family session
  opens and outside any lease; failure is logged and never blocks retention;
  06-L03 C4 is untouched.
- D2: VACUUM runs unconditionally before each family's retention pass; the
  ratio triggers are dropped.
- D3: a closed accessor `getRevisionFamilyTableName(family)` joins R10-2 and
  its pins.
- D4: `many_parents_k` is exempt from budget items 1, 4 and 5; a documented
  `parentCountCeiling` names the reserved follow-on `TASK-551-06-L04`.
- D5: VM-unset measurement timeouts are recorded, not gated.
- D6: cleanup batches are sized by cascaded rows.
- D7: per-leg wall budget; 180 s for the `mixed` and `dense` legs.
- D8: harness VACUUM bound of 300 s; a timeout is a harness STOP with the
  xmin-horizon check recorded.
- D9: the red-before receipt citation is corrected.
- D10: the R10-7 drain wording is gated per budget item 4.

#### R12-1 (HIGH) — The pre-retention VACUUM is an unconditional scheduler pre-step

**Finding.** R11-2 routed the VACUUM through the dedicated session's
autocommit `session.execute` with a bound "inside the run budget". Outside a
transaction that statement keeps only the 15 s session bound
(`core/db/client.ts:75`), while 06-L03 C4 (06-L03 `:623-627`) admits only
non-hanging statements outside transactions and drains in 4,500 ms
(`RETENTION_CANCEL_DRAIN_DEADLINE_MS`, `core/db/databaseLifecycle.ts:30`). A
VACUUM bounded inside the drain rarely finishes on a large table, and a longer
bound breaks C4. The table-ratio trigger also let up to 10 % of rows, the
newest ones that the per-parent probes read, stay VM-unset.

**Decision (D1, D2).** `coldStatePolicy` is
`"pre_retention_vacuum_unconditional"`. Each scheduled run issues, for each
ENABLED revision family in `REVISION_RETENTION_FAMILY_ORDER`, one
`VACUUM (ANALYZE) <family table>` as a separate autocommit statement on the
ORDINARY database client. All of them run BEFORE `runRetentionPlan` opens the
dedicated maintenance session, so they run outside the advisory-lock lease
and outside every `session.transaction`. There is no threshold: VACUUM skips
all-visible pages, so it is cheap when nothing changed since the last run. A
VACUUM failure or timeout is logged and never blocks retention. R10-2's code
still never issues VACUUM, and 06-L03 C4 stays byte-identical: C4 governs the
dedicated session, which the pre-step never uses.

**Binding execution rules (handoff to 06-L03; this leaf edits neither the
06-L03 file nor its code).**

- **Placement.** In the scheduler's run, immediately before the plan call
  `runRetentionPlan(now, signal, { maxRunMs })`
  (`core/server/jobs/retentionScheduler.ts:397-398`, the default runner that
  `executeRun` at `:513` awaits). The pre-step shares the run's
  `AbortController` signal and the scheduler's strict non-overlap rule
  (`:561-562`): a pre-step that outlives an interval drops the next due tick
  and never overlaps it.
- **Families.** Only families whose owner normalizer reports them enabled:
  `normalizeRevisionRetentionPolicy(family, undefined, env).enabled`
  (`revisionRetentionService.ts:317`). A disabled family gets no SQL. A
  normalizer error skips that family's VACUUM with a log code; the job
  re-normalizes and keeps its own fail-closed classification.
- **Statement and identifier.** `VACUUM (ANALYZE) "<table>"`. The table name
  comes only from `getRevisionFamilyTableName(family)` (R12-3). It is rendered
  as a quoted identifier through the driver's identifier API, never
  concatenated from input or settings.
- **Channel.** It runs on one reserved connection of the ordinary client, the
  pool behind `db` (`core/db/client.ts:91`). It never runs on
  `maintenanceSqlClient`, the dedicated session, `session.transaction` or
  `drizzleOverTransaction(tx)`.
- **Bound (D1; realization recorded).** PostgreSQL rejects VACUUM inside any
  transaction block, including the implicit block of a multi-statement query
  string. So a literal tx-local `set_config('statement_timeout', '120000',
  true)` cannot precede it. The 120,000 ms bound is scoped to this one
  statement on the reserved connection instead:
  `select set_config('statement_timeout', '120000', false)`, then the VACUUM,
  then `reset statement_timeout` in `finally`, then release. `reset` restores
  the startup value `config.statementTimeoutMs` (`client.ts:75`). If the reset
  does not confirm, the backend is terminated instead of being returned to the
  pool, so the 120 s bound never leaks into ordinary traffic. Ordinary
  sessions are verified against exactly that startup value
  (`client.ts:162`, `:174`). `lock_timeout` keeps the session value.
- **Transaction pooling.** With `DB_PGBOUNCER_MODE=transaction`
  (`core/db/databaseConfig.ts:316-319`) a reserved connection is not
  session-affine, so the scoped bound could land on another backend. The
  pre-step then issues no VACUUM for any family and logs one skip code.
  Retention proceeds under the residual below.
- **Abort.** The run signal is checked before each VACUUM. On abort the live
  statement is cancelled (the driver's `query.cancel()`), the reset or
  terminate path runs, and the abort PROPAGATES. The run ends in the
  scheduler's `aborted` outcome (`retentionScheduler.ts:531`) and the plan is
  not started. Abort is never swallowed as a VACUUM failure. Shutdown
  containment for the pre-step is this abort-driven cancel plus the ordinary
  client's close; it is not a C4 statement.
- **Failure.** A statement timeout, lock timeout or other error is logged at
  warn level with a redacted closed code and the family id only. The log
  carries no SQL text, bind value, OID or server message. The next family's
  VACUUM, then the retention plan, proceed. Correctness does not depend on the
  visibility map (R10-3).
- **Privilege.** VACUUM on a table the role may not vacuum emits a WARNING and
  skips it, without an error. Before the first VACUUM, one catalog statement
  reads `pg_has_role(current_user, c.relowner, 'USAGE')` over `pg_class` for
  the enabled family tables. A table the role may not vacuum is skipped with a
  `not permitted` code. A PostgreSQL 17+ `MAINTAIN`-only grant is
  conservatively treated as not permitted; that is a recorded limitation.
- **Effectiveness.** After each VACUUM that returned, one catalog read of that
  table's `pg_class.relpages` and `relallvisible`. A ratio
  `relallvisible / greatest(relpages, 1)` below 0.9 logs an `ineffective`
  code. The usual causes are an older snapshot holding the xmin horizon, or
  concurrent inserts. The code is telemetry, never a failure.
- **Outcomes.** 06-L03 names one closed log-code set that covers: ran,
  ineffective, skipped (disabled, normalizer error, transaction pooling, not
  permitted) and failed (statement timeout, lock timeout, other error).
- **Lock (corrects R11-2 "Lock").** VACUUM takes `SHARE UPDATE EXCLUSIVE`. It
  blocks no reads, inserts or deletes, but it conflicts with a concurrent
  VACUUM, ANALYZE or `CREATE INDEX CONCURRENTLY` on the same table; that wait
  is bounded by the session `lock_timeout`. Its final heap-truncation phase
  may briefly take `ACCESS EXCLUSIVE`, acquired only conditionally and given
  up when another backend waits. That can block reads for a moment and is
  replayed as a lock on hot standbys. The statement text stays as D2 pins it;
  this leaf does not adopt `TRUNCATE false`.
- **Mode.** It runs for dry-run and apply alike, since it changes no logical
  data. It runs before the session and on another client, so 06-L03's
  dedicated-session statement accounting ("dry-run is L02's single bounded
  candidate read", `retentionJobService.ts:797-799`) and its PID-proof tests
  do not change. The pre-step's statements are counted in its own tests.
- **Module and line gate.** The pre-step lives in its own module. Statement
  rendering, the closed codes and the outcome classification are pure and
  Bun-free; the database calls sit behind lazy deps. `retentionScheduler.ts`
  (786 lines) and `retentionJobService.ts` (947 lines) receive only the call,
  and neither may exceed 1,000 lines.
- **Tests (owned by 06-L03).** Pure: statement and identifier rendering for
  all five families, the closed codes and the skip classification. DB leg:
  the VACUUM succeeds (so it ran outside any transaction), it runs before the
  dedicated session opens, the released connection's `statement_timeout`
  equals the startup value, and an abort propagates.
- **Prerequisites (recorded; the orchestrator places them).**
  1. The reserved ordinary-connection seam with the scoped bound belongs in
     `core/db/client.ts`. That file exports no reservation today (`sqlClient`
     is module-private; only `db` at `:91`), and it is in 06-L03's
     `forbiddenPaths` (06-L03 `:333`). Its owner, TASK-551-02-L02, or an
     orchestrator-named amendment adds the seam before 06-L03 implements the
     pre-step.
  2. 06-L03's envelope `allowlist` (06-L03 `:319-331`) gains the pre-step
     module and its test file.

  Neither file is edited here.

**Residual (recorded).** The pre-step is best-effort. When a VACUUM is
skipped, fails, is ineffective, or cannot set the visibility map because of
the xmin horizon, the per-parent probes read VM-unset pages. The candidate
read is then bounded by the 4,000 ms tx-local cancel and surfaces as the
existing `retention_batch_failed` for that family and run. The next run
vacuums again.

**Receipt (replaces the R11-2 block at `:3364-3371`).**

```text
coldStatePolicy: {
  policy: "pre_retention_vacuum_unconditional",
  statement: "VACUUM (ANALYZE) <family table>",
  channel: "ordinary client, autocommit, before the dedicated session, outside any lease",
  statementTimeoutMs: 120000,
  failure: "logged; never blocks retention",
  owner: "TASK-551-06-L03 scheduler pre-step (pre-retention vacuum)",
  decidedBy: "TASK-551-06-L02 R11, amended R12"
}
```

**Superseded (quoted).**

- `:3214`: "R11-2 closes the VM-unset gap in production. The gate does not."
  It now reads: "R12-1's unconditional pre-retention VACUUM moves production
  toward the VM-set state before every run. It is best-effort; the residual is
  bounded by the 4,000 ms cancel (R12-1 **Residual**). The gate does not
  close the gap."
- `:3276-3281` (R11-2 **Decision**), from "`\"pre_retention_vacuum_on_threshold\"`"
  to "never issues it.": read as R12-1 **Decision**.
- `:3283-3304`, the whole **Threshold (columns verified)** paragraph with its
  three disjuncts, including `:3302-3303` "A missing `pg_stat_user_tables` row
  (for example after a stats reset) counts as \"run the vacuum\"." No
  threshold exists any more. That sentence was also wrong: the view has a row
  for every user table, and a stats reset zeroes the counters.
- `:3308-3311` (**Statement**), "The identifier comes from the closed family
  map (`REVISION_FAMILY_SPECS`, [...]) and is rendered as a quoted
  identifier.": the identifier now comes from `getRevisionFamilyTableName`
  (R12-3). The map stays module-private.
- `:3312-3318` (**Channel**), "It runs through the dedicated maintenance
  session's non-transactional `session.execute(statement, signal)` [...],
  after `session.assertAlive(signal)` and before `session.transaction(...)`":
  read as R12-1 **Placement** and **Channel**.
- `:3319-3321` (**Lock**), "A plain `VACUUM` takes `SHARE UPDATE EXCLUSIVE`,
  which blocks no reads, inserts or deletes.": read as R12-1 **Lock**.
- `:3322-3324` (**Bound**), "06-L03 chooses a bounded statement timeout
  inside the run budget (`DEFAULT_MAX_RUN_MS`, 300,000 ms,
  `retentionJobService.ts:604`).": read as R12-1 **Bound** (120,000 ms).
- `:3325-3330` (**Failure**): read as R12-1 **Failure** and **Abort**. Abort
  and session loss are never swallowed.
- `:3331-3334` (**Mode**), "For each family the ledger records whether the
  vacuum ran, was skipped by the threshold, or failed.": the outcome is logged
  by the scheduler (R12-1 **Outcomes**). It is not a job-ledger field.
- `:3335-3339` (**Owner**), "06-L03 R1 gains a \"pre-retention vacuum\" item.
  That item implements the vacuum, tests it (a pure test of the threshold
  function, and a DB leg that asserts the statement order and the
  non-transactional channel) and receipts it.": 06-L03 gains a "scheduler
  pre-step (pre-retention vacuum)" item with the R12-1 **Tests**.
- `:3345-3346`, "the threshold check exists for the cases where autovacuum
  lags or is disabled": the unconditional pre-step covers those cases.
- `:3359-3360`, "Autovacuum alone does not bound the VM-unset cost; the
  threshold vacuum does.": "Autovacuum alone does not bound the VM-unset cost.
  The unconditional pre-step reduces it, and the 4,000 ms cancel bounds the
  residual."
- `:3389`, "R11-2 keeps production in the VM-set regime": "R12-1 moves
  production toward the VM-set regime, best-effort".
- `:3269-3270` (the R11 text of R10-8 risk 1), "Production closes the gap
  with the threshold-triggered pre-retention vacuum of R11-2": "Production
  reduces the gap with the unconditional pre-retention VACUUM of R12-1; the
  residual is bounded by the 4,000 ms cancel."
- `:3411` (the R11 text of R10-8 risk 2), "R11-2 keeps families in the VM-set
  regime.": "R12-1 moves families toward the VM-set regime, best-effort."
- `:3612`, R11-5 (j): "TASK-551-06-L03 R1 gains the \"pre-retention vacuum\"
  item (R11-2).": it gains the R12-1 scheduler pre-step item.

#### R12-2 (MEDIUM) — Gate accounting: `many_parents_k`, VM-unset timeouts, drain reads

**(a) `many_parents_k` (D4).** The case is exempt from R10-7 budget items 1
(latency), 4 (drain reads) and 5 (`breaches`). Its drain is recorded with
`gated: false`. A documented-limit `parentCountCeiling` is a recorded limit,
never a `budgetVerdict` breach.

- **Expected outcome.** The closest measured shape is F2R `backlog` (1,000
  parents × 101 rows, contiguous, publish): 332 ms in
  `after_vacuum_analyze_custom`, about 332 µs per parent. That predicts about
  6.6 s at 20,000 parents, so the documented-limit branch is expected. The
  148 µs `sparse_large` figure does not fit this shape, because 100-row
  parents produce no floor row.
- **Receipt field.**

  ```text
  parentCountCeiling: {
    measuredParents: 20000,
    withinBound: <boolean>,
    vmSetExecutionMs: <number | null>,
    timedOut: <boolean>,
    derivedCeilings: {
      atLeastKRowsVmSet: <floor(4000 / (vmSetExecutionMs / 20000)); an upper bound when timedOut>,
      fiveRowParents: "about 33k-60k (F2R many_parents_info; not re-measured)"
    },
    followOn: "TASK-551-06-L04 Per-parent retention batching" | null,
    gated: false
  }
  ```

- **Follow-on.** The follow-on id `TASK-551-06-L04`, "Per-parent retention
  batching", is RESERVED. The orchestrator allocates it at 06-L02 closure in
  the documented-limit branch. It is active work, never a `TASK-9999`
  deferral. Its scope is both derived ceilings: the job walks bounded
  parent-id ranges and runs one bounded retention statement per range. It
  lands after the 06-L03 R1 code, because it changes the 06-L03 family unit.
  It does not block 06-L02 closure, where the limit is recorded. As a
  TASK-551-06 child, it blocks the TASK-551-06 parent and TASK-551 from
  closing until it is terminal. In the `withinBound: true` branch the id
  stays reserved for this purpose only. The orchestrator then decides at
  closure from the recorded ceilings whether to allocate it, and records the
  decision in the closure receipt.
- **Superseded (quoted).**
  - `:3431-3432`: "This is not a closure-blocking latency gate, and it is
    never silent." It now reads: "It is exempt from budget items 1, 4 and 5
    (R12-2 (a)), and it is never silent."
  - `:3438-3443`, "Before 06-L02 closes, the orchestrator authors a named
    follow-on leaf for the 06-L03 mitigation": the follow-on is the reserved
    `TASK-551-06-L04` above.
  - `:3447-3448`: "At 148-332 µs per parent, the expected cost is about
    3.0-6.6 s, so the documented-limit branch is the likely outcome." It now
    reads: "On the `backlog` basis (332 µs per parent) the expected cost is
    about 6.6 s, so the documented-limit branch is expected."
  - `:3249-3250`, "The `many_parents_k` case (R11-3) follows its own outcome
    rule instead.": it also leaves items 4 and 5, as above.

**(b) VM-unset measurement timeouts, every case (D5).** In a VM-unset state
(`as_is_custom`, `after_analyze_custom`, `after_analyze_generic`), a
measurement cancelled at the 15 s bound is recorded as
`timedOut: true, gated: false`. It is neither a breach nor a harness STOP.

- **Plan guard.** It is then evaluated on a plain `EXPLAIN (FORMAT JSON)`,
  without ANALYZE, of the same statement and binds in the same state, and it
  checks node shapes only:
  - evaluated: forbidden items 1, 3, 4 and 5; required items 2 and 3; and
    the node shape of required item 1 (a Limit over an Index Scan or Index
    Only Scan on `page_revisions_page_version_idx`, alias `floor_probe`);
  - recorded as `notEvaluable`: forbidden item 2 and the loop equality of
    required item 1, which need `Actual Loops`, and required item 4, which
    needs actual rows.
- **Rows check.** It runs only when the statement completes.
- **VM-set state.** A timeout in `after_vacuum_analyze_custom` is still a
  budget item 1 breach for every case except `many_parents_k` ((a)).
- **Superseded (quoted).** `:3223-3224`: "The plan guard (R10-7 budget item 2)
  and the rows check (item 3) still apply in all four states." It now reads:
  "The plan guard and the rows check apply in all four states when the
  statement completes; a VM-unset timeout follows R12-2 (b)." `:3444-3445`
  ("When the statement completes, the rows check (500) and the R10-4 plan
  guard stay gated for this case in every state.") is read with (b): a
  VM-unset timeout of `many_parents_k` uses the EXPLAIN node-shape guard.

**(c) Drain reads (D10).** Superseded (quoted), `:3038`: "**Per-run drain
evidence (recorded, not a gate).**" It now reads: "**Per-run drain evidence
(gated by budget item 4, except `many_parents_k`).**" Budget item 4 gates the
candidate READS of the drain run after the `after_vacuum_analyze_custom`
state (R11-1 `:3229-3231`). Deletes, per-batch walls and totals stay recorded.
A drain in a VM-unset state stays `gated: false`, and the `many_parents_k`
drain is recorded with `gated: false` ((a)).

**(d) R10-4 case scope.** `:2715-2716`, "Required items 1-3 apply to the
cases with at least 100,000 rows (`large`, `sparse_large`, `dense`,
`backlog`).": the list also includes `many_parents_k` (2,020,000 rows).

**(e) `equiv_detail_page`.** Its only gate is the R11-5 (h) ordered equality.
Budget items 1, 2 and 4 do not apply, because the plan guard and the
latency bound are page-family contracts. It runs no drain.

#### R12-3 (MEDIUM) — Closed accessor `getRevisionFamilyTableName` (D3)

**Why.** `REVISION_FAMILY_SPECS` is module-private
(`revisionRetentionService.ts:158`), and `retentionJobService.ts:74-79`
imports no table accessor. Without an export, 06-L03 could only obtain the
VACUUM identifier by editing the 06-L02-owned file or by duplicating the
family-to-table map, which AGENTS.md forbids.

**Addition to R10-2 (binding).** The service gains exactly one export, next
to `isRevisionRetentionFamily` (`:197`), plus `getTableName` in the existing
`drizzle-orm` import (`:69`):

```ts
/** Physical table of one closed revision family (06-L03 pre-retention VACUUM). */
export function getRevisionFamilyTableName(family: RevisionFamily): string {
  if (!isRevisionRetentionFamily(family)) fail("family_unknown");
  return getTableName(REVISION_FAMILY_SPECS[family].table);
}
```

It reuses the existing `family_unknown` reason (`:322`), so no new error code
is added. No statement byte changes: the R10-2 pins and the budgets source
pins of R11-5 (a) are unaffected.

**Pins (new file only, no new test).**

- A constant `R10_FAMILY_TABLE: Readonly<Record<RevisionFamily, string>>`
  holds `page_revisions`, `widget_template_revisions`,
  `detail_page_revisions`, `content_revisions` and `post_revisions` (grounded:
  `core/db/tables/pages.ts:90`, `:163`, `widgets.ts:76`, `content.ts:121`,
  `posts.ts:88`).
- Test 2 asserts, per family,
  `getRevisionFamilyTableName(family) === R10_FAMILY_TABLE[family]`, plus one
  assertion that an unknown family throws a `RetentionPolicyError` with
  `reason` `family_unknown`.
- Test 3's `"<table>"` is `R10_FAMILY_TABLE[family]`.

**Superseded (quoted).**

- `:2416-2418`, "and changes no export, ledger shape, error code or policy
  knob.": "and adds exactly one export (`getRevisionFamilyTableName`,
  R12-3); it changes no other export, ledger shape, error code or policy
  knob."
- `:3280`, "R10-2's code does not change": R10-2 gains only the R12-3
  accessor; its statements do not change.
- `:3146`, "service about 720;": about 730. `:2950` and `:3148`, "about 330":
  about 350 (R12-3 pins and the R12-4 constants and batch loops).

New R10-9 stop rule: if a family's physical table differs from its
`R10_FAMILY_TABLE` literal, the implementer STOPS and reports; the pin is
never edited to match the code.

#### R12-4 (MEDIUM) — Harness: cleanup batching, per-leg budget, VACUUM bound

**(a) Cleanup batches sized by cascaded rows (D6).** Pages per cleanup
statement = `floor(20,000 / rowsPerParent)`, where `rowsPerParent` is the
largest parent in the batch:

| shape | rows per parent | pages per statement |
|---|---|---|
| DB-leg `dense`, receipt `dense`, receipt `small` | 600 | 33 (`small` has 1 page) |
| receipt `large` | 1,000 | 20 |
| receipt `backlog`, `many_parents_k` | 101 | 198 |
| DB-leg `sparse`, receipt `sparse`, `sparse_large` | 100 | 200 |
| DB-leg `mixed` | 100, plus one 105-row parent | 200; the 105-row parent is deleted alone |
| `equiv_detail_page` | at most 259 | 77 |

The file-level `afterAll` residue sweep (`${RUN}%`) uses the same rule, with
the leg's largest parent as `rowsPerParent`. A STOP report records the
residue count: marker pages and cascaded revisions left behind.

Superseded (quoted), `:3512-3513`: "Cleanup deletes the leg's marker pages in
batches of at most 200 pages per statement, so at most 20,000 cascaded
revisions per statement." It now reads as (a).

**(b) Per-leg wall budget (D7).** A leg's budget covers seed, recount, the
timed read and cleanup. The `mixed` and `dense` legs run under a new constant
`DB_LEG_HEAVY_TIMEOUT_MS = 180_000`; `sparse` keeps
`DB_LEG_TIMEOUT_MS = 60_000`. `CANDIDATE_READ_CEILING_MS` stays 4,000 ms, and
only the one dry-run call is timed against it. A leg-level test timeout is a
harness STOP, never a latency breach. Evidence: F2R seeded
`dbleg_mixed_narrow` in 44,861 ms and `84f5139b` in 48,779 ms, before
recount and cleanup.

Superseded (quoted): `:2844` "`DB_LEG_TIMEOUT_MS = 60_000`." now reads
"`DB_LEG_TIMEOUT_MS = 60_000` (sparse) and `DB_LEG_HEAVY_TIMEOUT_MS =
180_000` (mixed, dense)." `:2887` "Each is `testIfDb(<title>, ...,
DB_LEG_TIMEOUT_MS)`" now reads "Each is `testIfDb(<title>, ..., <its leg
timeout>)`". The three titles are unchanged.

**(c) Receipt-harness statement bounds (decided here).** The R10-7 re-run
harness keeps the 15 s measurement bound (`:2986`) for measured statements
only. Its seed and cleanup statements run under a harness bound of 120 s,
which is recorded. R10-8 risk 4 measured up to 2.3-3.3 s per 500-row wide
delete, and the R7 wide seed rate (59,846 ms per 100k) leaves about 12 s per
20k rows. A 15 s bound would make the wide receipt cases a near-certain STOP.
A seed or cleanup timeout under the 120 s bound is still a harness STOP. The
DB legs are narrow and keep the lane's 15 s bound.

**(d) Harness VACUUM (D8).** Every harness `VACUUM (ANALYZE)` runs under a
300 s statement bound, which is recorded. A VACUUM timeout on `coderso02` is a
harness STOP, not a miss that earns a re-run. On a STOP the receipt records
the xmin-horizon check, verbatim
`select xact_start from pg_stat_activity where state <> 'idle'`, together with
`autovacuum`, `autovacuum_vacuum_insert_threshold` and
`autovacuum_vacuum_insert_scale_factor` from `pg_settings`. The R11-1
`relallvisible` validity check (`:3216-3221`) is unchanged: one re-run on a
ratio miss, then STOP, and a second ratio miss records the same evidence.

**(e) Run order and preconditions.** No other lane runs on `DATABASE_URL3`
during the receipt. `many_parents_k` runs last, followed by its cleanup and
one final `VACUUM (ANALYZE) page_revisions` under the 300 s bound. The final
VACUUM is recorded and does not gate.

#### R12-5 (LOW) — Wording and evidence corrections

**(a) Red-before citation (D9).** Superseded (quoted), `:3530-3532`:
"Evidence: A_r7 was cancelled at the 15 s measurement bound in all four
states on this narrow shape in `84f5139b` and in F2R." It now reads:
"Evidence: A_r7 was cancelled at the 4,000 ms statement timeout in all four
states on this narrow shape in `84f5139b` and in F2R." Grounded:
`06-l02-r9-f2-prod-shape-explain.json` case `dbleg_mixed_narrow` (`cases[4]`)
and `06-l02-r9-f-floor-join-explain-part2.json` `cases[1]` record A_r7 with
`"timedOut": true` and `"statementTimeoutMs": 4000` in all four states. That
is red, because the leg ceiling is 4,000 ms.

**(b) Cost table.** The R11-3 row "≥ `k` rows, VM unset | 2.2-3.6 ms"
(`:3383`) now reads "1.2-3.6 ms (F2R `backlog` 1,209 and 1,356 ms,
`sparse_large` 2,151 and 3,642 ms, each over 1,000 parents)", which gives
about 1.1k-3.3k parents at 4 s. R11-3 keeps the 3.6 ms worst case as its
design ceiling.

**(c) `heapFetches`.** If the re-run records heap fetches, it records the raw
per-node EXPLAIN `Heap Fetches` values as `heapFetchesRawPerNode`, never
multiplied by loops. F2R's `heapFetches` (60,599,001 against 101,001 rows
touched) is not comparable, and no gate uses it.

**(d) Hashes recomputed (2026-09-26).** From the file bytes, with no trailing
newline: `:2435` is 1,324 characters, sha256 `4335ee3c…0902`, as in
`:3006`. Plus the suffix it is 1,367 characters, sha256 `58ce9b62…572c`, as in
`:3566`. `:2441` is 1,464 characters, sha256 prefix `1d6b991c6b2f`, as in
`:3588`.

**(e) Cross-file notes (each belongs to its owner; none is edited here).**

- TASK-551-06-L03 has no pre-retention vacuum item yet. It gains the R12-1
  scheduler pre-step item and the envelope prerequisite. Its A2 sentences
  (`:1411-1412`) "`TASK-551-06-L04` is not allocated. No file under
  `_docs/_TASKS/` references it apart from R1-d above." are stale once R12 is
  recorded: the id is now reserved for "Per-parent retention batching"
  (R12-2 (a)), a different purpose from the superseded R1-d proposal. It was
  never allocated, so reserving it reuses no retired number.
- `core/db/client.ts` owner (TASK-551-02-L02): the R12-1 prerequisite 1 seam.
- TASK-551-06 parent and the board: allocating `TASK-551-06-L04` at 06-L02
  closure adds the child row and the statistics delta, which are
  closure-owned.

#### R12-6 — R10-9 receipt and stop-rule additions

The R10-9 **Receipt** addendum records `coldStatePolicy` in the R12-1 shape,
`parentCountCeiling` in the R12-2 shape, every harness VACUUM bound and
outcome (R12-4 (d)), and the harness seed and cleanup bound (R12-4 (c)).

The implementer also STOPS and reports when:

- a DB leg exceeds its leg timeout (R12-4 (b));
- a family's physical table differs from its `R10_FAMILY_TABLE` literal
  (R12-3).

#### R12-7 — Finding-to-disposition table

Audit A (1 HIGH, 4 MEDIUM, 2 LOW) and audit B (6 MEDIUM, 5 LOW):

| finding | severity | disposition |
|---|---|---|
| A1 VACUUM on the dedicated session breaks C4; no 06-L03 owner item | HIGH | Closed by R12-1 (D1): ordinary-client pre-step before the session, 120 s scoped bound, C4 untouched; 06-L03 item and prerequisites recorded (R12-5 (e)) |
| A2 production trigger does not reproduce the gated state (ratio, xmin horizon, privilege) | MEDIUM | Closed by R12-1 (D2): unconditional VACUUM, effectiveness re-read, privilege check, claims reworded as best-effort with the residual stated |
| A3 `many_parents_k` near-certain breach; follow-on unnamed | MEDIUM | Closed by R12-2 (a) (D4): exempt from items 1, 4 and 5; `backlog` basis; `TASK-551-06-L04` reserved; land order and closure effect stated; both ceilings recorded |
| A4 cleanup arithmetic false | MEDIUM | Closed by R12-4 (a) (D6); wide seed and cleanup margin closed by R12-4 (c) |
| A5 harness VACUUM not deterministic | MEDIUM | Closed by R12-4 (d) and (e) (D8): 300 s bound, timeout STOP with xmin and autovacuum evidence, no concurrent lane, `many_parents_k` last |
| A6 lock claim incomplete; dry-run statement accounting | LOW | Closed by R12-1 **Lock** and **Mode** |
| A7 missing `pg_stat_user_tables` row sentence | LOW | Moot: the threshold is removed (R12-1); the sentence is quoted as wrong |
| B1 `many_parents_k` still under items 4 and 5 | MEDIUM | Closed by R12-2 (a) |
| B2 VM-unset timeout leaves items 2 and 3 unevaluable | MEDIUM | Closed by R12-2 (b) (D5) |
| B3 cleanup arithmetic false | MEDIUM | Closed by R12-4 (a) (D6) |
| B4 60 s leg timeout vs 45-49 s seeds | MEDIUM | Closed by R12-4 (b) (D7) |
| B5 `REVISION_FAMILY_SPECS` private; no export | MEDIUM | Closed by R12-3 (D3) |
| B6 `coldStatePolicy` premise (10 % window is the probed rows) | MEDIUM | Closed by R12-1 (D2) and the reworded claims |
| B7 red-before citation (15 s vs 4,000 ms) | LOW | Closed by R12-5 (a) (D9) |
| B8 pre-step module vs 947-line job service | LOW | Closed by R12-1 **Module and line gate** |
| B9 truncation lock; abort must propagate | LOW | Closed by R12-1 **Lock** and **Abort** |
| B10 R10-4 list lacks `many_parents_k` | LOW | Closed by R12-2 (d) |
| B11 VM-unset cost row uses `sparse_large` only | LOW | Closed by R12-5 (b) |
| B INFO heap-fetch metric; sha unchecked; DB legs VM-unset | INFO | R12-5 (c) and (d); the DB-leg note needs no change |
| R10-7 drain wording "recorded, not a gate" | orchestrator | Closed by R12-2 (c) (D10) |

### R12 amendments (R13, 2026-09-26)

This subsection is append-only. Nothing above it is edited. It amends R12
after the two R12 contract audits (audit A: 1 HIGH, 2 MEDIUM, 5 LOW, 2 INFO;
audit B: 3 HIGH, 2 MEDIUM, 5 LOW; the finding-to-disposition table is
R13-8). Where an item below quotes an earlier sentence, the item wins and the
quoted sentence is read as replaced; R13-6 lists every quote. Everything not
quoted stays binding. Anchors into this file are current line numbers; R13
starts after `:4154`, so no earlier line moves. Every other anchor was
grounded on 2026-09-26 against HEAD `66203e22` plus the uncommitted working
tree.

The orchestrator decisions for this round are in
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`.
They are cited as D1-D9. R12's own decision list (`:3643-3661`) is cited as
R12-D1 to R12-D10 so the two lists never collide. R13 implements D2, D4 and
D5, and consumes D1 (owned by TASK-551-02-L02 R9) as its prerequisite 1.

R13 does not touch the Workflow Dispatch Envelope fence (`:321-438`),
`**Status:**` or `**Changelog:**`. It edits no json or sh fence. It adds one
test file to the code scope, `tests/integration/server/task551RetentionJobService.test.ts`
(R13-4 (i)), which is NOT in this leaf's envelope `allowlist`; R13-9 records
the exact entry that would be needed. It changes no expected test count.

#### R13-1 (HIGH) — Pre-step channel, target, bound and abort go through the D1 seam (D2)

**Findings (bounded).** R12-1 ran the VACUUM on a reserved connection of the
ordinary pool behind `db`, with a session-level `set_config`, a `reset` in
`finally` and a terminate-on-unconfirmed branch. 02-L02 R7 removed that
reserved-handle lifecycle because a statement or `release()` on a dead
reserved handle never settles and poisons the pool (02-L02 `:1338-1341`,
R7.9 `:2504-2508`). R12-1 also skipped the pre-step under transaction
pooling, which is the documented Render shape (`core/db/connectionTargets.ts:4-5`,
02-L02 `:2041-2043`), so A2 and B6 were closed on a no-op in production. And
R12-1 aborted through the driver's `query.cancel()`, which has no effect on
this deployment (02-L02 `:1341`, `:1971`; 06-L03 C4 `:626-627`), so an abort
could leave a VACUUM running for up to 120 s past the 4,500 ms scheduler
drain.

**Decision (D2).** The pre-step runs every `VACUUM (ANALYZE)` through the D1
seam `runDedicatedMaintenanceStatement` (R13-3 prerequisite 1) on the R7.2
dedicated/direct maintenance target (02-L02 `:2014-2019`). It never runs on
the ordinary pool behind `db`, never on a reserved handle, and never on the
plan's dedicated session. There is no `set_config`, no `reset`, no
terminate-a-pooled-backend branch and no transaction-pooling skip: each
statement runs on the seam's own short-lived `max: 1` client, whose startup
`statement_timeout` carries the bound and which is discarded on every path.
`query.cancel()` is never relied on.

**Binding execution rules (replace R12-1 Channel, Bound, Transaction pooling
and Abort; handoff to 06-L03, this leaf edits neither the 06-L03 file nor its
code).**

- **Channel and target.** Every pre-step statement (the privilege read, each
  VACUUM and the effectiveness read) is one call of
  `runDedicatedMaintenanceStatement({ signal, statementTimeoutMs, statement })`.
  The seam resolves the target at call time through the R7.2 matrix:
  `off + primary` uses `DATABASE_DIRECT_URL` or a verified non-pooled
  `DATABASE_URL`; `direct` (either PgBouncer mode) uses the verified
  `DB_MAINTENANCE_URL`. Each call is autocommit, outside any BEGIN, on one
  backend that is never shared. Running the privilege and effectiveness reads
  on the same target and role as the VACUUM keeps the privilege answer valid
  for the role that actually vacuums.
- **Production shape.** Under `DB_PGBOUNCER_MODE=transaction` retention
  already starts only with `DB_MAINTENANCE_MODE=direct`: the scheduler awaits
  the affinity proof before its timer exists and fails closed otherwise
  (`core/server/jobs/retentionScheduler.ts:615-619`). So the Render shape
  (`DATABASE_URL` on 6432) DOES get the pre-step, through the direct target.
  `transaction + primary` and `session` never start retention, so the
  pre-step is unreachable there from the scheduler.
- **Skip.** The pre-step is skipped only when the seam rejects
  `database_maintenance_session_unavailable` (a resolver throw, an
  unverifiable URL, an unavailable R7.2 row, or a failed live proof; zero
  factory calls for the unavailable rows). It logs one skip code, issues no
  further pre-step statement in that run, and the plan still runs. No other
  seam rejection is a skip, except the D5 lock-timeout class (R13-4 (d)).
- **Bound.** Each VACUUM passes `statementTimeoutMs` =
  `min(120_000, remaining pre-step share)` (R13-2). The seam clamps and
  validates it against `[config.statementTimeoutMs, 120_000]` and rejects an
  out-of-range value; the pre-step therefore never calls it with a bound
  below `config.statementTimeoutMs` and records `budget_exhausted` instead.
  The two catalog reads pass `config.statementTimeoutMs`. `lock_timeout`
  keeps the 02-L01 value (`DB_LOCK_TIMEOUT_MS`, default 5,000 ms,
  `core/db/databaseConfig.ts:300`). Nothing can leak into ordinary traffic,
  because the bound is a startup parameter of a client that no other caller
  ever uses.
- **Abort.** The run signal is checked before each seam call and passed into
  it. On abort the seam's `finally` runs the R7.4 drain (local destroy first,
  then `pg_cancel_backend(pid)` from the control client matched on pid plus
  `backend_start`, then terminate as the last resort) and releases its slot.
  When the signal is aborted, any seam rejection (normally
  `dedicated_database_session_lost`, or `dedicated_database_drain_unconfirmed`)
  is re-thrown as the run's abort; the drain code is logged. The abort
  PROPAGATES: the run ends in the scheduler's `aborted` outcome
  (`retentionScheduler.ts:531`) and the plan is not started. The run settles
  within `RETENTION_CANCEL_DRAIN_DEADLINE_MS` (4,500 ms,
  `core/db/databaseLifecycle.ts:30`), which equals the R7.4 drain deadline
  counted from the drain start. Abort is never swallowed as a VACUUM failure.
- **Connection budget.** The pre-step's calls are sequential with each other
  and with the plan; each seam client is closed before the next call and
  before `runRetentionPlan` opens the plan's dedicated session. The pre-step
  therefore adds no concurrent dedicated connection beyond the per-process
  budget of 02-L02 R8.5, and takes its slot under `POOL_ACQUISITION_DEADLINE_MS`
  (2,000 ms) like every dedicated open.
- **C4.** 06-L03 C4 stays byte-identical. It governs the plan's dedicated
  session. The seam's client is not that session, and the pre-step is not a
  C4 statement.

**DB leg for the abort (D2; owned by 06-L03, file in R13-2).**

1. The leg creates a leg-owned table in `current_schema()` whose name carries
   the run marker, and inserts a few rows. No leg VACUUMs or locks a shared
   family table; the pre-step's table-name dependency is injected to return
   the leg table.
2. A second session (the leg's observer client) opens a transaction and takes
   `LOCK TABLE <leg table> IN SHARE UPDATE EXCLUSIVE MODE`, which conflicts
   with VACUUM.
3. The leg starts the pre-step with its own `AbortController` and the REAL D1
   seam, then polls `pg_stat_activity` (bounded, 50 ms interval) until a
   backend on the current database shows `wait_event_type = 'Lock'` and a
   query starting with `VACUUM`. It records that backend's `pid` and
   `backend_start`.
4. It aborts, and measures from the abort call. Assertions: the pre-step
   promise rejects with the abort (not a failure or skip class) within
   4,500 ms; and, by the time it settles, no `pg_stat_activity` row matches the
   recorded `pid` plus `backend_start`.
5. `finally`: the lock holder rolls back and the leg table is dropped.

The leg may run under the default 5,000 ms `lock_timeout`: the wait is
observed within a few polls, and an aborted signal wins over any seam
rejection, so the lock timeout cannot change the asserted outcome.

**Residual per deployment shape (restates R12-1 Residual; the R12 text
stays binding for the VM-unset consequence).**

| shape | pre-step |
|---|---|
| direct Postgres, `off + primary` | runs on `DATABASE_DIRECT_URL` or the verified non-pooled `DATABASE_URL` |
| transaction pooler (Render, 6432) with `DB_MAINTENANCE_MODE=direct` | runs on `DB_MAINTENANCE_URL` |
| `transaction + primary`, `session` | retention never starts; nothing to vacuum for |
| target lost at run time (seam rejects unavailable) | skipped for the rest of the run with its log code; the plan runs |

When a VACUUM is skipped, fails, is ineffective, runs out of budget, or cannot
set the visibility map because of the xmin horizon, the R12-1 **Residual**
applies unchanged: the candidate read is bounded by the 4,000 ms tx-local
cancel and surfaces as `retention_batch_failed` for that family and run.

**Receipt (replaces the R12-1 block at `:3797-3807`; the old block is not
edited).**

```text
coldStatePolicy: {
  policy: "pre_retention_vacuum_unconditional",
  statement: "VACUUM (ANALYZE) <family table>",
  channel: "runDedicatedMaintenanceStatement (TASK-551-02-L02 R9) on the R7.2 dedicated/direct maintenance target; autocommit; own max:1 client, discarded on every path; before the plan's dedicated session; outside any lease",
  statementTimeoutMs: "min(120000, remaining pre-step share); budget_exhausted below config.statementTimeoutMs",
  abort: "R7.4 drain; the run settles within RETENTION_CANCEL_DRAIN_DEADLINE_MS (4500)",
  skip: "database_maintenance_session_unavailable only (plus the D5 lock-timeout class)",
  failure: "logged; never blocks retention",
  owner: "TASK-551-06-L03 scheduler pre-step (pre-retention vacuum)",
  decidedBy: "TASK-551-06-L02 R11, amended R12 and R13"
}
```

**A2 and B6 restated (D2).** R12-7 closed A2 ("production trigger does not
reproduce the gated state") and B6 ("`coldStatePolicy` premise") with the
unconditional VACUUM. Those closures now rest on the direct-target design: the
pre-step runs in every configuration where retention runs, including the
Render transaction-pooler shape, and its residual is bounded as above. The
`:3811-3815` replacement text for `:3214` is restated in R13-6.

#### R13-2 (MEDIUM) — Shared run deadline, purity, lanes and paths (D4)

**Shared deadline (binding).** The pre-step and the plan share the run's
deadline; the parser invariant `maxRunMs < intervalMs`
(`retentionScheduler.ts:222`) is untouched.

```text
runDeadlineAt  = runStartedAt + maxRunMs          // the scheduler's parsed budget
planFloorMs    = max(1_000, ceil(maxRunMs / 2))   // R13 choice; 1_000 = the job's MIN_RUN_MS
before each pre-step call:
  if signal.aborted: throw abort
  shareMs = runDeadlineAt - now - planFloorMs     // the pre-step's remaining run budget
  if shareMs < config.statementTimeoutMs:         // the seam's lower clamp
    log budget_exhausted for this and every remaining family; stop the pre-step
  bound   = VACUUM ? min(120_000, shareMs) : config.statementTimeoutMs
plan call:
  runRetentionPlan(now, signal, { maxRunMs: max(1_000, runDeadlineAt - now) })
```

- "Remaining run budget" in D4 is read as the part of the run budget that is
  not reserved for the plan. The reservation is `planFloorMs`, so the plan
  always starts with at least half the run budget (and never below the job's
  `MIN_RUN_MS`, `retentionJobService.ts:605`), and a slow VACUUM cannot starve
  retention run after run.
- A run including its pre-step ends within `maxRunMs`, plus at most one seam
  watchdog grace and one 4,500 ms drain when a VACUUM hit its bound, plus the
  `max(1_000, ...)` clamp. The scheduler's non-overlap rule (`:561-562`) still
  drops any due tick that a run outlives.
- `budget_exhausted` is a skip class. The plan still runs.

**Purity and module split (binding).**

- `core/services/maintenance/preRetentionVacuumPlan.ts` (pure, Bun-free,
  imports nothing from `core/db/*`, `revisionRetentionService` or any runtime
  adapter). It owns: the statement renderer, which takes the table name as a
  PARAMETER; the catalog-read renderers; the closed log codes; the outcome
  classification; the budget arithmetic above; and the pre-step loop, which
  takes its dependencies as an argument.
- `core/services/maintenance/preRetentionVacuum.ts` (the lazy-deps layer). It
  binds the default dependencies: `getRevisionFamilyTableName` (R12-3),
  `normalizeRevisionRetentionPolicy` (`revisionRetentionService.ts:317`), the
  D1 seam, the clock and the logger. It uses STATIC imports only. A dynamic
  `import()` of `core/db/client` is rejected by the query-inventory scanner
  outside `core/db/databaseLifecycle.ts`
  (`scripts/task551QueryInventory/literalDynamicClientImports.ts:331-332`,
  `:533`, `:551`). Its seam call sites join the TASK-551-01-L01 inventory like
  every other new call site.
- `retentionScheduler.ts` (786 lines) and `retentionJobService.ts` (947)
  receive only the call; neither may exceed 1,000 lines.

**Statement and identifier (replaces R12-1 Statement and identifier,
second and third sentences).** The renderer accepts only a name that matches
`^[a-z_][a-z0-9_]{0,62}$` and otherwise throws a closed code. It returns
`VACUUM (ANALYZE) "<name>"`. The name reaches it only from
`getRevisionFamilyTableName(family)` in the lazy-deps layer, never from input
or settings. The pattern admits no quote, so the same closed names may also
be rendered as string literals in the two catalog reads. If 02-L02 R9 types
the seam's `statement` as something other than SQL text, the lazy-deps layer
adapts the rendered text to that type without changing its bytes.

**Tests (owned by 06-L03; lanes and paths for the handoff).**

- Vitest, DB-free, `environmentProfile: "none"`:
  `tests/vitest/maintenance/preRetentionVacuumPlan.test.ts`. It covers:
  - the renderer for the five literal table names passed as parameters
    (`page_revisions`, `widget_template_revisions`, `detail_page_revisions`,
    `content_revisions`, `post_revisions`), and rejection of a
    non-matching name;
  - the closed code set;
  - the classification: `database_maintenance_session_unavailable` skips the
    rest of the run; SQLSTATE `57014` is a statement-timeout failure;
    `55P03` is `skipped_concurrent` (R13-4 (d)); any rejection with an
    aborted signal propagates the abort; anything else is a failure with a
    redacted closed code;
  - effectiveness: `relpages = 0` is `ran`; a ratio below 0.9 is
    `ineffective` (R13-4 (a));
  - the budget arithmetic and `budget_exhausted` with a fake clock, and the
    plan's `maxRunMs` handed on;
  - the loop with fake dependencies: disabled and normalizer-error families
    get no call, the abort check runs before each call, and a failure does
    not stop the next family or the plan.
- Bun, `tests/integration/runtime/preRetentionVacuum.test.ts`:
  - the five-family identifier assertion through the real accessor,
    `renderer(getRevisionFamilyTableName(family)) === 'VACUUM (ANALYZE) "<literal>"'`
    for every family in `REVISION_RETENTION_FAMILY_ORDER`, against the file's
    own literal map (it does not import 06-L02's `R10_FAMILY_TABLE`);
  - the scheduler ordering: the default runner awaits the pre-step to
    settlement before it calls `runRetentionPlan`;
  - DB legs: a VACUUM of a leg-owned table through the real seam succeeds
    (so it ran outside any block) and classifies as `ran`; and the R13-1
    abort leg.
  - Airtight form, which must show 0 fail with the identifier and ordering
    legs passing and the DB legs skipping by name:
    `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/runtime/preRetentionVacuum.test.ts`.
    The DB legs run in 06-L03's closed `task551-db-test` form, with zero
    skips.
- The no-leak check that R12-1 **Tests** put on the released connection is
  moot: there is no released connection. 02-L02 RD13 proves the startup
  `statement_timeout` never reaches another session; 06-L03 does not repeat
  it.

#### R13-3 — Prerequisites (rewritten; replaces R12-1 **Prerequisites**)

1. **D1, owned by TASK-551-02-L02 R9.** `core/db/client.ts` exports
   `runDedicatedMaintenanceStatement<TRow>({ signal, statementTimeoutMs, statement }): Promise<TRow[]>`.
   Order: the close fence first; the R7.2 mode/target matrix, where
   `transaction + primary` or `session` rejects
   `database_maintenance_session_unavailable` with zero factory calls; one
   semaphore slot under `POOL_ACQUISITION_DEADLINE_MS`; the fence re-checked
   after the grant and before the client is built; a short-lived own
   `max: 1` client from
   `createDedicatedClientOptions(target, hooks, { statementTimeoutMs })`,
   whose third argument is present-only, an integer clamped to
   `[config.statementTimeoutMs, 120_000]`, and overrides only the
   `connection.statement_timeout` startup parameter; registry membership from
   construction; exactly one `execute` outside any BEGIN; watchdog bound =
   `statementTimeoutMs` + grace; `finally` = the R7.4 drain and slot release.
   The client is discarded on every path. Its tests are 02-L02's Guards leg
   F27 (a fake factory: the startup parameter present only when given; one
   statement, no BEGIN or `set_config`; abort leads to a forced drain and
   `dedicated_database_session_lost`; after close, zero factory calls;
   unavailable modes, zero calls; an out-of-range bound rejects) and RealDb
   RD13 (`VACUUM (ANALYZE)` on a leg-owned table succeeds, so it ran outside
   a block, and a fresh session shows the startup `statement_timeout`, never
   leaked to another session). The 02-L02 R9 section is being written in
   this round; its line anchors are recorded when it lands. The seam lands
   WITH the 02-L02 R7/R8 code (land-order step 1), before "06-L02 R8-R13"
   (step 3) and before 06-L03 R1. 06-L03 implements the pre-step only after
   the D1 code and its F27 and RD13 receipts are green; otherwise it STOPS.
2. **06-L03 envelope.** Its `allowlist` (06-L03 `:319-331`) gains four new
   paths, and its `commands` and `occurrences` gain two commands. None of
   these paths exists yet, and none is in any fence today. The exact entries
   (text, not a fence edit):

   ```text
   allowlist += "core/services/maintenance/preRetentionVacuumPlan.ts"
   allowlist += "core/services/maintenance/preRetentionVacuum.ts"
   allowlist += "tests/vitest/maintenance/preRetentionVacuumPlan.test.ts"
   allowlist += "tests/integration/runtime/preRetentionVacuum.test.ts"
   commands  += { "id": "pre-retention-vacuum-vitest", "lane": "vitest", "environmentProfile": "none",
                  "argv": ["bun", "--env-file=/dev/null", "node_modules/vitest/vitest.mjs", "run", "tests/vitest/maintenance/preRetentionVacuumPlan.test.ts"],
                  "positiveDiscovery": { "kind": "test-paths", "paths": ["tests/vitest/maintenance/preRetentionVacuumPlan.test.ts"], "minimum": 1 } }
   commands  += { "id": "pre-retention-vacuum-test", "lane": "bun-test", "environmentProfile": "task551-db-test",
                  "argv": ["bun", "--env-file=/dev/null", "test", "tests/integration/runtime/preRetentionVacuum.test.ts"],
                  "positiveDiscovery": { "kind": "test-paths", "paths": ["tests/integration/runtime/preRetentionVacuum.test.ts"], "minimum": 1 } }
   occurrences[single].commandIds += "pre-retention-vacuum-vitest", "pre-retention-vacuum-test"
   ```

   `core/db/client.ts` stays in 06-L03's `forbiddenPaths` (`:333`): 06-L03
   consumes the seam and never edits it.
3. **06-L03 task file.** It gains a "scheduler pre-step (pre-retention
   vacuum)" item carrying R12-1 as amended by R13-1, R13-2 and R13-4, plus the
   R12-5 (e) A2 correction.

#### R13-4 (LOW) — D5 corrections

**(a) Effectiveness.** `relpages = 0` classifies as `ran`; there is no
`ineffective` for an empty or zero-page table. The 0.9 ratio
`relallvisible / relpages` applies only when `relpages > 0`. The read is one
statement after the family VACUUMs of the run, through the seam, over
`pg_class` in `current_schema()` for the families that ran. If the budget
does not admit it, the outcomes stay `ran`.

**(b) `atLeastKRowsVmSet` when `timedOut`.** It is computed with the
15,000 ms measurement bound: `floor(4000 / (15000 / 20000))` = 5,333,
recorded as an upper bound. `vmSetExecutionMs` stays `null` in that branch.

**(c) Stale ranges.** Three sentences carry the old VM-unset range and are
quoted as superseded by R12-5 (b) in R13-6: `:3358-3359`, `:3402-3403` and
`:3410-3411`.

**(d) Concurrency and cost.** The pre-step stays outside the advisory-lock
lease, so every replica's scheduler runs it on every tick, even when its plan
then ends `skipped_locked`.

- A lock timeout (SQLSTATE `55P03`) on a VACUUM classifies as
  `skipped_concurrent`, not as a failure. The only holders that conflict with
  `SHARE UPDATE EXCLUSIVE` are another VACUUM or ANALYZE (normally a
  concurrent replica's pre-step or autovacuum), `CREATE INDEX CONCURRENTLY`,
  or DDL. There is no `SKIP_LOCKED`: the statement text stays as R12-D2 pins
  it.
- Cost, stated and accepted. Per run and per replica, each enabled family
  costs one VACUUM pass (all-visible pages are skipped) plus one ANALYZE
  sample (up to 300 × `default_statistics_target` rows, about 30,000 at the
  default target), which re-samples and rewrites `pg_statistic` whether or
  not anything changed. Add one seam connection per statement (N + 2 per
  run). This is accepted at the daily default interval
  (`DEFAULT_INTERVAL_MS = 86_400_000`, `retentionScheduler.ts:91`). At the
  60 s minimum interval (`MIN_INTERVAL_MS`, `:94`) the same cost recurs every
  minute on every replica. That is an operator choice this leaf does not
  forbid, and it is called out here as a known cost.

**(e) `TASK-551-06-L04` allocation.** When the orchestrator allocates the
reserved leaf (R12-2 (a)), it also:

- updates the family pins from 41 to 42 task files
  (`tests/unit/workflows/task551AuthorAudit.test.ts:324`, and the TASK-551-11
  family-preflight literal at `:1173`), together with the leaf and occurrence
  counts and the dispatch-order size that one new `single` occurrence moves
  (`:326-327`, `:336`);
- gives the leaf a dispatch envelope whose `dependencies` include at least
  `TASK-551-06-L03:single`;
- places its occurrence before `TASK-551-10-L02:single`, which must stay the
  last dispatch entry (`task551AuthorAudit.test.ts:335`).

These are allocation-time edits by their owners; none is made here.

**(f) `afterAll` sweep timeout.** The file-level `afterAll` residue sweep of
`tests/perf/database-revision-candidate-bounds.test.ts` (R12-4 (a)) passes
`DB_LEG_HEAVY_TIMEOUT_MS` as its hook option, as R8-1 does for `afterEach`
(`:1561-1562`). Bun's 5 s hook default does not apply to it.

**(g) `many_parents_k` and item 5.** The exemption from budget item 5 covers
only its `breaches` and `budgetVerdict` entries. Item 5's "Residue is zero"
(`:3029`) still binds `many_parents_k`, together with its R12-4 (e) cleanup.

**(h) Privilege note.** The `MAINTAIN` privilege exists from PostgreSQL 17;
the deployment runs PostgreSQL 18.4 (02-L02 `:1947`). A `MAINTAIN`-only
grant is still conservatively treated as not permitted. The database-owner
case, which PostgreSQL allows to VACUUM, is also reported as not permitted by
`pg_has_role(current_user, c.relowner, 'USAGE')`. Both are recorded
limitations. A family table absent from the privilege read in
`current_schema()` is classified with the same not-permitted class.

**(i) Schema-qualified `pg_stat_user_tables` lookup (lane safety, D5 with
D6 (i)).** `tests/integration/server/task551RetentionJobService.test.ts:156`
(working tree) reads
`select coalesce((select n_tup_del::int from pg_stat_user_tables where relname = ${relname}), 0) as n`.
With one `bun_worker_*` schema per lane worker, the unqualified scalar
subquery returns several rows and raises "more than one row returned". The
predicate gains `and schemaname = current_schema()`:

```ts
select coalesce((select n_tup_del::int from pg_stat_user_tables where relname = ${relname} and schemaname = current_schema()), 0) as n
```

It is the only `relname` lookup in that file (`:154-156`). No test title,
assertion or count changes. D5 assigns this edit to 06-L02. The file is not
in this leaf's envelope `allowlist` (`:329-341`); it is in 06-L03's
(`:326`), and `:1001-1004` records it as 06-L03-owned. R13-9 records the
entry that 06-L02 would need. The implementer does not make the edit until
the orchestrator has resolved that ownership gap (R13-5 stop rule).

#### R13-5 — R10-9 scope, gates, receipt and stop rules (additions)

**Scope.** R13 adds two edits:

- `tests/perf/database-revision-candidate-bounds.test.ts`, which is already
  in the R10-9 scope and the envelope: the `afterAll` hook option
  (R13-4 (f));
- `tests/integration/server/task551RetentionJobService.test.ts:156`, which is
  not in the envelope: the schema-qualified predicate (R13-4 (i)).

Neither changes a test count: 85 and 37 stay (`:3122`, `:3126`), and the
job-service suite keeps its count.

**Gates (additions, fast forms).**

1. `./node_modules/.bin/eslint --max-warnings=0 tests/perf/database-revision-candidate-bounds.test.ts tests/integration/server/task551RetentionJobService.test.ts`.
2. Airtight:
   `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/server/task551RetentionJobService.test.ts tests/perf/database-revision-candidate-bounds.test.ts`,
   0 fail.
3. `wc -l` on both files (at or under 1,000) and `git diff --check`.

The closed owner-map run of the job-service suite stays an
execution-only orchestrator receipt (R7 gate 2), serialized under D9: at most
one `coderso02` DB gate at a time, family-wide.

**Receipt.** The R10-9 addendum also records `coldStatePolicy` in the R13-1
shape instead of the R12-1 shape.

**Stop rules (additions).** The implementer STOPS and reports when:

- the job-service test edit is due while
  `tests/integration/server/task551RetentionJobService.test.ts` is still
  outside this leaf's envelope and no orchestrator ownership decision is
  recorded;
- the `:156` predicate is not the only unqualified `relname` lookup in that
  file when the edit is made.

#### R13-6 — Superseded sentences (quoted; text authoritative)

R12 (`:3627-4154`):

- `:3645-3648` (R12-D1): "D1: the pre-retention VACUUM is a scheduler
  pre-step on the ordinary client, with its own 120 s statement bound, before
  the family session opens and outside any lease; failure is logged and never
  blocks retention; 06-L03 C4 is untouched." It now reads: "the pre-retention
  VACUUM is a scheduler pre-step through the D1 seam on the R7.2
  dedicated/direct maintenance target, bounded by `min(120_000, remaining
  pre-step share)`, before the plan's dedicated session opens and outside any
  lease; failure is logged and never blocks retention; 06-L03 C4 is
  untouched."
- `:3677-3679`, "one `VACUUM (ANALYZE) <family table>` as a separate
  autocommit statement on the ORDINARY database client.": "one
  `VACUUM (ANALYZE) <family table>` as a separate autocommit statement through
  `runDedicatedMaintenanceStatement` on the R7.2 dedicated/direct maintenance
  target (R13-1)."
- `:3681-3683`, "There is no threshold: VACUUM skips all-visible pages, so it
  is cheap when nothing changed since the last run.": "There is no threshold.
  VACUUM skips all-visible pages, but ANALYZE re-samples every run; the cost
  is stated and accepted in R13-4 (d)."
- `:3684-3685`, "C4 governs the dedicated session, which the pre-step never
  uses.": "C4 governs the plan's dedicated session, which the pre-step never
  uses; the seam's own client is not a C4 statement (R13-1 **C4**)."
- `:3694-3696` (**Placement**), "and the scheduler's strict non-overlap rule
  (`:561-562`): a pre-step that outlives an interval drops the next due tick
  and never overlaps it.": "and the run's deadline (R13-2); the scheduler's
  non-overlap rule (`:561-562`) still drops any due tick that a run
  outlives."
- `:3703-3705` (**Statement and identifier**), "It is rendered as a quoted
  identifier through the driver's identifier API, never concatenated from
  input or settings.": read as R13-2 **Statement and identifier**.
- `:3706-3709` (**Channel**), "It runs on one reserved connection of the
  ordinary client, the pool behind `db` (`core/db/client.ts:91`). It never
  runs on `maintenanceSqlClient`, the dedicated session, `session.transaction`
  or `drizzleOverTransaction(tx)`.": read as R13-1 **Channel and target**.
  `maintenanceSqlClient` no longer exists as a channel (02-L02 R7.9 deletes
  the import-time maintenance pool).
- `:3710-3721` (**Bound**), from "PostgreSQL rejects VACUUM inside any
  transaction block" to "`lock_timeout` keeps the session value.", including
  "`select set_config('statement_timeout', '120000', false)`, then the VACUUM,
  then `reset statement_timeout` in `finally`, then release." and "If the
  reset does not confirm, the backend is terminated instead of being returned
  to the pool, so the 120 s bound never leaks into ordinary traffic.": read as
  R13-1 **Bound**. There is no `set_config`, `reset` or terminate step.
- `:3722-3726` (**Transaction pooling**), "With `DB_PGBOUNCER_MODE=transaction`
  (`core/db/databaseConfig.ts:316-319`) a reserved connection is not
  session-affine, so the scoped bound could land on another backend. The
  pre-step then issues no VACUUM for any family and logs one skip code.
  Retention proceeds under the residual below.": read as R13-1 **Production
  shape** and **Skip**.
- `:3727-3733` (**Abort**), "On abort the live statement is cancelled (the
  driver's `query.cancel()`), the reset or terminate path runs, and the abort
  PROPAGATES." and "Shutdown containment for the pre-step is this abort-driven
  cancel plus the ordinary client's close; it is not a C4 statement.": read
  as R13-1 **Abort**.
- `:3746-3749` (**Effectiveness**), "A ratio
  `relallvisible / greatest(relpages, 1)` below 0.9 logs an `ineffective`
  code.": read as R13-4 (a).
- `:3750-3752` (**Outcomes**), "ran, ineffective, skipped (disabled,
  normalizer error, transaction pooling, not permitted) and failed (statement
  timeout, lock timeout, other error).": "ran, ineffective, skipped (disabled,
  normalizer error, maintenance session unavailable, not permitted or absent,
  concurrent, `budget_exhausted`) and failed (statement timeout, other
  error)."
- `:3766-3768` (**Module and line gate**), "The pre-step lives in its own
  module. Statement rendering, the closed codes and the outcome
  classification are pure and Bun-free; the database calls sit behind lazy
  deps.": read as R13-2 **Purity and module split** (two modules).
- `:3771-3775` (**Tests**), "Pure: statement and identifier rendering for all
  five families, the closed codes and the skip classification. DB leg: the
  VACUUM succeeds (so it ran outside any transaction), it runs before the
  dedicated session opens, the released connection's `statement_timeout`
  equals the startup value, and an abort propagates.": read as R13-2
  **Tests** and the R13-1 abort leg.
- `:3777-3784` (**Prerequisites** 1 and 2), from "The reserved
  ordinary-connection seam with the scoped bound belongs in
  `core/db/client.ts`." to "gains the pre-step module and its test file.":
  read as R13-3.
- `:3801` (R12-1 receipt block, not edited), `channel: "ordinary client,
  autocommit, before the dedicated session, outside any lease",` and `:3802`
  `statementTimeoutMs: 120000,`: read as the R13-1 receipt.
- `:3811-3815`, the R12 replacement for `:3214`: "R12-1's unconditional
  pre-retention VACUUM moves production toward the VM-set state before every
  run. It is best-effort; the residual is bounded by the 4,000 ms cancel
  (R12-1 **Residual**). The gate does not close the gap." It now reads:
  "R13-1 runs the unconditional pre-retention VACUUM on the R7.2
  dedicated/direct target, which exists in every configuration where
  retention runs, including the Render transaction-pooler shape through
  `DB_MAINTENANCE_MODE=direct`. It moves production toward the VM-set state
  before every run, best-effort; the residual is bounded by the 4,000 ms
  cancel (R12-1 **Residual**, R13-1). The gate does not close the gap."
- `:3865-3866` (R12-2 (a)), "The case is exempt from R10-7 budget items 1
  (latency), 4 (drain reads) and 5 (`breaches`).": read with R13-4 (g).
- `:3885`, "atLeastKRowsVmSet: <floor(4000 / (vmSetExecutionMs / 20000)); an
  upper bound when timedOut>,": "atLeastKRowsVmSet: <floor(4000 /
  (vmSetExecutionMs / 20000)); when timedOut, 5333 from the 15000 ms bound,
  recorded as an upper bound>," (R13-4 (b)).
- `:4112`, "`core/db/client.ts` owner (TASK-551-02-L02): the R12-1
  prerequisite 1 seam.": "`core/db/client.ts` owner (TASK-551-02-L02): the D1
  seam, R9 (R13-3 prerequisite 1)."
- `:4113-4115`, "TASK-551-06 parent and the board: allocating
  `TASK-551-06-L04` at 06-L02 closure adds the child row and the statistics
  delta, which are closure-owned.": it also carries the R13-4 (e) pin,
  envelope and dispatch-position edits.
- `:4135` (R12-7, A1 disposition), "Closed by R12-1 (D1): ordinary-client
  pre-step before the session, 120 s scoped bound, C4 untouched; 06-L03 item
  and prerequisites recorded (R12-5 (e))": "Closed by R12-1 as amended by
  R13-1 and R13-2 (D2, D4): D1-seam pre-step on the direct target before the
  plan's session, shared run deadline, C4 untouched; prerequisites in R13-3."
- `:4136` (A2 disposition) and `:4147` (B6 disposition): restated in R13-1
  **A2 and B6 restated**.
- `:4150` (B9 disposition), "Closed by R12-1 **Lock** and **Abort**": the
  abort part is closed by R13-1 **Abort**.

R11 text, stale VM-unset range (R12-5 (b)):

- `:3358-3359`, "Their index-only scans then fall back to heap fetches, which
  is the 2.2-3.6 ms per parent in R11-3.": "Their index-only scans then fall
  back to heap fetches, which is the 1.2-3.6 ms per parent of R12-5 (b)."
- `:3402-3403`, "and about 2.2-3.6 ms when it is unset (the R11-3 table).":
  "and about 1.2-3.6 ms when it is unset (R12-5 (b))."
- `:3410-3411`, "and at about 1.1k-1.8k such parents when it is unset.": "and
  at about 1.1k-3.3k such parents when it is unset (R12-5 (b))."

#### R13-7 — Cross-file notes (each belongs to its owner; none is edited here)

- TASK-551-02-L02 R9 owns D1 (R13-3 prerequisite 1). The R13-4 (d)
  classification needs the seam to surface SQLSTATE `57014` and `55P03` as a
  closed, redacted value. If R9 does not, the orchestrator records that as a
  02-L02 handoff before 06-L03 R1; 06-L03 never parses server messages.
- TASK-551-06-L03 receives R13-3 prerequisites 2 and 3.
- TASK-551-01-L01: the job-service suite is lane-safe once R13-4 (i) lands
  (D6 (i)). The four new pre-step paths join the inventory and the lane
  tables through the growth rule when 06-L03 creates them.
- Orchestrator: the R13-4 (i) ownership gap (R13-9); the D5 06-L04 pin work at
  allocation (R13-4 (e)).

#### R13-8 — Finding-to-disposition table

Audit A (1 HIGH, 2 MEDIUM, 5 LOW, 2 INFO) and audit B (3 HIGH, 2 MEDIUM,
5 LOW):

| finding | severity | disposition |
|---|---|---|
| A1 abort relies on `query.cancel()`; VACUUM outlives the 4,500 ms drain | HIGH | Closed by R13-1 **Abort** (D2): R7.4 drain through the seam; DB leg with a lock-blocked VACUUM |
| A2 prerequisite 1 contradicts 02-L02 R7 (reserved lease removed) | MEDIUM | Closed by R13-3 prerequisite 1 (D1): seam owned by 02-L02 R9, own `max: 1` client, semaphore slot, R7.4 drain, land order |
| A3 transaction-pooling skip disables the pre-step on Render | MEDIUM | Closed by R13-1 **Production shape** and **Skip** (D2); A2/B6 and `:3811-3815` restated |
| A4 `relpages = 0` logs `ineffective` | LOW | Closed by R13-4 (a) (D5) |
| A5 `atLeastKRowsVmSet` undefined when `timedOut` | LOW | Closed by R13-4 (b) (D5) |
| A6 three stale VM-unset ranges | LOW | Closed by R13-4 (c) and R13-6 (D5) |
| A7 "pure" renderer depends on a DB-importing module | LOW | Closed by R13-2 (D4) |
| A8 replicas collide outside the lease; ANALYZE cost | LOW | Closed by R13-4 (d) (D5) |
| A INFO privilege: database owner, `MAINTAIN` | INFO | R13-4 (h) (D5) |
| A INFO dynamic client import rejected by the scanner | INFO | R13-2: static imports only; call sites join the 01-L01 inventory |
| B1 reserved ordinary connection on the primary pool | HIGH | Closed by R13-1 **Channel and target** and R13-3 (D1, D2) |
| B2 transaction-pooling skip; A2/B6 closed on a no-op | HIGH | Closed by R13-1 (D2) |
| B3 `query.cancel()` abort | HIGH | Closed by R13-1 **Abort** and the DB leg (D2) |
| B4 pre-step outside `maxRunMs` | MEDIUM | Closed by R13-2 **Shared deadline** (D4) |
| B5 pure tests import a non-Bun-free module; no lane named | MEDIUM | Closed by R13-2 (D4): two modules, Vitest and Bun paths, envelope entries in R13-3 |
| B6 ANALYZE cost and per-replica duplication | LOW | Closed by R13-4 (d) (D5) |
| B7 `atLeastKRowsVmSet` undefined when `timedOut` | LOW | Closed by R13-4 (b) (D5) |
| B8 06-L04 allocation pins and envelope | LOW | Closed by R13-4 (e) (D5) |
| B9 `afterAll` sweep has no hook timeout | LOW | Closed by R13-4 (f) (D5) |
| B10 `many_parents_k` item 5 exemption vs residue | LOW | Closed by R13-4 (g) (D5) |
| 01-L01 v5: unqualified `pg_stat_user_tables` scalar subquery | orchestrator (D5, D6 (i)) | R13-4 (i); edit gated on the R13-9 ownership decision |

#### R13-9 — Envelope record (fence untouched)

Paths R13 names, checked by `grep` against the fence at `:321-438`:

- In the fence `allowlist`: `core/services/content/revisionRetentionService.ts`
  (`:331`) and `tests/perf/database-revision-candidate-bounds.test.ts`
  (`:340`).
- NOT in the fence: `tests/integration/server/task551RetentionJobService.test.ts`.
  For the R13-4 (i) edit to be in scope, the `allowlist` would need exactly
  `"tests/integration/server/task551RetentionJobService.test.ts"`. The file
  is also in 06-L03's `allowlist` (06-L03 `:326`), so granting it here makes
  two envelopes list one file. The orchestrator decides between that fence
  entry (with an explicit single-writer order against 06-L03 R1) and running
  the edit under 06-L03. This leaf does not edit the fence.
- NOT in any fence, and named only as 06-L03 handoffs (R13-3 prerequisite 2):
  `core/services/maintenance/preRetentionVacuumPlan.ts`,
  `core/services/maintenance/preRetentionVacuum.ts`,
  `tests/vitest/maintenance/preRetentionVacuumPlan.test.ts` (the NEW pure
  Vitest path) and `tests/integration/runtime/preRetentionVacuum.test.ts`.
- Named as references only, not edited by this leaf:
  `tests/unit/workflows/task551AuthorAudit.test.ts` (R13-4 (e)) and
  `core/db/client.ts` (02-L02-owned; 06-L03 `forbiddenPaths`).

### R13 amendments (R14, 2026-09-26)

This subsection is append-only. Nothing above it is edited. It amends R13
after the two R13 contract audits (audit A, agent `af02748558c10e64b`:
0 HIGH, 3 MEDIUM, 8 LOW, 2 INFO; audit B, agent `a5d98b3f3ffb0d529`:
0 HIGH, 5 MEDIUM, 9 LOW; the finding-to-disposition table is R14-9). Where an
item below quotes an earlier sentence, the item wins and the quoted sentence
is read as replaced; R14-8 lists every quote. Everything not quoted stays
binding. Anchors into this file are current line numbers; R14 starts after
`:4796`, so no earlier line moves. Every other anchor was grounded on
2026-09-26 against HEAD `420bb24a` plus the uncommitted working tree.

The orchestrator decisions for this round are Addendum D (D-1 to D-7) of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`,
together with its Addendum A1 and C2. They are cited by those labels and are
not re-decided here.

- **02-L02 R10.** D-1, D-2, D-3 and D-4 assign seam changes to
  TASK-551-02-L02 R10. At grounding time the 02-L02 file ends with R9.14
  (`:3874-3893`) and has no R10 text, so R14 cites R10 by its D-number
  content, never by line. Where R10's landed text differs from the D-number
  text, the orchestrator reconciles before 06-L03 implements the pre-step.
- **06-L03 A8.** The 2026-09-26 section of the 06-L03 file (heading at 06-L03
  `:1625` at grounding time, still under its pre-relabel label) is cited as
  "06-L03 A8 (2026-09-26)" per Addendum C2 and D-9. The relabel is its own
  writer's edit.

R14 does not touch the Workflow Dispatch Envelope fence (`:321-438`),
`**Status:**` or `**Changelog:**`. It edits no json or sh fence. It REMOVES
one file from R13's code scope (R14-6 (a)) and adds none. It changes no
expected test count.

#### R14-1 (MEDIUM) — SQLSTATE surface, consumer side (D-1)

**Decision (D-1, option (a)).** 02-L02 R9.1's unchanged rethrow of non-loss
server errors (02-L02 `:3522-3525`) IS the surface. 02-L02 R10 adds `55P03`
to the R7.3 not-loss list and an F27 sub-leg (`57014` and `55P03` rethrown
unchanged; the drain then runs normally). R13-7's first bullet is thereby
resolved; no 02-L02 handoff beyond R10 is needed.

**Closed pure input (binding).** The pure module
`core/services/maintenance/preRetentionVacuumPlan.ts` owns the input type
and never sees a raw seam rejection:

```text
type PreRetentionSeamFailure = Readonly<{
  kind: "unavailable" | "lost" | "bound_invalid" | "reserve_timeout" | "sqlstate" | "other";
  sqlstate?: "57014" | "55P03";          // present only when kind === "sqlstate"
}>;
```

**Mapping (lazy-deps layer, binding).** `core/services/maintenance/preRetentionVacuum.ts`
maps every seam rejection before the pure loop sees it:

```text
toPreRetentionSeamFailure(error: unknown): PreRetentionSeamFailure
  code = (typeof error === "object" && error !== null && typeof error.code === "string") ? error.code : undefined
  code === DATABASE_CLIENT_ERROR_CODES.maintenanceSessionUnavailable -> { kind: "unavailable" }
  code === DATABASE_CLIENT_ERROR_CODES.dedicatedSessionLost          -> { kind: "lost" }
  code === DATABASE_CLIENT_ERROR_CODES.maintenanceStatementBoundInvalid -> { kind: "bound_invalid" }   // added by 02-L02 R9.1
  code === DATABASE_CLIENT_ERROR_CODES.reserveTimeout                -> { kind: "reserve_timeout" }
  code === "57014" || code === "55P03"                               -> { kind: "sqlstate", sqlstate: code }
  otherwise (no string code, or any other value)                    -> { kind: "other" }
```

- It reads ONLY the string `code` property. It never reads `message`,
  `detail`, `hint`, `query`, `where`, `parameters` or any other property, and
  it never logs, stores or rethrows the raw error. The raw error is dropped
  after mapping.
- The owner codes come from the static import of `DATABASE_CLIENT_ERROR_CODES`
  (`core/db/client.ts:36-45`, plus the R9.1 key) in the lazy-deps layer, so no
  owner literal is duplicated. The pure module holds no copy of those
  strings; its only literals are the two PostgreSQL SQLSTATE values of the
  input type and its own closed log codes (named by 06-L03 A8).

**Classification (pure; replaces the R13-2 classification bullet,
`:4396-4400`).** Input: the mapped value plus `signal.aborted` read at the
settlement.

| input | outcome |
|---|---|
| any kind, with `signal.aborted` | the abort propagates (checked FIRST) |
| `unavailable` | skip: maintenance session unavailable; no further pre-step statement this run |
| `sqlstate` `57014` | failed: statement timeout; the next family proceeds |
| `sqlstate` `55P03` | skipped: concurrent (`skipped_concurrent`); the next family proceeds |
| `lost` (not aborted) | failed: session lost; the next family proceeds |
| `bound_invalid` | failed: caller-contract error, never a skip (D-4); the next family proceeds |
| `reserve_timeout` | failed: reserve timeout; the next family proceeds |
| `other` | failed with a redacted closed code; the next family proceeds |

A failure never blocks the plan. Correctness does not depend on the
visibility map (R10-3).

**Tests.** The mapping is pinned in the Bun file
`tests/integration/runtime/preRetentionVacuum.test.ts` (it imports the real
owner codes): each owner code maps to its kind; `{ code: "57014" }` and
`{ code: "55P03" }` map to `sqlstate`; an error-shaped object whose
`message`, `detail` and `query` carry a sentinel string maps without the
sentinel appearing in the mapped value or in any recorded log line; a
non-object rejection and a non-string `code` map to `other`. The
classification table is pinned in the Vitest file
`tests/vitest/maintenance/preRetentionVacuumPlan.test.ts` over the closed
input only. 06-L03 never parses server messages (R13-7 stands on that
point).

#### R14-2 (MEDIUM) — Abort bound restated on the 02-L02 R10 basis (D-2)

**Seam behaviour relied on (02-L02 R10, D-2 and D-3).** The seam observes the
signal from entry:

- (a) while waiting for a slot, an abort removes the waiter and the seam
  rejects `dedicated_database_session_lost` with zero factory calls;
- (b) while `ready` is pending, `session.drainWithin("signal", now +
  DEDICATED_DRAIN_DEADLINE_MS)` runs the local destroy and `ready` rejects
  `dedicated_database_session_lost`;
- (c) after `ready`, when `signal.aborted`, the `finally` drain skips the
  graceful step (forced drain only).

In every phase the seam settles within `DEDICATED_DRAIN_DEADLINE_MS`
(4,500 ms, equal to `RETENTION_CANCEL_DRAIN_DEADLINE_MS`,
`core/db/databaseLifecycle.ts:30`) of the abort. 02-L02 F27 sub-legs pin (a)
and (b) on the fake clock (settlement at most 4,500 ms); R9.1 F27 already
pins the abort during the statement.

**Abort (binding; replaces the R13-1 Abort sentences quoted in R14-8).**

- The run signal is checked synchronously before each seam call and passed
  into it.
- The seam contains every drain outcome and rejects
  `dedicated_database_session_lost` after its drain (02-L02 `:3512-3513`). No
  drain outcome, including `dedicated_database_drain_unconfirmed`, ever
  reaches the pre-step. The pre-step logs that rejection code (closed, via the
  R14-1 mapping) and re-throws the run's abort.
- The pre-step awaits nothing but the seam, so it settles within 4,500 ms of
  the abort, plus the synchronous work between the seam's settlement and the
  re-throw. The run ends in the scheduler's `aborted` outcome
  (`retentionScheduler.ts:531`) and the plan is not started. Abort is never
  swallowed as a VACUUM failure.

**Residual (D-2).** When the forced drain cannot confirm the backend gone
within its deadline (the control statement fails, or cancel and terminate
stay unconfirmed), the seam still settles on time, but the pre-step cannot
prove the backend is gone. The containment is `closeAll`: the seam's session
is a registry member from construction (02-L02 R9.1 **Shutdown**,
`:3514-3515`), so process shutdown drains it. Until then that backend's
statement is still bounded server-side by its startup `statement_timeout`
(at most the VACUUM's bound, R14-4). The DB leg (R14-6 (e)) asserts the
backend is gone for the lock-wait case only.

#### R14-3 (LOW) — Bound rule, floor source, statement adapter, R9.1 anchors (D-4)

**Bound (binding; replaces the R13-1 Bound sentences quoted in R14-8).**

- The seam and the builder require a safe integer. A value `< 1` or
  `> 120_000` rejects `database_maintenance_statement_bound_invalid` in BOTH
  the builder and the seam, with zero factory calls (02-L02 R10 F27 pins `0`
  and `120_001` builder throws). A value in `[1, floorMs)` is RAISED to the
  L01 bound, never rejected.
- The pre-step never calls the seam with a bound below `floorMs`. When the
  computed bound would be below it, the pre-step records `budget_exhausted`
  instead of calling (R14-4).
- `bound_invalid` is a caller-contract error and never a skip (R14-1).
- The pre-step NEVER aborts the run signal for budget reasons. Only the
  scheduler aborts that signal (close or cancel). 02-L02 R10 replaces R9.1's
  "(the 06-L02 D4 run budget does)" parenthetical (02-L02 `:3516-3518`) to say
  that 06-L02 never calls below the floor and records `budget_exhausted`.
- `lock_timeout` keeps the 02-L01 value (R13-1 stands on this point).

**Floor source (binding).** `floorMs` is the value of
`effectiveDedicatedStatementBoundMs()`, exported from `core/db/client.ts` by
02-L02 R10 (D-4, a D1 addition). It honours
`setDatabaseClientRuntimeForTests`, so the pre-step and the seam's clamp read
one source. The lazy-deps layer calls it once at the start of each pre-step
run and passes the number into the pure loop. No separate
`parseDatabaseRuntimeConfig` call or env read supplies the floor.

**Lazy-deps binding list (binding; replaces `:4365-4368`).** The lazy-deps
layer binds: `getRevisionFamilyTableName` (R12-3);
`normalizeRevisionRetentionPolicy` (`revisionRetentionService.ts:317`); the
D1 seam `runDedicatedMaintenanceStatement`; `effectiveDedicatedStatementBoundMs`
(floor source); `toPreRetentionSeamFailure` (R14-1); `CALL_OVERHEAD_MS`
(R14-4); the integer clock (R14-4); and the logger. Static imports only (R13-2
stands on that point).

**Statement adapter (binding; replaces `:4383-4385`).** R9.1 types the
seam's `statement` as `StaticDedicatedStatement<TRow>`, a builder over the
R8.2 scoped handle (02-L02 `:3432`). The lazy-deps layer passes
`(sql) => sql.unsafe(renderedText)` for the VACUUM and for each of the two
catalog reads, where `renderedText` is exactly the pure renderer's output and
no parameter array is passed. The bytes sent are the rendered bytes, which is
what the abort leg's `query` match relies on. `unsafe` is an allowlisted trap
of the scoped handle (02-L02 `:2121`, `:2864`). RD13's tagged-template form
(02-L02 `:3553`) is a 02-L02 test detail and does not bind the pre-step.
These three `sql.unsafe` call sites join the TASK-551-01-L01 inventory rebase
kit through the growth rule when 06-L03 creates them.

**R9.1 anchors (replaces `:4451-4452`).** 02-L02 R9.1 has landed at
`:3406-3564`: signature `:3414-3434`, builder third argument `:3436-3449`,
seam pseudocode `:3471-3493`, rules `:3495-3525`, test legs F27 and RD13
`:3527-3564`. R10's additions are cited by D-number until they land.

#### R14-4 (MEDIUM) — Budget: call reserve, integer clock, preconditions (D-5)

**Pseudocode (binding; replaces the R13-2 block at `:4334-4344`).**

```text
input:  { now: Date, signal, intervalMs, maxRunMs }   // now = the scheduler's Date (retentionScheduler.ts:518), passed unchanged
t()               = Math.floor(clock())               // clock = deps.clock ?? Date.now; integer ms
floorMs           = effectiveDedicatedStatementBoundMs()                  // once per run (R14-3)
CALL_OVERHEAD_MS  = POOL_ACQUISITION_DEADLINE_MS + DEDICATED_OPEN_DEADLINE_MS
                  + DEDICATED_STATEMENT_GRACE_MS + DEDICATED_DRAIN_DEADLINE_MS   // 2_000 + 4_000 + 2_000 + 4_500 = 12_500
runStartedAt      = now.getTime()
runDeadlineAt     = runStartedAt + maxRunMs
planFloorMs       = max(1_000, ceil(maxRunMs / 2))                        // R13 choice, accepted (Addendum A4)

preconditions (once, before any seam call; each logs one code and skips the whole pre-step):
  if intervalMs < 600_000:        log interval_too_short;                     go to plan call
  if maxRunMs < 2 * floorMs:      log budget_exhausted for every enabled family; go to plan call

before each seam call:
  if signal.aborted: throw abort
  callBudgetMs = runDeadlineAt - t() - planFloorMs - CALL_OVERHEAD_MS
  if callBudgetMs < floorMs:
    privilege read or a VACUUM: log budget_exhausted for this and every remaining family; stop the pre-step
    effectiveness read:         skip it; the ran outcomes stay ran (R13-4 (a))
  bound = VACUUM ? min(120_000, callBudgetMs) : floorMs

plan call:
  runRetentionPlan(now, signal, { maxRunMs: max(1_000, runDeadlineAt - t()) })   // the same Date object `now`
```

- `CALL_OVERHEAD_MS` is computed in the lazy-deps layer from the owner
  constants (`POOL_ACQUISITION_DEADLINE_MS`, `core/db/queryTelemetry.ts:347`;
  the three `DEDICATED_*` constants of 02-L02 R7, table at 02-L02
  `:2338-2349`) and handed to the pure loop as a number. The pure module
  imports none of them. The Bun test pins `CALL_OVERHEAD_MS === 12_500`; the
  Vitest test passes `12_500` to the pure loop.
- Every value handed to the seam or the plan is a safe integer: `t()` floors
  the clock, `now.getTime()` is an integer (the scheduler builds it from an
  integer, `:518`), and the arithmetic above adds and subtracts integers only.
  `ceil` keeps `planFloorMs` integral.
- The interval threshold is a named constant of the pure module,
  `PRE_RETENTION_VACUUM_MIN_INTERVAL_MS = 600_000`. `interval_too_short` and
  the precondition `budget_exhausted` are logged once per run.
- `intervalMs` and `maxRunMs` are the scheduler's parsed values; the parser
  invariant `maxRunMs < intervalMs` (`retentionScheduler.ts:222`) is untouched.

**Claims restated (replace `:4346-4350` and `:4351-4354`).**

- Plan budget, best-effort. A seam call's wall time is at most its bound plus
  `CALL_OVERHEAD_MS` when the seam meets its own deadlines (slot wait
  `POOL_ACQUISITION_DEADLINE_MS`, open `DEDICATED_OPEN_DEADLINE_MS`, watchdog
  `bound + DEDICATED_STATEMENT_GRACE_MS`, drain `DEDICATED_DRAIN_DEADLINE_MS`).
  Every call therefore ends by `runDeadlineAt - planFloorMs`, and the plan
  starts with at least `planFloorMs` (never below the job's `MIN_RUN_MS`,
  `retentionJobService.ts:605`). This is best-effort, not a guarantee: event
  loop delay, logger time and a drain that overruns its deadline are not
  reserved.
- Run end, best-effort. A run including its pre-step ends within `maxRunMs`
  plus the `max(1_000, ...)` clamp, under the same caveat. The scheduler's
  non-overlap rule (`:561-562`) still drops any due tick that a run outlives.
- The precondition `maxRunMs >= 2 × floorMs` is necessary but not
  sufficient. With the reserve, the privilege read fits only when
  `maxRunMs - planFloorMs - 12_500 >= floorMs` at the first call, that is `maxRunMs >= 55_000` at
  the default 15,000 ms floor (`core/db/databaseConfig.ts:296`). Below that the
  per-call check records `budget_exhausted` for every family. At the default
  `maxRunMs` of 300,000 (`retentionScheduler.ts:93`) the first VACUUM gets
  `min(120_000, 150_000 - elapsed - 12_500)`.
- `budget_exhausted` and `interval_too_short` are skip classes. The plan still
  runs.

**Residual rows (added to the R13-1 table, which otherwise stands).**

| shape | pre-step |
|---|---|
| any shape where retention runs, with `intervalMs < 600_000` (including the 60 s `MIN_INTERVAL_MS`) | does NOT run; `interval_too_short`; the plan runs |
| any shape where retention runs, with `maxRunMs < 2 × floorMs` | does NOT run; `budget_exhausted` for every enabled family; the plan runs |
| a run whose remaining budget does not admit the next call | the remaining families log `budget_exhausted`; the plan runs |

In each of these rows the R12-1 **Residual** applies unchanged: the candidate
read is bounded by the 4,000 ms tx-local cancel and surfaces as
`retention_batch_failed` for that family and run.

**A2 and B6, qualified (replaces the R13-1 sentence at `:4322-4324` and the
R13-6 restatement at `:4694-4699`).** The pre-step runs in every deployment
shape where retention runs, including the Render transaction-pooler shape
through `DB_MAINTENANCE_MODE=direct`, but only when the run's interval is at
least 600,000 ms and its budget admits the calls. Retention at the 60 s
minimum interval runs WITHOUT the pre-step. Otherwise it moves production
toward the VM-set state before every run, best-effort; the residual is
bounded by the 4,000 ms cancel (R12-1 **Residual**, R13-1, the R14-4 rows).
The gate does not close the gap.

#### R14-5 (MEDIUM) — Autovacuum (D-6)

**Holders (binding; replaces the R13-4 (d) holder sentence at `:4503-4506`).**
A manual VACUUM that waits for `SHARE UPDATE EXCLUSIVE` held by a
non-wraparound autovacuum makes PostgreSQL cancel that autovacuum after
`deadlock_timeout` (default 1 s). The pre-step then proceeds and gets no
`55P03`. `55P03` (lock timeout, `skipped_concurrent`) comes only from another
manual VACUUM or ANALYZE (normally a concurrent replica's pre-step), a
`CREATE INDEX CONCURRENTLY`, DDL or an explicit `LOCK` holder. (A
wraparound-prevention autovacuum is not cancelled by PostgreSQL; a wait on it
is bounded by `lock_timeout` like any other holder's.) The statement text
stays as R12-D2 pins it; there is no `SKIP_LOCKED`.

**Cost (joins R13-4 (d) Cost).** Autovacuum cancellation is part of the
stated cost: every pre-step VACUUM that collides with a running
non-wraparound autovacuum on the same family table cancels it, and the
cancelled autovacuum's progress is lost. At short intervals that could starve
autovacuum on a large revision table. The D-5 minimum spacing of 600,000 ms
(R14-4) is the accepted mitigation: at most 144 pre-step runs per replica per
day, and none at the 60 s minimum interval. It replaces the R13-4 (d)
sentences at `:4514-4517` quoted in R14-8.

#### R14-6 (LOW) — Housekeeping (D-7, Addendum A1)

**(a) Ownership of `tests/integration/server/task551RetentionJobService.test.ts`
(Addendum A1).** D5's assignment of the `:156` edit to 06-L02 is WITHDRAWN.
06-L03 A8 (2026-09-26) makes that edit under 06-L03's envelope (06-L03
allowlist `:326`); 06-L02 `:1001-1004` already records the file as
06-L03-owned. In this leaf:

- R13-5 **Scope** bullet 2 (`:4577-4578`) is withdrawn. R13 therefore adds ONE
  edit: the `afterAll` hook option in
  `tests/perf/database-revision-candidate-bounds.test.ts` (R13-4 (f)).
- R13-5 **Gates** read:
  1. `./node_modules/.bin/eslint --max-warnings=0 tests/perf/database-revision-candidate-bounds.test.ts`.
  2. Airtight, unchanged:
     `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/integration/server/task551RetentionJobService.test.ts tests/perf/database-revision-candidate-bounds.test.ts`,
     0 fail. The job-service file is run read-only; it is never edited here.
  3. `wc -l` on `tests/perf/database-revision-candidate-bounds.test.ts` (at or
     under 1,000) and `git diff --check`.
- R13-5 **Stop rules**: both bullets (`:4600-4605`) are replaced by one rule:
  never edit `tests/integration/server/task551RetentionJobService.test.ts`;
  06-L03 A8 owns the `:156` edit.
- R13-4 (i) (`:4551-4568`) stays as the text of the edit, but the edit is
  06-L03 A8's (per R13-4 (i) text), not 06-L02's.
- R13-7: the job-service suite is lane-safe once 06-L03 A8 lands the `:156`
  edit (Addendum A1; per R13-4 (i) text). The orchestrator bullet's
  "R13-4 (i) ownership gap" is resolved by Addendum A1.
- R13-8 last row and R13-9 are re-pointed to 06-L03 A8 (quoted in R14-8). No
  fence edit is made or needed in this leaf.

**(b) Drain code.** `dedicated_database_drain_unconfirmed` and "the drain
code is logged" are dropped from R13-1 **Abort** (R14-2).

**(c) Effectiveness read count.** R12-1 `:3745-3746` (one catalog read after
each VACUUM) is superseded by R13-4 (a): one read after all the family
VACUUMs of the run, which the "N + 2 per run" count (`:4512-4513`) assumes.

**(d) Receipt.** The R13-1 receipt is replaced by the R14-7 block, whose
`skip` field lists the full closed skip set and which adds a `budget` field.

**(e) Abort DB leg shape (replaces R13-1 steps 2 and 3, `:4270-4277`, and
the lock-timeout paragraph, `:4284-4286`; steps 1, 4 and 5 stand).**

2. Lock holder: its own `max: 1` client, used for nothing else. It sends the
   literal `BEGIN`, then the literal
   `LOCK TABLE <leg table> IN SHARE UPDATE EXCLUSIVE MODE`, which conflicts
   with VACUUM, and holds the transaction open.
3. The leg starts the pre-step with its own `AbortController` and the REAL D1
   seam. An observer on a DIFFERENT connection (never the lock holder) polls
   `pg_stat_activity` in autocommit, one statement per poll outside any
   transaction, so the per-transaction statistics snapshot is fresh each time
   (bounded, 50 ms interval). The match is: `datname = current_database()`,
   `wait_event_type = 'Lock'`, `query` containing the leg table name, and
   `application_name` equal to the maintenance `application_name` the seam's
   client carries (02-L02 R8.1 startup parameters, read from the same owner,
   never a copied literal). It records that backend's `pid` and
   `backend_start`.

`lock_timeout` for the leg is the owner-map value `DB_LOCK_TIMEOUT_MS=15000`
(`M-fixture-lock`, 01-L01 `:3534`), under which 06-L03's closed
`task551-db-test` form runs the DB legs. The wait is observed within a few
polls, the abort is issued well inside 15,000 ms, and an aborted signal wins
over any seam rejection (R14-1), so the lock timeout cannot change the
asserted outcome.

**(f) R13-4 (e) anchors by symbol (replaces the line anchors at `:4522-4526`
and `:4529-4530`).** The pins are those of the test
`author-audit preflight derives the current graph without returning source text`
in `tests/unit/workflows/task551AuthorAudit.test.ts`: its `plan.inventory`
pin (41/11/29/33), its `plan.dispatchOrder` size pin
(`new Set(plan.dispatchOrder.map(...)).size`) and its
`plan.dispatchOrder.at(-1)` pin (`TASK-551-10-L02:single`); plus the
**Family preflight (literal; repo root)** bullet of
`_docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md`. The owner
re-grounds them at allocation time; that file is under concurrent edit.

**(g) Scheduler-ordering airtight leg (R13-2 Tests, `:4413-4414`).** The
injection mechanism is stated by 06-L03 A8 (2026-09-26): the 02-L02 R9.9 fake
`dedicatedClientFactory` whose results carry command tags (including
`VACUUM`), under a placeholder URL. R14 cites it and adds nothing. The
airtight form of R13-2 stands.

#### R14-7 — Receipt (replaces the R13-1 block at `:4306-4318`; the old block is not edited)

```text
coldStatePolicy: {
  policy: "pre_retention_vacuum_unconditional",
  statement: "VACUUM (ANALYZE) <family table>",
  channel: "runDedicatedMaintenanceStatement (TASK-551-02-L02 R9.1, R10) on the R7.2 dedicated/direct maintenance target; autocommit; own max:1 client, discarded on every path; statement = (sql) => sql.unsafe(renderedText); before the plan's dedicated session; outside any lease",
  statementTimeoutMs: "VACUUM min(120000, callBudgetMs); catalog reads floorMs = effectiveDedicatedStatementBoundMs(); never below floorMs",
  budget: "planFloorMs = max(1000, ceil(maxRunMs/2)); CALL_OVERHEAD_MS = 12500 reserved per call; runs only when intervalMs >= 600000 and maxRunMs >= 2 * floorMs; best-effort",
  abort: "seam observes the signal from entry (slot wait, pending open, statement); settles within DEDICATED_DRAIN_DEADLINE_MS = RETENTION_CANCEL_DRAIN_DEADLINE_MS (4500); residual: closeAll containment",
  skip: "maintenance session unavailable (rest of run), concurrent (55P03), budget_exhausted, interval_too_short, disabled, normalizer error, not permitted or absent",
  failure: "statement timeout (57014), session lost, reserve timeout, bound invalid, other; logged by closed code; never blocks retention",
  owner: "TASK-551-06-L03 scheduler pre-step (pre-retention vacuum)",
  decidedBy: "TASK-551-06-L02 R11, amended R12, R13 and R14"
}
```

The R10-9 addendum records `coldStatePolicy` in this shape (replaces R13-5
**Receipt**).

#### R14-8 — Superseded sentences (quoted; text authoritative)

R13 (`:4156-4796`):

- `:4175-4178`, "It adds one test file to the code scope,
  `tests/integration/server/task551RetentionJobService.test.ts` (R13-4 (i)),
  which is NOT in this leaf's envelope `allowlist`; R13-9 records the exact
  entry that would be needed.": "It adds no test file to the code scope; the
  job-service `:156` edit is 06-L03 A8's (Addendum A1, R14-6 (a))."
- `:4232-4236`, "Each VACUUM passes `statementTimeoutMs` = `min(120_000,
  remaining pre-step share)` (R13-2). The seam clamps and validates it against
  `[config.statementTimeoutMs, 120_000]` and rejects an out-of-range value;
  the pre-step therefore never calls it with a bound below
  `config.statementTimeoutMs` and records `budget_exhausted` instead.": read as
  R14-3 **Bound** and R14-4.
- `:4237`, "The two catalog reads pass `config.statementTimeoutMs`.": "The two
  catalog reads pass `floorMs` (R14-3 **Floor source**)."
- `:4246-4248`, "When the signal is aborted, any seam rejection (normally
  `dedicated_database_session_lost`, or `dedicated_database_drain_unconfirmed`)
  is re-thrown as the run's abort; the drain code is logged.": "When the
  signal is aborted, the seam rejects `dedicated_database_session_lost` after
  its drain; the pre-step logs that rejection code and re-throws the run's
  abort." (R14-2).
- `:4250-4253`, "The run settles within `RETENTION_CANCEL_DRAIN_DEADLINE_MS`
  (4,500 ms, `core/db/databaseLifecycle.ts:30`), which equals the R7.4 drain
  deadline counted from the drain start.": read as R14-2 **Abort** and
  **Residual** (settlement counted from the abort, in every seam phase).
- `:4270-4277` (DB leg steps 2 and 3), "A second session (the leg's observer
  client) opens a transaction and takes `LOCK TABLE <leg table> IN SHARE
  UPDATE EXCLUSIVE MODE`, which conflicts with VACUUM." and "The leg starts
  the pre-step with its own `AbortController` and the REAL D1 seam, then polls
  `pg_stat_activity` (bounded, 50 ms interval) until a backend on the current
  database shows `wait_event_type = 'Lock'` and a query starting with
  `VACUUM`. It records that backend's `pid` and `backend_start`.": read as
  R14-6 (e) steps 2 and 3.
- `:4284-4286`, "The leg may run under the default 5,000 ms `lock_timeout`:
  the wait is observed within a few polls, and an aborted signal wins over any
  seam rejection, so the lock timeout cannot change the asserted outcome.":
  read as the R14-6 (e) `lock_timeout` paragraph (`DB_LOCK_TIMEOUT_MS=15000`).
- `:4311-4313` (R13-1 receipt), `statementTimeoutMs: "min(120000, remaining
  pre-step share); budget_exhausted below config.statementTimeoutMs",`,
  `abort: "R7.4 drain; the run settles within
  RETENTION_CANCEL_DRAIN_DEADLINE_MS (4500)",` and `skip:
  "database_maintenance_session_unavailable only (plus the D5 lock-timeout
  class)",`: read as the R14-7 receipt.
- `:4322-4324`, "the pre-step runs in every configuration where retention
  runs, including the Render transaction-pooler shape, and its residual is
  bounded as above.": read as R14-4 **A2 and B6, qualified**.
- `:4338-4343` (R13-2 pseudocode), "shareMs = runDeadlineAt - now -
  planFloorMs", "if shareMs < config.statementTimeoutMs:", "bound = VACUUM ?
  min(120_000, shareMs) : config.statementTimeoutMs" and
  "runRetentionPlan(now, signal, { maxRunMs: max(1_000, runDeadlineAt - now)
  })": read as the R14-4 pseudocode.
- `:4347-4350`, "The reservation is `planFloorMs`, so the plan always starts
  with at least half the run budget (and never below the job's `MIN_RUN_MS`,
  `retentionJobService.ts:605`), and a slow VACUUM cannot starve retention run
  after run.": read as R14-4 **Claims restated**, first bullet (best-effort).
- `:4351-4353`, "A run including its pre-step ends within `maxRunMs`, plus at
  most one seam watchdog grace and one 4,500 ms drain when a VACUUM hit its
  bound, plus the `max(1_000, ...)` clamp.": read as R14-4 **Claims
  restated**, second bullet.
- `:4365-4368`, "It binds the default dependencies: `getRevisionFamilyTableName`
  (R12-3), `normalizeRevisionRetentionPolicy` (`revisionRetentionService.ts:317`),
  the D1 seam, the clock and the logger.": read as the R14-3 **Lazy-deps
  binding list**.
- `:4383-4385`, "If 02-L02 R9 types the seam's `statement` as something other
  than SQL text, the lazy-deps layer adapts the rendered text to that type
  without changing its bytes.": read as R14-3 **Statement adapter**.
- `:4396-4400`, "the classification: `database_maintenance_session_unavailable`
  skips the rest of the run; SQLSTATE `57014` is a statement-timeout failure;
  `55P03` is `skipped_concurrent` (R13-4 (d)); any rejection with an aborted
  signal propagates the abort; anything else is a failure with a redacted
  closed code;": "the classification over the closed R14-1 input (the R14-1
  table);".
- `:4451-4452`, "The 02-L02 R9 section is being written in this round; its
  line anchors are recorded when it lands.": read as R14-3 **R9.1 anchors**.
- `:4503-4506`, "The only holders that conflict with `SHARE UPDATE EXCLUSIVE`
  are another VACUUM or ANALYZE (normally a concurrent replica's pre-step or
  autovacuum), `CREATE INDEX CONCURRENTLY`, or DDL.": read as R14-5
  **Holders**.
- `:4514-4517`, "At the 60 s minimum interval (`MIN_INTERVAL_MS`, `:94`) the
  same cost recurs every minute on every replica. That is an operator choice
  this leaf does not forbid, and it is called out here as a known cost.":
  "Below 600,000 ms, including the 60 s minimum interval (`MIN_INTERVAL_MS`,
  `:94`), the pre-step does not run (`interval_too_short`, R14-4); the cost,
  including autovacuum cancellation, recurs at most once per 10 minutes per
  replica (R14-5)."
- `:4522-4526`, "(`tests/unit/workflows/task551AuthorAudit.test.ts:324`, and
  the TASK-551-11 family-preflight literal at `:1173`), together with the leaf
  and occurrence counts and the dispatch-order size that one new `single`
  occurrence moves (`:326-327`, `:336`);": read as R14-6 (f).
- `:4529-4530`, "which must stay the last dispatch entry
  (`task551AuthorAudit.test.ts:335`).": "which must stay the last dispatch
  entry (the `plan.dispatchOrder.at(-1)` pin, R14-6 (f))."
- `:4564`, "D5 assigns this edit to 06-L02.": "Addendum A1 withdraws D5's
  assignment; the edit is 06-L03 A8's."
- `:4567-4568`, "The implementer does not make the edit until the
  orchestrator has resolved that ownership gap (R13-5 stop rule).": "The
  06-L02 implementer never makes the edit (R14-6 (a))."
- `:4572`, "R13 adds two edits:": "R13 adds one edit:" (R14-6 (a)).
- `:4577-4578`, "`tests/integration/server/task551RetentionJobService.test.ts:156`,
  which is not in the envelope: the schema-qualified predicate (R13-4 (i)).":
  withdrawn (R14-6 (a)).
- `:4585`, gate 1 naming both files: read as R14-6 (a) gate 1 (the
  candidate-bounds file only).
- `:4589`, "`wc -l` on both files (at or under 1,000) and `git diff
  --check`.": read as R14-6 (a) gate 3.
- `:4600-4605` (both stop-rule bullets), "the job-service test edit is due
  while `tests/integration/server/task551RetentionJobService.test.ts` is still
  outside this leaf's envelope and no orchestrator ownership decision is
  recorded;" and "the `:156` predicate is not the only unqualified `relname`
  lookup in that file when the edit is made.": "never edit
  `tests/integration/server/task551RetentionJobService.test.ts`; 06-L03 A8
  owns the `:156` edit."
- `:4735-4738`, "The R13-4 (d) classification needs the seam to surface
  SQLSTATE `57014` and `55P03` as a closed, redacted value. If R9 does not,
  the orchestrator records that as a 02-L02 handoff before 06-L03 R1; 06-L03
  never parses server messages.": "Resolved by D-1 (option (a)): R9.1's
  unchanged rethrow is the surface, 02-L02 R10 adds `55P03` to the not-loss
  list, and the 06-L03 lazy-deps layer maps the string `code` into the closed
  R14-1 input; 06-L03 never parses server messages."
- `:4740-4741`, "TASK-551-01-L01: the job-service suite is lane-safe once
  R13-4 (i) lands (D6 (i)).": "TASK-551-01-L01: the job-service suite is
  lane-safe once 06-L03 A8 lands the `:156` edit (Addendum A1; per R13-4 (i)
  text; D6 (i))."
- `:4743-4744`, "Orchestrator: the R13-4 (i) ownership gap (R13-9); the D5
  06-L04 pin work at allocation (R13-4 (e)).": "Orchestrator: the D5 06-L04
  pin work at allocation (R13-4 (e), anchored by symbol in R14-6 (f)); the
  ownership gap is resolved by Addendum A1."
- `:4773` (R13-8 last row), "R13-4 (i); edit gated on the R13-9 ownership
  decision": "R13-4 (i) text; the edit is 06-L03 A8's (Addendum A1)".
- `:4782-4788` (R13-9), "For the R13-4 (i) edit to be in scope, the
  `allowlist` would need exactly
  `"tests/integration/server/task551RetentionJobService.test.ts"`. The file is
  also in 06-L03's `allowlist` (06-L03 `:326`), so granting it here makes two
  envelopes list one file. The orchestrator decides between that fence entry
  (with an explicit single-writer order against 06-L03 R1) and running the
  edit under 06-L03. This leaf does not edit the fence.": "Resolved by
  Addendum A1: the file stays out of this leaf's fence and is edited under
  06-L03's envelope (06-L03 `:326`) by 06-L03 A8; no second envelope lists
  it. This leaf does not edit the fence."
- `:4694-4699` (R13-6 restatement of `:3811-3815`), "R13-1 runs the
  unconditional pre-retention VACUUM on the R7.2 dedicated/direct target,
  which exists in every configuration where retention runs, including the
  Render transaction-pooler shape through `DB_MAINTENANCE_MODE=direct`. It
  moves production toward the VM-set state before every run, best-effort; the
  residual is bounded by the 4,000 ms cancel (R12-1 **Residual**, R13-1). The
  gate does not close the gap.": read as R14-4 **A2 and B6, qualified**.

R12 (`:3627-4154`):

- `:3690-3692` (**Placement**), "immediately before the plan call
  `runRetentionPlan(now, signal, { maxRunMs })`": "immediately before the plan
  call `runRetentionPlan(now, signal, { maxRunMs: max(1_000, runDeadlineAt -
  t()) })`, with the scheduler's Date `now` passed unchanged (R14-4)".
- `:3745-3746` (**Effectiveness**), "After each VACUUM that returned, one
  catalog read of that table's `pg_class.relpages` and `relallvisible`.":
  read as R13-4 (a) (one read after all the family VACUUMs of the run;
  R14-6 (c)).

#### R14-9 — Finding-to-disposition table (R13 audits)

Audit A (`af02748558c10e64b`: 0 HIGH, 3 MEDIUM, 8 LOW, 2 INFO) and audit B
(`a5d98b3f3ffb0d529`: 0 HIGH, 5 MEDIUM, 9 LOW):

| finding | severity | disposition |
|---|---|---|
| A-M1 A1 withdraws the `:156` edit but R13 still binds it (scope, gates, stop rule) | MEDIUM | Closed by R14-6 (a) (Addendum A1) |
| A-M2 R9.1 rethrows raw errors; SQLSTATE mechanism undecided | MEDIUM | Closed by R14-1 (D-1 option (a)); 02-L02 R10 adds `55P03` and the F27 sub-leg |
| A-M3 new 06-L03 amendment collides with the existing A4 | MEDIUM | Orchestrator: relabelled A8 (Addendum C2, D-9); R14 cites "06-L03 A8 (2026-09-26)" |
| A-L1 drain code cannot reach the pre-step | LOW | Closed by R14-2 **Abort** and R14-6 (b) (D-7) |
| A-L2 Bound misstates the seam clamp; budget abort via `signal` | LOW | Closed by R14-3 **Bound** (D-4); 02-L02 R10 replaces its parenthetical |
| A-L3 clock and `now` types; overhead missing from "half" | LOW | Closed by R14-4 (D-5) |
| A-L4 `statement` is a builder; adapter unnamed | LOW | Closed by R14-3 **Statement adapter** (D-4) |
| A-L5 `:3745-3746` not superseded | LOW | Closed by R14-6 (c) and R14-8 (D-7) |
| A-L6 receipt `skip` too narrow | LOW | Closed by R14-7 (D-7) |
| A-L7 abort-leg observer polls from the lock-holder transaction | LOW | Closed by R14-6 (e) (D-7) |
| A-L8 R13-4 (e) line anchors stale | LOW | Closed by R14-6 (f) (D-7) |
| A-I1 R9.1 anchors unrecorded; small `maxRunMs` consequence unstated | INFO | R14-3 **R9.1 anchors**; R14-4 claims and residual rows (D-4, D-5) |
| A-I2 R13-8 row count verified | INFO | No change |
| B-M1 abort bound fails during slot wait or open | MEDIUM | Closed by R14-2 (D-2, 02-L02 R10 option (a)); residual `closeAll` containment |
| B-M2 budget ignores per-call overhead; small `maxRunMs` | MEDIUM | Closed by R14-4 (`CALL_OVERHEAD_MS`, preconditions, residual rows, A2/B6 qualified) (D-5) |
| B-M3 pure module cannot own codes owned by `core/db/client.ts` | MEDIUM | Closed by R14-1 (closed pure input; mapping in the lazy-deps layer) (D-1) |
| B-M4 `:156` ownership (as A-M1) | MEDIUM | Closed by R14-6 (a) (Addendum A1) |
| B-M5 autovacuum is cancelled, not a 55P03 holder; cost | MEDIUM | Closed by R14-5 (D-6); 600,000 ms minimum spacing (D-5) |
| B-L1 `55P03` not pinned in R9 | LOW | Closed by R14-1; 02-L02 R10 not-loss list and F27 sub-leg (D-1) |
| B-L2 abort leg: snapshot, match, `lock_timeout` | LOW | Closed by R14-6 (e) (D-7) |
| B-L3 clamp wording; integer clock; `now` Date; `:3690-3692` | LOW | Closed by R14-3 **Bound** and R14-4; `:3690-3692` quoted in R14-8 (D-4, D-5) |
| B-L4 floor source unnamed | LOW | Closed by R14-3 **Floor source** (`effectiveDedicatedStatementBoundMs()`, D-4) |
| B-L5 R9 landed: adapter conditional and anchors | LOW | Closed by R14-3 (D-4) |
| B-L6 drain code cannot reach the pre-step (as A-L1) | LOW | Closed by R14-2 and R14-6 (b) (D-7) |
| B-L7 receipt `skip` narrow; no budget field | LOW | Closed by R14-7 (D-7) |
| B-L8 R13-4 (e) anchors stale (as A-L8) | LOW | Closed by R14-6 (f) (D-7) |
| B-L9 scheduler-ordering leg has no injection seam | LOW | Closed by R14-6 (g): 06-L03 A8 states the R9.9 fake-factory mechanism (D-7) |
