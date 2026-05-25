// @vitest-environment happy-dom

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
import { validateWidgetEditorContract } from "../../../core/widgets/editorContract";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<AccordionData>> = () => null;

const renderAccordionDom = (data: AccordionData) => {
  document.body.innerHTML = renderToString(
    <AccordionBlock
      data={data}
      variant="soft"
      slots={{
        "item:1": [],
        "item:2": [],
      }}
    />
  );
  const script = document.querySelector("script");
  if (script?.textContent) {
    // eslint-disable-next-line no-eval
    eval(script.textContent);
  }
  return Array.from(document.querySelectorAll("details"));
};

test("accordion renders defaults", () => {
  const html = renderToString(<AccordionBlock data={accordionDefaults} variant="soft" />);

  expect(html).toContain('data-coderso-accordion="1"');
  expect(html).toContain('data-coderso-accordion-variant="soft"');
  expect(html).toContain("Section 1");
  expect(html).toContain('role="group"');
  expect(html).toContain('aria-label="Accordion"');
  expect(html).toContain('aria-controls="accordion-1-content-1"');
  expect(html).toContain('aria-expanded="true"');
  expect(html).toContain('aria-labelledby="accordion-1-summary-1"');
  expect(html).toContain('role="region"');
  expect(html).not.toContain("Add widgets to this accordion item.");
  expect(html).toContain("codersoAccordionBound");
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
  expect(normalized.options?.motion).toBe("none");
  expect(normalized.layout?.maxWidth).toBe("full");
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
  const details = renderAccordionDom(normalized) as HTMLDetailsElement[];

  expect(details[0]?.open).toBe(false);
  expect(details[1]?.open).toBe(true);
});

test("accordion preserves an intentional all-collapsed default state when collapsible is enabled", () => {
  const normalized = normalizeAccordionData({
    ...accordionDefaults,
    options: {
      openMode: "single",
      defaultOpenIds: [],
      collapsible: true,
      allowMultiple: false,
    },
  });
  const details = renderAccordionDom(normalized) as HTMLDetailsElement[];

  expect(normalized.options?.defaultOpenIds).toEqual([]);
  expect(normalized.options?.initiallyOpenId).toBeUndefined();
  expect(details[0]?.open).toBe(false);
  expect(details[1]?.open).toBe(false);
});

test("accordion falls back to the first valid item when saved open ids are stale or disallowed", () => {
  const staleDefaults = normalizeAccordionData({
    ...accordionDefaults,
    options: {
      openMode: "single",
      defaultOpenIds: ["missing"],
      collapsible: true,
      allowMultiple: false,
    },
  });
  const lockedAllClosed = normalizeAccordionData({
    ...accordionDefaults,
    options: {
      openMode: "single",
      defaultOpenIds: [],
      collapsible: false,
      allowMultiple: false,
    },
  });

  expect(staleDefaults.options?.defaultOpenIds).toEqual(["1"]);
  expect(staleDefaults.options?.initiallyOpenId).toBe("1");
  expect(lockedAllClosed.options?.defaultOpenIds).toEqual(["1"]);
  expect(lockedAllClosed.options?.initiallyOpenId).toBe("1");
});

test("accordion keeps one item open when collapsible is disabled", () => {
  const details = renderAccordionDom(
    normalizeAccordionData({
      ...accordionDefaults,
      options: {
        openMode: "single",
        defaultOpenIds: ["1"],
        collapsible: false,
        initiallyOpenId: "1",
        allowMultiple: false,
      },
    })
  ) as HTMLDetailsElement[];

  const first = details[0];
  expect(first?.open).toBe(true);
  if (first) {
    first.open = false;
    first.dispatchEvent(new Event("toggle"));
  }
  expect(first?.open).toBe(true);
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

test("accordion renders icon, motion, max width, and extended style tokens", () => {
  const html = renderToString(
    <AccordionBlock
      data={normalizeAccordionData({
        ...accordionDefaults,
        items: [
          { id: "1", title: "Section 1", description: "Copy", icon: "🔥" },
          { id: "2", title: "Section 2", description: "More copy" },
        ],
        options: {
          ...accordionDefaults.options,
          motion: "smooth",
        },
        style: {
          ...accordionDefaults.style,
          descriptionTextColor: "#445566",
          summaryPadding: "lg",
          contentPadding: "lg",
          radius: "xl",
          summaryFontSize: "lg",
          summaryFontWeight: "bold",
        },
        layout: {
          maxWidth: "sm",
        },
      })}
      variant="soft"
    />
  );

  expect(html).toContain('data-coderso-accordion-motion="smooth"');
  expect(html).toContain("max-w-2xl");
  expect(html).toContain("px-5 py-4");
  expect(html).toContain("p-5");
  expect(html).toContain("rounded-2xl");
  expect(html).toContain("text-lg");
  expect(html).toContain("font-bold");
  expect(html).toContain('style="color:#445566"');
  expect(html).toContain("🔥");
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

  expect(html).toContain("Item content");
  expect(html).toContain("Behavior and Style");
  expect(html).toContain('data-widget-editor-section="accordion.visual.variant"');
  expect(html).toContain('data-widget-editor-section="accordion.visual.item-content"');
  expect(html).toContain('data-widget-editor-section="accordion.visual.behavior-style"');
  expect(html).toContain("Optional icon or emoji");
});

test("accordion wizard and advanced editors render v2 ownership surfaces", () => {
  const wizardHtml = renderToString(
    <AccordionWizardEditor
      value={accordionDefaults}
      onChange={() => undefined}
      variant="soft"
      onVariantChange={() => undefined}
    />
  );
  const advancedHtml = renderToString(
    <AccordionAdvancedEditor
      value={accordionDefaults}
      onChange={() => undefined}
      variant="soft"
      onVariantChange={() => undefined}
    />
  );

  expect(wizardHtml).toContain("Starter items");
  expect(wizardHtml).toContain("Visual owns daily item title edits");
  expect(wizardHtml).not.toContain("Variant");
  expect(wizardHtml).not.toContain("Behavior and Style");
  expect(advancedHtml).toContain("Behavior summary");
  expect(advancedHtml).toContain("Saved items summary");
  expect(advancedHtml).toContain("Saved display summary");
  expect(advancedHtml).toContain("Contract summary");
  expect(advancedHtml).not.toContain("<pre");
  expect(advancedHtml).not.toContain("summary suffix");
  expect(advancedHtml).not.toContain("&quot;items&quot;");
  expect(advancedHtml).not.toContain("Variant");
  expect(advancedHtml).not.toContain("Optional icon or emoji");
  expect(advancedHtml).not.toContain('data-widget-control-ownership="writable"');
});

test("accordion ships a strict v2 editor contract", () => {
  const widget = createAccordionWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  const validation = validateWidgetEditorContract(widget, { requireContract: true });

  expect(validation).toEqual(expect.objectContaining({ valid: true, errors: [] }));
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
  expect(widget.editorContract?.sections.map((section) => section.id)).toEqual(
    expect.arrayContaining([
      "accordion.wizard.starter-setup",
      "accordion.visual.variant",
      "accordion.visual.item-content",
      "accordion.visual.behavior-style",
      "accordion.advanced.behavior-summary",
      "accordion.advanced.item-summary",
      "accordion.advanced.display-summary",
      "accordion.advanced.contract-summary",
    ])
  );
});
