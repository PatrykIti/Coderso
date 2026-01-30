import { expect, test, afterEach, beforeEach } from "bun:test";

import { clearWidgets, registerWidget, listWidgets } from "../../../core/widgets/registry";
import type { WidgetDefinition } from "../../../core/widgets/types";

const Dummy = () => null;

const baseDef: WidgetDefinition = {
  type: "hero",
  title: "Hero",
  description: "Hero section",
  category: "layout",
  variants: [{ id: "centered", label: "Centered" }],
  schema: { type: "object", properties: { headline: { type: "string" } } },
  defaults: { headline: "Hello" },
  editor: { wizard: Dummy, visual: Dummy, advanced: Dummy },
  render: Dummy,
};

afterEach(() => {
  clearWidgets();
});

beforeEach(() => {
  clearWidgets();
});

test("registerWidget stores definition", () => {
  registerWidget(baseDef);
  const list = listWidgets();
  expect(list).toHaveLength(1);
  expect(list[0]?.type).toBe("hero");
});

test("registerWidget rejects duplicate types", () => {
  registerWidget(baseDef);
  expect(() => registerWidget(baseDef)).toThrow("widget_already_registered");
});

test("registerWidget rejects invalid type", () => {
  expect(() => registerWidget({ ...baseDef, type: "Hero" })).toThrow(
    "widget_type_invalid"
  );
});

test("registerWidget rejects empty variants", () => {
  expect(() => registerWidget({ ...baseDef, variants: [] })).toThrow(
    "widget_variants_required"
  );
});
