# TASK-188-04: Resolver and Filtering From Policy
# FileName: TASK-188-04_Resolver_and_Filtering_From_Policy.md

**Priority:** High
**Category:** Assistant/Core + Resolver
**Estimated Effort:** Large
**Dependencies:** TASK-188-01, TASK-188-02
**Status:** Done (2026-04-19)

---

## Overview

Replace scattered resolver aliases and filter interpretation with policy-driven resolver rules.

## Sub-Tasks

No child task files.

## Acceptance Criteria

1. `cmsTargetResolver` reads resource aliases, filter aliases, and surface-only rules from policy.
2. Existing behavior from TASK-179/TASK-180/TASK-184 live tests remains green.
3. `publiczny`, `opublikowane`, `widoczne`, layout/limit and similar aliases are policy entries, not one-off code.
4. Surface-only fallback is policy-defined and not applied to real search terms.

## Files to Change

- `core/services/assistant/operationPolicy/resolverPolicy.ts` (new)
- `core/services/assistant/cmsTargetResolver.ts`
- `tests/vitest/assistant/cms-target-resolver.test.ts`
- `tests/vitest/assistant/operation-policy-resolver.test.ts`

## Pseudocode

```ts
export function normalizeTargetQueryWithPolicy({ prompt, draft, resourcePolicy }) {
  return {
    query: normalizeQuery(draft.targetQuery),
    filters: normalizeFiltersFromDraftAndPrompt(prompt, draft.filters, resourcePolicy),
  };
}

export function matchesCandidateWithPolicy(candidate, query, resourcePolicy) {
  return matchIdNameSlug(candidate, query, resourcePolicy.matching);
}

export function matchesFiltersWithPolicy(candidate, filters, resourcePolicy) {
  return filters.every((filter) => applyFilterPolicy(candidate, filter, resourcePolicy));
}
```

## Remove or Delegate

- signal arrays in `cmsTargetResolver.ts`,
- `countWords`,
- resource-specific filter branches,
- surface-only word lists,
- OR-term handling if policy owns matching config.

## Security Contract

- Visibility: internal resolver.
- Auth model: no runtime change.
- RBAC: resolver only filters authorized summaries.
- CSRF: no route change.
- Rate-limit bucket: no route change.
- Reject-unknown validation: unknown filters fail closed.
- Anti-abuse: destructive target count safeguards remain.
- Secret handling: resolver never reads secret payloads.

## Testing Requirements

- Port existing resolver tests to policy-driven assertions.
- Full live assistant smoke/matrix remains green.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- changelog on completion

## Completion Notes (2026-04-19)

- Added `operationPolicy/resolverPolicy.ts` as the policy-owned resolver adapter for operation aliases, resource aliases, filter aliases, count words, candidate matching, filter matching, and surface-only read fallback.
- Updated `cmsTargetResolver.ts` to stop reading `cmsResourceRegistry` and to delegate resource resolution, operation inference, prompt filters, requested counts, field intents, candidate matching, and filter matching to policy-backed helpers.
- Changed resolver filtering to fail closed for filters not declared by the resource policy.
- Added Vitest coverage for policy-driven resolver aliases, prompt filter inference, filter canonicalization, OR matching, surface-only fallback, and unknown-filter denial.
- Runtime action mapping remains unchanged for the next TASK-188 phase.

## Validation (2026-04-19)

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
