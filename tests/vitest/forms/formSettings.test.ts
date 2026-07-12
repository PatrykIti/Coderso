import Ajv from "ajv";
import { describe, expect, test } from "vitest";

import {
  FORM_SCHEMA_LIMITS,
  formSettingsSchema,
  getDefaultFormSettings,
  normalizeFormSettings,
  normalizeFormStep,
  resolveStepTitle,
} from "../../../core/services/forms/formSettings";
import { formCreateSchema, formUpdateSchema } from "../../../core/server/validation/formSchemas";
import { FORM_COLOR_CONSUMER_CASES, buildFormColorTheme } from "./formColorConsumerTable";

const ajv = new Ajv({
  allErrors: true,
  strict: true,
  strictTypes: false,
  allowUnionTypes: true,
});
const validateCreate = ajv.compile(formCreateSchema);
const validateUpdate = ajv.compile(formUpdateSchema);
const validateSettings = ajv.compile(formSettingsSchema);

test("Form color consumer table is deeply runtime-frozen", () => {
  expect(Object.isFrozen(FORM_COLOR_CONSUMER_CASES)).toBe(true);
  for (const entry of FORM_COLOR_CONSUMER_CASES) {
    expect(Object.isFrozen(entry), `${entry.group}.${entry.key}`).toBe(true);
  }
});

test("normalizeFormSettings returns defaults for invalid input", () => {
  const settings = normalizeFormSettings(null);
  expect(settings.layoutMode).toBe("single");
  expect(settings.saveProgress).toBe(false);
  expect(settings.preset).toBe("custom");
  expect(settings.automationRetry.maxAttempts).toBe(1);
});

test("normalizeFormSettings clamps retry settings", () => {
  const settings = normalizeFormSettings({
    automationRetry: {
      enabled: true,
      maxAttempts: 42,
      baseDelayMs: 5,
      maxDelayMs: 10,
    },
  });

  expect(settings.automationRetry.enabled).toBe(true);
  expect(settings.automationRetry.maxAttempts).toBe(5);
  expect(settings.automationRetry.baseDelayMs).toBe(50);
  expect(settings.automationRetry.maxDelayMs).toBe(100);
});

test("normalizeFormStep clamps between 1 and 10", () => {
  expect(normalizeFormStep(undefined)).toBe(1);
  expect(normalizeFormStep(0)).toBe(1);
  expect(normalizeFormStep(3.8)).toBe(4);
  expect(normalizeFormStep(20)).toBe(10);
});

test("resolveStepTitle uses configured title first", () => {
  const settings = getDefaultFormSettings();
  settings.stepTitles = ["Contact", "Details"];

  expect(resolveStepTitle(settings, 1)).toBe("Contact");
  expect(resolveStepTitle(settings, 3)).toBe("Step 3");
});

// ---------------------------------------------------------------------------
// TASK-516-01: form theme normalize / reject-unknown / fail-soft / present-only
// ---------------------------------------------------------------------------

test("normalizeFormSettings round-trips a full theme (every new allowlisted key)", () => {
  const theme = {
    layout: {
      width: "lg",
      align: "left",
      fieldGap: "lg",
      columns: 2,
      buttonAlignment: "full",
    },
    surface: {
      card: false,
      background: "#ffffff",
      borderColor: "var(--color-border)",
      borderWidth: "md",
      radius: "xl",
      padding: "xl",
      shadow: "soft",
    },
    typography: {
      titleSize: "xl",
      titleWeight: "normal",
      titleColor: "#111111",
      labelColor: "rgb(10, 20, 30)",
      helperColor: "hsl(210, 40%, 50%)",
      fontFamily: "serif",
    },
    input: {
      size: "lg",
      radius: "xl",
      borderColor: "#222222",
      background: "#f5f5f5",
      textColor: "#000000",
    },
    submit: {
      background: "#ff0000",
      textColor: "#ffffff",
      radius: "xl",
      fullWidth: false,
      label: "Send it",
    },
  };

  const out = normalizeFormSettings({ theme });
  expect(out.theme).toEqual(theme);
});

test("normalizeFormSettings drops unknown theme keys (reject-unknown)", () => {
  const out = normalizeFormSettings({
    theme: { layout: { bogus: 1, width: "lg" }, junk: 2 },
  });
  expect(out.theme).toEqual({ layout: { width: "lg" } });
  expect((out.theme as Record<string, unknown>).junk).toBeUndefined();
});

