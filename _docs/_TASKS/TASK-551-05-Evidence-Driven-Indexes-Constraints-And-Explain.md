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

## Overview

Split the oversized schema by cohesive domain, own the realizable canonical
search vectors, add the cache invalidation outbox schema required later by
TASK-551-08, and add only indexes/database constraints justified by the frozen
query inventory and sanitized plans. Prove read gains, bounded write cost,
constraint behavior, generated-expression immutability, and clean/prior/
rollback/forward migration paths without rewriting service queries owned by
other subtasks.

## Sub-Tasks

1. `TASK-551-05-L01` is the sole TASK-551 schema/migration writer. It splits
   schema first, preserves all exports/DDL, then adds canonical local search
   vectors/indexes, the cache-invalidation-outbox table/export, and selected
   query indexes/constraints in one generated next-free migration triple plus
   its mandatory non-transactional online-index companion and resumable tool.
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
  final schema bytes plus the live journal/directory, allocates exactly one next-
  free migration SQL, matching snapshot/journal entry, and same-number online-
  index companion, and aborts on concurrent allocation. The selected set is
  immutable; never renumber/overwrite another owner.
- TASK-551-05 owns every TASK-551 schema and migration change. TASK-551-04
  consumes the generated vector columns read-only; TASK-551-08 consumes the
  already-landed outbox schema/export read-only and owns only outbox services.
- The installed Drizzle DSL cannot represent the booking GiST exclusion
  constraint. L01 therefore owns the sole explicit custom-migration seam: an
  exported, deeply immutable `BOOKING_RESERVATION_EXCLUSION_SQL` descriptor and
  its exact extension/add/drop SQL. The same migration applies it; no other
  TASK-551 leaf may write or approximate that object.
- TASK-511 backup behavior, TASK-517 entry/public-site logic, TASK-493 GSC
  behavior, TASK-518 role behavior, all query/cache implementations, and
  task/changelog/workflow files are forbidden. Moving terminal table
  declarations unchanged into cohesive schema modules is explicitly permitted.

## Selected-Change Gate

For each candidate, the leaf records inventory ID, exact predicate/join/order,
baseline plan, estimated table growth, chosen ordered columns/predicate,
constraint/index name, write/storage cost, rollout lock risk, and rollback. Only
candidates with plan or integrity evidence land. Required schema families are
the seven local-table search-vector contracts, cache invalidation outbox
(including the all-unprocessed oldest-age partial index),
keyset-list composites, page-author and role-leading traversals, exact post/media
JSON-containment GIN indexes, reverse-FK/cutoff indexes, revision parent/version
uniqueness, and non-overlapping active booking windows.
L01's literal vector expressions and closed mandatory catalog are authoritative:
every name, table, ordered column/direction, partial predicate, outbox column/
default/check, and constraint definition is declared there. L02 must compare the
live catalog to that exact set; “similar” expressions or extra TASK-551 objects
fail rather than becoming an undocumented selection.

L01's four locked deployment phases are part of this selected-change gate:
read-only classification/preflight; drained transactional expand/integrity;
sequential autocommit `CREATE [UNIQUE] INDEX CONCURRENTLY` with a mandatory
drained `revision-integrity` group before application resume; and exact catalog/
readiness admission. The three missing revision unique indexes are the first
immutable members and all affected current `max(version)+1` writers remain
rejected before SQL until those members are durably ready/valid. Only then may
the old application resume and the remaining read-performance group build under
concurrent writes. The 100,000-row/256-MiB per-table and 1-GiB combined small
classification, 2.5x free-disk minimum, 5-second lag, 30-second oldest-
transaction, 2-second lock timeout, 30/300-second statement, 120/900-second
transactional phase, 30-minute per-index, and 2-hour online-phase ceilings are
mandatory. Snapshot/manifest/live-catalog parity, durable crash/resume receipts,
pre-cutover reverse recovery, drained writer-probe/no-resume-window evidence,
post-barrier 50-way revision races, and 16-writer read-index build safety are blocking
evidence; no implementer-selected generic fallback or future online phase exists.

