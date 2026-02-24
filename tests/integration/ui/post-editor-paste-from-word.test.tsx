import { expect, test } from "bun:test";

import { buildPostRichTextPasteInsert } from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";

test("post editor smart paste converts Word-like HTML into safe insert payload", () => {
  const payload = buildPostRichTextPasteInsert({
    html: `
      <!--[if gte mso 9]><xml><w:WordDocument></w:WordDocument></xml><![endif]-->
      <h1 class="MsoHeading1">Heading</h1>
      <p class="MsoNormal">Paragraph <strong>text</strong>.</p>
      <ol><li>One</li><li>Two</li></ol>
    `,
    text: "fallback",
  });

  expect(payload.mode).toBe("writing-canvas");
  expect(payload.source).toBe("html");
  expect(payload.directives.replaceWordTocWithDynamicToc).toBe(false);
  expect(payload.html).toContain("<h1>");
  expect(payload.html).toContain("<p>");
  expect(payload.html).toContain("<ol>");
  expect(payload.warnings.length).toBeGreaterThan(0);
});

test("post editor smart paste sets dynamic toc directive for Word TOC links", () => {
  const payload = buildPostRichTextPasteInsert({
    html: `
      <p>Table of contents</p>
      <p><a href="#_Toc100">1. Intro 1</a></p>
      <p><a href="#_Toc200">2. Setup 3</a></p>
      <p><a href="#_Toc300">3. Output 5</a></p>
      <h1>Intro</h1>
      <p>Body</p>
    `,
    text: "",
  });

  expect(payload.directives.replaceWordTocWithDynamicToc).toBe(true);
  expect(payload.html).not.toContain("#_Toc");
  expect(payload.warnings.some((warning) => warning.includes("dynamic TOC"))).toBe(true);
});

test("post editor smart paste keeps Word heading hierarchy when outline metadata overrides tag", () => {
  const payload = buildPostRichTextPasteInsert({
    html: '<h2 style="mso-outline-level:1">Heading</h2><p>Body</p>',
    text: "",
  });

  expect(payload.mode).toBe("writing-canvas");
  expect(payload.html).toContain("<h1>");
  expect(payload.html).not.toContain("<h2>Heading</h2>");
});

test("post editor smart paste returns empty payload for empty clipboard", () => {
  const payload = buildPostRichTextPasteInsert({
    html: "",
    text: "",
  });

  expect(payload.mode).toBe("empty");
  expect(payload.html).toBe("");
  expect(payload.directives.replaceWordTocWithDynamicToc).toBe(false);
});
