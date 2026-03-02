import { expect, test } from "bun:test";

import {
  createWritingCanvasContentFromEditorHtml,
  createWritingCanvasContentFromPaste,
  normalizePostPastePayload,
  serializeWritingCanvasContentToHtml,
} from "../../../core/services/posts/editor/postPasteNormalizer";
import { postRichTextToPlainText } from "../../../core/services/posts/editor/postRichTextSerializer";

test("normalizePostPastePayload sanitizes Word-like HTML and maps core structures", () => {
  const wordLikeHtml = `
    <!--[if gte mso 9]><xml><w:WordDocument></w:WordDocument></xml><![endif]-->
    <h2 class="MsoHeading" style="mso-style-priority:9">Offer</h2>
    <p class="MsoNormal">Fast <strong>service</strong> for <a href="https://example.com">clients</a>.</p>
    <o:p>&nbsp;</o:p>
    <ul>
      <li>Inspection</li>
      <li>Repair<script>alert(1)</script></li>
    </ul>
  `;

  const result = normalizePostPastePayload({
    html: wordLikeHtml,
    text: "Fallback text",
  });

  expect(result.mode).toBe("writing-canvas");
  expect(result.source).toBe("html");
  expect(result.directives.replaceWordTocWithDynamicToc).toBe(false);
  expect(result.nodes.length).toBeGreaterThanOrEqual(3);
  expect(result.nodes[0]?.type).toBe("heading");
  expect(result.nodes.some((node) => node.type === "list")).toBe(true);
  expect(result.warnings.map((warning) => warning.code)).toContain(
    "office_markup_removed"
  );
  expect(result.html).not.toContain("script");
  expect(result.html).not.toContain("o:p");
  expect(postRichTextToPlainText((result.nodes[0] as { text: string }).text)).toContain(
    "Offer"
  );
});

test("normalizePostPastePayload falls back to plain text sections when HTML cannot be used", () => {
  const result = normalizePostPastePayload({
    html: "<script>alert(1)</script>",
    text: "Intro paragraph\n\n- First item\n- Second item",
  });

  expect(result.mode).toBe("writing-canvas");
  expect(result.source).toBe("text");
  expect(result.directives.replaceWordTocWithDynamicToc).toBe(false);
  expect(result.nodes.length).toBe(2);
  expect(result.nodes[0]?.type).toBe("paragraph");
  expect(result.nodes[1]?.type).toBe("list");
  expect(result.warnings.map((warning) => warning.code)).toContain(
    "fallback_to_plain_text"
  );
});

test("normalizePostPastePayload truncates very large paste payloads to node budget", () => {
  const largeText = Array.from({ length: 260 }, (_, index) => `Paragraph ${index + 1}`).join(
    "\n\n"
  );

  const result = normalizePostPastePayload({
    text: largeText,
  });

  expect(result.mode).toBe("writing-canvas");
  expect(result.directives.replaceWordTocWithDynamicToc).toBe(false);
  expect(result.nodes.length).toBe(200);
  expect(result.warnings.map((warning) => warning.code)).toContain("nodes_truncated");
});

test("createWritingCanvasContentFromPaste returns versioned content envelope", () => {
  const result = createWritingCanvasContentFromPaste({
    text: "Hello world",
  });

  expect(result.content.version).toBe(1);
  expect(result.content.nodes.length).toBe(1);
  expect(result.content.nodes[0]?.type).toBe("paragraph");
  expect(result.directives.replaceWordTocWithDynamicToc).toBe(false);
});

test("normalizePostPastePayload preserves image-only html as writing content", () => {
  const result = normalizePostPastePayload({
    html: '<img src="/media/clipboard.png" alt="Clipboard image" data-wrap="left" data-width="66" data-margin="lg">',
    text: "",
  });

  expect(result.mode).toBe("writing-canvas");
  expect(result.source).toBe("html");
  expect(result.directives.replaceWordTocWithDynamicToc).toBe(false);
  expect(result.nodes.length).toBe(1);
  expect(result.nodes[0]?.type).toBe("paragraph");
  const paragraph = result.nodes[0];
  if (!paragraph || paragraph.type !== "paragraph") {
    throw new Error("expected paragraph node");
  }
  expect(paragraph.text).toContain("<img");
  expect(result.html).toContain("<img");
});

