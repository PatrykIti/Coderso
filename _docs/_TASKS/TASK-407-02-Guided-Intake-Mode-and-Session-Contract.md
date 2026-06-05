# TASK-407-02: Guided Intake Mode and Session Contract
# FileName: TASK-407-02-Guided-Intake-Mode-and-Session-Contract.md

**Parent Task:** TASK-407
**Priority:** High
**Category:** Assistant + Schema + Admin UI + Security
**Estimated Effort:** Large
**Dependencies:** TASK-407-01
**Status:** 🚧 In Progress (2026-06-05)

---

## Overview

Create the shared guided-intake contract used by Basic and Advanced modes. The
backend must plan from normalized structured facts, not from a long synthesized
prompt. This task adds the intake session schema, step definitions, redaction,
compile-to-siteKit rules, and any route-validation wrapper needed before
mode-specific UX is built.

This contract is an intake layer over the existing `siteKit`/solution-kit
planner, not a replacement for it. New code must use `AssistantSiteBuilderIntake*`
names to avoid colliding with existing `GuidedSiteBuilder*` plan/executor result
types in `siteBuilderPlanAdapter.ts`, `siteBuilderExecutor.ts`, and
`assistantClient.ts`.

## Sub-Tasks

- Define `AssistantSiteBuilderIntakeSession`,
  `AssistantSiteBuilderIntakeMode`, `AssistantSiteBuilderIntakeStep`,
  `AssistantSiteBuilderIntakeAnswer`, and normalized facts.
- Add strict normalization helpers that reject unknown fields and unknown option
  ids.
- Own intake schemas, enums, defaults, compile-to-siteKit helpers, and
  `normalize*` helpers in the assistant service contract module. Route
  validation may re-export or wrap this owner schema, but must not define a
  duplicate contract.
- Compile reviewed intake facts into existing `AssistantSiteKitPlanInput` /
  `context.siteKit`; add a temporary `context.siteBuilderIntake` route payload
  only if pre-execution metadata must travel with the request.
- Add redaction helpers for session diagnostics and provider context packaging.
- Keep browser-local state bounded and non-secret; do not store raw files,
  cookies, provider keys, or auth state.

## Executable Leaves

| ID | Title | Status | Output |
|---|---|---|---|
| TASK-407-02-L01 | Session Types and Step Registry | Done (2026-06-05) | Service-owned intake session types, mode/step ids, versions, and option registries. |
| TASK-407-02-L02 | Answer Normalization and Fact Derivation | Done (2026-06-05) | Strict answer schemas, `normalize*` helpers, derived facts, and validation tests. |
| TASK-407-02-L03 | Assistant Context and Route Validation Handoff | Done (2026-06-05) | Intake-to-`context.siteKit` handoff, optional intake route-schema reuse, and route tests. |
| TASK-407-02-L04 | Guide Redaction and Browser State Contract | To Do | Redacted intake diagnostics, policy-bounded provider facts, and bounded browser state rules. |

## Security Contract

- Endpoint visibility: existing internal `/admin/api/assistant/actions/plan`
  route unless a dedicated internal guided-intake route is proven necessary.
- Auth model: existing admin session.
- RBAC: plan/intake requires `settings:read` plus resource read permissions for
  any server-derived catalogs used by guide steps.
- CSRF: required for POST.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: intake sessions and final `context.siteKit` payloads
  must reject unknown fields at every nested step/answer level.
- Anti-abuse: no public assistant write path; no execute before final reviewed
  action plan.
- Secret handling: guide state, provider context, diagnostics, localStorage, and
  tests must not include secrets, raw uploaded bytes, cookies, auth state, or
  signed URLs.

## Files To Change

