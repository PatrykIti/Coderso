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
