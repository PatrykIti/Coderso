import React from "react";
import { expect, test } from "vitest";

import { applyCommandToRootHtmlWithoutBlocks } from "../../../core/admin/ui/posts/editor/richtext/postRichTextCommandEngine";
import {
  createWritingCanvasContentFromEditorHtml,
  serializeWritingCanvasContentToHtml,
} from "../../../core/services/posts/editor/postPasteNormalizer";

test("section roundtrip preserves paragraph and quote node boundaries", () => {
  const first = createWritingCanvasContentFromEditorHtml({
    html: "<blockquote>Quoted line</blockquote><p>Paragraph line</p>",
  });

  expect(first.nodes[0]?.type).toBe("quote");
  expect(first.nodes[1]?.type).toBe("paragraph");

  const html = serializeWritingCanvasContentToHtml(first);
  const second = createWritingCanvasContentFromEditorHtml({ html });

  expect(second.nodes[0]?.type).toBe("quote");
  expect(second.nodes[1]?.type).toBe("paragraph");
});

test("section command fallback for root text creates persisted quote/paragraph nodes", () => {
  const quoteHtml = applyCommandToRootHtmlWithoutBlocks("quote", "Orphan text");
  if (!quoteHtml) {
    throw new Error("expected quote fallback html");
  }
  const quoteContent = createWritingCanvasContentFromEditorHtml({ html: quoteHtml });
  expect(quoteContent.nodes[0]?.type).toBe("quote");

  const paragraphHtml = applyCommandToRootHtmlWithoutBlocks("paragraph", "Orphan text");
  if (!paragraphHtml) {
    throw new Error("expected paragraph fallback html");
  }
  const paragraphContent = createWritingCanvasContentFromEditorHtml({ html: paragraphHtml });
  expect(paragraphContent.nodes[0]?.type).toBe("paragraph");
});
