# TASK-551-03-L03: Set-Based Aggregates, Batching, and N+1 Removal
# FileName: TASK-551-03-L03-Set-Based-Aggregates-Batching-And-N-Plus-One-Removal.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-03
**Priority:** Critical
**Category:** Database / Performance / Reliability
**Estimated Effort:** Extra Large
**Dependencies:** TASK-551-03-L02
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Replace application-side aggregation, per-row lookups/writes, and unbounded
install/retry arrays with set-based SQL, explicit projections, and bounded
chunks. Split the oversized solution-kit installer before changing its behavior
while preserving rollback, webhook retry, and solution-kit product contracts.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Production:** `core/services/analytics/analyticsService.ts`,
`core/services/analytics/trafficAggregationService.ts`,
`core/services/dashboard/dashboardService.ts`,
`core/services/webhooks/webhooksService.ts`,
`core/services/webhooks/deliveryService.ts`,
`core/server/routes/webhooksRoutes.ts`,
`core/server/validation/webhookSchemas.ts`,
`core/admin/services/webhooksClient.ts`,
`core/admin/ui/settings/WebhooksPage.tsx`,
`core/admin/ui/settings/WebhooksTable.tsx`,
`core/services/kits/solutionKitsInstallService.ts`,
`core/services/kits/solutionKitInstallTypes.ts`,
`core/services/kits/solutionKitInstallSnapshots.ts`,
`core/services/kits/solutionKitInstallOperations.ts`, and
`core/services/kits/solutionKitInstallRunRepository.ts`.

**Tests:** `tests/unit/analytics/analyticsService.test.ts`,
`tests/unit/analytics/trafficAggregationQuery.test.ts`,
`tests/integration/analytics/trafficAggregation.test.ts`,
`tests/unit/dashboard/dashboardService.test.ts`,
`tests/unit/webhooks/webhooksService.test.ts`,
`tests/unit/webhooks/deliveryService.test.ts`,
`tests/integration/routes/webhooks.test.ts`,
`tests/vitest/admin/webhooksClient.test.ts`,
`tests/vitest/ui-integration/webhooks.test.tsx`,
`tests/vitest/ui/webhooks.test.tsx`,
`tests/unit/kits/solutionKitsService.test.ts`,
`tests/unit/kits/installService.test.ts`,
`tests/integration/routes/solutionKitsRoutes.test.ts`, and
`tests/perf/database-set-based-batch-budgets.test.ts`.

No other files may be edited. `webhooksRoutes.ts` and its admin consumers are
included because the existing unbounded `listWebhooks`/`listDeliveries` array
contract cannot become paginated atomically while leaving its callers unchanged;
TASK-551-03-L02 owns none of these paths. The whole `core/services/seo/seoService.ts` and
`core/services/tools/importExportService.ts`, including their tests and query
optimization, belong exclusively to TASK-551-09 after TASK-493/TASK-511
serialization; this leaf must not edit or partially extract them. TASK-511,
TASK-493, TASK-517, and TASK-518 paths, all schema/migrations, every other route,
cache files, task/changelog/workflow files are forbidden.

## Grounded Query and Export Contract

### Analytics and dashboard

Preserve every current export name and return DTO. Implement these exact bounded
statement families; all timestamps use the existing caller-supplied/frozen `now`
and two-sided `[start,end)` windows:

