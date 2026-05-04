import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  AccordionAdvancedEditor,
  AccordionVisualEditor,
  AccordionWizardEditor,
} from "../../../core/admin/ui/widgets/editors/AccordionEditors";
import {
  AccordionBlock,
  accordionDefaults,
  createAccordionWidget,
  normalizeAccordionData,
  type AccordionData,
} from "../../../core/widgets/core/accordion";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<AccordionData>> = () => null;

test("accordion renders defaults", () => {
  const html = renderToString(<AccordionBlock data={accordionDefaults} variant="soft" />);

  expect(html).toContain('data-nextless-accordion="1"');
  expect(html).toContain('data-nextless-accordion-variant="soft"');
  expect(html).toContain("Section 1");
  expect(html).toContain("Add widgets to this accordion item.");
});

test("accordion normalization resolves defaults", () => {
  const normalized = normalizeAccordionData({
    items: [
      { id: "1", title: "One" },
      { id: "2", title: "Two" },
    ],
    options: {
      initiallyOpenId: "2",
      allowMultiple: true,
    },
  });

  expect(normalized.options?.initiallyOpenId).toBe("2");
  expect(normalized.options?.allowMultiple).toBe(true);
});

test("accordion validator accepts schema", () => {
  clearWidgets();
  const widget = createAccordionWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "accordion-1",
      type: "accordion",
      variant: "bordered",
      data: {
        items: [
          { id: "1", title: "Question 1" },
          { id: "2", title: "Question 2" },
        ],
        options: {
          initiallyOpenId: "1",
          allowMultiple: false,
        },
      },
      slots: {
        "item:1": [],
        "item:2": [],
      },
    })
  ).not.toThrow();
});

test("accordion cleared panel surface omits background style", () => {
  const normalized = normalizeAccordionData({
    ...accordionDefaults,
    style: {},
  });
  const html = renderToString(<AccordionBlock data={normalized} variant="soft" />);

  expect(normalized.style?.surfaceColor).toBeUndefined();
  expect(html).toContain('data-nextless-accordion-variant="soft"');
  expect(html).not.toContain("background-color:");
});

test("accordion visual editor renders key sections", () => {
  const html = renderToString(
    <AccordionVisualEditor
      value={accordionDefaults}
      onChange={() => undefined}
      variant="soft"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Items");
  expect(html).toContain("Behavior and Style");
});

const editors = [AccordionWizardEditor, AccordionAdvancedEditor];

test("accordion wizard and advanced editors render", () => {
  for (const Editor of editors) {
    const html = renderToString(
      <Editor
        value={accordionDefaults}
        onChange={() => undefined}
        variant="soft"
        onVariantChange={() => undefined}
      />
    );

    expect(html).toContain("Variant");
  }
});
