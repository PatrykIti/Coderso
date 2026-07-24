# TASK-551-03: Bounded Read Models, Keyset Pagination, Batching, and N+1 Removal
# FileName: TASK-551-03-Bounded-Read-Models-Keyset-Batching-And-N-Plus-One.md

**Parent Task:** TASK-551
**Priority:** Critical
**Category:** Database / Performance / Architecture
**Estimated Effort:** Extra Large
**Dependencies:** TASK-551-01, TASK-551-02, and TASK-551-05 complete
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Objective

Replace unbounded list reads, offset scans, repeated aggregate loops, and
row-by-row writes with bounded read models, signed opaque keyset cursors,
set-based SQL, and chunked mutations. Preserve response authorization and cache
contracts while separating oversized mixed-responsibility services before they
receive new behavior.

## Leaves and Strict Land Order

1. `TASK-551-03-L01` owns the Bun-free cursor and bounded-read contracts.
2. `TASK-551-03-L02` consumes L01 plus the already-landed TASK-551-05 booking
   and list constraints for admin list/read paths and booking/auth concurrency;
   it lands before aggregate changes.
3. `TASK-551-03-L03` consumes L01 and the baseline budgets for aggregate,
   webhook and solution-kit batching. `seoService.ts` and
   `importExportService.ts` remain exclusively TASK-551-09-owned.

L02 and L03 may not land in parallel. Each leaf reads the current source before
editing and has sole ownership of every path in its allowlist.

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
- Keyset pages use a deterministic unique tie-breaker and return no duplicate or
  missing record across equal-sort-value page boundaries.
- Representative large-fixture list endpoints execute at most 3 SQL statements;
  aggregate dashboards execute at most 8 and never grow with row count.
- Bulk operations use bounded chunks of at most 500 rows/parameters within the
  PostgreSQL bind limit and keep all-or-nothing semantics where promised.
- Booking writes map the already-landed named exclusion/check constraints and
  retain the service-level advisory lock for deterministic conflict UX.
- Touched legacy modules above 1,000 physical lines are cohesively split first;
  every resulting human-authored production/test file is at most 1,000 lines.

## Validation Rollup

Each leaf runs its targeted tests plus `bun --cwd core lint:types` and
`bun --cwd core lint`. After L03, run the exact DB integration/performance suites
listed in the leaves and `bun run gates:coderso:perf`. Shared documentation and
the single changelog entry remain owned by TASK-551-10-L02.
