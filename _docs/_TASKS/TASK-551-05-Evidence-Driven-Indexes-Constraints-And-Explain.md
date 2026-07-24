# TASK-551-05: Evidence-Driven Indexes, Constraints, and EXPLAIN
# FileName: TASK-551-05-Evidence-Driven-Indexes-Constraints-And-Explain.md

**Parent Task:** TASK-551
**Priority:** Critical
**Category:** Database / Migration / Performance / Integrity
**Estimated Effort:** Large
**Dependencies:** TASK-551-02 complete; TASK-551 external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Objective

Split the oversized schema by cohesive domain, own the realizable canonical
search vectors, add the cache invalidation outbox schema required later by
TASK-551-08, and add only indexes/database constraints justified by the frozen
query inventory and sanitized plans. Prove read gains, bounded write cost,
constraint behavior, and clean/prior migration paths without rewriting service
queries owned by other subtasks.

## Leaves and Strict Land Order

1. `TASK-551-05-L01` is the sole TASK-551 schema/migration writer. It splits
   schema first, preserves all exports/DDL, then adds canonical local search
   vectors/indexes, the cache-invalidation-outbox table/export, and selected
   query indexes/constraints in one generated next-free migration triple.
2. `TASK-551-05-L02` runs sanitized before/after plan and concurrency evidence
   against L01; it owns no production schema, migration, or service code.

L02 cannot start until L01 migration-from-clean and migration-from-prior pass.
No unused index may be removed from polluted cumulative statistics alone;
removal requires a separately observed, representative interval and explicit
rollback evidence.

## Migration and Collision Guard

- The parent external dispatch gate covers TASK-511, TASK-493, TASK-517, and
  TASK-518 before any product leaf starts. Terminal is the default; only its
  fresh exact all-path serialized handoff may substitute. L01 then re-reads the
  final schema bytes plus the live journal/directory, allocates exactly one next-free
  migration SQL and matching snapshot, and abort on concurrent allocation. The
  selected triple is immutable; never renumber/overwrite another owner.
- TASK-551-05 owns every TASK-551 schema and migration change. TASK-551-04
  consumes the generated vector columns read-only; TASK-551-08 consumes the
  already-landed outbox schema/export read-only and owns only outbox services.
- TASK-511 backup behavior, TASK-517 entry/public-site logic, TASK-493 GSC
  behavior, TASK-518 role behavior, all query/cache implementations, and
  task/changelog/workflow files are forbidden. Moving terminal table
  declarations unchanged into cohesive schema modules is explicitly permitted.

## Selected-Change Gate

For each candidate, the leaf records inventory ID, exact predicate/join/order,
baseline plan, estimated table growth, chosen ordered columns/predicate,
constraint/index name, write/storage cost, rollout lock risk, and rollback. Only
candidates with plan or integrity evidence land. Required schema families are
the seven local-table search-vector contracts, cache invalidation outbox,
keyset-list composites, reverse-FK/cutoff indexes, revision parent/version
uniqueness, and non-overlapping active booking windows.

## Shared Acceptance

- `core/db/schema.ts` becomes a stable re-export barrel and every resulting
  human-authored schema/test module is at most 1,000 physical lines.
- Migration-from-clean and migration-from-prior produce equivalent schema;
  Drizzle snapshot/journal are complete and generated through repo tooling.
- Search vectors are local and realizable: pages, entries, posts, media, users,
  assistant docs (`title` + `keywords_json`) and assistant chunks (`heading` +
  `content`). Assistant retrieval joins/rank-merges docs and chunks later; no
  generated expression reaches across tables.
- `cache_invalidation_outbox` is exported from the stable schema surface with
  its named state checks and pending/claim/processed indexes before 08 begins.
- Every selected hot large-fixture plan meets its TASK-551-01 rows/latency
  budget and uses the intended index without planner forcing.
- Concurrent integrity tests prove no duplicate revision versions or overlapping
  active resource bookings. TASK-551-03 maps the booking constraint after this
  child lands; TASK-551-06 and the explicit TASK-551-09 entry/post handoff map
  revision constraints in their owning services.
- Representative write p95 regression is at most 20% and storage growth is
  reported per index; worse candidates require explicit tradeoff approval.

## Validation Rollup

Run both leaves' exact DB/migration/performance suites, a fresh `bun run
db:generate` zero-drift check, `bun run gates:coderso:perf`, `bun --cwd core
lint:types`, and `bun --cwd core lint`. TASK-551-10-L02 owns shared docs and
changelog 1263.
