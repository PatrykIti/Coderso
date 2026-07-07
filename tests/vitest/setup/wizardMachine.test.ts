// TASK-482-04-L01: pure-logic lane for the Phase-2 wizard state machine. No DOM,
// no DB — reducer/selectors only. Also guards that the migrated URL/TTL
// validators (setupWizardValidation.ts) still reject the same inputs.

import { expect, test } from "vitest";

import {
  canAdvance,
  currentStep,
  goToStep,
  initWizardState,
  markDirty,
  nextStep,
  prevStep,
  reduce,
  resolveResumeStep,
  toggleAdvanced,
  visibleSteps,
} from "../../../core/admin/ui/setup/wizardMachine";
import {
  validateAdminBaseUrl,
  validatePublicBaseUrl,
  validateSecurityTtls,
  validateSetupWizardStep,
} from "../../../core/admin/ui/setup/setupWizardValidation";
import type { WizardState } from "../../../core/admin/ui/setup/wizardSteps";

const patched = (state: WizardState, patch: Record<string, unknown>): WizardState =>
  reduce(state, { type: "patch", patch: patch as never });

test("initWizardState starts on the first Basic step with Advanced hidden", () => {
  const state = initWizardState();
  expect(state.currentStepId).toBe("identity");
  expect(state.advancedEnabled).toBe(false);
  expect(visibleSteps(state).map((s) => s.id)).toEqual([
    "identity",
    "branding",
    "locale",
    "timezone",
    "urls",
    "starter-content",
  ]);
});

test("initWizardState seeds superset defaults + merges initialValues", () => {
  const state = initWizardState({ siteName: "Acme" });
  expect(state.values.siteName).toBe("Acme");
  expect(state.values.siteTimezone).toBe("UTC");
  expect(state.values.adminBaseUrl).toBe("");
  expect(state.values.logoId).toBeNull();
});

test("next advances only when the current step validates", () => {
  const blocked = patched(initWizardState(), { siteName: "  " });
  expect(canAdvance(blocked)).toBe(false);
  expect(nextStep(blocked).currentStepId).toBe("identity"); // no-op

  const ok = patched(initWizardState(), { siteName: "Acme" });
  expect(canAdvance(ok)).toBe(true);
  expect(nextStep(ok).currentStepId).toBe("branding");
});

test("prev retreats within the visible set and clamps at the first step", () => {
  const onBranding = reduce(initWizardState(), { type: "goto", id: "branding" });
  expect(prevStep(onBranding).currentStepId).toBe("identity");
  expect(prevStep(initWizardState()).currentStepId).toBe("identity"); // clamp
});

test("goto only moves to a visible step", () => {
  const basic = initWizardState();
  expect(goToStep(basic, "security").currentStepId).toBe("identity"); // advanced hidden
  expect(goToStep(basic, "locale").currentStepId).toBe("locale");
});

test("toggling Advanced reveals advanced steps", () => {
  const advanced = toggleAdvanced(initWizardState(), true);
  expect(advanced.advancedEnabled).toBe(true);
  expect(visibleSteps(advanced).map((s) => s.id)).toContain("security");
  expect(visibleSteps(advanced).map((s) => s.id)).toContain("email");
});

test("toggling Advanced off hides advanced steps and clamps currentStepId back", () => {
  const onSecurity = goToStep(toggleAdvanced(initWizardState(), true), "security");
  expect(onSecurity.currentStepId).toBe("security");

  const clamped = toggleAdvanced(onSecurity, false);
  const visibleIds = visibleSteps(clamped).map((s) => s.id);
  expect(visibleIds).not.toContain("security");
  expect(visibleIds).toContain(clamped.currentStepId);
});

test("resolveResumeStep returns the first incomplete visible step", () => {
  const missingLocale = patched(initWizardState(), { siteName: "Acme", siteLocale: "" });
  expect(resolveResumeStep(missingLocale)).toBe("locale");

  // All required Basic fields satisfied by defaults ⇒ falls back to last visible.
  expect(resolveResumeStep(initWizardState())).toBe("starter-content");
});

test("patch marks the current step dirty and updates values", () => {
  const state = reduce(initWizardState(), { type: "patch", patch: { siteName: "Acme" } });
  expect(state.values.siteName).toBe("Acme");
  expect(state.dirtyStepIds.has("identity")).toBe(true);
});

test("markDirty and complete accumulate ids immutably", () => {
  const base = initWizardState();
  const dirty = markDirty(base, "locale");
  expect(base.dirtyStepIds.has("locale")).toBe(false);
  expect(dirty.dirtyStepIds.has("locale")).toBe(true);

  const done = reduce(base, { type: "complete", id: "identity" });
  expect(done.completedStepIds.has("identity")).toBe(true);
});

test("the urls step surfaces the migrated public/admin URL validators", () => {
  const step = () => currentStep(goToStep(initWizardState(), "urls"))!;
  const badPublic = patched(goToStep(initWizardState(), "urls"), {
    publicBaseUrl: "ftp://nope",
  });
  expect(step().validate(badPublic.values)).toBe("Public Site URL must use http or https.");

  const badAdmin = patched(goToStep(initWizardState(), "urls"), {
    adminBaseUrl: "not a url",
  });
  expect(step().validate(badAdmin.values)).toContain("valid URL");
});

test("the security step surfaces the migrated TTL validator", () => {
  const advanced = toggleAdvanced(initWizardState(), true);
  const onSecurity = goToStep(advanced, "security");
  const bad = patched(onSecurity, { authSessionTtlDays: "0" });
  expect(currentStep(bad)!.validate(bad.values)).toBe(
    "Auth session TTL must be between 1 and 365 days."
  );
});

// Regression guard: the granular validators reject exactly what the legacy
// step validators rejected before the 04-L01 refactor.
test("migrated validators reject the same inputs as before", () => {
  expect(validatePublicBaseUrl("ftp://x")).toBe("Public Site URL must use http or https.");
  expect(validatePublicBaseUrl("")).toBeNull();
  expect(validateAdminBaseUrl("nope")).toContain("valid URL");
  expect(validateAdminBaseUrl("https://ok.example")).toBeNull();
  expect(validateSecurityTtls({ authSessionTtlDays: "0", authResetTtlMinutes: "60" })).toBe(
    "Auth session TTL must be between 1 and 365 days."
  );
  expect(validateSecurityTtls({ authSessionTtlDays: "14", authResetTtlMinutes: "1" })).toBe(
    "Password reset TTL must be between 5 and 1440 minutes."
  );
  expect(
    validateSetupWizardStep(
      {
        siteName: "",
        siteLocale: "en",
        publicBaseUrl: "",
        authSessionTtlDays: "14",
        authResetTtlMinutes: "60",
      },
      1
    )
  ).toBe("Site name is required.");
});
