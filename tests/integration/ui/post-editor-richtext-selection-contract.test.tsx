import { expect, test } from "bun:test";

import {
  applyCommandToBlockTags,
  getPostRichTextCommandKind,
} from "../../../core/admin/ui/posts/editor/richtext/postRichTextCommandEngine";
import { serializePostRichText } from "../../../core/services/posts/editor/postRichTextSerializer";

test("multiline highlight serialization preserves block boundaries", () => {
  const serialized = serializePostRichText(
    "<p><mark>Line one</mark></p><h2><mark>Line two</mark></h2><p><mark>Line three</mark></p>"
  );

  expect(serialized).toContain("<p><mark>Line one</mark></p>");
  expect(serialized).toContain("<h2><mark>Line two</mark></h2>");
  expect(serialized).toContain("<p><mark>Line three</mark></p>");
  expect(serialized).not.toContain("<p><mark>Line one</mark>Line two");
});

test("selection-wide block commands keep deterministic output arity", () => {
  const source = ["p", "h2", "blockquote"] as const;
  const paragraph = applyCommandToBlockTags("paragraph", source);
  const quote = applyCommandToBlockTags("quote", source);
  const align = applyCommandToBlockTags("align-center", source);

  expect(paragraph).toEqual(["p", "p", "p"]);
  expect(quote).toEqual(["blockquote", "blockquote", "blockquote"]);
  expect(align).toEqual(["p", "h2", "blockquote"]);
});

test("selection contract keeps link and clear-formatting as dedicated flows", () => {
  expect(getPostRichTextCommandKind("link")).toBe("link");
  expect(getPostRichTextCommandKind("clear-formatting")).toBe("clear-formatting");
  expect(getPostRichTextCommandKind("highlight")).toBe("inline-wrapper");
});
