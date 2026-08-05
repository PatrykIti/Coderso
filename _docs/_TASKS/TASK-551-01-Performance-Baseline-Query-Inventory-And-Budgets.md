# TASK-551-01: Performance Baseline, Query Inventory, and Budgets
# FileName: TASK-551-01-Performance-Baseline-Query-Inventory-And-Budgets.md

**Parent Task:** TASK-551
**Priority:** High
**Category:** Database / Performance / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-551 external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Own a two-phase machine-readable inventory of production database callers,
their single-writer ownership, and reproducible small/large performance budgets.
The initial phase freezes the current exact set plus an explicit planned-delta
manifest before implementation. The same L01 leaf is re-dispatched after
TASK-551-09 to replace that manifest with a fresh final exact-set receipt before
TASK-551-10-L01. Evidence is sanitized and may not contain SQL bind values,
secrets, raw PII, or customer payloads.

## Locked Deliverables

- Every direct and dynamically loaded production DB caller receives one query
  classification, cardinality/projection/order contract, owner leaf, and
  terminal disposition.
- The initial receipt records the exact current set and every approved planned
  caller delta by owning leaf. The final receipt permits no unresolved planned
  delta and proves exact coverage of the post-TASK-551-09 tree.
- The initial planned set is closed at 34 records: 32 individually identified
  TASK-551-03-L02 page/list/fixed-summary/facet statements plus the existing
  outbox-age and public-HTML-dependency records. Every record has its future
  file/symbol, statement class, result/work bound, fixture-budget ID,
  fingerprint key, and sole owner. The 32 Admin shapes are defined once in
  L02's test-only statement-shape registry, consumed by TASK-551-05-L02, and
  compared byte-for-byte with the later production SQL after TASK-551-03-L02.
- Small and large fixture profiles are deterministic, uniquely scoped, and
  clean up only owned rows. L02 pins every physical target/support table,
  per-profile row count, status/time/FK distribution, pool capacity, warmup and
  sample/repetition count, and the exact variance/runner normalization formula;
  every gated inventory ID names one of those frozen scenarios. Submission and
  booking summary clocks use L02's explicit `asOf`-relative exceptions rather
  than the general January 1 fixture timestamps. Later work never rediscovers or
  resizes them.
- L02 also owns exact evidence fixtures for page/entry/typed-entry/post-author
  traversal, role-leading user lookup, one-tag post, multi-tag media AND, webhook
  event containment, and the 128-tuple public-HTML dependency aggregate. Their
  literal selectivities/bind shapes feed TASK-551-05/09 plans; later leaves may
  not substitute a friendlier distribution.
- Every append-heavy family in TASK-551-06 has a literal retention-clock fixture.
  This includes password resets, both preview-token tables, assistant ingest,
  form-action children, and solution-kit run/items with exact boundary/anchor/
  child-first counts plus 499/500/501/2,000/2,001 batch edges.
- Initial L01 owns exactly 34 planned callers. Thirty-two are the complete
  `TASK551_ADMIN_READ_STATEMENT_SHAPES` set enumerated in L01/L02; the other two
  remain the outbox `readOldestUnprocessedAge` point read (bound 1,
  TASK-551-08-L02) and
  `publicContentVisibilityGateRead.ts#validatePublicHtmlDependencies` (one
  aggregate result over at most 128 tuples/16,384 canonical bytes and a
  `<= 100 + 1` root list, TASK-551-09-L01). The former receives its later
  TASK-551-05 fixture; L02 baselines the latter. Final L01 must discover each
  landed caller or record the reviewed removal allowed only for the public-HTML
  dependency record, then remove every planned record. No 03-L02 planned record
  may disappear merely because several statements share one service operation
  or transaction.
- Query-count, rows-read/returned, p50/p95/p99, and pool-acquisition-wait
  budgets are checked-in finite numeric release-gate inputs before TASK-551-02.
  L02's deterministic formula is used only for the initial reviewed freeze;
  normal checks never recompute ceilings. L02 measures acquisition wait
  independently by timing contention for an explicitly reserved connection; it
  does not depend on TASK-551-02 telemetry. Later leaves may tighten but not
  silently weaken these budgets.

## Single-Writer Ownership and Collision Guards

