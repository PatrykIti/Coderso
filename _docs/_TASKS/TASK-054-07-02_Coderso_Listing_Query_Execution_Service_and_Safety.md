# TASK-054-07-02: Coderso Listing Query Execution Service and Safety
# FileName: TASK-054-07-02_Coderso_Listing_Query_Execution_Service_and_Safety.md

**Priority:** High  
**Category:** Core/CMS + Security  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-07-01  
**Status:** To Do

---

## Goal
Implement source adapters and execution engine for listing queries with deterministic sorting/filtering and server-side safeguards.

## Files to Change
- `core/services/content/queryBuilderService.ts` (new)
- `core/services/content/listingSources.ts` (new)
- `tests/unit/content/queryBuilderService.test.ts` (new)

## Source Adapters
- `entries`: content entries with content type scoping.
- `posts`: entries adapter with post contract mapping.
- `users`: admin users summary adapter.
- `taxonomies`: taxonomy + terms adapter.

## Safety Rules
- No raw SQL fragments from client input.
- Only allowlisted fields per source.
- Clamp all limits and offsets.
- Stable fallback sort (`updatedAt desc`, `id asc`).

## Pseudocode
```ts
async function executeListingQuery(input: ListingQuery) {
  const plan = buildListingExecutionPlan(input);
  const rows = await sourceAdapters[plan.source.kind].fetch(plan);
  const filtered = applyFilters(rows, plan.filters, plan.source.fieldAllowlist);
  const sorted = applySort(filtered, plan.sort, plan.source.fieldAllowlist);
  return paginate(sorted, plan.limit, plan.offset);
}
```

## Acceptance Criteria
1. Same query input returns deterministic order.
2. Unsupported fields/operators are blocked before execution.
3. Source adapters return normalized row contract.
