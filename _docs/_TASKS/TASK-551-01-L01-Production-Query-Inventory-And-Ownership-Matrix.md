# TASK-551-01-L01: Production Query Inventory and Ownership Matrix
# FileName: TASK-551-01-L01-Production-Query-Inventory-And-Ownership-Matrix.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-01
**Priority:** High
**Category:** Database / Performance / Tooling
**Estimated Effort:** Small
**Dependencies:** TASK-551 external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Create a deterministic scanner plus reviewed inventory that covers direct
Drizzle calls, transaction executors, raw SQL, and dynamic DB imports in
production `core/**`. Generated migrations and tests are inputs, not production
caller records.

## File Ownership

**Allowlist:** `scripts/task-551-query-inventory.ts`,
`tests/perf/fixtures/task551QueryInventory.ts`, and
`tests/perf/database-query-inventory.test.ts` only.

**Forbidden:** every production module; all migration/meta files; TASK-511
`core/services/backups/**`; TASK-517 `entryService.ts`/`publicSite.tsx`;
TASK-493 SEO/GSC source; TASK-518 files; all task/changelog/workflow files.

## Inventory Contract

Each record contains stable `id`, file, symbol/line anchor, caller, query class,
projection sensitivity, filters/joins/order, maximum cardinality, query-count
budget, cache/freshness eligibility, transaction/constraint owner, assigned
TASK-551 leaf, and `optimize | preserve-bounded | external-handoff` disposition.
The scanner fails on duplicate IDs, missing owners, unknown fields, or a newly
discovered caller absent from the reviewed fixture.

## Implementation Pseudocode

```ts
type QueryInventoryRecord = StrictReadonly<{
  id: string;
  source: { file: string; symbol: string };
  kind: "point" | "list" | "search" | "aggregate" | "mutation" | "append" | "maintenance";
  bound: number | "stream" | "missing";
  owner: `TASK-551-${string}` | `TASK-${number}`;
  disposition: "optimize" | "preserve-bounded" | "external-handoff";
}>;

async function scanProductionDbCallers(root: string): Promise<DiscoveredCaller[]> {
  // Parse bounded core source set; detect db/tx executor calls and dynamic imports.
}

const discovered = await scanProductionDbCallers("core");
assertExactCoverage(discovered, TASK551_QUERY_INVENTORY);
assertSingleWriterOwnership(TASK551_QUERY_INVENTORY);
```

Errors are stable (`query_inventory_invalid`, `query_inventory_unowned`,
`query_inventory_writer_conflict`) and print file/symbol only, never SQL binds.

## Regression-Test Shape

- Fixture covers every currently discovered caller and all seven query classes.
- Add synthetic duplicate-owner, unknown-field, missing-bound, and missing-caller
  cases; each must fail deterministically.
- Pin handoffs for TASK-511, TASK-517, TASK-493, and TASK-518.
- Assert no inventory string matches credential/URL/token/email patterns.

## Security Contract

- No API route; internal tooling only.
- Auth, RBAC, CSRF, rate-limit, nonce/HMAC, and CAPTCHA contracts are unchanged.
- Strict reject-unknown inventory schema; bounded source roots; no arbitrary
  paths supplied by HTTP.
- Store statement families and source anchors only; never bind values or data.

## Validation Commands

- `bun test tests/perf/database-query-inventory.test.ts`
- `bun scripts/task-551-query-inventory.ts --check`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `git diff --check`

## Documentation Updates Required

No shared docs. TASK-551-10-L02 consumes the reviewed matrix summary.

## Quantified Acceptance

- Scanner/inventory set equality is 100%; missing and extra callers both fail.
- Every record has exactly one writer and one terminal disposition.
- Runtime is under 10 seconds on the repository source tree and produces zero
  secret/PII findings in its own redaction guard.
