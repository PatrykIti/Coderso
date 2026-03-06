import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  RichTextSectionAdvancedEditor,
  RichTextSectionVisualEditor,
  RichTextSectionWizardEditor,
} from "../../../core/admin/ui/widgets/editors/RichTextSectionEditors";
import {
  createRichTextSectionWidget,
  normalizeRichTextBlockCount,
  normalizeRichTextBlocks,
  normalizeRichTextSectionData,
  richTextBlockMax,
  richTextSectionDefaults,
  RichTextSectionBlock,
  sanitizeRichTextHtml,
  type RichTextSectionData,
} from "../../../core/widgets/core/richTextSection";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<RichTextSectionData>> = () => null;

test("rich text section renders defaults", () => {
  const html = renderToString(
    <RichTextSectionBlock data={richTextSectionDefaults} variant="single-column" />
  );

  expect(html).toContain(richTextSectionDefaults.titleBlock?.title ?? "");
  expect(html).toContain('data-rich-text-variant="single-column"');
  expect(html).toContain('data-rich-text-font-scale="md"');
  expect(html).toContain('data-rich-text-output-mode="blocks-fallback"');
});

test("rich text section sanitization strips dangerous payloads", () => {
  const sanitized = sanitizeRichTextHtml(
    '<script>alert(1)</script><p onclick="evil()">Safe</p><a href="javascript:alert(1)">x</a><a href="https://example.com" target="_blank">ok</a><img src=x onerror="evil()">'
  );

  expect(sanitized).not.toContain("<script");
  expect(sanitized).not.toContain("onclick=");
  expect(sanitized).toContain('<a href="#">x</a>');
  expect(sanitized).toContain(
    '<a href="https://example.com" target="_blank" rel="noopener noreferrer">ok</a>'
  );
  expect(sanitized).not.toContain("<img");
});

test("rich text section normalization keeps deterministic block ids and bounds", () => {
  const blocks = normalizeRichTextBlocks(
    [
      { id: "same", heading: "A", content: "A content" },
      { id: "same", heading: "", content: "" },
    ],
    2
  );

  expect(blocks).toHaveLength(2);
  expect(blocks[0]?.id).toBe("same");
  expect(blocks[1]?.id).toBe("block-2");
  expect(normalizeRichTextBlockCount(999)).toBe(richTextBlockMax);
  expect(normalizeRichTextBlockCount(-1)).toBe(0);

  const normalized = normalizeRichTextSectionData({
    body: { html: "", blocks: [] },
  });
  expect(normalized.options?.outputMode).toBe("blocks-fallback");
  expect(normalized.style?.fontScale).toBe("md");
});

test("rich text section validator accepts expanded model", () => {
  clearWidgets();
  const widget = createRichTextSectionWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "rich-text-1",
      type: "rich-text-section",
      variant: "article",
      data: {
        titleBlock: {
          eyebrow: "Guides",
          title: "Implementation details",
        },
        body: {
          html: "<h2>Intro</h2><p>Content paragraph.</p>",
          blocks: [
            { id: "block-1", heading: "Intro", content: "Content paragraph." },
            { id: "block-2", heading: "Details", content: "More details." },
          ],
        },
        options: {
          dropcap: true,
          toc: true,
          maxWidth: "xl",
          outputMode: "blocks-fallback",
        },
        style: {
          fontScale: "lg",
          lineHeight: "relaxed",
          textColor: "#0f172a",
          background: "#ffffff",
          spacing: "lg",
        },
      },
    })
  ).not.toThrow();

  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("rich text section validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createRichTextSectionWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "rich-text-2",
      type: "rich-text-section",
      variant: "unknown",
      data: richTextSectionDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("rich text section wizard renders onboarding fields", () => {
  const html = renderToString(
    <RichTextSectionWizardEditor
      value={richTextSectionDefaults}
      onChange={() => undefined}
      variant="single-column"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Rich text layout");
  expect(html).toContain("Eyebrow");
  expect(html).toContain("Body HTML");
});

test("rich text section visual renders section-based IA", () => {
  const html = renderToString(
    <RichTextSectionVisualEditor
      value={richTextSectionDefaults}
      onChange={() => undefined}
      variant="single-column"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and layout structure");
  expect(html).toContain("Title block copy");
  expect(html).toContain("Body content");
  expect(html).toContain("Structured fallback blocks");
  expect(html).toContain("Reader options");
  expect(html).toContain("Typography and colors");
});

test("rich text section advanced keeps technical-only scope", () => {
  const html = renderToString(
    <RichTextSectionAdvancedEditor
      value={richTextSectionDefaults}
      onChange={() => undefined}
      variant="article"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Output mode and fallback");
  expect(html).toContain("Technical typography tokens");
  expect(html).toContain("Normalization and safeguards");
  expect(html).toContain("Raw payload snapshot");
  expect(html).not.toContain("Title block copy");
});
