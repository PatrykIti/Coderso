# TASK-407-05-L06: Dry Run Idempotency and Runtime Contract Tests
# FileName: TASK-407-05-L06-Dry-Run-Idempotency-and-Runtime-Contract-Tests.md

**Parent Subtask:** TASK-407-05
**Priority:** High
**Category:** Assistant + Runtime Contract Tests
**Estimated Effort:** Large
**Dependencies:** TASK-407-05-L05
**Status:** ✅ Done
**Completed:** 2026-06-06

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

## Completion Notes

- Added a Vitest planner contract that compiles a reviewed guided intake into
  existing siteKit actions, normalizes the generated plan through the strict
  action schema, proves repeated plan output stable, verifies static same-plan
  locators, and rejects unknown install payload fields before dry-run/execute.
- Added a backend-only reviewed content-engine plan adapter that maps supported
  intake decisions onto existing catalog-family action plans without adding a
  new public write path.
- Added a Bun executor dry-run test that calls `dryRunAssistantActionPlan` for
  the reviewed siteKit handoff and proves repeated previews are stable.
- Extended the Bun public runtime catalog proof so a reviewed-intake
  content-engine plan is dry-run checked, executed with tokenized
  content-route/detail-template fixtures, cleaned up by scoped ids, and rendered
  through real server catalog/detail route checks.
- No new endpoints were added; the proof uses existing internal assistant action
  contracts and public read-only runtime routes.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` updated with strict/idempotent reviewed
  siteKit and runtime proof guarantees.
- `docs/develop/assistant.md` updated with the same developer contract.
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` updated with guided SiteKit runtime
  contract coverage.

## Acceptance Criteria

- Intake-to-siteKit action assembly is strict and idempotent.
- At least one intake-generated content-engine path renders publicly.
- Tests use scoped fixtures and do not mutate unrelated data.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakePlanner.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeStaticActions.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
  (180 tests)
- `bun test tests/unit/assistant/assistantSiteBuilderIntakeDryRun.test.ts`
  (1 Bun dry-run test)
- `set -a && source .env && set +a && bun test tests/integration/server/assistantHouseProjectsCatalogPublicSite.test.ts`
  (1 Bun runtime test)
