import Ajv from "ajv";
import { expect, test } from "vitest";

import { FORM_SCHEMA_LIMITS, normalizeFormSettings } from "../../../core/services/forms/formSettings";
import { FORM_THEME_DEFAULTS, resolveFormTheme } from "../../../core/services/forms/formTheme";
import { formCreateSchema, formUpdateSchema } from "../../../core/server/validation/formSchemas";

const ajv = new Ajv({
  allErrors: true,
  strict: true,
  strictTypes: false,
  allowUnionTypes: true,
});

const validateCreate = ajv.compile(formCreateSchema);
const validateUpdate = ajv.compile(formUpdateSchema);

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