test("normalizePostPastePayload maps h1 from Word payload into heading node", () => {
  const result = normalizePostPastePayload({
    html: "<h1>Primary heading</h1><p>Body text</p>",
    text: "",
  });

  expect(result.mode).toBe("writing-canvas");
  expect(result.directives.replaceWordTocWithDynamicToc).toBe(false);
  expect(result.nodes[0]?.type).toBe("heading");
  const heading = result.nodes[0];
  if (!heading || heading.type !== "heading") {
    throw new Error("expected heading node");
  }
  expect(heading.level).toBe(1);
  expect(postRichTextToPlainText(heading.text)).toContain("Primary heading");
});

test("normalizePostPastePayload preserves heading level when Word exports h2 with outline level 1", () => {
  const result = normalizePostPastePayload({
    html: '<h2 style="mso-outline-level:1">Primary heading</h2><p>Body text</p>',
    text: "",
  });

  expect(result.mode).toBe("writing-canvas");
  const heading = result.nodes[0];
  if (!heading || heading.type !== "heading") {
    throw new Error("expected heading node");
  }
  expect(heading.level).toBe(1);
  expect(result.directives.replaceWordTocWithDynamicToc).toBe(false);
});

test("normalizePostPastePayload maps Word heading-like paragraph classes into heading node", () => {
  const result = normalizePostPastePayload({
    html: '<p class="MsoHeading1">Offer title</p><p>Paragraph</p>',
    text: "",
  });

  expect(result.mode).toBe("writing-canvas");
  expect(result.directives.replaceWordTocWithDynamicToc).toBe(false);
  expect(result.nodes[0]?.type).toBe("heading");
  const heading = result.nodes[0];
  if (!heading || heading.type !== "heading") {
    throw new Error("expected heading node");
  }
  expect(heading.level).toBe(1);
  expect(postRichTextToPlainText(heading.text)).toContain("Offer title");
});

test("normalizePostPastePayload keeps Word heading hierarchy from outline style", () => {
  const result = normalizePostPastePayload({
    html: '<p style="mso-outline-level:2">Section</p><p style="mso-outline-level:3">Subsection</p>',
    text: "",
  });

  expect(result.mode).toBe("writing-canvas");
  const section = result.nodes[0];
  const subsection = result.nodes[1];
  if (!section || section.type !== "heading" || !subsection || subsection.type !== "heading") {
    throw new Error("expected heading nodes");
  }
  expect(section.level).toBe(2);
  expect(subsection.level).toBe(3);
  expect(result.directives.replaceWordTocWithDynamicToc).toBe(false);
});

test("normalizePostPastePayload detects Word TOC links and replaces static TOC with directive", () => {
  const result = normalizePostPastePayload({
    html: `
      <p>Spis tresci</p>
      <p><a href="#_Toc111">1. Wstep 1</a></p>
      <p><a href="#_Toc222">2. Zakres 2</a></p>
      <p><a href="#_Toc333">3. Wyniki 3</a></p>
      <h1>Wstep</h1>
      <p>Body content</p>
    `,
    text: "",
  });

  expect(result.mode).toBe("writing-canvas");
  expect(result.directives.replaceWordTocWithDynamicToc).toBe(true);
  expect(result.warnings.map((warning) => warning.code)).toContain("word_toc_replaced");
  expect(result.diagnostics.wordTocDetectedLinks).toBe(3);
  expect(result.diagnostics.wordTocRemovedNodes).toBeGreaterThanOrEqual(3);
  expect(result.html).not.toContain("#_Toc");
  expect(result.nodes.some((node) => node.type === "heading")).toBe(true);
  expect(result.nodes.some((node) => node.type === "paragraph")).toBe(true);
});

test("normalizePostPastePayload strips isolated Word TOC links without forcing dynamic TOC", () => {
  const result = normalizePostPastePayload({
    html: '<p><a href="#_Toc123">See chapter</a></p><p>Regular body text</p>',
    text: "",
  });

  expect(result.directives.replaceWordTocWithDynamicToc).toBe(false);
  expect(result.html).not.toContain("#_Toc");
  const firstNode = result.nodes[0];
  if (!firstNode || firstNode.type !== "paragraph") {
    throw new Error("expected paragraph node");
  }
  expect(postRichTextToPlainText(firstNode.text)).toContain("See chapter");
});

