import { expect, test } from "bun:test";

import {
  countPostRichTextWords,
  postRichTextFromPlainText,
  postRichTextToPlainText,
  serializePostRichText,
} from "../../../core/services/posts/editor/postRichTextSerializer";

test("serializePostRichText sanitizes forbidden tags and unsafe links", () => {
  const serialized = serializePostRichText(
    `<p onclick="evil()">Hello<script>alert(1)</script><a href="javascript:alert(1)" target="_blank">World</a></p>`
  );

  expect(serialized).toContain("<p>");
  expect(serialized).toContain("</p>");
  expect(serialized).toContain(`<a href="#" target="_blank" rel="noopener noreferrer nofollow">`);
  expect(serialized).not.toContain("script");
  expect(serialized).not.toContain("onclick");
});

test("serializePostRichText converts plain text to safe html with line breaks", () => {
  const serialized = serializePostRichText("First line\nSecond <line>");

  expect(serialized).toBe("First line<br>Second &lt;line&gt;");
});

test("serializePostRichText normalizes alignment attributes", () => {
  const serialized = serializePostRichText(`<h2 align="center">Title</h2>`);
  expect(serialized).toBe(`<h2 data-align="center">Title</h2>`);
});

test("postRichTextToPlainText strips tags and decodes entities", () => {
  const text = postRichTextToPlainText("<p>Hello <strong>world</strong> &amp; team</p>");
  expect(text).toBe("Hello world & team");
});

test("countPostRichTextWords returns deterministic word count", () => {
  expect(countPostRichTextWords("<p>Hello world from Nextless</p>")).toBe(4);
  expect(countPostRichTextWords("")).toBe(0);
});

test("postRichTextFromPlainText escapes html", () => {
  expect(postRichTextFromPlainText("<h1>Unsafe</h1>")).toBe("&lt;h1&gt;Unsafe&lt;/h1&gt;");
});
