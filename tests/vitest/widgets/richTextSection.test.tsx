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
  normalizeRichTextSectionData,
  renderRichTextSectionHtmlPreview,
  resolveRichTextRenderedSource,
  richTextSectionDefaults,
  RichTextSectionBlock,
  sanitizeRichTextHtml,
  sanitizeRichTextHtmlWithDiagnostics,
  type RichTextSectionData,
} from "../../../core/widgets/core/richTextSection";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<RichTextSectionData>> = () => null;

test("rich text section renders defaults with semantic title and html source markers", () => {
  const html = renderToString(
    <RichTextSectionBlock
      data={richTextSectionDefaults}
      variant="single-column"
      blockId="hero-rich-text"
    />
  );

  expect(html).toContain(richTextSectionDefaults.titleBlock?.title ?? "");
  expect(html).toContain('data-rich-text-variant="single-column"');
  expect(html).toContain('data-rich-text-output-mode="blocks-fallback"');
  expect(html).toContain('data-rich-text-rendered-source="html"');
  expect(html).toContain('data-rich-text-title-level="2"');
  expect(html).toContain('id="rich-text-section-hero-rich-text-title"');
  expect(html).toContain("<h2");
});

test("rich text section sanitization strips dangerous payloads and reports diagnostics", () => {
  const raw =
    '<script>alert(1)</script><h1>Main</h1><p onclick="evil()">Safe</p><a href="javascript:alert(1)">x</a><img src=x onerror="evil()">';
  const sanitized = sanitizeRichTextHtml(raw);
  const diagnostics = sanitizeRichTextHtmlWithDiagnostics(raw).diagnostics;

  expect(sanitized).not.toContain("<script");
  expect(sanitized).not.toContain("<h1");
  expect(sanitized).not.toContain("onclick=");
  expect(sanitized).not.toContain("<img");
  expect(sanitized).toContain('<a href="#">x</a>');
  expect(diagnostics).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "tag_removed", tagName: "script" }),
      expect.objectContaining({ code: "tag_removed", tagName: "h1" }),
      expect.objectContaining({ code: "tag_removed", tagName: "img" }),
      expect.objectContaining({ code: "attribute_removed", attributeName: "onclick" }),
      expect.objectContaining({ code: "href_rewritten", attributeName: "href" }),
    ])
  );
});

test("rich text section preview renderer reuses the widget sanitizer without raw html injection", () => {
  const html = renderToString(
    <div>
      {renderRichTextSectionHtmlPreview(
        '<p>Lead &amp; copy</p><hr><a href="javascript:alert(1)">Unsafe</a><img src="/drop.png">'
      )}
    </div>
  );

  expect(html).toContain("<p>Lead &amp; copy</p>");
  expect(html).toContain("<hr");
  expect(html).toContain('<a href="#">Unsafe</a>');
  expect(html).not.toContain("<img");
  expect(html).not.toContain("javascript:alert(1)");
});

test("resolveRichTextRenderedSource matches the runtime fallback contract", () => {
  expect(
    resolveRichTextRenderedSource({
      body: { html: "<p>Primary</p>", blocks: [{ id: "block-1", heading: "Intro", content: "A" }] },
      options: { outputMode: "blocks-fallback" },
    })
  ).toMatchObject({
    mode: "blocks-fallback",
    renderedSource: "html",
    htmlIsActive: true,
    blocksAreActive: false,
    reason: "fallback-html-present",
  });

  expect(
    resolveRichTextRenderedSource({
      body: { html: "", blocks: [{ id: "block-1", heading: "Intro", content: "A" }] },
      options: { outputMode: "blocks-fallback" },
    })
  ).toMatchObject({
    renderedSource: "blocks",
    blocksAreActive: true,
    reason: "fallback-html-empty",
  });

  expect(
    resolveRichTextRenderedSource({
      body: { html: "<p>Primary</p>", blocks: [{ id: "block-1", heading: "Intro", content: "A" }] },
      options: { outputMode: "blocks" },
    })
  ).toMatchObject({
    renderedSource: "blocks",
    reason: "blocks-only",
  });
});