test("createWritingCanvasContentFromEditorHtml keeps node ids stable for same block types", () => {
  const previous = {
    version: 1,
    nodes: [
      { id: "intro", type: "paragraph", text: "<p>First</p>" },
      { id: "section-1", type: "heading", level: 2, text: "<h2>Title</h2>" },
    ],
  };

  const next = createWritingCanvasContentFromEditorHtml({
    html: "<p>Updated first</p><h2>Updated title</h2>",
    previousContent: previous,
  });

  expect(next.nodes[0]?.id).toBe("intro");
  expect(next.nodes[1]?.id).toBe("section-1");
});

test("createWritingCanvasContentFromEditorHtml maps multiline lists to list node", () => {
  const next = createWritingCanvasContentFromEditorHtml({
    html: "<ul><li>One</li><li>Two</li><li>Three</li></ul>",
  });

  expect(next.nodes.length).toBe(1);
  expect(next.nodes[0]?.type).toBe("list");
  const listNode = next.nodes[0];
  if (!listNode || listNode.type !== "list") {
    throw new Error("expected list node");
  }
  expect(listNode.items).toEqual(["One", "Two", "Three"]);
});

test("createWritingCanvasContentFromEditorHtml preserves empty paragraphs produced by enter", () => {
  const next = createWritingCanvasContentFromEditorHtml({
    html: "<p>Alpha</p><p><br></p><p><br></p>",
  });

  expect(next.nodes).toHaveLength(3);
  expect(next.nodes[0]?.type).toBe("paragraph");
  expect(next.nodes[1]?.type).toBe("paragraph");
  expect(next.nodes[2]?.type).toBe("paragraph");
  const second = next.nodes[1];
  const third = next.nodes[2];
  if (!second || second.type !== "paragraph" || !third || third.type !== "paragraph") {
    throw new Error("expected paragraph nodes");
  }
  expect(second.text).toBe("<br>");
  expect(third.text).toBe("<br>");
});

test("writing-canvas roundtrip keeps code-block variant and block alignment attrs", () => {
  const next = createWritingCanvasContentFromEditorHtml({
    html: [
      '<pre data-align="center"><code>const a = 1;</code></pre>',
      '<p data-align="right">Aligned paragraph</p>',
      '<ul data-align="center"><li>Item A</li></ul>',
    ].join(""),
  });

  const codeNode = next.nodes[0];
  if (!codeNode || codeNode.type !== "quote") {
    throw new Error("expected quote node for code block variant");
  }
  expect(codeNode.variant).toBe("code");
  expect(codeNode.align).toBe("center");

  const paragraphNode = next.nodes[1];
  if (!paragraphNode || paragraphNode.type !== "paragraph") {
    throw new Error("expected paragraph node");
  }
  expect(paragraphNode.align).toBe("right");

  const listNode = next.nodes[2];
  if (!listNode || listNode.type !== "list") {
    throw new Error("expected list node");
  }
  expect(listNode.align).toBe("center");

  const serialized = serializeWritingCanvasContentToHtml(next);
  expect(serialized).toContain('<pre data-align="center">');
  expect(serialized).toContain('<p data-align="right">');
  expect(serialized).toContain('<ul data-align="center">');
});

test("writing-canvas roundtrip preserves inline typography spans", () => {
  const next = createWritingCanvasContentFromEditorHtml({
    html: '<p><span data-font="serif" data-text-scale="xl">Big</span> text</p>',
  });

  const paragraphNode = next.nodes[0];
  if (!paragraphNode || paragraphNode.type !== "paragraph") {
    throw new Error("expected paragraph node");
  }

  expect(paragraphNode.text).toContain('data-font="serif"');
  expect(paragraphNode.text).toContain('data-text-scale="xl"');

  const serialized = serializeWritingCanvasContentToHtml(next);
  expect(serialized).toContain('data-font="serif"');
  expect(serialized).toContain('data-text-scale="xl"');
});
