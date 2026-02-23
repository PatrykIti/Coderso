import { expect, test } from "bun:test";

import {
  createWritingCanvasContentFromPaste,
  normalizePostPastePayload,
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
});

test("normalizePostPastePayload preserves image-only html as writing content", () => {
  const result = normalizePostPastePayload({
    html: '<img src="/media/clipboard.png" alt="Clipboard image" data-wrap="left" data-width="66" data-margin="lg">',
    text: "",
  });

  expect(result.mode).toBe("writing-canvas");
  expect(result.source).toBe("html");
  expect(result.nodes.length).toBe(1);
  expect(result.nodes[0]?.type).toBe("paragraph");
  const paragraph = result.nodes[0];
  if (!paragraph || paragraph.type !== "paragraph") {
    throw new Error("expected paragraph node");
  }
  expect(paragraph.text).toContain("<img");
  expect(result.html).toContain("<img");
});