| Leaf | Exact allowlist |
|---|---|
| TASK-551-01-L01 | `scripts/task-551-query-inventory.ts`; `tests/perf/fixtures/task551QueryInventory.ts`; `tests/perf/database-query-inventory.test.ts`; `tests/integration/server/task551BunLaneMembership.test.ts` |
| TASK-551-01-L02 | `scripts/task-551-database-baseline.ts`; `tests/perf/fixtures/task551DatabaseScale.ts`; `tests/perf/fixtures/task551DatabaseBudgets.ts`; `tests/perf/fixtures/task551AdminReadStatementShapes.ts`; `tests/perf/database-query-baseline.test.ts` |

Both leaves forbid edits to production source, `core/db/migrations/**`,
`core/db/migrations/meta/**`, `_docs/_TASKS/**`, `_docs/_CHANGELOG/**`, and
`_docs/_workflows/**`. They inventory but do not edit TASK-511 backup paths,
TASK-517 entry/public paths, TASK-493 SEO-indexing paths, or TASK-518 migration
artifacts.
Later leaves consume but never edit the inventory, manifest, or receipt. Only
TASK-551-01-L01 may refresh those artifacts when orchestration re-dispatches the
same leaf for its final phase.

## Sub-Tasks

- [ ] **TASK-551-01-L01** — Production query inventory and ownership matrix.
- [ ] **TASK-551-01-L02** — Small/large fixtures, baselines, and frozen budgets.

## Land Order

Initial L01 → L02 → TASK-551-02..09 → final L01 refresh → TASK-551-10-L01.
TASK-551-02 cannot start until the initial L01/L02 gates pass, the current caller
set is exact, and every planned delta has one future leaf owner. TASK-551-10-L01
cannot start until final L01 removes all planned deltas and emits a fresh exact-
set receipt for the validated post-TASK-551-09 working tree.
After its initial receipt, L01 and this umbrella remain `🚧 In Progress`; L02 may
close and the receipt—not a false parent completion—unblocks TASK-551-02. Final
L01 marks itself and this umbrella `✅ Done` only after the final receipt passes.
The parent external dispatch gate must pass before L01 edits tooling/tests; its
default is terminal TASK-511/TASK-493/TASK-517/TASK-518, with only the parent's
fresh exact all-path serialized-handoff audit accepted as a substitute.

## Security Contract

- **Visibility:** no route or endpoint changes.
- **Auth/RBAC/CSRF/rate limits:** unchanged; fixtures call existing protected
  paths only through their current auth contracts.
- **Validation:** inventory and budget files use strict reject-unknown parsing
  and bounded counts/durations.
- **Secrets/privacy:** statement fingerprints only; no binds, credentials, raw
  URLs, cookies, tokens, PII, or production row bodies.
- **Anti-abuse:** no public write surface is added.

## Testing Requirements

- `bun test tests/perf/database-query-inventory.test.ts`
- `bun test tests/integration/server/task551BunLaneMembership.test.ts`
- `bun scripts/task-551-query-inventory.ts --check --phase initial`
- After TASK-551-09: `bun scripts/task-551-query-inventory.ts --check --phase final`
- `set -a && source .env && set +a && bun test tests/perf/database-query-baseline.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso:perf`

## Documentation Updates Required

No shared docs are edited here. L01/L02 produce bounded test artifacts; final
L01 hands its exact-set receipt to TASK-551-10-L01 and the receipt summary to
TASK-551-10-L02 for `_docs/DATABASE_PERFORMANCE.md` and changelog 1263.

## Acceptance Criteria

- Initial and final scans cover 100% of their discovered production DB callers;
  the final receipt has zero unresolved planned deltas and exactly one owner/
  disposition per caller.
- Status transitions preserve the two-phase gate: neither L01 nor this umbrella
  is marked done between the initial receipt and the post-09 final refresh.
- Both scale profiles match L02's exact row-count matrix and publish checked-in
  numeric budgets with its fixed sampling, variance, hardware-context, and
  calibration-normalization contract.
- No evidence artifact contains a forbidden secret/PII field or raw bind value.
- Initial receipt counts are exactly `planned=34`, `adminReadPlanned=32`, and
  `legacyPlanned=2`; final counts are all zero. The 32 Admin IDs have exact
  statement-shape and numeric small/large budget coverage before 05 dispatch.
