// TASK-482-07-L02: wizard-side session-TTL reconciliation. The resolver
// precedence + clamping matrix is ALREADY pinned in the Bun lane
// (tests/unit/auth/sessionService.test.ts) and is NOT duplicated here. These
// Vitest cases lock the *wizard-side* behaviour:
//   - the wizard emits exactly ONE canonical session-TTL key
//     (`auth.sessionTtlDays`), never `security.session.ttlDays`;
//   - the re-homed `auth.resetTtlMinutes` keeps its 5–1440 wizard bound;
//   - the effective-TTL advisory shown in the Security step matches the shared
//     resolver's output (via the same `Number(...)` coercion the step uses);
//   - the 1–365 session-TTL bound is enforced by the wizard validator.

import { describe, expect, test } from "vitest";

import { resolveSessionTtlDaysFromSources } from "../../../core/services/auth/sessionTtl";
import {
  toBasicSettingsPayload,
  toSetupWizardSettingsPayload,
  validateSecurityTtls,
  type SetupWizardValues,
} from "../../../core/admin/ui/setup/setupWizardValidation";
import type { WizardValues } from "../../../core/admin/ui/setup/wizardSteps";

const wizardValues = (overrides: Partial<WizardValues> = {}): WizardValues => ({
  siteName: "Coderso",
  siteLocale: "en",
  publicBaseUrl: "https://example.com",
  authSessionTtlDays: "14",
  authResetTtlMinutes: "60",
  siteTimezone: "UTC",
  adminBaseUrl: "",
  logoId: null,
  ...overrides,
});

const legacyValues = (overrides: Partial<SetupWizardValues> = {}): SetupWizardValues => ({
  siteName: "Coderso",
  siteLocale: "en",
  publicBaseUrl: "https://example.com",
  authSessionTtlDays: "14",
  authResetTtlMinutes: "60",
  ...overrides,
});

describe("wizard emits a single canonical session-TTL key", () => {
  test("toBasicSettingsPayload persists no auth-TTL key (the Advanced Security step owns them)", () => {
    const payload = toBasicSettingsPayload(wizardValues());
    const keys = Object.keys(payload);
    expect(keys).not.toContain("auth.sessionTtlDays");
    expect(keys).not.toContain("auth.resetTtlMinutes");
    // And it never writes the legacy session override.
    expect(keys).not.toContain("security.session.ttlDays");
  });

  test("the legacy finalize builder emits only auth.sessionTtlDays, never security.session.ttlDays", () => {
    const payload = toSetupWizardSettingsPayload(legacyValues());
    const keys = Object.keys(payload);
    expect(keys).toContain("auth.sessionTtlDays");
    expect(keys).not.toContain("security.session.ttlDays");
    expect(payload["auth.sessionTtlDays"]).toBe(14);
  });
});

describe("effective-TTL advisory matches the shared resolver (wizard coercion)", () => {
  // Mirrors SecurityStep: the wizard passes Number(values.authSessionTtlDays) as
  // the canonical source and the legacy security.session.ttlDays as the override.
  const effective = (values: WizardValues, legacySecurityTtl: number) =>
    resolveSessionTtlDaysFromSources({
      authSettingTtlDays: Number(values.authSessionTtlDays),
      securitySettingTtlDays: legacySecurityTtl,
    });

  test("a set canonical auth value wins over the legacy security override", () => {
    expect(effective(wizardValues({ authSessionTtlDays: "14" }), 7)).toBe(14);
  });

  test("a blank/non-numeric wizard value falls through to the security override", () => {
    // Number("") === 0 -> non-positive -> falls through (NOT a plain ?? chain).
    expect(effective(wizardValues({ authSessionTtlDays: "" }), 7)).toBe(7);
    expect(effective(wizardValues({ authSessionTtlDays: "abc" }), 30)).toBe(30);
  });
});

describe("re-homed reset TTL and session-TTL bounds are enforced by the wizard validator", () => {
  test("valid TTLs pass", () => {
    expect(validateSecurityTtls(wizardValues())).toBeNull();
  });

  test("session TTL out of the 1–365 range is rejected", () => {
    expect(validateSecurityTtls(wizardValues({ authSessionTtlDays: "0" }))).toMatch(/session/i);
    expect(validateSecurityTtls(wizardValues({ authSessionTtlDays: "400" }))).toMatch(/session/i);
  });

  test("reset TTL keeps its 5–1440-minute bound", () => {
    expect(validateSecurityTtls(wizardValues({ authResetTtlMinutes: "4" }))).toMatch(/reset/i);
    expect(validateSecurityTtls(wizardValues({ authResetTtlMinutes: "1441" }))).toMatch(/reset/i);
  });
});
