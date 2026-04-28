import { expect, test } from "vitest";

import {
  clonePresetFields,
  getFormPresetDefinition,
  listFormPresets,
} from "../../../core/services/forms/formPresets";

test("listFormPresets returns stable catalog", () => {
  const presets = listFormPresets();
  expect(presets.length).toBeGreaterThanOrEqual(3);
  expect(presets.map((preset) => preset.id)).toEqual(
    expect.arrayContaining(["contact", "lead_capture", "service_intake"])
  );
});

test("getFormPresetDefinition returns null for custom", () => {
  expect(getFormPresetDefinition("custom")).toBeNull();
});

test("clonePresetFields returns deep clone for settings object", () => {
  const preset = getFormPresetDefinition("contact");
  expect(preset).not.toBeNull();
  if (!preset) return;

  const cloned = clonePresetFields(preset.fields);
  expect(cloned).not.toBe(preset.fields);
  expect(cloned[0]?.settings).toEqual(preset.fields[0]?.settings);
  if (cloned[0]?.settings) {
    cloned[0].settings.placeholder = "Changed";
  }
  expect(preset.fields[0]?.settings?.placeholder).not.toBe("Changed");
});
