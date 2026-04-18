# TASK-188-07: Navigation Coverage and Live Matrix From Policy
# FileName: TASK-188-07_Navigation_Coverage_and_Live_Matrix_From_Policy.md

**Priority:** High
**Category:** Assistant/QA + Coverage
**Estimated Effort:** Medium
**Dependencies:** TASK-188-02
**Status:** To Do

---

## Overview

Generate or validate `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` from policy.

## Sub-Tasks

No child task files.

## Acceptance Criteria

1. Every Admin nav/settings route has a policy coverage state.
2. Static coverage test compares policy to nav registries.
3. Live matrix command coverage is tied to policy task ids.
4. Planned modules cannot be marked executable.

## Files to Change

- `core/services/assistant/operationPolicy/coveragePolicy.ts` (new)
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `tests/vitest/assistant/live-coverage-matrix.test.ts`
- `tests/vitest/assistant/operation-policy-coverage.test.ts`

## Pseudocode

```ts
export function buildLiveCoverageRows(policy) {
  return Object.values(policy.resources)
    .flatMap((resource) => resource.coverage.routes)
    .map(toMarkdownRow);
}

export function assertNavCoverage(policy, navRoutes) {
  for (const route of navRoutes) assert(policyHasRoute(route));
}
```

## Replacement Notes

The markdown file may stay checked in, but tests must prove it matches policy output.

## Security Contract

- Visibility: docs/test coverage.
- Auth model: no runtime change.
- RBAC: coverage includes permission metadata.
- CSRF: no route change.
- Rate-limit bucket: no route change.
- Reject-unknown validation: route ids are canonical.
- Anti-abuse: planned routes stay gated.
- Secret handling: no secrets in coverage docs.

## Testing Requirements

- Static route coverage test.
- Policy coverage state validation.

## Documentation Updates Required

- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/TESTING_STRATEGY.md`
- changelog on completion
