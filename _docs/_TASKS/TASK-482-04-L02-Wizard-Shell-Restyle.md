# TASK-482-04-L02: Wizard shell component + restyle to TASK-479 primitives
# FileName: TASK-482-04-L02-Wizard-Shell-Restyle.md

**Parent Subtask:** TASK-482-04
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-04-L01
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

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
    `core/admin/app/AdminApp.tsx` (`initialValues`, `onSubmit`, `isSaving`,
    `error`) stable, or update the single `<SetupWizard>` call site inside the
    `showSetupWizard` branch (`core/admin/app/AdminApp.tsx` ~1105–1110; gated by
    `shouldShowSetupWizard`).
  - Step bodies render via a `renderStep(stepId, { values, patch, errors })`
    switch; the concrete fields land in 05/07 — this leaf ships the shell plus a
    placeholder for un-implemented steps so the flow is navigable end to end.
- **Source-of-truth docs:** `_docs/UI/`, `_docs/DESIGN_TOKENS.md`,
  `_docs/CMS_SPEC.md`. TASK-479 is the design owner; consume its primitives.
- **Out-of-scope:** persistence (per-step writes in 05/07; finalize in 08); the
  state machine itself (04-L01).

## Coordination Pins (TASK-482 stream)

- **Changelog:** number **1220** is pinned for the TASK-482 closure
  (`_docs/_CHANGELOG/1220-*.md`, created by TASK-482-09 only). Numbers **1219**
  (TASK-510, in flight in the shared main tree — may be absent from this
  worktree's checkout; do NOT reallocate it), **1221** (TASK-483) and **1222**
  (TASK-484) are RESERVED by parallel streams.
- **Parallel streams / forbidden paths:** TASK-483 (analytics) and TASK-484
  (backups) run concurrently on sibling branches. FORBIDDEN PATHS for TASK-482:
  `core/services/analytics/**`, `core/services/backups/**`, any analytics/backups
  route modules, `core/db/schema.ts`, `core/db/migrations/**`.
- **No DB migration in this tree:** settings/branding/locale keys go through the
  settings service defaults (rows, not DDL); first-admin creation uses the
  existing `users` table. No 482 file plans DDL/migration artifacts.
- **Board/changelog discipline:** ONLY the closure subtask (TASK-482-09) edits
  `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*`; this leaf never touches them.
- **Shared REMOTE test database:** all three streams and the owner share ONE
  Postgres (render.com, `DATABASE_URL` in `.env`). Tests must never
  delete/truncate `users`, flip the real DB into a global no-users install state,
  or reset shared settings rows; use service-level seams, uniquely scoped
  fixtures, or self-restoring setup/teardown.
- **Land order:** 01 → 02 → 03 (phase 1), then 04 → 05 → 06 → 07 → 08 (phase 2),
  then 09 (closure). Strictly sequential, single writer per source file.

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

- **Data flow:** `initialValues` (the `setupInitialValues` useMemo mapping
  `settingsState.values`, `core/admin/app/AdminApp.tsx` ~550–559) → reducer →
  render; `onSubmit` is `completeSetup` (defined at AdminApp ~524, extended in
  08).
- **Type-compat window (04 → 08):** this leaf passes the full 04-L01
  `WizardValues` to `onSubmit`, while `completeSetup` still takes
  `SetupWizardValues` until 08-L01 widens it. That is safe by design:
  `WizardValues` is a structural **superset** of `SetupWizardValues`, so
  `onSubmit={completeSetup}` keeps typechecking; do NOT widen `completeSetup`
  here — 08-L01 owns that change. Any `AdminApp.tsx` call-site touch in this
  leaf is limited to the `<SetupWizard>` props (~1105–1110) and must not
  restructure 03-L02's gate/redirect code (parent land order, single writer
  per file).
- **Error handling:** show the current step's validation error or the
  server/finalize error; `canAdvance` disables Next.
- **Regression-test shape:** mount shows the first Basic step; Next advances only
  when valid; toggling Advanced reveals advanced steps; on the last step the
  primary button calls `onSubmit` with the full values.

## Testing Requirements

- **Lane:** Vitest ui-integration — **rewrite the existing file in place**
  `tests/vitest/ui-integration/setup-wizard.test.tsx` (do NOT create a new
  `setupWizardShell.test.tsx`; a second file would leave the old 3-step
  assertions orphaned and failing in the shared Vitest lane).
- **Mandatory rewrite of stale assertions:** the existing file currently
  hard-asserts the old fixed 3-step body — `"First-run setup"`, `"Site Identity"`,
  `"Runtime URL"`, `"Security TTL"`, `"Next"` (setup-wizard.test.tsx:9-16) — which
  matched `SetupWizard.tsx`'s `useState<1 | 2 | 3>` step model (SetupWizard.tsx:50).
  This leaf replaces that body with the registry-driven shell, so those literal
  step-title assertions MUST be updated to the new shell's first-Basic-step label
  and step-rail output rather than left intact; re-assert the two behaviours the
  old file covered (the setup shell renders; the error banner renders with
  `error` — old "Setup error" case) against the new markup so no prior coverage
  is lost.
- Cases: navigation forward/back; Next disabled on invalid step; track toggle
  shows/hides advanced steps; last-step primary invokes `onSubmit` with the full
  `WizardValues`; error banner reflects both validation and server errors.
- No migration artifacts.
