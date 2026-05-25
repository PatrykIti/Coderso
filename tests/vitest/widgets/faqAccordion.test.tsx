import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  FaqAccordionAdvancedEditor,
  FaqAccordionVisualEditor,
  FaqAccordionWizardEditor,
} from "../../../core/admin/ui/widgets/editors/FaqAccordionEditors";
import {
  buildFaqAccordionJsonLd,
  createFaqAccordionWidget,
  extractFaqAnswerPlainText,
  faqAccordionEditorContract,
  faqAccordionDefaults,
  faqAccordionItemMax,
  FaqAccordionBlock,
  normalizeFaqAccordionData,
  normalizeFaqAccordionItemCount,
  normalizeFaqAccordionItems,
  serializeJsonLdForScript,
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
  expect(html).toContain('data-coderso-faq="1"');
  expect(html).toContain('data-faq-variant="single-column"');
  expect(html).toContain('data-faq-count="3"');
  expect(html).toContain('data-faq-motion="none"');
  expect(html).toContain("▾");
});

test("faq accordion normalization keeps deterministic ids and open index bounds", () => {
  const items = normalizeFaqAccordionItems(
    [
      { id: "same", question: "Q1", answer: "A1", icon: "⭐", answerFormat: "markdown" },
      {
        id: "same",
        question: "",
        answer: "",
        icon: "very-very-long-icon-value",
        answerFormat: "bad" as "plain",
      },
    ],
    2
  );

  expect(items).toHaveLength(2);
  expect(items[0]?.id).toBe("same");
  expect(items[1]?.id).toBe("faq-2");
  expect(items[1]?.question).toBeTruthy();
  expect(items[1]?.answer).toBeTruthy();
  expect(items[1]?.answerFormat).toBe("plain");
  expect((items[1]?.icon ?? "").length).toBeLessThanOrEqual(16);
  expect(normalizeFaqAccordionItemCount(999)).toBe(faqAccordionItemMax);
  expect(normalizeFaqAccordionItemCount(0)).toBe(1);

  const normalized = normalizeFaqAccordionData({
    items: [{ question: "Only one", answer: "One answer" }],
    options: { defaultOpenIndex: 99, allowMultipleOpen: true },
    style: {
      border: "",
      divider: "",
      questionTextColor: "",
      answerTextColor: "",
      headerTitleColor: "",
      headerDescriptionColor: "",
      spacing: "md",
    },
  });
  expect(normalized.options?.defaultOpenIndex).toBe(0);
  expect(normalized.style?.border).toBeUndefined();
  expect(normalized.style?.divider).toBeUndefined();
  expect(normalized.style?.questionTextColor).toBeUndefined();
  expect(normalized.style?.answerTextColor).toBeUndefined();
  expect(normalized.style?.headerTitleColor).toBeUndefined();
  expect(normalized.style?.headerDescriptionColor).toBeUndefined();
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
            answerFormat: "plain",
            icon: "⭐",
          },
          {
            id: "faq-2",
            question: "Question two?",
            answer: "Answer **two** with [Docs](https://example.com).",
            answerFormat: "markdown",
            icon: "→",
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
          maxWidth: "lg",
          headerAlign: "left",
          sectionPaddingX: "lg",
          sectionPaddingY: "sm",
          questionTextColor: "#0f172a",
          answerTextColor: "#334155",
          headerTitleColor: "#111827",
          headerDescriptionColor: "#475569",
          panelRadius: "xl",
          borderWidth: "2",
          headerTitleSize: "xl",
          motion: "smooth",
        },
        seo: {
          emitFaqJsonLd: true,
        },
      },
    })
  ).not.toThrow();
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("faq accordion cleared panel surface omits background style", () => {
  const normalized = normalizeFaqAccordionData({
    ...faqAccordionDefaults,
    style: {},
  });
  const html = renderToString(<FaqAccordionBlock data={normalized} variant="single-column" />);

  expect(normalized.style?.surface).toBeUndefined();
  expect(html).toContain('data-faq-variant="single-column"');
  expect(html).not.toContain("background-color:");
});