| Current export | Required SQL/result contract | Statement cap |
|---|---|---:|
| `getAnalyticsOverview(rangeDays)` | one `UNION ALL`/CTE event projection over pages, entries, media, and users; return one scalar totals/current/previous row plus at most `3 * 365` page/entry/media day rows; count published pages with `FILTER`; never select documents, entry `data`, media bodies/keys, user email/password/secret columns | 1 |
| `getTopContent(input)` / `exportTopContentCsv` | one union of page and entry branches, each projecting only `id,type,title,slug,updated_at`; final `ORDER BY updated_at DESC,type ASC,id DESC LIMIT :limit`, limit `1..50`; score/CSV escaping remain byte-identical | 1 |
| `getTrafficOverview(input)` | statement A returns current/previous pageview/visitor/session/bounce/view totals, closed source/device groups, and at most 10 referrers; statement B returns at most 365 day buckets and 10 top-page rows with `path,views,visitors`; no visitor hashes leave aggregate expressions | 2 |
| `getTopPages(input)` / `exportTopPagesCsv` | standalone grouped pageview/session join, projection `path,views,visitors`, `ORDER BY views DESC,path ASC LIMIT :limit`, limit `1..100` | 1 |
| `getDashboardTotals()` | one scalar row counting pages, entries, media, users through fixed CTE scalar subqueries | 1 |
| `getStorageSummary()` | one scalar `coalesce(sum(media.size),0)` row | 1 |
| `getRecentEdits(limit)` | one union of separately capped page/entry/media branches, final `ORDER BY updated_at DESC,type ASC,id DESC LIMIT :limit`; exact current DTO projection, including only the encrypted/plain author email columns required by `resolveEmailValue`; media key is used only by the current safe URL/title projection and is not returned | 1 |
| `getContentTypeCounts(limit,contentTypeIds)` | existing grouped left join; limit `1..50`; normalize unique canonical UUID IDs and reject more than 100 before SQL; projection remains `id,slug,label,count` | 1 |
| `getContentOverTime(rangeDays,bucket)` | existing closed `day|week` group; range `1..365`; at most 365 rows | 1 |
| `resolveContentQueryWidget(config)` | one joined projection, limit `1..50`, code-owned sort allowlist, and final `id` tie-breaker matching direction; no dynamic SQL text | 1 |
| `getDashboardData()` | call the three owned statement families for totals/storage/recent edits plus the existing security-settings read; no nested count loop | `<=4` including settings |

The tagged aggregate row decoder rejects unknown tags, duplicate scalar groups,
more than the declared row cap, and invalid numeric/date values with
`analytics_query_shape_invalid` or `dashboard_query_shape_invalid`. Existing
`analytics_query_failed` remains the sanitized DB failure. Empty families still
produce zero totals and dense zero day buckets in application memory; density is
bounded by `rangeDays`, not table cardinality.

### Webhooks

`listWebhooks` becomes
`listWebhooks(input, keyring): Promise<{items,nextCursor,hasMore}>`, strict input
`{cursor?:string,limit?:number}`, default 50/max 100, scope
`admin:webhooks:v1:<sha256(canonicalJson({}))>`, and order
`created_at DESC,id DESC`. One statement uses a `LEFT JOIN LATERAL ... ORDER BY
created_at DESC,id DESC LIMIT 1` for last delivery. It projects exactly webhook
`id,name,url,events,enabled,createdAt,updatedAt`, SQL boolean `secret IS NOT NULL`
as `hasSecret`, and last-delivery `status,coalesce(delivered_at,created_at)`; it
never transfers/decrypts `secret` or loads all deliveries.

`listDeliveries(webhookId,input,keyring)` uses strict canonical UUID parent plus
the same 50/100 limit, scope
`admin:webhook-deliveries:v1:<sha256(canonicalJson({webhookId}))>`, order
`created_at DESC,id DESC`, `LIMIT + 1`, and only the nine current summary fields.
The two GET routes validate query keys strictly, require the installed L01
keyring after existing `settings:read`, and return the exact envelope. The client,
page, and table migrate atomically: visible load-more/end state, no eager loop to
reconstruct all pages, cursor reset after create/update/delete/test, and no
mount-time double fetch. Delivery history stays lazy and paginated.

The currently uncalled exported `listWebhooksByEvent` is preserved by name but
becomes a backpressured `AsyncIterable<readonly WebhookDeliveryTarget[]>`. It
normalizes one event (`1..100` UTF-8 bytes), queries only enabled rows with
`events @> :oneEventJsonArray`, orders `id ASC`, and advances by UUID keyset in
default 100/max 250 batches. Each row projects `id,url,events,secret`; secret is
decrypted only in the delivery target adapter and never logged/returned. No
array-collecting compatibility wrapper is allowed; current source scan proves
zero callers, and future TASK-491 dispatch must consume the iterator. Invalid
event/page input throws `webhook_list_invalid`; malformed encrypted secret throws
the existing fail-closed secret error.

`deliverWebhook` preserves its export/result/signature/header/backoff semantics,
but strictly normalizes `attempts` default 3/max 5, `timeoutMs` default 8,000 and
range `100..30,000`, and `baseDelayMs` default 400/range `0..5,000`. It executes
one point webhook read, one delivery insert, and at most one scoped update per
attempt; inputs outside the bounds fail `webhook_delivery_options_invalid`
before any DB or network call. Every `fetch` timer clears in `finally`; a retry
never creates a second delivery row. This leaf does not create a retry scheduler
or revive first-party event fan-out.

### Solution-kit installer split and execution