The five trigram candidates are pinned end-to-end: pages, content entries,
posts, media, and users each use a stored `search_trigram_text` column plus the
exact `*_search_trigram_idx` GIN/`gin_trgm_ops` name defined in L01. Each column
and index lands atomically only when L01's pre-DDL frozen-plan/write evidence
selects it. L02 independently verifies every selected member; a failure returns
to L01 contract remediation and blocks TASK-551-04 rather than silently changing
the set. The exported closed contract records selected versus `null` for all five
sources; TASK-551-04 may run fallback only for a selected, L02-verified member.
Every search source concatenation is the exact immutable-compatible
`coalesce(...) || ' ' || ...` literal declared by L01. Schema renders, query
normalization, migration bytes, and snapshot expressions must agree exactly;
catalog tests resolve the closed function/operator dependency set through
`pg_proc` and require `provolatile = 'i'` for every member.

## Shared Acceptance

- `core/db/schema.ts` becomes a stable re-export barrel and every resulting
  human-authored schema/test module is at most 1,000 physical lines.
- Migration-from-clean and migration-from-prior produce equivalent schema;
  rollback then forward-reapply also succeeds. Drizzle snapshot/journal are
  complete for every representable object and generated through repo tooling.
  The only tested limitation is the exclusion constraint: its exported
  descriptor, exact custom migration fragment, live `pg_constraint` receipt,
  and no-drop generation guard collectively represent it.
- Every new snapshot-owned index is absent from transactional DDL and created by
  the same-number companion as top-level `CREATE [UNIQUE] INDEX CONCURRENTLY`.
  Interrupted apply/rollback resumes idempotently; every admitted index is ready,
  valid, byte-identical to the manifest, and within L01's numeric ceilings.
- Page author traversal uses `(author_id,updated_at DESC,id DESC)`, reverse role
  lookup uses `(role_id,user_id)`, and post/media tags use their exact
  `jsonb_path_ops` GIN indexes with parameterized `@>` predicates. Small/large
  fixture plans and separate write/storage deltas own the evidence for all four.
- Search vectors are local and realizable: pages, entries, posts, media, users,
  assistant docs (`title` + `keywords_json`) and assistant chunks (`heading` +
  `content`). Assistant retrieval joins/rank-merges docs and chunks later; no
  generated expression reaches across tables.
- `cache_invalidation_outbox` is exported from the stable schema surface with
  its named state checks, pending/claim/processed indexes, and exact
  `cache_outbox_unprocessed_age_idx(created_at,id) WHERE processed_at IS NULL`
  before 08 begins. Its oldest-age plan includes claimed and backed-off rows,
  not only currently claimable work.
- Every selected hot large-fixture plan meets its TASK-551-01 rows/latency
  budget and uses the intended index without planner forcing.
- Concurrent integrity tests prove no duplicate revision versions or overlapping
  active resource bookings. TASK-551-03 maps the booking constraint after this
  child lands; TASK-551-06 and the explicit TASK-551-09 entry/post handoff map
  revision constraints in their owning services.
- Deployment tests prove affected revision writers remain drained until all
  three new unique indexes are ready/valid; there is no intermediate resume
  window, including after every crash/resume point.
- Representative write p95 regression is at most 20% and storage growth is
  reported per index; worse candidates require explicit tradeoff approval.

## Testing Requirements

Run both leaves' exact DB/migration/performance suites, a fresh `bun run
db:generate` zero-drift check, `bun run gates:coderso:perf`, `bun --cwd core
lint:types`, and `bun --cwd core lint`. Catalog/plan tests require byte-equivalent
trigram normalization, exact schema/query/migration expression bytes, immutable
`pg_proc` dependencies, exact column/index/opclass identity, conditional-
fallback selection-receipt coverage, and the custom exclusion descriptor/
migration/snapshot-limit/live-catalog/no-drop contract.
The gate also runs L01's online-deployment suite/tool and verifies exact snapshot/
manifest/live-catalog parity, numeric phase budgets, crash/resume, reverse
recovery, the drained revision-integrity barrier/no-resume window, immediate
post-barrier 50-way revision races, and concurrent-writer behavior for every
later read-performance member. Plan/write evidence names the page-author,
role-leading, post-tag, media-tag, and all-unprocessed outbox-age indexes
explicitly. The outbox fixture/plan/write test covers insert, claim, retry, and
completion updates and rejects availability/claim narrowing.

## Documentation Updates Required

No shared docs are edited here. Supply the schema split, migration, exact FTS/
trigram contracts, selection receipt, constraints, plans, write/storage cost,
and recovery handoff to TASK-551-10-L02, which owns shared docs and changelog
1263.
