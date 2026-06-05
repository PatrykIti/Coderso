# TASK-407-02-L03: Assistant Context and Route Validation Handoff
# FileName: TASK-407-02-L03-Assistant-Context-and-Route-Validation-Handoff.md

**Parent Subtask:** TASK-407-02
**Priority:** High
**Category:** Assistant + API Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-407-02-L02
**Status:** ✅ Done (2026-06-05)

---

## Overview

Wire reviewed intake sessions into the existing assistant action-plan request
without duplicating schema ownership in the route layer. Final planning must
continue through `context.siteKit`; route modules must stay orchestration-only.

## Sub-Tasks

- Add `compileIntakeToSiteKitPlanInput` handoff tests for reviewed sessions.
- Reuse existing strict `context.siteKit` validation for the final action-plan
  request.
- Add optional `context.siteBuilderIntake` schema wrapping only if
  pre-execution intake metadata must be posted with the request.
- Map intake-domain validation errors to existing assistant route error shapes if
  a route wrapper is introduced.
- Add route tests for valid `siteKit` context, unknown fields, bad step ids, bad
  options, and redacted errors.

## Security Contract

- Endpoint visibility: existing internal `/admin/api/assistant/actions/plan`;
  add a new internal route only if this route cannot carry the context safely.
- Auth model: existing admin session.
- RBAC: existing assistant planning permissions plus resource-read permissions
  for any server-derived guide catalogs.
- CSRF: required for POST.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: route validation must reject unknown `siteKit`
  fields and any optional `context.siteBuilderIntake` fields by reusing
  service-owned schemas.
- Anti-abuse: no public write endpoint and no execute before reviewed strict
  action plan.
- Secret handling: route errors and logs must not echo raw prompt, cookies,
  CSRF tokens, provider keys, raw files, signed URLs, or secret-like guide text.

## Files To Change

| Area | Files |
|---|---|
| Types | `core/services/assistant/actionPlanTypes.ts`, existing `AssistantSiteKitPlanInput` |
| Intake compiler | `core/services/assistant/assistantSiteBuilderIntakeCompiler.ts` |
| Validation | `core/server/validation/assistantActionSchemas.ts` only if optional intake metadata is added; existing `siteKit` validation remains required |
| Routes/tests | `tests/integration/routes/assistant.test.ts`, `tests/unit/server/schemaValidator.test.ts` |

## Implementation Pseudocode

```ts
export type AssistantActionContext = {
  // existing fields
  siteKit?: AssistantSiteKitPlanInput;
  siteBuilderIntake?: AssistantSiteBuilderIntakeSession;
};

export const assistantActionPlanRequestSchema = {
  // existing fields
  context: optionalObject({
    // existing context fields
    siteKit: optionalSchema(siteKitPlanContextSchema),
    siteBuilderIntake: optionalSchema(siteBuilderIntakeRequestSchema), // only if introduced
  }),
};

function buildActionPlanRequestFromReviewedIntake(session: AssistantSiteBuilderIntakeSession) {
  return {
    prompt: buildSiteKitPromptSummary(session),
    context: {
      siteKit: compileIntakeToSiteKitPlanInput(session),
    },
  };
}

function mapIntakeRouteError(error: AssistantSiteBuilderIntakeError) {
  return new ApiError(400, error.code, redactIntakeErrorDetails(error));
}
```

## Data Flow and Error Handling

- Admin UI posts a reviewed plan request with `context.siteKit`; optional
  `context.siteBuilderIntake` metadata is posted only if the route explicitly
  supports it.
- Valid siteKit context reaches `actionPlannerService` through the existing
  `buildSiteKitActionPlan` path.
- Invalid fields return 400 machine-readable errors; auth/RBAC/CSRF failures use
  existing route behavior and must not be masked as guide errors.

## Testing Requirements

- Route/schema tests for valid `siteKit` payload acceptance.
- Route/schema tests for unknown nested fields, invalid step ids, invalid option
  ids, oversized text, and secret redaction when optional intake metadata is
  added.
- Route registration/error-mapping coverage if a new route is added.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Closure Evidence

- Added `assistantSiteBuilderIntakeCompiler.ts` with:
  - `compileIntakeToSiteKitPlanInput(session)`,
  - `buildSiteKitPlanInputFromIntakeFacts(facts)`,
  - `buildActionPlanRequestFromReviewedIntake(session)`.
- Kept the final route handoff on existing `context.siteKit`; no
  `context.siteBuilderIntake` route payload or duplicate route-owned intake
  schema was introduced.
- Compiled `context.siteKit` is schema-exact and excludes review-only fields,
  media policy, page roles, section roles, and intake metadata.
- Reviewed sessions reach the existing `planAssistantActions` site-kit path,
  while unconfirmed review sessions fail closed before planner handoff.
- Fixed audit blockers where generic Polish workshop prompts, including ceramic
  workshops and home automation workshops, could be misclassified as automotive
  without vehicle/mechanic context.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts` (19 tests)
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
  - `bun run precommit`

## Documentation Updates Required

- `docs/develop/assistant.md` for the route handoff contract.

## Acceptance Criteria

- Route validation reuses service-owned siteKit/intake schemas.
- Invalid siteKit or intake context fails before planner/provider calls.
- No duplicate route-owned intake contract or parallel legacy guide context
  exists.