`solutionKitsInstallService.ts` remains the facade and continues to export
exactly `SolutionKitInstall*` public types plus
`listSolutionKitInstallRuns`, `getSolutionKitInstallRun`,
`listSolutionKitInstallItems`, `applySolutionKitInstall`, and
`rollbackSolutionKitInstall`. Existing importers in `solutionKitsService.ts`,
`kitInstaller.ts`, `starterContentService.ts`, and `siteBuilderExecutor.ts` need
no source edit. Move responsibilities without cyclic imports:

- `solutionKitInstallTypes.ts`: public/internal strict types, closed enums,
  normalizers, caps, summary reducer; no DB/runtime import;
- `solutionKitInstallSnapshots.ts`: the bounded preflight snapshot index and
  row-to-snapshot mappers;
- `solutionKitInstallOperations.ts`: deterministic blueprint plan, pure diffs,
  and apply/rollback executors using an injected transaction handle;
- `solutionKitInstallRunRepository.ts`: exact run/item projections, keyset/bounded
  history reads, and all run/item writes; no catalog or domain mutation logic;
- `solutionKitsInstallService.ts`: catalog resolution, orchestration, audit after
  finalization, and re-exports only; at most 1,000 lines.

The normalized plan is at most 500 resource operations and 4 MiB canonical JSON;
each persisted before/after/rollback snapshot is at most 512 KiB and all item
snapshot JSON for one run is at most 16 MiB:
at most 100 content types, 100 forms, 200 pages, and 100 menus; at most 200 terms
per content type, 100 fields per form, and 500 items per menu. Reject excess,
duplicate resource keys/positions, or a generated statement with 10,000 or more
binds as `solution_kit_plan_limit_exceeded` before domain writes. Child set-based
diff writes chunk at 100 rows; test sizes are `0,1,99,100,101,500`.

Snapshot preflight performs at most nine bounded statements: content types,
taxonomies, terms, forms, fields, pages, SEO documents, menus, and menu items.
Each uses only plan-derived unique keys/IDs, explicit required snapshot columns,
and child hard limits derived from the caps above plus one corruption sentinel;
an extra row fails `solution_kit_snapshot_limit_exceeded`. There is no query in a
term/field/item/resource loop.

Create the run before operation execution so failures remain inspectable. Each
apply or reverse-ordered rollback resource is one transaction containing its
domain mutation and success/planned/skipped item receipt; a failed operation
rolls back that transaction and writes exactly one failed receipt in a separate
bounded transaction. Thus `continueOnError=true` preserves successful operations
and continues, while false stops after the first failed receipt; neither can
commit a domain mutation without its matching success receipt. Dry-run performs
snapshot reads and run/item receipt writes but zero domain mutation, matching the
current product contract. Child changes inside one operation use set-based
`INSERT ... VALUES`, keyed update, and scoped delete chunks, never per-child SQL.
Final run update occurs once; `logAudit` remains post-finalize and outside domain
transactions.

`listSolutionKitInstallRuns` retains its array facade, strict optional
`kitId,mode,limit`, default 50/max 100, exact run-record projection, and
`created_at DESC,id DESC LIMIT :limit`; it never returns more than explicitly
requested. `getSolutionKitInstallRun` adds `LIMIT 1` and the same projection.
`listSolutionKitInstallItems(runId)` retains its array facade because writes
enforce the 500-row/16-MiB invariants. Query 1 selects only
`id,position,pg_column_size(before_snapshot/after_snapshot/rollback_action)` in
`ORDER BY position ASC,id ASC LIMIT 501`; it fails on the row/byte sentinel.
Query 2 loads the exact item projection by those at-most-500 IDs in the same
order. Oversized persistence/read fails `solution_kit_install_item_limit_exceeded`
before transferring snapshot JSON. Rollback uses this
same bounded read. Existing domain errors remain stable; unexpected driver text
maps to `solution_kit_install_failed`/`solution_kit_rollback_failed` without SQL,
bind, snapshot, URL, or payload content.

## Implementation Pseudocode

