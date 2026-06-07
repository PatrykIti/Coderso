# TASK-407-03-L01: Basic Step Definitions and Progression
# FileName: TASK-407-03-L01-Basic-Step-Definitions-and-Progression.md

**Parent Subtask:** TASK-407-03
**Priority:** High
**Category:** Assistant + Basic UX Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-407-02-L04
**Status:** ✅ Done (2026-06-05)

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

## Closure Evidence

- Added `assistantSiteBuilderIntakeBasicFlow.ts` with Basic step metadata,
  required-answer checks, deterministic next-step resolution, and a typed
  `needs_input` action-plan response carrying `metadata.siteBuilderIntake`.
- Derived the Basic step order from the backend registry so Basic uses the same
  canonical order as the shared intake contract:
  `business-profile`, `site-goals`, `site-map`, `menu`, `hero`,
  `homepage-sections`, `subpages`, `media-policy`, `review`.
- Required locale in the Basic business-profile gate so a user cannot reach
  review with facts that the later compiler would reject.
- Routed broad full-site prompts into Basic `needs_input` before provider
  drafting or executable action assembly, while preserving explicit
  `context.siteKit` handoff for already-reviewed plans.
- Added strict action-plan metadata normalization for `siteBuilderIntake` so the
  UI can render the current step, visible steps, missing required steps, and
  readiness flags without parsing free-form text.
- Added registry-owned `answerFields` metadata for every Basic step, including
  required `locale`, accepted answer keys, control types, required groups,
  length/item bounds, registry ids, and option values for select controls.
- Added backend-only planner context state for requested intake mode and active
  sessions so explicit Advanced mode bypasses the initial Basic broad-prompt
  gate and active Basic sessions continue instead of restarting.
- Fixed Curie audit drift risks for competing step order, too-broad full-site
  routing, missing typed render metadata, locale readiness, incomplete-session
  execution, secret echo, registry validation, and planner-level Advanced/resume
  handling.
- Curie final re-audit reported no blocking findings after those fixes.
- Validation passed:
  - `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/assistantSiteBuilderIntakeRegistry.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeNormalizer.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeRedaction.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicFlow.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/actionPlannerService.test.ts` (201 tests)
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
  - `bun run precommit`
