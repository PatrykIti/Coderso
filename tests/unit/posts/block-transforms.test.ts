import { expect, test } from "bun:test";

import {
  canTransformBlock,
  getTransformTargetTypes,
  transformPostBlock,
} from "../../../core/admin/ui/posts/editor/blocks/blockTransforms";
import { createWritingCanvasContentFromEditorHtml } from "../../../core/services/posts/editor/postPasteNormalizer";
import type { PostBlock } from "../../../core/services/posts/editor/postBlockDocument";

test("canTransformBlock validates supported transform matrix", () => {
  expect(canTransformBlock("paragraph", "heading")).toBe(true);
  expect(canTransformBlock("writing-canvas", "paragraph")).toBe(true);
  expect(canTransformBlock("image", "paragraph")).toBe(false);
  expect(canTransformBlock("paragraph", "paragraph")).toBe(false);
});

test("getTransformTargetTypes excludes source type", () => {
  const targets = getTransformTargetTypes("paragraph");
  expect(targets).toContain("heading");
  expect(targets).toContain("list");
  expect(targets).toContain("writing-canvas");
  expect(targets).not.toContain("paragraph");
});

test("transformPostBlock preserves content for paragraph to heading", () => {
  const source: PostBlock = {
    id: "intro",
    type: "paragraph",
    attrs: {},
    content: "<strong>Hello</strong> world",
  };

  const transformed = transformPostBlock(source, "heading");
  expect(transformed).not.toBeNull();
  expect(transformed?.type).toBe("heading");
  expect(transformed?.attrs).toEqual({ level: 2 });
  expect(transformed?.content).toBe("<strong>Hello</strong> world");
});

test("transformPostBlock converts list items to quote rich text", () => {
  const source: PostBlock = {
    id: "list",
    type: "list",
    attrs: { ordered: false },
    content: ["One", "Two"],
  };

  const transformed = transformPostBlock(source, "quote");
  expect(transformed).not.toBeNull();
  expect(transformed?.type).toBe("quote");
  expect(transformed?.content).toBe("One<br>Two");
});

test("transformPostBlock converts heading rich text to list items", () => {
  const source: PostBlock = {
    id: "heading",
    type: "heading",
    attrs: { level: 3 },
    content: "<strong>First</strong><br>Second",
  };

  const transformed = transformPostBlock(source, "list");
  expect(transformed).not.toBeNull();
  expect(transformed?.type).toBe("list");
  expect(transformed?.attrs).toEqual({ ordered: false });
  expect(transformed?.content).toEqual(["First", "Second"]);
});

test("transformPostBlock converts writing-canvas to paragraph rich text", () => {
  const content = createWritingCanvasContentFromEditorHtml({
    html: "<p>Hello</p><blockquote>Quote</blockquote>",
  });
  const source: PostBlock = {
    id: "section",
    type: "writing-canvas",
    attrs: {},
    content,
  };

  const transformed = transformPostBlock(source, "paragraph");
  expect(transformed).not.toBeNull();
  expect(transformed?.type).toBe("paragraph");
  expect(transformed?.content).toContain("Hello");
  expect(transformed?.content).toContain("Quote");
});

test("transformPostBlock converts paragraph to writing-canvas content", () => {
  const source: PostBlock = {
    id: "paragraph",
    type: "paragraph",
    attrs: {},
    content: "<p>Hello</p>",
  };

  const transformed = transformPostBlock(source, "writing-canvas");
  expect(transformed).not.toBeNull();
  expect(transformed?.type).toBe("writing-canvas");
  expect(transformed?.content).toBeTruthy();
  expect(Array.isArray((transformed?.content as { nodes?: unknown[] }).nodes)).toBe(true);
});
