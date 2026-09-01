import { describe, expect, it } from "vitest";

import {
  INSTALLER_EMAIL_PATTERN,
  INSTALLER_NAME_MAX_LENGTH,
  INSTALLER_PASSWORD_MIN_LENGTH,
  evaluatePasswordRules,
  validateInstaller,
} from "../../../core/admin/ui/setup/installerValidation";
import {
  SETUP_WIZARD_DEFAULT_VALUES,
  toSetupWizardSettingsPayload,
  validateAdminBaseUrl,
  validatePublicBaseUrl,
  validateSecurityTtls,
  validateSetupWizard,
  validateSetupWizardStep,
  validateSiteLocale,
  validateSiteName,
  validateSiteTimezone,
} from "../../../core/admin/ui/setup/setupWizardValidation";
import { stripUnchangedSecret } from "../../../core/admin/ui/setup/steps/advanced/advancedStepUtils";
import {
  buildAssistantSiteBuilderIntakeBrowserState,
  buildEmptyAssistantSiteBuilderIntakeBrowserFactsHash,
  normalizeAssistantSiteBuilderIntakeBrowserState,
  serializeAssistantSiteBuilderIntakeBrowserState,
} from "../../../core/admin/ui/setup/assistantSiteBuilderIntakeBrowserState";
import {
  ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  type AssistantSiteBuilderIntakeSession,
} from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";

describe("installerValidation", () => {
  it("evaluatePasswordRules reports length, number, and special guidance", () => {
    expect(evaluatePasswordRules("").map((rule) => rule.met)).toEqual([false, false, false]);
    expect(evaluatePasswordRules("short1!a").map((rule) => rule.met)).toEqual([true, true, true]);
    expect(evaluatePasswordRules("longpassword").map((rule) => rule.met)).toEqual([
      true,
      false,
      false,
    ]);
    const [lengthRule] = evaluatePasswordRules("12345678");
    expect(lengthRule.label).toContain(String(INSTALLER_PASSWORD_MIN_LENGTH));
  });

  it.each([
    [{ name: "", email: "a@b.co", password: "12345678", confirm: "12345678" }, "Enter your name."],
    [
      { name: "x".repeat(201), email: "a@b.co", password: "12345678", confirm: "12345678" },
      `Name must be ${INSTALLER_NAME_MAX_LENGTH} characters or fewer.`,
    ],
    [
      { name: "Ada", email: "not-an-email", password: "12345678", confirm: "12345678" },
      "Enter a valid email address.",
    ],
    [
      { name: "Ada", email: "a@b.co", password: "1234567", confirm: "1234567" },
      `Password must be at least ${INSTALLER_PASSWORD_MIN_LENGTH} characters.`,
    ],
    [
      { name: "Ada", email: "a@b.co", password: "12345678", confirm: "87654321" },
      "Passwords do not match.",
    ],
  ])("validateInstaller rejects %#", (form, expected) => {
    expect(validateInstaller(form as never)).toBe(expected);
  });

  it("accepts a valid trimmed form", () => {
    expect(
      validateInstaller({
        name: " Ada ",
        email: " a@b.co ",
        password: "12345678",
        confirm: "12345678",
      })
    ).toBeNull();
  });

  it("exposes the server-mirrored email pattern", () => {
    expect(INSTALLER_EMAIL_PATTERN.test("user@example.com")).toBe(true);
    expect(INSTALLER_EMAIL_PATTERN.test("user at example")).toBe(false);
  });
});

