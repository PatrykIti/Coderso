import { afterEach, beforeEach, expect, test } from "bun:test";

import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { clearWidgetValidators, normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetDefinition, WidgetBlock } from "../../../core/widgets/types";

const Dummy = () => null;

const definition: WidgetDefinition<{ headline: string; tone?: string }> = {
  type: "hero",
  title: "Hero",
  description: "Hero",
  category: "layout",
  variants: [{ id: "centered", label: "Centered" }],
  schema: {
    type: "object",
    required: ["headline"],
    additionalProperties: false,
    properties: {
      headline: { type: "string" },
      tone: { type: "string" },
    },
  },
  defaults: { headline: "Hello", tone: "friendly" },
  editor: { wizard: Dummy, visual: Dummy, advanced: Dummy },
  render: Dummy,
};

afterEach(() => {
  clearWidgets();
  clearWidgetValidators();
});

beforeEach(() => {
  clearWidgets();
  clearWidgetValidators();
});

test("normalizeWidgetBlock merges defaults", () => {
  registerWidget(definition);
  const block: WidgetBlock = {
    id: "1",
    type: "hero",
    data: {},
  };
  const normalized = normalizeWidgetBlock(block);
  expect(normalized.data.headline).toBe("Hello");
  expect(normalized.data.tone).toBe("friendly");
  expect(normalized.variant).toBe("centered");
});

test("normalizeWidgetBlock rejects invalid variant", () => {
  registerWidget(definition);
  const block: WidgetBlock = {
    id: "1",
    type: "hero",
    variant: "bad",
    data: {},
  };
  expect(() => normalizeWidgetBlock(block)).toThrow("widget_invalid_variant");
});

test("normalizeWidgetBlock rejects schema mismatch", () => {
  registerWidget(definition);
  const block: WidgetBlock = {
    id: "1",
    type: "hero",
    data: { headline: 42 },
  };
  expect(() => normalizeWidgetBlock(block)).toThrow("widget_schema_invalid");
});

test("normalizeWidgetBlock maps legacy children into default slot", () => {
  registerWidget(definition);
  const block: WidgetBlock = {
    id: "1",
    type: "hero",
    data: { headline: "Parent" },
    children: [
      {
        id: "child-1",
        type: "hero",
        data: { headline: "Child" },
      },
    ],
  };

  const normalized = normalizeWidgetBlock(block);
  expect(normalized.slots?.default).toHaveLength(1);
  expect(normalized.children).toBeUndefined();
});
