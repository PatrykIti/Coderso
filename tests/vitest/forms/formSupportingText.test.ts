import Ajv from "ajv";
import { expect, test } from "vitest";

import {
  FORM_SCHEMA_LIMITS,
  formSettingsSchema,
  normalizeFormSettings,
} from "../../../core/services/forms/formSettings";
import { FORM_THEME_DEFAULTS, resolveFormTheme } from "../../../core/services/forms/formTheme";
import { formCreateSchema, formUpdateSchema } from "../../../core/server/validation/formSchemas";
import {
  FORM_EMBED_LOADING_LABEL_MAX_LENGTH,
  FORM_EMBED_SUCCESS_BEHAVIORS,
  FORM_EMBED_TEXTAREA_ROWS_LIMITS,
  clampSavedProgressTtl,
  formEmbedDefaults,
  formEmbedSchema,
  normalizeFormEmbedData,
  resolveFormEmbedFieldPresentation,
} from "../../../core/services/renderContracts/formEmbedContract";

const ajv = new Ajv({
  allErrors: true,
  strict: true,
  strictTypes: false,
  allowUnionTypes: true,
});

const validateCreate = ajv.compile(formCreateSchema);
const validateUpdate = ajv.compile(formUpdateSchema);
const validateSettings = ajv.compile(formSettingsSchema);
const validateEmbed = ajv.compile(formEmbedSchema);

test("supporting text is allowlisted, trimmed, and resolved only when authored", () => {
  const settings = normalizeFormSettings({
    theme: {
      submit: {
        label: "Wyślij brief",
        supportingText: "  Odpisujemy zwykle w ciągu jednego dnia roboczego.  ",
      },
    },
  });

  expect(settings.theme).toEqual({
    submit: {
      label: "Wyślij brief",
      supportingText: "Odpisujemy zwykle w ciągu jednego dnia roboczego.",
    },
  });
  expect(resolveFormTheme(settings.theme).submit.supportingText).toBe(
    "Odpisujemy zwykle w ciągu jednego dnia roboczego."
  );
  expect(
    validateCreate({
      name: "Form",
      settings: {
        theme: {
          submit: {
            supportingText: "Short helper copy",
          },
        },
      },
    })
  ).toBe(true);
  expect(
    validateUpdate({
      settings: {
        theme: {
          submit: {
            supportingText: "Short helper copy",
          },
        },
      },
    })
  ).toBe(true);
});

test("supporting text stays present-only for defaults and legacy documents", () => {
  expect("supportingText" in FORM_THEME_DEFAULTS.submit).toBe(false);
  const resolvedDefault = resolveFormTheme(undefined);
  expect("supportingText" in resolvedDefault.submit).toBe(false);

  const normalized = normalizeFormSettings({ theme: { submit: { label: "Wyślij brief" } } });
  expect(normalized.theme).toEqual({ submit: { label: "Wyślij brief" } });
  expect("supportingText" in (normalized.theme?.submit ?? {})).toBe(false);
  expect("supportingText" in resolveFormTheme(normalized.theme).submit).toBe(false);
});

test("supporting text rejects blank, oversized, and unknown sibling keys", () => {
  const oversized = "x".repeat(FORM_SCHEMA_LIMITS.submitSupportingText + 1);
  const normalizedBlank = normalizeFormSettings({
    theme: {
      submit: {
        label: "Wyślij brief",
        supportingText: "   ",
      },
    },
  });
  expect(normalizedBlank.theme).toEqual({ submit: { label: "Wyślij brief" } });

  const normalizedOversized = normalizeFormSettings({
    theme: {
      submit: {
        label: "Wyślij brief",
        supportingText: oversized,
      },
    },
  });
  expect(normalizedOversized.theme).toEqual({ submit: { label: "Wyślij brief" } });

  expect(
    validateCreate({
      name: "Form",
      settings: {
        theme: {
          submit: {
            supportingText: "   ",
          },
        },
      },
    })
  ).toBe(false);
  expect(
    validateCreate({
      name: "Form",
      settings: {
        theme: {
          submit: {
            supportingText: oversized,
          },
        },
      },
    })
  ).toBe(false);
  expect(
    validateCreate({
      name: "Form",
      settings: {
        theme: {
          submit: {
            supportingText: "Short helper copy",
            unexpected: true,
          },
        },
      },
    })
  ).toBe(false);
});

