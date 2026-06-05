# TASK-407-02-L01: Session Types and Step Registry
# FileName: TASK-407-02-L01-Session-Types-and-Step-Registry.md

**Parent Subtask:** TASK-407-02
**Priority:** High
**Category:** Assistant + Domain Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-407-01
**Status:** ⏳ To Do

---

## Overview

Create the service-owned guided site-builder session model and backend-owned
step/option registries. This leaf must not touch admin UI rendering or route
handlers except for type imports needed by later leaves.

## Sub-Tasks

- Add `GuidedSiteBuilderSession`, `GuidedSiteBuilderMode`,
  `GuidedSiteBuilderStepId`, `GuidedSiteBuilderStepDefinition`,
  `GuidedSiteBuilderAnswer`, and version constants under
  `core/services/assistant/`.
- Define backend-owned registries for modes, step ids, page roles, menu
  presets, hero presets, section roles, media preferences, and review state.
- Export read-only registry lookup helpers with stable ids and explicit labels.
- Keep `AssistantPlanQuestion` unchanged; the guided flow uses a richer step
  model owned by this task family.

## Security Contract

- Endpoint visibility: no endpoint changes in this leaf.
- Auth model: unchanged existing admin session.
- RBAC: unchanged; registries are pure domain constants.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject unknown validation: registry lookup helpers must fail closed for
  unknown ids and never coerce unknown ids to defaults.
- Anti-abuse: registries must not expose executable action names as user-editable
  free text.
- Secret handling: no secrets, provider keys, cookies, auth state, signed URLs,
  or raw user prompt text in registry metadata.

## Files To Change

| Area | Files |
|---|---|
| Domain contract | `core/services/assistant/guidedSiteBuilderTypes.ts`, `core/services/assistant/guidedSiteBuilderRegistry.ts` |
| Type exports | `core/services/assistant/actionPlanTypes.ts` only if the context type needs to reference the new session type |
| Tests | `tests/vitest/assistant/guidedSiteBuilderRegistry.test.ts` |

## Implementation Pseudocode

```ts
export type GuidedSiteBuilderMode = "basic" | "advanced";

export type GuidedSiteBuilderStepId =
  | "mode"
  | "business-profile"
  | "site-goals"
  | "site-map"
  | "menu"
  | "homepage-sections"
  | "hero"
  | "subpages"
  | "media-policy"
  | "content-engine"
  | "design-preset"
  | "reference-intake"
  | "review";

export type GuidedSiteBuilderSession = {
  version: 1;
  mode: GuidedSiteBuilderMode;
  currentStepId: GuidedSiteBuilderStepId;
  answers: GuidedSiteBuilderAnswer[];
  facts?: GuidedSiteBuilderFacts;
};

export function getGuidedStepDefinition(stepId: string) {
  const definition = guidedStepRegistry[stepId];
  if (!definition) throw guidedSiteBuilderError("guided_step_invalid", { stepId });
  return definition;
}
```

## Data Flow and Error Handling

- Later leaves read step and option definitions from these registries before
  accepting answers, deriving facts, or rendering UI.
- Unknown step ids, option ids, duplicate registry ids, or missing labels fail
  in tests and through machine-readable domain errors.
- No route receives these registries directly; route payload validation consumes
  the normalizers added in later leaves.

## Testing Requirements

- Vitest/Bun-free registry tests for unique ids, required labels, mode/step
  coverage, and unknown-id failure.
- Import test proving the registry modules do not import `db/client`, runtime
  adapters, settings services, or provider services.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` for the new guided mode/step vocabulary.

## Acceptance Criteria

- Guided session types and registries are service-owned and Bun-free.
- Unknown registry ids fail closed.
- Later leaves can build normalizers and UI from stable backend-owned ids.
