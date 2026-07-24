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
caller records. This leaf runs twice under the same single-writer ownership:
initially before TASK-551-02, then as a fresh final re-dispatch after TASK-551-09
and before TASK-551-10-L01.

## Sub-Tasks

None; this is an executable leaf with initial and final dispatch phases.

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
An optimized caller selected for TASK-551-02 telemetry also owns one closed
`telemetryFingerprint` identifier; raw or normalized SQL is never that value.
The initial scan requires exact coverage of every currently discovered caller
and permits only explicit `plannedDelta` records for production callers that a
named TASK-551-02..09 leaf will add. A planned delta includes the future file,
symbol contract, query class, bound, and sole owner but is not counted as a
currently discovered caller. The final scan is run from the validated post-09
tree, rejects every remaining planned delta, and requires exact discovered/
fixture equality. Later leaves never edit these artifacts; orchestration
re-dispatches this same leaf as their sole writer.

`tests/perf/fixtures/task551QueryInventory.ts` exports both the reviewed records
and a `TASK551_QUERY_INVENTORY_RECEIPT` containing `phase`, sanitized source-tree
digest, discovered/owned/planned counts, and validation timestamp. The initial
receipt is the implementation handoff. The final receipt replaces it and is the
mandatory immutable input to TASK-551-10-L01. It contains no diff bodies, SQL,
binds, environment values, or customer data.

## Implementation Pseudocode

```ts
type QueryInventoryRecord = StrictReadonly<{
  id: string;
  source: { file: string; symbol: string };
  kind: "point" | "list" | "search" | "aggregate" | "mutation" | "append" | "maintenance";
  bound: number | "stream" | "missing";
  telemetryFingerprint?: QueryFingerprint;
  owner: `TASK-551-${string}` | `TASK-${number}`;
  disposition: "optimize" | "preserve-bounded" | "external-handoff";
}>;

type QueryInventoryReceipt = StrictReadonly<{
  phase: "initial" | "final";
  sourceTreeDigest: string;
  discoveredCount: number;
  ownedCount: number;
  plannedDeltaCount: number;
  validatedAt: string;
}>;

async function scanProductionDbCallers(root: string): Promise<DiscoveredCaller[]> {
  // Parse bounded core source set; detect db/tx executor calls and dynamic imports.
}

const phase = parseInventoryPhase(process.argv); // strict initial | final
const discovered = await scanProductionDbCallers("core");
assertExactCurrentCoverage(discovered, TASK551_QUERY_INVENTORY);
assertSingleWriterOwnership(TASK551_QUERY_INVENTORY);
if (phase === "initial") assertEveryPlannedDeltaHasOneFutureOwner(PLANNED_QUERY_DELTAS);
if (phase === "final") assertNoPlannedDeltasRemain(PLANNED_QUERY_DELTAS);
writeOrVerifySanitizedReceipt({ phase, discovered });
```

Errors are stable (`query_inventory_invalid`, `query_inventory_unowned`,
`query_inventory_writer_conflict`, `query_inventory_phase_invalid`,
`query_inventory_planned_delta_unresolved`, and
`query_inventory_final_receipt_missing`) and print file/symbol only, never SQL
binds or environment values.

## Testing Requirements

- Initial fixture covers every currently discovered caller and all seven query
  classes while accepting only schema-valid, single-owner planned deltas.
- Simulate post-09 callers: an extra discovered caller fails until the same L01
  refreshes the reviewed record; final phase fails with any planned delta, stale
  digest, count mismatch, or absent final receipt.
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
- Initial dispatch: `bun scripts/task-551-query-inventory.ts --check --phase initial`
- Final post-TASK-551-09 dispatch: `bun scripts/task-551-query-inventory.ts --check --phase final`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `git diff --check`

## Documentation Updates Required

No shared docs. TASK-551-10-L01 consumes the final receipt as a read-only gate;
TASK-551-10-L02 consumes its reviewed matrix summary.

## Quantified Acceptance

- Current scanner/inventory set equality is 100% in both phases; missing and
  extra current callers fail. Final phase also has zero planned deltas and a
  fresh exact-set receipt.
- Every record has exactly one writer and one terminal disposition.
- Runtime is under 10 seconds on the repository source tree and produces zero
  secret/PII findings in its own redaction guard.
