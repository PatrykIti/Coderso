import { afterEach, expect, test, vi } from "vitest";

import { resolveFormSubmissionAccess } from "../../../core/services/forms/formRuntimeResolver";

const NONCE_SECRET = "coderso_form_runtime_nonce_secret_for_tests";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  delete process.env.FORM_SUBMIT_NONCE_SECRET;
});

test("resolveFormSubmissionAccess defaults to public when missing", () => {
  expect(resolveFormSubmissionAccess(undefined)).toBe("public");
  expect(resolveFormSubmissionAccess(null)).toBe("public");
});

test("resolveFormSubmissionAccess accepts valid modes", () => {
  expect(resolveFormSubmissionAccess("public")).toBe("public");
  expect(resolveFormSubmissionAccess("internal")).toBe("internal");
});

test("resolveFormSubmissionAccess rejects unknown mode", () => {
  expect(() => resolveFormSubmissionAccess("private")).toThrow("form_invalid");
});

test("resolveFormRuntimeData projects nonce and safe captcha metadata for public forms", async () => {
  process.env.FORM_SUBMIT_NONCE_SECRET = NONCE_SECRET;

  vi.doMock("../../../core/services/forms/formsService", () => ({
    getForm: async () => ({
      id: "form-1",
      name: "Contact",
      description: "Ask anything",
      status: "published",
      successMessage: "Thanks",
      successRedirectUrl: "/done",
      submissionAccess: "public",
      settings: {
        layoutMode: "multi_step",
        saveProgress: true,
        stepTitles: ["Contact", "Details"],
        preset: "custom",
        automationRetry: {
          enabled: false,
          maxAttempts: 1,
          baseDelayMs: 300,
          maxDelayMs: 2000,
        },
      },
    }),
    listFormFields: async () => [
      {
        id: "field-1",
        type: "text",
        label: "Name",
        name: "name",
        required: true,
        settings: {},
      },
    ],
    toFieldRecord: (field: Record<string, unknown>) => field,
  }));

  vi.doMock("../../../core/services/settings/securitySettings", () => ({
    getSecuritySettingsPublic: async () => ({
      botProtection: {
        enabled: true,
        provider: "recaptcha_v3",
        siteKey: "site-key-1",
        secretKey: { configured: true },
        thresholds: {
          login: 0.5,
          reset: 0.6,
          publicWrite: 0.5,
        },
        enforceOnLocalhost: true,
      },
      passwordPepperConfigured: true,
    }),
  }));

  const { resolveFormRuntimeData } =
    await import("../../../core/services/forms/formRuntimeResolver");

  const result = await resolveFormRuntimeData("form-1", { preview: false });

  expect(result.submissionAccess).toBe("public");
  expect(result.submissionNonce).toBeTypeOf("string");
  expect(result.botProtection).toEqual({
    provider: "recaptcha_v3",
    siteKey: "site-key-1",
    action: "public_write",
  });
  expect(result.successRedirectUrl).toBe("/done");
});

test("resolveFormRuntimeData omits captcha projection for internal forms", async () => {
  process.env.FORM_SUBMIT_NONCE_SECRET = NONCE_SECRET;

  vi.doMock("../../../core/services/forms/formsService", () => ({
    getForm: async () => ({
      id: "form-2",
      name: "Internal",
      description: null,
      status: "draft",
      successMessage: null,
      successRedirectUrl: null,
      submissionAccess: "internal",
      settings: {
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
        preset: "custom",
        automationRetry: {
          enabled: false,
          maxAttempts: 1,
          baseDelayMs: 300,
          maxDelayMs: 2000,
        },
      },
    }),
    listFormFields: async () => [],
    toFieldRecord: (field: Record<string, unknown>) => field,
  }));

  vi.doMock("../../../core/services/settings/securitySettings", () => ({
    getSecuritySettingsPublic: async () => {
      throw new Error("should_not_be_called");
    },
  }));

  const { resolveFormRuntimeData } =
    await import("../../../core/services/forms/formRuntimeResolver");

  const result = await resolveFormRuntimeData("form-2", { preview: false });

  expect(result.submissionAccess).toBe("internal");
  expect(result.submissionNonce).toBeNull();
  expect(result.botProtection).toBeNull();
  expect(result.error).toBe("form_unpublished");
});

