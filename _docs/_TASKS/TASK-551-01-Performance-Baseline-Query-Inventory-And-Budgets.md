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

Freeze a complete machine-readable inventory of production database callers,
their single-writer ownership, and reproducible small/large performance budgets
before any query, schema, pool, or cache implementation begins. Evidence is
sanitized and may not contain SQL bind values, secrets, raw PII, or customer
payloads.

## Locked Deliverables

- Every direct and dynamically loaded production DB caller receives one query
  classification, cardinality/projection/order contract, owner leaf, and
  terminal disposition.
- Small and large fixture profiles are deterministic, uniquely scoped, and
  clean up only owned rows.
- Query-count, rows-read/returned, p50/p95/p99, and pool-acquisition-wait
  budgets are frozen as release-gate inputs. L02 measures acquisition wait
  independently by timing contention for an explicitly reserved connection; it
  does not depend on TASK-551-02 telemetry. Later leaves may tighten but not
  silently weaken these budgets.

## Single-Writer Ownership and Collision Guards

| Leaf | Exact allowlist |
|---|---|
| TASK-551-01-L01 | `scripts/task-551-query-inventory.ts`; `tests/perf/fixtures/task551QueryInventory.ts`; `tests/perf/database-query-inventory.test.ts` |
| TASK-551-01-L02 | `scripts/task-551-database-baseline.ts`; `tests/perf/fixtures/task551DatabaseScale.ts`; `tests/perf/fixtures/task551DatabaseBudgets.ts`; `tests/perf/database-query-baseline.test.ts` |

Both leaves forbid edits to production source, `core/db/migrations/**`,
`core/db/migrations/meta/**`, `_docs/_TASKS/**`, `_docs/_CHANGELOG/**`, and
`_docs/_workflows/**`. They inventory but do not edit TASK-511 backup paths,
TASK-517 entry/public paths, TASK-493 SEO-indexing paths, or TASK-518 migration
artifacts.

## Sub-Tasks

- [ ] **TASK-551-01-L01** — Production query inventory and ownership matrix.
- [ ] **TASK-551-01-L02** — Small/large fixtures, baselines, and frozen budgets.

## Land Order

L01 → L02. TASK-551-02 cannot start until both leaves pass and the ownership
matrix has no duplicate source writers or unassigned production caller.
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
- `set -a && source .env && set +a && bun test tests/perf/database-query-baseline.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso:perf`

## Documentation Updates Required

No shared docs are edited here. L01/L02 produce bounded test artifacts consumed
by TASK-551-10-L02 when it authors `_docs/DATABASE_PERFORMANCE.md` and changelog
1263.

## Acceptance Criteria

- 100% of discovered production DB callers have exactly one owner/disposition.
- Both scale profiles run from a clean scoped fixture namespace and publish
  reproducible budgets with variance policy and hardware/context metadata.
- No evidence artifact contains a forbidden secret/PII field or raw bind value.
