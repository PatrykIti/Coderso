import React from "react";
import type { ComponentType } from "react";
import { afterEach, expect, test } from "vitest";

import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { clearWidgetValidators, normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetDefinition, WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<Record<string, unknown>>> = () => null;

const registerSecurityWidget = () => {
  const widget: WidgetDefinition<Record<string, unknown>> = {
    type: "security-budget",
    title: "Security budget",
    description: "Test widget",
    category: "layout",
    complexity: "composite",
    audience: "beginner",
    module: "content",
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object", additionalProperties: true },
    defaults: {},
    editor: {
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    },
    render: () => React.createElement("div"),
  };

  registerWidget(widget);
};

afterEach(() => {
  clearWidgetValidators();
  clearWidgets();
});

test("normalizeWidgetBlock rejects deeply nested data before schema traversal", () => {
  registerSecurityWidget();

  const data: Record<string, unknown> = {};
  let cursor = data;
  for (let index = 0; index < 40; index += 1) {
    const next: Record<string, unknown> = {};
    cursor.next = next;
    cursor = next;
  }

  expect(() =>
    normalizeWidgetBlock({
      id: "security-budget-1",
      type: "security-budget",
      variant: "default",
      data,
    })
  ).toThrow("widget_schema_invalid: payload_too_deep");
});

test("normalizeWidgetBlock rejects oversized data arrays before schema traversal", () => {
  registerSecurityWidget();

  expect(() =>
    normalizeWidgetBlock({
      id: "security-budget-2",
      type: "security-budget",
      variant: "default",
      data: {
        items: Array.from({ length: 2001 }, (_, index) => index),
      },
    })
  ).toThrow("widget_schema_invalid: payload_too_complex");
});
