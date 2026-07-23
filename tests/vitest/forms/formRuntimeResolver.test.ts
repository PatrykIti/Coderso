import { afterEach, expect, test, vi } from "vitest";

import { resolveFormSubmissionAccess } from "../../../core/services/forms/formRuntimeResolver";
import { buildFormColorTheme } from "./formColorConsumerTable";

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
  const preview = await resolveFormRuntimeData("form-1", { preview: true });

  expect(result.submissionAccess).toBe("public");
  expect(result.submissionNonce).toBeTypeOf("string");
  expect(result.botProtection).toEqual({
    provider: "recaptcha_v3",
    siteKey: "site-key-1",
    action: "public_write",
  });
  expect(result.successRedirectUrl).toBe("/done");
  expect(preview.fields.map((field) => field.name)).toEqual(["name"]);
  expect(preview.submissionNonce).toBeTypeOf("string");
  expect(preview.botProtection).toEqual({
    provider: "recaptcha_v3",
    siteKey: "site-key-1",
    action: "public_write",
  });
  expect(preview.error).toBeUndefined();
});

test("resolveFormRuntimeData keeps unpublished previews visual but strips write capability", async () => {
  process.env.FORM_SUBMIT_NONCE_SECRET = NONCE_SECRET;
  let status: "draft" | "archived" = "draft";
  const listFormFields = vi.fn(async () => [
    {
      id: "field-1",
      type: "text",
      label: "Name",
      name: "name",
      required: true,
      orderIndex: 0,
      settings: {},
    },
  ]);
  const getSecuritySettingsPublic = vi.fn(async () => {
    throw new Error("should_not_be_called");
  });

  vi.doMock("../../../core/services/forms/formsService", () => ({
    getForm: async () => ({
      id: "form-unpublished",
      name: "Unpublished",
      description: null,
      status,
      successMessage: null,
      successRedirectUrl: null,
      submissionAccess: "public",
      settings: {},
    }),
    listFormFields,
    toFieldRecord: (field: Record<string, unknown>) => field,
  }));
  vi.doMock("../../../core/services/settings/securitySettings", () => ({
    getSecuritySettingsPublic,
  }));

  const { resolveFormRuntimeData } =
    await import("../../../core/services/forms/formRuntimeResolver");

  for (const currentStatus of ["draft", "archived"] as const) {
    status = currentStatus;

    const publicRuntime = await resolveFormRuntimeData("form-unpublished", {
      preview: false,
    });
    expect(publicRuntime.status).toBe(currentStatus);
    expect(publicRuntime.submissionNonce).toBeNull();
    expect(publicRuntime.botProtection).toBeNull();
    expect(publicRuntime.fields).toEqual([]);
    expect(publicRuntime.error).toBe("form_unpublished");

    const preview = await resolveFormRuntimeData("form-unpublished", { preview: true });
    expect(preview.status).toBe(currentStatus);
    expect(preview.submissionNonce).toBeNull();
    expect(preview.botProtection).toBeNull();
    expect(preview.fields.map((field) => field.name)).toEqual(["name"]);
    expect(preview.error).toBeUndefined();
  }

  expect(listFormFields).toHaveBeenCalledTimes(2);
  expect(getSecuritySettingsPublic).not.toHaveBeenCalled();
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
        theme: { layout: { width: "full" }, ...buildFormColorTheme("raw") },
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
  expect(result.settings.theme).toEqual({
    layout: { width: "full" },
    ...buildFormColorTheme("canonical"),
  });
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

test("resolveFormRuntimeData omits only unsafe legacy patterns without mutating storage", async () => {
  process.env.FORM_SUBMIT_NONCE_SECRET = NONCE_SECRET;
  const safeSettings = { pattern: "^[A-Z]{2}\\d{4}$", helper: "Safe" };
  const unsafeSettings = { pattern: "^(ab)+$", helper: "Legacy" };
  const oversizedSettings = { pattern: "a".repeat(100_000), helper: "Oversized" };

  vi.doMock("../../../core/services/forms/formsService", () => ({
    getForm: async () => ({
      id: "form-patterns",
      name: "Patterns",
      description: null,
      status: "published",
      successMessage: null,
      successRedirectUrl: null,
      submissionAccess: "public",
      settings: {},
    }),
    listFormFields: async () => [
      {
        id: "safe",
        type: "text",
        label: "Safe",
        name: "safe",
        required: false,
        orderIndex: 0,
        settings: safeSettings,
      },
      {
        id: "unsafe",
        type: "text",
        label: "Unsafe",
        name: "unsafe",
        required: false,
        orderIndex: 1,
        settings: unsafeSettings,
      },
      {
        id: "oversized",
        type: "text",
        label: "Oversized",
        name: "oversized",
        required: false,
        orderIndex: 2,
        settings: oversizedSettings,
      },
    ],
    toFieldRecord: (field: Record<string, unknown>) => field,
  }));
  vi.doMock("../../../core/services/settings/securitySettings", () => ({
    getSecuritySettingsPublic: async () => ({ botProtection: { enabled: false } }),
  }));

  const { resolveFormRuntimeData } =
    await import("../../../core/services/forms/formRuntimeResolver");
  const result = await resolveFormRuntimeData("form-patterns", { preview: false });
  const preview = await resolveFormRuntimeData("form-patterns", { preview: true });

  expect(result.fields[0]?.settings).toBe(safeSettings);
  expect(result.fields[0]?.settings.pattern).toBe("^[A-Z]{2}\\d{4}$");
  expect(result.fields[1]?.settings).toEqual({ helper: "Legacy" });
  expect(result.fields[2]?.settings).toEqual({ helper: "Oversized" });
  expect(preview.fields[0]?.settings.pattern).toBe("^[A-Z]{2}\\d{4}$");
  expect(preview.fields[1]?.settings.pattern).toBeUndefined();
  expect(preview.fields[2]?.settings.pattern).toBeUndefined();
  expect(unsafeSettings.pattern).toBe("^(ab)+$");
  expect(oversizedSettings.pattern).toHaveLength(100_000);
});