test("normalizeFormSettings omits bad enum/color VALUES (fail-soft)", () => {
  const out = normalizeFormSettings({
    theme: {
      layout: { width: "huge", align: "center" },
      surface: {
        background: "url(x)",
        borderColor: "expression(alert(1))",
        radius: "md",
      },
    },
  });
  expect(out.theme).toEqual({
    layout: { align: "center" },
    surface: { radius: "md" },
  });
});

test("normalizeFormSettings canonicalizes the inherited Form color exception end to end", () => {
  const exactCapCurrentColor = `${" ".repeat(
    FORM_SCHEMA_LIMITS.themeColor - "CURRENTCOLOR".length
  )}CURRENTCOLOR`;
  const out = normalizeFormSettings({ theme: buildFormColorTheme("raw") });
  expect(out.theme).toEqual(buildFormColorTheme("canonical"));

  const rejectedTheme = Object.fromEntries(
    FORM_COLOR_CONSUMER_CASES.map(({ group, key }) => [
      group,
      {
        ...(Object.fromEntries(
          FORM_COLOR_CONSUMER_CASES.filter((entry) => entry.group === group).map((entry) => [
            entry.key,
            entry.key === key ? "rgb(256, 0, 0)" : "\u00a0#fff",
          ])
        ) as Record<string, string>),
      },
    ])
  );
  expect(normalizeFormSettings({ theme: rejectedTheme }).theme).toBeUndefined();

  expect(validateSettings({ theme: { surface: { background: exactCapCurrentColor } } })).toBe(true);
  expect(validateSettings({ theme: { surface: { background: ` ${exactCapCurrentColor}` } } })).toBe(
    false
  );
  expect(validateSettings({ theme: buildFormColorTheme("raw") })).toBe(true);
  for (const rejected of ["#fff\u0000", "#fff\u001f", "\u00a0#fff", "\u2003#fff"]) {
    expect(validateSettings({ theme: { surface: { background: rejected } } })).toBe(false);
    expect(normalizeFormSettings({ theme: { surface: { background: rejected } } }).theme).toBe(
      undefined
    );
  }
});

test("normalizeFormSettings omits empty theme groups and emits no empty theme", () => {
  const emptyGroup = normalizeFormSettings({ theme: { layout: { width: "nope" } } });
  expect("theme" in emptyGroup).toBe(false);

  const emptyTheme = normalizeFormSettings({ theme: {} });
  expect("theme" in emptyTheme).toBe(false);
});

test("normalizeFormSettings is present-only: no-theme input emits no theme key", () => {
  const noThemeInput = {
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
  };
  const out = normalizeFormSettings(noThemeInput);
  expect("theme" in out).toBe(false);
  // base keys still present + correctly normalized
  expect(out.layoutMode).toBe("single");
  expect(out.preset).toBe("custom");
});

test("getDefaultFormSettings emits no theme key", () => {
  const defaults = getDefaultFormSettings();
  expect("theme" in defaults).toBe(false);
  expect(defaults).toEqual({
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
  });
});

