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

  expect(html).toContain('data-coderso-accordion="1"');
  expect(html).toContain('data-coderso-accordion-variant="soft"');
  expect(html).toContain("Section 1");
  expect(html).toContain('aria-controls="accordion-1-content-1"');
  expect(html).toContain('aria-labelledby="accordion-1-summary-1"');
  expect(html).not.toContain("Add widgets to this accordion item.");
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

  expect(normalized.options?.openMode).toBe("multiple");
  expect(normalized.options?.defaultOpenIds).toEqual(["2"]);
  expect(normalized.options?.collapsible).toBe(true);
  expect(normalized.options?.initiallyOpenId).toBe("2");
  expect(normalized.options?.allowMultiple).toBe(true);
});

test("accordion honors a default-open item beyond the first position", () => {
  const normalized = normalizeAccordionData({
    ...accordionDefaults,
    options: {
      openMode: "single",
      defaultOpenIds: ["2"],
      collapsible: true,
      initiallyOpenId: "2",
      allowMultiple: false,
    },
  });
  const html = renderToString(
    <AccordionBlock
      data={normalized}
      variant="soft"
      slots={{
        "item:1": [],
        "item:2": [],
      }}
    />
  );

  expect(html).not.toMatch(/<details[^>]*open=""[^>]*data-coderso-accordion-item="1"/);
  expect(html).toMatch(/<details[^>]*open=""[^>]*data-coderso-accordion-item="2"/);
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
  expect(html).toContain('data-coderso-accordion-variant="soft"');
  expect(html).not.toContain("background-color:");
});

test("accordion shows empty-item placeholders only in editor preview", () => {
  const publicHtml = renderToString(<AccordionBlock data={accordionDefaults} variant="soft" />);
  const previewHtml = renderToString(
    <AccordionBlock
      data={accordionDefaults}
      variant="soft"
      renderContext={{ mode: "editor-preview" }}
    />
  );

  expect(publicHtml).not.toContain("Add widgets to this accordion item.");
  expect(previewHtml).toContain("Add widgets to this accordion item.");
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
  expect(html).toContain('data-widget-editor-section="accordion.items"');
  expect(html).toContain('data-widget-editor-section="accordion.behavior-style"');
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
