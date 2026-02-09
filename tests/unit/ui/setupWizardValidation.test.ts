import { expect, test } from "bun:test";

import {
  toSetupWizardSettingsPayload,
  validateSetupWizard,
  validateSetupWizardStep,
} from "../../../core/admin/ui/setup/setupWizardValidation";

const validValues = {
  siteName: "Nextless",
  siteLocale: "en",
  publicBaseUrl: "https://www.example.com",
  authSessionTtlDays: "14",
  authResetTtlMinutes: "60",
};

test("validateSetupWizardStep validates URL and TTL bounds", () => {
  expect(validateSetupWizardStep(validValues, 1)).toBeNull();
  expect(validateSetupWizardStep(validValues, 2)).toBeNull();
  expect(validateSetupWizardStep(validValues, 3)).toBeNull();

  expect(
    validateSetupWizardStep({ ...validValues, publicBaseUrl: "ftp://example.com" }, 2)
  ).toContain("http or https");
  expect(
    validateSetupWizardStep({ ...validValues, authSessionTtlDays: "0" }, 3)
  ).toContain("between 1 and 365");
  expect(
    validateSetupWizardStep({ ...validValues, authResetTtlMinutes: "2" }, 3)
  ).toContain("between 5 and 1440");
});

test("validateSetupWizard validates complete payload", () => {
  expect(validateSetupWizard(validValues)).toBeNull();
  expect(validateSetupWizard({ ...validValues, siteName: "" })).toContain(
    "Site name is required"
  );
});

test("toSetupWizardSettingsPayload maps and normalizes values", () => {
  const payload = toSetupWizardSettingsPayload({
    ...validValues,
    publicBaseUrl: "https://www.example.com/",
  });

  expect(payload).toEqual({
    "site.name": "Nextless",
    "site.locale": "en",
    "site.publicBaseUrl": "https://www.example.com/",
    "auth.sessionTtlDays": 14,
    "auth.resetTtlMinutes": 60,
  });

  expect(() =>
    toSetupWizardSettingsPayload({
      ...validValues,
      authSessionTtlDays: "0",
    })
  ).toThrow("setup_wizard_invalid");
});
