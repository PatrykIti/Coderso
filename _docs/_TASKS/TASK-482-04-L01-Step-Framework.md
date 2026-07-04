# TASK-482-04-L01: Step-framework state machine (registry, validation, dirty/resume, tracks)
# FileName: TASK-482-04-L01-Step-Framework.md

**Parent Subtask:** TASK-482-04
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** A pure, UI-agnostic state machine for the Phase-2 wizard: a typed
  step registry, per-step validation hooks, dirty tracking, resume to the first
  incomplete step, and a Basic/Advanced track filter. No React DOM, no network —
  just reducers/selectors so it is exhaustively unit-testable.
- **Owning module(s) to create:**
  - `core/admin/ui/setup/wizardSteps.ts` — `WizardStep` type
    `{ id, title, track: "basic" | "advanced", validate(state): string | null, isComplete(state): boolean }`
    and the ordered `WIZARD_STEPS` registry (Basic: identity, branding, locale,
    timezone, URLs, starter-content; Advanced: email, storage, security,
    assistant).
  - `core/admin/ui/setup/wizardMachine.ts` — reducer + selectors
    (`nextStep`, `prevStep`, `goToStep`, `toggleAdvanced`, `markDirty`,
    `resolveResumeStep`, `visibleSteps`, `canAdvance`).
  - Refactor `core/admin/ui/setup/setupWizardValidation.ts` to feed the
    per-step `validate` hooks (keep the existing URL/TTL validators; do not lose
    `validatePublicBaseUrl`).
- **Source-of-truth docs:** `_docs/CMS_SPEC.md`, `_docs/SETTINGS.md`,
  `_docs/AUTH_SPEC.md`.
- **Out-of-scope:** rendering (04-L02), concrete step field UIs (05/06/07),
  persistence (handled per-step + finalize in 08).

## Implementation Pseudocode

```ts
export type WizardTrack = "basic" | "advanced";
export type WizardState = {
  values: WizardValues;          // superset of SetupWizardValues + timezone + advanced
  currentStepId: string;
  advancedEnabled: boolean;
  dirtyStepIds: Set<string>;
  completedStepIds: Set<string>;
};

export const WIZARD_STEPS: WizardStep[] = [ /* basic..., advanced... */ ];

export function visibleSteps(state: WizardState): WizardStep[] {
  return WIZARD_STEPS.filter((s) => s.track === "basic" || state.advancedEnabled);
}

export function canAdvance(state: WizardState): boolean {
  const step = currentStep(state);
  return step ? step.validate(state.values) === null : true;
}

export function reduce(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "next":  return canAdvance(state) ? advanceWithin(visibleSteps(state), state) : state;
    case "prev":  return retreatWithin(visibleSteps(state), state);
    case "goto":  return { ...state, currentStepId: action.id };
    case "toggleAdvanced": return { ...state, advancedEnabled: action.value };
    case "patch": return markDirty({ ...state, values: { ...state.values, ...action.patch } }, state.currentStepId);
    case "complete": return { ...state, completedStepIds: add(state.completedStepIds, action.id) };
  }
}

export function resolveResumeStep(state: WizardState): string {
  return visibleSteps(state).find((s) => !s.isComplete(state.values))?.id ?? lastStepId(state);
}
```

- **Data flow:** initial values (from current settings) → reducer transitions →
  selectors drive the shell.
- **Error handling:** `validate` returns a human string or `null`; `canAdvance`
  blocks `next` without throwing. No domain/route error codes (pure client
  logic).
- **Regression-test shape:** advancing past an invalid step is a no-op; toggling
  Advanced off hides advanced steps and clamps `currentStepId` back into the
  visible set; `resolveResumeStep` returns the first incomplete step; dirty
  tracking flags a patched step.

## Testing Requirements

- **Lane:** Vitest pure-logic lane —
  `tests/vitest/setup/wizardMachine.test.ts`. No DOM, no DB.
- Cases: step nav happy/blocked paths; track toggle visibility + clamp; resume
  resolution; dirty/complete tracking; the migrated URL/TTL validators still
  reject the same inputs as before (guard against regression of
  `setupWizardValidation.ts`).
- No migration artifacts.
