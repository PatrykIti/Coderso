# TASK-482-04-L01: Step-framework state machine (registry, validation, dirty/resume, tracks)
# FileName: TASK-482-04-L01-Step-Framework.md

**Parent Subtask:** TASK-482-04
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

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
    assistant). **This leaf also OWNS and exports the shared `WizardValues`
    type** here — the single wizard-values shape consumed by 05-L02's
    `toBasicSettingsPayload`, 08-L01's `completeSetup`, and 04-L02's
    `SetupWizardProps.onSubmit`. Consumers import it from this module; they must
    NOT define a competing values type.
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

```ts
export type WizardTrack = "basic" | "advanced";

// 04-L01 OWNS the shared wizard-values type (exported from wizardSteps.ts).
// It is a structural superset of SetupWizardValues (setupWizardValidation.ts:1)
// plus every field the concrete steps persist. It MUST explicitly list the
// Basic-track keys 05-L02's `toBasicSettingsPayload` reads (siteTimezone,
// adminBaseUrl, logoId) — omitting them would break that map's typecheck.
export type WizardValues = SetupWizardValues & {
  siteTimezone: string;          // 05-L01 timezone key
  adminBaseUrl: string;          // 05-L02 admin-URL step (site.adminBaseUrl)
  logoId?: string | null;        // 05-L02 branding step (gated on TASK-359-04)
  // ...advanced (email/storage/security/assistant) fields added by 07
};

export type WizardState = {
  values: WizardValues;
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
