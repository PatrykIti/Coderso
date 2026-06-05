# TASK-407-05-L06: Dry Run Idempotency and Runtime Contract Tests
# FileName: TASK-407-05-L06-Dry-Run-Idempotency-and-Runtime-Contract-Tests.md

**Parent Subtask:** TASK-407-05
**Priority:** High
**Category:** Assistant + Runtime Contract Tests
**Estimated Effort:** Large
**Dependencies:** TASK-407-05-L05
**Status:** ⏳ To Do

---

## Overview

Add planner/executor contract tests for intake-to-siteKit action assembly,
dry-run idempotency, and at least one public runtime proof for generated
content-engine output.

## Sub-Tasks

- Validate generated siteKit actions through strict schemas.
- Prove dry-run output is stable and idempotent for repeated intake sessions.
- Prove same-plan locators resolve for generated static and content-engine
  resources.
- Add a Bun/runtime test for one intake-generated content-engine public output
  path.

## Security Contract

- Endpoint visibility: internal assistant action routes plus public runtime read
  routes created by normal CMS actions.
- Auth model: admin session for plan/dry-run/execute; public runtime remains
  read-only.
- RBAC: action-specific read/write/publish permissions from existing contracts.
- CSRF: required for admin POSTs; public runtime reads do not mutate.
- Rate-limit bucket: `assistant` for assistant routes.
- Reject unknown validation: generated action payloads must reject unknown
  fields before dry-run/execute.
- Anti-abuse: tests must not add public assistant write endpoints or bypass
  nonce/captcha/session hardening for public forms.
- Secret handling: tests must use synthetic data and avoid provider keys,
  cookies, CSRF tokens, auth state, raw prompts, and signed URLs in assertions.

## Files To Change

| Area | Files |
|---|---|
| Planner/executor tests | `tests/vitest/assistant/assistantSiteBuilderIntakePlanner.test.ts`, `tests/unit/assistant/*` if Bun-owned |
| Runtime tests | `tests/integration/server/assistantSiteBuilderIntakeRuntime.test.ts` |
| Code under test | only hardening fixes uncovered by tests |

## Implementation Pseudocode

```ts
test("intake siteKit plan dry-run is idempotent", async () => {
  const session = buildCompleteSiteBuilderIntakeSessionFixture();
  const first = await planAndDryRun(session);
  const second = await planAndDryRun(session);
  expect(stripTimestamps(first)).toEqual(stripTimestamps(second));
  expect(first.actions.every(actionPassesStrictSchema)).toBe(true);
});

test("intake content engine renders publicly", async () => {
  const execution = await executeSiteBuilderIntakeContentEngineFixture();
  const response = await fetchPublicRoute(execution.detailRoute);
  expect(response.status).toBe(200);
  expect(await response.text()).toContain(execution.expectedTitle);
});
```

## Data Flow and Error Handling

- Complete intake sessions go through compile-to-siteKit -> plan -> dry-run ->
  execute test harnesses.
- Schema failures, locator conflicts, idempotency drift, runtime 404s, or public
  console/runtime errors fail tests.
- DB-backed tests must create scoped fixtures and clean up only rows they own.

## Testing Requirements

- Targeted Vitest/Bun tests for strict action schema validation and dry-run
  idempotency.
- Bun/runtime test for one intake-generated content-engine public route.
- Load `.env` before DB-backed tests when needed:
  `set -a && source .env && set +a`.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` if runtime guarantees change.
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` when live coverage is added later.

## Acceptance Criteria

- Intake-to-siteKit action assembly is strict and idempotent.
- At least one intake-generated content-engine path renders publicly.
- Tests use scoped fixtures and do not mutate unrelated data.
