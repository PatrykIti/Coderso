# TASK-551-03: Bounded Read Models, Keyset Pagination, Batching, and N+1 Removal
# FileName: TASK-551-03-Bounded-Read-Models-Keyset-Batching-And-N-Plus-One.md

**Parent Task:** TASK-551
**Priority:** Critical
**Category:** Database / Performance / Architecture
**Estimated Effort:** Extra Large
**Dependencies:** TASK-551-01, TASK-551-02, and TASK-551-05 complete for L01;
TASK-551-06-L03 plus TASK-551-09-L04 INITIAL Admin-authority and
TASK-551-08-L03 INITIAL route-response-header receipts complete before L02
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Replace unbounded list reads, offset scans, repeated aggregate loops, and
row-by-row writes with bounded read models, signed opaque keyset cursors,
set-based SQL, and chunked mutations. Preserve response authorization and cache
contracts while separating oversized mixed-responsibility services before they
receive new behavior.

## Sub-Tasks

1. `TASK-551-03-L01` owns the Bun-free cursor and bounded-read contracts plus the
   narrow server lifecycle adapter that loads and holds the immutable keyring.
2. `TASK-551-03-L02` consumes L01 plus the already-landed TASK-551-05 booking
   and list constraints and TASK-551-06's bounded revision services for admin
   list/read paths, page/detail revision route adoption, and booking/auth
   concurrency. It owns a new bounded form read service and every booking
   resource/service/assignment/schedule/blackout/reservation list contract; it
  also owns fixed global summary and bounded relation-facet envelopes that
  replace whole-array-derived admin counts without making them page-local.
  Arbitrary filtered totals are explicitly not computed: envelopes return
  `matchingTotal:null` plus `hasMore`, while every exact fixed/facet value states
  snapshot freshness and authorized-global scope. All page/summary/facet SQL
  runs in one read-only repeatable-read transaction and has an individual
  checked-in budget plus sanitized plan receipt. It
  lands before aggregate changes. Existing booking tab modules consume narrow
  list items (service rows retain only derived `submissionAccess`), submission
  payload is an uncached user-triggered point detail, and media list rows expose
  a safe derived `name` without their storage key. Submission detail transport
  is explicitly `Cache-Control: private, no-store, max-age=0` plus a client
  `cache:"no-store"` fetch through 08-L03 INITIAL's strict request-local header
  transport. Its eight Admin clients consume 09-L04 INITIAL's opaque
  installation/reset authority and return a receipt without sharing ownership.
  Page-author, reverse-role, post-tag, and media-tag
  predicates consume the four exact evidence-owned TASK-551-05 indexes.
3. `TASK-551-03-L03` consumes L01 and the baseline budgets for analytics,
   dashboard, webhook and solution-kit batching. It owns the grounded per-export
   statement caps, atomically migrates webhook service/delivery/route/schema/
   client/UI to 50/100 keyset envelopes with one lateral latest-delivery read,
   changes the currently uncalled event lookup to a backpressured 100/250
   `AsyncIterable`, bounds delivery retries at five, and splits the installer by
   exact type/snapshot/operation/repository ownership and transaction receipts.
   `seoService.ts` and `importExportService.ts` remain exclusively
   TASK-551-09-owned.

L02 and L03 may not land in parallel. Each leaf reads the current source before
editing and has sole ownership of every path in its allowlist.
The compile-green family order is 01 → 02 → 05 → 03-L01 → 06 → 07-L01 →
09-L04 INITIAL + 08-L03 INITIAL → 03-L02 → 03-L03 → 04; no TASK-551-03
route/client/UI edit may precede all four L02 receipts. The two INITIAL phases
remain nonterminal and their later owners must not reopen L02 clients/routes.
TASK-551-02 has already landed the shared prod/dev lifecycle entrypoint before
this order reaches L02, so the cursor participant is started in both runtime
modes and L02's smoke is not deferred to TASK-551-08.

## Cross-Stream Collision Guards

- The parent external dispatch gate is mandatory before this child. TASK-511,
  TASK-493, TASK-517, and TASK-518 are terminal by default; only a fresh exact
  serialized handoff covering every parent-listed schema/journal/env/public/
  entry/SEO/import/lifecycle path can substitute.
- TASK-511 exclusively owns `core/services/backups/**` and
  `core/server/jobs/backupScheduler.ts`; keep its final backup/import contract
  intact after the gate.
- TASK-517 exclusively owns `core/services/content/entryService.ts` and
  `core/server/publicSite.tsx`; L02 introduces a separate entry read service and
  waits/rebases for any shared route tests.
- TASK-493 exclusively owns Search Console/indexing product work. After its
  terminal/exact handoff, this child
  does not edit SEO source; TASK-551-09 owns any current SEO query/invalidation
  work after its explicit TASK-493 handoff.
- TASK-518 owns its migration family. This subtask owns no migration artifacts.
- Forbidden for all leaves: `core/db/schema.ts`, `core/db/schema/**`,
  `core/services/search/**`, migration/meta files, cache implementation files,
  task board, changelog, and workflow scripts.

## Shared Acceptance

- Every collection query has a hard validated limit (`default <= 50`,
  `maximum <= 100`) or an explicitly budgeted streaming/batch contract.
- Booking service-resource and schedule arrays are the only parent-scoped list
  exceptions: writes enforce at most 100 rows and reads request 101 to fail
  closed on corrupt legacy overflow. Slot preview is limited to 31 days/500
  results. Every other booking/form collection uses its exact L02 keyset
  envelope; no caller reconstructs all pages.
