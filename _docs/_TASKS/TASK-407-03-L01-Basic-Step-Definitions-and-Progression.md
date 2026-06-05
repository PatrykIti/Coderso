# TASK-407-03-L01: Basic Step Definitions and Progression
# FileName: TASK-407-03-L01-Basic-Step-Definitions-and-Progression.md

**Parent Subtask:** TASK-407-03
**Priority:** High
**Category:** Assistant + Basic UX Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-407-02-L04
**Status:** ⏳ To Do

---

## Overview

Define the Basic guided sequence for a nontechnical user and the deterministic
`needs_input` progression. This leaf does not choose final widgets or assemble
actions.

## Sub-Tasks

- Define Basic-only visible steps: `business-profile`, `site-goals`,
  `site-map`, `menu`, `hero`, `homepage-sections`, `subpages`, `media-policy`,
  and `review`.
- Add `resolveBasicNextStep` and required-answer checks.
- Ensure broad prompts enter Basic mode unless the user explicitly chooses
  Advanced or an existing active flow is resumed.
- Return next-step metadata that the UI can render without free-form decisions.

## Security Contract

- Endpoint visibility: internal assistant plan/intake path only.
- Auth model: existing admin session.
- RBAC: existing assistant planning permissions.
- CSRF: required for POST when carried through action-plan route.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: Basic step ids and answer keys must resolve through
  the service-owned registries.
- Anti-abuse: broad user text cannot skip required Basic steps or force execute.
- Secret handling: step metadata must not include provider keys, cookies, auth
  state, raw files, or secret-like prompt content.

## Files To Change

| Area | Files |
|---|---|
| Basic flow | `core/services/assistant/assistantSiteBuilderIntakeBasicFlow.ts` |
| Normalizers | `core/services/assistant/assistantSiteBuilderIntakeNormalizer.ts` |
| Planner hook | `core/services/assistant/actionPlannerService.ts` only for full-site intent handoff into existing `siteKit` flow |
| Tests | `tests/vitest/assistant/assistantSiteBuilderIntakeBasicFlow.test.ts` |

## Implementation Pseudocode

```ts
export function resolveBasicNextStep(session: AssistantSiteBuilderIntakeSession) {
  const orderedSteps = BASIC_SITE_BUILDER_INTAKE_STEP_IDS;
  for (const stepId of orderedSteps) {
    if (!isSiteBuilderIntakeStepSatisfied(session, stepId)) {
      return needsInputForStep(stepId);
    }
  }
  return readyForReview(session);
}

export function shouldStartBasicGuide(input: AssistantPlanInput) {
  return isFullSiteIntent(input.prompt) && !input.context?.siteKit && !input.context?.siteBuilderIntake;
}
```

## Data Flow and Error Handling

- A broad prompt starts a Basic session and receives the first missing step.
- Each saved answer is normalized by TASK-407-02 helpers before progression.
- Missing or invalid answers return `needs_input`; they do not create partial
  actions, provider prompts, or dry-run plans.

## Testing Requirements

- Step-order tests for empty, partial, and complete Basic sessions.
- Tests that broad nontechnical prompts start or continue Basic mode.
- Tests that missing answers produce `needs_input` with the correct next step.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` for the Basic step order.

## Acceptance Criteria

- Basic mode has deterministic step progression.
- No Basic session can become plan-ready before required answers are present.
- The flow is beginner-safe and does not require widget/content-type knowledge.