test("faq accordion renders safe markdown answers, shared spacing collapse, and section semantics", () => {
  const html = renderToString(
    <FaqAccordionBlock
      data={normalizeFaqAccordionData({
        ...faqAccordionDefaults,
        items: [
          {
            id: "faq-1",
            question: "Question one",
            answer: "Use **bold** and [Docs](https://example.com).",
            answerFormat: "markdown",
            icon: "⭐",
          },
          {
            id: "faq-2",
            question: "Question two",
            answer: "[Bad](javascript:alert(1)) and `code`",
            answerFormat: "markdown",
          },
        ],
        style: {
          ...faqAccordionDefaults.style,
          spacing: "none",
          borderWidth: "2",
          motion: "smooth",
        },
        seo: {
          emitFaqJsonLd: true,
        },
      })}
      variant="compact"
      blockId="faq-block"
    />
  );

  expect(html).toContain('aria-labelledby="faq-accordion-faq-block-heading"');
  expect(html).toContain('aria-expanded="true"');
  expect(html).toContain("data-coderso-faq-summary");
  expect(html).toContain("<strong>bold</strong>");
  expect(html).toContain('href="https://example.com"');
  expect(html).not.toContain("javascript:alert(1)");
  expect(html).toContain("margin-top:calc(-1 * 2px)");
  expect(html).toContain('type="application/ld+json"');
});

test("faq accordion json-ld serialization escapes script-breakout characters", () => {
  const jsonLd = buildFaqAccordionJsonLd({
    ...faqAccordionDefaults,
    items: [
      {
        id: "faq-1",
        question: "Can I use </script> safely?",
        answer:
          "Yes **and** safe text with & markers and [Docs](https://example.com/?q=<unsafe>&v=\u2028).",
        answerFormat: "markdown",
      },
    ],
    seo: {
      emitFaqJsonLd: true,
    },
  });

  expect(jsonLd).toMatchObject({
    "@type": "FAQPage",
  });

  const serialized = serializeJsonLdForScript(jsonLd);
  expect(serialized).toContain("\\u003C");
  expect(serialized).toContain("\\u003E");
  expect(serialized).toContain("\\u0026");
  expect(serialized).not.toContain("</script>");
});

test("faq accordion plain-text extraction strips markdown safely", () => {
  expect(
    extractFaqAnswerPlainText({
      answer: "Use **bold** with [Docs](https://example.com) and `code`.",
      answerFormat: "markdown",
    })
  ).toBe("Use bold with Docs and code.");
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
  expect(html).toContain("Section description");
  expect(html).toContain("Questions count");
  expect(html).toContain("Questions and answers");
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
  expect(html).toContain("Layout and typography");
  expect(html).toContain("Colors and panel style");
  expect(html).toContain("Search visibility");
});

test("faq accordion visual keeps custom color tokens behind swatch-only controls", () => {
  const html = renderToString(
    <FaqAccordionVisualEditor
      value={{
        ...faqAccordionDefaults,
        style: {
          ...faqAccordionDefaults.style,
          surface: "var(--color-bg)",
          border: "rgba(15, 23, 42, 0.18)",
          questionTextColor: "brand-text-token",
        },
      }}
      onChange={() => undefined}
      variant="single-column"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Saved custom color");
  expect(html).toContain('data-widget-control="faq-accordion.style.surface"');
  expect(html).toContain('input type="color"');
  expect(html).not.toContain('placeholder="var(--color-bg)"');
  expect(html).not.toContain('placeholder="var(--color-border)"');
  expect(html).not.toContain('placeholder="var(--color-text)"');
  expect(html).not.toContain('value="var(--color-bg)"');
  expect(html).not.toContain('value="rgba(15, 23, 42, 0.18)"');
  expect(html).not.toContain('value="brand-text-token"');
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

  expect(html).toContain("Runtime summary");
  expect(html).toContain("Style summary");
  expect(html).toContain("Saved data status");
  expect(html).toContain("Default open item");
  expect(html).not.toContain("Review repair");
  expect(html).not.toContain("Confirm repair");
  expect(html).not.toContain("Raw payload snapshot");
  expect(html).not.toContain("<pre");
  expect(html).not.toContain("{&quot;");
  expect(html).not.toContain("Questions and answers");
});

test("faq accordion advanced contract uses human read-only summaries", () => {
  expect(faqAccordionEditorContract.sections).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        mode: "advanced",
        id: "faq-accordion.advanced.runtime-summary",
        role: "diagnostics",
        writablePaths: [],
      }),
      expect.objectContaining({
        mode: "advanced",
        id: "faq-accordion.advanced.style-summary",
        role: "summary",
        writablePaths: [],
      }),
      expect.objectContaining({
        mode: "advanced",
        id: "faq-accordion.advanced.normalization-support",
        role: "diagnostics",
        writablePaths: [],
      }),
    ])
  );
  expect(faqAccordionEditorContract.sections).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ role: "technical" })])
  );
});
