import { expect, test } from "vitest";

import {
  getDefaultFormSettings,
  normalizeFormSettings,
  normalizeFormStep,
  resolveStepTitle,
} from "../../../core/services/forms/formSettings";

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
