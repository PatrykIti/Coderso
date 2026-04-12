# TASK-171-05: Provider Planner Evaluation Fixtures and Route Coverage
# FileName: TASK-171-05_Provider_Planner_Evaluation_Fixtures_and_Route_Coverage.md

**Priority:** High  
**Category:** QA/Assistant + Provider Planning  
**Estimated Effort:** Medium  
**Dependencies:** TASK-171-02, TASK-171-03, TASK-171-04  
**Status:** To Do

---

## Overview

Close the provider planner wave with deterministic fixtures and route coverage. This task validates good, malformed, unsafe, timeout, and fallback cases without live network dependency.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
for (const fixture of providerPlannerFixtures) {
  const plan = await planAssistantActionsWithFakeProvider(fixture.input);
  expect(plan).toMatchObject(fixture.expected);
  expectNoSecrets(plan);
}
```

## Files to Change

- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/vitest/assistant/action-plan-provider-adapter.test.ts`
- possible `tests/vitest/assistant/fixtures/providerPlannerFixtures.ts`
- `tests/integration/routes/assistant.test.ts`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_CHANGELOG/README.md` and changelog entry when completed

## Security Contract

- Visibility: internal planning route coverage.
- Auth model: admin session in route tests.
- RBAC: route tests verify plan permissions where applicable.
- CSRF: route tests preserve CSRF expectation.
- Rate-limit bucket: `assistant`; test where feasible.
- Reject-unknown validation: fixtures include unknown fields/actions and malformed drafts.
- Anti-abuse: no public write path.
- Idempotency: not applicable to plan route.
- Secret handling: fixtures assert no secret leakage in response/error metadata.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - all provider planner fixture tests.
- Bun:
  - assistant route plan coverage with fake provider/deps if route wiring changed.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-task-171-provider-planner-intelligence.md`

## Acceptance Criteria

1. Provider planner tests do not call live network.
2. Unsafe drafts recover to questions or safe fallback.
3. Route behavior and docs match the implemented provider planning contract.
