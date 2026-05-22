import { expect, test, afterEach, beforeEach } from "bun:test";

import {
  clearWidgets,
  listWidgets,
  listWidgetsForSurface,
  listWidgetsForSurfaceContext,
  registerWidget,
} from "../../../core/widgets/registry";
import { createPricingPlansWidget } from "../../../core/widgets/core/pricingPlans";
import {
  createProductTableWidget,
  type ProductTableData,
} from "../../../core/widgets/core/productTable";
import type { WidgetEditorProps } from "../../../core/widgets/types";
import type { WidgetDefinition } from "../../../core/widgets/types";
import type { PricingPlansData } from "../../../core/widgets/core/pricingPlans";

const Dummy = () => null;
const DummyPricingPlansEditor = Dummy as unknown as (
  props: WidgetEditorProps<PricingPlansData>
) => null;
const DummyProductTableEditor = Dummy as unknown as (
  props: WidgetEditorProps<ProductTableData>
) => null;

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
  expect(() => registerWidget({ ...baseDef, type: "Hero" })).toThrow("widget_type_invalid");
});

test("registerWidget rejects empty variants", () => {
  expect(() => registerWidget({ ...baseDef, variants: [] })).toThrow("widget_variants_required");
});

test("registerWidget rejects invalid metadata", () => {
  expect(() => registerWidget({ ...baseDef, complexity: "bad" as "composite" })).toThrow(
    "widget_complexity_invalid"
  );
  expect(() => registerWidget({ ...baseDef, audience: "bad" as "beginner" })).toThrow(
    "widget_audience_invalid"
  );
  expect(() => registerWidget({ ...baseDef, module: "  " })).toThrow("widget_module_invalid");
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

test("listWidgetsForSurfaceContext scopes admin widgets by selected content state", () => {
  registerWidget({
    ...baseDef,
    type: "entry-field",
    surfaces: ["admin-editor-view"],
    dataAccess: { source: "selected-entry", modes: ["read", "write"] },
  });
  registerWidget({
    ...baseDef,
    type: "schema-layout",
    surfaces: ["admin-editor-view"],
    dataAccess: { source: "selected-content-type", modes: ["read"] },
  });
  registerWidget({
    ...baseDef,
    type: "static-admin",
    surfaces: ["admin-editor-view"],
    dataAccess: { source: "none", modes: ["read"] },
  });

  expect(
    listWidgetsForSurfaceContext({
      surface: "admin-editor-view",
      hasSelectedContentType: false,
    }).map((item) => item.type)
  ).toEqual(["static-admin"]);
  expect(
    listWidgetsForSurfaceContext({
      surface: "admin-editor-view",
      hasSelectedContentType: true,
    }).map((item) => item.type)
  ).toEqual(["entry-field", "schema-layout", "static-admin"]);
});

test("registerWidget rejects invalid data access metadata", () => {
  expect(() =>
    registerWidget({
      ...baseDef,
      type: "bad-data-source",
      dataAccess: { source: "entry" as "none", modes: ["read"] },
    })
  ).toThrow("widget_data_access_invalid");

  expect(() =>
    registerWidget({
      ...baseDef,
      type: "bad-data-mode",
      dataAccess: { source: "selected-entry", modes: ["admin" as "read"] },
    })
  ).toThrow("widget_data_access_invalid");
});

test("registerWidget normalizes widget-owned binding targets", () => {
  registerWidget({
    ...baseDef,
    type: "screen-field-value",
    surfaces: ["admin-editor-view"],
    dataAccess: { source: "selected-entry", modes: ["read", "write"] },
    bindingTargets: [
      { propPath: "label", label: "Label", modes: ["read"] },
      { propPath: "value", label: "Value" },
    ],
  });

  expect(listWidgets()[0]?.bindingTargets).toEqual([
    { propPath: "label", label: "Label", modes: ["read"] },
    { propPath: "value", label: "Value", modes: ["read", "write"] },
  ]);
});

test("registerWidget rejects invalid binding target metadata", () => {
  expect(() =>
    registerWidget({
      ...baseDef,
      type: "bad-binding-target-source",
      dataAccess: { source: "selected-content-type", modes: ["read"] },
      bindingTargets: [{ propPath: "title", label: "Title" }],
    })
  ).toThrow("widget_binding_targets_invalid");

  expect(() =>
    registerWidget({
      ...baseDef,
      type: "bad-binding-target-path",
      dataAccess: { source: "selected-entry", modes: ["read"] },
      bindingTargets: [{ propPath: "__proto__.title", label: "Title" }],
    })
  ).toThrow("widget_binding_targets_invalid");

  expect(() =>
    registerWidget({
      ...baseDef,
      type: "bad-binding-target-duplicate",
      dataAccess: { source: "selected-entry", modes: ["read", "write"] },
      bindingTargets: [
        { propPath: "value", label: "Value" },
        { propPath: "value", label: "Value duplicate" },
      ],
    })
  ).toThrow("widget_binding_targets_duplicate");
});

test("registerWidget keeps pricing plans two-plan variant available", () => {
  registerWidget(
    createPricingPlansWidget({
      wizard: DummyPricingPlansEditor,
      visual: DummyPricingPlansEditor,
      advanced: DummyPricingPlansEditor,
    })
  );

  const pricingWidget = listWidgets().find((item) => item.type === "pricing-plans");
  expect(pricingWidget?.variants.map((variant) => variant.id)).toContain("two-plans");
});

test("registerWidget keeps product table compact variant available", () => {
  registerWidget(
    createProductTableWidget({
      wizard: DummyProductTableEditor,
      visual: DummyProductTableEditor,
      advanced: DummyProductTableEditor,
    })
  );

  const productTableWidget = listWidgets().find((item) => item.type === "product-table");
  expect(productTableWidget?.variants.map((variant) => variant.id)).toContain("compact");
});
