import { expect, test } from "vitest";

import {
  canTransformBlock,
  extractPostBlockText,
  getTransformTargetTypes,
  transformPostBlock,
} from "../../../core/admin/ui/posts/editor/blocks/blockTransforms";
import {
  createWritingCanvasContentFromEditorHtml,
  serializeWritingCanvasContentToHtml,
} from "../../../core/services/posts/editor/postPasteNormalizer";
import type { PostBlock } from "../../../core/services/posts/editor/postBlockDocument";

test("block transforms expose only supported targets", () => {
  expect(canTransformBlock("paragraph", "heading")).toBe(true);
  expect(canTransformBlock("writing-canvas", "code")).toBe(true);
  expect(canTransformBlock("paragraph", "paragraph")).toBe(false);
  expect(canTransformBlock("image", "heading")).toBe(false);

  expect(getTransformTargetTypes("callout")).toEqual([
    "paragraph",
    "heading",
    "list",
    "quote",
    "code",
    "writing-canvas",
  ]);
});

test("transformPostBlock normalizes list and code content from rich text", () => {
  const paragraph: PostBlock = {
    id: "paragraph-1",
    type: "paragraph",
    attrs: {},
    content: "<p>Alpha &amp; Beta</p><p>Gamma&nbsp;</p><p></p>",
  };

  const list = transformPostBlock(paragraph, "list");
  expect(list).toEqual({
    ...paragraph,
    type: "list",
    attrs: { ordered: false },
    content: ["Alpha & Beta", "Gamma"],
  });

  const code = transformPostBlock(paragraph, "code");
  expect(code).toEqual({
    ...paragraph,
    type: "code",
    attrs: {},
    content: "Alpha & Beta\nGamma",
  });
});

test("transformPostBlock keeps ordered list semantics when converting to writing canvas", () => {
  const source: PostBlock = {
    id: "list-1",
    type: "list",
    attrs: { ordered: true },
    content: ["First", "Second"],
  };

  const transformed = transformPostBlock(source, "writing-canvas");
  expect(transformed).not.toBeNull();
  expect(transformed?.type).toBe("writing-canvas");
  expect(serializeWritingCanvasContentToHtml(transformed?.content)).toContain("<ol>");
  expect(serializeWritingCanvasContentToHtml(transformed?.content)).toContain("First");
  expect(serializeWritingCanvasContentToHtml(transformed?.content)).toContain("Second");
});

test("transformPostBlock converts writing canvas content back into rich text blocks", () => {
  const source: PostBlock = {
    id: "section-1",
    type: "writing-canvas",
    attrs: {},
    content: createWritingCanvasContentFromEditorHtml({
      html: "<p>Intro</p><blockquote>Quoted</blockquote><pre>console.log(1)</pre>",
    }),
  };

  const heading = transformPostBlock(source, "heading");
  expect(heading).not.toBeNull();
  expect(heading?.type).toBe("heading");
  expect(heading?.attrs).toEqual({ level: 2 });
  expect(String(heading?.content)).toContain("Intro");
  expect(String(heading?.content)).toContain("Quoted");

  const code = transformPostBlock(source, "code");
  expect(code).toEqual({
    ...source,
    type: "code",
    attrs: {},
    content: "Intro\nQuoted\nconsole.log(1)",
  });
});

test("transformPostBlock rejects unsupported transforms and extractPostBlockText covers block variants", () => {
  const imageBlock: PostBlock = {
    id: "image-1",
    type: "image",
    attrs: {},
    content: null,
  };

  expect(transformPostBlock(imageBlock, "paragraph")).toBeNull();

  expect(
    extractPostBlockText({
      id: "list-2",
      type: "list",
      attrs: {},
      content: ["One", "Two"],
    })
  ).toBe("One\nTwo");

  expect(
    extractPostBlockText({
      id: "code-1",
      type: "code",
      attrs: {},
      content: "const answer = 42;",
    })
  ).toBe("const answer = 42;");

  expect(
    extractPostBlockText({
      id: "section-2",
      type: "writing-canvas",
      attrs: {},
      content: createWritingCanvasContentFromEditorHtml({
        html: "<p>Lead</p><p>Body</p>",
      }),
    })
  ).toBe("Lead Body");

  expect(
    extractPostBlockText({
      id: "embed-1",
      type: "embed",
      attrs: {},
      content: { provider: "youtube" },
    })
  ).toBe("");
});
