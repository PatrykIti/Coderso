import { expect, test } from "vitest";

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

test("serializePostRichText preserves data-align attributes", () => {
  const serialized = serializePostRichText(`<p data-align="right">Aligned</p>`);
  expect(serialized).toBe(`<p data-align="right">Aligned</p>`);
});

test("serializePostRichText preserves inline typography span attributes", () => {
  const serialized = serializePostRichText(
    `<p><span data-font="serif" data-text-scale="lg">Styled</span></p>`
  );
  expect(serialized).toBe(`<p><span data-font="serif" data-text-scale="lg">Styled</span></p>`);
});

test("serializePostRichText strips invalid inline typography values", () => {
  const serialized = serializePostRichText(
    `<p><span data-font="comic" data-text-scale="huge">Styled</span></p>`
  );
  expect(serialized).toBe(`<p><span>Styled</span></p>`);
});

test("serializePostRichText keeps contenteditable entities stable", () => {
  const first = serializePostRichText("Hello&nbsp;world &amp; team");
  const second = serializePostRichText(first);

  expect(first).toBe("Hello&nbsp;world &amp; team");
  expect(second).toBe(first);
});

test("serializePostRichText keeps safe inline images and strips unsafe sources", () => {
  const safe = serializePostRichText(
    `<p>Test <img src="/media/a.png" data-media-id="media-1" data-wrap="right" data-width="66" data-margin="lg" alt="A" loading="eager"></p>`
  );
  const unsafe = serializePostRichText(
    `<p><img src="javascript:alert(1)" onerror="alert(1)" alt="X"></p>`
  );

  expect(safe).toContain('<img src="/media/a.png" data-media-id="media-1" alt="A"');
  expect(safe).toContain('data-wrap="right"');
  expect(safe).toContain('data-width="66"');
  expect(safe).toContain('data-margin="lg"');
  expect(safe).toContain('loading="eager"');
  expect(unsafe).toBe("<p></p>");
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

test("serializePostRichText normalizes browser alias tags", () => {
  const serialized = serializePostRichText("<div><b>Bold</b> and <i>italic</i></div>");

  expect(serialized).toContain("<p>");
  expect(serialized).toContain("<strong>Bold</strong>");
  expect(serialized).toContain("<em>italic</em>");
  expect(serialized).not.toContain("<div>");
  expect(serialized).not.toContain("<b>");
  expect(serialized).not.toContain("<i>");
});

test("serializePostRichText normalizes strike tags to s", () => {
  const serialized = serializePostRichText("<p><strike>Removed</strike></p>");

  expect(serialized).toContain("<s>Removed</s>");
  expect(serialized).not.toContain("<strike>");
});