test("resolveFormRuntimeData projects settings.theme when the form sets one (516-06)", async () => {
  process.env.FORM_SUBMIT_NONCE_SECRET = NONCE_SECRET;

  vi.doMock("../../../core/services/forms/formsService", () => ({
    getForm: async () => ({
      id: "form-theme",
      name: "Themed",
      description: null,
      status: "published",
      successMessage: null,
      successRedirectUrl: null,
      submissionAccess: "public",
      settings: {
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
        preset: "custom",
        automationRetry: {
          enabled: false,
          maxAttempts: 1,
          baseDelayMs: 300,
          maxDelayMs: 2000,
        },
        theme: {
          layout: { width: "full" },
          submit: { background: "#00ff00" },
        },
      },
    }),
    listFormFields: async () => [
      { id: "field-1", type: "text", label: "Name", name: "name", required: true, settings: {} },
    ],
    toFieldRecord: (field: Record<string, unknown>) => field,
  }));

  vi.doMock("../../../core/services/settings/securitySettings", () => ({
    getSecuritySettingsPublic: async () => ({
      botProtection: { enabled: false },
      passwordPepperConfigured: true,
    }),
  }));

  const { resolveFormRuntimeData } =
    await import("../../../core/services/forms/formRuntimeResolver");

  const result = await resolveFormRuntimeData("form-theme", { preview: false });

  expect(result.settings.theme).toBeDefined();
  expect(result.settings.theme?.layout?.width).toBe("full");
  expect(result.settings.theme?.submit?.background).toBe("#00ff00");
});

test("resolveFormRuntimeData omits settings.theme when the form has none (516-06)", async () => {
  process.env.FORM_SUBMIT_NONCE_SECRET = NONCE_SECRET;

  vi.doMock("../../../core/services/forms/formsService", () => ({
    getForm: async () => ({
      id: "form-no-theme",
      name: "Plain",
      description: null,
      status: "published",
      successMessage: null,
      successRedirectUrl: null,
      submissionAccess: "public",
      settings: {
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
        preset: "custom",
        automationRetry: {
          enabled: false,
          maxAttempts: 1,
          baseDelayMs: 300,
          maxDelayMs: 2000,
        },
      },
    }),
    listFormFields: async () => [
      { id: "field-1", type: "text", label: "Name", name: "name", required: true, settings: {} },
    ],
    toFieldRecord: (field: Record<string, unknown>) => field,
  }));

  vi.doMock("../../../core/services/settings/securitySettings", () => ({
    getSecuritySettingsPublic: async () => ({
      botProtection: { enabled: false },
      passwordPepperConfigured: true,
    }),
  }));

  const { resolveFormRuntimeData } =
    await import("../../../core/services/forms/formRuntimeResolver");

  const result = await resolveFormRuntimeData("form-no-theme", { preview: false });

  expect(result.settings.theme).toBeUndefined();
  expect("theme" in result.settings).toBe(false);
});

test("resolveFormRuntimeData does not project public fields for published internal forms", async () => {
  process.env.FORM_SUBMIT_NONCE_SECRET = NONCE_SECRET;

  vi.doMock("../../../core/services/forms/formsService", () => ({
    getForm: async () => ({
      id: "form-3",
      name: "Internal published",
      description: "Private",
      status: "published",
      successMessage: null,
      successRedirectUrl: null,
      submissionAccess: "internal",
      settings: {
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
        preset: "custom",
        automationRetry: {
          enabled: false,
          maxAttempts: 1,
          baseDelayMs: 300,
          maxDelayMs: 2000,
        },
      },
    }),
    listFormFields: async () => {
      throw new Error("should_not_project_public_fields");
    },
    toFieldRecord: (field: Record<string, unknown>) => field,
  }));

  vi.doMock("../../../core/services/settings/securitySettings", () => ({
    getSecuritySettingsPublic: async () => {
      throw new Error("should_not_be_called");
    },
  }));

  const { resolveFormRuntimeData } =
    await import("../../../core/services/forms/formRuntimeResolver");

  const result = await resolveFormRuntimeData("form-3", { preview: false });

  expect(result.submissionAccess).toBe("internal");
  expect(result.submissionNonce).toBeNull();
  expect(result.botProtection).toBeNull();
  expect(result.fields).toEqual([]);
  expect(result.error).toBe("public_submission_disabled");
});
