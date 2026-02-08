import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  FaqAccordionAdvancedEditor,
  FaqAccordionVisualEditor,
  FaqAccordionWizardEditor,
} from "../../../core/admin/ui/widgets/editors/FaqAccordionEditors";
import {
  createFaqAccordionWidget,
  faqAccordionDefaults,
  faqAccordionItemMax,
  FaqAccordionBlock,
  normalizeFaqAccordionData,
  normalizeFaqAccordionItemCount,
  normalizeFaqAccordionItems,
  type FaqAccordionData,
} from "../../../core/widgets/core/faqAccordion";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<FaqAccordionData>> = () => null;

test("faq accordion renders defaults", () => {
  const html = renderToString(
    <FaqAccordionBlock data={faqAccordionDefaults} variant="single-column" />
  );

  expect(html).toContain(faqAccordionDefaults.header?.title ?? "");
  expect(html).toContain('data-faq-variant="single-column"');
  expect(html).toContain('data-faq-count="3"');
});

test("faq accordion normalization keeps deterministic ids and open index bounds", () => {
  const items = normalizeFaqAccordionItems(
    [
      { id: "same", question: "Q1", answer: "A1" },
      { id: "same", question: "", answer: "" },
    ],
    2
  );

  expect(items).toHaveLength(2);
  expect(items[0]?.id).toBe("same");
  expect(items[1]?.id).toBe("faq-2");
  expect(items[1]?.question).toBeTruthy();
  expect(items[1]?.answer).toBeTruthy();
  expect(normalizeFaqAccordionItemCount(999)).toBe(faqAccordionItemMax);
  expect(normalizeFaqAccordionItemCount(0)).toBe(1);

  const normalized = normalizeFaqAccordionData({
    items: [{ question: "Only one", answer: "One answer" }],
    options: { defaultOpenIndex: 99, allowMultipleOpen: true },
  });
  expect(normalized.options?.defaultOpenIndex).toBe(0);
  expect(normalized.style?.spacing).toBe("md");
});

test("faq accordion validator accepts expanded model", () => {
  clearWidgets();
  const widget = createFaqAccordionWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "faq-1",
      type: "faq-accordion",
      variant: "two-column",
      data: {
        header: {
          title: "FAQ",
          description: "Everything you need to know",
        },
        items: [
          {
            id: "faq-1",
            question: "Question one?",
            answer: "Answer one.",
          },
          {
            id: "faq-2",
            question: "Question two?",
            answer: "Answer two.",
          },
        ],
        options: {
          allowMultipleOpen: true,
          defaultOpenIndex: 1,
        },
        style: {
          surface: "#ffffff",
          border: "#cbd5e1",
          divider: "#e2e8f0",
          spacing: "lg",
        },
      },
    })
  ).not.toThrow();
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("faq accordion validator rejects unsupported variant", () => {
  clearWidgets();
  registerWidget(
    createFaqAccordionWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "faq-2",
      type: "faq-accordion",
      variant: "unknown",
      data: faqAccordionDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("faq accordion wizard renders onboarding fields", () => {
  const html = renderToString(
    <FaqAccordionWizardEditor
      value={faqAccordionDefaults}
      onChange={() => undefined}
      variant="single-column"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("FAQ layout");
  expect(html).toContain("Section title");
  expect(html).toContain("Initial questions");
});

test("faq accordion visual renders section-based IA", () => {
  const html = renderToString(
    <FaqAccordionVisualEditor
      value={faqAccordionDefaults}
      onChange={() => undefined}
      variant="single-column"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and layout structure");
  expect(html).toContain("Header copy");
  expect(html).toContain("Questions and answers");
  expect(html).toContain("Colors and spacing");
});

test("faq accordion advanced keeps technical-only scope", () => {
  const html = renderToString(
    <FaqAccordionAdvancedEditor
      value={faqAccordionDefaults}
      onChange={() => undefined}
      variant="compact"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Open-state and fallback controls");
  expect(html).toContain("Technical style tokens");
  expect(html).toContain("Normalization and safeguards");
  expect(html).toContain("Raw payload snapshot");
  expect(html).not.toContain("Questions and answers");
});
