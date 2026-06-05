# TASK-407-02-L03: Assistant Context and Route Validation Handoff
# FileName: TASK-407-02-L03-Assistant-Context-and-Route-Validation-Handoff.md

**Parent Subtask:** TASK-407-02
**Priority:** High
**Category:** Assistant + API Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-407-02-L02
**Status:** ⏳ To Do

---

## Overview

Wire `context.siteBuilderGuide` into the assistant action-plan request without
duplicating schema ownership in the route layer. Route modules must stay
orchestration-only.

## Sub-Tasks

- Extend `AssistantActionContext` with optional `siteBuilderGuide`.
- Reuse or wrap the service-owned guide schema in
  `core/server/validation/assistantActionSchemas.ts`.
- Map guide-domain validation errors to existing assistant route error shapes.
- Add route tests for valid guide context, unknown fields, bad step ids, bad
  options, and redacted errors.

## Security Contract

- Endpoint visibility: existing internal `/admin/api/assistant/actions/plan`;
  add a new internal route only if this route cannot carry the context safely.
- Auth model: existing admin session.
- RBAC: existing assistant planning permissions plus resource-read permissions
  for any server-derived guide catalogs.
- CSRF: required for POST.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: route validation must reject unknown
  `context.siteBuilderGuide` fields by reusing service-owned schemas.
- Anti-abuse: no public write endpoint and no execute before reviewed strict
  action plan.
- Secret handling: route errors and logs must not echo raw prompt, cookies,
  CSRF tokens, provider keys, raw files, signed URLs, or secret-like guide text.

## Files To Change

| Area | Files |
|---|---|
| Types | `core/services/assistant/actionPlanTypes.ts` |
| Validation | `core/server/validation/assistantActionSchemas.ts` |
| Routes/tests | `tests/integration/routes/assistant.test.ts`, `tests/unit/server/schemaValidator.test.ts` |

## Implementation Pseudocode

```ts
export type AssistantActionContext = {
  // existing fields
  siteBuilderGuide?: GuidedSiteBuilderSession;
};

export const assistantActionPlanRequestSchema = {
  // existing fields
  context: optionalObject({
    // existing context fields
    siteBuilderGuide: optionalSchema(guidedSiteBuilderSessionRequestSchema),
  }),
};

function mapGuidedRouteError(error: GuidedSiteBuilderError) {
  return new ApiError(400, error.code, redactGuidedErrorDetails(error));
}
```

## Data Flow and Error Handling

- Admin UI posts a plan request with `context.siteBuilderGuide`; route
  validation calls the service-owned schema before planner invocation.
- Valid guide context reaches `actionPlannerService` as typed normalized data.
- Invalid fields return 400 machine-readable errors; auth/RBAC/CSRF failures use
  existing route behavior and must not be masked as guide errors.

## Testing Requirements

- Route/schema tests for valid guide payload acceptance.
- Route/schema tests for unknown nested fields, invalid step ids, invalid option
  ids, oversized text, and secret redaction.
- Route registration/error-mapping coverage if a new route is added.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `docs/develop/assistant.md` for the route handoff contract.

## Acceptance Criteria

- Route validation reuses service-owned guide schemas.
- Invalid guide context fails before planner/provider calls.
- No duplicate route-owned `siteBuilderGuide` contract exists.
