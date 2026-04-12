# TASK-170-03-03-01: Listing Query Filters Patch Executor Adapter
# FileName: TASK-170-03-03-01_Listing_Query_Filters_Patch_Executor_Adapter.md

**Priority:** High  
**Category:** Core/Assistant + Listings  
**Estimated Effort:** Medium  
**Dependencies:** TASK-170-03-03  
**Status:** Done (2026-04-12)

---

## Overview

Promote `listing-query.filters.patch` from contract-only to executable. This adapter should patch filters on an existing listing query without rewriting unrelated query configuration.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
const query = await deps.findListingQueryByName(input.listingQueryName);
const nextQuery = {
  ...query.query,
  filters: normalizeListingFilters(input.filters),
};
await deps.updateListingQuery(query.id, { query: nextQuery });
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionExecutorService.ts`
- `tests/vitest/assistant/action-plan-schema.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`

## Security Contract

- Visibility: internal only.
- Auth model: admin session.
- RBAC: `content:read` for plan/dry-run and `content:write` for execute.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: filters must be array records and unsupported top-level fields are rejected.
- Anti-abuse: no public write endpoint.
- Idempotency: repeated patch must noop when filters already match.
- Secret handling: filter metadata must not include secret-like settings or raw submission data.

## Testing Requirements

- Vitest:
  - strict schema accepts valid filter patch,
  - unknown top-level fields reject.
- Bun:
  - dry-run create/update/noop style operation for filters,
  - execute delegates to `updateListingQuery`,
  - dependency-missing behavior.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry when completed

## Acceptance Criteria

1. Existing listing query filters can be patched without rewriting other query config.
2. Re-execution noops when the filter set already matches.
3. Action uses existing listing query service.

## Completion Notes (2026-04-12)

- Promoted `listing-query.filters.patch` from contract-only to executable assistant action type.
- Added strict input normalization for `listingQueryName` and `filters`.
- Added dry-run/execute adapter logic through existing `listListingQueries` and `updateListingQuery`.
- Preserved unrelated listing query configuration while patching only `query.filters`.
- Added Vitest schema/provider/registry contract coverage and Bun executor coverage for update/noop behavior.