describe("setupWizardValidation", () => {
  it.each([
    ["", null],
    ["https://example.com", null],
    ["http://localhost:3000", null],
    ["ftp://example.com", "Public Site URL must use http or https."],
    ["not a url", "Enter a valid URL (for example: https://example.com)."],
  ])("validatePublicBaseUrl(%j)", (value, expected) => {
    expect(validatePublicBaseUrl(value)).toBe(expected);
  });

  it.each([
    ["", null],
    ["https://admin.example.com", null],
    ["javascript:alert(1)", "Admin URL must use http or https."],
    [":::", "Enter a valid URL (for example: https://example.com)."],
  ])("validateAdminBaseUrl(%j)", (value, expected) => {
    expect(validateAdminBaseUrl(value)).toBe(expected);
  });

  it.each([
    [{ authSessionTtlDays: "", authResetTtlMinutes: "" }, false],
    [{ authSessionTtlDays: "0", authResetTtlMinutes: "60" }, false],
    [{ authSessionTtlDays: "366", authResetTtlMinutes: "60" }, false],
    [{ authSessionTtlDays: "14", authResetTtlMinutes: "4" }, false],
    [{ authSessionTtlDays: "14", authResetTtlMinutes: "1441" }, false],
    [{ authSessionTtlDays: "abc", authResetTtlMinutes: "60" }, false],
    [{ authSessionTtlDays: "14", authResetTtlMinutes: "60" }, true],
    [{ authSessionTtlDays: "365", authResetTtlMinutes: "5" }, true],
  ])("validateSecurityTtls bounds (%j)", (values, ok) => {
    const error = validateSecurityTtls(values);
    expect(error === null).toBe(ok);
  });

  it("per-field validators require non-empty trims", () => {
    expect(validateSiteName({ siteName: "  " })).toBe("Site name is required.");
    expect(validateSiteLocale({ siteLocale: "" })).toBe("Site locale is required.");
    expect(validateSiteTimezone({ siteTimezone: " " })).toBe("Timezone is required.");
    expect(validateSiteName({ siteName: "Coderso" })).toBeNull();
  });

  it("validateSetupWizardStep composes validators per phase", () => {
    const base = { ...SETUP_WIZARD_DEFAULT_VALUES };
    expect(validateSetupWizardStep(base, 1)).toBeNull();
    expect(validateSetupWizardStep({ ...base, siteName: "" }, 1)).toBe("Site name is required.");
    expect(validateSetupWizardStep({ ...base, siteLocale: "" }, 1)).toBe(
      "Site locale is required."
    );
    expect(validateSetupWizardStep({ ...base, publicBaseUrl: "nope" }, 2)).toBe(
      "Enter a valid URL (for example: https://example.com)."
    );
    expect(validateSetupWizardStep({ ...base, authSessionTtlDays: "0" }, 3)).toBe(
      "Auth session TTL must be between 1 and 365 days."
    );
  });

  it("validateSetupWizard returns the first failure across phases", () => {
    expect(validateSetupWizard(SETUP_WIZARD_DEFAULT_VALUES)).toBeNull();
    expect(validateSetupWizard({ ...SETUP_WIZARD_DEFAULT_VALUES, authResetTtlMinutes: "1" })).toBe(
      "Password reset TTL must be between 5 and 1440 minutes."
    );
  });

  it("toSetupWizardSettingsPayload maps keys or throws when invalid", () => {
    expect(toSetupWizardSettingsPayload(SETUP_WIZARD_DEFAULT_VALUES)).toEqual({
      "site.name": "Coderso",
      "site.locale": "en",
      "site.publicBaseUrl": null,
      "auth.sessionTtlDays": 14,
      "auth.resetTtlMinutes": 60,
    });
    expect(() =>
      toSetupWizardSettingsPayload({ ...SETUP_WIZARD_DEFAULT_VALUES, siteName: "" })
    ).toThrow("setup_wizard_invalid");
  });

  it("stripUnchangedSecret omits blank secrets and trims replacements", () => {
    expect(stripUnchangedSecret("   ")).toBeUndefined();
    expect(stripUnchangedSecret("")).toBeUndefined();
    expect(stripUnchangedSecret("  s3cret ")).toBe("s3cret");
  });
});

