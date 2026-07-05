// TASK-482-04-L01: Phase-2 wizard reducer + selectors.
//
// Pure state machine over `WizardState` (wizardSteps.ts): step navigation with
// validation gating, a Basic/Advanced track filter, dirty/complete tracking and
// resume-to-first-incomplete. No React, no DOM, no network — the shell (04-L02)
// binds these via `useReducer`.

import {
  WIZARD_DEFAULT_VALUES,
  WIZARD_STEPS,
  type WizardState,
  type WizardStep,
  type WizardValues,
} from "./wizardSteps";

export type WizardAction =
  | { type: "next" }
  | { type: "prev" }
  | { type: "goto"; id: string }
  | { type: "toggleAdvanced"; value: boolean }
  | { type: "patch"; patch: Partial<WizardValues> }
  | { type: "complete"; id: string };

const withAdded = (set: Set<string>, id: string): Set<string> => {
  const next = new Set(set);
  next.add(id);
  return next;
};

export const visibleSteps = (state: WizardState): WizardStep[] =>
  WIZARD_STEPS.filter((step) => step.track === "basic" || state.advancedEnabled);

export const currentStep = (state: WizardState): WizardStep | undefined =>
  WIZARD_STEPS.find((step) => step.id === state.currentStepId);

// Advancing is blocked (a no-op) whenever the current step fails validation.
export const canAdvance = (state: WizardState): boolean => {
  const step = currentStep(state);
  return step ? step.validate(state.values) === null : true;
};

// First visible step whose data is still incomplete, else the last visible step.
export const resolveResumeStep = (state: WizardState): string => {
  const steps = visibleSteps(state);
  const incomplete = steps.find((step) => !step.isComplete(state.values));
  return incomplete?.id ?? steps[steps.length - 1]?.id ?? WIZARD_STEPS[0].id;
};

export const markDirty = (state: WizardState, id: string): WizardState => ({
  ...state,
  dirtyStepIds: withAdded(state.dirtyStepIds, id),
});

export const goToStep = (state: WizardState, id: string): WizardState => {
  if (!visibleSteps(state).some((step) => step.id === id)) return state;
  return { ...state, currentStepId: id };
};

export const nextStep = (state: WizardState): WizardState => {
  if (!canAdvance(state)) return state;
  const steps = visibleSteps(state);
  const index = steps.findIndex((step) => step.id === state.currentStepId);
  if (index < 0 || index >= steps.length - 1) return state;
  return { ...state, currentStepId: steps[index + 1].id };
};

export const prevStep = (state: WizardState): WizardState => {
  const steps = visibleSteps(state);
  const index = steps.findIndex((step) => step.id === state.currentStepId);
  if (index <= 0) return state;
  return { ...state, currentStepId: steps[index - 1].id };
};

export const toggleAdvanced = (state: WizardState, value: boolean): WizardState => {
  const nextState: WizardState = { ...state, advancedEnabled: value };
  const steps = visibleSteps(nextState);
  // Clamp: turning Advanced off while on an advanced step must snap the cursor
  // back into the still-visible (Basic) set.
  if (steps.some((step) => step.id === nextState.currentStepId)) return nextState;
  return {
    ...nextState,
    currentStepId: steps[steps.length - 1]?.id ?? WIZARD_STEPS[0].id,
  };
};

export const reduce = (state: WizardState, action: WizardAction): WizardState => {
  switch (action.type) {
    case "next":
      return nextStep(state);
    case "prev":
      return prevStep(state);
    case "goto":
      return goToStep(state, action.id);
    case "toggleAdvanced":
      return toggleAdvanced(state, action.value);
    case "patch":
      return markDirty(
        { ...state, values: { ...state.values, ...action.patch } },
        state.currentStepId
      );
    case "complete":
      return { ...state, completedStepIds: withAdded(state.completedStepIds, action.id) };
  }
};

export const initWizardState = (initialValues?: Partial<WizardValues>): WizardState => ({
  values: { ...WIZARD_DEFAULT_VALUES, ...initialValues },
  currentStepId: WIZARD_STEPS[0].id,
  advancedEnabled: false,
  dirtyStepIds: new Set<string>(),
  completedStepIds: new Set<string>(),
});