```ts
async function applySolutionKitInstall(input: ApplyInput, deps = defaultDeps) {
  const plan = normalizeAndBoundPlan(resolveDefinition(input), PLAN_CAPS);
  const snapshots = await loadSnapshotIndex(plan, deps.db); // <= 9 statements
  const run = await deps.runs.createRun(toRunInput(input, plan));
  const items: InstallItem[] = [];
  for (const operation of plan) { // <= 500; no discovery query inside loop
    try {
      const item = await deps.db.transaction(async tx => {
        const result = await applyOperation(operation, snapshots, tx, { chunk: 100 });
        return deps.runs.insertItem(tx, run.id, result); // same commit boundary
      });
      items.push(item);
    } catch (error) {
      items.push(await deps.runs.insertFailedItem(run.id, operation, mapInstallError(error)));
      if (!(input.continueOnError ?? true)) break;
    }
  }
  const finalized = await deps.runs.finalize(run.id, buildSummary(items));
  await deps.audit(finalized, buildSummary(items));
  return { run: finalized, items, summary: buildSummary(items) };
}
```

Extraction lands compile-green in this order: types → snapshots → operations →
run repository → facade. The implementer reads the current 2,773-line module and
moves cohesive declarations/functions, not arbitrary line ranges. A source guard
pins the facade exports and asserts the legacy monolith has no duplicate type,
snapshot, operation, or repository implementation after extraction.

## Testing Requirements

- Instrument DB executors and prove exact caps from 10 to 100k rows:
  analytics overview `1`, top content `1`, traffic overview `2`, standalone top
  pages `1`, dashboard data `<=4`, webhook list `1`, and delivery list `1`.
- Webhook tests pin 0/1/50/51/100/101 rows, equal timestamps, forward/back
  traversal, one lateral latest delivery, event batches 1/100/101/250/251, zero
  secret transfer in admin DTOs, iterator backpressure, and retry option bounds/
  timer cleanup/idempotent one-delivery behavior. Route/client/UI tests prove
  strict query rejection and visible load-more without mount double-fetch.
- Compare set-based output byte-for-byte with existing small-fixture semantics,
  including zero/null buckets, time zones, and deterministic order.
- Test every installer cap, 0/1/99/100/101/500 operation/child sizes, snapshot
  `LIMIT + 1` corruption, mid-child and mid-operation failures, atomic resource+
  receipt rollback, both `continueOnError` branches, dry-run zero domain writes,
  512-KiB/16-MiB snapshot edges, max bind count, and no whole-table materialization.
- Solution-kit tests prove preview/apply/rollback and audit parity, reverse order,
  idempotency, bounded 501-item corruption failure, original facade export/type
  API, no importer edits, and every split file independently importable.

## Security Contract

- Existing endpoints retain visibility, session/API-key auth, RBAC, CSRF for
  internal writes, current rate-limit buckets, and strict reject-unknown schemas.
- No new public endpoint or write. Existing webhook signature/replay controls
  remain mandatory; batch processing never bypasses tenant/resource scoping.
- Admin/aggregate projections exclude secret/provider fields. The event-delivery
  iterator is the sole bounded server-only secret projection and decrypts only at
  delivery; logs expose operation counts and statement families only, never SQL
  binds, imported content, webhook payloads, URLs, tokens, secrets, or PII.

## Validation Commands

- `set -a && source .env && set +a && bun test tests/unit/analytics/analyticsService.test.ts tests/unit/analytics/trafficAggregationQuery.test.ts tests/integration/analytics/trafficAggregation.test.ts tests/unit/dashboard/dashboardService.test.ts tests/unit/webhooks/webhooksService.test.ts tests/unit/webhooks/deliveryService.test.ts tests/unit/kits/solutionKitsService.test.ts tests/unit/kits/installService.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/webhooks.test.ts tests/integration/routes/solutionKitsRoutes.test.ts tests/perf/database-set-based-batch-budgets.test.ts`
- `bunx vitest run tests/vitest/admin/webhooksClient.test.ts tests/vitest/ui-integration/webhooks.test.tsx tests/vitest/ui/webhooks.test.tsx`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso:perf`

## Documentation Updates Required

No shared docs. Provide final query-count, chunk-size, transaction, and service
split contracts to TASK-551-10-L02.

## Quantified Acceptance

- Query counts stay within the exact per-export budgets above as table cardinality
  grows 10,000x; no discovery/read query executes inside an input-length loop.
- Webhook pages are 50/100, event batches 100/250, solution-kit child chunks 100,
  plans at most 500 operations/4 MiB, and generated statements have fewer than
  10,000 bind parameters.
- Large install/retry plans keep peak process memory below the L01 baseline
  budget, every domain success commits with its item receipt, and small-fixture
  outputs preserve existing product semantics.
- SEO and import/export source/tests remain byte-untouched and are handed to
  TASK-551-09 as whole-module owners; there is no split-writer overlap.
- Every touched/split production and test file is at most 1,000 physical lines.