describe("strict form write schemas", () => {
  test("requires create name, requires a nonempty update, and owns access/status enums", () => {
    expect(validateCreate({ name: "Contact" })).toBe(true);
    expect(validateCreate({})).toBe(false);
    expect(validateUpdate({})).toBe(false);
    expect(validateUpdate({ name: "Contact" })).toBe(true);
    expect(validateCreate({ name: "Contact", status: "deleted" })).toBe(false);
    expect(validateCreate({ name: "Contact", submissionAccess: "private" })).toBe(false);
    expect(validateCreate({ name: "Contact", unknown: true })).toBe(false);
  });

  test("accepts null/empty/max form strings and rejects max+1", () => {
    const cases: Array<[string, number, boolean]> = [
      ["slug", FORM_SCHEMA_LIMITS.slug, true],
      ["description", FORM_SCHEMA_LIMITS.description, true],
      ["successMessage", FORM_SCHEMA_LIMITS.successMessage, true],
      ["successRedirectUrl", FORM_SCHEMA_LIMITS.successRedirectUrl, true],
    ];
    for (const [key, max] of cases) {
      expect(validateCreate({ name: "Form", [key]: null })).toBe(true);
      expect(validateCreate({ name: "Form", [key]: "" })).toBe(true);
      expect(validateCreate({ name: "Form", [key]: "x".repeat(max) })).toBe(true);
      expect(validateCreate({ name: "Form", [key]: "x".repeat(max + 1) })).toBe(false);
    }
    expect(validateCreate({ name: "x".repeat(FORM_SCHEMA_LIMITS.name) })).toBe(true);
    expect(validateCreate({ name: "x".repeat(FORM_SCHEMA_LIMITS.name + 1) })).toBe(false);
    expect(validateCreate({ name: "" })).toBe(false);
  });

  test("rejects unknown keys at every settings/theme/retry depth", () => {
    const invalidSettings = [
      { unknown: true },
      { automationRetry: { unknown: true } },
      { theme: { unknown: true } },
      { theme: { layout: { unknown: true } } },
      { theme: { surface: { unknown: true } } },
      { theme: { typography: { unknown: true } } },
      { theme: { input: { unknown: true } } },
      { theme: { submit: { unknown: true } } },
    ];
    for (const settings of invalidSettings) {
      expect(validateCreate({ name: "Form", settings })).toBe(false);
    }
  });

  test("pins layout, step-title, and retry bounds", () => {
    expect(
      validateSettings({
        automationRetry: { maxAttempts: 1, baseDelayMs: 50, maxDelayMs: 100 },
      })
    ).toBe(true);
    expect(
      validateSettings({
        layoutMode: "multi_step",
        saveProgress: true,
        stepTitles: Array.from({ length: 10 }, () => "x".repeat(240)),
        preset: "service_intake",
        automationRetry: {
          enabled: true,
          maxAttempts: 5,
          baseDelayMs: 50,
          maxDelayMs: 20_000,
        },
      })
    ).toBe(true);
    expect(validateSettings({ stepTitles: Array.from({ length: 11 }, () => "Step") })).toBe(false);
    expect(validateSettings({ stepTitles: [""] })).toBe(false);
    expect(validateSettings({ stepTitles: ["x".repeat(241)] })).toBe(false);
    for (const automationRetry of [
      { maxAttempts: 0 },
      { maxAttempts: 6 },
      { baseDelayMs: 49 },
      { baseDelayMs: 5_001 },
      { maxDelayMs: 99 },
      { maxDelayMs: 20_001 },
      { maxAttempts: 1.5 },
    ]) {
      expect(validateSettings({ automationRetry })).toBe(false);
    }
  });

  test("normalizes retry cross-invariant without changing its existing defaults", () => {
    const normalized = normalizeFormSettings({
      automationRetry: { baseDelayMs: 5_000, maxDelayMs: 100 },
    });
    expect(normalized.automationRetry.baseDelayMs).toBe(5_000);
    expect(normalized.automationRetry.maxDelayMs).toBe(5_000);
  });

  test("accepts every theme key at its boundary and pins color/label maxima", () => {
    const exactCapColor = `${" ".repeat(FORM_SCHEMA_LIMITS.themeColor - 4)}#fff`;
    const settings = {
      theme: {
        layout: {
          width: "full",
          align: "right",
          fieldGap: "lg",
          columns: 2,
          buttonAlignment: "full",
        },
        surface: {
          card: true,
          background: exactCapColor,
          borderColor: "#fff",
          borderWidth: "md",
          radius: "xl",
          padding: "xl",
          shadow: "lg",
        },
        typography: {
          titleSize: "xl",
          titleWeight: "bold",
          titleColor: "#111",
          labelColor: "#222",
          helperColor: "#333",
          fontFamily: "mono",
        },
        input: {
          size: "lg",
          radius: "xl",
          borderColor: "#444",
          background: "#555",
          textColor: "#666",
        },
        submit: {
          background: "#777",
          textColor: "#888",
          radius: "xl",
          fullWidth: true,
          label: "x".repeat(240),
        },
      },
    };
    expect(validateSettings(settings)).toBe(true);
    expect(validateCreate({ name: "Form", settings: { theme: buildFormColorTheme("raw") } })).toBe(
      true
    );
    expect(validateUpdate({ settings: { theme: buildFormColorTheme("raw") } })).toBe(true);
    expect(
      validateSettings({
        theme: { surface: { background: `${exactCapColor} ` } },
      })
    ).toBe(false);
    expect(validateSettings({ theme: { submit: { label: "" } } })).toBe(false);
    expect(validateSettings({ theme: { submit: { label: "x".repeat(241) } } })).toBe(false);
    expect(validateSettings({ theme: { layout: { columns: 3 } } })).toBe(false);
  });

  test("keeps empty/no-theme documents present-only", () => {
    expect(validateSettings({})).toBe(true);
    expect(normalizeFormSettings({})).toEqual(getDefaultFormSettings());
    expect("theme" in normalizeFormSettings({ theme: {} })).toBe(false);
  });
});