test("supporting text accepts exact string boundaries and preserves submit siblings", () => {
  for (const supportingText of ["ż", "ż".repeat(FORM_SCHEMA_LIMITS.submitSupportingText)]) {
    expect(validateSettings({ theme: { submit: { supportingText } } })).toBe(true);
  }
  for (const supportingText of [
    "",
    "   ",
    "x".repeat(FORM_SCHEMA_LIMITS.submitSupportingText + 1),
    42,
  ]) {
    expect(validateSettings({ theme: { submit: { supportingText } } })).toBe(false);
  }

  const normalized = normalizeFormSettings({
    theme: {
      submit: {
        label: "Wyślij brief",
        fullWidth: false,
        radius: "xl",
        supportingText: "  Zażółć gęślą jaźń.  ",
      },
    },
  });
  expect(normalized.theme?.submit).toEqual({
    label: "Wyślij brief",
    fullWidth: false,
    radius: "xl",
    supportingText: "Zażółć gęślą jaźń.",
  });
  expect(resolveFormTheme(normalized.theme).submit.supportingText).toBe("Zażółć gęślą jaźń.");
});

test("Form Embed public boundary re-exports present-only presentation owners", () => {
  expect(FORM_EMBED_TEXTAREA_ROWS_LIMITS).toEqual({ min: 2, max: 20, legacyDefault: 4 });
  expect(FORM_EMBED_LOADING_LABEL_MAX_LENGTH).toBe(1_000);
  expect(FORM_EMBED_SUCCESS_BEHAVIORS).toEqual([
    "show-message-hide-form",
    "show-message-reset-form",
    "show-message-keep-form",
  ]);
  expect(clampSavedProgressTtl(99)).toBe(30);
});

test("Form Embed schema owns rows, prompt, bounded loading and success behavior", () => {
  for (const textareaRows of [
    FORM_EMBED_TEXTAREA_ROWS_LIMITS.min,
    FORM_EMBED_TEXTAREA_ROWS_LIMITS.max,
  ]) {
    expect(validateEmbed({ fields: { textareaRows } })).toBe(true);
  }
  for (const textareaRows of [1, 21, 4.5, "5"]) {
    expect(validateEmbed({ fields: { textareaRows } })).toBe(false);
  }
  expect(validateEmbed({ fields: { showSelectPrompt: false } })).toBe(true);
  expect(validateEmbed({ fields: { showSelectPrompt: "false" } })).toBe(false);

  for (const loadingLabel of ["x", "x".repeat(FORM_EMBED_LOADING_LABEL_MAX_LENGTH)]) {
    expect(validateEmbed({ submitBehavior: { loadingLabel } })).toBe(true);
  }
  for (const loadingLabel of ["", "   ", "x".repeat(FORM_EMBED_LOADING_LABEL_MAX_LENGTH + 1)]) {
    expect(validateEmbed({ submitBehavior: { loadingLabel } })).toBe(false);
  }
  for (const successBehavior of FORM_EMBED_SUCCESS_BEHAVIORS) {
    expect(validateEmbed({ submitBehavior: { successBehavior } })).toBe(true);
  }
  expect(validateEmbed({ submitBehavior: { successBehavior: "unknown" } })).toBe(false);
  expect(validateEmbed({ fields: { textareaRows: 5, unexpected: true } })).toBe(false);
});

test("Form Embed keeps the two new field keys present-only and resolves legacy rendering", () => {
  expect(formEmbedDefaults.fields).toEqual({
    showLabels: true,
    showRequiredIndicator: true,
  });
  const legacy = normalizeFormEmbedData({});
  expect(legacy.fields).toEqual({ showLabels: true, showRequiredIndicator: true });
  expect(JSON.stringify(legacy.fields)).toBe(
    JSON.stringify({ showLabels: true, showRequiredIndicator: true })
  );
  expect(resolveFormEmbedFieldPresentation(legacy.fields)).toEqual({
    textareaRows: FORM_EMBED_TEXTAREA_ROWS_LIMITS.legacyDefault,
    showSelectPrompt: true,
  });

  const authored = normalizeFormEmbedData({
    fields: { textareaRows: 5, showSelectPrompt: false },
    submitBehavior: {
      loadingLabel: "  Wysyłanie...  ",
      successBehavior: "show-message-keep-form",
    },
  });
  expect(authored.fields).toEqual({
    showLabels: true,
    showRequiredIndicator: true,
    textareaRows: 5,
    showSelectPrompt: false,
  });
  expect(authored.submitBehavior).toEqual({
    loadingLabel: "Wysyłanie...",
    successBehavior: "show-message-keep-form",
  });

  const invalid = normalizeFormEmbedData({
    fields: { textareaRows: 100, showSelectPrompt: "no" as never },
    submitBehavior: { loadingLabel: "x".repeat(1_001) },
  });
  expect(invalid.fields).toEqual({ showLabels: true, showRequiredIndicator: true });
  expect(invalid.submitBehavior).toEqual({
    loadingLabel: "Sending...",
    successBehavior: "show-message-hide-form",
  });
});