| Area | Files |
|---|---|
| Types/schema | New `core/services/assistant/assistantSiteBuilderIntake*.ts` files; `core/services/assistant/actionPlanTypes.ts` only if optional intake metadata is added |
| Existing siteKit contract | `core/services/kits/solutionKitTypes.ts`, `core/services/assistant/siteBuilderPlanAdapter.ts`, `core/services/assistant/siteBuilderPlanner.ts` |
| Route validation | `core/server/validation/assistantActionSchemas.ts` only as a route-layer wrapper if `context.siteBuilderIntake` is introduced; existing `context.siteKit` validation remains authoritative for final planning |
| Planner | `core/services/assistant/actionPlannerService.ts` only for compile-to-siteKit handoff tests or full-site intent routing |
| Redaction | `core/services/assistant/assistantRedaction.ts` or new intake helper |
| Tests | `tests/vitest/assistant/*`, `tests/integration/routes/assistant.test.ts` if route schema changes |

## Implementation Pseudocode

```ts
const siteBuilderIntakeStepDefinitions = defineSiteBuilderIntakeSteps([
  step("business-profile", businessProfileSchema),
  step("site-goals", siteGoalsSchema),
  step("site-map", siteMapSchema),
  step("menu", menuSchema),
  step("hero", heroSchema),
  step("homepage-sections", homepageSectionsSchema),
  step("subpages", subpagesSchema),
  step("media-policy", mediaPolicySchema),
  step("content-engine", contentEngineSchema),
  step("design-preset", designPresetSchema),
  step("reference-intake", referenceIntakeSchema),
  step("review", reviewSchema),
]);

export function normalizeAssistantSiteBuilderIntakeSession(input: unknown) {
  const session = readRecord(input);
  rejectUnknownKeys(session, ["version", "mode", "currentStepId", "answers", "facts"]);
  const mode = readMode(session.mode);
  const answers = normalizeAnswers(session.answers, siteBuilderIntakeStepDefinitions);
  return deriveFacts({ mode, answers });
}

export function compileIntakeToSiteKitPlanInput(session: AssistantSiteBuilderIntakeSession) {
  const normalized = normalizeAssistantSiteBuilderIntakeSession(session);
  assertReadyForReview(normalized);
  return buildSiteKitPlanInputFromIntakeFacts(normalized.facts, {
    supportedSteps: siteBuilderPlanStepIds,
  });
}

export function redactAssistantSiteBuilderIntakeSession(session: AssistantSiteBuilderIntakeSession) {
  // TASK-407-02-L04 owns the concrete redaction helper; keep this shape aligned.
  return {
    version: session.version,
    mode: session.mode,
    currentStepId: session.currentStepId,
    answeredStepIds: session.answers.map((answer) => answer.stepId),
    factsHash: hashStableJson(session.facts),
    warnings: session.securityWarnings.map(redactGuideWarning),
  };
}
```

## Data Flow and Error Handling

- Admin UI starts or resumes an intake session, posts one structured answer at a
  time, and receives the normalized session plus next step/review readiness.
- The service-owned schema normalizes answers before compile-to-siteKit handoff;
  the route layer only reuses that owner schema if intake metadata is posted.
- Final action planning receives the existing `context.siteKit` payload, so
  TASK-407 does not introduce a second full-site executor or action-plan channel.
- Unknown keys, unknown option ids, oversized text, secret-like values, raw file
  bytes, signed URLs, or unsafe reference fields return machine-readable
  validation errors before provider/planner calls.
- Redacted diagnostics include stable ids and hashes only; browser-local state
  stores bounded session state, not secrets or raw references.

## Testing Requirements

- Unit/Vitest tests for schema normalization, unknown-key rejection, option-id
  rejection, text length clamping, and redaction.
- Route validation tests if `assistantActionPlanRequestSchema` changes.
- Planner/compiler test proving structured intake facts compile into
  `AssistantSiteKitPlanInput` and influence the existing `siteKit` plan even when
  prompt text is minimal.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/assistant.md`

## Acceptance Criteria

- Basic and Advanced modes can share one strict guided-intake session contract.
- Planning can consume normalized intake facts through compiled `siteKit` input
  separately from prompt text.
- Unknown or secret-like payloads fail closed before provider planning.
