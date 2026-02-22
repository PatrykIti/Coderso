import { expect, test } from "bun:test";

import { buildPostRichTextPasteInsert } from "../../../core/admin/ui/posts/editor/richtext/PostRichTextAdapter";

test("post editor smart paste converts Word-like HTML into safe insert payload", () => {
  const payload = buildPostRichTextPasteInsert({
    html: `
      <!--[if gte mso 9]><xml><w:WordDocument></w:WordDocument></xml><![endif]-->
      <h2 class="MsoHeading">Heading</h2>
      <p class="MsoNormal">Paragraph <strong>text</strong>.</p>
      <ol><li>One</li><li>Two</li></ol>
    `,
    text: "fallback",
  });

  expect(payload.mode).toBe("writing-canvas");
  expect(payload.source).toBe("html");
  expect(payload.html).toContain("<h2>");
  expect(payload.html).toContain("<p>");
  expect(payload.html).toContain("<ol>");
  expect(payload.warnings.length).toBeGreaterThan(0);
});

test("post editor smart paste returns empty payload for empty clipboard", () => {
  const payload = buildPostRichTextPasteInsert({
    html: "",
    text: "",
  });

  expect(payload.mode).toBe("empty");
  expect(payload.html).toBe("");
});
