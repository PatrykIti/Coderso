import { expect, test, afterEach, beforeEach } from "bun:test";

import {
  clearWidgets,
  listWidgets,
  listWidgetsForSurface,
  registerWidget,
} from "../../../core/widgets/registry";
import type { WidgetDefinition } from "../../../core/widgets/types";

const Dummy = () => null;

const baseDef: WidgetDefinition = {
  type: "hero",
  title: "Hero",
  description: "Hero section",
  category: "layout",
  complexity: "composite",
  audience: "beginner",
  module: "content",
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

test("registerWidget rejects invalid metadata", () => {
  expect(() =>
    registerWidget({ ...baseDef, complexity: "bad" as "composite" })
  ).toThrow("widget_complexity_invalid");
  expect(() => registerWidget({ ...baseDef, audience: "bad" as "beginner" })).toThrow(
    "widget_audience_invalid"
  );
  expect(() => registerWidget({ ...baseDef, module: "  " })).toThrow(
    "widget_module_invalid"
  );
  expect(() =>
    registerWidget({
      ...baseDef,
      type: "hero-surface-invalid",
      surfaces: ["invalid-surface" as "page-builder"],
    })
  ).toThrow("widget_surfaces_invalid");
});

test("registerWidget rejects minItems on fixed slot", () => {
  expect(() =>
    registerWidget({
      ...baseDef,
      type: "layout-fixed",
      slots: [{ id: "content", label: "Content", minItems: 1 }],
    })
  ).toThrow("widget_slot_min_unsupported");
});

test("registerWidget accepts repeatable slot limits", () => {
  registerWidget({
    ...baseDef,
    type: "layout-repeatable",
    slots: [
      {
        id: "column",
        label: "Column",
        kind: "repeatable",
        minItems: 1,
        maxItems: 3,
      },
    ],
  });

  expect(listWidgets().some((item) => item.type === "layout-repeatable")).toBe(true);
});

test("listWidgetsForSurface filters definitions by surface visibility", () => {
  registerWidget({
    ...baseDef,
    type: "screen-only",
    surfaces: ["custom-screen-builder"],
  });
  registerWidget({
    ...baseDef,
    type: "shared-layout",
    surfaces: ["page-builder", "widget-library", "custom-screen-builder"],
  });

  expect(listWidgetsForSurface("custom-screen-builder").map((item) => item.type)).toEqual([
    "screen-only",
    "shared-layout",
  ]);
  expect(listWidgetsForSurface("widget-library").map((item) => item.type)).toEqual([
    "shared-layout",
  ]);
});
