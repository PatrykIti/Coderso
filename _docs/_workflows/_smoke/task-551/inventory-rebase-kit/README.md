# TASK-551 query-inventory rebase kit (deferred consolidated rebaseline)

State at 2026-09-06 (06-L01 admission): fixture tests/perf/fixtures/task551QueryInventory.ts
is stale by leaf 06-L01's landed call sites: 1150 rows vs 1207 discovered
(1143 kept + 64 new - 7 stale). Inventory test red: 22 pass / 1 fail
(literal toHaveLength(1150) at tests/perf/database-query-inventory.test.ts:109-110).

WHY DEFERRED (orchestrator decision, receipt impl-06-l01.json):
- 64 new rows need 17 review-owned fields each (kind, transactionMode,
  constraintOwner, disposition, owner letter); the frozen codebook (A-G) has no
  06-L01 letter; fixture header forbids inference. Authoring that review data is
  an amendment of 01-lane reviewed evidence, not a mechanical regen (R5 precedent
  covered line-cell moves only).
- Later leaves (07-L01/L02 cache, 03-L02/L03, 09-x) will add call sites too -
  a single consolidated rebaseline at the spine tail (alongside 01-L01:final's
  manifest regeneration) avoids repeating the amendment.

COMPLETION PATH (resume kit in this directory, machine-validated 1150/1150
byte-exact re-serialization before the leaf landed):
1. Author new-row-classifications.json for the 64 rows in new-rows.scanned.json
   (scanner fields only - zero inference; kind/disposition/owner are review calls;
   budgetId/fingerprint numbering continues mechanically current-N 1151-1214).
2. bun --env-file=/dev/null .tmp-restored/regen-inventory.ts --authorize-drops --write
   (stale-rows.json lists the 7 rows whose call sites 06-L01 re-shaped:
   actionExecutionStore save/insert/select -> transaction;
   searchHistoryService pruneHistory select+delete -> deleted (moved to
   searchHistoryRetentionService.pruneSearchHistoryBatch); recordSearch
   select+insert -> transaction-wrapped).
3. Bump the two literals at database-query-inventory.test.ts:109-110 (1150 -> 1207
   plus the later leaves' delta at that time).
4. Machine-check: every kept row semantic-identical (only line cells move);
   digests recomputed via buildCanonicalReceipt.

SEPARATE PRE-EXISTING ISSUE (owner decision): scripts/task-551-query-inventory.ts
CLI fails at HEAD with query_inventory_invalid:initial-inventory-state -
the lane resolves to post-finalization (runnerLifecycle.test.ts /
reviewedPairPersistence.test.ts committed in snapshot 62438e4e) and check.ts:88
refuses before scanning. Independent of the fixture state.
