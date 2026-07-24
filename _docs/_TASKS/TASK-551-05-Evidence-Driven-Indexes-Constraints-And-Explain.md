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
keyset-list composites, page/entry/post-author and role-leading traversals, exact
post/media/webhook JSON-containment GIN indexes, webhook parent-list indexes,
reverse-FK/cutoff indexes, revision parent/version
uniqueness, and non-overlapping active booking windows.
L01's literal vector expressions and closed mandatory catalog are authoritative:
every name, table, ordered column/direction, partial predicate, outbox column/
default/check, and constraint definition is declared there. L02 must compare the
live catalog to that exact set; “similar” expressions or extra TASK-551 objects
fail rather than becoming an undocumented selection.

Candidate prioritization first consumes L02's named
`task551-predecision-clean` `pg_stat_statements` interval. It uses only
registry/role-proven `application` deltas; migration, maintenance,
external-diagnostic and unknown traffic are separate and ineligible. The known
whole-row/cross-table and `access_logs` text-regex diagnostic sample cannot
justify an index. No shared statistics reset is permitted, and diagnostics must
be followed by a new clean interval.

L01's one version-2 rollout orchestrator is part of this selected-change gate.
It reserves one physical postgres-js connection, constructs Drizzle over that
reserved handle, and invokes the installed migrator only after setting strict
session GUCs for the bounded canonical v2 receipt, operation UUID, and receipt
SHA-256. Static migration SQL revalidates all three and inserts/marks the receipt
inside Drizzle's own transaction; GUCs are cleared and the lease released in
`finally`. The remaining phases are:
artifact/preflight classification; nonce-bound external adapter or cold offline-
single admission drain plus live `pg_stat_activity` proof; guarded transactional
expand; ordered autocommit `CREATE [UNIQUE] INDEX CONCURRENTLY`; and exact catalog
readiness. Generic/startup migration cannot execute this guarded artifact. The
three missing revision unique indexes are the first immutable group and every old
`max(version)+1` binary remains rejected before SQL until they are durably ready/
valid. External mode may then resume only the digest-pinned compatible TASK-551
binary whose release receipt proves the race-safe allocator/conflict mapping;
the old binary never resumes. Remaining read-performance members build with that
binary's traffic and the write gate. Offline-single remains cold until final
catalog. The 100,000-row/256-MiB per-table and 1-GiB combined small
classification, 2.5x free-disk minimum, 5-second lag, 30-second oldest-
transaction, 2-second lock timeout, 30/300-second statement, 120/900-second
transactional phase, 30-minute per-index, and 2-hour online-phase ceilings are
mandatory. Snapshot/manifest/live-catalog parity, DB+filesystem CAS receipts,
adapter/identity/activity visibility, crash/resume at every state, pre-cutover
reverse recovery, no-old-binary window, rehearsal 50-way revision races, and
16-writer read-index build safety are blocking evidence. The first external new-
binary acknowledgement permanently makes rollback forward-fix only.

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
- Page/entry/post author traversal uses the exact leading-author composites;
  typed entry author uses `(type_id,author_id,updated_at DESC,id DESC)`, reverse
  role lookup uses `(role_id,user_id)`, and post/media/webhook containment uses
  exact `jsonb_path_ops` GIN indexes with parameterized `@>`. Small/large fixture
  plans and separate write/storage deltas own every member.
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
- All 37 static plan IDs are closed: 32 future TASK-551-03-L02 page/list/fixed-
  summary/facet shapes and five preserved non-Admin statements. Every ID owns
  finite numeric small/large receipts; later production Admin SQL is byte-equal
  to its pre-land shape.
- Concurrent integrity tests prove no duplicate revision versions or overlapping
  active resource bookings. TASK-551-03 maps the booking constraint after this
  child lands; TASK-551-06 and the explicit TASK-551-09 entry/post handoff map
  revision constraints in their owning services.
- Deployment tests prove old revision writers remain drained until all three new
  unique indexes are ready/valid and are never resumed. External mode admits only
  the compatible TASK-551 binary after that barrier; offline mode admits none
  until final catalog. Every crash/resume point preserves that distinction.
- Representative write p95 regression is at most 20% and storage growth is
  reported per index; worse candidates require explicit tradeoff approval.
- A different session, missing/tampered/oversized receipt GUC, operation/digest
  mismatch, or replay cannot execute the guarded migration. Crash/rerun and
  pre-traffic reverse preserve one atomic receipt/journal/catalog truth.

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
recovery, exact application-name/activity drain, adapter protocol, the drained
revision-integrity barrier/no-old-binary window, rehearsal 50-way revision races,
and compatible-binary concurrent-writer behavior for every later read-performance
member. Plan/write evidence names every page/entry/post-author, role-leading,
post/media/webhook containment/list, and all-unprocessed outbox-age index
explicitly. The outbox fixture/plan/write test covers insert, claim, retry, and
completion updates and rejects availability/claim narrowing.

## Documentation Updates Required

No shared docs are edited here. Supply the schema split, migration, exact FTS/
trigram contracts, selection receipt, constraints, plans, write/storage cost,
and recovery handoff to TASK-551-10-L02, which owns shared docs and changelog
1263.