test("rich text section renders structured text, image, attachment, and embed blocks safely", () => {
  const html = renderToString(
    <RichTextSectionBlock
      variant="single-column"
      data={{
        titleBlock: {
          eyebrow: "Guides",
          title: "Structured output",
          headingLevel: 2,
        },
        body: {
          html: "",
          blocks: [
            {
              id: "block-1",
              kind: "text",
              heading: "Intro",
              headingLevel: 4,
              content: "Line one\nLine two",
            },
            {
              id: "block-2",
              kind: "image",
              src: "/media/story.jpg",
              alt: "Story image",
              caption: "Figure caption",
              href: "javascript:alert(1)",
              width: "wide",
              align: "center",
            },
            {
              id: "block-3",
              kind: "attachment",
              src: "https://cdn.example.com/guide.pdf",
              label: "Download guide",
              mimeType: "application/pdf",
              sizeLabel: "2 MB",
            },
            {
              id: "block-4",
              kind: "embed",
              url: "https://www.youtube.com/watch?v=abc123",
              title: "Watch the walkthrough",
              aspectRatio: "16:9",
            },
          ],
        },
        options: {
          outputMode: "blocks",
          toc: true,
        },
      }}
      blockId="structured-rich-text"
    />
  );

  expect(html).toContain('data-rich-text-rendered-source="blocks"');
  expect(html).toContain('id="rich-text-section-structured-rich-text-heading-intro">Intro</h4>');
  expect(html).toContain("Line one<br />Line two");
  expect(html).toContain('src="/media/story.jpg"');
  expect(html).toContain("Figure caption");
  expect(html).not.toContain("javascript:alert(1)");
  expect(html).toContain("Download guide");
  expect(html).toContain("application/pdf");
  expect(html).toContain("Watch the walkthrough");
  expect(html).toContain("YouTube");
});

test("rich text section omits unresolved media/embed blocks, preserves legacy image src payloads, and falls back to aria-label when untitled", () => {
  const html = renderToString(
    <RichTextSectionBlock
      variant="single-column"
      blockId="legacy-rich-text"
      data={{
        titleBlock: {
          eyebrow: "",
          title: "",
          headingLevel: 2,
        },
        body: {
          html: "",
          blocks: [
            {
              id: "block-1",
              kind: "image",
              src: "/media/legacy.jpg",
              alt: "Legacy image",
            },
            {
              id: "block-2",
              kind: "image",
              src: "javascript:alert(1)",
              alt: "Unsafe image",
            },
            {
              id: "block-3",
              kind: "attachment",
              src: "javascript:alert(1)",
              label: "Unsafe attachment",
            },
            {
              id: "block-4",
              kind: "attachment",
              src: "/media/guide.pdf",
              label: "Guide PDF",
            },
            {
              id: "block-5",
              kind: "embed",
              url: "/video",
              title: "Unsupported embed",
            },
          ],
        },
        options: {
          outputMode: "blocks",
        },
      }}
    />
  );

  expect(html).toContain('aria-label="Rich text content"');
  expect(html).not.toContain("aria-labelledby");
  expect(html).toContain('src="/media/legacy.jpg"');
  expect(html).toContain("Legacy image");
  expect(html).toContain("Guide PDF");
  expect(html).not.toContain("Unsafe image");
  expect(html).not.toContain("Unsafe attachment");
  expect(html).not.toContain("Unsupported embed");
  expect(html).not.toContain("javascript:alert(1)");
  expect(html).not.toContain('href="/video"');
});

