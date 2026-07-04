# TASK-482-04-L02: Wizard shell component + restyle to TASK-479 primitives
# FileName: TASK-482-04-L02-Wizard-Shell-Restyle.md

**Parent Subtask:** TASK-482-04
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-04-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Replace the fixed 3-step body of `SetupWizard.tsx` with a shell that
  renders the active step from the registry, a step rail driven by
  `visibleSteps`, a Basic/Advanced toggle, Back/Next/Finish controls bound to the
  reducer, and consolidated error surfacing. Restyle onto TASK-479 admin
  primitives without changing behaviour beyond multi-track navigation.
- **Owning module(s) to extend/create:**
  - `core/admin/ui/setup/SetupWizard.tsx` — re-implement as the shell consuming
    `wizardMachine` (04-L01); keep the export name/signature consumed by
    `AdminApp.tsx` (`initialValues`, `onSubmit`, `isSaving`, `error`) stable, or
    update the single call site at `AdminApp.tsx` line 1090.
  - Step bodies render via a `renderStep(stepId, { values, patch, errors })`
    switch; the concrete fields land in 05/07 — this leaf ships the shell plus a
    placeholder for un-implemented steps so the flow is navigable end to end.
- **Source-of-truth docs:** `_docs/UI/`, `_docs/DESIGN_TOKENS.md`,
  `_docs/CMS_SPEC.md`. TASK-479 is the design owner; consume its primitives.
- **Out-of-scope:** persistence (per-step writes in 05/07; finalize in 08); the
  state machine itself (04-L01).

## Implementation Pseudocode

```tsx
export function SetupWizard({ initialValues, onSubmit, isSaving, error }: SetupWizardProps) {
  const [state, dispatch] = useReducer(reduce, initWizardState(initialValues));
  const steps = visibleSteps(state);
  const step = currentStep(state);
  const stepError = step?.validate(state.values) ?? null;

  const isLast = steps[steps.length - 1]?.id === step?.id;
  const onPrimary = () =>
    isLast ? onSubmit(state.values) : dispatch({ type: "next" });

  return (
    <WizardLayout brand={...}>
      <TrackToggle value={state.advancedEnabled} onChange={(v) => dispatch({ type: "toggleAdvanced", value: v })} />
      <StepRail steps={steps} currentId={state.currentStepId} onSelect={(id) => dispatch({ type: "goto", id })} />
      <StepBody>{renderStep(state, dispatch)}</StepBody>
      <ErrorBanner error={stepError ?? error} />
      <Footer>
        <BackButton disabled={isFirst || isSaving} onClick={() => dispatch({ type: "prev" })} />
        <PrimaryButton disabled={isSaving || !canAdvance(state)} onClick={onPrimary}
          label={isLast ? "Finish setup" : "Next"} />
      </Footer>
    </WizardLayout>
  );
}
```

- **Data flow:** `initialValues` (from `settingsState.values`, AdminApp 535-544)
  → reducer → render; `onSubmit` is `completeSetup` (extended in 08).
- **Error handling:** show the current step's validation error or the
  server/finalize error; `canAdvance` disables Next.
- **Regression-test shape:** mount shows the first Basic step; Next advances only
  when valid; toggling Advanced reveals advanced steps; on the last step the
  primary button calls `onSubmit` with the full values.

## Testing Requirements

- **Lane:** Vitest ui-integration —
  `tests/vitest/ui-integration/setupWizardShell.test.tsx`.
- Cases: navigation forward/back; Next disabled on invalid step; track toggle
  shows/hides advanced steps; last-step primary invokes `onSubmit`; error banner
  reflects both validation and server errors. Keep/port the existing
  `SetupWizard` tests so prior coverage is not lost.
- No migration artifacts.
