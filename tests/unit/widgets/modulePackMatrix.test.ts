import { expect, test } from "bun:test";

import {
  listWidgetPackMatrix,
  WIDGET_PACK_MATRIX,
} from "../../../core/widgets/modulePackMatrix";
import {
  listModulePackStatus,
  validateModulePackMatrix,
} from "../../../core/widgets/registry";
import type { WidgetDefinition } from "../../../core/widgets/types";

const Dummy = () => null;

function createCompositeWidget(type: string, module: string): WidgetDefinition {
  return {
    type,
    title: type,
    category: "content",
    complexity: "composite",
    audience: "beginner",
    module,
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object", properties: {} },
    defaults: {},
    editor: { wizard: Dummy, visual: Dummy, advanced: Dummy },
    render: Dummy,
  };
}

function buildStrictWidgets() {
  const seen = new Set<string>();
  const widgets: WidgetDefinition[] = [];
  for (const pack of WIDGET_PACK_MATRIX) {
    if (pack.enforcement !== "strict") continue;
    for (const type of pack.compositeWidgets) {
      if (seen.has(type)) continue;
      seen.add(type);
      widgets.push(createCompositeWidget(type, pack.module));
    }
  }
  return widgets;
}

test("widget pack matrix has unique module IDs and minimum thresholds", () => {
  const matrix = listWidgetPackMatrix();
  const modules = matrix.map((item) => item.module);

  expect(new Set(modules).size).toBe(modules.length);
  for (const item of matrix) {
    expect(item.minimum.pagePresets).toBeGreaterThan(0);
    expect(item.minimum.sectionPresets).toBeGreaterThan(0);
    expect(item.minimum.compositeWidgets).toBeGreaterThan(0);
  }
});

test("validateModulePackMatrix passes with strict coverage even when advisory modules are incomplete", () => {
  const widgets = buildStrictWidgets();

  expect(() =>
    validateModulePackMatrix({ widgets, strictOnly: true })
  ).not.toThrow();

  const statuses = listModulePackStatus(widgets);
  const advisory = statuses.find((item) => item.module === "booking");
  expect(advisory?.enforcement).toBe("advisory");
  expect(advisory?.valid).toBe(false);
});

test("validateModulePackMatrix fails fast when strict module composite coverage is missing", () => {
  const widgets = buildStrictWidgets().filter((item) => item.type !== "hero");

  expect(() => validateModulePackMatrix({ widgets, strictOnly: true })).toThrow(
    "module_pack_invalid:content"
  );
});

test("strictOnly=false also fails for advisory gaps", () => {
  const widgets = buildStrictWidgets();

  expect(() => validateModulePackMatrix({ widgets, strictOnly: false })).toThrow(
    "module_pack_invalid:navigation"
  );
});