test("article variant respects max width, labels the section, and scopes toc ids by blockId", () => {
  const articleHtml = renderToString(
    <>
      <RichTextSectionBlock
        variant="article"
        blockId="article-a"
        data={{
          titleBlock: {
            eyebrow: "Editorial",
            title: "Narrative section",
            headingLevel: 1,
          },
          body: {
            html: "<h2>Intro</h2><p>Body copy.</p>",
            blocks: [],
          },
          options: {
            outputMode: "html",
            maxWidth: "full",
            toc: true,
          },
        }}
      />
      <RichTextSectionBlock
        variant="article"
        blockId="article-b"
        data={{
          titleBlock: {
            eyebrow: "Editorial",
            title: "Narrative section",
            headingLevel: 1,
          },
          body: {
            html: "<h2>Intro</h2><p>Body copy.</p>",
            blocks: [],
          },
          options: {
            outputMode: "html",
            maxWidth: "full",
            toc: true,
          },
        }}
      />
    </>
  );

  expect(articleHtml).toContain('data-rich-text-title-level="1"');
  expect(articleHtml).toContain('aria-labelledby="rich-text-section-article-a-title"');
  expect(articleHtml).toContain('id="rich-text-section-article-a-title"');
  expect(articleHtml).toContain('id="rich-text-section-article-b-title"');
  expect(articleHtml).toContain('href="#rich-text-section-article-a-heading-intro"');
  expect(articleHtml).toContain("focus-visible:ring-2");
  expect(articleHtml).toContain('class="mx-auto w-full space-y-6 max-w-none"');
});

test("rich text section validator accepts the expanded rich block model", () => {
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
          headingLevel: 1,
        },
        body: {
          html: "<h2>Intro</h2><p>Content paragraph.</p>",
          blocks: [
            {
              id: "block-1",
              kind: "text",
              heading: "Intro",
              headingLevel: 2,
              contentHtml: "<p>Text</p>",
            },
            {
              id: "block-2",
              kind: "image",
              mediaId: "media-1",
              src: "/media/photo.jpg",
              alt: "Alt",
            },
            {
              id: "block-3",
              kind: "attachment",
              mediaId: "media-2",
              src: "/media/guide.pdf",
              label: "Guide",
            },
            {
              id: "block-4",
              kind: "embed",
              url: "https://vimeo.com/123",
              title: "Demo",
              aspectRatio: "4:3",
            },
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

test("cleared rich text colors keep runtime fallbacks while omitting explicit background styles", () => {
  const normalized = normalizeRichTextSectionData({
    ...richTextSectionDefaults,
    style: {},
  });
  const html = renderToString(
    <RichTextSectionBlock data={normalized} variant="single-column" blockId="cleared-rich-text" />
  );

  expect(normalized.style?.textColor).toBeUndefined();
  expect(normalized.style?.background).toBeUndefined();
  expect(html).not.toContain("background-color:transparent");
});

test("rich text editors expose the updated wizard, visual, and advanced IA", () => {
  const wizardHtml = renderToString(
    <RichTextSectionWizardEditor
      value={richTextSectionDefaults}
      onChange={() => undefined}
      variant="single-column"
      onVariantChange={() => undefined}
    />
  );
  const visualHtml = renderToString(
    <RichTextSectionVisualEditor
      value={richTextSectionDefaults}
      onChange={() => undefined}
      variant="single-column"
      onVariantChange={() => undefined}
    />
  );
  const advancedHtml = renderToString(
    <RichTextSectionAdvancedEditor
      value={richTextSectionDefaults}
      onChange={() => undefined}
      variant="article"
      onVariantChange={() => undefined}
    />
  );

  expect(wizardHtml).toContain("Output mode stays untouched in Wizard");
  expect(wizardHtml).toContain("Single Column");
  expect(wizardHtml).toContain('data-widget-control-readonly="true"');
  expect(wizardHtml).toContain("Use Visual to edit the eyebrow, title, heading level");
  expect(visualHtml).toContain("Body content");
  expect(visualHtml).toContain("Structured content blocks");
  expect(visualHtml).toContain("Title heading level");
  expect(advancedHtml).toContain("Output mode and source diagnostics");
  expect(advancedHtml).toContain("Sanitizer diagnostics");
  expect(advancedHtml).toContain("Saved content summary");
  expect(advancedHtml).not.toContain("Raw payload snapshot");
  expect(advancedHtml).not.toContain("<pre");
  expect(visualHtml).not.toContain('placeholder="var(--color-text)"');
  expect(visualHtml).not.toContain('placeholder="transparent"');
  expect(advancedHtml).not.toContain("Raw HTML technical editor");
  expect(advancedHtml).not.toContain("Sanitize and apply");
  expect(advancedHtml).not.toContain("<textarea");
  expect(advancedHtml).not.toContain("<select");
  expect(advancedHtml).not.toContain("Technical typography tokens");
});