- Keyset pages use a deterministic unique tie-breaker and return no duplicate or
  missing record across equal-sort-value page boundaries. Cursors use L01's
  exact two-segment wire and code-owned typed `KeysetSpec`; request bytes can
  never select a column/order/null policy. Previous traversal reverses SQL order
  plus result rows exactly as L01 specifies and never uses offset.
- Representative large-fixture list endpoints execute at most 3 SQL statements;
  each list uses at most one bounded page query, one fixed-row global summary
  aggregate and one bounded relation-facet batch in one read-only repeatable-read
  snapshot. There is no arbitrary filtered `COUNT(*)`; `matchingTotal` is null
  and pagination uses page length plus `hasMore`. Every statement has its own
  numeric budget/sanitized-plan receipt. Existing status tabs,
  stat cards, role/folder/tag facets, storage totals and booking summaries remain
  collection-global across page navigation and are never derived from a page or
  auto-fetched full list. Aggregate dashboards execute at most 8 statements and
  never grow with row count. L03 additionally pins every grounded analytics/
  dashboard export to its exact 1/2/4-statement cap and migrates webhook list/
  history plus all route/Admin consumers under one writer.
- Initial form-submission lists transfer no payload and execute no hidden detail
  query; one accessible row expansion performs one parent-scoped point query and
  keeps payload only in component memory until close/auth lifecycle. Its success
  and route-mapped error responses are private/no-store through the L03-owned
  header seam and the request uses no-store fetch semantics. Media name
  fallback and all existing booking tabs have direct compatibility tests.
- Bulk operations use bounded chunks of at most 500 rows/parameters within the
  PostgreSQL bind limit and keep all-or-nothing semantics where promised.
- Webhook pages default to 50/max 100, event targets stream in default 100/max
  250 batches, and delivery attempts cap at five. Solution-kit plans cap at 500
  operations/4 MiB, child writes chunk at 100, and each committed domain
  operation shares its transaction with its success receipt.
- Booking writes map the already-landed named exclusion/check constraints and
  retain the service-level advisory lock for deterministic conflict UX.
- Touched legacy modules above 1,000 physical lines are cohesively split first;
  every resulting human-authored production/test file is at most 1,000 lines.
  In L02 this includes deleting the oversized booking-page and media-library
  suites after their exact loading/pagination, mutation/selection, and calendar/
  upload assertion groups move to the named independently runnable suites and
  focused fixture modules in the leaf.

## Security Contract

- Existing `/admin/api/*` collection routes remain internal with session auth,
  current resource RBAC, CSRF on writes, existing admin read/write rate-limit
  buckets, and strict reject-unknown schemas. Public booking retains its current
  access evaluator, nonce/signature/CAPTCHA policy, and public-write bucket.
- Authorization predicates are applied before cursor and limit processing.
  Cursor material is scope-bound and tamper-evident but never grants access.
- Routes treat the cursor as an opaque L01 value. Only a code-owned spec selects
  fields; schema/value/spec/version/signature/age failures map to the same public
  `cursor_invalid` without revealing the failing field or parse stage.
- No route may read cursor secrets from `process.env`. TASK-551-03-L01 exports
  exactly `PaginationCursorKeyring`, `loadPaginationCursorKeyring(env)`,
  idempotent `registerPaginationCursorLifecycleParticipant()`, and fail-closed
  `requirePaginationCursorKeyring()`. TASK-551-03-L02's sole
  `core/server/routes/index.ts` edit calls the register function at module
  evaluation. The participant reads env and installs the immutable keyring only
  during awaited lifecycle start; routes call `require*` afterward and pass the
  value into read services. TASK-551-08-L03 preserves this participant/import
  and must neither reload the env nor create a second keyring owner.
- TASK-551-08-L03 owns `router.ts`/`httpServer.ts` response-header transport.
  L02 only registers its submission-detail no-store handler first and calls the
  exact closed setter; it never edits or replaces the shared transport.
- TASK-551-09-L04 owns Admin cache installation authority and `cachePolicy.ts`.
  L02 imports those modules read-only and hardens exactly its eight client
  owners; no cache hit is an authorization decision.
- Errors and telemetry omit cursor payloads, SQL/binds, credentials, session
  material, hidden columns, and PII.

## Testing Requirements

Each leaf runs its targeted tests plus `bun --cwd core lint:types` and
`bun --cwd core lint`. After L03, run the exact DB integration/performance suites
listed in the leaves, `bun run gates:coderso`, `bun run gates:coderso:perf`, and
the applicable security scan. L01/L02 prove module registration occurs before
the shared `runtimeEntrypoint.ts` starts the lifecycle/listens for either thin
mode adapter, invalid keyring config rejects lifecycle start, and
`requirePaginationCursorKeyring()` fails closed before start/after
close. L02 additionally proves every exact global summary/facet reports one
transaction snapshot and remains unchanged across at least three pages, filters
leave `matchingTotal:null` and change only rows/`hasMore`, every SQL fingerprint
has its required numeric evidence, and completes
its five-scenario visible-effect Playwright smoke in light and dark mode with
zero console errors.

## Documentation Updates Required

No shared docs are edited here. Each leaf supplies its limits, cursor/startup,
API, service-split, and validation handoff to TASK-551-10-L02, which owns shared
documentation and the single changelog entry.