// TASK-105-08-09 (L09, setup-core cluster): residual parsing/validation branches
// of the browser-state normalizer (core/admin/ui/setup/assistantSiteBuilderIntakeBrowserState.ts)
// that the dedicated intake suites do not reach, asserted table-driven.
const intakeBrowserSession = (): AssistantSiteBuilderIntakeSession => ({
  version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
  mode: "basic",
  currentStepId: "business-profile",
  answers: [
    {
      stepId: "business-profile",
      values: {
        siteName: "Provider Finder",
        topic: "directory",
        locale: "en",
      },
    },
  ],
  facts: {
    answeredStepIds: ["business-profile"],
    missingRequiredStepIds: [],
    missingReviewInputStepIds: [],
    readyForReview: false,
    readyForExecution: false,
    redactionApplied: false,
  },
});

const INTAKE_NOW_MS = Date.parse("2026-06-05T12:00:00.000Z");

describe("assistantSiteBuilderIntakeBrowserState normalizer residual branches", () => {
  it("rejects non-string or unparseable savedAt/expiresAt dates", () => {
    const state = buildAssistantSiteBuilderIntakeBrowserState(intakeBrowserSession(), {
      nowMs: INTAKE_NOW_MS,
    });
    expect(
      normalizeAssistantSiteBuilderIntakeBrowserState(
        { ...state, savedAt: 12345 },
        { nowMs: INTAKE_NOW_MS + 1000 }
      )
    ).toBeNull();
    expect(
      normalizeAssistantSiteBuilderIntakeBrowserState(
        { ...state, expiresAt: "not-a-date" },
        { nowMs: INTAKE_NOW_MS + 1000 }
      )
    ).toBeNull();
    expect(
      normalizeAssistantSiteBuilderIntakeBrowserState(
        { ...state, savedAt: "garbage" },
        { nowMs: INTAKE_NOW_MS + 1000 }
      )
    ).toBeNull();
  });

  it("rejects a non-array answeredStepIds", () => {
    const state = buildAssistantSiteBuilderIntakeBrowserState(intakeBrowserSession(), {
      nowMs: INTAKE_NOW_MS,
    });
    expect(
      normalizeAssistantSiteBuilderIntakeBrowserState(
        {
          ...state,
          session: { ...state.session, answeredStepIds: "business-profile" },
        },
        { nowMs: INTAKE_NOW_MS + 1000 }
      )
    ).toBeNull();
  });

  it("rejects circular payloads instead of throwing", () => {
    const circular: Record<string, unknown> = { schemaVersion: 1 };
    circular.self = circular;
    expect(
      normalizeAssistantSiteBuilderIntakeBrowserState(circular, {
        nowMs: INTAKE_NOW_MS + 1000,
      })
    ).toBeNull();
  });

  it("rejects unparseable JSON strings", () => {
    expect(
      normalizeAssistantSiteBuilderIntakeBrowserState("{oops", {
        nowMs: INTAKE_NOW_MS + 1000,
      })
    ).toBeNull();
  });

  it("rejects a session that is not a plain record", () => {
    const state = buildAssistantSiteBuilderIntakeBrowserState(intakeBrowserSession(), {
      nowMs: INTAKE_NOW_MS,
    });
    expect(
      normalizeAssistantSiteBuilderIntakeBrowserState(
        { ...state, session: "oops" },
        { nowMs: INTAKE_NOW_MS + 1000 }
      )
    ).toBeNull();
  });

  it("serialize returns null for a state that fails normalization", () => {
    const state = buildAssistantSiteBuilderIntakeBrowserState(intakeBrowserSession(), {
      nowMs: INTAKE_NOW_MS,
    });
    // an unparseable savedAt makes Date.parse(...) NaN, so the normalizer rejects
    // the state and serialize must bail out with null instead of emitting garbage
    expect(
      serializeAssistantSiteBuilderIntakeBrowserState({ ...state, savedAt: "not-a-date" })
    ).toBeNull();
  });

  it("buildEmptyAssistantSiteBuilderIntakeBrowserFactsHash returns a stable empty hash", () => {
    const hash = buildEmptyAssistantSiteBuilderIntakeBrowserFactsHash();
    expect(hash).toMatch(/^[a-f0-9]{8,64}$/);
    expect(buildEmptyAssistantSiteBuilderIntakeBrowserFactsHash()).toBe(hash);
  });
});
