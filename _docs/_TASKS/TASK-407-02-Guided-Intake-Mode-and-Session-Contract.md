# TASK-407-02: Guided Intake Mode and Session Contract
# FileName: TASK-407-02-Guided-Intake-Mode-and-Session-Contract.md

**Parent Task:** TASK-407
**Priority:** High
**Category:** Assistant + Schema + Admin UI + Security
**Estimated Effort:** Large
**Dependencies:** TASK-407-01
**Status:** ⏳ To Do

---

## Overview

Create the shared guided-intake contract used by Basic and Advanced modes. The
backend must plan from normalized structured facts, not from a long synthesized
prompt. This task adds the session schema, step definitions, route validation
shape, redaction, and persistence/handoff rules needed before any mode-specific
UX is built.

## Sub-Tasks

- Define `GuidedSiteBuilderSession`, `GuidedSiteBuilderMode`,
  `GuidedSiteBuilderStep`, `GuidedSiteBuilderAnswer`, and normalized facts.
- Add strict normalization helpers that reject unknown fields and unknown option
  ids.
- Own `context.siteBuilderGuide` schemas, enums, defaults, and `normalize*`
  helpers in the assistant service contract module. Route validation may
  re-export or wrap this owner schema, but must not define a duplicate contract.
- Extend assistant action planning context with `context.siteBuilderGuide` or
  an equivalent internal route payload.
- Add redaction helpers for session diagnostics and provider context packaging.
- Keep browser-local state bounded and non-secret; do not store raw files,
  cookies, provider keys, or auth state.

## Security Contract

- Endpoint visibility: existing internal `/admin/api/assistant/actions/plan`
  route unless a dedicated internal guided-intake route is proven necessary.
- Auth model: existing admin session.
- RBAC: plan/intake requires `settings:read` plus resource read permissions for
  any server-derived catalogs used by guide steps.
- CSRF: required for POST.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: `context.siteBuilderGuide` must reject unknown
  fields at every nested step/answer level.
- Anti-abuse: no public assistant write path; no execute before final reviewed
  action plan.
- Secret handling: guide state, provider context, diagnostics, localStorage, and
  tests must not include secrets, raw uploaded bytes, cookies, auth state, or
  signed URLs.

## Files To Change

| Area | Files |
|---|---|
| Types/schema | `core/services/assistant/actionPlanTypes.ts`, new `core/services/assistant/guidedSiteBuilder*.ts` files |
| Route validation | `core/server/validation/assistantActionSchemas.ts` as a route-layer re-export/wrapper of the service-owned schema |
| Planner | `core/services/assistant/actionPlannerService.ts` |
| Redaction | `core/services/assistant/assistantRedaction.ts` or new helper |
| Tests | `tests/vitest/assistant/*`, `tests/integration/routes/assistant.test.ts` if route schema changes |

## Implementation Pseudocode

```ts
const guidedStepDefinitions = defineGuidedSteps([
  step("profile", profileSchema),
  step("goal", goalSchema),
  step("structure", structureSchema),
  step("menu", menuSchema),
  step("review", reviewSchema),
]);

export function normalizeGuidedSiteBuilderSession(input: unknown) {
  const session = readRecord(input);
  rejectUnknownKeys(session, ["version", "mode", "currentStepId", "answers", "facts"]);
  const mode = readMode(session.mode);
  const answers = normalizeAnswers(session.answers, guidedStepDefinitions);
  return deriveFacts({ mode, answers });
}

export function redactGuidedSiteBuilderSession(session: GuidedSiteBuilderSession) {
  return {
    version: session.version,
    mode: session.mode,
    currentStepId: session.currentStepId,
    factsHash: hashFacts(session.facts),
    answeredStepIds: session.answers.map((answer) => answer.stepId),
  };
}
```

## Data Flow and Error Handling

- Admin UI starts or resumes a guided session, posts one structured answer at a
  time, and receives the normalized session plus next step/review readiness.
- The service-owned schema normalizes answers before planner handoff; the route
  layer only reuses that owner schema for request validation.
- Unknown keys, unknown option ids, oversized text, secret-like values, raw file
  bytes, signed URLs, or unsafe reference fields return machine-readable
  validation errors before provider/planner calls.
- Redacted diagnostics include stable ids and hashes only; browser-local state
  stores bounded session state, not secrets or raw references.

## Testing Requirements

- Unit/Vitest tests for schema normalization, unknown-key rejection, option-id
  rejection, text length clamping, and redaction.
- Route validation tests if `assistantActionPlanRequestSchema` changes.
- Planner test proving structured `siteBuilderGuide` facts influence planning
  even when prompt text is minimal.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/assistant.md`

## Acceptance Criteria

- Basic and Advanced modes can share one strict guided-intake session contract.
- Planning can consume normalized guide facts separately from prompt text.
- Unknown or secret-like payloads fail closed before provider planning.
